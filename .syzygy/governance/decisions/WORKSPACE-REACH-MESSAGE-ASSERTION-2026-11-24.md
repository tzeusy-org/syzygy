# Workspace-reach test message assertion

[Observed] Protected [PR #562](https://github.com/tzeusy-org/syzygy/pull/562)
landed at `43dfd9b0f4d69c3077650a426f84050e7608f38d`. Its item 4
retained `toThrow(string)` after measuring the suggested equality form
in [R2 N3](../../../docs/reviews/R-GP-IMPL-SEGMENT-RULES-2-RAW.md#n3--information-tothrowstring-truncation-hides-the-difference-in-two-kills).
[R1 N1](../../../docs/reviews/R-GP-IMPL-SEGMENT-FOLLOWUPS-1-RAW.md#n1--note-the-item-4-ruling-has-no-settled-authority)
recorded the deviation and left its disposition open. R2 called the point
information and raised the visibility of the differing clause.

[Observed] At `85a0a709ca2d38c7d79e5a8ff4e718d37e12d38c`, the locked Vitest
3.2.7 synthetic replay reproduced both results. The default reporter
printed both complete messages for each assertion form, including the
differing final clause. The JSON reporter's first failure line clipped
the clause for both forms. Both forms passed their exact-message control
and failed when the final clause changed. Only equality failed when the
original message had extra context appended. Four historical comparison
pairs across the two archived build states show the same default
Expected and Received lines. The focused workspace-reach suite passed
82 of 82 tests.
[Reporter comparison and replay fixture](../../../docs/evidence/syzygy-epvo/reporter-comparison-2026-11-24.json)

## Decision

Accept the disclosed item-4 deviation under [VIS-4](../doctrine/vision.md)
and retain the current message-substring assertion in workspace-reach.
The existing check distinguishes the refusal clause, and the default
report displays the complete message. The suggested equality change
would additionally constrain appended context without resolving the
clipped JSON headline. This disposition applies to the recorded test
review finding `syzygy-epvo` and its two cases.
