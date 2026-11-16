# V-GP-B2-RECORD-1: fidelity review of the GP-B2 owner-answers record
Verdict: FAITHFUL WITH EDITS
Subject: PR 552 at 4dbe653e
Record: `.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md` sha256 3fb78a2fb29071a4ca2278a7c66004c5c1abaee8689a52f38973996d4975f567
Items: labels PASS, agents-will EDIT (E1, E2, E5), vet quotes EDIT (E3), raws PASS (7 of 7), AGENTS.md PASS, authority PASS; plus E4 and notes N1-N5

Reviewer: V-GP-B2-1/2, the independent vetter of drafts 1 and 2, 2026-10-28. I did not write the record, and I changed none of
its bytes. This is a narrow fidelity review against `PACKET-DRAFT-3.md` (sha256
`fef096a992e316d625bd7f9b15286d4a99fcb785f7e6720f7550401f33ed9316`, re-derived by `sha256sum`) and the coordinator's
`brief-record.md`.

## 1. Subject identity

- [Observed] Scratch clone of `/home/tze/GitHub/syzygy`; PR #552 fetched and checked out detached at
  `4dbe653e09b7b8384100feffa795364984e26d3c`. Merge base with `main` is `95c87a52`, which is also `origin/main`. The PR changes
  12 files: the record, `decisions/README.md` (+1), `AGENTS.md` (one line), `docs/README.md`, the 7 raws under `docs/reviews/`,
  and `scripts/check_docs_review_campaign_partition.py` (+6).
- [Observed] The record at that commit hashes to `3fb78a2f…f567`, matching the brief.

## 2. Checks

### 2.1 Every label is quoted exactly: PASS

[Observed, `tools/labels_and_terms.py`] The record's 8 `Selected: **"…"**` labels equal the 8 labels of the brief's table, in
order: "A: read it (Recommended)", "Land #544 first (Recommended)", "C (Recommended)", "B: all compiled (Recommended)",
"A: precondition test (Recommended)", "A: governed 3 (Recommended)", "A: refuse (Recommended)",
"A: follow profile (Recommended)". The record also says Q2 was the plain C, not "C, and signal the stray span", as the brief
says. [Unknown] whether those are the labels the question tool showed: I may not open the session transcript, and the
short labels (for example "A: read it") do not appear in the packet, whose options read "**A. Read it by the profile.**" and so
on. The record already labels this as observed by the coordinating session (`:25-27`), which is the right label.

### 2.2 "The agents will" against the packet's "If you answer" paragraph: three edits

I compared each section with draft 3's "If you answer …" paragraph (`PACKET-DRAFT-3.md:176-185`, `:272-282`, `:343-347`,
`:407-412`, `:487-489`, `:529-531`, `:575-577`), and with the option text the owner selected, by reading. Where the record carries
detail from the selected option's own text (Q2's "Extraction, the manifest and phase-A admissions change", Q3's "keep
`packages/cap1-daemon/` while `build:poc` builds it", Q4's precondition predicate, Q5's "names the failing detector by position
and id", Q6's "`act-instant-malformed` or `expired`"), I count it as faithful: the owner selected that text.

| Q | Result |
|---|---|
| Q1 | **Edit E1.** Every item of `:176-185` is present (step 2 as its own PR after #544, both loops, 200,000-line fence tests in LF, CRLF and CR, a long-list test, a mutation per site, the differential, class 4 with class 3 optional, the 31-call bead and its come-back). But the record drops the consequence that vet 2's E1.9/E1.10 put into option A for the owner to see: a re-observation that meets such a list answers 200 and *replaces* the served evaluation (`/polaris` 200 to 503), where today's crash answers 502 and keeps the prior one (`PACKET-DRAFT-3.md:129-130`, `:151-152`). It also drops `/api/poc` answering 503 (`:135-136`). Under the record's own scope rule (`:20-21`, "a listed change for the work it describes, and for nothing wider"; `:341-342`), an implementation reviewer who finds the re-observe change unlisted would have to stop. |
| Q1 follow-up | PASS. `:184-185` ("If you want no window … say so, and PR #544 waits") is recorded as the owner accepting the window, which is what "Land #544 first" selects. |
| Q2 | **Edit E2.** Every item of `:272-279` is present, including the review class, P-112 not performed, and the residual. The record carries "phase-A admissions change" but drops the bound the packet stated beside it, "always within the existing read authority" (`:221-222`), and that phase B's reads move with phase A's. For a class-1 read gate, the bound belongs in the direction. The "What the owner did not select" and "The reading C proceeds on" paragraphs are faithful to `:263-266` and `:281-282`. |
| Q3 | PASS. Every item of `:343-347` is present; `syzygy-bpyt.28` and the restart residual come back as stated. |
| Q4 | PASS. Every item of `:407-412` is present, and the predicate is option A's (`:384-386`) word for word in substance. |
| Q5 | **Edit E5** (small), plus **E4**. The census test is described as listing the sites "by file and text" (`:268-270`). Neither the paragraph (`:487-489`) nor option A (`:466-469`, "lists the 47 product sites by class") says "by text"; the packet's census lists them by file and line. That is a new constraint on the test, so drop it. E4: the record's reason for leaving the 21 catch-all texts unchanged ("the operating system's and git's words are often the only clue", `:272-273`) is the packet's reason for the *environment* class only (`:482-483`). The packet offered D for the catch-all pages and the owner did not choose it (`:484-485`). The record should keep that trade-off, as it does for Q2. |
| Q6 | PASS. Every item of `:529-531` is present. |
| Q7 | PASS. Every item of `:575-577` is present. "0 of 6,640 … were expected to change" is the packet's observed differential (`:557-559`). |
| Also found | PASS, with note N2. |

### 2.3 Every quoted vet verdict at the line cited: PASS for the quotes, edit E3 for the selection

[Observed, `tools/quotes_at_lines.py`] 16 of 16 quoted strings occur at the cited line of the retained raw. The two bare
continuations (`VET-GP-FOLLOWUPS-4-RAW.md:53`, `:54`) read "- 1.16. Scope: Pass. Recommendation: Pass. …" and "- 1.17. Scope:
Pass. Recommendation: Pass. …", as the record says.

**Edit E3.** In the three `VET-GP-FOLLOWUPS-1/2/3` rows, every item carries two verdicts, a scope verdict and a recommendation
verdict, and the table gives only one of them per item, chosen inconsistently. Round 1 gives `.1.15`'s scope verdict and the
recommendation verdicts of the other two. Two Revise verdicts are left out: `.1.17` "Scope verdict: Revise"
(`VET-GP-FOLLOWUPS-2-RAW.md:228`) beside its quoted Pass, and `.1.16` "Scope verdict: Revise" (`VET-GP-FOLLOWUPS-3-RAW.md:136`)
beside its quoted Pass. A reader of the column "Verdict, in the raw's own words" would take those rounds as Pass for those
items. [Observed: every `verdict` line in the four raws, by `grep -n -i -F verdict`; each raw has exactly two per item.] The
replacement rows below quote all 18. [Observed, `tools/apply_edits.py`: 25 of 25 quotes in the edited table occur at the cited
line.]

### 2.4 The 7 retained raws are byte-equal to their sources: PASS

[Observed, `tools/raws_equal.py`, Python byte compare and sha256] 7 of 7 are byte-equal, and each source's sha256 appears in the
record's digest table (`:60-66`):

| Retained raw | Source | Bytes | sha256 |
|---|---|---:|---|
| `V-GP-B2-1-RAW.md` | `lead/owner-batch-2/vet-1/V-GP-B2-1-RAW.md` | 51,079 | `2d71d4821a98c2ec34c3e2b6ec75404aa3d76e3e503897d4fc030ed0b3441490` |
| `V-GP-B2-2-RAW.md` | `lead/owner-batch-2/vet-2/V-GP-B2-2-RAW.md` | 21,016 | `8e15819a3b797c3e84f3d2cc4878256a0eed813b4145c5443ad7467981f4eb59` |
| `V-GP-B2-2-ADDENDUM-RAW.md` | `lead/owner-batch-2/vet-2/V-GP-B2-2-ADDENDUM-RAW.md` | 5,824 | `27f13953ec0bb90098ae7c7faebfc8cd75fe0447ed49412d0a2610455934ccb1` |
| `VET-GP-FOLLOWUPS-1-RAW.md` | `vet-gp/VET-GP-FOLLOWUPS-1.md` | 33,678 | `bb29a17ba85049e2bf445f3d111036a3a6b21355c4ae1e0883a29972f3c2b189` |
| `VET-GP-FOLLOWUPS-2-RAW.md` | `vet-gp/VET-GP-FOLLOWUPS-2.md` | 23,963 | `91a9683c0b45d3aa45694ab2445867e0ce3c085324a98c3e7571796050849203` |
| `VET-GP-FOLLOWUPS-3-RAW.md` | `vet-gp/VET-GP-FOLLOWUPS-3.md` | 16,968 | `35f629a568e5dab5fa4e239c37ce4055a9d8d71e5f9a0eafb920b99dc0b68d41` |
| `VET-GP-FOLLOWUPS-4-RAW.md` | `vet-gp/VET-GP-FOLLOWUPS-4.md` | 3,547 | `9f22d77ff53353940789c14e6f57b240925db6f5c7722fe7ddd14f5c6935312f` |

The first three match the digests I published for my own raws. Source paths are relative to the session scratchpad.

### 2.5 The AGENTS.md edit is exactly that one sentence: PASS

[Observed, `git diff 95c87a52 4dbe653e -- AGENTS.md`] One hunk, one line changed. "G2 and G3 are open owner questions" becomes
"G2 and G3 were ruled by the owner on 2026-10-28 (GP-B2 Q2, answer C; `syzygy-bpyt.55` implements it)", the brief's text
exactly. The sentence's own full stop is kept, and nothing else in the file changes. See N4.

### 2.6 No authority beyond a plain direction: PASS

[Observed, `tools/labels_and_terms.py`, a case-insensitive sweep of the record for accept, approve, authori-, bind, adopt,
sign, act, register, digest, in force, permit, allow and lift: 25 hit lines, each read] The record calls itself a plain
direction in GP-Q0's form (`:9-15`: no digest bound, no acceptance-record row, nothing registered, nothing signed). Its one
operative sentence, "Each answer here is now a listed change for the work it describes, and for nothing wider" (`:20-21`),
is what GP-Q0 Part 3 does for its beads, and the record bounds it again at `:341-342`. "What this does not do" (`:332-342`)
denies signing, adoption, amendment, P-112, `syzygy-bpyt.28`, lifting a prohibition, and release. The withdrawal clause
(`:344-347`) is GP-Q0's own (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:150-153`). The `decisions/README.md`
row ends "A direction, not an act; signs nothing". No hit claims more.

### 2.7 Other claims in the record, checked

- [Observed] The GP-Q0 citations hold at `95c87a52`: `:52-55` (behavior-preserving), `:59-66` (the review rule and its three
  checks), `:95-96` (the stop clause, quoted exactly).
- [Observed, `tools/cited_lines.py`] All 13 code citations the record dates at `95c87a52` hold there:
  `markdown-code-context.ts:91` and `:60`, `project-shape-extraction.ts:647`, `project-shape-manifest.ts:175`,
  `fence-rules.test.ts:197` and `:230`, `git-observation.ts:176-195`, `workspace-reach.testkit.ts:72-78` (both residual
  comments), `content-classification.ts:157`, `screen.ts:107`, `public-source-screening.ts:173`, `act-fields.ts:39-41` and
  `package-reader.ts:112`. The `:119` and `:66` "on PR #544" cites were not re-checked.
- [Observed] "no vet raw names draft 3's digest": `grep -l -F fef096a9` over the 7 retained raws prints nothing (exit 1).
- [Observed, `diff PACKET-DRAFT-2.md PACKET-DRAFT-3.md`, `out/d2-d3.diff`] "Draft 3 applies the second vet's five exact texts
  … and nothing else" holds at hunk level. The head paragraph changes, plus five hunks: Q1's evidence bullets (E1.9), option A
  (E1.10), the B/C/D paragraph (E1.11), the Q2 recommendation sentence (N1) and the "Also found" timing (EW1). Whether each
  hunk is byte-equal to my raw's text was not re-checked here.
- [Not run] The docs partition checker and `check_governance.py` were not run by this review. The partition figures went from
  108 rows over 578 files to 109 over 585; the +7 equals the 7 raws added.

## 3. Edits (exact replacement text)

Each old text occurs exactly once in the record at `4dbe653e`. [Observed, `tools/apply_edits.py`; the edited copy hashes to
`4dddf79b07b8e274c238393b5d3a5be24a32c95fc1ada0dee7b8be7f21095d72` and contains 0 U+00A0 and 0 U+FEFF.] The same texts are kept
as files under `edits/`.

### E1: Q1, the re-observe consequence and `/api/poc` (record `:105-108`)

Old:

    A text that crashes today gets the decision a shorter fence or list would
    get; nothing new is refused. For a list that long, `/polaris` then answers
    503 under the existing page ceiling, as it already does for 20,000 items,
    while the other pages serve.

New:

    A text that crashes today gets the decision a shorter fence or list would
    get; nothing new is refused. For a list that long, `/polaris` and
    `/api/poc` then answer 503, each under its own existing ceiling, as
    `/polaris` already does for 20,000 items, while the other pages serve. A
    re-observation that meets such a list answers 200 and replaces the served
    evaluation, so `/polaris` goes from 200 to 503, where today's crash answers
    502 and keeps the prior evaluation served. Option A, as presented, named
    both.

### E2: Q2, the read-authority bound (record `:158-159`)

Old:

    Extraction, the manifest and phase-A admissions change on the affected
    shapes. P-112 is not performed at its current bytes.

New:

    Extraction, the manifest and phase-A admissions change on the affected
    shapes, and so which files phase B reads, always within the existing read
    authority. P-112 is not performed at its current bytes.

### E3: the three `VET-GP-FOLLOWUPS-1/2/3` rows (record `:49-51`), both verdicts per item

Old: the three rows at `:49`, `:50` and `:51`, as they stand.

New (three table rows):

    | `docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md` | Round 1 over the predecessor packet | `.1.15` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:36`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:45`); `.1.16` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:195`), "Recommendation verdict: Reject" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:201`); `.1.17` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:318`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-1-RAW.md:328`) |
    | `docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md` | Round 2 | `.1.15` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:19`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:23`); `.1.16` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:129`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:138`); `.1.17` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:228`), "Recommendation verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-2-RAW.md:243`) |
    | `docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md` | Round 3 | `.1.15` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:35`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:45`); `.1.16` "Scope verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:136`), "Recommendation verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:147`); `.1.17` "Scope verdict: Pass" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:180`), "Recommendation verdict: Revise" (`docs/reviews/VET-GP-FOLLOWUPS-3-RAW.md:190`) |

(Strip the four-space indent: each row begins with `|`.)

### E4: Q5, the option the owner did not select (record `:272-273`)

Old:

    The 21 catch-all and 23 environment texts do not change: the operating
    system's and git's words are often the only clue to what failed.

New:

    The 21 catch-all and 23 environment texts do not change. For the
    environment sites, the operating system's and git's words are often the
    only clue to what failed.

    **What the owner did not select.** The packet offered D, under which each
    of the 21 catch-all handlers, among them the re-observe 502 page and the
    HTTP 500 body, would name only its stage and the error's class. The owner
    chose A, so a bug's own engine wording still reaches those pages.

### E5: Q5, the census test's key (record `:268-270`)

Old:

    - a census test that lists the 47 product sites by class (3 governed, 21
      catch-all, 23 environment) by file and text, and fails when an unlisted
      one appears.

New:

    - a census test that lists the 47 product sites by class (3 governed, 21
      catch-all, 23 environment) and fails when an unlisted one appears.

## 4. Notes (no edit required)

- **N1** (Q1, `:93-94`). "Past about 125,000 lines or items the call overflows" gives the top-of-stack figure as the
  threshold. The packet measured 103,535 lines at 2,000 frames deep (`PACKET-DRAFT-3.md:109-111`) and calls the list figure
  "about 100,000" in its decision (`:78-79`). Optional text: "Past roughly 100,000 to 125,000 lines or items, depending on how
  deep the caller is, the call overflows the stack and throws, so the outcome depends on stack depth, an input that is not in
  the text."
- **N2** ("Also found", `:328`). The packet's unsafe-link item ends "The one consumer that reads elapsed time is a dossier run's
  declared deadline, which a stall can use up" (`PACKET-DRAFT-3.md:595-596`). The record's lead sentence (`:321-322`, "These
  change no decision any page, record, refusal string or exit code shows") is true of the rewrite, but the record drops that
  sentence. Optional: append it to the `syzygy-bpyt.52` row.
- **N3** (`docs/README.md` row). It cites `VET-GP-FOLLOWUPS-4-RAW.md:52` for all three items, but `.1.16` and `.1.17` are at
  `:53` and `:54`, so the citation should be `:52-54`. "with only Q1 EDIT" is line 4's item list. Draft 3's five texts also
  included EW1 ("Also found") and the optional N1 (Q2), which the row's next clause covers.
- **N4** (`AGENTS.md`). The replaced line is now 133 characters in a section hard-wrapped at 78. The brief said to change
  nothing else, and the line breaks no code span, so leave it. A later reflow must not break the code span.
- **N5** (labels). See 2.1. The record's "exactly as it was presented to the owner" (`:32-33`) rests on the coordinating
  session's observation, which the record labels. Nothing in the repository can confirm it.

## 5. Cleanup

The scratch clone is deleted. No TMPDIR was used: no test or build ran. No file under `~/.claude/` was opened, and no Butlers
or other observed-repository content was read. No worktree was edited. Nothing was pushed, commented on or merged. No bd
command ran. Kept, under `lead/owner-batch-2/vet-3/` (all hashed after the clone was deleted; the tools name the deleted clone's
path):

| Path | sha256 |
|---|---|
| `tools/raws_equal.py` | `93d9abc8f836ea167cd649f7e72ae8d3cb64afd8578ea3b938568c768ed7c750` |
| `tools/quotes_at_lines.py` | `f348e74a9269996655fc2f7d2ee4b52d08b26aca2e6f1cd1649bbada477bc2c2` |
| `tools/cited_lines.py` | `feabf7bb15a53933d3192036584cd2218a947bdb0ee677c7f01dbca08904b236` |
| `tools/labels_and_terms.py` | `2f382ad7053bcef44c88bb33dbb6d16fc9666a0f0c6419c72a3cab9729081ace` |
| `tools/apply_edits.py` | `d279c1023c75822a35a1bcbdaadc6108420f8cc762760894da7d21c0241f7e19` |
| `edits/E1.old` | `91733067521bc33d03895790099d2c77509c4de1bfb4b01452b4edf7b31cdf92` |
| `edits/E1.new` | `4424adcb8d711adbaa2ae12efc84542a6114fb3a5cb6f8e83d6098484452e09c` |
| `edits/E2.old` | `bcdd01fdc61174d83e86b71ed2cbd1f5f7c1b80454b1d673a8460be8f0c1a293` |
| `edits/E2.new` | `8cfc778da26ddb74a7f777ea73e65fdeb59970238f831457e76e6db5619d5e1e` |
| `edits/E3.old` | `1b04c66dffa9d08f92ce7e4994974df385d57f4de99ac413b6c0b41afae1b326` |
| `edits/E3.new` | `b5eac92f0a4171fae00389d7e114da09b638d464a750ea006fd7ff2706961db8` |
| `edits/E4.old` | `fd9dc83c47b927422eab6e85ba4f046bdf9ecb71165f7b031bafcd882d85864c` |
| `edits/E4.new` | `8403c48bbb66d1639f0305d098557d9340e9791d8bc2eff717c336230d03ba93` |
| `edits/E5.old` | `35b551c73c66139e20e987ebd2703a66190c06c86c33167badcf075554ca22b5` |
| `edits/E5.new` | `9b79ccf2311d8f2d301bfefc4ace930f76456e7dcbdf356c5724fc6f32c93d3a` |
| `out/d2-d3.diff` | `8692df31b80c49d64dc25b01e0b12eb5afab905606fadc32f9f5b6eb6589e83a` |
| `out/side.diff` | `6519d256592394eecb8b390e0741ef8aaf8d07c461165ca100eba8b9352a8533` |
| `out/record-with-edits.md` | `4dddf79b07b8e274c238393b5d3a5be24a32c95fc1ada0dee7b8be7f21095d72` |
