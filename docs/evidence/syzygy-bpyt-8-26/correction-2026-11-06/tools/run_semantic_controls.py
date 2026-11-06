"""Actual private committed product faults; gated by corrected complete full M0."""
from pathlib import Path
import datetime,hashlib,json,subprocess,sys
own=Path(__file__).resolve().parent;old=own/'old';new=own/'new';m0=json.loads((own/'M0-full.json').read_text());assert json.loads((own/'M0-FIRST-GATE.json').read_text())['mutationScoringReleased'] and m0['result']['success'] and m0['populations']['selected']==m0['populations']['generated']
assert hashlib.sha256((new/'scripts/differential_consent_act_families.mjs').read_bytes()).hexdigest()==m0['script']['sha256'] and subprocess.check_output(['git','rev-parse','HEAD'],cwd=new,text=True).strip()==m0['trees'][1]['commit'] and len(m0['successorFixture']['literalOutcomes'])==12 and all(r['same']for r in m0['successorFixture']['literalOutcomes'])
plans=json.loads((own/'SEMANTIC-PLANS.json').read_text());rows=[]
def command(args,cwd):
 r=subprocess.run(list(map(str,args)),cwd=cwd,text=True,capture_output=True);return {'argv':list(map(str,args)),'cwd':str(cwd),'exit':r.returncode,'stdout':r.stdout,'stderr':r.stderr}
def cap(name,cwd,args,expected=0):
 r=command([sys.executable,own/'capture.py',name,cwd,*args],new);receipt=json.loads((own/'logs'/(name+'.json')).read_text());assert receipt['exitCode']==expected,(name,receipt);return {'wrapper':r,'receipt':receipt}
for plan in plans:
 name=plan['id'];tree=own/'controls'/name;metadata=[]
 for args,cwd in [(['git','clone','--quiet','--no-hardlinks',new,tree],own),(['git','checkout','-b','mutant/'+name],tree)]:
  r=command(args,cwd);metadata.append(r);assert r['exit']==0,r
 cap('npm-ci-control-'+name,tree,['npm','ci','--offline','--ignore-scripts'])
 file=tree/plan['temporary_product_file'];before=file.read_text();assert before.count(plan['old'])==1;after=before.replace(plan['old'],plan['new']);file.write_text(after)
 for args in [['git','add',plan['temporary_product_file']],['git','-c','core.hooksPath=/dev/null','commit','-m','test: private '+name+' sensitivity control']]:
  r=command(args,tree);metadata.append(r);assert r['exit']==0,r
 head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=tree,text=True).strip();build=cap('build-control-'+name,tree,['node','scripts/clean_build.mjs','packages/polaris-generation-consent','packages/polaris-dossier'])
 out=own/('NC-'+name+'.json');base=['node',new/'scripts/differential_consent_act_families.mjs','--old',old,'--new',tree,'--out',out,'--bead','syzygy-bpyt.8.26','--kinds',','.join(plan['selection']),'--workers','2','--time-limit-ms','600000'];readers=','.join(plan['required_reader_mismatches']);falsePositive=name=='unrelated-reader-cannot-satisfy-port';execution=cap('NC-'+name,new,[*base,'--expect-mismatches','--expect-reader-mismatches',readers,'--control-note',name+': required readers '+readers+' must differ'],1 if falsePositive else 0);d=json.loads(out.read_text());assert d['totals']['answersCompared']>0 and d['script']['sha256']==m0['script']['sha256']
 if falsePositive:assert d['unmetExpectedReaderMismatches']==['port'] and d['perLogicalReader']['port']['mismatches']==0 and d['perLogicalReader']['gate-d9']['mismatches']>0
 else:assert d['result']['success'] and all(d['perLogicalReader'][r]['mismatches']>0 for r in plan['required_reader_mismatches'])
 recount=cap('NC-'+name+'-recount',new,['python3',own/'recount.py',out,'--tree',old,'--new-tree',tree,'--out',own/('NC-'+name+'-recount.json')]);record={'id':name,'plan':plan,'subjectCommit':head,'originalSha256':hashlib.sha256(before.encode()).hexdigest(),'mutatedSha256':hashlib.sha256(after.encode()).hexdigest(),'metadata':metadata,'build':build,'execution':execution,'recount':recount,'perLogicalReader':d['perLogicalReader'],'success':True}
 if plan.get('requestsOnly'):
  historical=own/('OLD-F1-'+name+'.json');original=cap('OLD-F1-'+name,new,['node',own/'ORIGINAL-F1-TOOL.mjs','--old',old,'--new',tree,'--out',historical,'--bead','syzygy-bpyt.8.26','--kinds','base','--workers','2','--time-limit-ms','600000']);prior=json.loads(historical.read_text());assert prior['result']['success'] and prior['perLogicalReader']['gate-port']['answers']>0 and prior['perLogicalReader']['gate-port']['mismatches']==0;record['oldToolOmissionReproduced']={'execution':original,'scriptSha256':prior['script']['sha256'],'gateAnswers':prior['perLogicalReader']['gate-port'],'missedRequestsOnlyFault':True}
 if falsePositive:
  historical=own/'OLD-unchecked-reader-reproduction.json';original=cap('OLD-unchecked-reader-reproduction',new,['node',old/'scripts/differential_consent_act_families.mjs','--old',old,'--new',tree,'--out',historical,'--bead','syzygy-bpyt.8.26','--kinds','base','--workers','2','--expect-mismatches','--control-note','port must have mismatches > 0']);prior=json.loads(historical.read_text());port=[r for r in prior['mismatches']if r['reader'].startswith('port@')];assert prior['totals']['mismatches']>0 and not port;record['oldUncheckedReaderReproduced']={'execution':original,'totalMismatches':prior['totals']['mismatches'],'portMismatches':0}
 rows.append(record);(own/'SEMANTIC-PROGRESS.json').write_text(json.dumps(rows,indent=2)+'\n');print(name,'PASS',flush=True)
repo=own/'controls'/plans[0]['id'];refs=['refs/heads/mutant/'+plans[0]['id']]
for plan in plans[1:]:
 name=plan['id'];r=command(['git','fetch',own/'controls'/name,'mutant/'+name+':refs/heads/evidence/'+name],repo);assert r['exit']==0;refs.append('refs/heads/evidence/'+name)
bundle=own/'semantic-mutants.bundle';r=command(['git','bundle','create',bundle,*refs,'^'+m0['trees'][1]['commit']],repo);assert r['exit']==0;r=command(['git','bundle','verify',bundle],new);assert r['exit']==0
result={'schema':'consent-port-corrected-semantic-controls/1','M0Sha256':hashlib.sha256((own/'M0-full.json').read_bytes()).hexdigest(),'controls':rows,'bundle':{'path':str(bundle),'bytes':bundle.stat().st_size,'sha256':hashlib.sha256(bundle.read_bytes()).hexdigest(),'verification':r},'success':all(r['success']for r in rows)};(own/'SEMANTIC-CONTROL-RESULT.json').write_text(json.dumps(result,indent=2)+'\n')
