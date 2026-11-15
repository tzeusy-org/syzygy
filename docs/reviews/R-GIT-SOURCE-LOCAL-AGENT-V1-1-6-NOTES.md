# Source-acquisition entry version 1.1, round 6: dispositions of record

Reviewed record: docs/reviews/R-GIT-SOURCE-LOCAL-AGENT-V1-1-6-RAW.md

[Observed] Round 6 returned **CONFIRM WITH EXCEPTIONS** over `a0017b579ca3ee4174b03ff0159ac609aeae6803`, with four notes and no finding that requires a change. The package `public-git-source-acquisition-local-agent-v1-1` and its subject are frozen at that commit: none of their bytes is edited for these notes, because any edit would retire the review (rule 10). Each note is either carried to a later version of the entry or put to the owner beside the sign-off question.

## 1 — In the copy-class window, the type test's read of the operator's clone is named only in the ledger

[Observed] Not a package edit. The note is for the owner, and it goes to the owner with the sign-off question. The question's covering message adds what the package says in its ledger only: until v1.2's copy step is implemented, in a run v1.2 makes copy-class, today's code also reads the named object's type header in the operator's clone, whatever its type (`launch.ts:161-168`), before the run refuses or proceeds. The same ruling, "Allow and disclose" (2026-11-10), covers this read. The three other places that list the window's reads (E3's disclosure paragraph, the Dependency bullet and the owner page) take "the named object's type header" in a later version.

## 2 — Two leftover sentences still say the whole-body read "exists today"

[Observed] Left for a later version (editorial). Both sentences sit in paragraphs labelled `[Observed, at bb89b8cc, before #816]`, under headings that say "since repaired", so their scope is stated. A later version scopes them "at `bb89b8cc`" or puts them in the past tense.

## 3 — The owner page's Option 1 text conflicts with the ruled timing of the narrowing

[Observed] Left for a later version (editorial). The bold disclosure two bullets above it in the same item gives the ruled timing, "until the launch-code narrowing (item 1b) lands", as the reviewer found. A later version says "end when item 1b lands".

## 4 — The worktree-read sweep's predicate misses the form check's reading of `core.bare`

[Observed] Left for a later version (editorial). The reviewer finds that the claim holds as written. The form check's read of the `[core]` key `bare` (`clone-shape.ts:57`) is a form-check read, not one made "to locate its repository's working trees". In a no-copy run it is admitted by the form-check clause. In the copy-class window it falls under "its form", which is disclosed. A later version names that key in the evidence sentence.
