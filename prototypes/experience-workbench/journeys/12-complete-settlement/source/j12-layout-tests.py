from pathlib import Path
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import hashlib,json,sys
W,H=int(sys.argv[1]),int(sys.argv[2]);root=Path(__file__).resolve().parents[1];qa=root/'chopdot-j12-continuity-qa';out=qa/f'layout-{W}x{H}';out.mkdir(exist_ok=True)
html=(root/'v1.1-continuity-candidate.html').read_text();soup=BeautifulSoup(html,'html.parser');ids=[s['id'] for s in soup.select('.screen')];results=[];console=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);context=b.new_context(viewport={'width':W,'height':H})
 for id in ids:
  page=context.new_page();page.on('pageerror',lambda err:console.append(str(err)))
  page.evaluate('(id)=>history.replaceState(null,"","about:blank#"+id)',id);page.set_content(html)
  m=page.evaluate('''() => {
   const s=document.querySelector('.screen[data-active=true]'),h=s.querySelector('header'),m=s.querySelector('main'),f=s.querySelector('footer'),r=x=>x.getBoundingClientRect();
   const overflow=[...s.querySelectorAll('.card,.record-row,.method-row')].filter(e=>r(e).left<-.5||r(e).right>innerWidth+.5).length;
   const oversize=[...s.querySelectorAll('svg')].filter(e=>r(e).width>60||r(e).height>60).length;
   return {screen:s.id,blank:m.innerText.trim().length===0,horizontalOverflow:document.body.scrollWidth>innerWidth,headerOverlap:r(h).bottom>r(m).top+.5,footerOverlap:r(m).bottom>r(f).top+.5,footerVisible:r(f).bottom<=innerHeight+.5,clippedCards:overflow,oversizedIcons:oversize,svgs:s.querySelectorAll('svg').length};
  }''');m['requested']=id;m['passed']=m['screen']==id and not any(m[k] for k in ['blank','horizontalOverflow','headerOverlap','footerOverlap','clippedCards','oversizedIcons']) and m['footerVisible'];results.append(m)
  page.screenshot(path=str(out/f'{id}.png'));page.close()
 b.close()
res={'ok':all(x['passed'] for x in results) and not console,'sha256':hashlib.sha256(html.encode()).hexdigest(),'viewport':f'{W}x{H}','checks':results,'consoleErrors':console};(qa/f'layout-checks-{W}x{H}.json').write_text(json.dumps(res,indent=2));print(res['ok'],len(results));print([x for x in results if not x['passed']])
