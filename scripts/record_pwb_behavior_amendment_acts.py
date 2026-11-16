#!/usr/bin/env python3
"""Record or verify an owner-signed PWB behavior-amendment act (table-driven).

Each entry in `ACTS` is one candidate package over the eleven-artifact PWB
behavior population whose act would be a new link in the successor chain
(`PWB_SUCCESSOR_CHAIN` in `scripts/check_governance.py`). The act phrase is
`<LABEL>: <sha256 of the package's behavior manifest>`; the manifest rows
hash the PROPOSED bytes, so the act and the application of the package's
`proposed/*.patch` are one change.

This script performs nothing by itself. `--record` accepts the owner's
exact argument, recomputes it from the manifest bytes, checks that the
frozen subject, the presented packet and the confirmation review all bind
the same manifest digest, applies the package's patches through its own
builder (`--apply --at-adoption` semantics), confirms every manifest row
now hashes the tree, and writes the dedicated act record and one aggregate
section of `ACCEPTANCE-ACT-RECORD.md`. `--check` re-derives both records
from the tree after adoption and requires exactly one copy of the aggregate
block (later acts append after it). `--selftest` mutates each predicate and
requires it to fail closed.

Pins. Each entry's `frozen_subject` is the commit on `main` whose manifest
and packet bytes the offered phrase binds. Whenever a package's manifest is
regenerated (a later-landing package re-derives `GOVERNING-DEPENDENCIES.md`
and its row moves), the argument changes, the packet copy is re-derived,
a fresh confirmation review is needed, and this entry's pins are re-set —
never edited into agreement by hand. Review commits are cited as the raw
states them; review binding is by manifest digest, because a rebase-merge
can leave a branch-head commit reachable from no ref.

The successor-chain link and the existence-gated copy registrations in
`check_governance.py` are the performing change's to add; this script
prints what it knows and edits no check.

Confirmation-review head contract. `validate_packet` reads only the first
four lines of the confirmation review (blank lines count as lines; nothing
below line 4 is read) and accepts exactly one of two cases, per
`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
§1 ("When a confirmation review clears a package's bytes"):

- **Case (a) — CONFIRM.** The head carries an exact line `Verdict: CONFIRM`,
  an exact line `Manifest SHA-256: <the offered argument>`, and a line
  matching `Reviewed commit: <40-hex sha>`. Unchanged from before this
  decision; a CONFIRM-only act's rendered bytes are byte-identical to what
  this script rendered before this change (see `--selftest`).
- **Case (b) — CONFIRM WITH EXCEPTIONS, notes only.** The head carries an
  exact line `Verdict: CONFIRM WITH EXCEPTIONS`, the same
  `Manifest SHA-256:` and `Reviewed commit:` lines as case (a), AND the
  `Act` entry names a `disposition_record` path AND a `disposition_sha256`
  pin (see "Pinning" below), AND that disposition record (its bytes read
  directly from the tree; never git-blob-pinned, only hash-pinned)
  satisfies every one of:
    - its current bytes hash to exactly the Act's `disposition_sha256`
      (a mismatch, or an Act naming `disposition_record` with no
      `disposition_sha256` at all, each refuses with its own distinct
      message, before any content check below runs);
    - it exists;
    - it carries an exact line `Reviewed record: <the raw's repo path,
      exactly as `act.confirmation_review` names it>`;
    - it carries an exact line `Manifest SHA-256: <the offered argument>`;
    - it carries an exact line `Revise-severity findings: 0` (any other
      digit, or the line's absence, refuses — this is the only accepted
      zero-count line form);
    - the `Act` names the raw's exact `raw_findings_heading`; after fenced
      code is stripped, that byte-exact ATX heading must occur exactly once,
      and the raw scan is confined to its section (through the next ATX
      heading of equal or higher rank, or EOF). Missing, malformed or repeated
      headings refuse; there is no whole-document fallback. Within that slice,
      read the raw's finding markers, recognizing BOTH a line-leading form
      `^(\d+)\.\s` (MULTILINE) AND a bold form `^\*\*Finding (\d+)\b`
      (MULTILINE) — the real P-71 opening-band-scenario raws (rounds 1–10)
      open every finding `**Finding <n> — ...` and carry zero line-leading
      markers, so recognizing only the first form reads their finding count
      as 0 and the (then-vacuous) predicate would hold for any disposition,
      including an empty one (found against the real round-10 raw while
      hardening this predicate, `syzygy-qqt`). Both forms are read after
      first stripping every CommonMark-fenced code block from that text —
      a fence opens on a line of 3-or-more backticks or tildes (indented at
      most 3 spaces; a backtick fence's info string may not itself contain
      a backtick) and closes only on a later line of the *same* character,
      similarly indented, whose run length is at least the opening fence's;
      an unclosed fence runs to end of text. This stripping runs on BOTH
      the raw and the disposition before either is scanned, so a numbered
      line inside a fenced example cannot inflate the raw's finding count
      nor stand in for a real disposition. Indented (4-space) code blocks
      are NOT stripped — this corpus never opens a numbered list at column
      0 inside one, and stripping by indentation risks swallowing a
      genuinely indented continuation of a real finding. The raw's finding
      set is the exact set of numbers either form yields inside the selected
      stripped section — NOT the contiguous run `{1, ..., N}` starting at 1:
      findings
      are numbered continuously across a package's review rounds (round 11
      of that same package opens at 49), so a later round's raw carries no
      finding 1 at all and a `{1..N}`-from-1 predicate would refuse a
      legitimate record. A number that opens more than one line in the same
      text (raw or disposition, independently) is a parse failure, refused
      with its own message, not a re-used finding number. A raw whose
      verdict is CONFIRM WITH EXCEPTIONS but whose finding set parses empty
      is refused with its own distinct message — a notes-only verdict with
      no countable note is a parse failure, not a vacuous pass. The
      disposition's own finding set — read over its own stripped text with
      one further form, an ATX heading `^#{2,6} (\d+) — ` (MULTILINE,
      levels 2–6, the exact em dash; disposition-record-only) in addition
      to the raw's two forms — must equal the raw's finding set exactly —
      not a superset or a subset. The heading form exists because a real
      disposition record beside the package
      (`.syzygy/governance/contracts/candidates/pwb-opening-band-scenario/ROUND-11-DISPOSITIONS.md`)
      opens every one of its entries `### <n> — ...` and cannot be
      rewritten to carry either raw-recognized marker; it is read only on
      the disposition side; a raw opening a line this way still counts 0
      for it.
  Any other combination (a REVISE-style verdict, a missing or malformed
  disposition, a missing or mismatched `disposition_sha256` pin, a digest
  mismatch, a nonzero revise count, an unmatched finding, a missing or
  ambiguous raw findings section, a raw with zero countable findings, a
  duplicated finding number in either text, or case (b) with no
  `disposition_record` configured on the Act) refuses with a specific error.
  The `opening-band` entry names both (wired 2026-10-01, reviewed in
  `docs/reviews/R-PWB-RECORDER-NOTES-ONLY-OPENING-BAND-WIRING-REVIEW-RAW.md`).

Split-phrase packets. An Act may set `split_phrase_packet=True` when its
owner packet shows the label and the digest apart: the label in a code span
and exactly one `Manifest SHA-256:` heading whose next non-blank line is the
digest in a code span, bound to the argument. Fenced code and HTML comments
are blanked first, and the packet may not also carry a whole
`LABEL: digest` phrase. The label check cannot tell a real offering from an
incidental mention, so the session that records the act must show the owner
the whole phrase.

Pinning. `disposition_sha256` is the full sha256 of the disposition
record's bytes, set once when an Act's package is drafted with a
`disposition_record` — exactly like `frozen_subject` and `packet_head` are
fixed at drafting time from committed bytes, never recomputed from
whatever the live tree happens to hold and trusted on that basis alone.
Without this pin a disposition record — read live, with no CC-REV-6
`-RAW.md` convention protecting it from edits — could be edited after the
ceremony and `--check` would silently re-verify the new bytes, never the
ones anyone reviewed (finding 8,
`docs/reviews/R-PWB-RECORDER-NOTES-ONLY-REVIEW-RAW.md`). Documentation
only: finding 6 of that same raw found the analogous self-computed
CONFIRM-only render-byte-identity hashes hard-coded in `selftest()`
insufficient, standing alone, as evidence that this script's rendering is
byte-identical to the pre-case-(b) code — they only guard *future* drift
from this commit onward, not a bug already present in it. The same is true
in reverse of any digest this script computes from its own live read: the
byte-identity evidence a dispute over a disposition's pin would need is an
origin/main diff of the record's rendered bytes, not a hash recomputed
here and checked against itself.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import importlib
import pathlib
import re
import subprocess
import sys
import tempfile
import types


ROOT = pathlib.Path(__file__).resolve().parents[1]
DECISIONS = pathlib.Path(".syzygy/governance/decisions")
AGGREGATE_REL = DECISIONS / "ACCEPTANCE-ACT-RECORD.md"
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
ROW_RE = re.compile(r"^([0-9a-f]{64})  ([^\n]+)$", re.MULTILINE)
REVIEWED_COMMIT_RE = re.compile(r"^Reviewed commit: ([0-9a-f]{40})\s*$", re.MULTILINE)
FINDING_MARK_RE = re.compile(r"^(\d+)\.\s", re.MULTILINE)
# The real P-71 opening-band-scenario raws open every finding this way
# (bold, em dash or similar after the number) and carry no line-leading
# `N. ` markers at all (syzygy-qqt scope addition).
FINDING_BOLD_RE = re.compile(r"^\*\*Finding (\d+)\b", re.MULTILINE)
# Disposition-record-only (syzygy-qqt scope addition): an ATX heading,
# levels 2-6, exact em dash. ROUND-11-DISPOSITIONS.md's own dispositions
# open every one of its four entries `### <n> — ...` and no other form or
# dash variant appears there (checked); it cannot be rewritten to carry
# either raw-recognized marker, so this form is read on the disposition
# side only — a raw opening a line this way still counts 0 for it.
FINDING_HEADING_RE = re.compile(r"^#{2,6} (\d+) — ", re.MULTILINE)
CONFIRM_LINE = "Verdict: CONFIRM"
EXCEPTIONS_LINE = "Verdict: CONFIRM WITH EXCEPTIONS"
EXPECTED_ROWS = 11
# A fence opener: up to 3 leading spaces, then 3-or-more of the same fence
# character (backtick or tilde), then the rest of the line (the info string
# for a backtick fence).
FENCE_OPEN_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
# Enough of CommonMark's ATX-heading grammar to identify an exact configured
# section boundary after fenced regions have already been blanked. The heading
# may be indented by at most three spaces and contains one to six `#` bytes.
ATX_HEADING_RE = re.compile(r"^ {0,3}(#{1,6})(?:[ \t]+|$)")


def _strip_fenced_code(text: str) -> str:
    """Blank out the content of every CommonMark-fenced code block (finding 7,
    `docs/reviews/R-PWB-RECORDER-NOTES-ONLY-REVIEW-RAW.md`), so a numbered
    line written as a fenced example cannot be mistaken for a real finding
    marker on either side of the case-(b) predicate.

    A fence opens on a line of 3-or-more backticks or tildes, indented at
    most 3 spaces; per CommonMark a backtick fence's info string may not
    itself contain a backtick (a line that violates this is not a fence
    opener at all). It closes only on a later line of the *same* character,
    indented at most 3 spaces, with no trailing content but whitespace,
    whose run length is at least the opening fence's — a closing attempt
    with fewer characters, or of the other fence character, does not close
    it. An opened-but-never-closed fence runs to the end of the text.

    Does NOT strip CommonMark's *indented* (4-space) code blocks: nothing in
    this corpus opens a numbered finding list at column 0 inside one, and
    stripping by indentation alone risks swallowing a genuinely indented
    continuation of a real finding.
    """
    lines = text.split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)
    while i < n:
        m = FENCE_OPEN_RE.match(lines[i])
        fence_char = m.group(1)[0] if m else None
        fence_len = len(m.group(1)) if m else 0
        info = m.group(2) if m else ""
        is_fence = bool(m) and not (fence_char == "`" and "`" in info)
        if not is_fence:
            out.append(lines[i])
            i += 1
            continue
        out.append("")
        i += 1
        close_re = re.compile(r"^ {0,3}" + re.escape(fence_char) + "{" + str(fence_len) + r",}\s*$")
        while i < n:
            out.append("")
            closed = bool(close_re.match(lines[i]))
            i += 1
            if closed:
                break
    return "\n".join(out)


def _raw_findings_section(text: str, heading: str | None) -> str:
    """Return the one explicitly configured raw-review findings section.

    Section selection is deliberately per Act rather than inferred from prose:
    retained reviews use several heading vocabularies, and choosing one by a
    fuzzy match could turn a summary or a prior-round recap into ceremony
    input. Fences are stripped before both locating the exact heading and
    finding the next equal-or-higher ATX heading, so heading-shaped examples
    inside code cannot open or close the selected section.
    """
    if heading is None:
        raise ValueError(
            "act names a disposition record but carries no raw_findings_heading"
        )
    heading_match = ATX_HEADING_RE.match(heading)
    if (
        "\n" in heading
        or "\r" in heading
        or heading_match is None
        or not heading[heading_match.end():].strip(" \t#")
    ):
        raise ValueError(
            "raw_findings_heading is not one exact nonempty ATX heading line"
        )

    lines = _strip_fenced_code(text).splitlines()
    starts = [index for index, line in enumerate(lines) if line == heading]
    if not starts:
        raise ValueError(
            "confirmation review is missing its configured raw findings heading"
        )
    if len(starts) != 1:
        raise ValueError(
            "confirmation review carries its configured raw findings heading "
            "more than once"
        )

    start = starts[0]
    rank = len(heading_match.group(1))
    end = len(lines)
    for index in range(start + 1, len(lines)):
        next_heading = ATX_HEADING_RE.match(lines[index])
        if next_heading is not None and len(next_heading.group(1)) <= rank:
            end = index
            break
    return "\n".join(lines[start + 1:end])


RAW_FINDING_FORMS = (FINDING_MARK_RE, FINDING_BOLD_RE)
# Disposition records recognize everything a raw does, plus the ATX
# heading form (syzygy-qqt scope addition, disposition-only — see
# FINDING_HEADING_RE).
DISPOSITION_FINDING_FORMS = (FINDING_MARK_RE, FINDING_BOLD_RE, FINDING_HEADING_RE)


def _finding_numbers(text: str, *, forms: tuple[re.Pattern, ...] = RAW_FINDING_FORMS) -> list[int]:
    """Every finding number opening a line outside any fenced code block, in
    document order, recognizing each pattern in `forms` (default: a
    line-leading `<n>. ` marker and a bold `**Finding <n> —` marker —
    syzygy-qqt scope addition: the real P-71 opening-band-scenario raws use
    only the bold form). Duplicates are preserved here — `_finding_number_set`
    is where a repeated number is treated as a parse failure."""
    stripped = _strip_fenced_code(text)
    nums: list[int] = []
    for pattern in forms:
        nums += [int(n) for n in pattern.findall(stripped)]
    return nums


def _finding_number_set(
    text: str, *, label: str, forms: tuple[re.Pattern, ...] = RAW_FINDING_FORMS,
) -> set[int]:
    """The exact set of finding numbers `_finding_numbers` parses from
    `text` (pass `forms=DISPOSITION_FINDING_FORMS` for a disposition
    record). Findings are numbered continuously across a package's review
    rounds (not `{1, ..., N}` from 1 — round 11 of the opening-band-scenario
    package opens at 49), so the exact set, not a contiguous range, is what
    a disposition must match. Raises if any number opens more than one line
    in this same text: a repeated finding number is a parse failure, not a
    legitimately re-used number."""
    seen: set[int] = set()
    dupes: set[int] = set()
    for n in _finding_numbers(text, forms=forms):
        (dupes if n in seen else seen).add(n)
    if dupes:
        raise ValueError(
            f"{label} carries a finding number more than once: {sorted(dupes)}"
        )
    return seen


def _raw_finding_number_set(
    text: str, heading: str | None, *, label: str,
) -> set[int]:
    """Parse raw finding identities only from the Act-selected section."""
    return _finding_number_set(
        _raw_findings_section(text, heading), label=label, forms=RAW_FINDING_FORMS,
    )


class Act:
    def __init__(self, act_type, builder, label, record_name, identity, title,
                 frozen_subject, packet_head, confirmation_review, tag_stem,
                 effect, not_authorized, disposition_record=None,
                 disposition_sha256=None, raw_findings_heading=None,
                 split_phrase_packet=False):
        self.act_type = act_type
        self.builder = builder
        self.label = label
        self.record = DECISIONS / record_name
        self.identity = identity
        self.title = title
        self.frozen_subject = frozen_subject
        self.packet_head = packet_head
        self.confirmation_review = pathlib.Path(confirmation_review)
        self.tag_stem = tag_stem
        self.effect = effect
        self.not_authorized = not_authorized
        # Case (b) only (POLARIS-GATE-SITTING-2026-09-26-DECISION.md §1): the
        # disposition record a CONFIRM WITH EXCEPTIONS verdict is bound to.
        # None means this Act accepts only case (a), CONFIRM.
        self.disposition_record = (
            pathlib.Path(disposition_record) if disposition_record is not None else None
        )
        # The full sha256 of `disposition_record`'s bytes, fixed at drafting
        # time (finding 8). A disposition record is read live and carries no
        # CC-REV-6 `-RAW.md` edit protection, so a set `disposition_record`
        # with no matching pin here is a refusal, never a live trust.
        self.disposition_sha256 = disposition_sha256
        # Case (b) only: the exact ATX heading that owns the raw's finding
        # population. A configured disposition with no heading refuses before
        # marker comparison; case (a) never consults this field.
        self.raw_findings_heading = raw_findings_heading
        # A packet drafted to carry its label and its manifest digest apart
        # (a `Manifest SHA-256:` heading whose next non-blank line is the
        # digest in a code span) rather than one `LABEL: digest` line. Such a
        # packet must carry the label in a code span and exactly one digest
        # heading, bound to the argument; the phrase is shown to the owner
        # whole at the act.
        self.split_phrase_packet = split_phrase_packet
        self._module = None

    @property
    def module(self):
        if self._module is None:
            self._module = importlib.import_module(self.builder)
        return self._module

    @property
    def candidate(self) -> pathlib.Path:
        return self.module.CANDIDATE

    @property
    def packet(self) -> pathlib.Path:
        return self.candidate / "OWNER-DECISION-PACKET.md"

    @property
    def manifest(self) -> pathlib.Path:
        # The render-mode builder names its manifest BEHAVIOR_OUT and the
        # opening-band builder MANIFEST_OUT; each builder names exactly one.
        names = [n for n in ("BEHAVIOR_OUT", "MANIFEST_OUT") if hasattr(self.module, n)]
        if len(names) != 1:
            raise ValueError(f"{self.builder} must name exactly one manifest constant, found {names}")
        return getattr(self.module, names[0])

    @property
    def subjects(self) -> tuple[pathlib.Path, ...]:
        return tuple(self.module.BEHAVIOR_SUBJECTS)

    @property
    def patched(self) -> tuple[pathlib.Path, ...]:
        return tuple(self.module.PATCHED)


ACTS = {
    "render-mode": Act(
        "render-mode",
        "build_pwb_exact_source_render_mode_amendment",
        "SIGN OFF PWB EXACT-SOURCE RENDER-MODE AMENDMENT",
        "PWB-EXACT-SOURCE-RENDER-MODE-AMENDMENT-ACT.md",
        "PWB-EXACT-SOURCE-RENDER-MODE-AMENDMENT-SIGNOFF",
        "PWB exact-source render-mode amendment sign-off",
        # main commit carrying the regenerated manifest and packet bytes
        "4b2f0df92676dfb89ca600c15f349070251d74bb",
        "4b2f0df92676dfb89ca600c15f349070251d74bb",
        "docs/reviews/R-PWB-EXACT-SOURCE-RENDER-MODE-DELTA-CONFIRMATION-3-RAW.md",
        "pwb-exact-source-render-mode-amendment",
        """PWB-REQ-011 is amended so that the exact-source route serves every source
the evaluation admitted as a classified blob, in exactly one render mode
drawn from a closed two-mode set: the existing requirement-section mode for
sources with requirement headings, and a whole-body mode for the rest. A
source whose record outcome is excluded is served in no mode, as its own
invariant and scenario. Every mode applies the same authority, exact-object,
secret-detection and inert-content gates to the complete transient body
before encoding any part of it; a failed gate leaves the body Unknown with
its reason. Each served mode exposes a presentation-only scroll anchor per
reading unit a citation can name, which never enters, replaces or qualifies
any source, claim or narrative anchor identity. Each served route's mode,
each source identity and each refusal's reason are recoverable per rendered
tuple from the same evaluation in the machine answer, so the parity sweep
extends over the anchor parameter. `design.md` §8 carries the argument for
the wider source population inside the one consented content class,
`CAPABILITY-COVERAGE.md` row 10 restates the obligation, and
`GOVERNING-DEPENDENCIES.md` is regenerated.""",
        """No content class widens: the route reads only what the performed consent
covers, and the nine withheld sources (seven TOML butler manifests, one
frontend page, one excluded artifact) stay digest-only with the source
denominator unchanged. No detector changes. PWB-REQ-014, PWB-REQ-020,
PWB-REQ-003, -005, -006 and -015 are not amended; the P-81 Q5 PWB-REQ-015
delta and the P-82 PWB-REQ-002 delta are separate changes. This act
authorizes no implementation of the amended semantics: the pursuit bead
under M14 opens only under a fresh, separate owner authorization, and the
269-of-278 figure and the page-size effect are measured there, never
assumed here.""",
        disposition_record=".syzygy/governance/contracts/candidates/pwb-exact-source-render-mode-scenario/ROUND-3-DISPOSITIONS.md",
        disposition_sha256="1cf483ba217e342a8f7634255ee610d4c0aea226b881130aaf5fda8a12533724",
        raw_findings_heading="## Findings",
    ),
    "machine-view": Act(
        "machine-view",
        "build_pwb_machine_view_amendment",
        "SIGN OFF PWB MACHINE-VIEW AMENDMENT",
        "PWB-MACHINE-VIEW-AMENDMENT-ACT.md",
        "PWB-MACHINE-VIEW-AMENDMENT-SIGNOFF",
        "PWB machine-view amendment sign-off",
        # main commit carrying the regenerated manifest and packet bytes
        "e58fd1cd1021734a6a617e87424ad3b531c3a61c",
        "e58fd1cd1021734a6a617e87424ad3b531c3a61c",
        "docs/reviews/R-PWB-MACHINE-VIEW-DELTA-CONFIRMATION-6-RAW.md",
        "pwb-machine-view-amendment",
        """PWB-REQ-020 gains one block, inside the requirement and before its SHALL
sentence, that names two closed categories of machine response served beside
the machine answer: the derived read-only machine view, whose members are
`GET /api/poc/polaris` and the prospective `GET /api/poc/briefing`, and the
generated editorial draft view, whose member is `GET /polaris/draft/<runId>`.
Every value a derived view serves is independently verified as derivable from
the machine answer's own bytes. A member that needs a ceiling of its own is
not served before the adapter-registry entry's resource envelope declares it.
A route enters either category only by a later amendment to this specification
naming it, and a route in neither category is neither admitted nor forbidden
by this requirement. The narrow reading of RFC6-21 is taken.
`GOVERNING-DEPENDENCIES.md` is regenerated.""",
        """This act authorizes no implementation: no route is built or served, and the
briefing member stays unservable until its ceiling is declared and the route
is separately authorized. It amends no byte of PWB-REQ-004, -011, -014 or
-016, widens no content class, consent, read, write or egress, and edits no
registry or policy byte. The second category's record-level fields and its
relation to the exact-source anchors are left to the later route amendment
that names the member.""",
        disposition_record=".syzygy/governance/contracts/candidates/pwb-machine-view-amendment/ROUND-7-DISPOSITIONS.md",
        disposition_sha256="4249c205558aca0be67efeeeb7360d2f16c0092f8aab66f1dc3df8e61a7af2e4",
        raw_findings_heading="## Findings",
    ),
    "opening-band": Act(
        "opening-band",
        "build_pwb_opening_band_scenario",
        "SIGN OFF PWB OPENING-BAND SCENARIO",
        "PWB-OPENING-BAND-SCENARIO-ACT.md",
        "PWB-OPENING-BAND-SCENARIO-SIGNOFF",
        "PWB opening-band scenario sign-off",
        # main commit carrying the offered manifest and packet bytes; round 11
        # read 9162d62, whose package bytes are identical to these
        "3369410d1e08366b852422a457e473e5fec64f1c",
        "3369410d1e08366b852422a457e473e5fec64f1c",
        "docs/reviews/R-PWB-OPENING-BAND-SCENARIO-DELTA-CONFIRMATION-10-RAW.md",
        "pwb-opening-band-scenario",
        """PWB-REQ-010 gains one conditional scenario: if Polaris's first reading
level renders an aggregate over the Unknown project-shape claims of one
evaluation before the first capability catalog, there is exactly one such
aggregate; it displaces no project-level category; it carries the
PWB-REQ-007 label, tier and freshness with separate primary and secondary
counts and no headline status; its population and counts equal the claims
it names; every counted member stays disclosed at its own claim and
reachable from the aggregate; and the machine answer carries the same
aggregate (PWB-REQ-020, under the owner's 2026-09-26 wider reading of
"disclosure"). The aggregate quantifies over project-shape Unknowns only;
the currency probe and other region blocks are outside its population.
Nothing requires the band to be built. `GOVERNING-DEPENDENCIES.md` is
regenerated.""",
        """This act authorizes no implementation: M4 slice 3 needs a separate
owner implementation authorization, and slices 4 and 5 stay gated on the
`syzygy-dov.26` amendment the OQ-1 answer routes them to. It describes no
write into any observed repository, widens no content class, route or
consent, and amends PWB-REQ-007, PWB-REQ-020 and POC-REQ-032 in no byte.
The registry entry and secret-classification policy, whose declared
governing-contract digest this amendment stales, are edited by no part of
it.""",
        disposition_record=".syzygy/governance/contracts/candidates/pwb-opening-band-scenario/ROUND-11-DISPOSITIONS.md",
        disposition_sha256="0cc80226fb28bc49e836dff03d9bdb4c73884be2c8d7ae0a123f2c43e4221fea",
        raw_findings_heading="## Findings",
        split_phrase_packet=True,
    ),
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def phrase_for(act: Act, argument: str) -> str:
    return f"{act.label}: {argument}"


def committed_blob(root: pathlib.Path, commit: str, rel: pathlib.Path) -> bytes:
    done = subprocess.run(
        ["git", "-C", str(root), "show", f"{commit}:{rel.as_posix()}"],
        capture_output=True,
    )
    if done.returncode != 0:
        raise ValueError(
            f"cannot read {rel.as_posix()} at {commit}: "
            f"{done.stderr.decode().strip() or 'git show failed'}"
        )
    return done.stdout


def manifest_rows(text: str, act: Act) -> list[tuple[str, str]]:
    rows = ROW_RE.findall(text)
    if len(rows) != EXPECTED_ROWS:
        raise ValueError(f"manifest carries {len(rows)} rows, expected {EXPECTED_ROWS}")
    expected_paths = [p.as_posix() for p in act.subjects]
    if [path for _sha, path in rows] != expected_paths:
        raise ValueError("manifest path population or order differs from the builder's subjects")
    return rows


#: Packages signed off through the version-tagged recorder after the acts in
#: ACTS; each supersedes the rows it re-patched once its sign-off record exists.
VERSIONED_LATER = {
    "pwb-missing-currency-disclosure-scenario": (
        DECISIONS / "PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-missing-currency-disclosure-scenario/"
                     "PWB-MISSING-CURRENCY-DISCLOSURE-MANIFEST.txt"),
    ),
    "pwb-dismissal-expiry-amendment": (
        DECISIONS / "PWB-DISMISSAL-EXPIRY-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-dismissal-expiry-amendment/"
                     "PWB-DISMISSAL-EXPIRY-MANIFEST.txt"),
    ),
    "pwb-container-shape-profile-amendment": (
        DECISIONS / "PWB-CONTAINER-SHAPE-PROFILE-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-container-shape-profile-amendment/"
                     "PWB-CONTAINER-SHAPE-PROFILE-MANIFEST.txt"),
    ),
    "pwb-item-depth-amendment": (
        DECISIONS / "PWB-ITEM-DEPTH-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-item-depth-amendment/"
                     "PWB-ITEM-DEPTH-AMENDMENT-MANIFEST.txt"),
    ),
    "pwb-readability-successor": (
        DECISIONS / "PWB-READABILITY-SUCCESSOR-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-readability-successor/"
                     "PWB-READABILITY-SUCCESSOR-MANIFEST.txt"),
    ),
    "pwb-tree-framing-amendment": (
        DECISIONS / "PWB-TREE-FRAMING-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-tree-framing-amendment/"
                     "PWB-TREE-FRAMING-AMENDMENT-MANIFEST.txt"),
    ),
    "pwb-anchor-resolution-amendment": (
        DECISIONS / "PWB-ANCHOR-RESOLUTION-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-anchor-resolution-amendment/"
                     "PWB-ANCHOR-RESOLUTION-AMENDMENT-MANIFEST.txt"),
    ),
    "pwb-class-granular-extraction-amendment": (
        DECISIONS / "PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-class-granular-extraction-amendment/"
                     "PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-MANIFEST.txt"),
    ),
    "pwb-accessible-name-amendment": (
        DECISIONS / "PWB-ACCESSIBLE-NAME-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-accessible-name-amendment/"
                     "PWB-ACCESSIBLE-NAME-AMENDMENT-MANIFEST.txt"),
    ),
    "pwb-opening-index-amendment": (
        DECISIONS / "PWB-OPENING-INDEX-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "pwb-opening-index-amendment/"
                     "PWB-OPENING-INDEX-AMENDMENT-MANIFEST.txt"),
    ),
    # A Three-Surface POC package with no manifest: its sign-off record
    # carries the applied rows in manifest-row form and stands in for one.
    "three-surface-poc-governing-intent-amendment": (
        DECISIONS / "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md",
        DECISIONS / "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md",
    ),
    "three-surface-poc-vocabulary-epistemic-amendment": (
        DECISIONS / "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "three-surface-poc-vocabulary-epistemic-amendment/"
                     "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-MANIFEST.txt"),
    ),
    "three-surface-poc-governedby-reference-amendment": (
        DECISIONS / "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md",
        pathlib.Path(".syzygy/governance/contracts/candidates/"
                     "three-surface-poc-governedby-reference-amendment/"
                     "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt"),
    ),
}


def _later_rows(root: pathlib.Path, act: Act | None, path: str,
                skip_manifest: pathlib.Path | None = None) -> set[str]:
    """Every digest another performed source's manifest declares for `path`:
    each other ACTS entry and each version-tagged package whose record and
    manifest exist in `root`. A row is history only when the tree hashes to
    one of these; a digest no performed manifest names is still rejected."""
    found: set[str] = set()
    sources = [(a.record, a.manifest) for a in ACTS.values() if a is not act]
    for package, pair in VERSIONED_LATER.items():
        if pair[1] == skip_manifest:
            continue
        if package == "three-surface-poc-governedby-reference-amendment":
            import prepare_three_surface_poc_governedby_reference_recording as reference
            if not reference.is_signed(root):
                continue
        sources.append(pair)
    for record, manifest in sources:
        if not (root / record).is_file() or not (root / manifest).is_file():
            continue
        for sha, row_path in ROW_RE.findall((root / manifest).read_text()):
            if row_path == path:
                found.add(sha)
    return found


def validate_subject(
    root: pathlib.Path, act: Act, argument: str, applied: bool,
    manifest_override: bytes | None = None,
) -> list[tuple[str, str]]:
    """Stage 1 — the phrase names the manifest, and the manifest names the tree.

    `applied=False` is the pre-adoption state: the rows must equal the
    builder's PROPOSED bytes and the builder's own `--check` must be clean.
    `applied=True` is the post-adoption state: every row must hash the tree.
    Returns the rows.
    """
    if not SHA_RE.fullmatch(argument):
        raise ValueError("owner argument is not a 64-hex SHA-256")
    manifest_path = root / act.manifest
    if manifest_override is None and not manifest_path.is_file():
        raise ValueError(f"missing manifest: {act.manifest.as_posix()}")
    manifest_bytes = (manifest_override if manifest_override is not None
                      else manifest_path.read_bytes())
    manifest_sha = digest(manifest_bytes)
    if argument != manifest_sha:
        raise ValueError(
            f"owner argument {argument} does not match manifest {manifest_sha}"
        )
    if committed_blob(root, act.frozen_subject, act.manifest) != manifest_bytes:
        raise ValueError("frozen subject does not carry the presented manifest bytes")
    rows = manifest_rows(manifest_bytes.decode(), act)
    if applied:
        for expected_sha, path in rows:
            target = root / path
            actual = digest(target.read_bytes()) if target.is_file() else "absent"
            if actual != expected_sha and actual not in _later_rows(root, act, path):
                raise ValueError(f"manifest row does not hash the tree: {path}")
    else:
        findings = act.module.check()
        if findings:
            raise ValueError("package does not verify: " + " | ".join(findings))
        proposed = act.module.proposed_bytes()
        for expected_sha, path in rows:
            if digest(proposed[pathlib.Path(path)]) != expected_sha:
                raise ValueError(f"manifest row does not hash the proposed bytes: {path}")
    return rows


def validate_disposition(
    root: pathlib.Path, act: Act, argument: str, review: str,
    disposition_override: bytes | None = None,
) -> pathlib.Path:
    """Stage 2b (case (b) only) — a notes-only CONFIRM WITH EXCEPTIONS verdict
    is bound to a disposition record beside the package
    (POLARIS-GATE-SITTING-2026-09-26-DECISION.md §1), never by editing the
    reviewed bytes. See the module docstring for the exact predicate. Returns
    the disposition record's path, relative to `root`.
    """
    if act.disposition_record is None:
        raise ValueError(
            "confirmation review head carries CONFIRM WITH EXCEPTIONS but this "
            "act names no disposition record"
        )
    disposition_path = root / act.disposition_record
    if disposition_override is None and not disposition_path.is_file():
        raise ValueError(
            f"missing disposition record: {act.disposition_record.as_posix()}"
        )
    disposition_bytes = (disposition_override if disposition_override is not None
                         else disposition_path.read_bytes())
    # Pin check (finding 8) runs before any content check: a disposition
    # record is read live, so without a fixed sha256 pin an edit after the
    # ceremony would silently change what `--check` re-verifies.
    if act.disposition_sha256 is None:
        raise ValueError(
            "act names a disposition record but carries no disposition_sha256 pin"
        )
    if digest(disposition_bytes) != act.disposition_sha256:
        raise ValueError(
            "disposition record bytes do not match the pinned disposition_sha256"
        )
    text = disposition_bytes.decode()
    lines = text.splitlines()
    if f"Reviewed record: {act.confirmation_review.as_posix()}" not in lines:
        raise ValueError("disposition record does not name the reviewed raw's exact path")
    if f"Manifest SHA-256: {argument}" not in lines:
        raise ValueError("disposition record does not bind the offered manifest digest")
    if "Revise-severity findings: 0" not in lines:
        raise ValueError("disposition record does not state zero revise-severity findings")
    expected = _raw_finding_number_set(
        review, act.raw_findings_heading, label="confirmation review findings section",
    )
    if not expected:
        raise ValueError(
            "confirmation review carries CONFIRM WITH EXCEPTIONS but no "
            "countable numbered finding (neither a line-leading 'N. ' nor a "
            "bold '**Finding N —' marker outside any fenced code in its "
            "configured findings section) — a notes-only verdict with no "
            "countable note is a parse failure, not a pass"
        )
    actual = _finding_number_set(
        text, label="disposition record", forms=DISPOSITION_FINDING_FORMS,
    )
    if actual != expected:
        raise ValueError(
            f"disposition record findings {sorted(actual)} do not match the "
            f"raw's numbered findings {sorted(expected)}"
        )
    return act.disposition_record


SPLIT_DIGEST_HEADING_RE = re.compile(
    r"^Manifest SHA-256:[ \t]*\n(?:[ \t]*\n)*`([0-9a-f]{64})`[ \t]*$", re.MULTILINE)



def validate_split_phrase(packet_text: str, act: Act, argument: str) -> None:
    """A split-phrase packet names the label and binds exactly the argument.

    Fenced code blocks and HTML comments are blanked first (review finding 1,
    `docs/reviews/R-PWB-RECORDER-NOTES-ONLY-OPENING-BAND-WIRING-REVIEW-RAW.md`):
    a heading or label shown only as an example or hidden in a comment was
    never shown to the owner as the packet's own.
    """
    packet_text = re.sub(r"<!--.*?-->", "", _strip_fenced_code(packet_text), flags=re.S)
    if f"`{act.label}`" not in packet_text:
        raise ValueError("split-phrase packet does not name the act label in a code span")
    if phrase_for(act, argument) in packet_text:
        raise ValueError("split-phrase packet also carries a whole phrase; configure one form")
    headings = SPLIT_DIGEST_HEADING_RE.findall(packet_text)
    if len(headings) != 1:
        raise ValueError(
            f"split-phrase packet carries {len(headings)} Manifest SHA-256 headings, not exactly one")
    if headings[0] != argument:
        raise ValueError("split-phrase packet's Manifest SHA-256 heading does not bind the argument")


def validate_packet(
    root: pathlib.Path, act: Act, argument: str,
    packet_override: bytes | None = None, review_override: str | None = None,
    disposition_override: bytes | None = None,
) -> tuple[str, str, pathlib.Path | None]:
    """Stage 2 — the owner was shown this phrase, and a review confirmed these bytes.

    Accepts exactly the two head cases the module docstring states. Returns
    `(reviewed_commit, verdict, disposition_record_or_None)`; the reviewed
    commit is provenance, not binding, and `disposition_record` is set only
    for a case-(b) verdict.
    """
    packet_path = root / act.packet
    if packet_override is None and not packet_path.is_file():
        raise ValueError(f"missing owner packet: {act.packet.as_posix()}")
    packet_bytes = packet_override if packet_override is not None else packet_path.read_bytes()
    if getattr(act, "split_phrase_packet", False):
        validate_split_phrase(packet_bytes.decode(), act, argument)
    elif packet_bytes.decode().count(phrase_for(act, argument)) != 1:
        raise ValueError("owner packet does not contain exactly one exact phrase")
    if committed_blob(root, act.packet_head, act.packet) != packet_bytes:
        raise ValueError("packet-head commit does not carry the presented packet bytes")
    review_path = root / act.confirmation_review
    if review_override is None and not review_path.is_file():
        raise ValueError(f"missing confirmation review: {act.confirmation_review.as_posix()}")
    review = review_override if review_override is not None else review_path.read_text()
    lines = review.splitlines()
    head = lines[:4]
    if f"Manifest SHA-256: {argument}" not in head:
        raise ValueError("confirmation review does not bind the offered manifest digest")
    if CONFIRM_LINE in head:
        verdict = "CONFIRM"
    elif EXCEPTIONS_LINE in head:
        verdict = "CONFIRM WITH EXCEPTIONS"
    else:
        raise ValueError(
            "confirmation review head does not carry an accepted exact verdict "
            "line (Verdict: CONFIRM or Verdict: CONFIRM WITH EXCEPTIONS)"
        )
    reviewed = REVIEWED_COMMIT_RE.search("\n".join(head))
    if not reviewed:
        raise ValueError("confirmation review head does not name its reviewed commit")
    disposition_record = None
    if verdict == "CONFIRM WITH EXCEPTIONS":
        disposition_record = validate_disposition(
            root, act, argument, review, disposition_override=disposition_override,
        )
    return reviewed.group(1), verdict, disposition_record


def validate(root: pathlib.Path, act: Act, argument: str, applied: bool):
    rows = validate_subject(root, act, argument, applied)
    reviewed, verdict, disposition_record = validate_packet(root, act, argument)
    return rows, reviewed, verdict, disposition_record


def tag_for(act: Act, date: str) -> str:
    return f"{act.tag_stem}-signed-{date}"


def render_act(act: Act, argument: str, date: str, rows, reviewed: str,
               verdict: str = "CONFIRM",
               disposition_rel: pathlib.Path | None = None) -> str:
    artifact_table = "\n".join(f"| `{path}` | `{sha}` |" for sha, path in rows)
    if disposition_rel is None:
        review_bullet = (
            f"- confirmation review: `{act.confirmation_review.as_posix()}`, verdict\n"
            f"  `{verdict}`, bound to this manifest digest; the raw names reviewed commit\n"
            f"  `{reviewed}` [Observed — the raw's own line; binding is by digest]; and"
        )
    else:
        review_bullet = (
            f"- confirmation review: `{act.confirmation_review.as_posix()}`, verdict\n"
            f"  `{verdict}`, bound to this manifest digest; the raw names reviewed commit\n"
            f"  `{reviewed}` [Observed — the raw's own line; binding is by digest];\n"
            f"- disposition record: `{disposition_rel.as_posix()}`, dispositioning\n"
            f"  the review's notes under the `{verdict}` verdict, never by editing\n"
            f"  the reviewed bytes; and"
        )
    return f"""# Owner act — {act.title}

Date: {date}

Owner: Tzeusy

Act identity: `{act.identity}-{date}`

Project identity: `project:syzygy`

Provenance state: `owner-adopted (bootstrap, uncorrelated)`

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was presented the independently confirmed packet at
`{act.packet.as_posix()}`
and performed the offered indivisible behavior amendment by writing exactly:

```text
{phrase_for(act, argument)}
```

The argument is the SHA-256 of
`{act.manifest.as_posix()}`.
It was recomputed at recording and matched the phrase. The manifest bytes
were verified against frozen subject `{act.frozen_subject}`; the package's
patches were applied through its builder in the same change, and all eleven
rows were then verified to hash the tree. The presented packet bytes were
verified against the packet head. The act instant is the moment the owner
wrote the phrase, in-interaction, on {date}.

Frozen provenance:

- frozen subject (manifest and packet bytes): `{act.frozen_subject}`;
- owner-packet head: `{act.packet_head}`;
{review_bullet}
- recording tag: `{tag_for(act, date)}`, on the commit carrying this act record.

## Effect

{act.effect}

This act is the latest link over the eleven-artifact PWB behavior
population. Every earlier act's rows remain immutable act-time history;
none is edited, retired or re-hashed by this record.

## Signed artifacts

| Repository-relative artifact | sha256 |
|---|---|
{artifact_table}

All eleven rows take effect together or none do. An edit to any listed
artifact breaks this act's digest binding and must use the amendment path.

## What this act does not authorize

{act.not_authorized}

It approves no policy, adopts no registry entry, widens no consent, and
grants no write, egress, observed-code execution, deployment, release,
recovery, mission, second repository, wider content class, autonomous
behavior or multi-user support. It proves no read, screening, parse, render,
answer or comprehension result. It does not edit the signed parent
`three-surface-poc-experience` artifacts, accept RFC 0010 or RFC 0011, amend
doctrine, or start automatic follow-on work.
"""


def aggregate_heading(act: Act, date: str) -> str:
    return f"## PWB behavior amendment — {act.act_type} — performed {date}"


def render_aggregate_block(act: Act, argument: str, date: str,
                           verdict: str = "CONFIRM",
                           disposition_rel: pathlib.Path | None = None) -> str:
    review_row = f"`{act.confirmation_review.as_posix()}`: `{verdict}`, bound to this manifest digest"
    if disposition_rel is not None:
        review_row += f"; disposition: `{disposition_rel.as_posix()}`"
    return f"""{aggregate_heading(act, date)}

**Phrase, exactly as written by the owner (in-interaction, {date}):**

```text
{phrase_for(act, argument)}
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Argument | SHA-256 of `{act.manifest.as_posix()}`, recomputed at recording and equal to the phrase |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject / packet head | `{act.frozen_subject}` / `{act.packet_head}` |
| Review outcome | {review_row} |
| Ceremony verification | {EXPECTED_ROWS} of {EXPECTED_ROWS} manifest rows verified against the tree after the package's patches were applied; manifest digest equals the phrase `[Observed, this act]` |
| Supersession | the latest link over the eleven-artifact PWB behavior population; every earlier act's rows remain immutable history |
| Recording | `{act.record.as_posix()}`; annotated tag `{tag_for(act, date)}` on the commit carrying these records |

Effective status: the eleven-artifact PWB package is **signed behavioral
authority — owner-adopted (bootstrap, uncorrelated)** at these bytes.

This act approves no policy, adopts no registry entry, widens no consent and
authorizes no implementation of the amended semantics; no write, egress,
execution, deployment, release, recovery or mission authority follows from
this act.
"""


def expected_outputs(root: pathlib.Path, act: Act, argument: str, date: str,
                     applied: bool) -> dict[pathlib.Path, str]:
    rows, reviewed, verdict, disposition_record = validate(root, act, argument, applied)
    aggregate = (root / AGGREGATE_REL).read_text()
    heading = aggregate_heading(act, date)
    occurrences = aggregate.count(heading)
    if occurrences > 1:
        raise ValueError("aggregate record contains duplicate sections for this act")
    prefix = aggregate.split(heading, 1)[0].rstrip() if occurrences else aggregate.rstrip()
    return {
        act.record: render_act(act, argument, date, rows, reviewed, verdict, disposition_record),
        AGGREGATE_REL: prefix + "\n\n" + render_aggregate_block(
            act, argument, date, verdict, disposition_record),
    }


def registration_notes(act: Act, argument: str, date: str) -> str:
    return (
        "next, in the same change:\n"
        f"  1. git add the applied subjects ({len(act.patched)} patched files), "
        f"the two records, then commit and tag {tag_for(act, date)} on that commit\n"
        "  2. scripts/check_governance.py: append the PWB_SUCCESSOR_CHAIN link "
        f"for label {act.label!r} (its copy registration is already existence-gated)\n"
        "  3. run the PROJECT-STATUS.md battery; this package's builder --check "
        "now fails by design (proposed == current) and must leave the battery "
        "with the count sentence and hosted workflow updated together (CG-26)\n"
        f"  argument recorded: {argument}"
    )


def record(root: pathlib.Path, act: Act, argument: str, date: str, check: bool) -> int:
    if not DATE_RE.fullmatch(date):
        print("FAILED: --date must be YYYY-MM-DD")
        return 1
    if check:
        try:
            outputs = expected_outputs(root, act, argument, date, applied=True)
        except (ValueError, subprocess.CalledProcessError) as exc:
            print(f"FAILED: {exc}")
            return 1
        drift = []
        dedicated = root / act.record
        if not dedicated.is_file() or dedicated.read_text() != outputs[act.record]:
            drift.append(act.record)
        _, _, verdict, disposition_record = validate(root, act, argument, applied=True)
        aggregate = (root / AGGREGATE_REL).read_text()
        if aggregate.count(render_aggregate_block(
                act, argument, date, verdict, disposition_record)) != 1:
            drift.append(AGGREGATE_REL)
        for rel in drift:
            print(f"recorded act differs from regeneration: {rel.as_posix()}")
        if drift:
            return 1
        print(f"recorded PWB {act.act_type} behavior amendment act matches exact "
              f"owner argument; {EXPECTED_ROWS} of {EXPECTED_ROWS} rows hash the tree")
        return 0
    if (root / act.record).exists():
        print(f"FAILED: dedicated act already exists: {act.record.as_posix()}")
        return 1
    try:
        validate(root, act, argument, applied=False)
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"FAILED (before applying anything): {exc}")
        return 1
    code = act.module.apply(True)
    if code != 0:
        print(f"FAILED: builder --apply --at-adoption returned {code}; nothing recorded")
        return 1
    try:
        outputs = expected_outputs(root, act, argument, date, applied=True)
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"FAILED after apply: {exc}\n  the tree now carries the applied "
              "patches and no record; restore it with git checkout before retrying")
        return 1
    for rel, content in outputs.items():
        (root / rel).write_text(content)
        print(f"wrote {rel.as_posix()}")
    print(registration_notes(act, argument, date))
    return 0


class _FixtureAct:
    """A minimal stand-in exposing only what `validate_packet` reads. Used
    solely to exercise the case-(b) disposition predicate without adding a
    `disposition_record` to any real `ACTS` entry (POLARIS-GATE-SITTING-
    2026-09-26-DECISION.md §1: "wiring a real package is a later step")."""

    def __init__(self, label, packet, packet_head, confirmation_review,
                 disposition_record=None, disposition_sha256=None,
                 raw_findings_heading="## Findings"):
        self.label = label
        self.packet = packet
        self.packet_head = packet_head
        self.confirmation_review = confirmation_review
        self.disposition_record = disposition_record
        self.disposition_sha256 = disposition_sha256
        self.raw_findings_heading = raw_findings_heading


def selftest_disposition() -> list[tuple[str, bool]]:
    """Case (b) mutation fixtures, built entirely under a temp directory
    (never the tracked tree). Exercises every refusal condition the module
    docstring's case (b) lists, the fenced-region exclusion on both the raw
    and the disposition (finding 7, ``` and ~~~ fences, a longer-length
    close), the disposition_sha256 pin (finding 8: mismatch, missing, and
    matching), the bold `**Finding N —` marker form and a form mixing it
    with the line-leading form in one text, the zero-countable-findings
    fail-closed refusal, exact (non-contiguous, non-1-based) finding-set
    equality, duplicate-finding-number parse failures on both the raw and
    the disposition side, and the disposition-record-only ATX heading form
    (fenced, and confirmed absent from raw-side recognition) (syzygy-qqt
    scope addition), plus the exact configured raw findings-section boundary,
    concurrent repeatability, the invalid-info-string/bare-fence corner and
    the positive fixtures for each."""
    results = []

    def rejects(fn, needle, *args, **kwargs):
        try:
            fn(*args, **kwargs)
        except ValueError as exc:
            return needle in str(exc)
        return False

    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        rel_packet = pathlib.Path("PACKET.md")
        rel_review = pathlib.Path("REVIEW-RAW.md")
        rel_disposition = pathlib.Path("DISPOSITION.md")
        argument = "c" * 64

        act = _FixtureAct("FIXTURE CASE-B LABEL", rel_packet, "0" * 40, rel_review)

        def with_pin(disposition_bytes: bytes) -> bytes:
            """Set the fixture Act's pin to match these exact bytes, the way a
            real drafted package would, then hand the bytes back for the
            override kwarg — every case-(b) fixture below is exercising a
            predicate that runs *after* the pin check passes."""
            act.disposition_sha256 = digest(disposition_bytes)
            return disposition_bytes

        def accepts_case_b(review_text_: str, disposition_bytes: bytes) -> bool:
            try:
                reviewed, verdict, disposition = validate_packet(
                    root, act, argument, review_override=review_text_,
                    disposition_override=with_pin(disposition_bytes))
                return verdict == "CONFIRM WITH EXCEPTIONS" and disposition == rel_disposition
            except ValueError as exc:
                print(f"  (case-b unexpected failure: {exc})")
                return False

        (root / rel_packet).write_text(f"# Packet\n\n{phrase_for(act, argument)}\n")
        subprocess.run(["git", "init", "-q"], cwd=root, check=True)
        subprocess.run(["git", "config", "gc.auto", "0"], cwd=root, check=True)
        subprocess.run(["git", "config", "maintenance.auto", "false"], cwd=root, check=True)
        subprocess.run(["git", "config", "user.email", "fixture@example.invalid"],
                       cwd=root, check=True)
        subprocess.run(["git", "config", "user.name", "Fixture"], cwd=root, check=True)
        subprocess.run(["git", "add", rel_packet.as_posix()], cwd=root, check=True)
        subprocess.run(["git", "commit", "-q", "-m", "fixture packet"], cwd=root, check=True)
        act.packet_head = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=root, capture_output=True, text=True, check=True,
        ).stdout.strip()

        review_text = (
            "# Review — fixture (round 1, confirmation)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "1. First finding, notes only.\n"
            "2. Second finding, notes only.\n"
        )

        good_disposition = (
            "# Disposition — fixture\n"
            f"Reviewed record: {rel_review.as_posix()}\n"
            f"Manifest SHA-256: {argument}\n"
            "Revise-severity findings: 0\n"
            "\n"
            "1. Accepted as noted; no repair needed.\n"
            "2. Owner already ruled on this; dispositioned by that ruling.\n"
        )

        results.append((
            "case-b: no disposition_record configured on the Act rejected",
            rejects(validate_packet, "names no disposition record",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(good_disposition.encode()))))

        act.disposition_record = rel_disposition

        results.append((
            "case-b: valid CONFIRM WITH EXCEPTIONS with matching disposition accepted",
            accepts_case_b(review_text, good_disposition.encode())))

        configured_heading = act.raw_findings_heading
        act.raw_findings_heading = None
        results.append((
            "findings-section: a case-b Act with no raw_findings_heading refuses",
            rejects(validate_packet, "carries no raw_findings_heading",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(good_disposition.encode()))))
        act.raw_findings_heading = "Findings"
        results.append((
            "findings-section: a configured heading that is not an exact ATX "
            "heading line refuses",
            rejects(validate_packet, "not one exact nonempty ATX heading line",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(good_disposition.encode()))))
        act.raw_findings_heading = configured_heading

        missing_heading_review = review_text.replace("## Findings", "## Notes", 1)
        results.append((
            "findings-section: a raw missing its configured exact heading refuses",
            rejects(validate_packet, "missing its configured raw findings heading",
                    root, act, argument, review_override=missing_heading_review,
                    disposition_override=with_pin(good_disposition.encode()))))

        repeated_heading_review = review_text + "\n## Findings\n\n3. Later section.\n"
        results.append((
            "findings-section: a repeated configured heading refuses as ambiguous",
            rejects(validate_packet, "configured raw findings heading more than once",
                    root, act, argument, review_override=repeated_heading_review,
                    disposition_override=with_pin(good_disposition.encode()))))

        scoped_review = (
            "# Review — fixture (section scoping)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Open questions\n"
            "\n"
            "1. This list is outside Findings.\n"
            "2. So is this one.\n"
            "\n"
            "## Findings\n"
            "\n"
            "1. First actual finding.\n"
            "\n"
            "### Nested detail\n"
            "\n"
            "**Finding 2 — Second actual finding in a nested subsection.\n"
            "\n"
            "## Risks\n"
            "\n"
            "1. Reused outside number after Findings.\n"
            "2. Another reused outside number.\n"
        )
        results.append((
            "findings-section: unrelated duplicate numbered lists before and "
            "after Findings are ignored while nested finding subsections remain",
            accepts_case_b(scoped_review, good_disposition.encode())))

        scoped_before = scoped_review

        def parse_scoped_review():
            try:
                return _raw_finding_number_set(
                    scoped_review, act.raw_findings_heading,
                    label="repeatability fixture",
                )
            except ValueError:
                return None

        sequential = [parse_scoped_review() for _ in range(2)]
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            concurrent_results = list(pool.map(
                lambda _: parse_scoped_review(),
                range(8),
            ))
        results.append((
            "findings-section: sequential and concurrent parses are deterministic "
            "and leave the input unchanged",
            sequential == [{1, 2}, {1, 2}]
            and concurrent_results == [{1, 2}] * 8
            and scoped_review == scoped_before,
        ))

        results.append((
            "case-b: missing disposition record file rejected",
            rejects(validate_packet, "missing disposition record",
                    root, act, argument, review_override=review_text)))

        bad_path = good_disposition.replace(
            f"Reviewed record: {rel_review.as_posix()}",
            "Reviewed record: some/other/RAW.md", 1)
        results.append((
            "case-b: disposition naming the wrong raw path rejected",
            rejects(validate_packet, "does not name the reviewed raw's exact path",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(bad_path.encode()))))

        bad_digest = good_disposition.replace(
            f"Manifest SHA-256: {argument}", "Manifest SHA-256: " + "d" * 64, 1)
        results.append((
            "case-b: disposition digest mismatch rejected",
            rejects(validate_packet, "does not bind the offered manifest digest",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(bad_digest.encode()))))

        nonzero_revise = good_disposition.replace(
            "Revise-severity findings: 0", "Revise-severity findings: 1", 1)
        results.append((
            "case-b: nonzero revise-severity count rejected",
            rejects(validate_packet, "does not state zero revise-severity findings",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(nonzero_revise.encode()))))

        missing_finding = good_disposition.replace(
            "2. Owner already ruled on this; dispositioned by that ruling.\n", "")
        results.append((
            "case-b: disposition missing one of the raw's numbered findings rejected",
            rejects(validate_packet, "do not match the raw's numbered findings",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(missing_finding.encode()))))

        extra_finding = good_disposition + "3. An extra disposition the raw never raised.\n"
        results.append((
            "case-b: disposition naming an extra finding beyond the raw's rejected",
            rejects(validate_packet, "do not match the raw's numbered findings",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(extra_finding.encode()))))

        revise_review = review_text.replace(
            "Verdict: CONFIRM WITH EXCEPTIONS", "Verdict: REVISE", 1)
        results.append((
            "case-b: REVISE verdict rejected outright even with a valid disposition present",
            rejects(validate_packet, "does not carry an accepted exact verdict line",
                    root, act, argument, review_override=revise_review,
                    disposition_override=with_pin(good_disposition.encode()))))

        # --- finding 7: fence exclusion must apply to BOTH the raw and the
        # disposition, for ```-fences, ~~~-fences and a longer-length close ---

        fenced_decoy_raw = (
            review_text
            + "\n"
            + "A fenced example only, not a third finding:\n"
            + "\n"
            + "```text\n"
            + "3. this looks like a finding but is inside a code fence\n"
            + "```\n"
        )
        results.append((
            "finding-7: a raw's fenced decoy numbered line does not inflate "
            "the raw finding count past 2",
            _finding_number_set(fenced_decoy_raw, label="raw") == {1, 2}))
        results.append((
            "finding-7: a raw carrying a fenced decoy still validates against "
            "the real 2-finding disposition",
            accepts_case_b(fenced_decoy_raw, good_disposition.encode())))

        disposition_fenced_decoy = (
            "# Disposition — fixture\n"
            f"Reviewed record: {rel_review.as_posix()}\n"
            f"Manifest SHA-256: {argument}\n"
            "Revise-severity findings: 0\n"
            "\n"
            "1. Accepted as noted; no repair needed.\n"
            "\n"
            "Not a disposition of finding 2 — just an example, fenced below:\n"
            "\n"
            "```text\n"
            "2. inside a fence; must not count as dispositioning finding 2\n"
            "```\n"
        )
        results.append((
            "finding-7: a disposition's fenced decoy numbered line does not "
            "satisfy the raw's real finding 2",
            rejects(validate_packet, "do not match the raw's numbered findings",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(disposition_fenced_decoy.encode()))))

        tilde_fenced_raw = (
            review_text
            + "\n"
            + "~~~text\n"
            + "3. tilde-fenced decoy, must not count\n"
            + "~~~\n"
        )
        results.append((
            "finding-7: a tilde-fenced decoy does not inflate the raw finding "
            "count past 2",
            _finding_number_set(tilde_fenced_raw, label="raw") == {1, 2}))

        longer_close_raw = (
            "# Review — fixture (round 1, confirmation)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "1. First finding, notes only.\n"
            "2. Second finding, notes only.\n"
            "\n"
            "```text\n"
            "3. decoy inside a fence closed by a longer fence line\n"
            "````\n"
            "\n"
            "Trailing prose after the fence closes; not a finding.\n"
        )
        results.append((
            "finding-7: a longer closing fence (4 backticks closing a "
            "3-backtick open) still closes, so its decoy 3. does not count",
            _finding_number_set(longer_close_raw, label="raw") == {1, 2}))

        invalid_info_then_bare_raw = (
            "# Review — fixture (invalid info then bare fence)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "1. First visible finding.\n"
            "```te`xt\n"
            "2. The invalid-info line above is not a fence opener.\n"
            "```\n"
            "3. This finding is inside the later real fence through EOF.\n"
        )
        three_finding_disposition = (
            good_disposition
            + "3. Disposition for the finding hidden by the real bare fence.\n"
        )
        results.append((
            "finding-5: invalid backtick info followed by a bare real fence "
            "cannot falsely validate a disposition naming the hidden finding",
            rejects(validate_packet, "do not match the raw's numbered findings",
                    root, act, argument, review_override=invalid_info_then_bare_raw,
                    disposition_override=with_pin(
                        three_finding_disposition.encode()))))

        # --- finding 8: the disposition record is sha256-pinned ---

        act.disposition_sha256 = digest(b"not the actual disposition bytes")
        results.append((
            "finding-8: disposition sha256 mismatch refuses",
            rejects(validate_packet, "do not match the pinned disposition_sha256",
                    root, act, argument, review_override=review_text,
                    disposition_override=good_disposition.encode())))

        act.disposition_sha256 = None
        results.append((
            "finding-8: a disposition_record with no disposition_sha256 pin "
            "refuses, distinctly from a mismatch",
            rejects(validate_packet, "carries no disposition_sha256 pin",
                    root, act, argument, review_override=review_text,
                    disposition_override=good_disposition.encode())))

        results.append((
            "finding-8: a disposition_sha256 pin matching the actual bytes "
            "passes case (a) unchanged and lets case (b) proceed",
            accepts_case_b(review_text, good_disposition.encode())))

        # --- syzygy-qqt scope addition: the bold `**Finding N —` marker
        # form (the real P-71 opening-band-scenario raws' only form), the
        # zero-countable-findings fail-closed refusal, exact (not `{1..N}`)
        # set equality across non-contiguous, non-1-based numbering, and
        # duplicate-number parse failures ---

        bold_review = (
            "# Review — fixture (round 1, confirmation, bold form)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "**Finding 1 — First finding, notes only.\n"
            "\n"
            "**Finding 2 — Second finding, notes only.\n"
        )
        results.append((
            "finding-bold: a raw whose findings open `**Finding N —` "
            "(bold, no line-leading form at all) is read as {1, 2}, not 0",
            _finding_number_set(bold_review, label="raw") == {1, 2}))
        results.append((
            "finding-bold: a bold-form raw validates against the same "
            "line-leading-form 2-finding disposition",
            accepts_case_b(bold_review, good_disposition.encode())))

        mixed_review = (
            "# Review — fixture (round 1, confirmation, mixed form)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "1. First finding, line-leading form.\n"
            "\n"
            "**Finding 2 — Second finding, bold form.\n"
        )
        results.append((
            "finding-bold: a raw mixing the line-leading and bold forms in "
            "the same text is read as the union, {1, 2}",
            _finding_number_set(mixed_review, label="raw") == {1, 2}))
        results.append((
            "finding-bold: a mixed-form raw validates against the ordinary "
            "2-finding disposition",
            accepts_case_b(mixed_review, good_disposition.encode())))

        zero_count_review = (
            "# Review — fixture (round 1, confirmation, no markers)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "Prose only; this raw opens no line-leading `N. ` marker and no "
            "bold `**Finding N —` marker anywhere.\n"
        )
        results.append((
            "zero-count: a CONFIRM WITH EXCEPTIONS raw with no countable "
            "finding marker at all refuses, distinctly from a mismatch",
            rejects(validate_packet, "no countable numbered finding",
                    root, act, argument, review_override=zero_count_review,
                    disposition_override=with_pin(good_disposition.encode()))))

        nonbase_review = (
            "# Review — fixture (round 11, confirmation, continued "
            "numbering)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "**Finding 49 — first note, continuing the package's own "
            "numbering across rounds.\n"
            "\n"
            "**Finding 50 — second note.\n"
        )
        nonbase_disposition = (
            "# Disposition — fixture (round 11)\n"
            f"Reviewed record: {rel_review.as_posix()}\n"
            f"Manifest SHA-256: {argument}\n"
            "Revise-severity findings: 0\n"
            "\n"
            "49. Accepted as noted; no repair needed.\n"
            "50. Owner already ruled on this; dispositioned by that ruling.\n"
        )
        results.append((
            "non-1-based: a raw numbered {49, 50} (numbering continues "
            "across rounds, never restarts at 1) validates against a "
            "disposition dispositioning exactly {49, 50}",
            accepts_case_b(nonbase_review, nonbase_disposition.encode())))
        results.append((
            "non-1-based: a disposition dispositioning {1, 2} does not "
            "satisfy a raw numbered {49, 50} — set equality, not a count "
            "or a `{1..N}` range",
            rejects(validate_packet, "do not match the raw's numbered findings",
                    root, act, argument, review_override=nonbase_review,
                    disposition_override=with_pin(good_disposition.encode()))))

        dup_review = (
            "# Review — fixture (round 1, confirmation, duplicate marker)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "1. First occurrence of finding 1.\n"
            "\n"
            "1. A second line also opens as finding 1 — a parse failure, "
            "not a re-used number.\n"
        )
        results.append((
            "duplicate: a raw with the same finding number opening two "
            "lines refuses as a parse failure",
            rejects(validate_packet, "carries a finding number more than once",
                    root, act, argument, review_override=dup_review,
                    disposition_override=with_pin(good_disposition.encode()))))

        dup_disposition = (
            "# Disposition — fixture (duplicate)\n"
            f"Reviewed record: {rel_review.as_posix()}\n"
            f"Manifest SHA-256: {argument}\n"
            "Revise-severity findings: 0\n"
            "\n"
            "1. First occurrence.\n"
            "\n"
            "1. Second line also claims finding 1.\n"
        )
        results.append((
            "duplicate: a disposition with the same finding number opening "
            "two lines refuses as a parse failure",
            rejects(validate_packet, "carries a finding number more than once",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(dup_disposition.encode()))))

        # --- syzygy-qqt scope addition: an ATX heading marker
        # `^#{2,6} N — ` (exact em dash), disposition-record-only — the
        # real ROUND-11-DISPOSITIONS.md opens every entry `### N — ...`
        # and cannot be rewritten to carry either raw-recognized form ---

        heading_disposition = (
            "# Disposition — fixture (heading form)\n"
            f"Reviewed record: {rel_review.as_posix()}\n"
            f"Manifest SHA-256: {argument}\n"
            "Revise-severity findings: 0\n"
            "\n"
            "### 1 — Accepted as noted; no repair needed.\n"
            "\n"
            "### 2 — Owner already ruled on this; dispositioned by that "
            "ruling.\n"
        )
        results.append((
            "heading: a disposition dispositioning its findings with an "
            "ATX heading (`### N — `) validates against the ordinary "
            "2-finding raw",
            accepts_case_b(review_text, heading_disposition.encode())))

        heading_fenced_decoy_disposition = (
            "# Disposition — fixture (heading fenced decoy)\n"
            f"Reviewed record: {rel_review.as_posix()}\n"
            f"Manifest SHA-256: {argument}\n"
            "Revise-severity findings: 0\n"
            "\n"
            "### 1 — Accepted as noted; no repair needed.\n"
            "\n"
            "Not a disposition of finding 2 — just an example, fenced "
            "below:\n"
            "\n"
            "```text\n"
            "### 2 — inside a fence; must not count as dispositioning "
            "finding 2\n"
            "```\n"
        )
        results.append((
            "heading: a fenced heading-form decoy in the disposition does "
            "not satisfy the raw's real finding 2",
            rejects(validate_packet, "do not match the raw's numbered findings",
                    root, act, argument, review_override=review_text,
                    disposition_override=with_pin(
                        heading_fenced_decoy_disposition.encode()))))

        heading_in_raw = (
            "# Review — fixture (heading in raw, must not count)\n"
            f"Reviewed commit: {'b' * 40}\n"
            f"Manifest SHA-256: {argument}\n"
            "Verdict: CONFIRM WITH EXCEPTIONS\n"
            "\n"
            "## Findings\n"
            "\n"
            "1. First finding, notes only.\n"
            "\n"
            "### 2 — a heading-form line; disposition-only, must not count "
            "as a raw finding.\n"
        )
        results.append((
            "heading: a heading-form line in a raw is not a raw finding "
            "(heading recognition is disposition-only)",
            _finding_number_set(heading_in_raw, label="raw") == {1}))

    real_review_rel = pathlib.Path(
        "docs/reviews/R-PWB-OPENING-BAND-SCENARIO-DELTA-CONFIRMATION-10-RAW.md"
    )
    real_disposition_rel = pathlib.Path(
        ".syzygy/governance/contracts/candidates/pwb-opening-band-scenario/"
        "ROUND-11-DISPOSITIONS.md"
    )
    real_review = (ROOT / real_review_rel).read_text()
    real_disposition_bytes = (ROOT / real_disposition_rel).read_bytes()
    real_manifest = re.search(
        r"^Manifest SHA-256: ([0-9a-f]{64})$", real_review, re.MULTILINE,
    )
    real_act = _FixtureAct(
        "FIXTURE REAL ROUND-11 LABEL",
        pathlib.Path("unused-real-packet.md"),
        "0" * 40,
        real_review_rel,
        disposition_record=real_disposition_rel,
        disposition_sha256=digest(real_disposition_bytes),
        raw_findings_heading="## Findings",
    )
    real_findings = None
    try:
        real_findings = _raw_finding_number_set(
            real_review, real_act.raw_findings_heading,
            label="real round-11 confirmation review findings section",
        )
    except ValueError as exc:
        print(f"  (real round-11 finding parse failure: {exc})")
    results.append((
        "real round-11: exact Findings section derives {49, 50, 51, 52}",
        real_findings == {49, 50, 51, 52},
    ))
    real_validates = False
    if real_manifest is not None:
        try:
            real_validates = validate_disposition(
                ROOT,
                real_act,
                real_manifest.group(1),
                real_review,
                disposition_override=real_disposition_bytes,
            ) == real_disposition_rel
        except ValueError as exc:
            print(f"  (real round-11 disposition failure: {exc})")
    results.append((
        "real round-11: pinned disposition validates against the selected raw section",
        real_validates,
    ))

    return results


def selftest_case_b_act(act, exact, packet_bytes, review, rejects) -> list[tuple[str, bool]]:
    """Fixtures for a configured act bound to a notes-only verdict."""
    out = []
    staged = False
    try:
        _commit, verdict, disposition = validate_packet(ROOT, act, exact)
        staged = verdict == "CONFIRM WITH EXCEPTIONS" and disposition == act.disposition_record
    except ValueError as exc:
        print(f"  ({act.act_type} packet-stage failure: {exc})")
    out.append((f"{act.act_type}: notes-only verdict binds through its disposition record", staged))
    if act.split_phrase_packet:
        text = packet_bytes.decode()
        heading = f"Manifest SHA-256:\n`{exact}`"
        assert text.count(heading) == 1, "fixture packet lacks its split digest heading"
        out.append((f"{act.act_type}: split heading bound to another digest rejected",
                    rejects(validate_packet, "does not bind the argument", ROOT, act, exact,
                            packet_override=text.replace(heading, f"Manifest SHA-256:\n`{'0' * 64}`").encode())))
        out.append((f"{act.act_type}: two split digest headings rejected",
                    rejects(validate_packet, "not exactly one", ROOT, act, exact,
                            packet_override=text.replace(heading, heading + "\n\n" + heading).encode())))
        out.append((f"{act.act_type}: split packet without the label rejected",
                    rejects(validate_packet, "does not name the act label", ROOT, act, exact,
                            packet_override=text.replace(f"`{act.label}`", "`SIGN OFF SOMETHING ELSE`").encode())))
        out.append((f"{act.act_type}: split packet also carrying a whole phrase rejected",
                    rejects(validate_packet, "also carries a whole phrase", ROOT, act, exact,
                            packet_override=(text + "\n" + phrase_for(act, exact) + "\n").encode())))
        fenced = text.replace(heading, "```\n" + heading + "\n```")
        out.append((f"{act.act_type}: digest heading shown only inside a code fence rejected",
                    rejects(validate_packet, "not exactly one", ROOT, act, exact,
                            packet_override=fenced.encode())))
        out.append((f"{act.act_type}: digest heading hidden in an HTML comment rejected",
                    rejects(validate_packet, "not exactly one", ROOT, act, exact,
                            packet_override=text.replace(heading, "<!--\n" + heading + "\n-->").encode())))
        out.append((f"{act.act_type}: heading with its digest on the same line rejected",
                    rejects(validate_packet, "not exactly one", ROOT, act, exact,
                            packet_override=text.replace(heading, f"Manifest SHA-256: `{exact}`").encode())))
    for names, what in (((), "neither"), (("BEHAVIOR_OUT", "MANIFEST_OUT"), "both")):
        stub = types.SimpleNamespace(**{n: pathlib.Path("x") for n in names})
        probe = Act(act.act_type, "unused", act.label, "x.md", "x", "x", "0", "0", "x", "x", "", "")
        probe._module = stub
        out.append((f"{act.act_type}: builder naming {what} manifest constant refused",
                    rejects(lambda: probe.manifest, "exactly one manifest constant")))
    out.append((f"{act.act_type}: packet bytes the packet head lacks rejected",
                rejects(validate_packet, "packet-head commit does not carry",
                        ROOT, act, exact, packet_override=packet_bytes + b"\n")))
    out.append((f"{act.act_type}: review not binding the manifest rejected",
                rejects(validate_packet, "does not bind the offered manifest", ROOT, act, exact,
                        review_override=review.replace(f"Manifest SHA-256: {exact}", "Manifest SHA-256: " + "0" * 64, 1))))
    out.append((f"{act.act_type}: REVISE verdict rejected outright",
                rejects(validate_packet, "does not carry an accepted exact verdict line", ROOT, act, exact,
                        review_override=review.replace("Verdict: CONFIRM WITH EXCEPTIONS", "Verdict: REVISE", 1))))
    disposition = (ROOT / act.disposition_record).read_bytes()
    out.append((f"{act.act_type}: edited disposition record rejected by its pin",
                rejects(validate_packet, "do not match the pinned disposition_sha256", ROOT, act, exact,
                        disposition_override=disposition + b"\n")))
    return out


def selftest_superseded_rows() -> list[tuple[str, bool]]:
    """A row a later performed act re-patched is history only when that act's
    record and manifest exist and name the path; mutate each predicate."""
    import tempfile
    earlier, later = ACTS["opening-band"], ACTS["render-mode"]
    path = later.subjects[0].as_posix()
    manifest_text = "".join(f"{'ab' * 32}  {p.as_posix()}\n" for p in later.subjects)
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp)
        (root / later.manifest).parent.mkdir(parents=True)
        (root / later.record).parent.mkdir(parents=True, exist_ok=True)
        results.append(("superseded rows: no later record leaves the row unsuperseded",
                        not _later_rows(root, earlier, path)))
        (root / later.record).write_text("record\n")
        results.append(("superseded rows: record without its manifest leaves it unsuperseded",
                        not _later_rows(root, earlier, path)))
        (root / later.manifest).write_text(manifest_text)
        results.append(("superseded rows: record and manifest supply the later digest",
                        _later_rows(root, earlier, path) == {"ab" * 32}))
        results.append(("superseded rows: a path the later manifest lacks stays unsuperseded",
                        not _later_rows(root, earlier, "no/such/path.md")))
        results.append(("superseded rows: an act never supersedes itself",
                        not _later_rows(root, later, path)))
    return results


def selftest() -> int:
    results = []
    for act in ACTS.values():
        exact = digest((ROOT / act.manifest).read_bytes())
        packet_bytes = (ROOT / act.packet).read_bytes()
        review = (ROOT / act.confirmation_review).read_text()

        def rejects(fn, needle, *args, **kwargs):
            try:
                fn(*args, **kwargs)
            except ValueError as exc:
                return needle in str(exc)
            return False

        results.append((f"{act.act_type}: wrong owner argument rejected",
                        rejects(validate_subject, "does not match manifest",
                                ROOT, act, "0" * 64, False)))
        # A performed act leaves the tree applied: the exact argument then
        # validates in applied mode and the unapplied form no longer verifies.
        performed = act.record.is_file()
        pre = False
        try:
            pre = len(validate_subject(ROOT, act, exact, performed)) == EXPECTED_ROWS
        except ValueError as exc:
            print(f"  ({act.act_type} exact-argument failure: {exc})")
        if performed:
            results.append((f"{act.act_type}: exact argument validates after adoption", pre))
            results.append((f"{act.act_type}: unapplied form rejected once performed",
                            rejects(validate_subject, "package does not verify",
                                    ROOT, act, exact, False)))
        else:
            results.append((f"{act.act_type}: exact argument validates before adoption", pre))
            results.append((f"{act.act_type}: unapplied tree rejected in applied mode",
                            rejects(validate_subject, "does not hash the tree",
                                    ROOT, act, exact, True)))
        mutated_manifest = (ROOT / act.manifest).read_bytes().replace(b"\n", b"\n", 1) + b"#\n"
        results.append((f"{act.act_type}: manifest bytes the frozen subject lacks rejected",
                        rejects(validate_subject, "frozen subject does not carry",
                                ROOT, act, digest(mutated_manifest), False,
                                manifest_override=mutated_manifest)))
        staged = False
        try:
            reviewed_commit, staged_verdict, staged_disposition = validate_packet(ROOT, act, exact)
            staged = bool(reviewed_commit) and staged_verdict == "CONFIRM" and staged_disposition is None
        except ValueError as exc:
            print(f"  ({act.act_type} packet-stage failure: {exc})")
        if act.disposition_record is not None:
            # Case (b) acts: the CONFIRM-only fixtures below do not apply;
            # their own fixtures follow.
            results.extend(selftest_case_b_act(act, exact, packet_bytes, review, rejects))
            continue
        results.append((f"{act.act_type}: packet and confirmation review bind the argument", staged))
        phrase = phrase_for(act, exact).encode()
        doubled = packet_bytes.replace(phrase, phrase + b"\n" + phrase, 1)
        results.append((f"{act.act_type}: packet carrying two phrase copies rejected",
                        rejects(validate_packet, "exactly one exact phrase",
                                ROOT, act, exact, packet_override=doubled)))
        drifted = packet_bytes + b"\n"
        results.append((f"{act.act_type}: packet bytes the packet head lacks rejected",
                        rejects(validate_packet, "packet-head commit does not carry",
                                ROOT, act, exact, packet_override=drifted)))
        unbound = review.replace(f"Manifest SHA-256: {exact}", "Manifest SHA-256: " + "0" * 64, 1)
        results.append((f"{act.act_type}: review not binding the manifest rejected",
                        rejects(validate_packet, "does not bind the offered manifest",
                                ROOT, act, exact, review_override=unbound)))
        exceptions_verdict = review.replace("Verdict: CONFIRM", "Verdict: CONFIRM WITH EXCEPTIONS", 1)
        results.append((
            f"{act.act_type}: CONFIRM WITH EXCEPTIONS rejected when this act "
            "names no disposition record",
            rejects(validate_packet, "names no disposition record",
                    ROOT, act, exact, review_override=exceptions_verdict)))
        revise_verdict = review.replace("Verdict: CONFIRM", "Verdict: REVISE", 1)
        results.append((f"{act.act_type}: REVISE verdict rejected outright",
                        rejects(validate_packet, "does not carry an accepted exact verdict line",
                                ROOT, act, exact, review_override=revise_verdict)))
        buried = "\n".join(["# heading", "", ""] + review.splitlines())
        results.append((f"{act.act_type}: review markers outside the four-line head rejected",
                        rejects(validate_packet, "does not bind the offered manifest",
                                ROOT, act, exact, review_override=buried)))
        rows_pre, reviewed_pre, verdict_pre, disposition_pre = validate(ROOT, act, exact, False)
        rendered_act = render_act(act, exact, "2026-09-26", rows_pre, reviewed_pre,
                                  verdict_pre, disposition_pre)
        rendered_aggregate = render_aggregate_block(act, exact, "2026-09-26",
                                                     verdict_pre, disposition_pre)
        results.append((
            f"{act.act_type}: CONFIRM-only render_act byte-identical to the "
            "pre-case-(b) baseline",
            digest(rendered_act.encode())
            == "4dcbd3c2a74a2cfffa0bc1fb4832419906380a4dc2a267f64066f86cb60248ee",
        ))
        results.append((
            f"{act.act_type}: CONFIRM-only render_aggregate_block byte-identical "
            "to the pre-case-(b) baseline",
            digest(rendered_aggregate.encode())
            == "7967bf357378235ee4da53e68bb47f8a48f7fc984be90dd3bc029a2e5bb71241",
        ))
    results.extend(selftest_superseded_rows())
    results.extend(selftest_disposition())
    failing = 0
    for name, passed in results:
        failing += 0 if passed else 1
        print(f"{'PASS' if passed else 'FAIL'} {name}")
    print(f"{len(results)} recording fixtures, {failing} failing")
    return 0 if failing == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--record", nargs=2, metavar=("ACT_TYPE", "MANIFEST_SHA"))
    parser.add_argument("--check", nargs=2, metavar=("ACT_TYPE", "MANIFEST_SHA"))
    parser.add_argument("--date", metavar="YYYY-MM-DD", help="the date the owner wrote the phrase")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    selected = sum(bool(v) for v in (args.record, args.check, args.selftest))
    if selected != 1:
        parser.error("choose exactly one of --record, --check or --selftest")
    if args.selftest:
        return selftest()
    act_type, argument = args.record or args.check
    if act_type not in ACTS:
        parser.error(f"ACT_TYPE must be one of {', '.join(ACTS)}")
    if not args.date:
        parser.error("--date is required with --record/--check")
    return record(ROOT, ACTS[act_type], argument, args.date, check=bool(args.check))


if __name__ == "__main__":
    sys.exit(main())
