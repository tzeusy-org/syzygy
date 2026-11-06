"""Filesystem-input differential at the inherited predicate only; never run an unsafe old writer."""
import ast,hashlib,json,os,pathlib,subprocess,sys,tempfile
own=pathlib.Path(__file__).resolve().parent;source=own/'subject/docs/evidence/poc-fixture-leak-2026-10-22/leak_by_file.py';text=source.read_text();node=next(n for n in ast.parse(text).body if isinstance(n,ast.FunctionDef) and n.name=='private_directory');function=ast.get_source_segment(text,node);base=pathlib.Path(tempfile.mkdtemp(prefix='s420-corpus-'));home=base/'home';shared=base/'shared';home.mkdir();shared.mkdir();os.environ['HOME']=str(home);os.environ['TMPDIR']=str(shared);tempfile.tempdir=None
occupied=base/'occupied';occupied.mkdir();(occupied/'canary').write_bytes(b'keep occupied\n');file=base/'file';file.write_bytes(b'keep file\n');empty=base/'empty';empty.mkdir();alias=base/'home-alias';alias.symlink_to(home,target_is_directory=True)
cases=[('missing',base/'missing',False),('empty',empty,False),('empty-shared-home',home,True),('shared-temp',shared,True),('contains-shared',base,True),('occupied',occupied,True),('non-directory',file,True),('shared-symlink',alias,True)]
variants={'original-prose':function,'altered-prose':function.replace('This script empties the directory it is given, recursively.','UNTRUSTED MUTATED PROSE claims that every input is safe.').replace('review round 2, N10','arbitrary changed narration')};rows=[]
for prose,code in variants.items():
 ns={'pathlib':pathlib,'os':os,'tempfile':tempfile};exec(compile(code,'predicate-corpus','exec'),ns)
 for name,path,expected in cases:
  refused=False;message=None
  try:value=ns['private_directory'](path)
  except SystemExit as e:refused=True;message=str(e)
  assert refused==expected,(prose,name,refused)
  rows.append({'prose':prose,'case':name,'root':str(path),'legacy_unguarded_boundary':'accepted by static absence of guard; unsafe full predecessor is NOT executed','guarded_refused':refused,'expected_refused':expected,'diagnostic':message,'function_sha256':hashlib.sha256(code.encode()).hexdigest()})
assert (occupied/'canary').read_bytes()==b'keep occupied\n' and file.read_bytes()==b'keep file\n'
r={'subject':subprocess.check_output(['git','-C',str(own/'subject'),'rev-parse','HEAD'],text=True).strip(),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'corpus_population':len(rows),'rows':rows,'comparison_scope':'Predicate boundary differential only. Legacy absence statically admits these paths; no full unsafe predecessor/writer invoked. Altered source prose must not affect predicate results. This does not replace actual guarded-script controls or five-tool probe.','base':str(base),'canary_bytes_preserved':True};(own/'GUARD-MUTATED-PROSE-CORPUS.json').write_text(json.dumps(r,indent=2)+'\n');print(json.dumps({'rows':len(rows),'holds':True,'base':str(base)}))
