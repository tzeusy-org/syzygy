"""Builds @syzygy/support under some of r2_mutants.py's surviving rows and loads what it emits, so a survivor's reach is observed.

Usage: python3 -I build_probe.py <clone with node_modules> <out.json> <tmpdir>

For each row: applies its edits with the lane's apply/restore, runs `tsc -p packages/support` with --outDir and --tsBuildInfoFile
in <tmpdir> (the clone's dist/ is untouched), records the exit and the TS error codes, then imports the emitted index.js in a fresh
Node and records its export names and what each probe expression returns. Restores every edit and records `git status` after.
"""
import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys

clone, out_path, tmpdir = sys.argv[1:4]
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('r2', os.path.join(here, 'r2_mutants.py'))
sys.argv = [sys.argv[0], clone, os.devnull, tmpdir, 'absent', 'mine']
r2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r2)
by_id = {row[0]: row for row in r2.MINE}

PROBES = {
    'V0-unmutated': 'Object.keys(m).sort()',
    'V6-export-star-inside-a-nested-declare-module-block': 'Object.keys(m).sort()',
    'V7-import-equals-require-with-a-space': 'Object.keys(m).sort()',
    'V8-local-re-export-of-createHash': "[Object.keys(m).sort(), typeof m.createHash, m.createHash && m.createHash('sha256').update('a').digest('hex').slice(0, 8)]",
    'V9-literal-dynamic-import-of-node-crypto-with-a-space': '[Object.keys(m).sort(), typeof (await m.value()).randomUUID, (await m.value()).randomUUID() !== (await m.value()).randomUUID()]',
    'W5V12-x-forms-dropped-plus-a-tsx-export-star': "[Object.keys(m).sort().length, typeof m.randomUUID]",
}


def main():
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    assert git('status', '--porcelain') == ''
    rows = []
    for rid, probe in PROBES.items():
        edits = by_id[rid][2]
        out = os.path.join(tmpdir, 'out')
        shutil.rmtree(out, ignore_errors=True)
        undo = r2.lane.apply(clone, edits)
        try:
            tsc = subprocess.run(['npx', 'tsc', '-p', 'packages/support/tsconfig.json', '--outDir', out, '--tsBuildInfoFile',
                                  os.path.join(out, '.tsbuildinfo')], cwd=clone, capture_output=True, text=True, env=dict(os.environ, TMPDIR=tmpdir))
        finally:
            r2.lane.restore(undo)
        emitted = sorted(f for f in os.listdir(out) if f.endswith('.js') and '.test.' not in f) if os.path.isdir(out) else []
        index = open(os.path.join(out, 'index.js')).read() if os.path.exists(os.path.join(out, 'index.js')) else None
        loaded = None
        if index is not None:
            script = f"const m = await import({json.dumps(os.path.join(out, 'index.js'))}); console.log(JSON.stringify({probe}));"
            node = subprocess.run(['node', '--input-type=module', '-e', script], capture_output=True, text=True)
            loaded = {'exit': node.returncode, 'stdout': node.stdout.strip(), 'stderr': node.stderr.strip()[:400]}
        rows.append({'id': rid, 'edits': edits, 'tscExit': tsc.returncode, 'tsErrors': sorted(set(re.findall(r'error (TS\d+)', tsc.stdout))),
                     'tscFirstLines': tsc.stdout.strip().splitlines()[:4], 'emittedJs': emitted, 'indexJs': index, 'probe': probe, 'loaded': loaded})
        print(rid, 'tsc', tsc.returncode, rows[-1]['tsErrors'], emitted, loaded, flush=True)
    shutil.rmtree(os.path.join(tmpdir, 'out'), ignore_errors=True)
    status = git('status', '--porcelain')
    json.dump({'commit': git('rev-parse', 'HEAD').strip(), 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
               'statusAfter': status, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('status after', repr(status))


if __name__ == '__main__':
    main()
