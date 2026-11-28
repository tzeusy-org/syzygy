#!/usr/bin/env python3
"""Check the reconciled effective specification composition (bead syzygy-73e.5.6).

The five readability successors of the adopted OpenSpec changes (Capability
1, Three-Surface POC, Polaris generator base, Polaris understanding amendment
and PWB) each ended in an owner outcome. This read-only checker re-derives,
from tracked Syzygy authority only, that every outcome is terminal and still
binds the bytes on disk, and that the requirement and scenario populations,
generated dependency and coverage rows, and default routes agree with them.
The reconciliation record is
`docs/evidence/spec-readability-reconciliation-2026-10-02/README.md`.

Predicates, each printed with its denominator:

- R1 terminal outcomes: every child has its dedicated record, and that
  record's binding resolves. A digest act's phrase argument equals the
  sha256 of its package manifest and appears in the aggregate act record; a
  version-tagged sign-off names its package, version and tag, and its marker
  block appears once in the aggregate record. A missing record is a FAIL,
  never a skipped row. A child may name later digest acts (`successors`)
  that superseded some of its subjects; each one is checked the same way and
  is equally a terminal record. A signed Polaris addition (below) is a
  child too. Its terminal outcome is either a version-tagged sign-off
  record in `decisions/` whose `Package:` line is exactly its change, checked
  the same way, one record per version; or, for an addition declared in
  `ADOPTED_ADDITIONS`, that addition's dedicated adoption record, which must
  name the installed `spec.md` (and no sign-off record may also name the
  change). An installed addition matched by neither is unsigned: a FAIL. A
  signed addition has no R2 row: no manifest hashes its `spec.md`, and the
  sign-off binds it by the tag on the recording commit, so an edit after
  sign-off re-passes here once `--regenerate` is rerun. Such an edit is a new
  version, which the recorder and review discipline govern, not this
  checker. An adopted addition's record must have its recorder's shape (one
  `Date:` and one `Recorded at (UTC):` line) and name the installed path as
  a code span. Its R2 row is its recorder's `SUBJECT_SHA`: the confirming
  review raw the recorder names must carry that digest on a
  `Subject SHA-256:` line in its first four non-blank lines, and the
  installed `spec.md` must hash to it.
- R2 exact subject bytes: a digest act's successor column equals its
  manifest rows, and every signed subject on disk hashes to its row. A
  versioned sign-off's manifest rows equal the subjects on disk. A child's
  later successors compose in order: each one's act instant is strictly
  later than the act before it, each one's predecessor column names exactly
  the row the chain has reached for that subject, and its successor row then
  becomes the row the subject must hash to. A later version-tagged sign-off
  carries no instant or predecessor column, so its marker block must follow
  the act before it in the append-only aggregate record (its `Date:` on or
  after), and its own `proposed/` patches stand in for the predecessor
  column: each moved row has exactly one patch, which reversed over the
  bytes at the successor row yields exactly the row reached; a row with no
  patch must not move, and no patch may target a path outside the manifest.
- R3 populations: CAP1-REQ, POC-REQ, PWB-REQ and the effective
  REQ-polaris-generation composition are each parsed by two independent
  methods (a regular-expression parser and a line state machine with no
  regular expressions; Polaris composes by ID line in one and by requirement
  name in the other). Both must agree, identifiers must be unique, and the
  result must equal the hard-coded literal census below and the committed
  `census.json`. CAP1 is the effective composition (`syzygy-5oqc`): the
  bound file with the adopted `cap1-trusted-bootstrap-consent` overlay's
  blocks for exactly CAP1-REQ-011 and 046 in place of its own, composed only
  while its declared v1.0 sign-off record terminates it. Method A parses
  both files by regular expression and replaces by identifier; method B
  splices the overlay's blocks into the bound text by lines, parses that
  with the state machine, and requires the spliced bytes to hash to the
  `composed_spec_sha256` the adoption builder recorded. Both refuse any
  other replaced set, a name the bound file lacks, any level-2 heading but
  `## MODIFIED Requirements` or other delta heading, U+FEFF, a carriage
  return, and a non-canonical or fenced requirement header. A Polaris addition is any other change whose
  `specs/polaris-generation/spec.md` is installed (by a version-tagged
  sign-off's builder, or by the install step after an adoption record); it
  is signed when R1 finds its terminal record. It may only ADD requirements
  and is composed after the overlay by both methods. Each method also refuses, independent of requirement
  blocks, every level-2 heading in an addition other than exactly
  `## ADDED Requirements` and every heading of any level, case or spacing
  that names a delta section (a RENAMED list or a name-only REMOVED list
  carries no requirement block). Both methods also refuse an addition that
  carries U+FEFF anywhere or any carriage return: OpenSpec strips a leading
  byte-order mark and reads `\r` as a line break before it splits sections,
  and both methods here split on `\n` only, so such bytes could hide a delta
  heading. They are refused, never normalised. The expected Polaris totals and identities are derived,
  never raised by hand: the base-and-overlay literal (31 / 182, IDs 001–031)
  plus what each signed addition ADDs, read by both block parsers from the
  addition alone. An unsigned addition adds nothing to the expected
  population, so it fails here as well as in R1, and `--regenerate` refuses.
- R4 generated rows: each generated dependency file's source digest and
  requirement count match the spec; every full or continuation-form
  identifier mention in the five change directories, each signed addition's
  directory, the CAP1 overlay's directory and the default route pages
  resolves to the population; the CAP1 overlay's generated
  `GOVERNING-DEPENDENCIES.json` (requirement count, source digests) and its
  `ADOPTION.md` figure agree with the composed census; the CAP1
  and PWB capability coverage tables carry the whole population; and each
  signed addition's generated union equals its spec's warrants (a FAIL,
  since that union is generated and never signed).
- R5 default routes: `openspec/README.md` has one row per tracked change
  directory naming its terminal record; `PROJECT-STATUS.md` cites every
  terminal record (a signed addition's and the CAP1 overlay's sign-off
  records included; the overlay's row must name its record) and states
  the Polaris composition the census computes.
- R6 behaviour-contract pins (report only, never green): the observer
  registry entry and the secret-classification policy pin a PWB `spec.md`
  digest. A pin that differs from the current bytes is Unknown and needs its
  own owner act; this checker never repairs it.
- R7 Polaris dependency unions (report only, never green): each of the two
  generated Polaris unions is recomputed from its spec's warrants blocks.
  Both files are bound bytes, regenerated (never written) by
  `scripts/build_polaris_dependency_unions.py`, so a difference is Unknown
  and needs a signed successor.

The D10 declared-source2.0 amendment is separate from those ADDED-only
additions. One explicit VIS-4 ledger row names its actual default source
landing, specification tag, reviewed policy and scoped applicability judgment.
R1 checks that row and the verified D10 record; R2 checks the three reviewed
subjects. R3 applies exactly five MODIFIED requirements after all additions,
by independent ID and name methods, including only046's declared rename.
An invalid binding applies none of it. R4 cross-checks its existing JSON
warrant union, and R5 routes it to the one adoption ledger. This is published
specification applicability only, never source/provider admission. The tag's
actual target is checked at publication, not asserted from a row's text.

The v2.1 URL declared-source transaction is pending until its own row.
After the row and reviewed subjects verify, both R3 methods apply its four
MODIFIED requirements and one ADDED requirement after v2.0, and R4/R5
include its dependency union and publication routes.

`--selftest` copies every input into a scratch tree, confirms it passes,
then applies each rule-6 mutant and requires its expected predicate to fail
(or, for R6 and R7, to change what it reports); `--witnesses FILE` stores
each mutant's path, old and new fragment and the commit it ran at. One R6
case is strict rather than a change: with the `syzygy-jloi` re-pin package's
proposed bytes in place of both pinned subjects (what that package's
recorder applies at its acts), R6 must examine both pins and report exactly
zero findings, with no other predicate failing. Once the acts are performed
the tree already carries those bytes, and the case requires zero there.
Since the 2026-10-03 tree-framing sign-off moved `spec.md` past the pinned
row, the case also replays `spec.md` as the pinned bytes (the re-pin
builder's `spec_at_pin`, every later signed patch reversed): R6 must read
zero over that tree, and R2, R3 and R4, which then see bytes no act binds,
must fail exactly. After the P115 sign-off, replaying its governing PWB
input must additionally produce exactly the P115 R1 refusal. The fixture
requires the complete signed transaction to validate when only PWB is
restored, so the early input refusal cannot hide another record defect.
The unsigned fixture retains the exact R2/R3/R4 expectation. On the tree
itself R6 reports both pins until their own re-pin act. The strict case `pins-after-tree-framing-repin-acts` does the
same for the `syzygy-2g0d` package, which re-pins both to the tree-framing
`spec.md` row: with its proposed bytes in place of both subjects, R6 must
examine both pins and report zero, and no other predicate may fail.
The R7 case `union-after-successor-act` does the same with the
`syzygy-c51h` successor package's proposed union. Before that act it
required R2, and only R2, to fail by design; the reconciliation was
re-derived on 2026-10-02 to name the act as the understanding child's
successor, so the case now requires every predicate to pass.

`--selftest` also installs a synthetic signed addition into a scratch copy
(spec, sign-off record, aggregate block, route row, status figure, then
`--regenerate`), requires it to pass, and kills one mutant per addition
predicate; then a synthetic adopted addition beside it (spec, adoption
record declared in `ADOPTED_ADDITIONS` with its spec's digest, route row,
status citation and figure), with its own mutants. Three code mutants
survive by design (R-365-2 note 1): accepting a record with no single
`Version:` line is near-equivalent, since `check_versioned` then wants the
tag `…-vNone`; and the expected totals' skip of an unsigned addition and the
two block parsers' agreement on what an addition adds are each redundant
with the composition's own findings, kept as a second statement.

Every mode reads the whole `*-SIGNOFF-v*.md` population of `decisions/`
first, each entry by `read_text(encoding="utf-8")` as before `syzygy-j5dg`,
so every entry that read then (a symlink to a regular file or to
`/dev/null`, a CRLF record, a FIFO whose writer supplies a finite stream)
reads the same now. An entry whose read raised (a directory, a socket, a
dangling or looping symlink, a symlink to a directory, an unreadable file,
bytes that are not UTF-8) is never read as absent: the mode prints
`REFUSED R1` naming each entry and its kind, evaluates no predicate, and
exits 1. A FIFO is opened and read exactly as before, so one with no
writer still blocks, as it did on main; changing that is the owner's
question (owner answer `pr714-fifo-refusal` B, 2026-11-15). `--selftest`
pins one fixture per kind, the controls that must read as before (a
live-writer FIFO among them), and the CLI's exit 1.

A Polaris addition's recording commit runs one command after the recorder
has applied the package through its builder:

  python3 scripts/check_spec_reconciliation.py --regenerate

It writes the addition's generated `GOVERNING-DEPENDENCIES.md` (through
`scripts/build_polaris_dependency_unions.py --write-additions`) and
`census.json`, and refuses while any installed addition is unsigned. It
never writes a signed subject, a route page or this script.

A later act over any subject fails R2 by design: the reconciliation is then
re-derived, never carried forward. The first re-derivation (2026-10-02)
added the dependency-union successor act to the understanding child; the
second (2026-10-03) added the tree-framing sign-off v1.0 to the PWB child
and re-derived the PWB census (PWB-REQ-014 gained seven scenarios).

Usage:
  python3 scripts/check_spec_reconciliation.py --check
  python3 scripts/check_spec_reconciliation.py --census > <record>/census.json
  python3 scripts/check_spec_reconciliation.py --regenerate
  python3 scripts/check_spec_reconciliation.py --selftest [--witnesses FILE]
"""
import argparse
import functools
import copy
import multiprocessing
import contextlib
from datetime import date as iso_date
import errno
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
DECISIONS = ".syzygy/governance/decisions"
CANDIDATES = ".syzygy/governance/contracts/candidates"
AGGREGATE = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"
RECORD_DIR = "docs/evidence/spec-readability-reconciliation-2026-10-02"
CENSUS = f"{RECORD_DIR}/census.json"
CHANGES = "openspec/changes"
STATUS = "PROJECT-STATUS.md"
OPENSPEC_README = "openspec/README.md"
ROUTE_PAGES = (STATUS, OPENSPEC_README, "README.md", "AGENTS.md")
REGISTRY = (".syzygy/governance/declarations/adapter-registry/"
            "POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json")
POLICY = (".syzygy/governance/policies/"
          "POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json")
PIN_BEAD = "syzygy-2g0d"
UNION_SUCCESSOR = (f"{CANDIDATES}/"
                   "polaris-understanding-dependency-union-successor")
UNION_BEAD = "syzygy-c51h"

CAP1_CHANGE = "project-registration-and-honest-shape-visibility"
POC_CHANGE = "three-surface-poc-experience"
PWB_CHANGE = "polaris-project-wide-butlers-model"
BASE_CHANGE = "polaris-manifesto-generation"
UNDERSTANDING_CHANGE = "polaris-manifesto-understanding-amendment"

#: The five children of syzygy-73e.5, each with its terminal outcome record.
CHILDREN = (
    {"key": "cap1", "bead": "syzygy-73e.5.1", "kind": "digest",
     "change": CAP1_CHANGE,
     "label": "SIGN OFF CAPABILITY 1 READABILITY SUCCESSOR",
     "record": f"{DECISIONS}/CAPABILITY-1-READABILITY-SUCCESSOR-ACT.md",
     "manifest": f"{CANDIDATES}/capability-1-readability-successor/"
                 "SUCCESSOR-MANIFEST.txt"},
    {"key": "poc", "bead": "syzygy-73e.5.2", "kind": "digest",
     "change": POC_CHANGE,
     "label": "SIGN OFF THREE-SURFACE POC READABILITY SUCCESSOR",
     "record": f"{DECISIONS}/THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md",
     "manifest": f"{CANDIDATES}/three-surface-poc-readability-successor/"
                 "THREE-SURFACE-POC-READABILITY-SUCCESSOR-MANIFEST.txt",
     # Later version-tagged sign-offs over this child's subjects, in act
     # order, under the 2026-10-14 Scope A extension to POC amendments.
     "successors": (
         {"kind": "versioned",
          "package": "three-surface-poc-block-provenance-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/"
                    "THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{CANDIDATES}/three-surface-poc-block-provenance-amendment/"
                      "THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-MANIFEST.txt",
          "proposed": f"{CANDIDATES}/three-surface-poc-block-provenance-amendment/"
                      "proposed"},
         # No manifest: the sign-off record carries the applied rows in
         # manifest-row form and stands in as the manifest.
         {"kind": "versioned",
          "package": "three-surface-poc-governing-intent-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/"
                    "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{DECISIONS}/"
                      "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md",
          "proposed": f"{CANDIDATES}/three-surface-poc-governing-intent-amendment/"
                      "proposed"},
         {"kind": "versioned",
          "package": "three-surface-poc-vocabulary-epistemic-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/"
                    "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{CANDIDATES}/three-surface-poc-vocabulary-epistemic-amendment/"
                      "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-MANIFEST.txt",
          "proposed": f"{CANDIDATES}/three-surface-poc-vocabulary-epistemic-amendment/"
                      "proposed"},
     )},
    {"key": "polaris-base", "bead": "syzygy-73e.5.3", "kind": "digest",
     "change": BASE_CHANGE,
     "label": "SIGN OFF POLARIS GENERATOR BASE READABILITY SUCCESSOR",
     "record": f"{DECISIONS}/POLARIS-GENERATOR-BASE-READABILITY-SUCCESSOR-ACT.md",
     "manifest": f"{CANDIDATES}/polaris-generator-base-readability-successor/"
                 "SUCCESSOR-MANIFEST.txt"},
    {"key": "polaris-understanding", "bead": "syzygy-73e.5.4",
     "kind": "digest", "change": UNDERSTANDING_CHANGE,
     "label": "SIGN OFF POLARIS UNDERSTANDING READABILITY SUCCESSOR",
     "record": f"{DECISIONS}/POLARIS-UNDERSTANDING-READABILITY-SUCCESSOR-ACT.md",
     "manifest": f"{CANDIDATES}/polaris-understanding-readability-successor/"
                 "SUCCESSOR-MANIFEST.txt",
     # Later digest acts over some of this child's subjects, in act order.
     "successors": (
         {"label": "SIGN OFF POLARIS UNDERSTANDING DEPENDENCY UNION SUCCESSOR",
          "record": f"{DECISIONS}/"
                    "POLARIS-UNDERSTANDING-DEPENDENCY-UNION-SUCCESSOR-ACT.md",
          "manifest": f"{UNION_SUCCESSOR}/SUCCESSOR-MANIFEST.txt"},
     )},
    {"key": "pwb", "bead": "syzygy-73e.5.5", "kind": "versioned",
     "change": PWB_CHANGE, "package": "pwb-readability-successor",
     "version": "1.0",
     "record": f"{DECISIONS}/PWB-READABILITY-SUCCESSOR-SIGNOFF-v1.0.md",
     "manifest": f"{CANDIDATES}/pwb-readability-successor/"
                 "PWB-READABILITY-SUCCESSOR-MANIFEST.txt",
     # Later version-tagged sign-offs over this child's subjects, in act
     # order (re-derived 2026-10-03). Each one's patches under `proposed/`
     # must reverse the successor row to exactly the row the chain reached.
     "successors": (
         {"kind": "versioned", "package": "pwb-tree-framing-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{CANDIDATES}/pwb-tree-framing-amendment/"
                      "PWB-TREE-FRAMING-AMENDMENT-MANIFEST.txt",
          "proposed": f"{CANDIDATES}/pwb-tree-framing-amendment/proposed"},
         {"kind": "versioned", "package": "pwb-anchor-resolution-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{CANDIDATES}/pwb-anchor-resolution-amendment/"
                      "PWB-ANCHOR-RESOLUTION-AMENDMENT-MANIFEST.txt",
          "proposed": f"{CANDIDATES}/pwb-anchor-resolution-amendment/proposed"},
         {"kind": "versioned", "package": "pwb-class-granular-extraction-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{CANDIDATES}/pwb-class-granular-extraction-amendment/"
                      "PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-MANIFEST.txt",
          "proposed": f"{CANDIDATES}/pwb-class-granular-extraction-amendment/proposed"},
         {"kind": "versioned", "package": "pwb-accessible-name-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/PWB-ACCESSIBLE-NAME-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{CANDIDATES}/pwb-accessible-name-amendment/"
                      "PWB-ACCESSIBLE-NAME-AMENDMENT-MANIFEST.txt",
          "proposed": f"{CANDIDATES}/pwb-accessible-name-amendment/proposed"},
         {"kind": "versioned", "package": "pwb-opening-index-amendment",
          "version": "1.0",
          "record": f"{DECISIONS}/PWB-OPENING-INDEX-AMENDMENT-SIGNOFF-v1.0.md",
          "manifest": f"{CANDIDATES}/pwb-opening-index-amendment/"
                      "PWB-OPENING-INDEX-AMENDMENT-MANIFEST.txt",
          "proposed": f"{CANDIDATES}/pwb-opening-index-amendment/proposed"},
     )},
)


def spec_path(change, capability=None):
    return f"{CHANGES}/{change}/specs/{capability or change}/spec.md"


FAMILY_SPECS = {
    "CAP1": spec_path(CAP1_CHANGE),
    "POC": spec_path(POC_CHANGE),
    "PWB": spec_path(PWB_CHANGE),
}
#: The adopted CAP1 overlay (P-109, signed v1.0 by version tag 2026-10-15):
#: its `spec.md` fully replaces the requirement blocks named below in the
#: bound CAP1 file, and the census reads the composition (syzygy-5oqc).
#: Declared here, never inferred; the replaced identities are literals.
CAP1_OVERLAY_CHANGE = "cap1-trusted-bootstrap-consent"
CAP1_OVERLAY_SPEC = spec_path(CAP1_OVERLAY_CHANGE, CAP1_CHANGE)
CAP1_OVERLAY_RECORD = (f"{DECISIONS}/"
                       "CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md")
CAP1_OVERLAY_VERSION = "1.0"
CAP1_OVERLAY_DEPS = f"{CHANGES}/{CAP1_OVERLAY_CHANGE}/GOVERNING-DEPENDENCIES.json"
CAP1_OVERLAY_ADOPTION = f"{CHANGES}/{CAP1_OVERLAY_CHANGE}/ADOPTION.md"
CAP1_OVERLAY_REPLACES = ("CAP1-REQ-011", "CAP1-REQ-046")
CAP1_OVERLAY_SECTION = "## MODIFIED Requirements"
CAP1_ROOT_CHANGE = "cap1-root-adjudication"
CAP1_ROOT_HOME = f"{CHANGES}/{CAP1_ROOT_CHANGE}"
CAP1_ROOT_SPEC = f"{CAP1_ROOT_HOME}/proposed/{CAP1_CHANGE}/spec.md"
CAP1_ROOT_COVERAGE = f"{CAP1_ROOT_HOME}/CONTRACT-COVERAGE.md"
CAP1_ROOT_PROJECTION = f"{CAP1_ROOT_HOME}/CAP1-PROSPECTIVE-PROJECTION.json"
CAP1_ROOT_REPLACES = ("CAP1-REQ-006",)
CAP1_ROOT_VERSION = "1.0"
CAP1_ROOT_VERSION_NAME = f"{CAP1_ROOT_CHANGE}-v{CAP1_ROOT_VERSION}"
CAP1_ROOT_VERSION_MARKER = f"Candidate version {CAP1_ROOT_VERSION}."
CAP1_ROOT_CANDIDATE_MARKER = "Candidate version unallocated."
CAP1_ROOT_RFC_FILES = tuple(
    f"{directory}/rfcs/{path}"
    for directory in (CANDIDATES, ".syzygy/governance/contracts")
    for path in ("RFC-0001-project-graph-identity-state-planes.md",
                 "RFC-0003/manifests-and-namespace.md")
)
CAP1_ROOT_RFC_DIGESTS = dict(zip(CAP1_ROOT_RFC_FILES, (
    "edf7538687997c9199f5155973332247d6a44ddce356480329c0886e3375d3be",
    "84350c1fc0d066fb7f1d41f0e07e959ff55329a799273e10d4c71debfc05de20",
) * 2))
CAP1_ROOT_SUCCESSOR_DIGEST = "a7596452f408d0f29efe7375e4c8e6a870010f0bdace58025642d4db942691a7"
CAP1_ROOT_SUBJECTS = {
    CAP1_ROOT_SPEC: "185af92ae6eed07aae21f6b285ff980e9fd106d43f0f814bd2a30afe7e4d96bd",
    CAP1_ROOT_COVERAGE: "480abb4ea4796e19ff38ecda02596aeafe13e784c8480e7ea6f83eb2d322fa14",
}
CAP1_ROOT_BOUND_PATHS = (*CAP1_ROOT_SUBJECTS, CAP1_ROOT_PROJECTION, *CAP1_ROOT_RFC_FILES)
CAP1_ROOT_STATUS_RECORD = f"[CAP1 root adjudication {CAP1_ROOT_VERSION}]({CAP1_ROOT_HOME})"
CAP1_ROOT_INDEX_STAGE = "**Conditional activation.**"
_CAP1_SELFTEST_GIT_ROOT = None
_VBASE_SELFTEST_GIT_ROOT = None
CAP1_ROOT_INDEX = f"{CANDIDATES}/05-CONTRACT-INDEX.yaml"
CAP1_HISTORIC_COVERAGE = f"{CHANGES}/{CAP1_CHANGE}/CONTRACT-COVERAGE.md"
CAP1_CONSENT_COVERAGE = f"{CHANGES}/{CAP1_OVERLAY_CHANGE}/CONTRACT-COVERAGE.md"
# The CAP1 readability act and the annotated P-109 v1.0 source bind
# these inputs. Regeneration cannot independently replace their bytes.
CAP1_ROOT_PREDECESSORS = {
    FAMILY_SPECS["CAP1"]: "65b66c913cd2650881a9df8cb34a3c63b3f518041e83f45d2451980d9f1d0448",
    CAP1_OVERLAY_SPEC: "359ff741742902f0b07bbf1b4ec9aa997d17145cd56805fb49d6e683a12776e7",
    CAP1_OVERLAY_DEPS: "fb96db1a5e04167bfd8d25f4580be96ad506d556f70ed2f34f1900ccc2df02d8",
    CAP1_HISTORIC_COVERAGE: "15431d8ba1fe25a61e4dc2713c4d51fad1cf6d25ef7a9103cc616265102289c9",
    CAP1_CONSENT_COVERAGE: "972ab4b306999104327de27e1af3a2ee5e94fb38c08e75c25e68c3d9065dae45",
}
CAP1_ROOT_TAG_CLAIM = re.compile(rf"`{CAP1_ROOT_CHANGE}-v[0-9]+(?:\.[0-9]+)+`")
CAP1_ROOT_STATUS_SUBJECT = rf"\[[^\]]+\]\((?:\./)?{CAP1_ROOT_HOME}(?:/[^)\s]*)?\)"
CAP1_ROOT_ACTIVE_STATE = r"(?:agent[- ]adopted|adopted|effective|in force)\b"
CAP1_ROOT_STATUS_CLAIM = re.compile(
    rf"{CAP1_ROOT_STATUS_SUBJECT} (?:\*\*)?is (?:now )?(?:\*\*)?{CAP1_ROOT_ACTIVE_STATE}",
    re.IGNORECASE)
CAP1_ROOT_STATUS_LINK = re.compile(CAP1_ROOT_STATUS_SUBJECT)
CAP1_ROOT_STATUS_CELL = re.compile(
    rf"(?:\[(?:Observed|Inferred|Unknown)\][ \t]+)?(?:\*\*)?{CAP1_ROOT_ACTIVE_STATE}",
    re.IGNORECASE)
POLARIS_BASE_SPEC = spec_path(BASE_CHANGE, "polaris-generation")
POLARIS_OVERLAY_SPEC = spec_path(UNDERSTANDING_CHANGE, "polaris-generation")
POLARIS_ID = "REQ-polaris-generation-"
POLARIS_ADDITION_GLOB = "*/specs/polaris-generation/spec.md"
SIGNOFF_RECORD_GLOB = "*-SIGNOFF-v*.md"
VERSION_LINE = re.compile(r"^Version: (\d+\.\d+)$", re.M)


# The reviewed five-ID amendment is distinct from every ADDED-only addition.
# Its one VIS-4 ledger row names the actual source landing and version tag.
DECLARED_SOURCE_CHANGE = "dossier-declared-source-model"
DECLARED_SOURCE_SPEC = f"{CHANGES}/{DECLARED_SOURCE_CHANGE}/proposed/polaris-generation/spec.md"
DECLARED_SOURCE_UNION = f"{CHANGES}/{DECLARED_SOURCE_CHANGE}/GOVERNING-DEPENDENCIES.json"
AGENT_ADOPTIONS = f"{DECISIONS}/AGENT-ADOPTIONS.md"
DECLARED_SOURCE_ROW = 'A-4'
# POC amendments adopted since D10 that add Scenarios, each by its version
# tag and the Scenarios it adds per requirement; a requirement the literal
# does not hold is a new one with that many Scenarios. R3 expects an
# amendment's requirements and Scenarios exactly when its adoption row is in
# the tree, so a tree from before it (the P115 signed selftest's frozen
# core) keeps its 26 / 34 census.
POC_SCENARIO_AMENDMENTS = (
    ('three-surface-poc-closure-wording-amendment-v1.0', {"043": 1}),  # syzygy-t3jk.14
    ('three-surface-poc-board-unknowns-amendment-v1.0', {"040": 1, "043": 1}),  # syzygy-t3jk.15
    ('three-surface-poc-five-answers-amendment-v1.0', {"044": 3}),  # syzygy-t3jk.16, new POC-REQ-044
    ('three-surface-poc-elapsed-time-amendment-v1.0', {"045": 2}),  # syzygy-t3jk.17, new POC-REQ-045
    ('three-surface-poc-views-amendment-v1.0', {"042": 1}),  # syzygy-t3jk.18
    ('three-surface-poc-trajectory-dependency-eligibility-amendment-v1.0', {"062": 7}),  # syzygy-t3jk.19
    ('three-surface-poc-outline-amendment-v1.0', {"042": 1}),  # syzygy-t3jk.20
    ('three-surface-poc-changes-amendment-v1.0', {"044": 2}),  # syzygy-t3jk.21
    ('three-surface-poc-grouped-default-amendment-v1.0', {"042": 1}),  # syzygy-t3jk.22
    ('three-surface-poc-titles-amendment-v1.0', {"063": 2}),  # syzygy-t3jk.23, new POC-REQ-063
    ('three-surface-poc-list-titles-amendment-v1.0', {"063": 1}),  # syzygy-t3jk.24, POC-REQ-063 lists
    ('three-surface-poc-commit-joins-amendment-v1.0', {"064": 2}),  # syzygy-t3jk.25, new POC-REQ-064
    ('three-surface-poc-closed-landings-amendment-v1.0', {"065": 2}),  # syzygy-t3jk.26, new POC-REQ-065
)
DECLARED_SOURCE_COMMIT = '182a703b2dbae97a16ae7334cd84a32b634cedc0'
DECLARED_SOURCE_TAG = 'polaris-dossier-declared-source-model-v2.0'
DECLARED_SOURCE_SUBJECTS = {
    'openspec/changes/dossier-declared-source-model/proposed/polaris-generation/spec.md':
        'd17dad153f030bd935059a8b0df24286d72370b275a5fb4052de901b2af4e040',
    '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json':
        '516cb1f2dba9ceb3e55166077c0800be6022012406b9b9b5f0df25bcb73aa499',
    '.syzygy/governance/decisions/DOSSIER-DECLARED-SOURCE-CONTRACT-APPLICABILITY.md':
        'a698de216484ee2f221988142e70de3b661c9fb095b0e3eb3cf10390517588d1',
}
URL_SOURCE_CHANGE = "dossier-url-declared-source-run"
URL_SOURCE_HOME = f"{CHANGES}/{URL_SOURCE_CHANGE}"
URL_SOURCE_SPEC = f"{URL_SOURCE_HOME}/proposed/polaris-generation/spec.md"
URL_SOURCE_UNION = f"{URL_SOURCE_HOME}/GOVERNING-DEPENDENCIES.json"
URL_SOURCE_TAG = "polaris-dossier-url-declared-source-run-v2.1"
URL_STATUS_PREFIX = f"[URL dossier 2.1 amendment]({URL_SOURCE_HOME})"
URL_SOURCE_REPLACEMENTS = f"{URL_SOURCE_HOME}/EXACT-REPLACEMENTS.json"
URL_SOURCE_REPLACEMENTS_SHA = "e26793ab3ed9a614f892ff25b13209c15efaec62c3f8dcbf3f945a22f48dad8c"
URL_SOURCE_RFC_MODULES = ("RFC-0003/manifests-and-namespace.md",
                          "RFC-0003/governance-homes-and-owner-acts.md",
                          "RFC-0005/admission-and-boundary.md")
URL_SOURCE_RFC_PATHS = tuple(
    f".syzygy/governance/contracts/{tree}/{module}"
    for tree in ("rfcs", "candidates/rfcs") for module in URL_SOURCE_RFC_MODULES)
RFC_CLAUSE_START = re.compile(r"^\*\*(RFC\d+-\d+(?:\([a-z]\))?)(?:\.|\s+[—-])", re.M)
RFC_SECTION_START = re.compile(r"^#{2,} ", re.M)
URL_SOURCE_SUBJECTS = {
    URL_SOURCE_SPEC:
        "e30836f902361c74943cc0cf69ae907a3e9d678a542b27676677e47c8a5fa865",
    ".syzygy/governance/policies/POLARIS-DOSSIER-URL-ORIGIN-SPECIES-POLICY-v1.json":
        "930efcc2cbdae55be92ce7929820e771f554502a9110e8ac5f8925132961e421",
    f"{DECISIONS}/DOSSIER-URL-RUN-CONTRACT-APPLICABILITY.md":
        "38e3b6f924c81187cfe7bb31e5383a994d98339689bb0256dd0c1763c8267386",
    f"{URL_SOURCE_HOME}/proposed/contracts/DOSSIER-URL-LOCAL-MACHINE-CREDENTIAL-AMENDMENT.md":
        "fdbb30efae2b01946a8f8265b9b7bbbd81c89e007aacc94455f7527fcb19aa6d",
}
URL_SOURCE_BOUND_PARTS = len(URL_SOURCE_SUBJECTS) + 1 + 2 * 7
# The v2.2 figure-homes-and-fit amendment (syzygy-3efd.18/.20): one MODIFIED
# REQ-polaris-generation-034 after v2.0 (and after v2.1 where it is in force),
# pending until its own VIS-4 ledger row, found by its tag as v2.1's is.
FIGURE_CHANGE = "dossier-figure-homes-and-fit"
FIGURE_HOME = f"{CHANGES}/{FIGURE_CHANGE}"
FIGURE_SPEC = f"{FIGURE_HOME}/proposed/polaris-generation/spec.md"
FIGURE_UNION = f"{FIGURE_HOME}/GOVERNING-DEPENDENCIES.json"
FIGURE_TAG = "polaris-dossier-figure-homes-and-fit-v2.2"
FIGURE_STATUS_PREFIX = f"[Figure homes and fit amendment 2.2]({FIGURE_HOME})"
FIGURE_SUBJECTS = {
    FIGURE_SPEC: "32bef7ddf28d36b3bc4e5d31a30caf1e82e509ab4779263ceb1c39f29f10632e",
}
FIGURE_BOUND_PARTS = len(FIGURE_SUBJECTS)
# The v2.3 derived-observed-facts amendment (syzygy-3efd.27): one MODIFIED
# REQ-polaris-generation-034 after v2.2, plus the currency-bound policy it
# names, pending until its own VIS-4 ledger row, found by its tag as v2.2's is.
DERIVED_CHANGE = "dossier-derived-observed-facts"
DERIVED_HOME = f"{CHANGES}/{DERIVED_CHANGE}"
DERIVED_SPEC = f"{DERIVED_HOME}/proposed/polaris-generation/spec.md"
DERIVED_UNION = f"{DERIVED_HOME}/GOVERNING-DEPENDENCIES.json"
DERIVED_POLICY = ".syzygy/governance/policies/POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json"
DERIVED_TAG = "polaris-dossier-derived-observed-facts-v2.3"
DERIVED_STATUS_PREFIX = f"[Derived observed facts amendment 2.3]({DERIVED_HOME})"
DERIVED_SUBJECTS = {
    DERIVED_SPEC: "6c663a807817f825a7a3c6f1f9ff39864745e57ae6c3bb6a8498d98c90fad461",
    DERIVED_POLICY: "95a3aa132041aa5dd8f860e8ce4c92b3e3c3380ebef4b1ada19bee6b8f50865e",
}
DERIVED_BOUND_PARTS = len(DERIVED_SUBJECTS)
# The v2.4 ledger-packs-thesis amendment (syzygy-3efd.21, .43, .56): one
# MODIFIED REQ-polaris-generation-034 after v2.3, pending until its own VIS-4
# ledger row, found by its tag as v2.3's is.
LEDGER_CHANGE = "dossier-ledger-packs-thesis"
LEDGER_HOME = f"{CHANGES}/{LEDGER_CHANGE}"
LEDGER_SPEC = f"{LEDGER_HOME}/proposed/polaris-generation/spec.md"
LEDGER_UNION = f"{LEDGER_HOME}/GOVERNING-DEPENDENCIES.json"
LEDGER_TAG = "polaris-dossier-ledger-packs-thesis-v2.4"
LEDGER_STATUS_PREFIX = f"[Ledger, packs and thesis amendment 2.4]({LEDGER_HOME})"
LEDGER_SUBJECTS = {
    LEDGER_SPEC: "500a7771f3df85046ff2c0c41a36c2067cf0bf44b1ba65e5bb5f52d4dbd9fded",
}
LEDGER_BOUND_PARTS = len(LEDGER_SUBJECTS)
# The v2.5 figure-kinds amendment (syzygy-3efd.30): one MODIFIED
# REQ-polaris-generation-034 after v2.4, pending until its own VIS-4 ledger
# row, found by its tag as v2.4's is.
KINDS_CHANGE = "dossier-figure-kinds"
KINDS_HOME = f"{CHANGES}/{KINDS_CHANGE}"
KINDS_SPEC = f"{KINDS_HOME}/proposed/polaris-generation/spec.md"
KINDS_UNION = f"{KINDS_HOME}/GOVERNING-DEPENDENCIES.json"
KINDS_TAG = "polaris-dossier-figure-kinds-v2.5"
KINDS_STATUS_PREFIX = f"[Figure kinds amendment 2.5]({KINDS_HOME})"
KINDS_SUBJECTS = {
    KINDS_SPEC: "a949eebfae9492c70b36e703955449cbef9d4b5e6d65bc6151dbe6716ac37a2c",
}
KINDS_BOUND_PARTS = len(KINDS_SUBJECTS)
# The v2.6 declared-source reach amendment (syzygy-3efd.24): one MODIFIED
# REQ-polaris-generation-046 over v2.0, with the screening-policy successor
# it binds; pending until its own VIS-4 ledger row, found by its tag.
# It replaces a different requirement from the v2.2-v2.4 REQ-034 train, so
# its only predecessor is declared-source v2.0.
REACH_CHANGE = "dossier-declared-source-reach"
REACH_HOME = f"{CHANGES}/{REACH_CHANGE}"
REACH_SPEC = f"{REACH_HOME}/proposed/polaris-generation/spec.md"
REACH_UNION = f"{REACH_HOME}/GOVERNING-DEPENDENCIES.json"
REACH_POLICY = ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json"
REACH_TAG = "polaris-dossier-declared-source-reach-v2.6"
REACH_STATUS_PREFIX = f"[Declared-source reach amendment 2.6]({REACH_HOME})"
REACH_REPLACES = (POLARIS_ID + "046",)
REACH_SUBJECTS = {
    REACH_SPEC: "73047a45f1ee296e52fcdbe898ef14fb386b78cf13ce5b6c1fc097d1f12b6072",
    REACH_POLICY: "8c10531f57d129ad5d402e53d7d9fdc741387f6eaab701bbdb46419181b11967",
}
REACH_BOUND_PARTS = len(REACH_SUBJECTS)
# The v2.7 manifest-recognizers amendment (syzygy-3efd.25): one MODIFIED
# REQ-polaris-generation-034 after v2.5 (v2.6 replaced REQ-046 alone),
# pending until its own VIS-4 ledger row, found by its tag as v2.5's is.
MANIFESTS_CHANGE = "dossier-manifest-recognizers"
MANIFESTS_HOME = f"{CHANGES}/{MANIFESTS_CHANGE}"
MANIFESTS_SPEC = f"{MANIFESTS_HOME}/proposed/polaris-generation/spec.md"
MANIFESTS_UNION = f"{MANIFESTS_HOME}/GOVERNING-DEPENDENCIES.json"
MANIFESTS_TAG = "polaris-dossier-manifest-recognizers-v2.7"
MANIFESTS_STATUS_PREFIX = f"[Manifest recognizers amendment 2.7]({MANIFESTS_HOME})"
MANIFESTS_SUBJECTS = {
    MANIFESTS_SPEC: "55cc14dc4da4ccebaf72f3fa14937be357a2e873ab967a8a8fe79e0db7c3caaa",
}
MANIFESTS_BOUND_PARTS = len(MANIFESTS_SUBJECTS)
# The v2.8 spec-repairs amendment (syzygy-3efd.72, .67, .68, .71): one
# MODIFIED REQ-polaris-generation-034 after v2.7, pending until its own
# VIS-4 ledger row, found by its tag as v2.7's is.
REPAIRS_CHANGE = "dossier-spec-repairs"
REPAIRS_HOME = f"{CHANGES}/{REPAIRS_CHANGE}"
REPAIRS_SPEC = f"{REPAIRS_HOME}/proposed/polaris-generation/spec.md"
REPAIRS_UNION = f"{REPAIRS_HOME}/GOVERNING-DEPENDENCIES.json"
REPAIRS_TAG = "polaris-dossier-spec-repairs-v2.8"
REPAIRS_STATUS_PREFIX = f"[Spec repairs amendment 2.8]({REPAIRS_HOME})"
REPAIRS_SUBJECTS = {
    REPAIRS_SPEC: "a8e768128d9996be234378eeacf88f3b8dc97577d3031c50b0459f6db24272d4",
}
REPAIRS_BOUND_PARTS = len(REPAIRS_SUBJECTS)
# The v2.9 computed-maps amendment (syzygy-3efd.36, .64): one MODIFIED
# REQ-polaris-generation-034 after v2.8, pending until its own VIS-4 ledger
# row, found by its tag as v2.8's is.
MAPS_CHANGE = "dossier-computed-maps"
MAPS_HOME = f"{CHANGES}/{MAPS_CHANGE}"
MAPS_SPEC = f"{MAPS_HOME}/proposed/polaris-generation/spec.md"
MAPS_UNION = f"{MAPS_HOME}/GOVERNING-DEPENDENCIES.json"
MAPS_TAG = "polaris-dossier-computed-maps-v2.9"
MAPS_STATUS_PREFIX = f"[Computed maps amendment 2.9]({MAPS_HOME})"
MAPS_SUBJECTS = {
    MAPS_SPEC: "63902cc6f737295f7aac4953b7c950ced6142d5648bdd63abc4996d31a8d0987",
}
MAPS_BOUND_PARTS = len(MAPS_SUBJECTS)
# The v2.10 record-bounds amendment (syzygy-3efd.73, .74): one MODIFIED
# REQ-polaris-generation-034 after v2.9, pending until its own VIS-4 ledger
# row, found by its tag as v2.9's is.
BOUNDS_CHANGE = "dossier-record-bounds"
BOUNDS_HOME = f"{CHANGES}/{BOUNDS_CHANGE}"
BOUNDS_SPEC = f"{BOUNDS_HOME}/proposed/polaris-generation/spec.md"
BOUNDS_UNION = f"{BOUNDS_HOME}/GOVERNING-DEPENDENCIES.json"
BOUNDS_TAG = "polaris-dossier-record-bounds-v2.10"
BOUNDS_STATUS_PREFIX = f"[Record bounds amendment 2.10]({BOUNDS_HOME})"
BOUNDS_SUBJECTS = {
    BOUNDS_SPEC: "d4da7a60e65c92d01ac87ca25fa59b22b1adf886868023e33ace2c7e64f01afb",
}
BOUNDS_BOUND_PARTS = len(BOUNDS_SUBJECTS)
# The v2.11 spec-corrections amendment (syzygy-3efd.75): one MODIFIED
# REQ-polaris-generation-034 after v2.10, pending until its own VIS-4 ledger
# row, found by its tag as v2.10's is.
CORR_CHANGE = "dossier-spec-corrections"
CORR_HOME = f"{CHANGES}/{CORR_CHANGE}"
CORR_SPEC = f"{CORR_HOME}/proposed/polaris-generation/spec.md"
CORR_UNION = f"{CORR_HOME}/GOVERNING-DEPENDENCIES.json"
CORR_TAG = "polaris-dossier-spec-corrections-v2.11"
CORR_STATUS_PREFIX = f"[Spec corrections amendment 2.11]({CORR_HOME})"
CORR_SUBJECTS = {
    CORR_SPEC: "376f27c0261120d0238d0d4a6685fe08b19ff03a9d00fcb4a6702349f64834c3",
}
CORR_BOUND_PARTS = len(CORR_SUBJECTS)
# The v2.13 declared-source re-admission amendment (syzygy-3efd.69): one
# MODIFIED REQ-polaris-generation-046 after v2.6 (versions 2.7 to 2.12 replace
# REQ-034 alone), binding the screening-policy successor v3, pending until its
# own VIS-4 ledger row, found by its tag as v2.6's is.
READMIT_CHANGE = "dossier-declared-source-readmission"
READMIT_HOME = f"{CHANGES}/{READMIT_CHANGE}"
READMIT_SPEC = f"{READMIT_HOME}/proposed/polaris-generation/spec.md"
READMIT_UNION = f"{READMIT_HOME}/GOVERNING-DEPENDENCIES.json"
READMIT_POLICY = ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json"
READMIT_TAG = "polaris-dossier-declared-source-readmission-v2.13"
READMIT_STATUS_PREFIX = f"[Declared-source re-admission amendment 2.13]({READMIT_HOME})"
READMIT_SUBJECTS = {
    READMIT_SPEC: "494dcd81b3bb8d0638c5a517e9fa1005720cac8b39cba34751f5f6ee62eeb018",
    READMIT_POLICY: "1b9726884376922805fc8ebd973bdb4dc25ff54464264cdb995662806117a16e",
}
READMIT_BOUND_PARTS = len(READMIT_SUBJECTS)
# The v2.12 coverage-precheck amendment (syzygy-5dhm.28): one MODIFIED
# REQ-polaris-generation-034 after v2.11, pending until its own VIS-4 ledger
# row, found by its tag as v2.11's is.
COVERAGE_CHANGE = "dossier-coverage-precheck"
COVERAGE_HOME = f"{CHANGES}/{COVERAGE_CHANGE}"
COVERAGE_SPEC = f"{COVERAGE_HOME}/proposed/polaris-generation/spec.md"
COVERAGE_UNION = f"{COVERAGE_HOME}/GOVERNING-DEPENDENCIES.json"
COVERAGE_TAG = "polaris-dossier-coverage-precheck-v2.12"
COVERAGE_STATUS_PREFIX = f"[Coverage pre-check amendment 2.12]({COVERAGE_HOME})"
COVERAGE_SUBJECTS = {
    COVERAGE_SPEC: "995c2ec47619567a86a5899eacbe3b1cf96a652686af4bfa7cd51e0ea1841287",
}
COVERAGE_BOUND_PARTS = len(COVERAGE_SUBJECTS)
# The v2.14 infrastructure-recognizers amendment (syzygy-3efd.26, .76, .79): one
# MODIFIED REQ-polaris-generation-034 after v2.12, pending until its own VIS-4
# ledger row, found by its tag as v2.12's is.
INFRA_CHANGE = "dossier-infrastructure-recognizers"
INFRA_HOME = f"{CHANGES}/{INFRA_CHANGE}"
INFRA_SPEC = f"{INFRA_HOME}/proposed/polaris-generation/spec.md"
INFRA_UNION = f"{INFRA_HOME}/GOVERNING-DEPENDENCIES.json"
INFRA_TAG = "polaris-dossier-infrastructure-recognizers-v2.14"
INFRA_STATUS_PREFIX = f"[Infrastructure recognizers amendment 2.14]({INFRA_HOME})"
INFRA_SUBJECTS = {
    INFRA_SPEC: "1c87f9db33cee275bcc4f93516eed9b74d7345b3b3e8cb21a51303ad7deb42de",
}
INFRA_BOUND_PARTS = len(INFRA_SUBJECTS)
# The v2.15 index-and-task-routes amendment (syzygy-5dhm.70, syzygy-5dhm.71): one MODIFIED
# REQ-polaris-generation-034 after v2.14, pending until its own VIS-4 ledger
# row, found by its tag as v2.14's is. The implementation landed in the
# installing commit below as 2.14; the row names the later commit that
# renumbered and recomposed the text, and its revert also reverts the install.
FINDPAGES_CHANGE = "dossier-index-and-task-routes"
FINDPAGES_HOME = f"{CHANGES}/{FINDPAGES_CHANGE}"
FINDPAGES_SPEC = f"{FINDPAGES_HOME}/proposed/polaris-generation/spec.md"
FINDPAGES_UNION = f"{FINDPAGES_HOME}/GOVERNING-DEPENDENCIES.json"
FINDPAGES_TAG = "polaris-dossier-index-and-task-routes-v2.15"
FINDPAGES_STATUS_PREFIX = f"[Index and task routes amendment 2.15]({FINDPAGES_HOME})"
FINDPAGES_INSTALL = "c715ba5a14da4fb759326f6dc32c1bc470c6d810"
FINDPAGES_SUBJECTS = {
    FINDPAGES_SPEC: "16bf8ff1656501342aafba080db0fdee2c707a633d8d437c518929362ab2b985",
}
FINDPAGES_BOUND_PARTS = len(FINDPAGES_SUBJECTS)
# The v2.16 page-subsections amendment (syzygy-3efd.50, syzygy-3efd.81): one MODIFIED
# REQ-polaris-generation-034 after v2.15, pending until its own VIS-4 ledger
# row, found by its tag as v2.15's is.
SUBSEC_CHANGE = "dossier-page-subsections"
SUBSEC_HOME = f"{CHANGES}/{SUBSEC_CHANGE}"
SUBSEC_SPEC = f"{SUBSEC_HOME}/proposed/polaris-generation/spec.md"
SUBSEC_UNION = f"{SUBSEC_HOME}/GOVERNING-DEPENDENCIES.json"
SUBSEC_TAG = "polaris-dossier-page-subsections-v2.16"
SUBSEC_STATUS_PREFIX = f"[Page subsections amendment 2.16]({SUBSEC_HOME})"
SUBSEC_SUBJECTS = {
    SUBSEC_SPEC: "eb02516147a08c2b21a1ddeca4bc1527e9c7f21fb0bcf62bbee35f9b059fcdbc",
}
SUBSEC_BOUND_PARTS = len(SUBSEC_SUBJECTS)
# The v2.19 relation-types amendment (syzygy-3efd.28): one MODIFIED
# REQ-polaris-generation-034 after v2.16, pending until its own VIS-4 ledger
# row, found by its tag as v2.16's is.
RELTYPE_CHANGE = "dossier-relation-types"
RELTYPE_HOME = f"{CHANGES}/{RELTYPE_CHANGE}"
RELTYPE_SPEC = f"{RELTYPE_HOME}/proposed/polaris-generation/spec.md"
RELTYPE_UNION = f"{RELTYPE_HOME}/GOVERNING-DEPENDENCIES.json"
RELTYPE_TAG = "polaris-dossier-relation-types-v2.19"
RELTYPE_STATUS_PREFIX = f"[Relation types amendment 2.19]({RELTYPE_HOME})"
RELTYPE_SUBJECTS = {
    RELTYPE_SPEC: "f6d60b603bd7cc819aca86ae3d1a6de037ecb7717ca1fe214619f646c97afd9c",
}
RELTYPE_BOUND_PARTS = len(RELTYPE_SUBJECTS)
# The v2.20 hero-figure amendment (syzygy-3efd.29): one MODIFIED
# REQ-polaris-generation-034 after v2.19, pending until its own VIS-4 ledger
# row, found by its tag as v2.19's is.
HERO_CHANGE = "dossier-hero-figure"
HERO_HOME = f"{CHANGES}/{HERO_CHANGE}"
HERO_SPEC = f"{HERO_HOME}/proposed/polaris-generation/spec.md"
HERO_UNION = f"{HERO_HOME}/GOVERNING-DEPENDENCIES.json"
HERO_TAG = "polaris-dossier-hero-figure-v2.20"
HERO_STATUS_PREFIX = f"[Hero figure amendment 2.20]({HERO_HOME})"
HERO_SUBJECTS = {
    HERO_SPEC: "fcf271f84c03570cfbb8447d3370ae26c4ea75a54211b1677148b607e940d36b",
}
HERO_BOUND_PARTS = len(HERO_SUBJECTS)
# The v2.22 reader's edition amendment (syzygy-5dhm.136): one MODIFIED
# REQ-polaris-generation-034 after v2.20, pending until its own VIS-4 ledger
# row, found by its tag as v2.20's is. (v2.21, the verify text, moves
# only 033, so 034's effective predecessor is still v2.20.)
READERS_CHANGE = "dossier-readers-edition"
READERS_HOME = f"{CHANGES}/{READERS_CHANGE}"
READERS_SPEC = f"{READERS_HOME}/proposed/polaris-generation/spec.md"
READERS_UNION = f"{READERS_HOME}/GOVERNING-DEPENDENCIES.json"
READERS_TAG = "polaris-dossier-readers-edition-v2.22"
READERS_STATUS_PREFIX = f"[Reader's edition amendment 2.22]({READERS_HOME})"
READERS_SUBJECTS = {
    READERS_SPEC: "cfc6ce3caf18fcae7a1007e3763378e63c96108dc0d45fb8414007f1ff6c83c1",
}
READERS_BOUND_PARTS = len(READERS_SUBJECTS)
# The v2.23 containment-figure amendment (syzygy-3efd.31): one MODIFIED
# REQ-polaris-generation-034 after v2.22, pending until its own VIS-4 ledger
# row, found by its tag as v2.22's is.
CONT_CHANGE = "dossier-containment-figure"
CONT_HOME = f"{CHANGES}/{CONT_CHANGE}"
CONT_SPEC = f"{CONT_HOME}/proposed/polaris-generation/spec.md"
CONT_UNION = f"{CONT_HOME}/GOVERNING-DEPENDENCIES.json"
CONT_TAG = "polaris-dossier-containment-figure-v2.23"
CONT_STATUS_PREFIX = f"[Containment figure amendment 2.23]({CONT_HOME})"
CONT_SUBJECTS = {
    CONT_SPEC: "0f6ef5fb8ba2ef4577e2512f54c7e0e7683de7d5466def39fcb1b7b555d92f5d",
}
CONT_BOUND_PARTS = len(CONT_SUBJECTS)
# The v2.24 system-model amendment (syzygy-3efd.37; the label was a placeholder
# until adoption): one MODIFIED REQ-polaris-generation-034 after v2.23,
# pending until its own VIS-4 ledger row, found by its tag as v2.23's is.
MODEL_CHANGE = "dossier-system-model"
MODEL_HOME = f"{CHANGES}/{MODEL_CHANGE}"
MODEL_SPEC = f"{MODEL_HOME}/proposed/polaris-generation/spec.md"
MODEL_UNION = f"{MODEL_HOME}/GOVERNING-DEPENDENCIES.json"
MODEL_TAG = "polaris-dossier-system-model-v2.24"
MODEL_STATUS_PREFIX = f"[System model amendment 2.24]({MODEL_HOME})"
MODEL_SUBJECTS = {
    MODEL_SPEC: "f06e830deeef03f5d10f522481c8d25c141ff5ebce097c7411361d5bdc358c54",
}
MODEL_BOUND_PARTS = len(MODEL_SUBJECTS)
# The v2.26 worth-knowing amendment (syzygy-5dhm.41): one MODIFIED
# REQ-polaris-generation-034 after v2.24, pending until its own VIS-4 ledger
# row, found by its tag as v2.24's is.
WORTH_CHANGE = "dossier-worth-knowing"
WORTH_HOME = f"{CHANGES}/{WORTH_CHANGE}"
WORTH_SPEC = f"{WORTH_HOME}/proposed/polaris-generation/spec.md"
WORTH_UNION = f"{WORTH_HOME}/GOVERNING-DEPENDENCIES.json"
WORTH_TAG = "polaris-dossier-worth-knowing-v2.26"
WORTH_STATUS_PREFIX = f"[Worth-knowing amendment 2.26]({WORTH_HOME})"
WORTH_SUBJECTS = {
    WORTH_SPEC: "127e4a8f809211fbff47b118212f94e47d204ef6aaad75a0f357906b9a975928",
}
WORTH_BOUND_PARTS = len(WORTH_SUBJECTS)
# The first install of the v2.26 bytes, before review corrected them; the row's
# revert may name it after the installing commit, as v2.15's does.
WORTH_FIRST_INSTALL = "9c10e316e3973921254f63eaac29874c5d40f44b"

EDIT_ACCOUNT_CHANGE = "polaris-edit-repair-deletion-accounting"
EDIT_ACCOUNT_HOME = f"{CHANGES}/{EDIT_ACCOUNT_CHANGE}"
EDIT_ACCOUNT_SPEC = f"{EDIT_ACCOUNT_HOME}/proposed/polaris-generation/spec.md"
EDIT_ACCOUNT_TAG = "polaris-edit-repair-deletion-accounting-v2.25"
EDIT_ACCOUNT_STATUS_PREFIX = f"[Edit and repair accounting amendment 2.25]({EDIT_ACCOUNT_HOME})"
EDIT_ACCOUNT_SUBJECTS = {
    EDIT_ACCOUNT_SPEC: "1f0ba725aea6c0660e2da7ffbe653fd0921452d0a1c4a11dcc8792aae5e9fa74",
}
EDIT_ACCOUNT_REPLACES = (POLARIS_ID + "006",)

RAW_READ_CHANGE = "dossier-raw-read-disclosure"
RAW_READ_HOME = f"{CHANGES}/{RAW_READ_CHANGE}"
RAW_READ_SPEC = f"{RAW_READ_HOME}/proposed/polaris-generation/spec.md"
RAW_READ_UNION = f"{RAW_READ_HOME}/GOVERNING-DEPENDENCIES.json"
RAW_READ_TAG = "polaris-dossier-raw-read-disclosure-v2.17"
RAW_READ_ROUTE = f"[Raw-read disclosure amendment 2.17]({RAW_READ_HOME})"
RAW_READ_REPLACES = tuple(POLARIS_ID + number for number in ("033", "036", "046"))
RAW_READ_SUBJECTS = {
    RAW_READ_SPEC: "a53432d787d857185b76193aa614c47d42eca39b3f9c22857935b61127ff5517",
    ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v4.json":
        "d3abcb31c98bfd303c2bf477cc461787cacf26811cb640d925da1de347246da9",
}
# The v2.18 run-tree read-bounds amendment (syzygy-3efd.80): MODIFIED
# REQ-polaris-generation-033 after v2.17 and -035 and -048 after v2.1, pending
# until its own VIS-4 ledger row, found by its tag as v2.17's is.
TREEREAD_CHANGE = "dossier-run-tree-read-bounds"
TREEREAD_HOME = f"{CHANGES}/{TREEREAD_CHANGE}"
TREEREAD_SPEC = f"{TREEREAD_HOME}/proposed/polaris-generation/spec.md"
TREEREAD_UNION = f"{TREEREAD_HOME}/GOVERNING-DEPENDENCIES.json"
TREEREAD_TAG = "polaris-dossier-run-tree-read-bounds-v2.18"
TREEREAD_ROUTE = f"[Run-tree read bounds amendment 2.18]({TREEREAD_HOME})"
TREEREAD_REPLACES = tuple(POLARIS_ID + number for number in ("033", "035", "048"))
TREEREAD_SUBJECTS = {
    TREEREAD_SPEC: "84fc7c71221705b6a2b614e3acf4496d10bb2e3ba4815c1e776ad450b3bc19a5",
}
# The v2.21 verify-text amendment (syzygy-5dhm.23): one MODIFIED
# REQ-polaris-generation-033 (the `syzygy dossier verify` command) after its
# v2.18 run-tree read-bounds text, pending until its own VIS-4 ledger row.
VERIFY_CHANGE = "dossier-verify-text"
VERIFY_HOME = f"{CHANGES}/{VERIFY_CHANGE}"
VERIFY_SPEC = f"{VERIFY_HOME}/proposed/polaris-generation/spec.md"
VERIFY_UNION = f"{VERIFY_HOME}/GOVERNING-DEPENDENCIES.json"
VERIFY_TAG = "polaris-dossier-verify-text-v2.21"
VERIFY_STATUS_PREFIX = f"[Verify-text amendment 2.21]({VERIFY_HOME})"
VERIFY_REPLACES = (POLARIS_ID + "033",)
VERIFY_SUBJECTS = {
    VERIFY_SPEC: "a5453cb1a5c8813fbba513e0b232e6cfc483ceb7ee87061b7f7b67516f0d9cd7",
}
VERIFY_BOUND_PARTS = len(VERIFY_SUBJECTS)
# The v2.27 question-file amendment (syzygy-5dhm.21): one MODIFIED
# REQ-polaris-generation-033 (the run record names the question file) after
# its v2.21 verify-text text, pending until its own VIS-4 ledger row.
QFILE_CHANGE = "dossier-question-file"
QFILE_HOME = f"{CHANGES}/{QFILE_CHANGE}"
QFILE_SPEC = f"{QFILE_HOME}/proposed/polaris-generation/spec.md"
QFILE_UNION = f"{QFILE_HOME}/GOVERNING-DEPENDENCIES.json"
QFILE_TAG = "polaris-dossier-question-file-v2.27"
QFILE_STATUS_PREFIX = f"[Question-file amendment 2.27]({QFILE_HOME})"
QFILE_REPLACES = (POLARIS_ID + "033",)
QFILE_SUBJECTS = {
    QFILE_SPEC: "147954d8089b52e98deadf9710c061324c670f8ddfc4b7406fedbb9ab8c18b18",
}
QFILE_BOUND_PARTS = len(QFILE_SUBJECTS)
SCRIPTED_GRADE_CHANGE = "dossier-scripted-benchmark-grading"
SCRIPTED_GRADE_HOME = f"{CHANGES}/{SCRIPTED_GRADE_CHANGE}"
SCRIPTED_GRADE_SPEC = f"{SCRIPTED_GRADE_HOME}/proposed/polaris-generation/spec.md"
SCRIPTED_GRADE_UNION = f"{SCRIPTED_GRADE_HOME}/GOVERNING-DEPENDENCIES.json"
SCRIPTED_GRADE_TAG = "polaris-dossier-scripted-benchmark-grading-v2.30"
SCRIPTED_GRADE_STATUS_PREFIX = f"[Scripted benchmark grading amendment 2.30]({SCRIPTED_GRADE_HOME})"
SCRIPTED_GRADE_REPLACES = (POLARIS_ID + "033",)
SCRIPTED_GRADE_SUBJECTS = {
    SCRIPTED_GRADE_SPEC: "de530007005b65c3f7400d42dabfa2caf50e8b2cc6b00fe2044a31d61ce3ab49",
}
SCRIPTED_GRADE_BOUND_PARTS = len(SCRIPTED_GRADE_SUBJECTS)
STEP_MEASURES_CHANGE = "dossier-step-measures"
STEP_MEASURES_HOME = f"{CHANGES}/{STEP_MEASURES_CHANGE}"
STEP_MEASURES_SPEC = f"{STEP_MEASURES_HOME}/proposed/polaris-generation/spec.md"
STEP_MEASURES_UNION = f"{STEP_MEASURES_HOME}/GOVERNING-DEPENDENCIES.json"
STEP_MEASURES_TAG = "polaris-dossier-step-measures-v2.31"
STEP_MEASURES_STATUS_PREFIX = f"[Dossier close measures amendment 2.31]({STEP_MEASURES_HOME})"
STEP_MEASURES_REPLACES = (POLARIS_ID + "033",)
STEP_MEASURES_SUBJECTS = {
    STEP_MEASURES_SPEC: "f7ff5706c26b937d991e24183d5dcb29091fefe580b066ccbfc32540fde7ea05",
}
STEP_MEASURES_BOUND_PARTS = len(STEP_MEASURES_SUBJECTS)
# The v2.28 coverage-hold amendment (syzygy-5dhm.29): one MODIFIED
# REQ-polaris-generation-035 (the fidelity review waits until every listed
# inventory entry has an outcome) after its v2.18 run-tree read-bounds text,
# pending until its own VIS-4 ledger row.
COVHOLD_CHANGE = "dossier-coverage-hold"
COVHOLD_HOME = f"{CHANGES}/{COVHOLD_CHANGE}"
COVHOLD_SPEC = f"{COVHOLD_HOME}/proposed/polaris-generation/spec.md"
COVHOLD_UNION = f"{COVHOLD_HOME}/GOVERNING-DEPENDENCIES.json"
COVHOLD_TAG = "polaris-dossier-coverage-hold-v2.28"
COVHOLD_STATUS_PREFIX = f"[Coverage-hold amendment 2.28]({COVHOLD_HOME})"
COVHOLD_REPLACES = (POLARIS_ID + "035",)
COVHOLD_SUBJECTS = {
    COVHOLD_SPEC: "aa65f8050d9fc2ea1b2757241403291d97ac18f3a9ec65ca45dabbcc5addd24d",
}
COVHOLD_BOUND_PARTS = len(COVHOLD_SUBJECTS)

TERM_BRIEF_CHANGE = "dossier-brief-terminology"
TERM_BRIEF_HOME = f"{CHANGES}/{TERM_BRIEF_CHANGE}"
TERM_BRIEF_SPEC = f"{TERM_BRIEF_HOME}/proposed/polaris-generation/spec.md"
TERM_BRIEF_UNION = f"{TERM_BRIEF_HOME}/GOVERNING-DEPENDENCIES.json"
TERM_BRIEF_TAG = "polaris-dossier-brief-terminology-v2.29"
TERM_BRIEF_STATUS_PREFIX = f"[Terminology-brief amendment]({TERM_BRIEF_HOME})"
TERM_BRIEF_REPLACES = (POLARIS_ID + "034",)
TERM_BRIEF_SUBJECTS = {
    TERM_BRIEF_SPEC: "64944deafb9ae449323a0b0308929bd0d5fa071f8f4e048a06c4157bfa5aa60c",
}
# The v2.32 question-kind floor (syzygy-5dhm.135): one MODIFIED REQ-polaris-generation-034 after
# the v2.29 terminology brief, adopted by an agent row and its version tag.
QKIND_CHANGE = "dossier-question-kind-floor"
QKIND_HOME = f"{CHANGES}/{QKIND_CHANGE}"
QKIND_SPEC = f"{QKIND_HOME}/proposed/polaris-generation/spec.md"
QKIND_UNION = f"{QKIND_HOME}/GOVERNING-DEPENDENCIES.json"
QKIND_TAG = "polaris-dossier-question-kind-floor-v2.32"
QKIND_STATUS_PREFIX = f"[Question-kind floor amendment 2.32]({QKIND_HOME})"
QKIND_REPLACES = (POLARIS_ID + "034",)
QKIND_SUBJECTS = {
    QKIND_SPEC: "4439371414c716ba52493066bfe9908029c8378e06594454cf8e343939590b32",
}
QKIND_BOUND_PARTS = len(QKIND_SUBJECTS)

# The v2.33 figure plan (syzygy-3efd.40): one MODIFIED REQ-polaris-generation-034
# after the v2.32 question-kind floor, pending until its own VIS-4 ledger row.
FIGPLAN_CHANGE = "dossier-figure-plan"
FIGPLAN_HOME = f"{CHANGES}/{FIGPLAN_CHANGE}"
FIGPLAN_SPEC = f"{FIGPLAN_HOME}/proposed/polaris-generation/spec.md"
FIGPLAN_UNION = f"{FIGPLAN_HOME}/GOVERNING-DEPENDENCIES.json"
FIGPLAN_TAG = "polaris-dossier-figure-plan-v2.33"
FIGPLAN_STATUS_PREFIX = f"[Figure plan amendment 2.33]({FIGPLAN_HOME})"
FIGPLAN_REPLACES = (POLARIS_ID + "034",)
FIGPLAN_SUBJECTS = {
    FIGPLAN_SPEC: "8ae85a0b259825a13d5628b939cebf46e002fb72a671117f8685fc7c44016a3c",
}
FIGPLAN_BOUND_PARTS = len(FIGPLAN_SUBJECTS)

# The v2.34 derived-base views (syzygy-3efd.38): one MODIFIED REQ-polaris-generation-034
# after the v2.33 figure plan, pending until its own VIS-4 ledger row.
VBASE_CHANGE = "dossier-derived-base-views"
VBASE_HOME = f"{CHANGES}/{VBASE_CHANGE}"
VBASE_SPEC = f"{VBASE_HOME}/proposed/polaris-generation/spec.md"
VBASE_UNION = f"{VBASE_HOME}/GOVERNING-DEPENDENCIES.json"
VBASE_TAG = "polaris-dossier-derived-base-views-v2.34"
VBASE_STATUS_PREFIX = f"[Derived-base views amendment 2.34]({VBASE_HOME})"
VBASE_REPLACES = (POLARIS_ID + "034",)
VBASE_SUBJECTS = {
    VBASE_SPEC: "a404fa70e788f7ca20761f5a30f1d840604706cb811fcf50664f3e2942592c45",
}
VBASE_BOUND_PARTS = len(VBASE_SUBJECTS)

# Corrected derived bases replace the historical, untagged v2.34 claim.
VBASE_SCREENING_CHANGE = "dossier-derived-base-screening"
VBASE_SCREENING_HOME = f"{CHANGES}/{VBASE_SCREENING_CHANGE}"
VBASE_SCREENING_SPEC = f"{VBASE_SCREENING_HOME}/proposed/polaris-generation/spec.md"
VBASE_SCREENING_UNION = f"{VBASE_SCREENING_HOME}/GOVERNING-DEPENDENCIES.json"
VBASE_SCREENING_REPLACES = VBASE_REPLACES
VBASE_SCREENING_PROJECTION = f"{VBASE_SCREENING_HOME}/POLARIS-CENSUS-PROJECTION.json"
VBASE_SCREENING_VERSION = "2.35"
VBASE_SCREENING_TAG = f"polaris-dossier-derived-base-screening-v{VBASE_SCREENING_VERSION}"
VBASE_SCREENING_STATUS_PREFIX = f"[Derived-base screening {VBASE_SCREENING_VERSION}]("
VBASE_PHASE_PREFIXES = (
    "Before the derived-base screening version is effective,",
    "With the derived-base screening version effective,",
)
VBASE_SCREENING_PREDECESSOR = "1c35aed0961b709ffd33c49eb9586bb66c8b8121"
VBASE_SCREENING_HISTORICAL_SOURCE = "e9eaf3e4601e997996186a57670defc62fd65591"
VBASE_SCREENING_RETIREMENT_SUBJECTS = {
    "PROJECT-STATUS.md": "c8e60c56820ce05d383e659bae5a1a16ac510e504bbbd9274c063126b8bbe829",
    "docs/evidence/spec-readability-reconciliation-2026-10-02/census.json": "0e6773a58477242d09050bae3b48bada4feed03dae05764736a087a50a3251f8",
    "openspec/README.md": "a88cd64f2d327b636f27b33a2620b067a835675400a66334d21cf4f8409a9a7c",
    "openspec/changes/dossier-derived-base-views/README.md": "20b2a3b4529f31e98617f9ebae0d985d543e9b5a1d0366928909cc80832c423e",
    "openspec/changes/dossier-derived-base-views/tasks.md": "59cb16d0b2369264c3d76d3b59d207fb547df8324c41c9854a6969e507be80da",
}
VBASE_SCREENING_SUBJECTS = {
    VBASE_SCREENING_SPEC: "a784c6712ce31a9b72136be27d49a535465a8637a2493d2ef1305a28fcdbc698",
    VBASE_SCREENING_UNION: "3f6c2b317bf01c0d940f7ee7b41ce73ddb2b0cfd5aa4efe2afbfb26c4ae3efef",
}
ADOPTION_LEDGER_TITLE = "# Agent adoptions"
ADOPTION_TABLE_HEADER = "| Id | Date | Commit | What changed | Why | Revert | Tag |"
ADOPTION_TABLE_DIVIDER = "|---|---|---|---|---|---|---|"
ADOPTION_FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
ADOPTION_HTML = re.compile(r"<!--|^ {0,3}<[!/?A-Za-z]")
DISPOSITION_PREFIX = re.compile(
    r"^(?:(?:the )?owner )?(?:veto(?:ed|es)?|revert(?:ed|s)?|retir(?:e[ds]?|ement))"
    r"(?: of)?\s+(?:(?:the )?(?:agent )?adoption\s+)?", re.I)
DISPOSITION_LINK = re.compile(r"^\[[^\]]+\]\(([^)]+)\)")
DISPOSITION_PATH = re.compile(r"^https://github\.com/tzeusy-org/syzygy/blob/([0-9a-f]{40})/(.+)$")


def valid_adoption_date(value):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        iso_date.fromisoformat(value)
        return True
    except ValueError:
        return False


def adoption_table_rows(root):
    """Read only the unique canonical ledger table outside Markdown fences."""
    return _adoption_table_rows(read_text(root, AGENT_ADOPTIONS) or "")


def _adoption_table_rows(text):
    title, *lines = text.split("\n")
    if title != ADOPTION_LEDGER_TITLE:
        return []
    rows = None
    in_table = after_header = False
    fence = None
    for line in lines:
        marker = ADOPTION_FENCE.fullmatch(line)
        if fence:
            if (marker and marker[1].startswith(fence) and not marker[2].strip()):
                fence = None
            continue
        if marker and (marker[1][0] == "~" or "`" not in marker[2]):
            fence = marker[1]
            in_table = after_header = False
            continue
        if ADOPTION_HTML.search(line):
            # The ledger format has no raw HTML. Rows after markup cannot
            # establish another canonical table, including inside a block.
            break
        if after_header and line == ADOPTION_TABLE_DIVIDER:
            if rows is not None:
                return []
            rows = []
            in_table = True
        elif line == ADOPTION_TABLE_HEADER:
            in_table = False
        elif in_table and line.startswith("|"):
            rows.append(line)
        else:
            in_table = False
        after_header = line == ADOPTION_TABLE_HEADER
    return rows or []


def is_url_source_row(line):
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{URL_SOURCE_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    # A row claiming all reviewed snapshots at its own commit is still a
    # malformed adoption if its Tag cell is wrong. A citation is not a claim.
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in URL_SOURCE_SUBJECTS)


def recorded_disposition(root, identity, commit, tag, paths, plain_revert=False, also_reverts=None,
                         *, ledger_rows=None):
    """Read an explicit later veto/revert/retirement in the ledger's change cell.

    The ledger uses prose. Recognize an action with an exact immediate
    subject, without interpreting mentions of earlier decisions as actions
    or claiming Git provenance from the projection.
    """
    if not re.fullmatch(r"A-[1-9][0-9]*", identity) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        return None
    subjects = {identity, commit, tag, *paths}
    reverts = (f"`git revert -m 1 {commit}`",) + ((f"`git revert {commit}`",) if plain_revert else ())
    if plain_revert and also_reverts:
        reverts += (f"`git revert {commit} {also_reverts}`",)
    adopted_date = None
    for line in adoption_table_rows(root) if ledger_rows is None else ledger_rows:
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if len(cells) != 7:
            continue
        row_id, date, oid, changed, why, revert, row_tag = cells
        if row_id == identity and oid == f"`{commit}`" and row_tag == f"`{tag}`":
            prefix = f"https://github.com/tzeusy-org/syzygy/blob/{commit}/"
            if (adopted_date is not None or not valid_adoption_date(date) or not why
                    or not revert.startswith(reverts)
                    or not all(f"]({prefix}{path})" in changed for path in paths)):
                return None
            adopted_date = date
            continue
        action = DISPOSITION_PREFIX.match(changed)
        if (adopted_date is None or not action or not re.fullmatch(r"A-[1-9][0-9]*", row_id)
                or int(row_id[2:]) <= int(identity[2:]) or not valid_adoption_date(date) or date < adopted_date
                or not re.fullmatch(r"`[0-9a-f]{7,40}`", oid)
                or not why):
            continue
        row_commit = oid[1:-1]
        if commit.startswith(row_commit) or revert not in (f"`git revert {row_commit}`", f"`git revert -m 1 {row_commit}`"):
            continue
        target = changed[action.end():].lstrip("(")
        link = DISPOSITION_LINK.match(target)
        if link:
            snapshot = DISPOSITION_PATH.fullmatch(link.group(1))
            if snapshot and snapshot.group(1) == commit and snapshot.group(2) in paths:
                return row_id
            continue
        else:
            token = target.split(maxsplit=1)[0].rstrip(".,;:!?)]").strip("`") if target else ""
        if token in subjects:
            return row_id
    return None


def url_inactive_text(disposition, predecessor):
    state = f"inactive under recorded disposition {disposition}" if disposition else "Unknown"
    return f"URL dossier 2.1 is {state}. Effective predecessor {predecessor}."


def declared_source_disposition(root):
    return recorded_disposition(root, DECLARED_SOURCE_ROW, DECLARED_SOURCE_COMMIT,
                                DECLARED_SOURCE_TAG, DECLARED_SOURCE_SUBJECTS)


def url_source_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root)
            if is_url_source_row(line)]


def url_source_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"),
                                    URL_SOURCE_TAG, URL_SOURCE_SUBJECTS)
    return None


def is_figure_row(line):
    """A ledger row claiming the v2.2 figure amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{FIGURE_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in FIGURE_SUBJECTS)


def figure_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_figure_row(line)]


def figure_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), FIGURE_TAG,
                                    FIGURE_SUBJECTS, plain_revert=True)
    return None


def is_derived_row(line):
    """A ledger row claiming the v2.3 derived-observed amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{DERIVED_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in DERIVED_SUBJECTS)


def derived_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_derived_row(line)]


def derived_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), DERIVED_TAG,
                                    DERIVED_SUBJECTS, plain_revert=True)
    return None


def is_ledger_row(line):
    """A ledger row claiming the v2.4 ledger-packs-thesis amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{LEDGER_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in LEDGER_SUBJECTS)


def ledger_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_ledger_row(line)]


def ledger_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), LEDGER_TAG,
                                    LEDGER_SUBJECTS, plain_revert=True)
    return None


def is_kinds_row(line):
    """A ledger row claiming the v2.5 figure-kinds amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{KINDS_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in KINDS_SUBJECTS)


def kinds_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_kinds_row(line)]


def kinds_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), KINDS_TAG,
                                    KINDS_SUBJECTS, plain_revert=True)
    return None


def is_reach_row(line):
    """A ledger row claiming the v2.6 declared-source reach amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{REACH_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in REACH_SUBJECTS)


def reach_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_reach_row(line)]


def reach_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), REACH_TAG,
                                    REACH_SUBJECTS, plain_revert=True)
    return None


def is_manifests_row(line):
    """A ledger row claiming the v2.7 manifest-recognizers amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{MANIFESTS_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in MANIFESTS_SUBJECTS)


def manifests_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_manifests_row(line)]


def manifests_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), MANIFESTS_TAG,
                                    MANIFESTS_SUBJECTS, plain_revert=True)
    return None


def is_repairs_row(line):
    """A ledger row claiming the v2.8 spec-repairs amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{REPAIRS_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in REPAIRS_SUBJECTS)


def repairs_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_repairs_row(line)]


def repairs_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), REPAIRS_TAG,
                                    REPAIRS_SUBJECTS, plain_revert=True)
    return None


def is_maps_row(line):
    """A ledger row claiming the v2.9 computed-maps amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{MAPS_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in MAPS_SUBJECTS)


def maps_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_maps_row(line)]


def maps_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), MAPS_TAG,
                                    MAPS_SUBJECTS, plain_revert=True)
    return None


def is_bounds_row(line):
    """A ledger row claiming the v2.10 record-bounds amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{BOUNDS_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in BOUNDS_SUBJECTS)


def bounds_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_bounds_row(line)]


def bounds_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), BOUNDS_TAG,
                                    BOUNDS_SUBJECTS, plain_revert=True)
    return None


def is_corr_row(line):
    """A ledger row claiming the v2.11 spec-corrections amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{CORR_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in CORR_SUBJECTS)


def corr_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_corr_row(line)]


def corr_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), CORR_TAG,
                                    CORR_SUBJECTS, plain_revert=True)
    return None


def is_readmit_row(line):
    """A ledger row claiming the v2.13 declared-source re-admission amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{READMIT_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in READMIT_SUBJECTS)


def readmit_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_readmit_row(line)]


def readmit_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), READMIT_TAG,
                                    READMIT_SUBJECTS, plain_revert=True)
    return None


def is_coverage_row(line):
    """A ledger row claiming the v2.12 coverage-precheck amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{COVERAGE_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in COVERAGE_SUBJECTS)


def coverage_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_coverage_row(line)]


def coverage_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), COVERAGE_TAG,
                                    COVERAGE_SUBJECTS, plain_revert=True)
    return None


def is_infra_row(line):
    """A ledger row claiming the v2.14 infrastructure-recognizers amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{INFRA_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in INFRA_SUBJECTS)


def infra_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_infra_row(line)]


def infra_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), INFRA_TAG,
                                    INFRA_SUBJECTS, plain_revert=True)
    return None


def is_findpages_row(line):
    """A ledger row claiming the v2.15 index-and-task-routes amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{FINDPAGES_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in FINDPAGES_SUBJECTS)


def findpages_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_findpages_row(line)]


def findpages_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), FINDPAGES_TAG,
                                    FINDPAGES_SUBJECTS, plain_revert=True,
                                    also_reverts=FINDPAGES_INSTALL)
    return None


def is_subsec_row(line):
    """A ledger row claiming the v2.16 page-subsections amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{SUBSEC_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in SUBSEC_SUBJECTS)


def subsec_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_subsec_row(line)]


def subsec_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), SUBSEC_TAG,
                                    SUBSEC_SUBJECTS, plain_revert=True)
    return None

def is_reltype_row(line):
    """A ledger row claiming the v2.19 relation-types amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{RELTYPE_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in RELTYPE_SUBJECTS)


def reltype_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_reltype_row(line)]


def reltype_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), RELTYPE_TAG,
                                    RELTYPE_SUBJECTS, plain_revert=True)
    return None

def is_hero_row(line):
    """A ledger row claiming the v2.20 hero-figure amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{HERO_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in HERO_SUBJECTS)


def hero_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_hero_row(line)]


def hero_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), HERO_TAG,
                                    HERO_SUBJECTS, plain_revert=True)
    return None


def is_readers_row(line):
    """A ledger row claiming the v2.22 readers-edition amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{READERS_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in READERS_SUBJECTS)


def readers_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_readers_row(line)]


def readers_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), READERS_TAG,
                                    READERS_SUBJECTS, plain_revert=True)
    return None

def is_cont_row(line):
    """A ledger row claiming the v2.23 containment-figure amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{CONT_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in CONT_SUBJECTS)


def cont_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_cont_row(line)]


def cont_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), CONT_TAG,
                                    CONT_SUBJECTS, plain_revert=True)
    return None

def is_model_row(line):
    """A ledger row claiming the v2.24 system-model amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{MODEL_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in MODEL_SUBJECTS)


def model_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_model_row(line)]


def model_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), MODEL_TAG,
                                    MODEL_SUBJECTS, plain_revert=True)
    return None

def is_worth_row(line):
    """A ledger row claiming the v2.26 worth-knowing amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{WORTH_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in WORTH_SUBJECTS)


def worth_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_worth_row(line)]


def worth_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), WORTH_TAG,
                                    WORTH_SUBJECTS, plain_revert=True,
                                    also_reverts=WORTH_FIRST_INSTALL)
    return None

def is_edit_account_row(line):
    """Recognize an adoption claim by its tag or its own subject snapshot."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{EDIT_ACCOUNT_TAG}`"
    if (len(cells) == 7 and cells[6] == tag) or (len(cells) != 7 and tag in cells):
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return f"]({snapshot}{EDIT_ACCOUNT_SPEC})" in cells[3]


def edit_account_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_edit_account_row(line)]


def edit_account_identity_unique(root, identity):
    return sum(line.split("|", 2)[1].strip() == identity
               for line in adoption_table_rows(root)) == 1


def edit_account_index_adopted(cells):
    if len(cells) != 4:
        return False
    return bool(re.match(r"Agent-adopted(?:[.\s]|$)", cells[2].replace("**", "")))


def edit_account_disposition(root, rows):
    if len(rows) != 1 or len(rows[0]) != 7:
        return None
    identity, _date, commit, _changed, _reason, _revert, _tag = rows[0]
    if not edit_account_identity_unique(root, identity):
        return None
    return recorded_disposition(root, identity, commit.strip("`"), EDIT_ACCOUNT_TAG,
                                EDIT_ACCOUNT_SUBJECTS, plain_revert=True)


def polaris_additions(root):
    """Signed-addition candidates: [(change, spec path)], by change name.

    Every change other than the base and the overlay whose Polaris requirements
    sit installed at `specs/polaris-generation/spec.md` (a version-tagged
    sign-off's builder moves them there from `proposed/`). Read from the tree,
    not the index, so `--regenerate` sees the move before it is committed.
    """
    base = root / CHANGES
    found = sorted(p.parent.parent.parent.name for p in
                   base.glob(POLARIS_ADDITION_GLOB)) if base.is_dir() else []
    return [(c, spec_path(c, "polaris-generation")) for c in found
            if c not in (BASE_CHANGE, UNDERSTANDING_CHANGE)]


#: Polaris additions whose terminal outcome is a dedicated adoption record
#: rather than a version-tagged sign-off: change -> (record, recorder module).
#: The recorder's `SUBJECT_SHA` is the digest the confirming review read; the
#: installed `spec.md` must hash to it (R2). Declared here, never inferred.
ADOPTED_ADDITIONS = {
    "polaris-non-governed-narrative-profile": (
        f"{DECISIONS}/POLARIS-NON-GOVERNED-NARRATIVE-PROFILE-ADOPTION.md",
        "record_narrative_profile_adoption"),
}


def adopted_binding(module):
    """(digest, confirming raw) an adoption recorder binds, from the module.

    The digest is the recorder's `SUBJECT_SHA`; R2 also requires the raw's
    own head to carry it, so the constant cannot move without the review.
    """
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import importlib
    mod = importlib.import_module(module)
    return mod.SUBJECT_SHA, mod.REVIEW_REL.as_posix()


SUBJECT_LINE = re.compile(r"^Subject SHA-256: ([0-9a-f]{64})\s*$")
RECORDED_LINE = re.compile(r"^Recorded at \(UTC\): \S+$", re.M)


def addition_terminals(root, change):
    """[(record path, text, version or None)] terminating `change`.

    An addition declared in `ADOPTED_ADDITIONS` has its adoption record (with
    no version); any other addition has its versioned sign-off records.
    """
    if change in ADOPTED_ADDITIONS:
        rel = ADOPTED_ADDITIONS[change][0]
        text = read_text(root, rel)
        return [] if text is None else [(rel, text, None)]
    return addition_records(root, change)


class SignoffEntriesRefused(OSError):
    """A `SIGNOFF_RECORD_GLOB` entry cannot be read as UTF-8 text.

    The CLI raises it naming every such entry, so no predicate over the
    population is evaluated: every mode refuses with the entries named and
    exits 1. Never read as absent (syzygy-j5dg).

    An in-process caller (`run`, `census`, `check_outcomes`, ...) never sees
    it for an entry whose read raised: there the original `OSError` or
    `UnicodeDecodeError` propagates unchanged, as before syzygy-j5dg, since
    a consumer may admit exactly that error by class and `.filename`
    (`prepare_three_surface_poc_governedby_reference_recording.py`'s
    family selftest does). A FIFO is read as before, never refused by kind.
    """

    def __init__(self, findings, filename=None):
        super().__init__("\n".join(findings))
        self.findings = findings
        self.filename = filename


#: True only while `main` runs a mode: `signoff_texts` then names every
#: unreadable entry in one `SignoffEntriesRefused`; otherwise it raises the
#: first entry's own read error, exactly as before syzygy-j5dg.
_COLLECT_REFUSALS = False


def entry_kind(path):
    """What a non-file glob entry is, by `lstat` and then `stat`."""
    try:
        mode = path.lstat().st_mode
    except OSError as exc:
        return f"entry that cannot be examined ({exc.strerror})"
    prefix = ""
    if stat.S_ISLNK(mode):
        prefix = "symlink to "
        try:
            mode = path.stat().st_mode
        except OSError as exc:
            return ("symlink loop" if exc.errno == errno.ELOOP
                    else f"dangling symlink ({exc.strerror})")
    for test, name in ((stat.S_ISDIR, "directory"), (stat.S_ISFIFO, "FIFO"),
                       (stat.S_ISSOCK, "socket"),
                       (stat.S_ISCHR, "character device"),
                       (stat.S_ISBLK, "block device"),
                       (stat.S_ISREG, "regular file")):
        if test(mode):
            return prefix + name
    return prefix + "nonregular entry"


def _is_regular(path):
    """Whether `path` (symlinks followed) is a regular file; `stat` never
    opens it. An entry `stat` cannot examine is not regular."""
    try:
        return stat.S_ISREG(path.stat().st_mode)
    except OSError:
        return False


def signoff_texts(root, collect=None):
    """[(path, text)] of every `SIGNOFF_RECORD_GLOB` entry, or refuse.

    Each entry is read exactly as before syzygy-j5dg, by
    `path.read_text(encoding="utf-8")` (universal newlines, symlinks
    followed), so every entry that read then reads the same now: a symlink
    to a regular file or to `/dev/null` is read through, and a CRLF record
    is read with its newlines translated. Whether such links should be
    refused is the owner's question (syzygy-vgzf). Only a read that raised
    becomes a named refusal. A FIFO (by `stat`, symlinks followed) is
    opened and read as before: with a writer that supplies a finite stream
    it reads, and with none it blocks, as on main (owner answer
    `pr714-fifo-refusal` B keeps the first; the second is unchanged and is
    the owner's question).

    `collect` (default: `_COLLECT_REFUSALS`, true only under `main`) names
    every refused entry, then raises one `SignoffEntriesRefused`. Main
    stopped at the first read error, so once an entry is refused no later
    entry that is not a regular file (by `stat`, symlinks followed) is
    opened: main never reached it, and opening a FIFO or a device could
    block or exhaust memory where main crashed (round 4 F7). It is named,
    with its kind, as not opened. A later regular file is still read, so
    its own read error is named too. Before the first refusal nothing
    changes. Otherwise the entries are
    read in the same sorted order as before and the first read error
    propagates unchanged, so an in-process consumer sees the class, message
    and `.filename` it saw then.
    """
    collect = _COLLECT_REFUSALS if collect is None else collect
    base = root / DECISIONS
    out, refused = [], []  # refused: [(path, finding)]
    for path in sorted(base.glob(SIGNOFF_RECORD_GLOB)) if base.is_dir() else ():
        rel = path.relative_to(root).as_posix()
        if refused and not _is_regular(path):
            refused.append((path, f"`{rel}`: {entry_kind(path)}, not opened "
                            "because an earlier entry is refused"))
            continue
        if not collect:
            # Exactly the read before syzygy-j5dg; its error propagates.
            out.append((path, path.read_text(encoding="utf-8")))
            continue
        try:
            out.append((path, path.read_text(encoding="utf-8")))
        except OSError as exc:
            refused.append((path, f"`{rel}`: " + (
                f"unreadable regular file ({exc.strerror})" if path.is_file()
                else entry_kind(path))))
        except UnicodeDecodeError:
            refused.append((path, f"`{rel}`: regular file that is not UTF-8"))
    if refused:
        raise SignoffEntriesRefused([f for _p, f in refused],
                                    filename=str(refused[0][0]))
    return out


def refusal_lines(exc):
    """The structured refusal every mode prints for `SignoffEntriesRefused`."""
    return ([f"REFUSED R1  sign-off record population — {len(exc.findings)} "
             f"`{DECISIONS}/{SIGNOFF_RECORD_GLOB}` entries cannot be read as "
             "UTF-8 text; no predicate was evaluated"]
            + [f"        {f}" for f in exc.findings]
            + ["REFUSED — the sign-off record population is unreadable"])


def addition_records(root, change):
    """[(record path, text, version)] of each versioned sign-off of `change`."""
    out = []
    for path, text in signoff_texts(root):
        if f"Package: {change}" in text.splitlines():
            versions = VERSION_LINE.findall(text)
            out.append((path.relative_to(root).as_posix(), text,
                        versions[0] if len(versions) == 1 else None))
    return out

#: Hard-coded literal census (requirement suffix -> scenario count), taken at
#: main bd47409 on 2026-10-02 and cross-checked by the OpenSpec 1.9.0 CLI in
#: the record; PWB re-derived 2026-10-03 after the tree-framing sign-off
#: (PWB-REQ-014: 1 -> 8 scenarios). Never derived from the parsers below.
EXPECTED = {
    "CAP1": dict(zip(
        "001 002 003 004 005 006 010 011 012 013 014 015 016 020 021 022 023 "
        "030 031 032 033 034 035 036 037 038 040 041 042 043 044 045 046 050 "
        "051 052 053 060 061 062 063 064".split(),
        (1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1,
         1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1))),
    # POC re-derived 2026-10-15 after the P-108 sign-off: POC-REQ-055 added
    # (1 scenario), POC-REQ-060 amended (1 -> 2 scenarios).
    "POC": {**dict.fromkeys(
        "001 002 003 004 010 011 012 013 020 021 022 030 031 032 040 041 042 "
        "043 050 051 052 053 055 061".split(), 1), "014": 2, "060": 2},
    "PWB": dict(zip(
        "001 002 003 004 005 006 007 010 011 012 013 014 015 016 020 021 "
        "022".split(),
        (1, 10, 1, 3, 5, 3, 5, 7, 5, 1, 1, 9, 1, 3, 1, 2, 5))),
    "POLARIS": None,  # totals only below; per-requirement counts in census.json
}
# CAP1 re-derived 2026-11-04 (syzygy-5oqc): the census composes the adopted
# consent overlay, whose CAP1-REQ-011 carries 8 scenarios and CAP1-REQ-046
# 4 (each 1 in the bound file alone, 42 / 47). Literals, never parsed.
EXPECTED["CAP1"] = {**EXPECTED["CAP1"], "011": 8, "046": 4}
EXPECTED_TOTALS = {"CAP1": (42, 57), "POC": (26, 28), "PWB": (17, 63),
                   "POLARIS": (31, 182)}

ROW = re.compile(r"^([0-9a-f]{64})  (\S[^\n]*)$", re.M)
ACT_TABLE_ROW = re.compile(
    r"^\| `([^`]+)` \| `([0-9a-f]{64})` \| `([0-9a-f]{64})` \|$", re.M)
DEPS_SOURCE = re.compile(
    r"Source: `spec\.md` sha256 `([0-9a-f]{64})` — (\d+) requirement\(s\)")
ID_MENTION = re.compile(
    r"\b(?:(CAP1|POC|PWB)-REQ-|REQ-polaris-generation-)(\d{3})"
    r"((?:[ \t]*(?:/|,|–|\.\.|…|and)[ \t]*\d{3}\b)*)")
STATUS_FIGURE = re.compile(
    r"(\d+) requirements and (\d+) scenarios in the effective composition")
VBASE_STATUS_PRETAG = re.compile(
    r"Before the derived-base screening version is effective, Polaris has (\d+) requirements and (\d+) scenarios\.")
VBASE_STATUS_ACTIVE = re.compile(
    r"With the derived-base screening version effective, Polaris has (\d+) requirements and (\d+) scenarios\.")


class Report:
    def __init__(self):
        self.lines = []
        self.failed = set()
        self.findings = {}

    def add(self, rid, title, examined, findings, note=""):
        word = "FAIL" if findings else "OK"
        self.findings[rid] = list(findings)
        if findings:
            self.failed.add(rid)
        tail = f" — {note}" if note else ""
        self.lines.append(
            f"{word:5} {rid}  {title} — {examined} examined, "
            f"{len(findings)} findings{tail}")
        self.lines.extend(f"        {f}" for f in findings)

    def warn(self, rid, title, examined, findings, note=""):
        tail = f" — {note}" if note else ""
        word = "WARN" if findings else "OK"
        self.findings[rid] = list(findings)
        self.lines.append(
            f"{word:5} {rid}  {title} — {examined} examined, "
            f"{len(findings)} findings{tail}")
        self.lines.extend(f"        {f}" for f in findings)


def sha(data):
    return hashlib.sha256(data).hexdigest()


#: (directory, {path: bytes}) while R2 re-checks the POC child over its
#: subjects as D10 found them (`poc_outcome`); None otherwise.
_FILES_OVERRIDE = None


def read_bytes(root, rel):
    if _FILES_OVERRIDE is not None:
        directory, files = _FILES_OVERRIDE
        key = Path(rel).as_posix()
        if key.startswith(directory + "/"):
            return files.get(key)
    path = root / rel
    return path.read_bytes() if path.is_file() else None


def read_text(root, rel):
    data = read_bytes(root, rel)
    return None if data is None else data.decode("utf-8")


# --------------------------------------------------------------------------
# R1 and R2: terminal outcomes and exact subject bytes.
# --------------------------------------------------------------------------

ACT_INSTANT = re.compile(r"^Act instant: (\S+)$", re.M)


def declared_source_absent(root):
    """True only for a wholly absent pre-D10 amendment, never a partial one."""
    rows = ([cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root))
    has_row = any(cells and cells[0] == DECLARED_SOURCE_ROW for cells in rows)
    paths = [f"{CHANGES}/{DECLARED_SOURCE_CHANGE}",
             f"{DECISIONS}/GOVERNANCE-SIMPLIFICATION-D10-ACT.md",
             *DECLARED_SOURCE_SUBJECTS]
    return not has_row and not any((root / rel).exists() or (root / rel).is_symlink()
                                  for rel in paths)


def declared_source_binding(root):
    """(applicable text, record findings, byte findings) for the explicit v2.0.

    This reads published-spec applicability only. No source/provider admission
    path calls it. The tag's actual target is checked at publication; R1 checks
    the append-only row's declaration, as it does older versioned records.
    Missing, malformed or changed inputs map no part of the amendment.
    """
    if declared_source_absent(root) or declared_source_disposition(root):
        return None, [], []
    records, subjects = [], []
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import d10_supersession
    if d10_supersession.state(root) != "recorded":
        records.append("declared-source: D10 record does not verify; applicability Unknown")
    rows = []
    for line in adoption_table_rows(root):
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if cells and cells[0] == DECLARED_SOURCE_ROW:
            rows.append(cells)
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append(f"declared-source: expected one seven-column {DECLARED_SOURCE_ROW} row in `{AGENT_ADOPTIONS}`")
    else:
        cells = rows[0]
        if cells[2] != f"`{DECLARED_SOURCE_COMMIT}`" or cells[6] != f"`{DECLARED_SOURCE_TAG}`":
            records.append("declared-source: adoption commit or specification tag declaration differs")
        if not cells[4]:
            records.append("declared-source: adoption row has no required Why reason")
        if not cells[5].startswith(f"`git revert -m 1 {DECLARED_SOURCE_COMMIT}`"):
            records.append("declared-source: adoption row does not name its subject's revert")
        for rel in DECLARED_SOURCE_SUBJECTS:
            snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{DECLARED_SOURCE_COMMIT}/{rel}"
            if f"]({snapshot})" not in cells[3]:
                records.append(f"declared-source: adoption row does not name `{rel}`")
    for rel, digest in DECLARED_SOURCE_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"declared-source: `{rel}` differs from the reviewed v2.0 subject; applicability Unknown")
    return (None if records or subjects else read_text(root, DECLARED_SOURCE_SPEC), records, subjects)


def url_source_binding(root):
    """Read v2.1's published composition. The transaction can land before its row.

    The publication step checks the tag target and default-branch ancestry.
    Like v2.0, this checker validates the row and exact current subject bytes
    without fetching refs, including in projected selftest trees.
    """
    rows = url_source_rows(root)
    if not rows or url_source_disposition(root, rows):
        return None, [], []

    records, subjects = [], []
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import d10_supersession
    if d10_supersession.state(root) != "recorded":
        records.append("URL declared-source: D10 record does not verify")
    if declared_source_binding(root)[0] is None:
        records.append("URL declared-source: prior v2.0 declared-source adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("URL declared-source: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{URL_SOURCE_TAG}`" or not reason):
            records.append("URL declared-source: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] != [f"git revert -m 1 {oid}"]:
                records.append("URL declared-source: revert does not name the landed merge commit")
            for rel in URL_SOURCE_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"URL declared-source: adoption row does not name `{rel}`")
    for rel, digest in URL_SOURCE_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"URL declared-source: `{rel}` differs from the reviewed v2.1 subject")
    subjects += url_source_contract_findings(root)
    return (None if records or subjects else read_text(root, URL_SOURCE_SPEC), records, subjects)


def figure_binding(root):
    """Read v2.2's published composition: pending until its row, like v2.1.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is the effective v2.0 text of REQ-polaris-generation-034,
    which v2.1 leaves unchanged; v2.1 being vetoed does not retire it.
    """
    rows = figure_rows(root)
    if not rows or figure_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if declared_source_binding(root)[0] is None:
        records.append("figure homes and fit: prior v2.0 declared-source adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("figure homes and fit: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{FIGURE_TAG}`" or not reason):
            records.append("figure homes and fit: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("figure homes and fit: revert does not name the landed commit")
            for rel in FIGURE_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"figure homes and fit: adoption row does not name `{rel}`")
    for rel, digest in FIGURE_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"figure homes and fit: `{rel}` differs from the reviewed v2.2 subject")
    return (None if records or subjects else read_text(root, FIGURE_SPEC), records, subjects)


def derived_binding(root):
    """Read v2.3's published composition: pending until its row, like v2.2.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec and the currency policy at that commit
    and the version tag. Its predecessor is v2.2's text of
    REQ-polaris-generation-034, so v2.2 must itself be in force.
    """
    rows = derived_rows(root)
    if not rows or derived_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if figure_binding(root)[0] is None:
        records.append("derived observed facts: prior v2.2 figure homes and fit adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("derived observed facts: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{DERIVED_TAG}`" or not reason):
            records.append("derived observed facts: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("derived observed facts: revert does not name the landed commit")
            for rel in DERIVED_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"derived observed facts: adoption row does not name `{rel}`")
    for rel, digest in DERIVED_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"derived observed facts: `{rel}` differs from the reviewed v2.3 subject")
    return (None if records or subjects else read_text(root, DERIVED_SPEC), records, subjects)


def ledger_binding(root):
    """Read v2.4's published composition: pending until its row, like v2.3.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.3's text of REQ-polaris-generation-034, so v2.3 must
    itself be in force.
    """
    rows = ledger_rows(root)
    if not rows or ledger_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if derived_binding(root)[0] is None:
        records.append("ledger packs thesis: prior v2.3 derived observed facts adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("ledger packs thesis: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{LEDGER_TAG}`" or not reason):
            records.append("ledger packs thesis: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("ledger packs thesis: revert does not name the landed commit")
            for rel in LEDGER_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"ledger packs thesis: adoption row does not name `{rel}`")
    for rel, digest in LEDGER_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"ledger packs thesis: `{rel}` differs from the reviewed v2.4 subject")
    return (None if records or subjects else read_text(root, LEDGER_SPEC), records, subjects)


def kinds_binding(root):
    """Read v2.5's published composition: pending until its row, like v2.4.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.4's text of REQ-polaris-generation-034, so v2.4 must
    itself be in force.
    """
    rows = kinds_rows(root)
    if not rows or kinds_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if ledger_binding(root)[0] is None:
        records.append("figure kinds: prior v2.4 ledger packs thesis adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("figure kinds: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{KINDS_TAG}`" or not reason):
            records.append("figure kinds: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("figure kinds: revert does not name the landed commit")
            for rel in KINDS_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"figure kinds: adoption row does not name `{rel}`")
    for rel, digest in KINDS_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"figure kinds: `{rel}` differs from the reviewed v2.5 subject")
    return (None if records or subjects else read_text(root, KINDS_SPEC), records, subjects)


def reach_binding(root):
    """Read v2.6's published composition: pending until its row, like v2.4.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec and the screening-policy successor at
    that commit, and the version tag. Its predecessor is v2.0's text of
    REQ-polaris-generation-046, so declared-source v2.0 must be in force.
    """
    rows = reach_rows(root)
    if not rows or reach_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if declared_source_binding(root)[0] is None:
        records.append("declared-source reach: prior v2.0 declared-source adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("declared-source reach: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{REACH_TAG}`" or not reason):
            records.append("declared-source reach: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("declared-source reach: revert does not name the landed commit")
            for rel in REACH_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"declared-source reach: adoption row does not name `{rel}`")
    for rel, digest in REACH_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"declared-source reach: `{rel}` differs from the reviewed v2.6 subject")
    return (None if records or subjects else read_text(root, REACH_SPEC), records, subjects)


def readmit_binding(root):
    """Read v2.13's published composition: pending until its row, like v2.6.

    The row names the commit carrying the adopted bytes (a plain commit, so
    its revert may omit `-m 1`), the reviewed spec and the screening-policy
    successor v3 at that commit, and the version tag. Its predecessor is
    v2.6's text of REQ-polaris-generation-046, so v2.6 must itself be in force.
    """
    rows = readmit_rows(root)
    if not rows or readmit_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if reach_binding(root)[0] is None:
        records.append("declared-source re-admission: prior v2.6 declared-source reach adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("declared-source re-admission: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{READMIT_TAG}`" or not reason):
            records.append("declared-source re-admission: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("declared-source re-admission: revert does not name the landed commit")
            for rel in READMIT_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"declared-source re-admission: adoption row does not name `{rel}`")
    for rel, digest in READMIT_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"declared-source re-admission: `{rel}` differs from the reviewed v2.13 subject")
    return (None if records or subjects else read_text(root, READMIT_SPEC), records, subjects)


def manifests_binding(root):
    """Read v2.7's published composition: pending until its row, like v2.5.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.5's text of REQ-polaris-generation-034, so v2.5 must
    itself be in force.
    """
    rows = manifests_rows(root)
    if not rows or manifests_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if kinds_binding(root)[0] is None:
        records.append("manifest recognizers: prior v2.5 figure kinds adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("manifest recognizers: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{MANIFESTS_TAG}`" or not reason):
            records.append("manifest recognizers: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("manifest recognizers: revert does not name the landed commit")
            for rel in MANIFESTS_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"manifest recognizers: adoption row does not name `{rel}`")
    for rel, digest in MANIFESTS_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"manifest recognizers: `{rel}` differs from the reviewed v2.7 subject")
    return (None if records or subjects else read_text(root, MANIFESTS_SPEC), records, subjects)


def repairs_binding(root):
    """Read v2.8's published composition: pending until its row, like v2.7.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.7's text of REQ-polaris-generation-034, so v2.7 must
    itself be in force.
    """
    rows = repairs_rows(root)
    if not rows or repairs_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if manifests_binding(root)[0] is None:
        records.append("spec repairs: prior v2.7 manifest recognizers adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("spec repairs: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{REPAIRS_TAG}`" or not reason):
            records.append("spec repairs: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("spec repairs: revert does not name the landed commit")
            for rel in REPAIRS_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"spec repairs: adoption row does not name `{rel}`")
    for rel, digest in REPAIRS_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"spec repairs: `{rel}` differs from the reviewed v2.8 subject")
    return (None if records or subjects else read_text(root, REPAIRS_SPEC), records, subjects)


def maps_binding(root):
    """Read v2.9's published composition: pending until its row, like v2.8.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.8's text of REQ-polaris-generation-034, so v2.8 must
    itself be in force.
    """
    rows = maps_rows(root)
    if not rows or maps_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if repairs_binding(root)[0] is None:
        records.append("computed maps: prior v2.8 spec repairs adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("computed maps: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{MAPS_TAG}`" or not reason):
            records.append("computed maps: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("computed maps: revert does not name the landed commit")
            for rel in MAPS_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"computed maps: adoption row does not name `{rel}`")
    for rel, digest in MAPS_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"computed maps: `{rel}` differs from the reviewed v2.9 subject")
    return (None if records or subjects else read_text(root, MAPS_SPEC), records, subjects)


def bounds_binding(root):
    """Read v2.10's published composition: pending until its row, like v2.9.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.9's text of REQ-polaris-generation-034, so v2.9 must
    itself be in force.
    """
    rows = bounds_rows(root)
    if not rows or bounds_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if maps_binding(root)[0] is None:
        records.append("record bounds: prior v2.9 computed maps adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("record bounds: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{BOUNDS_TAG}`" or not reason):
            records.append("record bounds: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("record bounds: revert does not name the landed commit")
            for rel in BOUNDS_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"record bounds: adoption row does not name `{rel}`")
    for rel, digest in BOUNDS_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"record bounds: `{rel}` differs from the reviewed v2.10 subject")
    return (None if records or subjects else read_text(root, BOUNDS_SPEC), records, subjects)


def corr_binding(root):
    """Read v2.11's published composition: pending until its row, like v2.10.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.10's text of REQ-polaris-generation-034, so v2.10 must
    itself be in force.
    """
    rows = corr_rows(root)
    if not rows or corr_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if bounds_binding(root)[0] is None:
        records.append("spec corrections: prior v2.10 record bounds adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("spec corrections: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{CORR_TAG}`" or not reason):
            records.append("spec corrections: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("spec corrections: revert does not name the landed commit")
            for rel in CORR_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"spec corrections: adoption row does not name `{rel}`")
    for rel, digest in CORR_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"spec corrections: `{rel}` differs from the reviewed v2.11 subject")
    return (None if records or subjects else read_text(root, CORR_SPEC), records, subjects)


def coverage_binding(root):
    """Read v2.12's published composition: pending until its row, like v2.11.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.11's text of REQ-polaris-generation-034, so v2.11 must
    itself be in force.
    """
    rows = coverage_rows(root)
    if not rows or coverage_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if corr_binding(root)[0] is None:
        records.append("coverage precheck: prior v2.11 spec corrections adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("coverage precheck: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{COVERAGE_TAG}`" or not reason):
            records.append("coverage precheck: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("coverage precheck: revert does not name the landed commit")
            for rel in COVERAGE_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"coverage precheck: adoption row does not name `{rel}`")
    for rel, digest in COVERAGE_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"coverage precheck: `{rel}` differs from the reviewed v2.12 subject")
    return (None if records or subjects else read_text(root, COVERAGE_SPEC), records, subjects)


def infra_binding(root):
    """Read v2.14's published composition: pending until its row, like v2.12.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.12's text of REQ-polaris-generation-034, so v2.12 must
    itself be in force.
    """
    rows = infra_rows(root)
    if not rows or infra_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if coverage_binding(root)[0] is None:
        records.append("infrastructure recognizers: prior v2.12 coverage precheck adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("infrastructure recognizers: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{INFRA_TAG}`" or not reason):
            records.append("infrastructure recognizers: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("infrastructure recognizers: revert does not name the landed commit")
            for rel in INFRA_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"infrastructure recognizers: adoption row does not name `{rel}`")
    for rel, digest in INFRA_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"infrastructure recognizers: `{rel}` differs from the reviewed v2.14 subject")
    return (None if records or subjects else read_text(root, INFRA_SPEC), records, subjects)


def findpages_binding(root):
    """Read v2.15's published composition: pending until its row, like v2.14.

    The row names the commit that installed this text (a plain commit, so its
    revert may omit `-m 1`, and may also revert the implementation's install
    commit, FINDPAGES_INSTALL),
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.12's text of REQ-polaris-generation-034, so v2.12 must
    itself be in force.
    """
    rows = findpages_rows(root)
    if not rows or findpages_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if infra_binding(root)[0] is None:
        records.append("index and task routes: prior v2.14 infrastructure recognizers adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("index and task routes: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{FINDPAGES_TAG}`" or not reason):
            records.append("index and task routes: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"],
                                               [f"git revert {oid} {FINDPAGES_INSTALL}"]):
                records.append("index and task routes: revert does not name the landed commit")
            for rel in FINDPAGES_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"index and task routes: adoption row does not name `{rel}`")
    for rel, digest in FINDPAGES_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"index and task routes: `{rel}` differs from the recorded v2.15 subject")
    return (None if records or subjects else read_text(root, FINDPAGES_SPEC), records, subjects)


def subsec_binding(root):
    """Read v2.16's published composition: pending until its row, like v2.14.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.15's text of REQ-polaris-generation-034, so v2.15 must
    itself be in force.
    """
    rows = subsec_rows(root)
    if not rows or subsec_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if findpages_binding(root)[0] is None:
        records.append("page subsections: prior v2.15 index and task routes adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("page subsections: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{SUBSEC_TAG}`" or not reason):
            records.append("page subsections: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("page subsections: revert does not name the landed commit")
            for rel in SUBSEC_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"page subsections: adoption row does not name `{rel}`")
    for rel, digest in SUBSEC_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"page subsections: `{rel}` differs from the reviewed v2.16 subject")
    return (None if records or subjects else read_text(root, SUBSEC_SPEC), records, subjects)

def reltype_binding(root):
    """Read v2.19's published composition: pending until its row, like v2.14.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.16's text of REQ-polaris-generation-034, so v2.16 must
    itself be in force.
    """
    rows = reltype_rows(root)
    if not rows or reltype_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if subsec_binding(root)[0] is None:
        records.append("relation types: prior v2.16 page subsections adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("relation types: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{RELTYPE_TAG}`" or not reason):
            records.append("relation types: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("relation types: revert does not name the landed commit")
            for rel in RELTYPE_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"relation types: adoption row does not name `{rel}`")
    for rel, digest in RELTYPE_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"relation types: `{rel}` differs from the reviewed v2.19 subject")
    return (None if records or subjects else read_text(root, RELTYPE_SPEC), records, subjects)

def hero_binding(root):
    """Read v2.20's published composition: pending until its row, like v2.14.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.19's text of REQ-polaris-generation-034, so v2.19 must
    itself be in force.
    """
    rows = hero_rows(root)
    if not rows or hero_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if reltype_binding(root)[0] is None:
        records.append("hero figure: prior v2.19 relation types adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("hero figure: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{HERO_TAG}`" or not reason):
            records.append("hero figure: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("hero figure: revert does not name the landed commit")
            for rel in HERO_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"hero figure: adoption row does not name `{rel}`")
    for rel, digest in HERO_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"hero figure: `{rel}` differs from the reviewed v2.20 subject")
    return (None if records or subjects else read_text(root, HERO_SPEC), records, subjects)


def readers_binding(root):
    """Read v2.22's published composition: pending until its row, like v2.14.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.20's text of REQ-polaris-generation-034, so v2.20 must
    itself be in force.
    """
    rows = readers_rows(root)
    if not rows or readers_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if hero_binding(root)[0] is None:
        records.append("reader's edition: prior v2.20 hero figure adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("reader's edition: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{READERS_TAG}`" or not reason):
            records.append("reader's edition: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("reader's edition: revert does not name the landed commit")
            for rel in READERS_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"reader's edition: adoption row does not name `{rel}`")
    for rel, digest in READERS_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"reader's edition: `{rel}` differs from the reviewed v2.22 subject")
    return (None if records or subjects else read_text(root, READERS_SPEC), records, subjects)

def cont_binding(root):
    """Read v2.23's published composition: pending until its row, like v2.14.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.22's text of REQ-polaris-generation-034, so v2.22 must
    itself be in force.
    """
    rows = cont_rows(root)
    if not rows or cont_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if readers_binding(root)[0] is None:
        records.append("containment figure: prior v2.22 reader's edition adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("containment figure: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{CONT_TAG}`" or not reason):
            records.append("containment figure: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("containment figure: revert does not name the landed commit")
            for rel in CONT_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"containment figure: adoption row does not name `{rel}`")
    for rel, digest in CONT_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"containment figure: `{rel}` differs from the reviewed v2.23 subject")
    return (None if records or subjects else read_text(root, CONT_SPEC), records, subjects)

def model_binding(root):
    """Read v2.24's published composition: pending until its row, like v2.14.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.23's text of REQ-polaris-generation-034, so v2.23 must
    itself be in force.
    """
    rows = model_rows(root)
    if not rows or model_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if cont_binding(root)[0] is None:
        records.append("system model: prior v2.23 containment figure adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("system model: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{MODEL_TAG}`" or not reason):
            records.append("system model: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("system model: revert does not name the landed commit")
            for rel in MODEL_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"system model: adoption row does not name `{rel}`")
    for rel, digest in MODEL_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"system model: `{rel}` differs from the reviewed v2.24 subject")
    return (None if records or subjects else read_text(root, MODEL_SPEC), records, subjects)

def worth_binding(root):
    """Read v2.26's published composition: pending until its row, like v2.14.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`, and may also revert the first install of the bytes,
    WORTH_FIRST_INSTALL), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.24's text of REQ-polaris-generation-034, so v2.24 must
    itself be in force.
    """
    rows = worth_rows(root)
    if not rows or worth_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if model_binding(root)[0] is None:
        records.append("worth-knowing: prior v2.24 system model adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("worth-knowing: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{WORTH_TAG}`" or not reason):
            records.append("worth-knowing: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"],
                                               [f"git revert {oid} {WORTH_FIRST_INSTALL}"]):
                records.append("worth-knowing: revert does not name the landed commit")
            for rel in WORTH_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"worth-knowing: adoption row does not name `{rel}`")
    for rel, digest in WORTH_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"worth-knowing: `{rel}` differs from the reviewed v2.26 subject")
    return (None if records or subjects else read_text(root, WORTH_SPEC), records, subjects)

def edit_account_binding(root):
    """Verify the recorded v2.25 REQ-006 replacement over effective v2.24."""
    rows = edit_account_rows(root)
    if not rows or edit_account_disposition(root, rows):
        return None, [], []

    records = []
    if model_binding(root)[0] is None:
        records.append("edit and repair accounting: prior v2.24 system-model adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("edit and repair accounting: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        oid = commit[1:-1] if re.fullmatch(r"`[0-9a-f]{40}`", commit) else None
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date) or not oid
                or not reason or tag != f"`{EDIT_ACCOUNT_TAG}`"):
            records.append("edit and repair accounting: malformed adoption identity, date, commit, reason or tag")
        if not edit_account_identity_unique(root, identity):
            records.append("edit and repair accounting: adoption identity is not unique in the ledger")
        if oid:
            if revert not in (f"`git revert {oid}`", f"`git revert -m 1 {oid}`"):
                records.append("edit and repair accounting: revert does not name the installing commit")
            snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{EDIT_ACCOUNT_SPEC}"
            if f"]({snapshot})" not in changed:
                records.append("edit and repair accounting: adoption row does not name the reviewed specification")

    body = read_bytes(root, EDIT_ACCOUNT_SPEC)
    subjects = []
    if body is None or sha(body) != EDIT_ACCOUNT_SUBJECTS[EDIT_ACCOUNT_SPEC]:
        subjects.append(f"edit and repair accounting: `{EDIT_ACCOUNT_SPEC}` differs from the reviewed v2.25 subject")
    return (None if records or subjects else body.decode("utf-8"), records, subjects)


def is_raw_read_row(line):
    """A tag or a link to the subject at this row's own commit claims adoption."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if f"`{RAW_READ_TAG}`" in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return f"]({snapshot}{RAW_READ_SPEC})" in cells[3]


def raw_read_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_raw_read_row(line)]


def raw_read_binding(root):
    """The successor composes only with a valid adoption over its reviewed bytes."""
    rows = raw_read_rows(root)
    if not rows:
        return None, [], []
    if len(rows) != 1 or len(rows[0]) != 7:
        return None, ["raw-read disclosure: expected one seven-column adoption row"], []
    identity, date, commit, changed, reason, revert, tag = rows[0]
    oid = commit.strip("`")
    if recorded_disposition(root, identity, oid, RAW_READ_TAG, RAW_READ_SUBJECTS, plain_revert=True):
        return None, [], []
    records = []
    if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
            or not valid_adoption_date(date)
            or not re.fullmatch(r"`[0-9a-f]{40}`", commit)
            or tag != f"`{RAW_READ_TAG}`" or not reason):
        records.append("raw-read disclosure: malformed adoption identity, date, commit, reason or tag")
    if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
        records.append("raw-read disclosure: revert does not name its adoption commit")
    for rel in RAW_READ_SUBJECTS:
        snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
        if f"]({snapshot})" not in changed:
            records.append(f"raw-read disclosure: adoption row does not name `{rel}`")
    if url_source_binding(root)[0] is None or readmit_binding(root)[0] is None:
        records.append("raw-read disclosure: URL source v2.1 and source policy v3 must be effective")
    subjects = []
    for rel, digest in RAW_READ_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"raw-read disclosure: `{rel}` differs from the reviewed subject")
    return (None if records or subjects else read_text(root, RAW_READ_SPEC), records, subjects)


def is_treeread_row(line):
    """A tag or a link to the subject at this row's own commit claims adoption."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    if f"`{TREEREAD_TAG}`" in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return f"]({snapshot}{TREEREAD_SPEC})" in cells[3]


def treeread_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_treeread_row(line)]


def treeread_binding(root):
    """The successor composes only with a valid adoption over its reviewed bytes, after
    the raw-read disclosure v2.17 (033's predecessor) and URL source v2.1 (035's and 048's)."""
    rows = treeread_rows(root)
    if not rows:
        return None, [], []
    if len(rows) != 1 or len(rows[0]) != 7:
        return None, ["run-tree read bounds: expected one seven-column adoption row"], []
    identity, date, commit, changed, reason, revert, tag = rows[0]
    oid = commit.strip("`")
    if recorded_disposition(root, identity, oid, TREEREAD_TAG, TREEREAD_SUBJECTS, plain_revert=True):
        return None, [], []
    records = []
    if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
            or not valid_adoption_date(date)
            or not re.fullmatch(r"`[0-9a-f]{40}`", commit)
            or tag != f"`{TREEREAD_TAG}`" or not reason):
        records.append("run-tree read bounds: malformed adoption identity, date, commit, reason or tag")
    if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
        records.append("run-tree read bounds: revert does not name its adoption commit")
    for rel in TREEREAD_SUBJECTS:
        snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
        if f"]({snapshot})" not in changed:
            records.append(f"run-tree read bounds: adoption row does not name `{rel}`")
    if url_source_binding(root)[0] is None or raw_read_binding(root)[0] is None:
        records.append("run-tree read bounds: URL source v2.1 and raw-read disclosure v2.17 must be effective")
    subjects = []
    for rel, digest in TREEREAD_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"run-tree read bounds: `{rel}` differs from the reviewed subject")
    return (None if records or subjects else read_text(root, TREEREAD_SPEC), records, subjects)


def is_verify_row(line):
    """A ledger row claiming the v2.21 verify-text amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{VERIFY_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in VERIFY_SUBJECTS)


def verify_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_verify_row(line)]


def verify_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), VERIFY_TAG,
                                    VERIFY_SUBJECTS, plain_revert=True)
    return None


def verify_binding(root):
    """Read v2.21's published composition: pending until its row, like v2.12.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.18's text of REQ-polaris-generation-033 (run-tree read
    bounds, itself after raw-read disclosure v2.17), so v2.18 must itself be in
    force.
    """
    rows = verify_rows(root)
    if not rows or verify_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if treeread_binding(root)[0] is None:
        records.append("verify text: prior v2.18 run-tree read-bounds adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("verify text: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{VERIFY_TAG}`" or not reason):
            records.append("verify text: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("verify text: revert does not name the landed commit")
            for rel in VERIFY_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"verify text: adoption row does not name `{rel}`")
    for rel, digest in VERIFY_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"verify text: `{rel}` differs from the reviewed v2.21 subject")
    return (None if records or subjects else read_text(root, VERIFY_SPEC), records, subjects)


def is_qfile_row(line):
    """A ledger row claiming the v2.27 question-file amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{QFILE_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in QFILE_SUBJECTS)


def qfile_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_qfile_row(line)]


def qfile_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), QFILE_TAG,
                                    QFILE_SUBJECTS, plain_revert=True)
    return None


def qfile_binding(root):
    """Read v2.27's published composition: pending until its row, like v2.21.

    The row names the installing commit (a plain or merge commit), the reviewed
    spec at that commit and the version tag. Its predecessor is v2.21's text of
    REQ-polaris-generation-033 (verify text, itself after run-tree read bounds
    v2.18), so v2.21 must itself be in force.
    """
    rows = qfile_rows(root)
    if not rows or qfile_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if verify_binding(root)[0] is None:
        records.append("question file: prior v2.21 verify-text adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("question file: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{QFILE_TAG}`" or not reason):
            records.append("question file: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("question file: revert does not name the landed commit")
            for rel in QFILE_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"question file: adoption row does not name `{rel}`")
    for rel, digest in QFILE_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"question file: `{rel}` differs from the reviewed v2.27 subject")
    return (None if records or subjects else read_text(root, QFILE_SPEC), records, subjects)


def _is_reviewed_version_row(line, version_tag, subjects):
    """Recognize a version claim or a snapshot at the row's own commit."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{version_tag}`"
    if version_tag is not None and len(cells) == 7 and cells[6] == tag:
        return True
    if version_tag is not None and len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in subjects)


def is_scripted_grade_row(line):
    return _is_reviewed_version_row(line, SCRIPTED_GRADE_TAG, SCRIPTED_GRADE_SUBJECTS)


def is_step_measures_row(line):
    return _is_reviewed_version_row(line, STEP_MEASURES_TAG, STEP_MEASURES_SUBJECTS)


def scripted_grade_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_scripted_grade_row(line)]


def scripted_grade_disposition(root, rows):
    if SCRIPTED_GRADE_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), SCRIPTED_GRADE_TAG,
                                    SCRIPTED_GRADE_SUBJECTS, plain_revert=True)
    return None


def step_measures_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_step_measures_row(line)]


def step_measures_disposition(root, rows):
    if STEP_MEASURES_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), STEP_MEASURES_TAG,
                                    STEP_MEASURES_SUBJECTS, plain_revert=True)
    return None


def _reviewed_version_binding(root, rows, disposition, *, version_tag, subjects_map, spec,
                              predecessor, predecessor_label, version, label):
    """Check the unique adoption row and exact reviewed specification bytes."""
    if not rows or disposition(root, rows):
        return None, [], []
    if version_tag is None:
        return None, [f"{label}: its version tag is unassigned"], []
    records, subjects = [], []
    if predecessor(root)[0] is None:
        records.append(f"{label}: prior {predecessor_label} adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append(f"{label}: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{version_tag}`" or not reason):
            records.append(f"{label}: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append(f"{label}: revert does not name the landed commit")
            for rel in subjects_map:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"{label}: adoption row does not name `{rel}`")
    for rel, digest in subjects_map.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"{label}: `{rel}` differs from the reviewed {version} subject")
    return (None if records or subjects else read_text(root, spec), records, subjects)


def scripted_grade_binding(root):
    """Apply the reviewed scripted benchmark overlay after the effective question-file requirement."""
    return _reviewed_version_binding(
        root, scripted_grade_rows(root), scripted_grade_disposition,
        version_tag=SCRIPTED_GRADE_TAG, subjects_map=SCRIPTED_GRADE_SUBJECTS, spec=SCRIPTED_GRADE_SPEC,
        predecessor=qfile_binding, predecessor_label="v2.27 question-file", version="v2.30",
        label="scripted benchmark grading",
    )


def step_measures_binding(root):
    """Apply close measures only over the effective scripted benchmark REQ-033."""
    return _reviewed_version_binding(
        root, step_measures_rows(root), step_measures_disposition,
        version_tag=STEP_MEASURES_TAG, subjects_map=STEP_MEASURES_SUBJECTS, spec=STEP_MEASURES_SPEC,
        predecessor=scripted_grade_binding, predecessor_label="v2.30 scripted benchmark", version="v2.31",
        label="dossier close measures",
    )


def is_covhold_row(line):
    """A ledger row claiming the v2.28 coverage-hold amendment, well formed or not."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{COVHOLD_TAG}`"
    if len(cells) == 7 and cells[6] == tag:
        return True
    if len(cells) != 7 and tag in cells:
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/"
    return all(f"]({snapshot}{path})" in cells[3] for path in COVHOLD_SUBJECTS)


def covhold_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_covhold_row(line)]


def covhold_disposition(root, rows):
    if len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), COVHOLD_TAG,
                                    COVHOLD_SUBJECTS, plain_revert=True)
    return None


def covhold_binding(root):
    """Read v2.28's published composition: pending until its row, like v2.21's.

    The row names the installing commit (a plain commit, so its revert may
    omit `-m 1`), the reviewed spec at that commit and the version tag. Its
    predecessor is v2.18's text of REQ-polaris-generation-035 (run-tree read
    bounds, itself after raw-read disclosure v2.17), so v2.18 must itself be in
    force.
    """
    rows = covhold_rows(root)
    if not rows or covhold_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if treeread_binding(root)[0] is None:
        records.append("coverage hold: prior v2.18 run-tree read-bounds adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("coverage hold: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{COVHOLD_TAG}`" or not reason):
            records.append("coverage hold: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("coverage hold: revert does not name the landed commit")
            for rel in COVHOLD_SUBJECTS:
                snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel}"
                if f"]({snapshot})" not in changed:
                    records.append(f"coverage hold: adoption row does not name `{rel}`")
    for rel, digest in COVHOLD_SUBJECTS.items():
        body = read_bytes(root, rel)
        if body is None or sha(body) != digest:
            subjects.append(f"coverage hold: `{rel}` differs from the reviewed v2.28 subject")
    return (None if records or subjects else read_text(root, COVHOLD_SPEC), records, subjects)



def is_term_brief_row(line):
    """Recognize a version claim or a snapshot at the row's own commit."""
    if not line.startswith("|"):
        return False
    cells = [cell.strip() for cell in line.split("|")[1:-1]]
    tag = f"`{TERM_BRIEF_TAG}`"
    if (len(cells) == 7 and cells[6] == tag) or (len(cells) != 7 and tag in cells):
        return True
    if len(cells) < 4 or not re.fullmatch(r"`[0-9a-f]{40}`", cells[2]):
        return False
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{cells[2][1:-1]}/{TERM_BRIEF_SPEC}"
    return f"]({snapshot})" in cells[3]


def term_brief_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_term_brief_row(line)]


def term_brief_disposition(root, rows):
    if len(rows) != 1 or len(rows[0]) != 7:
        return None
    identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
    return recorded_disposition(root, identity, commit.strip("`"), TERM_BRIEF_TAG,
                                TERM_BRIEF_SUBJECTS, plain_revert=True)


def term_brief_binding(root):
    """Bind the reviewed author-brief amendment after effective v2.26 (A-217)."""
    rows = term_brief_rows(root)
    if not rows or term_brief_disposition(root, rows):
        return None, [], []
    records, subjects = [], []
    if worth_binding(root)[0] is None:
        records.append("terminology brief: prior v2.26 worth-knowing adoption is unavailable")
    if len(rows) != 1 or len(rows[0]) != 7:
        records.append("terminology brief: expected one seven-column agent adoption row")
    else:
        identity, date, commit, changed, reason, revert, tag = rows[0]
        landed = re.fullmatch(r"`([0-9a-f]{40})`", commit)
        if (not re.fullmatch(r"A-[1-9][0-9]*", identity)
                or not valid_adoption_date(date)
                or not landed or tag != f"`{TERM_BRIEF_TAG}`" or not reason):
            records.append("terminology brief: malformed adoption identity, date, commit, reason or tag")
        if landed:
            oid = landed.group(1)
            if revert.split("`")[1:2] not in ([f"git revert {oid}"], [f"git revert -m 1 {oid}"]):
                records.append("terminology brief: revert does not name the landed commit")
            snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{TERM_BRIEF_SPEC}"
            if f"]({snapshot})" not in changed:
                records.append(f"terminology brief: adoption row does not name `{TERM_BRIEF_SPEC}`")
    body = read_bytes(root, TERM_BRIEF_SPEC)
    if body is None or sha(body) != TERM_BRIEF_SUBJECTS[TERM_BRIEF_SPEC]:
        subjects.append(f"terminology brief: `{TERM_BRIEF_SPEC}` differs from the reviewed subject")
    return (None if records or subjects else read_text(root, TERM_BRIEF_SPEC), records, subjects)


def is_qkind_row(line):
    return _is_reviewed_version_row(line, QKIND_TAG, QKIND_SUBJECTS)


def qkind_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_qkind_row(line)]


def qkind_disposition(root, rows):
    if QKIND_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), QKIND_TAG,
                                    QKIND_SUBJECTS, plain_revert=True)
    return None


def qkind_binding(root):
    """Apply the question-kind floor only over the effective v2.29 terminology-brief REQ-034."""
    return _reviewed_version_binding(
        root, qkind_rows(root), qkind_disposition,
        version_tag=QKIND_TAG, subjects_map=QKIND_SUBJECTS, spec=QKIND_SPEC,
        predecessor=term_brief_binding, predecessor_label="v2.29 terminology brief", version="v2.32",
        label="question-kind floor",
    )


def is_figplan_row(line):
    return _is_reviewed_version_row(line, FIGPLAN_TAG, FIGPLAN_SUBJECTS)


def figplan_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_figplan_row(line)]


def figplan_disposition(root, rows):
    if FIGPLAN_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), FIGPLAN_TAG,
                                    FIGPLAN_SUBJECTS, plain_revert=True)
    return None


def figplan_binding(root):
    """Apply the figure plan only over the effective v2.32 question-kind-floor REQ-034."""
    return _reviewed_version_binding(
        root, figplan_rows(root), figplan_disposition,
        version_tag=FIGPLAN_TAG, subjects_map=FIGPLAN_SUBJECTS, spec=FIGPLAN_SPEC,
        predecessor=qkind_binding, predecessor_label="v2.32 question-kind floor", version="v2.33",
        label="figure plan",
    )


def is_vbase_row(line):
    return _is_reviewed_version_row(line, VBASE_TAG, VBASE_SUBJECTS)


def vbase_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_vbase_row(line)]


def vbase_disposition(root, rows):
    if VBASE_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), VBASE_TAG,
                                    VBASE_SUBJECTS, plain_revert=True)
    return None


def vbase_binding(root):
    """Apply the derived base only over the effective v2.33 figure-plan REQ-034."""
    return _reviewed_version_binding(
        root, vbase_rows(root), vbase_disposition,
        version_tag=VBASE_TAG, subjects_map=VBASE_SUBJECTS, spec=VBASE_SPEC,
        predecessor=figplan_binding, predecessor_label="v2.33 figure plan", version="v2.34",
        label="derived base",
    )


P5_ADVICE_CHANGE = "polaris-source-example-advice"
P5_ADVICE_HOME = f"{CHANGES}/{P5_ADVICE_CHANGE}"
P5_ADVICE_SPEC = f"{P5_ADVICE_HOME}/proposed/polaris-generation/spec.md"
SOURCE_EXAMPLE_TAG = "polaris-dossier-source-example-advice-v2.36"
P5_ADVICE_PREDECESSOR = "b7d3324969101e742b2592869d8761f680fe8615"
P5_ADVICE_STATUS_PREFIX = "[Source-example advice]("
P5_ADVICE_INDEX_PREFIX = f"| [`{P5_ADVICE_CHANGE}`]("
P5_ADVICE_COUNT_SCOPE = "With the source-example advice"
P5_ADVICE_COUNT_PREFIX = "With the source-example advice version effective, Polaris has "
P5_ADVICE_COUNT = re.compile(re.escape(P5_ADVICE_COUNT_PREFIX) + r"(\d+) requirements and (\d+) scenarios\.")
P5_ADVICE_CANDIDATE_INDEX = '| [`polaris-source-example-advice`](changes/polaris-source-example-advice) | One immediate advisory for a known absent code selection in a supported operator-agent draft. | **Candidate.** Adoption and implementation pending | [Draft semantic delta](changes/polaris-source-example-advice/SEMANTIC-DELTA.md) |'
P5_ADVICE_SUBJECTS = {
    "openspec/changes/polaris-source-example-advice/proposed/polaris-generation/spec.md": "e2688ca4162bd10065fbd87dcf6134ab8263a8039dbd3de62b4eb2de85771177",
    "openspec/changes/polaris-source-example-advice/GOVERNING-DEPENDENCIES.json": "3f6c2b317bf01c0d940f7ee7b41ce73ddb2b0cfd5aa4efe2afbfb26c4ae3efef",
    "openspec/changes/polaris-source-example-advice/SCREENING-SUCCESSOR-DELTA.md": "77fe62bf7a02a5f91dcf32fb036b59eeb1a0621c1934bf6a091394728afa9890",
}

# The v2.37 choice floor (syzygy-5dhm.43): one MODIFIED REQ-polaris-generation-034 after
# the v2.36 source-example advice, adopted by an agent row and its version tag.
CHOICE_CHANGE = "dossier-choice-floor"
CHOICE_HOME = f"{CHANGES}/{CHOICE_CHANGE}"
CHOICE_SPEC = f"{CHOICE_HOME}/proposed/polaris-generation/spec.md"
CHOICE_UNION = f"{CHOICE_HOME}/GOVERNING-DEPENDENCIES.json"
CHOICE_TAG = "polaris-dossier-choice-floor-v2.37"
CHOICE_STATUS_PREFIX = f"[Choice floor amendment 2.37]({CHOICE_HOME})"
CHOICE_INDEX_PREFIX = f"| [`{CHOICE_CHANGE}`]("
CHOICE_REPLACES = (POLARIS_ID + "034",)
CHOICE_COUNT_SCOPE = "With the choice floor"
CHOICE_COUNT_PREFIX = "With the choice floor version effective, Polaris has "
CHOICE_SUBJECTS = {
    CHOICE_SPEC: "02f7a314e827682f08e69e4d47a03479ff82c8896ecbddd99315e5f4e55bc380",
}
CHOICE_BOUND_PARTS = len(CHOICE_SUBJECTS)

# The v2.38 migration parity (syzygy-3efd.85): one MODIFIED REQ-polaris-generation-034 after
# the v2.37 choice floor, adopted by an agent row and its version tag (drafted over 2.34 as 2.NN).
MIGPAR_CHANGE = "dossier-migration-parity"
MIGPAR_HOME = f"{CHANGES}/{MIGPAR_CHANGE}"
MIGPAR_SPEC = f"{MIGPAR_HOME}/proposed/polaris-generation/spec.md"
MIGPAR_UNION = f"{MIGPAR_HOME}/GOVERNING-DEPENDENCIES.json"
MIGPAR_TAG = "polaris-dossier-migration-parity-v2.38"
MIGPAR_STATUS_PREFIX = f"[Migration parity amendment 2.38]({MIGPAR_HOME})"
MIGPAR_INDEX_PREFIX = f"| [`{MIGPAR_CHANGE}`]("
MIGPAR_REPLACES = (POLARIS_ID + "034",)
MIGPAR_COUNT_SCOPE = "With the migration parity"
MIGPAR_COUNT_PREFIX = "With the migration parity version effective, Polaris has "
MIGPAR_SUBJECTS = {
    MIGPAR_SPEC: "e37ca0fc3053302a13ccb0c2ad87c990cdb887fe275568eb9a707425396682f4",
}
MIGPAR_BOUND_PARTS = len(MIGPAR_SUBJECTS)

# The v2.39 lexical import facts (syzygy-3efd.60): one MODIFIED REQ-polaris-generation-034 after
# the v2.38 migration parity, adopted by an agent row and its version tag (drafted over 2.33 as 2.NN).
IMPFACTS_CHANGE = "dossier-import-facts"
IMPFACTS_HOME = f"{CHANGES}/{IMPFACTS_CHANGE}"
IMPFACTS_SPEC = f"{IMPFACTS_HOME}/proposed/polaris-generation/spec.md"
IMPFACTS_UNION = f"{IMPFACTS_HOME}/GOVERNING-DEPENDENCIES.json"
IMPFACTS_TAG = "polaris-dossier-import-facts-v2.39"
IMPFACTS_STATUS_PREFIX = f"[Import facts amendment 2.39]({IMPFACTS_HOME})"
IMPFACTS_INDEX_PREFIX = f"| [`{IMPFACTS_CHANGE}`]("
IMPFACTS_REPLACES = (POLARIS_ID + "034",)
IMPFACTS_COUNT_SCOPE = "With the import facts"
IMPFACTS_COUNT_PREFIX = "With the import facts version effective, Polaris has "
IMPFACTS_SUBJECTS = {
    IMPFACTS_SPEC: "9502229052a3b7da3880b4062e54141681a2d01e09163b8df24c2aab20e479fb",
}
IMPFACTS_BOUND_PARTS = len(IMPFACTS_SUBJECTS)

# The v2.40 figure walks (syzygy-3efd.32): one MODIFIED REQ-polaris-generation-034 after
# the v2.39 import facts, adopted by an agent row and its version tag (drafted over 2.33 as 2.NN).
WALK_CHANGE = "dossier-figure-walks"
WALK_HOME = f"{CHANGES}/{WALK_CHANGE}"
WALK_SPEC = f"{WALK_HOME}/proposed/polaris-generation/spec.md"
WALK_UNION = f"{WALK_HOME}/GOVERNING-DEPENDENCIES.json"
WALK_TAG = "polaris-dossier-figure-walks-v2.40"
WALK_STATUS_PREFIX = f"[Figure walks amendment 2.40]({WALK_HOME})"
WALK_INDEX_PREFIX = f"| [`{WALK_CHANGE}`]("
WALK_REPLACES = (POLARIS_ID + "034",)
WALK_COUNT_SCOPE = "With the figure walks"
WALK_COUNT_PREFIX = "With the figure walks version effective, Polaris has "
WALK_SUBJECTS = {
    WALK_SPEC: "ea18e7d7c1c6281929a974b1e6d0cd7cf935c06851b22efa4e4c167595da75cf",
}
WALK_BOUND_PARTS = len(WALK_SUBJECTS)

# The v2.42 test-name recognizers (syzygy-5dhm.45): one MODIFIED REQ-polaris-generation-034 after
# the v2.40 figure walks, adopted by an agent row and its version tag.
TNAMES_CHANGE = "dossier-test-names"
TNAMES_HOME = f"{CHANGES}/{TNAMES_CHANGE}"
TNAMES_SPEC = f"{TNAMES_HOME}/proposed/polaris-generation/spec.md"
TNAMES_UNION = f"{TNAMES_HOME}/GOVERNING-DEPENDENCIES.json"
TNAMES_TAG = "polaris-dossier-test-names-v2.42"
TNAMES_STATUS_PREFIX = f"[Test-name recognizers amendment 2.42]({TNAMES_HOME})"
TNAMES_INDEX_PREFIX = f"| [`{TNAMES_CHANGE}`]("
TNAMES_REPLACES = (POLARIS_ID + "034",)
TNAMES_COUNT_SCOPE = "With the test-name recognizers"
TNAMES_COUNT_PREFIX = "With the test-name recognizers version effective, Polaris has "
TNAMES_SUBJECTS = {
    TNAMES_SPEC: "82293d2d720fa8de3ead5234abfef86d0105db73fa2e4ff3c3ca6da097ed3e7b",
}
TNAMES_BOUND_PARTS = len(TNAMES_SUBJECTS)

# The v2.43 migration bounds (syzygy-3efd.87): one MODIFIED REQ-polaris-generation-034 after
# the v2.42 test-name recognizers, adopted by an agent row and its version tag.
MIGBOUND_CHANGE = "dossier-migration-bounds"
MIGBOUND_HOME = f"{CHANGES}/{MIGBOUND_CHANGE}"
MIGBOUND_SPEC = f"{MIGBOUND_HOME}/proposed/polaris-generation/spec.md"
MIGBOUND_UNION = f"{MIGBOUND_HOME}/GOVERNING-DEPENDENCIES.json"
MIGBOUND_TAG = "polaris-dossier-migration-bounds-v2.43"
MIGBOUND_STATUS_PREFIX = f"[Migration bounds amendment 2.43]({MIGBOUND_HOME})"
MIGBOUND_INDEX_PREFIX = f"| [`{MIGBOUND_CHANGE}`]("
MIGBOUND_REPLACES = (POLARIS_ID + "034",)
MIGBOUND_COUNT_SCOPE = "With the migration bounds"
MIGBOUND_COUNT_PREFIX = "With the migration bounds version effective, Polaris has "
MIGBOUND_SUBJECTS = {
    MIGBOUND_SPEC: "bbc1ab4794a9748de88350b2c7cc9ffbeec5dd6d74231739860789aa724acf02",
}
MIGBOUND_BOUND_PARTS = len(MIGBOUND_SUBJECTS)

# The v2.44 rough-edge markers (syzygy-5dhm.46): one MODIFIED REQ-polaris-generation-034 after
# the v2.43 migration bounds, adopted by an agent row and its version tag.
ROUGH_CHANGE = "dossier-rough-edges"
ROUGH_HOME = f"{CHANGES}/{ROUGH_CHANGE}"
ROUGH_SPEC = f"{ROUGH_HOME}/proposed/polaris-generation/spec.md"
ROUGH_UNION = f"{ROUGH_HOME}/GOVERNING-DEPENDENCIES.json"
ROUGH_TAG = "polaris-dossier-rough-edges-v2.44"
ROUGH_STATUS_PREFIX = f"[Rough-edge markers amendment 2.44]({ROUGH_HOME})"
ROUGH_INDEX_PREFIX = f"| [`{ROUGH_CHANGE}`]("
ROUGH_REPLACES = (POLARIS_ID + "034",)
ROUGH_COUNT_SCOPE = "With the rough-edge markers"
ROUGH_COUNT_PREFIX = "With the rough-edge markers version effective, Polaris has "
ROUGH_SUBJECTS = {
    ROUGH_SPEC: "3c03ebff0f05c791fed0ddcd3a6cec5d259db64a8fcb7eb47b3b661c4e5661c1",
}
ROUGH_BOUND_PARTS = len(ROUGH_SUBJECTS)


def is_vbase_screening_row(row):
    return _is_reviewed_version_row(row, VBASE_SCREENING_TAG, VBASE_SCREENING_SUBJECTS)


def vbase_screening_rows(rows):
    return [row for row in rows if is_vbase_screening_row(row)]


def vbase_screening_binding(root):
    """Select the corrected derived-base spec from an exact protected version."""
    ledger = adoption_table_rows(root)
    claims = vbase_screening_rows(ledger)
    ref = f"refs/tags/{VBASE_SCREENING_TAG}"

    git_root = _VBASE_SELFTEST_GIT_ROOT or root

    def invalid(reason):
        return "invalid", None, [f"Derived-base screening: {reason}"], []

    if not claims:
        if (root / ".git").exists() and local_git(git_root, "rev-parse", "--verify", ref) is not None:
            return invalid("the successor tag has no canonical adoption row")
        return "candidate", None, [], []

    rows = [[cell.strip() for cell in row.split("|")[1:-1]] for row in claims]
    text, records, subjects = _reviewed_version_binding(
        root, rows, lambda _root, _rows: None,
        version_tag=VBASE_SCREENING_TAG, subjects_map=VBASE_SCREENING_SUBJECTS,
        spec=VBASE_SCREENING_SPEC, predecessor=figplan_binding,
        predecessor_label="v2.33 figure plan", version=VBASE_SCREENING_VERSION,
        label="Derived-base screening",
    )
    if text is None:
        return "invalid", None, records, subjects
    identity, _date, recorded_source, _what, _why, inverse, _tag = rows[0]
    source = recorded_source[1:-1]
    if sum(row.split("|")[1].strip() == identity for row in ledger) != 1:
        return invalid("the adoption identity is not globally unique")
    historical = [row for row in ledger if is_vbase_row(row)]
    old_rows = vbase_rows(root)
    if (len(old_rows) != 1 or len(old_rows[0]) != 7
            or old_rows[0][0] != "A-267"
            or old_rows[0][2] != f"`{VBASE_SCREENING_HISTORICAL_SOURCE}`"):
        return invalid("the exact historical A-267 claim is unavailable")
    retired_by = vbase_disposition(root, old_rows)
    retirements = [row for row in ledger if row.split("|")[1].strip() == retired_by]
    if len(retirements) != 1 or int(retired_by[2:]) >= int(identity[2:]):
        return invalid("A-267 has no distinct prior retirement")
    retirement = retirements[0]
    retirement_fields = [cell.strip() for cell in retirement.split("|")[1:-1]]
    retired_source = retirement_fields[2][1:-1]
    if not re.fullmatch(r"[0-9a-f]{40}", retired_source):
        return invalid("the A-267 retirement does not identify an exact revision")

    authored = local_git(git_root, "rev-parse", "--verify", "HEAD^{commit}")
    authored = authored.decode("ascii").strip() if authored else None
    if authored is None or local_git(git_root, "merge-base", "--is-ancestor", source, authored) is None:
        return invalid("the exact source is outside authored history")
    parent_line = local_git(git_root, "rev-list", "--parents", "-n", "1", source)
    parts = parent_line.split() if parent_line else []
    if (parts != [source.encode("ascii"), retired_source.encode("ascii")]
            or inverse != f"`git revert {source}`"):
        return invalid("the correction cannot be reverted to its exact previously retired state")
    if not vbase_retirement_verified(git_root, retired_source):
        return invalid("the exact retired predecessor would not survive the inverse")
    historical_routes = {
        STATUS: (VBASE_STATUS_PREFIX,),
        OPENSPEC_README: (f"| [`{VBASE_CHANGE}`](",),
    }
    if not git_routes_match(root, git_root, retired_source, historical_routes):
        return invalid("the archived status and index routes differ from the exact retirement")
    if not vbase_screening_git_matches(root, git_root, claims, historical, retirement, source, authored):
        return invalid("the row and reviewed subjects do not match authored Git")
    route_error = vbase_screening_authority_route_error(root, identity)
    if route_error:
        return invalid(route_error)
    predecessor_rows = [row for row in ledger if is_figplan_row(row)]
    if (local_git(git_root, "rev-parse", "--verify", f"refs/tags/{FIGPLAN_TAG}^{{commit}}")
            != VBASE_SCREENING_PREDECESSOR.encode("ascii") + b"\n"
            or not vbase_figplan_verified(git_root, authored, predecessor_rows)):
        return invalid("the exact v2.33 predecessor is unavailable in authored Git")

    refs = local_git(
        git_root, "for-each-ref", "--format=%(refname) %(objecttype) %(tag) %(*objecttype) %(*objectname)",
        ref, f"refs/tags/{VBASE_TAG}",
    )
    if refs is None:
        return invalid("the local version tag inventory is unavailable")
    by_name = {row.split(maxsplit=1)[0].decode("ascii"): row.split()
               for row in refs.splitlines()}
    if _VBASE_SELFTEST_GIT_ROOT is not None:
        # The copied mutation fixtures exercise the pre-tag source shape.
        by_name.pop(ref, None)
    if f"refs/tags/{VBASE_TAG}" in by_name:
        return invalid("a tag attempts to bind the retired A-267 claim")
    if ref not in by_name:
        return "staged", None, [], []
    if by_name[ref] != [ref.encode("ascii"), b"tag", VBASE_SCREENING_TAG.encode("ascii"),
                        b"commit", source.encode("ascii")]:
        return invalid("the version is not annotated directly on its exact source")

    protected = local_git(git_root, "rev-parse", "--verify", "refs/remotes/origin/main^{commit}")
    protected = protected.decode("ascii").strip() if protected else None
    if protected is None or not vbase_screening_git_matches(
        root, git_root, claims, historical, retirement, source, protected
    ):
        return invalid("the row and reviewed subjects are absent from protected main")
    if not vbase_figplan_verified(git_root, protected, predecessor_rows):
        return invalid("the exact v2.33 predecessor row or subject is unavailable on protected main")
    # Authority routes stay bound to protected main. A checkout containing
    # protected main may have a later adoption that changes census totals.
    # R3 and R5 verify the later checkout against its own composition.
    stale = local_git(git_root, "merge-base", "--is-ancestor", protected, authored) is None
    if not vbase_screening_routes_match(root, git_root, protected, compare_census=stale):
        return invalid("the scoped census or status routes differ from protected main")

    def disposition(rows_at_ref):
        return recorded_disposition(
            root, identity, source, VBASE_SCREENING_TAG, VBASE_SCREENING_SUBJECTS,
            plain_revert=True, ledger_rows=rows_at_ref,
        )

    current_disposition = disposition(ledger)
    authored_disposition = disposition(git_adoption_rows(git_root, authored))
    protected_disposition = disposition(git_adoption_rows(git_root, protected))
    if current_disposition != authored_disposition or authored_disposition != protected_disposition:
        return invalid("worktree, authored and protected dispositions disagree")
    if protected_disposition:
        return "reverted", None, [], []
    return "effective", text, [], []


def is_source_example_row(row):
    return _is_reviewed_version_row(row, SOURCE_EXAMPLE_TAG, P5_ADVICE_SUBJECTS)


def p5_advice_claims(rows):
    return [row for row in rows if is_source_example_row(row)]


def p5_advice_authority(root, identity, candidate_only=False):
    status = read_text(root, STATUS) or ""
    index = read_text(root, OPENSPEC_README) or ""
    expected_status = (
        f"{P5_ADVICE_STATUS_PREFIX}{P5_ADVICE_HOME}) records {identity}. "
        "The advisory applies when its protected adoption and exact version tag are verified."
    )
    index_home = f"changes/{P5_ADVICE_CHANGE}"
    expected_index = (
        f"{P5_ADVICE_INDEX_PREFIX}{index_home}) | One immediate advisory for a known absent code "
        f"selection in a supported operator-agent draft. | `{identity}` in "
        f"[AGENT-ADOPTIONS.md](../{AGENT_ADOPTIONS}) applies when the exact version tag is verified, "
        f"`{SOURCE_EXAMPLE_TAG}` | [Semantic delta]({index_home}/SCREENING-SUCCESSOR-DELTA.md) |"
    )
    status_rows = scoped_route_lines(status, (P5_ADVICE_STATUS_PREFIX,))
    index_rows = scoped_route_lines(index, (P5_ADVICE_INDEX_PREFIX,))
    if candidate_only:
        return not status_rows and len(index_rows) == 1 and index_rows[0] == P5_ADVICE_CANDIDATE_INDEX
    return status_rows == [expected_status] and index_rows == [expected_index]


def p5_advice_binding(root):
    """Select the source-example advisory only after its exact protected version binds."""
    ledger = adoption_table_rows(root)
    claims = p5_advice_claims(ledger)
    ref = f"refs/tags/{SOURCE_EXAMPLE_TAG}"
    git_root = _VBASE_SELFTEST_GIT_ROOT or root

    def invalid(reason):
        return "invalid", None, [f"Source-example advice: {reason}"], []

    tag = local_git(git_root, "for-each-ref",
                    "--format=%(refname) %(objecttype) %(tag) %(*objecttype) %(*objectname)", ref)
    if _VBASE_SELFTEST_GIT_ROOT is not None:
        # The shared copied-history selftest predates this version.
        tag = b""
    if not claims:
        if tag:
            return invalid("a version tag has no canonical adoption")
        status = read_text(root, STATUS) or ""
        index = read_text(root, OPENSPEC_README) or ""
        routes = scoped_route_lines(index, (P5_ADVICE_INDEX_PREFIX,))
        if (any(route != P5_ADVICE_CANDIDATE_INDEX for route in routes)
                or len(routes) > 1
                or scoped_route_lines(status, (P5_ADVICE_STATUS_PREFIX, P5_ADVICE_COUNT_SCOPE))):
            return invalid("a candidate displays an active or conflicting authority route")
        return "candidate", None, [], []

    if len(claims) != 1:
        return invalid("expected exactly one adoption")
    row = [cell.strip() for cell in claims[0].split("|")[1:-1]]
    if len(row) != 7:
        return invalid("expected a seven-column adoption row")
    identity, date, commit, subject_links, why, inverse, version = row
    match = re.fullmatch(r"`([0-9a-f]{40})`", commit)
    if (not re.fullmatch(r"A-[1-9][0-9]*", identity) or not valid_adoption_date(date)
            or match is None or not why or version != f"`{SOURCE_EXAMPLE_TAG}`"):
        return invalid("malformed adoption identity, date, commit, reason or tag")
    source = match[1]
    if (inverse != f"`git revert {source}`" or any(
            f"](https://github.com/tzeusy-org/syzygy/blob/{source}/{path})" not in subject_links
            for path in P5_ADVICE_SUBJECTS)):
        return invalid("the row does not name the exact reviewed source and inverse")

    if vbase_screening_binding(root)[0] != "effective":
        return invalid("the effective v2.35 screening predecessor is unavailable")
    parent = local_git(git_root, "rev-list", "--parents", "-n1", source)
    if (parent is None or len(parent.split()) != 2
            or local_git(git_root, "merge-base", "--is-ancestor", P5_ADVICE_PREDECESSOR, f"{source}^") is None):
        return invalid("the source has no single parent with the screened predecessor")
    paths = local_git(git_root, "diff-tree", "--no-commit-id", "-r", "--name-only", "-z", source)
    if paths is None or set(paths.rstrip(b"\0").split(b"\0")) != {
            path.encode("ascii") for path in (*P5_ADVICE_SUBJECTS, STATUS, OPENSPEC_README)}:
        return invalid("the source commit changes paths outside the reviewed source and its routes")
    source_subjects = {}
    for path, digest in P5_ADVICE_SUBJECTS.items():
        entry = local_git(git_root, "ls-tree", "-z", source, "--", path)
        body = local_git(git_root, "show", f"{source}:{path}")
        if not entry or not entry.startswith(b"100644 blob ") or body is None or sha(body) != digest:
            return invalid(f"the exact reviewed Git subject is unavailable at {path}")
        source_subjects[path] = entry, body

    def evidence(commit_oid):
        rows = git_adoption_rows(git_root, commit_oid)
        if ([line for line in rows if line.split("|")[1].strip() == identity] != claims
                or p5_advice_claims(rows) != claims
                or local_git(git_root, "merge-base", "--is-ancestor", source, commit_oid) is None):
            return None
        return rows

    head = "HEAD"
    authored = evidence(head)
    if (authored is None
            or [line for line in ledger if line.split("|")[1].strip() == identity] != claims):
        return invalid("the unique adoption and source are outside authored Git")
    protected = "refs/remotes/origin/main"
    protected_rows = evidence(protected) if tag else None
    if tag is None:
        return invalid("the local version ref inventory is unavailable")
    if tag and tag.split() != [ref.encode("ascii"), b"tag", SOURCE_EXAMPLE_TAG.encode("ascii"),
                              b"commit", source.encode("ascii")]:
        return invalid("the version is not annotated directly on its exact source")
    if tag and protected_rows is None:
        return invalid("the exact adopted source is outside protected main")

    def disposition(rows):
        return recorded_disposition(root, identity, source, SOURCE_EXAMPLE_TAG, P5_ADVICE_SUBJECTS,
                                    plain_revert=True, ledger_rows=rows)

    revoked = disposition(ledger)
    if revoked != disposition(authored) or (tag and revoked != disposition(protected_rows)):
        return invalid("worktree, authored and protected dispositions disagree")
    if revoked:
        added = p5_advice_member_delta(read_text(root, VBASE_SCREENING_SPEC) or "",
                                      source_subjects[P5_ADVICE_SPEC][1].decode("utf-8"))
        if added is None or not tag or not p5_advice_inverse_verified(
                root, git_root, source, revoked, protected_rows, added):
            return invalid("the recorded withdrawal lacks its protected source-only inverse")
        return "reverted", None, [], []

    for path, (entry, body) in source_subjects.items():
        if (body != read_bytes(root, path) or entry != local_git(git_root, "ls-tree", "-z", head, "--", path)
                or (tag and entry != local_git(git_root, "ls-tree", "-z", protected, "--", path))):
            return invalid(f"the worktree and exact Git subjects disagree at {path}")
    scopes = {STATUS: (P5_ADVICE_STATUS_PREFIX,), OPENSPEC_README: (P5_ADVICE_INDEX_PREFIX,)}
    counts = {STATUS: (P5_ADVICE_COUNT_SCOPE,)}
    stale = tag and local_git(git_root, "merge-base", "--is-ancestor", protected, head) is None
    if (not p5_advice_authority(root, identity) or not git_routes_match(root, git_root, source, scopes)
            or not git_routes_match(root, git_root, head, scopes)
            or (tag and not git_routes_match(root, git_root, protected, scopes))
            or (stale and not git_routes_match(root, git_root, protected, counts))):
        return invalid("the exact adoption authority routes disagree")
    return ("effective", read_text(root, P5_ADVICE_SPEC), [], []) if tag else ("staged", None, [], [])


def p5_advice_delta(root, findings):
    predecessor = read_text(root, VBASE_SCREENING_SPEC) or ""
    successor = read_text(root, P5_ADVICE_SPEC) or ""
    added = p5_advice_member_delta(predecessor, successor)
    if added is None:
        findings.append("POLARIS source-example advice: cannot count the screened and advisory members")
        return 0
    return added


def p5_advice_member_delta(predecessor, successor):
    ident = VBASE_SCREENING_REPLACES[0]
    counts = []
    for text in (predecessor, successor):
        members = [len(block["scenarios"]) for block in _polaris_blocks_manual(text)
                   if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        if len(members) != 1:
            return None
        counts.append(members[0])
    return counts[1] - counts[0]


def p5_advice_inverse_verified(root, git_root, source, identity, protected_rows, added):
    withdrawal = [row for row in protected_rows if row.split("|")[1].strip() == identity]
    if len(withdrawal) != 1:
        return False
    commit = withdrawal[0].split("|")[3].strip().strip("`")
    protected = "refs/remotes/origin/main"
    parents = local_git(git_root, "rev-list", "--parents", "-n1", commit)
    if (parents is None or len(parents.split()) != 2
            or local_git(git_root, "merge-base", "--is-ancestor", source, commit) is None
            or local_git(git_root, "merge-base", "--is-ancestor", commit, protected) is None
            or local_git(git_root, "merge-base", "--is-ancestor", commit, "HEAD") is None
            or not p5_advice_authority(root, None, candidate_only=True)
            or scoped_route_lines(read_text(root, STATUS) or "", (P5_ADVICE_COUNT_SCOPE,))):
        return False

    def changed_lines(before, after):
        diff = local_git(git_root, "diff", "--binary", "--no-color", "--no-ext-diff", "--no-textconv",
                         "--no-renames", "--no-indent-heuristic", "--diff-algorithm=myers",
                         "--src-prefix=a/", "--dst-prefix=b/", "--unified=0", before, after, "--")
        if not diff:
            return None
        # Later changes can shift hunks and blob identities. Compare the paths,
        # modes, hunk boundaries and exact added or removed bytes.
        return [b"@@" if line.startswith(b"@@ ") else line
                for line in diff.split(b"\n") if not line.startswith(b"index ")]

    def count_deletion(revision):
        raw = local_git(git_root, "show", f"{revision}:{STATUS}")
        if raw is None:
            return None
        try:
            body = raw.decode("utf-8")
        except UnicodeDecodeError:
            return None
        counts = scoped_route_lines(body, (P5_ADVICE_COUNT_SCOPE,))
        screening = scoped_route_lines(body, (VBASE_PHASE_PREFIXES[1],))
        advice = P5_ADVICE_COUNT.fullmatch(counts[0]) if len(counts) == 1 else None
        base = VBASE_STATUS_ACTIVE.fullmatch(screening[0]) if len(screening) == 1 else None
        if not advice or not base or (int(advice[1]), int(advice[2])) != (int(base[1]), int(base[2]) + added):
            return None
        return b"-" + counts[0].encode("utf-8")

    reverse = changed_lines(source, f"{source}^")
    source_count = count_deletion(source)
    current_count = count_deletion(f"{commit}^")
    if reverse is None or source_count is None or current_count is None or reverse.count(source_count) != 1:
        return False
    # An authorized later addition can update the derived count before this
    # inverse. It is the only substituted line in the exact reverse patch.
    expected = [current_count if line == source_count else line for line in reverse]
    if changed_lines(f"{commit}^", commit) != expected:
        return False
    for path in P5_ADVICE_SUBJECTS:
        if read_bytes(root, path) is not None or any(
                local_git(git_root, "ls-tree", "-z", ref, "--", path) != b""
                for ref in (f"{source}^", commit, "HEAD", protected)):
            return False
    for path, prefixes in (
        (STATUS, (P5_ADVICE_STATUS_PREFIX, P5_ADVICE_COUNT_SCOPE)),
        (OPENSPEC_README, (P5_ADVICE_INDEX_PREFIX,)),
    ):
        bodies = [local_git(git_root, "show", f"{ref}:{path}")
                  for ref in (f"{source}^", commit, "HEAD", protected)]
        try:
            scopes = [scoped_route_lines(body.decode("utf-8"), prefixes) if body is not None else None
                      for body in bodies]
        except UnicodeDecodeError:
            return False
        expected = [] if path == STATUS else [P5_ADVICE_CANDIDATE_INDEX]
        if any(scope != expected for scope in scopes):
            return False
    return True


def is_choice_row(line):
    return _is_reviewed_version_row(line, CHOICE_TAG, CHOICE_SUBJECTS)


def choice_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_choice_row(line)]


def choice_disposition(root, rows):
    if CHOICE_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), CHOICE_TAG,
                                    CHOICE_SUBJECTS, plain_revert=True)
    return None


def p5_advice_effective(root):
    """The v2.36 source-example advice text only while that version is effective."""
    state, text, records, subjects = p5_advice_binding(root)
    return (text if state == "effective" else None), records, subjects


def choice_binding(root):
    """Apply the choice floor only over the effective v2.36 source-example advice REQ-034."""
    return _reviewed_version_binding(
        root, choice_rows(root), choice_disposition,
        version_tag=CHOICE_TAG, subjects_map=CHOICE_SUBJECTS, spec=CHOICE_SPEC,
        predecessor=p5_advice_effective, predecessor_label="v2.36 source-example advice", version="v2.37",
        label="choice floor",
    )


def choice_delta(root, findings):
    """Scenarios the choice floor adds to REQ-034 over the source-example advice, counted from both texts."""
    added = p5_advice_member_delta(read_text(root, P5_ADVICE_SPEC) or "", read_text(root, CHOICE_SPEC) or "")
    if added is None:
        findings.append("POLARIS choice floor: cannot count predecessor and successor for 034")
        return 0
    return added


def is_migpar_row(line):
    return _is_reviewed_version_row(line, MIGPAR_TAG, MIGPAR_SUBJECTS)


def migpar_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_migpar_row(line)]


def migpar_disposition(root, rows):
    if MIGPAR_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), MIGPAR_TAG,
                                    MIGPAR_SUBJECTS, plain_revert=True)
    return None


def migpar_binding(root):
    """Apply the migration parity only over the effective v2.37 choice floor REQ-034."""
    return _reviewed_version_binding(
        root, migpar_rows(root), migpar_disposition,
        version_tag=MIGPAR_TAG, subjects_map=MIGPAR_SUBJECTS, spec=MIGPAR_SPEC,
        predecessor=choice_binding, predecessor_label="v2.37 choice floor", version="v2.38",
        label="migration parity",
    )


def migpar_delta(root, findings):
    """Scenarios the migration parity adds to REQ-034 over the choice floor, counted from both texts."""
    added = p5_advice_member_delta(read_text(root, CHOICE_SPEC) or "", read_text(root, MIGPAR_SPEC) or "")
    if added is None:
        findings.append("POLARIS migration parity: cannot count predecessor and successor for 034")
        return 0
    return added


def is_impfacts_row(line):
    return _is_reviewed_version_row(line, IMPFACTS_TAG, IMPFACTS_SUBJECTS)


def impfacts_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_impfacts_row(line)]


def impfacts_disposition(root, rows):
    if IMPFACTS_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), IMPFACTS_TAG,
                                    IMPFACTS_SUBJECTS, plain_revert=True)
    return None


def impfacts_binding(root):
    """Apply the lexical import facts only over the effective v2.38 migration parity REQ-034."""
    return _reviewed_version_binding(
        root, impfacts_rows(root), impfacts_disposition,
        version_tag=IMPFACTS_TAG, subjects_map=IMPFACTS_SUBJECTS, spec=IMPFACTS_SPEC,
        predecessor=migpar_binding, predecessor_label="v2.38 migration parity", version="v2.39",
        label="import facts",
    )


def impfacts_delta(root, findings):
    """Scenarios the import facts add to REQ-034 over the migration parity, counted from both texts."""
    added = p5_advice_member_delta(read_text(root, MIGPAR_SPEC) or "", read_text(root, IMPFACTS_SPEC) or "")
    if added is None:
        findings.append("POLARIS import facts: cannot count predecessor and successor for 034")
        return 0
    return added


def is_walk_row(line):
    return _is_reviewed_version_row(line, WALK_TAG, WALK_SUBJECTS)


def walk_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_walk_row(line)]


def walk_disposition(root, rows):
    if WALK_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), WALK_TAG,
                                    WALK_SUBJECTS, plain_revert=True)
    return None


def is_tnames_row(line):
    return _is_reviewed_version_row(line, TNAMES_TAG, TNAMES_SUBJECTS)


def tnames_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_tnames_row(line)]


def tnames_disposition(root, rows):
    if TNAMES_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), TNAMES_TAG,
                                    TNAMES_SUBJECTS, plain_revert=True)
    return None


def walk_binding(root):
    """Apply the figure walks only over the effective v2.39 import facts REQ-034."""
    return _reviewed_version_binding(
        root, walk_rows(root), walk_disposition,
        version_tag=WALK_TAG, subjects_map=WALK_SUBJECTS, spec=WALK_SPEC,
        predecessor=impfacts_binding, predecessor_label="v2.39 import facts", version="v2.40",
        label="figure walks",
    )


def walk_delta(root, findings):
    """Scenarios the figure walks add to REQ-034 over the import facts, counted from both texts."""
    added = p5_advice_member_delta(read_text(root, IMPFACTS_SPEC) or "", read_text(root, WALK_SPEC) or "")
    if added is None:
        findings.append("POLARIS figure walks: cannot count predecessor and successor for 034")
        return 0
    return added


def tnames_binding(root):
    """Apply the test-name recognizers only over the effective v2.40 figure walks REQ-034."""
    return _reviewed_version_binding(
        root, tnames_rows(root), tnames_disposition,
        version_tag=TNAMES_TAG, subjects_map=TNAMES_SUBJECTS, spec=TNAMES_SPEC,
        predecessor=walk_binding, predecessor_label="v2.40 figure walks", version="v2.42",
        label="test-name recognizers",
    )


def tnames_delta(root, findings):
    """Scenarios the test-name recognizers add to REQ-034 over the figure walks, counted from both texts."""
    added = p5_advice_member_delta(read_text(root, WALK_SPEC) or "", read_text(root, TNAMES_SPEC) or "")
    if added is None:
        findings.append("POLARIS test-name recognizers: cannot count predecessor and successor for 034")
        return 0
    return added


def is_migbound_row(line):
    return _is_reviewed_version_row(line, MIGBOUND_TAG, MIGBOUND_SUBJECTS)


def migbound_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_migbound_row(line)]


def migbound_disposition(root, rows):
    if MIGBOUND_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), MIGBOUND_TAG,
                                    MIGBOUND_SUBJECTS, plain_revert=True)
    return None


def is_rough_row(line):
    return _is_reviewed_version_row(line, ROUGH_TAG, ROUGH_SUBJECTS)


def rough_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_rough_row(line)]


def rough_disposition(root, rows):
    if ROUGH_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), ROUGH_TAG,
                                    ROUGH_SUBJECTS, plain_revert=True)
    return None


def migbound_binding(root):
    """Apply the migration bounds only over the effective v2.42 test-name recognizers REQ-034."""
    return _reviewed_version_binding(
        root, migbound_rows(root), migbound_disposition,
        version_tag=MIGBOUND_TAG, subjects_map=MIGBOUND_SUBJECTS, spec=MIGBOUND_SPEC,
        predecessor=tnames_binding, predecessor_label="v2.42 test-name recognizers", version="v2.43",
        label="migration bounds",
    )


def migbound_delta(root, findings):
    """Scenarios the migration bounds add to REQ-034 over the test-name recognizers, counted from both texts."""
    added = p5_advice_member_delta(read_text(root, TNAMES_SPEC) or "", read_text(root, MIGBOUND_SPEC) or "")
    if added is None:
        findings.append("POLARIS migration bounds: cannot count predecessor and successor for 034")
        return 0
    return added


def rough_binding(root):
    """Apply the rough-edge markers only over the effective v2.43 migration bounds REQ-034."""
    return _reviewed_version_binding(
        root, rough_rows(root), rough_disposition,
        version_tag=ROUGH_TAG, subjects_map=ROUGH_SUBJECTS, spec=ROUGH_SPEC,
        predecessor=migbound_binding, predecessor_label="v2.43 migration bounds", version="v2.44",
        label="rough-edge markers",
    )


def rough_delta(root, findings):
    """Scenarios the rough-edge markers add to REQ-034 over the migration bounds, counted from both texts."""
    added = p5_advice_member_delta(read_text(root, MIGBOUND_SPEC) or "", read_text(root, ROUGH_SPEC) or "")
    if added is None:
        findings.append("POLARIS rough-edge markers: cannot count predecessor and successor for 034")
        return 0
    return added


def vbase_screening_git_matches(root, git_root, claims, historical, retirement, source, commit):
    rows = git_adoption_rows(git_root, commit)
    if (vbase_screening_rows(rows) != claims
            or [row for row in rows if is_vbase_row(row)] != historical
            or local_git(git_root, "merge-base", "--is-ancestor", source, commit) is None):
        return False
    for required in (*claims, *historical, retirement):
        identity = required.split("|")[1].strip()
        if [row for row in rows if row.split("|")[1].strip() == identity] != [required]:
            return False
    historical_body = local_git(git_root, "show", f"{commit}:{VBASE_SPEC}")
    if historical_body is None or sha(historical_body) != VBASE_SUBJECTS[VBASE_SPEC]:
        return False
    for path in VBASE_SCREENING_SUBJECTS:
        source_entry = local_git(git_root, "ls-tree", "-z", source, "--", path)
        if (not source_entry or not source_entry.startswith(b"100644 blob ")
                or local_git(git_root, "ls-tree", "-z", commit, "--", path) != source_entry
                or local_git(git_root, "show", f"{source}:{path}") != read_bytes(root, path)):
            return False
    return True


def vbase_screening_authority_route_error(root, identity):
    status = read_text(root, STATUS) or ""
    route = f"changes/{VBASE_SCREENING_CHANGE}"
    activation = (
        f"{VBASE_SCREENING_STATUS_PREFIX}{VBASE_SCREENING_HOME}) records {identity}. "
        "The correction applies when its protected adoption and exact version tag are verified."
    )
    if scoped_route_lines(status, (VBASE_SCREENING_STATUS_PREFIX,)) != [activation]:
        return f"`{STATUS}` does not route the exact screening adoption and activation condition"

    index = read_text(root, OPENSPEC_README) or ""
    prefix = f"| [`{VBASE_SCREENING_CHANGE}`]("
    expected_row = (
        f"{prefix}{route}) | Qualifies the diagnostic details and reasons emitted by a derived-base view | "
        f"`{identity}` in [AGENT-ADOPTIONS.md](../{AGENT_ADOPTIONS}) applies when the exact version tag "
        f"is verified, `{VBASE_SCREENING_TAG}` | [Semantic delta]({route}/SEMANTIC-DELTA.md) |"
    )
    if scoped_route_lines(index, (prefix,)) != [expected_row]:
        return f"`{OPENSPEC_README}` does not route the exact screening row and tag"
    return None


def scoped_route_lines(body, prefixes):
    return [line.strip() for line in visible_route_lines(body) if line.strip().startswith(prefixes)]


def vbase_screening_routes_match(root, git_root, commit, *, compare_census):
    scopes = {
        STATUS: (VBASE_STATUS_PREFIX, VBASE_SCREENING_STATUS_PREFIX),
        OPENSPEC_README: (f"| [`{VBASE_CHANGE}`](", f"| [`{VBASE_SCREENING_CHANGE}`]("),
    }
    if compare_census:
        projection = read_bytes(root, VBASE_SCREENING_PROJECTION)
        if projection is None or projection != local_git(
            git_root, "show", f"{commit}:{VBASE_SCREENING_PROJECTION}"
        ):
            return False
        scopes[STATUS] += VBASE_PHASE_PREFIXES
    return git_routes_match(root, git_root, commit, scopes)


def git_routes_match(root, git_root, commit, scopes):
    for rel, prefixes in scopes.items():
        authored = read_text(root, rel)
        protected = local_git(git_root, "show", f"{commit}:{rel}")
        if authored is None or protected is None:
            return False
        try:
            protected = protected.decode("utf-8")
        except UnicodeDecodeError:
            return False
        present = scoped_route_lines(authored, prefixes)
        if not present or present != scoped_route_lines(protected, prefixes):
            return False
    return True


def vbase_figplan_verified(git_root, commit, expected_rows):
    rows = git_adoption_rows(git_root, commit)
    if (len(expected_rows) != 1
            or [row for row in rows if is_figplan_row(row)] != expected_rows
            or local_git(git_root, "merge-base", "--is-ancestor",
                         VBASE_SCREENING_PREDECESSOR, commit) is None):
        return False
    identity, _date, source, _what, _why, _inverse, _tag = [
        cell.strip() for cell in expected_rows[0].split("|")[1:-1]
    ]
    if identity != "A-65" or source != f"`{VBASE_SCREENING_PREDECESSOR}`":
        return False
    if (sum(row.split("|")[1].strip() == identity for row in rows) != 1
            or recorded_disposition(
                git_root, identity, VBASE_SCREENING_PREDECESSOR, FIGPLAN_TAG,
                FIGPLAN_SUBJECTS, plain_revert=True, ledger_rows=rows,
            )):
        return False
    for rel, digest in FIGPLAN_SUBJECTS.items():
        mode = local_git(git_root, "ls-tree", "-z", commit, "--", rel)
        body = local_git(git_root, "show", f"{commit}:{rel}")
        if body is None or not mode or not mode.startswith(b"100644 blob ") or sha(body) != digest:
            return False
    return True


def vbase_retirement_verified(git_root, commit):
    changes = local_git(git_root, "diff-tree", "--no-commit-id", "--name-only", "-z", "-r", commit)
    if changes is None or set(changes.split(b"\0")) - {b""} != {
        rel.encode("ascii") for rel in VBASE_SCREENING_RETIREMENT_SUBJECTS
    }:
        return False
    for rel, digest in VBASE_SCREENING_RETIREMENT_SUBJECTS.items():
        body = local_git(git_root, "show", f"{commit}:{rel}")
        mode = local_git(git_root, "ls-tree", "-z", commit, "--", rel)
        if body is None or not mode or not mode.startswith(b"100644 blob ") or sha(body) != digest:
            return False
    return True


def url_source_contract_findings(root):
    """Verify the reviewed amendment in its actual contract homes."""
    body = read_bytes(root, URL_SOURCE_REPLACEMENTS)
    if body is None or sha(body) != URL_SOURCE_REPLACEMENTS_SHA:
        return [f"URL declared-source: `{URL_SOURCE_REPLACEMENTS}` differs from the reviewed ledger"]
    groups = {rel: {} for rel in URL_SOURCE_RFC_PATHS}
    for row in json.loads(body)["contract_sections"]:
        paths = ((row["source"], row["mirror_source"]) if row["operation"] == "MODIFIED"
                 else tuple(rel for rel in URL_SOURCE_RFC_PATHS if rel.endswith(URL_SOURCE_RFC_MODULES[1])))
        for rel in paths:
            groups[rel][row["clause"]] = row["new_clause_sha256"]
    findings = []
    for rel, expected in groups.items():
        text = read_text(root, rel) or ""
        found = {clause: [] for clause in expected}
        starts = list(RFC_CLAUSE_START.finditer(text))
        stops = [m.start() for m in starts[1:]] + [len(text)]
        for start, stop in zip(starts, stops):
            ident = start.group(1)
            if ident in found:
                # The new clause precedes the next subsection heading, which
                # belongs to the preserved RFC3-17 section.
                if ident == "RFC3-16(d)":
                    section = RFC_SECTION_START.search(text, start.end(), stop)
                    if section:
                        stop = section.start()
                found[ident].append(sha(text[start.start():stop].encode("utf-8")))
        for ident, digest in expected.items():
            if found[ident] != [digest]:
                findings.append(f"URL declared-source: installed `{rel}` does not contain the exact reviewed {ident}")
    return findings


def check_digest_act(act, tag, aggregate, record, manifest_bytes, r1, r2):
    """R1 and R2 checks of one digest act; its signed table, or None."""
    rows = {path: digest for digest, path in
            ROW.findall(manifest_bytes.decode("utf-8"))}
    phrase = re.compile(
        rf"^{re.escape(act['label'])}: ([0-9a-f]{{64}})$", re.M)
    args = phrase.findall(record)
    if len(args) != 1:
        r1.append(f"{tag}: record carries {len(args)} phrase lines, "
                  "expected exactly 1")
        return None
    if args[0] != sha(manifest_bytes):
        r1.append(f"{tag}: stale act — the phrase argument is not the "
                  f"sha256 of `{act['manifest']}`")
    agg = phrase.findall(aggregate)
    if args[0] not in agg:
        r1.append(f"{tag}: stale act — the aggregate act record does "
                  "not carry this record's phrase")
    table = {p: (pred, succ) for p, pred, succ in
             ACT_TABLE_ROW.findall(record)}
    if {p: s for p, (_pr, s) in table.items()} != rows:
        r2.append(f"{tag}: the record's successor column differs from "
                  "the manifest rows")
    return table


def poc_reference():
    import prepare_three_surface_poc_governedby_reference_recording as reference
    return reference


def successors_for(root, child):
    successors = child.get("successors", ())
    reference = poc_reference()
    if child["key"] == "poc" and reference.transaction_present(root):
        return successors + ({
            "kind": "versioned", "package": reference.KEY, "version": reference.VERSION,
            "record": reference.RECORD.as_posix(), "manifest": reference.MANIFEST.as_posix(),
            "proposed": (reference.CANDIDATE / "proposed").as_posix(),
        },)
    return successors


DATE_LINE = re.compile(r"^Date: (\d{4}-\d{2}-\d{2})$", re.M)
DIFF_TARGET = re.compile(r"^\+\+\+ b/(\S[^\n]*)$", re.M)


def versioned_marker(entry):
    return (f"<!-- versioned-signoff:{entry['package']}:"
            f"v{entry['version']} -->")


def check_versioned(entry, tag, aggregate, record, r1):
    """R1 checks of one version-tagged sign-off record."""
    want = (f"Package: {entry['package']}",
            f"Version: {entry['version']}",
            f"Tag: {entry['package']}-v{entry['version']}")
    missing = [w for w in want if w not in record.splitlines()]
    if missing:
        r1.append(f"{tag}: sign-off record lacks {missing}")
    count = aggregate.count(versioned_marker(entry))
    if count != 1:
        r1.append(f"{tag}: aggregate act record carries the sign-off "
                  f"block {count} times, expected 1")


def aggregate_position(entry, aggregate, record):
    """Where an entry's binding sits in the append-only aggregate record."""
    if entry.get("kind", "digest") == "versioned":
        pos = aggregate.find(versioned_marker(entry))
        return pos if pos >= 0 and aggregate.count(
            versioned_marker(entry)) == 1 else None
    m = re.search(rf"^{re.escape(entry['label'])}: ([0-9a-f]{{64}})$",
                  record, re.M)
    pos = aggregate.find(f"{entry['label']}: {m.group(1)}") if m else -1
    return pos if pos >= 0 else None


def package_patches(root, proposed):
    """{target path: [patch paths]} for every patch under `proposed`."""
    out = {}
    base = root / proposed
    for patch in sorted(base.glob("*.patch")) if base.is_dir() else ():
        rel = patch.relative_to(root).as_posix()
        targets = DIFF_TARGET.findall(patch.read_text(encoding="utf-8"))
        for target in targets or ["<no target>"]:
            out.setdefault(target, []).append(rel)
    return out


# Equal patch bytes, target path, body bytes and application mode yield equal
# reverse results. Retain at most 64 MiB of result bytes per active process. An
# uncached result still follows the same Git path after either limit is reached.
_REVERSE_CACHE_ENTRIES = 128
_REVERSE_CACHE_RESULT_BYTES = 512 * 1024
_REVERSE_CACHE = None


@contextlib.contextmanager
def _reverse_cache_scope():
    """Reuse an enclosing selftest cache or own a cache for one invocation."""
    global _REVERSE_CACHE
    if _REVERSE_CACHE is not None:
        yield
        return
    _REVERSE_CACHE = {}
    try:
        yield
    finally:
        _REVERSE_CACHE = None


def reverse_apply(root, patch_rel, target_rel, body, *, zero_context=False):
    """`body` with the patch reversed, or None when it does not reverse."""
    try:
        patch = (root / patch_rel).read_bytes()
    except OSError:
        # A removed or unreadable patch fails the reversal, as Git did.
        return None
    cache = _REVERSE_CACHE
    if cache is None:
        return _reverse_apply(patch, target_rel, body, zero_context=zero_context)
    key = (sha(patch), Path(target_rel).as_posix(), sha(body), zero_context)
    if key in cache:
        return cache[key]
    result = _reverse_apply(patch, target_rel, body, zero_context=zero_context)
    if len(cache) < _REVERSE_CACHE_ENTRIES and (
            result is None or len(result) <= _REVERSE_CACHE_RESULT_BYTES):
        cache[key] = result
    return result


def _reverse_apply(patch, target_rel, body, *, zero_context=False):
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / target_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        options = ["--unidiff-zero"] if zero_context else []
        done = subprocess.run(
            ["git", "apply", "-R", "--whitespace=nowarn", *options, "-"],
            input=patch, cwd=tmp, capture_output=True)
        return dest.read_bytes() if done.returncode == 0 else None


def bytes_at(root, path, after):
    """`path` as a successor left it: the tree with the patch to it of each
    successor signed after that one (`after`, in act order) reversed, newest
    first. None when the file is missing or a reversal fails."""
    body = read_bytes(root, path)
    for later in reversed(after):
        found = package_patches(root, later["proposed"]).get(path, [])
        if body is not None and len(found) == 1:
            reference = later.get("package") == poc_reference().KEY
            if reference and not reference_signed(root):
                return None
            body = reverse_apply(root, found[0], path, body, zero_context=reference)
    return body


def compose_versioned(root, later, ltag, rows, r2, after=()):
    """Follow one version-tagged successor over the rows reached so far.

    A versioned record carries no predecessor column, so the package's own
    patches stand in for it: each moved row must have exactly one patch, and
    reversing it over the bytes that hash to the successor row must yield
    exactly the row the chain reached. A row with no patch must not move.
    """
    lrows = {path: digest for digest, path in
             ROW.findall(read_text(root, later["manifest"]) or "")}
    patches = package_patches(root, later["proposed"])
    for target in sorted(set(patches) - set(lrows)):
        r2.append(f"{ltag}: patch {patches[target]} targets `{target}`, "
                  "which the manifest does not carry")
    for path, succ in sorted(lrows.items()):
        if path not in rows:
            r2.append(f"{ltag}: `{path}` is not a subject of this child")
            continue
        found = patches.get(path, [])
        if len(found) > 1:
            r2.append(f"{ltag}: broken chain — {len(found)} patches target "
                      f"`{path}`")
        elif found:
            current = bytes_at(root, path, after)
            prior = (reverse_apply(root, found[0], path, current,
                                   zero_context=later.get("package") == poc_reference().KEY)
                     if current is not None and sha(current) == succ else None)
            if prior is None or sha(prior) != rows[path]:
                r2.append(f"{ltag}: broken chain — reversing `{found[0]}` "
                          f"over the successor row of `{path}` does not "
                          "yield the row the chain reached")
        elif succ != rows[path]:
            r2.append(f"{ltag}: broken chain — the row of `{path}` moved "
                      "with no patch")
        rows[path] = succ


def child_outcome(root, child, aggregate, r1, r2):
    """R1 and R2 of one reconciled child and its successors; returns the subjects seen."""
    subjects_seen = 0
    tag = f"{child['key']} ({child['bead']})"
    record = read_text(root, child["record"])
    manifest_bytes = read_bytes(root, child["manifest"])
    if record is None:
        r1.append(f"{tag}: missing child — no terminal record "
                  f"`{child['record']}`; the outcome is Unknown")
        return subjects_seen
    if manifest_bytes is None:
        r1.append(f"{tag}: package manifest `{child['manifest']}` missing")
        return subjects_seen
    rows = {path: digest for digest, path in
            ROW.findall(manifest_bytes.decode("utf-8"))}
    if child["kind"] == "digest":
        if check_digest_act(child, tag, aggregate, record, manifest_bytes,
                            r1, r2) is None:
            return subjects_seen
    else:
        check_versioned(child, tag, aggregate, record, r1)
    # Later successors compose in act order over the rows reached so far.
    reached = ACT_INSTANT.findall(record)
    position = aggregate_position(child, aggregate, record)
    # A digest act carries an act instant and no `Date:` line; its date
    # is the instant's, so a versioned successor can follow it.
    dates = DATE_LINE.findall(record) or [i[:10] for i in reached]
    successors = successors_for(root, child)
    for index, later in enumerate(successors):
        name = Path(later["record"]).name
        ltag = f"{tag} successor {name}"
        ltext = read_text(root, later["record"])
        lmanifest = read_bytes(root, later["manifest"])
        if ltext is None:
            r1.append(f"{ltag}: missing successor — no terminal record "
                      f"`{later['record']}`; the outcome is Unknown")
            continue
        if lmanifest is None:
            r1.append(f"{ltag}: package manifest `{later['manifest']}` "
                      "missing")
            continue
        if later.get("package") == poc_reference().KEY:
            expected = [p.as_posix() for p in poc_reference().SUBJECTS]
            if [p for _sha, p in ROW.findall(lmanifest.decode())] != expected:
                r2.append(f"{ltag}: manifest is not exactly the six P115 subjects")
            if not reference_signed(root):
                r1.append(f"{ltag}: incomplete or invalid exact P115 sign-off transaction")
                continue
        if later.get("kind", "digest") == "versioned":
            # No act instant: order is the append-only aggregate record
            # (strictly after the act before it) and a date on or after.
            check_versioned(later, ltag, aggregate, ltext, r1)
            lpos = aggregate_position(later, aggregate, ltext)
            ldates = DATE_LINE.findall(ltext)
            if lpos is None or position is None or not lpos > position:
                r2.append(f"{ltag}: its aggregate block does not follow "
                          "the act before it")
            if (len(ldates) != 1 or len(dates) != 1
                    or not ldates[0] >= dates[0]):
                r2.append(f"{ltag}: date {ldates} is not on or after the "
                          f"act before it {dates}")
            position, dates = lpos, ldates
            compose_versioned(root, later, ltag, rows, r2, after=[
                s for s in successors[index + 1:]
                if s.get("kind", "digest") == "versioned"])
            continue
        table = check_digest_act(later, ltag, aggregate, ltext, lmanifest,
                                 r1, r2)
        if table is None:
            continue
        instant = ACT_INSTANT.findall(ltext)
        if (len(instant) != 1 or len(reached) != 1
                or not instant[0] > reached[0]):
            r2.append(f"{ltag}: act instant {instant} is not strictly "
                      f"later than the act before it {reached}")
        reached = instant
        position = aggregate_position(later, aggregate, ltext)
        dates = [i[:10] for i in instant]
        for path, (pred, succ) in sorted(table.items()):
            if path not in rows:
                r2.append(f"{ltag}: `{path}` is not a subject of this "
                          "child")
            elif pred != rows[path]:
                r2.append(f"{ltag}: broken chain — the predecessor of "
                          f"`{path}` is not the row the chain reached")
            else:
                rows[path] = succ
    for path, digest in sorted(rows.items()):
        subjects_seen += 1
        current = read_bytes(root, path)
        if current is None:
            r2.append(f"{tag}: signed subject `{path}` missing")
        elif sha(current) != digest:
            r2.append(f"{tag}: stale digest — `{path}` no longer hashes "
                      "to its signed row")
    return subjects_seen


def poc_outcome(root, child, aggregate, r1, r2):
    """`child_outcome` for the POC child, with its D10 arm.

    The POC child's R2 holds the Three-Surface POC specification's six
    subjects to the rows its pre-D10 acts recorded. Under D10 that
    specification is an agent's to amend (VIS-4, CC-REV-2), so a mismatch is
    judged by `d10_supersession.judge`: without D10 it stands; with D10 it
    stands, with a finding naming the missing row, unless every later change
    to the POC change directory is adopted by an AGENT-ADOPTIONS.md row, and
    then the whole chain is re-checked over the subjects as D10 found them.
    """
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import d10_supersession
    found = []
    seen = child_outcome(root, child, aggregate, r1, found)

    def recheck(files):
        global _FILES_OVERRIDE
        again, previous = [], _FILES_OVERRIDE
        _FILES_OVERRIDE = (d10_supersession.POC_CHANGE, files)
        try:
            child_outcome(root, child, aggregate, [], again)
        finally:
            _FILES_OVERRIDE = previous
        return again

    r2.extend(d10_supersession.judge(root, found, recheck))
    return seen


def check_outcomes(root, report):
    aggregate = read_text(root, AGGREGATE) or ""
    r1, r2, subjects_seen, records = [], [], 0, 0
    for child in CHILDREN:
        records += 1 + len(successors_for(root, child))
        outcome = poc_outcome if child["key"] == "poc" else child_outcome
        subjects_seen += outcome(root, child, aggregate, r1, r2)
    # Signed Polaris additions (reconciled-child hook): each installed
    # addition is a child whose terminal outcome is its versioned sign-off.
    additions = polaris_additions(root)
    for change, spec_rel in additions:
        tag = f"polaris addition {change}"
        if change in ADOPTED_ADDITIONS:
            rel, module = ADOPTED_ADDITIONS[change]
            records += 1
            text = read_text(root, rel)
            if text is None:
                r1.append(f"{tag}: unsigned addition — `{spec_rel}` is "
                          f"installed but its declared adoption record `{rel}` "
                          "is missing; the outcome is Unknown")
                continue
            # The recorder's rendered shape: one date, one instant, and the
            # installed path as its own code span (a substring is not a name).
            if (len(DATE_LINE.findall(text)) != 1
                    or len(RECORDED_LINE.findall(text)) != 1):
                r1.append(f"{tag}: adoption record `{rel}` is not in its "
                          "recorder's shape (one `Date:` and one `Recorded "
                          "at (UTC):` line)")
            if f"`{spec_rel}`" not in text:
                r1.append(f"{tag}: adoption record `{rel}` does not name the "
                          f"installed `{spec_rel}`")
            if addition_records(root, change):
                r1.append(f"{tag}: a `{SIGNOFF_RECORD_GLOB}` record also names "
                          "an addition whose terminal record is its adoption")
            subjects_seen += 1
            digest, review_rel = adopted_binding(module)
            review = read_text(root, review_rel) or ""
            head = [ln for ln in review.splitlines() if ln.strip()][:4]
            bound = [m.group(1) for ln in head if (m := SUBJECT_LINE.match(ln))]
            if bound != [digest]:
                r2.append(f"{tag}: the confirming review `{review_rel}` does "
                          f"not bind the digest `{module}` holds on a "
                          "`Subject SHA-256:` head line")
            current = read_bytes(root, spec_rel) or b""
            if sha(current) != digest:
                r2.append(f"{tag}: stale digest — `{spec_rel}` is not the "
                          f"bytes `{module}` binds")
            continue
        found = addition_records(root, change)
        records += max(1, len(found))
        if not found:
            r1.append(f"{tag}: unsigned addition — `{spec_rel}` is installed "
                      f"but no `{SIGNOFF_RECORD_GLOB}` record names `Package: "
                      f"{change}`, and `ADOPTED_ADDITIONS` declares no adoption "
                      "record for it; the outcome is Unknown")
        versions = [v for _r, _t, v in found]
        for version in sorted({v for v in versions if v and versions.count(v) > 1}):
            r1.append(f"{tag}: {versions.count(version)} records sign version "
                      f"{version}; expected one")
        for rel, text, version in found:
            if version is None:
                r1.append(f"{tag}: `{rel}` carries no single `Version:` line")
                continue
            check_versioned({"package": change, "version": version},
                            f"{tag} ({Path(rel).name})", aggregate, text, r1)
    _amendment, agent_records, agent_subjects = declared_source_binding(root)
    declared_retired_by = declared_source_disposition(root)
    if declared_retired_by:
        records += 2
    elif not declared_source_absent(root):
        records += 1
        subjects_seen += len(DECLARED_SOURCE_SUBJECTS)
    r1 += agent_records
    r2 += agent_subjects
    url_retired_by = url_source_disposition(root, url_source_rows(root))
    url_amendment, url_records, url_subjects = url_source_binding(root)
    if url_retired_by:
        records += 2
    elif url_amendment is not None or url_records or url_subjects:
        records += 1
        subjects_seen += URL_SOURCE_BOUND_PARTS
    r1 += url_records
    r2 += url_subjects
    figure_retired_by = figure_disposition(root, figure_rows(root))
    figure_amendment, figure_records, figure_subjects = figure_binding(root)
    if figure_retired_by:
        records += 2
    elif figure_amendment is not None or figure_records or figure_subjects:
        records += 1
        subjects_seen += FIGURE_BOUND_PARTS
    r1 += figure_records
    r2 += figure_subjects
    derived_retired_by = derived_disposition(root, derived_rows(root))
    derived_amendment, derived_records, derived_subjects = derived_binding(root)
    if derived_retired_by:
        records += 2
    elif derived_amendment is not None or derived_records or derived_subjects:
        records += 1
        subjects_seen += DERIVED_BOUND_PARTS
    r1 += derived_records
    r2 += derived_subjects
    ledger_retired_by = ledger_disposition(root, ledger_rows(root))
    ledger_amendment, ledger_records, ledger_subjects = ledger_binding(root)
    if ledger_retired_by:
        records += 2
    elif ledger_amendment is not None or ledger_records or ledger_subjects:
        records += 1
        subjects_seen += LEDGER_BOUND_PARTS
    r1 += ledger_records
    r2 += ledger_subjects
    kinds_retired_by = kinds_disposition(root, kinds_rows(root))
    kinds_amendment, kinds_records, kinds_subjects = kinds_binding(root)
    if kinds_retired_by:
        records += 2
    elif kinds_amendment is not None or kinds_records or kinds_subjects:
        records += 1
        subjects_seen += KINDS_BOUND_PARTS
    r1 += kinds_records
    r2 += kinds_subjects
    reach_retired_by = reach_disposition(root, reach_rows(root))
    reach_amendment, reach_records, reach_subjects = reach_binding(root)
    if reach_retired_by:
        records += 2
    elif reach_amendment is not None or reach_records or reach_subjects:
        records += 1
        subjects_seen += REACH_BOUND_PARTS
    r1 += reach_records
    r2 += reach_subjects
    manifests_retired_by = manifests_disposition(root, manifests_rows(root))
    manifests_amendment, manifests_records, manifests_subjects = manifests_binding(root)
    if manifests_retired_by:
        records += 2
    elif manifests_amendment is not None or manifests_records or manifests_subjects:
        records += 1
        subjects_seen += MANIFESTS_BOUND_PARTS
    r1 += manifests_records
    r2 += manifests_subjects
    repairs_retired_by = repairs_disposition(root, repairs_rows(root))
    repairs_amendment, repairs_records, repairs_subjects = repairs_binding(root)
    if repairs_retired_by:
        records += 2
    elif repairs_amendment is not None or repairs_records or repairs_subjects:
        records += 1
        subjects_seen += REPAIRS_BOUND_PARTS
    r1 += repairs_records
    r2 += repairs_subjects
    maps_retired_by = maps_disposition(root, maps_rows(root))
    maps_amendment, maps_records, maps_subjects = maps_binding(root)
    if maps_retired_by:
        records += 2
    elif maps_amendment is not None or maps_records or maps_subjects:
        records += 1
        subjects_seen += MAPS_BOUND_PARTS
    r1 += maps_records
    r2 += maps_subjects
    bounds_retired_by = bounds_disposition(root, bounds_rows(root))
    bounds_amendment, bounds_records, bounds_subjects = bounds_binding(root)
    if bounds_retired_by:
        records += 2
    elif bounds_amendment is not None or bounds_records or bounds_subjects:
        records += 1
        subjects_seen += BOUNDS_BOUND_PARTS
    r1 += bounds_records
    r2 += bounds_subjects
    corr_retired_by = corr_disposition(root, corr_rows(root))
    corr_amendment, corr_records, corr_subjects = corr_binding(root)
    if corr_retired_by:
        records += 2
    elif corr_amendment is not None or corr_records or corr_subjects:
        records += 1
        subjects_seen += CORR_BOUND_PARTS
    r1 += corr_records
    r2 += corr_subjects
    coverage_retired_by = coverage_disposition(root, coverage_rows(root))
    coverage_amendment, coverage_records, coverage_subjects = coverage_binding(root)
    if coverage_retired_by:
        records += 2
    elif coverage_amendment is not None or coverage_records or coverage_subjects:
        records += 1
        subjects_seen += COVERAGE_BOUND_PARTS
    r1 += coverage_records
    r2 += coverage_subjects
    infra_retired_by = infra_disposition(root, infra_rows(root))
    infra_amendment, infra_records, infra_subjects = infra_binding(root)
    if infra_retired_by:
        records += 2
    elif infra_amendment is not None or infra_records or infra_subjects:
        records += 1
        subjects_seen += INFRA_BOUND_PARTS
    r1 += infra_records
    r2 += infra_subjects
    findpages_retired_by = findpages_disposition(root, findpages_rows(root))
    findpages_amendment, findpages_records, findpages_subjects = findpages_binding(root)
    if findpages_retired_by:
        records += 2
    elif findpages_amendment is not None or findpages_records or findpages_subjects:
        records += 1
        subjects_seen += FINDPAGES_BOUND_PARTS
    r1 += findpages_records
    r2 += findpages_subjects
    subsec_retired_by = subsec_disposition(root, subsec_rows(root))
    subsec_amendment, subsec_records, subsec_subjects = subsec_binding(root)
    if subsec_retired_by:
        records += 2
    elif subsec_amendment is not None or subsec_records or subsec_subjects:
        records += 1
        subjects_seen += SUBSEC_BOUND_PARTS
    r1 += subsec_records
    r2 += subsec_subjects
    reltype_retired_by = reltype_disposition(root, reltype_rows(root))
    reltype_amendment, reltype_records, reltype_subjects = reltype_binding(root)
    if reltype_retired_by:
        records += 2
    elif reltype_amendment is not None or reltype_records or reltype_subjects:
        records += 1
        subjects_seen += RELTYPE_BOUND_PARTS
    r1 += reltype_records
    r2 += reltype_subjects
    hero_retired_by = hero_disposition(root, hero_rows(root))
    hero_amendment, hero_records, hero_subjects = hero_binding(root)
    if hero_retired_by:
        records += 2
    elif hero_amendment is not None or hero_records or hero_subjects:
        records += 1
        subjects_seen += HERO_BOUND_PARTS
    r1 += hero_records
    r2 += hero_subjects
    readers_retired_by = readers_disposition(root, readers_rows(root))
    readers_amendment, readers_records, readers_subjects = readers_binding(root)
    if readers_retired_by:
        records += 2
    elif readers_amendment is not None or readers_records or readers_subjects:
        records += 1
        subjects_seen += READERS_BOUND_PARTS
    r1 += readers_records
    r2 += readers_subjects
    cont_retired_by = cont_disposition(root, cont_rows(root))
    cont_amendment, cont_records, cont_subjects = cont_binding(root)
    if cont_retired_by:
        records += 2
    elif cont_amendment is not None or cont_records or cont_subjects:
        records += 1
        subjects_seen += CONT_BOUND_PARTS
    r1 += cont_records
    r2 += cont_subjects
    model_retired_by = model_disposition(root, model_rows(root))
    model_amendment, model_records, model_subjects = model_binding(root)
    if model_retired_by:
        records += 2
    elif model_amendment is not None or model_records or model_subjects:
        records += 1
        subjects_seen += MODEL_BOUND_PARTS
    r1 += model_records
    r2 += model_subjects
    worth_retired_by = worth_disposition(root, worth_rows(root))
    worth_amendment, worth_records, worth_subjects = worth_binding(root)
    if worth_retired_by:
        records += 2
    elif worth_amendment is not None or worth_records or worth_subjects:
        records += 1
        subjects_seen += WORTH_BOUND_PARTS
    r1 += worth_records
    r2 += worth_subjects
    edit_account_retired_by = edit_account_disposition(root, edit_account_rows(root))
    edit_account_amendment, edit_account_records, edit_account_subjects = edit_account_binding(root)
    if edit_account_retired_by:
        records += 2
    elif edit_account_amendment is not None or edit_account_records or edit_account_subjects:
        records += 1
        subjects_seen += len(EDIT_ACCOUNT_SUBJECTS)
    r1 += edit_account_records
    r2 += edit_account_subjects
    readmit_retired_by = readmit_disposition(root, readmit_rows(root))
    readmit_amendment, readmit_records, readmit_subjects = readmit_binding(root)
    if readmit_retired_by:
        records += 2
    elif readmit_amendment is not None or readmit_records or readmit_subjects:
        records += 1
        subjects_seen += READMIT_BOUND_PARTS
    r1 += readmit_records
    r2 += readmit_subjects
    raw_read_amendment, raw_read_records, raw_read_subjects = raw_read_binding(root)
    if raw_read_amendment is not None or raw_read_records or raw_read_subjects:
        records += 1
        subjects_seen += len(RAW_READ_SUBJECTS)
    r1 += raw_read_records
    r2 += raw_read_subjects
    treeread_amendment, treeread_records, treeread_subjects = treeread_binding(root)
    if treeread_amendment is not None or treeread_records or treeread_subjects:
        records += 1
        subjects_seen += len(TREEREAD_SUBJECTS)
    r1 += treeread_records
    r2 += treeread_subjects
    verify_retired_by = verify_disposition(root, verify_rows(root))
    verify_amendment, verify_records, verify_subjects = verify_binding(root)
    if verify_retired_by:
        records += 2
    elif verify_amendment is not None or verify_records or verify_subjects:
        records += 1
        subjects_seen += VERIFY_BOUND_PARTS
    r1 += verify_records
    r2 += verify_subjects
    qfile_retired_by = qfile_disposition(root, qfile_rows(root))
    qfile_amendment, qfile_records, qfile_subjects = qfile_binding(root)
    if qfile_retired_by:
        records += 2
    elif qfile_amendment is not None or qfile_records or qfile_subjects:
        records += 1
        subjects_seen += QFILE_BOUND_PARTS
    r1 += qfile_records
    r2 += qfile_subjects
    scripted_grade_retired_by = scripted_grade_disposition(root, scripted_grade_rows(root))
    scripted_grade_amendment, scripted_grade_records, scripted_grade_subjects = scripted_grade_binding(root)
    if scripted_grade_retired_by:
        records += 2
    elif scripted_grade_amendment is not None or scripted_grade_records or scripted_grade_subjects:
        records += 1
        subjects_seen += SCRIPTED_GRADE_BOUND_PARTS
    r1 += scripted_grade_records
    r2 += scripted_grade_subjects
    step_measures_retired_by = step_measures_disposition(root, step_measures_rows(root))
    step_measures_amendment, step_measures_records, step_measures_subjects = step_measures_binding(root)
    if step_measures_retired_by:
        records += 2
    elif step_measures_amendment is not None or step_measures_records or step_measures_subjects:
        records += 1
        subjects_seen += STEP_MEASURES_BOUND_PARTS
    r1 += step_measures_records
    r2 += step_measures_subjects
    covhold_retired_by = covhold_disposition(root, covhold_rows(root))
    covhold_amendment, covhold_records, covhold_subjects = covhold_binding(root)
    if covhold_retired_by:
        records += 2
    elif covhold_amendment is not None or covhold_records or covhold_subjects:
        records += 1
        subjects_seen += COVHOLD_BOUND_PARTS
    r1 += covhold_records
    r2 += covhold_subjects
    term_brief_retired_by = term_brief_disposition(root, term_brief_rows(root))
    term_brief_amendment, term_brief_records, term_brief_subjects = term_brief_binding(root)
    if term_brief_retired_by:
        records += 2
    elif term_brief_amendment is not None or term_brief_records or term_brief_subjects:
        records += 1
        subjects_seen += len(TERM_BRIEF_SUBJECTS)
    r1 += term_brief_records
    r2 += term_brief_subjects
    qkind_retired_by = qkind_disposition(root, qkind_rows(root))
    qkind_amendment, qkind_records, qkind_subjects = qkind_binding(root)
    if qkind_retired_by:
        records += 2
    elif qkind_amendment is not None or qkind_records or qkind_subjects:
        records += 1
        subjects_seen += QKIND_BOUND_PARTS
    r1 += qkind_records
    r2 += qkind_subjects
    figplan_retired_by = figplan_disposition(root, figplan_rows(root))
    figplan_amendment, figplan_records, figplan_subjects = figplan_binding(root)
    if figplan_retired_by:
        records += 2
    elif figplan_amendment is not None or figplan_records or figplan_subjects:
        records += 1
        subjects_seen += FIGPLAN_BOUND_PARTS
    r1 += figplan_records
    r2 += figplan_subjects
    vbase_retired_by = vbase_disposition(root, vbase_rows(root))
    vbase_amendment, vbase_records, vbase_subjects = vbase_binding(root)
    if vbase_retired_by:
        records += 2
    elif vbase_amendment is not None or vbase_records or vbase_subjects:
        records += 1
        subjects_seen += VBASE_BOUND_PARTS
    r1 += vbase_records
    r2 += vbase_subjects
    vbase_state, _vbase, screening_records, screening_subjects = vbase_screening_binding(root)
    if vbase_state != "candidate":
        records += 1
        subjects_seen += len(VBASE_SCREENING_SUBJECTS)
    r1 += screening_records
    r2 += screening_subjects
    choice_retired_by = choice_disposition(root, choice_rows(root))
    choice_amendment, choice_records, choice_subjects = choice_binding(root)
    if choice_retired_by:
        records += 2
    elif choice_amendment is not None or choice_records or choice_subjects:
        records += 1
        subjects_seen += CHOICE_BOUND_PARTS
    r1 += choice_records
    r2 += choice_subjects
    migpar_retired_by = migpar_disposition(root, migpar_rows(root))
    migpar_amendment, migpar_records, migpar_subjects = migpar_binding(root)
    if migpar_retired_by:
        records += 2
    elif migpar_amendment is not None or migpar_records or migpar_subjects:
        records += 1
        subjects_seen += MIGPAR_BOUND_PARTS
    r1 += migpar_records
    r2 += migpar_subjects
    impfacts_retired_by = impfacts_disposition(root, impfacts_rows(root))
    impfacts_amendment, impfacts_records, impfacts_subjects = impfacts_binding(root)
    if impfacts_retired_by:
        records += 2
    elif impfacts_amendment is not None or impfacts_records or impfacts_subjects:
        records += 1
        subjects_seen += IMPFACTS_BOUND_PARTS
    r1 += impfacts_records
    r2 += impfacts_subjects
    walk_retired_by = walk_disposition(root, walk_rows(root))
    walk_amendment, walk_records, walk_subjects = walk_binding(root)
    if walk_retired_by:
        records += 2
    elif walk_amendment is not None or walk_records or walk_subjects:
        records += 1
        subjects_seen += WALK_BOUND_PARTS
    r1 += walk_records
    r2 += walk_subjects
    tnames_retired_by = tnames_disposition(root, tnames_rows(root))
    tnames_amendment, tnames_records, tnames_subjects = tnames_binding(root)
    if tnames_retired_by:
        records += 2
    elif tnames_amendment is not None or tnames_records or tnames_subjects:
        records += 1
        subjects_seen += TNAMES_BOUND_PARTS
    r1 += tnames_records
    r2 += tnames_subjects
    migbound_retired_by = migbound_disposition(root, migbound_rows(root))
    migbound_amendment, migbound_records, migbound_subjects = migbound_binding(root)
    if migbound_retired_by:
        records += 2
    elif migbound_amendment is not None or migbound_records or migbound_subjects:
        records += 1
        subjects_seen += MIGBOUND_BOUND_PARTS
    r1 += migbound_records
    r2 += migbound_subjects
    rough_retired_by = rough_disposition(root, rough_rows(root))
    rough_amendment, rough_records, rough_subjects = rough_binding(root)
    if rough_retired_by:
        records += 2
    elif rough_amendment is not None or rough_records or rough_subjects:
        records += 1
        subjects_seen += ROUGH_BOUND_PARTS
    r1 += rough_records
    r2 += rough_subjects
    retirement = ""
    if declared_retired_by:
        retirement += f"; v2.0 inactive by {declared_retired_by}"
    if url_retired_by:
        retirement += f"; v2.1 inactive by {url_retired_by}"
    if figure_retired_by:
        retirement += f"; v2.2 inactive by {figure_retired_by}"
    if derived_retired_by:
        retirement += f"; v2.3 inactive by {derived_retired_by}"
    if ledger_retired_by:
        retirement += f"; v2.4 inactive by {ledger_retired_by}"
    if kinds_retired_by:
        retirement += f"; v2.5 inactive by {kinds_retired_by}"
    if reach_retired_by:
        retirement += f"; v2.6 inactive by {reach_retired_by}"
    if manifests_retired_by:
        retirement += f"; v2.7 inactive by {manifests_retired_by}"
    if repairs_retired_by:
        retirement += f"; v2.8 inactive by {repairs_retired_by}"
    if maps_retired_by:
        retirement += f"; v2.9 inactive by {maps_retired_by}"
    if bounds_retired_by:
        retirement += f"; v2.10 inactive by {bounds_retired_by}"
    if corr_retired_by:
        retirement += f"; v2.11 inactive by {corr_retired_by}"
    if coverage_retired_by:
        retirement += f"; v2.12 inactive by {coverage_retired_by}"
    if infra_retired_by:
        retirement += f"; v2.14 inactive by {infra_retired_by}"
    if findpages_retired_by:
        retirement += f"; v2.15 inactive by {findpages_retired_by}"
    if subsec_retired_by:
        retirement += f"; v2.16 inactive by {subsec_retired_by}"
    if reltype_retired_by:
        retirement += f"; v2.19 inactive by {reltype_retired_by}"
    if hero_retired_by:
        retirement += f"; v2.20 inactive by {hero_retired_by}"
    if verify_retired_by:
        retirement += f"; v2.21 inactive by {verify_retired_by}"
    if covhold_retired_by:
        retirement += f"; v2.28 inactive by {covhold_retired_by}"
    if readers_retired_by:
        retirement += f"; v2.22 inactive by {readers_retired_by}"
    if cont_retired_by:
        retirement += f"; v2.23 inactive by {cont_retired_by}"
    if model_retired_by:
        retirement += f"; v2.24 inactive by {model_retired_by}"
    if worth_retired_by:
        retirement += f"; v2.26 inactive by {worth_retired_by}"
    if term_brief_retired_by:
        retirement += f"; terminology brief inactive by {term_brief_retired_by}"
    if qkind_retired_by:
        retirement += f"; v2.32 inactive by {qkind_retired_by}"
    if figplan_retired_by:
        retirement += f"; v2.33 inactive by {figplan_retired_by}"
    if choice_retired_by:
        retirement += f"; v2.37 inactive by {choice_retired_by}"
    if migpar_retired_by:
        retirement += f"; v2.38 inactive by {migpar_retired_by}"
    if impfacts_retired_by:
        retirement += f"; v2.39 inactive by {impfacts_retired_by}"
    if walk_retired_by:
        retirement += f"; v2.40 inactive by {walk_retired_by}"
    if tnames_retired_by:
        retirement += f"; v2.42 inactive by {tnames_retired_by}"
    if migbound_retired_by:
        retirement += f"; v2.43 inactive by {migbound_retired_by}"
    if rough_retired_by:
        retirement += f"; v2.44 inactive by {rough_retired_by}"
    if vbase_retired_by:
        retirement += f"; v2.34 inactive by {vbase_retired_by}"
    if qfile_retired_by:
        retirement += f"; v2.27 inactive by {qfile_retired_by}"
    if scripted_grade_retired_by:
        retirement += f"; v2.30 inactive by {scripted_grade_retired_by}"
    if step_measures_retired_by:
        retirement += f"; v2.31 inactive by {step_measures_retired_by}"
    if readmit_retired_by:
        retirement += f"; v2.13 inactive by {readmit_retired_by}"
    report.add("R1", "terminal outcome for every child", records, r1,
               f"{len(CHILDREN)} children and {len(additions)} installed Polaris "
               "additions; digest acts: phrase = manifest sha256 and in the "
               "aggregate; versioned: package/version/tag and one aggregate "
               "block; adopted additions: the declared record names the spec; "
               "declared-source: one VIS-4 ledger row and verified D10 record "
               "when present; URL declared-source: one v2.1 row and verified "
               "D10 record; an unrecorded v2.1 transaction stays pending; figure "
               "homes and fit: one v2.2 row over effective v2.0, pending until "
               "recorded; derived observed facts: one v2.3 row over effective "
               "v2.2 naming spec and policy, pending until recorded; ledger, "
               "packs and thesis: one v2.4 row over effective v2.3, pending "
               "until recorded; figure kinds: one v2.5 row over effective "
               "v2.4, pending until recorded; "
               "declared-source reach: one v2.6 row over "
               "effective v2.0 naming spec and policy, pending until recorded; "
               "manifest recognizers: one v2.7 row over effective v2.5, pending "
               "until recorded; spec repairs: one v2.8 row over effective v2.7, "
               "pending until recorded; computed maps: one v2.9 row over effective "
               "v2.8, pending until recorded; record bounds: one v2.10 row over "
               "effective v2.9, pending until recorded; spec corrections: one v2.11 row "
               "over effective v2.10, pending until recorded; coverage precheck: one v2.12 row "
               "over effective v2.11, pending until recorded; declared-source "
               "re-admission: one v2.13 row over effective v2.6 naming spec and "
               "policy, pending until recorded; infrastructure recognizers: one v2.14 "
               "row over effective v2.12, pending until recorded; index and task routes: "
               "one v2.15 row over effective v2.14, pending until recorded; page subsections: "
               "one v2.16 row over effective v2.15, pending until recorded; relation types: "
               "one v2.19 row over effective v2.16, pending until recorded; hero figure: "
               "one v2.20 row over effective v2.19, pending until recorded; verify text: "
               "one v2.21 row over effective v2.18's 033, pending until recorded; reader's edition: "
               "one v2.22 row over effective v2.20, pending until recorded; containment figure: "
               "one v2.23 row over effective v2.22, pending until recorded; system model: "
               "one v2.24 row over effective v2.23, pending until recorded; worth-knowing: "
               "one v2.26 row over effective v2.24, pending until recorded; question file: "
               "one v2.27 row over effective v2.21's 033, pending until recorded; coverage hold: "
               "one v2.28 row over effective v2.18's 035, pending until recorded; terminology brief: "
               "one versioned row over effective v2.26's 034, pending until recorded" + retirement)
    report.add("R2", "reviewed and signed subjects hash to their rows", subjects_seen, r2)


# --------------------------------------------------------------------------
# R3: populations, two methods each.
# --------------------------------------------------------------------------

def parse_regex(text, prefix):
    """Method A: regular expressions over headings."""
    reqs = {}
    order = []
    marks = [(m.start(), "R", m.group(1), m.group(2)) for m in re.finditer(
        rf"^### Requirement: ({re.escape(prefix)}-REQ-\d{{3}}) — (.+?)[ \t]*$",
        text, re.M)]
    marks += [(m.start(), "S", m.group(1), None) for m in re.finditer(
        r"^#### Scenario: (.+?)[ \t]*$", text, re.M)]
    current = None
    dupes = []
    for _pos, kind, value, name in sorted(marks):
        if kind == "R":
            if value in reqs:
                dupes.append(value)
            reqs[value] = {"name": name, "scenarios": []}
            order.append(value)
            current = value
        elif current is None:
            dupes.append(f"scenario before any requirement: {value}")
        else:
            reqs[current]["scenarios"].append(value)
    return reqs, dupes


def parse_manual(text, prefix):
    """Method B: a line state machine with no regular expressions."""
    reqs, dupes, current = {}, [], None
    head_r, head_s = "### Requirement: ", "#### Scenario: "
    for line in text.split("\n"):
        if line.startswith(head_r):
            rest = line[len(head_r):]
            ident, sep, name = rest.partition(" — ")
            if not sep or not ident.startswith(prefix + "-REQ-"):
                dupes.append(f"unparsed requirement heading: {rest[:40]}")
                current = None
                continue
            if ident in reqs:
                dupes.append(ident)
            reqs[ident] = {"name": name.rstrip(" \t"), "scenarios": []}
            current = ident
        elif line.startswith(head_s):
            if current is None:
                dupes.append("scenario before any requirement")
            else:
                reqs[current]["scenarios"].append(
                    line[len(head_s):].rstrip(" \t"))
    return reqs, dupes


def _polaris_blocks_regex(text):
    sections = list(re.finditer(
        r"^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements[ \t]*$", text, re.M))
    out = []
    for i, sec in enumerate(sections):
        end = sections[i + 1].start() if i + 1 < len(sections) else len(text)
        body = text[sec.end():end]
        heads = list(re.finditer(r"^### Requirement: (.+?)[ \t]*$", body, re.M))
        for j, head in enumerate(heads):
            stop = heads[j + 1].start() if j + 1 < len(heads) else len(body)
            block = body[head.start():stop]
            ids = re.findall(rf"^ID: ({POLARIS_ID}\d{{3}})[ \t]*$", block, re.M)
            scen = re.findall(r"^#### Scenario: (.+?)[ \t]*$", block, re.M)
            out.append((sec.group(1), ids, head.group(1), scen))
    return out


ADDED_HEADING = "## ADDED Requirements"
DELTA_WORDS = ("added", "modified", "removed", "renamed")


def _foreign_headings_regex(text):
    """Method A: every heading a signed addition may not carry.

    Fails closed, independent of requirement blocks: any level-2 heading
    other than exactly `## ADDED Requirements`, and any heading of any level,
    case or spacing that names a delta section, unless it is that line.
    """
    level2 = re.findall(r"^[ \t]*##(?!#)[^\n]*$", text, re.M)
    delta = re.findall(r"^[ \t]*#+[ \t]*(?:added|modified|removed|renamed)[ \t]+"
                       r"requirements?\b[^\n]*$", text, re.M | re.I)
    return [h for h in dict.fromkeys(level2 + delta) if h != ADDED_HEADING]


def _foreign_headings_manual(text):
    """Method B: the same set, by a line scan with no regular expressions."""
    out = []
    for line in text.split("\n"):
        if line == ADDED_HEADING:
            continue
        stripped = line.lstrip(" \t")
        if not stripped.startswith("#"):
            continue
        hashes = len(stripped) - len(stripped.lstrip("#"))
        words = stripped.lstrip("#").split()
        names_delta = (len(words) >= 2 and words[0].casefold() in DELTA_WORDS
                       and words[1].casefold().rstrip("s") == "requirement")
        if (hashes == 2 or names_delta) and line not in out:
            out.append(line)
    return out


#: OpenSpec 1.9.0's requirement header, case-insensitive with `\s*` around
#: the colon. A line it reads as a header must be exactly canonical here.
OPENSPEC_HEADER = re.compile(r"^###\s*requirement:\s*(.+?)\s*$", re.I | re.M)
CANONICAL_HEADER = re.compile(r"^### Requirement: \S(?:.*\S)?$")


def _header_problems_regex(text):
    """Method A: requirement headers OpenSpec and this checker read alike.

    Refuses a header OpenSpec accepts that is not exactly
    `### Requirement: <name>` (OpenSpec would add it; both methods here would
    fold it into the block before), a second `## ADDED Requirements` (OpenSpec
    keeps only the last section of a title), and a header inside a fence
    (OpenSpec masks fences; both methods here would count it).
    """
    out = [f"non-canonical requirement header `{m.group(0).strip()}`"
           for m in OPENSPEC_HEADER.finditer(text)
           if not CANONICAL_HEADER.match(m.group(0))]
    added = re.findall(rf"^{re.escape(ADDED_HEADING)}$", text, re.M)
    if len(added) > 1:
        out.append(f"{len(added)} `{ADDED_HEADING}` headings; OpenSpec keeps the last")
    for fence in re.finditer(r"^(```|~~~)[^\n]*\n.*?^\1[ \t]*$", text, re.M | re.S):
        if OPENSPEC_HEADER.search(fence.group(0)):
            out.append("a requirement header inside a fence")
    return out


def _header_problems_manual(text):
    """Method B: the same three refusals, by a line scan with no regular expressions."""
    out, added, fence = [], 0, None
    for line in text.split("\n"):
        if fence is None and line[:3] in ("```", "~~~"):
            fence = line[:3]
            continue
        if fence is not None and line.rstrip(" \t") == fence:
            fence = None
            continue
        if line == ADDED_HEADING:
            added += 1
        rest = line[3:].lstrip() if line.startswith("###") else None
        if rest is None or not rest[:12].casefold() == "requirement:":
            continue
        if not rest[12:].strip():
            continue
        if fence is not None:
            out.append("a requirement header inside a fence")
            continue
        name = line[len("### Requirement: "):]
        if not (line.startswith("### Requirement: ") and name and name == name.strip()):
            out.append(f"non-canonical requirement header `{line.strip()}`")
    if added > 1:
        out.append(f"{added} `{ADDED_HEADING}` headings; OpenSpec keeps the last")
    return out


def compose_polaris_by_id(base, overlay, *additions):
    """Method A: compose base + overlay (+ signed additions) by ID line.

    Each addition is a (label, text) pair and may only ADD requirements.
    """
    comp, problems = {}, []
    for label, text in additions:
        problems += [f"addition {label}: {p}" for p in _header_problems_regex(text)]
        problems += [f"addition {label}: carries {what}; refused, never "
                     "normalised" for what, pattern in (
                         ("U+FEFF", "\ufeff"), ("a carriage return", "\r"))
                     if re.search(pattern, text)]
        problems += [f"addition {label}: heading `{h.strip()}`; a signed addition "
                     "is ADDED-only" for h in _foreign_headings_regex(text)]
    for label, text in (("base", base), ("overlay", overlay), *additions):
        for kind, ids, name, scen in _polaris_blocks_regex(text):
            if label not in ("base", "overlay") and kind != "ADDED":
                problems.append(f"addition {label}: {kind} section; a signed "
                                "addition is ADDED-only")
                continue
            if len(ids) != 1:
                problems.append(f"{label} `{name}`: {len(ids)} ID lines")
                continue
            ident = ids[0]
            if kind == "ADDED":
                if ident in comp:
                    problems.append(f"{label}: ADDED {ident} already composed")
                comp[ident] = {"name": name, "scenarios": scen}
            elif kind == "MODIFIED":
                if ident not in comp:
                    problems.append(f"{label}: MODIFIED {ident} is dangling")
                comp[ident] = {"name": name, "scenarios": scen}
            else:
                problems.append(f"{label}: unsupported {kind} section")
    return comp, problems


def _polaris_blocks_manual(text):
    out, section, current = [], None, None
    for line in text.split("\n"):
        if line.startswith("## ") and line.rstrip().endswith(" Requirements"):
            section = line[3:].split(" ", 1)[0]
            current = None
        elif line.startswith("### Requirement: "):
            current = {"section": section,
                       "name": line[len("### Requirement: "):].rstrip(" \t"),
                       "ids": [], "scenarios": []}
            out.append(current)
        elif current is not None and line.startswith("ID: " + POLARIS_ID):
            current["ids"].append(line[4:].rstrip(" \t"))
        elif current is not None and line.startswith("#### Scenario: "):
            current["scenarios"].append(
                line[len("#### Scenario: "):].rstrip(" \t"))
    return out


def compose_polaris_by_name(base, overlay, *additions):
    """Method B: compose by normalized requirement name; IDs attached last."""
    comp, problems = {}, []

    def norm(name):
        return " ".join(name.split()).casefold()

    for label, text in additions:
        problems += [f"addition {label}: {p}" for p in _header_problems_manual(text)]
        if "\ufeff" in text:
            problems.append(f"addition {label}: carries U+FEFF; refused, never "
                            "normalised")
        if "\r" in text:
            problems.append(f"addition {label}: carries a carriage return; "
                            "refused, never normalised")
        problems += [f"addition {label}: heading `{h.strip()}`; a signed addition "
                     "is ADDED-only" for h in _foreign_headings_manual(text)]
    for label, text in (("base", base), ("overlay", overlay), *additions):
        for block in _polaris_blocks_manual(text):
            key = norm(block["name"])
            if label not in ("base", "overlay") and block["section"] != "ADDED":
                problems.append(f"addition {label}: {block['section']} "
                                "section; a signed addition is ADDED-only")
                continue
            if block["section"] == "ADDED":
                if key in comp:
                    problems.append(f"{label}: ADDED `{block['name']}` collides")
                comp[key] = block
            elif block["section"] == "MODIFIED":
                if key not in comp:
                    problems.append(
                        f"{label}: MODIFIED `{block['name']}` is dangling")
                comp[key] = block
            else:
                problems.append(f"{label}: unsupported {block['section']} section")
    by_id = {}
    for block in comp.values():
        if len(block["ids"]) != 1:
            problems.append(f"`{block['name']}`: {len(block['ids'])} ID lines")
            continue
        if block["ids"][0] in by_id:
            problems.append(f"duplicate {block['ids'][0]}")
        by_id[block["ids"][0]] = {"name": block["name"],
                                  "scenarios": block["scenarios"]}
    return by_id, problems


DECLARED_SOURCE_SUFFIXES = ('033', '034', '035', '036', '046')
DECLARED_SOURCE_OLD_NAME = 'Launch-time consent'
DECLARED_SOURCE_NEW_NAME = 'Declared local-source admission'
DECLARED_SOURCE_MODIFIED = '## MODIFIED Requirements'


def compose_declared_source_by_id(current, text):
    """Compose the explicit five replacements by ID; refuse partial application."""
    problems = []
    translated = re.sub(r'^## MODIFIED Requirements$', ADDED_HEADING, text, flags=re.M)
    problems += _header_problems_regex(translated)
    problems += _foreign_headings_regex(translated)
    if len(re.findall(r'^## MODIFIED Requirements$', text, re.M)) != 1:
        problems.append('expected one canonical MODIFIED section')
    if re.search('[\ufeff\r]', text):
        problems.append('noncanonical line bytes')
    blocks = _polaris_blocks_regex(text)
    ids = [xs[0] for _kind, xs, _name, _scen in blocks if len(xs) == 1]
    if len(blocks) != 5 or len(ids) != 5 or set(ids) != {POLARIS_ID+s for s in DECLARED_SOURCE_SUFFIXES}:
        problems.append('expected exactly five replacement identities')
    composed = dict(current)
    for kind, xs, name, scenarios in blocks:
        if kind != 'MODIFIED' or len(xs) != 1 or xs[0] not in current:
            problems.append('dangling or non-MODIFIED replacement')
            continue
        ident = xs[0]
        want = DECLARED_SOURCE_NEW_NAME if ident == POLARIS_ID+'046' else current[ident]['name']
        if name != want or (ident == POLARIS_ID+'046' and current[ident]['name'] != DECLARED_SOURCE_OLD_NAME):
            problems.append('unexpected requirement rename')
        composed[ident] = {'name': name, 'scenarios': scenarios}
    return (dict(current) if problems else composed), problems


def compose_declared_source_by_name(current, text):
    """Independently replace by normalized predecessor name, then recover IDs."""
    lines = text.split('\n')
    translated = '\n'.join(ADDED_HEADING if line == DECLARED_SOURCE_MODIFIED else line for line in lines)
    problems = _header_problems_manual(translated) + _foreign_headings_manual(translated)
    if lines.count(DECLARED_SOURCE_MODIFIED) != 1:
        problems.append('expected one canonical MODIFIED section')
    if '\ufeff' in text or '\r' in text:
        problems.append('noncanonical line bytes')
    blocks = _polaris_blocks_manual(text)
    ids = [b['ids'][0] for b in blocks if len(b['ids']) == 1]
    if len(blocks) != 5 or len(ids) != 5 or sorted(ids) != [POLARIS_ID+s for s in DECLARED_SOURCE_SUFFIXES]:
        problems.append('expected exactly five replacement identities')
    def norm(name):
        return ' '.join(name.split()).casefold()
    names = {norm(row['name']): (ident, row) for ident, row in current.items()}
    for block in blocks:
        old = DECLARED_SOURCE_OLD_NAME if block['name'] == DECLARED_SOURCE_NEW_NAME else block['name']
        key = norm(old)
        if block['section'] != 'MODIFIED' or len(block['ids']) != 1 or key not in names:
            problems.append('dangling or non-MODIFIED replacement')
            continue
        ident, predecessor = names[key]
        if block['ids'] != [ident] or predecessor['name'] != old:
            problems.append('replacement identity/name mismatch')
        names.pop(key)
        names[norm(block['name'])] = (ident, {'name':block['name'], 'scenarios':block['scenarios']})
    composed = {ident: row for ident, row in names.values()}
    return (dict(current) if problems else composed), problems


URL_SOURCE_REPLACES = tuple(POLARIS_ID + suffix for suffix in ("025", "033", "035", "047"))
URL_SOURCE_ADDS = POLARIS_ID + "048"
URL_SOURCE_HEADINGS = (DECLARED_SOURCE_MODIFIED, ADDED_HEADING)
URL_SOURCE_OPERATIONS = tuple(("MODIFIED", ident) for ident in URL_SOURCE_REPLACES) + (
    ("ADDED", URL_SOURCE_ADDS),)


def compose_url_source_by_id(current, text):
    """Replace exactly four existing IDs and add the new URL-only requirement."""
    problems = _header_problems_regex(text)
    foreign = _foreign_headings_regex(text)
    headings = re.findall(r"^[ \t]*##(?!#)[^\n]*$", text, re.M)
    if headings != list(URL_SOURCE_HEADINGS) or any(h != DECLARED_SOURCE_MODIFIED for h in foreign):
        problems.append("expected one canonical MODIFIED section followed by one ADDED section")
    if re.search("[\ufeff\r]", text):
        problems.append("noncanonical line bytes")
    blocks = _polaris_blocks_regex(text)
    operations = tuple((kind, ids[0]) for kind, ids, _name, _scenarios in blocks
                       if len(ids) == 1)
    if len(operations) != len(blocks) or operations != URL_SOURCE_OPERATIONS:
        return dict(current), problems + ["unexpected URL declared-source requirement operations"]
    names = {" ".join(row["name"].split()).casefold() for row in current.values()}
    composed = dict(current)
    for kind, (ident,), name, scenarios in blocks:
        if kind == "MODIFIED" and (ident not in current or current[ident]["name"] != name):
            problems.append(f"MODIFIED {ident} must preserve its predecessor's ID and name")
        if kind == "ADDED" and (ident in current or " ".join(name.split()).casefold() in names):
            problems.append(f"ADDED {ident} collides with a predecessor")
        composed[ident] = {"name": name, "scenarios": scenarios}
    return (dict(current) if problems else composed), problems


def compose_url_source_by_name(current, text):
    """Independently match predecessor names, then confirm the attached IDs."""
    problems = _header_problems_manual(text)
    lines = text.split("\n")
    headings = [line for line in lines if line.lstrip(" \t").startswith("##")
                and not line.lstrip(" \t").startswith("###")]
    foreign = _foreign_headings_manual(text)
    if headings != list(URL_SOURCE_HEADINGS) or any(h != DECLARED_SOURCE_MODIFIED for h in foreign):
        problems.append("expected one canonical MODIFIED section followed by one ADDED section")
    if "\ufeff" in text or "\r" in text:
        problems.append("noncanonical line bytes")
    blocks = _polaris_blocks_manual(text)
    operations = tuple((b["section"], b["ids"][0]) for b in blocks if len(b["ids"]) == 1)
    if len(operations) != len(blocks) or operations != URL_SOURCE_OPERATIONS:
        return dict(current), problems + ["unexpected URL declared-source requirement operations"]

    def norm(name):
        return " ".join(name.split()).casefold()

    names = {norm(row["name"]): (ident, row) for ident, row in current.items()}
    for block in blocks:
        key = norm(block["name"])
        ident, = block["ids"]
        if block["section"] == "MODIFIED":
            prior = names.get(key)
            if prior is None or prior[0] != ident or prior[1]["name"] != block["name"]:
                problems.append(f"MODIFIED `{block['name']}` must preserve its predecessor's ID and name")
        elif key in names or ident in current:
            problems.append(f"ADDED `{block['name']}` collides with a predecessor")
        names[key] = (ident, {"name": block["name"], "scenarios": block["scenarios"]})
    return (dict(current) if problems else {ident: row for ident, row in names.values()}), problems


FIGURE_REPLACES = (POLARIS_ID + "034",)


def compose_figure_by_id(current, text, replaces=FIGURE_REPLACES):
    """Replace exactly `replaces` (REQ-polaris-generation-034 unless named), keeping ID and name; refuse partial application."""
    problems = _header_problems_regex(text)
    foreign = _foreign_headings_regex(text)
    headings = re.findall(r"^[ \t]*##(?!#)[^\n]*$", text, re.M)
    if headings != [DECLARED_SOURCE_MODIFIED] or any(h != DECLARED_SOURCE_MODIFIED for h in foreign):
        problems.append("expected exactly one canonical MODIFIED section")
    if re.search("[\ufeff\r]", text):
        problems.append("noncanonical line bytes")
    blocks = _polaris_blocks_regex(text)
    operations = tuple((kind, ids[0]) for kind, ids, _name, _scenarios in blocks if len(ids) == 1)
    if len(operations) != len(blocks) or operations != tuple(("MODIFIED", i) for i in replaces):
        return dict(current), problems + ["unexpected figure-homes requirement operations"]
    composed = dict(current)
    for _kind, (ident,), name, scenarios in blocks:
        if ident not in current or current[ident]["name"] != name:
            problems.append(f"MODIFIED {ident} must preserve its predecessor's ID and name")
        composed[ident] = {"name": name, "scenarios": scenarios}
    return (dict(current) if problems else composed), problems


def compose_figure_by_name(current, text, replaces=FIGURE_REPLACES):
    """Independently match the predecessor by name, then confirm the attached ID."""
    problems = _header_problems_manual(text)
    lines = text.split("\n")
    headings = [line for line in lines if line.lstrip(" \t").startswith("##")
                and not line.lstrip(" \t").startswith("###")]
    foreign = _foreign_headings_manual(text)
    if headings != [DECLARED_SOURCE_MODIFIED] or any(h != DECLARED_SOURCE_MODIFIED for h in foreign):
        problems.append("expected exactly one canonical MODIFIED section")
    if "\ufeff" in text or "\r" in text:
        problems.append("noncanonical line bytes")
    blocks = _polaris_blocks_manual(text)
    operations = tuple((b["section"], b["ids"][0]) for b in blocks if len(b["ids"]) == 1)
    if len(operations) != len(blocks) or operations != tuple(("MODIFIED", i) for i in replaces):
        return dict(current), problems + ["unexpected figure-homes requirement operations"]

    def norm(name):
        return " ".join(name.split()).casefold()

    names = {norm(row["name"]): (ident, row) for ident, row in current.items()}
    for block in blocks:
        key = norm(block["name"])
        prior = names.get(key)
        if prior is None or prior[0] != block["ids"][0] or prior[1]["name"] != block["name"]:
            problems.append(f"MODIFIED `{block['name']}` must preserve its predecessor's ID and name")
            continue
        names[key] = (prior[0], {"name": block["name"], "scenarios": block["scenarios"]})
    return (dict(current) if problems else {ident: row for ident, row in names.values()}), problems


def _cap1_overlay_guard_regex(text):
    """Method A: refusals for the CAP1 overlay, independent of its blocks.

    Its only level-2 heading is exactly `## MODIFIED Requirements`; no other
    heading of any level names a delta section; it carries no U+FEFF or
    carriage return; and every requirement header is canonical and unfenced.
    """
    out = []
    level2 = re.findall(r"^[ \t]*##(?!#)[^\n]*$", text, re.M)
    if level2 != [CAP1_OVERLAY_SECTION]:
        out.append(f"level-2 headings {level2}, expected exactly "
                   f"[{CAP1_OVERLAY_SECTION!r}]")
    out += [f"heading `{h.strip()}`; the overlay is MODIFIED-only"
            for h in _foreign_headings_regex(text)
            if h != CAP1_OVERLAY_SECTION and h not in level2]
    out += [f"carries {what}; refused, never normalised"
            for what, pattern in (("U+FEFF", "\ufeff"),
                                  ("a carriage return", "\r"))
            if re.search(pattern, text)]
    return out + [p for p in _header_problems_regex(text)]


def _cap1_overlay_guard_manual(text):
    """Method B: the same refusals, by a line scan with no regular expressions."""
    out = []
    level2 = [line for line in text.split("\n")
              if line.lstrip(" \t").startswith("##")
              and not line.lstrip(" \t").startswith("###")]
    if level2 != [CAP1_OVERLAY_SECTION]:
        out.append(f"level-2 headings {level2}, expected exactly "
                   f"[{CAP1_OVERLAY_SECTION!r}]")
    out += [f"heading `{h.strip()}`; the overlay is MODIFIED-only"
            for h in _foreign_headings_manual(text)
            if h != CAP1_OVERLAY_SECTION and h not in level2]
    if "\ufeff" in text:
        out.append("carries U+FEFF; refused, never normalised")
    if "\r" in text:
        out.append("carries a carriage return; refused, never normalised")
    return out + [p for p in _header_problems_manual(text)]


def compose_cap1_by_id(base, overlay, replaces=CAP1_OVERLAY_REPLACES):
    """Method A: parse both files by regex, then replace by identifier.

    The overlay must carry exactly the expected IDs in order,
    and each must already be a base requirement (a full replacement, never
    an addition).
    """
    comp, pb = parse_regex(base, "CAP1")
    over, po = parse_regex(overlay, "CAP1")
    problems = [f"base: duplicate or orphan {p}" for p in pb]
    problems += [f"overlay: duplicate or orphan {p}" for p in po]
    problems += [f"overlay: {p}" for p in _cap1_overlay_guard_regex(overlay)]
    if tuple(over) != replaces:
        problems.append(f"overlay replaces {list(over)}, expected exactly "
                        f"{list(replaces)}")
    for ident, req in over.items():
        if ident not in comp:
            problems.append(f"overlay: {ident} is dangling (not in the base)")
        comp[ident] = req
    return comp, problems


def _lines_keep(text):
    """Split at LF, keeping each terminator (no regular expression)."""
    out, start = [], 0
    while start < len(text):
        stop = text.find("\n", start)
        stop = len(text) if stop < 0 else stop + 1
        out.append(text[start:stop])
        start = stop
    return out


def _cap1_spans_manual(lines):
    """{identifier: [(first, end)]}: each block runs to the next header."""
    head = "### Requirement: "
    heads = [i for i, line in enumerate(lines) if line.startswith(head)]
    spans = {}
    for n, i in enumerate(heads):
        ident = lines[i][len(head):].partition(" — ")[0]
        end = heads[n + 1] if n + 1 < len(heads) else len(lines)
        spans.setdefault(ident, []).append((i, end))
    return spans


def compose_cap1_by_text(base, overlay, replaces=CAP1_OVERLAY_REPLACES):
    """Method B: splice the overlay's blocks into the base text, then parse.

    No regular expression: the composed bytes come from a line splice, are
    then read by the line state machine, and are returned for the digest
    comparison with the adoption's generated record.
    """
    problems = [f"overlay: {p}" for p in _cap1_overlay_guard_manual(overlay)]
    b_lines, o_lines = _lines_keep(base), _lines_keep(overlay)
    b_spans, o_spans = _cap1_spans_manual(b_lines), _cap1_spans_manual(o_lines)
    if tuple(o_spans) != replaces:
        problems.append(f"overlay replaces {list(o_spans)}, expected exactly "
                        f"{list(replaces)}")
    composed = b_lines
    for ident in o_spans:
        if len(o_spans[ident]) != 1:
            problems.append(f"overlay: {ident} has {len(o_spans[ident])} blocks")
            continue
        have = _cap1_spans_manual(composed).get(ident, [])
        if len(have) != 1:
            problems.append(f"overlay: {ident} is dangling or repeated in the "
                            f"base ({len(have)} blocks)")
            continue
        (first, end), (ofirst, oend) = have[0], o_spans[ident][0]
        composed = composed[:first] + o_lines[ofirst:oend] + composed[end:]
    text = "".join(composed)
    comp, pc = parse_manual(text, "CAP1")
    problems += [f"composed: duplicate or orphan {p}" for p in pc]
    return comp, problems, text


def cap1_overlay_signed(root):
    """Findings unless the declared sign-off record terminates the overlay."""
    records = addition_records(root, CAP1_OVERLAY_CHANGE)
    want = [(CAP1_OVERLAY_RECORD, CAP1_OVERLAY_VERSION)]
    got = [(rel, version) for rel, _text, version in records]
    tag = f"Tag: {CAP1_OVERLAY_CHANGE}-v{CAP1_OVERLAY_VERSION}"
    if got != want or tag not in records[0][1].splitlines():
        return [f"CAP1: overlay `{CAP1_OVERLAY_CHANGE}` sign-off records "
                f"{got}, expected exactly {want} carrying `{tag}`; the bound "
                "file alone is counted"]
    return []


def compose_cap1_consent(root, text):
    """Verify the historical P-109 composition before any later overlay."""
    overlay = read_text(root, CAP1_OVERLAY_SPEC)
    unsigned = cap1_overlay_signed(root)
    if overlay is None or unsigned:
        a, pa = parse_regex(text, "CAP1")
        return a, unsigned or [f"CAP1: overlay `{CAP1_OVERLAY_SPEC}` missing; "
                               "the bound file alone is counted"], None
    a, pa = compose_cap1_by_id(text, overlay)
    b, pb, composed = compose_cap1_by_text(text, overlay)
    findings = [f"CAP1 method A: {p}" for p in pa]
    findings += [f"CAP1 method B: {p}" for p in pb]
    if a != b:
        findings.append(f"CAP1: the two overlay compositions disagree "
                        f"({len(a)} vs {len(b)} requirements)")
    try:
        recorded = json.loads(read_text(root, CAP1_OVERLAY_DEPS) or "null")
        recorded = recorded["composed_spec_sha256"]
    except (ValueError, TypeError, KeyError):
        recorded = None
    if sha(composed.encode("utf-8")) != recorded:
        findings.append(f"CAP1 method B: composed bytes do not hash to "
                        f"`{CAP1_OVERLAY_DEPS}` composed_spec_sha256")
    return a, findings, composed


def cap1_root_row_claims_version(row):
    """Recognize an attempted binding even if the review packet is incomplete."""
    cells = [cell.strip() for cell in row.split("|")[1:-1]]
    tag_cells = cells[6:] if len(cells) == 7 else cells
    return (any(CAP1_ROOT_TAG_CLAIM.fullmatch(cell) for cell in tag_cells)
            or _is_reviewed_version_row(row, None, (CAP1_ROOT_SPEC,)))


def cap1_root_git(root, *args):
    """Read local Git objects without replacement objects or lazy network reads."""
    if _CAP1_SELFTEST_GIT_ROOT is not None and args[0] == "for-each-ref":
        # The existing rule-6 fixtures exercise the authored, pre-tag state.
        return b""
    return local_git(_CAP1_SELFTEST_GIT_ROOT or root, *args)


def local_git(root, *args):
    """Read an exact local Git object without replacements or network fetches."""
    result = subprocess.run(
        ["git", *args], cwd=root, capture_output=True,
        env={**os.environ, "GIT_NO_REPLACE_OBJECTS": "1", "GIT_NO_LAZY_FETCH": "1",
             "GIT_OPTIONAL_LOCKS": "0"}, check=False,
    )
    return result.stdout if result.returncode == 0 else None


def cap1_root_tree_entry(root, commit, path):
    entry = cap1_root_git(root, "ls-tree", "-z", commit, "--", path)
    return entry if entry and entry.startswith(b"100644 blob ") else None


def cap1_root_ledger_at(root, commit):
    if cap1_root_tree_entry(root, commit, AGENT_ADOPTIONS) is None:
        return []
    body = cap1_root_git(root, "show", f"{commit}:{AGENT_ADOPTIONS}")
    return decode_git_adoption_rows(body)


def git_adoption_rows(root, commit):
    entry = local_git(root, "ls-tree", "-z", commit, "--", AGENT_ADOPTIONS)
    if not entry or not entry.startswith(b"100644 blob "):
        return []
    return decode_git_adoption_rows(local_git(root, "show", f"{commit}:{AGENT_ADOPTIONS}"))


def decode_git_adoption_rows(body):
    try:
        return _adoption_table_rows(body.decode("utf-8")) if body is not None else []
    except UnicodeDecodeError:
        return []


def cap1_root_binding(root):
    """Classify the reviewed overlay from its current row and local Git evidence."""
    ledger = adoption_table_rows(root)
    claims = [row for row in ledger if cap1_root_row_claims_version(row)]
    versioned = CAP1_ROOT_VERSION_MARKER in (read_text(root, CAP1_ROOT_SPEC) or "")
    if not claims and not versioned:
        return "candidate", []

    def invalid(reason):
        return "invalid", [f"CAP1 root adjudication: {reason}"]

    if len(claims) != 1:
        return invalid("expected exactly one version record")
    cells = [cell.strip() for cell in claims[0].split("|")[1:-1]]
    if len(cells) != 7 or not all(cells):
        return invalid("expected seven nonempty adoption cells")
    identity, date, commit, what, why, inverse, tag = cells
    if (not versioned or tag != f"`{CAP1_ROOT_VERSION_NAME}`"
            or not valid_adoption_date(date) or not re.fullmatch(r"A-[1-9][0-9]*", identity)
            or not re.fullmatch(r"`[0-9a-f]{40}`", commit)):
        return invalid("invalid adoption identity, source, date or version")
    if sum(row.split("|")[1].strip() == identity for row in ledger) != 1:
        return invalid("adoption identity is not globally unique")
    source = commit[1:-1]
    prefix = f"https://github.com/tzeusy-org/syzygy/blob/{source}/"
    links = re.findall(r"\]\(([^)]+)\)", what)
    if any(links.count(prefix + path) != 1 for path in CAP1_ROOT_BOUND_PATHS):
        return invalid("adoption lacks a unique own-source snapshot for each subject")

    if cap1_root_git(root, "cat-file", "-t", source) != b"commit\n":
        return invalid("source is not an exact commit object")
    parents = cap1_root_git(root, "rev-list", "--parents", "-n", "1", source)
    if not parents or len(parents.split()) not in (2, 3):
        return invalid("exact source commit and its parents are unavailable")
    mainline = " -m 1" if len(parents.split()) == 3 else ""
    if inverse != f"`git revert{mainline} {source}`":
        return invalid("revert does not name the exact source and mainline")
    authored = cap1_root_git(root, "rev-parse", "--verify", "HEAD^{commit}")
    if not authored:
        return invalid("exact authored commit is unavailable")
    authored = authored.decode("ascii").strip()
    if cap1_root_git(root, "merge-base", "--is-ancestor", source, authored) is None:
        return invalid("exact source commit is outside the authored history")
    authored_rows = cap1_root_ledger_at(root, authored)
    if [row for row in authored_rows if cap1_root_row_claims_version(row)] != claims:
        return invalid("adoption row is absent from the exact authored commit")
    snapshots = {}
    for path in CAP1_ROOT_BOUND_PATHS:
        current = read_bytes(root, path)
        entry = cap1_root_tree_entry(root, source, path)
        snapshot = cap1_root_git(root, "show", f"{source}:{path}")
        if current is None or snapshot != current:
            return invalid(f"`{path}` differs from the exact source snapshot")
        if entry is None or cap1_root_tree_entry(root, authored, path) != entry:
            return invalid(f"`{path}` differs at the exact authored commit")
        snapshots[path] = entry
    annotation = f"refs/tags/{CAP1_ROOT_VERSION_NAME}"
    refs = cap1_root_git(
        root, "for-each-ref", "--format=%(refname) %(objecttype) %(tag) %(*objecttype) %(*objectname)",
        annotation,
    )
    if refs is None:
        return invalid("version tag inventory is unreadable")
    rows = [row.split() for row in refs.splitlines()
            if row.split(maxsplit=1)[0] == annotation.encode("ascii")]
    if not rows:
        return "staged", []
    if rows != [[annotation.encode("ascii"), b"tag", CAP1_ROOT_VERSION_NAME.encode("ascii"),
                 b"commit", source.encode("ascii")]]:
        return invalid("tag is not a direct annotation of the exact source")
    protected = cap1_root_git(root, "rev-parse", "--verify", "refs/remotes/origin/main^{commit}")
    if not protected:
        return invalid("protected main is unavailable")
    protected = protected.decode("ascii").strip()
    protected_rows = cap1_root_ledger_at(root, protected)
    if (cap1_root_git(root, "merge-base", "--is-ancestor", source, protected) is None
            or [row for row in protected_rows if cap1_root_row_claims_version(row)] != claims
            or sum(row.split("|")[1].strip() == identity for row in protected_rows) != 1):
        return invalid("annotated source and binding row are not both on protected main")

    def disposition(rows):
        identity_to_find = recorded_disposition(
            root, identity, source, CAP1_ROOT_VERSION_NAME, CAP1_ROOT_BOUND_PATHS,
            plain_revert=not mainline, ledger_rows=rows,
        )
        return [row for row in rows if row.split("|")[1].strip() == identity_to_find]

    proposed_disposition = disposition(ledger)
    authored_disposition = disposition(authored_rows)
    protected_disposition = disposition(protected_rows)
    if any(len(matches) > 1 for matches in
           (proposed_disposition, authored_disposition, protected_disposition)):
        return invalid("disposition identity is not unique")
    if proposed_disposition != authored_disposition:
        return invalid("authored and worktree disposition evidence disagree")
    if authored_disposition and authored_disposition != protected_disposition:
        return invalid("authored disposition is not recorded on protected main")
    if protected_disposition:
        return "reverted", []
    for path, entry in snapshots.items():
        if cap1_root_tree_entry(root, protected, path) != entry:
            return invalid(f"`{path}` differs on protected main from the exact source snapshot")
    return "effective", []


def cap1_root_effective(root, text):
    """Return the selected CAP1 bytes as well as the census."""
    population, findings, effective = compose_cap1_consent(root, text)
    state, binding = cap1_root_binding(root)
    findings.extend(binding)
    if state == "effective" and not findings:
        overlay = read_text(root, CAP1_ROOT_SPEC)
        by_id, problems_a = compose_cap1_by_id(effective, overlay, CAP1_ROOT_REPLACES)
        by_text, problems_b, successor = compose_cap1_by_text(effective, overlay, CAP1_ROOT_REPLACES)
        if (problems_a or problems_b or by_id != by_text or by_id != population
                or sha(successor.encode("utf-8")) != CAP1_ROOT_SUCCESSOR_DIGEST):
            findings.append("CAP1 root adjudication: exact successor census does not compose")
        else:
            population, effective = by_id, successor
    return population, findings, effective


def compose_cap1(root, text):
    population, findings, _ = cap1_root_effective(root, text)
    return population, findings


def _cap1_coverage_rows(text):
    return [line for line in text.splitlines() if line.startswith("| RFC")]


def _cap1_coverage_states(rows, column):
    counts = {"covered": 0, "unknown": 0, "other": 0}
    for row in rows:
        cells = row.split("|")[1:-1]
        if len(cells) != 4:
            raise ValueError("expected four cells in each coverage row")
        words = cells[column].split(maxsplit=1)
        state = words[0].strip("*;").lower() if words else ""
        counts[state if state in ("covered", "unknown") else "other"] += 1
    return counts


def cap1_root_projection(root):
    """Derive the dormant 006 warrant and coverage projection from exact inputs."""
    from build_capability_1_spec_dependencies import CLASSES, parse as parse_warrants

    inputs = {path: read_bytes(root, path)
              for path in (*CAP1_ROOT_PREDECESSORS, *CAP1_ROOT_SUBJECTS,
                           *CAP1_ROOT_RFC_FILES, CAP1_ROOT_INDEX)}
    if any(data is None for data in inputs.values()):
        raise ValueError("CAP1 composition input is missing")
    for path, expected in CAP1_ROOT_PREDECESSORS.items():
        if sha(inputs[path]) != expected:
            raise ValueError(f"`{path}` differs from the signed predecessor")
    for path, expected in CAP1_ROOT_RFC_DIGESTS.items():
        if sha(inputs[path]) != expected:
            raise ValueError(f"`{path}` differs from the reviewed RFC collateral")
    for path, expected in CAP1_ROOT_SUBJECTS.items():
        body = inputs[path]
        if path == CAP1_ROOT_SPEC:
            old = f"\n{CAP1_ROOT_CANDIDATE_MARKER} ".encode("utf-8")
            new = f"\n{CAP1_ROOT_VERSION_MARKER} ".encode("utf-8")
            body = body.replace(new, old, 1)
        if sha(body) != expected:
            raise ValueError(f"`{path}` differs from the reviewed candidate")
    base, p109, historical = compose_cap1_consent(
        root, inputs[FAMILY_SPECS["CAP1"]].decode("utf-8"))
    if p109:
        raise ValueError("P-109 predecessor did not bind: " + "; ".join(p109))
    proposal = inputs[CAP1_ROOT_SPEC].decode("utf-8")
    a, pa = compose_cap1_by_id(historical, proposal, CAP1_ROOT_REPLACES)
    b, pb, successor = compose_cap1_by_text(historical, proposal, CAP1_ROOT_REPLACES)
    if pa or pb or a != b or a != base:
        raise ValueError("006 replacement does not preserve the CAP1 population")

    def warrants(text):
        requirements, errors = parse_warrants(text)
        if errors:
            raise ValueError("; ".join(errors))
        return {key: sorted({item for _, fields in requirements for item in fields[key]})
                for key in CLASSES}

    previous_warrants = warrants(historical)
    next_warrants = warrants(successor)
    signed = json.loads(inputs[CAP1_OVERLAY_DEPS])["dependencies"]
    if previous_warrants != {key: sorted(signed[key]) for key in CLASSES}:
        raise ValueError("P-109 warrants disagree with the signed union")
    expected_warrants = {**previous_warrants,
                         "contracts": sorted(set(previous_warrants["contracts"]) | {"RFC1-21"})}
    if "RFC1-21" in previous_warrants["contracts"] or next_warrants != expected_warrants:
        raise ValueError("expected RFC1-21 as the sole warrant change")

    source = inputs[CAP1_HISTORIC_COVERAGE].decode("utf-8")
    part_a = source.partition("## Part A — ")[2].partition("## Part B — ")[0]
    old_rows = _cap1_coverage_rows(part_a)
    consent_source = inputs[CAP1_CONSENT_COVERAGE].decode("utf-8")
    before_consent, _, after_consent = consent_source.partition("## Proposed scoped replacement")
    removed = _cap1_coverage_rows(before_consent)
    consent = _cap1_coverage_rows(after_consent)
    if len(removed) != 1 or old_rows.count(removed[0]) != 1 or not consent:
        raise ValueError("P-109 coverage preimage must occur exactly once")
    prior = [row for row in old_rows if row != removed[0]]
    delta = inputs[CAP1_ROOT_COVERAGE].decode("utf-8")

    def coverage_fragment(name):
        pattern = rf"^```text {name}-coverage\n((?:[^\n]*\n)+?)^```$"
        match = re.findall(pattern, delta, re.M)
        if len(match) != 1:
            raise ValueError(f"expected exactly one {name} coverage block")
        return _cap1_coverage_rows(match[0])

    removed = coverage_fragment("predecessor")
    replacement = coverage_fragment("proposed")
    if len(removed) != 1 or prior.count(removed[0]) != 1 or len(replacement) != 2:
        raise ValueError("006 coverage must replace exactly one prior row with two")
    index = prior.index(removed[0])
    future = prior[:index] + replacement + prior[index + 1:]
    clauses = re.findall(r"^      - \{id: (RFC[1-9]-[^,]+),",
                         inputs[CAP1_ROOT_INDEX].decode("utf-8"), re.M)
    if len(clauses) != len(set(clauses)) or not set(next_warrants["contracts"]) <= set(clauses):
        raise ValueError("invalid Wave A/B clause population")
    clause_digest = sha("".join(f"{clause}\n" for clause in sorted(clauses)).encode("utf-8"))

    def coverage(rows, mapped):
        mapped = len(mapped)
        states = _cap1_coverage_states(rows, 2)
        for key, count in _cap1_coverage_states(consent, 3).items():
            states[key] += count
        return {"consequences": len(rows) + len(consent), **states,
                "mapped_contracts": mapped, "unmapped_contracts": len(clauses) - mapped}

    return {
        "kind": "prospective-cap1-root-adjudication",
        "requirement_count": len(a),
        "scenario_count": sum(len(req["scenarios"]) for req in a.values()),
        "predecessor_sha256": sha(historical.encode("utf-8")),
        "composed_spec_sha256": sha(successor.encode("utf-8")),
        "source_files": {path: sha(data) for path, data in inputs.items()
                         if path != CAP1_ROOT_INDEX},
        "dependencies": next_warrants,
        "coverage": {
            "accepted_clauses": len(clauses),
            "accepted_clauses_sha256": clause_digest,
            "retained_consent_rows": len(consent),
            "signed_baseline_literal": {"consequences": len(old_rows), **_cap1_coverage_states(old_rows, 2)},
            "predecessor": coverage(prior, previous_warrants["contracts"]),
            "successor": coverage(future, next_warrants["contracts"]),
        },
    }


def census(root):
    """Return ({family: {id: {name, scenarios}}}, findings)."""
    out, findings = {}, []
    for family, rel in FAMILY_SPECS.items():
        text = read_text(root, rel)
        if text is None:
            findings.append(f"{family}: `{rel}` missing")
            continue
        if family == "CAP1":
            out[family], cap1 = compose_cap1(root, text)
            findings += cap1
            continue
        a, pa = parse_regex(text, family)
        b, pb = parse_manual(text, family)
        findings += [f"{family} method A: duplicate or orphan {p}" for p in pa]
        findings += [f"{family} method B: duplicate or orphan {p}" for p in pb]
        if a != b:
            findings.append(f"{family}: the two methods disagree "
                            f"({len(a)} vs {len(b)} requirements)")
        out[family] = a
    base = read_text(root, POLARIS_BASE_SPEC)
    overlay = read_text(root, POLARIS_OVERLAY_SPEC)
    additions = [(change, read_text(root, rel))
                 for change, rel in polaris_additions(root)]
    for change, _text in additions:
        if not addition_terminals(root, change):
            findings.append(f"POLARIS: addition `{change}` has no versioned "
                            "sign-off record and no declared adoption record, "
                            "so its requirements are not expected")
    if base is None or overlay is None:
        findings.append("POLARIS: base or overlay spec missing")
    else:
        a, pa = compose_polaris_by_id(base, overlay, *additions)
        b, pb = compose_polaris_by_name(base, overlay, *additions)
        amendment, _records, _subjects = declared_source_binding(root)
        if amendment is not None:
            a, extra_a = compose_declared_source_by_id(a, amendment)
            b, extra_b = compose_declared_source_by_name(b, amendment)
            pa += extra_a
            pb += extra_b
        url_amendment, url_records, url_subjects = url_source_binding(root)
        findings += url_records + url_subjects
        if url_amendment is not None:
            if amendment is None:
                findings.append("POLARIS: URL declared-source requires effective declared-source v2.0")
            else:
                a, extra_a = compose_url_source_by_id(a, url_amendment)
                b, extra_b = compose_url_source_by_name(b, url_amendment)
                pa += extra_a
                pb += extra_b
        figure_amendment, figure_records, figure_subjects = figure_binding(root)
        findings += figure_records + figure_subjects
        if figure_amendment is not None:
            if amendment is None:
                findings.append("POLARIS: figure homes and fit requires effective declared-source v2.0")
            else:
                a, extra_a = compose_figure_by_id(a, figure_amendment)
                b, extra_b = compose_figure_by_name(b, figure_amendment)
                pa += extra_a
                pb += extra_b
        derived_amendment, derived_records, derived_subjects = derived_binding(root)
        findings += derived_records + derived_subjects
        if derived_amendment is not None:
            if figure_amendment is None or amendment is None:
                findings.append("POLARIS: derived observed facts requires effective figure homes and fit v2.2")
            else:
                a, extra_a = compose_figure_by_id(a, derived_amendment)
                b, extra_b = compose_figure_by_name(b, derived_amendment)
                pa += extra_a
                pb += extra_b
        ledger_amendment, ledger_records, ledger_subjects = ledger_binding(root)
        findings += ledger_records + ledger_subjects
        if ledger_amendment is not None:
            if derived_amendment is None or figure_amendment is None or amendment is None:
                findings.append("POLARIS: ledger packs thesis requires effective derived observed facts v2.3")
            else:
                a, extra_a = compose_figure_by_id(a, ledger_amendment)
                b, extra_b = compose_figure_by_name(b, ledger_amendment)
                pa += extra_a
                pb += extra_b
        kinds_amendment, kinds_records, kinds_subjects = kinds_binding(root)
        findings += kinds_records + kinds_subjects
        if kinds_amendment is not None:
            if (ledger_amendment is None or derived_amendment is None
                    or figure_amendment is None or amendment is None):
                findings.append("POLARIS: figure kinds requires effective ledger packs thesis v2.4")
            else:
                a, extra_a = compose_figure_by_id(a, kinds_amendment)
                b, extra_b = compose_figure_by_name(b, kinds_amendment)
                pa += extra_a
                pb += extra_b
        reach_amendment, reach_records, reach_subjects = reach_binding(root)
        findings += reach_records + reach_subjects
        if reach_amendment is not None:
            if amendment is None:
                findings.append("POLARIS: declared-source reach requires effective declared-source v2.0")
            else:
                a, extra_a = compose_figure_by_id(a, reach_amendment, REACH_REPLACES)
                b, extra_b = compose_figure_by_name(b, reach_amendment, REACH_REPLACES)
                pa += extra_a
                pb += extra_b
        readmit_amendment, readmit_records, readmit_subjects = readmit_binding(root)
        findings += readmit_records + readmit_subjects
        if readmit_amendment is not None:
            if reach_amendment is None or amendment is None:
                findings.append("POLARIS: declared-source re-admission requires effective declared-source reach v2.6")
            else:
                a, extra_a = compose_figure_by_id(a, readmit_amendment, REACH_REPLACES)
                b, extra_b = compose_figure_by_name(b, readmit_amendment, REACH_REPLACES)
                pa += extra_a
                pb += extra_b
        manifests_amendment, manifests_records, manifests_subjects = manifests_binding(root)
        findings += manifests_records + manifests_subjects
        if manifests_amendment is not None:
            if (kinds_amendment is None or ledger_amendment is None or derived_amendment is None
                    or figure_amendment is None or amendment is None):
                findings.append("POLARIS: manifest recognizers requires effective figure kinds v2.5")
            else:
                a, extra_a = compose_figure_by_id(a, manifests_amendment)
                b, extra_b = compose_figure_by_name(b, manifests_amendment)
                pa += extra_a
                pb += extra_b
        repairs_amendment, repairs_records, repairs_subjects = repairs_binding(root)
        findings += repairs_records + repairs_subjects
        if repairs_amendment is not None:
            if (manifests_amendment is None or kinds_amendment is None or ledger_amendment is None
                    or derived_amendment is None or figure_amendment is None or amendment is None):
                findings.append("POLARIS: spec repairs requires effective manifest recognizers v2.7")
            else:
                a, extra_a = compose_figure_by_id(a, repairs_amendment)
                b, extra_b = compose_figure_by_name(b, repairs_amendment)
                pa += extra_a
                pb += extra_b
        maps_amendment, maps_records, maps_subjects = maps_binding(root)
        findings += maps_records + maps_subjects
        if maps_amendment is not None:
            if (repairs_amendment is None or manifests_amendment is None or kinds_amendment is None
                    or ledger_amendment is None or derived_amendment is None or figure_amendment is None
                    or amendment is None):
                findings.append("POLARIS: computed maps requires effective spec repairs v2.8")
            else:
                a, extra_a = compose_figure_by_id(a, maps_amendment)
                b, extra_b = compose_figure_by_name(b, maps_amendment)
                pa += extra_a
                pb += extra_b
        bounds_amendment, bounds_records, bounds_subjects = bounds_binding(root)
        findings += bounds_records + bounds_subjects
        if bounds_amendment is not None:
            if (maps_amendment is None or repairs_amendment is None or manifests_amendment is None
                    or kinds_amendment is None or ledger_amendment is None or derived_amendment is None
                    or figure_amendment is None or amendment is None):
                findings.append("POLARIS: record bounds requires effective computed maps v2.9")
            else:
                a, extra_a = compose_figure_by_id(a, bounds_amendment)
                b, extra_b = compose_figure_by_name(b, bounds_amendment)
                pa += extra_a
                pb += extra_b
        corr_amendment, corr_records, corr_subjects = corr_binding(root)
        findings += corr_records + corr_subjects
        if corr_amendment is not None:
            if (bounds_amendment is None or maps_amendment is None or repairs_amendment is None or manifests_amendment is None
                    or kinds_amendment is None or ledger_amendment is None or derived_amendment is None
                    or figure_amendment is None or amendment is None):
                findings.append("POLARIS: spec corrections requires effective record bounds v2.10")
            else:
                a, extra_a = compose_figure_by_id(a, corr_amendment)
                b, extra_b = compose_figure_by_name(b, corr_amendment)
                pa += extra_a
                pb += extra_b
        coverage_amendment, coverage_records, coverage_subjects = coverage_binding(root)
        findings += coverage_records + coverage_subjects
        if coverage_amendment is not None:
            if (corr_amendment is None or bounds_amendment is None or maps_amendment is None or repairs_amendment is None or manifests_amendment is None
                    or kinds_amendment is None or ledger_amendment is None or derived_amendment is None
                    or figure_amendment is None or amendment is None):
                findings.append("POLARIS: coverage precheck requires effective spec corrections v2.11")
            else:
                a, extra_a = compose_figure_by_id(a, coverage_amendment)
                b, extra_b = compose_figure_by_name(b, coverage_amendment)
                pa += extra_a
                pb += extra_b
        infra_amendment, infra_records, infra_subjects = infra_binding(root)
        findings += infra_records + infra_subjects
        if infra_amendment is not None:
            if (coverage_amendment is None or corr_amendment is None or bounds_amendment is None or maps_amendment is None
                    or repairs_amendment is None or manifests_amendment is None
                    or kinds_amendment is None or ledger_amendment is None or derived_amendment is None
                    or figure_amendment is None or amendment is None):
                findings.append("POLARIS: infrastructure recognizers requires effective coverage precheck v2.12")
            else:
                a, extra_a = compose_figure_by_id(a, infra_amendment)
                b, extra_b = compose_figure_by_name(b, infra_amendment)
                pa += extra_a
                pb += extra_b
        findpages_amendment, findpages_records, findpages_subjects = findpages_binding(root)
        findings += findpages_records + findpages_subjects
        if findpages_amendment is not None:
            if (infra_amendment is None or coverage_amendment is None or corr_amendment is None or bounds_amendment is None
                    or maps_amendment is None or repairs_amendment is None or manifests_amendment is None
                    or kinds_amendment is None or ledger_amendment is None or derived_amendment is None
                    or figure_amendment is None or amendment is None):
                findings.append("POLARIS: index and task routes requires effective infrastructure recognizers v2.14")
            else:
                a, extra_a = compose_figure_by_id(a, findpages_amendment)
                b, extra_b = compose_figure_by_name(b, findpages_amendment)
                pa += extra_a
                pb += extra_b
        subsec_amendment, subsec_records, subsec_subjects = subsec_binding(root)
        findings += subsec_records + subsec_subjects
        if subsec_amendment is not None:
            if findpages_amendment is None:
                findings.append("POLARIS: page subsections requires effective index and task routes v2.15")
            else:
                a, extra_a = compose_figure_by_id(a, subsec_amendment)
                b, extra_b = compose_figure_by_name(b, subsec_amendment)
                pa += extra_a
                pb += extra_b
        raw_read_amendment, raw_read_records, raw_read_subjects = raw_read_binding(root)
        findings += raw_read_records + raw_read_subjects
        if raw_read_amendment is not None:
            a, extra_a = compose_figure_by_id(a, raw_read_amendment, RAW_READ_REPLACES)
            b, extra_b = compose_figure_by_name(b, raw_read_amendment, RAW_READ_REPLACES)
            pa += extra_a
            pb += extra_b
        treeread_amendment, treeread_records, treeread_subjects = treeread_binding(root)
        findings += treeread_records + treeread_subjects
        if treeread_amendment is not None:
            a, extra_a = compose_figure_by_id(a, treeread_amendment, TREEREAD_REPLACES)
            b, extra_b = compose_figure_by_name(b, treeread_amendment, TREEREAD_REPLACES)
            pa += extra_a
            pb += extra_b
        verify_amendment, verify_records, verify_subjects = verify_binding(root)
        findings += verify_records + verify_subjects
        if verify_amendment is not None:
            if treeread_amendment is None:
                findings.append("POLARIS: verify text requires effective run-tree read bounds v2.18")
            else:
                a, extra_a = compose_figure_by_id(a, verify_amendment, VERIFY_REPLACES)
                b, extra_b = compose_figure_by_name(b, verify_amendment, VERIFY_REPLACES)
                pa += extra_a
                pb += extra_b
        qfile_amendment, qfile_records, qfile_subjects = qfile_binding(root)
        findings += qfile_records + qfile_subjects
        if qfile_amendment is not None:
            if verify_amendment is None:
                findings.append("POLARIS: question file requires effective verify text v2.21")
            else:
                a, extra_a = compose_figure_by_id(a, qfile_amendment, QFILE_REPLACES)
                b, extra_b = compose_figure_by_name(b, qfile_amendment, QFILE_REPLACES)
                pa += extra_a
                pb += extra_b
        scripted_grade_amendment, scripted_grade_records, scripted_grade_subjects = scripted_grade_binding(root)
        findings += scripted_grade_records + scripted_grade_subjects
        if scripted_grade_amendment is not None:
            if qfile_amendment is None:
                findings.append("POLARIS: scripted benchmark grading requires effective question-file v2.27")
            else:
                a, extra_a = compose_figure_by_id(a, scripted_grade_amendment, SCRIPTED_GRADE_REPLACES)
                b, extra_b = compose_figure_by_name(b, scripted_grade_amendment, SCRIPTED_GRADE_REPLACES)
                pa += extra_a
                pb += extra_b
        step_measures_amendment, step_measures_records, step_measures_subjects = step_measures_binding(root)
        findings += step_measures_records + step_measures_subjects
        if step_measures_amendment is not None:
            if scripted_grade_amendment is None:
                findings.append("POLARIS: dossier close measures require effective scripted benchmark v2.30")
            else:
                a, extra_a = compose_figure_by_id(a, step_measures_amendment, STEP_MEASURES_REPLACES)
                b, extra_b = compose_figure_by_name(b, step_measures_amendment, STEP_MEASURES_REPLACES)
                pa += extra_a
                pb += extra_b
        covhold_amendment, covhold_records, covhold_subjects = covhold_binding(root)
        findings += covhold_records + covhold_subjects
        if covhold_amendment is not None:
            if treeread_amendment is None:
                findings.append("POLARIS: coverage hold requires effective run-tree read bounds v2.18")
            else:
                a, extra_a = compose_figure_by_id(a, covhold_amendment, COVHOLD_REPLACES)
                b, extra_b = compose_figure_by_name(b, covhold_amendment, COVHOLD_REPLACES)
                pa += extra_a
                pb += extra_b
        reltype_amendment, reltype_records, reltype_subjects = reltype_binding(root)
        findings += reltype_records + reltype_subjects
        if reltype_amendment is not None:
            if subsec_amendment is None:
                findings.append("POLARIS: relation types requires effective page subsections v2.16")
            else:
                a, extra_a = compose_figure_by_id(a, reltype_amendment)
                b, extra_b = compose_figure_by_name(b, reltype_amendment)
                pa += extra_a
                pb += extra_b
        hero_amendment, hero_records, hero_subjects = hero_binding(root)
        findings += hero_records + hero_subjects
        if hero_amendment is not None:
            if reltype_amendment is None:
                findings.append("POLARIS: hero figure requires effective relation types v2.19")
            else:
                a, extra_a = compose_figure_by_id(a, hero_amendment)
                b, extra_b = compose_figure_by_name(b, hero_amendment)
                pa += extra_a
                pb += extra_b
        readers_amendment, readers_records, readers_subjects = readers_binding(root)
        findings += readers_records + readers_subjects
        if readers_amendment is not None:
            if hero_amendment is None:
                findings.append("POLARIS: reader's edition requires effective hero figure v2.20")
            else:
                a, extra_a = compose_figure_by_id(a, readers_amendment)
                b, extra_b = compose_figure_by_name(b, readers_amendment)
                pa += extra_a
                pb += extra_b
        cont_amendment, cont_records, cont_subjects = cont_binding(root)
        findings += cont_records + cont_subjects
        if cont_amendment is not None:
            if readers_amendment is None:
                findings.append("POLARIS: containment figure requires effective reader's edition v2.22")
            else:
                a, extra_a = compose_figure_by_id(a, cont_amendment)
                b, extra_b = compose_figure_by_name(b, cont_amendment)
                pa += extra_a
                pb += extra_b
        model_amendment, model_records, model_subjects = model_binding(root)
        findings += model_records + model_subjects
        if model_amendment is not None:
            if cont_amendment is None:
                findings.append("POLARIS: system model requires effective containment figure v2.23")
            else:
                a, extra_a = compose_figure_by_id(a, model_amendment)
                b, extra_b = compose_figure_by_name(b, model_amendment)
                pa += extra_a
                pb += extra_b
        edit_account_amendment, edit_account_records, edit_account_subjects = edit_account_binding(root)
        findings += edit_account_records + edit_account_subjects
        if edit_account_amendment is not None:
            a, extra_a = compose_figure_by_id(a, edit_account_amendment, EDIT_ACCOUNT_REPLACES)
            b, extra_b = compose_figure_by_name(b, edit_account_amendment, EDIT_ACCOUNT_REPLACES)
            pa += extra_a
            pb += extra_b
        worth_amendment, worth_records, worth_subjects = worth_binding(root)
        findings += worth_records + worth_subjects
        if worth_amendment is not None:
            if model_amendment is None:
                findings.append("POLARIS: worth-knowing requires effective v2.24 system model")
            else:
                a, extra_a = compose_figure_by_id(a, worth_amendment)
                b, extra_b = compose_figure_by_name(b, worth_amendment)
                pa += extra_a
                pb += extra_b
        term_brief_amendment, term_brief_records, term_brief_subjects = term_brief_binding(root)
        findings += term_brief_records + term_brief_subjects
        if term_brief_amendment is not None:
            a, extra_a = compose_figure_by_id(a, term_brief_amendment, TERM_BRIEF_REPLACES)
            b, extra_b = compose_figure_by_name(b, term_brief_amendment, TERM_BRIEF_REPLACES)
            pa += extra_a
            pb += extra_b
        qkind_amendment, qkind_records, qkind_subjects = qkind_binding(root)
        findings += qkind_records + qkind_subjects
        if qkind_amendment is not None:
            if term_brief_amendment is None:
                findings.append("POLARIS: question-kind floor requires effective terminology brief v2.29")
            else:
                a, extra_a = compose_figure_by_id(a, qkind_amendment, QKIND_REPLACES)
                b, extra_b = compose_figure_by_name(b, qkind_amendment, QKIND_REPLACES)
                pa += extra_a
                pb += extra_b
        figplan_amendment, figplan_records, figplan_subjects = figplan_binding(root)
        findings += figplan_records + figplan_subjects
        if figplan_amendment is not None:
            if qkind_amendment is None:
                findings.append("POLARIS: figure plan requires effective question-kind floor v2.32")
            else:
                a, extra_a = compose_figure_by_id(a, figplan_amendment, FIGPLAN_REPLACES)
                b, extra_b = compose_figure_by_name(b, figplan_amendment, FIGPLAN_REPLACES)
                pa += extra_a
                pb += extra_b
        _vbase_state, vbase_amendment, vbase_records, vbase_subjects = vbase_screening_binding(root)
        findings += vbase_records + vbase_subjects
        if vbase_amendment is not None:
            if figplan_amendment is None:
                findings.append("POLARIS: derived base requires effective figure plan v2.33")
            else:
                a, extra_a = compose_figure_by_id(a, vbase_amendment, VBASE_SCREENING_REPLACES)
                b, extra_b = compose_figure_by_name(b, vbase_amendment, VBASE_SCREENING_REPLACES)
                pa += extra_a
                pb += extra_b
        _advice_state, advice, advice_records, advice_subjects = p5_advice_binding(root)
        findings += advice_records + advice_subjects
        if advice is not None:
            a, extra_a = compose_figure_by_id(a, advice, VBASE_SCREENING_REPLACES)
            b, extra_b = compose_figure_by_name(b, advice, VBASE_SCREENING_REPLACES)
            pa += extra_a
            pb += extra_b
        choice_amendment, choice_records, choice_subjects = choice_binding(root)
        findings += choice_records + choice_subjects
        if choice_amendment is not None:
            if advice is None:
                findings.append("POLARIS: choice floor requires effective source-example advice v2.36")
            else:
                a, extra_a = compose_figure_by_id(a, choice_amendment, CHOICE_REPLACES)
                b, extra_b = compose_figure_by_name(b, choice_amendment, CHOICE_REPLACES)
                pa += extra_a
                pb += extra_b
        migpar_amendment, migpar_records, migpar_subjects = migpar_binding(root)
        findings += migpar_records + migpar_subjects
        if migpar_amendment is not None:
            if choice_amendment is None:
                findings.append("POLARIS: migration parity requires effective choice floor v2.37")
            else:
                a, extra_a = compose_figure_by_id(a, migpar_amendment, MIGPAR_REPLACES)
                b, extra_b = compose_figure_by_name(b, migpar_amendment, MIGPAR_REPLACES)
                pa += extra_a
                pb += extra_b
        impfacts_amendment, impfacts_records, impfacts_subjects = impfacts_binding(root)
        findings += impfacts_records + impfacts_subjects
        if impfacts_amendment is not None:
            if migpar_amendment is None:
                findings.append("POLARIS: import facts require effective migration parity v2.38")
            else:
                a, extra_a = compose_figure_by_id(a, impfacts_amendment, IMPFACTS_REPLACES)
                b, extra_b = compose_figure_by_name(b, impfacts_amendment, IMPFACTS_REPLACES)
                pa += extra_a
                pb += extra_b
        walk_amendment, walk_records, walk_subjects = walk_binding(root)
        findings += walk_records + walk_subjects
        if walk_amendment is not None:
            if impfacts_amendment is None:
                findings.append("POLARIS: figure walks require effective import facts v2.39")
            else:
                a, extra_a = compose_figure_by_id(a, walk_amendment, WALK_REPLACES)
                b, extra_b = compose_figure_by_name(b, walk_amendment, WALK_REPLACES)
                pa += extra_a
                pb += extra_b
        tnames_amendment, tnames_records, tnames_subjects = tnames_binding(root)
        findings += tnames_records + tnames_subjects
        if tnames_amendment is not None:
            if walk_amendment is None:
                findings.append("POLARIS: test-name recognizers require effective figure walks v2.40")
            else:
                a, extra_a = compose_figure_by_id(a, tnames_amendment, TNAMES_REPLACES)
                b, extra_b = compose_figure_by_name(b, tnames_amendment, TNAMES_REPLACES)
                pa += extra_a
                pb += extra_b
        migbound_amendment, migbound_records, migbound_subjects = migbound_binding(root)
        findings += migbound_records + migbound_subjects
        if migbound_amendment is not None:
            if tnames_amendment is None:
                findings.append("POLARIS: migration bounds require effective test-name recognizers v2.42")
            else:
                a, extra_a = compose_figure_by_id(a, migbound_amendment, MIGBOUND_REPLACES)
                b, extra_b = compose_figure_by_name(b, migbound_amendment, MIGBOUND_REPLACES)
                pa += extra_a
                pb += extra_b
        rough_amendment, rough_records, rough_subjects = rough_binding(root)
        findings += rough_records + rough_subjects
        if rough_amendment is not None:
            if migbound_amendment is None:
                findings.append("POLARIS: rough-edge markers require effective migration bounds v2.43")
            else:
                a, extra_a = compose_figure_by_id(a, rough_amendment, ROUGH_REPLACES)
                b, extra_b = compose_figure_by_name(b, rough_amendment, ROUGH_REPLACES)
                pa += extra_a
                pb += extra_b
        findings += [f"POLARIS method A: {p}" for p in pa]
        findings += [f"POLARIS method B: {p}" for p in pb]
        if a != b:
            findings.append("POLARIS: ID-keyed and name-keyed compositions "
                            "disagree")
        out["POLARIS"] = a
    return out, findings


def census_json(pop):
    doc = {"note": "Generated by scripts/check_spec_reconciliation.py "
                   "--census; requirement identity, name and scenario titles "
                   "in the effective composition. Navigation evidence, "
                   "never authority.",
           "families": {}}
    for family in ("CAP1", "POC", "PWB", "POLARIS"):
        reqs = pop.get(family, {})
        doc["families"][family] = {
            "requirements": len(reqs),
            "scenarios": sum(len(r["scenarios"]) for r in reqs.values()),
            "members": {k: reqs[k] for k in sorted(reqs)},
        }
    return json.dumps(doc, indent=2, ensure_ascii=False, sort_keys=False) + "\n"


def vbase_screening_projects(root, pop, findings):
    """Regenerate both sides of the tag transition using independent parsers."""
    state, _text, _records, _subjects = vbase_screening_binding(root)
    if state not in {"staged", "effective"}:
        return pop, None
    antecedent, _records, _subjects = figplan_binding(root)
    amendment = read_text(root, VBASE_SCREENING_SPEC)
    current = pop.get("POLARIS", {})
    projections = {}
    for label, source in (("pretag", antecedent), ("active", amendment)):
        by_id, errors_a = compose_figure_by_id(current, source or "", VBASE_SCREENING_REPLACES)
        by_name, errors_b = compose_figure_by_name(current, source or "", VBASE_SCREENING_REPLACES)
        if errors_a or errors_b or by_id != by_name:
            findings.append(f"POLARIS derived-base screening {label}: census projections disagree")
            return pop, None
        projections[label] = by_id
    selected = "active" if state == "effective" else "pretag"
    selected_population = projections[selected]
    _advice_state, advice, _records, _subjects = p5_advice_binding(root)
    if advice is not None:
        by_id, errors_a = compose_figure_by_id(selected_population, advice, VBASE_SCREENING_REPLACES)
        by_name, errors_b = compose_figure_by_name(selected_population, advice, VBASE_SCREENING_REPLACES)
        if errors_a or errors_b or by_id != by_name:
            findings.append("POLARIS source-example advice: selected census projections disagree")
        selected_population = by_id
        choice_amendment, _records, _subjects = choice_binding(root)
        if choice_amendment is not None:
            by_id, errors_a = compose_figure_by_id(selected_population, choice_amendment, CHOICE_REPLACES)
            by_name, errors_b = compose_figure_by_name(selected_population, choice_amendment, CHOICE_REPLACES)
            if errors_a or errors_b or by_id != by_name:
                findings.append("POLARIS choice floor: selected census projections disagree")
            selected_population = by_id
            migpar_amendment, _records, _subjects = migpar_binding(root)
            if migpar_amendment is not None:
                by_id, errors_a = compose_figure_by_id(selected_population, migpar_amendment, MIGPAR_REPLACES)
                by_name, errors_b = compose_figure_by_name(selected_population, migpar_amendment, MIGPAR_REPLACES)
                if errors_a or errors_b or by_id != by_name:
                    findings.append("POLARIS migration parity: selected census projections disagree")
                selected_population = by_id
                impfacts_amendment, _records, _subjects = impfacts_binding(root)
                if impfacts_amendment is not None:
                    by_id, errors_a = compose_figure_by_id(selected_population, impfacts_amendment, IMPFACTS_REPLACES)
                    by_name, errors_b = compose_figure_by_name(selected_population, impfacts_amendment, IMPFACTS_REPLACES)
                    if errors_a or errors_b or by_id != by_name:
                        findings.append("POLARIS import facts: selected census projections disagree")
                    selected_population = by_id
                    walk_amendment, _records, _subjects = walk_binding(root)
                    if walk_amendment is not None:
                        by_id, errors_a = compose_figure_by_id(selected_population, walk_amendment, WALK_REPLACES)
                        by_name, errors_b = compose_figure_by_name(selected_population, walk_amendment, WALK_REPLACES)
                        if errors_a or errors_b or by_id != by_name:
                            findings.append("POLARIS figure walks: selected census projections disagree")
                        selected_population = by_id
                        tnames_amendment, _records, _subjects = tnames_binding(root)
                        if tnames_amendment is not None:
                            by_id, errors_a = compose_figure_by_id(selected_population, tnames_amendment, TNAMES_REPLACES)
                            by_name, errors_b = compose_figure_by_name(selected_population, tnames_amendment, TNAMES_REPLACES)
                            if errors_a or errors_b or by_id != by_name:
                                findings.append("POLARIS test-name recognizers: selected census projections disagree")
                            selected_population = by_id
                            migbound_amendment, _records, _subjects = migbound_binding(root)
                            if migbound_amendment is not None:
                                by_id, errors_a = compose_figure_by_id(selected_population, migbound_amendment, MIGBOUND_REPLACES)
                                by_name, errors_b = compose_figure_by_name(selected_population, migbound_amendment, MIGBOUND_REPLACES)
                                if errors_a or errors_b or by_id != by_name:
                                    findings.append("POLARIS migration bounds: selected census projections disagree")
                                selected_population = by_id
                                rough_amendment, _records, _subjects = rough_binding(root)
                                if rough_amendment is not None:
                                    by_id, errors_a = compose_figure_by_id(selected_population, rough_amendment, ROUGH_REPLACES)
                                    by_name, errors_b = compose_figure_by_name(selected_population, rough_amendment, ROUGH_REPLACES)
                                    if errors_a or errors_b or by_id != by_name:
                                        findings.append("POLARIS rough-edge markers: selected census projections disagree")
                                    selected_population = by_id
    if selected_population != current:
        findings.append("POLARIS: selected census differs from the separately verified screening transition")
    ident = VBASE_SCREENING_REPLACES[0]
    ledger = {"requirement": ident, "tag": VBASE_SCREENING_TAG, "populations": {}}
    for label, requirements in projections.items():
        ledger["populations"][label] = {
            "requirements": len(requirements),
            "scenarios": sum(len(row["scenarios"]) for row in requirements.values()),
            "member": requirements[ident],
        }
    baseline = {**pop, "POLARIS": projections["pretag"]}
    return baseline, json.dumps(ledger, indent=2, ensure_ascii=False) + "\n"


def polaris_expected(root, findings):
    """Expected Polaris (requirements, scenarios, ids), derived.

    The base-and-overlay literal (31 / 182, IDs 001–031) plus, for each signed
    addition, the requirements that addition ADDs, read by both block parsers
    from the addition alone (never from the composition) and required to agree.
    """
    n_req, n_scen = EXPECTED_TOTALS["POLARIS"]
    ids = {f"{POLARIS_ID}{i:03d}" for i in range(1, n_req + 1)}
    for change, rel in polaris_additions(root):
        if not addition_terminals(root, change):
            continue
        text = read_text(root, rel) or ""
        by_regex = sorted((tuple(i), len(s)) for kind, i, _n, s in
                          _polaris_blocks_regex(text) if kind == "ADDED")
        by_lines = sorted((tuple(b["ids"]), len(b["scenarios"])) for b in
                          _polaris_blocks_manual(text) if b["section"] == "ADDED")
        if by_regex != by_lines:
            findings.append(f"POLARIS addition `{change}`: the two parsers "
                            "disagree on what it adds")
        added = {i[0] for i, _s in by_regex if len(i) == 1}
        if added & ids:
            findings.append(f"POLARIS addition `{change}`: re-adds "
                            f"{sorted(added & ids)}")
        ids |= added
        n_req += len(by_regex)
        n_scen += sum(s for _i, s in by_regex)
    amendment, _records, _subjects = declared_source_binding(root)
    if amendment is not None:
        base = read_text(root, POLARIS_BASE_SPEC) or ""
        overlay = read_text(root, POLARIS_OVERLAY_SPEC) or ""
        additions = [(change, read_text(root, rel) or "")
                     for change, rel in polaris_additions(root)]
        before_a, _pa = compose_polaris_by_id(base, overlay, *additions)
        before_b, _pb = compose_polaris_by_name(base, overlay, *additions)
        after_a, pa = compose_declared_source_by_id(before_a, amendment)
        after_b, pb = compose_declared_source_by_name(before_b, amendment)
        delta_a = sum(len(r["scenarios"]) for r in after_a.values()) - sum(
            len(r["scenarios"]) for r in before_a.values())
        delta_b = sum(len(r["scenarios"]) for r in after_b.values()) - sum(
            len(r["scenarios"]) for r in before_b.values())
        if pa or pb or delta_a != delta_b or set(after_a) != set(before_a):
            findings.append("POLARIS declared-source: replacement delta methods disagree or change identities")
        n_scen += delta_a
        url_amendment, _records, _subjects = url_source_binding(root)
        if url_amendment is not None:
            url_a, pa = compose_url_source_by_id(after_a, url_amendment)
            url_b, pb = compose_url_source_by_name(after_b, url_amendment)
            expected_ids = ids | {URL_SOURCE_ADDS}
            if pa or pb or url_a != url_b or set(url_a) != expected_ids:
                findings.append("POLARIS URL declared-source: methods disagree or change unexpected identities")
            ids = expected_ids
            n_req += 1
            n_scen += sum(len(row["scenarios"]) for row in url_a.values()) - sum(
                len(row["scenarios"]) for row in after_a.values())
            after_a, after_b = url_a, url_b
        reach_amendment, _records, _subjects = reach_binding(root)
        if reach_amendment is not None:
            rea_a, pa = compose_figure_by_id(after_a, reach_amendment, REACH_REPLACES)
            rea_b, pb = compose_figure_by_name(after_b, reach_amendment, REACH_REPLACES)
            if pa or pb or rea_a != rea_b or set(rea_a) != set(after_a):
                findings.append("POLARIS declared-source reach: methods disagree or change identities")
            n_scen += sum(len(row["scenarios"]) for row in rea_a.values()) - sum(
                len(row["scenarios"]) for row in after_a.values())
            readmit_amendment, _records, _subjects = readmit_binding(root)
            if readmit_amendment is not None:
                rad_a, pa = compose_figure_by_id(rea_a, readmit_amendment, REACH_REPLACES)
                rad_b, pb = compose_figure_by_name(rea_b, readmit_amendment, REACH_REPLACES)
                if pa or pb or rad_a != rad_b or set(rad_a) != set(rea_a):
                    findings.append("POLARIS declared-source re-admission: methods disagree or change identities")
                n_scen += sum(len(row["scenarios"]) for row in rad_a.values()) - sum(
                    len(row["scenarios"]) for row in rea_a.values())
        figure_amendment, _records, _subjects = figure_binding(root)
        if figure_amendment is not None:
            fig_a, pa = compose_figure_by_id(after_a, figure_amendment)
            fig_b, pb = compose_figure_by_name(after_b, figure_amendment)
            if pa or pb or fig_a != fig_b or set(fig_a) != set(after_a):
                findings.append("POLARIS figure homes and fit: methods disagree or change identities")
            n_scen += sum(len(row["scenarios"]) for row in fig_a.values()) - sum(
                len(row["scenarios"]) for row in after_a.values())
            derived_amendment, _records, _subjects = derived_binding(root)
            if derived_amendment is not None:
                der_a, pa = compose_figure_by_id(fig_a, derived_amendment)
                der_b, pb = compose_figure_by_name(fig_b, derived_amendment)
                if pa or pb or der_a != der_b or set(der_a) != set(fig_a):
                    findings.append("POLARIS derived observed facts: methods disagree or change identities")
                n_scen += sum(len(row["scenarios"]) for row in der_a.values()) - sum(
                    len(row["scenarios"]) for row in fig_a.values())
                ledger_amendment, _records, _subjects = ledger_binding(root)
                if ledger_amendment is not None:
                    led_a, pa = compose_figure_by_id(der_a, ledger_amendment)
                    led_b, pb = compose_figure_by_name(der_b, ledger_amendment)
                    if pa or pb or led_a != led_b or set(led_a) != set(der_a):
                        findings.append("POLARIS ledger packs thesis: methods disagree or change identities")
                    n_scen += sum(len(row["scenarios"]) for row in led_a.values()) - sum(
                        len(row["scenarios"]) for row in der_a.values())
                    kinds_amendment, _records, _subjects = kinds_binding(root)
                    if kinds_amendment is not None:
                        kin_a, pa = compose_figure_by_id(led_a, kinds_amendment)
                        kin_b, pb = compose_figure_by_name(led_b, kinds_amendment)
                        if pa or pb or kin_a != kin_b or set(kin_a) != set(led_a):
                            findings.append("POLARIS figure kinds: methods disagree or change identities")
                        n_scen += sum(len(row["scenarios"]) for row in kin_a.values()) - sum(
                            len(row["scenarios"]) for row in led_a.values())
                        manifests_amendment, _records, _subjects = manifests_binding(root)
                        if manifests_amendment is not None:
                            man_a, pa = compose_figure_by_id(kin_a, manifests_amendment)
                            man_b, pb = compose_figure_by_name(kin_b, manifests_amendment)
                            if pa or pb or man_a != man_b or set(man_a) != set(kin_a):
                                findings.append("POLARIS manifest recognizers: methods disagree or change identities")
                            n_scen += sum(len(row["scenarios"]) for row in man_a.values()) - sum(
                                len(row["scenarios"]) for row in kin_a.values())
                            repairs_amendment, _records, _subjects = repairs_binding(root)
                            if repairs_amendment is not None:
                                rep_a, pa = compose_figure_by_id(man_a, repairs_amendment)
                                rep_b, pb = compose_figure_by_name(man_b, repairs_amendment)
                                if pa or pb or rep_a != rep_b or set(rep_a) != set(man_a):
                                    findings.append("POLARIS spec repairs: methods disagree or change identities")
                                n_scen += sum(len(row["scenarios"]) for row in rep_a.values()) - sum(
                                    len(row["scenarios"]) for row in man_a.values())
                                maps_amendment, _records, _subjects = maps_binding(root)
                                if maps_amendment is not None:
                                    map_a, pa = compose_figure_by_id(rep_a, maps_amendment)
                                    map_b, pb = compose_figure_by_name(rep_b, maps_amendment)
                                    if pa or pb or map_a != map_b or set(map_a) != set(rep_a):
                                        findings.append("POLARIS computed maps: methods disagree or change identities")
                                    n_scen += sum(len(row["scenarios"]) for row in map_a.values()) - sum(
                                        len(row["scenarios"]) for row in rep_a.values())
                                    bounds_amendment, _records, _subjects = bounds_binding(root)
                                    if bounds_amendment is not None:
                                        bnd_a, pa = compose_figure_by_id(map_a, bounds_amendment)
                                        bnd_b, pb = compose_figure_by_name(map_b, bounds_amendment)
                                        if pa or pb or bnd_a != bnd_b or set(bnd_a) != set(map_a):
                                            findings.append("POLARIS record bounds: methods disagree or change identities")
                                        n_scen += sum(len(row["scenarios"]) for row in bnd_a.values()) - sum(
                                            len(row["scenarios"]) for row in map_a.values())
                                        corr_amendment, _records, _subjects = corr_binding(root)
                                        if corr_amendment is not None:
                                            cor_a, pa = compose_figure_by_id(bnd_a, corr_amendment)
                                            cor_b, pb = compose_figure_by_name(bnd_b, corr_amendment)
                                            if pa or pb or cor_a != cor_b or set(cor_a) != set(bnd_a):
                                                findings.append("POLARIS spec corrections: methods disagree or change identities")
                                            n_scen += sum(len(row["scenarios"]) for row in cor_a.values()) - sum(
                                                len(row["scenarios"]) for row in bnd_a.values())
                                            coverage_amendment, _records, _subjects = coverage_binding(root)
                                            if coverage_amendment is not None:
                                                cov_a, pa = compose_figure_by_id(cor_a, coverage_amendment)
                                                cov_b, pb = compose_figure_by_name(cor_b, coverage_amendment)
                                                if pa or pb or cov_a != cov_b or set(cov_a) != set(cor_a):
                                                    findings.append("POLARIS coverage precheck: methods disagree or change identities")
                                                n_scen += sum(len(row["scenarios"]) for row in cov_a.values()) - sum(
                                                    len(row["scenarios"]) for row in cor_a.values())
                                                infra_amendment, _records, _subjects = infra_binding(root)
                                                if infra_amendment is not None:
                                                    inf_a, pa = compose_figure_by_id(cov_a, infra_amendment)
                                                    inf_b, pb = compose_figure_by_name(cov_b, infra_amendment)
                                                    if pa or pb or inf_a != inf_b or set(inf_a) != set(cov_a):
                                                        findings.append("POLARIS infrastructure recognizers: methods disagree or change identities")
                                                    n_scen += sum(len(row["scenarios"]) for row in inf_a.values()) - sum(
                                                        len(row["scenarios"]) for row in cov_a.values())
                                                    findpages_amendment, _records, _subjects = findpages_binding(root)
                                                    if findpages_amendment is not None:
                                                        fin_a, pa = compose_figure_by_id(inf_a, findpages_amendment)
                                                        fin_b, pb = compose_figure_by_name(inf_b, findpages_amendment)
                                                        if pa or pb or fin_a != fin_b or set(fin_a) != set(inf_a):
                                                            findings.append("POLARIS index and task routes: methods disagree or change identities")
                                                        n_scen += sum(len(row["scenarios"]) for row in fin_a.values()) - sum(
                                                            len(row["scenarios"]) for row in inf_a.values())
                                                        subsec_amendment, _records, _subjects = subsec_binding(root)
                                                        if subsec_amendment is not None:
                                                            sub_a, pa = compose_figure_by_id(fin_a, subsec_amendment)
                                                            sub_b, pb = compose_figure_by_name(fin_b, subsec_amendment)
                                                            if pa or pb or sub_a != sub_b or set(sub_a) != set(fin_a):
                                                                findings.append("POLARIS page subsections: methods disagree or change identities")
                                                            n_scen += sum(len(row["scenarios"]) for row in sub_a.values()) - sum(
                                                                len(row["scenarios"]) for row in fin_a.values())
                                                            reltype_amendment, _records, _subjects = reltype_binding(root)
                                                            if reltype_amendment is not None:
                                                                rel_a, pa = compose_figure_by_id(sub_a, reltype_amendment)
                                                                rel_b, pb = compose_figure_by_name(sub_b, reltype_amendment)
                                                                if pa or pb or rel_a != rel_b or set(rel_a) != set(sub_a):
                                                                    findings.append("POLARIS relation types: methods disagree or change identities")
                                                                n_scen += sum(len(row["scenarios"]) for row in rel_a.values()) - sum(
                                                                    len(row["scenarios"]) for row in sub_a.values())
                                                                hero_amendment, _records, _subjects = hero_binding(root)
                                                                if hero_amendment is not None:
                                                                    hero_a, pa = compose_figure_by_id(rel_a, hero_amendment)
                                                                    hero_b, pb = compose_figure_by_name(rel_b, hero_amendment)
                                                                    if pa or pb or hero_a != hero_b or set(hero_a) != set(rel_a):
                                                                        findings.append("POLARIS hero figure: methods disagree or change identities")
                                                                    n_scen += sum(len(row["scenarios"]) for row in hero_a.values()) - sum(
                                                                        len(row["scenarios"]) for row in rel_a.values())
                                                                    readers_amendment, _records, _subjects = readers_binding(root)
                                                                    if readers_amendment is not None:
                                                                        readers_a, pa = compose_figure_by_id(hero_a, readers_amendment)
                                                                        readers_b, pb = compose_figure_by_name(hero_b, readers_amendment)
                                                                        if pa or pb or readers_a != readers_b or set(readers_a) != set(hero_a):
                                                                            findings.append("POLARIS reader's edition: methods disagree or change identities")
                                                                        n_scen += sum(len(row["scenarios"]) for row in readers_a.values()) - sum(
                                                                            len(row["scenarios"]) for row in hero_a.values())
                                                                        cont_amendment, _records, _subjects = cont_binding(root)
                                                                        if cont_amendment is not None:
                                                                            cont_a, pa = compose_figure_by_id(readers_a, cont_amendment)
                                                                            cont_b, pb = compose_figure_by_name(readers_b, cont_amendment)
                                                                            if pa or pb or cont_a != cont_b or set(cont_a) != set(readers_a):
                                                                                findings.append("POLARIS containment figure: methods disagree or change identities")
                                                                            n_scen += sum(len(row["scenarios"]) for row in cont_a.values()) - sum(
                                                                                len(row["scenarios"]) for row in readers_a.values())
                                                                            model_amendment, _records, _subjects = model_binding(root)
                                                                            if model_amendment is not None:
                                                                                model_a, pa = compose_figure_by_id(cont_a, model_amendment)
                                                                                model_b, pb = compose_figure_by_name(cont_b, model_amendment)
                                                                                if pa or pb or model_a != model_b or set(model_a) != set(cont_a):
                                                                                    findings.append("POLARIS system model: methods disagree or change identities")
                                                                                n_scen += sum(len(row["scenarios"]) for row in model_a.values()) - sum(
                                                                                    len(row["scenarios"]) for row in cont_a.values())
                                                                                worth_amendment, _records, _subjects = worth_binding(root)
                                                                                if worth_amendment is not None:
                                                                                    worth_a, pa = compose_figure_by_id(model_a, worth_amendment)
                                                                                    worth_b, pb = compose_figure_by_name(model_b, worth_amendment)
                                                                                    if pa or pb or worth_a != worth_b or set(worth_a) != set(model_a):
                                                                                        findings.append("POLARIS worth-knowing: methods disagree or change identities")
                                                                                    n_scen += sum(len(row["scenarios"]) for row in worth_a.values()) - sum(
                                                                                        len(row["scenarios"]) for row in model_a.values())
    raw_read_amendment, _records, _subjects = raw_read_binding(root)
    if raw_read_amendment is not None:
        # Only 033, 036 and 046 move. Use their effective predecessors, independent
        # of the scenario census and the amendments to 034.
        prior_texts = (url_source_binding(root)[0], amendment, readmit_binding(root)[0])
        for ident, prior_text in zip(RAW_READ_REPLACES, prior_texts, strict=True):
            prior = {i[0]: len(s) for _kind, i, _name, s in _polaris_blocks_regex(prior_text)
                     if len(i) == 1}
            current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(raw_read_amendment)
                       if len(b["ids"]) == 1}
            if ident not in prior or ident not in current:
                findings.append(f"POLARIS raw-read disclosure: cannot count predecessor and successor for {ident}")
            else:
                n_scen += current[ident] - prior[ident]
    treeread_amendment, _records, _subjects = treeread_binding(root)
    if treeread_amendment is not None:
        # Only 033, 035 and 048 move: 033 after the raw-read disclosure v2.17,
        # 035 and 048 after URL source v2.1.
        url_text = url_source_binding(root)[0]
        prior_texts = (raw_read_amendment, url_text, url_text)
        current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(treeread_amendment)
                   if len(b["ids"]) == 1}
        for ident, prior_text in zip(TREEREAD_REPLACES, prior_texts, strict=True):
            prior = {i[0]: len(s) for _kind, i, _name, s in _polaris_blocks_regex(prior_text or "")
                     if len(i) == 1}
            if ident not in prior or ident not in current:
                findings.append(f"POLARIS run-tree read bounds: cannot count predecessor and successor for {ident}")
            else:
                n_scen += current[ident] - prior[ident]
    verify_amendment, _records, _subjects = verify_binding(root)
    if verify_amendment is not None:
        # Only 033 moves, after the run-tree read bounds v2.18.
        ident = VERIFY_REPLACES[0]
        prior = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(treeread_amendment or "")
                 if len(b["ids"]) == 1}
        current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(verify_amendment)
                   if len(b["ids"]) == 1}
        if set(current) != {ident} or ident not in prior:
            findings.append("POLARIS verify text: cannot count predecessor and successor for 033")
        else:
            n_scen += current[ident] - prior[ident]
    qfile_amendment, _records, _subjects = qfile_binding(root)
    if qfile_amendment is not None:
        # Only 033 moves, after the verify text v2.21.
        ident = QFILE_REPLACES[0]
        prior = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(verify_amendment or "")
                 if len(b["ids"]) == 1}
        current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(qfile_amendment)
                   if len(b["ids"]) == 1}
        if set(current) != {ident} or ident not in prior:
            findings.append("POLARIS question file: cannot count predecessor and successor for 033")
        else:
            n_scen += current[ident] - prior[ident]
    scripted_grade_amendment, _records, _subjects = scripted_grade_binding(root)
    if scripted_grade_amendment is not None:
        # Only 033 moves, after question-file v2.27.
        ident = SCRIPTED_GRADE_REPLACES[0]
        prior = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(qfile_amendment or "")
                 if len(b["ids"]) == 1}
        current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(scripted_grade_amendment)
                   if len(b["ids"]) == 1}
        if set(current) != {ident} or ident not in prior:
            findings.append("POLARIS scripted benchmark grading: cannot count predecessor and successor for 033")
        else:
            n_scen += current[ident] - prior[ident]
    step_measures_amendment, _records, _subjects = step_measures_binding(root)
    if step_measures_amendment is not None:
        # Only 033 moves, after scripted benchmark grading v2.30.
        ident = STEP_MEASURES_REPLACES[0]
        prior = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(scripted_grade_amendment or "")
                 if len(b["ids"]) == 1}
        current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(step_measures_amendment)
                   if len(b["ids"]) == 1}
        if set(current) != {ident} or ident not in prior:
            findings.append("POLARIS dossier close measures: cannot count predecessor and successor for 033")
        else:
            n_scen += current[ident] - prior[ident]
    covhold_amendment, _records, _subjects = covhold_binding(root)
    if covhold_amendment is not None:
        # Only 035 moves, after the run-tree read bounds v2.18.
        ident = COVHOLD_REPLACES[0]
        prior = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(treeread_amendment or "")
                 if len(b["ids"]) == 1}
        current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(covhold_amendment)
                   if len(b["ids"]) == 1}
        if set(current) != {ident} or ident not in prior:
            findings.append("POLARIS coverage hold: cannot count predecessor and successor for 035")
        else:
            n_scen += current[ident] - prior[ident]
    edit_account_amendment, _records, _subjects = edit_account_binding(root)
    if edit_account_amendment is not None:
        ident = EDIT_ACCOUNT_REPLACES[0]
        prior_text = read_text(root, POLARIS_OVERLAY_SPEC) or ""
        previous = [len(scenarios) for kind, ids, _name, scenarios in _polaris_blocks_regex(prior_text)
                    if kind == "MODIFIED" and tuple(ids) == (ident,)]
        replacement = [len(block["scenarios"]) for block in _polaris_blocks_manual(edit_account_amendment)
                       if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        if len(previous) != 1 or len(replacement) != 1:
            findings.append("POLARIS edit and repair accounting: cannot count predecessor and successor for 006")
        else:
            n_scen += replacement[0] - previous[0]
    term_brief_amendment, _records, _subjects = term_brief_binding(root)
    if term_brief_amendment is not None:
        ident = TERM_BRIEF_REPLACES[0]
        previous = [len(scenarios)
                    for kind, identities, _name, scenarios in _polaris_blocks_regex(worth_binding(root)[0] or "")
                    if kind == "MODIFIED" and tuple(identities) == (ident,)]
        replacement = [len(block["scenarios"]) for block in _polaris_blocks_manual(term_brief_amendment)
                       if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        if len(previous) != 1 or len(replacement) != 1:
            findings.append("POLARIS terminology brief: cannot count predecessor and successor for 034")
        else:
            n_scen += replacement[0] - previous[0]
    qkind_amendment, _records, _subjects = qkind_binding(root)
    if qkind_amendment is not None:
        # Only 034 moves, after the terminology brief v2.29.
        ident = QKIND_REPLACES[0]
        previous = [len(block["scenarios"]) for block in _polaris_blocks_manual(term_brief_amendment or "")
                    if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        replacement = [len(block["scenarios"]) for block in _polaris_blocks_manual(qkind_amendment)
                       if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        if len(previous) != 1 or len(replacement) != 1:
            findings.append("POLARIS question-kind floor: cannot count predecessor and successor for 034")
        else:
            n_scen += replacement[0] - previous[0]
    figplan_amendment, _records, _subjects = figplan_binding(root)
    if figplan_amendment is not None:
        # Only 034 moves, after the question-kind floor v2.32.
        ident = FIGPLAN_REPLACES[0]
        previous = [len(block["scenarios"]) for block in _polaris_blocks_manual(qkind_amendment or "")
                    if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        replacement = [len(block["scenarios"]) for block in _polaris_blocks_manual(figplan_amendment)
                       if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        if len(previous) != 1 or len(replacement) != 1:
            findings.append("POLARIS figure plan: cannot count predecessor and successor for 034")
        else:
            n_scen += replacement[0] - previous[0]
    _state, vbase_amendment, _records, _subjects = vbase_screening_binding(root)
    if vbase_amendment is not None:
        # Only 034 moves, after the figure plan v2.33.
        ident = VBASE_SCREENING_REPLACES[0]
        previous = [len(block["scenarios"]) for block in _polaris_blocks_manual(figplan_amendment or "")
                    if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        replacement = [len(block["scenarios"]) for block in _polaris_blocks_manual(vbase_amendment)
                       if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        if len(previous) != 1 or len(replacement) != 1:
            findings.append("POLARIS derived base: cannot count predecessor and successor for 034")
        else:
            n_scen += replacement[0] - previous[0]
    if p5_advice_binding(root)[0] == "effective":
        n_scen += p5_advice_delta(root, findings)
    if choice_binding(root)[0] is not None:
        n_scen += choice_delta(root, findings)
    if migpar_binding(root)[0] is not None:
        n_scen += migpar_delta(root, findings)
    if impfacts_binding(root)[0] is not None:
        n_scen += impfacts_delta(root, findings)
    if walk_binding(root)[0] is not None:
        n_scen += walk_delta(root, findings)
    if tnames_binding(root)[0] is not None:
        n_scen += tnames_delta(root, findings)
    if migbound_binding(root)[0] is not None:
        n_scen += migbound_delta(root, findings)
    if rough_binding(root)[0] is not None:
        n_scen += rough_delta(root, findings)
    return n_req, n_scen, ids


def poc_scenarios_added(root):
    """Scenarios per POC requirement added by amendments whose adoption row
    (naming the POC change and the amendment's tag) is in the tree."""
    rows = [line for line in (read_text(root, AGENT_ADOPTIONS) or "").split("\n")
            if line.startswith("| A-") and "three-surface-poc-experience" in line]
    added = {}
    for tag, scenarios in POC_SCENARIO_AMENDMENTS:
        if any(f"`{tag}`" in line for line in rows):
            for req, count in scenarios.items():
                added[req] = added.get(req, 0) + count
    return added


def check_census(root, report):
    pop, findings = census(root)
    examined = 0
    p_req, p_scen, p_ids = polaris_expected(root, findings)
    signed_reference = reference_signed(root)
    totals = dict(EXPECTED_TOTALS, POLARIS=(p_req, p_scen))
    if signed_reference:
        poc_added = poc_scenarios_added(root)
        poc_literal = {**EXPECTED["POC"], "014": 8}
        if (len(poc_literal), sum(poc_literal.values())) != (26, 34):
            findings.append("POC: the signed literal is no longer 26 / 34 before amendments")
        poc_literal = {**poc_literal, **{req: poc_literal.get(req, 0) + count for req, count in poc_added.items()}}
        totals["POC"] = (len(poc_literal), sum(poc_literal.values()))
    for family, (n_req, n_scen) in totals.items():
        reqs = pop.get(family, {})
        got = (len(reqs), sum(len(r["scenarios"]) for r in reqs.values()))
        examined += got[0]
        if got != (n_req, n_scen):
            findings.append(f"{family}: {got[0]} requirements / {got[1]} "
                            f"scenarios, expected {n_req} / {n_scen}")
        literal = EXPECTED.get(family)
        if family == "POC" and signed_reference:
            literal = poc_literal
        if literal is not None:
            prefix = f"{family}-REQ-"
            have = {k[len(prefix):]: len(v["scenarios"]) for k, v in reqs.items()}
            if have != literal:
                diff = sorted(set(have.items()) ^ set(literal.items()))
                findings.append(f"{family}: per-requirement census differs "
                                f"from the literal at {diff[:6]}")
        elif family == "POLARIS":
            if set(reqs) != p_ids:
                findings.append("POLARIS: identities differ from the effective composition "
                                f"(off by {sorted(set(reqs) ^ p_ids)[:6]})")
    baseline, projection = vbase_screening_projects(root, pop, findings)
    committed = read_text(root, CENSUS)
    if committed is None:
        findings.append(f"`{CENSUS}` missing")
    elif committed != census_json(baseline):
        findings.append(f"`{CENSUS}` differs from regeneration "
                        "(a name or scenario title moved)")
    if projection is not None and projection != read_text(root, VBASE_SCREENING_PROJECTION):
        findings.append(f"`{VBASE_SCREENING_PROJECTION}` differs from regeneration")
    state, _ = cap1_root_binding(root)
    report.add("R3", "populations agree by two methods and match the census",
               examined, findings, "requirements examined across CAP1, POC, PWB and Polaris"
               f". CAP1 root adjudication: {state}")
    return pop


# --------------------------------------------------------------------------
# R4: generated dependency and coverage rows.
# --------------------------------------------------------------------------

def tracked(root, prefix):
    """Tracked files under `prefix` (git when available, else the tree)."""
    if (root / ".git").exists():
        out = subprocess.run(["git", "ls-files", "-z", "--", prefix], cwd=root,
                             capture_output=True, check=True).stdout
        return sorted(p for p in out.decode("utf-8").split("\0") if p)
    base = root / prefix
    if base.is_file():
        return [prefix]
    return sorted(p.relative_to(root).as_posix()
                  for p in base.rglob("*") if p.is_file())


def check_generated(root, pop, report):
    findings, examined = [], 0
    for family, change in (("CAP1", CAP1_CHANGE), ("POC", POC_CHANGE),
                           ("PWB", PWB_CHANGE)):
        rel = f"{CHANGES}/{change}/GOVERNING-DEPENDENCIES.md"
        text = read_text(root, rel) or ""
        found = DEPS_SOURCE.findall(text)
        examined += 1
        spec = read_bytes(root, FAMILY_SPECS[family]) or b""
        if len(found) != 1:
            findings.append(f"`{rel}`: {len(found)} source lines, expected 1")
        elif found[0][0] != sha(spec):
            findings.append(f"`{rel}`: source digest is not the current "
                            "spec.md")
        elif int(found[0][1]) != len(pop.get(family, {})):
            findings.append(f"`{rel}`: states {found[0][1]} requirements, "
                            f"census has {len(pop.get(family, {}))}")
    for family, change in (("CAP1", CAP1_CHANGE), ("PWB", PWB_CHANGE)):
        rel = f"{CHANGES}/{change}/CAPABILITY-COVERAGE.md"
        cited = set(re.findall(rf"\b{family}-REQ-\d{{3}}\b",
                               read_text(root, rel) or ""))
        examined += 1
        if cited != set(pop.get(family, {})):
            findings.append(f"`{rel}`: covers {len(cited)} of "
                            f"{len(pop.get(family, {}))} requirements")
    # The CAP1 overlay's adoption-time generated record and figure, written
    # by its own builder: both must agree with the composed census.
    examined += 2
    cap1 = pop.get("CAP1", {})
    cap1_scen = sum(len(r["scenarios"]) for r in cap1.values())
    try:
        deps = json.loads(read_text(root, CAP1_OVERLAY_DEPS) or "null")
        count, sources = deps["requirement_count"], deps["source_files"]
    except (ValueError, TypeError, KeyError):
        count, sources = None, {}
    want_sources = {rel: sha(read_bytes(root, rel) or b"")
                    for rel in (CAP1_OVERLAY_SPEC, FAMILY_SPECS["CAP1"])}
    if count != len(cap1) or sources != want_sources:
        findings.append(f"`{CAP1_OVERLAY_DEPS}`: requirement_count {count} or "
                        "its source digests disagree with the composed census "
                        f"({len(cap1)} requirements) and the bytes on disk")
    adoption = " ".join((read_text(root, CAP1_OVERLAY_ADOPTION) or "").split())
    stated = re.findall(r"It has (\d+) requirements and (\d+) scenarios",
                        adoption)
    if stated != [(str(len(cap1)), str(cap1_scen))]:
        findings.append(f"`{CAP1_OVERLAY_ADOPTION}`: states {stated}, census "
                        f"composes {len(cap1)} / {cap1_scen}")
    examined += 1
    try:
        if json.loads(read_text(root, CAP1_ROOT_PROJECTION) or "null") != cap1_root_projection(root):
            findings.append(f"`{CAP1_ROOT_PROJECTION}`: stale prospective CAP1 projection")
    except (ValueError, KeyError, TypeError) as exc:
        findings.append(f"`{CAP1_ROOT_PROJECTION}`: {exc}")
    numbers = {fam: {k[-3:] for k in reqs} for fam, reqs in pop.items()}
    files = []
    for child in CHILDREN:
        files += tracked(root, f"{CHANGES}/{child['change']}")
    files += tracked(root, f"{CHANGES}/{CAP1_OVERLAY_CHANGE}")
    addition_dirs = tuple(f"{CHANGES}/{change}/"
                          for change, _rel in polaris_additions(root))
    for prefix in addition_dirs:
        files += tracked(root, prefix.rstrip("/"))
    amendment, _records, _subjects = declared_source_binding(root)
    if amendment is not None:
        files += tracked(root, f"{CHANGES}/{DECLARED_SOURCE_CHANGE}")
    url_amendment, _records, _subjects = url_source_binding(root)
    if url_amendment is not None:
        files += tracked(root, URL_SOURCE_HOME)
    figure_amendment, _records, _subjects = figure_binding(root)
    if figure_amendment is not None:
        files += tracked(root, FIGURE_HOME)
    derived_amendment, _records, _subjects = derived_binding(root)
    if derived_amendment is not None:
        files += tracked(root, DERIVED_HOME)
    ledger_amendment, _records, _subjects = ledger_binding(root)
    if ledger_amendment is not None:
        files += tracked(root, LEDGER_HOME)
    kinds_amendment, _records, _subjects = kinds_binding(root)
    if kinds_amendment is not None:
        files += tracked(root, KINDS_HOME)
    manifests_amendment, _records, _subjects = manifests_binding(root)
    if manifests_amendment is not None:
        files += tracked(root, MANIFESTS_HOME)
    repairs_amendment, _records, _subjects = repairs_binding(root)
    if repairs_amendment is not None:
        files += tracked(root, REPAIRS_HOME)
    maps_amendment, _records, _subjects = maps_binding(root)
    if maps_amendment is not None:
        files += tracked(root, MAPS_HOME)
    bounds_amendment, _records, _subjects = bounds_binding(root)
    if bounds_amendment is not None:
        files += tracked(root, BOUNDS_HOME)
    corr_amendment, _records, _subjects = corr_binding(root)
    if corr_amendment is not None:
        files += tracked(root, CORR_HOME)
    coverage_amendment, _records, _subjects = coverage_binding(root)
    if coverage_amendment is not None:
        files += tracked(root, COVERAGE_HOME)
    infra_amendment, _records, _subjects = infra_binding(root)
    if infra_amendment is not None:
        files += tracked(root, INFRA_HOME)
    findpages_amendment, _records, _subjects = findpages_binding(root)
    if findpages_amendment is not None:
        files += tracked(root, FINDPAGES_HOME)
    subsec_amendment, _records, _subjects = subsec_binding(root)
    if subsec_amendment is not None:
        files += tracked(root, SUBSEC_HOME)
    reltype_amendment, _records, _subjects = reltype_binding(root)
    if reltype_amendment is not None:
        files += tracked(root, RELTYPE_HOME)
    hero_amendment, _records, _subjects = hero_binding(root)
    if hero_amendment is not None:
        files += tracked(root, HERO_HOME)
    readers_amendment, _records, _subjects = readers_binding(root)
    if readers_amendment is not None:
        files += tracked(root, READERS_HOME)
    cont_amendment, _records, _subjects = cont_binding(root)
    if cont_amendment is not None:
        files += tracked(root, CONT_HOME)
    model_amendment, _records, _subjects = model_binding(root)
    if model_amendment is not None:
        files += tracked(root, MODEL_HOME)
    worth_amendment, _records, _subjects = worth_binding(root)
    if worth_amendment is not None:
        files += tracked(root, WORTH_HOME)
    edit_account_amendment, _records, _subjects = edit_account_binding(root)
    if edit_account_amendment is not None:
        files.append(EDIT_ACCOUNT_SPEC)
    reach_amendment, _records, _subjects = reach_binding(root)
    if reach_amendment is not None:
        files += tracked(root, REACH_HOME)
    readmit_amendment, _records, _subjects = readmit_binding(root)
    if readmit_amendment is not None:
        files += tracked(root, READMIT_HOME)
    raw_read_amendment, _records, _subjects = raw_read_binding(root)
    if raw_read_amendment is not None:
        files += tracked(root, RAW_READ_HOME)
    treeread_amendment, _records, _subjects = treeread_binding(root)
    if treeread_amendment is not None:
        files += tracked(root, TREEREAD_HOME)
    verify_amendment, _records, _subjects = verify_binding(root)
    if verify_amendment is not None:
        files += tracked(root, VERIFY_HOME)
    qfile_amendment, _records, _subjects = qfile_binding(root)
    if qfile_amendment is not None:
        files += tracked(root, QFILE_HOME)
    scripted_grade_amendment, _records, _subjects = scripted_grade_binding(root)
    if scripted_grade_amendment is not None:
        files += tracked(root, SCRIPTED_GRADE_HOME)
    step_measures_amendment, _records, _subjects = step_measures_binding(root)
    if step_measures_amendment is not None:
        files += tracked(root, STEP_MEASURES_HOME)
    covhold_amendment, _records, _subjects = covhold_binding(root)
    if covhold_amendment is not None:
        files += tracked(root, COVHOLD_HOME)
    term_brief_amendment, _records, _subjects = term_brief_binding(root)
    if term_brief_amendment is not None:
        files += tracked(root, TERM_BRIEF_HOME)
    qkind_amendment, _records, _subjects = qkind_binding(root)
    if qkind_amendment is not None:
        files += tracked(root, QKIND_HOME)
    figplan_amendment, _records, _subjects = figplan_binding(root)
    if figplan_amendment is not None:
        files += tracked(root, FIGPLAN_HOME)
    vbase_state, vbase_amendment, _records, _subjects = vbase_screening_binding(root)
    if vbase_state in {"staged", "effective"}:
        files += tracked(root, VBASE_SCREENING_HOME)
        if vbase_amendment is None:
            vbase_amendment = read_text(root, VBASE_SCREENING_SPEC)
    choice_amendment, _records, _subjects = choice_binding(root)
    if choice_amendment is not None:
        files += tracked(root, CHOICE_HOME)
    migpar_amendment, _records, _subjects = migpar_binding(root)
    if migpar_amendment is not None:
        files += tracked(root, MIGPAR_HOME)
    impfacts_amendment, _records, _subjects = impfacts_binding(root)
    if impfacts_amendment is not None:
        files += tracked(root, IMPFACTS_HOME)
    walk_amendment, _records, _subjects = walk_binding(root)
    if walk_amendment is not None:
        files += tracked(root, WALK_HOME)
    tnames_amendment, _records, _subjects = tnames_binding(root)
    if tnames_amendment is not None:
        files += tracked(root, TNAMES_HOME)
    migbound_amendment, _records, _subjects = migbound_binding(root)
    if migbound_amendment is not None:
        files += tracked(root, MIGBOUND_HOME)
    rough_amendment, _records, _subjects = rough_binding(root)
    if rough_amendment is not None:
        files += tracked(root, ROUGH_HOME)
    candidate_ref_dirs = addition_dirs + (URL_SOURCE_HOME + "/",)
    files += list(ROUTE_PAGES)
    # An addition may cite a candidate Polaris requirement still under
    # another change's `proposed/` (no act binds it); such a mention resolves
    # to that candidate and is counted apart, never as in force.
    candidates = set()
    for spec in sorted((root / CHANGES).glob("*/proposed/polaris-generation/"
                                             "spec.md")):
        candidates |= {i[-3:] for kind, ids, _n, _s in _polaris_blocks_regex(
            spec.read_text(encoding="utf-8")) if kind == "ADDED" for i in ids}
    mentions = candidate_refs = 0
    for rel in files:
        if not rel.endswith((".md", ".json", ".yaml")):
            continue
        text = read_text(root, rel)
        if text is None:
            continue
        for m in ID_MENTION.finditer(text):
            family = m.group(1) or "POLARIS"
            for num in [m.group(2)] + re.findall(r"\d{3}", m.group(3)):
                mentions += 1
                if (family == "POLARIS" and rel.startswith(candidate_ref_dirs)
                        and num not in numbers.get(family, set())
                        and num in candidates):
                    candidate_refs += 1
                    continue
                if num not in numbers.get(family, set()):
                    findings.append(f"`{rel}`: {family} identifier {num} "
                                    f"resolves to no requirement "
                                    f"(in `{m.group(0)[:48]}`)")
    # A signed addition's union is generated, never signed, so a difference
    # is a FAIL here rather than R7's report-only Unknown.
    for change, spec_rel in polaris_additions(root):
        rel = f"{CHANGES}/{change}/GOVERNING-DEPENDENCIES.md"
        spec, deps = read_text(root, spec_rel), read_text(root, rel)
        examined += 1
        if spec is None or deps is None:
            findings.append(f"`{rel}` or its spec missing")
            continue
        computed, declared = warrant_union(spec), declared_union(deps)
        if computed != declared:
            findings.append(f"`{rel}`: differs from its spec's warrants; run "
                            "`--regenerate`")
    for delta, rel in ((amendment, DECLARED_SOURCE_UNION), (url_amendment, URL_SOURCE_UNION),
                       (figure_amendment, FIGURE_UNION), (derived_amendment, DERIVED_UNION),
                       (ledger_amendment, LEDGER_UNION), (kinds_amendment, KINDS_UNION),
                       (reach_amendment, REACH_UNION), (manifests_amendment, MANIFESTS_UNION),
                       (repairs_amendment, REPAIRS_UNION), (maps_amendment, MAPS_UNION),
                       (bounds_amendment, BOUNDS_UNION), (corr_amendment, CORR_UNION),
                       (coverage_amendment, COVERAGE_UNION),
                       (readmit_amendment, READMIT_UNION), (infra_amendment, INFRA_UNION),
                        (findpages_amendment, FINDPAGES_UNION),
                        (subsec_amendment, SUBSEC_UNION),
                        (reltype_amendment, RELTYPE_UNION),
                        (hero_amendment, HERO_UNION),
                        (readers_amendment, READERS_UNION),
                        (cont_amendment, CONT_UNION),
                        (model_amendment, MODEL_UNION),
                        (worth_amendment, WORTH_UNION),
                        (raw_read_amendment, RAW_READ_UNION),
                        (treeread_amendment, TREEREAD_UNION),
                        (verify_amendment, VERIFY_UNION),
                        (qfile_amendment, QFILE_UNION),
                        (scripted_grade_amendment, SCRIPTED_GRADE_UNION),
                        (step_measures_amendment, STEP_MEASURES_UNION),
                        (covhold_amendment, COVHOLD_UNION),
                        (term_brief_amendment, TERM_BRIEF_UNION),
                        (qkind_amendment, QKIND_UNION),
                        (figplan_amendment, FIGPLAN_UNION),
                        (vbase_amendment, VBASE_SCREENING_UNION),
                        (choice_amendment, CHOICE_UNION),
                        (migpar_amendment, MIGPAR_UNION),
                        (impfacts_amendment, IMPFACTS_UNION),
                        (walk_amendment, WALK_UNION),
                        (tnames_amendment, TNAMES_UNION),
                        (migbound_amendment, MIGBOUND_UNION),
                        (rough_amendment, ROUGH_UNION)):
        if delta is None:
            continue
        examined += 1
        try:
            declared = json.loads(read_text(root, rel) or "null")["warrants"]
            declared = {key: set(values) for key, values in declared.items()}
        except (ValueError, TypeError, KeyError, AttributeError):
            declared = None
        computed = warrant_union(delta)
        computed.pop("primary", None)
        if computed != declared:
            findings.append(f"`{rel}` differs from its amendment's warrants")
    report.add("R4", "generated dependency and coverage rows resolve",
               examined + mentions, findings,
               f"{examined} generated anchors, {mentions} identifier mentions "
               f"(full and continuation forms) over {len(files)} files, "
               f"{candidate_refs} of them references to a "
               "candidate Polaris requirement under `proposed/`")


# --------------------------------------------------------------------------
# R5: default routes.
# --------------------------------------------------------------------------

def cap1_root_status_claimed(status):
    """Check the linked CAP1 subject's own predicate in prose and status tables."""
    from check_governance import _gfm_data_row, _gfm_row_cells, _gfm_table_start

    lines = list(visible_route_lines(status, keep_fence_breaks=True))
    outside_fences = [False] * len(lines)
    prose = []
    index = 0
    while index < len(lines):
        if _gfm_table_start(lines, index, outside_fences) is None:
            line = lines[index]
            prose.append("" if line.lstrip().startswith(("#", "|")) else line)
            index += 1
            continue

        header = _gfm_row_cells(lines[index])
        state_column = header.index("State", 1) if "State" in header[1:] else None
        prose.append("")
        index += 2
        while index < len(lines) and _gfm_data_row(lines[index]):
            cells = _gfm_row_cells(lines[index])
            index += 1
            if (state_column is not None and cells and state_column < len(cells)
                    and CAP1_ROOT_STATUS_LINK.fullmatch(cells[0])
                    and CAP1_ROOT_STATUS_CELL.match(cells[state_column])):
                return True

    paragraphs = re.split(r"\n[ \t]*\n", "\n".join(prose))
    return any(CAP1_ROOT_STATUS_CLAIM.search(" ".join(block.split())) for block in paragraphs)


def visible_route_lines(text, *, keep_fence_breaks=False):
    """Yield route prose outside HTML comments and fenced examples."""
    fence = None
    for line in re.sub(r"<!--.*?(?:-->|\Z)", "", text, flags=re.S).splitlines():
        marker = ADOPTION_FENCE.fullmatch(line)
        if fence:
            if marker and marker[1].startswith(fence) and not marker[2].strip():
                fence = None
            continue
        if marker and (marker[1][0] == "~" or "`" not in marker[2]):
            fence = marker[1]
            if keep_fence_breaks:
                yield ""
            continue
        yield line


def check_routes(root, pop, report):
    findings, examined = [], 0
    readme = read_text(root, OPENSPEC_README) or ""
    status = read_text(root, STATUS) or ""
    changes = sorted({p.split("/")[2] for p in tracked(root, CHANGES)
                      if p.count("/") >= 3})
    changes = [c for c in changes if c != "archive"]
    rows = {}
    for line in visible_route_lines(readme):
        m = re.match(r"^\| \[`([^`]+)`\]\(changes/", line)
        if m:
            rows.setdefault(m.group(1), []).append(line)
    for change in changes:
        examined += 1
        if len(rows.get(change, [])) != 1:
            findings.append(f"`{OPENSPEC_README}`: {len(rows.get(change, []))} "
                            f"rows for tracked change `{change}`, expected 1")
    for extra in sorted(set(rows) - set(changes)):
        findings.append(f"`{OPENSPEC_README}`: row for untracked `{extra}`")
    for child in CHILDREN:
        for record in (child["record"], *(later["record"] for later in
                                          successors_for(root, child))):
            examined += 2
            name = Path(record).name
            if not any(name in line for line in rows.get(child["change"], [])):
                findings.append(f"`{OPENSPEC_README}`: the `{child['change']}` "
                                f"row does not name its terminal record "
                                f"`{name}`")
            if record not in status and name not in status:
                findings.append(f"`{STATUS}` cites no terminal record `{name}`")
    for change, _rel in polaris_additions(root):
        for record, _text, _version in addition_terminals(root, change):
            examined += 2
            name = Path(record).name
            if not any(name in line for line in rows.get(change, [])):
                findings.append(f"`{OPENSPEC_README}`: the `{change}` row does "
                                f"not name its terminal record `{name}`")
            if record not in status and name not in status:
                findings.append(f"`{STATUS}` cites no terminal record `{name}`")
    examined += 2
    name = Path(CAP1_OVERLAY_RECORD).name
    if not any(name in line for line in rows.get(CAP1_OVERLAY_CHANGE, [])):
        findings.append(f"`{OPENSPEC_README}`: the `{CAP1_OVERLAY_CHANGE}` row "
                        f"does not name its terminal record `{name}`")
    if CAP1_OVERLAY_RECORD not in status and name not in status:
        findings.append(f"`{STATUS}` cites no terminal record `{name}`")
    examined += 2
    root_route = rows.get(CAP1_ROOT_CHANGE, [])
    cap1_state, _ = cap1_root_binding(root)
    root_versioned = CAP1_ROOT_VERSION_MARKER in (read_text(root, CAP1_ROOT_SPEC) or "")
    if len(root_route) == 1:
        cells = [cell.strip() for cell in root_route[0].split("|")[1:-1]]
        route = f"[`{CAP1_ROOT_CHANGE}`](changes/{CAP1_ROOT_CHANGE})"
        state_marker = CAP1_ROOT_INDEX_STAGE if root_versioned else "**Candidate.**"
        if (len(cells) != 4 or cells[0] != route
                or not cells[2].startswith(state_marker)
                or (root_versioned and (f"`{CAP1_ROOT_VERSION_NAME}`" not in cells[2]
                                       or Path(AGENT_ADOPTIONS).name not in cells[3]))):
            findings.append(f"`{OPENSPEC_README}`: the `{CAP1_ROOT_CHANGE}` row "
                            "must route the CAP1 candidate or exact conditional record")
    cap1_status = [line.strip() for line in visible_route_lines(status)
                   if line.strip().startswith(CAP1_ROOT_STATUS_RECORD)]
    if root_versioned and (len(cap1_status) != 1 or
                           f"`{CAP1_ROOT_VERSION_NAME}`" not in cap1_status[0] or
                           AGENT_ADOPTIONS not in cap1_status[0]):
        findings.append(f"`{STATUS}` does not route the conditional CAP1 binding")
    if cap1_state != "effective" and cap1_root_status_claimed(status):
        findings.append(f"`{STATUS}` must keep CAP1 root-adjudication pending until effective")
    amendment, _records, _subjects = declared_source_binding(root)
    if amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line
                   for line in rows.get(DECLARED_SOURCE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route the declared-source amendment to `{AGENT_ADOPTIONS}`")
        if AGENT_ADOPTIONS not in status:
            findings.append(f"`{STATUS}` cites no declared-source agent-adoption ledger")
    url_amendment, url_records, url_subjects = url_source_binding(root)
    url_index = rows.get(URL_SOURCE_CHANGE, [])
    cells = [cell.strip() for cell in url_index[0].split("|")] if len(url_index) == 1 else []
    status_fields = [line.strip() for line in visible_route_lines(status) if line.strip().startswith(URL_STATUS_PREFIX)]
    if url_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and URL_SOURCE_TAG in line
                   for line in rows.get(URL_SOURCE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route URL declared-source v2.1 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = url_source_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or status_fields != [f"{URL_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route URL declared-source v2.1 and its adoption {identity}")
    else:
        url_rows = url_source_rows(root)
        disposition = url_source_disposition(root, url_rows) or (
            declared_source_disposition(root) if url_rows else None)
        if URL_SOURCE_CHANGE in changes:
            examined += 2
            predecessor = DECLARED_SOURCE_TAG if amendment is not None else "Unknown"
            expected = url_inactive_text(disposition, predecessor)
            index_current = len(cells) == 6 and cells[3] == expected and Path(AGENT_ADOPTIONS).name in cells[4]
            status_current = status_fields == [
                f"{URL_STATUS_PREFIX}. {expected} [Agent adoptions]({AGENT_ADOPTIONS})"]
            if not (disposition or url_records or url_subjects):
                # The source-only transaction published a pending index before the record.
                if len(cells) == 6 and cells[3] == "Reviewed source prepared for agent adoption":
                    index_current = Path(AGENT_ADOPTIONS).name in cells[4]
                if not status_fields:
                    status_current = True
            for file, current in ((OPENSPEC_README, index_current), (STATUS, status_current)):
                if not current:
                    findings.append(f"`{file}` does not disclose inactive URL declared-source v2.1: {expected}")
    figure_amendment, _records, _subjects = figure_binding(root)
    figure_fields = [line.strip() for line in visible_route_lines(status)
                     if line.strip().startswith(FIGURE_STATUS_PREFIX)]
    if figure_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and FIGURE_TAG in line
                   for line in rows.get(FIGURE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route figure homes and fit v2.2 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = figure_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or figure_fields != [f"{FIGURE_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route figure homes and fit v2.2 and its adoption {identity}")
    elif FIGURE_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in figure_fields):
            findings.append(f"`{STATUS}` calls figure homes and fit v2.2 adopted while it is not in force")
        if any(FIGURE_TAG in line and "Agent adoption" in line for line in rows.get(FIGURE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls figure homes and fit v2.2 adopted while it is not in force")
    derived_amendment, _records, _subjects = derived_binding(root)
    derived_fields = [line.strip() for line in visible_route_lines(status)
                      if line.strip().startswith(DERIVED_STATUS_PREFIX)]
    if derived_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and DERIVED_TAG in line
                   for line in rows.get(DERIVED_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route derived observed facts v2.3 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = derived_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or derived_fields != [f"{DERIVED_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route derived observed facts v2.3 and its adoption {identity}")
    elif DERIVED_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in derived_fields):
            findings.append(f"`{STATUS}` calls derived observed facts v2.3 adopted while it is not in force")
        if any(DERIVED_TAG in line and "Agent adoption" in line for line in rows.get(DERIVED_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls derived observed facts v2.3 adopted while it is not in force")
    ledger_amendment, _records, _subjects = ledger_binding(root)
    ledger_fields = [line.strip() for line in visible_route_lines(status)
                     if line.strip().startswith(LEDGER_STATUS_PREFIX)]
    if ledger_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and LEDGER_TAG in line
                   for line in rows.get(LEDGER_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route ledger packs thesis v2.4 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = ledger_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or ledger_fields != [f"{LEDGER_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route ledger packs thesis v2.4 and its adoption {identity}")
    elif LEDGER_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in ledger_fields):
            findings.append(f"`{STATUS}` calls ledger packs thesis v2.4 adopted while it is not in force")
        if any(LEDGER_TAG in line and "Agent adoption" in line for line in rows.get(LEDGER_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls ledger packs thesis v2.4 adopted while it is not in force")
    kinds_amendment, _records, _subjects = kinds_binding(root)
    kinds_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(KINDS_STATUS_PREFIX)]
    if kinds_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and KINDS_TAG in line
                   for line in rows.get(KINDS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route figure kinds v2.5 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = kinds_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or kinds_fields != [f"{KINDS_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route figure kinds v2.5 and its adoption {identity}")
    elif KINDS_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in kinds_fields):
            findings.append(f"`{STATUS}` calls figure kinds v2.5 adopted while it is not in force")
        if any(KINDS_TAG in line and "Agent adoption" in line for line in rows.get(KINDS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls figure kinds v2.5 adopted while it is not in force")
    manifests_amendment, _records, _subjects = manifests_binding(root)
    manifests_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(MANIFESTS_STATUS_PREFIX)]
    if manifests_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and MANIFESTS_TAG in line
                   for line in rows.get(MANIFESTS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route manifest recognizers v2.7 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = manifests_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or manifests_fields != [f"{MANIFESTS_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route manifest recognizers v2.7 and its adoption {identity}")
    elif MANIFESTS_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in manifests_fields):
            findings.append(f"`{STATUS}` calls manifest recognizers v2.7 adopted while it is not in force")
        if any(MANIFESTS_TAG in line and "Agent adoption" in line for line in rows.get(MANIFESTS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls manifest recognizers v2.7 adopted while it is not in force")
    repairs_amendment, _records, _subjects = repairs_binding(root)
    repairs_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(REPAIRS_STATUS_PREFIX)]
    if repairs_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and REPAIRS_TAG in line
                   for line in rows.get(REPAIRS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route spec repairs v2.8 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = repairs_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or repairs_fields != [f"{REPAIRS_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route spec repairs v2.8 and its adoption {identity}")
    elif REPAIRS_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in repairs_fields):
            findings.append(f"`{STATUS}` calls spec repairs v2.8 adopted while it is not in force")
        if any(REPAIRS_TAG in line and "Agent adoption" in line for line in rows.get(REPAIRS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls spec repairs v2.8 adopted while it is not in force")
    maps_amendment, _records, _subjects = maps_binding(root)
    maps_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(MAPS_STATUS_PREFIX)]
    if maps_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and MAPS_TAG in line
                   for line in rows.get(MAPS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route computed maps v2.9 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = maps_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or maps_fields != [f"{MAPS_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route computed maps v2.9 and its adoption {identity}")
    elif MAPS_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in maps_fields):
            findings.append(f"`{STATUS}` calls computed maps v2.9 adopted while it is not in force")
        if any(MAPS_TAG in line and "Agent adoption" in line for line in rows.get(MAPS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls computed maps v2.9 adopted while it is not in force")
    bounds_amendment, _records, _subjects = bounds_binding(root)
    bounds_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(BOUNDS_STATUS_PREFIX)]
    if bounds_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and BOUNDS_TAG in line
                   for line in rows.get(BOUNDS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route record bounds v2.10 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = bounds_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or bounds_fields != [f"{BOUNDS_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route record bounds v2.10 and its adoption {identity}")
    elif BOUNDS_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in bounds_fields):
            findings.append(f"`{STATUS}` calls record bounds v2.10 adopted while it is not in force")
        if any(BOUNDS_TAG in line and "Agent adoption" in line for line in rows.get(BOUNDS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls record bounds v2.10 adopted while it is not in force")
    corr_amendment, _records, _subjects = corr_binding(root)
    corr_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(CORR_STATUS_PREFIX)]
    if corr_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and CORR_TAG in line
                   for line in rows.get(CORR_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route spec corrections v2.11 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = corr_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or corr_fields != [f"{CORR_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route spec corrections v2.11 and its adoption {identity}")
    elif CORR_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in corr_fields):
            findings.append(f"`{STATUS}` calls spec corrections v2.11 adopted while it is not in force")
        if any(CORR_TAG in line and "Agent adoption" in line for line in rows.get(CORR_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls spec corrections v2.11 adopted while it is not in force")
    coverage_amendment, _records, _subjects = coverage_binding(root)
    coverage_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(COVERAGE_STATUS_PREFIX)]
    if coverage_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and COVERAGE_TAG in line
                   for line in rows.get(COVERAGE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route coverage precheck v2.12 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = coverage_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or coverage_fields != [f"{COVERAGE_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route coverage precheck v2.12 and its adoption {identity}")
    elif COVERAGE_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in coverage_fields):
            findings.append(f"`{STATUS}` calls coverage precheck v2.12 adopted while it is not in force")
        if any(COVERAGE_TAG in line and "Agent adoption" in line for line in rows.get(COVERAGE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls coverage precheck v2.12 adopted while it is not in force")
    infra_amendment, _records, _subjects = infra_binding(root)
    infra_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(INFRA_STATUS_PREFIX)]
    if infra_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and INFRA_TAG in line
                   for line in rows.get(INFRA_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route infrastructure recognizers v2.14 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = infra_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or infra_fields != [f"{INFRA_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route infrastructure recognizers v2.14 and its adoption {identity}")
    elif INFRA_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in infra_fields):
            findings.append(f"`{STATUS}` calls infrastructure recognizers v2.14 adopted while it is not in force")
        if any(INFRA_TAG in line and "Agent adoption" in line for line in rows.get(INFRA_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls infrastructure recognizers v2.14 adopted while it is not in force")
    findpages_amendment, _records, _subjects = findpages_binding(root)
    findpages_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(FINDPAGES_STATUS_PREFIX)]
    if findpages_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and FINDPAGES_TAG in line
                   for line in rows.get(FINDPAGES_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route index and task routes v2.15 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = findpages_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or findpages_fields != [f"{FINDPAGES_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route index and task routes v2.15 and its adoption {identity}")
    elif FINDPAGES_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in findpages_fields):
            findings.append(f"`{STATUS}` calls index and task routes v2.15 adopted while it is not in force")
        if any(FINDPAGES_TAG in line and "Agent adoption" in line for line in rows.get(FINDPAGES_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls index and task routes v2.15 adopted while it is not in force")
    subsec_amendment, _records, _subjects = subsec_binding(root)
    subsec_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(SUBSEC_STATUS_PREFIX)]
    if subsec_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and SUBSEC_TAG in line
                   for line in rows.get(SUBSEC_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route page subsections v2.16 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = subsec_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or subsec_fields != [f"{SUBSEC_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route page subsections v2.16 and its adoption {identity}")
    elif SUBSEC_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in subsec_fields):
            findings.append(f"`{STATUS}` calls page subsections v2.16 adopted while it is not in force")
        if any(SUBSEC_TAG in line and "Agent adoption" in line for line in rows.get(SUBSEC_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls page subsections v2.16 adopted while it is not in force")
    raw_read_amendment, _records, _subjects = raw_read_binding(root)
    raw_read_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(RAW_READ_ROUTE)]
    if raw_read_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and RAW_READ_TAG in line
                   for line in rows.get(RAW_READ_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route raw-read disclosure to its adoption and tag")
        identity = raw_read_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or raw_read_fields != [f"{RAW_READ_ROUTE} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route raw-read disclosure and its adoption {identity}")
    elif RAW_READ_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in raw_read_fields):
            findings.append(f"`{STATUS}` calls raw-read disclosure adopted while it is not in force")
        if any(RAW_READ_TAG in line and "Agent adoption" in line for line in rows.get(RAW_READ_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls raw-read disclosure adopted while it is not in force")
    treeread_amendment, _records, _subjects = treeread_binding(root)
    treeread_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(TREEREAD_ROUTE)]
    if treeread_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and TREEREAD_TAG in line
                   for line in rows.get(TREEREAD_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route run-tree read bounds to its adoption and tag")
        identity = treeread_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or treeread_fields != [f"{TREEREAD_ROUTE} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route run-tree read bounds and its adoption {identity}")
    elif TREEREAD_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in treeread_fields):
            findings.append(f"`{STATUS}` calls run-tree read bounds adopted while it is not in force")
        if any(TREEREAD_TAG in line and "Agent adoption" in line for line in rows.get(TREEREAD_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls run-tree read bounds adopted while it is not in force")
    verify_amendment, _records, _subjects = verify_binding(root)
    verify_fields = [line.strip() for line in visible_route_lines(status)
                     if line.strip().startswith(VERIFY_STATUS_PREFIX)]
    if verify_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and VERIFY_TAG in line
                   for line in rows.get(VERIFY_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route verify text v2.21 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = verify_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or verify_fields != [f"{VERIFY_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route verify text v2.21 and its adoption {identity}")
    elif VERIFY_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in verify_fields):
            findings.append(f"`{STATUS}` calls verify text v2.21 adopted while it is not in force")
        if any(VERIFY_TAG in line and "Agent adoption" in line for line in rows.get(VERIFY_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls verify text v2.21 adopted while it is not in force")
    qfile_amendment, _records, _subjects = qfile_binding(root)
    qfile_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(QFILE_STATUS_PREFIX)]
    if qfile_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and QFILE_TAG in line
                   for line in rows.get(QFILE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route question file v2.27 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = qfile_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or qfile_fields != [f"{QFILE_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route question file v2.27 and its adoption {identity}")
    elif QFILE_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in qfile_fields):
            findings.append(f"`{STATUS}` calls question file v2.27 adopted while it is not in force")
        if any(QFILE_TAG in line and "Agent adoption" in line for line in rows.get(QFILE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls question file v2.27 adopted while it is not in force")
    scripted_grade_amendment, _records, _subjects = scripted_grade_binding(root)
    scripted_grade_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(SCRIPTED_GRADE_STATUS_PREFIX)]
    if scripted_grade_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and SCRIPTED_GRADE_TAG in line
                   for line in rows.get(SCRIPTED_GRADE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route scripted benchmark grading v2.30 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = scripted_grade_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or scripted_grade_fields != [f"{SCRIPTED_GRADE_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route scripted benchmark grading v2.30 and its adoption {identity}")
    elif SCRIPTED_GRADE_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in scripted_grade_fields):
            findings.append(f"`{STATUS}` calls scripted benchmark grading v2.30 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(SCRIPTED_GRADE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls scripted benchmark grading v2.30 adopted while it is not in force")
    step_measures_amendment, _records, _subjects = step_measures_binding(root)
    step_measures_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(STEP_MEASURES_STATUS_PREFIX)]
    if step_measures_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and STEP_MEASURES_TAG in line
                   for line in rows.get(STEP_MEASURES_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route dossier close measures v2.31 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = step_measures_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or step_measures_fields != [f"{STEP_MEASURES_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route dossier close measures v2.31 and its adoption {identity}")
    elif STEP_MEASURES_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in step_measures_fields):
            findings.append(f"`{STATUS}` calls dossier close measures v2.31 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(STEP_MEASURES_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls dossier close measures v2.31 adopted while it is not in force")
    covhold_amendment, _records, _subjects = covhold_binding(root)
    covhold_fields = [line.strip() for line in visible_route_lines(status)
                     if line.strip().startswith(COVHOLD_STATUS_PREFIX)]
    if covhold_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and COVHOLD_TAG in line
                   for line in rows.get(COVHOLD_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route coverage hold v2.28 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = covhold_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or covhold_fields != [f"{COVHOLD_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route coverage hold v2.28 and its adoption {identity}")
    elif COVHOLD_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in covhold_fields):
            findings.append(f"`{STATUS}` calls coverage hold v2.28 adopted while it is not in force")
        if any(COVHOLD_TAG in line and "Agent adoption" in line for line in rows.get(COVHOLD_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls coverage hold v2.28 adopted while it is not in force")
    term_brief_amendment, _records, _subjects = term_brief_binding(root)
    term_brief_fields = [line.strip() for line in visible_route_lines(status)
                         if line.strip().startswith(TERM_BRIEF_STATUS_PREFIX)]
    if term_brief_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and TERM_BRIEF_TAG in line
                   for line in rows.get(TERM_BRIEF_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route terminology brief "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = term_brief_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or term_brief_fields != [f"{TERM_BRIEF_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route terminology brief and its adoption {identity}")
    elif TERM_BRIEF_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in term_brief_fields):
            findings.append(f"`{STATUS}` calls terminology brief adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(TERM_BRIEF_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls terminology brief adopted while it is not in force")
    qkind_amendment, _records, _subjects = qkind_binding(root)
    qkind_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(QKIND_STATUS_PREFIX)]
    if qkind_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and QKIND_TAG in line
                   for line in rows.get(QKIND_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route question-kind floor v2.32 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = qkind_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or qkind_fields != [f"{QKIND_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route question-kind floor v2.32 and its adoption {identity}")
    elif QKIND_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in qkind_fields):
            findings.append(f"`{STATUS}` calls question-kind floor v2.32 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(QKIND_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls question-kind floor v2.32 adopted while it is not in force")
    figplan_amendment, _records, _subjects = figplan_binding(root)
    figplan_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(FIGPLAN_STATUS_PREFIX)]
    if figplan_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and FIGPLAN_TAG in line
                   for line in rows.get(FIGPLAN_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route figure plan v2.33 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = figplan_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or figplan_fields != [f"{FIGPLAN_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route figure plan v2.33 and its adoption {identity}")
    elif FIGPLAN_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in figplan_fields):
            findings.append(f"`{STATUS}` calls figure plan v2.33 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(FIGPLAN_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls figure plan v2.33 adopted while it is not in force")
    choice_amendment, _records, _subjects = choice_binding(root)
    choice_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(CHOICE_STATUS_PREFIX)]
    if choice_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and CHOICE_TAG in line
                   for line in rows.get(CHOICE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route choice floor v2.37 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = choice_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or choice_fields != [f"{CHOICE_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route choice floor v2.37 and its adoption {identity}")
    elif CHOICE_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in choice_fields):
            findings.append(f"`{STATUS}` calls choice floor v2.37 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(CHOICE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls choice floor v2.37 adopted while it is not in force")
    migpar_amendment, _records, _subjects = migpar_binding(root)
    migpar_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(MIGPAR_STATUS_PREFIX)]
    if migpar_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and MIGPAR_TAG in line
                   for line in rows.get(MIGPAR_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route migration parity v2.38 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = migpar_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or migpar_fields != [f"{MIGPAR_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route migration parity v2.38 and its adoption {identity}")
    elif MIGPAR_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in migpar_fields):
            findings.append(f"`{STATUS}` calls migration parity v2.38 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(MIGPAR_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls migration parity v2.38 adopted while it is not in force")
    impfacts_amendment, _records, _subjects = impfacts_binding(root)
    impfacts_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(IMPFACTS_STATUS_PREFIX)]
    if impfacts_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and IMPFACTS_TAG in line
                   for line in rows.get(IMPFACTS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route import facts v2.39 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = impfacts_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or impfacts_fields != [f"{IMPFACTS_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route import facts v2.39 and its adoption {identity}")
    elif IMPFACTS_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in impfacts_fields):
            findings.append(f"`{STATUS}` calls import facts v2.39 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(IMPFACTS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls import facts v2.39 adopted while it is not in force")
    walk_amendment, _records, _subjects = walk_binding(root)
    walk_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(WALK_STATUS_PREFIX)]
    if walk_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and WALK_TAG in line
                   for line in rows.get(WALK_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route figure walks v2.40 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = walk_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or walk_fields != [f"{WALK_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route figure walks v2.40 and its adoption {identity}")
    elif WALK_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in walk_fields):
            findings.append(f"`{STATUS}` calls figure walks v2.40 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(WALK_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls figure walks v2.40 adopted while it is not in force")
    tnames_amendment, _records, _subjects = tnames_binding(root)
    tnames_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(TNAMES_STATUS_PREFIX)]
    if tnames_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and TNAMES_TAG in line
                   for line in rows.get(TNAMES_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route test-name recognizers v2.42 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = tnames_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or tnames_fields != [f"{TNAMES_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route test-name recognizers v2.42 and its adoption {identity}")
    elif TNAMES_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in tnames_fields):
            findings.append(f"`{STATUS}` calls test-name recognizers v2.42 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(TNAMES_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls test-name recognizers v2.42 adopted while it is not in force")
    migbound_amendment, _records, _subjects = migbound_binding(root)
    migbound_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(MIGBOUND_STATUS_PREFIX)]
    if migbound_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and MIGBOUND_TAG in line
                   for line in rows.get(MIGBOUND_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route migration bounds v2.43 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = migbound_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or migbound_fields != [f"{MIGBOUND_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route migration bounds v2.43 and its adoption {identity}")
    elif MIGBOUND_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in migbound_fields):
            findings.append(f"`{STATUS}` calls migration bounds v2.43 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(MIGBOUND_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls migration bounds v2.43 adopted while it is not in force")
    rough_amendment, _records, _subjects = rough_binding(root)
    rough_fields = [line.strip() for line in visible_route_lines(status)
                       if line.strip().startswith(ROUGH_STATUS_PREFIX)]
    if rough_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and ROUGH_TAG in line
                   for line in rows.get(ROUGH_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route rough-edge markers v2.44 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = rough_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or rough_fields != [f"{ROUGH_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route rough-edge markers v2.44 and its adoption {identity}")
    elif ROUGH_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in rough_fields):
            findings.append(f"`{STATUS}` calls rough-edge markers v2.44 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(ROUGH_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls rough-edge markers v2.44 adopted while it is not in force")
    vbase_retired_by = vbase_disposition(root, vbase_rows(root))
    vbase_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(VBASE_STATUS_PREFIX)]
    if VBASE_CHANGE in changes:
        examined += 2
        old_rows = rows.get(VBASE_CHANGE, [])
        if any("is agent-adopted" in line for line in vbase_fields):
            findings.append(f"`{STATUS}` calls untagged A-267 derived-base views effective")
        if any("Agent adoption" in line for line in old_rows):
            findings.append(f"`{OPENSPEC_README}` routes untagged A-267 as an adoption")
        if vbase_retired_by:
            historical_line = f"{VBASE_STATUS_PREFIX} records the untagged A-267 proposal, retired by {vbase_retired_by}."
            if vbase_fields != [historical_line] or not any(
                f"`{vbase_retired_by}`" in line and 'retired' in line for line in old_rows
            ):
                findings.append("the historical derived-base routes do not name the exact retirement")
    screening_state, _text, _records, _subjects = vbase_screening_binding(root)
    reltype_amendment, _records, _subjects = reltype_binding(root)
    reltype_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(RELTYPE_STATUS_PREFIX)]
    if reltype_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and RELTYPE_TAG in line
                   for line in rows.get(RELTYPE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route relation types v2.19 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = reltype_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or reltype_fields != [f"{RELTYPE_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route relation types v2.19 and its adoption {identity}")
    elif RELTYPE_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in reltype_fields):
            findings.append(f"`{STATUS}` calls relation types v2.19 adopted while it is not in force")
    hero_amendment, _records, _subjects = hero_binding(root)
    hero_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(HERO_STATUS_PREFIX)]
    if hero_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and HERO_TAG in line
                   for line in rows.get(HERO_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route hero figure v2.20 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = hero_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or hero_fields != [f"{HERO_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route hero figure v2.20 and its adoption {identity}")
    elif HERO_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in hero_fields):
            findings.append(f"`{STATUS}` calls hero figure v2.20 adopted while it is not in force")
    readers_amendment, _records, _subjects = readers_binding(root)
    readers_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(READERS_STATUS_PREFIX)]
    if readers_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and READERS_TAG in line
                   for line in rows.get(READERS_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route reader's edition v2.22 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = readers_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or readers_fields != [f"{READERS_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route reader's edition v2.22 and its adoption {identity}")
    elif READERS_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in readers_fields):
            findings.append(f"`{STATUS}` calls reader's edition v2.22 adopted while it is not in force")
    cont_amendment, _records, _subjects = cont_binding(root)
    cont_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(CONT_STATUS_PREFIX)]
    if cont_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and CONT_TAG in line
                   for line in rows.get(CONT_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route containment figure v2.23 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = cont_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or cont_fields != [f"{CONT_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route containment figure v2.23 and its adoption {identity}")
    elif CONT_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in cont_fields):
            findings.append(f"`{STATUS}` calls containment figure v2.23 adopted while it is not in force")
    model_amendment, _records, _subjects = model_binding(root)
    model_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(MODEL_STATUS_PREFIX)]
    if model_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and MODEL_TAG in line
                   for line in rows.get(MODEL_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route system model v2.24 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = model_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or model_fields != [f"{MODEL_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route system model v2.24 and its adoption {identity}")
    elif MODEL_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in model_fields):
            findings.append(f"`{STATUS}` calls system model v2.24 adopted while it is not in force")
    worth_amendment, _records, _subjects = worth_binding(root)
    worth_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(WORTH_STATUS_PREFIX)]
    if worth_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and WORTH_TAG in line
                   for line in rows.get(WORTH_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route worth-knowing v2.26 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = worth_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or worth_fields != [f"{WORTH_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route worth-knowing v2.26 and its adoption {identity}")
    elif WORTH_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in worth_fields):
            findings.append(f"`{STATUS}` calls worth-knowing v2.26 adopted while it is not in force")
    edit_account_amendment, _records, _subjects = edit_account_binding(root)
    edit_account_fields = [line.strip() for line in visible_route_lines(status)
                           if line.strip().startswith(EDIT_ACCOUNT_STATUS_PREFIX)]
    edit_account_routes = [[cell.strip() for cell in line.split("|")[1:-1]]
                           for line in rows.get(EDIT_ACCOUNT_CHANGE, [])]
    if edit_account_amendment is not None:
        examined += 2
        identity = edit_account_rows(root)[0][0]
        spec_link = f"[`{EDIT_ACCOUNT_CHANGE}`](changes/{EDIT_ACCOUNT_CHANGE})"
        ledger_link = f"[Agent adoption {identity}](../{AGENT_ADOPTIONS}) (`{EDIT_ACCOUNT_TAG}`)"
        if (len(edit_account_routes) != 1
                or not edit_account_index_adopted(edit_account_routes[0])
                or edit_account_routes[0][0] != spec_link
                or edit_account_routes[0][3] != ledger_link):
            findings.append(f"`{OPENSPEC_README}` does not route edit and repair accounting v2.25 "
                            f"to exact adoption {identity} in `{AGENT_ADOPTIONS}` and its version tag")
        if AGENT_ADOPTIONS not in status or edit_account_fields != [
            f"{EDIT_ACCOUNT_STATUS_PREFIX} is agent-adopted in {identity}."
        ]:
            findings.append(f"`{STATUS}` does not route edit and repair accounting v2.25 and its adoption {identity}")
    elif EDIT_ACCOUNT_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in edit_account_fields):
            findings.append(f"`{STATUS}` calls edit and repair accounting v2.25 adopted while it is not in force")
        if any(edit_account_index_adopted(cells) for cells in edit_account_routes):
            findings.append(f"`{OPENSPEC_README}` calls edit and repair accounting v2.25 adopted while it is not in force")
    readmit_amendment, _records, _subjects = readmit_binding(root)
    readmit_fields = [line.strip() for line in visible_route_lines(status)
                      if line.strip().startswith(READMIT_STATUS_PREFIX)]
    if readmit_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and READMIT_TAG in line
                   for line in rows.get(READMIT_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route declared-source re-admission v2.13 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = readmit_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or readmit_fields != [f"{READMIT_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route declared-source re-admission v2.13 and its adoption {identity}")
    elif READMIT_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in readmit_fields):
            findings.append(f"`{STATUS}` calls declared-source re-admission v2.13 adopted while it is not in force")
        if any(READMIT_TAG in line and "Agent adoption" in line for line in rows.get(READMIT_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls declared-source re-admission v2.13 adopted while it is not in force")
    reach_amendment, _records, _subjects = reach_binding(root)
    reach_fields = [line.strip() for line in visible_route_lines(status)
                    if line.strip().startswith(REACH_STATUS_PREFIX)]
    if reach_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and REACH_TAG in line
                   for line in rows.get(REACH_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route declared-source reach v2.6 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = reach_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or reach_fields != [f"{REACH_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route declared-source reach v2.6 and its adoption {identity}")
    elif REACH_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in reach_fields):
            findings.append(f"`{STATUS}` calls declared-source reach v2.6 adopted while it is not in force")
        if any(REACH_TAG in line and "Agent adoption" in line for line in rows.get(REACH_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls declared-source reach v2.6 adopted while it is not in force")
    figures = STATUS_FIGURE.findall(status)
    examined += 1
    reqs = pop.get("POLARIS", {})
    want = (str(len(reqs)), str(sum(len(r["scenarios"]) for r in reqs.values())))
    if screening_state in {"staged", "effective"}:
        try:
            projection = json.loads(read_text(root, VBASE_SCREENING_PROJECTION) or "null")
            populations = projection["populations"]
            expected_figures = [
                (str(populations[phase]["requirements"]), str(populations[phase]["scenarios"]))
                for phase in ("pretag", "active")
            ]
        except (ValueError, TypeError, KeyError):
            expected_figures = []
        declarations = []
        visible = [line.strip() for line in visible_route_lines(status)]
        for prefix, pattern in zip(VBASE_PHASE_PREFIXES, (VBASE_STATUS_PRETAG, VBASE_STATUS_ACTIVE), strict=True):
            candidates = [line for line in visible if line.startswith(prefix)]
            match = pattern.fullmatch(candidates[0]) if len(candidates) == 1 else None
            declarations.append(match.groups() if match else None)
        selected = 1 if screening_state == "effective" else 0
        advice_state, _advice, _records, _subjects = p5_advice_binding(root)
        if rough_binding(root)[0] is not None:
            # The rough-edge markers' own sentence states the current total; the earlier sentences state theirs.
            if scoped_route_lines(status, (ROUGH_COUNT_SCOPE,)) != [
                    f"{ROUGH_COUNT_PREFIX}{want[0]} requirements and {want[1]} scenarios."]:
                findings.append(f"`{STATUS}` does not declare the exact rough-edge markers census")
            want = (want[0], str(int(want[1]) - rough_delta(root, findings)))
        elif scoped_route_lines(status, (ROUGH_COUNT_SCOPE,)):
            findings.append(f"`{STATUS}` declares a rough-edge markers census while it is not in force")
        if migbound_binding(root)[0] is not None:
            # The migration bounds' own sentence states the current total; the earlier sentences state theirs.
            if scoped_route_lines(status, (MIGBOUND_COUNT_SCOPE,)) != [
                    f"{MIGBOUND_COUNT_PREFIX}{want[0]} requirements and {want[1]} scenarios."]:
                findings.append(f"`{STATUS}` does not declare the exact migration bounds census")
            want = (want[0], str(int(want[1]) - migbound_delta(root, findings)))
        elif scoped_route_lines(status, (MIGBOUND_COUNT_SCOPE,)):
            findings.append(f"`{STATUS}` declares a migration bounds census while it is not in force")
        if tnames_binding(root)[0] is not None:
            # The test-name recognizers' own sentence states the current total; the earlier sentences state theirs.
            if scoped_route_lines(status, (TNAMES_COUNT_SCOPE,)) != [
                    f"{TNAMES_COUNT_PREFIX}{want[0]} requirements and {want[1]} scenarios."]:
                findings.append(f"`{STATUS}` does not declare the exact test-name recognizers census")
            want = (want[0], str(int(want[1]) - tnames_delta(root, findings)))
        elif scoped_route_lines(status, (TNAMES_COUNT_SCOPE,)):
            findings.append(f"`{STATUS}` declares a test-name recognizers census while it is not in force")
        if walk_binding(root)[0] is not None:
            # The figure walks' own sentence states the current total; the earlier sentences state theirs.
            if scoped_route_lines(status, (WALK_COUNT_SCOPE,)) != [
                    f"{WALK_COUNT_PREFIX}{want[0]} requirements and {want[1]} scenarios."]:
                findings.append(f"`{STATUS}` does not declare the exact figure walks census")
            want = (want[0], str(int(want[1]) - walk_delta(root, findings)))
        elif scoped_route_lines(status, (WALK_COUNT_SCOPE,)):
            findings.append(f"`{STATUS}` declares an figure walks census while it is not in force")
        if impfacts_binding(root)[0] is not None:
            # The import facts' own sentence states the current total; the earlier sentences state theirs.
            if scoped_route_lines(status, (IMPFACTS_COUNT_SCOPE,)) != [
                    f"{IMPFACTS_COUNT_PREFIX}{want[0]} requirements and {want[1]} scenarios."]:
                findings.append(f"`{STATUS}` does not declare the exact import facts census")
            want = (want[0], str(int(want[1]) - impfacts_delta(root, findings)))
        elif scoped_route_lines(status, (IMPFACTS_COUNT_SCOPE,)):
            findings.append(f"`{STATUS}` declares an import facts census while it is not in force")
        if migpar_binding(root)[0] is not None:
            # The migration parity's own sentence states the current total; the earlier sentences state theirs.
            if scoped_route_lines(status, (MIGPAR_COUNT_SCOPE,)) != [
                    f"{MIGPAR_COUNT_PREFIX}{want[0]} requirements and {want[1]} scenarios."]:
                findings.append(f"`{STATUS}` does not declare the exact migration parity census")
            want = (want[0], str(int(want[1]) - migpar_delta(root, findings)))
        elif scoped_route_lines(status, (MIGPAR_COUNT_SCOPE,)):
            findings.append(f"`{STATUS}` declares an migration parity census while it is not in force")
        if choice_binding(root)[0] is not None:
            # The choice floor's own sentence states the current total; the earlier sentences state theirs.
            if scoped_route_lines(status, (CHOICE_COUNT_SCOPE,)) != [
                    f"{CHOICE_COUNT_PREFIX}{want[0]} requirements and {want[1]} scenarios."]:
                findings.append(f"`{STATUS}` does not declare the exact choice floor census")
            want = (want[0], str(int(want[1]) - choice_delta(root, findings)))
        elif scoped_route_lines(status, (CHOICE_COUNT_SCOPE,)):
            findings.append(f"`{STATUS}` declares a choice floor census while it is not in force")
        screening_want = want
        if advice_state in {"staged", "effective"}:
            added = p5_advice_delta(root, findings)
            current_scenarios = int(want[1])
            screening_scenarios = current_scenarios - added if advice_state == "effective" else current_scenarios
            screening_want = (want[0], str(screening_scenarios))
            prospective = f"{P5_ADVICE_COUNT_PREFIX}{want[0]} requirements and {screening_scenarios + added} scenarios."
            if scoped_route_lines(status, (P5_ADVICE_COUNT_SCOPE,)) != [prospective]:
                findings.append(f"`{STATUS}` does not declare the exact source-example advice census")
        if (figures or len(expected_figures) != 2
                or declarations != expected_figures
                or expected_figures[selected] != screening_want):
            findings.append(f"`{STATUS}` does not declare both exact Polaris census states")
    elif figures != [want]:
        findings.append(f"`{STATUS}`: Polaris composition figure {figures} "
                        f"!= census {want}")
    report.add("R5", "default routes name the terminal records", examined,
               findings, f"{len(changes)} tracked change directories")


# --------------------------------------------------------------------------
# R6: behaviour-contract pins (reported, never green, never repaired).
# --------------------------------------------------------------------------

def check_pins(root, report):
    spec = read_bytes(root, FAMILY_SPECS["PWB"]) or b""
    current = "sha256:" + sha(spec)
    findings, examined = [], 0

    def pins(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key == "governingBehaviorContract" and isinstance(value, dict):
                    yield value.get("version")
                else:
                    yield from pins(value)
        elif isinstance(node, list):
            for value in node:
                yield from pins(value)

    for rel in (REGISTRY, POLICY):
        text = read_text(root, rel)
        if text is None:
            findings.append(f"`{rel}` missing: pin Unknown")
            continue
        found = list(pins(json.loads(text)))
        if not found:
            findings.append(f"`{rel}`: no governingBehaviorContract; "
                            "pin Unknown")
        for pinned in found:
            examined += 1
            if pinned != current:
                findings.append(
                    f"`{rel}`: pins {pinned}, current PWB spec.md is "
                    f"{current} — Unknown until its own owner act "
                    f"({PIN_BEAD})")
    report.warn("R6", "behaviour-contract pins (report only)", examined,
                findings,
                "a stale pin is Unknown, never green; repair needs an owner "
                "act this checker never performs")


# --------------------------------------------------------------------------
# R7: Polaris dependency unions (reported, never green, never repaired).
# --------------------------------------------------------------------------

WARRANTS = re.compile(r"^```yaml\nwarrants:\n(.*?)^```", re.M | re.S)


def warrant_union(text):
    """Union of every warrant class over one spec's warrants blocks."""
    union = {}
    for block in WARRANTS.findall(text):
        key = None
        for line in block.split("\n"):
            m = re.match(r"^  (\w+):[ \t]*(.*?)[ \t]*$", line)
            if m:
                key, value = m.group(1), m.group(2)
                union.setdefault(key, set())
                if value.startswith("[") and value.endswith("]"):
                    union[key] |= {v.strip() for v in value[1:-1].split(",")
                                   if v.strip()}
                elif value:
                    union[key].add(value)
                continue
            m = re.match(r"^\s+- (.+?)[ \t]*$", line)
            if m and key:
                union[key].add(m.group(1))
    return union


def declared_union(text):
    """The classes a generated union file declares (JSON or `## class` lists)."""
    m = re.search(r"```json\n(.*?)```", text, re.S)
    if m:
        return {k: set(v) for k, v in json.loads(m.group(1)).items()}
    out = {}
    for sec in re.finditer(r"^## (\w+)\n\n(.*?)(?=^## |\Z)", text, re.M | re.S):
        body = sec.group(2).strip()
        out[sec.group(1)] = (set() if body.startswith("None declared")
                             else {v.strip() for v in body.split(",") if v.strip()})
    return out


def check_unions(root, report):
    findings, examined = [], 0
    for spec_rel, change in ((POLARIS_BASE_SPEC, BASE_CHANGE),
                             (POLARIS_OVERLAY_SPEC, UNDERSTANDING_CHANGE)):
        rel = f"{CHANGES}/{change}/GOVERNING-DEPENDENCIES.md"
        spec, deps = read_text(root, spec_rel), read_text(root, rel)
        if spec is None or deps is None:
            findings.append(f"`{rel}` or its spec missing: union Unknown")
            continue
        computed, declared = warrant_union(spec), declared_union(deps)
        if "primary" not in declared:
            # The base union is declared over the six warrant classes only.
            computed.pop("primary", None)
        for cls in sorted(set(computed) | set(declared)):
            examined += 1
            missing = sorted(computed.get(cls, set()) - declared.get(cls, set()))
            extra = sorted(declared.get(cls, set()) - computed.get(cls, set()))
            if missing or extra:
                findings.append(
                    f"`{rel}` {cls}: lacks {missing}, carries extra {extra} — "
                    f"bound bytes; Unknown until a signed successor "
                    f"({UNION_BEAD})")
    report.warn("R7", "Polaris dependency unions match their warrants "
                "(report only)", examined, findings,
                "regenerated by scripts/build_polaris_dependency_unions.py; "
                "a change to a signed union needs a signed successor")


# Within one run() the tree is only read, so whether its P115 transaction is
# signed cannot change between the predicates that ask; it was asked twelve
# times per run (~4,200 git calls, syzygy-b6dp). The memo lives for one run()
# call only: a later run, or a caller between runs, asks afresh.
_SIGNED_MEMO = None


def reference_signed(root):
    if _SIGNED_MEMO is None:
        return poc_reference().is_signed(root)
    key = str(Path(root).resolve())
    if key not in _SIGNED_MEMO:
        _SIGNED_MEMO[key] = poc_reference().is_signed(root)
    return _SIGNED_MEMO[key]


# Within one run() the tree is only read, so neither D10's state nor any
# versioned binding can change between the predicates that ask. Each binding
# re-derived every predecessor's binding (a call chain that grew with the square
# of the version count) and each asked D10's recorder afresh (syzygy-v0b5). The
# memo is keyed by function and resolved root, lives for one run() call only,
# and is bypassed while `_FILES_OVERRIDE` puts other bytes in front of a read.
_RUN_MEMO = None


def _per_run(function):
    """`function(root)`, answered once per root within one run()."""
    @functools.wraps(function)
    def memoized(*args, **kwargs):
        if _RUN_MEMO is None or _FILES_OVERRIDE is not None or len(args) != 1 or kwargs:
            return function(*args, **kwargs)
        key = (function.__module__, function.__name__, str(Path(args[0]).resolve()))
        if key not in _RUN_MEMO:
            _RUN_MEMO[key] = function(args[0])
        # A copy each time: a caller may extend the finding lists it is given.
        return copy.deepcopy(_RUN_MEMO[key])
    memoized.unmemoized = function
    return memoized


@contextlib.contextmanager
def _run_scope():
    """One run()'s memos: P115's answer, the per-run bindings, D10's state.

    Entered by run() and by every caller that asks a predicate outside run()
    (a bare `check_outcomes`, which otherwise re-derives P115 about twenty
    times per call, syzygy-7rkx). Each entry starts empty and each exit
    clears, so nothing carries from one scope to the next. Scopes do not
    nest: an inner exit would clear the outer scope's memos, so entering
    one inside another is refused.
    """
    global _SIGNED_MEMO, _RUN_MEMO
    assert _SIGNED_MEMO is None and _RUN_MEMO is None, "_run_scope nested"
    _SIGNED_MEMO = {}
    _RUN_MEMO = {}
    import d10_supersession
    d10_state = d10_supersession.state
    d10_supersession.state = _per_run(d10_state)
    try:
        yield
    finally:
        _SIGNED_MEMO = None
        _RUN_MEMO = None
        d10_supersession.state = d10_state


def scoped_check_outcomes(root, report):
    """`check_outcomes` as run() asks it, for a caller outside run()."""
    with _run_scope():
        check_outcomes(root, report)


@_reverse_cache_scope()
def run(root):
    report = Report()
    with _run_scope():
        check_outcomes(root, report)
        pop = check_census(root, report)
        check_generated(root, pop, report)
        check_routes(root, pop, report)
        check_pins(root, report)
        check_unions(root, report)
    return report


# Every versioned binding of a root, memoized per run() (`_per_run`) by the
# call just before `main`'s guard: each
# local function named `*_binding` whose one parameter is `root`, found rather
# than listed, so a binding a later version adds is memoized without an edit
# here. `adopted_binding` takes a module name and is left alone.
def _memoize_bindings(namespace):
    import inspect
    for name, value in list(namespace.items()):
        if (name.endswith("_binding") and inspect.isfunction(value)
                and value.__module__ == namespace["__name__"]
                and not hasattr(value, "unmemoized")
                and list(inspect.signature(value).parameters) == ["root"]):
            namespace[name] = _per_run(value)


# --------------------------------------------------------------------------
# Self-test: rule-6 mutations over a scratch copy of the inputs.
# --------------------------------------------------------------------------

def declared_source_inputs(root):
    """Only the inputs needed to recheck the explicit adoption in a projection."""
    paths = {AGENT_ADOPTIONS, DECLARED_SOURCE_UNION, *DECLARED_SOURCE_SUBJECTS}
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import d10_supersession
    if d10_supersession.rec is not None:
        rec = d10_supersession.rec
        paths |= set(tracked(root, rec.PACKAGE.rstrip("/")))
        paths |= {rec.ACT, rec.AGGREGATE, rec.LOG}
    return paths


def inputs(root):
    paths = {AGGREGATE, CENSUS, STATUS, REGISTRY, POLICY, *ROUTE_PAGES}
    for child in CHILDREN:
        paths |= {child["record"], child["manifest"]}
        for later in successors_for(root, child):
            paths |= {later["record"], later["manifest"]}
            if "proposed" in later:
                paths |= set(tracked(root, later["proposed"]))
        manifest = read_text(root, child["manifest"]) or ""
        paths |= {p for _d, p in ROW.findall(manifest)}
        paths |= set(tracked(root, f"{CHANGES}/{child['change']}"))
    paths |= set(tracked(root, CHANGES)) | {CAP1_OVERLAY_RECORD, CAP1_ROOT_INDEX,
                                          *CAP1_ROOT_RFC_FILES}
    for change, rel in polaris_additions(root):
        paths |= {rel} | {r for r, _t, _v in addition_records(root, change)}
        paths |= {r for r, _t, _v in addition_terminals(root, change)}
        if change in ADOPTED_ADDITIONS:
            paths.add(adopted_binding(ADOPTED_ADDITIONS[change][1])[1])
    paths |= declared_source_inputs(root)
    paths |= {URL_SOURCE_UNION, URL_SOURCE_REPLACEMENTS, *URL_SOURCE_SUBJECTS, *URL_SOURCE_RFC_PATHS}
    paths |= {FIGURE_UNION, *FIGURE_SUBJECTS}
    paths |= {DERIVED_UNION, *DERIVED_SUBJECTS}
    paths |= {LEDGER_UNION, *LEDGER_SUBJECTS}
    paths |= {KINDS_UNION, *KINDS_SUBJECTS}
    paths |= {REACH_UNION, *REACH_SUBJECTS}
    paths |= {READMIT_UNION, *READMIT_SUBJECTS}
    paths |= {MANIFESTS_UNION, *MANIFESTS_SUBJECTS}
    paths |= {REPAIRS_UNION, *REPAIRS_SUBJECTS}
    paths |= {MAPS_UNION, *MAPS_SUBJECTS}
    paths |= {BOUNDS_UNION, *BOUNDS_SUBJECTS}
    paths |= {CORR_UNION, *CORR_SUBJECTS}
    paths |= {COVERAGE_UNION, *COVERAGE_SUBJECTS}
    paths |= {INFRA_UNION, *INFRA_SUBJECTS}
    paths |= {FINDPAGES_UNION, *FINDPAGES_SUBJECTS}
    paths |= {SUBSEC_UNION, *SUBSEC_SUBJECTS}
    paths |= {RELTYPE_UNION, *RELTYPE_SUBJECTS}
    paths |= {HERO_UNION, *HERO_SUBJECTS}
    paths |= {READERS_UNION, *READERS_SUBJECTS}
    paths |= {CONT_UNION, *CONT_SUBJECTS}
    paths |= {MODEL_UNION, *MODEL_SUBJECTS}
    paths |= {WORTH_UNION, *WORTH_SUBJECTS}
    paths |= {RAW_READ_UNION, *RAW_READ_SUBJECTS}
    paths |= {TREEREAD_UNION, *TREEREAD_SUBJECTS}
    paths |= {VERIFY_UNION, *VERIFY_SUBJECTS}
    paths |= {QFILE_UNION, *QFILE_SUBJECTS}
    paths |= {SCRIPTED_GRADE_UNION, *SCRIPTED_GRADE_SUBJECTS}
    paths |= {STEP_MEASURES_UNION, *STEP_MEASURES_SUBJECTS}
    paths |= {COVHOLD_UNION, *COVHOLD_SUBJECTS}
    paths |= {TERM_BRIEF_UNION, *TERM_BRIEF_SUBJECTS}
    paths |= {QKIND_UNION, *QKIND_SUBJECTS}
    paths |= {FIGPLAN_UNION, *FIGPLAN_SUBJECTS}
    paths |= {VBASE_UNION, *VBASE_SUBJECTS}
    paths |= {VBASE_SCREENING_PROJECTION, *VBASE_SCREENING_SUBJECTS, *P5_ADVICE_SUBJECTS}
    paths |= {CHOICE_UNION, *CHOICE_SUBJECTS}
    paths |= {MIGPAR_UNION, *MIGPAR_SUBJECTS}
    paths |= {IMPFACTS_UNION, *IMPFACTS_SUBJECTS}
    paths |= {WALK_UNION, *WALK_SUBJECTS}
    paths |= {TNAMES_UNION, *TNAMES_SUBJECTS}
    paths |= {MIGBOUND_UNION, *MIGBOUND_SUBJECTS}
    paths |= {ROUGH_UNION, *ROUGH_SUBJECTS}
    paths |= poc_reference().validation_inputs(root)
    return sorted(paths)


def scratch(root, dest):
    for rel in inputs(root):
        src = root / rel
        if src.is_file():
            (dest / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(src, dest / rel)


def _replace(old, new, count=1):
    def apply(text):
        if old not in text:
            raise AssertionError(f"mutation target absent: {old[:60]!r}")
        return text.replace(old, new, count)
    return apply


def _first_hex_flip(label):
    def apply(text):
        m = re.search(rf"^{re.escape(label)}: ([0-9a-f]{{64}})$", text, re.M)
        arg = m.group(1)
        flipped = ("1" if arg[0] != "1" else "2") + arg[1:]
        return text.replace(f"{label}: {arg}", f"{label}: {flipped}")
    return apply


def _pin_moved(root):
    current = sha(read_bytes(root, FAMILY_SPECS["PWB"]) or b"")

    def apply(text):
        def swap(m):
            target = current if m.group(2) != current else "0" * 64
            return m.group(1) + target + '"'
        return re.sub(r'("version": "sha256:)([0-9a-f]{64})"', swap, text, 1)
    return apply


def _repin_package(root, module="build_pwb_behavior_contract_repin"):
    """Map each pinned subject's current text to a re-pin package's bytes."""
    sys.path.insert(0, str(root / "scripts"))
    repin = __import__(module)
    by_text = {}
    for subject in repin.SUBJECTS:
        current = read_text(root, subject.path.as_posix())
        by_text[current] = repin.proposed_bytes(root, subject).decode("utf-8")
    # The spec.md bytes the pins name: the tree with every later signed
    # spec.md patch reversed (identity until a later sign-off moves it).
    by_text[read_text(root, FAMILY_SPECS["PWB"])] = (
        repin.spec_at_pin(root).decode("utf-8"))

    def apply(text):
        if text not in by_text:
            raise AssertionError("pinned subject differs from the tree it was read from")
        return by_text[text]
    return apply


def _union_successor(root):
    """The understanding union as the c51h successor package proposes it."""
    rel = f"{CHANGES}/{UNDERSTANDING_CHANGE}/GOVERNING-DEPENDENCIES.md"
    proposed = read_text(root, f"{UNION_SUCCESSOR}/proposed/{rel}.proposed")

    def apply(text):
        if proposed is None:
            raise AssertionError("the union successor package proposes no union")
        return proposed
    return apply


def _removed_line_altered(text):
    """Alter the first removed content line of a patch: it still reverses,
    but to bytes that are not the row the chain reached."""
    lines = text.split("\n")
    i = next((i for i, line in enumerate(lines)
              if line.startswith("-") and not line.startswith("---")), None)
    if i is None:
        raise AssertionError("patch carries no removed content line")
    lines[i] += " x"
    return "\n".join(lines)


def _block_moved_before(marker, before):
    """Move one aggregate block (marker to its closing marker) to sit before
    another marker, so append order no longer matches act order."""
    close = marker.replace("<!-- ", "<!-- /", 1)

    def apply(text):
        start, end = text.find(marker), text.find(close)
        at = text.find(before)
        if min(start, end, at) < 0 or not at < start:
            raise AssertionError("aggregate blocks not found in act order")
        end += len(close) + 1
        block = text[start:end]
        rest = text[:start] + text[end:]
        at = rest.find(before)
        return rest[:at] + block + "\n" + rest[at:]
    return apply


def _chain_predecessor_moved(text):
    """Point every row of a successor record's table at a digest no act signed."""
    out, n = ACT_TABLE_ROW.subn(
        lambda m: f"| `{m.group(1)}` | `{'0' * 64}` | `{m.group(3)}` |", text)
    if not n:
        raise AssertionError("successor record carries no signed-subject row")
    return out


#: The first act that superseded the 2026-10-02 policy re-pin act. Once it is
#: recorded, the syzygy-2g0d package (which re-pins from that act's bytes)
#: is stale for the policy until it is re-derived.
POLICY_SCOPE_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md"


def _tree_framing_mutant(root):
    """The syzygy-2g0d package's proposed bytes, pinned to the current
    (tree-framing) spec.md: R6 reads zero and nothing else fails. None, said
    aloud, when the package refuses because a later policy act superseded the
    act it re-pins from; any other refusal still fails the selftest."""
    try:
        package = _repin_package(root, "build_pwb_behavior_contract_repin_tree_framing")
    except ValueError as error:
        if not (Path(root) / POLICY_SCOPE_ACT).is_file():
            raise
        print("note: pins-after-tree-framing-repin-acts not run: the package does "
              f"not build over this tree ({error}); {POLICY_SCOPE_ACT} superseded "
              "the policy act it re-pins from, so it must be re-derived first")
        return None
    return ("pins-after-tree-framing-repin-acts",
            (REGISTRY, POLICY, FAMILY_SPECS["PWB"]), package, "R6=0")


def mutants(root):
    cap1, poc, base, und, pwb = CHILDREN
    union_act = und["successors"][0]
    tree_act = pwb["successors"][0]
    poc_spec = FAMILY_SPECS["POC"]
    pwb_spec = FAMILY_SPECS["PWB"]
    return (
        ("stale-act-phrase", cap1["record"], _first_hex_flip(cap1["label"]),
         "R1"),
        ("stale-act-aggregate", AGGREGATE, _first_hex_flip(und["label"]), "R1"),
        # Record and aggregate flipped together: only the manifest-digest
        # comparison can see it.
        ("stale-act-consistent", (poc["record"], AGGREGATE),
         _first_hex_flip(poc["label"]), "R1"),
        ("stale-manifest-row", base["manifest"],
         lambda t: t.replace(ROW.search(t).group(1),
                             "0" * 64, 1), "R1"),
        ("stale-subject-digest", f"{CHANGES}/{POC_CHANGE}/proposal.md",
         lambda t: t + "\n", "R2"),
        ("stale-versioned-subject", f"{CHANGES}/{PWB_CHANGE}/design.md",
         lambda t: t.replace(" ", "  ", 1), "R2"),
        ("missing-child-pwb", pwb["record"], None, "R1"),
        ("missing-child-understanding", und["record"], None, "R1"),
        ("versioned-tag-line", pwb["record"],
         _replace("Tag: pwb-readability-successor-v1.0",
                  "Tag: pwb-readability-successor-v0.9"), "R1"),
        ("versioned-aggregate-block", AGGREGATE,
         _replace("<!-- versioned-signoff:pwb-readability-successor:v1.0 -->",
                  "<!-- versioned-signoff:pwb-readability-successor:v1.1 -->"),
         "R1"),
        ("scenario-removed", poc_spec,
         _replace("#### Scenario: ", "#### Scenery: "), "R3"),
        ("duplicate-id", pwb_spec,
         _replace("### Requirement: PWB-REQ-002 — ",
                  "### Requirement: PWB-REQ-001 — "), "R3"),
        # Seen by one method and not the other: an em dash lost from a
        # heading, and a MODIFIED name that no longer matches its base.
        ("method-split-heading", poc_spec,
         _replace("### Requirement: POC-REQ-010 — ",
                  "### Requirement: POC-REQ-010 - "), "R3"),
        ("polaris-renamed-modified", POLARIS_OVERLAY_SPEC,
         _replace("### Requirement: Understandable reading depths\n",
                  "### Requirement: Understandable reading depth\n"), "R3"),
        ("polaris-dangling-modified", POLARIS_OVERLAY_SPEC,
         _replace("ID: REQ-polaris-generation-002\n",
                  "ID: REQ-polaris-generation-099\n"), "R3"),
        ("census-drift", CENSUS, _replace('"scenarios": [\n',
                                          '"scenarios": [\n        "x",\n'),
         "R3"),
        ("deps-source-digest", f"{CHANGES}/{POC_CHANGE}/GOVERNING-DEPENDENCIES.md",
         lambda t: re.sub(r"sha256 `[0-9a-f]", "sha256 `f", t, 1)
         if "sha256 `f" not in t else re.sub(r"sha256 `f", "sha256 `0", t, 1),
         "R4"),
        ("dangling-coverage-id",
         f"{CHANGES}/{CAP1_CHANGE}/CAPABILITY-COVERAGE.md",
         lambda t: t + "\nCAP1-REQ-099\n", "R4"),
        ("dangling-continuation-id", "AGENTS.md",
         lambda t: t + "\nPWB-REQ-005/009\n", "R4"),
        ("route-row-record", OPENSPEC_README,
         _replace("PWB-READABILITY-SUCCESSOR-SIGNOFF-v1.0.md",
                  "PWB-READABILITY-SUCCESSOR-ACT.md", -1), "R5"),
        # Report-only predicates: the mutant must change what they report.
        # Once the pin is current (after the syzygy-jloi acts) the mutant
        # moves it off the current digest instead, so it still changes R6.
        ("pin-made-current", POLICY, _pin_moved(root), "R6~"),
        # The syzygy-jloi package's proposed bytes, as its recorder applies
        # them at the act: R6 must then report exactly zero. After the acts
        # the tree already carries those bytes and R6 must read zero there.
        # spec.md is replayed at the pinned row (later signed patches
        # reversed); once a later sign-off moved it, R2-R4 fail by design.
        ("pins-after-repin-acts", (REGISTRY, POLICY, FAMILY_SPECS["PWB"]),
         _repin_package(root), "R6=0|R2,R3,R4"),
        *filter(None, [_tree_framing_mutant(root)]),
        # The syzygy-c51h successor package's proposed union, as
        # readability_successor.py installs it at the act: R7 must then
        # report exactly zero. Before the re-derivation R2 failed by design
        # over the readability act's superseded row ("R7=0|R2"); with the act
        # named as the understanding child's successor nothing else fails.
        ("union-after-successor-act",
         f"{CHANGES}/{UNDERSTANDING_CHANGE}/GOVERNING-DEPENDENCIES.md",
         _union_successor(root), "R7=0"),
        # The understanding child's later successor (re-derived 2026-10-02).
        ("missing-successor-record", union_act["record"], None, "R1"),
        ("stale-successor-aggregate", AGGREGATE,
         _first_hex_flip(union_act["label"]), "R1"),
        ("successor-broken-chain", union_act["record"],
         _chain_predecessor_moved, "R2"),
        ("successor-instant-order", union_act["record"],
         lambda t: re.sub(r"^Act instant: \S+$",
                          "Act instant: 2026-09-01T00:00:00Z", t, 1, re.M), "R2"),
        ("route-successor-record", OPENSPEC_README,
         _replace(Path(union_act["record"]).name, "DEPENDENCY-UNION-ACT.md", -1),
         "R5"),
        # The PWB child's later version-tagged successor (re-derived
        # 2026-10-03): its record, aggregate block, order and patches.
        ("missing-versioned-successor", tree_act["record"], None, "R1"),
        ("versioned-successor-tag", tree_act["record"],
         _replace("Tag: pwb-tree-framing-amendment-v1.0",
                  "Tag: pwb-tree-framing-amendment-v0.9"), "R1"),
        ("versioned-successor-aggregate", AGGREGATE,
         _replace(versioned_marker(tree_act),
                  versioned_marker(dict(tree_act, version="1.1"))), "R1"),
        ("versioned-successor-order", AGGREGATE,
         _block_moved_before(versioned_marker(tree_act),
                             versioned_marker(pwb)), "R2"),
        ("versioned-successor-date", tree_act["record"],
         _replace("Date: 2026-10-03", "Date: 2026-09-01"), "R2"),
        # The tree still hashes to every row: only the chain sees these.
        ("versioned-successor-reversal", f"{tree_act['proposed']}/spec.md.patch",
         _removed_line_altered, "R2"),
        ("versioned-successor-patch-missing",
         f"{tree_act['proposed']}/design.md.patch", None, "R2"),
        ("versioned-successor-foreign-patch",
         f"{tree_act['proposed']}/proposal.md.patch",
         _replace(f"+++ b/{CHANGES}/{PWB_CHANGE}/proposal.md",
                  f"+++ b/{CHANGES}/{PWB_CHANGE}/proposal-x.md"), "R2"),
        ("route-versioned-successor", OPENSPEC_README,
         _replace(Path(tree_act["record"]).name, "PWB-TREE-FRAMING-ACT.md", -1),
         "R5"),
        ("union-extra-decision",
         f"{CHANGES}/{UNDERSTANDING_CHANGE}/GOVERNING-DEPENDENCIES.md",
         _replace("## decisions\n\nSDR-3\n", "## decisions\n\nSDR-3, SDR-99\n"),
         "R7~"),
        ("status-figure", STATUS, _status_figure_moved, "R5"),
    )


def declared_source_mutants():
    row_start = f"| {DECLARED_SOURCE_ROW} |"

    def reason(value):
        def edit(text):
            lines = text.splitlines()
            for index, line in enumerate(lines):
                if line.startswith(row_start):
                    cells = line.split("|")
                    cells[5] = value
                    lines[index] = "|".join(cells)
            return "\n".join(lines) + "\n"
        return edit

    return [
        ("declared-why-missing", AGENT_ADOPTIONS, reason(""), "R1"),
        ("declared-why-whitespace", AGENT_ADOPTIONS, reason("   "), "R1"),
        ("declared-revert-mainline-missing", AGENT_ADOPTIONS,
         _replace(f"git revert -m 1 {DECLARED_SOURCE_COMMIT}",
                  f"git revert {DECLARED_SOURCE_COMMIT}"), "R1"),
        ("declared-revert-mainline-wrong", AGENT_ADOPTIONS,
         _replace(f"git revert -m 1 {DECLARED_SOURCE_COMMIT}",
                  f"git revert -m 2 {DECLARED_SOURCE_COMMIT}"), "R1"),
        ("declared-row-missing", AGENT_ADOPTIONS,
         lambda text: "\n".join(line for line in text.splitlines()
                               if not line.startswith(row_start)) + "\n", "R1"),
        ("declared-row-duplicate", AGENT_ADOPTIONS,
         lambda text: text + next(line for line in text.splitlines()
                                  if line.startswith(row_start)) + "\n", "R1"),
        ("declared-row-shape", AGENT_ADOPTIONS,
         _replace(f"| `{DECLARED_SOURCE_TAG}` |", "|"), "R1"),
        ("declared-commit-mismatch", AGENT_ADOPTIONS,
         _replace(f"`{DECLARED_SOURCE_COMMIT}`", "`" + "0" * 40 + "`"), "R1"),
        ("declared-tag-mismatch", AGENT_ADOPTIONS,
         _replace(DECLARED_SOURCE_TAG, "polaris-dossier-declared-source-model-v9.9"), "R1"),
        ("declared-revert-mismatch", AGENT_ADOPTIONS,
         _replace(f"git revert -m 1 {DECLARED_SOURCE_COMMIT}", "git revert -m 1 " + "0" * 40), "R1"),
        ("declared-scope-missing", AGENT_ADOPTIONS,
         _replace(f"/blob/{DECLARED_SOURCE_COMMIT}/.syzygy/governance/decisions/DOSSIER-DECLARED-SOURCE-CONTRACT-APPLICABILITY.md)",
                  "/blob/unrecorded/applicability.md)"), "R1"),
        ("declared-spec-reference-missing", AGENT_ADOPTIONS,
         _replace(f"/blob/{DECLARED_SOURCE_COMMIT}/{DECLARED_SOURCE_SPEC})",
                  "/blob/unrecorded/spec.md)"), "R1"),
        ("declared-policy-reference-missing", AGENT_ADOPTIONS,
         _replace(f"/blob/{DECLARED_SOURCE_COMMIT}/.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json)",
                  "/blob/unrecorded/policy.json)"), "R1"),
        ("declared-d10-invalid", f"{DECISIONS}/GOVERNANCE-SIMPLIFICATION-D10-ACT.md",
         lambda text: text + "changed\n", "R1"),
        ("declared-spec-changed", DECLARED_SOURCE_SPEC,
         lambda text: text + "changed\n", "R2"),
        ("declared-policy-changed", ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json",
         lambda text: text + "\n", "R2"),
        ("declared-applicability-changed", f"{DECISIONS}/DOSSIER-DECLARED-SOURCE-CONTRACT-APPLICABILITY.md",
         lambda text: text + "changed\n", "R2"),
        ("declared-union-changed", DECLARED_SOURCE_UNION,
         _replace('"SEC-5"', '"SEC-99"'), "R4"),
    ]


def poc_as_d10_found(tree):
    """Put the POC change back as D10 found it, in a fixture that removes D10.

    A tree without D10 cannot carry an agent amendment of the POC
    specification (the pre-D10 acts pin it), so a control that removes the D10
    act from a tree whose POC change was amended under D10 starts from the
    bytes D10 found. Without such an amendment this writes nothing.
    """
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import d10_supersession
    found = d10_supersession.amendment(tree)
    if found is None or found[1]:
        return
    files = found[0]
    change = tree / d10_supersession.POC_CHANGE
    current = d10_supersession.disk_files(tree, d10_supersession.POC_CHANGE) or {}
    if current == files:
        return
    shutil.rmtree(change)
    for rel, body in files.items():
        (tree / rel).parent.mkdir(parents=True, exist_ok=True)
        (tree / rel).write_bytes(body)


def declared_source_historical_cases(tmp, base, clean, witnesses, failures):
    """Absent historical amendment is inactive; each partial presence refuses."""
    tree = Path(tmp) / "declared-historical"
    shutil.copytree(base, tree)
    change = f"{CHANGES}/{DECLARED_SOURCE_CHANGE}"
    act = f"{DECISIONS}/GOVERNANCE-SIMPLIFICATION-D10-ACT.md"
    poc_as_d10_found(tree)
    shutil.rmtree(tree / change)
    for rel in (*DECLARED_SOURCE_SUBJECTS, act):
        (tree / rel).unlink(missing_ok=True)
    ledger = tree / AGENT_ADOPTIONS
    original = ledger.read_text()
    row = next(line for line in original.splitlines()
               if line.startswith(f"| {DECLARED_SOURCE_ROW} |"))
    had_url_source = any(is_url_source_row(line) for line in original.splitlines())
    had_figure = any(is_figure_row(line) for line in original.splitlines())
    had_derived = any(is_derived_row(line) for line in original.splitlines())
    had_ledger = any(is_ledger_row(line) for line in original.splitlines())
    had_kinds = any(is_kinds_row(line) for line in original.splitlines())
    had_reach = any(is_reach_row(line) for line in original.splitlines())
    had_manifests = any(is_manifests_row(line) for line in original.splitlines())
    had_repairs = any(is_repairs_row(line) for line in original.splitlines())
    had_maps = any(is_maps_row(line) for line in original.splitlines())
    had_bounds = any(is_bounds_row(line) for line in original.splitlines())
    had_corr = any(is_corr_row(line) for line in original.splitlines())
    had_coverage = any(is_coverage_row(line) for line in original.splitlines())
    had_infra = any(is_infra_row(line) for line in original.splitlines())
    had_findpages = any(is_findpages_row(line) for line in original.splitlines())
    had_subsec = any(is_subsec_row(line) for line in original.splitlines())
    had_reltype = any(is_reltype_row(line) for line in original.splitlines())
    had_hero = any(is_hero_row(line) for line in original.splitlines())
    had_readers = any(is_readers_row(line) for line in original.splitlines())
    had_cont = any(is_cont_row(line) for line in original.splitlines())
    had_model = any(is_model_row(line) for line in original.splitlines())
    had_worth = any(is_worth_row(line) for line in original.splitlines())
    had_readmit = any(is_readmit_row(line) for line in original.splitlines())
    had_raw_read = any(is_raw_read_row(line) for line in original.splitlines())
    had_treeread = any(is_treeread_row(line) for line in original.splitlines())
    had_verify = any(is_verify_row(line) for line in original.splitlines())
    had_qfile = any(is_qfile_row(line) for line in original.splitlines())
    had_covhold = any(is_covhold_row(line) for line in original.splitlines())
    had_scripted_grade = any(is_scripted_grade_row(line) for line in original.splitlines())
    had_term_brief = any(is_term_brief_row(line) for line in original.splitlines())
    step_rows = step_measures_rows(tree)
    step_retired = step_measures_disposition(tree, step_rows)
    step_records = 2 if step_retired else int(bool(step_rows))
    step_subjects = STEP_MEASURES_BOUND_PARTS if step_rows and not step_retired else 0
    qkind_rows_now = qkind_rows(tree)
    qkind_retired = qkind_disposition(tree, qkind_rows_now)
    qkind_records = 2 if qkind_retired else int(bool(qkind_rows_now))
    qkind_subjects = QKIND_BOUND_PARTS if qkind_rows_now and not qkind_retired else 0
    figplan_rows_now = figplan_rows(tree)
    figplan_retired = figplan_disposition(tree, figplan_rows_now)
    figplan_records = 2 if figplan_retired else int(bool(figplan_rows_now))
    figplan_subjects = FIGPLAN_BOUND_PARTS if figplan_rows_now and not figplan_retired else 0
    choice_rows_now = choice_rows(tree)
    choice_retired = choice_disposition(tree, choice_rows_now)
    choice_records = 2 if choice_retired else int(bool(choice_rows_now))
    choice_subjects = CHOICE_BOUND_PARTS if choice_rows_now and not choice_retired else 0
    migpar_rows_now = migpar_rows(tree)
    migpar_retired = migpar_disposition(tree, migpar_rows_now)
    migpar_records = 2 if migpar_retired else int(bool(migpar_rows_now))
    migpar_subjects = MIGPAR_BOUND_PARTS if migpar_rows_now and not migpar_retired else 0
    impfacts_rows_now = impfacts_rows(tree)
    impfacts_retired = impfacts_disposition(tree, impfacts_rows_now)
    impfacts_records = 2 if impfacts_retired else int(bool(impfacts_rows_now))
    impfacts_subjects = IMPFACTS_BOUND_PARTS if impfacts_rows_now and not impfacts_retired else 0
    walk_rows_now = walk_rows(tree)
    walk_retired = walk_disposition(tree, walk_rows_now)
    walk_records = 2 if walk_retired else int(bool(walk_rows_now))
    walk_subjects = WALK_BOUND_PARTS if walk_rows_now and not walk_retired else 0
    tnames_rows_now = tnames_rows(tree)
    tnames_retired = tnames_disposition(tree, tnames_rows_now)
    tnames_records = 2 if tnames_retired else int(bool(tnames_rows_now))
    tnames_subjects = TNAMES_BOUND_PARTS if tnames_rows_now and not tnames_retired else 0
    migbound_rows_now = migbound_rows(tree)
    migbound_retired = migbound_disposition(tree, migbound_rows_now)
    migbound_records = 2 if migbound_retired else int(bool(migbound_rows_now))
    migbound_subjects = MIGBOUND_BOUND_PARTS if migbound_rows_now and not migbound_retired else 0
    rough_rows_now = rough_rows(tree)
    rough_retired = rough_disposition(tree, rough_rows_now)
    rough_records = 2 if rough_retired else int(bool(rough_rows_now))
    rough_subjects = ROUGH_BOUND_PARTS if rough_rows_now and not rough_retired else 0
    vbase_rows_now = vbase_rows(tree)
    vbase_retired = vbase_disposition(tree, vbase_rows_now)
    vbase_records = 2 if vbase_retired else int(bool(vbase_rows_now))
    vbase_subjects = VBASE_BOUND_PARTS if vbase_rows_now and not vbase_retired else 0
    edit_rows = edit_account_rows(tree)
    edit_retired = edit_account_disposition(tree, edit_rows)
    edit_records = 2 if edit_retired else int(bool(edit_rows))
    edit_subjects = len(EDIT_ACCOUNT_SUBJECTS) if edit_rows and not edit_retired else 0
    absent_ledger = "".join(line for line in original.splitlines(keepends=True)
                            if line.rstrip("\n") != row and not is_url_source_row(line)
                            and not is_figure_row(line) and not is_derived_row(line)
                            and not is_ledger_row(line) and not is_kinds_row(line)
                            and not is_reach_row(line) and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line)
                            and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_readmit_row(line) and not is_raw_read_row(line) and not is_treeread_row(line)
                      and not is_verify_row(line) and not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line) and not is_covhold_row(line) and not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line)
                      and not is_edit_account_row(line))
    ledger.write_text(absent_ledger)
    report = Report()
    scoped_check_outcomes(tree, report)

    def examined(result, rid):
        return next(int(match.group(1)) for line in result.lines
                    if (match := re.match(rf"OK +{rid}  .* — (\d+) examined", line)))

    held = (declared_source_absent(tree)
            and declared_source_binding(tree) == (None, [], [])
            and not report.failed
            and examined(report, "R1") == examined(clean, "R1") - 1 - had_url_source - had_figure - had_derived - had_ledger - had_kinds - had_manifests
            - had_reach - had_repairs - had_maps - had_bounds - had_corr - had_coverage - had_readmit - had_infra - had_findpages - had_subsec - had_reltype - had_hero - had_readers - had_cont - had_model - had_worth - had_raw_read - had_treeread - had_verify - had_qfile - had_scripted_grade - had_covhold - had_term_brief - edit_records - step_records - qkind_records - figplan_records - vbase_records - choice_records - migpar_records - impfacts_records - walk_records - tnames_records - migbound_records - rough_records
            and examined(report, "R2") == examined(clean, "R2") - 3 - edit_subjects - step_subjects - qkind_subjects - figplan_subjects - vbase_subjects - choice_subjects - migpar_subjects - impfacts_subjects - walk_subjects - tnames_subjects - migbound_subjects - rough_subjects
            - (URL_SOURCE_BOUND_PARTS if had_url_source else 0)
            - (FIGURE_BOUND_PARTS if had_figure else 0)
            - (DERIVED_BOUND_PARTS if had_derived else 0)
            - (LEDGER_BOUND_PARTS if had_ledger else 0)
            - (KINDS_BOUND_PARTS if had_kinds else 0)
            - (REACH_BOUND_PARTS if had_reach else 0)
            - (MANIFESTS_BOUND_PARTS if had_manifests else 0)
            - (REPAIRS_BOUND_PARTS if had_repairs else 0)
            - (MAPS_BOUND_PARTS if had_maps else 0)
            - (BOUNDS_BOUND_PARTS if had_bounds else 0)
            - (CORR_BOUND_PARTS if had_corr else 0)
            - (COVERAGE_BOUND_PARTS if had_coverage else 0)
            - (READMIT_BOUND_PARTS if had_readmit else 0)
            - (INFRA_BOUND_PARTS if had_infra else 0)
            - (FINDPAGES_BOUND_PARTS if had_findpages else 0)
            - (SUBSEC_BOUND_PARTS if had_subsec else 0)
            - (RELTYPE_BOUND_PARTS if had_reltype else 0)
            - (HERO_BOUND_PARTS if had_hero else 0)
            - (READERS_BOUND_PARTS if had_readers else 0)
            - (CONT_BOUND_PARTS if had_cont else 0)
            - (MODEL_BOUND_PARTS if had_model else 0)
            - (WORTH_BOUND_PARTS if had_worth else 0)
            - (len(RAW_READ_SUBJECTS) if had_raw_read else 0)
            - (len(TREEREAD_SUBJECTS) if had_treeread else 0)
            - (VERIFY_BOUND_PARTS if had_verify else 0)
            - (QFILE_BOUND_PARTS if had_qfile else 0)
            - (SCRIPTED_GRADE_BOUND_PARTS if had_scripted_grade else 0)
            - (COVHOLD_BOUND_PARTS if had_covhold else 0)
            - (len(TERM_BRIEF_SUBJECTS) if had_term_brief else 0))
    witnesses.append({"mutant": "declared-historical-control", "path": change,
                      "old": "<no amendment, row, subjects or D10 act>",
                      "new": "<unchanged>", "expected": "inactive; no phantom R1/R2 subjects",
                      "failed": sorted(report.failed), "outcome": "held" if held else "FAILED"})
    if not held:
        failures.append("declared-historical-control: wholly absent amendment must be inactive")
    marker = "Synthetic invalid presence fixture; grants no authority.\n"
    signals = [("directory", change, None), ("row", AGENT_ADOPTIONS, row + "\n"),
               ("act", act, marker)]
    signals += [(f"subject-{index}", rel, marker)
                for index, rel in enumerate(DECLARED_SOURCE_SUBJECTS, 1)]
    for name, rel, body in signals:
        target = tree / rel
        if body is None:
            target.mkdir(parents=True)
        elif rel == AGENT_ADOPTIONS:
            target.write_text(absent_ledger + body)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(body)
        text, records, subjects = declared_source_binding(tree)
        caught = not declared_source_absent(tree) and text is None and bool(records or subjects)
        witnesses.append({"mutant": f"declared-historical-partial-{name}", "path": rel,
                          "old": "<absent>" if rel != AGENT_ADOPTIONS else absent_ledger,
                          "new": "<empty directory>" if body is None else body,
                          "source_sha256": None if body is None else sha(body.encode("utf-8")),
                          "expected": "R1/R2 refusal; no amendment",
                          "failed": records + subjects, "outcome": "killed" if caught else "SURVIVED"})
        if not caught:
            failures.append(f"declared-historical-partial-{name}: partial presence must refuse")
        if rel == AGENT_ADOPTIONS:
            target.write_text(absent_ledger)
        elif body is None:
            target.rmdir()
        else:
            target.unlink()
            # A restored spec creates the change directory, itself a presence signal.
            if rel.startswith(change + "/"):
                shutil.rmtree(tree / change)
    for name, rel in (("directory", change), ("act", act),
                      ("policy", ".syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json")):
        target = tree / rel
        missing = "__missing_declared_source_fixture__"
        target.symlink_to(missing)
        text, records, subjects = declared_source_binding(tree)
        caught = not declared_source_absent(tree) and text is None and bool(records or subjects)
        witnesses.append({"mutant": f"declared-historical-dangling-{name}", "path": rel,
                          "old": "<absent>", "new": f"<symlink to {missing}>",
                          "expected": "R1/R2 refusal; dangling entry is present",
                          "failed": records + subjects, "outcome": "killed" if caught else "SURVIVED"})
        if not caught:
            failures.append(f"declared-historical-dangling-{name}: dangling entry must refuse")
        target.unlink()


def declared_source_composition_cases(witnesses, failures):
    """Exercise both structural guards directly, apart from byte-binding refusal."""
    additions = [(change, read_text(ROOT, rel) or "")
                 for change, rel in polaris_additions(ROOT)]
    base = read_text(ROOT, POLARIS_BASE_SPEC) or ""
    overlay = read_text(ROOT, POLARIS_OVERLAY_SPEC) or ""
    before_a, pa = compose_polaris_by_id(base, overlay, *additions)
    before_b, pb = compose_polaris_by_name(base, overlay, *additions)
    original = read_text(ROOT, DECLARED_SOURCE_SPEC) or ""
    a, aa = compose_declared_source_by_id(before_a, original)
    b, bb = compose_declared_source_by_name(before_b, original)
    expected = {"033": 5, "034": 28, "035": 17, "036": 6, "046": 3}
    control = (not (pa or pb or aa or bb) and before_a == before_b and a == b
               and set(a) == set(before_a)
               and all(len(a[POLARIS_ID + suffix]["scenarios"]) == count
                       for suffix, count in expected.items())
               and a[POLARIS_ID + "046"]["name"] == "Declared local-source admission"
               and all(a[ident] == row for ident, row in before_a.items()
                       if ident[-3:] not in expected))
    witnesses.append({"mutant": "declared-composition-control", "path": DECLARED_SOURCE_SPEC,
                      "old": "", "new": "", "expected": "both independent compositions agree; exact replacements and untouched remainder",
                      "failed": [], "outcome": "held" if control else "SURVIVED"})
    if not control:
        failures.append("declared-composition-control")
    cases = [
        ("added-section", "## MODIFIED Requirements", "## ADDED Requirements"),
        ("extra-id", "ID: REQ-polaris-generation-033", "ID: REQ-polaris-generation-099"),
        ("duplicate-id", "ID: REQ-polaris-generation-034", "ID: REQ-polaris-generation-033"),
        ("missing-id", "ID: REQ-polaris-generation-034", ""),
        ("noncanonical-header", "### Requirement: Operator-agent authoring mode",
         "### requirement: Operator-agent authoring mode"),
        ("unexpected-rename", "Declared local-source admission", "Unexpected admission"),
        ("hidden-delta", "## MODIFIED Requirements", "## MODIFIED Requirements\n\n### REMOVED Requirements"),
        ("duplicate-section", "## MODIFIED Requirements", "## MODIFIED Requirements\n\n## MODIFIED Requirements"),
        ("bom", "## MODIFIED Requirements", "\ufeff## MODIFIED Requirements"),
        ("crlf", "\n", "\r\n"),
        ("fenced-header", "### Requirement: Operator-agent authoring mode",
         "```\n### Requirement: Operator-agent authoring mode\n```"),
    ]
    for name, old, new in cases:
        if old not in original:
            raise AssertionError(f"declared-source mutation target absent: {name}")
        mutant = original.replace(old, new, 1)
        a, pa = compose_declared_source_by_id(before_a, mutant)
        b, pb = compose_declared_source_by_name(before_b, mutant)
        caught = bool(pa and pb and a == b == before_a)
        witnesses.append({"mutant": "declared-compose-" + name,
                          "path": DECLARED_SOURCE_SPEC, "old": old, "new": new,
                          "expected": "COMPOSE-A/B refuse without partial application", "failed": [],
                          "outcome": "killed" if caught else "SURVIVED"})
        if not caught:
            failures.append("declared-compose-" + name)


def url_source_cases(tmp, base, witnesses, failures):
    """Check the pending-to-adopted transition and the independent overlay guards."""
    original = read_text(base, URL_SOURCE_SPEC)
    if original is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "url-source"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_url_source_row(line) and not is_raw_read_row(line)
                      and not is_treeread_row(line)
                      and not is_verify_row(line) and not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line) and not is_covhold_row(line) and not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    held = (url_source_binding(tree) == (None, [], []) and not pending_findings
            and URL_SOURCE_ADDS not in predecessor)
    record("url-source-pending", AGENT_ADOPTIONS, "<no v2.1 row>", "<unchanged>",
           "landed artifacts alone keep v2.1 pending", pending_findings, held, True)

    oid = "1234567890abcdef" * 2 + "12345678"
    links = ", ".join(f"[subject](https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel})"
                      for rel in URL_SOURCE_SUBJECTS)
    row = (f"| A-999 | 2026-11-21 | `{oid}` | {links} | Selftest | "
           f"`git revert -m 1 {oid}` | `{URL_SOURCE_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    expected_counts = {"025": 14, "033": 6, "035": 37, "047": 24, "048": 27}
    held = (url_source_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor) | {URL_SOURCE_ADDS}
            and all(len(current[POLARIS_ID + suffix]["scenarios"]) == count
                    for suffix, count in expected_counts.items())
            and all(current[ident] == requirement for ident, requirement in predecessor.items()
                    if ident not in URL_SOURCE_REPLACES))
    record("url-source-adopted", AGENT_ADOPTIONS, "<no v2.1 row>", row,
           "v2.1 applies exactly the reviewed replacement and addition", current_findings, held, True)

    ledger_cases = [
        ("duplicate-row", row, row + row),
        ("wrong-tag", URL_SOURCE_TAG, URL_SOURCE_TAG + "-wrong"),
        ("wrong-revert", "git revert -m 1", "git revert -m 2"),
    ]
    ledger_cases += [(f"missing-link-{i}", f"/blob/{oid}/{rel})", f"/blob/other/{rel})")
                     for i, rel in enumerate(URL_SOURCE_SUBJECTS, 1)]
    for name, old, new in ledger_cases:
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = url_source_binding(tree)
        record(f"url-source-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)
    policy = next(rel for rel in URL_SOURCE_SUBJECTS if "/policies/" in rel)
    disposition_cases = (
        ("veto-exact-row", "Owner veto of A-999", "Test only", False, True),
        ("revert-exact-commit", f"Revert the adoption `{oid}`", "Test only", False, True),
        ("retire-exact-spec", f"Retire `{URL_SOURCE_SPEC}`", "Test only", False, True),
        ("retire-exact-link", f"Retirement of [policy](https://github.com/tzeusy-org/syzygy/blob/{oid}/{policy})",
         "Test only", False, True),
        ("external-link-label", "Revert [A-999](https://example.org/unrelated)", "Test only", False, False),
        ("wrong-snapshot-oid", f"Retire [policy](https://github.com/tzeusy-org/syzygy/blob/{'c' * 40}/{policy})",
         "Test only", False, False),
        ("unrelated-target", "Revert A-123 after consulting A-999", "Test only", False, False),
        ("row-prefix", "Veto A-9999", "Test only", False, False),
        ("why-only", "Update an index", "Veto A-999 was discussed", False, False),
        ("earlier-record", "Veto A-999", "Test only", True, False),
        ("historical-mention", "Document the veto of A-999", "Test only", False, False),
        ("citation-only", (f"Index [v2.1 spec](https://github.com/tzeusy-org/syzygy/blob/"
                           f"{oid}/{URL_SOURCE_SPEC}) and `{URL_SOURCE_TAG}`"),
         "Make the reference easier to find", False, False),
    )
    for name, change, why, before, withdrawn in disposition_cases:
        reversal = (f"| A-1000 | 2026-11-22 | `8a468bc` | {change} | "
                    f"{why} | `git revert 8a468bc` | — |\n")
        ledger.write_text(pending + (reversal + row if before else row + reversal))
        selected = url_source_disposition(tree, url_source_rows(tree))
        pop, found = census(tree)
        expected = predecessor if withdrawn else current
        held = (not found and pop["POLARIS"] == expected
                and selected == ("A-1000" if withdrawn else None))
        record(f"url-source-{name}", AGENT_ADOPTIONS, row, reversal,
               "restore the predecessor" if withdrawn else "preserve current adoption",
               found, held, True)
    valid_reversal = ("| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | "
                      "`git revert 8a468bc` | — |\n")
    for name, old, bad in (("malformed-veto-date", "2026-11-22", "2026-99-99"),
                           ("malformed-veto-revert", "git revert 8a468bc", "git revert 8a468bd"),
                           ("earlier-effective-date", "2026-11-22", "2026-10-22"),
                           ("duplicate-authority-id", "A-1000", "A-999"),
                           ("same-commit-abbreviation", "8a468bc", oid[:9])):
        invalid = valid_reversal.replace(old, bad)
        ledger.write_text(pending + row + invalid)
        pop, found = census(tree)
        held = (not found and pop["POLARIS"] == current
                and url_source_disposition(tree, url_source_rows(tree)) is None)
        record(f"url-source-{name}", AGENT_ADOPTIONS, old, bad, "preserve current adoption",
               found, held, True)
    malformed_original = row.replace("2026-11-21", "2026-99-99", 1)
    ledger.write_text(pending + malformed_original + valid_reversal)
    effective, findings, subjects = url_source_binding(tree)
    record("url-source-veto-cannot-hide-invalid-adoption", AGENT_ADOPTIONS, row, malformed_original,
           "report invalid adoption instead of substituting a subsequent disposition",
           findings + subjects, effective is None and bool(findings) and not subjects, False)
    base_veto = ("| A-1000 | 2026-11-22 | `8a468bc` | Veto A-4 | Test only | "
                 "`git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + base_veto)
    pop, found = census(tree)
    scoped = pop["POLARIS"]
    held = (declared_source_disposition(tree) == "A-1000"
            and declared_source_binding(tree) == (None, [], [])
            and URL_SOURCE_ADDS not in scoped
            and scoped[POLARIS_ID + "046"]["name"] == DECLARED_SOURCE_OLD_NAME
            and any("prior v2.0 declared-source adoption is unavailable" in issue for issue in found))
    record("url-source-predecessor-veto", AGENT_ADOPTIONS, row, base_veto,
           "restore pre-A-4 composition and report blocked v2.1 authority",
           found, held, True)

    def fenced_table(rows):
        return f"\n```md\n{ADOPTION_TABLE_HEADER}\n{ADOPTION_TABLE_DIVIDER}\n{rows}```\n"

    url_veto = base_veto.replace("Veto A-4", "Veto A-999")
    ledger.write_text(pending + row + url_veto)
    route_pop, _ = census(tree)
    prior_status = read_text(tree, STATUS)
    prior_readme = read_text(tree, OPENSPEC_README)
    assert prior_status is not None and prior_readme is not None
    figure = (f"{len(predecessor)} requirements and "
              f"{sum(len(requirement['scenarios']) for requirement in predecessor.values())} scenarios in the effective composition")
    (tree / STATUS).write_text(STATUS_FIGURE.sub(figure, prior_status))
    stale = Report()
    check_routes(tree, route_pop, stale)
    stale_routes = [line for line in stale.lines if "does not disclose inactive URL declared-source v2.1" in line]
    old_figure = STATUS_FIGURE.search(prior_status)
    assert old_figure is not None
    record("url-source-inactive-stale-routes", STATUS, old_figure.group(0), figure,
           "R5 requires both routes to disclose the effective predecessor and veto",
           stale_routes, len(stale_routes) == 2, False)

    ledger.write_text(pending)
    unrecorded = Report()
    check_routes(tree, pending_pop, unrecorded)
    unrecorded_routes = [line for line in unrecorded.lines if "does not disclose inactive URL declared-source v2.1" in line]
    record("url-source-pending-stale-routes", AGENT_ADOPTIONS, row, "",
           "R5 refuses active routes while the adoption row is missing",
           unrecorded_routes, len(unrecorded_routes) == 2, False)
    ledger.write_text(pending + row + url_veto)

    def write_routes(disclosure, hide_status=False):
        shown = f"    {URL_STATUS_PREFIX}. {disclosure} [Agent adoptions]({AGENT_ADOPTIONS})"
        replacement = f"    <!--\n{shown}\n    -->" if hide_status else shown
        status_text = "\n".join(replacement if line.strip().startswith(URL_STATUS_PREFIX) else line
                                for line in prior_status.split("\n"))
        (tree / STATUS).write_text(STATUS_FIGURE.sub(figure, status_text))
        (tree / OPENSPEC_README).write_text("\n".join(
            f"| [`{URL_SOURCE_CHANGE}`](changes/{URL_SOURCE_CHANGE}) | URL scope | {disclosure} | [{Path(AGENT_ADOPTIONS).name}]({AGENT_ADOPTIONS}) |"
            if line.startswith(f"| [`{URL_SOURCE_CHANGE}`]") else line
            for line in prior_readme.split("\n")))

    disclosure = url_inactive_text("A-1000", DECLARED_SOURCE_TAG)
    write_routes(disclosure)
    disclosed = Report()
    check_routes(tree, route_pop, disclosed)
    disclosed_routes = [line for line in disclosed.lines if "does not disclose inactive URL declared-source v2.1" in line]
    record("url-source-inactive-recorded-routes", STATUS, figure, disclosure,
           "R5 accepts both updated routes", disclosed_routes, not disclosed_routes, True)
    write_routes(disclosure, hide_status=True)
    hidden = Report()
    check_routes(tree, route_pop, hidden)
    hidden_routes = [line for line in hidden.lines if "does not disclose inactive URL declared-source v2.1" in line]
    record("url-source-inactive-hidden-status", STATUS, disclosure, f"<!-- {disclosure} -->",
           "R5 refuses inactive status hidden in a comment",
           hidden_routes, len(hidden_routes) == 1 and STATUS in hidden_routes[0], False)
    contradiction = f"URL dossier 2.1 remains adopted. {disclosure}"
    write_routes(contradiction)
    contradictory = Report()
    check_routes(tree, route_pop, contradictory)
    contradiction_findings = [line for line in contradictory.lines if "does not disclose inactive URL declared-source v2.1" in line]
    record("url-source-inactive-contradictory-routes", STATUS, disclosure, contradiction,
           "R5 refuses contradictory status fields", contradiction_findings, len(contradiction_findings) == 2, False)
    (tree / STATUS).write_text(prior_status)
    (tree / OPENSPEC_README).write_text(prior_readme)

    base_row = next(line for line in pending.splitlines(keepends=True)
                    if line.startswith(f"| {DECLARED_SOURCE_ROW} |"))
    base_retirement = base_veto.replace("A-1000", "A-1001")
    for name, outside_table in (("fenced-ledger", fenced_table),
                                ("isolated-rows", lambda rows: "\n" + rows)):
        ledger.write_text(pending + outside_table(row))
        inactive = url_source_binding(tree) == (None, [], [])
        excluded = outside_table(url_veto + base_retirement + base_row)
        ledger.write_text(pending + row + excluded)
        pop, found = census(tree)
        held = (inactive and not found and pop["POLARIS"] == current
                and url_source_disposition(tree, url_source_rows(tree)) is None
                and declared_source_disposition(tree) is None)
        record(f"url-source-{name}", AGENT_ADOPTIONS, row, excluded,
               "ignore adoption and disposition rows outside the canonical table",
               found, held, True)

    html_examples = []
    html_held = True
    for opening, closing in (("<!--", "-->"), ("<pre>", "</pre>")):
        header = f"{ADOPTION_TABLE_HEADER}\n{ADOPTION_TABLE_DIVIDER}\n"
        fake = f"\n{opening}\n{header}{row}{closing}\n"
        ledger.write_text(ADOPTION_LEDGER_TITLE + "\n" + fake)
        inactive = url_source_binding(tree) == (None, [], [])
        excluded = f"\n{opening}\n{header}{url_veto}{base_retirement}{closing}\n"
        ledger.write_text(pending + row + excluded)
        html_held = (html_held and inactive and url_source_binding(tree) == (original, [], [])
                     and declared_source_disposition(tree) is None)
        html_examples.append(fake + excluded)
    record("url-source-raw-html", AGENT_ADOPTIONS, row, "".join(html_examples),
           "ignore apparent ledger tables and disposition rows in raw HTML", [], html_held, True)
    ledger.write_text(pending + row)
    for i, rel in enumerate(URL_SOURCE_SUBJECTS, 1):
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = url_source_binding(tree)
        subject.write_bytes(previous)
        record(f"url-source-subject-{i}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    for rel in URL_SOURCE_RFC_PATHS:
        subject = tree / rel
        previous = subject.read_bytes()
        marker = next(marker for marker in (b"**RFC3-2.", b"**RFC3-16(d).", b"**RFC5-6.")
                      if marker in previous)
        replacement = marker + b" changed"
        subject.write_bytes(previous.replace(marker, replacement, 1))
        effective, r1, r2 = url_source_binding(tree)
        subject.write_bytes(previous)
        record("url-source-contract-" + rel.split("/contracts/")[1], rel,
               marker.decode(), replacement.decode(), "R2 refusal with no effective amendment",
               r1 + r2, effective is None and not r1 and bool(r2), False)

    cases = [
        ("wrong-operation", ADDED_HEADING, DECLARED_SOURCE_MODIFIED),
        ("wrong-modified-id", "ID: " + POLARIS_ID + "025", "ID: " + POLARIS_ID + "026"),
        ("missing-added-id", "ID: " + URL_SOURCE_ADDS, ""),
        ("wrong-predecessor-name", "Requirement: Provenance-bound source policy",
         "Requirement: Renamed source policy"),
        ("new-name-collision", "Requirement: Declared URL dossier supervisor",
         "Requirement: Operator-agent authoring mode"),
        ("foreign-heading", ADDED_HEADING, ADDED_HEADING + "\n\n### REMOVED Requirements"),
        ("noncanonical-header", "### Requirement: Declared URL dossier supervisor",
         "### requirement: Declared URL dossier supervisor"),
        ("leading-bom", DECLARED_SOURCE_MODIFIED, "\ufeff" + DECLARED_SOURCE_MODIFIED),
        ("carriage-return", ADDED_HEADING, ADDED_HEADING + "\r"),
    ]
    for name, old, new in cases:
        assert old in original
        mutant = original.replace(old, new, 1)
        a, ida = compose_url_source_by_id(predecessor, mutant)
        b, names = compose_url_source_by_name(predecessor, mutant)
        record(f"url-compose-{name}", URL_SOURCE_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == predecessor), False)


def figure_cases(tmp, base, witnesses, failures):
    """The v2.2 pending-to-adopted transition, its ledger and byte guards, and both composition guards."""
    original = read_text(base, FIGURE_SPEC)
    if original is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "figure-homes"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_figure_row(line) and not is_derived_row(line)
                      and not is_ledger_row(line) and not is_kinds_row(line)
                      and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line)
                      and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (figure_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 28)
    record("figure-pending", AGENT_ADOPTIONS, "<no v2.2 row>", "<unchanged>",
           "landed package alone keeps v2.2 pending", pending_findings, held, True)

    oid = "fedcba9876543210" * 2 + "fedcba98"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{FIGURE_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{FIGURE_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (figure_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 38
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("figure-adopted", AGENT_ADOPTIONS, "<no v2.2 row>", row,
           "v2.2 replaces exactly 034 (28 to 38 scenarios)", current_findings, held, True)
    ledger.write_text(pending + row.replace(f"`git revert {oid}`", f"`git revert -m 1 {oid}`"))
    record("figure-merge-revert-accepted", AGENT_ADOPTIONS, f"git revert {oid}", f"git revert -m 1 {oid}",
           "a mainline revert of a merge also names the landing", [],
           figure_binding(tree) == (original, [], []), True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", FIGURE_TAG, FIGURE_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-link", f"/blob/{oid}/{FIGURE_SPEC})", f"/blob/other/{FIGURE_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = figure_binding(tree)
        record(f"figure-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (figure_disposition(tree, figure_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("figure-vetoed", AGENT_ADOPTIONS, row, veto, "restore the predecessor 034", found, held, True)
    base_veto = veto.replace("Veto A-999", "Veto A-4")
    ledger.write_text(pending + row + base_veto)
    effective, r1, r2 = figure_binding(tree)
    record("figure-predecessor-veto", AGENT_ADOPTIONS, row, base_veto,
           "R1 refusal while v2.0 is retired", r1 + r2,
           effective is None and any("prior v2.0" in f for f in r1), False)

    ledger.write_text(pending + row)
    subject = tree / FIGURE_SPEC
    previous = subject.read_bytes()
    subject.write_bytes(previous + b"\n")
    effective, r1, r2 = figure_binding(tree)
    subject.write_bytes(previous)
    record("figure-subject-changed", FIGURE_SPEC, "<end of file>", "\n",
           "R2 refusal with no effective amendment", r1 + r2,
           effective is None and not r1 and bool(r2), False)
    union = tree / FIGURE_UNION
    previous = union.read_text()
    union.write_text(previous.replace('"VIS-2"', '"VIS-99"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("figure-union-changed", FIGURE_UNION, '"VIS-2"', '"VIS-99"', "R4 refusal",
           report.findings.get("R4", []), any(FIGURE_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(FIGURE_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("figure-status-route-missing", STATUS, FIGURE_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("figure homes and fit v2.2" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(FIGURE_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("figure-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("missing-id", "ID: " + ident, ""),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and figure homes"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
        ("foreign-heading", DECLARED_SOURCE_MODIFIED, DECLARED_SOURCE_MODIFIED + "\n\n### REMOVED Requirements"),
        ("second-section", DECLARED_SOURCE_MODIFIED, DECLARED_SOURCE_MODIFIED + "\n\n" + ADDED_HEADING),
        ("noncanonical-header", "### Requirement: Agent brief", "### requirement: Agent brief"),
        ("leading-bom", DECLARED_SOURCE_MODIFIED, "\ufeff" + DECLARED_SOURCE_MODIFIED),
        ("carriage-return", DECLARED_SOURCE_MODIFIED, DECLARED_SOURCE_MODIFIED + "\r"),
    ]
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(predecessor, mutant)
        b, names = compose_figure_by_name(predecessor, mutant)
        record(f"figure-compose-{name}", FIGURE_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == predecessor), False)


def derived_cases(tmp, base, witnesses, failures):
    """The v2.3 pending-to-adopted transition over v2.2, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, DERIVED_SPEC)
    if original is None or figure_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "derived-observed"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_derived_row(line) and not is_ledger_row(line)
                      and not is_kinds_row(line)
                      and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line)
                      and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (derived_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 38)
    record("derived-pending", AGENT_ADOPTIONS, "<no v2.3 row>", "<unchanged>",
           "landed package alone keeps v2.3 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{DERIVED_SPEC}) "
           f"· [policy](https://github.com/tzeusy-org/syzygy/blob/{oid}/{DERIVED_POLICY}) "
           f"| Selftest | `git revert {oid}` | `{DERIVED_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (derived_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 49
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("derived-adopted", AGENT_ADOPTIONS, "<no v2.3 row>", row,
           "v2.3 replaces exactly 034 (38 to 49 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", DERIVED_TAG, DERIVED_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{DERIVED_SPEC})", f"/blob/other/{DERIVED_SPEC})"),
                           ("missing-policy-link", f"/blob/{oid}/{DERIVED_POLICY})", f"/blob/other/{DERIVED_POLICY})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = derived_binding(tree)
        record(f"derived-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (derived_disposition(tree, derived_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("derived-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.2 034", found, held, True)
    figure_row = next((line for line in pending.splitlines(keepends=True) if is_figure_row(line)), None)
    if figure_row is not None:
        no_figure = "".join(line for line in pending.splitlines(keepends=True) if not is_figure_row(line))
        ledger.write_text(no_figure + row)
        effective, r1, r2 = derived_binding(tree)
        record("derived-predecessor-missing", AGENT_ADOPTIONS, figure_row, "",
               "R1 refusal while v2.2 is not in force", r1 + r2,
               effective is None and any("prior v2.2" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in DERIVED_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = derived_binding(tree)
        subject.write_bytes(previous)
        record(f"derived-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / DERIVED_UNION
    previous = union.read_text()
    union.write_text(previous.replace('"RFC7-28"', '"RFC7-99"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("derived-union-changed", DERIVED_UNION, '"RFC7-28"', '"RFC7-99"', "R4 refusal",
           report.findings.get("R4", []), any(DERIVED_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(DERIVED_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("derived-status-route-missing", STATUS, DERIVED_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("derived observed facts v2.3" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(DERIVED_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("derived-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and derived facts"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    fig_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(fig_pop, mutant)
        b, names = compose_figure_by_name(fig_pop, mutant)
        record(f"derived-compose-{name}", DERIVED_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == fig_pop), False)


def ledger_cases(tmp, base, witnesses, failures):
    """The v2.4 pending-to-adopted transition over v2.3, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, LEDGER_SPEC)
    if original is None or derived_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "ledger-packs-thesis"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_ledger_row(line) and not is_kinds_row(line)
                      and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line)
                      and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (ledger_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 49)
    record("ledger-pending", AGENT_ADOPTIONS, "<no v2.4 row>", "<unchanged>",
           "landed package alone keeps v2.4 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{LEDGER_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{LEDGER_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (ledger_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 60
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("ledger-adopted", AGENT_ADOPTIONS, "<no v2.4 row>", row,
           "v2.4 replaces exactly 034 (49 to 60 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", LEDGER_TAG, LEDGER_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{LEDGER_SPEC})", f"/blob/other/{LEDGER_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = ledger_binding(tree)
        record(f"ledger-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (ledger_disposition(tree, ledger_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("ledger-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.3 034", found, held, True)
    derived_row = next((line for line in pending.splitlines(keepends=True) if is_derived_row(line)), None)
    if derived_row is not None:
        no_derived = "".join(line for line in pending.splitlines(keepends=True) if not is_derived_row(line))
        ledger.write_text(no_derived + row)
        effective, r1, r2 = ledger_binding(tree)
        record("ledger-predecessor-missing", AGENT_ADOPTIONS, derived_row, "",
               "R1 refusal while v2.3 is not in force", r1 + r2,
               effective is None and any("prior v2.3" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in LEDGER_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = ledger_binding(tree)
        subject.write_bytes(previous)
        record(f"ledger-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / LEDGER_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("ledger-union-changed", LEDGER_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(LEDGER_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(LEDGER_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("ledger-status-route-missing", STATUS, LEDGER_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("ledger packs thesis v2.4" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(LEDGER_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("ledger-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and reading ledger"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    der_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(der_pop, mutant)
        b, names = compose_figure_by_name(der_pop, mutant)
        record(f"ledger-compose-{name}", LEDGER_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == der_pop), False)


def kinds_cases(tmp, base, witnesses, failures):
    """The v2.5 pending-to-adopted transition over v2.4, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, KINDS_SPEC)
    if original is None or ledger_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "figure-kinds"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_kinds_row(line) and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line)
                      and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (kinds_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 60)
    record("kinds-pending", AGENT_ADOPTIONS, "<no v2.5 row>", "<unchanged>",
           "landed package alone keeps v2.5 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{KINDS_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{KINDS_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (kinds_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 70
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("kinds-adopted", AGENT_ADOPTIONS, "<no v2.5 row>", row,
           "v2.5 replaces exactly 034 (60 to 70 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", KINDS_TAG, KINDS_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{KINDS_SPEC})", f"/blob/other/{KINDS_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = kinds_binding(tree)
        record(f"kinds-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (kinds_disposition(tree, kinds_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("kinds-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.4 034", found, held, True)
    ledger_row = next((line for line in pending.splitlines(keepends=True) if is_ledger_row(line)), None)
    if ledger_row is not None:
        no_ledger = "".join(line for line in pending.splitlines(keepends=True) if not is_ledger_row(line))
        ledger.write_text(no_ledger + row)
        effective, r1, r2 = kinds_binding(tree)
        record("kinds-predecessor-missing", AGENT_ADOPTIONS, ledger_row, "",
               "R1 refusal while v2.4 is not in force", r1 + r2,
               effective is None and any("prior v2.4" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in KINDS_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = kinds_binding(tree)
        subject.write_bytes(previous)
        record(f"kinds-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / KINDS_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("kinds-union-changed", KINDS_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(KINDS_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(KINDS_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("kinds-status-route-missing", STATUS, KINDS_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("figure kinds v2.5" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(KINDS_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("kinds-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and figure kinds"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    led_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(led_pop, mutant)
        b, names = compose_figure_by_name(led_pop, mutant)
        record(f"kinds-compose-{name}", KINDS_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == led_pop), False)


def manifests_cases(tmp, base, witnesses, failures):
    """The v2.7 pending-to-adopted transition over v2.5, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, MANIFESTS_SPEC)
    if original is None or kinds_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "manifest-recognizers"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line)
                      and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (manifests_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 70)
    record("manifests-pending", AGENT_ADOPTIONS, "<no v2.7 row>", "<unchanged>",
           "landed package alone keeps v2.7 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{MANIFESTS_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{MANIFESTS_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (manifests_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 82
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("manifests-adopted", AGENT_ADOPTIONS, "<no v2.7 row>", row,
           "v2.7 replaces exactly 034 (70 to 82 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", MANIFESTS_TAG, MANIFESTS_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{MANIFESTS_SPEC})", f"/blob/other/{MANIFESTS_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = manifests_binding(tree)
        record(f"manifests-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (manifests_disposition(tree, manifests_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("manifests-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.5 034", found, held, True)
    kinds_row = next((line for line in pending.splitlines(keepends=True) if is_kinds_row(line)), None)
    if kinds_row is not None:
        no_kinds = "".join(line for line in pending.splitlines(keepends=True) if not is_kinds_row(line))
        ledger.write_text(no_kinds + row)
        effective, r1, r2 = manifests_binding(tree)
        record("manifests-predecessor-missing", AGENT_ADOPTIONS, kinds_row, "",
               "R1 refusal while v2.5 is not in force", r1 + r2,
               effective is None and any("prior v2.5" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in MANIFESTS_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = manifests_binding(tree)
        subject.write_bytes(previous)
        record(f"manifests-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / MANIFESTS_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("manifests-union-changed", MANIFESTS_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(MANIFESTS_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(MANIFESTS_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("manifests-status-route-missing", STATUS, MANIFESTS_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("manifest recognizers v2.7" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(MANIFESTS_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("manifests-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and manifest recognizers"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"manifests-compose-{name}", MANIFESTS_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def repairs_cases(tmp, base, witnesses, failures):
    """The v2.8 pending-to-adopted transition over v2.7, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, REPAIRS_SPEC)
    if original is None or manifests_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "spec-repairs"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_repairs_row(line) and not is_maps_row(line)
                      and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (repairs_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 82)
    record("repairs-pending", AGENT_ADOPTIONS, "<no v2.8 row>", "<unchanged>",
           "landed package alone keeps v2.8 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{REPAIRS_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{REPAIRS_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (repairs_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 87
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("repairs-adopted", AGENT_ADOPTIONS, "<no v2.8 row>", row,
           "v2.8 replaces exactly 034 (82 to 87 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", REPAIRS_TAG, REPAIRS_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{REPAIRS_SPEC})", f"/blob/other/{REPAIRS_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = repairs_binding(tree)
        record(f"repairs-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (repairs_disposition(tree, repairs_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("repairs-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.7 034", found, held, True)
    manifests_row = next((line for line in pending.splitlines(keepends=True) if is_manifests_row(line)), None)
    if manifests_row is not None:
        no_manifests = "".join(line for line in pending.splitlines(keepends=True) if not is_manifests_row(line))
        ledger.write_text(no_manifests + row)
        effective, r1, r2 = repairs_binding(tree)
        record("repairs-predecessor-missing", AGENT_ADOPTIONS, manifests_row, "",
               "R1 refusal while v2.7 is not in force", r1 + r2,
               effective is None and any("prior v2.7" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in REPAIRS_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = repairs_binding(tree)
        subject.write_bytes(previous)
        record(f"repairs-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / REPAIRS_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("repairs-union-changed", REPAIRS_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(REPAIRS_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(REPAIRS_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("repairs-status-route-missing", STATUS, REPAIRS_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("spec repairs v2.8" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(REPAIRS_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("repairs-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and spec repairs"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"repairs-compose-{name}", REPAIRS_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def maps_cases(tmp, base, witnesses, failures):
    """The v2.9 pending-to-adopted transition over v2.8, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, MAPS_SPEC)
    if original is None or repairs_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "computed-maps"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_maps_row(line) and not is_bounds_row(line)
                      and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (maps_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 87)
    record("maps-pending", AGENT_ADOPTIONS, "<no v2.9 row>", "<unchanged>",
           "landed package alone keeps v2.9 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{MAPS_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{MAPS_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (maps_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 100
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("maps-adopted", AGENT_ADOPTIONS, "<no v2.9 row>", row,
           "v2.9 replaces exactly 034 (87 to 100 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", MAPS_TAG, MAPS_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{MAPS_SPEC})", f"/blob/other/{MAPS_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = maps_binding(tree)
        record(f"maps-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (maps_disposition(tree, maps_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("maps-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.8 034", found, held, True)
    repairs_row = next((line for line in pending.splitlines(keepends=True) if is_repairs_row(line)), None)
    if repairs_row is not None:
        no_repairs = "".join(line for line in pending.splitlines(keepends=True) if not is_repairs_row(line))
        ledger.write_text(no_repairs + row)
        effective, r1, r2 = maps_binding(tree)
        record("maps-predecessor-missing", AGENT_ADOPTIONS, repairs_row, "",
               "R1 refusal while v2.8 is not in force", r1 + r2,
               effective is None and any("prior v2.8" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in MAPS_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = maps_binding(tree)
        subject.write_bytes(previous)
        record(f"maps-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / MAPS_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("maps-union-changed", MAPS_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(MAPS_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(MAPS_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("maps-status-route-missing", STATUS, MAPS_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("computed maps v2.9" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(MAPS_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("maps-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and computed maps"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"maps-compose-{name}", MAPS_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def poc_d10_cases(base, witnesses, failures):
    """Both arms of `poc_outcome` (R2 of the POC child under D10).

    The tree is the clean scratch copy. An amended specification is put in
    front of R2 through `_FILES_OVERRIDE`; D10's state is injected through
    `d10_supersession.amendment`. The bytes that reach the act rows are the
    copy's own, or under D10 the subjects as D10 found them.
    """
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import d10_supersession
    child = next(c for c in CHILDREN if c["key"] == "poc")
    aggregate = read_text(base, AGGREGATE) or ""
    change = d10_supersession.POC_CHANGE
    spec = f"{change}/specs/three-surface-poc-experience/spec.md"
    own = d10_supersession.disk_files(base, change) or {}

    def r2(override=None):
        # One P115 answer per arm, as within one run() (the injected state
        # can change it between arms).
        global _FILES_OVERRIDE, _SIGNED_MEMO
        found, previous, memo = [], _FILES_OVERRIDE, _SIGNED_MEMO
        _FILES_OVERRIDE, _SIGNED_MEMO = override, {}
        try:
            poc_outcome(base, child, aggregate, [], found)
        finally:
            _FILES_OVERRIDE, _SIGNED_MEMO = previous, memo
        return found

    real = d10_supersession.amendment
    try:
        # The copy's own bytes reach the act rows unless an agent amended them
        # under D10; then the bytes that do are the subjects as D10 found them.
        d10_supersession.amendment = lambda *_a, **_k: None
        direct = not r2()
    finally:
        d10_supersession.amendment = real
    reached = own if direct else (real(base) or ({}, []))[0]
    old, new = " SHALL ", " SHALL, as amended, "
    amended = dict(reached)
    amended[spec] = reached.get(spec, b"").replace(old.encode(), new.encode(), 1)
    front = (change, amended)
    missing = "missing adoption row: fixture"
    cases = []
    try:
        d10_supersession.amendment = lambda *_a, **_k: (reached, [])
        cases.append(("poc-d10-reached-clean", r2((change, reached)) == []))
        d10_supersession.amendment = lambda *_a, **_k: None
        got = r2(front)
        cases.append(("poc-d10-absent-pins",
                      any("stale digest" in f for f in got) and not any(missing in f for f in got)))
        d10_supersession.amendment = lambda *_a, **_k: (reached, [missing])
        got = r2(front)
        cases.append(("poc-d10-no-row-fails",
                      any("stale digest" in f for f in got) and got[-1] == missing))
        d10_supersession.amendment = lambda *_a, **_k: (reached, [])
        cases.append(("poc-d10-row-accepts", r2(front) == []))
        d10_supersession.amendment = lambda *_a, **_k: (amended, [])
        got = r2(front)
        cases.append(("poc-d10-history-still-checked",
                      bool(got) and all("as D10 found it" in f for f in got)))
    finally:
        d10_supersession.amendment = real
    for name, caught in cases:
        witnesses.append({"mutant": name, "path": spec, "old": old, "new": new,
                          "expected": "R2 per arm", "failed": [] if caught else ["R2"],
                          "outcome": "killed" if caught else "SURVIVED"})
        if not caught:
            failures.append(name)


def bounds_cases(tmp, base, witnesses, failures):
    """The v2.10 pending-to-adopted transition over v2.9, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, BOUNDS_SPEC)
    if original is None or maps_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "record-bounds"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_bounds_row(line) and not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (bounds_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 100)
    record("bounds-pending", AGENT_ADOPTIONS, "<no v2.10 row>", "<unchanged>",
           "landed package alone keeps v2.10 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{BOUNDS_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{BOUNDS_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (bounds_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 106
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("bounds-adopted", AGENT_ADOPTIONS, "<no v2.10 row>", row,
           "v2.10 replaces exactly 034 (100 to 106 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", BOUNDS_TAG, BOUNDS_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{BOUNDS_SPEC})", f"/blob/other/{BOUNDS_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = bounds_binding(tree)
        record(f"bounds-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (bounds_disposition(tree, bounds_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("bounds-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.9 034", found, held, True)
    maps_row = next((line for line in pending.splitlines(keepends=True) if is_maps_row(line)), None)
    if maps_row is not None:
        no_maps = "".join(line for line in pending.splitlines(keepends=True) if not is_maps_row(line))
        ledger.write_text(no_maps + row)
        effective, r1, r2 = bounds_binding(tree)
        record("bounds-predecessor-missing", AGENT_ADOPTIONS, maps_row, "",
               "R1 refusal while v2.9 is not in force", r1 + r2,
               effective is None and any("prior v2.9" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in BOUNDS_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = bounds_binding(tree)
        subject.write_bytes(previous)
        record(f"bounds-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / BOUNDS_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("bounds-union-changed", BOUNDS_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(BOUNDS_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(BOUNDS_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("bounds-status-route-missing", STATUS, BOUNDS_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("record bounds v2.10" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(BOUNDS_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("bounds-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and record bounds"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"bounds-compose-{name}", BOUNDS_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def corr_cases(tmp, base, witnesses, failures):
    """The v2.11 pending-to-adopted transition over v2.10, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, CORR_SPEC)
    if original is None or bounds_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "spec-corrections"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_corr_row(line) and not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (corr_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 106)
    record("corr-pending", AGENT_ADOPTIONS, "<no v2.11 row>", "<unchanged>",
           "landed package alone keeps v2.11 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{CORR_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{CORR_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (corr_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 110
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("corr-adopted", AGENT_ADOPTIONS, "<no v2.11 row>", row,
           "v2.11 replaces exactly 034 (106 to 110 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", CORR_TAG, CORR_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{CORR_SPEC})", f"/blob/other/{CORR_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = corr_binding(tree)
        record(f"corr-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (corr_disposition(tree, corr_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("corr-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.10 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_bounds_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_bounds_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = corr_binding(tree)
        record("corr-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.10 is not in force", r1 + r2,
               effective is None and any("prior v2.10" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in CORR_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = corr_binding(tree)
        subject.write_bytes(previous)
        record(f"corr-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / CORR_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("corr-union-changed", CORR_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(CORR_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(CORR_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("corr-status-route-missing", STATUS, CORR_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("spec corrections v2.11" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(CORR_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("corr-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and spec corrections"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"corr-compose-{name}", CORR_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def coverage_cases(tmp, base, witnesses, failures):
    """The v2.12 pending-to-adopted transition over v2.11, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, COVERAGE_SPEC)
    if original is None or corr_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "coverage-precheck"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_coverage_row(line)
                      and not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (coverage_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 110)
    record("coverage-pending", AGENT_ADOPTIONS, "<no v2.12 row>", "<unchanged>",
           "landed package alone keeps v2.12 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{COVERAGE_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{COVERAGE_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (coverage_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 117
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("coverage-adopted", AGENT_ADOPTIONS, "<no v2.12 row>", row,
           "v2.12 replaces exactly 034 (110 to 117 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", COVERAGE_TAG, COVERAGE_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{COVERAGE_SPEC})", f"/blob/other/{COVERAGE_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = coverage_binding(tree)
        record(f"coverage-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (coverage_disposition(tree, coverage_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("coverage-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.11 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_corr_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_corr_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = coverage_binding(tree)
        record("coverage-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.11 is not in force", r1 + r2,
               effective is None and any("prior v2.11" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in COVERAGE_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = coverage_binding(tree)
        subject.write_bytes(previous)
        record(f"coverage-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / COVERAGE_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("coverage-union-changed", COVERAGE_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(COVERAGE_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(COVERAGE_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("coverage-status-route-missing", STATUS, COVERAGE_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("coverage precheck v2.12" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(COVERAGE_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("coverage-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and coverage precheck"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"coverage-compose-{name}", COVERAGE_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def infra_cases(tmp, base, witnesses, failures):
    """The v2.14 pending-to-adopted transition over v2.12, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, INFRA_SPEC)
    if original is None or coverage_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "infrastructure-recognizers"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_infra_row(line)
                      and not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (infra_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 117)
    record("infra-pending", AGENT_ADOPTIONS, "<no v2.14 row>", "<unchanged>",
           "landed package alone keeps v2.14 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{INFRA_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{INFRA_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (infra_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 130
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("infra-adopted", AGENT_ADOPTIONS, "<no v2.14 row>", row,
           "v2.14 replaces exactly 034 (117 to 130 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", INFRA_TAG, INFRA_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{INFRA_SPEC})", f"/blob/other/{INFRA_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = infra_binding(tree)
        record(f"infra-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (infra_disposition(tree, infra_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("infra-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.12 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_coverage_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_coverage_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = infra_binding(tree)
        record("infra-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.12 is not in force", r1 + r2,
               effective is None and any("prior v2.12" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in INFRA_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = infra_binding(tree)
        subject.write_bytes(previous)
        record(f"infra-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / INFRA_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("infra-union-changed", INFRA_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(INFRA_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(INFRA_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("infra-status-route-missing", STATUS, INFRA_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("infrastructure recognizers v2.14" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(INFRA_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("infra-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and infrastructure recognizers"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"infra-compose-{name}", INFRA_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def findpages_cases(tmp, base, witnesses, failures):
    """The v2.15 pending-to-adopted transition over v2.14, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, FINDPAGES_SPEC)
    if original is None or infra_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "index-and-task-routes"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_findpages_row(line) and not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (findpages_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 130)
    record("findpages-pending", AGENT_ADOPTIONS, "<no v2.15 row>", "<unchanged>",
           "landed package alone keeps v2.15 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{FINDPAGES_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{FINDPAGES_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (findpages_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 148
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("findpages-adopted", AGENT_ADOPTIONS, "<no v2.15 row>", row,
           "v2.15 replaces exactly 034 (130 to 148 scenarios)", current_findings, held, True)

    both = row.replace(f"`git revert {oid}`", f"`git revert {oid} {FINDPAGES_INSTALL}`", 1)
    ledger.write_text(pending + both)
    held = findpages_binding(tree) == (original, [], [])
    record("findpages-revert-with-install", AGENT_ADOPTIONS, f"git revert {oid}",
           f"git revert {oid} {FINDPAGES_INSTALL}", "the two-commit revert is the row's own revert",
           [], held, True)
    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + both + veto)
    held = findpages_disposition(tree, findpages_rows(tree)) == "A-1000"
    record("findpages-vetoed-two-commit-revert", AGENT_ADOPTIONS, both, veto,
           "a veto of the row with the two-commit revert is read", [], held, True)
    for name, new in (("revert-install-alone", f"`git revert {FINDPAGES_INSTALL}`"),
                      ("revert-other-second", f"`git revert {oid} " + "0" * 40 + "`")):
        ledger.write_text(pending + row.replace(f"`git revert {oid}`", new, 1))
        effective, r1, r2 = findpages_binding(tree)
        record(f"findpages-{name}", AGENT_ADOPTIONS, f"git revert {oid}", new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", FINDPAGES_TAG, FINDPAGES_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{FINDPAGES_SPEC})", f"/blob/other/{FINDPAGES_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = findpages_binding(tree)
        record(f"findpages-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (findpages_disposition(tree, findpages_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("findpages-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.14 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_infra_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_infra_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = findpages_binding(tree)
        record("findpages-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.14 is not in force", r1 + r2,
               effective is None and any("prior v2.14" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in FINDPAGES_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = findpages_binding(tree)
        subject.write_bytes(previous)
        record(f"findpages-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / FINDPAGES_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("findpages-union-changed", FINDPAGES_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(FINDPAGES_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(FINDPAGES_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("findpages-status-route-missing", STATUS, FINDPAGES_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("index and task routes v2.15" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(FINDPAGES_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("findpages-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and index and task routes"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"findpages-compose-{name}", FINDPAGES_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def subsec_cases(tmp, base, witnesses, failures):
    """The v2.16 pending-to-adopted transition over v2.15, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, SUBSEC_SPEC)
    if original is None or findpages_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "page-subsections"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_subsec_row(line) and not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (subsec_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 148)
    record("subsec-pending", AGENT_ADOPTIONS, "<no v2.16 row>", "<unchanged>",
           "landed package alone keeps v2.16 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{SUBSEC_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{SUBSEC_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (subsec_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 158
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("subsec-adopted", AGENT_ADOPTIONS, "<no v2.16 row>", row,
           "v2.16 replaces exactly 034 (148 to 158 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", SUBSEC_TAG, SUBSEC_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{SUBSEC_SPEC})", f"/blob/other/{SUBSEC_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = subsec_binding(tree)
        record(f"subsec-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (subsec_disposition(tree, subsec_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("subsec-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.15 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_findpages_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_findpages_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = subsec_binding(tree)
        record("subsec-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.15 is not in force", r1 + r2,
               effective is None and any("prior v2.15" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in SUBSEC_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = subsec_binding(tree)
        subject.write_bytes(previous)
        record(f"subsec-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / SUBSEC_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("subsec-union-changed", SUBSEC_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(SUBSEC_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(SUBSEC_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("subsec-status-route-missing", STATUS, SUBSEC_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("page subsections v2.16" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(SUBSEC_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("subsec-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and page subsections"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"subsec-compose-{name}", SUBSEC_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def reltype_cases(tmp, base, witnesses, failures):
    """The v2.19 pending-to-adopted transition over v2.16, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, RELTYPE_SPEC)
    if original is None or subsec_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "relation-types"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_reltype_row(line) and not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (reltype_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 158)
    record("reltype-pending", AGENT_ADOPTIONS, "<no v2.19 row>", "<unchanged>",
           "landed package alone keeps v2.19 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{RELTYPE_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{RELTYPE_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (reltype_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 168
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("reltype-adopted", AGENT_ADOPTIONS, "<no v2.19 row>", row,
           "v2.19 replaces exactly 034 (158 to 168 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", RELTYPE_TAG, RELTYPE_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{RELTYPE_SPEC})", f"/blob/other/{RELTYPE_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = reltype_binding(tree)
        record(f"reltype-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (reltype_disposition(tree, reltype_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("reltype-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.16 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_subsec_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_subsec_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = reltype_binding(tree)
        record("reltype-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.16 is not in force", r1 + r2,
               effective is None and any("prior v2.16" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in RELTYPE_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = reltype_binding(tree)
        subject.write_bytes(previous)
        record(f"reltype-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / RELTYPE_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("reltype-union-changed", RELTYPE_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(RELTYPE_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(RELTYPE_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("reltype-status-route-missing", STATUS, RELTYPE_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("relation types v2.19" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(RELTYPE_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("reltype-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and relation types"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"reltype-compose-{name}", RELTYPE_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def hero_cases(tmp, base, witnesses, failures):
    """The v2.20 pending-to-adopted transition over v2.19, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, HERO_SPEC)
    if original is None or reltype_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "hero-figure"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_hero_row(line) and not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (hero_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 168)
    record("hero-pending", AGENT_ADOPTIONS, "<no v2.20 row>", "<unchanged>",
           "landed package alone keeps v2.20 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{HERO_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{HERO_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (hero_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 178
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("hero-adopted", AGENT_ADOPTIONS, "<no v2.20 row>", row,
           "v2.20 replaces exactly 034 (168 to 178 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", HERO_TAG, HERO_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{HERO_SPEC})", f"/blob/other/{HERO_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = hero_binding(tree)
        record(f"hero-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (hero_disposition(tree, hero_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("hero-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.19 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_reltype_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_reltype_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = hero_binding(tree)
        record("hero-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.19 is not in force", r1 + r2,
               effective is None and any("prior v2.19" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in HERO_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = hero_binding(tree)
        subject.write_bytes(previous)
        record(f"hero-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / HERO_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("hero-union-changed", HERO_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(HERO_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(HERO_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("hero-status-route-missing", STATUS, HERO_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("hero figure v2.20" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(HERO_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("hero-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and hero figure"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"hero-compose-{name}", HERO_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)


def readers_cases(tmp, base, witnesses, failures):
    """The v2.22 pending-to-adopted transition over v2.20, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, READERS_SPEC)
    if original is None or hero_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "readers-edition"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_readers_row(line) and not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (readers_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 178)
    record("readers-pending", AGENT_ADOPTIONS, "<no v2.22 row>", "<unchanged>",
           "landed package alone keeps v2.22 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{READERS_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{READERS_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (readers_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 183
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("readers-adopted", AGENT_ADOPTIONS, "<no v2.22 row>", row,
           "v2.22 replaces exactly 034 (178 to 183 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", READERS_TAG, READERS_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{READERS_SPEC})", f"/blob/other/{READERS_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = readers_binding(tree)
        record(f"readers-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (readers_disposition(tree, readers_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("readers-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.20 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_hero_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_hero_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = readers_binding(tree)
        record("readers-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.20 is not in force", r1 + r2,
               effective is None and any("prior v2.20" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in READERS_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = readers_binding(tree)
        subject.write_bytes(previous)
        record(f"readers-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / READERS_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("readers-union-changed", READERS_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(READERS_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(READERS_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("readers-status-route-missing", STATUS, READERS_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("reader's edition v2.22" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(READERS_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("readers-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and reader's edition"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"readers-compose-{name}", READERS_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)

def cont_cases(tmp, base, witnesses, failures):
    """The v2.23 pending-to-adopted transition over v2.22, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, CONT_SPEC)
    if original is None or readers_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "cont-edition"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_cont_row(line) and not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (cont_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 183)
    record("cont-pending", AGENT_ADOPTIONS, "<no v2.23 row>", "<unchanged>",
           "landed package alone keeps v2.23 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{CONT_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{CONT_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (cont_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 193
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("cont-adopted", AGENT_ADOPTIONS, "<no v2.23 row>", row,
           "v2.23 replaces exactly 034 (183 to 193 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", CONT_TAG, CONT_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{CONT_SPEC})", f"/blob/other/{CONT_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = cont_binding(tree)
        record(f"cont-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (cont_disposition(tree, cont_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("cont-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.22 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_readers_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_readers_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = cont_binding(tree)
        record("cont-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.22 is not in force", r1 + r2,
               effective is None and any("prior v2.22" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in CONT_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = cont_binding(tree)
        subject.write_bytes(previous)
        record(f"cont-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / CONT_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("cont-union-changed", CONT_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(CONT_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(CONT_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("cont-status-route-missing", STATUS, CONT_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("containment figure v2.23" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(CONT_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("cont-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and containment figure"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"cont-compose-{name}", CONT_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)

def edit_account_cases(tmp, base, witnesses, failures):
    """Exercise the v2.25 binding and sole REQ-006 replacement in a disposable tree."""
    reviewed = read_text(base, EDIT_ACCOUNT_SPEC)
    if reviewed is None or model_binding(base)[0] is None:
        return

    def record(case, path, old, new, expected, findings, caught, control=False):
        outcome = ("held" if control else "killed") if caught else "SURVIVED"
        name = f"edit-account-{case}"
        witnesses.append({"mutant": name, "path": path, "old": old, "new": new,
                          "expected": expected, "failed": findings, "outcome": outcome})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "edit-account-v225"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_edit_account_row(line))
    ledger.write_text(pending)
    baseline, findings = census(tree)
    predecessor = baseline["POLARIS"]
    ident = EDIT_ACCOUNT_REPLACES[0]
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>",
           "candidate stays out of effective REQ-006", findings,
           not findings and edit_account_binding(tree) == (None, [], [])
           and len(predecessor[ident]["scenarios"]) == 5, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{EDIT_ACCOUNT_SPEC}"
    row = (f"| A-999 | 2026-11-24 | `{oid}` | [spec]({snapshot}) | Selftest "
           f"| `git revert {oid}` | `{EDIT_ACCOUNT_TAG}` |\n")
    ledger.write_text(pending + row)
    installed, findings = census(tree)
    expected_scenarios = [
        *predecessor[ident]["scenarios"],
        "Edit or repair drops a prior block without account",
    ]
    expected = {**predecessor, ident: {**predecessor[ident], "scenarios": expected_scenarios}}
    record("adopted", AGENT_ADOPTIONS, "<no row>", row,
           "binding activates one extra scenario and preserves the other requirements", findings,
           not findings and edit_account_binding(tree) == (reviewed, [], [])
           and installed["POLARIS"] == expected, True)

    bad_rows = (
        ("wrong-tag", EDIT_ACCOUNT_TAG, EDIT_ACCOUNT_TAG.replace("2.25", "2.99"), "malformed adoption"),
        ("bad-sha", f"| `{oid}` |", "| `0123456` |", "malformed adoption"),
        ("wrong-revert", f"git revert {oid}", f"git revert {'f' * 40}", "revert does not name"),
        ("wrong-snapshot", snapshot, snapshot.replace(oid, "f" * 40), "does not name the reviewed"),
        ("duplicate", row, row + row.replace("A-999", "A-1000"), "expected one seven-column"),
        ("reused-identity", "A-999", "A-64", "adoption identity is not unique"),
    )
    for case, old, new, reason in bad_rows:
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, records, subjects = edit_account_binding(tree)
        record(case, AGENT_ADOPTIONS, old, new, reason, records + subjects,
               effective is None and any(reason in line for line in records) and not subjects)

    prior_row = next(line for line in pending.splitlines(keepends=True) if is_model_row(line))
    ledger.write_text(pending.replace(prior_row, "", 1) + row)
    effective, records, subjects = edit_account_binding(tree)
    record("prior-missing", AGENT_ADOPTIONS, prior_row, "", "reject missing effective v2.24",
           records + subjects, effective is None and any("prior v2.24" in line for line in records))

    ledger.write_text(pending + row)
    subject = tree / EDIT_ACCOUNT_SPEC
    previous = subject.read_bytes()
    subject.write_bytes(previous + b"\n")
    effective, records, subjects = edit_account_binding(tree)
    record("subject-drift", EDIT_ACCOUNT_SPEC, "<end of file>", "\n", "reject changed subject bytes",
           records + subjects, effective is None and not records and bool(subjects))
    subject.unlink()
    effective, records, subjects = edit_account_binding(tree)
    record("subject-missing", EDIT_ACCOUNT_SPEC, "<reviewed file>", "<file missing>",
           "reject a missing reviewed subject", records + subjects,
           effective is None and not records and bool(subjects))
    subject.write_bytes(previous)

    veto = ("| A-1000 | 2026-11-24 | `8a468bc` | Veto A-999 | Selftest "
            "| `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    retired, findings = census(tree)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto,
           "a valid later veto restores the exact predecessor composition", findings,
           not findings and edit_account_disposition(tree, edit_account_rows(tree)) == "A-1000"
           and retired == baseline, True)

    ledger.write_text(pending + row)
    status = tree / STATUS
    index = tree / OPENSPEC_README
    prior_status = status.read_text()
    prior_index = index.read_text()
    adopted_status = f"    {EDIT_ACCOUNT_STATUS_PREFIX} is agent-adopted in A-999."
    status_without_route = "".join(line for line in prior_status.splitlines(keepends=True)
                                 if not line.strip().startswith(EDIT_ACCOUNT_STATUS_PREFIX))
    index_row = next(line for line in prior_index.splitlines(keepends=True)
                     if line.startswith(f"| [`{EDIT_ACCOUNT_CHANGE}`]("))
    adopted_index = (f"| [`{EDIT_ACCOUNT_CHANGE}`](changes/{EDIT_ACCOUNT_CHANGE}) | Edit and repair accounting "
                     f"| Agent-adopted | [Agent adoption A-999](../{AGENT_ADOPTIONS}) (`{EDIT_ACCOUNT_TAG}`) |\n")
    status.write_text(status_without_route + adopted_status + "\n")
    index.write_text(prior_index.replace(index_row, adopted_index, 1))

    def route_findings(population):
        report = Report()
        check_routes(tree, population, report)
        return [f for f in report.findings.get("R5", []) if "edit and repair accounting v2.25" in f]

    findings = route_findings(installed)
    record("route-installed", STATUS, "<candidate route>", adopted_status, "route agrees with binding",
           findings, not findings, True)
    status.write_text(status_without_route)
    findings = route_findings(installed)
    record("status-route-missing", STATUS, adopted_status, "", "status must link the active adoption",
           findings, len(findings) == 1 and STATUS in findings[0])
    status.write_text(status_without_route + adopted_status + "\n")
    index_cases = (
        ("wrong-tag", EDIT_ACCOUNT_TAG, "incorrect-tag"),
        ("wrong-ledger-path", f"../{AGENT_ADOPTIONS}", "../README.md#AGENT-ADOPTIONS.md"),
        ("wrong-ledger-identity", "Agent adoption A-999", "Agent adoption A-998"),
        ("wrong-change-path", f"changes/{EDIT_ACCOUNT_CHANGE}", f"../{EDIT_ACCOUNT_HOME}"),
        ("candidate-stated", "Agent-adopted", "Candidate"),
    )
    for case, old, new in index_cases:
        assert old in adopted_index, case
        index.write_text(prior_index.replace(index_row, adopted_index.replace(old, new, 1), 1))
        findings = route_findings(installed)
        record(f"index-route-{case}", OPENSPEC_README, old, new, "refuse the inaccurate index route",
               findings, len(findings) == 1 and OPENSPEC_README in findings[0])
    index.write_text(prior_index.replace(index_row, adopted_index.replace("Agent adoption A-999", "Historical record"), 1))
    ledger.write_text(pending)
    findings = route_findings(baseline)
    record("pending-adoption-claimed", AGENT_ADOPTIONS, row, "", "both routes refuse a false adoption",
           findings, len(findings) == 2 and any(STATUS in f for f in findings)
           and any(OPENSPEC_README in f for f in findings))
    status.write_text(prior_status)
    index.write_text(prior_index)

    content_cases = (
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "005"),
        ("wrong-name", "### Requirement: Independent review and repair", "### Requirement: Other review"),
        ("wrong-operation", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
    )
    for case, old, new in content_cases:
        assert old in reviewed, case
        candidate = reviewed.replace(old, new, 1)
        by_id, id_findings = compose_figure_by_id(predecessor, candidate, EDIT_ACCOUNT_REPLACES)
        by_name, name_findings = compose_figure_by_name(predecessor, candidate, EDIT_ACCOUNT_REPLACES)
        record(case, EDIT_ACCOUNT_SPEC, old, new, "both parsers reject without partial application",
               id_findings + name_findings, bool(id_findings and name_findings) and by_id == by_name == predecessor)


def model_cases(tmp, base, witnesses, failures):
    """The v2.24 pending-to-adopted transition over v2.23, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, MODEL_SPEC)
    if original is None or cont_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "model-edition"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_model_row(line) and not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (model_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 193)
    record("model-pending", AGENT_ADOPTIONS, "<no v2.24 row>", "<unchanged>",
           "landed package alone keeps v2.24 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{MODEL_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{MODEL_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (model_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 207
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("model-adopted", AGENT_ADOPTIONS, "<no v2.24 row>", row,
           "v2.24 replaces exactly 034 (193 to 207 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", MODEL_TAG, MODEL_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{MODEL_SPEC})", f"/blob/other/{MODEL_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = model_binding(tree)
        record(f"model-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (model_disposition(tree, model_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("model-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.23 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_cont_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_cont_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = model_binding(tree)
        record("model-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.23 is not in force", r1 + r2,
               effective is None and any("prior v2.23" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in MODEL_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = model_binding(tree)
        subject.write_bytes(previous)
        record(f"model-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / MODEL_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("model-union-changed", MODEL_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(MODEL_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(MODEL_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("model-status-route-missing", STATUS, MODEL_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("system model v2.24" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(MODEL_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("model-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and system model"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"model-compose-{name}", MODEL_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)

def worth_cases(tmp, base, witnesses, failures):
    """The v2.26 pending-to-adopted transition over v2.24, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, WORTH_SPEC)
    if original is None or model_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "worth-edition"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_worth_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = FIGURE_REPLACES[0]
    held = (worth_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 207)
    record("worth-pending", AGENT_ADOPTIONS, "<no v2.26 row>", "<unchanged>",
           "landed package alone keeps v2.26 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-21 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{WORTH_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{WORTH_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (worth_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 214
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("worth-adopted", AGENT_ADOPTIONS, "<no v2.26 row>", row,
           "v2.26 replaces exactly 034 (207 to 214 scenarios)", current_findings, held, True)

    both = row.replace(f"`git revert {oid}`", f"`git revert {oid} {WORTH_FIRST_INSTALL}`", 1)
    ledger.write_text(pending + both)
    held = worth_binding(tree) == (original, [], [])
    record("worth-revert-with-first-install", AGENT_ADOPTIONS, f"git revert {oid}",
           f"git revert {oid} {WORTH_FIRST_INSTALL}", "the two-commit revert is the row's own revert",
           [], held, True)
    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + both + veto)
    held = worth_disposition(tree, worth_rows(tree)) == "A-1000"
    record("worth-vetoed-two-commit-revert", AGENT_ADOPTIONS, both, veto,
           "a veto of the row with the two-commit revert is read", [], held, True)
    for name, new in (("revert-first-install-alone", f"`git revert {WORTH_FIRST_INSTALL}`"),
                      ("revert-other-second", f"`git revert {oid} " + "0" * 40 + "`")):
        ledger.write_text(pending + row.replace(f"`git revert {oid}`", new, 1))
        effective, r1, r2 = worth_binding(tree)
        record(f"worth-{name}", AGENT_ADOPTIONS, f"git revert {oid}", new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", WORTH_TAG, WORTH_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{WORTH_SPEC})", f"/blob/other/{WORTH_SPEC})"),
                           ("bad-date", "2026-11-21", "2026-99-21"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = worth_binding(tree)
        record(f"worth-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (worth_disposition(tree, worth_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("worth-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.24 034", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_model_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_model_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = worth_binding(tree)
        record("worth-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.24 is not in force", r1 + r2,
               effective is None and any("prior v2.24" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in WORTH_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = worth_binding(tree)
        subject.write_bytes(previous)
        record(f"worth-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / WORTH_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-014"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("worth-union-changed", WORTH_UNION, '"REQ-polaris-generation-014"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(WORTH_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(WORTH_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("worth-status-route-missing", STATUS, WORTH_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("worth-knowing v2.26" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(WORTH_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("worth-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Agent brief and mechanically checked draft",
         "### Requirement: Agent brief and worth-knowing mark"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    kin_pop = predecessor
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(kin_pop, mutant)
        b, names = compose_figure_by_name(kin_pop, mutant)
        record(f"worth-compose-{name}", WORTH_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == kin_pop), False)

def reach_cases(tmp, base, witnesses, failures):
    """The v2.6 pending-to-adopted transition over v2.0, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, REACH_SPEC)
    if original is None or declared_source_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "declared-source-reach"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_reach_row(line) and not is_readmit_row(line) and not is_raw_read_row(line)
                      and not is_treeread_row(line)
                      and not is_verify_row(line) and not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line) and not is_covhold_row(line) and not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = REACH_REPLACES[0]
    held = (reach_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 3)
    record("reach-pending", AGENT_ADOPTIONS, "<no v2.6 row>", "<unchanged>",
           "landed package alone keeps v2.6 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-22 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{REACH_SPEC}) "
           f"· [policy](https://github.com/tzeusy-org/syzygy/blob/{oid}/{REACH_POLICY}) "
           f"| Selftest | `git revert {oid}` | `{REACH_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (reach_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 11
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("reach-adopted", AGENT_ADOPTIONS, "<no v2.6 row>", row,
           "v2.6 replaces exactly 046 (3 to 11 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", REACH_TAG, REACH_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{REACH_SPEC})", f"/blob/other/{REACH_SPEC})"),
                           ("missing-policy-link", f"/blob/{oid}/{REACH_POLICY})", f"/blob/other/{REACH_POLICY})"),
                           ("bad-date", "2026-11-22", "2026-99-22"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = reach_binding(tree)
        record(f"reach-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-23 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (reach_disposition(tree, reach_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("reach-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.0 046", found, held, True)
    declared_row = next((line for line in pending.splitlines(keepends=True)
                         if line.startswith(f"| {DECLARED_SOURCE_ROW} |")), None)
    if declared_row is not None:
        ledger.write_text(pending.replace(declared_row, "", 1) + row)
        effective, r1, r2 = reach_binding(tree)
        record("reach-predecessor-missing", AGENT_ADOPTIONS, declared_row, "",
               "R1 refusal while v2.0 is not in force", r1 + r2,
               effective is None and any("prior v2.0" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in REACH_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = reach_binding(tree)
        subject.write_bytes(previous)
        record(f"reach-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / REACH_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-048"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-048"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("reach-union-changed", REACH_UNION, '"REQ-polaris-generation-048"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(REACH_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(REACH_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("reach-status-route-missing", STATUS, REACH_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("declared-source reach v2.6" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(REACH_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("reach-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Declared local-source admission",
         "### Requirement: Declared source reach"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(predecessor, mutant, REACH_REPLACES)
        b, names = compose_figure_by_name(predecessor, mutant, REACH_REPLACES)
        record(f"reach-compose-{name}", REACH_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == predecessor), False)


def raw_read_cases(tmp, base, witnesses, failures):
    spec = read_text(base, RAW_READ_SPEC)
    if spec is None or readmit_binding(base)[0] is None:
        return
    tree = Path(tmp) / RAW_READ_CHANGE
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_raw_read_row(line) and not is_treeread_row(line)
                      and not is_verify_row(line) and not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line) and not is_covhold_row(line) and not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, findings = census(tree)
    oid = "0123456789abcdef" * 2 + "01234567"
    links = " ".join(f"[subject](https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel})"
                     for rel in RAW_READ_SUBJECTS)
    row = (f"| A-999 | 2026-11-23 | `{oid}` | {links} | Selftest | "
           f"`git revert {oid}` | `{RAW_READ_TAG}` |\n")

    def record(case, path, old, new, outcome, observed, passed):
        witnesses.append({"mutant": "raw-read-" + case, "path": path, "old": old, "new": new,
                          "expected": outcome, "failed": observed,
                          "outcome": ("held" if outcome == "PASS" else "killed") if passed else "SURVIVED"})
        if not passed:
            failures.append("raw-read-" + case)

    record("pending", AGENT_ADOPTIONS, "<no adoption>", "<unchanged>", "PASS", findings,
           not findings and raw_read_binding(tree) == (None, [], []))
    ledger.write_text(pending + row)
    after, findings = census(tree)
    before, after = before["POLARIS"], after["POLARIS"]
    changes = {ident for ident in before if before[ident] != after.get(ident)}
    delta = sum(len(req["scenarios"]) for req in after.values()) - sum(len(req["scenarios"]) for req in before.values())
    record("adopted", AGENT_ADOPTIONS, "<no adoption>", row, "PASS", findings,
           not findings and raw_read_binding(tree) == (spec, [], [])
           and set(before) == set(after) and changes == set(RAW_READ_REPLACES) and delta == 5)

    later_oid = "2" * 40
    citation = (f"| A-1000 | 2026-11-23 | `{later_oid}` | {links} | Citation only | "
                f"`git revert {later_oid}` | — |\n")
    ledger.write_text(pending + row + citation)
    record("later-citation", AGENT_ADOPTIONS, row, row + citation, "PASS", [],
           raw_read_binding(tree) == (spec, [], []))
    veto = citation.replace(links, "Veto A-999 " + links)
    ledger.write_text(pending + row + veto)
    record("linked-veto", AGENT_ADOPTIONS, row, row + veto, "PASS", [],
           raw_read_binding(tree) == (None, [], []))

    for case, old, new in (
            ("duplicate-row", row, row + row),
            ("wrong-tag", RAW_READ_TAG, RAW_READ_TAG + "-wrong"),
            ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
            ("missing-policy-link", links.split()[1], "")):
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = raw_read_binding(tree)
        record(case, AGENT_ADOPTIONS, old, new, "R1 refuses", r1 + r2,
               effective is None and bool(r1) and not r2)
    ledger.write_text(pending + row)
    for rel in RAW_READ_SUBJECTS:
        path = tree / rel
        original = path.read_bytes()
        path.write_bytes(original + b"\n")
        effective, r1, r2 = raw_read_binding(tree)
        path.write_bytes(original)
        record("changed-" + Path(rel).name, rel, "<end of file>", "\\n", "R2 refuses", r1 + r2,
               effective is None and not r1 and len(r2) == 1 and rel in r2[0])


TREEREAD_SCENARIOS_ADDED = 7


def treeread_cases(tmp, base, witnesses, failures):
    """The v2.18 pending-to-adopted transition over v2.17 and v2.1, its ledger and byte
    guards, and the predecessor guard (no raw-read disclosure v2.17, no composition)."""
    spec = read_text(base, TREEREAD_SPEC)
    if spec is None or raw_read_binding(base)[0] is None or url_source_binding(base)[0] is None:
        return
    tree = Path(tmp) / TREEREAD_CHANGE
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_treeread_row(line)
                      and not is_verify_row(line) and not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line) and not is_covhold_row(line) and not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, findings = census(tree)
    oid = "0123456789abcdef" * 2 + "89abcdef"
    links = " ".join(f"[subject](https://github.com/tzeusy-org/syzygy/blob/{oid}/{rel})"
                     for rel in TREEREAD_SUBJECTS)
    row = (f"| A-998 | 2026-11-23 | `{oid}` | {links} | Selftest | "
           f"`git revert {oid}` | `{TREEREAD_TAG}` |\n")

    def record(case, path, old, new, outcome, observed, passed):
        witnesses.append({"mutant": "run-tree-read-bounds-" + case, "path": path, "old": old, "new": new,
                          "expected": outcome, "failed": observed,
                          "outcome": ("held" if outcome == "PASS" else "killed") if passed else "SURVIVED"})
        if not passed:
            failures.append("run-tree-read-bounds-" + case)

    record("pending", AGENT_ADOPTIONS, "<no adoption>", "<unchanged>", "PASS", findings,
           not findings and treeread_binding(tree) == (None, [], []))
    ledger.write_text(pending + row)
    after, findings = census(tree)
    before, after = before["POLARIS"], after["POLARIS"]
    changes = {ident for ident in before if before[ident] != after.get(ident)}
    delta = sum(len(req["scenarios"]) for req in after.values()) - sum(len(req["scenarios"]) for req in before.values())
    record("adopted", AGENT_ADOPTIONS, "<no adoption>", row, "PASS", findings,
           not findings and treeread_binding(tree) == (spec, [], [])
           and set(before) == set(after) and changes == set(TREEREAD_REPLACES)
           and delta == TREEREAD_SCENARIOS_ADDED)

    later_oid = "3" * 40
    citation = (f"| A-1001 | 2026-11-23 | `{later_oid}` | {links} | Citation only | "
                f"`git revert {later_oid}` | — |\n")
    ledger.write_text(pending + row + citation)
    record("later-citation", AGENT_ADOPTIONS, row, row + citation, "PASS", [],
           treeread_binding(tree) == (spec, [], []))
    veto = citation.replace(links, "Veto A-998 " + links)
    ledger.write_text(pending + row + veto)
    record("linked-veto", AGENT_ADOPTIONS, row, row + veto, "PASS", [],
           treeread_binding(tree) == (None, [], []))

    for case, old, new in (
            ("duplicate-row", row, row + row),
            ("wrong-tag", TREEREAD_TAG, TREEREAD_TAG + "-wrong"),
            ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
            ("missing-spec-link", links, "")):
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = treeread_binding(tree)
        record(case, AGENT_ADOPTIONS, old, new, "R1 refuses", r1 + r2,
               effective is None and bool(r1) and not r2)
    without_predecessor = "".join(line for line in pending.splitlines(keepends=True) if not is_raw_read_row(line))
    ledger.write_text(without_predecessor + row)
    effective, r1, r2 = treeread_binding(tree)
    record("no-raw-read-predecessor", AGENT_ADOPTIONS, "<raw-read v2.17 row>", "<absent>", "R1 refuses", r1 + r2,
           effective is None and any("must be effective" in finding for finding in r1))
    ledger.write_text(pending + row)
    for rel in TREEREAD_SUBJECTS:
        path = tree / rel
        original = path.read_bytes()
        path.write_bytes(original + b"\n")
        effective, r1, r2 = treeread_binding(tree)
        path.write_bytes(original)
        record("changed-" + Path(rel).name, rel, "<end of file>", "\\n", "R2 refuses", r1 + r2,
               effective is None and not r1 and len(r2) == 1 and rel in r2[0])


VERIFY_PREDECESSOR_SCENARIOS = 12
VERIFY_SCENARIOS_ADDED = 4


def verify_cases(tmp, base, witnesses, failures):
    """The v2.21 pending-to-adopted transition over v2.18's 033, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, VERIFY_SPEC)
    if original is None or treeread_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "verify-text"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_verify_row(line) and not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = VERIFY_REPLACES[0]
    held = (verify_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == VERIFY_PREDECESSOR_SCENARIOS)
    record("verify-pending", AGENT_ADOPTIONS, "<no v2.21 row>", "<unchanged>",
           "landed package alone keeps v2.21 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-22 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{VERIFY_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{VERIFY_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (verify_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == VERIFY_PREDECESSOR_SCENARIOS + VERIFY_SCENARIOS_ADDED
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("verify-adopted", AGENT_ADOPTIONS, "<no v2.21 row>", row,
           "v2.21 replaces exactly 033 (12 to 16 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", VERIFY_TAG, VERIFY_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{VERIFY_SPEC})", f"/blob/other/{VERIFY_SPEC})"),
                           ("bad-date", "2026-11-22", "2026-99-22"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = verify_binding(tree)
        record(f"verify-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (verify_disposition(tree, verify_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("verify-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.18 033", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_treeread_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_treeread_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = verify_binding(tree)
        record("verify-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.18 is not in force", r1 + r2,
               effective is None and any("prior v2.18" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in VERIFY_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = verify_binding(tree)
        subject.write_bytes(previous)
        record(f"verify-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / VERIFY_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-017"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-017"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("verify-union-changed", VERIFY_UNION, '"REQ-polaris-generation-017"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(VERIFY_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(VERIFY_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("verify-status-route-missing", STATUS, VERIFY_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("verify text v2.21" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(VERIFY_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("verify-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Operator-agent authoring mode",
         "### Requirement: Operator-agent authoring mode and verify"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(predecessor, mutant, VERIFY_REPLACES)
        b, names = compose_figure_by_name(predecessor, mutant, VERIFY_REPLACES)
        record(f"verify-compose-{name}", VERIFY_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == predecessor), False)


QFILE_PREDECESSOR_SCENARIOS = 16
QFILE_SCENARIOS_ADDED = 2


def qfile_cases(tmp, base, witnesses, failures):
    """The v2.27 pending-to-adopted transition over v2.21's 033, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, QFILE_SPEC)
    if original is None or verify_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "question-file"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = QFILE_REPLACES[0]
    held = (qfile_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == QFILE_PREDECESSOR_SCENARIOS)
    record("qfile-pending", AGENT_ADOPTIONS, "<no v2.27 row>", "<unchanged>",
           "landed package alone keeps v2.27 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-22 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{QFILE_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{QFILE_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (qfile_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == QFILE_PREDECESSOR_SCENARIOS + QFILE_SCENARIOS_ADDED
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("qfile-adopted", AGENT_ADOPTIONS, "<no v2.27 row>", row,
           "v2.27 replaces exactly 033 (16 to 18 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", QFILE_TAG, QFILE_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{QFILE_SPEC})", f"/blob/other/{QFILE_SPEC})"),
                           ("bad-date", "2026-11-22", "2026-99-22"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = qfile_binding(tree)
        record(f"qfile-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (qfile_disposition(tree, qfile_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("qfile-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.21 033", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_verify_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_verify_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = qfile_binding(tree)
        record("qfile-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.21 is not in force", r1 + r2,
               effective is None and any("prior v2.21" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in QFILE_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = qfile_binding(tree)
        subject.write_bytes(previous)
        record(f"qfile-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / QFILE_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-017"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-017"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("qfile-union-changed", QFILE_UNION, '"REQ-polaris-generation-017"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(QFILE_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(QFILE_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("qfile-status-route-missing", STATUS, QFILE_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("question file v2.27" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(QFILE_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("qfile-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Operator-agent authoring mode",
         "### Requirement: Operator-agent authoring mode and questions"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(predecessor, mutant, QFILE_REPLACES)
        b, names = compose_figure_by_name(predecessor, mutant, QFILE_REPLACES)
        record(f"qfile-compose-{name}", QFILE_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == predecessor), False)


COVHOLD_PREDECESSOR_SCENARIOS = 40
COVHOLD_SCENARIOS_ADDED = 6


def scripted_grade_cases(tmp, base, witnesses, failures):
    """Guard REQ033 succession, blinded-grade spec identity and operative retirement."""
    original = read_text(base, SCRIPTED_GRADE_SPEC)
    if original is None or SCRIPTED_GRADE_TAG is None or qfile_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"scripted-grade-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "scripted-benchmark-grading"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_scripted_grade_row(line) and not is_step_measures_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    requirement = SCRIPTED_GRADE_REPLACES[0]
    held = (scripted_grade_binding(tree) == (None, [], []) and not before_findings
            and len(prior[requirement]["scenarios"]) == 18)
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "prior 033 has 18 scenarios",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{SCRIPTED_GRADE_SPEC}"
    row = (f"| A-999 | 2026-11-25 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{SCRIPTED_GRADE_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-25 | `{later}` | "
    citations = (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{SCRIPTED_GRADE_TAG}` | `git revert {later}` | — |\n"),
    )
    for state, prefix, expected in (("pending", pending, None), ("adopted", pending + row, original)):
        for name, citation in citations:
            ledger.write_text(prefix + citation)
            text, r1, r2 = scripted_grade_binding(tree)
            record(f"{state}-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
                   "an unrelated row does not claim this adoption", r1 + r2,
                   text == expected and not r1 and not r2, baseline=True)

    ledger.write_text(pending + row)
    after, after_findings = census(tree)
    effective = after["POLARIS"]
    held = (scripted_grade_binding(tree) == (original, [], []) and not after_findings
            and len(effective[requirement]["scenarios"]) == 21
            and set(prior) == set(effective)
            and all(prior[other] == body for other, body in effective.items() if other != requirement))
    record("adopted", AGENT_ADOPTIONS, "<no row>", row, "only 033 moves from 18 to 21 scenarios",
           after_findings, held, baseline=True)

    for name, old, new, detail in (
        ("duplicate-row", row, row + row, "seven-column"),
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", SCRIPTED_GRADE_TAG, SCRIPTED_GRADE_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = scripted_grade_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    predecessor = next(line for line in pending.splitlines(keepends=True) if is_qfile_row(line))
    ledger.write_text(pending.replace(predecessor, "", 1) + row)
    text, r1, r2 = scripted_grade_binding(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, predecessor, "", "R1 requires effective v2.27", r1 + r2,
           text is None and not r2 and any("prior v2.27" in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / SCRIPTED_GRADE_SPEC
    changed = "The key's exact whole set grades partial"
    prior_grade = "The key's exact whole set grades right"
    assert original.count(prior_grade) == 1
    spec.write_text(original.replace(prior_grade, changed, 1))
    text, r1, r2 = scripted_grade_binding(tree)
    record("modified-grade-oracle", SCRIPTED_GRADE_SPEC, prior_grade, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and not r1 and len(r2) == 1 and SCRIPTED_GRADE_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-25 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (scripted_grade_disposition(tree, scripted_grade_rows(tree)) == "A-1000"
            and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 033", found, held, baseline=True)


def step_measures_cases(tmp, base, witnesses, failures):
    """Guard the REQ033 succession, checked close spec and operative retirement."""
    original = read_text(base, STEP_MEASURES_SPEC)
    if original is None or STEP_MEASURES_TAG is None or scripted_grade_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"step-measures-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-step-measures"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_step_measures_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    requirement = STEP_MEASURES_REPLACES[0]
    held = (step_measures_binding(tree) == (None, [], []) and not before_findings
            and len(prior[requirement]["scenarios"]) == 21)
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "prior 033 has 21 scenarios",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{STEP_MEASURES_SPEC}"
    row = (f"| A-999 | 2026-11-25 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{STEP_MEASURES_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-25 | `{later}` | "
    citations = (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{STEP_MEASURES_TAG}` | `git revert {later}` | — |\n"),
    )
    for state, prefix, expected in (("pending", pending, None), ("adopted", pending + row, original)):
        for name, citation in citations:
            ledger.write_text(prefix + citation)
            text, r1, r2 = step_measures_binding(tree)
            record(f"{state}-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
                   "an unrelated row does not claim this adoption", r1 + r2,
                   text == expected and not r1 and not r2, baseline=True)

    ledger.write_text(pending + row)
    after, after_findings = census(tree)
    effective = after["POLARIS"]
    held = (step_measures_binding(tree) == (original, [], []) and not after_findings
            and len(effective[requirement]["scenarios"]) == 25
            and set(prior) == set(effective)
            and all(prior[other] == body for other, body in effective.items() if other != requirement))
    record("adopted", AGENT_ADOPTIONS, "<no row>", row, "only 033 moves from 21 to 25 scenarios",
           after_findings, held, baseline=True)

    for name, old, new, detail in (
        ("duplicate-row", row, row + row, "seven-column"),
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", STEP_MEASURES_TAG, STEP_MEASURES_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = step_measures_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    predecessor = next(line for line in pending.splitlines(keepends=True) if is_scripted_grade_row(line))
    ledger.write_text(pending.replace(predecessor, "", 1) + row)
    text, r1, r2 = step_measures_binding(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, predecessor, "", "R1 requires effective v2.30", r1 + r2,
           text is None and not r2 and any("prior v2.30" in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / STEP_MEASURES_SPEC
    changed = "the first byte beyond the bound for the capacity-limited record gives a successful close"
    current_capacity = "the first byte beyond the bound for the capacity-limited record gives a typed write refusal"
    assert original.count(current_capacity) == 1
    spec.write_text(original.replace(current_capacity, changed, 1))
    text, r1, r2 = step_measures_binding(tree)
    record("modified-close-capacity", STEP_MEASURES_SPEC, current_capacity, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and not r1 and len(r2) == 1 and STEP_MEASURES_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-25 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (step_measures_disposition(tree, step_measures_rows(tree)) == "A-1000"
            and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 033", found, held, baseline=True)



def qkind_cases(tmp, base, witnesses, failures):
    """Guard the REQ034 succession over the terminology brief, the checked spec bytes and retirement."""
    original = read_text(base, QKIND_SPEC)
    if original is None or QKIND_TAG is None or term_brief_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"question-kind-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-question-kind-floor"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    requirement = QKIND_REPLACES[0]
    held = (qkind_binding(tree) == (None, [], []) and not before_findings
            and len(prior[requirement]["scenarios"]) == 215)
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "prior 034 has 215 scenarios",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{QKIND_SPEC}"
    row = (f"| A-999 | 2026-11-25 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{QKIND_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-25 | `{later}` | "
    citations = (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{QKIND_TAG}` | `git revert {later}` | — |\n"),
    )
    for state, prefix, expected in (("pending", pending, None), ("adopted", pending + row, original)):
        for name, citation in citations:
            ledger.write_text(prefix + citation)
            text, r1, r2 = qkind_binding(tree)
            record(f"{state}-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
                   "an unrelated row does not claim this adoption", r1 + r2,
                   text == expected and not r1 and not r2, baseline=True)

    ledger.write_text(pending + row)
    after, after_findings = census(tree)
    effective = after["POLARIS"]
    held = (qkind_binding(tree) == (original, [], []) and not after_findings
            and len(effective[requirement]["scenarios"]) == 220
            and set(prior) == set(effective)
            and all(prior[other] == body for other, body in effective.items() if other != requirement))
    record("adopted", AGENT_ADOPTIONS, "<no row>", row, "only 034 moves from 215 to 220 scenarios",
           after_findings, held, baseline=True)

    for name, old, new, detail in (
        ("duplicate-row", row, row + row, "seven-column"),
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", QKIND_TAG, QKIND_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = qkind_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    predecessor = next(line for line in pending.splitlines(keepends=True) if is_term_brief_row(line))
    ledger.write_text(pending.replace(predecessor, "", 1) + row)
    text, r1, r2 = qkind_binding(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, predecessor, "", "R1 requires effective v2.29", r1 + r2,
           text is None and not r2 and any("prior v2.29" in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / QKIND_SPEC
    changed = "the major units are the whole repository, named `.`, with no listed file"
    current_capacity = "the major units are the whole repository, named `.`, with every listed file"
    assert original.count(current_capacity) == 1
    spec.write_text(original.replace(current_capacity, changed, 1))
    text, r1, r2 = qkind_binding(tree)
    record("modified-major-units", QKIND_SPEC, current_capacity, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and not r1 and len(r2) == 1 and QKIND_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-25 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (qkind_disposition(tree, qkind_rows(tree)) == "A-1000"
            and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)

def figplan_cases(tmp, base, witnesses, failures):
    """Guard the REQ034 succession over the question-kind floor, the checked spec bytes and retirement."""
    original = read_text(base, FIGPLAN_SPEC)
    if original is None or FIGPLAN_TAG is None or qkind_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"figure-plan-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-figure-plan"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    requirement = FIGPLAN_REPLACES[0]
    held = (figplan_binding(tree) == (None, [], []) and not before_findings
            and len(prior[requirement]["scenarios"]) == 220)
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "prior 034 has 220 scenarios",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{FIGPLAN_SPEC}"
    row = (f"| A-999 | 2026-11-25 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{FIGPLAN_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-25 | `{later}` | "
    citations = (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{FIGPLAN_TAG}` | `git revert {later}` | — |\n"),
    )
    for state, prefix, expected in (("pending", pending, None), ("adopted", pending + row, original)):
        for name, citation in citations:
            ledger.write_text(prefix + citation)
            text, r1, r2 = figplan_binding(tree)
            record(f"{state}-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
                   "an unrelated row does not claim this adoption", r1 + r2,
                   text == expected and not r1 and not r2, baseline=True)

    ledger.write_text(pending + row)
    after, after_findings = census(tree)
    effective = after["POLARIS"]
    held = (figplan_binding(tree) == (original, [], []) and not after_findings
            and len(effective[requirement]["scenarios"]) == 232
            and set(prior) == set(effective)
            and all(prior[other] == body for other, body in effective.items() if other != requirement))
    record("adopted", AGENT_ADOPTIONS, "<no row>", row, "only 034 moves from 220 to 232 scenarios",
           after_findings, held, baseline=True)

    for name, old, new, detail in (
        ("duplicate-row", row, row + row, "seven-column"),
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", FIGPLAN_TAG, FIGPLAN_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = figplan_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    predecessor = next(line for line in pending.splitlines(keepends=True) if is_qkind_row(line))
    ledger.write_text(pending.replace(predecessor, "", 1) + row)
    text, r1, r2 = figplan_binding(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, predecessor, "", "R1 requires effective v2.32", r1 + r2,
           text is None and not r2 and any("prior v2.32" in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / FIGPLAN_SPEC
    changed = "at most four nodes and at most one edge fewer than it has nodes"
    current_capacity = "at most three nodes and at most one edge fewer than it has nodes"
    assert original.count(current_capacity) == 1
    spec.write_text(original.replace(current_capacity, changed, 1))
    text, r1, r2 = figplan_binding(tree)
    record("modified-floor", FIGPLAN_SPEC, current_capacity, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and not r1 and len(r2) == 1 and FIGPLAN_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-25 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (figplan_disposition(tree, figplan_rows(tree)) == "A-1000"
            and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def walk_cases(tmp, base, witnesses, failures):
    """Guard the figure walks' row, its predecessor, its checked spec bytes and its retirement.

    The selftest base is projected onto the history before the v2.36 source-example advice, so the
    v2.39 import facts this version stands on is not effective there either, and the figure walks
    can only be pending or refused here; `--check` on the delivered tree witnesses it effective.
    """
    original = read_text(base, WALK_SPEC)
    if original is None or WALK_TAG is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"figure-walks-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-figure-walks"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    held = walk_binding(tree) == (None, [], []) and not before_findings
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "no figure walks binding and a clean census",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{WALK_SPEC}"
    row = (f"| A-999 | 2026-11-28 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{WALK_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-28 | `{later}` | "
    for name, citation in (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{WALK_TAG}` | `git revert {later}` | — |\n"),
    ):
        ledger.write_text(pending + citation)
        text, r1, r2 = walk_binding(tree)
        record(f"pending-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
               "an unrelated row does not claim this adoption", r1 + r2,
               text is None and not r1 and not r2, baseline=True)

    # The row without an effective v2.39 predecessor is refused, and the census keeps the predecessor.
    ledger.write_text(pending + row)
    text, r1, r2 = walk_binding(tree)
    after, after_findings = census(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, "<no row>", row, "R1 requires effective v2.39", r1 + r2,
           text is None and not r2 and any("prior v2.39 import facts" in finding for finding in r1)
           and after["POLARIS"] == prior)

    for name, old, new, detail in (
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", WALK_TAG, WALK_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = walk_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / WALK_SPEC
    current_bound = "is a list of 2 to 12 steps in reading order"
    changed = "is a list of 2 to 16 steps in reading order"
    assert original.count(current_bound) == 1
    spec.write_text(original.replace(current_bound, changed, 1))
    text, r1, r2 = walk_binding(tree)
    record("modified-step-bound", WALK_SPEC, current_bound, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and len(r2) == 1 and WALK_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-28 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (walk_disposition(tree, walk_rows(tree)) == "A-1000"
            and walk_binding(tree) == (None, [], []) and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def migbound_cases(tmp, base, witnesses, failures):
    """Guard the migration bounds' row, its predecessor, its checked spec bytes and its retirement.

    The selftest base is projected onto the history before the v2.36 source-example advice, so the
    v2.42 test-name recognizers this version stands on is not effective there either, and the migration bounds
    can only be pending or refused here; `--check` on the delivered tree witnesses it effective.
    """
    original = read_text(base, MIGBOUND_SPEC)
    if original is None or MIGBOUND_TAG is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"migration-bounds-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-migration-bounds"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    held = migbound_binding(tree) == (None, [], []) and not before_findings
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "no migration bounds binding and a clean census",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{MIGBOUND_SPEC}"
    row = (f"| A-999 | 2026-11-28 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{MIGBOUND_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-28 | `{later}` | "
    for name, citation in (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{MIGBOUND_TAG}` | `git revert {later}` | — |\n"),
    ):
        ledger.write_text(pending + citation)
        text, r1, r2 = migbound_binding(tree)
        record(f"pending-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
               "an unrelated row does not claim this adoption", r1 + r2,
               text is None and not r1 and not r2, baseline=True)

    # The row without an effective v2.42 predecessor is refused, and the census keeps the predecessor.
    ledger.write_text(pending + row)
    text, r1, r2 = migbound_binding(tree)
    after, after_findings = census(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, "<no row>", row, "R1 requires effective v2.42", r1 + r2,
           text is None and not r2 and any("prior v2.42 test-name recognizers" in finding for finding in r1)
           and after["POLARIS"] == prior)

    for name, old, new, detail in (
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", MIGBOUND_TAG, MIGBOUND_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = migbound_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / MIGBOUND_SPEC
    current_bound = "number at most 200 in all, across every diagram,"
    changed = "number at most 220 in all, across every diagram,"
    assert original.count(current_bound) == 1
    spec.write_text(original.replace(current_bound, changed, 1))
    text, r1, r2 = migbound_binding(tree)
    record("modified-model-total", MIGBOUND_SPEC, current_bound, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and len(r2) == 1 and MIGBOUND_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-28 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (migbound_disposition(tree, migbound_rows(tree)) == "A-1000"
            and migbound_binding(tree) == (None, [], []) and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def rough_cases(tmp, base, witnesses, failures):
    """Guard the rough-edge markers' row, its predecessor, its checked spec bytes and its retirement.

    The selftest base is projected onto the history before the v2.36 source-example advice, so the
    v2.43 migration bounds this version stands on is not effective there either, and the rough-edge markers
    can only be pending or refused here; `--check` on the delivered tree witnesses it effective.
    """
    original = read_text(base, ROUGH_SPEC)
    if original is None or ROUGH_TAG is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"rough-edges-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-rough-edges"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    held = rough_binding(tree) == (None, [], []) and not before_findings
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "no rough-edge markers binding and a clean census",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{ROUGH_SPEC}"
    row = (f"| A-999 | 2026-11-28 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{ROUGH_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-28 | `{later}` | "
    for name, citation in (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{ROUGH_TAG}` | `git revert {later}` | — |\n"),
    ):
        ledger.write_text(pending + citation)
        text, r1, r2 = rough_binding(tree)
        record(f"pending-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
               "an unrelated row does not claim this adoption", r1 + r2,
               text is None and not r1 and not r2, baseline=True)

    # The row without an effective v2.43 predecessor is refused, and the census keeps the predecessor.
    ledger.write_text(pending + row)
    text, r1, r2 = rough_binding(tree)
    after, after_findings = census(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, "<no row>", row, "R1 requires effective v2.43", r1 + r2,
           text is None and not r2 and any("prior v2.43 migration bounds" in finding for finding in r1)
           and after["POLARIS"] == prior)

    for name, old, new, detail in (
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", ROUGH_TAG, ROUGH_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = rough_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / ROUGH_SPEC
    current_bound = "the recognizer reads and lists at most 1000 files"
    changed = "the recognizer reads and lists at most 1001 files"
    assert original.count(current_bound) == 1
    spec.write_text(original.replace(current_bound, changed, 1))
    text, r1, r2 = rough_binding(tree)
    record("modified-model-total", ROUGH_SPEC, current_bound, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and len(r2) == 1 and ROUGH_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-28 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (rough_disposition(tree, rough_rows(tree)) == "A-1000"
            and rough_binding(tree) == (None, [], []) and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def tnames_cases(tmp, base, witnesses, failures):
    """Guard the test-name recognizers' row, its predecessor, its checked spec bytes and its retirement.

    The selftest base is projected onto the history before the v2.36 source-example advice, so the
    v2.39 import facts and the v2.40 figure walks this version stands on are not effective there either,
    and the test-name recognizers can only be pending or refused here; `--check` on the delivered tree witnesses it effective.
    """
    original = read_text(base, TNAMES_SPEC)
    if original is None or TNAMES_TAG is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"test-names-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-test-names"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    held = tnames_binding(tree) == (None, [], []) and not before_findings
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "no test-name recognizers binding and a clean census",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{TNAMES_SPEC}"
    row = (f"| A-999 | 2026-11-28 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{TNAMES_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-28 | `{later}` | "
    for name, citation in (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{TNAMES_TAG}` | `git revert {later}` | — |\n"),
    ):
        ledger.write_text(pending + citation)
        text, r1, r2 = tnames_binding(tree)
        record(f"pending-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
               "an unrelated row does not claim this adoption", r1 + r2,
               text is None and not r1 and not r2, baseline=True)

    # The row without an effective v2.40 predecessor is refused, and the census keeps the predecessor.
    ledger.write_text(pending + row)
    text, r1, r2 = tnames_binding(tree)
    after, after_findings = census(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, "<no row>", row, "R1 requires effective v2.40", r1 + r2,
           text is None and not r2 and any("prior v2.40 figure walks" in finding for finding in r1)
           and after["POLARIS"] == prior)

    for name, old, new, detail in (
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", TNAMES_TAG, TNAMES_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = tnames_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / TNAMES_SPEC
    current_bound = "each recognizer reads and lists at most 250 files"
    changed = "each recognizer reads and lists at most 251 files"
    assert original.count(current_bound) == 1
    spec.write_text(original.replace(current_bound, changed, 1))
    text, r1, r2 = tnames_binding(tree)
    record("modified-limit", TNAMES_SPEC, current_bound, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and len(r2) == 1 and TNAMES_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-28 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (tnames_disposition(tree, tnames_rows(tree)) == "A-1000"
            and tnames_binding(tree) == (None, [], []) and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def impfacts_cases(tmp, base, witnesses, failures):
    """Guard the import facts' row, its predecessor, its checked spec bytes and its retirement.

    The selftest base is projected onto the history before the v2.36 source-example advice, so the
    v2.38 migration parity this version stands on is not effective there either, and the import facts
    can only be pending or refused here; `--check` on the delivered tree witnesses it effective.
    """
    original = read_text(base, IMPFACTS_SPEC)
    if original is None or IMPFACTS_TAG is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"import-facts-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-import-facts"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    held = impfacts_binding(tree) == (None, [], []) and not before_findings
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "no import facts binding and a clean census",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{IMPFACTS_SPEC}"
    row = (f"| A-999 | 2026-11-28 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{IMPFACTS_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-28 | `{later}` | "
    for name, citation in (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{IMPFACTS_TAG}` | `git revert {later}` | — |\n"),
    ):
        ledger.write_text(pending + citation)
        text, r1, r2 = impfacts_binding(tree)
        record(f"pending-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
               "an unrelated row does not claim this adoption", r1 + r2,
               text is None and not r1 and not r2, baseline=True)

    # The row without an effective v2.38 predecessor is refused, and the census keeps the predecessor.
    ledger.write_text(pending + row)
    text, r1, r2 = impfacts_binding(tree)
    after, after_findings = census(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, "<no row>", row, "R1 requires effective v2.38", r1 + r2,
           text is None and not r2 and any("prior v2.38 migration parity" in finding for finding in r1)
           and after["POLARIS"] == prior)

    for name, old, new, detail in (
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", IMPFACTS_TAG, IMPFACTS_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = impfacts_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / IMPFACTS_SPEC
    current_bound = "with its object bound set to 262,144 bytes"
    changed = "with its object bound set to 524,288 bytes"
    assert original.count(current_bound) == 1
    spec.write_text(original.replace(current_bound, changed, 1))
    text, r1, r2 = impfacts_binding(tree)
    record("modified-read-bound", IMPFACTS_SPEC, current_bound, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and len(r2) == 1 and IMPFACTS_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-28 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (impfacts_disposition(tree, impfacts_rows(tree)) == "A-1000"
            and impfacts_binding(tree) == (None, [], []) and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def migpar_cases(tmp, base, witnesses, failures):
    """Guard the migration parity's row, its predecessor, its checked spec bytes and its retirement.

    The selftest base is projected onto the history before the v2.36 source-example advice, so the
    v2.37 choice floor this version stands on is not effective there either, and the migration parity
    can only be pending or refused here; `--check` on the delivered tree witnesses it effective.
    """
    original = read_text(base, MIGPAR_SPEC)
    if original is None or MIGPAR_TAG is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"migration-parity-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-migration-parity"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    held = migpar_binding(tree) == (None, [], []) and not before_findings
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "no migration parity binding and a clean census",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{MIGPAR_SPEC}"
    row = (f"| A-999 | 2026-11-28 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{MIGPAR_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-28 | `{later}` | "
    for name, citation in (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{MIGPAR_TAG}` | `git revert {later}` | — |\n"),
    ):
        ledger.write_text(pending + citation)
        text, r1, r2 = migpar_binding(tree)
        record(f"pending-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
               "an unrelated row does not claim this adoption", r1 + r2,
               text is None and not r1 and not r2, baseline=True)

    # The row without an effective v2.37 predecessor is refused, and the census keeps the predecessor.
    ledger.write_text(pending + row)
    text, r1, r2 = migpar_binding(tree)
    after, after_findings = census(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, "<no row>", row, "R1 requires effective v2.37", r1 + r2,
           text is None and not r2 and any("prior v2.37 choice floor" in finding for finding in r1)
           and after["POLARIS"] == prior)

    for name, old, new, detail in (
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", MIGPAR_TAG, MIGPAR_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = migpar_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / MIGPAR_SPEC
    changed = "is not itself rendered as a withheld item, both of whose end nodes renders"
    current_capacity = "is not itself rendered as a withheld item, either of whose end nodes renders"
    assert original.count(current_capacity) == 1
    spec.write_text(original.replace(current_capacity, changed, 1))
    text, r1, r2 = migpar_binding(tree)
    record("modified-exception", MIGPAR_SPEC, current_capacity, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and len(r2) == 1 and MIGPAR_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-28 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (migpar_disposition(tree, migpar_rows(tree)) == "A-1000"
            and migpar_binding(tree) == (None, [], []) and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def choice_cases(tmp, base, witnesses, failures):
    """Guard the choice floor's row, its predecessor, its checked spec bytes and its retirement.

    The selftest base is projected onto the history before the v2.36 source-example advice, whose
    effectiveness needs its protected Git tag, so the choice floor can only be pending or refused here;
    `--check` on the delivered tree witnesses it effective.
    """
    original = read_text(base, CHOICE_SPEC)
    if original is None or CHOICE_TAG is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"choice-floor-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-choice-floor"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    held = choice_binding(tree) == (None, [], []) and not before_findings
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "no choice floor binding and a clean census",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{CHOICE_SPEC}"
    row = (f"| A-999 | 2026-11-25 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{CHOICE_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-25 | `{later}` | "
    for name, citation in (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{CHOICE_TAG}` | `git revert {later}` | — |\n"),
    ):
        ledger.write_text(pending + citation)
        text, r1, r2 = choice_binding(tree)
        record(f"pending-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
               "an unrelated row does not claim this adoption", r1 + r2,
               text is None and not r1 and not r2, baseline=True)

    # The row without an effective v2.36 predecessor is refused, and the census keeps the predecessor.
    ledger.write_text(pending + row)
    text, r1, r2 = choice_binding(tree)
    after, after_findings = census(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, "<no row>", row, "R1 requires effective v2.36", r1 + r2,
           text is None and not r2 and any("prior v2.36 source-example advice" in finding for finding in r1)
           and after["POLARIS"] == prior)

    for name, old, new, detail in (
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", CHOICE_TAG, CHOICE_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = choice_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / CHOICE_SPEC
    changed = "A group with fewer than four items on record is one advisory"
    current_capacity = "A group with fewer than three items on record is one advisory"
    assert original.count(current_capacity) == 1
    spec.write_text(original.replace(current_capacity, changed, 1))
    text, r1, r2 = choice_binding(tree)
    record("modified-floor", CHOICE_SPEC, current_capacity, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and len(r2) == 1 and CHOICE_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-25 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (choice_disposition(tree, choice_rows(tree)) == "A-1000"
            and choice_binding(tree) == (None, [], []) and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)


def vbase_cases(tmp, base, witnesses, failures):
    """Guard the REQ034 succession over the figure plan, the checked spec bytes and retirement."""
    original = read_text(base, VBASE_SPEC)
    if original is None or VBASE_TAG is None or figplan_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"derived-base-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-derived-base-views"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    requirement = VBASE_REPLACES[0]
    held = (vbase_binding(tree) == (None, [], []) and not before_findings
            and len(prior[requirement]["scenarios"]) == 232)
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "prior 034 has 232 scenarios",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{VBASE_SPEC}"
    row = (f"| A-999 | 2026-11-25 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{VBASE_TAG}` |\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-25 | `{later}` | "
    citations = (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\n"),
        ("tag-in-reason", unrelated + f"Other work | `{VBASE_TAG}` | `git revert {later}` | — |\n"),
    )
    for state, prefix, expected in (("pending", pending, None), ("adopted", pending + row, original)):
        for name, citation in citations:
            ledger.write_text(prefix + citation)
            text, r1, r2 = vbase_binding(tree)
            record(f"{state}-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
                   "an unrelated row does not claim this adoption", r1 + r2,
                   text == expected and not r1 and not r2, baseline=True)

    ledger.write_text(pending + row)
    after, after_findings = census(tree)
    effective = after["POLARIS"]
    held = (vbase_binding(tree) == (original, [], []) and not after_findings
            and effective == prior and len(effective[requirement]["scenarios"]) == 232)
    record("historical-row", AGENT_ADOPTIONS, "<no row>", row,
           "structural A-267 validation keeps tagged v2.33 selected", after_findings, held, baseline=True)

    for name, old, new, detail in (
        ("duplicate-row", row, row + row, "seven-column"),
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", VBASE_TAG, VBASE_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = vbase_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    predecessor = next(line for line in pending.splitlines(keepends=True) if is_figplan_row(line))
    ledger.write_text(pending.replace(predecessor, "", 1) + row)
    text, r1, r2 = vbase_binding(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, predecessor, "", "R1 requires effective v2.33", r1 + r2,
           text is None and not r2 and any("prior v2.33" in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / VBASE_SPEC
    changed = "double border, two lines 4 px apart"
    current_capacity = "double border, two lines 3 px apart"
    assert original.count(current_capacity) == 1
    spec.write_text(original.replace(current_capacity, changed, 1))
    text, r1, r2 = vbase_binding(tree)
    record("modified-border", VBASE_SPEC, current_capacity, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and not r1 and len(r2) == 1 and VBASE_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-25 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (vbase_disposition(tree, vbase_rows(tree)) == "A-1000"
            and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)

def covhold_cases(tmp, base, witnesses, failures):
    """The v2.28 pending-to-adopted transition over v2.18's 035, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, COVHOLD_SPEC)
    if original is None or treeread_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "covhold-text"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_covhold_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = COVHOLD_REPLACES[0]
    held = (covhold_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == COVHOLD_PREDECESSOR_SCENARIOS)
    record("covhold-pending", AGENT_ADOPTIONS, "<no v2.28 row>", "<unchanged>",
           "landed package alone keeps v2.28 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-22 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{COVHOLD_SPEC}) "
           f"| Selftest | `git revert {oid}` | `{COVHOLD_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (covhold_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == COVHOLD_PREDECESSOR_SCENARIOS + COVHOLD_SCENARIOS_ADDED
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("covhold-adopted", AGENT_ADOPTIONS, "<no v2.28 row>", row,
           "v2.28 replaces exactly 035 (40 to 46 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", COVHOLD_TAG, COVHOLD_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{COVHOLD_SPEC})", f"/blob/other/{COVHOLD_SPEC})"),
                           ("bad-date", "2026-11-22", "2026-99-22"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = covhold_binding(tree)
        record(f"covhold-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-22 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (covhold_disposition(tree, covhold_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("covhold-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.18 035", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_treeread_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_treeread_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = covhold_binding(tree)
        record("covhold-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.18 is not in force", r1 + r2,
               effective is None and any("prior v2.18" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in COVHOLD_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = covhold_binding(tree)
        subject.write_bytes(previous)
        record(f"covhold-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / COVHOLD_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-033"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-033"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("covhold-union-changed", COVHOLD_UNION, '"REQ-polaris-generation-033"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(COVHOLD_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(COVHOLD_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("covhold-status-route-missing", STATUS, COVHOLD_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("coverage hold v2.28" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(COVHOLD_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("covhold-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "033"),
        ("renamed", "### Requirement: Fresh-context review in the operator-agent mode",
         "### Requirement: Fresh-context review held for coverage"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(predecessor, mutant, COVHOLD_REPLACES)
        b, names = compose_figure_by_name(predecessor, mutant, COVHOLD_REPLACES)
        record(f"covhold-compose-{name}", COVHOLD_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == predecessor), False)


def term_brief_cases(tmp, base, witnesses, failures):
    """Exercise pending, activation, drift and rollback with isolated records."""
    from unittest.mock import patch

    original = read_text(base, TERM_BRIEF_SPEC)
    if original is None or worth_binding(base)[0] is None:
        return

    def record(name, path, old, new, expected, findings, passed, control=False):
        case = f"term-brief-{name}"
        outcome = ("held" if control else "killed") if passed else "SURVIVED"
        witnesses.append({"mutant": case, "path": path, "old": old, "new": new,
                          "expected": expected, "failed": findings, "outcome": outcome})
        if not passed:
            failures.append(case)

    tree = Path(tmp) / "term-brief"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    before_pop, before_findings = census(tree)
    before = before_pop["POLARIS"]
    ident = TERM_BRIEF_REPLACES[0]
    record("pending", AGENT_ADOPTIONS, "", "", "candidate only; v2.26 stays effective", before_findings,
           not before_findings and term_brief_binding(tree) == (None, [], [])
           and len(before[ident]["scenarios"]) == 214, True)

    tag = "polaris-dossier-brief-terminology-selftest"
    oid = "0123456789abcdef" * 2 + "01234567"
    link = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{TERM_BRIEF_SPEC}"
    row = (f"| A-999 | 2026-11-25 | `{oid}` | [spec]({link}) "
           f"| Selftest | `git revert {oid}` | `{tag}` |\n")
    later = "f" * 40
    citation = (f"| A-1001 | 2026-11-25 | `{later}` | [prior spec]({link}) "
                f"| `{tag}` | `git revert {later}` | — |\n")
    ledger.write_text(pending + citation)
    effective, records, subjects = term_brief_binding(tree)
    record("pending-citation", AGENT_ADOPTIONS, "", citation, "prior snapshot citation stays pending",
           records + subjects, effective is None and not records and not subjects, True)
    ledger.write_text(pending + row)

    with patch.object(sys.modules[__name__], "TERM_BRIEF_TAG", tag):
        after_pop, after_findings = census(tree)
        after = after_pop["POLARIS"]
        expected = polaris_expected(tree, after_findings)
        record("activated", AGENT_ADOPTIONS, "", row, "only 034 changes from 214 to 215", after_findings,
               not after_findings and term_brief_binding(tree) == (original, [], [])
               and set(after) == set(before) == set(expected[2])
               and sum(len(item["scenarios"]) for item in after.values()) == expected[1]
               and after[ident]["name"] == before[ident]["name"]
               and len(after[ident]["scenarios"]) == 215
               and all(value == after[key] for key, value in before.items() if key != ident), True)
        ledger.write_text(pending + row + citation)
        effective, records, subjects = term_brief_binding(tree)
        record("adopted-citation", AGENT_ADOPTIONS, "", citation,
               "prior snapshot citation and tag outside its column do not add an adoption",
               records + subjects, effective == original and not records and not subjects, True)

        row_controls = (
            ("duplicate", row, row + row, "expected one seven-column"),
            ("malformed-tagged", "| Selftest | ", "| ", "expected one seven-column"),
            ("wrong-tag", f"`{tag}`", "`other`", "malformed adoption"),
            ("wrong-revert", f"git revert {oid}", "git revert other", "revert does not name"),
            ("wrong-link", f"/blob/{oid}/", "/blob/other/", "does not name"),
        )
        for name, old, new, diagnostic in row_controls:
            assert row.count(old) == 1
            ledger.write_text(pending + row.replace(old, new, 1))
            text, records, subjects = term_brief_binding(tree)
            record(name, AGENT_ADOPTIONS, old, new, diagnostic, records + subjects,
                   text is None and not subjects and any(diagnostic in item for item in records))

        old_prior = next(line for line in pending.splitlines(keepends=True) if is_worth_row(line))
        ledger.write_text(pending.replace(old_prior, "", 1) + row)
        text, records, subjects = term_brief_binding(tree)
        record("missing-predecessor", AGENT_ADOPTIONS, old_prior, "", "prior v2.26 adoption is required",
               records + subjects, text is None and not subjects and any("prior v2.26" in item for item in records))

        ledger.write_text(pending + row)
        subject = tree / TERM_BRIEF_SPEC
        body = subject.read_bytes()
        subject.write_bytes(body + b"\n")
        text, records, subjects = term_brief_binding(tree)
        subject.write_bytes(body)
        record("changed-subject", TERM_BRIEF_SPEC, "", "\n", "R2 subject drift",
               records + subjects, text is None and not records and any("reviewed subject" in item for item in subjects))

        union = tree / TERM_BRIEF_UNION
        old_union = union.read_text()
        old, new = '"REQ-polaris-generation-033"', '"REQ-polaris-generation-099"'
        assert old_union.count(old) == 1
        union.write_text(old_union.replace(old, new, 1))
        report = Report()
        check_generated(tree, after_pop, report)
        union.write_text(old_union)
        findings = report.findings.get("R4", [])
        record("changed-union", TERM_BRIEF_UNION, old, new, "R4 independently derived union mismatch",
               findings, any(TERM_BRIEF_UNION in item for item in findings))

        status = tree / STATUS
        prior_status = status.read_text()
        status_without_route = "".join(line for line in prior_status.splitlines(keepends=True)
                                       if not line.strip().startswith((TERM_BRIEF_STATUS_PREFIX, QKIND_STATUS_PREFIX, FIGPLAN_STATUS_PREFIX, VBASE_STATUS_PREFIX)))
        pending_total = sum(len(item["scenarios"]) for item in before.values())
        adopted_total = sum(len(item["scenarios"]) for item in after.values())
        pending_status, slots = STATUS_FIGURE.subn(
            f"{len(before)} requirements and {pending_total} scenarios in the effective composition", status_without_route)
        adopted_status_without_route, adopted_slots = STATUS_FIGURE.subn(
            f"{len(after)} requirements and {adopted_total} scenarios in the effective composition", status_without_route)
        assert slots == adopted_slots == 1
        status_route = f"\n{TERM_BRIEF_STATUS_PREFIX} is agent-adopted in A-999.\n"
        adopted_status = adopted_status_without_route + status_route
        index = tree / OPENSPEC_README
        prior_index = index.read_text()
        # The v2.32 question-kind floor stands on this brief, so while the brief is pending its routes say candidate too.
        qkind_row = next((line for line in prior_index.splitlines() if line.startswith(f"| [`{QKIND_CHANGE}`]")), None)
        base_index = prior_index
        if qkind_row is not None:
            qkind_cells = qkind_row.split(" | ")
            qkind_cells[2] = "**Candidate.** Specification version and adoption pending"
            base_index = prior_index.replace(qkind_row, " | ".join(qkind_cells), 1)
        # The v2.33 figure plan stands on v2.32, so it is candidate too.
        figplan_row = next((line for line in base_index.splitlines() if line.startswith(f"| [`{FIGPLAN_CHANGE}`]")), None)
        if figplan_row is not None:
            figplan_cells = figplan_row.split(" | ")
            figplan_cells[2] = "**Candidate.** Specification version and adoption pending"
            base_index = base_index.replace(figplan_row, " | ".join(figplan_cells), 1)
        # The v2.34 derived-base views stand on v2.33, so they are candidate too.
        vbase_row = next((line for line in base_index.splitlines() if line.startswith(f"| [`{VBASE_CHANGE}`]")), None)
        if vbase_row is not None:
            vbase_cells = vbase_row.split(" | ")
            vbase_cells[2] = "**Candidate.** Specification version and adoption pending"
            base_index = base_index.replace(vbase_row, " | ".join(vbase_cells), 1)
        index_row = next(line for line in base_index.splitlines() if line.startswith(f"| [`{TERM_BRIEF_CHANGE}`]"))
        cells = index_row.split(" | ")
        assert len(cells) == 4
        cells[2] = "**Candidate.** Specification version and adoption pending"
        pending_row = " | ".join(cells)
        pending_index = base_index.replace(index_row, pending_row, 1)
        cells[2] = f"Agent adoption in [{Path(AGENT_ADOPTIONS).name}](../{AGENT_ADOPTIONS}) and tag `{tag}`"
        adopted_row = " | ".join(cells)
        adopted_index = base_index.replace(index_row, adopted_row, 1)
        status.write_text(adopted_status)
        index.write_text(adopted_index)
        report = Report()
        check_routes(tree, after_pop, report)
        findings = report.findings.get("R5", [])
        record("adopted-routes", STATUS + " and " + OPENSPEC_README, pending_row, status_route + adopted_row,
               "both adopted routes are accepted", findings, not findings, True)

        for name, route, base_text, mutant_text, old, new, diagnostic in (
            ("missing-status-route", status, adopted_status, adopted_status_without_route, status_route, "",
             f"`{STATUS}` does not route terminology brief and its adoption A-999"),
            ("missing-index-route", index, adopted_index, pending_index, adopted_row, pending_row,
             f"`{OPENSPEC_README}` does not route terminology brief to `{AGENT_ADOPTIONS}` and its version tag"),
        ):
            route.write_text(mutant_text)
            report = Report()
            check_routes(tree, after_pop, report)
            route.write_text(base_text)
            findings = report.findings.get("R5", [])
            record(name, str(route.relative_to(tree)), old, new, diagnostic, findings, findings == [diagnostic])

        ledger.write_text(pending)
        status.write_text(pending_status)
        index.write_text(pending_index)
        for path, pending_route, adopted_route, old, new in (
            (STATUS, pending_status, pending_status + status_route, "", status_route),
            (OPENSPEC_README, pending_index, adopted_index, pending_row, adopted_row),
        ):
            route = tree / path
            route.write_text(adopted_route)
            report = Report()
            check_routes(tree, before_pop, report)
            route.write_text(pending_route)
            findings = report.findings.get("R5", [])
            diagnostic = f"`{path}` calls terminology brief adopted while it is not in force"
            record("premature-" + path.replace("/", "-"), path, old, new, diagnostic,
                   findings, findings == [diagnostic])
        status.write_text(prior_status)
        index.write_text(prior_index)

        veto = "| A-1000 | 2026-11-25 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n"
        ledger.write_text(pending + row + veto)
        reverted, findings = census(tree)
        record("veto", AGENT_ADOPTIONS, "", veto, "v2.26 restores 034 while other layers remain",
               findings, not findings and term_brief_disposition(tree, term_brief_rows(tree)) == "A-1000"
               and reverted["POLARIS"] == before, True)

        for name, old, new in (
            ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
            ("wrong-name", "### Requirement: Agent brief and mechanically checked draft",
             "### Requirement: Unrecognised terminology requirement"),
            ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\nID: " + POLARIS_ID + "099"),
        ):
            assert original.count(old) == 1, name
            mutant = original.replace(old, new, 1)
            a, ida = compose_figure_by_id(before, mutant, TERM_BRIEF_REPLACES)
            b, names = compose_figure_by_name(before, mutant, TERM_BRIEF_REPLACES)
            record(name, TERM_BRIEF_SPEC, old, new, "both parsers refuse the wrong layer",
                   ida + names, bool(ida and names and a == b == before))


def readmit_cases(tmp, base, witnesses, failures):
    """The v2.13 pending-to-adopted transition over v2.6, its ledger and byte guards, and the predecessor guard."""
    original = read_text(base, READMIT_SPEC)
    if original is None or reach_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expect, found, caught, stood):
        witnesses.append({"mutant": name, "path": rel, "old": old, "new": new,
                          "expected": expect, "failed": found,
                          "outcome": ("held" if stood else "killed") if caught else "SURVIVED"})
        if not caught:
            failures.append(name)

    tree = Path(tmp) / "declared-source-readmission"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_readmit_row(line) and not is_raw_read_row(line)
                      and not is_treeread_row(line)
                      and not is_verify_row(line) and not is_qfile_row(line) and not is_scripted_grade_row(line) and not is_step_measures_row(line) and not is_covhold_row(line) and not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line))
    ledger.write_text(pending)
    pending_pop, pending_findings = census(tree)
    predecessor = pending_pop["POLARIS"]
    ident = REACH_REPLACES[0]
    held = (readmit_binding(tree) == (None, [], []) and not pending_findings
            and len(predecessor[ident]["scenarios"]) == 11)
    record("readmit-pending", AGENT_ADOPTIONS, "<no v2.13 row>", "<unchanged>",
           "landed package alone keeps v2.13 pending", pending_findings, held, True)

    oid = "0123456789abcdef" * 2 + "01234567"
    row = (f"| A-999 | 2026-11-22 | `{oid}` | [spec](https://github.com/tzeusy-org/syzygy/blob/{oid}/{READMIT_SPEC}) "
           f"· [policy](https://github.com/tzeusy-org/syzygy/blob/{oid}/{READMIT_POLICY}) "
           f"| Selftest | `git revert {oid}` | `{READMIT_TAG}` |\n")
    ledger.write_text(pending + row)
    current_pop, current_findings = census(tree)
    current = current_pop["POLARIS"]
    held = (readmit_binding(tree) == (original, [], []) and not current_findings
            and set(current) == set(predecessor)
            and len(current[ident]["scenarios"]) == 13
            and current[ident]["name"] == predecessor[ident]["name"]
            and all(current[i] == r for i, r in predecessor.items() if i != ident))
    record("readmit-adopted", AGENT_ADOPTIONS, "<no v2.13 row>", row,
           "v2.13 replaces exactly 046 (11 to 13 scenarios)", current_findings, held, True)

    for name, old, new in (("duplicate-row", row, row + row),
                           ("wrong-tag", READMIT_TAG, READMIT_TAG + "-wrong"),
                           ("wrong-revert", f"git revert {oid}", "git revert " + "0" * 40),
                           ("missing-spec-link", f"/blob/{oid}/{READMIT_SPEC})", f"/blob/other/{READMIT_SPEC})"),
                           ("missing-policy-link", f"/blob/{oid}/{READMIT_POLICY})", f"/blob/other/{READMIT_POLICY})"),
                           ("bad-date", "2026-11-22", "2026-99-22"),
                           ("no-reason", "| Selftest |", "|  |")):
        assert old in row
        ledger.write_text(pending + row.replace(old, new, 1))
        effective, r1, r2 = readmit_binding(tree)
        record(f"readmit-{name}", AGENT_ADOPTIONS, old, new,
               "R1 refusal with no effective amendment", r1 + r2,
               effective is None and bool(r1) and not r2, False)

    veto = (f"| A-1000 | 2026-11-23 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\n")
    ledger.write_text(pending + row + veto)
    pop, found = census(tree)
    held = (readmit_disposition(tree, readmit_rows(tree)) == "A-1000" and not found
            and pop["POLARIS"] == predecessor)
    record("readmit-vetoed", AGENT_ADOPTIONS, row, veto, "restore the v2.6 046", found, held, True)
    prior_row = next((line for line in pending.splitlines(keepends=True) if is_reach_row(line)), None)
    if prior_row is not None:
        no_prior = "".join(line for line in pending.splitlines(keepends=True) if not is_reach_row(line))
        ledger.write_text(no_prior + row)
        effective, r1, r2 = readmit_binding(tree)
        record("readmit-predecessor-missing", AGENT_ADOPTIONS, prior_row, "",
               "R1 refusal while v2.6 is not in force", r1 + r2,
               effective is None and any("prior v2.6" in f for f in r1), False)

    ledger.write_text(pending + row)
    for rel in READMIT_SUBJECTS:
        subject = tree / rel
        previous = subject.read_bytes()
        subject.write_bytes(previous + b"\n")
        effective, r1, r2 = readmit_binding(tree)
        subject.write_bytes(previous)
        record(f"readmit-subject-changed-{Path(rel).name}", rel, "<end of file>", "\n",
               "R2 refusal with no effective amendment", r1 + r2,
               effective is None and not r1 and bool(r2), False)
    union = tree / READMIT_UNION
    previous = union.read_text()
    assert '"REQ-polaris-generation-048"' in previous
    union.write_text(previous.replace('"REQ-polaris-generation-048"', '"REQ-polaris-generation-099"', 1))
    report = Report()
    check_generated(tree, current_pop, report)
    union.write_text(previous)
    record("readmit-union-changed", READMIT_UNION, '"REQ-polaris-generation-048"', '"REQ-polaris-generation-099"', "R4 refusal",
           report.findings.get("R4", []), any(READMIT_UNION in f for f in report.findings.get("R4", [])), False)
    status = tree / STATUS
    previous = status.read_text()
    status.write_text("\n".join(line for line in previous.split("\n")
                                if not line.strip().startswith(READMIT_STATUS_PREFIX)))
    report = Report()
    check_routes(tree, current_pop, report)
    status.write_text(previous)
    record("readmit-status-route-missing", STATUS, READMIT_STATUS_PREFIX, "", "R5 refusal",
           report.findings.get("R5", []),
           any("declared-source re-admission v2.13" in f for f in report.findings.get("R5", [])), False)
    ledger.write_text(pending)
    report = Report()
    check_routes(tree, pending_pop, report)
    claims = [f for f in report.findings.get("R5", []) if "while it is not in force" in f]
    adopted_status = any(line.strip().startswith(READMIT_STATUS_PREFIX) and "is agent-adopted" in line
                         for line in previous.split("\n"))
    record("readmit-pending-claims-adoption", AGENT_ADOPTIONS, row, "",
           "R5 refuses an adopted route while the row is missing", claims,
           bool(claims) if adopted_status else not claims, not adopted_status)
    ledger.write_text(pending + row)

    cases = [
        ("added-section", DECLARED_SOURCE_MODIFIED, ADDED_HEADING),
        ("wrong-id", "ID: " + ident, "ID: " + POLARIS_ID + "035"),
        ("renamed", "### Requirement: Declared local-source admission",
         "### Requirement: Declared source re-admission"),
        ("second-block", "ID: " + ident, "ID: " + ident + "\n\n### Requirement: Extra\n\nID: " + POLARIS_ID + "099"),
    ]
    for name, old, new in cases:
        assert old in original, name
        mutant = original.replace(old, new, 1)
        a, ida = compose_figure_by_id(predecessor, mutant, REACH_REPLACES)
        b, names = compose_figure_by_name(predecessor, mutant, REACH_REPLACES)
        record(f"readmit-compose-{name}", READMIT_SPEC, old, new,
               "both parsers refuse without partial application", ida + names,
               bool(ida and names and a == b == predecessor), False)


def cap1_overlay_mutants():
    """Rule-6 mutants of the CAP1 overlay composition (syzygy-5oqc).

    Each guard is pinned in both methods where both carry it; `&` requires
    both findings. The prose-only mutant leaves the census unchanged, so only
    method B's composed digest (R3) and the record's source digests (R4) see
    it.
    """
    spec, record = CAP1_OVERLAY_SPEC, CAP1_OVERLAY_RECORD
    name = Path(record).name

    def both(text):
        return f"R3:CAP1 method A: overlay: {text}&CAP1 method B: overlay: {text}"
    return (
        ("cap1-overlay-scenario-removed", spec,
         _replace("#### Scenario: Correlated consent",
                  "#### Scenery: Correlated consent"), "R3"),
        ("cap1-overlay-unsigned", record, None, "R3:sign-off records"),
        ("cap1-overlay-wrong-tag", record,
         _replace(f"Tag: {CAP1_OVERLAY_CHANGE}-v1.0",
                  f"Tag: {CAP1_OVERLAY_CHANGE}-v0.9"), "R3:sign-off records"),
        ("cap1-overlay-missing", spec, None, "R3:overlay `"),
        ("cap1-overlay-replaces-other", spec,
         _replace("### Requirement: CAP1-REQ-046 — ",
                  "### Requirement: CAP1-REQ-045 — "),
         "R3:CAP1 method A: overlay replaces&CAP1 method B: overlay replaces"),
        ("cap1-overlay-dangling", FAMILY_SPECS["CAP1"],
         _replace("### Requirement: CAP1-REQ-046 — ",
                  "### Requirement: CAP1-REQ-049 — "),
         "R3:CAP1 method A: overlay: CAP1-REQ-046 is dangling"
         "&CAP1 method B: overlay: CAP1-REQ-046 is dangling"),
        ("cap1-overlay-added-section", spec,
         _replace(CAP1_OVERLAY_SECTION, ADDED_HEADING), both("level-2 headings")),
        ("cap1-overlay-delta-heading", spec,
         lambda t: t + "\n### REMOVED Requirements\n", both("heading `###")),
        ("cap1-overlay-carriage-return", spec, _replace("\n", "\r\n"),
         both("carries a carriage return")),
        ("cap1-overlay-bom", spec, lambda t: "\ufeff" + t, both("carries U+FEFF")),
        ("cap1-overlay-fenced-header", spec,
         lambda t: t + "\n```\n### Requirement: CAP1-REQ-099 — x\n```\n",
         both("a requirement header inside a fence")),
        ("cap1-overlay-prose-only", spec, _replace(" SHALL ", "  SHALL "),
         "R3:composed bytes do not hash"),
        ("cap1-overlay-composed-digest", CAP1_OVERLAY_DEPS,
         lambda t: re.sub(r'("composed_spec_sha256": ")([0-9a-f])',
                          lambda m: m.group(1) + ("0" if m.group(2) != "0"
                                                  else "1"), t, 1),
         "R3:composed bytes do not hash"),
        ("cap1-overlay-deps-count", CAP1_OVERLAY_DEPS,
         _replace('"requirement_count": 42', '"requirement_count": 43'),
         "R4:requirement_count"),
        ("cap1-overlay-adoption-figure", CAP1_OVERLAY_ADOPTION,
         _replace("and 57 scenarios", "and 47 scenarios"), "R4:states"),
        ("cap1-overlay-route-row", OPENSPEC_README, _replace(name, "X.md", -1),
         f"R5:`{CAP1_OVERLAY_CHANGE}` row"),
        ("cap1-overlay-status-citation", STATUS, _replace(name, "X.md", -1),
         f"R5:cites no terminal record `{name}`"),
    )


def cap1_root_mutants():
    """Refuse source drift and premature CAP1 candidate binding or routing."""
    oid = "a" * 40
    repo = "https://github.com/tzeusy-org/syzygy/blob/"
    links = " ".join(f"[candidate]({repo}{oid}/{path})" for path in CAP1_ROOT_SUBJECTS)

    def row(text, source, changed=links, tag="—"):
        return text.rstrip("\n") + (
            f"\n| A-9999 | 2026-11-27 | `{source}` | {changed} | Why | "
            f"`git revert {source}` | {tag} |\n")

    def status_route(text, state, separator=" ", suffix=""):
        return text.rstrip("\n") + (
            f"\n\n[CAP1 root adjudication]({CAP1_ROOT_HOME}/)"
            f"{separator}is {state}.{suffix}\n")

    def status_table(text, state, *, outer_pipes=True, other_row=""):
        row = f"[CAP1 root adjudication]({CAP1_ROOT_HOME}/) | {state} | Review packet"
        if outer_pipes:
            row = f"| {row} |"
        return text.rstrip("\n") + (
            f"\n\n| Step | State | Owning record |\n| --- | --- | --- |\n{row}\n{other_row}")

    def premature_route(text):
        return "".join(line.replace("**Candidate.**", "**Adopted.**")
                       .replace(CAP1_ROOT_INDEX_STAGE, "**Adopted.**")
                       if f"`{CAP1_ROOT_CHANGE}`" in line else line
                       for line in text.splitlines(keepends=True))

    return (
        ("cap1-root-candidate-spec-drift", CAP1_ROOT_SPEC,
         _replace(" SHALL ", "  SHALL "), "R4:differs from the reviewed candidate"),
        ("cap1-root-candidate-coverage-drift", CAP1_ROOT_COVERAGE,
         lambda text: text + "\n", "R4:differs from the reviewed candidate"),
        ("cap1-root-stale-projection-count", CAP1_ROOT_PROJECTION,
         _replace('"consequences": 87', '"consequences": 88'),
         "R4:stale prospective CAP1 projection"),
        ("cap1-root-candidate-premature-adoption", AGENT_ADOPTIONS,
         lambda text: row(text, oid), "R3:root adjudication: expected exactly one version record"),
        ("cap1-root-candidate-partial-own-snapshot", AGENT_ADOPTIONS,
         lambda text: row(text, oid, f"[006]({repo}{oid}/{CAP1_ROOT_SPEC})"),
         "R3:root adjudication: expected exactly one version record"),
        ("cap1-root-candidate-tag-without-own-snapshot", AGENT_ADOPTIONS,
         lambda text: row(text, "b" * 40, tag=f"`{CAP1_ROOT_CHANGE}-v999.999`"),
         "R3:root adjudication: expected exactly one version record"),
        ("cap1-root-candidate-citation-only", AGENT_ADOPTIONS,
         lambda text: row(text, "b" * 40), "R3=0"),
        ("cap1-root-candidate-premature-route", OPENSPEC_README,
         premature_route, "R5:route the CAP1 candidate or exact conditional record"),
        ("cap1-root-candidate-wrong-index-target", OPENSPEC_README,
         _replace(f"`](changes/{CAP1_ROOT_CHANGE})", f"`](changes/{CAP1_OVERLAY_CHANGE})"),
         "R5:route the CAP1 candidate or exact conditional record"),
        ("cap1-root-candidate-premature-status", STATUS,
         lambda text: status_route(
             text, "adopted. CAP1-REQ-006 now routes under RFC1-21"),
         "R5:keep CAP1 root-adjudication pending until effective"),
        ("cap1-root-candidate-wrapped-premature-status", STATUS,
         lambda text: status_route(
             text, "adopted. CAP1-REQ-006 now routes under RFC1-21", separator="\n"),
         "R5:keep CAP1 root-adjudication pending until effective"),
        ("cap1-root-candidate-neutral-status-citation", STATUS,
         lambda text: status_route(text, "a candidate"), "R5=0"),
        ("cap1-root-candidate-status-other-sentence", STATUS,
         lambda text: status_route(
             text, "a historical candidate",
             suffix=" The prior P-109 version is adopted; its CAP1-REQ-046 stays effective."),
         "R5=0"),
        ("cap1-root-candidate-status-block-boundary", STATUS,
         lambda text: status_route(text, "adopted", separator="\n\n"), "R5=0"),
        ("cap1-root-candidate-premature-status-row", STATUS,
         lambda text: status_table(text, "**Adopted.**"),
         "R5:keep CAP1 root-adjudication pending until effective"),
        ("cap1-root-candidate-premature-status-epistemic-row", STATUS,
         lambda text: status_table(text, "[Observed] **Adopted.**"),
         "R5:keep CAP1 root-adjudication pending until effective"),
        ("cap1-root-candidate-premature-status-borderless-row", STATUS,
         lambda text: status_table(text, "**Adopted.**", outer_pipes=False),
         "R5:keep CAP1 root-adjudication pending until effective"),
        ("cap1-root-candidate-neutral-status-row-with-adopted-sibling", STATUS,
         lambda text: status_table(
             text, "[Observed] **Candidate.**", outer_pipes=False,
             other_row=f"| [Prior P-109]({CHANGES}/{CAP1_OVERLAY_CHANGE}/) | "
             "[Observed] **Adopted.** | P-109 owning record |\n"), "R5=0"),
        ("cap1-root-signed-base-coverage-drift", CAP1_HISTORIC_COVERAGE,
         _replace("| covered |", "| Unknown |"), "R4:differs from the signed predecessor"),
        ("cap1-root-signed-consent-coverage-drift", CAP1_CONSENT_COVERAGE,
         _replace("| covered |", "| Unknown |"), "R4:differs from the signed predecessor"),
    )


def cap1_root_binding_cases(tmp, witnesses, failures):
    """Exercise the binding seam with real Git refs and a minimal fixture."""
    root = Path(tmp) / "cap1-binding"
    root.mkdir()

    def git(*args):
        options = ("core.hooksPath=/dev/null", "user.name=CAP1 fixture",
                   "user.email=fixture@example.invalid", "commit.gpgsign=false",
                   "tag.gpgsign=false", "init.templateDir=")
        config = [arg for option in options for arg in ("-c", option)]
        fixture_time = "2026-11-27T00:00:00Z"
        env = {**os.environ, "GIT_AUTHOR_DATE": fixture_time, "GIT_COMMITTER_DATE": fixture_time}
        return subprocess.check_output(["git", *config, *args], cwd=root, env=env, text=True).strip()

    def commit(message):
        git("add", "--all")
        git("commit", "--quiet", "-m", message)
        return git("rev-parse", "HEAD")

    def write(path, text):
        target = root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")

    def check(name, path, old, new, expected, reason=None):
        global _CAP1_SELFTEST_GIT_ROOT
        saved = _CAP1_SELFTEST_GIT_ROOT
        try:
            _CAP1_SELFTEST_GIT_ROOT = None
            state, findings = cap1_root_binding(root)
        finally:
            _CAP1_SELFTEST_GIT_ROOT = saved
        expected_findings = [] if reason is None else [f"CAP1 root adjudication: {reason}"]
        matches = (state, findings) == (expected, expected_findings)
        outcome = "killed" if expected == "invalid" or name == "stale-head-sees-veto" else "held"
        expect = f"{expected}: {reason}" if reason else expected
        witnesses.append({"mutant": f"cap1-binding-{name}", "path": path,
                          "old": old, "new": new, "expected": expect,
                          "failed": findings, "outcome": outcome if matches else "SURVIVED"})
        if not matches:
            failures.append(f"{name}: expected {(expected, expected_findings)}, got {(state, findings)}")

    git("init", "--quiet", "--object-format=sha1")
    ledger = (f"{ADOPTION_LEDGER_TITLE}\n\n{ADOPTION_TABLE_HEADER}\n"
              f"{ADOPTION_TABLE_DIVIDER}\n")
    write(AGENT_ADOPTIONS, ledger)
    predecessor = commit("Synthetic predecessor")
    for path in CAP1_ROOT_BOUND_PATHS:
        value = CAP1_ROOT_VERSION_MARKER if path == CAP1_ROOT_SPEC else "Synthetic CAP1 subject"
        write(path, value + "\n")
    source = commit("Synthetic CAP1 source")
    version = "cap1-root-adjudication-v1.0"
    date = "2026-11-27"
    links = " ".join(f"[subject](https://github.com/tzeusy-org/syzygy/blob/{source}/{path})"
                     for path in CAP1_ROOT_BOUND_PATHS)
    row = f"| A-401 | {date} | `{source}` | {links} | Fixture | `git revert {source}` | `{version}` |\n"
    write(AGENT_ADOPTIONS, ledger + row)
    tip = commit("Synthetic binding row")
    protected = "refs/remotes/origin/main"
    git("update-ref", protected, tip)
    check("pretag", AGENT_ADOPTIONS, "", row, "staged")
    git("tag", "-a", version, "-m", "Synthetic CAP1 version", source)
    check("matched-protected", AGENT_ADOPTIONS, row, row, "effective")

    fenced_row = f"\n```md\n{row}```\n"
    write(AGENT_ADOPTIONS, ledger + fenced_row)
    git("update-ref", protected, commit("Fence only the protected row"))
    git("checkout", "--quiet", "--detach", tip)
    check("protected-fenced-row", AGENT_ADOPTIONS, row, fenced_row, "invalid",
          "annotated source and binding row are not both on protected main")

    projection = root / CAP1_ROOT_PROJECTION
    projection_before = projection.read_text()
    projection_after = projection_before + "\n"
    projection.write_text(projection_after)
    git("update-ref", protected, commit("Drift only the protected projection"))
    git("checkout", "--quiet", "--detach", tip)
    check("protected-projection-drift", CAP1_ROOT_PROJECTION, projection_before, projection_after,
          "invalid", f"`{CAP1_ROOT_PROJECTION}` differs on protected main from the exact source snapshot")

    veto = f"| A-402 | {date} | `{predecessor}` | Veto A-401. | Fixture | `git revert {predecessor}` | — |\n"
    write(AGENT_ADOPTIONS, ledger + row + veto)
    veto_tip = commit("Record the protected veto")
    git("update-ref", protected, veto_tip)
    check("matched-veto", AGENT_ADOPTIONS, "", veto, "reverted")
    write(AGENT_ADOPTIONS, ledger + row)
    check("worktree-omits-veto", AGENT_ADOPTIONS, veto, "", "invalid",
          "authored and worktree disposition evidence disagree")
    git("restore", "--worktree", AGENT_ADOPTIONS)
    git("checkout", "--quiet", "--detach", tip)
    check("stale-head-sees-veto", AGENT_ADOPTIONS, "", veto, "reverted")



def _status_figure_moved(text):
    """The PROJECT-STATUS Polaris figure, five scenarios short."""
    m = STATUS_FIGURE.search(text)
    if not m:
        raise AssertionError("mutation target absent: the Polaris figure")
    return (text[:m.start(2)] + str(int(m.group(2)) - 5)
            + text[m.end(2):])


# A synthetic signed addition, installed by `_install_addition` into a scratch
# tree the way a version-tagged sign-off and `--regenerate` would leave it.
ADDITION = "polaris-selftest-addition"
ADDITION_RECORD = f"{DECISIONS}/POLARIS-SELFTEST-ADDITION-SIGNOFF-v1.0.md"
ADDITION_ID = f"{POLARIS_ID}099"
ADDITION_SPEC = (
    "## ADDED Requirements\n\n### Requirement: Selftest addition\n\n"
    f"ID: {ADDITION_ID}\n\n```yaml\nwarrants:\n"
    "  primary: [VIS-2]\n  doctrine: [VIS-2]\n  contracts: []\n"
    "  policies: []\n  decisions: []\n  topology: []\n"
    "  parent_requirements: []\n```\n\n"
    "#### Scenario: Selftest one\n\n- **WHEN** x\n- **THEN** y\n\n"
    "#### Scenario: Selftest two\n\n- **WHEN** x\n- **THEN** y\n")


# A synthetic addition adopted by a dedicated record (`ADOPTED_ADDITIONS`),
# as the narrative profile is, installed beside the signed one.
ADOPTED = "polaris-selftest-adopted"
ADOPTED_RECORD = f"{DECISIONS}/POLARIS-SELFTEST-ADOPTED-ADOPTION.md"
ADOPTED_ID = f"{POLARIS_ID}096"
ADOPTED_SPEC = (ADDITION_SPEC.replace(ADDITION_ID, ADOPTED_ID)
                .replace("Selftest addition", "Selftest adopted")
                .replace("Selftest one", "Adopted one")
                .replace("Selftest two", "Adopted two"))
# Outside the change directory, as the profile's raw is, so only `inputs()`
# carries it into a scratch copy.
ADOPTED_REVIEW = f"{CANDIDATES}/{ADOPTED}/reviews/R-SELFTEST-ADOPTED-1-RAW.md"

# A synthetic candidate under `proposed/`, always present in the selftest's
# scratch copy, so the candidate mutants never depend on the live tree.
CANDIDATE = "polaris-selftest-candidate"
CANDIDATE_ID = f"{POLARIS_ID}095"
CANDIDATE_SPEC = (ADDITION_SPEC.replace(ADDITION_ID, CANDIDATE_ID)
                  .replace("Selftest addition", "Selftest candidate")
                  .replace("Selftest one", "Candidate one")
                  .replace("Selftest two", "Candidate two"))


def _propose_candidate(tree):
    """Write the synthetic candidate and its route row into `tree`."""
    spec = tree / CHANGES / CANDIDATE / "proposed" / "polaris-generation" / "spec.md"
    spec.parent.mkdir(parents=True)
    spec.write_text(CANDIDATE_SPEC, encoding="utf-8")
    with open(tree / OPENSPEC_README, "a", encoding="utf-8") as fh:
        fh.write(f"\n| [`{CANDIDATE}`](changes/{CANDIDATE}) | Selftest | "
                 "Proposed | — |\n")


def _install_addition(tree, change=ADDITION, ident=ADDITION_ID,
                      text=ADDITION_SPEC, record=ADDITION_RECORD):
    """Terminate, install and regenerate one synthetic addition in `tree`.

    The signed one gets a sign-off record and aggregate block; the adopted
    one only its adoption record naming the installed spec.
    """
    spec_rel = spec_path(change, "polaris-generation")
    spec = tree / spec_rel
    spec.parent.mkdir(parents=True)
    spec.write_text(text, encoding="utf-8")
    # The candidate exception: an addition may cite the synthetic candidate.
    (tree / CHANGES / change / "proposal.md").write_text(
        f"# Selftest addition\n\nAdds {ident}.\n\n"
        f"Beside the candidate {CANDIDATE_ID}.\n", encoding="utf-8")
    if change == ADDITION:
        marker = versioned_marker({"package": change, "version": "1.0"})
        (tree / record).write_text(
            f"# Selftest\n\nDate: 2026-10-06\n\nPackage: {change}\n\n"
            f"Version: 1.0\n\nTag: {change}-v1.0\n", encoding="utf-8")
        with open(tree / AGGREGATE, "a", encoding="utf-8") as fh:
            fh.write(f"\n{marker}\nSelftest block.\n"
                     f"{marker.replace('<!-- ', '<!-- /')}\n")
    else:
        # The adoption recorder's rendered shape, and its confirming raw.
        (tree / record).write_text(
            f"# Selftest adoption\n\nDate: 2026-10-06\n\n"
            f"Recorded at (UTC): 2026-10-06T10:00:00Z\n\n"
            f"Adopted subject: `{spec_rel}`\n", encoding="utf-8")
        raw = tree / ADOPTED_REVIEW
        raw.parent.mkdir(parents=True)
        raw.write_text(
            f"# R-SELFTEST-ADOPTED-1\n\nReviewed commit: selftest\n"
            f"Subject SHA-256: {sha(text.encode('utf-8'))}\n"
            f"Verdict: CONFIRM\n\nBody.\n", encoding="utf-8")
    name = Path(record).name
    with open(tree / OPENSPEC_README, "a", encoding="utf-8") as fh:
        fh.write(f"\n| [`{change}`](changes/{change}) | Selftest | "
                 f"Signed: `{name}` | — |\n")
    status = (tree / STATUS).read_text(encoding="utf-8")
    def add_to_figure(match):
        return (match[0][:match.start(1) - match.start()]
                + f"{int(match[1]) + 1} requirements and {int(match[2]) + 2}"
                + match[0][match.end(2) - match.start():])

    for pattern in (STATUS_FIGURE, VBASE_STATUS_PRETAG, VBASE_STATUS_ACTIVE):
        status = pattern.sub(add_to_figure, status)
    status += f"\nSelftest addition: `{name}`.\n"
    (tree / STATUS).write_text(status, encoding="utf-8")
    regenerate(tree)


def _restates_base(text):
    """The addition replaced by a verbatim MODIFIED copy of base 001.

    Composition, totals and census are then unchanged, so only the
    ADDED-only guard can see it.
    """
    base = (ROOT / POLARIS_BASE_SPEC).read_text(encoding="utf-8")
    heads = list(re.finditer(r"^#{2,3} ", base, re.M))
    for i, head in enumerate(heads):
        stop = heads[i + 1].start() if i + 1 < len(heads) else len(base)
        block = base[head.start():stop]
        if (block.startswith("### Requirement: ")
                and f"\nID: {POLARIS_ID}001\n" in block):
            return "## MODIFIED Requirements\n\n" + block
    raise AssertionError("mutation target absent: base 001")


def addition_mutants():
    union = f"{CHANGES}/{ADDITION}/GOVERNING-DEPENDENCIES.md"
    spec = spec_path(ADDITION, "polaris-generation")
    marker = versioned_marker({"package": ADDITION, "version": "1.0"})
    # Each guard is pinned in both methods: R3 must carry both findings.
    heading_both = (f"R3:method A: addition {ADDITION}: heading"
                    f"&method B: addition {ADDITION}: heading")
    modified_both = (f"R3:method A: addition {ADDITION}: MODIFIED section"
                     f"&method B: addition {ADDITION}: MODIFIED section")
    bom_both = (f"R3:method A: addition {ADDITION}: carries U+FEFF"
                f"&method B: addition {ADDITION}: carries U+FEFF")
    cr_both = (f"R3:method A: addition {ADDITION}: carries a carriage return"
               f"&method B: addition {ADDITION}: carries a carriage return")
    removed = ("## REMOVED Requirements\n\n- `### Requirement: Admitted "
               "project input`\n\n")
    renamed = ("## RENAMED Requirements\n\n- FROM: `### Requirement: Admitted "
               "project input`\n- TO: `### Requirement: Renamed input`\n\n")
    return (
        # Bytes OpenSpec normalises and both methods here do not: refused.
        ("addition-bom-removed-first", spec, lambda t: "\ufeff" + removed + t,
         bom_both),
        ("addition-bom-renamed-first", spec, lambda t: "\ufeff" + renamed + t,
         bom_both),
        ("addition-bom-modified-first", spec,
         lambda t: "\ufeff" + _restates_base(t) + "\n" + t, bom_both),
        ("addition-cr-removed", spec,
         lambda t: t + "\nProse.\r" + removed.replace("\n", "\r"), cr_both),
        ("addition-cr-renamed", spec,
         lambda t: t + "\nProse.\r" + renamed.replace("\n", "\r"), cr_both),
        ("addition-cr-modified", spec,
         lambda t: t + "\nProse.\r" + _restates_base(t).replace("\n", "\r"),
         cr_both),
        # `Package:` is a whole line, never a prefix of another package's.
        ("addition-record-package-prefix", ADDITION_RECORD,
         _replace(f"Package: {ADDITION}\n", f"Package: {ADDITION}-extra\n"),
         "R1:unsigned addition"),
        # The status page must cite the addition's record, not only its figure.
        ("addition-status-citation", STATUS,
         _replace(f"\nSelftest addition: `{Path(ADDITION_RECORD).name}`.\n",
                  "\n"),
         "R5:cites no terminal record"),
        ("addition-unsigned", ADDITION_RECORD, None, "R1"),
        ("addition-unsigned-not-expected", ADDITION_RECORD, None,
         "R3:no versioned sign-off record"),
        # Fail-closed headings: a delta with no requirement block still fails.
        ("addition-renamed-section", spec,
         lambda t: t + "\n## RENAMED Requirements\n\n- FROM: `### Requirement: "
                       "Selftest addition`\n- TO: `### Requirement: Renamed`\n",
         heading_both),
        ("addition-removed-names-only", spec,
         lambda t: t + "\n## REMOVED Requirements\n\n- Selftest addition\n",
         heading_both),
        ("addition-lower-case-delta-heading", spec,
         lambda t: t + "\n## removed requirements\n", heading_both),
        ("addition-level-3-delta-heading", spec,
         lambda t: t + "\n### MODIFIED Requirements\n", heading_both),
        ("addition-respaced-added-heading", spec,
         _replace("## ADDED Requirements", "##  ADDED  Requirements"),
         heading_both),
        ("addition-other-level-2-heading", spec,
         lambda t: t + "\n## Notes\n\nProse.\n", heading_both),

        # A record naming another package does not sign this addition.
        ("addition-record-names-another-package", ADDITION_RECORD,
         _replace(f"Package: {ADDITION}\n", "Package: some-other-package\n"),
         "R1:unsigned addition"),
        ("addition-record-package", ADDITION_RECORD,
         _replace(f"Tag: {ADDITION}-v1.0", f"Tag: {ADDITION}-v0.9"), "R1"),
        ("addition-aggregate-block", AGGREGATE, _replace(marker, "<!-- x -->"),
         "R1"),
        ("addition-not-added-only", spec,
         _replace("## ADDED Requirements", "## MODIFIED Requirements"),
         modified_both),
        ("addition-restates-base", spec, _restates_base, modified_both),
        ("addition-re-adds-base-id", spec,
         _replace(f"ID: {ADDITION_ID}", f"ID: {POLARIS_ID}001"), "R3:re-adds"),
        # 030 is the overlay's own ADDED requirement, not the base's.
        ("addition-re-adds-overlay-id", spec,
         _replace(f"ID: {ADDITION_ID}", f"ID: {POLARIS_ID}030"), "R3:re-adds"),
        ("addition-scenario-dropped", spec,
         _replace("#### Scenario: Selftest two", "#### Scenery: Selftest two"),
         "R3"),
        ("addition-census-stale", CENSUS,
         _replace(f'"{ADDITION_ID}": {{', '"REQ-polaris-generation-098": {'),
         "R3"),
        ("addition-dangling-mention", f"{CHANGES}/{ADDITION}/proposal.md",
         _replace(f"Adds {ADDITION_ID}.", f"Adds {POLARIS_ID}097."), "R4"),
        # A candidate ID resolves inside an addition only, never on a route.
        ("candidate-mention-on-route", "AGENTS.md",
         lambda t: t + f"\n{CANDIDATE_ID}\n", "R4"),
        # Headers OpenSpec reads differently from both methods here.
        ("addition-lenient-header", spec,
         _replace("### Requirement: Selftest addition",
                  "###Requirement:Selftest addition"),
         f"R3:method A: addition {ADDITION}: non-canonical requirement header"
         f"&method B: addition {ADDITION}: non-canonical requirement header"),
        ("addition-second-added", spec,
         lambda t: t + f"\n{ADDED_HEADING}\n",
         f"R3:method A: addition {ADDITION}: 2 `{ADDED_HEADING}`"
         f"&method B: addition {ADDITION}: 2 `{ADDED_HEADING}`"),
        ("addition-fenced-header", spec,
         lambda t: t + "\n```\n### Requirement: Fenced\n```\n",
         f"R3:method A: addition {ADDITION}: a requirement header inside a fence"
         f"&method B: addition {ADDITION}: a requirement header inside a fence"),
        ("addition-route-row", OPENSPEC_README,
         _replace(f"Signed: `{Path(ADDITION_RECORD).name}`", "Signed"), "R5"),
        ("addition-status-figure", STATUS, _status_figure_moved, "R5"),
        ("addition-union-stale", union,
         _replace("## primary\n\nVIS-2\n", "## primary\n\nVIS-3\n"),
         "R4:differs from its spec's warrants"),
    )


def adopted_mutants():
    spec = spec_path(ADOPTED, "polaris-generation")
    return (
        ("adopted-record-missing", ADOPTED_RECORD, None,
         "R1:declared adoption record"),
        ("adopted-record-not-naming-spec", ADOPTED_RECORD,
         _replace(f"`{spec}`", "`elsewhere`"), "R1:does not name the installed"),
        # The path inside a longer span is not a name of the installed spec.
        ("adopted-record-path-substring", ADOPTED_RECORD,
         _replace(f"`{spec}`", f"`{spec}.orig`"),
         "R1:does not name the installed"),
        ("adopted-record-two-dates", ADOPTED_RECORD,
         _replace("Date: 2026-10-06\n", "Date: 2026-10-06\n\nDate: 2026-10-07\n"),
         "R1:recorder's shape"),
        ("adopted-record-no-instant", ADOPTED_RECORD,
         _replace("Recorded at (UTC): 2026-10-06T10:00:00Z\n", ""),
         "R1:recorder's shape"),
        # The constant moved without its review: the raw binds other bytes.
        ("adopted-review-digest", ADOPTED_REVIEW,
         lambda t: re.sub(r"(?m)^(Subject SHA-256: )[0-9a-f]{64}$",
                          r"\g<1>" + "0" * 64, t),
         "R2:does not bind"),
        ("adopted-review-head-pushed", ADOPTED_REVIEW,
         _replace("# R-SELFTEST-ADOPTED-1\n", "# R-SELFTEST-ADOPTED-1\n\nA\n\nB\n"),
         "R2:does not bind"),
        # Prose only: census, union and figure unchanged, so only R2 sees it.
        ("adopted-spec-edited", spec, lambda t: t + "\nEdited prose.\n",
         "R2:stale digest"),
        ("adopted-also-signed", ADDITION_RECORD,
         _replace(f"Package: {ADDITION}\n", f"Package: {ADOPTED}\n"),
         "R1:also names"),
        ("adopted-route-row", OPENSPEC_README,
         _replace(f"Signed: `{Path(ADOPTED_RECORD).name}`", "Signed"), "R5"),
        ("adopted-census-unexpected", ADOPTED_RECORD, None,
         "R3:no declared adoption record"),
    )


def project_source_example_history(root):
    """Keep the established screening mutants on the earlier advisory-free history."""
    ledger = root / AGENT_ADOPTIONS
    body = ledger.read_text(encoding="utf-8")
    ledger.write_text("".join(line for line in body.splitlines(keepends=True)
                              if not is_source_example_row(line.rstrip("\n"))
                              and not is_choice_row(line.rstrip("\n"))
                              and not is_migpar_row(line.rstrip("\n"))
                              and not is_impfacts_row(line.rstrip("\n"))
                              and not is_walk_row(line.rstrip("\n")) and not is_tnames_row(line.rstrip("\n")) and not is_migbound_row(line.rstrip("\n")) and not is_rough_row(line.rstrip("\n"))), encoding="utf-8")
    for path in P5_ADVICE_SUBJECTS:
        (root / path).unlink(missing_ok=True)
    status = root / STATUS
    # The v2.37 choice floor stands on v2.36, the v2.38 migration parity on v2.37, the v2.39 import facts
    # on v2.38, the v2.40 figure walks on v2.39, the v2.42 test-name recognizers on v2.40, the v2.43
    # migration bounds on v2.42 and the v2.44 rough-edge markers on v2.43, so their routes leave with it.
    prefixes = (P5_ADVICE_STATUS_PREFIX, P5_ADVICE_COUNT_SCOPE, CHOICE_STATUS_PREFIX, CHOICE_COUNT_SCOPE,
                MIGPAR_STATUS_PREFIX, MIGPAR_COUNT_SCOPE, IMPFACTS_STATUS_PREFIX, IMPFACTS_COUNT_SCOPE,
                WALK_STATUS_PREFIX, WALK_COUNT_SCOPE, TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE,
                MIGBOUND_STATUS_PREFIX, MIGBOUND_COUNT_SCOPE, ROUGH_STATUS_PREFIX, ROUGH_COUNT_SCOPE)
    status.write_text("".join(line for line in status.read_text(encoding="utf-8").splitlines(keepends=True)
                              if not line.strip().startswith(prefixes)), encoding="utf-8")
    index = root / OPENSPEC_README
    lines = index.read_text(encoding="utf-8").splitlines(keepends=True)
    index.write_text("".join(
        P5_ADVICE_CANDIDATE_INDEX + "\n" if line.strip().startswith(P5_ADVICE_INDEX_PREFIX)
        else _candidate_index_row(line) if line.strip().startswith((CHOICE_INDEX_PREFIX, MIGPAR_INDEX_PREFIX, IMPFACTS_INDEX_PREFIX, WALK_INDEX_PREFIX, TNAMES_INDEX_PREFIX, MIGBOUND_INDEX_PREFIX, ROUGH_INDEX_PREFIX)) else line
        for line in lines
    ), encoding="utf-8")


def _candidate_index_row(line):
    cells = line.rstrip("\n").split(" | ")
    cells[2] = "**Candidate.** Specification version and adoption pending"
    return " | ".join(cells) + "\n"


def project_vbase_screening_history(root):
    """Keep the older amendment fixtures on their own tagged history."""
    retirement = vbase_disposition(root, vbase_rows(root))
    ledger = root / AGENT_ADOPTIONS
    rows = ledger.read_text().splitlines(keepends=True)
    ledger.write_text("".join(
        row for row in rows
        if not is_vbase_screening_row(row)
        and (not row.startswith("| A-") or row.split("|")[1].strip() != retirement)
    ))
    status = root / STATUS
    lines = []
    for line in status.read_text().splitlines(keepends=True):
        body = line.strip()
        phase = VBASE_STATUS_PRETAG.fullmatch(body)
        if phase:
            indent = line[:len(line) - len(line.lstrip())]
            lines.append(f"{indent}{phase[1]} requirements and {phase[2]} scenarios in the effective composition\n")
        elif not VBASE_STATUS_ACTIVE.fullmatch(body) and not body.startswith("[Derived-base screening "):
            lines.append(line)
    status.write_text("".join(lines))
    index = root / OPENSPEC_README
    index.write_text("".join(
        line for line in index.read_text().splitlines(keepends=True)
        if not line.startswith(f"| [`{VBASE_SCREENING_CHANGE}`](")
    ))
    shutil.rmtree(root / VBASE_SCREENING_HOME)


def vbase_screening_document_cases(root, witnesses, failures):
    """Exercise current staged projections separately from the historical cases."""
    ledger = read_text(root, AGENT_ADOPTIONS) or ""
    retirement = vbase_disposition(root, vbase_rows(root))
    row = next(line for line in ledger.splitlines(keepends=True)
               if line.startswith(f"| {retirement} |"))
    status = read_text(root, STATUS) or ""
    active = next(match for line in visible_route_lines(status)
                  if (match := VBASE_STATUS_ACTIVE.fullmatch(line.strip())))
    shifted = active[0][:active.start(2)] + str(int(active[2]) + 1) + active[0][active.end(2):]
    activation = next(line for line in visible_route_lines(status)
                      if line.strip().startswith(VBASE_SCREENING_STATUS_PREFIX))
    competing = activation.replace(VBASE_SCREENING_HOME, FIGPLAN_HOME)
    assert competing != activation
    projection = read_text(root, VBASE_SCREENING_PROJECTION) or ""
    title = json.loads(projection)["populations"]["active"]["member"]["scenarios"][-1]
    quoted = json.dumps(title, ensure_ascii=False)
    index = read_text(root, OPENSPEC_README) or ""
    index_row = next(line for line in visible_route_lines(index)
                     if line.strip().startswith(f"| [`{VBASE_SCREENING_CHANGE}`]("))
    occupied = (
        ("missing-retirement", AGENT_ADOPTIONS, row, "", "R1", "no distinct prior retirement"),
        ("unsafe-projected-title", VBASE_SCREENING_PROJECTION, quoted,
         json.dumps(title + " changed", ensure_ascii=False), "R3", "differs from regeneration"),
        ("one-false-phase-figure", STATUS, active[0], shifted,
         "R5", "does not declare both exact Polaris census states"),
        ("competing-authority-route", STATUS, activation, activation + "\n" + competing,
         "R1", "does not route the exact screening adoption and activation condition"),
        ("conflicting-tag-index", OPENSPEC_README, index_row,
         index_row.replace("version tag is verified,", "version tag is verified, and before,"),
         "R1", "does not route the exact screening row and tag"),
        ("conflicting-delta-index", OPENSPEC_README, index_row,
         index_row.replace("SEMANTIC-DELTA.md) |",
                           "SEMANTIC-DELTA.md) v2.35 also applies before tag verification. |"),
         "R1", "does not route the exact screening row and tag"),
        ("competing-phase-figure", STATUS, active[0],
         active[0] + "\n" + VBASE_PHASE_PREFIXES[1] + " see the old projection.",
         "R5", "does not declare both exact Polaris census states"),
        ("conflicting-historical-route", STATUS, VBASE_STATUS_PREFIX,
         VBASE_STATUS_PREFIX + " is still effective.",
         "R1", "archived status and index routes differ from the exact retirement"),
    )
    for name, rel, old, new, rule, claim in occupied:
        file = root / rel
        original = file.read_text()
        assert original.count(old) >= 1 and old != new, name
        try:
            file.write_text(original.replace(old, new, 1))
            findings = run(root).findings.get(rule, [])
        finally:
            file.write_text(original)
        held = any(claim in message for message in findings)
        mutant = "derived-base-screening-" + name
        witnesses.append({
            "mutant": mutant, "path": rel, "old": old, "new": new,
            "expected": f"{rule}: {claim}", "failed": findings,
            "outcome": "killed" if held else "SURVIVED",
        })
        if not held:
            failures.append(mutant)


def vbase_screening_git_cases(tmp, witnesses, failures):
    """Exercise protected state with real objects in a disposable local Git store."""
    global _VBASE_SELFTEST_GIT_ROOT
    repo = Path(tmp) / "derived-base-screening-git"
    subprocess.run(
        ["git", "clone", "--quiet", "--shared", "--no-checkout", str(ROOT), str(repo)],
        check=True, capture_output=True,
    )

    def git(*args):
        result = subprocess.run(
            ["git", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false",
             "-c", "user.name=Reconciliation selftest", "-c",
             "user.email=reconciliation-selftest@example.invalid", *args],
            cwd=repo, check=True, capture_output=True, text=True,
        )
        return result.stdout.strip()

    def check(name, rel, old, new, expected, clue=None):
        state, overlay, records, subjects = vbase_screening_binding(repo)
        found = records + subjects
        held = (state == expected and (overlay is not None) == (expected == "effective")
                and (clue is None or any(clue in finding for finding in found)))
        mutant = "derived-base-screening-git-" + name
        witnesses.append({
            "mutant": mutant, "path": rel, "old": old, "new": new,
            "expected": f"{expected}" + (f": {clue}" if clue else ""),
            "failed": found, "outcome": ("killed" if clue else "held") if held else "SURVIVED",
        })
        if not held:
            failures.append(mutant)

    head = local_git(ROOT, "rev-parse", "HEAD^{commit}")
    assert head is not None
    head = head.decode("ascii").strip()
    advice = p5_advice_claims(adoption_table_rows(ROOT))
    if advice:
        line, = advice
        source = line.split("|")[3].strip().strip("`")
        head = git("rev-parse", f"{source}^")
        if git("tag", "--list", SOURCE_EXAMPLE_TAG):
            git("tag", "-d", SOURCE_EXAMPLE_TAG)
    git("checkout", "--quiet", "--detach", head)
    ledger = repo / AGENT_ADOPTIONS
    initial = ledger.read_text()
    row = vbase_screening_rows(adoption_table_rows(repo))[0]
    source = row.split("|")[3].strip().strip("`")
    retirement = git("rev-parse", f"{source}^")
    base = git("rev-parse", f"{retirement}^")
    protected = "refs/remotes/origin/main"
    tag = f"refs/tags/{VBASE_SCREENING_TAG}"
    if git("tag", "--list", VBASE_SCREENING_TAG):
        git("tag", "-d", VBASE_SCREENING_TAG)

    saved = _VBASE_SELFTEST_GIT_ROOT
    _VBASE_SELFTEST_GIT_ROOT = None
    try:
        git("update-ref", protected, head)
        check("staged", tag, "", "", "staged")
        git("tag", "-a", VBASE_SCREENING_TAG, source, "-m", "Synthetic exact annotation")
        check("exact-annotation", tag, "", source, "effective")

        projection = repo / VBASE_SCREENING_PROJECTION
        before_projection = projection.read_text()
        _propose_candidate(repo)
        _install_addition(repo)
        expanded_projection = projection.read_text()
        git("add", "-A")
        git("commit", "-m", "Install a later synthetic signed addition")
        check("later-authored-addition", VBASE_SCREENING_PROJECTION,
              before_projection, expanded_projection, "effective")
        expected = json.loads(before_projection)
        for population in expected["populations"].values():
            population["requirements"] += 1
            population["scenarios"] += 2
        if (json.loads(expanded_projection) != expected or regenerate(repo)
                or run(repo).failed):
            failures.append("derived-base-screening-git-expanded-census")

        status = repo / STATUS
        before_status = status.read_text()
        authority = next(line for line in visible_route_lines(before_status)
                         if line.strip().startswith(VBASE_SCREENING_STATUS_PREFIX))
        competing = authority.replace(VBASE_SCREENING_HOME, FIGPLAN_HOME)
        assert competing != authority
        status.write_text(before_status + "\n" + competing + "\n")
        git("add", STATUS)
        git("commit", "-m", "Add a competing authority route")
        check("descendant-competing-route", STATUS, "", competing, "invalid",
              "does not route the exact screening adoption")
        git("checkout", "--quiet", "--detach", head)
        status.write_text(status.read_text() + "\n" + competing + "\n")
        check("same-head-competing-route", STATUS, "", competing, "invalid",
              "does not route the exact screening adoption")
        git("restore", STATUS)

        git("update-ref", protected, base)
        check("before-protected", protected, head, base, "invalid", "absent from protected main")
        git("update-ref", protected, head)

        git("tag", "-d", VBASE_SCREENING_TAG)
        git("tag", VBASE_SCREENING_TAG, source)
        check("lightweight", tag, "annotated", "lightweight", "invalid", "not annotated directly")
        git("tag", "-d", VBASE_SCREENING_TAG)
        git("tag", "-a", VBASE_SCREENING_TAG, source, "-m", "Synthetic exact annotation")

        figure_row = next(line for line in initial.splitlines(keepends=True) if is_figplan_row(line))
        ledger.write_text(initial.replace(figure_row, "", 1))
        git("add", AGENT_ADOPTIONS)
        git("commit", "-m", "Remove the exact predecessor on simulated protected main")
        protected_without_predecessor = git("rev-parse", "HEAD")
        git("checkout", "--quiet", "--detach", head)
        git("update-ref", protected, protected_without_predecessor)
        check("stale-predecessor", AGENT_ADOPTIONS, figure_row, "", "invalid", "predecessor row or subject")

        projection = repo / VBASE_SCREENING_PROJECTION
        before_projection = projection.read_text()
        changed_projection = json.loads(before_projection)
        changed_projection["populations"]["active"]["scenarios"] += 1
        damaged = json.dumps(changed_projection, ensure_ascii=False, indent=2) + "\n"
        projection.write_text(damaged)
        git("add", VBASE_SCREENING_PROJECTION)
        git("commit", "-m", "Change the scoped protected census")
        protected_with_drift = git("rev-parse", "HEAD")
        git("checkout", "--quiet", "--detach", head)
        git("update-ref", protected, protected_with_drift)
        check("stale-projection", VBASE_SCREENING_PROJECTION, before_projection, damaged,
              "invalid", "census or status routes differ")

        tree = git("rev-parse", f"{base}^{{tree}}")
        empty_retirement = git("commit-tree", tree, "-p", base, "-m", "Synthetic empty retirement")
        tree = git("rev-parse", f"{source}^{{tree}}")
        changed_source = git("commit-tree", tree, "-p", empty_retirement, "-m", "Synthetic source history")
        git("checkout", "--quiet", "--detach", changed_source)
        ledger.write_text(initial.replace(retirement, empty_retirement).replace(source, changed_source))
        git("add", AGENT_ADOPTIONS)
        git("commit", "-m", "Stage a synthetic successor on an empty retirement")
        git("update-ref", protected, git("rev-parse", "HEAD"))
        git("tag", "-d", VBASE_SCREENING_TAG)
        git("tag", "-a", VBASE_SCREENING_TAG, changed_source, "-m", "Synthetic selected annotation")
        check("empty-retirement", AGENT_ADOPTIONS, retirement, empty_retirement,
              "invalid", "retired predecessor would not survive the inverse")
    finally:
        _VBASE_SELFTEST_GIT_ROOT = saved


def source_example_git_cases(tmp, witnesses, failures):
    """Replay the source-example version against actual bound predecessor objects."""
    import build_polaris_dossier_local_agent_mode as legacy_dossier

    global _VBASE_SELFTEST_GIT_ROOT
    repo = Path(tmp) / "source-example-git"
    subprocess.run(["git", "clone", "--quiet", "--shared", "--no-checkout", str(ROOT), str(repo)],
                   check=True, capture_output=True)

    def git(*args):
        result = subprocess.run(
            ["git", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false",
             "-c", "user.name=Reconciliation selftest",
             "-c", "user.email=reconciliation-selftest@example.invalid", *args],
            cwd=repo, check=True, capture_output=True, text=True,
        )
        return result.stdout.strip()

    def check(name, path, old, new, expected, figure=None, clue=None):
        state, text, records, subjects = p5_advice_binding(repo)
        report = run(repo)
        counter = subprocess.run(
            [sys.executable, "-B", "-c", (
                "import sys\n"
                "from pathlib import Path\n"
                "sys.path.insert(0, sys.argv[1])\n"
                "import count_polaris_effective_scenarios as counter\n"
                "counter.ROOT = Path.cwd()\n"
                "sys.argv = ['count_polaris_effective_scenarios.py', '--check']\n"
                "raise SystemExit(counter.main())\n"
            ), str(ROOT / "scripts")],
            cwd=repo, capture_output=True, text=True,
        )
        found = [*records, *subjects, *(item for rows in report.findings.values() for item in rows)]
        counter_output = counter.stdout + counter.stderr
        held = state == expected and (text is not None) == (expected == "effective")
        if clue:
            held = held and any(clue.lower() in item.lower() for item in found) and counter.returncode != 0
            held = held and clue.lower() in counter_output.lower()
        else:
            _, total = figure
            held = held and not report.failed and counter.returncode == 0
            held = held and f"CHECK PASS: recomputed total {total} matches expected {total}." in counter_output
            held = held and legacy_dossier.status_figure(repo) == figure
        mutant = "source-example-git-" + name
        witnesses.append({"mutant": mutant, "path": path, "old": old, "new": new,
                          "expected": clue or f"{expected} {figure}", "failed": found,
                          "counterDiagnostic": counter.stderr.strip(),
                          "outcome": ("killed" if clue else "held") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    def record_inverse(inverse):
        row = (f"| A-99999 | 2026-11-27 | `{inverse}` | Reverted {line.split('|')[1].strip()} | "
               f"Fixture withdrawal. | `git revert {inverse}` | — |")
        content = ledger.read_text(encoding="utf-8")
        assert content.count(line) == 1
        ledger.write_text(content.replace(line, line + "\n" + row), encoding="utf-8")
        git("add", AGENT_ADOPTIONS)
        git("commit", "-m", "Record the synthetic protected withdrawal")
        git("update-ref", protected, git("rev-parse", "HEAD"))
        return row

    def withdraw_refreshed_count():
        current = status.read_text(encoding="utf-8")
        authority, = scoped_route_lines(current, (P5_ADVICE_STATUS_PREFIX,))
        phase, = scoped_route_lines(current, (P5_ADVICE_COUNT_SCOPE,))
        original = f"\n{authority}\n\n{phase}\n"
        assert current.count(original) == 1
        without_advice = current.replace(original, "", 1)
        try:
            git("revert", "--no-commit", source)
        except subprocess.CalledProcessError:
            assert git("diff", "--name-only", "--diff-filter=U") == STATUS
            status.write_text(without_advice, encoding="utf-8")
            git("add", STATUS)
        assert status.read_text(encoding="utf-8") == without_advice
        git("commit", "-m", "Withdraw the advice and preserve the later census refresh")
        return record_inverse(git("rev-parse", "HEAD"))

    git("remote", "set-url", "origin", str(Path(tmp) / "no-source-example-remote"))
    git("remote", "set-url", "--push", "origin", str(Path(tmp) / "no-source-example-push"))
    line, = p5_advice_claims(adoption_table_rows(ROOT))
    source = line.split("|")[3].strip().strip("`")
    # Replay the first carrier so later adoptions and recorded withdrawals do not
    # change the census of this historical fixture.
    current = local_git(ROOT, "rev-parse", "HEAD").decode("ascii").strip()
    authored = git("log", "--reverse", "--format=%H", "--ancestry-path", "-S", line,
                   f"{source}..{current}", "--", AGENT_ADOPTIONS).splitlines()[0]
    before_source = git("rev-parse", f"{source}^")
    git("checkout", "--quiet", "--detach", authored)
    ledger = repo / AGENT_ADOPTIONS
    protected = "refs/remotes/origin/main"
    tag = f"refs/tags/{SOURCE_EXAMPLE_TAG}"
    if git("tag", "--list", SOURCE_EXAMPLE_TAG):
        git("tag", "-d", SOURCE_EXAMPLE_TAG)
    git("update-ref", protected, before_source)
    saved = _VBASE_SELFTEST_GIT_ROOT
    _VBASE_SELFTEST_GIT_ROOT = None
    try:
        check("staged", tag, "", "", "staged", (39, 603))
        git("tag", "-a", SOURCE_EXAMPLE_TAG, source, "-m", "Synthetic exact annotation")
        check("tag-before-protection", protected, authored, before_source, "invalid",
              clue="outside protected main")
        git("update-ref", protected, authored)
        check("active", tag, "", source, "effective", (39, 610))

        git("tag", "-d", SOURCE_EXAMPLE_TAG)
        git("tag", SOURCE_EXAMPLE_TAG, source)
        check("lightweight", tag, "annotated", "lightweight", "invalid", clue="not annotated directly")
        git("tag", "-d", SOURCE_EXAMPLE_TAG)
        git("tag", "-a", SOURCE_EXAMPLE_TAG, source, "-m", "Synthetic exact annotation")

        status = repo / STATUS
        before = status.read_text(encoding="utf-8")
        count = next(row.strip() for row in visible_route_lines(before)
                     if row.strip().startswith(P5_ADVICE_COUNT_PREFIX))
        fault = count.replace("610 scenarios.", "611 scenarios.")
        assert before.count(count) == 1 and fault != count
        status.write_text(before.replace(count, fault), encoding="utf-8")
        check("wrong-count", STATUS, count, fault, "effective", clue="source-example advice")
        competing = "\nWith the source-example advice effective, Polaris has 39 requirements and 611 scenarios.\n"
        status.write_text(before + competing, encoding="utf-8")
        check("competing-count", STATUS, "", competing, "effective", clue="source-example advice")
        git("add", STATUS)
        git("commit", "-m", "Record a conflicting protected advice count")
        git("update-ref", protected, git("rev-parse", "HEAD"))
        check("authored-competing-count", STATUS, "", competing, "effective", clue="source-example advice")
        git("checkout", "--quiet", "--detach", authored)
        check("stale-count", STATUS, "", competing, "invalid", clue="authority routes disagree")
        git("update-ref", protected, authored)
        status.write_text(before, encoding="utf-8")

        spec = repo / P5_ADVICE_SPEC
        prior = spec.read_text(encoding="utf-8")
        addition = "\nSynthetic unexpected body.\n"
        spec.write_text(prior + addition, encoding="utf-8")
        check("dirty-source", P5_ADVICE_SPEC, "", addition, "invalid",
              clue="worktree and exact Git subjects disagree")
        spec.write_text(prior, encoding="utf-8")

        _propose_candidate(repo)
        _install_addition(repo)
        expanded = count.replace("39 requirements and 610 scenarios.", "40 requirements and 612 scenarios.")
        assert expanded != count
        status.write_text(status.read_text(encoding="utf-8").replace(count, expanded), encoding="utf-8")
        assert not regenerate(repo)
        git("add", "-A")
        git("commit", "-m", "Install a later signed addition with refreshed advice counts")
        check("later-addition", STATUS, count, expanded, "effective", (40, 612))
        expanded_head = git("rev-parse", "HEAD")
        git("update-ref", protected, expanded_head)
        check("protected-later-addition", STATUS, count, expanded, "effective", (40, 612))
        row = withdraw_refreshed_count()
        check("refreshed-inverse", AGENT_ADOPTIONS, "", row, "reverted", (40, 605))

        git("checkout", "--quiet", "--detach", expanded_head)
        incorrect = expanded.replace("612 scenarios.", "613 scenarios.")
        assert expanded != incorrect
        status.write_text(status.read_text(encoding="utf-8").replace(expanded, incorrect), encoding="utf-8")
        git("add", STATUS)
        git("commit", "-m", "Record the wrong refreshed advice count")
        withdraw_refreshed_count()
        check("incorrect-refreshed-inverse", STATUS, expanded, incorrect, "invalid",
              clue="protected source-only inverse")

        git("checkout", "--quiet", "--detach", authored)
        git("update-ref", protected, authored)

        later = "\nUnrelated fixture note after source-example adoption.\n"
        status.write_text(before + later, encoding="utf-8")
        git("add", STATUS)
        git("commit", "-m", "Retain unrelated later status text")
        prior_inverse = git("rev-parse", "HEAD")
        git("revert", "--no-edit", source)
        inverse = git("rev-parse", "HEAD")
        check("unrecorded-inverse", P5_ADVICE_SPEC, source, inverse, "invalid",
              clue="worktree and exact Git subjects disagree")
        row = record_inverse(inverse)
        withdrawn = git("rev-parse", "HEAD")
        assert later in status.read_text(encoding="utf-8")
        check("recorded-inverse", AGENT_ADOPTIONS, "", row, "reverted", (39, 603))

        git("checkout", "--quiet", "--detach", prior_inverse)
        git("revert", "--no-commit", source)
        side_effect = "\nUnrelated edit in the same inverse commit.\n"
        status.write_text(status.read_text(encoding="utf-8") + side_effect, encoding="utf-8")
        git("add", STATUS)
        git("commit", "-m", "Withdraw the source and add an unrelated line")
        record_inverse(git("rev-parse", "HEAD"))
        check("inverse-side-effect", STATUS, "", side_effect, "invalid", clue="protected source-only inverse")

        git("update-ref", protected, withdrawn)
        git("checkout", "--quiet", "--detach", authored)
        check("stale-inverse", protected, authored, inverse, "invalid", clue="dispositions disagree")
    finally:
        _VBASE_SELFTEST_GIT_ROOT = saved


# The case workers fork after the parent warms this invocation's cache.
@_reverse_cache_scope()
def selftest(witness_path=None):
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT,
                            capture_output=True, text=True).stdout.strip()
    witnesses, failures = [], []
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp) / "base"
        scratch(ROOT, base)
        if p5_advice_claims(adoption_table_rows(base)):
            source_example_git_cases(tmp, witnesses, failures)
            project_source_example_history(base)
        _propose_candidate(base)
        clean = run(base)
        if clean.failed:
            print("\n".join(clean.lines))
            print("SELFTEST FAIL: the unmutated scratch copy does not pass")
            return 1
        if vbase_screening_binding(base)[0] == "staged":
            vbase_screening_document_cases(base, witnesses, failures)
            vbase_screening_git_cases(tmp, witnesses, failures)
            project_vbase_screening_history(base)
            clean = run(base)
            if clean.failed:
                print("\n".join(clean.lines))
                print("SELFTEST FAIL: the historical derived-base projection does not pass")
                return 1
        # The signed-addition hook: a synthetic addition, signed and
        # regenerated, must pass, and each of its mutants must fail.
        added = Path(tmp) / "with-signed-addition"
        shutil.copytree(base, added)
        _install_addition(added)
        with_addition = run(added)
        if with_addition.failed:
            print("\n".join(with_addition.lines))
            print("SELFTEST FAIL: the scratch copy with a signed addition "
                  "does not pass")
            return 1
        # An addition adopted by a dedicated record (the narrative profile's
        # route): declared in ADOPTED_ADDITIONS with the digest of its spec.
        adopted = Path(tmp) / "with-adopted-addition"
        shutil.copytree(added, adopted)
        ADOPTED_ADDITIONS[ADOPTED] = (ADOPTED_RECORD, "<selftest>")
        binding_of = adopted_binding
        globals()["adopted_binding"] = lambda module: (
            (sha(ADOPTED_SPEC.encode("utf-8")), ADOPTED_REVIEW)
            if module == "<selftest>" else binding_of(module))
        try:
            _install_addition(adopted, ADOPTED, ADOPTED_ID, ADOPTED_SPEC,
                              ADOPTED_RECORD)
            with_adopted = run(adopted)
            # The scratch copy a later selftest makes of such a tree must
            # carry the adoption record (the post-sitting tree's own selftest).
            if not {ADOPTED_RECORD, ADOPTED_REVIEW} <= set(inputs(adopted)):
                print("SELFTEST FAIL: the scratch inputs omit the adoption "
                      "record or its review")
                return 1
            if with_adopted.failed:
                print("\n".join(with_adopted.lines))
                print("SELFTEST FAIL: the scratch copy with an adopted addition "
                      "does not pass")
                return 1
            return _selftest_cases(tmp, commit, witnesses, failures, witness_path,
                                   base, clean, added, with_addition, adopted,
                                   with_adopted)
        finally:
            del ADOPTED_ADDITIONS[ADOPTED]
            globals()["adopted_binding"] = binding_of


def _selftest_cases(tmp, commit, witnesses, failures, witness_path, base, clean,
                    added, with_addition, adopted, with_adopted):
    cases = ([(base, clean, m) for m in mutants(ROOT)]
             + [(base, clean, m) for m in cap1_overlay_mutants()]
             + [(base, clean, m) for m in cap1_root_mutants()]
             + [(base, clean, m) for m in declared_source_mutants()]
             + [(added, with_addition, m)
                for m in addition_mutants()]
             + [(adopted, with_adopted, m) for m in adopted_mutants()])
    # Each case copies its own tree, so the cases are independent: they run
    # in forked workers (which inherit the selftest's patched globals and the
    # unpicklable mutation closures) and report in case order, so the
    # witness record is the same as a serial run's (syzygy-j5m0).
    global _CASE_STATE
    _CASE_STATE = (tmp, cases)
    try:
        results = _map_cases(len(cases))
    finally:
        _CASE_STATE = None
    for witness, failure in results:
        if witness is not None:
            witnesses.append(witness)
        if failure is not None:
            failures.append(failure)
    # These cases reconstruct historical REQ-034 floors where the prerequisites
    # for edit accounting and the terminology brief cannot exist.
    figure_base = base
    if edit_account_rows(base) or term_brief_rows(base):
        figure_base = Path(tmp) / "historical-034"
        shutil.copytree(base, figure_base)
        ledger = figure_base / AGENT_ADOPTIONS
        rows = ledger.read_text().splitlines(keepends=True)
        ledger.write_text("".join(line for line in rows
                                  if not is_edit_account_row(line) and not is_term_brief_row(line) and not is_qkind_row(line) and not is_figplan_row(line) and not is_vbase_row(line) and not is_choice_row(line) and not is_migpar_row(line) and not is_impfacts_row(line) and not is_walk_row(line) and not is_tnames_row(line) and not is_migbound_row(line) and not is_rough_row(line)))
    # The families below run side by side, each in its own fresh fork, and
    # their witnesses, failures and printed lines are merged in this order
    # (syzygy-7rkx). A family added here must keep three rules, or a
    # verdict can depend on which families happen to run beside it:
    # - it reads the starts (`base`, `figure_base`, `added`, `clean`) and
    #   never writes them; it writes only trees it copied under `tmp`;
    # - every tree it copies has a top-level name under `tmp` that no other
    #   family or pooled case uses;
    # - a global it patches is restored before it returns (a fork discards
    #   it anyway, but `SELFTEST_WORKERS=1` runs the families in turn in
    #   one process).
    # Families share the CPU, so a family's own wall-clock bound must allow
    # for the others (`_after_refusal_cases` gives its child 120 s).
    families = [
        lambda w, f: _entry_kind_cases(tmp, base, w, f),
        lambda w, f: declared_source_historical_cases(tmp, base, clean, w, f),
        lambda w, f: declared_source_composition_cases(w, f),
        functools.partial(cap1_root_binding_cases, tmp),
        lambda w, f: url_source_cases(tmp, base, w, f),
    ]
    families += [functools.partial(case, tmp, figure_base) for case in (
        figure_cases, derived_cases, ledger_cases, kinds_cases, manifests_cases,
        repairs_cases, maps_cases, bounds_cases, corr_cases, coverage_cases,
        infra_cases, findpages_cases, subsec_cases, reltype_cases, hero_cases,
        readers_cases, cont_cases, model_cases, worth_cases)]
    families += [
        lambda w, f: edit_account_cases(tmp, base, w, f),
        lambda w, f: poc_d10_cases(base, w, f),
    ]
    families += [functools.partial(case, tmp, base) for case in (
        reach_cases, readmit_cases, raw_read_cases, treeread_cases, verify_cases,
        qfile_cases, scripted_grade_cases, covhold_cases, term_brief_cases)]
    families += [
        lambda w, f: _scripted_addition_cases(tmp, added, w, f),
        lambda w, f: step_measures_cases(tmp, base, w, f),
        lambda w, f: qkind_cases(tmp, base, w, f),
        lambda w, f: figplan_cases(tmp, base, w, f),
        lambda w, f: choice_cases(tmp, base, w, f),
        lambda w, f: migpar_cases(tmp, base, w, f),
        lambda w, f: impfacts_cases(tmp, base, w, f),
        lambda w, f: walk_cases(tmp, base, w, f),
        lambda w, f: tnames_cases(tmp, base, w, f),
        lambda w, f: migbound_cases(tmp, base, w, f),
        lambda w, f: rough_cases(tmp, base, w, f),
        lambda w, f: vbase_cases(tmp, base, w, f),
    ]
    _run_families(families, witnesses, failures)
    doc = {"commit": commit, "script": "scripts/check_spec_reconciliation.py",
           "mutants": witnesses}
    if witness_path:
        Path(witness_path).write_text(json.dumps(doc, indent=2,
                                                 ensure_ascii=False) + "\n",
                                      encoding="utf-8")
    for w in witnesses:
        print(f"{w['outcome']:8} {w['mutant']:28} {w['expected']} "
              f"(failed: {', '.join(w['failed'])})")
    if failures:
        print("\n".join(f"SELFTEST FAIL: {f}" for f in failures))
        return 1
    held = sum(w["outcome"] == "held" for w in witnesses)
    print(f"SELFTEST PASS: clean scratch copy and its signed- and "
          f"adopted-addition variants pass; {len(witnesses) - held} of "
          f"{len(witnesses) - held} mutants killed by their expected "
          f"predicate; {held} of {held} controls held "
          f"(commit {commit[:12]})")
    return 0


def _scripted_addition_cases(tmp, added, witnesses, failures):
    """The two scripted cases over the signed-addition tree."""
    # Two cases a one-file mutation cannot express. A second record of the
    # same version fails R1 by its own finding; --regenerate refuses an
    # unsigned addition and writes nothing.
    for name, setup, expect in (
            ("addition-duplicate-version-record",
             lambda tree: shutil.copyfile(
                 tree / ADDITION_RECORD,
                 tree / ADDITION_RECORD.replace("SELFTEST-ADDITION",
                                                "SELFTEST-ADDITION-COPY")),
             "R1:records sign version"),
            ("regenerate-refuses-unsigned",
             lambda tree: (tree / ADDITION_RECORD).unlink(), "refused")):
        tree = Path(tmp) / name
        shutil.copytree(added, tree)
        setup(tree)
        if expect == "refused":
            before = {p: p.read_bytes() for p in tree.rglob("*") if p.is_file()}
            try:
                regenerate(tree)
                caught = False
            except SystemExit as exc:
                caught = "census refused" in str(exc)
            after = {p: p.read_bytes() for p in tree.rglob("*") if p.is_file()}
            caught = caught and before == after
            got_failed = []
        else:
            got = run(tree)
            rid, _sep, needle = expect.partition(":")
            caught = any(needle in f for f in got.findings.get(rid, []))
            got_failed = sorted(got.failed)
        witnesses.append({"mutant": name, "path": "<scripted case>", "old": "",
                          "new": "", "expected": expect, "failed": got_failed,
                          "outcome": "killed" if caught else "SURVIVED"})
        if not caught:
            failures.append(f"{name}: expected {expect}")


_CASE_STATE = None


def _selftest_workers():
    raw = os.environ.get("SELFTEST_WORKERS", "")
    if raw.isdigit() and int(raw) > 0:
        return int(raw)
    return max(1, min(os.cpu_count() or 1, 8))


def _map_cases(count):
    """Run every case, in parallel under fork, returning results in order."""
    return _fork_map(_run_case, count)


def _selftest_timeout():
    """Seconds one `_fork_map` may wait for all its results (default 3600).

    A whole selftest takes a few minutes; the bound only turns a lost result
    (a worker killed by the OOM killer or `os._exit`) into a failure instead
    of a wait that never ends (syzygy-7rkx).
    """
    raw = os.environ.get("SELFTEST_TIMEOUT", "")
    return int(raw) if raw.isdigit() and int(raw) > 0 else 3600


class PoolTimeout(RuntimeError):
    """A forked selftest map lost a result or overran `_selftest_timeout`."""


def _guarded(function, index):
    """`function(index)`, with a `BaseException` re-raised as RuntimeError.

    `multiprocessing.pool.worker` forwards only `Exception`; a `SystemExit`
    or `KeyboardInterrupt` would kill the worker and lose the result. As a
    RuntimeError it reaches the parent and fails the run as before.
    """
    try:
        return function(index)
    except Exception:
        raise
    except BaseException as exc:
        raise RuntimeError(f"task {index} raised {type(exc).__name__}: "
                           f"{exc}") from None


def _fork_map(function, count, fresh=False):
    """`function(i)` for each i, under a fork pool, in order.

    `fresh` gives every task its own fork of this process (one task per
    worker), so nothing one task leaves behind reaches the next. With one
    worker (`SELFTEST_WORKERS=1`), or where `fork` is unavailable, the tasks
    run in this process in order instead: `fresh` then isolates nothing, and
    a task sees what earlier tasks left in module state, as before the pool.
    Under fork, a task's `BaseException` fails the run and a lost result
    raises `PoolTimeout` after `_selftest_timeout()` seconds.
    """
    workers = _selftest_workers()
    if workers == 1 or "fork" not in multiprocessing.get_all_start_methods():
        return [function(i) for i in range(count)]
    with multiprocessing.get_context("fork").Pool(
            workers, maxtasksperchild=1 if fresh else None) as pool:
        pending = pool.map_async(functools.partial(_guarded, function),
                                 range(count), chunksize=1)
        try:
            return pending.get(timeout=_selftest_timeout())
        except multiprocessing.TimeoutError:
            raise PoolTimeout(
                f"{count} forked tasks gave no complete result within "
                f"{_selftest_timeout()} s; a worker died or a task hung"
                ) from None


_FAMILY_STATE = None


def _run_families(families, witnesses, failures):
    """Each `family(witnesses, failures)` in a fresh fork, merged in order.

    A family's witnesses and failures are appended in list order, and what it
    printed is re-emitted at its place, so the record and the output are the
    same as a serial run's (syzygy-7rkx). A family that raises, `SystemExit`
    included, keeps what it found and adds one failure naming it. Isolation
    holds only under fork with more than one worker (`_fork_map`).
    """
    global _FAMILY_STATE
    _FAMILY_STATE = families
    try:
        results = _fork_map(_run_family, len(families), fresh=True)
    finally:
        _FAMILY_STATE = None
    for found, failed, printed in results:
        sys.stdout.write(printed)
        witnesses.extend(found)
        failures.extend(failed)


def _run_family(index):
    found, failed = [], []
    family = _FAMILY_STATE[index]
    with contextlib.redirect_stdout(io.StringIO()) as printed:
        try:
            family(found, failed)
        except KeyboardInterrupt:
            raise
        except BaseException as exc:
            failed.append(f"family {index} ({_family_name(family)}) raised "
                          f"{type(exc).__name__}: {exc}")
    return found, failed, printed.getvalue()


def _family_name(family):
    """A family's case function name, for a failure line."""
    inner = getattr(family, "func", family)
    code = getattr(inner, "__code__", None)
    if inner.__name__ == "<lambda>" and code is not None:
        named = [n for n in code.co_names if n.endswith("_cases")]
        if named:
            return named[0]
    return inner.__name__


def _run_case(index):
    tmp, cases = _CASE_STATE
    start, clean, (name, rel, mutate, expect) = cases[index]
    tree = Path(tmp) / name
    shutil.copytree(start, tree)
    rels = rel if isinstance(rel, tuple) else (rel,)
    unchanged, applied = False, False
    for one in rels:
        target = tree / one
        before = target.read_text(encoding="utf-8")
        if mutate is None:
            target.unlink()
            old, new = "<file present>", "<file deleted>"
            continue
        after = mutate(before)
        if after == before and "=0" in expect:
            old, new = "<already applied>", "<already applied>"
            continue
        applied = True
        if after == before:
            unchanged = True
            break
        target.write_text(after, encoding="utf-8")
        old, new = _fragment(before, after)
    if unchanged:
        return None, f"{name}: mutation changed nothing"
    rel = " + ".join(rels)
    got = run(tree)
    if ":" in expect:
        # The predicate must fail with this finding, not another.
        # `&` joins needles that must each be found (both methods).
        rid, _sep, needles = expect.partition(":")
        caught = all(any(n in f for f in got.findings.get(rid, []))
                     for n in needles.split("&"))
    elif expect.endswith("~"):
        rid = expect[:-1]
        caught = got.findings.get(rid) != clean.findings.get(rid)
    elif "=0" in expect:
        # Strict: the report-only predicate examined its population
        # and reports exactly zero findings. Nothing else fails, except
        # the predicates named after `|`, which must fail exactly when
        # the mutant applied new bytes (a later act over a signed
        # subject fails R2 by design until the reconciliation is
        # re-derived); once the tree already carries the bytes they
        # may only be a subset.
        head, _sep, tail = expect.partition("|")
        rid = head[:-2]
        allowed = set(filter(None, tail.split(",")))
        failed_ok = (got.failed == allowed if applied
                     else got.failed <= allowed)
        if name == "pins-after-repin-acts" and applied:
            reference = poc_reference()
            if reference.transaction_present(start):
                original_pwb = (start / FAMILY_SPECS["PWB"]).read_bytes()
                replayed_pwb = (tree / FAMILY_SPECS["PWB"]).read_bytes()
                if not reference.is_signed(start):
                    failed_ok = False
                elif replayed_pwb != original_pwb:
                    # Rewinding this governing input must invalidate
                    # P115, with exactly this refusal and no other R1.
                    required = allowed | {"R1"}
                    expect = f"{rid}=0|" + ",".join(sorted(required))
                    expected_r1 = [
                        "poc (syzygy-73e.5.2) successor "
                        "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-"
                        "AMENDMENT-SIGNOFF-v1.0.md: incomplete or "
                        "invalid exact P115 sign-off transaction"]
                    failed_ok = (
                        got.failed == required
                        and got.findings.get("R1") == expected_r1
                        and reference.binding_findings(tree) == [
                            "current P115 governing input differs: "
                            + FAMILY_SPECS["PWB"]])
                    if failed_ok:
                        # The early input refusal can hide a second
                        # record defect. Restoring only PWB must make
                        # the complete signed transaction valid again.
                        target = tree / FAMILY_SPECS["PWB"]
                        try:
                            target.write_bytes(original_pwb)
                            failed_ok = reference.is_signed(tree)
                        finally:
                            target.write_bytes(replayed_pwb)
        caught = (got.findings.get(rid) == [] and failed_ok
                  and any(int(m.group(1)) > 0 for m in (
                      re.match(rf"OK +{rid}  .* — (\d+) examined", line)
                      for line in got.lines) if m))
    else:
        caught = expect in got.failed
    if name.startswith("declared-") and expect in ("R1", "R2"):
        # A refusal must restore the predecessor population, not merely print
        # an error while still applying the unbound amendment.
        population, _findings = census(tree)
        additions = [(change, read_text(tree, path) or "")
                     for change, path in polaris_additions(tree)]
        predecessor, _problems = compose_polaris_by_id(
            read_text(tree, POLARIS_BASE_SPEC) or "",
            read_text(tree, POLARIS_OVERLAY_SPEC) or "", *additions)
        caught = caught and population.get("POLARIS") == predecessor
    witness = {"mutant": name, "path": rel, "old": old, "new": new,
               "expected": expect, "failed": sorted(got.failed),
               "outcome": "killed" if caught else "SURVIVED"}
    if not caught:
        return witness, (f"{name}: expected {expect} to fail, got "
                         f"{sorted(got.failed) or 'nothing'}")
    return witness, None


def _block_device():
    """A block device this user cannot read, or None (its read raises)."""
    for dev in sorted(Path("/dev").iterdir()):
        try:
            if stat.S_ISBLK(dev.lstat().st_mode) and not os.access(dev, os.R_OK):
                return dev
        except OSError:
            continue
    return None


#: One sign-off glob entry per kind `signoff_texts` refuses (syzygy-j5dg):
#: name -> (entry basename, setup(entry path, tree), refusal needle,
#: library error class). The needle names the entry and its kind, so a
#: refusal of another entry or kind does not count. The class is what an
#: in-process caller sees: the exact class `read_text` raised before
#: syzygy-j5dg (a literal, never derived from the code under test). A FIFO
#: is not a kind: it is read as before (owner answer `pr714-fifo-refusal`
#: B), so its live-writer form is a control below.
ENTRY_KIND_CASES = {
    "signoff-entry-directory": (
        "J5DG-DIR-SIGNOFF-v1.0.md", lambda e, t: e.mkdir(), "directory",
        IsADirectoryError),
    "signoff-entry-socket": (
        "J5DG-SOCKET-SIGNOFF-v1.0.md",
        lambda e, t: os.mknod(e, stat.S_IFSOCK | 0o644), "socket", OSError),
    "signoff-entry-dangling-symlink": (
        "J5DG-DANGLING-SIGNOFF-v1.0.md",
        lambda e, t: e.symlink_to("J5DG-ABSENT.md"), "dangling symlink",
        FileNotFoundError),
    "signoff-entry-symlink-loop": (
        "J5DG-LOOP-SIGNOFF-v1.0.md",
        lambda e, t: e.symlink_to(e.name), "symlink loop", OSError),
    "signoff-entry-symlink-to-directory": (
        "J5DG-LINKDIR-SIGNOFF-v1.0.md",
        lambda e, t: e.symlink_to(t / DECISIONS), "symlink to directory",
        IsADirectoryError),
    "signoff-entry-symlink-to-block-device": (
        "J5DG-BLOCK-SIGNOFF-v1.0.md",
        lambda e, t: e.symlink_to(_block_device()), "symlink to block device",
        PermissionError),
    "signoff-entry-unreadable": (
        "J5DG-UNREADABLE-SIGNOFF-v1.0.md",
        lambda e, t: (e.write_text("Package: none\n", encoding="utf-8"),
                      e.chmod(0)), "unreadable regular file", PermissionError),
    "signoff-entry-not-utf8": (
        "J5DG-BYTES-SIGNOFF-v1.0.md",
        lambda e, t: e.write_bytes(b"Package: \xff\n"),
        "regular file that is not UTF-8", UnicodeDecodeError),
}
#: The record a CRLF control rewrites: a signed Polaris addition, whose
#: `Version:` line `VERSION_LINE` finds only after newline translation.
CRLF_CONTROL_RECORD = (f"{DECISIONS}/"
                       "POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md")


def _control_target(tree):
    target = tree / "J5DG-CONTROL-TARGET.txt"
    target.write_text("A regular file that names no package.\n",
                      encoding="utf-8")
    return target


def _crlf(tree):
    path = tree / CRLF_CONTROL_RECORD
    path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))


class _FifoWriter:
    """A live writer on a FIFO: each reader that opens it reads one finite
    stream naming no package, then EOF (round 3 F6's producer, by thread).

    Each pass blocks in `open` until a reader opens the FIFO, writes, and
    closes, so the reader sees EOF. A pass that reopens before that reader
    closes adds one more copy to its stream, which names no package either;
    a reader gone before the write is a `BrokenPipeError`, and the next
    pass waits for the next reader. `stop` wakes a pass blocked in `open`.
    """

    TEXT = b"A finite stream naming no package.\n"

    def __init__(self, path):
        import threading
        self.path, self.stopping = path, threading.Event()
        self.thread = threading.Thread(target=self._serve, daemon=True)
        self.thread.start()

    def _serve(self):
        while not self.stopping.is_set():
            try:
                fd = os.open(self.path, os.O_WRONLY)
            except OSError:
                return
            try:
                if not self.stopping.is_set():
                    os.write(fd, self.TEXT)
            except BrokenPipeError:
                pass
            finally:
                os.close(fd)

    def stop(self):
        self.stopping.set()
        try:  # a pass blocked in open() needs a reader to return
            os.close(os.open(self.path, os.O_RDONLY | os.O_NONBLOCK))
        except OSError:
            pass
        self.thread.join(5)


#: The live-writer FIFO control's entry (round 3 F6): main read it in every
#: mode and `--check` passed; it must read and pass the same now.
FIFO_CONTROL_ENTRY = "J5DG-FIFO-SIGNOFF-v1.0.md"


#: Entries every mode read before syzygy-j5dg and must read the same now
#: (main's `--check` passed on each): name -> setup(tree).
ENTRY_CONTROLS = {
    "signoff-entry-control-symlink-to-file": lambda tree: (
        tree / DECISIONS / "J5DG-LINKFILE-SIGNOFF-v1.0.md").symlink_to(
            _control_target(tree)),
    "signoff-entry-control-symlink-to-dev-null": lambda tree: (
        tree / DECISIONS / "J5DG-DEVNULL-SIGNOFF-v1.0.md").symlink_to(
            "/dev/null"),
    "signoff-entry-control-crlf-record": _crlf,
}


def _cli_exits(tree):
    """`main`'s exit per mode with `ROOT` at `tree`, and whether it wrote."""
    before = {p: p.read_bytes() for p in tree.rglob("*")
              if p.is_file() and os.access(p, os.R_OK)}
    root, codes = ROOT, {}
    globals()["ROOT"] = tree
    try:
        for flag in ("--check", "--census", "--regenerate"):
            with contextlib.redirect_stdout(io.StringIO()), \
                    contextlib.redirect_stderr(io.StringIO()) as err:
                codes[flag] = main([flag])
            codes[flag] = (codes[flag], "REFUSED R1" in err.getvalue())
    finally:
        globals()["ROOT"] = root
    after = {p: p.read_bytes() for p in tree.rglob("*")
             if p.is_file() and os.access(p, os.R_OK)}
    return codes, before != after


def _library_error(label, method, tree, path, cls):
    """What a consumer sees from `method(tree)`, [] if it is `cls` exactly.

    Written as a consumer is (`prepare_three_surface_poc_governedby_
    reference_recording.py`'s family selftest): an `except OSError` admits
    the error only when `.filename` is the fixture entry. A `cls` that is
    not an `OSError` must escape that handler as the same class, as a
    `UnicodeDecodeError` did before; a `ValueError` handler then sees it.
    """
    try:
        try:
            method(tree)
        except OSError as reader_error:
            if type(reader_error) is not cls:
                return [f"{label}: {type(reader_error).__name__}, "
                        f"not {cls.__name__}"]
            if (reader_error.filename is None
                    or Path(reader_error.filename) != path):
                return [f"{label}: filename {reader_error.filename!r}"]
            return []
    except ValueError as value_error:
        if type(value_error) is not cls:
            return [f"{label}: {type(value_error).__name__}, "
                    f"not {cls.__name__}"]
        return []
    except Exception as other:  # escapes both handlers: F5's failure mode
        return [f"{label}: {type(other).__name__} escaped except OSError, "
                f"not {cls.__name__}"]
    return [f"{label}: not refused"]


def _entry_kind_cases(tmp, base, witnesses, failures):
    """Each kind must raise its own read error in-process (`run`,
    `census`, `check_outcomes`, `check_census`), refuse by name when
    collected, and refuse in the CLI (exit 1, no write); each control must
    pass exactly as it did before."""
    for name, (entry, setup, kind, cls) in ENTRY_KIND_CASES.items():
        if name.endswith("block-device") and _block_device() is None:
            print(f"SKIPPED  {name}: no unreadable block device under /dev")
            continue
        tree = Path(tmp) / name
        shutil.copytree(base, tree)
        path = tree / DECISIONS / entry
        setup(path, tree)
        needle = f"`{DECISIONS}/{entry}`: {kind}"
        got = []
        for label, method in (("run", run), ("census", census),
                              ("check_outcomes",
                               lambda t: scoped_check_outcomes(t, Report())),
                              ("check_census",
                               lambda t: check_census(t, Report()))):
            got += _library_error(label, method, tree, path, cls)
        try:
            signoff_texts(tree, collect=True)
            got.append("collected: not refused")
        except SignoffEntriesRefused as exc:
            if not any(f.startswith(needle) for f in exc.findings):
                got.append(f"collected: refused {exc.findings}")
            if exc.filename is None or Path(exc.filename) != path:
                got.append(f"collected: filename {exc.filename!r}")
        if name == "signoff-entry-directory":
            # The CLI's polarity, once: exit 1 with the refusal in every
            # mode, and `--regenerate` writes nothing.
            codes, wrote = _cli_exits(tree)
            got += [f"{flag}: exit {code}, refusal printed {printed}"
                    for flag, (code, printed) in codes.items()
                    if (code, printed) != (1, True)]
            if wrote:
                got.append("the CLI wrote a file")
        if path.is_file():
            path.chmod(0o644)
        witnesses.append({"mutant": name, "path": f"{DECISIONS}/{entry}",
                          "old": "<no entry>", "new": f"<{kind}>",
                          "expected": f"REFUSED:{kind}", "failed": got,
                          "outcome": "SURVIVED" if got else "killed"})
        if got:
            failures.append(f"{name}: expected REFUSED {needle}; {got}")
    for name, setup in ENTRY_CONTROLS.items():
        tree = Path(tmp) / name
        shutil.copytree(base, tree)
        setup(tree)
        try:
            report = run(tree)
            census(tree)
            signoff_texts(tree, collect=True)
            got = sorted(report.failed)
        except (OSError, ValueError) as exc:
            got = [f"raised {type(exc).__name__}: {exc}"]
        witnesses.append({"mutant": name, "path": "<scripted control>",
                          "old": "<no entry>", "new": "<control>",
                          "expected": "PASS", "failed": got,
                          "outcome": "BROKEN" if got else "held"})
        if got:
            failures.append(f"{name}: must read as before and pass; {got}")
    _fifo_control(tmp, base, witnesses, failures)
    _after_refusal_cases(tmp, base, witnesses, failures)


#: Entries sorted after a refused directory (round 4 F7): name ->
#: (setup(entry path, tree), expected finding after the entry's path). Main
#: crashed on the directory and never reached them, so collection names each
#: one that is not a regular file without opening it. A regular file behind
#: a symlink is still read (`stat` follows the link), so its own refusal is
#: named instead.
AFTER_REFUSAL_CASES = {
    "signoff-entry-fifo-after-refusal": (
        lambda e, t: os.mkfifo(e),
        "FIFO, not opened because an earlier entry is refused"),
    "signoff-entry-symlink-to-fifo-after-refusal": (
        lambda e, t: (os.mkfifo(t / "J5DG-FIFO-TARGET"),
                      e.symlink_to(t / "J5DG-FIFO-TARGET")),
        "symlink to FIFO, not opened because an earlier entry is refused"),
    "signoff-entry-symlink-to-ptmx-after-refusal": (
        lambda e, t: e.symlink_to("/dev/ptmx"),
        "symlink to character device, not opened because an earlier entry "
        "is refused"),
    "signoff-entry-symlink-to-dev-zero-after-refusal": (
        lambda e, t: e.symlink_to("/dev/zero"),
        "symlink to character device, not opened because an earlier entry "
        "is refused"),
    "signoff-entry-symlink-to-regular-after-refusal": (
        lambda e, t: ((t / "J5DG-BYTES-TARGET").write_bytes(b"\xff\n"),
                      e.symlink_to(t / "J5DG-BYTES-TARGET")),
        "regular file that is not UTF-8"),
}
AFTER_REFUSAL_ENTRY = "J5DG-LATER-SIGNOFF-v1.0.md"

#: Collects one tree in a child process, so an entry opened in error can
#: only block until the timeout or exhaust the child's own address space.
_COLLECT_CHILD = r"""
import importlib.util, json, resource, sys
from pathlib import Path
resource.setrlimit(resource.RLIMIT_AS, (1 << 30, 1 << 30))
spec = importlib.util.spec_from_file_location("reconciliation", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
try:
    module.signoff_texts(Path(sys.argv[2]), collect=True)
    print(json.dumps(None))
except module.SignoffEntriesRefused as exc:
    print(json.dumps(exc.findings))
"""


def _after_refusal_cases(tmp, base, witnesses, failures):
    """Each `AFTER_REFUSAL_CASES` entry, sorted after a refused directory,
    must be named with its expected finding beside the directory's, in a
    child given 120 seconds and 1 GiB of address space. The bound is
    generous because the child shares the CPU with the other families
    (syzygy-7rkx); only a child that blocks ever reaches it."""
    for name, (setup, expected) in AFTER_REFUSAL_CASES.items():
        if "ptmx" in name and not Path("/dev/ptmx").exists():
            print(f"SKIPPED  {name}: no /dev/ptmx")
            continue
        tree = Path(tmp) / name
        shutil.copytree(base, tree)
        (tree / DECISIONS / "J5DG-DIR-SIGNOFF-v1.0.md").mkdir()
        setup(tree / DECISIONS / AFTER_REFUSAL_ENTRY, tree)
        got = []
        try:
            child = subprocess.run(
                [sys.executable, "-c", _COLLECT_CHILD,
                 str(Path(__file__).resolve()), str(tree)],
                capture_output=True, text=True, timeout=120)
            if child.returncode != 0:
                tail = (child.stderr.strip().splitlines() or [""])[-1]
                got.append(f"collection exited {child.returncode}: {tail}")
                findings = None
            else:
                findings = json.loads(child.stdout)
        except subprocess.TimeoutExpired:
            got.append("collection opened the entry and blocked")
            findings = None
        wanted = [f"`{DECISIONS}/J5DG-DIR-SIGNOFF-v1.0.md`: directory",
                  f"`{DECISIONS}/{AFTER_REFUSAL_ENTRY}`: {expected}"]
        if not got and findings != wanted:
            got.append(f"collected: {findings!r}")
        witnesses.append({"mutant": name,
                          "path": f"{DECISIONS}/{AFTER_REFUSAL_ENTRY}",
                          "old": "<no entry>",
                          "new": "<directory, then entry>",
                          "expected": f"REFUSED:{expected}", "failed": got,
                          "outcome": "SURVIVED" if got else "killed"})
        if got:
            failures.append(f"{name}: expected {wanted}; {got}")


def _fifo_control(tmp, base, witnesses, failures):
    """A FIFO whose writer supplies a finite stream reads as on main: the
    library passes and every CLI mode exits 0 without a refusal or a write
    (round 3 F6; owner answer `pr714-fifo-refusal` B)."""
    name = "signoff-entry-control-live-writer-fifo"
    tree = Path(tmp) / name
    shutil.copytree(base, tree)
    path = tree / DECISIONS / FIFO_CONTROL_ENTRY
    os.mkfifo(path)
    writer = _FifoWriter(path)
    try:
        try:
            report = run(tree)
            census(tree)
            texts = dict(signoff_texts(tree, collect=True))
            got = sorted(report.failed)
            if not texts.get(path, "").startswith(
                    _FifoWriter.TEXT.decode()):
                got.append(f"collected text {texts.get(path)!r}")
            codes, wrote = _cli_exits(tree)
            got += [f"{flag}: exit {code}, refusal printed {printed}"
                    for flag, (code, printed) in codes.items()
                    if (code, printed) != (0, False)]
            if wrote:
                got.append("the CLI wrote a file")
        except (OSError, ValueError) as exc:
            got = [f"raised {type(exc).__name__}: {exc}"]
    finally:
        writer.stop()
    witnesses.append({"mutant": name, "path": "<scripted control>",
                      "old": "<no entry>", "new": "<live-writer FIFO>",
                      "expected": "PASS", "failed": got,
                      "outcome": "BROKEN" if got else "held"})
    if got:
        failures.append(f"{name}: must read as on main and pass; {got}")


def _fragment(before, after):
    """The smallest differing window, for re-runnable witnesses."""
    i = 0
    while i < min(len(before), len(after)) and before[i] == after[i]:
        i += 1
    j = 0
    while (j < min(len(before), len(after)) - i
           and before[-1 - j] == after[-1 - j]):
        j += 1
    lo = max(0, i - 30)
    return before[lo:len(before) - j][:160], after[lo:len(after) - j][:160]


def regenerate(root):
    """Write each signed addition's union and `census.json`; return paths.

    The one command a Polaris addition's recording commit runs after its
    builder installs the requirements. The base and understanding unions are
    signed subjects and are never written.
    """
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import build_polaris_dependency_unions as unions
    pop, findings = census(root)
    if findings:
        raise SystemExit("census refused:\n" + "\n".join(findings))
    baseline, projection = vbase_screening_projects(root, pop, findings)
    if findings:
        raise SystemExit("derived-base projection refused:\n" + "\n".join(findings))
    written = unions.write_additions(root)
    outputs = [(CENSUS, census_json(baseline))]
    if projection is not None:
        outputs.append((VBASE_SCREENING_PROJECTION, projection))
    for target, body in outputs:
        if read_text(root, target) != body:
            (root / target).write_text(body, encoding="utf-8")
            written.append(target)
    return written


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--census", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    mode.add_argument("--regenerate", action="store_true")
    mode.add_argument("--cap1-root-projection", action="store_true",
                      help="print the prospective CAP1 candidate projection")
    mode.add_argument("--cap1-effective", action="store_true",
                      help="print the bound CAP1 composition and coverage census")
    parser.add_argument("--witnesses", help="selftest: write rule-6 JSON here")
    args = parser.parse_args(argv)
    global _COLLECT_REFUSALS, _CAP1_SELFTEST_GIT_ROOT, _VBASE_SELFTEST_GIT_ROOT
    saved = _COLLECT_REFUSALS
    saved_git_root = _CAP1_SELFTEST_GIT_ROOT
    saved_vbase_git_root = _VBASE_SELFTEST_GIT_ROOT
    try:
        if args.selftest:
            # Its fixtures drive the library path, which must raise each
            # entry's own read error, so it never collects.
            _CAP1_SELFTEST_GIT_ROOT = ROOT
            _VBASE_SELFTEST_GIT_ROOT = ROOT
            return selftest(args.witnesses)
        _COLLECT_REFUSALS = True
        return _main(args)
    except SignoffEntriesRefused as exc:
        print("\n".join(refusal_lines(exc)), file=sys.stderr)
        return 1
    finally:
        _COLLECT_REFUSALS = saved
        _CAP1_SELFTEST_GIT_ROOT = saved_git_root
        _VBASE_SELFTEST_GIT_ROOT = saved_vbase_git_root


def _main(args):
    if args.cap1_effective:
        base = read_text(ROOT, FAMILY_SPECS["CAP1"])
        if base is None:
            print("CAP1 predecessor specification is unavailable", file=sys.stderr)
            return 1
        population, findings, selected = cap1_root_effective(ROOT, base)
        try:
            projection = cap1_root_projection(ROOT)
            if json.loads(read_text(ROOT, CAP1_ROOT_PROJECTION) or "null") != projection:
                findings.append("stale prospective CAP1 projection")
        except (ValueError, KeyError, TypeError) as exc:
            findings.append(str(exc))
        if findings or selected is None:
            print("\n".join(findings), file=sys.stderr)
            return 1
        state, _ = cap1_root_binding(ROOT)
        coverage = "successor" if state == "effective" else "predecessor"
        print(json.dumps({
            "state": state,
            "effective_spec_sha256": sha(selected.encode("utf-8")),
            "requirements": len(population),
            "scenarios": sum(len(req["scenarios"]) for req in population.values()),
            "coverage": projection["coverage"][coverage],
        }, indent=2, sort_keys=True))
        return 0
    if args.cap1_root_projection:
        try:
            projection = cap1_root_projection(ROOT)
        except (ValueError, KeyError, TypeError) as exc:
            print(str(exc), file=sys.stderr)
            return 1
        print(json.dumps(projection, indent=2, sort_keys=True))
        return 0
    if args.census:
        pop, findings = census(ROOT)
        if findings:
            print("\n".join(findings), file=sys.stderr)
            return 1
        sys.stdout.write(census_json(pop))
        return 0
    if args.regenerate:
        for rel in regenerate(ROOT):
            print(f"wrote {rel}")
        return 0
    report = run(ROOT)
    print("\n".join(report.lines))
    ok = 7 - len(report.failed)
    print(f"{ok} of 7 predicates without FAIL; "
          f"{'FAIL' if report.failed else 'PASS'} — counts derived, not "
          "asserted")
    return 1 if report.failed else 0


# After every definition, so a binding defined anywhere in the module is found.
_memoize_bindings(globals())


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
