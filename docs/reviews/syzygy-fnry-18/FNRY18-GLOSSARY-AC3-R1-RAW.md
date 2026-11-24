# REVISE

Independent AC3 review of `0860277fe115dbac6ad0afde8e4564453e2f3fb3`, tree `5f26df67c3a6028bcf588172840fd9553cf6a1f8`, parent `bdfe771a61d4a40c060981ddc6624a8889ce5ef4`. The exact three-path implementation and test delta is scoped to the operator-agent glossary and its Index relation. The provider golden source is unchanged.

## F1. The Index uses handle spellings for a relation governed by the displayed title

[Observed] REQ-polaris-generation-034 v2.26 at `openspec/changes/dossier-worth-knowing/proposed/polaris-generation/spec.md:226` defines a term entry “by its title.” A block names the term when its shown text holds “the title as a whole word” with the specified case, plural and hyphen-to-space forms. The same clause excludes a backticked span if it is “a term's title.” The displayed and screened text premise continues at line 228.

[Observed] In `apps/three-surface-poc/src/polaris-generation/dossier-finding.ts:133–136`, the term entry displays `append-only file` while the matching forms come from raw `append-only_file`. The supported `append only file` spelling of that displayed title is absent. Lines 161–164 also exclude the raw handle from identifiers. The new exact fixture pins the raw-handle term association and identifier exclusion at `packages/polaris-dossier/src/render.test.ts:2638–2643`.

[Observed] In a fresh detached clone, a separate ordinary-render fixture gave the introduction the displayed text `append-only file`, block p1 only the allowed `append only file` spelling and block p2 only the backticked `append-only_file`. Its expected machine pairs were the displayed term with home `term-glossary/append-only_file` and places `block-intro`, `block-p1`, plus a separate `identifier` at `block-p2` with null home. Current code returned only the displayed term with `block-intro` and `block-p2`. The two narrow HTML controls saw the displayed `dfn` and retained inline code. The independently named relation case failed once as expected. Fixture SHA-256 `51841dd45ceb74e924220a8f9c353565272c2bb5033a29d0946cd18bd5b54d74`. Report SHA-256 `d0f494e01195c55f74cf60592d71fcebc2fd2106b6c8b6d407babf7c9676ac19`.

Bind Index term matching and identifier exclusion to the exact displayed title. Raw first-use aliases can remain a separate glossary navigation behavior. Preserve the stable home fragment and screen/disclosure boundary. A matched example can distinguish displayed text, the displayed title's hyphen-space form and a qualifying raw backticked span in separate blocks with HTML and machine parity.

## Scoped verification

[Observed] Eight existing glossary/Index integration cases passed in the exact detached candidate. Both existing unit files for dossier finding and the unchanged provider golden passed 32 cases. The ordinary positive renders one definition per sample term, one first-use link, exact original fragments and the earlier hyphenated term's legacy spaced link. The scoped source sweep shows the existing withheld and Unknown controls remain in their current flow and no brief, schema, counted-review or authority files move. AC4 and arbitrary historical opaque-id reconstruction have no implementation in this subject.
