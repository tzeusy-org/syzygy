# R-SOURCE-POLICY-SUCCESSOR-1 — fresh-context review of the declared-source policy successor and REQ-046 2.5
Subject SHA-256: cbaa85e0288905c946bac3002507e24bf24384e4dd67c4a4c4133804852b8dfc (policy) · af95060f5b73fdb5fe4f8f8726ab30e4f57bc45e71bb940de8146a99bbb72ccb (spec)
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-22

## Subject

[Observed] I computed the digests with `sha256sum` in `/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-3efd.24`:

| File | Computed | Matches brief |
|---|---|---|
| `.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json` | `cbaa85e0…dfc` | yes |
| `openspec/changes/dossier-declared-source-reach/proposed/polaris-generation/spec.md` | `af95060f…ccb` | yes |
| `…/SEMANTIC-DELTA.md` | `38561e71…28c` | yes |
| `…/design.md` | `8572f1eb…153` | yes |
| predecessor `…-v1.json` | `516cb1f2…499` | equals `successor.predecessor.sha256`; unchanged against HEAD |
| predecessor spec `dossier-declared-source-model/…/spec.md` | `d17dad15…040` | equals the SEMANTIC-DELTA subjects table |

Method:
- [Observed] I diffed v1 against v2 as structured JSON with a Python walk over every key and list.
  - No predecessor field is removed.
  - No detector (`detectors`, `scopeDetectors`), `matchAction`, `unclassifiableExclusion`, `activeContentClassification`, `codeContentExemption`, `accessBoundary` or `rawBodyHandling` value changes.
  - The changed text fields are `policyVersion`, `status`, `projectDocumentationExemption.appliesTo`, `secretRedaction.appliesTo`, `indeterminate`, `notMapped`, `detectors` (the scope string), `sourceVisibility.unchanged`, `sourceAdmission.deniedPaths` and `pathRuleScope`.
  - Added: 19 basenames, 8 suffixes, 6 `deniedDirectoryNames`, 3 rules with ids, `withheldTokens`, `vendoredDirectoryNames`, `classDecision`, `configurationDetectors` and `successor`.
  - Every count in the semantic delta and design matches.
- [Observed] `docExcludedTokens` (25) is exactly `governanceTextTokens` (16) plus `withheldTokens` (9), with no overlap.
- [Observed] I compiled every new pattern in Node and ran samples and timing tests (findings F1, F2).
- [Observed] The current `screen.ts` refuses v2 and fails closed:
  - `codeContent.length !== 1` → "its code-content sourceExtensions are unreadable";
  - `readProjectDocumentationRule` → "appears more than once";
  - `readGovernanceTextRule` → "appears more than once".

## Findings

### F1: blocking. `config-credential-key` takes quadratic time (catastrophic backtracking)
- **Where:** policy `publicSourceScope.configurationDetectors.detectors[0].pattern`:
  `"[A-Za-z0-9_.-]*(?:password|passwd|pwd|…)[\"']?[ \\t]*(?:[:?+]?=|:)…"`
- **Evidence:** [Observed] In Node, one `test()` over a run of `a` characters of length n took:
  - 119 ms at 10,000;
  - 1,867 ms at 40,000;
  - 29,420 ms at 160,000.

  `'password'` repeated to 160,000 characters behaves the same (29.7 s).
  - [Inferred] The cause is the unanchored leading `[A-Za-z0-9_.-]*`. At every start offset it consumes to the end of the run and then backtracks through every position.
  - [Inferred] The every-offset sticky matcher (`compileEveryOffsetMatcher`, `secret-redaction.ts`) and the agent-text screen pay the same cost.
  - [Unknown] Whether a per-blob size limit bounds it: I found none for target blobs in `polaris-dossier/src`.
  - Any repository the operator points at can stall screening with one long identifier or token run in a `.json` or `.yaml` file.
  - The other five new patterns stayed linear in my tests (`hcl-secret-variable-default` took 185 ms at 160 k of repeated `variable "token" {`; `netrc` took 1 ms).
- **Repair:** Drop the leading quantifier, which never decides whether a match exists, or bound it (`{0,64}`). Bound any suffix quantifier the same way (see F2). [Observed] My repaired form, quoted in F2, took 1 ms on 160 k `a` and 12 ms on 160 k of repeated `password`. Add a timing fixture to the code half.

### F2: blocking. `config-credential-key` misses the commonest configuration secret keys
- **Where:** same pattern; `configurationDetectors.consequence`.
- **Evidence:** [Observed] None of the policy's detectors matches any of these lines:
  - `secret_key: "hunter2hunter2xyz"`
  - `SECRET_KEY_BASE: abcdef0123456789` (the Rails `config/secrets.yml` form)
  - `db_password_prod: hunter2hunter2`
  - `password_hash = "abcdefghijkl"`
  - `github_token_classic: abcdefgh12345`
  - Docker `{"auths":{"r.io":{"auth":"dXNlcjpwYXNzd29yZA=="}}}`

  The pattern lets characters come before the keyword but not after it, and `auth` alone is not a keyword. This hits exactly the population Stage 2 newly admits: `.yml`, `.yaml` and `.json`.
  - `secrets.yml`, `secrets.yaml`, `credentials.yml` and `credentials.yaml` are not denied basenames.
  - A Docker `config.json` outside a `.docker/` directory is not denied.
  - [Inferred] So a body that v1 excluded as indeterminate and that holds a Rails `secret_key_base` is admitted and sent.
  - The consequence text ("a key such as secret_access_key or private_key … Residuals: a secret under a key none of these names") leads a reader to believe that compound keys containing `secret` are covered.
  - It also says only "a value that opens with $, &lt; or &gt;" escapes. In fact any `$`, `&lt;`, `&gt;`, quote or whitespace inside the value breaks the run of 8, so `a$b$c$d$e$f$g$h` escapes too.
- **Repair:**
  - Allow a bounded suffix after the keyword and add `auth`:
    `(?:password|…|auth[_-]?token|auth)[A-Za-z0-9_.-]{0,64}["']?[ \t]*(?:[:?+]?=|:)[ \t]*["']?[^\s"'&lt;&gt;$]{8,}`.
    [Observed] This matched all six cases above and the spec's two scenario lines, and stayed linear.
  - Add `secrets.yml`, `secrets.yaml`, `secrets.toml`, `credentials.yml`, `credentials.yaml` and `credentials.toml` to `deniedPathBasenames`.
  - Correct the consequence text to state the residuals as they actually are.

### F3: blocking. Run-on and camelCase names admit withheld-category documents and misfile design documents
- **Where:** policy `project-documentation-extended.rule` ("words are split … at each character in docTokenSeparators") and `governance-text-by-name.rule`; spec paragraph 7 ("This requirement admits no word of `withheldTokens`").
- **Evidence:** [Inferred, from the rule text]
  - `SecurityPolicy.md`, `CodeOfConduct.md` and `CODEOFCONDUCT.md`, at the root or at any depth, fold to a single word that is in neither token list. `prose-document` therefore places them in `project-documentation`. Under v1 each was indeterminate (not root-document, not docs-tree).
  - `rfc0001.md`, `adr0001.md`, `DesignDoc.md`, `ArchitectureOverview.md` and `pep-0008.rst` become `project-documentation`, not `governance-text`.
  - Two of v2's own texts say otherwise:
    - `notAdoptedFromTheOption[1]`: "governance, policy, security, conduct, doctrine and principle records are not named, so they stay indeterminate, and admitting them is asked of the owner".
    - D2/D4: design documents are governance-text, "never project-documentation".
  - [Observed] `screen.ts` already records this residual for v1's `docs/` tree ("one that runs on into other characters (`docs/rfc0001.md`) is admitted as project-documentation"). v2 extends it to every depth and to the root, and does not disclose it.
  - The effect is egress-relevant: it settles Q-1 for a whole population of names before the owner answers, and it moves governance-class text into a class with a different egress posture.
- **Repair:**
  - In Stage 2, test `withheldTokens` as substrings of each folded segment. This fails closed and over-withholds harmlessly.
  - Make `project-documentation-extended` refuse a segment containing a long governance stem as a substring (`design`, `architecture`, `decision`, `specification`, `manifesto`). That leaves such paths indeterminate rather than misclassified.
  - Short stems (`spec`, `adr`, `rfc`) cannot be used as substrings (`inspect`, `respect`). State that residual explicitly in the policy and in `design.md`.

### F4: blocking. "Committed reports" are said to be indeterminate but `prose-document` admits them
- **Where:** policy `contentClassification.indeterminate` ("…notebooks (.ipynb), committed reports, … is indeterminate") against `project-documentation-extended.pathRules[0]` ("a path of any number of segments whose final segment ends with one of proseExtensions").
- **Evidence:** [Inferred]
  - `reports/2026-q3-audit.md`, `benchmarks/results.rst` and `docs/build-log.txt` (the last through `docs-tree-text`) are placed in `project-documentation`.
  - RFC5-14 puts reports and logs in `evidence-content`, which this scope never classifies.
  - The URL overlay's `baseFieldInterpretation` also says "no repository report/work-history file becomes newly admitted".
  - The policy contradicts itself in a normative field, so implementations will diverge (criterion C), and it places content outside option A ("documentation") into the wrong class (criterion B).
- **Repair:** Either add report tokens (for example `report`, `reports`, `results`, `benchmark`, `benchmarks`, `log`, `logs`) to a Stage-2 exclusion list, or correct `indeterminate` and `notMapped` to say that reports in a prose extension are placed as project-documentation, and add that residual to the design.

### F5: non-blocking. The "predecessor outcomes preserved" exception is too narrow for the spec's own scenarios
- **Where:** spec paragraph 3 ("with one exception: a path one of whose directories is named in … `deniedDirectoryNames`"), Scenario "Predecessor outcomes preserved", and the Falsifier ("…changes outcome, other than by a new denied directory").
- **Evidence:**
  - [Observed] `screen.ts` returns `unknown-extraction-class` for `.npmrc`, `kubeconfig.yaml`, `x.tfvars` and the like under v1.
  - [Inferred] Under v2 it returns `denied-path`.
  - The Observable compares "each path's class or exclusion reason under both policy versions". So the scenario "Credential paths denied before any read" is a falsifier hit under the literal text.
  - [Inferred] No v1-admitted path matches a new basename or suffix (none ends in a source extension or names a root stem or placement). The change is only in the exclusion reason.
- **Repair:** Widen the exception to "a path a new denied basename, suffix or directory names (its reason becomes denied-path; v1-admitted paths change only through a directory)".

### F6: non-blocking. The URL-overlay rebasing sentence is inaccurate
- **Where:** spec paragraph 2: "the base is version 2.0.0, whose detectors, denied paths and exclusions are the predecessor's with entries only added".
- **Evidence:**
  - [Inferred] Exclusions are not "only added": Stage 2 removes indeterminate exclusions, which is the point of the change.
  - [Observed] The overlay itself says:
    - `scope`: "frozen declared-source2.0 policy bytes remain unchanged";
    - `species[0].classes`: "no new source path, file type or object admitted".
  - A reader can take both as pinning v1's admission population for URL mode.
- **Repair:** Say "detectors and denied paths only gain entries; admission widens by Stage 2". Either state explicitly that URL mode admits Stage-2 bodies, or keep URL mode on v1 until an overlay successor names v2 by `reviewedSha256`.

### F7: non-blocking. Option-A interpretation choices are decided, not surfaced
- **Where:** `design.md` D4 ("decision read as the D in ADR"); `governanceTextTokens` includes `decision` and `decisions`.
- **Evidence:**
  - The option as quoted names "design, architecture, ADR, RFC, spec, manifesto". `decision(s)` admits `decisions/` directories and `decision-log.md`, which are not ADRs.
  - [Inferred] RFC5-14 does class "decision text" as `governance-text`, so the class is right, but whether option A covers it is an interpretation.
  - D4 states it as settled, while design.md's Authority section says "each place it would admit more would [need the owner], and there is none".
  - Separately, directory-word matching sends RSpec `spec/fixtures/*.md`, `packages/design-tokens/README.md` and `spec-helper/README.md` to `governance-text`. That is lawful by rule (RFC5-14: "the declared policy decides each file") but not their true class.
- **Repair:**
  - Add a Q-2 to design.md asking the owner whether `decision(s)` is within option A, or drop the token until answered.
  - Disclose the directory-word misplacements as residuals.

### F8: non-blocking. Admitted reach is overstated for languages, proto and MDX
- **Where:** `code-content-extended.languageExtensions`, `configurationExtensions` (`.proto`); `design.md` D7.
- **Evidence:**
  - [Inferred] Stage-2 bodies get no active-content exemption, which is correct for criterion A.
  - The Markdown profile reads generics and comparisons (`List&lt;Int&gt;`, `map&lt;string, int32&gt;`, `a&lt;b &amp;&amp; c&gt;d`) as HTML tags. The predecessor's own `codeContentExemption.rule` says so.
  - Most `.scala`, `.kts`, `.cxx`, `.hh`, `.dart`, `.mts`, `.cts`, `.proto` and MDX bodies will therefore be excluded as active content.
  - D7 drops `.vue`, `.svelte` and HTML for this reason but keeps these. Its re-measurement gate is described over tree metadata, which cannot see body-level exclusion.
- **Repair:**
  - Do not extend the exemption; that would breach criterion A.
  - Say in D7 and in the policy consequence that these are largely nominal.
  - Make the code-half re-measurement count screened outcomes per extension, not just paths.

### F9: note. Small accuracy items
- [Observed] SEMANTIC-DELTA "Specification: carried unchanged" says every predecessor line appears "byte for byte or as the prefix of a line that appends text". This is false for the three `warrants` lines (`contracts`, `decisions`, `parent_requirements`), whose new entries come before the closing `]`, and for the dropped trailing blank line. They are listed under Modified, so only the sentence is wrong.
- [Observed] design D8 "[Observed] Each pattern … 16 positive and 18 negative samples (… scratch test, not a fixture)" names no retained record or subject digest (AGENTS rule 11), so it cannot be re-checked. Label it Inferred or retain it.
- `secretRedaction.appliesTo` still says agent text "is screened as before". It is now also screened by `configurationDetectors`; say so.
- `kubernetes-secret-kind` misses `kind: Secret  # comment`, because the lookahead allows only `,`, `}`, a line end or end of input.

### F10: note. `nested-root-document` with the empty suffix places extensionless files anywhere
- **Where:** `project-documentation-extended.pathRules[1]` together with `documentSuffixes` `""`.
- **Evidence:** [Inferred] `bin/changes`, `src/app/history` and `tools/news` (scripts or data with no extension) become `project-documentation`.
- **Repair:** Low impact. Restrict this path rule to non-empty suffixes or to the docs roots, or disclose it.

### F11: note. Implementability
- [Observed] The current code fails closed on v2, as SEMANTIC-DELTA "Displaced texts" says.
- [Inferred] Today `redactBody(body, contentClass(path), …)` keys redaction on the class alone. v2 requires the Stage-1 or Stage-2 provenance to reach both the redaction and the exemption decisions (`secretRedaction.appliesTo`, `projectDocumentationExemption.appliesTo`). Otherwise a Stage-2 `project-documentation` body would wrongly be retained as `redacted-span`.
- `tasks.md` and design §"What the code change must do" item 3 imply this but should name it as a test: "a Stage-2 project-documentation body with one credential-assignment match is excluded whole, not redacted".

## What I checked and accept

- **A:**
  - [Observed] No predecessor detector, scope detector, denied entry, exemption list, redaction field or private-metadata rule is removed or narrowed.
  - [Observed] Both new `appliesTo` texts name only Stage-1 bodies.
  - [Inferred] No Stage-2 body can end in an `exemptExtensions` extension, because Stage 1 places every such path first.
  - [Inferred] Configuration detectors over agent text only add refusals.
  - [Inferred] Apart from the gaps in F2, F3 and F4, nothing that v1 excluded is admitted outside option A.
- **B/C:**
  - [Inferred] The `classDecision` precedence (Stage 1, then the vendored check, then three rules, with two matches → indeterminate) is deterministic.
  - [Inferred] The claim that `governance-text-by-name` and `project-documentation-extended` are disjoint by construction holds, since `governanceTextTokens` ⊂ `docExcludedTokens` over the same word scope.
  - [Inferred] Collisions between the new rules (`Dockerfile.md`, `Dockerfile.design.md`) correctly fall to indeterminate.
- **D:**
  - [Observed] The MODIFIED REQ-046 carries the predecessor text in order.
  - [Observed] The scenarios are concrete, and the oracle is fixture literals.
  - [Observed] Owner adoption is claimed only for decision `pursuit-2026-11-21-source-reach`, and the boundary is quoted as the brief gives it.
  - I did not read the bead itself: no `issues.jsonl` export exists in this checkout or the main one, and I ran no `bd` command.
- **E:**
  - [Observed] All counts match: 19 basenames, 8 suffixes, 6 directories, 6 detectors, 25 source extensions, 3→11 scenarios, the 7 basenames and 4 suffixes kept.
  - Q-1 is surfaced.
  - [Unknown] The 35-file blast-radius figure was not re-derived.

## Concrete risks that remain even after repair

1. Secrets that no detector matches (an encoded or split value, a value shorter than 8 characters, an unlisted key) in newly admitted YAML, JSON, TOML or HCL are sent. This is the general SEC-5 residual, now over a much larger configuration population.
2. Encrypted secrets (SOPS bodies are partly caught; Ansible Vault ciphertext is not) are admitted as code-content.
3. Directory-word classification will misfile some test and design-system documentation.
