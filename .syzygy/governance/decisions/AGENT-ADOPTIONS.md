# Agent adoptions

Every change an agent adopts under VIS-4 (doctrine `vision.md`, as amended
by D10), one row each. Rows are appended and never edited. A veto is a new
row that reverts an earlier one. The report to the owner is the pull request
or session summary that links the row.

Owner-class changes (doctrine; secrets; writes into repositories the owner
does not own; exposure beyond the tailnet, release, deployment, multi-user)
are not adopted here: the owner decides them, and the decision is recorded
as the owner's words with the commit that applies it.

How to add a row: land the change on the default branch, then append one
row naming the commit, what changed, why, and the command that reverts it.
A specification version also gets a git tag, named in the last column.

| Id | Date | Commit | What changed | Why | Revert | Tag |
|---|---|---|---|---|---|---|
| A-1 | 2026-11-18 | `dd932da5a` | CC-REV-2 names the CC-IMPACT-6 recorded spec lag as its one exception | The two clauses contradicted each other once D10 amended CC-IMPACT-6 (R-D10-PACKAGE-RESUME-1) | `git revert dd932da5a` (reverts A-2 too) | — |
| A-2 | 2026-11-18 | `dd932da5a` | `d10_supersession.py` treats D10 as in effect only when its record verifies | A bare or forged record file, or a recordless install, silenced the superseded checks (R-D10-PACKAGE-RESUME-1) | `git revert dd932da5a` (reverts A-1 too) | — |
| A-3 | 2026-11-18 | `f3298b88b` | `supersededByD10` also requires the replaced file to hold exactly the bytes D10 installed; dossier tests follow the adopted doctrine | A later doctrine or RFC-0005 edit kept the D9 and class acts in force; 30 tests failed on the adopted tree | `git revert f3298b88b` | — |
| A-4 | 2026-11-18 | `182a703b2dbae97a16ae7334cd84a32b634cedc0` | [specification2.0](https://github.com/tzeusy-org/syzygy/blob/182a703b2dbae97a16ae7334cd84a32b634cedc0/openspec/changes/dossier-declared-source-model/proposed/polaris-generation/spec.md); [screening policy](https://github.com/tzeusy-org/syzygy/blob/182a703b2dbae97a16ae7334cd84a32b634cedc0/.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json); [four scoped N/A judgments](https://github.com/tzeusy-org/syzygy/blob/182a703b2dbae97a16ae7334cd84a32b634cedc0/.syzygy/governance/decisions/DOSSIER-DECLARED-SOURCE-CONTRACT-APPLICABILITY.md) | Replace retired dossier consent gates with declared pinned local sources under D10, preserving SEC-5 and the reviewed034–036 behavior; F-3/F-4/F-5 remain separate | `git revert -m 1 182a703b2dbae97a16ae7334cd84a32b634cedc0` ([tail preparation](https://github.com/tzeusy-org/syzygy/pull/825)) | `polaris-dossier-declared-source-model-v2.0` |
| A-5 | 2026-11-20 | `0190b8a6c` | The battery and hosted workflow drop ten checks that printed only SUPERSEDED under D10 (143 to 133) | They held performed acts to bytes D10 replaced and proved nothing (D10 FOLLOW-ON F-5, slice 1) | `git revert 0190b8a6c` | — |
| A-6 | 2026-11-20 | `4b8eca0bf` | Eleven leaf ceremony scripts deleted, two battery lines with them (133 to 131); their citations classify as history | Nothing imported them and D10 retired the acts they recorded (D10 FOLLOW-ON F-5, slice 2) | `git revert 4b8eca0bf` | — |
| A-7 | 2026-11-21 | `c0ec98b3d` | `check_governance.py` drops CG-2e, CG-6, the CG-7 family, CG-15, the act and digest-copy registries and `CONTRACT_SUCCESSOR_CHAIN` (12,062 to 5,532 lines, 433 to 197 fixtures); four scripts that read them keep working | Those checks held performed acts to digest-copy and successor-chain ceremonies D10 retired (D10 FOLLOW-ON F-5, slice 3) | `git revert c0ec98b3d` | — |
| A-8 | 2026-11-21 | `87b904d4a` | Twelve ceremony scripts and `ACCEPTANCE-PHRASE-REGISTRY.yaml` deleted; CG-2a/2b/2f retired with the registry; two battery lines go (131 to 129) | Nothing live used them and D10 retired the acts and phrases they served (D10 FOLLOW-ON F-5, slice 5) | `git revert 87b904d4a` | — |
| A-9 | 2026-11-21 | `77225f212` | `AGENTS.md` (orientation, routing, hard prohibitions, six superseded notes), `PROCESS-GLOSSARY.md` and the `heart-and-soul` skill state the D10 regime: four owner classes, agent adoptions, veto | They still told agents to find an owner act, wait for sign-off and treat bound digests as edit locks, which D10 retired (D10 FOLLOW-ON F-8; `polaris-dossier` waits for F-3) | `git revert 77225f212` | — |
| A-10 | 2026-11-21 | `d52d28932` | The offerings D10 withdrew are marked: a banner on the two unpinned registry-entry packets, and a `WITHDRAWN.md` beside the two digest-pinned packets (the second Anthropic egress version; the redis-redis drawer and OpenAI provider statements). The pull request names each path | So no session offers a retired act to the owner again (D10 FOLLOW-ON F-11, RETIREMENTS.md §C) | `git revert d52d28932` | — |
| A-11 | 2026-11-21 | `66eb9219f` | `PROJECT-STATUS.md` gains a D10 governance-regime section (owner classes, agent adoptions, veto, acts as history) and dated marks on the sentences D10 made stale | The status page still described every change as waiting on an owner act or sign-off (D10 FOLLOW-ON F-9; the battery trim waits for F-5) | `git revert 66eb9219f` | — |
| A-12 | 2026-11-21 | `0457ccad7` | Craft-and-care CC-REV-4/6 and CC-SEC-2/3/4, the normative-change workflow, the spec-authoring guide and the term registry state the D10 regime (one non-gating review; adoption by agent row; egress by declared provider; sandboxed execution by the agent; write consent only outside the owner's repositories); CC-SEC-3 folds P-117 | These texts still required owner arbitration, per-project egress consent, an accepted profile before any execution and owner adoption of every spec (D10 FOLLOW-ON F-7) | `git revert 0457ccad7` | — |
