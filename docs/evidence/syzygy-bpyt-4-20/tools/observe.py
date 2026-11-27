#!/usr/bin/python3
"""Outer process observer; captures emitter bytes without replacing source/assertions."""
import ctypes,datetime,hashlib,json,os,pathlib,select,signal,subprocess,sys,time
own=pathlib.Path(__file__).resolve().parent
name,cwd,*command=sys.argv[1:]; directory=own/'runs'/name;directory.mkdir(parents=True,exist_ok=False)
ctypes.CDLL(None,use_errno=True).prctl(36,1,0,0,0) # PR_SET_CHILD_SUBREAPER
start=time.monotonic(); at=datetime.datetime.now(datetime.timezone.utc).isoformat(); timeout=float(os.environ.get('S420_TIMEOUT','300'))
argv=[sys.executable,str(own/'isolated.py'),cwd,*command]
env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'}
if os.environ.get('S420_NO_PROC')=='1':env['S420_NO_PROC']='1'
record={'observer':'outer task-owned observe.py process; captures distinct child emitter stdio','observer_pid':os.getpid(),'observer_sha256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'captured_at':at,'cwd':cwd,'argv':argv,'timeout_seconds':timeout,'no_proc':env.get('S420_NO_PROC')=='1','subject':subprocess.check_output(['git','-C',cwd,'rev-parse','HEAD'],text=True).strip(),'subject_status':subprocess.check_output(['git','-C',cwd,'status','--porcelain=v1'],text=True),'sources':{p:hashlib.sha256((pathlib.Path(cwd)/p).read_bytes()).hexdigest() for p in ['apps/three-surface-poc/src/fixture-directories.test.ts','apps/three-surface-poc/src/fixture-directories.ts','docs/evidence/poc-fixture-leak-2026-10-22/leak_by_file.py','docs/evidence/poc-fixture-leak-2026-10-22/guard_probe.py']}}
with (directory/'stdout.log').open('xb') as out,(directory/'stderr.log').open('xb') as err:
 proc=subprocess.Popen(argv,stdout=out,stderr=err,env=env);handle=os.pidfd_open(proc.pid);record['pid']=proc.pid;record['pidfd_owned']=True
 try:record['exit']=proc.wait(timeout=timeout);record['timed_out']=False
 except subprocess.TimeoutExpired:
  record['timed_out']=True;signal.pidfd_send_signal(handle,signal.SIGKILL);record['exit']=proc.wait()
 finally:os.close(handle)
# Reap only this observer's children, never command-pattern or foreign pids.
reaped=[];deadline=time.monotonic()+10
while True:
 try:
  pid,status=os.waitpid(-1,os.WNOHANG)
  if pid:reaped.append({'pid':pid,'wait_status':status});continue
 except ChildProcessError:break
 if time.monotonic()>=deadline:break
 time.sleep(.02)
children=pathlib.Path(f'/proc/{os.getpid()}/task/{os.getpid()}/children').read_text().split();record.update({'reaped_adopted_children':reaped,'remaining_owned_direct_children':children,'elapsed_seconds':time.monotonic()-start,'stdout_sha256':hashlib.sha256((directory/'stdout.log').read_bytes()).hexdigest(),'stderr_sha256':hashlib.sha256((directory/'stderr.log').read_bytes()).hexdigest()})
(directory/'capture.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'run':name,'exit':record['exit'],'timed_out':record['timed_out'],'elapsed_seconds':record['elapsed_seconds'],'remaining_owned_direct_children':children}),flush=True)
raise SystemExit(0 if record['exit']==0 and not record['timed_out'] and not children else 1)
