# R-MIGRATION-BOUNDS-SPEC-1 — REQ-polaris-generation-034 version 2.41 (migration bounds)
Verdict: REVISE
Reviewed commit: 617a1081b
Spec sha256: 87d64cdd7ded843aed556c1749f280079e9428221589f52daec6033524748e93

Reviewer: fresh-context specification review, read-only. Subject: `openspec/changes/dossier-migration-bounds/` at 617a1081b (install commit de82c1bd). Implementation compared: `origin/agent/syzygy-3efd.37-code` at c68704b74, `packages/polaris-dossier/src/system-model.ts` (`migrateDraft`, lines 315-357), `draft-schema.ts`, `check-derive.ts`, `check-model.ts`, `system-model.test.ts`.

## What was checked

- [Observed] `sha256sum proposed/polaris-generation/spec.md` = 87d64cdd…e93, matching the brief. Predecessor `dossier-figure-walks/proposed/polaris-generation/spec.md` = ea18e7d7…75cf, matching SEMANTIC-DELTA line 11.
- [Observed] `diff` predecessor → subject: hunks at lines 1, 3 (file head), 142, an insertion of 7 lines at 1919-1925 (the new scenario), 1928-1930 and 1932 (Case, Observable, Oracle, Falsifier). Scenario headings: 291 → 292.
- [Observed] `python3 scripts/count_polaris_effective_scenarios.py` at 617a1081b: "TOTAL: 39 requirements, 639 scenarios"; "PROJECT-STATUS.md asserts: 39 requirements, 639 scenarios".
- [Observed] Row A-272 (AGENT-ADOPTIONS.md:132) names de82c1bd, links the spec at that commit, gives `git revert de82c1bd…` and the tag, and says "No review has read this version". design.md "Review" says the same. Honest.

## Criterion 1 — arithmetic

- [Observed] One element per node and per group: `migrateDraft` calls `addElement` once per graph node (system-model.ts, `nodeIds`) and once per group in preorder (`visit`); one relationship per edge (`edgeIds`). The dedup sets `elementIds`/`relationshipIds` merge only on a repeated `id`, and `deriveFindings` (check-derive.ts:146-154) raises `duplicate-id` for any repeated `id` anywhere in the subject, so a v10/v11 draft check passes has none: no merge. Matches spec.md:142 ("one for one … the merge by identity joins none").
- [Observed] A nesting is not a relationship: `visit` passes the parent id as the element's `parent`; nothing is pushed to `relationships` for a group. Matches spec.md:142 ("a nesting becomes an element's `parent`, never a relationship").
- [Observed] Sequence/swimlane members never enter the model (`if (!GRAPH_KINDS.has(diagram['kind'])) return diagram;`).
- [Observed] Per-view bounds cannot be exceeded: v10/v11 graph `nodes` 1-40 and `edges` 1-80 (draft-schema.ts:398-403) equal the v12 graph view's 1-40 / 1-80 (`MODEL_BOUNDS.graphElements`, `graphRelationships`, draft-schema.ts:181-182); a v11 containment check passes holds at most 40 groups and nests at least one (spec.md:120), so 2-40, equal to the containment view's 2-40.
- [Observed] View count: `diagrams: list(diagram, 0, 20)` in every version (draft-schema.ts:447); migration keeps diagram count.
- [Observed] Parent chain: a containment nests at most three levels (spec.md:120), so a parent chain is at most two links; no v12 parent-depth bound is exceeded.
- [Observed] Labels and ids: element `label: text`, `id: handle` (draft-schema.ts:451) are the node's and group's own schema types (398-403, 359). No new string is minted except `type`, drawn from `UNIT_KIND_TYPES` or `module`.
- [Observed] JSON depth (`DRAFT_JSON_LIMITS.maxDepth: 16`, check-model.ts:28): migration does not deepen — `$.model.elements[j].citations[c]` is the same depth as `$.diagrams[i].nodes[k].citations[c]`, and shallower than a nested group's path.
- One bound is not covered: the draft's own reader bounds. Finding 1.

## Findings

1. **Blocking. [Inferred] The narrowed parity still overclaims: migration strictly grows the draft, so a v10/v11 draft that check passes near the draft's 4,194,304-byte or 500,000-value bound can migrate to a draft check refuses, though its model fits the v12 bounds.**
   - Where: spec.md:142, the parity sentence "For every draft d of schema v10 or v11 that check passes and whose migrated model fits the bounds of the v12 model, check passes the migrated draft"; and the 2.41 Falsifier, spec.md:1932 ("a draft whose nodes and groups number at most 200 and edges at most 400 migrates to a draft check refuses").
   - Evidence: [Observed] spec.md:196 states check reads a draft "under the draft's bound of 4,194,304 bytes" and refuses one past it with no check record; spec.md:192 names the draft's bounds as "4,194,304 bytes and 500,000 values"; code `DRAFT_JSON_LIMITS = { maxBytes: 4 MiB, maxNodes: 500_000, maxDepth: 16 }` (check-model.ts:27-28). [Observed] `migrateDraft` keeps every member and adds: one `model` object with two arrays; per graph diagram a `view` object with two arrays in place of `nodes`/`edges`; per element a `type` string; per non-top group a `parent` string; one id string per view entry. It removes only the `nodes`, `edges`, `groups` and per-group `children` containers. [Inferred] Net, the value count rises by at least 3 + (1 + 2n + e) per graph of n nodes and e edges, so a draft at or just under 500,000 values with any graph diagram migrates past it. Bytes rise likewise under any serialization that does not drop whitespace the original carried (`"type":"module",` alone is 16 bytes per untyped node). [Unknown] Whether a check-passing draft can reach 500,000 values within 4,194,304 bytes; not probed. The byte case needs only a compact draft near 4 MiB, which the lists of `inspected`/`selected`/`excluded`/`executions` admit. Not probed.
   - Why it matters here: the brief asks whether another bound a passing v11 draft can exceed after migration exists. This one is draft-wide, not a `model` bound, but the 2.41 sentence states the model bounds as the whole condition ("exactly where"), and the 2.41 Falsifier would fire on a correct implementation. The spec also never states how the migrated draft is serialized, so "check passes the migrated draft" is undefined for the byte bound. The code's own test bypasses the reader (`findingsOf(A, migrateDraft(v11)!)`, system-model.test.ts:684), so nothing pins either reading.
   - Repair (one of): (a) add the draft bounds to the parity's condition: "…whose migrated model fits the bounds of the v12 model and whose migrated draft is within the draft's 4,194,304 bytes and 500,000 values", naming the serialization the byte count is taken over (or stating that the parity is over the parsed value and the reader bound is outside it); or (b) state that the parity is over check's derivation from the migrated value and that the reader bounds are out of scope. Adjust the Falsifier to match. "Exactly where" in the arithmetic passage is correct for the model bounds alone and may stay if the parity sentence carries the extra condition.

2. **Note. [Observed] The scenario covers the relationships boundary on both sides but the elements boundary only far past it, and pins no case where groups and nestings are counted.**
   - Where: spec.md:1920-1924; Form Case, spec.md:1928 ("whose graph nodes and containment groups number 200 and 201 in all and whose graph edges number 400 and 401 in all"); design.md:30.
   - Evidence: the scenario asserts 222 elements (refused), 200/400 (passes) and 401 edges (refused). No 201-element case, though the Case line names 201. The 401-edge draft does not say its node-and-group total, so a fixture at, say, 210 nodes would draw two findings and still "satisfy" the AND clause. No fixture holds a containment, so the two load-bearing arithmetic claims — groups count as elements, nestings never as relationships — are untested by any scenario (an implementation that emitted each nesting as a relationship would pass all three cases with containment-free fixtures).
   - Repair: in the AND clause, say the 401-edge draft holds 200 nodes and groups, add a draft of 201 nodes and groups with 400 edges drawing `$.model.elements` only, and make the 200/400 draft include a containment (e.g. 160 graph nodes and 40 groups, with 400 edges and its nestings) that passes, which pins both counting rules.

3. **Note. [Observed] "Their schema documents admit a draft of up to 800 nodes and groups" is inaccurate as worded.**
   - Where: spec.md:142 ("The v10 and v11 schemas bound each diagram and not the draft (up to 20 diagrams, a graph of up to 40 nodes and 80 edges, a containment of up to 40 groups), so their schema documents admit a draft of up to 800 nodes and groups and 1,600 edges"); design.md:16 says the same.
   - Evidence: spec.md:120 (2.23): "The v11 schema document defines `children` recursively with no bound on depth, so depth and the total are the findings below alone." The 40-group total is a check finding, not a schema-document bound; the v11 schema document alone admits an unbounded number of groups. The 800 figure holds for drafts check passes, which is what the parity needs.
   - Repair: "so a draft check passes may hold up to 800 nodes and groups and 1,600 edges" (or "their schemas and checks admit").

4. **Note. [Observed] The added passage reuses the variable d after the sentence that leaves the universal it was bound in.**
   - Where: spec.md:142, "The migrated model's elements are d's graph nodes … So d's migrated model fits …", which follows "No parity is stated for a draft check does not pass: …".
   - Evidence: d is bound by "For every draft d of schema v10 or v11 that check passes and whose migrated model fits…", which includes the very condition the new passage defines. Read literally, the passage explains the bound for a d that already satisfies it. Plain-language bar (CC-SPEC) prefers a fresh referent.
   - Repair: open the passage with "For a draft of schema v10 or v11, the migrated model's elements are its graph nodes…" and drop d in the next sentence.

5. **Note. [Observed] SEMANTIC-DELTA says "5 are amended in place (below)" and lists six bullets.**
   - Where: SEMANTIC-DELTA.md:15 and 21-26.
   - Evidence: the first two bullets are both edits to line 142 (one replacement, one insertion), so five lines are correct (142 and the four Form lines, confirmed by `diff`), but a reader counting bullets gets six.
   - Repair: say "5 lines are amended in place, line 142 in two places", or merge the first two bullets. The file is generated, so change `migration_bounds_delta.py`.

6. **Note (code, not spec). [Observed] The syzygy-3efd.37 test does not yet assert design D5's migrated boundaries.**
   - Where: design.md:39 (D5) and tasks.md last item; system-model.test.ts:663-689 on origin/agent/syzygy-3efd.37-code.
   - Evidence: the bounds test at 663-672 checks 200/201 and 400/401 on a hand-built v12 model, not on a migrated draft; the bead-labelled test at 675-689 migrates only the 222-node draft (with 6 edges, not the scenario's 60). The task is open, so this is not an inconsistency yet.
   - Repair: when the code lands, migrate v11 drafts at 200/201 nodes-and-groups and 400/401 edges (including one with a containment, per finding 2) and assert the findings.

## Criteria 3-5

- [Observed] Form lines, design.md, SEMANTIC-DELTA, README, proposal, openspec/README row, PROJECT-STATUS paragraph and row A-272 agree with the spec text, apart from findings 3 and 5. The census 638 → 639 is confirmed by the script. The row and design.md say no review read the version.
- [Observed] Composition: 2.38's withheld-end exception text is carried unchanged after the narrowed opening; 2.41 restricts who the sentence covers, so the two compose as design.md D6 says. 2.39 and 2.40 apply to v13+/v16 members only (spec.md:252, 282 keep v15-and-earlier drafts as before), and a migration yields v12, so they do not interact. [Inferred] 2.35's screening is untouched: the only finding named is the existing `schema` finding, whose detail is a count.
- [Observed] Prose is otherwise plain; findings 3 and 4 are the only ambiguities found.
