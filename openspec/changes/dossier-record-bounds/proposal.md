# Dossier record bounds — version 2.10

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule (it bounds Syzygy's own records and reads, and admits or excludes nothing screened differently); no foreign repository; no exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.73 (from the 2.8 review, F5 and F3): apart from `manifestFacts`, the draft check record's members have no size bound, so a passed draft may give a record past the 16 MiB read bound, unmeasured; and a render can refuse a derived record check really wrote when the screen or Syzygy changed in between, while the region says "no derived record was kept", which is untrue (VIS-2).
- [Observed] syzygy-3efd.74 (from the 2.8 code review): the supervisor reads the inventory check record, which lies within the agent sessions' write reach, with no bound.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Every draft and inventory check record Syzygy writes lies within the version 2.8 read bound: a step measures the record first and, past the bound, writes a bounded form with one `check-record-bound` finding, so the subject does not pass; the measured worst cases are stated (`design.md`).
- Every reader of a draft or inventory check record opens it once without blocking and refuses anything but a regular file within the bound before reading a byte, reading at most one byte past the bound (the derived record is read the same way under its own bound); the inventory check record is read under the same bound by Syzygy deciding whether an inventory counts and by the supervisor, and a record past it is no record.
- The derived region and the directory map say `this draft revision's derived-record path holds something this render cannot use or cannot examine; ...` wherever examining the record's path reports anything but no entry, and `machine.json` states `unusable`; the words for no entry are unchanged.
- Three paragraphs and six scenarios added; two passages and three scenario lines amended; four Form lines extended; one parent requirement added to the warrants (`SEMANTIC-DELTA.md`).

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged. [Inferred] Provider mode is unaffected.

## Non-goals

[Inferred] No subject cap, schema or brief change; no new Unknown reason (RFC2-24 is closed); no change to the read bound, the derived record's format or any screening rule; no bound on the other unbounded reads in `polaris.ts` (reported as a residual).
