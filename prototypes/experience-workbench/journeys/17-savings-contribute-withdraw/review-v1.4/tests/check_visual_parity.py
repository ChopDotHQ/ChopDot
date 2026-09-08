from pathlib import Path
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from PIL import Image,ImageChops
import tempfile, json, shutil
ROOT=Path(__file__).resolve().parents[1]
old=(ROOT/'preserved/chopdot-j17-v1.3-visual-candidate.html').read_text()
new=(ROOT/'candidates/chopdot-j17-v1.4-operation-continuity-candidate.html').read_text()
screens=[x['id'] for x in BeautifulSoup(old,'html.parser').select('section.screen')]
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(393,852),(430,890)]:
  for sid in screens:
   paths=[]
   for label,html in [('v1.3',old),('v1.4',new)]:
    page=b.new_page(viewport={'width':w,'height':h});page.set_content(html);page.evaluate('(s)=>location.hash=s',sid);page.wait_for_timeout(15)
    f=ROOT/'results'/f'_parity-{label}-{sid}-{w}.png';page.screenshot(path=str(f));page.close();paths.append(f)
   a=Image.open(paths[0]).convert('RGB');c=Image.open(paths[1]).convert('RGB');d=ImageChops.difference(a,c);bbox=d.getbbox();changed=sum(1 for px in d.getdata() if px!=(0,0,0));results.append({'screen':sid,'viewport':f'{w}x{h}','pixel_identical':bbox is None,'changed_pixels':changed})
   for f in paths:f.unlink()
 b.close()
assert all(x['pixel_identical'] for x in results),[x for x in results if not x['pixel_identical']]
(ROOT/'results/VISUAL_PARITY.json').write_text(json.dumps({'ok':True,'comparisons':len(results),'all_pixel_identical':True,'results':results},indent=2)+'\n')
print(json.dumps({'ok':True,'comparisons':len(results),'all_pixel_identical':True},indent=2))
