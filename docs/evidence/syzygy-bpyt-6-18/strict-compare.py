"""Strict JSON comparison; every value, every row, and Git call order matter."""
import hashlib
import json
import sys
from pathlib import Path

left_path, right_path = map(Path, sys.argv[1:])
left = json.loads(left_path.read_bytes())
right = json.loads(right_path.read_bytes())
assert left == right, "differential mismatch: stop for owner disposition; no normalization permitted"
# JSON's parsed equality is independently confirmed against the retained bytes.
assert left_path.read_bytes() == right_path.read_bytes(), "output serialization differs"
print(json.dumps({"equal": True, "rows": left["rows"], "populations": {k: len(v) for k, v in left.items() if isinstance(v, dict)}, "sha256": hashlib.sha256(left_path.read_bytes()).hexdigest()}))
