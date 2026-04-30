// Sienovo Marine — WebSocket signaling server
// Pure WS bridge between controllers (App / Web 中控台) and boats.
// All HTTP CRUD lives in Next.js API routes (app/api/boats/*).

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 5001;

// Lightweight HTTP server: only used as the WS upgrade host + a health check.
const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        boats: boats.size,
        controllers: controllers.size,
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end('Use Next.js /api/boats for HTTP, this server is WS only');
});

const wss = new WebSocketServer({ server: httpServer });

// In-memory device registry (live state only; persistent metadata is in Postgres)
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

  console.log(`🔌 New connection from ${req.socket.remoteAddress ?? 'unknown'}`);

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.type) {
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

        for (const [cid, ctrl] of controllers) {
          if (ctrl.boatId === msg.id) {
            broadcast(ctrl.ws, { type: 'boat-found', boatId: msg.id, state });
            broadcast(ws, { type: 'controller-connected', controllerId: cid });
            console.log(`🔄 Reconnected controller ${cid} → Boat ${msg.id}`);
          }
        }
        break;
      }

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

      case 'control':
      case 'release-bait':
      case 'return-home':
      case 'set-waypoint': {
        if (msg.type !== 'control') console.log(`📨 ${deviceId} → ${msg.type}`);
        if (deviceRole === 'controller') {
          const ctrl = controllers.get(deviceId);
          if (ctrl) {
            const boat = boats.get(ctrl.boatId);
            if (boat) broadcast(boat.ws, msg);
          }
        }
        break;
      }

      case 'camera-frame': {
        if (deviceRole === 'boat') {
          for (const [, ctrl] of controllers) {
            if (ctrl.boatId === deviceId) broadcast(ctrl.ws, msg);
          }
        }
        break;
      }

      case 'state-update': {
        if (deviceRole === 'boat') {
          const boat = boats.get(deviceId);
          if (boat) boat.state = msg.state;
          for (const [, ctrl] of controllers) {
            if (ctrl.boatId === deviceId) broadcast(ctrl.ws, msg);
          }
        }
        break;
      }

      case 'bait-released':
      case 'returning-home':
      case 'arrived-home': {
        if (deviceRole === 'boat') {
          for (const [, ctrl] of controllers) {
            if (ctrl.boatId === deviceId) broadcast(ctrl.ws, msg);
          }
        }
        break;
      }

      case 'ping':
        broadcast(ws, { type: 'pong' });
        break;
    }
  });

  ws.on('close', () => {
    if (deviceRole === 'boat' && deviceId) {
      boats.delete(deviceId);
      for (const [, ctrl] of controllers) {
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
║   🚢 Sienovo Marine WS Signaling Server      ║
╠══════════════════════════════════════════════╣
║                                              ║
║  WebSocket:  ws://localhost:${PORT}              ║
║  Health:     http://localhost:${PORT}/health     ║
║                                              ║
║  HTTP CRUD now lives in Next.js /api/boats   ║
╚══════════════════════════════════════════════╝
  `);
});
