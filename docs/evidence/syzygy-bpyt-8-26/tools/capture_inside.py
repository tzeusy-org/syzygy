"""Retain combined child stream inside the already established namespace, once."""
import sys,pathlib,json,datetime,hashlib,os,importlib.util,time
p=pathlib.Path(__file__).resolve().parent
name,*command=sys.argv[1:]
assert pathlib.Path.cwd().resolve() == pathlib.Path('/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-bpyt.8.26') or p in pathlib.Path.cwd().resolve().parents
log=p/'logs'/(name+'.log');receipt=p/'logs'/(name+'.json');assert not log.exists() and not receipt.exists()
spec=importlib.util.spec_from_file_location('native_lifetime',pathlib.Path.cwd()/'scripts/check_unit_tmpdir_child.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
record={'name':name,'command':command,'cwd':str(pathlib.Path.cwd()),'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'captureOnlyInsideExistingNamespace':True};tick=time.monotonic();saveout,saveerr=os.dup(1),os.dup(2)
try:
 with log.open('xb') as out:
  sys.stdout.flush();sys.stderr.flush();os.dup2(out.fileno(),1);os.dup2(out.fileno(),2)
  record['result']=mod.supervise(command)
finally:
 os.dup2(saveout,1);os.dup2(saveerr,2);os.close(saveout);os.close(saveerr)
record.update({'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'elapsedSeconds':time.monotonic()-tick,'stream':{'path':str(log),'bytes':log.stat().st_size,'sha256':hashlib.sha256(log.read_bytes()).hexdigest()}})
with receipt.open('x') as out:json.dump(record,out,indent=2);out.write('\n')
print(json.dumps(record),flush=True);r=record['result'];sys.exit(0 if r['code']==0 and r['lifetime']['complete'] and not r['signalError'] and not r['interrupted'] else 1)
