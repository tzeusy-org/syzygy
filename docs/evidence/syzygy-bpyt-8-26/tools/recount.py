"""Independent /3 population/answer reconciliation. No product code is imported."""
import argparse,collections,datetime,gzip,hashlib,json,pathlib,sys
parser=argparse.ArgumentParser();parser.add_argument('record');parser.add_argument('--tree');parser.add_argument('--new-tree');parser.add_argument('--out',required=True);a=parser.parse_args();p=pathlib.Path(a.record);d=json.loads(gzip.decompress(p.read_bytes()).decode() if p.suffix=='.gz' else p.read_text());errors=[]
def check(ok,why):
 if not ok:errors.append(why)
def digest(v):return hashlib.sha256(json.dumps(v,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()
def population(worlds):return {'worlds':len(worlds),'byKind':dict(collections.Counter(w['kind'] for w in worlds))}
pool=d['pool'];check(type(pool.get('workers')) is int and 1<=pool['workers']<=32,'invalid recorded worker resource limit');check(type(pool.get('timeLimitMs')) is int and pool['timeLimitMs']>0,'invalid recorded finite time limit')
generated=d['corpus']['generatedManifest'];selected=d['corpus']['selectedManifest'];specs=d['readerSpecifications'];ids=[w['id'] for w in generated];check(len(ids)==len(set(ids)),'duplicate generated identity');byid={w['id']:w for w in generated}
for w in generated:
 check(digest(w['identity'])==w['id'],'world digest is not complete identity '+w['id'])
 kind=w['kind'];subject=w['identity']['subject'] or '';names=set(w['readers'])
 if kind in ['probe','real-file','edited-between-reads'] or subject.startswith(('admission:','class:')):check({'port','gate-port'}<=names,'required port/gate reader omitted '+w['id'])
 if kind=='policy-bytes':check('gate-port' in names,'policy-byte gate port omitted')
 if kind=='observation-successor':check(names=={'successor-record-port','successor-gate-port'} and w['steps']==1 and len(w['instants'])==3,'successor fixture population wrong')
kinds=d['selection']['kinds'];sample=d['selection']['samplePerKind'];expectedSelected=[w for w in generated if kinds is None or w['kind'] in kinds]
if sample is not None:
 seen=collections.Counter();retained=[]
 for w in expectedSelected:
  seen[w['kind']]+=1
  if seen[w['kind']]<=sample:retained.append(w)
 expectedSelected=retained
check([w['id'] for w in expectedSelected]==[w['id'] for w in selected],'selected membership differs from independent filter')
check(d['populations']['generated']==population(generated),'generated total/bykind mismatch');check(d['populations']['selected']==population(selected),'selected total/bykind mismatch')
if a.tree:
 root=pathlib.Path(a.tree)/'.syzygy/governance/decisions';files={'.syzygy/governance/decisions/'+str(q.relative_to(root)) for q in root.rglob('*') if q.is_file()};real={w['identity']['subject'] for w in generated if w['kind']=='real-file'};check(files==real,'complete real-file decisions corpus mismatch')
keys=set();reader=collections.defaultdict(lambda:{'worlds':set(),'steps':set(),'answers':0,'mismatches':0,'byInstant':collections.Counter(),'byStep':collections.Counter()});mismatchCount=0;values=d['answerTable'];rows={w['id']:w for w in d['worlds']};check(len(rows)==len(d['worlds'])==len(selected),'execution world IDs incomplete/duplicate');answerCount=0
for w in selected:
 world=byid[w['id']];expected=[]
 for step in range(1,world['steps']+1):
  for name in world['readers']:
   for instant in world['instants'] if specs[name] else [None]:
    prefix=f'step{step}:' if len(world['identity']['layers'])>1 else ''
    # Single-step edited fixture still has a declared steps array; current full corpus uses three steps.
    key=prefix+name+(('@'+instant) if instant is not None else '')
    expected.append({'key':key,'reader':name,'step':step,'instant':instant})
 check(w['expected']==expected,'declared comparison population incorrect '+w['id']);actual=rows.get(w['id'],{}).get('matrix',[]);check([{k:r[k] for k in ['key','reader','step','instant']} for r in actual]==expected,'executed exact comparison identity set/order differs '+w['id'])
 for r in actual:
  identity=(w['id'],r['reader'],r['step'],r['instant']);check(identity not in keys,'duplicate comparison identity');keys.add(identity);answerCount+=1
  for role in ['old','new']:
   sha=r[role];check(sha in values and hashlib.sha256(values.get(sha,'').encode()).hexdigest()==sha,'answer digest/content missing')
  same=values.get(r['old'])==values.get(r['new']);check(r['same']==same,'comparison value predicate wrong');mismatchCount+=not same
  stats=reader[r['reader']];stats['worlds'].add(w['id']);stats['steps'].add((w['id'],r['step']));stats['answers']+=1;stats['mismatches']+=not same;stats['byInstant'][r['instant'] or 'untimed']+=1;stats['byStep'][str(r['step'])]+=1
stats={name:{**v,'worlds':len(v['worlds']),'steps':len(v['steps']),'byInstant':dict(v['byInstant']),'byStep':dict(v['byStep'])} for name,v in reader.items()}
check(d['perLogicalReader']==stats,'per logical-reader aggregation mismatch');check(d['totals']['answersCompared']==answerCount,'answer denominator mismatch');check(d['totals']['mismatches']==mismatchCount==len(d['mismatches']),'mismatch denominator mismatch')
for name,v in stats.items():
 expected=d['expectedPerLogicalReader'].get(name,{});check(all(expected.get(k)==v[k] for k in ['worlds','steps','answers']),'expected versus executed reader denominator mismatch '+name)
check(set(d['expectedPerLogicalReader'])==set(stats),'missing expected logical reader')
if d['role']=='negative-control':
 names=d.get('expectedReaderMismatches',[]);check(bool(names) and len(names)==len(set(names)) and all(n in specs for n in names),'invalid checked control declaration');unmet=[n for n in names if not(stats.get(n,{}).get('answers',0)>0 and stats.get(n,{}).get('mismatches',0)>0)];check(unmet==d.get('unmetExpectedReaderMismatches'),'wrong checked control aggregation');check((not unmet)==d['result']['success'],'control result does not follow actual demanded reader predicate')
else:check(mismatchCount==0 and d['result']['success'],'ordinary differential failed')
m=d['materialization'];check(m['created']==m['removed'] and m['materializedLeftOver']==0 and m['differing']==0 and m['pairs']==m['expectedPairs'],'cleanup/materialization mismatch')
fixture=json.loads(pathlib.Path(__file__).with_name('literal-expectations.json').read_text())
literals={datetime.datetime.fromtimestamp(r['instant']/1000,datetime.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00','Z'):r['expected'] for r in fixture['instants_and_literals']}
for r in d['successorFixture']['literalOutcomes']:
 check(r['expected']==literals[r['instant']],'tool successor expectation differs from independent literal')
 actual=json.loads(values[next(x for x in rows[r['worldId']]['matrix'] if x['reader']==r['reader'] and x['instant']==r['instant'])[r['role']]])
 check({k:actual.get(k) for k in r['expected']}==r['actual'],'successor actual projection differs from actual answer')
 check((r['expected']==r['actual'])==r['same'],'successor literal comparison wrong')
 if r['role']=='old' or d['role']=='differential':check(r['same'],'normal or baseline successor literal outcome failed')
for adapterIndex,adapter in enumerate(d['successorFixture']['adapters']):
 compiledTree=a.tree if adapterIndex==0 else a.new_tree
 original=(pathlib.Path(compiledTree)/'packages/polaris-dossier/dist/gate-sources.js' if compiledTree else pathlib.Path(adapter['originalPath'])).read_text();sub=adapter['substitution'];check(original.count(sub['old'])==1,'fixture original import not unique');transformed=original.replace(sub['old'],sub['new']);check(hashlib.sha256(original.encode()).hexdigest()==adapter['originalSha256'] and hashlib.sha256(transformed.encode()).hexdigest()==adapter['transformedSha256'] and transformed.replace(sub['new'],sub['old'])==original,'compiled fixture transformation differs from only-import boundary');check(hashlib.sha256(adapter['adapter'].encode()).hexdigest()==adapter['adapterSha256'],'adapter digest mismatch');check(digest(adapter['records'])==adapter['recordsSha256'],'typed record fixture digest mismatch')
result={'schema':'consent-differential-independent-recount/1','recountToolSha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'measuredOn':{'path':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()},'generated':population(generated),'selected':population(selected),'comparisonIdentities':len(keys),'answers':answerCount,'mismatches':mismatchCount,'perLogicalReader':stats,'errors':errors,'success':not errors};pathlib.Path(a.out).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['perLogicalReader','measuredOn']}));raise SystemExit(bool(errors))
