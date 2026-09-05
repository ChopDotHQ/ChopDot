from pathlib import Path
import json,hashlib
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];ART=ROOT/'v1-candidate.html';QA=ROOT/'visual-qa';QA.mkdir(exist_ok=True)
sha=hashlib.sha256(ART.read_bytes()).hexdigest();checks=[];layouts=[];errors=[];clicks=0;actions={}
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(393,852),(430,890)]:
  page=b.new_page(viewport={'width':w,'height':h});page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(ART.read_text(),wait_until='load');page.wait_for_selector('#members')
  def state():return page.evaluate('PeopleDemo.state')
  def fixture(v):page.evaluate('(v)=>PeopleDemo.scenario(v)',v)
  def route(v):assert page.locator('#device section.screen').get_attribute('data-route')==v,(state()['route'],v)
  def click(a,selector=''):
   global clicks
   page.locator('#device [data-action="'+a+'"]'+selector).first.click();clicks+=1
  def text(t):assert t in page.locator('#device').inner_text(),(t,page.locator('#device').inner_text())
  def test(name,fn):fn();checks.append({'name':name,'viewport':f'{w}x{h}','passed':True})
  def shot(name):
   page.screenshot(path=str(QA/f'{name}-{w}x{h}.png'))
   for a in page.locator('#device [data-action]').evaluate_all('(es)=>es.map(e=>({route:e.closest("section.screen").dataset.route,action:e.dataset.action,label:e.textContent.trim(),disabled:e.disabled}))'):
    actions[(a['route'],a['action'],a['label'])]=a
  def roster():
   fixture('members');text('4 members · 1 invited');shot('members');click('person','[data-person=jeanine]');route('person');text('Nothing to settle');shot('person-group');click('preferences');text('Jeanine prefers TWINT');shot('preferences');click('back');route('person');click('groups');text('CHF 74.30');shot('shared-groups');click('open-group','[data-group=apartment]');text('CHF 74.30');click('payment');route('handoff');text('Apartment');assert state()['handoff']['payment']['amountMinor']==7430;assert state()['handoff']['payment']['paymentMethod']=='TWINT';shot('settle-handoff');click('back');text('CHF 74.30');page.evaluate('history.back()');page.wait_for_timeout(80);assert state()['person']=='jeanine'
  test('Member → preference → group scope → exact settlement handoff → return',roster)
  def search():
   fixture('members');click('directory');page.locator('#people-search').fill('jean');text('Jeanine');assert page.locator('#device [data-person]').count()==1;click('person');text('CHF 54.30');shot('person-all');click('payment');text('CHF 54.30');assert state()['handoff']['payment']['sourceGroups']==['apartment','ski'];click('back');click('directory');assert page.locator('#people-search').input_value()=='jean';page.locator('#people-search').fill('zzzz');text('No matches.');shot('search-empty')
  test('Search and result preserved across exact all-group balance handoff',search)
  def mixed():
   fixture('mixed');text('CHF 91.10');text('DOT 2.400000');shot('mixed');click('payment','[data-currency=DOT]');assert state()['handoff']['payment']['currency']=='DOT';assert state()['handoff']['payment']['amountMinor']==2400000;assert state()['handoff']['payment']['paymentMethod']=='Wallet';text('Hackathon');shot('dot-handoff');click('back');text('CHF 91.10');text('DOT 2.400000')
  test('Two currencies remain separate through request handoff',mixed)
  def euro():
   fixture('all');click('person','[data-person=luca]');text('EUR 18.00');click('payment');text('Bank transfer');assert state()['handoff']['payment']['currency']=='EUR';click('back');text('EUR 18.00')
  test('EUR and bank preference retained on return',euro)
  def private():
   fixture('private');text('Details not shared.');shot('private');assert not page.locator('#device [data-action=own-methods]').count();assert '@' not in page.locator('#device').inner_text()
  test('Other person preferences are read-only and do not expose destinations',private)
  def roles():
   fixture('members');click('roles');text('Roles apply only to Zurich Weekend.');shot('roles');click('back');click('person','[data-person=dev]');click('preferences');click('own-methods');text('Your payment methods');click('back');route('preferences')
  test('Group role and own payment-method handoff',roles)
  def member():
   fixture('member');click('person','[data-person=jeanine]');assert not page.locator('#device [data-action=manage]').count();page.evaluate("PeopleDemo.configure({route:'manage'})");click('remove');route('access-changed');assert state()['members']['zurich']==['dev','jeanine','marc','sam'];shot('access-changed')
  test('Non-owner cannot remove a member even from a forced manage route',member)
  def blocked():
   fixture('members');click('person','[data-person=marc]');click('manage');click('remove');route('remove-blocked');text('Settle up first.');shot('remove-blocked');click('person-return');text('CHF 30.00');assert state()['command'] is None
  test('Open group items prevent removal without changing balances',blocked)
  def remove():
   fixture('members');before=state()['items'];click('person','[data-person=jeanine]');click('manage');shot('manage');click('remove');shot('remove-confirm');click('confirm-remove');route('remove-saving');shot('remove-saving');page.wait_for_timeout(250);route('removed');shot('removed');assert state()['items']==before;assert 'jeanine' in state()['members']['apartment'];click('members');text('3 members');assert not page.locator('#device [data-person=jeanine]').count();click('directory');click('person','[data-person=jeanine]');text('CHF 54.30')
  test('Zero-group removal preserves records and other-group balances',remove)
  def unknown():
   fixture('unknown');old=state()['command']['id'];shot('remove-unknown');click('recover');click('recover');route('remove-unknown');assert state()['command']['id']==old;assert state()['sequence']==1;assert 'jeanine' in state()['members']['zurich'];assert not page.locator('#device [data-action=retry]').count();page.evaluate("PeopleDemo.result('accepted')");route('removed');assert state()['sequence']==1
  test('Unknown save requires status recovery and one accepted result',unknown)
  def retry():
   fixture('failed');old=state()['command']['id'];shot('remove-failed');click('retry');page.wait_for_timeout(250);route('removed');assert state()['command']['id']==old;assert state()['sequence']==1
  test('Verified failure retries the same removal identity',retry)
  def revoked():
   fixture('unknown');page.evaluate("PeopleDemo.result('permission-lost')");route('access-changed');assert 'jeanine' in state()['members']['zurich'];click('safe-directory');click('person','[data-person=jeanine]');click('groups');assert 'Zurich Weekend' not in page.locator('#device .mp-card').inner_text()
  test('Permission revoked while saving does not apply change or reopen group',revoked)
  def offline():
   fixture('offline');shot('offline');click('members');assert page.locator('#device [data-action=invite]').is_disabled();click('person','[data-person=marc]');assert page.locator('#device [data-action=payment]').is_disabled();assert state()['command'] is None
  test('Offline saved roster is readable; invitations and payments are disabled',offline)
  def issue():
   fixture('issue');shot('issue');assert page.locator('#device [data-action=payment]').count()==0;click('review-issue');text('Dinner in Zurich Weekend');click('back');click('members');click('person','[data-person=sam]');assert not page.locator('#device [data-action=payment]').is_disabled();click('payment');assert state()['handoff']['payment']['amountMinor']==2290
  test('One open expense issue affects only its dependent person/scope',issue)
  def invite():
   fixture('members');click('invite-detail');text('Nina has not joined this group yet.');shot('invite-handoff');click('back');assert 'nina' not in state()['members']['zurich'];click('invite');text('Invite someone');click('back');route('members')
  test('Invitation remains pending; handoff creates no membership',invite)
  def solo():
   fixture('solo');text('1 member');shot('solo');click('invite');text('Summer plans');click('back');text('Summer plans')
  test('Only-owner group invitation preserves group name',solo)
  # Exercise every named route at both phone sizes for frame and icon QA.
  for r in page.evaluate('PeopleModel.routes'):
   fixture('members');patch={'route':r,'person':'jeanine'}
   if r=='directory':patch['scope']='all'
   if r=='access-changed':patch['access']=False
   if r=='offline':patch['online']=False
   if r=='handoff':patch['handoff']={'title':'Return to group','copy':'Your place is kept.','backLabel':'Back'}
   page.evaluate('(p)=>PeopleDemo.configure(p)',patch);page.wait_for_timeout(20)
   metric=page.evaluate('''()=>{const s=document.querySelector('#device .screen'),h=s.querySelector('header').getBoundingClientRect(),c=s.querySelector('main').getBoundingClientRect(),f=s.querySelector('footer').getBoundingClientRect();return {nonblank:!!s.querySelector('h1'),overflow:document.body.scrollWidth>innerWidth,headerOverlap:h.bottom>c.top+.5,footerOverlap:c.bottom>f.top+.5,footerVisible:f.bottom<=innerHeight+.5,clipped:[...s.querySelectorAll('.card,.mp-row')].filter(x=>x.getBoundingClientRect().right>innerWidth+.5||x.getBoundingClientRect().left<-.5).length,svg:s.querySelectorAll('svg').length}}''')
   assert metric['nonblank'] and not metric['overflow'] and not metric['headerOverlap'] and not metric['footerOverlap'] and metric['footerVisible'] and metric['clipped']==0,(r,metric)
   layouts.append({'route':r,'viewport':f'{w}x{h}','passed':True,**metric});shot(r)
  page.close()
 page=b.new_page(viewport={'width':1440,'height':1000});page.set_content(ART.read_text());page.wait_for_selector('#members');assert page.locator('.labpanel').is_visible();page.screenshot(path=str(QA/'desktop.png'));page.close();b.close()
result={'ok':not errors,'artifact_sha256':sha,'browser':'Chromium','method':'Playwright set_content; Browser plugin not available','viewports':['393x852','430x890'],'scenarios':len(checks),'clicks':clicks,'layout_checks':len(layouts),'page_errors':errors,'checks':checks,'layouts':layouts,'observed_actions':list(actions.values())}
(QA/'browser-qa.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['checks','layouts','observed_actions']}))
