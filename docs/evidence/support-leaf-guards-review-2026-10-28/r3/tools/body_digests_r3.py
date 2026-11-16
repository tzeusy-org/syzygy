#!/usr/bin/env python3
"""Round 3: re-derive every subject digest, file count and line count the PR body's Evidence section states, and the
summary.json digest, at the commits it names.

Usage: body_digests_r3.py <clone> <out.json>
"""
import hashlib, json, subprocess, sys

clone, out = sys.argv[1:3]
CLAIMS = [
    (['5995aa3c', 'ecea355b'], '00a785f11fddd491890552cb6a22146999eac3215b8635fe1110f0288580f29d', 20, None),
    (['5995aa3c', '62499514', '--', 'packages'], '021461957853407a6d92231dfc880d2cf606f17736c6065c74915489b2aaeb76', 2, (70, 4)),
    (['ecea355b', '12d70cf0'], '0650f7548a0bfbe68125ff6f5efc2d6e9ae571f07aef151c6570554ab52efd8a', 16, None),
    (['ecea355b', '191d8277', '--', 'packages'], 'd95e031335212eedb74664ee626a2b9662595388bbedae8dd168c8c0ec2d2ec5', 1, (2, 2)),
    (['f7ea8584', '191d8277', '--', 'packages'], '51007db45933713ea885676c820b3c393a462d20f1320f496733c99d3688c2a0', 4, (258, 50)),
    (['f7ea8584', '12d70cf0'], '26320855927ecc092c4f4f8d6ee9ce9c652ca0935ad248242705e17d097f5225', 30, None),
]


def git(*args, text=False):
    return subprocess.run(['git', '-C', clone, *args], capture_output=True, check=True, text=text).stdout


res = []
for args, digest, files, lines in CLAIMS:
    raw = git('diff', *args)
    numstat = [l.split('\t') for l in git('diff', '--numstat', *args, text=True).splitlines()]
    plus = sum(int(a) for a, b, _ in numstat if a != '-')
    minus = sum(int(b) for a, b, _ in numstat if b != '-')
    got = hashlib.sha256(raw).hexdigest()
    res.append({'diff': ' '.join(args), 'sha256': got, 'digestMatches': got == digest, 'files': len(numstat), 'filesMatch': len(numstat) == files,
                'plusMinus': [plus, minus], 'linesMatch': lines is None or (plus, minus) == lines})
summary = git('show', '12d70cf0:docs/evidence/syzygy-bpyt-6-14/summary.json')
res.append({'summary.json@12d70cf0': hashlib.sha256(summary).hexdigest(),
            'matches': hashlib.sha256(summary).hexdigest() == '2a23954833add12c07b4cd56015b7a3d4bfe1b777ea4f5f43544c47f1a7c4910'})
json.dump(res, open(out, 'w'), indent=2)
print(json.dumps(res, indent=2))
