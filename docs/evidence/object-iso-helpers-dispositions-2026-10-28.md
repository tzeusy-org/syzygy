# Shared object and ISO helpers: review dispositions, rounds 1 to 3

[Observed] This record gives the dispositions of the three CC-REV-1 review
rounds of `syzygy-bpyt.6.3` stack 4 (pull request #548). The change replaces
17 local object-shape predicates with one shared `isRecord` in
`@syzygy/support` and 7 `isoOf` copies with one module in `polaris-dossier`.
Four importers sit on the body-read gate and on the secret and content-class
screens. The lane's evidence is `docs/evidence/syzygy-bpyt-6-3-iso/`, with
the record `dc4-object-and-iso-helpers-2026-10-28.json`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) | sha256 of the raw |
|---|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-OBJECT-ISO-HELPERS-1-RAW.md` | `REVISE` | `2e7ab2ec` | `r1-review.diff` sha256 `8c711369baada51ef37752acc3285595346072bba1738da761270e100cee97d6` | `157563c5e445b201d56c49ead8685d4dd0fbec3c2a80a1b215e358f5fcff56df` |
| 2 | `docs/reviews/R-GP-IMPL-OBJECT-ISO-HELPERS-2-RAW.md` | `REVISE` | `4d92ac95` | `r2-review.diff` sha256 `0d49d66fc329f9f938350c019b755ec8bf28ca361250f79dbc3a9dbd465df07c` | `2693097ed4d5929d979d03944c39b45bba471e815dac034430727b505554590c` |
| 3 | `docs/reviews/R-GP-IMPL-OBJECT-ISO-HELPERS-3-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `2df14d7d` | `r3-review.diff` sha256 `95c8d585dbc82061e4e35cb101d7a730446d273245ba92feb9386ee4d6c4e676` | `35e89acd6c0b974aad1e9ad950e56a93f64f877bb200f932e0475c1fac3a5750` |

Round 3 had notes only, so it cleared the bytes it reviewed under the
owner's notes-only stopping rule. Revise-severity findings open: 0.

## Class and the GP-Q0 ruling

[Observed] Round 1 ruled classes 1, 3 and 4 touched, as the lane claimed:
`authority-artifact-fields.ts` parses the registry and policy documents that
PWB-REQ-005 gates on (class 1), the dossier run-record, brief and inventory
bytes and the POC surface version move (class 3), and the secret-redaction,
content-class and dossier screen loaders sit under SEC-2 and SEC-5 (class
4). Class 6 was over-claimed, since `packages/support` is private. Rounds 2
and 3 kept class 1 for the repaired calls. Round 1 found no change to what
any gate accepts or refuses (0 differences over 210 record-level cells), so
GP-Q0's stop clause is not reached. The coordinator posted a notice on
`syzygy-bpyt.10` at landing, because the change touches classes 1, 3 and 4
under GP-Q0's extra checks and because #545's support guard now admits five
more identifiers.

## Round 1 (REVISE)

- **F1** (blocking: `site-equivalence.mjs` can hide a changed value): the
  reviewer's strict tool, byte for byte, plus an SM4 selftest case; met in
  round 2.
- **F2** (three false PR-body sentences): applied; met in round 2.
- **N1, N2, N3, N5, N6, N8, N10**: repaired; met in round 2. N8 dropped the
  `true` row, which round 2's F1 restored.
- **N4** (the surface version that lands is neither PR value): below.
- **N7** (the retained differential is predicate-level only): the
  reviewer's record-level probe is retained here,
  `r1/tools/importer-probe.mjs` with its output `r1/importer-probe.json`
  (24 sites, 210 cells, base and head built modules).
- **N9** (an engine message inside a refusal string, outside this diff):
  `syzygy-bpyt.50`.

After PR #545 merged, the coordinator also directed a main merge, five names
added to #545's `ALLOWED_IDENTIFIERS` (`Array`, `Readonly`, `Record`,
`isArray`, `isRecord`), and the SM4 case. Round 2 found each of the five
names needed and every #545 pin it replayed still refused.

## Round 2 (REVISE)

- **F1** (blocking: the reason given for dropping the `true` row was false,
  and the row was the only test that caught mutant F, a deny-list naming
  string and number, at `authority-artifact-fields.ts:102`, `:121` and
  `:132`): Fix A, the reviewer's exact text, restored the row; met in round
  3, where mutant F is killed at each of the three sites by that row alone.
- **N2** (AGENTS.md called `isRecord` "the one plain-object test"): the
  reviewer's text; met in round 3.
- **N1** (two selftest survivors, R2-M4 and R2-M5): `syzygy-bpyt.64`.
- **N3, N4** (information): no change.

## Round 3 (CONFIRM WITH EXCEPTIONS)

- **N1** (the record's `repairRows.reading` and PR body line 38 still say
  the `a number` row alone kills mutant E at the three
  `authority-artifact-fields.ts` sites; true at `28024ade`, not at the head):
  the body insertion is applied at landing with the reviewer's text; the
  record regeneration goes to `syzygy-bpyt.64`.
- **N2** (the record says the restored row "adds a test"; it adds five
  generated tests): `syzygy-bpyt.64`.

## The landing

The landing commit merges main `b87e7a40` (PRs #544, #549, #552 and #553
among others) into the reviewed head `2df14d7d`, with no conflict. Of the
PR's 68 paths, main changed three since the merge base `a1b9bde2`, each in
other hunks: `AGENTS.md` (other bullets), `screen.test.ts` (one CRLF case
from `syzygy-bpyt.16`) and `support-purity.test.ts` (the `source` export
condition from `syzygy-bpyt.4.2`). Every other PR path is byte-equal to
`2df14d7d`. At the merge, after `npm ci`, the PR's 9 changed test files and
four main guards (`product-build.test.ts`, `sync-child-process-guard.test.ts`,
`workspace-reach.test.ts`, `polaris-authority-sweep.test.ts`) passed: 13
files, 674 tests. `npm run typecheck` exited 0. Round 3's N1 body
insertion is applied with the reviewer's text. The battery at the landing
commit and hosted `checks` and `node` there are in the landing note on the
pull request, with the surface version at landing (round 1 N4).

## Retained review evidence

The reviewers' tools and results are kept under
`docs/evidence/object-iso-helpers-review-2026-10-28/`: `r1/` 60 files, `r2/`
12 and `r3/` 8. Each raw lists its kept files with their sha256 in its
cleanup section. At landing, a script checked all three against their raws:
60, 12 and 8 matched, 0 failed, and no file was unlisted. Round 1's
directory also held governance, quotation, typecheck and `npm ci` logs and a
copy of the PR body, which its raw does not list; none was kept.

This is an implementation record and binds nothing.
