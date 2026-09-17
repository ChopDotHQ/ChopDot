const assert=require('node:assert/strict');
const M=require('./model.cjs');
let checks=0;
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++};
const ok=(v,m)=>{assert.ok(v,m);checks++};
const proof=s=>({request:s.pendingRequest,challenge:s.pendingChallenge,subject:s.pendingSubject,destination:s.pendingDestination});
const enterEmail=(s,email)=>{s=M.apply(s,'EMAIL');s=M.apply(s,'SET_EMAIL',{value:email});return M.apply(s,'SEND_CODE')};
const verify=(s,code='123456',binding=proof(s))=>M.apply(s,'VERIFY_CODE',{code,...binding});
const readyEmail=(email='dev@example.com',destination='home')=>{
 let s=M.initial();if(destination==='invite')s=M.apply(s,'INVITE');s=enterEmail(s,email);s=verify(s);
 if(s.route==='profile')s=M.apply(s,'PROFILE',{name:'Sam'});return s;
};

// Baseline subject-bound success.
let s=readyEmail();
eq(s.route,'ready');eq(s.verified,true);eq(s.verifiedSubject,'email:dev@example.com');eq(M.verificationCurrent(s),true);
let session=s.events.findLast(e=>e.type==='SessionVerified');eq(session.subject,'email:dev@example.com');eq(session.request,s.verifiedRequest);eq(session.destination,'home');

// Normalization is part of the identity subject; cosmetic case/space changes do not create a new subject.
s=readyEmail(' Dev@Example.com ');const req=s.request;eq(s.verifiedSubject,'email:dev@example.com');s=M.apply(s,'NAVIGATE',{route:'email'});s=M.apply(s,'SET_EMAIL',{value:'dev@example.com'});eq(s.request,req);eq(s.verified,true);eq(M.verificationCurrent(s),true);

// Reviewer defect: verified A -> browser/history email -> mutate to B -> forward Ready must fail closed.
s=readyEmail('dev@example.com','invite');const verifiedA={subject:s.verifiedSubject,request:s.verifiedRequest,challenge:s.verifiedChallenge,destination:s.verifiedDestination};
s=M.apply(s,'NAVIGATE',{route:'email'});eq(s.route,'email');eq(s.verified,true);
s=M.apply(s,'SET_EMAIL',{value:'other@example.com'});eq(s.email,'other@example.com');eq(s.verified,false);eq(s.verifiedSubject,null);eq(s.pendingSubject,null);eq(s.destination,'invite');ok(s.request>verifiedA.request,'subject mutation rotates request');
s=M.apply(s,'NAVIGATE',{route:'ready'});eq(s.route,'email');eq(M.verificationCurrent(s),false);
s=M.apply(s,'NAVIGATE',{route:'invite-reference'});eq(s.route,'email');

// Stale prior-subject result cannot authorize B even if a caller replays the old request tuple.
s=M.apply(s,'NAVIGATE',{route:'code'});s=M.apply(s,'VERIFY_CODE',{code:'123456',request:verifiedA.request,challenge:verifiedA.challenge,subject:verifiedA.subject,destination:verifiedA.destination});eq(s.verified,false);eq(s.route,'email');

// Fresh B request is required and binds a new proof epoch.
s=M.apply(s,'SEND_CODE');let b=proof(s);eq(b.subject,'email:other@example.com');eq(b.destination,'invite');ok(b.request>verifiedA.request);ok(b.challenge>verifiedA.challenge);
s=verify(s);eq(s.verified,true);eq(s.verifiedSubject,'email:other@example.com');eq(s.verifiedDestination,'invite');eq(M.verificationCurrent(s),true);
if(s.route==='profile')s=M.apply(s,'PROFILE',{name:'Other'});eq(s.route,'ready');s=M.apply(s,'OPEN_DESTINATION');eq(s.route,'invite-reference');

// Replacement verification rotates the epoch; old result cannot complete the replacement.
s=M.initial();s=enterEmail(s,'sam@example.com');const first=proof(s);s=M.apply(s,'RESEND');const second=proof(s);ok(second.request>first.request);ok(second.challenge>first.challenge);s=M.apply(s,'VERIFY_CODE',{code:'123456',...first});eq(s.verified,false);eq(s.route,'email');

// Direct route/hash-equivalent protected navigation is fail-closed without a current proof.
s=M.initial();s.email='dev@example.com';s.method='email';s=M.apply(s,'NAVIGATE',{route:'ready'});eq(s.route,'email');s=M.apply(s,'NAVIGATE',{route:'home-reference'});eq(s.route,'email');s=M.apply(s,'NAVIGATE',{route:'profile'});eq(s.route,'email');

// Refresh/restart residue cannot resurrect a verified A proof after the restored current subject is B.
s=readyEmail('dev@example.com');let restored=JSON.parse(JSON.stringify(s));restored.email='other@example.com';restored.route='ready';restored=M.apply(restored,'NAVIGATE',{route:'ready'});eq(restored.route,'email');eq(M.verificationCurrent(restored),false);restored=M.apply(restored,'OPEN_DESTINATION');eq(restored.route,'email');eq(restored.verified,false);

// Destination is navigation intent, not transferrable identity authority.
s=readyEmail('sam@example.com','invite');eq(s.verifiedDestination,'invite');let destinationSwap=JSON.parse(JSON.stringify(s));destinationSwap.destination='home';destinationSwap=M.apply(destinationSwap,'NAVIGATE',{route:'ready'});eq(destinationSwap.route,'email');eq(M.verificationCurrent(destinationSwap),false);

// Profile/presentation mutation preserves the same subject rather than rebinding it.
s=M.initial();s=M.apply(s,'INVITE');s=enterEmail(s,'sam@example.com');s=verify(s);const subjectBefore=s.verifiedSubject,requestBefore=s.verifiedRequest;s=M.apply(s,'PROFILE',{name:'Sam Display'});eq(s.route,'ready');eq(s.name,'Sam Display');eq(s.verifiedSubject,subjectBefore);eq(s.verifiedRequest,requestBefore);eq(M.verificationCurrent(s),true);

// Wallet/account switch is the stronger sibling boundary; stale approval for the first account is rejected.
s=M.apply(M.initial(),'INVITE');s=M.apply(s,'WALLET');s=M.apply(s,'REQUEST_APPROVAL',{account:'Everyday'});const walletOld={request:s.pendingRequest,subject:s.pendingSubject,destination:s.pendingDestination};s=M.apply(s,'REQUEST_APPROVAL',{account:'Travel'});const walletNew={request:s.pendingRequest,subject:s.pendingSubject,destination:s.pendingDestination};ok(walletNew.request>walletOld.request);eq(walletNew.subject,'wallet:travel');s=M.apply(s,'APPROVAL_RESULT',{result:'approved',...walletOld});eq(s.verified,false);eq(s.route,'approval-waiting');s=M.apply(s,'APPROVAL_RESULT',{result:'approved',...walletNew});eq(s.verified,true);eq(s.verifiedSubject,'wallet:travel');eq(M.verificationCurrent(s),true);
let switched=JSON.parse(JSON.stringify(s));switched.account='Everyday';switched=M.apply(switched,'NAVIGATE',{route:'ready'});eq(switched.route,'wallet');eq(M.verificationCurrent(switched),false);

// Returning-session expected identity remains a separate fail-closed check and keeps invite intent.
s=M.apply(M.initial(),'REAUTH',{destination:'invite'});s=enterEmail(s,'other@example.com');s=verify(s);eq(s.route,'wrong-account');eq(s.verified,false);eq(s.destination,'invite');

// No identity repair introduces join/payment authority.
s=readyEmail('sam@example.com','invite');eq(s.joined,false);eq(s.events.some(e=>/Payment|Joined/.test(e.type)),false);

console.log(JSON.stringify({ok:true,suite:'j01-subject-binding',checks}));
