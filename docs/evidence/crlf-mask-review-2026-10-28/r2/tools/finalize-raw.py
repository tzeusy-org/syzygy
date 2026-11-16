"""Fills the raw's placeholders from the result files, so every quoted failure line is copied, not typed: a raw separator in a
label becomes <U+XXXX>, every other character is kept. Also repairs the escapes the Write tool turned into raw separators, checks
the proposed test against general-pin.py's, and appends the kept-file table. Usage (in rev-544-r2/): python3 -I tools/finalize-raw.py
<draft> <out> <battery end HH:MM:SS> <battery load> <battery summary> <battery verdict> <battery tmp note>"""
import hashlib, json, os, re, sys
draft, out, b_end, b_load, b_summary, b_verdict, b_tmp = sys.argv[1:8]
s = open(draft, encoding='utf8').read()
BS = chr(92)
SEP = {chr(0x2028): '<U+2028>', chr(0x2029): '<U+2029>', chr(0x85): '<U+0085>'}
def clean(m):
    return ''.join(SEP.get(c, c) for c in m)
lane = {r['id'].split('-')[0]: r for r in json.load(open('lane-mutants-rerun.json'))['rows']}
mine = {r['id'].split('-')[0]: r for r in json.load(open('reviewer-mutants-r2-out.json'))['rows']}
def lane_q(k):
    fails = [f for v in lane[k]['detectors'].values() for f in v['firstFailed']]
    assert len(fails) == 1, k
    return '"' + clean(fails[0]['error']) + '"'
def mine_q(k):
    return '"' + clean(mine[k]['failures'][0]['error']) + '"'
subs = {f'{{{{Q_{k}}}}}': lane_q(k) for k in ('MU17', 'MU18', 'MU19', 'MU20', 'MU21')}
subs.update({f'{{{{Q_{k}}}}}': mine_q(k) for k in ('RW1', 'RW6', 'RW7', 'RW8', 'RW11', 'RW12')})
subs.update({'{{BATTERY_END}}': b_end, '{{BATTERY_LOAD}}': b_load, '{{BATTERY_SUMMARY}}': b_summary, '{{BATTERY_VERDICT}}': b_verdict, '{{BATTERY_TMP}}': b_tmp})
# The Write tool turned typed backslash-u escapes into raw separators; put the escape text back where it was meant.
s = s.replace(chr(0x2028) + chr(0x2029) + ']', BS + 'u2028' + BS + 'u2029]')
s = s.replace("'a   " + chr(0x2028) + "   d'", "'a   " + BS + "u2028   d'")
for k, v in subs.items():
    assert s.count(k) == 1, k
    s = s.replace(k, v)
# The proposed test in N1 must equal the one general-pin.py ran.
tool = open('tools/general-pin.py', encoding='utf8').read()
cand = re.search(r'CANDIDATE = """\n(.*?)"""', tool, re.S).group(1).replace(BS + BS, BS)
block = re.search(r'```ts\n(.*?)```', s, re.S).group(1)
block = ''.join(l[2:] if l.startswith('  ') else l for l in block.splitlines(True))
assert block == cand, 'the proposed test differs from the one run'
kept = []
for root, _, files in os.walk('.'):
    for f in files:
        p = os.path.relpath(os.path.join(root, f), '.')
        if p.startswith(('clone/', 'base/', 'battery')) or p in (out, draft) or p.endswith('.md'):
            continue
        b = open(p, 'rb').read()
        assert len(b) <= 300 * 1024, p
        assert b.decode('utf8').count(chr(0xa0)) == 0, p
        kept.append((p, hashlib.sha256(b).hexdigest()))
table = '| Kept file, relative to rev-544-r2/ | sha256 |\n|---|---|\n' + ''.join(f'| `{p}` | `{h}` |\n' for p, h in sorted(kept))
s = s.replace('{{KEPT_TABLE}}\n', table)
assert '{{' not in s, re.findall(r'\{\{[A-Z_0-9]+\}\}', s)
assert s.count(chr(0xa0)) == 0 and chr(0x2028) not in s and chr(0x2029) not in s and chr(0x85) not in s
open(out, 'w', encoding='utf8').write(s)
print('kept', len(kept), 'bytes', len(s.encode('utf8')))
