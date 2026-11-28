# REQ-polaris-generation-034 docs and code semantic delta

## Predecessor

[Observed] REQ-polaris-generation-034 v2.44, the rough-edge markers (syzygy-5dhm.46, A-338), at `aca3476d7f9fab2eedc7d4a1b0831dd38ff695c0` (tag `polaris-dossier-rough-edges-v2.44`), `openspec/changes/dossier-rough-edges/proposed/polaris-generation/spec.md`, SHA-256 `3c03ebff0f05c791fed0ddcd3a6cec5d259db64a8fcb7eb47b3b661c4e5661c1`, 305 scenario headings. It is the effective REQ-034 on `origin/main` when this was built. Versions 2.45, 2.46 and 2.47 are held by other open changes (syzygy-5dhm.26, syzygy-05 and syzygy-5dhm.47); where one lands first on this chain, this change is rebuilt over it by its script, its additions unchanged.

## Amended in place

- The title and the banner paragraph name version 2.48, its predecessor and its tag.
- The event-response form's Observable, Oracle and Falsifier lines each gain one sentence for the docs and code; their predecessor bytes are kept as each line's prefix.

## Added

- Three paragraphs immediately after the rough-edges page paragraph: recognizer `doc-reference` version 1, the documents it reads, the two places it reads in them, every expression it runs (published as a regular expression), the path and identifier forms, how each resolves and when a row is Unknown; the render's `docsAndCode` member, its dispositions, value checks, quote excerpts, listing limits and labels; and the reference page `reference/docs-and-code.html`, its tables, its three row sections, its `Not established.` statements, and the machine view's `docsAndCode` member.
- Eight scenarios immediately after the last scenario: documented paths and identifiers resolved; an identifier absent while a code file is unread stays Unknown; tails, directories, submodules and climbs; symbolic links, submodule ancestors, secret-only directories and names in comments or strings; documents left out, set apart, Unknown or withheld; long lines quoted by an exact excerpt; the page rendered; and no page without the member, or an Unknown member. The proposed requirement has 313 scenarios; the 305 predecessor scenarios are byte-identical.

## Carried and reversed

[Observed] `docs/evidence/syzygy-5dhm-119/docs_and_code_build_spec.py` builds the proposed text from the predecessor's bytes; `docs/evidence/syzygy-5dhm-119/docs_and_code_inverse.py` removes its additions, restores the title and banner and recovers the predecessor exactly. The warrants are the predecessor's. No finding, brief, schema, gate or provider-mode byte changes; an operator-agent render that holds the member gains one page, its item on `contents.html`, its link in the reading order on every page, and one machine member. The POC core's narrow screening subpath also exports the PWB-REQ-006 recognizer the rule reads fences by; nothing it already exported changes. REQ-polaris-generation-033 and REQ-polaris-generation-035 are not amended.
