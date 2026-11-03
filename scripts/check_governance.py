#!/usr/bin/env python3
"""Repository-wide governance checks for Syzygy — read-only, portable.

Run from the repository root:

    python3 scripts/check_governance.py

Exit status: 0 = no findings, 1 = at least one FAIL finding, 2 = usage error.

Design constraints (charter §17, "public, portable validation"):

  * **Repository-relative.** The repo root is derived from this file's own
    location, and **no founder-machine absolute path is ever resolved**. The
    only ones present are inert fixture *inputs* CG-19 exists to reject (see
    `--selftest` cases F4b, F5a, F5b); no filesystem access occurs against
    them. The earlier form of this sentence — "no founder-machine absolute
    path appears anywhere" — was false against three lines of this file, in
    a repository whose own term registry says an artifact must not contradict
    itself in the first line and the third (review RD-17, finding 12).
  * **Standard library only**, Python 3.9+. No installs, no network.
  * **Read-only.** This script never writes, moves, or rewrites a governance
    artifact. When a check finds a defect it *reports* it; correcting a
    normative artifact is a human act under the normative-change workflow.
  * **Every summary line states its denominator.** A check that examined zero
    items reports WARN — "PASS over nothing examined" is the failure mode this
    project exists to prevent (VIS-2: no evidence yields Unknown, never green).
  * **Allowlists are declared inline, counted, and printed.** A silent
    exemption is indistinguishable from a missing check.

Checks
------
  CG-1   internal links and path references resolve; an active route into
         `rfcs/**` is a broken pointer, not a by-design absence (CG-1g)
  CG-2   retired acceptance phrases are confined, current ones carry live
         arguments even across a line wrap, and `about/` is absent from
         active instructions. Phrase population:
         `candidates/ACCEPTANCE-PHRASE-REGISTRY.yaml`
  CG-3   stale bootstrap routing (`_bootstrap/prompts/`) absent
  CG-4   candidate homes carry candidate banners (CG-4a) and claim no
         acceptance (CG-4b)
  CG-5   canonical craft banners are truthful
  CG-6   accepted homes do not exist yet (created only by owner acts)
  CG-7   ACTIVE-CONTRACT-MANIFEST and unperformed-wave row digests are
         current; performed-wave manifests match their recorded act arguments
         and all six path sets partition the active set; each wave row's
         stated module count matches its manifest (CG-7f);
         `wave-manifests/` holds exactly six (CG-7g)
  CG-8   default-load size and context budgets reported, never enforced
         (the default-load set and AGENTS.md band are this file's own
         operating figures; charter §11.4 decomposition triggers)
  CG-9   authority-home files sit under their one home (a path test, not
         a duplicate-content test)
  CG-10  pending-decision register as-of line reported
  CG-11  `.syzygy/cache/` and `.syzygy/local/` are git-ignored
  CG-12  no active artifact cites a `_bootstrap/` path as a required source
  CG-13  dependency edges resolve; a package README equals its module union
  CG-14  acceptance-record install sources and destinations are valid
  CG-15  truncated digest quotes still prefix a current argument
  CG-16  the term registry is never described as accepted
  CG-17  every RFC 0006-0011 clause is routed exactly once
  CG-18  context fixtures still recompute (digest and word count)
  CG-19  substrate pins are complete and well-formed; drift is consistent
         and carries a disposition
  CG-20  the routing artifacts state no measurement (advisory — the rule has
         no written owner yet; see CHECK_OWNERS)
  CG-21  contract prose states no measurement (advisory — same)
  CG-22  no unqualified `status` in the active lane — the term registry's
         five-dimension rule (§1, candidate), made executable; CG-22c checks
         the qualifier list still covers the registry's five dimensions
  CG-23  advanced vocabulary on the default public path, reported (the
         term registry's two-tier bound, candidate)
  CG-24  which check families have a `--selftest` fixture, computed
  CG-25  every check family names the authoritative rule it enforces
         (`CHECK_OWNERS`); a check whose rule lives only in this file is
         downgraded to WARN with the reason printed

`--selftest` runs a synthetic failing input against the checks that have a
fixture — **not against every check above**. That distinction is the point:
a validator never shown to fail is indistinguishable from a no-op, and this
repository has shipped one (charter §18). CG-24 computes which families are
covered and prints the denominator every run, so the claim cannot drift from
the fixture set the way a sentence does.

Status vocabulary: OK (examined > 0, no findings) · WARN (nothing examined, or
a report-only observation) · FAIL (findings that fail the run).
"""

import argparse
from datetime import datetime
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SELF_REL = os.path.relpath(os.path.abspath(__file__), ROOT).replace(os.sep, "/")

CANDIDATES = ".syzygy/governance/contracts/candidates"
TOPOLOGY_CANDIDATES = ".syzygy/map/topology-candidates"
CRAFT = ".syzygy/governance/policies/craft-and-care"
DOCTRINE = ".syzygy/governance/doctrine"
DECISIONS = ".syzygy/governance/decisions"


# ------------------------------------------------------------ check owners

#: **Which written rule does this check enforce, and where does that rule
#: live?** Review RD-17 finding 11 swept the whole corpus for citations of a
#: `CG-\d+` identifier — 70 files, 692 citations — and found not one inside
#: doctrine, craft-and-care, or any contract module. The battery could not
#: distinguish, in its own output, a FAIL against adopted doctrine from a FAIL
#: against a candidate whose own banner says it binds nothing, and a reader
#: had no register to consult.
#:
#: An entry is one of three shapes, and the shape is the claim:
#:
#:   * an **identifier** (`VIS-2`, `SDR-9`, `RFC3-16`) plus the file that
#:     defines it — the check enforces adopted or owner-approved text;
#:   * `mechanical — …` — the check verifies self-consistency and needs no
#:     normative owner. A digest either matches its subject or does not;
#:     nobody has to rule on that.
#:   * `candidate: <path>` — the rule is written, but in material with no
#:     owner act. The FAIL still fires; the printed owner is what stops it
#:     reading as a doctrine breach.
#:
#: Keyed by check family. CG-25 fails the battery when a FAIL-capable check
#: reported this run has no entry here, so a new check cannot ship
#: unattributed.
CHECK_OWNERS = {
    "CG-1": ("mechanical — a path reference resolves in a clone or it does "
             "not; the citing file states the claim"),
    "CG-2": ("record: `FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md` §1 "
             "— \"Two phrases are retired and satisfy nothing\". The "
             "acceptance record is the acceptance authority; this is not a "
             "doctrine clause. Population declared in "
             "ACCEPTANCE-PHRASE-REGISTRY.yaml"),
    "CG-3": ("mechanical — `_bootstrap/prompts/` is absent from every clone, "
             "so a route to it is unexecutable"),
    "CG-4": ("VIS-4 (`doctrine/vision.md`) — \"Humans steer the vision; "
             "agents shape within it.\" Only the owner accepts, so candidate "
             "material may not be labelled accepted (AGENTS.md hard "
             "prohibition, citing VIS-4)"),
    "CG-5": ("VIS-1 (`doctrine/vision.md`) — \"Comprehensible truth first; "
             "never comprehensible fiction.\" A banner is a claim about the "
             "artifact it heads, and a false one is fiction a reader cannot "
             "see through"),
    "CG-6": ("VIS-4 (`doctrine/vision.md`) — an accepted home is created by "
             "an owner act and by nothing else; the acceptance record's §2 "
             "ceremony is where each home's creating act is written"),
    "CG-7": ("record: `FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md` "
             "§1-§2 — an act binds exactly the bytes its digest argument "
             "names. RFC3-16 is cited *by* that record and is itself "
             "candidate, so the record is the anchor, not the clause"),
    "CG-8": ("report-only; never fails. The decomposition triggers are "
             "`round-2026-08/OWNER-ROUND-CHARTER.md` §11.4, transcribed by "
             "the candidate CC-BUDGET-1 (owner item P-12). The default-load "
             "set, the AGENTS.md 900–1,200 authored-word band and "
             "TOKENS_PER_WORD are **this file's own operating figures**: no "
             "governing artifact states them. They were cited to charter "
             "§7.1/§7.3, which no tracked charter has (review RD-6 F-1)"),
    "CG-9": ("mechanical — two copies of an authority artifact make \"which "
             "one binds\" undecidable. **No clause states the one-home rule**; "
             "the nearest written statement is AGENTS.md's routing table, "
             "which says of itself that it is never citable as authority. "
             "The check tests paths only: duplicated *content* in another "
             "home is invisible to it (RD-6 F-4)"),
    "CG-10": ("VIS-2 (`doctrine/vision.md`) — \"No evidence means Unknown, "
              "not success.\" A register with no as-of line makes its own "
              "currency Unknown, and Unknown is not current"),
    "CG-11": ("mechanical — `.syzygy/cache/` and `.syzygy/local/` are "
              "declared machine-local; a clone must not carry them"),
    "CG-12": ("mechanical — `_bootstrap/**` is git-excluded, so a clone "
              "cannot resolve the pointer; what fails is the citing "
              "artifact's own claim that the source is available"),
    "CG-13": ("mechanical — a declared `depends_on` edge resolves inside the "
              "package, and a README is the union of its modules"),
    "CG-14": ("mechanical — a ceremony step names a location that exists in "
              "a clone, or an act-created home that does not yet"),
    "CG-15": ("record: `FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md` "
              "§1 — a truncated digest quote is still a promise about the "
              "artifact the record binds"),
    "CG-16": ("VIS-4 (`doctrine/vision.md`) — only the owner adopts, so an "
              "unaccepted registry may not acquire authority by being cited "
              "as adopted"),
    "CG-17": ("candidate: `SURFACE-CLAUSE-ROUTING-MATRIX.md` — every surface "
              "clause takes exactly one phase route. Mechanically it is a "
              "completeness check over that matrix's own enumeration"),
    "CG-18": ("mechanical — a fixture's stated digest and word count "
              "recompute from the files it names"),
    "CG-19": ("record: `GOVERNANCE-SUBSTRATE-LOCK.yaml` §verification — the "
              "lock's own rule that a pin is complete, public, and not "
              "machine-local. The lock's header calls itself \"record, never "
              "authority\"; no doctrine clause covers substrate pinning. "
              "The lock declares no vocabulary of its own: `LOCK_META_KEYS`, "
              "`LOCK_NONPIN_SECTIONS`, `LOCK_FORGE_ALLOW` and "
              "`LOCK_DISPOSITIONS` are this file's (RD-6 F-3 row 7)"),
    "CG-20": ("**Python-only — downgraded to WARN.** The rule *the context-"
              "load map states no measurement of the corpus it routes* is "
              "stated in this file's docstring and nowhere else; the nearest "
              "prose is a round narrative report, not a clause"),
    "CG-21": ("**Python-only — downgraded to WARN.** The rule *a contract "
              "module states no measurement* is stated in this file's "
              "docstring and nowhere else (review RD-17 finding 11)"),
    "CG-22": ("candidate: `policy-candidates/TERM-REGISTRY.md` §1 — whose "
              "own third line reads 'Status: CANDIDATE. This file binds "
              "nothing.' The FAIL is real; the owner is not. "
              "`STATUS_QUALIFIERS` stays a list here rather than being "
              "derived, because the registry names its dimensions in prose "
              "forms (\"Claim epistemic label\") a reader never writes, and "
              "three entries are not §1 dimension-row names (the registry "
              "states each elsewhere: T-16's alias, the chain-state alias "
              "and the §1 rule); "
              "CG-22c checks the list against the registry's table instead "
              "(RD-6 F-3 row 1)"),
    "CG-23": ("report-only — the term registry's own two-tier bound, "
              "candidate; never fails. Earlier cited to charter §9.3, which "
              "no tracked charter has (RD-6 F-1)"),
    "CG-24": ("mechanical — which check families have a fixture, computed"),
    "CG-25": ("mechanical — this table's own completeness over the "
              "FAIL-capable checks reported this run"),
    "CG-26": ("record: `PROJECT-STATUS.md` §\"How to verify this page\" — its "
              "own sentence that the published checks \"are the same\" ones "
              "the hosted workflow runs, and the workflow header's matching "
              "statement that the step list is the hosted denominator. Both "
              "are claims the repository makes about itself; this check is "
              "their enforcement"),
    "CG-27": ("candidate: `policy-candidates/CRAFT-KNOWLEDGE-HYGIENE-POLICY-"
              "COMPACT.md` **CC-KNOW-11** ¶2 — \"Prose asserting what is "
              "currently true carries its as-of revision and is never the "
              "sole source for the fact it states.\" The policy is queued as "
              "P-12 and binds nothing yet, which is why this check is "
              "advisory"),
}

#: Checks whose rule exists **only** in this file. Downgraded to WARN until
#: the rule acquires a written owner through the normative-change workflow;
#: the intended home is the compact knowledge-hygiene policy (launch-gate
#: finding C2, routed to R-SCR — the policy text itself is outside this
#: file's remit and is recorded as a handoff in
#: `round-2026-08e/VALIDATOR-AUTHORITY-INVENTORY.md`).
#:
#: A downgrade is not a silencing: the findings still print, with their
#: denominators, and the reason prints beside them. What it stops is a
#: repository-wide `exit 1` enforced by a rule nobody has ruled on.
PYTHON_ONLY_RULES = {
    "CG-20": "rule stated only in check_governance.py — advisory until the "
             "knowledge-hygiene policy is adopted (RD-17 f11, gate C2)",
    "CG-21": "rule stated only in check_governance.py — advisory until the "
             "knowledge-hygiene policy is adopted (RD-17 f11, gate C2)",
}

#: Checks whose rule *does* have a written home, but a **candidate** one that
#: no owner act has made binding. Kept separate from `PYTHON_ONLY_RULES`
#: because the two states are different and the distinction is the whole
#: subject of this repository: a rule nobody wrote is not a rule nobody ruled
#: on. Both downgrade to WARN; only this table can be emptied by an act.
#:
#: The owner charter's §11.4 states the condition directly — *"the rule must
#: have an authoritative policy home before the validator is binding"* — and a
#: candidate home is not an authoritative one.
CANDIDATE_HOME_RULES = {
    "CG-27": "rule's home is CC-KNOW-11 in the candidate knowledge-hygiene "
             "policy — advisory until P-12 is ruled",
}

#: The downgrade lookup both tables feed. One place, so a new advisory table
#: cannot be forgotten at the twenty-six call sites.
ADVISORY_RULES = dict(PYTHON_ONLY_RULES, **CANDIDATE_HOME_RULES)


def check_family(name):
    """`CG-7a  manifest digests valid…` -> `CG-7`. Empty for a non-CG row."""
    m = re.match(r"\s*(CG-\d+)", name or "")
    return m.group(1) if m else ""


# --------------------------------------------------------------- results

class Results:
    """One summary line per check, plus finding detail lines beneath it."""

    def __init__(self):
        self.summaries = []
        self._fail = False
        self.downgraded = []

    def add(self, status, name, examined, findings, unit="item",
            note=None, details=()):
        fam = check_family(name)
        # A FAIL is a claim that some written rule was broken. Downgraded
        # here — once, centrally — when that rule has no home the owner has
        # made binding: either it exists only in this file, or its home is a
        # candidate nobody has ruled on. Doing it at the call sites would mean
        # twenty-six places to forget.
        if status == "FAIL" and fam in ADVISORY_RULES:
            status = "WARN"
            note = ((note + " — ") if note else "") + ADVISORY_RULES[fam]
            if fam not in self.downgraded:
                self.downgraded.append(fam)
        if status == "FAIL":
            self._fail = True
        self.summaries.append((status, name, examined, findings, unit, note,
                               list(details)))

    def failed(self):
        return self._fail

    @staticmethod
    def _plural(n, unit):
        if n == 1:
            return unit
        return unit[:-1] + "ies" if unit.endswith("y") else unit + "s"

    def report(self):
        for status, name, examined, findings, unit, note, details in self.summaries:
            line = (f"{status:4s}  {name} — {examined} "
                    f"{self._plural(examined, unit)} examined, "
                    f"{findings} finding{'' if findings == 1 else 's'}")
            if note:
                line += f" — {note}"
            print(line)
            # A FAIL names the rule it enforces, on the same screen as the
            # finding. Without it a reader cannot tell a breach of adopted
            # doctrine from a breach of a candidate that binds nothing
            # (review RD-17, finding 11).
            if status == "FAIL":
                owner = CHECK_OWNERS.get(
                    check_family(name),
                    "[Unknown] — this check names no authoritative rule; "
                    "CG-25 reports it")
                print(f"        rule: {owner}")
            for d in details:
                print(f"        {d}")
        n_fail = sum(1 for s, *_ in self.summaries if s == "FAIL")
        n_warn = sum(1 for s, *_ in self.summaries if s == "WARN")
        n_ok = sum(1 for s, *_ in self.summaries if s == "OK")
        print(f"\n{n_ok} OK, {n_warn} WARN, {n_fail} FAIL "
              f"({len(self.summaries)} checks) — counts derived, not asserted")


# --------------------------------------------------------------- corpus

def _git(*args):
    try:
        out = subprocess.run(["git", "-C", ROOT, *args],
                             capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.SubprocessError):
        return None
    if out.returncode != 0:
        return None
    return out.stdout.splitlines()


def corpus_paths(scope):
    """Repo-relative paths a clone would (or will) contain.

    `tracked` is `git ls-files`. The default `clone` scope adds untracked
    files that are not git-ignored, so a file being authored is checked
    before its first commit rather than after it. That is the reason now.
    The reason first written here — that the candidate governance package
    was untracked and a tracked-only corpus would give CG-4, CG-7, CG-8,
    CG-9 and CG-12 a zero denominator — expired when the package was
    committed (review RD-6 D-2, recorded 2026-10-03).

    The cost is that every denominator in a local run includes whatever
    untracked file is lying in the working tree, which a clone does not
    have. Both counts are printed in the scope line so the difference is
    never implicit, and the run of record — a clone, or the hosted job —
    has no untracked files, so there the two scopes agree.

    Returns (paths, tracked_set, source). `source` is "git" normally and
    "walk" when git is unavailable — an exported or archived copy of the
    tree, where the corpus is a filesystem walk and *nothing is known to be
    tracked*. The walk is a degraded mode, printed as such: it cannot honor
    `--scope tracked` and it cannot distinguish ignored files, so CG-11 is
    reported Unknown rather than passed.
    """
    tracked = _git("ls-files")
    if tracked is None:
        walked = []
        for dirpath, dirnames, filenames in os.walk(ROOT):
            dirnames[:] = [d for d in dirnames
                           if d not in {".git", "__pycache__", "node_modules"}]
            for fn in filenames:
                rel = os.path.relpath(os.path.join(dirpath, fn), ROOT)
                walked.append(rel.replace(os.sep, "/"))
        return sorted(walked), set(), "walk"
    tracked = [p for p in tracked if p]
    if scope == "tracked":
        return sorted(set(tracked)), set(tracked), "git"
    others = _git("ls-files", "--others", "--exclude-standard") or []
    return (sorted(set(tracked) | {p for p in others if p}),
            set(tracked), "git")


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8", errors="replace") as fh:
        return fh.read()


def md_files(paths):
    return [p for p in paths if p.endswith(".md")]


def words(rel):
    return len(read(rel).split())


# --------------------------------------------------------------- CG-1

INSTALLED_RFCS = ".syzygy/governance/contracts/rfcs/"
CANDIDATE_RFCS = f"{CANDIDATES}/rfcs/"

MD_LINK = re.compile(r"\[[^\]]*\]\(\s*(?P<t>[^)\s]+)")
#: Path references in this corpus are overwhelmingly inline code spans, not
#: markdown links (39 relative links against 478 code-span paths at the time
#: of writing). A link-only check would report a confident PASS over ~8% of
#: the population that can actually dangle.
CODE_PATH = re.compile(r"`(?P<t>[A-Za-z0-9_.\-/]+\.(?:md|py|sh|ya?ml|json|txt))`")
EXTERNAL = ("http://", "https://", "mailto:", "ftp://")

#: Artifacts that do not exist yet **by design** — an owner act creates them,
#: or they belong to a governed project that does not exist. A reference to
#: one is correct, not broken. Declared, counted, and printed on every run.
FORWARD_REFS = (
    ".syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md",  # created by act 1
    ".syzygy/governance/contracts/rfcs/",                     # wave-act install home
    ".syzygy/governance/contracts/wave-manifests/",           # wave-act install home
    ".syzygy/governance/contracts/history/",                  # first-wave companion
    ".syzygy/governance/contracts/matrix-rows/",              # first-wave companion
    ".syzygy/map/topology/",                                  # act-3 install home
    ".syzygy/project.yaml",                                   # no governed project yet
    "RFC-000n",                                               # glob placeholder
    "RFC-000N",                                               # same, uppercased
)


#: Target *shapes* that name the frozen rev9 working packet — a tree that
#: lived under the git-excluded `_bootstrap/` and whose internal layout these
#: derivation records cite relatively (`final-prespec/…`, `../rfcs/RFC-0007-
#: polaris-intent-surface.md`, `reviews/08-…`). Such a reference is
#: unresolvable in a clone by construction, which is a §18 observation about
#: history, not a broken pointer in active material. Classified — not
#: silenced: every one is printed under CG-1b-history.
HISTORICAL_PACKET_TARGET = (
    re.compile(r"^(\.\./)*final-prespec/"),
    re.compile(r"^(\.\./)*rfcs/RFC-\d{4}-[a-z0-9-]+\.md$"),
    # The rev9 matrix also cites the *nested* package layout relatively
    # (`../rfcs/RFC-0003/README.md`). Same frozen tree, same by-construction
    # unresolvability; surfaced only once `_resolve` stopped discarding `../`.
    re.compile(r"^(\.\./)*rfcs/RFC-\d{4}/[A-Za-z0-9._-]+$"),
    re.compile(r"^(\.\./)*(topology|history|matrix-rows)/"),
    re.compile(r"^(\.\./)*reviews/\d{2}-"),
    re.compile(r"^(\.\./)*scripts/verify_(rfcs|rev7)\.(py|sh)$"),
)


def _is_forward(target):
    # Match both directions. A forward ref is stored as a repo-root path, but
    # it is *cited* the way every other path reference is written here — as a
    # suffix (`decisions/ACCEPTANCE-ACT-RECORD.md`). Testing only `f in target`
    # sees the root-path form and misses every suffix citation of the same
    # artifact, which is how a by-design absence gets reported as a broken link.
    return any(f in target or f.endswith("/" + target) or f == target
               for f in FORWARD_REFS)


def _is_historical_packet(target):
    return any(p.match(target) for p in HISTORICAL_PACKET_TARGET)


#: A route into the contract package. Unlike `final-prespec/…`, this shape
#: names a tree that **exists in this repository**, so a dead one is a broken
#: pointer rather than a by-construction unresolvable reference to a frozen
#: packet. The launch-gate administration (D2/F4) found two router files
#: sending readers to `rfcs/RFC-0010-mission-control-autonomy.md` and
#: `rfcs/RFC-0011-context-compiler.md` — the pre-split single-file paths,
#: replaced by packages at round-2026-08d — and the whole class was sitting
#: inside CG-1d's WARN bucket, indistinguishable from a `_bootstrap/`
#: reference that is *supposed* to be unresolvable.
RFCS_ROUTE = re.compile(
    r"^(\.\./)*rfcs/RFC-\d{4}(?:-[a-z0-9-]+\.md|/[A-Za-z0-9._-]+)$")

#: Lanes whose files are evidence, not instructions: raw reviewer output, the
#: frozen corpus, per-RFC provenance rows, and every superseded round record.
#: A dead route inside one of them is what the record recorded.
FROZEN_LANE_PREFIXES = (
    f"{CANDIDATES}/history/",
    f"{CANDIDATES}/matrix-rows/",
    f"{CANDIDATES}/reviews/",
    f"{CANDIDATES}/round-2026-08/",
    f"{CANDIDATES}/round-2026-08b/",
    f"{CANDIDATES}/round-2026-08c/",
    f"{CANDIDATES}/round-2026-08d/",
    f"{CANDIDATES}/round-2026-08e/",
    "_bootstrap/",
)

#: Active-lane files whose *job* is to name paths that no longer exist.
#: Declared with a reason and printed, never inferred from a pattern.
DEAD_ROUTE_ALLOW = (
    (f"{CANDIDATES}/04-CLAUSE-MIGRATION-MATRIX.md",
     "clause-migration provenance: every row names the frozen rev9 source a "
     "clause was migrated from, which is the record, not a route"),
    (SELF_REL, "this checker names the shape in order to detect it"),
)


def _is_active_lane(rel):
    """A file a reader is routed to for current meaning.

    Three ways out: a frozen lane, a SUPERSEDED/Historical banner in the
    first twelve lines, or a declared allowlist entry. Everything else is
    active, including files nobody has thought about — which is the
    fail-closed direction.
    """
    if any(rel.startswith(p) for p in FROZEN_LANE_PREFIXES):
        return False
    if _allow_hit(rel, DEAD_ROUTE_ALLOW):
        return False
    try:
        head = "\n".join(read(rel).splitlines()[:BANNER_SCAN_LINES])
    except OSError:
        return True
    return not SUPERSEDED_BANNER.search(head)


#: Raw reviewer output is stored verbatim and never edited — the repository's
#: strongest evidence rule, and the reason `EXCEPTIONS` never becomes "pass
#: with findings". A reviewer writing `craft/engineering-bar.md` for a file
#: this tree keeps at `policies/craft-and-care/engineering-bar.md` has written
#: their own shorthand, not a repository pointer, and the only ways to make
#: CG-1b green over it are to edit their words or to stop reading their file.
#: Both are worse than the finding. So these are **classified, not silenced**:
#: counted in CG-1b's denominator, reported in full under CG-1f, and never
#: allowed to fail a check whose subject is the active corpus's own links.
RAW_REVIEW_DIRS = (
    f"{CANDIDATES}/reviews/",
    f"{CANDIDATES}/round-2026-08/reviews/",
    f"{CANDIDATES}/round-2026-08b/reviews/",
    f"{CANDIDATES}/round-2026-08c/reviews/",
    f"{CANDIDATES}/round-2026-08d/reviews/",
    #: Added 2026-08-10 with the round's first raw review that quotes
    #: clone-relative shorthand (RD-29 quotes `../decisions/…` at the depth
    #: of the file it was reading). Same rule as the rounds above: verbatim
    #: reviewer output is classified into CG-1f, never edited to please a
    #: link check.
    f"{CANDIDATES}/round-2026-08e/reviews/",
)


#: **The lane is a shape, not a list, and that is a 2026-08-11 correction.**
#: Every round above was registered by hand on the day its first raw review
#: landed, in three separate enumerations — and round-2026-08e reached
#: `VERBATIM_SOURCES` in none of them, so an 08e reviewer who called the term
#: registry "canonical" would have failed CG-16 for reporting what they read.
#: The miss is the argument: a per-round list that must be edited in three
#: places is a list that will be short by one round, and the round it is short
#: by is always the current one.
#:
#: The generalization is bounded by two conjuncts, both checked: the path sits
#: under the candidate contract tree, **and** a whole path segment is
#: `reviews`. A `reviews/` directory anywhere else in the repository is not
#: this lane, and `previews/` or `reviews-summary.md` are not segments. The
#: tuple above is retained as the record of which rounds were registered by
#: hand and why; it is no longer the population.
#: The understanding-reconciliation recorder's history reviews are raw output
#: kept beside the evidence package they bind (its HISTORY-READING.md).
HISTORY_REVIEW_RAW = re.compile(
    r"docs/evidence/polaris-understanding-reconciliation-2026-09-28/"
    r"HISTORY-REVIEW-[1-9][0-9]*-RAW\.md")


def _is_raw_review(rel):
    candidate_raw = (rel.startswith(f"{CANDIDATES}/")
                     and "reviews" in rel.split("/")[:-1])
    implementation_raw = (rel.startswith("docs/reviews/")
                          and rel.endswith("-RAW.md"))
    return (candidate_raw or implementation_raw
            or HISTORY_REVIEW_RAW.fullmatch(rel) is not None)


#: The two exemption enumerations below (`ACT_QUOTE_EXEMPT`,
#: `VERBATIM_SOURCES`) are declared far later in this file and stay declared:
#: they hold lanes that are *not* raw review — the frozen rev9 corpus, the
#: owner charter, generated fixtures. These two helpers add the raw-review
#: shape to both, in one place each, so a new round's reviews lane is exempt
#: the moment it exists rather than the moment somebody remembers.
def _act_quote_exempt(rel):
    return _is_raw_review(rel) or any(rel.startswith(x) or rel == x
                                      for x in ACT_QUOTE_EXEMPT)


def _verbatim_source(rel):
    return _is_raw_review(rel) or any(rel.startswith(x) or rel == x
                                      for x in VERBATIM_SOURCES)


#: Superseded round records, banner-marked and frozen. They cite paths that
#: were correct at the depth they were written and are not corrected, for the
#: same reason raw reviewer output is not: a frozen record edited to please a
#: check is no longer the record. Classified into CG-1f alongside raw review.
SUPERSEDED_ROUND_DIRS = (
    f"{CANDIDATES}/round-2026-08/",
)


def _is_frozen_lane(rel):
    return _is_raw_review(rel) or any(rel.startswith(d)
                                      for d in SUPERSEDED_ROUND_DIRS)


#: Cited descriptively by `craft-and-care/testing-and-verification.md`
#: CC-TEST-7: the upstream `th-engineering` package's own internal
#: cross-reference (tier definitions for test-rigor bars 9-10), naming a file
#: outside this lock's vendored scope on purpose
#: (`GOVERNANCE-SUBSTRATE-LOCK.yaml` th_engineering.vendored.scope_note).
#: Classified here, not silenced — see CG-1e.
DECLARED_VENDOR_GAP = (
    "subskills/test-rigor/references/suite-discipline.md",
)


def _is_vendored_gap(citing, target):
    """A vendored file's own prose citing an un-vendored sibling, or a
    Syzygy file citing a upstream path this repo deliberately did not
    vendor. `VENDORED_EXTERNAL` is defined near `cg22_ambiguous_status`,
    below — resolved at call time, same as every other module constant."""
    return citing.startswith(VENDORED_EXTERNAL) or target in DECLARED_VENDOR_GAP


def _resolve(citing, target, all_paths):
    """Resolve relative to the citing file, to the repo root, or as a suffix.

    Path references here are written as *citations* — `RFC-0002/README.md`
    cited from a package report means the module of that name, wherever the
    package keeps it — so suffix matching models how they are actually
    written. Anything resolving only by suffix still resolves in a clone.

    **The suffix fallback is refused for a target that states its own depth.**
    An author writing `../../history/RFC-0010-history.md` has made a claim
    about where the file sits relative to theirs, and a wrong claim must fail
    rather than be rescued by a filename match somewhere else in the tree.

    An earlier revision used `str.lstrip("./")` on the normalized target,
    which strips *characters*, not a prefix — so every `../` was discarded and
    **no wrong-depth path could fail**. Review RD-7 mutation-proved it with a
    link seven levels up, pointing outside the repository, over which the
    battery reported `0 findings` while the denominator incremented. It was
    also the reason a genuinely broken pointer inside act 1's digest set had
    gone unreported (RD-7 finding E-2).
    """
    for cand in (os.path.join(os.path.dirname(citing), target),
                 os.path.join(ROOT, target)):
        if os.path.exists(os.path.normpath(os.path.join(ROOT, cand)
                                           if not os.path.isabs(cand) else cand)):
            return True
    if target.startswith("../") or "/../" in target:
        return False
    t = os.path.normpath(target).replace(os.sep, "/")
    while t.startswith("./"):
        t = t[2:]
    if not t or t.startswith("../"):
        return False
    return any(p == t or p.endswith("/" + t) for p in all_paths)


def _candidate_twin(installed_rel, all_paths):
    if not installed_rel.startswith(INSTALLED_RFCS):
        return None
    suffix = installed_rel[len(INSTALLED_RFCS):]
    candidate = CANDIDATE_RFCS + suffix
    return candidate if candidate in all_paths else None


#: A signed package's citation of a path that a later act moved. The package's
#: bytes are what its version tag binds, so the citation is history, not a
#: route: classified and printed under CG-1d, never silenced.
SIGNED_PACKAGE_MOVED_TARGETS = {
    (f"{CANDIDATES}/polaris-dossier-local-agent-mode-v1-1/IMPACT-LEDGER.md",
     "openspec/changes/polaris-non-governed-narrative-profile/proposed/polaris-generation/spec.md"):
        "signed v1.1 bytes; the narrative-profile adoption moved the spec to specs/",
}


def cg1_links(paths, res):
    all_paths = set(paths)
    n_links = n_paths = 0
    broken_links, broken_paths, forward, historical, vendor_gap, reviewer = \
        [], [], set(), [], [], []
    dead_routes = []

    installed_examined = []
    installed_verified = []
    installed_findings = []

    def classify(rel, t, bucket):
        """Where an unresolvable reference belongs. One place, so CG-1a and
        CG-1b cannot disagree about the same target."""
        if rel.startswith(INSTALLED_RFCS):
            reference = f"{rel} -> {t}"
            installed_examined.append(reference)
            candidate = _candidate_twin(rel, all_paths)
            if candidate is None:
                installed_findings.append(
                    f"{reference} — installed module has no candidate twin; "
                    f"shape (M)'s fallback cannot be evaluated")
            elif not _resolve(candidate, t, all_paths):
                installed_findings.append(
                    f"{reference} — candidate twin `{candidate}` does not "
                    f"resolve the same relative target; shape (M)'s disclosed "
                    f"fallback is false")
            else:
                installed_verified.append(reference)
        elif _is_vendored_gap(rel, t):
            vendor_gap.append(f"{rel} -> {t}")
        elif RFCS_ROUTE.match(t) and _is_active_lane(rel):
            dead_routes.append(f"{rel} -> {t}")
        elif _is_historical_packet(t):
            historical.append(f"{rel} -> {t}")
        elif (rel, t) in SIGNED_PACKAGE_MOVED_TARGETS:
            historical.append(f"{rel} -> {t} — {SIGNED_PACKAGE_MOVED_TARGETS[(rel, t)]}")
        elif _is_frozen_lane(rel):
            # CG-1a had no frozen-lane branch at all; these passed only
            # because `_resolve` absorbed them (review RD-7, finding E-1).
            # Now classified explicitly, like CG-1b's.
            reviewer.append(f"{rel} -> {t}")
        else:
            bucket.append(f"{rel} -> {t}")

    for rel in md_files(paths):
        txt = read(rel)
        # A link written inside an inline code span is an example, not a link.
        link_txt = re.sub(r"`[^`\n]*`", lambda c: " " * len(c.group(0)), txt)
        for m in MD_LINK.finditer(link_txt):
            t = m.group("t").split("#")[0].strip()
            if not t or t.startswith(EXTERNAL):
                continue
            n_links += 1
            if _is_forward(t):
                forward.add(t)
                continue
            if not _resolve(rel, t, all_paths):
                classify(rel, t, broken_links)
        for m in CODE_PATH.finditer(txt):
            t = m.group("t")
            if "/" not in t or t.startswith(EXTERNAL):
                continue
            # `_bootstrap/**` is git-excluded by design; CG-12 owns it.
            if t.startswith("_bootstrap/"):
                continue
            n_paths += 1
            if _is_forward(t):
                forward.add(t)
                continue
            if not _resolve(rel, t, all_paths):
                classify(rel, t, broken_paths)

    if n_links == 0:
        res.add("WARN", "CG-1a  markdown links resolve", 0, 0, "link",
                note="nothing examined — check verified nothing")
    else:
        res.add("FAIL" if broken_links else "OK", "CG-1a  markdown links resolve",
                n_links, len(broken_links), "link",
                details=sorted(set(broken_links)))
    if n_paths == 0:
        res.add("WARN", "CG-1b  code-span path references resolve", 0, 0, "reference",
                note="nothing examined — check verified nothing")
    else:
        res.add("FAIL" if broken_paths else "OK",
                "CG-1b  code-span path references resolve",
                n_paths, len(broken_paths), "reference",
                details=sorted(set(broken_paths)))
    res.add("WARN", "CG-1c  declared forward references", len(forward), 0, "target",
            note="skipped by design — an owner act creates these",
            details=sorted(forward))
    uniq_inst = sorted(set(installed_examined))
    uniq_inst_findings = sorted(set(installed_findings))
    uniq_inst_verified = sorted(set(installed_verified))
    res.add("FAIL" if uniq_inst_findings else "WARN",
            "CG-1i  installed-tree path strings (P-33 shape (M))",
            len(uniq_inst), len(uniq_inst_findings), "reference",
            note=("candidate-tree fallback verified for every installed "
                  "reference; installed modules remain non-self-contained "
                  "under P-33 shape (M)"
                  if not uniq_inst_findings else
                  "one or more installed references lack the candidate-tree "
                  "fallback promised by P-33 shape (M)"),
            details=(uniq_inst_findings
                     + [f"[verified candidate fallback] {r}"
                        for r in uniq_inst_verified]))
    uniq_hist = sorted(set(historical))
    res.add("WARN", "CG-1d  frozen-packet references", len(uniq_hist), 0,
            "reference",
            note="unresolvable in a clone by construction — the rev9 working "
                 "packet lived under the git-excluded `_bootstrap/`; a dead "
                 "route into `rfcs/**` from active material is CG-1g, not "
                 "this bucket",
            details=uniq_hist)
    uniq_dead = sorted(set(dead_routes))
    res.add("FAIL" if uniq_dead else "OK",
            "CG-1g  active routes into `rfcs/**` resolve", len(uniq_dead),
            len(uniq_dead), "route",
            note=("the target is supposed to exist in this tree — unlike a "
                  "`_bootstrap/` reference, which is absent by design"
                  if uniq_dead else
                  "no active-lane route into `rfcs/**` is dead"),
            details=[f"{d} — the contract package exists in this repository, "
                     f"so this route is broken, not by-design absent"
                     for d in uniq_dead])
    allow_present = [f"{p} — {r}" for p, r in DEAD_ROUTE_ALLOW
                     if p in all_paths]
    res.add("WARN", "CG-1h  dead-route allowlist", len(allow_present), 0,
            "file", note="active-lane files whose job is to name paths that "
                         "no longer exist", details=allow_present)
    uniq_rev = sorted(set(reviewer))
    res.add("WARN", "CG-1f  frozen-lane path references", len(uniq_rev), 0,
            "reference",
            note="raw reviewer output and superseded round records — never "
                 "edited, so classified and printed rather than failed",
            details=uniq_rev)
    uniq_gap = sorted(set(vendor_gap))
    res.add("WARN", "CG-1e  vendored-substrate scope gaps", len(uniq_gap), 0,
            "reference",
            note="deliberately not vendored — GOVERNANCE-SUBSTRATE-LOCK.yaml "
                 "th_engineering.vendored.scope_note names the boundary",
            details=uniq_gap)


# --------------------------------------------------------------- CG-2

#: The one structured home for "which acceptance phrase is current, which is
#: retired, and how a file may lawfully quote a retired one". Every phrase
#: population below is read out of it; **no phrase literal lives in this
#: file**, deliberately.
#:
#: Why. CG-2 named the rev9 phrase in a Python constant. rev10's phrase was
#: retired at round-2026-08d and the constant was not updated, so the
#: successor was live in five artifacts and invisible to the whole battery —
#: the launch-gate administration of 2026-08-09 (findings C1/E6/F3) found it
#: by hand. A retirement is now one entry in the registry, and it reaches
#: CG-2a, CG-2e, CG-7d and CG-7e on the same run.
PHRASE_REGISTRY = f"{CANDIDATES}/ACCEPTANCE-PHRASE-REGISTRY.yaml"

#: Keyed by `ROOT`, not a bare global. `_selftest_wave_partition` swaps ROOT
#: to a temp tree, and a root-blind cache filled during that swap would pin
#: the *absent* registry for the rest of the process — every later fixture
#: then passing over an empty phrase population, which is the vacuous pass
#: this module is built to refuse. Caught by the CG-7e fixture going red.
_PHRASE_REGISTRY_CACHE = {}


def phrase_registry(text=None):
    """The parsed registry, as (data, errors). Cached; `text` overrides.

    Parsed with `_yaml_lite` — the same tolerant reader CG-19 uses on the
    substrate lock, defined below and resolved at call time. Bringing in a
    YAML dependency would break the "standard library only" design
    constraint, and a second parser would be a second thing to go wrong.

    An absent or unparseable registry is an **error**, never an empty
    population: a phrase sweep over zero declared phrases is the vacuous pass
    this battery exists to prevent (VIS-2).
    """
    if text is not None:
        return _yaml_lite(text)
    if ROOT not in _PHRASE_REGISTRY_CACHE:
        if not os.path.exists(os.path.join(ROOT, PHRASE_REGISTRY)):
            _PHRASE_REGISTRY_CACHE[ROOT] = ({}, [
                f"{PHRASE_REGISTRY} is absent — the phrase population is "
                f"Unknown, and Unknown is not empty"])
        else:
            data, errs = _yaml_lite(read(PHRASE_REGISTRY))
            _PHRASE_REGISTRY_CACHE[ROOT] = (data, list(errs))
    return _PHRASE_REGISTRY_CACHE[ROOT]


def _reg_list(data, key):
    v = data.get(key)
    return [x for x in v if isinstance(x, dict)] if isinstance(v, list) else []


def registry_current(data=None):
    """Current acceptance phrases: [{label, form, argument, subject, …}]."""
    data = data if data is not None else phrase_registry()[0]
    return _reg_list(data, "current_phrases")


def registry_retired(data=None):
    """Retired acceptance phrases: [{label, retired_at, replaced_by, …}]."""
    data = data if data is not None else phrase_registry()[0]
    return _reg_list(data, "retired_phrases")


def registry_convention(data=None):
    """(markers, currency_signals, window) for historical quotation."""
    data = data if data is not None else phrase_registry()[0]
    conv = data.get("historical_marker_convention")
    conv = conv if isinstance(conv, dict) else {}
    mk = [m.lower() for m in conv.get("markers", []) if isinstance(m, str)]
    cs = [c.lower() for c in conv.get("currency_signals", [])
          if isinstance(c, str)]
    try:
        win = int(conv.get("marker_window_lines", 2))
    except (TypeError, ValueError):
        win = 2
    return tuple(mk), tuple(cs), win


#: **Whitespace-tolerant, case-sensitive.** Tolerant of whitespace because
#: prose wraps and a phrase split over a line break is still the phrase — the
#: launch-gate pilot's hand sweep missed two occurrences for exactly that
#: reason, and a `str.__contains__` test cannot see any of them. Case-
#: sensitive because these phrases are literal ceremony tokens: a lowercase
#: rendering is prose *about* the act, not the act's words.
def phrase_pattern(label):
    return re.compile(r"\s+".join(re.escape(w) for w in label.split()))


#: A whole artifact may be marked historical by its banner rather than at
#: each quotation. Same predicate CG-15 uses, and for the same reason: a
#: banner in the body is not a banner, because a reader must meet it before
#: the quotation.
SUPERSEDED_BANNER = re.compile(
    r"^>?\s*[#*\s]*(SUPERSEDED|Superseded|Historical|RETIRED|Retired)\b", re.M)
BANNER_SCAN_LINES = 12

#: A retirement notice must be able to name the phrase it retires, and the
#: historical record must be able to quote what was superseded. Allowlisted
#: by path prefix, each with the reason it is allowed to carry the phrase.
RETIRED_PHRASE_ALLOW = (
    (f"{CRAFT}/INSTALL-RECORD.md", "states the phrase is retired and satisfies nothing"),
    (f"{CANDIDATES}/round-2026-08/", "this round's process record and delta register"),
    (f"{CANDIDATES}/history/", "frozen rev9 corpus and per-RFC amendment history"),
    (f"{CANDIDATES}/reviews/", "raw reviewer output, stored verbatim"),
    #: Opened one round at a time, never by a `round-*/reviews/` glob, on the
    #: same terms CG-12's allowlist uses. The 08b and 08c directories were
    #: added on 2026-08-10 when the registry taught CG-2a about the
    #: *successor* phrase: three reviewers had quoted `ACCEPT COMPACTED
    #: FOUNDATIONAL RFCS` in their own sweeps, and raw reviewer output is
    #: never edited — the alternative to allowlisting it is editing evidence.
    (f"{CANDIDATES}/round-2026-08b/reviews/",
     "raw reviewer output, stored verbatim — a reviewer's retired-phrase "
     "sweep must be able to name the phrases it swept for"),
    (f"{CANDIDATES}/round-2026-08c/reviews/",
     "raw reviewer output, stored verbatim — same rule as its predecessor"),
    (f"{CANDIDATES}/round-2026-08d/reviews/",
     "raw reviewer output, stored verbatim — a reviewer's retired-phrase "
     "sweep must be able to name the phrases it swept for"),
    (f"{CANDIDATES}/00-README.md", "records the phrase as retired at rev10"),
    (f"{CANDIDATES}/10-EXIT-REPORT.md", "records the phrase as retired at rev10"),
    (f"{CANDIDATES}/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md",
     "the acceptance record that retires it"),
    (f"{DECISIONS}/OWNER-ANSWERS-2026-08-01.md",
     "owner ruling that the phrase was not performed"),
    (f"{DECISIONS}/PROCESS-LESSONS.md",
     "records the acceptance-authority migration, of which the phrase's "
     "unconditional retirement is one step"),
    ("AGENTS.md", "states the phrase is retired and satisfies nothing"),
    (f"{CANDIDATES}/round-2026-08/OWNER-ROUND-CHARTER.md",
     "owner-supplied round charter; quotes the phrase as a search token"),
    (SELF_REL, "this checker names the phrase in order to detect it"),
)

#: `about/**` is the upstream skill convention; this repository deliberately
#: has no such tree. Naming it as *guidance not to create one*, or as a
#: historical divergence note, is correct. Naming it as an authority path is
#: the defect.
ABOUT_SCOPE = ("AGENTS.md", "README.md")
ABOUT_ALLOW = (
    (".claude/skills/heart-and-soul/SKILL.md", "no-about/-tree guidance"),
    (".codex/skills/heart-and-soul/SKILL.md", "no-about/-tree guidance"),
    (f"{CRAFT}/README.md", "historical note on the upstream pillar home"),
)
ABOUT_PAT = re.compile(r"(?<![\w/.-])about/")


def _allow_hit(rel, allow):
    for prefix, reason in allow:
        if rel == prefix or rel.startswith(prefix):
            return reason
    return None


def _phrase_window(lines, start_line, end_line, window):
    lo = max(0, start_line - 1 - window)
    hi = end_line + window
    return " ".join(" ".join(lines[lo:hi]).split()).lower()


def cg2_retired_tokens(paths, res, corpus=None, registry=None):
    """Every retired acceptance phrase in the corpus is classified.

    Four classes, and the split is the point — a retirement notice, a frozen
    record and a live gate all contain the same characters, and only the
    third is a defect:

    1. **presented as current** — the quotation sits beside a currency signal
       (`exact phrase`, `the gate is`, `in force`, …) with no historical
       marker anywhere near it. This is the P-6 class, and it is what the
       launch-gate administration found live in five artifacts after the
       round-2026-08d retirement.
    2. **unmarked quotation** — no currency signal either, but nothing says
       the phrase is dead. A reader meets a performable-looking phrase.
       Fail-closed: an unmarked quotation is assumed to be presenting.
    3. **marked** — a historical marker inside the window, or a
       SUPERSEDED/Historical banner in the file's first twelve lines. Lawful;
       counted and printed under CG-2f, never silenced.
    4. **path-allowlisted** — a declared file whose job is to preserve what
       was offered. Counted and printed under CG-2b with its reason.

    The population, the markers, the currency signals and the window all come
    from `ACCEPTANCE-PHRASE-REGISTRY.yaml`. Adding a retirement is one entry
    there; it does not touch this function.
    """
    data, reg_errors = phrase_registry(registry)
    retired = registry_retired(data)
    markers, signals, window = registry_convention(data)

    items = corpus
    if items is None:
        items = [(p, read(p)) for p in paths
                 if p.endswith((".md", ".txt", ".yaml", ".yml", ".py"))]

    live, unmarked, allowed, marked = [], [], [], []
    reg_findings = list(reg_errors)
    if not retired:
        reg_findings.append(
            f"{PHRASE_REGISTRY} declares no retired phrase — the sweep below "
            f"has an empty population and verifies nothing")
    if not markers:
        reg_findings.append(
            f"{PHRASE_REGISTRY} declares no historical markers — every lawful "
            f"quotation would be reported as a defect")

    for rel, txt in items:
        lines = txt.splitlines()
        bannered = bool(SUPERSEDED_BANNER.search(
            "\n".join(lines[:BANNER_SCAN_LINES])))
        reason = _allow_hit(rel, RETIRED_PHRASE_ALLOW)
        for entry in retired:
            label = entry.get("label")
            if not isinstance(label, str) or not label.strip():
                continue
            replacement = entry.get("replaced_by") or "[Unknown]"
            retired_at = entry.get("retired_at") or "[Unknown]"
            for m in phrase_pattern(label).finditer(txt):
                start = txt[:m.start()].count("\n") + 1
                end = start + m.group(0).count("\n")
                wrap = " (quoted across a line wrap)" if end > start else ""
                if reason:
                    allowed.append(f"{rel}:{start} `{label}`{wrap} — {reason}")
                    continue
                win = _phrase_window(lines, start, end, window)
                if bannered:
                    marked.append(f"{rel}:{start} `{label}`{wrap} — "
                                  f"SUPERSEDED/Historical banner in the first "
                                  f"{BANNER_SCAN_LINES} lines marks the whole "
                                  f"artifact")
                elif any(mk in win for mk in markers):
                    hit = next(mk for mk in markers if mk in win)
                    marked.append(f"{rel}:{start} `{label}`{wrap} — marked "
                                  f"historical by `{hit}` within "
                                  f"{window} line(s)")
                elif any(sig in win for sig in signals):
                    sig = next(s for s in signals if s in win)
                    live.append(
                        f"{rel}:{start} — presents the retired phrase "
                        f"`{label}` as current (`{sig}` in the same window, "
                        f"no historical marker){wrap}. Retired "
                        f"{retired_at}; the current form is `{replacement}`")
                else:
                    unmarked.append(
                        f"{rel}:{start} — quotes the retired phrase "
                        f"`{label}` with no historical marker, no banner, and "
                        f"no allowlist entry{wrap}. Retired {retired_at}; a "
                        f"reader cannot tell it from a live gate")

    findings = live + unmarked
    res.add("FAIL" if findings or reg_findings else "OK",
            "CG-2a  retired acceptance phrase confined", len(items),
            len(findings) + len(reg_findings), "file",
            note=(f"{len(retired)} retired phrase(s) declared; "
                  f"{len(live)} presented as current, "
                  f"{len(unmarked)} unmarked"),
            details=reg_findings + findings)
    res.add("WARN", "CG-2b  retired-phrase path allowlist", len(allowed), 0,
            "quotation", note="declared files whose job is to preserve what "
                              "was offered", details=sorted(allowed))
    res.add("WARN", "CG-2f  retired-phrase historical markers", len(marked), 0,
            "quotation",
            note="lawful quotations — marked at the line or by the "
                 "artifact's banner; printed, never silenced",
            details=sorted(marked))

    scope = [p for p in ABOUT_SCOPE if p in set(paths)]
    hits = []
    for rel in scope:
        for i, ln in enumerate(read(rel).splitlines(), 1):
            if ABOUT_PAT.search(ln):
                hits.append(f"{rel}:{i} — `about/` named in an instruction file")
    res.add("FAIL" if hits else ("OK" if scope else "WARN"),
            "CG-2c  `about/` absent from AGENTS/README", len(scope),
            len(hits), "file",
            note=None if scope else "neither file present — nothing examined",
            details=hits)
    allow_present = [f"{p} — {r}" for p, r in ABOUT_ALLOW if p in set(paths)]
    res.add("WARN", "CG-2d  `about/` allowlist", len(allow_present), 0, "file",
            note="guidance and historical mentions, out of CG-2c scope",
            details=allow_present)


def cg2e_wrapped_current_arguments(paths, res, corpus=None, registry=None,
                                   subjects=None):
    """A **line-wrapped** current act phrase still carries a live argument.

    CG-7d owns act-digest quotations and matches per line, so a phrase and
    its 64-hex argument split by a line break are invisible to it — the same
    blindness the launch-gate pilot's hand sweep had, which missed two
    occurrences of a retired phrase to wrapping. This check covers exactly
    the gap: a match that spans a newline. A single-line quotation is CG-7d's
    and is deliberately **not** reported twice.

    The phrase population is the registry's `current_phrases`, so the same
    entry that teaches CG-2a about a retirement teaches this check about the
    replacement.
    """
    data, _errs = phrase_registry(registry)
    current = [e for e in registry_current(data)
               if e.get("argument") == "sha256" and e.get("subject")]
    subj = {}
    for e in current:
        if subjects is not None:
            subj[e["label"]] = subjects.get(e["label"])
            continue
        full = os.path.join(ROOT, e["subject"])
        subj[e["label"]] = sha256_file(full) if os.path.exists(full) else None

    items = corpus
    if items is None:
        items = [(p, read(p)) for p in paths
                 if p.endswith((".md", ".txt"))
                 and not _act_quote_exempt(p)]
    findings, examined = [], 0
    for rel, body in items:
        lines = body.splitlines()
        for e in current:
            label = e["label"]
            sep = re.escape(e.get("argument_separator") or ":")
            pat = re.compile(
                r"\s+".join(re.escape(w) for w in label.split())
                + r"\s*" + sep + r"\s*`?([0-9a-f]{64})")
            for m in pat.finditer(body):
                if "\n" not in m.group(0):
                    continue            # CG-7d's population, not this one
                line_no = body[:m.start()].count("\n") + 1
                prev = " ".join(lines[max(0, line_no - 2):line_no + 1]).lower()
                if re.search(r"\b(retired|stale|superseded|historical|"
                             r"no longer|prior|previous)\b", prev):
                    continue
                examined += 1
                cur = subj.get(label)
                if cur is None:
                    findings.append(
                        f"{rel}:{line_no} — quotes `{label}` across a line "
                        f"wrap, but its subject `{e['subject']}` does not "
                        f"exist")
                elif m.group(1) != cur:
                    findings.append(
                        f"{rel}:{line_no} — quotes `{label}: "
                        f"{m.group(1)[:12]}…` across a line wrap; the subject "
                        f"hashes to {cur[:12]}…. CG-7d cannot see a wrapped "
                        f"quotation, so this copy was unchecked")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-2e  wrapped act-phrase arguments current", examined,
            len(findings), "quotation",
            note=(None if examined else
                  "no act phrase is quoted across a line wrap — CG-7d covers "
                  "the single-line population"),
            details=findings)


# --------------------------------------------------------------- CG-3

STALE_ROUTES = ("_bootstrap/prompts/",)


def cg3_stale_routing(paths, res):
    files = [p for p in paths if p.endswith((".md", ".txt", ".yaml", ".yml"))]
    findings = []
    for rel in files:
        if rel == SELF_REL:
            continue
        for i, ln in enumerate(read(rel).splitlines(), 1):
            for route in STALE_ROUTES:
                if route in ln:
                    findings.append(f"{rel}:{i} — routes to `{route}`")
    res.add("FAIL" if findings else "OK",
            "CG-3   stale bootstrap routing absent", len(files),
            len(findings), "file", details=findings)


# --------------------------------------------------------------- CG-4

BANNER_LINES = 10
#: A manifest is a digest list; a banner would change its digest surface, and
#: the acceptance record owns its candidate status.
BANNER_EXEMPT = (f"{TOPOLOGY_CANDIDATES}/BUNDLE-MANIFEST.md",)

#: **The front door.** Review RD-17 finding 6 mutation-proved the hole: it
#: rewrote `candidates/README.md`'s banner from *"Candidate contract package
#: — NOT ACCEPTED"* to *"Accepted contract package — IN FORCE"*, and the
#: battery reported `0 FAIL` over 40 checks. CG-4's population was eight
#: files and did not include the one a reader meets first, nor any of the
#: thirty-nine modules an act would bind. The package README is also the
#: **directory-level candidate marker for `rfcs/`**, the pattern CG-4 already
#: uses for the topology bundle: per-module banners would churn digest-bound
#: bytes for labelling alone.
FRONT_DOOR = (
    f"{CANDIDATES}/README.md",
    f"{CANDIDATES}/00-README.md",
)
#: **The rest of the candidates root is outside CG-4a, by decision**
#: (syzygy-afuy, 2026-10-03, RD-6 C-2). Of its 33 `.md` files, 21 lack the
#: word "candidate" in their first ten lines. "Candidate" is the wrong word
#: for most of them: some are historical working records of the rev10 run,
#: whose banners say "historical", and one is the acceptance record that
#: defines the foundational acts. Others cannot take a banner: `07-…` is
#: digest-cited by the RC-7 raw.
#: Only the two front-door markers above are tested.

#: The inverse predicate CG-5 has had for craft since it was written. A
#: missing word is a weak test — the strong one is a positive claim of
#: acceptance inside a tree where no act has been performed. Matched in the
#: banner region only, because that is where a reader forms the belief.
ACCEPTED_CLAIMS = (
    "accepted package", "accepted contract", "is accepted", "are accepted",
    "in force", "everything here binds", "have been performed",
    "has been performed", "no longer candidate", "binding package",
)
#: Negation, in the banner's own words. Every current banner in the candidate
#: tree states its candidacy negatively — *"nothing here is accepted"*, *"No
#: owner acceptance act has been performed"* — so the claim words are present
#: and correct. The window is generous (80 characters) because the negator
#: routinely opens a sentence the claim closes.
CLAIM_NEGATOR = re.compile(r"\b(no|not|never|nothing|none|until|neither|"
                           r"unaccepted|un-accepted)\b", re.I)
CLAIM_LOOKBEHIND = 80


#: Sentence boundaries, for attributing an acceptance claim. The exemption
#: below is deliberately sentence-scoped rather than banner-scoped: a
#: banner-wide exemption would let one truthful attributed claim license
#: every other claim on the page, which is the RD-17 hole reopened one level
#: up. A claim earns its exemption only in the sentence that names what it
#: is about.
#: The trailing character class matters: markdown routinely closes a
#: sentence as `in force.**`, and a splitter demanding whitespace directly
#: after the stop merges that sentence into the next — handing an
#: unattributed claim the following sentence's attribution.
SENTENCE_SPLIT = re.compile(r"""(?<=[.!?])[*_`)\]"']*\s+""")


def _accepted_claim(head, exempting=()):
    """(claim, context) for an unnegated, unattributed acceptance claim.

    `exempting` holds names — a file's basename, or its directory's — whose
    bytes an owner act has actually bound. A claim of acceptance in the same
    sentence as one of those names is a true statement about act-bound
    material and is passed over; the same claim standing alone is the
    prohibited label.
    """
    flat = " ".join(head.split())
    low = flat.lower()
    spans = []
    at = 0
    for part in SENTENCE_SPLIT.split(flat):
        start = flat.find(part, at)
        spans.append((start, start + len(part), part))
        at = start + len(part)
    for claim in ACCEPTED_CLAIMS:
        at = low.find(claim)
        while at >= 0:
            if not CLAIM_NEGATOR.search(low[max(0, at - CLAIM_LOOKBEHIND):at]):
                sentence = next((txt for lo, hi, txt in spans
                                 if lo <= at < hi), flat)
                if not any(tok in sentence for tok in exempting):
                    return claim, flat[max(0, at - 40):at + len(claim) + 20]
            at = low.find(claim, at + 1)
    return None


def cg4_candidate_banners(paths, res):
    targets = []
    for rel in FRONT_DOOR:
        if rel in set(paths):
            targets.append(rel)
    #: Topology bundle members are digest-bound by BUNDLE-MANIFEST.md (the
    #: act-3 subject); stuffing a banner word into each member would churn
    #: the offered digest for labeling alone. The directory-level candidate
    #: marker (TRACKING-NOTE.md, outside the member set) satisfies CG-4 for
    #: the members, provided it exists and itself carries the banner.
    topology_note = f"{TOPOLOGY_CANDIDATES}/TRACKING-NOTE.md"
    topology_note_ok = (topology_note in set(paths)
                        and "candidate" in "\n".join(
                            read(topology_note).splitlines()[:BANNER_LINES]).lower())
    for rel in paths:
        if rel.startswith(f"{CANDIDATES}/policy-candidates/") and rel.endswith(".md"):
            targets.append(rel)
        elif (rel.startswith(f"{TOPOLOGY_CANDIDATES}/") and rel.endswith(".md")
              and rel not in BANNER_EXEMPT):
            if rel == topology_note or not topology_note_ok:
                targets.append(rel)
    if topology_note in set(paths) and topology_note not in targets:
        targets.append(topology_note)
    findings = []
    for rel in sorted(set(targets)):
        head = "\n".join(read(rel).splitlines()[:BANNER_LINES]).lower()
        if "candidate" not in head:
            findings.append(f"{rel} — no 'candidate' in the first "
                            f"{BANNER_LINES} lines")
    # `candidates/README.md` is the directory-level marker for the modules,
    # exactly as TRACKING-NOTE.md is for the topology bundle. Reported so the
    # covered population is a number and not an assumption.
    pkg_readme = f"{CANDIDATES}/README.md"
    covered = [p for p in paths
               if p.startswith(f"{CANDIDATES}/rfcs/") and p.endswith(".md")]
    marker_ok = pkg_readme in set(paths) and "candidate" in "\n".join(
        read(pkg_readme).splitlines()[:BANNER_LINES]).lower()
    if covered and not marker_ok:
        findings.append(
            f"{pkg_readme} — carries no candidate banner, and it is the "
            f"directory-level marker for the {len(covered)} module(s) under "
            f"`rfcs/`; without it those modules are unmarked")
    status = "FAIL" if findings else ("OK" if targets else "WARN")
    res.add(status, "CG-4a  candidate homes carry candidate banners",
            len(set(targets)), len(findings), "file",
            note=(f"plus {len(covered)} `rfcs/` module(s) covered by the "
                  f"directory-level marker `{pkg_readme}`" if covered
                  else "no candidate-home files found — nothing examined"),
            details=findings)
    cg4b_no_accepted_claim(paths, res)


#: Kept under the old name: identifiers are amended in place, never
#: renumbered, and CG-4's single row became CG-4a/CG-4b when the inverse
#: predicate arrived.
cg4_candidate_banners_positive = cg4_candidate_banners


def _act_bound_names(paths):
    """Names a truthful acceptance claim inside the candidate tree may cite.

    Every file under the candidate tree whose current sha256 is quoted in the
    performed-act record is act-bound; its basename, and its directory's
    basename, are the tokens a banner can use to say so. Computed each run
    from the bytes and the record, so it cannot drift out of date: if an act
    moves those bytes, the token disappears and the claim fails again.
    """
    record = os.path.join(ROOT, PERFORMED_ACT_RECORD)
    if not os.path.exists(record):
        return set()
    quoted = set(re.findall(r"\b[0-9a-f]{64}\b", read(PERFORMED_ACT_RECORD)))
    names = set()
    for rel in paths:
        if not rel.startswith(f"{CANDIDATES}/"):
            continue
        full = os.path.join(ROOT, rel)
        if not os.path.isfile(full):
            continue
        if sha256_file(full) in quoted:
            names.add(os.path.basename(rel))
            parent = os.path.basename(os.path.dirname(rel))
            if parent and parent != os.path.basename(CANDIDATES):
                names.add(parent)
    return names


def cg4b_no_accepted_claim(paths, res, corpus=None):
    """No file in a candidate home claims the acceptance has happened.

    CG-4a's predicate is a missing word, and a missing word is the weak
    half: review RD-17's mutation M8b did not remove the word *candidate*, it
    replaced the whole banner with a confident, well-formed claim that the
    acts had been performed. This is the inverse predicate CG-5 has had for
    craft since it was written, applied to the tree that has no acts at all.

    Scoped to the banner region, because that is where a reader forms the
    belief, and negation-aware, because every truthful banner in this tree
    states its candidacy negatively — *"nothing here is accepted"*, *"No
    owner acceptance act has been performed over any of it"*. A predicate
    that could not read those would report the three correct banners in the
    repository as defects and be switched off within a day.

    **The "no acts at all" premise expired on 2026-08-17.** Craft acts 6 and
    7 bound `policy-candidates/`'s specification-acceptance and
    shape-to-spec-impact policies *at their committed home*, inside this
    tree, so CC-SPEC-1…11 and CC-IMPACT-1…7 are in force here and must be
    citable as authority. Until 2026-09-05 this check therefore forbade the
    front door from saying so, and the front door duly did not. The
    exemption is computed, never listed: a banner may carry an acceptance
    claim when it names a file, or the directory of a file, whose *current*
    sha256 is quoted in the performed-act record. An act that moves those
    bytes withdraws the exemption on the next run rather than aging into a
    stale allowlist, and a banner that claims acceptance while naming
    nothing act-bound — RD-17's mutation M8b, *"Accepted contract package —
    IN FORCE"* — still fails.
    """
    if corpus is None:
        corpus = [(p, read(p)) for p in paths
                  if p.endswith(".md")
                  and (p.startswith(f"{CANDIDATES}/")
                       or p.startswith(f"{TOPOLOGY_CANDIDATES}/"))
                  and not _verbatim_source(p)
                  and "/round-2026-08" not in p]
    exempting = _act_bound_names(paths)
    findings = []
    for rel, body in corpus:
        head = "\n".join(body.splitlines()[:BANNER_LINES])
        hit = _accepted_claim(head, exempting)
        if hit:
            findings.append(
                f"{rel} — banner claims `{hit[0]}` with no negation and "
                f"nothing act-bound named in the same sentence: “{hit[1]}”. "
                f"Only the owner accepts (VIS-4), and the only act-bound "
                f"material in this tree is "
                f"{', '.join(sorted(exempting)) or '(none)'}; a banner "
                f"claiming more is the labelled-accepted prohibition, at the "
                f"file a reader meets first")
    res.add("FAIL" if findings else ("OK" if corpus else "WARN"),
            "CG-4b  candidate homes claim no acceptance", len(corpus),
            len(findings), "file",
            note=None if corpus else "no candidate-tree markdown — nothing "
                                     "examined",
            details=findings)


# --------------------------------------------------------------- CG-5

FALSE_BANNERS = (
    "this copy is the bootstrap-phase record",
    "this file is the bootstrap-phase record",
    "this directory is the bootstrap-phase record",
)
CANONICAL_MARK = "canonical home"
BANNER_POSITIVE_LINES = 3
#: The install record is provenance, not a policy banner: it describes where
#: the policies came from and is expected to name the bootstrap-phase copy.
CRAFT_POSITIVE_EXEMPT = (f"{CRAFT}/INSTALL-RECORD.md",)


def cg5_craft_banners(paths, res):
    craft_files = sorted(p for p in paths
                         if p.startswith(f"{CRAFT}/") and p.endswith(".md"))
    findings = []
    for rel in craft_files:
        low = read(rel).lower()
        for bad in FALSE_BANNERS:
            if bad in low:
                findings.append(f"{rel} — claims \"{bad}\" at the canonical home")
        if rel in CRAFT_POSITIVE_EXEMPT:
            continue
        head = "\n".join(read(rel).splitlines()[:BANNER_POSITIVE_LINES]).lower()
        if CANONICAL_MARK not in head:
            findings.append(f"{rel} — banner does not name this the "
                            f"{CANONICAL_MARK} in its first "
                            f"{BANNER_POSITIVE_LINES} lines")
    status = "FAIL" if findings else ("OK" if craft_files else "WARN")
    res.add(status, "CG-5   canonical craft banners truthful", len(craft_files),
            len(findings), "file",
            note=None if craft_files else "craft tree absent — nothing examined",
            details=findings)


# --------------------------------------------------------------- CG-6

#: home -> (why, phrase-label prefix whose recorded performance creates it).
#: `contracts/rfcs/` is created by the FIRST wave act, so any recorded
#: `ACCEPT FOUNDATIONAL WAVE …` entry licenses it.
ACCEPTED_HOMES = (
    (".syzygy/governance/contracts/rfcs", "created only by a wave act",
     "ACCEPT FOUNDATIONAL WAVE"),
    (".syzygy/map/topology", "created only by owner act 3",
     "ACCEPT TOPOLOGY"),
)

ACT_RECORD_PATH = ".syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md"


def _recorded_act_labels():
    """Phrase labels recorded as PERFORMED in the owner-act record.

    Empty before the first act (the record file's absence is the correct
    pre-act state). A phrase counts only in the ceremony's step-4 shape —
    the exact phrase with its full 64-hex argument on one line — so prose
    that merely names a phrase records nothing.
    """
    if not os.path.exists(os.path.join(ROOT, ACT_RECORD_PATH)):
        return set()          # pre-first-act state: absence is correct
    body = read(ACT_RECORD_PATH)
    if not body:
        return set()
    labels = set()
    for m in re.finditer(
            r"^(ACCEPT FOUNDATIONAL WAVE [A-Z][0-9]?|ACCEPT TOPOLOGY|"
            r"ADOPT PROJECT OVERVIEW): ([0-9a-f]{64})\s*$", body, re.M):
        labels.add(m.group(1))
    for m in re.finditer(
            r"^(CONFIRM CRAFT AMENDMENT: [A-Za-z0-9-]+)@([0-9a-f]{64})\s*$",
            body, re.M):
        labels.add(m.group(1))
    return labels


def _home_act_recorded(rel, recorded):
    for home, _why, prefix in ACCEPTED_HOMES:
        if rel.rstrip("/") == home or rel.rstrip("/").endswith(home):
            return any(l.startswith(prefix) for l in recorded)
    return False


def cg6_accepted_homes(res):
    findings, created = [], []
    recorded = _recorded_act_labels()
    for rel, why, prefix in ACCEPTED_HOMES:
        if os.path.exists(os.path.join(ROOT, rel)):
            if any(l.startswith(prefix) for l in recorded):
                created.append(f"[created by recorded act] {rel} — the "
                               f"owner-act record carries its creating "
                               f"phrase with a full argument")
            else:
                findings.append(f"{rel} exists — {why}; no act has been "
                                f"recorded in {ACT_RECORD_PATH}")
    res.add("FAIL" if findings else "OK",
            "CG-6   accepted homes created only by recorded acts",
            len(ACCEPTED_HOMES), len(findings), "home",
            details=findings + created)


# --------------------------------------------------------------- CG-7

MANIFEST = f"{CANDIDATES}/ACTIVE-CONTRACT-MANIFEST.txt"
DIGEST_ROW = re.compile(r"^(?P<sha>[0-9a-f]{64})\s+(?P<path>\S.*)$")
#: The current active manifest is no act's argument. Wave manifests are act
#: arguments: unperformed waves track current candidate bytes, while performed
#: waves are immutable historical subjects whose own digest is recorded here.
ACCEPTANCE_RECORD = f"{CANDIDATES}/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md"
PERFORMED_ACT_RECORD = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
#: The 2026-09-01 transaction is an owner act outside the foundational
#: phrase registry. Its one argument binds seven nested subjects, including
#: the current CC-SPEC bytes. Keeping the outer act explicit here lets CG-7
#: verify both the performed transaction and the nested policy amendment
#: without pretending the old foundational offering owns this later act.
GENERAL_BOOTSTRAP_LABEL = (
    "SIGN OFF GENERAL TRUSTED-BOOTSTRAP AUTHORIZATION TRANSACTION")
GENERAL_BOOTSTRAP_DIR = (
    f"{CANDIDATES}/general-trusted-bootstrap-authorization")
GENERAL_BOOTSTRAP_SUBJECT = f"{GENERAL_BOOTSTRAP_DIR}/TRANSACTION-MANIFEST.txt"
GENERAL_BOOTSTRAP_CONTRACT_MANIFEST = (
    f"{GENERAL_BOOTSTRAP_DIR}/CONTRACT-AMENDMENT-MANIFEST.txt")
GENERAL_BOOTSTRAP_PWB_MANIFEST = (
    f"{GENERAL_BOOTSTRAP_DIR}/PWB-COVERAGE-AMENDMENT-MANIFEST.txt")
GENERAL_BOOTSTRAP_ACT = (
    f"{DECISIONS}/GENERAL-TRUSTED-BOOTSTRAP-AUTHORIZATION-ACT.md")
PWB_STATE1_LABEL = "SIGN OFF PWB STATE-(1) AMENDMENT"
PWB_STATE1_DIR = f"{CANDIDATES}/pwb-state1-amendment"
PWB_STATE1_SUBJECT = f"{PWB_STATE1_DIR}/PWB-AMENDMENT-MANIFEST.txt"
PWB_STATE1_ACT = f"{DECISIONS}/PWB-STATE1-AMENDMENT-ACT.md"
PWB_TRUTH_AMENDMENT_LABEL = "SIGN OFF PWB TRUTH-AND-READINESS AMENDMENT"
PWB_TRUTH_AMENDMENT_DIR = f"{CANDIDATES}/pwb-truth-policy-amendment"
PWB_TRUTH_AMENDMENT_SUBJECT = (
    f"{PWB_TRUTH_AMENDMENT_DIR}/PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt")
PWB_TRUTH_AMENDMENT_ACT = (
    f"{DECISIONS}/PWB-TRUTH-READINESS-AMENDMENT-ACT.md")
PWB_REGISTRY_CURRENCY_DIR = (
    f"{CANDIDATES}/pwb-registry-currency-briefing-amendment")
#: The 2026-10-02 behaviour-contract re-pin (`syzygy-jloi`): two separate
#: superseding effect acts, one per row of its two-row manifest.
PWB_BEHAVIOR_REPIN_DIR = f"{CANDIDATES}/pwb-behavior-contract-repin"
PWB_BEHAVIOR_REPIN_MANIFEST = f"{PWB_BEHAVIOR_REPIN_DIR}/PWB-EFFECT-REPIN-MANIFEST.txt"
PWB_SCOPE_DIR = f"{CANDIDATES}/public-source-screening-scope"
PWB_SCOPE_MANIFEST = f"{PWB_SCOPE_DIR}/PUBLIC-SOURCE-SCREENING-SCOPE-MANIFEST.txt"
PWB_SCOPE_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md"
#: The public-repository admission package (`syzygy-mea`): three separate
#: state-(1) acts, each over one record and each given by an option selection
#: at that record's manifest row (packet Q5). Candidate registration only
#: (labels, subjects, manifest copy); the performed-act records and any chain
#: link arrive with the acts. The manifest's rows are the live digests of the
#: subjects.
PUBLIC_ADMISSION_DIR = f"{CANDIDATES}/public-repo-admission"
PUBLIC_ADMISSION_MANIFEST = f"{PUBLIC_ADMISSION_DIR}/PUBLIC-REPO-ADMISSION-MANIFEST.txt"
PUBLIC_ADMISSION_DISPOSITIONS = f"{PUBLIC_ADMISSION_DIR}/ROUND-7-DISPOSITIONS.md"
PUBLIC_ADMISSION_ACTS = (
    ("CONSENT TO PUBLIC OBSERVATION OF PSF-REQUESTS",
     f"{PUBLIC_ADMISSION_DIR}/instances/requests/OBSERVATION-CONSENT.md"),
    ("CONSENT TO PUBLIC OBSERVATION OF REDIS-REDIS",
     f"{PUBLIC_ADMISSION_DIR}/instances/redis/OBSERVATION-CONSENT.md"),
    ("CONSENT TO PUBLIC TARGET EGRESS TO ANTHROPIC",
     f"{PUBLIC_ADMISSION_DIR}/instances/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md"),
)
#: Lane B of the 2026-09-13 Polaris page-size funnel (P-67 question 2):
#: registered before its packet exists so a stale argument copy fails CG-7d
#: and CG-7e. Its manifest hashes proposed bytes (candidate patches applied),
#: so it binds current bytes only once its act record exists.
PWB_SCOPED_AMENDMENT_LABEL = "SIGN OFF PWB SCOPED-ATTRIBUTES AMENDMENT"
PWB_SCOPED_AMENDMENT_DIR = f"{CANDIDATES}/pwb-scoped-attributes-amendment"
PWB_SCOPED_AMENDMENT_SUBJECT = (
    f"{PWB_SCOPED_AMENDMENT_DIR}/PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt")
PWB_SCOPED_AMENDMENT_ACT = (
    f"{DECISIONS}/PWB-SCOPED-ATTRIBUTES-AMENDMENT-ACT.md")
#: The P-81 (M14) exact-source render-mode scenario, drafted 2026-09-21 and
#: registered before its packet exists for the same CG-7d/CG-7e reason. It
#: amends the same closed eleven-path behavior population and its manifest
#: likewise hashes proposed bytes. It is deliberately NOT a
#: `PWB_SUCCESSOR_CHAIN` link yet: two candidate successors now sit behind
#: the truth-and-readiness link and their performance order is the owner's
#: to set, so the link is registered with the act that performs it.
PWB_RENDER_MODE_LABEL = "SIGN OFF PWB EXACT-SOURCE RENDER-MODE AMENDMENT"
PWB_RENDER_MODE_DIR = f"{CANDIDATES}/pwb-exact-source-render-mode-scenario"
PWB_RENDER_MODE_SUBJECT = (
    f"{PWB_RENDER_MODE_DIR}/PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt")
PWB_RENDER_MODE_ACT = (
    f"{DECISIONS}/PWB-EXACT-SOURCE-RENDER-MODE-AMENDMENT-ACT.md")
#: The P-72 (M5) machine-view amendment and the P-71 (M4) opening-band
#: scenario, both drafted 2026-09-21 against the same eleven-path behavior
#: population, registered on the same terms as the render-mode package:
#: packet copies watched now, act records registered once they exist, and
#: no `PWB_SUCCESSOR_CHAIN` link until an act fixes the performance order.
PWB_MACHINE_VIEW_LABEL = "SIGN OFF PWB MACHINE-VIEW AMENDMENT"
PWB_MACHINE_VIEW_DIR = f"{CANDIDATES}/pwb-machine-view-amendment"
PWB_MACHINE_VIEW_SUBJECT = (
    f"{PWB_MACHINE_VIEW_DIR}/PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt")
PWB_MACHINE_VIEW_ACT = (
    f"{DECISIONS}/PWB-MACHINE-VIEW-AMENDMENT-ACT.md")
PWB_OPENING_BAND_LABEL = "SIGN OFF PWB OPENING-BAND SCENARIO"
PWB_OPENING_BAND_DIR = f"{CANDIDATES}/pwb-opening-band-scenario"
PWB_OPENING_BAND_SUBJECT = (
    f"{PWB_OPENING_BAND_DIR}/PWB-OPENING-BAND-SCENARIO-MANIFEST.txt")
PWB_OPENING_BAND_ACT = (
    f"{DECISIONS}/PWB-OPENING-BAND-SCENARIO-ACT.md")
#: P-69 Q7a's outside-slot missing-currency disclosure scenario. Candidate
#: registration watches the offered argument without asserting adoption order;
#: an act adds the successor-chain link only when the owner performs it.
PWB_MISSING_CURRENCY_LABEL = "SIGN OFF PWB MISSING-CURRENCY DISCLOSURE SCENARIO"
PWB_MISSING_CURRENCY_DIR = (
    f"{CANDIDATES}/pwb-missing-currency-disclosure-scenario")
PWB_MISSING_CURRENCY_SUBJECT = (
    f"{PWB_MISSING_CURRENCY_DIR}/"
    "PWB-MISSING-CURRENCY-DISCLOSURE-MANIFEST.txt")
PWB_MISSING_CURRENCY_ACT = (
    f"{DECISIONS}/PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-ACT.md")
#: P-79 Q5's dismissal-with-expiry amendment to PWB-REQ-007. Registered the
#: same way: packet copy watched now, act records once they exist, and no
#: successor-chain link until an act fixes the performance order.
PWB_DISMISSAL_EXPIRY_LABEL = "SIGN OFF PWB DISMISSAL-EXPIRY AMENDMENT"
PWB_DISMISSAL_EXPIRY_DIR = f"{CANDIDATES}/pwb-dismissal-expiry-amendment"
PWB_DISMISSAL_EXPIRY_SUBJECT = (
    f"{PWB_DISMISSAL_EXPIRY_DIR}/PWB-DISMISSAL-EXPIRY-MANIFEST.txt")
PWB_DISMISSAL_EXPIRY_ACT = (
    f"{DECISIONS}/PWB-DISMISSAL-EXPIRY-AMENDMENT-ACT.md")
PWB_CONTAINER_SHAPE_LABEL = "SIGN OFF PWB CONTAINER-SHAPE PROFILE AMENDMENT"
PWB_CONTAINER_SHAPE_DIR = (
    f"{CANDIDATES}/pwb-container-shape-profile-amendment")
PWB_CONTAINER_SHAPE_SUBJECT = (
    f"{PWB_CONTAINER_SHAPE_DIR}/PWB-CONTAINER-SHAPE-PROFILE-MANIFEST.txt")
PWB_CONTAINER_SHAPE_ACT = (
    f"{DECISIONS}/PWB-CONTAINER-SHAPE-PROFILE-AMENDMENT-ACT.md")
#: P-81 Q5's item-depth amendment to PWB-REQ-015. Candidate registration
#: watches the not-yet-offered packet argument without asserting adoption or
#: successor order. A future act adds its own chain link.
PWB_ITEM_DEPTH_LABEL = "SIGN OFF PWB ITEM-DEPTH AMENDMENT"
PWB_ITEM_DEPTH_DIR = f"{CANDIDATES}/pwb-item-depth-amendment"
PWB_ITEM_DEPTH_SUBJECT = (
    f"{PWB_ITEM_DEPTH_DIR}/PWB-ITEM-DEPTH-AMENDMENT-MANIFEST.txt")
PWB_ITEM_DEPTH_ACT = f"{DECISIONS}/PWB-ITEM-DEPTH-AMENDMENT-ACT.md"
#: The PWB readability successor: a restyle of the same eleven artifacts,
#: signed by version tag after item depth.
PWB_READABILITY_LABEL = "SIGN OFF PWB READABILITY SUCCESSOR"
PWB_READABILITY_DIR = f"{CANDIDATES}/pwb-readability-successor"
PWB_READABILITY_SUBJECT = (
    f"{PWB_READABILITY_DIR}/PWB-READABILITY-SUCCESSOR-MANIFEST.txt")
PWB_READABILITY_ACT = f"{DECISIONS}/PWB-READABILITY-SUCCESSOR-ACT.md"
#: The PWB tree-framing amendment to PWB-REQ-014 (`syzygy-73e.9`): openings
#: and supported inert diagrams on Polaris. A candidate signed by version tag;
#: its row below is existence-gated on a sign-off record.
PWB_TREE_FRAMING_LABEL = "SIGN OFF PWB TREE-FRAMING AMENDMENT"
PWB_TREE_FRAMING_DIR = f"{CANDIDATES}/pwb-tree-framing-amendment"
PWB_TREE_FRAMING_SUBJECT = (
    f"{PWB_TREE_FRAMING_DIR}/PWB-TREE-FRAMING-AMENDMENT-MANIFEST.txt")
PWB_TREE_FRAMING_ACT = f"{DECISIONS}/PWB-TREE-FRAMING-AMENDMENT-ACT.md"
#: The PWB anchor-resolution amendment to PWB-REQ-014 (`syzygy-u05.9`, N9
#: PWB half), signed by version tag 2026-10-14 after tree framing.
PWB_ANCHOR_RESOLUTION_LABEL = "SIGN OFF PWB ANCHOR-RESOLUTION AMENDMENT"
PWB_ANCHOR_RESOLUTION_DIR = f"{CANDIDATES}/pwb-anchor-resolution-amendment"
PWB_ANCHOR_RESOLUTION_SUBJECT = (
    f"{PWB_ANCHOR_RESOLUTION_DIR}/PWB-ANCHOR-RESOLUTION-AMENDMENT-MANIFEST.txt")
PWB_ANCHOR_RESOLUTION_ACT = f"{DECISIONS}/PWB-ANCHOR-RESOLUTION-AMENDMENT-ACT.md"
#: The PWB class-granular extraction amendment to PWB-REQ-002 (ruling P-82
#: (A), funnel move M15, P-86), signed by version tag 2026-10-14 after
#: anchor resolution.
PWB_CLASS_GRANULAR_LABEL = "SIGN OFF PWB CLASS-GRANULAR EXTRACTION AMENDMENT"
PWB_CLASS_GRANULAR_DIR = f"{CANDIDATES}/pwb-class-granular-extraction-amendment"
PWB_CLASS_GRANULAR_SUBJECT = (
    f"{PWB_CLASS_GRANULAR_DIR}/PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-MANIFEST.txt")
PWB_CLASS_GRANULAR_ACT = f"{DECISIONS}/PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-ACT.md"
#: The PWB accessible-name amendment to PWB-REQ-016 (pursuit move N12, slice
#: C, P-99), signed by version tag 2026-10-15 after class-granular.
PWB_ACCESSIBLE_NAME_LABEL = "SIGN OFF PWB ACCESSIBLE-NAME AMENDMENT"
PWB_ACCESSIBLE_NAME_DIR = f"{CANDIDATES}/pwb-accessible-name-amendment"
PWB_ACCESSIBLE_NAME_SUBJECT = (
    f"{PWB_ACCESSIBLE_NAME_DIR}/PWB-ACCESSIBLE-NAME-AMENDMENT-MANIFEST.txt")
PWB_ACCESSIBLE_NAME_ACT = f"{DECISIONS}/PWB-ACCESSIBLE-NAME-AMENDMENT-ACT.md"
#: The PWB opening-index amendment to PWB-REQ-010 (pursuit move N12, slice
#: A, P-98), signed by version tag 2026-10-15 after accessible-name.
PWB_OPENING_INDEX_LABEL = "SIGN OFF PWB OPENING-INDEX AMENDMENT"
PWB_OPENING_INDEX_DIR = f"{CANDIDATES}/pwb-opening-index-amendment"
PWB_OPENING_INDEX_SUBJECT = (
    f"{PWB_OPENING_INDEX_DIR}/PWB-OPENING-INDEX-AMENDMENT-MANIFEST.txt")
PWB_OPENING_INDEX_ACT = f"{DECISIONS}/PWB-OPENING-INDEX-AMENDMENT-ACT.md"
#: PWB task 1.7 — three separate effect-specific owner acts (PWB-REQ-005).
#: Each act's argument is the SHA-256 of the artifact it binds, so RFC3-16(b)
#: item 3 is satisfied by the phrase itself; the packet lives in
#: `contracts/candidates/pwb-effect-acts/` and is generated by
#: `scripts/build_pwb_effect_acts_packet.py`.
PWB_EFFECT_ACTS_DIR = f"{CANDIDATES}/pwb-effect-acts"
PWB_EFFECT_ACTS = (
    ("CONSENT TO BUTLERS PROJECT-SHAPE OBSERVATION",
     f"{DECISIONS}/BUTLERS-PROJECT-SHAPE-OBSERVATION-CONSENT.md",
     f"{DECISIONS}/PWB-BUTLERS-OBSERVATION-CONSENT-ACT.md"),
    ("APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY",
     ".syzygy/governance/policies/"
     "POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json",
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-ACT.md"),
    ("ADOPT POLARIS BUTLERS PROJECT-SHAPE OBSERVER REGISTRY ENTRY",
     ".syzygy/governance/declarations/adapter-registry/"
     "POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json",
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-ENTRY-ACT.md"),
)
PWB_EFFECT_ACT_LABELS = tuple(label for label, _s, _a in PWB_EFFECT_ACTS)
#: The public-admission registry entries (`syzygy-mea`): two separate state-(1)
#: acts over whole proposed files, each given by an option selection at that
#: file's manifest row. Candidate registration only (labels, subjects, manifest
#: copy), no chain link; the performed records arrive with the acts.
PUBLIC_REGISTRY_DIR = f"{CANDIDATES}/public-admission-registry-entries"
PUBLIC_REGISTRY_MANIFEST = f"{PUBLIC_REGISTRY_DIR}/PUBLIC-ADMISSION-REGISTRY-MANIFEST.txt"
PUBLIC_REGISTRY_DISPOSITIONS = f"{PUBLIC_REGISTRY_DIR}/ROUND-4-DISPOSITIONS.md"
PUBLIC_REGISTRY_ACTS = (
    ("ADOPT POLARIS PROVIDER EXECUTION ROUTE REGISTRY ENTRY",
     f"{PUBLIC_REGISTRY_DIR}/proposed/POLARIS-PROVIDER-ROUTE-ANTHROPIC-AGENT-SDK-CANDIDATE.json"),
    ("ADOPT POLARIS PUBLIC GIT SOURCE-ACQUISITION REGISTRY ENTRY",
     f"{PUBLIC_REGISTRY_DIR}/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json"),
)
#: The Messages API provider route entry (route B): one state-(1) act over a
#: whole proposed file, given at its manifest row. It substitutes for the Agent
#: SDK provider entry (RFC4-1) and registers no chain link; the performed
#: record arrives with the act.
MESSAGES_API_DIR = f"{CANDIDATES}/provider-route-messages-api-entry"
MESSAGES_API_MANIFEST = f"{MESSAGES_API_DIR}/MESSAGES-API-ROUTE-REGISTRY-MANIFEST.txt"
MESSAGES_API_ACTS = (
    ("ADOPT POLARIS MESSAGES API PROVIDER EXECUTION ROUTE REGISTRY ENTRY",
     f"{MESSAGES_API_DIR}/proposed/POLARIS-PROVIDER-ROUTE-ANTHROPIC-MESSAGES-API-CANDIDATE.json"),
)
#: The second Anthropic egress version (sitting row 8): one state-(1) consent
#: act over one record, given at its manifest row. Its phrase label differs from
#: the first version's so the two subjects register separately; it depends on
#: sitting row 7 and registers no chain link; the performed record arrives with
#: the act. The round notes records are registered once they exist.
PUBLIC_EGRESS_V2_DIR = f"{CANDIDATES}/public-egress-v2"
PUBLIC_EGRESS_V2_MANIFEST = f"{PUBLIC_EGRESS_V2_DIR}/PUBLIC-EGRESS-V2-MANIFEST.txt"
PUBLIC_EGRESS_V2_DISPOSITION_NAMES = ("ROUND-3-DISPOSITIONS.md",)
PUBLIC_EGRESS_V2_ACTS = (
    ("CONSENT TO PUBLIC TARGET EGRESS TO ANTHROPIC VERSION 2",
     f"{PUBLIC_EGRESS_V2_DIR}/instances/egress-anthropic/EGRESS-CONSENT-ANTHROPIC.md"),
)
#: The local-agent dossier sitting (syzygy-qkea.14): five separate state-(1)
#: acts, each over one record named by a row of the sitting manifest, given by
#: option selection at that row. Registered before the packet exists so a stale
#: argument copy fails CG-7d and CG-7e; the performed records arrive with the
#: acts and no chain link is registered. The manifest's registry-entry row is no
#: act's argument (that entry is signed by version tag). Only the confirming
#: round's notes record carries the phrases; it joins this tuple when that round
#: returns (a REVISE round's record quotes no digest and is not registered).
DOSSIER_LOCAL_AGENT_DIR = f"{CANDIDATES}/dossier-local-agent-acts"
DOSSIER_LOCAL_AGENT_MANIFEST = f"{DOSSIER_LOCAL_AGENT_DIR}/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt"
#: Each round's dispositions record, with the labels whose current argument it
#: carries (None: all five). Round 2's drawer phrase was retired on 2026-10-07,
#: when the round-3 repair of its note 6 changed that record.
DOSSIER_LOCAL_AGENT_DISPOSITION_NAMES: dict[str, tuple[str, ...] | None] = {
    "ROUND-2-DISPOSITIONS.md": (
        "CONSENT TO AGENT PROVIDER ANTHROPIC FOR REDIS-REDIS",
        "CONSENT TO AGENT PROVIDER OPENAI FOR REDIS-REDIS",
        "BIND D9 TO EXACT BYTES FOR OPERATOR-AGENT RUNS",
        "BIND RFC7-20 READING TO EXACT BYTES FOR OPERATOR-AGENT RUNS",
    ),
    "ROUND-3-DISPOSITIONS.md": None,
}
DOSSIER_LOCAL_AGENT_ACTS = (
    ("STATE NO KERNEL EVIDENCE DRAWER FOR REDIS-REDIS",
     f"{DOSSIER_LOCAL_AGENT_DIR}/instances/redis/NO-EVIDENCE-DRAWER-STATEMENT.md"),
    ("CONSENT TO AGENT PROVIDER ANTHROPIC FOR REDIS-REDIS",
     f"{DOSSIER_LOCAL_AGENT_DIR}/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md"),
    ("CONSENT TO AGENT PROVIDER OPENAI FOR REDIS-REDIS",
     f"{DOSSIER_LOCAL_AGENT_DIR}/instances/redis/AGENT-PROVIDER-STATEMENT-OPENAI.md"),
    ("BIND D9 TO EXACT BYTES FOR OPERATOR-AGENT RUNS",
     f"{DOSSIER_LOCAL_AGENT_DIR}/instances/in-force/D9-IN-FORCE-RECORD.md"),
    ("BIND RFC7-20 READING TO EXACT BYTES FOR OPERATOR-AGENT RUNS",
     f"{DOSSIER_LOCAL_AGENT_DIR}/instances/in-force/RFC7-20-READING-IN-FORCE-RECORD.md"),
)
#: Each act's dedicated record, written by `record_dossier_local_agent_acts.py`;
#: registered with the aggregate record once it exists (its selftest checks
#: these paths against the recorder's own).
#: Version 2 of the Redis Anthropic provider statement (register row P-106): one consent act over the one row of its manifest,
#: written by `record_dossier_agent_provider_v2_act.py`. Its label avoids
#: version 1's sweep stems (the package's SEMANTIC-DELTA says why). Version 1's
#: subject bytes are unchanged, so its copies stay current and nothing is
#: pinned as history; the gate reads version 2 in its place from its instant.
DOSSIER_PROVIDER_V2_DIR = f"{CANDIDATES}/dossier-agent-provider-v2"
DOSSIER_PROVIDER_V2_MANIFEST = f"{DOSSIER_PROVIDER_V2_DIR}/DOSSIER-AGENT-PROVIDER-V2-MANIFEST.txt"
DOSSIER_PROVIDER_V2_ACTS = (
    ("CONSENT TO ANTHROPIC AGENT PROVIDER VERSION 2 FOR REDIS",
     f"{DOSSIER_PROVIDER_V2_DIR}/instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md"),
)
DOSSIER_PROVIDER_V2_SUPERSEDES = "CONSENT TO AGENT PROVIDER ANTHROPIC FOR REDIS-REDIS"
DOSSIER_PROVIDER_V2_ACT_RECORDS = {
    "CONSENT TO ANTHROPIC AGENT PROVIDER VERSION 2 FOR REDIS":
        f"{DECISIONS}/DOSSIER-AGENT-PROVIDER-V2-REDIS-ANTHROPIC-ACT.md",
}
DOSSIER_LOCAL_AGENT_ACT_RECORDS = {
    "STATE NO KERNEL EVIDENCE DRAWER FOR REDIS-REDIS":
        f"{DECISIONS}/DOSSIER-LOCAL-AGENT-REDIS-NO-EVIDENCE-DRAWER-ACT.md",
    "CONSENT TO AGENT PROVIDER ANTHROPIC FOR REDIS-REDIS":
        f"{DECISIONS}/DOSSIER-LOCAL-AGENT-REDIS-AGENT-ANTHROPIC-ACT.md",
    "CONSENT TO AGENT PROVIDER OPENAI FOR REDIS-REDIS":
        f"{DECISIONS}/DOSSIER-LOCAL-AGENT-REDIS-AGENT-OPENAI-ACT.md",
    "BIND D9 TO EXACT BYTES FOR OPERATOR-AGENT RUNS":
        f"{DECISIONS}/DOSSIER-LOCAL-AGENT-D9-IN-FORCE-ACT.md",
    "BIND RFC7-20 READING TO EXACT BYTES FOR OPERATOR-AGENT RUNS":
        f"{DECISIONS}/DOSSIER-LOCAL-AGENT-RFC7-20-READING-IN-FORCE-ACT.md",
}
#: Decisions 2 and 3 of the truth-and-readiness packet re-perform the policy
#: and registry acts over amended artifact bytes. Each amended act gets its own
#: new dedicated record (`record_pwb_effect_amendment_acts.py`); the
#: 2026-09-02 record, the frozen effect-acts packet files and their act-time
#: digest are immutable history and are re-registered as such once the
#: successor record exists. Rows: label, subject, 2026-09-02 record,
#: amendment record, 2026-09-02 performed digest.
PWB_EFFECT_AMENDMENT_ACTS = (
    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1], PWB_EFFECT_ACTS[1][2],
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md",
     "513a3be75bbd417a06d475c46bb423393ac59013e307157357083f29781a2a61"),
    (PWB_EFFECT_ACTS[2][0], PWB_EFFECT_ACTS[2][1], PWB_EFFECT_ACTS[2][2],
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-ENTRY-AMENDMENT-ACT.md",
     "d71eadb612cf657983d96ad44415b832054dc37e51ea674e569d9b8f655d05d7"),
    # The 2026-09-30 currency-and-briefing act supersedes the 2026-09-05
    # amendment for the same registry subject.
    (PWB_EFFECT_ACTS[2][0], PWB_EFFECT_ACTS[2][1],
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-ENTRY-AMENDMENT-ACT.md",
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md",
     "0765f4d534afad9003463790113fd433d250550091df783c1ff372d227643e4f"),
    # The 2026-10-02 behaviour-contract re-pin: two separate acts, each
    # superseding the act then in force over its subject.
    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md",
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md",
     "d148f0360841cfc30cdc9ecedbffe722e31044e4bb048cd33f83cc193ee88e75"),
    (PWB_EFFECT_ACTS[2][0], PWB_EFFECT_ACTS[2][1],
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md",
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md",
     "2356b9ed3235b3dff79caeb352803a30c446b7365a2a7ea74df302b9fa51386a"),
    # The public-source screening-scope act supersedes the 2026-10-02 re-pin
    # act for the policy subject.
    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md",
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md",
     "66cd41ee626efb11d666d19c0cd42c6d001ec4482837b71475c42f661f1d936c"),
    # The public-source screening-scope version-2 act supersedes the version-1 act for
    # the policy subject (screening-scope v2 chain row).
    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md",
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md",
     "d42defcaf4dbb9b4e815f988ef8ba62be1dad081aa851d430b427b35c42f346b"),
    # The public-source screening-scope version-3 act supersedes the version-2 act for
    # the policy subject (screening-scope v3 chain row).
    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md",
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md",
     "98a87f818e0c60ca11f808f9122bbd4b1df1ad72a29f85eb81b879fd644d3f49"),
    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md",
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md",
     "c13bd56c70698ccdf55fa2b0a81ed51f4b3f385848d5eccd97b8be3cfad48fce"),
    # The version-5 screening-scope act (P-116, variant bcd, 2026-11-03) supersedes the
    # version-4 act for the policy subject.
    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md",
     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md",
     "319e404ee413220550d65644f6c93db096ed1cda431760baec70a1e190adb0bd"),
    # P-114's one registry row supersedes act B; all old copies stay history.
    (PWB_EFFECT_ACTS[2][0], PWB_EFFECT_ACTS[2][1],
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md",
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md",
     "ad9cd6769bffbb1a3ef94625c73226dec133fb7c9f1e0bc40186b09b15e165fa"),
)
#: For a chained amendment row, the package that offered the predecessor
#: amendment: its files hold the predecessor's argument as history once the
#: later link is performed ("row" = manifest row, "phrase" = phrase line).
PWB_EFFECT_AMENDMENT_OFFERINGS = {
    f"{DECISIONS}/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md": {
        PWB_BEHAVIOR_REPIN_MANIFEST: "row",
    },
    f"{DECISIONS}/PWB-OBSERVER-REGISTRY-ENTRY-AMENDMENT-ACT.md": {
        f"{CANDIDATES}/pwb-truth-policy-amendment/PWB-EFFECT-AMENDMENT-MANIFEST.txt": "row",
        f"{CANDIDATES}/pwb-truth-policy-amendment/OWNER-DECISION-PACKET.md": "phrase",
    },
    # The 2026-09-05 policy amendment was offered by the same package.
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md": {
        f"{CANDIDATES}/pwb-truth-policy-amendment/PWB-EFFECT-AMENDMENT-MANIFEST.txt": "row",
        f"{CANDIDATES}/pwb-truth-policy-amendment/OWNER-DECISION-PACKET.md": "phrase",
    },
    # The 2026-09-30 registry act was offered as its manifest's single row;
    # its packet by design carries no digest.
    f"{DECISIONS}/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md": {
        f"{CANDIDATES}/pwb-registry-currency-briefing-amendment/PWB-EFFECT-AMENDMENT-MANIFEST.txt": "row",
    },    # The 2026-10-02 policy re-pin was offered as a row of the re-pin manifest;
    # its packet by design carries no digest.
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md": {
        PWB_BEHAVIOR_REPIN_MANIFEST: "row",
    },

    # The version-1 screening-scope act was offered as the one row of its manifest;
    # its packet by design carries no digest.
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md": {
        f"{CANDIDATES}/public-source-screening-scope/PUBLIC-SOURCE-SCREENING-SCOPE-MANIFEST.txt": "row",
    },
    # The version-2 screening-scope act was offered as the chosen variant's row of its
    # manifest, a row that ends in its `[variant: …]` tag; its packet carries no digest.
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md": {
        f"{CANDIDATES}/public-source-screening-scope-v2/PUBLIC-SOURCE-SCREENING-SCOPE-V2-MANIFEST.txt": "variant-row",
    },
    # The version-3 screening-scope act was offered the same way (variant row of its manifest).
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md": {
        f"{CANDIDATES}/public-source-screening-scope-v3/PUBLIC-SOURCE-SCREENING-SCOPE-V3-MANIFEST.txt": "variant-row",
    },
    # The version-4 screening-scope act was offered the same way (variant row of its manifest).
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md": {
        f"{CANDIDATES}/public-source-screening-scope-v4/PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt": "variant-row",
    },
}
PWB_STATE1_SUBJECTS = tuple(sorted((
    "openspec/changes/polaris-project-wide-butlers-model/.openspec.yaml",
    "openspec/changes/polaris-project-wide-butlers-model/proposal.md",
    "openspec/changes/polaris-project-wide-butlers-model/design.md",
    "openspec/changes/polaris-project-wide-butlers-model/specs/"
    "polaris-project-wide-butlers-model/spec.md",
    "openspec/changes/polaris-project-wide-butlers-model/CAPABILITY-COVERAGE.md",
    "openspec/changes/polaris-project-wide-butlers-model/CONTRACT-COVERAGE.md",
    "openspec/changes/polaris-project-wide-butlers-model/"
    "CONTRACT-COVERAGE-REPAIR-DELTA.md",
    "openspec/changes/polaris-project-wide-butlers-model/GOVERNING-DEPENDENCIES.md",
    "openspec/changes/polaris-project-wide-butlers-model/"
    "contract-coverage-matrix/RFC-0001-0003.md",
    "openspec/changes/polaris-project-wide-butlers-model/"
    "contract-coverage-matrix/RFC-0004-0006.md",
    "openspec/changes/polaris-project-wide-butlers-model/"
    "contract-coverage-matrix/RFC-0007-0009.md",
)))
#: The truth-and-readiness amendment binds the same closed eleven-path
#: population as the state-(1) amendment; only the bytes differ.
PWB_TRUTH_AMENDMENT_SUBJECTS = PWB_STATE1_SUBJECTS
#: The scoped-attributes amendment binds the same eleven paths again.
PWB_SCOPED_AMENDMENT_SUBJECTS = PWB_STATE1_SUBJECTS
#: So does the exact-source render-mode amendment.
PWB_RENDER_MODE_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_MACHINE_VIEW_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_OPENING_BAND_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_MISSING_CURRENCY_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_DISMISSAL_EXPIRY_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_CONTAINER_SHAPE_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_ITEM_DEPTH_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_READABILITY_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_TREE_FRAMING_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_ANCHOR_RESOLUTION_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_CLASS_GRANULAR_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_ACCESSIBLE_NAME_SUBJECTS = PWB_STATE1_SUBJECTS
PWB_OPENING_INDEX_SUBJECTS = PWB_STATE1_SUBJECTS
#: Packages signed by version tag under
#: `decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, in
#: performance order: `(key, record stem, label, subject manifest, act path,
#: subjects, owner packet)`. A version-tagged sign-off carries no phrase and no
#: digest argument. Everything below derives from this table: the
#: `PWB_SUCCESSOR_CHAIN` links, the CG-7h inputs, the packet exemption and the
#: synthetic-tree fixtures. Adding the next package is one row here (plus its
#: constants above and its row in `record_versioned_signoff.py`).
VERSIONED_PWB_PACKAGES = (
    ("missing-currency", "PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO",
     PWB_MISSING_CURRENCY_LABEL, PWB_MISSING_CURRENCY_SUBJECT,
     PWB_MISSING_CURRENCY_ACT, PWB_MISSING_CURRENCY_SUBJECTS,
     f"{PWB_MISSING_CURRENCY_DIR}/OWNER-DECISION-PACKET.md"),
    ("dismissal-expiry", "PWB-DISMISSAL-EXPIRY-AMENDMENT",
     PWB_DISMISSAL_EXPIRY_LABEL, PWB_DISMISSAL_EXPIRY_SUBJECT,
     PWB_DISMISSAL_EXPIRY_ACT, PWB_DISMISSAL_EXPIRY_SUBJECTS,
     f"{PWB_DISMISSAL_EXPIRY_DIR}/OWNER-DECISION-PACKET.md"),
    ("container-shape", "PWB-CONTAINER-SHAPE-PROFILE-AMENDMENT",
     PWB_CONTAINER_SHAPE_LABEL, PWB_CONTAINER_SHAPE_SUBJECT,
     PWB_CONTAINER_SHAPE_ACT, PWB_CONTAINER_SHAPE_SUBJECTS,
     f"{PWB_CONTAINER_SHAPE_DIR}/OWNER-DECISION-PACKET.md"),
    ("item-depth", "PWB-ITEM-DEPTH-AMENDMENT",
     PWB_ITEM_DEPTH_LABEL, PWB_ITEM_DEPTH_SUBJECT,
     PWB_ITEM_DEPTH_ACT, PWB_ITEM_DEPTH_SUBJECTS,
     f"{PWB_ITEM_DEPTH_DIR}/OWNER-DECISION-PACKET.md"),
    ("readability", "PWB-READABILITY-SUCCESSOR",
     PWB_READABILITY_LABEL, PWB_READABILITY_SUBJECT,
     PWB_READABILITY_ACT, PWB_READABILITY_SUBJECTS,
     f"{PWB_READABILITY_DIR}/OWNER-DECISION-PACKET.md"),
    ("tree-framing", "PWB-TREE-FRAMING-AMENDMENT",
     PWB_TREE_FRAMING_LABEL, PWB_TREE_FRAMING_SUBJECT,
     PWB_TREE_FRAMING_ACT, PWB_TREE_FRAMING_SUBJECTS,
     f"{PWB_TREE_FRAMING_DIR}/OWNER-DECISION-PACKET.md"),
    ("anchor-resolution", "PWB-ANCHOR-RESOLUTION-AMENDMENT",
     PWB_ANCHOR_RESOLUTION_LABEL, PWB_ANCHOR_RESOLUTION_SUBJECT,
     PWB_ANCHOR_RESOLUTION_ACT, PWB_ANCHOR_RESOLUTION_SUBJECTS,
     f"{PWB_ANCHOR_RESOLUTION_DIR}/OWNER-DECISION-PACKET.md"),
    ("class-granular", "PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT",
     PWB_CLASS_GRANULAR_LABEL, PWB_CLASS_GRANULAR_SUBJECT,
     PWB_CLASS_GRANULAR_ACT, PWB_CLASS_GRANULAR_SUBJECTS,
     f"{PWB_CLASS_GRANULAR_DIR}/OWNER-DECISION-PACKET.md"),
    ("accessible-name", "PWB-ACCESSIBLE-NAME-AMENDMENT",
     PWB_ACCESSIBLE_NAME_LABEL, PWB_ACCESSIBLE_NAME_SUBJECT,
     PWB_ACCESSIBLE_NAME_ACT, PWB_ACCESSIBLE_NAME_SUBJECTS,
     f"{PWB_ACCESSIBLE_NAME_DIR}/OWNER-DECISION-PACKET.md"),
    ("opening-index", "PWB-OPENING-INDEX-AMENDMENT",
     PWB_OPENING_INDEX_LABEL, PWB_OPENING_INDEX_SUBJECT,
     PWB_OPENING_INDEX_ACT, PWB_OPENING_INDEX_SUBJECTS,
     f"{PWB_OPENING_INDEX_DIR}/OWNER-DECISION-PACKET.md"),
)
#: Successor chain over the PWB behavioral package, in performance order.
#: The latest validly performed link binds current bytes; every earlier
#: link's rows are immutable act-time history.
PWB_SUCCESSOR_CHAIN = (
    (PWB_STATE1_LABEL, PWB_STATE1_SUBJECT, PWB_STATE1_ACT,
     PWB_STATE1_SUBJECTS),
    (PWB_TRUTH_AMENDMENT_LABEL, PWB_TRUTH_AMENDMENT_SUBJECT,
     PWB_TRUTH_AMENDMENT_ACT, PWB_TRUTH_AMENDMENT_SUBJECTS),
    # Performed 2026-10-01. The owner's readiness order (2026-09-23,
    # POLARIS-GATE-PACKAGE-OWNER-VALUES-2026-09-23-DECISION.md §6) is the
    # opening band, then the render mode and the machine view, then lane B
    # last, so lane B follows this link.
    (PWB_OPENING_BAND_LABEL, PWB_OPENING_BAND_SUBJECT,
     PWB_OPENING_BAND_ACT, PWB_OPENING_BAND_SUBJECTS),
    # Performed 2026-10-02, after the opening band and before lane B.
    (PWB_RENDER_MODE_LABEL, PWB_RENDER_MODE_SUBJECT,
     PWB_RENDER_MODE_ACT, PWB_RENDER_MODE_SUBJECTS),
    # Performed 2026-10-02, after the render mode and before lane B.
    (PWB_MACHINE_VIEW_LABEL, PWB_MACHINE_VIEW_SUBJECT,
     PWB_MACHINE_VIEW_ACT, PWB_MACHINE_VIEW_SUBJECTS),
    # Lane B was declined 2026-10-02 and never performed, so its link left the
    # chain. The version-tagged packages follow in their table order.
) + tuple((label, subject, act, subjects)
          for _key, _stem, label, subject, act, subjects, _packet
          in VERSIONED_PWB_PACKAGES)
GENERAL_BOOTSTRAP_PWB_PATHS = tuple(sorted((
    "openspec/changes/polaris-project-wide-butlers-model/"
    "CONTRACT-COVERAGE-REPAIR-DELTA.md",
    "openspec/changes/polaris-project-wide-butlers-model/CONTRACT-COVERAGE.md",
    "openspec/changes/polaris-project-wide-butlers-model/"
    "contract-coverage-matrix/RFC-0001-0003.md",
    "openspec/changes/polaris-project-wide-butlers-model/"
    "contract-coverage-matrix/RFC-0004-0006.md",
    "openspec/changes/polaris-project-wide-butlers-model/"
    "contract-coverage-matrix/RFC-0007-0009.md",
)))
CONTRACT_ROOT = ".syzygy/governance/contracts"
CC_SPEC_LABEL = "CONFIRM CRAFT AMENDMENT: CC-SPEC"
CC_SPEC_SUBJECT = (
    f"{CANDIDATES}/policy-candidates/"
    "SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md")
CC_IMPACT_LABEL = "CONFIRM CRAFT AMENDMENT: CC-IMPACT"
CC_IMPACT_SUBJECT = (
    f"{CANDIDATES}/policy-candidates/"
    "SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md")
#: The specification-policy readability restyle: one owner phrase over a
#: two-row manifest. Its recorder
#: (`scripts/record_spec_policy_readability_restyle.py`) writes one
#: recorder-generated `CONFIRM CRAFT AMENDMENT: CC-…@<row>` line per row, so
#: every check that reads the craft acts' latest digests reads the successor.
SPEC_POLICY_RESTYLE_LABEL = "CONFIRM SPECIFICATION POLICY READABILITY RESTYLE"
SPEC_POLICY_RESTYLE_DIR = f"{CANDIDATES}/spec-policy-readability-restyle"
SPEC_POLICY_RESTYLE_SUBJECT = (
    f"{SPEC_POLICY_RESTYLE_DIR}/SPEC-POLICY-AMENDMENT-MANIFEST.txt")
SPEC_POLICY_RESTYLE_ACT = (
    f"{DECISIONS}/SPEC-POLICY-READABILITY-RESTYLE-ADOPTION-ACT.md")
SPEC_POLICY_RESTYLE_ROWS = ((CC_IMPACT_LABEL, CC_IMPACT_SUBJECT),
                            (CC_SPEC_LABEL, CC_SPEC_SUBJECT))
#: The Three-Surface POC readability successor: one sign-off over the
#: package manifest; its recorder
#: (`scripts/record_three_surface_poc_readability_successor.py`) checks the
#: six signed subjects against predecessor or successor rows.
#: Version-tagged Three-Surface POC sign-offs, in act order:
#: `(package, version, record, manifest)`. A manifest-less package's record
#: carries its applied rows and is its manifest. CG-7h reads a general
#: bootstrap transaction row for a POC path as act-time history only when the
#: latest of these whose record and single aggregate block exist re-patched
#: that path to exactly today's bytes (the POC analogue of the PWB chain).
POC_VERSIONED_SUCCESSORS = (
    ("three-surface-poc-block-provenance-amendment", "1.0",
     f"{DECISIONS}/THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md",
     f"{CANDIDATES}/three-surface-poc-block-provenance-amendment/"
     "THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-MANIFEST.txt"),
    ("three-surface-poc-governing-intent-amendment", "1.0",
     f"{DECISIONS}/THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md",
     f"{DECISIONS}/THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md"),
    ("three-surface-poc-vocabulary-epistemic-amendment", "1.0",
     f"{DECISIONS}/THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md",
     f"{CANDIDATES}/three-surface-poc-vocabulary-epistemic-amendment/"
     "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-MANIFEST.txt"),
    ("three-surface-poc-governedby-reference-amendment", "1.0",
     f"{DECISIONS}/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md",
     f"{CANDIDATES}/three-surface-poc-governedby-reference-amendment/"
     "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt"),
)
POC_READABILITY_LABEL = "SIGN OFF THREE-SURFACE POC READABILITY SUCCESSOR"
POC_READABILITY_DIR = f"{CANDIDATES}/three-surface-poc-readability-successor"
POC_READABILITY_SUBJECT = (
    f"{POC_READABILITY_DIR}/THREE-SURFACE-POC-READABILITY-SUCCESSOR-MANIFEST.txt")
POC_READABILITY_ACT = (
    f"{DECISIONS}/THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md")


def _readability_successors(root=None):
    """(package dir, label, act) for every generic readability successor.

    Each package under the candidates tree that carries `SUCCESSOR.json` is
    one offer, built and recorded by `scripts/readability_successor.py`.
    """
    base = ROOT if root is None else root
    out = []
    for path in sorted(glob.glob(os.path.join(base, CANDIDATES, "*", "SUCCESSOR.json"))):
        with open(path, encoding="utf-8") as stream:
            config = json.load(stream)
        rel = os.path.relpath(os.path.dirname(path), base).replace(os.sep, "/")
        out.append((rel, config["label"], config["act"]))
    return out


GENERAL_BOOTSTRAP_POPULATIONS = (7, 30, 5)
#: Round-2026-08d wave structure: the all-in-one act-1 phrase is retired;
#: six wave manifests partition the active set and each one's own sha256 is
#: that wave act's argument (ACCEPTANCE-WAVE-DESIGN.md). The active manifest
#: remains the package identity and is no act's argument.
WAVE_IDS = ("A", "B", "C1", "C2", "D1", "D2")
PERFORMED_WAVE_IDS_REQUIRED = ("A", "B")
WAVE_MANIFESTS = {w: f"{CANDIDATES}/wave-manifests/WAVE-{w}-MANIFEST.txt"
                  for w in WAVE_IDS}


def wave_arg_pat(w):
    return re.compile(rf"ACCEPT FOUNDATIONAL WAVE {w}:\s*`?([0-9a-f]{{64}})")


#: `The 19 modules of RFC 0001–0006` — a count **before** the noun. Ordinals
#: are the other way round (`RFC-0010 modules 1, 2, 3, 5`) and must not be
#: read as counts; requiring the digits to precede the noun is what separates
#: them, and the D1 row is the live case that proves it matters.
STATED_MODULE_COUNT = re.compile(r"\b(\d{1,3})\s+modules?\b", re.I)


def cg7f_wave_counts(res, record=None, wave_rows=None):
    """A wave act's *description* is checked against its subject, not only its
    digest.

    CG-7b compares the record's stated sha256 to the wave manifest's sha256.
    Nothing compared the record's stated **count**. Review RD-17 finding 1
    mutation-proved the consequence in a copy: a twentieth module added to
    Wave A, every manifest and index regenerated, the record's digest updated
    the way a maintainer would — six scripts, zero findings, against an
    offering whose own words undercount its subject by one. The owner would
    have bound 20 modules under the words *"the 19 modules"* with the whole
    battery green, which is RD-8's class verbatim and live for all six waves
    at once.

    The counts come from the wave manifests' rows, never from their header
    lines: a header states a count, and a count quoted outside the thing that
    measures it is the defect under repair (verification rule 3).

    A row that states no count is **disclosed, not passed over**: the note
    prints how many of the six rows carry a comparable figure, so a row
    quietly losing its count cannot look like agreement.
    """
    body = record if record is not None else read(ACCEPTANCE_RECORD)
    if not body:
        res.add("WARN", "CG-7f  wave-act module counts match the manifests",
                0, 0, "row", note=f"{ACCEPTANCE_RECORD} unreadable")
        return
    if wave_rows is None:
        wave_rows = {}
        for w in WAVE_IDS:
            full = os.path.join(ROOT, WAVE_MANIFESTS[w])
            if not os.path.exists(full):
                continue
            wave_rows[w] = sum(
                1 for ln in read(WAVE_MANIFESTS[w]).splitlines()
                if DIGEST_ROW.match(ln.strip()))
    findings, details, examined, stated = [], [], 0, 0
    for w in WAVE_IDS:
        row = next((ln for ln in body.splitlines()
                    if ln.lstrip().startswith("|")
                    and f"ACCEPT FOUNDATIONAL WAVE {w}:" in ln), None)
        examined += 1
        if row is None:
            findings.append(f"wave {w} — no §1 table row offering the act; "
                            f"its subject is described nowhere")
            continue
        actual = wave_rows.get(w)
        if actual is None:
            findings.append(f"wave {w} — the record describes the act but "
                            f"`{WAVE_MANIFESTS[w]}` is absent; the count "
                            f"cannot be checked")
            continue
        m = STATED_MODULE_COUNT.search(row)
        if not m:
            details.append(f"wave {w} — the row states no module count; "
                           f"{actual} row(s) in the manifest, nothing to "
                           f"compare")
            continue
        stated += 1
        if int(m.group(1)) != actual:
            findings.append(
                f"wave {w} — the record describes `{m.group(0)}` but "
                f"{WAVE_MANIFESTS[w]} has {actual} row(s). The act's digest "
                f"can be correct while its words are not, and the words are "
                f"what the owner reads")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-7f  wave-act module counts match the manifests", examined,
            len(findings), "row",
            note=(f"{stated} of {examined} row(s) state a comparable count"
                  if examined else "no wave rows found"),
            details=findings + details)


def cg7g_wave_manifest_population(paths, res, listing=None):
    """`wave-manifests/` holds exactly the six maintained manifests.

    The generator diffs current manifests and validates performed ones while
    CG-7a reads only the six paths it names, so neither operation alone treats
    the directory as a population.
    Review RD-17 finding 5 dropped a seventh, internally false
    `WAVE-C-MANIFEST.txt` into it: the generator reported *all 7 manifests
    match regeneration* and the battery reported zero findings. The directory
    is where the acceptance record sends an owner for each wave act's
    argument, and a leftover from an earlier wave design would sit there
    looking exactly like one of the six.
    """
    home = f"{CANDIDATES}/wave-manifests"
    expected = {WAVE_MANIFESTS[w] for w in WAVE_IDS}
    if listing is not None:
        actual = set(listing)
    else:
        base = os.path.join(ROOT, home)
        if not os.path.isdir(base):
            actual = {p for p in paths if p.startswith(home + "/")}
        else:
            actual = {f"{home}/{n}" for n in sorted(os.listdir(base))
                      if os.path.isfile(os.path.join(base, n))}
    findings = [f"{p} — sits in `{home}/` and is not one of the six generated "
                f"or preserved wave manifests; a file here reads as a wave "
                f"act's argument"
                for p in sorted(actual - expected)]
    findings += [f"{p} — declared wave manifest is missing from `{home}/`"
                 for p in sorted(expected - actual)]
    res.add("FAIL" if findings else ("OK" if actual else "WARN"),
            "CG-7g  wave-manifests/ population closed", len(actual),
            len(findings), "file",
            note=(f"{len(expected)} maintained manifests expected"
                  if actual else f"`{home}/` is empty or absent — "
                                 f"nothing examined"),
            details=findings)


def sha256_file(abspath):
    h = hashlib.sha256()
    with open(abspath, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def cg7_manifest(paths, res):
    if MANIFEST not in set(paths):
        res.add("WARN", "CG-7a  current digests and wave paths valid",
                0, 0, "entry",
                note=f"{MANIFEST} not present — nothing examined")
        res.add("WARN", "CG-7b  wave arguments match immutable/current "
                "manifests", 0, 0, "record",
                note="no manifest to compare against — nothing examined")
        return
    performed_text = (read(PERFORMED_ACT_RECORD)
                      if PERFORMED_ACT_RECORD in set(paths) else "")
    detected_performed = {
        wave for wave in WAVE_IDS
        if wave_arg_pat(wave).findall(performed_text)}
    performed_wave_ids = tuple(
        wave for wave in WAVE_IDS
        if wave in PERFORMED_WAVE_IDS_REQUIRED
        or wave in detected_performed)
    unperformed_wave_ids = tuple(
        wave for wave in WAVE_IDS if wave not in performed_wave_ids)
    findings, n = [], 0
    active_paths = set()
    for i, ln in enumerate(read(MANIFEST).splitlines(), 1):
        m = DIGEST_ROW.match(ln.strip())
        if not m:
            continue
        n += 1
        active_paths.add(m.group("path").strip())
        target = os.path.join(ROOT, CANDIDATES, m.group("path").strip())
        if not os.path.exists(target):
            findings.append(f"{MANIFEST}:{i} — {m.group('path')} does not exist")
            continue
        actual = sha256_file(target)
        if actual != m.group("sha"):
            findings.append(f"{MANIFEST}:{i} — {m.group('path')} digest "
                            f"{actual[:12]}… != manifest {m.group('sha')[:12]}…")
    # The six wave manifests partition the active set **by path** — no
    # overlap, nothing uncovered, nothing extra. Unperformed-wave row digests
    # still describe current candidate bytes. Performed A/B row digests are
    # the bytes accepted at the act and are deliberately not compared to
    # amended current files; CG-7b validates each historical manifest's own
    # digest against the performed-act record instead.
    wave_of = {}
    for w in WAVE_IDS:
        rel = WAVE_MANIFESTS[w]
        if rel not in set(paths):
            findings.append(f"{rel} — wave manifest missing")
            continue
        for i, ln in enumerate(read(rel).splitlines(), 1):
            m = DIGEST_ROW.match(ln.strip())
            if not m:
                continue
            n += 1
            p = m.group("path").strip()
            wave_of.setdefault(p, []).append(w)
            target = os.path.join(ROOT, CANDIDATES, p)
            if not os.path.exists(target):
                findings.append(f"{rel}:{i} — {p} does not exist")
            elif (w in unperformed_wave_ids
                  and sha256_file(target) != m.group("sha")):
                findings.append(f"{rel}:{i} — {p} current digest != "
                                f"unperformed manifest "
                                f"{m.group('sha')[:12]}…")
    for p, ws in sorted(wave_of.items()):
        if len(ws) > 1:
            findings.append(f"{p} — appears in waves {'/'.join(ws)}; the "
                            f"partition overlaps")
    for p in sorted(active_paths - set(wave_of)):
        findings.append(f"{p} — in the active manifest but in no wave "
                        f"manifest; the partition is incomplete")
    for p in sorted(set(wave_of) - active_paths):
        findings.append(f"{p} — in a wave manifest but not the active "
                        f"manifest")
    manifest_sha = sha256_file(os.path.join(ROOT, MANIFEST))
    status = "FAIL" if findings else ("OK" if n else "WARN")
    res.add(status,
            "CG-7a  current digests valid; wave paths partition the set",
            n, len(findings), "entry",
            note=(f"active manifest sha256 {manifest_sha} (package identity, "
                  f"no act's argument); {len(performed_wave_ids)} performed "
                  "wave(s) checked by path only, "
                  f"{len(unperformed_wave_ids)} by current row digest"
                  if n else "no digest rows parsed — nothing examined"),
            details=findings)

    cg7g_wave_manifest_population(paths, res)

    if ACCEPTANCE_RECORD not in set(paths):
        res.add("WARN", "CG-7b  wave arguments match immutable/current "
                "manifests",
                0, 0, "record",
                note=f"{ACCEPTANCE_RECORD} not present — nothing examined")
        return
    record_text = read(ACCEPTANCE_RECORD)
    cg7f_wave_counts(res, record=record_text)
    bfind, bexam = [], 0
    for w in WAVE_IDS:
        is_performed = w in performed_wave_ids
        source = performed_text if is_performed else record_text
        source_name = (PERFORMED_ACT_RECORD if is_performed
                       else ACCEPTANCE_RECORD)
        stated = set(wave_arg_pat(w).findall(source))
        full = os.path.join(ROOT, WAVE_MANIFESTS[w])
        actual = sha256_file(full) if os.path.exists(full) else None
        if not stated:
            bexam += 1
            bfind.append(f"wave {w} — no `ACCEPT FOUNDATIONAL WAVE {w}: "
                         f"<sha>` found in {source_name}; "
                         + ("the performed act argument is missing"
                            if is_performed else
                            "the act cannot be performed as written"))
            continue
        for s in sorted(stated):
            bexam += 1
            if s != actual:
                action = ("performed record binds" if is_performed
                          else "offering record offers")
                bfind.append(f"wave {w} — {action} {s[:12]}… but the wave "
                             f"manifest hashes to "
                             f"{(actual or 'absent')[:12]}… — "
                             + ("immutable act history was tampered"
                                if is_performed else
                                "the offered package no longer exists"))
    res.add("FAIL" if bfind else "OK",
            "CG-7b  wave arguments match immutable/current manifests",
            bexam, len(bfind), "argument",
            note=(f"{len(performed_wave_ids)} performed argument(s) from "
                  f"{PERFORMED_ACT_RECORD}; {len(unperformed_wave_ids)} "
                  f"unperformed offer(s) from {ACCEPTANCE_RECORD}"),
            details=bfind)

    # CG-7c — the other three digest-bound acts. Act 1 alone was checked until
    # 2026-08-05, so a truthful "1 examined" covered a population of 4 and
    # three stale act arguments passed unseen (round review RB-3 F1).
    record = read(ACCEPTANCE_RECORD)
    others = [
        ("act 2 (craft CC-TEST-2)",
         os.path.join(ROOT, CRAFT, "testing-and-verification.md"),
         re.compile(r"CC-TEST-2@([0-9a-f]{64})")),
        ("act 3 (topology bundle)",
         os.path.join(ROOT, TOPOLOGY_CANDIDATES, "BUNDLE-MANIFEST.md"),
         re.compile(r"ACCEPT TOPOLOGY:\s*`?([0-9a-f]{64})")),
        ("act 4 (project overview)",
         os.path.join(ROOT, ".syzygy/intent/OVERVIEW.md"),
         re.compile(r"ADOPT PROJECT OVERVIEW:\s*`?([0-9a-f]{64})")),
    ]
    findings, examined = [], 0
    for label, subject, pat in others:
        args = set(pat.findall(record))
        if not args:
            findings.append(f"{label} — no digest argument found in "
                            f"{ACCEPTANCE_RECORD}; the act cannot be performed "
                            f"as written")
            examined += 1
            continue
        if not os.path.exists(subject):
            findings.append(f"{label} — subject {subject} does not exist")
            examined += len(args)
            continue
        actual = sha256_file(subject)
        for a in sorted(args):
            examined += 1
            if a != actual:
                findings.append(f"{label} — record offers {a[:12]}… but the "
                                f"subject hashes to {actual[:12]}… — the act "
                                f"would bind an artifact state that no longer "
                                f"exists")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-7c  acts 2/3/4 arguments match their subjects",
            examined, len(findings), "argument",
            note=None if examined else "no act arguments found — nothing examined",
            details=findings)

    cg7d_quoted_elsewhere(paths, res)
    cg7e_act_digest_copies(paths, res)


#: Every act phrase, with the artifact whose sha256 is its only valid
#: argument. CG-7d applies these to *every* file in the corpus, because the
#: round's headline defect was a digest that was correct in the manifest and
#: stale in the document that offered it (six independent reviewers, RB-1 F1
#: … RB-8 F1). A digest quoted anywhere is a promise about an artifact; the
#: artifact is the only thing that can keep it.
#: **Derived from `ACCEPTANCE-PHRASE-REGISTRY.yaml`, never listed here.**
#: This tuple used to be a hand-kept copy of the phrase set, which is the
#: transcription class the battery exists to catch, applied to itself: the
#: registry, CG-2a's retired list and this list are one population read three
#: ways, and only a single source can keep them agreeing. A phrase whose
#: `argument` is `reason` (REWORK/REJECT) carries no digest and is not an act
#: subject, so it is absent by construction rather than by omission.
#:
#: Act 5 needs no phrase — VIS-4 adoption is the owner's own words. The round
#: charter offers a phrase form anyway, so the registry declares it and it is
#: checked; an optional act with an unchecked digest would be the same defect
#: as the four this check exists for.
# Prospective tooling vocabulary: candidate bytes never perform this act.
POLARIS_NO_SIGNAL_LABEL = "SIGN OFF POLARIS NO-SIGNAL CONTRACT AMENDMENT"
POLARIS_NO_SIGNAL_SUBJECT = (
    ".syzygy/governance/contracts/candidates/polaris-no-signal-amendment/"
    "CONTRACT-AMENDMENT-MANIFEST.txt")
POLARIS_NO_SIGNAL_ACT = (
    ".syzygy/governance/decisions/POLARIS-NO-SIGNAL-AMENDMENT-ACT.md")
#: The closed, exact population of the no-signal contract successor link
#: (`CONTRACT_SUCCESSOR_CHAIN`): its manifest binds these two modules, in this
#: order, and nothing else.
POLARIS_NO_SIGNAL_PATHS = (
    "rfcs/RFC-0008/state-vocabulary-and-cost.md",
    "rfcs/RFC-0009/interaction-parity-and-release.md",
)
#: The 30 accepted RFC 0001-0009 modules the general trusted-bootstrap
#: contract manifest binds, codepoint-sorted. A literal, not a parse, so a
#: successor link's population stays closed even if a manifest is rewritten;
#: CG-7h separately requires every link row to name a bootstrap row.
GENERAL_BOOTSTRAP_CONTRACT_PATHS = (
    "rfcs/RFC-0001-project-graph-identity-state-planes.md",
    "rfcs/RFC-0002/README.md",
    "rfcs/RFC-0002/challenge-lifecycle.md",
    "rfcs/RFC-0002/reconciliation-chain.md",
    "rfcs/RFC-0002/rendering-vocabularies.md",
    "rfcs/RFC-0002/snapshot-and-evaluation-core.md",
    "rfcs/RFC-0003/README.md",
    "rfcs/RFC-0003/governance-homes-and-owner-acts.md",
    "rfcs/RFC-0003/manifests-and-namespace.md",
    "rfcs/RFC-0004/README.md",
    "rfcs/RFC-0004/execution-record.md",
    "rfcs/RFC-0004/fidelity-joins-and-mappings.md",
    "rfcs/RFC-0004/general-contract.md",
    "rfcs/RFC-0004/named-adapters.md",
    "rfcs/RFC-0005/README.md",
    "rfcs/RFC-0005/admission-and-boundary.md",
    "rfcs/RFC-0005/consent-egress-secrets.md",
    "rfcs/RFC-0005/execution-profiles.md",
    "rfcs/RFC-0006-cross-surface-selection-query-drawer.md",
    "rfcs/RFC-0007/README.md",
    "rfcs/RFC-0007/narrative-contract.md",
    "rfcs/RFC-0007/rendering-and-surface.md",
    "rfcs/RFC-0008/README.md",
    "rfcs/RFC-0008/accounting-reconciliation-and-release.md",
    "rfcs/RFC-0008/identity-authority-materialization.md",
    "rfcs/RFC-0008/state-vocabulary-and-cost.md",
    "rfcs/RFC-0009/README.md",
    "rfcs/RFC-0009/interaction-parity-and-release.md",
    "rfcs/RFC-0009/semantic-geography.md",
    "rfcs/RFC-0009/visual-grammar-and-lenses.md",
)
#: The one bootstrap module the readability restyle never touches.
CONTRACT_RESTYLE_EXCLUDED = "rfcs/RFC-0007/rendering-and-surface.md"
#: The restyle link's closed, exact population: the 29 other bootstrap
#: modules. The package is built and adopted as one unit, so its manifest
#: must bind all 29 (exact equality), never a subset.
CONTRACT_RESTYLE_PATHS = tuple(
    path for path in GENERAL_BOOTSTRAP_CONTRACT_PATHS
    if path != CONTRACT_RESTYLE_EXCLUDED)
# Prospective tooling vocabulary: candidate bytes never perform this act.
CONTRACT_RESTYLE_LABEL = "ADOPT CONTRACT READABILITY RESTYLE"
CONTRACT_RESTYLE_SUBJECT = (
    f"{CANDIDATES}/contract-readability-restyle/CONTRACT-AMENDMENT-MANIFEST.txt")
CONTRACT_RESTYLE_ACT = (
    f"{DECISIONS}/CONTRACT-READABILITY-RESTYLE-ADOPTION-ACT.md")
#: The RFC-0007 scoped-values contract successor, step 1 of lane B's two-act
#: path. Registered at drafting time for its phrase and packet copy; it is
#: deliberately NOT a `CONTRACT_SUCCESSOR_CHAIN` link yet, because a chain link
#: asserts adoption order and only the performing act decides that.
SCOPED_VALUES_LABEL = "SIGN OFF RFC-0007 SCOPED-VALUES AMENDMENT"
SCOPED_VALUES_DIR = f"{CANDIDATES}/rfc7-scoped-values-successor"
SCOPED_VALUES_SUBJECT = f"{SCOPED_VALUES_DIR}/CONTRACT-AMENDMENT-MANIFEST.txt"
SCOPED_VALUES_ACT = f"{DECISIONS}/RFC7-SCOPED-VALUES-AMENDMENT-ACT.md"
SCOPED_VALUES_PACKET = f"{SCOPED_VALUES_DIR}/OWNER-DECISION-PACKET.md"


POLARIS_GENERATOR_APPROVAL_LABEL = (
    "ADOPT POLARIS GENERATOR SPECIFICATION, SCOPED APPLICABILITY AND IMPLEMENTATION"
)
POLARIS_GENERATOR_APPROVAL_SUBJECT = (
    "docs/evidence/polaris-generator-approval-offer-2026-09-12.json"
)
POLARIS_GENERATOR_APPROVAL_ACTS = tuple(
    f"{DECISIONS}/POLARIS-GENERATOR-{kind}-ACT.md" for kind in (
        "SPECIFICATION-ADOPTION", "APPLICABILITY", "IMPLEMENTATION-AUTHORIZATION")
)


POLARIS_UNDERSTANDING_LABEL = "ADOPT POLARIS UNDERSTANDING AMENDMENT"
POLARIS_UNDERSTANDING_SUBJECT = "docs/evidence/polaris-understanding-adoption-manifest-2026-09-13.json"
POLARIS_UNDERSTANDING_ACT = f"{DECISIONS}/POLARIS-UNDERSTANDING-SPECIFICATION-ADOPTION-ACT.md"
#: The P-73 (M6 slice 4) edit/repair deletion-account scenario, drafted
#: 2026-09-23 per bead syzygy-dov.23 and registered before its own act
#: exists, so CG-7d can see the argument go stale rather than never seeing
#: it. Its manifest hashes proposed bytes (its two proposed/*.patch files
#: applied to a scratch tree), never the real openspec/PROJECT-STATUS.md
#: bytes, which this candidate package never edits in place. Deliberately
#: not a PWB_SUCCESSOR_CHAIN entry: it amends the Polaris generation
#: specification, not the PWB behavior population, and asserts no adoption
#: order beyond its own single act.
POLARIS_EDIT_REPAIR_LABEL = "SIGN OFF POLARIS EDIT/REPAIR DELETION-ACCOUNT SCENARIO"
POLARIS_EDIT_REPAIR_DIR = f"{CANDIDATES}/polaris-edit-repair-deletion-scenario"
POLARIS_EDIT_REPAIR_SUBJECT = (
    f"{POLARIS_EDIT_REPAIR_DIR}/POLARIS-EDIT-REPAIR-DELETION-SCENARIO-MANIFEST.txt")
POLARIS_EDIT_REPAIR_ACT = (
    f"{DECISIONS}/POLARIS-EDIT-REPAIR-DELETION-SCENARIO-ACT.md")


def _polaris_edit_repair_candidate_exists(root=None):
    """The unperformed package registers only after its own manifest exists."""
    return os.path.isfile(os.path.join(
        ROOT if root is None else root, POLARIS_EDIT_REPAIR_SUBJECT))


def _act_subjects():
    out = []
    for e in registry_current():
        if e.get("argument") != "sha256" or not e.get("subject"):
            continue
        label = e["label"]
        sep = re.escape(e.get("argument_separator") or ":")
        out.append((label, e["subject"], re.compile(
            re.escape(label) + r"\s*" + sep + r"\s*`?([0-9a-f]{64})")))
    if not any(label == GENERAL_BOOTSTRAP_LABEL for label, _rel, _pat in out):
        out.append((
            GENERAL_BOOTSTRAP_LABEL,
            GENERAL_BOOTSTRAP_SUBJECT,
            re.compile(re.escape(GENERAL_BOOTSTRAP_LABEL)
                       + r"\s*:\s*`?([0-9a-f]{64})"),
        ))
    if not any(label == PWB_STATE1_LABEL for label, _rel, _pat in out):
        out.append((
            PWB_STATE1_LABEL,
            PWB_STATE1_SUBJECT,
            re.compile(re.escape(PWB_STATE1_LABEL)
                       + r"\s*:\s*`?([0-9a-f]{64})"),
        ))
    if not any(label == PWB_TRUTH_AMENDMENT_LABEL for label, _rel, _pat in out):
        out.append((
            PWB_TRUTH_AMENDMENT_LABEL,
            PWB_TRUTH_AMENDMENT_SUBJECT,
            re.compile(re.escape(PWB_TRUTH_AMENDMENT_LABEL)
                       + r"\s*:\s*`?([0-9a-f]{64})"),
        ))
    if not any(label == PWB_SCOPED_AMENDMENT_LABEL for label, _rel, _pat in out):
        out.append((
            PWB_SCOPED_AMENDMENT_LABEL,
            PWB_SCOPED_AMENDMENT_SUBJECT,
            re.compile(re.escape(PWB_SCOPED_AMENDMENT_LABEL)
                       + r"\s*:\s*`?([0-9a-f]{64})"),
        ))
    if not any(label == PWB_RENDER_MODE_LABEL for label, _rel, _pat in out):
        out.append((
            PWB_RENDER_MODE_LABEL,
            PWB_RENDER_MODE_SUBJECT,
            re.compile(re.escape(PWB_RENDER_MODE_LABEL)
                       + r"\s*:\s*`?([0-9a-f]{64})"),
        ))
    for label, subject in ((SCOPED_VALUES_LABEL, SCOPED_VALUES_SUBJECT),
                           (PWB_MACHINE_VIEW_LABEL, PWB_MACHINE_VIEW_SUBJECT),
                           (PWB_OPENING_BAND_LABEL, PWB_OPENING_BAND_SUBJECT),
                           (PWB_MISSING_CURRENCY_LABEL,
                            PWB_MISSING_CURRENCY_SUBJECT),
                           (PWB_DISMISSAL_EXPIRY_LABEL,
                            PWB_DISMISSAL_EXPIRY_SUBJECT),
                           (PWB_CONTAINER_SHAPE_LABEL,
                            PWB_CONTAINER_SHAPE_SUBJECT),
                           (PWB_ITEM_DEPTH_LABEL, PWB_ITEM_DEPTH_SUBJECT)):
        if not any(existing == label for existing, _rel, _pat in out):
            out.append((
                label,
                subject,
                re.compile(re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})"),
            ))
    if (_polaris_edit_repair_candidate_exists()
            and not any(existing == POLARIS_EDIT_REPAIR_LABEL
                        for existing, _rel, _pat in out)):
        out.append((
            POLARIS_EDIT_REPAIR_LABEL,
            POLARIS_EDIT_REPAIR_SUBJECT,
            re.compile(re.escape(POLARIS_EDIT_REPAIR_LABEL)
                       + r"\s*:\s*`?([0-9a-f]{64})"),
        ))
    for label, subject, _act, _activate, _paths in CONTRACT_SUCCESSOR_CHAIN:
        out.append((label, ROW_ARGUMENT_SUBJECTS.get(label, subject),
                    re.compile(re.escape(label)
                               + r"\s*:\s*`?([0-9a-f]{64})")))
    out.append((POLARIS_GENERATOR_APPROVAL_LABEL,
                POLARIS_GENERATOR_APPROVAL_SUBJECT,
                re.compile(re.escape(POLARIS_GENERATOR_APPROVAL_LABEL)
                           + r"\s*:\s*`?([0-9a-f]{64})")))
    out.append((POLARIS_UNDERSTANDING_LABEL, POLARIS_UNDERSTANDING_SUBJECT,
                re.compile(re.escape(POLARIS_UNDERSTANDING_LABEL)
                           + r"\s*:\s*`?([0-9a-f]{64})")))
    out.append((SPEC_POLICY_RESTYLE_LABEL, SPEC_POLICY_RESTYLE_SUBJECT,
                re.compile(re.escape(SPEC_POLICY_RESTYLE_LABEL)
                           + r"\s*:\s*`?([0-9a-f]{64})")))
    out.append((POC_READABILITY_LABEL, POC_READABILITY_SUBJECT,
                re.compile(re.escape(POC_READABILITY_LABEL)
                           + r"\s*:\s*`?([0-9a-f]{64})")))
    for package, label, _act in _readability_successors():
        out.append((label, f"{package}/SUCCESSOR-MANIFEST.txt",
                    re.compile(re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    for label, subject, _act in PWB_EFFECT_ACTS:
        if not any(l == label for l, _rel, _pat in out):
            out.append((label, subject, re.compile(
                re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    if os.path.isfile(os.path.join(ROOT, PUBLIC_ADMISSION_MANIFEST)):
        for label, subject in PUBLIC_ADMISSION_ACTS:
            if not any(l == label for l, _rel, _pat in out):
                out.append((label, subject, re.compile(
                    re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    if os.path.isfile(os.path.join(ROOT, PUBLIC_REGISTRY_MANIFEST)):
        for label, subject in PUBLIC_REGISTRY_ACTS:
            if not any(l == label for l, _rel, _pat in out):
                out.append((label, subject, re.compile(
                    re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    if os.path.isfile(os.path.join(ROOT, MESSAGES_API_MANIFEST)):
        for label, subject in MESSAGES_API_ACTS:
            if not any(l == label for l, _rel, _pat in out):
                out.append((label, subject, re.compile(
                    re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    if os.path.isfile(os.path.join(ROOT, PUBLIC_EGRESS_V2_MANIFEST)):
        for label, subject in PUBLIC_EGRESS_V2_ACTS:
            if not any(l == label for l, _rel, _pat in out):
                out.append((label, subject, re.compile(
                    re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    if os.path.isfile(os.path.join(ROOT, DOSSIER_LOCAL_AGENT_MANIFEST)):
        for label, subject in DOSSIER_LOCAL_AGENT_ACTS:
            if not any(l == label for l, _rel, _pat in out):
                out.append((label, subject, re.compile(
                    re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    if os.path.isfile(os.path.join(ROOT, DOSSIER_PROVIDER_V2_MANIFEST)):
        for label, subject in DOSSIER_PROVIDER_V2_ACTS:
            if not any(l == label for l, _rel, _pat in out):
                out.append((label, subject, re.compile(
                    re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")))
    return tuple(out)


class _ActSubjects:
    """Lazy, cached view of the registry's digest-bearing phrases.

    Module-level constants are built at import time, and the registry is read
    from disk — so this stays a descriptor-free lazy tuple rather than a
    literal, and the selftest can still substitute a synthetic registry.
    """

    _cache = {}

    def _get(self):
        if ROOT not in _ActSubjects._cache:
            _ActSubjects._cache[ROOT] = _act_subjects()
        return _ActSubjects._cache[ROOT]

    def __iter__(self):
        return iter(self._get())

    def __len__(self):
        return len(self._get())


ACT_SUBJECTS = _ActSubjects()

#: Nested transaction acts have no independent ceremony phrase, so each
#: recognized record line is registered with its full stable grammar. Never
#: infer performance from a basename plus a digest: a reviewer mutation proved
#: that an arbitrary Wave-A table row could otherwise forge history.
NESTED_PERFORMED_ARGUMENT_PATTERNS = {
    CC_SPEC_LABEL: re.compile(
        r"^\| 5 \| `confirm-craft-amendment` \| in-force policy "
        r"`SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE\.md` "
        r"\(CC-SPEC-1\.\.11\) \| `([0-9a-f]{64})` \| "
        r"[^|]+ \| [^|]+ \|$"
    ),
}


def _performed_act_digests(act_subjects=None, record=None):
    """Return every performed digest, in record order, for each act label.

    The owner-act record is append-only. An amended subject can therefore
    have more than one lawful historical digest, and dropping the earlier one
    would turn correct act-time evidence into a false stale-copy finding.

    Two record shapes are intentional and both are explicitly registered.
    Older acts repeat their exact ceremony phrase on a line of its own. An
    indivisible transaction records nested acts using the exact line grammars
    in `NESTED_PERFORMED_ARGUMENT_PATTERNS`. Only the owner-act record is
    parsed; an offering, review, or arbitrary table row can never populate
    this set.
    """
    specs = tuple(ACT_SUBJECTS if act_subjects is None else act_subjects)
    if record is None:
        full = os.path.join(ROOT, PERFORMED_ACT_RECORD)
        record = read(PERFORMED_ACT_RECORD) if os.path.exists(full) else ""
    found = {label: [] for label, _rel, _pat in specs}
    if not record:
        return {label: tuple(values) for label, values in found.items()}

    lines = record.splitlines()
    for label, _subject, phrase_arg in specs:
        values = found[label]
        # Both shapes are read in one pass, so the tuple is in record order:
        # its last value is the latest performance whichever shape carried it.
        patterns = [phrase_arg]
        nested = NESTED_PERFORMED_ARGUMENT_PATTERNS.get(label)
        if nested:
            patterns.append(nested)
        for line in lines:
            for pattern in patterns:
                m = pattern.fullmatch(line.strip())
                if m and m.group(1) not in values:
                    values.append(m.group(1))
                    break
    return {label: tuple(values) for label, values in found.items()}

#: Files that quote a stale act argument *as* a retired value, on purpose —
#: the revision table in the acceptance record and the round's own records.
#: They are read as history, so a mismatch there is the point, not a defect.
#: Raw reviewer output is never edited, so it is exempt by construction.
ACT_QUOTE_EXEMPT = (
    f"{CANDIDATES}/round-2026-08/reviews/",
    f"{CANDIDATES}/round-2026-08b/reviews/",
    f"{CANDIDATES}/round-2026-08c/reviews/",
    f"{CANDIDATES}/round-2026-08d/reviews/",
    #: Raw reviewer output is stored verbatim and never edited; a review
    #: quotes its subject's digest at the frozen commit, and that quote is
    #: the review's *binding*, which stays correct precisely because the
    #: subject moved afterwards. The round's disposition/delivery registers
    #: live beside the raw files and quote the same frozen digests.
    f"{CANDIDATES}/round-2026-08e/reviews/",
    f"{CANDIDATES}/reviews/",
    # Exact-byte review evidence for the general trusted-bootstrap
    # transaction lives in the ordinary docs review lane. It remains frozen
    # at the reviewed transaction digest and is never a current owner offer.
    "docs/reviews/R-GENERAL-TRUSTED-BOOTSTRAP-",
    f"{CANDIDATES}/history/",
    f"{CANDIDATES}/fixtures/",
    f"{CANDIDATES}/00-README.md",
    f"{CANDIDATES}/10-EXIT-REPORT.md",
    f"{CANDIDATES}/round-2026-08/OWNER-ROUND-CHARTER.md",
    #: Two SUPERSEDED-bannered offering records whose fenced ceremony blocks
    #: preserve the acts *as they were offered* — the phrase starts at column
    #: zero inside a ```text fence, so no per-line lookbehind marker can ever
    #: precede it. RD-6's rule applies: a banner-marked file is history for
    #: every quote-currency check, never a live offer. Added 2026-08-10 when
    #: the round-2026-08e repairs moved the topology and overview arguments
    #: out from under these records' quotations.
    f"{CANDIDATES}/round-2026-08/FINAL-OWNER-ACCEPTANCE-RECORD.md",
    f"{CANDIDATES}/round-2026-08c/FINAL-OWNER-ACCEPTANCE-PACKET.md",
    SELF_REL,
)


#: Every file known to carry a **copy of an act argument** — a current act
#: subject's digest, quoted for the owner's convenience somewhere other than
#: the acceptance record's own phrase line. Enumerated, printed on every run,
#: and self-maintaining: CG-7e fails if a file carries such a copy and is
#: **not** listed here, so registration cannot be skipped by adding a new copy.
#:
#: Review RD-6 finding H-1 is why this exists. CG-7d requires the act *phrase*
#: and the 64-hex on the same line; CG-15 requires a truncation marker. A full
#: digest in a table row whose act is named in the row label matched neither.
#: RD-6 mutation-proved it in a pristine extraction: seven falsified act
#: arguments — **all four in the document `AGENTS.md` names as the
#: owner-facing offering**, plus three in the closure preflight — returned
#: `0 findings` and `exit 0` across the whole battery.
#: {file: (act labels whose *current* argument the file must carry)}. The act
#: list per file is enumerated, not inferred: inferring it from "which digests
#: does the file happen to contain" is circular — a file that dropped a copy
#: would be read as never having had one, which is the exact failure H-1
#: describes. A file offering an act and not carrying its current argument
#: fails; a file carrying a current argument and absent from this table fails
#: too, so a new copy cannot skip registration.
#:
#: A **superseded** file belongs here only for the acts it still offers as
#: live. A banner-marked file is skipped by CG-7e before this table is
#: consulted, so registering one is dead weight that misreads as a live
#: offer: RD-6 noted that a file cannot be history for CG-15b and a live
#: offer for CG-7d at the same time. On 2026-08-10 every superseded round
#: record (`round-2026-08/FINAL-OWNER-ACCEPTANCE-RECORD.md` — always absent
#: here — plus the 08b record, the 08b public-clone report, and the 08c
#: preflight and packet) carried a qualifying banner, so only the live
#: offering and the craft install record remain registered.
ACT_DIGEST_COPY_FILES = {
    "docs/design/POLARIS-GENERATOR-SIGNOFF-OFFER.md":
        (POLARIS_GENERATOR_APPROVAL_LABEL,),
    f"{CANDIDATES}/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md":
        tuple(f"ACCEPT FOUNDATIONAL WAVE {w}" for w in WAVE_IDS) + (
         "CONFIRM CRAFT AMENDMENT: CC-TEST-2",
         "CONFIRM CRAFT AMENDMENT: CC-IMPACT",
         "ACCEPT TOPOLOGY", "ADOPT PROJECT OVERVIEW"),
    f"{CRAFT}/INSTALL-RECORD.md":
        ("CONFIRM CRAFT AMENDMENT: CC-TEST-2",
         "CONFIRM CRAFT AMENDMENT: CC-SPEC",
         "CONFIRM CRAFT AMENDMENT: CC-IMPACT",
         GENERAL_BOOTSTRAP_LABEL),
    # The Wave A closure report (2026-08-10) summarizes the confirmed
    # argument for the owner and therefore carries a full copy of it; if
    # the argument ever regenerates again, this registration makes the
    # stale copy a finding instead of a silent misstatement.
    f"{CANDIDATES}/round-2026-08e/WAVE-A-CLOSURE-REPORT.md":
        ("ACCEPT FOUNDATIONAL WAVE A",),
    # The Wave B closure report (2026-08-10) likewise carries a full copy
    # of its confirmed argument, for the same reason.
    f"{CANDIDATES}/round-2026-08e/WAVE-B-CLOSURE-REPORT.md":
        ("ACCEPT FOUNDATIONAL WAVE B",),
    # The round-2026-08g preflight (2026-08-13) records both current
    # arguments as measured evidence of the starting state. A preflight is
    # a dated snapshot by design, which is exactly why it needs registering:
    # "it was true when written" is how a stale digest survives unnoticed.
    f"{CANDIDATES}/round-2026-08g/FINAL-OWNER-AND-SPEC-CLOSURE-PREFLIGHT.md":
        ("ACCEPT FOUNDATIONAL WAVE A", "ACCEPT FOUNDATIONAL WAVE B"),
    f"{CANDIDATES}/general-trusted-bootstrap-authorization/ACT-SEMANTICS.md":
        ("CONFIRM CRAFT AMENDMENT: CC-SPEC",),
    f"{CANDIDATES}/general-trusted-bootstrap-authorization/TRANSACTION-MANIFEST.txt":
        ("CONFIRM CRAFT AMENDMENT: CC-SPEC",),
    f"{PWB_STATE1_DIR}/OWNER-SIGNOFF-PACKET.md":
        (PWB_STATE1_LABEL,),
    f"{PWB_STATE1_DIR}/CANDIDATE-REPORT.md":
        (PWB_STATE1_LABEL,),
    f"{PWB_EFFECT_ACTS_DIR}/ACT-SEMANTICS.md": PWB_EFFECT_ACT_LABELS,
    f"{PWB_EFFECT_ACTS_DIR}/PWB-EFFECT-ACTS-MANIFEST.txt": PWB_EFFECT_ACT_LABELS,
    f"{PWB_TRUTH_AMENDMENT_DIR}/PWB-EFFECT-AMENDMENT-MANIFEST.txt":
        PWB_EFFECT_ACT_LABELS[1:],
    f"{PWB_TRUTH_AMENDMENT_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_TRUTH_AMENDMENT_LABEL,) + PWB_EFFECT_ACT_LABELS[1:],
    # The 2026-09-30 registry currency-and-briefing amendment offers the
    # registry subject's current argument as its manifest's single row.
    f"{PWB_REGISTRY_CURRENCY_DIR}/PWB-EFFECT-AMENDMENT-MANIFEST.txt":
        (PWB_EFFECT_ACTS[2][0],),
    # The battery's recorder lines pass the registry and policy acts'
    # arguments.
    "PROJECT-STATUS.md": (PWB_EFFECT_ACTS[2][0], PWB_EFFECT_ACTS[1][0],
                          PWB_OPENING_BAND_LABEL,
                          PWB_RENDER_MODE_LABEL, PWB_MACHINE_VIEW_LABEL),
    f"{PWB_SCOPED_AMENDMENT_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_SCOPED_AMENDMENT_LABEL,),
    f"{PWB_RENDER_MODE_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_RENDER_MODE_LABEL,),
    f"{PWB_MACHINE_VIEW_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_MACHINE_VIEW_LABEL,),
    # The render-mode round-3 disposition record carries the offered argument
    # on its recorder-readable `Manifest SHA-256:` line, as the opening-band
    # record does.
    f"{PWB_RENDER_MODE_DIR}/ROUND-3-DISPOSITIONS.md":
        (PWB_RENDER_MODE_LABEL,),
    f"{PWB_MACHINE_VIEW_DIR}/ROUND-7-DISPOSITIONS.md":
        (PWB_MACHINE_VIEW_LABEL,),
    f"{PWB_OPENING_BAND_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_OPENING_BAND_LABEL,),
    # The round-11 disposition record beside the package carries the offered
    # argument on its recorder-readable `Manifest SHA-256:` line
    # (POLARIS-GATE-SITTING-2026-09-26-DECISION.md §1); it goes stale the
    # moment the manifest moves, which is rule 10 made visible.
    f"{PWB_OPENING_BAND_DIR}/ROUND-11-DISPOSITIONS.md":
        (PWB_OPENING_BAND_LABEL,),
    f"{PWB_MISSING_CURRENCY_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_MISSING_CURRENCY_LABEL,),
    f"{PWB_DISMISSAL_EXPIRY_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_DISMISSAL_EXPIRY_LABEL,),
    f"{PWB_CONTAINER_SHAPE_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_CONTAINER_SHAPE_LABEL,),
    f"{PWB_ITEM_DEPTH_DIR}/OWNER-DECISION-PACKET.md":
        (PWB_ITEM_DEPTH_LABEL,),
    # The owner-act record quotes each performed act's exact phrase and
    # argument (ceremony step 4). Extend this tuple as acts are performed;
    # a stale copy here would misstate what was accepted.
    f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md":
        ("ACCEPT FOUNDATIONAL WAVE A", "ACCEPT FOUNDATIONAL WAVE B",
         "CONFIRM CRAFT AMENDMENT: CC-SPEC",
         "CONFIRM CRAFT AMENDMENT: CC-IMPACT", GENERAL_BOOTSTRAP_LABEL),
    GENERAL_BOOTSTRAP_ACT:
        (CC_SPEC_LABEL, GENERAL_BOOTSTRAP_LABEL),
}


def _activate_polaris_edit_repair_candidate_copy_registry(registry=None,
                                                          root=None):
    """Register the unperformed packet copy only with its own manifest."""
    if not _polaris_edit_repair_candidate_exists(root):
        return
    if registry is None:
        registry = ACT_DIGEST_COPY_FILES
    registry[f"{POLARIS_EDIT_REPAIR_DIR}/OWNER-DECISION-PACKET.md"] = (
        POLARIS_EDIT_REPAIR_LABEL,)


_activate_polaris_edit_repair_candidate_copy_registry()


def _activate_pwb_state1_act_copy_registry():
    """Require both performed-record copies once the dedicated act exists.

    The dedicated decision file is the structural transition signal. Merely
    quoting the candidate phrase in the packet/report must not require an act
    record that does not exist yet; once the dedicated file exists, however,
    both it and the append-only aggregate record must carry the exact current
    argument or CG-7e fails closed.
    """
    if not os.path.isfile(os.path.join(ROOT, PWB_STATE1_ACT)):
        return
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
    if PWB_STATE1_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[aggregate] = labels + (PWB_STATE1_LABEL,)
    ACT_DIGEST_COPY_FILES[PWB_STATE1_ACT] = (PWB_STATE1_LABEL,)


_activate_pwb_state1_act_copy_registry()


def _activate_polaris_generator_act_copy_registry():
    """A prepared offer grants nothing; performed copies must remain complete."""
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    for act in POLARIS_GENERATOR_APPROVAL_ACTS:
        if not os.path.isfile(os.path.join(ROOT, act)):
            continue
        labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
        if POLARIS_GENERATOR_APPROVAL_LABEL not in labels:
            ACT_DIGEST_COPY_FILES[aggregate] = labels + (POLARIS_GENERATOR_APPROVAL_LABEL,)
        ACT_DIGEST_COPY_FILES[act] = (POLARIS_GENERATOR_APPROVAL_LABEL,)


_activate_polaris_generator_act_copy_registry()


def _activate_polaris_understanding_act_copy_registry():
    if not os.path.isfile(os.path.join(ROOT, POLARIS_UNDERSTANDING_ACT)):
        return
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
    if POLARIS_UNDERSTANDING_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[aggregate] = labels + (POLARIS_UNDERSTANDING_LABEL,)
    ACT_DIGEST_COPY_FILES[POLARIS_UNDERSTANDING_ACT] = (POLARIS_UNDERSTANDING_LABEL,)


_activate_polaris_understanding_act_copy_registry()


def _activate_pwb_truth_amendment_act_copy_registry():
    """Same transition rule as the state-(1) act, for its successor.

    Once `PWB-TRUTH-READINESS-AMENDMENT-ACT.md` exists, it and the aggregate
    record must both carry the exact current behavior-manifest digest.
    """
    if not os.path.isfile(os.path.join(ROOT, PWB_TRUTH_AMENDMENT_ACT)):
        return
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
    if PWB_TRUTH_AMENDMENT_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[aggregate] = labels + (PWB_TRUTH_AMENDMENT_LABEL,)
    ACT_DIGEST_COPY_FILES[PWB_TRUTH_AMENDMENT_ACT] = (PWB_TRUTH_AMENDMENT_LABEL,)


_activate_pwb_truth_amendment_act_copy_registry()


def _activate_polaris_edit_repair_act_copy_registry():
    """Same transition rule as the sibling candidate acts, for this one.

    `POLARIS-EDIT-REPAIR-DELETION-SCENARIO-ACT.md` does not exist yet (this
    package is drafted, not signed off); this function is therefore a no-op
    today. Once the dedicated act file exists, it and the aggregate record
    must both carry the exact current manifest-file digest, or CG-7e fails
    closed on the first drift.
    """
    if not os.path.isfile(os.path.join(ROOT, POLARIS_EDIT_REPAIR_ACT)):
        return
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
    if POLARIS_EDIT_REPAIR_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[aggregate] = labels + (POLARIS_EDIT_REPAIR_LABEL,)
    ACT_DIGEST_COPY_FILES[POLARIS_EDIT_REPAIR_ACT] = (POLARIS_EDIT_REPAIR_LABEL,)


_activate_polaris_edit_repair_act_copy_registry()


def _activate_pwb_scoped_amendment_act_copy_registry():
    """Same transition rule, for the lane B scoped-attributes successor.

    Once `PWB-SCOPED-ATTRIBUTES-AMENDMENT-ACT.md` exists, it and the aggregate
    record must both carry the exact current behavior-manifest digest. A no-op
    until then; the packet copy is registered statically above.
    """
    if not os.path.isfile(os.path.join(ROOT, PWB_SCOPED_AMENDMENT_ACT)):
        return
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
    if PWB_SCOPED_AMENDMENT_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[aggregate] = labels + (PWB_SCOPED_AMENDMENT_LABEL,)
    ACT_DIGEST_COPY_FILES[PWB_SCOPED_AMENDMENT_ACT] = (PWB_SCOPED_AMENDMENT_LABEL,)


_activate_pwb_scoped_amendment_act_copy_registry()


def _activate_pwb_render_mode_act_copy_registry():
    """Same transition rule, for the exact-source render-mode successor.

    Once `PWB-EXACT-SOURCE-RENDER-MODE-AMENDMENT-ACT.md` exists, it and the
    aggregate record must both carry the exact current behavior-manifest
    digest. A no-op until then; the packet copy is registered statically
    above.
    """
    if not os.path.isfile(os.path.join(ROOT, PWB_RENDER_MODE_ACT)):
        return
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
    if PWB_RENDER_MODE_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[aggregate] = labels + (PWB_RENDER_MODE_LABEL,)
    ACT_DIGEST_COPY_FILES[PWB_RENDER_MODE_ACT] = (PWB_RENDER_MODE_LABEL,)


_activate_pwb_render_mode_act_copy_registry()


def _activate_pwb_candidate_act_copy_registry(label, act_rel):
    """Same transition rule for the machine-view and opening-band successors.

    A no-op until the dedicated act record exists; the packet copy is
    registered statically above.
    """
    if not os.path.isfile(os.path.join(ROOT, act_rel)):
        return
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
    if label not in labels:
        ACT_DIGEST_COPY_FILES[aggregate] = labels + (label,)
    ACT_DIGEST_COPY_FILES[act_rel] = (label,)


def _activate_pwb_machine_view_act_copy_registry():
    _activate_pwb_candidate_act_copy_registry(
        PWB_MACHINE_VIEW_LABEL, PWB_MACHINE_VIEW_ACT)


def _activate_pwb_opening_band_act_copy_registry():
    _activate_pwb_candidate_act_copy_registry(
        PWB_OPENING_BAND_LABEL, PWB_OPENING_BAND_ACT)


def _activate_pwb_missing_currency_act_copy_registry():
    _activate_pwb_candidate_act_copy_registry(
        PWB_MISSING_CURRENCY_LABEL, PWB_MISSING_CURRENCY_ACT)


def _activate_pwb_dismissal_expiry_act_copy_registry():
    _activate_pwb_candidate_act_copy_registry(
        PWB_DISMISSAL_EXPIRY_LABEL, PWB_DISMISSAL_EXPIRY_ACT)


def _activate_pwb_item_depth_act_copy_registry():
    _activate_pwb_candidate_act_copy_registry(
        PWB_ITEM_DEPTH_LABEL, PWB_ITEM_DEPTH_ACT)


_activate_pwb_machine_view_act_copy_registry()
_activate_pwb_opening_band_act_copy_registry()
_activate_pwb_missing_currency_act_copy_registry()
def _activate_pwb_container_shape_act_copy_registry():
    _activate_pwb_candidate_act_copy_registry(
        PWB_CONTAINER_SHAPE_LABEL, PWB_CONTAINER_SHAPE_ACT)


_activate_pwb_dismissal_expiry_act_copy_registry()
_activate_pwb_container_shape_act_copy_registry()
_activate_pwb_item_depth_act_copy_registry()


def _activate_polaris_no_signal_act_copy_registry():
    """Require both record copies only once the dedicated record exists."""
    if not os.path.isfile(os.path.join(ROOT, POLARIS_NO_SIGNAL_ACT)):
        return
    labels = ACT_DIGEST_COPY_FILES.get(PERFORMED_ACT_RECORD, ())
    if POLARIS_NO_SIGNAL_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[PERFORMED_ACT_RECORD] = labels + (POLARIS_NO_SIGNAL_LABEL,)
    ACT_DIGEST_COPY_FILES[POLARIS_NO_SIGNAL_ACT] = (POLARIS_NO_SIGNAL_LABEL,)


def _activate_contract_restyle_act_copy_registry():
    """Require both record copies only once the dedicated record exists."""
    if not os.path.isfile(os.path.join(ROOT, CONTRACT_RESTYLE_ACT)):
        return
    labels = ACT_DIGEST_COPY_FILES.get(PERFORMED_ACT_RECORD, ())
    if CONTRACT_RESTYLE_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[PERFORMED_ACT_RECORD] = labels + (CONTRACT_RESTYLE_LABEL,)
    ACT_DIGEST_COPY_FILES[CONTRACT_RESTYLE_ACT] = (CONTRACT_RESTYLE_LABEL,)


CONTRACT_RESTYLE_PACKET = (
    f"{CANDIDATES}/contract-readability-restyle/OWNER-DECISION-PACKET.md")


def _activate_contract_restyle_packet_copy_registry(registry=None, root=None):
    """Register the unperformed packet copy once the packet exists."""
    if not os.path.isfile(os.path.join(root or ROOT, CONTRACT_RESTYLE_PACKET)):
        return
    if registry is None:
        registry = ACT_DIGEST_COPY_FILES
    registry[CONTRACT_RESTYLE_PACKET] = (CONTRACT_RESTYLE_LABEL,)


_activate_contract_restyle_packet_copy_registry()


def _activate_scoped_values_copy_registry(registry=None, root=None):
    """Register the packet copy once the packet exists, and both record copies
    once the dedicated act record exists (each its own transition signal)."""
    registry = ACT_DIGEST_COPY_FILES if registry is None else registry
    base = root or ROOT
    if os.path.isfile(os.path.join(base, SCOPED_VALUES_PACKET)):
        registry[SCOPED_VALUES_PACKET] = (SCOPED_VALUES_LABEL,)
    if os.path.isfile(os.path.join(base, SCOPED_VALUES_ACT)):
        labels = registry.get(PERFORMED_ACT_RECORD, ())
        if SCOPED_VALUES_LABEL not in labels:
            registry[PERFORMED_ACT_RECORD] = labels + (SCOPED_VALUES_LABEL,)
        registry[SCOPED_VALUES_ACT] = (SCOPED_VALUES_LABEL,)


_activate_scoped_values_copy_registry()


#: Packages signed by version tag under
#: `decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`:
#: `(record stem, owner packet)`. A versioned sign-off carries no phrase and no
#: digest argument, and a later version may change the package, so once a
#: package has a `<stem>-SIGNOFF-v<M.m>.md` record its packet is no longer an
#: act-argument copy: it is dropped from the copy registry and CG-7e skips it.
#: The exemption is existence-gated and per package; every digest-bound act
#: already performed, and doctrine and accepted contracts, keep their copies.
VERSIONED_SIGNOFF_PACKAGES = tuple(
    (stem, packet) for _key, stem, _label, _subject, _act, _subjects, packet
    in VERSIONED_PWB_PACKAGES)


def _versioned_signoff_records(stem, root=None):
    """Repo-relative dedicated records for one package, oldest version first."""
    base = os.path.join(root or ROOT, DECISIONS)
    found = []
    if os.path.isdir(base):
        for name in os.listdir(base):
            m = re.fullmatch(re.escape(stem) + r"-SIGNOFF-v(\d+)\.(\d+)\.md", name)
            if m:
                found.append(((int(m.group(1)), int(m.group(2))),
                              f"{DECISIONS}/{name}"))
    return [rel for _version, rel in sorted(found)]


def _versioned_exempt_files(root=None):
    return {packet for stem, packet in VERSIONED_SIGNOFF_PACKAGES
            if _versioned_signoff_records(stem, root)}


def _apply_versioned_signoff_exemptions(registry=None, root=None):
    registry = ACT_DIGEST_COPY_FILES if registry is None else registry
    for packet in _versioned_exempt_files(root):
        registry.pop(packet, None)


_apply_versioned_signoff_exemptions()


#: Ordered owner-act successors to the bootstrap 30-row contract manifest:
#: `(label, subject manifest, dedicated act record, copy-registry activation,
#: closed path tuple)`. Each link's manifest must bind exactly its own path
#: tuple, in that (codepoint-sorted) order: a missing row, an extra row (even
#: another bootstrap path) or a reordering is a finding, and every row must
#: also name a bootstrap row. Chain order is adoption order: CG-7h folds every
#: validly performed link's rows into the current-byte expectation in this
#: order, so a later link overrides an earlier one for a shared path. An
#: earlier link need not be performed (a gap is allowed only when it has no
#: records at all); one with records that fail validation blocks every later
#: link, and one performed after a later link is rejected as performed out
#: of order: by aggregate position (first line naming the label) *and* by
#: act instant. Each performed link's dedicated record must carry exactly one
#: full-line `Act instant: YYYY-MM-DDTHH:MM:SSZ`, repeated as the nearest
#: `Act instant:` line above its phrase in the aggregate (the form
#: `record_contract_readability_restyle.py` writes; a no-signal recorder must
#: write the same). A missing, malformed, duplicated or disagreeing instant,
#: or an instant equal to a later link's, fails closed. Candidate manifests
#: without both records never override anything.
#: The RFC5-14 project-documentation amendment (one module). Its act takes the
#: SHA-256 of the patched module, which is the manifest's one row, not the
#: manifest file's digest, so the link is a row-argument link
#: (`ROW_ARGUMENT_LINK_LABELS`): CG-7h reads the argument from the row.
RFC5_CLASS_LABEL = "AMEND RFC5-14 WITH THE PROJECT-DOCUMENTATION CONTENT CLASS"
RFC5_CLASS_DIR = f"{CANDIDATES}/rfc5-project-documentation-class"
RFC5_CLASS_SUBJECT = f"{RFC5_CLASS_DIR}/CONTRACT-AMENDMENT-MANIFEST.txt"
RFC5_CLASS_ACT = f"{DECISIONS}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md"
RFC5_CLASS_MODULE = ".syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md"
RFC5_CLASS_PATHS = ("rfcs/RFC-0005/consent-egress-secrets.md",)
ROW_ARGUMENT_LINK_LABELS = frozenset({RFC5_CLASS_LABEL})
#: The file whose digest is the act argument of a row-argument link: the
#: installed module, which the manifest row hashes in its proposed form.
ROW_ARGUMENT_SUBJECTS = {RFC5_CLASS_LABEL: RFC5_CLASS_MODULE}


def _activate_rfc5_class_act_copy_registry():
    """Require both record copies and the manifest row once the record exists."""
    if not os.path.isfile(os.path.join(ROOT, RFC5_CLASS_ACT)):
        return
    labels = ACT_DIGEST_COPY_FILES.get(PERFORMED_ACT_RECORD, ())
    if RFC5_CLASS_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[PERFORMED_ACT_RECORD] = labels + (RFC5_CLASS_LABEL,)
    ACT_DIGEST_COPY_FILES[RFC5_CLASS_ACT] = (RFC5_CLASS_LABEL,)
    ACT_DIGEST_COPY_FILES[RFC5_CLASS_SUBJECT] = (RFC5_CLASS_LABEL,)


CONTRACT_SUCCESSOR_CHAIN = (
    (POLARIS_NO_SIGNAL_LABEL, POLARIS_NO_SIGNAL_SUBJECT,
     POLARIS_NO_SIGNAL_ACT, _activate_polaris_no_signal_act_copy_registry,
     POLARIS_NO_SIGNAL_PATHS),
    (CONTRACT_RESTYLE_LABEL, CONTRACT_RESTYLE_SUBJECT,
     CONTRACT_RESTYLE_ACT, _activate_contract_restyle_act_copy_registry,
     CONTRACT_RESTYLE_PATHS),
    (RFC5_CLASS_LABEL, RFC5_CLASS_SUBJECT, RFC5_CLASS_ACT,
     _activate_rfc5_class_act_copy_registry, RFC5_CLASS_PATHS),
)
for _label, _subject, _act_rel, _activate, _paths in CONTRACT_SUCCESSOR_CHAIN:
    _activate()
del _label, _subject, _act_rel, _activate, _paths


def _activate_pwb_effect_act_copy_registries():
    """Require both record copies for each performed effect act.

    The three PWB effect acts are separable: the owner may perform any
    subset. Each dedicated decision file is its own structural transition
    signal — once it exists, it and the append-only aggregate record must
    both carry that act's exact current argument or CG-7e fails closed.
    """
    # The generated packet and report exist only after `--finalize`; until
    # then there is no copy to go stale, so their registration is gated on
    # the file existing rather than asserted from import time.
    for generated in ("OWNER-SIGNOFF-PACKET.md", "CANDIDATE-REPORT.md"):
        rel = f"{PWB_EFFECT_ACTS_DIR}/{generated}"
        if os.path.isfile(os.path.join(ROOT, rel)):
            ACT_DIGEST_COPY_FILES[rel] = PWB_EFFECT_ACT_LABELS
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    for label, _subject, act in PWB_EFFECT_ACTS:
        if not os.path.isfile(os.path.join(ROOT, act)):
            continue
        labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
        if label not in labels:
            ACT_DIGEST_COPY_FILES[aggregate] = labels + (label,)
        ACT_DIGEST_COPY_FILES[act] = (label,)


_activate_pwb_effect_act_copy_registries()

#: A performed digest remains valid historical evidence even after its
#: subject is amended. These one-time offerings are not current copies and
#: must not be rewritten to the successor digest. Each file is bound to the
#: exact act-time digest and quotation-line grammar it historically used;
#: accepting a decoy occurrence elsewhere in the file would let a mutated
#: ceremony line pass while appearing pinned.
CC_SPEC_ACT_6_DIGEST = (
    "9889b7e311ad941eec84d01dc2c035c7e2502a57cf18e68a1028a76d5b814871")
GENERAL_BOOTSTRAP_ACT_DIGEST = (
    "1885a323c659364f98e81cdf04479cebfecf5b22d350928d046ebb5b7c5268f6")
ACT_HISTORICAL_DIGEST_COPY_FILES = {
    f"{CANDIDATES}/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md":
        {CC_SPEC_LABEL: ((CC_SPEC_ACT_6_DIGEST, re.compile(
            r"^\| 6 \| `" + re.escape(CC_SPEC_LABEL) + r"@"
            + CC_SPEC_ACT_6_DIGEST + r"` \|", re.M
        )),)},
    f"{DECISIONS}/SPECIFICATION-ACCEPTANCE-DECISION.md":
        {CC_SPEC_LABEL: ((CC_SPEC_ACT_6_DIGEST, re.compile(
            r"^" + re.escape(CC_SPEC_LABEL) + r"@"
            + CC_SPEC_ACT_6_DIGEST + r"$", re.M
        )),)},
    f"{GENERAL_BOOTSTRAP_DIR}/OWNER-SIGNOFF-PACKET.md":
        {GENERAL_BOOTSTRAP_LABEL: ((GENERAL_BOOTSTRAP_ACT_DIGEST, re.compile(
            r"^" + re.escape(GENERAL_BOOTSTRAP_LABEL) + r": "
            + GENERAL_BOOTSTRAP_ACT_DIGEST + r"$", re.M
        )),)},
    f"{GENERAL_BOOTSTRAP_DIR}/CANDIDATE-TRANSACTION-REPORT.md":
        {GENERAL_BOOTSTRAP_LABEL: ((GENERAL_BOOTSTRAP_ACT_DIGEST, re.compile(
            r"^`" + GENERAL_BOOTSTRAP_ACT_DIGEST + r"`\.$", re.M
        )),)},
}


# Retained reconciliation reviews quote the performed policy's exact input hash.
# These are historical evidence copies, never new/current owner offerings.
POLARIS_UNDERSTANDING_REVIEW_POLICY_DIGEST = "6093dbbe519dad6c35a5aaeeb31355d2e435d76ec4f0c2c9affb0d1e5b6b5621"
POLARIS_UNDERSTANDING_REVIEW_COPIES = (
    "docs/evidence/polaris-understanding-reconciliation-2026-09-28/REVIEW-1-RAW.md",
    "docs/evidence/polaris-understanding-reconciliation-2026-09-28/REVIEW-RAW.md",
)
for _review_copy in POLARIS_UNDERSTANDING_REVIEW_COPIES:
    ACT_HISTORICAL_DIGEST_COPY_FILES[_review_copy] = {
        CC_SPEC_LABEL: ((POLARIS_UNDERSTANDING_REVIEW_POLICY_DIGEST, re.compile(
            r"^- `" + re.escape(CC_SPEC_SUBJECT) + r"`: `"
            + POLARIS_UNDERSTANDING_REVIEW_POLICY_DIGEST + r"`$", re.M
        )),),
    }


def _activate_pwb_effect_amendment_act_copy_registries():
    """Re-register a superseded effect act's copies as history once its
    amendment record exists.

    Before the amendment act is performed, the 2026-09-02 packet files and
    dedicated record are the current copies and must fail CG-7e the moment
    the artifact bytes drift: that failure is the pre-act state, not noise.
    Once the successor record exists, those same files may not be rewritten
    to the new argument (they are one-time offerings and an append-only act
    record), so each is pinned to its exact act-time quotation line instead,
    and the new dedicated record plus the aggregate carry the current
    argument. Every other label a file carries stays current.
    """
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    for label, subject, predecessor, act, performed_digest in PWB_EFFECT_AMENDMENT_ACTS:
        if not os.path.isfile(os.path.join(ROOT, act)):
            continue
        labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
        if label not in labels:
            ACT_DIGEST_COPY_FILES[aggregate] = labels + (label,)
        ACT_DIGEST_COPY_FILES[act] = (label,)
        phrase_line = r"^" + re.escape(label) + r": " + performed_digest + r"$"
        manifest_row = r"^" + performed_digest + r"  " + re.escape(subject) + r"$"
        if predecessor in PWB_EFFECT_AMENDMENT_OFFERINGS:
            # A later link: its predecessor was itself an amendment, offered
            # by that amendment's own package.
            historical = {predecessor: phrase_line}
            for rel, shape in PWB_EFFECT_AMENDMENT_OFFERINGS[predecessor].items():
                historical[rel] = (manifest_row if shape == "row"
                                   else manifest_row[:-1] + r"  \[variant: [a-z-]+\]$"
                                   if shape == "variant-row" else phrase_line)
        else:
            historical = {
                f"{PWB_EFFECT_ACTS_DIR}/ACT-SEMANTICS.md": phrase_line,
                f"{PWB_EFFECT_ACTS_DIR}/PWB-EFFECT-ACTS-MANIFEST.txt": manifest_row,
                f"{PWB_EFFECT_ACTS_DIR}/OWNER-SIGNOFF-PACKET.md": phrase_line,
                f"{PWB_EFFECT_ACTS_DIR}/CANDIDATE-REPORT.md":
                    r"^\| `[a-z-]+` \| `" + re.escape(subject) + r"` \| `"
                    + performed_digest + r"` \|$",
                predecessor: phrase_line,
            }
        for rel, pattern in historical.items():
            current = ACT_DIGEST_COPY_FILES.get(rel)
            if current is not None:
                remaining = tuple(lab for lab in current if lab != label)
                if remaining:
                    ACT_DIGEST_COPY_FILES[rel] = remaining
                else:
                    del ACT_DIGEST_COPY_FILES[rel]
            ACT_HISTORICAL_DIGEST_COPY_FILES.setdefault(rel, {})[label] = (
                (performed_digest, re.compile(pattern, re.M)),)


_activate_pwb_effect_amendment_act_copy_registries()


def _activate_pwb_behavior_repin_manifest_copy_registry():
    """The re-pin manifest carries both current arguments as its rows.

    Existence-gated: the manifest is a candidate file, registered as a
    current copy of the policy and registry arguments while it exists.
    """
    if os.path.isfile(os.path.join(ROOT, PWB_BEHAVIOR_REPIN_MANIFEST)):
        ACT_DIGEST_COPY_FILES[PWB_BEHAVIOR_REPIN_MANIFEST] = (
            PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[2][0])
        # Once the screening-scope act supersedes the policy re-pin, the
        # policy row is history (registered by the amendment registries).
        if os.path.isfile(os.path.join(ROOT, PWB_SCOPE_ACT)):
            ACT_DIGEST_COPY_FILES[PWB_BEHAVIOR_REPIN_MANIFEST] = (
                PWB_EFFECT_ACTS[2][0],)
        if os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md")):
            # Both rows are now exact historical offerings. Do not re-add
            # the old registry row as a current argument after the chain pass.
            ACT_DIGEST_COPY_FILES.pop(PWB_BEHAVIOR_REPIN_MANIFEST, None)
            ACT_DIGEST_COPY_FILES[
                f"{CANDIDATES}/pwb-registry-machine-ceiling-amendment/"
                "PWB-REGISTRY-MACHINE-CEILING-AMENDMENT-MANIFEST.txt"
            ] = (PWB_EFFECT_ACTS[2][0],)
            # The new version recorder takes no digest argument. The battery
            # retains act B's argument solely for its historical --check.
            ACT_DIGEST_COPY_FILES["PROJECT-STATUS.md"] = tuple(
                label for label in ACT_DIGEST_COPY_FILES["PROJECT-STATUS.md"]
                if label != PWB_EFFECT_ACTS[2][0])


_activate_pwb_behavior_repin_manifest_copy_registry()


def _activate_pwb_scope_manifest_copy_registry():
    """The screening-scope manifest carries the policy's proposed argument.

    Existence-gated candidate file: a current copy of the policy argument
    while it exists.
    """
    if (os.path.isfile(os.path.join(ROOT, PWB_SCOPE_MANIFEST))
            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md"))):
        # once the version-2 act supersedes it, the version-1 manifest row is history
        ACT_DIGEST_COPY_FILES[PWB_SCOPE_MANIFEST] = (PWB_EFFECT_ACTS[1][0],)


_activate_pwb_scope_manifest_copy_registry()


def _activate_public_admission_manifest_copy_registry():
    """The admission manifest carries all three current arguments as rows.

    Existence-gated: a candidate file, registered as a current copy of the
    three records' digests while it exists. The chain link and the performed
    records arrive with the acts.
    """
    if os.path.isfile(os.path.join(ROOT, PUBLIC_ADMISSION_MANIFEST)):
        ACT_DIGEST_COPY_FILES[PUBLIC_ADMISSION_MANIFEST] = tuple(
            label for label, _subject in PUBLIC_ADMISSION_ACTS)
    # The round-7 notes record sits beside the package; registered per the
    # 2026-09-26 owner ruling so a digest ever quoted there is checked.
    if os.path.isfile(os.path.join(ROOT, PUBLIC_ADMISSION_DISPOSITIONS)):
        ACT_DIGEST_COPY_FILES[PUBLIC_ADMISSION_DISPOSITIONS] = tuple(
            label for label, _subject in PUBLIC_ADMISSION_ACTS)


_activate_public_admission_manifest_copy_registry()


def _activate_redis_local_agent_performed_registries():
    """Install change: each performed admission or registry record is an act-copy file."""
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    for label, rel in (
            (PUBLIC_ADMISSION_ACTS[1][0], f"{DECISIONS}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md"),
    ):
        if not os.path.isfile(os.path.join(ROOT, rel)):
            continue
        labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())
        if label not in labels:
            ACT_DIGEST_COPY_FILES[aggregate] = labels + (label,)
        ACT_DIGEST_COPY_FILES[rel] = (label,)


_activate_redis_local_agent_performed_registries()


def _activate_public_registry_manifest_copy_registry():
    """The registry-entries manifest carries both current arguments as rows.

    Existence-gated candidate registration; the chain link and performed
    records arrive with the acts.
    """
    if os.path.isfile(os.path.join(ROOT, PUBLIC_REGISTRY_MANIFEST)):
        ACT_DIGEST_COPY_FILES[PUBLIC_REGISTRY_MANIFEST] = tuple(
            label for label, _subject in PUBLIC_REGISTRY_ACTS)
    # The round-4 notes record sits beside the package (2026-09-26 ruling).
    if os.path.isfile(os.path.join(ROOT, PUBLIC_REGISTRY_DISPOSITIONS)):
        ACT_DIGEST_COPY_FILES[PUBLIC_REGISTRY_DISPOSITIONS] = tuple(
            label for label, _subject in PUBLIC_REGISTRY_ACTS)


_activate_public_registry_manifest_copy_registry()
def _activate_messages_api_manifest_copy_registry():
    """The Messages API route manifest carries its one current argument as a row.

    Existence-gated candidate registration; the performed record arrives with
    the act.
    """
    if os.path.isfile(os.path.join(ROOT, MESSAGES_API_MANIFEST)):
        ACT_DIGEST_COPY_FILES[MESSAGES_API_MANIFEST] = tuple(
            label for label, _subject in MESSAGES_API_ACTS)


_activate_messages_api_manifest_copy_registry()


def _activate_public_egress_v2_manifest_copy_registry():
    """The egress version 2 manifest carries its one current argument as a row.

    Existence-gated candidate registration; the performed record arrives with
    the act. The round notes record is registered when it exists, so a digest
    ever quoted there is checked.
    """
    if os.path.isfile(os.path.join(ROOT, PUBLIC_EGRESS_V2_MANIFEST)):
        ACT_DIGEST_COPY_FILES[PUBLIC_EGRESS_V2_MANIFEST] = tuple(
            label for label, _subject in PUBLIC_EGRESS_V2_ACTS)
    for name in PUBLIC_EGRESS_V2_DISPOSITION_NAMES:
        rel = f"{PUBLIC_EGRESS_V2_DIR}/{name}"
        if os.path.isfile(os.path.join(ROOT, rel)):
            ACT_DIGEST_COPY_FILES[rel] = tuple(
                label for label, _subject in PUBLIC_EGRESS_V2_ACTS)


_activate_public_egress_v2_manifest_copy_registry()


def _activate_dossier_local_agent_manifest_copy_registry():
    """The local-agent sitting manifest carries its five current arguments as rows.

    Existence-gated candidate registration; the performed records arrive with
    the acts. The round notes records are registered when they exist, so a
    digest ever quoted there is checked.
    """
    labels = tuple(label for label, _subject in DOSSIER_LOCAL_AGENT_ACTS)
    if os.path.isfile(os.path.join(ROOT, DOSSIER_LOCAL_AGENT_MANIFEST)):
        ACT_DIGEST_COPY_FILES[DOSSIER_LOCAL_AGENT_MANIFEST] = labels
    for name, carried in DOSSIER_LOCAL_AGENT_DISPOSITION_NAMES.items():
        rel = f"{DOSSIER_LOCAL_AGENT_DIR}/{name}"
        if os.path.isfile(os.path.join(ROOT, rel)):
            ACT_DIGEST_COPY_FILES[rel] = labels if carried is None else carried
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    for label, record in DOSSIER_LOCAL_AGENT_ACT_RECORDS.items():
        if not os.path.isfile(os.path.join(ROOT, record)):
            continue
        present = ACT_DIGEST_COPY_FILES.get(aggregate, ())
        if label not in present:
            ACT_DIGEST_COPY_FILES[aggregate] = present + (label,)
        ACT_DIGEST_COPY_FILES[record] = (label,)


_activate_dossier_local_agent_manifest_copy_registry()


def _activate_dossier_provider_v2_copy_registry():
    """The provider version 2 manifest carries its one current argument as a row.

    Existence-gated: the manifest is registered while it exists; the
    dedicated record joins the aggregate once performed. The round-2 notes
    record quotes no digest, so it is not registered.
    """
    labels = tuple(label for label, _subject in DOSSIER_PROVIDER_V2_ACTS)
    if os.path.isfile(os.path.join(ROOT, DOSSIER_PROVIDER_V2_MANIFEST)):
        ACT_DIGEST_COPY_FILES[DOSSIER_PROVIDER_V2_MANIFEST] = labels
    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    for label, record in DOSSIER_PROVIDER_V2_ACT_RECORDS.items():
        if not os.path.isfile(os.path.join(ROOT, record)):
            continue
        present = ACT_DIGEST_COPY_FILES.get(aggregate, ())
        if label not in present:
            ACT_DIGEST_COPY_FILES[aggregate] = present + (label,)
        # Its supersession line quotes version 1's argument, which stays
        # current: version 1's subject bytes are unchanged.
        ACT_DIGEST_COPY_FILES[record] = (label, DOSSIER_PROVIDER_V2_SUPERSEDES)


_activate_dossier_provider_v2_copy_registry()


#: The public-source screening scope, version 2 (sitting row 12): one state-(1)
#: `approve-policy` act over ONE of four manifest rows (the variants). It reuses
#: the policy's existing phrase label, supersedes the version-1 act for that
#: role, depends on rows 1 and 7 and registers no chain link; the install change
#: adds the supersession row. Registration is gated on the performed record.
PUBLIC_SOURCE_SCOPE_V2_DIR = f"{CANDIDATES}/public-source-screening-scope-v2"
PUBLIC_SOURCE_SCOPE_V2_MANIFEST = f"{PUBLIC_SOURCE_SCOPE_V2_DIR}/PUBLIC-SOURCE-SCREENING-SCOPE-V2-MANIFEST.txt"
PUBLIC_SOURCE_SCOPE_V2_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md"
PUBLIC_SOURCE_SCOPE_V2_LABEL = "APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY"


def _activate_public_source_scope_v2_copy_registry():
    """The version-2 manifest is a current copy of the policy argument once the act exists.

    Before the act the manifest holds four proposed rows, none yet the policy's
    digest, so registering it would fail CG-7e by design; the registration is
    therefore gated on the performed record, at which point the chosen row is
    the current argument.
    """
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_MANIFEST))
            # once the version-3 act supersedes it, the chosen row is history
            # (pinned by the amendment registries)
            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md"))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V2_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


_activate_public_source_scope_v2_copy_registry()


#: The public-source screening scope, version 3 (`syzygy-wsev`, register row
#: P-105): one `approve-policy` act over ONE of two manifest rows (variants
#: `all`, `non-web`), reusing the policy's phrase label and superseding the
#: version-2 act. Registered at drafting time and gated on the performed record,
#: for the reason the version-2 registration gives; the version-2 copies' historical
#: pinning and the chain link arrive with the act.
PUBLIC_SOURCE_SCOPE_V3_DIR = f"{CANDIDATES}/public-source-screening-scope-v3"
PUBLIC_SOURCE_SCOPE_V3_MANIFEST = f"{PUBLIC_SOURCE_SCOPE_V3_DIR}/PUBLIC-SOURCE-SCREENING-SCOPE-V3-MANIFEST.txt"
PUBLIC_SOURCE_SCOPE_V3_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md"


def _activate_public_source_scope_v3_copy_registry():
    """The version-3 manifest is a current copy of the policy argument once the act exists."""
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_MANIFEST))
            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md"))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V3_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


_activate_public_source_scope_v3_copy_registry()


#: The public-source screening scope, version 4 (`syzygy-olmr`, register row
#: P-110; recorder `scripts/record_public_source_screening_scope_v4_act.py`,
#: `syzygy-3sjj`): one `approve-policy` act over ONE of two manifest rows
#: (variants `span`, `span-guides`), reusing the policy's phrase label and
#: superseding the version-3 act. Its packet carries no digest, so the manifest
#: is the only copy. Registered at drafting time and gated on the performed
#: record, for the reason the version-2 registration gives; the version-3
#: copies' historical pinning (gating the version-3 manifest off), the chain
#: link and the record's manifest-heading exemption arrive with the act.
PUBLIC_SOURCE_SCOPE_V4_DIR = f"{CANDIDATES}/public-source-screening-scope-v4"
PUBLIC_SOURCE_SCOPE_V4_MANIFEST = f"{PUBLIC_SOURCE_SCOPE_V4_DIR}/PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt"
PUBLIC_SOURCE_SCOPE_V4_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md"


def _activate_public_source_scope_v4_copy_registry():
    """The version-4 manifest is a current copy of the policy argument once the act exists."""
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_MANIFEST))
            # once the version-5 act exists the version-4 manifest is history (pinned by the amendment registries)
            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md"))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V4_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


_activate_public_source_scope_v4_copy_registry()


#: The public-source screening scope, version 5 (`syzygy-ha5b`, register row
#: P-116; recorder `scripts/record_public_source_screening_scope_v5_act.py`):
#: one `approve-policy` act over ONE of four manifest rows (variants `bcd`,
#: `bd`, `b`, `t`), reusing the policy's phrase label and superseding the
#: version-4 act. Its packet carries no digest, so the manifest is the only
#: copy. Gated on the performed record (2026-11-03, variant `bcd`), for the
#: reason the version-2 registration gives; the version-4 copies are pinned as
#: history by the chain link and the version-4 manifest's offering entry.
PUBLIC_SOURCE_SCOPE_V5_DIR = f"{CANDIDATES}/public-source-screening-scope-v5"
PUBLIC_SOURCE_SCOPE_V5_MANIFEST = f"{PUBLIC_SOURCE_SCOPE_V5_DIR}/PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt"
PUBLIC_SOURCE_SCOPE_V5_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md"


def _activate_public_source_scope_v5_copy_registry():
    """The version-5 manifest is a current copy of the policy argument once the act exists."""
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V5_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V5_MANIFEST))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V5_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


_activate_public_source_scope_v5_copy_registry()


#: The act-time digests the specification-policy restyle supersedes as the
#: current policy state: act 7's CC-IMPACT argument and the bootstrap
#: transaction's CC-SPEC row (row 5 of its act, line 11 of its manifest).
CC_IMPACT_ACT_7_DIGEST = (
    "cd6ec838e701f0258889d0c3c2776fc91fe1686829379b789ae5b151b04c27c0")
CC_SPEC_TRANSACTION_DIGEST = (
    "6093dbbe519dad6c35a5aaeeb31355d2e435d76ec4f0c2c9affb0d1e5b6b5621")


def _activate_spec_policy_restyle_copy_registries(registry=None, history=None,
                                                  root=None):
    """Register the restyle's copies; once performed, pin the old ones as history.

    The packet is registered when it exists. Once the dedicated act record
    exists, the act record and the package manifest carry the current
    CC-SPEC and CC-IMPACT digests, and every earlier copy that may not be
    rewritten (act 7's offering row, the bootstrap transaction's row and
    its semantics table) is pinned to its exact act-time line instead.
    """
    registry = ACT_DIGEST_COPY_FILES if registry is None else registry
    history = ACT_HISTORICAL_DIGEST_COPY_FILES if history is None else history
    base = ROOT if root is None else root
    packet = f"{SPEC_POLICY_RESTYLE_DIR}/OWNER-DECISION-PACKET.md"
    if os.path.isfile(os.path.join(base, packet)):
        registry[packet] = (SPEC_POLICY_RESTYLE_LABEL,)
    if not os.path.isfile(os.path.join(base, SPEC_POLICY_RESTYLE_ACT)):
        return
    for record in (f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md",
                   f"{CRAFT}/INSTALL-RECORD.md"):
        if SPEC_POLICY_RESTYLE_LABEL not in registry.get(record, ()):
            registry[record] = registry.get(record, ()) + (
                SPEC_POLICY_RESTYLE_LABEL,)
    registry[SPEC_POLICY_RESTYLE_ACT] = (
        SPEC_POLICY_RESTYLE_LABEL, CC_IMPACT_LABEL, CC_SPEC_LABEL)
    registry[SPEC_POLICY_RESTYLE_SUBJECT] = (CC_IMPACT_LABEL, CC_SPEC_LABEL)
    transaction_row = (
        r"^\| 5 \| `confirm-craft-amendment` \| in-force policy "
        r"`SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE\.md` "
        r"\(CC-SPEC-1\.\.11\) \| `" + CC_SPEC_TRANSACTION_DIGEST + r"` \|")
    superseded = {
        f"{CANDIDATES}/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md":
            (CC_IMPACT_LABEL, CC_IMPACT_ACT_7_DIGEST,
             r"^\| 7 \| `" + re.escape(CC_IMPACT_LABEL) + r"@"
             + CC_IMPACT_ACT_7_DIGEST + r"` \|"),
        f"{GENERAL_BOOTSTRAP_DIR}/ACT-SEMANTICS.md":
            (CC_SPEC_LABEL, CC_SPEC_TRANSACTION_DIGEST, transaction_row),
        GENERAL_BOOTSTRAP_ACT:
            (CC_SPEC_LABEL, CC_SPEC_TRANSACTION_DIGEST, transaction_row),
        GENERAL_BOOTSTRAP_SUBJECT:
            (CC_SPEC_LABEL, CC_SPEC_TRANSACTION_DIGEST,
             r"^" + CC_SPEC_TRANSACTION_DIGEST + r"  "
             + re.escape(CC_SPEC_SUBJECT) + r"$"),
    }
    for rel, (label, performed_digest, pattern) in superseded.items():
        current = registry.get(rel)
        if current is not None:
            remaining = tuple(lab for lab in current if lab != label)
            if remaining:
                registry[rel] = remaining
            else:
                del registry[rel]
        history.setdefault(rel, {})[label] = (
            (performed_digest, re.compile(pattern, re.M)),)


_activate_spec_policy_restyle_copy_registries()


def _activate_poc_readability_copy_registry(registry=None, root=None):
    """Register the POC successor's packet, and its records once performed."""
    registry = ACT_DIGEST_COPY_FILES if registry is None else registry
    base = ROOT if root is None else root
    packet = f"{POC_READABILITY_DIR}/OWNER-DECISION-PACKET.md"
    if os.path.isfile(os.path.join(base, packet)):
        registry[packet] = (POC_READABILITY_LABEL,)
    if not os.path.isfile(os.path.join(base, POC_READABILITY_ACT)):
        return
    record = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    if POC_READABILITY_LABEL not in registry.get(record, ()):
        registry[record] = registry.get(record, ()) + (POC_READABILITY_LABEL,)
    registry[POC_READABILITY_ACT] = (POC_READABILITY_LABEL,)


_activate_poc_readability_copy_registry()


def _activate_readability_successor_copies(registry=None, root=None):
    """Register each generic successor's packet, and its records once performed."""
    registry = ACT_DIGEST_COPY_FILES if registry is None else registry
    base = ROOT if root is None else root
    record = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
    for package, label, act in _readability_successors(base):
        packet = f"{package}/OWNER-DECISION-PACKET.md"
        if os.path.isfile(os.path.join(base, packet)):
            registry[packet] = (label,)
        if os.path.isfile(os.path.join(base, act)):
            if label not in registry.get(record, ()):
                registry[record] = registry.get(record, ()) + (label,)
            registry[act] = (label,)


_activate_readability_successor_copies()


#: bd `syzygy-yu4a`: superseded arguments that registered files still carry
#: on purpose — the performed record's own phrase lines, a later act's
#: "Its argument … was the subject's exact digest" sentence, an install
#: record's checksum row, the battery's recorder `--check`. Each is one of
#: the label's performed digests but not the file's current argument, so
#: until it was registered here the near-miss pass had nothing to measure a
#: corrupted copy against. Rows are (label, digest, text before, text
#: after); the pin is that exact line text, anchored at line start. A pin
#: proves the quoting line is still present in that file; it does not scope
#: the digest to that line. The near-miss pass allows the digest wherever it
#: sits in the file, so a second copy, identical or not, passes. Refusing
#: off-pin copies would fail 16 of the 46 history and retired pins, whose
#: digests also occur off the pinned line, so it is not done here.
SUPERSEDED_ACT_ARGUMENT_COPIES = {
    f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md": (
        (CC_SPEC_LABEL, CC_SPEC_ACT_6_DIGEST, f"{CC_SPEC_LABEL}@", "$"),
        (CC_IMPACT_LABEL, CC_IMPACT_ACT_7_DIGEST, f"{CC_IMPACT_LABEL}@", "$"),
        (CC_SPEC_LABEL, CC_SPEC_TRANSACTION_DIGEST, f"{CC_SPEC_LABEL}@", "$"),
        (CC_SPEC_LABEL, CC_SPEC_TRANSACTION_DIGEST,
         "| 5 | `confirm-craft-amendment` | in-force policy "
         "`SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` (CC-SPEC-1..11) | `",
         "` |"),
        (PWB_EFFECT_ACTS[1][0],
         "513a3be75bbd417a06d475c46bb423393ac59013e307157357083f29781a2a61",
         f"{PWB_EFFECT_ACTS[1][0]}: ", "$"),
        (PWB_EFFECT_ACTS[2][0],
         "d71eadb612cf657983d96ad44415b832054dc37e51ea674e569d9b8f655d05d7",
         f"{PWB_EFFECT_ACTS[2][0]}: ", "$"),
        (PWB_EFFECT_ACTS[1][0],
         "d148f0360841cfc30cdc9ecedbffe722e31044e4bb048cd33f83cc193ee88e75",
         f"{PWB_EFFECT_ACTS[1][0]}: ", "$"),
        (PWB_EFFECT_ACTS[2][0],
         "0765f4d534afad9003463790113fd433d250550091df783c1ff372d227643e4f",
         f"{PWB_EFFECT_ACTS[2][0]}: ", "$"),
        (PWB_EFFECT_ACTS[2][0],
         "2356b9ed3235b3dff79caeb352803a30c446b7365a2a7ea74df302b9fa51386a",
         f"{PWB_EFFECT_ACTS[2][0]}: ", "$"),
    ),
    f"{DECISIONS}/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md": (
        (PWB_EFFECT_ACTS[2][0],
         "2356b9ed3235b3dff79caeb352803a30c446b7365a2a7ea74df302b9fa51386a",
         "Its argument `", "` was the subject's exact digest until"),
    ),
    f"{DECISIONS}/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md": (
        (PWB_EFFECT_ACTS[2][0],
         "0765f4d534afad9003463790113fd433d250550091df783c1ff372d227643e4f",
         "Its argument `", "` was the subject's exact digest until"),
    ),
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md": (
        (PWB_EFFECT_ACTS[1][0],
         "d148f0360841cfc30cdc9ecedbffe722e31044e4bb048cd33f83cc193ee88e75",
         "Its argument `", "` was the subject's exact digest until"),
    ),
    f"{CRAFT}/INSTALL-RECORD.md": (
        (CC_SPEC_LABEL, CC_SPEC_ACT_6_DIGEST, f"{CC_SPEC_LABEL}@", "$"),
        (CC_IMPACT_LABEL, CC_IMPACT_ACT_7_DIGEST, f"{CC_IMPACT_LABEL}@", "$"),
        (CC_SPEC_LABEL, CC_SPEC_TRANSACTION_DIGEST, "",
         f"  {CC_SPEC_SUBJECT}$"),
    ),
    "PROJECT-STATUS.md": (
        (PWB_EFFECT_ACTS[2][0],
         "2356b9ed3235b3dff79caeb352803a30c446b7365a2a7ea74df302b9fa51386a",
         "python3 scripts/record_pwb_registry_currency_amendment.py --check ",
         " --date 2026-09-30"),
    ),
}

# Scope-A P-114 takes no command-line argument. Only after its record exists
# is the retained act-B battery argument a historical copy.
if os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md")):
    SUPERSEDED_ACT_ARGUMENT_COPIES["PROJECT-STATUS.md"] += (
        (PWB_EFFECT_ACTS[2][0],
         'ad9cd6769bffbb1a3ef94625c73226dec133fb7c9f1e0bc40186b09b15e165fa',
         "python3 scripts/record_pwb_behavior_contract_repin_acts.py --check registry ",
         " --date 2026-10-02"),
    )

#: bd `syzygy-yu4a`: an argument that was offered, never performed, and then
#: retired when its subject moved. Act 2 still awaits the owner; the install
#: record's 2026-08-06 block offered it at the digest below, and the
#: 2026-09-28 restyle moved the subject. It cannot be performed history
#: (that registration fails on a never-performed digest), so it is its own
#: class: pinned like the rows above, and refused if it is ever performed or
#: becomes the current argument, since either would put it in another class.
RETIRED_OFFER_ARGUMENT_COPIES = {
    f"{CRAFT}/INSTALL-RECORD.md": (
        ("CONFIRM CRAFT AMENDMENT: CC-TEST-2",
         "7a716090bc827121b3f70c4f7e252fc5680cd8a56d7b4121b70f3673489690a0",
         "", "  testing-and-verification.md$"),
        ("CONFIRM CRAFT AMENDMENT: CC-TEST-2",
         "7a716090bc827121b3f70c4f7e252fc5680cd8a56d7b4121b70f3673489690a0",
         "`CC-TEST-2@", "`$"),
    ),
}
ACT_RETIRED_OFFER_COPY_FILES = {}


def _activate_pinned_argument_copies(superseded=None, retired=None,
                                     history=None, retired_history=None):
    """Add the pinned rows above to the history registries.

    Appends to any binding an earlier activation made for the same file and
    label, so a later act's own historical pin is never replaced.
    """
    superseded = (SUPERSEDED_ACT_ARGUMENT_COPIES if superseded is None
                  else superseded)
    retired = RETIRED_OFFER_ARGUMENT_COPIES if retired is None else retired
    history = ACT_HISTORICAL_DIGEST_COPY_FILES if history is None else history
    retired_history = (ACT_RETIRED_OFFER_COPY_FILES if retired_history is None
                       else retired_history)
    for rows, target in ((superseded, history), (retired, retired_history)):
        for rel, pins in rows.items():
            for label, digest, before, after in pins:
                end = "$" if after.endswith("$") else ""
                pattern = re.compile(
                    "^" + re.escape(before) + digest
                    + re.escape(after[:len(after) - len(end)]) + end, re.M)
                labels = target.setdefault(rel, {})
                labels[label] = labels.get(label, ()) + ((digest, pattern),)


_activate_pinned_argument_copies()


#: The bare-copy *shape* every PWB owner packet and act record uses for
#: convenience, ahead of the phrase line CG-7d reads: a heading/label line
#: — optionally qualified ("Behavior manifest", "Effect manifest",
#: "Three-artifact manifest", "Eleven-artifact manifest", "Policy",
#: "Registry", "Exact offer", "Exact digest (") — ending in `SHA-256` (an
#: optional closing paren, then `:`), then the 64-hex digest: same line,
#: wrapped to the next, or after blank lines, and optionally wrapped in
#: backticks and/or `**bold**`. A stale copy in this shape passed CG-7d (no
#: phrase on the line) *and*, before bd-eau, CG-7e (predicate 1 only tested
#: "is the current digest present somewhere in the body", so a correct copy
#: of the phrase line elsewhere in the same file masked the corrupted bare
#: one). The first fix matched only the literal, unqualified "Manifest
#: SHA-256:" spelling; an independent review of that fix (R-CG7E-BARE-
#: DIGEST) found the identical corruption-masking bug live in 15 further
#: bare copies under every qualified spelling above, plus 5 more this
#: review then found under "Exact digest (SHA-256):" in the performed PWB
#: effect-act records. Its confirmation review (R-CG7E-BARE-DIGEST-
#: CONFIRMATION) found 5 more the uppercase, colon-terminated form missed:
#: a lowercase `sha256:` (one as a list item, one after a backticked
#: filename) and three bare `SHA-256 <digest>` lines with no colon. So the
#: label may follow a list/quote marker, may be backticked, may be empty,
#: `sha256`/`SHA-256` in any case, colon optional — 29 bare copies in 22 of
#: the 39 registered files over 12 spellings, 4 of them literal "Manifest
#: SHA-256:". Not headings, so deliberately unmatched: a digest cited inline
#: mid-sentence ("… (SHA-256 `<digest>`)", "verdict `CONFIRM`, sha256
#: `<digest>`"), which names a review raw or container file, not an act
#: argument (3 such in `pwb-effect-acts/OWNER-SIGNOFF-PACKET.md`). A third
#: review (R-CG7E-BARE-DIGEST-CONFIRMATION-2) found 12 copies of act
#: arguments with no sha256 label at all — `Act identity:` lines, table
#: cells, a checksum row, one owner phrase — masked by a correct copy
#: elsewhere in the file. Shape-matching cannot reach them; the
#: shape-independent near-miss pass (`STANDALONE_DIGEST`, bd `syzygy-wh1`)
#: does, for one-character corruption. The label text is captured
#: (group 1) so each match is validated against *that file's own* declared
#: digests (`allowed_bare`), never the whole corpus's recognized set — a
#: different file's correct digest must not excuse this one, and this
#: constant still cannot regress into RD-6's 47-false-finding hole: it
#: requires the line to end in `SHA-256` immediately before the colon, so
#: prose ("the SHA-256 argument binds…", "SHA-256 of the artifact itself")
#: and table cells ("| SHA-256 |", "SHA-256 of `path`,") never match.
BARE_DIGEST_HEADING = re.compile(
    r"^[ \t]*(?:[-*+>][ \t]+)?\**"
    r"((?:[A-Za-z`][A-Za-z0-9 /()'.`_-]{0,60}?)?)(?i:sha-?256)\)?:?\**[ \t]*"
    r"(?:\n[ \t]*)*[`*]{0,3}([0-9a-f]{64})[`*]{0,3}",
    re.M)

#: Two of the 24 bare headings above name a *container* manifest file's own
#: digest — an artifact that bundles several act subjects together — never
#: a single act's argument, so they can never appear in `allowed_bare`
#: (built only from the labels this file itself declares). Each is a
#: narrow, explicit, *checked* exemption: the live SHA-256 of the exact
#: file the heading names must equal the heading's own digest, so a
#: corrupted heading (or a corrupted manifest file) still fails. Never a
#: broad skip — membership here is not itself sufficient, only necessary.
BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS = {
    (f"{PWB_EFFECT_ACTS_DIR}/CANDIDATE-REPORT.md", "three-artifact manifest"):
        f"{PWB_EFFECT_ACTS_DIR}/PWB-EFFECT-ACTS-MANIFEST.txt",
    (f"{PWB_TRUTH_AMENDMENT_DIR}/OWNER-DECISION-PACKET.md", "effect manifest"):
        f"{PWB_TRUTH_AMENDMENT_DIR}/PWB-EFFECT-AMENDMENT-MANIFEST.txt",
    (f"{DECISIONS}/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md",
     "effect manifest"):
        f"{PWB_REGISTRY_CURRENCY_DIR}/PWB-EFFECT-AMENDMENT-MANIFEST.txt",
    (f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md",
     "effect manifest"): PWB_BEHAVIOR_REPIN_MANIFEST,
    (f"{DECISIONS}/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md",
     "effect manifest"): PWB_BEHAVIOR_REPIN_MANIFEST,
    (f"{DECISIONS}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md", "manifest"): PUBLIC_ADMISSION_MANIFEST,
    (f"{DECISIONS}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md", "manifest file"): RFC5_CLASS_SUBJECT,
    (PWB_SCOPE_ACT, "manifest"): PWB_SCOPE_MANIFEST,
    (PUBLIC_SOURCE_SCOPE_V2_ACT, "manifest"): PUBLIC_SOURCE_SCOPE_V2_MANIFEST,
    (PUBLIC_SOURCE_SCOPE_V3_ACT, "manifest"): PUBLIC_SOURCE_SCOPE_V3_MANIFEST,
    (f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md", "manifest"): f"{CANDIDATES}/public-source-screening-scope-v4/PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt",
    (f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md", "manifest"): f"{CANDIDATES}/public-source-screening-scope-v5/PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt",
}


#: bd `syzygy-wh1`: every standalone 64-hex token in a registered act-copy
#: file, whatever surrounds it — an `Act identity:` URN, a table cell, a
#: `sha256sum` row, an owner phrase. Bounded by non-hex on both sides, so a
#: 63- or 65-character run is not a token. Lowercase only, the corpus's one
#: digest spelling.
STANDALONE_DIGEST = re.compile(r"(?<![0-9A-Fa-f])[0-9a-f]{64}(?![0-9A-Fa-f])")


def _one_character_apart(token, digest):
    """True when two 64-hex strings differ in exactly one position."""
    if len(token) != 64 or len(digest) != 64:
        return False
    return sum(a != b for a, b in zip(token, digest)) == 1

def cg7e_act_digest_copies(paths, res):
    """Every copy of an act argument is examined, wherever it sits.

    Two predicates, and the second is what keeps the first honest:

    1. **A registered current file carries that act's current argument; a
       registered historical file carries an actually performed argument.**
       The two populations are explicit because rewriting an append-only
       offering is as wrong as leaving a current owner packet stale.
    2. **A file carrying a recognized current or performed digest is
       registered.** An unregistered copy is unchecked from the moment it
       goes stale, which is exactly how the population escaped CG-7d.

    **Why not the simpler rule.** Review RD-6 (H-1) proposed treating every
    64-hex token as an act-argument copy. Tried: 47 findings, none of them
    defects — the corpus legitimately quotes digests of artifacts that are not
    act subjects (what D3 would amend, a superseded manifest a round record
    preserves, a per-file craft digest list). A check that cannot tell those
    from a stale act argument would have to be silenced to be usable, and a
    silenced check is the thing this battery exists to prevent.

    H-1's own mutation is what this closes: falsifying all four act arguments
    in the owner-facing offering left the battery at `0 findings, exit 0`.
    Under predicate 1 it removes four current digests from a file that names
    all four acts, and fails four times.
    """
    current, phrases = {}, []
    for label, rel, _pat in ACT_SUBJECTS:
        full = os.path.join(ROOT, rel)
        if not os.path.exists(full):
            continue
        d = sha256_file(full)
        current.setdefault(d, set()).add(label)
        phrases.append((label, rel, d))
    performed = _performed_act_digests()
    recognized = {d: set(labels) for d, labels in current.items()}
    for label, digests in performed.items():
        for digest in digests:
            recognized.setdefault(digest, set()).add(label)
    findings, examined, registered = [], 0, []
    versioned_exempt = _versioned_exempt_files()
    for rel in paths:
        if not rel.endswith((".md", ".txt")):
            continue
        if _act_quote_exempt(rel):
            continue
        if rel == MANIFEST:
            continue
        body = read(rel)
        if not body:
            continue
        if rel in versioned_exempt:
            continue
        current_declared = ACT_DIGEST_COPY_FILES.get(rel, ())
        historical_declared = ACT_HISTORICAL_DIGEST_COPY_FILES.get(rel, {})
        retired_declared = ACT_RETIRED_OFFER_COPY_FILES.get(rel, {})
        # Unregistered banner-marked records remain CG-15b's population.
        # Explicit historical registrations are checked here despite their
        # banner: the registration's purpose is to pin their exact act-time
        # digest without pretending they are current offers.
        if (not current_declared and not historical_declared
                and not retired_declared
                and re.search(r"^>?\s*[#*\s]*(SUPERSEDED|Superseded|Historical|"
                              r"RETIRED|Retired)\b",
                              "\n".join(body.splitlines()[:12]), re.M)):
            continue
        held = {lab for digest, labels in recognized.items() if digest in body
                for lab in labels}
        if current_declared or historical_declared or retired_declared:
            examined += 1
            by_label = {lab: d for lab, _sub, d in phrases}
            missing_current = [lab for lab in current_declared
                               if by_label.get(lab)
                               and by_label[lab] not in body]
            for lab in missing_current:
                findings.append(
                    f"{rel} — declared to carry act `{lab}` and does not "
                    f"contain its current argument `{by_label[lab][:12]}…`. "
                    f"The copy in this file is stale, and this file is one "
                    f"the owner is sent to")

            # Predicate 1 above only asks "is the current digest present
            # *somewhere* in the file" — true even when the file's own bare
            # heading copy (`Manifest SHA-256:`, `Policy SHA-256:`, `Exact
            # digest (SHA-256):`, …) has gone stale, provided the phrase
            # line elsewhere still quotes the real one. Check every such
            # bare copy against exactly this file's declared digests (never
            # the whole corpus's recognized set — a different file's correct
            # digest must not excuse this one).
            allowed_bare = {by_label[lab] for lab in current_declared
                           if by_label.get(lab)}
            for declared_bindings in (historical_declared, retired_declared):
                for lab, bindings in declared_bindings.items():
                    allowed_bare.update(digest for digest, _pattern in bindings)
            for m in BARE_DIGEST_HEADING.finditer(body):
                heading_raw, bare = m.group(1), m.group(2)
                heading = heading_raw.strip().rstrip("(").strip().lower()
                shown = re.sub(r"[\s`*]+$", "", body[m.start():m.start(2)]
                               ).strip(" \t*-+>")
                if bare in allowed_bare:
                    continue
                line_no = body[:m.start()].count("\n") + 1
                exempt_target = BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS.get(
                    (rel, heading))
                if exempt_target is not None:
                    exempt_full = os.path.join(ROOT, exempt_target)
                    if (os.path.isfile(exempt_full)
                            and sha256_file(exempt_full) == bare):
                        continue
                    findings.append(
                        f"{rel}:{line_no} — bare `{shown}` copy `{bare[:12]}…` is registered as "
                        f"the container digest of `{exempt_target}`, but "
                        f"that file's live SHA-256 does not match. This is "
                        f"a checked exemption, not a skip: either this "
                        f"heading or the named manifest file has drifted")
                    continue
                findings.append(
                    f"{rel}:{line_no} — bare `{shown}` copy `{bare[:12]}…` matches none of this "
                    f"file's declared argument(s) "
                    f"{sorted(current_declared) or sorted(historical_declared)}. "
                    f"A correct copy of the phrase line elsewhere in the "
                    f"file does not make this bare copy current — it is "
                    f"stale or corrupted")

            # bd `syzygy-wh1`: the unlabeled remainder. A standalone token
            # that is not one of this file's allowed arguments, but sits
            # exactly one character from one, is a corrupted copy in any
            # shape, however many correct copies the file also carries.
            # Bare headings were judged above and are not judged twice.
            # Residual, by design: a token two or more characters off, or
            # swapped whole for another allowed digest, is not caught here.
            allowed_labels = {}
            for lab in current_declared:
                if by_label.get(lab):
                    allowed_labels.setdefault(by_label[lab], set()).add(lab)
            for declared_bindings in (historical_declared, retired_declared):
                for lab, bindings in declared_bindings.items():
                    for digest, _pattern in bindings:
                        allowed_labels.setdefault(digest, set()).add(lab)
            judged = {m.start(2) for m in BARE_DIGEST_HEADING.finditer(body)}
            for m in STANDALONE_DIGEST.finditer(body):
                token = m.group(0)
                if token in allowed_labels or m.start() in judged:
                    continue
                near = sorted({lab for digest, labels in allowed_labels.items()
                               if _one_character_apart(token, digest)
                               for lab in labels})
                if not near:
                    continue
                line_no = body[:m.start()].count("\n") + 1
                findings.append(
                    f"{rel}:{line_no} — unlabeled digest `{token[:12]}…` is "
                    f"one character from this file's declared argument for "
                    f"{near}. A correct copy elsewhere in the file does not "
                    f"make this one current — it is stale or corrupted")

            missing_historical = []
            for lab, bindings in historical_declared.items():
                exact_digests = tuple(digest for digest, _pattern in bindings)
                missing_quotes = []
                performed_for_label = performed.get(lab, ())
                unperformed_bindings = [
                    digest for digest in exact_digests
                    if digest not in performed_for_label
                ]
                if unperformed_bindings:
                    missing_historical.append(lab)
                    findings.append(
                        f"{rel} — historical registration for `{lab}` names "
                        f"digest(s) never performed in {PERFORMED_ACT_RECORD}: "
                        f"{[d[:12] + '…' for d in unperformed_bindings]}")
                else:
                    missing_quotes = [
                        digest for digest, pattern in bindings
                        if not pattern.search(body)
                    ]
                if not unperformed_bindings and missing_quotes:
                    missing_historical.append(lab)
                    findings.append(
                        f"{rel} — historical copy for `{lab}` does not contain "
                        f"its exact act-time quotation line(s) "
                        f"{[d[:12] + '…' for d in missing_quotes]}")

            # bd `syzygy-yu4a`: a retired offer is pinned only while it stays
            # retired. Performed, it belongs in the history registry; current,
            # in the current one. Its labels never join `declared`: it is not
            # a recognized digest, so it cannot excuse one.
            for lab, bindings in retired_declared.items():
                for digest, pattern in bindings:
                    if digest in performed.get(lab, ()):
                        findings.append(
                            f"{rel} — retired-offer registration for `{lab}` "
                            f"names `{digest[:12]}…`, which "
                            f"{PERFORMED_ACT_RECORD} records as performed; "
                            f"register it as performed history instead")
                    elif digest == by_label.get(lab):
                        findings.append(
                            f"{rel} — retired-offer registration for `{lab}` "
                            f"names `{digest[:12]}…`, which is that act's "
                            f"current argument; register it as current")
                    elif not pattern.search(body):
                        findings.append(
                            f"{rel} — retired offer for `{lab}` does not "
                            f"contain its exact pinned line for "
                            f"`{digest[:12]}…`")

            declared = set(current_declared) | set(historical_declared)
            undeclared = sorted(held - declared)
            if undeclared:
                findings.append(
                    f"{rel} — carries recognized act argument(s) for "
                    f"{undeclared} but does not declare those copies in the "
                    f"current or performed-history registry")
            registered.append(
                f"{rel} — declares {len(current_declared)} current, "
                f"{len(historical_declared)} performed-history and "
                f"{len(retired_declared)} retired-offer act(s); "
                f"{len(current_declared) - len(missing_current)} current, "
                f"{len(historical_declared) - len(missing_historical)} "
                f"historical valid")
        elif held:
            examined += 1
            findings.append(
                f"{rel} — carries a recognized current or performed argument "
                f"for {sorted(held)} and is not in either act-copy registry; "
                f"an unregistered copy goes unchecked the moment it goes "
                f"stale")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-7e  act-argument copies enumerated and current", examined,
            len(findings), "file",
            note=None if examined else "no act-argument copies found",
            details=findings + [f"[registered] {r}" for r in registered])


def cg7d_quoted_elsewhere(paths, res, act_subjects=None,
                          subject_digests=None, corpus=None,
                          performed_digests=None):
    """An act phrase quotes current bytes or an actually performed digest.

    A digest is owned by the artifact it names. Quoting one elsewhere is
    convenience, and convenience goes stale silently — which is exactly how
    all four act arguments in the acceptance record came to offer packages
    that no longer existed. Once a digest has actually been performed it also
    becomes immutable act-time evidence: a later amendment must not rewrite
    that history. This check therefore rejects every third state — a digest
    that is neither current nor present in the append-only performed record.
    """
    #: A digest that its own line calls retired/stale/superseded is history,
    #: not an offer. This is the one exemption granted per-line rather than
    #: per-file, so a record can keep what it used to offer without the
    #: keeping being read as an offer.
    retired = re.compile(r"\b(retired|stale|superseded|pre-amendment|"
                         r"historical)\b", re.I)
    #: The marker must sit in the 60 characters immediately *before* the
    #: quotation. A marker later in the line does not exempt it — the
    #: acceptance record's own rows say "the rev9 argument is stale" after
    #: offering the current one, and those offers must stay checked.
    LOOKBEHIND = 60
    act_subjects = tuple(ACT_SUBJECTS if act_subjects is None
                         else act_subjects)
    subjects = {}
    if subject_digests is None:
        for label, rel, pat in act_subjects:
            full = os.path.join(ROOT, rel)
            subjects[label] = (sha256_file(full)
                               if os.path.exists(full) else None)
    else:
        subjects = dict(subject_digests)
    performed = (_performed_act_digests(act_subjects, record=None)
                 if performed_digests is None
                 else {label: tuple(values)
                       for label, values in performed_digests.items()})
    findings, examined = [], 0
    counts = {label: 0 for label, _rel, _pat in act_subjects}
    subject_findings = {label: 0 for label, _rel, _pat in act_subjects}
    source = (((rel, read(rel)) for rel in paths)
              if corpus is None else corpus)
    for rel, body in source:
        if _act_quote_exempt(rel):
            continue
        if not rel.endswith(".md"):
            continue
        if not body:
            continue
        for label, subj_rel, pat in act_subjects:
            for line_no, line in enumerate(body.splitlines(), 1):
                for m in pat.finditer(line):
                    arg = m.group(1)
                    if retired.search(line[max(0, m.start() - LOOKBEHIND):
                                           m.start()]):
                        continue
                    examined += 1
                    counts[label] += 1
                    current = subjects.get(label)
                    if current is None:
                        subject_findings[label] += 1
                        findings.append(
                            f"{rel}:{line_no} — quotes `{label}` but its "
                            f"subject {subj_rel} does not exist")
                    elif arg != current and arg not in performed.get(label, ()):
                        subject_findings[label] += 1
                        findings.append(
                            f"{rel}:{line_no} — quotes `{label}: {arg[:12]}…` "
                            f"but {subj_rel} hashes to {current[:12]}… and "
                            f"{PERFORMED_ACT_RECORD} records no performance "
                            f"of that argument — this copy is stale")
    zero_subjects = [label for label, count in counts.items() if count == 0]
    subject_details = [
        f"[subject] {label} — {counts[label]} quotation(s), "
        f"{subject_findings[label]} finding(s), "
        f"{len(performed.get(label, ()))} performed digest(s)"
        for label in counts
    ]
    if findings:
        severity = "FAIL"
    elif zero_subjects or not examined:
        severity = "WARN"
    else:
        severity = "OK"
    note = (f"{len(counts) - len(zero_subjects)} of {len(counts)} "
            f"digest-bearing subject(s) have quotations"
            + (f"; zero: {', '.join(zero_subjects)}"
               if zero_subjects else ""))
    if not examined:
        note += "; no quotations examined"
    res.add(severity,
            "CG-7d  act digests quoted anywhere are current or performed",
            examined, len(findings), "quotation",
            note=note, details=findings + subject_details)


#: A contract successor link's recorded act instant: a UTC second, the form
#: every dedicated act recorder writes.
ACT_INSTANT_LINE = re.compile(
    r"Act instant: ([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)")
#: A marked aggregate section's opening or closing comment, the form every
#: dedicated act recorder's `block()` writes (`<!-- MARKER:BEGIN -->`).
ACT_SECTION_MARKER = re.compile(r"<!--\s*[^>]*:(BEGIN|END)\s*-->")
#: An owner ceremony line: an upper-case act label, a colon, then an argument
#: carrying a sha256 (bare, or qualified as in `CC-SPEC@<sha256>`). Only the
#: label is compared; the shape is what makes a line another act's phrase.
ACT_CEREMONY_LINE = re.compile(
    r"([A-Z][A-Z0-9 ,()/'&.-]*[A-Z0-9)]): \S*[0-9a-f]{64}\b.*")


def _contract_link_section_problem(label, aggregate_lines, instant_index,
                                   position):
    """Why the link's phrase at `position` is not in its instant's section.

    The instant at `instant_index` belongs to the link only when both sit in
    one section: no section marker (`<!-- …:BEGIN/END -->`) and no other
    act's ceremony line between them, and no other act's ceremony line after
    the phrase before its section closes (the next marker, the next
    `Act instant:` line, or the end of the record). Otherwise a phrase
    spliced under an unrelated act's instant would borrow that act's time.
    Returns `None` when the section is the link's own.
    """
    def other_ceremony(line):
        m = ACT_CEREMONY_LINE.fullmatch(line.strip())
        return m is not None and m.group(1) != label

    for index in range(instant_index + 1, position):
        line = aggregate_lines[index]
        if ACT_SECTION_MARKER.search(line):
            return (f"aggregate section marker {line.strip()!r} at line "
                    f"{index + 1} lies between the act instant and the act "
                    f"phrase")
        if other_ceremony(line):
            return (f"another act's ceremony line at aggregate line "
                    f"{index + 1} lies between the act instant and the act "
                    f"phrase")
    for index in range(position + 1, len(aggregate_lines)):
        line = aggregate_lines[index]
        if (ACT_SECTION_MARKER.search(line)
                or line.startswith("Act instant:")):
            break
        if other_ceremony(line):
            return (f"another act's ceremony line at aggregate line "
                    f"{index + 1} shares the act phrase's section")
    return None


def _contract_link_instant(dedicated, aggregate_lines, position, label):
    """`(instant, problem)` for one contract successor link's act instant.

    The dedicated record must carry exactly one full-line
    `Act instant: YYYY-MM-DDTHH:MM:SSZ` naming a real UTC second, and the
    aggregate's nearest `Act instant:` line above the link's first label line
    must repeat it: the aggregate section is the dedicated record's copy, so
    the two agree or the act is unordered. That instant must lie in the
    link's own section (`_contract_link_section_problem`): a section marker
    or another act's ceremony line between them, or another act's ceremony
    line after the phrase in the same section, fails closed. Any other shape
    yields `(None, problem)` — a missing or ambiguous instant never orders an
    act. Returns `(None, None)` when the link carries no records at all.
    """
    lines = [line for line in dedicated.splitlines()
             if line.startswith("Act instant:")]
    if not lines and position is None:
        return None, None
    if len(lines) != 1:
        return None, (f"dedicated record carries {len(lines)} `Act instant:` "
                      f"lines, expected exactly one")
    m = ACT_INSTANT_LINE.fullmatch(lines[0])
    if not m:
        return None, f"malformed act instant line {lines[0]!r}"
    try:
        datetime.strptime(m.group(1), "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return None, f"act instant {m.group(1)} is not a real UTC second"
    above = [index for index, line in enumerate(aggregate_lines[:position or 0])
             if line.startswith("Act instant:")]
    if position is None or not above:
        return None, ("aggregate section carries no `Act instant:` line above "
                      "its act phrase")
    nearest = aggregate_lines[above[-1]]
    if nearest != lines[0]:
        return None, (f"aggregate act instant {nearest!r} differs from the "
                      f"dedicated record's {lines[0]!r}")
    section_problem = _contract_link_section_problem(
        label, aggregate_lines, above[-1], position)
    if section_problem:
        return None, section_problem
    return m.group(1), None


def cg7h_general_bootstrap_act(res, act_record=None, dedicated_record=None,
                               manifest_body=None, transaction_digest=None,
                               policy_digest=None, contract_manifest_body=None,
                               pwb_manifest_body=None, current_digests=None,
                               successor_act_record=None,
                               successor_dedicated_record=None,
                               successor_manifest_body=None,
                               successor_manifest_digest=None,
                               truth_dedicated_record=None,
                               truth_manifest_body=None,
                               truth_manifest_digest=None,
                               versioned_inputs=None,
                               machine_view_dedicated_record=None,
                               machine_view_manifest_body=None,
                               machine_view_manifest_digest=None,
                               render_mode_dedicated_record=None,
                               render_mode_manifest_body=None,
                               render_mode_manifest_digest=None,
                               opening_band_dedicated_record=None,
                               opening_band_manifest_body=None,
                               opening_band_manifest_digest=None,
                               contract_chain_inputs=None,
                               contract_chain=None,
                               spec_policy_inputs=None,
                               impact_digest=None,
                               poc_successor_inputs=None):
    """The performed transaction binds every current and nested subject.

    CG-7d permits old *performed* digests so append-only history remains true.
    That permission needs an inverse current-state predicate: the latest
    performed CC-SPEC digest and the performed transaction digest must match
    today's exact subjects, in both the append-only act record and the
    dedicated act record. The outer manifest's seven subjects, its nested
    30-row contract manifest, its nested five-row PWB manifest, and all 30
    installed/candidate contract pairs are then verified from their declared
    bases. The historical PWB rows continue to match current paths until a
    valid later owner act supersedes them. Only matching aggregate and
    dedicated successor records activate the eleven-row current manifest;
    candidate bytes alone never do. Successors form a chain
    (`PWB_SUCCESSOR_CHAIN`): the latest validly performed link binds current
    bytes, every earlier link is immutable act-time history, and a later
    link recorded without its predecessor is a gap, not a supersession.
    Contract successors form a second, independent chain
    (`CONTRACT_SUCCESSOR_CHAIN`). Each link's manifest binds exactly the
    link's own closed path tuple, in order (no missing, extra or reordered
    row, and every row a bootstrap row); its two records must each carry
    exactly one bare full-line `LABEL: <sha256>` agreeing with the
    manifest's actual digest. Chain order is adoption order: a link whose
    first aggregate record line falls after a later link's, or whose act
    instant (`_contract_link_instant`) is after or equal to a later link's,
    is a finding (performed out of order, or ambiguously ordered), never
    silently shadowed; a link without a single well-formed instant agreeing
    across both records is itself a finding, since the aggregate's position
    alone can be forged by a mid-file insertion. Valid links fold into
    the current-byte expectations in chain order (a later link overrides an
    earlier one per path); the installed and mirror loops then verify
    current bytes against the fold. Every earlier link with records that
    fail validation is a finding against each later performed link; an
    earlier link with no records is an allowed gap. Unsigned candidates
    never replace the original current-byte expectations.
    The specification-policy restyle is a separate successor to CC-SPEC's
    transaction row and to act 7. It is valid only when both records carry
    exactly one bare `LABEL: <sha256>` line agreeing with its two-row
    manifest, one recorder-generated `CC-…@<row>` line per row, one agreeing
    act instant, and both rows equal today's policy bytes. While valid, the
    transaction's CC-SPEC row and the bootstrap act's CC-SPEC record are
    act-time history; otherwise they stay current and today's bytes are
    compared against them. The latest performed CC-IMPACT digest in the
    aggregate must equal today's bytes whether or not the successor exists.
    `spec_policy_inputs`, when given, is `(dedicated record, manifest body,
    manifest digest)`; `impact_digest` replaces CC-IMPACT's current digest.
    A top-level row for a Three-Surface POC path is act-time history only
    while the latest recorded `POC_VERSIONED_SUCCESSORS` entry naming that
    path (record present, its aggregate block exactly once) carries today's
    digest for it; anything else stays a finding. `poc_successor_inputs`,
    when given, maps each package to `(record body, manifest body)`.
    `contract_chain_inputs`, when given, maps each link label to
    `(dedicated record, manifest body, manifest digest)`; an absent label
    reads as no records and no manifest. `contract_chain` replaces the chain
    itself (selftest only).
    Otherwise a correct outer ceremony could be reported over drifted nested
    bytes or an unsigned candidate could impersonate current authority.
    """
    def read_if_present(rel):
        full = os.path.join(ROOT, rel)
        return read(rel) if os.path.exists(full) else ""

    def current_digest(rel):
        normalized = os.path.normpath(rel).replace(os.sep, "/")
        if current_digests is not None:
            return current_digests.get(normalized)
        full = os.path.join(ROOT, normalized)
        return sha256_file(full) if os.path.isfile(full) else None

    def poc_successor_row(rel):
        """(digest, package, version) of the latest recorded POC sign-off
        whose rows name `rel`, or None."""
        latest = None
        for package, version, record_rel, manifest_rel in POC_VERSIONED_SUCCESSORS:
            if poc_successor_inputs is None:
                if package == "three-surface-poc-governedby-reference-amendment":
                    import pathlib
                    import prepare_three_surface_poc_governedby_reference_recording as reference
                    if not reference.is_signed(pathlib.Path(ROOT)):
                        continue
                record_body = read_if_present(record_rel)
                body = read_if_present(manifest_rel)
            else:
                record_body, body = poc_successor_inputs.get(package, ("", ""))
            marker = f"<!-- versioned-signoff:{package}:v{version} -->"
            if not record_body or act_record.count(marker) != 1:
                continue
            for sha, row_path in re.findall(r"^([0-9a-f]{64})  (\S+)$", body, re.M):
                if row_path == rel:
                    latest = (sha, package, version)
        return latest

    def manifest_rows(body, rel, expected_count):
        rows, bad_lines = [], []
        for line_no, line in enumerate(body.splitlines(), 1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            m = DIGEST_ROW.match(stripped)
            if not m:
                bad_lines.append(
                    f"{rel}:{line_no} — non-comment line is not a digest row")
                continue
            rows.append((m.group("sha"), m.group("path").strip(), line_no))
        if bad_lines:
            findings.extend(bad_lines)
        if len(rows) != expected_count:
            findings.append(
                f"{rel} — parsed {len(rows)} digest row(s), expected "
                f"{expected_count}; the performed population is incomplete")
        paths = [path for _sha, path, _line in rows]
        duplicate_paths = sorted({path for path in paths if paths.count(path) > 1})
        if duplicate_paths:
            findings.append(
                f"{rel} — duplicate subject path(s): "
                f"{', '.join(duplicate_paths)}")
        return rows

    def require_exact_paths(rows, rel, expected_paths):
        actual_paths = tuple(path for _sha, path, _line in rows)
        if actual_paths != tuple(expected_paths):
            findings.append(
                f"{rel} — subject path population/order differs from the "
                f"closed {len(expected_paths)}-path contract")

    def repo_subject(path, manifest_rel, line_no, base=""):
        if os.path.isabs(path):
            findings.append(
                f"{manifest_rel}:{line_no} — absolute subject path `{path}`")
            return None
        normalized = os.path.normpath(path).replace(os.sep, "/")
        if normalized == ".." or normalized.startswith("../"):
            findings.append(
                f"{manifest_rel}:{line_no} — subject escapes its declared "
                f"base: `{path}`")
            return None
        return (f"{base}/{normalized}" if base else normalized)

    findings, details = [], []
    if act_record is None:
        act_record = read_if_present(PERFORMED_ACT_RECORD)
    if dedicated_record is None:
        dedicated_record = read_if_present(GENERAL_BOOTSTRAP_ACT)
    if manifest_body is None:
        manifest_body = read_if_present(GENERAL_BOOTSTRAP_SUBJECT)
    if contract_manifest_body is None:
        contract_manifest_body = read_if_present(
            GENERAL_BOOTSTRAP_CONTRACT_MANIFEST)
    if pwb_manifest_body is None:
        pwb_manifest_body = read_if_present(GENERAL_BOOTSTRAP_PWB_MANIFEST)
    if successor_act_record is None:
        successor_act_record = act_record
    if successor_dedicated_record is None:
        successor_dedicated_record = read_if_present(PWB_STATE1_ACT)
    if successor_manifest_body is None:
        successor_manifest_body = read_if_present(PWB_STATE1_SUBJECT)
    if transaction_digest is None:
        transaction_digest = current_digest(GENERAL_BOOTSTRAP_SUBJECT)
    if policy_digest is None:
        policy_digest = current_digest(CC_SPEC_SUBJECT)
    if successor_manifest_digest is None:
        successor_manifest_digest = current_digest(PWB_STATE1_SUBJECT)
    if truth_dedicated_record is None:
        truth_dedicated_record = read_if_present(PWB_TRUTH_AMENDMENT_ACT)
    if truth_manifest_body is None:
        truth_manifest_body = read_if_present(PWB_TRUTH_AMENDMENT_SUBJECT)
    if truth_manifest_digest is None:
        truth_manifest_digest = current_digest(PWB_TRUTH_AMENDMENT_SUBJECT)
    # Version-tagged packages: label -> (dedicated record, manifest body,
    # manifest digest, version-tagged records). A fixture passes explicit
    # empties for the packages its synthetic tree does not perform.
    versioned_inputs = dict(versioned_inputs or {})
    for _key, _stem, _label, _subject, _act, _subjects, _packet in VERSIONED_PWB_PACKAGES:
        versioned_inputs.setdefault(_label, (
            read_if_present(_act), read_if_present(_subject),
            current_digest(_subject), _versioned_signoff_records(_stem)))
    if machine_view_dedicated_record is None:
        machine_view_dedicated_record = read_if_present(PWB_MACHINE_VIEW_ACT)
    if machine_view_manifest_body is None:
        machine_view_manifest_body = read_if_present(PWB_MACHINE_VIEW_SUBJECT)
    if machine_view_manifest_digest is None:
        machine_view_manifest_digest = current_digest(PWB_MACHINE_VIEW_SUBJECT)
    if render_mode_dedicated_record is None:
        render_mode_dedicated_record = read_if_present(PWB_RENDER_MODE_ACT)
    if render_mode_manifest_body is None:
        render_mode_manifest_body = read_if_present(PWB_RENDER_MODE_SUBJECT)
    if render_mode_manifest_digest is None:
        render_mode_manifest_digest = current_digest(PWB_RENDER_MODE_SUBJECT)
    if opening_band_dedicated_record is None:
        opening_band_dedicated_record = read_if_present(PWB_OPENING_BAND_ACT)
    if opening_band_manifest_body is None:
        opening_band_manifest_body = read_if_present(PWB_OPENING_BAND_SUBJECT)
    if opening_band_manifest_digest is None:
        opening_band_manifest_digest = current_digest(PWB_OPENING_BAND_SUBJECT)

    specs = (
        (GENERAL_BOOTSTRAP_LABEL, GENERAL_BOOTSTRAP_SUBJECT,
         re.compile(re.escape(GENERAL_BOOTSTRAP_LABEL)
                    + r"\s*:\s*`?([0-9a-f]{64})")),
        (CC_SPEC_LABEL, CC_SPEC_SUBJECT,
         re.compile(re.escape(CC_SPEC_LABEL)
                    + r"\s*@\s*`?([0-9a-f]{64})")),
    )
    recorded = _performed_act_digests(specs, record=act_record)
    dedicated = _performed_act_digests(specs, record=dedicated_record)

    # The specification-policy restyle successor, judged before the
    # bootstrap's CC-SPEC predicates that it supersedes.
    if spec_policy_inputs is None:
        spec_policy_inputs = (read_if_present(SPEC_POLICY_RESTYLE_ACT),
                              read_if_present(SPEC_POLICY_RESTYLE_SUBJECT),
                              current_digest(SPEC_POLICY_RESTYLE_SUBJECT))
    spec_dedicated, spec_body, spec_digest = spec_policy_inputs
    spec_phrases = [tuple(line for line in text.splitlines()
                          if SPEC_POLICY_RESTYLE_LABEL in line)
                    for text in (act_record, spec_dedicated)]
    spec_attempted = any(spec_phrases) or bool(spec_dedicated)
    spec_valid = False
    spec_examined = 0
    if spec_attempted:
        before_spec = len(findings)
        expected_phrase = f"{SPEC_POLICY_RESTYLE_LABEL}: {spec_digest}"
        for where, lines in zip((PERFORMED_ACT_RECORD, SPEC_POLICY_RESTYLE_ACT),
                                spec_phrases):
            if list(lines) != [expected_phrase]:
                findings.append(
                    f"{where} — expected exactly one bare "
                    f"`{SPEC_POLICY_RESTYLE_LABEL}: <sha256>` line agreeing "
                    f"with {SPEC_POLICY_RESTYLE_SUBJECT} "
                    f"({(spec_digest or 'absent')[:12]}…), found "
                    f"{len(lines)} occurrence(s) of the label")
        if hashlib.sha256(spec_body.encode()).hexdigest() != spec_digest:
            findings.append(f"{SPEC_POLICY_RESTYLE_SUBJECT} — manifest body "
                            f"digest differs from current subject digest")
        spec_rows = manifest_rows(spec_body, SPEC_POLICY_RESTYLE_SUBJECT,
                                  len(SPEC_POLICY_RESTYLE_ROWS))
        require_exact_paths(spec_rows, SPEC_POLICY_RESTYLE_SUBJECT,
                            [path for _label, path in SPEC_POLICY_RESTYLE_ROWS])
        by_path = {path: sha for sha, path, _line in spec_rows}
        for label, path in SPEC_POLICY_RESTYLE_ROWS:
            line = f"{label}@{by_path.get(path)}"
            for where, text in ((PERFORMED_ACT_RECORD, act_record),
                                (SPEC_POLICY_RESTYLE_ACT, spec_dedicated)):
                if text.splitlines().count(line) != 1:
                    findings.append(
                        f"{where} — expected exactly one recorder-generated "
                        f"`{label}@<row>` line naming the manifest row for "
                        f"`{path}`")
            actual = current_digest(path)
            if actual is None or actual != by_path.get(path):
                findings.append(
                    f"{SPEC_POLICY_RESTYLE_SUBJECT} — `{path}` hashes to "
                    f"{(actual or 'absent')[:12]}…, expected "
                    f"{(by_path.get(path) or 'no row')[:12]}…")
        instants = [line for line in spec_dedicated.splitlines()
                    if line.startswith("Act instant:")]
        record_lines = act_record.splitlines()
        phrase_at = next((index for index, line in enumerate(record_lines)
                          if line == expected_phrase), None)
        above = ([line for line in record_lines[:phrase_at]
                  if line.startswith("Act instant:")]
                 if phrase_at is not None else [])
        if (len(instants) != 1 or not ACT_INSTANT_LINE.fullmatch(instants[0])
                or not above or above[-1] != instants[0]):
            findings.append(
                f"{SPEC_POLICY_RESTYLE_ACT} — the dedicated record's single "
                f"`Act instant:` line must be the nearest one above the act "
                f"phrase in {PERFORMED_ACT_RECORD}")
        spec_valid = len(findings) == before_spec
        spec_examined = 4 + 3 * len(SPEC_POLICY_RESTYLE_ROWS) + 1

    def require_latest(where, values, expected, subject):
        if expected is None:
            findings.append(f"{where} — subject `{subject}` is absent")
        elif not values:
            findings.append(
                f"{where} — no performed digest is recorded for `{subject}`")
        elif values[-1] != expected:
            findings.append(
                f"{where} — latest performed digest {values[-1][:12]}… does "
                f"not match current `{subject}` {expected[:12]}…")
        else:
            details.append(
                f"[current] {where} — {subject} {expected[:12]}…")

    require_latest(PERFORMED_ACT_RECORD,
                   recorded.get(GENERAL_BOOTSTRAP_LABEL, ()),
                   transaction_digest, GENERAL_BOOTSTRAP_SUBJECT)
    require_latest(PERFORMED_ACT_RECORD,
                   recorded.get(CC_SPEC_LABEL, ()),
                   policy_digest, CC_SPEC_SUBJECT)
    require_latest(GENERAL_BOOTSTRAP_ACT,
                   dedicated.get(GENERAL_BOOTSTRAP_LABEL, ()),
                   transaction_digest, GENERAL_BOOTSTRAP_SUBJECT)
    transaction_row = re.search(
        r"^([0-9a-f]{64})  " + re.escape(CC_SPEC_SUBJECT) + r"$",
        manifest_body, re.M)
    if spec_valid:
        # The bootstrap act's CC-SPEC record is history: it must still name
        # the transaction's own row, never today's bytes.
        values = dedicated.get(CC_SPEC_LABEL, ())
        row = transaction_row.group(1) if transaction_row else None
        if not values or row is None or values[-1] != row:
            findings.append(
                f"{GENERAL_BOOTSTRAP_ACT} — latest CC-SPEC record "
                f"{(values[-1] if values else 'absent')[:12]}… does not name "
                f"the transaction's CC-SPEC row {(row or 'absent')[:12]}…")
        else:
            details.append(
                f"[historical] {GENERAL_BOOTSTRAP_ACT} — CC-SPEC {row[:12]}… "
                f"superseded by {SPEC_POLICY_RESTYLE_SUBJECT}")
    else:
        require_latest(GENERAL_BOOTSTRAP_ACT,
                       dedicated.get(CC_SPEC_LABEL, ()),
                       policy_digest, CC_SPEC_SUBJECT)
    if impact_digest is None:
        impact_digest = current_digest(CC_IMPACT_SUBJECT)
    impact_specs = ((CC_IMPACT_LABEL, CC_IMPACT_SUBJECT,
                     re.compile(re.escape(CC_IMPACT_LABEL)
                                + r"\s*@\s*`?([0-9a-f]{64})")),)
    require_latest(PERFORMED_ACT_RECORD,
                   _performed_act_digests(impact_specs, record=act_record)
                   .get(CC_IMPACT_LABEL, ()), impact_digest, CC_IMPACT_SUBJECT)

    top_expected, contract_expected, pwb_expected = GENERAL_BOOTSTRAP_POPULATIONS
    top_rows = manifest_rows(
        manifest_body, GENERAL_BOOTSTRAP_SUBJECT, top_expected)
    contract_rows = manifest_rows(
        contract_manifest_body, GENERAL_BOOTSTRAP_CONTRACT_MANIFEST,
        contract_expected)
    pwb_rows = manifest_rows(
        pwb_manifest_body, GENERAL_BOOTSTRAP_PWB_MANIFEST, pwb_expected)
    require_exact_paths(
        pwb_rows, GENERAL_BOOTSTRAP_PWB_MANIFEST,
        GENERAL_BOOTSTRAP_PWB_PATHS)

    chain_inputs = {
        PWB_STATE1_LABEL: (
            successor_dedicated_record, successor_manifest_body,
            successor_manifest_digest),
        PWB_TRUTH_AMENDMENT_LABEL: (
            truth_dedicated_record, truth_manifest_body,
            truth_manifest_digest),
        PWB_OPENING_BAND_LABEL: (
            opening_band_dedicated_record, opening_band_manifest_body,
            opening_band_manifest_digest),
        PWB_RENDER_MODE_LABEL: (
            render_mode_dedicated_record, render_mode_manifest_body,
            render_mode_manifest_digest),
        PWB_MACHINE_VIEW_LABEL: (
            machine_view_dedicated_record, machine_view_manifest_body,
            machine_view_manifest_digest),
    }
    for _label, _inputs in versioned_inputs.items():
        chain_inputs[_label] = _inputs[:3]
    attempted_links = []
    for label, subject, act_rel, subjects in PWB_SUCCESSOR_CHAIN:
        dedicated_record_body, body, manifest_digest = chain_inputs[label]
        link_specs = ((label, subject, re.compile(
            re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")),)
        link_recorded = _performed_act_digests(
            link_specs, record=successor_act_record).get(label, ())
        link_dedicated = _performed_act_digests(
            link_specs, record=dedicated_record_body).get(label, ())
        # A version-tagged sign-off (Scope A) binds the package's current
        # manifest instead of a phrase digest, so a later version may move it.
        versioned = bool(versioned_inputs.get(label, ("", "", None, ()))[3])
        if not (link_recorded or link_dedicated or versioned):
            continue
        findings_before_link = len(findings)
        if attempted_links and not attempted_links[-1][4]:
            findings.append(
                f"{act_rel} — successor act recorded while its predecessor "
                f"`{attempted_links[-1][0]}` is invalid; a chain link cannot "
                f"supersede a broken predecessor")
        elif len(attempted_links) < PWB_SUCCESSOR_CHAIN.index(
                (label, subject, act_rel, subjects)):
            findings.append(
                f"{act_rel} — successor act recorded without its predecessor "
                f"act; the chain has a gap")
        if not versioned:
            require_latest(
                PERFORMED_ACT_RECORD, link_recorded, manifest_digest, subject)
            require_latest(act_rel, link_dedicated, manifest_digest, subject)
        link_rows = manifest_rows(body, subject, len(subjects))
        require_exact_paths(link_rows, subject, subjects)
        link_valid = len(findings) == findings_before_link
        attempted_links.append((label, subject, act_rel, link_rows, link_valid))

    successor_attempted = bool(attempted_links)
    successor_rows = []
    successor_valid = False
    if successor_attempted:
        label, subject, _act_rel, latest_rows, latest_valid = attempted_links[-1]
        findings_before_rows = len(findings)
        for expected, path, line_no in latest_rows:
            rel = repo_subject(path, subject, line_no)
            actual = current_digest(rel) if rel else None
            if actual != expected:
                findings.append(
                    f"{subject}:{line_no} — `{path}` hashes to "
                    f"{(actual or 'absent')[:12]}…, expected "
                    f"{expected[:12]}…")
        successor_valid = (
            latest_valid and len(findings) == findings_before_rows
            and all(valid for _l, _s, _a, _r, valid in attempted_links))
        successor_rows = [row for _l, _s, _a, rows, _v in attempted_links
                          for row in rows]
        for h_label, h_subject, _a, h_rows, _v in attempted_links[:-1]:
            details.append(
                f"[historical] {h_subject} — {len(h_rows)} act-time PWB "
                f"row(s) preserved for `{h_label}`; current bytes are bound "
                f"by {subject}")

    for expected, path, line_no in top_rows:
        rel = repo_subject(path, GENERAL_BOOTSTRAP_SUBJECT, line_no)
        if spec_valid and rel == CC_SPEC_SUBJECT:
            details.append(
                f"[historical] {GENERAL_BOOTSTRAP_SUBJECT}:{line_no} — "
                f"act-time CC-SPEC row superseded by "
                f"{SPEC_POLICY_RESTYLE_SUBJECT}")
            continue
        actual = current_digest(rel) if rel else None
        later = poc_successor_row(rel) if rel else None
        if actual != expected and later is not None and later[0] == actual:
            details.append(
                f"[historical] {GENERAL_BOOTSTRAP_SUBJECT}:{line_no} — act-time "
                f"POC row superseded by the version-tagged sign-off "
                f"{later[1]}-v{later[2]}")
            continue
        if actual != expected:
            findings.append(
                f"{GENERAL_BOOTSTRAP_SUBJECT}:{line_no} — `{path}` hashes to "
                f"{(actual or 'absent')[:12]}…, expected {expected[:12]}…")

    # Each contract successor has one performance, not a history of repeated
    # phrases. Count occurrences directly: _performed_act_digests
    # intentionally deduplicates.
    chain = CONTRACT_SUCCESSOR_CHAIN if contract_chain is None else contract_chain
    bootstrap_contract_paths = {path for _sha, path, _line in contract_rows}
    bootstrap_valid = not findings
    contract_overrides = {}
    contract_bound_by = {}
    contract_links = []
    aggregate_lines = act_record.splitlines()
    # Read every link first: act order is judged across links.
    link_states = []
    for label, subject, act_rel, _activate, link_paths in chain:
        if contract_chain_inputs is None:
            link_dedicated = read_if_present(act_rel)
            link_body = read_if_present(subject)
            link_digest = current_digest(subject)
            if label in ROW_ARGUMENT_LINK_LABELS:
                rows_ = re.findall(r"^([0-9a-f]{64})  \S+$", link_body or "", re.M)
                link_digest = rows_[0] if len(rows_) == 1 else None
        else:
            link_dedicated, link_body, link_digest = contract_chain_inputs.get(
                label, ("", "", None))
        mentions = [
            tuple(line for line in body.splitlines() if label in line)
            for body in (act_record, link_dedicated)
        ]
        # Where the owner's act sits in the append-only aggregate: the first
        # line naming the link's label, or None when the aggregate has none.
        position = next((index for index, line in enumerate(aggregate_lines)
                         if label in line), None)
        instant, instant_problem = _contract_link_instant(
            link_dedicated, aggregate_lines, position, label)
        link_states.append((label, subject, act_rel, link_paths, link_dedicated,
                            link_body, link_digest, mentions, position,
                            instant, instant_problem))
    broken = []
    for index, (label, subject, act_rel, link_paths, link_dedicated, link_body,
                link_digest, mentions, position, instant,
                instant_problem) in enumerate(link_states):
        if not (any(mentions) or link_dedicated):
            continue
        phrase = re.compile(re.escape(label) + r": ([0-9a-f]{64})")
        records = [
            tuple(m.group(1) for line in link_mentions
                  if (m := phrase.fullmatch(line)))
            for link_mentions in mentions
        ]
        before_link = len(findings)
        if not bootstrap_valid:
            findings.append(f"{act_rel} — bootstrap predecessor is invalid")
        if broken:
            findings.append(
                f"{act_rel} — contract successor recorded while earlier chain "
                f"link(s) {', '.join(f'`{b}`' for b in broken)} have records "
                f"present but are invalid; a link cannot supersede a broken "
                f"predecessor")
        performed_before = [
            later[0] for later in link_states[index + 1:]
            if position is not None and later[8] is not None
            and later[8] < position]
        if performed_before:
            findings.append(
                f"{PERFORMED_ACT_RECORD}:{position + 1} — `{label}` is "
                f"recorded after later chain link(s) "
                f"{', '.join(f'`{b}`' for b in performed_before)} were "
                f"performed; chain order is adoption order, so an act "
                f"performed out of order cannot take effect")
        # Aggregate position alone is forgeable by a mid-file insertion, so
        # adoption order is also judged by each link's recorded act instant.
        # A missing, malformed, duplicated or disagreeing instant cannot be
        # ordered and fails closed; an equal instant is an ambiguous order.
        if instant_problem:
            findings.append(f"{act_rel} — `{label}` {instant_problem}; "
                            f"adoption order cannot be established")
        later_timed = [
            (later[0], later[9]) for later in link_states[index + 1:]
            if instant is not None and later[9] is not None]
        performed_later_earlier = [b for b, t in later_timed if t < instant]
        if performed_later_earlier:
            findings.append(
                f"{act_rel} — `{label}` act instant {instant} is after later "
                f"chain link(s) "
                f"{', '.join(f'`{b}`' for b in performed_later_earlier)}; "
                f"chain order is adoption order, so an act performed out of "
                f"order cannot take effect")
        same_instant = [b for b, t in later_timed if t == instant]
        if same_instant:
            findings.append(
                f"{act_rel} — `{label}` act instant {instant} equals later "
                f"chain link(s) {', '.join(f'`{b}`' for b in same_instant)}; "
                f"adoption order is ambiguous")
        for where, values, link_mentions in zip(
                (PERFORMED_ACT_RECORD, act_rel), records, mentions):
            if any(not phrase.fullmatch(line) for line in link_mentions):
                findings.append(
                    f"{where} — malformed contract successor label occurrence "
                    f"for `{label}`; require one complete bare ceremony line")
            if len(values) != 1:
                findings.append(
                    f"{where} — expected exactly one performed contract "
                    f"successor record for `{label}`, found {len(values)}")
            require_latest(where, values, link_digest, subject)
        body_digest = hashlib.sha256(link_body.encode()).hexdigest()
        if label not in ROW_ARGUMENT_LINK_LABELS and body_digest != link_digest:
            findings.append(f"{subject} — manifest body digest differs "
                            "from current subject digest")
        link_rows = manifest_rows(link_body, subject, len(link_paths))
        require_exact_paths(link_rows, subject, link_paths)
        for _sha, path, line_no in link_rows:
            if repo_subject(path, subject, line_no, base=CONTRACT_ROOT) is None:
                continue
            if path not in bootstrap_contract_paths:
                findings.append(
                    f"{subject}:{line_no} — no predecessor contract row for "
                    f"`{path}`; a link binds only the "
                    f"{len(bootstrap_contract_paths)} bootstrap contract paths")
        link_valid = len(findings) == before_link
        if not link_valid:
            broken.append(label)
        contract_links.append((label, subject, link_rows, link_valid))
        if link_valid:
            for sha, path, _line in link_rows:
                if path in contract_bound_by:
                    details.append(
                        f"[historical] {contract_bound_by[path]} — act-time "
                        f"row for `{path}` superseded by {subject}")
                contract_overrides[path] = sha
                contract_bound_by[path] = subject
            details.append(
                f"[historical] {GENERAL_BOOTSTRAP_CONTRACT_MANIFEST} — "
                f"{len(link_rows)} act-time module row(s) superseded by "
                f"{subject}")

    for expected, path, line_no in contract_rows:
        expected = contract_overrides.get(path, expected)
        installed = repo_subject(
            path, GENERAL_BOOTSTRAP_CONTRACT_MANIFEST, line_no,
            base=CONTRACT_ROOT)
        actual = current_digest(installed) if installed else None
        if actual != expected:
            findings.append(
                f"{GENERAL_BOOTSTRAP_CONTRACT_MANIFEST}:{line_no} — installed "
                f"`{path}` hashes to {(actual or 'absent')[:12]}…, expected "
                f"{expected[:12]}…")

    if successor_valid:
        details.append(
            f"[historical] {GENERAL_BOOTSTRAP_PWB_MANIFEST} — "
            f"{len(pwb_rows)} act-time PWB row(s) preserved; current bytes "
            f"are bound by {attempted_links[-1][1]}")
    else:
        for expected, path, line_no in pwb_rows:
            rel = repo_subject(path, GENERAL_BOOTSTRAP_PWB_MANIFEST, line_no)
            actual = current_digest(rel) if rel else None
            if actual != expected:
                findings.append(
                    f"{GENERAL_BOOTSTRAP_PWB_MANIFEST}:{line_no} — `{path}` "
                    f"hashes to {(actual or 'absent')[:12]}…, expected "
                    f"{expected[:12]}…")

    for _expected, path, line_no in contract_rows:
        installed = repo_subject(
            path, GENERAL_BOOTSTRAP_CONTRACT_MANIFEST, line_no,
            base=CONTRACT_ROOT)
        candidate = repo_subject(
            path, GENERAL_BOOTSTRAP_CONTRACT_MANIFEST, line_no,
            base=CANDIDATES)
        installed_digest = current_digest(installed) if installed else None
        candidate_digest = current_digest(candidate) if candidate else None
        if installed_digest is None or candidate_digest is None:
            findings.append(
                f"{GENERAL_BOOTSTRAP_CONTRACT_MANIFEST}:{line_no} — mirror "
                f"pair for `{path}` is incomplete: installed "
                f"{'present' if installed_digest else 'absent'}, candidate "
                f"{'present' if candidate_digest else 'absent'}")
        elif installed_digest != candidate_digest:
            findings.append(
                f"{GENERAL_BOOTSTRAP_CONTRACT_MANIFEST}:{line_no} — installed "
                f"and candidate `{path}` differ: {installed_digest[:12]}… != "
                f"{candidate_digest[:12]}…")

    successor_examined = (
        2 * len(attempted_links) + len(successor_rows)
        if successor_attempted else 0)
    contract_link_rows = sum(len(rows) for _l, _s, rows, _v in contract_links)
    examined = (5 + spec_examined + len(top_rows) + len(contract_rows)
                + len(pwb_rows)
                + len(contract_rows) + successor_examined
                + 2 * len(contract_links) + contract_link_rows)
    details.append(
        f"[population] 5 act-record predicates"
        + (f" + {spec_examined} specification-policy restyle predicates"
           if spec_attempted else "")
        + f" + {len(top_rows)} top-level "
        f"subjects + {len(contract_rows)} contract rows + {len(pwb_rows)} PWB "
        f"rows + {len(contract_rows)} installed/candidate mirror pairs"
        + (f" + {2 * len(attempted_links)} successor act predicates + "
           f"{len(successor_rows)} successor PWB rows" if successor_attempted
           else "")
        + (f" + {2 * len(contract_links)} contract successor act predicates "
           f"+ {contract_link_rows} contract successor rows"
           if contract_links else ""))

    res.add("FAIL" if findings else "OK",
            "CG-7h  performed bootstrap transaction subjects remain exact",
            examined, len(findings), "predicate", details=findings + details)


# --------------------------------------------------------------- CG-8

#: Charter §11.4 review triggers. These are decomposition triggers, not
#: validity laws — reported, never enforced. They are deliberately tighter
#: than the 7,000-word hard ceiling that
#: `candidates/scripts/verify_final_prespec.py` enforces with declared
#: justifications; the two are different instruments, not a contradiction.
BUDGETS = (
    ("README.md", 1200, "root README review trigger"),
    ("AGENTS.md", 1500, "AGENTS review trigger"),
)
MODULE_TRIGGER = 4000
MODULE_DECOMPOSE = 5000

#: The *default agent load* is reported in words and estimated tokens — not
#: asserted in prose. These four are what a fresh agent session loads before
#: it has chosen a task. **This set, `TOKENS_PER_WORD` and the AGENTS.md band
#: below are this file's own operating figures.** They were once attributed
#: to "charter §7.3" and "§7.1", sections no tracked charter has (review RD-6
#: F-1); where such figures should bind is owner item P-12. Reported every run so the figures
#: cannot go stale in a document that quotes them.
DEFAULT_LOAD = (
    "README.md",
    "AGENTS.md",
    ".claude/skills/heart-and-soul/SKILL.md",
    ".syzygy/intent/OVERVIEW.md",
)
TOKENS_PER_WORD = 1.35

#: `AGENTS.md` carries a tool-managed block that `bd` writes and rewrites. It
#: is default context and counts toward the load, but it is not the router's
#: authored text and cannot be edited to hit a target. Both figures are
#: reported so the 900–1,200-word target is read against the region it
#: governs, and the whole-file total is never quietly replaced by the smaller
#: number.
TOOL_BLOCK_START = "<!-- BEGIN BEADS INTEGRATION"


def _authored_words(rel, text):
    """Words excluding any tool-managed block. Returns (authored, tool)."""
    idx = text.find(TOOL_BLOCK_START)
    if idx < 0:
        return len(text.split()), 0
    return len(text[:idx].split()), len(text[idx:].split())


def cg8_budgets(paths, res, measure=None):
    present = set(paths)
    read_text = measure if measure is not None else read
    lines, n = [], 0

    # The default load, always reported, never only on breach.
    for rel in DEFAULT_LOAD:
        if rel not in present:
            lines.append(f"{rel} — absent; DEFAULT_LOAD names it as default "
                         f"load and it cannot be measured")
            n += 1
            continue
        n += 1
        authored, tool = _authored_words(rel, read_text(rel))
        total = authored + tool
        tok = round(total * TOKENS_PER_WORD)
        suffix = (f" ({authored} authored + {tool} tool-managed)" if tool
                  else "")
        lines.append(f"{rel} — {total} w ≈ {tok} est. tokens{suffix}")

    for rel, limit, label in BUDGETS:
        if rel not in present:
            continue
        authored, tool = _authored_words(rel, read_text(rel))
        if authored + tool > limit:
            lines.append(f"{rel} — {authored + tool} words, over the {limit}-word "
                         f"{label} (§11.4 trigger; review, not failure)")

    # The tighter target applies to the authored router, not the block bd
    # owns. Reported as its own line so neither figure can stand in for the
    # other.
    if "AGENTS.md" in present:
        authored, tool = _authored_words("AGENTS.md", read_text("AGENTS.md"))
        if not (900 <= authored <= 1200):
            lines.append(f"AGENTS.md — {authored} authored words, outside the "
                         f"900–1,200 target band (this checker's own "
                         f"figure, stated in no governing artifact; the "
                         f"nearest written one is the historical round "
                         f"charter §8.2's 'roughly 800–1,500 words')")

    modules = sorted(p for p in paths
                     if p.startswith(f"{CANDIDATES}/rfcs/") and p.endswith(".md"))
    for rel in modules:
        n += 1
        w = len(read_text(rel).split())
        if w > MODULE_DECOMPOSE:
            lines.append(f"{rel} — {w} words, above {MODULE_DECOMPOSE}: §11.4 "
                         f"focused decomposition review")
        elif w > MODULE_TRIGGER:
            lines.append(f"{rel} — {w} words, over the {MODULE_TRIGGER}-word "
                         f"active-module trigger (§11.4)")
    res.add("WARN" if n else "WARN",
            "CG-8   context budgets reported", n, len(lines), "artifact",
            note=("report-only — default-load figures (this checker's own "
                  "set) are printed every run; §11.4 triggers are "
                  "decomposition prompts, not failures"
                  if n else "nothing examined"),
            details=lines)


# --------------------------------------------------------------- CG-9

#: Each authority type has exactly one home. A second copy in the candidate
#: package is a duplicate authority home — the reader cannot tell which one
#: binds. **What this tests is narrower than that sentence:** a file whose
#: path carries a home's marker must sit under that home. A copy of doctrine
#: prose under any other path, or a craft rule restated in a contract, is
#: invisible to it. Review RD-6 F-4 found the old label, "duplicate authority
#: homes absent", claimed the wider test; the label now says the narrower one
#: and the identifier is unchanged.
AUTHORITY_HOMES = (
    ("doctrine", DOCTRINE, ("/doctrine/",)),
    ("craft-and-care", CRAFT, ("/craft-and-care/",)),
)


def cg9_duplicate_homes(paths, res):
    findings, n = [], 0
    for label, home, markers in AUTHORITY_HOMES:
        for rel in paths:
            if not rel.endswith(".md"):
                continue
            if any(mk in "/" + rel for mk in markers):
                n += 1
                if not rel.startswith(home + "/"):
                    findings.append(f"{rel} — {label} material outside its one "
                                    f"home {home}/")
    status = "FAIL" if findings else ("OK" if n else "WARN")
    res.add(status, "CG-9   authority-home files sit under their one home", n,
            len(findings), "file",
            note=None if n else "no authority-home files found — nothing examined",
            details=findings)


# --------------------------------------------------------------- CG-10

PENDING = f"{DECISIONS}/PENDING-OWNER-DECISIONS.md"
ASOF = re.compile(r"as[- ]of\b[^\n]*", re.I)


def cg10_pending_asof(paths, res):
    if PENDING not in set(paths):
        res.add("WARN", "CG-10  pending register as-of reported", 0, 0, "register",
                note=f"{PENDING} not present — nothing examined")
        return
    head = read(PENDING).splitlines()[:40]
    hits = [f"{PENDING}:{i} — {ASOF.search(ln).group(0).strip()}"
            for i, ln in enumerate(head, 1) if ASOF.search(ln)]
    if not hits:
        res.add("FAIL", "CG-10  pending register as-of reported", 1, 1, "register",
                details=[f"{PENDING} — no 'As-of' line in the first 40 lines"])
        return
    res.add("WARN", "CG-10  pending register as-of reported", 1, 0, "register",
            note="reported for human currency judgement, never auto-verified",
            details=hits)


# --------------------------------------------------------------- CG-11

MUST_IGNORE = (".syzygy/cache/", ".syzygy/local/")


def cg11_ignored(res):
    gi = os.path.join(ROOT, ".gitignore")
    if not os.path.exists(gi):
        res.add("FAIL", "CG-11  cache/local git-ignored", 0, 1, "pattern",
                details=[".gitignore is absent"])
        return
    txt = read(".gitignore")
    entries = {ln.strip() for ln in txt.splitlines() if ln.strip()}
    findings = [f"{p} not present in .gitignore" for p in MUST_IGNORE
                if p not in entries and p.rstrip("/") not in entries]
    res.add("FAIL" if findings else "OK", "CG-11  cache/local git-ignored",
            len(MUST_IGNORE), len(findings), "pattern", details=findings)


# --------------------------------------------------------------- CG-12

#: A `_bootstrap/` mention is acceptable when it marks the target as
#: historical, founder-local, or otherwise unavailable to a clone. It is a
#: finding when an active artifact points a reader there for meaning it
#: cannot get elsewhere.
BOOTSTRAP_MARKERS = (
    "histor", "founder-local", "excluded", "unavailable", "archive",
    "bootstrap record", "bootstrap-phase", "fd-021", "fd-037",
    "frozen", "verbatim", "preserved", "process mirror", "never edit",
    "do not load", "do not cite", "not a source", "extracted under",
    "invisible to clone", "before this round", "source:", "git-excluded",
    "machine-local", "prior draft", "supersede", "not authority",
    "bootstrap home",
)
#: A marker rarely lands on the same physical line as the path in wrapped
#: prose — "`_bootstrap/…/DIRECTIVE.md` (owner-supplied,\npreserved verbatim…)"
#: is one sentence across two lines, and a section heading that marks a whole
#: list ("Research corpus links (archived, non-authoritative)") sits two lines
#: above its first entry. The window is ±2 lines; anything needing more than
#: that is not marked clearly enough for a reader either.
#: Absence markers. A sentence that says the tree is *not* there, *not*
#: read, or deliberately removed is not a citation of it — the round's own
#: reports say so repeatedly, and Test E's whole subject is the absence.
#: Kept separate from the historical markers above because they justify a
#: mention for a different reason.
BOOTSTRAP_ABSENCE_MARKERS = (
    "no `_bootstrap", "no _bootstrap", "without `_bootstrap",
    "without _bootstrap", "-free clone", "remove access",
    "no access", "did not read", "does not read", "cannot read",
    "no hidden semantic dependency", "nothing under `_bootstrap",
    "absent", "is not present", "excluded from clones",
)

MARKER_WINDOW = 2

#: A file may instead carry one prominent disclosure covering every pointer in
#: it — the pending-decision register does exactly this. Recognised only near
#: the top, where a reader meets it before the pointers.
DISCLOSURE_LINES = 40
DISCLOSURE_MARKERS = ("git-excluded", "founder-local", "absent from clones",
                      "unavailable", "cannot resolve those pointers")


def _has_file_disclosure(all_lines):
    head = all_lines[:DISCLOSURE_LINES]
    for i, ln in enumerate(head):
        if "_bootstrap/" not in ln:
            continue
        window = "\n".join(head[max(0, i - 2):i + 3]).lower()
        if any(mk in window for mk in DISCLOSURE_MARKERS):
            return window.strip().splitlines()[0][:80]
    return None
#: Derivation and archive subtrees: their whole job is to name the frozen
#: rev9 inputs a clause was migrated from. Allowlisted by prefix, counted,
#: printed.
BOOTSTRAP_ALLOW_PREFIX = (
    (f"{CANDIDATES}/history/", "frozen rev9 corpus and amendment history"),
    (f"{CANDIDATES}/reviews/", "raw reviewer output, stored verbatim"),
    (f"{CANDIDATES}/round-2026-08/reviews/",
     "raw reviewer output, stored verbatim — never edited, so a reviewer's "
     "own mention of the excluded tree (usually to record that they did not "
     "read it) is evidence, not an active citation"),
    (f"{CANDIDATES}/round-2026-08b/reviews/",
     "raw reviewer output, stored verbatim — same rule as the prior round; "
     "each round's review directory is allowlisted explicitly when opened, "
     "never by a `round-*/` glob, so opening one is a deliberate act"),
    (f"{CANDIDATES}/round-2026-08c/reviews/",
     "raw reviewer output, stored verbatim — allowlisted explicitly when the "
     "round opened, on the same terms as its two predecessors"),
    (f"{CANDIDATES}/round-2026-08d/reviews/",
     "raw reviewer output, stored verbatim — allowlisted explicitly when the "
     "round's review pass opened, on the same terms as its predecessors"),
    (f"{CANDIDATES}/matrix-rows/", "per-RFC clause-migration provenance rows"),
    (f"{CANDIDATES}/04-CLAUSE-MIGRATION-MATRIX.md",
     "clause-migration provenance, cites frozen rev9 sources by construction"),
    (f"{CANDIDATES}/COMPACTION-CHARTER.md",
     "the superseded round's own working charter"),
    (f"{CANDIDATES}/round-2026-08/OWNER-ROUND-CHARTER.md",
     "owner-supplied round charter, quoted verbatim"),
    (f"{CANDIDATES}/round-2026-08d/OWNER-WORK-ORDER.md",
     "owner-supplied work order, quoted verbatim — its `_bootstrap/` line "
     "sits inside the prohibition list it orders enforced"),
    ("syzygy_claude_structural_contract_decomposition_prompt.md",
     "the owner's working copy of the round-2026-08d work order, untracked "
     "at repo root; archived verbatim as round-2026-08d/OWNER-WORK-ORDER.md"),
    (SELF_REL, "this checker names the path in order to detect it"),
)


def cg12_bootstrap_sources(paths, res):
    files = [p for p in paths if p.endswith((".md", ".txt", ".yaml", ".yml"))]
    findings, allowed_files = [], []
    n_lines = 0
    for rel in files:
        reason = _allow_hit(rel, BOOTSTRAP_ALLOW_PREFIX)
        all_lines = read(rel).splitlines()
        hit_lines = [(i, ln) for i, ln in enumerate(all_lines, 1)
                     if "_bootstrap/" in ln]
        if not hit_lines:
            continue
        if not reason and _has_file_disclosure(all_lines):
            reason = "file-level disclosure that these pointers are git-excluded"
        if reason:
            allowed_files.append(f"{rel} ({len(hit_lines)} line(s)) — {reason}")
            continue
        for i, ln in hit_lines:
            n_lines += 1
            lo = max(0, i - 1 - MARKER_WINDOW)
            # Whitespace-normalized: a marker and its pointer routinely
            # land on opposite sides of a line wrap, and a matcher that
            # silently misses those would manufacture findings.
            window = " ".join(" ".join(all_lines[lo:i + MARKER_WINDOW]).split()).lower()
            if not any(mk in window for mk in
                       BOOTSTRAP_MARKERS + BOOTSTRAP_ABSENCE_MARKERS):
                findings.append(f"{rel}:{i} — cites `_bootstrap/` with no "
                                f"historical/unavailable marker: {ln.strip()[:90]}")
    status = "FAIL" if findings else ("OK" if n_lines else "WARN")
    res.add(status, "CG-12  no `_bootstrap/` cited as a required source",
            n_lines, len(findings), "citation",
            note=None if n_lines else "no citations examined",
            details=findings)
    res.add("WARN", "CG-12b `_bootstrap/` citation allowlist", len(allowed_files),
            0, "file", note="derivation and archive records",
            details=sorted(allowed_files))


# ------------------------------------------------- CG-13..CG-19 (round 08b)

RFCS_DIR = f"{CANDIDATES}/rfcs"
DEPENDS_RE = re.compile(r"^depends_on:\s*\[(.*?)\]\s*$", re.M)
ROUTING_MATRIX = f"{CANDIDATES}/SURFACE-CLAUSE-ROUTING-MATRIX.md"
LOAD_MAP = f"{CANDIDATES}/06-CONTEXT-LOAD-MAP.md"
FIXTURES_DIR = f"{CANDIDATES}/fixtures"
SUBSTRATE_LOCK = ".syzygy/governance/policies/GOVERNANCE-SUBSTRATE-LOCK.yaml"
TERM_REGISTRY = f"{CANDIDATES}/policy-candidates/TERM-REGISTRY.md"


def _module_deps(rel):
    m = DEPENDS_RE.search(read(rel))
    if not m:
        return None
    return set(x.strip() for x in m.group(1).split(",") if x.strip())


def _rfc_modules():
    """Every contract module, repo-relative, sorted."""
    out = []
    base = os.path.join(ROOT, RFCS_DIR)
    for dirpath, _, names in os.walk(base):
        for n in sorted(names):
            if n.endswith(".md"):
                out.append(os.path.relpath(os.path.join(dirpath, n),
                                           ROOT).replace(os.sep, "/"))
    return sorted(out)


def cg13_dependency_graph(res, modules=None):
    """`depends_on` resolves, and a package README equals its modules' union.

    Two defects this makes unrepresentable-by-report rather than merely
    absent. **Dangling**: a dependency naming a contract with no module in
    the package — the graph's only remaining asymmetry class now that
    `provides_to` is derived. **README drift**: a package README's
    dependency row is the package-level view, so it must be exactly the
    union of its modules' rows. When round 08b added module-level edges,
    two READMEs silently stopped matching their own packages; nothing
    reported it, because regenerating a knowingly-drifted index reproduces
    the drift.
    """
    modules = modules if modules is not None else _rfc_modules()
    known = set()
    for rel in modules:
        m = re.search(r"(RFC-\d{4})", os.path.basename(rel)) or \
            re.search(r"(RFC-\d{4})", rel)
        if m:
            known.add(m.group(1))
    findings, examined = [], 0
    packages = {}
    for rel in modules:
        deps = _module_deps(rel)
        if deps is None:
            continue
        for d in sorted(deps):
            examined += 1
            if d not in known:
                findings.append(f"{rel} — depends_on `{d}`, which has no "
                                f"module in the package (dangling)")
        parent = os.path.dirname(rel)
        if os.path.basename(parent).startswith("RFC-"):
            packages.setdefault(parent, {})[os.path.basename(rel)] = deps
    for pkg, mods in sorted(packages.items()):
        if "README.md" not in mods:
            continue
        readme = mods["README.md"]
        union = set().union(*[v for k, v in mods.items()
                              if k != "README.md"]) if len(mods) > 1 else set()
        examined += 1
        if readme != union:
            findings.append(
                f"{pkg}/README.md — depends_on is not the union of its "
                f"modules': extra {sorted(readme - union) or '[]'}, "
                f"missing {sorted(union - readme) or '[]'}")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-13  dependency edges resolve; README = module union",
            examined, len(findings), "edge",
            note=None if examined else "no depends_on rows found",
            details=findings)


def _dir_exists(d, all_paths):
    """A directory reference resolves if it names a real directory, whether
    written from the repo root, from the acceptance record's own directory,
    or as a suffix of one. Directories are not in the file corpus, so the
    file resolver cannot answer this — asking it reported four real
    directories as missing."""
    d = d.strip("/")
    if not d:
        return True
    for base in (ROOT, os.path.join(ROOT, os.path.dirname(ACCEPTANCE_RECORD))):
        if os.path.isdir(os.path.normpath(os.path.join(base, d))):
            return True
    return any(p == d or p.startswith(d + "/") or ("/" + d + "/") in p
               for p in all_paths)


def _git_excluded_roots():
    """Top-level directories `.gitignore` excludes, read rather than assumed.

    A ceremony step that names one of these is executable on the machine that
    happens to have the directory and nowhere else — the founder-local
    dependency this repository keeps re-acquiring. Hardcoding the list would
    make the check go stale the moment `.gitignore` changed, so it is parsed.
    """
    #: Full excluded path prefixes, not top-level segments only: the first
    #: version kept `seg.split("/")[0]` and skipped dotted names, which
    #: dropped `.syzygy/cache/` and `.syzygy/local/` from the set entirely —
    #: review RD-6, finding D-1 ("the prior round's defect class,
    #: recurring"). A ceremony step naming either would have been checked
    #: against the local filesystem, which is exactly the founder-machine
    #: divergence this helper exists to prevent.
    roots = set()
    for line in (read(".gitignore") or "").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or line.startswith("!"):
            continue
        if any(c in line for c in "*?[]"):
            continue
        prefix = line.strip("/")
        if prefix:
            roots.add(prefix)
    return roots


def cg14_install_routes(res, record=None, all_paths=()):
    """Every path the acceptance ceremony names is valid for its role.

    An act that installs candidate material states where it reads from and
    where it writes to. A wrong source silently installs the wrong bytes; a
    destination that already exists means the act is not an act. Both were
    live: act 3's install step named `topology/`, a directory that has never
    existed, and the link checker could not see it because an allowlist
    written for stale *history* references was absorbing a live *instruction*.

    Roles are decided by the forward-reference declaration, not by guessing:
    a path declared as act-created must be **absent**, and every other path
    the ceremony names must be **present** — and **present in a clone**, not
    merely on the machine running the check. A git-excluded location is
    treated as absent everywhere, because it is: the founder's copy of
    `_bootstrap/` made a step read as executable here that failed the moment
    the same check ran inside a clone, which is precisely the divergence a
    clone-executable ceremony must not have.
    """
    body = record if record is not None else read(ACCEPTANCE_RECORD)
    if not body:
        res.add("WARN", "CG-14  acceptance install routes valid", 0, 0,
                "route", note=f"{ACCEPTANCE_RECORD} unreadable")
        return
    # The ceremony is section 2. Scope to it so ordinary prose citations
    # elsewhere in the record are not mistaken for install instructions.
    m = re.search(r"^##\s*2\..*$", body, re.M)
    scope = body[m.start():] if m else body
    nxt = re.search(r"^##\s*3\.", scope, re.M)
    if nxt:
        scope = scope[:nxt.start()]
    #: A ceremony that records its own past defect names the bad path in
    #: order to say it was bad, and one that disclaims a founder-local mirror
    #: names it in order to exclude it. Both are the opposite of an
    #: instruction. The window is the line **and its two neighbours**: a
    #: wrapped paragraph puts the marker and the path on different lines, and
    #: a line-only test read the retraction paragraph's `_bootstrap/` as live.
    corrected = re.compile(r"\b(previously|never existed|exists in no clone|"
                           r"corrected|unexecutable|was wrong|no longer|"
                           r"git-excluded|not part of the ceremony|"
                           r"founder machine only|absent from every clone)\b",
                           re.I)
    excluded_roots = _git_excluded_roots()
    findings, examined = [], 0
    seen = set()
    lines = scope.splitlines()
    for line_no, line in enumerate(lines, 1):
        window = "\n".join(lines[max(0, line_no - 2):line_no + 1])
        if corrected.search(window):
            continue
        for pm in re.finditer(r"`([A-Za-z0-9_.\-/]*/)`", line):
            path = pm.group(1)
            if path in seen or path in ("./", "/"):
                continue
            seen.add(path)
            examined += 1
            # A git-excluded root is absent in every clone. Answer from
            # `.gitignore`, never from the local filesystem, so the founder
            # machine and a fresh clone reach the same verdict.
            _p = path.strip("/")
            if any(_p == r or _p.startswith(r + "/") for r in excluded_roots):
                findings.append(
                    f"`{path}` — named by the ceremony as a location, but it "
                    f"is git-excluded and therefore absent from every clone; "
                    f"the step is executable only where the directory "
                    f"already happens to exist")
                continue
            # Resolve the way every other path reference here is written:
            # relative to the citing record, to the repo root, or as a
            # suffix. `topology-candidates/` cited from the record's own
            # directory is not a missing directory.
            exists = _dir_exists(path.rstrip("/"), all_paths)
            # A *bare* directory name (`history/`) is a source relative to
            # the record; an act-created home is always written as a full
            # path. Without this, suffix matching classified the candidate
            # package's own `history/` as the act-1 destination of the same
            # name and demanded it not exist.
            if "/" in path.strip("/") and _is_forward(path):
                if exists and not _home_act_recorded(path, _recorded_act_labels()):
                    findings.append(
                        f"`{path}` — declared as created by an act, but it "
                        f"already exists with no recorded act; the act "
                        f"cannot be performed")
            elif not exists:
                findings.append(
                    f"`{path}` — named by the ceremony as an existing "
                    f"location, but it does not exist; the step cannot be "
                    f"executed as written")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-14  acceptance install routes valid", examined,
            len(findings), "path",
            note=None if examined else "no directory paths found in the "
                                       "acceptance record's ceremony section",
            details=findings)


#: Sources whose text is evidence rather than assertion: raw reviewer output
#: stored verbatim (never edited — editing it destroys what the allowlist
#: exists to protect), owner-supplied charters quoted as given, and the
#: frozen history. A reviewer quoting a digest is recording what they read,
#: and a reviewer calling the term registry "canonical" is reporting how the
#: corpus reads to them — which is the finding, not a defect to correct.
VERBATIM_SOURCES = (
    f"{CANDIDATES}/reviews/",
    f"{CANDIDATES}/round-2026-08/reviews/",
    f"{CANDIDATES}/round-2026-08b/reviews/",
    f"{CANDIDATES}/round-2026-08c/reviews/",
    f"{CANDIDATES}/round-2026-08d/reviews/",
    f"{CANDIDATES}/history/",
    f"{CANDIDATES}/round-2026-08/OWNER-ROUND-CHARTER.md",
    SELF_REL,
)


#: Files whose digests name artifacts outside the act/manifest population —
#: so "prefixes no current act argument" is true and not a defect. Declared
#: rather than pattern-matched, because a rule broad enough to infer this
#: would also excuse a genuinely stale act quote.
DIGEST_SCOPE_EXEMPT = (
    (f"{DECISIONS}/LICENSE-DECISION-PACKET.md",
     "cites the digest of the founder-local directive that commissioned it, "
     "not an act argument"),
    (f"{CANDIDATES}/CONTEXT-BUDGET-REPORT.md",
     "generated: its hex quotations are context-packet digests, not act "
     "arguments, and they are written by build_budget_report.py from the "
     "same measurement CG-18 independently recomputes — the fixtures "
     "themselves are exempt for the same reason"),
    (f"{CANDIDATES}/round-2026-08g/FINAL-OWNER-AND-SPEC-CLOSURE-PREFLIGHT.md",
     "a dated measurement of the six wave manifests at the commit it names; "
     "its truncated digests record what was measured then, and the round "
     "record is frozen, so a later re-quote of an unperformed wave cannot "
     "be reflected in it"),
)


#: **The cap stays at 63 and the marker stays required, deliberately.** Review
#: RD-6 (finding H-1) proposed widening this to `{8,64}` with an optional
#: marker, so that a full digest quoted without its act phrase would be caught.
#: Tried, and it over-fires: the corpus legitimately quotes 64-hex digests of
#: things that are *not* act subjects — the artifacts D3 would amend, a
#: superseded manifest a round record preserves, a review's record of what it
#: read. Forty-seven such quotations became findings, none of them defects.
#:
#: The hole H-1 proved is real and is closed by **CG-7e** instead, which
#: enumerates the files that carry a copy of an act argument and checks each
#: one — and which fails if a file acquires a copy without being enumerated.
TRUNC_DIGEST = re.compile(r"`?\b(?P<d>[0-9a-f]{8,63})(?:…|\.\.\.)")


def cg15_truncated_digests(paths, res, corpus=None):
    """Truncated digest quotes must still prefix a current act argument.

    CG-7d is structurally blind to these: it matches a full 64-hex digest
    beside an act phrase, so `08793ddf70f3…` — no phrase, 12 characters —
    passes it unseen. Two such quotes sat stale in the artifact inventory
    while CG-7d reported zero findings over eight quotations, and a review
    that searched the way CG-7d searches concluded there were none. A
    convenience truncation is still a promise.
    """
    current = set()
    for label, rel, _pat in ACT_SUBJECTS:
        full = os.path.join(ROOT, rel)
        if os.path.exists(full):
            current.add(sha256_file(full))
    d3 = os.path.join(ROOT, CANDIDATES,
                      "DOCTRINE-AMENDMENT-BOUNDED-MISSION-D3.md")
    if os.path.exists(d3):
        current.add(sha256_file(d3))
    manifest = os.path.join(ROOT, CANDIDATES, "ACTIVE-CONTRACT-MANIFEST.txt")
    if os.path.exists(manifest):
        current.add(sha256_file(manifest))
        for line in read(f"{CANDIDATES}/ACTIVE-CONTRACT-MANIFEST.txt").splitlines():
            if line and line[0] in "0123456789abcdef":
                current.add(line.split()[0])
    #: Unlike CG-7d, the marker may sit anywhere on the line. CG-7d needs a
    #: strict lookbehind because it matches full 64-hex act *arguments*, and a
    #: row that offers the current one while noting the old one is stale must
    #: stay checked. A truncated digest is never an act argument — CG-7b/c
    #: require the full 64 — so a whole-line marker cannot excuse a live offer
    #: here, and demanding a lookbehind would instead flag every honest
    #: "…is stale and satisfies nothing" row in the acceptance record.
    retired = re.compile(r"\b(retired|stale|superseded|pre-amendment|"
                         r"historical|no longer|prior|previous|mismatch|"
                         r"never carried|satisfies nothing)\b", re.I)
    #: A whole file may be historical — but only when it *says so as a
    #: banner*, not merely because the word appears in its prose. The loose
    #: form of this test exempted 49 files including the live routing matrix,
    #: which is the silent-exemption failure this checker exists to prevent.
    #: Required: a bolded or blockquoted opening line whose first words mark
    #: the whole artifact superseded or historical.
    superseded_banner = re.compile(
        r"^>?\s*[#*\s]*(SUPERSEDED|Superseded|Historical|RETIRED|Retired)\b",
        re.M)
    items = corpus if corpus is not None else [
        (rel, read(rel)) for rel in paths
        if rel.endswith(".md") and not _act_quote_exempt(rel)]
    findings, examined, historical_files = [], 0, []
    for rel, body in items:
        if _allow_hit(rel, DIGEST_SCOPE_EXEMPT):
            continue
        lines = body.splitlines()
        if superseded_banner.search("\n".join(lines[:12])):
            historical_files.append(rel)
            continue
        for line_no, line in enumerate(lines, 1):
            for m in TRUNC_DIGEST.finditer(line):
                d = m.group("d")
                if len(d) < 8:
                    continue
                # Also the line before: a wrapped sentence puts "now retired"
                # on one line and the digest on the next, and a per-line test
                # would report the honest half of a two-line disclosure.
                prev = lines[line_no - 2] if line_no >= 2 else ""
                if retired.search(line) or retired.search(prev):
                    continue
                # A table column headed "prior/retired" marks its whole body.
                header = next((h for h in reversed(lines[:line_no - 1])
                               if h.startswith("|")
                               and not set(h) <= set("|- :")), "")
                if retired.search(header):
                    continue
                examined += 1
                if not any(c.startswith(d) for c in current):
                    findings.append(
                        f"{rel}:{line_no} — `{d}…` prefixes no current act "
                        f"argument or manifest entry; the quote is stale or "
                        f"names an artifact state that no longer exists")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-15  truncated digest quotes still current", examined,
            len(findings), "quotation",
            note=None if examined else "no truncated digest quotations found",
            details=findings)
    res.add("WARN", "CG-15b superseded records holding old digests",
            len(historical_files), 0, "file",
            note="carry a SUPERSEDED/Historical banner; their digests record "
                 "what was offered, not what is",
            details=sorted(historical_files))


def cg16_term_registry_status(paths, res, corpus=None):
    """Nothing may describe the term registry as accepted, adopted, or binding.

    It is candidate material with no owner act. The failure mode is not a
    lie but a drift: a summary calls it "the vocabulary", a later reader
    reads that as settled, and an unaccepted registry acquires authority by
    citation. Checked over every file that names it.
    """
    claim = re.compile(r"\b(adopted|accepted|approved|binding|authoritative|"
                       r"canonical)\b", re.I)
    #: **The negator may sit a few words away, but not past a sentence end.**
    #: The old form required the negator within 14 *non-word* characters of
    #: the claim, so `not adopted` exempted and `never described as accepted`
    #: did not — and that second phrase is this check's own headline. A record
    #: that quoted CG-16's summary line verbatim became a CG-16 finding, which
    #: the vocabulary agent hit and worked around by paraphrasing the battery
    #: instead of quoting it. A checker that cannot be quoted accurately is a
    #: checker whose output gets paraphrased, and a paraphrase is where a
    #: verdict word goes soft.
    #:
    #: The bound is a sentence, not a word count: `[^.;:!?]` refuses to cross
    #: a sentence boundary, so `No act has been performed. The registry is
    #: accepted.` still fails — the negation belongs to the other sentence.
    negated = re.compile(
        r"\b(not|never|no|neither|nor|non|un|unaccepted|candidate)\b"
        r"[^.;:!?]{0,60}?$", re.I)
    #: Naming this check is quoting it, not claiming. Same marker convention
    #: CG-22 already grants itself (`STATUS_RETIRED_MARKERS` contains
    #: `cg-22`): a document whose subject is the battery must be able to
    #: reproduce what the battery forbids.
    self_quote = re.compile(r"\bCG-16\b", re.I)
    items = corpus if corpus is not None else [
        (rel, read(rel)) for rel in paths if rel.endswith(".md")
        and not _verbatim_source(rel)]
    findings, examined = [], 0
    for rel, body in items:
        if rel.endswith("TERM-REGISTRY.md"):
            continue
        for line_no, line in enumerate(body.splitlines(), 1):
            low = line.lower()
            at = low.find("term registry")
            if at < 0:
                at = line.find("TERM-REGISTRY")
            if at < 0:
                continue
            examined += 1
            # The claim word must sit next to the mention. Scanning the whole
            # line flagged a register row where "adopted" described doctrine's
            # three-state thesis two clauses away — a check that reports a
            # defect for an unrelated word is a check nobody will keep.
            window = line[max(0, at - 60):at + 90]
            m = claim.search(window)
            if not m:
                continue
            if self_quote.search(window):
                continue
            if negated.search(window[:m.start()]):
                continue
            findings.append(f"{rel}:{line_no} — calls the term registry "
                            f"`{m.group(0)}`; it is candidate material "
                            f"with no owner act")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-16  term registry never described as accepted", examined,
            len(findings), "mention",
            note=None if examined else "term registry not mentioned anywhere",
            details=findings)


#: A sentence that **denies** the lettered token beside it is a sub-clause.
#: Two shapes exist in the corpus and both are load-bearing:
#:
#:   RFC-0008 README — "**No lettered sub-clauses.** Lettered limbs cited
#:   inside a clause — RFC8-2(a)-(c) …"
#:   RFC-0009 (README and module 1) — "Lettered *limbs* cited inside a parent
#:   clause (RFC9-10(c), RFC9-19(b)) are parts of that clause, **not separate
#:   sub-clauses**, and resolve the same way."
#:
#: Only the first was recognised, so `RFC9-10(c)` and `RFC9-19(b)` entered the
#: declared set and CG-17 demanded matrix rows for them. Adding those rows
#: would have fabricated two clause identities RFC-0009 explicitly disclaims —
#: the routing matrix would have grown coverage for clauses that do not exist.
#: The repair belongs on this side, which is why the check now reads the
#: denial rather than the disclaiming contract acquiring rows to satisfy it.
NOT_A_SUBCLAUSE = re.compile(
    r"\bno lettered sub-clause|\bnot\s+(?:separate\s+)?sub-clauses?\b", re.I)
#: The denial and the tokens it denies land on opposite sides of a line wrap
#: in RFC-0009's README (tokens on one line, "not separate sub-clauses" on the
#: next). Same ±1 window CG-20's threshold marker uses, and for the same
#: reason: prose wraps, and a line-only test reads half a sentence.
SUBCLAUSE_WINDOW = 1


def _declared_subclauses(bodies, declared):
    """Lettered identities a module positively declares as sub-clauses.

    Sub-clauses are defined inline inside their parent, so they never match
    the definition-site regex. They are declared instead — as a range in
    front matter (`sub-clauses RFC7-2(a)-(c)`) or as singletons — and a token
    is admitted only when its parent is already declared. A *fabricated* row
    must not inflate the denominator, and a *denied* limb must not enter it.
    """
    lines = bodies.splitlines()
    out = set()
    for i, line in enumerate(lines):
        if "sub-clause" not in line.lower():
            continue
        lo = max(0, i - SUBCLAUSE_WINDOW)
        window = " ".join(
            " ".join(lines[lo:i + SUBCLAUSE_WINDOW + 1]).split())
        if NOT_A_SUBCLAUSE.search(window):
            continue
        for rng in re.finditer(r"(RFC\d+-\d+)\((\w)\)[-–]\((\w)\)", line):
            stem, lo_c, hi_c = rng.groups()
            if stem in declared:
                for o in range(ord(lo_c), ord(hi_c) + 1):
                    out.add(f"{stem}({chr(o)})")
        for single in re.finditer(r"(RFC\d+-\d+\(\w\))(?![-–]\()", line):
            if single.group(1).split("(")[0] in declared:
                out.add(single.group(1))
    return out


#: A contract the matrix routes has its own section: `## RFC-0006 — …`.
MATRIX_SECTION = re.compile(r"^## RFC-(\d{4}) — ", re.M)


def cg17_routing_completeness(res, matrix=None, modules=None):
    """Every clause of every contract the matrix routes is routed once.

    The six phase rules are only as good as the enumeration behind them.
    The rev10 matrix classified 150 of 322 clauses, routed RFC-0006 not at
    all, and was cited as though it covered everything — a coverage claim
    resting on an enumeration that did not exist.

    **Which contracts are in the population is read from the matrix's own
    per-contract sections**, never listed here. It was `RFC(?:6|7|…|11)`,
    so a twelfth contract would have left the denominator silently (review
    RD-6 F-3 row 11). Contracts with modules and no section — today RFC
    0001–0005, which the matrix says it stages at surface specification —
    are printed every run, so a new one cannot go unseen.
    """
    body = matrix if matrix is not None else read(ROUTING_MATRIX)
    if not body:
        res.add("WARN", "CG-17  surface clauses routed exactly once", 0, 0,
                "clause", note=f"{ROUTING_MATRIX} unreadable")
        return
    sections = {int(n) for n in MATRIX_SECTION.findall(body)}
    if not sections:
        res.add("FAIL", "CG-17  surface clauses routed exactly once", 0, 1,
                "clause", details=[f"{ROUTING_MATRIX} — no `## RFC-NNNN — ` "
                                   f"section parsed, so the population of "
                                   f"routed contracts is unknown"])
        return
    row = re.compile(r"\|\s*`?(RFC(?:%s)-\d+(?:\([a-z]\))?)`?\s*\|"
                     % "|".join(str(n) for n in sorted(sections)))
    routed = {}
    for line in body.splitlines():
        m = row.match(line)
        if m:
            routed[m.group(1)] = routed.get(m.group(1), 0) + 1
    declared, unsectioned = set(), set()
    for rel in (modules if modules is not None else _rfc_modules()):
        m = re.search(r"RFC-(\d{4})", rel)
        if not m:
            continue
        n = int(m.group(1))
        if n not in sections:
            unsectioned.add(n)
            continue
        for c in re.finditer(r"^\*\*(RFC%d-\d+(?:\([a-z]\))?)" % n,
                             read(rel), re.M):
            declared.add(c.group(1))
    # Sub-clauses (`RFC7-2(a)`) are defined inline inside their parent, so
    # they never match the definition-site regex. Accept one only when its
    # parent is declared AND the module actually contains the token —
    # otherwise a fabricated row would inflate the denominator and read as
    # coverage. Checking only `declared - routed` missed exactly that.
    # Sub-clauses are declared as ranges in a module's front matter
    # (`sub-clauses RFC7-2(a)-(c)`), so expand those into the declared set
    # rather than accepting any token that happens to appear in prose.
    bodies = "\n".join(read(rel) for rel in
                       (modules if modules is not None else _rfc_modules()))
    declared |= _declared_subclauses(bodies, declared)
    findings = []
    for c in sorted(declared - set(routed)):
        findings.append(f"{c} — declared in a contract, absent from the matrix")
    for c in sorted(set(routed) - declared):
        if c.split("(")[0] in declared and c in bodies:
            continue
        findings.append(f"{c} — routed by the matrix, but no contract "
                        f"declares it; the row inflates coverage")
    for c, n in sorted(routed.items()):
        if n > 1:
            findings.append(f"{c} — routed {n} times; each clause takes one route")
    examined = len(declared | set(routed))
    outside = (f"contracts with modules and no matrix section, outside this "
               f"population: {', '.join(f'RFC-{n:04d}' for n in sorted(unsectioned))}"
               if unsectioned else None)
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-17  surface clauses routed exactly once", examined,
            len(findings), "clause",
            note=(outside if examined else "no clause identities found"),
            details=findings)


def _resolve_load_spec(spec):
    prefixes = {"doctrine:": DOCTRINE, "craft:": CRAFT}
    for pfx, home in prefixes.items():
        if spec.startswith(pfx):
            return os.path.join(home, spec[len(pfx):])
    return os.path.join(CANDIDATES, spec)


def cg18_fixture_freshness(res, fixtures=None):
    """Each context fixture's packet digest and word count still recompute.

    A fixture is the project's only measured evidence that one task can be
    given complete governed context without loading the corpus. When a
    contract module is edited the fixture's digest goes stale silently, and
    a stale fixture reads exactly like a fresh one.
    """
    items = fixtures
    if items is None:
        base = os.path.join(ROOT, FIXTURES_DIR)
        items = []
        if os.path.isdir(base):
            for n in sorted(os.listdir(base)):
                if n.startswith("context-selection-") and n.endswith(".md"):
                    items.append((f"{FIXTURES_DIR}/{n}",
                                  read(f"{FIXTURES_DIR}/{n}")))
    # **The denominator is `2 × len(items)`, computed once.** It used to be
    # incremented per predicate *reached*, so a fixture that dropped its
    # `Measured:` anchor shrank the population and the check still printed
    # `OK` — review RD-17 finding 10 mutation-proved it at 20 -> 19, silently.
    # Every predicate the loop cannot run now leaves a finding behind it, so
    # the count and the coverage can no longer drift apart.
    findings = []
    for rel, body in items:
        cmd = re.search(r"```\s*\n(scripts/context_load\.py[\s\S]*?)\n```", body)
        # The digest is the first hex quotation after the "Packet digest"
        # heading. Anchoring on the "(recompute" suffix instead silently
        # skipped the two fixtures that word-wrap before it — a parser that
        # examines 4 of 8 while reporting a count is the failure mode here.
        section = body.split("## Packet digest", 1)
        quoted = (re.search(r"`([0-9a-f]{8,64})(?:…|\.\.\.)?`", section[1])
                  if len(section) > 1 else None)
        if not cmd or not quoted:
            findings.append(
                f"{rel} — could not locate a load command and a packet digest "
                f"to recompute from; a fixture this check cannot parse is "
                f"unverified, not passing")
            continue
        specs = [s for s in cmd.group(1).replace("\\\n", " ").split()
                 if s not in ("scripts/context_load.py",) and s.strip()]
        blob, words, missing = b"", 0, []
        for s in specs:
            path = os.path.join(ROOT, _resolve_load_spec(s))
            if not os.path.exists(path):
                missing.append(s)
                continue
            data = open(path, "rb").read()
            blob += data
            words += len(data.decode("utf-8", "replace").split())
        if missing:
            findings.append(f"{rel} — mandatory load names {missing}, which "
                            f"do not exist; the fixture cannot be reproduced")
            continue
        actual = hashlib.sha256(blob).hexdigest()
        q = quoted.group(1)
        if not actual.startswith(q):
            findings.append(f"{rel} — packet digest `{q}…` but the declared "
                            f"mandatory set hashes to `{actual[:len(q)]}…`")
        claimed = re.search(r"Measured:\s*\*\*([\d,]+)\s*words", body)
        if not claimed:
            findings.append(
                f"{rel} — no `Measured: **N words` anchor; the word-count "
                f"predicate has nothing to recompute against, and a skipped "
                f"predicate is unverified, not passing")
        else:
            c = int(claimed.group(1).replace(",", ""))
            if c != words:
                findings.append(f"{rel} — claims {c:,} words; the declared "
                                f"mandatory set is {words:,}")
    n_fixtures = len(items)
    examined = 2 * n_fixtures
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-18  context fixtures recompute", examined, len(findings),
            "measurement",
            note=(f"{n_fixtures} fixture(s) × 2 predicates (digest, word "
                  f"count) — the denominator is computed, never incremented "
                  f"per predicate found" if examined
                  else "no reproducible fixtures found"),
            details=findings)


#: Metadata scalars and declared non-pin sections. Both are enumerated and
#: printed rather than pattern-matched: a rule broad enough to infer them
#: would also let a pin leave the population unnoticed (defect class 11).
LOCK_META_KEYS = ("version", "as_of", "recomputed_in_session")
LOCK_NONPIN_SECTIONS = ("not_locked", "verification")
#: Adding a forge is a deliberate edit, never a silent widening.
LOCK_FORGE_ALLOW = ("github.com",)
LOCK_LOCATOR_FIELDS = ("repository", "source", "url", "root_path")
LOCK_DISPOSITIONS = ("open", "absorbed", "declined", "superseded", "surfaced")
SHA1_RE = re.compile(r"^[0-9a-f]{40}$")
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
#: A locator that only resolves on one machine. `%USERPROFILE%` is included
#: because the rule is about machine-locality, not about POSIX.
LOCAL_LOCATOR = re.compile(r"^(/|~|\./|\.\./)|^file://|/home/|/Users/|%USERPROFILE%")
GITHUB_PATH_SEG = r"[A-Za-z0-9](?:[A-Za-z0-9._-]*[A-Za-z0-9])?"


def _yaml_lite(text):
    """Indentation parser for exactly the YAML subset the substrate lock uses.

    Not a YAML implementation, and not trying to be: it handles `key: value`,
    `key:` opening a nested block, `- key: value` opening a list item, and the
    `>-` / `|` block scalars. Anything it cannot classify is returned as a
    parse error rather than skipped — a silent skip is how CG-18 examined four
    of eight fixtures while printing a denominator of eight.

    Returns (data, errors).
    """
    rows = []
    for n, raw in enumerate(text.splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        rows.append([n, len(raw) - len(raw.lstrip()), raw.strip()])
    errors = []
    kv = re.compile(r"^([A-Za-z_][\w.\-]*):\s*(.*)$")

    def parse(pos, indent):
        if pos >= len(rows) or rows[pos][1] < indent:
            return {}, pos
        if rows[pos][2].startswith("- "):
            out = []
            while (pos < len(rows) and rows[pos][1] == indent
                   and rows[pos][2].startswith("- ")):
                n, ind, s = rows[pos]
                inner, rest = ind + 2, s[2:]
                # A sequence entry is either a mapping (`- path: x`) or a
                # plain scalar (`- "git clone …"`, as the lock's verification
                # commands are). Treating the second as the first is what made
                # three shell commands read as unparseable lines.
                if not kv.match(rest):
                    out.append(rest.strip('"'))
                    pos += 1
                    continue
                rows[pos] = [n, inner, rest]   # the item's first key
                item, pos = parse(pos, inner)
                out.append(item)
            return out, pos
        out = {}
        while pos < len(rows) and rows[pos][1] == indent:
            n, _, s = rows[pos]
            if s.startswith("- "):
                break
            m = kv.match(s)
            if not m:
                errors.append(f"line {n}: unparseable — {s[:60]}")
                pos += 1
                continue
            key, val = m.group(1), m.group(2).strip()
            pos += 1
            if val in (">-", ">", ">+", "|", "|-", "|+"):
                buf = []
                while pos < len(rows) and rows[pos][1] > indent:
                    buf.append(rows[pos][2])
                    pos += 1
                out[key] = " ".join(buf)
            elif val == "":
                if pos < len(rows) and rows[pos][1] > indent:
                    out[key], pos = parse(pos, rows[pos][1])
                else:
                    out[key] = {}
            else:
                out[key] = val.strip('"')
        return out, pos

    data, end = parse(0, 0)
    if end < len(rows):
        errors.append(f"line {rows[end][0]}: parse stopped early — "
                      f"{rows[end][2][:60]}")
    return data, errors


def _lock_revision_groups(name, pin):
    """The (label, group) pairs a git-pinned substrate declares.

    `th_engineering` nests `adopted:` and `installed:`; the other two carry
    their revision fields at pin level. Both shapes are real, so the check
    reads the shape rather than assuming one.
    """
    groups = [(f"{name}.{k}", v) for k, v in pin.items()
              if isinstance(v, dict) and "commit" in v]
    if groups:
        return groups
    return [(name, pin)] if "commit" in pin else []


def cg19_substrate_lock(res, body=None, policy=None):
    """Substrate pins are complete, well-formed, and internally consistent.

    The engineering substrate this project's craft policy came from was pinned
    to a founder-machine path. Nothing mechanical could see it, so the pin's
    own drift rule was due to fire and did not — the installed tree had moved
    two commits past what the owner approved.

    **RESIDUAL LIMIT — what this check does not establish.** It makes no
    network call and resolves nothing upstream. It establishes that each pin
    carries a complete, well-formed, non-machine-local locator that a human
    with network access can verify in one step, and that the lock is
    internally consistent. It does **not** and cannot establish that the named
    repository exists, that the named commit is reachable in it, that the
    repository is still public, or that the recorded digests match the bytes
    upstream. **A pin to a deleted repository at a fabricated commit passes
    this check by design** — fixture `F6e` is kept in `--selftest` for the sole
    purpose of keeping that boundary executable rather than merely written
    down. Upstream agreement is established only by the human step the lock
    records under `verification:`, and claimed only by a dated clone report.

    The earlier name, *"substrate pins publicly resolvable"*, asserted the half
    it cannot do. It was renamed for that reason (RC10-P). The identifier is
    unchanged: identifiers are amended in place, never renumbered.
    """
    label = "CG-19  substrate pins complete and well-formed; drift consistent"
    text = body if body is not None else read(SUBSTRATE_LOCK)
    if not text:
        res.add("WARN", label, 0, 0, "check",
                note=f"{SUBSTRATE_LOCK} unreadable")
        return
    data, parse_errors = _yaml_lite(text)
    findings = [f"lock does not parse — {e}" for e in parse_errors]
    examined = 0
    population = []

    # P1 — every top-level key is classified. A pin cannot leave the
    # denominator quietly by being renamed or demoted.
    pins = {}
    for key, val in data.items():
        examined += 1
        if key in LOCK_META_KEYS or key in LOCK_NONPIN_SECTIONS:
            continue
        if not isinstance(val, dict):
            findings.append(f"`{key}` — top-level key is neither a declared "
                            f"metadata scalar {LOCK_META_KEYS}, a declared "
                            f"non-pin section {LOCK_NONPIN_SECTIONS}, nor a "
                            f"pin block; unclassified is unverified")
            continue
        pins[key] = val

    for name, pin in pins.items():
        groups = _lock_revision_groups(name, pin)
        version_declared = "installed_version" in pin
        # P2 — a pin declares a kind and carries that kind's full field set.
        # A pin this check cannot classify is unverified, not passing.
        examined += 1
        if not groups and not version_declared:
            findings.append(f"`{name}` — declares neither a `commit` "
                            f"(git-pinned) nor an `installed_version` "
                            f"(version-declared); unclassifiable pins are "
                            f"unverified, not passing")
            continue
        population.append(f"{name} — {'git-pinned' if groups else 'version-declared'}, "
                          f"{len(pin)} field(s)")
        if version_declared and not groups:
            examined += 1
            if not pin.get("digest_or_lock_reference"):
                findings.append(f"`{name}` — version-declared with no "
                                f"`digest_or_lock_reference` saying why "
                                f"nothing is pinned")
        # P7 — visibility is declared, and public, for git-pinned substrates.
        # Undeclared is Unknown, and Unknown is not public (VIS-2).
        if groups:
            examined += 1
            vis = pin.get("visibility")
            if vis is None:
                findings.append(f"`{name}` — git-pinned with no `visibility`; "
                                f"undeclared is Unknown, and Unknown is not "
                                f"public")
            elif vis != "public":
                findings.append(f"`{name}` — `visibility: {vis}`; a "
                                f"non-public substrate is not resolvable from "
                                f"a clone")
        # P5/P6 — locator hygiene and forge grammar, read from the *value of
        # the locator field*, never from prose elsewhere in the block.
        # A flat git-pin is its own revision group, so `[(name, pin)] + groups`
        # would scan the same mapping twice and report every locator finding
        # in it twice. Dedupe by identity, not by name.
        holders, seen_ids = [], set()
        for owner, holder in [(name, pin)] + groups:
            if id(holder) in seen_ids:
                continue
            seen_ids.add(id(holder))
            holders.append((owner, holder))
        for field in LOCATOR_SCAN_FIELDS:
            for owner, holder in holders:
                val = holder.get(field)
                if not isinstance(val, str):
                    continue
                examined += 1
                if LOCAL_LOCATOR.search(val):
                    findings.append(
                        f"`{owner}.{field}` — `{val}` is machine-local; a "
                        f"public URL elsewhere in the block does not make the "
                        f"locator resolvable")
                elif field != "root_path" and "://" in val:
                    findings.extend(_lock_url_findings(owner, field, val))
        # P3/P4 — object ids and per-file digests.
        for gname, g in groups:
            examined += 1
            missing = [f for f in ("root_path", "git_tree", "relevant_paths")
                       if not g.get(f)]
            if missing:
                findings.append(f"`{gname}` — git-pinned revision group "
                                f"missing {', '.join(missing)}")
            for field, rx, kind in (("commit", SHA1_RE, "git object id"),
                                    ("git_tree", SHA1_RE, "git object id")):
                val = g.get(field)
                if val is None:
                    continue
                examined += 1
                if not rx.match(str(val)):
                    findings.append(
                        f"`{gname}.{field}` — `{val}` is not a full "
                        f"lowercase 40-hex {kind}; an abbreviation that is "
                        f"unambiguous today can collide later")
            root = g.get("root_path") or ""
            for entry in g.get("relevant_paths") or []:
                if not isinstance(entry, dict):
                    continue
                examined += 1
                p, digest = entry.get("path"), entry.get("sha256")
                if not digest:
                    findings.append(f"`{gname}` — listed path `{p}` carries "
                                    f"no `sha256`; an unpinned file inside a "
                                    f"pinned tree is unverifiable")
                elif not SHA256_RE.match(str(digest)):
                    findings.append(f"`{gname}` — `{p}` has `sha256: "
                                    f"{digest}`, not 64 lowercase hex")
                if p and LOCAL_LOCATOR.search(p):
                    findings.append(f"`{gname}` — path `{p}` is machine-local; "
                                    f"a valid digest does not launder it")
                elif p and root and not p.startswith(root.rstrip("/") + "/") \
                        and p != root:
                    findings.append(f"`{gname}` — path `{p}` is outside the "
                                    f"group's `root_path: {root}`")
        # P8 — drift is derived from the two groups, then compared against
        # what the lock asserts. Today the assertion is checked by nothing.
        findings.extend(_lock_drift_findings(name, pin, groups))
        examined += 1

    status = "FAIL" if findings else ("OK" if examined else "WARN")
    res.add(status, label, examined, len(findings), "predicate evaluation",
            note=None if examined else "no pins classified",
            details=findings)
    res.add("WARN", "CG-19b substrate pin population", len(population), 0,
            "pin", note="report-only — a pin leaving this list is visible "
                        "here even when CG-19 stays green",
            details=sorted(population))


LOCATOR_SCAN_FIELDS = LOCK_LOCATOR_FIELDS


def _lock_url_findings(owner, field, val):
    """Forge grammar, against a printed allowlist. Closes the malformed and
    non-forge halves of "nonexistent host/repo" — never the existence half."""
    m = re.match(r"^(\w+)://([^/]+)(/.*)?$", val)
    if not m:
        return [f"`{owner}.{field}` — `{val}` is not a parseable URL"]
    scheme, host, path = m.group(1), m.group(2), m.group(3) or ""
    out = []
    if scheme != "https":
        out.append(f"`{owner}.{field}` — scheme `{scheme}`; only `https` is "
                   f"resolvable without credentials")
    if "@" in host or ":" in host:
        out.append(f"`{owner}.{field}` — host `{host}` carries userinfo or a "
                   f"port; a pin must be a plain public locator")
    if host not in LOCK_FORGE_ALLOW:
        out.append(f"`{owner}.{field}` — host `{host}` is outside the forge "
                   f"allowlist {LOCK_FORGE_ALLOW}; adding a forge is a "
                   f"deliberate edit, never a silent widening")
        return out
    segs = [s for s in path.split("/") if s]
    if len(segs) != 2:
        out.append(f"`{owner}.{field}` — `{path or '/'}` is not `owner/repo` "
                   f"({len(segs)} segment(s)); a tree or blob URL is not a "
                   f"repository locator")
    elif not all(re.fullmatch(GITHUB_PATH_SEG, s) for s in segs):
        out.append(f"`{owner}.{field}` — `{path}` is not a valid owner/repo "
                   f"pair for {host}")
    elif path.endswith("/") or segs[-1].endswith(".git"):
        out.append(f"`{owner}.{field}` — `{path}` carries a `.git` suffix or "
                   f"trailing slash; pin the canonical form")
    return out


def _lock_drift_findings(name, pin, groups):
    """Derive drift from adopted-vs-installed, then check the assertion.

    The old check asked only whether a `status:` token appeared *somewhere in
    the pin*. That is defeated by any unrelated `..._status: open` key, and it
    never compared the two revision groups it was sitting on top of — so a
    deleted `drift:` block over genuinely drifted content read as clean.
    """
    named = {k.rsplit(".", 1)[-1]: g for k, g in groups}
    adopted, installed = named.get("adopted"), named.get("installed")
    drift = pin.get("drift") if isinstance(pin.get("drift"), dict) else None
    if not (adopted and installed):
        return []

    def digests(g):
        return {e.get("path"): e.get("sha256")
                for e in (g.get("relevant_paths") or [])
                if isinstance(e, dict) and e.get("path")}

    a, i = digests(adopted), digests(installed)
    shared = set(a) & set(i)
    differing = {p for p in shared if a[p] != i[p]}
    only_one = (set(a) ^ set(i))
    derived = bool(differing) or adopted.get("commit") != installed.get("commit")
    out = []
    if only_one:
        out.append(f"`{name}` — {len(only_one)} path(s) present in one "
                   f"revision group and absent from the other "
                   f"({', '.join(sorted(only_one))}); an added or removed file "
                   f"is drift this table's shape cannot describe")
    if derived and not drift:
        out.append(f"`{name}` — adopted and installed differ, and the pin "
                   f"declares no `drift:` group; silent drift is the defect "
                   f"this lock exists to prevent")
        return out
    if not drift:
        return out
    asserted = str(drift.get("detected", "")).lower() == "true"
    if asserted != derived:
        out.append(f"`{name}` — `drift.detected: {drift.get('detected')}` but "
                   f"the recorded digests and commits say "
                   f"{'differ' if derived else 'agree'}")
    listed = {}
    for e in drift.get("changed_paths") or []:
        if isinstance(e, dict) and e.get("path"):
            listed[e["path"]] = e
    for p in sorted(differing):
        if not any(p.endswith(q) or q.endswith(p) for q in listed):
            out.append(f"`{name}` — `{p}` differs between the two revision "
                       f"groups and is absent from `drift.changed_paths`")
    for q, e in sorted(listed.items()):
        match = [p for p in shared if p.endswith(q) or q.endswith(p)]
        if not match:
            continue
        claimed = str(e.get("material", "")).lower() == "true"
        actually = match[0] in differing
        if claimed and not actually:
            out.append(f"`{name}` — `{q}` is marked `material: true` but is "
                       f"byte-identical in both revision groups; a "
                       f"materiality claim over identical content is a false "
                       f"record")
        if not claimed and actually:
            out.append(f"`{name}` — `{q}` is marked `material: false` but its "
                       f"digests differ between the two groups")
    # Read the disposition from *inside* the drift group. The old block-scoped
    # test was defeated by any unrelated `..._status:` key in the same pin.
    #
    # The key is `disposition`, not `status`. It was `status` until 2026-08-06,
    # when CG-22 caught it: this check's own header calls the value a
    # disposition, and `status` is the one word the term registry §1 forbids
    # because five closed vocabularies answer to it. A legacy `status:` key is
    # reported rather than silently accepted — an unread key is a silent drift,
    # which is the defect this group exists to prevent.
    if "status" in drift and "disposition" not in drift:
        out.append(f"`{name}` — drift group uses the ambiguous key `status:`; "
                   f"rename to `disposition:` (term registry §1, CG-22)")
    disposition = str(drift.get("disposition", "")).strip()
    first = (re.split(r"[\s—:,-]", disposition, 1)[0].lower()
             if disposition else "")
    if not disposition:
        out.append(f"`{name}` — declares drift with no `disposition`; silent "
                   f"drift is the defect this lock exists to prevent")
    elif first not in LOCK_DISPOSITIONS:
        out.append(f"`{name}` — `drift.disposition: {disposition}` does not "
                   f"open with a disposition from {LOCK_DISPOSITIONS}")
    return out


# --------------------------------------------------------- self-test

BATTERY_STATUS_FILE = "PROJECT-STATUS.md"
BATTERY_WORKFLOW_FILE = ".github/workflows/governance-docs.yml"
BATTERY_HEADING = "## How to verify this page"

#: Written as words because that is how the claim is written. A digit form
#: would silently miss the sentence this check exists to police.
_NUMBER_WORDS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
    "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
    "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
    "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90,
}


def _number_below_hundred(value):
    """Parse one count word from zero through ninety-nine (hyphen allowed)."""
    parts = value.split("-")
    if len(parts) == 1:
        return _NUMBER_WORDS.get(parts[0])
    if (len(parts) == 2
            and _NUMBER_WORDS.get(parts[0], 0) >= 20
            and _NUMBER_WORDS.get(parts[0], 0) % 10 == 0
            and 1 <= _NUMBER_WORDS.get(parts[1], 0) <= 9):
        return _NUMBER_WORDS[parts[0]] + _NUMBER_WORDS[parts[1]]
    return None


def _number_word(value):
    """Parse an English count phrase from zero through nine hundred ninety-nine.

    Accepts `ninety-nine`, `one hundred`, `one hundred and five`,
    `one hundred five` and `two hundred and thirteen`. A dangling `and`, a
    `hundred` without a leading one-to-nine word, or a zero tail after
    `hundred` is unreadable (None), never guessed.
    """
    chunks = value.lower().split()
    if not chunks:
        return None
    if len(chunks) == 1:
        return _number_below_hundred(chunks[0])
    if chunks[1] != "hundred":
        return None
    lead = _NUMBER_WORDS.get(chunks[0], 0)
    if not 1 <= lead <= 9:
        return None
    rest = chunks[2:]
    if rest and rest[0] == "and":
        rest = rest[1:]
        if not rest:
            return None
    if not rest:
        return lead * 100
    if len(rest) != 1:
        return None
    tail = _number_below_hundred(rest[0])
    if not tail:
        return None
    return lead * 100 + tail


def _battery_commands(sh_block):
    """Normalise a shell block into comparable command strings.

    Shell-variable definitions are consumed, not compared: `CS=…` exists so
    the published block stays readable, and expanding it here is what makes
    the two lists comparable at all.
    """
    assigns, cmds = {}, []
    for raw in sh_block.split("\n"):
        line = raw.split("#")[0].strip()
        if not line:
            continue
        def expand(s):
            # Repeat to a fixed point: one shorthand may be defined in terms
            # of another (`DR=$CS/…`), and a single pass would leave the
            # inner name unexpanded and report a phantom divergence.
            for _ in range(len(assigns) + 1):
                before = s
                for name, val in assigns.items():
                    s = s.replace(f"${name}", val)
                if s == before:
                    break
            return s

        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(\S+)$", line)
        if m:
            assigns[m.group(1)] = expand(m.group(2))
            continue
        cmds.append(" ".join(expand(line).split()))
    return cmds


def cg26_battery_parity(res, status=None, workflow=None):
    """The published battery and the hosted battery are one list.

    `PROJECT-STATUS.md` publishes a block of commands and states, in its own
    voice, that they are the same checks the hosted workflow runs. That
    sentence exists so a reader cannot conflate "hosted CI is green" with
    "the battery is clean" — and on 2026-08-13 the sentence was false three
    ways at once: the published block held thirteen commands while claiming
    fourteen, the hosted workflow ran fourteen steps, and only twelve were
    shared. Two hosted-only steps exercised the dry-run administration record
    that no local reader ever ran.

    Nothing caught it, because the two lists were maintained by hand in two
    files and the claim that they agreed was maintained by hand in a third
    place — the sentence itself.

    **What is compared, and what is not.** Only `python3` invocations are
    checks. A published line like `git tag --list 'doctrine-*'` is
    orientation: it prints information and cannot fail, so requiring the
    hosted job to run it would be noise. Such lines are reported, never
    compared. What must agree exactly is the set of `python3` commands.

    **RESIDUAL LIMIT.** This establishes that the two lists name the same
    commands. It does not establish that either list is *complete* — a check
    absent from both files is invisible here, and no denominator of
    "checks that ought to run" exists to compare against.
    """
    label = "CG-26  published battery and hosted battery are one list"
    status_text = status if status is not None else read(BATTERY_STATUS_FILE)
    wf_text = workflow if workflow is not None else read(BATTERY_WORKFLOW_FILE)
    if not status_text or not wf_text:
        res.add("WARN", label, 0, 0, "list",
                note="one of the two files is unreadable — parity is "
                     "Unknown, which is not the same as clean")
        return

    m = re.search(re.escape(BATTERY_HEADING) + r".*?```sh\n(.*?)```",
                  status_text, re.S)
    if not m:
        res.add("FAIL", label, 1, 1, "list",
                details=[f"{BATTERY_STATUS_FILE} — no `sh` block under "
                         f"`{BATTERY_HEADING}`. The published battery is the "
                         f"denominator of every 'the battery is clean' claim; "
                         f"if it cannot be found, that claim has no subject"])
        return

    published = _battery_commands(m.group(1))
    hosted = [" ".join(x.split())
              for x in re.findall(r"^\s*run:\s*(.+?)\s*$", wf_text, re.M)]

    pub_checks = {c for c in published if c.startswith("python3 ")}
    host_checks = {c for c in hosted if c.startswith("python3 ")}
    orientation = [c for c in published if not c.startswith("python3 ")]

    findings = []
    for c in sorted(pub_checks - host_checks):
        findings.append(f"published but not hosted — `{c}`. A reader running "
                        f"the published block exercises a check the hosted "
                        f"run never does, so a green hosted run is the weaker "
                        f"claim")
    for c in sorted(host_checks - pub_checks):
        findings.append(f"hosted but not published — `{c}`. A reader running "
                        f"the published block believes they ran the battery "
                        f"and did not")

    # The stated count is a third hand-maintained copy of the same fact.
    # The phrase may span several words (`one hundred and five`) and the
    # sentence may wrap across lines, so whitespace is `\s+`.
    word = r"[a-z]+(?:-[a-z]+)*"
    phrase = rf"{word}(?:\s+{word})*?"
    claims = list(re.finditer(
        rf"\bThe ({phrase})\s+checks\s+above\s+are\s+the\s+same\s+"
        rf"({phrase})\s+the\s+hosted\s+workflow\s+runs\b",
        status_text))
    if not claims:
        # Message only: the match above stays case-sensitive. A sentence that
        # matches only ignoring case is named, so the reason is not hidden.
        folded = re.search(
            rf"\bThe ({phrase})\s+checks\s+above\s+are\s+the\s+same\s+"
            rf"({phrase})\s+the\s+hosted\s+workflow\s+runs\b",
            status_text, re.I)
        case_note = ("; a sentence matching only when case is ignored was "
                     "found, and the match is case-sensitive (lower-case "
                     "number words)" if folded else "")
        findings.append(
            "no parity count sentence matched `The <N> checks above are the "
            "same <N> the hosted workflow runs`; a count this check cannot "
            "find is a count it cannot police, and skipping it would read "
            "as agreement" + case_note)
    for claim in claims:
        said = _number_word(claim.group(1))
        also = _number_word(claim.group(2))
        for n, which in ((said, "published"), (also, "hosted")):
            if n is None:
                findings.append(
                    f"the parity sentence says `{' '.join(claim.group(0).split())}`"
                    f" and this check cannot read one of its numbers as a "
                    f"word; a number it cannot read is a number it cannot "
                    f"police")
                break
        else:
            if said != len(pub_checks):
                findings.append(
                    f"the parity sentence claims {said} published checks; the "
                    f"block holds {len(pub_checks)}")
            if also != len(host_checks):
                findings.append(
                    f"the parity sentence claims {also} hosted checks; the "
                    f"workflow runs {len(host_checks)}")

    examined = len(pub_checks | host_checks)
    note = (f"{len(pub_checks)} published, {len(host_checks)} hosted, "
            f"{len(pub_checks & host_checks)} shared")
    details = findings + [
        f"[orientation, not compared] {c}" for c in orientation]
    res.add("FAIL" if findings else "OK", label, examined, len(findings),
            "check", note=note, details=details)


# --------------------------------------------------------------- CG-27

#: CG-27's population — the files a newcomer reads *before* choosing what to
#: open next. Declared as a literal so the check prints its own denominator
#: (verification rule 9: a claim of absence needs a sweep with a denominator).
#:
#: `PROJECT-STATUS.md` is deliberately **absent**. It is the owning record for
#: wave, gate and launch state; requiring it to cite itself would be circular,
#: and its currency is a different problem with a different owner.
CURRENCY_DEFAULT_PATH = (
    "README.md",
    "AGENTS.md",
    "PROCESS-GLOSSARY.md",
    "CONTRIBUTING.md",
    ".syzygy/intent/OVERVIEW.md",
    ".syzygy/governance/decisions/README.md",
    ".syzygy/governance/contracts/candidates/TASK-ROUTER.md",
    ".syzygy/governance/contracts/candidates/FIRST-OPENSPEC-SEQUENCE.md",
)

#: One class per kind of current-state claim, with the record that owns the
#: answer and the pattern that recognises an *assertion* rather than a
#: mention. Naming the class matters: a banner that names PROJECT-STATUS.md
#: makes wave claims derivable and says nothing about the gate's version.
CURRENCY_CLASSES = (
    ("wave", "PROJECT-STATUS.md",
     re.compile(r"\bWaves?\s+(?:A|B|A\s*(?:and|\+)\s*B)\b"
                r"(?:(?!\n\n).){0,120}?"
                r"\b(?:accepted|unaccepted|confirmed|offered|installed|"
                r"performed|blocking|satisfied|complete)\b",
                re.S | re.I)),
    ("gate-version", "launch-gate-pre-specifications.md",
     re.compile(r"\b(?:launch[- ]gate|gate)\b(?:(?!\n\n).){0,80}?"
                r"\bv\d+\.\d+\b", re.S | re.I)),
    ("gate-verdict", "PROJECT-STATUS.md",
     re.compile(r"\b(?:NOT READY|GATE VERDICT)\b", re.I)),
    # The window was 100 characters until a repair to TASK-ROUTER.md's prose
    # pushed its state word past it and the claim silently left the
    # denominator — a repair that quieted the check instead of satisfying it,
    # which is the exact failure CC-KNOW-17 names. 240 is the paragraph-scale
    # figure that keeps that sentence in; the number is arbitrary and is
    # printed with the denominator so a reader can judge it.
    ("prerequisite", "PENDING-OWNER-DECISIONS.md",
     re.compile(r"\bP-\d+\b(?:(?!\n\n).){0,240}?"
                r"\b(?:satisfied|waived|ruled|resolved|answered|closed)\b",
                re.S | re.I)),
)

#: A paragraph that says it is talking about the past is not asserting current
#: state, and the charter's fifth fixture is exactly this case.
CURRENCY_HISTORICAL = re.compile(
    r"\b(?:histor\w*|superseded|retired|previously|formerly|no longer|"
    r"used to|at the time|as it stood|prior revision)\b", re.I)

#: An assertion carrying its own as-of satisfies CC-KNOW-11's currency limb
#: without naming an owning record: the reader can see how old the claim is.
CURRENCY_ASOF = re.compile(
    r"(?:\bas of\b|\bcounted\b|\bcorrected\b|\badded\b|\bmeasured\b)[^\n]{0,40}"
    r"\b20\d\d-\d\d-\d\d\b|\b20\d\d-\d\d-\d\d\b[^\n]{0,20}"
    r"(?:\bas of\b|\bcounted\b|\bcorrected\b)", re.I)


def _leading_banner(body):
    """The blockquote block at the top of a file, if it has one.

    A precedence banner is only visible if a reader meets it before the
    prose it governs, so only the *leading* blockquote counts. A `>` block
    four screens down governs nothing a reader has already believed.
    """
    lines, out = body.splitlines(), []
    i = 0
    while i < len(lines) and (not lines[i].strip()
                              or lines[i].lstrip().startswith("#")):
        i += 1
    while i < len(lines) and (lines[i].startswith(">") or
                              (out and not lines[i].strip())):
        if lines[i].startswith(">"):
            out.append(lines[i])
        i += 1
    return "\n".join(out)


_GFM_FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
_GFM_DELIMITER_CELL = re.compile(r"^:?-{3,}:?$")


def _ends_with_unescaped_pipe(text):
    """Whether ``text`` ends in a pipe preceded by an even slash run."""
    if not text.endswith("|"):
        return False
    backslashes = 0
    for char in reversed(text[:-1]):
        if char != "\\":
            break
        backslashes += 1
    return backslashes % 2 == 0


def _gfm_row_cells(line):
    """Return cells for a plausible GFM row, or ``None``.

    This is intentionally only the small grammar needed to distinguish a
    table block from prose. A multi-column row needs an unescaped pipe; a
    boundary-pipe row may contain one cell. Indentation deep enough for an
    indented code block is not a table. Escaped pipes stay in their cell so
    they cannot manufacture a table.
    """
    leading = line[:len(line) - len(line.lstrip())]
    if (not line.strip() or "\t" in leading or
            len(line) - len(line.lstrip(" ")) > 3):
        return None

    text = line.strip()
    cells, start, escaped = [], 0, False
    for i, char in enumerate(text):
        if char == "\\" and not escaped:
            escaped = True
            continue
        if char == "|" and not escaped:
            cells.append(text[start:i].strip())
            start = i + 1
        escaped = False
    cells.append(text[start:].strip())

    # Leading/trailing pipes are optional in GFM. Remove only the empty
    # boundary cells they introduce; an empty interior cell is valid.
    if text.startswith("|"):
        cells = cells[1:]
    if _ends_with_unescaped_pipe(text):
        cells = cells[:-1]
    has_boundary = text.startswith("|") or _ends_with_unescaped_pipe(text)
    return (tuple(cells)
            if len(cells) >= 2 or (has_boundary and cells) else None)


def _gfm_data_row(line):
    """Whether ``line`` can continue a recognized GFM table body.

    GFM fills missing cells, so a data row need not contain a pipe. The table
    header and delimiter establish the table; thereafter a nonblank line at
    ordinary paragraph indentation remains a row in the deliberately small
    grammar CG-27 needs.
    """
    leading = line[:len(line) - len(line.lstrip())]
    return (bool(line.strip()) and "\t" not in leading and
            len(line) - len(line.lstrip(" ")) <= 3)


def _gfm_table_start(lines, index, fenced):
    """Return the header width when ``lines[index:index + 2]`` starts a table."""
    if index + 1 >= len(lines) or fenced[index] or fenced[index + 1]:
        return None
    header = _gfm_row_cells(lines[index])
    delimiter = _gfm_row_cells(lines[index + 1])
    if header is None or delimiter is None or len(header) != len(delimiter):
        return None
    if not all(_GFM_DELIMITER_CELL.fullmatch(cell) for cell in delimiter):
        return None
    return len(header)


def _currency_contexts(body):
    """Split currency claims into blank-line contexts, or GFM table rows.

    Ordinary prose retains CG-27's paragraph semantics. A genuine GFM table
    (header, matching delimiter row, and subsequent nonblank data rows) is
    the supported exception: each header/data row is independently checked so
    a historical, owner, or as-of token in a sibling row cannot satisfy the
    current claim. Fenced code is left in ordinary contexts and malformed or
    lone-pipe lines never create row boundaries.
    """
    lines = body.splitlines()
    if not lines:
        return []

    fenced, in_fence, fence_char, fence_width = [], False, None, 0
    for line in lines:
        fenced.append(in_fence)
        marker = _GFM_FENCE.match(line)
        if marker:
            run = marker.group(1)
            char = run[0]
            if not in_fence:
                info = line[marker.end():]
                if char == "`" and "`" in info:
                    continue
                in_fence, fence_char, fence_width = True, char, len(run)
            elif (char == fence_char and len(run) >= fence_width and
                  not line[marker.end():].strip()):
                in_fence, fence_char, fence_width = False, None, 0

    contexts, paragraph = [], []

    def flush_paragraph():
        if paragraph:
            contexts.append("\n".join(paragraph))
            paragraph.clear()

    i = 0
    while i < len(lines):
        if _gfm_table_start(lines, i, fenced) is not None:
            flush_paragraph()
            contexts.append(lines[i])
            i += 2  # header and delimiter; the delimiter is not a row
            while (i < len(lines) and not fenced[i] and
                   _gfm_data_row(lines[i])):
                contexts.append(lines[i])
                i += 1
            continue

        paragraph.append(lines[i])
        if not lines[i].strip():
            flush_paragraph()
        i += 1

    flush_paragraph()
    return contexts


def cg27_default_path_currency(res, corpus=None):
    """A default-path file asserting current state derives it, or banners it.

    **The rule and its home.** `CC-KNOW-11` second paragraph — *"Prose
    asserting what is currently true carries its as-of revision and is never
    the sole source for the fact it states."* That clause lives in the
    **candidate** knowledge-hygiene policy (item P-12), so this check is
    downgraded to WARN until the owner rules; see `PYTHON_ONLY_RULES`'
    sibling table. The clause is the ceiling, and this check deliberately
    enforces less than it: CC-KNOW-11 requires *both* an as-of *and* a
    non-sole source, while this accepts *either* a derivation or a visible
    precedence banner. A check that under-enforces its clause is safe; one
    that over-enforces invents obligation nobody approved.

    **What counts as satisfied**, per assertion context, in this order:

    1. the context is talking about the past — `CURRENCY_HISTORICAL`;
    2. the context names the record that owns that class of fact;
    3. the file's **leading** banner names it — a precedence banner scoped
       to the owner is what makes the claim derivable, which is why a banner
       naming `PROJECT-STATUS.md` does nothing for a gate-version claim;
    4. the assertion carries its own as-of date.

    A genuine GFM table is segmented into one context per header/data row.
    This is deliberately narrower than treating every pipe-containing line
    as a row: only a valid header plus matching GFM delimiter and contiguous
    rows qualify. Malformed or lone-pipe prose retains paragraph semantics.
    The file's leading banner remains file-scoped, while paragraph and table
    row evidence remains local to the assertion.

    **RESIDUAL LIMIT, and it is the important one.** This never checks
    whether a claim is *true*. It checks whether a reader who meets the
    claim can tell where to go if it is wrong. A file that cites
    `PROJECT-STATUS.md` beside a claim that flatly contradicts it passes
    here — what fails is the claim that stands alone with nothing to
    check it against.
    """
    label = "CG-27  default-path current-state claims are derived or bannered"
    if corpus is None:
        corpus = []
        for rel in CURRENCY_DEFAULT_PATH:
            try:
                corpus.append((rel, read(rel)))
            except OSError:
                corpus.append((rel, None))

    findings, examined, unreadable = [], 0, []
    for rel, body in corpus:
        if body is None:
            unreadable.append(rel)
            continue
        banner = _leading_banner(body)
        for cls, owner, pat in CURRENCY_CLASSES:
            for context in _currency_contexts(body):
                for m in pat.finditer(context):
                    examined += 1
                    if CURRENCY_HISTORICAL.search(context):
                        continue
                    if owner in context or owner in banner:
                        continue
                    if CURRENCY_ASOF.search(context):
                        continue
                    quote = " ".join(m.group(0).split())[:90]
                    findings.append(
                        f"{rel} — `{cls}` claim with nothing to check it "
                        f"against: \"{quote}\". Name `{owner}`, which owns "
                        f"this fact, in the paragraph or its table row, or "
                        f"in the file's leading banner; or carry an as-of "
                        f"date")

    note = (f"{len(corpus) - len(unreadable)} of {len(CURRENCY_DEFAULT_PATH)} "
            f"default-path file(s) read, {len(CURRENCY_CLASSES)} claim class"
            f"(es)")
    if unreadable:
        note += f"; unreadable, so Unknown rather than clean: {unreadable}"
    if not examined:
        res.add("WARN", label, 0, 0, "claim",
                note=note + " — no current-state claim matched, and a "
                            "zero-count check reports WARN, never PASS")
        return
    res.add("FAIL" if findings else "OK", label, examined, len(findings),
            "claim", note=note, details=findings)


def _mutate(text, old, new):
    """Apply a selftest fixture mutation, raising loudly instead of
    silently discriminating nothing when `old` no longer occurs in
    `text` (syzygy-e84 — a no-op replace once reported a false pass)."""
    result = text.replace(old, new)
    if result == text:
        raise AssertionError(f"mutation did not apply: {old!r} not found")
    return result


def selftest():
    """Prove each new check can fail. A validator with no failing fixture is
    indistinguishable from a no-op, and this repository has shipped one.

    Each fixture below is a synthetic input crafted to trip exactly one
    check. The test asserts the check reports at least one finding on it —
    not that the repository is clean.
    """
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

    cases = []

    c = Cap(); cg13_dependency_graph(c, modules=[])
    cases.append(("CG-13 empty corpus warns, never passes",
                  c.rows[0][0] == "WARN"))

    c = Cap()
    fake = ".syzygy/governance/contracts/candidates/rfcs/RFC-0001-x.md"
    cases.append(("CG-13 dangling edge detected", None))
    cases[-1] = ("CG-13 dangling edge detected",
                 _selftest_dangling())

    # ---- CG-2, registry-driven. Four classes of retired-phrase quotation,
    # one fixture each, plus the wrap tolerance that the launch-gate pilot's
    # hand sweep lacked. `REG` is a synthetic registry: the fixtures must
    # exercise the parsing path too, or a registry that stopped parsing would
    # leave every fixture passing over an empty population.
    REG = (
        'version: 1\n'
        'current_phrases:\n'
        '  - id: wave-a\n'
        '    label: "ACCEPT FOUNDATIONAL WAVE A"\n'
        '    form: accept\n'
        '    argument: sha256\n'
        '    subject: "wave-manifests/WAVE-A-MANIFEST.txt"\n'
        'retired_phrases:\n'
        '  - label: "ACCEPT OLD RFCS"\n'
        '    retired_at: "2026-01-01"\n'
        '    replaced_by: "ACCEPT FOUNDATIONAL WAVE A"\n'
        'historical_marker_convention:\n'
        '  markers:\n'
        '    - "retired"\n'
        '  marker_window_lines: 2\n'
        '  currency_signals:\n'
        '    - "exact phrase"\n')

    c = Cap()
    cg2_retired_tokens([], c, registry=REG,
                       corpus=[("f.md", "write the ACCEPT OLD RFCS phrase")])
    cases.append(("CG-2a unmarked retired-phrase quotation detected",
                  c.rows[0][0] == "FAIL" and len(c.rows[0][4]) == 1))

    # (a) the wrap. `str.__contains__` and a line-based matcher both miss
    # this, and both were what the corpus had.
    c = Cap()
    cg2_retired_tokens([], c, registry=REG,
                       corpus=[("f.md", "the ACCEPT OLD\nRFCS gate")])
    cases.append(("CG-2a line-wrapped retired phrase detected",
                  c.rows[0][0] == "FAIL"
                  and "line wrap" in (c.rows[0][4] or [""])[0]))

    # (b) presented as current — the worse class, reported as its own.
    c = Cap()
    cg2_retired_tokens([], c, registry=REG,
                       corpus=[("f.md", "The exact phrase is\n"
                                        "`ACCEPT OLD RFCS: <digest>`")])
    cases.append(("CG-2a retired phrase presented as current detected",
                  c.rows[0][0] == "FAIL"
                  and any("presents the retired phrase" in d
                          for d in c.rows[0][4])))

    # (c) a marked quotation is lawful, counted under CG-2f, never silent.
    c = Cap()
    cg2_retired_tokens([], c, registry=REG,
                       corpus=[("f.md", "the retired `ACCEPT OLD RFCS`")])
    cases.append(("CG-2a marked historical quotation exempted and printed",
                  c.rows[0][0] == "OK" and len(c.rows[2][4]) == 1))

    c = Cap()
    cg2_retired_tokens([], c, registry=REG, corpus=[
        ("f.md", "# SUPERSEDED — old record\n\nACCEPT OLD RFCS\n")])
    cases.append(("CG-2a superseded-bannered file exempted",
                  c.rows[0][0] == "OK" and len(c.rows[2][4]) == 1))

    # An empty or unparseable registry must fail loudly. A phrase sweep over
    # zero declared phrases is the vacuous pass this battery exists to stop.
    c = Cap()
    cg2_retired_tokens([], c, registry="version: 1\n",
                       corpus=[("f.md", "ACCEPT OLD RFCS")])
    cases.append(("CG-2a empty phrase registry fails, never passes",
                  c.rows[0][0] == "FAIL"))

    # (d) a current phrase copied across a wrap with a stale argument.
    # CG-7d matches per line and is structurally blind to this shape.
    c = Cap()
    cg2e_wrapped_current_arguments(
        [], c, registry=REG, subjects={"ACCEPT FOUNDATIONAL WAVE A": "a" * 64},
        corpus=[("f.md", "ACCEPT FOUNDATIONAL WAVE\nA: " + "b" * 64)])
    cases.append(("CG-2e wrapped current phrase with a stale digest detected",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg2e_wrapped_current_arguments(
        [], c, registry=REG, subjects={"ACCEPT FOUNDATIONAL WAVE A": "a" * 64},
        corpus=[("f.md", "ACCEPT FOUNDATIONAL WAVE\nA: " + "a" * 64)])
    cases.append(("CG-2e wrapped current phrase with a live digest passes",
                  c.rows[0][0] == "OK" and c.rows[0][2] == 1))

    # The single-line population is CG-7d's; reporting it here too would
    # print one defect twice and teach a reader to ignore one of them.
    c = Cap()
    cg2e_wrapped_current_arguments(
        [], c, registry=REG, subjects={"ACCEPT FOUNDATIONAL WAVE A": "a" * 64},
        corpus=[("f.md", "ACCEPT FOUNDATIONAL WAVE A: " + "b" * 64)])
    cases.append(("CG-2e single-line quotation left to CG-7d",
                  c.rows[0][2] == 0))

    # ---- CG-4b, the inverse predicate. RD-17's mutation M8b rewrote the
    # package README's banner to claim the acts had happened and the battery
    # reported 0 FAIL over 40 checks; the negative keeps the three truthful
    # banners in this repository from reading as defects.
    c = Cap()
    cg4b_no_accepted_claim([], c, corpus=[
        ("README.md", "# Accepted contract package — IN FORCE\n\n"
                      "> Everything under this directory is accepted and "
                      "binding. The owner acceptance acts have all been "
                      "performed.\n")])
    cases.append(("CG-4b accepted-claim banner detected",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg4b_no_accepted_claim([], c, corpus=[
        ("README.md", "# Candidate contract package — NOT ACCEPTED\n\n"
                      "> No owner acceptance act has been performed over any "
                      "of it. Nothing here is accepted.\n")])
    cases.append(("CG-4b negated candidate banner exempted",
                  c.rows[0][0] == "OK"))

    history_dir = "docs/evidence/polaris-understanding-reconciliation-2026-09-28/"
    cases.append(("raw-review shape covers the reconciliation's history reviews only",
                  _is_raw_review(history_dir + "HISTORY-REVIEW-12-RAW.md")
                  and not _is_raw_review(history_dir + "HISTORY-REVIEW-03-RAW.md")
                  and not _is_raw_review(history_dir + "HISTORY-READING.md")
                  and not _is_raw_review("docs/evidence/other/HISTORY-REVIEW-1-RAW.md")
                  and not _is_raw_review("x/" + history_dir + "HISTORY-REVIEW-1-RAW.md")
                  and not _is_raw_review(history_dir + "HISTORY-REVIEW-1-RAW.md.orig")))

    c = Cap()
    cg4b_no_accepted_claim([], c, corpus=[])
    cases.append(("CG-4b empty candidate tree warns, never passes",
                  c.rows[0][0] == "WARN"))

    # Craft acts 6 and 7 bound two policies at their committed home inside
    # the candidate tree, so a banner naming that home may say they are in
    # force — and a banner claiming it while naming nothing act-bound may
    # not. The exempting names are computed from the bytes and the act
    # record, so this pair also fails if those acts are ever superseded.
    bound = f"{CANDIDATES}/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md"
    claim = ("> Two files under `%s` are **in force** by craft acts 6 and "
             "7.\n")
    c = Cap()
    cg4b_no_accepted_claim([bound], c, corpus=[
        ("README.md", "# Candidate contract package\n\n"
                      + claim % "policy-candidates/")])
    cases.append(("CG-4b acceptance claim naming an act-bound home exempted",
                  c.rows[0][0] == "OK"))

    c = Cap()
    cg4b_no_accepted_claim([bound], c, corpus=[
        ("README.md", "# Candidate contract package\n\n"
                      + claim % "history/")])
    cases.append(("CG-4b acceptance claim naming an unbound home detected",
                  c.rows[0][0] == "FAIL"))

    # A bold-closed sentence must not lend its attribution to the sentence
    # before it. Caught in review of the exemption itself: `in force.**`
    # defeated a naive sentence splitter, so an unattributed claim inherited
    # the next sentence's `policy-candidates/` and passed.
    c = Cap()
    cg4b_no_accepted_claim([bound], c, corpus=[
        ("README.md", "# Candidate contract package\n\n"
                      "> **Accepted contract package — everything here is "
                      "in force.**\n"
                      "> Craft acts 6 and 7 put two policies **in force** "
                      "under `policy-candidates/`.\n")])
    cases.append(("CG-4b bold-closed sentence lends no attribution",
                  c.rows[0][0] == "FAIL"))

    # ---- CG-7a/7b: the CG-7 family's act-argument predicates, which had no
    # fixture of their own — CG-7 counted as covered on CG-7e's strength
    # while the four checks guarding every owner act argument had none
    # (review RD-17 finding 3).
    cases.append(("CG-7a wave partition overlap detected",
                  _selftest_wave_partition("overlap")))
    cases.append(("CG-7a wave partition gap detected",
                  _selftest_wave_partition("gap")))
    cases.append(("CG-7b stale wave argument in the record detected",
                  _selftest_wave_partition("stale-arg")))
    cases.append(("CG-7a performed-wave current amendment is lawful",
                  _selftest_wave_partition("performed-current-amendment")))
    cases.append(("CG-7b tampered performed manifest detected",
                  _selftest_wave_partition("tampered-performed")))

    # ---- CG-7f: the count predicate finding 1 asked for. A wave row may
    # bind twenty modules under the words "the 19 modules" with every digest
    # correct, and nothing compared the two.
    c = Cap()
    cg7f_wave_counts(c, record=(
        "| A | `ACCEPT FOUNDATIONAL WAVE A: " + "0" * 64 + "` | "
        "The 19 modules of RFC 0001-0006 |"), wave_rows={"A": 20})
    cases.append(("CG-7f wave row undercounting its manifest detected",
                  c.rows[0][0] == "FAIL"
                  and "19 modules" in (c.rows[0][4] or [""])[0]))

    c = Cap()
    cg7f_wave_counts(c, record=(
        "| A | `ACCEPT FOUNDATIONAL WAVE A: " + "0" * 64 + "` | "
        "The 19 modules of RFC 0001-0006 |"), wave_rows={"A": 19})
    cases.append(("CG-7f matching count raises nothing for that row",
                  not any("19 modules" in d and "row(s)" in d
                          for d in c.rows[0][4])))

    # An ordinal is not a count: `RFC-0010 modules 1, 2, 3, 5` must not be
    # read as "1". This is the live shape of four of the six wave rows.
    c = Cap()
    cg7f_wave_counts(c, record=(
        "| D1 | `ACCEPT FOUNDATIONAL WAVE D1: " + "0" * 64 + "` | "
        "RFC-0010 modules 1, 2, 3, 5 plus the package index |"),
        wave_rows={"D1": 5})
    cases.append(("CG-7f ordinal module list is not read as a count",
                  not any("does not" in d or "has " in d
                          for d in c.rows[0][4] if "row(s) in the" not in d)))

    # ---- CG-7g: RD-17 finding 5's seventh manifest, which the generator
    # and CG-7a both reported clean.
    c = Cap()
    cg7g_wave_manifest_population(
        [], c, listing=[WAVE_MANIFESTS[w] for w in WAVE_IDS]
        + [f"{CANDIDATES}/wave-manifests/WAVE-C-MANIFEST.txt"])
    cases.append(("CG-7g stray file in wave-manifests/ detected",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg7g_wave_manifest_population(
        [], c, listing=[WAVE_MANIFESTS[w] for w in WAVE_IDS[:-1]])
    cases.append(("CG-7g missing wave manifest detected",
                  c.rows[0][0] == "FAIL"))

    # An empty directory is six missing act arguments, not "nothing to
    # examine". The WARN branch stays reachable only if `WAVE_IDS` is ever
    # emptied, which would itself be the defect.
    c = Cap()
    cg7g_wave_manifest_population([], c, listing=[])
    cases.append(("CG-7g wholly absent wave-manifests/ detected",
                  c.rows[0][0] == "FAIL" and len(c.rows[0][4]) == len(WAVE_IDS)))

    c = Cap()
    cg14_install_routes(c, record=(
        "## 2. Ceremony\ncopy from `no-such-dir/` to "
        "`.syzygy/governance/contracts/rfcs/`\n## 3. Next\n"), all_paths=())
    cases.append(("CG-14 nonexistent install source detected",
                  c.rows[0][0] == "FAIL" and len(c.rows[0][4]) == 1))

    c = Cap()
    cg14_install_routes(c, record=(
        "## 2. Ceremony\ncreates `.syzygy/map/topology/`\n## 3. Next\n"),
        all_paths=(".syzygy/map/topology/keep.md",))
    cases.append(("CG-14 act-created home that already exists detected",
                  c.rows[0][0] == "FAIL"))

    # The founder-machine divergence: `_bootstrap/` exists here and in no
    # clone, so a filesystem answer passes locally and fails inside a clone.
    # `all_paths` deliberately *contains* the directory — the fixture only
    # fails if the check refuses the local answer and consults `.gitignore`.
    c = Cap()
    cg14_install_routes(c, record=(
        "## 2. Ceremony\nmirror the SHA to `_bootstrap/state/`\n## 3. Next\n"),
        all_paths=("_bootstrap/state/FOUNDER_DECISION_LOG.md",))
    cases.append(("CG-14 git-excluded ceremony location detected",
                  c.rows[0][0] == "FAIL"
                  and "_bootstrap" in (c.rows[0][4] or [""])[0]))

    c = Cap()
    cg14_install_routes(c, record=(
        "## 2. Ceremony\nthe git-excluded `_bootstrap/state/` is not part of "
        "the ceremony\n## 3. Next\n"), all_paths=())
    cases.append(("CG-14 disclaimed git-excluded mention exempted",
                  c.rows[0][0] != "FAIL"))

    # RD-6 finding D-1: the excluded-root set must include dotted,
    # nested prefixes (`.syzygy/cache/`, `.syzygy/local/`), not only
    # top-level names like `_bootstrap` — the first implementation dropped
    # both and would have consulted the local filesystem instead.
    c = Cap()
    cg14_install_routes(c, record=(
        "## 2. Ceremony\nmirror the projection to `.syzygy/cache/views/`\n"
        "## 3. Next\n"), all_paths=(".syzygy/cache/views/x.md",))
    cases.append(("CG-14 dotted git-excluded root (.syzygy/cache) detected",
                  c.rows[0][0] == "FAIL"
                  and "git-excluded" in (c.rows[0][4] or [""])[0]))

    # CG-8 measures the default load. Its failure modes are not "a file
    # is too long" — that is reported, never enforced — but the three ways the
    # figures can quietly stop meaning anything: an artifact vanishing from
    # the load, the authored region drifting out of its target band, and the
    # tool-managed block being counted as authored text.
    c = Cap()
    cg8_budgets(("README.md", "AGENTS.md", ".syzygy/intent/OVERVIEW.md"), c,
                measure=lambda rel: "w " * 1000)
    cases.append(("CG-8 absent default-load artifact detected",
                  any("heart-and-soul" in d and "absent" in d
                      for d in c.rows[0][4])))

    c = Cap()
    cg8_budgets(DEFAULT_LOAD, c, measure=lambda rel: "w " * 1000)
    cases.append(("CG-8 in-band authored region raises no band finding",
                  not any("target band" in d for d in c.rows[0][4])))

    c = Cap()
    cg8_budgets(DEFAULT_LOAD, c, measure=lambda rel: "w " * 400)
    cases.append(("CG-8 under-band authored region detected",
                  any("400 authored words, outside" in d for d in c.rows[0][4])))

    c = Cap()
    cg8_budgets(DEFAULT_LOAD, c,
                measure=lambda rel: ("w " * 1000) + TOOL_BLOCK_START + (" t" * 800))
    cases.append(("CG-8 tool-managed block excluded from the authored figure",
                  any("1000 authored + 804 tool-managed" in d
                      for d in c.rows[0][4])
                  and not any("target band" in d for d in c.rows[0][4])))

    # The raw-review lane, which four checks consult and which was a
    # hand-maintained per-round list until 2026-08-11. Each conjunct of the
    # shape gets its own fixture, so a mutation that widens or narrows it is
    # witnessed by exactly one failing case rather than by none.
    cases.append(("raw-review lane covers a new round's reviews directory",
                  _is_raw_review(
                      f"{CANDIDATES}/round-2026-08f/reviews/RD-47-x-RAW.md")
                  and _is_raw_review(f"{CANDIDATES}/reviews/x.md")))
    cases.append(("raw-review lane requires a whole path segment",
                  not _is_raw_review(
                      f"{CANDIDATES}/round-2026-08f/reviews-summary.md")
                  and not _is_raw_review(
                      f"{CANDIDATES}/round-2026-08f/previews/x.md")))
    cases.append(("raw-review lane is scoped to the candidate tree",
                  not _is_raw_review("scripts/reviews/x.md")
                  and not _is_raw_review(
                      ".syzygy/governance/decisions/reviews/x.md")))
    cases.append(("implementation-review raw output is verbatim by suffix",
                  _is_raw_review(
                      "docs/reviews/R-POLARIS-SPEC-CONFIRMATION-RAW.md")
                  and not _is_raw_review(
                      "docs/reviews/R-POLARIS-SPEC-CONFIRMATION.md")
                  and not _is_raw_review("docs/reviews/RAW.md")))
    cases.append(("raw review is exempt from both quote-currency lanes",
                  _act_quote_exempt(
                      f"{CANDIDATES}/round-2026-08f/reviews/RD-47-x-RAW.md")
                  and _verbatim_source(
                      f"{CANDIDATES}/round-2026-08f/reviews/RD-47-x-RAW.md")
                  and not _act_quote_exempt(
                      f"{CANDIDATES}/round-2026-08f/SOME-ACTIVE-FILE.md")
                  and not _verbatim_source(
                      f"{CANDIDATES}/round-2026-08f/SOME-ACTIVE-FILE.md")))

    c = Cap()
    cg15_truncated_digests([], c, corpus=[("f.md", "digest `deadbeefcafe…`")])
    cases.append(("CG-15 stale truncated digest detected",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg15_truncated_digests([], c, corpus=[("f.md", "the retired `deadbeefcafe…`")])
    cases.append(("CG-15 retired-marked quote exempted",
                  c.rows[0][0] == "WARN"))

    c = Cap()
    cg16_term_registry_status([], c,
                              corpus=[("f.md", "the adopted term registry")])
    cases.append(("CG-16 'adopted term registry' detected",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg16_term_registry_status([], c,
                              corpus=[("f.md", "the term registry is not adopted")])
    cases.append(("CG-16 negated claim exempted", c.rows[0][0] == "OK"))

    # The negator three words out — which is this check's own headline, and
    # which a record quoting the battery verbatim reproduces. Under the old
    # 14-non-word-character rule the quotation was a finding, so records
    # paraphrased the battery instead of quoting it.
    c = Cap()
    cg16_term_registry_status([], c, corpus=[
        ("f.md", "term registry never described as accepted — 59 mentions")])
    cases.append(("CG-16 negation across intervening words exempts",
                  c.rows[0][0] == "OK"))

    c = Cap()
    cg16_term_registry_status([], c, corpus=[
        ("f.md", "the CG-16 row calls the term registry `accepted` here")])
    cases.append(("CG-16 a line naming CG-16 is quoting, not claiming",
                  c.rows[0][0] == "OK"))

    # And the two directions that keep the widening from defanging the check:
    # a bare claim still fails, and a negator belonging to a *different*
    # sentence does not reach across the full stop.
    c = Cap()
    cg16_term_registry_status([], c,
                              corpus=[("f.md", "the term registry is accepted")])
    cases.append(("CG-16 unnegated claim still fails after the widening",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg16_term_registry_status([], c, corpus=[
        ("f.md", "No act has been performed. The term registry is accepted")])
    cases.append(("CG-16 negator past a sentence boundary does not exempt",
                  c.rows[0][0] == "FAIL"))

    # ---- CG-17's sub-clause extractor. RFC-0009 denies that two lettered
    # limbs are sub-clauses; admitting them made CG-17 demand matrix rows
    # that would have fabricated the identities the contract disclaims.
    cases.append(("CG-17 limb denied as a sub-clause is not declared",
                  not _declared_subclauses(
                      "Lettered limbs cited inside a parent clause "
                      "(RFC9-10(c), RFC9-19(b))\nare parts of that clause, "
                      "not separate sub-clauses, and resolve the same way.",
                      {"RFC9-10", "RFC9-19"})))

    cases.append(("CG-17 declared sub-clause range still enters the population",
                  _declared_subclauses(
                      "clauses: RFC7-1..RFC7-9 (sub-clauses RFC7-2(a)-(c))",
                      {"RFC7-2"}) == {"RFC7-2(a)", "RFC7-2(b)", "RFC7-2(c)"}))

    cases.append(("CG-17 `No lettered sub-clauses` denial still honoured",
                  not _declared_subclauses(
                      "**No lettered sub-clauses.** Lettered limbs cited "
                      "inside a clause — RFC8-2(a)-(c) — resolve to it.",
                      {"RFC8-2"})))

    c = Cap()
    cg17_routing_completeness(
        c, matrix="## RFC-0006 — x\n| `RFC6-1` | OS |\n| `RFC6-1` | OS |",
        modules=[])
    cases.append(("CG-17 double-routed clause detected",
                  c.rows[0][0] == "FAIL"))

    # A fabricated row must not pass as coverage. Checking only
    # declared-minus-routed let one inflate the denominator unnoticed.
    c = Cap()
    cg17_routing_completeness(c, matrix="## RFC-0006 — x\n| `RFC6-999` | OS |",
                              modules=[])
    cases.append(("CG-17 routed-but-undeclared clause detected",
                  c.rows[0][0] == "FAIL"))

    # The population is the matrix's own sections. A new section brings its
    # rows in; a matrix with none fails rather than routing nothing; and a
    # contract with modules and no section is printed, not dropped.
    c = Cap()
    cg17_routing_completeness(
        c, matrix="## RFC-0012 — new\n| `RFC12-1` | OS |\n| `RFC12-1` | OS |",
        modules=[])
    cases.append(("CG-17 a twelfth contract's section joins the population",
                  c.rows[0][0] == "FAIL" and "RFC12-1" in c.rows[0][4][0]))
    c = Cap()
    cg17_routing_completeness(c, matrix="| `RFC6-1` | OS |", modules=[])
    cases.append(("CG-17 matrix with no contract section fails",
                  c.rows[0][0] == "FAIL"))
    notes = []
    class NoteCap(Cap):
        def add(self, status, name, examined, n, unit, note=None,
                details=None):
            notes.append(note or "")
            super().add(status, name, examined, n, unit, note, details)
    c = NoteCap()
    cg17_routing_completeness(
        c, matrix="## RFC-0006 — x\n| `RFC6-1` | OS |",
        modules=[f"{RFCS_DIR}/RFC-0001-project-graph-identity-state-planes.md"])
    cases.append(("CG-17 contract with modules and no section is printed",
                  "RFC-0001" in notes[-1]))

    # A fixture the parser cannot read is unverified, not passing.
    c = Cap()
    cg18_fixture_freshness(c, fixtures=[("f.md", "no anchors here at all")])
    cases.append(("CG-18 unparseable fixture is not silently skipped",
                  c.rows[0][0] in ("FAIL", "WARN")))

    c = Cap()
    cg18_fixture_freshness(c, fixtures=[("f.md",
        "```\nscripts/context_load.py 06-CONTEXT-LOAD-MAP.md\n```\n"
        "Measured: **99,999 words \u2248 1 estimated tokens**\n"
        "## Packet digest\n`0000000000000000` (recompute")])
    cases.append(("CG-18 falsified word count detected",
                  c.rows[0][0] == "FAIL"))

    # CG-21 is a prohibition, so its fixtures are the two directions that
    # matter: a measurement smuggled into contract prose must fail, and the
    # one sentence allowed to name the report's filename must not.
    c = Cap()
    cg21_contract_prose_states_no_measurement(
        c, modules=[f"{RFCS_DIR}/RFC-0002/README.md"])
    cases.append(("CG-21 examines the real corpus without error",
                  c.rows[0][2] > 0 and c.rows[0][0] == "OK"))

    # A synthetic module carrying a corpus count. This fixture used to feed
    # the real load map, whose "11 contracts" figure was its live trigger —
    # true only while the load map violated the rule. The 2026-08-18 repair
    # pass (Administration 1 F2) removed that figure, so the fixture now
    # writes its own violating input instead of depending on a defect
    # surviving in the tree.
    import tempfile as _tf21
    with _tf21.TemporaryDirectory(prefix="cg21-selftest-") as _d21:
        _m21 = os.path.join(_d21, "synthetic-module.md")
        with open(_m21, "w", encoding="utf-8") as _f21:
            _f21.write("The corpus spans 11 contracts and 32 modules.\n")
        c = Cap()
        cg21_contract_prose_states_no_measurement(c, modules=[_m21])
    cases.append(("CG-21 corpus count in prose detected",
                  c.rows[0][0] == "FAIL"))

    # The widening's negative: the pointer sentence a module is allowed to
    # write must still pass, or the rule forbids saying where the figures
    # went.
    c = Cap()
    cg20_load_map_states_no_measurement(
        c, body="Coverage: 39 modules across 11 contracts — see "
                "`CONTEXT-BUDGET-REPORT.md`.")
    cases.append(("CG-20 corpus count behind the pointer exempted",
                  c.rows[0][0] == "OK"))

    c = Cap()
    cg20_load_map_states_no_measurement(c, body="| 11 contracts | 32 modules |")
    cases.append(("CG-20 stale corpus count detected",
                  c.rows[0][0] == "FAIL" and len(c.rows[0][4]) == 2))

    c = Cap()
    cg18_fixture_freshness(c, fixtures=[("f.md",
        "```\nscripts/context_load.py no-such-file.md\n```\n"
        "## Packet digest\n`0000000000000000` (recompute")])
    cases.append(("CG-18 unreproducible fixture detected",
                  c.rows[0][0] == "FAIL"))

    # ---- CG-19, P1..P8. Every fixture marked "passes today" reproduces a
    # mutation that the pre-RC10-P check returned OK on. The four negatives
    # assert the check does NOT fire where it must not — F6e most of all,
    # which keeps the residual limit executable instead of only documented.
    H40, H40B, H64, H64B = "a" * 40, "b" * 40, "c" * 64, "d" * 64

    def cg19(body):
        cap = Cap()
        cg19_substrate_lock(cap, body=body)
        return cap.rows[0]

    def gitpin(name="th_x", repo="https://github.com/o/r", vis="public",
               commit=H40, tree=H40B, root="skills/th", paths=None, extra=""):
        rows = paths if paths is not None else [(f"{root}/SKILL.md", H64)]
        body = (f"{name}:\n  repository: {repo}\n  visibility: {vis}\n"
                f"  commit: {commit}\n  root_path: {root}\n"
                f"  git_tree: {tree}\n  relevant_paths:\n")
        for p, d in rows:
            body += f"    - path: {p}\n"
            if d is not None:
                body += f"      sha256: {d}\n"
        return body + extra

    F = [
        # P1 — population integrity
        ("F1a CG-19 unclassified top-level key detected",
         "version: 1\nmystery_substrate:\n  note: hi\n", "FAIL"),
        ("F1b CG-19 empty lock warns, never passes",
         "# only a comment\n", "WARN"),
        # P2 — kind and required fields
        ("F2a CG-19 git-pin missing git_tree/relevant_paths detected",
         f"th_x:\n  repository: https://github.com/o/r\n  visibility: public\n"
         f"  commit: {H40}\n  root_path: a/b\n", "FAIL"),
        ("F2b CG-19 version-declared with no digest reference detected",
         'th_x:\n  repository: https://github.com/o/r\n'
         '  installed_version: "1.0"\n', "FAIL"),
        ("F2c CG-19 (negative) real version-declared pin accepted",
         'openspec:\n  distribution: "npm: @x/y"\n'
         '  repository: https://github.com/Fission-AI/OpenSpec\n'
         '  installed_version: "1.3.1"\n'
         '  digest_or_lock_reference: >-\n    None pinned; nothing is\n'
         '    generated from it yet.\n', "OK"),
        # P3 — object id well-formedness
        ("F3a CG-19 abbreviated commit detected",
         gitpin(commit="61bd8fa"), "FAIL"),
        ("F3b CG-19 non-hex git_tree detected", gitpin(tree="HEAD"), "FAIL"),
        ("F3c CG-19 uppercase sha256 detected",
         gitpin(paths=[("skills/th/SKILL.md", "C" * 64)]), "FAIL"),
        ("F3d CG-19 40-char non-hex commit detected",
         gitpin(commit="a" * 39 + "z"), "FAIL"),
        # P4 — per-file digests and path sanity
        ("F4a CG-19 listed path with no sha256 detected",
         gitpin(paths=[("skills/th/SKILL.md", None)]), "FAIL"),
        ("F4b CG-19 machine-local path with valid digest detected",
         gitpin(paths=[("/home/tze/.claude/skills/th/SKILL.md", H64)]), "FAIL"),
        ("F4c CG-19 path outside its root_path detected",
         gitpin(paths=[("skills/other/thing.md", H64)]), "FAIL"),
        # P5 — locator hygiene (both passed the old check)
        ("F5a CG-19 local repository with URL in prose detected",
         gitpin(repo="/home/tze/.dotfiles/ai-bootstrap",
                extra="  note: see https://example.com/x\n"), "FAIL"),
        ("F5b CG-19 machine-local root_path with real repo URL detected",
         gitpin(root="~/.claude/skills/th",
                paths=[("~/.claude/skills/th/SKILL.md", H64)]), "FAIL"),
        ("F5c CG-19 (negative) real lock's prose `~/` mentions not flagged",
         read(SUBSTRATE_LOCK), "OK"),
        # P6 — forge grammar
        ("F6a CG-19 one-segment repository URL detected",
         gitpin(repo="https://github.com/Tzeusy"), "FAIL"),
        ("F6b CG-19 tree URL as repository locator detected",
         gitpin(repo="https://github.com/o/r/tree/main/skills"), "FAIL"),
        ("F6c CG-19 non-https scheme detected",
         gitpin(repo="ssh://git@github.com/o/r"), "FAIL"),
        ("F6d CG-19 host outside the forge allowlist detected",
         gitpin(repo="https://not-a-real-host.invalid/o/r"), "FAIL"),
        ("F6e CG-19 (negative) well-formed pin to a nonexistent repo passes "
         "— the residual limit, kept executable",
         gitpin(repo="https://github.com/NoSuchOrg9/no-such-repo-9"), "OK"),
        # P7 — visibility
        ("F7a CG-19 private substrate detected", gitpin(vis="private"), "FAIL"),
        ("F7b CG-19 undeclared visibility detected",
         _mutate(gitpin(), "  visibility: public\n", ""), "FAIL"),
    ]

    def drift(a_commit=H40, i_commit=H40B, a_sha=H64, i_sha=H64B,
              drift_block=None, listed_material="true", extra=""):
        d = drift_block if drift_block is not None else (
            f"  drift:\n    detected: true\n    disposition: OPEN — surfaced\n"
            f"    changed_paths:\n      - path: skills/th/bar.md\n"
            f"        material: {listed_material}\n"
            f"        change: whatever\n")
        return (f"th_e:\n  repository: https://github.com/o/r\n"
                f"  visibility: public\n"
                f"  adopted:\n    commit: {a_commit}\n"
                f"    root_path: skills/th\n    git_tree: {H40}\n"
                f"    relevant_paths:\n      - path: skills/th/bar.md\n"
                f"        sha256: {a_sha}\n"
                f"  installed:\n    commit: {i_commit}\n"
                f"    root_path: skills/th\n    git_tree: {H40B}\n"
                f"    relevant_paths:\n      - path: skills/th/bar.md\n"
                f"        sha256: {i_sha}\n" + d + extra)

    F += [
        ("F8a CG-19 undeclared drift over differing digests detected",
         drift(drift_block=""), "FAIL"),
        ("F8b CG-19 differing path absent from changed_paths detected",
         drift(drift_block="  drift:\n    detected: true\n"
                           "    disposition: OPEN\n    changed_paths:\n"
                           "      - path: skills/th/other.md\n"
                           "        material: true\n"), "FAIL"),
        ("F8c CG-19 materiality claimed over identical content detected",
         drift(i_sha=H64, i_commit=H40B, listed_material="true"), "FAIL"),
        ("F8d CG-19 drift.detected false while commits differ detected",
         drift(drift_block="  drift:\n    detected: false\n"
                           "    disposition: OPEN\n"), "FAIL"),
        ("F8e CG-19 drift disposition read from inside the drift group",
         drift(drift_block="  drift:\n    detected: true\n"
                           "    disposition: resolved\n    changed_paths:\n"
                           "      - path: skills/th/bar.md\n"
                           "        material: true\n",
               extra="  build_disposition: open\n"), "FAIL"),
        ("F8g CG-19 legacy ambiguous `status:` drift key detected",
         drift(drift_block="  drift:\n    detected: true\n"
                           "    status: OPEN\n    changed_paths:\n"
                           "      - path: skills/th/bar.md\n"
                           "        material: true\n"), "FAIL"),
        ("F8f CG-19 path present in one revision group only detected",
         _mutate(drift(),
                 "      - path: skills/th/bar.md\n        sha256: " + H64B,
                 "      - path: skills/th/added.md\n        sha256: " + H64B),
         "FAIL"),
    ]
    for label, body, want in F:
        cases.append((label, cg19(body)[0] == want))

    c = Cap()
    cg20_load_map_states_no_measurement(
        c, body="| RFC-0001 | single, 99,999 |")
    cases.append(("CG-20 stale load-map figure detected",
                  c.rows[0][0] == "FAIL"))

    # CG-22's four shapes. The last is the one that matters: a qualifier two
    # lines away must exempt, or every legitimate use becomes a finding and
    # the check gets switched off.
    c = Cap()
    cg22_ambiguous_status((), c, corpus=[("f.md", "the `status` field")])
    cases.append(("CG-22 bare `status` code span detected",
                  c.rows[0][0] == "FAIL" and len(c.rows[0][4]) == 1))

    c = Cap()
    cg22_ambiguous_status((), c, corpus=[("f.md", "```yaml\n  status: open\n```")])
    cases.append(("CG-22 indented `status:` field detected",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg22_ambiguous_status((), c, corpus=[
        ("f.md", "the governance\nlifecycle is carried by\nthe `status` field")])
    cases.append(("CG-22 qualifier across a line wrap exempts",
                  c.rows[0][0] == "OK"))

    c = Cap()
    cg22_ambiguous_status((), c, corpus=[])
    cases.append(("CG-22 empty corpus warns, never passes",
                  c.rows[0][0] == "WARN"))

    c = Cap()
    cg22_ambiguous_status((), c, corpus=[(TERM_REGISTRY, "the `status` field")])
    cases.append(("CG-22 allowlisted file exempted and printed",
                  c.rows[0][0] == "OK" and len(c.rows[1][4]) == 1))

    c = Cap()
    cg22_ambiguous_status((), c, corpus=[
        ("f.md", "the key was renamed\nfrom `status` in 2026")])
    cases.append(("CG-22 retirement marker in window exempts",
                  c.rows[0][0] == "OK"))

    # The exemption must not be a back door: a marker outside the window is
    # not a marker. Without this the retirement clause would exempt any file
    # that mentions a rename anywhere.
    c = Cap()
    cg22_ambiguous_status((), c, corpus=[
        ("f.md", "something was renamed here\n" + ("filler\n" * 6)
                 + "the `status` field")])
    cases.append(("CG-22 retirement marker outside the window does not exempt",
                  c.rows[0][0] == "FAIL"))

    # CG-22c holds the qualifier list to the registry's own §1 table. Each
    # failure mode is one of the three ways the copy can drift: the registry
    # names a dimension the list no longer covers, the table stops parsing,
    # and a covered dimension written in the registry's longer prose form.
    DIMS = ("## 1. The five dimensions\n\n| Dimension | Q |\n|---|---|\n"
            "| **State plane** | x |\n| **Claim epistemic label** | x |\n"
            "{extra}\n## 2. Next\n")
    c = Cap()
    cg22c_qualifier_coverage(c, registry=DIMS.format(extra=""))
    cases.append(("CG-22c dimension in its long prose form is still covered",
                  c.rows[0][0] == "OK" and c.rows[0][2] == 2))
    c = Cap()
    cg22c_qualifier_coverage(
        c, registry=DIMS.format(extra="| **Consent standing** | x |"))
    cases.append(("CG-22c registry dimension the list misses detected",
                  c.rows[0][0] == "FAIL"
                  and "consent standing" in c.rows[0][4][0]))
    c = Cap()
    cg22c_qualifier_coverage(c, registry="## 1. Renamed\n\nprose only\n## 2.\n")
    cases.append(("CG-22c unparseable dimension table fails, never passes",
                  c.rows[0][0] == "FAIL"))

    # CG-23 reads the tier split out of the registry rather than restating it.
    # Its failure modes are the split going stale underneath it, and a drawer
    # boundary that silently swallows the whole document.
    CORE_TBL = ("**Core — the four.**\n\n"
                "| Term | ID | Plain question |\n|---|---|---|\n"
                "| Capability | T-04 | x |\n| Claim | T-13 | x |\n"
                "| Gap | T-20 | x |\n| Mission | T-27 | x |\n\n")
    reg = (CORE_TBL
           + "#### T-04 · Capability\n#### T-13 · Claim\n#### T-20 · Gap\n"
             "#### T-27 · Mission\n#### T-28 · Autonomy envelope\n")
    # The leaks in this corpus are lowercase running prose, so the fixture is
    # lowercase. A case-sensitive matcher passed every other fixture here and
    # found none of the real hits.
    c = Cap()
    cg23_default_path_vocabulary(c, registry=reg,
                                 default_path=[("f.md", "an autonomy "
                                                        "envelope bounds it")])
    cases.append(("CG-23 advanced term on the default path detected",
                  len(c.rows[0][4]) == 1 and "T-28" in c.rows[0][4][0]))

    # A word boundary, not a substring: "enveloped" is not the term, and the
    # loose form reported a `Warrant` hit on the word "warranted" that no
    # reader would have called a leak.
    c = Cap()
    cg23_default_path_vocabulary(c, registry=reg,
                                 default_path=[("f.md", "the enveloped case")])
    cases.append(("CG-23 substring inside a longer word is not a hit",
                  not c.rows[0][4]))

    # The allowlist exempts and *prints*; it never silences.
    c = Cap()
    saved = dict(VOCAB_ORDINARY_USE)
    VOCAB_ORDINARY_USE[("f.md", "T-28")] = "ordinary English, for the fixture"
    try:
        cg23_default_path_vocabulary(
            c, registry=reg,
            default_path=[("f.md", "an autonomy envelope bounds it")])
    finally:
        VOCAB_ORDINARY_USE.clear()
        VOCAB_ORDINARY_USE.update(saved)
    cases.append(("CG-23 ordinary-English exemption is printed, not silent",
                  any("ordinary-English use, exempt" in d
                      for d in c.rows[0][4])))

    c = Cap()
    cg23_default_path_vocabulary(c, registry=reg,
                                 default_path=[("f.md", "a Capability is a "
                                                        "Claim about a Gap")])
    cases.append(("CG-23 core-only default path raises nothing",
                  not c.rows[0][4]))

    # The split going stale underneath the check: a core table naming an ID
    # with no entry of its own. Before the core set was derived this was the
    # only way the drift could show; it stays fixtured because the derivation
    # can still read a table whose rows point nowhere.
    c = Cap()
    cg23_default_path_vocabulary(
        c, registry=CORE_TBL + "#### T-99 · Nothing\n",
        default_path=[("f.md", "x")])
    cases.append(("CG-23 stale tier split detected",
                  any("no registry entry of their own" in d
                      for d in c.rows[0][4])))

    # And the failure the derivation introduced: a registry whose core table
    # does not parse must say so loudly, not silently report every term as
    # advanced — which would look like a vocabulary catastrophe and be a
    # parser bug.
    c = Cap()
    cg23_default_path_vocabulary(
        c, registry="#### T-04 · Capability\n",
        default_path=[("f.md", "a Capability")])
    cases.append(("CG-23 unparsable core table reported, not silently advanced",
                  any("core table did not parse" in d for d in c.rows[0][4])))

    c = Cap()
    cg23_default_path_vocabulary(c, registry="no headings here",
                                 default_path=[("f.md", "x")])
    cases.append(("CG-23 unparsable registry warns over zero examined",
                  c.rows[0][2] == 0 and "changed shape" in str(c.rows[0])
                  or c.rows[0][2] == 0))

    # CG-24 exists because a prose coverage claim drifts. Its own failure mode
    # is a regex that reads the battery's check names as if they were fixture
    # names, which would make every check appear to cover itself.
    c = Cap()
    cg24_selftest_coverage(c, source='cases.append(("CG-13 x detected",',
                           reported=["CG-13  deps", "CG-99  invented"])
    cases.append(("CG-24 uncovered check family detected",
                  any("CG-99" in d for d in c.rows[0][4])))

    c = Cap()
    cg24_selftest_coverage(c, source='("F8a CG-19 y detected",',
                           reported=["CG-19  substrate"])
    cases.append(("CG-24 F-prefixed fixture name credited",
                  not c.rows[0][4]))

    c = Cap()
    cg24_selftest_coverage(c, source='res.add(status, "CG-13  deps resolve",',
                           reported=["CG-13  deps resolve"])
    cases.append(("CG-24 a check's own name is not a fixture for it",
                  any("CG-13" in d for d in c.rows[0][4])))

    c = Cap()
    cg24_selftest_coverage(c, source='cases.append(("CG-77 z detected",',
                           reported=["CG-13  deps"])
    cases.append(("CG-24 fixture naming an unreported check detected",
                  any("did not report" in d for d in c.rows[0][4])))

    # RD-17 finding 3, mutation M9: three string literals in this file broke
    # the two-space `res.add` convention CG-24's lookahead rested on, and
    # were counted as fixtures — CG-24 over-credited itself `16 of 24` where
    # the truth was `14 of 24`. The region anchor is what closes it: a check
    # name outside `selftest()` is not a fixture however it is spaced.
    MODULE = (
        'def cg11_ignored(res):\n'
        '    res.add("WARN", "CG-11 ignore rules", 0, 0)\n'
        '\n'
        'def selftest():\n'
        '    cases.append(("CG-13 dangling edge detected", True))\n'
        '\n'
        '# ------------------------------------------------------- main\n'
        'def main():\n'
        '    res.add("WARN", "CG-12b allowlist", 0, 0)\n')
    c = Cap()
    cg24_selftest_coverage(c, source=MODULE,
                           reported=["CG-11  ignore", "CG-12  bootstrap",
                                     "CG-13  deps"])
    cases.append(("CG-24 check name outside selftest() is not a fixture",
                  any("CG-11" in d and "CG-12" in d
                      for d in c.rows[0][4])))

    # And the same name *inside* the region, in `res.add` position rather
    # than tuple-head position. This is the shape CG-24's own fixture above
    # smuggled in on the first run after the region anchor landed.
    c = Cap()
    cg24_selftest_coverage(
        c,
        source=('def selftest():\n'
                '    res.add("WARN", "CG-11 ignore rules", 0, 0)\n'
                '    cases.append(("CG-13 x detected", True))\n'),
        reported=["CG-11  ignore", "CG-13  deps"])
    cases.append(("CG-24 res.add name inside selftest() is not a fixture",
                  any("CG-11" in d for d in c.rows[0][4])))

    c = Cap()
    cg24_selftest_coverage(c, source=MODULE, reported=["CG-13  deps"])
    cases.append(("CG-24 fixture inside selftest() is credited",
                  not any("no `--selftest` fixture" in d
                          for d in c.rows[0][4])))

    c = Cap()
    cg24_selftest_coverage(c, source='def selftest_renamed():\n    pass\n',
                           reported=["CG-13  deps"])
    cases.append(("CG-24 unparsable selftest region is not silent coverage",
                  any("Unknown, not empty" in d for d in c.rows[0][4])
                  or any("no `--selftest` fixture" in d
                         for d in c.rows[0][4])))

    # ---- CG-25. A check that ships without naming its authoritative rule
    # fails the run that introduces it (review RD-17 finding 11).
    c = Cap()
    cg25_check_owners(c, reported=["CG-99  invented"],
                      owners={"CG-13": "mechanical"})
    cases.append(("CG-25 unattributed check family detected",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg25_check_owners(c, reported=["CG-13  deps"],
                      owners={"CG-13": "mechanical", "CG-77": "gone"})
    cases.append(("CG-25 owner entry for an unreported check reported",
                  c.rows[0][0] == "OK"
                  and any("did not report" in d for d in c.rows[0][4])))

    # ---- CG-26. The 2026-08-13 incident: `PROJECT-STATUS.md` claimed its
    # published block and the hosted workflow were the same fourteen checks.
    # The block held thirteen commands, the workflow ran fourteen steps, and
    # twelve were shared. Each predicate gets its own fixture, and the
    # agreeing case is fixtured too — a check that cannot pass is as useless
    # as one that cannot fail.
    def _wf(*cmds):
        return "".join(f"      - name: x\n        run: {c}\n" for c in cmds)

    def _spell(n):
        # Independent of `_number_word`: the oracle must not share its code.
        ones = ("zero one two three four five six seven eight nine ten "
                "eleven twelve thirteen fourteen fifteen sixteen seventeen "
                "eighteen nineteen").split()
        tens = "x x twenty thirty forty fifty sixty seventy eighty ninety".split()
        if n < 20:
            return ones[n]
        if n < 100:
            return tens[n // 10] + (f"-{ones[n % 10]}" if n % 10 else "")
        tail = f" and {_spell(n % 100)}" if n % 100 else ""
        return f"{ones[n // 100]} hundred{tail}"

    def _st(block, claim=None):
        if claim is None:
            # The default claim is the true sentence for the block, since a
            # missing count sentence is itself a finding.
            n = sum(1 for ln in block.splitlines()
                    if ln.startswith("python3 "))
            claim = (f"The {_spell(n)} checks above are the same "
                     f"{_spell(n)} the hosted workflow runs.")
        return (f"# S\n\n{BATTERY_HEADING}\n\n```sh\n{block}```\n\n{claim}\n")

    AGREE = "python3 scripts/a.py\npython3 scripts/b.py --check\n"

    c = Cap()
    cg26_battery_parity(c, status=_st(AGREE),
                        workflow=_wf("python3 scripts/a.py",
                                     "python3 scripts/b.py --check"))
    cases.append(("CG-26 agreeing lists pass", c.rows[0][0] == "OK"))

    c = Cap()
    cg26_battery_parity(c, status=_st(AGREE),
                        workflow=_wf("python3 scripts/a.py"))
    cases.append(("CG-26 published-but-not-hosted check detected",
                  c.rows[0][0] == "FAIL"
                  and any("published but not hosted" in d
                          for d in c.rows[0][4])))

    c = Cap()
    cg26_battery_parity(c, status=_st("python3 scripts/a.py\n"),
                        workflow=_wf("python3 scripts/a.py",
                                     "python3 scripts/dry-run.py rec.json"))
    cases.append(("CG-26 hosted-but-not-published check detected",
                  c.rows[0][0] == "FAIL"
                  and any("hosted but not published" in d
                          for d in c.rows[0][4])))

    # A `CS=` shorthand must expand, or every abbreviated line reads as a
    # divergence and the check cries wolf until someone deletes it.
    c = Cap()
    cg26_battery_parity(
        c, status=_st("CS=.syzygy/x\npython3 $CS/a.py --check\n"),
        workflow=_wf("python3 .syzygy/x/a.py --check"))
    cases.append(("CG-26 shell-variable shorthand expands before comparison",
                  c.rows[0][0] == "OK"))

    # A shorthand defined in terms of another shorthand must reach a fixed
    # point. A single expansion pass leaves the inner name in place and
    # reports a divergence that does not exist.
    c = Cap()
    cg26_battery_parity(
        c, status=_st("CS=.syzygy/x\nD=$CS/f\npython3 $D/a.py\n"),
        workflow=_wf("python3 .syzygy/x/f/a.py"))
    cases.append(("CG-26 nested shell shorthand expands to a fixed point",
                  c.rows[0][0] == "OK"))

    # Orientation lines are reported, never compared: `git tag` cannot fail,
    # so demanding the hosted job run it would be noise, not rigour.
    c = Cap()
    cg26_battery_parity(c, status=_st(AGREE + "git tag --list 'doctrine-*'\n"),
                        workflow=_wf("python3 scripts/a.py",
                                     "python3 scripts/b.py --check"))
    cases.append(("CG-26 non-python orientation line does not fail parity",
                  c.rows[0][0] == "OK"
                  and any("orientation, not compared" in d
                          for d in c.rows[0][4])))

    c = Cap()
    cg26_battery_parity(
        c, status=_st(AGREE, "The fourteen checks above are the same fourteen "
                             "the hosted workflow runs."),
        workflow=_wf("python3 scripts/a.py", "python3 scripts/b.py --check"))
    cases.append(("CG-26 miscounted parity sentence detected",
                  c.rows[0][0] == "FAIL"
                  and any("claims 14 published checks" in d
                          for d in c.rows[0][4])))

    twenty_six = "".join(f"python3 scripts/check-{n}.py\n" for n in range(26))
    twenty_six_workflow = _wf(
        *(f"python3 scripts/check-{n}.py" for n in range(26)))
    c = Cap()
    cg26_battery_parity(
        c,
        status=_st(
            twenty_six,
            "The twenty-six checks above are the same twenty-six the hosted "
            "workflow runs."),
        workflow=twenty_six_workflow)
    cases.append(("CG-26 hyphenated number words parse past twenty",
                  c.rows[0][0] == "OK"))

    c = Cap()
    cg26_battery_parity(
        c,
        status=_st(
            twenty_six,
            "The twenty-six checks above are the same twenty-six the hosted "
            "workflow runs."),
        workflow=_wf(
            *(f"python3 scripts/check-{n}.py" for n in range(25))))
    cases.append(("CG-26 hyphenated number-word miscount detected",
                  c.rows[0][0] == "FAIL"
                  and any("claims 26 hosted checks" in d
                          for d in c.rows[0][4])))

    def _big(n):
        return ("".join(f"python3 scripts/check-{i}.py\n" for i in range(n)),
                _wf(*(f"python3 scripts/check-{i}.py" for i in range(n))))

    # Boundaries 99/100 and the real 105 form, wrapped across a line break.
    for n in (99, 100, 105, 113):
        blk, wf = _big(n)
        c = Cap()
        cg26_battery_parity(c, status=_st(blk), workflow=wf)
        cases.append((f"CG-26 {n}-check count sentence matches",
                      c.rows[0][0] == "OK"))
    blk, wf = _big(105)
    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The one hundred and five checks above are the "
                           "same one hundred and\nfive the hosted workflow "
                           "runs."),
        workflow=wf)
    cases.append(("CG-26 three-digit count wrapped across lines matches",
                  c.rows[0][0] == "OK"))

    # Mismatch in each position, at three digits.
    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The one hundred and six checks above are the "
                           "same one hundred and five the hosted workflow "
                           "runs."), workflow=wf)
    cases.append(("CG-26 three-digit published-count mismatch detected",
                  c.rows[0][0] == "FAIL"
                  and any("claims 106 published checks" in d
                          for d in c.rows[0][4])))
    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The one hundred and five checks above are the "
                           "same one hundred and ten the hosted workflow "
                           "runs."), workflow=wf)
    cases.append(("CG-26 three-digit hosted-count mismatch detected",
                  c.rows[0][0] == "FAIL"
                  and any("claims 110 hosted checks" in d
                          for d in c.rows[0][4])))
    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The one hundred and five checks above are the "
                           "same one hundred and five the hosted workflow "
                           "runs."),
        workflow=_big(104)[1])
    cases.append(("CG-26 three-digit count vs hosted population detected",
                  c.rows[0][0] == "FAIL"
                  and any("claims 105 hosted checks" in d
                          for d in c.rows[0][4])))

    # Unreadable number is a finding.
    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The one hundred and checks above are the same "
                           "five the hosted workflow runs."), workflow=wf)
    cases.append(("CG-26 unreadable three-digit count is a finding",
                  c.rows[0][0] == "FAIL"
                  and any("cannot read" in d for d in c.rows[0][4])))

    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The one hundred zero checks above are the same "
                           "five the hosted workflow runs."), workflow=wf)
    cases.append(("CG-26 zero tail after hundred is unreadable, not read",
                  c.rows[0][0] == "FAIL"
                  and any("cannot read" in d for d in c.rows[0][4])))

    # Direct table over the helper: each refused phrase stays refused, each
    # accepted phrase keeps its value (kills `<= 10`, the `hundred` guard,
    # the lead-word default and the extra-tail-word mutants).
    cases.append(("CG-26 number words: refused phrases stay unreadable",
                  all(_number_word(w) is None for w in (
                      "ten hundred", "one two", "foo hundred five",
                      "one hundred five six", "one hundred and five six",
                      "one hundred and", "zero hundred"))))
    cases.append(("CG-26 number words: accepted phrases keep their value",
                  [_number_word(w) for w in (
                      "ninety-nine", "one hundred", "one hundred five",
                      "one hundred and five", "two hundred and thirteen")]
                  == [99, 100, 105, 105, 213]))

    # Wrapping outside the number phrase: `\s+` at both fixed joints.
    blk, wf = _big(105)
    for label, claim in (
            ("checks/above", "The one hundred and five checks\nabove are the "
                             "same one hundred and five the hosted workflow "
                             "runs."),
            ("same/number", "The one hundred and five checks above are the "
                            "same\none hundred and five the hosted workflow "
                            "runs."),
            ("number/the", "The one hundred and five checks above are the "
                           "same one hundred and five\nthe hosted workflow "
                           "runs.")):
        c = Cap()
        cg26_battery_parity(c, status=_st(blk, claim), workflow=wf)
        cases.append((f"CG-26 sentence wrapped at {label} still matches",
                      c.rows[0][0] == "OK"))

    # Extra tail words after the number are unreadable, not truncated.
    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The one hundred and five six checks above are "
                           "the same one hundred and five the hosted "
                           "workflow runs."), workflow=wf)
    cases.append(("CG-26 extra tail word after count is unreadable",
                  c.rows[0][0] == "FAIL"
                  and any("cannot read" in d for d in c.rows[0][4])))

    # Capitalized phrase fails closed and the finding names case.
    c = Cap()
    cg26_battery_parity(
        c, status=_st(blk, "The One Hundred And Five checks above are the "
                           "same one hundred and five the hosted workflow "
                           "runs."), workflow=wf)
    cases.append(("CG-26 capitalized count names case in the finding",
                  c.rows[0][0] == "FAIL"
                  and any("case" in d for d in c.rows[0][4])))

    # No count sentence at all is a finding, not a silent skip.
    c = Cap()
    cg26_battery_parity(c, status=_st(AGREE, "No count is stated here."),
                        workflow=_wf("python3 scripts/a.py",
                                     "python3 scripts/b.py --check"))
    cases.append(("CG-26 absent count sentence is a finding, not a skip",
                  c.rows[0][0] == "FAIL"
                  and any("no parity count sentence" in d
                          for d in c.rows[0][4])))
    c = Cap()
    cg26_battery_parity(c, status=_st(AGREE, "The 2 checks above are the "
                                             "same 2 the hosted workflow runs."),
                        workflow=_wf("python3 scripts/a.py",
                                     "python3 scripts/b.py --check"))
    cases.append(("CG-26 digit-form count sentence is not silently skipped",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg26_battery_parity(c, status="# S\n\nno block here\n",
                        workflow=_wf("python3 scripts/a.py"))
    cases.append(("CG-26 missing published block is a finding, not a skip",
                  c.rows[0][0] == "FAIL"))

    c = Cap()
    cg26_battery_parity(c, status="", workflow=_wf("python3 scripts/a.py"))
    cases.append(("CG-26 unreadable input warns rather than passing",
                  c.rows[0][0] == "WARN"))

    # ---- CG-27, the five stale classes the owner charter §11.4 names, each
    # with its accepting twin. A rejecting fixture alone proves a check that
    # says no to everything; the pairs are what prove it discriminates.
    def _cur(body):
        c = Cap()
        cg27_default_path_currency(c, corpus=[("f.md", body)])
        return c.rows[0]

    _STALE = (
        ("stale Wave A state",
         "# F\n\nWave A is accepted and installed.\n",
         "# F\n\nWave A is accepted and installed "
         "(`PROJECT-STATUS.md` owns this).\n"),
        ("stale Wave B state",
         "# F\n\nWave B is confirmed and the act was performed.\n",
         "# F\n\n> Where this and `PROJECT-STATUS.md` disagree, that record "
         "wins.\n\nWave B is confirmed and the act was performed.\n"),
        ("stale launch-gate version",
         "# F\n\nThe launch gate stands at v1.4 today.\n",
         "# F\n\nThe launch gate stands at v1.4 today "
         "(`launch-gate-pre-specifications.md` states its own version).\n"),
        ("stale first-spec prerequisite",
         "# F\n\nP-33 is satisfied, so authoring may begin.\n",
         "# F\n\nP-33 is satisfied as of 2026-08-13, so authoring may "
         "begin.\n"),
        ("stale gate verdict",
         "# F\n\nThe gate returned NOT READY.\n",
         "# F\n\nThe gate returned NOT READY; `PROJECT-STATUS.md` owns the "
         "current verdict.\n"),
    )
    for _name, _bad, _good in _STALE:
        cases.append((f"CG-27 {_name} — unanchored claim detected",
                      _cur(_bad)[3] == 1))
        cases.append((f"CG-27 {_name} — anchored twin raises nothing",
                      _cur(_good)[3] == 0))

    # Rule 6 regression fixture: before table rows become independent
    # contexts, the historical marker in the sibling row exempts this current
    # claim because Markdown treats the whole table as one paragraph.
    _TABLE_SIBLING_HISTORICAL = (
        "# F\n\n"
        "| Claim | Note |\n"
        "| --- | --- |\n"
        "| Wave A is accepted. | Current state |\n"
        "| Prior note | Historically, Wave A was accepted. |\n")
    cases.append((
        "CG-27 a sibling table row's historical marker does not exempt the current claim",
        _cur(_TABLE_SIBLING_HISTORICAL)[3] == 1))

    cases.append((
        "CG-27 pipe-less GFM data rows remain independent claim contexts",
        _cur("# F\n\nClaim | Note\n--- | ---\n"
             "Wave A is accepted.\nHistorically true.\n")[2:4]
        == (1, 1)))

    cases.append((
        "CG-27 one-column GFM table rows remain independent claim contexts",
        _cur("# F\n\n| Claim |\n| --- |\n"
             "| Wave A is accepted. |\n| Historically true. |\n")[2:4]
        == (1, 1)))

    cases.append((
        "CG-27 tab-indented code does not open a fenced-code block",
        _cur("# F\n\n\t```\n\n| Claim | Note |\n| --- | --- |\n"
             "| Wave A is accepted. | Current state |\n"
             "| Prior note | Historically true. |\n")[2:4]
        == (1, 1)))

    cases.append((
        "CG-27 a backtick in the info string prevents a fence from opening",
        _cur("# F\n\n```bad`info\n\n"
             "| Claim | Note |\n| --- | --- |\n"
             "| Wave A is accepted. | Current state |\n"
             "| Prior note | Historically true. |\n\n```\n")[2:4]
        == (1, 1)))

    cases.append((
        "CG-27 a tilde fence permits a backtick in its info string",
        _cur("# F\n\n~~~bad`info\n\n"
             "| Claim | Note |\n| --- | --- |\n"
             "| Wave A is accepted. | Current state |\n"
             "| Prior note | Historically true. |\n\n~~~\n")[3]
        == 0))

    cases.append((
        "CG-27 even backslashes leave a trailing boundary pipe unescaped",
        _cur("# F\n\n| Claim | Evidence\\\\|\n| --- | --- |\n"
             "| Wave A is accepted. | Current state |\n"
             "| Prior note | Historically true. |\n")[2:4]
        == (1, 1)))

    def _table(*rows, banner=""):
        return ("# F\n\n" + banner +
                "| Claim | Evidence |\n| --- | --- |\n" +
                "\n".join(rows) + "\n")

    cases.append((
        "CG-27 a same-row historical marker exempts the table claim",
        _cur(_table(
            "| Wave A is accepted. | Historically, this was true. |"))[3]
        == 0))

    cases.append((
        "CG-27 a sibling table row's owner does not satisfy the current claim",
        _cur(_table(
            "| Wave A is accepted. | Current state |",
            "| Other note | `PROJECT-STATUS.md` owns the wave state. |"))[3]
        == 1))

    cases.append((
        "CG-27 a sibling table row's as-of date does not satisfy the current claim",
        _cur(_table(
            "| P-33 is satisfied, so authoring may begin. | Current state |",
            "| Measurement note | counted as of 2026-08-13 |"))[3]
        == 1))

    cases.append((
        "CG-27 same-row owner and as-of evidence satisfy table claims",
        _cur(_table(
            "| Wave A is accepted. | `PROJECT-STATUS.md` |",
            "| The launch gate stands at v1.4. | `launch-gate-pre-specifications.md` |",
            "| P-33 is satisfied, so authoring may begin. | as of 2026-08-13 |"))[3]
        == 0))

    cases.append((
        "CG-27 a leading owner banner satisfies a table claim",
        _cur(_table(
            "| Wave B is confirmed and the act was performed. | Current state |",
            banner="> `PROJECT-STATUS.md` owns current wave state.\n\n"))[3]
        == 0))

    cases.append((
        "CG-27 malformed table pipes retain paragraph semantics",
        _cur("# F\n\n| Claim | Evidence |\n| not a delimiter |\n"
             "| Wave A is accepted. | Current state |\n"
             "| Prior note | Historically, Wave A was accepted. |\n")[0:4]
        == ("OK", "CG-27  default-path current-state claims are derived or bannered",
            2, 0)))

    cases.append((
        "CG-27 lone pipe lines are not table rows",
        _cur("# F\n\n| Wave A is accepted.\n"
             "| Historically, Wave A was accepted.\n")[3] == 0))

    cases.append((
        "CG-27 fenced table syntax retains paragraph semantics",
        _cur("# F\n\n````text\n```\n| Claim | Evidence |\n| --- | --- |\n"
             "| Wave A is accepted. | Current state |\n"
             "| Prior note | Historically, Wave A was accepted. |\n"
             "````\n")[3] == 0))

    cases.append((
        "CG-27 tab-indented table syntax retains paragraph semantics",
        _cur("# F\n\n\t| Claim | Evidence |\n\t| --- | --- |\n"
             "\t| Wave A is accepted. | Current state |\n"
             "\t| Prior note | Historically, Wave A was accepted. |\n")[3]
        == 0))

    c = _cur(_table(
        "| Wave A is accepted and Wave B is confirmed. | Current state |",
        "| Prior note | Historically, both were accepted. |"))
    cases.append((
        "CG-27 multiple claims in one table row are counted independently",
        c[0] == "FAIL" and c[2] == 2 and c[3] == 2))

    # The charter's fifth fixture: a statement that says it is about the past
    # is not asserting current state, and must not be reported.
    cases.append((
        "CG-27 correctly bannered historical statement raises nothing",
        _cur("# F\n\nHistorically, Wave A was accepted at the 2026-07 "
             "pass; that revision is superseded.\n")[3] == 0))

    # Scoped, not blanket: a banner naming the wave owner must not launder a
    # gate-version claim. This is the predicate that makes the banner limb
    # worth having, and without this fixture nothing tests it.
    cases.append((
        "CG-27 a banner naming the wrong owner does not satisfy the claim",
        _cur("# F\n\n> `PROJECT-STATUS.md` wins where this disagrees.\n\n"
             "The launch gate stands at v1.4.\n")[3] == 1))

    # A banner is only visible if the reader meets it first.
    cases.append((
        "CG-27 a precedence banner buried below the prose does not count",
        _cur("# F\n\nWave A is accepted.\n\n> `PROJECT-STATUS.md` wins "
             "where this disagrees.\n")[3] == 1))

    # A file with no current-state claim at all is Unknown, not clean.
    cases.append(("CG-27 zero matched claims warns, never passes",
                  _cur("# F\n\nNothing current is asserted here.\n")[0]
                  == "WARN"))

    # An unreadable population member is Unknown too, and says so.
    c = Cap()
    cg27_default_path_currency(c, corpus=[("gone.md", None)])
    cases.append(("CG-27 an unreadable default-path file is Unknown, "
                  "not clean", c.rows[0][0] == "WARN"))

    # ---- CG-18. Review RD-17 finding 10: dropping a fixture's `Measured:`
    # anchor took the denominator from 20 to 19 with no finding and a green
    # `OK`. The anchor's absence is now the finding, and the denominator is
    # computed from the population.
    c = Cap()
    cg18_fixture_freshness(c, fixtures=[("f.md",
        "```\nscripts/context_load.py 06-CONTEXT-LOAD-MAP.md\n```\n"
        "no measured anchor here\n"
        "## Packet digest\n`0000000000000000` (recompute")])
    cases.append(("CG-18 missing `Measured:` anchor is a finding, not a skip",
                  c.rows[0][0] == "FAIL" and c.rows[0][2] == 2
                  and any("no `Measured:" in d for d in c.rows[0][4])))

    # ---- CG-23. Review RD-16 finding 5 measured both blind spots against
    # the live default path: `its **Project\nGenome**` and `warranted`.
    WREG = ("**Core — the one.**\n\n| Term | ID | Q |\n|---|---|---|\n"
            "| Capability | T-04 | x |\n\n"
            "#### T-04 · Capability\n#### T-03 · Project Genome\n"
            "#### T-17 · Warrant\n")
    c = Cap()
    cg23_default_path_vocabulary(
        c, registry=WREG,
        default_path=[("f.md", "its **Project\nGenome** holds the record")])
    cases.append(("CG-23 line-wrapped multi-word term detected",
                  any("T-03" in d for d in c.rows[0][4])))

    c = Cap()
    cg23_default_path_vocabulary(
        c, registry=WREG,
        default_path=[("f.md", "Diff -->|warranted work| Fleet")])
    cases.append(("CG-23 inflected term detected",
                  any("T-17" in d for d in c.rows[0][4])))

    c = Cap()
    cg23_default_path_vocabulary(
        c, registry=WREG, default_path=[("f.md", "a warranty is not a term")])
    cases.append(("CG-23 unlisted inflection is not a hit",
                  not any("T-17" in d for d in c.rows[0][4])))

    # The third blind spot, pinned as a **known limit** rather than repaired:
    # a term defined in place still reports. Recorded so a future silent
    # change to the behaviour shows up here instead of in a census nobody
    # re-derives. See `vocab_pattern`'s docstring for why it is not exempted.
    c = Cap()
    cg23_default_path_vocabulary(
        c, registry=WREG,
        default_path=[("f.md", "a Warrant — that is, an approved intent — "
                               "governs the work")])
    cases.append(("CG-23 defined-in-place use is still reported (known limit)",
                  any("T-17" in d for d in c.rows[0][4])))

    # ---- CG-1g. The launch-gate D2/F4 class: a route into `rfcs/**` from
    # active material is a broken pointer, and one from a frozen lane is the
    # record. Both directions, in a temp tree.
    cases.append(("CG-1g dead active-lane route into rfcs/ detected",
                  _selftest_dead_route(active=True)))
    cases.append(("CG-1g dead route inside a frozen lane is classified, "
                  "not failed",
                  _selftest_dead_route(active=False)))

    row = _selftest_code_span_link("[real](no-such-real.md)\n")
    cases.append(("CG-1a a broken link outside a code span is still checked",
                  row[0] == "FAIL" and row[2] == 1 and row[3] == 1
                  and row[4] == ["doc.md -> no-such-real.md"]))
    row = _selftest_code_span_link("example: `[text](no-such-span.md)`\n")
    cases.append(("CG-1a a broken link inside a code span is not counted",
                  row[0] == "WARN" and row[2] == 0 and row[3] == 0))
    row = _selftest_code_span_link(
        "`[text](no-such-span.md)` then [real](no-such-real.md)\n")
    cases.append(("CG-1a a code span does not hide a real broken link beside it",
                  row[0] == "FAIL" and row[2] == 1
                  and row[4] == ["doc.md -> no-such-real.md"]))
    row = _selftest_code_span_link(
        "[ok](other.md) and `[text](no-such-span.md)`\n", existing=("other.md",))
    cases.append(("CG-1a a resolving link beside a broken one in a span passes",
                  row[0] == "OK" and row[2] == 1 and row[3] == 0))

    row = _selftest_installed_fallback("valid")
    cases.append(("CG-1i valid candidate fallback is verified and disclosed",
                  row[0] == "WARN" and row[2] == 1 and row[3] == 0))

    row = _selftest_installed_fallback("missing-twin")
    cases.append(("CG-1i missing candidate twin detected",
                  row[0] == "FAIL" and row[3] == 1))

    row = _selftest_installed_fallback("wrong-depth")
    cases.append(("CG-1i unresolved candidate fallback detected",
                  row[0] == "FAIL" and row[3] == 1))

    c = Cap()
    cg7d_quoted_elsewhere([], c, act_subjects=(), subject_digests={}, corpus=[])
    cases.append(("CG-7d empty subject population warns, never passes",
                  c.rows[0][0] == "WARN" and c.rows[0][2] == 0
                  and c.rows[0][3] == 0))

    row = _selftest_cg7d_quotation("zero-subject")
    cases.append(("CG-7d zero subject denominator is disclosed",
                  row[0] == "WARN"
                  and any("ADOPT DOCTRINE AMENDMENT: D3 — 0 quotation"
                          in d for d in row[4])))

    row = _selftest_cg7d_quotation("stale-d3")
    cases.append(("CG-7d unperformed stale digest rejected",
                  row[0] == "FAIL"
                  and any("copy is stale" in d for d in row[4])))

    row = _selftest_cg7d_quotation("old-performed")
    cases.append(("CG-7d old performed digest accepted as history",
                  row[0] == "OK" and row[3] == 0))

    row = _selftest_fake_performed_table()
    cases.append(("CG-7d fake Wave-A table row cannot whitelist a digest",
                  row[0] == "FAIL" and row[3] == 1))

    # CG-7e — the first fixture the CG-7 family has ever had. Review RD-6
    # mutation-proved that falsifying every act argument in the owner-facing
    # offering left the battery green; these two reproduce that mutation and
    # its inverse, so the closure is executable rather than described.
    c = Cap()
    cg7e_act_digest_copies(list(ACT_DIGEST_COPY_FILES), c)
    cases.append(("CG-7e examines the real act-copy population without error",
                  c.rows[0][2] > 0))

    c = Cap()
    saved = dict(ACT_DIGEST_COPY_FILES)
    ACT_DIGEST_COPY_FILES.clear()
    ACT_DIGEST_COPY_FILES[LOAD_MAP] = ("ACCEPT TOPOLOGY",)
    try:
        cg7e_act_digest_copies([LOAD_MAP], c)
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(saved)
    cases.append(("CG-7e file declaring an act it does not carry detected",
                  c.rows[0][0] == "FAIL"))

    for review_copy in POLARIS_UNDERSTANDING_REVIEW_COPIES:
        for valid in (True, False):
            row = _selftest_cg7e_wrong_historical(review_copy, valid)
            cases.append((f"CG-7e reconciliation {os.path.basename(review_copy)} "
                          + ("historical copy valid" if valid else "changed copy refused despite decoy"),
                          row[0] == ("OK" if valid else "FAIL") and row[2] == 1))
    row = _selftest_cg7e_wrong_historical()
    cases.append(("CG-7e decoy old digest cannot mask mutated act-6 line",
                  row[0] == "FAIL"
                  and any("exact act-time quotation" in d for d in row[4])))

    # bd-eau: a bare `Manifest SHA-256:` copy with no phrase on its line,
    # mutated, must fail even though the file's phrase-linked copy elsewhere
    # is correct (predicate 1's whole-body substring check alone is fooled by
    # exactly this — see cg7e_act_digest_copies's docstring update above).
    def bare_findings(row):
        return [x for x in row[4] if "bare `" in x]

    for kind, shown in (
            ("stale", "Manifest SHA-256:"),
            ("qualified-stale", "Behavior manifest SHA-256:"),
            ("offer-stale", "Exact offer SHA-256:"),
            ("second-label-stale", "Policy SHA-256:"),
            ("bold-stale", "Registry SHA-256:"),
            ("lower-item-stale", "Transaction-manifest sha256:"),
            ("backtick-label-stale", "`synthetic-manifest.txt` sha256:"),
            ("no-colon-stale", "SHA-256")):
        row = _selftest_cg7e_bare_manifest_copy(kind)
        cases.append((f"CG-7e mutated bare `{shown}` copy fails despite a "
                      f"correct phrase line ({kind})",
                      row[0] == "FAIL"
                      and len(bare_findings(row)) == 1
                      and f"bare `{shown}` copy" in bare_findings(row)[0]))

    for kind in ("correct", "second-label-correct", "bold-correct",
                 "paren-correct", "exempt-correct", "prose",
                 "no-colon-correct"):
        row = _selftest_cg7e_bare_manifest_copy(kind)
        cases.append((f"CG-7e bare heading copy passes ({kind})",
                      row[0] == "OK" and row[3] == 0))

    row = _selftest_cg7e_bare_manifest_copy("historical-correct")
    cases.append(("CG-7e bare copy of this file's performed-history digest "
                  "raises no bare-copy finding",
                  row is not None and not bare_findings(row)))

    row = _selftest_cg7e_bare_manifest_copy("exempt-drift")
    cases.append(("CG-7e checked container exemption fails when the "
                  "container file drifts",
                  row[0] == "FAIL"
                  and any("checked exemption" in x for x in row[4])))

    # bd syzygy-wh1: the shape-independent near-miss pass over unlabeled
    # copies (R-CG7E-BARE-DIGEST-CONFIRMATION-2 finding 4).
    def near_findings(row):
        return [x for x in row[4] if "unlabeled digest" in x]

    row = _selftest_cg7e_unlabeled_near_miss("exact")
    cases.append(("CG-7e unlabeled exact current and historical copies pass",
                  row[0] == "OK" and row[3] == 0))
    for kind in ("urn", "table", "checksum", "phrase"):
        row = _selftest_cg7e_unlabeled_near_miss(kind)
        cases.append((f"CG-7e unlabeled one-character {kind} copy fails "
                      f"despite a correct phrase line",
                      row[0] == "FAIL" and row[3] == 1
                      and len(near_findings(row)) == 1
                      and near_findings(row)[0].startswith(
                          "OWNER-DECISION-PACKET.md:3 — ")))
    row = _selftest_cg7e_unlabeled_near_miss("cross-file")
    cases.append(("CG-7e another file's exact historical digest cannot "
                  "excuse this file's near miss",
                  row[0] == "FAIL" and row[3] == 1
                  and near_findings(row)[0].startswith(
                      "OWNER-DECISION-PACKET.md:3 — ")))
    row = _selftest_cg7e_unlabeled_near_miss("distance-two")
    cases.append(("CG-7e unrelated token two characters off passes",
                  row[0] == "OK" and row[3] == 0))
    row = _selftest_cg7e_unlabeled_near_miss("two-character")
    cases.append(("CG-7e two-character corruption is the disclosed residual "
                  "(not caught by the near-miss pass)",
                  row[0] == "OK" and not near_findings(row)))
    first, rest = _selftest_cg7e_unlabeled_near_miss("concurrent")
    cases.append(("CG-7e near-miss findings identical sequentially and "
                  "across eight concurrent calls",
                  first[0] == "FAIL" and len(near_findings(first)) == 1
                  and all(r == first for r in rest)))

    # bd syzygy-yu4a: pinned superseded and retired copies, own file only.
    row = _selftest_cg7e_pinned_copy("own")
    cases.append(("CG-7e pinned superseded and retired copies pass in their "
                  "own file",
                  row[0] == "OK" and row[3] == 0))
    for kind, line in (("corrupt-superseded", 5), ("corrupt-retired", 7)):
        row = _selftest_cg7e_pinned_copy(kind)
        cases.append((f"CG-7e pinned copy one character off fails ({kind})",
                      row[0] == "FAIL" and any(
                          x.startswith(f"OWN-RECORD.md:{line} — unlabeled digest")
                          for x in row[4])))
    for kind in ("foreign-superseded", "foreign-retired"):
        row = _selftest_cg7e_pinned_copy(kind)
        cases.append((f"CG-7e pinned copy is refused in a foreign file ({kind})",
                      row[0] == "FAIL" and row[3] == 1
                      and row[4][0].startswith("FOREIGN-PACKET.md:3 — bare")))
    row = _selftest_cg7e_pinned_copy("retired-performed")
    cases.append(("CG-7e retired-offer pin naming a performed digest fails",
                  row[0] == "FAIL" and row[3] == 1
                  and "register it as performed history" in row[4][0]))

    # Version-tagged sign-off exemptions (Scope A): existence-gated per package.
    import tempfile as _tempfile
    with _tempfile.TemporaryDirectory() as _d:
        _dec = os.path.join(_d, DECISIONS)
        os.makedirs(_dec)
        _registry = {packet: ("LABEL",) for _stem, packet in VERSIONED_SIGNOFF_PACKAGES}
        _registry["other.md"] = ("LABEL",)
        _none = _versioned_exempt_files(_d)
        with open(os.path.join(_dec, "PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-SIGNOFF-v1.0.md"), "w") as _fh:
            _fh.write("record\n")
        with open(os.path.join(_dec, "PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-SIGNOFF-v1.x.md"), "w") as _fh:
            _fh.write("not a version\n")
        _one = _versioned_exempt_files(_d)
        _apply_versioned_signoff_exemptions(_registry, _d)
    cases.append(("CG-7e a package without a version-tagged record keeps its packet copy",
                  _none == set()))
    cases.append(("CG-7e a version-tagged record exempts only its own package's packet",
                  _one == {f"{PWB_MISSING_CURRENCY_DIR}/OWNER-DECISION-PACKET.md"}
                  and f"{PWB_MISSING_CURRENCY_DIR}/OWNER-DECISION-PACKET.md" not in _registry
                  and "other.md" in _registry
                  and len(_registry) == len(VERSIONED_SIGNOFF_PACKAGES)
                  and f"{PWB_DISMISSAL_EXPIRY_DIR}/OWNER-DECISION-PACKET.md" in _registry))

    absent = _selftest_polaris_edit_repair_candidate_registration(False)
    cases.append(("CG-7d/7e absent edit-repair manifest registers no candidate phrase or packet",
                  absent == (0, {})))
    present = _selftest_polaris_edit_repair_candidate_registration(True)
    cases.append(("CG-7d/7e present edit-repair manifest registers phrase and packet once",
                  present == (1, {
                      f"{POLARIS_EDIT_REPAIR_DIR}/OWNER-DECISION-PACKET.md":
                          (POLARIS_EDIT_REPAIR_LABEL,)})))
    absent, present = _selftest_contract_restyle_packet_registration()
    cases.append(("CG-7e restyle packet absent under the given root registers "
                  "nothing", absent == {}))
    cases.append(("CG-7e restyle packet present under the given root registers "
                  "exactly its copy into the given registry",
                  present == {"selftest/OTHER.md": ("OTHER LABEL",),
                              CONTRACT_RESTYLE_PACKET:
                                  (CONTRACT_RESTYLE_LABEL,)}))
    import tempfile as _tf_sv
    with _tf_sv.TemporaryDirectory() as d:
        pkt = os.path.join(d, SCOPED_VALUES_PACKET)
        os.makedirs(os.path.dirname(pkt))
        none, both = {}, {}
        _activate_scoped_values_copy_registry(none, d)
        open(pkt, "w").close()
        _activate_scoped_values_copy_registry(both, d)
        act_file = os.path.join(d, SCOPED_VALUES_ACT)
        os.makedirs(os.path.dirname(act_file), exist_ok=True)
        open(act_file, "w").close()
        full = {PERFORMED_ACT_RECORD: ("OTHER LABEL",)}
        _activate_scoped_values_copy_registry(full, d)
    cases.append(("CG-7e scoped-values copies register only as each file appears",
                  none == {} and both == {SCOPED_VALUES_PACKET: (SCOPED_VALUES_LABEL,)}
                  and full == {PERFORMED_ACT_RECORD: ("OTHER LABEL", SCOPED_VALUES_LABEL),
                               SCOPED_VALUES_PACKET: (SCOPED_VALUES_LABEL,),
                               SCOPED_VALUES_ACT: (SCOPED_VALUES_LABEL,)}))
    cases.append(("CG-7e tracked restyle packet is registered at import",
                  os.path.isfile(os.path.join(ROOT, CONTRACT_RESTYLE_PACKET))
                  and ACT_DIGEST_COPY_FILES.get(CONTRACT_RESTYLE_PACKET)
                  == (CONTRACT_RESTYLE_LABEL,)))

    row = _selftest_pwb_act_copy_registry("valid")
    cases.append(("CG-7e performed PWB act registers both record copies",
                  row[0] == "OK" and row[2] == 2 and row[3] == 0))

    row = _selftest_pwb_act_copy_registry("missing-aggregate")
    cases.append(("CG-7e performed PWB act requires aggregate record copy",
                  row[0] == "FAIL"
                  and any(PERFORMED_ACT_RECORD in d for d in row[4])))

    truth_link = (PWB_TRUTH_AMENDMENT_LABEL, PWB_TRUTH_AMENDMENT_SUBJECT,
                  PWB_TRUTH_AMENDMENT_ACT,
                  _activate_pwb_truth_amendment_act_copy_registry)
    row = _selftest_pwb_act_copy_registry("valid", truth_link)
    cases.append(("CG-7e performed PWB truth act registers both record copies",
                  row[0] == "OK" and row[2] == 2 and row[3] == 0))

    row = _selftest_pwb_act_copy_registry("missing-aggregate", truth_link)
    cases.append(("CG-7e performed PWB truth act requires aggregate record copy",
                  row[0] == "FAIL"
                  and any(PERFORMED_ACT_RECORD in d for d in row[4])))

    # Rule 6 for this repository's newest act-phrase registration. Review
    # finding F2 on the exact-source render-mode package observed that a
    # registration with no fixture is trusted rather than proved: the general
    # copy-registry mechanism is exercised above, but not this label, which is
    # the surface a later edit to its packet or its constants block would
    # break. The one registered label still without a fixture of its own is
    # PWB_SCOPED_AMENDMENT_LABEL (the same gap, disclosed in that review);
    # adding it belongs to that package's own branch, not this one.
    render_mode_link = (PWB_RENDER_MODE_LABEL, PWB_RENDER_MODE_SUBJECT,
                        PWB_RENDER_MODE_ACT,
                        _activate_pwb_render_mode_act_copy_registry)
    row = _selftest_pwb_act_copy_registry("valid", render_mode_link)
    cases.append(("CG-7e performed PWB render-mode act registers both record copies",
                  row[0] == "OK" and row[2] == 2 and row[3] == 0))

    row = _selftest_pwb_act_copy_registry("missing-aggregate", render_mode_link)
    cases.append(("CG-7e performed PWB render-mode act requires aggregate record copy",
                  row[0] == "FAIL"
                  and any(PERFORMED_ACT_RECORD in d for d in row[4])))

    for name, link in (
            ("machine-view", (PWB_MACHINE_VIEW_LABEL, PWB_MACHINE_VIEW_SUBJECT,
                              PWB_MACHINE_VIEW_ACT,
                              _activate_pwb_machine_view_act_copy_registry)),
            ("opening-band", (PWB_OPENING_BAND_LABEL, PWB_OPENING_BAND_SUBJECT,
                              PWB_OPENING_BAND_ACT,
                              _activate_pwb_opening_band_act_copy_registry)),
            ("missing-currency", (PWB_MISSING_CURRENCY_LABEL,
                                  PWB_MISSING_CURRENCY_SUBJECT,
                                  PWB_MISSING_CURRENCY_ACT,
                                  _activate_pwb_missing_currency_act_copy_registry)),
            ("dismissal-expiry", (PWB_DISMISSAL_EXPIRY_LABEL,
                                  PWB_DISMISSAL_EXPIRY_SUBJECT,
                                  PWB_DISMISSAL_EXPIRY_ACT,
                                  _activate_pwb_dismissal_expiry_act_copy_registry)),
            ("item-depth", (PWB_ITEM_DEPTH_LABEL, PWB_ITEM_DEPTH_SUBJECT,
                            PWB_ITEM_DEPTH_ACT,
                            _activate_pwb_item_depth_act_copy_registry))):
        row = _selftest_pwb_act_copy_registry("valid", link)
        cases.append((f"CG-7e performed PWB {name} act registers both record copies",
                      row[0] == "OK" and row[2] == 2 and row[3] == 0))
        row = _selftest_pwb_act_copy_registry("missing-aggregate", link)
        cases.append((f"CG-7e performed PWB {name} act requires aggregate record copy",
                      row[0] == "FAIL"
                      and any(PERFORMED_ACT_RECORD in d for d in row[4])))

    for act in POLARIS_GENERATOR_APPROVAL_ACTS:
        link = (POLARIS_GENERATOR_APPROVAL_LABEL, POLARIS_GENERATOR_APPROVAL_SUBJECT,
                act, _activate_polaris_generator_act_copy_registry)
        row = _selftest_pwb_act_copy_registry("valid", link)
        cases.append((f"CG-7e generator {os.path.basename(act)} copies registered",
                      row[0] == "OK" and row[2] == 2 and row[3] == 0))
        row = _selftest_pwb_act_copy_registry("missing-aggregate", link)
        cases.append((f"CG-7e generator {os.path.basename(act)} missing aggregate refused",
                      row[0] == "FAIL"
                      and any(PERFORMED_ACT_RECORD in d for d in row[4])))

    understanding_link = (POLARIS_UNDERSTANDING_LABEL, POLARIS_UNDERSTANDING_SUBJECT,
                          POLARIS_UNDERSTANDING_ACT,
                          _activate_polaris_understanding_act_copy_registry)
    row = _selftest_pwb_act_copy_registry("valid", understanding_link)
    cases.append(("CG-7e understanding adoption copies registered",
                  row[0] == "OK" and row[2] == 2 and row[3] == 0))
    row = _selftest_pwb_act_copy_registry("missing-aggregate", understanding_link)
    cases.append(("CG-7e understanding adoption missing aggregate refused",
                  row[0] == "FAIL" and any(PERFORMED_ACT_RECORD in d for d in row[4])))

    row, registered = _selftest_pwb_effect_act_copy_registry("valid")
    cases.append(("CG-7e performed PWB effect act registers exactly its two copies",
                  row[0] == "OK" and row[2] == 2 and row[3] == 0
                  and registered == tuple(sorted(
                      (PERFORMED_ACT_RECORD, PWB_EFFECT_ACTS[0][2])))))

    row, _registered = _selftest_pwb_effect_act_copy_registry("missing-aggregate")
    cases.append(("CG-7e performed PWB effect act requires aggregate record copy",
                  row[0] == "FAIL"
                  and any(PERFORMED_ACT_RECORD in d for d in row[4])))

    row, _registered = _selftest_pwb_effect_act_copy_registry("stale-dedicated")
    cases.append(("CG-7e performed PWB effect act rejects stale dedicated copy",
                  row[0] == "FAIL"
                  and any(PWB_EFFECT_ACTS[0][2] in d for d in row[4])))

    amended_label, _s, amended_predecessor, amended_act, _old = PWB_EFFECT_AMENDMENT_ACTS[0]
    row, registered = _selftest_pwb_effect_amendment_copy_registry("valid")
    cases.append(("CG-7e amended PWB effect act pins five historical copies and two current",
                  row[0] == "OK" and row[2] == 7 and row[3] == 0
                  and amended_act in registered[0]
                  and amended_predecessor in registered[1]
                  and amended_predecessor not in registered[0]
                  and f"{PWB_EFFECT_ACTS_DIR}/ACT-SEMANTICS.md" in registered[0]
                  and amended_label not in registered[2].get(
                      f"{PWB_EFFECT_ACTS_DIR}/ACT-SEMANTICS.md", ())
                  and len(registered[2][f"{PWB_EFFECT_ACTS_DIR}/ACT-SEMANTICS.md"]) == 2))

    row, registered = _selftest_pwb_effect_amendment_copy_registry("pre-act")
    cases.append(("CG-7e unperformed PWB effect amendment leaves 2026-09-02 copies current and stale",
                  row[0] == "FAIL"
                  and amended_act not in registered[0]
                  and amended_predecessor not in registered[1]
                  and any(amended_predecessor in d and "stale" in d for d in row[4])))

    row, _registered = _selftest_pwb_effect_amendment_copy_registry("stale-amendment")
    cases.append(("CG-7e amended PWB effect act rejects stale amendment record",
                  row[0] == "FAIL"
                  and any(amended_act in d and "stale" in d for d in row[4])))

    row, _registered = _selftest_pwb_effect_amendment_copy_registry("rewritten-history")
    cases.append(("CG-7e amended PWB effect act rejects rewritten 2026-09-02 record",
                  row[0] == "FAIL"
                  and any(amended_predecessor in d and "act-time quotation" in d
                          for d in row[4])))

    row, _registered = _selftest_pwb_effect_amendment_copy_registry("unperformed-history")
    cases.append(("CG-7e amended PWB effect act requires the superseded digest to be performed",
                  row[0] == "FAIL"
                  and any("never performed" in d for d in row[4])))

    row = _selftest_cg7h("missing-act")
    cases.append(("CG-7h missing current amendment act rejected",
                  row[0] == "FAIL"
                  and any(GENERAL_BOOTSTRAP_ACT in d for d in row[4])))

    row = _selftest_cg7h("mismatched-act")
    cases.append(("CG-7h mismatched current amendment act rejected",
                  row[0] == "FAIL"
                  and any("latest performed digest" in d for d in row[4])))

    row = _selftest_cg7h("valid")
    cases.append(("CG-7h complete transaction population passes at 77",
                  row[0] == "OK" and row[2] == 77 and row[3] == 0))

    # The restyle's copy registries: the packet alone before the act; after
    # it, the act-time CC-SPEC/CC-IMPACT copies move to history.
    import tempfile
    with tempfile.TemporaryDirectory() as scratch:
        registry = {f"{CANDIDATES}/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md":
                        (CC_IMPACT_LABEL, "ACCEPT TOPOLOGY"),
                    f"{GENERAL_BOOTSTRAP_DIR}/ACT-SEMANTICS.md": (CC_SPEC_LABEL,)}
        history = {}
        packet = f"{SPEC_POLICY_RESTYLE_DIR}/OWNER-DECISION-PACKET.md"
        for rel in (packet,):
            os.makedirs(os.path.dirname(os.path.join(scratch, rel)), exist_ok=True)
            open(os.path.join(scratch, rel), "w").close()
        _activate_spec_policy_restyle_copy_registries(registry, history, scratch)
        cases.append(("CG-7e spec-policy restyle packet registered, nothing moved before the act",
                      registry.get(packet) == (SPEC_POLICY_RESTYLE_LABEL,)
                      and not history
                      and registry[f"{GENERAL_BOOTSTRAP_DIR}/ACT-SEMANTICS.md"]
                      == (CC_SPEC_LABEL,)))
        os.makedirs(os.path.dirname(os.path.join(scratch, SPEC_POLICY_RESTYLE_ACT)),
                    exist_ok=True)
        open(os.path.join(scratch, SPEC_POLICY_RESTYLE_ACT), "w").close()
        _activate_spec_policy_restyle_copy_registries(registry, history, scratch)
        final = f"{CANDIDATES}/FINAL-FOUNDATIONAL-CONTRACT-ACCEPTANCE-RECORD.md"
        cases.append(("CG-7e performed spec-policy restyle pins the act-time copies as history",
                      registry[final] == ("ACCEPT TOPOLOGY",)
                      and f"{GENERAL_BOOTSTRAP_DIR}/ACT-SEMANTICS.md" not in registry
                      and history[final][CC_IMPACT_LABEL][0][0] == CC_IMPACT_ACT_7_DIGEST
                      and history[GENERAL_BOOTSTRAP_SUBJECT][CC_SPEC_LABEL][0][0]
                      == CC_SPEC_TRANSACTION_DIGEST
                      and registry[SPEC_POLICY_RESTYLE_ACT]
                      == (SPEC_POLICY_RESTYLE_LABEL, CC_IMPACT_LABEL, CC_SPEC_LABEL)
                      and SPEC_POLICY_RESTYLE_LABEL
                      in registry[f"{CRAFT}/INSTALL-RECORD.md"]))

    # The POC readability successor: packet before the act, records after.
    with tempfile.TemporaryDirectory() as scratch:
        registry = {f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md": ("ACCEPT TOPOLOGY",)}
        packet = f"{POC_READABILITY_DIR}/OWNER-DECISION-PACKET.md"
        _activate_poc_readability_copy_registry(registry, scratch)
        cases.append(("CG-7e POC readability successor registers nothing without its packet",
                      packet not in registry))
        for rel in (packet,):
            os.makedirs(os.path.dirname(os.path.join(scratch, rel)), exist_ok=True)
            open(os.path.join(scratch, rel), "w").close()
        _activate_poc_readability_copy_registry(registry, scratch)
        cases.append(("CG-7e POC readability packet registered, records not before the act",
                      registry.get(packet) == (POC_READABILITY_LABEL,)
                      and POC_READABILITY_ACT not in registry
                      and registry[f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"]
                      == ("ACCEPT TOPOLOGY",)))
        os.makedirs(os.path.dirname(os.path.join(scratch, POC_READABILITY_ACT)),
                    exist_ok=True)
        open(os.path.join(scratch, POC_READABILITY_ACT), "w").close()
        _activate_poc_readability_copy_registry(registry, scratch)
        cases.append(("CG-7e performed POC readability successor registers both records",
                      registry[POC_READABILITY_ACT] == (POC_READABILITY_LABEL,)
                      and registry[f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"]
                      == ("ACCEPT TOPOLOGY", POC_READABILITY_LABEL)))

    # Generic readability successors: discovered by SUCCESSOR.json; packet
    # before the act, records after.
    with tempfile.TemporaryDirectory() as scratch:
        package = f"{CANDIDATES}/example-readability-successor"
        act = f"{DECISIONS}/EXAMPLE-ACT.md"
        os.makedirs(os.path.join(scratch, package))
        with open(os.path.join(scratch, package, "SUCCESSOR.json"), "w") as stream:
            json.dump({"label": "SIGN OFF EXAMPLE", "act": act}, stream)
        registry = {f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md": ("ACCEPT TOPOLOGY",)}
        _activate_readability_successor_copies(registry, scratch)
        cases.append(("CG-7e readability successor without packet or act registers nothing",
                      registry == {f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md": ("ACCEPT TOPOLOGY",)}
                      and _readability_successors(scratch)
                      == [(package, "SIGN OFF EXAMPLE", act)]))
        open(os.path.join(scratch, package, "OWNER-DECISION-PACKET.md"), "w").close()
        _activate_readability_successor_copies(registry, scratch)
        cases.append(("CG-7e readability successor packet registered before the act",
                      registry.get(f"{package}/OWNER-DECISION-PACKET.md") == ("SIGN OFF EXAMPLE",)
                      and act not in registry))
        os.makedirs(os.path.dirname(os.path.join(scratch, act)), exist_ok=True)
        open(os.path.join(scratch, act), "w").close()
        _activate_readability_successor_copies(registry, scratch)
        cases.append(("CG-7e performed readability successor registers both records",
                      registry[act] == ("SIGN OFF EXAMPLE",)
                      and registry[f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"]
                      == ("ACCEPT TOPOLOGY", "SIGN OFF EXAMPLE")))

    # The specification-policy restyle successor (and act 7's CC-IMPACT).
    row = _selftest_cg7h("impact-drift")
    cases.append(("CG-7h CC-IMPACT drift from its latest performed digest detected",
                  row[0] == "FAIL"
                  and any(CC_IMPACT_SUBJECT in d and "latest performed digest" in d
                          for d in row[4])))
    row = _selftest_cg7h("spec-unrecorded")
    cases.append(("CG-7h unrecorded spec-policy restyle leaves the bootstrap current at 77",
                  row[0] == "OK" and row[2] == 77))
    row = _selftest_cg7h("spec-unrecorded-applied")
    cases.append(("CG-7h spec-policy restyle bytes without an act rejected",
                  row[0] == "FAIL"
                  and any("latest performed digest" in d for d in row[4])))
    row = _selftest_cg7h("spec-valid")
    cases.append(("CG-7h valid spec-policy restyle passes at 88 with the CC-SPEC row as history",
                  row[0] == "OK" and row[2] == 88 and row[3] == 0
                  and any(d.startswith("[historical]") and "act-time CC-SPEC row" in d
                          for d in row[4])))
    for spec_kind, want in (
            ("spec-drift", "hashes to"),
            ("spec-body-mismatch", "manifest body digest differs"),
            ("spec-impact-drift", "hashes to"),
            ("spec-phrase-mismatch", "expected exactly one bare"),
            ("spec-nested-missing", "recorder-generated"),
            ("spec-instant-mismatch", "Act instant"),
            ("spec-bootstrap-rewritten", "does not name the transaction's CC-SPEC row")):
        row = _selftest_cg7h(spec_kind)
        cases.append((f"CG-7h spec-policy restyle {spec_kind} rejected",
                      row[0] == "FAIL" and any(want in d for d in row[4])))

    row = _selftest_cg7h("top-level-drift")
    cases.append(("CG-7h top-level transaction subject drift detected",
                  row[0] == "FAIL"
                  and any("ACT-SEMANTICS.md" in d for d in row[4])))

    row = _selftest_cg7h("poc-successor-history")
    cases.append(("CG-7h a POC coverage row a recorded version-tagged sign-off re-patched "
                  "to today's bytes is history",
                  row[0] == "OK"
                  and any("act-time POC row superseded" in d for d in row[4])))
    for poc_kind, why in (("poc-successor-unrecorded", "no aggregate block"),
                          ("poc-successor-other-digest", "its row names other bytes"),
                          ("poc-successor-overridden", "a later sign-off names other bytes"),
                          ("poc-successor-no-record", "its dedicated record is absent"),
                          ("poc-successor-other-path", "its row names another path")):
        row = _selftest_cg7h(poc_kind)
        cases.append((f"CG-7h POC coverage drift stays a finding when {why}",
                      row[0] == "FAIL"
                      and any("poc/CONTRACT-COVERAGE.md` hashes to" in d for d in row[4])))

    row = _selftest_cg7h("nested-contract-drift")
    cases.append(("CG-7h nested contract row drift detected",
                  row[0] == "FAIL"
                  and any(f"installed `{GENERAL_BOOTSTRAP_CONTRACT_PATHS[0]}`" in d
                          for d in row[4])))

    row = _selftest_cg7h("nested-pwb-drift")
    cases.append(("CG-7h nested PWB row drift detected",
                  row[0] == "FAIL"
                  and any("CONTRACT-COVERAGE-REPAIR-DELTA.md" in d
                          for d in row[4])))

    row = _selftest_cg7h("historical-pwb-path")
    cases.append(("CG-7h historical PWB path population is closed",
                  row[0] == "FAIL"
                  and any("subject path population/order" in d
                          for d in row[4])))

    row = _selftest_cg7h("candidate-successor-no-act")
    cases.append(("CG-7h unsigned successor manifest grants no supersession",
                  row[0] == "FAIL" and row[2] == 77))

    row = _selftest_cg7h("successor-one-record")
    cases.append(("CG-7h one-sided successor act rejected",
                  row[0] == "FAIL"
                  and any(PWB_STATE1_ACT in d for d in row[4])))

    row = _selftest_cg7h("successor-conflict")
    cases.append(("CG-7h conflicting successor act digests rejected",
                  row[0] == "FAIL"
                  and any("latest performed digest" in d for d in row[4])))

    row = _selftest_cg7h("valid-successor")
    cases.append(("CG-7h valid 11-row successor passes at 90",
                  row[0] == "OK" and row[2] == 90 and row[3] == 0))

    row = _selftest_cg7h("successor-current-drift")
    cases.append(("CG-7h post-successor current artifact drift detected",
                  row[0] == "FAIL"
                  and any(PWB_STATE1_SUBJECTS[0] in d for d in row[4])))

    for mutation in ("successor-10", "successor-12", "successor-duplicate",
                     "successor-reordered", "successor-escaping"):
        row = _selftest_cg7h(mutation)
        cases.append((f"CG-7h {mutation} manifest rejected",
                      row[0] == "FAIL"
                      and any("PWB-AMENDMENT-MANIFEST.txt" in d
                              for d in row[4])))

    row = _selftest_cg7h("valid-truth-successor")
    cases.append(("CG-7h valid truth-and-readiness successor passes at 103 "
                  "with state-(1) rows preserved as history",
                  row[0] == "OK" and row[2] == 103 and row[3] == 0
                  and any("[historical] " + PWB_STATE1_SUBJECT in d
                          for d in row[4])))

    row = _selftest_cg7h("truth-candidate-no-act")
    cases.append(("CG-7h unsigned truth candidate grants no supersession",
                  row[0] == "FAIL"
                  and any(PWB_STATE1_SUBJECT in d for d in row[4])))

    row = _selftest_cg7h("truth-one-record")
    cases.append(("CG-7h one-sided truth successor act rejected",
                  row[0] == "FAIL"
                  and any(PWB_TRUTH_AMENDMENT_ACT in d for d in row[4])))

    row = _selftest_cg7h("truth-conflict")
    cases.append(("CG-7h conflicting truth successor digests rejected",
                  row[0] == "FAIL"
                  and any("latest performed digest" in d for d in row[4])))

    row = _selftest_cg7h("truth-current-drift")
    cases.append(("CG-7h post-truth-successor current artifact drift detected",
                  row[0] == "FAIL"
                  and any(PWB_TRUTH_AMENDMENT_SUBJECTS[0] in d
                          for d in row[4])))

    row = _selftest_cg7h("truth-without-state1")
    cases.append(("CG-7h truth successor without its predecessor is a gap",
                  row[0] == "FAIL"
                  and any("chain has a gap" in d for d in row[4])))

    row = _selftest_cg7h("truth-10")
    cases.append(("CG-7h truth-10 manifest rejected",
                  row[0] == "FAIL"
                  and any("PWB-BEHAVIOR-AMENDMENT-MANIFEST.txt" in d
                          for d in row[4])))

    for _key, *_rest in VERSIONED_PWB_PACKAGES:
        row = _selftest_cg7h(f"versioned-{_key}-valid")
        cases.append((f"CG-7h version-tagged {_key} sign-off binds the current manifest",
                      row[0] == "OK" and row[3] == 0))
        row = _selftest_cg7h(f"versioned-{_key}-drift")
        cases.append((f"CG-7h version-tagged {_key} sign-off rejects a drifted subject",
                      row[0] == "FAIL"
                      and any(PWB_STATE1_SUBJECTS[0] in d for d in row[4])))
    row = _selftest_cg7h("versioned-latest-stale")
    cases.append(("CG-7h a later version-tagged sign-off retires the earlier package's "
                  "rows as the current binding",
                  row[0] == "FAIL"
                  and any(PWB_STATE1_SUBJECTS[0] in d for d in row[4])))

    row = _selftest_cg7h("contract-valid")
    cases.append(("CG-7h exact two-module contract successor passes at 81",
                  row[0] == "OK" and row[2] == 81 and row[3] == 0))
    no_signal_for = f"for `{POLARIS_NO_SIGNAL_LABEL}`, found"
    contract_failures = {
        "candidate-only": "installed `rfcs/RFC-0008/state-vocabulary-and-cost.md`",
        "no-dedicated": f"expected exactly one performed contract successor record {no_signal_for} 0",
        "no-aggregate": f"expected exactly one performed contract successor record {no_signal_for} 0",
        "duplicate-aggregate": f"expected exactly one performed contract successor record {no_signal_for} 2",
        "duplicate-dedicated": f"expected exactly one performed contract successor record {no_signal_for} 2",
        "conflict": "latest performed digest",
        "invalid-predecessor": "bootstrap predecessor is invalid",
        "historical-drift": "bootstrap predecessor is invalid",
        "missing-body": "manifest body digest differs",
        "stale-digest": "manifest body digest differs",
        "current-drift": "hashes to",
        "mirror-drift": "installed and candidate",
        "missing-mirror": "mirror pair",
        "third-path-drift": f"installed `{GENERAL_BOOTSTRAP_CONTRACT_PATHS[0]}`",
        "duplicate-path": "duplicate subject path",
        "reordered": "subject path population/order",
        "escape": "subject escapes its declared base",
        "alias": "subject path population/order",
        "extra": "expected 2",
        "extra-bootstrap": "parsed 3 digest row(s), expected 2",
        "extra-rendering": "parsed 3 digest row(s), expected 2",
        "missing-row": "parsed 1 digest row(s), expected 2",
        "malformed": "non-comment line is not a digest row",
        "malformed-aggregate-original": "malformed contract successor label occurrence",
        "malformed-extra-dedicated": "malformed contract successor label occurrence",
        "malformed-extra-aggregate": "malformed contract successor label occurrence",
        "unmatched-backtick": "malformed contract successor label occurrence",
        "duplicate-quoted": "malformed contract successor label occurrence",
        "duplicate-indented": "malformed contract successor label occurrence",
        "trailing-prose": "malformed contract successor label occurrence",
    }
    for mutation, diagnostic in contract_failures.items():
        row = _selftest_cg7h(f"contract-{mutation}")
        cases.append((f"CG-7h contract successor {mutation} rejected",
                      row[0] == "FAIL" and any(diagnostic in d for d in row[4])))

    # The second chain link: the 29-module readability restyle. Its closed
    # tuple is the bootstrap manifest's own 30 paths minus the one excluded
    # module, and the literal bootstrap tuple matches the manifest on disk.
    bootstrap_text = read(GENERAL_BOOTSTRAP_CONTRACT_MANIFEST) if os.path.isfile(
        os.path.join(ROOT, GENERAL_BOOTSTRAP_CONTRACT_MANIFEST)) else ""
    on_disk = tuple(m.group("path").strip() for line in bootstrap_text.splitlines()
                    if (m := DIGEST_ROW.match(line.strip())))
    cases.append(("CG-7h closed link tuples: bootstrap literal equals the "
                  "manifest's 30 paths; restyle is those minus the rendering "
                  "module; no-signal is a sorted bootstrap subset",
                  on_disk == GENERAL_BOOTSTRAP_CONTRACT_PATHS
                  and len(CONTRACT_RESTYLE_PATHS) == 29
                  and CONTRACT_RESTYLE_EXCLUDED not in CONTRACT_RESTYLE_PATHS
                  and set(CONTRACT_RESTYLE_PATHS) | {CONTRACT_RESTYLE_EXCLUDED}
                  == set(GENERAL_BOOTSTRAP_CONTRACT_PATHS)
                  and list(CONTRACT_RESTYLE_PATHS) == sorted(CONTRACT_RESTYLE_PATHS)
                  and set(POLARIS_NO_SIGNAL_PATHS) <= set(GENERAL_BOOTSTRAP_CONTRACT_PATHS)
                  and [link[4] for link in CONTRACT_SUCCESSOR_CHAIN]
                  == [POLARIS_NO_SIGNAL_PATHS, CONTRACT_RESTYLE_PATHS,
                      RFC5_CLASS_PATHS]))
    row = _selftest_cg7h("restyle-valid")
    cases.append(("CG-7h 29-row restyle link alone passes at 108 "
                  "(no-signal gap allowed)",
                  row[0] == "OK" and row[2] == 108 and row[3] == 0))
    row = _selftest_cg7h("restyle-both-performed")
    cases.append(("CG-7h both contract links performed pass at 111 with the "
                  "restyle digest overriding the no-signal rows",
                  row[0] == "OK" and row[2] == 112 and row[3] == 0
                  and any("superseded by " + CONTRACT_RESTYLE_SUBJECT in d
                          and "[historical] " + POLARIS_NO_SIGNAL_SUBJECT in d
                          for d in row[4])))
    row = _selftest_cg7h("restyle-inserted-earlier")
    cases.append(("CG-7h no-signal section above the restyle with an earlier "
                  "act instant passes at 112 as superseded history",
                  row[0] == "OK" and row[2] == 112 and row[3] == 0))
    row = _selftest_cg7h("restyle-candidate-inert")
    cases.append(("CG-7h unrecorded restyle candidate over bootstrap bytes "
                  "examines only the bootstrap population",
                  row[0] == "OK" and row[2] == 77))
    restyle_for = f"for `{CONTRACT_RESTYLE_LABEL}`, found"
    restyle_failures = {
        "one-record": f"record {restyle_for} 0",
        "digest-mismatch": "latest performed digest",
        "outside-path": "no predecessor contract row for `rfcs/RFC-0099/not-a-contract.md`",
        "unsorted": "subject path population/order",
        "empty": "parsed 0 digest row(s), expected 29",
        "extra-rendering": "parsed 30 digest row(s), expected 29",
        "rendering-only": "parsed 1 digest row(s), expected 29",
        "missing-row": "parsed 28 digest row(s), expected 29",
        "shadow": f"`{POLARIS_NO_SIGNAL_LABEL}` is recorded after later chain link(s) `{CONTRACT_RESTYLE_LABEL}`",
        "shadow-nsbytes": f"`{POLARIS_NO_SIGNAL_LABEL}` is recorded after later chain link(s)",
        "current-drift": "installed `rfcs/RFC-0008/state-vocabulary-and-cost.md` hashes to",
        "mirror-drift": "installed and candidate `rfcs/RFC-0008/state-vocabulary-and-cost.md` differ",
        "both-earlier-bytes": "installed `rfcs/RFC-0008/state-vocabulary-and-cost.md` hashes to",
        "candidate-no-records": f"installed `{GENERAL_BOOTSTRAP_CONTRACT_PATHS[0]}` hashes to",
        "after-invalid-no-signal": "earlier chain link(s)",
        "inserted-later": (f"`{POLARIS_NO_SIGNAL_LABEL}` act instant "
                           f"2026-09-25T00:00:00Z is after later chain link(s) "
                           f"`{CONTRACT_RESTYLE_LABEL}`"),
        "inserted-same-instant": (f"equals later chain link(s) "
                                  f"`{CONTRACT_RESTYLE_LABEL}`; adoption "
                                  f"order is ambiguous"),
        "inserted-no-instant": (f"`{POLARIS_NO_SIGNAL_LABEL}` dedicated record "
                                f"carries 0 `Act instant:` lines"),
        "inserted-instant-disagrees": (
            f"`{POLARIS_NO_SIGNAL_LABEL}` aggregate act instant "
            f"'Act instant: 2026-09-25T00:00:00Z' differs"),
        "instant-impossible": "is not a real UTC second",
        "instant-malformed-line": "malformed act instant line",
        "instant-absent": (f"`{CONTRACT_RESTYLE_LABEL}` dedicated record "
                           f"carries 0 `Act instant:` lines"),
        "aggregate-no-instant": (f"`{CONTRACT_RESTYLE_LABEL}` aggregate "
                                 f"section carries no `Act instant:` line"),
        "splice-under-instant": "shares the act phrase's section",
        "splice-after-phrase": ("lies between the act instant and the act "
                                "phrase"),
        "splice-marker-only": (
            f"`{POLARIS_NO_SIGNAL_LABEL}` aggregate section marker "
            f"'<!-- SYNTHETIC-SPLICE:END -->'"),
        "three-link-cascade": (f"{THIRD_LINK[2]} — contract successor recorded "
                               f"while earlier chain link(s) "
                               f"`{POLARIS_NO_SIGNAL_LABEL}`, "
                               f"`{CONTRACT_RESTYLE_LABEL}`"),
    }
    for mutation, diagnostic in restyle_failures.items():
        row = _selftest_cg7h(f"restyle-{mutation}")
        cases.append((f"CG-7h restyle link {mutation} rejected",
                      row[0] == "FAIL" and any(diagnostic in d for d in row[4])))

    # The real recorder's section, appended to the real aggregate, keeps its
    # own instant; the review N-a probe over the same real aggregate (a
    # no-signal phrase alone under the understanding act's instant) does not.
    import importlib.util
    spec = importlib.util.spec_from_file_location(
        "record_contract_readability_restyle",
        os.path.join(ROOT, "scripts", "record_contract_readability_restyle.py"))
    recorder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recorder)
    real_aggregate = read(PERFORMED_ACT_RECORD)
    # Once the act is performed the real aggregate carries its block; the
    # fixture appends its own, so the performed one is set aside first.
    begin = real_aggregate.find(f"\n<!-- {recorder.MARKER}:BEGIN -->")
    if begin != -1:
        end_marker = f"<!-- {recorder.MARKER}:END -->\n"
        end = real_aggregate.index(end_marker, begin) + len(end_marker)
        real_aggregate = real_aggregate[:begin] + real_aggregate[end:]
    real_instant = "2026-09-28T00:00:00Z"
    real_body = recorder.body(
        "a" * 64, real_instant, recorder.Pins("a" * 64, "r.md", "b" * 64))
    recorded = (real_aggregate + "\n" + recorder.block(real_body)).splitlines()
    later_legacy = recorded + ["", "## A later act without an instant", "",
                               f"SYNTHETIC LATER ACT: {'c' * 64}"]
    for name, lines in (("alone", recorded),
                        ("before a later instant-less act", later_legacy)):
        at = next(i for i, line in enumerate(lines) if recorder.LABEL in line)
        cases.append((f"CG-7h real restyle recorder section ({name}) keeps "
                      f"its own act instant",
                      _contract_link_instant(real_body, lines, at,
                                             recorder.LABEL)
                      == (real_instant, None)))
    probe = real_aggregate.splitlines()
    borrowed = next(i for i, line in enumerate(probe)
                    if line == "Act instant: 2026-09-13T01:58:26Z")
    probe.insert(borrowed + 1, f"{POLARIS_NO_SIGNAL_LABEL}: {'d' * 64}")
    probe_result = _contract_link_instant(
        f"Act instant: 2026-09-13T01:58:26Z\n"
        f"{POLARIS_NO_SIGNAL_LABEL}: {'d' * 64}\n",
        probe, borrowed + 1, POLARIS_NO_SIGNAL_LABEL)
    cases.append(("CG-7h review N-a probe: a no-signal phrase under the real "
                  "understanding act's instant cannot borrow it",
                  probe_result[0] is None
                  and "shares the act phrase's section" in (probe_result[1]
                                                           or "")))

    c = Cap(); cg21_contract_prose_states_no_measurement(c, modules=[])
    cases.append(("CG-21 empty module list warns, never passes",
                  c.rows[0][0] == "WARN"))

    # The prohibition itself, mutation-tested on a synthetic body rather than
    # by editing a real contract. Three shapes, because one regex covering
    # three can pass on the shape it happens to see.
    for label, body in (
        ("comma figure", "| 1 — core | `x.md` | RFC2-1..RFC2-11 | 1,955 |"),
        ("spelled count", "This module is 1955 words at the rev10 compaction."),
        ("wc -w claim", "Counts are `wc -w` at the rev10 compaction."),
    ):
        c = Cap()
        cg20_load_map_states_no_measurement(c, body=body)
        cases.append((f"CG-20 {label} in the load map detected",
                      c.rows[0][0] == "FAIL"))

    # And the negative: the one sentence that names the report must pass, or
    # the rule forbids stating where the measurement went.
    c = Cap()
    cg20_load_map_states_no_measurement(
        c, body="Current measurement lives in `CONTEXT-BUDGET-REPORT.md` §3.")
    cases.append(("CG-20 pointer to the budget report exempted",
                  c.rows[0][0] == "OK"))

    c = Cap()
    cg20_load_map_states_no_measurement(c, body="")
    cases.append(("CG-20 empty load map warns, never passes",
                  c.rows[0][0] == "WARN"))

    width = max(len(n) for n, _ in cases)
    bad = 0
    for name, ok in cases:
        print(f"  {'pass' if ok else 'FAIL'}  {name.ljust(width)}")
        bad += 0 if ok else 1
    print(f"\n{len(cases)} fixtures, {bad} failing — a check that cannot fail "
          f"is not a check")
    return 1 if bad else 0


def _selftest_dead_route(active):
    """CG-1g against a temp tree: the same dead route, two lanes.

    `active=True` writes it into a package artifact a reader is routed to;
    `active=False` writes it into `round-2026-08d/reviews/`, where raw
    reviewer output is stored verbatim and never edited. The first must fail,
    the second must be classified — the distinction the launch-gate
    administration (D2/F4) found the battery could not draw.
    """
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)
    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg1g-selftest-")
    global ROOT
    keep = ROOT
    try:
        rel = (f"{CANDIDATES}/TASK-INDEX.md" if active
               else f"{CANDIDATES}/round-2026-08d/reviews/RD-X-RAW.md")
        full = os.path.join(d, rel)
        os.makedirs(os.path.dirname(full))
        with open(full, "w", encoding="utf-8") as fh:
            fh.write("route: `rfcs/RFC-0010-mission-control-autonomy.md`\n")
        ROOT = d
        c = Cap()
        cg1_links([rel], c)
        row = c.row("CG-1g")
        return bool(row) and (row[0] == "FAIL") == bool(active)
    finally:
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_code_span_link(body, existing=()):
    """CG-1a against a temp tree: `body` is the whole text of one markdown file.

    A link written inside an inline code span is an example, not a link, so it
    is neither counted nor resolved; a link outside any span still is.
    `existing` names sibling files created so a relative target resolves.
    """
    class Cap:
        def __init__(self): self.rows = []
        def add(self, severity, name, examined, n, unit, note=None,
                details=None):
            self.rows.append(
                (severity, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows
                         if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg1a-selftest-")
    global ROOT
    keep = ROOT
    try:
        paths = ["doc.md", *existing]
        for rel in paths:
            with open(os.path.join(d, rel), "w", encoding="utf-8") as fh:
                fh.write(body if rel == "doc.md" else "target\n")
        ROOT = d
        c = Cap()
        cg1_links(paths, c)
        return c.row("CG-1a")
    finally:
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_installed_fallback(kind):
    class Cap:
        def __init__(self): self.rows = []
        def add(self, severity, name, examined, n, unit, note=None,
                details=None):
            self.rows.append(
                (severity, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows
                         if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg1i-selftest-")
    global ROOT
    keep = ROOT
    try:
        installed = f"{INSTALLED_RFCS}RFC-0001/module.md"
        candidate = f"{CANDIDATE_RFCS}RFC-0001/module.md"
        history = f"{CANDIDATES}/history/source.md"
        target = ("../../../history/source.md" if kind == "wrong-depth"
                  else "../../history/source.md")
        paths = [installed, history]
        if kind != "missing-twin":
            paths.append(candidate)
        for rel in paths:
            full = os.path.join(d, rel)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "w", encoding="utf-8") as fh:
                fh.write((f"source: `{target}`\n"
                          if rel in (installed, candidate) else "source\n"))
        ROOT = d
        c = Cap()
        cg1_links(paths, c)
        return c.row("CG-1i")
    finally:
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_cg7d_quotation(kind):
    class Cap:
        def __init__(self): self.rows = []
        def add(self, severity, name, examined, n, unit, note=None,
                details=None):
            self.rows.append((severity, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows
                         if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7d-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    try:
        specs = (
            ("ACCEPT A", "a.md",
             re.compile(r"ACCEPT A:\s*`?([0-9a-f]{64})")),
            ("ADOPT DOCTRINE AMENDMENT: D3", "d3.md",
             re.compile(r"ADOPT DOCTRINE AMENDMENT:\s*D3:\s*`?([0-9a-f]{64})")),
        )
        if kind == "old-performed":
            specs = specs[:1]
        for rel, body in (("a.md", "subject A\n"), ("d3.md", "subject D3\n")):
            full = os.path.join(d, rel)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "w", encoding="utf-8") as fh:
                fh.write(body)
        a_digest = sha256_file(os.path.join(d, "a.md"))
        old_performed = "e" * 64
        if kind == "zero-subject":
            body = f"ACCEPT A: {a_digest}\n"
        elif kind == "old-performed":
            body = f"ACCEPT A: {old_performed}\n"
        else:
            body = "ADOPT DOCTRINE AMENDMENT: D3: " + old_performed + "\n"
        with open(os.path.join(d, "f.md"), "w", encoding="utf-8") as fh:
            fh.write(body)
        ROOT = d
        _ActSubjects._cache[d] = specs
        c = Cap()
        performed = (_performed_act_digests(
            specs, record=(f"ACCEPT A: {old_performed}\n"
                           f"ACCEPT A: {a_digest}\n"))
                     if kind == "old-performed" else {})
        cg7d_quoted_elsewhere(
            ["f.md"], c, performed_digests=performed)
        return c.row("CG-7d")
    finally:
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_fake_performed_table():
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    label = "ACCEPT FOUNDATIONAL WAVE A"
    fake = "e" * 64
    specs = ((
        label,
        "wave-manifests/WAVE-A-MANIFEST.txt",
        re.compile(re.escape(label) + r":\s*`?([0-9a-f]{64})"),
    ),)
    forged_record = (
        "| 99 | `forged-history` | `WAVE-A-MANIFEST.txt` | "
        f"`{fake}` |\n"
    )
    performed = _performed_act_digests(specs, record=forged_record)
    c = Cap()
    cg7d_quoted_elsewhere(
        [], c, act_subjects=specs, subject_digests={label: "a" * 64},
        corpus=[("f.md", f"{label}: {fake}\n")],
        performed_digests=performed,
    )
    return c.row("CG-7d")


def _selftest_cg7e_wrong_historical(review_copy=None, valid=False):
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7e-history-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    current_files = dict(ACT_DIGEST_COPY_FILES)
    history_files = dict(ACT_HISTORICAL_DIGEST_COPY_FILES)
    try:
        subject = CC_SPEC_SUBJECT if review_copy else "policy.md"
        full = os.path.join(d, subject)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write("current policy\n")
        current = sha256_file(full)
        old = POLARIS_UNDERSTANDING_REVIEW_POLICY_DIGEST if review_copy else "9" * 64
        record = os.path.join(d, PERFORMED_ACT_RECORD)
        os.makedirs(os.path.dirname(record), exist_ok=True)
        with open(record, "w", encoding="utf-8") as fh:
            fh.write(f"{CC_SPEC_LABEL}@{old}\n{CC_SPEC_LABEL}@{current}\n")
        copy_path = review_copy or "historical.md"
        os.makedirs(os.path.dirname(os.path.join(d, copy_path)), exist_ok=True)
        with open(os.path.join(d, copy_path), "w", encoding="utf-8") as fh:
            if review_copy:
                quoted = old if valid else "0" * 64
                fh.write(f"- `{CC_SPEC_SUBJECT}`: `{quoted}`\n<!-- decoy: {old} -->\n")
            else:
                fh.write(
                    f"{CC_SPEC_LABEL}@{current}\n"
                    f"<!-- decoy old digest: {old} -->\n"
                )

        specs = ((
            CC_SPEC_LABEL, subject,
            re.compile(re.escape(CC_SPEC_LABEL)
                       + r"\s*@\s*`?([0-9a-f]{64})"),
        ),)
        ROOT = d
        _ActSubjects._cache[d] = specs
        ACT_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES["historical.md"] = {
            CC_SPEC_LABEL: ((old, re.compile(
                r"^" + re.escape(CC_SPEC_LABEL) + r"@" + old + r"$", re.M
            )),),
        }
        if review_copy:
            ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
            ACT_HISTORICAL_DIGEST_COPY_FILES[review_copy] = history_files[review_copy]
        c = Cap()
        cg7e_act_digest_copies([copy_path], c)
        return c.row("CG-7e")
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.update(history_files)
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_contract_restyle_packet_registration():
    """`(absent, present)` registries from a temp root without, then with,
    the restyle packet: exercises the activation's `registry`/`root`
    parameters without touching the live registry or the real tree."""
    import tempfile
    with tempfile.TemporaryDirectory(prefix="cg7-restyle-packet-") as d:
        absent = {}
        _activate_contract_restyle_packet_copy_registry(absent, d)
        packet = os.path.join(d, CONTRACT_RESTYLE_PACKET)
        os.makedirs(os.path.dirname(packet))
        with open(packet, "w", encoding="utf-8") as fh:
            fh.write(f"{CONTRACT_RESTYLE_LABEL}: {'a' * 64}\n")
        present = {"selftest/OTHER.md": ("OTHER LABEL",)}
        _activate_contract_restyle_packet_copy_registry(present, d)
    return absent, present


def _selftest_polaris_edit_repair_candidate_registration(present):
    import tempfile
    global ROOT
    keep_root = ROOT
    keep_registry = dict(_PHRASE_REGISTRY_CACHE)
    try:
        with tempfile.TemporaryDirectory(prefix="cg7-edit-repair-candidate-") as d:
            ROOT = d
            _PHRASE_REGISTRY_CACHE[d] = ({"current_phrases": []}, [])
            package = os.path.join(d, POLARIS_EDIT_REPAIR_DIR)
            os.makedirs(package)
            packet = os.path.join(package, "OWNER-DECISION-PACKET.md")
            with open(packet, "w", encoding="utf-8") as fh:
                fh.write(f"{POLARIS_EDIT_REPAIR_LABEL}: {'a' * 64}\n")
            if present:
                with open(os.path.join(d, POLARIS_EDIT_REPAIR_SUBJECT),
                          "w", encoding="utf-8") as fh:
                    fh.write("synthetic candidate manifest\n")
            subjects = [row for row in _act_subjects()
                        if row[0] == POLARIS_EDIT_REPAIR_LABEL]
            copies = {}
            _activate_polaris_edit_repair_candidate_copy_registry(copies)
            if subjects and (subjects[0][1] != POLARIS_EDIT_REPAIR_SUBJECT
                             or subjects[0][2].search(
                                 f"{POLARIS_EDIT_REPAIR_LABEL}: {'a' * 64}") is None):
                return -1, copies
            return len(subjects), copies
    finally:
        ROOT = keep_root
        _PHRASE_REGISTRY_CACHE.clear()
        _PHRASE_REGISTRY_CACHE.update(keep_registry)


def _selftest_pwb_candidate_act_absent(label, candidate_dir, activate):
    """Before its act exists, a candidate's phrase and packet copy are
    registered and its activation adds nothing (the absent half of the
    present/absent fixture; the present half is the "valid" row)."""
    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7e-pwb-absent-selftest-")
    global ROOT
    keep = ROOT
    current_files = dict(ACT_DIGEST_COPY_FILES)
    try:
        registered = (
            ACT_DIGEST_COPY_FILES.get(
                f"{candidate_dir}/OWNER-DECISION-PACKET.md") == (label,)
            and any(existing == label for existing, _rel, _pat in _act_subjects()))
        ROOT = d
        ACT_DIGEST_COPY_FILES.clear()
        activate()
        return registered, dict(ACT_DIGEST_COPY_FILES)
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_pwb_act_copy_registry(kind, link=None):
    label, subject, act_rel, activate = link or (
        PWB_STATE1_LABEL, PWB_STATE1_SUBJECT, PWB_STATE1_ACT,
        _activate_pwb_state1_act_copy_registry)

    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7e-pwb-act-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    current_files = dict(ACT_DIGEST_COPY_FILES)
    # The real tree's pinned history (bd `syzygy-yu4a`) names the aggregate
    # record; this fixture root performs nothing those pins name.
    history_files = dict(ACT_HISTORICAL_DIGEST_COPY_FILES)
    retired_files = dict(ACT_RETIRED_OFFER_COPY_FILES)
    try:
        manifest = os.path.join(d, subject)
        os.makedirs(os.path.dirname(manifest), exist_ok=True)
        with open(manifest, "w", encoding="utf-8") as fh:
            fh.write("successor manifest\n")
        argument = sha256_file(manifest)
        phrase = f"{label}: {argument}\n"

        aggregate = os.path.join(d, PERFORMED_ACT_RECORD)
        dedicated = os.path.join(d, act_rel)
        os.makedirs(os.path.dirname(aggregate), exist_ok=True)
        with open(aggregate, "w", encoding="utf-8") as fh:
            fh.write("unrelated performed act\n" if kind == "missing-aggregate" else phrase)
        with open(dedicated, "w", encoding="utf-8") as fh:
            fh.write(phrase)

        ROOT = d
        _ActSubjects._cache[d] = ((
            label,
            subject,
            re.compile(re.escape(label)
                       + r"\s*:\s*`?([0-9a-f]{64})"),
        ),)
        ACT_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_RETIRED_OFFER_COPY_FILES.clear()
        activate()
        c = Cap()
        cg7e_act_digest_copies(list(ACT_DIGEST_COPY_FILES), c)
        return c.row("CG-7e")
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.update(history_files)
        ACT_RETIRED_OFFER_COPY_FILES.clear()
        ACT_RETIRED_OFFER_COPY_FILES.update(retired_files)
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_cg7e_bare_manifest_copy(kind):
    """bd-eau: a bare `<qualifier> SHA-256:` copy, mutated, must fail on its own.

    Reproduces the shape R-N8-CONTAINER-SHAPE-PROFILE note N3,
    R-DOV29-DISMISSAL-EXPIRY-DELTA-2 note N11 and R-CG7E-BARE-DIGEST finding
    3 found live: a file carries a correct phrase-linked copy (`<LABEL>:
    <digest>`, what predicate 1 already checks) *and* a bare heading copy
    with no phrase on its line. Before the fix, mutating only the bare copy
    left predicate 1 satisfied and CG-7d blind, so the corrupted copy passed.

    ``kind`` names the bare line written ahead of the phrase line:
      - "stale" / "correct" — literal `Manifest SHA-256:`, digest wrapped to
        the next line in backticks; mutated / real argument.
      - "qualified-stale" — `Behavior manifest SHA-256:` over a mutated
        argument. Must FAIL (the first fix's literal-only pattern missed it).
      - "offer-stale" — `Exact offer SHA-256:` on one line, mutated.
      - "second-label-stale" — `Policy SHA-256:` in a file declaring two
        labels; carries the *other* label's current argument mutated.
      - "bold-correct" / "bold-stale" — `**Registry SHA-256:**` then a
        bold, backticked digest after a blank line.
      - "paren-correct" — `Exact digest (SHA-256):` over the real argument.
      - "second-label-correct" — `Policy SHA-256:` over the second label's
        real argument: another declared label's digest is allowed.
      - "historical-correct" — an older digest registered as this file's
        performed-history binding for the label: allowed.
      - "exempt-correct" / "exempt-drift" — `Effect manifest SHA-256:`
        over a container file's digest, registered as a checked exemption;
        the drift case mutates the container after the heading was written.
      - "prose" — `the SHA-256 of that file is <digest>` in running prose:
        not a heading, never matched. The digest is unrelated to any
        argument: a one-character corruption in prose is the near-miss
        pass's case (`_selftest_cg7e_unlabeled_near_miss`), not this one.
    """
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7e-bare-manifest-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    current_files = dict(ACT_DIGEST_COPY_FILES)
    history_files = dict(ACT_HISTORICAL_DIGEST_COPY_FILES)
    exemptions = dict(BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS)
    try:
        def subject(name, text):
            path = os.path.join(d, name)
            with open(path, "w", encoding="utf-8") as fh:
                fh.write(text)
            return sha256_file(path)

        def mutate(digest):
            return digest[:5] + ("e" if digest[5] != "e" else "f") + digest[6:]

        label = "SIGN OFF SYNTHETIC BARE-COPY TEST"
        label2 = "APPROVE SYNTHETIC BARE-COPY POLICY"
        argument = subject("synthetic-manifest.txt", "synthetic bare-copy subject\n")
        argument2 = subject("synthetic-policy.txt", "synthetic policy subject\n")
        container = subject("synthetic-container.txt", "synthetic container\n")
        older = "a" * 64
        bare_line = {
            "stale": f"Manifest SHA-256:\n`{mutate(argument)}`\n",
            "correct": f"Manifest SHA-256:\n`{argument}`\n",
            "qualified-stale":
                f"Behavior manifest SHA-256:\n`{mutate(argument)}`\n",
            "offer-stale": f"Exact offer SHA-256: `{mutate(argument)}`\n",
            "second-label-stale": f"Policy SHA-256: `{mutate(argument2)}`\n",
            "second-label-correct": f"Policy SHA-256: `{argument2}`\n",
            "bold-correct": f"**Registry SHA-256:**\n\n**`{argument}`**\n",
            "bold-stale":
                f"**Registry SHA-256:**\n\n**`{mutate(argument)}`**\n",
            "paren-correct": f"Exact digest (SHA-256): `{argument}`\n",
            "historical-correct": f"Manifest SHA-256: `{older}`\n",
            "exempt-correct": f"Effect manifest SHA-256: `{container}`\n",
            "exempt-drift": f"Effect manifest SHA-256: `{container}`\n",
            "prose": f"the SHA-256 of that file is `{'b' * 64}`.\n",
            "lower-item-stale":
                f"- Transaction-manifest sha256:\n  `{mutate(argument)}`.\n",
            "backtick-label-stale":
                f"`synthetic-manifest.txt` sha256:\n`{mutate(argument)}`.\n",
            "no-colon-stale": f"SHA-256 `{mutate(argument)}`\n",
            "no-colon-correct": f"SHA-256 `{argument}`\n",
        }[kind]
        if kind == "exempt-drift":
            subject("synthetic-container.txt", "synthetic container, edited\n")

        packet = os.path.join(d, "OWNER-DECISION-PACKET.md")
        phrases = f"{label}: {argument}\n{label2}: {argument2}\n"
        with open(packet, "w", encoding="utf-8") as fh:
            fh.write(f"# Synthetic packet\n\n{bare_line}\n{phrases}")

        ROOT = d
        _ActSubjects._cache[d] = (
            (label, "synthetic-manifest.txt",
             re.compile(re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")),
            (label2, "synthetic-policy.txt",
             re.compile(re.escape(label2) + r"\s*:\s*`?([0-9a-f]{64})")),
        )
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES["OWNER-DECISION-PACKET.md"] = (label, label2)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        if kind == "historical-correct":
            ACT_HISTORICAL_DIGEST_COPY_FILES["OWNER-DECISION-PACKET.md"] = {
                label: ((older, re.compile(re.escape(older))),),
            }
        BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS.clear()
        if kind.startswith("exempt-"):
            BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS[
                ("OWNER-DECISION-PACKET.md", "effect manifest")] = (
                    "synthetic-container.txt")
        c = Cap()
        cg7e_act_digest_copies(["OWNER-DECISION-PACKET.md"], c)
        return c.row("CG-7e")
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.update(history_files)
        BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS.clear()
        BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS.update(exemptions)
        ROOT = keep
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        shutil.rmtree(d, ignore_errors=True)


def _selftest_cg7e_unlabeled_near_miss(kind):
    """bd `syzygy-wh1`: an unlabeled corrupted copy fails beside a correct one.

    R-CG7E-BARE-DIGEST-CONFIRMATION-2 finding 4 found act-argument copies
    with no sha256 label — an `Act identity:` URN, a table cell, a checksum
    row, an owner phrase — masked by a correct copy elsewhere in the file.
    Each fixture file carries the correct phrase line, so predicate 1 holds
    and only the near-miss pass can speak. Returns the CG-7e row, or for
    "concurrent" a tuple of the sequential and eight concurrent rows.

    ``kind`` names the extra line(s):
      - "exact" — URN with the current argument and a table cell with the
        historical one: both pass.
      - "urn" / "table" / "checksum" / "phrase" — that shape, one
        character off the current argument: FAIL, one finding.
      - "cross-file" — this file carries a token one character off its own
        argument that a *second* file registers exactly as its historical
        argument: still FAIL here, in this file only.
      - "distance-two" — an unrelated token two characters off: passes.
      - "two-character" — the argument itself corrupted in two places, the
        disclosed residual: passes (documents the limit, never a claim).
      - "concurrent" — the "urn" fixture evaluated once, then by eight
        threads at once.
    """
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    from concurrent.futures import ThreadPoolExecutor
    d = tempfile.mkdtemp(prefix="cg7e-near-miss-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    current_files = dict(ACT_DIGEST_COPY_FILES)
    history_files = dict(ACT_HISTORICAL_DIGEST_COPY_FILES)
    try:
        subject_path = os.path.join(d, "synthetic-subject.txt")
        with open(subject_path, "w", encoding="utf-8") as fh:
            fh.write("synthetic near-miss subject\n")
        argument = sha256_file(subject_path)

        def flip(digest, *positions):
            chars = list(digest)
            for i in positions:
                chars[i] = "e" if chars[i] != "e" else "f"
            return "".join(chars)

        label = "SIGN OFF SYNTHETIC NEAR-MISS TEST"
        older = "a" * 64
        one_off = flip(argument, 40)
        extra = {
            "exact": (f"Act identity: act:syzygy:synthetic:{argument}\n\n"
                      f"| 1 | `{older}` | historical |\n"),
            "urn": f"Act identity: act:syzygy:synthetic:{one_off}\n",
            "table": f"| 1 | `{one_off}` | current |\n",
            "checksum": f"{one_off}  synthetic-subject.txt\n",
            "phrase": f"CONFIRM SYNTHETIC: TEST@{one_off}\n",
            "cross-file": f"| 1 | `{one_off}` | current |\n",
            "distance-two": f"| 1 | `{flip(argument, 3, 40)}` | other |\n",
            "two-character": f"Act identity: act:syzygy:synthetic:{flip(argument, 3, 40)}\n",
            "concurrent": f"Act identity: act:syzygy:synthetic:{one_off}\n",
        }[kind]
        packet = "OWNER-DECISION-PACKET.md"
        with open(os.path.join(d, packet), "w", encoding="utf-8") as fh:
            fh.write(f"# Synthetic packet\n\n{extra}\n{label}: {argument}\n")
        paths = [packet]

        ROOT = d
        _ActSubjects._cache[d] = (
            (label, "synthetic-subject.txt",
             re.compile(re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")),
        )
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES[packet] = (label,)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        # Historical registrations must name performed digests, so the
        # fixture root carries its own owner-act record performing both.
        record = os.path.join(d, PERFORMED_ACT_RECORD)
        os.makedirs(os.path.dirname(record))
        with open(record, "w", encoding="utf-8") as fh:
            fh.write(f"{label}: {older}\n"
                     + (f"{label}: {one_off}\n" if kind == "cross-file" else ""))
        if kind == "exact":
            ACT_HISTORICAL_DIGEST_COPY_FILES[packet] = {
                label: ((older, re.compile(re.escape(older))),),
            }
        if kind == "cross-file":
            other = "OTHER-RECORD.md"
            with open(os.path.join(d, other), "w", encoding="utf-8") as fh:
                fh.write(f"# Other record\n\n{label}: {one_off}\n")
            ACT_HISTORICAL_DIGEST_COPY_FILES[other] = {
                label: ((one_off, re.compile(re.escape(one_off))),),
            }
            paths.append(other)

        def evaluate():
            c = Cap()
            cg7e_act_digest_copies(paths, c)
            return c.row("CG-7e")

        if kind == "concurrent":
            first = evaluate()
            with ThreadPoolExecutor(max_workers=8) as pool:
                rest = list(pool.map(lambda _i: evaluate(), range(8)))
            return first, rest
        return evaluate()
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.update(history_files)
        ROOT = keep
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        shutil.rmtree(d, ignore_errors=True)

def _selftest_cg7e_pinned_copy(kind):
    """bd `syzygy-yu4a`: a pinned superseded or retired copy is allowed in its
    own file only.

    The fixture root performs `older` then the current argument and never
    performs `retired`. `OWN-RECORD.md` carries the current phrase, `older`
    on its pinned phrase line and `retired` on its pinned checksum row, both
    registered through `_activate_pinned_argument_copies`. Returns the CG-7e
    row.

    ``kind``:
      - "own" — the file as registered: passes.
      - "corrupt-superseded" / "corrupt-retired" — that pinned copy one
        character off: fails at its line.
      - "foreign-superseded" / "foreign-retired" — `OWN-RECORD.md` intact,
        and a second file declaring the same act carries that digest as a
        bare `Manifest SHA-256:` copy: fails in the second file only.
      - "retired-performed" — the retired row names `older`, a performed
        digest: fails, as a misfiled registration.
    """
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7e-pinned-copy-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    current_files = dict(ACT_DIGEST_COPY_FILES)
    history_files = dict(ACT_HISTORICAL_DIGEST_COPY_FILES)
    retired_files = dict(ACT_RETIRED_OFFER_COPY_FILES)
    try:
        subject = "synthetic-subject.txt"
        with open(os.path.join(d, subject), "w", encoding="utf-8") as fh:
            fh.write("synthetic pinned-copy subject\n")
        argument = sha256_file(os.path.join(d, subject))
        label = "SIGN OFF SYNTHETIC PINNED TEST"
        older, retired = "a" * 64, "b" * 64

        def flip(digest):
            return digest[:40] + "e" + digest[41:]

        record = os.path.join(d, PERFORMED_ACT_RECORD)
        os.makedirs(os.path.dirname(record))
        with open(record, "w", encoding="utf-8") as fh:
            fh.write(f"{label}: {older}\n{label}: {argument}\n")
        own, foreign = "OWN-RECORD.md", "FOREIGN-PACKET.md"
        old_copy = flip(older) if kind == "corrupt-superseded" else older
        row_copy = flip(retired) if kind == "corrupt-retired" else retired
        with open(os.path.join(d, own), "w", encoding="utf-8") as fh:
            fh.write(f"# Own\n\n{label}: {argument}\n\n{label}: {old_copy}\n\n"
                     f"{row_copy}  {subject}\n")
        paths = [own]
        if kind.startswith("foreign-"):
            quoted = older if kind == "foreign-superseded" else retired
            with open(os.path.join(d, foreign), "w", encoding="utf-8") as fh:
                fh.write(f"# Foreign\n\nManifest SHA-256: {quoted}\n\n"
                         f"{label}: {argument}\n")
            paths.append(foreign)

        ROOT = d
        _ActSubjects._cache[d] = (
            (label, subject,
             re.compile(re.escape(label) + r"\s*:\s*`?([0-9a-f]{64})")),
        )
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update({own: (label,), foreign: (label,)})
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_RETIRED_OFFER_COPY_FILES.clear()
        pinned_retired = older if kind == "retired-performed" else retired
        _activate_pinned_argument_copies(
            superseded={own: ((label, older, f"{label}: ", "$"),)},
            retired={own: ((label, pinned_retired, "", f"  {subject}$"),)})
        c = Cap()
        cg7e_act_digest_copies(paths, c)
        return c.row("CG-7e")
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.update(history_files)
        ACT_RETIRED_OFFER_COPY_FILES.clear()
        ACT_RETIRED_OFFER_COPY_FILES.update(retired_files)
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_pwb_effect_act_copy_registry(kind):
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7e-pwb-effect-act-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    current_files = dict(ACT_DIGEST_COPY_FILES)
    # The real tree's pinned history (bd `syzygy-yu4a`) names the aggregate
    # record; this fixture root performs nothing those pins name.
    history_files = dict(ACT_HISTORICAL_DIGEST_COPY_FILES)
    retired_files = dict(ACT_RETIRED_OFFER_COPY_FILES)
    try:
        # Only the first act is "performed" in the fixture; the other two
        # dedicated records are absent and must register nothing.
        label, subject, act = PWB_EFFECT_ACTS[0]
        subject_path = os.path.join(d, subject)
        os.makedirs(os.path.dirname(subject_path), exist_ok=True)
        with open(subject_path, "w", encoding="utf-8") as fh:
            fh.write("consent artifact\n")
        argument = sha256_file(subject_path)
        phrase = f"{label}: {argument}\n"
        stale = f"{label}: {'0' * 64}\n"

        aggregate = os.path.join(d, PERFORMED_ACT_RECORD)
        dedicated = os.path.join(d, act)
        os.makedirs(os.path.dirname(aggregate), exist_ok=True)
        with open(aggregate, "w", encoding="utf-8") as fh:
            fh.write("unrelated performed act\n"
                     if kind == "missing-aggregate" else phrase)
        with open(dedicated, "w", encoding="utf-8") as fh:
            fh.write(stale if kind == "stale-dedicated" else phrase)

        ROOT = d
        _ActSubjects._cache[d] = tuple(
            (l, sub, re.compile(re.escape(l) + r"\s*:\s*`?([0-9a-f]{64})"))
            for l, sub, _a in PWB_EFFECT_ACTS)
        ACT_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_RETIRED_OFFER_COPY_FILES.clear()
        _activate_pwb_effect_act_copy_registries()
        registered = tuple(sorted(ACT_DIGEST_COPY_FILES))
        c = Cap()
        cg7e_act_digest_copies(list(ACT_DIGEST_COPY_FILES), c)
        return c.row("CG-7e"), registered
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.update(history_files)
        ACT_RETIRED_OFFER_COPY_FILES.clear()
        ACT_RETIRED_OFFER_COPY_FILES.update(retired_files)
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_pwb_effect_amendment_copy_registry(kind):
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7e-pwb-effect-amendment-selftest-")
    global ROOT
    keep = ROOT
    cache = dict(_ActSubjects._cache)
    current_files = dict(ACT_DIGEST_COPY_FILES)
    history_files = dict(ACT_HISTORICAL_DIGEST_COPY_FILES)
    try:
        label, subject, predecessor, act, old = PWB_EFFECT_AMENDMENT_ACTS[0]

        def write(rel, text):
            full = os.path.join(d, rel)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "w", encoding="utf-8") as fh:
                fh.write(text)

        write(subject, "amended policy artifact\n")
        new = sha256_file(os.path.join(d, subject))
        old_phrase = f"{label}: {old}\n"
        new_phrase = f"{label}: {new}\n"
        write(PERFORMED_ACT_RECORD,
              (new_phrase if kind == "unperformed-history"
               else old_phrase + new_phrase))
        write(predecessor,
              new_phrase if kind == "rewritten-history" else old_phrase)
        if kind != "pre-act":
            write(act, f"{label}: {'0' * 64}\n"
                  if kind == "stale-amendment" else new_phrase)
        write(f"{PWB_EFFECT_ACTS_DIR}/ACT-SEMANTICS.md", old_phrase)
        write(f"{PWB_EFFECT_ACTS_DIR}/OWNER-SIGNOFF-PACKET.md", old_phrase)
        write(f"{PWB_EFFECT_ACTS_DIR}/PWB-EFFECT-ACTS-MANIFEST.txt",
              f"{old}  {subject}\n")
        write(f"{PWB_EFFECT_ACTS_DIR}/CANDIDATE-REPORT.md",
              f"| `approve-policy` | `{subject}` | `{old}` |\n")

        ROOT = d
        _ActSubjects._cache[d] = tuple(
            (l, sub, re.compile(re.escape(l) + r"\s*:\s*`?([0-9a-f]{64})"))
            for l, sub, _a in PWB_EFFECT_ACTS)
        ACT_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES[f"{PWB_EFFECT_ACTS_DIR}/ACT-SEMANTICS.md"] = PWB_EFFECT_ACT_LABELS
        ACT_DIGEST_COPY_FILES[f"{PWB_EFFECT_ACTS_DIR}/PWB-EFFECT-ACTS-MANIFEST.txt"] = PWB_EFFECT_ACT_LABELS
        _activate_pwb_effect_act_copy_registries()
        _activate_pwb_effect_amendment_act_copy_registries()
        registered = (tuple(sorted(ACT_DIGEST_COPY_FILES)),
                      tuple(sorted(ACT_HISTORICAL_DIGEST_COPY_FILES)),
                      dict(ACT_DIGEST_COPY_FILES))
        c = Cap()
        paths = sorted(set(ACT_DIGEST_COPY_FILES) | set(ACT_HISTORICAL_DIGEST_COPY_FILES))
        cg7e_act_digest_copies(paths, c)
        return c.row("CG-7e"), registered
    finally:
        ACT_DIGEST_COPY_FILES.clear()
        ACT_DIGEST_COPY_FILES.update(current_files)
        ACT_HISTORICAL_DIGEST_COPY_FILES.clear()
        ACT_HISTORICAL_DIGEST_COPY_FILES.update(history_files)
        _ActSubjects._cache.clear()
        _ActSubjects._cache.update(cache)
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


#: A synthetic third contract successor link, selftest only.
THIRD_LINK = ("SYNTHETIC THIRD CONTRACT LINK", "selftest/THIRD-MANIFEST.txt",
              "selftest/THIRD-ACT.md", lambda: None,
              (POLARIS_NO_SIGNAL_PATHS[0],))


#: Synthetic-tree kinds for the version-tagged packages, from the table:
#: `kind -> (packages performed, index of the package whose rows the tree
#: holds, drift the first subject)`. The tree holding an earlier package's
#: rows while a later one is performed must fail: only the latest binds.
_VERSIONED_FIXTURE_KINDS = {
    **{f"versioned-{row[0]}-valid": (i + 1, i, False)
       for i, row in enumerate(VERSIONED_PWB_PACKAGES)},
    **{f"versioned-{row[0]}-drift": (i + 1, i, True)
       for i, row in enumerate(VERSIONED_PWB_PACKAGES)},
    "versioned-latest-stale": (len(VERSIONED_PWB_PACKAGES), 0, False),
}


def _selftest_cg7h(kind):
    global PWB_SUCCESSOR_CHAIN
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)), None)

    def digest(seed):
        return hashlib.sha256(seed.encode()).hexdigest()

    transaction = digest("transaction")
    policy = digest("policy")
    mismatched = digest("mismatched")
    outer = f"{GENERAL_BOOTSTRAP_LABEL}: {transaction}\n"
    policy_row = (
        "| 5 | `confirm-craft-amendment` | in-force policy "
        f"`{os.path.basename(CC_SPEC_SUBJECT)}` (CC-SPEC-1..11) | "
        "`{digest}` | scope | end |\n")
    performed = outer + policy_row.format(digest=policy)
    if kind == "missing-act":
        dedicated = ""
    elif kind == "mismatched-act":
        dedicated = outer + policy_row.format(digest=mismatched)
    else:
        dedicated = performed

    contract_rows, pwb_rows, current = [], [], {}
    for i, path in enumerate(GENERAL_BOOTSTRAP_CONTRACT_PATHS):
        stated = digest(f"contract-{i}")
        contract_rows.append(f"{stated}  {path}")
        current[f"{CONTRACT_ROOT}/{path}"] = stated
        current[f"{CANDIDATES}/{path}"] = stated
    historical_paths = list(GENERAL_BOOTSTRAP_PWB_PATHS)
    if kind == "historical-pwb-path":
        historical_paths[0] = "openspec/changes/pwb/not-the-signed-path.md"
    for i, path in enumerate(historical_paths):
        stated = digest(f"pwb-{i}")
        pwb_rows.append(f"{stated}  {path}")
        current[path] = stated
    contract_manifest = "\n".join(contract_rows) + "\n"
    pwb_manifest = "\n".join(pwb_rows) + "\n"
    current[GENERAL_BOOTSTRAP_CONTRACT_MANIFEST] = digest(contract_manifest)
    current[GENERAL_BOOTSTRAP_PWB_MANIFEST] = digest(pwb_manifest)
    current[CC_SPEC_SUBJECT] = policy

    top_paths = (
        f"{GENERAL_BOOTSTRAP_DIR}/ACT-SEMANTICS.md",
        f"{GENERAL_BOOTSTRAP_DIR}/IMPACT-LEDGER.md",
        GENERAL_BOOTSTRAP_CONTRACT_MANIFEST,
        GENERAL_BOOTSTRAP_PWB_MANIFEST,
        "openspec/changes/cap1/CONTRACT-COVERAGE.md",
        "openspec/changes/poc/CONTRACT-COVERAGE.md",
        CC_SPEC_SUBJECT,
    )
    top_rows = []
    for path in top_paths:
        stated = current.get(path, digest(path))
        current[path] = stated
        top_rows.append(f"{stated}  {path}")
    manifest = "\n".join(top_rows) + "\n"

    truth_kinds = {
        "valid-truth-successor", "truth-one-record", "truth-conflict",
        "truth-current-drift", "truth-without-state1", "truth-10",
        "truth-candidate-no-act",
    } | set(_VERSIONED_FIXTURE_KINDS)
    successor_kinds = {
        "successor-one-record", "successor-conflict", "valid-successor",
        "successor-current-drift", "successor-10", "successor-12",
        "successor-duplicate", "successor-reordered", "successor-escaping",
    } | (truth_kinds - {"truth-without-state1"})
    successor_rows = [
        (digest(f"successor-{i}"), path)
        for i, path in enumerate(PWB_STATE1_SUBJECTS)
    ]
    if kind in successor_kinds or kind == "candidate-successor-no-act":
        for stated, path in successor_rows:
            current[path] = stated

    successor_manifest_rows = list(successor_rows)
    if kind == "successor-10":
        successor_manifest_rows.pop()
    elif kind == "successor-12":
        successor_manifest_rows.append((digest("extra"), "extra.md"))
    elif kind == "successor-duplicate":
        successor_manifest_rows[-1] = successor_manifest_rows[0]
    elif kind == "successor-reordered":
        successor_manifest_rows[0], successor_manifest_rows[1] = (
            successor_manifest_rows[1], successor_manifest_rows[0])
    elif kind == "successor-escaping":
        successor_manifest_rows[0] = (successor_manifest_rows[0][0], "../escape.md")
    successor_manifest = "".join(
        f"{stated}  {path}\n" for stated, path in successor_manifest_rows)
    successor_digest = digest(successor_manifest)
    current[PWB_STATE1_SUBJECT] = successor_digest

    if kind in successor_kinds:
        performed += f"{PWB_STATE1_LABEL}: {successor_digest}\n"
        successor_dedicated = f"{PWB_STATE1_LABEL}: {successor_digest}\n"
        if kind == "successor-one-record":
            successor_dedicated = ""
        elif kind == "successor-conflict":
            successor_dedicated = f"{PWB_STATE1_LABEL}: {mismatched}\n"
    else:
        successor_dedicated = ""

    # The truth-and-readiness successor: the state-(1) rows stay in the
    # fixture as act-time history while current bytes move to the new link.
    truth_rows = [
        (digest(f"truth-{i}"), path)
        for i, path in enumerate(PWB_TRUTH_AMENDMENT_SUBJECTS)
    ]
    truth_manifest_rows = list(truth_rows)
    if kind == "truth-10":
        truth_manifest_rows.pop()
    truth_manifest = "".join(
        f"{stated}  {path}\n" for stated, path in truth_manifest_rows)
    truth_digest = digest(truth_manifest)
    truth_dedicated = ""
    if kind in truth_kinds:
        for stated, path in truth_rows:
            current[path] = stated
        current[PWB_TRUTH_AMENDMENT_SUBJECT] = truth_digest
        if kind != "truth-candidate-no-act":
            performed += f"{PWB_TRUTH_AMENDMENT_LABEL}: {truth_digest}\n"
            truth_dedicated = f"{PWB_TRUTH_AMENDMENT_LABEL}: {truth_digest}\n"
        if kind == "truth-one-record":
            truth_dedicated = ""
        elif kind == "truth-conflict":
            truth_dedicated = f"{PWB_TRUTH_AMENDMENT_LABEL}: {mismatched}\n"
        elif kind == "truth-current-drift":
            current[PWB_TRUTH_AMENDMENT_SUBJECTS[0]] = digest("post-truth-drift")
        elif kind == "truth-candidate-no-act":
            # signed state-(1) rows no longer match current bytes and no
            # successor act exists: candidate bytes alone bind nothing
            pass

    # Version-tagged sign-offs (Scope A): the latest performed package's
    # current manifest binds the tree, with no phrase digest. The PWB chain is
    # narrowed to the links this fixture performs so each versioned link has
    # its predecessors; every other table package gets explicit empties.
    versioned_inputs = {
        row[2]: ("", "", None, [])
        for row in VERSIONED_PWB_PACKAGES}
    versioned_chain = None
    if kind in _VERSIONED_FIXTURE_KINDS:
        performed_count, tree_index, drifted = _VERSIONED_FIXTURE_KINDS[kind]
        performed_rows = VERSIONED_PWB_PACKAGES[:performed_count]
        manifest_texts = {}
        for index, (key, stem, label, subject, _act, subjects, _packet) in enumerate(
                performed_rows):
            rows = [(digest(f"{key}-{i}"), path) for i, path in enumerate(subjects)]
            text = "".join(f"{stated}  {path}\n" for stated, path in rows)
            manifest_texts[index] = rows
            current[subject] = digest(text)
            versioned_inputs[label] = (
                "", text, digest(text), [f"{stem}-SIGNOFF-v1.0.md"])
        for stated, path in manifest_texts[tree_index]:
            current[path] = stated
        if drifted:
            current[performed_rows[tree_index][5][0]] = digest("post-versioned-drift")
        versioned_chain = tuple(
            link for link in PWB_SUCCESSOR_CHAIN
            if link[0] in (PWB_STATE1_LABEL, PWB_TRUTH_AMENDMENT_LABEL)
            or link[0] in {row[2] for row in performed_rows})
    if kind == "top-level-drift":
        current[top_paths[0]] = digest("drifted-top-level")
    elif kind == "nested-contract-drift":
        current[f"{CONTRACT_ROOT}/{GENERAL_BOOTSTRAP_CONTRACT_PATHS[0]}"] = digest(
            "drifted-contract")
    elif kind == "nested-pwb-drift":
        current[GENERAL_BOOTSTRAP_PWB_PATHS[0]] = digest("drifted-pwb")
    elif kind == "candidate-successor-no-act":
        current[GENERAL_BOOTSTRAP_PWB_PATHS[0]] = digest("unsigned-candidate")
    elif kind == "successor-current-drift":
        current[PWB_STATE1_SUBJECTS[0]] = digest("post-successor-drift")

    # Contract successor chain links. `link()` builds one link's inputs and
    # (unless `records` says otherwise) appends its aggregate phrase.
    contract_inputs = {}

    def contract_body_of(rows):
        return "".join(f"{sha}  {path}\n" for sha, path in rows)

    # Each performed link gets the next act instant unless told otherwise,
    # so links recorded in call order are also timed in call order.
    link_clock = [0]

    def link(label, rows, records="both", set_current=True, recorded=None,
             instant=None, aggregate_instant=None, insert_before=None):
        nonlocal performed
        body = contract_body_of(rows)
        link_digest = digest(body)
        phrase = f"{label}: {recorded or link_digest}\n"
        link_clock[0] += 1
        instant = instant or f"2026-09-{10 + link_clock[0]:02d}T00:00:00Z"
        instant_line = f"Act instant: {instant}\n" if instant != "none" else ""
        aggregate_line = (instant_line if aggregate_instant is None
                          else "" if aggregate_instant == "none"
                          else f"Act instant: {aggregate_instant}\n")
        if set_current:
            for sha, path in rows:
                current[f"{CONTRACT_ROOT}/{path}"] = sha
                current[f"{CANDIDATES}/{path}"] = sha
        if records in ("both", "aggregate"):
            section = aggregate_line + phrase
            if insert_before is None:
                performed += section
            else:
                # A section spliced in above an existing one: the aggregate is
                # no longer append-only, so aggregate position misleads.
                head, sep, tail = performed.partition(insert_before)
                assert sep, insert_before
                performed = head + section + sep + tail
        dedicated_body = (instant_line + phrase
                          if records in ("both", "dedicated") else "")
        contract_inputs[label] = (dedicated_body, body, link_digest)
        return phrase, body, link_digest

    if kind.startswith("contract-"):
        new_rows = [(digest(f"new-contract-{i}"), path)
                    for i, path in enumerate(POLARIS_NO_SIGNAL_PATHS)]
        for sha, path in new_rows:
            current[f"{CONTRACT_ROOT}/{path}"] = sha
            current[f"{CANDIDATES}/{path}"] = sha
        if kind == "contract-duplicate-path":
            new_rows[1] = new_rows[0]
        elif kind == "contract-reordered":
            new_rows.reverse()
        elif kind == "contract-escape":
            new_rows[0] = (new_rows[0][0], "../escape.md")
        elif kind == "contract-alias":
            new_rows[0] = (new_rows[0][0], "./" + new_rows[0][1])
        elif kind == "contract-extra":
            new_rows.append((digest("extra"), "zz-extra.md"))
        elif kind in ("contract-extra-bootstrap", "contract-extra-rendering"):
            # Another bootstrap module, inserted in codepoint order with its
            # current bytes matching: only the closed population is violated.
            extra_path = ("rfcs/RFC-0008/README.md"
                          if kind == "contract-extra-bootstrap"
                          else CONTRACT_RESTYLE_EXCLUDED)
            extra_sha = digest(f"extra-{extra_path}")
            current[f"{CONTRACT_ROOT}/{extra_path}"] = extra_sha
            current[f"{CANDIDATES}/{extra_path}"] = extra_sha
            new_rows = sorted(new_rows + [(extra_sha, extra_path)],
                              key=lambda row: row[1])
        elif kind == "contract-missing-row":
            new_rows = new_rows[:1]
        contract_body = contract_body_of(new_rows)
        if kind == "contract-malformed":
            contract_body += "not a digest row\n"
        contract_digest = digest(contract_body)
        contract_phrase = f"{POLARIS_NO_SIGNAL_LABEL}: {contract_digest}\n"
        contract_instant = "Act instant: 2026-09-10T00:00:00Z\n"
        contract_dedicated = ""
        if kind != "contract-candidate-only":
            performed += contract_instant + contract_phrase
            contract_dedicated = contract_instant + contract_phrase
        if kind == "contract-no-dedicated":
            contract_dedicated = ""
        elif kind == "contract-no-aggregate":
            performed = performed.replace(contract_phrase, "")
        elif kind == "contract-duplicate-aggregate":
            performed += contract_phrase
        elif kind == "contract-duplicate-dedicated":
            contract_dedicated += contract_phrase
        elif kind == "contract-conflict":
            contract_dedicated = f"{POLARIS_NO_SIGNAL_LABEL}: {mismatched}\n"
        elif kind == "contract-invalid-predecessor":
            dedicated = ""
        elif kind == "contract-historical-drift":
            current[GENERAL_BOOTSTRAP_CONTRACT_MANIFEST] = mismatched
        elif kind == "contract-missing-body":
            contract_body = ""
        elif kind == "contract-stale-digest":
            contract_digest = mismatched
        elif kind == "contract-current-drift":
            current[f"{CONTRACT_ROOT}/{POLARIS_NO_SIGNAL_PATHS[0]}"] = mismatched
        elif kind == "contract-mirror-drift":
            current[f"{CANDIDATES}/{POLARIS_NO_SIGNAL_PATHS[0]}"] = mismatched
        elif kind == "contract-missing-mirror":
            del current[f"{CANDIDATES}/{POLARIS_NO_SIGNAL_PATHS[0]}"]
        elif kind == "contract-third-path-drift":
            current[f"{CONTRACT_ROOT}/{GENERAL_BOOTSTRAP_CONTRACT_PATHS[0]}"] = mismatched
        elif kind == "contract-malformed-aggregate-original":
            # Original valid bodies isolate attempt detection from unsigned drift.
            for path in POLARIS_NO_SIGNAL_PATHS:
                i = GENERAL_BOOTSTRAP_CONTRACT_PATHS.index(path)
                current[f"{CONTRACT_ROOT}/{path}"] = digest(f"contract-{i}")
                current[f"{CANDIDATES}/{path}"] = digest(f"contract-{i}")
            performed = performed.replace(contract_phrase, "")
            performed += f"{POLARIS_NO_SIGNAL_LABEL}: malformed\n"
            contract_dedicated = ""
        elif kind == "contract-malformed-extra-dedicated":
            contract_dedicated += f"{POLARIS_NO_SIGNAL_LABEL}: malformed\n"
        elif kind == "contract-malformed-extra-aggregate":
            performed += f"{POLARIS_NO_SIGNAL_LABEL}: malformed\n"
        elif kind == "contract-unmatched-backtick":
            malformed_phrase = f"{POLARIS_NO_SIGNAL_LABEL}: `{contract_digest}\n"
            performed = performed.replace(contract_phrase, malformed_phrase)
            contract_dedicated = malformed_phrase
        elif kind == "contract-duplicate-quoted":
            contract_dedicated += f"`{contract_phrase.rstrip()}`\n"
        elif kind == "contract-duplicate-indented":
            performed += f"  {contract_phrase}"
        elif kind == "contract-trailing-prose":
            malformed_phrase = f"{contract_phrase.rstrip()} extra text\n"
            performed = performed.replace(contract_phrase, malformed_phrase)
            contract_dedicated = malformed_phrase
        contract_inputs[POLARIS_NO_SIGNAL_LABEL] = (
            contract_dedicated, contract_body, contract_digest)

    if kind.startswith("restyle-"):
        # The 29-module readability restyle: every bootstrap path except
        # RFC-0007's rendering module, codepoint-sorted, new digests.
        restyle_rows = [(digest(f"restyle-{path}"), path)
                        for path in CONTRACT_RESTYLE_PATHS]
        no_signal_rows = [(digest(f"no-signal-{path}"), path)
                          for path in POLARIS_NO_SIGNAL_PATHS]
        rendering_row = (digest(f"restyle-{CONTRACT_RESTYLE_EXCLUDED}"),
                         CONTRACT_RESTYLE_EXCLUDED)
        if kind in ("restyle-both-performed", "restyle-both-earlier-bytes",
                    "restyle-after-invalid-no-signal",
                    "restyle-three-link-cascade"):
            link(POLARIS_NO_SIGNAL_LABEL, no_signal_rows,
                 records=("aggregate"
                          if kind in ("restyle-after-invalid-no-signal",
                                      "restyle-three-link-cascade")
                          else "both"))
        if kind == "restyle-outside-path":
            restyle_rows[-1] = (restyle_rows[-1][0],
                                "rfcs/RFC-0099/not-a-contract.md")
        if kind == "restyle-unsorted":
            restyle_rows[0], restyle_rows[1] = restyle_rows[1], restyle_rows[0]
        if kind == "restyle-empty":
            restyle_rows = []
        if kind == "restyle-extra-rendering":
            # All 30 bootstrap modules, codepoint-sorted: the excluded
            # rendering module is an extra row even though it is bootstrap.
            restyle_rows = sorted(restyle_rows + [rendering_row],
                                  key=lambda row: row[1])
        if kind == "restyle-rendering-only":
            restyle_rows = [rendering_row]
        if kind == "restyle-missing-row":
            restyle_rows = restyle_rows[1:]
        records = {"restyle-one-record": "aggregate",
                   "restyle-candidate-no-records": "none",
                   "restyle-candidate-inert": "none"}.get(kind, "both")
        restyle_instant = {
            "restyle-instant-impossible": "2026-02-30T00:00:00Z",
            "restyle-instant-malformed-line": "2026-09-20",
            "restyle-instant-absent": "none",
        }.get(kind, "2026-09-20T00:00:00Z")
        restyle_phrase, _b, _d = link(
            CONTRACT_RESTYLE_LABEL, restyle_rows, records=records,
            set_current=kind != "restyle-candidate-inert",
            recorded=mismatched if kind == "restyle-digest-mismatch" else None,
            instant=restyle_instant,
            aggregate_instant=("none" if kind == "restyle-aggregate-no-instant"
                               else None))
        restyle_section = f"Act instant: {restyle_instant}\n" + restyle_phrase
        # The out-of-order bypass: the restyle is performed, then a no-signal
        # section is spliced into the aggregate *above* it, so aggregate
        # position reads as chain order. The act instants still tell.
        inserted = {
            # recorded later than the restyle, never installed
            "restyle-inserted-later": ("2026-09-25T00:00:00Z", None, False),
            # same instant as the restyle: order is ambiguous
            "restyle-inserted-same-instant": ("2026-09-20T00:00:00Z", None,
                                              False),
            # no instant at all: cannot be ordered
            "restyle-inserted-no-instant": ("none", None, False),
            # dedicated claims earlier, aggregate section says later
            "restyle-inserted-instant-disagrees": (
                "2026-09-15T00:00:00Z", "2026-09-25T00:00:00Z", False),
            # genuinely earlier: legitimate history, restyle supersedes it
            "restyle-inserted-earlier": ("2026-09-15T00:00:00Z", None, True),
        }
        # Review N-a (R-TREE-STYLE-TOOLING-3): a no-signal phrase alone,
        # spliced into an unrelated act's marked section, must not borrow
        # that act's instant. The dedicated record repeats the borrowed
        # instant, which is earlier than the restyle's, so before the
        # section scoping each of these read as superseded history (OK).
        unrelated_instant = "2026-09-13T01:58:26Z"
        unrelated_phrase = f"SYNTHETIC UNRELATED ACT: {digest('unrelated')}\n"
        spliced = {
            # directly under the unrelated instant, above its phrase
            "restyle-splice-under-instant": (
                f"Act instant: {unrelated_instant}\n", unrelated_phrase),
            # after the unrelated phrase, before its END marker
            "restyle-splice-after-phrase": (
                f"Act instant: {unrelated_instant}\n" + unrelated_phrase, ""),
            # a marked section of its own with no instant, under a bare one
            "restyle-splice-marker-only": (
                f"Act instant: {unrelated_instant}\n"
                "<!-- SYNTHETIC-SPLICE:END -->\n"
                "<!-- SYNTHETIC-SPLICE:BEGIN -->\n", ""),
        }
        if kind in spliced:
            head, tail = spliced[kind]
            ns_phrase, _b, _d = link(
                POLARIS_NO_SIGNAL_LABEL, no_signal_rows, records="dedicated",
                set_current=False, instant=unrelated_instant)
            head_sep, sep, rest = performed.partition(restyle_section)
            assert sep, restyle_section
            performed = (head_sep + "<!-- SYNTHETIC-UNRELATED:BEGIN -->\n"
                         + head + ns_phrase + tail
                         + "<!-- SYNTHETIC-UNRELATED:END -->\n"
                         + sep + rest)
            for sha, path in restyle_rows:
                current[f"{CONTRACT_ROOT}/{path}"] = sha
                current[f"{CANDIDATES}/{path}"] = sha
        if kind in inserted:
            ns_instant, ns_aggregate, ns_bytes = inserted[kind]
            link(POLARIS_NO_SIGNAL_LABEL, no_signal_rows, set_current=ns_bytes,
                 instant=ns_instant, aggregate_instant=ns_aggregate,
                 insert_before=restyle_section)
            if ns_bytes:
                # restyle is later and supersedes; current bytes are its own
                for sha, path in restyle_rows:
                    current[f"{CONTRACT_ROOT}/{path}"] = sha
                    current[f"{CANDIDATES}/{path}"] = sha
        if kind in ("restyle-shadow", "restyle-shadow-nsbytes"):
            # The restyle is performed first; the no-signal act is recorded
            # afterwards (with or without installing its bytes). Chain order
            # says no-signal comes first, so the later act must not read as
            # valid, silently shadowed history. Its instant is earlier, so
            # only the aggregate-position predicate can catch this one.
            link(POLARIS_NO_SIGNAL_LABEL, no_signal_rows,
                 set_current=kind == "restyle-shadow-nsbytes",
                 instant="2026-09-15T00:00:00Z")
        if kind == "restyle-three-link-cascade":
            # A synthetic third link after an invalid no-signal link (one
            # record) and a valid restyle link: it must name the invalid
            # no-signal link, not only its immediate predecessor.
            link(THIRD_LINK[0], [(digest("third"), POLARIS_NO_SIGNAL_PATHS[0])],
                 instant="2026-09-27T00:00:00Z")
        target = POLARIS_NO_SIGNAL_PATHS[0]
        if kind == "restyle-current-drift":
            current[f"{CONTRACT_ROOT}/{target}"] = mismatched
            current[f"{CANDIDATES}/{target}"] = mismatched
        elif kind == "restyle-mirror-drift":
            current[f"{CANDIDATES}/{target}"] = mismatched
        elif kind == "restyle-both-earlier-bytes":
            # current bytes hold the no-signal rows: the later link must win
            for sha, path in no_signal_rows:
                current[f"{CONTRACT_ROOT}/{path}"] = sha
                current[f"{CANDIDATES}/{path}"] = sha

    # A version-tagged POC sign-off that re-patched the POC coverage row.
    poc_inputs = {}
    if kind.startswith("poc-successor"):
        poc_path = top_paths[5]
        current[poc_path] = digest("poc-successor")
        (early_pkg, early_ver, *_e), (late_pkg, late_ver, *_l) = POC_VERSIONED_SUCCESSORS[-2:]
        late_row = (digest("poc-other") if kind == "poc-successor-other-digest"
                    else digest("poc-successor"))
        if kind == "poc-successor-overridden":
            poc_inputs[early_pkg] = ("record\n", f"{digest('poc-successor')}  {poc_path}\n")
            performed += f"<!-- versioned-signoff:{early_pkg}:v{early_ver} -->\n"
            late_row = digest("poc-other")
        poc_inputs[late_pkg] = ("" if kind == "poc-successor-no-record" else "record\n",
                                f"{late_row}  "
                                f"{'openspec/changes/poc/design.md' if kind == 'poc-successor-other-path' else poc_path}\n")
        if kind != "poc-successor-unrecorded":
            performed += f"<!-- versioned-signoff:{late_pkg}:v{late_ver} -->\n"

    # CC-IMPACT (act 7) and the specification-policy restyle successor.
    impact = digest("impact")
    # Ahead of every link's section, so no link's section scoping sees it.
    performed = f"{CC_IMPACT_LABEL}@{impact}\n" + performed
    current[CC_IMPACT_SUBJECT] = mismatched if kind == "impact-drift" else impact
    spec_inputs = ("", "", None)
    if kind.startswith("spec-"):
        restyled = {CC_IMPACT_SUBJECT: digest("impact-restyled"),
                    CC_SPEC_SUBJECT: digest("spec-restyled")}
        spec_manifest = "# restyle\n" + "".join(
            f"{restyled[path]}  {path}\n" for _label, path in SPEC_POLICY_RESTYLE_ROWS)
        spec_digest = digest(spec_manifest)
        if kind == "spec-body-mismatch":
            # Records agree with a digest the manifest body does not hash to.
            spec_digest = mismatched
        spec_dedicated = ""
        if kind != "spec-unrecorded" and kind != "spec-unrecorded-applied":
            instant = "Act instant: 2026-09-28T12:00:00Z"
            nested = [f"{label}@{restyled[path]}"
                      for label, path in SPEC_POLICY_RESTYLE_ROWS]
            phrase = f"{SPEC_POLICY_RESTYLE_LABEL}: {spec_digest}"
            aggregate_block = [instant, "", phrase, *nested]
            dedicated_block = list(aggregate_block)
            if kind == "spec-phrase-mismatch":
                aggregate_block[2] = f"{SPEC_POLICY_RESTYLE_LABEL}: {mismatched}"
            elif kind == "spec-nested-missing":
                dedicated_block.remove(nested[1])
            elif kind == "spec-instant-mismatch":
                dedicated_block[0] = "Act instant: 2026-09-28T12:00:01Z"
            elif kind == "spec-bootstrap-rewritten":
                dedicated += policy_row.format(digest=restyled[CC_SPEC_SUBJECT])
            performed += "\n".join(aggregate_block) + "\n"
            spec_dedicated = "\n".join(dedicated_block) + "\n"
        if kind != "spec-unrecorded":
            current[CC_SPEC_SUBJECT] = restyled[CC_SPEC_SUBJECT]
            current[CC_IMPACT_SUBJECT] = restyled[CC_IMPACT_SUBJECT]
        if kind == "spec-drift":
            current[CC_SPEC_SUBJECT] = mismatched
        elif kind == "spec-impact-drift":
            current[CC_IMPACT_SUBJECT] = mismatched
        spec_inputs = (spec_dedicated, spec_manifest, spec_digest)

    c = Cap()
    kept_chain = PWB_SUCCESSOR_CHAIN
    if versioned_chain is not None:
        PWB_SUCCESSOR_CHAIN = versioned_chain
    cg7h_general_bootstrap_act(
        c, act_record=performed, dedicated_record=dedicated,
        manifest_body=manifest, transaction_digest=transaction,
        policy_digest=current[CC_SPEC_SUBJECT],
        contract_manifest_body=contract_manifest,
        pwb_manifest_body=pwb_manifest, current_digests=current,
        successor_act_record=performed,
        successor_dedicated_record=successor_dedicated,
        successor_manifest_body=successor_manifest,
        successor_manifest_digest=successor_digest,
        truth_dedicated_record=truth_dedicated,
        truth_manifest_body=truth_manifest,
        truth_manifest_digest=truth_digest,
        # Later PWB links are unperformed in every synthetic tree; without
        # explicit empties they would read this repository's real records.
        machine_view_dedicated_record="", machine_view_manifest_body="",
        machine_view_manifest_digest=None,
        render_mode_dedicated_record="", render_mode_manifest_body="",
        render_mode_manifest_digest=None,
        opening_band_dedicated_record="", opening_band_manifest_body="",
        opening_band_manifest_digest=None,
        versioned_inputs=versioned_inputs,
        contract_chain_inputs=contract_inputs,
        contract_chain=(CONTRACT_SUCCESSOR_CHAIN + (THIRD_LINK,)
                        if kind == "restyle-three-link-cascade" else None),
        spec_policy_inputs=spec_inputs,
        poc_successor_inputs=poc_inputs)
    PWB_SUCCESSOR_CHAIN = kept_chain
    return c.row("CG-7h")


def _selftest_wave_partition(kind):
    """CG-7a/CG-7b against a synthetic six-wave package in a temp tree.

    Review RD-17 finding 3: CG-7 was credited as covered on CG-7e's two
    fixtures while CG-7a-7d — the four checks guarding every owner act
    argument — had none, so the partition predicates were proved only by a
    reviewer's mutation in a scratch clone and never by the battery itself.

    `kind` is the mutation: `overlap` puts one module in two waves, `gap`
    leaves one in the active manifest and no wave, `stale-arg` gives an
    unperformed offering a digest its manifest does not hash to,
    `performed-current-amendment` changes current Wave-A bytes and the active
    manifest while preserving the performed manifest, and
    `tampered-performed` mutates the performed manifest after recording its
    act argument.
    """
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))

        def row(self, prefix):
            return next((r for r in self.rows if r[1].startswith(prefix)),
                        None)
    import shutil
    import tempfile
    d = tempfile.mkdtemp(prefix="cg7-selftest-")
    global ROOT
    keep = ROOT
    try:
        cand = os.path.join(d, CANDIDATES)
        os.makedirs(os.path.join(cand, "rfcs"))
        os.makedirs(os.path.join(cand, "wave-manifests"))
        mods, paths = {}, []
        for i, w in enumerate(WAVE_IDS, 1):
            rel = f"rfcs/mod-{i}.md"
            full = os.path.join(cand, rel)
            with open(full, "w", encoding="utf-8") as fh:
                fh.write(f"module {i}\n")
            mods[w] = (rel, sha256_file(full))
            paths.append(f"{CANDIDATES}/{rel}")
        active = [mods[w] for w in WAVE_IDS]
        for w in WAVE_IDS:
            rows = [mods[w]]
            if kind == "overlap" and w == "B":
                rows.append(mods["A"])
            p = os.path.join(cand, f"wave-manifests/WAVE-{w}-MANIFEST.txt")
            with open(p, "w", encoding="utf-8") as fh:
                fh.write("".join(f"{s}  {r}\n" for r, s in rows))
            paths.append(WAVE_MANIFESTS[w])

        # A later amendment changes current Wave-A bytes. ACTIVE follows the
        # new bytes; the performed A manifest deliberately retains act-time
        # row digests.
        if kind == "performed-current-amendment":
            a_rel, _old_sha = mods["A"]
            with open(os.path.join(cand, a_rel), "a", encoding="utf-8") as fh:
                fh.write("amendment\n")
            active[0] = (a_rel, sha256_file(os.path.join(cand, a_rel)))
        if kind == "gap":
            active.append(("rfcs/orphan.md", "0" * 64))
            with open(os.path.join(cand, "rfcs/orphan.md"), "w") as fh:
                fh.write("orphan\n")
            active[-1] = ("rfcs/orphan.md",
                          sha256_file(os.path.join(cand, "rfcs/orphan.md")))
        with open(os.path.join(cand, "ACTIVE-CONTRACT-MANIFEST.txt"), "w") as fh:
            fh.write("".join(f"{s}  {r}\n" for r, s in sorted(active)))
        paths.append(MANIFEST)

        manifest_args = {
            w: sha256_file(os.path.join(
                cand, f"wave-manifests/WAVE-{w}-MANIFEST.txt"))
            for w in WAVE_IDS
        }
        offer_lines = []
        for w in WAVE_IDS:
            digest = ("0" * 64 if kind == "stale-arg" and w == "C1"
                      else manifest_args[w])
            offer_lines.append(
                f"| {w} | `ACCEPT FOUNDATIONAL WAVE {w}: {digest}` | "
                "one module |")
        with open(os.path.join(cand, os.path.basename(ACCEPTANCE_RECORD)),
                  "w", encoding="utf-8") as fh:
            fh.write("\n".join(offer_lines) + "\n")
        paths.append(ACCEPTANCE_RECORD)

        performed_full = os.path.join(d, PERFORMED_ACT_RECORD)
        os.makedirs(os.path.dirname(performed_full), exist_ok=True)
        with open(performed_full, "w", encoding="utf-8") as fh:
            for w in PERFORMED_WAVE_IDS_REQUIRED:
                fh.write(f"ACCEPT FOUNDATIONAL WAVE {w}: "
                         f"{manifest_args[w]}\n")
        paths.append(PERFORMED_ACT_RECORD)

        if kind == "tampered-performed":
            with open(os.path.join(
                    cand, "wave-manifests/WAVE-A-MANIFEST.txt"),
                    "a", encoding="utf-8") as fh:
                fh.write("0" * 64 + "  rfcs/forged.md\n")
        ROOT = d
        c = Cap()
        cg7_manifest(paths, c)
        if kind == "performed-current-amendment":
            row_a, row_b = c.row("CG-7a"), c.row("CG-7b")
            return (bool(row_a) and row_a[0] == "OK"
                    and bool(row_b) and row_b[0] == "OK")
        want = ("CG-7b" if kind in ("stale-arg", "tampered-performed")
                else "CG-7a")
        row = c.row(want)
        return bool(row) and row[0] == "FAIL"
    finally:
        ROOT = keep
        shutil.rmtree(d, ignore_errors=True)


def _selftest_dangling():
    class Cap:
        def __init__(self): self.rows = []
        def add(self, status, name, examined, n, unit, note=None, details=None):
            self.rows.append((status, name, examined, n, details or []))
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        pkg = os.path.join(d, RFCS_DIR)
        os.makedirs(pkg)
        rel = f"{RFCS_DIR}/RFC-0001-kernel.md"
        with open(os.path.join(d, rel), "w") as fh:
            fh.write("---\ndepends_on: [RFC-0099]\n---\n")
        global ROOT
        keep, ROOT = ROOT, d
        try:
            c = Cap()
            cg13_dependency_graph(c, modules=[rel])
            return c.rows[0][0] == "FAIL"
        finally:
            ROOT = keep


#: **The population, widened 2026-08-10 (review RD-17 finding 4).** The rule
#: was written for the load map and enforced only there, so the same stale
#: `32 modules` figure sat unreported in the package README's reproduction
#: instruction and in the task index — both active-lane routers, both files
#: `AGENTS.md` sends a reader to. A rule applied to one of three artifacts
#: that share its failure mode is a rule with a two-thirds hole.
#: Enumerated, never globbed: a glob over `candidates/*.md` would swallow the
#: generated budget report, whose whole job is to state measurements.
ROUTING_ARTIFACTS = (
    LOAD_MAP,
    f"{CANDIDATES}/README.md",
    #: TASK-TO-CONTRACT-INDEX.md left this population 2026-08-18: already
    #: SUPERSEDED-bannered since 2026-08-10, it moved to `history/` when
    #: Administration 1's F2 counted its 49 embedded historical figures as
    #: active-lane measurement findings. The history lane is off the active
    #: path by convention; the file's rows remain history, not routes.
)


def cg20_load_map_states_no_measurement(res, body=None, modules=None):
    """The routing artifacts state no measurement of the corpus they route.

    **Inverted on 2026-08-06, for the reason CG-21 was.** This check used to
    verify that the map's eleven per-contract word rows still recomputed, and
    it earned its place: eleven of eleven were stale, one by 1,745 words,
    while the paragraph above them claimed the figures were "re-runnable from
    this packet". A fresh engineer caught two of the eleven by hand and,
    having caught them, correctly stopped trusting the file.

    Keeping the rows true was the wrong repair. A map whose job is to say
    *what to load* does not also need to say *what it weighs*, and the second
    job is what kept breaking the first. The figures now live in the generated
    `CONTEXT-BUDGET-REPORT.md`, and this check verifies they have not come
    back — including into the fixture-exercise table, which held a third copy
    of every fixture's measurement.

    Denominator is lines examined, not figures found: a figure count reaches
    zero exactly when the rule is honoured, and `0 examined` verifies nothing.
    """
    if body is not None:
        subjects = [(LOAD_MAP, body)]
    else:
        subjects = [(rel, read(rel)) for rel in ROUTING_ARTIFACTS
                    if os.path.exists(os.path.join(ROOT, rel))]
    if not any(t for _rel, t in subjects):
        res.add("WARN", "CG-20  routing artifacts state no measurement", 0, 0,
                "line", note=f"{LOAD_MAP} unreadable")
        return
    findings, examined = [], 0
    for rel, text in subjects:
        for line_no, line in enumerate(text.splitlines(), 1):
            examined += 1
            if MEASUREMENT_POINTER in line:
                continue
            for m in CONTRACT_MEASUREMENT.finditer(line):
                findings.append(
                    f"{rel}:{line_no} — states the measurement "
                    f"`{m.group(0)}`. A routing artifact routes; it does not "
                    f"measure. The load map's own figures went stale eleven "
                    f"rows out of eleven, which is why the rule exists; the "
                    f"home for every figure is the generated "
                    f"{MEASUREMENT_POINTER}")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-20  routing artifacts state no measurement", examined,
            len(findings), "line",
            note=(f"{len(subjects)} artifact(s): "
                  + ", ".join(os.path.basename(r) for r, _ in subjects)
                  if examined else "load map is empty"),
            details=findings)


#: Kept under the old name so call sites and the citation record read the
#: same. Identifiers are amended in place, never renumbered.
cg20_load_map_figures = cg20_load_map_states_no_measurement


#: A figure that describes the pre-compaction monolith cannot be recomputed
#: from the package, and is not a defect. It must say so on its own line —
#: the marker is the disclosure, exactly as CG-7d requires of a historical
#: digest quotation. A figure with no marker and no current referent is
#: assumed stale, which is the fail-closed direction.
#: Two marker classes, deliberately scoped differently — a single window for
#: both let a `~9,500 target` two lines away exempt a stale `2,029` index
#: count, which is the allowlist-wider-than-the-check failure this repository
#: has already paid for once.
#:
#: A **threshold** is a policy number: nothing's word count by design, always
#: written inline ("the ~7,000 ceiling"). Windowed at ±1 line — the same
#: sentence, never the same section: at ±2 a "~9,500 target" exempted a
#: stale index count two lines above it.
THRESHOLD_MARKERS = ("ceiling", "target", "budget")
THRESHOLD_WINDOW = 1
#: A **frozen-source** figure describes the pre-compaction monolith and cannot
#: be recomputed from the package. Prose wraps, so the marker and the figure it
#: licenses routinely land on opposite sides of a line break: windowed.
FROZEN_FIGURE_MARKERS = ("frozen", "rev9", "monolith", "source words",
                         "source's", "pre-split", "before the split",
                         "moved to tier 2", "scaffolding")
FIGURE = re.compile(r"\b\d{1,2},\d{3}\b")
FIGURE_WINDOW = 2


#: A measurement claim inside contract prose. Comma-formatted figures in the
#: derived-value range, and the vocabulary that introduces one. Clause
#: identities (`RFC9-52`), years, and section numbers do not match.
#:
#: **Corpus counts widened 2026-08-10 (review RD-17 finding 4).** The regex
#: matched comma-formatted figures and word/token vocabulary only, so a count
#: of *modules*, *contracts* or *clauses* — the corpus measurements most
#: likely to move under a wave restructure — was invisible to it. CG-20 was
#: *named* for the rule and reported `73 lines examined, 0 findings` while
#: the load map it checks stated `11 contracts → 32 modules` against a real
#: population of 39. Measured before widening: zero new findings across the
#: 39 contract modules, five across the three routing artifacts — so the
#: widening reports the defect it was written for and nothing else.
#: `MEASUREMENT_POINTER` remains the escape hatch.
CONTRACT_MEASUREMENT = re.compile(
    r"\b\d{1,2},\d{3}\b"
    r"|(?<![\w-])\d{3,}\s*(?:words?|tokens?)\b"
    r"|\b\d{1,3}\s+(?:modules?|contracts?|clauses?|fixtures?|checks?)\b"
    r"|`wc -w`"
    r"|\bword count(?:s)?\b",
    re.I)
#: The one place a contract module may say the phrase, because it is the
#: sentence that sends the reader to the measurement's real home.
MEASUREMENT_POINTER = "CONTEXT-BUDGET-REPORT.md"


def cg21_contract_prose_states_no_measurement(res, modules=None):
    """No contract module states a measurement of anything.

    **This check was inverted on 2026-08-06, and the inversion is the point.**

    It used to verify that the nineteen per-module word counts in package
    READMEs still recomputed. That is a real check and it found real defects
    — but it accepts the premise that a volatile measurement belongs inside a
    contract, and then tries to keep it true. The premise is the defect. These
    figures sit **inside act 1's digest set**: correcting one changes the
    argument the owner would sign, for a reason that has nothing to do with
    what the contract says.

    The history is four rounds long. Nineteen of nineteen module rows were
    stale in the commit whose own message claimed to have corrected every
    stale derived value. A hand repair then left nine more of the same class
    in the same file, stating module 1 as 6,996 in one place and 6,999 in
    another. The check written to close that class could not see the rows it
    was written for, and a reviewer mutation-tested it at `111,111` to prove
    so. Each round fixed the instances; none removed the reason instances
    keep appearing.

    So the rule is now: **a contract module states no measurement.** Sizes
    live in the generated `CONTEXT-BUDGET-REPORT.md`, which is regenerated
    rather than transcribed, and the compaction narrative lives in the round
    report that owns it. What stays in the contract is what it *says*.

    The denominator is the module count, never the figure count — a figure
    count goes to zero exactly when the rule is being honoured, and a check
    reporting `0 examined` verifies nothing.
    """
    if modules is None:
        base = os.path.join(ROOT, RFCS_DIR)
        modules = []
        for dirpath, _dirs, names in os.walk(base):
            for n in sorted(names):
                if n.endswith(".md"):
                    modules.append(os.path.relpath(
                        os.path.join(dirpath, n), ROOT).replace(os.sep, "/"))
        modules.sort()
    findings, examined = [], 0
    for rel in modules:
        body = read(rel)
        if not body:
            continue
        examined += 1
        for line_no, line in enumerate(body.splitlines(), 1):
            if MEASUREMENT_POINTER in line:
                continue
            for m in CONTRACT_MEASUREMENT.finditer(line):
                findings.append(
                    f"{rel}:{line_no} — states the measurement "
                    f"`{m.group(0)}`; contract prose carries no measurement, "
                    f"and this one is inside act 1's digest set. Its home is "
                    f"the generated {MEASUREMENT_POINTER}")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-21  contract prose states no measurement", examined,
            len(findings), "module",
            note=None if examined else "no contract modules found",
            details=findings)


#: Kept under the old name so the battery's call sites and the selftest
#: registry read the same. Renaming a check identifier would break every
#: citation of CG-21 in the round records, and identifiers are amended in
#: place, never renumbered.
cg21_package_readme_counts = cg21_contract_prose_states_no_measurement


# --------------------------------------------------------------- CG-22

#: The term registry's §1 rule, made executable: five different questions in
#: this project are answered by five different closed vocabularies, and
#: English offers one word for all of them. A field, column, badge, filter or
#: API key named only `status` is a defect wherever more than one dimension
#: could be meant — and OpenSpec authoring is about to multiply field names.
#:
#: This check exists to hold a line the corpus currently holds, not to clean
#: one it has lost. Written 2026-08-06 over 4 hits in 135 active files. A
#: check whose denominator is real but whose finding count is near zero is
#: worth having only if it can still fail: see the four `--selftest` fixtures.
STATUS_SHAPES = (
    (re.compile(r"`status`"), "code span `status`"),
    (re.compile(r"`status\s*:"), "code-span field `status:`"),
    (re.compile(r"^\s{2,}status\s*:", re.M), "indented field `status:`"),
)

#: Naming any one of the five dimensions in the same whitespace-normalized
#: window disambiguates the use. Window, not line: a qualifier and the word it
#: qualifies routinely land on opposite sides of a wrap.
#:
#: A second copy of the registry's §1 dimension set (review RD-6 F-3 row 1),
#: kept rather than derived because the registry's table names dimensions in
#: forms a writer does not use ("Claim epistemic label") and the last three
#: entries are not §1 dimension-row names (the registry states them as an
#: alias or in its §1 rule instead). CG-22c holds the copy to the
#: registry: every dimension the table names must end in one of these.
#: CG-22c's and CG-17's rule-6 mutants, with old/new fragments:
#: `docs/evidence/syzygy-eexf-check-owners-rule6-2026-10-03.json`.
STATUS_QUALIFIERS = (
    "state plane", "epistemic label", "evidence tier", "rendering tier",
    "work lifecycle", "governance lifecycle", "chain state", "lifecycle state",
)

#: Naming the token in order to record that it was retired is not a use of it
#: — the same shape CG-12 uses for `_bootstrap/` mentions marked historical.
#: The marker must fall inside the window, so a "renamed" three sections away
#: exempts nothing.
STATUS_RETIRED_MARKERS = (
    "renamed", "retired", "superseded", "cg-22", "term registry §1",
)

#: Explicit, reasoned, per-file. Never a glob — an allowlist that absorbs a
#: file it was not written for is how a live instruction got exempted here
#: once already.
STATUS_ALLOW = {
    TERM_REGISTRY:
        "states the rule itself; the bare form is the thing being forbidden",
    ".syzygy/governance/contracts/candidates/round-2026-08d/OWNER-WORK-ORDER.md":
        "owner-supplied work order, quoted verbatim — its bare `status` "
        "spans name the defect it orders fixed",
    "syzygy_claude_structural_contract_decomposition_prompt.md":
        "the owner's working copy of the round-2026-08d work order, "
        "untracked at repo root; same text as the archived copy",
    ".syzygy/governance/policies/craft-and-care/interfaces-and-dependencies.md":
        "quotes a violating API's own field name as the rule's worked "
        "counter-example — adopted craft text, not a Syzygy field",
}

STATUS_WINDOW = 2

#: Vendored external substrate. Copied in verbatim under an owner override so
#: a clone needs no external fetch (see `GOVERNANCE-SUBSTRATE-LOCK.yaml`); its
#: prose is somebody else's, is never edited to satisfy a Syzygy checker, and
#: is not the active lane. Declared per prefix, never globbed from
#: `.claude/skills/` — `heart-and-soul` lives there and *is* ours.
#:
#: CG-1a/CG-1b honor this too (`_is_vendored_gap`, defined beside `cg1_links`
#: above): a vendored file's own cross-references to un-vendored siblings are
#: classified under CG-1e, not counted as broken links. Forward-referenced
#: here because Python resolves module-level names at call time, not
#: definition time — every `cg1_links` call happens after this line has run.
VENDORED_EXTERNAL = (
    ".claude/skills/th-engineering/",
    ".codex/skills/th-engineering/",
    # OpenSpec's installed slash-command set (arrived with the `openspec/`
    # tool scaffold, 2026-08-15). Upstream's prose, upstream's field names.
    ".claude/commands/opsx/",
)


#: The registry §1 table's dimension cells: `| **State plane** | …`.
DIMENSION_SECTION = re.compile(r"^## 1\. [^\n]*\n([\s\S]*?)(?=^## )", re.M)
DIMENSION_ROW = re.compile(r"^\|\s*\*\*([^*|]+?)\*\*\s*\|", re.M)


def cg22c_qualifier_coverage(res, registry=None):
    """`STATUS_QUALIFIERS` still names every dimension the registry does."""
    label = "CG-22c status qualifiers cover the term registry's dimensions"
    reg = registry if registry is not None else read(TERM_REGISTRY)
    sec = DIMENSION_SECTION.search(reg or "")
    dims = [d.strip().lower() for d in DIMENSION_ROW.findall(sec.group(1))] \
        if sec else []
    if not dims:
        res.add("FAIL", label, 0, 1, "dimension",
                details=[f"{TERM_REGISTRY} §1 — no dimension table parsed; "
                         f"the qualifier list cannot be checked against it"])
        return
    findings = [f"{TERM_REGISTRY} §1 names `{d}`; no entry of "
                f"STATUS_QUALIFIERS ends it, so a use qualified that way "
                f"still fails CG-22" for d in dims
                if not any(d.endswith(q) for q in STATUS_QUALIFIERS)]
    own = [q for q in STATUS_QUALIFIERS
           if not any(d.endswith(q) for d in dims)]
    res.add("FAIL" if findings else "OK", label, len(dims), len(findings),
            "dimension",
            note=(f"qualifiers that are not §1 dimension-row names: "
                  f"{', '.join(own)}" if own else None),
            details=findings)


def cg22_ambiguous_status(paths, res, corpus=None):
    """No unqualified `status` where the dimension is ambiguous.

    The working term registry §1 (candidate). Active lane only: frozen
    history and verbatim reviewer output are evidence, never instructions,
    and are never edited to satisfy a checker.
    """
    if corpus is None:
        corpus = [(p, read(p)) for p in paths
                  if p.endswith(".md")
                  and "/history/" not in p and "/reviews/" not in p
                  and "/round-2026-08/" not in p
                  and not p.startswith("_bootstrap/")
                  and not p.startswith(VENDORED_EXTERNAL)]
    findings, allowed = [], []
    examined = 0
    for rel, text in corpus:
        examined += 1
        lines = text.splitlines()
        hits = []
        for pat, label in STATUS_SHAPES:
            for m in pat.finditer(text):
                hits.append((text[:m.start()].count("\n") + 1, label))
        if not hits:
            continue
        if rel in STATUS_ALLOW:
            allowed.append(f"{rel} ({len(hits)} hit(s)) — {STATUS_ALLOW[rel]}")
            continue
        for i, label in sorted(set(hits)):
            lo = max(0, i - 1 - STATUS_WINDOW)
            window = " ".join(
                " ".join(lines[lo:i + STATUS_WINDOW]).split()).lower()
            if not any(q in window for q in
                       STATUS_QUALIFIERS + STATUS_RETIRED_MARKERS):
                findings.append(
                    f"{rel}:{i} — unqualified {label}; name the dimension "
                    f"(state plane / epistemic label / evidence tier / work "
                    f"lifecycle / governance lifecycle): "
                    f"{lines[i - 1].strip()[:70]}")
    res.add("FAIL" if findings else ("OK" if examined else "WARN"),
            "CG-22  no unqualified `status` in the active lane", examined,
            len(findings), "file",
            note=None if examined else "no active markdown examined",
            details=findings)
    res.add("WARN", "CG-22b unqualified-`status` allowlist", len(allowed), 0,
            "file", note="the rule's own statement and its counter-example",
            details=sorted(allowed))


# --------------------------------------------------------------- CG-23

#: The working term registry's two-tier claim, made executable: a reader
#: arriving at the default public path must not have to learn thirty terms.
#: The registry states this bound and states that it currently fails. Until
#: an owner act accepts the core set the bound cannot be enforced — so this
#: reports, every run, rather than asserting a state nobody has ruled on.
#:
#: The registry previously promised this enforcement from "CG-17", which
#: routes surface clauses and has nothing to do with vocabulary. Corrected
#: 2026-08-06.
#: The core set is **read out of the registry's own core table**, never listed
#: here. A hard-coded copy is the transcription class this battery exists to
#: catch: the list sat here for one round, and the moment the registry moved a
#: term between tiers the check went on policing the old split while reporting
#: green. Derived, it cannot disagree with the artifact it checks.
CORE_TABLE_ROW = re.compile(r"^\|\s*[^|]+?\s*\|\s*(T-\d+)\s*\|", re.M)
CORE_SECTION = re.compile(r"\*\*Core — the [a-z]+\.\*\*[\s\S]*?\n\n(\|[\s\S]*?)\n\n")
TERM_HEADING = re.compile(r"^#### (T-\d+) · (.+?)(?:\s*\(also called.*)?$", re.M)


def _core_term_ids(reg):
    m = CORE_SECTION.search(reg)
    return tuple(CORE_TABLE_ROW.findall(m.group(1))) if m else ()


#: Inflectional endings a term picks up in running prose. **Not stemming** —
#: an enumerated suffix set, so widening it is a deliberate edit rather than
#: an algorithm quietly changing what counts as a leak.
VOCAB_INFLECTIONS = ("s", "es", "ed", "d", "ing")


def vocab_pattern(name):
    r"""A term as it actually appears on the default path.

    Two blind spots, both measured by review RD-16 finding 5 against the live
    corpus and both invisible to `\b<escaped name>\b`:

    * **line wrap.** `OVERVIEW.md` reads ``its **Project\nGenome**``, so
      `\bProject Genome\b` was `False` and T-03 went unreported while the
      term registry's §5 census presented "both current hits" as a census of
      what exists. Multi-word terms now join on `\s+`, the same tolerance
      CG-12 and CG-22 already apply to their own markers.
    * **inflection.** `Diff -->|warranted work| Fleet` is `Warrant` (T-17)
      inflected, and `an explicitly approved **Mission** envelope` is T-28's
      bare alias. A word-boundary match on the registry's own citation form
      sees neither.

    The final word takes an optional inflectional suffix; earlier words do
    not, because an inflected head inside a compound is a different term, not
    this one. The cost of matching loosely is handled the way this battery
    handles every widening — `VOCAB_ORDINARY_USE`, enumerated and printed —
    and CG-23 is report-only, so a false positive costs a printed line, never
    a failed run.

    **Known limit, third blind spot (RD-16 finding 5, recorded not repaired).**
    A term *defined in place* — "a **Warrant** — that is, an approved intent
    — …" — still reads as a leak here, because the matcher sees the token and
    not the gloss beside it. This is deliberate. The finding CG-23 exists to
    report is that the registry's own census *understated* the leak count, and
    widening the exemptions on a check whose defect was under-reporting is the
    wrong direction: a definition-marker vocabulary would be guessed, and a
    guessed exemption is how a real leak stops being printed. A reader
    disposing of one of these has the same tool everyone else does —
    `VOCAB_ORDINARY_USE`, one enumerated entry, printed every run. The limit
    is pinned by the fixture `CG-23 defined-in-place use is still reported
    (known limit)`, so a future silent change to it is visible.
    """
    words = name.split()
    if not words:
        return re.compile(r"(?!)")
    body = r"\s+".join(re.escape(w) for w in words[:-1])
    tail = re.escape(words[-1]) + "(?:" + "|".join(VOCAB_INFLECTIONS) + ")?"
    joined = (body + r"\s+" + tail) if body else tail
    return re.compile(r"\b" + joined + r"\b", re.I)
#: The default path ends where progressive disclosure begins. Everything
#: inside a drawer is deliberate drill-down and is out of scope by design.
DRAWER = "<details>"

#: Ordinary-English uses of a word that is also an advanced term. Enumerated
#: and printed every run, never pattern-matched away: a rule broad enough to
#: infer "this one is ordinary English" would also excuse a real leak. Keyed
#: by (file, term ID) so widening it to a second term in the same file is a
#: deliberate edit.
VOCAB_ORDINARY_USE = {
    ("README.md", "T-13"):
        "\"No claim of alignment, convergence, or regeneration capability\" "
        "(README.md, 'What is not implemented' section; restated 2026-08-10, "
        "RD29-10 — 'is intended by this repository') — the ordinary "
        "verb-shaped noun, not the kernel's "
        "positive-status carrier. An earlier revision of this exemption "
        "misquoted the very line it exempts; review RD-3 caught it in "
        "passing, and nothing here verifies the quotation mechanically",
}


def cg23_default_path_vocabulary(res, registry=None, default_path=None):
    reg = registry if registry is not None else read(TERM_REGISTRY)
    entries = {tid: name.strip() for tid, name in TERM_HEADING.findall(reg)}
    core = _core_term_ids(reg)
    findings, examined, exempted = [], 0, []

    if not core:
        findings.append("the registry's core table did not parse — the tier "
                        "split this check reads is unavailable, so every term "
                        "below is being reported as advanced")
    missing_core = [t for t in core if t not in entries]
    if missing_core:
        findings.append(f"core ids {missing_core} appear in the core table "
                        f"and have no registry entry of their own")
    advanced = {tid: n for tid, n in entries.items() if tid not in core}

    if default_path is None:
        default_path = []
        for rel in ("README.md", ".syzygy/intent/OVERVIEW.md"):
            body = read(rel)
            cut = body.find(DRAWER)
            default_path.append((rel, body if cut < 0 else body[:cut]))

    # Matching is **case-insensitive at word boundaries**, because the real
    # leaks in this corpus are lowercase running prose — "computed at an
    # identified evaluation", "the intent that warranted it". A case-sensitive
    # match on the registry's own capitalisation missed every one of them.
    #
    # The cost of matching loosely is ordinary English read as jargon: "no
    # claim of alignment" is not the term `Claim`. That is handled the way
    # this battery handles every exemption — an enumerated allowlist, printed
    # on every run, never a silent widening of the pattern. An entry names the
    # file, the term, and why the use is ordinary English.
    for rel, body in default_path:
        for tid, name in sorted(advanced.items()):
            examined += 1
            pat = vocab_pattern(name)
            hits = len(pat.findall(body))
            if not hits:
                continue
            excuse = VOCAB_ORDINARY_USE.get((rel, tid))
            if excuse:
                exempted.append(f"{rel} — `{name}` ({tid}) {hits}× — {excuse}")
                continue
            findings.append(f"{rel} — uses advanced term "
                            f"`{name}` ({tid}) {hits}× on the default path")
    res.add("WARN", "CG-23  default-path vocabulary reported", examined,
            len(findings), "term-in-file",
            note=("report-only — the core set is candidate, so this is the "
                  "registry's own bound reported, not enforced"
                  if examined else "no advanced terms parsed — registry "
                                   "headings changed shape"),
            details=findings + [f"[ordinary-English use, exempt] {e}"
                                for e in exempted])


# --------------------------------------------------------------- CG-24

#: "`--selftest` runs every check above against a synthetic failing input."
#: That sentence has been false for as long as it has been written, and two
#: independent reviews (RC-10 §7.2 vi, RC-11 RC11-G) raised it. The first
#: repair added twenty-nine fixtures — all clustered in the range that already
#: had coverage — which made the sentence *less* true as a proportion while
#: looking like a fix.
#:
#: A prose correction goes stale the next time a check is added. So the
#: denominator is computed instead: CG-24 reads the fixture names out of this
#: file's own `selftest()` and compares them against the identifiers the
#: battery actually reported this run. Adding a check with no fixture now
#: shows up here on the same run.
#: Fixture names read `"CG-19 private substrate detected"` or `"F8g CG-19 …"`;
#: the battery's own check names read `"CG-19  substrate pins …"` with two
#: spaces. The single-space lookahead is what separates a fixture from the
#: check it tests — without it every check would appear to cover itself.
#: A fixture may name a lettered sub-check (`CG-7e`, `CG-1b`) while the family
#: this check counts is the numeric stem. Admitting the suffix is what let the
#: first CG-7 fixture ever written be credited to CG-7; without it the fixture
#: existed and the coverage figure still reported the family uncovered.
#: **Anchored to `selftest()`'s own body, not to a quoting convention.**
#: The single-space lookahead below was doing the work of separating a fixture
#: name from a check name, and three string literals in this file broke the
#: two-space convention it rested on: `res.add("WARN", "CG-11 ignore rules"`,
#: `res.add("WARN", "CG-12b …")`, and a sentence about CG-11 inside a
#: `print`. All three were counted as fixtures, and CG-24 over-credited
#: itself by two families — `16 of 24` where the truth was `14 of 24` (review
#: RD-17 finding 3, mutation M9). CG-24's own fixture for exactly this
#: (*"a check's own name is not a fixture for it"*) passed, because its
#: synthetic input used the convention the real corpus did not.
#:
#: The anchor is now three conditions, and the third was earned the same day:
#: a fixture name must live inside the `selftest()` region, must open a tuple
#: or list element (`cases.append(("CG-…`, `("F1a CG-19 …`, `(f"CG-20 …`),
#: and must keep the single-space form. The tuple anchor exists because
#: CG-24's *own* new fixture feeds a synthetic module containing
#: `res.add("WARN", "CG-11 ignore rules", …)` — inside `selftest()`, and
#: therefore credited under the region rule alone. The check reproduced its
#: own defect on the first run after the repair, which is what fixtures are
#: for.
CASE_NAME = re.compile(r'[(\[]\s*f?"(?:F\d+[a-z]?\s+)?(CG-\d+)[a-z]? (?! )')
CHECK_ID = re.compile(r"^(CG-\d+)")
SELFTEST_REGION = re.compile(
    r"^def (selftest|_selftest_[a-z_]+)\(.*?(?=\n(?:def |# -{5,}))",
    re.M | re.S)


def _selftest_source(text):
    """Just the fixture-defining regions of this file.

    Returns (source, region_count) so a refactor that renames or moves
    `selftest()` shows up as `0 regions` rather than as `every family
    uncovered`, which would read as a catastrophe and be a parser bug.
    """
    regions = SELFTEST_REGION.findall(text)
    if not regions:
        return "", 0
    spans = [m.group(0) for m in SELFTEST_REGION.finditer(text)]
    return "\n".join(spans), len(spans)


def cg24_selftest_coverage(res, source=None, reported=None):
    regions = None
    if source is not None:
        src = source
    else:
        # CG-24's own fixtures pass synthetic sources containing invented
        # identifiers; reading them back out of this file would report them as
        # real. Drop the lines that construct them.
        src = "\n".join(ln for ln in read(SELF_REL).splitlines()
                        if "cg24_selftest_coverage(" not in ln)
    # A whole module is narrowed to its fixture regions; a bare snippet is
    # taken as given, which is what the older fixtures hand in.
    if "def selftest(" in src:
        src, regions = _selftest_source(src)
    covered = set(CASE_NAME.findall(src))
    if reported is None:
        # CG-24 and CG-25 have not added their own rows yet; include both, or
        # each reports the other as a check the battery never ran.
        reported = [s[1] for s in res.summaries] + ["CG-24  self",
                                                    "CG-25  self"]
    families, seen = [], set()
    for name in reported:
        m = CHECK_ID.match(name.strip())
        # Sub-checks (CG-7a..d, CG-22b) roll up to their family: a fixture for
        # CG-7a is not a fixture for CG-7d, but the coarser claim is the one
        # the prose makes, and overstating coverage here would repeat the
        # defect.
        if m and m.group(1) not in seen:
            seen.add(m.group(1))
            families.append(m.group(1))
    uncovered = [f for f in families if f not in covered]
    orphan = sorted(covered - set(families))
    details = []
    if regions == 0:
        details.append("no `selftest()` region parsed out of this file — the "
                       "fixture population is Unknown, not empty; the "
                       "coverage figure below is not evidence")
    if uncovered:
        details.append(f"no `--selftest` fixture: {', '.join(uncovered)}")
    if orphan:
        details.append(f"fixtures naming a check the battery did not report: "
                       f"{', '.join(orphan)}")
    res.add("WARN", "CG-24  selftest coverage reported", len(families),
            len(details), "check family",
            note=(f"{len(families) - len(uncovered)} of {len(families)} check "
                  f"families have at least one fixture — quote this figure, "
                  f"never 'every check'" if families else "nothing examined"),
            details=details)


def cg25_check_owners(res, reported=None, owners=None):
    """Every check the battery reports names the rule it enforces.

    Review RD-17 finding 11: a sweep of the whole corpus for `CG-\\d+`
    citations found 692 of them across 70 files and **not one** inside
    doctrine, craft-and-care, or any contract module. Three FAIL-severity
    checks were enforcing normative editorial rules whose only written
    statement was a Python docstring, and nothing in the battery's output
    distinguished them from a check enforcing adopted doctrine.

    This check makes the attribution structural rather than remembered: a new
    check with no `CHECK_OWNERS` entry fails the run that introduces it, and
    an entry naming a check the battery no longer reports is reported too, so
    the table cannot quietly outlive its subject.

    `Results.report()` prints the owner beside every FAIL. `PYTHON_ONLY_RULES`
    downgrades the two checks whose rule is stated nowhere else, with the
    reason printed — advisory, never silent.
    """
    owners = CHECK_OWNERS if owners is None else owners
    if reported is None:
        reported = [s[1] for s in res.summaries] + ["CG-25  self"]
    families, seen = [], set()
    for name in reported:
        fam = check_family(name)
        if fam and fam not in seen:
            seen.add(fam)
            families.append(fam)
    missing = [f for f in families if f not in owners]
    orphan = sorted(set(owners) - set(families))
    findings = [f"{f} — reported by the battery and absent from "
                f"CHECK_OWNERS; a FAIL nobody can attribute to a rule is a "
                f"FAIL nobody can act on" for f in missing]
    details = list(findings)
    if orphan:
        details.append(f"CHECK_OWNERS names a check the battery did not "
                       f"report: {', '.join(orphan)}")
    downgraded = getattr(res, "downgraded", [])
    for fam in sorted(set(owners) & set(families)):
        if fam in ADVISORY_RULES:
            details.append(f"[downgraded] {fam} — {ADVISORY_RULES[fam]}")
    res.add("FAIL" if findings else ("OK" if families else "WARN"),
            "CG-25  every check names its authoritative rule", len(families),
            len(findings), "check family",
            note=(f"{len(families) - len(missing)} of {len(families)} "
                  f"attributed; {len(ADVISORY_RULES)} downgraded to WARN "
                  f"({len(PYTHON_ONLY_RULES)} with no written owner, "
                  f"{len(CANDIDATE_HOME_RULES)} with a candidate one)"
                  f"{f'; {len(downgraded)} fired this run' if downgraded else ''}"
                  if families else "nothing examined"),
            details=details)


# --------------------------------------------------------------- main


def _activate_redis_local_agent_battery_copies():
    """Install change: the battery's recorder lines pass each recorded local-agent act's argument."""
    pairs = list(DOSSIER_LOCAL_AGENT_ACT_RECORDS.items())
    # the provider statement's version-2 recorder line passes its argument too, once performed
    pairs += list(DOSSIER_PROVIDER_V2_ACT_RECORDS.items())
    # the Redis observation consent's line is in node-ci, not here (NODE_CHECKS)
    # the RFC5-14 constants exist only once that act's chain link is installed; the
    # name is split so this text never carries the chain step's install mark
    rfc5 = globals().get("RFC5_" "CLASS_LABEL")
    if rfc5 is not None:
        pairs.append((rfc5, globals()["RFC5_" "CLASS_ACT"]))
    present = ACT_DIGEST_COPY_FILES.get("PROJECT-STATUS.md", ())
    for label, record in pairs:
        if os.path.isfile(os.path.join(ROOT, record)) and label not in present:
            present = present + (label,)
    ACT_DIGEST_COPY_FILES["PROJECT-STATUS.md"] = present


_activate_redis_local_agent_battery_copies()


def main():
    ap = argparse.ArgumentParser(
        description="Read-only governance checks. Never rewrites anything.")
    ap.add_argument("--scope", choices=("clone", "tracked"), default="clone",
                    help="clone (default): tracked files plus untracked files "
                         "git does not ignore — what a clone will contain once "
                         "committed. tracked: `git ls-files` only.")
    ap.add_argument("--selftest", action="store_true",
                    help="run each check against a synthetic failing input "
                         "and report whether it detects the defect. Proves "
                         "the checks are not no-ops; examines no repository "
                         "file.")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    paths, tracked, source = corpus_paths(args.scope)

    existing = [p for p in paths if os.path.exists(os.path.join(ROOT, p))]
    missing = len(paths) - len(existing)
    print(f"repo root: {ROOT}")
    if source == "walk":
        print(f"scope:     filesystem walk — {len(existing)} file(s) examined. "
              "git is unavailable here, so tracked/ignored status is Unknown: "
              "CG-11 cannot run and `--scope tracked` is not honored. Every "
              "other check runs over the walked corpus.\n")
    else:
        print(f"scope:     {args.scope} — {len(existing)} file(s) examined "
              f"({len(tracked)} tracked, "
              f"{len(existing) - len([p for p in existing if p in tracked])} "
              f"untracked-not-ignored"
              f"{f', {missing} listed but absent' if missing else ''})\n")

    res = Results()
    cg1_links(existing, res)
    cg2_retired_tokens(existing, res)
    cg2e_wrapped_current_arguments(existing, res)
    cg3_stale_routing(existing, res)
    cg4_candidate_banners(existing, res)
    cg5_craft_banners(existing, res)
    cg6_accepted_homes(res)
    cg7_manifest(existing, res)
    cg7h_general_bootstrap_act(res)
    cg8_budgets(existing, res)
    cg9_duplicate_homes(existing, res)
    cg10_pending_asof(existing, res)
    if source == "git":
        cg11_ignored(res)
    else:
        res.add("WARN", "CG-11  ignore rules", 0, 0, unit="rule",
                note="git unavailable — ignore status is Unknown, "
                     "not clean; re-run inside a git checkout")
    cg12_bootstrap_sources(existing, res)
    cg13_dependency_graph(res)
    cg14_install_routes(res, all_paths=existing)
    cg15_truncated_digests(existing, res)
    cg16_term_registry_status(existing, res)
    cg17_routing_completeness(res)
    cg18_fixture_freshness(res)
    cg19_substrate_lock(res)
    cg20_load_map_figures(res)
    cg21_package_readme_counts(res)
    cg22_ambiguous_status(existing, res)
    cg22c_qualifier_coverage(res)
    cg23_default_path_vocabulary(res)
    cg26_battery_parity(res)
    cg27_default_path_currency(res)
    cg24_selftest_coverage(res)
    cg25_check_owners(res)
    res.report()
    return 1 if res.failed() else 0


if __name__ == "__main__":
    sys.exit(main())
