#!/usr/bin/env python3
"""Record or verify the owner's acts of the local-agent dossier sitting.

Package `contracts/candidates/dossier-local-agent-acts/`. Each act is a
separate state-(1) owner act over one record named by a row of
`DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt`:

- the project-input statement that no kernel evidence drawer exists for
  `(project:syzygy, repository:redis-redis)` (REQ-polaris-generation-033's
  non-governed route);
- two per-project agent-provider statements for the same repository, Claude
  Code with Anthropic and Codex with OpenAI (its governed route, and SEC-2's
  per-project consent);
- the in-force record of D9 over the exact bytes of `security.md` and `v1.md`;
- the in-force record of item 1 of the owner direction
  `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05` (the RFC7-20 reading) over
  that direction file's exact bytes.

The last two give the review note R3-F8's act cross-check (RFC3-16(a)) an
exact-digest, scope-bound act to find. A phrase act over adopted doctrine or a
plain direction is new usage: the doctrine and the direction keep their own
adoption, and these acts change no byte of either.

The owner gives each act by selecting an option in a structured question that
names the record "at the manifest row" (the public-admission precedent). No
phrase is typed and no digest appears in the packet. This script performs
nothing by itself, and it refuses to record anything until the package has a
confirming review: `FROZEN_SUBJECT` is unset until a round returns `CONFIRM`
or a notes-only `CONFIRM WITH EXCEPTIONS`, and the frozen digests below are
then filled in by script, never by hand. The commit is provenance only.

`--record KEY ARGUMENT --date D [--instant I] --question-opening Q
--selection-label L --selection-description S` requires, before anything is
written:

1. the argument is a 64-hex SHA-256 equal to this record's manifest row, the
   manifest's `instances/` rows are exactly the builder's records, and the
   builder reports nothing stale (so a record whose bound doctrine or
   direction bytes changed is refused);
2. the record on disk hashes to the argument;
3. every file the review read hashes to the digest recorded below for it (the
   packet may gain one PERFORMED head), and the packet carries no 64-hex token;
4. the confirming raw's first four non-blank lines carry
   `Reviewed commit: <40 hex>`, `Manifest SHA-256: <SHA-256 of the manifest
   FILE, the value the builder's --manifest-digest prints, never a row>` and
   a verdict of `CONFIRM` or `CONFIRM WITH EXCEPTIONS`; the latter clears the
   bytes only when every finding is a `note` and the sibling
   `ROUND-<n>-DISPOSITIONS.md` names the raw and dispositions every finding;
5. the owner's selection (opening, label, description) is non-empty, one line
   each, and carries no 64-hex digest.

It then writes the dedicated record (with the UTC instant of recording) and
one `ACCEPTANCE-ACT-RECORD.md` section. `--check` re-derives both and counts
exactly one copy of the block. `--selftest` mutates each predicate and
requires it to fail closed.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import os
import pathlib
import re
import subprocess
import sys
from dataclasses import dataclass
from typing import Callable

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_dossier_local_agent_acts as build  # noqa: E402
import record_public_egress_v2_act as ev2  # noqa: E402
import record_versioned_signoff as vs  # noqa: E402

DECISIONS = pathlib.Path(".syzygy/governance/decisions")
AGGREGATE_REL = DECISIONS / "ACCEPTANCE-ACT-RECORD.md"
PKG = build.PKG
MANIFEST_REL = PKG / build.MANIFEST_NAME
PACKET_REL = PKG / "OWNER-SITTING-PACKET.md"
BRIEF_REL = PKG / "REVIEW-BRIEF.md"
INSTANCES = PKG / "instances"
#: The confirming raw (round 3, notes-only CONFIRM WITH EXCEPTIONS) and its
#: notes record, which carries the five phrases.
CONFIRMATION_REVIEW_REL = PKG / "reviews/R-DOSSIER-LOCAL-AGENT-SITTING-3-RAW.md"
DISPOSITION_REL = PKG / "ROUND-3-DISPOSITIONS.md"
#: The commit the confirming review read. None until a round returns CONFIRM
#: or notes-only CONFIRM WITH EXCEPTIONS; then set to that commit and the
#: round's two paths above, re-frozen only by a later confirming round. While None, every
#: `--record` is refused: an unreviewed package cannot be recorded.
FROZEN_SUBJECT: str | None = "d19ec98bb3bfb9c83f48919715cb5b8c7710ede8"
#: SHA-256 of each file the confirming review read, taken from that commit by
#: script (empty while FROZEN_SUBJECT is None): the manifest, packet, brief,
#: every template, every params file and every record.
FROZEN_FILE_DIGESTS: dict[pathlib.Path, str] = {
    PKG / "DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt":
        "ecf916c4f67c2ba8c8a33739653eef75a36874b925bd28e08852219243f1fb56",
    PKG / "OWNER-SITTING-PACKET.md":
        "2a3ec29e11847f7fa81f59c69b74c78845880cf3011412f2d12f413cf3ca8ad9",
    PKG / "REVIEW-BRIEF.md":
        "668f9fb1012c7aa59dd21dc2ea1469e1fef6421adaff36b3abd2a737c7e7fcf2",
    PKG / "instances/in-force/D9-IN-FORCE-RECORD.md":
        "41fdfaea8cbde4cd8220910113fb5b376c7834a470d8c2d9badd9ab0fec9ac66",
    PKG / "instances/in-force/RFC7-20-READING-IN-FORCE-RECORD.md":
        "f0725a204b6e6ccbccb211441e26e139502ef42a6447d0f4a40df2d09062f3d9",
    PKG / "instances/in-force/params.json":
        "97cba0233d37a7a5fd42ea900f08293da858ea9f182af807f5778be564afef3d",
    PKG / "instances/redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md":
        "fbbcd3c0e3d49aab3384a4ab18bf35816dbd8fb952e658d1edbac3d1c50e48a7",
    PKG / "instances/redis/AGENT-PROVIDER-STATEMENT-OPENAI.md":
        "07006f9333ca9db0ff8a1ab8a4c37ce58db66780406d78ac79df6894668cd583",
    PKG / "instances/redis/NO-EVIDENCE-DRAWER-STATEMENT.md":
        "e2dc0e2398cd9094001fc57c892d7090d445efc829c06588eb6ccf7475979f50",
    PKG / "instances/redis/params.json":
        "44860c67bdffa2508656c5f5fc8d1370e436e0bc540b41919357333b28f316bf",
    PKG / "templates/AGENT-PROVIDER-STATEMENT-TEMPLATE.md":
        "5a4a8f20cf41d1e391a906dc9c2bdb777c15fb16dcf74e05399b8d02ba9acb5a",
    PKG / "templates/D9-IN-FORCE-RECORD-TEMPLATE.md":
        "d27d45fba3544b473c950e5f7b286246bae07963eff540fb1a0fff96775f5f3f",
    PKG / "templates/NO-EVIDENCE-DRAWER-STATEMENT-TEMPLATE.md":
        "d24c3ccb510d211b7e3e8572fcebe749c747e139581395b8fd1d6dd3222cf366",
    PKG / "templates/RFC7-20-READING-IN-FORCE-RECORD-TEMPLATE.md":
        "b79f8509a808af0d06e3b3f436179dd027e43ce7f0e3bfa798497d0e09fc4c83",
}
SHA_RE = ev2.SHA_RE
HEX64_RE = ev2.HEX64_RE
ROW_RE = ev2.ROW_RE
REVIEWED_COMMIT_RE = ev2.REVIEWED_COMMIT_RE
VERDICT_RE = ev2.VERDICT_RE
VERDICTS = ev2.VERDICTS
DATE_RE = ev2.DATE_RE
INSTANT_RE = ev2.INSTANT_RE
RECORDED_RE = ev2.RECORDED_RE
PERFORMED_HEAD_RE = ev2.PERFORMED_HEAD_RE
Selection = ev2.Selection
review_findings = ev2.review_findings


@dataclass(frozen=True)
class Act:
    key: str
    label: str
    act_type: str
    identity_stem: str
    stem: str
    subject: pathlib.Path
    title: str
    effect: str
    scope: str

    @property
    def record(self) -> pathlib.Path:
        return DECISIONS / f"DOSSIER-LOCAL-AGENT-{self.stem}-ACT.md"


ACTS = (
    Act("redis-no-evidence-drawer", "STATE NO KERNEL EVIDENCE DRAWER FOR REDIS-REDIS",
        "state-project-input", "NO-EVIDENCE-DRAWER-REDIS", "REDIS-NO-EVIDENCE-DRAWER",
        INSTANCES / "redis/NO-EVIDENCE-DRAWER-STATEMENT.md",
        "no kernel evidence drawer for redis/redis",
        "The record is the owner's statement, in the admitted project input, that "
        "no kernel evidence drawer exists for (`project:syzygy`, "
        "`repository:redis-redis`). With the pinned tree holding no `openspec/**` "
        "and no `.syzygy/` path, the subject is non-governed under "
        "REQ-polaris-generation-033 and a brief needs no agent-provider statement.",
        "the drawer half of REQ-polaris-generation-033's governed predicate for this "
        "one repository"),
    Act("redis-agent-anthropic", "CONSENT TO AGENT PROVIDER ANTHROPIC FOR REDIS-REDIS",
        "consent-agent-provider", "AGENT-PROVIDER-REDIS-ANTHROPIC", "REDIS-AGENT-ANTHROPIC",
        INSTANCES / "redis/AGENT-PROVIDER-STATEMENT-ANTHROPIC.md",
        "agent-provider statement for redis/redis: Claude Code with Anthropic",
        "The record is the owner's explicit, recorded, per-project consent (SEC-2) "
        "that the operator's Claude Code sessions, with Anthropic, may receive the "
        "content classes it lists from (`project:syzygy`, `repository:redis-redis`) "
        "in an operator-agent run, so a brief may issue for that repository even "
        "when it counts as governed.",
        "operator-agent runs over this one repository with this one tool and provider"),
    Act("redis-agent-openai", "CONSENT TO AGENT PROVIDER OPENAI FOR REDIS-REDIS",
        "consent-agent-provider", "AGENT-PROVIDER-REDIS-OPENAI", "REDIS-AGENT-OPENAI",
        INSTANCES / "redis/AGENT-PROVIDER-STATEMENT-OPENAI.md",
        "agent-provider statement for redis/redis: Codex with OpenAI",
        "The record is the owner's explicit, recorded, per-project consent (SEC-2) "
        "that the operator's Codex sessions, with OpenAI, may receive the content "
        "classes it lists from (`project:syzygy`, `repository:redis-redis`) in an "
        "operator-agent run, so a brief may issue for that repository even when it "
        "counts as governed.",
        "operator-agent runs over this one repository with this one tool and provider"),
    Act("d9-in-force", "BIND D9 TO EXACT BYTES FOR OPERATOR-AGENT RUNS",
        "bind-exact-bytes", "D9-IN-FORCE-OPERATOR-AGENT", "D9-IN-FORCE",
        INSTANCES / "in-force/D9-IN-FORCE-RECORD.md",
        "D9 in force for operator-agent runs",
        "The record binds D9, adopted 2026-10-06, to the exact whole-file bytes of "
        "`security.md` and `v1.md` it lists, so the act cross-check of RFC3-16(a) "
        "may treat D9 as in force for REQ-polaris-generation-033's execution rule "
        "while both files hash to those digests, and not otherwise.",
        "REQ-polaris-generation-033's execution rule only"),
    Act("rfc7-20-reading-in-force", "BIND RFC7-20 READING TO EXACT BYTES FOR OPERATOR-AGENT RUNS",
        "bind-exact-bytes", "RFC7-20-READING-IN-FORCE-OPERATOR-AGENT", "RFC7-20-READING-IN-FORCE",
        INSTANCES / "in-force/RFC7-20-READING-IN-FORCE-RECORD.md",
        "the owner's RFC7-20 reading in force for operator-agent runs",
        "The record binds item 1 of the owner direction "
        "`POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05` to the exact bytes of its "
        "file, so the act cross-check of RFC3-16(a) may treat that reading as in "
        "force for REQ-polaris-generation-033's draft-layer rule while the file "
        "hashes to that digest, and not otherwise.",
        "item 1 of the direction, for REQ-polaris-generation-033's draft-layer rule only"),
)
ACT_BY_KEY = {act.key: act for act in ACTS}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def phrase_for(act: Act, argument: str) -> str:
    return f"{act.label}: {argument}"


def tag_for(act: Act, date: str) -> str:
    return f"dossier-local-agent-{act.key}-signed-{date}"


def identity_for(act: Act, date: str) -> str:
    return f"{act.identity_stem}-{date}"


def frozen_rels(root: pathlib.Path) -> list[pathlib.Path]:
    """Every package file a review reads: all but reviews/ and disposition records."""
    out = []
    for path in sorted((root / PKG).rglob("*")):
        rel = path.relative_to(root)
        if (path.is_file() and "reviews" not in rel.relative_to(PKG).parts
                and not build.DISPOSITIONS.match(path.name)):
            out.append(rel)
    return out


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


def live_inputs(root: pathlib.Path) -> Inputs:
    produced = [rel.as_posix() for rel, _t in build.instances(root)]
    files = {rel: (root / rel).read_bytes() for rel in frozen_rels(root)}
    review_path = root / CONFIRMATION_REVIEW_REL
    return Inputs(
        manifest=(root / MANIFEST_REL).read_bytes() if (root / MANIFEST_REL).is_file() else b"",
        subject=b"",
        packet=(root / PACKET_REL).read_bytes() if (root / PACKET_REL).is_file() else b"",
        review=review_path.read_text() if review_path.is_file() else "",
        produced_paths=produced, stale=build.stale(root), frozen=FROZEN_SUBJECT,
        frozen_digest=lambda rel: FROZEN_FILE_DIGESTS.get(rel, ""),
        frozen_files=files,
        disposition_check=lambda findings: vs.validate_disposition(
            root, CONFIRMATION_REVIEW_REL.as_posix(), DISPOSITION_REL.as_posix(), findings),
    )


def validate(act: Act, argument: str, inp: Inputs) -> tuple[str, str, str]:
    """Return (manifest file sha, reviewed commit, verdict) or raise ValueError."""
    if inp.frozen is None:
        raise ValueError("no confirming review is recorded: FROZEN_SUBJECT is unset, "
                         "so nothing may be recorded")
    if not SHA_RE.fullmatch(argument):
        raise ValueError("owner argument is not a 64-hex SHA-256")
    rows = ROW_RE.findall(inp.manifest.decode())
    act_rows = sorted(path for _sha, path in rows if path.startswith(INSTANCES.as_posix() + "/"))
    if act_rows != sorted(inp.produced_paths):
        raise ValueError("manifest act-row population differs from the builder's records")
    row = next((sha for sha, path in rows if path == act.subject.as_posix()), None)
    if row is None:
        raise ValueError(f"manifest has no row for {act.subject.as_posix()}")
    if row != argument:
        raise ValueError(f"owner argument {argument} is not the {act.key} manifest row {row}")
    if inp.stale:
        raise ValueError("builder reports stale records or manifest: " + ", ".join(inp.stale))
    if digest(inp.subject) != argument:
        raise ValueError(f"{act.key} record hashes to {digest(inp.subject)}, not the owner argument")
    for rel in (MANIFEST_REL, PACKET_REL, BRIEF_REL, act.subject):
        if rel not in inp.frozen_files:
            raise ValueError(f"frozen-file set lacks {rel.as_posix()}")
    for rel, current in inp.frozen_files.items():
        expected = current if rel != PACKET_REL else PERFORMED_HEAD_RE.sub(rb"\1", current, count=1)
        if digest(expected) != inp.frozen_digest(rel):
            raise ValueError(f"frozen subject does not carry the presented bytes of {rel.as_posix()}")
    if HEX64_RE.search(inp.packet.decode()):
        raise ValueError("owner packet carries a 64-hex token; arguments come only "
                         "from the manifest rows")
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
    if verdicts[0] == "CONFIRM WITH EXCEPTIONS":
        findings = review_findings(inp.review)
        if not findings:
            raise ValueError("CONFIRM WITH EXCEPTIONS carries no countable finding")
        bad = {n: s for n, s in findings.items() if s != "note"}
        if bad:
            raise ValueError(f"review carries non-note findings {bad}; only a "
                             "notes-only round clears the bytes")
        inp.disposition_check(findings)
    return manifest_sha, reviewed.group(1), verdicts[0]


def render_act(act: Act, argument: str, date: str, manifest_sha: str, reviewed: str,
               verdict: str, sel: Selection, frozen: str, instant: str) -> str:
    return f"""# Owner act — {act.title}

Date: {date}

Recorded at (UTC): {instant}

Owner: Tzeusy

Act identity: `{identity_for(act, date)}`

Act type: `{act.act_type}`

Project identity: `project:syzygy`

Artifact identity: `{act.subject.as_posix()}`

Exact digest (SHA-256): `{argument}`

Scope: {act.scope}

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly selected by the owner's option selection recorded below

Supersession / revocation: supersedes nothing; revoked only by a later exact
owner act naming it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

The owner was presented the confirmed packet at
`{PACKET_REL.as_posix()}`, which by design carries no digest. The act takes
this phrase, whose argument is this record's row of the sitting manifest:

```text
{phrase_for(act, argument)}
```

The owner did not type the phrase. On {date} the owner answered a structured
question in the Claude Code CLI that opened "{sel.opening}" by selecting the
option below; the selection is the instruction, and it names the record "at
the manifest row". The label and description, verbatim:

| Label | Description |
|---|---|
| "{sel.label}" | "{sel.description}" |

The argument was read from this record's row of
`{MANIFEST_REL.as_posix()}` at the frozen commit and matched the record on
disk at recording. A swapped argument would have been refused: the recorder
rejects an argument that is not this record's row.

Frozen provenance:

- frozen subject (package bytes): `{frozen}`;
- the sitting manifest file hashes to `{manifest_sha}` (a container digest,
  no act's argument; worded so CG-7e's bare-heading pass does not read it as
  a stale copy of this act's argument);
- confirmation review: `{CONFIRMATION_REVIEW_REL.as_posix()}`, verdict
  `{verdict}`, its head bound to the manifest file's SHA-256 above; notes, if
  any, are dispositioned in `{DISPOSITION_REL.as_posix()}`; the raw names
  reviewed commit `{reviewed}` [Observed — the raw's own line; binding is by
  digest]; and
- recording tag: `{tag_for(act, date)}`, on the commit carrying this act record.

## Effect

{act.effect}

## What this act does not authorize

This act satisfies only its own authority; the sitting's other acts each take
their own act and none implies another (REQ-polaris-generation-025). It gives
no observation consent, adopts no registry entry or screening policy, amends
no doctrine, contract or specification, and grants no read, egress, write,
execution, deployment, release, autonomous or multi-user authority beyond
what its Effect states. It proves no read, screening, generation or answer
result.
"""


def aggregate_heading(act: Act, date: str) -> str:
    return f"## Dossier local-agent act — {act.act_type} — {act.key} — performed {date}"


def render_aggregate_block(act: Act, argument: str, date: str, manifest_sha: str,
                           verdict: str, frozen: str, instant: str) -> str:
    return f"""{aggregate_heading(act, date)}

Act instant: {instant}

**Phrase the act takes (given {date} by option selection, not typed; see the
dedicated record):**

```text
{phrase_for(act, argument)}
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `{act.act_type}` / `{act.subject.as_posix()}` |
| Scope | {act.scope} |
| Argument | SHA-256 of the artifact itself: its row of the sitting manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `{frozen}` |
| Manifest | `{MANIFEST_REL.as_posix()}`, SHA-256 `{manifest_sha}` |
| Review outcome | `{CONFIRMATION_REVIEW_REL.as_posix()}`: `{verdict}`, its head bound to the manifest file |
| Recorded at (UTC) | `{instant}` |
| Recording | `{act.record.as_posix()}`; annotated tag `{tag_for(act, date)}` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. The sitting's
other acts remain separate.
"""


def expected(act: Act, argument: str, date: str, sel: Selection, inp: Inputs, instant: str):
    sel.validate()
    if not DATE_RE.fullmatch(date):
        raise ValueError("date must be YYYY-MM-DD")
    if not INSTANT_RE.fullmatch(instant) or not instant.startswith(date + "T"):
        raise ValueError("instant must be YYYY-MM-DDTHH:MM:SSZ (UTC) on the act's date")
    manifest_sha, reviewed, verdict = validate(act, argument, inp)
    frozen = inp.frozen or ""
    return (render_act(act, argument, date, manifest_sha, reviewed, verdict, sel, frozen, instant),
            render_aggregate_block(act, argument, date, manifest_sha, verdict, frozen, instant))


def with_subject(inp: Inputs, root: pathlib.Path, act: Act) -> Inputs:
    path = root / act.subject
    inp.subject = path.read_bytes() if path.is_file() else b""
    return inp


def do_record(root: pathlib.Path, act: Act, argument: str, date: str, sel: Selection,
              instant: str | None = None) -> int:
    if instant is None:
        instant = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if (root / act.record).exists():
        print(f"FAILED: dedicated act already exists: {act.record.as_posix()}")
        return 1
    try:
        record, block = expected(act, argument, date, sel, with_subject(live_inputs(root), root, act), instant)
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"FAILED (nothing written): {exc}")
        return 1
    aggregate = (root / AGGREGATE_REL).read_text()
    if aggregate_heading(act, date) in aggregate:
        print("FAILED: aggregate record already carries this act's heading")
        return 1
    (root / act.record).write_text(record)
    (root / AGGREGATE_REL).write_text(aggregate.rstrip() + "\n\n" + block)
    print(f"recorded at {instant}")
    print(f"wrote {act.record.as_posix()}\nappended one section to {AGGREGATE_REL.as_posix()}")
    print(f"next, in the same change: tag {tag_for(act, date)} on the commit carrying them; "
          "scripts/check_governance.py: add the performed-act registration for this label "
          "(the candidate registration stays until then)")
    return 0


def do_check(root: pathlib.Path, act: Act, argument: str, date: str, sel: Selection,
             instant: str | None = None) -> int:
    if instant is None:
        on_disk = (root / act.record).read_text() if (root / act.record).is_file() else ""
        found = RECORDED_RE.findall(on_disk)
        if len(found) != 1:
            print(f"FAILED: {act.record.as_posix()} carries {len(found)} 'Recorded at (UTC)' lines, not 1")
            return 1
        instant = found[0]
    try:
        record, block = expected(act, argument, date, sel, with_subject(live_inputs(root), root, act), instant)
    except (ValueError, subprocess.CalledProcessError) as exc:
        print(f"FAILED: {exc}")
        return 1
    path = root / act.record
    drift = not path.is_file() or path.read_text() != record
    count = (root / AGGREGATE_REL).read_text().count(block)
    if drift:
        print(f"recorded act differs from regeneration: {act.record.as_posix()}")
    if count != 1:
        print(f"aggregate record carries {count} copies of this act's block, not 1")
    if drift or count != 1:
        return 1
    print(f"recorded {act.key} act matches the exact owner argument")
    return 0


# --- selftest ---------------------------------------------------------------

INSTANT_OK = "2026-10-07T09:30:00Z"


def selftest() -> int:
    """One mutant per predicate; each must be refused for the stated reason."""
    act = ACTS[3]
    record = b"record d9\n"
    pkt = b"# Packet\n\n> Candidate - binds nothing.\n\nbody\n"
    rsha = digest(record)
    others = [a.subject.as_posix() for a in ACTS if a is not act]
    manifest = ("# header\n" + "".join(f"{'1' * 64}  {p}\n" for p in others)
                + f"{rsha}  {act.subject.as_posix()}\n"
                + f"{'2' * 64}  {build.REGISTRY_ENTRY.as_posix()}\n").encode()
    msha = digest(manifest)
    review = (f"# R1\nReviewed commit: {'a' * 40}\nManifest SHA-256: {msha}\n"
              "Verdict: CONFIRM\n\n## Findings\n\nnone\n")
    blobs = {MANIFEST_REL: manifest, PACKET_REL: pkt, BRIEF_REL: b"brief", act.subject: record}
    produced = sorted(a.subject.as_posix() for a in ACTS)

    def make(**over) -> Inputs:
        base = dict(manifest=manifest, subject=record, packet=pkt, review=review,
                    produced_paths=produced, stale=[], frozen="f" * 40,
                    frozen_digest=lambda rel: digest(blobs[rel]), frozen_files=dict(blobs),
                    disposition_check=lambda findings: None)
        base.update(over)
        return Inputs(**base)

    results: list[tuple[str, bool]] = []

    def refused(needle, argument, inp, which=act) -> bool:
        try:
            validate(which, argument, inp)
        except ValueError as exc:
            return needle in str(exc)
        return False

    arg = rsha
    results.append(("exact argument validates", _accepts(act, arg, make())))
    results.append(("the shipped recorder is unfrozen, or frozen with its files",
                    (FROZEN_SUBJECT is None and not FROZEN_FILE_DIGESTS)
                    or (FROZEN_SUBJECT is not None
                        and set(FROZEN_FILE_DIGESTS) == set(frozen_rels(ROOT)))))
    results.append(("five acts, five distinct labels, subjects and records",
                    len({a.label for a in ACTS}) == len({a.subject for a in ACTS})
                    == len({a.record for a in ACTS}) == 5))
    results.append(("no label is a prefix of another (CG-7d reads LABEL: digest)",
                    not any(a.label != b.label and b.label.startswith(a.label)
                            for a in ACTS for b in ACTS)))
    results.append(("every act subject is a builder record",
                    {a.subject.as_posix() for a in ACTS}
                    == {r.as_posix() for r, _t in build.instances(ROOT)}))
    results.append(("unset FROZEN_SUBJECT refused",
                    refused("FROZEN_SUBJECT is unset", arg, make(frozen=None))))
    results.append(("non-hex argument refused", refused("not a 64-hex", "xyz", make())))
    results.append(("another record's row refused", refused("manifest row", "1" * 64, make())))
    results.append(("the registry row offered as an argument refused",
                    refused("manifest row", "2" * 64, make())))
    results.append(("a manifest missing an act row refused",
                    refused("act-row population", arg, make(
                        manifest=manifest.replace(f"{others[0]}\n".encode(), b"\n")))))
    results.append(("an extra act row refused",
                    refused("act-row population", arg, make(
                        manifest=manifest + f"{'3' * 64}  {INSTANCES.as_posix()}/x/X.md\n".encode()))))
    results.append(("stale builder output refused", refused("stale", arg, make(stale=["x"]))))
    results.append(("record not hashing to the argument refused",
                    refused("hashes to", arg, make(subject=record + b"x"))))
    short = {k: v for k, v in blobs.items() if k != BRIEF_REL}
    results.append(("a frozen-file set missing the brief refused",
                    refused("frozen-file set lacks", arg, make(frozen_files=short))))
    drift = dict(blobs)
    drift[PACKET_REL] = pkt + b"x"
    results.append(("frozen commit lacking the presented packet refused",
                    refused("frozen subject does not carry", arg,
                            make(frozen_digest=lambda rel: digest(drift[rel])))))
    performed = pkt.replace(b"\n\n", b"\n\n> **PERFORMED 2026-10-07.** Recorded.\n\n", 1)
    perf_files = dict(blobs)
    perf_files[PACKET_REL] = performed
    results.append(("PERFORMED head over the frozen packet accepted",
                    _accepts(act, arg, make(packet=performed, frozen_files=perf_files))))
    results.append(("packet carrying a digest refused",
                    refused("64-hex token", arg, make(packet=pkt + arg.encode()))))
    results.append(("review binding another manifest digest refused",
                    refused("manifest file's SHA-256", arg, make(review=review.replace(msha, "0" * 64)))))
    results.append(("review binding the record row instead of the file digest refused",
                    refused("manifest file's SHA-256", arg, make(review=review.replace(msha, arg)))))
    results.append(("verdict REVISE refused",
                    refused("verdict", arg, make(review=review.replace("CONFIRM", "REVISE")))))
    results.append(("verdict displaced past the fourth head line refused",
                    refused("verdict", arg, make(review=review.replace(
                        "Verdict: CONFIRM", "Note: x\nVerdict: CONFIRM")))))
    exc_review = review.replace("Verdict: CONFIRM", "Verdict: CONFIRM WITH EXCEPTIONS").replace(
        "none", "**Finding 1 — t** (revise)\nbody")
    results.append(("a revise finding under CONFIRM WITH EXCEPTIONS refused",
                    refused("non-note", arg, make(review=exc_review))))
    notes = exc_review.replace("(revise)", "(note)")
    results.append(("notes-only CONFIRM WITH EXCEPTIONS accepted", _accepts(act, arg, make(review=notes))))

    def bad_disposition(findings):
        raise ValueError("disposition record does not name the reviewed raw")
    results.append(("missing disposition refused",
                    refused("disposition", arg, make(review=notes, disposition_check=bad_disposition))))
    for name, sel in (("empty label", Selection("q", "", "d")),
                      ("multi-line description", Selection("q", "l", "a\nb")),
                      ("digest in opening", Selection("q " + "a" * 64, "l", "d"))):
        results.append((f"selection with {name} refused", _raises(sel.validate)))
    ok_sel = Selection("Perform the D9 in-force act?", "Perform it now", "Perform the act at the manifest row.")
    try:
        rec, block = expected(act, arg, "2026-10-07", ok_sel, make(), INSTANT_OK)
        results.append(("record and block render, naming the row, the scope and the tag",
                        arg in rec and arg in block and act.scope in rec
                        and tag_for(act, "2026-10-07") in rec))
        results.append(("record carries the phrase exactly once in its ceremony",
                        rec.count(phrase_for(act, arg)) == 1))
        results.append(("the aggregate block carries the act instant once, above its phrase",
                        block.count(f"Act instant: {INSTANT_OK}\n") == 1
                        and block.index("Act instant:") < block.index(act.label)))
    except ValueError as exc:
        print(f"  (render failure: {exc})")
        results.append(("record and block render", False))
    results.append(("bad date refused", _raises(lambda: expected(act, arg, "07/10", ok_sel, make(), INSTANT_OK))))
    results.append(("an instant on another date refused", _raises(lambda: expected(
        act, arg, "2026-10-07", ok_sel, make(), "2026-10-08T00:00:00Z"))))
    results.append(("record, check and a repeat --record on a scratch tree", _end_to_end()))
    failed = [name for name, ok in results if not ok]
    for name, ok in results:
        print(("ok   " if ok else "FAIL ") + name)
    print(f"selftest: {len(results) - len(failed)} of {len(results)} predicates held")
    return 1 if failed else 0


def _end_to_end() -> bool:
    """Run --record and --check for real on a scratch copy of the package and
    its bound files, with a synthetic confirming raw bound to the scratch
    manifest; then edit a bound doctrine file, where --record of another act
    must refuse as stale and write nothing."""
    import contextlib
    import io
    import shutil
    import tempfile
    global FROZEN_SUBJECT, FROZEN_FILE_DIGESTS
    saved = (FROZEN_SUBJECT, FROZEN_FILE_DIGESTS)
    with tempfile.TemporaryDirectory() as d:
        root = build._fixture(pathlib.Path(d))
        (root / DECISIONS).mkdir(parents=True, exist_ok=True)
        (root / AGGREGATE_REL).write_text("# Acceptance record\n")
        (root / PACKET_REL).write_text("# Packet\n\n> Candidate.\n\nbody\n")
        (root / BRIEF_REL).write_text("# Brief\n")
        raw = root / CONFIRMATION_REVIEW_REL
        raw.parent.mkdir(parents=True, exist_ok=True)
        raw.write_text(f"# R1\nReviewed commit: {'a' * 40}\n"
                       f"Manifest SHA-256: {digest((root / MANIFEST_REL).read_bytes())}\n"
                       "Verdict: CONFIRM\n\n## Findings\n\nnone\n")
        FROZEN_SUBJECT = "f" * 40
        FROZEN_FILE_DIGESTS = {r: digest((root / r).read_bytes()) for r in frozen_rels(root)}
        sel = Selection("Perform the act?", "Perform it now", "Perform the act at the manifest row.")
        act, other = ACT_BY_KEY["d9-in-force"], ACT_BY_KEY["redis-no-evidence-drawer"]
        arg = digest((root / act.subject).read_bytes())
        out = io.StringIO()
        try:
            with contextlib.redirect_stdout(out):
                wrote = do_record(root, act, arg, "2026-10-07", sel, INSTANT_OK)
                checked = do_check(root, act, arg, "2026-10-07", sel)
                again = do_record(root, act, arg, "2026-10-07", sel, INSTANT_OK)
                v1 = root / ".syzygy/governance/doctrine/v1.md"
                v1.write_text(v1.read_text() + "\nedit\n")
                other_arg = digest((root / other.subject).read_bytes())
                stale_refused = do_record(root, other, other_arg, "2026-10-07", sel, INSTANT_OK)
        finally:
            FROZEN_SUBJECT, FROZEN_FILE_DIGESTS = saved
        if wrote != 0:
            print("  (end-to-end --record said: " + out.getvalue().strip().splitlines()[-1][:200] + ")")
        return (wrote == 0 and checked == 0 and again == 1 and stale_refused == 1
                and not (root / other.record).exists())


def _accepts(act, argument, inp) -> bool:
    try:
        validate(act, argument, inp)
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


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--record", nargs=2, metavar=("KEY", "ARGUMENT"))
    mode.add_argument("--check", nargs=2, metavar=("KEY", "ARGUMENT"))
    mode.add_argument("--selftest", action="store_true")
    ap.add_argument("--date")
    ap.add_argument("--instant", help="UTC instant YYYY-MM-DDTHH:MM:SSZ; --record defaults to now, --check reads it from the record")
    ap.add_argument("--question-opening")
    ap.add_argument("--selection-label")
    ap.add_argument("--selection-description")
    args = ap.parse_args(argv[1:])
    if args.selftest:
        return selftest()
    key, argument = args.record or args.check
    if key not in ACT_BY_KEY:
        print(f"unknown act key {key}; one of {', '.join(ACT_BY_KEY)}", file=sys.stderr)
        return 2
    if not (args.date and args.question_opening and args.selection_label
            and args.selection_description):
        print("--date, --question-opening, --selection-label and "
              "--selection-description are required", file=sys.stderr)
        return 2
    sel = Selection(args.question_opening, args.selection_label, args.selection_description)
    fn = do_record if args.record else do_check
    return fn(ROOT, ACT_BY_KEY[key], argument, args.date, sel, args.instant)


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
