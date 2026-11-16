# R-LAUNCH-WRITE-CONSENT-2 — write consent for launch consent records, round 2
Reviewed commit: 3ea65c5327988d656fa2408cf631cd5216fd69d9
Manifest SHA-256: 7e56696ea4ec8f85c4472febbdb90f122b8b03dfca3f60ced829771638b972bf
Verdict: CONFIRM WITH EXCEPTIONS

Reviewer: fresh-context independent reviewer (CC-REV-1), 2026-11-09, on
branch `agent/syzygy-pdja.22-write-consent` at the commit above. Brief:
`.syzygy/governance/contracts/candidates/launch-consent-write-consent/REVIEW-BRIEF.md`.
Read: the round-1 raw, `ROUND-1-DISPOSITIONS.md`, `git diff 1a368d04 HEAD`
over the package, the builder and `scripts/check_governance.py`, the record
in full, the packet and SD sections the edits touch, and spec lines 23, 27,
29 and 161. No observed repository body, dossier output or credential was
read; no dossier command, provider call, branch or commit was made.

Paths below: "record" is
`instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md`, "SD" `SEMANTIC-DELTA.md`,
"packet" `OWNER-DECISION-PACKET.md` (all under the package directory),
"builder" `scripts/build_launch_consent_write_consent.py`.

[Observed] The manifest digest above was printed by
`python3 scripts/build_launch_consent_write_consent.py --manifest-digest` and
matched by `sha256sum` of the manifest file. The manifest row (the act's
argument) is the record's `sha256sum`, and the two agree.

## Criteria

1. **F1, the parents — yes.** The record now says: "The branch's first
   recording commit has no parent. Every later recording commit has exactly
   one parent: the branch's tip at the moment of the move. No recording
   commit has any other commit as a parent, including a commit of the trunk
   and a commit that was once on the branch and has since been removed from
   it" (record:62-66). With "moved from its current tip to a recording commit
   whose only parent is that tip, and in no other way" (record:52-53), a
   recording commit can never take a removed commit as a parent, so the
   restore path round 1 found is closed for Syzygy's writes. [Inferred]
   After a branch deletion the next commit is a creation (record:51), and
   the revert section settles which rule applies: "with the branch deleted,
   from no parent" (record:113-114). The branch shares no trunk history
   through any recording commit. The packet's "Undoing a record" section
   (packet:117-120) is accurate and scoped to Syzygy. Its cost bullet is
   overstated in two sentences; see Finding 1.
2. **F2, the transient files — yes.** "Git's own transient files for those
   writes, which the write itself creates and removes: the reference's lock
   file, and the temporary files an object is written through before it is
   renamed into place" (record:55-57). That clause makes a compliant
   implementation possible. Spec line 161's falsifier forbids "a file is
   edited or removed, a working tree, index or reference other than the
   dedicated one changes, or the trunk tip moves". A lock file or temporary
   object file is none of these. [Inferred] The repository uses the `files`
   reference backend (`git rev-parse --show-ref-format` prints `files`), and
   there updating a reference writes the loose reference plus its lock.
3. **F3, hooks — yes.** The record says "Every write runs with the
   repository's hooks disabled, so no hook runs" (record:59-60). It excludes
   "the repository's configuration and hooks" as write targets (record:80-81)
   and "execution" (record:90). [Inferred] Hooks can be disabled per
   invocation without writing configuration or hooks, so the sentence
   requires nothing the record cannot grant. SD:133-137 gives the reason.
4. **F4, rule 6 — yes, with remainders.** [Observed] `--check` printed
   "record and manifest current" (exit 0). `--selftest` printed "30 of 30
   predicates held" (exit 0), and each new mutant names its own refusal
   string (builder:259-272, 326-335). I removed each guarded test from a
   temporary copy of the builder outside the worktree and ran `--selftest`:
   - trunk comparison: 29/30, failing "a reference equal to a non-main trunk
     refused";
   - the reference's trailing slash: 29/30, failing "a reference ending in a
     slash refused";
   - the location's trailing slash: 29/30, failing "a location without its
     trailing slash refused";
   - the parent-rule predicate: 28/30, failing both parent cases;
   - the stale refusal in `run()`: 28/30, failing both `--digests` and
     `--manifest-digest`.

   One docstring predicate still has no killing mutant, and two load-bearing
   clauses have no predicate at all; see Finding 3.
5. **F5 and F7 — F7 yes, F5 partly.** F7: "until it is read or revoked.
   Before any run relies on it, you can also remove the commit"
   (packet:81-82) matches scope 8's "until it is read or revoked" and the
   record's removal path (record:108-111). F5: the direction is right and
   the packet's plain-words version is right (packet:67-70). The SD's
   "proposes the same identity only when that clone's remote is that GitHub
   URL" (SD:171-173), however, states as necessary a condition that is only
   sufficient; see Finding 2.
6. **F6 — yes.** `git diff --stat 1a368d04 HEAD -- openspec` is empty. The
   note is headed "Spec note for a later launch-consent version (not a
   change here)", and it says "No byte of the spec is edited here"
   (SD:142, 151).
7. **Regressions — none in the record.** The parent rule, the hooks sentence
   and the transient-file clause narrow the write or make it possible
   (record:51-68). No exclusion was weakened (record:73-90), and no edit
   contradicts an unedited clause (record:82-83 against record:108-114: the
   operator's removal is outside the consent, and Syzygy never does it).
   The CG-7e registration change narrows that check's reach over
   dispositions files; see Finding 4. [Observed]
   `python3 scripts/check_governance.py` gives: "32 OK, 21 WARN, 0 FAIL (53
   checks) — counts derived, not asserted".

## Findings

**Finding 1 — the packet's cost bullet says of every commit what holds only for Syzygy's** (note)
[Inferred] Packet:93-95 reads "Its first commit has no parent, so it shares
no history with `main`. Every later commit sits on the branch's current tip
and nowhere else." The record constrains only recording commits
(record:62-66). Packet:89-90 itself says "Your coding agent can commit to
that branch as easily as Syzygy can", and nothing stops an agent's or the
operator's commit from merging `main` or re-attaching a removed commit.
After such a commit the branch does share trunk history, or holds a removed
record again. The bullet's closing sentence is correctly scoped ("Syzygy's
next commit … can never bring a removed record back", packet:97-98), and so
is "Undoing a record" (packet:119-120). Repair: begin the two sentences with
"Syzygy's first commit" and "every later Syzygy commit". This is a note,
because the record is right and the misleading words are confined to the
owner-facing summary.

**Finding 2 — the SD states the identity condition as necessary; it is only sufficient** (note)
[Observed] SD:171-173: "proposes the same identity only when that clone's
remote is that GitHub URL". The builder's own `derived_identity`, which the
SD itself cites, keeps only the last two path segments:
- `git@github.com:tzeusy-org/syzygy.git` gives `tzeusy-org-syzygy`;
- `ssh://git@github.com/tzeusy-org/syzygy` gives `tzeusy-org-syzygy`;
- `https://gitlab.com/tzeusy-org/syzygy` gives `tzeusy-org-syzygy`;
- `file:///x/tzeusy-org/syzygy` gives `tzeusy-org-syzygy`;
- `/home/orca/orca/projects/syzygy` gives `projects-syzygy`, as the SD says.

Packet:68-70's "a clone whose remote is not that GitHub URL" carries the
same over-narrow wording. No consent fails either way. Repair: "only when"
becomes "when", for example "when that clone's remote ends in
`tzeusy-org/syzygy` (the GitHub URL in any form)".

**Finding 3 — load-bearing clauses that `--check` does not guard** (note)
[Observed] On a fixture, I removed ", including a commit of the trunk and a
commit that was once on the branch and has since been removed from it" from
the template and regenerated: `stale()` returned `[]`. The `PARENT_RULE`
literal ends at "as a parent" (builder:62-64). The same holds for changing
"only by files it adds" to "by files it adds, edits or removes"
(record:66-67), the add-only rule SD:124-127 says screening scope 8's
population depends on: `stale()` returned `[]`. The docstring claims a
predicate for neither, so neither is a broken claim. One docstring
predicate does lack a killing mutant: "the dedicated reference is a branch
under `refs/heads/`" (builder:24) is tested by `[A-Za-z0-9._/-]+`
(builder:130). That accepts names Git refuses as branches: `scope_problems`
returns no "not a branch" problem for `refs/heads/a..b`, and `.lock`
endings pass the same class. Repair (optional): extend `PARENT_RULE`, or add
an add-only literal with one mutant each, and reject `..`, `.lock`, `//`
and leading-dot components.

**Finding 4 — the new registration leaves a phrase-less stale digest in a dispositions file unchecked, and fails a phrase named without a digest** (note)
[Observed] I ran mutations in a temporary
`ROUND-9-DISPOSITIONS.md` of the package (removed after each run;
`git status --short` was clean afterwards) and read the
`check_governance.py` summary each time:
- A, the phrase with a one-character-off digest: CG-7d FAIL and CG-7e FAIL
  (2 findings). This is the drafter's claim (ROUND-1-DISPOSITIONS.md:31-32),
  confirmed.
- E, the phrase with the correct digest plus a bare one-off
  `Manifest SHA-256:` heading: CG-7e FAIL.
- D, the phrase with the correct digest: 0 FAIL.
- B, a bare one-off `Manifest SHA-256:` heading with no phrase: 0 FAIL.
  The file is no longer registered (check_governance.py:3683-3685), and the
  builder's 64-hex sweep exempts dispositions (builder:185). Under the
  round-1 registration this file was a copy file and its bare heading was
  checked.
- C, the phrase named in prose with no digest: CG-7e FAIL.

So "a stale copy still fails CG-7d or CG-7e" holds for every phrase-linked
copy, and fails for a bare-heading copy in a file that never names the
phrase. A later round's dispositions that names the act phrase, for example
to quote what the owner will type, must also carry the current argument, or
CG-7e fails. The docstring (check_governance.py:3669-3672) says the first
half ("registered only while it quotes the act phrase") but not this
consequence. This follows the `DOSSIER_LOCAL_AGENT` precedent the drafter
cites. It is a note, because no dispositions file in the package quotes any
digest today: the only `ROUND-*-DISPOSITIONS.md` is round 1, and it carries
no 64-hex token, since `--check` exempts it and CG-7e found nothing to
register.
