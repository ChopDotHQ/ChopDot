import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const START='<!-- JOURNEY_DECISION_HISTORY:START -->';
export const END='<!-- JOURNEY_DECISION_HISTORY:END -->';
const fields=['Decision','Why','Alternatives','Tradeoffs','Revisit when','Approval / version','Sources'];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const workflow=`## Decision history and future revisits

Before bringing a new or revised journey for review, record its consequential decisions in \`journeys/<id>-<slug>/source/decision-history.md\`. Use \`templates/decision-history.md\`. The gate renders that small source section into the existing \`spec.md#decision-history\` after historical bundles run; do not edit the managed spec copy directly.

Each entry needs a stable ID, decision, why, alternatives considered, tradeoffs, revisit trigger, approval/version and source references. Distinguish the date a decision was made (only when known) from the date it was recorded or backfilled. Capture new choices and rejected options while discussing them, not after they are forgotten.

Backfill only what inspected sources support. Write **Not recorded in inspected sources** for missing rationale or alternatives. Do not invent discussions, treat a plausible explanation as a past decision, or turn a candidate policy into approval. Revisit triggers added later are labelled maintenance notes, not historical reasoning or authority to redesign.

Append later decisions with new IDs and link any superseded entry; never silently rewrite the historical reason. Use registry/approval records for current approval truth when old candidate-stage prose remains in a spec. Link the relevant scope, state/action mapping, test, QA or checkpoint rather than duplicating the complete specification.

Before revisiting: read the decision history and its sources, check the current registry and Golden checksum, inspect dependent journeys, and state what new evidence warrants a change. Preserve the approved artifact; any behavioral or visual change needs a separately reviewed version. TYPO-01 remains deferred until an explicit shared typography/readability pass.

The gate requires decision-history coverage for every Golden/current journey, checks the required fields and rendered/source consistency, and rechecks artifact locks. These are documentation-structure checks, not proof that every conversation or alternative was recovered. Future journeys cannot pass as current without a history source. Unstarted journeys are not filled with invented decisions.
`;
const startHere=`## Decision history

Each built journey's \`spec.md#decision-history\` records selected decisions, rationale, alternatives, tradeoffs, revisit triggers and source/approval references. Read it before changing a journey. Historical candidate labels do not override the current registry or approval records.

The 2026-09-06 backfill covers Journeys 01–14 from inspected records, not the complete conversation. Missing history is explicit. Author the section in the journey's \`source/decision-history.md\`; the gate preserves it through rebuilds. See \`WORKFLOW.md#decision-history-and-future-revisits\` and \`registry/checkpoints/2026-09-06-decision-history.json\`.
`;

/** Replace only a delimited documentation appendix; preserve all other bytes. */
export function withSection(original,section){
  assert(!section.includes(START)&&!section.includes(END),'Source must not contain generated markers');
  const opens=original.split(START).length-1,closes=original.split(END).length-1;
  assert(opens===closes&&opens<=1,'Malformed or duplicate decision-history markers');
  const block=`${START}\n${section.trim()}\n${END}`;
  if(!opens)return original+(original.endsWith('\n\n')?'':original.endsWith('\n')?'\n':'\n\n')+block+'\n';
  const a=original.indexOf(START),b=original.indexOf(END);
  assert(b>a,'Reversed decision-history markers');
  return original.slice(0,a)+block+original.slice(b+END.length);
}
export function validateSection(text,id){
  assert.equal((text.match(/^## Decision history$/gm)||[]).length,1,`${id}: one Decision history heading required`);
  assert(/^\*\*Coverage:\*\*\s+\S/m.test(text),`${id}: coverage qualifier required`);
  const chunks=text.split(/^### /m).slice(1);assert(chunks.length,`${id}: at least one recorded decision required`);
  const ids=new Set();
  for(const chunk of chunks){
    const match=chunk.match(/^(J\d{2}-D\d{2,})\s+[—-]\s+\S/);
    assert(match&&match[1].startsWith(`J${id}-`),`${id}: stable journey-scoped decision ID required`);
    assert(!ids.has(match[1]),`${id}: duplicate decision ID`);ids.add(match[1]);
    for(const field of fields){
      const marker=`**${field}:**`;
      assert.equal(chunk.split(marker).length-1,1,`${id}: missing or duplicated ${field}`);
      const value=chunk.split(marker)[1].split(/\n\n\*\*|\n### /)[0].trim();
      assert(value&&!/^\[.*\]$/.test(value),`${id}: ${field} must be filled or explicitly not recorded`);
    }
    assert(/\[[^\]]+\]\([^)]+\)/.test(chunk.split('**Sources:**')[1]),`${id}: traceable source link required`);
  }
  return chunks.length;
}
export function run(root,{check=false}={}){
  root=path.resolve(root);
  const resolve=relative=>{const p=path.resolve(root,relative);assert(p.startsWith(root+path.sep),'Path outside workbench');return p;};
  const read=relative=>fs.readFileSync(resolve(relative),'utf8');
  const json=relative=>JSON.parse(read(relative));
  const journeys=json('registry/journeys.json');
  const targets=journeys.filter(j=>['golden','current'].includes(j.status));
  assert(targets.length,'No built journeys registered');
  assert.equal(new Set(targets.map(j=>j.id)).size,targets.length,'Duplicate journey IDs');
  // Never repair/rewrite an artifact: a mismatch fails before documentation is written.
  const locks=json('registry/golden-artifact-locks.json');
  for(const lock of locks)assert.equal(sha(fs.readFileSync(resolve(lock.path))),lock.sha256,`Golden changed: ${lock.path}`);
  const plans=[],coverage=[];
  for(const j of targets){
    assert(/^\d{2}$/.test(j.id)&&/^[a-z0-9-]+$/.test(j.slug),'Invalid journey path');
    const dir=`journeys/${j.id}-${j.slug}`;
    assert.equal(j.spec_path,`${dir}/spec.md`,`${j.id}: canonical specification path required`);
    const sourcePath=`${dir}/source/decision-history.md`;
    const source=read(sourcePath),count=validateSection(source,j.id);
    const spec=read(j.spec_path),expected=withSection(spec,source);
    if(j.prototype_sha256)assert.equal(sha(fs.readFileSync(resolve(j.prototype_path))),j.prototype_sha256,`Candidate changed: ${j.id}`);
    plans.push([j.spec_path,expected]);
    coverage.push({journey:j.id,version:j.version,approval:j.approval,status:j.status,decisions:count,source_path:sourcePath,source_sha256:sha(source),spec_path:j.spec_path,spec_sha256:sha(expected)});
  }
  plans.push(['WORKFLOW.md',withSection(read('WORKFLOW.md'),workflow)]);
  plans.push(['START_HERE.md',withSection(read('START_HERE.md'),startHere)]);
  // Check all content before any writes; --check is strictly read-only.
  for(const [relative,expected] of plans)if(check)assert.equal(read(relative),expected,`Stale rendered decision history: ${relative}`);
  const summary={ok:true,scope:'documentation structure and artifact preservation',covered_journeys:coverage.length,decision_entries:coverage.reduce((n,j)=>n+j.decisions,0),all_golden_locks_pass:true,coverage,complete_conversation_audit:false,typography_note:'TYPO-01 deferred'};
  const report=JSON.stringify(summary,null,2)+'\n';
  if(check)assert.equal(read('registry/decision-history-validation.json'),report,'Stale decision-history validation report');
  else {
    for(const [relative,expected] of plans)if(read(relative)!==expected)fs.writeFileSync(resolve(relative),expected);
    fs.writeFileSync(resolve('registry/decision-history-validation.json'),report);
  }
  console.log(`DECISION HISTORY ${check?'CHECK PASSED':'MATERIALIZED'}: ${coverage.length} journeys, ${summary.decision_entries} sourced entries; artifact locks unchanged. Full conversation not audited.`);
  return summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  assert(process.argv.slice(2).every(a=>a==='--check'),'Only --check is supported');
  run(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),{check:process.argv.includes('--check')});
}
