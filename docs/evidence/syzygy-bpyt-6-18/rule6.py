import hashlib, json, os, re, subprocess
from pathlib import Path
for k in list(os.environ):
 if k.startswith("GIT_"): del os.environ[k]
root=Path(__file__).parent
subject=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
classifier=Path('packages/three-surface-poc-core/src/content-classification.ts')
reader=Path('packages/three-surface-poc-core/src/git-object-reader.ts')
original={p:p.read_text() for p in [classifier,reader]}
digest=lambda b: hashlib.sha256(b.encode()).hexdigest()
records=[]
mutants=[]
for reason in ['missing-at-revision','denied-basename','denied-prefix','denied-suffix','not-a-regular-blob','not-in-tree','path-escapes-repository','path-not-normalized','object-id-differs-from-tree','not-a-phase-a-seed-path']:
 old="        case '"+reason+"':"
 wrong='not-a-regular-blob' if reason=='not-in-tree' else 'not-in-tree'
 new=old+" return unavailable(path, '"+wrong+"', UNREADABLE);"
 mutants.append((reason,classifier,old,new,'behavior'))
old="          const unreachable: never = reason;\n          return unavailable(path, 'not-a-regular-blob', UNREADABLE);"
new="          const unreachable: never = reason;\n          return unavailable(path, 'not-in-tree', UNREADABLE);"
mutants.append(('compatibility-default',classifier,old,new,'behavior'))
mutants.append(('detail-widening',reader,"readonly detail: BlobReadRefusalReason | 'missing-at-revision'","readonly detail: string",'type'))
mutants.append(('discriminant-widening',reader,"readonly outcome: 'refused'; readonly detail: BlobReadRefusalReason", "readonly outcome: ObjectReadOutcome; readonly detail: BlobReadRefusalReason",'type'))
try:
 for ident,path,old,new,gate in mutants:
  assert original[path].count(old)==1,(ident,original[path].count(old))
  mutated=original[path].replace(old,new)
  path.write_text(mutated)
  log=root/('rule6-'+ident+'.log')
  resultFile=root/('rule6-'+ident+'.vitest.json')
  cmd=['npm','run','typecheck'] if gate=='type' else ['npx','vitest','run','--project','unit','packages/three-surface-poc-core/src/content-classification.test.ts','-t','step 2: every reader refusal','--reporter=json','--outputFile='+str(resultFile)]
  with log.open('w') as f:
   run=subprocess.run(cmd,stdout=f,stderr=subprocess.STDOUT)
  output=log.read_text()
  row={'id':ident,'subjectCommit':subject,'subjectPath':str(path),'subjectSha256':digest(original[path]),'mutantSha256':digest(mutated),'old':old,'new':new,'command':cmd,'exitCode':run.returncode,'log':log.name,'logSha256':digest(output)}
  if gate=='behavior':
   results=json.loads(resultFile.read_text())
   failed=[a['fullName'] for suite in results['testResults'] for a in suite['assertionResults'] if a['status']=='failed']
   row.update(executed=results['numPassedTests']+results['numFailedTests'],failedTests=failed,passed=results['numPassedTests'],failed=results['numFailedTests'])
   assert run.returncode!=0 and row['executed']>0 and any('step 2: every reader refusal' in name for name in failed),row
  else:
   row['compileNegativeExamples']=1
   row['diagnostics']=re.findall(r'^.*error TS.*$',output,re.M)
   assert run.returncode!=0 and row['diagnostics'],row
   if ident=='detail-widening':
    assert any('git-object-reader.test.ts' in line and 'TS2578' in line for line in row['diagnostics']),row
  records.append(row)
  path.write_text(original[path])
  print(ident+': rejected by '+gate+' gate',flush=True)
finally:
 for p,s in original.items(): p.write_text(s)
 (root/'rule6.json').write_text(json.dumps({'subjectCommit':subject,'mutants':records},indent=2)+'\n')
assert len(records)==len(mutants)
