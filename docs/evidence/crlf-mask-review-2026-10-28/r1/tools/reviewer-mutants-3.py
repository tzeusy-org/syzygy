#!/usr/bin/env python3
"""The lane's MU1..MU16 (fragments imported from its crlf-mask-mutants.py) run by reviewer-mutants.py's runner at the reviewed
commit, so every failing test is listed. Usage: reviewer-mutants-3.py <clone> <lane mutants .py> <tmpdir> <out.json>"""
import importlib.util
import os
import sys
here = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location('rm', os.path.join(here, 'reviewer-mutants.py'))
rm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rm)
lane_path = sys.argv.pop(2)
lspec = importlib.util.spec_from_file_location('lane', lane_path)
lane = importlib.util.module_from_spec(lspec)
lspec.loader.exec_module(lane)
rm.MUTANTS = [(mid, rm.MASK, pairs, note) for mid, pairs, note in lane.MUTANTS]
rm.main()
