#!/usr/bin/env python3
"""Independent TextDecoder census for PR 534 review (R-GP-IMPL-UTF8-CANONICAL-1).

Predicate (published, rule 9): the population is every tracked blob under packages/, apps/ or scripts/ whose name
ends in .ts, .tsx, .mts, .cts, .js, .mjs or .cjs, excluding any path with a /dist/ or /node_modules/ segment. A
"mention" is every match of the regex r'\bTextDecoder\b' outside a // line comment (a line whose first non-blank
characters are //, or the tail after a // not inside a string is NOT stripped: only whole comment lines are skipped).
A "construction" is a mention immediately preceded by r'new\s+' (any whitespace, optional 'globalThis.' or
'util.' qualifier). Options are read from the text between the construction's opening parenthesis and its matching
close parenthesis: fatal is true when r'fatal\s*:\s*true' matches, ignoreBOM when r'ignoreBOM\s*:\s*true' matches.
A strict-equivalent construction has fatal true and ignoreBOM not true. Scope: module level when the construction's
line has zero indentation (a top-level const), else inline. Second method: `git grep -c -E 'new[[:space:]]+(globalThis\.|util\.)?TextDecoder'`.
Usage: census.py <clone> <commit> <out.json>
"""
import json, re, subprocess, sys

EXT = ('.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs')
MENTION = re.compile(r'\bTextDecoder\b')
NEW = re.compile(r'new\s+(?:globalThis\.|util\.)?$')


def git(clone, *a, data=None):
    return subprocess.run(['git', '-C', clone, *a], input=data, capture_output=True, check=True).stdout


def matching_paren(text, i):
    depth = 0
    for j in range(i, len(text)):
        if text[j] == '(':
            depth += 1
        elif text[j] == ')':
            depth -= 1
            if depth == 0:
                return j
    return len(text)


def main():
    clone, commit, out = sys.argv[1:4]
    names = [n.decode() for n in git(clone, 'ls-tree', '-r', '-z', '--name-only', commit, '--', 'packages', 'apps', 'scripts').split(b'\0') if n]
    pop = [n for n in names if n.endswith(EXT) and '/dist/' not in n and '/node_modules/' not in n]
    rows, mentions = [], 0
    for path in pop:
        text = git(clone, 'show', f'{commit}:{path}').decode('utf-8', 'replace')
        lines = text.split('\n')
        offsets, acc = [], 0
        for line in lines:
            offsets.append(acc)
            acc += len(line) + 1
        for m in MENTION.finditer(text):
            ln = max(k for k, o in enumerate(offsets) if o <= m.start())
            if lines[ln].lstrip().startswith('//') or lines[ln].lstrip().startswith('*'):
                continue
            mentions += 1
            before = text[max(0, m.start() - 30):m.start()]
            if not NEW.search(before):
                continue
            p = text.find('(', m.end())
            args = text[p:matching_paren(text, p) + 1] if p != -1 and p - m.end() < 3 else ''
            fatal = bool(re.search(r'fatal\s*:\s*true', args))
            bom = bool(re.search(r'ignoreBOM\s*:\s*true', args))
            fatal_false = bool(re.search(r'fatal\s*:\s*false', args))
            test = bool(re.search(r'\.test\.|\.spec\.|/test/|testkit|/fixtures/', path))
            rows.append({'path': path, 'line': ln + 1, 'test': test, 'moduleLevel': not lines[ln][:1].isspace(),
                         'fatal': fatal, 'fatalFalse': fatal_false, 'ignoreBOM': bom, 'strictEquivalent': fatal and not bom,
                         'text': lines[ln].strip()[:160]})
    # method 2
    r = subprocess.run(['git', '-C', clone, 'grep', '-c', '-E', r'new[[:space:]]+(globalThis\.|util\.)?TextDecoder', commit, '--', 'packages', 'apps', 'scripts'], capture_output=True, text=True)
    m2 = {}
    for line in r.stdout.split('\n'):
        if line:
            _, path, count = line.split(':')
            if path.endswith(EXT) and '/dist/' not in path:
                m2[path] = int(count)
    m1 = {}
    for row in rows:
        m1[row['path']] = m1.get(row['path'], 0) + 1
    summary = {
        'commit': commit, 'population': len(pop), 'mentionsOutsideCommentLines': mentions,
        'constructions': len(rows), 'filesWithAConstruction': len(m1),
        'production': sum(1 for r in rows if not r['test']), 'test': sum(1 for r in rows if r['test']),
        'productionStrictEquivalent': sum(1 for r in rows if not r['test'] and r['strictEquivalent']),
        'productionStrictEquivalentModuleLevel': sum(1 for r in rows if not r['test'] and r['strictEquivalent'] and r['moduleLevel']),
        'productionFatalWithIgnoreBOM': sum(1 for r in rows if not r['test'] and r['fatal'] and r['ignoreBOM']),
        'productionFatalFalse': sum(1 for r in rows if not r['test'] and r['fatalFalse']),
        'productionDefault': sum(1 for r in rows if not r['test'] and not r['fatal'] and not r['fatalFalse']),
        'method2Constructions': sum(m2.values()), 'method2Files': len(m2), 'methodsAgree': m1 == m2,
    }
    json.dump({'summary': summary, 'rows': rows, 'method2': m2}, open(out, 'w'), indent=1)
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
