"""The widest bounded check record (version 2.10), measured as check encodes it.

The bounded record keeps only members whose size does not grow with the draft or inventory: the head, the subject's file entry,
the session, `findings` holding the one `check-record-bound` finding, `screeningPolicy`, `credential`, `limits`, `label` and, for
an inventory, `counts` and `completeness`. The screening policy's identifier and version (Syzygy's own) are charged at 4,096 code units of 6-byte escapes each.
The credential reason is charged at its real cap: its widest form is `adapter credentials readable by the operator's user: `
followed by the listed paths joined by `, `, and the list comes from a file the agent sessions can write, of at most 65,536
bytes (`credential-probe.ts`, `LIST_MAX_BYTES`), each path JSON-escaped there as the record escapes it, so the joined paths
take at most 65,536 bytes in the record; they are charged as 10,923 six-byte escapes (65,538 bytes). Its other forms name the
list file's path, which the operator's environment gives, at most twice: charged at 4,096 six-byte escapes each, they are
shorter than the widest form; every count is
Number.MAX_SAFE_INTEGER; the session identifier its 200-character cap.
"""
import json

MAX = 9007199254740991
WIDE = "\u0001" * 4096  # 6 bytes per code unit when encoded


def detail():
    return (f"the check record would take {MAX} bytes, {MAX} values and {MAX} levels below its root, past the read bound of "
            f"16,777,216 bytes, 2,000,000 values and 16 levels; it would hold {MAX} verified quotations, {MAX} excluded "
            f"quotations, {MAX} cited files and {MAX} other findings, which this record leaves out: quote and cite less, then "
            "check again")


def bounded(kind):
    rec = {
        "format": "polaris-dossier-check/1" if kind == "draft" else "polaris-dossier-inventory-check/1",
        "runId": "run-" + "f" * 32, "revision": MAX, "supersedes": MAX - 1, "pinnedRevision": "f" * 64,
        "checkedAt": "2026-11-22T00:00:00.000Z", "outcome": "findings",
        ("draft" if kind == "draft" else "inventory"): {"file": f"{kind}s/rev-{MAX}.json", "sha256": "f" * 64, "bytes": MAX},
        "session": {"sessionId": "x" * 200, "declaredBy": "the authoring session", "label": "Inferred"} if kind == "draft" else
                   {"number": MAX, "sessionId": "x" * 200, "declaredBy": "the inventory session", "label": "Inferred",
                    "distinctFrom": f"every session identifier declared by the {MAX} frozen draft revision(s)"},
        "findings": [{"kind": "check-record-bound", "at": "$", "detail": detail()}],
        "screeningPolicy": {"policyId": WIDE, "policyVersion": WIDE, "sha256": "f" * 64},
        "credential": {"required": True, "passed": False,
                       "finding": {"kind": "adapter-credential-readable", "step": "check", "at": "2026-11-22T00:00:00.000Z",
                                   "why": "adapter credentials readable by the operator's user: " + "\u0001" * 10923, "instruction": "Run no further observed code: the permission to build and run "
                                   "the observed project has lapsed for this run."}},
        "limits": {"repairCycles": {"declared": MAX, "thisRevision": MAX, "label": "Inferred",
                                    "basis": f"the frozen {kind} revisions in the run directory"},
                   **({"questions": {"declared": MAX, "recorded": MAX}} if kind == "draft" else {}),
                   "deadline": {"endsAt": "2026-11-22T00:00:00.000Z", "label": "Inferred",
                                "basis": "the issue instant the brief record states, plus the declared deadline"}},
    }
    if kind == "inventory":
        rec["counts"] = f"only once the launch form of inventory session {MAX} is recorded"
        rec["completeness"] = {"label": "Inferred", "basis": "x" * 4096}
    rec["label"] = "Inferred"
    return rec


def depth(v, d=0):
    if isinstance(v, dict):
        return max([d] + [depth(x, d + 1) for x in v.values()])
    if isinstance(v, list):
        return max([d] + [depth(x, d + 1) for x in v])
    return d


def count(v):
    if isinstance(v, dict):
        return 1 + sum(count(x) for x in v.values())
    if isinstance(v, list):
        return 1 + sum(count(x) for x in v)
    return 1


for kind in ("draft", "inventory"):
    r = bounded(kind)
    text = json.dumps(r, indent=2) + "\n"  # ensure_ascii: \u0001 is escaped as JS escapes it
    print(kind, {"bytes": len(text.encode()), "values": count(r), "depth": depth(r)})
