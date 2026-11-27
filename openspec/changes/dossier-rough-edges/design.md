# Design

## Why comments, through the test-name lexer

[Inferred] A maintainer writes a TODO, FIXME, HACK or issue reference in a comment; the same word in a string is data the program uses (a message, a fixture), not a note about the code. The test-name lexer (version 2.42) already finds every comment and string of the four languages it reads, keeping every offset; this change adds the comment spans it already walked to its output (`comments`), so the recognizer matches comment content alone and no second lexer reads observed bytes. Two deprecation forms are code, not comments (Java's `@Deprecated` annotation, Python's `DeprecationWarning` and `PendingDeprecationWarning`), so they are matched in the code text, where comments and strings are blanks. [Observed] Review R-ROUGH-EDGES-1 F1 found that the lexer ended a template literal at the first backtick, so a template nested in a `${ }` substitution split the outer one and its text could be read as a comment; the lexer now ends a template at the first backtick outside its substitutions, each substitution ending at its balancing brace with strings, templates and comments inside it skipped whole. That repair also reaches the test-name recognizers, whose names in such bodies now come from code alone. The lexer reads no JSX, so JSX text holding `//` is read as a comment (F4, stated in the requirement). The cost: a Python docstring is a string, so a TODO in one is not read, and a language the lexer does not know (Rust, C, Ruby, shell) has no candidate at this version.

## Why these patterns, published whole

[Inferred] The bead asks that every pattern be published. The requirement carries each regular expression as a code span, and `docs/evidence/syzygy-5dhm-46/rough_edges_patterns_published.mts` checks that each of the eleven the code runs appears there verbatim, for its kind and in the order the code runs it. The marker words are case-sensitive and word-bounded, so `todo`, `TODOs` and `XTODO` are not markers. Issue references take five forms: GitHub issue and pull URLs, GitLab issue and merge-request URLs, `owner/repo#N`, `GH-N` and a bare `#N` not preceded by a word character, `&`, `#`, `/`, `.` or `-`. A pattern Jira-style (`ABC-123`) is left out: it matches `UTF-8` and `SHA-256`.

## Why Observed, and why the reference's content is Unknown

[Inferred] A row states that the blob at a path and revision holds a line containing a token of a published form. That is read from the bytes, so it is Observed, and the quote and blob id let any reader re-check it. It is never a claim that the code is broken or that a deprecation is in effect. An issue reference names something outside the clone; nothing is fetched or resolved (the no-egress sweep in `packages/polaris-dossier/src/cli.test.ts` covers the two new modules), so what it names is Unknown, said beside each reference on the page and as `referenceContent: "unknown"` in the member. [Observed] On Syzygy's own tree two bare references are colours in a test comment (`#777777`, `#767676`), and the `owner/repo#N` form also takes a path and anchor such as `docs/x#12`; the requirement names both, and the row still states only that the line holds that token.

## Why quotes are trimmed and value-checked

[Inferred] The quoted line passes the manifest value checks before it is listed. A tab is a control character there, and Go indents with tabs, so the quote drops the line's leading and trailing spaces and tabs; a tab inside the line still refuses it, and the marker is counted in `valuesLeftOut`, never listed. A line a secret detector matches is never quoted, and only a body the screen admits whole is read.

## Why 1000 files, and what it costs a render

[Observed] Over Syzygy's own tree at `d652b7dcc` the recognizer finds 2334 candidate files (`docs/evidence/syzygy-5dhm-46/rough-edges-before-after-2026-11-28.json`, derived with the repaired lexer). Of the 1000 it reads, 967 were read for markers and 33 are Unknown: 28 withheld by the secret detectors, 1 as active content and 4 `unparsed`. The other 1334 candidates are past the read limit and Unknown. The page states every Unknown file as missing from each row, never as zero markers (VIS-2). [Unknown] Why each of the 4 is unparsed is not measured per file; before the template repair there were 10, and the review showed the lexer then failed on nesting only by accident (R-ROUGH-EDGES-1 F2), so no cause is claimed here.

[Observed] Reading the 1000 files, one pinned read each, took 29 seconds in the first run and 14 in the second; every operator-agent render pays it, since the render always holds a derived structure (`renderRun` builds one before it derives the member). The bead sets no time budget; batching the reads is a later change (R-ROUGH-EDGES-1 F8).

## Why render-only

[Inferred] As with the test names, the member is derived at render only: check writes none and the brief says nothing of markers. Citing a marker as evidence, and the Pole strips that would show one, are syzygy-5dhm.48's slice.
