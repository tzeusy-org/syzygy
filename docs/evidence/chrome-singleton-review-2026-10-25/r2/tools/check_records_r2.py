#!/usr/bin/env python3
"""Check the round-1 repair evidence records of PR 515 by script.

Usage: check_records_r2.py <clone at the reviewed head>
Reads JSON fields only; prints derived facts, never record prose beyond ids and first error lines.
"""
import hashlib
import json
import subprocess
import sys

REPO = sys.argv[1]
EV = "docs/evidence/chrome-singleton-leak-2026-10-22"
HEAD = "6dcf94906b2989345f5b03dfeaa2d64c56632886"
R1 = "490332aa7cc1cdf818ae01bd46e375f8280d8b7d"


def git(*args):
    return subprocess.run(["git", "-C", REPO, *args], check=True, capture_output=True).stdout


def load(name, commit=HEAD):
    return json.loads(git("show", f"{commit}:{EV}/{name}"))


def blob_sha(commit, path):
    return hashlib.sha256(git("show", f"{commit}:{path}")).hexdigest()


print("== sha256AtCommit against git show <treeCommit>:<path>, and against the reviewed head")
names = [n.decode() for n in git("ls-tree", "-z", "--name-only", f"{HEAD}:{EV}").split(b"\0") if n]
jsons = sorted(n for n in names if n.endswith(".json"))
print("json records at head:", len(jsons))
with_commit = 0
with_digests = 0
for n in jsons:
    rec = load(n)
    tc = rec.get("treeCommit")
    digests = rec.get("sha256AtCommit")
    if tc is None and isinstance(rec.get("subject"), dict):
        tc = rec["subject"].get("codeCommit")
        digests = rec["subject"].get("sha256AtCommit")
    if tc is None:
        print(f"  {n}: no treeCommit")
        continue
    with_commit += 1
    if not digests:
        print(f"  {n}: treeCommit {tc[:8]} and NO sha256AtCommit")
        continue
    with_digests += 1
    if not isinstance(digests, dict):
        print(f"  {n}: treeCommit {tc[:8]} sha256AtCommit is a {type(digests).__name__}: {str(digests)[:80]}")
        continue
    bad =[p for p, d in digests.items() if blob_sha(tc, p) != d]
    same_at_head = [p for p, d in digests.items() if blob_sha(HEAD, p) == d]
    print(f"  {n}: treeCommit {tc[:8]} files {len(digests)} mismatched-at-treeCommit {len(bad)} equal-at-head {len(same_at_head)}/{len(digests)}")
print(f"records with a commit: {with_commit}; of those with digests: {with_digests}")

print("== the three 2026-10-22 browser-files records: only sha256AtCommit added since round 1")
for n in ["browser-files-base-2026-10-22.json", "browser-files-head-2026-10-22.json", "browser-files-head-chrome154-2026-10-22.json"]:
    old, new = load(n, R1), load(n)
    added = sorted(set(new) - set(old))
    removed = sorted(set(old) - set(new))
    stripped = {k: v for k, v in new.items() if k != "sha256AtCommit"}
    print(f"  {n}: keys added {added} removed {removed}; rest equal: {stripped == old}")

print("== mutants-cdp-r1")
m = load("mutants-cdp-r1-2026-10-25.json")
res = m["results"]
outcomes = {}
for r in res:
    outcomes[r["outcome"]] = outcomes.get(r["outcome"], 0) + 1
print("  mutants field", m["mutants"], "killed field", m["killed"], "results", len(res), "outcomes", outcomes)
multi = [r["id"] for r in res if len(r.get("attempts", [])) != 1]
print("  results with other than 1 attempt:", multi, "| control attempts", len(m["control"]["attempts"]))
no_frag = [r["id"] for r in res if not r.get("edits") or any(not e.get("old") or "new" not in e for e in r["edits"])]
print("  results lacking an old/new fragment:", no_frag)
ids = [r["id"] for r in res]
print("  distinct ids:", len(set(ids)))
named = ["profile-owner-not-checked", "link-owner-not-checked", "link-trusted-whoever-made-it", "identity-inode-not-compared",
         "identity-device-not-compared", "identity-not-compared", "name-case-insensitive"]
for i in named:
    r = next((x for x in res if x["id"] == i), None)
    if r is None:
        print("  MISSING", i)
        continue
    first = r["failing"][0] if r.get("failing") else {}
    print(f"  {i}: {r['outcome']} exit {r['exit']} tests {r['testsRun']} edits {len(r['edits'])} failing {len(r.get('failing', []))} left {r.get('left')}")
    print(f"     first failing: {first.get('test', '')[:110]} | {first.get('firstErrorLine', '')[:110]}")
json.dump({r["id"]: r["edits"] for r in res if r["id"] in named}, open(sys.argv[2], "w"), indent=1)

print("== browser-files r1 records")
for n in ["browser-files-head-r1-2026-10-25.json", "browser-files-head-chrome154-r1-2026-10-25.json"]:
    b = load(n)
    pf = b["perFile"]
    att = sorted({len(f["attempts"]) for f in pf})
    passed = sum(1 for f in pf if f["passed"])
    first_pass = sum(1 for f in pf if f["attempts"] and f["attempts"][0]["exit"] == 0)
    left = sum(len(a.get("left", {}).get("entries", []) if isinstance(a.get("left"), dict) else a.get("left", [])) for f in pf for a in f["attempts"])
    c = b["combinedRun"]
    print(f"  {n}: version {b.get('browserVersion')} treeCommit {b['treeCommit'][:8]} files {len(pf)} passed {passed} first-attempt-pass {first_pass} attempt-counts {att} entries-left-over-all-attempts {left}")
    print(f"     combined exit {c['exit']} tests {c['tests']} passed {c['passed']} skipped {c['skipped']} left {c['left']}")

print("== chrome-matrix-head-r1")
cm = load("chrome-matrix-head-r1-2026-10-25.json")
for r in cm["rows"]:
    print(f"  {r['version']}: {r['status']} exit {r['exit']} tests {r['testsRun']} attempts {len(r['attempts'])} left {r['left']} singletonShapedLeft {r['singletonShapedLeft']}")
print("  holds", cm["holds"])

print("== test-lists-r1")
t = load("test-lists-r1-2026-10-25.json")
print(" ", {k: t[k] for k in ["baseLines", "headLines", "added", "removed", "addedByFile", "testsLine"]})

print("== verification-round1 ac3 and changed files")
v = load("verification-round1-2026-10-25.json")
print("  ac3.changedTestFiles", json.dumps(v["ac3"]["changedTestFiles"])[:900])
print("  changedOutsideTheEvidenceDirectory", v["changedOutsideTheEvidenceDirectory"])
print("  subject", {k: v["subject"][k] for k in ["codeCommit", "mainMerged", "headAtRecording", "gatesRunAtCommit", "appsAndConfigDiffSinceCodeCommit"]})
print("  review", v["subject"]["review"])
for k, g in v["gates"].items():
    print("  gate", k, {kk: g[kk] for kk in g if kk != "sha256"})
