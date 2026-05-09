import {
  CognitoIdentityClient,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
} from '@aws-sdk/client-cognito-identity';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import mqtt from 'mqtt';

const REGION = 'ap-east-1';
const POOL_ID = 'ap-east-1:94175a79-f33f-48c1-89f3-fc79288207f0';
const ENDPOINT = 'a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';

const cog = new CognitoIdentityClient({ region: REGION });
const id = (await cog.send(new GetIdCommand({ IdentityPoolId: POOL_ID }))).IdentityId;
const c = (await cog.send(new GetCredentialsForIdentityCommand({ IdentityId: id }))).Credentials;
const sessionToken = c.SessionToken;
console.log('got creds OK, role assumed');

const signer = new SignatureV4({
  credentials: { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretKey },
  region: REGION, service: 'iotdevicegateway', sha256: Sha256,
});
const req = new HttpRequest({ protocol: 'wss:', hostname: ENDPOINT, path: '/mqtt', method: 'GET', headers: { host: ENDPOINT } });
const presigned = await signer.presign(req, { expiresIn: 3600 });
const qs = new URLSearchParams(presigned.query).toString();
const url = `wss://${ENDPOINT}${presigned.path}?${qs}&X-Amz-Security-Token=${encodeURIComponent(sessionToken)}`;
console.log('signed URL prefix:', url.slice(0, 120) + '...');
console.log('URL length:', url.length);

const client = mqtt.connect(url, { clientId: `viewer-test-${Math.random().toString(36).slice(2,6)}`, protocolVersion: 4, reconnectPeriod: 0 });
client.on('connect', () => { console.log('✅ WSS+MQTT connected'); client.subscribe('sienovo/boats/BOAT-A3F8/state', { qos: 0 }, (e) => { if (e) console.log('subscribe err', e.message); else console.log('✅ subscribed'); }); });
client.on('message', (t, p) => { console.log('msg on', t, '— bytes:', p.length); client.end(); process.exit(0); });
client.on('error', (e) => { console.log('❌ MQTT error:', e.message); process.exit(1); });
client.on('close', () => console.log('connection closed'));
setTimeout(() => { console.log('TIMEOUT'); process.exit(2); }, 8000);
