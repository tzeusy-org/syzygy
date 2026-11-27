# Design

## Why lexical, and why names only

[Inferred] The bead asks for names only, never bodies. A lexer that blanks comments and string interiors, keeping every offset and line break, lets each recognizer match code text alone: a name in a comment, a docstring or a string literal is not code, so it cannot match. No parser is added, so no new dependency reads observed bytes. The cost is that a form the lexer does not know (a JSX text run holding a quotation mark, say) can make a body end inside what it took for a string; that body is Unknown `unparsed` with `unterminated`, never guessed. [Observed] Over Syzygy's own tree at `208946ab4` no read file was unparsed (`docs/evidence/syzygy-5dhm-45/test-names-before-after-2026-11-26.json`).

## Why these four frameworks and forms

[Inferred] pytest, the JavaScript and TypeScript `describe`/`it`/`test` family, Go's `testing` package and JUnit are four widespread test conventions, one each for Python, JavaScript and TypeScript, Go and Java; another framework is a later version's recognizer. Each recognizer takes only the declaration form its framework collects by default: pytest's `test` prefix and `Test` classes, a call whose first argument is a plain string literal, a top-level `func Test…(t *testing.T)`, and a method carrying a JUnit test annotation. A table-driven or computed name (`test.each(...)`, a variable, a substitution) names nothing at this version.

## Why units by `top-level-unit`

[Inferred] The structure record places files by their first path segment; the member uses the same rule, so the table's units are the directory map's.

## Why render-only, and why rule constants

[Inferred] Two deliberate departures from the bead's design. First, the recognizers are versioned rule constants in `packages/polaris-dossier/src/derive-rules.ts`, beside the manifest recognizers, not shape-pack data: shape packs select brief dimensions by trait and carry no recognizer, and giving them a second meaning is a later version's choice. Second, the member is derived at render only: check writes none and the brief says nothing of test names, so an author cannot yet cite one. Citing a test name as evidence is syzygy-5dhm.48's slice, which must derive the member at check (re-derived, never read from a stored record) and define how a citation to a name is checked.

## Why Unknown is never zero

[Inferred] A file not read for names (withheld by a secret detector, past the read limit, not UTF-8, unparsed) holds an unknown number of tests. The table counts only files read, so the page says so in a `Not established.` sentence under it (VIS-2). [Observed] Over Syzygy's own tree, 171 of 383 JavaScript and TypeScript candidates were Unknown: 133 past the 250 listed and 38 withheld by the secret detectors.
