// Bait Boat - WebSocket Signaling Server
// Bridges the controller app and boat simulator

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import * as db from './db.mjs';

const PORT = process.env.PORT || 5001;

await db.initSchema();
console.log('✅ DB schema ready');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function buildBoatList() {
  const records = await db.listBoats();
  const byId = new Map(records.map((r) => [r.id, r]));
  const seen = new Set();
  const list = [];

  for (const [id, boat] of boats) {
    seen.add(id);
    const meta = byId.get(id);
    list.push({
      id,
      name: meta?.name ?? id,
      group: meta?.group ?? '',
      notes: meta?.notes ?? '',
      config: meta?.config ?? [],
      createdAt: meta?.created_at ?? null,
      lat: boat.state.lat,
      lng: boat.state.lng,
      battery: boat.state.battery,
      signal: boat.state.signal,
      baitLevel: boat.state.baitLevel,
      distance: boat.state.distance,
      isOnline: boat.ws.readyState === WebSocket.OPEN,
    });
  }

  for (const meta of records) {
    if (seen.has(meta.id)) continue;
    list.push({
      id: meta.id,
      name: meta.name,
      group: meta.group,
      notes: meta.notes,
      config: meta.config ?? [],
      createdAt: meta.created_at,
      lat: 0,
      lng: 0,
      battery: 0,
      signal: 0,
      baitLevel: 0,
      distance: 0,
      isOnline: false,
    });
  }

  return list;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;

const httpServer = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === '/api/boats' && req.method === 'GET') {
      const list = await buildBoatList();
      sendJson(res, 200, { boats: list, count: list.length });
      return;
    }

    if (url.pathname === '/api/boats' && req.method === 'POST') {
      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        sendJson(res, 400, { error: 'invalid JSON body' });
        return;
      }
      const id = String(body.id ?? '').trim();
      const name = String(body.name ?? '').trim();
      if (!ID_PATTERN.test(id)) {
        sendJson(res, 400, {
          error: 'id 须为 2-32 位字母/数字/下划线/连字符',
        });
        return;
      }
      if (!name) {
        sendJson(res, 400, { error: 'name 不能为空' });
        return;
      }
      const existing = await db.getBoat(id);
      if (existing) {
        sendJson(res, 409, { error: `船只 ID "${id}" 已存在` });
        return;
      }
      const config = db.normalizeConfig(body.config);
      const record = await db.createBoat({
        id,
        name,
        group: String(body.group ?? '').trim(),
        notes: String(body.notes ?? '').trim(),
        config: config.length > 0 ? config : null,
      });
      console.log(`📝 Boat created in DB: ${id} (${name})`);
      sendJson(res, 201, {
        boat: {
          id: record.id,
          name: record.name,
          group: record.group,
          notes: record.notes,
          config: record.config,
          createdAt: record.created_at,
        },
      });
      return;
    }

    const deleteMatch = url.pathname.match(/^\/api\/boats\/([^/]+)$/);
    if (deleteMatch && req.method === 'DELETE') {
      const id = decodeURIComponent(deleteMatch[1]);
      if (boats.has(id)) {
        sendJson(res, 409, { error: '该船只仍在线，请先离线再删除' });
        return;
      }
      const ok = await db.deleteBoat(id);
      if (!ok) {
        sendJson(res, 404, { error: '船只不存在' });
        return;
      }
      console.log(`🗑️  Boat removed from DB: ${id}`);
      sendJson(res, 200, { ok: true });
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (err) {
    console.error('❌ API error:', err);
    sendJson(res, 500, { error: 'internal server error' });
  }
});

// WebSocket server
const wss = new WebSocketServer({ server: httpServer });

// Device registry
const boats = new Map(); // boatId -> { ws, state }
const controllers = new Map(); // controllerId -> { ws, boatId }

function broadcast(target, msg) {
  if (target && target.readyState === WebSocket.OPEN) {
    target.send(JSON.stringify(msg));
  }
}

wss.on('connection', (ws, req) => {
  let deviceId = null;
  let deviceRole = null;

  console.log(`🔌 New connection from ${req.socket.remoteAddress}`);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      // === Boat registration ===
      case 'register-boat': {
        deviceId = msg.id;
        deviceRole = 'boat';
        const state = {
          id: msg.id,
          lat: msg.lat || 30.2741,
          lng: msg.lng || 120.1551,
          heading: 0,
          speed: 0,
          battery: 100,
          signal: 95,
          baitLevel: 100,
          distance: 0,
          isOnline: true,
        };
        boats.set(msg.id, { ws, state });
        broadcast(ws, { type: 'connected', role: 'boat' });
        console.log(`🚢 Boat registered: ${msg.id}`);

        // Notify any controllers already waiting for this boat
        for (const [cid, ctrl] of controllers) {
          if (ctrl.boatId === msg.id) {
            broadcast(ctrl.ws, { type: 'boat-found', boatId: msg.id, state });
            broadcast(ws, { type: 'controller-connected', controllerId: cid });
            console.log(`🔄 Reconnected controller ${cid} → Boat ${msg.id}`);
          }
        }
        break;
      }

      // === Controller connects to a boat ===
      case 'connect-boat': {
        deviceId = msg.controllerId;
        deviceRole = 'controller';
        controllers.set(msg.controllerId, { ws, boatId: msg.boatId });

        const boat = boats.get(msg.boatId);
        if (boat) {
          broadcast(ws, { type: 'boat-found', boatId: msg.boatId, state: boat.state });
          broadcast(boat.ws, { type: 'controller-connected', controllerId: msg.controllerId });
          console.log(`🎮 Controller ${msg.controllerId} → Boat ${msg.boatId}`);
        } else {
          broadcast(ws, { type: 'error', message: `Boat ${msg.boatId} is offline` });
        }
        break;
      }

      // === Control commands (controller → boat) ===
      case 'control':
      case 'release-bait':
      case 'return-home':
      case 'set-waypoint': {
        if (msg.type !== 'control') {
          console.log(`📨 ${deviceId} → ${msg.type}`);
        }
        if (deviceRole === 'controller') {
          const ctrl = controllers.get(deviceId);
          if (ctrl) {
            const boat = boats.get(ctrl.boatId);
            if (boat) {
              broadcast(boat.ws, msg);
              if (msg.type !== 'control') {
                console.log(`  ✅ Forwarded to boat ${ctrl.boatId}`);
              }
            } else {
              console.log(`  ❌ Boat ${ctrl.boatId} not found`);
            }
          } else {
            console.log(`  ❌ Controller ${deviceId} not registered`);
          }
        }
        break;
      }

      // === Camera frames (boat → controller) ===
      case 'camera-frame': {
        if (deviceRole === 'boat') {
          for (const [cid, ctrl] of controllers) {
            if (ctrl.boatId === deviceId) {
              broadcast(ctrl.ws, msg);
            }
          }
        }
        break;
      }

      // === State updates (boat → controller) ===
      case 'state-update': {
        if (deviceRole === 'boat') {
          const boat = boats.get(deviceId);
          if (boat) {
            boat.state = msg.state;
          }
          // Forward to all controllers connected to this boat
          for (const [cid, ctrl] of controllers) {
            if (ctrl.boatId === deviceId) {
              broadcast(ctrl.ws, msg);
            }
          }
        }
        break;
      }

      case 'bait-released':
      case 'returning-home':
      case 'arrived-home': {
        if (deviceRole === 'boat') {
          for (const [cid, ctrl] of controllers) {
            if (ctrl.boatId === deviceId) {
              broadcast(ctrl.ws, msg);
            }
          }
        }
        break;
      }

      case 'ping': {
        broadcast(ws, { type: 'pong' });
        break;
      }
    }
  });

  ws.on('close', () => {
    if (deviceRole === 'boat' && deviceId) {
      boats.delete(deviceId);
      // Notify controllers
      for (const [cid, ctrl] of controllers) {
        if (ctrl.boatId === deviceId) {
          broadcast(ctrl.ws, { type: 'boat-offline', boatId: deviceId });
        }
      }
      console.log(`📴 Boat offline: ${deviceId}`);
    }
    if (deviceRole === 'controller' && deviceId) {
      controllers.delete(deviceId);
      console.log(`📴 Controller offline: ${deviceId}`);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║       🚢 Sienovo Marine Relay Server        ║
╠══════════════════════════════════════════════╣
║                                              ║
║  Boat Simulator:  http://localhost:${PORT}       ║
║  WebSocket:       ws://localhost:${PORT}         ║
║                                              ║
║  Waiting for boats and controllers...        ║
╚══════════════════════════════════════════════╝
  `);
});
