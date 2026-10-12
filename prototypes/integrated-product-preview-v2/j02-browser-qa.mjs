import './gate-b/browser-launch.mjs';
import { chromium } from 'playwright';
import { serve } from './gate-b/test-server.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const out = process.env.EVIDENCE_DIR;
if (!out || !process.env.PREVIEW_ROOT) throw Error('Set EVIDENCE_DIR and PREVIEW_ROOT.');
mkdirSync(out, { recursive: true });
const host = await serve(process.env.PREVIEW_ROOT);
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [];
let page;
const base = host.base + '/prototypes/integrated-product-preview-v2/index.html';
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('chopdot.preview-v2.guest')));
const f = () => page.frameLocator('#product-frame');
const click = label => f().getByRole('button', { name: label, exact: true }).click();
const home = () => f().locator('body[data-preview-mode]').waitFor();
const shot = name => page.screenshot({ path: out + '/' + name + '.png' });
const noFixtures = async () => {
  const text = await f().locator('body').innerText();
  for (const sample of ['+CHF 132.20', 'Zurich Weekend', 'Connected', '14.82 DOT']) assert.ok(!text.includes(sample), sample);
};
const sameBusiness = (a,b) => {
  for (const key of ['group','groups','people','expenses','drafts','accountCreated','participantCreated']) assert.deepEqual(b[key],a[key],key);
};
const record = (id, scope) => checks.push({ id, scope, result: 'pass' });

try {
  for (const viewport of [{width:393,height:852},{width:430,height:890},{width:1440,height:1000}]) {
    const w = viewport.width, context = await browser.newContext({viewport});
    page = await context.newPage(); page.setDefaultTimeout(10000);
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type()==='error') errors.push(msg.text()); });
    await page.goto(base); await page.getByRole('button',{name:'Continue as guest',exact:true}).click();
    await home(); await noFixtures(); const empty = await state();
    await shot('empty-home-'+w); record('J02-R01-'+w,'empty Home hierarchy and truthful records');
    await click('Start a group'); await f().getByLabel('Group name',{exact:true}).waitFor();
    await page.evaluate(()=>history.back()); await home(); await noFixtures(); sameBusiness(empty,await state());
    assert.equal(await f().getByText('More tools',{exact:true}).count(),0);
    await shot('native-back-'+w); record('J02-R02-'+w,'native Back restores canonical Home');
    await page.evaluate(()=>history.forward()); await f().getByLabel('Group name',{exact:true}).waitFor();
    await f().getByLabel('Group name',{exact:true}).fill('J02 weekend');
    await f().getByRole('link',{name:'Create group',exact:true}).click();
    await f().getByText('J02 weekend',{exact:true}).first().waitFor();
    assert.equal((await state()).group.name,'J02 weekend');
    assert.equal((await state()).accountCreated,false);
    record('J02-R03-'+w,'Forward installs the group owner and creates one local group');
    await page.reload(); await home(); await noFixtures();
    const populated = await state(); await shot('populated-home-'+w);
    const frameBox = await page.locator('#product-frame').boundingBox();
    const navBox = await f().locator('.tabbar').boundingBox();
    assert.ok(navBox && navBox.y>=frameBox.y && navBox.y+navBox.height<=frameBox.y+frameBox.height+1);
    assert.equal(await f().locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
    record('J02-R04-'+w,'populated Home retains local group and visible mobile navigation');
    await f().getByRole('link',{name:'People',exact:true}).click();
    await f().getByRole('button',{name:'Back to Home',exact:true}).waitFor();
    await shot('people-boundary-'+w); await click('Back to Home'); await home();
    sameBusiness(populated,await state()); record('J02-R05-'+w,'guest People truthful boundary and root return');
    await f().getByRole('link',{name:'Activity',exact:true}).click();
    await f().getByRole('button',{name:'Insights',exact:true}).waitFor(); await shot('activity-'+w);
    await f().getByRole('link',{name:'Pots',exact:true}).click(); await home();
    sameBusiness(populated,await state()); record('J02-R06-'+w,'Activity Pots returns to root Home with a selected group');
    await f().getByRole('link',{name:'Activity',exact:true}).click(); await click('Insights');
    await f().getByRole('button',{name:'Back to Home',exact:true}).waitFor(); await click('Back to Home'); await home();
    record('J02-R07-'+w,'Insights capability boundary has a root exit');
    await f().getByRole('link',{name:'You',exact:true}).click();
    await f().getByRole('button',{name:'Payment methods',exact:true}).waitFor();
    assert.deepEqual(await f().locator('.tabbar .tab').allTextContents(),['Pots','People','Activity','You']);
    await shot('you-'+w);
    for (const label of ['Savings','All groups / archived','Payment methods','Wallet','Scan QR','Import / export','Storage & recovery']) {
      await click(label); await f().getByRole('button',{name:'Back to Home',exact:true}).waitFor();
      await click('Back to Home'); await home();
      sameBusiness(populated,await state());
      await f().getByRole('link',{name:'You',exact:true}).click();
      record('J02-R08-'+w+'-'+label,'retained destination and safe capability boundary');
    }
    await click('Back to Home'); await home();
    await f().getByRole('button',{name:'Open group',exact:true}).click();
    await f().locator('.header-title').getByText('J02 weekend',{exact:true}).waitFor();
    await page.evaluate(()=>history.back()); await home(); await noFixtures();
    await page.evaluate(()=>history.forward()); await f().locator('.header-title').getByText('J02 weekend',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>window.ChopDotPreviewV2.getCurrentJourney()),'GATE_B');
    await page.reload(); await f().locator('.header-title').getByText('J02 weekend',{exact:true}).waitFor();
    record('J02-R09-'+w,'selected Group Home native Back/Forward and reload retain owner');
    await f().locator('[href="#home-handoff"][aria-label="Back"]').click(); await home();
    const beforeAccount=await state();
    await click('Invite someone'); await page.locator('#account-wall-create').click();
    await f().getByLabel('Email',{exact:true}).fill('j02@example.com'); await click('Send code');
    await f().getByLabel('6-digit code',{exact:true}).fill('123456'); await click('Continue');
    await f().getByLabel('Your name',{exact:true}).fill('J02 reviewer'); await click('Continue');
    await click('Open ChopDot'); await home(); await noFixtures();
    const account=await state(); assert.equal(account.accountCreated,true);
    for(const key of ['group','people','expenses'])assert.deepEqual(account[key],beforeAccount[key]);
    assert.deepEqual(account.groups||[account.group].filter(Boolean),beforeAccount.groups||[beforeAccount.group].filter(Boolean));
    await shot('account-home-'+w); record('J02-R10-'+w,'synthetic account conversion retains local work and canonical Home');
    await f().getByRole('link',{name:'People',exact:true}).click();
    await f().getByRole('heading',{name:'Familiar faces.',exact:true}).waitFor();
    await shot('account-people-'+w); await click('Back to Home'); await home();
    record('J02-R11-'+w,'account People directory and root exit');
    await f().getByRole('link',{name:'Activity',exact:true}).click(); await click('Insights');
    await f().getByText('No accepted spending yet',{exact:true}).waitFor(); await shot('account-insights-'+w);
    await f().getByRole('button',{name:'Pots',exact:true}).click(); await home();
    sameBusiness(account,await state()); record('J02-R12-'+w,'active Insights Pots uses root Home rather than selected Group Home');
    for(const label of ['Savings','All groups / archived','Payment methods','Wallet','Scan QR','Import / export','Storage & recovery']){
      await f().getByRole('link',{name:'You',exact:true}).click(); await click(label);
      await f().locator('.screen,.composed-screen').first().waitFor();
      assert.equal(await f().locator('.home-boundary').count(),0,label);
      await page.evaluate(()=>history.back());
      await f().getByRole('button',{name:'Payment methods',exact:true}).waitFor();
      await f().getByRole('link',{name:'Pots',exact:true}).click(); await home();
      sameBusiness(account,await state()); record('J02-R13-'+w+'-'+label,'active retained tool and native Back to its owner');
    }
    await f().getByRole('link',{name:'You',exact:true}).click();
    await f().getByRole('button',{name:'Payment methods',exact:true}).waitFor(); await shot('account-you-'+w);
    await context.close();
  }
  assert.deepEqual(errors,[]); writeFileSync(out+'/results.json',JSON.stringify({status:'PASS',checks,errors},null,2));
  console.log(JSON.stringify({status:'PASS',count:checks.length}));
} catch(error) {
  if(page && !page.isClosed()) await shot('failure');
  writeFileSync(out+'/results.json',JSON.stringify({status:'FAIL',checks,errors,error:error.stack},null,2));
  throw error;
} finally { await browser.close(); await host.close(); }
