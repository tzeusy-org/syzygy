#!/usr/bin/env python3
"""Round-4 exactness check: apply round 3's F4 "What has to come out" list, item by item, to the e7f3c71e script, and compare the
result with the d6b04c5f script. Docstring paragraphs that the list edits mid-paragraph are compared after whitespace
normalisation (the list does not say how to re-wrap them); every code line is compared byte for byte. Then each "What stays" item
is located in the head by its exact bytes.

usage: check_exactness.py CLONE [HEAD_FILE]   (HEAD_FILE, for the rule-6 self-test, replaces the d6b04c5f bytes)"""
import difflib, re, subprocess, sys

clone = sys.argv[1]
show = lambda rev: subprocess.run(['git', '-C', clone, 'show', f'{rev}:scripts/measure_vitest_test_durations.py'], check=True,
                                  capture_output=True).stdout.decode('utf8')
old = show('e7f3c71e').split('\n')
head = (open(sys.argv[2], encoding='utf8').read() if len(sys.argv) > 2 else show('d6b04c5f')).split('\n')
L = lambda n: old[n - 1]          # 1-based, as round 3 numbers them


def edit(n, before, after):
    """Remove the literal `before` (which must occur exactly once in line n) and put `after` in its place."""
    assert L(n).count(before) == 1, (n, before, L(n))
    return L(n).replace(before, after)


items = []    # (id, what round 3 lists, old lines it covers, new text for them or None)
items.append(('1', "line 4's ` [--profile]`", [4], [edit(4, ' [--profile]', '')]))
items.append(('2', 'docstring lines 12-15 (the `--profile` paragraph), with its separating blank line 16', list(range(12, 17)), []))
items.append(('3', '"before instrumenting, " on line 19', [19], 'paragraph'))
items.append(('4', 'lines 25-26, the `git checkout` restore sentence (it starts on line 24)', [24, 25, 26], 'paragraph'))
items.append(('5', 'lines 28-29 become "It writes only OUT.json. A SIGKILL of the script itself can leave vitest running."', [28, 29],
              ['It writes only OUT.json. A SIGKILL of the script itself can leave vitest running."""']))
items.append(('6', '`KIT_OLD`, `KIT_NEW`, `FILE_OLD` and `FILE_NEW` (lines 39-50)', list(range(39, 51)), []))
items.append(('7', "`profile` and `'--profile' in args` on line 57", [57],
              [L(57).replace(", profile = ", " = ", 1).replace(", '--profile' in args", '', 1)]))
items.append(('8', '`instrument()` (lines 63-72), with its trailing blank line 73', list(range(63, 74)), []))
items.append(('9', '" and restored" in line 76\'s message', [76], [edit(76, ' and restored', '')]))
items.append(('10a', '`written` (line 109)', [109], [edit(109, 'written, proc, output = [], None, []', 'proc, output = None, []')]))
items.append(('10b', 'line 112', [112], []))
items.append(('11', "the inner `try`/`finally` and the `git checkout`, lines 120 and 122-123 (line 121's `end_group` call stays)",
              [120, 121, 122, 123], [L(121)[4:]]))
items.append(('12', "the `PROF` parse and `run['profile']` (lines 131-132 and 137)", [131, 132, 137], []))
items.append(('13', 'the `profile` and `instrumentation` keys of OUT.json (lines 147-148)', [147, 148],
              [edit(147, "'profile': profile, ", '')]))
items.append(('S-155', "stays: line 155's check, whose message \"tree not restored\" should be reworded", [155], None))

# item 4 is a sentence spread over lines 24-26: rebuild the paragraph text instead of line edits
para4_old = ' '.join(L(n) for n in (23, 24, 25, 26))
sentence = ("Then, even if ending the group raised, each instrumented file that was written is restored with `git checkout`, itself run in "
            "a session of its own so that a signal to the script's group cannot cut it short. ")
assert para4_old.count(sentence) == 1
para3_old = ' '.join(L(n) for n in range(17, 22))
assert para3_old.count('before instrumenting, ') == 1

expected = list(old)
covered = {}
for iid, what, lines, new in items:
    for n in lines: covered[n] = iid
for iid, what, lines, new in items:
    if new is None or new == 'paragraph': continue     # S-155 and the two mid-paragraph edits are handled below
    for k, n in enumerate(lines):
        expected[n - 1] = new[k] if k < len(new) else None
# 155: keep the code, take whatever message the head has, and report it
m_old = re.fullmatch(r"(if git\('status', '--porcelain', '--untracked-files=no'\): sys\.exit\(')(.*)('\))", L(155))
m_new = re.fullmatch(r"(if git\('status', '--porcelain', '--untracked-files=no'\): sys\.exit\(')(.*)('\))", head[-1] if head[-1] else head[-2])
print('S-155 code unchanged:', bool(m_old and m_new and m_old.group(1) == m_new.group(1) and m_old.group(3) == m_new.group(3)),
      '| old message', repr(m_old.group(2)), '| new message', repr(m_new.group(2)))
expected[155 - 1] = head[-1] if head[-1] else head[-2]

# paragraphs 3 and 4: normalise
norm = lambda s: ' '.join(s.split())
exp_p3 = norm(para3_old.replace('before instrumenting, ', ''))
exp_p4 = norm(para4_old.replace(sentence, ''))
for n in range(17, 22): expected[n - 1] = None
for n in range(23, 27): expected[n - 1] = None
expected[17 - 1], expected[23 - 1] = '<<P3>>', '<<P4>>'
expected = [x for x in expected if x is not None]

# split the head into the same shape: find its paragraphs that start 'Stopping:' and 'Cleanup,'
def take_para(lines, start_word):
    i = next(k for k, l in enumerate(lines) if l.startswith(start_word))
    j = i
    while lines[j + 1] != '': j += 1
    return i, j
h = list(head)
i3, j3 = take_para(h, 'Stopping:')
p3_head = norm(' '.join(h[i3:j3 + 1]))
i4, j4 = take_para(h, 'Cleanup,')
p4_head = norm(' '.join(h[i4:j4 + 1]))
h = h[:i3] + ['<<P3>>'] + h[j3 + 1:i4] + ['<<P4>>'] + h[j4 + 1:]
print('paragraph "Stopping:" equals the list applied (normalised):', p3_head == exp_p3)
print('paragraph "Cleanup,"  equals the list applied (normalised):', p4_head == exp_p4)
print('docstring line width, max: e7f3c71e lines 2-29', max(len(l) for l in old[1:29]), '| d6b04c5f lines 2-21', max(len(l) for l in head[1:21]))

diff = list(difflib.unified_diff(expected, h, 'expected (F4 list applied to e7f3c71e)', 'actual d6b04c5f', lineterm='', n=0))
print(f'expected lines {len(expected)}, actual lines {len(h)}; differences beyond the list: {"none" if not diff else len(diff)}')
for l in diff: print('   ', l)

# every removed or changed old line is covered by a list item
sm = difflib.SequenceMatcher(a=old, b=head, autojunk=False)
touched = sorted({n + 1 for tag, a1, a2, b1, b2 in sm.get_opcodes() if tag != 'equal' for n in range(a1, a2)})
uncovered = [n for n in touched if n not in covered and not (17 <= n <= 21 or 23 <= n <= 26)]
print(f'old lines removed or changed: {len(touched)} -> {touched}')
print('of them on neither list:', uncovered or 'none')

# "What stays": exact bytes present in head
stays = {
    'handlers (33-35)': old[32:35],
    'leave_if_stopped (74-75)': old[73:75],
    'leave_if_stopped (77-78)': old[76:78],
    'end_group (80-96)': old[79:96],
    'Popen, poll loop and finally (113-119)': old[112:119],
    'end_group call of line 121 (dedented one level)': [old[120][4:]],
    "line 61's clean-tree check": [old[60]],
    'TESTKIT (38)': [old[37]],
    'subject names TESTKIT (146)': [old[145]],
    'reader thread (115-116)': old[114:116],
    'line 127 `stdout = ...` (on neither list)': [old[126]],
}
text = '\n'.join(head)
for name, block in stays.items():
    present = '\n'.join(block) in text
    print(f'stays, present byte-equal in head: {present}  {name}')
print('leave_if_stopped message, head:', [l.strip() for l in head if 'stopped by' in l])
