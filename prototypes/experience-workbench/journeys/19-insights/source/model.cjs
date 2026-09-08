/* Journey 19 — Insights. Synthetic read model only; never a financial authority. */
'use strict';
const PERIODS={
  '30':{label:'Last 30 days',currentCHF:36000,previousCHF:42000,groups:{zurich:18000,apartment:12000,ski:6000},previousGroups:{zurich:15000,apartment:18000,ski:9000},openGroups:1,settledGroups:2,dotByGroup:{}},
  '90':{label:'Last 90 days',currentCHF:102000,previousCHF:113000,groups:{zurich:43000,apartment:35000,ski:16000,geneva:8000},previousGroups:{zurich:34000,apartment:42000,ski:22000,geneva:15000},openGroups:1,settledGroups:3,dotByGroup:{hackathon:2400000}},
  '365':{label:'Last 12 months',currentCHF:382000,previousCHF:365000,groups:{apartment:180000,zurich:92000,ski:62000,geneva:48000},previousGroups:{apartment:168000,zurich:85000,ski:67000,geneva:45000},openGroups:1,settledGroups:4,dotByGroup:{hackathon:4800000}}
};
const GROUPS={
  zurich:{name:'Zurich Weekend'},apartment:{name:'Apartment'},ski:{name:'Ski Trip'},geneva:{name:'Geneva Day'},hackathon:{name:'Hackathon'}
};
const clone=x=>JSON.parse(JSON.stringify(x));
const money=(minor,currency='CHF',scale=2)=>`${currency} ${(minor/(10**scale)).toLocaleString('en-US',{minimumFractionDigits:scale,maximumFractionDigits:scale})}`;
function snapshot(period='90',{authorized=['zurich','apartment','ski','geneva','hackathon'],complete=true}={}){
  const src=PERIODS[period]; if(!src) throw Error('Unknown period');
  const allowed=new Set(authorized);
  const groups=Object.fromEntries(Object.entries(src.groups).filter(([id])=>allowed.has(id)));
  const previousGroups=Object.fromEntries(Object.entries(src.previousGroups).filter(([id])=>allowed.has(id)));
  const currentCHF=Object.values(groups).reduce((a,b)=>a+b,0);
  const previousCHF=Object.values(previousGroups).reduce((a,b)=>a+b,0);
  const breakdown=Object.entries(groups).sort((a,b)=>b[1]-a[1]).map(([id,minor])=>({id,name:GROUPS[id].name,minor,share:currentCHF?minor/currentCHF:0}));
  const dot=Object.entries(src.dotByGroup).filter(([id])=>allowed.has(id)).map(([id,minor])=>({id,name:GROUPS[id].name,minor,currency:'DOT',scale:6}));
  return {period,label:src.label,currentCHF,previousCHF,deltaCHF:complete?currentCHF-previousCHF:null,comparisonAvailable:!!complete,breakdown,dot,openGroups:Math.min(src.openGroups,breakdown.length),settledGroups:Math.min(src.settledGroups,Math.max(0,breakdown.length-1)),complete};
}
function latestRecords(records){
  const map=new Map();
  for(const r of records){const prev=map.get(r.id);if(!prev||r.version>prev.version)map.set(r.id,clone(r));}
  return [...map.values()].filter(r=>r.status!=='deleted');
}
function aggregateRecords(records,{currency='CHF',authorizedGroups=null}={}){
  const allowed=authorizedGroups?new Set(authorizedGroups):null;
  return latestRecords(records).filter(r=>r.currency===currency&&(!allowed||allowed.has(r.group))).reduce((sum,r)=>sum+r.amountMinor,0);
}
function insightForGroup(period,id){
  const s=snapshot(period);const found=s.breakdown.find(x=>x.id===id);if(!found)return null;
  const prev=PERIODS[period].previousGroups[id]||0;
  return {...found,previousMinor:prev,deltaMinor:found.minor-prev};
}
function routeForGroup(id){return GROUPS[id]?'handoff-group':'overview';}
module.exports={PERIODS,GROUPS,clone,money,snapshot,latestRecords,aggregateRecords,insightForGroup,routeForGroup};
