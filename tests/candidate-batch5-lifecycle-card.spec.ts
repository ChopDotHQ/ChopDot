import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {expect,test,type Browser,type BrowserContext,type Page} from '@playwright/test';
import type {CanonicalEventV1} from '../src/core/moneyEventKernel.ts';

const proofRoot='proof/chopdot-candidate-2026-08-12';
const proofDir=path.join(proofRoot,'screenshots','b5-2026-08-13');
const observationsPath=path.join(proofRoot,'test-results','b5-2026-08-13','comprehension-observations.json');
const baseUrl=process.env.AUTHORITY_KEY_TEST_BASE_URL??'http://127.0.0.1:4177';
type ActorId='mina'|'leo'|'nina';
type Actor={id:ActorId;context:BrowserContext;page:Page};

test.beforeAll(async()=>{await mkdir(proofDir,{recursive:true});await mkdir(path.dirname(observationsPath),{recursive:true})});

test('actual App uses one state-faithful card through the full dinner lifecycle',async({browser})=>{
  const bus=new BrowserDinnerBus();
  const mina=await actor(browser,bus,'mina',{width:1280,height:720});
  const leo=await actor(browser,bus,'leo',{width:390,height:844});
  const nina=await actor(browser,bus,'nina',{width:390,height:844});
  try{
    await expect(mina.page.getByRole('heading',{name:'Start with the receipt.'})).toBeVisible();
    await expectOnePrimary(mina.page,'Scan a receipt');
    await expectActionInViewport(mina.page,'Scan a receipt');
    await mina.page.screenshot({path:path.join(proofDir,'01-preview-desktop-1280x720.png')});

    await openJourney(mina.page); await openJourney(leo.page); await openJourney(nina.page);
    await expect(mina.page.getByRole('heading',{name:'Start with the receipt'})).toBeVisible();
    await expectOnePrimary(mina.page,null);
    await expect(mina.page.getByRole('button',{name:'Add receipt'})).toBeVisible();
    await mina.page.screenshot({path:path.join(proofDir,'02-empty-catch-desktop-1280x720.png')});

    await mina.page.getByLabel('Choose dinner receipt').setInputFiles({name:'zurich-dinner.txt',mimeType:'text/plain',buffer:Buffer.from('Zurich Dinner\nTotal CHF 120.00')});
    await expect(mina.page.getByRole('heading',{name:'Review this spend'})).toBeVisible();
    await expectOnePrimary(mina.page,'Send requests');
    await mina.page.getByRole('button',{name:'Send requests'}).click();

    await expectCard(leo.page,'payment_requested','Payment requested');
    await expect(leo.page.getByText('Your share · CHF 40.00')).toBeVisible();
    await expectOnePrimary(leo.page,'I paid Mina');
    await expectActionInViewport(leo.page,'I paid Mina');
    await leo.page.screenshot({path:path.join(proofDir,'03-requested-mobile-390x844.png')});

    await leo.page.getByRole('button',{name:'I paid Mina'}).click();
    await expectCard(leo.page,'marked_paid','Marked paid');
    await expect(leo.page.getByText('Waiting for Mina to confirm')).toBeVisible();
    await expectOnePrimary(leo.page,null);
    await leo.page.screenshot({path:path.join(proofDir,'04-marked-paid-mobile-390x844.png')});

    await expectCard(mina.page,'needs_confirmation','Needs confirmation');
    await expect(mina.page.getByRole('button',{name:'Confirm received from Leo'})).toBeVisible();
    await mina.page.screenshot({path:path.join(proofDir,'05-receiver-confirm-desktop-1280x720.png')});
    await mina.page.getByRole('button',{name:'Confirm received from Leo'}).click();
    await expect(mina.page.getByText('Received',{exact:true})).toBeVisible();

    bus.setOnline('nina',false);
    await nina.page.getByRole('button',{name:'I paid Mina'}).click();
    await expectCard(nina.page,'sending','Saved offline');
    await expectOnePrimary(nina.page,'Try again');
    await nina.page.screenshot({path:path.join(proofDir,'06-offline-mobile-390x844.png')});
    bus.setOnline('nina',true);
    await nina.page.getByRole('button',{name:'Try again'}).click();
    await expectCard(nina.page,'marked_paid','Marked paid');
    await mina.page.getByRole('button',{name:'Confirm received from Nina'}).click();

    await expectCard(mina.page,'ready_to_close','Everyone settled');
    await expectOnePrimary(mina.page,'Close and save');
    await mina.page.screenshot({path:path.join(proofDir,'07-ready-close-desktop-1280x720.png')});
    await mina.page.getByRole('button',{name:'Close and save'}).click();

    for(const participant of [mina,leo,nina]){
      await expectCard(participant.page,'closed','Saved');
      await expect(participant.page.getByText('CHF 120.00')).toBeVisible();
      await expect(participant.page.getByText('2 received · 3 people')).toBeVisible();
      await expect(participant.page.getByRole('button',{name:'Close and save'})).toHaveCount(0);
    }
    await mina.page.screenshot({path:path.join(proofDir,'08-saved-desktop-1280x720.png')});
    await nina.page.screenshot({path:path.join(proofDir,'09-saved-mobile-390x844.png')});

    await nina.page.reload(); await openJourney(nina.page);
    await expectCard(nina.page,'closed','Saved');
    expect(bus.events().filter(event=>event.eventType==='GROUP_CLOSED')).toHaveLength(1);

    const observations={
      schemaVersion:1,
      journey:'Mina reviews one CHF 120 dinner, Leo and Nina act, Mina confirms and saves one record.',
      oneNextAction:'Scan a receipt',
      previewLabelVisible:false,
      previewCreatedMoneyState:false,
      lifecycleStates:['payment_requested','marked_paid','needs_confirmation','sending','ready_to_close','closed'],
      amount:'CHF 120.00',
      members:['Mina','Leo','Nina'],
      closedEventCount:bus.events().filter(event=>event.eventType==='GROUP_CLOSED').length,
      infrastructureLanguageVisible:false,
      viewports:['1280x720','390x844'],
      screenshotCount:9,
    };
    await writeFile(observationsPath,`${JSON.stringify(observations,null,2)}\n`,'utf8');
  }finally{await Promise.allSettled([mina.context.close(),leo.context.close(),nina.context.close()])}
});

test('actual App gives loading and unavailable states clear safe stops',async({browser})=>{
  const loading=await browser.newPage({viewport:{width:390,height:844}});
  await loading.goto(`${baseUrl}/tests/fixtures/candidateBatch5HardStatesApp.html?state=loading`);
  await loading.getByRole('button',{name:'Continue as guest'}).click();
  await expect(loading.getByRole('heading',{name:'Opening your dinner…'})).toBeVisible();
  await expect(loading.getByTestId('spending-card-loading')).toBeVisible();
  await loading.screenshot({path:path.join(proofDir,'10-loading-mobile-390x844.png')});
  await loading.close();

  const unavailable=await browser.newPage({viewport:{width:390,height:844}});
  await unavailable.goto(`${baseUrl}/tests/fixtures/candidateBatch5HardStatesApp.html?state=unavailable`);
  await unavailable.getByRole('button',{name:'Continue as guest'}).click();
  await expect(unavailable.getByRole('heading',{name:'This dinner can’t be opened'})).toBeVisible();
  await expectCard(unavailable,'unavailable','Unavailable');
  await expectOnePrimary(unavailable,'Close');
  await unavailable.screenshot({path:path.join(proofDir,'11-unavailable-mobile-390x844.png')});
  await unavailable.close();
});

async function expectCard(page:Page,state:string,status:string){
  const card=page.getByTestId('spending-group-card');
  await expect(card).toHaveAttribute('data-card-state',state);
  await expect(card.getByText(status,{exact:true}).first()).toBeVisible();
  if(state!=='unavailable')await expect(card.getByText('Mina',{exact:true})).toBeVisible();
  await expect(card.locator('text=/\\b(?:protocol|native|host|adapter|Statement Store|Bulletin)\\b/i')).toHaveCount(0);
}

async function expectOnePrimary(page:Page,name:string|null){
  const primary=page.locator('[data-primary-action="true"]:visible');
  await expect(primary).toHaveCount(name?1:0);
  if(name)await expect(primary).toHaveAccessibleName(new RegExp(name,'u'));
}

async function expectActionInViewport(page:Page,name:string){
  const button=page.getByRole('button',{name});
  const box=await button.boundingBox(); const shell=await page.locator('.app-shell-frame').boundingBox();
  expect(box).not.toBeNull(); expect(shell).not.toBeNull();
  expect((box?.y??0)+(box?.height??0)).toBeLessThanOrEqual((shell?.y??0)+(shell?.height??0));
}

async function actor(browser:Browser,bus:BrowserDinnerBus,id:ActorId,viewport:{width:number;height:number}):Promise<Actor>{
  const context=await browser.newContext({viewport}); const page=await context.newPage();
  await page.addInitScript(actorId=>{(window as any).__B4_ACTOR_CONFIG__={actorId}},id);
  await page.exposeBinding('__b4Load',async(_source,groupId:string)=>bus.load(id,groupId));
  await page.exposeBinding('__b4Publish',async(_source,event:CanonicalEventV1)=>bus.publish(id,event));
  bus.add(id,page); await page.goto(`${baseUrl}/tests/fixtures/candidateBatch4FullLoopApp.html`);
  return{id,context,page};
}

async function openJourney(page:Page){await page.getByRole('button',{name:'Continue as guest'}).click()}

class BrowserDinnerBus{
  private rows:CanonicalEventV1[]=[]; private pages=new Map<ActorId,Page>();
  private online=new Map<ActorId,boolean>([['mina',true],['leo',true],['nina',true]]);
  add(id:ActorId,page:Page){this.pages.set(id,page)} setOnline(id:ActorId,value:boolean){this.online.set(id,value)} events(){return structuredClone(this.rows)}
  async load(id:ActorId,groupId:string){if(!this.online.get(id))throw new Error('delivery_offline');return structuredClone(this.rows.filter(row=>row.groupId===groupId))}
  async publish(id:ActorId,event:CanonicalEventV1){
    if(!this.online.get(id))throw new Error('delivery_offline');
    if(!this.rows.some(row=>row.eventId===event.eventId))this.rows.push(structuredClone(event));
    await Promise.all([...this.pages.entries()].filter(([peer])=>peer!==id&&this.online.get(peer)).map(async([,page])=>{if(!page.isClosed())await page.evaluate(row=>window.__B4_RECEIVE__?.(row),event).catch(()=>undefined)}));
  }
}
