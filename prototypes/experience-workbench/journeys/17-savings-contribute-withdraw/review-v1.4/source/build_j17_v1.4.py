from pathlib import Path
import hashlib

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'preserved/chopdot-j17-v1.3-visual-candidate.html'
OUT=ROOT/'candidates/chopdot-j17-v1.4-operation-continuity-candidate.html'
SOURCE_SHA='d2cf47381741d9825513ef805b3770c5c31d7436c171f6f5f3f0a92e7d031b97'

raw=SRC.read_bytes()
assert hashlib.sha256(raw).hexdigest()==SOURCE_SHA, 'Packaged V1.3 source drifted'
s=raw.decode('utf-8')
s=s.replace('ChopDot — Contribute / Withdraw Savings V1.3 visual review','ChopDot — Contribute / Withdraw Savings V1.4 operation continuity review',1)
s=s.replace('Savings — Contribute / Withdraw V1.3','Savings — Contribute / Withdraw V1.4',1)
s=s.replace('id="j17-v1-3-model"','id="j17-v1-4-model"',1)
start=s.index('<script id="j17-v1-4-model">')+len('<script id="j17-v1-4-model">')
end=s.index('</script>',start)
js=r'''
(()=>{'use strict';
const BASE_AVAILABLE=124000, BASE_POSITION=52000, GOAL=300000;
const STORAGE_KEY='chopdot-j17-v1.4-demo-unresolved-operation';
const fmt=n=>'CHF '+(n/100).toFixed(2); const pct=n=>Math.round(n/GOAL*100)+'%';
const parseMinor=value=>{const s=String(value??'').trim();if(!/^\d+(?:[.,]\d{0,2})?$/.test(s))return null;const [a,b='']=s.replace(',','.').split('.');const n=Number(a)*100+Number((b+'00').slice(0,2));return Number.isSafeInteger(n)?n:null;};
const state={available:BASE_AVAILABLE,position:BASE_POSITION,addMinor:18000,withdrawMinor:10000,op:null,seq:0};
const makeOp=(kind,minor)=>({id:'demo-savings-op-'+(++state.seq),kind,minor,currency:'CHF',group:'Alps House Fund',actor:'Dev',status:'pending'});
const validAdd=n=>Number.isInteger(n)&&n>0; const validWithdraw=n=>validAdd(n)&&n<=state.position&&n<=state.available;
const unresolvedStatuses=new Set(['waiting','unknown','checking']);
const unresolved=()=>!!(state.op&&unresolvedStatuses.has(state.op.status));
const validStoredOp=op=>!!(op&&/^demo-savings-op-\d+$/.test(op.id)&&['contribution','withdrawal'].includes(op.kind)&&Number.isInteger(op.minor)&&op.minor>0&&op.currency==='CHF'&&op.group==='Alps House Fund'&&op.actor==='Dev'&&unresolvedStatuses.has(op.status)&&!op.applied);
function persistUnresolved(){try{if(unresolved())localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,seq:state.seq,op:{id:state.op.id,kind:state.op.kind,minor:state.op.minor,currency:state.op.currency,group:state.op.group,actor:state.op.actor,status:state.op.status}}));else localStorage.removeItem(STORAGE_KEY);}catch{/* Browser storage is a prototype continuity cache, never payment authority. */}}
function hydrateUnresolved(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!saved||saved.version!==1||!validStoredOp(saved.op))return;state.op={...saved.op};const suffix=Number(saved.op.id.split('-').pop());state.seq=Math.max(Number.isInteger(saved.seq)?saved.seq:0,Number.isInteger(suffix)?suffix:0);if(saved.op.kind==='contribution')state.addMinor=saved.op.minor;else state.withdrawMinor=saved.op.minor;}catch{/* Fail closed: do not infer a result from malformed/unavailable storage. */}}
function unresolvedRoute(){if(!state.op)return'start';if(state.op.status==='waiting')return state.op.kind==='withdrawal'?'withdraw-pending':'add-sent';return state.op.status==='checking'?'unknown-still':'unknown';}
const sameScope=(op,kind,minor)=>!!(op&&op.kind===kind&&op.minor===minor&&op.currency==='CHF'&&op.group==='Alps House Fund'&&op.actor==='Dev');
const set=(sel,text)=>document.querySelectorAll(sel).forEach(e=>e.textContent=text);
function render(){
 set('[data-bind-current-available]',fmt(state.available));
 set('[data-bind-current-position]',fmt(state.position));
 set('[data-bind-current-progress-copy]',pct(state.available));
 const a=state.addMinor,w=state.withdrawMinor;
 set('[data-bind-start-available]',fmt(state.available));set('[data-bind-start-position]',fmt(state.position));set('[data-bind-start-goal]','Goal CHF 3000.00 · '+pct(state.available)+' complete');set('[data-bind-start-left]',fmt(Math.max(0,GOAL-state.available))+' left');const bar=document.querySelector('#start .progress>i');if(bar)bar.style.width=Math.min(100,state.available/GOAL*100)+'%';
 set('[data-bind-add-projected]',fmt(state.available+a));set('[data-bind-add-amount]',fmt(a));set('[data-bind-add-submit]','I added '+fmt(a));
 set('[data-bind-add-wait-copy]',fmt(a)+' is not Available yet');set('[data-bind-add-prepared]','Dev · '+fmt(a)+' · Alps House Fund');
 set('#add-sent [data-bind-add-amount]',fmt(a));set('[data-bind-add-complete-title]',fmt(a)+' added');set('[data-bind-add-confirmed-available]',fmt(state.op?.applied&&state.op?.kind==='contribution'?state.available:state.available+a));set('[data-bind-add-confirmed-position]',fmt(state.op?.applied&&state.op?.kind==='contribution'?state.position:state.position+a));set('[data-bind-add-progress]',pct(state.op?.applied&&state.op?.kind==='contribution'?state.available:state.available+a));set('[data-bind-add-failed]',fmt(a)+' was not added');set('#add-sent .summary-card .fact:nth-of-type(1) b',fmt(state.available));set('#withdraw-pending .summary-card .fact:nth-of-type(1) b',fmt(state.available));
 set('[data-bind-op-amount]',fmt(state.op?.minor??a));set('[data-bind-not-executed-title]','No '+fmt(state.op?.minor??a)+' '+(state.op?.kind==='withdrawal'?'withdrawal':'contribution')+' was executed');set('[data-bind-recovered-confirmed]',fmt(state.op?.minor??a)+' confirmed');document.querySelectorAll('#unknown .header-title b,#unknown-still .header-title b,#unknown-not-executed .header-title b').forEach(e=>e.textContent=state.op?.kind==='withdrawal'?'Withdrawal':'Contribution');const retry=document.querySelector('#unknown-not-executed [data-action="retry-original"]');if(retry)retry.textContent=state.op?.kind==='withdrawal'?'Retry withdrawal':'Retry contribution';
 set('[data-bind-withdraw-amount]',fmt(w));set('[data-bind-withdraw-projected]',fmt(state.available-w));set('[data-bind-withdraw-position-projected]',fmt(state.position-w));set('[data-bind-withdraw-wait-copy]',fmt(w)+' has not left Available yet');set('[data-bind-withdraw-complete-title]',fmt(w)+' withdrawn');set('[data-bind-withdraw-confirmed-available]',fmt(state.op?.applied&&state.op?.kind==='withdrawal'?state.available:state.available-w));set('[data-bind-withdraw-confirmed-position]',fmt(state.op?.applied&&state.op?.kind==='withdrawal'?state.position:state.position-w));set('[data-bind-withdraw-progress]',pct(state.op?.applied&&state.op?.kind==='withdrawal'?state.available:state.available-w));
 const banner=document.getElementById('unresolved-banner');if(banner){banner.hidden=!unresolved();banner.setAttribute('role','button');banner.tabIndex=unresolved()?0:-1;banner.dataset.action='resume-unresolved';}
}
function error(kind,msg){const sec=document.getElementById(kind),box=sec.querySelector('.amount-error'),wrap=sec.querySelector('.amount-input');box.textContent=msg;box.hidden=false;wrap.classList.add('invalid');}
function clearError(kind){const sec=document.getElementById(kind),box=sec.querySelector('.amount-error'),wrap=sec.querySelector('.amount-input');box.hidden=true;wrap.classList.remove('invalid');}
function take(kind){const id=kind==='add'?'addAmount':'withdrawAmount';const n=parseMinor(document.getElementById(id).value);if(kind==='add'&&!validAdd(n)){error(kind,'Enter an amount greater than CHF 0.00, with at most two decimals.');return false;}if(kind==='withdraw'&&!validWithdraw(n)){error(kind,n!=null&&n>state.position?'You can withdraw at most your confirmed position: '+fmt(state.position)+'.':'Enter an amount between CHF 0.01 and '+fmt(state.position)+'.');return false;}clearError(kind);state[kind==='add'?'addMinor':'withdrawMinor']=n;render();return true;}
function beginUnknown(){if(!state.op||state.op.status==='not-executed'||state.op.status==='confirmed')state.op=makeOp('contribution',state.addMinor);state.op.status='unknown';persistUnresolved();render();}
function applyConfirmed(){if(!state.op||state.op.applied)return;if(state.op.kind==='contribution'){state.available+=state.op.minor;state.position+=state.op.minor;}else{state.available-=state.op.minor;state.position-=state.op.minor;}state.op.applied=true;state.op.status='confirmed';persistUnresolved();render();}
function route(id){location.hash=id;}
function submitOperation(kind,minor){
 if(unresolved()){route(unresolvedRoute());return false;}
 if(state.op&&state.op.status==='retry-safe'&&sameScope(state.op,kind,minor)){state.op.status='waiting';state.op.retryCount=(state.op.retryCount||0)+1;persistUnresolved();render();return true;}
 state.op=makeOp(kind,minor);state.op.status='waiting';persistUnresolved();render();return true;
}
function resumeUnresolved(){if(!unresolved())return false;route(unresolvedRoute());return true;}
hydrateUnresolved();
addEventListener('click',e=>{
 const banner=e.target.closest('#unresolved-banner[data-action="resume-unresolved"]');if(banner){e.preventDefault();resumeUnresolved();return;}
 const b=e.target.closest('button[data-set]');if(b){if(unresolved()){e.preventDefault();resumeUnresolved();return;}const input=document.getElementById(b.dataset.input);if(input){input.value=b.dataset.set;take(input.id==='addAmount'?'add':'withdraw');}return;}
 const a=e.target.closest('a[href^="#"]');if(!a)return;const from=location.hash.slice(1)||'start',to=a.getAttribute('href').slice(1),act=a.dataset.action;
 if(unresolved()&&['add','add-review','withdraw','withdraw-review'].includes(to)){e.preventDefault();resumeUnresolved();return;}
 if(from==='add'&&to==='add-review'){if(!take('add')){e.preventDefault();return;}}
 if(from==='withdraw'&&to==='withdraw-review'){if(!take('withdraw')){e.preventDefault();return;}}
 if(from==='add-review'&&to==='add-sent'){e.preventDefault();if(submitOperation('contribution',state.addMinor))route('add-sent');return;}
 if(from==='withdraw-review'&&to==='withdraw-pending'){e.preventDefault();if(submitOperation('withdrawal',state.withdrawMinor))route('withdraw-pending');return;}
 if(act==='demo-unknown'){beginUnknown();}
 if(act==='check-original'){e.preventDefault();if(!state.op)beginUnknown();state.op.status='checking';persistUnresolved();render();route('unknown-still');}
 if(act==='service-confirmed'){e.preventDefault();if(!state.op)beginUnknown();applyConfirmed();render();route(state.op.kind==='withdrawal'?'withdraw-complete':'unknown-confirmed');}
 if(act==='service-not-executed'){e.preventDefault();if(!state.op)beginUnknown();state.op.status='not-executed';persistUnresolved();render();route('unknown-not-executed');}
 if(act==='retry-original'){e.preventDefault();if(!state.op||state.op.status!=='not-executed')return;if(state.op.kind==='withdrawal')state.withdrawMinor=state.op.minor;else state.addMinor=state.op.minor;state.op.status='retry-safe';persistUnresolved();render();route(state.op.kind==='withdrawal'?'withdraw-review':'add-review');}
 if(act==='leave-unresolved'){persistUnresolved();render();}
 if(from==='demo'&&to==='add-complete'){state.op=makeOp('contribution',state.addMinor);applyConfirmed();}
 if(from==='demo'&&to==='withdraw-complete'){state.op=makeOp('withdrawal',state.withdrawMinor);applyConfirmed();}
});
addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target?.matches?.('#unresolved-banner[data-action="resume-unresolved"]')){e.preventDefault();resumeUnresolved();}});
addEventListener('input',e=>{if(e.target.id==='addAmount'){if(unresolved()){e.target.value=(state.addMinor/100).toFixed(2);resumeUnresolved();return;}take('add');}if(e.target.id==='withdrawAmount'){if(unresolved()){e.target.value=(state.withdrawMinor/100).toFixed(2);resumeUnresolved();return;}take('withdraw');}});
addEventListener('hashchange',()=>{const id=location.hash.slice(1);if(unresolved()&&['add','add-review','withdraw','withdraw-review'].includes(id)){route(unresolvedRoute());return;}if(state.op&&['unknown','checking'].includes(state.op.status)&&id==='unknown-not-executed'){route('unknown-still');return;}render();});
window.J17Continuity={state,parseMinor,validAdd,validWithdraw,beginUnknown,resumeUnresolved,serviceResult(v){if(!state.op)beginUnknown();if(v==='unknown'){state.op.status='unknown';persistUnresolved();route('unknown-still');}else if(v==='confirmed'){applyConfirmed();route(state.op.kind==='withdrawal'?'withdraw-complete':'unknown-confirmed');}else if(v==='not-executed'){state.op.status='not-executed';persistUnresolved();route('unknown-not-executed');}render();},operation:()=>state.op?JSON.parse(JSON.stringify(state.op)):null,storageKey:STORAGE_KEY};
render();})();
'''
s=s[:start]+js+s[end:]
OUT.write_text(s,encoding='utf-8',newline='')
print(hashlib.sha256(OUT.read_bytes()).hexdigest())
