from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
from PIL import Image, ImageOps, ImageDraw, ImageFont
import json, hashlib, shutil, re

BASE=Path(__file__).resolve().parent.parent
OUT=BASE
BEFORE=BASE/'source'
CAND=BASE/'candidates'
FILES={
 'j16-before':BEFORE/'j16-v1.1-continuity-candidate.html',
 'j17-before':BEFORE/'j17-v1.2-continuity-candidate.html',
 'j16-v1.2':CAND/'chopdot-j16-v1.2-visual-candidate.html',
 'j17-v1.3':CAND/'chopdot-j17-v1.3-visual-candidate.html',
}
shots=OUT/'screenshots'; shots.mkdir(exist_ok=True)
report={'browser_plugin':'not available','renderer':'Playwright Chromium via exact HTML page.set_content (regression/layout only; not standalone-open evidence)','standalone_open_reload':{'status':'unverified','reason':'Native file/data/localhost navigation was previously blocked by the environment; per closeout instructions it was not retried and page.set_content is not treated as equivalent.'},'viewports':['393x852','430x890'],'page_errors':[],'console_errors':[],'artifacts':{},'sequences':[]}

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def visible(page):
    return page.evaluate("()=>[...document.querySelectorAll('.screen')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id)")
def route(page,id_):
    page.evaluate('(id)=>{location.hash=id}',id_); page.wait_for_timeout(20)
def fresh(page,html,clear=True):
    if clear:
        try: page.evaluate('sessionStorage.clear()')
        except: pass
    page.set_content(html,wait_until='load'); page.wait_for_timeout(25)
def layout(page,sid):
    return page.evaluate('''sid=>{const s=document.getElementById(sid);const cs=getComputedStyle(s);const main=s.querySelector('main');const header=s.querySelector('header');const footer=s.querySelector('footer');const mr=main?.getBoundingClientRect(),hr=header?.getBoundingClientRect(),fr=footer?.getBoundingClientRect();const ctrls=[...s.querySelectorAll('a,button,input')].filter(e=>{const r=e.getBoundingClientRect(),c=getComputedStyle(e);return c.display!=='none'&&c.visibility!=='hidden'&&r.width>0&&r.height>0});return {visible:cs.display!=='none',docOverflow:document.documentElement.scrollWidth>innerWidth+1,screenOverflow:s.scrollWidth>s.clientWidth+1,headerOverlap:!!(hr&&mr&&hr.bottom>mr.top+1),footerOverlap:!!(fr&&mr&&mr.bottom>fr.top+1),footerVisible:!fr||(fr.top>=-1&&fr.bottom<=innerHeight+1),horizontalClipped:ctrls.filter(e=>{const r=e.getBoundingClientRect();return r.left<-1||r.right>innerWidth+1}).map(e=>e.outerHTML.slice(0,120)),mainScrollable:!!main&&main.scrollHeight>main.clientHeight+1,scrollHeight:main?.scrollHeight||0,clientHeight:main?.clientHeight||0,visibleScreens:[...document.querySelectorAll('.screen')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.id)}}''',sid)
def text_fact(page,section,label):
    return page.evaluate('''([sid,label])=>{const fs=[...document.querySelectorAll('#'+sid+' .fact')];const f=fs.find(x=>x.querySelector('span')?.textContent.trim()===label);return f?.querySelector('b')?.textContent.trim()||null}''',[section,label])
def click_href(page,screen,href):
    loc=page.locator(f'#{screen} a[href="{href}"]'); assert loc.count()>0,(screen,href); loc.first.click(); page.wait_for_timeout(15)
def check_scroll_reachability(page,sid):
    # Scroll main to end and back, ensure it responds when content is taller than viewport.
    return page.evaluate('''sid=>{const m=document.querySelector('#'+sid+' main');if(!m)return {ok:true,scrollable:false};const max=Math.max(0,m.scrollHeight-m.clientHeight);m.scrollTop=max;const atEnd=Math.abs(m.scrollTop-max)<2;m.scrollTop=0;return {ok:atEnd,scrollable:max>0,max};}''',sid)

def operation(page): return page.evaluate('J17Continuity.operation()')

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    for name,path in FILES.items():
        html=path.read_text(); soup=BeautifulSoup(html,'html.parser'); screens=[x['id'] for x in soup.select('.screen[id]')]
        data={'path':str(path),'sha256':sha(path),'bytes':path.stat().st_size,'states':screens,'layouts':[],'bare':[],'external_resources':[]}
        for tag,attr in [('script','src'),('link','href'),('img','src'),('iframe','src'),('source','src')]:
            for e in soup.find_all(tag):
                v=e.get(attr)
                if v and str(v).startswith(('http://','https://','//')): data['external_resources'].append(v)
        assert not data['external_resources'],(name,data['external_resources'])
        for w,h in [(393,852),(430,890)]:
            page=browser.new_page(viewport={'width':w,'height':h})
            page.on('pageerror',lambda e,n=name: report['page_errors'].append({'artifact':n,'error':str(e)}))
            page.on('console',lambda msg,n=name: report['console_errors'].append({'artifact':n,'type':msg.type,'text':msg.text}) if msg.type=='error' else None)
            fresh(page,html)
            data['bare'].append({'viewport':f'{w}x{h}','visible':visible(page)})
            for sid in screens:
                route(page,sid); m=layout(page,sid); m.update(route=sid,viewport=f'{w}x{h}'); data['layouts'].append(m)
                assert m['visible'] and len(m['visibleScreens'])==1 and not m['docOverflow'] and not m['screenOverflow'] and not m['headerOverlap'] and not m['footerOverlap'] and m['footerVisible'] and not m['horizontalClipped'],(name,sid,m)
                sr=check_scroll_reachability(page,sid); assert sr['ok'],(name,sid,sr)
            # key screenshots
            keys = ['start','home','holding','review'] if name.startswith('j16') else ['start','add','add-review','unknown-still','withdraw','withdraw-review']
            for sid in keys:
                if sid in screens:
                    route(page,sid)
                    page.screenshot(path=str(shots/f'{name}-{sid}-{w}.png'))
            page.close()
        report['artifacts'][name]=data

    # --- J16 exact interaction sequence at both viewports ---
    html=FILES['j16-v1.2'].read_text()
    for w,h in [(393,852),(430,890)]:
        page=browser.new_page(viewport={'width':w,'height':h}); fresh(page,html)
        assert visible(page)==['start']
        click_href(page,'start','#goal'); assert visible(page)==['goal']
        click_href(page,'goal','#people'); assert visible(page)==['people']
        click_href(page,'people','#holding'); assert visible(page)==['holding']
        # back and forward checks preserve setup context visually
        click_href(page,'holding','#people'); assert visible(page)==['people']
        click_href(page,'people','#holding'); click_href(page,'holding','#review'); assert visible(page)==['review']
        click_href(page,'review','#home'); assert visible(page)==['home']
        # contributing is visually primary, settings moved to top-right.
        prim=page.locator('#home .savings-primary'); assert prim.inner_text().strip()=='Add money'
        assert page.locator('#home footer .savings-tabs').count()==1
        assert page.locator('#home footer').inner_text().find('Group settings')==-1
        # all home content reachable by ordinary scroll
        scroll=check_scroll_reachability(page,'home'); assert scroll['ok']
        # settings is secondary top navigation, then back.
        page.locator('#home a[aria-label="Group settings"]').click(); assert visible(page)==['settings']; click_href(page,'settings','#home')
        # candidate handoffs don't mutate overview.
        click_href(page,'home','#j17add'); assert visible(page)==['j17add']; assert 'Review your contribution' in page.locator('#j17add').inner_text(); click_href(page,'j17add','#home')
        assert 'CHF 1240.00' in page.locator('#home').inner_text()
        report['sequences'].append({'id':f'J16-setup-overview-back-{w}','passed':True})
        page.close()

    # --- J17 exact continuity sequences, both visual + behavior ---
    html=FILES['j17-v1.3'].read_text()
    for w,h in [(393,852),(430,890)]:
        page=browser.new_page(viewport={'width':w,'height':h}); fresh(page,html)
        assert visible(page)==['start']
        # CHF 50 contribution exact sequence.
        click_href(page,'start','#add')
        page.locator('#add button[data-set="50.00"]').click(); click_href(page,'add','#add-review')
        assert page.locator('#add-review [data-bind-add-amount]').inner_text()=='CHF 50.00'
        assert text_fact(page,'add-review','Available now')=='CHF 1240.00'
        assert text_fact(page,'add-review','After confirmation')=='CHF 1290.00'
        click_href(page,'add-review','#add-sent')
        assert 'CHF 50.00 is not Available yet' in page.locator('#add-sent').inner_text()
        op=operation(page); assert op['minor']==5000 and op['currency']=='CHF' and op['group']=='Alps House Fund'
        oid=op['id']
        # make result unknown without inventing an execution.
        page.evaluate("J17Continuity.state.op.status='unknown';location.hash='unknown'"); page.wait_for_timeout(15)
        page.locator('#unknown [data-action="check-original"]').click(); page.wait_for_timeout(15)
        assert visible(page)==['unknown-still']; assert operation(page)['id']==oid and operation(page)['status']=='checking'
        # Back to group keeps unresolved operation and Resume/banner state.
        page.evaluate("location.hash='start'"); page.wait_for_timeout(15)
        assert operation(page)['id']==oid; assert not page.locator('#unresolved-banner').get_attribute('hidden')
        # Native browser reload cannot be exercised here because file/data/localhost navigation is blocked.
        # Operation continuity is therefore checked across in-app back navigation; reload is a recorded limitation.
        # still unknown is separate from provider outcomes.
        page.evaluate("J17Continuity.serviceResult('unknown')"); assert visible(page)==['unknown-still']; assert operation(page)['id']==oid and operation(page)['status']=='unknown'
        page.evaluate("J17Continuity.serviceResult('confirmed')"); assert visible(page)==['unknown-confirmed']; assert operation(page)['id']==oid and operation(page)['applied'] is True
        page.evaluate("location.hash='start'"); page.wait_for_timeout(10)
        st=page.locator('#start').inner_text(); assert 'CHF 1290.00' in st and 'CHF 570.00' in st
        report['sequences'].append({'id':f'J17-add-50-unknown-confirmed-return-{w}','operation_id':oid,'passed':True})
        page.close()

        # Max withdrawal → verified not executed → safe retry, fresh session.
        page=browser.new_page(viewport={'width':w,'height':h}); fresh(page,html)
        route(page,'withdraw'); page.locator('#withdraw button[data-set="520.00"]').click(); click_href(page,'withdraw','#withdraw-review')
        assert page.locator('#withdraw-review [data-bind-withdraw-amount]').inner_text()=='CHF 520.00'
        assert text_fact(page,'withdraw-review','Available now')=='CHF 1240.00'
        assert text_fact(page,'withdraw-review','After confirmation')=='CHF 720.00'
        assert text_fact(page,'withdraw-review','Your position after')=='CHF 0.00'
        click_href(page,'withdraw-review','#withdraw-pending')
        assert text_fact(page,'withdraw-pending','Available')=='CHF 1240.00'
        op=operation(page); oid=op['id']; assert op['kind']=='withdrawal' and op['minor']==52000
        page.evaluate("J17Continuity.state.op.status='unknown';location.hash='unknown'"); page.evaluate("J17Continuity.serviceResult('not-executed')")
        assert visible(page)==['unknown-not-executed']; assert operation(page)['id']==oid and operation(page)['status']=='not-executed'
        page.locator('#unknown-not-executed [data-action="retry-original"]').click(); page.wait_for_timeout(15)
        assert visible(page)==['withdraw-review']; assert operation(page)['id']==oid and operation(page)['status']=='retry-safe'
        assert page.locator('#withdraw-review [data-bind-withdraw-amount]').inner_text()=='CHF 520.00'
        assert text_fact(page,'withdraw-review','After confirmation')=='CHF 720.00'
        report['sequences'].append({'id':f'J17-withdraw-max-safe-retry-{w}','operation_id':oid,'passed':True})
        page.close()

        # Max withdrawal → confirmed → exact return totals, fresh session.
        page=browser.new_page(viewport={'width':w,'height':h}); fresh(page,html)
        route(page,'withdraw'); page.locator('#withdraw button[data-set="520.00"]').click(); click_href(page,'withdraw','#withdraw-review'); click_href(page,'withdraw-review','#withdraw-pending')
        op=operation(page); oid=op['id']; page.evaluate("J17Continuity.state.op.status='unknown';location.hash='unknown'"); page.evaluate("J17Continuity.serviceResult('confirmed')")
        assert visible(page)==['withdraw-complete']; page.evaluate("location.hash='start'"); page.wait_for_timeout(15)
        st=page.locator('#start').inner_text(); assert 'CHF 720.00' in st and 'CHF 0.00' in st
        report['sequences'].append({'id':f'J17-withdraw-max-confirmed-return-{w}','operation_id':oid,'passed':True})
        page.close()

        # Invalid amounts and limits; no operation created.
        page=browser.new_page(viewport={'width':w,'height':h}); fresh(page,html); route(page,'add')
        page.locator('#addAmount').fill('0'); click_href(page,'add','#add-review'); assert visible(page)==['add']; assert operation(page) is None
        page.locator('#addAmount').fill('abc'); click_href(page,'add','#add-review'); assert visible(page)==['add']; assert operation(page) is None
        route(page,'withdraw'); page.locator('#withdrawAmount').fill('520.01'); click_href(page,'withdraw','#withdraw-review'); assert visible(page)==['withdraw']; assert operation(page) is None
        assert 'at most your confirmed position' in page.locator('#withdraw').inner_text()
        report['sequences'].append({'id':f'J17-invalid-and-limit-{w}','passed':True})
        page.close()

    browser.close()

# Version-label closeout checks.
j16txt=FILES['j16-v1.2'].read_text(); j17txt=FILES['j17-v1.3'].read_text()
assert 'Savings Group V1.2 visual review' in j16txt
assert 'Contribute / Withdraw Savings V1.3 visual review' in j17txt
assert 'Savings — Contribute / Withdraw V1.3' in j17txt
assert 'id="j17-v1-3-model"' in j17txt
assert 'Savings — Contribute / Withdraw V1.2' not in j17txt
assert 'id="j17-v1-2-model"' not in j17txt

# No JS/console errors, no hidden external dependency.
assert not report['page_errors'],report['page_errors']
assert not report['console_errors'],report['console_errors']
# Exact expected default roots.
assert all(x['visible']==['start'] for x in report['artifacts']['j16-v1.2']['bare'])
assert all(x['visible']==['start'] for x in report['artifacts']['j17-v1.3']['bare'])
# Normal UI internal wording removed; review/demo lab can mention version only in titles/comments.
for key in ['j16-v1.2','j17-v1.3']:
    p=Path(report['artifacts'][key]['path']); soup=BeautifulSoup(p.read_text(),'html.parser')
    bad=[]
    for sec in soup.select('.screen:not(#demo)'):
        t=' '.join(sec.stripped_strings).lower()
        for phrase in ['journey 17','control model','scoped contribution record']:
            if phrase in t: bad.append((sec.get('id'),phrase))
    assert not bad,(key,bad)

# Compose compact 393px before/after comparison for J16 home + J17 add.
def label(img,text):
    top=36
    canvas=Image.new('RGB',(img.width,img.height+top),'white'); canvas.paste(img,(0,top));
    d=ImageDraw.Draw(canvas); d.text((12,10),text,fill='black')
    return canvas
rows=[]
for before,after,title in [
    (shots/'j16-before-home-393.png',shots/'j16-v1.2-home-393.png','Journey 16 overview'),
    (shots/'j17-before-add-393.png',shots/'j17-v1.3-add-393.png','Journey 17 contribution')]:
    a=label(Image.open(before).convert('RGB'),'Before — '+title); b=label(Image.open(after).convert('RGB'),'After — '+title)
    row=Image.new('RGB',(a.width+b.width+12,max(a.height,b.height)),(236,236,239)); row.paste(a,(0,0));row.paste(b,(a.width+12,0));rows.append(row)
W=max(r.width for r in rows);H=sum(r.height for r in rows)+12*(len(rows)-1)
comp=Image.new('RGB',(W,H),(236,236,239));y=0
for r in rows: comp.paste(r,(0,y)); y+=r.height+12
comp.save(OUT/'results'/'before-after-393.png')

# Save machine report.
report['ok']=True
report['candidate_hashes']={'j16-v1.2':sha(FILES['j16-v1.2']),'j17-v1.3':sha(FILES['j17-v1.3'])}
report['baseline_hashes']={'j16-v1.1':sha(FILES['j16-before']),'j17-v1.2':sha(FILES['j17-before'])}
(OUT/'results'/'FRESH_VISUAL_QA.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({
 'ok':True,
 'candidate_hashes':report['candidate_hashes'],
 'baseline_hashes':report['baseline_hashes'],
 'layout_counts':{k:len(v['layouts']) for k,v in report['artifacts'].items()},
 'sequences':report['sequences'],
 'page_errors':report['page_errors'],'console_errors':report['console_errors']
},indent=2))
