"""R-GP-IMPL-OBSERVER-GATE-2: is each round-1 replacement text present verbatim at the reviewed commit?
Usage: python3 -I exact_texts.py <round-1 raw> <PR body file> <clone> <commit>"""
import json, re, subprocess, sys

raw, body, clone, commit = sys.argv[1:5]
lines = open(raw, encoding='utf-8').read().split('\n')
body_text = open(body, encoding='utf-8').read()
test = subprocess.run(['git', '-C', clone, 'show', f'{commit}:apps/three-surface-poc/src/git-observation.test.ts'], capture_output=True, text=True, check=True).stdout
def span(line):  # the raw line's backtick span, unescaped
    m = re.search(r'`(.*)`\s*$', line)
    return m.group(1).replace('\\`', '`')
checks = []
# F1 body: raw l.221 (1-based) is the replacement bullet
f1_body = span(lines[220]); checks.append(('F1 body bullet', 'body', f1_body in body_text))
f1_old = span(lines[218]); checks.append(('F1 old body bullet absent', 'body', f1_old not in body_text))
# F1 test comment: raw l.230-233 inside the second fence, which sits in a list item indented 4 columns
f1_test = '\n'.join(l[4:] for l in lines[229:233]); checks.append(('F1 test comment', 'test', f1_test in test))
f1_test_old = '\n'.join(l[4:] for l in lines[223:226]); checks.append(('F1 old test comment absent', 'test', f1_test_old not in test))
# N1: raw l.244 `... with `...``
m = re.search(r'with `(.*)`\s*$', lines[243]); n1 = m.group(1); checks.append(('N1 class sentence', 'body', n1 in body_text))
# N2: code line raw l.260, comment sentence raw l.262-263
n2_code = lines[259]; checks.append(('N2 assertion line', 'test', n2_code in test.split('\n')))
m = re.search(r'to "(.*)', lines[261] + ' ' + lines[262].strip()); n2_sentence = m.group(1).rsplit('"', 1)[0]
checks.append(('N2 comment sentence', 'test', n2_sentence in re.sub(r'\n\s*// ', ' ', test)))
# N3: `docs/${dir}/a.ts` after `${dir}x/a.ts`, and 61
checks.append(('N3 probe', 'test', "`${dir}x/a.ts`, `docs/${dir}/a.ts`]" in test))
checks.append(('N3 length 61', 'test', 'toHaveLength(61)' in test and 'toHaveLength(49)' not in test))
# N5: raw l.301 mapping
m = re.search(r'Map each mismatch to\s*`` (.*) `` before', lines[299] + '\n' + lines[300]); n5 = m.group(1); checks.append(('N5 mapping', 'test', n5 in test))
for name, where, ok in checks:
    print(json.dumps({'check': name, 'in': where, 'verbatim': ok}))
print(json.dumps({'texts': {'F1 body': f1_body, 'N1': n1, 'N2 code': n2_code, 'N2 sentence': n2_sentence, 'N5': n5}}, ensure_ascii=False))
