import { CognitoIdentityClient, GetCredentialsForIdentityCommand, GetIdCommand } from '@aws-sdk/client-cognito-identity';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION = 'ap-east-1';
const POOL = 'ap-east-1:94175a79-f33f-48c1-89f3-fc79288207f0';
const ENDPOINT = 'a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';

const cog = new CognitoIdentityClient({ region: REGION });
const id = (await cog.send(new GetIdCommand({ IdentityPoolId: POOL }))).IdentityId;
const c = (await cog.send(new GetCredentialsForIdentityCommand({ IdentityId: id }))).Credentials;
const creds = { accessKeyId: c.AccessKeyId, secretAccessKey: c.SecretKey, sessionToken: c.SessionToken };

const signer = new SignatureV4({ credentials: creds, region: REGION, service: 'iotdevicegateway', sha256: Sha256 });
const req = new HttpRequest({ protocol: 'wss:', hostname: ENDPOINT, path: '/mqtt', method: 'GET', headers: { host: ENDPOINT } });
const presigned = await signer.presign(req, { expiresIn: 3600 });
console.log('--- presigned.query ---');
console.log(JSON.stringify(presigned.query, null, 2));
console.log('--- presigned.headers ---');
console.log(JSON.stringify(presigned.headers, null, 2));
console.log('--- presigned.path ---');
console.log(presigned.path);
