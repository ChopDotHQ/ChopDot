import assert from 'node:assert/strict';
import { validateSettlementConsumption } from './stage-5-safety-lib.mjs';

// Only semantic errors count as detection here; no hash/seal detector is invoked.
export function runSettlementConsumptionRegressions(core,graph){
  const clone=()=>structuredClone(graph);
  const settlement=g=>g.contexts.find(c=>c.id==='ctx.settlement');
  const laws=['LAW-PAY-01','LAW-PAY-02','LAW-PAY-03','LAW-OP-01','LAW-OP-02','LAW-POS-SCOPE-01'];
  const preserves=['payment_id/idempotency','payer','recipient','one currency','exact amount','source groups/items','accepted result'];
  let count=0;
  function rejects(change,id,field,value){
    const g=clone();change(g);
    const errors=validateSettlementConsumption(core,g);
    assert.ok(errors.some(e=>e.id===id&&(!field||e[field]===value)),`missing ${id}: ${JSON.stringify(errors)}`);count++;
  }
  function accepts(change){const g=clone();change(g);assert.deepEqual(validateSettlementConsumption(core,g),[]);count++;}
  function alternate(g,kind){
    const source=settlement(g);
    const c=kind==='group'?g.contexts.find(c=>c.id==='ctx.group'):structuredClone(source);
    if(kind!=='group'){c.id='ctx.regression_handoff';c.name='Handoff';g.contexts.push(c);}
    else{c.objects=[...new Set([...c.objects,...source.objects])];c.preserves=[...new Set([...c.preserves,...source.preserves])];}
    for(const j of g.journey_projections){
      if(j.emits_contexts.includes('ctx.settlement')&&!j.emits_contexts.includes(c.id))j.emits_contexts.push(c.id);
      if(j.id==='12')j.entry_contexts_any=[c.id];
    }
    return c;
  }
  accepts(()=>{});
  for(const law of laws)rejects(g=>{settlement(g).laws=settlement(g).laws.filter(x=>x!==law);},'SETTLEMENT-CONSUMER-LAW','law',law);
  rejects(g=>{settlement(g).laws=['LAW-POS-SCOPE-01'];},'SETTLEMENT-CONSUMER-LAW');
  for(const preservation of preserves)rejects(g=>{settlement(g).preserves=settlement(g).preserves.filter(x=>x!==preservation);},'SETTLEMENT-CONSUMER-PRESERVATION','preservation',preservation);
  rejects(g=>{settlement(g).preserves=['payer','recipient','one currency'];},'SETTLEMENT-CONSUMER-PRESERVATION');
  rejects(g=>{settlement(g).laws=settlement(g).laws.map(x=>x==='LAW-PAY-01'?'LAW-MONEY-01':x);},'SETTLEMENT-CONSUMER-LAW','law','LAW-PAY-01');
  for(const [from,to] of [['exact amount','approximate amount'],['accepted result','unverified result']])
    rejects(g=>{settlement(g).preserves=settlement(g).preserves.map(x=>x===from?to:x);},'SETTLEMENT-CONSUMER-PRESERVATION','preservation',from);
  for(const kind of ['group','opaque'])rejects(g=>{alternate(g,kind).laws=['LAW-POS-SCOPE-01'];},'SETTLEMENT-CONSUMER-LAW');
  rejects(g=>{const c=alternate(g,'opaque');c.objects=[];c.laws=[];c.preserves=[];},'SETTLEMENT-CONSUMER-OBJECT');
  accepts(g=>{alternate(g,'opaque');});
  accepts(g=>{settlement(g).laws.reverse();settlement(g).preserves.reverse();});
  accepts(g=>{g.contexts.find(c=>c.id==='ctx.entry').preserves.reverse();});
  // Normal group, wallet, recovery and expense guard contexts have no newly
  // imposed full-payment contract. A preparation journey can start from Position.
  accepts(g=>{g.journey_projections.find(j=>j.id==='11').entry_contexts_any=['ctx.position','ctx.group'];});
  return {cases:count,result:'PASS'};
}
