# Semantic delta DOSSIER-LOCAL-AGENT-V1-6 — a changed-block list for later fidelity rounds

> **Candidate — binds nothing.** [Inferred] Agent-authored proposal for
> `polaris-dossier-local-agent-mode` version 1.6. No review, owner selection,
> installation, tag or product change is claimed here.

**Artifacts:** the three files under `proposed/`, applied to
`openspec/changes/polaris-dossier-local-agent-mode/` at version 1.5.
**Stable IDs affected:** REQ-polaris-generation-035, amended in place: one
packet sentence group, its validation paragraph, its continuity paragraph, its
REQ-polaris-generation-006 reading, one scenario's THEN line, four added
scenarios, its test form and one added `warrants.decisions` entry. The spec's opening paragraph names version 1.6.
REQ-polaris-generation-033, 034 and 036 keep their bytes. No identifier is
renamed.
**Change class:** Normative; the whole package takes the normative review floor.
**Author:** Claude, for `syzygy-pdja.26` (discovered from `syzygy-pdja.19`).
**Date:** 2026-11-09.

## Warrant

[Observed] The owner direction `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`
(`.syzygy/governance/decisions/OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md`),
a plain direction recorded from two structured questions answered on
2026-11-09. REQ-polaris-generation-035 names it in `warrants.decisions`. The
owner's selections, quoted from that record:

- "Draft the v1.6 amendment — I draft a CC-REV-2 change (the smaller form: a
  changed-block list added to the full packet, or full delta), review it, and
  offer it for sign-off."
- "Suggest only (Recommended) — Keep continuing sessions as the default; the
  usage note recommends --fresh when the carried context is large. The run can
  still go unattended." This version needs no change for that answer, and makes
  none.

The record's item 2 adds: "The drafter chooses between the smaller form and the
full delta and says why."

The options, the clauses each would change and the risks are in the design
note `docs/polaris-generation/fidelity-delta-review-proposal.md` (bead
`syzygy-pdja.19`), which binds nothing. Its "smaller delta" paragraph is the
form drafted here.

## Which form, and why

[Inferred] The selected option names two forms and leaves the choice to the
drafter. This package drafts the smaller one and recommends it.

**Drafted: the smaller form.** A fidelity packet delivered to a continuing
review session as a later round stays the whole packet, and also carries a
list, written by Syzygy, of the claim blocks and inventory entries that changed
since that session's last recorded verdict. The verdict still covers every
entry of the whole packet, and a revision still retires every earlier verdict.
A confirmation means exactly what it means under version 1.5.

**Not drafted: the full delta**, which would carry confirmed entries forward
into a later round. The test applied here is the drafter's, set in the
drafting brief, not the owner's (the direction leaves the choice to the
drafter): draft it only if its retirement and rebinding rules could be stated
without weakening REQ-polaris-generation-035. [Inferred] They cannot, for these
reasons:

1. REQ-polaris-generation-035 says "Any revision of the subject or the
   inventory retires the verdicts bound to it." A carried-forward entry is an
   entry of a retired verdict that still counts. Any rule that admits one is an
   exception to that sentence, so it weakens it by construction, whatever the
   rule's conditions.
2. Its completeness rule, "that every inventory entry and every claim block has
   an entry", is met today by one verdict over one packet. A composite verdict
   meets it with entries no reviewer wrote on the packet that counts.
3. Coverage and omission are judged over the whole draft. A repair that moves
   or removes a claim can uncover an omission in an inventory entry whose own
   bytes never changed, so coverage cannot be carried entry by entry.
4. A block's meaning depends on its neighbours (REQ-polaris-generation-034
   judges "a table cell's claim as read with its row and column labels"). A
   rule safe against that would carry forward only when the whole page is
   unchanged, which saves nothing; any looser rule is a judgement of which
   changes matter, close to the generator classifying "its own wording change
   as immaterial", which REQ-polaris-generation-006 forbids.
5. REQ-polaris-generation-033 binds a verdict by rebuilding one packet. A
   composite verdict needs a chain of packets and the rule that admitted each
   entry, all rebuilt at render.

**Also not drafted: a delta-only packet with fresh entries.** [Inferred] A
third form, named by the round-1 review: deliver only the changed blocks to a
continuing session, while its verdict still writes a fresh entry for every
block, bound to a chain of the base packet plus the delta, rebuilt at render.
It revives no retired entry, so reasons 1 and 2 do not reach it, and it would
cut the tokens each later round adds. It is not chosen because:

- it displaces REQ-polaris-generation-035's "a review packet containing only
  the frozen subject": in the round that counts the reviewer holds the whole
  artifact only through its retained context of earlier rounds, and whether it
  still holds it is Inferred, never Observed;
- a fresh entry for a block the reviewer was not given in that round is a
  judgement of bytes it did not read in that round, which is close to
  carrying forward under another name;
- it needs reason 5's chain of packets, rebuilt at render: what the counted
  verdict covers is the first round's whole packet composed with every later
  delta, so its binding reaches back to the session's first round. The chosen
  form needs no chain: each list names the base core digest, the digest of
  the base round's packet rebuilt without its own list from that round's
  inputs alone, so a packet's rebuild reads only its own round's and its base
  round's inputs;
- it saves nothing for a `--fresh` session, which must get the whole packet.

It is a lawful candidate for a later version if the owner wants the token
saving and accepts that displacement; this version does not offer it.

**The honest trade-off.** [Inferred] The smaller form keeps every confirmation's
meaning, but it saves reviewer attention, not tokens read. Each later round's
packet is the whole packet plus a short list, so it is slightly larger, not
smaller, and it does not answer `syzygy-pdja.19`'s measurement: the Redis run's
fidelity session spent 23.3M tokens, almost all re-reading earlier context. The
token savings stay with what is lawful already: batching repairs into fewer
rounds and the `--fresh` session the usage note recommends. The full delta
would save tokens on every later round, at the cost of what a confirmation
means. The smaller form also adds one risk: a reviewer told what changed may
give the rest less care. The list makes structural what REQ-polaris-generation-035
already discloses for a continuing reviewer ("which may anchor this one"), so
this version makes the review page say so too.

## What changes, in plain words

1. A fidelity packet that Syzygy delivers as a later round into a review
   session's directory carries a changed-block list when it has a base round:
   the latest earlier round Syzygy delivered into that same directory for which
   it recorded a verdict written there, whether that verdict counted, failed
   validation or was refused. Session identity is the directory, not a declared
   identifier, and the predicate is over Syzygy's delivery and verdict records.
   Only a verdict recorded before the later round's delivery makes a round
   eligible as the base; the base
   is chosen at delivery and recorded with it, so a later verdict cannot move
   it.
2. The list names the base core digest (the digest of the base round's
   packet rebuilt without a list, from that round's inputs alone), every
   claim block and
   inventory entry added, removed, or with different bytes or cited spans, and
   whether the understanding record changed, and says it compares nothing else
   (draft content outside claim blocks, such as diagram nodes and edges and
   the sections and their titles, and the criteria, verdict schema and
   pinned revision, are not compared). Syzygy finds
   these by comparing bytes, and may not add or drop an entry by judging whether
   a change matters.
3. No other packet carries one: not a packet into a directory with no earlier
   round (a new session, which is what `--fresh` makes, by the clause, not only
   by the design), not one whose earlier rounds have no recorded verdict, not a
   rendered-design packet.
4. The list is inside the packet and its digest. Syzygy rebuilds it at
   validation and at render from the current frozen subject, the base round
   recorded with the delivery, and that round's recorded inputs: its frozen
   draft with the understanding record, its frozen inventory, its pinned
   revision, and the criteria and verdict schema its packet carried, with its
   cited spans re-read from the blobs Syzygy verified. The base core digest is
   re-derived by rebuilding, from those inputs alone, the packet the base round
   would carry without a changed-block list, never copied, so no rebuild reads
   the inputs of any round but its own and its base round's. A verdict that names the digest of
   a packet with a different list, or a base input that is altered or missing,
   leaves the verdict uncounted. An altered copy in the session's directory is
   caught, as in version 1.5, only by the waiting command's re-hash; that the
   session read its packet unaltered stays Inferred.
5. A verdict must still have an entry for every claim block and inventory entry,
   whether or not the list names it. The list confirms nothing and carries
   nothing forward.
6. The review page says when a counted verdict's packet carried a list: the
   session was delivered a packet listing what changed, which may narrow its
   attention, and the
   verdict has an entry for every entry. That the rebuilt packet carries the
   list and that the verdict has every entry are Observed; which round is the
   base (it rests on stored delivery and verdict records) and that the
   reviewer considered every entry are Inferred.
7. The scenario "Review packet without the authoring exchange" keeps its "and
   nothing else", with the list named as the one addition where it is required.

## What does not change

[Inferred] What a counted verdict confirms; the completeness rule; which
verdicts a revision retires; the rendered-design review; who may review and how
a session is started; the `--fresh` behaviour and the default of a continuing
session; the delivery and re-hash rules for a waiting session; every Observed
and Inferred label version 1.5 sets; no read, egress, write or execution
permission. REQ-polaris-generation-033 and 034 keep their bytes; this version
reads one REQ-033 phrase, below.

## Contract readings the review must test

[Inferred] These are the author's readings, not settled law.

- REQ-polaris-generation-035's scenario says a fidelity packet holds the listed
  items "and nothing else". That is a rule of this requirement, not of a
  contract, and this version amends it in place to name the list. CC-REV-2
  makes the amendment one change: the requirement, its scenario, its falsifier
  and the design and proposal move together.
- REQ-polaris-generation-033 re-derives "every verdict's binding, by rebuilding
  the review packet from the frozen subject and comparing its digest to the one
  the verdict names". This version reads "the frozen subject", for a packet that
  carries a list, as the current frozen subject and the base round's recorded
  inputs, from which the base core packet, the base round's packet without its
  own list, is rebuilt, and says so in REQ-035 rather than editing REQ-033.
- REQ-polaris-generation-006 (as the understanding amendment states it): "A
  draft SHALL become ready for owner review only after independent fidelity and
  rendered-design reviews confirm the frozen bundle", "Reviewers SHALL receive
  the artifact, governing references and acceptance criteria without the
  authoring conversation", "A revision SHALL retire dependent review evidence"
  and "The generator SHALL not classify its own wording change as immaterial."
  The list is Syzygy's byte comparison of frozen subjects, not the authoring
  conversation and not a materiality call; a verdict still confirms the whole
  frozen bundle; nothing retired is revived. None of the four is displaced.
  The same overlay's "The candidate-authoring stage SHALL NOT define or narrow
  its own review denominator." is also met: the authoring stage does not write
  the list, and the denominator stays the whole packet, though the list may
  narrow a reviewer's attention (disclosed).
- VIS-2 and REQ-polaris-generation-033's rule against an Observed label resting
  on a stored record: the list's presence in the packet Syzygy rebuilt and the
  verdict's having every entry are Observed; which round is the base rests on
  stored delivery and verdict records and is Inferred; the reviewer's
  consideration of the entries the list does not name is Inferred, like every
  claim about what a review context read.
- The base round's stored inputs lie within the agent sessions' write reach,
  like the current ones. Rebuilding from them fails closed: an alteration or a
  missing input can stop a verdict counting, never make one count.

## Current and proposed clauses, in full

[Observed] Current blocks are copied by script from the installed version 1.5
bytes; proposed blocks from the patched bytes, paragraph by paragraph. The
patches are the complete proposed bytes, and `PROPOSED-SUBJECTS.json` carries
their digests.

### spec.md

Current:

> Exact behavioral delta, version 1.5, a candidate on version 1.4. Version 1.0 was signed off by the owner on 2026-10-06 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`), version 1.1 on 2026-10-07 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`) and version 1.2 on 2026-10-14 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`), and version 1.3 on 2026-11-04 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`); version 1.4's standing is its own sign-off record, and these bytes bind only by the owner's sign-off of version 1.5. This change applies to the existing polaris-generation capability. It adds four requirements that define a second authoring mode, the operator-agent mode, beside the provider mode that the adopted requirements describe. It edits no byte of any predecessor requirement or scenario, in the base change or in the understanding amendment as amended by the tree-form adoption. For a run in the operator-agent mode it displaces or reads the predecessor text that each requirement below names, and only that text; for a run in the provider mode every predecessor requirement and scenario keeps its bytes and its meaning. The provider mode is parked by the owner direction of 2026-10-05, not withdrawn. Under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`, item 1, this change could not be signed off until the owner had adopted, by the owner's own act, an amendment to SEC-3 that permits the operator's agent session to build and run the observed project on the host. The owner adopted it on 2026-10-06 as doctrine amendment D9, on SEC-3 and the owner's attended agent session, with its credential condition (`.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`, row D9); this change cites it as D9.

Proposed:

> Exact behavioral delta, version 1.6, a candidate on version 1.5. Version 1.0 was signed off by the owner on 2026-10-06 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`), version 1.1 on 2026-10-07 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`) and version 1.2 on 2026-10-14 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`), and version 1.3 on 2026-11-04 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`); versions 1.4 and 1.5 stand on their own sign-off records, and these bytes bind only by the owner's sign-off of version 1.6. This change applies to the existing polaris-generation capability. It adds four requirements that define a second authoring mode, the operator-agent mode, beside the provider mode that the adopted requirements describe. It edits no byte of any predecessor requirement or scenario, in the base change or in the understanding amendment as amended by the tree-form adoption. For a run in the operator-agent mode it displaces or reads the predecessor text that each requirement below names, and only that text; for a run in the provider mode every predecessor requirement and scenario keeps its bytes and its meaning. The provider mode is parked by the owner direction of 2026-10-05, not withdrawn. Under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`, item 1, this change could not be signed off until the owner had adopted, by the owner's own act, an amendment to SEC-3 that permits the operator's agent session to build and run the observed project on the host. The owner adopted it on 2026-10-06 as doctrine amendment D9, on SEC-3 and the owner's attended agent session, with its credential condition (`.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`, row D9); this change cites it as D9.

### spec.md

Current:

> In the operator-agent mode the independent inventory and the fidelity and rendered-design reviews that REQ-polaris-generation-006 requires SHALL each be produced in a separate top-level agent session that the operator starts (owner direction `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`, item 2); a session the operator starts in a new terminal, or by typing the command Syzygy printed behind the agent tool's shell-escape prefix (in Claude Code, `!`) in the authoring session's terminal, is a session the operator starts; a subagent spawned by the authoring session, a process the authoring session's agent launches, including a headless session it starts and whose output it reads, or any context whose instructions the authoring session wrote, SHALL NOT satisfy the inventory or a review. The inventory context SHALL start from Syzygy's inventory brief and SHALL NOT be given the draft; Syzygy SHALL check its quotations and citations as REQ-polaris-generation-034 checks a draft, and SHALL freeze it before the fidelity review. For each review Syzygy SHALL emit a review packet containing only the frozen subject (the draft with its understanding record, or for the rendered-design review the rendered pages excluding one named review-status region), the cited spans as Syzygy read them, the governing criteria, the verdict schema, the pinned revision and the packet's own digest, so that the review context can re-hash the packet before it reads it; the fidelity packet SHALL also carry the frozen inventory, as the criterion against which REQ-polaris-generation-006 measures coverage, and its cited spans SHALL be those cited by the draft and by the frozen inventory, screening-admitted only; the pages published after the rendered-design review SHALL be the reviewed pages with only the named review-status region changed, and a change outside that region is a revision of the subject; the packet SHALL NOT contain the brief's authoring exchange, any transcript or the agent's read account. The review context SHALL write a structured verdict that names the packet's digest and records inventory-to-draft coverage for every inventory entry, draft-to-source support for every claim block, the accuracy of every inventory entry against the cited spans in its packet, and every finding with its severity and its deficient subject (discovery, understanding, clarification, argument, prose, asset or rendering).
>
> Syzygy SHALL validate the verdict before it counts: its schema; that the packet digest equals the digest of the packet Syzygy rebuilds, at validation and at render, from the current frozen subject; that every inventory entry and every claim block has an entry; that every quotation the verdict relies on verifies as in REQ-polaris-generation-034; and that a verdict with an unresolved blocking finding does not declare the subject ready. The rendered-design criteria SHALL ask whether the opening states why the project exists, whether the lead uses the category term a reader knows, whether warnings sit in the one sentence and the appendix, whether a page is too long to read, whether a list repeats a diagram, and whether the page reads as a person explaining the project. The rendered pages of the rendered-design packet SHALL include the evidence view. The fidelity verdict SHALL judge an uncited judgement block on one question, whether it asserts a fact about the project; if it does, that is a blocking finding, repaired by citing the fact or stating it as Unknown; otherwise the entry is `advisory` and carries no support judgment, and validation SHALL refuse a verdict that marks an uncited judgement accurate or supported, and `advisory` for a block that cites. For an inventory entry or withheld item as REQ-polaris-generation-034 defines them, the verdict's entry SHALL be `withheld`, which is no accuracy judgment and no support finding, is not an unresolved material omission and does not block readiness; validation SHALL refuse a verdict that marks such an entry accurate or supported, and SHALL refuse `withheld` for any other entry. For those `withheld` entries and `advisory` entries only, this requirement names as displaced its own accuracy, coverage and omission requirements, the rule below that unresolved material omissions prevent readiness, REQ-polaris-generation-006's "draft-to-source support" and, for an `advisory` entry, REQ-polaris-generation-002's "Source-supported inference SHALL expose its admitted premises". A verdict that fails validation SHALL be recorded and SHALL NOT count as a review. Any revision of the subject or the inventory retires the verdicts bound to it.

Proposed:

> In the operator-agent mode the independent inventory and the fidelity and rendered-design reviews that REQ-polaris-generation-006 requires SHALL each be produced in a separate top-level agent session that the operator starts (owner direction `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`, item 2); a session the operator starts in a new terminal, or by typing the command Syzygy printed behind the agent tool's shell-escape prefix (in Claude Code, `!`) in the authoring session's terminal, is a session the operator starts; a subagent spawned by the authoring session, a process the authoring session's agent launches, including a headless session it starts and whose output it reads, or any context whose instructions the authoring session wrote, SHALL NOT satisfy the inventory or a review. The inventory context SHALL start from Syzygy's inventory brief and SHALL NOT be given the draft; Syzygy SHALL check its quotations and citations as REQ-polaris-generation-034 checks a draft, and SHALL freeze it before the fidelity review. For each review Syzygy SHALL emit a review packet containing only the frozen subject (the draft with its understanding record, or for the rendered-design review the rendered pages excluding one named review-status region), the cited spans as Syzygy read them, the governing criteria, the verdict schema, the pinned revision and the packet's own digest, so that the review context can re-hash the packet before it reads it; the fidelity packet SHALL also carry the frozen inventory, as the criterion against which REQ-polaris-generation-006 measures coverage, and its cited spans SHALL be those cited by the draft and by the frozen inventory, screening-admitted only; the pages published after the rendered-design review SHALL be the reviewed pages with only the named review-status region changed, and a change outside that region is a revision of the subject; the packet SHALL NOT contain the brief's authoring exchange, any transcript or the agent's read account. A fidelity packet that Syzygy delivers as a later round into a review session's directory SHALL also carry a changed-block list that Syzygy writes (owner direction `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`), where that packet has a base round. Its base round is the latest earlier round Syzygy delivered into that same directory for which, before it delivers the later round, Syzygy has recorded a verdict written there for that round, whether that verdict counted, failed validation or was refused; Syzygy chooses the base round when it delivers the later round and records that choice with the delivery, and a verdict recorded after that delivery does not change it; a round with no verdict recorded before the delivery is never a base, and a packet delivered into a directory that has received no earlier round, as for a new session, has no base round and carries no list. The list names the base core digest, which is the digest of the packet the base round would carry without a changed-block list, rebuilt from that round's recorded inputs alone; lists, by the identity the draft or the inventory gives it, every claim block and every inventory entry that is in one of the two packets and not in the other, or whose bytes or cited spans as Syzygy read them differ between the two; says whether the understanding record differs; and says that it compares nothing else, so that a difference in draft content outside claim blocks, such as a diagram node or edge or the draft's sections and their titles, or in the criteria, the verdict schema or the pinned revision, is not shown by it. Syzygy derives the list by comparing bytes alone, and SHALL NOT omit an entry from it or add one by any judgement of whether a change matters. No other packet, a rendered-design packet included, carries a changed-block list. The list is part of the packet and of its digest and is a pointer for the reviewer, nothing more: it confirms nothing, carries no verdict entry forward, and changes neither what a verdict must cover, which stays the whole packet, nor which verdicts a revision retires. The review context SHALL write a structured verdict that names the packet's digest and records inventory-to-draft coverage for every inventory entry, draft-to-source support for every claim block, the accuracy of every inventory entry against the cited spans in its packet, and every finding with its severity and its deficient subject (discovery, understanding, clarification, argument, prose, asset or rendering).
>
> Syzygy SHALL validate the verdict before it counts: its schema; that the packet digest equals the digest of the packet Syzygy rebuilds, at validation and at render, from the current frozen subject and, for a packet that carries a changed-block list, from the base round Syzygy recorded with the delivery and that round's inputs as Syzygy recorded them (the base's frozen draft with its understanding record, its frozen inventory, its pinned revision, and the criteria and verdict schema its packet carried, with the base's cited spans re-read from the blobs Syzygy verified at that revision), the base core digest being re-derived by rebuilding from those inputs alone the packet that round would carry without a changed-block list, never copied from a delivery record, so that no rebuild reads the inputs of any round but its own and its base round's; that every inventory entry and every claim block has an entry, whether or not a changed-block list names it; that every quotation the verdict relies on verifies as in REQ-polaris-generation-034; and that a verdict with an unresolved blocking finding does not declare the subject ready. The rendered-design criteria SHALL ask whether the opening states why the project exists, whether the lead uses the category term a reader knows, whether warnings sit in the one sentence and the appendix, whether a page is too long to read, whether a list repeats a diagram, and whether the page reads as a person explaining the project. The rendered pages of the rendered-design packet SHALL include the evidence view. The fidelity verdict SHALL judge an uncited judgement block on one question, whether it asserts a fact about the project; if it does, that is a blocking finding, repaired by citing the fact or stating it as Unknown; otherwise the entry is `advisory` and carries no support judgment, and validation SHALL refuse a verdict that marks an uncited judgement accurate or supported, and `advisory` for a block that cites. For an inventory entry or withheld item as REQ-polaris-generation-034 defines them, the verdict's entry SHALL be `withheld`, which is no accuracy judgment and no support finding, is not an unresolved material omission and does not block readiness; validation SHALL refuse a verdict that marks such an entry accurate or supported, and SHALL refuse `withheld` for any other entry. For those `withheld` entries and `advisory` entries only, this requirement names as displaced its own accuracy, coverage and omission requirements, the rule below that unresolved material omissions prevent readiness, REQ-polaris-generation-006's "draft-to-source support" and, for an `advisory` entry, REQ-polaris-generation-002's "Source-supported inference SHALL expose its admitted premises". A verdict that fails validation SHALL be recorded and SHALL NOT count as a review. Any revision of the subject or the inventory retires the verdicts bound to it. Where a base round's input, or the base round recorded with the delivery, is missing or does not rebuild, the packet that names it cannot be rebuilt, and a verdict on it SHALL NOT count; no other round's verdict depends on that base round's inputs except a verdict on a packet whose base round it is. Where REQ-polaris-generation-033 re-derives a verdict's binding by rebuilding the review packet from the frozen subject, a packet that carries a changed-block list is rebuilt as this paragraph says.

### spec.md

Current:

> An inventory or review session MAY be started before its input exists (owner direction `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`). At the start of a run Syzygy MAY write the inventory brief into the inventory session's directory, make a directory for each review session, and print for each session the command that starts it; the operator starts each such session as above, and neither Syzygy nor the authoring session starts, resumes or signals it. Because a waiting session holds its terminal for the whole run, Syzygy SHALL print its command for a new terminal only and SHALL refuse a shell-escape launch form declared for it. A waiting session SHALL obtain its input only through one Syzygy command named for its directory, which reads only the local file system and makes no network request; waits at most a bounded time, never past the run's declared deadline, and then tells the session to run it again; and before the session reads its input re-hashes it against the digest Syzygy recorded in the run's state directory when it wrote it, refusing on any mismatch. Syzygy SHALL deliver a review packet to a waiting session only by writing the packet and its digest into that session's directory as the next numbered round and recording the delivery, and only after the gates of REQ-polaris-generation-033, including the per-project provider statement for the waiting session's own declared agent tool, pass at that delivery; a delivery SHALL NOT change the session's declared agent tool, version or model. The command Syzygy prints for a waiting session SHALL pre-approve, where the agent tool offers rules that narrow, only read tools over the session's own directory (and, for the inventory session, the clone) and that one Syzygy command for that directory, and never a write or a general shell; where the agent tool offers no rules that narrow, Syzygy SHALL print no pre-approval and SHALL say so. Where the agent tool can limit which of its own tools a session has at all, the printed command SHALL also limit a waiting session to its read tools and the shell its one command runs in. A waiting session SHALL hand its inventory or verdict to that command, as content it passes to the command or as a file under its own directory that the command reads; every instruction Syzygy prints for passing content SHALL pass it so that the shell expands nothing in it, and SHALL say so. Syzygy writes the content into the session's directory under the role's own file name (the inventory, or the verdict of a round Syzygy delivered), and only there, and checks it as REQ-polaris-generation-034 and this requirement check an inventory or a verdict. A waiting session SHALL NOT carry the execution permission of REQ-polaris-generation-033. One waiting review session MAY receive the packet of each later revision of its subject as its next round, and a verdict it writes on that packet is validated and counted under the rules above. For every counted verdict the review page SHALL disclose whether its session had received an earlier round, or declares the session identifier of an earlier verdict of its kind, and where it had, that the reviewer has seen its own earlier verdict, which may anchor this one. The delivery records, the delivered files and the declared session identifiers lie within the agent sessions' write reach: that a waiting session read the packet Syzygy delivered, unaltered, that the operator used the printed command, that the agent tool applied the printed pre-approval as written, that no allow rule in a settings layer the operator keeps outside the printed command (the agent tool's user, project or local settings) widens what the session may run unattended, that the session started no subagent, which would act with the same pre-approval, that the printed limit on the agent tool's own tools leaves the session no other of them, and a reviewer's continuity or its absence are Inferred; whether a tool from outside the agent tool's own set, such as one connected through the operator's account, remains available to the session, and whether the agent tool's rule for the one command admits an output redirection, a write outside the role's own file, are Unknown; and no surface states any of them as Observed.
>
> For a run in the operator-agent mode this requirement reads REQ-polaris-generation-006 as follows, and displaces only what it names: "Reviewers SHALL receive the artifact, governing references and acceptance criteria without the authoring conversation" is met by the packet rule above; the inventory "covering the entire admitted source population" is the inventory context's self-reported coverage of the clone at the pinned revision, labelled Inferred, and readiness SHALL NOT claim that coverage as verified; in "The fidelity reviewer SHALL verify inventory accuracy and completeness against the owning admitted sources rather than trusting preparation output.", accuracy is verified by the fidelity reviewer for each inventory entry against the cited spans in its packet, and completeness is the inventory context's self-report, labelled Inferred and never presented as verified, because the owner's ruling confines the reviewer to its packet; in "The bounded workflow SHALL prepare or validate the independent inventory and questions from admitted sources", the inventory is prepared by the inventory context from the clone it read without restriction, and Syzygy validates its quotations and citations against the blobs it read and verified at the pinned revision, while its preparation from the whole source population is the inventory context's self-report, labelled Inferred; and the words "accounting for those calls in its run budget" read as the operator-declared limits of REQ-polaris-generation-033, which cover the inventory and review contexts. Every other sentence and scenario of REQ-polaris-generation-006, including the rule that unresolved material omissions prevent readiness, the fresh-reader review of RFC7-25 and the rule that the generator does not classify its own wording change as immaterial, is unchanged.

Proposed:

> An inventory or review session MAY be started before its input exists (owner direction `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`). At the start of a run Syzygy MAY write the inventory brief into the inventory session's directory, make a directory for each review session, and print for each session the command that starts it; the operator starts each such session as above, and neither Syzygy nor the authoring session starts, resumes or signals it. Because a waiting session holds its terminal for the whole run, Syzygy SHALL print its command for a new terminal only and SHALL refuse a shell-escape launch form declared for it. A waiting session SHALL obtain its input only through one Syzygy command named for its directory, which reads only the local file system and makes no network request; waits at most a bounded time, never past the run's declared deadline, and then tells the session to run it again; and before the session reads its input re-hashes it against the digest Syzygy recorded in the run's state directory when it wrote it, refusing on any mismatch. Syzygy SHALL deliver a review packet to a waiting session only by writing the packet and its digest into that session's directory as the next numbered round and recording the delivery, and only after the gates of REQ-polaris-generation-033, including the per-project provider statement for the waiting session's own declared agent tool, pass at that delivery; a delivery SHALL NOT change the session's declared agent tool, version or model. The command Syzygy prints for a waiting session SHALL pre-approve, where the agent tool offers rules that narrow, only read tools over the session's own directory (and, for the inventory session, the clone) and that one Syzygy command for that directory, and never a write or a general shell; where the agent tool offers no rules that narrow, Syzygy SHALL print no pre-approval and SHALL say so. Where the agent tool can limit which of its own tools a session has at all, the printed command SHALL also limit a waiting session to its read tools and the shell its one command runs in. A waiting session SHALL hand its inventory or verdict to that command, as content it passes to the command or as a file under its own directory that the command reads; every instruction Syzygy prints for passing content SHALL pass it so that the shell expands nothing in it, and SHALL say so. Syzygy writes the content into the session's directory under the role's own file name (the inventory, or the verdict of a round Syzygy delivered), and only there, and checks it as REQ-polaris-generation-034 and this requirement check an inventory or a verdict. A waiting session SHALL NOT carry the execution permission of REQ-polaris-generation-033. One waiting review session MAY receive the packet of each later revision of its subject as its next round, and a verdict it writes on that packet is validated and counted under the rules above. For every counted verdict the review page SHALL disclose whether its session had received an earlier round, or declares the session identifier of an earlier verdict of its kind, and where it had, that the reviewer has seen its own earlier verdict, which may anchor this one. For every counted verdict whose packet carried a changed-block list the review page SHALL also disclose that the session was delivered a packet carrying a list of the claim blocks and inventory entries changed since an earlier round, which may narrow its attention to them, and that the verdict has an entry for every entry of the whole packet. That the packet Syzygy rebuilt carries the list, and that the verdict has every entry, are Observed; which earlier round is the base rests on the delivery and verdict records Syzygy stored, which lie within the agent sessions' write reach, and is Inferred; and that the session read that list, and that the reviewer considered every entry, including those the list does not name, are Inferred. That a waiting session read the delivered list unaltered is Inferred, as for the rest of its packet; the waiting command's re-hash is the only check on the delivered copy. The delivery records, the delivered files and the declared session identifiers lie within the agent sessions' write reach: that a waiting session read the packet Syzygy delivered, unaltered, that the operator used the printed command, that the agent tool applied the printed pre-approval as written, that no allow rule in a settings layer the operator keeps outside the printed command (the agent tool's user, project or local settings) widens what the session may run unattended, that the session started no subagent, which would act with the same pre-approval, that the printed limit on the agent tool's own tools leaves the session no other of them, and a reviewer's continuity or its absence are Inferred; whether a tool from outside the agent tool's own set, such as one connected through the operator's account, remains available to the session, and whether the agent tool's rule for the one command admits an output redirection, a write outside the role's own file, are Unknown; and no surface states any of them as Observed.
>
> For a run in the operator-agent mode this requirement reads REQ-polaris-generation-006 as follows, and displaces only what it names: "Reviewers SHALL receive the artifact, governing references and acceptance criteria without the authoring conversation" is met by the packet rule above; the inventory "covering the entire admitted source population" is the inventory context's self-reported coverage of the clone at the pinned revision, labelled Inferred, and readiness SHALL NOT claim that coverage as verified; in "The fidelity reviewer SHALL verify inventory accuracy and completeness against the owning admitted sources rather than trusting preparation output.", accuracy is verified by the fidelity reviewer for each inventory entry against the cited spans in its packet, and completeness is the inventory context's self-report, labelled Inferred and never presented as verified, because the owner's ruling confines the reviewer to its packet; in "The bounded workflow SHALL prepare or validate the independent inventory and questions from admitted sources", the inventory is prepared by the inventory context from the clone it read without restriction, and Syzygy validates its quotations and citations against the blobs it read and verified at the pinned revision, while its preparation from the whole source population is the inventory context's self-report, labelled Inferred; and the words "accounting for those calls in its run budget" read as the operator-declared limits of REQ-polaris-generation-033, which cover the inventory and review contexts. A changed-block list is written by Syzygy from the frozen subjects and is not the authoring conversation; it is a comparison of bytes, not the generator's classification of its own wording change as immaterial; it is not written by the candidate-authoring stage and leaves the review denominator the whole packet, so "The candidate-authoring stage SHALL NOT define or narrow its own review denominator." is met; and because a verdict on a packet that carries one still covers every inventory entry and claim block of the whole packet, "confirm the frozen bundle" and "A revision SHALL retire dependent review evidence" keep their meaning here and are not displaced. Every other sentence and scenario of REQ-polaris-generation-006, including the rule that unresolved material omissions prevent readiness, the fresh-reader review of RFC7-25 and the rule that the generator does not classify its own wording change as immaterial, is unchanged.

### spec.md

Current:

> - **WHEN** Syzygy emits a fidelity review packet for a frozen draft
> - **THEN** the packet holds the frozen draft with its understanding record, the spans cited by the draft and by the frozen inventory as Syzygy read them, the criteria with the frozen inventory, the verdict schema, the pinned revision and its own digest, and nothing else
> - **AND** its digest is recorded in the run record

Proposed:

> - **WHEN** Syzygy emits a fidelity review packet for a frozen draft
> - **THEN** the packet holds the frozen draft with its understanding record, the spans cited by the draft and by the frozen inventory as Syzygy read them, the criteria with the frozen inventory, the verdict schema, the pinned revision and its own digest, and, only where this requirement requires one, a changed-block list, and nothing else
> - **AND** its digest is recorded in the run record

### spec.md

Current:

(none)

Proposed:

> #### Scenario: Later round carries a changed-block list
>
> - **WHEN** Syzygy delivers a fidelity packet as a later round into a review session's directory, and before that delivery it had recorded a verdict written in that directory for an earlier round it delivered there, whether that verdict counted, failed validation or was refused
> - **THEN** Syzygy records the base round with the delivery, and the packet holds everything the first round's packet would hold for the current frozen draft and inventory, and a changed-block list naming the base core digest, rebuilt from the base round's inputs alone without a list, every claim block and inventory entry added, removed, or with changed bytes or cited spans since that packet, whether the understanding record changed, and that it compares nothing else
> - **AND** a packet delivered into a directory with no earlier round, a packet whose earlier rounds have no verdict recorded before its delivery, and a rendered-design packet carry no changed-block list, and a verdict recorded after a delivery does not change that delivery's base round
>
> #### Scenario: Changed-block list confirms nothing
>
> - **WHEN** a verdict on a packet that carries a changed-block list omits an entry for a claim block or inventory entry that the list does not name
> - **THEN** validation fails, the verdict is recorded and does not count
> - **AND** no entry of a verdict on the base round's packet counts for the current revision
>
> #### Scenario: Changed-block list rebuilt with its packet
>
> - **WHEN** a verdict names the digest of a packet whose changed-block list differs from the one Syzygy rebuilds, or the base round recorded with the delivery, or that round's stored frozen draft, understanding record, inventory, pinned revision, criteria or verdict schema, is altered or missing at validation or render
> - **THEN** the packet digest the verdict names is not that of a packet Syzygy can rebuild, and Syzygy records the verdict and refuses to count it
> - **AND** readiness names the review still required, and a verdict on a packet whose base round is a different round still counts if its own packet rebuilds
>
> #### Scenario: Changed-block list disclosed
>
> - **WHEN** a counted verdict's packet carried a changed-block list
> - **THEN** the review page discloses that the session was delivered a packet carrying a list of the claim blocks and inventory entries changed since an earlier round, which may narrow its attention, and that the verdict has an entry for every entry; the list's presence in the rebuilt packet and the verdict's entries are labelled Observed, and which round is the base, the session's reading of the list and the reviewer's consideration of the entries the list does not name are labelled Inferred
> - **AND** no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round

### spec.md

Current:

> - **Case:** Run the review step against controlled frozen drafts, inventories and verdict files, varying the packet digest, the stored frozen subject, the declared session identifiers and launch forms, verdict completeness, quotation validity and finding severity independently, and including uncited judgement blocks and withheld-only entries; and with sessions started to wait before their input exists, varying the delivered bytes and the recorded digests, the time waited against the run's deadline, the waiting session's agent tool and provider statement, and the rounds delivered to each session.
> - **Observable:** The emitted packets and their digests, the recorded verdicts and inventories, validation outcomes, refusals, readiness state and the review page's disclosures; the printed start commands, the delivery records and the waiting command's outcomes.
> - **Oracle:** Expected packet contents, validation outcomes and readiness derived from the controlled inputs outside the generator; the packet compared byte for byte against an independently assembled expected packet.
> - **Oracle independence:** Expected outcomes are fixed before the step runs; the verdict and inventory fixtures are written outside the code under test.
> - **Falsifier:** A fidelity verdict marks a withheld entry or an uncited judgement accurate or supported and counts; `withheld` is accepted for an entry that is neither a withheld item nor an inventory entry that cites at least one span, all of them withheld; `advisory` is accepted for a block that cites; a withheld entry blocks readiness; a verdict finding that an uncited judgement asserts a project fact does not block; the rendered-design packet omits the evidence view or a criterion this requirement names; a packet carries an authoring exchange, transcript or read account, or omits a span the inventory cites; the reviewer's reading of the emitted packet is shown as Observed; a change outside the review-status region leaves a design review counted; a stale, self-reviewed, incomplete or inconsistent verdict counts; an inventory declared under the authoring session's identifier, or an inventory or verdict declaring a headless or other launch by the authoring session, is accepted; independence or inventory completeness is shown as Observed or verified; a revision or an altered stored subject leaves an old verdict in force; a waiting session reads delivered input that was not re-hashed, or that does not match the recorded digest; a wait passes the run's deadline or makes a network request; Syzygy or the authoring session starts, resumes or signals a waiting session; a printed start command pre-approves a write or a general shell; a printed start command for an agent tool that can limit its own tools leaves a waiting session any tool beyond its read tools and that shell; a shell-escape launch form is accepted for a waiting session; Syzygy writes a session's handed-over content anywhere but the role's own file in that session's directory; a printed instruction passes handed-over content so that the shell may expand it; a broader pre-approval is printed where the agent tool offers no rules that narrow; a waiting session's prompt carries the execution permission; a delivery changes the declared agent tool, version or model, or is made without the waiting session's provider statement in force; a counted verdict of a continuing reviewer is not disclosed as such, or a reviewer's continuity is shown as Observed.
>
> ```yaml
> warrants:
>   primary: VIS-3
>   doctrine: [VIS-1, VIS-2, VIS-3]
>   contracts: [RFC2-23, RFC5-17, RFC7-9, RFC7-13, RFC7-25]
>   policies: [CC-SPEC-2, CC-SPEC-4]
>   decisions: [POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05, POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08, OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06]
>   topology: []
>   parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-006, REQ-polaris-generation-033, REQ-polaris-generation-034]
> ```

Proposed:

> - **Case:** Run the review step against controlled frozen drafts, inventories and verdict files, varying the packet digest, the stored frozen subject, the declared session identifiers and launch forms, verdict completeness, quotation validity and finding severity independently, and including uncited judgement blocks and withheld-only entries; and with sessions started to wait before their input exists, varying the delivered bytes and the recorded digests, the time waited against the run's deadline, the waiting session's agent tool and provider statement, and the rounds delivered to each session; and for later rounds, varying which claim blocks, inventory entries, cited spans and understanding record change between rounds, the session directory each round is delivered into, whether each earlier round's verdict was recorded before or after the later delivery, counted, failed or refused, three or more rounds in one directory, and the base round's stored inputs at validation and render.
> - **Observable:** The emitted packets and their digests, the recorded verdicts and inventories, validation outcomes, refusals, readiness state and the review page's disclosures; the printed start commands, the delivery records and the waiting command's outcomes.
> - **Oracle:** Expected packet contents, validation outcomes and readiness derived from the controlled inputs outside the generator; the packet compared byte for byte against an independently assembled expected packet; each expected changed-block list, and its base round, computed outside the generator from the fixture's delivery and verdict records and a byte comparison of the two rounds' frozen inputs.
> - **Oracle independence:** Expected outcomes are fixed before the step runs; the verdict and inventory fixtures are written outside the code under test.
> - **Falsifier:** A fidelity verdict marks a withheld entry or an uncited judgement accurate or supported and counts; `withheld` is accepted for an entry that is neither a withheld item nor an inventory entry that cites at least one span, all of them withheld; `advisory` is accepted for a block that cites; a withheld entry blocks readiness; a verdict finding that an uncited judgement asserts a project fact does not block; the rendered-design packet omits the evidence view or a criterion this requirement names; a packet carries an authoring exchange, transcript or read account, or omits a span the inventory cites; the reviewer's reading of the emitted packet is shown as Observed; a change outside the review-status region leaves a design review counted; a stale, self-reviewed, incomplete or inconsistent verdict counts; an inventory declared under the authoring session's identifier, or an inventory or verdict declaring a headless or other launch by the authoring session, is accepted; independence or inventory completeness is shown as Observed or verified; a revision or an altered stored subject leaves an old verdict in force; a waiting session reads delivered input that was not re-hashed, or that does not match the recorded digest; a wait passes the run's deadline or makes a network request; Syzygy or the authoring session starts, resumes or signals a waiting session; a printed start command pre-approves a write or a general shell; a printed start command for an agent tool that can limit its own tools leaves a waiting session any tool beyond its read tools and that shell; a shell-escape launch form is accepted for a waiting session; Syzygy writes a session's handed-over content anywhere but the role's own file in that session's directory; a printed instruction passes handed-over content so that the shell may expand it; a broader pre-approval is printed where the agent tool offers no rules that narrow; a waiting session's prompt carries the execution permission; a delivery changes the declared agent tool, version or model, or is made without the waiting session's provider statement in force; a counted verdict of a continuing reviewer is not disclosed as such, or a reviewer's continuity is shown as Observed; a packet carries a changed-block list where this requirement requires none, or a later round with a base round carries none; the base round is chosen other than at delivery, as the latest earlier round delivered into the same directory with a verdict recorded before that delivery, or a later-recorded verdict changes it; a changed-block list omits or adds an entry against the byte comparison of the two rounds' packets, or does not say that it compares nothing else, naming draft content outside claim blocks; the base core digest is copied from a record rather than re-derived by rebuilding, is computed over a packet that carries a list, or the rebuild of a packet reads the inputs of a round other than its own and its base round's; a verdict that omits an entry the list does not name counts, or an entry of a verdict on the base round's packet counts for a later revision; a verdict counts whose named digest is not that of the packet Syzygy rebuilds with its list, or whose base round's stored inputs are altered or missing; a counted verdict whose packet carried a changed-block list is not disclosed as such, or which round is the base, the session's reading of the list, or the reviewer's consideration of the entries the list does not name, is shown as Observed.
>
> ```yaml
> warrants:
>   primary: VIS-3
>   doctrine: [VIS-1, VIS-2, VIS-3]
>   contracts: [RFC2-23, RFC5-17, RFC7-9, RFC7-13, RFC7-25]
>   policies: [CC-SPEC-2, CC-SPEC-4]
>   decisions: [POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05, POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08, OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06, OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06, OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09]
>   topology: []
>   parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-006, REQ-polaris-generation-033, REQ-polaris-generation-034]
> ```

### design.md

Current:

> > **Version 1.5.** Explains the requirements in
> > specs/polaris-generation/spec.md; version 1.0 was signed off by the owner
> > on 2026-10-06, version 1.1 on 2026-10-07 and version 1.2 on 2026-10-14,
> > and this text binds only by the owner's sign-off of version 1.5. It is not an
> > implementation. It contains no code. The command surface below is a design
> > for implementation after the owner's sign-off (direction item 5); the
> > requirements are the controlling text, and doctrine, accepted contracts,
> > the adopted requirements and the owner's rulings
> > (`POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`,
> > `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`) remain
> > controlling over both.

Proposed:

> > **Version 1.6.** Explains the requirements in
> > specs/polaris-generation/spec.md; version 1.0 was signed off by the owner
> > on 2026-10-06, version 1.1 on 2026-10-07 and version 1.2 on 2026-10-14,
> > and this text binds only by the owner's sign-off of version 1.6. It is not an
> > implementation. It contains no code. The command surface below is a design
> > for implementation after the owner's sign-off (direction item 5); the
> > requirements are the controlling text, and doctrine, accepted contracts,
> > the adopted requirements and the owner's rulings
> > (`POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`,
> > `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`) remain
> > controlling over both.

### design.md

Current:

> 1. **Pin by commit, read by object, re-hash every object.** `init` resolves
>    the clone's HEAD to a commit, refuses unless the in-force observation
>    consent names that exact revision, and records it. Every later read is by
>    object identifier at that commit (the batch reader `readGitBlobsBatch` in
>    `apps/three-surface-poc/src/git-blob-batch.ts`, and a tree listing at the
>    commit for path existence). The working tree is never read. The clone's
>    `.git` directory is also the agent's to write, and the first review showed
>    that `git replace`, or an overwritten loose object, returns other bytes
>    under the consented identifier without error. So the reader honours no
>    replacement objects, grafts, repository-local configuration, hooks or
>    alternates, and recomputes the identifier of every commit, tree and blob
>    on the path down from the pinned commit from the bytes it got; a mismatch
>    refuses the step. The reader is an in-process object reader (loose
>    objects and pack files) that consults none of the clone's configuration,
>    follows no alternates file and honours no replace refs or grafts. A `git`
>    subprocess, even with the isolation flags of
>    `apps/three-surface-poc/src/polaris-generation/isolated-git.ts`, still
>    reads the clone's own `.git/config`, which 033 does not allow, so it is
>    not used for the run's reads (second review, finding 10). The hash
>    algorithm is the one the consented revision's identifier is written in
>    (40 hex digits SHA-1, 64 SHA-256), never `extensions.objectFormat`; a
>    clone whose objects do not hash under it is refused. At every `check`,
>    `review-check` and `render`, the recorded pinned revision is compared
>    again with the in-force consent, and the draft, inventory and verdict
>    must name it (second review, finding 1). The walk goes down from the commit and never to its parents, so
>    grafts and shallow boundaries cannot change what is read. Reading HEAD
>    is a ref read, not a body read.
> 2. **The agent cannot label its own claim Observed.** "An LLM assertion is
>    Inferred" (AGENTS.md); the only Observed things on the page are quotations
>    Syzygy verified and Syzygy's own reads and steps. This keeps RFC7-2's three
>    kinds intact: a claim is anchored through its verified quotation,
>    non-normative, or labelled Inferred or Unknown.
> 3. **Rendered quotations come from Syzygy's read, never the agent's text.**
>    The check locates the agent's quotation in the cited blob after the
>    existing normalisation and records the byte range for the finding report;
>    `render` locates the quotation again in the blob it re-reads and
>    re-hashes, and slices that. The stored range is never trusted, because the
>    agent can write the state directory. The agent's copy is used only to find
>    the span.
> 4. **What Syzygy can enforce, it enforces; what it cannot, it labels.**
>    Repair cycles, the deadline (on Syzygy's clock, from `brief`) and the
>    question count are Syzygy's own steps or checkable from the draft, so they
>    are refused past the limit. The cycle count and the deadline's start
>    instant are stored where the agent can write them, so their integrity is
>    labelled Inferred. The agent's tokens and turns are invisible to Syzygy,
>    so they are operator-declared at `close` and labelled Inferred, or
>    recorded as not recorded. Nothing is presented as a provider receipt.
> 5. **Independence is packaged, not proved.** Syzygy builds each review packet
>    itself and binds the verdict to the packet digest, rebuilding the packet
>    from the frozen subject at `review-check` and again at `render`. What is
>    Observed is the packet Syzygy built, its digest, and that the verdict
>    names that digest. The emitted packet sits where the authoring agent can
>    write it, so that the reviewer read it unaltered is Inferred; the packet
>    carries its own digest so the reviewer can re-hash it before reading,
>    which is a cheap check, not a proof. Whether the reviewer had nothing
>    else is not observable either, so session freshness stays Inferred and
>    the page says so. The fidelity packet carries the spans cited by the
>    draft and by the inventory, screening-admitted only. The design review's
>    subject is the rendered pages without one named review-status region;
>    a later render may change only that region, and any other change is a
>    new revision that retires the review.
>    Each inventory and review runs in a separate top-level session that the
>    operator starts, with a declared session identifier that must differ from
>    the author's, and for a review from the inventory's; a subagent or a
>    process of the authoring session does not count (owner ruling; the
>    extension to the inventory is the drafter's). The reviewer verifies each
>    inventory entry's accuracy against the spans in its packet; it has no
>    way to verify the inventory's completeness, so that stays the inventory
>    session's self-report, Inferred. A different agent tool for review (a Codex review of a Claude
>    Code draft, or the reverse) is allowed and recorded. The fidelity packet
>    carries the frozen inventory as part of its criteria, because
>    REQ-polaris-generation-006 measures coverage against it.
>    Since version 1.2 (owner direction
>    `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`, option B of the
>    2026-10-08 blockers packet), the operator may start all three helper
>    sessions at the start of a run, so a run need not stall at each
>    hand-over while nobody is there to start one. `session-prompt <run> all`
>    writes the inventory brief, makes the review directories and prints a
>    command per session; each session runs `syzygy dossier await
>    <its directory>/`, which polls its directory on the local file system a
>    bounded slice at a time, never past the run's deadline, and re-hashes
>    what arrives three ways (the round's own digest file, its delivery note
>    and the delivery record in the run directory) before saying what to
>    read. A later `session-prompt <run> review --kind <kind>` delivers the
>    packet into the waiting session's directory as round N instead of
>    making a new session; `--fresh` makes a new one. The owner's sub-answer
>    lets one reviewer continue across revisions: the cost, that it has seen
>    its own earlier verdict, is disclosed on the review page for every
>    counted verdict, from the delivery records and from repeated session
>    identifiers, both Inferred. The printed Claude Code command pre-approves
>    only reading its directory (the inventory also reads the clone) and its
>    one `await` command, in the default permission mode, so any other call,
>    a write included, waits for the operator; it also gives the session only
>    the built-in read tools and the shell (`--tools`), denies the write, web
>    and subagent tools outright and loads no MCP server, and it is printed
>    for a new terminal only, since a waiting session holds its terminal for
>    the whole run (`launch-form` refuses the bang form for one). Allow rules
>    in the operator's own user, project or local settings still apply, and
>    whether a tool connected through the operator's account stays available
>    is Unknown; the disclosure says both. The session writes no
>    file: it passes its inventory or verdict on standard input to
>    `await --submit <file> --stdin`, in a heredoc whose delimiter is quoted
>    so the shell expands nothing in it, and Syzygy writes that one file (the
>    inventory, or a delivered round's verdict) in the session's directory,
>    only once it parses as bounded UTF-8 JSON, and checks it. Syzygy writes
>    into a session directory, or delivers to one, only when it is a
>    directory of its own whose real path lies in the sessions root, and the
>    sessions root is itself a directory of its own whose real path is its
>    entry in the state directory. Codex gets no pre-approval,
>    because how narrowly it can pre-approve one command is Unknown to this
>    design. The risk the owner accepted with the option is that a
>    pre-approved session reads untrusted text while nobody is present; no
>    waiting session carries the execution permission, and a delivery checks
>    the waiting session's own provider statement again.
> 6. **Excluded files make blocks Unknown, not findings.** A quotation from a
>    file that screening excludes cannot be verified without using excluded
>    content, so the block renders `excluded-content` (RFC2-24 #7) and no
>    finding carries the bytes. Re-pointing the claim at a readable file is the
>    agent's choice, not a requirement.
> 7. **No new Unknown reason.** RFC2-24's twelve are closed. Unobserved agent
>    usage is "a fact of the render", stated in the disclosure, never a reason
>    code and never zero.
> 8. **Execution follows SEC-3; Syzygy never runs anything.** The owner
>    chose to let the agent build and run the observed project on the host,
>    and directed a SEC-3 amendment to permit it before this change is signed
>    (review-1 rulings, item 1); the owner adopted it as D9 on 2026-10-06. `brief`
>    writes the execution rule in force. It carries D9's permission only when
>    D9 is adopted and in force, the operator is the owner attending the
>    authoring session the owner started on the owner's host, the operator
>    has personally run `syzygy dossier allow-execution <run> --revision
>    <pinned>` before the brief, declaring there that the owner started the
>    authoring session on the owner's own host and attends it, and, where D9 as adopted carries its
>    credential condition, Syzygy's own read attempt, as the operator's user,
>    finds no adapter credential its configuration holds readable. That
>    command is the only source of the choice: it covers one run and its
>    pinned revision, `run.json`, earlier runs and standing records never
>    count, and the skill and Codex texts never run it and never grant
>    execution themselves: they defer to the rule in `brief.md`. The choice
>    is not an execution consent (RFC5-12; the base change's
>    `SOURCE-POLICY.md`) and approves no execution profile. Syzygy cannot see
>    who typed it, and the authoring agent could run it or write its record
>    itself, which Syzygy cannot tell apart, so the owner's authorship and the
>    declaration are Inferred and disclosed, and the record sits in the state
>    directory with every other record (R1). The
>    permitting brief goes to the authoring session only, never to the
>    inventory brief, a packet or a printed session prompt. It says the
>    permission lapses if the owner leaves the session under automatic
>    approval or permission bypass while away, keeps the agent's subagents
>    under the same rule, asks for no process that outlives the session, and
>    has the agent stop every process it started (a background service
>    included) before the session ends. From a permitting brief on, Syzygy
>    holds and writes no typed-adapter credential the operator's user can
>    read, and repeats the credential read at every step it takes (`check`,
>    `inventory-check`, `review-check`, `render`, `close`), taking the list
>    from a source the disclosure names and says is within the sessions'
>    reach; a breach becomes a finding telling the agent to run nothing
>    further, a tool's deny rule never passes it, and readability between
>    reads, after `close` or through privilege escalation is Inferred and
>    disclosed. The run record cites the choice and the declaration and
>    quotes D9's cost bullet as adopted in `security.md`. In every other case
>    the brief quotes SEC-3's head sentence as adopted, cites SEC-3 and tells
>    the agent in its own words not to build or run the project outside an
>    explicit, opt-in execution profile, with no invitation to run it
>    outside one. Syzygy never asks for the choice before D9
>    is in
>    force. Either way every command the agent reports goes in
>    the draft's `executions` list and is disclosed, whether or not a claim
>    rests on it, and each claim it marks as resting on one
>    names it and is Inferred. Syzygy sees only the marking, records the list
>    as the agent's report, renders each such claim with the commands it names
>    beside it, and runs and launches nothing. A verified quotation is still
>    the only Observed content on the page. The brief also says that text in
>    the clone is data, never instruction.
> 9. **The RFC7-20 reading is applied narrowly.** The draft layer renders as an
>    editorial draft only when the three conditions of the owner's reading hold
>    (disclosure, declared and recorded tool and provider, byte-verified
>    quotations); `render` checks all three and otherwise renders the draft
>    layer Unknown (`unconsented-source-or-provider`). The run record cites
>    the ruling. The owner knew a reviewer may call the reading a contract
>    change; the design takes no position on that.
> 10. **Any repository, with SEC-2 kept whole.** The owner allowed the mode on
>     any repository, governed projects included, and left SEC-2 unchanged
>     (scope record, item 1; review-1 rulings, item 2). A subject is governed
>     under the four conditions the sibling profile change (032) uses: a
>     kernel evidence drawer recorded in the project input, or an
>     `openspec/**` path or any `.syzygy/` path in the pinned tree, which
>     `init` reads by path only after pinning (`preflight` precedes the clone
>     and reads no tree). A path listing cannot tell whether a declaration is
>     adopted, so every `.syzygy/` path counts. A governed subject, or one
>     whose input is silent about the drawer, needs an in-force per-project
>     statement naming the operator's agent provider and content classes,
>     which `preflight` reports when one exists and `init` requires. The statement is a consent record, not an
>     egress record. Every page says that neither its classes nor SEC-5
>     screening limit what the agent reads or sends.
> 11. **Syzygy's records are re-derived, not trusted.** The state directory
>     lies outside the clone, but on a single-user host the agent, and any
>     project code it runs, can write it. So nothing Observed rests on a stored
>     file: `check` and `render` re-read and re-hash the objects, re-check the
>     pinned revision against the consent, re-locate the quotations, re-run
>     the checks and rebuild the packets; every value shown from a stored
>     record is labelled Inferred. No Syzygy credential is issued for a run or
>     written where the agent can read it. The owner chose this
>     (`POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`, R1) over a separate
>     operating-system user and a sandbox. It reads REQ-polaris-generation-018's
>     work home and 022's trail location for this mode; the audit evidence of
>     refusals is agent-editable and labelled so. The reading of 020's
>     work-item gates was not part of R1 and goes to the owner with the
>     sign-off. The commands serve no route and hold no credential, so the
>     recorded principal is the operator with credential identity Unknown, and
>     the Execution Record renders as unattributed execution (RFC4-19).

Proposed:

> 1. **Pin by commit, read by object, re-hash every object.** `init` resolves
>    the clone's HEAD to a commit, refuses unless the in-force observation
>    consent names that exact revision, and records it. Every later read is by
>    object identifier at that commit (the batch reader `readGitBlobsBatch` in
>    `apps/three-surface-poc/src/git-blob-batch.ts`, and a tree listing at the
>    commit for path existence). The working tree is never read. The clone's
>    `.git` directory is also the agent's to write, and the first review showed
>    that `git replace`, or an overwritten loose object, returns other bytes
>    under the consented identifier without error. So the reader honours no
>    replacement objects, grafts, repository-local configuration, hooks or
>    alternates, and recomputes the identifier of every commit, tree and blob
>    on the path down from the pinned commit from the bytes it got; a mismatch
>    refuses the step. The reader is an in-process object reader (loose
>    objects and pack files) that consults none of the clone's configuration,
>    follows no alternates file and honours no replace refs or grafts. A `git`
>    subprocess, even with the isolation flags of
>    `apps/three-surface-poc/src/polaris-generation/isolated-git.ts`, still
>    reads the clone's own `.git/config`, which 033 does not allow, so it is
>    not used for the run's reads (second review, finding 10). The hash
>    algorithm is the one the consented revision's identifier is written in
>    (40 hex digits SHA-1, 64 SHA-256), never `extensions.objectFormat`; a
>    clone whose objects do not hash under it is refused. At every `check`,
>    `review-check` and `render`, the recorded pinned revision is compared
>    again with the in-force consent, and the draft, inventory and verdict
>    must name it (second review, finding 1). The walk goes down from the commit and never to its parents, so
>    grafts and shallow boundaries cannot change what is read. Reading HEAD
>    is a ref read, not a body read.
> 2. **The agent cannot label its own claim Observed.** "An LLM assertion is
>    Inferred" (AGENTS.md); the only Observed things on the page are quotations
>    Syzygy verified and Syzygy's own reads and steps. This keeps RFC7-2's three
>    kinds intact: a claim is anchored through its verified quotation,
>    non-normative, or labelled Inferred or Unknown.
> 3. **Rendered quotations come from Syzygy's read, never the agent's text.**
>    The check locates the agent's quotation in the cited blob after the
>    existing normalisation and records the byte range for the finding report;
>    `render` locates the quotation again in the blob it re-reads and
>    re-hashes, and slices that. The stored range is never trusted, because the
>    agent can write the state directory. The agent's copy is used only to find
>    the span.
> 4. **What Syzygy can enforce, it enforces; what it cannot, it labels.**
>    Repair cycles, the deadline (on Syzygy's clock, from `brief`) and the
>    question count are Syzygy's own steps or checkable from the draft, so they
>    are refused past the limit. The cycle count and the deadline's start
>    instant are stored where the agent can write them, so their integrity is
>    labelled Inferred. The agent's tokens and turns are invisible to Syzygy,
>    so they are operator-declared at `close` and labelled Inferred, or
>    recorded as not recorded. Nothing is presented as a provider receipt.
> 5. **Independence is packaged, not proved.** Syzygy builds each review packet
>    itself and binds the verdict to the packet digest, rebuilding the packet
>    from the frozen subject at `review-check` and again at `render`. What is
>    Observed is the packet Syzygy built, its digest, and that the verdict
>    names that digest. The emitted packet sits where the authoring agent can
>    write it, so that the reviewer read it unaltered is Inferred; the packet
>    carries its own digest so the reviewer can re-hash it before reading,
>    which is a cheap check, not a proof. Whether the reviewer had nothing
>    else is not observable either, so session freshness stays Inferred and
>    the page says so. The fidelity packet carries the spans cited by the
>    draft and by the inventory, screening-admitted only. The design review's
>    subject is the rendered pages without one named review-status region;
>    a later render may change only that region, and any other change is a
>    new revision that retires the review.
>    Each inventory and review runs in a separate top-level session that the
>    operator starts, with a declared session identifier that must differ from
>    the author's, and for a review from the inventory's; a subagent or a
>    process of the authoring session does not count (owner ruling; the
>    extension to the inventory is the drafter's). The reviewer verifies each
>    inventory entry's accuracy against the spans in its packet; it has no
>    way to verify the inventory's completeness, so that stays the inventory
>    session's self-report, Inferred. A different agent tool for review (a Codex review of a Claude
>    Code draft, or the reverse) is allowed and recorded. The fidelity packet
>    carries the frozen inventory as part of its criteria, because
>    REQ-polaris-generation-006 measures coverage against it.
>    Since version 1.2 (owner direction
>    `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`, option B of the
>    2026-10-08 blockers packet), the operator may start all three helper
>    sessions at the start of a run, so a run need not stall at each
>    hand-over while nobody is there to start one. `session-prompt <run> all`
>    writes the inventory brief, makes the review directories and prints a
>    command per session; each session runs `syzygy dossier await
>    <its directory>/`, which polls its directory on the local file system a
>    bounded slice at a time, never past the run's deadline, and re-hashes
>    what arrives three ways (the round's own digest file, its delivery note
>    and the delivery record in the run directory) before saying what to
>    read. A later `session-prompt <run> review --kind <kind>` delivers the
>    packet into the waiting session's directory as round N instead of
>    making a new session; `--fresh` makes a new one. The owner's sub-answer
>    lets one reviewer continue across revisions: the cost, that it has seen
>    its own earlier verdict, is disclosed on the review page for every
>    counted verdict, from the delivery records and from repeated session
>    identifiers, both Inferred. Since version 1.6 (owner direction
>    `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`) a fidelity packet delivered as a later
>    round into a session directory also carries a changed-block list when,
>    before that delivery, Syzygy recorded a verdict written there for an
>    earlier round (counted, failed or refused); the base round is chosen and
>    recorded at delivery. The list holds the base core digest (the base
>    round's packet rebuilt without a list, from that round's inputs alone,
>    so no rebuild chains back further), the claim blocks and inventory
>    entries added, removed or changed in bytes or cited spans since that
>    round, and whether the understanding record changed, found by comparing
>    bytes; it says it compares nothing else, diagram elements and section
>    titles included. It points the reviewer at the repairs and nothing more: the packet
>    is still whole, the verdict still covers every entry, a revision still
>    retires the earlier verdict, and the review page says the session was
>    delivered the list. It saves reviewer attention, not tokens read. A packet
>    into a directory with no earlier round, as for a `--fresh` session, has
>    no base round and gets no list. The printed Claude Code command pre-approves
>    only reading its directory (the inventory also reads the clone) and its
>    one `await` command, in the default permission mode, so any other call,
>    a write included, waits for the operator; it also gives the session only
>    the built-in read tools and the shell (`--tools`), denies the write, web
>    and subagent tools outright and loads no MCP server, and it is printed
>    for a new terminal only, since a waiting session holds its terminal for
>    the whole run (`launch-form` refuses the bang form for one). Allow rules
>    in the operator's own user, project or local settings still apply, and
>    whether a tool connected through the operator's account stays available
>    is Unknown; the disclosure says both. The session writes no
>    file: it passes its inventory or verdict on standard input to
>    `await --submit <file> --stdin`, in a heredoc whose delimiter is quoted
>    so the shell expands nothing in it, and Syzygy writes that one file (the
>    inventory, or a delivered round's verdict) in the session's directory,
>    only once it parses as bounded UTF-8 JSON, and checks it. Syzygy writes
>    into a session directory, or delivers to one, only when it is a
>    directory of its own whose real path lies in the sessions root, and the
>    sessions root is itself a directory of its own whose real path is its
>    entry in the state directory. Codex gets no pre-approval,
>    because how narrowly it can pre-approve one command is Unknown to this
>    design. The risk the owner accepted with the option is that a
>    pre-approved session reads untrusted text while nobody is present; no
>    waiting session carries the execution permission, and a delivery checks
>    the waiting session's own provider statement again.
> 6. **Excluded files make blocks Unknown, not findings.** A quotation from a
>    file that screening excludes cannot be verified without using excluded
>    content, so the block renders `excluded-content` (RFC2-24 #7) and no
>    finding carries the bytes. Re-pointing the claim at a readable file is the
>    agent's choice, not a requirement.
> 7. **No new Unknown reason.** RFC2-24's twelve are closed. Unobserved agent
>    usage is "a fact of the render", stated in the disclosure, never a reason
>    code and never zero.
> 8. **Execution follows SEC-3; Syzygy never runs anything.** The owner
>    chose to let the agent build and run the observed project on the host,
>    and directed a SEC-3 amendment to permit it before this change is signed
>    (review-1 rulings, item 1); the owner adopted it as D9 on 2026-10-06. `brief`
>    writes the execution rule in force. It carries D9's permission only when
>    D9 is adopted and in force, the operator is the owner attending the
>    authoring session the owner started on the owner's host, the operator
>    has personally run `syzygy dossier allow-execution <run> --revision
>    <pinned>` before the brief, declaring there that the owner started the
>    authoring session on the owner's own host and attends it, and, where D9 as adopted carries its
>    credential condition, Syzygy's own read attempt, as the operator's user,
>    finds no adapter credential its configuration holds readable. That
>    command is the only source of the choice: it covers one run and its
>    pinned revision, `run.json`, earlier runs and standing records never
>    count, and the skill and Codex texts never run it and never grant
>    execution themselves: they defer to the rule in `brief.md`. The choice
>    is not an execution consent (RFC5-12; the base change's
>    `SOURCE-POLICY.md`) and approves no execution profile. Syzygy cannot see
>    who typed it, and the authoring agent could run it or write its record
>    itself, which Syzygy cannot tell apart, so the owner's authorship and the
>    declaration are Inferred and disclosed, and the record sits in the state
>    directory with every other record (R1). The
>    permitting brief goes to the authoring session only, never to the
>    inventory brief, a packet or a printed session prompt. It says the
>    permission lapses if the owner leaves the session under automatic
>    approval or permission bypass while away, keeps the agent's subagents
>    under the same rule, asks for no process that outlives the session, and
>    has the agent stop every process it started (a background service
>    included) before the session ends. From a permitting brief on, Syzygy
>    holds and writes no typed-adapter credential the operator's user can
>    read, and repeats the credential read at every step it takes (`check`,
>    `inventory-check`, `review-check`, `render`, `close`), taking the list
>    from a source the disclosure names and says is within the sessions'
>    reach; a breach becomes a finding telling the agent to run nothing
>    further, a tool's deny rule never passes it, and readability between
>    reads, after `close` or through privilege escalation is Inferred and
>    disclosed. The run record cites the choice and the declaration and
>    quotes D9's cost bullet as adopted in `security.md`. In every other case
>    the brief quotes SEC-3's head sentence as adopted, cites SEC-3 and tells
>    the agent in its own words not to build or run the project outside an
>    explicit, opt-in execution profile, with no invitation to run it
>    outside one. Syzygy never asks for the choice before D9
>    is in
>    force. Either way every command the agent reports goes in
>    the draft's `executions` list and is disclosed, whether or not a claim
>    rests on it, and each claim it marks as resting on one
>    names it and is Inferred. Syzygy sees only the marking, records the list
>    as the agent's report, renders each such claim with the commands it names
>    beside it, and runs and launches nothing. A verified quotation is still
>    the only Observed content on the page. The brief also says that text in
>    the clone is data, never instruction.
> 9. **The RFC7-20 reading is applied narrowly.** The draft layer renders as an
>    editorial draft only when the three conditions of the owner's reading hold
>    (disclosure, declared and recorded tool and provider, byte-verified
>    quotations); `render` checks all three and otherwise renders the draft
>    layer Unknown (`unconsented-source-or-provider`). The run record cites
>    the ruling. The owner knew a reviewer may call the reading a contract
>    change; the design takes no position on that.
> 10. **Any repository, with SEC-2 kept whole.** The owner allowed the mode on
>     any repository, governed projects included, and left SEC-2 unchanged
>     (scope record, item 1; review-1 rulings, item 2). A subject is governed
>     under the four conditions the sibling profile change (032) uses: a
>     kernel evidence drawer recorded in the project input, or an
>     `openspec/**` path or any `.syzygy/` path in the pinned tree, which
>     `init` reads by path only after pinning (`preflight` precedes the clone
>     and reads no tree). A path listing cannot tell whether a declaration is
>     adopted, so every `.syzygy/` path counts. A governed subject, or one
>     whose input is silent about the drawer, needs an in-force per-project
>     statement naming the operator's agent provider and content classes,
>     which `preflight` reports when one exists and `init` requires. The statement is a consent record, not an
>     egress record. Every page says that neither its classes nor SEC-5
>     screening limit what the agent reads or sends.
> 11. **Syzygy's records are re-derived, not trusted.** The state directory
>     lies outside the clone, but on a single-user host the agent, and any
>     project code it runs, can write it. So nothing Observed rests on a stored
>     file: `check` and `render` re-read and re-hash the objects, re-check the
>     pinned revision against the consent, re-locate the quotations, re-run
>     the checks and rebuild the packets; every value shown from a stored
>     record is labelled Inferred. No Syzygy credential is issued for a run or
>     written where the agent can read it. The owner chose this
>     (`POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`, R1) over a separate
>     operating-system user and a sandbox. It reads REQ-polaris-generation-018's
>     work home and 022's trail location for this mode; the audit evidence of
>     refusals is agent-editable and labelled so. The reading of 020's
>     work-item gates was not part of R1 and goes to the owner with the
>     sign-off. The commands serve no route and hold no credential, so the
>     recorded principal is the operator with credential identity Unknown, and
>     the Execution Record renders as unattributed execution (RFC4-19).

### proposal.md

Current:

(none)

Proposed:

> > **Version 1.6 changes.** By the owner direction
> > `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`, a fidelity packet delivered
> > into a review session's directory as a later round also carries a list,
> > written by Syzygy, of the claim blocks and inventory entries that changed
> > since the latest earlier round with a recorded verdict there. The packet
> > stays whole, the verdict still covers every entry, and a revision still
> > retires the earlier verdict. It binds only by the owner's sign-off.

### proposal.md

Current:

> > **Version 1.3.** Drafted 2026-10-05 under the owner direction
> > `POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md`),
> > which authorizes drafting and review only, and relies on the owner's
> > rulings `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md`)
> > and `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-DIRECTION.md`)
> > and `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-DIRECTION.md`)
> > and `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-DIRECTION.md`).
> > The owner signed off version 1.0 on 2026-10-06, after adopting the SEC-3
> > amendment that the review-1 rulings direct (item 1) as doctrine amendment
> > D9 the same day, and version 1.1 on 2026-10-07; version 1.2 adds the
> > waiting sessions of the owner direction
> > `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-WAITING-SESSIONS-DIRECTION.md`),
> > signed off on 2026-10-14; version 1.3 adds the presentation elements of the
> > owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`
> > (`.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`).
> > Version 1.4 adds the empty-cell marker "-", explicit unread-path
> > excerpt handling and the carried v1.3 review notes. Version 1.4 is the
> > predecessor of version 1.5.
> > These bytes bind only by the owner's sign-off of version 1.5 (VIS-4). It grants no read, egress, write or execution beyond what
> > its requirements state.

Proposed:

> > **Version 1.3.** Drafted 2026-10-05 under the owner direction
> > `POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md`),
> > which authorizes drafting and review only, and relies on the owner's
> > rulings `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md`)
> > and `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-DIRECTION.md`)
> > and `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-DIRECTION.md`)
> > and `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-DIRECTION.md`).
> > The owner signed off version 1.0 on 2026-10-06, after adopting the SEC-3
> > amendment that the review-1 rulings direct (item 1) as doctrine amendment
> > D9 the same day, and version 1.1 on 2026-10-07; version 1.2 adds the
> > waiting sessions of the owner direction
> > `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`
> > (`.syzygy/governance/decisions/POLARIS-DOSSIER-WAITING-SESSIONS-DIRECTION.md`),
> > signed off on 2026-10-14; version 1.3 adds the presentation elements of the
> > owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`
> > (`.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`).
> > Version 1.4 adds the empty-cell marker "-", explicit unread-path
> > excerpt handling and the carried v1.3 review notes. Version 1.4 is the
> > predecessor of version 1.5, and version 1.5 of version 1.6.
> > These bytes bind only by the owner's sign-off of version 1.6 (VIS-4). It grants no read, egress, write or execution beyond what
> > its requirements state.
