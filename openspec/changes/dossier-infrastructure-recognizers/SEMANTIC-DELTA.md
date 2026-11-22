# Version 2.12 semantic delta

[Inferred] Candidate agent-decided amendment under VIS-4. No adoption is claimed; this file states exactly what changes so the change is reviewable as a delta (`NORMATIVE-CHANGE-WORKFLOW.md`).

## Composition

[Observed] The effective REQ-polaris-generation-034 is the MODIFIED text in `openspec/changes/dossier-spec-corrections/proposed/polaris-generation/spec.md` (spec corrections version 2.11, row A-36, tag `polaris-dossier-spec-corrections-v2.11`; that file's SHA-256 is `376f27c0261120d0238d0d4a6685fe08b19ff03a9d00fcb4a6702349f64834c3`, the digest `scripts/check_spec_reconciliation.py` binds as its reviewed subject, `CORR_SUBJECTS`).

[Inferred] Once adopted, this version's complete MODIFIED REQ-polaris-generation-034 replaces that text, composed after version 2.11 (and so after every earlier version that touches REQ-034). Its ID, Source line, Scope line, name and warrants block are unchanged, so its dependency union (`GOVERNING-DEPENDENCIES.json`) is version 2.11's, byte for byte. The requirement goes from 110 to 123 scenarios; no other requirement changes. Nothing is installed under `.syzygy/governance/`.

## Carried unchanged

[Observed] Every other line of the predecessor requirement appears byte for byte in the new text. The new text was built from the predecessor bytes by a script that replaces or inserts only at anchors it asserts occur exactly once; a diff against the predecessor shows, besides the file's title and preamble, exactly the changed sentences listed below and the insertions (eight paragraphs, thirteen scenarios).

## Added

[Observed] Eight paragraphs:

- After the paragraph of the five recognizers of version 2.7 (ending "each in its own module beside the structure record's."), three paragraphs: the five recognizers of version 2.12, their path rules and the fields each reads; their faults and the forms each reader SHALL read (the YAML reader reading several documents for `kubernetes-manifest` and keeping an integer scalar's text, both changing nothing for `github-actions-workflow`); their facts' spans and their admission under declared-source policies 1.0.0 and 2.0.0.
- After the member paragraph (ending "the listing caps of version 2.7 are unchanged."), the coverage remainder: `remainder`'s members, the identity `files` = `secretPathsLeftOut` + `candidates` + `notCandidates`, its places and caps, and the format `polaris-dossier-manifest-facts/1` written before this version.
- After the paragraph of the inventory check record's readers (ending "under this version it counts wherever the other rules by which an inventory counts let it."), the reader rule of version 2.10 for four more files (syzygy-3efd.76): the draft check is given, under 4,194,304 bytes, with check's refusal words; every frozen draft revision `drafts/rev-<n>.json`, under 4,194,304 bytes, with the reasons review, render and close give, the reading of the inventory and review checks and of Syzygy deciding whether an inventory counts, and the re-render measurement's; the brief record `brief.json`, under 262,144 bytes, with check's and the reverification's refusal words; and `run-advice.json`, under 16,777,216 bytes, read as no run file past it; and that the version states the rule for no other file of the run directory.
- After the paragraph "These are the bytes version 2.11 changes. ...": "These are the bytes version 2.12 changes. ...", which also says the reader rule's extension changes no byte for a regular file within its bound.
- After the directory map paragraph: the `coverage-remainder` section of `maps/directories.html`, with its words.
- After the CI pipeline map paragraph: the infrastructure map.

[Observed] Thirteen scenarios, after the last scenario of version 2.11 ("Readable layout stacks every graph of two or more layers"): "Compose services, images, ports and dependencies", "Kubernetes objects across documents", "Terraform resources and modules, variable and state files never read", "Make targets", "CMake lists and other makefile names Unknown under the bound policy", "Malformed infrastructure file is Unknown, never empty", "Infrastructure files past the read limit", "Coverage remainder sums to the tree", "Coverage remainder on the directory map's page", "Infrastructure map rendered", "Provider mode unchanged by infrastructure recognizers", "Bounded form of a draft that does not parse", "Draft, frozen revisions and run file read under their bounds".

## Amended

[Observed] The title and preamble (file head, not requirement text) name version 2.12.

[Observed] The opening paragraph of version 2.7:

- Was: "what five versioned recognizers read in the manifest files of the pinned tree that the bound screening policy admits." Now: "what ten versioned recognizers read in the manifest and infrastructure files of the pinned tree that the bound screening policy admits (five since version 2.7, and five more since version 2.12)."
- Was: "a job, and a job a job names as needed, and no more:" Now: the same, with the facts of version 2.12 named before "and no more:".
- Was: "no page renders it but the unit map and the CI pipeline map of version 2.9, below;" Now: "... of version 2.9 and the infrastructure map of version 2.12, below;".

[Observed] "The five recognizers, each named by its rule id at version 1," now reads "The five recognizers of version 2.7, ...".

[Observed] The dispositions paragraph:

- Was: "For the four package recognizers, a candidate with a directory segment" Now: "For the four package recognizers and the five of version 2.12, ...".
- Was: "past the 250th file of its recognizer that none of these reasons reaches" Now: "past the 250th file of its recognizer (the 100th, for a recognizer of version 2.12) that none ...".
- Was: "no body of these five kinds is retained" Now: "no body of these ten kinds is retained".
- Was: "each string it takes from the body (its `name`, `pattern`, `group`, `event`, `job`, `from` or `to`; never its `path`, `rule` or `section`, ...)" Now: adds `service`, `image`, `port`, `kind`, `type`, `source` and `target` to the checked strings, and `targetKind` to those never checked.

[Observed] The member paragraph:

- The format identifier, in both forms: `polaris-dossier-manifest-facts/1` becomes `polaris-dossier-manifest-facts/2`, and the derived form gains `"remainder": {...}` after `factsNotListed`.
- Was: "the first 250 entries in that order are listed and the rest counted in `filesNotListed`, so every file read is listed, since at most 250 are read:" Now: "the first 250 entries in that order (100, for a recognizer of version 2.12) are listed ..., since no recognizer reads more files than it lists:".
- The members by kind gain the ten kinds of version 2.12; the kind order gains them after `job-needs`.
- Was: "takes fewer than 10,000,000 bytes whatever the tree holds:" Now: "takes fewer than 13,000,000 bytes whatever the tree holds (fewer than 10,000,000 before version 2.12):"; the widest form adds the remainder's places in the census form and the screening policy's identifier and version; "the listing caps are unchanged" becomes "the listing caps of version 2.7 are unchanged".

[Observed] The reading difference (version 2.4), syzygy-3efd.79. Was: "in the last two cases the state root is not listed and both counts are 0:" Now: "... both counts are 0, and where this draft does not parse and the record this check wrote is the bounded form, the bounded form's words are given, never the words for a draft that does not parse (version 2.12):".

[Observed] The label paragraph: the golden fixtures each of the five recognizers of version 2.12 needs for the upgrade qualification are listed after those of `github-actions-workflow`.

[Observed] The computed maps (version 2.9):

- The opening sentence names a fourth page, `maps/infrastructure.html`, titled `Infrastructure map` (version 2.12); `<map>` may be `infrastructure`.
- The `derived-maps` line gains ` · <a href="maps/infrastructure.html">Infrastructure map</a>` before its period, with "(version 2.12 adds the last link)".
- `computedMaps`: `pages` gains `maps/infrastructure.html`, `manifests` gains `remainder`, a member `infrastructure` `{"figures", "facts", "files"}` follows `ci`; `manifests.remainder` is the member's `remainder` exactly (null where `unknown`); `infrastructure.facts` and `files` are as `units` and `ci` hold theirs; the infrastructure map's `figures` is 0.

[Observed] Scenarios amended:

- "Workspace manifests read into the check record", THEN: "the five recognizer entries in the stated order" now "the recognizer entries in the stated order (ten since version 2.12)".
- "Manifest facts stay Inferred", THEN: "no page, `machine.json`, brief or published file of the run carries a manifest fact" now ends "but the computed maps of versions 2.9 and 2.12 and their `computedMaps`" (false since version 2.9 as it stood).
- "Pages and provider unchanged by manifest facts", THEN: the exception adds "and those of version 2.12".
- "Largest manifest facts read back with the check", THEN: "fewer than 10,000,000 bytes" now "fewer than 13,000,000 bytes".

[Observed] Form lines, each extended at its end: **Case**, **Observable**, **Oracle** (a sentence each for version 2.12, each ending with a clause for the extended reader rule) and **Falsifier** (eleven further falsifying clauses before its final period, the last for the extended reader rule). The **Case**, **Observable** and **Oracle** lines keep their existing text; in the **Falsifier** one carried clause changes (review finding F1): was "the `manifestFacts` member at this version's caps takes 10,000,000 bytes or more", now "... takes 13,000,000 bytes or more (10,000,000 or more before version 2.12)".

## What a reader of the previous text would now do differently

[Inferred]

- A check writes ten recognizer entries, facts from Compose, Kubernetes, Terraform and makefiles where the bound policy admits them, and a remainder whose counts sum to the tree's blob count.
- A render publishes a fourth map page and states, on the directory map's page, how many files under each top-level directory no rule named.
- A reader of a bounded check record's report for a draft that does not parse expects the bounded form's words.
- A reader of the member's size bound expects at most 13,000,000 bytes, not 10,000,000.
- Check refuses a FIFO, device or directory at the draft's path, or a draft grown past 4,194,304 bytes while read, rather than blocking or reading it whole; review, render and close give a reason for such a frozen revision rather than blocking; a brief record that is a FIFO, a device or past 262,144 bytes is refused by check and the reverification rather than blocking or read whole; and the operator's reader of `run-advice.json` reads none past 16,777,216 bytes or from anything but a regular file.
- A code worker reads a Kubernetes document whose root is a sequence or a scalar as no Kubernetes object (zero facts), a `compose-file` root that is null as `field-type`, `A := b: c` as an assignment, a tab-led line as a recipe line only after a rule, an assignment to `.RECIPEPREFIX` as `beyond-reader`, and a Terraform block nested past the reader's depth as `beyond-reader` (each stated within the added recognizer paragraphs, review findings F6 to F8).
