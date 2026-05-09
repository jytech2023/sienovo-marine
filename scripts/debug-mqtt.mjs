import mqtt from 'mqtt';
import { CognitoIdentityClient, GetCredentialsForIdentityCommand, GetIdCommand } from '@aws-sdk/client-cognito-identity';
import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';

const REGION='ap-east-1', POOL='ap-east-1:94175a79-f33f-48c1-89f3-fc79288207f0';
const ENDPOINT='a36ytt8gq852xf-ats.iot.ap-east-1.amazonaws.com';
const cog=new CognitoIdentityClient({region:REGION});
const id=(await cog.send(new GetIdCommand({IdentityPoolId:POOL}))).IdentityId;
const c=(await cog.send(new GetCredentialsForIdentityCommand({IdentityId:id}))).Credentials;
const sessionToken=c.SessionToken;
const signer=new SignatureV4({credentials:{accessKeyId:c.AccessKeyId,secretAccessKey:c.SecretKey},region:REGION,service:'iotdevicegateway',sha256:Sha256});
const req=new HttpRequest({protocol:'wss:',hostname:ENDPOINT,path:'/mqtt',method:'GET',headers:{host:ENDPOINT}});
const presigned=await signer.presign(req,{expiresIn:3600});
const qs=new URLSearchParams(presigned.query).toString();
const url=`wss://${ENDPOINT}${presigned.path}?${qs}&X-Amz-Security-Token=${encodeURIComponent(sessionToken)}`;

const client=mqtt.connect(url,{clientId:`viewer-debug-${Math.random().toString(36).slice(2,6)}`,protocolVersion:4,reconnectPeriod:0,keepalive:60});
client.on('connect',(c)=>{
  console.log('✅ MQTT connect ack, returnCode=',c.returnCode,'sessionPresent=',c.sessionPresent);
  client.subscribe('sienovo/boats/+/state',{qos:0},(e,granted)=>{
    if(e)console.log('subscribe ERR:',e);
    else console.log('subscribe OK, granted:',granted);
  });
});
client.on('packetreceive',(p)=>console.log('<<',p.cmd,p.qos!==undefined?'qos='+p.qos:'',p.topic||''));
client.on('packetsend',(p)=>console.log('>>',p.cmd,p.qos!==undefined?'qos='+p.qos:'',p.topic||''));
client.on('disconnect',(p)=>console.log('disconnect packet:',p));
client.on('error',(e)=>console.log('❌ error:',e.message,e.code||''));
client.on('close',()=>console.log('close'));
setTimeout(()=>{console.log('done');client.end(true);process.exit(0);},5000);
