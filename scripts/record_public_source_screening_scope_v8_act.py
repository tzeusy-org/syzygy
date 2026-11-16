#!/usr/bin/env python3
"""Record or verify the owner's public-source screening-scope version-8 policy act (private sources).

Package `contracts/candidates/public-source-screening-scope-v8/` (`syzygy-pdja.23`, recorded under `syzygy-pdja.21`). One
state-(1) `approve-policy` owner act over the proposed secret-classification policy, whose argument is the ONE row of the
package manifest (variant `pv`). The owner selected the words "Sign screening scope version 8, variant pv" on 2026-11-08,
as the plain record OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08 states; that record held the selection until the code
that reads the policy lands, and OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09 directs that this recorder
records it in that same change. No digest is typed. It supersedes, for the `approve-policy` role only, the version-7 act.
This script performs nothing by itself.

Modelled on `record_public_source_screening_scope_v7_act.py` (and v6's shared readers). The differences:

- the owner's words are read from the selection record, never typed here: `--owner-words` must equal its one quoted
  option, and the record's `Date:` is the day they were given (the record states no time, so the act states the day);
- the act's own `Date:` is its recording day, which may follow the selection day; the recording instant falls on it;
- the selection's two refusal conditions are predicates: the package bytes must be those the round-6 review read
  (`FROZEN_FILE_DIGESTS`, every file of the package at the reviewed commit, and the builder), and launch-consent
  specification version 1.1 must be signed (`record_versioned_signoff.py --check polaris-dossier-launch-consent
  --version 1.1` must pass);
- the clearing raw, round 6, carries its exceptions as notes `- **A<n> [...]` under `## Notes (none requires a change)`,
  and its offer-condition sentence says every exception is a note; there is no carried-exceptions file;
- the effect paragraph reads `sourceVisibility` and the version-8 `policyVersion` from the bytes.

FROZEN: `FROZEN_FILE_DIGESTS` was filled by `--freeze-table <commit>` at the reviewed commit, never by hand. Binding is by
the manifest file's digest in the raw's head (its first four non-blank lines: title, `Reviewed commit:`, `Manifest
SHA-256: <SHA-256 of the manifest FILE>`, `Verdict:`); the commit is provenance only. The act's argument is the manifest
ROW, never the manifest file's digest.

ORDER. The version-7 act must be recorded, the policy on disk must be exactly its argument, the selection day must not be
before the version-7 act's day and the recording instant must fall after the version-7 record's.

`--record ARGUMENT --date D --owner-words S [--instant I]` validates everything before writing, then writes the dedicated
record, appends one `ACCEPTANCE-ACT-RECORD.md` section and applies the bytes. It does NOT re-point the read gates: that
is the install, which lands in the same change. `--check` re-derives the record and the block, requires the policy to
hash to the argument and counts exactly one copy of the block. `--freeze-table [COMMIT]` prints the table for the files
as they are (or at COMMIT). `--selftest` mutates each predicate and requires it to fail closed.
"""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import subprocess
import sys
from dataclasses import dataclass
from typing import Callable

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_source_screening_scope_v8 as build  # noqa: E402
import record_public_source_screening_scope_v6_act as v6rec  # noqa: E402
import record_public_source_screening_scope_v7_act as v7rec  # noqa: E402

DECISIONS = v6rec.DECISIONS
AGGREGATE_REL = v6rec.AGGREGATE_REL
PKG = build.PKG
MANIFEST_REL = build.MANIFEST
POLICY_REL = build.POLICY
PATCH_REL = build.patch_path("pv")
PACKET_REL = PKG / "OWNER-DECISION-PACKET.md"
BUILDER_REL = pathlib.Path("scripts/build_public_source_screening_scope_v8.py")
V7_ACT_REL = v7rec.ACT.record
SELECTION_REL = DECISIONS / "OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08.md"
DIRECTION_NAME = "OWNER-DIRECTION-LAUNCH-CONSENT-IMPLEMENTATION-2026-11-09.md"
CONFIRMATION_REVIEW_REL = pathlib.Path("docs/reviews/R-SCREENING-SCOPE-V8-6-RAW.md")
SPEC_SIGNOFF = ("polaris-dossier-launch-consent", "1.1")
#: The commit the confirming review read (provenance).
FROZEN_SUBJECT: str | None = "f5bfaed7d7f232f040fcabcf95dc99ba33cc0d8d"
#: The manifest file's digest the round-6 raw's head names.
REVIEWED_MANIFEST_SHA = "3da4502006c942524287b4a6831a65aac2a8df0f8ce59edb0b753a44cdc94a00"
FROZEN_FILE_DIGESTS: dict[pathlib.Path, str] = {
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/IMPACT-LEDGER.md"): "7890e7e2b231ede4151c2630bdfb9b51ac9c80e49c4a612cb2c450085f9fe9bf",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/OWNER-DECISION-PACKET.md"): "df4e39a6cca5f4f4263a78c40b69c25282ae728bb891257fed3457e2e2c353c2",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt"): "3da4502006c942524287b4a6831a65aac2a8df0f8ce59edb0b753a44cdc94a00",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/REVIEW-BRIEF.md"): "0f7852e96aced5e5f8e2a6efacf54d5b5e7f093f8b566cc44cf48cc0780a67a7",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/ROUND-1-DISPOSITIONS.md"): "3c989360daac59251e554d75c691ca1d123dbbbac25a986c120015ded433c329",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/ROUND-2-DISPOSITIONS.md"): "8021c5c59a06e2b7174b2b5eabe1597e172389d3beccacacee861b06620e4ea0",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/ROUND-3-DISPOSITIONS.md"): "90e6594c7b476c3f6cdf5cc809fcaaf7ce4a1cc0ffb0251b1a29c37e95696d42",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/ROUND-4-DISPOSITIONS.md"): "c52f549cd62b12505ddd738e8d55b55f1c7ed439d85b0098a2116f82668fbe1e",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/ROUND-5-DISPOSITIONS.md"): "f0a570ce2a8c3530d436668056e862cbb82212664f5b2a8f3a22b1c368f0f078",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/SEMANTIC-DELTA.md"): "875f8525527f53bcf775a2df4c9f2b18844c0d334d2169ab40428d438d801524",
    pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch"): "7287f9590e0ed96a4b8daef47972f5268b27622f4fdff4b945440652cb2a15c3",
    pathlib.Path("scripts/build_public_source_screening_scope_v8.py"): "73ffed4968bccfd63f2ef854e56317e40ba2cba67aa8357f1f28aa13cbb0fc00",
}
#: The offer condition the clearing raw must state, as written.
NOTES_ONLY = "Every exception below is a **note**. None requires a"
NOTES_HEADING = "## Notes (none requires a change)"
FINDING_RE = re.compile(r"^- \*\*([A-Z])(\d+) \[", re.MULTILINE)
EXPECTED_FINDINGS = {("A", n) for n in range(1, 5)}
SELECTION_QUOTE_RE = re.compile(r"^The owner picked the option labelled exactly:\n\n> ([^\n]+)\n", re.MULTILINE)
VERDICTS = v6rec.VERDICTS
DATE_RE = v6rec.DATE_RE
INSTANT_RE = v6rec.INSTANT_RE
RECORDED_RE = v6rec.RECORDED_RE
SHA_RE = v6rec.SHA_RE
HEX64_RE = v6rec.HEX64_RE
ROW_RE = v6rec.ROW_RE
EXACT_DIGEST_RE = v6rec.EXACT_DIGEST_RE
REVIEWED_COMMIT_RE = v6rec.REVIEWED_COMMIT_RE
VERDICT_RE = v6rec.VERDICT_RE
PERFORMED_HEAD_RE = v6rec.PERFORMED_HEAD_RE
WORDS_ON_RE = re.compile(r"^Owner's words given on \(UTC date\): (\d{4}-\d{2}-\d{2})$", re.MULTILINE)
digest = v6rec.digest
Act = v6rec.Act

ACT = Act("policy-v8", v6rec.ACT.label, "approve-policy",
          "PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V8-APPROVAL",
          DECISIONS / "PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V8-ACT.md",
          "Polaris Butlers secret-classification policy approval (public-source screening scope, version 8)")


def phrase_for(act: Act, argument: str) -> str:
    return f"{act.label}: {argument}"


def tag_for(act: Act, date: str) -> str:
    return f"pwb-{act.act_type}-public-source-scope-v8-signed-{date}"


def identity_for(act: Act, date: str) -> str:
    return f"{act.identity_stem}-{date}"


def frozen_rels(listing: Callable[[], list[pathlib.Path]] | None = None) -> list[pathlib.Path]:
    """Every file of the package the review read, and the builder. Taken from the table once frozen, so a file added to
    the package later is outside the reviewed set and refuses (`frozen-file set`)."""
    if FROZEN_FILE_DIGESTS and listing is None:
        return sorted(FROZEN_FILE_DIGESTS)
    files = listing() if listing is not None else [p.relative_to(ROOT) for p in (ROOT / PKG).rglob("*") if p.is_file()]
    return sorted({*files, BUILDER_REL})


def frozen_table(read: Callable[[pathlib.Path], bytes] | None = None, commit: str | None = None) -> str:
    def listing() -> list[pathlib.Path]:
        if commit is None:
            return [p.relative_to(ROOT) for p in (ROOT / PKG).rglob("*") if p.is_file()]
        out = subprocess.run(["git", "ls-tree", "-r", "-z", "--name-only", commit, "--", PKG.as_posix()], cwd=ROOT,
                             capture_output=True, check=True).stdout.decode()
        return [pathlib.Path(name) for name in out.split("\0") if name]
    read = read or (lambda rel: (ROOT / rel).read_bytes())
    lines = []
    for rel in frozen_rels(listing):
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
    selection: str
    spec_signed: bool
    stale: list[str]
    predecessor: str
    predecessor_date: str
    predecessor_instant: str
    applied: bool
    frozen: str | None
    frozen_digest: Callable[[pathlib.Path], str]
    frozen_files: dict[pathlib.Path, bytes]


def spec_signoff_passes(root: pathlib.Path) -> bool:
    """Launch-consent specification version 1.1 is signed: its versioned sign-off recorder's --check passes."""
    proc = subprocess.run([sys.executable, str(root / "scripts" / "record_versioned_signoff.py"), "--check", SPEC_SIGNOFF[0],
                           "--version", SPEC_SIGNOFF[1]], cwd=root, capture_output=True, text=True)
    return proc.returncode == 0


def live_inputs(root: pathlib.Path, spec_check: Callable[[pathlib.Path], bool] = spec_signoff_passes) -> Inputs:
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
    pred = read(V7_ACT_REL).decode()
    m = EXACT_DIGEST_RE.findall(pred)
    d = re.findall(r"^Date: (\d{4}-\d{2}-\d{2})$", pred, re.MULTILINE)
    i = RECORDED_RE.findall(pred)
    package = [p.relative_to(root) for p in (root / PKG).rglob("*") if p.is_file()]
    present = {*package, BUILDER_REL}
    return Inputs(manifest=manifest, policy=policy, proposed=proposed, packet=read(PACKET_REL),
                  review=read(CONFIRMATION_REVIEW_REL).decode(), selection=read(SELECTION_REL).decode(),
                  spec_signed=spec_check(root), stale=stale,
                  predecessor=m[0] if len(m) == 1 else "", predecessor_date=d[0] if len(d) == 1 else "",
                  predecessor_instant=i[0] if len(i) == 1 else "", applied=applied, frozen=FROZEN_SUBJECT,
                  frozen_digest=lambda rel: FROZEN_FILE_DIGESTS.get(rel, ""),
                  frozen_files={rel: (root / rel).read_bytes() for rel in present if (root / rel).is_file()})


def selection_of(selection: str) -> tuple[str, str]:
    """The selection record's one quoted option and its day, or raise."""
    quotes = SELECTION_QUOTE_RE.findall(selection)
    days = re.findall(r"^Date: (\d{4}-\d{2}-\d{2})$", selection, re.MULTILINE)
    if len(quotes) != 1 or len(days) != 1:
        raise ValueError("the selection record does not carry exactly one quoted option and one Date line")
    if "Decision ID: `OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08`" not in selection:
        raise ValueError("the selection record is not OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08")
    return quotes[0], days[0]


def carried_findings(review: str) -> set[tuple[str, int]]:
    """The round's notes by letter and number, read under the notes heading only. A repeat is refused."""
    if review.count(NOTES_HEADING) != 1:
        raise ValueError(f"review does not carry exactly one {NOTES_HEADING!r} section")
    section = review.split(NOTES_HEADING, 1)[1]
    found = [(letter, int(n)) for letter, n in FINDING_RE.findall(section)]
    if len(found) != len(set(found)):
        raise ValueError(f"review repeats a finding: {sorted(found)}")
    return set(found)


def validate(act: Act, argument: str, inp: Inputs) -> tuple[str, str, str]:
    """Return (manifest file sha, reviewed commit, verdict) or raise ValueError."""
    if inp.frozen is None or not FROZEN_FILE_DIGESTS:
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
    if not inp.spec_signed:
        raise ValueError("launch-consent specification version 1.1 is not signed (its versioned sign-off --check fails); "
                         "the selection is held until it is")
    if (not SHA_RE.fullmatch(inp.predecessor) or not DATE_RE.fullmatch(inp.predecessor_date)
            or not INSTANT_RE.fullmatch(inp.predecessor_instant)):
        raise ValueError("the version-7 act record is absent or does not name exactly one digest, date and instant")
    if inp.applied:
        if digest(inp.policy) != argument:
            raise ValueError(f"policy hashes to {digest(inp.policy)}, not the owner argument")
    else:
        if digest(inp.policy) != inp.predecessor:
            raise ValueError("the policy on disk is not the version-7 act's argument; the patch cannot be applied "
                             "to anything else")
        if digest(inp.proposed) != argument:
            raise ValueError("owner argument does not match the digest of the proposed bytes")
    if set(inp.frozen_files) != set(FROZEN_FILE_DIGESTS):
        raise ValueError("frozen-file set is not exactly the files the round-6 review read")
    for rel, current in inp.frozen_files.items():
        expected_bytes = current if rel != PACKET_REL else PERFORMED_HEAD_RE.sub(rb"\1", current, count=1)
        if digest(expected_bytes) != inp.frozen_digest(rel):
            raise ValueError(f"frozen subject does not carry the reviewed bytes of {rel.as_posix()}; the package "
                             "differs from what the round-6 review read, so the selection does not carry over")
    packet = inp.packet.decode()
    if HEX64_RE.search(packet):
        raise ValueError("owner packet carries a 64-hex token; the argument comes only from the manifest row")
    words, _day = selection_of(inp.selection)
    if f'**"{words}"**' not in packet:
        raise ValueError("owner packet does not quote the selected words; they were not offered")
    manifest_sha = digest(inp.manifest)
    if manifest_sha != REVIEWED_MANIFEST_SHA:
        raise ValueError("the manifest file is not the one the round-6 review bound")
    head = [line for line in inp.review.splitlines() if line.strip()][:4]
    if f"Manifest SHA-256: {manifest_sha}" not in head:
        raise ValueError("confirmation review head does not bind the manifest file's SHA-256")
    verdicts = [m.group(1) for line in head if (m := VERDICT_RE.match(line))]
    if len(verdicts) != 1 or verdicts[0] not in VERDICTS:
        raise ValueError("confirmation review head does not carry the verdict CONFIRM or CONFIRM WITH EXCEPTIONS")
    reviewed = REVIEWED_COMMIT_RE.search("\n".join(head))
    if not reviewed:
        raise ValueError("confirmation review head does not name its reviewed commit")
    if verdicts[0] != "CONFIRM" and NOTES_ONLY not in inp.review.replace("\n", " ").replace("  ", " "):
        raise ValueError(f"review does not state {NOTES_ONLY!r}; only a round whose exceptions are all notes clears the bytes")
    findings = carried_findings(inp.review)
    if findings != EXPECTED_FINDINGS:
        raise ValueError(f"review notes {sorted(findings)} are not the round's notes {sorted(EXPECTED_FINDINGS)}; a "
                         "finding of any other grade or number clears nothing")
    return manifest_sha, reviewed.group(1), verdicts[0]


def validate_words(words: str, selection: str) -> str:
    """The words must be the selection record's one quoted option, exactly; returns the day it was given."""
    if not words.strip() or "\n" in words or "\r" in words:
        raise ValueError("owner words must be one non-empty line")
    if HEX64_RE.search(words):
        raise ValueError("owner words carry a 64-hex digest")
    quoted, day = selection_of(selection)
    if words != quoted:
        raise ValueError(f"the owner words {words!r} are not the selection record's quoted option {quoted!r}")
    return day


def version_of(policy: bytes) -> str:
    return v6rec.version_of(policy)


def effect_of(policy: bytes) -> str:
    """The effect paragraph, from the approved bytes' own values, never from prose held here."""
    try:
        doc = json.loads(policy)
        visibility = doc[build.SCOPE_KEY][build.NEW_KEY]
        if visibility["admitted"] != ["public", "private"]:
            raise ValueError("the bytes' sourceVisibility does not admit public and private")
        if not str(doc["policyVersion"]).endswith(".v8-pv"):
            raise ValueError("the bytes' policyVersion is not a version-8 one")
    except (ValueError, KeyError, TypeError) as exc:
        raise ValueError(f"the approved bytes do not carry the version-8 values the record names: {exc!r}") from exc
    return ("It is the version-7 policy with one key added inside `publicSourceScope`, `sourceVisibility`, and eight texts "
            "edited. A repository is private unless every effective observation consent record of its pair states public "
            "through its carrier, and a private repository is admitted under the same observation consent as a public one, "
            "under stricter rules: no fetch and no credential, a detector-matched body excluded whole in every class, an "
            "egress consent that names the pair as private, and no object id or size of an excluded or withheld blob outside "
            "the run directory's check records and review packets. A consent record whose kind or pair cannot be read "
            "refuses every read. No rule for a public repository is relaxed; `policyVersion` is the only other value that "
            "changes.")


def render_act(act: Act, argument: str, date: str, manifest_sha: str, reviewed: str, verdict: str, words: str,
               words_on: str, frozen: str, instant: str, superseded: str, superseded_date: str, version: str,
               effect: str) -> str:
    return f"""# Owner act — {act.title}

Date: {date}

Owner's words given on (UTC date): {words_on}

Recorded at (UTC): {instant}

Owner: Tzeusy

Act identity: `{identity_for(act, date)}`

Act type: `{act.act_type}`

Project identity: `project:syzygy`

Artifact identity: `{POLICY_REL.as_posix()}`

Exact digest (SHA-256): `{argument}`

Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),
explicitly given by the owner's words recorded below

Supersession / revocation: this act supersedes, for the `{act.act_type}` role only, the {superseded_date} act recorded at `{V7_ACT_REL.as_posix()}`. That is the version-7 screening-scope act. Its argument
`{superseded}` was the policy's exact digest until this act's patch was
applied. That record, its digest, its tag and the bytes it bound remain
immutable history. This act is revoked only by a later exact owner act naming
it.

A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**

## Ceremony

How the owner came to the choice:

- The package's packet `{PACKET_REL.as_posix()}` offers one question with one
  variant and decline, and quotes the words. By design it carries no digest.
- A Claude Code session offered the package to the owner as a structured
  question after the round-6 review. The owner selected the option whose text
  is the words below, on the day above. The plain record
  `{SELECTION_REL.as_posix()}` states that selection and held it until the
  code that reads the policy lands. The plain owner direction
  `{DIRECTION_NAME}` directs that it be recorded with that code.
- Before recording, the recorder confirmed that launch-consent specification
  version 1.1 is signed, the selection's second condition.

The act takes this phrase, whose argument is the manifest's one row:

```text
{phrase_for(act, argument)}
```

The owner did not type the phrase. The owner selected these words, as the
selection record quotes them, and a Claude Code session ran this recorder with
them as `--owner-words`. [Inferred] That the person answering is the owner.

> {words}

The words name variant `pv`, and the variant names the manifest row.

Chosen variant: `pv`; its manifest row's digest is the exact digest above.

The argument was read from that row of `{MANIFEST_REL.as_posix()}`, re-derived
from the builder's proposed bytes at recording, and, after the patch was
applied in the same change, matched the policy on disk. A swapped argument
would have been refused: the recorder rejects an argument that is not the row.

Frozen provenance:

- frozen subject (package bytes): `{frozen}`, every file of the package and
  its builder, each matched by digest at recording;
- the manifest file hashes to `{manifest_sha}` (a container digest, no act's
  argument);
- confirmation review: `{CONFIRMATION_REVIEW_REL.as_posix()}`, verdict
  `{verdict}`, its head bound to the manifest file's SHA-256 above; its four
  exceptions are notes; the raw names reviewed commit `{reviewed}` [Observed —
  the raw's own line; binding is by digest]; and
- recording tag: `{tag_for(act, date)}`, on the commit carrying this act record.

## Effect

The policy `polaris-butlers-project-shape-secrets`, policy-owning project
`project:syzygy`, is approved at version `{version}` as the observing project's
secret-classification policy. {effect}

## What this act does not authorize

This act is the policy authority the public-source scope needs and satisfies
only its own. It admits no repository. It grants no observation consent, no
read, no egress and no provider call: each takes its own act
(REQ-polaris-generation-025). The read gates refuse a policy on its digest
first, so they keep refusing this one until the install change re-points them
once, against these bytes; the recorder does not do that. It sets no retention
rule. It grants no write, execution, deployment, release, recovery, mission,
autonomous or multi-user authority, widens no consent, edits no performed
record, accepts no candidate contract and amends no doctrine or specification.
It proves no read, screening, parse, render or answer result.
"""


BLOCK_BEGIN = "<!-- PWB-POLICY-SCOPE-V8:BEGIN -->"
BLOCK_END = "<!-- PWB-POLICY-SCOPE-V8:END -->"


def aggregate_heading(act: Act, date: str) -> str:
    return f"## Public-source screening scope version 8 act — {act.act_type} — performed {date}"


def render_aggregate_block(act: Act, argument: str, date: str, manifest_sha: str, verdict: str, frozen: str,
                           instant: str, words_on: str) -> str:
    return f"""{BLOCK_BEGIN}
{aggregate_heading(act, date)}

**Phrase the act takes (given by the owner's selected words, not typed as a
phrase; see the dedicated record):**

```text
{phrase_for(act, argument)}
```

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Act type / artifact | `{act.act_type}` / `{POLICY_REL.as_posix()}` |
| Argument | SHA-256 of the artifact itself: the one row (variant `pv`) of the package manifest, recomputed at recording |
| Provenance state | `owner-adopted (bootstrap, uncorrelated)` — a state-(1) human act, owner-trusted and never independently verified |
| A1 audit-record identity | explicitly absent, satisfying RFC3-16(b) item 9 for state (1) |
| Frozen subject | `{frozen}` |
| Manifest | `{MANIFEST_REL.as_posix()}`, SHA-256 `{manifest_sha}` |
| Review outcome | `{CONFIRMATION_REVIEW_REL.as_posix()}`: `{verdict}`, its head bound to the manifest file |
| Owner's words given (UTC date) | `{words_on}` |
| Recorded at (UTC) | `{instant}` |
| Recording | `{act.record.as_posix()}`; annotated tag `{tag_for(act, date)}` on the commit carrying these records |

Effective status: this one record is **effective owner authority —
owner-adopted (bootstrap, uncorrelated)** for its own role only. It grants no
consent, read or egress.
{BLOCK_END}
"""


def expected(act: Act, argument: str, date: str, words: str, inp: Inputs, instant: str):
    words_on = validate_words(words, inp.selection)
    if not DATE_RE.fullmatch(date):
        raise ValueError("date must be YYYY-MM-DD")
    if not INSTANT_RE.fullmatch(instant) or not instant.startswith(date + "T"):
        raise ValueError("instant must be YYYY-MM-DDTHH:MM:SSZ (UTC) on the act's date")
    manifest_sha, reviewed, verdict = validate(act, argument, inp)
    if words_on < inp.predecessor_date:
        raise ValueError(f"the words were given on {words_on}, before the version-7 act's day {inp.predecessor_date}")
    if date < words_on:
        raise ValueError(f"the act's date {date} is before the day the owner gave the words, {words_on}")
    if instant <= inp.predecessor_instant:
        raise ValueError(f"instant {instant} is not after the version-7 act's {inp.predecessor_instant}")
    bytes_ = inp.proposed if not inp.applied else inp.policy
    return (render_act(act, argument, date, manifest_sha, reviewed, verdict, words, words_on, inp.frozen or "",
                       instant, inp.predecessor, inp.predecessor_date, version_of(bytes_), effect_of(bytes_)),
            render_aggregate_block(act, argument, date, manifest_sha, verdict, inp.frozen or "", instant, words_on))


def do_record(root: pathlib.Path, act: Act, argument: str, date: str, words: str, instant: str | None = None,
              inputs: Callable[[pathlib.Path], Inputs] = live_inputs) -> int:
    if instant is None:
        instant = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if (root / act.record).exists():
        print(f"FAILED: dedicated act already exists: {act.record.as_posix()}")
        return 1
    inp = inputs(root)
    try:
        record, block = expected(act, argument, date, words, inp, instant)
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
          f"applied variant pv: {POLICY_REL.as_posix()} now hashes to the argument")
    return 0


def do_check(root: pathlib.Path, act: Act, argument: str, date: str, words: str, instant: str | None = None,
             inputs: Callable[[pathlib.Path], Inputs] = live_inputs) -> int:
    on_disk = (root / act.record).read_text() if (root / act.record).is_file() else ""
    if instant is None:
        found = RECORDED_RE.findall(on_disk)
        if len(found) != 1:
            print(f"FAILED: {act.record.as_posix()} carries {len(found)} 'Recorded at (UTC)' lines, not 1")
            return 1
        instant = found[0]
    inp = inputs(root)
    if not inp.applied:
        print("FAILED: the policy on disk is not the argued bytes; the act is not applied")
        return 1
    try:
        record, block = expected(act, argument, date, words, inp, instant)
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


DATE_OK = "2026-11-09"
INSTANT_OK = "2026-11-09T15:00:05Z"
V7_DATE = "2026-11-06"
V7_INSTANT = "2026-11-06T15:00:05Z"
_rc, _raises = v6rec._rc, v6rec._raises


def selftest() -> int:
    """One mutant per predicate; each must be refused for the stated reason."""
    global FROZEN_FILE_DIGESTS, FROZEN_SUBJECT, REVIEWED_MANIFEST_SHA
    import contextlib
    import io
    import shutil
    import tempfile
    act = ACT
    words = "Sign screening scope version 8, variant pv"
    base = b'{"policyVersion": "1.8.0-x.v7-s"}\n'
    proposed = b'{"policyVersion": "1.9.0-x.v7-s.v8-pv"}\n'
    arg = digest(proposed)
    manifest = f"# header\n{arg}  {POLICY_REL.as_posix()}  [variant: pv]\n".encode()
    msha = digest(manifest)
    pkt = (b"# Packet\n\n> Candidate - binds nothing.\n\nThe words, if you sign: **\"" + words.encode() + b"\"**.\n")
    notes = "".join(f"- **A{n} [Inferred] t.** body\n" for n in range(1, 5))
    review = (f"# R\nReviewed commit: {'a' * 40}\nManifest SHA-256: {msha}\nVerdict: CONFIRM WITH EXCEPTIONS\n\n"
              f"**Offer condition.** Every exception below is a **note**. None requires a\nchange.\n\n"
              f"{NOTES_HEADING}\n\n{notes}")
    selection = ("# Owner selection\n\nDate: 2026-11-08\n\nDecision ID: `OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08`\n\n"
                 f"The owner picked the option labelled exactly:\n\n> {words}\n\nMore.\n")
    blobs = {MANIFEST_REL: manifest, PACKET_REL: pkt, PKG / "REVIEW-BRIEF.md": b"brief", PKG / "SEMANTIC-DELTA.md": b"delta",
             BUILDER_REL: b"builder", PATCH_REL: b"patch"}
    saved = (FROZEN_FILE_DIGESTS, FROZEN_SUBJECT, REVIEWED_MANIFEST_SHA)
    results: list[tuple[str, bool]] = []
    shipped = dict(FROZEN_FILE_DIGESTS), FROZEN_SUBJECT, REVIEWED_MANIFEST_SHA
    try:
        FROZEN_FILE_DIGESTS = {rel: digest(b) for rel, b in blobs.items()}
        REVIEWED_MANIFEST_SHA = msha

        def make(**over) -> Inputs:
            values = dict(manifest=manifest, policy=base, proposed=proposed, packet=pkt, review=review, selection=selection,
                          spec_signed=True, stale=[], predecessor=digest(base), predecessor_date=V7_DATE,
                          predecessor_instant=V7_INSTANT, applied=False, frozen="f" * 40,
                          frozen_digest=lambda rel: digest(blobs[rel]) if rel in blobs else "", frozen_files=dict(blobs))
            values.update(over)
            return Inputs(**values)

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
        results.append(("the shipped freeze is the reviewed commit, the round-6 manifest digest and every package file",
                        shipped[1] == "f5bfaed7d7f232f040fcabcf95dc99ba33cc0d8d"
                        and shipped[2] == "3da4502006c942524287b4a6831a65aac2a8df0f8ce59edb0b753a44cdc94a00"
                        and BUILDER_REL in shipped[0] and MANIFEST_REL in shipped[0] and PATCH_REL in shipped[0]
                        and PACKET_REL in shipped[0] and len(shipped[0]) == 12
                        and all(SHA_RE.fullmatch(d) for d in shipped[0].values())))
        for name, needle, inp, argument in (
            ("an applied policy not hashing to the argument", "hashes to", make(policy=proposed + b" ", applied=True), arg),
            ("unset FROZEN_SUBJECT", "FROZEN_SUBJECT is unset", make(frozen=None), arg),
            ("a non-hex argument", "not a 64-hex", make(), "xyz"),
            ("an argument that is not the row", "not the row", make(), "0" * 64),
            ("the version-7 argument", "not the row", make(), digest(base)),
            ("a manifest row for another subject", "row population",
             make(manifest=manifest.replace(POLICY_REL.name.encode(), b"other.json")), arg),
            ("a manifest with no row", "row population", make(manifest=b"# header\n"), arg),
            ("a manifest naming another variant", "row population",
             make(manifest=manifest.replace(b"[variant: pv]", b"[variant: s]")), arg),
            ("a manifest with an extra row", "row population",
             make(manifest=manifest + f"{'1' * 64}  {POLICY_REL.as_posix()}  [variant: pvx]\n".encode()), arg),
            ("launch-consent spec v1.1 not signed", "version 1.1 is not signed", make(spec_signed=False), arg),
            ("a missing version-7 act", "version-7 act record", make(predecessor=""), arg),
            ("a version-7 act with no date", "version-7 act record", make(predecessor_date=""), arg),
            ("a version-7 act with no instant", "version-7 act record", make(predecessor_instant=""), arg),
            ("stale builder output", "builder reports", make(stale=["x"]), arg),
            ("a policy not at the version-7 act's argument", "version-7 act's argument", make(policy=base + b" "), arg),
            ("proposed bytes not hashing to the argument", "proposed bytes", make(proposed=proposed + b" "), arg),
            ("a package file added after the review", "frozen-file set",
             make(frozen_files={**blobs, PKG / "ROUND-6-DISPOSITIONS.md": b"x"}), arg),
            ("a packet carrying a digest", "64-hex token", make(packet=pkt + arg.encode()), arg),
            ("a packet not quoting the words", "does not quote", make(packet=pkt.replace(b"variant pv", b"variant q")), arg),
            ("a selection record with no quoted option", "quoted option",
             make(selection=selection.replace(f"> {words}\n", "")), arg),
            ("a selection record with two quoted options", "quoted option",
             make(selection=selection + f"\nThe owner picked the option labelled exactly:\n\n> {words}\n"), arg),
            ("another selection record", "is not OWNER-SELECTION",
             make(selection=selection.replace("SCOPE-V8-2026-11-08`", "SCOPE-V8-2026-11-09`")), arg),
            ("a manifest the round-6 review did not bind", "round-6 review bound",
             make(manifest=manifest + b"# x\n"), arg),
            ("verdict REVISE", "verdict", make(review=review.replace("CONFIRM WITH EXCEPTIONS", "REVISE")), arg),
            ("a verdict past the fourth head line", "verdict",
             make(review=review.replace("Verdict: CONFIRM", "Note: x\nVerdict: CONFIRM")), arg),
            ("a head with no reviewed commit", "reviewed commit",
             make(review=review.replace("Reviewed commit:", "Commit:")), arg),
            ("a raw not stating that every exception is a note", "only a round whose exceptions are all notes",
             make(review=review.replace("is a **note**", "is an **exception**")), arg),
            ("a raw with no notes heading", "section", make(review=review.replace(NOTES_HEADING, "## Findings")), arg),
            ("a note beyond the round's", "not the round's notes", make(review=review + "- **A5 [Inferred] x.**\n"), arg),
            ("a finding of another letter", "not the round's notes",
             make(review=review.replace("- **A4 [", "- **B4 [")), arg),
            ("a repeated note", "repeats a finding", make(review=review + "- **A2 [Inferred] again.**\n"), arg),
            ("a missing note", "not the round's notes",
             make(review=review.replace("- **A3 [Inferred] t.** body\n", "")), arg),
        ):
            results.append((f"{name} refused", refused(needle, inp, argument)))
        results.append(("a review binding the row instead of the file refused",
                        refused("manifest file's SHA-256", make(review=review.replace(msha, arg)))))
        for rel in sorted(blobs):
            results.append((f"a frozen-file set missing {rel.name} refused",
                            refused("frozen-file set", make(frozen_files={k: b for k, b in blobs.items() if k != rel}))))
            drift = {**blobs, rel: blobs[rel] + b"x"}
            results.append((f"a package file {rel.name} differing from the reviewed bytes refused",
                            refused("differs from what the round-6 review read",
                                    make(frozen_files=drift))))
        performed = pkt.replace(b"\n\n", b"\n\n> **PERFORMED 2026-11-09.** Recorded.\n\n", 1)
        results.append(("a PERFORMED head over the frozen packet accepted",
                        accepted(make(packet=performed, frozen_files={**blobs, PACKET_REL: performed}))))
        later = pkt + b"\n> **PERFORMED 2026-11-09.** Recorded.\n"
        results.append(("a PERFORMED note anywhere but the head refused",
                        refused("frozen subject does not carry", make(packet=later, frozen_files={**blobs, PACKET_REL: later}))))
        for name, w, needle in (("empty words", "", "one non-empty line"),
                                ("multi-line words", words + "\nyes", "one non-empty line"),
                                ("words carrying a digest", words + " " + "a" * 64, "64-hex"),
                                ("the version-7 words", "Sign screening scope version 7, variant s", "quoted option"),
                                ("words with a trailing period", words + ".", "quoted option"),
                                ("words in another case", words.lower(), "quoted option"),
                                ("a decline", "Decline", "quoted option")):
            results.append((f"{name} refused", _raises(lambda w=w: validate_words(w, selection), needle)))

        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d)
            build._fixture(root)
            base_text, _mode = build.base_bytes(root)
            real = build.propose(base_text).encode()
        real_arg = digest(real)
        real_manifest = f"# header\n{real_arg}  {POLICY_REL.as_posix()}  [variant: pv]\n".encode()
        real_blobs = {**blobs, MANIFEST_REL: real_manifest}
        FROZEN_FILE_DIGESTS = {rel: digest(b) for rel, b in real_blobs.items()}
        REVIEWED_MANIFEST_SHA = digest(real_manifest)
        real_review = review.replace(msha, digest(real_manifest))
        real_inp = make(manifest=real_manifest, proposed=real, policy=base_text.encode(),
                        predecessor=digest(base_text.encode()), review=real_review, frozen_files=real_blobs,
                        frozen_digest=lambda rel: digest(real_blobs[rel]) if rel in real_blobs else "")
        results.append(("an instant at the version-7 act's instant refused",
                        _raises(lambda: expected(act, real_arg, DATE_OK, words,
                                                 make(**{**real_inp.__dict__, "predecessor_instant": INSTANT_OK}), INSTANT_OK),
                                "not after")))
        results.append(("words given before the version-7 act's day refused",
                        _raises(lambda: expected(act, real_arg, DATE_OK, words,
                                                 make(**{**real_inp.__dict__, "predecessor_date": "2026-11-09"}), INSTANT_OK),
                                "before the version-7 act's day")))
        results.append(("an act dated before the words refused",
                        _raises(lambda: expected(act, real_arg, "2026-11-07", words, real_inp, "2026-11-07T10:00:00Z"),
                                "before the day the owner gave")))
        for name, bad in (("a date-only instant", "2026-11-09"), ("a local-offset instant", "2026-11-09T14:40:00+08:00"),
                          ("an instant on another date", "2026-11-10T00:00:00Z")):
            results.append((f"{name} refused", _raises(lambda bad=bad: expected(act, real_arg, DATE_OK, words, real_inp, bad),
                                                       "instant must be")))
        results.append(("a bad date refused", _raises(lambda: expected(act, real_arg, "09/11", words, real_inp, INSTANT_OK),
                                                      "date must be")))
        results.append(("version-7 bytes refused by the effect reader", _raises(lambda: effect_of(base_text.encode()), "do not")))
        record, block = expected(act, real_arg, DATE_OK, words, real_inp, INSTANT_OK)
        results.append(("record and block name the row and the tag",
                        real_arg in record and real_arg in block and tag_for(act, DATE_OK) in record))
        results.append(("the tag name is the version-8 form",
                        tag_for(act, DATE_OK) == "pwb-approve-policy-public-source-scope-v8-signed-2026-11-09"))
        results.append(("record carries the phrase once", record.count(phrase_for(act, real_arg)) == 1))
        results.append(("record quotes the words once", record.count(f"> {words}\n") == 1))
        results.append(("record and block carry the words' day and the instant",
                        record.count("Owner's words given on (UTC date): 2026-11-08") == 1
                        and record.count(f"Recorded at (UTC): {INSTANT_OK}") == 1
                        and block.count("`2026-11-08`") == 1 and block.count(f"`{INSTANT_OK}`") == 1))
        results.append(("the ceremony cites the selection, the direction and the spec condition",
                        f"`{SELECTION_REL.as_posix()}` states that selection" in record
                        and f"`{DIRECTION_NAME}` directs" in record and "version 1.1 is signed" in record
                        and "[Inferred] That the person answering is the owner." in record))
        results.append(("the supersession line has the read gate's form",
                        re.search(r"^Supersession / revocation: this act supersedes, for the `approve-policy` role only, "
                                  r"the \d{4}-\d{2}-\d{2} act recorded at `" + re.escape(V7_ACT_REL.as_posix()) + r"`\.",
                                  record, re.MULTILINE) is not None))
        results.append(("the act identity and title are the read gate's version-8 form",
                        f"Act identity: `PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V8-APPROVAL-{DATE_OK}`" in record
                        and record.startswith("# Owner act — Polaris Butlers secret-classification policy approval "
                                              "(public-source screening scope, version 8)\n")))
        results.append(("no line opens with 'recorded at' but the one field",
                        len(re.findall(r"^\s*recorded at\b", record, re.I | re.M)) == 1))
        results.append(("the record carries none of the other families' sweep needles",
                        not any(n in record.lower() for n in ("public-egress-", "public-repo-admission", "public-obs-",
                                                              "rfc5-project-documentation", "dossier-local-agent"))))
        results.append(("the record carries exactly the row, the version-7 argument and the manifest digest",
                        set(HEX64_RE.findall(record)) == {real_arg, digest(base_text.encode()), digest(real_manifest)}))
        results.append(("the aggregate block is bracketed", block.count(BLOCK_BEGIN) == 1 and block.count(BLOCK_END) == 1))

        with tempfile.TemporaryDirectory() as d:
            root = pathlib.Path(d)
            build._fixture(root)
            (root / BUILDER_REL).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(ROOT / BUILDER_REL, root / BUILDER_REL)
            (root / POLICY_REL).write_text(base_text)
            (root / DECISIONS).mkdir(parents=True, exist_ok=True)
            (root / V7_ACT_REL).write_text(f"# v7\n\nDate: {V7_DATE}\n\nRecorded at (UTC): {V7_INSTANT}\n\n"
                                           f"Exact digest (SHA-256): `{digest(base_text.encode())}`\n")
            (root / AGGREGATE_REL).write_text("# Acceptance record\n")
            (root / SELECTION_REL).write_text(selection)
            (root / PACKET_REL).write_bytes(pkt)
            mf = (root / MANIFEST_REL).read_bytes()
            raw = root / CONFIRMATION_REVIEW_REL
            raw.parent.mkdir(parents=True, exist_ok=True)
            raw.write_text(review.replace(msha, digest(mf)))
            REVIEWED_MANIFEST_SHA = digest(mf)
            package = [p.relative_to(root) for p in (root / PKG).rglob("*") if p.is_file()]
            FROZEN_FILE_DIGESTS = {rel: digest((root / rel).read_bytes()) for rel in {*package, BUILDER_REL}}
            FROZEN_SUBJECT = "a" * 40
            row = ROW_RE.findall(mf.decode())[0][0]
            signed = {"yes": True}
            fixture_inputs = lambda r: live_inputs(r, spec_check=lambda _r: signed["yes"])  # noqa: E731
            with contextlib.redirect_stdout(io.StringIO()):
                before = do_check(root, act, row, DATE_OK, words, INSTANT_OK, inputs=fixture_inputs)
                early = do_record(root, act, row, V7_DATE, words, "2026-11-06T00:00:01Z", inputs=fixture_inputs)
                signed["yes"] = False
                unsigned = do_record(root, act, row, DATE_OK, words, INSTANT_OK, inputs=fixture_inputs)
                signed["yes"] = True
                wrote = do_record(root, act, row, DATE_OK, words, INSTANT_OK, inputs=fixture_inputs)
                checked = do_check(root, act, row, DATE_OK, words, inputs=fixture_inputs)
                builder_after = build.check(root)
                again = do_record(root, act, row, DATE_OK, words, INSTANT_OK, inputs=fixture_inputs)
                agg = (root / AGGREGATE_REL).read_text()
                (root / AGGREGATE_REL).write_text(agg * 2)
                doubled = do_check(root, act, row, DATE_OK, words, inputs=fixture_inputs)
                (root / AGGREGATE_REL).write_text(agg)
                rec = (root / act.record).read_text()
                (root / act.record).write_text(rec.replace(INSTANT_OK, "2026-11-09T15:01:00Z"))
                tampered = do_check(root, act, row, DATE_OK, words, inputs=fixture_inputs)
                (root / act.record).write_text(rec)
                (root / PKG / "ROUND-6-DISPOSITIONS.md").write_text("added after the review\n")
                added = do_check(root, act, row, DATE_OK, words, inputs=fixture_inputs)
                (root / PKG / "ROUND-6-DISPOSITIONS.md").unlink()
                applied_now = (root / POLICY_REL).read_bytes()
                (root / POLICY_REL).write_text(base_text)
                unapplied = do_check(root, act, row, DATE_OK, words, inputs=fixture_inputs)
                (root / act.record).unlink()
                (root / AGGREGATE_REL).write_text(agg)
                agg_layer = do_record(root, act, row, DATE_OK, words, INSTANT_OK, inputs=fixture_inputs)
                agg_kept = not (root / act.record).exists() and (root / POLICY_REL).read_text() == base_text
                (root / AGGREGATE_REL).write_text("# Acceptance record\n")
                (root / POLICY_REL).write_bytes(applied_now)
                applied_layer = do_record(root, act, row, DATE_OK, words, INSTANT_OK, inputs=fixture_inputs)
                applied_kept = not (root / act.record).exists()
            results.append(("check before the act is recorded fails", before == 1))
            results.append(("a record at the version-7 instant's day writes nothing", early == 1))
            results.append(("a record while spec v1.1 is unsigned writes nothing", unsigned == 1))
            results.append(("record then check applies the row and passes",
                            wrote == 0 and checked == 0 and again == 1
                            and digest(applied_now) == row and not (root / ".git").exists()))
            results.append(("after the act the builder still verifies the package", builder_after == []))
            results.append(("check counting two copies of the block fails", doubled == 1))
            results.append(("an altered recording instant fails the check", tampered == 1))
            results.append(("a package file added after the review fails the check", added == 1))
            results.append(("check over a policy reverted to version 7 fails", unapplied == 1))
            results.append(("an aggregate section alone refuses a record and writes nothing", agg_layer == 1 and agg_kept))
            results.append(("an applied policy alone refuses a record and writes nothing", applied_layer == 1 and applied_kept))
    finally:
        FROZEN_FILE_DIGESTS, FROZEN_SUBJECT, REVIEWED_MANIFEST_SHA = saved
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
    ap.add_argument("--instant", help="UTC instant YYYY-MM-DDTHH:MM:SSZ; --record defaults to now, --check reads it from the record")
    ap.add_argument("--owner-words")
    args = ap.parse_args(argv[1:])
    if args.selftest:
        return selftest()
    if args.freeze_table is not None:
        commit = args.freeze_table or None
        print(frozen_table(v6rec.at_commit_reader(commit) if commit else None, commit))
        return 0
    argument = args.record or args.check
    if not (args.date and args.owner_words):
        print("--date and --owner-words are required", file=sys.stderr)
        return 2
    if args.record:
        return do_record(ROOT, ACT, argument, args.date, args.owner_words, args.instant)
    return do_check(ROOT, ACT, argument, args.date, args.owner_words, args.instant)


if __name__ == "__main__":
    sys.exit(main(sys.argv))
