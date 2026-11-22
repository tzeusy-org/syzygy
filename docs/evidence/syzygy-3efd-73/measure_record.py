"""Worst-case sizes of draft and inventory check records, from the stated caps (syzygy-3efd.73 (a), syzygy-3efd.74).

Builds, by hand and from the schema caps alone, the draft (or inventory) text a session could submit and the record
`check.ts` would write for it, encoded as check encodes it (`JSON.stringify(stored, null, 2)` plus a newline; Python's
`json.dumps(indent=2, ensure_ascii=False)` gives the same bytes for these ASCII values). Counts values and depth as
`parseBoundedJson` does (every value counts, keys do not; root at depth 0).

Every figure is a LOWER bound on the worst case: the skeleton is charged generously to the draft, only one cited path is used
(distinct paths, longer ones, redacted blobs and findings would all add record bytes), and ids are the shortest unique ones
except block ids, which take the 100-character cap because the record repeats them once per quotation.
"""
import json
import string
import sys

DRAFT_MAX_BYTES = 4 * 1024 * 1024
DRAFT_MAX_NODES = 500_000
READ = {"bytes": 16_777_216, "values": 2_000_000, "depth": 16}
OLD_INVENTORY_READ = {"bytes": 262_144, "values": 4096, "depth": 8}
LEAD_IN = "The project states:"
SKELETON_BYTES = 64 * 1024  # charged to the draft for everything but the claim blocks: generous
FIRST = string.ascii_letters + string.digits
REST = FIRST + "_.:-"


def ids():
    """Shortest unique handles matching ^[A-Za-z0-9][A-Za-z0-9_.:-]*$, in order."""
    n = 1
    while True:
        def rec(prefix, k):
            if k == 0:
                yield prefix
                return
            for ch in REST:
                yield from rec(prefix + ch, k - 1)
        for f in FIRST:
            yield from rec(f, n - 1)
        n += 1


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def values_and_depth(value, depth=0):
    if isinstance(value, dict):
        n, d = 1, depth
        for v in value.values():
            vn, vd = values_and_depth(v, depth + 1)
            n, d = n + vn, max(d, vd)
        return n, d
    if isinstance(value, list):
        n, d = 1, depth
        for v in value:
            vn, vd = values_and_depth(v, depth + 1)
            n, d = n + vn, max(d, vd)
        return n, d
    return 1, depth


def block(block_id, cite_ids, path):
    text = " ".join(f'{LEAD_IN} "a"' for _ in cite_ids)
    return {"id": block_id, "label": "inferred", "basis": "source", "text": text,
            "citations": [{"id": c, "path": path, "startLine": 1, "endLine": 1} for c in cite_ids],
            "quotations": list(cite_ids)}


def quotation(block_id, at, index, cite, path, blob_bytes):
    return {"blockId": block_id, "at": at, "index": index, "citationId": cite, "path": path,
            "objectId": "f" * 64, "algorithm": "sha256", "byteRange": [blob_bytes - 1, blob_bytes]}


def head(kind):
    common = {"format": "polaris-dossier-check/1" if kind == "draft" else "polaris-dossier-inventory-check/1",
              "runId": "r", "revision": 0, "supersedes": None, "pinnedRevision": "f" * 64,
              "checkedAt": "2026-11-22T00:00:00.000Z", "outcome": "passed"}
    return common


def draft_case(blob_bytes, path):
    """Claim blocks as table cells under deep dives' collapsible sections, 20 quotations each, filling the draft."""
    gen = ids()
    quotations, used, nodes = [], SKELETON_BYTES, 2000  # skeleton nodes, generous
    blocks = 0
    for d in range(30):
        for p in range(30):
            for e in range(30):
                for r in range(40):
                    for c in range(8):
                        block_id = ("B" + str(blocks)).ljust(100, "x")
                        cites = [next(gen) for _ in range(20)]
                        b = block(block_id, cites, path)
                        cost = len(compact(b).encode()) + 1
                        bn, _ = values_and_depth(b)
                        # container overhead per row/table/details/deep dive, charged per block: generous
                        cost += 64
                        bn += 4
                        if used + cost > DRAFT_MAX_BYTES or nodes + bn > DRAFT_MAX_NODES:
                            return blocks, used, nodes, quotations
                        used += cost
                        nodes += bn
                        at = f"$.deepDives[{d}].paragraphs[{p}].elements[{e}].rows[{r}].cells[{c}]"
                        for i, cite in enumerate(cites):
                            quotations.append(quotation(block_id, at, i, cite, path, blob_bytes))
                        blocks += 1
    return blocks, used, nodes, quotations


def inventory_case(blob_bytes, path, entries_cap=2000, per_entry=20, block_id_len=100):
    gen = ids()
    quotations, used = [], 4096
    for k in range(entries_cap):
        entry_id = ("E" + str(k)).ljust(block_id_len, "x")
        cites = [next(gen) for _ in range(per_entry)]
        e = {"id": entry_id, "kind": "term", "label": "inferred",
             "statement": " ".join(f'{LEAD_IN} "a"' for _ in cites),
             "citations": [{"id": c, "path": path, "startLine": 1, "endLine": 1} for c in cites],
             "quotations": cites}
        used += len(compact(e).encode()) + 1
        for i, cite in enumerate(cites):
            quotations.append(quotation(entry_id, f"$.entries[{k}]", i, cite, path, blob_bytes))
    return used, quotations


def record(kind, quotations, path):
    """Every member check writes for the subject, in check.ts's order, the members other than the quotation lists in short
    real forms (the shortest the code writes, so every figure stays a lower bound)."""
    rec = dict(head(kind))
    rec[kind] = {"file": f"{kind}s/rev-0.json", "sha256": "f" * 64, "bytes": 1}
    if kind == "draft":
        rec["session"] = {"sessionId": None, "declaredBy": "the authoring session", "label": "Inferred"}
        rec["findings"] = []
        rec["executionFlags"] = {"applies": False, "why": "the brief carried SEC-3's rule and permitted no execution, so no reported command is flagged"}
    else:
        rec["session"] = {"number": 1, "sessionId": "s", "declaredBy": "the inventory session", "label": "Inferred",
                          "distinctFrom": "every session identifier declared by the 1 frozen draft revision(s)"}
        rec["findings"] = []
    rec["quotations"] = quotations
    rec["excludedContent"] = []
    rec["citedBlobs"] = [{"path": path, "objectId": "f" * 64, "read": True, "outcome": "admitted"}]
    rec["screeningPolicy"] = {"policyId": "p", "policyVersion": "1", "sha256": "f" * 64}
    rec["credential"] = {"required": False, "why": "the brief carried SEC-3's rule and permits no execution"}
    limits = {"repairCycles": {"declared": 1, "thisRevision": 0, "label": "Inferred", "basis": f"the frozen {kind} revisions in the run directory"}}
    if kind == "draft":
        limits["questions"] = {"declared": 0, "recorded": 0}
    limits["deadline"] = {"endsAt": "2026-11-22T00:00:00.000Z", "label": "Inferred",
                          "basis": "the issue instant the brief record states, plus the declared deadline"}
    rec["limits"] = limits
    if kind == "inventory":
        rec["counts"] = "only once the launch form of inventory session 1 is recorded"
        rec["completeness"] = {"label": "Inferred", "basis": "the inventory's completeness over the clone and its preparation from the whole source population, which are the inventory session's self-report and never verified"}
    rec["label"] = "Inferred"
    return rec


def measure(rec):
    text = json.dumps(rec, indent=2, ensure_ascii=False) + "\n"
    n, d = values_and_depth(rec)
    return {"bytes": len(text.encode()), "values": n, "depth": d}


def smallest_past_old_inventory_bound():
    """Fewest quotations (1-character entry ids, 1-character path, 2-byte byte ranges) that take an inventory record past the
    reader bound `inventoryOfRecord` applies today (262,144 bytes, 4,096 values, depth 8)."""
    for q in range(1, 5000):
        entries = (q + 19) // 20
        quotations = []
        gen = ids()
        for k in range(entries):
            for i in range(min(20, q - 20 * k)):
                quotations.append(quotation(str(k), f"$.entries[{k}]", i, next(gen), "a", 2))
        m = measure(record("inventory", quotations, "a"))
        if m["values"] > OLD_INVENTORY_READ["values"] or m["bytes"] > OLD_INVENTORY_READ["bytes"]:
            return q, m
    return None, None


def main():
    blob = 2 ** 30  # the check reader's default object bound (git-object-reader.ts, objectBytes 2 ** 30)
    out = {}
    blocks, used, nodes, qs = draft_case(blob, "a")
    out["draft"] = {"blocks": blocks, "quotations": len(qs), "draftBytesCharged": used, "draftNodesCharged": nodes,
                    "record": measure(record("draft", qs, "a"))}
    used_i, qi = inventory_case(blob, "a")
    out["inventoryAtCaps"] = {"entries": 2000, "quotations": len(qi), "inventoryBytes": used_i,
                              "record": measure(record("inventory", qi, "a"))}
    path14 = "a" * 14
    used_p, qp = inventory_case(blob, path14)
    out["inventoryAtCapsPath14"] = {"entries": 2000, "quotations": len(qp), "inventoryBytes": used_p,
                                    "withinDraftBound": used_p <= DRAFT_MAX_BYTES,
                                    "record": measure(record("inventory", qp, path14))}
    # One cited blob that screening keeps as a redacted span (policy v4): its record entry lists every withheld line range.
    # Lines alternate: a withheld line of L bytes (newline included) and an empty line, so a blob of B bytes has B // (L + 1)
    # withheld ranges of one line each. Per-range record bytes measured from two encodings.
    def redacted(n):
        rec = record("draft", [], "a")
        rec["citedBlobs"] = [{"path": "a", "objectId": "f" * 64, "read": True, "outcome": "admitted",
                              "redaction": {"redactionClass": "redacted-span", "withheldLines": n, "detectorIds": ["d"],
                                            "withheldLineRanges": [[2 * k + 1, 2 * k + 1] for k in range(n)]}}]
        return measure(rec)["bytes"]
    per_range = (redacted(2000) - redacted(1000)) / 1000  # four-digit line numbers: the smallest rate that matters
    lo, hi = 1, 400_000
    while lo < hi:  # the fewest ranges whose record, encoded, is past the byte bound
        mid = (lo + hi) // 2
        if redacted(mid) > READ["bytes"]:
            hi = mid
        else:
            lo = mid + 1
    out["redactedBlob"] = {"recordBytesPerWithheldRangeAtFourDigitLines": per_range, "fewestRangesPastReadBound": lo,
                           "recordBytesAtThatCount": redacted(lo),
                           "longestWithheldLineThatPassesWithOneBlob": blob // lo - 1}
    q, m = smallest_past_old_inventory_bound()
    out["inventoryPastToday'sReaderBound"] = {"quotations": q, "record": m}
    out["readBound"] = READ
    json.dump(out, sys.stdout, indent=2)
    print()


if __name__ == "__main__":
    main()
