# Review brief — Polaris dossier local-agent mode, version 1.3

> **Candidate — binds nothing.** This brief says what an independent
> reviewer is given and what they decide. It is not a review and carries no
> verdict. Stopping rule, set before round 1: at most two rounds; CONFIRM,
> or CONFIRM WITH EXCEPTIONS with notes only, clears the bytes; a second
> REVISE goes to the owner with both raws.

## What the reviewer is given, and nothing else

CC-REV-1 calls for a fresh context holding only the artifact, its governing
references and the acceptance criteria. Run on the default model.

**Network.** Do not fetch any content of any external or target repository:
no `gh api` contents, no raw URLs, no clone, no web access. The only network
use allowed is `git fetch` of this repository. Where a criterion turns on
how a browser or a static-site tool behaves, judge from general knowledge and
label it `[Inferred]`.

**The artifact under review.** In
`.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-3/`:

- `proposed/spec.md.patch`, `proposed/design.md.patch`,
  `proposed/proposal.md.patch` (the subject);
- `SEMANTIC-DELTA.md`, `IMPACT-LEDGER.md`, `OWNER-DECISION-PACKET.md` and
  this brief.

Apply the patches to `openspec/changes/polaris-dossier-local-agent-mode/` in
a scratch copy of the commit under review (a `git worktree add --detach` or
a `git clone --no-hardlinks`, then `git apply`), and read the post-apply
bytes beside the v1.2 bytes; `git diff` is the change.

**Governing references.**

- The direction the change carries:
  `.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`.
- The v1.2 sign-off record
  `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`,
  and `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md` in the same
  directory, for how a version is signed.
- RFC2-24 (Unknown reasons), RFC7-2, RFC7-10 (anchor form) and RFC7-20, as
  REQ-polaris-generation-034 cites them; find each by identifier with
  `DIRECTIVE-REGISTER.md`.
- `.syzygy/governance/contracts/candidates/policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`
  and `SEMANTIC-DELTA-TEMPLATE.md`; CC-SPEC-1 to CC-SPEC-11 and CC-IMPACT-1
  to CC-IMPACT-7 in that directory (in force under craft acts 6 and 7; the
  path still says candidate); CC-REV-1 and CC-REV-2.
- Doctrine VIS-1, VIS-2, VIS-3, VIS-4 and SEC-5.
- `AGENTS.md`, "Hard prohibitions" and "Verification rules".
- For the install blocker the ledger names:
  `.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md`
  and `scripts/prepare_three_surface_poc_governedby_reference_recording.py`
  (`governing_inputs`, `governing_input_findings`, `binding_findings`).

You may read the recording tool
(`scripts/build_polaris_dossier_local_agent_mode_v1_3.py`, the changes to
`build_polaris_dossier_local_agent_mode_v1_2.py` and `_v1_1.py` on the same
branch, and the `polaris-dossier-local-agent-mode@1.3` entry in
`scripts/record_versioned_signoff.py`) as evidence of what a sign-off would
install, and the current draft schema and renderer
(`packages/polaris-dossier/src/draft-schema.ts`, `render.ts`) as evidence of
what v1.2 does. Neither is the subject, and the specification must stand
without them. The element implementation is not on this branch.

The reviewer does not receive the drafting conversation, the drafter's
messages to the lead, or any signal of a desired verdict.

## Acceptance criteria

Each is a yes/no question with the evidence that settles it.

1. **Does the change do what the direction authorizes, and nothing more?**
   Each hunk maps to the direction's item 1 or 2, or is a version or status
   line. A hunk that widens a read, egress, write or execution, adds a
   script to a page, or changes what a claim is, is blocking.
2. **Is the claim ledger unchanged?** Does every claim an element can carry
   (a table cell, a callout or details child, a step, a definition, a card
   body) fall under every labelling, citation, quotation and RFC2-24 rule of
   034 and under 035's "every claim block has an entry"? Is any position in
   the design's schema a claim that the spec paragraph does not name?
3. **Are short labels truly presentation?** Is "plain text of at most 120
   characters that names what it heads", with no citation, no quotation, no
   markup and no epistemic label, enough to keep a label from carrying an
   unlabelled claim? Is the residual (that a label states no fact is the
   agent's report, left to review) stated honestly rather than claimed
   closed?
4. **Is the code excerpt Observed only where Syzygy observes it?** Is
   "rendered from the blob it read and verified at the pinned revision, byte
   for byte" consistent with 034's quotation rule ("Observed is reserved for
   a quotation that Syzygy has verified") and its RFC7-10 anchor? Does the
   excluded-blob arm match 034's existing rule, carry none of the blob's
   bytes, and stay off the repair-finding list? Is "at most 60 lines" and
   "lines beyond the blob is a repair finding" checkable?
5. **Is the rendering rule inert and accessible as written?** "no script and
   no change to the pages' content security policy"; header cells scoped;
   tone "stated in its words, never by colour alone"; "no fragment target
   SHALL sit inside a collapsible section". Is any of it open to a reading
   that lets a page run code or hide meaning in colour?
6. **Can each new scenario be falsified as written?** One WHEN/THEN pair, an
   independent oracle, a falsifier arm a wrong implementation would trip.
7. **Does `design.md` agree with the spec, and stay design?** Does the
   schema table match the spec paragraph (kinds, which fields are claims,
   which are labels, the limits), and the delta's quoted copy of it? Is
   "v2 still accepted" consistent with the spec? No implementation code in
   `openspec/**`.
8. **Is the change class right?** The delta says Normative.
9. **Is the impact ledger reproducible?** Re-run its sweep predicate at the
   commit it names and compare every row; re-compute the digests and
   counts; check the install-blocker claim against the P115 recorder's
   source (you may re-run its rehearsal in a scratch clone).
10. **Is the owner packet fair and plain?** Does it state both questions
    with their options and costs, say truly what the recording tool does
    and what the P115 freeze does, and steer no further than labelled
    recommendations?

## Output

A raw review stored verbatim; the lead retains it as
`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-<sha4>-<n>-RAW.md`, where `<sha4>` is
the first four hex digits of the reviewed commit. Its first four non-blank
lines are exactly

```text
# Review R-DOSSIER-LOCAL-AGENT-V1-3-<sha4>-<n> — polaris-dossier-local-agent-mode v1.3
Reviewed commit: <40-hex commit the reviewer read>
Manifest SHA-256: <sha256 of openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md after applying proposed/spec.md.patch to that commit, computed by script>
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
```

with no blank line among them. This package has no manifest; the line
carries the v1.3 subject's digest, which the recorder binds the review by.

Then `## Findings`, each numbered continuously as
`**Finding N — title** (blocking|revise|note)`, with the evidence, and say
for each whether it concerns the patches or the package prose. For
`CONFIRM WITH EXCEPTIONS` every finding must be a `note`.
