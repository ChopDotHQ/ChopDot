"""Exercise the exact standalone artifact with installed Chromium. No service calls."""
from pathlib import Path
import json, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
HTML=(ROOT/'v1-candidate.html').read_text()
checks=[]; layouts=[]; errors=[]; clicks=0

def click(page,action):
 global clicks
 page.locator('[data-action="'+action+'"]:visible').first.click();clicks+=1

def route(page):return page.locator('[data-route]').get_attribute('data-route')
def state(page):return page.evaluate('RequestDemo.state')
def scenario(page,name):page.evaluate('(n)=>RequestDemo.scenario(n)',name)
def check(name,view,fn):
 fn(); print('PASS',view,name,flush=True); checks.append({'name':name,'viewport':view,'passed':True})
def assert_eq(a,b):assert a==b,(a,b)
def run(page,view):
 def main():
  scenario(page,'compose'); before=state(page)['data'];click(page,'back');assert_eq(route(page),'handoff');click(page,'resume')
  page.locator('#request-note').fill('Thanks Marc — lovely weekend!');click(page,'review');assert_eq(route(page),'review');assert 'lovely weekend!' in page.locator('main').inner_text()
  click(page,'edit');assert_eq(page.locator('#request-note').input_value(),'Thanks Marc — lovely weekend!');click(page,'review');click(page,'send');page.wait_for_timeout(350);assert_eq(route(page),'detail');assert_eq(len(state(page)['requests']),1);assert_eq(state(page)['data'],before);assert 'Request sent.' in page.locator('main').inner_text()
  page.screenshot(path=str(ROOT/'visual-qa'/f'detail-sent-{view}.png'));click(page,'return');click(page,'resume');assert_eq(route(page),'detail')
 check('Compose, edit, send, return, resume; debt unchanged',view,main)
 def groups():
  scenario(page,'all');click(page,'sources');assert_eq(route(page),'sources');assert 'CHF 125.40' in page.locator('main').inner_text();assert_eq(page.locator('main .mp-row').count(),4);click(page,'back');assert_eq(route(page),'compose')
 check('Four-group source breakdown preserves scope',view,groups)
 def note():
  scenario(page,'compose');page.locator('#request-note').fill('<img src=x onerror=alert(1)> & thanks');click(page,'review');assert_eq(page.locator('main img').count(),0);assert '<img' in page.locator('.rq-message').inner_text()
 check('User note renders as literal text',view,note)
 def unknown():
  scenario(page,'unknown'); cid=state(page)['command']['id'];click(page,'recover');assert_eq(state(page)['command']['status'],'recovering');assert_eq(len(state(page)['requests']),0);click(page,'recover');assert_eq(len(state(page)['requests']),0)
  page.evaluate("RequestDemo.result('accepted')");assert_eq(route(page),'detail');assert_eq(state(page)['selected'],cid);assert_eq(state(page)['requests'][0]['delivery'],'queued');assert 'Request created.' in page.locator('main').inner_text()
 check('Unknown status recovery never manufactures success',view,unknown)
 def failed():
  scenario(page,'failed');cid=state(page)['command']['id'];click(page,'retry');page.wait_for_timeout(350);assert_eq(route(page),'detail');assert_eq(state(page)['selected'],cid);assert_eq(len(state(page)['requests']),1)
 check('Verified failure retry reuses command',view,failed)
 def duplicate():
  scenario(page,'duplicate');click(page,'open-existing');assert_eq(route(page),'detail');assert_eq(len(state(page)['requests']),1)
 check('Overlapping request opens existing record',view,duplicate)
 def offline():
  scenario(page,'offline');assert page.locator('[data-action="review"]').is_disabled();note=state(page)['note'];click(page,'demo');page.locator('#demo-dialog [data-result="reconnect"]').click();assert_eq(route(page),'compose');assert_eq(state(page)['note'],note);assert_eq(len(state(page)['requests']),0)
 check('Offline reconnect preserves draft and does not send',view,offline)
 def change():
  scenario(page,'compose');click(page,'review');click(page,'send');page.evaluate('RequestDemo.changeAmount(2000)');page.wait_for_timeout(350);assert_eq(route(page),'changed');assert_eq(len(state(page)['requests']),0);click(page,'refresh-review');assert 'CHF 20.00' in page.locator('main').inner_text();click(page,'review');assert_eq(state(page)['review']['amountMinor'],2000)
 check('Changed balance forces fresh review',view,change)
 def revoke():
  scenario(page,'compose');click(page,'review');click(page,'send');page.evaluate('RequestDemo.revoke()');page.wait_for_timeout(350);assert_eq(route(page),'unavailable');assert_eq(len(state(page)['requests']),0);click(page,'back');assert_eq(route(page),'unavailable')
 check('Access loss cannot expose old view or accept request',view,revoke)
 def withdrawal():
  scenario(page,'queued');before=state(page)['data'];click(page,'withdraw-review');click(page,'open-existing');assert_eq(route(page),'detail');page.evaluate("RequestDemo.configure({saveMode:'unknown'})");click(page,'withdraw-review');click(page,'withdraw');page.wait_for_timeout(350);assert_eq(route(page),'withdraw-unknown');click(page,'recover');assert_eq(state(page)['requests'][0]['status'],'active');page.evaluate("RequestDemo.result('accepted')");assert_eq(route(page),'withdrawn');assert_eq(state(page)['data'],before);assert 'CHF 30.00' in page.locator('main').inner_text();click(page,'back');assert_eq(route(page),'withdrawn')
 check('Withdraw, keep, unknown, confirmed removal; debt preserved',view,withdrawal)
 def wfailed():
  scenario(page,'withdraw-failed');cid=state(page)['command']['id'];click(page,'retry');page.wait_for_timeout(350);assert_eq(route(page),'withdrawn');assert_eq(state(page)['command']['id'],cid)
 check('Withdrawal failure retries same command',view,wfailed)
 def delivery():
  scenario(page,'delivery-failed');click(page,'retry-delivery');assert_eq(state(page)['requests'][0]['delivery'],'queued');assert_eq(len(state(page)['requests']),1);assert 'Not paid' in page.locator('main').inner_text()
 check('Delivery retry creates no second request or paid state',view,delivery)
 def currencies():
  scenario(page,'sam-chf');click(page,'review');assert 'CHF 91.10' in page.locator('main').inner_text();assert 'DOT' not in page.locator('main').inner_text();scenario(page,'sam-dot');click(page,'review');assert 'DOT 2.400000' in page.locator('main').inner_text();assert 'TWINT' not in page.locator('main').inner_text();assert_eq(state(page)['review']['sourceItems'],['sam-hackathon'])
 check('CHF and DOT never combined or assigned wrong preference',view,currencies)
 def nopay():
  scenario(page,'payment-progress');assert_eq(page.locator('[data-action="withdraw"]').count(),0);click(page,'payment');assert_eq(route(page),'handoff');click(page,'resume');assert_eq(route(page),'payment-progress');scenario(page,'paid');assert_eq(page.locator('[data-action="send"]').count(),0)
 check('Payment remains owned by J11/J12',view,nopay)
 def direction():
  scenario(page,'reverse');assert 'You owe Jeanine.' in page.locator('main').inner_text();click(page,'settle');assert 'CHF 54.30' in page.locator('main').inner_text();scenario(page,'zero');assert 'Nothing to request.' in page.locator('main').inner_text()
 check('Reverse and zero balances cannot produce a request',view,direction)
 # Every defined route; transient routes are captured with a real matching command.
 for target in page.evaluate('RequestModel.routes'):
  base={'detail':'queued','withdraw-confirm':'queued','withdrawing':'withdraw-unknown','withdraw-unknown':'withdraw-unknown','withdraw-failed':'withdraw-failed','withdrawn':'withdrawn','submitting':'unknown','unknown':'unknown','failed':'failed','duplicate':'duplicate','changed':'changed','nothing-due':'zero','unavailable':'issue','offline':'offline','payment-progress':'payment-progress','paid':'paid','loading':'loading','error':'error'}.get(target,'compose')
  scenario(page,base)
  if target=='review':click(page,'review')
  elif target=='sources':click(page,'sources')
  elif target=='withdraw-confirm':click(page,'withdraw-review')
  elif target=='handoff':click(page,'back')
  elif route(page)!=target:page.evaluate('(r)=>RequestDemo.go(r)',target)
  data=page.evaluate('''()=>{const q=s=>document.querySelector(s),b=e=>e.getBoundingClientRect(),head=b(q('header')),main=b(q('main')),foot=b(q('footer'));return {nonblank:q('main').innerText.trim().length>5,overflow:document.documentElement.scrollWidth>innerWidth,headerOverlap:main.top<head.bottom-1,footerOverlap:main.bottom>foot.top+1,footerVisible:foot.bottom<=innerHeight+1,clipped:[...q('main').children].filter(x=>b(x).right>main.right+1||b(x).left<main.left-1).length};}''')
  assert data['nonblank'] and not data['overflow'] and not data['headerOverlap'] and not data['footerOverlap'] and data['footerVisible'] and data['clipped']==0,(target,view,data)
  layouts.append({'route':target,'viewport':view,'passed':True,'actions':page.locator('[data-action]').evaluate_all('(es)=>es.map(e=>({action:e.dataset.action,label:e.textContent.trim(),disabled:e.disabled}))'),'copy':page.locator('main').inner_text(),**data})
  page.screenshot(path=str(ROOT/'visual-qa'/f'{target}-{view}.png'))
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(393,852),(430,890)]:
  page=browser.new_page(viewport={'width':w,'height':h});page.set_default_timeout(4000);page.on('pageerror',lambda e:errors.append(str(e)));page.set_content(HTML);assert_eq(page.title(),'ChopDot — Request Money V1');run(page,str(w));page.close()
 page=browser.new_page(viewport={'width':1440,'height':1000});page.set_content(HTML);assert page.locator('aside').is_visible();page.screenshot(path=str(ROOT/'visual-qa/desktop.png'));page.close();browser.close()
assert not errors,errors
result={'ok':True,'artifact_sha256':hashlib.sha256(HTML.encode()).hexdigest(),'browser':'Installed Chromium via Playwright','method':'inline HTML; file navigation blocked by browser administration policy','viewports':[[393,852],[430,890],[1440,1000]],'scenarios':len(checks),'product_clicks':clicks,'layout_checks':len(layouts),'checks':checks,'layouts':layouts,'page_errors':errors}
(ROOT/'visual-qa/browser-qa.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['checks','layouts']},indent=2))
