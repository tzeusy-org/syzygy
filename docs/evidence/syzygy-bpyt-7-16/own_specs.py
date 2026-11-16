"""syzygy-bpyt.7.16: own mutants for the two refusals this bead pins that no PR 535 reviewer mutant reaches alone, written in the
reviewer's spec format (docs/evidence/host-pins-review-2026-10-27/rev535-specs.json) over the same test files, for the reviewer's
rev535_mut.py. Each must survive at BASE and be killed at HEAD by its own row alone.
  O1: the scheme's one space may also be U+00A0, so `Bearer\u00a0<token>` is admitted (the bearer row's new no-break space form);
  O2: the opaque origin `null` is allowed (the new suffix-and-null row).
Usage: python3 -I own_specs.py <tree> <out.json>
"""
import json, sys
from pathlib import Path

tree, out = Path(sys.argv[1]), sys.argv[2]
review = json.loads((tree / 'docs/evidence/host-pins-review-2026-10-27/rev535-specs.json').read_text())
mutants = [
    {'id': 'O1-bearer-no-break-space-admitted', 'edits': [{'file': 'packages/http-host/src/credentials.ts',
     'old': '  const match = /^Bearer (.+)$/.exec(header);', 'new': '  const match = /^Bearer[ \\u00a0](.+)$/.exec(header);'}]},
    {'id': 'O2-origin-null-allowed', 'edits': [{'file': 'apps/three-surface-poc/src/browser-origin.ts',
     'old': '  return origin === undefined || origin === expectedOrigin(host);',
     'new': "  return origin === undefined || origin === 'null' || origin === expectedOrigin(host);"}]},
]
for m in mutants:
    for e in m['edits']:
        text = (tree / e['file']).read_text()
        assert text.count(e['old']) == 1, (m['id'], e['file'])
        assert '\u00a0' not in e['new'], 'a literal no-break space in a fragment'
Path(out).write_text(json.dumps({'files': review['files'], 'mutants': mutants}, indent=1) + '\n')
print(out, len(mutants))
