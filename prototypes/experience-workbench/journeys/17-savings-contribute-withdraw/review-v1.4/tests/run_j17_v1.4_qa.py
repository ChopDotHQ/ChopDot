from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
import json, hashlib, shutil, re

ROOT=Path(__file__).resolve().parents[1]
CAND=ROOT/'candidates/chopdot-j17-v1.4-operation-continuity-candidate.html'
BASE=ROOT/'preserved/chopdot-j17-v1.3-visual-candidate.html'
SHOTS=ROOT/'screenshots'; SHOTS.mkdir(exist_ok=True)
raw=CAND.read_bytes(); text=raw.decode('utf-8'); sha=hashlib.sha256(raw).hexdigest()
expected='a5dad1dc659955d4b70acaa13eced199dd778ff628ab8998d4c7ae83055d4915'
assert sha==expected
base_text=BASE.read_text()
# Visual DOM/CSS continuity: all screen markup and all styles remain byte-equivalent after current-version/script metadata is excluded.
def styles(s): return re.findall(r'<style\b[^>]*>([\s\S]*?)</style>',s,re.I)
assert styles(text)==styles(base_text), 'Visual styles changed'
bs=BeautifulSoup(base_text,'html.parser'); cs=BeautifulSoup(text,'html.parser')
assert [str(x) for x in bs.select('section.screen')]==[str(x) for x in cs.select('section.screen')], 'Screen markup changed'
assert 'V1.4 operation continuity review' in text and 'Savings — Contribute / Withdraw V1.4' in text and 'id="j17-v1-4-model"' in text
assert 'Savings — Contribute / Withdraw V1.3' not in text and 'id="j17-v1-3-model"' not in text
screens=[s['id'] for s in cs.select('section.screen')]
assert len(screens)==21
# Self-contained runtime.
for attr in ['src="http://','src="https://','href="http://','href="https://']:
    assert attr not in text

layout=[]; interactions=[]; errors=[]; warnings=[]; network=[]
viewports=[(393,852),(430,890)]

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    # Exact HTML inline for rendered interaction/layout checks. Not counted as standalone/reload evidence.
    for w,h in viewports:
        page=browser.new_page(viewport={'width':w,'height':h})
        page.on('pageerror',lambda e,wh=f'{w}x{h}': errors.append({'viewport':wh,'error':str(e)}))
        page.on('console',lambda m,wh=f'{w}x{h}': warnings.append({'viewport':wh,'type':m.type,'text':m.text}) if m.type in ['error','warning'] else None)
        page.set_content(text, wait_until='load')
        def route(sid):
            page.evaluate('(s)=>location.hash=s',sid); page.wait_for_timeout(15)
        def op(): return page.evaluate('J17Continuity.operation()')
        def reset():
            page.evaluate("J17Continuity.state.available=124000;J17Continuity.state.position=52000;J17Continuity.state.addMinor=18000;J17Continuity.state.withdrawMinor=10000;J17Continuity.state.op=null;J17Continuity.state.seq=0;location.hash='start'")
            page.wait_for_timeout(10)
        def click(sel): page.locator(sel).click(); page.wait_for_timeout(12)
        # All layouts.
        for sid in screens:
            route(sid)
            m=page.evaluate('''sid=>{const s=document.getElementById(sid),r=s.getBoundingClientRect(),h=s.querySelector('header')?.getBoundingClientRect(),m=s.querySelector('main')?.getBoundingClientRect(),f=s.querySelector('footer')?.getBoundingClientRect();const vis=[...s.querySelectorAll('a,button,input')].filter(e=>{const x=e.getBoundingClientRect(),st=getComputedStyle(e);return st.display!=='none'&&st.visibility!=='hidden'&&x.width>0&&x.height>0});return{screen:sid,display:getComputedStyle(s).display,bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,screenOverflow:s.scrollWidth>s.clientWidth+1,headerOverlap:!!(h&&m&&h.bottom>m.top+1),footerOverlap:!!(m&&f&&m.bottom>f.top+1),footerVisible:!f||(f.top>=-1&&f.bottom<=innerHeight+1),clipped:vis.filter(e=>{const x=e.getBoundingClientRect();return x.left<-1||x.right>innerWidth+1}).length,meaningful:(s.innerText||'').trim().length>5};}''',sid)
            m['viewport']=f'{w}x{h}';m['passed']=m['display']!='none' and not any(m[k] for k in ['bodyOverflow','screenOverflow','headerOverlap','footerOverlap']) and m['footerVisible'] and m['clipped']==0 and m['meaningful']; layout.append(m)
            page.screenshot(path=str(SHOTS/f'{sid}-{w}x{h}.png'))
        # Case 2: same-operation retry through final re-submission.
        reset(); route('withdraw'); click('#withdraw button[data-set="520.00"]'); click('#withdraw a[href="#withdraw-review"]'); click('#withdraw-review a[href="#withdraw-pending"]')
        original=op(); oid=original['id']; assert original['minor']==52000 and original['status']=='waiting'
        page.evaluate("J17Continuity.serviceResult('unknown')"); page.evaluate("J17Continuity.serviceResult('not-executed')")
        assert op()['id']==oid and op()['status']=='not-executed'; click('#unknown-not-executed [data-action="retry-original"]')
        assert page.evaluate('location.hash')=='#withdraw-review'; assert op()['id']==oid and op()['status']=='retry-safe'
        click('#withdraw-review a[href="#withdraw-pending"]')
        retried=op(); assert retried['id']==oid and retried['kind']=='withdrawal' and retried['minor']==52000 and retried['currency']=='CHF' and retried['group']=='Alps House Fund' and retried['actor']=='Dev' and retried['status']=='waiting'
        interactions.append({'case':'same-operation-retry-final-submit','viewport':f'{w}x{h}','operation_id':oid,'passed':True})
        page.screenshot(path=str(SHOTS/f'retry-final-submit-{w}x{h}.png'))
        # Case 1 up to the required native reload boundary: exact unresolved operation survives Check + Back in the running document.
        reset(); route('add'); click('#add button[data-set="50.00"]'); click('#add a[href="#add-review"]'); click('#add-review a[href="#add-sent"]'); oid=op()['id']; page.evaluate('J17Continuity.beginUnknown()'); route('unknown'); click('#unknown [data-action="check-original"]'); assert page.evaluate('location.hash')=='#unknown-still'; click('#unknown-still [data-action="leave-unresolved"]'); assert page.evaluate('location.hash')=='#start'
        pending=op(); assert pending=={'id':oid,'kind':'contribution','minor':5000,'currency':'CHF','group':'Alps House Fund','actor':'Dev','status':'checking'}; assert not page.locator('#unresolved-banner').get_attribute('hidden'); page.locator('#unresolved-banner').click(); assert page.evaluate('location.hash')=='#unknown-still' and op()['id']==oid
        interactions.append({'case':'reload-recovery-precondition-through-back','viewport':f'{w}x{h}','operation_id':oid,'passed':True,'native_reload_after_this_point':'unverified'})
        page.screenshot(path=str(SHOTS/f'pre-reload-unresolved-{w}x{h}.png'))
        # Case 3: unresolved operation blocks new Add and direct fragments.
        reset(); route('add'); click('#add button[data-set="50.00"]'); click('#add a[href="#add-review"]'); click('#add-review a[href="#add-sent"]'); oid=op()['id']; page.evaluate('J17Continuity.beginUnknown()'); route('start')
        click('#start .savings-primary'); assert op()['id']==oid and page.evaluate('location.hash')=='#unknown'
        route('start'); page.evaluate("location.hash='add'"); page.wait_for_timeout(20); assert page.evaluate('location.hash')=='#unknown' and op()['id']==oid
        interactions.append({'case':'unresolved-operation-protection','viewport':f'{w}x{h}','operation_id':oid,'passed':True})
        page.screenshot(path=str(SHOTS/f'unresolved-protection-{w}x{h}.png'))
        # Existing exact amounts / limits still hold.
        reset(); route('add'); click('#add button[data-set="50.00"]'); click('#add a[href="#add-review"]'); assert page.locator('#add-review [data-bind-add-amount]').inner_text()=='CHF 50.00'; assert page.locator('#add-review [data-bind-add-projected]').inner_text()=='CHF 1290.00'
        route('withdraw'); click('#withdraw button[data-set="520.00"]'); click('#withdraw a[href="#withdraw-review"]'); assert page.locator('#withdraw-review [data-bind-withdraw-amount]').inner_text()=='CHF 520.00'; assert page.locator('#withdraw-review [data-bind-withdraw-projected]').inner_text()=='CHF 720.00'; assert page.locator('#withdraw-review [data-bind-withdraw-position-projected]').inner_text()=='CHF 0.00'
        route('withdraw'); page.locator('#withdrawAmount').fill('520.01'); click('#withdraw a[href="#withdraw-review"]'); assert page.evaluate('location.hash')=='#withdraw'
        interactions.append({'case':'amount-and-limit-regression','viewport':f'{w}x{h}','passed':True})
        page.close()
    # Native/controlled-origin reload is unavailable in this environment (ERR_BLOCKED_BY_ADMINISTRATOR).
    # Per closeout instruction, do not substitute inline document injection as reload evidence.
    browser.close()

assert not errors, errors
assert not [w for w in warnings if w['type']=='error'], warnings
assert all(x['passed'] for x in layout), [x for x in layout if not x['passed']]
assert all(x['passed'] for x in interactions)
report={
 'ok':True,'journey':'17','version':'v1.4','candidate_sha256':sha,'source_v1.3_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),'bytes':len(raw),
 'visual_markup_unchanged':True,'styles_unchanged':True,'states':len(screens),'viewports':['393x852','430x890'],'layout_checks':len(layout),'layout_passed':sum(x['passed'] for x in layout),
 'interaction_regressions':interactions,'page_errors':errors,'console_messages':warnings,'external_runtime_dependencies':0,
 'native_file_open_reload':{'status':'unverified','reason':'This environment previously blocked native file/data/localhost navigation with ERR_BLOCKED_BY_ADMINISTRATOR. Per user instruction it was not retried, and inline/controlled-origin tests are not treated as equivalent.'},
 'controlled_origin_reload':{'status':'blocked','reason':'Navigation to a controlled test origin was also blocked by ERR_BLOCKED_BY_ADMINISTRATOR; not retried.'},
 'prototype_storage_authority':'Browser storage persists only unresolved waiting/unknown/checking context. Hydration rejects not-executed/confirmed states; provider/service outcomes remain separate.',
 'github_publication':'not performed','exact_head_gate':'not run','freeze':False,'journey_19_started':False,'typography_note':'TYPO-01 deferred'
}
(ROOT/'results/FRESH_QA.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
