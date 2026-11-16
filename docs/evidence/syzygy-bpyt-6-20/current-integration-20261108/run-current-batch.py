"""ROOT-only one-shot setup/install/replay/scoped batch. Prepared, never self-admitting.
Uses the retained successful Nov8 bubblewrap flags; no broad gate or new supervisor.
Run with env -i PATH=/usr/bin:/bin /usr/bin/python3 -I <this-file>.
"""
from pathlib import Path
import base64, datetime, fcntl, hashlib, json, os, subprocess, sys
OWN=Path('/home/orca/.tmp/syzygy-743-current-integration-wti3cdgi')
R=Path('/home/orca/.tmp/743ci-20261108')
W=Path('/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-bpyt.6.20')
COMMON=Path('/home/orca/orca/projects/syzygy/.git')
NODE=Path('/home/orca/.nvm/versions/node/v24.6.0')
HEAD='5414a20faf3d2deafc576d4eac6dcb72d8042a07'
BASE='fd08ea62f8b55fb60d7c79628688bc014b40875b'
TREE='1c2f1c638ee233912b59edf74e81260e6ea2169e'
LOCK=Path('/home/orca/.tmp/syzygy-full-suite-20261104.lock')
CACHE_RECEIPT=Path('/home/orca/.tmp/427cdn-20261107/PUBLIC-CACHE-SOURCE-RECEIPT.json')
CACHE_RECEIPT_SHA='9891bb50e0a905ad90c7ef82863490fe81813610d98dfd85ef01c1c6e478ac42'
OFFERING_SHA='df1989eebd0af0f506fe8d1122df10e9334c5392c14b4e609ead8f560580121b'
LOCK_SHA='a7884de5e824029a290b5c2e96049195a3ea80ebe21fec835016842cfd618cd8'
INPUTS=['capture-current.py','differential-current.mjs','served-current.mjs']
META_ENV={'PATH':'/usr/bin:/bin','GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','GIT_OPTIONAL_LOCKS':'0'}
def sha(raw):return hashlib.sha256(raw).hexdigest()
def now():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def git(*a):return subprocess.check_output(['git',*a],cwd=W,env=META_ENV,text=True).strip()
def ordinary(path):
 p=Path(path)
 assert p.resolve()==p and p.is_file() and not p.is_symlink(),str(p)
 return p.read_bytes()
def subject():
 assert git('rev-parse','HEAD')==HEAD and git('rev-parse','HEAD^{tree}')==TREE
 assert git('branch','--show-current')=='agent/syzygy-bpyt.6.20'
 assert git('rev-parse','main')==BASE and git('rev-parse','origin/main')==BASE
 assert git('status','--porcelain=v1')==''
 assert sha(ordinary(W/'package-lock.json'))==LOCK_SHA
 assert sha(ordinary(NODE/'bin/node'))=='e943ee9282bef08233665cb71cc57a9f5794bbe70a4822b38e60e394c15979e2'
def record(name,value):
 with (R/name).open('x')as f:json.dump(value,f,indent=2);f.write('\n')
def namespace(command):
 a=['bwrap','--unshare-pid','--unshare-net','--die-with-parent','--new-session','--clearenv']
 for p in ['/usr','/lib','/lib64']:a+=['--ro-bind',p,p]
 a+=['--symlink','usr/bin','/bin','--proc','/proc','--dev','/dev','--dir','/etc',
     '--ro-bind',str(OWN),str(OWN),'--bind',str(R),str(R),'--bind',str(W),str(W),
     '--ro-bind',str(COMMON),str(COMMON),'--ro-bind',str(NODE),str(NODE),
     '--bind',str(R/'tmp'),'/tmp','--chdir',str(W)]
 for n in INPUTS:a+=['--ro-bind',str(R/'inputs'/n),str(R/'inputs'/n)]
 for n in ['hosts','nsswitch.conf','resolv.conf']:a+=['--ro-bind',str(R/('etc-'+n)),'/etc/'+n]
 e={'HOME':str(R/'home'),'TMPDIR':'/tmp','TMP':'/tmp','TEMP':'/tmp','TMPPREFIX':'/tmp',
    'XDG_CACHE_HOME':str(R/'xdg-cache'),'XDG_CONFIG_HOME':str(R/'xdg-config'),'XDG_DATA_HOME':str(R/'xdg-data'),
    'PATH':str(NODE/'bin')+':/usr/bin:/bin','LANG':'C.UTF-8','TZ':'Asia/Singapore',
    'NPM_CONFIG_CACHE':str(R/'cache'),'NPM_CONFIG_OFFLINE':'true','NPM_CONFIG_AUDIT':'false','NPM_CONFIG_FUND':'false',
    'NPM_CONFIG_USERCONFIG':str(R/'user.npmrc'),'NPM_CONFIG_GLOBALCONFIG':str(R/'global.npmrc'),
    'GIT_CONFIG_NOSYSTEM':'1','GIT_OPTIONAL_LOCKS':'0','PYTHONDONTWRITEBYTECODE':'1'}
 for k,v in e.items():a+=['--setenv',k,v]
 return a+['--',*command]
def main():
 assert len(sys.argv)==1
 subject()
 manifest_raw=ordinary(OWN/'OFFERING-MANIFEST.json');assert sha(manifest_raw)==OFFERING_SHA
 manifest=json.loads(manifest_raw)
 for row in manifest['files']:
  raw=ordinary(row['path']);assert len(raw)==row['bytes']and sha(raw)==row['sha256']
 source_raw=ordinary(CACHE_RECEIPT);assert sha(source_raw)==CACHE_RECEIPT_SHA
 source=json.loads(source_raw);cache=Path(source['cacheRoot'])
 assert cache==Path('/home/orca/.tmp/427cdn-20261107/cache')
 lock=json.loads(ordinary(W/'package-lock.json'));keys=('packagePath','version','resolved','integrity')
 wanted=[dict(packagePath=p,version=v['version'],resolved=v['resolved'],integrity=v['integrity'])for p,v in lock['packages'].items()if str(v.get('resolved','')).startswith('https://registry.npmjs.org/')]
 assert len(wanted)==len(source['packages'])==107
 assert sorted(tuple(r[k]for k in keys)for r in wanted)==sorted(tuple(r[k]for k in keys)for r in source['packages'])
 assert len(source['cacheFiles'])==225
 # Validate exact known public bytes before any allocation or source execution.
 for row in source['cacheFiles']:
  rel=Path(row['path']);assert not rel.is_absolute()and '..'not in rel.parts
  raw=ordinary(cache/rel);assert len(raw)==row['bytes']and sha(raw)==row['sha256']
 for row in source['packages']:
  raw=ordinary(row['cacheContent']);assert Path(row['cacheContent']).is_relative_to(cache)
  assert row['integrity'].startswith('sha512-')and hashlib.sha512(raw).digest()==base64.b64decode(row['integrity'][7:],validate=True)
 assert not os.path.lexists(R), 'runtime root exists: preserve it, do not reuse or clean'
 with LOCK.open('r+')as lockfd:
  fcntl.flock(lockfd.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
  subject();R.mkdir(mode=0o755)
  try:
   for n in ['home','tmp','cache','xdg-cache','xdg-config','xdg-data','inputs','capture']:(R/n).mkdir()
   for n,content in [('user.npmrc',''),('global.npmrc',''),('etc-hosts','127.0.0.1 localhost\n::1 localhost\n'),('etc-nsswitch.conf','hosts: files\n'),('etc-resolv.conf','')]:
    with(R/n).open('x')as f:f.write(content)
   for n in INPUTS:
    with(R/'inputs'/n).open('xb')as f:f.write(ordinary(OWN/n))
   for row in source['cacheFiles']:
    dest=R/'cache'/row['path'];dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open('xb')as f:f.write(ordinary(cache/row['path']))
    assert len(ordinary(dest))==row['bytes']and sha(ordinary(dest))==row['sha256']
   record('SETUP.json',{'head':HEAD,'tree':TREE,'at':now(),'sourceCache':str(cache),'sourceCacheReceiptSha256':CACHE_RECEIPT_SHA,'cacheFilesCopied':225,'publicIdentities':107,'sourceLockSha256':LOCK_SHA,'inputs':[{'name':n,'sha256':sha(ordinary(R/'inputs'/n))}for n in INPUTS],'qualification':'Prepared private inputs/cache only. No installation or product execution result.'})
   offering=json.loads(ordinary(OWN/'RUNTIME-OFFERING.json'))
   commands=[('01-offline-install',['npm','ci','--offline','--ignore-scripts','--no-audit','--no-fund']),
             ('02-caller-and-served-capture',['python3','-I',str(R/'inputs/capture-current.py'),str(R/'inputs/attempt-001')])]
   commands +=[(f'0{i+3}-'+name,c)for i,(name,c)in enumerate(zip(['typecheck','scoped-unit','scoped-integration'],offering['scopedCommands']))]
   results=[]
   for name,command in commands:
    subject();argv=namespace(command);start=now()
    with(R/'capture'/(name+'.stdout')).open('xb')as so,(R/'capture'/(name+'.stderr')).open('xb')as se:
     result=subprocess.run(argv,cwd=W,env={'PATH':'/usr/bin:/bin'},stdout=so,stderr=se)
    row={'name':name,'command':command,'namespaceArgv':argv,'startedAt':start,'finishedAt':now(),'exitCode':result.returncode,'head':HEAD,'streams':[]}
    for stream in ['stdout','stderr']:
     path=R/'capture'/(name+'.'+stream);raw=ordinary(path);row['streams'].append({'path':str(path),'bytes':len(raw),'sha256':sha(raw)})
    record('capture/'+name+'.json',row);results.append(row);print(json.dumps(row),flush=True)
    subject()
    for n in INPUTS:assert ordinary(R/'inputs'/n)==ordinary(OWN/n)
    if result.returncode:raise RuntimeError('stage failed; retained without retry: '+name)
   record('TERMINAL.json',{'head':HEAD,'tree':TREE,'finishedAt':now(),'results':results,'trackedClean':True,'qualification':'Author batch reports native command statuses and captured bytes only. ROOT must read denominators, differential outcomes and bodies; not independent certification or a broad gate.'})
  except BaseException as error:
   record('FAILURE.json',{'head':HEAD,'at':now(),'errorType':type(error).__name__,'reason':str(error),'custody':'Retain exact partial root, streams and inputs. Stop; no retry, cleanup, source repair or later stage.'})
   raise
if __name__=='__main__':main()
