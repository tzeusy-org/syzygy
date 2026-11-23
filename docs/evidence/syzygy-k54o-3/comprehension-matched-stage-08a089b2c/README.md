# F3 dossier comprehension at the same render stage

[Observed] Two isolated builds ran the local dossier init, brief, check and render commands. Both checked the identical stored draft against Redis revision `498ecd0d6d007db11ddb3aea9428552598a78622` and rendered editorial draft revision 0 at site stage 0. Neither site counted a Fidelity or Design verdict. Each site rendered 49 pages and nine quotations. The reader corpus included 21 pages and excluded 28 individual source pages per arm.

| Question kind | Required facts | Main `f6b2b674f` | F3 `08a089b2c` | Change in percentage points |
|---|---:|---:|---:|---:|
| Overall | 81 | 25.93% | 27.16% | +1.23 |
| Purpose | 13 | 38.46% | 38.46% | 0 |
| Structure | 14 | 25.00% | 28.57% | +3.57 |
| Mechanism | 15 | 36.67% | 36.67% | 0 |
| Rationale | 13 | 23.08% | 26.92% | +3.85 |
| Change | 13 | 0% | 0% | 0 |
| Limits | 13 | 30.77% | 30.77% | 0 |

[Observed] Two fresh readers answered the same 24 questions independently, each from its own extracted site text. One fresh grader scored anonymized answers against the existing 81-fact key. No category fell by more than five points. The grader recorded no incorrect statements across 48 answer rows. The two readers each earned zero on the 13 change-history facts.

[Observed] The before corpus contained 21,305 words and the after corpus 21,329. Seven reader text files changed byte for byte. Only the appendix gained words. Its authoring disclosure and screening-policy version differ. The main build selected policy 3.0.0 and the F3 build selected 4.0.0. Both ran from the same saved draft and config without a provider call or execution of observed repository code.

[Inferred] This run removes the render-stage mismatch from the earlier pilot comparison. The single pair leaves reader variation, policy effects and the F3 changes inseparable. The measured change establishes neither an improvement nor a regression by itself.

[Run identities and digests](binding.json) · [Computed totals](totals.json) · [Before answers](answers-before.json) · [After answers](answers-after.json) · [Blind grades](grades.json) · [Label map](labels.json)
