#!/usr/bin/env python3
"""Compare the dists `scripts/clean_build.mjs` removes with the projects `tsc -b` builds, for one npm build script.

Usage: closure_check.py <checkout> <script name>
Plants a sentinel file in a dist of every apps/* and packages/* directory, runs `npm run <script>`, and reports which
sentinels are gone, beside tsc's own `--dry -v` "Projects in this build" list for the same project arguments.
"""
import json, os, re, subprocess, sys

root, script = os.path.abspath(sys.argv[1]), sys.argv[2]
command = json.load(open(os.path.join(root, 'package.json')))['scripts'][script]
args = command.split('clean_build.mjs ', 1)[1].split()
dirs = [f'{p}/{d}' for p in ('apps', 'packages') for d in sorted(os.listdir(os.path.join(root, p)))]
for d in dirs:
    os.makedirs(os.path.join(root, d, 'dist'), exist_ok=True)
    open(os.path.join(root, d, 'dist', 'SENTINEL-r549'), 'w').write('x')
dry = subprocess.run([os.path.join(root, 'node_modules/.bin/tsc'), '-b', '--dry', '-v', *args], cwd=root, capture_output=True, text=True).stdout
listed = re.search(r'Projects in this build: \n((?:    \* .*\n)+)', dry)
tsc_projects = sorted(line.strip()[2:-len('/tsconfig.json')] for line in listed.group(1).splitlines())
run = subprocess.run(['npm', 'run', script, '--silent'], cwd=root, capture_output=True, text=True)
removed = sorted(d for d in dirs if not os.path.exists(os.path.join(root, d, 'dist', 'SENTINEL-r549')))
for d in dirs:
    p = os.path.join(root, d, 'dist', 'SENTINEL-r549')
    if os.path.exists(p):
        os.remove(p)
    if os.path.isdir(os.path.join(root, d, 'dist')) and not os.listdir(os.path.join(root, d, 'dist')):
        os.rmdir(os.path.join(root, d, 'dist'))
print(json.dumps({'script': script, 'exit': run.returncode, 'tscBuilds': tsc_projects, 'cleanBuildRemoved': removed,
                  'equal': tsc_projects == removed}, indent=1))
