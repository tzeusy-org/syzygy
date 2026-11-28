# Design

## Why resolves and not agrees

[Inferred] The slice bead's title names the `agrees` and `document-only` classes, but its move (syzygy-5dhm.107), whose What text binds the slice, says a row is `resolves` when the documented name exists and `agrees` only when a stated value was also compared and matched, and that existence is never reported as agreement. A path or an identifier carries no stated value, so every row this version decides is `resolves` or `document-only`; `agrees`, `disagrees` and `code only` are the configuration-key and command slices' (syzygy-5dhm.120, .121). The page says so in its note.

## Why code spans and inline links, read by the PWB-REQ-006 recognizer

[Inferred] A maintainer marks a path or a name as code by putting it in backticks, and points at a file by linking it; prose words outside those are as often English as names, so reading them lexically would guess. Fences are read by `recognizeCodeContexts`, the one recognizer a clause states, never by the mask (AGENTS.md, "Markdown fences"); it is exported on the POC core's narrow screening subpath, which already reaches that module through `scanActiveContent`, so no Polaris package imports the barrel. A body the recognizer reports malformed is Unknown, not read past its fault. Reference-style links, autolinks and HTML anchors are not read at this version.

## Why these forms, published whole

[Inferred] The move asks that the matching be lexical with its rules printed. Every expression the code runs is a code span of the recognizer paragraph, and `docs/evidence/syzygy-5dhm-119/docs_and_code_patterns_published.mts` checks that each of the eight compiles to the code's own source. A bare name is a path only with a listed extension, so `e.g.`, `1.2.3` and `build` are not read; a bare name with `js`, `ts` or `in` (`Node.js`) and a slashed name with no extension (`src/core`, `application/json`) are read but can only resolve or be Unknown `ambiguous-form`, never document-only. An identifier needs a mark of code (an underscore, `$`, camelCase, a separator or `()`), so `Server` and `API` are not read.

## Why a path tail resolves

[Observed] Built first with exact paths only, Syzygy's own tree at `21a06e8d1` gave 132 document-only code-span paths among 2000 listed rows; many were written from a directory below the root (`decisions/AGENT-ADOPTIONS.md` for `.syzygy/governance/decisions/AGENT-ADOPTIONS.md`). [Inferred] A writer names a file by enough of its path to find it, so a code span that does not start `./` or `../` also resolves where a listed path ends with `/` and it; a bare name is the one-segment case. A link keeps Markdown's meaning and resolves from the document's directory alone, so a broken link is still document-only. The cost is that a short tail can match a file the writer did not mean; the row names the file it matched.

## Why an absent identifier is Unknown unless every code file was read

[Inferred] A path's absence is read from the whole tree listing, so `document-only` for a path is Observed. An identifier's absence is read from the code files read, which a read limit, the screen and the class gate can cut short, so absence is stated only where nothing was left unread; otherwise it is Unknown `code-not-fully-read` (VIS-2). Comments and strings are blanked for the five languages the test-name lexer reads, so a name only in a comment does not resolve there; other languages are searched in their whole text, and the row says which.

## Why a symbolic link, a submodule or a secret-only directory never yields document-only

[Observed] Review R-DOCS-AND-CODE-1 (F1) found `docs/`, docs/guide.md and a link into a symbolically linked `docs` reported document-only, a directory holding only a submodule (`deps/`) and the submodule's own name (`libfoo/`) document-only, and a directory holding only a secret-matching path document-only. [Inferred] Each is a false Observed absence: the tree lists an entry there that the rule does not follow, list or name (VIS-2). A path at or under a symbolic link is now Unknown `symbolic-link`; a submodule's ancestors are directories, and a span whose tail reaches a submodule is Unknown `submodule`; a row naming a directory that only secret-matching paths hold, or by its tail a file only a secret-matching path holds (found by mutation run 1), is left out and counted, so neither is named (SEC-5 is untouched: nothing new is read or rendered).

## Why a name only in a comment or a string resolves, and says so

[Observed] F2 of the review: `DATABASE_URL` and `max_retries`, read by the code only as string literals, were document-only. [Inferred] Environment variables and configuration keys are among the most common code spans in documentation, and they live in strings; the code does hold them. Where no code text holds a name, the whole text of each lexed file is searched, and a hit resolves with `searched` `comment-or-string`, worded on the page as found in a comment or a string, not the code text. The code text is still preferred, so the evidence names real code where it exists. A name only in a comment also resolves this way; the evidence says which kind of text held it.

## What is read as prose, and what is not counted

[Inferred] The PWB-REQ-006 recognizer treats neither HTML comments nor indented code blocks as code contexts (review F4), so a span inside either is read; the requirement and the page note say so rather than adding a second fence rule (AGENTS.md: read fences by the recognizer, never another). A link around an image (`[![alt](img.png)](page.md)`) is read as the image, and the outer destination is now counted in `linksNotChecked` (F5).

## Recorded, not repaired

- [Inferred] An identifier resolves by its last name alone (F6): `Foo.render()` resolves on any `render` token. The requirement publishes it and each row names the file and line it matched; requiring the qualifier is a later version's choice.
- [Inferred] The 390-pixel fit is inferred from the markup (`overflow-wrap:anywhere` on every list, tables in `table-scroll`), which follows the rough-edges page; no browser sweep renders this page (F7).

## Why long lines are excerpted

[Observed] With the whole line as the quote, the value checks left out 6277 rows on Syzygy's own tree, almost all for lines past 256 characters (Markdown paragraphs are often one line). [Inferred] An exact 256-code-unit excerpt holding the reading keeps the row checkable and the value checks unchanged; `quoteExcerpt` and the page say it is an excerpt. With it, 57 rows are left out.

## What it costs a render, and what it found on Syzygy's own tree

[Observed] `docs/evidence/syzygy-5dhm-119/docs-and-code-before-after-2026-11-28.json` (commit `0980dfd79`): for a run whose statement lists both classes, 3244 candidate documents, 958 read, 2286 Unknown (2244 past the read limit), 35384 rows: 26393 resolve, 3055 document-only, 5936 Unknown. The first 2000 rows listed hold 100 document-only paths (54 code spans, 46 links); among them the `th-engineering` skill's `SKILL.md` links six subskills the tree does not hold (`git ls-files .claude/skills/th-engineering` lists four files). 81 listed identifiers are Unknown because 1424 code files were not read. For a run relying on no statement, the class gate withholds every document and no row is derived. [Observed] The derivation took 41 to 92 seconds in three runs, almost all of it in about 2000 single-blob reads (70 of 89 seconds measured in one run); the rough-edge markers pay the same per-read cost, and batching both is a later change.

## Why render-only

[Inferred] As with the rough-edge markers, the member is derived at render only: check writes none and the brief says nothing of it. Surfacing a disagreement as a callout on the Pole that covers it is the move's later slice.
