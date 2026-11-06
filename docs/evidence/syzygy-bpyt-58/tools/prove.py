import hashlib,json,pathlib,subprocess,sys,shutil,datetime
OWN=pathlib.Path(__file__).resolve().parent
FIX=OWN/'fixture'
TEST='packages/polaris-generation-core/src/workspace-reach.test.ts'
TITLE='requires every npm workspace'
SOURCE=(FIX/TEST).read_text()
BASE={p:(FIX/p).read_bytes() for p in ['package.json','packages/polaris-generation-core/package.json',TEST]}
ROWS=[]
def sha(b):return hashlib.sha256(b).hexdigest()
def restore():
 for p,b in BASE.items():(FIX/p).write_bytes(b)
 for p in ['packages/leak','fixtures']:
  if (FIX/p).exists():shutil.rmtree(FIX/p)
 if (FIX/'node_modules/leak').is_symlink():(FIX/'node_modules/leak').unlink()
def manifest(path,change):
 p=FIX/path;d=json.loads(p.read_text());change(d);p.write_text(json.dumps(d,indent=2)+'\n')
def add_dep(field,spec,path='package.json',key='bpyt58-probe'):
 manifest(path,lambda d:d.setdefault(field,{}).__setitem__(key,spec))
def files():
 paths=set(BASE)
 for parent in ['packages/leak','fixtures']:
  if (FIX/parent).exists():paths.update(str(p.relative_to(FIX)) for p in (FIX/parent).rglob('*') if p.is_file())
 return {p:(FIX/p).read_bytes() for p in sorted(paths)}
def run(name,change=lambda:None,bypass=None,expected='fail',needles=()):
 name='r3-'+name
 restore();change()
 if bypass:
  old,new=bypass
  assert (FIX/TEST).read_text().count(old)==1,(name,'fragment count')
  (FIX/TEST).write_text((FIX/TEST).read_text().replace(old,new))
 current=files();changes=[{'path':p,'old':BASE.get(p,b'').decode(),'new':b.decode(),'old_sha256':sha(BASE.get(p,b'')),'new_sha256':sha(b)} for p,b in current.items() if b!=BASE.get(p)]
 report=OWN/'logs'/(name+'-vitest.json')
 cmd=[sys.executable,str(OWN/'capture.py'),name,str(FIX),'npx','--no-install','vitest','run','--project','unit',TEST,'-t',TITLE,'--reporter=json','--outputFile='+str(report)]
 result=subprocess.run(cmd,capture_output=True,text=True)
 receipt=json.loads((OWN/'logs'/(name+'.json')).read_text())
 data=json.loads(report.read_text()) if report.exists() else {}
 assertions=[a for f in data.get('testResults',[]) for a in f.get('assertionResults',[]) if a.get('status') in ['passed','failed']]
 messages='\n'.join(m for a in assertions for m in a.get('failureMessages',[]))
 ok=(len(assertions)==1 and TITLE in assertions[0]['title'] and ((expected=='pass' and assertions[0]['status']=='passed' and result.returncode==0) or (expected=='fail' and assertions[0]['status']=='failed' and result.returncode!=0 and all(n in messages for n in needles))))
 row={'name':name,'expected':expected,'validated':ok,'command':cmd,'receipt':receipt,'selected':len(assertions),'executed_statuses':[a['status'] for a in assertions],'reported_total':data.get('numTotalTests'),'needles':needles,'intended_assertion_present':all(n in messages for n in needles),'changes':changes,'test_sha256':sha((FIX/TEST).read_bytes()),'subject_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=FIX,text=True).strip(),'failure_messages':messages}
 ROWS.append(row);(OWN/'PREDICATE-PROOFS.json').write_text(json.dumps({'subject':'0db4d7b9d2a02966cfbbf1da696cd8979f2c7e45','rows':ROWS},indent=2)+'\n')
 print(name,'OK' if ok else 'INVALID',flush=True)
 if not ok:print(result.stdout,result.stderr,messages[-4000:],flush=True);raise RuntimeError(name)
def pair(name,change,bypass,needles):
 run(name,change,needles=needles);run(name+'-bypass',change,bypass,'pass')
def unscoped():
 p=FIX/'packages/leak';p.mkdir();(p/'package.json').write_text('{"name":"leak","version":"0.0.0","type":"module"}\n');(p/'index.js').write_text('export const witness = 58;\n');(FIX/'node_modules/leak').symlink_to('../packages/leak')
def discovered():
 manifest('package.json',lambda d:d['workspaces'].append('fixtures/*'))
 p=FIX/'fixtures/new';p.mkdir(parents=True);(p/'package.json').write_text('{"name":"bpyt58-new","version":"0.0.0"}\n')
try:
 run('control-baseline',expected='pass')
 run('control-altered-prose',lambda:manifest('package.json',lambda d:d.update(description='Synthetic prose changed; no dependency identity.')),expected='pass')
 def valid():
  for f,s in zip(['dependencies','devDependencies','peerDependencies','optionalDependencies'],['0.0.0','2.9.0','^5.5.0','~1.2.3']):add_dep(f,s)
  manifest('package.json',lambda d:d.update(overrides={'selector/path':{'nested':{'.':'~1.2.3'},'other':'^5.5.0'}}))
 run('control-valid-shapes-and-selector',valid,expected='pass')
 pair('negative-unscoped-no-entry',unscoped,("if (directory !== '.' && (typeof manifest['name'] !== 'string' || !manifest['name'].startsWith('@syzygy/')))","if (false)"),['packages/leak/package.json name','leak','not @syzygy/-named'])
 run('negative-file-dependency',lambda:add_dep('dependencies','file:./packages/support'),needles=['package.json dependencies.bpyt58-probe','file:./packages/support'])
 run('negative-bare-directory',lambda:add_dep('dependencies','packages/polaris-dossier/'),needles=['package.json dependencies.bpyt58-probe','packages/polaris-dossier/'])
 dirs=json.loads(subprocess.check_output(['git','show','HEAD:package.json'],cwd=FIX,text=True))['workspaces']
 # Removing the new root pattern alone is a discovery bypass: the same invalid workspace remains on disk but is omitted.
 pair('discovery-new-pattern',discovered,("const directories = workspaceDirectories(ROOT);","const directories = workspaceDirectories(ROOT).filter((directory) => !directory.startsWith('fixtures/'));"),['fixtures/new/package.json name','bpyt58-new'])
 for field in ['dependencies','devDependencies','peerDependencies','optionalDependencies']:
  literal="['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']"
  replacement=str([f for f in ['dependencies','devDependencies','peerDependencies','optionalDependencies'] if f!=field])
  pair('field-'+field,lambda f=field:add_dep(f,'file:./packages/support'),(literal,replacement),['package.json '+field+'.bpyt58-probe','file:./packages/support'])
 pair('root-inclusion',lambda:add_dep('dependencies','packages/polaris-dossier/'),("['.', ...directories]","directories"),['package.json dependencies.bpyt58-probe'])
 pair('workspace-dependency-traversal',lambda:add_dep('dependencies','packages/polaris-dossier/','packages/polaris-generation-core/package.json'),('Object.entries(declarations)','[]'),['packages/polaris-generation-core/package.json dependencies.bpyt58-probe'])
 def override(value):manifest('package.json',lambda d:d.update(overrides=value))
 pair('negative-path-overrides',lambda:override('packages/polaris-dossier/'),("if (typeof value === 'string') checkSpec(location, value);","if (false) checkSpec(location, value);"),['package.json overrides','packages/polaris-dossier/'])
 pair('nested-overrides',lambda:override({'top':{'nested':{'.':'packages/polaris-dossier/'}}}),('Object.entries(value)','[]'),['package.json overrides["top"]["nested"]["."]','packages/polaris-dossier/'])
 def corpus():
  negatives=['file:../lib','packages/polaris-dossier/','link:../lib','workspace:*','npm:typescript@5.5.0','./lib','../lib','/tmp/lib','~/lib','.hidden-lib','lib.tgz','git+https://example.invalid/lib','https://example.invalid/lib','latest','1.2','^1.2','~1','1.2.3-beta','1.2.3+meta','01.2.3','1.2.3 trailing','^~1.2.3','1.2.3 || 2.3.4','1.2.3\n','1.2.3\r']
  for i,s in enumerate(negatives):add_dep('dependencies',s,key='bpyt58-corpus-'+str(i))
  return negatives
 negatives=['file:../lib','packages/polaris-dossier/','link:../lib','workspace:*','npm:typescript@5.5.0','./lib','../lib','/tmp/lib','~/lib','.hidden-lib','lib.tgz','git+https://example.invalid/lib','https://example.invalid/lib','latest','1.2','^1.2','~1','1.2.3-beta','1.2.3+meta','01.2.3','1.2.3 trailing','^~1.2.3','1.2.3 || 2.3.4','1.2.3\n','1.2.3\r']
 run('version-rejection-corpus',corpus,needles=['dependencies.bpyt58-corpus-'+str(i) for i in range(len(negatives))])
 version_literal=r'/^(?:\^|~)?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u'
 for label,value,mutant in [
  ('exact-major','01.2.3',version_literal.replace('(?:0|[1-9]\\d*)','\\d+',1)),
  ('caret-prefix','^^1.2.3',version_literal.replace('(?:\\^|~)?','(?:\\^|~)*')),
  ('tilde-prefix','~~1.2.3',version_literal.replace('(?:\\^|~)?','(?:\\^|~)*')),
  ('minor-component','1.02.3',version_literal.replace('\\.(?:0|[1-9]\\d*)','\\.\\d+',1)),
  ('patch-component','1.2.03',version_literal.replace('\\.(?:0|[1-9]\\d*)$','\\.\\d+$')),
  ('version-end','1.2.3\n',version_literal.replace('$','')),
  ('version-start','x1.2.3',version_literal.replace('/^','/')),
 ]:pair('version-'+label,lambda s=value:add_dep('dependencies',s),(version_literal,mutant),['package.json dependencies.bpyt58-probe'])
 run('control-restored',expected='pass')
finally:restore()
(OWN/'PREDICATE-PROOFS-SUCCESS.json').write_text(json.dumps({'rows':len(ROWS),'validated':sum(r['validated'] for r in ROWS),'test_sha256':sha(SOURCE.encode()),'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=FIX,text=True).strip(),'proof_script_sha256':sha(pathlib.Path(__file__).read_bytes())},indent=2)+'\n')
