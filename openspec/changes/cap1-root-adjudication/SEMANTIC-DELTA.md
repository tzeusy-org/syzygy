# CAP1-REQ-006 adjudication semantic delta

[Observed] The reviewed predecessor for this candidate is protected commit
`4b86e4285e7c78ddf049f64c9a3fd95fc0952cf3`. A-22
(`7ffe2f102e9afcaa2bec13d09d2954b61499014f`) is in its ancestry. Its
historical exception names the CAP1 specification synchronization. Adoption
authority is VIS-4 and CC-SPEC-10. CC-REV-2 requires the directly invalidated
contract text to change in the same logical adoption.

## Complete requirement

[Inferred] The following two-root edits are within the one
[full replacement block](proposed/project-registration-and-honest-shape-visibility/spec.md).
Keep the identifier, title, event-response form, ordered scenario names,
zero-root scenario and zero-root condition. Add VIS-4 and RFC1-21 as
warrants, with RFC1-1 still primary. The oracle distinguishes the
decision-class route from unconditional owner routing and first-found
selection.

| Location | Predecessor | Proposed |
|---|---|---|
| Multiple-root response | Mint a contradiction routed to the owner. Pick no winner. | Mint a Contradiction, route it under RFC1-21 and RFC2-24 reason 8, and pick no winner. |
| Two governance roots scenario | Serve a contradiction routed to owner adjudication with no chosen repository. | Serve a Contradiction with the adjudication route defined by RFC1-21 and RFC2-24 reason 8, with no chosen repository. |

## Collateral in the same logical adoption

[Observed] The installed and mirrored RFC files give each of the two
following predecessors verbatim. Apply each exact replacement to both
paths. RFC1-21 and RFC2-24 reason 8 remain the governing clauses.

RFC1 violation case 1 appears in
`.syzygy/governance/contracts/rfcs/RFC-0001-project-graph-identity-state-planes.md`
and its sibling at `.syzygy/governance/contracts/candidates/rfcs/`:

```text predecessor-rfc1
1. *(RFC1-1/3)* A declaration lists two governance roots and the kernel picks
   the first — must be a contradiction routed to the owner; likewise rendering
   any graph content for a repository with no consent record.
```

```text proposed-rfc1
1. *(RFC1-1/3)* A declaration lists two governance roots and the kernel picks
   the first. The declaration must yield a Contradiction routed under
   RFC1-21 and RFC2-24 reason 8, with no root picked. Rendering graph
   content for a repository with no consent record also violates this rule.
```

RFC3-4 appears in
`.syzygy/governance/contracts/rfcs/RFC-0003/manifests-and-namespace.md`
and its sibling at `.syzygy/governance/contracts/candidates/rfcs/`:

```text predecessor-rfc3
- A declaration purporting to designate a *different* repository as root, or
  a Project resolving to two roots, is a contradiction per RFC1-1 — routed to
  the owner, never repaired silently.
```

```text proposed-rfc3
- A declaration purporting to designate a *different* repository as root
  is a contradiction per RFC1-1 — routed to the owner, never repaired
  silently.
- A Project resolving to two roots is a Contradiction per RFC1-1, routed
  under RFC1-21 and RFC2-24 reason 8. No root is picked and the
  contradiction is never repaired silently.
```

The [candidate coverage overlay](CONTRACT-COVERAGE.md) supplies one
effective row replacement and one additional consequence. Bind it with
the requirement. Preserve the original signed coverage matrix, its
generated union and the P-109 consent coverage and union bytes. The
historical base row is the exact matching preimage for effective
composition.

## Binding and residual obligations

[Inferred] Independently review this exact candidate, its effective
coverage overlay and the four RFC collateral targets and their inverses. Requalify the predecessor blocks and protected
peer scopes before a future adoption. The one CAP1 replacement composes
after the historical CAP1 base and the P-109 v1.0 overlay for CAP1-REQ-011
and CAP1-REQ-046. Keep that historical composition and digest attestable
against their original inputs. An in-place rewrite of the original base
would invalidate that digest. The pending consent-refusal proposal for 046
has separate scope.

[Inferred] At adoption, bind the exact source in the next authoritative
agent ledger row and issue its newly allocated exact version tag on
protection. Register the version and route in the effective OpenSpec index
and reconciliation. Both census methods must agree on the 42 existing
CAP1 IDs and 57 ordered scenarios, with only 006 text replaced. Load the
successor only when a well-formed exact adoption record and its expected
source/tag or the repository's reviewed pre-tag staging proof bind those
bytes. Exercise missing or mismatched binding, citation-only, duplicate ID,
partial application and veto controls. Regenerate the active contract manifest, directive register,
context budget report and affected context-selection anchors (7, 8 and 10).
Generate the effective CAP1 requirement dependency union and reconcile
affected coverage totals from that union and the composed rows. Preserve
both historical unions and the P-109 composed digest. R2 reconciliation
rejects an in-place edit of the signed base coverage matrix. Add truthful project status and run the full canonical
gate on the exact versioned source, collateral and derived outputs. Confirm
the tag afterward. This packet allocates neither a ledger identity nor a
version.

[Inferred] A separately qualified implementation can change the multiple-root
variant in `packages/cap1-core/src/declaration.ts` and its literal oracle
in `packages/cap1-conformance/src/req-006.conformance.test.ts`. Validate
two roots in both orders and different timestamps, zero roots, one root,
and the distinct CAP1-REQ-061 governed-write containment result. Mutate
the old owner-only value and a first-found winner separately. Qualify the
actual supported serving path before declaring served acceptance. Preserve
the unrelated POC route and model, other A-22 specification families,
orphan provenance and owner-class consents.
