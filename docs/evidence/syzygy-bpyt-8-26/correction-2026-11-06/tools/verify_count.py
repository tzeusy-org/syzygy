"""Second-method count identity/population check, independent of runtime imports."""
from pathlib import Path
import argparse,collections,hashlib,json,re,subprocess
p=argparse.ArgumentParser();p.add_argument('record');p.add_argument('--out',required=True);p.add_argument('--full');p.add_argument('--new-tree');a=p.parse_args();own=Path(__file__).resolve().parent;path=Path(a.record);d=json.loads(path.read_text());errors=[]
def check(ok,why):
 if not ok:errors.append(why)
def sha(b):return hashlib.sha256(b).hexdigest()
def encoded(x):return json.dumps(x,separators=(',',':'),ensure_ascii=False).encode()
check(d.get('schema')=='consent-act-family-count/3','count schema')
check(d.get('executed') is None and d.get('execution') is None and d.get('materialization') is None,'unexecuted count must remain null')
script=(Path(a.new_tree)if a.new_tree else own/'new')/'scripts/differential_consent_act_families.mjs';check(d.get('script')=={'path':'scripts/differential_consent_act_families.mjs','sha256':sha(script.read_bytes())},'executing tool identity')
trees=d.get('trees',[]);check(len(trees)==2,'old/new subject population')
for index,b in enumerate(trees):
 tree=own/'old'if index==0 else(Path(a.new_tree)if a.new_tree else own/'new');git=lambda *args:subprocess.check_output(['git',*args],cwd=tree,text=True).strip()
 check(b.get('role')==('old'if index==0 else'new') and b.get('commit')==git('rev-parse','HEAD') and b.get('tree')==git('rev-parse','HEAD^{tree}'),'committed subject/tree binding')
 files=b.get('files',{});check(set(files)==set(b.get('sha256',{}))=={'packageReaderTs','packageReaderJs','gateSourcesTs','gateSourcesJs','testingJs','consentPortsTs','consentPortsJs','inForceTs','inForceJs','consentIndexJs','consentLiveTs','consentLiveJs','screenTs','screenJs'},'complete source/build file binding population')
 for key,rel in files.items():check(b.get('sha256',{}).get(key)==sha((tree/rel).read_bytes()),'actual source/build file digest '+key)
fixture=d.get('successorFixture',{});literal=json.loads((own/'literal-expectations.json').read_text());check(fixture.get('records')==literal['records'],'literal fixture records')
check(fixture.get('recordsSha256')==sha(encoded(literal['records'])),'fixture record binding')
recipe=re.search(r'function prepareSuccessorAdapter\(tree, scratch, role\) \{.*?\n\}',script.read_text(),re.S);assert recipe;check(fixture.get('adapterRecipeSha256')==sha(recipe[0].encode()),'fixture one-import adapter recipe binding')
check(fixture.get('adapters') is None and fixture.get('literalOutcomes') is None,'count fixture execution remains null')
check(d.get('pool',{}).get('workers',0)>0 and d['pool'].get('timeLimitMs',0)>0 and d['pool'].get('wallSeconds',-1)>=0 and isinstance(d['pool'].get('node'),str),'finite count resource identity')
generated=d['generatedManifest'];ids=[w['id']for w in generated];check(len(ids)==len(set(ids)),'unique generated world IDs');check(all(sha(encoded(w['identity']))==w['id']for w in generated),'complete generated world identity digests');byid={w['id']:w for w in generated}
selected=[w for w in generated if d['selection']['kinds']is None or w['kind']in d['selection']['kinds']]
if d['selection']['samplePerKind']is not None:
 seen=collections.Counter();sample=[]
 for w in selected:
  seen[w['kind']]+=1
  if seen[w['kind']]<=d['selection']['samplePerKind']:sample.append(w)
 selected=sample
check([w['id']for w in selected]==[w['id']for w in d['selectedManifest']],'identical selected population')
for key,rows in [('generated',generated),('selected',selected)]:check(d[key]=={'worlds':len(rows),'byKind':dict(collections.Counter(w['kind']for w in rows))},key+' count/by-kind')
stats=collections.defaultdict(lambda:{'worlds':set(),'steps':set(),'answers':0,'executed':None});answers=0
for row in d['selectedManifest']:
 w=byid[row['id']];expected=[]
 for step in range(1,w['steps']+1):
  for reader in w['readers']:
   for instant in w['instants']if d['readerSpecifications'][reader]else[None]:
    key=('step'+str(step)+':'if len(w['identity']['layers'])>1 else'')+reader+('@'+instant if instant else'');expected.append({'key':key,'reader':reader,'step':step,'instant':instant});v=stats[reader];v['worlds'].add(w['id']);v['steps'].add((w['id'],step));v['answers']+=1;answers+=1
 check(row['expected']==expected,'complete expected reader-step-instant population')
check({r:{**v,'worlds':len(v['worlds']),'steps':len(v['steps'])}for r,v in stats.items()}==d['expectedPerLogicalReader'],'per-reader count and unexecuted denominator')
if a.full:
 full=json.loads(Path(a.full).read_text());check(d['trees']==full['trees'] and d['script']==full['script'],'count/execution source bindings');check(d['selectedManifest']==full['corpus']['selectedManifest'] and answers==full['totals']['answersCompared'],'count/execution exact keys');check(d['corpusSha256']==full['corpus']['sha256'] and d['selectedSha256']==full['corpus']['selectedSha256'],'count/execution corpus digest')
r={'schema':'corrected-count-independent-check/1','subject':{'path':str(path),'bytes':path.stat().st_size,'sha256':sha(path.read_bytes())},'toolSha256':sha(Path(__file__).read_bytes()),'worlds':len(selected),'expectedAnswers':answers,'errors':errors,'success':not errors};Path(a.out).write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r));raise SystemExit(bool(errors))
