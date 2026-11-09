# Review brief — Polaris dossier local-agent mode, version 1.6, round 1

> **Candidate — binds nothing.** Instructions for a fresh review.

Review the frozen commit you are given: this directory, and the three subjects
reconstructed by applying `proposed/*.patch` to the installed version 1.5 bytes
under `openspec/changes/polaris-dossier-local-agent-mode/`
(`PROPOSED-SUBJECTS.json`). This is round 1: read the whole package, not only
the changed lines.

Read the governing clauses themselves: VIS-2, VIS-3, VIS-4, CC-REV-2, CC-REV-4,
CC-SPEC-1 to 11; REQ-polaris-generation-033, 034 and 035 in the installed
`openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`;
REQ-polaris-generation-006 as
`openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md`
states it; the owner direction quoted in `SEMANTIC-DELTA.md`, "Warrant"; and the
design note `docs/polaris-generation/fidelity-delta-review-proposal.md`.

Criteria:

1. A confirmation keeps its meaning: no sentence lets a verdict count with an
   entry missing, lets an entry of an earlier verdict count for a later
   revision, or revives a retired verdict. Name any sentence that does.
2. REQ-polaris-generation-035's binding is not weakened: the list is inside the
   packet and its digest, and the rebuild at validation and at render covers it.
   Test the reading of REQ-polaris-generation-033's "rebuilding the review
   packet from the frozen subject", quoted.
3. Each "contract reading" in the delta holds against the clause, quoted; in
   particular that none of the four REQ-polaris-generation-006 sentences it
   names is displaced.
4. The list is fully determined by bytes: which packets carry it, what its base
   is, what it lists, and that no judgement of materiality enters it.
5. Requirements and scenarios agree, each change has a scenario and a
   falsifier, each scenario can be tested, and every label is VIS-2 correct.
6. The "Which form, and why" section is honest: the trade-off, and whether the
   reasons given for not drafting the full delta hold. If you think a full delta
   could be stated without weakening REQ-polaris-generation-035, say how.
7. Design and proposal agree with the spec and overstate nothing; the delta's
   blocks match the patches.

Never read an observed repository body or a run's output. Run no provider call.
Begin your report with these four lines, in this order, no blank line among them:

```
<one title line>
Reviewed commit: <the frozen commit you were given>
Manifest SHA-256: <sha256 of the proposed spec.md, which you compute yourself>
Verdict: <CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE>
```

`Manifest SHA-256` here means the proposed `spec.md` bytes, reconstructed by
applying `proposed/spec.md.patch` to the installed spec (the `proposed_sha256` of
the spec row in `PROPOSED-SUBJECTS.json`, which you re-derive): the recorder
binds your review to that digest, over the first four non-blank lines, and to no
other file's. It is not the digest of the patch file or of this directory. Name
the other two subject digests in the body.
`scripts/record_versioned_signoff.py` also reads a `## Findings` section with
numbered findings, so give one. Findings carry a severity and an anchor. Output
your raw report as your final message.
