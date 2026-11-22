# G5 sitting findings at 06529d12

[Observed] The two original verdicts were **CONFIRM WITH EXCEPTIONS**.
Round 3 was the last review of the sitting package. It covered the
bytes identified by the round-3 record and carried four notes.

- [Round 2 raw review](../../../.syzygy/governance/contracts/candidates/dossier-local-agent-acts/reviews/R-DOSSIER-LOCAL-AGENT-SITTING-2-RAW.md) and [dispositions](../../../.syzygy/governance/contracts/candidates/dossier-local-agent-acts/ROUND-2-DISPOSITIONS.md).
- [Round 3 raw review](../../../.syzygy/governance/contracts/candidates/dossier-local-agent-acts/reviews/R-DOSSIER-LOCAL-AGENT-SITTING-3-RAW.md) and [dispositions](../../../.syzygy/governance/contracts/candidates/dossier-local-agent-acts/ROUND-3-DISPOSITIONS.md).

| Round 2 note | Reconciliation |
| --- | --- |
| 1. Per-act check and successor record paths | [Observed] The recorder still regenerates against the whole sitting package in its legacy mode. D10 supersedes the CLI's live exact-byte `--check` under RFC3-16. Its archived selftest now checks the frozen inventory and hashes, allowing the later withdrawal notice beside it. [Inferred] There is no current re-act to perform for this packet. A future per-act recorder would need a new subject and compatibility design. |
| 2. Act type vocabulary | [Observed] Repaired in round 3. The recorder uses `state-project-input` and `bind-exact-bytes`. |
| 3. Scope A selection and aggregate scope | [Observed] Round 3 repaired the missing extension and narrowed the aggregate wording. `validate_inputs` still recognizes the extension by substring and the legacy sitting recorder still prints the stale registration instruction. [Inferred] Those are historical recorder residues. New adoptions use VIS-4, with an adoption row and version tag where applicable. |
| 4. Reader coverage and identity | [Observed] `objectRefused` is under `awaitingGate` and the signed entry distinguishes the staging index from pack indexes. The installed v1.1 entry retains `implementationVersion` 1.0.0 without a reader digest and lacks the three bounds below. Its refusal note gives examples. [Inferred] A successor should state the bounds and the refusal note's scope, and identify the reader version by digest. |
| 5. Delta count and omitted values | [Observed] The count reproduces as 44 differences using the declared rule below. The three omitted differences are described there. The original delta and both signed versions retain their bytes. |
| 6. Drawer statement basis | [Observed] Round 3 repaired the archive's basis to offered for observation. D10 later withdrew the unperformed drawer offering. |

## Reader identity

[Observed] At commit `06529d12cc78b99efd0950bb0a34544cd5922550`, the
public reader defaults are 1,000 delta links, 4,294,967,296 bytes of
stored, inflated and produced delta data per call, and 1,000,000 objects
plus listed tree entries per call. These defaults are constructor policy
in [git-object-reader.ts](../../../packages/polaris-dossier/src/git-object-reader.ts).
The recorded v1.0 selection identifies the reader on main at signing.
The observed current reader and installed v1.1 entry have these SHA-256
digests.

| Subject | SHA-256 |
| --- | --- |
| `packages/polaris-dossier/src/git-object-reader.ts` | `0621536eddd69d2919e90b7ad4642d7dc7da5867eca174e9521a5363f902be90` |
| [Installed v1.1 entry](../../../.syzygy/governance/declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json) | `384f7b603d49ab953a71deb526cdf43e7e65f6e9a7160c3893500b6bd6385f00` |

The [v1.0 sign-off](../../../.syzygy/governance/decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md)
and [v1.1 sign-off](../../../.syzygy/governance/decisions/PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md)
were checked independently of the historical sitting builder. The
performed D9, RFC7-20 and Anthropic acts remain listed in the
[acceptance-act record](../../../.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md).

## Reproducing the v1.0 delta count

[Observed] The [parked entry](../../../.syzygy/governance/contracts/candidates/public-admission-registry-entries/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json)
and [v1.0 entry](../../../.syzygy/governance/contracts/candidates/public-git-source-acquisition-local-agent/proposed/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json)
were read at the v1.0 sign-off commit `3409ef5ae9f7dcbadbb248d4df1c295dc43a5b0b`.
Their SHA-256 digests were
`e50036e266f5147b95ec5a5d9f466c9068033aa357f46486e670f775c5483240`
and `917aecc766f01133d5a29c1ee8b3e575332ad48d04308a1b62c68217e48d254b`,
respectively. The files at the observed main commit match those tagged bytes.

Compare the first entry in each envelope. Walk the union of keys when
both values are objects. Count an added or removed key once, regardless
of depth below it. Compare every other value, including an array, by
whole-value equality. This gives 44 differences for the two entries.

- `outputFactClasses[0].identityScheme` moved from repository, commit and
  capture instant to repository, pinned commit and step instant.
- `resourceLimits.status` changed the basis of the Inferred description
  from target bodies generally to the bodies read by this reader.
- `screening` names the effective classification policy alongside the
  screening scope and requires screening before use in a check or render.
  The entry treats the operator's agent reads as a separate population.

## Checks

[Observed] The legacy sitting builder printed a stale D9 regeneration
and a stale manifest. Its 12 synthetic predicates passed. The source
entry builder checked v1.0 and passed its 37 synthetic predicates. Both
entry sign-off records regenerated exactly and v1.1's installed bytes
verified. The versioned recorder passed 181 synthetic fixtures.

The sitting recorder initially passed 32 of 33 predicates. Its frozen
inventory named 14 files and the current directory had those 14 plus
the withdrawal notice. The raw review's named commit was unavailable
in the local Git object store. The 14 current archive bytes matched the
recorder's stored hashes. Commit `39b7ca532eb1273281acb724fe1e42617e3a82f9`
checks the archived inventory and hashes in the selftest. The recorder
script at that commit has SHA-256
`6a1db9e8b71c556b45042316165b20ad845c85e6ee1eee199261cb28ed420324`.

The updated selftest passed 33 predicates. At that same script commit,
three isolated input changes each failed the archive predicate. The
first two used the frozen digest entry for
`templates/RFC7-20-READING-IN-FORCE-RECORD-TEMPLATE.md`.

| Original | Mutation |
| --- | --- |
| The template path maps to its recorded digest | Remove that entry from `FROZEN_FILE_DIGESTS` |
| The template digest is the stored SHA-256 | Replace the digest with 64 zeroes |
| The file inventory contains 15 paths, including the withdrawal notice | Add `unreviewed.md` as a sixteenth path |

The withdrawal notice still appears in the live validation inventory.
The scratch-record predicate continues to exercise duplicate recording
refusal and refusal after bound doctrine drift.
