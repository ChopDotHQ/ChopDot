import hashlib, json, pathlib, subprocess, sys, tarfile, tempfile

repo = pathlib.Path(sys.argv[1]).resolve()
out = pathlib.Path(sys.argv[2]).resolve()
out.mkdir(parents=True, exist_ok=False)
base = 'de9ced5d281ec906f8cd3056164f864528ca7573'
fixture = 'prototypes/integrated-product-preview-v2/gate-b/test-server.mjs'
evidence = 'product/surface-clarity/evidence/J01-REV-001/'
commands = []
def run(args, cwd=repo):
    p = subprocess.run(args, cwd=cwd, text=True, capture_output=True)
    commands.append({'command': args, 'exit_code': p.returncode})
    if p.returncode: raise RuntimeError(p.stderr or p.stdout)
    return p.stdout.strip()
sha = run(['git', 'rev-parse', 'HEAD'])
tree = run(['git', 'rev-parse', 'HEAD^{tree}'])
assert run(['git', 'status', '--porcelain']) == '', 'Requires clean committed checkout'
changed = run(['git','diff','--name-only',base,sha]).splitlines()
assert all(p == fixture or p.startswith(evidence) for p in changed), changed
authority = []
for commit, expected in [('5107e64b1b2a0cb0eddd34f8235dfd6ae1d54013','ce5b82d008dfa2f48e714607e30fdb6839b8305c'), ('4ba456e6595330e4ca8e21366e0d827f17e10881','cb424dafedff066fed433e106eb4468bec985d98')]:
    actual=run(['git','rev-parse',commit+'^{tree}']); assert actual==expected
    authority.append({'sha':commit,'tree':actual})
unchanged = ['prototypes/integrated-product-preview-v2/create-join/browser-qa.mjs','product/surface-clarity/findings.json','product/surface-clarity/journeys/J01.json','product/surface-clarity/policy.json','scripts/package-preview-v2-gate-b.mjs','product/surface-clarity/evidence/J01-repair-2026-10-10/run.sh']
blobs=[]
for p in unchanged:
    old=run(['git','rev-parse',base+':'+p]); current=run(['git','rev-parse',sha+':'+p]); assert old==current
    blobs.append({'path':p,'base_blob':old,'successor_blob':current})
with tempfile.TemporaryDirectory(prefix='j01-favicon-pack-') as scratch:
    scratch=pathlib.Path(scratch); source=scratch/'source';source.mkdir()
    archive=scratch/'source.tar'
    with archive.open('wb') as f: subprocess.run(['git','archive',sha],cwd=repo,stdout=f,check=True)
    with tarfile.open(archive) as t: t.extractall(source,filter='data')
    manifests=[]
    for label in ['a','b']:
        preview=scratch/label
        p=subprocess.run(['node','scripts/package-preview-v2-gate-b.mjs',str(preview)],cwd=source,text=True,capture_output=True)
        commands.append({'command':['node','scripts/package-preview-v2-gate-b.mjs',str(preview)],'exit_code':p.returncode})
        (out/('package-'+label+'.log')).write_text(p.stdout+p.stderr);assert p.returncode==0
        manifest={str(f.relative_to(preview)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(preview.rglob('*')) if f.is_file()}
        manifests.append(manifest);(out/('package-'+label+'-manifest.json')).write_text(json.dumps(manifest,indent=2)+'\n')
    assert manifests[0]==manifests[1], 'Non-deterministic package bytes'
    j01='prototypes/experience-workbench/journeys/01-enter-chopdot/v1-candidate.html'
    assert manifests[0][j01]=='97f3da489c78cb842c354390b2e354397a6a6c3843228ec9928efebaf21089e8'
result={'status':'PASS','sha':sha,'tree':tree,'changed_files':changed,'authority':authority,'unchanged_blobs':blobs,'package_file_count':len(manifests[0]),'deterministic_packaging':True,'j01_sha256':manifests[0][j01],'commands':commands}
(out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'status':'PASS','sha':sha,'package_file_count':len(manifests[0])}))
