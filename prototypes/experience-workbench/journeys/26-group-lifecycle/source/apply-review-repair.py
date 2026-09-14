from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
J = ROOT / 'prototypes/experience-workbench/journeys/26-group-lifecycle'
html_path = J / 'v1-candidate.html'
qa_path = J / 'source/review-qa-v1.mjs'

html = html_path.read_text()
qa = qa_path.read_text()

def rep(text, old, new, label, count=None):
    found = text.count(old)
    expected = 1 if count is None else count
    if found != expected:
        raise SystemExit(f'{label}: expected {expected} matches, found {found}')
    return text.replace(old, new)

html = rep(html, "A('Demo: accepted','rename-success','accent')", "A('Demo: accepted','rename-success','accent',{name:'renamed'})", 'rename accepted links', 2)
html = rep(html, "A('Demo: accepted','config-success','accent')", "A('Demo: accepted','config-success','accent',{currency:'EUR'})", 'config accepted links', 2)
html = rep(html, "A('Demo: accepted','transfer-success','accent',{role:'member'})", "A('Demo: accepted','transfer-success','accent',{role:'member',owner:'jeanine'})", 'transfer accepted link')
html = rep(html, "A('Demo: Jeanine is owner','transfer-success','accent',{role:'member'})", "A('Demo: Jeanine is owner','transfer-success','accent',{role:'member',owner:'jeanine'})", 'transfer reconcile accepted link')
html = rep(html, "A('Continue as member','settings-overview-member','accent',{role:'member'}),A('Return to Group Home','group-home-boundary','ghost',{role:'member'})", "A('Continue as member','settings-overview-member','accent',{role:'member',owner:'jeanine'}),A('Return to Group Home','group-home-boundary','ghost',{role:'member',owner:'jeanine'})", 'transfer success continuation')
html = rep(html, "A('Demo: accepted','left-group','accent',{role:'member'})", "A('Demo: accepted','left-group','accent',{role:'member',terminal:'left'})", 'leave accepted link')
html = rep(html, "A('Demo: leave accepted','left-group','accent',{role:'member'})", "A('Demo: leave accepted','left-group','accent',{role:'member',terminal:'left'})", 'leave reconcile accepted link')
html = rep(html, "A('Demo: accepted','deleted','accent')", "A('Demo: accepted','deleted','accent',{terminal:'deleted'})", 'delete accepted link')
html = rep(html, "A('Demo: deleted','deleted','accent')", "A('Demo: deleted','deleted','accent',{terminal:'deleted'})", 'delete reconcile accepted link')
old_delete_actions = "[A('All prerequisites met','delete-type-confirm','danger'),A('Demo: active members remain','delete-blocked-active-members','ghost'),A('Demo: open items remain','delete-blocked-open-items','ghost'),A('Cancel','archived','link')]"
new_delete_actions = "[A('Manage members first','manage-people-boundary','ghost',{return:'delete'}),A('Resolve open items','money-resolution-boundary','ghost',{return:'delete'}),A('Cancel','archived','link')]"
html = rep(html, old_delete_actions, new_delete_actions, 'delete review actions')

marker = "const BOUNDARIES=new Set(['group-home-boundary','manage-people-boundary','money-resolution-boundary','home-boundary','recovery-boundary']);"
start = html.find(marker)
end_marker = "window.J26_DEFS=D;window.J26_ROOTS=ROOTS;window.J26_BOUNDARIES=[...BOUNDARIES];window.J26_GROUP=GROUP;window.addEventListener('hashchange',render);render();"
end = html.find(end_marker)
if start < 0 or end < 0:
    raise SystemExit('runtime replacement markers missing')
end += len(end_marker)

runtime = r'''const BOUNDARIES=new Set(['group-home-boundary','manage-people-boundary','money-resolution-boundary','home-boundary','recovery-boundary']);
const ROOTS=['settings-entry-owner','settings-entry-member'];
const DELETE_GUARDED=new Set(['delete-type-confirm','delete-mismatch','delete-final-review','deleting','delete-cancelled','delete-failed','delete-unknown','delete-reconciling','delete-no-effect-retry','deleted']);
const roleFor=id=>D[id]?.role||'owner';
function hrefFor(to,q={}){const u=new URL(location.href);for(const [k,v] of Object.entries(q||{})){if(v===null||v===undefined||v==='')u.searchParams.delete(k);else u.searchParams.set(k,v)}if(!u.searchParams.get('role'))u.searchParams.set('role',roleFor(to));u.hash=to;return `${u.search}${u.hash}`}
function actionHtml(a,i){if(!a)return'';return `<a data-test-action="${i}" data-to="${a.to}" class="btn ${a.kind||'primary'}" href="${hrefFor(a.to,a.q)}">${a.label}</a>`}
function iconFor(s){if(s.status==='progress')return'<div class="spinner" aria-label="In progress"></div>';if(s.status==='success')return'✓';if(s.status==='warn')return'!';if(s.status==='danger')return'×';if(s.status==='boundary')return'↗';return'•'}
function fixtureFacts(params){
  const name=params.get('name')==='renamed'?'Zurich Long Weekend':params.get('name')==='conflict'?'Zurich Weekenders':GROUP;
  const currency=params.get('currency')||'CHF';
  const owner=params.get('owner')==='jeanine'?'Jeanine':'Dev fixture';
  const members=params.get('members')==='1'?1:4;
  const open=params.get('open')==='0'?0:1;
  return {name,currency,owner,members,open,eligibleDelete:members===1&&open===0};
}
function cloneView(d){return {...d,facts:(d.facts||[]).map(x=>[...x]),actions:[...(d.actions||[])]}}
function viewFor(id,d,params,role){
  const fx=fixtureFacts(params),v=cloneView(d);
  if(id==='settings-entry-owner'){v.title=`Manage ${fx.name}`;v.facts=[F('Your role','Owner'),F('Group status','Active'),F('Current name',fx.name),F('Future expense default',fx.currency)]}
  if(id==='settings-entry-member'){v.facts=[F('Your role','Member'),F('Group status','Active'),F('Current name',fx.name),F('Open items involving you',fx.open?'Present fixture':'None')]}
  if(id==='settings-overview-owner'){v.eyebrow=`${fx.name} · owner`;v.facts=[F('Name',fx.name),F('Future expense default',fx.currency),F('Status','Active'),F('Members',`${fx.members} active`),F('Open group items',fx.open?'Present; archive allowed, delete not yet':'None observed')]}
  if(id==='settings-overview-member'){v.eyebrow=`${fx.name} · member`;v.facts=[F('Name',fx.name),F('Future expense default',fx.currency),F('Owner',fx.owner),F('Your role','Member')]}
  if(id==='rename-edit'){v.facts=[F('Current name',fx.name),F('Draft name','Zurich Long Weekend'),F('History / balances','Unchanged')]}
  if(id==='config-edit'){v.facts=[F('Current default',fx.currency),F('Proposed default','EUR'),F('Existing expenses','Stay in recorded currencies')]}
  if(id==='archived'){
    v.title=`${fx.name} is out of the active list`;
    v.facts=[F('Group status','Archived'),F('Active members',fx.members===1?'Owner only':`${fx.members} fixture members`),F('Outstanding positions',fx.open?'Still true':'None'),F('History','Preserved'),F('Deletion eligibility',fx.eligibleDelete?'Prerequisites currently satisfied':'Requires sole member + no open items')];
  }
  if(id==='delete-review'){
    v.facts=[F('Required status','Archived'),F('Active members observed',fx.members===1?'Owner only':`${fx.members} fixture members`),F('Open items observed',fx.open?'Present':'None'),F('External copies','Not claimed erased')];
    if(fx.eligibleDelete){v.notice='Current fixture facts establish sole-member + no-open-item eligibility. Typed confirmation is now available; navigation did not create these facts.';v.actions=[A('All prerequisites met','delete-type-confirm','danger'),A('Cancel','archived','link')];}
    else{v.notice='Deletion stays locked until the owning journeys return fresh prerequisite facts. J26 never clears roster or money facts itself.';v.actions=[];if(fx.members!==1)v.actions.push(A('Manage members first','manage-people-boundary','accent',{return:'delete'}));if(fx.open)v.actions.push(A('Resolve open items','money-resolution-boundary','ghost',{return:'delete'}));v.actions.push(A('Cancel','archived','link'));}
  }
  if(id==='manage-people-boundary'&&params.get('return')==='delete'){v.notice='Preview boundary: the deterministic return represents Journey 09 having established an owner-only roster. No person is removed by J26.';v.actions=[A('Return with owner-only roster','archived','accent',{role:'owner',members:'1',open:String(fx.open),return:'delete'})];}
  if(id==='money-resolution-boundary'&&params.get('return')==='delete'){v.notice='Preview boundary: the deterministic return represents the owning money/issue flow having established no open items. J26 performs no settlement or ledger edit.';v.actions=[A('Return with no open items','archived','accent',{role:'owner',members:String(fx.members),open:'0',return:'delete'})];}
  if(id==='delete-type-confirm'){v.title=`Type “${fx.name}”`;v.facts=[F('Group status','Archived'),F('Active members','Owner only'),F('Open items','None')]}
  if(id==='delete-final-review'){v.title=`Delete ${fx.name} from this ChopDot state?`}
  if(id==='deleted'){v.title=`${fx.name} was deleted here`}
  if(id==='left-group'){v.title=`You left ${fx.name}`}
  return {v,fx};
}
function moveToSafe(target,params){const u=new URL(location.href);for(const [k,v] of params.entries())u.searchParams.set(k,v);u.hash=target;history.replaceState(null,'',`${u.search}${u.hash}`);return {id:target,params:new URLSearchParams(u.search)}}
function render(){
  let id=(location.hash||'#settings-entry-owner').slice(1),params=new URLSearchParams(location.search);
  const incomingTerminal=params.get('terminal');
  if((id==='left-group'&&incomingTerminal==='left')||(id==='deleted'&&incomingTerminal==='deleted'))sessionStorage.setItem('j26-terminal',incomingTerminal);
  const terminal=sessionStorage.getItem('j26-terminal');
  if(terminal&&!['left-group','deleted','home-boundary'].includes(id))({id,params}=moveToSafe('home-boundary',params));
  const pre=fixtureFacts(params);
  if(DELETE_GUARDED.has(id)&&!pre.eligibleDelete)({id,params}=moveToSafe('delete-review',params));
  const raw=D[id]||D['settings-entry-owner'];
  const role=params.get('role')||raw.role||'owner';
  const {v:d,fx}=viewFor(id,raw,params,role);
  const content=document.getElementById('content');
  document.documentElement.dataset.state=id;content.dataset.testState=id;content.dataset.stateCode=d.code;content.dataset.role=role;
  document.getElementById('rail-state').textContent=`${d.code} · ${id}`;
  const header=document.querySelector('.header-title span');if(header)header.textContent=`${fx.name} · ${fx.members} ${fx.members===1?'person':'people'} · ${fx.currency}`;
  const back=d.back||((role==='member')?'settings-overview-member':'settings-overview-owner');
  const backEl=document.getElementById('back');backEl.href=hrefFor(back,{role});backEl.dataset.to=back;
  const facts=(d.facts||[]).map(([l,v])=>`<div class="row"><span>${l}</span><b>${v}</b></div>`).join('');
  const notice=d.notice?`<div class="notice ${d.tone||''}"><span class="mark">${d.tone==='success'?'✓':d.tone==='danger'?'!':d.tone==='warn'?'!':'i'}</span><span>${d.notice}</span></div>`:'';
  const status=(d.status&&d.status!=='deleteInput')?`<section class="card status-card"><div class="status-icon ${d.status==='neutral'?'':d.status}">${iconFor(d)}</div><b>${d.status==='progress'?'Working…':d.status==='boundary'?'Adjacent journey':d.status==='success'?'Verified':d.status==='danger'?'Needs attention':d.status==='warn'?'Check required':'No effect'}</b><p>${BOUNDARIES.has(id)?'Ownership stays outside this J26 prototype boundary.':'The label reflects fixture truth for this exact state.'}</p></section>`:'';
  let special='';
  if(d.status==='deleteInput')special=`<section class="card pad"><div class="field"><label for="delete-name">Group name</label><input id="delete-name" data-test-delete-input autocomplete="off" placeholder="${fx.name}"><div class="hint">Exact match required. Nothing is deleted by typing.</div></div></section><div class="actions"><button id="delete-submit" class="btn danger" type="button">Continue</button><a data-to="archived" class="btn ghost" href="${hrefFor('archived')}">Cancel deletion</a></div>`;
  const actions=d.status==='deleteInput'?'':`<div class="actions">${(d.actions||[]).map(actionHtml).join('')}</div>`;
  content.innerHTML=`<div><div class="eyebrow">${d.eyebrow}</div><h1 class="hero">${d.title}</h1><p class="lead">${d.lead}</p></div>${status}${facts?`<section class="card pad stack">${facts}</section>`:''}${notice}${special||actions}`;
  if(d.status==='deleteInput')document.getElementById('delete-submit').addEventListener('click',()=>{const ok=document.getElementById('delete-name').value===fx.name;location.href=hrefFor(ok?'delete-final-review':'delete-mismatch',{role:'owner'})});
  content.scrollTop=0;
}
window.J26_DEFS=D;window.J26_ROOTS=ROOTS;window.J26_BOUNDARIES=[...BOUNDARIES];window.J26_GROUP=GROUP;window.J26_DELETE_GUARDED=[...DELETE_GUARDED];window.addEventListener('hashchange',render);render();'''
html = html[:start] + runtime + html[end:]

old_nav = "const stateUrl = (id, role = 'owner') => `${file}?role=${encodeURIComponent(role)}#${id}`;\nconst waitRendered = (p, id) => p.waitForFunction(\n  target => location.hash === `#${target}` && document.getElementById('content')?.dataset?.testState === target,\n  id,\n);\nconst goto = async (p, id, role = 'owner') => {\n  await p.goto(stateUrl(id, role), { waitUntil: 'load' });\n  await waitRendered(p, id);\n};"
new_nav = "const stateUrl = (id, role = 'owner', q = {}) => {\n  const u = new URL(file);\n  u.searchParams.set('role', role);\n  for (const [k, v] of Object.entries(q || {})) u.searchParams.set(k, String(v));\n  u.hash = id;\n  return u.href;\n};\nconst waitRendered = (p, id) => p.waitForFunction(\n  target => location.hash === `#${target}` && document.getElementById('content')?.dataset?.testState === target,\n  id,\n);\nconst goto = async (p, id, role = 'owner', q = {}) => {\n  await p.goto(stateUrl(id, role, q), { waitUntil: 'load' });\n  await waitRendered(p, id);\n};"
qa = rep(qa, old_nav, new_nav, 'QA state URL helper')
old_ids = "const boundarySet = new Set(boundaryIds);\nconst stateIds = ids.filter(id => !boundarySet.has(id));"
new_ids = "const boundarySet = new Set(boundaryIds);\nconst stateIds = ids.filter(id => !boundarySet.has(id));\nconst guardedDeleteIds = new Set(['delete-type-confirm','delete-mismatch','delete-final-review','deleting','delete-cancelled','delete-failed','delete-unknown','delete-reconciling','delete-no-effect-retry','deleted']);\nconst directQueryFor = id => guardedDeleteIds.has(id) ? { members: '1', open: '0' } : {};"
qa = rep(qa, old_ids, new_ids, 'QA guarded delete ids')
old_paths = "const pathProof = {};\nfor (const id of ids) {\n  pathProof[id] = shortestPath(id);\n  check(`truthful caller path exists for ${id}`, Boolean(pathProof[id]), 'no path');\n}"
new_paths = r'''const E=(from,to,label='',special=false)=>({from,to,label,special});
const safeDeletePrefix=[E('settings-entry-owner','settings-overview-owner'),E('settings-overview-owner','archive-review'),E('archive-review','archive-confirm'),E('archive-confirm','archiving'),E('archiving','archived'),E('archived','delete-review'),E('delete-review','manage-people-boundary'),E('manage-people-boundary','archived'),E('archived','delete-review'),E('delete-review','money-resolution-boundary'),E('money-resolution-boundary','archived'),E('archived','delete-review'),E('delete-review','delete-type-confirm')];
const pFinal=[...safeDeletePrefix,E('delete-type-confirm','delete-final-review','typed exact group name','exact')];
const pDeleting=[...pFinal,E('delete-final-review','deleting')];
const safeDeleteProof={'delete-type-confirm':safeDeletePrefix,'delete-mismatch':[...safeDeletePrefix,E('delete-type-confirm','delete-mismatch','typed non-matching name','mismatch')],'delete-final-review':pFinal,'deleting':pDeleting,'delete-cancelled':[...pFinal,E('delete-final-review','delete-cancelled')],'delete-failed':[...pDeleting,E('deleting','delete-failed')],'delete-unknown':[...pDeleting,E('deleting','delete-unknown')],'delete-reconciling':[...pDeleting,E('deleting','delete-unknown'),E('delete-unknown','delete-reconciling')],'delete-no-effect-retry':[...pDeleting,E('deleting','delete-unknown'),E('delete-unknown','delete-reconciling'),E('delete-reconciling','delete-no-effect-retry')],'deleted':[...pDeleting,E('deleting','deleted')]};
const pathProof = {};
for (const id of ids) {pathProof[id] = safeDeleteProof[id] ? { id, start: 'settings-entry-owner', steps: safeDeleteProof[id] } : shortestPath(id);check(`truthful caller path exists for ${id}`, Boolean(pathProof[id]), 'no path');}'''
qa = rep(qa, old_paths, new_paths, 'QA safe delete caller paths')
qa = rep(qa, "await goto(p, id, defs[id].role || 'owner');", "await goto(p, id, defs[id].role || 'owner', directQueryFor(id));", 'QA direct state render', 1)
qa = rep(qa, "await goto(p, 'delete-type-confirm');", "await goto(p, 'delete-type-confirm', 'owner', { members: '1', open: '0' });", 'QA typed delete setup', 1)
qa = rep(qa, "    await goto(p, proof.start, defs[proof.start].role || 'owner');", "    await p.evaluate(() => sessionStorage.removeItem('j26-terminal'));\n    await goto(p, proof.start, defs[proof.start].role || 'owner');", 'QA caller path terminal reset', 1)
anchor = "  await goto(p, 'transfer-saving');\n  await p.locator('#content [data-to=\"transfer-success\"]').click();\n  await waitRendered(p, 'transfer-success');\n  record(`${vp.name} verified transfer demotes current user`, 'member', await p.locator('#content').getAttribute('data-role'));\n"
addition = anchor + r'''
  await goto(p, 'rename-saving');await p.locator('#content [data-to="rename-success"]').click();await waitRendered(p, 'rename-success');await p.locator('#content [data-to="settings-overview-owner"]').click();await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} renamed truth survives settings return`, p, ['Name', 'Zurich Long Weekend']);record(`${vp.name} renamed header survives settings return`, true, (await p.locator('.header-title span').innerText()).includes('Zurich Long Weekend'));await p.goBack();await waitRendered(p, 'rename-success');await p.goForward();await waitRendered(p, 'settings-overview-owner');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} renamed truth survives history and reload`, p, ['Zurich Long Weekend']);
  await goto(p, 'config-saving');await p.locator('#content [data-to="config-success"]').click();await waitRendered(p, 'config-success');await p.locator('#content [data-to="settings-overview-owner"]').click();await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} EUR truth survives settings return`, p, ['Future expense default', 'EUR']);await p.goBack();await waitRendered(p, 'config-success');await p.goForward();await waitRendered(p, 'settings-overview-owner');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'settings-overview-owner');await visibleContains(`${vp.name} EUR truth survives history and reload`, p, ['EUR']);
  await goto(p, 'transfer-saving');await p.locator('#content [data-to="transfer-success"]').click();await waitRendered(p, 'transfer-success');await p.locator('#content [data-to="settings-overview-member"]').click();await waitRendered(p, 'settings-overview-member');await visibleContains(`${vp.name} transferred owner survives settings return`, p, ['Owner', 'Jeanine', 'Your role', 'Member']);await p.goBack();await waitRendered(p, 'transfer-success');await p.goForward();await waitRendered(p, 'settings-overview-member');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'settings-overview-member');await visibleContains(`${vp.name} transferred owner survives history and reload`, p, ['Owner', 'Jeanine']);
  await goto(p, 'archived');await p.locator('#content [data-to="delete-review"]').click();await waitRendered(p, 'delete-review');record(`${vp.name} open archived group cannot reach delete effect`, 0, await p.locator('#content [data-to="delete-type-confirm"]').count());await p.locator('#content [data-to="manage-people-boundary"]').click();await waitRendered(p, 'manage-people-boundary');await p.locator('#content [data-to="archived"]').click();await waitRendered(p, 'archived');await visibleContains(`${vp.name} roster return establishes owner-only fact`, p, ['Active members', 'Owner only', 'Outstanding positions', 'Still true']);await p.locator('#content [data-to="delete-review"]').click();await waitRendered(p, 'delete-review');record(`${vp.name} owner-only with open items still blocks delete`, 0, await p.locator('#content [data-to="delete-type-confirm"]').count());await p.locator('#content [data-to="money-resolution-boundary"]').click();await waitRendered(p, 'money-resolution-boundary');await p.locator('#content [data-to="archived"]').click();await waitRendered(p, 'archived');await visibleContains(`${vp.name} money return establishes no-open-item fact`, p, ['Active members', 'Owner only', 'Outstanding positions', 'None']);await p.locator('#content [data-to="delete-review"]').click();await waitRendered(p, 'delete-review');record(`${vp.name} delete unlocks only after both returned facts`, 1, await p.locator('#content [data-to="delete-type-confirm"]').count());
  await p.evaluate(() => sessionStorage.removeItem('j26-terminal'));await goto(p, 'leaving', 'member');await p.locator('#content [data-to="left-group"]').click();await waitRendered(p, 'left-group');await p.goBack();await waitRendered(p, 'home-boundary');record(`${vp.name} browser Back after leave cannot re-expose group`, '#home-boundary', await p.evaluate(() => location.hash));await p.goForward();await waitRendered(p, 'left-group');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'left-group');record(`${vp.name} terminal leave survives Forward/reload without stale group`, '#left-group', await p.evaluate(() => location.hash));
  await p.evaluate(() => sessionStorage.removeItem('j26-terminal'));await goto(p, 'deleting', 'owner', { members: '1', open: '0' });await p.locator('#content [data-to="deleted"]').click();await waitRendered(p, 'deleted');await p.goBack();await waitRendered(p, 'home-boundary');record(`${vp.name} browser Back after delete cannot re-expose group`, '#home-boundary', await p.evaluate(() => location.hash));await p.goForward();await waitRendered(p, 'deleted');await p.reload({ waitUntil: 'load' });await waitRendered(p, 'deleted');record(`${vp.name} terminal delete survives Forward/reload without stale group`, '#deleted', await p.evaluate(() => location.hash));
'''
qa = rep(qa, anchor, addition, 'QA reviewer repair assertions')
html_path.write_text(html)
qa_path.write_text(qa)
print('J26 reviewer repair applied')
