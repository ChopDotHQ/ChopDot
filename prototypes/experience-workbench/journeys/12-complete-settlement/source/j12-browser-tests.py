from playwright.sync_api import sync_playwright
from pathlib import Path
import json,sys,hashlib
W,H=(int(sys.argv[1]),int(sys.argv[2])) if len(sys.argv)>1 else (393,852)
BASE=Path(__file__).resolve().parents[1]; QA=BASE/'chopdot-j12-continuity-qa';QA.mkdir(exist_ok=True)
HTML=(BASE/'v1.1-continuity-candidate.html').read_text()
results=[];errors=[];steps=[]; captures=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 def new(state):
  page=b.new_page(viewport={'width':W,'height':H});page.set_default_timeout(2500)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.evaluate('(id)=>history.replaceState(null,"","about:blank#"+id)',state)
  page.set_content(HTML); return page
 def current(page):return page.locator('.screen[data-active=true]')
 def tap(page,label):
  a=current(page).get_by_role('link',name=label,exact=True)
  if a.count()>1:a=current(page).locator('footer').get_by_role('link',name=label,exact=True)
  a.click()
  steps.append({'label':label,'result':current(page).get_attribute('id'),'payment':current(page).get_attribute('data-payment-id'),'viewer':current(page).get_attribute('data-viewer')})
 def lab(page,action):page.locator(f'.labpanel a[data-test-action="{action}"]').dispatch_event('click')
 def snapshot(page,name):
  file=QA/f'{name}-{W}x{H}.png';page.screenshot(path=str(file));captures.append(file.name)
 def check(page,amount,method,viewer='payer'):
  s=current(page);assert s.get_attribute('data-method')==method; assert s.get_attribute('data-viewer')==viewer
  assert s.get_attribute('data-resulting-minor')==str(amount), (s.get_attribute('id'),s.inner_text())
  if s.locator('.balance-after .amount').count():assert s.locator('.balance-after .amount').inner_text()==f'CHF {amount/100:.2f}'
 def case(name,fn):
  try:fn();results.append({'case':name,'passed':True});print('PASS',name,flush=True)
  except Exception as ex: results.append({'case':name,'passed':False,'error':str(ex)});print('FAIL',name,str(ex)[:450],flush=True)
 def external(key,method,amount):
  page=new(f'{key}-return' if key!='cash' else 'cash-sent')
  pid=current(page).get_attribute('data-payment-id')
  if key!='cash':tap(page,'Yes, I sent it')
  tap(page,'View confirmation status')
  for _ in range(3):tap(page,'Refresh status');check(page,amount,method);assert current(page).get_attribute('id')==f'{key}-waiting'
  snapshot(page,f'{key}-waiting')
  tap(page,'Back to balances');check(page,amount,method);tap(page,'Open payment');check(page,amount,method)
  lab(page,'receiver');tap(page,'Not yet');check(page,amount,method,'receiver');tap(page,'Back to payment')
  assert current(page).get_attribute('id')== ('receiver-review' if key=='twint' else key+'-receiver')
  tap(page,'Yes, I received it' if key=='cash' else 'Yes, it arrived');check(page,0,method,'receiver')
  lab(page,'payer');check(page,0,method);tap(page,'Back to balances');check(page,0,method);tap(page,'Back to Overall Position');check(page,0,method)
  snapshot(page,f'{key}-result');tap(page,'Payment details') if False else None
  current(page).locator('a[href="#payment-details"]').click();check(page,0,method);assert method in current(page).inner_text();tap(page,'Done');check(page,0,method)
  assert current(page).get_attribute('id')=='position'
  tap(page,'View payment');check(page,0,method)
  if key!='cash':
   tap(page,'View payment record');check(page,0,method);assert method in current(page).inner_text();snapshot(page,f'{key}-record');
   if key=='twint':
    tap(page,'Open payment history');tap(page,'Back');check(page,0,method)
   tap(page,'Done');check(page,0,method)
  assert current(page).get_attribute('data-payment-id')==pid
  page.go_back();page.wait_for_timeout(30);check(page,0,method)
  page.close()
 for data in [('twint','TWINT',5430),('bank','Bank transfer',5430),('cash','Cash',3000)]:case(data[0]+' receipt, refresh, result and return loop',lambda d=data:external(*d))
 def partial():
  page=new('partial-sent');pid=current(page).get_attribute('data-payment-id')
  tap(page,'View confirmation status');tap(page,'Refresh status');check(page,5430,'TWINT')
  lab(page,'receiver');tap(page,'Yes, it arrived');lab(page,'payer');check(page,3430,'TWINT')
  tap(page,'View remaining balance');check(page,3430,'TWINT');tap(page,'Settle remaining later');check(page,3430,'TWINT');snapshot(page,'partial-result')
  tap(page,'View payment');tap(page,'View payment record');check(page,3430,'TWINT');assert 'CHF 20.00' in current(page).inner_text();tap(page,'Done');check(page,3430,'TWINT');assert current(page).get_attribute('data-payment-id')==pid;page.close()
 case('CHF 20 partial: CHF 34.30 survives every exit',partial)
 def different():
  page=new('receiver-review');tap(page,'Something’s wrong');tap(page,'The amount is different Record what arrived');tap(page,'Confirm CHF 40.00');lab(page,'payer');tap(page,'Back to balances');check(page,1430,'TWINT');tap(page,'Back to balances');check(page,1430,'TWINT');snapshot(page,'different-result');tap(page,'View payment');check(page,1430,'TWINT');page.close()
 case('CHF 40 received: CHF 14.30 survives return',different)
 def wallet():
  page=new('wallet-checking');pid=current(page).get_attribute('data-payment-id')
  tap(page,'Refresh status');assert current(page).get_attribute('id')=='wallet-checking';check(page,5430,'Connected wallet')
  lab(page,'wallet-receipt');tap(page,'View updated balance');tap(page,'Back to balances');check(page,0,'Connected wallet');tap(page,'Back to Overall Position');check(page,0,'Connected wallet');snapshot(page,'wallet-result')
  tap(page,'View payment');tap(page,'View payment record');assert '7.812500 DOT' in current(page).inner_text();assert 'TWINT' not in current(page).inner_text();tap(page,'Done');assert current(page).get_attribute('id')=='wallet-complete';assert current(page).get_attribute('data-payment-id')==pid;page.close()
 case('wallet verification and method-preserving record loop',wallet)
 def reversal():
  page=new('wallet-reversed');tap(page,'View payment record');assert 'Reversed' in current(page).inner_text();tap(page,'Done');assert current(page).get_attribute('id')=='wallet-reversed';tap(page,'View reopened balance');check(page,5430,'Connected wallet');tap(page,'Back to balances');check(page,5430,'Connected wallet');assert 'TWINT' not in current(page).inner_text();snapshot(page,'reversal-result');tap(page,'Open payment');assert current(page).get_attribute('id')=='wallet-reversed';page.close()
 case('reversal remains reopened and wallet-specific',reversal)
 def unknown(key):
  page=new('wallet-result-unknown')
  if key=='bank':page.locator('.labpanel a[data-fixture="bank"]').dispatch_event('click')
  method='Bank transfer' if key=='bank' else 'Connected wallet'
  pid=current(page).get_attribute('data-payment-id');tap(page,'Recover status')
  for _ in range(3):tap(page,'Refresh status');assert current(page).get_attribute('id')=='wallet-recovering';check(page,5430,method)
  assert current(page).get_by_role('link',name='Try again',exact=True).count()==0
  snapshot(page,key+'-recovering');lab(page,'no-execution');assert current(page).get_attribute('id')=='payment-failed';snapshot(page,key+'-safe-retry')
  tap(page,'Try again');assert current(page).get_attribute('id')=='retrying';tap(page,'Continue');assert current(page).get_attribute('id')==('bank-return' if key=='bank' else 'wallet-approval-waiting');assert current(page).get_attribute('data-payment-id')==pid;check(page,5430,method);page.close()
 for key in ['bank','wallet']:case(key+' timeout: recover -> verified not-sent -> same-payment retry',lambda k=key:unknown(k))
 def return_review():
  page=new('bank-return');tap(page,'Not yet');assert 'Bank transfer' in current(page).inner_text();tap(page,'Back');assert current(page).get_attribute('id')=='bank-return';check(page,5430,'Bank transfer');page.close()
 case('bank review handoff does not return to TWINT',return_review)
 b.close()
report={'ok':all(x['passed'] for x in results) and not errors,'viewport':f'{W}x{H}','artifact_sha256':hashlib.sha256(HTML.encode()).hexdigest(),'cases':results,'steps':steps,'console_errors':errors,'screenshots':captures,'mode':'Playwright Chromium set_content; Browser plugin absent; local URL navigation blocked by environment'}
(QA/f'click-tests-{W}x{H}.json').write_text(json.dumps(report,indent=2))
print('RESULT',report['ok'],len(results),'cases',len(steps),'clicks')
