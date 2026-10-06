// Local prototype adapter for approved J03/J04 + GUEST-01. No real auth or invitations.
export const KEY='chopdot.preview-v2.guest';
export const fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
export const member=(s,id)=>s.people?.find(p=>p.id===id&&p.identity);
export const online=s=>!['gateB','gateC','gateD'].some(k=>s[k]?.environment?.offline)&&!s.membership?.environment?.offline;
export function upgrade(input){
 const s=structuredClone(input||{});s.people||=[];s.expenses||=[];s.groups||=[];
 if(s.group&&!s.groups.some(g=>g.id===s.group.id))s.groups.push(structuredClone(s.group));
 s.membership||={version:1,sequence:0,invitations:[],operations:{},history:[],environment:{},creation:null};return s;
}
export function groupMembers(s,g=s.group){return [{id:'self',name:'You'},...(s.people||[]).filter(p=>p.groupId===g?.id||(!p.groupId&&!g?.membershipManaged))];}
export function inviteContext(s,id){const i=s.membership?.invitations.find(i=>i.id===id);if(!i)fail('INVITE','This invitation is unavailable. Ask for a new one.');const g=s.groups.find(g=>g.id===i.groupId)||s.group;return {id:i.id,groupId:g.id,name:g.name,currency:g.currency,inviter:i.inviterName,people:groupMembers(s,g).length,status:i.status};}
export function assertOwner(s,actor){if(actor!=='self'||(s.group?.ownerId||'self')!=='self'||s.gateD?.session?.status!=='active')fail('ACCOUNT','Sign in through Entry to invite people. Guest ledger participation remains available.');}
function requireMember(s,c,verify){const p=member(s,c.actor);if(!p||p.groupId!==s.group?.id)fail('PARTICIPANT','Reopen your joined group.');if(!verify?.(s,c,p))fail('GUEST_PROOF','Current participant proof is required. Recover your existing participant; saved labels do not grant authority.');return p;}
export function transition(input,c,authority='user',verify,now=new Date().toISOString()){
 const s=upgrade(input),m=s.membership;if(!c.operationId)fail('IDENTITY','Keep the operation identity.');
 const fingerprint=JSON.stringify(c);const prior=m.operations[c.operationId];if(prior){if(prior!==fingerprint)fail('IDENTITY','This operation identity belongs to another change.');return s;}
 if(c.type==='create'){
  if(!c.id||s.groups.some(g=>g.id===c.id))fail('IDENTITY','This group identity already exists.');
  if(typeof c.name!=='string'||!c.name.trim()||c.name.trim().length>80)fail('NAME','Name the group (1–80 characters).');
  if(!['CHF','EUR','USD'].includes(c.currency))fail('CURRENCY','Choose CHF, EUR or USD. Other currencies remain an approved future handoff.');
  if(m.environment.failCreate)fail('SAVE','Couldn’t create the group. Your details are still here.');
  const g={id:c.id,name:c.name.trim(),currency:c.currency,ownerId:'self',shared:false,localOnly:true,membershipManaged:true};s.groups.push(g);s.group=structuredClone(g);m.creation=null;
  // Activate existing group-keyed draft rules before selecting another group.
  if(s.gateB&&s.gateB.draftStorageVersion!==2){s.gateB.drafts=Object.fromEntries(Object.entries(s.gateB.drafts).map(([actor,d])=>[JSON.stringify([actor,d.groupId||input.group?.id]),{...d,groupId:d.groupId||input.group?.id}]));s.gateB.draftStorageVersion=2;}
  s.gateC||={version:1,sequence:0,payments:[],operations:{},history:[],drafts:{},environment:{}};
 }else if(c.type==='invite'){
  assertOwner(s,c.actor);if(!online(s))fail('OFFLINE','Reconnect before sharing an invitation.');if(!c.id||m.invitations.some(i=>i.id===c.id))fail('IDENTITY','Keep the invitation identity.');
  if(typeof c.name!=='string'||!c.name.trim()||c.name.trim().length>60)fail('NAME','Use a name between 1 and 60 characters.');
  m.invitations.push({id:c.id,groupId:s.group.id,inviterId:'self',inviterName:s.gateD.account.displayName==='You'?'Group owner':s.gateD.account.displayName||'Group owner',name:c.name.trim(),kind:c.kind==='group-link'?'group-link':'person',redemptions:[],status:'pending',createdAt:now});
 }else if(c.type==='join'){
  if(!online(s))fail('OFFLINE','View the invite now. Join when you’re back online.');
  const i=m.invitations.find(i=>i.id===c.inviteId);if(!i||i.status!=='pending')fail('INVITE','This invite is expired or already used.');
  if(c.consent!==true)fail('CONSENT','Review and explicitly confirm joining first.');
  if(!c.participantId?.startsWith(i.groupId+':p_')||s.people.some(p=>p.id===c.participantId))fail('IDENTITY','A distinct group-scoped participant identity is required.');
  if(!['guest','account_backed'].includes(c.identity))fail('ACCOUNT','Choose a supported joining identity.');
  if(c.identity==='account_backed'&&(authority!=='entry-verified'||!c.evidence||['accountProof','activation','durableBinding','readback'].some(k=>c.evidence[k]!==true)))fail('ACCOUNT','Verified Entry, binding, policy and readback are required for account-backed joining.');
  const g=s.groups.find(g=>g.id===i.groupId);if(!g)fail('GROUP','This group is unavailable.');s.group=structuredClone(g);
  const p={id:c.participantId,groupId:g.id,name:i.name,identity:c.identity==='account_backed'?'linked':'guest',capabilityVersion:1,policyVersion:1};s.people.push(p);i.redemptions||=[];i.redemptions.push(p.id);if(i.kind!=='group-link')i.status='joined';i.participantId=p.id;
 }else if(c.type==='link'){
  const p=requireMember(s,c,verify);if(!online(s))fail('OFFLINE','Reconnect before linking.');if(p.identity==='linked')fail('LINKED','This participant is already linked.');
  if(p.link&&['pending','unknown'].includes(p.link.status))fail('PENDING','Reconcile the same link operation before trying again.');
  if(!c.linkId)fail('IDENTITY','Keep the link operation identity.');p.link={id:c.linkId,status:'prepared',participantId:p.id};
 }else if(c.type==='link-result'){
  const p=requireMember(s,c,verify);if(authority!=='prototype-fixture')fail('AUTHORITY','An explicit external-precondition fixture is required; this prototype has no real account binding.');
  if(!online(s))fail('OFFLINE','Reconnect before reconciling.');const l=p.link;if(!l||l.id!==c.linkId||l.participantId!==p.id)fail('IDENTITY','Reconcile the same participant and link.');
  const from=l.status,r=c.result;
  if(r==='matched'&&from==='prepared')l.status='pending';
  else if(r==='mismatch'&&from==='prepared')l.status='mismatch';
  else if(r==='cancelled'&&from==='prepared')l.status='cancelled';
  else if(r==='unknown'&&from==='pending')l.status='unknown';
  else if(r==='no-effect'&&['pending','unknown'].includes(from))l.status='no-effect';
  else if(r==='known-pre-effect-failed'&&from==='pending')l.status='known-pre-effect-failed';
  else if(r==='linked'&&['pending','unknown'].includes(from)){
   if(!c.evidence||['accountProof','activation','durableBinding','readback'].some(k=>c.evidence[k]!==true))fail('READBACK','Activation, exact binding and authoritative readback are all required.');l.status='linked';p.identity='linked';
  }else fail('STATE','This result does not match the current link state.');
 }else if(c.type==='rotate'){
  const p=member(s,c.actor);if(!p||p.groupId!==s.group?.id||authority!=='prototype-fixture')fail('AUTHORITY','Use the explicit recovery proof fixture for the same participant.');p.capabilityVersion++;
 }else if(c.type==='expire'){
  assertOwner(s,c.actor);const i=m.invitations.find(i=>i.id===c.inviteId&&i.groupId===s.group.id);if(!i||i.status!=='pending')fail('INVITE','Only a pending invite can expire.');if(authority!=='prototype-fixture')fail('AUTHORITY','Use the expiry precondition fixture.');i.status='expired';
 }else fail('COMMAND','Unknown membership command.');
 m.operations[c.operationId]=fingerprint;m.sequence++;m.history.push({operationId:c.operationId,type:c.type,actor:c.actor||null,participantId:c.participantId||null,at:now});return s;
}
export function repository(storage,assertWriter=()=>{},verify){const read=()=>upgrade(JSON.parse(storage.getItem(KEY)||'null'));return {read,selectJoinedGroup(id){assertWriter();const s=read(),p=member(s,id),g=s.groups.find(g=>g.id===p?.groupId);if(!g)fail('GROUP','Your joined group is unavailable.');s.group=structuredClone(g);storage.setItem(KEY,JSON.stringify(s));return s;},commit(c,a){assertWriter();const s=transition(read(),c,a,verify);storage.setItem(KEY,JSON.stringify(s));return s;},saveCreation(d){assertWriter();const s=read();s.membership.creation=structuredClone(d);storage.setItem(KEY,JSON.stringify(s));},fixture(patch){assertWriter();const s=read();Object.assign(s.membership.environment,patch);storage.setItem(KEY,JSON.stringify(s));}};}
