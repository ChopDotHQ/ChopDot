from bs4 import BeautifulSoup
from pathlib import Path
import re, hashlib

BASE=Path(__file__).resolve().parent.parent
ROOT=BASE/'source'
OUT=BASE/'candidates'
OUT.mkdir(exist_ok=True)
J16=ROOT/'j16-v1.1-continuity-candidate.html'
J17=ROOT/'j17-v1.2-continuity-candidate.html'


def frag(soup, html):
    holder=BeautifulSoup(html,'html.parser')
    return list(holder.contents)

def set_inner(tag, html):
    tag.clear()
    holder=BeautifulSoup(html,'html.parser')
    for child in list(holder.contents): tag.append(child)

def find_fact(section,label):
    for f in section.select('.fact'):
        sp=f.find('span')
        if sp and sp.get_text(' ',strip=True)==label:
            return f
    return None

def set_header(section,title,subtitle,right=None):
    h=section.find('header')
    ht=h.select_one('.header-title')
    ht.find('b').string=title
    ht.find('span').string=subtitle
    if right is not None:
        # replace the rightmost direct child
        children=[c for c in h.children if getattr(c,'name',None)]
        if children:
            children[-1].replace_with(BeautifulSoup(right,'html.parser').find())

def set_footer(section, html):
    f=section.find('footer')
    if not f:
        f=section.new_tag('footer')
        section.append(f)
    f['class']=['focus-footer']
    set_inner(f,html)

# ---------------- J16 ----------------
soup=BeautifulSoup(J16.read_text(),'html.parser')

# Visible setup copy and hierarchy modeled on J03 focused flow.
start=soup.find(id='start')
set_header(start,'New savings group','Shared goal')
set_inner(start.find('main'),'''
<div><h1 class="big-title">Save toward something together.</h1><p class="bodycopy" style="margin-top:8px">Set a goal. Choose people. Decide where the money stays.</p></div>
<div class="card savings-intro-row"><span class="savings-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg></span><div><b>Confirmed changes only</b><span>ChopDot tracks what the group confirms. It never holds the money.</span></div></div>
''')
set_footer(start,'<a class="primary dark" href="#goal">Continue</a><a class="secondary-btn" href="#start">Back to Home</a>')

goal=soup.find(id='goal'); set_header(goal,'Savings goal','1 of 4')
people=soup.find(id='people'); set_header(people,'Choose people','2 of 4')
# make footer language plain
pf=people.find('footer');
if pf:
    a=pf.find('a',class_='primary')
    if a: a.string='Continue'; a['href']='#holding'

holding=soup.find(id='holding'); set_header(holding,'Where money stays','3 of 4')
main=holding.find('main')
h1=main.find('h1'); h1.string='Where will the money stay?'
p=main.find('p',class_='bodycopy'); p.string='Choose how this group keeps track of contributions.'
opts=holding.select('.control-option')
if len(opts)>=2:
    b=opts[0].find('b'); b.string='With each person'
    sp=opts[0].find('span'); sp.string='Each member keeps their own money. ChopDot records confirmed contributions.'
    b=opts[1].find('b'); b.string='Shared account'
    sp=opts[1].find('span'); sp.string='Contributions go to an account controlled by the group. ChopDot never holds the funds.'
info=holding.select_one('.info')
if info:
    div=info.find_all('div')[-1]; div.string='Saving here does not mean investing. No yield or return is promised.'

review=soup.find(id='review'); set_header(review,'Review savings group','Nothing moves yet')
f=find_fact(review,'Control')
if f:
    f.find('span').string='Money stays'; f.find('b').string='With each person'
info=review.select_one('.info')
if info:
    info.find_all('div')[-1].string='Members confirm additions and withdrawals before the group totals change.'

# Rebuild savings group home in the approved Group Home visual hierarchy.
home=soup.find(id='home')
set_header(home,'Alps House Fund','3 people · CHF', '''<a class="icon-btn" href="#settings" aria-label="Group settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></a>''')
set_inner(home.find('main'),'''
<div class="savings-group-meta"><div class="people-stack"><span class="person-dot">D</span><span class="person-dot light">J</span><span class="person-dot light">M</span></div><div class="meta-copy"><b>Your position · CHF 520.00</b><span>3 savers</span></div></div>
<section class="card savings-goal"><div class="savings-goal-top"><div><span>Available</span><b>CHF 1240.00</b></div><div class="savings-goal-side"><span>Goal</span><b>CHF 3000.00</b></div></div><div class="progress"><i style="width:41.33%"></i></div><div class="progress-meta"><span>41% complete</span><span>1 Jun 2027</span></div></section>
<div class="savings-cta-stack"><a class="savings-primary" href="#j17add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Add money</a><a class="savings-secondary" href="#j17withdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>Withdraw</a></div>
<div class="section-head savings-section-head"><h2>People</h2><span>Confirmed positions</span></div>
<section class="card list-card savings-people"><div class="list-row"><div class="avatar2 dark">D</div><div class="row-main"><b>Dev · You</b><span>Confirmed position</span></div><span class="amount">CHF 520.00</span></div><div class="list-row"><div class="avatar2">J</div><div class="row-main"><b>Jeanine</b><span>Confirmed position</span></div><span class="amount">CHF 480.00</span></div><div class="list-row"><div class="avatar2">M</div><div class="row-main"><b>Marc</b><span>Confirmed position</span></div><span class="amount">CHF 240.00</span></div></section>
<div class="section-head savings-section-head"><h2>Recent</h2></div>
<section class="card list-card"><div class="list-row"><div class="savings-row-icon good"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></div><div class="row-main"><b>Jeanine added</b><span>Yesterday · confirmed</span></div><span class="amount">CHF 200.00</span></div><div class="list-row"><div class="savings-row-icon good"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></div><div class="row-main"><b>Marc added</b><span>3 days ago · confirmed</span></div><span class="amount">CHF 120.00</span></div></section>
<div class="info gray savings-rule"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg><div>Money stays with each member. The group total changes only after a contribution or withdrawal is confirmed.</div></div>
''')
set_footer(home,'''
<nav class="savings-tabs" aria-label="Main navigation"><a class="savings-tab active" href="#home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg><span>Pots</span></a><span class="savings-tab muted-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg><span>People</span></span><a class="savings-plus" href="#j17add" aria-label="Add money"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></a><span class="savings-tab muted-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l4 2"/></svg><span>Activity</span></span><span class="savings-tab muted-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21a7 7 0 0 0-14 0"/><circle cx="12" cy="7" r="4"/></svg><span>You</span></span></nav>
''')

# Clean adjacent handoff wording.
for id_,subtitle,copy in [
    ('j17add','Contribution','Review your contribution before it counts toward this goal.'),
    ('j17withdraw','Your position','You can withdraw only from your own confirmed position.')]:
    sec=soup.find(id=id_)
    set_header(sec, 'Add money' if id_=='j17add' else 'Withdraw', subtitle)
    inf=sec.select_one('.info')
    if inf: inf.find_all('div')[-1].string=copy
    a=sec.find('footer').find('a'); a.string='Back to savings group'
settings=soup.find(id='settings')
if settings:
    set_header(settings,'Group settings','Alps House Fund')
    # strip internal preview wording if present
    for node in settings.find_all(string=re.compile('Preview|Journey')):
        node.replace_with(re.sub(r'Journey\s+\d+\s*|preview\s*only|Preview\s*only','',str(node),flags=re.I).strip())

# Add scoped style override just before </head>.
style=soup.new_tag('style')
style.string='''
/* J16 V1.2 — visual refinement against approved Group Home/Create Group references. */
.primary{background:#111113}.primary.dark{background:#111113}.focus-footer{background:rgba(255,255,255,.98)}
#start .focus-content,#goal .focus-content,#people .focus-content,#holding .focus-content,#review .focus-content{padding:22px 20px 24px;gap:18px}
#start .big-title,#goal .big-title,#people .big-title,#holding .big-title{font-size:30px;line-height:1.06;letter-spacing:-.045em;font-weight:800}
.savings-intro-row{padding:14px 15px;display:grid;grid-template-columns:38px minmax(0,1fr);gap:11px;align-items:center}.savings-intro-row b{display:block;font-size:13px}.savings-intro-row span{display:block;font-size:10px;color:var(--secondary);line-height:1.42;margin-top:2px}.savings-row-icon{width:38px;height:38px;border-radius:12px;background:var(--surface2);display:grid;place-items:center}.savings-row-icon svg{width:18px;height:18px}.savings-row-icon.good{background:#e7f7f0;color:#147253}
#home .focus-content{padding:15px 16px 18px;gap:11px}.savings-group-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.people-stack{display:flex;align-items:center}.person-dot{width:30px;height:30px;border-radius:50%;border:2px solid var(--bg);display:grid;place-items:center;background:#151515;color:#fff;font-size:9px;font-weight:740;margin-left:-7px}.person-dot:first-child{margin-left:0}.person-dot.light{background:#dedee3;color:#313137}.meta-copy{text-align:right}.meta-copy b{display:block;font-size:11px}.meta-copy span{display:block;font-size:9px;color:var(--secondary);margin-top:2px}
#home .goal-card:after{display:none}.savings-goal{padding:15px}.savings-goal-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end}.savings-goal-top span,.savings-goal-side span{display:block;font-size:10px;color:var(--secondary)}.savings-goal-top>div>b{display:block;font-size:28px;letter-spacing:-.045em;margin-top:2px}.savings-goal-side{text-align:right}.savings-goal-side b{display:block;font-size:12px;margin-top:2px}.savings-goal .progress{height:5px;margin-top:12px}.savings-goal .progress-meta{font-size:9px;margin-top:7px}
.savings-cta-stack{display:grid;gap:8px}.savings-primary,.savings-secondary{min-height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:730}.savings-primary{background:#111113;color:#fff}.savings-secondary{background:var(--surface);border:1px solid var(--border);color:var(--ink);min-height:42px}.savings-primary svg,.savings-secondary svg{width:17px;height:17px}.savings-section-head{padding:4px 2px 0}.savings-section-head h2{font-size:15px;margin:0}.savings-section-head span{font-size:10px;color:var(--secondary)}.savings-people .avatar2.dark{background:#151515;color:white}.savings-people .amount{font-size:11px}.savings-rule{margin-top:1px}
#home .focus-footer{padding:0;background:rgba(255,255,255,.97)}.savings-tabs{height:78px;display:grid;grid-template-columns:1fr 1fr 72px 1fr 1fr;padding:5px 8px 8px;align-items:end;border-top:1px solid var(--border)}.savings-tab{height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--muted);font-size:10px}.savings-tab.active{color:var(--ink);font-weight:700}.savings-tab svg{width:20px;height:20px}.savings-plus{align-self:center;justify-self:center;width:56px;height:56px;border-radius:50%;background:var(--accent);color:white;display:grid;place-items:center;transform:translateY(-12px);box-shadow:0 12px 28px rgba(230,0,122,.28)}.savings-plus svg{width:23px;height:23px}.muted-tab{user-select:none}
@media(max-width:860px){.demo-btn{visibility:hidden;pointer-events:none}}
'''
soup.head.append(style)
# Update title.
soup.title.string='ChopDot — Savings Group V1.2 visual review'

# Remove remaining user-facing internal phrases outside demo controls where practical.
# Do not delete lab/debug copy wholesale; target exact strings.
for text in soup.find_all(string=True):
    if text.parent and text.parent.closest if False else False: pass
    st=str(text)
    st=st.replace('Journey 17 · confirm contribution','Confirmed before totals change')
    st=st.replace('Journey 17 preview','')
    st=st.replace('Contribution execution belongs to Journey 17. ','')
    st=st.replace('Withdrawal execution belongs to Journey 17. ','')
    st=st.replace('Choose control','Continue')
    st=st.replace('Control model','How money stays')
    if st!=str(text): text.replace_with(st)

out16=OUT/'chopdot-j16-v1.2-visual-candidate.html'
out16.write_text(str(soup),encoding='utf-8')

# ---------------- J17 ----------------
soup=BeautifulSoup(J17.read_text(),'html.parser')

# Add scoped CSS.
style=soup.new_tag('style')
style.string='''
/* J17 V1.3 — visual refinement; continuity behavior remains authoritative. */
.primary{background:#111113}.primary.dark{background:#111113}.focus-footer{background:rgba(255,255,255,.98)}
#add .focus-content,#add-review .focus-content,#withdraw .focus-content,#withdraw-review .focus-content{padding:22px 20px 24px;gap:18px}
#add .big-title,#withdraw .big-title{font-size:30px;line-height:1.06;letter-spacing:-.045em;font-weight:800}
#start .focus-content{padding:15px 16px 18px;gap:11px}.savings-group-meta{display:flex;align-items:center;justify-content:space-between;gap:10px}.people-stack{display:flex;align-items:center}.person-dot{width:30px;height:30px;border-radius:50%;border:2px solid var(--bg);display:grid;place-items:center;background:#151515;color:#fff;font-size:9px;font-weight:740;margin-left:-7px}.person-dot:first-child{margin-left:0}.person-dot.light{background:#dedee3;color:#313137}.meta-copy{text-align:right}.meta-copy b{display:block;font-size:11px}.meta-copy span{display:block;font-size:9px;color:var(--secondary);margin-top:2px}
#start .goal-card:after{display:none}.savings-goal{padding:15px}.savings-goal-top{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:end}.savings-goal-top span,.savings-goal-side span{display:block;font-size:10px;color:var(--secondary)}.savings-goal-top>div>b{display:block;font-size:28px;letter-spacing:-.045em;margin-top:2px}.savings-goal-side{text-align:right}.savings-goal-side b{display:block;font-size:12px;margin-top:2px}.savings-goal .progress{height:5px;margin-top:12px}.savings-goal .progress-meta{font-size:9px;margin-top:7px}
.savings-cta-stack{display:grid;gap:8px}.savings-primary,.savings-secondary{min-height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;font-weight:730}.savings-primary{background:#111113;color:#fff}.savings-secondary{background:var(--surface);border:1px solid var(--border);color:var(--ink);min-height:42px}.savings-primary svg,.savings-secondary svg{width:17px;height:17px}
#start .focus-footer{padding:0;background:rgba(255,255,255,.97)}.savings-tabs{height:78px;display:grid;grid-template-columns:1fr 1fr 72px 1fr 1fr;padding:5px 8px 8px;align-items:end;border-top:1px solid var(--border)}.savings-tab{height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;color:var(--muted);font-size:10px}.savings-tab.active{color:var(--ink);font-weight:700}.savings-tab svg{width:20px;height:20px}.savings-plus{align-self:center;justify-self:center;width:56px;height:56px;border-radius:50%;background:var(--accent);color:white;display:grid;place-items:center;transform:translateY(-12px);box-shadow:0 12px 28px rgba(230,0,122,.28)}.savings-plus svg{width:23px;height:23px}.muted-tab{user-select:none}
.fact b[data-bind-current-available],.fact b[data-bind-current-position],.fact b[data-bind-add-projected],.fact b[data-bind-withdraw-projected],.fact b[data-bind-withdraw-position-projected]{font-variant-numeric:tabular-nums}
@media(max-width:860px){.demo-btn{visibility:hidden;pointer-events:none}}
'''
soup.head.append(style)
soup.title.string='ChopDot — Contribute / Withdraw Savings V1.3 visual review'

# Rebuild start/return overview so it is the same visual family as J16/J08.
start=soup.find(id='start')
set_header(start,'Alps House Fund','3 people · CHF')
unresolved=start.find(id='unresolved-banner')
# Remove before rebuilding then include it first.
set_inner(start.find('main'),'''
<div id="unresolved-banner" class="info pink" data-bind-unresolved hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 17h.01"/></svg><div><b>An earlier savings change is still unresolved.</b><span data-bind-unresolved-copy>Check its original result before trying it again.</span></div></div>
<div class="savings-group-meta"><div class="people-stack"><span class="person-dot">D</span><span class="person-dot light">J</span><span class="person-dot light">M</span></div><div class="meta-copy"><b>Your position · <span data-bind-position>CHF 520.00</span></b><span>3 savers</span></div></div>
<section class="card savings-goal"><div class="savings-goal-top"><div><span>Available</span><b data-bind-available>CHF 1240.00</b></div><div class="savings-goal-side"><span>Goal</span><b>CHF 3000.00</b></div></div><div class="progress"><i data-bind-progress style="width:41.33%"></i></div><div class="progress-meta"><span data-bind-progress-copy>41% complete</span><span>1 Jun 2027</span></div></section>
<div class="savings-cta-stack"><a class="savings-primary" href="#add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>Add money</a><a class="savings-secondary" href="#withdraw"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>Withdraw</a></div>
<section class="card summary-card"><div class="fact"><span>Your confirmed position</span><b data-bind-current-position>CHF 520.00</b></div><div class="fact"><span>Money stays</span><b>With each person</b></div><div class="fact"><span>Counts toward goal</span><b>Confirmed changes only</b></div></section>
<div class="info gray"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg><div>ChopDot records confirmed changes to this savings goal. It never holds the money.</div></div>
''')
set_footer(start,'''
<nav class="savings-tabs" aria-label="Main navigation"><a class="savings-tab active" href="#start"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg><span>Pots</span></a><span class="savings-tab muted-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg><span>People</span></span><a class="savings-plus" href="#add" aria-label="Add money"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg></a><span class="savings-tab muted-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v5l4 2"/></svg><span>Activity</span></span><span class="savings-tab muted-tab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21a7 7 0 0 0-14 0"/><circle cx="12" cy="7" r="4"/></svg><span>You</span></span></nav>
''')

# Add money input.
add=soup.find(id='add'); set_header(add,'Add money','Alps House Fund')
lead=add.select_one('.kicker');
if lead: lead.decompose()
h1=add.find('h1'); h1.string='How much are you adding?'
p=add.find('p',class_='bodycopy'); p.string='This savings group uses CHF.'
# Replace facts card entirely, preserving amount entry below.
facts=add.select_one('.summary-card')
if facts:
    set_inner(facts,'''
<div class="fact"><span>Available now</span><b data-bind-current-available>CHF 1240.00</b></div><div class="fact"><span>After confirmation</span><b data-bind-add-projected>CHF 1420.00</b></div><div class="fact"><span>Your position now</span><b data-bind-current-position>CHF 520.00</b></div>
''')
inf=add.select_one('.info')
if inf: inf.find_all('div')[-1].string='This counts toward the group only after it is confirmed. ChopDot never moves the money itself.'

# Add review.
ar=soup.find(id='add-review'); set_header(ar,'Review contribution','Nothing counted yet')
facts=ar.select_one('.summary-card')
if facts:
    hero=facts.select_one('.summary-hero')
    hero_html=str(hero) if hero else ''
    set_inner(facts, hero_html+'''<div class="fact"><span>From</span><b>Dev · You</b></div><div class="fact"><span>Currency</span><b>CHF</b></div><div class="fact"><span>Available now</span><b data-bind-current-available>CHF 1240.00</b></div><div class="fact"><span>After confirmation</span><b data-bind-add-projected>CHF 1420.00</b></div>''')
inf=ar.select_one('.info')
if inf: inf.find_all('div')[-1].string='This changes only your contribution to Alps House Fund. No other member or savings group is affected.'

# Waiting contribution copy and dynamic totals.
sent=soup.find(id='add-sent'); set_header(sent,'Contribution','Waiting for confirmation')
rows=sent.select('.timeline-row')
if len(rows)>=1:
    rows[0].find('b').string='You reported the contribution'
    # replace text after b if possible by reconstructing
    set_inner(rows[0], '<b>You reported the contribution</b>The amount is attached to this savings group.')
if len(rows)>=2:
    set_inner(rows[1], '<b>Waiting for confirmation</b>The group total has not changed yet.')
for f in sent.select('.fact'):
    lab=f.find('span').get_text(' ',strip=True) if f.find('span') else ''
    if lab=='Available': f.find('b')['data-bind-current-available']=''; f.find('b').string='CHF 1240.00'
    if 'Goal progress' in lab: f.find('b')['data-bind-current-progress-copy']=''; f.find('b').string='41%'

# Unknown-result screens: plain language, same behavior.
unknown=soup.find(id='unknown'); set_header(unknown,'Contribution','Result unknown')
# retain structural control ids/data attrs, update visible prose only.
for sec_id in ['unknown','unknown-still','unknown-confirmed','unknown-not-executed']:
    sec=soup.find(id=sec_id)
    for node in sec.find_all(string=True):
        t=str(node)
        repl=t
        repl=repl.replace('operation','contribution').replace('Operation','Contribution')
        repl=repl.replace('original request','original contribution')
        repl=repl.replace('original amount, person, group and contribution identity','same amount and savings group')
        if repl!=t: node.replace_with(repl)
still=soup.find(id='unknown-still')
inf=still.select_one('.info')
if inf: inf.find_all('div')[-1].string='ChopDot checked the same contribution again and still has no confirmed result. Keep checking this contribution; do not create another one yet.'
notexec=soup.find(id='unknown-not-executed')
inf=notexec.select_one('.info')
if inf: inf.find_all('div')[-1].string='The original contribution was verified as not completed. You can safely try the same amount for this savings group again.'
conf=soup.find(id='unknown-confirmed')
p=conf.select_one('.summary-hero p')
if p: p.string='The earlier contribution was found confirmed. Nothing was submitted twice.'

# Withdrawal input and review.
w=soup.find(id='withdraw'); set_header(w,'Withdraw','Alps House Fund')
k=w.select_one('.kicker');
if k: k.decompose()
w.find('h1').string='How much are you removing?'
p=w.find('p',class_='bodycopy'); p.string='You can withdraw only from your own confirmed position.'
facts=w.select_one('.summary-card')
if facts:
    set_inner(facts,'<div class="fact"><span>Your confirmed position</span><b data-bind-current-position>CHF 520.00</b></div><div class="fact"><span>Available now</span><b data-bind-current-available>CHF 1240.00</b></div>')
inf=w.select_one('.info')
if inf: inf.find_all('div')[-1].string='You cannot withdraw another member’s confirmed position.'

wr=soup.find(id='withdraw-review'); set_header(wr,'Review withdrawal','Nothing removed yet')
facts=wr.select_one('.summary-card')
if facts:
    hero=facts.select_one('.summary-hero'); hero_html=str(hero) if hero else ''
    set_inner(facts, hero_html+'''<div class="fact"><span>From</span><b>Dev · You</b></div><div class="fact"><span>Available now</span><b data-bind-current-available>CHF 1240.00</b></div><div class="fact"><span>After confirmation</span><b data-bind-withdraw-projected>CHF 1140.00</b></div><div class="fact"><span>Your position after</span><b data-bind-withdraw-position-projected>CHF 420.00</b></div>''')
inf=wr.select_one('.info')
if inf: inf.find_all('div')[-1].string='The group total changes only after this withdrawal is confirmed. You can withdraw only from your own confirmed position.'

wp=soup.find(id='withdraw-pending'); set_header(wp,'Withdrawal','Waiting for confirmation')
rows=wp.select('.timeline-row')
if len(rows)>=1: set_inner(rows[0],'<b>Withdrawal requested</b>Only your confirmed position is in scope.')
if len(rows)>=2: set_inner(rows[1],'<b>Waiting for confirmation</b>No money has been removed from the group total yet.')
for f in wp.select('.fact'):
    lab=f.find('span').get_text(' ',strip=True) if f.find('span') else ''
    if lab=='Available': f.find('b')['data-bind-current-available']=''; f.find('b').string='CHF 1240.00'

# Adjacent/reference states plain language.
shared=soup.find(id='shared'); set_header(shared,'Shared account','Savings option')
f=find_fact(shared,'Control model')
if f: f.find('span').string='Money stays'; f.find('b').string='Shared account'
f=find_fact(shared,'Group rule')
if f: f.find('span').string='Confirmation'; f.find('b').string='2 of 3 approvals'
for node in shared.find_all(string=True):
    t=str(node).replace('Journey 21 owns connection and approval UX. ','')
    if t!=str(node): node.replace_with(t)
wallet=soup.find(id='wallet'); set_header(wallet,'Wallet approval','External confirmation')
inf=wallet.select_one('.info')
if inf: inf.find_all('div')[-1].string='Connecting or approving in an external wallet cannot change the savings group until a verified result returns.'
activity=soup.find(id='activity'); set_header(activity,'Savings activity','Read-only history')
inf=activity.select_one('.info')
if inf: inf.find_all('div')[-1].string='Activity shows the broader history. It cannot confirm or execute a savings action.'

# Returned record dynamic current available.
returned=soup.find(id='returned')
f=find_fact(returned,'Current Available')
if f: f.find('b')['data-bind-current-available']=''; f.find('b').string='CHF 1240.00'

# Ensure no internal wording survives in normal screen copy (demo panel labels excluded semantically, but raw copy is cleaned too).
repls={
    'Journey 17':'Savings', 'Journey 18 preview':'Read-only history', 'Journey 21 preview':'External confirmation',
    'Control model':'Money stays', 'control model':'money location',
    'scoped contribution record':'contribution', 'tracking mode':'confirmed tracking', 'Tracking mode':'Confirmed tracking'
}
for node in soup.find_all(string=True):
    t=str(node); r=t
    for a,b in repls.items(): r=r.replace(a,b)
    if r!=t: node.replace_with(r)

# Patch exact continuity render script without changing operation semantics.
# Find the last script containing BASE_AVAILABLE.
script=None
for sc in soup.find_all('script'):
    if sc.string and 'BASE_AVAILABLE' in sc.string and 'J17Continuity' in sc.string:
        script=sc
if not script:
    raise RuntimeError('J17 continuity script missing')
js=script.string
# Insert generic current-state bindings into the existing continuity renderer.
needle="function render(){\n"
insert="""function render(){\n set('[data-bind-current-available]',fmt(state.available));\n set('[data-bind-current-position]',fmt(state.position));\n set('[data-bind-current-progress-copy]',pct(state.available));\n"""
if needle not in js:
    raise RuntimeError('render function not found')
js=js.replace(needle,insert,1)
# Add withdrawal-position projection next to the existing exact available projection.
target="set('[data-bind-withdraw-amount]',fmt(w));set('[data-bind-withdraw-projected]',fmt(state.available-w));"
if target not in js:
    raise RuntimeError('withdraw projected binding not found')
js=js.replace(target,target+"set('[data-bind-withdraw-position-projected]',fmt(state.position-w));",1)
script.string=js

out17=OUT/'chopdot-j17-v1.3-visual-candidate.html'
out17.write_text(str(soup),encoding='utf-8')

for p in [J16,J17,out16,out17]:
    print(p.name, hashlib.sha256(p.read_bytes()).hexdigest(), p.stat().st_size)

# ---------------- Final visual-QA postprocess ----------------
# These are deliberately part of regeneration so the exact reviewed bytes are reproducible.
from bs4 import BeautifulSoup as _BS

# J16: make settings normal product copy, remove dead setup back action, and force scroll instead of flex shrink.
p=out16
s=_BS(p.read_text(),'html.parser')
sec=s.find(id='settings')
if sec:
    main=sec.find('main'); main.clear(); h=_BS('''<div><h1 class="big-title">Group settings</h1><p class="bodycopy" style="margin-top:7px">Alps House Fund</p></div><section class="card summary-card"><div class="fact"><span>Goal</span><b>CHF 3000.00</b></div><div class="fact"><span>Target date</span><b>1 June 2027</b></div><div class="fact"><span>People</span><b>3</b></div></section>''','html.parser')
    for c in list(h.contents): main.append(c)
    f=sec.find('footer'); f.clear(); f.append(_BS('<a class="primary dark" href="#home">Done</a>','html.parser').find())
sec=s.find(id='start')
if sec:
    f=sec.find('footer')
    if f:
        for a in list(f.find_all('a')):
            if 'Back to Home' in a.get_text(' ',strip=True): a.decompose()
    h=sec.find('header'); first=next((c for c in h.children if getattr(c,'name',None)),None)
    if first and first.name=='a' and first.get('href')=='#start':
        span=s.new_tag('span');span['class']=['icon-btn'];span['style']='visibility:hidden';span['aria-hidden']='true';first.replace_with(span)
st=s.new_tag('style');st.string='''\n/* Visual QA correction: content must scroll instead of flex-shrinking cards. */\n.focus-content>*{flex:0 0 auto}\n.savings-goal-top>div>b{white-space:nowrap}\n@media(max-width:400px){.savings-goal-top>div>b{font-size:25px}}\n''';s.head.append(st)
p.write_text(str(s),encoding='utf-8')

# J17: final plain-language copy, exact start bindings, and scrolling rule.
p=out17
s=_BS(p.read_text(),'html.parser')
sent=s.find(id='add-sent'); rows=sent.select('.timeline-row') if sent else []
if len(rows)>=3:
    rows[2].clear(); h=_BS('<b>Still waiting</b>No confirmed result yet.','html.parser')
    for c in list(h.contents): rows[2].append(c)
still=s.find(id='unknown-still')
if still:
    for f in still.select('.fact'):
        sp=f.find('span')
        if sp and sp.get_text(' ',strip=True)=='Available shown': sp.string='Available'
shared=s.find(id='shared')
if shared:
    for a in shared.find_all('a'):
        if 'Preview wallet handoff' in a.get_text(' ',strip=True): a.string='Continue'
st=s.find(id='start')
if st:
    for el in st.select('[data-bind-position]'):
        el.attrs.pop('data-bind-position',None); el['data-bind-current-position']=''
    for el in st.select('[data-bind-available]'):
        el.attrs.pop('data-bind-available',None); el['data-bind-current-available']=''
    for el in st.select('[data-bind-progress-copy]'):
        el.attrs.pop('data-bind-progress-copy',None); el['data-bind-current-progress-copy']=''
fix=s.new_tag('style');fix.string='''\n/* Visual QA correction: content must scroll instead of flex-shrinking cards. */\n.focus-content>*{flex:0 0 auto}\n.savings-goal-top>div>b{white-space:nowrap}\n@media(max-width:400px){.savings-goal-top>div>b{font-size:25px}}\n''';s.head.append(fix)
# Closeout: review metadata must match the actual V1.3 candidate.
labh=s.select_one('.labpanel h2')
if labh and 'Contribute / Withdraw' in labh.get_text(' ',strip=True):
    labh.string='Savings — Contribute / Withdraw V1.3'
model=s.find('script',id='j17-v1-2-model')
if model:
    model['id']='j17-v1-3-model'
p.write_text(str(s),encoding='utf-8')

print('FINAL',out16.name,hashlib.sha256(out16.read_bytes()).hexdigest(),out16.stat().st_size)
print('FINAL',out17.name,hashlib.sha256(out17.read_bytes()).hexdigest(),out17.stat().st_size)
