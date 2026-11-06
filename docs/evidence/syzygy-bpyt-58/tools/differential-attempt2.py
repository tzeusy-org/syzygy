from pathlib import Path
import subprocess,json,hashlib,sys,shutil
OWN=Path(__file__).resolve().parent;D=OWN/'differential';BASE='740279435178a882f1c2d526a2a7ea0bf2b52cbc';HEAD='23a7f5c962d894510b48039a763c7e57971bb1a5'
FILES=['package.json','apps/three-surface-poc/src/polaris-generation/dossier-site.ts']
def sha(b):return hashlib.sha256(b).hexdigest()
rows=[]
for version,commit in [('base',BASE),('head',HEAD)]:
 subprocess.run(['git','checkout','--detach',commit],cwd=D,check=True)
 original={p:(D/p).read_bytes() for p in FILES}
 raw=(D/'packages/polaris-dossier/src/no-egress.test.ts').read_text()
 names=['workspaceAliases','sourcesOnly','bundleDriver']
 functions=[]
 for name in names:
  start=raw.index(('async function ' if name=='bundleDriver' else 'function ')+name+'(');end=raw.index('\n}\n',start)+3;functions.append(raw[start:end])
 probe="""import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { build, type Plugin } from 'esbuild';
import { ROOT, resolve, reach, entryModules } from './packages/polaris-generation-core/src/workspace-reach.testkit.ts';
const REAL_ROOT=ROOT, SOURCE_ROOT=fs.realpathSync(ROOT), SOURCES_ONLY='resolving within the workspace sources';
"""+'\n'.join(functions)+"""
const specifier=process.argv[2]!, outfile=process.argv[3]!;
const answer=resolve('apps/syzygy/src/main.ts',specifier);
const walked=reach('apps/syzygy/src/main.ts',(module)=>module==='apps/syzygy/src/main.ts'?[specifier]:[]);
await bundleDriver(outfile);
const bytes=fs.readFileSync(outfile);
console.log(JSON.stringify({resolver:answer===undefined?'undefined':answer,reach:walked,aliases:Object.fromEntries(Object.entries(workspaceAliases()).map(([k,v])=>[k,path.relative(ROOT,v)])),bundleSha256:createHash('sha256').update(bytes).digest('hex'),bundleBytes:bytes.length,leakMarker:bytes.includes(Buffer.from('BPYT58_LEAK_MARKER'))}));
"""
 (D/'bpyt58-probe.ts').write_text(probe)
 for case,spec,prose,leak in [('exact','1.2.3',False,False),('caret','^1.2.3',False,False),('tilde','~1.2.3',False,False),('file','file:./packages/support',False,False),('bare-directory','packages/polaris-dossier/',False,False),('alias','npm:typescript@5.5.0',False,False),('altered-prose','1.2.3',True,False),('unscoped-no-entry',None,False,True)]:
  for p,b in original.items():(D/p).write_bytes(b)
  if (D/'packages/leak').exists():shutil.rmtree(D/'packages/leak')
  if (D/'node_modules/leak').is_symlink():(D/'node_modules/leak').unlink()
  manifest=json.loads(original['package.json']);manifest.setdefault('dependencies',{})['bpyt58-probe']=spec or '1.2.3'
  if prose:manifest['description']='Altered descriptive prose; identities/specifications unchanged.'
  (D/'package.json').write_text(json.dumps(manifest,indent=2)+'\n')
  if leak:
   p=D/'packages/leak';p.mkdir();(p/'package.json').write_text('{"name":"leak","version":"0.0.0","type":"module"}\n');(p/'index.js').write_text("console.log('BPYT58_LEAK_MARKER');\n");(D/'node_modules/leak').symlink_to('../packages/leak');(D/FILES[1]).write_text("import 'leak';\n"+original[FILES[1]].decode())
  name='differential-'+version+'-'+case;outfile=OWN/(name+'.mjs')
  cmd=[sys.executable,str(OWN/'capture.py'),name,str(D),'node','bpyt58-probe.ts','leak' if leak else 'bpyt58-probe',str(outfile)]
  result=subprocess.run(cmd,capture_output=True,text=True)
  if result.returncode:print(result.stdout,result.stderr);raise RuntimeError(name)
  output=json.loads((OWN/'logs'/(name+'.stdout')).read_text());changes=[{'path':p,'old':b.decode(),'new':(D/p).read_text(),'old_sha256':sha(b),'new_sha256':sha((D/p).read_bytes())} for p,b in original.items() if b!=(D/p).read_bytes()]
  if leak:changes.extend({'path':str(p.relative_to(D)),'old':'','new':p.read_text(),'new_sha256':sha(p.read_bytes())} for p in (D/'packages/leak').iterdir())
  rows.append({'version':version,'case':case,'commit':commit,'output':output,'changes':changes,'probe_sha256':sha((D/'bpyt58-probe.ts').read_bytes()),'actual_function_fragments':[{'function':n,'sha256':sha(s.encode())} for n,s in zip(names,functions)],'resolver_source_sha256':sha((D/'packages/polaris-generation-core/src/workspace-reach.testkit.ts').read_bytes()),'S10_source_sha256':sha(raw.encode())});print(name,output['resolver'],output['leakMarker'],flush=True)
 for p,b in original.items():(D/p).write_bytes(b)
 if (D/'packages/leak').exists():shutil.rmtree(D/'packages/leak')
 if (D/'node_modules/leak').is_symlink():(D/'node_modules/leak').unlink()
 (D/'bpyt58-probe.ts').unlink()
comparisons=[]
for case in sorted({r['case'] for r in rows}):
 a,b=[r for r in rows if r['case']==case];comparisons.append({'case':case,'equal':a['output']==b['output'],'base':a['output'],'head':b['output']})
result={'base':BASE,'head':HEAD,'rows':rows,'comparisons':comparisons,'all_equal':all(r['equal'] for r in comparisons),'note':'Actual unchanged S10 function fragments execute the full fixture-driver bundle. Resolver/reach execute real testkit with synthetic edge input. Original island/S10 test files remain unchanged; full gate is separate proof. These are author-emitted reports pending independent capture/review.'}
(OWN/'OLD-NEW-DIFFERENTIAL.json').write_text(json.dumps(result,indent=2)+'\n')
assert result['all_equal']
assert all(r['output']['leakMarker'] for r in rows if r['case']=='unscoped-no-entry')
