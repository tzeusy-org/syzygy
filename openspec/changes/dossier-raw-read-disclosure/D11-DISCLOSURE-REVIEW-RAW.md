# Independent fresh-reader review of D11 dossier disclosure

Verdict: REVISE

Subject commit: d329f5dc90fe2d3e1bd0d58c934911ad601fade1  
Base commit: 1f1fd8b93ff0814aed6970fa62de93693009ef85  
Reviewer: coordinator:codex-20261122-c4d56092

I reviewed the frozen subject in a detached worktree. My reading of the intended boundary is that every dossier run carries the D11 raw-read and declared-provider risk disclosure. The appendix and every rendered page's machine form carry it when a site exists. Actual egress and read evidence retain their separately attributed populations. SEC-2, SEC-5 and RFC5-14/15 still bind every Syzygy-built prompt, payload, checked transmission, stored artifact and rendered byte. The exception belongs to the dossier authoring session's own reads.

## Findings

1. **High | The adoption checker mistakes later citations and linked vetoes for duplicate adoptions.** In `scripts/check_spec_reconciliation.py:2205–2225`, the path-suffix test counts a future row that merely links to the original specification at its original commit. I installed one synthetic canonical adoption in a scratch copy and observed it compose. Appending a later valid row whose change cell cited the original spec at the original commit changed the number of matching rows from one to two and refused R1. Appending a linked `Revert` row instead also refused R1 before the disposition reader, while `recorded_disposition` independently recognized the later row as the valid disposition A-1000. Preserve exact-tag malformed-claim checks, but require a snapshot-based claim to link the spec at the same commit as that row. Add a citation and an explicit linked disposition fixture. The current focused cases miss both failures.

2. **High | The new early-stop obligation can assert a read that never took place.** In `openspec/changes/dossier-raw-read-disclosure/proposed/polaris-generation/spec.md:35–37,105–108`, a run record always states that the session read the raw clone unscreened, including after refusal of a dependent step. A recorded URL run can stop before the authoring session launches or the clone reaches it. The record still owes the SEC-2 channel and risk disclosure. Give the run a separate attributed launch/read state so the mandatory disclosure never asserts an observed or completed session event in that case. Include a refused-before-launch case and an operator-started case whose actual read evidence is Unknown.

3. **High | The operative 046 text leaves the boundary around the session's raw reads ambiguous.** At `spec.md:224,228`, the rule still says a denied path is “never read” and that a placed governance document “SHALL reach the declared provider only as governance-text”. The later scenarios at lines 258–261 and 289–292 correctly specify Syzygy as the actor. A reader of the operative paragraphs can still apply source classes and path restrictions to the session's direct raw-clone reads, contrary to 036 and adopted SEC-2. State explicitly that 046 admission, exclusion and classified delivery apply to Syzygy's reads and checked flows. Preserve complete screening of owned URL acquisition under 047. Clarify that access to an existing supplied clone neither changes that owned-acquisition constraint nor authorizes an additional transport route under 025/048.

4. **Medium | The run-record compatibility contract for the disclosure is unspecified.** At `spec.md:29`, new runs retain strict `polaris-dossier-run/2` exact required fields. Lines 35–37 require the new disclosure in that record and line 220 extends it across policy versions. The text leaves a reader to choose between requiring a new field in every historical /2 record, mutating an existing record, or projecting a disclosure without a defined record binding. Name the authoritative stored form and binding for new and resumed runs, and specify the behavior of a valid historical /2 record without the disclosure. State in the operative requirement that v1–v3 policy bytes stay committed and unedited, old URL runs retain their recorded base-plus-overlay binding, and a missing original binding refuses without changing run files. The new scenario covers a missing policy but leaves a valid historical record and a newly initialized no-site run insufficiently specified.

5. **Medium | The D11 verification forms do not fully pin the new promises.** At `spec.md:118–122`, 033 extends its observable, but its case, oracle and falsifier do not explicitly cover a missing or false early-stop disclosure, a generated machine page without the disclosure, or a checked relay refusal regression. At lines 318–322 the 046 test form stops at v3, even though the new v4 equality paragraph and scenario introduce a claim across classified inputs, stored artifacts and checked transmissions. Add the positive and failure conditions to the forms, drawing on the independent expectations already described in `design.md:13`. Add the materially relied-on 048 parent to the new 033 disclosure's machine warrants at line 132, where 025 alone is currently listed.

## Composition and evidence

[Observed] I replayed all 14 requirement hunks against their declared predecessor blocks. The result matches the successor requirement bodies, with only trailing inter-requirement blank-line differences. Scenario counts are 033 6→9, 036 6→7 and 046 13→14. I replayed the seven policy JSON field changes. They account for the full v3→v4 parsed change and preserve the other classifier, detector, path, exclusion and metadata values. The candidate patch leaves all three earlier policy files and the three predecessor specification paths untouched.

[Observed] On the frozen candidate, reconciliation reported 7/7 predicates without FAIL, with two preexisting report-only R6 pin warnings. The separate count reported 39 effective requirements and 473 scenarios. I ran the eight focused candidate binding/composition fixtures separately in a scratch copy. Two controls held and six mutants were killed. The synthetic citation and linked veto counterexamples above both reproduced against the frozen checker.

[Observed] The subject's base includes the 2.16 adoption. I found no 2.17 adoption in the frozen README and ledger. [Unknown] The effect of any live 2.17 change on 033, 036, 046 and on the two composition/check paths. Before adopting 2.18, compare the actual effective 2.17 predecessors by requirement and preserve any overlapping obligation. Run both counters against the combined base, compare their identity sets, and verify the adopted tag resolves to the actual installed subject bytes. This review confirms candidate behavior over the frozen base only.

## Subject SHA-256

- `3bd14a846910d26a9efbd5528e07e619e93af87634559e024c7e1957bb1ab3ae`  openspec/changes/dossier-raw-read-disclosure/SEMANTIC-DELTA.md
- `7cd115856c206232074aee04fb2d41bb0675d897d8971b795e13e5fcc0ee5e66`  openspec/changes/dossier-raw-read-disclosure/design.md
- `0459aba9e9f4098d0aa188b0be4acbca27df8dbe1aa6d401b8ca3244832c1712`  openspec/changes/dossier-raw-read-disclosure/proposed/polaris-generation/spec.md
- `d3abcb31c98bfd303c2bf477cc461787cacf26811cb640d925da1de347246da9`  .syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json
- `740f5bffc1c8e0df9fed484ac7686bc3fec4d078e3b48d0c954ad23551c68a07`  scripts/check_spec_reconciliation.py
- `0af7887ea40de057fd0daf125ffbec58bc50743f9863253b4e53c4d97e912beb`  scripts/count_polaris_effective_scenarios.py

## Governing reference SHA-256

- `0f2ae0adbcf6d884253d5ccdb92f76b739a6e0a838a62dcb00a27e58a5955861`  .syzygy/governance/doctrine/security.md
- `d03a729e291bc84817cd4b4daab76a2ee66d08dcb3562b69839bd390ca6f34a6`  .syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md
- `e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865`  openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md
- `d17dad153f030bd935059a8b0df24286d72370b275a5fb4052de901b2af4e040`  openspec/changes/dossier-declared-source-model/proposed/polaris-generation/spec.md
- `494dcd81b3bb8d0638c5a517e9fa1005720cac8b39cba34751f5f6ee62eeb018`  openspec/changes/dossier-declared-source-readmission/proposed/polaris-generation/spec.md
