# Dossier reading ledger, shape packs and thesis basis — version 2.4

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class (no doctrine edit, no change to secret detection or SEC-5's fail-closed rule, no foreign repository, no exposure, release or multi-user use).

## Why

- [Observed] Reading movement between runs is invisible. `packages/polaris-dossier/src/reader-advice.ts` computes the counted reader standards (RS-13, RS-14, RS-16, RS-17, RS-19) and its own header says the advice is "never the stored check record"; figure fit (version 2.2) is the only measure a check record keeps. Two runs of one repository can only be compared by impression (bead syzygy-3efd.21; pursuit 2026-11-21 Q11 slice 2).
- [Observed] The brief asks every repository to explain itself as a networked server: the reader standards' RS-11 lists seven technology dimensions, among them networking, state and persistence and concurrency, and an architecture dimension phrased as "how the product is deployed and divided (server and clients, ...)" (`reader-standards.ts`, RS-11). A library or command-line tool is asked about deployment and wire protocols (bead syzygy-3efd.43; Q9 slice 1).
- [Observed] Where a repository states no purpose, the brief's only answer is an `unknown` block on the why topic (`brief.ts`, `BRIEF_TOPICS`), which leaves the landing page's opening empty for most thin-documentation repositories (bead syzygy-3efd.56; Q13, pursuit move I3-M4).

## What changes

One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- A reading ledger, `readingLedger` in `checks/rev-<n>.json`, per narrative page the draft lays out on: prose words (RS-19's count), reading minutes at 200 words a minute, figures, advisory counts per counted standard, and figure-fit counts; check's report adds `readingDifference` against the previous run of the same repository identity in the state root, computed and never stored, Unknown when there is none.
- Shape packs (`polaris-dossier-shape-pack/1`): versioned data under `packages/polaris-dossier/src/shape-packs/` supplying RS-11's dimensions. `default@1` is always selected and drops the server-only dimensions; `server@1` is selected by a new trait rule `server-entry` version 1 and restores today's seven dimensions byte for byte. The brief record names the packs, their digests and why.
- Draft schema `polaris-dossier-local-draft-v6` with a required `thesisBasis` (`stated`, `code-reading`, `none`); a `thesis-basis` repair finding; on `index.html` a Syzygy-written line before a code-reading introduction; brief `polaris-dossier-brief-v11`.

Every other sentence and scenario of REQ-034 is carried unchanged (SEMANTIC-DELTA.md). Provider mode is unaffected.

## Non-goals

No gate: the ledger never fails a run and no difference is stored. No metric beyond those check already computes, figure fit included. No comparison across repositories. No CLI or library pack (syzygy-3efd.44), no recognizers, no question packs, and no change to the owner-set reader topics, the worked examples or the provider profile's requested assets. No derived citation roles beyond the existing structure-record rules, no maintainer-voice advisory, and no listing of external documentation (the rest of syzygy-3efd.56 and pursuit move I3-M4). No new read, no change to secret screening, the screening policy, review or readiness.
