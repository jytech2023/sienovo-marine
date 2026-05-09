import mqtt from 'mqtt';
import {
  CognitoIdentityClient,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
} from '@aws-sdk/client-cognito-identity';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'ap-east-1';
const POOL = 'ap-east-1:94175a79-f33f-48c1-89f3-fc79288207f0';
const ENDPOINT = 'a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';

const cog = new CognitoIdentityClient({ region: REGION });
const id = (await cog.send(new GetIdCommand({ IdentityPoolId: POOL }))).IdentityId;
const c = (await cog.send(new GetCredentialsForIdentityCommand({ IdentityId: id }))).Credentials;
const signer = new SignatureV4({
  credentials: { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretKey },
  region: REGION, service: 'iotdevicegateway', sha256: Sha256,
});
const req = new HttpRequest({
  protocol: 'wss:', hostname: ENDPOINT, path: '/mqtt', method: 'GET', headers: { host: ENDPOINT },
});
const presigned = await signer.presign(req, { expiresIn: 3600 });
const url = `wss://${ENDPOINT}${presigned.path}?${new URLSearchParams(presigned.query).toString()}&X-Amz-Security-Token=${encodeURIComponent(c.SessionToken)}`;

const client = mqtt.connect(url, {
  clientId: `viewer-recv-${Math.random().toString(36).slice(2, 6)}`,
  protocolVersion: 4, reconnectPeriod: 0,
});
let count = 0;
client.on('connect', () => {
  client.subscribe('sienovo/boats/+/state', { qos: 0 }, (e) => {
    if (e) console.log('sub err', e);
    else console.log('subscribed, watching for messages...');
  });
});
client.on('message', (t, p) => {
  count++;
  if (count <= 3) {
    const s = JSON.parse(p.toString());
    console.log(`[${count}]`, t, 'batt=', s.battery.toFixed(0), 'sig=', s.signal.toFixed(0));
  }
});
setTimeout(() => {
  console.log(`received ${count} messages in 4s`);
  client.end();
  process.exit(count > 0 ? 0 : 1);
}, 4000);
