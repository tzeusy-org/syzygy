from pathlib import Path
import datetime,hashlib,json,subprocess,sys
own=Path(__file__).resolve().parent;old=own/'old';new=own/'subject';m0=json.loads((own/'M0-full.json').read_text());assert m0['result']['success'] and m0['populations']['selected']==m0['populations']['generated'] and m0['totals']['answersCompared']>0 and all(r['same']for r in m0['successorFixture']['literalOutcomes'])
assert json.loads((own/'EXACT-DELTA-CLOSURE-RESULT.json').read_text())['targetedClosureSucceeded'] and json.loads((own/'M0-full-recount.json').read_text())['success'] and m0['populations']['selected']['worlds']==5403
plans=json.loads((own/'STATIC-NEGATIVE-CONTROL-PLAN.json').read_text())['controls'];rows=[]
def command(args,cwd):
 r=subprocess.run(args,cwd=cwd,text=True,capture_output=True);return {'argv':args,'cwd':str(cwd),'exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
def capture(name,args):
 r=command([sys.executable,str(own/'capture.py'),name,str(new),*args],new);receipt=json.loads((own/'logs'/(name+'.json')).read_text());return {'wrapper':r,'receipt':receipt}
for name,plan in zip(['supersession','blunt','unrelated'],plans):
 tree=own/'controls'/name;file=tree/plan['temporary_product_file'];before=file.read_text();assert before.count(plan['old'])==1;after=before.replace(plan['old'],plan['new']);file.write_text(after);meta=[]
 for args in [['git','checkout','-b','mutant/'+name],['git','add',plan['temporary_product_file']],['git','-c','core.hooksPath=/dev/null','commit','-m','test: private '+name+' negative control']]:
  r=command(args,tree);meta.append(r);assert r['exit']==0
 head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=tree,text=True).strip();build=command([sys.executable,str(own/'capture.py'),'build-control-'+name,str(tree),'node','scripts/clean_build.mjs','packages/polaris-generation-consent','packages/polaris-dossier'],new);assert build['exit']==0
 output=own/('NC-'+name+'.json');readers=','.join(plan['required_reader_mismatches']);args=['node',str(new/'scripts/differential_consent_act_families.mjs'),'--old',str(old),'--new',str(tree),'--out',str(output),'--bead','syzygy-bpyt.8.26','--kinds',','.join(plan['selection']),'--workers','2','--time-limit-ms','600000','--expect-mismatches','--expect-reader-mismatches',readers,'--control-note',plan['id']+': demanded readers '+readers+' must each differ']
 execution=capture('NC-'+name,args);d=json.loads(output.read_text());assert d['script']['sha256']==json.loads((own/'EXACT-DELTA-CLOSURE-RESULT.json').read_text())['finalToolSha256'] and d['totals']['answersCompared']>0
 if name=='unrelated':
  check=execution['receipt']['exitCode']==1 and d['unmetExpectedReaderMismatches']==['port'] and d['perLogicalReader']['port']['answers']>0 and d['perLogicalReader']['port']['mismatches']==0 and d['perLogicalReader']['gate-d9']['mismatches']>0 and len(d['result']['errors'])==1
 else:check=execution['receipt']['exitCode']==0 and d['result']['success'] and all(d['perLogicalReader'][r]['mismatches']>0 for r in plan['required_reader_mismatches'])
 rp=own/('NC-'+name+'-recount.json');recount=capture('NC-'+name+'-recount',['python3',str(own/'recount.py'),str(output),'--tree',str(old),'--out',str(rp)]);check=check and recount['receipt']['exitCode']==0
 record={'id':name,'plan':plan,'subjectCommit':head,'source':{'file':plan['temporary_product_file'],'originalSha256':hashlib.sha256(before.encode()).hexdigest(),'mutatedSha256':hashlib.sha256(after.encode()).hexdigest()},'metadata':meta,'build':build,'execution':execution,'recount':recount,'perReader':{r:d['perLogicalReader'].get(r)for r in plan['required_reader_mismatches']},'success':check};rows.append(record);print(name,'expected result',check,flush=True);assert check
 if name=='unrelated':
  out=own/'OLD-unchecked-reader-reproduction.json';args=['node',str(old/'scripts/differential_consent_act_families.mjs'),'--old',str(old),'--new',str(tree),'--out',str(out),'--bead','syzygy-bpyt.8.26','--kinds','base','--workers','2','--expect-mismatches','--control-note','port must have mismatches > 0']
  execution=capture('OLD-unchecked-reader-reproduction',args);prior=json.loads(out.read_text());portMismatches=[r for r in prior['mismatches']if r['reader'].startswith('port@') or r['reader']=='port'];record['oldToolReproduction']={'execution':execution,'totalMismatches':prior['totals']['mismatches'],'portMismatches':len(portMismatches),'falsePositiveReproduced':execution['receipt']['exitCode']==0 and prior['totals']['mismatches']>0 and len(portMismatches)==0};assert record['oldToolReproduction']['falsePositiveReproduced']
agg=own/'controls/supersession';bundleMeta=[]
for name in ['blunt','unrelated']:
 r=command(['git','fetch',str(own/'controls'/name),'mutant/'+name+':refs/heads/evidence/'+name],agg);bundleMeta.append(r);assert r['exit']==0
bundle=own/'semantic-mutants.bundle';r=command(['git','bundle','create',str(bundle),'refs/heads/mutant/supersession','refs/heads/evidence/blunt','refs/heads/evidence/unrelated','^134a8c5ba16dda1f3e3935aa1b565166f3b3583f'],agg);bundleMeta.append(r);assert r['exit']==0
verify=command(['git','bundle','verify',str(bundle)],new);assert verify['exit']==0
result={'schema':'consent-port-semantic-controls/1','M0Sha256':hashlib.sha256((own/'M0-full.json').read_bytes()).hexdigest(),'controls':rows,'bundle':{'path':str(bundle),'sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'bytes':bundle.stat().st_size,'metadata':bundleMeta,'verification':verify},'success':all(r['success']for r in rows)};(own/'SEMANTIC-CONTROL-RESULT.json').write_text(json.dumps(result,indent=2)+'\n');print('semantic control bundle complete',bundle.stat().st_size,flush=True)
