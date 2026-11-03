#!/usr/bin/env python3
"""Rule-6 mutation run for export_census.py's --selftest.

Usage: mutate_census.py <export_census.py> <out.json> --tree <git tree the tool is stored in>

For each mutant the tool text is copied to a scratch directory with one
fragment replaced, then `--selftest` runs on the copy. A mutant is killed when
the selftest exits non-zero; the record keeps every failed case's name with its
first error line, the old and new fragment, and the commit the run was made at.
The tool's own path and the tree are arguments: nothing is hard-coded.
"""
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

MUTANTS = [
    ('lexer-block-comment-kept', "if c == '/' and i + 1 < n and src[i + 1] == '*':", "if False and i + 1 < n and src[i + 1] == '*':"),
    ('lexer-line-comment-kept', "if c == '/' and i + 1 < n and src[i + 1] == '/':", "if False and i + 1 < n and src[i + 1] == '/':"),
    ('lexer-string-dropped', "out.append(src[i:j + 1]); i = j + 1; last_sig = c; continue", "i = j + 1; last_sig = c; continue"),
    ('lexer-regex-literals-off', "regex_ok = last_sig == '' or last_sig in REGEX_PRECEDERS or last_word in REGEX_KEYWORDS", "regex_ok = False"),
    ('lexer-template-text-dropped', "            out.append(c); i += 1; continue\n        # code mode", "            i += 1; continue\n        # code mode"),
    ('lexer-return-not-a-regex-keyword', "REGEX_KEYWORDS = {'return', ", "REGEX_KEYWORDS = {'xreturn', "),
    ('lexer-escape-in-string-ignored', "j += 2 if src[j] == '\\\\' else 1", "j += 1"),
    ('lexer-template-expression-never-entered', "if c == '$' and i + 1 < n and src[i + 1] == '{':", "if False:"),
    ('lexer-regex-class-ignored', "in_class = True", "in_class = False"),
    ('lexer-template-brace-depth-ignored', "        if c == '{' and tpl:\n            tpl[-1] += 1", "        if c == '{' and tpl:\n            pass"),
    ('lexer-division-after-paren-read-as-regex', "REGEX_PRECEDERS = set('(,=:[!&|?{};+-*%<>~^')", "REGEX_PRECEDERS = set('(,=:[!&|?{};+-*%<>~^)')"),
    # The two predicates review R-GP-IMPL-POC-CORE-HYGIENE-2 (N9) found no selftest case pinning.
    ('lexer-nested-template-not-entered', "        if c == '`':\n            out.append(c); i += 1; in_template = True; continue", "        if c == '`' and not tpl:\n            out.append(c); i += 1; in_template = True; continue"),
    ('lexer-expression-close-stays-in-code', "tpl.pop(); out.append(c); i += 1; in_template = True; continue", "tpl.pop(); out.append(c); i += 1; in_template = False; continue"),
    ('class-public-off', "            if prod_outside:\n                cls = 'public'", "            if False:\n                cls = 'public'"),
    ('class-internal-off', "            elif prod_inside:\n                cls = 'internal'", "            elif False:\n                cls = 'internal'"),
    ('class-test-only-off', "            elif tests:\n                cls = 'test-only'", "            elif False:\n                cls = 'test-only'"),
    ('class-self-only-needs-two', "elif self_uses > 0:", "elif self_uses > 1:"),
    ('class-barrel-counts-as-user', "if g != f and g not in barrels and name in counts[g]]", "if g != f and name in counts[g]]"),
    ('class-declaration-not-subtracted', "self_uses = counts[f].get(name, 0) - 1", "self_uses = counts[f].get(name, 0) - 0"),
    ('mode-comments-never-stripped', "count_tokens(text[f] if raw else strip_comments(text[f]))", "count_tokens(text[f])"),
    ('mode-raw-flag-ignored', "count_tokens(text[f] if raw else strip_comments(text[f]))", "count_tokens(strip_comments(text[f]))"),
    ('decl-alias-takes-source-name', "names.append((part.split(' as ')[-1].strip(), m.start()))", "names.append((part.split(' as ')[0].strip(), m.start()))"),
    ('decl-const-not-matched', "(?:function\\*?|const|let|var|", "(?:function\\*?|let|var|"),
    ('test-detector-off', "is_test = lambda f: bool(re.search(r'\\.test\\.(ts|mjs|js)$', f))", "is_test = lambda f: bool(re.search(r'\\.nomatch$', f))"),
    ('outside-counts-tests', "prod_outside = [g for g in others if not g.startswith(prefix) and not is_test(g)]", "prod_outside = [g for g in others if not g.startswith(prefix)]"),
    ('inside-counts-tests', "prod_inside = [g for g in others if g.startswith(prefix) and not is_test(g)]", "prod_inside = [g for g in others if g.startswith(prefix)]"),
]


def main() -> int:
    tool = Path(sys.argv[1])
    out = Path(sys.argv[2])
    tree = Path(sys.argv[sys.argv.index('--tree') + 1])
    source = tool.read_text(encoding='utf-8')
    commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()

    base = subprocess.run([sys.executable, str(tool), '--selftest'], capture_output=True, text=True)
    records = []
    with tempfile.TemporaryDirectory() as tmp:
        for mutant_id, old, new in MUTANTS:
            if source.count(old) != 1:
                raise SystemExit(f'{mutant_id}: old fragment occurs {source.count(old)} times, expected 1')
            copy = Path(tmp) / 'export_census.py'
            copy.write_text(source.replace(old, new), encoding='utf-8')
            run = subprocess.run([sys.executable, str(copy), '--selftest'], capture_output=True, text=True)
            lines = run.stdout.splitlines()
            failed = [{'case': line.split(':')[0].removeprefix('FAIL').strip(), 'firstErrorLine': line} for line in lines if line.startswith('FAIL')]
            crash = run.stderr.strip().splitlines()[-1] if run.returncode not in (0, 1) and run.stderr.strip() else None
            records.append({
                'id': mutant_id,
                'old': old,
                'new': new,
                'exitCode': run.returncode,
                'killed': run.returncode != 0,
                'failedCases': failed,
                'crash': crash,
            })
    summary = {
        'subject': 'export_census.py --selftest',
        'subjectSha256': hashlib.sha256(source.encode('utf-8')).hexdigest(),
        'ranAtCommit': commit,
        'unmutatedExit': base.returncode,
        'unmutatedLast': base.stdout.strip().splitlines()[-1],
        'mutants': len(records),
        'killed': sum(1 for r in records if r['killed']),
        'killedByAFailedCase': sum(1 for r in records if r['failedCases']),
        'killedByCrashOnly': sum(1 for r in records if r['killed'] and not r['failedCases']),
        'survivors': [r['id'] for r in records if not r['killed']],
        'records': records,
    }
    out.write_text(json.dumps(summary, indent=1) + '\n', encoding='utf-8')
    print(f"unmutated: {summary['unmutatedLast']}")
    print(f"mutants={summary['mutants']} killed={summary['killed']} (failed case {summary['killedByAFailedCase']}, crash only {summary['killedByCrashOnly']}) survivors={summary['survivors']}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
