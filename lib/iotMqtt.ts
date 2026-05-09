'use client';

import mqtt, { type MqttClient } from 'mqtt';
import {
  CognitoIdentityClient,
  GetCredentialsForIdentityCommand,
  GetIdCommand,
} from '@aws-sdk/client-cognito-identity';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';

type Creds = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
};

let cachedCreds: { creds: Creds; expiresAt: number } | null = null;

const REGION = process.env.NEXT_PUBLIC_AWS_REGION ?? 'ap-east-1';
const POOL_ID = process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID ?? '';
const ENDPOINT = process.env.NEXT_PUBLIC_IOT_ENDPOINT ?? '';

async function getCognitoCredentials(): Promise<Creds> {
  if (cachedCreds && cachedCreds.expiresAt > Date.now() + 60_000) {
    return cachedCreds.creds;
  }
  if (!POOL_ID) throw new Error('NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID is not set');

  const client = new CognitoIdentityClient({ region: REGION });
  const idResp = await client.send(new GetIdCommand({ IdentityPoolId: POOL_ID }));
  const credResp = await client.send(
    new GetCredentialsForIdentityCommand({ IdentityId: idResp.IdentityId }),
  );
  const c = credResp.Credentials;
  if (!c?.AccessKeyId || !c.SecretKey) {
    throw new Error('Cognito did not return credentials');
  }
  const creds: Creds = {
    accessKeyId: c.AccessKeyId,
    secretAccessKey: c.SecretKey,
    sessionToken: c.SessionToken,
  };
  cachedCreds = {
    creds,
    expiresAt: c.Expiration ? new Date(c.Expiration).getTime() : Date.now() + 50 * 60_000,
  };
  return creds;
}

async function buildSignedWssUrl(): Promise<string> {
  if (!ENDPOINT) throw new Error('NEXT_PUBLIC_IOT_ENDPOINT is not set');
  const creds = await getCognitoCredentials();
  // AWS IoT WSS requires session token to be appended AFTER signing,
  // not included in the canonical query. So sign without the token first.
  const signer = new SignatureV4({
    credentials: {
      accessKeyId: creds.accessKeyId,
      secretAccessKey: creds.secretAccessKey,
    },
    region: REGION,
    service: 'iotdevicegateway',
    sha256: Sha256,
  });
  const request = new HttpRequest({
    protocol: 'wss:',
    hostname: ENDPOINT,
    path: '/mqtt',
    method: 'GET',
    headers: { host: ENDPOINT },
  });
  const presigned = await signer.presign(request, { expiresIn: 3600 });
  const qs = new URLSearchParams(presigned.query as Record<string, string>).toString();
  const tokenSuffix = creds.sessionToken
    ? `&X-Amz-Security-Token=${encodeURIComponent(creds.sessionToken)}`
    : '';
  return `wss://${ENDPOINT}${presigned.path}?${qs}${tokenSuffix}`;
}

export type IotMqttOptions = {
  clientId: string;
  onConnect?: () => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
  onMessage?: (topic: string, payload: Buffer) => void;
};

export async function connectIotMqtt(opts: IotMqttOptions): Promise<MqttClient> {
  const url = await buildSignedWssUrl();
  const client = mqtt.connect(url, {
    clientId: opts.clientId,
    protocolVersion: 4,
    reconnectPeriod: 0,
    transformWsUrl: () => {
      // Resign on reconnect attempts. mqtt.js calls this synchronously, so we
      // can't refresh creds here — fall back to the (still-valid for ~1h) URL.
      return url;
    },
  });
  if (opts.onConnect) client.on('connect', opts.onConnect);
  if (opts.onError) client.on('error', opts.onError);
  if (opts.onClose) client.on('close', opts.onClose);
  if (opts.onMessage) client.on('message', (topic, payload) => opts.onMessage!(topic, payload));
  return client;
}
