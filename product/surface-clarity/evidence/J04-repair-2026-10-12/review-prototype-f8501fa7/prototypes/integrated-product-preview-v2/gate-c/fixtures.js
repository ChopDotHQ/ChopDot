import { upgrade as upgradeB, transition as expenseTransition, newDraft } from '../gate-b/model.js';
import { upgrade } from './model.js';
export function addGoldenExample(input, core) {
  let s=upgrade(upgradeB(input));
  const originalGroup=s.group;
  for(const [id,name] of [['gc-jeanine','Jeanine'],['gc-marc','Marc'],['gc-sam','Sam'],['gc-nina','Nina']])
    if(!s.people.some(p=>p.id===id))s.people.push({id,name});
  const groups=[['gc-apartment','Apartment','CHF'],['gc-ski','Ski Trip','CHF'],['gc-zurich','Zurich Weekend','CHF'],['gc-geneva','Geneva Day','CHF'],['gc-euro','Paris','EUR']].map(([id,name,currency])=>({id,name,currency,exponent:2}));
  for(const g of groups)if(!s.groups.some(x=>x.id===g.id))s.groups.push(g);
  const items=[
    ['apartment-jeanine','gc-apartment','gc-jeanine','self','74.30','Apartment supplies'],
    ['ski-jeanine','gc-ski','self','gc-jeanine','20.00','Ski passes'],
    ['apartment-marc','gc-apartment','self','gc-marc','20.00','Groceries'],
    ['ski-sam','gc-ski','self','gc-sam','59.30','Ski rental'],
    ['zurich-marc','gc-zurich','self','gc-marc','52.90','Dinner'],
    ['geneva-nina','gc-geneva','gc-nina','self','30.00','Lunch'],
    ['geneva-marc','gc-geneva','self','gc-marc','52.50','Train'],
    ['geneva-sam','gc-geneva','self','gc-sam','31.80','Tickets'],
    ['euro-sam','gc-euro','gc-sam','self','18.00','Paris café']
  ];
  for(const [shortId,groupId,payer,debtor,amount,description] of items){
    const id='gc-example-'+shortId;
    if(s.expenses.some(e=>e.id===id))continue;
    s.group=s.groups.find(g=>g.id===groupId);
    const d={...newDraft(s,payer,id),operationId:id+'-create',amountText:amount,description,date:'2026-10-03',payerId:payer,participantIds:[payer,debtor],method:'exact',exact:{[payer]:'0',[debtor]:amount}};
    s=expenseTransition(s,{type:'create',id,actor:payer,operationId:d.operationId,draft:d},core,'2026-10-03T10:00:00.000Z');
    s=expenseTransition(s,{type:'agree',id,actor:debtor,operationId:id+'-agree',revision:1},core,'2026-10-03T10:01:00.000Z');
  }
  s.group=originalGroup||groups[0];s.gateC.fixtureAdded=true;
  return s;
}
