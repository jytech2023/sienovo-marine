// Bait Boat - WebSocket Signaling Server
// Bridges the controller app and boat simulator

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 3000;

// HTTP server — WebSocket signaling + read-only boats API.
// The simulator UI is now served by the Next.js app at /boat-simulator.
const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url === '/api/boats') {
    const boatList = [];
    for (const [id, boat] of boats) {
      boatList.push({
        id,
        lat: boat.state.lat,
        lng: boat.state.lng,
        battery: boat.state.battery,
        signal: boat.state.signal,
        baitLevel: boat.state.baitLevel,
        distance: boat.state.distance,
        isOnline: boat.ws.readyState === WebSocket.OPEN,
      });
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ boats: boatList, count: boatList.length }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
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
