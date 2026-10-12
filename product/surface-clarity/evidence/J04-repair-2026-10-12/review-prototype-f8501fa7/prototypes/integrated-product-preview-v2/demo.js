import {upgrade,restoreRecoveredDraft,recoverableDrafts} from './gate-b/model.js';
import {currentActor} from './create-join/authority.js';
import {requirePrototypeWriter,assertPrototypeWriter} from './prototype-writer.js';
await requirePrototypeWriter();
const confirm = document.querySelector('#confirm-reset'), reset = document.querySelector('#reset');
confirm.addEventListener('change',()=>{reset.disabled=!confirm.checked;});
reset.addEventListener('click',()=>{
 if(!confirm.checked)return;
 assertPrototypeWriter();
 // Only the canonical prototype record and this tab's prototype session keys.
 // Never clear the origin's storage or seed a second outcome store.
 localStorage.removeItem('chopdot.preview-v2.guest');
 const prefixes=['chopdot.preview-v2.','chopdot.gate-b.','chopdot.gate-c.','chopdot.gate-d.','chopdot.membership.','chopdot.creation.'];
 for(const key of Object.keys(sessionStorage))if(prefixes.some(prefix=>key.startsWith(prefix)))sessionStorage.removeItem(key);
 confirm.checked=false;reset.disabled=true;renderRecoveredDrafts();
 document.querySelector('#reset-result').textContent='Local prototype data deleted. Open the prototype to start fresh.';
});

function renderRecoveredDrafts(){
 const s=upgrade(JSON.parse(localStorage.getItem('chopdot.preview-v2.guest')||'{}'));
 const rows=recoverableDrafts(s,'self');
 const section=document.querySelector('#recovered-drafts'),list=document.querySelector('#draft-list');list.replaceChildren();
 section.hidden=!rows.length||currentActor()!=='self';
 for(const row of rows){const button=document.createElement('button');button.textContent='Use recovered draft: '+(row.draft.description||'Untitled expense')+' · '+row.draft.amountText;
 button.onclick=()=>{try{assertPrototypeWriter();if(currentActor()!=='self')throw Error('Return to your own Participant first.');const latest=upgrade(JSON.parse(localStorage.getItem('chopdot.preview-v2.guest')||'{}'));restoreRecoveredDraft(latest,'self',row.draft.id);localStorage.setItem('chopdot.preview-v2.guest',JSON.stringify(latest));location.href='./index.html?gateB=1&gateBRoute='+encodeURIComponent('#page=editor');}catch(error){document.querySelector('#reset-result').textContent=error.message;}};list.append(button);}
}
renderRecoveredDrafts();
