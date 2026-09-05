from pathlib import Path
import json, hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'v1-candidate.html'
QA=ROOT/'visual-qa';QA.mkdir(exist_ok=True)
results=[];errors=[];layouts=[];screens=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(393,852),(430,890)]:
  page=b.new_page(viewport={'width':w,'height':h})
  page.on('pageerror',lambda err:errors.append(str(err)))
  page.set_content(ART.read_text(),wait_until='load');page.wait_for_selector('#entry-screen h1')
  def route(expected):
   actual=page.locator('#entry-screen').get_attribute('data-state'); assert actual==expected,(actual,expected)
  def click(action):page.locator('#entry-screen [data-action="'+action+'"]').first.click()
  def dispatch(action,data={}):page.evaluate('([a,p])=>EntryDemo.dispatch(a,p)',[action,data])
  def fixture(name):page.evaluate('(n)=>EntryDemo.fixture(n)',name)
  def snap(name):
   page.screenshot(path=str(QA/f'{name}-{w}x{h}.png'))
   screens.append(f'{name}-{w}x{h}.png')
  def test(name,fn):fn();results.append({'name':name,'viewport':f'{w}x{h}','passed':True})
  def email(value):
   page.locator('#email').fill(value);page.locator('#entry-screen button[type=submit]').click()
  def code(value):
   page.locator('#code').fill(value);page.locator('#entry-screen button[type=submit]').click()
  def new_person():
   fixture('new');route('welcome');snap('welcome');click('EMAIL');route('email');snap('email');email('alex@example.com');route('code');snap('code');code('000000');route('code');assert not page.evaluate('EntryDemo.get().verified');snap('invalid-code');code('123456');route('profile');snap('profile');page.locator('#name').fill('Alex');page.locator('#entry-screen button[type=submit]').click();route('ready');assert page.locator('.entry-name').inner_text()=='Alex';snap('ready-new');click('OPEN_DESTINATION');route('home-reference');page.evaluate('history.back()');page.wait_for_timeout(150);route('ready');assert 'Alex' in page.locator('#entry-screen').inner_text()
  test('New email sign-in, code error, name, Home reference and browser Back',new_person)
  def returning():
   fixture('returning');email('dev@example.com');code('123456');route('ready');assert 'Dev' in page.locator('#entry-screen').inner_text();assert not page.evaluate('EntryDemo.get().isNew');snap('ready-returning')
  test('Returning person skips profile',returning)
  def invitation():
   fixture('invite');snap('invite');click('EMAIL');email('sam@example.com');code('123456');page.locator('#name').fill('Sam');page.locator('#entry-screen button[type=submit]').click();route('ready');snap('ready-invite');assert not page.evaluate('EntryDemo.get().joined');click('OPEN_DESTINATION');route('invite-reference');page.wait_for_timeout(150);assert 'Geneva Weekend' in page.frame_locator('#golden-frame').locator('#join').inner_text();page.evaluate('history.back()');page.wait_for_timeout(150);route('ready');assert page.evaluate('EntryDemo.get().destination')=='invite'
  test('Invite retained through authentication; no automatic join; return',invitation)
  def expires():
   fixture('expired');code('123456');route('code');assert 'expired' in page.locator('.entry-error').inner_text();snap('expired-code');click('RESEND');code('123456');route('profile')
  test('Expired code requires a new code',expires)
  def offline():
   fixture('offline');snap('offline');click('RETRY_CONNECTION');route('offline');page.evaluate("document.querySelector('[data-online=true]').click()");click('RETRY_CONNECTION');route('email');assert page.evaluate('EntryDemo.get().destination')=='invite'
  test('Offline retry preserves invite without fake sign-in',offline)
  def wallet():
   fixture('invite');click('WALLET');snap('wallet');page.locator('[data-account=Everyday]').click();route('approval-waiting');snap('approval-waiting');click('REFRESH_APPROVAL');assert not page.evaluate('EntryDemo.get().verified');page.evaluate("document.querySelector('[data-demo-result=unknown]').click()");route('approval-unknown');snap('approval-unknown');click('REFRESH_APPROVAL');route('approval-unknown');page.evaluate("document.querySelector('[data-demo-result=approved]').click()");route('ready');assert page.evaluate('EntryDemo.get().destination')=='invite'
  test('Wallet approval request and read-only refresh; verified test result',wallet)
  def rejection():
   fixture('wallet');page.locator('[data-account=Everyday]').click();page.evaluate("document.querySelector('[data-demo-result=declined]').click()");route('approval-declined');snap('approval-declined');click('REQUEST_APPROVAL');route('approval-waiting');page.evaluate("document.querySelector('[data-demo-result=expired]').click()");route('approval-expired');snap('approval-expired');click('CANCEL_APPROVAL');route('wallet');assert not page.evaluate('EntryDemo.get().verified')
  test('Wallet rejection, new request, expiration and cancel',rejection)
  def reauth():
   fixture('reauth');snap('session-expired');click('EMAIL');email('other@example.com');code('123456');route('wrong-account');snap('wrong-account');click('BACK_TO_EMAIL');email('dev@example.com');code('123456');route('ready');assert page.evaluate('EntryDemo.get().destination')=='invite'
  test('Expired session rejects wrong identity without losing destination',reauth)
  def guard():
   fixture('new');dispatch('NAVIGATE',{'route':'ready'});route('welcome');dispatch('NAVIGATE',{'route':'invite-reference'});route('welcome')
  test('Protected destinations do not open when signed out',guard)
  # Layout-only state fixtures; independent from the tested interaction paths above.
  for state in page.evaluate('EntryModel.STATES'):
   fixture('ready')
   dispatch('NAVIGATE',{'route':state});route(state);page.wait_for_timeout(40)
   m=page.evaluate('''()=>{const s=document.querySelector('#entry-screen'),h=s.querySelector('header'),c=s.querySelector('main,.entry-refwrap'),f=s.querySelector('footer');const r=x=>x.getBoundingClientRect();return {nonblank:!!s.innerText.trim(),width:innerWidth,overflow:document.body.scrollWidth>innerWidth,headerOverlap:r(h).bottom>r(c).top+.5,footerOverlap:r(c).bottom>r(f).top+.5,clipped:[...s.querySelectorAll('.card,.primary,.secondary,.entry-input')].filter(x=>r(x).left<-.5||r(x).right>innerWidth+.5).length};}''')
   assert m['nonblank'] and not any([m['overflow'],m['headerOverlap'],m['footerOverlap'],m['clipped']]),(state,m)
   layouts.append({'state':state,'viewport':f'{w}x{h}','passed':True,**m})
  page.close()
 # Desktop reviewer interface
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_content(ART.read_text(),wait_until='load');page.wait_for_timeout(100);page.screenshot(path=str(QA/'desktop.png'));assert page.locator('.labpanel').is_visible();page.close();b.close()
assert not errors,errors
report={'ok':True,'artifact_sha256':hashlib.sha256(ART.read_bytes()).hexdigest(),'browser':'Playwright Chromium (Browser plugin not available)','viewports':['393x852','430x890'],'desktop':'1440x1000','scenarios':len(results),'layout_checks':len(layouts),'page_errors':errors,'checks':results,'layouts':layouts,'screenshots':screens}
(QA/'browser-qa.json').write_text(json.dumps(report,indent=2));print(json.dumps({k:v for k,v in report.items() if k not in ['checks','layouts','screenshots']},indent=2))
