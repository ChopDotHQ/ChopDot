import fs from 'node:fs';import vm from 'node:vm';
const base=new URL('./',import.meta.url);
for(const j of ['j27','j28']){const html=fs.readFileSync(new URL(`goldens/${j}.html`,base),'utf8');const code=html.slice(html.indexOf('<script>')+8,html.indexOf('const ROOTS='));const defs=vm.runInNewContext(code+';D',{}, {timeout:1000});fs.writeFileSync(new URL(`${j}-definitions.json`,base),JSON.stringify(defs,null,2)+'\n');}
