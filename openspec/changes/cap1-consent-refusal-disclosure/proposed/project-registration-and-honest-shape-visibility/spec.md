# Proposed Capability 1 consent refusal disclosure amendment

## MODIFIED Requirements

### Requirement: CAP1-REQ-046 — Owning authority and effective status are exposed, stamp and record readable apart

For every answer resting on a governance artifact, Syzygy SHALL expose the artifact's owning authority and governing revision, and SHALL distinguish the artifact's self-declared lifecycle stamp (untrusted content) from its effective status (derived from the owner-act record). Where they disagree, the effective status governs and the disagreement renders as a disclosed fact. An artifact with no owner-act record renders effectively unadopted whatever its stamp claims.

For the repository-observation consent decision defined by CAP1-REQ-011, both the human fact set and machine answer SHALL expose the consent artifact identity and digest, owner-act basis, provenance state and evaluation identity when consent is admitted. In a refused decision, both channels SHALL keep the refusal entry for the producing evaluation and expose the same exact evaluation identity, authorization Unknown, precise safe refusal reason and the artifact's effective record state as evidenced at capture, or Unknown where that state cannot safely be established. Both SHALL also expose the same identity and exact digest of the refused artifact when the producing evaluation has captured that pair as independently established and admitted metadata under SEC-5. Neither value SHALL derive from the refused assertion's own identity or digest fields. If either value lacks such evidence or the metadata is excluded, both channels SHALL disclose that the pair is Unknown with the applicable missing-evidence or excluded-content reason and resolution route. They SHALL omit both values. Refusal disclosure SHALL consume only the producing evaluation's captured admitted evidence and SHALL NOT perform a new read, hash or recovery to fill the gap. The disclosed artifact facts carry no authority for the effect. The dependent effect remains refused and authorization remains Unknown.

Effective state (1) SHALL be labelled exactly owner-adopted (bootstrap, uncorrelated), with A1 identity explicitly absent; only successfully correlated state (2) SHALL be labelled Syzygy-verified. A recorded act, a correlation result and success of an authorized effect SHALL remain distinct. The provenance explanation SHALL be readable without colour, position or hover and reachable through the existing keyboard-accessible explanation path. The primary Unknown reason remains unconsented-source-or-provider with a specific consent diagnostic; valid bootstrap admission SHALL NOT be presented as an error merely because A1 is absent. Later successful correlation SHALL affect only a newly identified evaluation and SHALL NOT rewrite prior provenance or imply successful execution. These added valid/invalid-state obligations apply to consent only, not a general authority-input subsystem.

ID: CAP1-REQ-046
Source: RFC3-16(a), RFC3-16(b), RFC3-16(c), RFC3-7, RFC3-30; VIS-2, VIS-4, SEC-4, SEC-5
Scope: v1-mandatory

#### Scenario: Stamp is not status

- **WHEN** an answer rests on an artifact self-declaring `accepted` with
  no owner-act record binding its digest
- **THEN** the fact set serves effective status unadopted, shows the
  stamp separately, and the answer treats the artifact as unadopted

#### Scenario: Bootstrap disclosure agrees across channels

- **WHEN** an explicitly owner-performed valid state-(1) consent admits observation
- **THEN** the human and machine answers show owner-adopted (bootstrap, uncorrelated), explicit absent A1 identity and the same exact act/artifact/evaluation basis, without claiming independent verification or successful effects

#### Scenario: Invalid consent has an accessible explanation

- **WHEN** a CAP1-REQ-011 invalid or absent act refuses observation
- **THEN** both channels show authorization Unknown, unconsented-source-or-provider and the same specific diagnostic; keyboard users can reach the explanation without relying on hover or colour

#### Scenario: New correlation cannot rewrite old evidence

- **WHEN** a previously bootstrap consent later gains successful independent correlation in a newly captured evaluation
- **THEN** the new answer may report Syzygy-verified, while the prior evaluation retains bootstrap provenance and neither reports effect success from correlation alone

#### Scenario: Refused artifact identity agrees across channels

- **WHEN** the producing evaluation refuses CAP1-REQ-011 observation and contains independently established, SEC-5-admitted identity and digest metadata for the refused artifact
- **THEN** the human fact set and machine answer both retain the refusal entry, exact evaluation identity, captured artifact identity and digest, the same effective artifact record state, authorization Unknown and the same precise safe diagnostic
- **AND** the dependent observation performs no content read, even if its metadata is visible

#### Scenario: Refusal never echoes a claimed identity or digest

- **WHEN** a submitted consent assertion claims a different identity or digest than the independently established, SEC-5-admitted metadata for the refused artifact
- **THEN** both channels disclose the actual captured pair and the same safe mismatch diagnostic, with neither mismatched asserted value disclosed

#### Scenario: Refusal preserves Unknown when artifact metadata is unavailable

- **WHEN** a refused decision lacks independently established artifact metadata, has only one member of the pair established, or has metadata excluded under SEC-5, as separate cases
- **THEN** both channels retain the refusal, its precise safe diagnostic, the producing evaluation identity, the same safely established record state or Unknown, and authorization Unknown
- **AND** both mark artifact identity and digest Unknown with the applicable missing-evidence or excluded-content reason and a safe resolution route, omit the raw values, and acquire no new content to resolve the pair

#### Scenario: Suppressing one refusal projection fails

- **WHEN** two independent fixture controls remove either the human refusal entry or the machine refusal entry while leaving the other answer and refusal decision intact
- **THEN** the consent disclosure oracle fails that fixture's projection in the corresponding channel

Group: Why this answer and human/machine parity. Form: **state projection/query**.

- **Case**: a checker presents an artifact whose stamp says `accepted`
  with no owner-act record, and queries an answer resting on it.
- **Observable**: the served effective status, the stamp, and the
  disclosed disagreement.
- **Oracle**: the served effective status is unadopted; both values are
  separately readable in the fact set. Bounded: one artifact, one fact
  set.
- **Oracle independence**: the fixture controls the stamp and the
  absence of a record; the rule is RFC3-16's.
- **Falsifier**: a stamped-but-unrecorded artifact served as effectively
  accepted, or stamp and effective status merged into one
  indistinguishable field.

- **Additional case and oracle**: each added scenario above is a separate controlled case; expected admission, read/refusal and provenance tuples are specified independently of the implementation. Compare both emitted channels and intercepted content reads against those literals. The case denominator is the enumerated scenario/input-variant matrix, never the implementation's accepted subset. Any difference falsifies the added limb.

- **Refusal disclosure oracle**: independently enumerate every refused (project, repository) decision in the controlled captured evaluation. The fixture manifest specifies that denominator and the literal expected tuple per row, including the effective artifact record state and which artifact pair was independently captured and admitted, the reason and resolution route for every Unknown pair, and the expected dependent content-read count. Compare every expected row to both channels, prove that both expose the same values and count, and check both for any submitted or excluded value the fixture did not admit. A missing refusal entry, wrong record state, identity, digest or reason, unadmitted value, or extra content read falsifies this limb. The renderer and its emitted rows do not supply the expected population or bytes.

```yaml
warrants:
  primary: "RFC3-16(a)"
  doctrine: [VIS-2, VIS-4, SEC-4, SEC-5]
  contracts: [RFC1-3, RFC3-6, RFC3-7, RFC3-16, "RFC3-16(a)", "RFC3-16(b)", "RFC3-16(c)", RFC3-30, RFC6-13, RFC6-14, RFC7-33]
  policies: []
  decisions: []
  topology: []
  parent_requirements: []
```
