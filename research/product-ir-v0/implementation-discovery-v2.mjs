// Product IR V0 — second-ring implementation discovery.
// Derives a broader implementation neighborhood from semantic seed terms,
// source imports, persistence/serialization boundaries and colocated tests.
// Research-only. Results are candidates, not authority.

import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, extname, basename } from 'node:path';

const root=new URL('../../',import.meta.url).pathname;
const src=join(root,'src');
const files=[];
function walk(d){for(const n of readdirSync(d)){const p=join(d,n),s=statSync(p);if(s.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(n))files.push(p);}}
walk(src);
const byRel=new Map(files.map(f=>[relative(root,f),f]));

const seedPatterns=[
  /\bExpenseSchema\b/,
  /\bCreateExpenseDTO\b/,
  /\bUpdateExpenseDTO\b/,
  /\bcomputeBalances\b/,
  /\bpaidBy\b/,
  /\baddExpense\b/,
  /\bupdateExpense\b/
];

function classify(rel,text){
 if(/\.test\.(ts|tsx)$/.test(rel)) return 'test';
 if(rel.includes('/repositories/')) return 'persistence';
 if(rel.includes('/crdt/')) return 'sync';
 if(/export/i.test(rel)) return 'serialization';
 if(rel.includes('/schema/')||rel.includes('/types/')) return 'domain';
 if(rel.includes('/services/settlement/')||/computeBalances/.test(text)) return 'calculation';
 if(rel.includes('/services/data/services/')) return 'operation';
 if(rel.includes('/hooks/')) return 'derived';
 if(rel.includes('/components/')) return 'projection';
 if(rel.includes('/routing/')) return 'routing';
 if(rel.includes('/utils/')) return 'utility';
 return 'other';
}
function resolveImport(from,spec){
 if(!spec.startsWith('.'))return null;
 const base=resolve(dirname(from),spec);
 for(const c of [base+'.ts',base+'.tsx',join(base,'index.ts'),join(base,'index.tsx')]) if(existsSync(c)) return c;
 return null;
}
function importsOf(file){
 const t=readFileSync(file,'utf8'),out=[];
 const re=/from\s+['"]([^'"]+)['"]/g;let m;
 while((m=re.exec(t))){const p=resolveImport(file,m[1]);if(p)out.push(p);}
 return out;
}
const importers=new Map();
for(const f of files){for(const dep of importsOf(f)){if(!importers.has(dep))importers.set(dep,new Set());importers.get(dep).add(f);}}

const direct=new Set();
for(const f of files){const t=readFileSync(f,'utf8');if(seedPatterns.some(r=>r.test(t)))direct.add(f);}

// Keep first ring focused on strong semantic files.
const strong=[...direct].filter(f=>{
 const t=readFileSync(f,'utf8'),rel=relative(root,f);
 return /ExpenseSchema|CreateExpenseDTO|UpdateExpenseDTO|computeBalances|paidBy/.test(t) &&
   !rel.includes('/docs/');
});
const discovered=new Map();
function add(f,ring,reason){
 if(!f||!byRel.has(relative(root,f)))return;
 const rel=relative(root,f),text=readFileSync(f,'utf8');
 const prev=discovered.get(rel);
 if(!prev||ring<prev.ring)discovered.set(rel,{file:rel,ring,role:classify(rel,text),reasons:[reason]});
 else if(!prev.reasons.includes(reason))prev.reasons.push(reason);
}
for(const f of strong)add(f,1,'semantic seed/symbol');

// Second ring: direct imports both directions around first-ring files.
for(const f of strong){
 for(const dep of importsOf(f))add(dep,2,'imported by first-ring file');
 for(const imp of importers.get(f)||[])add(imp,2,'imports first-ring file');
}

// Explicit technical boundaries discovered mechanically by symbol presence.
for(const f of files){
 const t=readFileSync(f,'utf8'),rel=relative(root,f);
 if(/\bpaidBy\b/.test(t) && (
   rel.includes('/repositories/') || rel.includes('/crdt/') || rel.includes('/utils/') ||
   rel.includes('/hooks/') || rel.includes('/components/screens/')
 )) add(f,2,'reads/writes legacy payer field at technical boundary');
}

// Colocated tests for discovered production files.
for(const item of [...discovered.values()]){
 if(item.role==='test')continue;
 const f=byRel.get(item.file);if(!f)continue;
 const stem=f.replace(/\.(ts|tsx)$/,'');
 for(const tf of [stem+'.test.ts',stem+'.test.tsx']) if(existsSync(tf))add(tf,2,'colocated test');
}

const items=[...discovered.values()].sort((a,b)=>a.ring-b.ring||a.role.localeCompare(b.role)||a.file.localeCompare(b.file));
const byRole={};
for(const x of items)(byRole[x.role]??=[]).push({file:x.file,ring:x.ring,reasons:x.reasons});

for(const required of [
 'src/schema/pot.ts',
 'src/services/data/repositories/ExpenseRepository.ts',
 'src/services/crdt/types.ts',
 'src/services/crdt/automergeUtils.ts',
 'src/utils/export.ts',
 'src/utils/normalization.ts',
 'src/services/settlement/calc.ts',
 'src/components/screens/ExpenseDetail.tsx'
]) assert.ok(discovered.has(required),`missing expected second-ring candidate ${required}`);

console.log(JSON.stringify({
 mode:'second-ring-derived-candidates',
 authority:false,
 counts:{files:items.length,roles:Object.fromEntries(Object.entries(byRole).map(([k,v])=>[k,v.length]))},
 byRole
},null,2));
