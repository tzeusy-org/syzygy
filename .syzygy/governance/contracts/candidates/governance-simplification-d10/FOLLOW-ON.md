# D10 — follow-on work (agent-decided, after adoption)

Not done in this package, and not bound by its manifest: after D10 each item
is ordinary agent work, adopted with an `AGENT-ADOPTIONS.md` row and reported
in its pull request. Each item is sized for one bead. F-0 belongs in the
adoption change itself.

## F-0 — Make the battery pass in the adoption change

The recorder installs the files; the same change must then regenerate what
derives from them and fix the checks that pin the old bytes, then run the
battery from `PROJECT-STATUS.md`. Known pins on the replaced files
[Observed: each script names the path]:

- `scripts/check_governance.py`: the installed RFC 0003 and RFC 0005 modules
  no longer match their rows in `ACTIVE-CONTRACT-MANIFEST.txt`, and CC-SPEC
  and CC-IMPACT no longer match their performed digests (the CG-6 and CG-7
  families). Add D10 as the successor link those checks read, or retire the
  checks (F-5).
- `scripts/check_governance.py` registers this package's `MANIFEST.txt`
  `[base]` rows as current act-argument copies only until the act record
  exists (CG-7e); after the act they are history and need a historical
  registration or the check's retirement.
- `scripts/record_polaris_understanding_adoption.py --check` admits a later
  `vision.md` only under a reconciliation raw (its `VISION` constant).
- `scripts/build_dossier_local_agent_acts.py` hashes `doctrine/security.md`.
- Regenerate `DIRECTIVE-REGISTER.md`, the contract index and
  `TASK-ROUTER.md`, and the context fixtures, with their builders.
- Tag the commit `governance-simplification-d10-adopted-<date>`.

## F-1 — One consolidated dossier specification without consent gates

Rewrite REQ-polaris-generation-033 (operator-agent mode) and -046
(launch-time consent), and the public-git-source registry entry, as one
version (SDR-37 no longer binds). Drop: the consented-revision check, the
registry, policy and provider-statement acts, the drawer statement, the D9
and RFC7-20 bind acts, the typed terminal phrase, the write-consent act and
the refusal of non-public repositories. Keep: the pinned revision as a
recorded fact; the run's declared provider in its record; secret screening;
SEC-3's sandbox or attended session, chosen by the agent and recorded.
Supersedes the open v1.7 delta, draft PR #817.

- `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`
- `openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md`
- `.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent-v1-1/`

## F-2 — PWB and Capability 1 consent requirements

Amend PWB-REQ-005 (three owner acts before a body read) and CAP1-REQ-011
(observation consent as a registration precondition) to the declared-source
model, keeping write consent for other people's repositories. Code:

- `packages/three-surface-poc-core/src/body-read-authority.ts` (the Butlers read gate)
- `packages/cap1-core/src/consent-decision.ts`
- `packages/cap1-daemon/src/consent-loading.ts`

## F-3 — `syzygy polaris <url>` runs with no record

Remove the record gates from the dossier path and fix the clone shape.
[Observed: `packages/polaris-dossier/src/polaris.ts`:353 makes the clone by
`git init`, `fetch --depth=1 <url> <commit>` and `checkout --detach
FETCH_HEAD`, so it has one commit, no `origin` remote and no `main` branch;
:364-365 run `preflight`, which must report `ready`; :385 runs `init`.]

- `packages/polaris-dossier/src/preflight.ts`, `init.ts`, `launch.ts`,
  `launch-cli.ts`, `launch-write-consent.ts`, `gate-sources.ts`,
  `reverify.ts`, `source-visibility-gate.ts`, `class-gate.ts`,
  `execution-choice.ts`, `execution-rule.ts` (`PERMITTING_ARM_ENABLED`),
  `polaris.ts` (clone with its remote and default branch, or teach `init`
  to accept the shallow shape), `session-handover.ts` (`CONSENT_RULE`)
- `.claude/skills/polaris-dossier/SKILL.md` (consent and execution text)
- Done when an agent session runs `syzygy polaris <public url>` end to end
  with no consent, statement or registry record present.

## F-4 — Reader identity as a build fact

Replace the registry-entry gate with the build's recorded reader identity
and version (RFC4-3). `packages/polaris-dossier/src/gate-sources.ts`
(`registryEntryUsable`), `init.ts`, `packages/three-surface-poc-core/src/body-read-authority.ts`.

## F-5 — Retire the ceremony machinery

- The 31 `scripts/record_*.py` recorders that existed before this package,
  and this package's recorder once F-0 lands; `scripts/readability_successor.py`
  and the act package builders.
- In `scripts/check_governance.py`: the checks that only police retired
  ceremonies (CG-7a to CG-7h digest copies, CG-6, CG-2e, CG-15, the act
  registries, `CONTRACT_SUCCESSOR_CHAIN`), and the rationale strings that
  quote the old VIS-4 (CG-4, CG-6, CG-16).
- `.syzygy/governance/contracts/candidates/ACCEPTANCE-PHRASE-REGISTRY.yaml`.
- Runtime readers of digest-bound act records:
  `packages/polaris-generation-consent/src/package-reader.ts`
  (`readDigestBoundActState`, `readVersionedSignoffState`) and the act
  readers in `gate-sources.ts`.

## F-6 — Contract clauses superseded but not rewritten here

RFC5-18 and RFC5-18(c) (execution consent), the nine phase rules' owner N/A
judgment (RFC1-33, RFC2-26, RFC3-33, RFC4-30, RFC5-27, RFC6-28, RFC7-38,
RFC8-32, RFC9-52), RFC3-16(a)'s gate list, and the RFC 0003 and RFC 0005
package `README.md` files.

## F-7 — Craft-and-care and process texts

- `policies/craft-and-care/review-and-documentation.md`: CC-REV-1, -2, -4,
  -6 (one independent review, no owner arbitration, no stopping rule).
- `policies/craft-and-care/security-and-secrets.md`: CC-SEC-2, -3, -4
  (folds the open CC-SEC-3 conforming amendment, P-117).
- `contracts/candidates/policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md` and
  `contracts/candidates/HOW-TO-AUTHOR-A-SYZYGY-SPEC.md`: adoption by agent
  row; review as a norm.

## F-8 — AGENTS.md and the skills

Rewrite the hard prohibitions and routing in `AGENTS.md` (the lines listed
in `RETIREMENTS.md` §E), the routing rows for "May I implement X?" and
"Signing off …", `PROCESS-GLOSSARY.md`, and any skill text that restates the
old VIS-4 or the consent rule (`heart-and-soul`, `polaris-dossier`).

## F-9 — PROJECT-STATUS.md

State the regime, the four owner classes and `AGENT-ADOPTIONS.md`; mark
the acts in force as history; trim the battery after F-5.

## F-10 — Open owner-gated work

- Triage every open row of `decisions/PENDING-OWNER-DECISIONS.md`: keep the
  rows in an owner class; decide, record and report the rest.
- Beads labelled owner-gated or owner-decision: unblock or close each one
  outside the four classes. Named in the brief for this package: the gate
  bead `syzygy-fj2q`, and `syzygy-fqlc` with draft PR #817 (fold into F-1).
  [Not re-read here: this worktree's `bd` database lists neither ID.] The
  GP-Q0 beads listed in the 2026-11-17 inventory (`syzygy-bpyt.1`,
  `bpyt.1.7`, `bpyt.1.8`, `bpyt.1.13`, `bpyt.1.25`, `bpyt.1.28`,
  `bpyt.4.20`, `bpyt.8.15`, `bpyt.9.2`, `syzygy-0kq`, `syzygy-kei1`,
  `syzygy-pcdt`) become ordinary fixes, reported.

## F-11 — Withdrawn offerings

Banner the unperformed candidate packages named in `RETIREMENTS.md` §C as
withdrawn by D10, so no session offers them again.
