"""Rule-6 mutants for syzygy-pmy0: one predicate each, run against the startup
lifetime case (which executes every fixture guardian control). A mutant is
killed only when the run fails AND its log carries the expected marker."""
import json
import subprocess
import sys
import time
from pathlib import Path

W = Path(sys.argv[1])  # a clean checkout of the subject commit
OUT = Path(sys.argv[2])
G = 'scripts/poc_browser_lifetime.py'
MUTANTS = [
    ('single-read', G, '        while chunk := os.read(fd, 4096):\n            chunks.append(chunk)\n',
     '        chunks.append(os.read(fd, 4096))\n', 'truncated stat'),
    ('decode-replace', G, "return b''.join(chunks).decode(locale.getencoding() if encoding == 'locale' else encoding)",
     "return b''.join(chunks).decode(locale.getencoding() if encoding == 'locale' else encoding, 'replace')",
     'accepted an undecodable stat body'),
    ('decode-fixed-utf8', G, "return b''.join(chunks).decode(locale.getencoding() if encoding == 'locale' else encoding)",
     "return b''.join(chunks).decode('utf-8')", 'decoded stat with another codec than the locale'),
    ('warning-after-open', G, "    encoding = io.text_encoding(None)\n    fd = os.open(path, os.O_RDONLY)\n",
     "    fd = os.open(path, os.O_RDONLY)\n    encoding = io.text_encoding(None)\n", 'stat opened before decoder warning'),
    ('descriptor-left-open', G, '    finally:\n        os.close(fd)\n    return b',
     '    finally:\n        pass\n    return b', 'guardian left a stat descriptor open'),
    ('keeps-vanished-row', G, "        owner = os.stat(directory).st_uid\n",
     "        try:\n            owner = os.stat(directory).st_uid\n        except FileNotFoundError:\n            owner = None\n",
     'kept a row that vanished after its read'),
    ('identity-drops-read-exit', G, "                owner, namespace)\n    except (FileNotFoundError, ProcessLookupError):",
     "                owner, namespace)\n    except FileNotFoundError:", 'process exited during'),
    ('listing-empty', G, "        return [entry.name for entry in entries]", "        return []",
     'guardian-scan-reused accepted a reused owned PID'),
    ('scan-skips-reverification', G, "                    if current[:2] != row[:2]:\n                        raise RuntimeError('private Chrome descendant identity changed during scan')",
     "                    if False:\n                        raise RuntimeError('private Chrome descendant identity changed during scan')",
     'guardian-scan-reused accepted a reused owned PID'),
    ('scan-uses-wrong-parent', G, "                 if row[2] in owned and pid not in owned}",
     "                 if row[1] in owned and pid not in owned}", 'guardian-scan-reused accepted a reused owned PID'),
]


def run(label):
    start = time.monotonic()
    result = subprocess.run(['npx', 'vitest', 'run', '--project', 'e2e',
                             'apps/three-surface-poc/src/cdp-browser.browser.test.ts',
                             '-t', 'reaps children after failed endpoint'], cwd=W, capture_output=True, text=True)
    log = OUT / f'{label}.log'
    log.write_text(result.stdout + result.stderr)
    return result.returncode, time.monotonic() - start, log


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=W, capture_output=True, text=True).stdout.strip()
    assert not subprocess.run(['git', 'status', '--porcelain'], cwd=W, capture_output=True, text=True).stdout
    records = []
    code, seconds, log = run('control')
    records.append({'id': 'control', 'exitCode': code, 'seconds': seconds, 'log': log.name})
    assert code == 0, 'unmutated control failed'
    for label, path, old, new, marker in MUTANTS:
        target = W / path
        source = target.read_text()
        assert source.count(old) == 1, label
        target.write_text(source.replace(old, new))
        try:
            code, seconds, log = run(label)
        finally:
            subprocess.run(['git', 'checkout', '--', path], cwd=W, check=True)
        text = log.read_text()
        records.append({'id': label, 'file': path, 'old': old, 'new': new, 'expectedMarker': marker,
                        'exitCode': code, 'markerFound': marker in text, 'seconds': seconds,
                        'killed': code != 0 and marker in text, 'log': log.name})
        print(label, code, marker in text, flush=True)
    assert not subprocess.run(['git', 'status', '--porcelain'], cwd=W, capture_output=True, text=True).stdout
    print(json.dumps({'commit': head, 'mutants': len(MUTANTS),
                      'killed': sum(r.get('killed', False) for r in records), 'records': records}, indent=1),
          file=open(OUT / 'mutation-result.json', 'w'))


if __name__ == '__main__':
    main()
