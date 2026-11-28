# Polaris generation — URL dossier lean run 2.46 (delta)

## MODIFIED Requirements

### Requirement: Provenance-bound source policy

The generator SHALL resolve the observing project and governance root from owning declarations, never a page label or observed directory. Under current D10, repository observation and egress require no per-repository/project consent record or separate policy act; external-repository writes still require the applicable write consent and SEC-3 execution choices retain their distinct rules. A run SHALL name its declared provider and effective determinable content classes before use, bind the observing project's committed policy versions/digests and refuse missing/withdrawn/mismatched declarations or policies. An observed repository or provider-supplied policy is data, never governing policy. In every mode, every governed-content transmission, side effect and remote backing dependency SHALL pass the single declared-provider/determinable-class/secret-screening check with safe audit under RFC5-15/25. Before every ingest into any store, surface or endpoint, the observing project's own committed secret policy SHALL be applied; missing/invalid policy blocks ingest and unclassifiable or matching content is excluded. The run's clone (REQ-polaris-generation-047) is the raw input the authoring session reads under SEC-2's accepted exception (D11), never such a store; what any step writes from it into a Syzygy store, surface or endpoint is screened.

Content classification SHALL use RFC5-14's closed vocabulary and actual registered provenance. Composite classification SHALL carry every embedded origin/class through the bound policy; derived-composites alone, an invented class ordering or a caller's permission union SHALL NOT launder a missing origin or undeclared class. Effective declarations SHALL list only justified planned species/classes before their inputs are used; every actual computed request class SHALL be named by that effective declaration. A new declaration is recorded configuration, never evidence of a send or approval to admit unknown content.

Exclusion provenance SHALL contain only permitted digest/location/policy/redaction metadata, never excluded bytes. Whole-artifact exclusion and unclassifiable-excluded SHALL make every dependent claim Unknown with excluded-content and count; redacted-span SHALL retain surviving evidence at its otherwise-earned tier with disclosed count and make only removed-support claims Unknown. No new partial-redaction branch or private withheld-id/size exposure is granted. Revoked-provider overlays SHALL not recompute or admit new challenges; existing admitted challenges retain their lifecycle without silent resolution or unsuspension. Existing project-specific admission, grammar, bounds and policy gates SHALL not be widened by generic fallback. No declaration or absent record becomes evidence of a send, of success or of zero.

ID: REQ-polaris-generation-025
Source: RFC5-14; governing warrants below.
Scope: v1-mandatory

#### Scenario: Composite classification cannot be derived

- **WHEN** a prompt includes content whose inherited class cannot be determined under the effective policy and available origin records
- **THEN** egress is refused with the uncertainty visible
- **AND** the composer's derived-composites label, vocabulary order or an invented permission union cannot supply the missing policy decision

#### Scenario: Declaration is present but committed policy is invalid

- **WHEN** a provider is declared but either committed classification/ingest policy is missing, mismatched, unreadable or invalid
- **THEN** the corresponding egress or ingestion is blocked rather than using that policy
- **AND** adapter registration, a candidate stamp or provider declaration does not authenticate the missing policy

#### Scenario: Observed source supplies a permissive policy

- **WHEN** an observed repository or provider response includes policy text proposing weaker screening
- **THEN** that text remains input data screened under the observing project's effective policy
- **AND** source labels or directory proximity cannot select a different governing policy

#### Scenario: Partial redaction retains usable support

- **WHEN** an authorized redacted-span result removes one claim's supporting span while another claim is supported by surviving content
- **THEN** only the removed-support claim becomes Unknown with excluded-content, while surviving support retains its otherwise-earned tier and disclosed redaction count
- **AND** a policy permitting only whole-artifact exclusion is not silently changed to partial redaction

#### Scenario: Excluded content reaches a diagnostic boundary

- **WHEN** excluded or unclassifiable material would enter a store, surface, endpoint, provider-result capture or audit diagnostic
- **THEN** the ingest boundary withholds it and retains only permitted digest/location/policy/redaction metadata and counts
- **AND** neither excluded bytes nor a sensitive location string bypasses screening as metadata

#### Scenario: Provider revoked with an existing challenge

- **WHEN** a provider is revoked while one kernel challenge is admitted and another challenge is requested against its overlay
- **THEN** the overlay is not recomputed, the new challenge is not admitted and the existing challenge stays in its governing lifecycle
- **AND** immediate withdrawal/evaluation behavior remains in force without silently resolving or unsuspending that existing challenge

Form: invariant.

- **Case:** Independently vary provider/project/pin/policy bindings, content origins and classes, redaction and revocation timing, and observed text proposing a weaker policy.
- **Observable:** Resolved policy/origin/class provenance, before-effect ingest exclusions and affected claim tiers and counts; missing observations remain Unknown.
- **Oracle:** Independently fixed source and policy fixture bytes, a known origin/class graph, independently recomputed digests and marked surviving support; never the composer as its own oracle.
- **Falsifier:** A source-selected weaker policy, an unknown or undeclared inherited class admitted, excluded bytes persisted or shown, blanket loss of surviving support, or rewritten revocation history.

```yaml
warrants:
  primary: RFC5-14
  doctrine: [VIS-1, VIS-2, VIS-6, SEC-2, SEC-3, SEC-4, SEC-5]
  contracts: [RFC5-25, RFC2-13, RFC3-7, RFC3-30, RFC5-11, RFC5-12, RFC5-13, RFC5-14, RFC5-15, RFC5-16, RFC5-17]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [GOVERNANCE-SIMPLIFICATION-D10]
  topology: []
  parent_requirements: []
```

### Requirement: Trunk-tip revision pinned at launch

For `syzygy polaris <url>`, Syzygy SHALL pin one full commit before `init`. Without `--clone`, the pin SHALL be, with no `--revision`, the commit the remote's advertised HEAD names at this launch (trunk); with `--revision`, a full commit identifier (in either case) SHALL be taken as given, and a branch or tag name SHALL resolve to the one commit it advertises, an annotated tag to the commit it peels to. A name that matches no reference SHALL be refused, naming the URL and the name; a name whose references name different commits SHALL be refused, listing each reference and asking for a full reference or commit; and a URL that does not answer an anonymous `git ls-remote` SHALL be refused before any clone, naming `--clone`. With `--clone`, the pin SHALL be the commit the operator's clone has checked out, and when `--revision` is also given the run SHALL be refused unless that commit is the one `--revision` names (a full commit compared locally, a name resolved as above). No consent record, earlier run or local branch SHALL supply or change the pin. Neither the pin, the clone nor `init` SHALL read or require an observation consent, a source-acquisition registry entry, a provider statement or any other owner-act record, and none SHALL ask a consent question (VIS-4 as amended by D10). The URL SHALL first pass the credential-free locator rule of REQ-polaris-generation-046, as preflight checks it.

Every git command Syzygy runs to pin or clone SHALL run with no credential helper, no terminal prompt, no SSH, no global or system git configuration and a home that holds no credential file, so that no stored credential or URL rewrite of the operator's takes part; the proxy environment SHALL be passed through, and the operator's clone, read only by `git rev-parse`, keeps its own local configuration.

Without `--clone`, Syzygy SHALL make the clone itself in a directory of its own named for the URL and the pin: `git init`, a depth-one fetch of the pinned commit alone from the URL, and a detached checkout. It SHALL reuse an existing directory only when its HEAD is the pinned commit and SHALL refuse one that holds anything else; `init`'s clone-shape check of REQ-polaris-generation-033 then refuses a `.git` that holds more than that commit, so a reused clone holds one commit as a new one does. With `--clone`, Syzygy SHALL NOT fetch into, check out in or otherwise write the operator's clone. Either clone SHALL pass `init`'s checks of REQ-polaris-generation-033 unchanged, and every object a later Syzygy step uses SHALL be read by identifier and rehashed.

The clone is the run's raw input, not a Syzygy store, surface or endpoint: the authoring session reads it raw under SEC-2's accepted exception (D11), with that exception's provider declaration and disclosure, and every Syzygy store, surface or endpoint a later step writes from it stays screened under REQ-polaris-generation-025 and SEC-5. The fetch sends the remote git's request for the pinned commit and no run content.

The pinned commit SHALL be the run's immutable pin: remote movement after the pin SHALL NOT repin the run, and a later tip needs a new run. Without `--clone`, a repository that answered the anonymous `git ls-remote` SHALL be declared public to `init`. With `--clone`, the run SHALL be declared public only when the clone's commit is the commit the remote's HEAD names to an anonymous `git ls-remote`; otherwise, including when the URL does not answer, it SHALL keep `init`'s private default and SHALL NOT be refused for it. The visibility is a declaration labelled Inferred, never proof. A direct `syzygy dossier init` entry SHALL keep its local HEAD and full-commit match and SHALL make no network request.

REQ-polaris-generation-048's URL-supervised form (its checked transport relay, MCP-only packet delivery and machine credentials) is not built, and `syzygy polaris` is not that form. Until a later version restates REQ-polaris-generation-033, 035 and 048, their clauses scoped to that form, and their references to this requirement's memory-only admission gate and to REQ-polaris-generation-025's relay and receipts, apply to no run.

ID: REQ-polaris-generation-047
Source: REQ-polaris-generation-033; governing warrants below.
Scope: v1-mandatory

#### Scenario: Trunk pinned with no record

- **WHEN** the operator runs `syzygy polaris <url>` with no `--revision` and no `--clone`, and no consent, registry or statement record exists
- **THEN** Syzygy pins the commit the remote HEAD names, fetches that commit alone with no credential into a new directory, and the clone's `git rev-list --all` lists exactly that commit
- **AND** no consent, registry, statement or act record was read, and no consent question was asked

#### Scenario: A named reference resolves once

- **WHEN** `--revision` names a branch, an annotated tag, or a full commit
- **THEN** the pin is the branch's commit, the tag's peeled commit, or the given commit
- **AND** a name that matches no reference is refused naming the URL and the name, and a name whose branch and tag name different commits is refused listing both references

#### Scenario: A remote that needs a credential

- **WHEN** the URL does not answer an anonymous `git ls-remote` and no `--clone` is given
- **THEN** the run is refused before any clone, naming `--clone`, and no credential is asked for or used

#### Scenario: Remote moves after the pin

- **WHEN** the remote's HEAD moves after the run is pinned and the run is resumed
- **THEN** the run keeps its pinned commit and fetches nothing new

#### Scenario: Operator's clone

- **WHEN** `--clone` names the operator's one-commit clone at a commit that is not the remote's trunk, with no `--revision`
- **THEN** the pin is the clone's commit, Syzygy fetches nothing and writes nothing in the clone, and the run is declared private
- **AND** with `--revision` naming another commit the run is refused before `init`, and `init` refuses a clone whose `.git` holds more than the pinned commit

#### Scenario: Operator's git configuration takes no part

- **WHEN** the operator's global git configuration rewrites the URL to another remote or names a credential helper
- **THEN** the pin is resolved at the URL as given, with neither the rewrite nor the helper applied

Form: invariant.

- **Case:** Vary `--revision` (none, branch, lightweight and annotated tag, full commit, a name matching two refs, none), `--clone` (absent, at the pin, elsewhere), a remote that needs a credential, the operator's git configuration (rewrites, helpers, netrc), and remote movement after the pin.
- **Observable:** The pinned commit, every git command run with its environment, the clone's object population, the visibility declared to `init`, and the refusal text.
- **Oracle:** An independently built local remote with known commits and tags, real git, and the clone's `git rev-list --all`; never the resolver as its own oracle.
- **Falsifier:** A tag object pinned instead of its commit, an ambiguous name resolved silently, any credential or operator configuration taking part, a clone holding more than the pinned commit, a write into the operator's clone, a repin after remote movement, or any record read or consent question asked.

```yaml
warrants:
  primary: SEC-5
  doctrine: [VIS-1, VIS-2, VIS-4, VIS-7, SEC-2, SEC-3, SEC-4, SEC-5]
  contracts: [RFC1-2, RFC4-2, RFC4-3, RFC4-4, RFC5-12, RFC5-14, RFC5-15, RFC5-16, RFC5-17, RFC5-25]
  policies: [CC-SPEC-2, CC-SPEC-3, CC-SPEC-4, CC-REV-2]
  decisions: [GOVERNANCE-SIMPLIFICATION-D10]
  topology: []
  parent_requirements: [REQ-polaris-generation-033, REQ-polaris-generation-046]
```
