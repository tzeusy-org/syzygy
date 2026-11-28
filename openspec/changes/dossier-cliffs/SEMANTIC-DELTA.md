# REQ-polaris-generation-034 cliffs semantic delta

## Predecessor

[Observed] REQ-polaris-generation-034 v2.48, the docs and code (syzygy-5dhm.119, A-342), at `5b414ea4e597a56e8b95fc0b00f467a778a64ad7` (tag `polaris-dossier-docs-and-code-v2.48`), `openspec/changes/dossier-docs-and-code/proposed/polaris-generation/spec.md`, SHA-256 `19a2fe88ec003d0a114051eccff33d1b92969fe5e7d80fb58370dc7a9cb162bf`, 313 scenario headings. It is the effective REQ-034 on `origin/main` when this was built. Versions 2.45 and 2.47 are held by other open changes (syzygy-5dhm.26, which amends REQ-033, and syzygy-5dhm.47, which amends REQ-034); where 2.47 lands first on this chain, this change is rebuilt over it by its script, its additions unchanged.

## Amended in place

- The title and the banner paragraph name version 2.49, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the cliffs; their predecessor bytes are kept as each line's prefix.

## Added

- Three paragraphs immediately after the docs-and-code page paragraph: recognizer `limit-default` version 1, its source and configuration candidates, every definition form, name pattern and value form it runs (each published as a regular expression), the ini and yaml line grammars and when a file is Unknown; the render's `limitsAndDefaults` member, its dispositions, read limits, batched reads, value checks, listing limits and labels; and the reference page `reference/cliffs.html`, its table, its rows, its `Not established.` statements, and the machine view's `limitsAndDefaults` member.
- Eight scenarios immediately after the last scenario: limits and defaults listed per unit; each source form read in code only; configuration entries in both forms; values the rule cannot read whole; files left out, set apart, Unknown or withheld; read limits, batches and listing limits; the page rendered; and no page without the member, or an Unknown member. The proposed requirement has 321 scenarios; the 313 predecessor scenarios are byte-identical.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-116/cliffs_build_spec.py` builds the proposed text from the predecessor's bytes; `docs/evidence/syzygy-5dhm-116/cliffs_inverse.py` removes its additions, restores the title and banner and recovers the predecessor exactly. The warrants are the predecessor's. No finding, brief, schema, gate or provider-mode byte changes; an operator-agent render that holds the member gains one page, its item on `contents.html`, its link in the reading order on every page, and one machine member. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
