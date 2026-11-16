"""rev-541c: T5, a REPAIR1-to-HEAD line inside the doc comment's span that lacks the ` * ` prefix (simulated through the hook), run
on record.py as is and with the late check's prefix test dropped (S4), to show which predicate kills it.
Usage: python3 -I record_t5_r3.py <clone> <work dir>
"""
import os, subprocess, sys
clone, work = (os.path.realpath(a) for a in sys.argv[1:3])
os.makedirs(work, exist_ok=True)
src = open(os.path.join(clone, 'docs/evidence/syzygy-bpyt-8-39/record.py')).read()
def once(t, o, n):
    assert t.count(o) == 1, o[:50]
    return t.replace(o, n)
t5 = "\n    'rev541c T5': {f'@lines {KIT} {REPAIR1[:8]}': lambda lines: [*lines, ['+', 70, 'const X = 1;']]},\n}\n\n\ndef main():"
s4 = ("or not re.match(r' \\* ', text)\n                                         for s, n, text in late)",
      "or False\n                                         for s, n, text in late)")
for name, text in (('T5', once(src, "\n}\n\n\ndef main():", t5)), ('T5+S4', once(once(src, "\n}\n\n\ndef main():", t5), *s4))):
    path = os.path.join(work, name.replace('+', '_') + '.py')
    open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, clone, '--selftest'], capture_output=True, text=True)
    print(name, 'exit', r.returncode, [l for l in r.stdout.splitlines() if 'rev541c T5' in l], r.stdout.splitlines()[-1])
