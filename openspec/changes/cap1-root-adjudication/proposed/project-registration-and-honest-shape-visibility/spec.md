# Proposed Capability 1 multiple-root adjudication amendment

Candidate version 1.0. One MODIFIED requirement, CAP1-REQ-006.

## MODIFIED Requirements

### Requirement: CAP1-REQ-006 — Governance-root count violations surface; they are never repaired

Group: Project declaration. Form: **event-response**.

WHEN a readable declaration state resolves a project to two or more
governance roots, Syzygy SHALL mint a Contradiction, route it to
adjudication under RFC1-21 and RFC2-24 reason 8, and SHALL NOT pick a
winner. WHEN a project resolves to zero governance
roots, Syzygy SHALL render the entry `Unknown` with reason
`missing-declaration` at the observing workspace level — unevaluable as
a project, never dropped, never guessed, and no kernel contradiction is
minted for the zero-root case (RFC1-1).

- **Case**: a checker declares the same project identity in two
  repositories (two roots), and separately references a project with no
  declaration (zero roots).
- **Observable**: the rendered contradiction with its adjudication
  route (two roots); the workspace-level Unknown with reason
  `missing-declaration` (zero roots).
- **Oracle**: the two-root case serves a Contradiction on the adjudication
  route under RFC1-21 and RFC2-24 reason 8, with no single chosen root.
  The zero-root case serves `Unknown` with the verbatim reason.
  Bounded: two fixtures, two lookups.
- **Oracle independence**: expected outcomes come from RFC1-1, RFC1-21
  and RFC2-24 reason 8.
- **Falsifier**: the two-root route restricts adjudication to the owner
  regardless of the decision class or picks a root by precedence
  (freshest file, first found). The zero-root case fails if it renders
  as an empty project or an error, or is silently absent.

#### Scenario: Two governance roots

- **WHEN** two repositories each carry a declaration claiming the same
  project identity
- **THEN** a Contradiction is served with the adjudication route defined
  by RFC1-21 and RFC2-24 reason 8, and no repository is served as the
  chosen root

#### Scenario: Zero governance roots

- **WHEN** a workspace references a project for which no governance root
  resolves
- **THEN** the entry renders `Unknown` with reason `missing-declaration`
  and is neither dropped nor rendered as an empty project

```yaml
warrants:
  primary: RFC1-1
  doctrine: [VIS-2, VIS-4]
  contracts: [RFC1-1, RFC1-21, RFC3-4, RFC2-24]
  policies: []
  decisions: []
  topology: []
  parent_requirements: []
```
