# Review brief — public-source screening scope, version 7

> **Candidate — binds nothing.** Not a review; carries no verdict.

## What the reviewer is given

CC-REV-1: a fresh context holding the artifact, its governing references and
these criteria. **Do not read, clone or fetch any target repository, and do not
open any file under a dossier run directory's `site/` or a clone directory;
SEC-2.** Make no dossier run and no provider call.

**Artifact:** every file of
`.syzygy/governance/contracts/candidates/public-source-screening-scope-v7/` and
`scripts/build_public_source_screening_scope_v7.py`, plus its registration in
`scripts/check_governance.py` (search `PUBLIC_SOURCE_SCOPE_V7`), at the commit
named in the dispatch.

**References:** the two directions the semantic delta names; SEC-2, SEC-5;
RFC5-16, RFC5-17; RFC7-33, RFC7-34;
`packages/polaris-generation-core/src/public-source-classification.ts`
(`pageSinkCspFinding`, `EXEMPTION_TEXTS`); `packages/polaris-dossier/src/render.ts`
(`pageSinkUnconfirmed`); `apps/three-surface-poc/src/polaris-generation/page-sink.test.ts`.

## Criteria

1. Does the proposed clause keep what the current one protects: a body's bytes
   cannot execute, nothing loads over a network, and a consumer that cannot
   confirm scans as before? Try to construct a page that passes the clause and
   leaks or runs body bytes, including through inert SVG, DOM clobbering,
   `meta` refresh, `base`, stylesheet `url()`, form submission and navigation.
2. Does the directive list miss one that could reopen a path?
3. Does `csp_finding` read the sentence faithfully? Does every table row and
   selftest mutant fail for the reason it names (rule 6)? Does the install plan
   implement the same reading?
4. Is the script half of the sentence checkable enough to bind, or is it a
   wish? Which limbs would a test or scan really pin?
5. Does the owner packet state the costs plainly and leave nothing out that a
   signer would want?
6. Do the impact ledger's sweeps reproduce?

## Result

First four non-blank lines: the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>`
and `Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. Findings carry
file:line and a concrete failure, labelled `[Observed]`, `[Inferred]` or
`[Unknown]`.
