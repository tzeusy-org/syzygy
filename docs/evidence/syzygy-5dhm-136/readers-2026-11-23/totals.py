"""Unblind the reader-arm grading: share of required facts per arm, overall and per kind."""
import json
import sys
from collections import defaultdict

base = sys.argv[1]
grades = json.load(open(f"{base}/grade/grades.json"))["grades"]
labels = json.load(open(f"{base}/labels/labels.json"))
# label map may be {label: arm} or {arm: label}
lm = labels.get("labels", labels)
if all(len(k) == 1 and k.isupper() for k in lm) and all(isinstance(v, str) for v in lm.values()):
    label_to_arm = lm
else:
    label_to_arm = {v: k for k, v in lm.items()}
num = defaultdict(float)
den = defaultdict(int)
wrong = defaultdict(int)
for row in grades:
    for label, g in row.items():
        if label in ("id", "kind"):
            continue
        arm = label_to_arm[label]
        for key in (arm, f"{arm}:{row['kind']}"):
            num[key] += sum(g["facts"])
            den[key] += len(g["facts"])
        wrong[arm] += g["wrong"]
arms = sorted({k for k in num if ":" not in k})
kinds = sorted({k.split(":")[1] for k in num if ":" in k})
print("arm overall " + " ".join(kinds) + " wrong")
for a in arms:
    cells = [f"{num[a] / den[a]:.3f}"] + [f"{num[a + ':' + k] / den[a + ':' + k]:.2f}" for k in kinds]
    print(a, " ".join(cells), wrong[a], f"(facts {den[a]})")
