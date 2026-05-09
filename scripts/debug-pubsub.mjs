// One client publishes, another subscribes (both use admin SigV4).
// Confirms whether the broker delivers messages independent of the simulator.

import mqtt from 'mqtt';
import { fromIni } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'ap-east-1';
const ENDPOINT = 'a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';

async function signedUrl(creds) {
  const signer = new SignatureV4({
    credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey },
    region: REGION, service: 'iotdevicegateway', sha256: Sha256,
  });
  const req = new HttpRequest({
    protocol: 'wss:', hostname: ENDPOINT, path: '/mqtt', method: 'GET', headers: { host: ENDPOINT },
  });
  const presigned = await signer.presign(req, { expiresIn: 3600 });
  return `wss://${ENDPOINT}${presigned.path}?${new URLSearchParams(presigned.query).toString()}${
    creds.sessionToken ? `&X-Amz-Security-Token=${encodeURIComponent(creds.sessionToken)}` : ''
  }`;
}

const c = await fromIni({ profile: 'sienovo-iot' })();
const url = await signedUrl(c);

const sub = mqtt.connect(url, { clientId: `sub-${Math.random().toString(36).slice(2,6)}`, protocolVersion: 4, reconnectPeriod: 0 });
sub.on('connect', () => {
  sub.subscribe('sienovo/boats/+/state', { qos: 0 }, (e) => {
    if (e) { console.log('sub err', e.message); process.exit(1); }
    console.log('subscriber ready');

    const url2 = signedUrl(c).then((u) => {
      const pub = mqtt.connect(u, { clientId: `pub-${Math.random().toString(36).slice(2,6)}`, protocolVersion: 4, reconnectPeriod: 0 });
      pub.on('connect', () => {
        console.log('publisher connected, publishing 3 messages...');
        for (let i = 0; i < 3; i++) {
          pub.publish('sienovo/boats/TEST-PUB/state', JSON.stringify({ id: 'TEST-PUB', tick: i, ts: Date.now() }), { qos: 0 }, (err) => {
            if (err) console.log(`pub ${i} err:`, err.message);
            else console.log(`pub ${i} OK`);
          });
        }
        setTimeout(() => pub.end(), 500);
      });
      pub.on('error', (e) => console.log('pub error:', e.message));
    });
  });
});
sub.on('message', (t, p) => console.log('  ✅ subscriber received on', t, '— payload:', p.toString().slice(0, 80)));
sub.on('error', (e) => console.log('sub error:', e.message));

setTimeout(() => { console.log('done'); sub.end(); process.exit(0); }, 5000);
