# Owner direction — answers to the held-review questionnaire of 2026-11-15

Date: 2026-11-15

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15`

This is a plain owner direction in the sense of `PROCESS-GLOSSARY.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It signs no specification version. Dossier v1.7's sign-off stays an owner
  act through `scripts/record_versioned_signoff.py`.
- It grants no consent, starts no run, body read or provider egress, and
  releases no merge. Each authorized round and merge still passes its own
  review and merge gates.

## How the answer was given

[Observed by the coordinating session.] A Claude Code session prepared a local
questionnaire of nine items over `origin/main` `ba803ec8`. The PR heads were:

- #817 `abe36cd9`
- #769 `0f8f0298`
- #640 `6d2970c1`
- #652 `5a124080`
- #514 `937a7e93`
- #714 `cba689c2`
- #585 `3c30b2e2`
- #776 `b957c7a4`

One independent fresh-context vetter reviewed it over four rounds, and the
last passed every item on scope and on recommendation. The session served the
packet as a token-gated web form at a tailnet address and ingested the
owner's submission.

- Submitted: 2026-11-15T09:31:10+00:00, by "owner via questionnaire web form
  (token-gated, from 100.87.181.125)", as the form recorded it.
- The owner answered all nine items by picking one presented option each,
  with no edits or notes, and answered yes to applying them now.
- [Inferred] That the operator of that form is the owner.
- The packet is a scratch file outside this repository and is not authority.
  Its sha256 after its records were filled is
  `353edbc04960be0d5833e7beed9604e634a7b15ec0f03d13badfd2bae1f05510`.
- Eight picks were the form's recommendation. Item 8 was not.

## The answers

### `fnry19-round4` — answer B

Picked: "B. Round 4; F3 adds RFC7-12 to REQ-034's warrants".

- Dossier local-agent mode v1.7 (`syzygy-fnry.19`, PR #817) gets one last
  scoped review round.
- The drafter repairs round 3's findings F1 to F3 only.
  - F3 adds RFC7-12 to REQ-034's warrants, so `GOVERNING-DEPENDENCIES.md`
    changes at install.
  - Round 3's notes 4, 5, 7 and 8 are carried, not repaired.
- Round 4 passes only on `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes
  only. Any other verdict returns to the owner.
- Excluded:
  - no sign-off of v1.7;
  - the round-3 finding-6 readings, which are "every quotation" narrowed to
    exclude code excerpts and the RFC7-20 legend in a closed `details`
    element, are not accepted here. They return with any sign-off offer.

### `pmy0-namespace-diagnostic` — answer A

Picked: "A. Run it at a terminal after checking the three digests; agents read
`latest.log`".

- The owner will run, in person, the prepared diagnostic
  `/home/orca/.tmp/syzygy-pidnamespace-20261114/run.sh` for `syzygy-pmy0`.
- It reruns one probe of the `af485ea3` candidate guardian in a private PID
  and mount namespace.
- Before running it, the owner checks these digests:
  - `run.sh` `ae591e2421c964cf1f1cfb5ed819b2aa093f36c5b30eab3f616e75950c17945e`
  - `namespace-init.sh` `1c3ce46da2cfda137d0dcce9bbadbc788aaf4c025826d22c3fd2db04ee4c06b0`
  - `inputs.json` `f42adf487ca8e871fe13000a41861e86d581192734e99aa17cf47a3b29dc7391`
- Excluded:
  - agents never run the payload;
  - a pass waives no failed verification;
  - it decides no deadline or refusal change.

### `bpyt33-direction-provenance` — answer A

Picked: "A. Yes, that was me".

- The Codex-client reply of 2026-11-07T17:08:04Z was the owner's.
  `OWNER-DIRECTION-SYZYGY-BPYT-33-SCOPE-EXCEPTION-2026-11-07.md` (PR #769) is
  a true record of that answer.
- Before it lands, its sentence that the Nov-3 merge freeze "still holds"
  takes a dated stale mark. `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06`
  had already moved that freeze.
- [Inferred] PR #769's timeout change is superseded on main (`6b7cbcf2`). Its
  one-line `if (depth < 6)` guard may re-land under the recorded exception.

### `n12n13-direction-provenance` — answer A

Picked: "A. Yes, that was me".

- The Codex-client reply of 2026-11-06T10:08:37Z was the owner's.
  `OWNER-DIRECTION-N12-N13-FIXTURE-SAFETY-2026-11-06.md` (PR #776) is a true
  record of that answer.
- Excluded: #776's no-/proc proof (its original AC1) is not waived.

### `pr640-policy-stem` — answer A

Picked: "A. It is a knob; the clause halts only it. Other knobs merge if a
rebased re-run still changes no verdict".

- The `pwb-secret-classification-policy` stem is a knob.
- The Nov-3 stop clause halts only that knob's alignment. The other
  consent act-family knobs in PR #640 (`syzygy-bpyt.1.24`) may merge after:
  - a rebase;
  - a re-run of the verdict differential over the current `decisions/` tree
    that shows no verdict change;
  - a fresh exact-head review.
- If the re-run changes any verdict, the work stops and returns to the owner.

### `pr652-refusal-disclosures` — answer A

Picked: "A. Approve, in JSON and text".

- The CLI refusal for allow-execution's launched/unreadable stage, in PR #652
  (`syzygy-bpyt.8.11`), may carry the four disclosures the packet quoted, in
  that order:
  - in JSON, as a `disclosures` array;
  - in text, as stderr lines `disclosures.0:` to `disclosures.3:`.
- This answers the reservation in
  `OWNER-DIRECTION-GREENFIELD-PARITY-LAUNCHED-MARKER-SCOPE-2026-10-21.md`.
- Excluded:
  - any other CLI output change;
  - landing without a rebase and a re-review of the rebased diff.

### `pr514-large-label` — answer A

Picked: "A. Approve on the 2026-10-22 condition".

- This answers item 6 of the 2026-10-22 owner packet for PR #514
  (`syzygy-bpyt.8.21`).
- Records whose labels fall in the narrow band where the old reader throws
  `RangeError` read normally under the linear-time reader.
- The band is about 8,388,232–8,388,442 label characters on six templates and
  8,388,118–8,388,338 on provider-statement v2.
- Condition: `recorder-template.ts` and both test files stay byte-identical to
  `8b143272`.
- Excluded: nothing above the band; that stays `syzygy-bpyt.8.29`.

### `pr714-fifo-refusal` — answer B

Picked: "B. Keep accepting live-writer FIFOs".

- The reconciliation checker in PR #714 (`syzygy-j5dg`) keeps main's
  acceptance of a sign-off entry that is a FIFO with a live writer, in
  `--check`, `--census` and `--regenerate`. That is round 3's F6 case.
- Not the recommendation (A, refuse every FIFO).
- [Inferred] Accepting a live-writer FIFO without hanging on a writerless one
  needs a non-blocking open or a bounded wait.
  - The mechanism is engineering judgment.
  - Any other change to what the checker accepts or refuses, relative to
    main, returns to the owner (GP-Q0 part 3).
  - That includes how a writerless FIFO is treated if it differs from main.

### `pr585-round3` — answer A

Picked: "A. One last round with a WHATWG-parser classifier (Node's built-in
`URL`, no new dependency; N1–N3 class), N4/N6, the REQ-012 route; N5 → #1
missing-declaration".

- PR #585 (`syzygy-u2a.7`) gets one last repair and review round:
  - the README-link classifier uses Node's built-in `URL`;
  - N4 and N6 are repaired;
  - the CAP1-REQ-012 consent-resolution route is added;
  - the undeclared arm reports RFC2-24 reason #1, missing-declaration.
- If round 3 does not confirm, the PR parks.
- Excluded: the repository-locator question `syzygy-u2a.14`, and any new
  dependency.
