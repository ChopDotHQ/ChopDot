from pathlib import Path
from bs4 import BeautifulSoup
import json, hashlib
ROOT=Path(__file__).resolve().parent.parent
source=ROOT/'v1-golden-candidate.html'
doc=source.read_text()
s=BeautifulSoup(doc,'html.parser')
original_css=s.style.string
# No new screens or visual CSS. Correct the dangerous static links too.
for section in s.select('.screen'):
 for a in section.select('a'):
  if not a.get('data-domain-event'):
   a['data-domain-event']='PaymentStatusViewed'
   a['data-authority']='viewer'
  if a.get('data-domain-event')=='PaymentStatusRefreshRequested':
   a['href']='#'+section['id']; a['data-result-resolver']='accepted-status-only'
  if a.get('data-domain-event') in ('PaymentRetryRequested','PaymentMethodSelectionOpened'):
   a['data-required-outcome']='verified-not-executed'
  a['data-scope-policy']='preserve-payment'
for id in ['payment-complete','bank-complete','cash-complete','wallet-complete','partial-complete','partial-different-complete']:
 s.find(id=id).select_one('header a')['href']='#position'
# Return rows reuse the existing compact row/icon classes (no new visual tokens).
for row in s.select('.status-banner'):
 row['class']=row.get('class',[])+['method-row']
 sym=row.select_one('.status-symbol')
 if sym:sym['class']=sym.get('class',[])+['method-icon']
 side=row.select_one('.status-side')
 if side:
  side.name='b';wrapper=s.new_tag('span',attrs={'class':'method-side'});side.wrap(wrapper)
for icon in s.select('.timeline-row > .timeline-icon'):
 icon['style']='display:grid;margin-top:0'
# Presentation-only selection lives outside the app.
lab=s.select_one('.labpanel')
notes=s.new_tag('div',attrs={'class':'labsec'})
notes.append(BeautifulSoup('''<div class="lablabel">Live path checks · demo only</div>
<p>These controls switch test roles or supply a test result. They do not move money.</p>
<a class="compare" href="#receiver-review" data-test-action="receiver">View as recipient</a>
<a class="compare" href="#twint-waiting" data-test-action="payer">Return to payer</a>
<a class="compare" href="#wallet-received" data-test-action="wallet-receipt">Test result: exact wallet receipt</a>
<a class="compare" href="#payment-failed" data-test-action="no-execution">Test result: confirmed not sent</a>
<a class="compare" href="#wallet-result-unknown" data-fixture="bank">Timeout · Bank transfer</a>
<a class="compare" href="#partial-different-complete">Different amount · CHF 40 received</a>
''','html.parser'))
lab.insert(2,notes)
s.title.string='ChopDot — Complete Settlement V1.1 Continuity Candidate'
for filename in ['continuity-model.cjs','continuity-ui.js']:
 script=s.new_tag('script',attrs={'data-prototype-source':filename})
 script.string=(ROOT/'source'/filename).read_text();s.body.append(script)
assert s.style.string==original_css
out=ROOT/'v1.1-continuity-candidate.html';out.write_text(str(s))
print(hashlib.sha256(out.read_bytes()).hexdigest())
actions=[];screens=[]
for section in s.select('.screen'):
 screens.append({'screen':section['id'],'payment_state':section.get('data-payment-state'),'transition_authority':section.get('data-transition-authority'),'context_policy':'selected-payment-and-viewer','renderer':'source/continuity-ui.js'})
 for a in section.select('a'):
  actions.append({'screen':section['id'],'label':a.get_text(' ',strip=True) or a.get('aria-label',''), 'href':a.get('href'),'domain_event':a.get('data-domain-event'),'authority':a.get('data-authority'),'idempotency':a.get('data-idempotency'),'primary':'primary' in a.get('class',[]),'context_policy':'preserve-payment-method-currency-source-result-viewer','result_resolver':a.get('data-result-resolver'),'required_outcome':a.get('data-required-outcome')})
(ROOT/'UI_EVENT_MAPPING.json').write_text(json.dumps(actions,indent=2)+'\n')
(ROOT/'SCREEN_STATE_MAPPING.json').write_text(json.dumps(screens,indent=2)+'\n')
