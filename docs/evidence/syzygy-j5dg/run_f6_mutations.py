"""Rule-6 mutations for syzygy-j5dg F6 (owner answer pr714 B).

Each mutant rewrites one literal fragment of scripts/check_spec_reconciliation.py
in the worktree, runs the two F6 selftest fixtures (`_fifo_control`, the
live-writer FIFO control, and `_fifo_after_refusal_case`) in a child process
over the selftest's own scratch base, records the outcome, and restores the
file. Refuses to start unless the subject is clean at HEAD.
Usage: run_f6_mutations.py <worktree> <out.json>
"""
import hashlib, json, subprocess, sys, time
from pathlib import Path

W = Path(sys.argv[1]); OUT = Path(sys.argv[2])
SUBJECT = W / "scripts/check_spec_reconciliation.py"
DRIVER = r'''
import sys, tempfile
from pathlib import Path
sys.path.insert(0, "scripts")
import check_spec_reconciliation as c
w, f = [], []
with tempfile.TemporaryDirectory() as tmp:
    base = Path(tmp) / "base"
    c.scratch(c.ROOT, base)
    c._propose_candidate(base)
    c._fifo_control(tmp, base, w, f)
    c._fifo_after_refusal_case(tmp, base, w, f)
for x in w: print(x["outcome"], x["mutant"], x["failed"])
print("FAILURES", len(f))
sys.exit(1 if f else 0)
'''
MUTANTS = [
    ("F6-M1-refuse-every-fifo",
     "        if refused and _is_fifo(path):\n",
     "        if _is_fifo(path):\n"),
    ("F6-M2-open-fifo-after-refusal",
     "        if refused and _is_fifo(path):\n",
     "        if False and refused and _is_fifo(path):\n"),
    ("F6-M3-is-fifo-never",
     "        return stat.S_ISFIFO(path.stat().st_mode)\n",
     "        return False\n"),
    ("F6-M4-skip-unnamed",
     "            refused.append((path, f\"`{rel}`: {entry_kind(path)}, not opened \"\n"
     "                            \"because an earlier entry is refused\"))\n",
     "            pass\n"),
    ("F6-M5-pre-open-refusal-restored",
     "        if not collect:\n            # Exactly the read before syzygy-j5dg; its error propagates.\n",
     "        if _is_fifo(path):\n"
     "            finding = f\"`{rel}`: {entry_kind(path)}\"\n"
     "            if not collect:\n"
     "                raise SignoffEntriesRefused([finding], filename=str(path))\n"
     "            refused.append((path, finding))\n"
     "            continue\n"
     "        if not collect:\n            # Exactly the read before syzygy-j5dg; its error propagates.\n"),
]

def git(*a):
    return subprocess.run(["git", *a], cwd=W, capture_output=True, text=True).stdout.strip()

if git("status", "--porcelain", "--", "scripts"):
    sys.exit("refusing: scripts/ is dirty")
commit = git("rev-parse", "HEAD")
original = SUBJECT.read_bytes()
digest = hashlib.sha256(original).hexdigest()

def drive():
    t = time.time()
    p = subprocess.run([sys.executable, "-c", DRIVER], cwd=W, capture_output=True,
                       text=True, timeout=900)
    return p.returncode, p.stdout.strip().splitlines()[-4:], round(time.time() - t, 1)

rows = []
code, tail, secs = drive()
baseline = {"exit": code, "tail": tail, "seconds": secs}
try:
    for mid, old, new in MUTANTS:
        text = original.decode("utf-8")
        assert text.count(old) == 1, mid
        SUBJECT.write_text(text.replace(old, new), encoding="utf-8")
        mutated = hashlib.sha256(SUBJECT.read_bytes()).hexdigest()
        code, tail, secs = drive()
        SUBJECT.write_bytes(original)
        rows.append({"id": mid, "old": old, "new": new, "exit": code,
                     "outcome": "killed" if code != 0 else "SURVIVED",
                     "tail": tail, "seconds": secs, "mutatedSha256": mutated})
        print(mid, rows[-1]["outcome"], flush=True)
finally:
    SUBJECT.write_bytes(original)
assert hashlib.sha256(SUBJECT.read_bytes()).hexdigest() == digest
doc = {"subject": "scripts/check_spec_reconciliation.py", "subjectSha256": digest,
       "ranAt": commit, "harnessSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
       "baseline": baseline, "mutants": rows,
       "killed": sum(r["outcome"] == "killed" for r in rows), "total": len(rows)}
OUT.write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")
print(doc["killed"], "of", doc["total"], "killed; baseline exit", baseline["exit"])
