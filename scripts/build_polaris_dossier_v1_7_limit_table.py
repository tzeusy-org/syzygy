#!/usr/bin/env python3
"""Generate and check the v1.7 limit-pair table (bead `syzygy-fnry.19`, round 6).

The table walks every pair of a repair-cycle limit R and a design-repair limit
D from 0 to 2 through two short revision streams. For each check and review
check it lists what three texts of the candidate dossier spec v1.7 decide:

- REQ-033's rule: a check or review check is measured by the revision it
  checks or reviews (or from which the pages it reviews were rendered),
  against D for a design-repair revision and R for any other, the first
  revision counting against neither; it is refused when that revision's count
  exceeds the limit.
- REQ-034's rule, written in its own form: a resubmission's check is refused
  when the revisions already counted against its limit, before it, equal the
  limit; every review check of it or its pages is refused when its count,
  itself included, exceeds the limit.
- REQ-034's falsifier: a refusal for a limit is flagged when the revision's
  count does not exceed that limit, and proceeding is flagged when it does.

Each predicate is coded on its own from its own sentence, so the table is a
three-way comparison, not one rule printed three times. A row agrees when
REQ-033 and REQ-034 give the same outcome and the falsifier flags neither
that outcome. A stream stops at its first refused check: a refused check
freezes no revision, so the class of the next resubmission is unchanged and
every later resubmission is refused the same way.

The candidate package directory holds no code, so this script lives here and
writes `LIMIT-PAIR-TABLE.md` there.

    --write     regenerate the table file
    --check     require the table file to equal its regeneration and every row to agree
    --selftest  mutate each predicate and require a disagreement to be found
"""
from __future__ import annotations

import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / ".syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-7/LIMIT-PAIR-TABLE.md"

# Classes: "first" (revision 1), "RC" (counts against the repair-cycle limit),
# "DR" (a design-repair revision, counts against the design-repair limit).
STREAMS = {
    "A": ["first", "RC", "DR", "RC", "DR", "RC"],
    "B": ["first", "DR", "RC", "DR", "RC", "DR"],
}
KINDS = ["check", "fidelity review check", "rendered-design review check of its pages"]


def req033(cls, count, R, D):
    """REQ-033: refuse when the revision's count exceeds its limit; first counts against neither."""
    if cls == "first":
        return "proceed"
    limit = D if cls == "DR" else R
    name = "design-repair" if cls == "DR" else "repair-cycle"
    return f"refuse ({name})" if count > limit else "proceed"


def req034(cls, already, kind, R, D):
    """REQ-034: a check is refused when the revisions already counted equal the limit;
    a review check when the reviewed revision's count, itself included, exceeds it."""
    if cls == "first":
        return "proceed"
    limit = D if cls == "DR" else R
    name = "design-repair" if cls == "DR" else "repair-cycle"
    if kind == "check":
        return f"refuse ({name})" if already >= limit else "proceed"
    return f"refuse ({name})" if already + 1 > limit else "proceed"


def falsifier(cls, count, R, D):
    """REQ-034 Falsifier, mirrored: which outcome would be flagged as a failure."""
    if cls == "first":
        return "flags any refusal for a limit"
    if cls == "DR":
        return ("flags proceeding" if count > D
                else "flags a refusal for either limit")
    return ("flags proceeding" if count > R
            else "flags a refusal for the repair-cycle limit")


def flagged(outcome, flag):
    if outcome == "proceed":
        return flag == "flags proceeding"
    return flag in ("flags any refusal for a limit", "flags a refusal for either limit") or (
        flag == "flags a refusal for the repair-cycle limit" and "repair-cycle" in outcome)


def rows(r033=req033, r034=req034, fals=falsifier):
    out = []
    for R in range(3):
        for D in range(3):
            for stream, classes in STREAMS.items():
                counted = {"RC": 0, "DR": 0}
                for rev, cls in enumerate(classes, start=1):
                    already = counted.get(cls, 0)
                    count = already + 1 if cls != "first" else 0
                    stop = False
                    for kind in KINDS:
                        a, b, f = r033(cls, count, R, D), r034(cls, already, kind, R, D), fals(cls, count, R, D)
                        agree = a == b and not flagged(a, f)
                        out.append((R, D, stream, rev, cls, "-" if cls == "first" else count, kind, a, b, f, agree))
                        if kind == "check" and a != "proceed":
                            stop = True
                            break
                    if stop:
                        break
                    if cls != "first":
                        counted[cls] += 1
    return out


def render(table):
    lines = [
        "# Limit-pair table — Polaris dossier local-agent mode, version 1.7",
        "",
        "> **Candidate — binds nothing.** [Observed] Generated by",
        "> `scripts/build_polaris_dossier_v1_7_limit_table.py --write`; `--check`",
        "> requires this file to equal its regeneration. It is a review aid for the",
        "> REQ-033 and REQ-034 limit rules, never authority; the spec text governs.",
        "",
        "R is the repair-cycle limit and D the design-repair limit. Class `first` is",
        "the first draft revision, `RC` a revision counting against R, `DR` a",
        "design-repair revision counting against D. Count is the revision's count",
        "against its limit, itself included. Stream A is first, RC, DR, RC, DR, RC;",
        "stream B is first, DR, RC, DR, RC, DR. A stream stops at its first refused",
        "check, since a refused check freezes no revision and the next resubmission",
        "has the same class. Agree means REQ-033 and REQ-034 give the same outcome",
        "and the falsifier does not flag it.",
        "",
        f"Rows: {len(table)}; rows that agree: {sum(r[-1] for r in table)}.",
        "",
        "| R | D | Stream | Rev | Class | Count | Check | REQ-033 | REQ-034 | Falsifier | Agree |",
        "|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in table:
        lines.append("| " + " | ".join(str(x) if not isinstance(x, bool) else ("yes" if x else "NO") for x in r) + " |")
    return "\n".join(lines) + "\n"


def check():
    table = rows()
    findings = []
    bad = [r for r in table if not r[-1]]
    if bad:
        findings.append(f"{len(bad)} row(s) disagree, first: {bad[0]}")
    if not OUT.exists() or OUT.read_text(encoding="utf-8") != render(table):
        findings.append(f"{OUT.relative_to(ROOT)} differs from its regeneration; run --write")
    return findings


def selftest():
    def m033(cls, count, R, D):  # 'spent' reading: refuse once the limit is reached
        if cls == "first":
            return "proceed"
        limit = D if cls == "DR" else R
        return f"refuse ({'design-repair' if cls == 'DR' else 'repair-cycle'})" if count >= limit else "proceed"

    def m034(cls, already, kind, R, D):  # review checks refused once the limit is spent
        if cls == "first" or kind == "check":
            return req034(cls, already, kind, R, D)
        limit = D if cls == "DR" else R
        return f"refuse ({'design-repair' if cls == 'DR' else 'repair-cycle'})" if already + 1 >= limit else "proceed"

    def m034rc(cls, already, kind, R, D):  # design repairs also bound by R
        out = req034(cls, already, kind, R, D)
        return "refuse (repair-cycle)" if out == "proceed" and cls == "DR" and R == 0 else out

    def mfals(cls, count, R, D):  # the round-5 unscoped disjunct
        if cls == "DR" and count > D:
            return "flags a refusal for either limit"
        return falsifier(cls, count, R, D)

    cases = {"REQ-033 spent reading": dict(r033=m033), "REQ-034 review spent reading": dict(r034=m034),
             "REQ-034 repair-cycle binds design repairs": dict(r034=m034rc), "round-5 falsifier": dict(fals=mfals)}
    failing = 0
    for name, kw in cases.items():
        caught = any(not r[-1] for r in rows(**kw))
        print(f"  {name}: {'caught' if caught else 'SURVIVED'}")
        failing += not caught
    base_ok = all(r[-1] for r in rows())
    print(f"  unmutated table agrees: {base_ok}")
    failing += not base_ok
    print(f"{len(cases) + 1} fixtures, {failing} failing")
    return 1 if failing else 0


def main(argv):
    if argv == ["--write"]:
        OUT.write_text(render(rows()), encoding="utf-8")
        print(f"wrote {OUT.relative_to(ROOT)}")
        return 0
    if argv == ["--check"]:
        findings = check()
        for f in findings:
            print(f"FAIL: {f}")
        if not findings:
            t = rows()
            print(f"OK: {len(t)} rows, {sum(r[-1] for r in t)} agree")
        return 1 if findings else 0
    if argv == ["--selftest"]:
        return selftest()
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
