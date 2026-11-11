#!/usr/bin/env python3
"""Build and verify the proposed dossier local-agent mode version 1.7.

The three candidate patches extend signed v1.6. --check and --selftest
write no repository target; apply() is called only by the existing
versioned-signoff recorder after the owner's actual version selection.
The predecessor builder peels this layer and delegates latest-signed
checks here. Review binding remains the recorder's existing spec binding;
its candidate-package drift guards remain unchanged. No product behavior,
P115 act, consent, or observed-project execution permission is added.

Beyond the v1.6 pattern, --check also verifies three things about the
package's own prose and its neighbours, from bytes alone:

- the affected-identifier block in SEMANTIC-DELTA.md equals the one this
  builder computes from the v1.6 and v1.7 spec bytes (``affected_ids``);
- the delta's "Current and proposed clauses" blocks, applied as exact
  replacements to the v1.6 bytes, yield the v1.7 bytes of all three files
  (``clause_findings``), so the prose cannot drift from the patches;
- every double-quoted string of twelve or more characters in the
  launch-consent spec and the candidate one-command-run spec that occurs
  in the v1.6 spec still occurs in the v1.7 spec (``sibling_findings``):
  those changes displace or read REQ-polaris-generation-033 to 036 by
  quotation, and this version must not break a quotation they rely on.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_polaris_dossier_local_agent_mode as v10  # noqa: E402
import build_polaris_dossier_local_agent_mode_v1_1 as v11  # noqa: E402
import build_polaris_dossier_local_agent_mode_v1_3 as v13  # noqa: E402
import build_polaris_dossier_local_agent_mode_v1_4 as v14  # noqa: E402
import build_polaris_dossier_local_agent_mode_v1_5 as v15  # noqa: E402
import build_polaris_dossier_local_agent_mode_v1_6 as v16  # noqa: E402

KEY = v10.KEY
VERSION = "1.7"
CHANGE = v10.CHANGE
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-7"
)
PROPOSED = CANDIDATE / "proposed"
SPEC = v10.INSTALLED_SPEC
#: (patch file under ``proposed/``, the file it patches), in apply order.
MAIN_PATCHES = (
    ("spec.md.patch", SPEC),
    ("design.md.patch", CHANGE / "design.md"),
    ("proposal.md.patch", CHANGE / "proposal.md"),
)
TARGETS = tuple(dict.fromkeys(target for _patch, target in MAIN_PATCHES))
DECISIONS = v10.DECISIONS
RECORD_STEM = v11.RECORD_STEM
V10_RECORD = v11.V10_RECORD
V11_RECORD = v11.V11_RECORD
V12_RECORD = v13.V12_RECORD
V13_RECORD = v13.V13_RECORD
V14_RECORD = v14.V14_RECORD
V15_RECORD = v15.V15_RECORD
V16_RECORD = v16.V16_RECORD
V17_RECORD = DECISIONS / f"{RECORD_STEM}-SIGNOFF-v{VERSION}.md"
STATUS = v10.STATUS
#: The status links written by the installed v1.6 layer.
V16_LINKS = v16.SEVEN_LINKS
EIGHT_LINKS = (f"([v1.0 sign-off]({V10_RECORD.as_posix()});\n"
               f"    [v1.1 sign-off]({V11_RECORD.as_posix()});\n"
               f"    [v1.2 sign-off]({V12_RECORD.as_posix()});\n"
               f"    [v1.3 sign-off]({V13_RECORD.as_posix()});\n"
               f"    [v1.4 sign-off]({V14_RECORD.as_posix()});\n"
               f"    [v1.5 sign-off]({V15_RECORD.as_posix()});\n"
               f"    [v1.6 sign-off]({V16_RECORD.as_posix()});\n"
               f"    [v1.7 sign-off]({V17_RECORD.as_posix()}))")
DELTA = CANDIDATE / "SEMANTIC-DELTA.md"
#: Changes that quote REQ-polaris-generation-033 to 036 to displace or read them.
SIBLINGS = (
    pathlib.Path("openspec/changes/polaris-dossier-launch-consent/specs/polaris-generation/spec.md"),
    pathlib.Path("openspec/changes/polaris-dossier-one-command-run/proposed/polaris-generation/spec.md"),
)

sha = v11.sha


# --- patches in a scratch copy -------------------------------------------------

def _copy_targets(root: pathlib.Path, scratch: pathlib.Path) -> None:
    """The tree's own bytes: this layer is the top one, so nothing is peeled."""
    for rel in TARGETS:
        if (root / rel).is_file():
            (scratch / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root / rel, scratch / rel)


def _git_apply(scratch: pathlib.Path, patch: pathlib.Path, *, reverse: bool = False) -> bool:
    """Apply one patch inside ``scratch``, which no repository encloses."""
    env = {**os.environ, "GIT_CEILING_DIRECTORIES": str(scratch.parent)}
    args = ["git", "apply", *(["-R"] if reverse else []), str(patch)]
    return subprocess.run(args, cwd=scratch, env=env, capture_output=True).returncode == 0


def _patches(root: pathlib.Path) -> list[pathlib.Path]:
    return [root / PROPOSED / name for name, _target in MAIN_PATCHES]


def _run(root: pathlib.Path, *, reverse: bool) -> dict[pathlib.Path, bytes] | None:
    if any(not patch.is_file() for patch in _patches(root)):
        return None
    with tempfile.TemporaryDirectory(prefix="dossier-v17-") as tmp:
        scratch = pathlib.Path(tmp) / "tree"
        scratch.mkdir()
        _copy_targets(root, scratch)
        patches = _patches(root)
        for patch in (reversed(patches) if reverse else patches):
            if not _git_apply(scratch, patch, reverse=reverse):
                return None
        if any(not (scratch / rel).is_file() for rel in TARGETS):
            return None
        return {rel: (scratch / rel).read_bytes() for rel in TARGETS}


def forward(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The targets' bytes after applying the patches to the tree, or None."""
    return _run(root, reverse=False)


def backward(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The targets' bytes after reversing the patches on the tree, or None."""
    return _run(root, reverse=True)


def state(root: pathlib.Path) -> str:
    """"absent" | "unapplied" | "applied" | "neither"."""
    if not (root / CANDIDATE).is_dir():
        return "absent"
    if forward(root) is not None:
        return "unapplied"
    if backward(root) is not None:
        return "applied"
    return "neither"


def layers(root: pathlib.Path) -> tuple[dict[pathlib.Path, bytes], dict[pathlib.Path, bytes]] | None:
    """(v1.6 bytes, v1.7 bytes) of the three targets, whichever state the tree is in."""
    current = state(root)
    tree = {rel: (root / rel).read_bytes() for rel in TARGETS if (root / rel).is_file()}
    if current == "unapplied":
        after = forward(root)
        return (tree, after) if after is not None else None
    if current == "applied":
        before = backward(root)
        return (before, tree) if before is not None else None
    return None


def subject_bytes(root: pathlib.Path = ROOT) -> bytes:
    """The reviewed subject: the installed spec with the v1.7 spec patch applied."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patches do not apply to the tree")
    return after[SPEC]


# --- the package's own prose, checked against bytes -----------------------------

_REQ = re.compile(r"^### Requirement: (.+)$", re.M)
_SCENARIO = re.compile(r"^#### Scenario: (.+)$", re.M)
_ID = re.compile(r"^ID: (REQ-[a-z0-9-]+)$", re.M)


def _sections(text: str) -> dict[str, tuple[str, dict[str, str], str]]:
    """{requirement key: (body before its first scenario, {scenario title: text}, test form)}.

    The opening text before the first requirement is keyed "opening". A
    requirement is keyed by its ``ID:`` line where it has one, else its title.
    """
    out: dict[str, tuple[str, dict[str, str], str]] = {}
    starts = [m.start() for m in _REQ.finditer(text)]
    out["opening"] = (text[:starts[0]] if starts else text, {}, "")
    for i, start in enumerate(starts):
        chunk = text[start:starts[i + 1] if i + 1 < len(starts) else len(text)]
        ident = _ID.search(chunk)
        key = ident.group(1) if ident else _REQ.match(chunk).group(1)  # type: ignore[union-attr]
        scen = list(_SCENARIO.finditer(chunk))
        body = chunk[:scen[0].start()] if scen else chunk
        scenarios: dict[str, str] = {}
        form = ""
        for j, m in enumerate(scen):
            end = scen[j + 1].start() if j + 1 < len(scen) else len(chunk)
            piece = chunk[m.start():end]
            cut = piece.find("\nForm: ")
            if cut != -1:
                form = piece[cut:]
                piece = piece[:cut + 1]
            scenarios[m.group(1)] = piece
        out[key] = (body, scenarios, form)
    return out


def affected_ids(before: bytes, after: bytes) -> str:
    """The affected-identifier block, computed from the two spec texts."""
    old, new = _sections(before.decode("utf-8")), _sections(after.decode("utf-8"))
    lines: list[str] = []
    for key in list(dict.fromkeys([*old, *new])):
        if key not in old or key not in new:
            lines.append(f"{key}: {'added' if key not in old else 'removed'}")
            continue
        (ob, os_, of), (nb, ns, nf) = old[key], new[key]
        parts = []
        if ob != nb:
            parts.append("requirement text changed")
        changed = [t for t in os_ if t in ns and os_[t] != ns[t]]
        added = [t for t in ns if t not in os_]
        removed = [t for t in os_ if t not in ns]
        if of != nf:
            parts.append("test form changed")
        if parts or changed or added or removed:
            lines.append(f"{key}: {'; '.join(parts) or 'requirement text unchanged'}")
            lines += [f"  scenario changed: {t}" for t in changed]
            lines += [f"  scenario added: {t}" for t in added]
            lines += [f"  scenario removed: {t}" for t in removed]
        else:
            lines.append(f"{key}: unchanged")
    return "\n".join(lines) + "\n"


_FENCE = re.compile(r"^```affected-ids\n(.*?)^```$", re.M | re.S)
_CLAUSE = re.compile(r"^### (\S+) — `([^`]+)` — .*?\nCurrent:\n\n```text\n(.*?)\n```\n\nProposed:\n\n```text\n(.*?)\n```$",
                     re.M | re.S)


def delta_findings(root: pathlib.Path, before: dict[pathlib.Path, bytes],
                   after: dict[pathlib.Path, bytes]) -> list[str]:
    """The delta's affected-identifier block and clause blocks, against the bytes."""
    if not (root / DELTA).is_file():
        return [f"{DELTA.as_posix()} is absent"]
    text = (root / DELTA).read_text(encoding="utf-8")
    findings: list[str] = []
    fences = _FENCE.findall(text)
    if len(fences) != 1:
        findings.append(f"{DELTA.as_posix()}: carries {len(fences)} affected-ids blocks, not one")
    elif fences[0] != affected_ids(before[SPEC], after[SPEC]):
        findings.append(f"{DELTA.as_posix()}: the affected-ids block is not the computed one; "
                        "regenerate it with --print-affected-ids")
    by_name = {rel.name: rel for rel in TARGETS}
    clauses = _CLAUSE.findall(text)
    if not clauses:
        findings.append(f"{DELTA.as_posix()}: no clause blocks found")
    work = {rel: data.decode("utf-8") for rel, data in before.items()}
    seen: set[str] = set()
    for ident, name, old, new in clauses:
        if ident in seen:
            findings.append(f"{DELTA.as_posix()}: clause {ident} appears twice")
        seen.add(ident)
        rel = by_name.get(name)
        if rel is None:
            findings.append(f"{DELTA.as_posix()}: clause {ident} names no target ({name})")
            continue
        count = work[rel].count(old)
        if count != 1:
            findings.append(f"{DELTA.as_posix()}: clause {ident}'s Current block occurs {count} "
                            f"times in {name}, not once")
            continue
        work[rel] = work[rel].replace(old, new)
    for rel in TARGETS:
        if work[rel].encode("utf-8") != after[rel]:
            findings.append(f"{DELTA.as_posix()}: the clause blocks do not reproduce the proposed "
                            f"{rel.name}")
    return findings


_QUOTED = re.compile(r'"([^"\n]{12,})"')


def sibling_findings(root: pathlib.Path, before: bytes, after: bytes) -> list[str]:
    """Quotations of this spec by the sibling changes that this version would break."""
    old, new = before.decode("utf-8"), after.decode("utf-8")
    findings = []
    for rel in SIBLINGS:
        if not (root / rel).is_file():
            continue
        for quoted in sorted(set(_QUOTED.findall((root / rel).read_text(encoding="utf-8")))):
            if quoted in old and quoted not in new:
                findings.append(f"{rel.as_posix()} quotes \"{quoted[:60]}...\", which the "
                                f"v{VERSION} spec no longer carries")
    return findings


# --- checks ------------------------------------------------------------------

SUBJECTS = CANDIDATE / "PROPOSED-SUBJECTS.json"


def proposed_subjects(root: pathlib.Path = ROOT) -> str:
    """PROPOSED-SUBJECTS.json as the builder derives it from the unapplied tree."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patches do not apply to the tree")
    rows = [{"path": rel.as_posix(),
             "current_sha256": sha((root / rel).read_bytes()),
             "proposed_sha256": sha(after[rel]),
             "patch_sha256": sha((root / PROPOSED / name).read_bytes())}
            for name, rel in MAIN_PATCHES]
    doc = {"base": "version 1.6 installed bytes; the proposed bytes are the patches applied to them",
           "subjects": rows}
    return json.dumps(doc, indent=2) + "\n"


def check(root: pathlib.Path = ROOT) -> list[str]:
    current = state(root)
    if current == "absent":
        return ([f"the v{VERSION} package is absent but {V17_RECORD.as_posix()} exists"]
                if (root / V17_RECORD).exists() else [])
    findings = [f"v1.6 builder: {f}" for f in v16.check(root)]
    base = v16.state(root)
    if base != "applied":
        findings.append(f"v1.6 is {base}, not installed; v{VERSION} patches the installed v1.6")
    missing = [p.relative_to(root).as_posix() for p in _patches(root) if not p.is_file()]
    if missing:
        return findings + [f"missing patch {m}" for m in missing]
    if not (root / V16_RECORD).is_file():
        findings.append(f"{V16_RECORD.as_posix()} is absent; the v1.6 signed bytes are unknown")
    elif base == "applied":
        findings += [f"v1.6 signed bytes: {f}" for f in v16.signed_v16_findings(root)]
    if current == "neither":
        return findings + [f"the tree is neither v1.6 nor v1.6 with the v{VERSION} patches"]
    pair = layers(root)
    assert pair is not None  # state() applied one direction
    before, after = pair
    findings += delta_findings(root, before, after)
    findings += sibling_findings(root, before[SPEC], after[SPEC])
    if current == "unapplied":
        if (root / STATUS).is_file() and (
                (root / STATUS).read_text(encoding="utf-8").count(V16_LINKS) != 1):
            findings.append(f"{STATUS}: does not carry the v1.0 through v1.6 record links "
                            f"exactly once; the install would name no v{VERSION} record")
        findings += v11._shape(after[SPEC], f"{SPEC.as_posix()} with the v{VERSION} patches")
        if (root / SUBJECTS).is_file() and (
                (root / SUBJECTS).read_text(encoding="utf-8") != proposed_subjects(root)):
            findings.append(f"{SUBJECTS.as_posix()} is stale; regenerate it with --write-subjects")
    else:
        findings += v11._shape((root / SPEC).read_bytes(), SPEC.as_posix())
    return findings


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root) == "applied" and not check(root)


def signed_findings(root: pathlib.Path) -> list[str]:
    """Whether the installed bytes are the latest recorded sign-off's (v1.7 or later)."""
    versions = v11.recorded_versions(root)
    if not versions or versions[-1] < (1, 7):
        return v16.signed_findings(root)
    latest = versions[-1]
    if latest != (1, 7):
        return [f"recorded version {latest[0]}.{latest[1]} has no builder; its bytes cannot be "
                "told from unsigned ones"]
    if not (root / CANDIDATE).is_dir():
        return [f"{V17_RECORD.as_posix()} exists but the v{VERSION} package is absent"]
    findings = [f"v1.6 signed bytes: {f}" for f in v16.signed_v16_findings(root)]
    current = state(root)
    if current != "applied":
        return findings + [f"the tree is not v1.6 plus the v{VERSION} patches as recorded "
                           f"(found {current})"]
    reviewed = v11.review_digest(root, V17_RECORD)
    if reviewed is None or sha((root / SPEC).read_bytes()) != reviewed:
        findings.append(f"the v{VERSION} spec is not the bytes its review read")
    return findings


# --- apply -------------------------------------------------------------------

def apply(root: pathlib.Path = ROOT) -> int:
    current = state(root)
    if current != "unapplied":
        print(f"REFUSED: the package is {current}, not unapplied; nothing written")
        return 2
    findings = check(root)
    if findings:
        print("REFUSED: the package does not verify; nothing written")
        for finding in findings:
            print(f"  - {finding}")
        return 2
    status = root / STATUS
    text = status.read_text(encoding="utf-8")
    after = forward(root)
    assert after is not None  # state() applied it
    for rel, data in after.items():
        (root / rel).write_bytes(data)
    text = v10.refigure(root, text.replace(V16_LINKS, EIGHT_LINKS))
    status.write_text(text, encoding="utf-8")
    remaining = check(root)
    if state(root) != "applied" or remaining:
        print("FAILED after apply: " + " | ".join(remaining or [state(root)]))
        return 1
    reqs, scenarios = v10.status_figure(root)
    print(f"applied v{VERSION}; {STATUS} now reads {reqs} requirements and {scenarios} "
          "scenarios; next: check_spec_reconciliation.py --regenerate")
    return 0


# --- selftest ----------------------------------------------------------------

V17_MARKER = "#### Scenario: added in v1.7\n"
_QUOTED_FIXTURE = "Scenario: added in v1.6"


def _write_delta(root: pathlib.Path, clauses: list[tuple[str, pathlib.Path, str, str]]) -> None:
    """A SEMANTIC-DELTA.md for a fixture: the computed block and the given clauses."""
    after = forward(root)
    assert after is not None
    body = ["# Fixture delta\n", "```affected-ids\n" + affected_ids((root / SPEC).read_bytes(),
                                                                    after[SPEC]) + "```\n"]
    for ident, rel, old, new in clauses:
        body.append(f"### {ident} — `{rel.name}` — fixture\n\nCurrent:\n\n```text\n{old}\n```\n\n"
                    f"Proposed:\n\n```text\n{new}\n```\n")
    (root / DELTA).write_text("\n".join(body), encoding="utf-8")


def _fixture(root: pathlib.Path, *, install_v16: bool = True, record_v16: bool = True,
             v16_digest: str | None = None, extra: bool = False, delta: bool = True) -> None:
    """A tree with v1.0 through v1.6 installed and signed, and the v1.7 patches beside it."""
    import contextlib
    import io
    v16._fixture(root)
    if install_v16:
        with contextlib.redirect_stdout(io.StringIO()):
            assert v16.apply(root) == 0
    if record_v16:
        v16._record_v16(root, digest=v16_digest)
    base_spec = (root / SPEC).read_text()
    sibling = root / SIBLINGS[1]  # a proposed/ path, which no spec scan reads
    sibling.parent.mkdir(parents=True, exist_ok=True)
    sibling.write_text(f'It reads "{_QUOTED_FIXTURE}" as stated.\n')
    if install_v16:
        old_clause = v16.V16_MARKER
        new_clause = V17_MARKER + "\n- WHEN i\n- THEN j\n\n" + v16.V16_MARKER
        successor_spec = base_spec.replace(old_clause, new_clause, 1)
    else:
        old_clause = new_clause = ""
        successor_spec = base_spec + "\n"
    if extra:
        successor_spec += v10._req("Extra", 1)
    base_design = (root / CHANGE / "design.md").read_text()
    base_proposal = (root / CHANGE / "proposal.md").read_text()
    (root / PROPOSED).mkdir(parents=True, exist_ok=True)
    (root / PROPOSED / "spec.md.patch").write_text(v11._unified(SPEC, base_spec, successor_spec))
    (root / PROPOSED / "design.md.patch").write_text(
        v11._unified(CHANGE / "design.md", base_design, base_design + "Design v1.7.\n"))
    (root / PROPOSED / "proposal.md.patch").write_text(
        v11._unified(CHANGE / "proposal.md", base_proposal, "Proposal v1.7.\n"))
    if delta and install_v16:
        _write_delta(root, [
            ("A1", SPEC, old_clause.rstrip("\n"), new_clause.rstrip("\n")),
            ("A2", CHANGE / "design.md", base_design.rstrip("\n").splitlines()[-1],
             base_design.rstrip("\n").splitlines()[-1] + "\nDesign v1.7."),
            ("A3", CHANGE / "proposal.md", base_proposal.rstrip("\n"), "Proposal v1.7."),
        ])
    elif delta:
        (root / DELTA).write_text("# Fixture delta\n")


def _record_v17(root: pathlib.Path, digest: str | None = None) -> None:
    review = pathlib.Path("docs/reviews/R-V17-RAW.md")
    (root / review).write_text(
        f"# Review\nReviewed commit: {'d' * 40}\n"
        f"Manifest SHA-256: {digest or sha((root / SPEC).read_bytes())}\nVerdict: CONFIRM\n")
    (root / V17_RECORD).write_text(f"# v1.7\n\nReview: {review.as_posix()}\n")


def selftest() -> int:
    import contextlib
    import io

    results: list[tuple[str, bool]] = []

    def quiet(fn, *args):
        with contextlib.redirect_stdout(io.StringIO()):
            return fn(*args)

    def tree(**fixture):
        tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(tmp.name)
        _fixture(root, **fixture)
        return tmp, root

    def battery(root: pathlib.Path) -> list[str]:
        """What the v1.0 through v1.6 builders' --check report over the tree."""
        return (v10.check(root) + v11.check(root) + v11.signed_findings(root)
                + v13.check(root) + v13.signed_findings(root)
                + v14.check(root) + v14.signed_findings(root)
                + v15.check(root) + v15.signed_findings(root)
                + v16.check(root) + v16.signed_findings(root))

    tmp, root = tree()
    with tmp:
        results.append(("unapplied package verifies", check(root) == []))
        (root / SUBJECTS).write_text(proposed_subjects(root))
        results.append(("unapplied: the derived subjects file verifies", check(root) == []))
        (root / SUBJECTS).write_text(proposed_subjects(root).replace("\"proposed_sha256\": \"",
                                                                     "\"proposed_sha256\": \"0", 1))
        results.append(("unapplied: a stale subjects file fails",
                        any("is stale" in f for f in check(root))))
        (root / SUBJECTS).unlink()
        results.append(("unapplied: the battery's earlier checks pass", battery(root) == []))
        subject = subject_bytes(root)
        results.append(("subject is the installed spec with the v1.7 patch",
                        V17_MARKER.encode() in subject
                        and V17_MARKER.encode() not in (root / SPEC).read_bytes()))
        results.append(("apply returns 0", quiet(apply, root) == 0))
        results.append(("applied package verifies", applied(root) and state(root) == "applied"))
        results.append(("applied: the targets carry v1.7",
                        V17_MARKER.encode() in (root / SPEC).read_bytes()
                        and (root / CHANGE / "proposal.md").read_text() == "Proposal v1.7.\n"
                        and (root / CHANGE / "design.md").read_text().endswith("Design v1.7.\n")))
        status = (root / STATUS).read_text()
        results.append(("applied: the status figure follows the recount and names eight records",
                        v10.status_figure(root) == (6, 14) and EIGHT_LINKS in status
                        and V16_LINKS not in status))
        results.append(("applied: the v1.6, v1.5, v1.4, v1.3 and v1.1 builders read their own layers",
                        v16.check(root) == [] and v16.state(root) == "applied"
                        and v15.check(root) == [] and v15.state(root) == "applied"
                        and v14.check(root) == [] and v14.state(root) == "applied"
                        and v11.check(root) == []
                        and v11.state(root) == ("applied", frozenset())))
        results.append(("applied: the delta and sibling checks read the peeled v1.6 layer",
                        delta_findings(root, *layers(root)) == []  # type: ignore[misc]
                        and sibling_findings(root, *(x[SPEC] for x in layers(root))) == []))  # type: ignore[union-attr]
        results.append(("second apply refuses", quiet(apply, root) == 2))
        # The distinguishing check: v1.7 bytes with only v1.6 signed.
        results.append(("applied without a v1.7 record: the battery fails",
                        any("v1.7 patches, which no sign-off record covers" in f
                            for f in v10.check(root))
                        and any("v1.7 patches, which no sign-off record covers" in f
                                for f in v16.signed_findings(root))))
        _record_v17(root)
        results.append(("applied with a v1.7 record: signed",
                        signed_findings(root) == [] and battery(root) == []))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        _record_v17(root, digest="f" * 64)
        results.append(("a v1.7 review digest that is not the spec fails",
                        any("not the bytes its review read" in f for f in signed_findings(root))
                        and any("not the bytes its review read" in f for f in v10.check(root))))
        _record_v17(root)
        base_digest = v11.review_digest(root, V16_RECORD)
        v16._record_v16(root, digest="e" * 64)
        results.append(("v1.7 recorded over a v1.6 layer that is not the signed v1.6: fails",
                        any("v1.6 signed bytes" in f and "not the bytes its review read" in f
                            for f in signed_findings(root))
                        and any("v1.6 signed bytes" in f for f in check(root))))
        v16._record_v16(root, digest=base_digest)
        results.append(("restored: signed", signed_findings(root) == [] and battery(root) == []))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.8.md").write_text("Review: x\n")
        results.append(("a later version no builder knows fails",
                        any("has no builder" in f for f in signed_findings(root))
                        and any("has no builder" in f for f in v10.check(root))))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.8.md").unlink()
        spec = (root / SPEC).read_text()
        (root / SPEC).write_text(spec.replace(V17_MARKER, "#### Scenario: edited after v1.7\n"))
        results.append(("applied and signed, then the spec edited: the tree is neither state",
                        state(root) == "neither"
                        and any("not v1.6 plus the v1.7 patches" in f for f in signed_findings(root))))

    # Rule 6: each prose predicate fails when its input is mutated.
    def mutated(name: str, expect: str, mutate) -> None:
        tmp, root = tree()
        with tmp:
            mutate(root)
            results.append((f"mutated: {name}", any(expect in f for f in check(root))))

    def edit_delta(old: str, new: str):
        def go(root: pathlib.Path) -> None:
            text = (root / DELTA).read_text(encoding="utf-8")
            assert old in text, old
            (root / DELTA).write_text(text.replace(old, new, 1), encoding="utf-8")
        return go

    mutated("the affected-ids block hand-edited", "not the computed one",
            edit_delta("scenario added: added in v1.7", "scenario added: something else"))
    mutated("a second affected-ids block", "affected-ids blocks, not one",
            edit_delta("# Fixture delta\n", "# Fixture delta\n\n```affected-ids\nx\n```\n"))
    mutated("a Proposed block that differs from the patch", "do not reproduce the proposed spec.md",
            edit_delta("- THEN j", "- THEN k"))
    mutated("a Current block that is not in the v1.6 bytes", "occurs 0 times",
            edit_delta("Current:\n\n```text\n#### Scenario: added in v1.6",
                       "Current:\n\n```text\n#### Scenario: added in v0.9"))
    mutated("a clause listed twice", "appears twice",
            lambda root: (root / DELTA).write_text((root / DELTA).read_text(encoding="utf-8").replace(
                "### A2 —", "### A1 —", 1), encoding="utf-8"))
    mutated("no delta file", "is absent", lambda root: (root / DELTA).unlink())

    def drop_quote(root: pathlib.Path) -> None:
        # Rewrite the v1.7 spec patch so the sibling-quoted sentence is gone.
        base = (root / SPEC).read_text()
        after = forward(root)
        assert after is not None
        new = after[SPEC].decode().replace(_QUOTED_FIXTURE, "Scenario: reworded in v1.7")
        (root / PROPOSED / "spec.md.patch").write_text(v11._unified(SPEC, base, new))
    mutated("a sentence a sibling change quotes is reworded", "no longer carries", drop_quote)

    def refused(name: str, expect: str, mutate=None, **fixture) -> None:
        tmp, root = tree(**fixture)
        with tmp:
            if mutate:
                mutate(root)
            before = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            code = quiet(apply, root)
            after = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            results.append((f"refused: {name}", code == 2 and before == after
                            and any(expect in f for f in check(root))))

    refused("v1.6 not installed", "not installed", install_v16=False)
    refused("no v1.6 record", "the v1.6 signed bytes are unknown", record_v16=False)
    refused("the v1.6 layer is not the bytes the v1.6 review read",
            "not the bytes its review read", v16_digest="d" * 64)
    refused("a patch missing", "missing patch",
            mutate=lambda root: (root / PROPOSED / "design.md.patch").unlink())
    refused("a post-apply spec with an extra requirement", "expected", extra=True)
    refused("the tree is neither state", "neither v1.6 nor", mutate=lambda root: (
        root / CHANGE / "proposal.md").write_text("Edited.\n"))
    refused("the status page lacks the v1.0 through v1.6 links", "record links",
            mutate=lambda root: (root / STATUS).write_text(
                (root / STATUS).read_text().replace(V16_LINKS, "(links)")))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        (root / PROPOSED / "proposal.md.patch").write_text(v11._unified(
            CHANGE / "proposal.md", "Proposal v1.6.\n", "Proposal v1.7, edited.\n"))
        results.append(("applied, then a patch edited: the tree is neither state",
                        any("neither" in f for f in check(root)) and not applied(root)))
    tmp, root = tree()
    with tmp:
        shutil.rmtree(root / CANDIDATE)
        results.append(("absent package: nothing to verify", check(root) == []))
        _record_v17(root)
        results.append(("absent package with a v1.7 record fails",
                        any("is absent but" in f for f in check(root))
                        and any("package is absent" in f for f in signed_findings(root))))

    failing = 0
    for name, ok in results:
        failing += 0 if ok else 1
        print(f"{'PASS' if ok else 'FAIL'} {name}")
    print(f"{len(results)} fixtures, {failing} failing")
    return 0 if failing == 0 else 1


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    mode.add_argument("--write-subjects", action="store_true",
                      help=f"write {SUBJECTS.as_posix()} from the unapplied tree")
    mode.add_argument("--print-affected-ids", action="store_true",
                      help="print the affected-ids block computed from the v1.6 and v1.7 spec bytes")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.print_affected_ids:
        pair = layers(ROOT)
        if pair is None:
            print(f"REFUSED: the package is {state(ROOT)}; no v1.6/v1.7 pair to compare")
            return 2
        sys.stdout.write(affected_ids(pair[0][SPEC], pair[1][SPEC]))
        return 0
    if args.write_subjects:
        if state(ROOT) != "unapplied":
            print(f"REFUSED: the package is {state(ROOT)}, not unapplied; nothing written")
            return 2
        (ROOT / SUBJECTS).write_text(proposed_subjects(ROOT), encoding="utf-8")
        print(f"wrote {SUBJECTS.as_posix()}")
        return 0
    findings = check(ROOT) + signed_findings(ROOT)
    if findings:
        print("FAILED")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    current = state(ROOT)
    print("OK: the v1.7 package is not present; nothing to verify" if current == "absent"
          else f"OK: the v1.7 package verifies ({current})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
