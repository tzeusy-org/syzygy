"""Commitment projection of native /3 evidence. Raw bytes remain in retained packet."""
from pathlib import Path
import hashlib,json,sys

def sha(data):return hashlib.sha256(data).hexdigest()
def encoded(value):return json.dumps(value,separators=(',',':'),ensure_ascii=False).encode()
def projection(path):
 path=Path(path);raw=path.read_bytes();d=json.loads(raw);generated=d['corpus']['generatedManifest'];ordinals={w['id']:i for i,w in enumerate(generated)}
 worlds=[]
 for w in generated:
  identity=w['identity'];subject=identity.get('subject');source=subject if isinstance(subject,str) and subject.startswith('.syzygy/governance/decisions/') else None
  worlds.append({'ordinal':ordinals[w['id']],'id':w['id'],'kind':w['kind'],'readers':w['readers'],'instants':w['instants'],'steps':w['steps'],'sourceRecordPath':source,'nativeIdentityPointer':'/corpus/generatedManifest/'+str(ordinals[w['id']])+'/identity'})
 return {'schema':'consent-act-family-commitment-projection/1','nativeOutput':{'path':str(path.resolve()),'bytes':len(raw),'sha256':sha(raw),'schema':d['schema']},'limitation':'This projection contains complete execution matrix and exact-value commitments, not complete raw values. Reconcile raw answerTable and identity bodies in the bound frozen packet.','script':d['script'],'trees':d['trees'],'role':d['role'],'bead':d['bead'],'corpusCommitments':{k:d['corpus'][k] for k in ['sha256','selectedSha256']},'generatedManifest':worlds,'selectedManifest':d['corpus']['selectedManifest'],'populations':d['populations'],'selection':d['selection'],'readerSpecifications':d['readerSpecifications'],'expectedPerLogicalReader':d['expectedPerLogicalReader'],'perLogicalReader':d['perLogicalReader'],'instants':d['instants'],'pool':d['pool'],'materialization':d['materialization'],'totals':d['totals'],'valueCommitments':{key:{'bytes':len(value.encode()),'nativePointer':'/answerTable/'+key}for key,value in d['answerTable'].items()},'worlds':[{'ordinal':ordinals[w['id']],'id':w['id'],'kind':w['kind'],'same':w['same'],'matrix':w['matrix']}for w in d['worlds']],'expectedReaderMismatches':d.get('expectedReaderMismatches'),'unmetExpectedReaderMismatches':d.get('unmetExpectedReaderMismatches'),'result':d['result'],'successorFixture':{'boundary':'Typed records parsed through actual records port; compiled gate forwards through exactly one import substitution. File parser still refuses this form.','adapters':[{key:adapter[key]for key in ['originalPath','originalSha256','transformedPath','transformedSha256','adapterPath','adapterSha256','recordsSha256']}for adapter in d['successorFixture']['adapters']],'literalOutcomes':d['successorFixture']['literalOutcomes']}}

def verify(rawpath,p):
 rawpath=Path(rawpath);raw=rawpath.read_bytes();d=json.loads(raw);errors=[]
 def check(ok,why):
  if not ok:errors.append(why)
 check(p['nativeOutput']['sha256']==sha(raw) and p['nativeOutput']['bytes']==len(raw),'native byte binding')
 check(len(p['generatedManifest'])==len(d['corpus']['generatedManifest']),'generated denominator')
 for ordinal,(left,right)in enumerate(zip(p['generatedManifest'],d['corpus']['generatedManifest'])):
  check(left['ordinal']==ordinal and left['id']==right['id']==sha(encoded(right['identity'])),'identity ordinal/hash binding')
  check(all(left[key]==right[key]for key in ['kind','readers','instants','steps']),'generated metadata binding')
 check(p['selectedManifest']==d['corpus']['selectedManifest'],'selected tuple population')
 check(len(p['worlds'])==len(d['worlds']),'executed world population')
 answers=0
 for left,right in zip(p['worlds'],d['worlds']):
  check(left['id']==right['id'] and left['matrix']==right['matrix'] and left['same']==right['same'],'exact full matrix binding');answers+=len(left['matrix'])
  for row in left['matrix']:
   old=d['answerTable'].get(row['old']);new=d['answerTable'].get(row['new']);check(old is not None and new is not None,'paired value presence')
   if old is not None and new is not None:check(sha(old.encode())==row['old'] and sha(new.encode())==row['new'] and (old==new)==row['same'],'paired complete value commitment/equality')
 check(set(p['valueCommitments'])==set(d['answerTable']),'complete value commitment population')
 for key,value in d['answerTable'].items():check(key in p['valueCommitments'] and p['valueCommitments'][key]['bytes']==len(value.encode()) and sha(value.encode())==key,'exact value byte binding')
 for key in ['populations','selection','readerSpecifications','expectedPerLogicalReader','perLogicalReader','totals','materialization','pool','script','trees','result']:check(p[key]==d[key],'metadata binding '+key)
 check(answers==d['totals']['answersCompared'],'complete comparison denominator')
 return {'success':not errors,'errors':errors,'worlds':len(p['worlds']),'answers':answers,'valueCommitments':len(p['valueCommitments']),'rawSha256':sha(raw)}
if __name__=='__main__':
 raw=Path(sys.argv[1]);out=Path(sys.argv[2]);p=projection(raw);result=verify(raw,p);assert result['success'];out.write_text(json.dumps(p,separators=(',',':'),ensure_ascii=False)+'\n');print(json.dumps({**result,'projectionSha256':sha(out.read_bytes())}))
