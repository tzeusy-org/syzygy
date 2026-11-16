from pathlib import Path
import json,hashlib
own=Path(__file__).resolve().parent
prefix=(own/'prove.py').read_text().split('\ntry:\n')[0]
exec(compile(prefix,str(own/'prove.py'),'exec'))
ROWS=json.loads((OWN/'PREDICATE-PROOFS.json').read_text())['rows']
try:
 pair('workspace-overrides',lambda:manifest('packages/polaris-generation-core/package.json',lambda d:d.update(overrides={'top':{'.':'packages/polaris-dossier/'}})),("checkOverrides(manifest['overrides'], `${path} overrides`);","if (directory === '.') checkOverrides(manifest['overrides'], `${path} overrides`);"),['packages/polaris-generation-core/package.json overrides["top"]["."]'])
 pair('malformed-section',lambda:manifest('package.json',lambda d:d.update(peerDependencies='invalid-object')),("if (!record(declarations)) throw new Error(`${path} ${field}: expected a dependency object`);","if (!record(declarations)) continue;"),['package.json peerDependencies: expected a dependency object'])
finally:restore()
(OWN/'PREDICATE-PROOFS-SUCCESS.json').write_text(json.dumps({'rows':len(ROWS),'validated':sum(r['validated'] for r in ROWS),'test_sha256':sha(SOURCE.encode()),'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=FIX,text=True).strip(),'proof_script_sha256':sha((own/'prove.py').read_bytes()),'extras_script_sha256':sha(Path(__file__).read_bytes())},indent=2)+'\n')
