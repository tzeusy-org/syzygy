# Provider claim ledger semantic delta

Class is behavior-changing. The draft carries both complete predecessor
blocks with their additional obligations.

| Requirement | Current authority | Added obligation |
| --- | --- | --- |
| REQ-polaris-generation-003 | [Bounded anchored assets](../polaris-manifesto-generation/specs/polaris-generation/spec.md#requirement-bounded-anchored-assets) | Associate every generated project assertion with ledger entries of the same revision and expose the computed tuple and support in both reader forms. |
| REQ-polaris-generation-019 | [Versioned interchange](../polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md#requirement-versioned-interchange-and-reference-integrity) | Carry the versioned ledger through composition and review, reject malformed references and preserve the earlier-format reader. |

[Observed] The effective provider baseline composes the
[base](../polaris-manifesto-generation/specs/polaris-generation/spec.md),
[understanding overlay](../polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md)
and [non-governed narrative profile](../polaris-non-governed-narrative-profile/specs/polaris-generation/spec.md).
The understanding overlay supplies REQ-019's research-record semantics.
The non-governed profile and operator-agent overlays retain their defined
roles.

[Inferred] The logical change at adoption comprises the ledger's interchange
shape, stage and review artifacts, both presentation forms and version-aware
readers. Recheck closed schema and interface records and the spec coverage
views at adoption. Doctrinal evidence rules, source admission and canonical
source identity continue to govern. The draft is unadopted.

## Review disposition

R1 verdict REVISE on 41b4c599. F1 found that a new provider draft could
select an earlier supported writer and omit the ledger. The repaired
requirements require the ledger for newly produced revisions and refuse
legacy or ledger-free output before it can count as a checked draft or
review input. Reading existing artifacts keeps its compatibility path.
The negative scenario exercises both ways to omit the ledger.
[Raw independent review](../../../docs/reviews/syzygy-u05-13/SPEC-CLAIM-LEDGER-R1-RAW.md).
