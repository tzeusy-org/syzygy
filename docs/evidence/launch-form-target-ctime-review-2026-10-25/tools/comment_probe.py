"""R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1: does each call the new launched.test.ts:34-37 comment names move a regular file's change time,
when the file's change time was queried just before (as the snapshot's own lstat/stat query it)? ROUNDS rounds per kind, each on a fresh
file of 2 bytes under the directory given. Prints one JSON object: per kind, how many rounds left st_ctime_ns unchanged.
Usage: python3 -I comment_probe.py <private dir> [rounds]"""
import json, os, sys

DIR, ROUNDS = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 200


def fresh(i, kind):
    p = os.path.join(DIR, f'{kind}-{i}')
    with open(p, 'wb') as f:
        f.write(b'{}')
    os.chmod(p, 0o600)
    return p


def write_zero(p):
    fd = os.open(p, os.O_WRONLY)
    try:
        os.write(fd, b'')
    finally:
        os.close(fd)


def ftruncate_same(p):
    fd = os.open(p, os.O_WRONLY)
    try:
        os.ftruncate(fd, os.fstat(fd).st_size)
    finally:
        os.close(fd)


def write_same_bytes(p):
    fd = os.open(p, os.O_WRONLY)
    try:
        os.write(fd, b'{}')
    finally:
        os.close(fd)


KINDS = {
    'read (control)': lambda p: open(p, 'rb').read(),
    'write(2) of zero bytes': write_zero,
    'write(2) of the same 2 bytes at offset 0': write_same_bytes,
    'truncate(2) by path to the current size': lambda p: os.truncate(p, os.stat(p).st_size),
    'ftruncate(2) to the current size': ftruncate_same,
    'chmod to the current mode': lambda p: os.chmod(p, 0o600),
    'rename(2) onto its own name': lambda p: os.rename(p, p),
    'rename away and back': lambda p: (os.rename(p, p + '.away'), os.rename(p + '.away', p)),
    'link(2) then unlink the new name': lambda p: (os.link(p, p + '.h'), os.unlink(p + '.h')),
}
out = {'kernel': os.uname().release, 'dir': DIR, 'rounds': ROUNDS, 'unchangedCtime': {}}
for kind, act in KINDS.items():
    unchanged = 0
    for i in range(ROUNDS):
        p = fresh(i, ''.join(c for c in kind if c.isalnum())[:24])
        before = os.lstat(p).st_ctime_ns  # the query, as the snapshot's lstat makes one
        act(p)
        after = os.lstat(p).st_ctime_ns
        unchanged += before == after
        os.unlink(p)
    out['unchangedCtime'][kind] = unchanged
print(json.dumps(out))
