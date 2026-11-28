# Design — URL dossier lean run 2.46

## D1 — The label

[Observed] When this was drafted the newest version on main was 2.43 (A-272), and another change held 2.44 and 2.45; 2.44 has since landed as A-338. So this one takes 2.46. Its tag is `polaris-dossier-url-lean-run-v2.46`.

## D2 — Restate over 2.1, do not retire it

[Observed] Versions 2.17, 2.18, 2.21, 2.27, 2.28 and 2.30 compose their 033 and 035 over 2.1. A veto row for A-14 would take 2.1 out of the composition. Every one of those versions would then be refused, and the checker's R1 and R3 would fail. So 2.46 replaces only 025 and 047, over the 2.1 texts, and 2.1 stays effective for 033, 035 and 048.

## D3 — Composition

[Observed] The checker composes 2.46 last, after 2.44, once `url_source_binding` is effective. It replaces exactly 025 and 047 by ID (method A) and by name (method B), and the two must agree. The scenario change is counted from the 2.1 and 2.46 texts, never written in: 025 goes from 14 to 6 and 047 from 24 to 5, so the change is −27.

[Observed] The derived-base screening projection keeps the census of its own time. It restores 025 and 047 to the 2.1 texts, read by both parsers, before it projects, and applies 2.46 after the projection like every later version. So the two screening sentences in `PROJECT-STATUS.md` (579 and 603 scenarios) and the generated census files do not move.

[Observed] The status count sentence for this version comes after the rough-edge markers sentence. So the selftest's projected history, which drops 2.36 and every version after it, drops this row and its routes too. The `leanrun_cases` family puts the row back over the projected base, where 2.1 is effective, and checks five things:

- the pending state;
- the effective state (025 and 047 replaced, nothing else changes);
- refusal without 2.1;
- the four malformed-row refusals and the R2 byte refusal;
- the veto.

## D4 — What 047 keeps

[Inferred] The 2.46 text of 047 keeps 2.1's immutable pin, the public or private visibility declaration (labelled Inferred) and the network-free `syzygy dossier init` entry. It drops the locator grammar, the source-transport provider, the native protocol profile, the decoder and the all-admitted gate. Without them, a one-commit fetch writes git objects before any screen. `init`'s checks and the per-read screening of REQ-polaris-generation-033 still apply to every object a later step uses, as they already did for a supplied clone.
