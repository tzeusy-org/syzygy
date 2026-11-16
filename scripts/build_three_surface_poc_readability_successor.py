#!/usr/bin/env python3
"""Build and verify the inert Three-Surface POC readability successor.

The six signed predecessor artifacts remain unchanged while this is a
candidate. Proposed bytes live as patches under the candidate package. This
builder has no signed-byte write path: only a later independently reviewed
owner-act recorder may implement the atomic successor transaction.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone


ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_three_surface_poc_spec_dependencies as dependencies  # noqa: E402

CHANGE = pathlib.Path("openspec/changes/three-surface-poc-experience")
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/"
    "three-surface-poc-readability-successor"
)
PROPOSED = CANDIDATE / "proposed"
MANIFEST = CANDIDATE / "THREE-SURFACE-POC-READABILITY-SUCCESSOR-MANIFEST.txt"
SEMANTIC_MAP = CANDIDATE / "SEMANTIC-MAP.json"
SERIAL_APPLY_MUTATION = pathlib.Path(
    "scripts/fixtures/three_surface_poc_readability_serial_apply_mutation.json"
)
SPEC = CHANGE / "specs/three-surface-poc-experience/spec.md"
GOVERNING = CHANGE / "GOVERNING-DEPENDENCIES.md"

SUBJECTS = tuple(
    sorted(
        (
            CHANGE / ".openspec.yaml",
            CHANGE / "CONTRACT-COVERAGE.md",
            GOVERNING,
            CHANGE / "design.md",
            CHANGE / "proposal.md",
            SPEC,
        ),
        key=lambda path: path.as_posix(),
    )
)
PATCHED = {GOVERNING, CHANGE / "design.md", CHANGE / "proposal.md", SPEC}
ROW_RE = re.compile(r"^([0-9a-f]{64})  ([^\n]+)$", re.MULTILINE)
TARGET_RE = re.compile(r"^\+\+\+ b/(.+)$", re.MULTILINE)
REQ_RE = re.compile(r"^### Requirement: (POC-REQ-\d{3}) — ([^\n]+)$", re.MULTILINE)
SCENARIO_RE = re.compile(r"^#### Scenario: ([^\n]+)$", re.MULTILINE)
BLOCK_RE = re.compile(
    r"(^### Requirement: (POC-REQ-\d{3}) — [^\n]+\n)([\s\S]*?)"
    r"(?=^### Requirement: |\Z)",
    re.MULTILINE,
)
BODY_RE = re.compile(
    r"^Group: [^\n]+\n\n([\s\S]*?)(?=\n- \*\*Case)", re.MULTILINE
)
WARRANT_RE = re.compile(r"```yaml\n(warrants:[\s\S]*?)\n```", re.MULTILINE)
GROUP_RE = re.compile(r"^Group: ([^\n]+)$", re.MULTILINE)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def current_bytes(
    overrides: dict[pathlib.Path, bytes] | None = None,
) -> dict[pathlib.Path, bytes]:
    overrides = overrides or {}
    installed_bytes = predecessor_bytes() if installed() else {}
    values: dict[pathlib.Path, bytes] = {}
    for rel in SUBJECTS:
        if rel in overrides:
            values[rel] = overrides[rel]
            continue
        if rel in installed_bytes:
            values[rel] = installed_bytes[rel]
            continue
        target = ROOT / rel
        if not target.is_file():
            raise ValueError(f"missing signed subject: {rel}")
        values[rel] = target.read_bytes()
    return values


#: Later version-tagged sign-offs that patch these subjects again, in act
#: order: (sign-off record, that package's manifest, its `proposed/` patches).
LATER_SIGNOFFS = (
    (pathlib.Path(".syzygy/governance/decisions/"
                  "THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-SIGNOFF-v1.0.md"),
     pathlib.Path(".syzygy/governance/contracts/candidates/"
                  "three-surface-poc-block-provenance-amendment/"
                  "THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-MANIFEST.txt"),
     pathlib.Path(".syzygy/governance/contracts/candidates/"
                  "three-surface-poc-block-provenance-amendment/proposed")),
    # No manifest: its sign-off record carries the applied rows in
    # manifest-row form and serves as the manifest.
    (pathlib.Path(".syzygy/governance/decisions/"
                  "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md"),
     pathlib.Path(".syzygy/governance/decisions/"
                  "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md"),
     pathlib.Path(".syzygy/governance/contracts/candidates/"
                  "three-surface-poc-governing-intent-amendment/proposed")),
    (pathlib.Path(".syzygy/governance/decisions/"
                  "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md"),
     pathlib.Path(".syzygy/governance/contracts/candidates/"
                  "three-surface-poc-vocabulary-epistemic-amendment/"
                  "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-MANIFEST.txt"),
     pathlib.Path(".syzygy/governance/contracts/candidates/"
                  "three-surface-poc-vocabulary-epistemic-amendment/proposed")),
    (pathlib.Path(".syzygy/governance/decisions/"
                  "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md"),
     pathlib.Path(".syzygy/governance/contracts/candidates/"
                  "three-surface-poc-governedby-reference-amendment/"
                  "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt"),
     pathlib.Path(".syzygy/governance/contracts/candidates/"
                  "three-surface-poc-governedby-reference-amendment/proposed")),
)


def _reverse(base: pathlib.Path, patch: pathlib.Path, *, zero_context=False) -> None:
    options = ["--unidiff-zero"] if zero_context else []
    done = subprocess.run(
        ["git", "apply", "-R", "--whitespace=nowarn", *options, str(patch)],
        cwd=base, capture_output=True, text=True)
    if done.returncode != 0:
        raise ValueError(f"{patch.name} does not reverse: {done.stderr.strip()}")


def installed_bytes_at(root: pathlib.Path = ROOT) -> dict[pathlib.Path, bytes]:
    """The subjects as this successor installed them.

    The tree with each later sign-off's patches reversed, newest first, but
    only a later sign-off whose record exists and whose every manifest row
    over these subjects the tree (as reached so far) hashes to: an applied
    later sign-off is history, and anything else is left for the row
    comparison to report as drift.
    """
    with tempfile.TemporaryDirectory() as directory:
        base = pathlib.Path(directory)
        for rel in SUBJECTS:
            target = base / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((root / rel).read_bytes())
        for record, manifest, proposed in reversed(LATER_SIGNOFFS):
            is_reference = record.name == "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md"
            if is_reference:
                import prepare_three_surface_poc_governedby_reference_recording as reference
                if not reference.is_signed(root):
                    continue
            if not (root / record).is_file() or not (root / manifest).is_file():
                continue
            rows = {path: sha for sha, path in
                    ROW_RE.findall((root / manifest).read_text(encoding="utf-8"))}
            ours = {rel.as_posix() for rel in SUBJECTS}
            if not rows or not set(rows) <= ours or any(
                    sha256((base / path).read_bytes()) != sha for path, sha in rows.items()):
                continue
            for patch in sorted((root / proposed).glob("*.patch"), key=lambda p: p.name):
                # P115's frozen exact patches use zero-context hunks. Its
                # signed gate above already binds every current subject byte.
                _reverse(base, patch, zero_context=is_reference)
        return {rel: (base / rel).read_bytes() for rel in SUBJECTS}


def predecessor_bytes() -> dict[pathlib.Path, bytes]:
    """The signed predecessor, rebuilt by reverse-applying the exact patches.

    After sign-off the working tree carries the successor rows (and any later
    sign-off's patches, reversed first by ``installed_bytes_at``); the
    candidate checks and fixtures still run over the predecessor.
    """
    with tempfile.TemporaryDirectory() as directory:
        base = pathlib.Path(directory)
        for rel, data in installed_bytes_at().items():
            target = base / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        for patch in patch_files():
            done = subprocess.run(
                ["git", "apply", "-R", "--whitespace=nowarn", str(patch)],
                cwd=base, capture_output=True, text=True)
            if done.returncode != 0:
                raise ValueError(f"{patch.name} does not reverse: {done.stderr.strip()}")
        return {rel: (base / rel).read_bytes() for rel in SUBJECTS}


def patch_files() -> list[pathlib.Path]:
    return sorted((ROOT / PROPOSED).glob("*.patch"), key=lambda path: path.name)


def patch_target(patch: pathlib.Path) -> pathlib.Path:
    match = TARGET_RE.search(patch.read_text(encoding="utf-8"))
    if match is None:
        raise ValueError(f"patch has no target: {patch.relative_to(ROOT)}")
    return pathlib.Path(match.group(1))


def apply_patch(base: pathlib.Path, patch: pathlib.Path) -> tuple[int, str]:
    done = subprocess.run(
        ["git", "apply", "--whitespace=nowarn", str(patch)],
        cwd=base,
        capture_output=True,
        text=True,
    )
    return done.returncode, done.stderr.strip()


def proposed_bytes(
    overrides: dict[pathlib.Path, bytes] | None = None,
    patches: list[pathlib.Path] | None = None,
) -> dict[pathlib.Path, bytes]:
    values = current_bytes(overrides)
    patches = patch_files() if patches is None else patches
    with tempfile.TemporaryDirectory() as directory:
        base = pathlib.Path(directory)
        for rel, body in values.items():
            target = base / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)
        for patch in patches:
            code, error = apply_patch(base, patch)
            if code != 0:
                raise ValueError(f"{patch.name} does not apply: {error}")
        return {rel: (base / rel).read_bytes() for rel in SUBJECTS}


def unified_patch(rel: pathlib.Path, before: bytes, after: bytes) -> str:
    rendered = "".join(
        difflib.unified_diff(
            before.decode().splitlines(keepends=True),
            after.decode().splitlines(keepends=True),
            fromfile=f"a/{rel.as_posix()}",
            tofile=f"b/{rel.as_posix()}",
            n=2,
        )
    )
    return rendered.replace("\n \n", "\n\n")


def regenerated_governing_patch() -> str:
    semantic = [patch for patch in patch_files() if patch_target(patch) != GOVERNING]
    proposed = proposed_bytes(patches=semantic)
    rendered, errors = dependencies.generate(proposed[SPEC].decode())
    if errors or rendered is None:
        raise ValueError("proposed warrants do not validate: " + " | ".join(errors))
    return unified_patch(GOVERNING, current_bytes()[GOVERNING], rendered.encode())


def render_manifest(proposed: dict[pathlib.Path, bytes]) -> str:
    header = (
        "# THREE-SURFACE POC READABILITY SUCCESSOR MANIFEST\n"
        "# Candidate: binds nothing without a later owner successor act.\n"
        "# Six signed artifacts; rows sorted by codepoint path.\n"
        "# Rows hash proposed bytes; predecessor bytes remain unchanged.\n"
    )
    return header + "".join(
        f"{sha256(proposed[rel])}  {rel.as_posix()}\n" for rel in SUBJECTS
    )


def requirement_blocks(text: str) -> dict[str, str]:
    return {match.group(2): match.group(0) for match in BLOCK_RE.finditer(text)}


def normalized_body(block: str, *, proposed: bool) -> str:
    match = BODY_RE.search(block)
    if match is None:
        raise ValueError("requirement has no normative body before Case")
    body = match.group(1)
    if proposed:
        body = body.replace("**Required behavior.** ", "", 1)
        body = body.replace("- **Scope.** ", "Scope of quantification: ", 1)
    return " ".join(
        line.strip() for line in body.splitlines() if line.strip()
    ).strip()


def semantic_findings(proposed: dict[pathlib.Path, bytes]) -> list[str]:
    current = current_bytes()[SPEC].decode()
    successor = proposed[SPEC].decode()
    findings: list[str] = []
    current_ids = REQ_RE.findall(current)
    proposed_ids = REQ_RE.findall(successor)
    if current_ids != proposed_ids or len(current_ids) != 24:
        findings.append("requirement identity/title/order differs from the 24-item predecessor")
    if SCENARIO_RE.findall(current) != SCENARIO_RE.findall(successor):
        findings.append("scenario heading population or order changed")
    old_blocks = requirement_blocks(current)
    new_blocks = requirement_blocks(successor)
    for requirement_id in [item[0] for item in current_ids]:
        old = old_blocks.get(requirement_id)
        new = new_blocks.get(requirement_id)
        if old is None or new is None:
            findings.append(f"missing requirement block: {requirement_id}")
            continue
        if normalized_body(old, proposed=False) != normalized_body(new, proposed=True):
            findings.append(f"normative body words changed: {requirement_id}")
        if GROUP_RE.findall(old) != GROUP_RE.findall(new):
            findings.append(f"group/form changed: {requirement_id}")
        old_tail = old.split("\n- **Case", 1)
        new_tail = new.split("\n- **Case", 1)
        if len(old_tail) != 2 or len(new_tail) != 2 or old_tail[1] != new_tail[1]:
            findings.append(f"case/oracle/scenario content changed: {requirement_id}")
        if WARRANT_RE.findall(old) != WARRANT_RE.findall(new):
            findings.append(f"warrants changed: {requirement_id}")
    if successor.count("**Required behavior.**") != 24:
        findings.append("successor does not carry one answer-first marker per requirement")
    expected_scopes = sum(
        normalized_body(block, proposed=False).count("Scope of quantification:")
        for block in old_blocks.values()
    )
    if successor.count("- **Scope.**") != expected_scopes:
        findings.append("scope-marker population differs from predecessor scope sentences")
    if proposed[CHANGE / ".openspec.yaml"] != current_bytes()[CHANGE / ".openspec.yaml"]:
        findings.append("hidden .openspec.yaml changed")
    if proposed[CHANGE / "CONTRACT-COVERAGE.md"] != current_bytes()[CHANGE / "CONTRACT-COVERAGE.md"]:
        findings.append("contract coverage changed without a mapped semantic movement")
    return findings


def generated_findings(proposed: dict[pathlib.Path, bytes]) -> list[str]:
    rendered, errors = dependencies.generate(proposed[SPEC].decode())
    if errors or rendered is None:
        return ["proposed dependency generation failed: " + " | ".join(errors)]
    return [] if proposed[GOVERNING].decode() == rendered else [
        "proposed GOVERNING-DEPENDENCIES differs from regeneration"
    ]


def manifest_findings(proposed: dict[pathlib.Path, bytes], actual: str) -> list[str]:
    findings: list[str] = []
    if actual != render_manifest(proposed):
        findings.append("manifest differs from proposed-byte regeneration")
    rows = ROW_RE.findall(actual)
    if len(rows) != 6 or [path for _digest, path in rows] != [
        rel.as_posix() for rel in SUBJECTS
    ]:
        findings.append("manifest path population/order is not the signed six")
    return findings


def semantic_map_findings(value: object | None = None) -> list[str]:
    findings: list[str] = []
    if value is None:
        try:
            value = json.loads((ROOT / SEMANTIC_MAP).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            return [f"semantic map is missing or invalid: {error}"]
    if not isinstance(value, dict):
        return ["semantic map is not an object"]
    rows = value.get("requirements")
    expected = [item[0] for item in REQ_RE.findall(current_bytes()[SPEC].decode())]
    if not isinstance(rows, list):
        findings.append("semantic map has no requirement rows")
    else:
        actual = [row.get("id") for row in rows if isinstance(row, dict)]
        if actual != expected or len(actual) != len(rows):
            findings.append("semantic map does not cover the ordered 24-ID population")
        if any(row.get("classification") != "meaning-preserved"
               for row in rows if isinstance(row, dict)):
            findings.append("semantic map carries a non-preserved requirement classification")
    if value.get("semantic_changes") != []:
        findings.append("semantic map carries an undisclosed semantic-change population")
    if value.get("baseline") != "3c915991fbb0eebc38f8daaaea4d05679914b6b8":
        findings.append("semantic map baseline is not the dispatched exact head")
    return findings


def check(
    patches: list[pathlib.Path] | None = None,
) -> tuple[list[str], dict[pathlib.Path, bytes] | None]:
    patches = patch_files() if patches is None else patches
    findings: list[str] = []
    try:
        targets = [patch_target(patch) for patch in patches]
    except ValueError as error:
        return [str(error)], None
    if set(targets) != PATCHED or len(targets) != len(PATCHED):
        findings.append("patch targets differ from the closed four-subject population")
    try:
        proposed = proposed_bytes(patches=patches)
    except ValueError as error:
        return findings + [str(error)], None
    findings.extend(semantic_findings(proposed))
    findings.extend(generated_findings(proposed))
    findings.extend(semantic_map_findings())
    if not (ROOT / MANIFEST).is_file():
        findings.append(f"missing manifest: {MANIFEST}")
    else:
        findings.extend(manifest_findings(
            proposed, (ROOT / MANIFEST).read_text(encoding="utf-8")
        ))
    return findings, proposed


def installed() -> bool:
    """True once every signed subject carries its manifest row (after sign-off)."""
    if not (ROOT / MANIFEST).is_file():
        return False
    rows = {path: digest for digest, path in
            ROW_RE.findall((ROOT / MANIFEST).read_text(encoding="utf-8"))}
    try:
        reached = {rel.as_posix(): sha256(data) for rel, data in installed_bytes_at().items()}
    except ValueError:
        return False
    return rows == reached and bool(rows)


def subject_digests(base: pathlib.Path) -> dict[str, str]:
    return {
        rel.as_posix(): sha256((base / rel).read_bytes())
        for rel in SUBJECTS
    }


def load_serial_apply_mutation() -> dict[str, object]:
    value = json.loads((ROOT / SERIAL_APPLY_MUTATION).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("serial-apply mutation fixture is not an object")
    if value.get("sourceCommit") != "5db2853e1613d34940e6c33aeb7eaf39a04de98c":
        raise ValueError("serial-apply mutation fixture lost its historical source commit")
    return value


def historical_source_exactness(
    mutation: dict[str, object],
) -> tuple[bool | None, str | None]:
    """Whether the fixture's replacements rebuild the historical source.

    Provenance only: a rebase-merge leaves the recorded commit reachable from
    no ref, so a checkout without it reports None rather than failing. The
    regression itself (current CLI refuses; the restored serial apply writes
    partially) needs no history and always runs.
    """
    source_commit = mutation.get("sourceCommit")
    source_file = mutation.get("file")
    if not isinstance(source_commit, str) or not isinstance(source_file, str):
        raise ValueError("serial-apply mutation fixture has no historical source")
    done = subprocess.run(
        ["git", "show", f"{source_commit}:{source_file}"],
        cwd=ROOT,
        capture_output=True,
    )
    if done.returncode != 0:
        return None, None
    source = done.stdout.decode()
    replacements = mutation.get("sourceReplacements")
    if not isinstance(replacements, list) or not replacements:
        raise ValueError("serial-apply mutation fixture has no source replacements")
    exact = all(
        isinstance(replacement, dict)
        and isinstance(replacement.get("new"), str)
        and source.count(replacement["new"]) == 1
        for replacement in replacements
    )
    return exact, sha256(done.stdout)


def prepare_cli_scratch(
    base: pathlib.Path,
    mutation: dict[str, object],
    *,
    restore_serial_apply: bool,
) -> None:
    copied = [MANIFEST, SEMANTIC_MAP, SERIAL_APPLY_MUTATION]
    copied.extend(
        pathlib.Path("scripts") / name
        for name in (
            "build_capability_1_spec_dependencies.py",
            "build_three_surface_poc_readability_successor.py",
            "build_three_surface_poc_spec_dependencies.py",
        )
    )
    copied.extend(patch.relative_to(ROOT) for patch in patch_files())
    for rel in copied:
        target = base / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, target)
    # The candidate-state subjects: the predecessor, rebuilt after sign-off.
    for rel, data in current_bytes().items():
        target = base / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)

    corruption = mutation.get("patchCorruption")
    if not isinstance(corruption, dict):
        raise ValueError("serial-apply mutation fixture has no patch corruption")
    patch_rel = pathlib.Path(str(corruption.get("file")))
    patch_path = base / patch_rel
    patch_text = patch_path.read_text(encoding="utf-8")
    old = str(corruption.get("old"))
    new = str(corruption.get("new"))
    if patch_text.count(old) != 1:
        raise ValueError("late-patch corruption fragment must occur exactly once")
    patch_path.write_text(patch_text.replace(old, new, 1), encoding="utf-8")

    if restore_serial_apply:
        builder = base / "scripts/build_three_surface_poc_readability_successor.py"
        source = builder.read_text(encoding="utf-8")
        replacements = mutation.get("sourceReplacements")
        if not isinstance(replacements, list) or not replacements:
            raise ValueError("serial-apply mutation fixture has no source replacements")
        for replacement in replacements:
            if not isinstance(replacement, dict):
                raise ValueError("serial-apply mutation replacement is not an object")
            old = str(replacement.get("old"))
            new = str(replacement.get("new"))
            if source.count(old) != 1:
                raise ValueError("serial-apply source fragment must occur exactly once")
            source = source.replace(old, new, 1)
        builder.write_text(source, encoding="utf-8")

    subprocess.run(["git", "init", "--quiet"], cwd=base, check=True)


def run_cli_apply_regression(
    mutation: dict[str, object],
    *,
    restore_serial_apply: bool,
) -> dict[str, object]:
    with tempfile.TemporaryDirectory() as directory:
        base = pathlib.Path(directory)
        prepare_cli_scratch(
            base,
            mutation,
            restore_serial_apply=restore_serial_apply,
        )
        before = subject_digests(base)
        command = mutation.get("command")
        if not isinstance(command, list) or not all(isinstance(arg, str) for arg in command):
            raise ValueError("serial-apply mutation command is invalid")
        done = subprocess.run(
            [sys.executable, "scripts/build_three_surface_poc_readability_successor.py", *command],
            cwd=base,
            capture_output=True,
            text=True,
        )
        after = subject_digests(base)
    changed = [path for path in before if before[path] != after[path]]
    predicate = done.returncode != 0 and not changed
    return {
        "exit": done.returncode,
        "stdout": done.stdout,
        "stderr": done.stderr,
        "before": before,
        "after": after,
        "changedSubjects": changed,
        "predicateHeld": predicate,
    }


def cli_apply_regression() -> tuple[bool, dict[str, object]]:
    mutation = load_serial_apply_mutation()
    historical_exact, historical_source_sha256 = historical_source_exactness(mutation)
    current = run_cli_apply_regression(mutation, restore_serial_apply=False)
    historical = run_cli_apply_regression(mutation, restore_serial_apply=True)
    expected_historical_changes = [
        GOVERNING.as_posix(),
        (CHANGE / "design.md").as_posix(),
        (CHANGE / "proposal.md").as_posix(),
    ]
    custom_refusal_control = dict(current)
    custom_refusal_control["stdout"] = "refusing: owner act and atomic recorder are absent\n"
    custom_refusal_control["stderr"] = ""
    def refusal_oracle(result: dict[str, object]) -> bool:
        return (
            result["exit"] == 2
            and result["predicateHeld"] is True
            and result["changedSubjects"] == []
        )
    caught = (
        historical_exact is not False
        and refusal_oracle(current)
        and refusal_oracle(custom_refusal_control)
        and historical["exit"] == 1
        and historical["predicateHeld"] is False
        and historical["changedSubjects"] == expected_historical_changes
    )
    return caught, {
        "mutation": mutation,
        "current": current,
        "customRefusalControl": custom_refusal_control,
        "historicalSerialApply": historical,
        "historicalSourceExact": historical_exact,
        "historicalSourceSha256": historical_source_sha256,
        "expectedHistoricalChangedSubjects": expected_historical_changes,
        "outcome": "killed" if caught else "survived",
    }


def selftest(evidence_path: pathlib.Path | None = None) -> int:
    findings, proposed = check()
    if findings or proposed is None:
        print("SELFTEST PRECONDITION FAILED:")
        for finding in findings:
            print(f"  {finding}")
        return 1
    cases: list[tuple[str, bool]] = []
    mutations = {
        "missing answer marker": (b"**Required behavior.** ", b""),
        "changed modal": (b" SHALL ", b" MAY "),
        "duplicate requirement id": (b"POC-REQ-002", b"POC-REQ-001"),
        "changed warrant": (b"primary: VIS-2", b"primary: VIS-1"),
        "changed scenario outcome": (b"renders that item", b"hides that item"),
    }
    for name, (old, new) in mutations.items():
        mutated = dict(proposed)
        mutated[SPEC] = proposed[SPEC].replace(old, new, 1)
        cases.append((name, bool(semantic_findings(mutated))))
    wrong_generated = dict(proposed)
    wrong_generated[GOVERNING] += b"drift\n"
    cases.append(("generated dependency drift", bool(generated_findings(wrong_generated))))
    stale = render_manifest(proposed).replace(sha256(proposed[SPEC]), "0" * 64, 1)
    cases.append(("stale manifest", bool(manifest_findings(proposed, stale))))
    partial, _ = check([patch for patch in patch_files() if patch_target(patch) != GOVERNING])
    cases.append(("partial patch population", bool(partial)))
    semantic_map = json.loads((ROOT / SEMANTIC_MAP).read_text(encoding="utf-8"))
    semantic_map["requirements"] = semantic_map["requirements"][:-1]
    cases.append(("incomplete semantic map", bool(semantic_map_findings(semantic_map))))
    cli_caught, cli_evidence = cli_apply_regression()
    cases.append(("public CLI refusal kills historical serial apply", cli_caught))
    cases.append(("deterministic regeneration", proposed_bytes() == proposed_bytes()))
    failed = [name for name, caught in cases if not caught]
    for name, caught in cases:
        print(f"selftest: {name}: {'caught' if caught else 'SURVIVED'}")
    if failed:
        print("SELFTEST FAILED: " + ", ".join(failed))
        return 1
    if evidence_path is not None:
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout
        if status:
            print("SELFTEST EVIDENCE REFUSED: mutation run requires a clean committed tree")
            return 1
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        ).stdout.strip()
        mutation = cli_evidence["mutation"]
        assert isinstance(mutation, dict)
        corruption = mutation["patchCorruption"]
        replacements = mutation["sourceReplacements"]
        assert isinstance(corruption, dict)
        assert isinstance(replacements, list)
        mutation_records = [{
            "id": f"{mutation['id']}:late-patch-corruption",
            "file": corruption["file"],
            "old": corruption["old"],
            "new": corruption["new"],
            "sourceCommit": mutation["sourceCommit"],
        }]
        mutation_records.extend({
            "id": f"{mutation['id']}:serial-source-{index}",
            "file": mutation["file"],
            "old": replacement["old"],
            "new": replacement["new"],
            "sourceCommit": mutation["sourceCommit"],
        } for index, replacement in enumerate(replacements, 1))
        evidence = {
            "kind": "three-surface-poc-readability-cli-rule-6-mutation-evidence",
            "capturedAt": datetime.now(timezone.utc).isoformat(),
            "testedCommit": commit,
            "method": (
                "The public CLI ran in two isolated scratch repositories with the exact "
                "final-patch corruption recorded below. The current builder had to reject "
                "the removed apply command with exit 2 and all six signed subjects "
                "byte-identical; stderr wording was not part of the oracle. Each recorded "
                "serial-writer new fragment was independently required to occur exactly "
                "once in sourceCommit before those historical fragments were restored; "
                "that mutant had to change the first three subjects before the corrupted "
                "final patch failed. No live signed subject was written."
            ),
            "mutations": mutation_records,
            **cli_evidence,
        }
        evidence_path.parent.mkdir(parents=True, exist_ok=True)
        evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
        print(f"selftest evidence: {evidence_path}")
    print(f"selftest: {len(cases)} candidate predicates fail closed")
    return 0


def write() -> int:
    governing = ROOT / PROPOSED / "GOVERNING-DEPENDENCIES.md.patch"
    governing.write_text(regenerated_governing_patch(), encoding="utf-8")
    proposed = proposed_bytes()
    (ROOT / MANIFEST).write_text(render_manifest(proposed), encoding="utf-8")
    print(f"wrote {governing.relative_to(ROOT)} and {MANIFEST}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--diff", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--selftest-evidence", type=pathlib.Path)
    args = parser.parse_args(argv)
    if args.selftest_evidence is not None and not args.selftest:
        parser.error("--selftest-evidence requires --selftest")
    if args.selftest:
        return selftest(args.selftest_evidence)
    if args.write:
        return write()
    if args.diff:
        for patch in patch_files():
            print(patch.read_text(encoding="utf-8"), end="")
        return 0
    if not args.check:
        print("refusing: choose --check, --selftest, --diff or --write")
        return 2
    if installed():
        print("three-surface POC readability successor installed: all 6 signed "
              "subjects carry their manifest rows")
        return 0
    findings, proposed = check()
    if findings:
        print("THREE-SURFACE POC READABILITY CANDIDATE FINDINGS:")
        for finding in findings:
            print(f"  {finding}")
        return 1
    assert proposed is not None
    print("three-surface POC readability candidate matches 6 proposed subjects "
          "(4 patched, 2 unchanged); 24 requirement bodies preserve their words")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
