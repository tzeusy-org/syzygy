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
    title, *lines = (read_text(root, AGENT_ADOPTIONS) or "").split("\n")
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


def recorded_disposition(root, identity, commit, tag, paths, plain_revert=False):
    """Read an explicit later veto/revert/retirement in the ledger's change cell.

    The ledger uses prose. Recognize an action with an exact immediate
    subject, without interpreting mentions of earlier decisions as actions
    or claiming Git provenance from the projection.
    """
    if not re.fullmatch(r"A-[1-9][0-9]*", identity) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        return None
    subjects = {identity, commit, tag, *paths}
    reverts = (f"`git revert -m 1 {commit}`",) + ((f"`git revert {commit}`",) if plain_revert else ())
    adopted_date = None
    for line in adoption_table_rows(root):
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


def read_bytes(root, rel):
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


def reverse_apply(root, patch_rel, target_rel, body, *, zero_context=False):
    """`body` with the patch reversed, or None when it does not reverse."""
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / target_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        options = ["--unidiff-zero"] if zero_context else []
        done = subprocess.run(
            ["git", "apply", "-R", "--whitespace=nowarn", *options,
             str((root / patch_rel).resolve())],
            cwd=tmp, capture_output=True)
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


def check_outcomes(root, report):
    aggregate = read_text(root, AGGREGATE) or ""
    r1, r2, subjects_seen, records = [], [], 0, 0
    for child in CHILDREN:
        tag = f"{child['key']} ({child['bead']})"
        records += 1 + len(successors_for(root, child))
        record = read_text(root, child["record"])
        manifest_bytes = read_bytes(root, child["manifest"])
        if record is None:
            r1.append(f"{tag}: missing child — no terminal record "
                      f"`{child['record']}`; the outcome is Unknown")
            continue
        if manifest_bytes is None:
            r1.append(f"{tag}: package manifest `{child['manifest']}` missing")
            continue
        rows = {path: digest for digest, path in
                ROW.findall(manifest_bytes.decode("utf-8"))}
        if child["kind"] == "digest":
            if check_digest_act(child, tag, aggregate, record, manifest_bytes,
                                r1, r2) is None:
                continue
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
               "v2.8, pending until recorded" + retirement)
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


def compose_cap1_by_id(base, overlay):
    """Method A: parse both files by regex, then replace by identifier.

    The overlay must carry exactly `CAP1_OVERLAY_REPLACES`, in that order,
    and each must already be a base requirement (a full replacement, never
    an addition).
    """
    comp, pb = parse_regex(base, "CAP1")
    over, po = parse_regex(overlay, "CAP1")
    problems = [f"base: duplicate or orphan {p}" for p in pb]
    problems += [f"overlay: duplicate or orphan {p}" for p in po]
    problems += [f"overlay: {p}" for p in _cap1_overlay_guard_regex(overlay)]
    if tuple(over) != CAP1_OVERLAY_REPLACES:
        problems.append(f"overlay replaces {list(over)}, expected exactly "
                        f"{list(CAP1_OVERLAY_REPLACES)}")
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


def compose_cap1_by_text(base, overlay):
    """Method B: splice the overlay's blocks into the base text, then parse.

    No regular expression: the composed bytes come from a line splice, are
    then read by the line state machine, and are returned for the digest
    comparison with the adoption's generated record.
    """
    problems = [f"overlay: {p}" for p in _cap1_overlay_guard_manual(overlay)]
    b_lines, o_lines = _lines_keep(base), _lines_keep(overlay)
    b_spans, o_spans = _cap1_spans_manual(b_lines), _cap1_spans_manual(o_lines)
    if tuple(o_spans) != CAP1_OVERLAY_REPLACES:
        problems.append(f"overlay replaces {list(o_spans)}, expected exactly "
                        f"{list(CAP1_OVERLAY_REPLACES)}")
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


def compose_cap1(root, text):
    """(population, findings): the bound CAP1 file with the overlay applied."""
    overlay = read_text(root, CAP1_OVERLAY_SPEC)
    unsigned = cap1_overlay_signed(root)
    if overlay is None or unsigned:
        a, pa = parse_regex(text, "CAP1")
        return a, unsigned or [f"CAP1: overlay `{CAP1_OVERLAY_SPEC}` missing; "
                               "the bound file alone is counted"]
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
    return a, findings


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
    return n_req, n_scen, ids


def check_census(root, report):
    pop, findings = census(root)
    examined = 0
    p_req, p_scen, p_ids = polaris_expected(root, findings)
    signed_reference = reference_signed(root)
    totals = dict(EXPECTED_TOTALS, POLARIS=(p_req, p_scen))
    if signed_reference:
        totals["POC"] = (26, 34)
    for family, (n_req, n_scen) in totals.items():
        reqs = pop.get(family, {})
        got = (len(reqs), sum(len(r["scenarios"]) for r in reqs.values()))
        examined += got[0]
        if got != (n_req, n_scen):
            findings.append(f"{family}: {got[0]} requirements / {got[1]} "
                            f"scenarios, expected {n_req} / {n_scen}")
        literal = EXPECTED.get(family)
        if family == "POC" and signed_reference:
            literal = {**literal, "014": 8}
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
    committed = read_text(root, CENSUS)
    if committed is None:
        findings.append(f"`{CENSUS}` missing")
    elif committed != census_json(pop):
        findings.append(f"`{CENSUS}` differs from regeneration "
                        "(a name or scenario title moved)")
    report.add("R3", "populations agree by two methods and match the census",
               examined, findings,
               "requirements examined across CAP1, POC, PWB and Polaris")
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
    reach_amendment, _records, _subjects = reach_binding(root)
    if reach_amendment is not None:
        files += tracked(root, REACH_HOME)
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
                       (repairs_amendment, REPAIRS_UNION), (maps_amendment, MAPS_UNION)):
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

def visible_route_lines(text):
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
    if figures != [want]:
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


def run(root):
    global _SIGNED_MEMO
    report = Report()
    _SIGNED_MEMO = {}
    try:
        check_outcomes(root, report)
        pop = check_census(root, report)
        check_generated(root, pop, report)
        check_routes(root, pop, report)
        check_pins(root, report)
        check_unions(root, report)
    finally:
        _SIGNED_MEMO = None
    return report


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
    paths |= set(tracked(root, CHANGES)) | {CAP1_OVERLAY_RECORD}
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
    paths |= {MANIFESTS_UNION, *MANIFESTS_SUBJECTS}
    paths |= {REPAIRS_UNION, *REPAIRS_SUBJECTS}
    paths |= {MAPS_UNION, *MAPS_SUBJECTS}
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


def declared_source_historical_cases(tmp, base, clean, witnesses, failures):
    """Absent historical amendment is inactive; each partial presence refuses."""
    tree = Path(tmp) / "declared-historical"
    shutil.copytree(base, tree)
    change = f"{CHANGES}/{DECLARED_SOURCE_CHANGE}"
    act = f"{DECISIONS}/GOVERNANCE-SIMPLIFICATION-D10-ACT.md"
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
    absent_ledger = "".join(line for line in original.splitlines(keepends=True)
                            if line.rstrip("\n") != row and not is_url_source_row(line)
                            and not is_figure_row(line) and not is_derived_row(line)
                            and not is_ledger_row(line) and not is_kinds_row(line)
                            and not is_reach_row(line) and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line))
    ledger.write_text(absent_ledger)
    report = Report()
    check_outcomes(tree, report)

    def examined(result, rid):
        return next(int(match.group(1)) for line in result.lines
                    if (match := re.match(rf"OK +{rid}  .* — (\d+) examined", line)))

    held = (declared_source_absent(tree)
            and declared_source_binding(tree) == (None, [], [])
            and not report.failed
            and examined(report, "R1") == examined(clean, "R1") - 1 - had_url_source - had_figure - had_derived - had_ledger - had_kinds - had_manifests
            - had_reach - had_repairs - had_maps
            and examined(report, "R2") == examined(clean, "R2") - 3
            - (URL_SOURCE_BOUND_PARTS if had_url_source else 0)
            - (FIGURE_BOUND_PARTS if had_figure else 0)
            - (DERIVED_BOUND_PARTS if had_derived else 0)
            - (LEDGER_BOUND_PARTS if had_ledger else 0)
            - (KINDS_BOUND_PARTS if had_kinds else 0)
            - (REACH_BOUND_PARTS if had_reach else 0)
            - (MANIFESTS_BOUND_PARTS if had_manifests else 0)
            - (REPAIRS_BOUND_PARTS if had_repairs else 0)
            - (MAPS_BOUND_PARTS if had_maps else 0))
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
                      if not is_url_source_row(line))
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
                      and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line))
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
                      and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line))
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
                      and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line))
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
                      if not is_kinds_row(line) and not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line))
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
                      if not is_manifests_row(line) and not is_repairs_row(line) and not is_maps_row(line))
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
                      if not is_repairs_row(line) and not is_maps_row(line))
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
                      if not is_maps_row(line))
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
                      if not is_reach_row(line))
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
    m = STATUS_FIGURE.search(status)
    status = (status[:m.start()] + f"{int(m.group(1)) + 1} requirements and "
              f"{int(m.group(2)) + 2} scenarios in the effective composition"
              + status[m.end():] + f"\nSelftest addition: `{name}`.\n")
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


def selftest(witness_path=None):
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT,
                            capture_output=True, text=True).stdout.strip()
    witnesses, failures = [], []
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp) / "base"
        scratch(ROOT, base)
        _propose_candidate(base)
        clean = run(base)
        if clean.failed:
            print("\n".join(clean.lines))
            print("SELFTEST FAIL: the unmutated scratch copy does not pass")
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
    _entry_kind_cases(tmp, base, witnesses, failures)
    declared_source_historical_cases(tmp, base, clean, witnesses, failures)
    declared_source_composition_cases(witnesses, failures)
    url_source_cases(tmp, base, witnesses, failures)
    figure_cases(tmp, base, witnesses, failures)
    derived_cases(tmp, base, witnesses, failures)
    ledger_cases(tmp, base, witnesses, failures)
    kinds_cases(tmp, base, witnesses, failures)
    manifests_cases(tmp, base, witnesses, failures)
    repairs_cases(tmp, base, witnesses, failures)
    maps_cases(tmp, base, witnesses, failures)
    reach_cases(tmp, base, witnesses, failures)
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


_CASE_STATE = None


def _selftest_workers():
    raw = os.environ.get("SELFTEST_WORKERS", "")
    if raw.isdigit() and int(raw) > 0:
        return int(raw)
    return max(1, min(os.cpu_count() or 1, 8))


def _map_cases(count):
    """Run every case, in parallel under fork, returning results in order."""
    workers = _selftest_workers()
    if workers == 1 or "fork" not in multiprocessing.get_all_start_methods():
        return [_run_case(i) for i in range(count)]
    with multiprocessing.get_context("fork").Pool(workers) as pool:
        return pool.map(_run_case, range(count), chunksize=1)


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
                               lambda t: check_outcomes(t, Report())),
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
    child given 30 seconds and 1 GiB of address space."""
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
                capture_output=True, text=True, timeout=30)
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
    written = unions.write_additions(root)
    body = census_json(pop)
    if read_text(root, CENSUS) != body:
        (root / CENSUS).write_text(body, encoding="utf-8")
        written.append(CENSUS)
    return written


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--census", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    mode.add_argument("--regenerate", action="store_true")
    parser.add_argument("--witnesses", help="selftest: write rule-6 JSON here")
    args = parser.parse_args(argv)
    global _COLLECT_REFUSALS
    saved = _COLLECT_REFUSALS
    try:
        if args.selftest:
            # Its fixtures drive the library path, which must raise each
            # entry's own read error, so it never collects.
            return selftest(args.witnesses)
        _COLLECT_REFUSALS = True
        return _main(args)
    except SignoffEntriesRefused as exc:
        print("\n".join(refusal_lines(exc)), file=sys.stderr)
        return 1
    finally:
        _COLLECT_REFUSALS = saved


def _main(args):
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


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
