import hashlib, json, subprocess, sys
clone, out = sys.argv[1], sys.argv[2]
tools = 'docs/evidence/support-leaf-guards-review-2026-10-28/r2/tools/'
target = 'packages/support/src/support-purity.test.ts'
head = subprocess.run(['git', '-C', clone, 'show', f'2f48eefa:{target}'], capture_output=True, check=True).stdout
res = []
for f in ['fix-r2-module-reader.ts.txt', 'fix-r2-writes-reader.ts.txt', 'fix-r2-writes-row.ts.txt', 'fix-r2-reader-rows.ts.txt', 'fix-r2-import-call-row.ts.txt']:
    b = subprocess.run(['git', '-C', clone, 'show', f'2f48eefa:{tools}{f}'], capture_output=True, check=True).stdout
    stripped = b.rstrip(b'\n')
    res.append({'file': f, 'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b),
                'whole_in_head': head.count(b), 'stripped_in_head': head.count(stripped), 'nbsp': b.decode().count(chr(0xa0))})
json.dump({'target': target, 'target_sha256': hashlib.sha256(head).hexdigest(), 'nbsp_in_target': head.decode().count(chr(0xa0)), 'fixes': res}, open(out, 'w'), indent=1)
print(json.dumps(res, indent=1))
