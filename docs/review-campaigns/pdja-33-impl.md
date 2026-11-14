# Polaris launch-consent v1.2 and source-acquisition entry v1.1, implementation

## Patterns

- `R-PDJA-33-.*\.md`

## What was under review

`syzygy-pdja.33`: the implementation of REQ-polaris-generation-046 and 047 (launch-consent spec v1.2) and registry entry v1.1's ledger items 1b and 3, in slices on `agent/syzygy-pdja-33-impl`, under `OWNER-DIRECTION-CLONE-AND-URL-SCOPE-IMPLEMENTATION-2026-11-12.md`. Slice A narrows the launch reads of the operator's clone to the closed list; slice B adds the copy step; slice C reads locators by the admitted forms; slice D adds the statements 046 and 047 require of the question, the output, the run record, the pages and the briefs.

## Last verdict of record, and where the findings landed

`REVISE` (`R-PDJA-33-RULINGS-2-RAW.md:2`), over `b340177a`, the RULINGS-1 repairs and the identity widening ordered by the owner on 2026-11-14 ("Widen all readers now"). Each finding the lead directed to repair is repaired by its own commit on the same branch:

- Finding 1 (blocking): three identity readers were missed by the widening, each still refusing ".": `dossier-trigger.ts:128`, `repo-corpus.ts:83` and `generation-source.ts:164`.
- Finding 2 (non-blocking): the single IDNA host rule of `96613e8c` refused ASCII hosts `main` admitted and rewrote numeric hosts, beyond 046 line 15's normalisation; its "no identity changes" claim is false for the hosts it refused.
- Finding 3 (non-blocking): this file's "`IDENTITY` is unchanged" went stale at `5ef9dabd`.
- Reviewer mutant O1 (survived): the egress scope-line regex's `$` anchor was unpinned.
- Findings 4 to 10 (notes): the RULINGS-1 repairs hold; no change directed.

Earlier: `REVISE` (`R-PDJA-33-RULINGS-1-RAW.md:2`), over `f83fd7e8`, the commits implementing the owner's rulings of 2026-11-14 (host widening and the `launch.json` rewrite). Each finding the lead directed to repair is repaired by its own commit on the same branch. The repair mutants are recorded in `docs/evidence/syzygy-pdja-33/rulings-1-repair-mutation-2026-11-14.json`:

- Finding 1 (blocking): the scp form admitted a bracketed IPv6 host, which 046 line 17 excludes (its scp host holds no `:`). A bracketed scp host is now refused by its own rule, with or without a user; bracketed IPv6 stays admitted in the URL forms (`87c5b880`).
- Finding 2 (non-blocking): ASCII and non-ASCII hosts were normalised by two rules. Every host now goes through IDNA domain-to-ASCII; no identity changes, since it is derived from the path alone (`96613e8c`).
- Finding 3 (non-blocking): the host refusal no longer said its grammar is narrower than 046, and the comment saying so went stale. The refusal now names what it still refuses (`~`, the sub-delimiters, IPvFuture), and the comments are corrected (`f5ada885`).
- Finding 7 (non-blocking): a session-prompt whose `launch.json` rewrite failed left the issued session out of the step log. Both paths now log the issued step before the rewrite (`fdccc501`).
- Finding 5 (note): the identity-tail report cited one reader, `generation-source.ts:164`, that does not pin the first character; the report is corrected and the identity-tail question goes to the owner. `IDENTITY` is unchanged.
- Findings 4, 6, 8 and 9 (notes): no change directed.

Earlier: `CONFIRM WITH EXCEPTIONS` (`R-PDJA-33-SLICE-CD-5-RAW.md:4`), over `61baeff6`, the round-4 repairs, notes only. The raw confirms CD-4's Findings 1 and 4 resolved; CD-4's Findings 2 and 3 stay with the owner. Its two notes need no change:
- Finding 1 (note): a configuration that is unreadable or over its bound is now refused after the alternates existence probe; that probe is read (4) of 047's list, which 047 does not order.
- Finding 2 (note): the CD-4 mutation record names `1c015d5a`; the mutated files hash the same at `61baeff6` and both mutants reproduce.

Earlier: `REVISE` (`R-PDJA-33-SLICE-CD-4-RAW.md:4`), over `3864b641`, the round-3 repairs. The raw confirms every round-3 finding resolved. The repair mutants are recorded in `docs/evidence/syzygy-pdja-33/slice-CD-4-repair-mutation-2026-11-14.json`:

- Finding 1 (revise): an alternates file that could not be examined was refused after the configuration was read, with no user-information statement. The alternates probe now precedes the configuration read, which is the snapshot's last read. A test pins that the EACCES refusal opens no config and carries no statement (`3e198a82`). The residual is restated, and it is now exact: no user-information statement is made on any refusal before the configuration is read. Those refusals are the reftable placeholder, an unreadable or unadmitted HEAD or reference, a `.git` that is missing, a link or a file, an alternates file that cannot be examined, and a configuration that cannot be read or exceeds its bound.
- Findings 2 and 3 (notes): whether line 17 owes the statement before the configuration is read, and for remotes other than the identity remote. These are reading questions for the owner; not repaired.
- Finding 4 (note): init's refusal document carried the statement twice. The nested launch refusal no longer repeats it (`1c015d5a`).

Earlier: `REVISE` (`R-PDJA-33-SLICE-CD-3-RAW.md:4`), over `ef668003`, the round-2 repairs. The raw confirms every round-2 finding resolved. The repair mutants are recorded in `docs/evidence/syzygy-pdja-33/slice-CD-3-repair-mutation-2026-11-14.json`:

- Findings 1 and 2 (revise; note), repaired together at the root, as directed: the user-information statement was lost for a single URL that is no locator and for refusals before the identity stage. The configuration reader now marks every remote any of whose url lines carries user information. From the clone step on, the launch states it once for the remote the identity rule reads, on every refusal and on success, whatever later happens to the URL. It never prints the URL (`05e0b829`, `9db1e99d`). At this round, an alternates file that could not be examined was refused after the configuration was read and carried no statement. CD-4 moved that probe before the configuration read. Refusals made before the configuration is read, such as reftable or a missing HEAD, carry no statement.
- Finding 3 (note): the predicate's no-path arm is now tabled with `https://bob:pw@h` (true) and `https://h` (false) (`05e0b829`).
- Finding 4 (note): a scheme URL's authority now ends at the first "/", "?" or "#" (`05e0b829`).
- Finding 5 (note): the held-interrupt statement is made in the run's class (`e16b8bc7`).

Earlier: `REVISE` (`R-PDJA-33-SLICE-CD-2-RAW.md:4`), over `7a7a52ee`, the slice-C and slice-D repairs. The raw confirms every C-1 and D-1 finding resolved and upholds the implementer's choices. Each finding repaired is repaired by its own commit on the same branch. The repair mutants are recorded in `docs/evidence/syzygy-pdja-33/slice-CD-2-repair-mutation-2026-11-14.json`:

- Finding 1 (revise): an identity refusal made after the remote URL was read dropped the user-information statement. Every such refusal now carries the locator statements, and the launch's refusal and init's output pass them on (`ae6d7a05`).
- Finding 2 (revise): a refused launch never stated the brief stage. Every refusal's statements now end with "Syzygy issued no brief and delivered no packet", and the "Clone with an alternate" scenario's full list is pinned (`b8632777`).
- Finding 3 (note): `launch.json` keeps the brief stage's not-reached form after a brief is issued. Not repaired; it goes to the owner.
- Finding 4 (note): `LAUNCH_DISCLOSURE_SINCE`'s comment and refusal named a basis true only of this branch. Both now name the cutoff as what it is, and a unit case pins the refusal of an unparseable `pinnedAt` (`d8ee1926`).
- Finding 5 (note): the unreachable no-copy pinned state is dropped (`07b7ca2a`).
- Finding 6 (note): a multi-URL identity remote whose url lines carried user information now gets a statement saying so, printing no URL (`b23d3003`).
- Finding 7 (note): an interrupt held after init's last check is now said in init's output, with the run kept (`d0afb1be`).

Earlier: `REVISE` (`R-PDJA-33-SLICE-D-1-RAW.md:4`), over `3c879e36`, slice D. Each revise finding is repaired by its own commit on the same branch. The repair mutants are recorded in `docs/evidence/syzygy-pdja-33/slice-D-repair-mutation-2026-11-14.json`:

- Finding 1 (revise): a copy statement said "the pinned commit" for a run whose commit was never pinned. The fetch-failed and fetched forms now say "the named identifier" until the commit is pinned (`4653d320`).
- Finding 2 (revise): the fixed text for an unread committer date gave a false reason and, in a no-copy run, named a copy. The pinned state now carries the reason from what happened. Only a copy-class run says where the copy's checkout left its HEAD (`7bfa1686`, `7c85d578`).
- Finding 3 (revise): a reached commit-pinned stage withheld the committer date. The copy's commit object is now read as soon as the copy's checkout pins the commit, so the date is stated even where the form or store check then fails (`d29a96f2`).
- Finding 4 (revise): a no-copy run's question carried no copy statement. It now states the no-copy form, "no copy was made", for the three copy statements 046 requires of the question (`761f22fe`).
- Findings 5 and 10 (revise; note): the run record never stated the brief stage, and pages derived it from `launch.json`. `launch.json` now carries the not-reached form from `init`. Each brief, when issued, stores its own reached form, worded from whether that brief named a copy: `brief.json` for the authoring brief, the session prompt record for each inventory brief. Pages read those stored statements, and show Unknown where a record carries none (`bab94075`, `53ced694`).
- Finding 6 (revise): on a covered run the user-information statement never reached the operator. `init` now prints the launch's locator statements in its output on every path (`fc63caa9`).
- Finding 7 (revise): briefs failed open when `launch.json` was absent. A run whose clone lies under the state root's copies directory is copy-class whatever `launch.json` says, and an absent, unreadable or no-copy disclosure for it refuses the brief. An absent disclosure counts as a legacy no-copy run only where the run record was pinned before 2026-11-13T00:00:00Z (`64a99c18`).
- Finding 8 (note): the spec-inherited "held in the copy" wording in a no-copy run's observation-consent offer. Not repaired here; the lead takes it to the owner.
- Finding 9 (note): stage, class and reached are carried only inside the item id. Not repaired: the disclosure item shape is shared, and adding fields to it reaches beyond this slice.
- The three-launch version 1.1 test has a 20 s timeout (`a48ee80e`).

Earlier: `REVISE` (`R-PDJA-33-SLICE-C-1-RAW.md:4`), over `f970825c`, slice C and the slice-B repairs. The raw confirms slice-B findings 1 to 6 resolved and upholds the reading of 047's copy settings as properties. Each finding is repaired by its own commit on the same branch. The repair mutants are recorded in `docs/evidence/syzygy-pdja-33/slice-C-repair-mutation-2026-11-14.json`:

- Finding 1 (revise): Git's `<transport>::<address>` form read as an scp-form locator. An scp-form path beginning with ":" is now refused, for an operator's URL and a remote's (`495bf19e`).
- Finding 2 (note): a leading empty path segment was collapsed. It is now refused, as an inner one is (`cfa93e7c`).
- Finding 3 (note): an interrupt outside the question left the copy behind. A process-level SIGINT watch runs from the copy step to init's outcome and leads to the failure path, which removes the copy (`85bb5fb1`, `4c64ca0b`).
- Findings 4 and 5 (notes): the host, port and identity first-character rules are narrower than the text. Each refusal they cause now names its rule, `--identity`'s included. Nothing is widened; the question goes to the owner (`52950f09`).
- Finding 6 (note): an identity remote with several url lines fell through to another remote. It is now kept with no URL, and the refusal names it and the rule. Dot segments and `.GIT` stay literal (`200b8cdc`).
- Finding 7 (note): the URL in preflight's printed command is single-quoted (`7a9a9798`).

Earlier: `REVISE` (`R-PDJA-33-SLICE-B-1-RAW.md:4`), over `ad6163f3`, slice B and the slice-A repairs. Each finding is repaired by its own commit on the same branch, and the repair mutants are recorded with slice B's 25, re-run, in `docs/evidence/syzygy-pdja-33/slice-B-mutation-rerun-2026-11-13.json`:

- Finding 1 (blocking), a repeat `init --url` at a launch-consented HEAD ran on the operator's clone: every "another act" check reads the sources without launch records (`GateSources.otherActs`, `otherActsOf`), in `init` and throughout the launch (`ab7e5b0a`).
- Finding 2 (revise), a thrown error or an interrupt left the copy: a thrown error after the copy step starts is a `failure` refusal that removes the copy and says so; Ctrl-C or the end of input at a question is no answer (`87876848`). Whether a refused `brief` command owes a removal is left for slice D.
- Finding 3 (revise), the oracle after the copy step: the clone is re-sealed after each copy Git process, the copy entry points and `openAsBlob` are logged, and the log is rooted at the clone (`85bbfb11`, `d62f99a8`); mutant O3 is recorded killed.
- Findings 4 and 5 (notes), attributes, identity and maintenance: `GIT_ATTR_NOSYSTEM=1`, `core.attributesFile=/dev/null`, a fixed identity and `maintenance.auto=false`, after reading 047's copy paragraph as stating properties rather than a closed set of settings (`02508a19`).
- Finding 6 (note), `objectsRead` after a copy-stage refusal: decided from whether an object read ran (`1c6d6708`).
- Finding 7 (note), the copy statements deferred to slice D: no repair; the owner's run waits for slice D.

Earlier: `REVISE` (`R-PDJA-33-SLICE-A-1-RAW.md:4`), over `db109c54`, slice A round 1. Each finding was repaired by its own commit on the same branch:

- Finding 1 (revise), the read oracle saw only `openSync`: the fixtures make every non-admitted file unreadable (mode 000) and the oracle also patches the other read entry points; mutants R1 and R3 recorded killed in `docs/evidence/syzygy-pdja-33/slice-A-repair-mutation-2026-11-13.json`.
- Finding 2 (revise), every remote's HEAD read: `refs/remotes/origin/HEAD` admitted first, the others only when it is absent or not symbolic; the FULL fixture re-pinned.
- Finding 3 (note), the `.git/reftable` probe: dropped; the HEAD placeholder is the detection.
- Finding 4 (note), `--revision HEAD` refused: HEAD admitted as a candidate.
- Finding 5 (note), M10: recorded as surviving with the race unstaged, and killed where the oracle can report a link as a regular file.
- Finding 6 (note), the alternates refusal: wired to `snapshot.alternates` with the copy step in slice B (`fd48132a`).
