#!/usr/bin/env python3
"""ROOT-only replay offering. Run inside the established private fixture boundary.
No install, broad gate, lifecycle operation, remote write, normalization or retry.
Raw stdout/stderr are captured independently as bytes. Existing harnesses own assertions.
"""
from pathlib import Path
import datetime, hashlib, json, os, subprocess, sys
OWN=Path(__file__).resolve().parent
WORKTREE=Path('/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-bpyt.6.20')
HEAD='5414a20faf3d2deafc576d4eac6dcb72d8042a07'
BASE='fd08ea62f8b55fb60d7c79628688bc014b40875b'
NODE='/home/orca/.nvm/versions/node/v24.6.0/bin/node'
NODE_SHA='e943ee9282bef08233665cb71cc57a9f5794bbe70a4822b38e60e394c15979e2'
def sha(b): return hashlib.sha256(b).hexdigest()
def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def git(*a): return subprocess.check_output(['git',*a],cwd=WORKTREE,text=True).strip()
def check_subject():
 assert Path.cwd().resolve()==WORKTREE
 assert git('rev-parse','HEAD')==HEAD
 assert git('rev-parse','HEAD^{tree}')=='1c2f1c638ee233912b59edf74e81260e6ea2169e'
 assert git('status','--porcelain=v1')==''
 assert sha(Path(NODE).read_bytes())==NODE_SHA
check_subject()
assert len(sys.argv)==2, 'supply a new absolute attempt output directory under current OWN'
out=Path(sys.argv[1]).resolve()
assert out.parent==OWN and out!=OWN
out.mkdir() # exclusive: retain every attempted run, never append to predecessor captures
# ROOT must supply its already reviewed boundary and private HOME/cache/TMPDIR before this entry.
assert os.environ.get('HOME')!='/home/orca', 'ROOT private HOME required'
assert os.environ.get('TMPDIR'), 'ROOT private TMPDIR required'
rows=[]
for name,args,overrides in [
 ('caller-differential',[NODE,str(OWN/'differential-current.mjs'),str(out/'differential'),HEAD],{'G5_PROFILES':'none'}),
 ('served-differential',[NODE,str(OWN/'served-current.mjs'),str(out/'differential'),str(out/'served'),HEAD],{}),
]:
 check_subject()
 environment=dict(os.environ)
 for key in ['G5_PROFILES','G5_CASE_FILTER','G5_SKIP_CALLERS']: environment.pop(key,None)
 environment.update(overrides)
 started=now()
 with (out/(name+'.stdout')).open('wb') as stdout, (out/(name+'.stderr')).open('wb') as stderr:
  result=subprocess.run(args,cwd=WORKTREE,env=environment,stdout=stdout,stderr=stderr)
 row={'name':name,'command':args,'syntheticOverrides':overrides,'startedAt':started,'finishedAt':now(),'exitCode':result.returncode,'subject':HEAD,'base':BASE,'streams':[]}
 for stream in ['stdout','stderr']:
  path=out/(name+'.'+stream);data=path.read_bytes();row['streams'].append({'path':str(path),'bytes':len(data),'sha256':sha(data)})
 rows.append(row)
 (out/'ATTEMPTS.json').write_text(json.dumps({'head':HEAD,'base':BASE,'results':rows},indent=2)+'\n')
 print(json.dumps(row),flush=True)
 check_subject()
 if result.returncode: sys.exit(result.returncode)
# Empty transport population is intentional: 69 historical pairs are source-bound reuse,
# never a claim that zero cases established transport correctness on this head.
caller=json.loads((out/'differential/caller-differential.json').read_text())
served=json.loads((out/'served/results.json').read_text())
assert caller['cases']==93 and not caller['differences']
assert served['cases']==18 and served['routePairDenominator']==72 and not served['differences']
check_subject()
