#!/usr/bin/env python3
"""Do round 2's eight reviewer mutant fragments still apply, exactly once, to the code above `def selftest(` at the reviewed commit?

Usage: n12_fragments.py <round-2 my-mutants.json> <assemble_census.py>
"""
import json
import sys

mutants = json.load(open(sys.argv[1]))
mutants = mutants.get('mutants', mutants)
source = open(sys.argv[2]).read()
code = source[:source.index('def selftest(')]
print(json.dumps({name: code.count(m['old']) for name, m in mutants.items()}, indent=1))
