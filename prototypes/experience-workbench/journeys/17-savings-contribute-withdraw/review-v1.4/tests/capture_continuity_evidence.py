from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/'candidates/chopdot-j17-v1.4-operation-continuity-candidate.html').read_text();shots=ROOT/'screenshots'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox']);page=b.new_page(viewport={'width':393,'height':852});page.set_content(html)
 def route(x):page.evaluate('(s)=>location.hash=s',x);page.wait_for_timeout(15)
 def click(s):page.locator(s).click();page.wait_for_timeout(15)
 # 50 contribution review/wait
 route('add');click('#add button[data-set="50.00"]');click('#add a[href="#add-review"]');page.screenshot(path=str(shots/'evidence-add50-review.png'));click('#add-review a[href="#add-sent"]');page.screenshot(path=str(shots/'evidence-add50-waiting.png'))
 # unknown -> check -> back group unresolved
 page.evaluate('J17Continuity.beginUnknown()');route('unknown');click('#unknown [data-action="check-original"]');click('#unknown-still [data-action="leave-unresolved"]');page.screenshot(path=str(shots/'evidence-unresolved-start.png'))
 # reset in-memory for max withdrawal
 page.evaluate("J17Continuity.state.op=null;J17Continuity.state.seq=0;J17Continuity.state.available=124000;J17Continuity.state.position=52000;location.hash='withdraw'");click('#withdraw button[data-set="520.00"]');click('#withdraw a[href="#withdraw-review"]');click('#withdraw-review a[href="#withdraw-pending"]');page.evaluate("J17Continuity.serviceResult('unknown');J17Continuity.serviceResult('not-executed')");click('#unknown-not-executed [data-action="retry-original"]');page.screenshot(path=str(shots/'evidence-withdraw520-retry-review.png'));click('#withdraw-review a[href="#withdraw-pending"]');page.screenshot(path=str(shots/'evidence-withdraw520-retry-submitted.png'))
 b.close()
# sheet
items=[('evidence-add50-review.png','CHF 50 review'),('evidence-add50-waiting.png','CHF 50 waiting'),('evidence-unresolved-start.png','Unresolved survives Back'),('evidence-withdraw520-retry-review.png','Same-op retry review'),('evidence-withdraw520-retry-submitted.png','Same-op re-submitted')]
w=250;h=542;label=30;gap=16;cols=3;rows=2
canvas=Image.new('RGB',(gap+cols*(w+gap),gap+rows*(h+label+gap)),'white');d=ImageDraw.Draw(canvas)
for i,(fn,title) in enumerate(items):
 im=Image.open(shots/fn).convert('RGB');im.thumbnail((w,h));x=gap+(i%cols)*(w+gap);y=gap+(i//cols)*(h+label+gap);d.text((x,y+5),title,fill='black');canvas.paste(im,(x,y+label))
canvas.save(ROOT/'results/j17-v1.4-continuity-review.png')
print(ROOT/'results/j17-v1.4-continuity-review.png')
