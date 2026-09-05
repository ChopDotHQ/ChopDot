from pathlib import Path
import json, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];HTML=(ROOT/'v1-candidate.html').read_text()
checks=[];layouts=[];errors=[];clicks=0

def click(p,a):
 global clicks
 p.locator('[data-action="'+a+'"]:visible').first.click();clicks+=1

def route(p):return p.locator('[data-route]').get_attribute('data-route')
def state(p):return p.evaluate('ReceiveDemo.state')
def scenario(p,n):p.evaluate('(n)=>ReceiveDemo.scenario(n)',n)
def eq(a,b):assert a==b,(a,b)
def check(name,v,fn):fn();checks.append({'name':name,'viewport':v,'passed':True});print('PASS',v,name,flush=True)
def run(p,v):
 def main():
  scenario(p,'methods');before=state(p)['ledger'];click(p,'method:dev-twint');click(p,'start-share');click(p,'audience:marc');eq(route(p),'review');assert '24 hours' in p.locator('main').inner_text();click(p,'prepare');eq(route(p),'preparing');p.wait_for_timeout(330);eq(route(p),'ready');eq(state(p)['ledger'],before);click(p,'code');assert p.locator('.rc-code svg').is_visible();eq(state(p)['records'][0]['payload']['audience'],'marc');click(p,'ready');click(p,'recipient');assert 'Dev · demo' in p.locator('main').inner_text();click(p,'ready');eq(route(p),'ready')
 check('Choose, review, create, show code, recipient preview, return',v,main)
 def back():
  scenario(p,'methods');click(p,'method:dev-bank');click(p,'start-share');click(p,'back');eq(route(p),'details');assert 'IBAN' in p.locator('main').inner_text();click(p,'back');eq(route(p),'methods')
 check('Header Back returns without an oscillating route loop',v,back)
 def request():
  scenario(p,'request');ctx=state(p)['context'];click(p,'start-share');eq(route(p),'review');assert 'CHF 30.00' in p.locator('main').inner_text();click(p,'prepare');p.wait_for_timeout(330);click(p,'recipient');assert 'CHF 30.00' in p.locator('main').inner_text();click(p,'ready');click(p,'exit');eq(route(p),'boundary');assert 'CHF 30.00' in p.locator('main').inner_text();click(p,'resume');eq(route(p),'ready');eq(state(p)['context'],ctx)
 check('Request returns preserve Marc, CHF 30.00 and source items',v,request)
 def currency():
  scenario(p,'request');click(p,'methods');eq(p.locator('[data-action="method:dev-wallet"]').count(),0);scenario(p,'wallet');assert 'DOT' in p.locator('main').inner_text();assert 'Demo network A' in p.locator('main').inner_text();click(p,'start-share');click(p,'audience:sam');click(p,'prepare');p.wait_for_timeout(330);eq(state(p)['records'][0]['payload']['currency'],'DOT');eq(state(p)['records'][0]['payload']['network'],'Demo network A')
 check('Currency filtering and exact wallet network retained',v,currency)
 def other():
  scenario(p,'settlement');ctx=state(p)['context'];assert 'Jeanine' in p.locator('main').inner_text();eq(p.locator('[data-action="start-share"]').count(),0);click(p,'exit');eq(route(p),'boundary');assert 'CHF 54.30' in p.locator('main').inner_text();click(p,'resume');eq(route(p),'details');eq(state(p)['context'],ctx);click(p,'copy-review');assert 'Jeanine' in p.locator('#copy-text').input_value()
 check('Other-owner details do not grant sharing authority; return to payment',v,other)
 def unknown():
  scenario(p,'unknown');id=state(p)['command']['id'];click(p,'recover');click(p,'recover');eq(state(p)['command']['status'],'recovering');eq(state(p)['records'],[]);click(p,'back');eq(route(p),'boundary');eq(state(p)['command']['id'],id);click(p,'resume');eq(route(p),'recovery');p.evaluate("ReceiveDemo.result('accepted')");eq(route(p),'ready');eq(state(p)['records'][0]['commandId'],id)
 check('Unknown outcome needs recovery, not a second creation',v,unknown)
 def retry():
  scenario(p,'failed');id=state(p)['command']['id'];click(p,'retry');p.wait_for_timeout(330);eq(route(p),'ready');eq(state(p)['records'][0]['commandId'],id);eq(len(state(p)['records']),1)
 check('Verified failure reuses exact command and scope',v,retry)
 def stop():
  scenario(p,'ready');before=state(p)['ledger'];click(p,'stop-confirm');click(p,'ready');eq(state(p)['records'][0]['status'],'active');click(p,'stop-confirm');click(p,'stop');p.wait_for_timeout(330);eq(route(p),'stopped');eq(state(p)['ledger'],before);p.evaluate("ReceiveDemo.go('code')");eq(route(p),'stopped')
 check('Stop requires confirmation; records, requests and balances survive',v,stop)
 def stop_unknown():
  scenario(p,'stopUnknown');click(p,'recover');eq(state(p)['records'][0]['status'],'active');eq(p.locator('.rc-code').count(),0);p.evaluate("ReceiveDemo.result('not-saved')");eq(route(p),'failed');id=state(p)['command']['id'];click(p,'retry');p.wait_for_timeout(330);eq(route(p),'stopped');eq(state(p)['command']['id'],id)
 check('Unknown stop does not claim access stopped; safe retry',v,stop_unknown)
 def expiry():
  scenario(p,'ready');click(p,'code');p.evaluate('ReceiveDemo.expire()');eq(route(p),'expired');eq(p.locator('.rc-code svg').count(),0);click(p,'back');eq(route(p),'expired');click(p,'refresh');eq(route(p),'methods');eq(len(state(p)['records']),1)
 check('Expired QR cannot be resurrected by Back',v,expiry)
 def changed():
  scenario(p,'ready');click(p,'code');p.evaluate('ReceiveDemo.changeDestination()');eq(route(p),'changed');eq(p.locator('.rc-code svg').count(),0);click(p,'refresh');eq(route(p),'methods')
 check('Changed receiving details invalidate previous code',v,changed)
 def revoke():
  scenario(p,'ready');click(p,'code');p.evaluate('ReceiveDemo.revoke()');eq(route(p),'unavailable');assert 'DEMO +41' not in p.locator('main').inner_text();click(p,'safe-exit');eq(route(p),'boundary');assert 'TWINT' not in p.locator('main').inner_text();click(p,'resume');eq(route(p),'unavailable')
 check('Access loss scrubs details and blocks Back',v,revoke)
 def copy():
  scenario(p,'bank');p.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.lastCopied=text}}})")
  click(p,'copy-review');expected=p.locator('#copy-text').input_value();click(p,'copy-raw');p.wait_for_timeout(20);eq(p.evaluate('lastCopied'),expected);eq(state(p)['copyState'],'copied');assert 'DEMO CH00' in expected;assert 'marc-zurich' not in expected
 check('Copy writes precisely the reviewed demo receiving details',v,copy)
 def copy_failure():
  scenario(p,'bank');p.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied')}}})");click(p,'copy-review');click(p,'copy-raw');p.wait_for_timeout(20);eq(state(p)['copyState'],'failed');assert 'Select the text' in p.locator('main').inner_text();eq(p.locator('#copy-text').get_attribute('readonly'),'')
 check('Clipboard denial gives honest selectable-text fallback',v,copy_failure)
 def share():
  for action,expected in [('share-done','returned'),('share-cancel','cancelled'),('share-fail','failed')]:
   scenario(p,'ready');before=state(p)['ledger'];id=state(p)['selected'];click(p,'share-preview');click(p,action);eq(route(p),'share-return');eq(state(p)['shareResult'],expected);assert 'Not confirmed' in p.locator('main').inner_text();click(p,'ready');eq(state(p)['selected'],id);eq(state(p)['ledger'],before)
 check('External handoff, cancellation and failure never assert delivery or payment',v,share)
 def offline():
  scenario(p,'offline');assert 'DEMO +41' not in p.locator('main').inner_text();click(p,'demo');p.locator('#demo-dialog [data-result="reconnect"]').click();eq(route(p),'methods');eq(state(p)['records'],[])
 check('Reconnect does not automatically share stale details',v,offline)
 def malicious():
  scenario(p,'bank');p.evaluate("ReceiveDemo.configure({destinations:ReceiveDemo.state.destinations.map(d=>({...d,fields:d.fields.map(f=>[f[0],'<img src=x onerror=alert(1)>'])}))})");eq(p.locator('main img').count(),0);assert '<img' in p.locator('main').inner_text()
 check('External destination text is escaped, not executable HTML',v,malicious)
 def browser_back():
  scenario(p,'methods');click(p,'method:dev-bank');click(p,'start-share');click(p,'audience:marc');p.evaluate('history.back()');p.wait_for_timeout(30);eq(route(p),'audience');p.evaluate('history.back()');p.wait_for_timeout(30);eq(route(p),'details');assert 'IBAN' in p.locator('main').inner_text()
 check('Browser Back preserves the selected bank destination',v,browser_back)
 for target in p.evaluate('ReceiveModel.routes'):
  base={'methods':'methods','details':'bank','audience':'methods','review':'bank','preparing':'bank','recovery':'unknown','failed':'failed','ready':'ready','code':'ready','expired':'expired','stop-confirm':'ready','stopping':'ready','stopped':'stopped','changed':'changed','unavailable':'access','empty':'empty','offline':'offline','copy-review':'bank','share-preview':'ready','share-return':'ready','recipient':'ready','boundary':'request'}[target]
  scenario(p,base)
  if target=='audience':click(p,'method:dev-twint');click(p,'start-share')
  elif target in ['review','preparing']:
   click(p,'start-share');click(p,'audience:marc')
   if target=='preparing':p.evaluate("ReceiveDemo.configure({saveMode:'unknown'})");click(p,'prepare')
  elif target=='stopping':click(p,'stop-confirm');click(p,'stop')
  elif target=='share-return':click(p,'share-preview');click(p,'share-done')
  elif target=='boundary':click(p,'back')
  elif route(p)!=target:click(p,target)
  eq(route(p),target)
  data=p.evaluate('''()=>{const q=s=>document.querySelector(s),b=e=>e.getBoundingClientRect(),head=b(q('header')),main=b(q('main')),foot=b(q('footer'));return {nonblank:q('main').innerText.trim().length>5,overflow:document.documentElement.scrollWidth>innerWidth,headerOverlap:main.top<head.bottom-1,footerOverlap:main.bottom>foot.top+1,footerVisible:foot.bottom<=innerHeight+1,clipped:[...q('main').children].filter(x=>b(x).right>main.right+1||b(x).left<main.left-1).length,missingIcons:[...q('main').querySelectorAll('svg')].filter(x=>!x.getAttribute('viewBox')).length};}''')
  assert data['nonblank'] and not data['overflow'] and not data['headerOverlap'] and not data['footerOverlap'] and data['footerVisible'] and data['clipped']==0 and data['missingIcons']==0,(target,v,data)
  layouts.append({'route':target,'viewport':v,'passed':True,'actions':p.locator('[data-action]').evaluate_all('(es)=>es.map(e=>({action:e.dataset.action,label:e.textContent.trim(),disabled:e.disabled}))'),'copy':p.locator('main').inner_text(),**data})
  p.screenshot(path=str(ROOT/'visual-qa'/f'{target}-{v}.png'))
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(393,852),(430,890)]:
  p=browser.new_page(viewport={'width':w,'height':h});p.set_default_timeout(4000);p.on('pageerror',lambda e:errors.append(str(e)));p.set_content(HTML);eq(p.title(),'ChopDot — Receive / Share Payment Details V1');run(p,str(w));p.close()
 p=browser.new_page(viewport={'width':1440,'height':1000});p.set_content(HTML);assert p.locator('aside').is_visible();p.screenshot(path=str(ROOT/'visual-qa/desktop.png'));p.close();browser.close()
assert not errors,errors
result={'ok':True,'artifact_sha256':hashlib.sha256(HTML.encode()).hexdigest(),'browser':'Installed Chromium via Playwright','method':'inline HTML; native file navigation returned net::ERR_BLOCKED_BY_ADMINISTRATOR','browser_plugin':'not available','viewports':[[393,852],[430,890],[1440,1000]],'scenarios':len(checks),'product_clicks':clicks,'layout_checks':len(layouts),'checks':checks,'layouts':layouts,'page_errors':errors}
(ROOT/'visual-qa/browser-qa.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['checks','layouts']},indent=2))
