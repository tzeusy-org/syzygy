#!/usr/bin/env python3
"""Record or verify the owner's act over the launch-record write consent.

Package `contracts/candidates/launch-consent-write-consent/` (bead
`syzygy-pdja.22`). This is one state-(1) `consent-write` owner act over the
one record the package manifest names: a write consent (RFC5-12; SEC-4) for
`project:syzygy`'s own repository. Under it, Syzygy may add launch consent
records (REQ-polaris-generation-046) as new files only, under one location,
by recording commits on one dedicated, non-trunk branch, and may write
nothing else. The owner gives the act by selecting an option in a structured
question. The packet offers the option's words, and no digest appears in the
packet. This script performs nothing by itself.

The act grants the write class only. It authorizes no implementation, which
needs its own direction.

FROZEN. Round 2 of the package review returned `CONFIRM WITH EXCEPTIONS`,
notes only, over commit `3ea65c53`
(`docs/reviews/R-LAUNCH-WRITE-CONSENT-2-RAW.md`). Its four notes are
dispositioned, not taken, in `ROUND-2-DISPOSITIONS.md`. `FROZEN_FILE_DIGESTS`
holds the SHA-256 of every package file that review read, taken from that
commit by `--freeze-table 3ea65c53` and never by hand. The package must still
equal those bytes: the record, its template and params, the manifest, the
semantic delta, the packet, the brief and the round-1 dispositions.

`--record ARGUMENT --date D --selection-quote Q [--instant I]` requires,
before anything is written:

1. the argument is a 64-hex SHA-256 equal to the manifest's one row, the row
   names exactly the builder's one record, and the builder reports nothing
   stale;
2. the record on disk hashes to the argument;
3. every frozen file hashes to its frozen digest, and the packet carries no
   64-hex token;
4. the confirming raw's first four non-blank lines carry
   `Reviewed commit: <40 hex>`, `Manifest SHA-256: <SHA-256 of the manifest
   FILE, as the builder's --manifest-digest prints it, never the row>` and a
   verdict of `CONFIRM` or `CONFIRM WITH EXCEPTIONS`. The latter clears the
   bytes only when every finding is a `note` and `ROUND-2-DISPOSITIONS.md`
   names the raw on a `Reviewed record:` line and dispositions every finding;
5. the selection quote is one non-empty line with no 64-hex digest, and it
   quotes the packet's words `"Sign the launch-record write consent"`.

It then writes the dedicated record, with the UTC instant of recording, and
appends one `ACCEPTANCE-ACT-RECORD.md` section. `--check` re-derives both and
counts exactly one copy of the block. `--freeze-table [COMMIT]` prints the
frozen-digest table. `--selftest` mutates each predicate and requires it to
fail closed.
"""

from __future__ import annotations

import argparse
import contextlib
import datetime
import hashlib
import io
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from typing import Callable

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_launch_consent_write_consent as build  # noqa: E402
import record_versioned_signoff as vs  # noqa: E402

DECISIONS = pathlib.Path(".syzygy/governance/decisions")
AGGREGATE_REL = DECISIONS / "ACCEPTANCE-ACT-RECORD.md"
RECORD_REL = DECISIONS / "LAUNCH-CONSENT-WRITE-CONSENT-ACT.md"
PKG = build.PKG
MANIFEST_REL = PKG / build.MANIFEST_NAME
SUBJECT_REL = build.RECORD
TEMPLATE_REL = PKG / "templates/WRITE-CONSENT-TEMPLATE.md"
PARAMS_REL = PKG / "instances/syzygy/params.json"
DELTA_REL = PKG / "SEMANTIC-DELTA.md"
PACKET_REL = PKG / "OWNER-DECISION-PACKET.md"
BRIEF_REL = PKG / "REVIEW-BRIEF.md"
ROUND1_REL = PKG / "ROUND-1-DISPOSITIONS.md"
CONFIRMATION_REVIEW_REL = pathlib.Path("docs/reviews/R-LAUNCH-WRITE-CONSENT-2-RAW.md")
DISPOSITION_REL = PKG / "ROUND-2-DISPOSITIONS.md"
LABEL = "CONSENT TO WRITE LAUNCH CONSENT RECORDS ON THE DEDICATED BRANCH"
ACT_TYPE = "consent-write"
IDENTITY_STEM = "WRITE-CONSENT-LAUNCH-RECORDS"
PACKET_WORDS = "Sign the launch-record write consent"
#: The commit the confirming review read (provenance; binding is by the manifest digest in the raw's head).
FROZEN_SUBJECT: str | None = "3ea65c5327988d656fa2408cf631cd5216fd69d9"
#: SHA-256 of each frozen file at FROZEN_SUBJECT, by `--freeze-table 3ea65c53`.
FROZEN_FILE_DIGESTS: dict[pathlib.Path, str] = {
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/LAUNCH-CONSENT-WRITE-CONSENT-MANIFEST.txt"): "7e56696ea4ec8f85c4472febbdb90f122b8b03dfca3f60ced829771638b972bf",
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md"): "53efd343b0ed5302628374fbb503758d2bfe56bf1b27715f0ec616f33b5aa092",
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/templates/WRITE-CONSENT-TEMPLATE.md"): "3e86df4eec9d796067b806eb2c31b46bbfdd734c0ab4ce285d81c9a6b4cf0289",
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/instances/syzygy/params.json"): "920eadacb4d86ab7be3e9367eb32c97f9a11ae1c9797b035c4127430216759f2",
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/SEMANTIC-DELTA.md"): "8f67b8f15685173aa4d1b78667175321f4581eda0118a66af2af9583629e98c3",
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/OWNER-DECISION-PACKET.md"): "32f17e41b32599f9670d29903d2d5430fa10e17957ece4876d3a3e2ca7f427f4",
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/REVIEW-BRIEF.md"): "91d6912c1b9f98373bcb30c92365ba7869ee5cbc390ca842585488b14b3fbbc1",
    pathlib.Path(".syzygy/governance/contracts/candidates/launch-consent-write-consent/ROUND-1-DISPOSITIONS.md"): "fecae040388c587d6a0b3d2bb365928a3ef8fecfd534b58ea145e5fa363365ca",
}

SHA_RE = re.compile(r"[0-9a-f]{64}")
HEX64_RE = re.compile(r"(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])")
ROW_RE = re.compile(r"^([0-9a-f]{64})  (\S+)$", re.MULTILINE)
REVIEWED_COMMIT_RE = re.compile(r"^Reviewed commit: ([0-9a-f]{40})$", re.MULTILINE)
VERDICT_RE = re.compile(r"^Verdict: (CONFIRM WITH EXCEPTIONS|CONFIRM|REVISE)\s*$")
VERDICTS = ("CONFIRM", "CONFIRM WITH EXCEPTIONS")
DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")
INSTANT_RE = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z")
RECORDED_RE = re.compile(r"^Recorded at \(UTC\): (\S+)$", re.MULTILINE)
BLOCK_BEGIN = "<!-- LAUNCH-CONSENT-WRITE-CONSENT:BEGIN -->"
BLOCK_END = "<!-- LAUNCH-CONSENT-WRITE-CONSENT:END -->"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def phrase_for(argument: str) -> str:
    return f"{LABEL}: {argument}"


def identity_for(date: str) -> str:
    return f"{IDENTITY_STEM}-{date}"


def frozen_rels() -> list[pathlib.Path]:
    return [MANIFEST_REL, SUBJECT_REL, TEMPLATE_REL, PARAMS_REL, DELTA_REL, PACKET_REL, BRIEF_REL, ROUND1_REL]


def frozen_table(read: Callable[[pathlib.Path], bytes] | None = None) -> str:
    read = read or (lambda rel: (ROOT / rel).read_bytes())
    lines = [f'    pathlib.Path("{rel.as_posix()}"): "{digest(read(rel))}",' for rel in frozen_rels()]
    return "FROZEN_FILE_DIGESTS: dict[pathlib.Path, str] = {\n" + "\n".join(lines) + "\n}"


@dataclass
class Inputs:
    """Everything validation reads, injectable for the selftest."""
    manifest: bytes
    subject: bytes
    packet: bytes
    review: str
    produced_paths: list[str]
    stale: list[str]
    frozen: str | None
    frozen_digest: Callable[[pathlib.Path], str]
    frozen_files: dict[pathlib.Path, bytes]
    disposition_check: Callable[[dict[int, str]], None]


def _read(root: pathlib.Path, rel: pathlib.Path) -> bytes:
    return (root / rel).read_bytes() if (root / rel).is_file() else b""


def live_inputs(root: pathlib.Path) -> Inputs:
    try:
        produced = [rel.as_posix() for rel, _t in build.instances(root)]
    except (ValueError, KeyError, OSError):
        produced = []
    review_path = root / CONFIRMATION_REVIEW_REL
    return Inputs(
        manifest=_read(root, MANIFEST_REL), subject=_read(root, SUBJECT_REL), packet=_read(root, PACKET_REL),
        review=review_path.read_text(encoding="utf-8") if review_path.is_file() else "",
        produced_paths=produced, stale=build.stale(root),
        frozen=FROZEN_SUBJECT, frozen_digest=lambda rel: FROZEN_FILE_DIGESTS.get(rel, ""),
        frozen_files={rel: (root / rel).read_bytes() for rel in frozen_rels() if (root / rel).is_file()},
        disposition_check=lambda findings: vs.validate_disposition(
            root, CONFIRMATION_REVIEW_REL.as_posix(), DISPOSITION_REL.as_posix(), findings),
    )


def validate(argument: str, inp: Inputs) -> tuple[str, str, str]:
    """Return (manifest file sha, reviewed commit, verdict) or raise ValueError."""
    if inp.frozen is None:
        raise ValueError("no confirming review is recorded: FROZEN_SUBJECT is unset, so nothing may be recorded")
    if not SHA_RE.fullmatch(argument):
        raise ValueError("owner argument is not a 64-hex SHA-256")
    rows = ROW_RE.findall(inp.manifest.decode())
    if sorted(p for _s, p in rows) != sorted(inp.produced_paths) or [p for _s, p in rows] != [SUBJECT_REL.as_posix()]:
        raise ValueError("manifest row population is not exactly the builder's one record")
    if rows[0][0] != argument:
        raise ValueError(f"owner argument {argument} is not the manifest row {rows[0][0]}")
    if inp.stale:
        raise ValueError("builder reports stale records or manifest: " + ", ".join(inp.stale))
    if digest(inp.subject) != argument:
        raise ValueError(f"the record hashes to {digest(inp.subject)}, not the owner argument")
    if set(inp.frozen_files) != set(frozen_rels()):
        raise ValueError("frozen-file set is not exactly the files the review read")
    for rel, current in inp.frozen_files.items():
        if digest(current) != inp.frozen_digest(rel):
            raise ValueError(f"the package no longer equals the reviewed bytes of {rel.as_posix()}")
    if HEX64_RE.search(inp.packet.decode()):
        raise ValueError("owner packet carries a 64-hex token; the argument comes only from the manifest row")
    manifest_sha = digest(inp.manifest)
    head = [line for line in inp.review.splitlines() if line.strip()][:4]
    if f"Manifest SHA-256: {manifest_sha}" not in head:
        raise ValueError("confirmation review head does not bind the manifest file's SHA-256")
    verdicts = [m.group(1) for line in head if (m := VERDICT_RE.match(line))]
    if len(verdicts) != 1 or verdicts[0] not in VERDICTS:
        raise ValueError("confirmation review head does not carry the verdict CONFIRM or CONFIRM WITH EXCEPTIONS")
    reviewed = REVIEWED_COMMIT_RE.search("\n".join(head))
    if not reviewed:
        raise ValueError("confirmation review head does not name its reviewed commit")
    findings = vs.review_findings(inp.review)
    bad = {n: s for n, s in findings.items() if s != "note"}
    if bad:
        raise ValueError(f"review carries non-note findings {bad}; only a notes-only round clears the bytes")
    if verdicts[0] == "CONFIRM WITH EXCEPTIONS":
        if not findings:
            raise ValueError("CONFIRM WITH EXCEPTIONS carries no countable finding")
        inp.disposition_check(findings)
    return manifest_sha, reviewed.group(1), verdicts[0]


def validate_quote(quote: str) -> None:
    if not quote.strip() or "\n" in quote or "\r" in quote:
        raise ValueError("the selection quote must be one non-empty line")
    if HEX64_RE.search(quote):
        raise ValueError("the selection quote carries a 64-hex digest")
    if f'"{PACKET_WORDS}"' not in quote:
        raise ValueError(f"the selection quote does not quote the packet's words \"{PACKET_WORDS}\"")


def render_act(argument: str, date: str, manifest_sha: str, reviewed: str, verdict: str,
               quote: str, frozen: str, instant: str) -> str:
    return f"""# Owner act — write consent for launch consent records

Date: {date}

Recorded at (UTC): {instant}

Owner: Tzeusy

Act identity: `{identity_for(date)}`

Act type: `{ACT_TYPE}`

Project identity: `project:syzygy`

Artifact identity: `{SUBJECT_REL.as_posix()}`

Exact digest (SHA-256): `{argument}`

Scope: the write consent's own scope: launch consent records only, as new
files only, under `.syzygy/governance/decisions/launch-consent/`, by
recording commits on `refs/heads/launch-consent-records` of
`project:syzygy`'s governance home; nothing else

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
selected by the owner's option selection recorded below

Supersession / revocation: supersedes nothing. Revoked only by a later exact
owner act naming it; revocation is prospective (RFC5-13).

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was offered the package's `{PACKET_REL.as_posix()}`, which by
design carries no digest. The act takes this phrase, whose argument is the
one row of the package manifest:

```text
{phrase_for(argument)}
```

The owner did not type the phrase. On {date} the owner answered a structured
question in a Claude Code session. Verbatim, as the coordinating session
recorded it:

> {quote}

[Inferred] That the person answering is the owner. The question named the
package, PR #801, the round-2 verdict and the manifest row's first eight
hex characters. It offered "Change a name first" and "Decline" as the other
answers [Observed by the coordinating session].

The argument was read from the one row of `{MANIFEST_REL.as_posix()}` and
matched the record on disk at recording. The recorder refuses any argument
that is not that row.

Frozen provenance:

- reviewed package commit `{frozen}`; every file that review read still had
  its reviewed bytes at recording;
- the package manifest file hashes to `{manifest_sha}` (a container digest,
  no act's argument);
- confirmation review `{CONFIRMATION_REVIEW_REL.as_posix()}`, verdict
  `{verdict}`, its head bound to the manifest file's SHA-256 above, its
  notes dispositioned in `{DISPOSITION_REL.as_posix()}`; the raw names
  reviewed commit `{reviewed}` [Observed — the raw's own line; binding is by
  digest].

## Effect

From this act's instant the record above is an in-force write consent
(RFC5-12; SEC-4) for `(project:syzygy, repository:tzeusy-org-syzygy)`. It is
the write consent REQ-polaris-generation-046 requires before Syzygy writes
any launch consent record. Its scope, exclusions, undo path and withdrawal
are the record's own, unrestated here.

## What this act does not authorize

It grants the write class only, within the record's scope. It authorizes no
implementation: the launch-consent code still needs its own direction. It
gives no observation, egress or execution consent, records no drawer or
provider statement, admits no repository, and makes no launch consent
record in force. It amends no doctrine, contract, policy or specification,
and grants no deployment, release, autonomous or multi-user authority.
"""


def aggregate_heading(date: str) -> str:
    return f"## Launch-record write consent act — {ACT_TYPE} — performed {date}"


def render_aggregate_block(argument: str, date: str, manifest_sha: str, verdict: str, frozen: str,
                           instant: str) -> str:
    return f"""{BLOCK_BEGIN}
{aggregate_heading(date)}

Act instant: {instant}

**Phrase the act takes (given {date} by option selection, not typed; see the
dedicated record):**

```text
{phrase_for(argument)}
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `{ACT_TYPE}` / `{SUBJECT_REL.as_posix()}` |
| Scope | launch consent records only, as new files only, on `refs/heads/launch-consent-records`; nothing else |
| Argument | SHA-256 of the artifact itself: the one row of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `{frozen}` |
| Manifest | `{MANIFEST_REL.as_posix()}`, SHA-256 `{manifest_sha}` |
| Review outcome | `{CONFIRMATION_REVIEW_REL.as_posix()}`: `{verdict}`, its head bound to the manifest file |
| Recorded at (UTC) | `{instant}` |
| Recording | `{RECORD_REL.as_posix()}` |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only: a write
consent. It authorizes no implementation.
{BLOCK_END}
"""


def expected(argument: str, date: str, quote: str, inp: Inputs, instant: str) -> tuple[str, str]:
    validate_quote(quote)
    if not DATE_RE.fullmatch(date):
        raise ValueError("date must be YYYY-MM-DD")
    if not INSTANT_RE.fullmatch(instant) or instant[:10] < date:
        raise ValueError("instant must be YYYY-MM-DDTHH:MM:SSZ (UTC), not before the act's date")
    manifest_sha, reviewed, verdict = validate(argument, inp)
    frozen = inp.frozen or ""
    return (render_act(argument, date, manifest_sha, reviewed, verdict, quote, frozen, instant),
            render_aggregate_block(argument, date, manifest_sha, verdict, frozen, instant))


def do_record(root: pathlib.Path, argument: str, date: str, quote: str, instant: str | None = None) -> int:
    if instant is None:
        instant = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if (root / RECORD_REL).exists():
        print(f"FAILED: dedicated act already exists: {RECORD_REL.as_posix()}")
        return 1
    try:
        record, block = expected(argument, date, quote, live_inputs(root), instant)
    except (ValueError, OSError) as exc:
        print(f"FAILED (nothing written): {exc}")
        return 1
    aggregate = (root / AGGREGATE_REL).read_text(encoding="utf-8")
    if aggregate_heading(date) in aggregate or BLOCK_BEGIN in aggregate:
        print("FAILED: aggregate record already carries this act's section")
        return 1
    (root / RECORD_REL).write_text(record, encoding="utf-8")
    (root / AGGREGATE_REL).write_text(aggregate.rstrip() + "\n\n" + block, encoding="utf-8")
    print(f"recorded at {instant}")
    print(f"wrote {RECORD_REL.as_posix()}\nappended one section to {AGGREGATE_REL.as_posix()}")
    return 0


def do_check(root: pathlib.Path, argument: str, date: str, quote: str, instant: str | None = None) -> int:
    if instant is None:
        on_disk = (root / RECORD_REL).read_text(encoding="utf-8") if (root / RECORD_REL).is_file() else ""
        found = RECORDED_RE.findall(on_disk)
        if len(found) != 1:
            print(f"FAILED: {RECORD_REL.as_posix()} carries {len(found)} 'Recorded at (UTC)' lines, not 1")
            return 1
        instant = found[0]
    try:
        record, block = expected(argument, date, quote, live_inputs(root), instant)
    except (ValueError, OSError) as exc:
        print(f"FAILED: {exc}")
        return 1
    path = root / RECORD_REL
    drift = not path.is_file() or path.read_text(encoding="utf-8") != record
    aggregate = (root / AGGREGATE_REL).read_text(encoding="utf-8")
    count = aggregate.count(block)
    markers = aggregate.count(BLOCK_BEGIN)
    if drift:
        print(f"recorded act differs from regeneration: {RECORD_REL.as_posix()}")
    if count != 1 or markers != 1:
        print(f"aggregate record carries {count} copies of this act's block ({markers} section markers), not 1")
    if drift or count != 1 or markers != 1:
        return 1
    print("recorded launch-record write-consent act matches the exact owner argument")
    return 0


# --- selftest ---------------------------------------------------------------

INSTANT_OK = "2026-11-09T03:00:00Z"
QUOTE_OK = ('Sign the write consent for launch consent records? (structured question, Claude Code session) '
            f'— selected option "{PACKET_WORDS}"')


def selftest() -> int:
    """One mutant per predicate; each must be refused for the stated reason."""
    record = b"write consent\n"
    rsha = digest(record)
    pkt = b"# Packet\n\n> Candidate - binds nothing.\n\nbody\n"
    manifest = ("# header\n" + f"{rsha}  {SUBJECT_REL.as_posix()}\n").encode()
    msha = digest(manifest)
    review = (f"# R2\nReviewed commit: {'a' * 40}\nManifest SHA-256: {msha}\n"
              "Verdict: CONFIRM\n\n## Findings\n\nnone\n")
    blobs = {rel: rel.name.encode() for rel in frozen_rels()}
    blobs.update({MANIFEST_REL: manifest, SUBJECT_REL: record, PACKET_REL: pkt})

    def make(**over) -> Inputs:
        base = dict(manifest=manifest, subject=record, packet=pkt, review=review,
                    produced_paths=[SUBJECT_REL.as_posix()], stale=[], frozen="f" * 40,
                    frozen_digest=lambda rel: digest(blobs[rel]), frozen_files=dict(blobs),
                    disposition_check=lambda findings: None)
        base.update(over)
        return Inputs(**base)

    results: list[tuple[str, bool]] = []

    def refused(needle, argument, inp) -> bool:
        try:
            validate(argument, inp)
        except ValueError as exc:
            return needle in str(exc)
        return False

    arg = rsha
    results.append(("exact argument validates", _accepts(arg, make())))
    results.append(("the shipped table covers exactly the frozen files",
                    set(FROZEN_FILE_DIGESTS) == set(frozen_rels())
                    and all(SHA_RE.fullmatch(d) for d in FROZEN_FILE_DIGESTS.values())))
    results.append(("the label is the one check_governance registers",
                    LABEL in (ROOT / "scripts/check_governance.py").read_text(encoding="utf-8")))
    results.append(("unset FROZEN_SUBJECT refused", refused("FROZEN_SUBJECT is unset", arg, make(frozen=None))))
    results.append(("non-hex argument refused", refused("not a 64-hex", "xyz", make())))
    results.append(("an argument that is not the row refused", refused("not the manifest row", "1" * 64, make())))
    results.append(("an extra manifest row refused",
                    refused("row population", arg, make(manifest=manifest + f"{'3' * 64}  {PKG.as_posix()}/instances/x/X.md\n".encode()))))
    results.append(("a row for another path refused",
                    refused("row population", arg, make(manifest=manifest.replace(b"RECORDS.md", b"OTHER.md")))))
    results.append(("stale builder output refused", refused("stale", arg, make(stale=["x"]))))
    results.append(("record not hashing to the argument refused", refused("hashes to", arg, make(subject=record + b"x"))))
    results.append(("a frozen-file set missing the semantic delta refused",
                    refused("frozen-file set", arg, make(frozen_files={k: b for k, b in blobs.items() if k != DELTA_REL}))))
    for rel in (PACKET_REL, TEMPLATE_REL, BRIEF_REL):
        changed = dict(blobs)
        changed[rel] = blobs[rel] + b"x"
        results.append((f"a package {rel.name} edited after the review refused",
                        refused("no longer equals the reviewed bytes", arg, make(frozen_files=changed))))
    results.append(("packet carrying a digest refused", refused("64-hex token", arg, make(packet=pkt + arg.encode()))))
    results.append(("review binding another manifest digest refused",
                    refused("manifest file's SHA-256", arg, make(review=review.replace(msha, "0" * 64)))))
    results.append(("review binding the row instead of the file digest refused",
                    refused("manifest file's SHA-256", arg, make(review=review.replace(msha, arg)))))
    results.append(("verdict REVISE refused", refused("verdict", arg, make(review=review.replace("CONFIRM", "REVISE")))))
    results.append(("verdict displaced past the fourth head line refused",
                    refused("verdict", arg, make(review=review.replace("Verdict: CONFIRM", "Note: x\nVerdict: CONFIRM")))))
    exc_review = review.replace("Verdict: CONFIRM", "Verdict: CONFIRM WITH EXCEPTIONS").replace(
        "none", "**Finding 1 — t** (revise)\nbody")
    results.append(("a revise finding under CONFIRM WITH EXCEPTIONS refused",
                    refused("non-note", arg, make(review=exc_review))))
    results.append(("a blocking finding under a bare CONFIRM refused",
                    refused("non-note", arg, make(review=review.replace("none", "**Finding 1 — t** (blocking)\nbody")))))
    notes = exc_review.replace("(revise)", "(note)")
    results.append(("notes-only CONFIRM WITH EXCEPTIONS accepted", _accepts(arg, make(review=notes))))

    def bad_disposition(findings):
        raise ValueError("disposition record does not name the reviewed raw")
    results.append(("missing disposition refused",
                    refused("disposition", arg, make(review=notes, disposition_check=bad_disposition))))
    for name, quote in (("an empty quote", ""), ("a multi-line quote", "a\nb"),
                        ("a digest in the quote", QUOTE_OK + " " + "a" * 64),
                        ("a quote without the packet's words", 'selected option "Decline"'),
                        ("the words unquoted", f"selected option {PACKET_WORDS}")):
        results.append((f"{name} refused", _raises(lambda q=quote: validate_quote(q))))
    try:
        rec, block = expected(arg, "2026-11-08", QUOTE_OK, make(), INSTANT_OK)
        results.append(("record and block name the argument", arg in rec and arg in block))
        results.append(("record carries the phrase exactly once", rec.count(phrase_for(arg)) == 1))
        results.append(("record quotes the selection verbatim", f"> {QUOTE_OK}\n" in rec))
        results.append(("record says implementation needs its own direction",
                        "authorizes no implementation" in " ".join(rec.split())
                        and "needs its own direction" in " ".join(rec.split())))
        results.append(("the aggregate block is bracketed by section markers and carries the act instant",
                        block.count(BLOCK_BEGIN) == 1 and block.count(BLOCK_END) == 1
                        and block.count(f"Act instant: {INSTANT_OK}\n") == 1))
    except ValueError as exc:
        print(f"  (render failure: {exc})")
        results.append(("record and block render", False))
    results.append(("bad date refused", _raises(lambda: expected(arg, "08/11", QUOTE_OK, make(), INSTANT_OK))))
    for name, bad in (("a date-only instant", "2026-11-09"), ("an instant before the act's date", "2026-11-07T00:00:00Z")):
        results.append((f"{name} refused", _raises(lambda bad=bad: expected(arg, "2026-11-08", QUOTE_OK, make(), bad))))
    results.append(("record, check, a repeat --record, a duplicated block and a tampered instant on a scratch tree",
                    _end_to_end()))
    failed = [name for name, ok in results if not ok]
    for name, ok in results:
        print(("ok   " if ok else "FAIL ") + name)
    print(f"selftest: {len(results) - len(failed)} of {len(results)} predicates held")
    return 1 if failed else 0


def _end_to_end() -> bool:
    """--record and --check for real on a scratch copy of the package."""
    global FROZEN_FILE_DIGESTS
    saved = FROZEN_FILE_DIGESTS
    with tempfile.TemporaryDirectory() as d:
        root = build._fixture(pathlib.Path(d))
        (root / DECISIONS).mkdir(parents=True, exist_ok=True)
        (root / AGGREGATE_REL).write_text("# Acceptance record\n")
        raw = root / CONFIRMATION_REVIEW_REL
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_text(f"# R2 (synthetic, scratch only)\nReviewed commit: {'a' * 40}\n"
                       f"Manifest SHA-256: {digest((root / MANIFEST_REL).read_bytes())}\n"
                       "Verdict: CONFIRM\n\n## Findings\n\nnone\n")
        for rel in frozen_rels():
            if not (root / rel).is_file():
                shutil.copy(ROOT / rel, root / rel)
        FROZEN_FILE_DIGESTS = {r: digest((root / r).read_bytes()) for r in frozen_rels()}
        arg = digest((root / SUBJECT_REL).read_bytes())
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                wrote = do_record(root, arg, "2026-11-08", QUOTE_OK, INSTANT_OK)
                checked = do_check(root, arg, "2026-11-08", QUOTE_OK)
                again = do_record(root, arg, "2026-11-08", QUOTE_OK, INSTANT_OK)
                agg = root / AGGREGATE_REL
                original = agg.read_text()
                block = original[original.index(BLOCK_BEGIN):]
                agg.write_text(original + "\n" + block)
                doubled = do_check(root, arg, "2026-11-08", QUOTE_OK)
                agg.write_text(original)
                path = root / RECORD_REL
                path.write_text(path.read_text().replace(INSTANT_OK, "2026-11-09T03:00:01Z"))
                tampered = do_check(root, arg, "2026-11-08", QUOTE_OK)
        finally:
            FROZEN_FILE_DIGESTS = saved
        if wrote != 0:
            print("  (end-to-end --record said: " + out.getvalue().strip().splitlines()[-1][:200] + ")")
        return wrote == 0 and checked == 0 and again == 1 and doubled == 1 and tampered == 1


def _accepts(argument, inp) -> bool:
    try:
        validate(argument, inp)
        return True
    except ValueError as exc:
        print(f"  (unexpected refusal: {exc})")
        return False


def _raises(fn) -> bool:
    try:
        fn()
    except ValueError:
        return True
    return False


def at_commit_reader(commit: str) -> Callable[[pathlib.Path], bytes]:
    def read(rel: pathlib.Path) -> bytes:
        r = subprocess.run(["git", "-C", str(ROOT), "show", f"{commit}:{rel.as_posix()}"], capture_output=True)
        if r.returncode:
            raise ValueError(f"{rel.as_posix()} is not in commit {commit}")
        return r.stdout
    return read


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--record", metavar="ARGUMENT")
    mode.add_argument("--check", metavar="ARGUMENT")
    mode.add_argument("--freeze-table", nargs="?", const="", metavar="COMMIT")
    mode.add_argument("--selftest", action="store_true")
    ap.add_argument("--date")
    ap.add_argument("--instant", help="UTC instant YYYY-MM-DDTHH:MM:SSZ; --record defaults to now, --check reads it from the record")
    ap.add_argument("--selection-quote")
    args = ap.parse_args(argv[1:])
    if args.selftest:
        return selftest()
    if args.freeze_table is not None:
        print(frozen_table(at_commit_reader(args.freeze_table) if args.freeze_table else None))
        return 0
    if not (args.date and args.selection_quote):
        print("--date and --selection-quote are required", file=sys.stderr)
        return 2
    fn = do_record if args.record else do_check
    return fn(ROOT, args.record or args.check, args.date, args.selection_quote, args.instant)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
