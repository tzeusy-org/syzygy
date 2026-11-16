# VET-GP-FOLLOWUPS-4 — round 4 check of syzygy-bpyt.1.15, 1.16 and 1.17 (applied corrections only)

- Subject: `/home/tze/.tmp/user-questionnaire/syzygy-2026-10-27-gp-followups/packet.md`. I re-derived its sha256 by
  `sha256sum`: `a6654ce665ee091bebebb78ff8141eefe6d9d5a4db074fc5e5e0c167e43a53a4`, 282 lines, matching the brief.
- Round 3: `VET-GP-FOLLOWUPS-3.md`, sha256 `35f629a568e5dab5fa4e239c37ce4055a9d8d71e5f9a0eafb920b99dc0b68d41`, against packet
  `0968c3fd`.
- Scope of this round, under the stopping rule: the six applied corrections, the 1.17 relabel, and the added round-3 record lines.
  Nothing else was re-opened.
- Rules kept: read only; no observed-repository body; no credential file; no bd mutation; no fetch.

| Item | Scope | Recommendation |
|---|---|---|
| `syzygy-bpyt.1.15` | Pass | Pass |
| `syzygy-bpyt.1.16` | Pass | Pass |
| `syzygy-bpyt.1.17` | Pass | Pass |

### 1. The six new texts [Observed]
- A script reads round 3's six Old/New blocks from `VET-GP-FOLLOWUPS-3.md`. In the packet at `a6654ce6`, each New string
  occurs exactly once (1, 1, 1, 1, 1, 1), and each Old string occurs zero times.
- So 1.15 M1–M3, 1.16 M1 and 1.17 M1–M2 sit in the packet byte for byte as written.

### 2. Nothing else changed [Observed]
`r4/reconstruct.py` reverses exactly the changes the brief names:
- the six New→Old swaps;
- the relabel back to `- **[Observed]** npm links`;
- the three header lines back to "… (vet-gp, 2026-10-27); corrected, re-review pending";
- the three added five-line round-3 record blocks removed.

It yields sha256 `0968c3fd641cbda1fe49e9b75f6b86c63e05bf57a4d4eb9e95e5850a63cf6026`, the round-3 packet, byte for byte
(`True`). So the packet carries no other change.

### 3. The 1.17 relabel [Observed]
The relabel is accurate. Line 216 now reads "[Inferred, from the testkit comment `:67-69` and the #541 raw §3.5; not probed for
this packet]". Both named sources exist and say what the bullet relies on:
- the #541 raw (`rev-541/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-1-RAW.md`, sha256 `dd2a4517…`) has "### 3.5 The comments: npa and npm"
  (`:156`), and at `:339`, "[Observed, §3.5, cases 7 and 8] npm links every workspace into `node_modules` under its own name";
- `973965a8:workspace-reach.testkit.ts:67-69` states the bare directory-spec reading.

The workspace-linking half was observed by the #541 reviewer, not here, so [Inferred] for this packet is the conservative and
correct label.

### 4. The round-3 record lines [Observed]
- Header lines 17, 129 and 208 give round 3 as "Pass / Revise", "Revise / Pass" and "Pass / Revise". These match round 3's
  table for 1.15, 1.16 and 1.17.
- The record blocks at `:99-103`, `:180-184` and `:258-262` cite `VET-GP-FOLLOWUPS-3.md` with the correct sha256.
- Their verdict words match, and their summaries are faithful to round 3's findings:
  - 1.15: the three false sentences;
  - 1.16: the "Every option closes" sentence;
  - 1.17: the `overrides` gap and the overclaim, plus the relabel note.

### Verdicts
- 1.15. Scope: Pass. Recommendation: Pass. M1–M3 are applied exactly; round 3 found no other defect.
- 1.16. Scope: Pass. Recommendation: Pass. M1 is applied exactly.
- 1.17. Scope: Pass. Recommendation: Pass. M1–M2 are applied exactly, and the relabel is accurate.

All three items pass both verdicts, so under the stopping rule they go to the owner.

### Kept files (coordinator scratchpad `vet-gp/`)

| File | sha256 |
|---|---|
| `r4/reconstruct.py` | `1feccf1c6cd8b90643af11aef458300bb75c79d9326f467a3e4e7d694e37981b` |
