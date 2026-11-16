from pathlib import Path
import tempfile,subprocess,hashlib,json
OWN=Path('/home/orca/.tmp/syzygy-bpyt8-23-implementation-20261105');tempfile.tempdir=str(OWN/'tmp');TREE=OWN/'diagnostic-mutations';target=TREE/'packages/polaris-generation-consent/dist/in-force.js';before=target.read_bytes();old='return effective(records, now).live;';new='return [];';text=before.decode();assert text.count(old)==1;after=text.replace(old,new).encode();rows=[]
for role in ('original','mutant','restored'):
 target.write_bytes(after if role=='mutant' else before)
 try:
  cmd=['python3',str(OWN/'isolated.py'),str(TREE),'node','scripts/differential_consent_act_families.mjs','--old',str(OWN/'integrated-base'),'--new',str(TREE),'--out',str(OWN/f'sensitivity-{role}.json'),'--bead','syzygy-bpyt.8.23','--workers','2','--kinds','base']
  if role=='mutant':cmd+=['--expect-mismatches','--control-note','Compiled inForceRecords forced empty in owned sensitivity clone; this four-base-world selection is a sensitivity probe, never a replacement for the full corpus.']
  with (OWN/f'sensitivity-{role}.log').open('w') as out:r=subprocess.run(cmd,stdout=out,stderr=subprocess.STDOUT)
  report=json.loads((OWN/f'sensitivity-{role}.json').read_text());rows.append({'role':role,'command':cmd,'exit':r.returncode,'totals':report['totals'],'artifact':f'sensitivity-{role}.json','sha256':hashlib.sha256((OWN/f'sensitivity-{role}.json').read_bytes()).hexdigest()});print(role,r.returncode,report['totals']['worlds'],report['totals']['mismatches'],flush=True)
  assert r.returncode==0
 finally:target.write_bytes(before)
(OWN/'differential-sensitivity.json').write_text(json.dumps({'subject':subprocess.check_output(['git','rev-parse','HEAD'],cwd=TREE,text=True).strip(),'mutated_path':'packages/polaris-generation-consent/dist/in-force.js','old':old,'new':new,'original_sha256':hashlib.sha256(before).hexdigest(),'mutant_sha256':hashlib.sha256(after).hexdigest(),'adapter_sha256':hashlib.sha256((OWN/'isolated.py').read_bytes()).hexdigest(),'runs':rows},indent=2)+'\n')
