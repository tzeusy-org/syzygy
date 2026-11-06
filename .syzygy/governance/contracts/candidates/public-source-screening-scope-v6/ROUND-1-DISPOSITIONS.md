# Round 1 dispositions — public-source screening scope, version 6

> **Candidate — binds nothing.** Drafted 2026-11-05 (`syzygy-mcs4`).

Reviewed record: docs/reviews/R-SCREENING-SCOPE-V6-a56f-1-RAW.md

Round 1 returned `REVISE` over `a56fec5c`: three revise findings and six
notes. Every finding is repaired once below; the repair retires the round-1
manifest, and round 2 reviews the repaired bytes. Figures below were
re-derived at the repair, not copied from the raw.

## 1 — Shapes the delta and the bound consequence sentence say are caught still pass (revise)

Repaired by widening the pattern (the raw's option a). It now takes any number
of `#` marks, an optionally quoted directive name, space, tab, vertical tab
and form feed as blanks, and an ACL password after a blank or a quote, as `>`
or as `#` with 64 hex digits. Nine new counterexamples pin each shape the raw
built (`## requirepass`, `# # requirepass`, a quoted name, a vertical tab, a
form feed, `">…"`, `'>…'`, a hashed password, and an ACL `#note` that stays
readable). Six new selftest mutants each undo one widening and are caught. The
consequence clause now states what is caught, what is not (six residuals) and
the ACL arm's cost. The linear-time check gained six adversarial lines for the
new parts, in both engines. The measurement script also counts readable
`redis.conf` lines that still name a password word, to price the residuals
without text. `--self-corpus` with the new pattern: 1 of 8,716 tracked text
files at `a56fec5c` matches, the delta itself (the quoted clause's
`user <name> … >password` line).

## 2 — The install ledger omits a battery-breaking chain and marks as Unknown what the version-5 precedent shows (revise)

Repaired in `IMPACT-LEDGER.md`: the later-acts chain in
`build_pwb_behavior_contract_repin.py` and the three steps it broke under
version 5 (`ac902baa`); the governance battery being red between act and
install; `install_redis_sitting.py` relabelled from the version-5 precedent
(`4f9c5de5`, `74a2829a`); the `governance-inputs.ts` pins at lines 65, 71,
107 and 110; the `PWB_EFFECT_AMENDMENT_OFFERINGS` entry that comes with the
act; the version-5 install described as its eleven `syzygy-mea.4` commits
plus `b1c2b939`. The act-file sweep is restated: 7 files outside the
screening-scope builders and recorders at the repair. The version-6 recorder
writes a `Chosen variant:` line so the chain builder's variant reader
(`CHOSEN_VARIANT_RE`) reads its record.

## 3 — The owner's measurement script prints a false "reach whole" count (revise)

Repaired in `scripts/redis_screening_v6_measure.py`: when `redis.conf` is
absent or excluded, each citation line says "0 reach" with the cause;
`redis.conf` is left out of the other-files counts; every changed file is
counted by its v5-to-v6 outcome pair. Run with this worktree as `--clone` and
run 3 as `--run`, it now prints "34 redis.conf citations; 0 reach (absent or
not UTF-8 text at this commit)" for `rev-0.json`.

## 4 — The ACL arm matches ordinary prose and code; the cost is unnamed (note)

Named, not narrowed: two cost fixtures (a README prose line and a Tcl line),
a delta paragraph, a packet bullet and a clause in the consequence sentence.
Narrowing to an ACL keyword before `>` needs a second unbounded run.

## 5 — The dialect agreement holds only on the probes chosen (note)

Recorded as a declared split: two probes (U+017F, U+212A) must match in
Python and not in JavaScript, and the builder fails if they ever agree or
another body splits. The delta says the oracle and the measurement script can
over-count there. The docstring's probe count is fixed.

## 6 — Wording the owner signs or reads overstates or is ambiguous (note)

The clause now says "withholds a body of any other class whole". The packet
says quotations touching a blanked line are withheld whole and that another
screen step may withhold the file. The packet names the change from the
questionnaire's five residuals.

## 7 — The packet's figures mix two populations (note)

The packet now states one population: the trial's 145 withheld quotations
over 12 files, with `README.md` (41, return Unknown), the five unplaced files,
and `redis.conf`'s 39 among them.

## 8 — The RFC5-14 class argument is honest but incomplete (note)

The delta quotes the row whole, says the placement rests on "the declared
policy decides each file", and the declined table gains the RFC5-14 amendment
route (RFC-0005 §7) and keeping the file withheld.

## 9 — Minor traceability (note)

The selftest predicate is renamed to say it is caught structurally. The run-3
figures now cite `scripts/dossier_run_citation_census.py`, retained in the
repository; it reads metadata fields only and re-derives the delta's figures.
