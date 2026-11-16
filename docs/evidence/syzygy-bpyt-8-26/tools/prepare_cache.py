from pathlib import Path
import base64,concurrent.futures,datetime,hashlib,json,os,subprocess,time
own=Path(__file__).resolve().parent;node=Path('/home/orca/.nvm/versions/node/v24.6.0');plan=json.loads((own/'STATIC-CACHE-PLAN.json').read_text());tick=time.monotonic()
env={'HOME':str(own/'home'),'PATH':str(node/'bin')+':/usr/bin:/bin','NPM_CONFIG_CACHE':str(own/'cache'),'NPM_CONFIG_USERCONFIG':str(own/'user.npmrc'),'NPM_CONFIG_GLOBALCONFIG':str(own/'global.npmrc'),'NPM_CONFIG_AUDIT':'false','NPM_CONFIG_FUND':'false','LANG':'C.UTF-8'}
def one(pair):
 i,row=pair;out=own/'logs'/f'cache-{i:03d}.log';assert not out.exists()
 with out.open('xb') as f:r=subprocess.run([str(node/'bin/npm'),'cache','add',row['url'],'--ignore-scripts'],env=env,stdout=f,stderr=subprocess.STDOUT,timeout=120)
 checks=[]
 for sri in row['integrities']:
  algo,data=sri.split('-',1);digest=base64.b64decode(data).hex();content=own/'cache/_cacache/content-v2'/algo/digest[:2]/digest[2:4]/digest[4:];checks.append({'sri':sri,'present':content.is_file(),'bytes':content.stat().st_size if content.is_file() else None,'valid':content.is_file() and hashlib.new(algo,content.read_bytes()).hexdigest()==digest})
 return {'index':i,'url':row['url'],'exit':r.returncode,'checks':checks,'logSha256':hashlib.sha256(out.read_bytes()).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:rows=list(pool.map(one,enumerate(plan['tarballs'],1)))
a={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'lockfileSha256':plan['lockfileSha256'],'population':len(rows),'valid':sum(r['exit']==0 and all(c['valid'] for c in r['checks']) for r in rows),'elapsedSeconds':time.monotonic()-tick,'rows':rows};(own/'CACHE-PREPARATION.json').write_text(json.dumps(a,indent=2)+'\n');print(json.dumps({k:v for k,v in a.items() if k!='rows'}),flush=True);raise SystemExit(0 if a['valid']==a['population']==105 else 1)
