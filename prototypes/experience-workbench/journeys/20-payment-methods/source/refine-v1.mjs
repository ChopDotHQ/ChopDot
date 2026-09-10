import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const journeyDir=path.resolve(import.meta.dirname,'..');
const candidatePath=path.join(journeyDir,'review-v1/v1-candidate.html');
let html=fs.readFileSync(candidatePath,'utf8');

const iconPaths={
  back:'<path d="M15 18l-6-6 6-6"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  crypto:'<path d="M4 7h16v10H4z"/><path d="M8 11h8M12 7V4M12 20v-3"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1"/>',
  trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
};
const svg=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[n]||''}</svg>`;
const header=(title,sub='Payment methods',back='#overview')=>`<header class="detail-header"><a class="icon-btn" href="${back}" aria-label="Back">${svg('back')}</a><div class="header-title"><b>${title}</b><span>${sub}</span></div><a class="demo-btn" href="#demo">Demo</a></header>`;
const footer=(primary,href,secondary='',secondaryHref='#overview',danger='',dangerHref='')=>`<footer class="j20-footer"><a class="j20-primary" href="${href}">${primary}</a>${secondary?`<a class="j20-secondary" href="${secondaryHref}">${secondary}</a>`:''}${danger?`<a class="j20-danger" href="${dangerHref}">${danger}</a>`:''}</footer>`;
const fact=(label,value,cls='')=>`<div class="j20-fact"><span>${label}</span><b class="${cls}">${value}</b></div>`;
const field=(label,value,help='')=>`<label class="j20-field"><span>${label}</span><div class="j20-input">${value}</div>${help?`<small>${help}</small>`:''}</label>`;
const note=(text,type='gray',icon='shield')=>`<div class="j20-note ${type}">${svg(icon)}<div>${text}</div></div>`;
const review=(title,copy,facts,warning='')=>`<div class="card j20-review"><div class="j20-review-head"><span class="j20-kicker">Before saving</span><h1>${title}</h1><p>${copy}</p></div><div class="j20-facts">${facts}</div>${warning?`<div class="j20-warning">${warning}</div>`:''}</div>`;
const formTitle=(title,copy)=>`<div class="j20-form-title"><h1>${title}</h1><p>${copy}</p></div>`;
const screen=(id,title,body,{back='#overview',sub='Payment methods',footerHtml=''}={})=>`<section id="${id}" class="screen">${header(title,sub,back)}<main class="j20-content">${body}</main>${footerHtml}</section>`;

function patchSection(id, transform){
  const start=html.indexOf(`<section id="${id}"`);
  if(start<0)throw new Error(`Missing section ${id}`);
  const next=html.indexOf('<section id="',start+12);
  const end=next>=0?next:html.indexOf('</div></main><aside',start);
  if(end<0)throw new Error(`Cannot bound section ${id}`);
  const before=html.slice(0,start),section=html.slice(start,end),after=html.slice(end);
  html=before+transform(section)+after;
}
function replaceOnceInSection(id,from,to){
  patchSection(id,section=>{
    if(!section.includes(from))throw new Error(`Missing replacement in ${id}: ${from}`);
    return section.replace(from,to);
  });
}

// Add-method review routes must preserve the selected method rather than falling into Bank review.
replaceOnceInSection('add-twint','href="#review-new-bank"','href="#review-new-twint"');
replaceOnceInSection('add-paypal','href="#review-new-bank"','href="#review-new-paypal"');
replaceOnceInSection('add-crypto','href="#review-new-bank"','href="#review-new-crypto"');

// Edit routes must preserve the method identity.
replaceOnceInSection('detail-twint','href="#edit-bank"','href="#edit-twint"');
replaceOnceInSection('detail-paypal','href="#edit-bank"','href="#edit-paypal"');
replaceOnceInSection('edit-crypto','href="#review-edit-bank"','href="#review-edit-crypto"');

// Every saved method gets an explicit owner-only remove path from its own detail surface.
const removeByDetail={
  'detail-bank':['#remove-confirm','Remove method'],
  'detail-twint':['#remove-confirm-twint','Remove method'],
  'detail-paypal':['#remove-confirm-paypal','Remove method'],
  'detail-crypto':['#remove-confirm-crypto','Remove method'],
};
for(const [id,[href,label]] of Object.entries(removeByDetail)){
  patchSection(id,section=>{
    const footerClose='</footer></section>';
    if(!section.includes(footerClose))throw new Error(`Missing footer in ${id}`);
    return section.replace(footerClose,`<a class="j20-danger" href="${href}">${label}</a>${footerClose}`);
  });
}

// Make the shared removal result language method-neutral, because it is used after any method-specific confirmation.
replaceOnceInSection('remove-accepted','Main CHF account removed','Payment method removed');
replaceOnceInSection('remove-failed','Main CHF account is still saved','Payment method is still saved');

const added=[];
added.push(screen('review-new-twint','Review new method',`${review('TWINT','Confirm the receiving destination and whether it can appear in an authorized CHF handoff.',fact('Type','TWINT')+fact('Phone','+41 79 000 00 00','mono')+fact('Handle','@demo-handle')+fact('Available to receive','Yes')+fact('Suggested for CHF','No'))}${note('Saving adds a destination only. It does not send, authorize or confirm a TWINT payment.')}`,{back:'#add-twint',footerHtml:footer('Save method','#save-pending','Edit details','#add-twint')}));
added.push(screen('review-new-paypal','Review new method',`${review('PayPal','Confirm the destination. Provider credentials never enter ChopDot.',fact('Type','PayPal')+fact('Email','demo.user@example.invalid','mono')+fact('Username','@demo-user')+fact('Available to receive','No')+fact('Suggested for CHF','No'))}${note('The provider login/password remain with PayPal. ChopDot stores only the receiving destination you choose to save.')}`,{back:'#add-paypal',footerHtml:footer('Save method','#save-pending','Edit details','#add-paypal')}));
added.push(screen('review-new-crypto','Review new method',`${review('DOT receiving destination','Confirm the public destination and exact network before it becomes available to compatible crypto handoffs.',fact('Type','Crypto receiving destination')+fact('Asset','DOT')+fact('Network','Polkadot')+fact('Public address','5DemoDotDestination…111111','mono')+fact('Available to receive','Yes'))}${note('This saves a public receiving destination only. It does not connect a wallet or grant signing authority.')}`,{back:'#add-crypto',footerHtml:footer('Save method','#save-pending','Edit details','#add-crypto')}));

added.push(screen('edit-twint','Edit method',`${formTitle('Update TWINT','This saved destination is currently version v2.')}${field('Label','TWINT')}${field('Swiss phone','+41 79 000 00 00')}${field('Handle','demo-handle')}${note('Saving creates destination version v3. Existing disclosure bound to v2 does not silently follow the change.','warn','link')}`,{back:'#detail-twint',footerHtml:footer('Review changes','#review-edit-twint','Cancel','#detail-twint')}));
added.push(screen('review-edit-twint','Review changes',`${review('TWINT','The destination moves from v2 to v3.',fact('Phone','+41 79 000 00 00','mono')+fact('Handle','@demo-handle')+fact('New destination version','v3'),'Any active share or review bound to v2 becomes stale and needs a fresh review.')}`,{back:'#edit-twint',footerHtml:footer('Save update','#save-pending','Keep v2','#detail-twint')}));

added.push(screen('edit-paypal','Edit method',`${formTitle('Update PayPal','This saved destination is currently version v1.')}${field('Label','PayPal')}${field('Email','demo.user@example.invalid')}${field('Username','demo-user')}${note('Saving creates destination version v2. Old disclosure stays bound to v1 instead of silently following the edit.','warn','link')}`,{back:'#detail-paypal',footerHtml:footer('Review changes','#review-edit-paypal','Cancel','#detail-paypal')}));
added.push(screen('review-edit-paypal','Review changes',`${review('PayPal','The destination moves from v1 to v2.',fact('Email','demo.user@example.invalid','mono')+fact('Username','@demo-user')+fact('New destination version','v2'),'Any active share or review bound to v1 becomes stale and needs a fresh review.')}`,{back:'#edit-paypal',footerHtml:footer('Save update','#save-pending','Keep v1','#detail-paypal')}));

added.push(screen('review-edit-crypto','Review changes',`${review('DOT receiving destination','The destination moves from v4 to v5.',fact('Asset','DOT')+fact('Network','Polkadot')+fact('Public address','5DemoDotDestination…111111','mono')+fact('New destination version','v5'),'Any active share or payment review bound to v4 becomes stale. Wallet connection/signing state is unchanged because this is only a receiving destination.')}`,{back:'#edit-crypto',footerHtml:footer('Save update','#save-pending','Keep v4','#detail-crypto')}));

const removeScreen=(id,name,version,back)=>screen(id,'Remove payment method',`${review(`Remove ${name}?`,'This stops future suggestion and authorized disclosure of this destination.',fact('Current destination version',version)+fact('Future availability','Removed')+fact('Existing payments','Unchanged'),'Any active ChopDot share bound to this destination version becomes stale. Values already copied or screenshotted outside ChopDot cannot be recalled.')}${note('Removal never cancels a request, reverses a payment, erases settlement history or changes a balance.')}`,{back,footerHtml:footer('Remove method','#remove-pending','Keep method',back)});
added.push(removeScreen('remove-confirm-twint','TWINT','v2','#detail-twint'));
added.push(removeScreen('remove-confirm-paypal','PayPal','v1','#detail-paypal'));
added.push(removeScreen('remove-confirm-crypto','DOT receiving destination','v4','#detail-crypto'));

const insertion='<section id="demo" class="screen">';
if(!html.includes(insertion))throw new Error('Could not locate demo insertion point');
html=html.replace(insertion,added.join('')+insertion);

// Demo index includes the corrected method-specific states so they are inspectable directly.
patchSection('demo',section=>section.replace('</div></details>',added.map(s=>{const m=s.match(/^<section id="([^"]+)"/);return m?`<a href="#${m[1]}">${m[1].replaceAll('-',' ')}</a>`:''}).join('')+'</div></details>'));

// Scoped destructive link treatment; not a new global color/token system.
html=html.replace('</head>','<style id="j20-v1-route-repair">.j20-danger{min-height:32px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#a32968}.j20-footer .j20-danger{margin-top:-2px}</style></head>');

const ids=[...html.matchAll(/<section id="([^"]+)" class="screen/g)].map(m=>m[1]);
if(ids.length!==new Set(ids).size)throw new Error('Duplicate screen ids after J20 route repair');

// The base builder embeds a runtime valid-screen set before refinement. Keep it in lockstep with
// any refined screens so hash normalization does not immediately bounce a valid new state back
// to #overview and make its controls unreachable to users or browser QA.
const runtimeValid=/const valid=new Set\(\[[^\]]*\]\);function normalize\(\)/;
if(!runtimeValid.test(html))throw new Error('Could not locate runtime valid-screen set after J20 route repair');
html=html.replace(runtimeValid,`const valid=new Set(${JSON.stringify(ids)});function normalize()`);

for(const target of [...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]))if(!ids.includes(target))throw new Error(`Broken target after J20 route repair: ${target}`);
fs.writeFileSync(candidatePath,html);
const hash=crypto.createHash('sha256').update(html).digest('hex');
console.log(JSON.stringify({ok:true,repair:'method-specific review/edit/remove routes + runtime route registry',screens:ids.length,sha256:hash},null,2));
