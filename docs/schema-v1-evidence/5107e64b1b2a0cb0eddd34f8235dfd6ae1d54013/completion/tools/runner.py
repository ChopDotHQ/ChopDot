#!/usr/bin/env python3
import argparse,subprocess,tempfile,pathlib,json,os,shutil,time,hashlib,sys
import yaml
from mutations import cases,apply
BASE='5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013'
TREE='ce5b82d008dfa2f48e714607e30fdb6839b8305c'
AUTH='4ba456e6595330e4ca8e21366e0d827f17e10881'
HERE=pathlib.Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--repo',default='https://github.com/ChopDotHQ/ChopDot.git');p.add_argument('--out',required=True);p.add_argument('--phase',choices=['baseline'],default='baseline');p.add_argument('--case',action='append');a=p.parse_args()
out=pathlib.Path(a.out).resolve();out.mkdir(parents=True,exist_ok=False)
steps=[]
def run(cmd,cwd,log,required=False):
    start=time.time();r=subprocess.run(cmd,cwd=cwd,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
    item={'command':cmd,'cwd':str(cwd),'exit_code':r.returncode,'seconds':round(time.time()-start,3),'log':str(log.relative_to(out))}
    log.parent.mkdir(parents=True,exist_ok=True);log.write_text('$ '+(cmd if isinstance(cmd,str) else ' '.join(cmd))+'\n'+r.stdout+'\nEXIT_CODE='+str(r.returncode)+'\n')
    if required and r.returncode: raise RuntimeError(json.dumps(item))
    return item,r.stdout

def git(repo,*args):return subprocess.check_output(['git','-C',str(repo),*args],text=True).strip()
def commit(repo,msg):
    subprocess.run(['git','-C',str(repo),'add','product-schema'],check=True)
    subprocess.run(['git','-C',str(repo),'-c','user.name=Disposable Schema Investigation','-c','user.email=schema-investigation@example.invalid','-c','core.hooksPath=/dev/null','commit','--no-gpg-sign','--allow-empty','-m',msg],check=True,stdout=subprocess.DEVNULL)

result={'base_sha':BASE,'expected_tree':TREE,'product_authority':AUTH,'phase':a.phase,'case_provenance':'reconstructed','execution':'local schema shell chain; not GitHub Actions or repo-wide CI/Cypress','cases':[]}
try:
 with tempfile.TemporaryDirectory(prefix='chopdot-sec-schema-001-') as tmp:
    tmp=pathlib.Path(tmp);seed=tmp/'seed'
    for cmd in [['git','--version'],['node','--version'],['python3','--version'],['bash','--version']]:
        i,s=run(cmd,tmp,out/'setup'/('version-'+cmd[0]+'.log'),True);steps.append(i)
    if not subprocess.check_output(['node','--version'],text=True).startswith('v22.'):raise RuntimeError('Missing Node 22 on PATH; use npm exec --yes --package=node@22 -- ./run.sh ...')
    i,s=run(['git','clone','--no-hardlinks','--no-checkout',a.repo,str(seed)],tmp,out/'setup/clone.log',True);steps.append(i)
    i,s=run(['git','checkout','--detach',BASE],seed,out/'setup/checkout.log',True);steps.append(i)
    result['actual_tree']=git(seed,'rev-parse','HEAD^{tree}');assert result['actual_tree']==TREE
    assert git(seed,'cat-file','-t',AUTH)=='commit'
    # Full clone provides history. Restore upstream remote URL when cloning an investigator clone.
    if pathlib.Path(a.repo).exists():
        upstream=git(pathlib.Path(a.repo),'remote','get-url','origin')
        subprocess.run(['git','-C',str(seed),'remote','set-url','origin',upstream],check=True)
    workflow=yaml.safe_load((seed/'.github/workflows/product-schema-v1.yml').read_text())
    wfsteps=workflow['jobs']['schema']['steps']
    result['workflow']=wfsteps
    (out/'workflow-extracted.json').write_text(json.dumps(wfsteps,indent=2)+'\n')
    commands=[s['run'] for s in wfsteps if 'run' in s]
    prerequisite=[s for s in commands if s.startswith('git fetch')]
    chain=[s for s in commands if not s.startswith('git fetch')]
    generators=[s for s in chain if s.startswith('node product-schema/derive-')]
    for n,cmd in enumerate(prerequisite):
        i,s=run(['bash','--noprofile','--norc','-eo','pipefail','-c',cmd],seed,out/'setup'/f'prerequisite-{n}.log',True);steps.append(i)
    # Keep fetched evidence reachable through a local disposable ref for child clones.
    subprocess.run(['git','-C',str(seed),'update-ref','refs/heads/investigation-gate-a','8548313791e4ef7b436ee742cd18c1fa48d74eeb'],check=True)
    trusted={str(f.relative_to(seed)):hashlib.sha256(f.read_bytes()).hexdigest() for f in (seed/'product-schema').glob('*.mjs')}
    (out/'trusted-baseline-sha256.json').write_text(json.dumps(trusted,indent=2)+'\n')
    for case in cases():
        if a.case and case['id'] not in a.case:continue
        d=out/case['id'];d.mkdir();repo=tmp/case['id']
        i,s=run(['git','clone','--shared','--no-checkout',str(seed),str(repo)],tmp,d/'clone.log',True)
        run(['git','checkout','--detach',BASE],repo,d/'checkout.log',True)
        run(['git','cat-file','-e','8548313791e4ef7b436ee742cd18c1fa48d74eeb:prototypes/integrated-product-preview-v2/money-v1.js'],repo,d/'evidence-check.log',True)
        c={'id':case['id'],'kind':case['kind'],'mutation':case,'regeneration':[],'chain':[]}
        if a.phase=='repaired':
            run(['git','apply',str(HERE/'proposed-fix.patch')],repo,d/'repair-apply.log',True)
            commit(repo,'Local proposal only; no seal update')
        before=(repo/'product-schema/composition-graph.json').read_text()
        graph=json.loads(before);apply(graph,case)
        if case['action']!='none':(repo/'product-schema/composition-graph.json').write_text(json.dumps(graph,indent=2,ensure_ascii=False)+'\n')
        (d/'mutation.patch').write_text(git(repo,'diff','--','product-schema/composition-graph.json')+'\n')
        if case['action']!='none':commit(repo,'Local reconstructed '+case['id'])
        c['authored_commit']=git(repo,'rev-parse','HEAD')
        c['authored_tree']=git(repo,'rev-parse','HEAD^{tree}')
        assert git(repo,'diff',BASE,'--','prototypes/experience-workbench')==''
        if a.phase=='baseline':
            assert all(hashlib.sha256((repo/f).read_bytes()).hexdigest()==v for f,v in trusted.items())
        # Commit authored mutation before derivation: shipped seals read HEAD blobs.
        for n,cmd in enumerate(generators):
            i,s=run(['bash','--noprofile','--norc','-eo','pipefail','-c',cmd],repo,d/f'regenerate-{n}.log');c['regeneration'].append(i)
        (d/'regeneration.diff').write_text(git(repo,'diff','--','product-schema/generated')+'\n')
        c['clean_regeneration_tracked_diff']=git(repo,'diff','--name-only')
        c['regeneration_untracked']=git(repo,'ls-files','--others','--exclude-standard')
        # Pins only generated mutant diagnostics, NOT reviewed authored baseline/seal constants.
        if case['action']!='none' or a.phase=='repaired':commit(repo,'Pin experimental derived output for determinism test')
        c['tested_commit']=git(repo,'rev-parse','HEAD');c['tested_tree']=git(repo,'rev-parse','HEAD^{tree}')
        # Continue after failures to execute EVERY required check; CI would stop at first failure.
        for n,cmd in enumerate(chain):
            i,s=run(['bash','--noprofile','--norc','-eo','pipefail','-c',cmd],repo,d/f'chain-{n:02d}.log');c['chain'].append(i)
        cov=json.loads((repo/'product-schema/generated/reconstruction-coverage.json').read_text())
        for name in ['reconstruction-coverage.json','mutation-coverage.json','adversarial-closure-coverage.json']:
            shutil.copyfile(repo/'product-schema/generated'/name,d/name)
        c['closure_errors']=cov['errors'];c['independent_safety_errors']=cov['independent_safety']['errors'];c['stage52_errors']=cov['stage_5_2']['errors']
        c['post_chain_diff']=git(repo,'diff','--name-only');c['all_required_checks_executed']=len(c['chain'])==len(chain)
        c['first_failing_command']=next((x['command'][-1] for x in c['chain'] if x['exit_code']),None)
        seals={'AUTHORED-BLOB-DRIFT','AUTHORED-BLOB-UNDECLARED','FREEZE-SEAL-DRIFT'}
        c['semantic_error_ids']=sorted({e['id'] for e in c['closure_errors'] if e['id'] not in seals})
        c['seal_error_ids']=sorted({e['id'] for e in c['closure_errors'] if e['id'] in seals})
        c['full_chain_pass']=all(x['exit_code']==0 for x in c['chain']) and all(x['exit_code']==0 for x in c['regeneration'])
        c['provisional_detection']='independent_semantic_rejection' if c['semantic_error_ids'] else ('structural_hash_seal_only' if c['seal_error_ids'] else ('full_chain_escape' if c['full_chain_pass'] and case['kind']=='attack' else 'valid_control_pass' if c['full_chain_pass'] else 'needs_triage'))
        # Classification remains provisional until early check failures / fixture validity inspected.
        (d/'result.json').write_text(json.dumps(c,indent=2)+'\n');result['cases'].append(c)
        (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
        print(a.phase,case['id'],c['provisional_detection'],c['semantic_error_ids'],flush=True)
        shutil.rmtree(repo)
    result['status']='EXECUTED'
except Exception as e:
    result['status']='BLOCKED';result['error']=str(e);raise
finally:
    result['setup_steps']=steps
    (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
