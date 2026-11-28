# REQ-polaris-generation-034 cliffs semantic delta

## Predecessor

[Observed] REQ-polaris-generation-034 v2.50, the view levels (syzygy-3efd.39, A-274), at `46c7d02c92336dfa715e1f8dcfb90ab0c94ba9cf` (tag `polaris-dossier-view-levels-v2.50`), `openspec/changes/dossier-view-levels/proposed/polaris-generation/spec.md`, SHA-256 `4e291b8d20940d7f939b2443731e56c586eaf40dcde2d3765ef6fb18b29f3d9d`, 329 scenario headings. It is the effective REQ-034 on `origin/main` when this was rebuilt. This change was first built over the v2.48 docs and code as 2.49 and reviewed there; the imports corroboration took 2.49 and the view levels 2.50 on main first, so the script rebuilt it over each in turn, last over 2.50 as 2.51, its additions unchanged. Versions 2.45 and 2.47 are held by other open changes (syzygy-5dhm.26, syzygy-5dhm.47).

## Amended in place

- The title and the banner paragraph name version 2.51, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the cliffs; their predecessor bytes are kept as each line's prefix.

## Added

- Three paragraphs immediately after the docs-and-code page paragraph: recognizer `limit-default` version 1, its source and configuration candidates, every definition form, name pattern and value form it runs (each published as a regular expression), the ini and yaml line grammars and when a file is Unknown; the render's `limitsAndDefaults` member, its dispositions, read limits, batched reads, value checks, listing limits and labels; and the reference page `reference/cliffs.html`, its table, its rows, its `Not established.` statements, and the machine view's `limitsAndDefaults` member.
- Eight scenarios immediately after the last scenario: limits and defaults listed per unit; each source form read in code only; configuration entries in both forms; values the rule cannot read whole; files left out, set apart, Unknown or withheld; read limits, batches and listing limits; the page rendered; and no page without the member, or an Unknown member. The proposed requirement has 337 scenarios; the 329 predecessor scenarios are byte-identical.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-116/cliffs_build_spec.py` builds the proposed text from the predecessor's bytes; `docs/evidence/syzygy-5dhm-116/cliffs_inverse.py` removes its additions, restores the title and banner and recovers the predecessor exactly. The warrants are the predecessor's. No finding, brief, schema, gate or provider-mode byte changes; an operator-agent render that holds the member gains one page, its item on `contents.html`, its link in the reading order on every page, and one machine member. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
