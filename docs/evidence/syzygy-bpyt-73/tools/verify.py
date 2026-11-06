"""Task-specific real-child differential, output comparison and six mutations.

Run in the allocated private namespace with its host suite lock already held.
python3 <this file> {matrix,build-parity,mutants} --base <commit> --head <commit>
  --runtime-root <private root> --output <new directory>
Every attempt and full filesystem image is retained; no historical tool is run.
"""
import argparse
import base64
import datetime
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import time

SCRIPT = 'scripts/clean_build.mjs'
TEST = 'apps/three-surface-poc/src/product-build.test.ts'
HERE = Path(__file__).resolve().parent
CHECKOUT = Path.cwd()
SENTINELS = ['packages/a/dist/a.js', 'packages/a/types/a.d.ts', 'packages/b/dist/b.js',
             'packages/c/dist/c.js', 'packages/d/dist/d.js', 'tools/x/dist/x.js', 'outside/dist/control.js',
             '../outside/dist/control.js']
PROJECTS = [('packages/a', []), ('packages/b', ['../a']), ('packages/c', []),
            ('packages/d', ['../b']), ('tools/x', [])]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + '\n')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=CHECKOUT).decode().strip()


def attempt(command, cwd, out, timeout=300):
    out.mkdir(parents=True)
    started = datetime.datetime.now(datetime.timezone.utc).isoformat()
    tick = time.monotonic()
    with (out / 'stdout').open('xb') as stdout, (out / 'stderr').open('xb') as stderr:
        try:
            done = subprocess.run(command, cwd=cwd, stdout=stdout, stderr=stderr, timeout=timeout)
            code, timed_out = done.returncode, False
        except subprocess.TimeoutExpired:
            code, timed_out = None, True
    row = {'argv': list(map(str, command)), 'cwd': str(cwd), 'startedAt': started,
           'elapsedSeconds': time.monotonic() - tick, 'exit': code, 'timedOut': timed_out,
           'stdoutSha256': digest((out / 'stdout').read_bytes()),
           'stderrSha256': digest((out / 'stderr').read_bytes())}
    save(out / 'ATTEMPT.json', row)
    if timed_out:
        raise RuntimeError(f'fixture timeout preserved at {out}; not a mutant kill')
    return row


def plant(root, path, data):
    p = root / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(data)


def edit(root, project, change):
    p = root / project / 'tsconfig.json'
    c = json.loads(p.read_text())
    change(c)
    p.write_text(json.dumps(c))


def option(root, key, value, project='packages/a'):
    edit(root, project, lambda c: c['compilerOptions'].__setitem__(key, value))


def inherit(root, options, project='packages/a', own=None):
    plant(root, project + '/base.json', json.dumps({'compilerOptions': options}))
    edit(root, project, lambda c: c.__setitem__('extends', './base.json'))
    if own:
        edit(root, project, own)


def fixture(root):
    root.mkdir(parents=True)
    os.symlink(CHECKOUT / 'node_modules', root / 'node_modules')
    for project, refs in PROJECTS:
        name = project.rsplit('/', 1)[1]
        plant(root, project + '/src/' + name + '.ts', f"export const {name} = '{name}';\n")
        plant(root, project + '/tsconfig.json', json.dumps({'compilerOptions': {
            'composite': True, 'target': 'ES2022', 'module': 'ES2022', 'moduleResolution': 'bundler',
            'types': [], 'rootDir': 'src', 'outDir': 'dist', 'tsBuildInfoFile': 'dist/.tsbuildinfo'},
            'include': ['src'], 'references': [{'path': p} for p in refs]}))
    plant(root, 'outside/tsconfig.json', (root / 'packages/c/tsconfig.json').read_text())
    plant(root, '../outside/tsconfig.json', (root / 'packages/c/tsconfig.json').read_text())
    for path in SENTINELS:
        plant(root, path, 'kept\n')


def setup(root, ident):
    named = ['packages/d']
    extend = lambda value, project='packages/a': edit(root, project, lambda c: c.__setitem__('extends', value))
    refs = lambda value: edit(root, 'packages/a', lambda c: c.__setitem__('references', value))
    if ident in ('A01', 'A11', 'A12', 'A13', 'A14'):
        if ident == 'A11':
            plant(root, 'packages/b/dist/b.js', 'poisoned\n')
            plant(root, 'packages/a/dist/removed-source.js', 'stale\n')
        if ident == 'A13':
            p = root / 'packages/a/tsconfig.json'; p.write_text(json.dumps(json.loads(p.read_text()), sort_keys=True, indent=3))
        if ident == 'A14': edit(root, 'packages/a', lambda c: c.__setitem__('explanation', 'missing extends circular ERROR means nothing here'))
    elif ident == 'A02': named = ['packages/d', 'packages/b', 'packages/d', 'packages/a']
    elif ident == 'A03': named = ['packages/c/../d', './packages/d/']
    elif ident == 'A17': named = ['packages/c/../d']
    elif ident == 'A04':
        os.symlink(root / 'packages/a', root / 'packages/alias'); named = ['packages/alias']
    elif ident == 'A05':
        named = ['packages/c']; edit(root, 'packages/c', lambda c: (c['compilerOptions'].pop('composite'), c['compilerOptions'].__setitem__('incremental', True)))
    elif ident == 'A06': inherit(root, {'composite': True}, own=lambda c: c['compilerOptions'].pop('composite'))
    elif ident == 'A07':
        plant(root, 'packages/a/base.json', '{"extends":"./deep.json","compilerOptions":{"strict":true}}')
        plant(root, 'packages/a/deep.json', '{"compilerOptions":{"composite":true}}'); extend('./base.json')
    elif ident == 'A08':
        inherit(root, {'strict': True}); plant(root, 'packages/a/other.json', '{"compilerOptions":{"noImplicitAny":false}}'); extend(['./base.json', './other.json'])
    elif ident in ('A09', 'P09', 'P10'):
        # The fixture's own package, not the shared node_modules installation.
        nm = root / 'packages/a/node_modules/config-kit'
        plant(nm, 'package.json', '{"name":"config-kit","tsconfig":"base.json"}')
        if ident == 'A09': plant(nm, 'base.json', '{"compilerOptions":{"strict":true}}')
        elif ident == 'P10': plant(nm, 'base.json', '{"extends":"./absent.json"}')
        extend('config-kit')
    elif ident == 'A10':
        plant(root, 'packages/a/base.json', '// inherited JSONC\n{"compilerOptions":{"strict":true,},}'); extend('./base.json')
    elif ident in ('P01', 'P02', 'P03', 'P04', 'C01', 'C03', 'C05', 'C06', 'C08'):
        target = 'packages/c' if ident in ('P01', 'P03', 'P04') else 'packages/a'
        extend('./missing.json', target)
        if ident == 'P01': named = ['packages/c']
        if ident == 'P03': named = ['packages/d', 'packages/c']
        if ident == 'P04': named = ['packages/c', 'packages/d']
        if ident == 'C01': edit(root, target, lambda c: c.__setitem__('explanation', 'changed prose valid compilerOptions target ES2022'))
        if ident == 'C08':
            p = root / target / 'tsconfig.json'; p.write_text(json.dumps(json.loads(p.read_text()), sort_keys=True, indent=2))
    elif ident == 'P05':
        plant(root, 'packages/a/base.json', '{"extends":"./deep.json"}'); plant(root, 'packages/a/deep.json', '{"extends":"./absent.json"}'); extend('./base.json')
    elif ident in ('P06', 'P07', 'P08', 'C07'):
        value = ['./missing-first.json', './missing-second.json']
        if ident == 'P07': value = ['./missing-first.json']
        if ident == 'P08':
            plant(root, 'packages/a/valid.json', '{}'); value = ['./valid.json', './missing-first.json']
        extend(value)
    elif ident in ('P11', 'C04'): extend('./tsconfig.json')
    elif ident in ('P12', 'P13'):
        extend('./base.json'); plant(root, 'packages/a/base.json', '{"extends":"./tsconfig.json"}' if ident == 'P12' else '{"extends":"./deep.json"}')
        if ident == 'P13': plant(root, 'packages/a/deep.json', '{"extends":"./base.json"}')
    elif ident in ('P14', 'P16', 'C02'):
        option(root, 'notACompilerOption', True)
        if ident == 'P16': option(root, 'alsoNotAnOption', True)
        if ident == 'C02': edit(root, 'packages/a', lambda c: c.__setitem__('explanation', 'the unrelated explanation is different'))
    elif ident == 'P15': option(root, 'target', 1)
    elif ident == 'P17': inherit(root, {'notACompilerOption': True})
    elif ident == 'P18': plant(root, 'packages/a/base.json', '{"compilerOptions": {'); extend('./base.json')
    elif ident == 'P19': extend(42)
    elif ident == 'P20': edit(root, 'packages/a', lambda c: c.__setitem__('include', ['absent']))
    elif ident == 'P21': inherit(root, {'declarationDir': 'types'}); plant(root, 'packages/a/base.json', '{"extends":"./absent.json","compilerOptions":{"declarationDir":"types"}}')
    elif ident == 'P22': extend('./absent.json'); refs([{'path': '../d'}])
    elif ident.startswith('O'):
        n = int(ident[1:])
        if n == 1: named = []
        elif n == 2: named = ['packages/e']
        elif n == 3: named = ['tools/x']
        elif n == 4: option(root, 'outDir', 'out')
        elif n == 5: option(root, 'declarationDir', 'types')
        elif n == 6: option(root, 'outFile', 'dist/a.js')
        elif n == 7: refs([{'path': '../d'}])
        elif n == 8:
            p = root / 'packages/a/tsconfig.json'; p.write_text('// own comment\n' + p.read_text())
        elif n == 9:
            # Sibling of tree, outside its realpath; retained in the complete case snapshot.
            outside = root.parent / 'outside'
            os.symlink(outside, root / 'packages/e'); named = ['packages/e']
        elif n == 10: inherit(root, {'declarationDir': 'types'})
        elif n == 11: inherit(root, {'outFile': 'dist/a.js'})
        elif n == 12: option(root, 'composite', False)
        elif n == 13: edit(root, 'packages/a', lambda c: c['compilerOptions'].pop('composite'))
        elif n == 14: inherit(root, {'composite': False}, own=lambda c: c['compilerOptions'].pop('composite'))
        elif n == 15: inherit(root, {'declarationDir': 'dist-x'})
        else: raise ValueError(ident)
    elif ident == 'G01':
        named = ['packages/x\\y']; plant(root, 'packages/x\\y/src/m.ts', "export const m = 'm';\n")
        plant(root, 'packages/x\\y/tsconfig.json', (root / 'packages/c/tsconfig.json').read_text()); plant(root, 'packages/x\\y/dist/m.js', 'kept\n')
    elif ident == 'G02': inherit(root, {'declarationDir': None})
    elif ident == 'G03': inherit(root, {'outFile': None})
    elif ident == 'G04': option(root, 'tsBuildInfoFile', 'state.info')
    elif ident == 'G05': (root / 'packages/a/tsconfig.json').unlink()
    elif ident == 'G06': (root / 'packages/a/tsconfig.json').chmod(0)
    elif ident == 'G07': plant(root, 'packages/a/tsconfig.json', '{broken')
    elif ident == 'G08':
        p = root / 'packages/a/tsconfig.json'; p.write_text('// own JSONC\n' + p.read_text())
    elif ident == 'G09': plant(root, 'packages/a/tsconfig.json', 'null')
    elif ident == 'G10': refs([{'path': '../b/tsconfig.json'}])
    elif ident == 'G11': refs([{'path': 17}])
    elif ident == 'G12':
        p = root / 'packages/a/tsconfig.json'; p.unlink(); p.mkdir()
    elif ident == 'G13': (root / 'node_modules').unlink()
    elif ident == 'T01': plant(root, 'packages/a/src/a.ts', "export const a: number = 'wrong';\n")
    elif ident == 'T02': plant(root, 'packages/a/src/a.ts', "export { absent } from './absent.js';\n")
    else: raise ValueError(ident)
    return named


def image(root):
    rows = []
    def walk(directory):
        for p in sorted(directory.iterdir()):
            info = p.lstat(); row = {'path': str(p.relative_to(root)), 'mode': stat.S_IMODE(info.st_mode)}
            if p.is_symlink(): row.update(kind='symlink', target=os.readlink(p))
            elif p.is_dir(): row['kind'] = 'directory'
            elif p.is_file():
                # Fixture-owned unreadable control: recover its bytes for the image, then restore the exact execution mode.
                try: body = p.read_bytes()
                except PermissionError:
                    p.chmod(row['mode'] | stat.S_IRUSR)
                    try: body = p.read_bytes()
                    finally: p.chmod(row['mode'])
                    row['imageRead'] = 'temporary owner-read, restored before execution'
                row.update(kind='file', bytes=len(body), sha256=digest(body), base64=base64.b64encode(body).decode())
            else: row['kind'] = 'other'
            rows.append(row)
            if row['kind'] == 'directory': walk(p)
    walk(root)
    return rows


def copy_fixture(source, destination):
    def copy_owned(src, dst):
        mode = stat.S_IMODE(os.stat(src).st_mode)
        os.chmod(src, mode | stat.S_IRUSR)
        try: shutil.copy2(src, dst)
        finally: os.chmod(src, mode)
        os.chmod(dst, mode)
        return dst
    shutil.copytree(source, destination, symlinks=True, copy_function=copy_owned)


def store_image(path, rows):
    raw = json.dumps(rows, sort_keys=True).encode()
    with path.open('xb') as f: f.write(gzip.compress(raw, mtime=0))
    return {'path': str(path), 'entries': len(rows), 'sha256': digest(path.read_bytes()), 'uncompressedSha256': digest(raw)}


def changes(before, after):
    a, b = ({x['path']: x for x in rows} for rows in (before, after))
    return [p for p in sorted(a.keys() | b.keys()) if a.get(p) != b.get(p)]


def diagnostic(out):
    text = (out / 'stderr').read_text() + '\n' + (out / 'stdout').read_text()
    return next((s.strip() for s in text.splitlines() if s.strip().startswith(('Error:', 'TypeError:')) or 'error TS' in s), '')


def matrix(args, scripts, record):
    corpus = json.loads((HERE.parent / 'CORPUS.json').read_text()); rows = []
    tsc = str((CHECKOUT / 'node_modules/typescript/bin/tsc').resolve())
    for spec in corpus['caseRows']:
        ident = str(spec['id'])
        if ident in ('A15', 'A16'): continue
        if args.case and ident != args.case: continue
        area = args.runtime_root / 'fixtures' / ident; template = args.output / ident / 'template'
        area.mkdir(parents=True); root = area / 'tree'; fixture(root); named = setup(root, ident)
        plant(root, SCRIPT, scripts['base'].decode()); copy_fixture(area, template)
        row = {'id': ident, 'name': spec['name'], 'named': named, 'engines': {}}
        probe = attempt(['node', str(HERE / 'diagnose_config.mjs'), *[str(root / p / 'tsconfig.json') for p, _ in PROJECTS]], root, args.output / ident / 'native-parse')
        row['nativeParser'] = {'attempt': probe, 'result': json.loads((args.output / ident / 'native-parse/stdout').read_text())}
        for engine in ('base', 'head', 'native'):
            shutil.rmtree(area); copy_fixture(template, area)
            if engine != 'native': plant(root, SCRIPT, scripts[engine].decode())
            out = args.output / ident / engine; out.mkdir(parents=True)
            command = ['node', 'scripts/clean_build.mjs', *named] if engine != 'native' else ['node', tsc, '-b', *named]
            traced = ident in ('P01', 'P02', 'P03')
            if traced: command = ['strace', '-f', '-s', '4096', '-e', 'trace=process,file', '-o', str(out / 'syscalls.log'), *command]
            valid_before = None
            if ident == 'C06':
                edit(root, 'packages/a', lambda c: c.pop('extends'))
                valid_before = attempt(command, root, out / 'valid-before')
                shutil.rmtree(area); copy_fixture(template, area)
                if engine != 'native': plant(root, SCRIPT, scripts[engine].decode())
            before = image(area); initial = store_image(out / 'before.json.gz', before)
            outcome = attempt(command, root, out / 'run')
            after = image(area); final = store_image(out / 'after.json.gz', after)
            # Independent file bytes in the images identify exactly what survives or changes.
            lost = [s for s in SENTINELS if not (root / s).is_file() or (root / s).read_bytes() != b'kept\n']
            trace = (out / 'syscalls.log').read_text() if traced else None
            removal = [line for line in trace.splitlines() if re.search(r'\b(?:unlink|unlinkat|rmdir|rename|renameat|renameat2)\(', line) and '/dist' in line] if trace is not None else None
            executions = [line for line in trace.splitlines() if 'execve(' in line and 'typescript/bin/tsc' in line] if trace is not None else None
            item = {'attempt': outcome, 'diagnostic': diagnostic(out / 'run'), 'before': initial, 'after': final,
                    'changedPaths': changes(before, after), 'sentinelsChanged': lost,
                    'distRemovalAttempts': removal, 'tscExecs': executions}
            if valid_before is not None: item['validBefore'] = valid_before
            if ident in ('A12', 'C05'):
                repeated = attempt(command, root, out / 'repeat'); repeat_after = image(area)
                item['repeat'] = {'attempt': repeated, 'image': store_image(out / 'repeat.json.gz', repeat_after), 'changedFromFirst': changes(after, repeat_after)}
            if ident in ('C03', 'C04', 'C06'):
                edit(root, 'packages/a', lambda c: c.pop('extends'))
                restored = attempt(command, root, out / 'restored')
                item['restoredValid'] = {'attempt': restored, 'after': store_image(out / 'restored.json.gz', image(area))}
            row['engines'][engine] = item
        b, h, n = (row['engines'][key] for key in ('base', 'head', 'native'))
        row['classification'] = {'newlyRefused': b['attempt']['exit'] == 0 and h['attempt']['exit'] != 0,
                                 'newlyAccepted': b['attempt']['exit'] != 0 and h['attempt']['exit'] == 0,
                                 'nativeAcceptedHeadRefused': n['attempt']['exit'] == 0 and h['attempt']['exit'] != 0,
                                 'diagnosticChanged': b['diagnostic'] != h['diagnostic'],
                                 'exitChanged': b['attempt']['exit'] != h['attempt']['exit'],
                                 'movedBeforeRemoval': bool(b['sentinelsChanged']) and not h['sentinelsChanged'] and h['attempt']['exit'] != 0,
                                 'bothNativeFailure': n['attempt']['exit'] != 0 and h['attempt']['exit'] != 0,
                                 'stdoutBytesChanged': b['attempt']['stdoutSha256'] != h['attempt']['stdoutSha256'],
                                 'stderrBytesChanged': b['attempt']['stderrSha256'] != h['attempt']['stderrSha256']}
        rows.append(row); save(args.output / 'MATRIX.partial.json', {**record, 'rows': rows})
        print(json.dumps({'case': ident, 'base': b['attempt']['exit'], 'head': h['attempt']['exit'], 'native': n['attempt']['exit']}), flush=True)
        shutil.rmtree(area)
    record.update(rows=rows, executedCaseRows=len(rows), workspaceRowsInBuildParity=['A15', 'A16'])
    save(args.output / 'MATRIX.json', record)


def clone(args, destination, out):
    if destination.exists():
        current = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=destination).decode().strip()
        if current != args.head or (destination / SCRIPT).read_bytes() != subprocess.check_output(['git', 'show', f'{args.head}:{SCRIPT}'], cwd=CHECKOUT):
            raise RuntimeError('private clone subject drift; no reuse')
        return
    attempt(['git', 'clone', '--no-hardlinks', '--no-checkout', str(CHECKOUT), str(destination)], CHECKOUT, out / 'clone')
    attempt(['git', 'checkout', '--detach', args.head], destination, out / 'checkout')
    installed = attempt(['npm', 'ci', '--offline', '--no-audit', '--no-fund'], destination, out / 'install')
    if installed['exit'] != 0: raise RuntimeError('offline clone install failed; retained')


def build_parity(args, scripts, record):
    root = args.runtime_root / 'build-subject'; clone(args, root, args.output / 'setup'); rows = []
    manifest = json.loads((root / 'package.json').read_text())
    all_projects = [p.parent for p in root.glob('packages/*/tsconfig.json')] + [p.parent for p in root.glob('apps/*/tsconfig.json')]
    for script_name, ident in [('build', 'A15'), ('build:poc', 'A16')]:
        if args.case and ident != args.case: continue
        engines = {}
        for engine in ('base', 'head', 'native'):
            for p in all_projects: shutil.rmtree(p / 'dist', ignore_errors=True)
            (root / SCRIPT).write_bytes(scripts[engine] if engine != 'native' else scripts['head'])
            out = args.output / script_name.replace(':', '-') / engine
            command = ['npm', 'run', script_name] if engine != 'native' else ['node', 'node_modules/typescript/bin/tsc', '-b', *manifest['scripts'][script_name].split()[2:]]
            done = attempt(command, root, out / 'run', timeout=600)
            files = []
            for p in all_projects:
                if (p / 'dist').exists():
                    for file in sorted((p / 'dist').rglob('*')):
                        if file.is_file(): files.append({'path': str(file.relative_to(root)), 'bytes': file.stat().st_size, 'sha256': digest(file.read_bytes()), 'base64': base64.b64encode(file.read_bytes()).decode()})
            engines[engine] = {'attempt': done, 'image': store_image(out / 'outputs.json.gz', files), 'files': [{'path': f['path'], 'bytes': f['bytes'], 'sha256': f['sha256']} for f in files]}
        rows.append({'id': ident, 'script': script_name, 'engines': engines,
                     'baseHeadEqual': engines['base']['files'] == engines['head']['files'],
                     'headNativeEqual': engines['head']['files'] == engines['native']['files']})
    record.update(rows=rows); save(args.output / 'BUILD-PARITY.json', record)


def mutants(args, scripts, record):
    root = args.runtime_root / 'mutant-subject'; clone(args, root, args.output / 'setup')
    guard = "  if (parsed.errors.length > 0) throw new Error(`${path}: ${ts.flattenDiagnosticMessageText(parsed.errors[0].messageText, '\\n')}`);\n"
    delayed = guard.replace('throw new Error(', 'refuseParsed.push(() => { throw new Error(').replace(');\n', '); });\n')
    specs = [('M0', [(guard, '')]),
             ('M1', [('const referenced = new Set();', 'const referenced = new Set();\nconst refuseParsed = [];'), (guard, delayed), ('const tsc =', 'for (const refuse of refuseParsed) refuse();\nconst tsc =')]),
             ('M2', [('parsed.errors.length > 0', 'parsed.errors.length > 1')]),
             ('M3', [('parsed.errors[0].messageText', 'parsed.errors[parsed.errors.length - 1].messageText')]),
             ('M4', [('`${path}: ${ts.flattenDiagnosticMessageText', '`${ts.flattenDiagnosticMessageText')]),
             ('M5', [("ts.flattenDiagnosticMessageText(parsed.errors[0].messageText, '\\n')", "'TypeScript config has errors'")])]
    rows = []
    for ident, edits in [('CONTROL', [])] + specs:
        if args.case and ident != args.case: continue
        source = scripts['head'].decode(); fragments = []
        for old, new in edits:
            if source.count(old) != 1: raise RuntimeError(f'{ident}: fragment matches {source.count(old)} times')
            fragments.append({'old': old, 'new': new}); source = source.replace(old, new)
        (root / SCRIPT).write_text(source)
        report = args.output / ident / 'vitest.json'
        command = ['npx', '--no-install', 'vitest', 'run', '--project', 'e2e', TEST, '-t', 'missing extends|circular extends', '--reporter=default', '--reporter=json', '--outputFile=' + str(report)]
        try: outcome = attempt(command, root, args.output / ident / 'run')
        finally: (root / SCRIPT).write_bytes(scripts['head'])
        parsed = json.loads(report.read_text()) if report.exists() else {}
        assertions = [a for f in parsed.get('testResults', []) for a in f.get('assertionResults', []) if a['status'] != 'pending']
        failures = [a for a in assertions if a['status'] == 'failed']
        intended = bool(failures) and all(any(s in message for s in ('AssertionError:', 'expected ')) for a in failures for message in a.get('failureMessages', []))
        if ident == 'CONTROL' and (outcome['exit'] != 0 or len(assertions) != 2 or failures):
            raise RuntimeError('unmutated two-case control failed; preserved, not scoring mutants')
        rows.append({'id': ident, 'edits': fragments, 'mutatedScriptSha256': digest(source.encode()), 'restoredSha256': digest((root / SCRIPT).read_bytes()),
                     'attempt': outcome, 'collectedTotal': parsed.get('numTotalTests'), 'executed': len(assertions),
                     'passed': parsed.get('numPassedTests'), 'failed': parsed.get('numFailedTests'), 'failures': failures,
                     'killedByIntendedAssertion': ident != 'CONTROL' and outcome['exit'] != 0 and len(assertions) == 2 and intended})
        save(args.output / 'MUTATIONS.partial.json', {**record, 'rows': rows})
        print(json.dumps({'mutant': ident, 'executed': len(assertions), 'failed': len(failures), 'intended': intended}), flush=True)
    record.update(rows=rows); save(args.output / 'MUTATIONS.json', record)


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('mode', choices=['matrix', 'build-parity', 'mutants'])
    parser.add_argument('--base', required=True); parser.add_argument('--head', required=True)
    parser.add_argument('--runtime-root', type=Path, required=True); parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--case', help='one independent restored case; the host driver releases its lock between invocations')
    args = parser.parse_args(); args.output.mkdir(parents=True)
    args.base = git('rev-parse', args.base + '^{commit}'); args.head = git('rev-parse', args.head + '^{commit}')
    scripts = {key: subprocess.check_output(['git', 'show', f'{value}:{SCRIPT}'], cwd=CHECKOUT) for key, value in [('base', args.base), ('head', args.head)]}
    record = {'subject': {'baseCommit': args.base, 'headCommit': args.head, 'baseScriptSha256': digest(scripts['base']), 'headScriptSha256': digest(scripts['head']),
                          'testSha256': digest((CHECKOUT / TEST).read_bytes()), 'lockSha256': digest((CHECKOUT / 'package-lock.json').read_bytes())},
              'tool': {'path': str(Path(__file__).resolve()), 'sha256': digest(Path(__file__).read_bytes()),
                       'diagnosticProbeSha256': digest((HERE / 'diagnose_config.mjs').read_bytes()), 'corpusSha256': digest((HERE.parent / 'CORPUS.json').read_bytes())},
              'runtime': {name: subprocess.check_output(command, cwd=CHECKOUT).decode().strip() for name, command in {
                  'node': ['node', '--version'], 'npm': ['npm', '--version'], 'typescript': ['node', '-p', "require('typescript').version"],
                  'vitest': ['node', '-p', "require('vitest/package.json').version"], 'git': ['git', '--version'], 'strace': ['strace', '--version']}.items()},
              'mode': args.mode, 'cwd': str(CHECKOUT), 'argv': __import__('sys').argv,
              'stableSerialFixturesOnly': True, 'concurrentEditOrBuildProtection': False, 'postValidationRollback': False}
    save(args.output / 'SUBJECT.json', record)
    {'matrix': matrix, 'build-parity': build_parity, 'mutants': mutants}[args.mode](args, scripts, record)


if __name__ == '__main__': main()
