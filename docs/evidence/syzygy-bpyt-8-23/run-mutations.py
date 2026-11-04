import hashlib,json,os,subprocess,tempfile,datetime
from pathlib import Path
OWN=Path('/home/orca/.tmp/syzygy-bpyt8-23-implementation-20261105')
tempfile.tempdir=str(OWN/'tmp')
assert Path(tempfile.gettempdir()).is_relative_to(OWN)
assert all(Path(os.environ[k]).is_relative_to(OWN) for k in ('TMPDIR','TMP','TEMP'))
W=Path.cwd(); CLONE=OWN/'diagnostic-mutations'; BASE=OWN/'integrated-base'
GUARD='packages/polaris-generation-core/src/island-boundary.test.ts'
WORKSPACE='packages/polaris-generation-core/src/workspace-reach.test.ts'
retained=json.loads(Path('/home/orca/.tmp/syzygy-bpyt8-shaping-20261105/worker-23-43/retained-mutants.json').read_text())['mutants']
sha=lambda b:hashlib.sha256(b).hexdigest()
head=lambda root:subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
mutants=[]
for item in retained:
 m=dict(item['original_mutant']); m['id']=item['review']+'-'+m['id']; m['historical_source']=item['source']; m['historical_source_sha256']=item['source_sha256']; m['historical_fragment']={k:m[k] for k in ('file','old','new')}
 if m['id'].startswith('PR510-R4'):
  m['old']='      "types": "./dist/live.d.ts",\n      "import": "./dist/live.js",'
  m['new']='      "types": "./dist/live.d.ts",\n      "node": "./dist/index.js",\n      "import": "./dist/live.js",'
  m['adaptation']='Current exports has a source condition before types; retain it and inject the original node-before-import disagreement at the same ./live entry.'
 if m['id'].startswith('PR517-R5'):
  m['not_applicable']='The hand-kept Vitest alias map was removed by PR549; the exact historical fragment does not exist. ROOT-REDIRECTION-IDENTITY below exercises the current real module-identity gate without adding a shipped map.'
 mutants.append(m)
anchor="import { UNDERSTANDING_ITEMS } from './draft-schema.js';\n"
extra={
 'AST-REQUIRE-EXTERNAL':"export const loadFs = () => require('node:fs');\n",
 'AST-PARENTHESIZED-REQUIRE':"export const loadFs = () => (require)('node:fs');\n",
 'AST-PARENTHESIZED-CREATEREQUIRE':"export const loadFs = () => (createRequire)(import.meta.url);\n",
 'AST-REQUIRE':"export const loadIsland = () => require('@syzygy/polaris-generation-core');\n",
 'AST-ALIASED-CREATEREQUIRE':"import { createRequire as makeLoader } from 'node:module';\nconst load = makeLoader(import.meta.url);\nexport const loadIsland = () => load('@syzygy/polaris-generation-core');\n",
 'AST-NAMESPACE-CREATEREQUIRE':"import * as mod from 'node:module';\nconst load = mod.createRequire(import.meta.url);\nexport const loadIsland = () => load('@syzygy/polaris-generation-core');\n",
 'AST-IMPORT-EQUALS':"import load = require('@syzygy/polaris-generation-core');\n",
 'AST-IMPORT-TYPE':"export type Island = import('@syzygy/polaris-generation-core').PipelineInput;\n",
 'AST-STATIC-TYPE':"import type { PipelineInput } from '@syzygy/polaris-generation-core';\n",
 'AST-LITERAL-DYNAMIC':"export const loadIsland = () => import('@syzygy/polaris-generation-core');\n",
 'AST-TEMPLATE-ISLAND':"export const loadIsland = () => import(`@syzygy/polaris-generation-core`);\n",
 'AST-TEMPLATE-LIVE-POSITIVE':"export const loadLive = () => import(`@syzygy/polaris-generation-core/live`);\n",
}
for ident,addition in extra.items():
 mutants.append({'id':ident,'file':'packages/polaris-dossier/src/render.ts','old':anchor,'new':anchor+addition,'tests':[GUARD]})
mutants.append({'id':'ROOT-REDIRECTION-IDENTITY','file':'vitest.config.ts','old':'export default defineConfig({','new':"export default defineConfig({\n  plugins: [{ name: 'rule-6-root-redirection', enforce: 'pre', resolveId(id) {\n    if (id === '@syzygy/polaris-generation-consent/live') return fileURLToPath(new URL('./packages/polaris-generation-consent/src/index.ts', import.meta.url));\n  } }],",'tests':[WORKSPACE],'testNamePattern':"load, under the suite, each entry from its source module",'adaptation':'Retired hand-kept alias replaced by a scratch-only resolver plugin redirecting ./live to the root. The unchanged existing real module-identity row must fail; manifest consistency alone would not see this redirection.'})

prior=json.loads((W/'docs/evidence/syzygy-bpyt-8-19/boundary-mutants-spec.json').read_text())
mutants.append(next(m for m in prior['mutants'] if m['id'].startswith('B10-')))

def run(root,label,tests,pattern=None):
 out=OWN/'diagnostic-mutation-output'/label; out.parent.mkdir(exist_ok=True)
 command=['npx','vitest','run','--project','unit',*tests,'--reporter=json','--outputFile='+str(out.with_suffix('.json'))]
 if pattern: command+=['--testNamePattern',pattern]
 with out.with_suffix('.log').open('w') as log:
  done=subprocess.run(['python3',str(OWN/'isolated.py'),str(root),*command],cwd=W,stdout=log,stderr=subprocess.STDOUT)
 report=json.loads(out.with_suffix('.json').read_text())
 failures=[{'test':t['fullName'],'messages':t['failureMessages']} for f in report['testResults'] for t in f.get('assertionResults',[]) if t['status']=='failed']
 return {'commit':head(root),'command':command,'outer_command':['python3',str(OWN/'isolated.py'),str(root),*command],'adapter_sha256':sha((OWN/'isolated.py').read_bytes()),'exit':done.returncode,'selectedTests':report['numPassedTests']+report['numFailedTests'],'totalTests':report['numTotalTests'],'failedTests':report['numFailedTests'],'passedTests':report['numPassedTests'],'failures':failures,'report_sha256':sha(out.with_suffix('.json').read_bytes()),'log_sha256':sha(out.with_suffix('.log').read_bytes()),'guard_sha256':sha((root/GUARD).read_bytes()),'outcome':'assertion-killed' if done.returncode and failures and report['numTotalTests']>0 else 'survived' if not done.returncode else 'non-assertion-failure'}

record={'schema':'island-boundary-mutations/1','capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'base':head(BASE),'subject':head(CLONE),'runner_sha256':sha(Path(__file__).read_bytes()),'bootstrap':json.loads((OWN/'bootstrap.json').read_text()),'historical':[], 'mutants':[],'controls':[]}
for file in ['docs/evidence/island-decoupling-review-2026-10-22/mutants-reviewer.json','docs/evidence/consent-live-module-review-2026-10-24/reviewer-boundary-mutants.json']:
 obj=json.loads((W/file).read_text()); record['historical'].append({'path':file,'sha256':sha((W/file).read_bytes()),'record':obj})
for root in (CLONE,): record['controls'].append({'role':'original','tree':root.name,**run(root,root.name+'-original',[GUARD,WORKSPACE,'packages/polaris-dossier/src/subpath-imports.test.ts'])})
for m in mutants:
 if m.get('not_applicable'):
  record['mutants'].append({**m,'outcome':'historical-fragment-not-applicable'});continue
 results=[]
 for root in (CLONE,):
  target=root/m['file']; before=target.read_bytes(); text=before.decode()
  if text.count(m['old'])!=1:raise RuntimeError((m['id'],root.name,text.count(m['old'])))
  after=text.replace(m['old'],m['new']).encode()
  try:
   target.write_bytes(after)
   result={'tree':root.name,'subject':{'path':m['file'],'original_sha256':sha(before),'mutant_sha256':sha(after)},**run(root,root.name+'-'+m['id'],m['tests'],m.get('testNamePattern'))}
   results.append(result); print(m['id'],root.name,result['outcome'],result['totalTests'],flush=True)
  finally:target.write_bytes(before)
 record['mutants'].append({**m,'runs':results})
 (OWN/'diagnostic-mutations.json').write_text(json.dumps(record,indent=2)+'\n')
for root in (CLONE,):
 record['controls'].append({'role':'restored','tree':root.name,**run(root,root.name+'-restored',[GUARD,WORKSPACE,'packages/polaris-dossier/src/subpath-imports.test.ts'])})
 assert subprocess.check_output(['git','status','--porcelain'],cwd=root,text=True)==''
(OWN/'diagnostic-mutations.json').write_text(json.dumps(record,indent=2)+'\n')
