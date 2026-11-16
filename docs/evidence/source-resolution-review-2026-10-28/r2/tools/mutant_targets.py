"""For each row of mutants-8fcf409c.json: did any edited file or any test file it runs change between 8fcf409c and a607bb62?
Run from a checkout root (reads blobs by git show; touches no worktree file)."""
import hashlib, json, subprocess
rec = json.load(open("docs/evidence/syzygy-bpyt-4-2/mutants-8fcf409c.json"))
def blob(c, p):
    r = subprocess.run(["git", "show", f"{c}:{p}"], capture_output=True); return r.stdout if r.returncode == 0 else None
changed = []
for m in rec["mutants"]:
    ed = [p for p in m["edits"] if blob("8fcf409c", p) != blob("a607bb62", p)]
    ts = [p for p in m["tests"] if blob("8fcf409c", p) != blob("a607bb62", p)]
    frag = all((blob("a607bb62", p) or b"").decode().count(e["old"]) == 1 or e["old"] == "" for p, es in m["edits"].items() for e in es)
    if ed or ts: changed.append(m["id"])
    print(m["id"], "editedChanged", ed, "testsChanged", ts, "fragmentsOnceAtHead", frag)
print("rows", len(rec["mutants"]), "with a changed target or test", len(changed), changed)
