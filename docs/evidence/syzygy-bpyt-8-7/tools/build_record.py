#!/usr/bin/env python3
"""Write reconciliation-gen1.json for syzygy-bpyt.8.7 from the findings below and the probe outputs beside it.

Evidence record, not authority. Digests are computed here (rule 3), never typed: each probe output and each audited
source file is hashed at the commit named in `audited.commit`, which must be HEAD of a clean tree.

    python3 docs/evidence/syzygy-bpyt-8-7/tools/build_record.py            # write
    python3 docs/evidence/syzygy-bpyt-8-7/tools/build_record.py --check    # exit 1 if the file differs
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parents[1]
OUT = HERE / "reconciliation-gen1.json"
AUDITED = "542bf94ef12ce46f5eb701690f3be3bb7e944457"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def blob_sha(rel: str) -> str:
    return hashlib.sha256(subprocess.run(["git", "-C", str(ROOT), "show", f"{AUDITED}:{rel}"], check=True, capture_output=True).stdout).hexdigest()


PROBES = {
    "cli-reach.json": "node docs/evidence/syzygy-bpyt-8-7/tools/reach.mjs . apps/syzygy/src/main.ts",
    "island-importers.json": "node docs/evidence/syzygy-bpyt-8-7/tools/island-importers.mjs .",
    "wait-mode-probe.json": "npx tsc -b packages/polaris-dossier && node docs/evidence/syzygy-bpyt-8-7/tools/waitprobe.mjs \"$PWD\" <scratch>",
    "leadin-differential.json": "npx tsc -b packages/support packages/polaris-generation-core && node docs/evidence/syzygy-bpyt-8-7/tools/leadin-diff.mjs \"$PWD\" <scratch>",
}

SUBJECTS = [
    "packages/polaris-generation-core/src/island-boundary.test.ts",
    "packages/polaris-generation-core/src/live.ts",
    "packages/polaris-dossier/src/brief.ts",
    "packages/polaris-dossier/src/cli.ts",
    "packages/polaris-dossier/src/argv.ts",
    "packages/polaris-dossier/src/outcome.ts",
    "packages/polaris-dossier/src/preflight.ts",
    "packages/polaris-dossier/src/status.ts",
    "packages/polaris-dossier/src/waiting-sessions.ts",
    "packages/polaris-dossier/src/polaris.ts",
    "packages/polaris-dossier/src/index.ts",
    "packages/polaris-generation-consent/src/package-reader.ts",
    "packages/polaris-generation-core/src/closed-schema.ts",
    "packages/polaris-generation-core/src/quote-locate.ts",
    "packages/polaris-generation-core/src/quote-fidelity.ts",
    "packages/polaris-generation-core/src/dossier-page-scan.ts",
    "apps/three-surface-poc/src/polaris-generation/dossier-render.ts",
    "apps/three-surface-poc/src/polaris-generation/dossier-site.ts",
]

CHECKLIST = [
    {
        "finding": "PD-1", "bead": "syzygy-bpyt.8.1 (+8.19)", "classification": "partial",
        "target": "The live dossier path depends on no provider-mode module; the parked island is self-contained (deletable in one step).",
        "evidence": [
            "[Observed] Independent reach from apps/syzygy/src/main.ts (tools/reach.mjs, its own resolver, not workspace-reach.testkit.ts): 169 modules, 0 unresolved workspace specifiers, 0 of the 20 listed island modules, neither package root (polaris-generation-core/src/index.ts, polaris-generation-consent/src/index.ts). Agrees with island-boundary.test.ts.",
            "[Observed] Step 1 met: dossier-profile.ts, reader-questions.ts, generation-source.ts and local-render.ts import topics.ts, source-model.ts and draft-model.ts; none imports dossier-evaluation.ts or provider-draft.ts.",
            "[Observed] Step 2 met: brief.ts:41 holds DOSSIER_GUIDANCE as a literal; 'changed shape' occurs in no brief or prompt module (git grep -F, packages/ and apps/).",
            "[Observed] Step 3 met on the live path only: dossier-site.ts:417 renderLocalDossier takes its own LocalDossierRenderInput. The provider renderer dossier-render.ts:27-38 and :97-99 keeps the result?/local? XOR; the CLI never loads it. Moving the renderer is syzygy-qkea.19.",
            "[Observed] Not met: the island is not closed. Outside the 20 listed modules, 11 of 286 non-test modules under packages/, apps/ and scripts/ reach an island module (island-importers.json). Beyond the two package roots, the parked consent-ports.ts, a run-key.ts and a synthetic-source.ts that take live names through the core root, one script and an evaluation entry, four provider-only modules depend on the island and are imported by nothing live: dossier-main.ts (imports dossier-trigger.ts), dossier-render.ts and dossier-render-main.ts (PipelineResult; dossier-trigger.ts imports dossier-render-main.ts, a cycle across the list's edge), public-source-screening.ts (imports repo-corpus.ts). Deleting the 20 listed modules would break them. island-boundary.test.ts checks only reach from the CLI entry, so nothing pins closure (gap G2).",
            "[Observed] Known, routed: prompts.ts stays in core ./live and no CLI-path module calls promptForStage or ILLUSTRATION_HEADING (git grep, non-test). The 8.19 ruling (N7) recorded it on syzygy-bpyt for the next audit (syzygy-bpyt.10, GP-Q8). Not re-filed.",
        ],
    },
    {
        "finding": "PD-2", "bead": "syzygy-bpyt.8.2", "classification": "partial",
        "target": "One command table, one parseArgs wrapper, one context builder, one Outcome<R, F>.",
        "evidence": [
            "[Observed] cli.ts:261 DOSSIER_COMMANDS is the table; argv.ts:46 readArgv wraps node:util parseArgs and is the only argv reader in apps/syzygy/src and packages/polaris-dossier/src (sweep: process.argv|argv[|parseArgs|readArgv|.shift(), non-test): main.ts:71, cli.ts:452, :465, polaris.ts:137. broker-client.ts:13-15 forwards argv untouched with one includes('--stdin'); that is by design (it has no package imports), and the broker's --submit is confined at waiting-sessions.ts:491-492.",
            "[Observed] One deps builder (cli.ts:227 ctx.deps). resolvePathIntent has one definition (state-directory.ts:43), imported by main.ts:41.",
            "[Observed] Not met: Outcome<R, F> (outcome.ts:2) is used by 13 modules, but three step results keep the hand-written {ok, report} | {ok: false, reason} shape: preflight.ts:32 PreflightResult, status.ts:63-65 StatusResult, waiting-sessions.ts:246 (delivery). The CLI builds their refusal objects at cli.ts:267 and :431 (gap G6).",
        ],
    },
    {
        "finding": "PD-3", "bead": "syzygy-bpyt.8.3 (+8.27)", "classification": "resolved (kept as justified)",
        "target": "Remove the permanently-true wait-mode gate, after a premise check.",
        "evidence": [
            "[Observed] The premise was false and the gate stays (8.3 close reason); waitModeStatus is at waiting-sessions.ts:122-139. syzygy-bpyt.8.27 (open) runs the default-binding mutant.",
            "[Observed] New, from diffing this reader against package-reader.ts's versioned sign-off reader: the gate opens on a sign-off record dated 2099 (wait-mode-probe.json, row dated2099 = signed; negative control, Version altered = unsigned). readVersionedSignoffState refuses a future instant (package-reader.ts:898), but signoffRecordHolds (waiting-sessions.ts:76-91) and appliedSubjectHolds (:100-114) read no date and run no withdrawal sweep. An appended 'Withdrawn:' line also leaves it signed [Inferred: whether a version-tagged sign-off can be withdrawn is not defined here]. Gap G1; making the gate refuse it changes what the gate accepts (GP-Q0), so it goes to the owner.",
        ],
    },
    {
        "finding": "PD-4", "bead": "syzygy-bpyt.8.4", "classification": "resolved",
        "target": "The admission, policy (v1-v4) and class act families become form rows run by one parser and one sweep.",
        "evidence": [
            "[Observed] Admission, policy and class are rows (package-reader.ts:35 ADMISSION_ACT_FORMS, :334 POLICY_ACT_FORMS, :213 CLASS_ACT_FORM, :549 REGISTRY_GIT_SOURCE_ACT_FORM), read by one parseActRecord (:705), swept by one namesAct (:644) through one findActRecords (:668).",
            "[Observed] Residue outside the file: the wait-mode sign-off gate (waiting-sessions.ts:76-139) is a sixth act reader with no row, and it diverges (G1). It reads a byte-exact recorder's output, so GP-Q0 part 2 forbids moving it onto field parsing. Only a template row (VersionedSignoffForm) or the owner can change it.",
            "[Observed] Open children 8.21, 8.25, 8.26, 8.28 and 8.29 carry the remaining consent-reader work; not re-filed.",
        ],
    },
    {
        "finding": "PD-5", "bead": "syzygy-bpyt.8.5", "classification": "partial",
        "target": "One schema builder and checker; one leaf util; the listed copies folded.",
        "evidence": [
            "[Observed] One schema module: closed-schema.ts:53 check and :60 checkShape. Builders are defined nowhere else in the five roots, and only closed-schema.ts (2) and draft-schema.ts (1, its wrapper) carry additionalProperties:false or $schema (non-test sweep).",
            "[Observed] Leaf util: 0 local sha256 definitions, 1 isoOf (iso-of.ts:9), 0 named record-test definitions. 2 inline createHash('sha256') remain: render.ts:326 takes raw digest bytes and redis-shaped-measure.ts:91 streams; both are justified. BLOB_MODES is defined once (git-object-reader.ts:80).",
            "[Observed] Falsified: the PR #597 sweep said '0 local record tests'. polaris.ts:455 and :466 test typeof === 'object' && !== null && !Array.isArray inline instead of calling @syzygy/support isRecord (gap G5).",
            "[Observed] Not folded: two HTML entity decoders, dossier-page-scan.ts:12-18 decodeHtmlText and quote-fidelity.ts:51-55 decodeEntity. They differ: page-scan decodes &#0; to U+0000 and caps the digits at 7 decimal or 6 hex; fidelity leaves &#0; literal and caps nothing (gap G4).",
            "[Observed] Not folded: two lead-in quotation readers, quote-locate.ts:134 scanLeadIns (used by check-derive, render, review-verdict, design-review) and quote-fidelity.ts:175 quotedSpans (checkDraftQuotes or inspectBlockQuotes; used by the provider pipeline, dossier-site for provider views, and evaluateDossier). leadin-differential.json, over 89,719 synthetic texts: of 2,375 the fidelity check passes, 1,693 get a different span list from the render reader, and in 113 the render reader yields a span the check never verified. The readers differ on a curly open quote after the lead-in and on a straight quote earlier in the block. [Inferred] Impact is bounded: on the live local path dossier-site never calls checkDraftQuotes (quoteFindings: null, dossier-site.ts:139-141), and render throws on a quotation that is neither verified nor excluded. Merging the readers changes check outcomes (GP-Q0) (gap G3).",
            "[Observed] The list/text value-reader copies (check-model.ts:206-207, close.ts:87, design-review.ts:28-29, execution-flags.ts:44, ...) are syzygy-wrih (open); not re-filed.",
        ],
    },
    {
        "finding": "PD-6", "bead": "syzygy-bpyt.8.6", "classification": "resolved",
        "target": "The barrel exports the two CLIs; subpaths are documented; split files are under 500 lines.",
        "evidence": [
            "[Observed] index.ts:3-4 exports runDossierCli and runPolarisCli only. package.json lists 12 subpaths and README.md:15-30 documents the same 12.",
            "[Observed] Every script dist/ import of polaris-dossier (git grep -o polaris-dossier/(dist|src)/*.js|ts outside the package) names a module that is a listed subpath.",
            "[Observed] Split files, in lines: check.ts 294, check-derive.ts 366, check-model.ts 209, review.ts 338, review-model.ts 114, review-packet.ts 210, review-verdict.ts 117, inventory.ts 390, run-dir.ts 77, dossier-evaluation.ts 248, dossier-manifest.ts 71, dossier-page-scan.ts 157. All are under 500.",
            "[Inferred] dossier-evaluation.ts statically imports the script-only dossier-reader-test.ts, so the CLI loads it through ./live. Not provider code, so not filed.",
        ],
    },
]

GAPS = [
    {"id": "G1", "severity": "medium", "owner_bound": True, "audit_key": "greenfield:reconciliation:R5:wait-mode-gate-instant",
     "title": "Owner decision: the wait-mode sign-off gate opens on a future-dated sign-off record (no instant check, unlike readVersionedSignoffState)",
     "parent": "syzygy-bpyt.1", "depends_on": [], "gate_species": "unit test in waiting-sessions.test.ts plus a rule-6 mutant", "expected_test_delta": "+2 ~0 -0 if the owner chooses refusal",
     "acceptance": "Owner answer recorded. If refuse: waitModeStatus refuses a record whose date or recorded instant is after now, with the reason vocabulary of package-reader.ts:898; wait-mode-probe.json row dated2099 reads unsigned."},
    {"id": "G2", "severity": "low", "owner_bound": False, "audit_key": "greenfield:reconciliation:R5:island-closure",
     "title": "island-boundary.test.ts: pin island closure (only island modules, roots, tests, scripts and named parked modules import the island); list dossier-main, dossier-render, dossier-render-main, public-source-screening",
     "parent": "syzygy-bpyt.8", "depends_on": ["syzygy-bpyt.8.23"], "gate_species": "structural guard (widen island-boundary.test.ts, no parallel test)", "expected_test_delta": "+1 ~2 -0",
     "acceptance": "The ISLAND list carries the four modules (24, or 25 with consent-ports.ts recorded as parked). A new row fails when a non-island, non-test, non-root module imports an island module. A rule-6 mutant (one live module importing dossier-trigger.ts) is killed. island-importers.json, re-run, shows no non-listed importer but the roots, scripts and listed exceptions."},
    {"id": "G3", "severity": "low", "owner_bound": True, "audit_key": "greenfield:reconciliation:R5:lead-in-readers",
     "title": "Owner decision: two lead-in quotation readers (quote-locate scanLeadIns vs quote-fidelity quotedSpans) disagree on curly and stray quotes",
     "parent": "syzygy-bpyt.1", "depends_on": [], "gate_species": "differential (leadin-diff.mjs) plus unit rows in quote-locate.test.ts", "expected_test_delta": "+3 ~0 -0",
     "acceptance": "The owner chooses one rule (or keeps both with the difference recorded where they are defined). leadin-differential.json re-run under the chosen rule shows 0 check-passing texts with a render difference."},
    {"id": "G4", "severity": "low", "owner_bound": True, "audit_key": "greenfield:reconciliation:R5:entity-decoders",
     "title": "Two HTML entity decoders (decodeHtmlText vs quote-fidelity decodeEntity) differ on &#0; and digit bounds: fold or record why they differ",
     "parent": "syzygy-bpyt.8", "depends_on": [], "gate_species": "unit rows beside the surviving decoder", "expected_test_delta": "+2 ~0 -0",
     "acceptance": "Either one decoder with an owner-approved &#0; rule (GP-Q0, since it changes the evaluation or check text), or a comment at both definitions naming the other and the difference, pinned by one test row each."},
    {"id": "G5", "severity": "low", "owner_bound": False, "audit_key": "greenfield:reconciliation:R5:polaris-record-test",
     "title": "polaris.ts:455 and :466: call @syzygy/support isRecord instead of the two inline plain-object tests",
     "parent": "syzygy-bpyt.8", "depends_on": [], "gate_species": "none new (existing polaris tests; behaviour-preserving)", "expected_test_delta": "+0 ~0 -0",
     "acceptance": "The sweep regex typeof X === 'object' && X !== null && !Array.isArray over the 117 non-test files of the five PD-5 roots returns 0 hits; the polaris suite passes unchanged."},
    {"id": "G6", "severity": "low", "owner_bound": False, "audit_key": "greenfield:reconciliation:R5:outcome-stragglers",
     "title": "preflight, status and delivery results onto Outcome<R, F>, building their refusal objects in the step rather than in cli.ts",
     "parent": "syzygy-bpyt.8", "depends_on": [], "gate_species": "existing CLI golden and cli-table tests (stdout and stderr byte-identical)", "expected_test_delta": "+0 ~0 -0",
     "acceptance": "No hand-written {ok: true; report} union remains outside outcome.ts (sweep stated). CLI stderr and exit codes are identical over the CLI test corpus."},
]


def build() -> str:
    head = subprocess.run(["git", "-C", str(ROOT), "rev-parse", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    record = {
        "schema": "spec-to-code-reconciliation/1",
        "bead": "syzygy-bpyt.8.7",
        "generation": "gen-1",
        "auditKey": "greenfield:reconciliation:R5",
        "text": "Evidence record, not authority. Gen-1 reconciliation of greenfield-parity M5 (syzygy-bpyt.8) against findings PD-1..PD-6 of docs/plans/2026-10-21-greenfield-parity-audit.md, run against the codebase at the audited commit rather than against sibling diffs. Generated by tools/build_record.py; do not edit by hand.",
        "audited": {"commit": AUDITED, "recordWrittenAt": head},
        "subjects": [{"path": p, "sha256": blob_sha(p)} for p in SUBJECTS],
        "probes": [{"output": k, "sha256": sha(HERE / k), "command": v, "tool": f"tools/{v.split('tools/')[1].split()[0]}",
                    "toolSha256": sha(HERE / "tools" / v.split("tools/")[1].split()[0])} for k, v in PROBES.items()],
        "checklist": CHECKLIST,
        "gaps": GAPS,
        "greenfieldDelta": {
            "population": "non-test, non-testkit .ts under packages/polaris-dossier/src, polaris-generation-core/src, polaris-generation-consent/src, apps/syzygy/src, apps/three-surface-poc/src/polaris-generation: 112 files (117 non-test files less 5 testkits)",
            "physicalLines": 20775, "cliReachableLines": 16267, "unreachableShare": "21.7%",
            "note": "[Observed] Physical lines, a different metric from the audit's source and declaration lines (18,999; 28%), so not comparable as a trend. New findings on these surfaces: G1-G6 above; each carries an Audit-key.",
        },
        "nextGeneration": "Gaps remain (G1-G6), so a gen-2 reconciliation is needed after they land or are answered (limit gen-3).",
    }
    return json.dumps(record, indent=1, ensure_ascii=False) + "\n"


if __name__ == "__main__":
    text = build()
    if "--check" in sys.argv:
        current = json.loads(OUT.read_text(encoding="utf-8"))
        fresh = json.loads(text)
        current["audited"].pop("recordWrittenAt", None); fresh["audited"].pop("recordWrittenAt", None)
        sys.exit(0 if current == fresh else 1)
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")
