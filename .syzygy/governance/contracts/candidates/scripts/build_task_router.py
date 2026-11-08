#!/usr/bin/env python3
"""Generate TASK-ROUTER.md — the one current task router.

The router is **generated navigation, never authority**: it names, for each
task class, the directly governing clauses, the modules that own them, the
mandatory dependencies (read from module front matter, never hand-listed),
the applicable doctrine/craft rules, and the explicit omissions. It measures
nothing (the budget report owns measurement) and decides nothing (clauses
own their content).

Every route is validated at generation time:
  - every routed path exists in the tree;
  - every cited clause ID is defined in the module the route names;
  - every doctrine/craft identifier appears in its owning file;
  - deferred routes carry the deferred label.

Three routes are permanent regression fixtures (the launch-gate D2 tasks);
mutating any of them must fail --selftest.

Usage:
  python3 build_task_router.py            # (re)write TASK-ROUTER.md
  python3 build_task_router.py --check    # drift check, no write
  python3 build_task_router.py --selftest # mutation fixtures
"""

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CAND = HERE.parent                      # .../contracts/candidates
SYZ = CAND.parent.parent.parent         # .../.syzygy
REPO = SYZ.parent
OUT = CAND / "TASK-ROUTER.md"

# GP-Q0 part 2: agent Load selection only; dependency/authority sweeps keep
# their original inputs. Implementation lives outside the governed bundle.
sys.path.insert(0, str(REPO / "scripts"))
from spent_round_routing import agent_load_paths, declared_rounds  # noqa: E402

D = ".syzygy/governance/doctrine"
CR = ".syzygy/governance/policies/craft-and-care"
DEC = ".syzygy/governance/decisions"
C = ".syzygy/governance/contracts/candidates"

#: Owner charter §10: the Capability 1 route and the first-specification
#: sequence may not be independently maintained enumerations. Everything
#: this router says about Capability 1 — its clauses, their authority
#: homes, its doctrine, its blocking decisions and its later-gate
#: decisions — is read from `CAPABILITY-1-CHARTER.yaml` through
#: `build_capability_1_views.route_payload()`, which resolves each clause
#: to its module through the generated contract index and refuses one homed
#: outside Waves A+B. **Nothing about Capability 1 is typed twice**, so
#: this route and the sequence's behaviour rows cannot disagree: they are
#: one source read by two generators, and each `--check` fails on drift.
sys.path.insert(0, str(HERE))
from build_capability_1_views import (                             # noqa: E402
    CharterError, open_decisions, route_payload)

try:
    CAP1 = route_payload()
except CharterError as _exc:
    print(f"CAPABILITY-1-CHARTER.yaml does not validate, so the Capability 1 "
          f"route cannot be generated:\n  {_exc}", file=sys.stderr)
    raise SystemExit(1)

#: Administration 1 (2026-08-18) D2 counterexample: two of the three fixed
#: routing tasks ended at candidate copies although their governing Wave
#: A/B modules were installed and accepted 2026-08-17. A route must end at
#: the governed home. Modules named by the Wave A/B manifests therefore
#: route to the installed tree (`contracts/rfcs/`, install shape (M));
#: deferred-wave modules keep their candidate home. The mapping is guarded
#: by existence — if the installed copy is absent the candidate path
#: stands, and validation still checks whichever path is emitted.
ACCEPTED = ".syzygy/governance/contracts"


def _accepted_wave_rels():
    rels = set()
    for wave in ("A", "B"):
        man = CAND / "wave-manifests" / f"WAVE-{wave}-MANIFEST.txt"
        for line in man.read_text(encoding="utf-8").splitlines():
            parts = line.split()
            if len(parts) == 2 and len(parts[0]) == 64:
                rels.add(parts[1])
    return rels


_ACCEPTED_RELS = _accepted_wave_rels()


def governed_home(path):
    """Candidate-tree path -> accepted-home path, for accepted modules only."""
    prefix = f"{C}/"
    if path.startswith(prefix):
        rel = path[len(prefix):]
        if rel in _ACCEPTED_RELS and (REPO / ACCEPTED / rel).is_file():
            return f"{ACCEPTED}/{rel}"
    return path


CAP1_CLAUSES = {cid: governed_home(f"{C}/{rel}")
                for cid, rel in CAP1["clauses"].items()}
CAP1_CLAUSE_MODULES = sorted(set(CAP1_CLAUSES.values()))

#: One entry per task class. `clauses` maps clause-id -> repo-relative path
#: of the module that must define it (validated). `deps` is derived, not
#: listed here. Routes marked deferred=True route into deferred-wave
#: candidates and say so (DEFERRED-WAVE-POSTURE.md).
def _read(rel):
    return (REPO / rel).read_text(encoding="utf-8")


#: RD-53 f6: the router claimed "zero of the 30 Waves A+B modules" and
#: claimed, one line later, that its counts are computed. Both figures were
#: literals. They are derived here, from the two wave manifests and from a
#: sweep over the modules those manifests name, so the sentence goes stale
#: loudly — if P-37 is ruled and the vocabulary is drafted into a contract,
#: this count moves and `--check` fails.
#:
#: The sweep is for the facet NAMES, not for the English word "facet": the
#: word occurs generically in RFC-0006 and RFC-0008 and would make the
#: measurement useless. A name matching here means a contract module has
#: begun to carry the vocabulary.
FACET_NAMES = ("Shape present", "Human-understandable", "Mission-ready",
               "shape facet", "project-shape facet")


def _wave_ab_modules():
    mods = []
    for wave in ("A", "B"):
        man = f"{C}/wave-manifests/WAVE-{wave}-MANIFEST.txt"
        for line in _read(man).splitlines():
            parts = line.split()
            if len(parts) == 2 and len(parts[0]) == 64:
                mods.append(parts[1])
    return mods


def _facet_carrying_modules():
    hits = []
    for rel in _wave_ab_modules():
        path = rel if rel.startswith(".syzygy/") else f"{C}/{rel}"
        try:
            body = _read(path)
        except OSError:
            continue
        if any(name.lower() in body.lower() for name in FACET_NAMES):
            hits.append(rel)
    return hits


AB_MODULE_COUNT = len(_wave_ab_modules())
FACET_HITS = _facet_carrying_modules()


def _clause_range(rel, prefix):
    ids = sorted(int(m) for m in re.findall(
        rf"\*\*{prefix}-([0-9]+)\b", _read(rel)))
    return (f"{prefix}-{ids[0]}…{ids[-1]}" if ids else f"no {prefix} clause")


CC_SPEC_RANGE = _clause_range(
    f"{C}/policy-candidates/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md",
    "CC-SPEC")
CC_IMPACT_RANGE = _clause_range(
    f"{C}/policy-candidates/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md",
    "CC-IMPACT")

TASKS = [
    dict(
        key="evidence-adapter",
        fixture="D2_ROUTINE_TASK",
        title="Add an evidence adapter for a new CI system",
        clauses={
            "RFC4-13": f"{C}/rfcs/RFC-0004/named-adapters.md",
            "RFC2-25": f"{C}/rfcs/RFC-0002/rendering-vocabularies.md",
            "RFC5-21": f"{C}/rfcs/RFC-0005/execution-profiles.md",
        },
        modules=[
            f"{C}/rfcs/RFC-0004/general-contract.md",
            f"{C}/rfcs/RFC-0004/named-adapters.md",
            f"{C}/rfcs/RFC-0002/rendering-vocabularies.md",
            f"{C}/rfcs/RFC-0005/execution-profiles.md",
            f"{C}/rfcs/RFC-0003/governance-homes-and-owner-acts.md",
        ],
        doctrine=[("VIS-2", f"{D}/vision.md"), ("SEC-4", f"{D}/security.md")],
        craft=[("CC-TEST-2", f"{CR}/testing-and-verification.md")],
        omissions=[
            "RFC-0008 state/cost — carried by an earlier router row, but "
            "absent from RFC-0004's declared `depends_on` (finding T-5): an "
            "adapter emits evidence; the work surface's cost vocabulary is "
            "not its contract",
        ],
        note="This route corrects the load map's superseded Adapter-author "
             "row, which finding T-5 measured wrong in both directions.",
    ),
    dict(
        key="mission-completion",
        fixture="D2_AUTHORITY_TASK",
        title="Change what counts as a completed Mission",
        deferred=True,
        clauses={
            "RFC10-18": f"{C}/rfcs/RFC-0010/effects-recovery-and-stop.md",
            "RFC10-5":
                f"{C}/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md",
        },
        modules=[
            f"{C}/rfcs/RFC-0010/effects-recovery-and-stop.md",
            f"{C}/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md",
        ],
        doctrine=[("VIS-4", f"{D}/vision.md")],
        craft=[],
        omissions=[
            "No accepted clause governs this yet: both modules are DEFERRED "
            "candidates (Waves D1/D2); completion adjudication is RFC10-18, "
            "the lifecycle freeze question is RFC-0010 §8 q1 (open), and the "
            "stop/containment repair form is owner question P-30",
        ],
        note="Deferred-wave route, singular and explicit per "
             "DEFERRED-WAVE-POSTURE.md — the answer today is a candidate "
             "plus two open owner questions, and saying so is the route.",
    ),
    dict(
        key="merged-to-reconciled",
        fixture="D2_SEAM_TASK",
        title="Trace a merged change from its work record to its "
              "reconciled status",
        clauses={
            "RFC2-17": f"{C}/rfcs/RFC-0002/reconciliation-chain.md",
            "RFC8-12":
                f"{C}/rfcs/RFC-0008/state-vocabulary-and-cost.md",
        },
        modules=[
            f"{C}/rfcs/RFC-0002/reconciliation-chain.md",
            f"{C}/rfcs/RFC-0008/state-vocabulary-and-cost.md",
            f"{C}/rfcs/RFC-0008/accounting-reconciliation-and-release.md",
        ],
        doctrine=[("VIS-2", f"{D}/vision.md")],
        craft=[],
        omissions=[
            "Merged work is never proof intent was satisfied — the chain "
            "renders Unknown until reconciliation is computed; fixture 10 "
            "(fixtures/context-selection-10-trajectory-lifecycle.md) is the "
            "worked selection for this class",
        ],
        note="Crosses the work-surface/evidence seam: RFC-0002 owns the "
             "reconciliation chain, RFC-0008 owns the work-state rendering.",
    ),
    dict(
        key="kernel",
        title="Implement or reason about the shared project model (kernel)",
        clauses={
            "RFC1-1":
                f"{C}/rfcs/RFC-0001-project-graph-identity-state-planes.md",
            "RFC2-1": f"{C}/rfcs/RFC-0002/snapshot-and-evaluation-core.md",
        },
        modules=[
            f"{C}/rfcs/RFC-0001-project-graph-identity-state-planes.md",
            f"{C}/rfcs/RFC-0002/snapshot-and-evaluation-core.md",
            f"{C}/rfcs/RFC-0002/challenge-lifecycle.md",
            f"{C}/rfcs/RFC-0002/reconciliation-chain.md",
            f"{C}/rfcs/RFC-0003/governance-homes-and-owner-acts.md",
        ],
        doctrine=[("VIS-1", f"{D}/vision.md"), ("VIS-2", f"{D}/vision.md")],
        craft=[("CC-BAR-5", f"{CR}/engineering-bar.md")],
        omissions=["Surface packages — a kernel task consumes no rendering "
                   "contract"],
    ),
    dict(
        key="surface-polaris",
        title="Specify or reason about Polaris (intent view)",
        clauses={"RFC7-1": f"{C}/rfcs/RFC-0007/narrative-contract.md"},
        modules=[
            f"{C}/rfcs/RFC-0007/README.md",
            f"{C}/rfcs/RFC-0007/narrative-contract.md",
            f"{C}/rfcs/RFC-0007/rendering-and-surface.md",
            f"{C}/rfcs/RFC-0002/rendering-vocabularies.md",
            f"{C}/rfcs/RFC-0006-cross-surface-selection-query-drawer.md",
        ],
        doctrine=[("VIS-1", f"{D}/vision.md")],
        craft=[("CC-VIZ-5", f"{CR}/performance-and-visual-discipline.md")],
        omissions=["RFC-0008 — the sibling work view owns its own contract; "
                   "RFC-0009 is NOT omitted — it is a declared, clause-borne "
                   "dependency (RFC7-31's shared release-policy leg is "
                   "stated at RFC9-45, never duplicated locally), so a "
                   "release-gate question requires "
                   "rfcs/RFC-0009/interaction-parity-and-release.md"],
    ),
    dict(
        key="surface-trajectory",
        title="Specify or reason about Trajectory (work view)",
        clauses={
            "RFC8-1":
                f"{C}/rfcs/RFC-0008/identity-authority-materialization.md"},
        modules=[
            f"{C}/rfcs/RFC-0008/README.md",
            f"{C}/rfcs/RFC-0008/identity-authority-materialization.md",
            f"{C}/rfcs/RFC-0008/state-vocabulary-and-cost.md",
            f"{C}/rfcs/RFC-0008/accounting-reconciliation-and-release.md",
            f"{C}/rfcs/RFC-0002/rendering-vocabularies.md",
            f"{C}/rfcs/RFC-0006-cross-surface-selection-query-drawer.md",
        ],
        doctrine=[("VIS-2", f"{D}/vision.md")],
        craft=[],
        omissions=["Charter reminder: never satisfied by an issue list "
                   "(SDR-2)"],
    ),
    dict(
        key="surface-orrery",
        title="Specify or reason about Orrery (map view)",
        clauses={"RFC9-1": f"{C}/rfcs/RFC-0009/semantic-geography.md"},
        modules=[
            f"{C}/rfcs/RFC-0009/README.md",
            f"{C}/rfcs/RFC-0009/semantic-geography.md",
            f"{C}/rfcs/RFC-0009/visual-grammar-and-lenses.md",
            f"{C}/rfcs/RFC-0009/interaction-parity-and-release.md",
            f"{C}/rfcs/RFC-0008/state-vocabulary-and-cost.md",
            f"{C}/rfcs/RFC-0008/accounting-reconciliation-and-release.md",
            f"{C}/rfcs/RFC-0002/rendering-vocabularies.md",
            f"{C}/rfcs/RFC-0006-cross-surface-selection-query-drawer.md",
        ],
        doctrine=[("VIS-1", f"{D}/vision.md")],
        craft=[],
        omissions=["The two RFC-0008 modules are loaded for their closed "
                   "vocabularies only: RFC9-32/RFC9-46 require the "
                   "work/construction overlay to carry the thirteen "
                   "normalized values (RFC8-12/8-13) and six chain values "
                   "(RFC8-28) verbatim, inside the release-gated tuple"],
    ),
    dict(
        key="security-profile",
        title="Security, consent, or execution-profile work",
        clauses={"RFC5-1": f"{C}/rfcs/RFC-0005/admission-and-boundary.md"},
        modules=[
            f"{C}/rfcs/RFC-0005/admission-and-boundary.md",
            f"{C}/rfcs/RFC-0005/consent-egress-secrets.md",
            f"{C}/rfcs/RFC-0005/execution-profiles.md",
            f"{C}/rfcs/RFC-0003/governance-homes-and-owner-acts.md",
        ],
        doctrine=[("SEC-1", f"{D}/security.md"),
                  ("SEC-3", f"{D}/security.md")],
        craft=[("CC-SEC-1", f"{CR}/security-and-secrets.md")],
        omissions=["Load only the RFC-0005 module the task touches; the "
                   "list above is the package census, not one packet"],
    ),
    dict(
        key="spec-authoring",
        title="Author or judge a specification (once authorized)",
        clauses={
            "RFC6-28":
                f"{C}/rfcs/RFC-0006-cross-surface-selection-query-drawer.md"},
        modules=[
            f"{C}/HOW-TO-AUTHOR-A-SYZYGY-SPEC.md",
            f"{C}/FIRST-OPENSPEC-SEQUENCE.md",
            f"{C}/policy-candidates/"
            "SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md",
        ],
        doctrine=[("VIS-4", f"{D}/vision.md")],
        craft=[("CC-REV-2", f"{CR}/review-and-documentation.md")],
        omissions=["No spec may be authored yet: the answer to 'may I "
                   "implement X?' is no until OpenSpec exists, and the "
                   "answer to 'may I author OpenSpec?' is the owner's "
                   "launch decision"],
    ),
    dict(
        key="doctrine-question",
        title="A doctrine question (why; non-negotiables)",
        clauses={},
        modules=[f"{D}/README.md", f"{D}/vision.md"],
        doctrine=[("VIS-1", f"{D}/vision.md")],
        craft=[],
        omissions=["Load the one doctrine file the question touches, via "
                   "the heart-and-soul skill — never the whole tree"],
    ),
    dict(
        key="readiness",
        title="Is this ready for OpenSpec? (current status)",
        clauses={},
        modules=["PROJECT-STATUS.md", "launch-gate-pre-specifications.md",
                 f"{C}/FIRST-OPENSPEC-SEQUENCE.md"],
        doctrine=[("VIS-2", f"{D}/vision.md")],
        craft=[],
        omissions=["The superseded 09 readiness report is history and "
                   "answers nothing"],
    ),
    dict(
        key="author-capability-1",
        title=f"Author Capability 1 — {CAP1['title']}",
        note="**The specification is ADOPTED and Capability 1 "
             "implementation is authorized by a separate owner act.** The "
             "owner adopted the one change "
             "`openspec/changes/project-registration-and-honest-shape-visibility/` "
             "at exact digests (act dated 2026-08-20, recorded at "
             "`decisions/CAPABILITY-1-SPECIFICATION-ADOPTION-ACT.md`); it "
             "is the accepted behavioral authority for Capability 1 and "
             "supersedes the charter for required behaviour. The adoption "
             "itself authorizes no implementation; the separate "
             "implementation-authorization act — dated 2026-08-21, "
             "recorded at "
             "`decisions/CAPABILITY-1-IMPLEMENTATION-AUTHORIZATION-ACT.md` "
             "— authorizes implementation exactly as it names it: plan "
             "first, a bounded Beads backlog, and code in ordinary root "
             "implementation paths (`apps/**`, `packages/**`, tooling, "
             "root manifests) — never inside `openspec/**` or "
             "`.syzygy/**`. No capability beyond Capability 1 may be "
             "authored or implemented without a new owner act. The Wave A "
             "and B acts were performed 2026-08-17, "
             "so every clause below is **accepted** contract text "
             "installed at `contracts/rfcs/` (`PROJECT-STATUS.md` owns "
             "that state; owner-adopted bootstrap, uncorrelated — never "
             "\"verified\").",
        clauses=CAP1_CLAUSES,
        modules=[
            # what the capability must do — RD-53 f10 and G1: the route had
            # no document stating its own scope. The three planning
            # documents are named here; every contract module below them is
            # DERIVED from the charter's clause set, so a module can no
            # longer be loaded without a clause that needs it.
            f"{C}/FIRST-OPENSPEC-SEQUENCE.md",
            f"{C}/CAPABILITY-1-GENERATED-VIEWS.md",
            f"{C}/HOW-TO-AUTHOR-A-SYZYGY-SPEC.md",
        ] + CAP1_CLAUSE_MODULES,
        doctrine=[(r, f"{D}/vision.md") for r in CAP1["doctrine"]],
        craft=[],
        # RD-53 f5: the two wave acts and the three rulings that ride them
        # were absent, and P-34/P-35 were listed here though the queue's own
        # launch-scope index assigns them to the administration gate.
        blocking_decisions=CAP1["blocking_decisions"],
        downstream_decisions=CAP1["downstream_decisions"],
        omissions=[
            "Every Mission and Context-selection contract — RFC-0010 and "
            "RFC-0011 — is excluded. They are DEFERRED-WAVE candidates and "
            "Capability 1 relies on none of them; the Mission-ready facet "
            "is a future extension, not a launch facet",
            f"The specification-acceptance rules ({CC_SPEC_RANGE}) and the "
            f"shape-to-spec impact rules ({CC_IMPACT_RANGE}) are IN FORCE "
            "as of 2026-08-17 (craft acts 6 and 7, "
            "`decisions/ACCEPTANCE-ACT-RECORD.md`), binding at their "
            "committed policy-candidates homes, uncopied and unedited. "
            "They govern how a specification is authored and accepted, "
            "not what Capability 1's clauses mean — which is why they are "
            "not listed under Craft above",
            "The facet vocabulary itself is routed to no clause: swept at "
            f"generation over the {AB_MODULE_COUNT} modules the Waves A+B "
            f"manifests name, it appears in {len(FACET_HITS)} of them. "
            "P-37 (ruled 2026-08-16, recorded as SDR-36 — "
            "`decisions/PENDING-OWNER-DECISIONS.md` owns the queue state) "
            "places the vocabulary in the Capability 1 specification, not "
            "a Wave A amendment — authored there 2026-08-20 as "
            "CAP1-REQ-030 and **adopted with the specification** "
            "(2026-08-20 act). The sweep "
            "is for the facet names, "
            "not for the English word \"facet\", which occurs generically",
        ],
    ),
    dict(
        key="deferred-waves",
        title="Anything touching Missions or Context selection",
        deferred=True,
        clauses={},
        modules=[f"{C}/DEFERRED-WAVE-POSTURE.md"],
        doctrine=[("VIS-4", f"{D}/vision.md")],
        craft=[],
        omissions=["Waves C1/C2/D1/D2 are candidate and deferred; the "
                   "posture file names what they may not influence and "
                   "which owner decisions gate their repair"],
    ),
]

#: Apply the accepted-home mapping to every route (see governed_home above).
#: Done once, here, so no task entry can bypass it by being typed with the
#: candidate prefix — the Capability 1 payload got the same mapping at
#: CAP1_CLAUSES. Deferred routes are untouched by construction: no RFC-0010
#: or RFC-0011 module is named by a Wave A/B manifest.
for _t in TASKS:
    _t["modules"] = [governed_home(p) for p in _t["modules"]]
    _t["clauses"] = {cid: governed_home(p) for cid, p in _t["clauses"].items()}

FRONT_DEP = re.compile(r"^depends_on:\s*\[([^\]]*)\]", re.M)


def read(rel):
    return (REPO / rel).read_text(encoding="utf-8")


def module_deps(paths):
    deps = set()
    for rel in paths:
        if not rel.endswith(".md") or "/rfcs/" not in rel:
            continue
        try:
            m = FRONT_DEP.search(read(rel)[:2000])
        except OSError:
            continue
        if m:
            deps.update(x.strip() for x in m.group(1).split(",") if x.strip())
    return sorted(deps)


#: The identifiers a route may name as blocking. Two populations qualify:
#: rows in the queue's open table, and the unperformed acceptance acts —
#: P-41 and P-42 are themselves craft acts, so excluding acts would be
#: inconsistent. Everything under a "Resolved…" heading, and every row whose
#: final cell leads with `**Executed.**`, is disqualified: RD-53 proved that
#: the old whole-file anchor accepted P-6, P-7, P-13 and P-26 — all executed
#: — and rendered them under the words "each verified open".
#:
#: **This is now one function, not two identical ones.** It was duplicated
#: here with a comment saying the two copies must stay identical, which is
#: the same "maintained by hand in two places" defect this generator exists
#: to remove — and on 2026-08-13 both copies had to be patched for one bug.
#: `build_capability_1_views.open_decisions` is the single home; the three
#: limbs of its predicate are mutation-covered by that module's `--selftest`.
def queue_disposable_ids():
    return open_decisions(read(f"{DEC}/PENDING-OWNER-DECISIONS.md"))


#: A non-deferred route may not reach deferred-wave content. RD-53 proved
#: the old fixture named for this check tested something else entirely:
#: injecting real RFC-0010 and RFC-0011 modules into the Capability 1 load
#: set validated clean and rendered them into the Load line.
DEFERRED_RE = re.compile(r"/rfcs/RFC-001[01]\b")


def validate(tasks):
    errs = []
    for t in tasks:
        for rel in t["modules"]:
            if not (REPO / rel).exists():
                errs.append(f"{t['key']}: routed path missing: {rel}")
        for cid, rel in t["clauses"].items():
            if not (REPO / rel).exists():
                errs.append(f"{t['key']}: clause home missing: {rel}")
            # `\b` was wrong for sub-clause identifiers: after the `)` of
            # `RFC3-16(a)` the next character is `*`, and two non-word
            # characters are not a word boundary, so a genuinely defined
            # sub-clause reported as undefined. The lookahead does the job
            # `\b` was there for — refusing a `RFC3-1` match inside
            # `RFC3-16` — and admits the sub-clause form.
            elif not re.search(rf"\*\*{re.escape(cid)}(?![0-9A-Za-z(-])",
                               read(rel)):
                errs.append(f"{t['key']}: clause {cid} not defined in {rel}")
        for ident, rel in t.get("doctrine", []) + t.get("craft", []):
            if not (REPO / rel).exists():
                errs.append(f"{t['key']}: rule home missing: {rel}")
            elif ident not in read(rel):
                errs.append(f"{t['key']}: {ident} absent from {rel}")
        if t.get("deferred") and not any(
                "DEFERRED" in o or "deferred" in o or "Deferred" in o
                for o in t["omissions"]):
            errs.append(f"{t['key']}: deferred route lacks a deferred "
                        "disclosure in its omissions")
        # A route that names a blocking owner decision must name one that
        # is actually OPEN in the queue. A decision named here but already
        # ruled would understate what a reader may do; one named here but
        # absent from the queue is a decision nobody is tracking.
        disposable = queue_disposable_ids()
        for key in ("blocking_decisions", "downstream_decisions"):
            for pid in t.get(key, []):
                if pid not in disposable:
                    errs.append(
                        f"{t['key']}: {key} names {pid}, which is not an "
                        f"open row or an unperformed act in "
                        f"{DEC}/PENDING-OWNER-DECISIONS.md — it is absent, "
                        f"resolved, or already executed")
        # A route that is not itself the deferred-wave route may not route
        # into a deferred wave, by module or by clause home.
        if not t.get("deferred"):
            for rel in list(t["modules"]) + list(t["clauses"].values()):
                if DEFERRED_RE.search(rel):
                    errs.append(
                        f"{t['key']}: routes into deferred-wave content "
                        f"({rel}); RFC-0010 and RFC-0011 are deferred and "
                        f"belong to no launch-path route")
            for dep in module_deps(t["modules"]):
                if dep in ("RFC-0010", "RFC-0011"):
                    errs.append(
                        f"{t['key']}: a routed module declares a dependency "
                        f"on {dep}, which is deferred")
    return errs


def render(tasks):
    rounds = declared_rounds(REPO)
    lines = [
        "# Task router — the one current route per task class",
        "",
        "> **Generated navigation — never authority.** Written by",
        "> `scripts/build_task_router.py`; regenerate with it; never",
        "> hand-edit. Clauses own their content; the budget report owns",
        "> every measurement; this file only routes. Every path and clause",
        "> below is existence-checked at generation. Where this file and a",
        "> clause disagree, the clause wins. It supersedes",
        "> the historical task index (`history/TASK-TO-CONTRACT-INDEX.md`)",
        "> and the load map's reader-map table",
        "> as the routing answer; `06-CONTEXT-LOAD-MAP.md` remains the",
        "> context-budget instrument.",
        "",
        f"{sum(1 for t in tasks if t.get('fixture'))} routes are "
        "**permanent routing regression fixtures** (the",
        "launch-gate parameter block's fixed D2 tasks); they are marked and",
        "`--selftest` proves their mutation is caught.",
        "",
    ]
    for t in tasks:
        fx = (f" *(routing fixture: `{t['fixture']}`)*"
              if t.get("fixture") else "")
        defer = " — **DEFERRED-WAVE ROUTE**" if t.get("deferred") else ""
        lines.append(f"## {t['title']}{fx}{defer}")
        lines.append("")
        if t.get("note"):
            lines.append(f"{t['note']}")
            lines.append("")
        if t["clauses"]:
            lines.append("**Directly governing clauses:** " + "; ".join(
                f"`{cid}` (`{rel}`)" for cid, rel in t["clauses"].items()))
        lines.append("**Load:** " + " · ".join(
            f"`{m}`" for m in agent_load_paths(
                t["modules"], rounds, explicit_history=t.get("explicit_history", False))))
        deps = module_deps(t["modules"])
        if deps:
            lines.append("**Declared contract dependencies (from module "
                         "front matter, computed):** " + ", ".join(deps))
        if t.get("doctrine"):
            lines.append("**Doctrine:** " + ", ".join(
                f"`{i}`" for i, _ in t["doctrine"]))
        if t.get("craft"):
            lines.append("**Craft:** " + ", ".join(
                f"`{i}`" for i, _ in t["craft"]))
        if t.get("blocking_decisions"):
            lines.append("**Owner decisions and acts blocking this task:** "
                         + ", ".join(f"`{p}`"
                                     for p in t["blocking_decisions"])
                         + " — each checked at generation time against the "
                           "open table in `PENDING-OWNER-DECISIONS.md`, "
                           "which owns their state, and against the "
                           "unperformed acts; a resolved or executed row "
                           "is refused")
        if t.get("downstream_decisions"):
            lines.append("**Open upstream of this task, at a later gate:** "
                         + ", ".join(f"`{p}`"
                                     for p in t["downstream_decisions"])
                         + " — the queue's launch-scope index assigns these "
                           "to the formal launch administration, not to "
                           "authoring; they are named so the reader is not "
                           "surprised by them, not because this task "
                           "consumes them")
        for o in t["omissions"]:
            lines.append(f"**Explicitly omitted:** {o}")
        lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("Generated by `scripts/build_task_router.py` — "
                 f"{len(tasks)} task classes, every route validated at "
                 "generation time. Counts computed, never asserted.")
    lines.append("")
    return "\n".join(lines)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "--selftest":
        import copy
        fails = []

        seen = []

        def case(name, mutate, expect):
            seen.append(name)
            ts = copy.deepcopy(TASKS)
            mutate(ts)
            errs = validate(ts)
            ok = any(expect in e for e in errs)
            print(("  pass  " if ok else "  FAIL  ") + name)
            if not ok:
                fails.append(name)

        base = validate(TASKS)
        print(("  pass  " if not base else "  FAIL  ") +
              "current routes all validate")
        if base:
            fails.append("base")
            for e in base:
                print("        " + e)
        case("missing routed path detected",
             lambda ts: ts[0]["modules"].append(
                 f"{C}/rfcs/RFC-0004/nonexistent.md"),
             "routed path missing")
        case("undefined clause detected",
             lambda ts: ts[0]["clauses"].update(
                 {"RFC4-999": f"{C}/rfcs/RFC-0004/general-contract.md"}),
             "not defined in")
        case("fixture route mutation detected (evidence adapter loses "
             "its tier-registry module)",
             lambda ts: ts[0]["clauses"].update(
                 {"RFC2-25": f"{C}/rfcs/RFC-0004/named-adapters.md"}),
             "not defined in")
        case("deferred route without disclosure detected",
             lambda ts: ts[1]["omissions"].clear(),
             "lacks a deferred disclosure")
        case("mission fixture dead-path mutation detected",
             lambda ts: ts[1]["modules"].__setitem__(
                 0, f"{C}/rfcs/RFC-0010-mission-control-autonomy.md"),
             "routed path missing")
        cap = next(i for i, t in enumerate(TASKS)
                   if t["key"] == "author-capability-1")
        case("Capability 1 route: an unqueued blocking decision detected",
             lambda ts: ts[cap]["blocking_decisions"].append("P-999"),
             "which is not an open row")
        case("Capability 1 route: a clause routed to the wrong module "
             "detected",
             lambda ts: ts[cap]["clauses"].update(
                 {"RFC7-39": f"{C}/rfcs/RFC-0008/state-vocabulary-and-cost.md"}),
             "not defined in")
        # RD-53 f3: the case that used to carry this name mutated `clauses`
        # and asserted "not defined in" — the predicate two cases above it.
        # It now mutates `modules` with a real deferred module, which is the
        # thing the name says, and it fails only against the new predicate.
        case("Capability 1 route: a deferred-wave module in the load set "
             "detected",
             lambda ts: ts[cap]["modules"].append(
                 f"{C}/rfcs/RFC-0011/deterministic-selection-and-budget.md"),
             "routes into deferred-wave content")
        case("Capability 1 route: a deferred-wave clause home detected",
             lambda ts: ts[cap]["clauses"].update(
                 {"RFC10-5":
                  f"{C}/rfcs/RFC-0010/mission-identity-approval-and-lifecycle.md"}),
             "routes into deferred-wave content")
        # RD-53 f4: P-26 is a recorded owner override — an executed row in a
        # "Resolved…" section. The old whole-file anchor accepted it and
        # rendered it as "verified open".
        case("Capability 1 route: an already-executed decision named as "
             "blocking detected",
             lambda ts: ts[cap]["blocking_decisions"].append("P-26"),
             "resolved, or already executed")
        case("Capability 1 route: a later-gate decision named as executed "
             "detected",
             lambda ts: ts[cap]["downstream_decisions"].append("P-7"),
             "resolved, or already executed")
        n = len(seen)
        print(f"{n} fixtures, {len(fails)} failing — a check that cannot "
              "fail is not a check")
        # Run the routing-only behavior fixtures through the same canonical
        # selftest entry point; the original eleven fixtures stay intact.
        import unittest
        from test_spent_round_routing import RoutingTests
        result = unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(RoutingTests))
        sys.exit(1 if fails or not result.wasSuccessful() else 0)

    errs = validate(TASKS)
    if errs:
        for e in errs:
            print("ERROR " + e)
        sys.exit(1)
    text = render(TASKS)
    if mode == "--check":
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print("task router drifted from regeneration — rerun "
                  "build_task_router.py")
            sys.exit(1)
        print(f"task router matches regeneration — {len(TASKS)} task "
              "classes validated")
        sys.exit(0)
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(REPO)} — {len(TASKS)} task classes, "
          "all routes validated")


if __name__ == "__main__":
    main()
