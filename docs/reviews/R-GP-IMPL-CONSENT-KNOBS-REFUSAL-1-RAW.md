# R-GP-IMPL-CONSENT-KNOBS-REFUSAL-1 — CC-REV-1 review of PR #640 (consent act-family knobs aligned toward refusal)
Verdict: REVISE
Reviewed commit: e8450656f5a7f8e4f23b3e28c3494161f52bc03b
Subject: PR #640

- Bead: `syzygy-bpyt.1.24` (review task `syzygy-pkym`). CC-REV-1 classes 1 and 4.
- Authority: `.syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md` item 6 (`consent-withdrawal-knobs`, answer A): "Align every knob toward refusal wherever one family refuses a world another accepts; stop and return if any family's verdict over the current `decisions/` tree changes". Excluded: no act record edited; `syzygy-bpyt.1.8` unchanged.
- Subject bytes: `packages/polaris-generation-consent/src/package-reader.ts` sha256 `bdf7bdb4ce94c102a743de1903067b20da43826c0906b02ef87c55496df782b5`; `act-families.test.ts` sha256 `af3aa1b3fa69c56a464672676050acbbefd225f5b6a4a53dd8c60e8589ec0c91`. Base reader at `e1f43f7c9ca2c2643473157372dbee3850f1c04a` sha256 `c14405e416bf54b406475f1fe61a527eb932896f70be278d9c325182a7617028`. PR merge-base `22238200b8bd69e927530d6f6b89c59c12515b62`; `e1f43f7c..22238200` changes no file under `packages/polaris-generation-consent/` or `.syzygy/governance/decisions/` [Observed].
- Method: detached scratch worktrees at the base and the head, `npm ci`, `tsc -b` of the consent and dossier packages, then the reviewer's own scripts (not the author's `verdicts_over_tree.mjs`).

## Verdict basis

One revise finding (F1): knob 2 (the citation allowlist) was aligned toward the *accepting* family for the policy family, and a constructed world shows the policy reader moving from refusal at the base to acceptance at the head. The PR's, the code comment's and the test comment's claim that this "only adds a refusal" is false. It changes no answer today because `CITATION_ALLOWLIST` is empty, so the stop condition held; but the direction is the opposite of answer A, and the false comment is what a reviewer of the first allowlist entry would rely on.

## Checks

1. Verdicts over the current tree — unchanged [Observed].
   - Reviewer script `/tmp/r640/tools/verdicts.mjs` (scratch, deleted): walks every export of the consent index and `polaris-dossier/dist/gate-sources.js` for an object with `file` and `stems` (8 forms found: `LOCAL_AGENT_GIT_SOURCE_SIGNOFF_FORM`, `REGISTRY_GIT_SOURCE_ACT_FORM`, `D9_ACT_FORM`, `DRAWER_FORMS.redis-redis`, `PROVIDER_V2_FORM`, `RFC7_20_RULING_ACT_FORM`, `STATEMENT_FORMS.redis-redis.0.form`, `.1.form`), reads each with `readDigestBoundActState` or `readVersionedSignoffState`, plus the admission reader, policy reader, `readPolicyActChain`, `readClassActState`, `readInForceEgress`, the admission records port (3 kinds × 3 repository ids) and `createPackageGateSources` (`registryEntry`, `screeningPolicy`, `d9`, `rfc720Ruling`, `repositoryIdsFor`, `consentAbsenceFor`, `consentedRevisionsFor`), at five instants (2026-10-08T09:30Z, 2026-10-22T12:00Z, 2026-11-03T12:00Z, 2026-11-04T12:00Z, 2026-11-04T23:59Z). Each answer is compared as its whole JSON, not state and `why` only.
   - 155 answers per run. Base readers vs head readers over the head checkout's decisions tree (191 tracked files): **0 of 155 differ**. Same over a checkout of `origin/main` (`22238200`, the same decisions bytes): **0 of 155 differ**.
   - The population is not vacuous: per run 24 `ok` form reads, 16 `absent`, 18 `ok` gate reads, 2 `refused` gate reads, 14 satisfied and 31 unsatisfied port answers, policy chain `ok` at 3 instants and `refused` at 2, class act `ok` at all 5.
   - Second method: the author's record `docs/evidence/syzygy-bpyt-1-24/verdicts-over-tree-2026-11-04.json` also reports `verdictsChanged: []` over 17 reads; its `readerAfter.packageReaderSha256` equals the head bytes above.
2. Direction of the corpus differential — every recorded mismatch is a refusal on the new side [Observed].
   - `act-family-differential-2026-11-04.json`: 1426 mismatches. New labels by prefix: `throws AdmissionRecordError: invalid-records` 519, `refused: invalid-records` 455, `identity=; admitted=kind=refused; reason=permissio…` 275, `ok=false; why=no screening policy is in force: inv…` 177 — total 1426, all refusals. 0 mismatches in kinds `base` or `base-reduced`.
   - Correction to the PR body's framing: 12 mismatches fall in kind `real-file` (worlds 4883, 4950, 5017: a real decisions file with the policy path appended). These are mutated worlds, not the current tree, and each is refusal → refusal with a different reason; the "0 in the base worlds" claim is true as stated.
   - The corpus cannot see F1: the allowlist is a code constant and every corpus world runs with it empty.
3. No act record edited; nothing under `.syzygy/**` or `openspec/**` changed (`git diff --name-only e1f43f7c e8450656 -- .syzygy openspec`: 0 files). `syzygy-bpyt.1.8` is open, last updated 2026-10-21, and the diff still reads records by fields: no byte-exact template, digest pin or recording-tag blob is introduced [Observed].
4. Gates at the head, in the scratch worktree: `npm run typecheck` exit 0; `vitest --project unit` 165 files, 3618 / 3618; `vitest --project integration packages/polaris-generation-consent packages/polaris-dossier` 21 files, 1492 / 1492; `python3 scripts/check_governance.py` 32 OK, 21 WARN, 0 FAIL. `gh pr checks 640`: `node`, `node (unit)`, `node (integration)`, `node (e2e)` pass; `checks` pending when read [Observed].
5. Reviewer rule-6 mutants (8, distinct from the author's 13), each a single-occurrence replacement in `package-reader.ts`, run with `vitest --project integration` over `act-families`, `package-reader`, `real-tree`, `digest-bound-act` and `decisions-sweep` tests (447 tests), file restored and byte-checked after each:

   | id | old | new | outcome |
   |---|---|---|---|
   | R1 | `if ([...text.matchAll(other)].length !== 0) return refuse();` | `… .length > 1) return refuse();` | killed (2) |
   | R2 | the whole-line `Provenance state: … — state \(1\),` `one(...)` line | deleted | killed (1) |
   | R3 | `fields: everyField([CLASS_MODULE, CLASS_STEM]) }` | `fields: everyField([CLASS_STEM]) }` | killed (2) |
   | R4 | `fields: everyField([POLICY_PATH, POLICY_STEM]), withdrawal` | `fields: everyField([POLICY_PATH]), withdrawal` | killed (6) |
   | R5 | `loose: /^\s*act instant\b/gim }` | `loose: /^act instant\b/gim }` | **survived** |
   | R6 | `swept = sweepText(fs, root);` | `swept = async (_rel: string, text: string) => text;` | killed (7) |
   | R7 | the `A1 audit-record identity …` `one(...)` line | deleted | killed (2) |
   | R8 | the `Owner: Tzeusy` `one(...)` line | deleted | killed (4) |

## Findings

### F1 (revise) — knob 2 aligned toward acceptance for the policy family; the "only adds a refusal" claim is false

- Before, the policy family swept a decisions file's whole text; the other families set aside an allowlisted file's exact tooling citations first. Answer A's refusal side is the whole-text sweep. The PR instead gives the policy family the set-aside (`findActRecords`: `swept = sweepText(fs, root)` for every family).
- The justification (code comment above `PACKAGE_DIRS`; the test comment above the citations `describe`; the PR body's knob table row 2) is that no citation can carry a policy-family needle because `carriesId` drops every name carrying the policy or scope stem. That holds for a citation *alone*, not for a citation *adjacent* to text: `stemFolds` reads whitespace and `_` as `-`, so text `public-source scope_check.py` folds to `public-source-scope-check.py` and carries `public-source-scope`, while `scope_check.py` carries no ID needle and is a citation whenever `scripts/scope_check.py` exists.
- Constructed world [Observed]: a copy of the head tree's `.syzygy/` and `scripts/`, plus an empty `scripts/scope_check.py`, plus `decisions/REVIEWER-NOTE.md` containing `The check is public-source scope_check.py here.`, with an allowlist entry for that file's exact sha256 patched into both trees' compiled `citation-allowlist.js` (restored afterwards):
  - base `readPolicyActChain` → `refused invalid-records`; base policy reader → throws `invalid-records`;
  - head `readPolicyActChain` → `ok`; head policy reader → the V5 act;
  - control, head without `scripts/scope_check.py` → `refused invalid-records`.
- So the knob is not monotone: the set-aside both adds refusals (the PR's joined-stem row) and removes them (this world). Neither "all families sweep whole text" nor "all families set aside" is a superset of both; only reading both (a family names the act when either the whole text or the set-aside text carries a needle) is toward refusal against every prior family.
- Impact today: none on any answer — `CITATION_ALLOWLIST` is `new Map([])` at the head, so `withoutCitations` never runs and the stop condition is not engaged. A union reading would therefore also change no verdict over the current tree. Whether the union, which makes the allowlist unable to set aside anything a whole-text sweep would refuse, is the intended outcome is for the author to state; if it makes the allowlist pointless, that consequence may be an owner question, but the PR's current choice is a loosening and cannot stand under answer A or GP-Q0.
- Repair: make knob 2 refusal-ward (or keep the policy family's whole-text sweep), correct the three sentences, and add the world above as a row whose base answer refuses.

### E1 (exception) — evidence names commits reachable from no ref

- `knob-mutants-2026-11-04.json` names `7f37e83bbc0437d9cd9730a4eee2614891302a44`; `verdicts-over-tree-2026-11-04.json` names `readerAfter.commit` `4d4351f6b951bdabf938d15ecceb4eb71f0f10c7`; the differential's new tree is `5d889636d7a455e3df8a5d04da465f3a0dd16eef`. None is an ancestor of the head or contained in any ref (`git for-each-ref --contains`, empty for each; `git ls-remote origin`, 0 hits for each) — pre-rebase commits. Each record also carries the reader's sha256, and that equals the head's `package-reader.ts` bytes (`bdf7bdb4…`, confirmed with `git show <commit>:…| sha256sum` for `7f37e83b` and `5d889636`), so the records remain re-checkable by digest (rule 11). The PR body's "run at `7f37e83b`" and "new `5d889636`" should say they are unreachable and anchor on the digest, or the records be regenerated at the reviewed head.

### N1 (note) — the indented other-label instant line is unpinned

- Mutant R5 survived: the new rule "any line under the label this family does not read refuses" reuses the loose regexes, and no test exercises an indented `  Act instant:` line in a `Recorded at (UTC)` family's record (or the converse). Add one row.

### N2 (note) — the policy-stem exclusion is an owner question, correctly routed but mis-framed

- Judgment: the exclusion is a sound application of answer A's stop clause, not of a reading that the stem "is needle identity rather than a reading knob". The policy family names the act by a needle set the other families do not mirror (every other family's stems count in text; the policy stem does not), so a world carrying only the policy stem in text is one family-shape accepts and another refuses: by answer A's own words it is a knob. Aligning it changes the current tree's verdict (the author's probe: policy reader throws, chain refused, port public-source-policy unsatisfied) [Inferred from the author's report; the reviewer did not re-run that probe], so answer A says stop and return — which the bead comment of 2026-11-03 does.
- What the owner must decide is two things, not one: whether the policy stem is a knob at all, and whether the stop clause halts only the knob that trips it (the PR's reading) or the whole alignment. The PR body and the test row should cite the stop clause as the reason, not a reclassification.

### N3 (note) — the PR body's citation of `e1f43f7c` as base

- GitHub's base for the PR is `22238200`; the evidence uses `e1f43f7c`. The two trees agree on every consent-package and decisions file (check 1), so the comparison stands, but the body should say why the older commit was used.
