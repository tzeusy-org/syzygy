"""syzygy-bpyt.8.2: lift the daemon's and `syzygy polaris`'s module-private argv parsers out of one tree, byte for byte, into two
standalone TypeScript modules a parse-level golden can call. Each region is cut between two literal markers that must each occur
exactly once; the constants a region reads are asserted to hold the stubbed values in the same file. Node 24 strips the types.
Usage: extract_parsers.py <tree> <out-dir>
"""
import os, re, sys

tree, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
argv_ts = os.path.join(tree, 'packages/polaris-dossier/src/argv.ts')


def region(text, start, end):
    assert text.count(start) == 1, (start, text.count(start))
    assert text.count(end) == 1, (end, text.count(end))
    a = text.index(start)
    b = text.index(end, a)
    return text[a:b]


def argv_import(body):
    if 'readArgv' not in body:
        return ''
    assert os.path.isfile(argv_ts), argv_ts
    names = sorted(set(re.findall(r'\b(readArgv|isArgvFault)\b', body)))
    return f"import {{ {', '.join(names)} }} from {argv_ts!r};\n"


main = open(os.path.join(tree, 'apps/syzygy/src/main.ts')).read()
assert "const DEFAULT_PORT = 7477;\n" in main and "const DEFAULT_STATE_DIR_NAME = '.syzygy-daemon-state';\n" in main
daemon = region(main, 'interface CliConfig {', '// --- Governed-plane containment by symlink reality (RTF-1)')
assert 'function parseCli(argv: readonly string[], env: NodeJS.ProcessEnv): CliParse {' in daemon
open(os.path.join(out, 'daemon-parse.ts'), 'w').write(
    "import * as path from 'node:path';\n" + argv_import(daemon)
    + "const DEFAULT_PORT = 7477;\nconst DEFAULT_STATE_DIR_NAME = '.syzygy-daemon-state';\n"
    + daemon + "\nexport { parseCli };\n")

polaris = open(os.path.join(tree, 'packages/polaris-dossier/src/polaris.ts')).read()
assert "import { DOSSIER_USAGE, EXIT, STATE_ROOT_ENV, runDossierCli, type CliPorts } from './cli.js';" in polaris or 'STATE_ROOT_ENV' in polaris
body = region(polaris, 'function parseArgs(argv: readonly string[]): Options | string {', 'async function ask(question: string): Promise<string> {')
consts = ''
for name in sorted(set(re.findall(r'\b(POLARIS_[A-Z_]+)\b', body)) - {'POLARIS_USAGE'}):
    consts += region(polaris, f'const {name} ', '\n\n') + '\n'
open(os.path.join(out, 'polaris-parse.ts'), 'w').write(
    "import * as os from 'node:os';\nimport * as path from 'node:path';\n" + argv_import(body + consts)
    + "const STATE_ROOT_ENV = 'SYZYGY_DOSSIER_STATE_ROOT';\nconst POLARIS_USAGE = '<POLARIS_USAGE>';\n"
    + consts + body + "\nexport { parseArgs };\n")
print('extracted', len(daemon), len(body), 'bytes')
