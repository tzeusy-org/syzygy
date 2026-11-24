from pathlib import Path
import gzip, hashlib, io, json, re, subprocess, tarfile

OUT = Path(__file__).resolve().parent
SOURCE = Path('/home/orca/.tmp/f3-native-admission-fixes/cold-final-observer-review')
REPO = Path('/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w')
members, originals, revisions = {}, [], []
sha = lambda data: hashlib.sha256(data).hexdigest()
encode = lambda value: (json.dumps(value, indent=2, sort_keys=True)+'\n').encode()

# Exact allowlist: frozen files and completed checks only; never walk tmp directories.
for revision in ['r1','r2','r3','r4','r5']:
    names = ['README.md','metadata.json','observer.patch','url-run-composed.test.ts','focused/focused.log','focused/result.json']
    if revision in ['r3','r4','r5']:
        names += ['typecheck/typecheck.log','typecheck/result.json']
    if revision in ['r1','r2','r3']:
        names += ['INDEPENDENT-REVIEW-RAW.md']
    if revision == 'r5':
        names += ['verified-results.json','independent-source-review-RAW.md']
    for name in names:
        source = SOURCE/revision/name
        assert source.is_file() and not source.is_symlink(), source
        data = source.read_bytes()
        key = revision+'/'+name
        members[key] = data
        originals.append({'original':str(source),'member':key,'bytes':len(data),'sha256':sha(data)})
    metadata = json.loads(members[revision+'/metadata.json'])
    assert sha(members[revision+'/url-run-composed.test.ts']) == metadata['sourceSha256']
    assert sha(members[revision+'/observer.patch']) == metadata['patchSha256']
    checks = {'focused':json.loads(members[revision+'/focused/result.json'])}
    if revision in ['r3','r4','r5']:
        checks['typecheck'] = json.loads(members[revision+'/typecheck/result.json'])
    review = 'not independently reviewed'
    if revision in ['r1','r2','r3']:
        raw = members[revision+'/INDEPENDENT-REVIEW-RAW.md'].decode()
        assert re.search(r'(?m)^(?:Verdict: )?REVISE\s*$', raw)
        review = 'REVISE'
    if revision == 'r5':
        raw = members[revision+'/independent-source-review-RAW.md']
        assert sha(raw) == 'e492faab18af1f03d4b08b9b3e8a9334a108ed4aa183dc79dca98f6e796a702d'
        review = 'PASS'
        assert checks['focused']['exit']==0 and checks['typecheck']['exit']==0
        assert any('3 passed | 4 skipped (7)' in line for line in checks['focused']['summary'])
    revisions.append({'revision':revision,'baseCommit':metadata['baseCommit'],'sourceSha256':metadata['sourceSha256'],
                      'patchSha256':metadata['patchSha256'],'frozenAtUtc':metadata['frozenAtUtc'],
                      'independentSourceReview':review,'checks':checks})

commit = subprocess.check_output(['git','rev-parse','1a0c1b8e1^{commit}'],cwd=REPO,text=True).strip()
committed = subprocess.check_output(['git','show',commit+':packages/polaris-dossier/src/url-run-composed.test.ts'],cwd=REPO)
assert sha(committed)==revisions[-1]['sourceSha256']
bindings = {'subject':'cold-final observer test-only revision history','baseCommit':revisions[-1]['baseCommit'],
            'finalSourceCommit':commit,'finalSourceSha256':revisions[-1]['sourceSha256'],
            'scope':'R1-R5 frozen packets, original failures and completed scoped checks; no native acceptance claim.',
            'sourceSelectionCount':len(originals),'originalSelections':originals,'revisions':revisions,
            'excluded':'All tmp directories, stores, state, credential material and unselected future files.'}
readme = """# Cold-final observer revision evidence

[Observed] This deterministic archive preserves R1-R5 frozen test source, patches, bindings, original check logs/results and independent source review raws. R1, R2 and R3 were REVISE. R1 failed transform before test collection; R2 failed forwarding preservation (2 passed, 1 failed, 4 native skipped); R3 passed the focused 3 but failed typecheck. R4 passed the focused 3 and still failed generic-signature typecheck. R5 passed focused 3, skipped 4 native cases (7 total), and passed typecheck. R5's fresh independent source review is PASS and its raw is included.

[Observed] Source bindings name each actual frozen subject and check base. R5 source was committed separately; bindings.json records its full commit. The archive preserves the earlier failed revisions without relabeling their outcomes. No genuine native case ran in these focused checks, and no native completion or acceptance claim is made.

The observer substitutes stored-helper current/read/within callbacks. Original callback invocation values/counts/results/errors are preserved; those callback argument identities change. Other observed port arguments pass through unchanged. Failure-only identity projections are post-return diagnostics, not observed private guard outcomes.

payload.tar.gz contains source copies as inert archive members only. No plain test source is staged by this packaging. packaging-manifest.json enumerates every member's byte count and SHA-256. Tar members are sorted, regular files with mode0644, uid/gid0, empty user/group names and mtime0; gzip has no filename and mtime0. package.py records the explicit input allowlist. Temporary directories, stores, state and credentials are excluded. Raw original inputs remain unchanged. SHA256SUMS binds the external payload, manifest, bindings, README and packaging script.
"""
members['bindings.json'] = encode(bindings)
members['README.md'] = readme.encode()
members['package.py'] = Path(__file__).read_bytes()

def archive():
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode='w', format=tarfile.USTAR_FORMAT) as tar:
        for name,data in sorted(members.items()):
            info=tarfile.TarInfo(name);info.size=len(data);info.mode=0o644;info.uid=info.gid=0
            info.uname=info.gname='';info.mtime=0
            tar.addfile(info,io.BytesIO(data))
    packed = io.BytesIO()
    with gzip.GzipFile(fileobj=packed,mode='wb',filename='',mtime=0,compresslevel=9) as gz:
        gz.write(tar_buffer.getvalue())
    return packed.getvalue()

payload = archive()
assert payload==archive()
with tarfile.open(fileobj=io.BytesIO(payload),mode='r:gz') as tar:
    infos=tar.getmembers()
    assert [item.name for item in infos]==sorted(members)
    for item in infos:
        assert item.isfile() and item.mtime==0 and item.uid==item.gid==0
        assert tar.extractfile(item).read()==members[item.name]
for row in originals:
    assert sha(Path(row['original']).read_bytes())==row['sha256']
manifest = {'archive':'payload.tar.gz','archiveSha256':sha(payload),'archiveBytes':len(payload),
            'memberCount':len(members),'memberBytes':sum(len(data) for data in members.values()),
            'originalSelectionCount':len(originals),'finalSourceCommit':commit,
            'members':[{'path':name,'bytes':len(data),'sha256':sha(data)} for name,data in sorted(members.items())],
            'verification':'Generated twice with identical bytes; tar member metadata/content checked; selected originals rehashed unchanged.'}
(OUT/'payload.tar.gz').write_bytes(payload)
(OUT/'packaging-manifest.json').write_bytes(encode(manifest))
(OUT/'bindings.json').write_bytes(members['bindings.json'])
(OUT/'README.md').write_bytes(members['README.md'])
names=['README.md','bindings.json','package.py','packaging-manifest.json','payload.tar.gz']
(OUT/'SHA256SUMS').write_text(''.join(sha((OUT/name).read_bytes())+'  '+name+'\n' for name in names))
print(json.dumps({'packet':str(OUT),'archiveSha256':sha(payload),'archiveBytes':len(payload),
                  'members':len(members),'memberBytes':manifest['memberBytes'],'originalSelections':len(originals),
                  'manifestSha256':sha((OUT/'packaging-manifest.json').read_bytes()),'finalSourceCommit':commit}))
