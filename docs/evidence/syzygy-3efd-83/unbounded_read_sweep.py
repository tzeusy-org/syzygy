"""Unbounded-read sweep for syzygy-3efd.83, refreshing docs/evidence/syzygy-3efd-80/run-tree-read-sweep-2026-11-23.json.

Population: `git ls-files` of packages/polaris-dossier/src/*.ts and apps/three-surface-poc/src/polaris-generation/*.ts at HEAD, less
*.test.ts and *.testkit.ts (the 3efd-80 population). Predicate: the 3efd-80 predicate (readFileSync, readFile, readRecord,
readFileAsSized, readBoundedFile) widened by readSync and main's readPrivateBoundedFile, so a hand-written read loop over a descriptor is a site too; Python `re` per line,
lines that are an import or that define readRecord, readBoundedFile or readFileAsSized excluded, one site per match.

Each site is classified by CLASSES below: first by an exact (file, line text) carried from the 3efd-80 record, then by the rules this
bead adds. A site no rule classifies is printed and fails the run, so the counts always cover the whole population.

  python3 docs/evidence/syzygy-3efd-83/unbounded_read_sweep.py > docs/evidence/syzygy-3efd-83/unbounded-read-sweep-2026-11-24.json
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip())
PRIOR = ROOT / 'docs/evidence/syzygy-3efd-80/run-tree-read-sweep-2026-11-23.json'
CALL = re.compile(r'\b(readFileSync|readFile|readRecord|readFileAsSized|readBoundedFile|readPrivateBoundedFile|readSync)\(')
DEFINES = re.compile(r'^\s*import\b|function (readRecord|readBoundedFile|readPrivateBoundedFile|readFileAsSized)\b|\b(readRecord|readBoundedFile|readPrivateBoundedFile|readFileAsSized) = ')

AGENT_WRITABLE_CLONE = ('the clone .git HEAD, references, packed-refs and configuration, within the agent sessions write reach: '
                        'read by the version 2.10 reader rule with no-follow (readBoundedFile, followLink false; the launch reader also refuseGrowth), bounds code-stated '
                        '(4096 per reference, 16777216 for packed-refs and config); no requirement states them yet, a residual for '
                        'syzygy-nffo (REQ-polaris-generation-033 and -047)')
VERIFY_TEXT = ('the operator-named verify --text file: read by the version 2.10 reader rule (readBoundedFile), a link to a regular '
               'file followed as stat followed it; bound code-stated (4194304); no requirement states it yet, a residual for syzygy-nffo')

# Rules this bead adds, for sites the 3efd-80 record does not carry by exact text: (file, line-text substring) -> (class, why).
RULES: list[tuple[str, str, str, str]] = [
    ('packages/polaris-dossier/src/clone-head.ts', 'readBoundedFile(file, limit, { followLink: false })', 'bounded-code-stated', AGENT_WRITABLE_CLONE),
    ('packages/polaris-dossier/src/launch-clone.ts', 'readBoundedFile(file, limit, { followLink: false, refuseGrowth: true })', 'bounded-code-stated', AGENT_WRITABLE_CLONE),
    ('packages/polaris-dossier/src/verify-text-run.ts', 'readBoundedFile(textFile, VERIFY_TEXT_MAX_BYTES)', 'bounded-code-stated', VERIFY_TEXT),
    ('packages/polaris-dossier/src/check-record-read.ts', 'readSync(fd', 'already-bounded', 'the reader rule itself: at most bound + 1 bytes read from the one descriptor'),
    ('packages/polaris-dossier/src/launch-copy.ts', "fs.readFileSync(path.join(gitDir, 'HEAD')", 'not-agent-writable',
     'HEAD of the private copy Syzygy has just made by git init, fetch and checkout, read before any session starts; lstat and a '
     '4096-byte size bound first. Not in this bead (the lead named the clone, launch and verify readers); recorded, not changed'),
    ('packages/polaris-dossier/src/clone-shape.ts', 'fs.readSync(fd, buf', 'already-bounded',
     'clone .git shape reader: O_NOFOLLOW open, fstat type and size, at most MAX_FILE_BYTES + 1 read'),
    ('packages/polaris-dossier/src/clone-shape.ts', 'handle.readSync()', 'not-a-file-read', 'a directory entry listing (fs.Dir), counted against the walk bound'),
    ('packages/polaris-dossier/src/launched.ts', 'fs.readSync(fd, bytes', 'already-bounded',
     'the launched marker: O_NOFOLLOW | O_NONBLOCK open, fstat type and size, at most MARKER_BYTES_MAX + 1 read (syzygy-bpyt.8.12)'),
    ('packages/polaris-dossier/src/policy-snapshot.ts', 'readSync(fd, current', 'already-bounded',
     'committed policy bytes in the Syzygy checkout: O_NOFOLLOW | O_NONBLOCK open, fstat type and size, at most MAX_POLICY_BYTES + 1 read'),
    ('packages/polaris-dossier/src/run-tree-read.ts', '/** The text of the regular file', 'not-a-file-read', 'a doc comment naming readFileSync'),
    ('packages/polaris-dossier/src/polaris.ts', 'readRecord(file)', 'already-bounded', 'run-dir.ts readRecord: readBoundedText under RUN_TREE_BOUNDS.record (REQ-035 2.18)'),
]

# Any call of the reader rule itself is bounded by construction (the 3efd-80 class "already-bounded"), whatever file it reads.
BOUNDED_CALLS = ('readBoundedFile', 'readPrivateBoundedFile', 'readFileAsSized')


def sites(commit: str) -> list[dict]:
    files = subprocess.check_output(['git', 'ls-files', 'packages/polaris-dossier/src/*.ts', 'apps/three-surface-poc/src/polaris-generation/*.ts'],
                                    cwd=ROOT, text=True).split()
    files = [f for f in files if not f.endswith('.test.ts') and not f.endswith('.testkit.ts')]
    out = []
    for rel in files:
        text = subprocess.check_output(['git', 'show', f'{commit}:{rel}'], cwd=ROOT, text=True)
        for n, line in enumerate(text.split('\n'), 1):
            if DEFINES.search(line):
                continue
            for m in CALL.finditer(line):
                out.append({'site': f'{rel}:{n}', 'file': rel, 'call': m.group(1), 'text': line.strip()})
    return files, out


def main() -> int:
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    prior = json.loads(PRIOR.read_text())
    carried = {}
    for row in prior['rows']:
        carried[(row['site'].rsplit(':', 1)[0], row['text'])] = {k: v for k, v in row.items() if k not in ('site', 'call', 'text')}
    files, found = sites(commit)
    rows, unclassified = [], []
    for s in found:
        cls = None
        for rel, needle, klass, why in RULES:
            if s['file'] == rel and needle in s['text']:
                cls = {'class': klass, 'why': why, 'from': 'syzygy-3efd.83'}
                break
        if cls is None:
            # The 3efd-80 record stores each line text cut at 160 characters, so a carried row matches by file and that prefix.
            hits = [v for (f, text), v in carried.items() if f == s['file'] and s['text'].startswith(text)]
            if hits:
                cls = {**hits[0], 'from': 'syzygy-3efd.80'}
        if cls is None and s['call'] in BOUNDED_CALLS:
            cls = {'class': 'already-bounded', 'why': 'a call of the version 2.10 reader rule (readBoundedFile or readFileAsSized)', 'from': 'syzygy-3efd.83'}
        if cls is None:
            unclassified.append(s)
            continue
        rows.append({'site': s['site'], 'call': s['call'], 'text': s['text'], **cls})
    if unclassified:
        for s in unclassified:
            print(f"UNCLASSIFIED {s['site']} {s['call']}: {s['text']}", file=sys.stderr)
        return 1
    counts: dict[str, int] = {}
    for r in rows:
        counts[r['class']] = counts.get(r['class'], 0) + 1
    record = {
        'subject': {'commit': commit, 'population': 'git ls-files packages/polaris-dossier/src/*.ts apps/three-surface-poc/src/polaris-generation/*.ts, less *.test.ts and *.testkit.ts', 'files': len(files)},
        'predicate': 'Python re per line: ' + CALL.pattern + ' ; lines matching ' + DEFINES.pattern + ' are excluded; one site per match',
        'sweepScriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'prior': {'record': str(PRIOR.relative_to(ROOT)), 'sha256': hashlib.sha256(PRIOR.read_bytes()).hexdigest()},
        'sites': len(rows),
        'counts': dict(sorted(counts.items())),
        'boundsCodeStated': {
            'note': 'These bounds are stated in code only; no requirement states the reader rule or the bounds for these files. Residual: follow-on bead syzygy-nffo (state the reader rule and bounds in REQ-polaris-generation-033 and -047).',
            'packages/polaris-dossier/src/clone-head.ts': {'MAX_REF_BYTES': 4096, 'MAX_PACKED_REFS_BYTES': 16777216, 'requirement': 'REQ-polaris-generation-033 (init clone HEAD)'},
            'packages/polaris-dossier/src/launch-clone.ts': {'MAX_REF_BYTES': 4096, 'MAX_FILE_BYTES': 16777216, 'requirement': 'REQ-polaris-generation-047 (launch reads)'},
            'packages/polaris-dossier/src/verify-text-run.ts': {'VERIFY_TEXT_MAX_BYTES': 4194304, 'requirement': 'REQ-polaris-generation-033 (verify --text)'},
        },
        'classes': {
            'already-bounded': 'read by the version 2.10 reader rule or an equivalent descriptor-bounded loop before this bead',
            'bounded-code-stated': 'read by the reader rule since this bead, under a bound the code states and no requirement does yet (syzygy-nffo)',
            'in-scope': 'carried from the 3efd-80 record, where it meant a run-tree read that bead bounded (through readRecord, REQ-035 2.18); bounded, not open work',
            'not-a-file-read': 'a match that reads no file: a comment or a directory listing',
            'not-agent-writable': 'a stat-then-read of a file no agent session can write when it is read; recorded, not changed',
            'not-run-tree': 'carried from the 3efd-80 record: a read outside the run tree, with its reason',
            'residual': 'carried from the 3efd-80 record: a read left unbounded, with its reason',
        },
        'preExisting': [
            'R83 review note 4: O_NOFOLLOW refuses a link at the last component only. In clone-head.ts and launch-clone.ts a .git or refs '
            'directory swapped for a link after the .git lstat is still followed, and clone-head.ts fs.existsSync(loose) follows a link (a '
            'dangling link at the loose ref falls through to packed-refs). The byte bound holds on every path. Unchanged from main before this '
            'bead; not repaired here.',
        ],
        'rows': rows,
    }
    print(json.dumps(record, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main())
