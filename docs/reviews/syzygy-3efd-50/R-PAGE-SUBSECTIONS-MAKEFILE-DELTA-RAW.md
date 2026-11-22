Subject: openspec/changes/dossier-page-subsections/proposed/polaris-generation/spec.md at 25f190d1 (REQ-polaris-generation-034 v2.15)
Spec sha256: dd56d18750634245db548fad0c40dbee0d9ded41d8fdf26bf0268b0eecfbb9ee (identical at 78af8fe4)
Verdict: REVISE
Reviewed commit: 25f190d1 (delta) and 78af8fe4 (head; only AGENT-ADOPTIONS.md A-47 changed after the delta)

Findings

1. BLOCKING — the new fault catches tab-led continuation lines and define-body lines.
   Where: spec.md:96, the faults paragraph, "a physical line that begins with a tab character and is no recipe line (since version 2.15)". Read with spec.md:94's recipe-line definition ("a physical line that begins with a tab character and follows a rule's logical line or another recipe line…").
   [Observed] The clause applies to *physical* lines. Nothing exempts a continuation line inside a logical line, or a line inside a `define` body. spec.md:94 itself says "outside a recipe and a `define` body", so the text knows about define bodies; the new clause just leaves them out.
   [Inferred] By hand, each of these common inputs is a tab-led physical line that is no recipe line, so each file becomes Unknown, `syntax`:
   - (a) `SRCS = a.c \` then `\tb.c`: an assignment continued on a tab-indented line.
   - (b) `build: a \` then `\tb`: rule prerequisites continued on a tab-indented line. Line 2 is part of the rule's logical line; it does not follow it.
   - (c) `define compile` / `\t$(CC) -c $<` / `endef` before any rule: a tab-led define body, the usual canned-recipe idiom.
   [Inferred] Each is valid GNU make. Under 2.14 none of them faulted; under 2.15 each becomes a false Unknown. That is fail-closed, so not a security issue, but SEMANTIC-DELTA's "Effect on bytes" and D11 understate it: they name only "a tab-led line that is no recipe line" as if that were rare.
   Repair: make the clause "a logical line that begins with a tab character, is no recipe line and is not inside a `define` body". Add a scenario covering (a), (b) and (c), each Inferred with the expected facts (b yields `build`).

2. NOTE — a conditional-directive line can also match the rule definition.
   Where: spec.md:94.
   [Observed] The rule definition ("a logical line, outside a recipe and a `define` body, holding a `:`…") does not exclude conditional-directive lines.
   [Inferred] `ifeq ($(SHELL),C:/bin/sh)` and `ifneq "a:b" "c"` each hold a `:` outside a variable reference, so each is also a rule. That yields a spurious `make-target` fact `ifeq` or `ifneq`, and possibly the second word too. The same goes for `vpath %.c src:lib`, which yields `vpath`.
   This predates 2.15 (2.14 has it). But 2.15 now defines conditional-directive lines as a class, so this is the place to settle it.
   Repair: add "a conditional-directive line, and a line whose first word is any directive the reader reads, is never a rule". Add one scenario with `ifeq (x,a:b)`.

3. NOTE — the old "recipe line before the first rule" fault is now vacuous.
   Where: spec.md:96 and the scenario at spec.md:872.
   [Inferred] By definition a recipe line follows a rule, so "a recipe line before the first rule" can never hold. The new clause is what actually fires. The scenario at spec.md:872 ("one holding a recipe line before any rule is Unknown, `syntax`") is satisfied only through the new clause.
   Repair: replace the old phrase with the new clause, or say "a tab-led line before the first rule". If byte-carriage is preferred, leave both and add a design note.

4. NOTE — whether a whitespace-only tab line is blank is undecided.
   [Observed] "blank line" is not defined in REQ-034.
   [Inferred] `A = 1` / `\t` / `build:` is fine if a tab-only line counts as blank, and is `syntax` if it counts as a tab-led non-recipe line. GNU make ignores such a line.
   Repair: define a blank line as "empty or white space only", and say that blank wins.

5. NOTE — two GNU-make divergences are decided fail-closed and could be stated.
   [Inferred] `\tFOO = 1` and `\t# c` outside rule context are valid GNU make (read as an assignment and a comment), but are `syntax` here. Unknown is acceptable under VIS-2. D11 could say these are deliberate.

Acceptance criteria

1. Unambiguity — fails on finding 1, partly fails on findings 2 and 4.
   [Observed] These parts are decided:
   - Leading spaces: the line is "not beginning with a tab character", and its first word is the directive.
   - `else ifeq …`: first word `else`, with its arguments.
   - A tab-led `\tifdef`: it is a recipe line when it follows a rule or recipe line, and otherwise `syntax`. This matches the GNU make manual: tab-indented conditionals are treated as recipe text.
   - `override`: it is not a conditional, so `override ifdef` does not arise.
   - A conditional with a rule in one branch and recipe lines in another (`ifdef X` / `build:` / `else` / `\techo hi` / `endif`): the `\techo` line is a recipe line. The rule is read statically, consistent with "a target named inside a conditional is declared all the same". Result: Inferred, `build`. The text decides it, and that is reasonable.

2. Scenarios — both derive by hand.
   [Observed] Recipe-inside-conditional scenario:
   - Probe 1 (`build:`, `ifdef V`, `\tscp…`, `endif`): only `build`.
   - Probe 2 (adds `\techo start`, `ifeq`, `else`, `\tcp…`): only `build`.
   [Observed] Tab-led-line scenario:
   - `A = 1`, `\tscp…`, `build:` gives `syntax`. The tab line also matches the rule definition, but the faults paragraph's precedence makes the file Unknown.
   - The reordered `build:`, `\tscp…`, `A = 1` gives `build`.
   Further adversarial inputs:
   - (i) An `endif` between two recipe lines, opened before the rule: still recipe. OK.
   - (ii) A tab-led `\tifdef V` after a rule: recipe. OK.
   - (iii)–(v) Continuation and define-body lines: false `syntax` (finding 1).
   - (vi) `ifeq` holding `:`: a spurious fact (finding 2).
   - (vii) A tab-only line: undecided (finding 4).

3. Security — nothing weakened.
   [Observed] Only the recognizer's reading of already-admitted makefile bodies changes. There is no change to screening, excluded/withheld handling or SEC-5. The provider mode is not touched.

4. Bookkeeping — consistent.
   [Observed] Spec sha256 dd56d187… matches SEMANTIC-DELTA and the checker's SUBSEC_SUBJECTS.
   [Observed] REQ-034 has 138 scenarios, and the whole Polaris spec has 39 requirements and 453 scenarios. This matches the census, PROJECT-STATUS and the checker's selftest count.
   [Observed] "918 of 927 lines carried, 9 amended": my independent difflib count gives 917 of 926, with the same 9 differing lines (an off-by-one in trailing-line handling).
   [Observed] The amended-in-place list names the three makefile edits and the extended Case line; the 8 added scenarios are listed. D11 is present and labelled.
   [Observed] A-47 at 78af8fe4 names 25f190d1, with revert `git revert 25f190d1…`. Its note says "installed by 9dc945a5 … Full rollback reverts both commits, this row's first". 9dc945a5 is an ancestor of the head.
   [Observed] check_spec_reconciliation.py --check, run in a scratch clone at 78af8fe4: "7 of 7 predicates without FAIL; PASS". R6 gives 2 report-only warnings on unrelated PWB pins.
   [Observed] count_polaris_effective_scenarios.py gives 39/453 and matches PROJECT-STATUS.
   [Observed] Tag `polaris-dossier-page-subsections-v2.15` is not yet on origin. Expected at merge; noting it.
   Any repair to finding 1 retires these digests and counts and needs regeneration.
