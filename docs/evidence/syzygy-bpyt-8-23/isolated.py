#!/usr/bin/python3
"""Owned-fixture verification namespace; no source or assertion substitutions."""
import hashlib,json,os,subprocess,sys,tempfile
from pathlib import Path
OWN=Path('/home/orca/.tmp/syzygy-bpyt8-23-implementation-20261105'); NODE=Path('/home/orca/.nvm/versions/node/v24.6.0')
tempfile.tempdir=str(OWN/'tmp')
for name in ('tmp','home','npm-cache'): (OWN/name).mkdir(exist_ok=True)
cwd=Path(sys.argv[1]).resolve(); assert cwd.is_relative_to(OWN)
environment={'HOME':str(OWN/'home'),'TMPDIR':str(OWN/'tmp'),'TMP':str(OWN/'tmp'),'TEMP':str(OWN/'tmp'),
 'PATH':str(NODE/'bin')+':/usr/bin:/bin','LANG':'C.UTF-8','TZ':'Asia/Singapore',
 'NPM_CONFIG_CACHE':str(OWN/'npm-cache'),'NPM_CONFIG_OFFLINE':'true','NPM_CONFIG_AUDIT':'false','NPM_CONFIG_FUND':'false',
 'NPM_CONFIG_USERCONFIG':str(OWN/'user.npmrc'),'NPM_CONFIG_GLOBALCONFIG':str(OWN/'global.npmrc'),
 'GIT_CONFIG_NOSYSTEM':'1','GIT_CONFIG_GLOBAL':'/dev/null','SYZYGY_POC_BROWSER':'/opt/google/chrome/google-chrome'}
argv=['bwrap','--unshare-pid','--unshare-net','--die-with-parent','--new-session','--clearenv',
 '--ro-bind','/usr','/usr','--ro-bind','/lib','/lib','--ro-bind','/lib64','/lib64',
 '--ro-bind','/opt/google/chrome','/opt/google/chrome','--symlink','usr/bin','/bin',
 '--proc','/proc','--dev','/dev','--dir','/etc','--bind',str(OWN),str(OWN),
 '--ro-bind',str(OWN/'etc-hosts'),'/etc/hosts','--ro-bind',str(OWN/'etc-nsswitch.conf'),'/etc/nsswitch.conf',
 '--ro-bind',str(OWN/'etc-resolv.conf'),'/etc/resolv.conf',
 '--ro-bind',str(NODE),str(NODE),'--bind',str(OWN/'tmp'),'/tmp','--chdir',str(cwd)]
for key,value in environment.items(): argv+=['--setenv',key,value]
argv+=['--',*sys.argv[2:]]
receipt={'schema':'owned-filesystem-namespace-command/1','cwd':str(cwd),'argv':argv,'environment':environment,'adapter_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
with (OWN/'isolation-commands.jsonl').open('a') as out:out.write(json.dumps(receipt)+'\n')
raise SystemExit(subprocess.call(argv))
