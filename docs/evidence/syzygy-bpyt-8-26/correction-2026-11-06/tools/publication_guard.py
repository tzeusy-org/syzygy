"""Census performed/current arguments and ceremony labels without printing tokens."""
from pathlib import Path
import hashlib,importlib.util,json,re,os
OWN=Path(__file__).resolve().parent
TREE=Path(os.environ.get('SYZYGY_EVIDENCE_TREE','/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-bpyt.8.26'))
def sha(data):return hashlib.sha256(data).hexdigest()
def recognized():
 spec=importlib.util.spec_from_file_location('governance_census',TREE/'scripts/check_governance.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 args=set(v for values in module._performed_act_digests().values() for v in values)
 for _,rel,_ in module.ACT_SUBJECTS:
  path=TREE/rel
  if path.is_file():args.add(sha(path.read_bytes()))
 labels=set(entry['label'] for entry in module.registry_current() if entry.get('label')) | {label for label,_,_ in module.ACT_SUBJECTS}
 return args,labels,{'recognizerPath':'scripts/check_governance.py','recognizerSha256':sha((TREE/'scripts/check_governance.py').read_bytes()),'performedRecordPath':module.PERFORMED_ACT_RECORD,'performedRecordSha256':sha((TREE/module.PERFORMED_ACT_RECORD).read_bytes()),'argumentTokens':len(args),'ceremonyTokens':len(labels)}
def hits(text,args,labels):
 result=[]
 for kind,tokens in [('argument',args),('ceremony',labels)]:
  for token in sorted(tokens):
   offsets=[m.start() for m in re.finditer(re.escape(token),text)]
   if offsets:result.append({'kind':kind,'tokenFingerprint':sha(token.encode()),'occurrences':len(offsets),'characterOffsets':offsets})
 for match in re.finditer(r'(?i)(?<![0-9a-f])([0-9a-f]{8,63})(?![0-9a-f])',text):
  prefix=match.group(1).lower()
  if any(token.startswith(prefix) for token in args):result.append({'kind':'argument-truncation','tokenFingerprint':sha(prefix.encode()),'occurrences':1,'characterOffsets':[match.start()]})
 return result

def census(paths):
 args,labels,authority=recognized();records=[]
 for path in sorted(paths):
  data=path.read_bytes();occurrences=hits(data.decode('utf-8',errors='replace'),args,labels)
  records.append({'path':str(path),'bytes':len(data),'sha256':sha(data),'occurrenceGroups':occurrences,'occurrences':sum(x['occurrences']for x in occurrences)})
 return {'schema':'consent-port-publication-token-census/1','recognizer':authority,'files':records,'filesWithOccurrences':sum(bool(x['occurrences'])for x in records),'totalOccurrences':sum(x['occurrences']for x in records),'noTokenValuesPublished':True}
if __name__=='__main__':
 import argparse
 p=argparse.ArgumentParser();p.add_argument('paths',nargs='+');p.add_argument('--out',required=True);a=p.parse_args();result=census([Path(x) for x in a.paths]);Path(a.out).write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k]for k in ['schema','filesWithOccurrences','totalOccurrences','noTokenValuesPublished']}))
