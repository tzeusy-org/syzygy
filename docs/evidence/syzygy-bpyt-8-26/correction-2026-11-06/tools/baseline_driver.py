"""Finite full-corpus corrected baseline. No mutant scoring before full result/recount."""
from pathlib import Path
import datetime,hashlib,json,subprocess,sys
own=Path(__file__).resolve().parent;old=own/'old';new=own/'new';tool=new/'scripts/differential_consent_act_families.mjs'
def cap(name,cwd,args):
 r=subprocess.run([sys.executable,str(own/'capture.py'),name,str(cwd),*map(str,args)],capture_output=True,text=True)
 print(json.dumps({'task':name,'exit':r.returncode,'receipt':str(own/'logs'/(name+'.json'))}),flush=True)
 assert r.returncode==0,(name,r.stderr)
for role in ['old','new']:cap('build-'+role,own/role,['node','scripts/clean_build.mjs','packages/polaris-generation-consent','packages/polaris-dossier'])
(own/'compiled-inputs').mkdir()
for role in ['old','new']:
 for name in ['gate-sources.js']:
  (own/'compiled-inputs'/(role+'-'+name)).write_bytes((own/role/'packages/polaris-dossier/dist'/name).read_bytes())
cap('selftest-committed',new,['node',tool,'--selftest'])
base=['node',tool,'--old',old,'--new',new,'--bead','syzygy-bpyt.8.26','--time-limit-ms','7200000']
cap('count-full',new,[*base,'--count','--workers','4'])
count=json.loads((own/'logs/count-full.stdout').read_text());assert count['executed'] is None and count['trees'][1]['commit']==json.loads((own/'SOURCE-SUBJECT.json').read_text())['commit'] and len(count['trees'])==2 and count['script']['sha256']==hashlib.sha256(tool.read_bytes()).hexdigest();(own/'COUNT-full.json').write_bytes((own/'logs/count-full.stdout').read_bytes())
for mode,workers in [('serial',1),('parallel',4)]:
 out=own/('qualification-'+mode+'.json');cap('qualification-'+mode,new,[*base,'--out',out,'--sample-per-kind','1','--workers',workers]);cap('recount-qualification-'+mode,new,['python3',own/'recount.py',out,'--tree',old,'--new-tree',new,'--out',own/('qualification-'+mode+'-recount.json')])
a,b=[json.loads((own/('qualification-'+mode+'.json')).read_text()) for mode in ['serial','parallel']];assert a['corpus']['selectedManifest']==b['corpus']['selectedManifest'] and a['answerTable']==b['answerTable'] and a['worlds']==b['worlds']
(own/'WORKER-QUALIFICATION.json').write_text(json.dumps({'serial':a['pool'],'parallel':b['pool'],'worlds':a['totals']['worlds'],'answers':a['totals']['answersCompared'],'completeKeyValueRowsEqual':True},indent=2)+'\n')
out=own/'M0-full.json';cap('M0-full',new,[*base,'--out',out,'--workers','4']);cap('recount-M0-full',new,['python3',own/'recount.py',out,'--tree',old,'--new-tree',new,'--out',own/'M0-full-recount.json'])
d=json.loads(out.read_text());assert d['populations']['generated']==d['populations']['selected'] and d['result']['success'] and d['totals']['answersCompared']>0 and all(r['same'] for r in d['successorFixture']['literalOutcomes']) and d['corpus']['selectedManifest']==count['selectedManifest'] and d['corpus']['sha256']==count['corpusSha256']
(own/'M0-FIRST-GATE.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'subjectCommit':d['trees'][1]['commit'],'toolSha256':d['script']['sha256'],'M0Sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'worlds':d['totals']['worlds'],'answers':d['totals']['answersCompared'],'literalRows':len(d['successorFixture']['literalOutcomes']),'mutationScoringReleased':True},indent=2)+'\n');print('FULL M0 COMPLETE',d['totals']['worlds'],d['totals']['answersCompared'],flush=True)
