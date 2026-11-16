"""rev-521: compare mutants.json's R*/GM1/GM3 edits with their source specs, and report each old fragment's occurrence count at the tree."""
import glob, json, os, sys
tree = sys.argv[1]
m = json.load(open(os.path.join(tree, 'docs/evidence/syzygy-bpyt-8-32/mutants.json')))
by_id = {x['id']: x for x in m['mutants']}
print('controls', len(m['controls']), 'mutants', len(m['mutants']))
for path in sorted(glob.glob(os.path.join(tree, 'docs/evidence/syzygy-bpyt-8-2/mutants/R*.json'))):
    spec = json.load(open(path))
    copy = by_id.get(spec['id'])
    counts = [open(os.path.join(tree, e['file'])).read().count(e['old']) for e in spec['edits']]
    print(spec['id'], 'copied' if copy else 'NOT COPIED', 'edits-equal' if copy and copy['edits'] == spec['edits'] else '-', 'old-counts', counts)
for name in ('GM1.json', 'GM3.json'):
    spec = json.load(open(os.path.join(tree, 'docs/evidence/dossier-cli-table-review-2026-10-24/mutants', name)))
    copy = by_id.get(spec['id'])
    edits = [{'file': spec['file'], 'old': spec['old'], 'new': spec['new']}] if 'file' in spec else spec['edits']
    counts = [open(os.path.join(tree, e['file'])).read().count(e['old']) for e in edits]
    print(spec['id'], 'copied' if copy else 'NOT COPIED', 'edits-equal' if copy and copy['edits'] == edits else '-', 'old-counts', counts, 'keys', sorted(spec))
