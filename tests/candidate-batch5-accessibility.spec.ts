import {expect,test,type Page} from '@playwright/test';

const appUrl=process.env.AUTHORITY_KEY_TEST_BASE_URL??'http://127.0.0.1:4177';

for(const viewport of [{width:1280,height:720,name:'desktop'},{width:390,height:844,name:'mobile'}]){
  test(`${viewport.name} entrance has semantic structure, one action, and usable targets`,async({page})=>{
    await page.setViewportSize(viewport); await page.goto(appUrl);
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('heading',{level:1,name:'Start a group.'})).toBeVisible();
    await expect(page.locator('[data-primary-action="true"]:visible')).toHaveCount(1);
    expect(await automatedSemanticAudit(page)).toEqual([]);
    expect(await targetSizeViolations(page)).toEqual([]);
    expect(await page.locator('body').evaluate(element=>element.scrollWidth>element.clientWidth+1)).toBe(false);
  });
}

test('keyboard focus is visible and the first action works without a pointer',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await page.goto(appUrl);
  await page.keyboard.press('Tab');
  const focused=page.locator(':focus');
  await expect(focused).toHaveAccessibleName('Start a group');
  const focusStyle=await focused.evaluate(element=>{const style=getComputedStyle(element);return{outline:style.outlineStyle,width:style.outlineWidth,shadow:style.boxShadow}});
  expect(focusStyle.outline==='solid'||focusStyle.shadow!=='none').toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading',{name:'What should we call you?'})).toBeVisible();
});

test('200 percent equivalent reflow keeps content reachable without horizontal scrolling',async({page})=>{
  await page.setViewportSize({width:640,height:720}); await page.goto(appUrl);
  expect(await page.locator('body').evaluate(element=>element.scrollWidth>element.clientWidth+1)).toBe(false);
  const action=page.getByRole('button',{name:'Start a group'});
  await action.scrollIntoViewIfNeeded(); await expect(action).toBeVisible();
  await expect(page.getByRole('heading',{name:'Start a group.'})).toBeVisible();
});

test('reduced motion removes meaningful animation on the production entrypoint',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:390,height:844});
  await page.goto(appUrl);
  await expect(page.getByRole('heading',{name:'Start a group.'})).toBeVisible();
  const durations=await page.locator('body *').evaluateAll(elements=>elements.flatMap(element=>{
    const style=getComputedStyle(element);const box=element.getBoundingClientRect();
    if(style.display==='none'||style.visibility==='hidden'||box.width===0||box.height===0)return[];
    return[...style.animationDuration.split(','),...style.transitionDuration.split(',')];
  }));
  expect(durations.every(duration=>durationMs(duration.trim())<=1)).toBe(true);
});

test('core color pairs meet WCAG AA contrast',async()=>{
  const pairs=[
    ['#ffffff','#101014',4.5],
    ['#9ca3af','#101014',4.5],
    ['#ffffff','#e6007a',4.5],
    ['#111827','#f7f6f4',4.5],
    ['#14532d','#d9fbe8',4.5],
    ['#713f12','#fff0c2',4.5],
  ] as const;
  for(const[foreground,background,minimum]of pairs)expect(contrastRatio(foreground,background),`${foreground} on ${background}`).toBeGreaterThanOrEqual(minimum);
});

async function automatedSemanticAudit(page:Page):Promise<string[]>{
  return page.evaluate(()=>{
    const violations:string[]=[];
    const visible=(element:Element)=>{const style=getComputedStyle(element);const box=element.getBoundingClientRect();return style.visibility!=='hidden'&&style.display!=='none'&&box.width>0&&box.height>0};
    const h1=document.querySelectorAll('h1'); if(h1.length!==1)violations.push(`expected one h1, found ${h1.length}`);
    const ids=[...document.querySelectorAll('[id]')].map(element=>element.id); if(new Set(ids).size!==ids.length)violations.push('duplicate ids');
    for(const button of document.querySelectorAll('button'))if(visible(button)&&!(button.textContent?.trim()||button.getAttribute('aria-label')))violations.push('unnamed button');
    for(const input of document.querySelectorAll('input'))if(!input.getAttribute('aria-label')&&!document.querySelector(`label[for="${input.id}"]`)&&!input.closest('label'))violations.push('unlabelled input');
    for(const image of document.querySelectorAll('img'))if(!image.hasAttribute('alt'))violations.push('image without alt');
    if(document.querySelectorAll('[data-primary-action="true"]:not([hidden])').length!==1)violations.push('primary action count');
    return violations;
  });
}

async function targetSizeViolations(page:Page):Promise<string[]>{
  return page.evaluate(()=>[...document.querySelectorAll('button,a[href],input')].filter(element=>{
    const style=getComputedStyle(element);const box=element.getBoundingClientRect();
    if(style.visibility==='hidden'||style.display==='none'||box.width===0||box.height===0)return false;
    return box.width<44||box.height<44;
  }).map(element=>`${element.tagName.toLowerCase()}:${element.textContent?.trim()||element.getAttribute('aria-label')||'unnamed'}`));
}

function contrastRatio(foreground:string,background:string):number{
  const luminance=(hex:string)=>{const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]};
  const[a,b]=[luminance(foreground),luminance(background)].sort((left,right)=>right-left);return(a+.05)/(b+.05);
}

function durationMs(value:string):number{return value.endsWith('ms')?Number.parseFloat(value):Number.parseFloat(value)*1000}
