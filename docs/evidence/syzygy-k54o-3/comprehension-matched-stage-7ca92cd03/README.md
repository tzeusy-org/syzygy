# F3 dossier comprehension at the same render stage

[Observed] Clean builds of main `82290fb93` and F3 `7ca92cd03` each initialized, issued a brief, checked the same byte-identical draft and rendered editorial draft revision 0 as site 0. Both runs used Redis revision `498ecd0d6d007db11ddb3aea9428552598a78622` and the same configuration. Each site contains 46 pages and two quotations. Each reader corpus extracted text from the main landmark on 21 pages and excluded 25 individual source pages. Both render reports count zero review verdicts.

| Question kind | Required facts | Main | F3 | Change in percentage points |
|---|---:|---:|---:|---:|
| Overall | 81 | 23.46% | 22.22% | −1.23 |
| Purpose | 13 | 38.46% | 38.46% | 0 |
| Structure | 14 | 25.00% | 21.43% | −3.57 |
| Mechanism | 15 | 30.00% | 30.00% | 0 |
| Rationale | 13 | 23.08% | 19.23% | −3.85 |
| Change | 13 | 3.85% | 3.85% | 0 |
| Limits | 13 | 19.23% | 19.23% | 0 |

[Observed] Two fresh readers each answered the same 24 questions from one text corpus. A separate blinded grader evaluated the 48 answers against the same 81-fact key. The grader awarded 19 facts before and 18 after and marked zero incorrect assertions. The before and after corpora contain 19,775 and 19,799 words respectively. Seven of 21 extracted files differ.

[Inferred] The 1.23-point difference falls within what two individual readers might produce from the same corpus. This comparison measures the two builds at the same pre-review stage. A single pair gives limited evidence about the effect of F3 on comprehension.

[Run and input bindings](binding.json) · [Computed totals](totals.json) · [Before answers](answers-before.json) · [After answers](answers-after.json) · [Blind grades](grades.json) · [Label map](labels.json)
