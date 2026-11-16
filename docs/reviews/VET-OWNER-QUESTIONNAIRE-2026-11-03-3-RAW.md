Of the eight remaining items, five pass on both scope and recommendation. Three need one fix each to their recommendation: `second-project`, `pwb-walkthrough` and `pwb-release-label`. All eight pass on scope. I checked against snapshot `7268edcc` and live beads, read-only.

**Header.** Pass. Dropping `p98-details-target` is justified by the browser test at `polaris-opening-index.browser.test.ts:373-408`. `syzygy-bpyt.1.8` is correctly described: the lead's comment of 2026-10-22 chooses K conditionally and sends it to you if `bpyt.2.2` lands without hashing all six records. One non-material gap: `syzygy-u05.25`'s note (c), which asks whether a page loaded with a URL fragment counts as the first-load state, is called "owner-facing" in the bead but is not in any list. Add it to "not asked" with a reason. Two new claims check out: `PROJECT-STATUS.md:76` (the quote spans lines 75–77) and 764 non-merge commits.

---

- Item: `second-project`
- Scope verdict: Pass — which revisions the requests consent admits is a consent-scope decision, so it belongs to the owner. The new claims check out: the consent admits only `v2.34.2` (`OBSERVATION-CONSENT.md:21-25`), and the `i5qt` quote is now complete.
- Recommendation verdict: Revise — option A's con "No regeneration from requests" is false. A later consent version can add a revision: the source-acquisition entry names "a consent version" as the remedy for an unadmitted revision (`failureStates.revisionNotAdmitted`), and the Redis provider statement v2 shows the supersession route. So A followed later by a revision-adding successor is a real choice: first run sooner, with a second act after a real upstream change. B is one act, after a redraft and review.
- Material corrections: change A's con to "regeneration needs a later consent version (second act)" and weigh B against that. B may still win if one sitting matters more than a first run sooner.
- Evidence freshness: `7268edcc`; beads read live. Upstream requests refs not read.

---

- Item: `redis-next-step`
- Scope verdict: Pass — option A names its route (the one-command launch), the citations are fixed, and C's dependency on item 1 is stated. Verified: provider statement line 26 lists `governance-text`; the Redis consent's revisions are at lines 21-28.
- Recommendation verdict: Pass.
- Material corrections: None.
- Non-material note: option B's cons could say it reverses two of your earlier choices. `SECURITY` was withheld by name under screening v2 Q3, which you accepted, and you chose v2 variant `none` over `manifesto` on 2026-10-07 (`SEMANTIC-DELTA.md:287-289`). Any B package will need to say so.
- Evidence freshness: `7268edcc`. The Redis run directory and live CLI were not inspected.

---

- Item: `arbitrary-public-repo`
- Scope verdict: Pass — the split is clear, the REQ-038/039 citations (`spec.md:180,277`) are correct, and REQ-045 is described as a candidate.
- Recommendation verdict: Pass.
- Material corrections: None.
- Non-material note: option C's cons could add that REQ-038 needs a redraft to stand alone. It refers to REQ-037's identity screen under the history option (`spec.md:182`), and Q4–Q6 (including ruling 10b, which limits Redis's stated advantages to what maintainers wrote) still need answers before sign-off.
- Evidence freshness: `7268edcc`. PRs #400 and #477 were not inspected.

---

- Item: `pwb-walkthrough`
- Scope verdict: Pass — the freeze scope is disclosed, and the cited lines check out: `walkthrough-inputs.ts:79`, `walkthrough-judgment.ts:527`, `tasks.md:135` (task 5.2), PWB `spec.md:2399` ("one exact surface version"), and 62 non-merge commits. "40 of 43 cycle beads" matches no population I can derive: `bd list --parent syzygy-1z3 --all` shows 44 closed and 4 open. State the population or drop the figure.
- Recommendation verdict: Revise — option B ("after the requests run lands") is open-ended, the same defect the first draft held against waiting for the queued chain. Its trigger depends on item 1: a consent redraft and review, two acts, a run route, and possibly the S12 fixture run.
- Material corrections: give B a bounded trigger (for example "after the requests run or by a date you set, whichever comes first"), state its dependency on item 1, and change the "Cycle stays open longer" con to say the wait is open-ended without a date.
- Evidence freshness: `7268edcc`. The Butlers checkout and live daemon were not inspected.

---

- Item: `pwb-release-label`
- Scope verdict: Pass.
- Recommendation verdict: Revise — the new [Observed] claim "The general dossier already labels its pinned revision with the consented tag (`packages/polaris-dossier/src/brief.ts:82`)" is wrong as stated. `brief.ts:82` is the brief handed to the authoring agent session, and `close.ts:137` puts the label in the run record. The page a reader sees shows only the commit: "Pinned revision ${commit} of ${url}" (`render.ts:592`). The claim led to dropping "carry the label into the general dossier" from option A.
- Material corrections: restate the claim as "brief and close record carry the label; the rendered dossier page shows the commit". Then restore the carry-forward as part of A, or say why it is dropped.
- Evidence freshness: `7268edcc`. The original 2026-10-02 session was not inspected.

---

- Item: `consent-withdrawal-knobs`
- Scope verdict: Pass — the `bpyt.1.8` sequencing is accurate. The RFC 0005 cite (`admission-and-boundary.md:310-318`) does say a recorded revocation "immediately obliges every subsequent served render of a dependent claim to carry the withdrawal label". The knob 1 and knob 4 "refuses nothing today" claims match my sweeps (0 blockquoted field lines over 188 files; one `Supersession` line).
- Recommendation verdict: Pass.
- Material corrections: None.
- Non-material notes:
  1. The `act-families.test.ts:218-221` range starts one line late. The admission-stem-in-text case is line 217; lines 218-219 and 221 are the policy, class and field-line cases.
  2. The stop condition says "any in-force act record would read differently". The sweep reads every file under `decisions/`, not only act records, so phrase the stop as "any family's verdict over the current decisions tree changes". My sweep found 0 backtick-split stems in those 188 files today, so nothing trips it now.
- Evidence freshness: `7268edcc`; beads `syzygy-bpyt.1.12` and `syzygy-bpyt.1.8` read live. vitest not run.

---

- Item: `wire-unknown-typing`
- Scope verdict: Pass — the two mixed fields are now in the boundary, the census returns any further finds to you, and the unblock condition (`syzygy-1poh` behind `bpyt.6.3`/`bpyt.16`) matches the bead.
- Recommendation verdict: Pass.
- Material corrections: None.
- Evidence freshness: `7268edcc`. Live `/api/poc` bytes not inspected.

---

- Item: `foundational-acts`
- Scope verdict: Pass.
- Recommendation verdict: Pass — the P-12 checker consumer matches `check_governance.py` on the snapshot (21 WARN, 0 FAIL). CG-20 and CG-21 are advisory until the knowledge-hygiene policy is adopted, and CG-27 until P-12 is ruled. Option B is the distinct P-12-only path.
- Material corrections: None.
- Evidence freshness: `7268edcc`; checker run in the snapshot.

No files were edited and nothing live was changed.