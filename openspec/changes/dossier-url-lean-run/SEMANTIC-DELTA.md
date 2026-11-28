# Version 2.46 semantic delta

[Inferred] Agent-decided amendment under VIS-4. This file says what changes against the URL dossier 2.1 texts. Every count and title below was read from the bytes by script (the two block parsers of `scripts/check_spec_reconciliation.py`), not transcribed.

## Change class

Normative: two MODIFIED requirements, REQ-polaris-generation-025 and 047, in one home (the specification). No ID, name, Source line or Scope line changes.

## Composition

[Observed] Predecessor: `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md` (URL dossier 2.1, row A-14, tag `polaris-dossier-url-declared-source-run-v2.1`; sha256 `e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865`). Successor: `openspec/changes/dossier-url-lean-run/proposed/polaris-generation/spec.md` (sha256 `a867d5d743d22b22072519eae52b532d6e6afdc131f4132f3377927f5bae66d6`).

## 025 — Provenance-bound source policy

[Observed] Scenarios: 14 to 6. Requirement paragraphs: 18 to 3, of which 0 are carried byte for byte.

Scenarios whose title is carried (6): "Composite classification cannot be derived"; "Declaration is present but committed policy is invalid"; "Observed source supplies a permissive policy"; "Partial redaction retains usable support"; "Excluded content reaches a diagnostic boundary"; "Provider revoked with an existing challenge".

Scenarios whose title is gone (8): "Complete request screening catches composed secrets"; "Ordered design checks preserve full and actual request projections"; "Canonical tool receipt cannot be forged or replayed"; "First request is not the scaffold baseline"; "Ingest excludes before any later request"; "Audit persistence failure prevents transmission"; "Runtime classes do not silently widen the core declaration"; "Fixed protocol controls have distinct received and sent identities".

New scenario titles (0): none.

## 047 — Trunk-tip revision pinned at launch

[Observed] Scenarios: 24 to 6. Requirement paragraphs: 16 to 6, of which 0 are carried byte for byte.

Scenarios whose title is carried (0): none.

Scenarios whose title is gone (24): "Non-main remote default without records"; "Explicit remote selector and tag"; "Unsupported selector or malformed advertisement"; "Remote moves after selection"; "Supplied clone does not match"; "Unsafe locator is not emitted"; "Source metadata detector canary"; "Acquisition timeout and cleanup failure"; "Acquisition disk and process limits are distinct"; "Strict SHA-256 shape only"; "Local entry remains strict"; "Source provider declaration precedes helper and selection"; "Complete source metadata is screened before send"; "Source connect audit failure prevents native advertisement"; "Source fetch audit failure prevents protocol transmission"; "Native source profile cannot acquire extra egress authority"; "Source transport capture scope is honest"; "Entire admitted closure precedes source storage"; "One required excluded blob refuses the whole owned acquisition"; "Commit tree and alias metadata are screened too"; "Pack delta and closure mismatch cannot become a stored pack"; "Unsupported memory transport never falls back to fetch"; "Interruption cannot retain unadmitted acquisition input"; "Supplied clone retains its separate exclusion boundary".

New scenario titles (6): "Trunk pinned with no record"; "A named reference resolves once"; "A remote that needs a credential"; "Remote moves after the pin"; "Operator's clone"; "Operator's git configuration takes no part".

## What the removed text was

[Inferred] In 025: the URL host relay for every inference request, the fixed protocol-control projection, the tool-use receipts, the design-delivery envelope, the prompt-template registry and the protected audit before each send. In 047: the locator grammar, the source-transport provider declaration, the native Git protocol profile, the bounded pack decoder, the all-admitted acquisition gate, the acquisition record and the cleanup rules. None of it was implemented (`proposal.md`).

## Known gap: cross-references left dangling (owned by `syzygy-k54o.3.4`)

[Observed] Effective REQ-polaris-generation-033 (scripted benchmark grading 2.30 and step measures over it), 035 and 048 (2.1, 2.18) still carry clauses scoped to 048's URL-supervised form and references to 047's "memory-only complete-admission-before-write gate", 025's checked relay, canonical tool receipts and audit, and source-operation captures "under 025/047". 2.46 removes those referents. [Inferred] The form they describe was never built, before or after 2.46; 047 now says so in its last paragraph, and that those clauses apply to no run until a later version restates 033, 035 and 048 (bead `syzygy-k54o.3.4`).

## SEC-5 reading (review R-K54O3-LEAN-SPEC-1 finding 1)

[Inferred] 025 keeps "before every ingest into any store, surface or endpoint … secret policy SHALL be applied". 047's fetch writes the run's clone unscreened. 2.46 reads the clone as the raw input of SEC-2's accepted exception D11 (doctrine `security.md`: the authoring session "reads the raw clone … tracked, untracked or ignored files, and git metadata alike"), not as a Syzygy store, and says so in both requirements; every Syzygy store, surface or endpoint written from the clone stays screened. The same raw clone was already made on main before 2.46 (by the operator from preflight's commands, or by `syzygy polaris`'s consent-gated fetch), so no new unscreened store is introduced. Should the owner read D11 more narrowly, this reading is the owner's to veto (SEC-5 is owner-class).
