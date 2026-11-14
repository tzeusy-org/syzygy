"""Declared synthetic subprocess boundary over the actual guarded legacy script.
No current full-app measurement is made; no unsafe unguarded writer is invoked.
"""
import ast,contextlib,hashlib,io,json,os,pathlib,runpy,subprocess,sys,tempfile
own=pathlib.Path(__file__).resolve().parent;case=sys.argv[1];source=pathlib.Path(sys.argv[2]);base=pathlib.Path(tempfile.mkdtemp(prefix='s420-'));home=base/'home';temp=base/'shared-tmp';home.mkdir();temp.mkdir();os.environ['HOME']=str(home);os.environ['TMPDIR']=str(temp);tempfile.tempdir=None
sibling=base/'sibling-canary';sibling.write_bytes(b'untouched sibling\n');before=sibling.stat();root=base/'scratch';out=base/'result.json';calls=[];frozen='38eab812488c85198f37b8be18f1dd24cd5898f8'
# Frozen test names and expected counts are literal input/oracle data.
a='apps/three-surface-poc/src/fixture-a.test.ts';b='apps/three-surface-poc/src/fixture-b.test.ts'
def fake(argv,**kwargs):
 calls.append({'argv':list(argv),'cwd':str(kwargs.get('cwd','')),'tmpdir':kwargs.get('env',{}).get('TMPDIR')})
 if argv[0]=='git':
  if 'ls-files' in argv:return subprocess.CompletedProcess(argv,0,a+'\n'+b+'\napps/three-surface-poc/src/unused.ts\n','')
  if 'grep' in argv:return subprocess.CompletedProcess(argv,0,b+'\n'+a+'\n','')
  raise AssertionError(argv)
 assert argv==['npx','vitest','run',a if len([c for c in calls if c['argv'][0]=='npx'])==1 else b,'--project','@syzygy/three-surface-poc-app']
 scratch=pathlib.Path(kwargs['env']['TMPDIR']);assert scratch.parent==root and scratch.is_dir()
 (scratch/'syzygy-poc-surface-fixture-template-Synthetic').mkdir();(scratch/'syzygy-poc-surface-fixture-Copy').mkdir();(scratch/'other').write_text('synthetic')
 if case=='failure':raise RuntimeError('declared synthetic child boundary failure')
 return subprocess.CompletedProcess(argv,7 if case=='child-nonzero' else 0,' Test Files 1 passed\n Tests 2 passed\n','')
if case in ('empty','child-nonzero'):root.mkdir()
if case=='refusal':root=home
if case=='non-directory':root.write_bytes(b'occupied file must survive\n')
def execute():
 saved=sys.argv[:];original=subprocess.run;stdout=io.StringIO();stderr=io.StringIO();error=None
 sys.argv=[str(source),str(own/'subject'),frozen,str(root),str(out)];subprocess.run=fake
 try:
  with contextlib.redirect_stdout(stdout),contextlib.redirect_stderr(stderr):runpy.run_path(str(source),run_name='__main__')
 except BaseException as e:error={'type':type(e).__name__,'message':str(e)}
 finally:sys.argv=saved;subprocess.run=original
 return error,stdout.getvalue(),stderr.getvalue()
error,stdout,stderr=execute();record=None;replay=None
if case in ('missing','empty','child-nonzero'):
 assert error is None,error;record=json.loads(out.read_text());assert set(record)=={'tool','treeCommit','project','testFilesInDirectory','fixtureUsingTestFiles','filesWithCopiesLeft','filesWithTemplatesLeft','copiesLeftTotal','templatesLeftTotal','nonzeroExits','results'}
 assert {k:record[k] for k in ['tool','treeCommit','project','testFilesInDirectory','fixtureUsingTestFiles','filesWithCopiesLeft','filesWithTemplatesLeft','copiesLeftTotal','templatesLeftTotal','nonzeroExits']}=={'tool':'leak_by_file.py','treeCommit':frozen,'project':'@syzygy/three-surface-poc-app','testFilesInDirectory':2,'fixtureUsingTestFiles':2,'filesWithCopiesLeft':2,'filesWithTemplatesLeft':2,'copiesLeftTotal':2,'templatesLeftTotal':2,'nonzeroExits':[a,b] if case=='child-nonzero' else []}
 assert record['results']==[{'file':f,'exit':7 if case=='child-nonzero' else 0,'summary':['Test Files 1 passed','Tests 2 passed'],'templatesLeft':1,'copiesLeft':1,'otherEntriesLeft':1} for f in [a,b]]
 assert root.is_dir() and list(root.iterdir())==[]
 # A now-occupied accepted root must refuse without erasing the new canary.
 canary=root/'replay-canary';canary.write_bytes(b'preserve occupied replay\n');old_calls=len(calls);out.unlink();e,so,se=execute();assert e and e['type']=='SystemExit' and 'refusing' in e['message'];assert len(calls)==old_calls and canary.read_bytes()==b'preserve occupied replay\n' and not out.exists();replay={'refused_before_subprocess':True,'occupied_canary_survived':True,'output_absent':True,'error':e}
elif case in ('refusal','non-directory'):
 assert error and error['type']=='SystemExit' and 'refusing' in error['message'];assert calls==[] and not out.exists()
 if case=='non-directory':assert root.read_bytes()==b'occupied file must survive\n'
elif case=='failure':
 assert error=={'type':'RuntimeError','message':'declared synthetic child boundary failure'};assert not out.exists() and (root/'f00').is_dir();retained=sorted(str(p.relative_to(root)) for p in root.rglob('*'));old_calls=len(calls);e,so,se=execute();assert e and 'refusing' in e['message'];assert len(calls)==old_calls and retained==sorted(str(p.relative_to(root)) for p in root.rglob('*'));replay={'failed_root_preserved_for_inspection':retained,'refused_before_subprocess':True}
else:raise AssertionError(case)
after=sibling.stat();assert sibling.read_bytes()==b'untouched sibling\n' and (before.st_ino,before.st_size,before.st_mtime_ns)==(after.st_ino,after.st_size,after.st_mtime_ns)
r={'case':case,'source':str(source),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'boundary':'subprocess.run is explicitly synthetic; actual guarded script executes unchanged via runpy','legacy_selector':'unchanged, not a current full-app measurement','base':str(base),'root':str(root),'calls':calls,'error':error,'stdout':stdout,'stderr':stderr,'record':record,'replay':replay,'sibling_bytes_metadata_preserved':True,'root_retained_for_accountable_inspection':True,'holds':True}
(own/f'leak-control-{case}.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'case':case,'holds':True,'calls':len(calls),'base':str(base)}))
