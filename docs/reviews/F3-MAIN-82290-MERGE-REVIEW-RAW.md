PASS — `d998ca9556edd1c1d67602b8c00e58b61765a0cf`

- [Observed] The adoption log preserves main’s A-54 at line 72. F3’s former A-54 moves to A-111 at line 129 with only its ID changed. The remaining adoption rows are byte-identical to their parents.
- [Observed] `brief.test.ts:396–409` retains D11, the v14 brief and v8 schema expectations, and the subsection paragraph in the whole-text golden assertion.
- [Observed] `url-run-composed.test.ts:1062` changes only the draft version relative to F3. The issued v8 schema makes subsections optional, and the Stop/Resume assertions remain intact.

Source review only. No edits or tests.
