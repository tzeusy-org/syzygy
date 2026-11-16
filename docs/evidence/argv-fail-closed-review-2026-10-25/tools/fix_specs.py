"""rev-528: check the rows proposed in N1 before proposing them (rule 6 on the fix): the rows alone pass at head, and each one
kills the predicate mutant that survives today.

Usage: python3 -I fix_specs.py <out.json>
"""
import json, sys

out = sys.argv[1]
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
REACH = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
ARGV = 'packages/polaris-dossier/src/argv.test.ts'
TARGET = (['@syzygy/polaris-generation-core', '@syzygy/polaris-dossier'], [REACH, ARGV])
LEAVES = "    ['whose target leaves its package', { '#lib': '../lib/dist/index.js' }, 'apps/app/src/main.ts', '#lib'],\n"
POLICIES = "    [\"import { readArgv } from './argv.js';\\nexport const policies = { daemon: readArgv };\", ['module.ts:2 daemon: readArgv']],\n"
ROWS = [
    {'file': REACH, 'old': LEAVES, 'new': LEAVES
     + "    ['whose target leaves its package for a module that exists', { '#lib': '../../../packages/lib/src/index.js' }, 'apps/app/src/main.ts', '#lib'],\n"
     + "    ['whose target is a module of its own package outside dist', { '#lib': './src/local.js' }, 'apps/app/src/main.ts', '#lib'],\n"
     + "    ['whose target names no source module', { '#lib': './dist/missing.js' }, 'apps/app/src/main.ts', '#lib'],\n"},
    {'file': ARGV, 'old': POLICIES, 'new': POLICIES
     + "    [\"import { readArgv } from './argv.js';\\nvoid [[]].map(readArgv);\", ['module.ts:2 [[]].map(readArgv)']],\n"
     + "    [\"export function readArgv(): void {}\", ['module.ts:1 export function readArgv(): void {}']],\n"},
]
MUTANTS = {
    'P6': {'file': KIT, 'old': "target.startsWith('#') || target.startsWith('../')) return undefined;", 'new': "target.startsWith('#')) return undefined;"},
    'P3': {'file': KIT, 'old': "  if (!target.startsWith('./dist/')) return undefined;\n", 'new': "  if (!target.startsWith('./dist/')) return null as never;\n"},
    'P4': {'file': KIT, 'old': '  return workspace.isFile(module) ? module : undefined;\n', 'new': '  return workspace.isFile(module) ? module : (null as never);\n'},
    'Q1': {'file': ARGV, 'old': '        || (ts.isCallExpression(parent) && parent.expression === node);\n', 'new': '        || ts.isCallExpression(parent);\n'},
    'Q2': {'file': ARGV, 'old': " && module === 'packages/polaris-dossier/src/argv.ts')", 'new': ')'},
}
specs = [{'id': 'FIX-rows-alone', 'expect': 'survives', 'projects': TARGET[0], 'files': TARGET[1], 'edits': ROWS}]
specs += [{'id': f'FIX-rows-with-RV-{k}', 'expect': 'killed', 'projects': TARGET[0], 'files': TARGET[1], 'edits': ROWS + [m]} for k, m in MUTANTS.items()]
json.dump({'what': 'rev-528: the N1 rows, alone and with each surviving predicate mutant', 'mutants': specs}, open(out, 'w'), indent=1)
print(len(specs))
