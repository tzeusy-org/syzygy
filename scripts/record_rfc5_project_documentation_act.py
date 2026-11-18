#!/usr/bin/env python3
"""Record or verify the owner's RFC5-14 `project-documentation` amendment act.

Package `contracts/candidates/rfc5-project-documentation-class/`. One
state-(1) owner act over the one row of `CONTRACT-AMENDMENT-MANIFEST.txt`: the
SHA-256 of `rfcs/RFC-0005/consent-egress-secrets.md` with the package patch
applied. The recommended form (packet, option 1) is an option selection that
names the record "at its manifest row"; no phrase is typed and no digest
appears in any Markdown file of the package. This script performs nothing by
itself, and it refuses to record anything unless `FROZEN_SUBJECT` names the
commit a confirming review read.

WHICH DIGEST. The act argument is the manifest ROW (the proposed-bytes
digest). The review raw's head `Manifest SHA-256:` carries the digest of the
manifest FILE; those are different values for this one-row manifest, and this
recorder checks each against the one it names. The manifest's own header
sentence ("names this file's digest") describes the typed-phrase form; it is
not edited here, and `reviews/ROUND-2-DISPOSITIONS.md` says why.

NOT REGISTERED IN check_governance.py. The row hashes proposed bytes, so it
equals the installed module's digest only after the install. Registering that
module as a CG-7d subject now makes the restyle and active manifests' rows for
the same path read as stale copies of this act's argument (CG-7e fails, tried
2026-10-04). The package carries no digest anywhere else, so there is no copy
to go stale; register the phrase in the install change, when subject and row
agree.

`--record ARGUMENT --date D --question-opening Q --selection-label L
--selection-description S` requires, before anything is written:

1. the argument is a 64-hex SHA-256 equal to the manifest's one row, the
   manifest rows are exactly the builder's one module, and the builder
   verifies (so a stale manifest or another digest is refused);
2. the subject bytes (the patched module, or the installed module once the
   patch is applied) hash to the argument;
3. the manifest on disk is the one the review bound (item 4) and the packet
   carries no 64-hex token; where the frozen commit is present in the object
   store it also carries the manifest, the patch, the packet, the brief, the
   delta and the ledger exactly as presented (the packet may gain one
   PERFORMED head), but a fresh clone after a rebase-merge does not have that
   commit, so its absence is accepted and the commit is provenance only;
4. the confirming raw's first four non-blank lines carry
   `Reviewed commit: <40 hex>`, `Manifest SHA-256: <SHA-256 of the manifest
   FILE>` and a verdict of `CONFIRM` or `CONFIRM WITH EXCEPTIONS`; the latter
   clears the bytes only when every finding is a `note` and the sibling
   `ROUND-2-DISPOSITIONS.md` names the raw and dispositions every finding;
5. the owner's selection (opening, label, description) is non-empty, one line
   each, and carries no 64-hex digest.

It then writes the dedicated record and one `ACCEPTANCE-ACT-RECORD.md`
section. It does NOT apply the patch: installing the proposed bytes in both
mirrors and regenerating what CG-7h and the contract index name belong in the
same change as the act record (packet, "Which act form"). `--check`
re-derives the record and counts exactly one copy of the block.
`--selftest` mutates each predicate and requires it to fail closed.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import pathlib
import re
import subprocess
import sys
from dataclasses import dataclass
from typing import Callable

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_rfc5_project_documentation_class as build  # noqa: E402
import record_versioned_signoff as vs  # noqa: E402

DECISIONS = pathlib.Path(".syzygy/governance/decisions")
AGGREGATE_REL = DECISIONS / "ACCEPTANCE-ACT-RECORD.md"
PKG = build.PACKAGE
MANIFEST_REL = build.MANIFEST
PATCH_REL = build.patch_path()
PACKET_REL = PKG / "OWNER-DECISION-PACKET.md"
BRIEF_REL = PKG / "REVIEW-BRIEF.md"
DELTA_REL = PKG / "SEMANTIC-DELTA.md"
LEDGER_REL = PKG / "IMPACT-LEDGER.md"
CONFIRMATION_REVIEW_REL = PKG / "reviews/R-RFC5-PROJECT-DOCUMENTATION-CLASS-2-RAW.md"
DISPOSITION_REL = PKG / "reviews/ROUND-2-DISPOSITIONS.md"
PRESENTED = (MANIFEST_REL, PATCH_REL, PACKET_REL, BRIEF_REL, DELTA_REL, LEDGER_REL)
#: The commit the confirming review read (round 2, CONFIRM WITH EXCEPTIONS,
#: notes only; the 2026-09-26 owner ruling clears those bytes). Provenance:
#: the commit is unreachable from main after a rebase-merge and its branch is
#: deleted, so the recorder verifies bytes on disk and binds by digest, never
#: by ancestry or by reading the object store.
FROZEN_SUBJECT: str | None = "dff2f0dc5cf6b8a876c4d4233cb0bef8e3e7dce4"
VERDICTS = ("CONFIRM", "CONFIRM WITH EXCEPTIONS")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
HEX64_RE = re.compile(r"[0-9a-f]{64}")
ROW_RE = re.compile(r"^([0-9a-f]{64})  (\S+)$", re.MULTILINE)
REVIEWED_COMMIT_RE = re.compile(r"^Reviewed commit: ([0-9a-f]{40})\s*$", re.MULTILINE)
VERDICT_RE = re.compile(r"^Verdict: (.+?)\s*$")
PERFORMED_HEAD_RE = re.compile(
    rb"\A((?:> \*\*Candidate[^\n]*\n(?:> [^\n]*\n)*\n)?)"
    rb"> \*\*PERFORMED \d{4}-\d{2}-\d{2}\.\*\*[^\n]*\n(?:> [^\n]*\n)*\n"
)

LABEL = "AMEND RFC5-14 WITH THE PROJECT-DOCUMENTATION CONTENT CLASS"
ACT_TYPE = "contract-amendment"
KEY = "rfc5-project-documentation"
MODULE = build.MODULE
RECORD_REL = DECISIONS / "RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md"
EFFECT = (
    "RFC5-14's closed content-class vocabulary gains a seventh member, "
    "`project-documentation`, and one bullet saying the declared classification "
    "policy decides membership per file. The amendment takes effect when the "
    "same change applies the package patch to both mirrors of "
    "`rfcs/RFC-0005/consent-egress-secrets.md` and regenerates what CG-7h and "
    "the contract index name; this act record does not apply it. No existing "
    "consent gains the class, and no read, egress or implementation is "
    "authorized.")


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def phrase_for(argument: str) -> str:
    return f"{LABEL}: {argument}"


def tag_for(date: str) -> str:
    return f"rfc5-project-documentation-amendment-signed-{date}"


def identity_for(date: str) -> str:
    return f"RFC5-PROJECT-DOCUMENTATION-AMEND-{date}"


def git_blob(root: pathlib.Path, commit: str, rel: pathlib.Path) -> bytes | None:
    """The file at the frozen commit, or None when the commit is not in the store.

    A rebase-merge leaves the frozen commit unreachable and a deleted branch
    is never fetched, so a fresh clone does not have it. Absence is not an
    error: the subject is verified from bytes on disk (see `validate`).
    """
    have = subprocess.run(["git", "-C", str(root), "cat-file", "-e", f"{commit}^{{commit}}"],
                          capture_output=True)
    if have.returncode != 0:
        return None
    done = subprocess.run(["git", "-C", str(root), "show", f"{commit}:{rel.as_posix()}"],
                          capture_output=True)
    if done.returncode != 0:
        raise ValueError(f"cannot read {rel.as_posix()} at {commit}: "
                         f"{done.stderr.decode().strip() or 'git show failed'}")
    return done.stdout


@dataclass
class Inputs:
    """Everything validation reads, injectable for the selftest."""
    manifest: bytes
    subject: bytes
    packet: bytes
    review: str
    module_paths: list[str]
    builder_findings: list[str]
    frozen: str | None
    frozen_blob: Callable[[pathlib.Path], bytes | None]
    frozen_files: dict[pathlib.Path, bytes]
    disposition_check: Callable[[dict[int, str]], None]


def live_inputs(root: pathlib.Path) -> Inputs:
    files = {rel: (root / rel).read_bytes() for rel in PRESENTED if (root / rel).is_file()}
    proposed, _applying = build.proposed_bytes(root)
    if build.applied(root):
        subject = (root / build.CONTRACTS / MODULE).read_bytes()
        findings: list[str] = []
    else:
        subject = proposed.get(MODULE, b"")
        findings = build.check(root)
    review_path = root / CONFIRMATION_REVIEW_REL
    return Inputs(
        manifest=files.get(MANIFEST_REL, b""),
        subject=subject,
        packet=files.get(PACKET_REL, b""),
        review=review_path.read_text() if review_path.is_file() else "",
        module_paths=[MODULE], builder_findings=findings, frozen=FROZEN_SUBJECT,
        frozen_blob=lambda rel: git_blob(root, FROZEN_SUBJECT or "", rel),
        frozen_files=files,
        disposition_check=lambda found: vs.validate_disposition(
            root, CONFIRMATION_REVIEW_REL.as_posix(), DISPOSITION_REL.as_posix(), found),
    )


def validate(argument: str, inp: Inputs) -> tuple[str, str, str]:
    """Return (manifest file sha, reviewed commit, verdict) or raise ValueError."""
    if inp.frozen is None:
        raise ValueError("no confirming review is recorded: FROZEN_SUBJECT is unset, "
                         "so nothing may be recorded")
    if not SHA_RE.fullmatch(argument):
        raise ValueError("owner argument is not a 64-hex SHA-256")
    rows = ROW_RE.findall(inp.manifest.decode())
    if [path for _sha, path in rows] != inp.module_paths:
        raise ValueError("manifest row population differs from the one RFC-0005 module")
    row = rows[0][0]
    if row != argument:
        raise ValueError(f"owner argument {argument} is not the manifest row {row}")
    if inp.builder_findings:
        raise ValueError("builder does not verify the package: "
                         + "; ".join(inp.builder_findings))
    if digest(inp.subject) != argument:
        raise ValueError(f"proposed module hashes to {digest(inp.subject)}, "
                         "not the owner argument")
    for rel, current in inp.frozen_files.items():
        expected = current if rel != PACKET_REL else PERFORMED_HEAD_RE.sub(rb"\1", current, count=1)
        blob = inp.frozen_blob(rel)
        # Provenance cross-check only: where the frozen commit is in the object
        # store it must carry the presented bytes; where it is not (a fresh
        # clone after a rebase-merge) the binding rests on the bytes on disk,
        # the manifest row and the raw head's manifest-file digest below.
        if blob is not None and blob != expected:
            raise ValueError(f"frozen subject does not carry the presented bytes of {rel.as_posix()}")
    if HEX64_RE.search(inp.packet.decode()):
        raise ValueError("owner packet carries a 64-hex token; the argument comes only "
                         "from the manifest row")
    manifest_sha = digest(inp.manifest)
    head = [line for line in inp.review.splitlines() if line.strip()][:4]
    if f"Manifest SHA-256: {manifest_sha}" not in head:
        raise ValueError("confirmation review head does not bind the manifest file's SHA-256")
    verdicts = [m.group(1) for line in head if (m := VERDICT_RE.match(line))]
    if len(verdicts) != 1 or verdicts[0] not in VERDICTS:
        raise ValueError("confirmation review head does not carry the verdict CONFIRM "
                         "or CONFIRM WITH EXCEPTIONS")
    reviewed = REVIEWED_COMMIT_RE.search("\n".join(head))
    if not reviewed:
        raise ValueError("confirmation review head does not name its reviewed commit")
    if reviewed.group(1) != inp.frozen:
        raise ValueError("confirmation review read a commit other than FROZEN_SUBJECT")
    if verdicts[0] == "CONFIRM WITH EXCEPTIONS":
        findings = vs.review_findings(inp.review)
        if not findings:
            raise ValueError("CONFIRM WITH EXCEPTIONS carries no countable finding")
        bad = {n: s for n, s in findings.items() if s != "note"}
        if bad:
            raise ValueError(f"review carries non-note findings {bad}; only a "
                             "notes-only round clears the bytes")
        inp.disposition_check(findings)
    return manifest_sha, reviewed.group(1), verdicts[0]


@dataclass(frozen=True)
class Selection:
    opening: str
    label: str
    description: str

    def validate(self) -> None:
        for name, value in (("opening", self.opening), ("label", self.label),
                            ("description", self.description)):
            if not value.strip() or "\n" in value:
                raise ValueError(f"owner selection {name} must be one non-empty line")
            if HEX64_RE.search(value):
                raise ValueError(f"owner selection {name} carries a 64-hex digest")


INSTANT_RE = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z")


def render_act(argument: str, date: str, manifest_sha: str, reviewed: str,
               verdict: str, sel: Selection, frozen: str, instant: str) -> str:
    return f"""# Owner act — RFC5-14 project-documentation content-class amendment

Date: {date}

Owner: Tzeusy

Act identity: `{identity_for(date)}`

Act instant: {instant}

Act type: `{ACT_TYPE}`

Project identity: `project:syzygy`

Artifact identity: `.syzygy/governance/contracts/{MODULE}`

Exact digest (SHA-256): `{argument}`

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly selected by the owner's option selection recorded below

Supersession / revocation: none recorded by this act. This act is revoked only
by a later exact owner act naming it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was presented the confirmed packet at
`{PACKET_REL.as_posix()}`, which by design carries no digest. The act takes
this phrase, whose argument is the one row of the package manifest (the
SHA-256 of the module with the package patch applied):

```text
{phrase_for(argument)}
```

The owner did not type the phrase. On {date} the owner answered a structured
question in the Claude Code CLI that opened "{sel.opening}" by selecting the
option below; the selection is the instruction, and it names the record "at its
manifest row". The label and description, verbatim:

| Label | Description |
|---|---|
| "{sel.label}" | "{sel.description}" |

The argument was read from the row of `{MANIFEST_REL.as_posix()}` on disk at recording
and matched the patched module there. A swapped argument would
have been refused. The manifest header's sentence that rows bind "by the owner
act that names this file's digest" describes the typed-phrase form; this act
binds the row, as the packet's option 1 says.

Frozen provenance:

- frozen subject (package bytes): `{frozen}`;
- manifest file SHA-256: `{manifest_sha}` (a different value from the row);
- confirmation review: `{CONFIRMATION_REVIEW_REL.as_posix()}`, verdict
  `{verdict}`, its head bound to the manifest file's SHA-256 above; notes, if
  any, are dispositioned in `{DISPOSITION_REL.as_posix()}`; the raw names
  reviewed commit `{reviewed}` [Observed — the raw's own line; binding is by
  digest]; and
- recording tag: `{tag_for(date)}`, on the commit carrying this act record.

## Effect

{EFFECT}

## What this act does not authorize

It satisfies only its own authority. It amends no other clause, doctrine or
policy, edits no act-bound specification, and grants no consent, read, egress,
write, execution, deployment, release, autonomous or multi-user authority. The
sentence in the Polaris generator source policy that lists the six classes is
not edited by it; its propagation is the owner's separate choice recorded in
the packet.
"""


def aggregate_heading(date: str) -> str:
    return f"## RFC5-14 project-documentation amendment act — {ACT_TYPE} — performed {date}"


def render_aggregate_block(argument: str, date: str, manifest_sha: str,
                           verdict: str, frozen: str, instant: str) -> str:
    return f"""{aggregate_heading(date)}

Act instant: {instant}

**Phrase the act takes (given {date} by option selection, not typed; see the
dedicated record):**

```text
{phrase_for(argument)}
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `{ACT_TYPE}` / `.syzygy/governance/contracts/{MODULE}` |
| Argument | SHA-256 of the patched module: the one row of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `{frozen}` |
| Manifest | `{MANIFEST_REL.as_posix()}`, file SHA-256 `{manifest_sha}` |
| Review outcome | `{CONFIRMATION_REVIEW_REL.as_posix()}`: `{verdict}`, its head bound to the manifest file |
| Recording | `{RECORD_REL.as_posix()}`; annotated tag `{tag_for(date)}` on the commit carrying these records |

Effective status: this record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only; the patch
takes effect in the change that installs it.
"""


def expected(argument: str, date: str, sel: Selection, inp: Inputs, instant: str):
    sel.validate()
    if not DATE_RE.fullmatch(date):
        raise ValueError("date must be YYYY-MM-DD")
    if not INSTANT_RE.fullmatch(instant) or not instant.startswith(date):
        raise ValueError("instant must be YYYY-MM-DDTHH:MM:SSZ on the act date")
    manifest_sha, reviewed, verdict = validate(argument, inp)
    frozen = inp.frozen or ""
    return (render_act(argument, date, manifest_sha, reviewed, verdict, sel, frozen, instant),
            render_aggregate_block(argument, date, manifest_sha, verdict, frozen, instant))


def do_record(root: pathlib.Path, argument: str, date: str, sel: Selection,
              instant: str | None = None) -> int:
    instant = instant or datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if (root / RECORD_REL).exists():
        print(f"FAILED: dedicated act already exists: {RECORD_REL.as_posix()}")
        return 1
    try:
        record, block = expected(argument, date, sel, live_inputs(root), instant)
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"FAILED (nothing written): {exc}")
        return 1
    aggregate = (root / AGGREGATE_REL).read_text()
    if aggregate_heading(date) in aggregate:
        print("FAILED: aggregate record already carries this act's heading")
        return 1
    (root / RECORD_REL).write_text(record)
    (root / AGGREGATE_REL).write_text(aggregate.rstrip() + "\n\n" + block)
    print(f"wrote {RECORD_REL.as_posix()}\nappended one section to {AGGREGATE_REL.as_posix()}")
    print(f"next, in the same change: apply the patch to both mirrors "
          f"(`build_rfc5_project_documentation_class.py` does not), regenerate what CG-7h "
          f"and the contract index name, tag {tag_for(date)}, and add the chain link in "
          "scripts/check_governance.py")
    return 0


def recorded_instant(root: pathlib.Path) -> str | None:
    path = root / RECORD_REL
    if not path.is_file():
        return None
    found = re.findall(r"^Act instant: (\S+)$", path.read_text(), re.M)
    return found[0] if len(found) == 1 else None


def do_check(root: pathlib.Path, argument: str, date: str, sel: Selection,
             instant: str | None = None) -> int:
    instant = instant or recorded_instant(root) or f"{date}T00:00:00Z"
    try:
        record, block = expected(argument, date, sel, live_inputs(root), instant)
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"FAILED: {exc}")
        return 1
    path = root / RECORD_REL
    drift = not path.is_file() or path.read_text() != record
    count = (root / AGGREGATE_REL).read_text().count(block)
    if drift:
        print(f"recorded act differs from regeneration: {RECORD_REL.as_posix()}")
    if count != 1:
        print(f"aggregate record carries {count} copies of this act's block, not 1")
    if drift or count != 1:
        return 1
    print("recorded act matches the exact owner argument")
    return 0


def selftest() -> int:
    """One mutant per predicate; each must be refused for the stated reason."""
    module = b"patched module\n"
    row = digest(module)
    manifest = f"# header\n{row}  {MODULE}\n".encode()
    msha = digest(manifest)
    pkt = b"# Packet\n\n> **Candidate - binds nothing.**\n\nbody\n"
    frozen = "f" * 40
    review = (f"# R2\nReviewed commit: {frozen}\nManifest SHA-256: {msha}\n"
              "Verdict: CONFIRM\n\n## Findings\n\nnone\n")
    blobs = {MANIFEST_REL: manifest, PATCH_REL: b"patch", PACKET_REL: pkt,
             BRIEF_REL: b"brief", DELTA_REL: b"delta", LEDGER_REL: b"ledger"}

    def make(**over) -> Inputs:
        base = dict(manifest=manifest, subject=module, packet=pkt, review=review,
                    module_paths=[MODULE], builder_findings=[], frozen=frozen,
                    frozen_blob=lambda rel: blobs[rel], frozen_files=dict(blobs),
                    disposition_check=lambda found: None)
        base.update(over)
        return Inputs(**base)

    results: list[tuple[str, bool]] = []

    def refused(needle, argument, inp) -> bool:
        try:
            validate(argument, inp)
        except ValueError as exc:
            return needle in str(exc)
        return False

    def accepts(argument, inp) -> bool:
        try:
            validate(argument, inp)
            return True
        except ValueError:
            return False

    results.append(("exact row argument validates", accepts(row, make())))
    results.append(("unset FROZEN_SUBJECT refused",
                    refused("FROZEN_SUBJECT is unset", row, make(frozen=None))))
    results.append(("non-hex argument refused", refused("not a 64-hex", "xyz", make())))
    results.append(("wrong argument refused", refused("manifest row", "0" * 64, make())))
    results.append(("manifest file digest instead of the row refused",
                    refused("manifest row", msha, make())))
    results.append(("manifest row population refused",
                    refused("row population", row, make(module_paths=["x"]))))
    results.append(("builder finding refused",
                    refused("builder does not verify", row, make(builder_findings=["x"]))))
    results.append(("module not hashing to the argument refused",
                    refused("proposed module hashes", row, make(subject=module + b"x"))))
    drift = dict(blobs)
    drift[PATCH_REL] = b"other"
    results.append(("frozen commit lacking the presented patch refused",
                    refused("frozen subject does not carry", row,
                            make(frozen_blob=lambda rel: drift[rel]))))
    results.append(("frozen commit absent from the object store accepted",
                    accepts(row, make(frozen_blob=lambda rel: None))))
    results.append(("absent frozen commit still refuses a module that does not hash to the argument",
                    refused("proposed module hashes", row,
                            make(frozen_blob=lambda rel: None, subject=module + b"x"))))
    results.append(("absent frozen commit still refuses a review binding another manifest",
                    refused("manifest file's SHA-256", row,
                            make(frozen_blob=lambda rel: None,
                                 review=review.replace(msha, "0" * 64)))))
    results.append(("git_blob returns None for a commit the store lacks",
                    git_blob(ROOT, "f" * 40, MANIFEST_REL) is None))
    performed = b"> **PERFORMED 2026-10-04.** Recorded.\n\n" + pkt
    perf_files = dict(blobs)
    perf_files[PACKET_REL] = performed
    results.append(("PERFORMED head over the frozen packet accepted",
                    accepts(row, make(packet=performed, frozen_files=perf_files))))
    results.append(("packet carrying a digest refused",
                    refused("64-hex token", row, make(packet=pkt + row.encode()))))
    results.append(("review binding the row instead of the file digest refused",
                    refused("manifest file's SHA-256", row,
                            make(review=review.replace(msha, row)))))
    results.append(("review binding another digest refused",
                    refused("manifest file's SHA-256", row,
                            make(review=review.replace(msha, "0" * 64)))))
    results.append(("verdict REVISE refused",
                    refused("verdict", row, make(review=review.replace("CONFIRM", "REVISE")))))
    results.append(("verdict displaced past the fourth head line refused",
                    refused("verdict", row, make(review=review.replace(
                        "Verdict: CONFIRM", "Note: x\nVerdict: CONFIRM")))))
    results.append(("review of another commit refused",
                    refused("other than FROZEN_SUBJECT", row,
                            make(review=review.replace(frozen, "a" * 40)))))
    exc_review = review.replace("Verdict: CONFIRM", "Verdict: CONFIRM WITH EXCEPTIONS").replace(
        "none", "**Finding 1 — t** (revise)\nbody")
    results.append(("a revise finding under CONFIRM WITH EXCEPTIONS refused",
                    refused("non-note", row, make(review=exc_review))))
    notes = exc_review.replace("(revise)", "(note)")
    results.append(("notes-only CONFIRM WITH EXCEPTIONS accepted",
                    accepts(row, make(review=notes))))

    def bad_disposition(found):
        raise ValueError("disposition record does not name the reviewed raw")
    results.append(("missing disposition refused",
                    refused("disposition", row,
                            make(review=notes, disposition_check=bad_disposition))))
    for name, sel in (("empty label", Selection("q", "", "d")),
                      ("multi-line description", Selection("q", "l", "a\nb")),
                      ("digest in opening", Selection("q " + "a" * 64, "l", "d"))):
        try:
            sel.validate()
            results.append((f"selection with {name} refused", False))
        except ValueError:
            results.append((f"selection with {name} refused", True))
    ok_sel = Selection("Perform the amendment act?", "Amend RFC5-14 at its manifest row",
                       "Perform the act at the manifest row.")
    try:
        record, block = expected(row, "2026-10-04", ok_sel, make(), "2026-10-04T01:02:03Z")
        results.append(("record and block render, naming the row and the tag",
                        row in record and row in block and tag_for("2026-10-04") in record))
        results.append(("record carries the phrase exactly once in its ceremony",
                        record.count(phrase_for(row)) == 1))
        results.append(("record keeps the file digest distinct from the row",
                        msha in record and msha != row))
    except ValueError as exc:
        print(f"  (render failure: {exc})")
        results.append(("record and block render", False))
    try:
        expected(row, "04/10", ok_sel, make(), "2026-10-04T01:02:03Z")
        results.append(("bad date refused", False))
    except ValueError:
        results.append(("bad date refused", True))
    for bad, why in (("2026-10-04 01:02:03", "instant not ISO"), ("2026-10-05T01:02:03Z", "instant on another day")):
        try:
            expected(row, "2026-10-04", ok_sel, make(), bad)
            results.append((why + " refused", False))
        except ValueError:
            results.append((why + " refused", True))
    rec2, blk2 = expected(row, "2026-10-04", ok_sel, make(), "2026-10-04T01:02:03Z")
    results.append(("instant in the record once", rec2.count("Act instant: 2026-10-04T01:02:03Z\n") == 1))
    above = blk2.split("\n```text")[0]
    results.append(("instant above the phrase in the aggregate block", above.count("Act instant: 2026-10-04T01:02:03Z") == 1))
    failed = [name for name, ok in results if not ok]
    for name, ok in results:
        print(("ok   " if ok else "FAIL ") + name)
    print(f"selftest: {len(results) - len(failed)} of {len(results)} predicates held")
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--record", metavar="ARGUMENT")
    mode.add_argument("--check", metavar="ARGUMENT")
    mode.add_argument("--selftest", action="store_true")
    ap.add_argument("--date")
    ap.add_argument("--question-opening")
    ap.add_argument("--selection-label")
    ap.add_argument("--selection-description")
    ap.add_argument("--instant", help="act instant YYYY-MM-DDTHH:MM:SSZ (record: default now; check: default read from the record)")
    args = ap.parse_args(argv[1:])
    if args.selftest:
        return selftest()
    argument = args.record or args.check
    if not (args.date and args.question_opening and args.selection_label
            and args.selection_description):
        print("--date, --question-opening, --selection-label and "
              "--selection-description are required", file=sys.stderr)
        return 2
    sel = Selection(args.question_opening, args.selection_label, args.selection_description)
    fn = do_record if args.record else do_check
    return fn(ROOT, argument, args.date, sel, args.instant)


def _d10_superseded(modes):
    """True, after one SUPERSEDED line, when this run is one of `modes` and D10 is in effect.

    This run holds a performed act to bytes doctrine amendment D10 replaces;
    under RFC3-16 as D10 amends it, those bytes are history, not a lock, so the
    run stops instead of failing forever (`scripts/d10_supersession.py`).
    Without the helper beside this file (a partial copy) it always runs."""
    import importlib.util
    from pathlib import Path as _Path
    mode = next((m for m in modes if m in sys.argv[1:]), None)
    helper = _Path(__file__).resolve().with_name("d10_supersession.py")
    if mode is None or not helper.is_file():
        return False
    spec = importlib.util.spec_from_file_location("d10_supersession", helper)
    d10 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d10)
    return d10.superseded(f"{_Path(__file__).name} {mode}")


if __name__ == "__main__" and _d10_superseded(('--check',)):
    sys.exit(0)
if __name__ == "__main__":
    sys.exit(main(sys.argv))
