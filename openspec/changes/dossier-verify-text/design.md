# Design: `syzygy dossier verify`

One bead outcome (syzygy-5dhm.23) in one MODIFIED REQ-polaris-generation-033. The bead's design names `cli.ts`, `check.ts`, `git-object-reader.ts` and `screen.ts`; REQ-033 is the requirement that states the operator-agent command family and the rule that its local commands serve no route, so the new command is stated there. REQ-034 states the derivation the command reuses and is read, not changed.

## Why a specification delta at all

[Inferred] It adds a command to the `syzygy dossier` family, with a refusal, an output file and an exit status: specified behaviour under VIS-4, so a delta and an agent adoption row, not advice on an existing report.

## One derivation, not two

[Observed] `deriveFindings` already decides everything a reference or a quotation needs: whether a path is a blob at the pinned revision, the screen's decision (`screenPath`, then `screenTargetBody` on the bytes read), the retained text of a redacted body, the range rule, and the quotation normalisation and location (`locateQuote`). [Inferred] Writing a second walker over the same reader and screen would let the two drift; the bead forbids "a second hand-written filter". So `verify-text.ts` hands each reference and quotation to `deriveFindings` as one block of a synthetic subject (a closed schema of its own: a pinned revision and blocks, each one citation and at most one lead-in quotation), and reads the result back by block and citation identity. A finding kind other than the seven reference and quotation faults is a programming error and throws.

[Observed] Two passes: the first cites each distinct path at line 1, which yields absent, excluded or admitted and an admitted file's line count (for a whole-file reference); the second cites every written range, or the whole file, and every quotation against every such range of every resolving file its claim names. A quotation is verified when any of them holds it.

## What counts as a claim, a reference and a quotation

- **Claim.** A paragraph, a list item or a table row, outside fenced code. Headings, fences and table separators are counted apart. [Inferred] These are the units a reader would mark right or wrong; a sentence split would cut a claim from its citation.
- **Reference.** A run of path characters with a directory and an extension, or a bare name with a common source or document extension, or a bare dotfile written as code, or any of these followed by lines. Lines are written `path:N`, `path:N-M`, `path#LN-LM` or `path, lines N-M` (repeatable, which is how the dossier's own citations read as text). Not a reference: an absolute path, a URL, a host, a glob, a name that is only an extension, a slashed name without an extension and without lines (usually a directory). [Inferred] The bare-name extension list keeps `e.g.` and `obj.encoding` from reading as missing files.
- **Resolution.** [Inferred] A plain session writes `server.c` for `src/server.c`. A first scratch run over the pilot synthesis without resolution counted 66 references missing, most of them bare names; that run was not retained, so the figure is [Unknown] to a later reader. A written path resolves to itself, or to the one blob whose path ends with `/` and it; with several it stays unresolved and counts missing. [Inferred] Unique-suffix resolution credits the name only when it is unambiguous, and the annotated copy shows both forms.
- **Disclosed.** The report's disclosures name the excluded forms and the bare-name extension list, so a reader can restate the grammar a tally rests on.
- **Quotation.** A straight or curly double-quoted span outside code spans with at least one letter or digit. [Inferred] Backticked code is not a quotation: it is an identifier, and treating it as one would turn every symbol name into a "verified quotation" by coincidence.

## Six outcomes and their precedence

`path-missing`, `quotation-not-found`, `withheld`, `quotation-verified`, `reference-unverified`, `unanchored`. [Inferred] A fault comes first, so one wrong path or invented quotation is never hidden by a sibling that checks; withheld comes before verified, so a claim partly resting on what no reader can see is not counted as checked. A quotation located in no resolving file of a claim that also names a withheld path is withheld, not `quotation-not-found`: it may be in the file no reader can see, and calling it invented would be a claim nobody measured (VIS-2). A range past the file's end or an invalid range counts as `path-missing`: the reference names nothing that exists.

## Withheld paths

[Observed] The first pass consults the screen exactly as check does: a path the path screen excludes is never read; a body excluded by content screening is read by the screen and its bytes are not used; a redacted body contributes only its retained lines, and a quotation resting on a withheld line is withheld. A written or resolved path a secret detector matches (`secretPathOf`) is not named in the report or in the annotated copy's added text, whether or not a blob has it, as check's `pathLabel` names none in any finding; the copy still carries the input text, which is the reader's own bytes.

## Nothing written into a run

[Inferred] Stored runs are read-only evidence. The command refuses an `--out` inside the run directory or its `.agents`/`.sessions` siblings, decides containment on both the written and the real location (symbolic links resolved through every existing ancestor), refuses an existing `--out`, writes no revision, record or step-log line, and applies no deadline or repair-cycle limit, which spend a run's budget only when something is frozen.

## Legacy runs

[Observed] The pilot's stored run is a `polaris-dossier-run/1` record, and the command refuses it at re-verification as every step does. `scripts/dossier_verify_text.mjs` runs the same `verifyText` over the pilot manifest's commit, policy blob and screen configuration so the measurement does not wait for a new run; it is an operator script, not a second command.

## Names fixed for the implementation

`packages/polaris-dossier/src/verify-text.ts`: `extractClaims`, `referencesIn`, `quotationsIn`, `verifyClaims`, `annotateText`, `verifyText`, `CLAIM_OUTCOMES`, `VERIFY_TEXT_FORMAT`, `VERIFY_TEXT_DISCLOSURES`; `packages/polaris-dossier/src/verify-text-run.ts`: `verifyTextInRun`, `VERIFY_TEXT_MAX_BYTES`; `cli.ts`: the `verify` command; `scripts/dossier_verify_text.mjs`.

## Review (R-VERIFY-TEXT-SPEC-1)

[Observed] One fresh-reader review over spec digest `ad6e597ddc3b6dccce7fb5692e863e6535659db7651ee2b2942cff071d2bf3ed` recorded `REVISE` (`docs/reviews/syzygy-5dhm-23/R-VERIFY-TEXT-SPEC-1-RAW.md:3`): two blocking findings (F1, F2) and eight advisory (F3 to F10). All ten were repaired; none was overruled. Under D10 the review is one round and gates nothing, so no confirmation round was run and the adopted spec digest differs from the reviewed one.

- **F1** (blocking, withheld versus not found). The implementation's rule is kept and now stated: a quotation located in no resolving file of a claim that names a withheld path is withheld. Added to the paragraph, the precedence's `quotation-not-found` entry and the withheld scenario; a fixture pins it.
- **F2** (blocking, a detector-matched path named when no blob has it). Implementation repaired toward the spec: a reference is unnamed when its written or its resolved path matches a detector, whatever its state, as check's `pathLabel` is. The paragraph and the withheld scenario say so; a fixture and a mutant pin it.
- **F3** (content-excluded body). The paragraph distinguishes the path screen (never read) from content screening (bytes used for nothing but that screening).
- **F4** (grammar left to design). One sentence names the excluded forms and the letter-or-digit rule; the bare-name extension list is disclosed by the report rather than written into the requirement.
- **F5** (symlinked `--out`). Implementation repaired: containment is decided on the real location too; a fixture and a mutant pin it.
- **F6** (closing section). Now "each claim that names a file or quotes".
- **F7** (Form block). One added line names verify's case, oracle and falsifier.
- **F8** (quotation scenario). Now "one letter or digit … replaced by a different letter or digit", tied to check's own finding.
- **F9** (proposal label). The "all 180 resolving" clause is now [Inferred] from the record's reading.
- **F10** (usage error). The paragraph states that a malformed invocation is a usage error under the family's convention.

The reviewer also found no retained record for the "66 references missing" figure; it is now labelled [Unknown] above.

## Rebuilt as version 2.15

[Observed] Version 2.14 was taken on the default branch by the infrastructure recognizers amendment (a MODIFIED REQ-034) while this change was under review, so the change is renumbered 2.15. Its predecessor is unchanged: no later version than 2.1 replaces REQ-033, so the requirement block is the same bytes; only the spec's header line names the new version, which changes the spec digest. The review above read the version 2.14 header.
