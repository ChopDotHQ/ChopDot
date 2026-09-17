(function(root){
'use strict';
const STATES=['welcome','invite','email','code','profile','wallet','approval-waiting','approval-declined','approval-expired','approval-unknown','offline','session-expired','wrong-account','ready','load-error','home-reference','invite-reference'];
const normalizeEmail=value=>String(value||'').trim().toLowerCase();
const emailSubject=value=>{const v=normalizeEmail(value);return v?`email:${v}`:null};
const walletSubject=value=>{const v=String(value||'').trim().toLowerCase();return v?`wallet:${v}`:null};
const currentSubject=n=>n.method==='wallet'?walletSubject(n.account):emailSubject(n.email);
function freshVerificationEpoch(){
 const cryptoApi=root&&root.crypto;
 if(cryptoApi&&typeof cryptoApi.randomUUID==='function')return cryptoApi.randomUUID();
 if(typeof require==='function'){try{const {randomUUID}=require('node:crypto');if(typeof randomUUID==='function')return randomUUID();}catch{}}
 throw new Error('Secure verification epoch unavailable.');
}
const requestIdentity=(epoch,counter)=>`${epoch}:${counter}`;
const emailProviderResultsByRequest=new Map();
function rotateRequest(n){n.requestCounter=(Number.isSafeInteger(n.requestCounter)?n.requestCounter:0)+1;n.request=requestIdentity(n.verificationEpoch,n.requestCounter);}
function clearPending(n){n.pendingSubject=null;n.pendingMethod=null;n.pendingRequest=null;n.pendingChallenge=0;n.pendingDestination=null;n.pendingEpoch=null;}
function clearVerified(n){n.verified=false;n.verifiedSubject=null;n.verifiedMethod=null;n.verifiedRequest=null;n.verifiedChallenge=0;n.verifiedDestination=null;n.verifiedEpoch=null;}
function invalidateAuthority(n,{rotate=false,clearPendingAuthority=true}={}){if(rotate)rotateRequest(n);clearVerified(n);if(clearPendingAuthority)clearPending(n);}
function verificationCurrent(n){
 const subject=currentSubject(n);
 return !!(n.verified&&subject&&n.verifiedEpoch===n.verificationEpoch&&n.verifiedSubject===subject&&n.verifiedMethod===n.method&&n.verifiedRequest===n.request&&n.verifiedDestination===n.destination&&(n.method!=='email'||n.verifiedChallenge===n.challenge));
}
function issueEmailProviderEvidence(n){
 if(!n||n.route!=='code'||n.method!=='email'||!n.pendingRequest||!n.pendingSubject||!n.pendingDestination||!n.pendingEpoch||!Number.isSafeInteger(n.pendingChallenge)||n.pendingChallenge<1)return null;
 const evidence={providerRequestId:freshVerificationEpoch(),request:n.pendingRequest,challenge:n.pendingChallenge,subject:n.pendingSubject,destination:n.pendingDestination,epoch:n.pendingEpoch};
 emailProviderResultsByRequest.set(n.pendingRequest,evidence);
 return evidence;
}
function emailProviderEvidence(n){
 const evidence=n&&emailProviderResultsByRequest.get(n.pendingRequest);
 return evidence?{...evidence}:null;
}
function emailVerificationResult(evidence,code){
 const result={code:String(code??'')};
 if(!evidence||typeof evidence!=='object'||typeof evidence.providerRequestId!=='string'||typeof evidence.request!=='string'||!Number.isSafeInteger(evidence.challenge)||typeof evidence.subject!=='string'||typeof evidence.destination!=='string'||typeof evidence.epoch!=='string')return result;
 return {...result,providerRequestId:evidence.providerRequestId,request:evidence.request,challenge:evidence.challenge,subject:evidence.subject,destination:evidence.destination,epoch:evidence.epoch};
}
function initial(){const verificationEpoch=freshVerificationEpoch();return {route:'welcome',destination:'home',email:'',name:'',method:null,account:null,verified:false,isNew:true,challenge:0,expired:false,online:true,approval:'none',requestCounter:0,request:requestIdentity(verificationEpoch,0),verificationEpoch,expectedIdentity:null,error:'',notice:'',events:[],joined:false,pendingSubject:null,pendingMethod:null,pendingRequest:null,pendingChallenge:0,pendingDestination:null,pendingEpoch:null,verifiedSubject:null,verifiedMethod:null,verifiedRequest:null,verifiedChallenge:0,verifiedDestination:null,verifiedEpoch:null};}
function apply(s,event,payload={}){
 const n=JSON.parse(JSON.stringify(s)); n.error='';n.notice='';
 const emit=(type,authority='person',subject=currentSubject(n))=>n.events.push({type,authority,destination:n.destination,challenge:n.challenge,request:n.request,verification_epoch:n.verificationEpoch,subject:subject||null,verified_subject:n.verifiedSubject||null,verified_epoch:n.verifiedEpoch||null});
 const failClosedRoute=()=>n.method==='email'&&n.email?'email':n.method==='wallet'?'wallet':'welcome';
 switch(event){
 case 'NAVIGATE':
  if(!STATES.includes(payload.route))break;
  if(['profile','ready','home-reference','invite-reference'].includes(payload.route)&&!verificationCurrent(n)){n.route=failClosedRoute();break;}
  n.route=payload.route;break;
 case 'INVITE':Object.assign(n,initial(),{destination:'invite',route:'invite'});break;
 case 'EMAIL':invalidateAuthority(n,{rotate:true});n.method='email';n.route='email';n.approval='none';break;
 case 'SET_EMAIL':{
  const before=emailSubject(n.email);const next=String(payload.value||'').trim();const after=emailSubject(next);
  const liveEmailBinding=(n.pendingMethod==='email'&&n.pendingSubject)||(n.verifiedMethod==='email'&&n.verifiedSubject);
  n.email=next;n.method='email';
  if(before!==after&&liveEmailBinding)invalidateAuthority(n,{rotate:true});
  break;}
 case 'SEND_CODE':{
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)){n.error='Enter a valid email address.';break;}
  if(!n.online){n.route='offline';break;}
  rotateRequest(n);n.challenge++;n.expired=false;n.method='email';n.approval='none';clearVerified(n);
  n.pendingSubject=emailSubject(n.email);n.pendingMethod='email';n.pendingRequest=n.request;n.pendingChallenge=n.challenge;n.pendingDestination=n.destination;n.pendingEpoch=n.verificationEpoch;
  n.route='code';issueEmailProviderEvidence(n);emit('SignInCodeRequested','person',n.pendingSubject);break;}
 case 'VERIFY_CODE':{
  if(n.route!=='code'||n.method!=='email'||n.challenge<1)break;
  const subject=emailSubject(n.email);
  const evidenceComplete=typeof payload.providerRequestId==='string'&&typeof payload.request==='string'&&Number.isSafeInteger(payload.challenge)&&typeof payload.subject==='string'&&typeof payload.destination==='string'&&typeof payload.epoch==='string';
  if(!evidenceComplete){invalidateAuthority(n,{rotate:true});n.route='email';n.error='Request a fresh code for this email.';break;}
  const eventRequest=payload.request,eventChallenge=payload.challenge,eventSubject=payload.subject,eventDestination=payload.destination,eventEpoch=payload.epoch;
  const issued=emailProviderResultsByRequest.get(eventRequest);
  const providerBound=!!issued&&issued.providerRequestId===payload.providerRequestId&&issued.request===eventRequest&&issued.challenge===eventChallenge&&issued.subject===eventSubject&&issued.destination===eventDestination&&issued.epoch===eventEpoch;
  const correlated=providerBound&&n.pendingEpoch===n.verificationEpoch&&eventEpoch===n.pendingEpoch&&n.pendingMethod==='email'&&n.pendingSubject===subject&&n.pendingRequest===n.request&&n.pendingChallenge===n.challenge&&n.pendingDestination===n.destination&&eventRequest===n.pendingRequest&&eventChallenge===n.pendingChallenge&&eventSubject===n.pendingSubject&&eventDestination===n.pendingDestination;
  if(!correlated){invalidateAuthority(n,{rotate:true});n.route='email';n.error='Request a fresh code for this email.';break;}
  emit('SignInCodeVerificationRequested','person',n.pendingSubject);
  if(!n.online){n.route='offline';break;}
  if(n.expired){n.error='This code expired. Request a new one.';break;}
  if(String(payload.code)!=='123456'){n.error='That code does not match. Try again.';break;}
  if(n.expectedIdentity&&normalizeEmail(n.email)!==normalizeEmail(n.expectedIdentity)){invalidateAuthority(n);n.route='wrong-account';break;}
  n.verified=true;n.verifiedSubject=n.pendingSubject;n.verifiedMethod='email';n.verifiedRequest=n.pendingRequest;n.verifiedChallenge=n.pendingChallenge;n.verifiedDestination=n.pendingDestination;n.verifiedEpoch=n.pendingEpoch;
  emailProviderResultsByRequest.delete(eventRequest);
  n.isNew=normalizeEmail(n.email)!=='dev@example.com';n.name=n.isNew?'':'Dev';n.route=n.isNew?'profile':'ready';emit('SessionVerified','demo-provider',n.verifiedSubject);break;}
 case 'RESEND':
  if(n.route!=='code'||n.method!=='email')break;
  if(!n.online){n.route='offline';break;}
  rotateRequest(n);n.challenge++;n.expired=false;clearVerified(n);n.pendingSubject=emailSubject(n.email);n.pendingMethod='email';n.pendingRequest=n.request;n.pendingChallenge=n.challenge;n.pendingDestination=n.destination;n.pendingEpoch=n.verificationEpoch;n.notice='New code sent. Use the latest one.';issueEmailProviderEvidence(n);emit('SignInCodeRequested','person',n.pendingSubject);break;
 case 'PROFILE':
  if(!verificationCurrent(n)){invalidateAuthority(n);n.route='email';break;}
  n.name=String(payload.name||'').trim();if(!n.name||n.name.length>40){n.error='Use a name between 1 and 40 characters.';break;}
  n.route='ready';emit('DisplayNameSaved');break;
 case 'WALLET':invalidateAuthority(n,{rotate:true});n.method='wallet';n.route='wallet';n.approval='none';n.account=null;break;
 case 'REQUEST_APPROVAL':{
  n.method='wallet';n.account=payload.account||'Everyday';
  if(!n.online){n.route='offline';break;}
  rotateRequest(n);n.approval='waiting';clearVerified(n);n.pendingSubject=walletSubject(n.account);n.pendingMethod='wallet';n.pendingRequest=n.request;n.pendingChallenge=0;n.pendingDestination=n.destination;n.pendingEpoch=n.verificationEpoch;n.route='approval-waiting';emit('SignInApprovalRequested','person',n.pendingSubject);break;}
 case 'APPROVAL_RESULT':{
  const subject=walletSubject(n.account);const eventSubject=payload.subject??n.pendingSubject,eventDestination=payload.destination??n.pendingDestination,eventEpoch=payload.epoch??n.pendingEpoch;
  const correlated=n.pendingEpoch===n.verificationEpoch&&eventEpoch===n.pendingEpoch&&payload.request===n.pendingRequest&&eventSubject===n.pendingSubject&&eventDestination===n.pendingDestination&&n.request===n.pendingRequest&&n.pendingMethod==='wallet'&&n.pendingSubject===subject&&n.pendingDestination===n.destination&&n.method==='wallet'&&['waiting','unknown'].includes(n.approval);
  if(!correlated)break;
  if(payload.result==='approved'){
   if(n.expectedIdentity&&String(n.expectedIdentity).trim().toLowerCase()!==subject){invalidateAuthority(n);n.route='wrong-account';break;}
   n.verified=true;n.verifiedSubject=n.pendingSubject;n.verifiedMethod='wallet';n.verifiedRequest=n.pendingRequest;n.verifiedChallenge=0;n.verifiedDestination=n.pendingDestination;n.verifiedEpoch=n.pendingEpoch;n.approval='verified';n.isNew=n.account!=='Everyday';n.name=n.isNew?'':'Dev';n.route=n.isNew?'profile':'ready';emit('SessionVerified','demo-provider',n.verifiedSubject);
  }else if(payload.result==='declined'){n.approval='declined';n.route='approval-declined';}
  else if(payload.result==='expired'){n.approval='expired';n.route='approval-expired';}
  else {n.approval='unknown';n.route='approval-unknown';}break;}
 case 'REFRESH_APPROVAL':n.notice='Still waiting for your wallet.';emit('SignInStatusChecked','viewer',n.pendingSubject);break;
 case 'CANCEL_APPROVAL':invalidateAuthority(n,{rotate:true});n.approval='cancelled';n.route='wallet';emit('SignInApprovalCancelled');break;
 case 'OPEN_DESTINATION':if(verificationCurrent(n)){n.route=n.destination==='invite'?'invite-reference':'home-reference';emit('EntryDestinationOpened','viewer');}else{invalidateAuthority(n);n.route=failClosedRoute();}break;
 case 'REAUTH':Object.assign(n,initial(),{route:'session-expired',destination:payload.destination||'home',expectedIdentity:'dev@example.com'});break;
 case 'RETRY_CONNECTION':n.route=n.online?(n.method==='wallet'?'wallet':'email'):'offline';break;
 case 'BACK_TO_EMAIL':invalidateAuthority(n,{rotate:true});n.method='email';n.route='email';n.approval='cancelled';break;
 case 'START_OVER':return initial();
 }
 return n;
}
const api={STATES,initial,apply,normalizeEmail,currentSubject,verificationCurrent,emailProviderEvidence,emailVerificationResult};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.EntryModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
