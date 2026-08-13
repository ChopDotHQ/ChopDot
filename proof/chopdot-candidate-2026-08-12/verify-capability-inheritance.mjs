import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const root=process.cwd();
const checks=[
  ['receipt-file-first','src/components/journey/DinnerJourneyEntry.tsx',['Choose dinner receipt','Add receipt','Review this spend']],
  ['receipt-link-first','src/components/journey/DinnerJourneyEntry.tsx',['Use a receipt link','Review link']],
  ['manual-correction-fallback','src/components/journey/DinnerJourneyEntry.tsx',['Dinner total','couldn’t read the total']],
  ['exact-three-person-split','src/journey/dinnerJourney.ts',['allocateMoneyEvenly','moneyFromDecimal','participants']],
  ['one-signed-event-authority','src/journey/dinnerJourney.ts',['createCanonicalEvent','projectCanonicalEvents','CanonicalEventV1']],
  ['payment-state-separation','src/components/journey/DinnerJourneyEntry.tsx',['I paid Mina','Mina still needs to confirm','Confirm received']],
  ['offline-durable-retry','src/journey/dinnerJourney.ts',['PendingIntent','storage.write','reconnect']],
  ['immutable-saved-record','src/core/moneyEventKernel.ts',['Closed records cannot be changed','GROUP_CLOSED']],
  ['actual-app-route','src/App.tsx',['DinnerJourneyEntry','dinnerJourney']],
  ['main-app-money-migration','tests/candidate-batch3-money-migration.test.ts',['migrateMainAppMoneyRows','Supabase']],
];
const results=checks.map(([id,file,needles])=>{
  const text=readFileSync(resolve(root,file),'utf8');
  const missing=needles.filter(needle=>!text.includes(needle));
  return{id,file,status:missing.length?'FAIL':'PASS',missing};
});
const deferred=[
  'savings circles','emergency pots','community funds','live Desktop archive/locator composition','exact observed payment adapter',
];
const report={v:1,generatedAt:new Date().toISOString(),scope:'Batch 4 delta only',disposition:'adapt and migrate behind One Chop Core; no wholesale merge',results,deferred,verdict:results.every(row=>row.status==='PASS')?'PASS':'FAIL'};
const output=resolve(root,'proof/chopdot-candidate-2026-08-12/test-results/b4-capability-inheritance.json');
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,`${JSON.stringify(report,null,2)}\n`);
console.log(`Batch 4 capability inheritance: ${report.verdict} (${results.filter(row=>row.status==='PASS').length}/${results.length})`);
console.log(output);
if(report.verdict!=='PASS')process.exitCode=1;
