// Standalone Node-based boat simulator.
// Connects to AWS IoT Core via X.509 cert and publishes telemetry on
// sienovo/boats/{boatId}/state at STATE_HZ. Subscribes to /control for commands.
//
// Usage:
//   node simulator/boat.mjs              # uses BOAT-A3F8
//   BOAT_ID=BOAT-XYZ node simulator/boat.mjs

import mqtt from 'mqtt';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CERT_DIR = path.join(ROOT, '.aws-iot');

const BOAT_ID = process.env.BOAT_ID || 'BOAT-A3F8';
const ENDPOINT = process.env.IOT_ENDPOINT || 'a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';
const STATE_HZ = 5;
const CAMERA_HZ = 2;
const STATE_TOPIC = `sienovo/boats/${BOAT_ID}/state`;
const EVENT_TOPIC = `sienovo/boats/${BOAT_ID}/event`;
const CAMERA_TOPIC = `sienovo/boats/${BOAT_ID}/camera`;
const CONTROL_TOPIC = `sienovo/boats/${BOAT_ID}/control`;

const certPath = path.join(CERT_DIR, `${BOAT_ID}.cert.pem`);
const keyPath = path.join(CERT_DIR, `${BOAT_ID}.private.key`);
const caPath = path.join(CERT_DIR, 'AmazonRootCA1.pem');

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error(`✗ Missing cert/key for ${BOAT_ID}.`);
  console.error(`  Expected: ${certPath}`);
  console.error(`  Run the IoT bootstrap script to provision a thing + cert first.`);
  process.exit(1);
}

const state = {
  id: BOAT_ID,
  lat: 30.2741,
  lng: 120.1551,
  heading: 0,
  speed: 0,
  battery: 100,
  signal: 92 + Math.random() * 5,
  baitLevel: 100,
  distance: 0,
  depth: 5,
  waterTemp: 18,
  ir: false,
  light: false,
  isOnline: true,
  components: {
    motor: 'normal',
    battery: 'normal',
    gps: 'normal',
    camera: 'normal',
    light: 'normal',
    baitDispenser: 'normal',
    rudder: 'normal',
    link: 'normal',
  },
};

const command = { throttle: 0, rudder: 0 };
const faults = {};
const home = { lat: state.lat, lng: state.lng };
const MAX_SPEED_MS = 1.39;
const DEG_PER_METER = 1 / 111000;
let lastFrame = Date.now();

const RANK = { normal: 0, warning: 1, damaged: 2, offline: 3 };
const worse = (a, b) => (RANK[a] >= RANK[b] ? a : b);

function deriveComponents(s) {
  if (!s.isOnline) return Object.fromEntries(Object.keys(s.components).map((k) => [k, 'offline']));
  const derived = {
    motor: s.battery <= 0 ? 'damaged' : s.battery < 10 ? 'warning' : 'normal',
    battery: s.battery < 5 ? 'damaged' : s.battery < 20 ? 'warning' : 'normal',
    gps: s.signal < 30 ? 'warning' : 'normal',
    camera: 'normal',
    light: 'normal',
    baitDispenser: s.baitLevel <= 0 ? 'warning' : 'normal',
    rudder: 'normal',
    link: s.signal < 20 ? 'damaged' : s.signal < 50 ? 'warning' : 'normal',
  };
  for (const k of Object.keys(derived)) {
    const f = faults[k];
    if (f) derived[k] = worse(derived[k], f);
  }
  return derived;
}

function step() {
  const now = Date.now();
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;
  if (dt > 0.5) return;

  state.heading = (state.heading + command.rudder * 90 * dt + 360) % 360;
  // Allow reverse: throttle -1..1 maps to speed -MAX..+MAX (reverse at half throttle).
  const targetSpeed = command.throttle * MAX_SPEED_MS * (command.throttle < 0 ? 0.5 : 1);
  state.speed += (targetSpeed - state.speed) * 3 * dt;
  if (Math.abs(command.throttle) < 0.01 && Math.abs(command.rudder) < 0.01) {
    state.speed *= Math.pow(0.3, dt);
    if (Math.abs(state.speed) < 0.01) state.speed = 0;
  }

  if (Math.abs(state.speed) > 0.001) {
    const rad = (state.heading * Math.PI) / 180;
    const moveM = state.speed * dt;
    state.lat += Math.cos(rad) * moveM * DEG_PER_METER;
    state.lng += (Math.sin(rad) * moveM * DEG_PER_METER) / Math.cos((state.lat * Math.PI) / 180);
  }

  const dlat = (state.lat - home.lat) * 111000;
  const dlng = (state.lng - home.lng) * 111000 * Math.cos((state.lat * Math.PI) / 180);
  state.distance = Math.sqrt(dlat * dlat + dlng * dlng);

  state.battery = Math.max(0, state.battery - (state.speed / MAX_SPEED_MS) * 0.017 * dt);
  state.signal = Math.max(20, Math.min(100, state.signal + (Math.random() - 0.5) * 2));
  state.depth = 4 + Math.sin(state.lat * 50000) * 1.5 + Math.cos(state.lng * 50000) * 1.0;
  state.waterTemp = 17 + Math.sin(state.lat * 3000) * 1.4;
  state.components = deriveComponents(state);
}

const client = mqtt.connect({
  protocol: 'mqtts',
  host: ENDPOINT,
  port: 8883,
  clientId: BOAT_ID,
  ca: fs.readFileSync(caPath),
  cert: fs.readFileSync(certPath),
  key: fs.readFileSync(keyPath),
  reconnectPeriod: 3000,
  rejectUnauthorized: true,
});

client.on('connect', () => {
  console.log(`🚢 ${BOAT_ID} connected to ${ENDPOINT}`);
  client.subscribe(CONTROL_TOPIC, { qos: 0 }, (err) => {
    if (err) console.error(`subscribe failed: ${err.message}`);
    else console.log(`👂 listening on ${CONTROL_TOPIC}`);
  });
});

client.on('message', (topic, payload) => {
  if (topic !== CONTROL_TOPIC) return;
  let msg;
  try {
    msg = JSON.parse(payload.toString());
  } catch {
    console.warn(`bad payload on ${topic}`);
    return;
  }
  console.log(`📨 control:`, msg);
  switch (msg.type) {
    case 'control':
      command.throttle = Number(msg.command?.throttle) || 0;
      command.rudder = Number(msg.command?.rudder) || 0;
      break;
    case 'set-camera-mode':
      if (typeof msg.ir === 'boolean') state.ir = msg.ir;
      if (typeof msg.light === 'boolean') state.light = msg.light;
      break;
    case 'release-bait':
      if (state.baitLevel > 0) {
        state.baitLevel = Math.max(0, state.baitLevel - 20);
        client.publish(EVENT_TOPIC, JSON.stringify({ type: 'bait-released', remaining: state.baitLevel }));
      }
      break;
    case 'return-home':
      // Simplified for v1: snap to home over a few seconds.
      command.throttle = 0;
      command.rudder = 0;
      state.lat = home.lat;
      state.lng = home.lng;
      state.distance = 0;
      client.publish(EVENT_TOPIC, JSON.stringify({ type: 'arrived-home' }));
      break;
    case 'set-fault':
      if (msg.component && msg.status) {
        if (msg.status === 'normal') delete faults[msg.component];
        else faults[msg.component] = msg.status;
      }
      break;
  }
});

client.on('error', (err) => console.error(`mqtt error: ${err.message}`));
client.on('close', () => console.warn('mqtt connection closed'));

setInterval(() => {
  step();
  if (client.connected) {
    client.publish(STATE_TOPIC, JSON.stringify(state), { qos: 0 });
  }
}, Math.round(1000 / STATE_HZ));

// Synthesized camera frame: SVG rendering of "what the boat sees" — a stylized
// lake horizon with telemetry HUD overlay. Cheap, no native deps, ~3-5 KB / frame.
function renderCameraSvg() {
  const W = 320;
  const H = 200;
  const t = Date.now() / 1000;
  const wave = (x, phase) => Math.sin(x * 0.05 + t * 1.5 + phase) * 3;
  const isNight = state.ir;
  const lampOn = state.light;
  const skyTop = isNight ? '#0a0e1f' : '#7dd3fc';
  const skyBot = isNight ? '#1e293b' : '#bae6fd';
  const waterTop = isNight ? '#0f172a' : '#0369a1';
  const waterBot = isNight ? '#020617' : '#082f49';
  const horizonY = 90;
  const ts = new Date().toISOString().slice(11, 19);
  // Bow indicator rotates with heading: simple triangle on lower-center.
  const headingRad = (state.heading * Math.PI) / 180;
  const bx = 160, by = 165;
  const bowDx = Math.sin(headingRad) * 14;
  const bowDy = -Math.cos(headingRad) * 14;
  // Lake surface waves
  let waveLine = '';
  for (let x = 0; x <= W; x += 4) {
    const y = horizonY + wave(x, 0);
    waveLine += `${x === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)} `;
  }
  waveLine += `L ${W} ${H} L 0 ${H} Z`;
  const lamp = lampOn
    ? `<circle cx="160" cy="120" r="80" fill="#fef3c7" opacity="0.18"/><circle cx="160" cy="100" r="40" fill="#fde68a" opacity="0.35"/>`
    : '';
  const irOverlay = isNight
    ? `<rect width="${W}" height="${H}" fill="#10b981" opacity="0.06"/>`
    : '';
  const battColor = state.battery < 20 ? '#ef4444' : state.battery < 50 ? '#f59e0b' : '#22c55e';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
  <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBot}"/></linearGradient>
  <linearGradient id="water" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${waterTop}"/><stop offset="1" stop-color="${waterBot}"/></linearGradient>
</defs>
<rect width="${W}" height="${horizonY}" fill="url(#sky)"/>
<path d="${waveLine}" fill="url(#water)"/>
${lamp}${irOverlay}
<polygon points="${bx},${by} ${bx + bowDx - 6 * Math.cos(headingRad)},${by + bowDy - 6 * Math.sin(headingRad)} ${bx + bowDx + 6 * Math.cos(headingRad)},${by + bowDy + 6 * Math.sin(headingRad)}" fill="#fbbf24" stroke="#78350f" stroke-width="1"/>
<g font-family="ui-monospace,monospace" font-size="11" fill="#fff">
  <text x="8" y="16" font-weight="700">${BOAT_ID}</text>
  <text x="8" y="32" opacity="0.85">${ts}  ${isNight ? 'IR' : 'DAY'}${lampOn ? ' · LIGHT' : ''}</text>
  <text x="${W - 8}" y="16" text-anchor="end">HDG ${state.heading.toFixed(0).padStart(3, '0')}°</text>
  <text x="${W - 8}" y="32" text-anchor="end">SPD ${(state.speed * 3.6).toFixed(1)} km/h</text>
</g>
<g font-family="ui-monospace,monospace" font-size="10">
  <text x="8" y="${H - 8}" fill="${battColor}">BATT ${state.battery.toFixed(0)}%</text>
  <text x="${W / 2}" y="${H - 8}" text-anchor="middle" fill="#e0f2fe">SIG ${state.signal.toFixed(0)}</text>
  <text x="${W - 8}" y="${H - 8}" text-anchor="end" fill="#fed7aa">BAIT ${state.baitLevel.toFixed(0)}%</text>
</g>
</svg>`;
}

setInterval(() => {
  if (!client.connected) return;
  const svg = renderCameraSvg();
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  client.publish(CAMERA_TOPIC, JSON.stringify({ frame: dataUrl, ts: Date.now() }), { qos: 0 });
}, Math.round(1000 / CAMERA_HZ));

let logTick = 0;
setInterval(() => {
  if (++logTick % 10 === 0) {
    console.log(
      `⛵ batt=${state.battery.toFixed(0)}% sig=${state.signal.toFixed(0)} ` +
        `pos=${state.lat.toFixed(5)},${state.lng.toFixed(5)} hdg=${state.heading.toFixed(0)}° ` +
        `spd=${(state.speed * 3.6).toFixed(1)}km/h dist=${state.distance.toFixed(0)}m`,
    );
  }
}, 1000);

process.on('SIGINT', () => {
  console.log('\n🛑 shutting down');
  client.end(false, {}, () => process.exit(0));
});
