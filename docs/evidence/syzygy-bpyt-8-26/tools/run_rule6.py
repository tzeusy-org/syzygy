"""Bounded evidence-tool mutations; M0-first and positive executed-population classifier."""
from pathlib import Path
import datetime,hashlib,json,subprocess,sys,time
own=Path(__file__).resolve().parent;subject=own/'subject';m0=own/'M0-full.json';baseline=json.loads(m0.read_text());spec=json.loads((own/'MUTATION-SPECS.json').read_text());assert baseline['result']['success'] and baseline['role']=='differential' and baseline['populations']['selected']==baseline['populations']['generated'] and baseline['totals']['answersCompared']>0 and baseline['populations']['selected']['worlds']==5403
assert len(baseline['successorFixture']['literalOutcomes'])==12 and all(x['same']for x in baseline['successorFixture']['literalOutcomes']);closure=json.loads((own/'EXACT-DELTA-CLOSURE-RESULT.json').read_text());root=json.loads((own/'ROOT-CLOSURE-DISPOSITION.json').read_text());assert closure['targetedClosureSucceeded'] and baseline['script']['sha256']==closure['oldToolSha256'] and spec['mutations'][0]['originalSha256']==closure['finalToolSha256'] and root['new_commit']==spec['subjectCommit']
source=subprocess.check_output(['git','show',spec['subjectCommit']+':scripts/differential_consent_act_families.mjs'],cwd=subject,text=True);assert hashlib.sha256(source.encode()).hexdigest()==spec['mutations'][0]['originalSha256'];folder=own/'controls/tool-mutants';folder.mkdir(exist_ok=True)
(own/'M0-FIRST-GATE.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'M0Sha256':hashlib.sha256(m0.read_bytes()).hexdigest(),'finalToolCommit':spec['subjectCommit'],'M0ActualSubjects':baseline['trees'],'closureResultSha256':hashlib.sha256((own/'EXACT-DELTA-CLOSURE-RESULT.json').read_bytes()).hexdigest(),'worlds':baseline['totals']['worlds'],'answers':baseline['totals']['answersCompared'],'literalRows':12,'mutationScoringReleased':True},indent=2)+'\n')
selftestBaseline=json.loads((own/'logs/selftest-final-committed.stdout').read_text());expectedCases=[r['name'] for r in selftestBaseline['cases']];assert selftestBaseline['failed']==0 and selftestBaseline['total']==len(expectedCases)==44
m0Recount=json.loads((own/'M0-full-recount.json').read_text());assert m0Recount['success'] and m0Recount['answers']==baseline['totals']['answersCompared']
rows=[]
def capture(name,args):
 result=subprocess.run([sys.executable,str(own/'capture.py'),name,str(subject),*args],capture_output=True,text=True);return {'wrapperExit':result.returncode,'wrapperStdout':result.stdout,'wrapperStderr':result.stderr,'receipt':str(own/'logs'/(name+'.json'))}
def classify(exitcode,document,mode,recount=None):
 if mode=='selftest':
  if not isinstance(document,dict) or document.get('total')!=len(expectedCases) or document.get('exercisedAnswerComparisons',0)<=0 or not isinstance(document.get('cases'),list) or len(document['cases'])!=document['total']:return 'errored'
  cases=document['cases']
  if [r.get('name') for r in cases]!=expectedCases or any(type(r.get('passed')) is not bool for r in cases) or document.get('failed')!=sum(not r['passed'] for r in cases):return 'errored'
  if exitcode==1 and document.get('failed',0)>0:return 'killed'
  if exitcode==0 and document.get('failed')==0:return 'survived'
  return 'errored'
 if not isinstance(document,dict) or document.get('schema')!='consent-act-family-differential/3' or document.get('totals',{}).get('answersCompared',0)<=0 or not document.get('worlds'):return 'errored'
 if sum(len(r.get('matrix',[])) for r in document['worlds'])!=document['totals']['answersCompared']:return 'errored'
 if exitcode==1 and document.get('result',{}).get('success') is False:return 'killed'
 if exitcode==0 and recount is not None and recount.get('answers',0)>0 and recount.get('errors'):return 'killed'
 if exitcode==0 and document.get('result',{}).get('success') is True:return 'survived'
 return 'errored'
for item in spec['mutations']:
 record={**item,'subjectCommit':spec['subjectCommit'],'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()};target=folder/(item['id']+'.mjs');assert source.count(item['old'])==1;mutated=source.replace(item['old'],item['new']);assert hashlib.sha256(mutated.encode()).hexdigest()==item['mutatedSha256'];target.write_text(mutated);output=own/(item['id']+'.json');name='rule6-'+item['id']
 args=['timeout','660','node',str(target)]
 if item['mode']=='selftest':args+=['--selftest']
 else:args+=['--old',str(own/'old'),'--new',str(subject),'--out',str(output),'--bead','syzygy-bpyt.8.26','--kinds',item['mode'],'--sample-per-kind','1','--workers',item.get('workers','1'),'--time-limit-ms','600000']
 record['command']=args;record['execution']=capture(name,args);receipt=json.loads((own/'logs'/(name+'.json')).read_text());code=receipt['exitCode'];doc=None;recount=None
 try:doc=json.loads((own/'logs'/(name+'.stdout')).read_text()) if item['mode']=='selftest' else json.loads(output.read_text())
 except (ValueError,OSError):pass
 if item['mode']!='selftest' and code==0 and doc is not None:
  rp=own/(name+'-recount.json');record['recountExecution']=capture(name+'-recount',['python3',str(own/'recount.py'),str(output),'--tree',str(own/'old'),'--out',str(rp)]);recount=json.loads(rp.read_text())
 record['classification']=classify(code,doc,item['mode'],recount);record['executedComparisons']=doc.get('exercisedAnswerComparisons') if item['mode']=='selftest' and doc else doc.get('totals',{}).get('answersCompared') if doc else None
 record['failedCases']=[x['name']for x in doc.get('cases',[])if not x['passed']]if doc and item['mode']=='selftest' else None;record['finishedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();rows.append(record)
 with (own/'RULE6-ATTEMPTS.jsonl').open('a')as f:f.write(json.dumps(record)+'\n')
 print(item['id'],record['classification'],record['executedComparisons'],flush=True)
# Mutate retained evidence inputs to exercise independent capture/reconciliation predicates without introducing fake product answers.
base=json.loads((own/'final-targeted-M0.json').read_text());artifactCases=[('adapter-byte-binding',['successorFixture','adapters',0,'transformedSha256'],'0'*64),('captured-cleanup-denominator',['materialization','materializedLeftOver'],1),('captured-worker-limit',['pool','workers'],0),('captured-time-limit',['pool','timeLimitMs'],0),('captured-successor-literal',['successorFixture','literalOutcomes',0,'expected','ids'],['invented-repository'])]
for name,keys,value in artifactCases:
 doc=json.loads(json.dumps(base));node=doc
 for k in keys[:-1]:node=node[k]
 old=node[keys[-1]];assert old!=value;node[keys[-1]]=value;target=own/(name+'.json');target.write_text(json.dumps(doc,indent=1)+'\n');rp=own/(name+'-recount.json');execution=capture('rule6-'+name,['python3',str(own/'recount.py'),str(target),'--tree',str(own/'old'),'--out',str(rp)]);recount=json.loads(rp.read_text());receipt=json.loads((own/'logs'/('rule6-'+name+'.json')).read_text());classification='killed'if receipt['exitCode']==1 and recount['answers']>0 and recount['errors']else'errored';record={'id':name,'inputPointer':keys,'old':old,'new':value,'originalRecordSha256':hashlib.sha256((own/'final-targeted-M0.json').read_bytes()).hexdigest(),'mutatedRecordSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'subjectCommit':spec['subjectCommit'],'execution':execution,'classification':classification,'executedComparisons':recount['answers']};rows.append(record);print(name,classification,flush=True)
# Classifier falsifiers never clear a semantic gate.
controlResults=[]
for name,code,document,mode,expected in [('zero-comparisons',1,{'schema':'consent-act-family-differential/3','totals':{'answersCompared':0},'worlds':[{}],'result':{'success':False}},'probe','errored'),('reporter-empty',1,{},'selftest','errored'),('surviving-valid-control',0,selftestBaseline,'selftest','survived')]:
 actual=classify(code,document,mode);controlResults.append({'id':name,'input':{'exit':code,'document':document,'mode':mode},'expected':expected,'actual':actual,'same':actual==expected})
for name,args,expected in [('import-error',['node','--input-type=module','-e',"await import("+repr((own/'controls/missing-evidence-module.mjs').as_uri())+")"],'errored'),('timeout',['timeout','1','node','-e','setTimeout(() => {}, 10000)'],'errored')]:
 execution=capture('classifier-'+name,args);receipt=json.loads((own/'logs'/('classifier-'+name+'.json')).read_text());actual=classify(receipt['exitCode'],None,'probe');controlResults.append({'id':name,'execution':execution,'expected':expected,'actual':actual,'same':actual==expected})
result={'schema':'consent-differential-rule6/1','subjectCommit':spec['subjectCommit'],'M0Sha256':hashlib.sha256(m0.read_bytes()).hexdigest(),'mutations':rows,'classifierControls':controlResults,'totals':{k:sum(r['classification']==k for r in rows)for k in ['killed','survived','errored']},'allClassifierControlsAsExpected':all(r['same']for r in controlResults)};(own/'RULE6-RESULT.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['totals']),flush=True);raise SystemExit(0 if result['totals']['killed']==len(rows) and result['allClassifierControlsAsExpected'] else 1)
