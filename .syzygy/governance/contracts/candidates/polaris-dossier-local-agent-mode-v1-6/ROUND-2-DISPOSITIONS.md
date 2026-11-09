# Round 2 dispositions — Polaris dossier local-agent mode, version 1.6

> **Candidate — binds nothing.** [Observed] Dispositions of
> `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-2-RAW.md` (verdict `REVISE`, over
> `a4a181d5`). The drafter wrote them; finding 1's design follows the
> coordinator's decision for this second failed round (CC-REV-4), relayed to the
> drafter on 2026-11-09. Whether each repair holds is round 3's call. Every
> repair retires the round-2 subject; the new proposed `spec.md` digest is in
> `PROPOSED-SUBJECTS.json`, written by
> `build_polaris_dossier_local_agent_mode_v1_6.py --write-subjects`.

1. **Finding 1** (major). Repaired by removing the chain, as the coordinator decided. [Inferred] The drafter finds that it works. The list itself never holds base-round content, so a later round reads the base only through this digest.
   - The list now names "the base core digest, which is the digest of the packet the base round would carry without a changed-block list, rebuilt from that round's recorded inputs alone".
   - The validation paragraph's input set is now complete. It reads: the base round Syzygy recorded with the delivery, and that round's frozen draft with its understanding record, frozen inventory, pinned revision, "and the criteria and verdict schema its packet carried". This also covers the review's Unknown about criteria and schema.
   - The base core digest is "re-derived by rebuilding from those inputs alone the packet that round would carry without a changed-block list". The paragraph closes "so that no rebuild reads the inputs of any round but its own and its base round's".
   - The missing-input sentence now adds that no other round's verdict depends on a base round's inputs, except a verdict on a packet whose base round it is.
   - The scenario "Changed-block list rebuilt with its packet" now has the AND line "a verdict on a packet whose base round is a different round still counts if its own packet rebuilds".
   - The falsifier refuses three things: a base core digest copied, a base core digest computed over a packet that carries a list, and a rebuild that reads another round's inputs. The Case adds three or more rounds in one directory.
   - "Which form, and why" now says the chosen form needs no chain, and why. It contrasts this with the third form, whose counted verdict covers the first round's whole packet composed with every later delta.
   - The ledger and the owner page now say a missing or altered base input costs one round's verdict.
2. **Finding 2** (minor). Repaired. The base round is the latest earlier round "for which, before it delivers the later round, Syzygy has recorded a verdict written there". In addition, "Syzygy chooses the base round when it delivers the later round and records that choice with the delivery, and a verdict recorded after that delivery does not change it".
   - The scenario's WHEN and AND lines, the falsifier, the delta's item 1 and design.md say the same.
3. **Finding 3** (minor). Repaired by naming the content instead of listing it. The sentence now reads "a difference in draft content outside claim blocks, such as a diagram node or edge or the draft's sections and their titles, or in the criteria, the verdict schema or the pinned revision, is not shown by it".
   - The falsifier requires the list to say so, and the ledger, owner page, delta item 2 and design.md name the same content.
   - [Inferred] Listing diagram elements as well was not done. They carry no verdict entry of their own unless they hold a claim block, so a list entry would point at something the verdict does not separately judge.
4. **Finding 4** (minor). Repaired. SEMANTIC-DELTA.md now reads "The selected option names two forms and leaves the choice to the drafter." OWNER-SIGNOFF.md reads "The option you selected names two forms and leaves the choice to the drafter."
5. **Finding 5** (minor). Repaired. The owner page's head now names both REVISE raws and says a later round must confirm.
6. **Finding 6** (note). Taken. The disclosure and its scenario now say "the session was delivered a packet carrying a list". The session's reading of the list is labelled Inferred in both.
7. **Finding 7** (note). No change. It confirms criterion 1, and the round-2 repairs keep every sentence it quotes.
8. **Finding 8** (note). No change to the REQ-033 reading. The reading now holds without the chain qualifier, since finding 1 completes the input set.
9. **Finding 9** (note). No change. design.md was updated only for findings 1-3.
10. **Finding 10** (note, CC-REV-4). Weighed. The coordinator treated finding 1 as a design question and made the decision above for this round. Round 3 has a stopping rule: unless it returns `CONFIRM`, or `CONFIRM WITH EXCEPTIONS` with notes only, the package goes to the owner.
