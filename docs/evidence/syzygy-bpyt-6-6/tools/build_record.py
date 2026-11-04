#!/usr/bin/env python3
"""Write reconciliation-gen1.json for syzygy-bpyt.6.6 from the findings below and the probe outputs beside it.

Evidence record, not authority. Digests are computed here (rule 3), never typed: each probe output and each audited
source file is hashed at the commit named in `audited.commit` (read through `git show`, so the record can be rebuilt
from any later checkout).

    python3 docs/evidence/syzygy-bpyt-6-6/tools/build_record.py            # write
    python3 docs/evidence/syzygy-bpyt-6-6/tools/build_record.py --check    # exit 1 if the file differs
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parents[1]
OUT = HERE / "reconciliation-gen1.json"
AUDITED = "f564084549dcbf368ba05d33ac7335055ae498f0"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def blob_sha(rel: str) -> str:
    return hashlib.sha256(subprocess.run(["git", "-C", str(ROOT), "show", f"{AUDITED}:{rel}"], check=True, capture_output=True).stdout).hexdigest()


PROBES = {
    "sweeps.json": ("python3 docs/evidence/syzygy-bpyt-6-6/tools/sweeps.py > docs/evidence/syzygy-bpyt-6-6/sweeps.json", "tools/sweeps.py"),
    "runner-stderr.json": ("npx tsc -b apps/three-surface-poc && node docs/evidence/syzygy-bpyt-6-6/tools/runner-stderr.mjs \"$PWD\" <scratch>", "tools/runner-stderr.mjs"),
}

SUBJECTS = [
    "packages/three-surface-poc-core/src/code-structure.ts",
    "packages/three-surface-poc-core/src/git-tree.ts",
    "packages/three-surface-poc-core/src/act-fields.ts",
    "packages/three-surface-poc-core/src/body-read-authority.ts",
    "packages/three-surface-poc-core/src/walkthrough-judgment.ts",
    "packages/support/src/index.ts",
    "packages/support/src/support-purity.test.ts",
    "packages/three-surface-poc-core/src/epistemic.ts",
    "packages/three-surface-poc-core/src/content-classification.ts",
    "packages/three-surface-poc-core/src/git-object-reader.ts",
    "packages/three-surface-poc-core/src/project-shape-observation.ts",
    "packages/three-surface-poc-core/src/project-shape-model.test.ts",
    "packages/three-surface-poc-core/src/reevaluation.ts",
    "packages/three-surface-poc-core/src/resource-headroom.ts",
    "packages/three-surface-poc-core/src/resource-ledger.ts",
    "packages/three-surface-poc-core/src/worker-change-observation.ts",
    "apps/three-surface-poc/src/routes.ts",
    "apps/three-surface-poc/src/verbatim-route.ts",
    "apps/three-surface-poc/src/governance-inputs.ts",
    "apps/three-surface-poc/src/git-observation.ts",
]

CHECKLIST = [
    {
        "finding": "DC-1", "bead": "syzygy-bpyt.6.1 (+6.7, 6.9)", "classification": "resolved",
        "target": "code-structure.ts lists the tree with -z through the shared parser; a record it cannot read makes the inventory Unknown, never a skip.",
        "evidence": [
            "[Observed] code-structure.ts:157 runs ls-tree -r -z -l; :179 parses through parseGitLsTree (git-tree.ts) with nulTerminated: true; a malformed parse (:180), a non-NUL-terminated listing (:173) or an undeclared size or non-SHA-1 id (:187) returns the malformed-inventory Unknown. The only remaining filter keeps blobs (:185), and gitlinks are dropped by a well-formed-head match only (:98, :107-119).",
            "[Observed] All 5 non-test ls-tree invocations under packages/, apps/ and scripts/ pass -z (sweeps.json row 'ls-tree invocation', two methods agree): governance-inputs.ts:261, repo-corpus.ts:182, self-corpus.ts:42, code-structure.ts:157, project-shape-observation.ts:454.",
            "[Observed] Residual, routed: CodeStructureUnknown (code-structure.ts:77-80) still carries a prose reason; it is one of the nine wire fields of syzygy-bpyt.1.25.",
        ],
    },
    {
        "finding": "DC-2", "bead": "syzygy-bpyt.6.2 (+6.8, 6.11, 6.12)", "classification": "resolved",
        "target": "One act-fields module and one fail-closed non-human-principal rule, imported by both owner-act validators.",
        "evidence": [
            "[Observed] One NON_HUMAN_PRINCIPAL definition in the population (act-fields.ts:31, the union of both former rules); body-read-authority.ts:52 and walkthrough-judgment.ts:52 import it, and both apply it after isHumanName (body-read-authority.ts:455, walkthrough-judgment.ts:650).",
            "[Observed] PROJECT_IDENTITY, SLUG, ISO_DATE, ACT_IDENTITY, PHRASE, TAG, isGovernancePath, isIsoDate, isHumanName and provenanceFromLabel each have one definition in three-surface-poc-core and the POC app, all in act-fields.ts (non-test git grep -E per name). The other ACT_IDENTITY (public-source-screening.ts:77) is a record-line reader, not the field shape.",
            "[Observed] No other owner validator carries a name rule that could drift: cap1 consent-decision.ts:429 reads a structured actor field, and the consent package-reader pins the literal line 'Owner: Tzeusy' (package-reader.ts:697).",
            "[Observed] Known, routed: the pins harness follow-ups (syzygy-6z5x) and the human-name false positive kept fail-closed (syzygy-bpyt.1.10, pinned by 6.12). Not re-filed.",
        ],
    },
    {
        "finding": "DC-3", "bead": "syzygy-bpyt.6.3 (+6.13, 6.14, 6.15, bpyt.55)", "classification": "resolved",
        "target": "One support module for sha256, deepFreeze, decodeUtf8 and the object predicate; encoders kept apart only on recorded divergence; fence rules recorded per clause.",
        "evidence": [
            "[Observed] Definitions in the 291 non-test files (sweeps.json, two methods agree): sha256 14, of which 1 is @syzygy/support, 1 is cap1-core snapshot.ts:25 (sha256Digest) and 12 are scripts; deepFreeze 2 (support, cap1-daemon source-snapshot.ts:187); decodeUtf8 1; isIsoDate 1 (act-fields.ts:39); isoOf 1 (polaris-dossier iso-of.ts:9); object predicates 5 (support, cap1-core declaration.ts:72, cap1-daemon consent-loading.ts:134, response-identity.ts:131, one script).",
            "[Observed] Every remaining copy is one #530/#548 kept on stated evidence: the cap1 packages import nothing shared; response-identity.ts deletes keys from the narrowed value; scripts have no workspace import. junitDigest (test-artifact-verification.ts:309) is a justified residual under the class-4 import guard (syzygy-bpyt.25 item 8).",
            "[Observed] Strict decoders: 19 BOM-dropping inline constructions outside support and 8 ignoreBOM ones (a different decoder). Against the 20 listed in dc3-decode-and-canonical-json-2026-10-25.json, none is new: project-shape-model.ts:545 left with 6.5, and review.ts:138 moved to review-packet.ts:50 in 57ece1b9 (a pure move). AGENTS.md's figure of 20 is now 19.",
            "[Observed] Three canonical JSON encoders remain (snapshot.ts:37, canonical-json.ts:36, project-shape-manifest.ts:370), kept apart on recorded divergence (canonical-json-divergence.test.ts) as AC 2 allows.",
            "[Observed] Not pinned: support-purity.test.ts guards what the leaf may import and name, but no structural guard fails when a new local sha256, deepFreeze, decodeUtf8 or object predicate appears outside the package and its recorded exceptions. Today's tree has no regrowth; the convergence holds by sweep only (gap G4).",
            "[Observed] Known, routed: isIsoDate calendar read-back syzygy-bpyt.59; site-equivalence selftest syzygy-bpyt.64; support tool follow-ups syzygy-bpyt.25. Not re-filed.",
        ],
    },
    {
        "finding": "DC-4", "bead": "syzygy-bpyt.6.4 (+1.23, 1.25, dkef)", "classification": "partial",
        "target": "Every stage result that yields Unknown carries a typed reason; the casts, the runtime re-validation and the string mapping back to the closed vocabulary disappear.",
        "evidence": [
            "[Observed] Met: closedReason()/isUnknownReason() are gone; no 'as keyof typeof UNKNOWN_REASON_ROUTES' cast remains outside tests; capability-detail.ts no longer redefines UnknownReason; epistemic.ts:42 unknown(closedReason, basis) is the constructor model.ts and work-items.ts use; the type-and-runtime gate is project-shape-model.test.ts:364.",
            "[Observed] Not met: classifySource still maps the reader's detail string back to a reason by string comparison (content-classification.ts:381-391), with a cast to DENIED_PATH_REFUSALS' element type and a fallthrough that turns any unrecognised string into not-a-regular-blob (:391). ObjectReadRecord.detail is string on every outcome (git-object-reader.ts:340), although the refused arm is always a BlobReadRefusalReason (:399) or missing-at-revision/not-a-regular-blob (:609). The bead's evidence named exactly this site; no bead tracks it (gap G3).",
            "[Observed] Not met, owner-answered: the nine served prose-only Unknown fields await syzygy-bpyt.1.25 (owner answer A, after syzygy-1poh).",
            "[Observed] Not met, beyond the nine: four more served Unknown fields carry a prose reason with no closed word: the response-limit population (routes.ts:157, mirrored in served-response-recorder.ts:13 and http-host server.ts:64), the re-evaluation observedProject limb (reevaluation.ts:50), the resource-headroom cost (resource-headroom.ts:35) and each limit observation (resource-ledger.ts:85). syzygy-bpyt.1.25's census returns any further one to the owner (gap G1). The sweep row is single-line, so multi-line Unknown interfaces (code-structure.ts:77) are counted by reading, not by it.",
            "[Observed] Known, routed: PocUnknown literals outside epistemic.ts, the capability-detail.ts:89 cast and the PRODUCER_UNKNOWN_REASONS test gap (syzygy-dkef). Not re-filed.",
        ],
    },
    {
        "finding": "DC-5", "bead": "syzygy-bpyt.6.5 (+q44o, r9x9, 45i4)", "classification": "partial",
        "target": "One bounded blob reader parameterized by phase policy, one refusal set, one GitRunner, one tree listing per evaluation, no exception for budget control flow, no type-only cycle.",
        "evidence": [
            "[Observed] Met for the PWB evaluation: readBoundedBlob (git-object-reader.ts:537) is called by phase B (:413) and phase A (project-shape-observation.ts:360), and it is the only cat-file site in three-surface-poc-core (sweeps.json: 7 non-test cat-file sites, 1 in the core). BLOB_READ_REFUSAL_REASONS (:86) derives both phase vocabularies (:101, :110). project-shape-model.test.ts:449 asserts one ls-tree per evaluation with a counting runner. ParsePassBudgetExceeded occurs 0 times in 597 files. The PWB import cycle is gone; the one cycle left in the core is the model-slice component (sweeps.json importCycles), DC-6's surface.",
            "[Observed] Not met: verbatim-route.ts is a third bounded read of a consented Butlers body with its own runner and order. gitBlobReaderFor (:44-50) runs git cat-file without -C or --no-optional-locks under a 64 MiB buffer and default stdio; the route checks the object id (:105), then the per-source size only after the whole body is in memory (:108), then NUL, an inline strict decoder (:117), secrets and active content. readBoundedBlob bounds a declared size before any byte moves. When Git refuses, git's own stderr line reaches the daemon's stderr (runner-stderr.json: 71 bytes from gitBlobReaderFor, 0 from gitRunnerFor). #595 does not name it (gap G2).",
            "[Observed] Not met, disclosed but unfiled: four Git runners besides gitRunnerFor remain, each with its own flags, buffer, decode and stderr (worker-change-observation.ts:65-71, governance-inputs.ts:196-209, git-observation.ts:28-34), plus the string runGit seam on code structure (code-structure.ts:91). #595 kept them on 'unifying would change outputs'; no bead records which differences are load-bearing (gap G5).",
            "[Observed] The code-structure ls-tree stays a second listing per model build, outside the P1 gate over the unresolved revision (#595 rationale); not a gap.",
            "[Observed] Known, routed: the live-capture differential is owner-run (syzygy-r9x9); phase A ignoring a caller-narrowed envelope is GP-Q0 (syzygy-45i4). Not re-filed.",
        ],
    },
]

GAPS = [
    {
        "id": "G1", "severity": "low", "owner_bound": True,
        "audit_key": "greenfield:reconciliation:R4a:served-prose-unknown-beyond-nine",
        "title": "Owner decision: four served prose-only Unknown fields outside bpyt.1.23's nine (response-limit population, re-evaluation observedProject, headroom cost, limit observation)",
        "parent": "syzygy-bpyt.1", "depends_on": ["syzygy-bpyt.1.25"],
        "gate_species": "the bpyt.1.25 census plus consumer unit rows",
        "expected_test_delta": "+4 ~4 -0 if the owner extends answer A",
        "acceptance": "Owner answer recorded (extend A to these four, or leave them). If extended: each field carries an RFC2-24 closedReason beside the unchanged prose; the census in bpyt.1.25 lists these four and finds no fifth.",
    },
    {
        "id": "G2", "severity": "medium", "owner_bound": False,
        "audit_key": "greenfield:reconciliation:R4a:verbatim-route-blob-read",
        "title": "Verbatim route: read the consented body through readBoundedBlob with a verbatim policy (declared-size bound first, one runner, no git stderr on the daemon's stderr)",
        "parent": "syzygy-bpyt.6", "depends_on": [],
        "gate_species": "behaviour test in verbatim-route.test.ts (oversize declared size refused before cat-file; git stderr not inherited) plus a rule-6 mutant per moved check",
        "expected_test_delta": "+2 ~2 -0",
        "acceptance": "verbatim-route.ts runs no git of its own; refusal kinds and texts and their order are unchanged on the existing cases (an old-versus-new differential over the route's fixtures); runner-stderr.json re-run shows 0 bytes. Any change to which refusal a body gets, or to its text, is GP-Q0 and returns to the owner.",
    },
    {
        "id": "G3", "severity": "low", "owner_bound": False,
        "audit_key": "greenfield:reconciliation:R4a:read-record-detail-typing",
        "title": "Type ObjectReadRecord.detail per outcome and drop classifySource's string re-mapping and cast (content-classification.ts:381-391)",
        "parent": "syzygy-bpyt.6", "depends_on": [],
        "gate_species": "typecheck (exhaustive switch) plus the existing classification suite; one @ts-expect-error row for an untyped refusal detail",
        "expected_test_delta": "+1 ~0 -0",
        "acceptance": "The refused arm's detail is BlobReadRefusalReason | 'missing-at-revision'; no string comparison or cast maps it back; the fallthrough to not-a-regular-blob is gone or provably unreachable; classification outputs byte-identical on the 6.5 differential corpus.",
    },
    {
        "id": "G4", "severity": "low", "owner_bound": False,
        "audit_key": "greenfield:reconciliation:R4a:support-regrowth-guard",
        "title": "Structural guard: no local sha256, deepFreeze, decodeUtf8 or object predicate outside @syzygy/support but a literal list of recorded exceptions",
        "parent": "syzygy-bpyt.6", "depends_on": [],
        "gate_species": "structural census row (one new test file; support-purity.test.ts guards the leaf's own contents, not regrowth)",
        "expected_test_delta": "+1 ~0 -0",
        "acceptance": "The row scans packages/*/src and apps/*/src non-test modules and fails on a definition not in its exception list (the cap1 copies, response-identity.ts, junitDigest); a rule-6 mutant (a new local sha256 in one POC module) is killed; its population and the exceptions match sweeps.json.",
    },
    {
        "id": "G5", "severity": "low", "owner_bound": False,
        "audit_key": "greenfield:reconciliation:R4a:git-runner-options",
        "title": "Git runners: record per runner which option is load-bearing (decode, buffer, stderr, env), and route the rest through one runner factory",
        "parent": "syzygy-bpyt.6", "depends_on": ["G2"],
        "gate_species": "a table test over the runner factory's options; existing suites as oracle",
        "expected_test_delta": "+1 ~3 -0",
        "acceptance": "Each of worker-change-observation, governance-inputs (two), git-observation and the code-structure string seam either builds through the factory with its options stated, or carries a one-line reason beside it; outputs unchanged on fixtures. A changed default (buffer, decode) that alters an output is GP-Q0.",
    },
]


def build() -> str:
    probes = []
    for output, (command, tool) in PROBES.items():
        probes.append({"output": output, "sha256": sha(HERE / output), "command": command, "tool": tool, "toolSha256": sha(HERE / tool)})
    record = {
        "schema": "spec-to-code-reconciliation/1",
        "bead": "syzygy-bpyt.6.6",
        "generation": "gen-1",
        "auditKey": "greenfield:reconciliation:R4a",
        "text": "Evidence record, not authority. Gen-1 reconciliation of greenfield-parity M4a (syzygy-bpyt.6) against findings DC-1..DC-5 of docs/plans/2026-10-21-greenfield-parity-audit.md, run against the codebase at the audited commit rather than against sibling diffs. Generated by tools/build_record.py; do not edit by hand.",
        "audited": {"commit": AUDITED},
        "subjects": [{"path": rel, "sha256": blob_sha(rel)} for rel in SUBJECTS],
        "probes": probes,
        "checklist": CHECKLIST,
        "gaps": GAPS,
        "greenfieldDelta": {
            "population": "non-test .ts/.mts/.mjs/.js/.cjs under packages/, apps/ and scripts/: 291 of 597 tracked files (sweeps.json population)",
            "note": "[Observed] New findings on the M4a surfaces: G1-G5 above, each with an Audit-key. The epic's AC 2 (responseIdentity digests and PWB-REQ-020 per-tuple parity unchanged) rests on the per-PR differentials (#583: 2108 rows, 0 differ; #595: models identical) and was not re-run here; the live capture is owner-run (syzygy-r9x9).",
        },
        "nextGeneration": "Gaps remain (G1-G5), so a gen-2 reconciliation is needed after they land or are answered (limit gen-3).",
    }
    return json.dumps(record, indent=1, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    text = build()
    if "--check" in sys.argv:
        sys.exit(0 if OUT.read_text(encoding="utf-8") == text else 1)
    OUT.write_text(text, encoding="utf-8")
