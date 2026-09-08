from pathlib import Path
from playwright.sync_api import sync_playwright
import json,hashlib,re
ROOT=Path(__file__).resolve().parents[1]
CAND=ROOT/'j18-v1.1-continuity-candidate.html'
HTML=CAND.read_text(encoding='utf-8')
SHA=hashlib.sha256(CAND.read_bytes()).hexdigest()
EXPECTED='d42b518c14fe7c57b2df56c0e92f0ad63424b9971f294ac10df647a0e2cab08e'
assert SHA==EXPECTED
# Standalone static isolation.
assert not re.search(r'''(?:src|href)=["'](?:https?:)?//''',HTML,re.I)
viewports=[(393,852),(430,890)]
layouts=[]; checks=[]; page_errors=[]; console_errors=[]; network=[]

def visible_ids(page):
    return page.evaluate("""()=>[...document.querySelectorAll('.screen[id]')].filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}).map(e=>e.id)""")

def record(name,viewport,passed,detail=None):
    checks.append({'name':name,'viewport':viewport,'passed':bool(passed),'detail':detail})
    assert passed,(name,viewport,detail)

def fresh_page(browser,w,h):
    p=browser.new_page(viewport={'width':w,'height':h})
    p.on('pageerror',lambda e: page_errors.append({'viewport':f'{w}x{h}','error':str(e)}))
    p.on('console',lambda m: console_errors.append({'viewport':f'{w}x{h}','text':m.text}) if m.type=='error' else None)
    p.on('request',lambda req: network.append({'viewport':f'{w}x{h}','url':req.url}) if req.url.startswith(('http://','https://')) else None)
    p.set_content(HTML,wait_until='load')
    p.wait_for_timeout(30)
    return p

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    for w,h in viewports:
        vp=f'{w}x{h}'
        page=fresh_page(browser,w,h)
        # Bare document entry under injected exact bytes. This is not native file evidence.
        record('bare no-fragment document shows only Activity',vp,visible_ids(page)==['activity'],visible_ids(page))
        # Invalid fragment normalization.
        page.evaluate("location.hash='not-a-real-screen'");page.wait_for_timeout(40)
        record('invalid fragment normalizes to Activity',vp,page.evaluate("location.hash")== '#activity' and visible_ids(page)==['activity'],{'hash':page.evaluate('location.hash'),'visible':visible_ids(page)})
        # Enumerate/render all states.
        states=page.eval_on_selector_all('.screen[id]','els=>els.map(e=>e.id)')
        record('36 states present',vp,len(states)==36,len(states))
        for sid in states:
            page.evaluate('(id)=>location.hash=id',sid);page.wait_for_timeout(12)
            vis=visible_ids(page)
            metrics=page.evaluate("""sid=>{const s=document.getElementById(sid),main=s.querySelector('main');const sr=s.getBoundingClientRect();const controls=[...s.querySelectorAll('a,button,input')].filter(e=>{const st=getComputedStyle(e),r=e.getBoundingClientRect();return st.display!=='none'&&st.visibility!=='hidden'&&r.width>0&&r.height>0});return {bodyOverflow:document.documentElement.scrollWidth>innerWidth+1,screenOverflow:s.scrollWidth>s.clientWidth+1,clippedControls:controls.filter(e=>{const r=e.getBoundingClientRect();return r.left<-1||r.right>innerWidth+1}).length,screenTop:sr.top,screenBottom:sr.bottom,mainScrollHeight:main?.scrollHeight||0,mainClientHeight:main?.clientHeight||0};}""",sid)
            passed=vis==[sid] and not metrics['bodyOverflow'] and not metrics['screenOverflow'] and metrics['clippedControls']==0
            layouts.append({'viewport':vp,'route':sid,'passed':passed,'visible':vis,**metrics})
            assert passed,(vp,sid,vis,metrics)
            page.screenshot(path=str(ROOT/'visual-qa'/f'{sid}-{w}x{h}.png'))
        # Attention content is actually reachable by normal content scrolling.
        page.evaluate("location.hash='activity'");page.wait_for_timeout(20)
        attention=page.locator('#activity .j18-attention')
        record('attention card uses visible overflow',vp,attention.evaluate("e=>getComputedStyle(e).overflow")=='visible',attention.evaluate("e=>getComputedStyle(e).overflow"))
        rows=page.locator('#activity .j18-attention .j18-row')
        record('resolved payment is absent from attention rows',vp,rows.count()==2,rows.count())
        reach=[]
        for i in range(rows.count()):
            row=rows.nth(i);row.scroll_into_view_if_needed();page.wait_for_timeout(15)
            ok=row.evaluate("e=>{const r=e.getBoundingClientRect(),m=e.closest('main').getBoundingClientRect();return r.bottom>m.top&&r.top<m.bottom&&r.left>=m.left-1&&r.right<=m.right+1}")
            reach.append(ok)
        record('every attention row is reachable by normal scrolling',vp,all(reach),reach)
        # Read continuity through actual controls.
        page.locator('#activity a[data-action="open-notifications"]').click();page.wait_for_timeout(15)
        record('notifications starts at 2 unread',vp,page.locator('#notifications [data-unread-label]').inner_text()=='2 unread')
        page.locator('#notifications a[data-action="mark-all-read"]').click();page.wait_for_timeout(20)
        record('mark all read reaches zero unread',vp,page.locator('#notifications [data-unread-label]').inner_text()=='All read' and page.locator('#notifications .j18-row.j18-unread').count()==0,{'label':page.locator('#notifications [data-unread-label]').inner_text(),'unread_rows':page.locator('#notifications .j18-row.j18-unread').count()})
        page.locator('#notifications .j18-secondary').click();page.wait_for_timeout(15)
        record('attention remains two after reading',vp,'Needs attention · 2' in page.locator('#activity').inner_text())
        page.locator('#activity a[data-action="open-notifications"]').click();page.wait_for_timeout(15)
        record('Activity → Notifications preserves all-read',vp,page.locator('#notifications [data-unread-label]').inner_text()=='All read')
        # New notification is the only thing that reintroduces unread.
        page.locator('#notifications .demo-btn').click();page.wait_for_timeout(10)
        page.locator('#demo a[data-action="demo-new-notification"]').click();page.wait_for_timeout(20)
        record('new notification increments unread to one',vp,page.locator('#notifications [data-unread-label]').inner_text()=='1 unread')
        record('new notification does not change unresolved attention',vp,page.evaluate("J18Model.attention(J18Continuity.project())")==2,page.evaluate("J18Model.attention(J18Continuity.project())"))
        page.close()

        # Historical Waiting notification resolves via actual UI and model.
        page=fresh_page(browser,w,h);page.locator('#activity a[data-action="open-notifications"]').click();page.wait_for_timeout(10)
        old=page.locator('#notifications [data-notification-id="n:p-wait"]')
        record('historical Waiting notification is retained',vp,old.count()==1,old.count())
        old.click();page.wait_for_timeout(12)
        record('old Waiting opens changed-state explanation',vp,visible_ids(page)==['stale-notification'] and 'Current payment' in page.locator('#stale-notification').inner_text() and 'Complete' in page.locator('#stale-notification').inner_text(),page.locator('#stale-notification').inner_text()[:300])
        page.locator('#stale-notification .j18-primary').click();page.wait_for_timeout(12)
        record('changed state routes to current complete payment',vp,visible_ids(page)==['payment-complete'] and 'Payment complete' in page.locator('#payment-complete').inner_text())
        model_result=page.evaluate("""()=>{const e=J18Continuity.events;const n=J18Model.notificationCopy(e[0]);const r=J18Model.resolveNotification(n,e);return {kind:r.kind,status:r.current.status,eventId:r.current.eventId,route:r.route,attention:J18Model.attention(J18Model.project(e))}}""")
        record('browser model resolves old Waiting to latest Complete',vp,model_result=={'kind':'stale','status':'Complete','eventId':'p-complete','route':'handoff-j15','attention':2},model_result)
        # Duplicate and out-of-order delivery against actual browser model.
        ordering=page.evaluate("""()=>{const [w,c,r,e,s]=J18Continuity.events;const dupe={...w};const out=J18Model.project([c,r,dupe,w,e,s]);const pay=out.filter(x=>x.entityId==='p1');const old=pay.find(x=>x.eventId==='p-wait'),cur=pay.find(x=>x.eventId==='p-complete');return {count:pay.length,oldHistorical:old.historical,oldAttention:old.attention,currentHistorical:cur.historical,currentStatus:cur.status,attention:J18Model.attention(out),resolved:J18Model.resolveNotification(J18Model.notificationCopy(w),[c,r,dupe,w,e,s])};}""")
        record('duplicate/out-of-order keeps both history events and Complete current',vp,ordering['count']==2 and ordering['oldHistorical'] and not ordering['oldAttention'] and not ordering['currentHistorical'] and ordering['currentStatus']=='Complete' and ordering['attention']==2 and ordering['resolved']['current']['status']=='Complete',ordering)
        page.close()
    browser.close()

assert not page_errors,page_errors
assert not console_errors,console_errors
assert not network,network
result={'ok':True,'candidate_sha256':SHA,'candidate_bytes':len(CAND.read_bytes()),'version':'v1.1','browser_plugin':'not available','validation_method':'Playwright document injection for layout/interactions only; native file navigation separately attempted once and blocked by administrator policy','native_file_open_reload':'unverified-blocked','viewports':[f'{w}x{h}' for w,h in viewports],'states':36,'layout_checks':len(layouts),'passed_layouts':sum(x['passed'] for x in layouts),'focused_checks':len(checks),'passed_focused_checks':sum(x['passed'] for x in checks),'page_errors':page_errors,'console_errors':console_errors,'external_network_requests':network,'all_layouts_pass':all(x['passed'] for x in layouts),'all_focused_checks_pass':all(x['passed'] for x in checks),'checks':checks,'layouts':layouts}
(ROOT/'results/browser-qa.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ('checks','layouts')},indent=2))
