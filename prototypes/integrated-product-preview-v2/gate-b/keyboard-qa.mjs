// Keyboard-only Gate B interactions; Gate A group/person setup uses its existing controls.
import './browser-launch.mjs';
import {chromium} from 'playwright';
import {serve} from './test-server.mjs';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=process.env.EVIDENCE_DIR; mkdirSync(out,{recursive:true});
const host=await serve(process.env.PREVIEW_ROOT), browser=await chromium.launch({headless:true});
const report={status:'RUNNING',browser:browser.version(),checks:[],focus:[],screenshots:[],errors:[],warnings:[]};
try {
for(const viewport of [{width:393,height:852},{width:1440,height:1000}]) {
  const label=String(viewport.width), context=await browser.newContext({viewport}), page=await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror',e=>report.errors.push(`${label}: ${e.message}`));
  page.on('console',m=>{if(['warning','error'].includes(m.type())) report.warnings.push(`${label}: ${m.type()}: ${m.text()}`);});
  const f=()=>page.frameLocator('#product-frame'), screen=()=>f().locator('#app>.screen');
  const check=(name,actual,expected=true)=>{assert.deepEqual(actual,expected,`${label}: ${name}`);report.checks.push(`${label}: ${name}`);};
  const focused=locator=>locator.evaluate(el=>el===el.ownerDocument.activeElement);
  async function wait(id) { await f().locator(`#app>.screen[data-golden="${id}"]`).waitFor(); }
  async function routeFocus(id) {await wait(id);check(`${id} route has focus`,await focused(screen()));}
  async function tabTo(target,name,back=false) {
    await target.waitFor();
    for(let n=0;n<70;n++) {
      // A newly rendered route can replace a focused control between Tab and Enter.
      // Wait for one paint with the same focused node; do not programmatically focus it.
      if(await target.evaluate(el=>new Promise(resolve=>requestAnimationFrame(()=>resolve(el.isConnected && el===el.ownerDocument.activeElement))))) {
        check(`${name} reachable with ${back?'Shift+Tab':'Tab'}`,true);
        const info=await target.evaluate(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {tag:el.tagName,role:el.getAttribute('role'),name:el.getAttribute('aria-label')||el.textContent.trim().slice(0,60),outline:s.outlineStyle,outlineWidth:s.outlineWidth,visible:r.width>0&&r.height>0,disabled:el.getAttribute('aria-disabled')==='true',inViewport:r.top>=0&&r.bottom<=innerHeight};});
        check(`${name} visible and enabled`,info.visible&&!info.disabled&&info.inViewport);
        check(`${name} visible focus indicator`,info.outline!=='none'&&parseFloat(info.outlineWidth)>0);
        if(info.role==='checkbox') {
          const contained=await target.evaluate(el=>{
            const style=getComputedStyle(el), rect=el.getBoundingClientRect(), extra=Math.max(0,parseFloat(style.outlineOffset)+parseFloat(style.outlineWidth));
            for(let p=el.parentElement;p;p=p.parentElement) {
              const s=getComputedStyle(p), b=p.getBoundingClientRect(), left=b.left+p.clientLeft, top=b.top+p.clientTop;
              if(/hidden|clip/.test(s.overflowX) && (rect.left-extra<left-.5 || rect.right+extra>left+p.clientWidth+.5)) return false;
              if(/hidden|clip/.test(s.overflowY) && (rect.top-extra<top-.5 || rect.bottom+extra>top+p.clientHeight+.5)) return false;
            }
            return true;
          });
          check(`${name} focus ring fits clipped card`,contained);
        }
        report.focus.push({viewport:label,control:name,...info});return;
      }
      await page.keyboard.press(back?'Shift+Tab':'Tab');
    }
    throw Error(`${label}: keyboard could not reach ${name}`);
  }
  async function activate(target,name) {await tabTo(target,name);await page.keyboard.press('Enter');}
  async function type(target,name,value) {await tabTo(target,name);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type(value);}
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('chopdot.preview-v2.guest')));
  async function actor(id) {const select=f().getByLabel('Test person',{exact:true});await tabTo(select,'test person');await page.keyboard.press('Home');if(id!=='self') await page.keyboard.press('ArrowDown');await page.keyboard.press('Tab');await wait('active');check('keyboard persona selection',await select.inputValue(),id);}
  await page.goto(host.base+'/prototypes/integrated-product-preview-v2/index.html?fixtures=1');
  check('page identity',await page.title(),'ChopDot — Golden-faithful Preview V2');
  await page.getByRole('button',{name:'Continue as guest',exact:true}).click();
  await f().getByRole('button',{name:'Start a group',exact:true}).click();
  await f().getByLabel('Group name').fill('Keyboard trip');
  await f().locator('#entry').getByRole('link',{name:'Create group',exact:true}).click();
  await f().locator('#success').getByRole('link',{name:'Add people',exact:true}).click();
  await f().getByLabel('Person name',{exact:true}).fill('Alice');
  await f().locator('.guest-group-add-row').getByRole('button',{name:'Add',exact:true}).click();
  await f().getByRole('button',{name:'Done',exact:true}).click();
  await f().locator('#success').getByRole('link',{name:'Add expense',exact:true}).click();
  await f().locator('#entry').getByRole('link',{name:'Back',exact:true}).click();
  await f().getByRole('button',{name:'Open group',exact:true}).click();await routeFocus('active');
  const person=(await state()).people[0].id;
  await activate(f().getByRole('link',{name:'Add expense',exact:true}).first(),'Add expense');await routeFocus('entry');
  await activate(f().locator('.app-footer .primary'),'empty Save');
  check('invalid input announces alert',await f().getByRole('alert').count(),1);
  check('invalid save does not write expense',(await state()).expenses.length,0);
  await type(f().getByLabel('Amount',{exact:true}),'Amount','0.05');
  await type(f().getByLabel('Description',{exact:true}),'Description','Keyboard expense');
  await activate(f().locator('[aria-label="Back"]'),'draft Back');await routeFocus('active');
  await activate(f().getByRole('link',{name:'Add expense',exact:true}).first(),'reopen draft');await routeFocus('entry');
  check('reopen retains amount',await f().getByLabel('Amount',{exact:true}).inputValue(),'0.05');
  await page.reload();await routeFocus('entry');check('reload retains description',await f().getByLabel('Description',{exact:true}).inputValue(),'Keyboard expense');
  const offline=f().getByRole('checkbox',{name:'Offline',exact:true});
  await tabTo(offline,'Offline fixture');await page.keyboard.press('Space');
  check('fixture toggle retains focus',await focused(offline));check('keyboard offline fixture set',(await state()).gateB.environment.offline);
  await page.keyboard.press('Space');check('repeat Space clears offline',(await state()).gateB.environment.offline,false);
  const settlement=f().getByLabel('Settlement precondition',{exact:true});
  await tabTo(settlement,'Settlement fixture');await page.keyboard.press('ArrowDown');
  check('settlement selector retains focus',await focused(settlement));check('keyboard external precondition selected',await settlement.inputValue(),'active');
  await page.keyboard.press('Home');check('keyboard restores no settlement fixture',await settlement.inputValue(),'none');
  check('fixture rerender keeps draft',await f().getByLabel('Description',{exact:true}).inputValue(),'Keyboard expense');
  await activate(f().locator('.config-row').nth(1),'Split participants');await routeFocus('split');
  const checkbox=f().getByRole('checkbox',{name:'Alice',exact:true});
  await tabTo(checkbox,'Alice participant');await page.keyboard.press('Space');
  check('Space toggles participant',await checkbox.getAttribute('aria-checked'),'false');
  check('participant toggle retains focus',await focused(checkbox));
  await page.keyboard.press('Space');check('repeat Space restores participant',await checkbox.getAttribute('aria-checked'),'true');
  await page.keyboard.press('Enter');check('Enter toggles participant',await checkbox.getAttribute('aria-checked'),'false');
  await page.keyboard.press('Enter');check('repeat Enter restores participant',await checkbox.getAttribute('aria-checked'),'true');
  await page.screenshot({path:resolve(out,`${label}-participant-focus.png`)});report.screenshots.push(`${label}-participant-focus.png`);
  await activate(f().locator('.app-footer a'),'participant Done');await routeFocus('entry');
  await activate(f().locator('.app-footer .primary'),'Save expense');await routeFocus('success');
  const expense=(await state()).expenses[0];check('keyboard save exact cents',expense.allocation.allocations.map(a=>a.amount.minorUnits).sort(),['2','3']);
  await activate(f().getByRole('link',{name:'Back to group',exact:true}),'saved Back to group');await routeFocus('active');
  await activate(f().locator('.card.list .row').first(),'Inspect expense');await routeFocus('detail');
  await activate(f().locator('[href="#history"]'),'History');await routeFocus('history');
  await activate(f().locator('[aria-label="Back"]'),'history Back');await routeFocus('detail');
  await activate(f().getByRole('link',{name:'Edit',exact:true}),'Edit');await routeFocus('edit');
  await type(f().getByLabel('Description',{exact:true}),'edit Description','Keyboard correction');
  await activate(f().locator('.app-footer .primary'),'Save correction');await routeFocus('updated');
  check('correction retains lineage',(await state()).expenses[0].id,expense.id);
  await actor(person);await activate(f().locator('.attention-item').first(),'review Attention');await routeFocus('changed');
  await activate(f().getByRole('link',{name:'Still off',exact:true}),'Still off');await routeFocus('reasons');
  await activate(f().locator('.reason').first(),'Issue reason');await routeFocus('note-share');
  await type(f().getByLabel('Optional note'),'issue note','Please check the cents.');
  await activate(f().locator('.primary'),'Send issue');await routeFocus('issue-sent-share');
  check('reviewer issue remains open',(await state()).expenses[0].issues[0].status,'open');
  await actor('self');await activate(f().locator('.attention-item').first(),'owner Attention');await routeFocus('owner-issue');
  await activate(f().getByRole('link',{name:'Reply',exact:true}),'Reply');await routeFocus('reply');
  await type(f().getByLabel('Your reply'),'reply note','Checked the exact split.');
  await activate(f().getByRole('link',{name:'Send reply',exact:true}),'Send reply');await routeFocus('reply-sent');
  check('owner reply cannot resolve issue',(await state()).expenses[0].issues[0].status,'open');
  await actor(person);await activate(f().locator('.attention-item').first(),'reply Attention');await routeFocus('member-reply');
  await activate(f().getByRole('link',{name:'Looks right',exact:true}),'Looks right');await routeFocus('resolved-reply');
  check('reviewer resolves issue',(await state()).expenses[0].issues[0].status,'resolved');
  await actor('self');await activate(f().locator('.card.list .row').first(),'reopen expense');await routeFocus('detail');
  await activate(f().getByRole('link',{name:'More',exact:true}).last(),'More');await routeFocus('more-own');
  await activate(f().locator('[href="#delete-confirm"]'),'Delete menu');await routeFocus('delete-confirm');
  await activate(f().getByRole('link',{name:'Delete expense',exact:true}),'Confirm delete');await routeFocus('deleted');
  await activate(f().getByRole('link',{name:'Back to group',exact:true}),'deleted Back to group');await routeFocus('active');
  check('delete refreshes canonical Group Home',await f().locator('.card.list .row').count(),0);
  const add=f().getByRole('link',{name:'Add expense',exact:true}).first();await tabTo(add,'reverse-tab starting control');
  await page.keyboard.press('Tab');await tabTo(add,'reverse tab return',true);
  await page.screenshot({path:resolve(out,`${label}-group-keyboard.png`)});report.screenshots.push(`${label}-group-keyboard.png`);
  check('meaningful rendered page',await f().locator('#app').innerText().then(s=>s.includes('Keyboard trip')));
  check('no framework overlay',await page.locator('vite-error-overlay, nextjs-portal').count(),0);
  await context.close();
}
assert.deepEqual(report.errors,[]);assert.deepEqual(report.warnings,[]);report.status='PASS';
} catch(error) {report.status='FAIL';report.failure=error.stack;throw error;}
finally {writeFileSync(resolve(out,'results.json'),JSON.stringify(report,null,2));await browser.close();await host.close();console.log(JSON.stringify({status:report.status,checks:report.checks.length,evidence:out}));}
