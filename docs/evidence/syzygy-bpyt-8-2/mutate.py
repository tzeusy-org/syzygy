"""syzygy-bpyt.8.2: apply one mutant (each old fragment must occur exactly once in its file), run one shell command, restore every
file byte for byte, and print the command's exit and the first line of each failed test. Usage: mutate.py <tree> <mutant.json> <log>
mutant.json: {"id": ..., "edits": [{"file": ..., "old": ..., "new": ...}], "command": ...}"""
import json, os, re, subprocess, sys

tree, mutant_file, log = sys.argv[1:4]
mutant = json.load(open(mutant_file))
originals = {}
try:
    for edit in mutant['edits']:
        path = os.path.join(tree, edit['file'])
        if path not in originals:
            originals[path] = open(path, 'rb').read()
        text = open(path).read()
        assert text.count(edit['old']) == 1, (edit['file'], text.count(edit['old']), edit['old'][:80])
        open(path, 'w').write(text.replace(edit['old'], edit['new']))
    done = subprocess.run(mutant['command'], shell=True, cwd=tree, capture_output=True, text=True, timeout=590)
finally:
    for path, data in originals.items():
        open(path, 'wb').write(data)
open(log, 'w').write(done.stdout + done.stderr)
plain = re.sub(r'\x1b\[[0-9;]*m', '', done.stdout + done.stderr)
failed = [line.strip() for line in plain.split('\n') if re.match(r'\s*(×|FAIL)\s', line)]
errors = [line.strip() for line in plain.split('\n') if re.match(r'\s*(AssertionError|Error|TypeError):', line)]
print(json.dumps({'id': mutant['id'], 'exit': done.returncode, 'failed': failed[:20], 'firstErrors': errors[:5]}))
