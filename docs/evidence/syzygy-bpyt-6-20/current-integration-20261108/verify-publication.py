"""Read-only Git/artifact binding check; imports or executes no product code.
Usage: python3 <this-file> [evidence-publication-commit]
"""
from pathlib import Path
import hashlib, json, subprocess, sys
SOURCE='5414a20faf3d2deafc576d4eac6dcb72d8042a07'
PREFIX='docs/evidence/syzygy-bpyt-6-20/current-integration-20261108/'
def git(*a):return subprocess.check_output(['git',*a])
publication=git('rev-parse',sys.argv[1]if len(sys.argv)==2 else'HEAD').decode().strip()
assert len(sys.argv)<=2
fields=[x.decode()for x in git('diff-tree','--no-commit-id','-r','--name-status','-z',SOURCE,publication).split(b'\0')if x]
assert fields and len(fields)%2==0
changes=list(zip(fields[::2],fields[1::2]))
assert all(status=='A'and path.startswith(PREFIX)for status,path in changes)
def raw(path):return git('show',publication+':'+path)
index=json.loads(raw(PREFIX+'evidence-index.json'))
for row in index['files']:
 data=raw(PREFIX+row['path']);assert len(data)==row['bytes']and hashlib.sha256(data).hexdigest()==row['sha256']
assert len(index['files'])==index['fileDenominator']
assert {p for _,p in changes}=={PREFIX+r['path']for r in index['files']}|{PREFIX+'evidence-index.json'}
inputs=json.loads(raw(PREFIX+'publication-inputs.json'))
for path,identity in inputs['preservedTreeIdentities'].items():
 assert git('rev-parse',publication+':'+path).decode().strip()==identity
for row in inputs['newSideSources']:
 assert hashlib.sha256(raw(row['path'])).hexdigest()==row['sha256']
print(json.dumps({'runtimeSubject':SOURCE,'publicationSubject':publication,'evidenceOnlyAddedPaths':len(changes),'indexedArtifacts':len(index['files']),'sourceInputRows':len(inputs['newSideSources']),'existingTrackedBytesUnchanged':True,'qualification':'Relevant source/content equivalence only; HEAD/evidence-tree and governance-census inputs changed. No product runtime, fresh review or broad-gate PASS is established.'},indent=2))
