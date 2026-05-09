// Subscribe using IAM user creds (sienovo profile, has admin) instead of Cognito unauth.
// If this receives messages but the Cognito viewer doesn't, the issue is the unauth role's iot:Receive policy.

import mqtt from 'mqtt';
import { fromIni } from '@aws-sdk/credential-providers';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'ap-east-1';
const ENDPOINT = 'a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';

const c = await fromIni({ profile: 'sienovo' })();
const signer = new SignatureV4({
  credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  region: REGION, service: 'iotdevicegateway', sha256: Sha256,
});
const req = new HttpRequest({
  protocol: 'wss:', hostname: ENDPOINT, path: '/mqtt', method: 'GET', headers: { host: ENDPOINT },
});
const presigned = await signer.presign(req, { expiresIn: 3600 });
const url = `wss://${ENDPOINT}${presigned.path}?${new URLSearchParams(presigned.query).toString()}${
  c.sessionToken ? `&X-Amz-Security-Token=${encodeURIComponent(c.sessionToken)}` : ''
}`;

const client = mqtt.connect(url, {
  clientId: `admin-recv-${Math.random().toString(36).slice(2, 6)}`,
  protocolVersion: 4, reconnectPeriod: 0,
});
let count = 0;
client.on('connect', () => {
  client.subscribe('sienovo/boats/+/state', { qos: 0 }, (e) => {
    if (e) console.log('sub err', e);
    else console.log('subscribed (admin), watching...');
  });
});
client.on('message', (t, p) => {
  count++;
  if (count <= 3) {
    const s = JSON.parse(p.toString());
    console.log(`[${count}]`, t, 'batt=', s.battery.toFixed(0), 'sig=', s.signal.toFixed(0));
  }
});
client.on('error', (e) => console.log('error:', e.message));
setTimeout(() => {
  console.log(`admin received ${count} messages in 4s`);
  client.end();
  process.exit(count > 0 ? 0 : 1);
}, 4000);
