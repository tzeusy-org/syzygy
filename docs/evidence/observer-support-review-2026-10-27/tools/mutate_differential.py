"""rev-540: rule 6 on the differential. Mutate the HEAD side's built gate (dist, ignored, so the tree stays clean), re-run the
lane's gate_diff.py unchanged, and confirm its two verdict fields go false. The original dist bytes are restored after each.
Usage: python3 -I mutate_differential.py <base-tree> <head-tree> <gate_diff.py> <gate-diff.mjs> <scratch> <out.json>
"""
import json, subprocess, sys
from pathlib import Path

base, head, tool_py, tool_mjs, scratch, out = sys.argv[1:7]
dist = Path(head) / 'apps/three-surface-poc/dist/git-observation.js'
original = dist.read_bytes()
SUPPORT = "        'packages/support/',\n"
MUTANTS = {
    'D1-extra-prefix-polaris-generation-core': (SUPPORT, SUPPORT + "        'packages/polaris-generation-core/',\n"),
    'D2-support-prefix-dropped': (SUPPORT, ''),
    'D3-support-prefix-without-trailing-slash': (SUPPORT, "        'packages/support',\n"),
    'D0-control-unmutated': (SUPPORT, SUPPORT),
}
results = {}
for mid, (old, new) in MUTANTS.items():
    text = original.decode()
    assert text.count(old) == 1, f'{mid}: old occurs {text.count(old)}x'
    try:
        dist.write_text(text.replace(old, new, 1))
        rec_file = f'{scratch}-{mid}.json'
        subprocess.run(['python3', '-I', tool_py, base, head, tool_mjs, f'{scratch}-{mid}', rec_file], check=True, capture_output=True, text=True)
        rec = json.load(open(rec_file))
        Path(rec_file).unlink()
        results[mid] = {'old': old, 'new': new, 'refused': rec['refused'], 'differingCount': len(rec['differing']),
                        'differingOutsideSupport': [d for d in rec['differing'] if not d[0].startswith('packages/support/')][:6],
                        'onlySupportDiffers': rec['onlySupportDiffers'], 'everySupportPathDiffers': rec['everySupportPathDiffers']}
    finally:
        dist.write_bytes(original)
    print(mid, results[mid]['refused'], results[mid]['differingCount'], results[mid]['onlySupportDiffers'], results[mid]['everySupportPathDiffers'])
assert dist.read_bytes() == original
json.dump(results, open(out, 'w'), indent=1)
