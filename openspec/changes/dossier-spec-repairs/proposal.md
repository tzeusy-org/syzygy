# Dossier spec repairs — version 2.8

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit, no change to secret detection or SEC-5's fail-closed rule (the derived-record repair adds a refusal and removes none; the check-record bound only lets a record Syzygy wrote be read, and bounds one reader that had none), no foreign repository, no exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.72: at version 2.7's caps the stored `manifestFacts` member can exceed the 4 MiB (4,194,304-byte) limit under which `latestPassedDraft` (`packages/polaris-dossier/src/review-packet.ts`, line 37) reads a check record (`SUBJECT_JSON_LIMITS`), so a large or hostile tree makes review report no passed draft. The implementation's own test measures 5,628,441 and 7,164,441 bytes; this package measures a wider form at 9,782,162 (`design.md`).
- [Observed] syzygy-3efd.67: `derived/rev-<n>.json` lies in the agent-writable run directory. A record that passes every reading rule of `readDerivedRecord` (`derived-record.ts`: exact rebuild, own repository, identity and rule forms, the screen's secret test) can name a non-secret top-level directory the tree does not hold; the render finds it stale and shows the name, labelled Unknown, under "Derived by Syzygy", and publishes it in `derived-structure.json`. That is agent text in the computed region.
- [Observed] syzygy-3efd.68: version 2.4 defines the ledger's deep-dive page name per UTF-16 code unit, and `reading-ledger.ts` follows it (`/[^A-Za-z0-9_.-]/g`), while the renderer (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`, line 96) replaces per code point (`/gu`): one astral character gives `__` in the ledger and `_` in the rendered path.
- [Observed] syzygy-3efd.71: version 2.5 says a v7 graph diagram is checked byte for byte as in v6, while its figure-kind paragraph requires a `figure-kind` finding where a graph diagram lacks `nodes` or `edges`, where v6 reports a `schema` finding at the member's path.

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Every reader of a draft check record reads it under 16,777,216 bytes, 2,000,000 values and depth 16; the `manifestFacts` member at its caps is stated to take fewer than 10,000,000 bytes. No cap changes.
- A derived-structure record is readable only where every fact's rule and version are `top-level-unit` version 1 and every path its `top-level-unit` and `contains` facts name is a `top-level-unit` path of the render's own re-derivation; otherwise nothing of it is drawn, listed or published.
- Byte and outcome changes: the derived region, `machine.json` and `derived-structure.json` of a run whose derived record fails that rule; the whole site, review packets and close for a passed run whose check record takes more than 4,194,304 bytes, now read where they were refused; the end-screen counts for a run holding an unreadable check record; and the ledger's page name for an astral deep-dive identity (`design.md`).
- The reading ledger's deep-dive page name replaces each code point outside `A-Z`, `a-z`, `0-9`, `_`, `.` and `-` with one `_`, the renderer's rule.
- The v7 graph byte-identity sentence is qualified: missing `nodes`/`edges` and carried v7 members report the `figure-kind` findings already stated.
- Five scenarios added, one scenario's WHEN line narrowed, and the four Form lines extended.

Every other sentence and scenario of REQ-034 is carried unchanged (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No cap, screening rule, detector or policy changes; no draft schema or brief version change; no change to the region's words or reason codes; no binding of the derived record by a digest held outside the run directory; no bound on the check record's other members (`design.md`, residuals).
