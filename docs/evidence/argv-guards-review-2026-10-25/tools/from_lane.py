"""rev-524: convert the lane's mutants.json (read from a git object) into mut.py specs. Only the edits are taken; the command is
reduced to its --project and file arguments (the lane's TMPDIR is replaced by mut.py's own).

Usage: python3 -I from_lane.py <lane mutants.json> <out.json>
"""
import json, shlex, sys

lane = json.load(open(sys.argv[1]))
out = []
for spec in lane['controls'] + lane['mutants']:
    words = shlex.split(spec['command'])
    words = words[words.index('run') + 1:]
    projects, files = [], []
    i = 0
    while i < len(words):
        if words[i] == '--project':
            projects.append(words[i + 1])
            i += 2
        else:
            files.append(words[i])
            i += 1
    out.append({'id': spec['id'], 'family': spec['family'], 'laneExpect': spec['expect'], 'edits': spec['edits'], 'projects': projects,
                'files': files})
json.dump({'mutants': out}, open(sys.argv[2], 'w'), indent=1, ensure_ascii=False)
print(len(out), 'specs')
