(function(root){
'use strict';
const STATES=['welcome','invite','email','code','profile','wallet','approval-waiting','approval-declined','approval-expired','approval-unknown','offline','session-expired','wrong-account','ready','load-error','home-reference','invite-reference'];
function initial(){return {route:'welcome',destination:'home',email:'',name:'',method:null,account:null,verified:false,isNew:true,challenge:0,expired:false,online:true,approval:'none',request:0,expectedIdentity:null,error:'',notice:'',events:[],joined:false};}
function apply(s,event,payload={}){
 const n=JSON.parse(JSON.stringify(s)); n.error='';n.notice='';
 const emit=(type,authority='person')=>n.events.push({type,authority,destination:n.destination,challenge:n.challenge,request:n.request});
 switch(event){
 case 'NAVIGATE': if(!STATES.includes(payload.route))break; if(['profile','ready','home-reference','invite-reference'].includes(payload.route)&&!n.verified){n.route='welcome';break;}n.route=payload.route;break;
 case 'INVITE':Object.assign(n,initial(),{destination:'invite',route:'invite'});break;
 case 'EMAIL': n.verified=false;n.method='email';n.route='email';n.approval='none';n.request++;break;
 case 'SET_EMAIL':n.email=String(payload.value||'').trim();break;
 case 'SEND_CODE':
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)){n.error='Enter a valid email address.';break;}
  if(!n.online){n.route='offline';break;}
  n.challenge++;n.expired=false;n.method='email';n.route='code';emit('SignInCodeRequested');break;
 case 'VERIFY_CODE':
  if(n.route!=='code'||n.method!=='email'||n.challenge<1)break;
  emit('SignInCodeVerificationRequested');
  if(!n.online){n.route='offline';break;}
  if(n.expired){n.error='This code expired. Request a new one.';break;}
  if(String(payload.code)!=='123456'){n.error='That code does not match. Try again.';break;}
  // Prototype-only provider fixture. The production verifier is NEVER in browser code.
  if(n.expectedIdentity&&n.email!==n.expectedIdentity){n.route='wrong-account';n.verified=false;break;}
  n.verified=true;n.isNew=n.email!=='dev@example.com';n.name=n.isNew?'':'Dev';n.route=n.isNew?'profile':'ready';emit('SessionVerified','demo-provider');break;
 case 'RESEND':
  if(n.route!=='code'||n.method!=='email')break;
  if(!n.online){n.route='offline';break;}
  n.challenge++;n.expired=false;n.notice='New code sent. Use the latest one.';emit('SignInCodeRequested');break;
 case 'PROFILE':
  if(!n.verified){n.route='email';break;}
  n.name=String(payload.name||'').trim();if(!n.name||n.name.length>40){n.error='Use a name between 1 and 40 characters.';break;}
  n.route='ready';emit('DisplayNameSaved');break;
 case 'WALLET':n.verified=false;n.route='wallet';n.request++;n.approval='none';n.account=null;break;
 case 'REQUEST_APPROVAL':
  n.method='wallet';n.account=payload.account||'Everyday';
  if(!n.online){n.route='offline';break;}
  n.account=payload.account||'Everyday';n.method='wallet';n.request++;n.approval='waiting';n.route='approval-waiting';emit('SignInApprovalRequested');break;
 case 'APPROVAL_RESULT':
  // Test harness supplies a simulated verified result for the CURRENT sign-in request.
  if(payload.request!==n.request||n.method!=='wallet'||!['waiting','unknown'].includes(n.approval))break;
  if(payload.result==='approved'){
   if(n.expectedIdentity&&n.expectedIdentity!=='wallet:Everyday'){n.route='wrong-account';break;}
   n.verified=true;n.approval='verified';n.isNew=n.account!=='Everyday';n.name=n.isNew?'':'Dev';n.route=n.isNew?'profile':'ready';emit('SessionVerified','demo-provider');
  }else if(payload.result==='declined'){n.approval='declined';n.route='approval-declined';}
  else if(payload.result==='expired'){n.approval='expired';n.route='approval-expired';}
  else {n.approval='unknown';n.route='approval-unknown';}break;
 case 'REFRESH_APPROVAL':n.notice='Still waiting for your wallet.';emit('SignInStatusChecked','viewer');break;
 case 'CANCEL_APPROVAL':n.request++;n.approval='cancelled';n.route='wallet';n.verified=false;emit('SignInApprovalCancelled');break;
 case 'OPEN_DESTINATION':if(n.verified){n.route=n.destination==='invite'?'invite-reference':'home-reference';emit('EntryDestinationOpened','viewer');}break;
 case 'REAUTH':Object.assign(n,initial(),{route:'session-expired',destination:payload.destination||'home',expectedIdentity:'dev@example.com'});break;
 case 'RETRY_CONNECTION':n.route=n.online?(n.method==='wallet'?'wallet':'email'):'offline';break;
 case 'BACK_TO_EMAIL':n.route='email';n.verified=false;n.approval='cancelled';n.request++;break;
 case 'START_OVER':return initial();
 }
 return n;
}
const api={STATES,initial,apply};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.EntryModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
