const assert=require('node:assert/strict');const M=require('./model.cjs');let n=0;
function eq(a,b){assert.deepEqual(a,b);n++;}
let s=M.initial();eq(s.verified,false);eq(M.apply(s,'NAVIGATE',{route:'ready'}).route,'welcome');eq(M.apply(s,'VERIFY_CODE',{code:'123456'}).verified,false);
s=M.apply(s,'INVITE');s=M.apply(s,'EMAIL');s=M.apply(s,'SET_EMAIL',{value:'bad'});s=M.apply(s,'SEND_CODE');eq(s.route,'email');eq(s.error,'Enter a valid email address.');
s=M.apply(s,'SET_EMAIL',{value:'sam@example.com'});s=M.apply(s,'SEND_CODE');eq(s.route,'code');eq(s.destination,'invite');
s=M.apply(s,'VERIFY_CODE',{code:'000000'});eq(s.verified,false);eq(s.route,'code');s.expired=true;s=M.apply(s,'VERIFY_CODE',{code:'123456'});eq(s.verified,false);
s=M.apply(s,'RESEND');eq(s.expired,false);eq(s.challenge,2);s=M.apply(s,'VERIFY_CODE',{code:'123456'});eq(s.verified,true);eq(s.route,'profile');eq(s.joined,false);
s=M.apply(s,'PROFILE',{name:'Sam'});eq(s.route,'ready');eq(s.name,'Sam');s=M.apply(s,'OPEN_DESTINATION');eq(s.route,'invite-reference');eq(s.destination,'invite');eq(s.joined,false);
s=M.apply(M.initial(),'REAUTH',{destination:'invite'});s=M.apply(s,'EMAIL');s=M.apply(s,'SET_EMAIL',{value:'other@example.com'});s=M.apply(s,'SEND_CODE');s=M.apply(s,'VERIFY_CODE',{code:'123456'});eq(s.route,'wrong-account');eq(s.verified,false);eq(s.destination,'invite');
s=M.apply(s,'BACK_TO_EMAIL');s=M.apply(s,'SET_EMAIL',{value:'dev@example.com'});s=M.apply(s,'SEND_CODE');s=M.apply(s,'VERIFY_CODE',{code:'123456'});eq(s.route,'ready');eq(s.isNew,false);
s=M.apply(M.apply(M.initial(),'INVITE'),'WALLET');s=M.apply(s,'REQUEST_APPROVAL',{account:'Everyday'});eq(s.verified,false);eq(s.approval,'waiting');let request=s.request;
s=M.apply(s,'REFRESH_APPROVAL');eq(s.verified,false);eq(s.request,request);s=M.apply(s,'APPROVAL_RESULT',{request,result:'unknown'});eq(s.route,'approval-unknown');
s=M.apply(s,'REFRESH_APPROVAL');eq(s.route,'approval-unknown');eq(s.verified,false);s=M.apply(s,'CANCEL_APPROVAL');s=M.apply(s,'APPROVAL_RESULT',{request,result:'approved'});eq(s.verified,false);
s=M.apply(s,'REQUEST_APPROVAL',{account:'Everyday'});s=M.apply(s,'APPROVAL_RESULT',{request:s.request,result:'approved'});eq(s.route,'ready');eq(s.destination,'invite');eq(s.verified,true);
s=M.apply(s,'EMAIL');eq(s.verified,false);
s=M.apply(M.initial(),'INVITE');s.online=false;s.email='sam@example.com';s=M.apply(s,'SEND_CODE');eq(s.route,'offline');eq(s.destination,'invite');s=M.apply(s,'RETRY_CONNECTION');eq(s.route,'offline');s.online=true;s=M.apply(s,'RETRY_CONNECTION');eq(s.route,'email');eq(s.destination,'invite');
eq(s.events.some(x=>/Payment|Joined/.test(x.type)),false);console.log(JSON.stringify({ok:true,checks:n}));
