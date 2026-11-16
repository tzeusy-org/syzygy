#!/usr/bin/env python3
"""Record or verify the owner's public-source screening-scope version-7 policy act.

Package `contracts/candidates/public-source-screening-scope-v7/` (`syzygy-pdja.5`,
owner direction OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06-2 item 3). One
state-(1) `approve-policy` owner act over the proposed secret-classification
policy, whose argument is the ONE row of the package manifest (variant `s`: a
closed directive set and a renderer-owned hash-allowed inline script). The owner
gives it in words, "Sign screening scope version 7, variant s", which name the
variant, and the variant names the row. No digest is typed. It supersedes, for
the `approve-policy` role only, the version-6 act. This script performs nothing
by itself.

Modelled on `record_public_source_screening_scope_v6_act.py` (imported for its
shared readers). The differences:

- the owner chose through a token-gated questionnaire form and this session ran
  the recorder, so the record says so and carries both facts;
- the clearing raw, round 3, is a bulleted report with no `## Findings` section.
  Its findings are the lines `- E<n>, exception:` and `- E<n>, note:`. It must
  also say `Blocking findings: none`, and name no `blocking` finding;
- its exceptions are carried in `ROUND-3-CARRIED-EXCEPTIONS.md`, added after the
  review so that no reviewed byte moved. That file must name the raw and every
  E-number. It is frozen as the owner was shown it, at `FROZEN_EXCEPTIONS_COMMIT`;
- the effect paragraph reads the clause from the version-7 bytes.

FROZEN: `FROZEN_FILE_DIGESTS` was filled by `--freeze-table <commit>`, never by
hand. Binding is by the manifest file's digest in the raw's head; the commit is
provenance only.

ORDER. The version-6 act must be recorded, the policy on disk must be exactly its
argument, and both the instant the owner gave the words and this act's recording
instant must fall after the version-6 record's, the words first.

`--record ARGUMENT --date D --words-at W [--instant I] --owner-words S` validates
everything before writing, then writes the dedicated record, appends one
`ACCEPTANCE-ACT-RECORD.md` section and applies the bytes. It does NOT re-point the
read gates: that is the install, which lands in the same change. `--check`
re-derives the record and the block, requires the policy to hash to the argument
and counts exactly one copy of the block. `--freeze-table [COMMIT]` prints the
table for the files as they are (or at COMMIT). `--selftest` mutates each
predicate and requires it to fail closed.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import sys
from dataclasses import dataclass
from typing import Callable

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_source_screening_scope_v7 as build  # noqa: E402
import record_public_source_screening_scope_v6_act as v6rec  # noqa: E402

DECISIONS = v6rec.DECISIONS
AGGREGATE_REL = v6rec.AGGREGATE_REL
PKG = build.PKG
MANIFEST_REL = build.MANIFEST
POLICY_REL = build.POLICY
PATCH_REL = build.patch_path("s")
PACKET_REL = PKG / "OWNER-DECISION-PACKET.md"
DELTA_REL = PKG / "SEMANTIC-DELTA.md"
BRIEF_REL = PKG / "REVIEW-BRIEF.md"
LEDGER_REL = PKG / "IMPACT-LEDGER.md"
EXCEPTIONS_REL = PKG / "ROUND-3-CARRIED-EXCEPTIONS.md"
BUILDER_REL = pathlib.Path("scripts/build_public_source_screening_scope_v7.py")
V6_ACT_REL = v6rec.ACT.record
DIRECTION_NAME = "OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06-2.md"
DIRECTION_PR = 779
CONFIRMATION_REVIEW_REL = pathlib.Path("docs/reviews/R-SCREENING-SCOPE-V7-3-RAW.md")
#: The commit the confirming review read (provenance).
FROZEN_SUBJECT: str | None = "7f98407d4257115a1cb890f8d15e7ad3c42a00ff"
#: The commit that added the exceptions file, leaving every reviewed file as it was.
FROZEN_EXCEPTIONS_COMMIT = "a1021416"
FROZEN_FILE_DIGESTS: dict[pathlib.Path, str] = {
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7/PUBLIC-SOURCE-SCREENING-SCOPE-V7-MANIFEST.txt"): "b187ba86f5020e55c299db5ed39a6141dea951643911c44a77c82627bd7edcd7",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.s.patch"): "ab351d9a6d60462b97910e177e16a79749fa82a7b34b1db6940a2385b28624de",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7/OWNER-DECISION-PACKET.md"): "6ce25ffe209bd418224c6ca287c9d6ccc5ee0a4f31b8a274c7db4e1f5f319512",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7/SEMANTIC-DELTA.md"): "73a6480370ff9e5d6e649f0d11d2b2895d28be81427c704454031bc9749340b8",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7/REVIEW-BRIEF.md"): "7f3d6afe0d12f55560ec3d5032034093e664ad3108c43f43b4d43d35477c1274",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7/IMPACT-LEDGER.md"): "69f6510ccc039d071b97fb4957cd72685ebb748103bd3861df5761bc500ab523",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7/ROUND-3-CARRIED-EXCEPTIONS.md"): "57e3e2fc380e2aedfdaae9b63a51880f03fa529a3f20dc4cb6b119d2f69e9f71",
    pathlib.Path("scripts/build_public_source_screening_scope_v7.py"): "b41f50ad31f65aa5d095aa1058f52d4f1bd0b4ccd9c202cd641ba13c449ebc95",
}
OWNER_WORDS = ("Sign screening scope version 7, variant s",)
#: The one blocking statement the clearing raw must carry, as a whole bullet opening.
NO_BLOCKERS = "- Blocking findings: none"
FINDING_RE = re.compile(r"^- E(\d+), ([a-z]+):", re.MULTILINE)
#: A round-level finding of any other grade, in any spelling the raw might use.
EXPECTED_FINDINGS = {1: "exception", **{n: "note" for n in range(2, 8)}}
VERDICTS = v6rec.VERDICTS
DATE_RE = v6rec.DATE_RE
INSTANT_RE = v6rec.INSTANT_RE
RECORDED_RE = v6rec.RECORDED_RE
WORDS_AT_RE = v6rec.WORDS_AT_RE
SHA_RE = v6rec.SHA_RE
HEX64_RE = v6rec.HEX64_RE
ROW_RE = v6rec.ROW_RE
EXACT_DIGEST_RE = v6rec.EXACT_DIGEST_RE
REVIEWED_COMMIT_RE = v6rec.REVIEWED_COMMIT_RE
VERDICT_RE = v6rec.VERDICT_RE
PERFORMED_HEAD_RE = v6rec.PERFORMED_HEAD_RE
digest = v6rec.digest
Act = v6rec.Act

ACT = Act("policy-v7", v6rec.ACT.label, "approve-policy",
          "PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V7-APPROVAL",
          DECISIONS / "PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V7-ACT.md",
          "Polaris Butlers secret-classification policy approval (public-source screening scope, version 7)")


def phrase_for(act: Act, argument: str) -> str:
    return f"{act.label}: {argument}"


def tag_for(act: Act, date: str) -> str:
    return f"pwb-{act.act_type}-public-source-scope-v7-signed-{date}"


def identity_for(act: Act, date: str) -> str:
    return f"{act.identity_stem}-{date}"


def frozen_rels() -> list[pathlib.Path]:
    return [MANIFEST_REL, PATCH_REL, PACKET_REL, DELTA_REL, BRIEF_REL, LEDGER_REL, EXCEPTIONS_REL, BUILDER_REL]


def frozen_table(read: Callable[[pathlib.Path], bytes] | None = None) -> str:
    read = read or (lambda rel: (ROOT / rel).read_bytes())
    lines = []
    for rel in frozen_rels():
        data = read(rel)
        data = PERFORMED_HEAD_RE.sub(rb"\1", data, count=1) if rel == PACKET_REL else data
        lines.append(f'    pathlib.Path("{rel.as_posix()}"): "{digest(data)}",')
    return "FROZEN_FILE_DIGESTS: dict[pathlib.Path, str] = {\n" + "\n".join(lines) + "\n}"


@dataclass
class Inputs:
    """Everything validation reads, injectable for the selftest."""
    manifest: bytes
    policy: bytes
    proposed: bytes
    packet: bytes
    review: str
    exceptions: str
    stale: list[str]
    predecessor: str
    predecessor_date: str
    predecessor_instant: str
    applied: bool
    frozen: str | None
    frozen_digest: Callable[[pathlib.Path], str]
    frozen_files: dict[pathlib.Path, bytes]


def live_inputs(root: pathlib.Path) -> Inputs:
    def read(rel: pathlib.Path) -> bytes:
        return (root / rel).read_bytes() if (root / rel).is_file() else b""
    manifest, policy = read(MANIFEST_REL), read(POLICY_REL)
    rows = {variant: sha for sha, _p, variant in ROW_RE.findall(manifest.decode())}
    applied = digest(policy) in rows.values()
    stale = build.check(root)
    proposed = b""
    if not applied:
        try:
            base, _mode = build.base_bytes(root)
            proposed = build.propose(base).encode()
        except (ValueError, OSError) as exc:
            stale.append(str(exc))
    pred = read(V6_ACT_REL).decode()
    m = EXACT_DIGEST_RE.findall(pred)
    d = re.findall(r"^Date: (\d{4}-\d{2}-\d{2})$", pred, re.MULTILINE)
    i = RECORDED_RE.findall(pred)
    return Inputs(manifest=manifest, policy=policy, proposed=proposed, packet=read(PACKET_REL),
                  review=read(CONFIRMATION_REVIEW_REL).decode(), exceptions=read(EXCEPTIONS_REL).decode(), stale=stale,
                  predecessor=m[0] if len(m) == 1 else "", predecessor_date=d[0] if len(d) == 1 else "",
                  predecessor_instant=i[0] if len(i) == 1 else "", applied=applied, frozen=FROZEN_SUBJECT,
                  frozen_digest=lambda rel: FROZEN_FILE_DIGESTS.get(rel, ""),
                  frozen_files={rel: (root / rel).read_bytes() for rel in frozen_rels() if (root / rel).is_file()})


def carried_findings(review: str) -> dict[int, str]:
    """The round's findings by number. A repeated number is refused: it would hide one grade behind another."""
    found = FINDING_RE.findall(review)
    numbers = [int(n) for n, _grade in found]
    if len(numbers) != len(set(numbers)):
        raise ValueError(f"review repeats a finding number: {sorted(numbers)}")
    return {int(n): grade for n, grade in found}


def validate(act: Act, argument: str, inp: Inputs) -> tuple[str, str, str]:
    """Return (manifest file sha, reviewed commit, verdict) or raise ValueError."""
    if inp.frozen is None:
        raise ValueError("no confirming review is recorded: FROZEN_SUBJECT is unset, so nothing may be recorded")
    if not SHA_RE.fullmatch(argument):
        raise ValueError("owner argument is not a 64-hex SHA-256")
    rows = ROW_RE.findall(inp.manifest.decode())
    if [(p, v) for _s, p, v in rows] != [(POLICY_REL.as_posix(), v) for v in build.VARIANTS]:
        raise ValueError("manifest row population differs from the one variant of the one policy subject")
    if argument != rows[0][0]:
        raise ValueError(f"owner argument {argument} is not the row of the manifest")
    if inp.stale:
        raise ValueError("builder reports findings: " + "; ".join(inp.stale))
    if (not SHA_RE.fullmatch(inp.predecessor) or not DATE_RE.fullmatch(inp.predecessor_date)
            or not INSTANT_RE.fullmatch(inp.predecessor_instant)):
        raise ValueError("the version-6 act record is absent or does not name exactly one digest, date and instant")
    if inp.applied:
        if digest(inp.policy) != argument:
            raise ValueError(f"policy hashes to {digest(inp.policy)}, not the owner argument")
    else:
        if digest(inp.policy) != inp.predecessor:
            raise ValueError("the policy on disk is not the version-6 act's argument; the patch cannot be applied "
                             "to anything else")
        if digest(inp.proposed) != argument:
            raise ValueError("owner argument does not match the digest of the proposed bytes")
    if set(inp.frozen_files) != set(frozen_rels()):
        raise ValueError("frozen-file set is not exactly the files the review read and the exceptions shown")
    for rel, current in inp.frozen_files.items():
        expected_bytes = current if rel != PACKET_REL else PERFORMED_HEAD_RE.sub(rb"\1", current, count=1)
        if digest(expected_bytes) != inp.frozen_digest(rel):
            raise ValueError(f"frozen subject does not carry the presented bytes of {rel.as_posix()}")
    packet = inp.packet.decode()
    if HEX64_RE.search(packet):
        raise ValueError("owner packet carries a 64-hex token; the argument comes only from the manifest row")
    if f'**"{OWNER_WORDS[0]}"**' not in packet:
        raise ValueError("owner packet does not quote the offered words; they were not offered")
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
    if not any(line.startswith(NO_BLOCKERS) for line in inp.review.splitlines()):
        raise ValueError(f"review does not carry the line {NO_BLOCKERS!r}; only a round with no blocker clears the bytes")
    findings = carried_findings(inp.review)
    if findings != EXPECTED_FINDINGS:
        raise ValueError(f"review findings {findings} are not the round's graded exceptions and notes "
                         f"{EXPECTED_FINDINGS}; a finding of any other grade or number clears nothing")
    if CONFIRMATION_REVIEW_REL.name not in inp.exceptions:
        raise ValueError("the carried-exceptions file does not name the reviewed raw")
    uncarried = [n for n in findings if not re.search(rf"\bE{n}\b", inp.exceptions)]
    if uncarried:
        raise ValueError(f"the carried-exceptions file does not name findings {uncarried}")
    return manifest_sha, reviewed.group(1), verdicts[0]


def validate_words(words: str) -> None:
    if not words.strip() or "\n" in words or "\r" in words:
        raise ValueError("owner words must be one non-empty line")
    if HEX64_RE.search(words):
        raise ValueError("owner words carry a 64-hex digest")
    if words not in OWNER_WORDS:
        raise ValueError(f"the owner words {words!r} are not the packet's offer {OWNER_WORDS[0]!r}")


def version_of(policy: bytes) -> str:
    return v6rec.version_of(policy)


def effect_of(policy: bytes) -> str:
    """The effect paragraph, from the approved bytes' own values, never from prose held here."""
    try:
        doc = json.loads(policy)
        text = doc[build.SCOPE_KEY]["activeContent"]["codeContentExemption"]["renderCondition"]
        if text.count(build.NEW_CLAUSE) != 1 or build.OLD_CLAUSE in text:
            raise ValueError("the bytes' renderCondition does not carry the version-7 clause")
        if not str(doc["policyVersion"]).endswith(".v7-s"):
            raise ValueError("the bytes' policyVersion is not a version-7 one")
    except (ValueError, KeyError, TypeError) as exc:
        raise ValueError(f"the approved bytes do not carry the version-7 values the record names: {exc!r}") from exc
    return ("It is the version-6 policy with one clause of `publicSourceScope.activeContent.codeContentExemption."
            "renderCondition` replaced. A page's policy is now a closed set of directives, and the page may carry "
            "inline scripts the renderer itself writes, each allowed by its hash, under the conduct the clause states. "
            "Every page must still read and navigate with scripts off. Every detector, placement, class rule and "
            "consent is unchanged; `policyVersion` is the only other value that changes.")


def render_act(act: Act, argument: str, date: str, manifest_sha: str, reviewed: str, verdict: str, words: str,
               words_at: str, frozen: str, instant: str, superseded: str, superseded_date: str, version: str,
               effect: str) -> str:
    return f"""# Owner act — {act.title}

Date: {date}

Owner's words given at (UTC): {words_at}

Recorded at (UTC): {instant}

Owner: Tzeusy

Act identity: `{identity_for(act, date)}`

Act type: `{act.act_type}`

Project identity: `project:syzygy`

Artifact identity: `{POLICY_REL.as_posix()}`

Exact digest (SHA-256): `{argument}`

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly given by the owner's words recorded below

Supersession / revocation: this act supersedes, for the `{act.act_type}` role only, the {superseded_date} act recorded at `{V6_ACT_REL.as_posix()}`. That is the version-6 screening-scope act. Its argument
`{superseded}` was the policy's exact digest until this act's patch was
applied. That record, its digest, its tag and the bytes it bound remain
immutable history. This act is revoked only by a later exact owner act naming
it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

How the owner came to the choice:

- On 2026-11-06 the owner wrote "Give up no-scripts but should still be a
  perfectly functional static-site."
- The package's packet `{PACKET_REL.as_posix()}` offers one question with one
  variant and decline, and quotes the words "{OWNER_WORDS[0]}". By design it
  carries no digest. [Unknown] Whether the owner opened it.
- A token-gated questionnaire showed the row, the review verdicts, the carried
  exceptions and three options. The owner picked option A, whose text is the
  words below. The plain owner direction `{DIRECTION_NAME}` records that answer
  (PR #{DIRECTION_PR}).

The act takes this phrase, whose argument is the manifest's one row:

```text
{phrase_for(act, argument)}
```

The owner did not type the phrase. The owner selected these words on that form
at {words_at}, as the form recorded it, and a Claude Code session ran this
recorder with them as `--owner-words`. [Inferred] That the operator of the form
is the owner.

> {words}

The words name variant `s`, and the variant names the manifest row.

Chosen variant: `s`; its manifest row's digest is the exact digest above.

The argument was read from that row of `{MANIFEST_REL.as_posix()}`, re-derived
from the builder's proposed bytes at recording, and, after the patch was
applied in the same change, matched the policy on disk. A swapped argument
would have been refused: the recorder rejects an argument that is not the row.

Frozen provenance:

- frozen subject (package bytes): `{frozen}`;
- the manifest file hashes to `{manifest_sha}` (a container digest, no act's
  argument);
- confirmation review: `{CONFIRMATION_REVIEW_REL.as_posix()}`, verdict
  `{verdict}`, its head bound to the manifest file's SHA-256 above; its
  exceptions are carried in `{EXCEPTIONS_REL.as_posix()}`, which the form showed;
  the raw names reviewed commit `{reviewed}` [Observed — the raw's own line;
  binding is by digest]; and
- recording tag: `{tag_for(act, date)}`, on the commit carrying this act record.

## Effect

The policy `polaris-butlers-project-shape-secrets`, policy-owning project
`project:syzygy`, is approved at version `{version}` as the observing project's
secret-classification policy. {effect}

## What this act does not authorize

This act is the policy authority the public-source scope needs and satisfies
only its own. It adds no script: a script also needs a signed dossier
specification version and its own implementation. It admits no repository. It
grants no observation consent, no read, no egress and no provider call: each
takes its own act (REQ-polaris-generation-025). The read gates refuse a policy
on its digest first, so they keep refusing this one until the install change
re-points them once, against these bytes; the recorder does not do that. It
grants no write, execution, deployment, release, recovery, mission, autonomous
or multi-user authority, widens no consent, edits no performed record, accepts
no candidate contract and amends no doctrine or specification. It proves no
read, screening, parse, render or answer result.
"""


BLOCK_BEGIN = "<!-- PWB-POLICY-SCOPE-V7:BEGIN -->"
BLOCK_END = "<!-- PWB-POLICY-SCOPE-V7:END -->"


def aggregate_heading(act: Act, date: str) -> str:
    return f"## Public-source screening scope version 7 act — {act.act_type} — performed {date}"


def render_aggregate_block(act: Act, argument: str, date: str, manifest_sha: str, verdict: str, frozen: str,
                           instant: str, words_at: str) -> str:
    return f"""{BLOCK_BEGIN}
{aggregate_heading(act, date)}

**Phrase the act takes (given {date} by the owner's words, not typed as a
phrase; see the dedicated record):**

```text
{phrase_for(act, argument)}
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `{act.act_type}` / `{POLICY_REL.as_posix()}` |
| Argument | SHA-256 of the artifact itself: the one row (variant `s`) of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `{frozen}` |
| Manifest | `{MANIFEST_REL.as_posix()}`, SHA-256 `{manifest_sha}` |
| Review outcome | `{CONFIRMATION_REVIEW_REL.as_posix()}`: `{verdict}`, its head bound to the manifest file |
| Owner's words given (UTC) | `{words_at}` |
| Recorded at (UTC) | `{instant}` |
| Recording | `{act.record.as_posix()}`; annotated tag `{tag_for(act, date)}` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress and adds no script.
{BLOCK_END}
"""


def expected(act: Act, argument: str, date: str, words: str, inp: Inputs, instant: str, words_at: str):
    validate_words(words)
    if not DATE_RE.fullmatch(date):
        raise ValueError("date must be YYYY-MM-DD")
    for name, value in (("instant", instant), ("words-at", words_at)):
        if not INSTANT_RE.fullmatch(value) or not value.startswith(date + "T"):
            raise ValueError(f"{name} must be YYYY-MM-DDTHH:MM:SSZ (UTC) on the act's date")
    manifest_sha, reviewed, verdict = validate(act, argument, inp)
    if words_at <= inp.predecessor_instant:
        raise ValueError(f"words-at {words_at} is not after the version-6 act's {inp.predecessor_instant}")
    if instant < words_at:
        raise ValueError(f"instant {instant} is before the owner gave the words at {words_at}")
    bytes_ = inp.proposed if not inp.applied else inp.policy
    return (render_act(act, argument, date, manifest_sha, reviewed, verdict, words, words_at, inp.frozen or "",
                       instant, inp.predecessor, inp.predecessor_date, version_of(bytes_), effect_of(bytes_)),
            render_aggregate_block(act, argument, date, manifest_sha, verdict, inp.frozen or "", instant, words_at))


def do_record(root: pathlib.Path, act: Act, argument: str, date: str, words: str, words_at: str,
              instant: str | None = None) -> int:
    if instant is None:
        instant = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if (root / act.record).exists():
        print(f"FAILED: dedicated act already exists: {act.record.as_posix()}")
        return 1
    inp = live_inputs(root)
    try:
        record, block = expected(act, argument, date, words, inp, instant, words_at)
    except (ValueError, OSError) as exc:
        print(f"FAILED (nothing written): {exc}")
        return 1
    if inp.applied:
        print("FAILED: the policy on disk already carries this manifest's row")
        return 1
    aggregate = (root / AGGREGATE_REL).read_text()
    if aggregate_heading(act, date) in aggregate or BLOCK_BEGIN in aggregate:
        print("FAILED: aggregate record already carries this act's section")
        return 1
    (root / act.record).write_text(record)
    (root / AGGREGATE_REL).write_text(aggregate.rstrip() + "\n\n" + block)
    (root / POLICY_REL).write_bytes(inp.proposed)
    print(f"recorded at {instant}")
    print(f"wrote {act.record.as_posix()}\nappended one section to {AGGREGATE_REL.as_posix()}\n"
          f"applied variant s: {POLICY_REL.as_posix()} now hashes to the argument")
    return 0


def do_check(root: pathlib.Path, act: Act, argument: str, date: str, words: str, words_at: str | None = None,
             instant: str | None = None) -> int:
    on_disk = (root / act.record).read_text() if (root / act.record).is_file() else ""
    if instant is None:
        found = RECORDED_RE.findall(on_disk)
        if len(found) != 1:
            print(f"FAILED: {act.record.as_posix()} carries {len(found)} 'Recorded at (UTC)' lines, not 1")
            return 1
        instant = found[0]
    if words_at is None:
        found = WORDS_AT_RE.findall(on_disk)
        if len(found) != 1:
            print(f"FAILED: {act.record.as_posix()} carries {len(found)} 'Owner's words given at' lines, not 1")
            return 1
        words_at = found[0]
    inp = live_inputs(root)
    if not inp.applied:
        print("FAILED: the policy on disk is not the argued bytes; the act is not applied")
        return 1
    try:
        record, block = expected(act, argument, date, words, inp, instant, words_at)
    except (ValueError, OSError) as exc:
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
    print("recorded policy act matches the exact owner argument")
    return 0


DATE_OK = "2026-11-06"
WORDS_OK = "2026-11-06T14:04:40Z"
INSTANT_OK = "2026-11-06T15:00:05Z"
V6_INSTANT = "2026-11-05T09:43:08Z"
_rc, _raises = v6rec._rc, v6rec._raises


def selftest() -> int:
    """One mutant per predicate; each must be refused for the stated reason."""
    global FROZEN_FILE_DIGESTS, FROZEN_SUBJECT
    import contextlib
    import io
    import shutil
    import tempfile
    act = ACT
    base = b'{"policyVersion": "1.7.0-x.v6-p"}\n'
    proposed = b'{"policyVersion": "1.8.0-x.v6-p.v7-s"}\n'
    arg = digest(proposed)
    manifest = f"# header\n{arg}  {POLICY_REL.as_posix()}  [variant: s]\n".encode()
    msha = digest(manifest)
    pkt = (b"# Packet\n\n> Candidate - binds nothing.\n\nThe words, if you sign: **\"" + OWNER_WORDS[0].encode()
           + b"\"**.\n")
    findings = "".join(f"- E{n}, {g}: t\n" for n, g in EXPECTED_FINDINGS.items())
    review = (f"# R\nReviewed commit: {'a' * 40}\nManifest SHA-256: {msha}\nVerdict: CONFIRM WITH EXCEPTIONS\n\n"
              f"- Blocking findings: none, on my reading\n{findings}")
    exceptions = f"`{CONFIRMATION_REVIEW_REL.name}`\n(E1, E4, E5, E7)\n(E3, E6)\n(E2)\n"
    blobs = {MANIFEST_REL: manifest, PACKET_REL: pkt, BRIEF_REL: b"brief", DELTA_REL: b"delta", LEDGER_REL: b"ledger",
             BUILDER_REL: b"builder", PATCH_REL: b"patch", EXCEPTIONS_REL: exceptions.encode()}

    def make(**over) -> Inputs:
        values = dict(manifest=manifest, policy=base, proposed=proposed, packet=pkt, review=review,
                      exceptions=exceptions, stale=[], predecessor=digest(base), predecessor_date="2026-11-05",
                      predecessor_instant=V6_INSTANT, applied=False, frozen="f" * 40,
                      frozen_digest=lambda rel: digest(blobs[rel]) if rel in blobs else "", frozen_files=dict(blobs))
        values.update(over)
        return Inputs(**values)

    results: list[tuple[str, bool]] = []

    def accepted(inp, argument=arg) -> bool:
        try:
            validate(act, argument, inp)
            return True
        except ValueError as exc:
            print(f"  (unexpected refusal: {exc})")
            return False

    def refused(needle, inp, argument=arg) -> bool:
        try:
            validate(act, argument, inp)
        except ValueError as exc:
            return needle in str(exc)
        return False

    results.append(("exact argument validates", accepted(make())))
    results.append(("applied, validates against its own row", accepted(make(policy=proposed, applied=True))))
    results.append(("the shipped freeze is a full commit with exactly the reviewed files and the exceptions",
                    FROZEN_SUBJECT is not None and re.fullmatch(r"[0-9a-f]{40}", FROZEN_SUBJECT) is not None
                    and set(FROZEN_FILE_DIGESTS) == set(frozen_rels())
                    and all(SHA_RE.fullmatch(d) for d in FROZEN_FILE_DIGESTS.values())))
    for name, needle, inp, argument in (
        ("an applied policy not hashing to the argument", "hashes to", make(policy=proposed + b" ", applied=True), arg),
        ("unset FROZEN_SUBJECT", "FROZEN_SUBJECT is unset", make(frozen=None), arg),
        ("a non-hex argument", "not a 64-hex", make(), "xyz"),
        ("an argument that is not the row", "not the row", make(), "0" * 64),
        ("the version-6 argument", "not the row", make(), digest(base)),
        ("a manifest row for another subject", "row population",
         make(manifest=manifest.replace(POLICY_REL.name.encode(), b"other.json")), arg),
        ("a manifest with no row", "row population", make(manifest=b"# header\n"), arg),
        ("a manifest naming another variant", "row population",
         make(manifest=manifest.replace(b"[variant: s]", b"[variant: q]")), arg),
        ("a manifest with an extra row", "row population",
         make(manifest=manifest + f"{'1' * 64}  {POLICY_REL.as_posix()}  [variant: sx]\n".encode()), arg),
        ("a missing version-6 act", "version-6 act record", make(predecessor=""), arg),
        ("a version-6 act with no date", "version-6 act record", make(predecessor_date=""), arg),
        ("a version-6 act with no instant", "version-6 act record", make(predecessor_instant=""), arg),
        ("stale builder output", "builder reports", make(stale=["x"]), arg),
        ("a policy not at the version-6 act's argument", "version-6 act's argument", make(policy=base + b" "), arg),
        ("proposed bytes not hashing to the argument", "proposed bytes", make(proposed=proposed + b" "), arg),
        ("a frozen-file set with an extra file", "frozen-file set", make(frozen_files={**blobs, PKG / "X.md": b"x"}), arg),
        ("a packet carrying a digest", "64-hex token", make(packet=pkt + arg.encode()), arg),
        ("a packet not quoting the words", "does not quote", make(packet=pkt.replace(b"variant s", b"variant q")), arg),
        ("a review binding another manifest digest", "manifest file's SHA-256",
         make(review=review.replace(msha, "0" * 64)), arg),
        ("a review binding the row instead of the file", "manifest file's SHA-256",
         make(review=review.replace(msha, arg)), arg),
        ("verdict REVISE", "verdict", make(review=review.replace("CONFIRM WITH EXCEPTIONS", "REVISE")), arg),
        ("a verdict past the fourth head line", "verdict",
         make(review=review.replace("Verdict: CONFIRM", "Note: x\nVerdict: CONFIRM")), arg),
        ("a head with no reviewed commit", "reviewed commit",
         make(review=review.replace("Reviewed commit:", "Commit:")), arg),
        ("a raw with no no-blockers line", "Blocking findings",
         make(review=review.replace("- Blocking findings: none", "- Blocking findings: one")), arg),
        ("a blocking finding among the notes", "graded exceptions",
         make(review=review.replace("- E3, note:", "- E3, blocking:")), arg),
        ("a finding beyond the round's", "graded exceptions", make(review=review + "- E8, note: t\n"), arg),
        ("a repeated finding number", "repeats a finding", make(review=review + "- E3, blocking: t\n"), arg),
        ("a missing finding", "graded exceptions", make(review=review.replace("- E7, note: t\n", "")), arg),
        ("exceptions not naming the raw", "does not name the reviewed raw",
         make(exceptions=exceptions.replace(CONFIRMATION_REVIEW_REL.name, "other")), arg),
        ("exceptions omitting E6", "does not name findings [6]", make(exceptions=exceptions.replace("E6", "E66")), arg),
    ):
        results.append((f"{name} refused", refused(needle, inp, argument)))
    for rel in frozen_rels():
        results.append((f"a frozen-file set missing {rel.name} refused",
                        refused("frozen-file set", make(frozen_files={k: b for k, b in blobs.items() if k != rel}))))
        drift = {**blobs, rel: blobs[rel] + b"x"}
        results.append((f"frozen file lacking the presented {rel.name} refused",
                        refused("frozen subject does not carry",
                                make(frozen_digest=lambda r, drift=drift: digest(drift[r]) if r in drift else ""))))
    performed = pkt.replace(b"\n\n", b"\n\n> **PERFORMED 2026-11-06.** Recorded.\n\n", 1)
    results.append(("a PERFORMED head over the frozen packet accepted",
                    accepted(make(packet=performed, frozen_files={**blobs, PACKET_REL: performed}))))
    later = pkt + b"\n> **PERFORMED 2026-11-06.** Recorded.\n"
    results.append(("a PERFORMED note anywhere but the head refused",
                    refused("frozen subject does not carry", make(packet=later, frozen_files={**blobs, PACKET_REL: later}))))
    words = OWNER_WORDS[0]
    for name, w, needle in (("empty words", "", "one non-empty line"),
                            ("multi-line words", words + "\nyes", "one non-empty line"),
                            ("words carrying a digest", words + " " + "a" * 64, "64-hex"),
                            ("the version-6 words", "Sign screening scope version 6, variant p", "not the packet's"),
                            ("words with a trailing period", words + ".", "not the packet's"),
                            ("words in another case", words.lower(), "not the packet's"),
                            ("a decline", "Decline screening scope version 7", "not the packet's")):
        results.append((f"{name} refused", _raises(lambda w=w: validate_words(w), needle)))

    with tempfile.TemporaryDirectory() as d:
        root = pathlib.Path(d)
        build._fixture(root)
        base_text, _mode = build.base_bytes(root)
        real = build.propose(base_text).encode()
    real_arg = digest(real)
    real_manifest = f"# header\n{real_arg}  {POLICY_REL.as_posix()}  [variant: s]\n".encode()
    real_review = review.replace(msha, digest(real_manifest))
    real_blobs = {**blobs, MANIFEST_REL: real_manifest}
    real_inp = make(manifest=real_manifest, proposed=real, policy=base_text.encode(),
                    predecessor=digest(base_text.encode()), review=real_review, frozen_files=real_blobs,
                    frozen_digest=lambda rel: digest(real_blobs[rel]) if rel in real_blobs else "")
    results.append(("words at the version-6 act's instant refused",
                    _raises(lambda: expected(act, real_arg, "2026-11-05", words, real_inp, "2026-11-05T10:00:00Z",
                                             V6_INSTANT), "not after")))
    results.append(("a recording instant before the words refused",
                    _raises(lambda: expected(act, real_arg, DATE_OK, words, real_inp, "2026-11-06T08:00:00Z",
                                             WORDS_OK), "before the owner gave")))
    for name, bad in (("a date-only instant", "2026-11-06"), ("a local-offset instant", "2026-11-06T14:40:00+08:00"),
                      ("an instant on another date", "2026-11-07T00:00:00Z")):
        results.append((f"{name} refused", _raises(lambda bad=bad: expected(act, real_arg, DATE_OK, words, real_inp, bad,
                                                                            WORDS_OK), "instant must be")))
        results.append((f"{name} as the words instant refused",
                        _raises(lambda bad=bad: expected(act, real_arg, DATE_OK, words, real_inp, INSTANT_OK, bad),
                                "words-at must be")))
    results.append(("a bad date refused", _raises(lambda: expected(act, real_arg, "06/11", words, real_inp, INSTANT_OK,
                                                                   WORDS_OK), "date must be")))
    results.append(("bytes without the clause refused before rendering",
                    _raises(lambda: expected(act, arg, DATE_OK, words, make(), INSTANT_OK, WORDS_OK), "do not carry")))
    results.append(("version-6 bytes refused by the effect reader", _raises(lambda: effect_of(base_text.encode()), "do not")))
    record, block = expected(act, real_arg, DATE_OK, words, real_inp, INSTANT_OK, WORDS_OK)
    results.append(("record and block name the row and the tag",
                    real_arg in record and real_arg in block and tag_for(act, DATE_OK) in record))
    results.append(("the tag name is the version-7 form",
                    tag_for(act, DATE_OK) == "pwb-approve-policy-public-source-scope-v7-signed-2026-11-06"))
    results.append(("record carries the phrase once", record.count(phrase_for(act, real_arg)) == 1))
    results.append(("record quotes the words once", record.count(f"> {words}\n") == 1))
    results.append(("record and block carry both instants",
                    record.count(f"Owner's words given at (UTC): {WORDS_OK}") == 1
                    and record.count(f"Recorded at (UTC): {INSTANT_OK}") == 1
                    and block.count(f"`{WORDS_OK}`") == 1 and block.count(f"`{INSTANT_OK}`") == 1))
    results.append(("the ceremony says who ran the recorder and cites the direction",
                    "a Claude Code session ran this\nrecorder" in record and f"`{DIRECTION_NAME}` records" in record
                    and "[Inferred] That the operator of the form" in record))
    results.append(("the record says it adds no script", "It adds no script" in record))
    results.append(("the supersession line has the read gate's form",
                    re.search(r"^Supersession / revocation: this act supersedes, for the `approve-policy` role only, "
                              r"the \d{4}-\d{2}-\d{2} act recorded at `" + re.escape(V6_ACT_REL.as_posix()) + r"`\.",
                              record, re.MULTILINE) is not None))
    results.append(("no line opens with 'recorded at' but the one field",
                    len(re.findall(r"^\s*recorded at\b", record, re.I | re.M)) == 1))
    results.append(("the record carries none of the other families' sweep needles",
                    not any(n in record.lower() for n in ("public-egress-", "public-repo-admission", "public-obs-",
                                                          "rfc5-project-documentation", "dossier-local-agent"))))
    results.append(("the record carries exactly the row, the version-6 argument and the manifest digest",
                    set(HEX64_RE.findall(record)) == {real_arg, digest(base_text.encode()), digest(real_manifest)}))
    results.append(("the aggregate block is bracketed", block.count(BLOCK_BEGIN) == 1 and block.count(BLOCK_END) == 1))

    saved = (FROZEN_FILE_DIGESTS, FROZEN_SUBJECT)
    try:
        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d)
            build._fixture(root)
            (root / BUILDER_REL).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(ROOT / BUILDER_REL, root / BUILDER_REL)
            (root / POLICY_REL).write_text(base_text)
            (root / DECISIONS).mkdir(parents=True, exist_ok=True)
            (root / V6_ACT_REL).write_text(f"# v6\n\nDate: 2026-11-05\n\nRecorded at (UTC): {V6_INSTANT}\n\n"
                                           f"Exact digest (SHA-256): `{digest(base_text.encode())}`\n")
            (root / AGGREGATE_REL).write_text("# Acceptance record\n")
            (root / EXCEPTIONS_REL).parent.mkdir(parents=True, exist_ok=True)
            (root / EXCEPTIONS_REL).write_text(exceptions)
            mf = (root / MANIFEST_REL).read_bytes()
            raw = root / CONFIRMATION_REVIEW_REL
            raw.parent.mkdir(parents=True, exist_ok=True)
            raw.write_text(review.replace(msha, digest(mf)))
            FROZEN_FILE_DIGESTS = {rel: digest((root / rel).read_bytes()) for rel in frozen_rels()}
            FROZEN_SUBJECT = "a" * 40
            row = ROW_RE.findall(mf.decode())[0][0]
            with contextlib.redirect_stdout(io.StringIO()):
                before = do_check(root, act, row, DATE_OK, words, WORDS_OK, INSTANT_OK)
                early = do_record(root, act, row, "2026-11-05", words, "2026-11-05T00:00:00Z", "2026-11-05T00:00:01Z")
                wrote = do_record(root, act, row, DATE_OK, words, WORDS_OK, INSTANT_OK)
                checked = do_check(root, act, row, DATE_OK, words)
                builder_after = build.check(root)
                again = do_record(root, act, row, DATE_OK, words, WORDS_OK, INSTANT_OK)
                agg = (root / AGGREGATE_REL).read_text()
                (root / AGGREGATE_REL).write_text(agg * 2)
                doubled = do_check(root, act, row, DATE_OK, words)
                (root / AGGREGATE_REL).write_text(agg)
                rec = (root / act.record).read_text()
                (root / act.record).write_text(rec.replace(INSTANT_OK, "2026-11-06T15:01:00Z"))
                tampered = do_check(root, act, row, DATE_OK, words)
                (root / act.record).write_text(rec.replace(f"given at (UTC): {WORDS_OK}", "given at (UTC): 2026-11-06T14:00:00Z"))
                words_tampered = do_check(root, act, row, DATE_OK, words)
                (root / act.record).write_text(rec)
                applied_now = (root / POLICY_REL).read_bytes()
                (root / POLICY_REL).write_text(base_text)
                unapplied = do_check(root, act, row, DATE_OK, words)
                (root / act.record).unlink()
                (root / AGGREGATE_REL).write_text(agg)
                agg_layer = do_record(root, act, row, DATE_OK, words, WORDS_OK, INSTANT_OK)
                agg_kept = not (root / act.record).exists() and (root / POLICY_REL).read_text() == base_text
                (root / AGGREGATE_REL).write_text("# Acceptance record\n")
                (root / POLICY_REL).write_bytes(applied_now)
                applied_layer = do_record(root, act, row, DATE_OK, words, WORDS_OK, INSTANT_OK)
                applied_kept = not (root / act.record).exists()
            results.append(("check before the act is recorded fails", before == 1))
            results.append(("a record before the version-6 instant writes nothing", early == 1 and wrote == 0))
            results.append(("record then check applies the row and passes",
                            wrote == 0 and checked == 0 and again == 1
                            and digest(applied_now) == row and not (root / ".git").exists()))
            results.append(("after the act the builder still verifies the package", builder_after == []))
            results.append(("check counting two copies of the block fails", doubled == 1))
            results.append(("an altered recording instant fails the check", tampered == 1))
            results.append(("an altered words instant fails the check", words_tampered == 1))
            results.append(("check over a policy reverted to version 6 fails", unapplied == 1))
            results.append(("an aggregate section alone refuses a record and writes nothing", agg_layer == 1 and agg_kept))
            results.append(("an applied policy alone refuses a record and writes nothing", applied_layer == 1 and applied_kept))
    finally:
        FROZEN_FILE_DIGESTS, FROZEN_SUBJECT = saved
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
    mode.add_argument("--freeze-table", nargs="?", const="", metavar="COMMIT")
    mode.add_argument("--selftest", action="store_true")
    ap.add_argument("--date")
    ap.add_argument("--words-at")
    ap.add_argument("--instant")
    ap.add_argument("--owner-words")
    args = ap.parse_args(argv[1:])
    if args.selftest:
        return selftest()
    if args.freeze_table is not None:
        print(frozen_table(v6rec.at_commit_reader(args.freeze_table) if args.freeze_table else None))
        return 0
    argument = args.record or args.check
    if not (args.date and args.owner_words):
        print("--date and --owner-words are required", file=sys.stderr)
        return 2
    if args.record:
        if not args.words_at:
            print("--words-at is required with --record", file=sys.stderr)
            return 2
        return do_record(ROOT, ACT, argument, args.date, args.owner_words, args.words_at, args.instant)
    return do_check(ROOT, ACT, argument, args.date, args.owner_words, args.words_at, args.instant)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
