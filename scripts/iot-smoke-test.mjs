// Smoke test: connect to AWS IoT Core as BOAT-A3F8, subscribe to control topic,
// publish a state message, wait briefly for any inbound, then exit.
// Run with: node scripts/iot-smoke-test.mjs

import mqtt from 'mqtt';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CERT_DIR = path.join(__dirname, '..', '.aws-iot');

const ENDPOINT = 'a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';
const THING_NAME = 'BOAT-A3F8';
const STATE_TOPIC = `sienovo/boats/${THING_NAME}/state`;
const CONTROL_TOPIC = `sienovo/boats/${THING_NAME}/control`;

const client = mqtt.connect({
  protocol: 'mqtts',
  host: ENDPOINT,
  port: 8883,
  clientId: THING_NAME,
  ca: fs.readFileSync(path.join(CERT_DIR, 'AmazonRootCA1.pem')),
  cert: fs.readFileSync(path.join(CERT_DIR, `${THING_NAME}.cert.pem`)),
  key: fs.readFileSync(path.join(CERT_DIR, `${THING_NAME}.private.key`)),
  reconnectPeriod: 0,
  rejectUnauthorized: true,
});

const t0 = Date.now();
const log = (msg) => console.log(`[+${Date.now() - t0}ms] ${msg}`);

client.on('connect', () => {
  log(`connected to ${ENDPOINT}`);
  client.subscribe(CONTROL_TOPIC, { qos: 0 }, (err) => {
    if (err) {
      log(`SUBSCRIBE FAILED: ${err.message}`);
      process.exit(1);
    }
    log(`subscribed: ${CONTROL_TOPIC}`);
    const fakeState = {
      id: THING_NAME,
      lat: 30.2741,
      lng: 120.1551,
      battery: 87,
      signal: 92,
      heading: 45,
      speed: 0.7,
      ts: Date.now(),
    };
    client.publish(STATE_TOPIC, JSON.stringify(fakeState), { qos: 0 }, (err) => {
      if (err) {
        log(`PUBLISH FAILED: ${err.message}`);
        process.exit(1);
      }
      log(`published to ${STATE_TOPIC}: ${JSON.stringify(fakeState)}`);
      setTimeout(() => {
        log('done — disconnecting');
        client.end(false, {}, () => process.exit(0));
      }, 1500);
    });
  });
});

client.on('message', (topic, payload) => {
  log(`RECEIVED on ${topic}: ${payload.toString()}`);
});

client.on('error', (err) => {
  log(`MQTT ERROR: ${err.message}`);
  process.exit(1);
});

setTimeout(() => {
  log('TIMEOUT — never connected');
  process.exit(2);
}, 8000);
