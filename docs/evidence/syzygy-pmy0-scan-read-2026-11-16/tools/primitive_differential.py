"""Old-versus-new stat reader and scan-row differential.

1. Byte corpus: every crafted stat body is written to a private file and read
   by both read_stat_text implementations, then parsed by old identity()'s
   lineage fields and new lineage(); results or (exception class, message)
   must match exactly.
2. Live host: every /proc PID is read by old and new identity(pid,
   with_namespace=False) back to back; mismatches are re-read once to
   separate races (start or presence changed) from reader differences. The
   new process_names() listing is compared with Path('/proc').iterdir().
3. Full scans: old and new descendants() on the live host for this process.
"""
import hashlib
import itertools
import json
import os
import random
import runpy
import sys
import tempfile
import time

old = runpy.run_path(sys.argv[1])
new = runpy.run_path(sys.argv[2])


def outcome(fn, *args):
    try:
        return ['value', fn(*args)]
    except Exception as error:  # noqa: BLE001 - the outcome is the datum
        return ['error', type(error).__name__, str(error)]


def old_row(read, path):
    text = read(path)
    fields = text[text.rfind(')') + 2:].split(None, 20)
    return (fields[19], int(fields[1]), fields[0])


def bodies(rng):
    base = ['S', '123'] + ['0'] * 17 + ['4242'] + ['7'] * 30
    comms = [b'n', b'a b', b'a)b', b'a) b (c', b')', b'((', b'x\r\ny', b'x\ry', b'\xff\xfe', b'\xc3\xa9',
             b'\xe2\x82', b'tab\tname', b'nl\nname', b'\x00', b'\xa0', b' ', b'']
    seps = [b' ', b'\t', b'\n', b'\r\n', b'\r', b'  ', ' '.encode()]
    tails = [b'', b'\n', b'\r\n', b' extra', b'\xff', b'\r']
    for comm, sep, tail in itertools.product(comms, seps, tails):
        yield b'999 (' + comm + b') ' + sep.join(x.encode() for x in base) + tail
    for n in range(0, 25):  # truncated field counts
        yield b'999 (n) ' + b' '.join(x.encode() for x in base[:n])
    yield b''
    yield b'no paren at all 1 2 3'
    yield b'999 (n) S notanint ' + b' '.join(b'0' for _ in range(30))
    yield b'999 (n) S 123 ' + b'0 ' * 17 + b'\xff\xfe ' + b'0 ' * 5
    yield b'999 (n) S 123 ' + b'0 ' * 5000  # longer than one 4096-byte read
    for _ in range(3000):
        length = rng.randint(0, 400)
        yield bytes(rng.choice(b'0123456789 ()\t\n\rSZ\xff\xc3\xa9ab') for _ in range(length))


def main():
    rng = random.Random(20261116)
    report = {'old': sys.argv[1], 'new': sys.argv[2],
              'oldSha256': hashlib.sha256(open(sys.argv[1], 'rb').read()).hexdigest(),
              'newSha256': hashlib.sha256(open(sys.argv[2], 'rb').read()).hexdigest(),
              'python': sys.version, 'textEncoding': __import__('io').text_encoding(None),
              'seed': 20261116}
    mismatches = []
    text_only = 0
    count = 0
    outcomes = {}
    with tempfile.TemporaryDirectory() as directory:
        path = os.path.join(directory, 'stat')
        for body in bodies(rng):
            with open(path, 'wb') as stream:
                stream.write(body)
            count += 1
            a = outcome(old['read_stat_text'], path)
            b = outcome(new['read_stat_text'], path)
            c = outcome(old_row, old['read_stat_text'], path)
            d = outcome(old_row, new['read_stat_text'], path)
            kind = c[0] if c[0] == 'value' else c[1]
            outcomes[kind] = outcomes.get(kind, 0) + 1
            if c != d:
                mismatches.append({'body': body.hex(), 'old': c, 'new': d})
            if a != b:
                text_only += 1
                # Text differs only where text mode translates newlines.
                assert a[0] == b[0] == 'value' and a[1] == b[1].replace('\r\n', '\n').replace('\r', '\n'), body
    report['byteCorpus'] = {'cases': count, 'mismatches': len(mismatches), 'samples': mismatches[:5],
                            'rowOutcomes': outcomes, 'textOnlyNewlineTranslation': text_only}
    # A missing file: both raise FileNotFoundError with the same message.
    missing = '/proc/999999999/stat'
    report['missing'] = [outcome(old['read_stat_text'], missing), outcome(new['read_stat_text'], missing)]
    report['missingEqual'] = report['missing'][0] == report['missing'][1]

    # Live host rows.
    pids = [int(n) for n in os.listdir('/proc') if n.isdigit()]
    live = {'pids': len(pids), 'equal': 0, 'raced': 0, 'readerDifferences': []}
    for pid in pids:
        a = old['identity'](pid, with_namespace=False)
        b = new['identity'](pid, with_namespace=False)
        # The state field (index 3) changes between any two reads of a busy
        # process; the byte corpus above checks its parsing exactly.
        if a is not None and b is not None and a[3] != b[3]:
            live['stateFlips'] = live.get('stateFlips', 0) + 1
        strip = lambda row: row and row[:3] + row[4:]
        if strip(a) == strip(b):
            live['equal'] += 1
            continue
        again = new['identity'](pid, with_namespace=False), old['identity'](pid, with_namespace=False)
        # A race (exit, reuse, a state flip such as R to S) settles on the
        # re-read: both readers then agree. A reader difference persists.
        if strip(again[0]) == strip(again[1]):
            live['raced'] += 1
        else:
            live['readerDifferences'].append({'pid': pid, 'old': a, 'new': b})
    report['live'] = live
    from pathlib import Path
    # Mechanism equivalence on a directory nothing else changes: scandir
    # names against Path.iterdir names, as sets and in order.
    with tempfile.TemporaryDirectory() as directory:
        for index in range(5000):
            open(os.path.join(directory, str(rng.randint(1, 4194304))), 'w').close()
        scanned = [entry.name for entry in os.scandir(directory)]
        iterated = [path.name for path in Path(directory).iterdir()]
        report['stableListing'] = {'entries': len(scanned), 'sameOrder': scanned == iterated,
                                   'sameSet': sorted(scanned) == sorted(iterated)}
    listings = []
    for _ in range(5):
        listings.append((sorted(new['process_names']()), sorted(p.name for p in Path('/proc').iterdir())))
    report['listing'] = {'attempts': len(listings), 'equalSets': sum(a == b for a, b in listings),
                         'symmetricDifferenceSizes': [len(set(a) ^ set(b)) for a, b in listings],
                         'entries': len(listings[-1][0])}

    # Whole scans for this process (no family): equal results and timing.
    timings = {}
    for side, module in (('old', old), ('new', new)):
        best = None
        for _ in range(7):
            start = time.perf_counter()
            module['descendants']()
            elapsed = time.perf_counter() - start
            best = elapsed if best is None else min(best, elapsed)
        timings[side] = best
    report['scanSecondsBestOf7'] = timings
    report['scanPids'] = sum(n.isdigit() for n in os.listdir('/proc'))
    print(json.dumps(report, indent=1, default=str))


if __name__ == '__main__':
    main()
