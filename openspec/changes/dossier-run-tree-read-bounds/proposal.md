# Dossier run-tree read bounds — version 2.18

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule (no screening, detector or policy is touched; every bound added refuses a read, never admits one); no foreign repository; no exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.80, found by version 2.14 (`dossier-infrastructure-recognizers/design.md`, "The reader rule for four more files"): reads of agent-writable run-tree files that belong to requirements other than REQ-034 still take the whole file with no bound before the read, or a `stat` and then a whole read. A FIFO at such a path blocks the reader, a symbolic link to a device exhausts its memory, and a file grown after its `stat` is read whole.
- [Observed] A sweep of every whole-file read in `packages/polaris-dossier/src/` and `apps/three-surface-poc/src/polaris-generation/` (89 sites over 119 files at `c900e871`, two methods agreeing) finds 40 such reads, of files stated by REQ-polaris-generation-033, -035 and -048 (`design.md`, "The sweep and its denominator").
- [Observed] The bead names the candidate requirements of `polaris-dossier-one-command-run/` (040 to 044 there) for the supervisor; none is adopted. The supervisor's command, `syzygy polaris <url>`, is stated by the adopted REQ-polaris-generation-048, so its own state file is bounded there.

## What changes

[Observed] Three MODIFIED requirements, complete text in `proposed/polaris-generation/spec.md`, each gaining one paragraph, its scenarios and a clause on each of its four Form lines that carry verification:

- REQ-polaris-generation-033 ("Operator-agent authoring mode", after version 2.17): `run.json` under 65,536 bytes, `steps.jsonl` and `credential-breaches.jsonl` under 16,777,216 each, the credential list under 65,536, `execution-choice.json` under 8,192 and `record.json` under 16,777,216, with every reader of `run.json` named and the words where each outcome is seen, and a step or breach log that stands at its path but cannot be read recorded by close as Unknown, never as empty; three scenarios.
- REQ-polaris-generation-035 ("Fresh-context review in the operator-agent mode", after version 2.1): the verdict review check is given and every frozen verdict and frozen inventory revision under 4,194,304 bytes; the review check, prompt, launch-form and delivery records under 262,144; a waiting session's inventory brief under its own size, a round's `delivery.json` under 65,536, its `packet.json` under the size the run directory's delivery record of that round states (that record read first) and its `packet.sha256` under 78; each rendered page file the design packet reads under what remains of the site's 67,108,864 bytes; three scenarios.
- REQ-polaris-generation-048 ("Declared URL dossier supervisor", after version 2.1): the supervisor's state file under 16,777,216 bytes, read once per command, and a named run never started afresh over a state it cannot read; one scenario.

[Observed] Every other sentence and scenario of the three requirements is carried byte for byte. 39 requirements; the effective scenario total grows by seven.

## Non-goals

[Inferred] No change to what a regular file within its bound yields, to any written or rendered byte but the close record's two log members for a log that stands at its path and cannot be read, to close's listing and digests of stored files (version 2.14's `readFileAsSized` rule), or to any screening. No new bound on a file whose writer has no cap other than a readers' bound stated as such. `launch.json`'s readers, which no product code calls, are left as residuals. REQ-034 is not touched.
