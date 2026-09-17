const assert=require('node:assert/strict');
const M=require('./model.cjs');
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const ne=(a,b,m)=>{assert.notDeepEqual(a,b,m);checks++};
const ok=(v,m)=>{assert.ok(v,m);checks++};
const proof=s=>({request:s.pendingRequest,challenge:s.pendingChallenge,subject:s.pendingSubject,destination:s.pendingDestination,epoch:s.pendingEpoch});
const emailEvidence=s=>M.emailProviderEvidence(s);
const resultFromEvidence=(evidence,code='123456')=>M.emailVerificationResult(evidence,code);
const emailResult=(s,code='123456')=>resultFromEvidence(emailEvidence(s),code);
const walletEvidence=s=>M.walletProviderEvidence(s);
const walletResultFromEvidence=(evidence,result='approved')=>M.walletApprovalResult(evidence,result);
const enterEmail=(s,email)=>{s=M.apply(s,'EMAIL');s=M.apply(s,'SET_EMAIL',{value:email});return M.apply(s,'SEND_CODE')};
const readyEmail=(email='dev@example.com',destination='home')=>{
 let s=M.initial();if(destination==='invite')s=M.apply(s,'INVITE');s=enterEmail(s,email);s=M.apply(s,'VERIFY_CODE',emailResult(s));
 if(s.route==='profile')s=M.apply(s,'PROFILE',{name:'Sam'});return s;
};
const walletPending=(destination='home',account='Everyday')=>{let s=M.initial();if(destination==='invite')s=M.apply(s,'INVITE');s=M.apply(s,'WALLET');return M.apply(s,'REQUEST_APPROVAL',{account})};

// Baseline subject-bound success.
let s=readyEmail();
eq(s.route,'ready');eq(s.verified,true);eq(s.verifiedSubject,'email:dev@example.com');eq(s.verifiedEpoch,s.verificationEpoch);eq(M.verificationCurrent(s),true);
let session=s.events.findLast(e=>e.type==='SessionVerified');eq(session.subject,'email:dev@example.com');eq(session.request,s.verifiedRequest);eq(session.destination,'home');eq(session.verified_epoch,s.verificationEpoch);

// Normalization is part of the identity subject; cosmetic case/space changes do not create a new subject.
s=readyEmail(' Dev@Example.com ');const req=s.request;eq(s.verifiedSubject,'email:dev@example.com');s=M.apply(s,'NAVIGATE',{route:'email'});s=M.apply(s,'SET_EMAIL',{value:'dev@example.com'});eq(s.request,req);eq(s.verified,true);eq(M.verificationCurrent(s),true);

// Verified A -> browser/history email -> mutate to B -> forward Ready must fail closed.
s=readyEmail('dev@example.com','invite');const verifiedA={subject:s.verifiedSubject,request:s.verifiedRequest,challenge:s.verifiedChallenge,destination:s.verifiedDestination,epoch:s.verifiedEpoch};
s=M.apply(s,'NAVIGATE',{route:'email'});eq(s.route,'email');eq(s.verified,true);
s=M.apply(s,'SET_EMAIL',{value:'other@example.com'});eq(s.email,'other@example.com');eq(s.verified,false);eq(s.verifiedSubject,null);eq(s.pendingSubject,null);eq(s.destination,'invite');ne(s.request,verifiedA.request,'subject mutation rotates request identity');
s=M.apply(s,'NAVIGATE',{route:'ready'});eq(s.route,'email');eq(M.verificationCurrent(s),false);
s=M.apply(s,'NAVIGATE',{route:'invite-reference'});eq(s.route,'email');

// Stale prior-subject tuple cannot authorize B and cannot be completed by local pending-state synthesis.
s=M.apply(s,'NAVIGATE',{route:'code'});s=M.apply(s,'VERIFY_CODE',{code:'123456',request:verifiedA.request,challenge:verifiedA.challenge,subject:verifiedA.subject,destination:verifiedA.destination,epoch:verifiedA.epoch});eq(s.verified,false);eq(s.route,'email');

// Fresh B request is required and binds a new proof request inside the same non-reusable epoch.
s=M.apply(s,'SEND_CODE');let b=proof(s);let bEvidence=emailEvidence(s);eq(b.subject,'email:other@example.com');eq(b.destination,'invite');ne(b.request,verifiedA.request);ok(b.challenge>verifiedA.challenge);eq(b.epoch,s.verificationEpoch);ok(bEvidence&&typeof bEvidence.providerRequestId==='string','provider request identity issued with B request');
s=M.apply(s,'VERIFY_CODE',resultFromEvidence(bEvidence));eq(s.verified,true);eq(s.verifiedSubject,'email:other@example.com');eq(s.verifiedDestination,'invite');eq(s.verifiedEpoch,s.verificationEpoch);eq(M.verificationCurrent(s),true);
if(s.route==='profile')s=M.apply(s,'PROFILE',{name:'Other'});eq(s.route,'ready');s=M.apply(s,'OPEN_DESTINATION');eq(s.route,'invite-reference');

// Replacement email verification rotates both local request and provider transaction identity.
s=M.initial();s=enterEmail(s,'sam@example.com');const first=proof(s),firstEvidence=emailEvidence(s);s=M.apply(s,'RESEND');const second=proof(s),secondEvidence=emailEvidence(s);ne(second.request,first.request);ok(second.challenge>first.challenge);eq(second.epoch,first.epoch);ne(secondEvidence.providerRequestId,firstEvidence.providerRequestId);s=M.apply(s,'VERIFY_CODE',resultFromEvidence(firstEvidence));eq(s.verified,false);eq(s.route,'email');

// Direct route/hash-equivalent protected navigation is fail-closed without a current proof.
s=M.initial();s.email='dev@example.com';s.method='email';s=M.apply(s,'NAVIGATE',{route:'ready'});eq(s.route,'email');s=M.apply(s,'NAVIGATE',{route:'home-reference'});eq(s.route,'email');s=M.apply(s,'NAVIGATE',{route:'profile'});eq(s.route,'email');

// Refresh/restart residue cannot resurrect a verified A proof after the restored current subject is B.
s=readyEmail('dev@example.com');let restored=JSON.parse(JSON.stringify(s));restored.email='other@example.com';restored.route='ready';restored=M.apply(restored,'NAVIGATE',{route:'ready'});eq(restored.route,'email');eq(M.verificationCurrent(restored),false);restored=M.apply(restored,'OPEN_DESTINATION');eq(restored.route,'email');eq(restored.verified,false);

// A copied verified authority record cannot be transplanted into a freshly-created restart epoch.
const oldAuthority=readyEmail('dev@example.com');let restarted=M.initial();const freshEpoch=restarted.verificationEpoch;Object.assign(restarted,{route:'ready',email:oldAuthority.email,method:oldAuthority.method,verified:true,verifiedSubject:oldAuthority.verifiedSubject,verifiedMethod:oldAuthority.verifiedMethod,verifiedRequest:oldAuthority.verifiedRequest,verifiedChallenge:oldAuthority.verifiedChallenge,verifiedDestination:oldAuthority.verifiedDestination,verifiedEpoch:oldAuthority.verifiedEpoch,request:oldAuthority.verifiedRequest,challenge:oldAuthority.verifiedChallenge,destination:oldAuthority.verifiedDestination});ne(freshEpoch,oldAuthority.verifiedEpoch);eq(M.verificationCurrent(restarted),false);restarted=M.apply(restarted,'NAVIGATE',{route:'ready'});eq(restarted.route,'email');

// Destination is navigation intent, not transferrable identity authority.
s=readyEmail('sam@example.com','invite');eq(s.verifiedDestination,'invite');let destinationSwap=JSON.parse(JSON.stringify(s));destinationSwap.destination='home';destinationSwap=M.apply(destinationSwap,'NAVIGATE',{route:'ready'});eq(destinationSwap.route,'email');eq(M.verificationCurrent(destinationSwap),false);

// Profile/presentation mutation preserves the same subject rather than rebinding it.
s=M.initial();s=M.apply(s,'INVITE');s=enterEmail(s,'sam@example.com');s=M.apply(s,'VERIFY_CODE',emailResult(s));const subjectBefore=s.verifiedSubject,requestBefore=s.verifiedRequest,epochBefore=s.verifiedEpoch;s=M.apply(s,'PROFILE',{name:'Sam Display'});eq(s.route,'ready');eq(s.name,'Sam Display');eq(s.verifiedSubject,subjectBefore);eq(s.verifiedRequest,requestBefore);eq(s.verifiedEpoch,epochBefore);eq(M.verificationCurrent(s),true);

// Wallet result identity is issued at request lifecycle time. Current pending state cannot manufacture it.
s=walletPending('home','Everyday');let walletIssued=walletEvidence(s);ok(walletIssued&&typeof walletIssued.providerRequestId==='string','wallet provider result identity issued before consumption');eq(walletIssued.request,s.pendingRequest);eq(walletIssued.challenge,0);eq(walletIssued.subject,'wallet:everyday');eq(walletIssued.destination,'home');eq(walletIssued.epoch,s.verificationEpoch);
const manufacturedWallet=M.walletApprovalResult(s,'approved');eq(Object.hasOwn(manufacturedWallet,'request'),false,'state is not provider evidence');let manufacturedAttempt=M.apply(s,'APPROVAL_RESULT',{request:s.pendingRequest,result:'approved'});eq(manufacturedAttempt.verified,false,'incomplete wallet result cannot synthesize current pending authority');eq(manufacturedAttempt.route,'approval-waiting');

// Wallet/account switch is the stronger sibling boundary; stale issued result for the first account is rejected.
s=M.apply(M.initial(),'INVITE');s=M.apply(s,'WALLET');s=M.apply(s,'REQUEST_APPROVAL',{account:'Everyday'});const walletOldEvidence=walletEvidence(s),walletOld=walletResultFromEvidence(walletOldEvidence);
s=M.apply(s,'REQUEST_APPROVAL',{account:'Travel'});const walletNewEvidence=walletEvidence(s),walletNew=walletResultFromEvidence(walletNewEvidence);ne(walletNew.request,walletOld.request);eq(walletNew.epoch,walletOld.epoch);eq(walletNew.subject,'wallet:travel');ne(walletNewEvidence.providerRequestId,walletOldEvidence.providerRequestId,'account switch rotates provider attempt identity');s=M.apply(s,'APPROVAL_RESULT',walletOld);eq(s.verified,false);eq(s.route,'approval-waiting');s=M.apply(s,'APPROVAL_RESULT',walletNew);eq(s.verified,true);eq(s.verifiedSubject,'wallet:travel');eq(s.verifiedEpoch,s.verificationEpoch);eq(M.verificationCurrent(s),true);
let switched=JSON.parse(JSON.stringify(s));switched.account='Everyday';switched=M.apply(switched,'NAVIGATE',{route:'ready'});eq(switched.route,'wallet');eq(M.verificationCurrent(switched),false);

// Cross-restart wallet replay: same subject + destination + local sequence still has a new epoch/request/provider attempt.
for(const destination of ['home','invite']){
 const s1=walletPending(destination);const e1=walletEvidence(s1),r1=walletResultFromEvidence(e1);let accepted=M.apply(s1,'APPROVAL_RESULT',r1);eq(accepted.verified,true,`S1 wallet proof valid for ${destination}`);
 let s2=walletPending(destination);const e2=walletEvidence(s2),r2=walletResultFromEvidence(e2);ne(e2.epoch,e1.epoch,`wallet ${destination} epoch differs after restart`);ne(e2.request,e1.request,`wallet ${destination} request identity differs after restart`);ne(e2.providerRequestId,e1.providerRequestId,`wallet ${destination} provider attempt differs after restart`);
 s2=M.apply(s2,'APPROVAL_RESULT',r1);eq(s2.verified,false,`stale S1 wallet result rejected for ${destination}`);eq(s2.route,'approval-waiting');
 s2=M.apply(s2,'APPROVAL_RESULT',r2);eq(s2.verified,true,`fresh S2 wallet result accepted for ${destination}`);eq(s2.verifiedEpoch,r2.epoch);
}

// Stale result ordering cannot relabel approved/declined/unknown onto the current S2 attempt.
for(const staleResult of ['approved','declined','unknown']){
 const s1=walletPending('home');const e1=walletEvidence(s1),stale=walletResultFromEvidence(e1,staleResult);
 let s2=walletPending('home');const e2=walletEvidence(s2);s2=M.apply(s2,'APPROVAL_RESULT',stale);eq(s2.route,'approval-waiting',`stale ${staleResult} leaves S2 waiting`);eq(s2.verified,false,`stale ${staleResult} mints zero S2 authority`);
 if(staleResult==='unknown'){s2=M.apply(s2,'APPROVAL_RESULT',walletResultFromEvidence(e2,'unknown'));eq(s2.route,'approval-unknown','fresh S2 unknown remains same attempt');s2=M.apply(s2,'APPROVAL_RESULT',walletResultFromEvidence(e2,'approved'));eq(s2.verified,true,'fresh approved after fresh unknown succeeds on same attempt');}
}

// Cancel is a request boundary: an old provider result cannot authorize a later request even for the same account.
s=walletPending('home');const beforeCancelEvidence=walletEvidence(s),beforeCancel=walletResultFromEvidence(beforeCancelEvidence);s=M.apply(s,'CANCEL_APPROVAL');eq(s.route,'wallet');s=M.apply(s,'REQUEST_APPROVAL',{account:'Everyday'});const afterCancelEvidence=walletEvidence(s),afterCancel=walletResultFromEvidence(afterCancelEvidence);ne(afterCancel.request,beforeCancel.request);ne(afterCancelEvidence.providerRequestId,beforeCancelEvidence.providerRequestId);s=M.apply(s,'APPROVAL_RESULT',beforeCancel);eq(s.verified,false);eq(s.route,'approval-waiting');s=M.apply(s,'APPROVAL_RESULT',afterCancel);eq(s.verified,true);

// Home -> Invite switch is a destination boundary. S1 Home result cannot inherit S2 Invite intent.
let homeS1=walletPending('home');const homeEvidence=walletEvidence(homeS1),homeResult=walletResultFromEvidence(homeEvidence);let inviteS2=walletPending('invite');const inviteEvidence=walletEvidence(inviteS2),inviteResult=walletResultFromEvidence(inviteEvidence);ne(inviteEvidence.destination,homeEvidence.destination);inviteS2=M.apply(inviteS2,'APPROVAL_RESULT',homeResult);eq(inviteS2.verified,false);eq(inviteS2.route,'approval-waiting');inviteS2=M.apply(inviteS2,'APPROVAL_RESULT',inviteResult);eq(inviteS2.verified,true);eq(inviteS2.verifiedDestination,'invite');

// Cross-restart email replay: provider evidence is fixed at S1 issuance; current S2 state cannot manufacture provider binding.
for(const destination of ['home','invite']){
 let s1=M.initial();if(destination==='invite')s1=M.apply(s1,'INVITE');s1=enterEmail(s1,'dev@example.com');const p1=proof(s1),e1=emailEvidence(s1),r1=resultFromEvidence(e1);let accepted=M.apply(s1,'VERIFY_CODE',r1);eq(accepted.verified,true,`S1 email provider result valid for ${destination}`);
 let s2=M.initial();if(destination==='invite')s2=M.apply(s2,'INVITE');s2=enterEmail(s2,'dev@example.com');const p2=proof(s2),e2=emailEvidence(s2),r2=resultFromEvidence(e2);ne(p2.epoch,p1.epoch,`email ${destination} epoch differs after restart`);ne(p2.request,p1.request,`email ${destination} request identity differs after restart`);eq(p2.challenge,p1.challenge,'challenge counter may repeat but cannot establish freshness');ne(e2.providerRequestId,e1.providerRequestId,`email ${destination} provider request identity differs after restart`);
 const manufactured=M.emailVerificationResult(s2,'123456');eq(Object.hasOwn(manufactured,'request'),false,`current S2 pending state cannot manufacture ${destination} provider binding`);const manufacturedAttempt=M.apply(s2,'VERIFY_CODE',manufactured);eq(manufacturedAttempt.verified,false,`manufactured ${destination} evidence rejected`);eq(manufacturedAttempt.route,'email');
 const replay=M.apply(s2,'VERIFY_CODE',r1);eq(replay.verified,false,`stale S1 email provider result rejected for ${destination}`);eq(replay.route,'email');
 const fresh=M.apply(s2,'VERIFY_CODE',r2);eq(fresh.verified,true,`fresh S2 email provider result accepted for ${destination}`);eq(fresh.verifiedEpoch,r2.epoch);
}

// START_OVER is a full reset boundary for both wallet and provider-bound email result delivery.
s=walletPending('home');const walletEvidenceBeforeReset=walletEvidence(s),beforeStartOver=walletResultFromEvidence(walletEvidenceBeforeReset);s=M.apply(s,'START_OVER');ne(s.verificationEpoch,beforeStartOver.epoch);s=M.apply(s,'WALLET');s=M.apply(s,'REQUEST_APPROVAL',{account:'Everyday'});const walletEvidenceAfterReset=walletEvidence(s),afterStartOver=walletResultFromEvidence(walletEvidenceAfterReset);ne(afterStartOver.request,beforeStartOver.request);ne(walletEvidenceAfterReset.providerRequestId,walletEvidenceBeforeReset.providerRequestId);s=M.apply(s,'APPROVAL_RESULT',beforeStartOver);eq(s.verified,false);s=M.apply(s,'APPROVAL_RESULT',afterStartOver);eq(s.verified,true);
s=enterEmail(M.initial(),'dev@example.com');const emailEvidenceBeforeReset=emailEvidence(s),emailBeforeReset=resultFromEvidence(emailEvidenceBeforeReset);s=M.apply(s,'START_OVER');s=enterEmail(s,'dev@example.com');const emailEvidenceAfterReset=emailEvidence(s),emailAfterReset=resultFromEvidence(emailEvidenceAfterReset);ne(emailAfterReset.epoch,emailBeforeReset.epoch);ne(emailAfterReset.request,emailBeforeReset.request);ne(emailEvidenceAfterReset.providerRequestId,emailEvidenceBeforeReset.providerRequestId);let staleAfterReset=M.apply(s,'VERIFY_CODE',emailBeforeReset);eq(staleAfterReset.verified,false);eq(staleAfterReset.route,'email');s=M.apply(s,'VERIFY_CODE',emailAfterReset);eq(s.verified,true);eq(s.verifiedEpoch,emailAfterReset.epoch);

// Returning-session expected identity remains a separate fail-closed check and keeps invite intent.
s=M.apply(M.initial(),'REAUTH',{destination:'invite'});s=enterEmail(s,'other@example.com');s=M.apply(s,'VERIFY_CODE',emailResult(s));eq(s.route,'wrong-account');eq(s.verified,false);eq(s.destination,'invite');

// No identity repair introduces join/payment authority; inherited J04/J27/J28 identity continuity stays bounded to the same verified subject/session.
s=readyEmail('sam@example.com','invite');eq(s.joined,false);eq(s.events.some(e=>/Payment|Joined/.test(e.type)),false);eq(s.verifiedDestination,'invite');eq(M.verificationCurrent(s),true);

console.log(JSON.stringify({ok:true,suite:'j01-subject-binding',checks}));
