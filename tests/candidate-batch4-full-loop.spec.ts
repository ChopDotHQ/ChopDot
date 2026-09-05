import {mkdir} from 'node:fs/promises';
import path from 'node:path';
import {expect,test,type Browser,type BrowserContext,type Page} from '@playwright/test';
import type {CanonicalEventV1} from '../src/core/moneyEventKernel.ts';
import {releaseEvidencePath} from './support/releaseEvidencePath.ts';

const proofDir=releaseEvidencePath('candidate-batch4-full-loop');
const baseUrl=process.env.AUTHORITY_KEY_TEST_BASE_URL??'http://127.0.0.1:4177';
type ActorId='mina'|'leo'|'nina';
type Actor={id:ActorId;context:BrowserContext;page:Page};

test.beforeAll(async()=>{await mkdir(proofDir,{recursive:true})});

test('actual App completes receipt-first Mina Leo Nina loop with offline restart and immutable recovered record',async({browser})=>{
  const bus=new BrowserDinnerBus();
  const mina=await actor(browser,bus,'mina',{width:1280,height:720});
  const leo=await actor(browser,bus,'leo',{width:390,height:844});
  let nina=await actor(browser,bus,'nina',{width:390,height:844});
  try{
    await openJourney(mina.page);
    await mina.page.screenshot({path:path.join(proofDir,'01-mina-catch-desktop-1280x720.png')});
    await openJourney(leo.page);
    await openJourney(nina.page);

    await mina.page.getByLabel('Choose dinner receipt').setInputFiles({name:'zurich-dinner.txt',mimeType:'text/plain',buffer:Buffer.from('Zurich Dinner\nTotal CHF 120.00')});
    await expect(mina.page.getByRole('heading',{name:'Review this spend'})).toBeVisible();
    await expect(mina.page.getByLabel('Dinner total')).toHaveValue('120.00');
    await mina.page.screenshot({path:path.join(proofDir,'02-mina-review-desktop-1280x720.png')});
    await mina.page.getByRole('button',{name:'Send requests'}).click();

    await expect(leo.page.getByRole('heading',{name:'Pay Mina CHF 40.00'})).toBeVisible();
    await expect(nina.page.getByRole('heading',{name:'Pay Mina CHF 40.00'})).toBeVisible();
    await leo.page.screenshot({path:path.join(proofDir,'03-leo-request-mobile-390x844.png')});

    await leo.page.getByRole('button',{name:'I paid Mina'}).click();
    await expect(mina.page.getByRole('heading',{name:'Confirm what arrived'})).toBeVisible();
    await mina.page.getByRole('button',{name:'Confirm received from Leo'}).click();

    bus.setOnline('nina',false);
    await nina.page.getByRole('button',{name:'I paid Mina'}).click();
    await expect(nina.page.getByRole('heading',{name:'We’ll send this when you’re back online'})).toBeVisible();
    await nina.page.screenshot({path:path.join(proofDir,'04-nina-offline-mobile-390x844.png')});
    const saved=await nina.context.storageState();
    await nina.context.close();
    bus.remove('nina');

    bus.setOnline('nina',true);
    nina=await actor(browser,bus,'nina',{width:390,height:844},saved);
    await openJourney(nina.page);
    await expect(nina.page.getByRole('heading',{name:'Marked as paid'})).toBeVisible();
    await expect(mina.page.getByRole('button',{name:'Confirm received from Nina'})).toBeVisible();
    await mina.page.getByRole('button',{name:'Confirm received from Nina'}).click();
    await expect(mina.page.getByRole('heading',{name:'Everyone is settled'})).toBeVisible();
    await mina.page.screenshot({path:path.join(proofDir,'05-mina-ready-close-desktop-1280x720.png')});
    await mina.page.getByRole('button',{name:'Close and save'}).click();

    for(const participant of [mina,leo,nina]){
      await expect(participant.page.getByText('Saved record')).toBeVisible();
      await expect(participant.page.getByText('CHF 120.00')).toBeVisible();
      await expect(participant.page.getByText('2 received · 3 people')).toBeVisible();
    }
    await mina.page.screenshot({path:path.join(proofDir,'06-saved-record-desktop-1280x720.png')});
    await nina.page.screenshot({path:path.join(proofDir,'07-saved-record-mobile-390x844.png')});

    await nina.page.reload();
    await openJourney(nina.page);
    await expect(nina.page.getByText('Saved record')).toBeVisible();
    const before=bus.eventCount();
    await expect(nina.page.getByRole('button',{name:'Close and save'})).toHaveCount(0);
    await nina.page.reload();
    await openJourney(nina.page);
    expect(bus.eventCount()).toBe(before);
    expect(bus.events().filter(event=>event.eventType==='GROUP_CLOSED')).toHaveLength(1);
  }finally{
    await Promise.allSettled([mina.context.close(),leo.context.close(),nina.context.close()]);
  }
});

test('actual App keeps receipt parsing draft-only and wrong roles have no receiver or close controls',async({browser})=>{
  const bus=new BrowserDinnerBus();
  const mina=await actor(browser,bus,'mina',{width:390,height:844});
  const leo=await actor(browser,bus,'leo',{width:390,height:844});
  try{
    await openJourney(mina.page); await openJourney(leo.page);
    await mina.page.getByLabel('Choose dinner receipt').setInputFiles({name:'blurry-photo.png',mimeType:'image/png',buffer:Buffer.from('not an image')});
    await expect(mina.page.getByRole('alert')).toContainText('couldn’t read the total');
    expect(bus.eventCount()).toBe(0);
    await expect(leo.page.getByRole('button',{name:/Confirm received/u})).toHaveCount(0);
    await expect(leo.page.getByRole('button',{name:'Close and save'})).toHaveCount(0);
    await mina.page.screenshot({path:path.join(proofDir,'08-receipt-correction-mobile-390x844.png')});
  }finally{await Promise.allSettled([mina.context.close(),leo.context.close()])}
});

async function actor(browser:Browser,bus:BrowserDinnerBus,id:ActorId,viewport:{width:number;height:number},storageState?:Awaited<ReturnType<BrowserContext['storageState']>>):Promise<Actor>{
  const context=await browser.newContext({viewport,storageState});
  const page=await context.newPage();
  await page.addInitScript(actorId=>{(window as any).__B4_ACTOR_CONFIG__={actorId}},id);
  await page.exposeBinding('__b4Load',async(_source,groupId:string)=>bus.load(id,groupId));
  await page.exposeBinding('__b4Publish',async(_source,event:CanonicalEventV1)=>bus.publish(id,event));
  bus.add(id,page);
  await page.goto(`${baseUrl}/tests/fixtures/candidateBatch4FullLoopApp.html`);
  return{id,context,page};
}

async function openJourney(page:Page){
  await expect(page.getByRole('button',{name:'Continue as guest'})).toBeVisible();
  await page.getByRole('button',{name:'Continue as guest'}).click();
}

class BrowserDinnerBus{
  private rows:CanonicalEventV1[]=[];
  private pages=new Map<ActorId,Page>();
  private online=new Map<ActorId,boolean>([['mina',true],['leo',true],['nina',true]]);
  add(id:ActorId,page:Page){this.pages.set(id,page)}
  remove(id:ActorId){this.pages.delete(id)}
  setOnline(id:ActorId,value:boolean){this.online.set(id,value)}
  eventCount(){return this.rows.length}
  events(){return structuredClone(this.rows)}
  async load(id:ActorId,groupId:string){if(!this.online.get(id))throw new Error('delivery_offline');return structuredClone(this.rows.filter(row=>row.groupId===groupId))}
  async publish(id:ActorId,event:CanonicalEventV1){
    if(!this.online.get(id))throw new Error('delivery_offline');
    if(!this.rows.some(row=>row.eventId===event.eventId))this.rows.push(structuredClone(event));
    await Promise.all([...this.pages.entries()].filter(([peer])=>peer!==id&&this.online.get(peer)).map(async([,page])=>{
      if(page.isClosed())return;
      await page.evaluate(row=>window.__B4_RECEIVE__?.(row),event).catch(()=>undefined);
    }));
  }
}
