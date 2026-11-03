#!/usr/bin/env python3
"""Read-only P115 candidate/recording preparation; never signs or installs.

Candidate checks inspect the real adopted subjects. Signed checks require the
exact actual transaction and current rows before replaying the frozen builder
in an owned full clone of its pre-signature tree. --preview is P115-only.
"""
from __future__ import annotations

import argparse
import contextlib
import datetime
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
KEY = "three-surface-poc-governedby-reference-amendment"
VERSION = "1.0"
CORE_COMMIT = "da9fde040ec188612310549782fccc0227869c79"
BASE = "4504514c019ca0ee0cb4a89ed97445a0bad21915"
CANDIDATE = Path(".syzygy/governance/contracts/candidates") / KEY
BUILDER = Path("scripts/build_three_surface_poc_governedby_reference_amendment.py")
COMPATIBILITY = Path("scripts/check_p115_compatibility_examples.py")
MANIFEST = CANDIDATE / "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt"
MANIFEST_SHA256 = "77e53d37ac42c5db4edb4f99d76d937629df5a80d370ac47751c0e62f27270bd"
RECORD = Path(".syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md")
AGGREGATE = Path(".syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md")
MARKER = f"<!-- versioned-signoff:{KEY}:v{VERSION} -->"
END_MARKER = f"<!-- /versioned-signoff:{KEY}:v{VERSION} -->"
BASE_RECORD = Path(".syzygy/governance/decisions/THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md")
PREDECESSORS = (
    "three-surface-poc-block-provenance-amendment",
    "three-surface-poc-governing-intent-amendment",
    "three-surface-poc-vocabulary-epistemic-amendment",
)
CHANGE = Path("openspec/changes/three-surface-poc-experience")
SUBJECTS = tuple(CHANGE / p for p in (
    ".openspec.yaml", "CONTRACT-COVERAGE.md", "GOVERNING-DEPENDENCIES.md",
    "design.md", "proposal.md", "specs/three-surface-poc-experience/spec.md"))
ROW = re.compile(r"^([0-9a-f]{64})  ([^\n]+)$", re.M)


def git(root: Path, *args: str) -> bytes:
    return subprocess.run(["git", "-C", str(root), *args], check=True,
                          capture_output=True).stdout


def digest(body: bytes) -> str:
    return hashlib.sha256(body).hexdigest()


def core_paths(root: Path) -> list[str]:
    paths = git(root if (root / ".git").exists() else ROOT, "diff", "--name-only", "-z", BASE, CORE_COMMIT).decode().split("\0")
    paths = [p for p in paths if p]
    if not paths or any(not (p.startswith(CANDIDATE.as_posix() + "/")
                            or p in {BUILDER.as_posix(), COMPATIBILITY.as_posix()}) for p in paths):
        raise ValueError("frozen core path population is outside the P115 package and two frozen scripts")
    return paths


def core_findings(root: Path) -> list[str]:
    findings = []
    for path in core_paths(root):
        target = root / path
        expected = git(root if (root / ".git").exists() else ROOT, "show", f"{CORE_COMMIT}:{path}")
        if not target.is_file() or target.read_bytes() != expected:
            findings.append(f"frozen P115 core differs: {path}")
    return findings


def manifest_rows(root: Path) -> list[tuple[str, str]]:
    body = (root / MANIFEST).read_bytes()
    if digest(body) != MANIFEST_SHA256:
        raise ValueError("P115 manifest FILE digest differs from the frozen subject")
    rows = ROW.findall(body.decode())
    if [path for _sha, path in rows] != [p.as_posix() for p in SUBJECTS]:
        raise ValueError("P115 manifest must name exactly the six subjects in order")
    return rows


def applied_rows_match(root: Path) -> bool:
    """Recorder post-apply postcondition; this alone is NOT owner authority."""
    try:
        return all((root / path).is_file() and digest((root / path).read_bytes()) == sha
                   for sha, path in manifest_rows(root))
    except (OSError, ValueError):
        return False


def family_snapshot(root: Path) -> dict:
    """Closed leaf observation; never follow nonregular reserved entries.

    File grammar is every immediate name starting with the exact reserved
    stem, before extension/version normalization. Delimiter grammar is the
    case-sensitive exact package token with a colon/space/>/end boundary.
    Missing or unreadable evidence raises; it never establishes absence.
    """
    files = {}
    for path in sorted((root / RECORD.parent).iterdir()):
        if path.name.startswith("THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF"):
            kind = path.lstat().st_mode
            files[path.name] = {"kind": "regular" if stat.S_ISREG(kind) else "nonregular",
                                "body": path.read_bytes() if stat.S_ISREG(kind) else None}
    path = root / AGGREGATE
    if not stat.S_ISREG(path.lstat().st_mode):
        raise ValueError("P115 aggregate is not a regular nonsymlink file")
    return {"files": files, "aggregate": path.read_bytes()}


def operative_markers(body: str, markers: tuple[str, ...]) -> dict[str, list[int]]:
    """Conservative standalone marker eligibility, retaining raw offsets.

    Exact whole-line markers exclude indentation, prefix and suffix text.
    Up-to-three-space fences and nested comments retain their exact grammar.
    Finite HTML example/raw contexts are excluded in source order, including
    quoted/multiline tags and successive close/reopen transitions. Ambiguous
    contexts refuse later markers. This is not a general HTML/Markdown parser;
    raw family tokens never disappear from the independent occurrence census.
    """
    positions = {marker: [] for marker in markers}
    containers = {"pre", "code", "listing", "template"}
    raw_tags = {"script", "style", "textarea", "title", "xmp", "iframe", "noembed", "noframes"}
    terminal_tags = {"plaintext", "noscript"}  # No portable later closure proves eligibility.
    tag_start = re.compile(r"</?([A-Za-z][A-Za-z0-9:-]*)(?=[ \t\n\f\r/>]|$)")
    tag = re.compile(r"</?([A-Za-z][A-Za-z0-9:-]*)(?=[ \t\n\f\r/>])(?:[^'\">]|'[^']*'|\"[^\"]*\")*>")
    special = re.compile(r"<!--|-->|<")
    script_open = re.compile(r"<script(?=[ \t\n\f\r/>]|$)", re.I)
    fence, contexts = None, []
    comments, offset, consumed = 0, 0, 0
    ambiguous = False
    # CommonMark physical endings are CRLF, lone CR or LF. Other Unicode
    # whitespace stays in its original slice; no normalization changes offsets.
    for physical in re.finditer(r"[^\r\n]*(?:\r\n|\r|\n|$)", body):
        raw = physical[0]
        if not raw:
            continue
        line = raw.rstrip("\r\n")
        match = re.fullmatch(r" {0,3}(`{3,}|~{3,})(.*)", line)
        if fence is not None:
            if (match and match[1][0] == fence[0] and len(match[1]) >= fence[1]
                    and not match[2].strip(" \t")):
                fence = None
            offset += len(raw)
            continue
        if not contexts and comments == 0 and consumed <= offset and match:
            fence = (match[1][0], len(match[1]))
            offset += len(raw)
            continue
        if not ambiguous and not contexts and comments == 0 and consumed <= offset and line in positions:
            positions[line].append(offset)
        cursor, end = max(offset, consumed), offset + len(raw)
        while cursor < end and not ambiguous:
            token_start = special.search(body, cursor, end)
            if token_start is None:
                break
            cursor = token_start.start()
            active_raw = contexts[-1] if contexts and contexts[-1] in raw_tags else None
            if active_raw is None:
                if body.startswith("<!--", cursor):
                    comments += 1
                    cursor += 4
                    continue
                if body.startswith("-->", cursor):
                    comments = max(0, comments - 1)
                    cursor += 3
                    continue
                if comments:
                    cursor += 1
                    continue
            elif active_raw == "script" and (body.startswith("<!--", cursor)
                    or script_open.match(body, cursor)):
                # Script escaped/double-escaped tokenizer states are outside
                # this finite grammar; never guess that a later close escapes.
                ambiguous = True
                continue
            opening = tag_start.match(body, cursor)
            if opening is None or (active_raw is not None and not (
                    body.startswith("</", cursor) and opening[1].lower() == active_raw)):
                cursor += 1
                continue
            token = tag.match(body, cursor)
            if token is None:
                ambiguous = True  # Incomplete/quoted tag text cannot admit later markers.
                continue
            name, closing = token[1].lower(), body.startswith("</", cursor)
            if name in terminal_tags:
                ambiguous = True
            elif name in containers | raw_tags:
                if not closing:
                    contexts.append(name)  # Non-void <pre/> etc. are not proven closed.
                elif contexts and contexts[-1] == name:
                    contexts.pop()
                else:
                    ambiguous = True
            consumed = cursor = token.end()
        offset += len(raw)
    return positions


def family_state(root: Path) -> tuple[str, list[str]]:
    """ABSENT, PRESENT_INVALID/Unknown, or canonical population; no authority."""
    try:
        population = family_snapshot(root)
        files, body = population["files"], population["aggregate"].decode("utf-8")
        occurrences = list(re.finditer(
            r"versioned-signoff\s*:\s*" + re.escape(KEY) + r"(?=[:\s>]|$)", body))
        if not files and not occurrences:
            return "ABSENT", []
        findings = []
        if set(files) != {RECORD.name} or any(row["kind"] != "regular" for row in files.values()):
            findings.append("P115 family supports only one regular canonical v1.0 dedicated filename")
        comments = list(re.finditer(r"<!--.*?-->", body, re.S))
        operative = operative_markers(body, (MARKER, END_MARKER))
        delimiters = []
        for occurrence in occurrences:
            enclosing = [comment for comment in comments
                         if comment.start() <= occurrence.start() < occurrence.end() <= comment.end()]
            if len(enclosing) != 1 or enclosing[0].group() not in (MARKER, END_MARKER):
                findings.append("P115 family contains an unsupported, alias, naked or malformed delimiter")
            elif enclosing[0].start() not in operative[enclosing[0].group()]:
                findings.append("P115 family marker is not an operative standalone line outside code and nested comments")
            else:
                delimiters.append(enclosing[0].group())
        if delimiters != [MARKER, END_MARKER] or len(occurrences) != 2:
            findings.append("P115 family requires exactly one ordered balanced canonical v1.0 block")
        return ("PRESENT_INVALID", findings) if findings else ("CANONICAL_POPULATION", [])
    except (OSError, ValueError, UnicodeError) as exc:
        return "PRESENT_INVALID", ["P115 family population is Unknown: " + str(exc)]


def transaction_present(root: Path) -> bool:
    """Malformed/indeterminate family presence cannot disappear as absent."""
    return family_state(root)[0] != "ABSENT"


def chain_findings(root: Path, prospective_date: str | None = None, *,
                   predecessors_only: bool = False) -> list[str]:
    """Leaf validation of this exact frozen POC chain, never later-row readers.

    Complete predecessor records are immutable C4 inputs. Their regenerated
    blocks must be unique, balanced and wholly before the next complete block.
    The prospective arm checks the append position before any recording write.
    """
    state, findings = family_state(root)
    if findings:
        return findings
    if (prospective_date is not None or predecessors_only) and state != "ABSENT":
        return ["P115 prospective chain requires an absent transaction family"]
    import record_versioned_signoff as recorder
    aggregate = (root / AGGREGATE).read_text()
    objects = root if (root / ".git").exists() else ROOT
    packages = recorder.real_packages()

    def fail(message):
        raise ValueError("P115 signed chain: " + message)

    def calendar(text):
        dates = re.findall(r"^Date: (.+)$", text, re.M)
        if len(dates) != 1 or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", dates[0]):
            fail("record must carry exactly one calendar Date line")
        return datetime.date.fromisoformat(dates[0])

    def block_position(start, end, block):
        if aggregate.count(start) != 1 or aggregate.count(end) != 1:
            fail("each begin/end delimiter must occur exactly once")
        begin, finish = aggregate.index(start), aggregate.index(end) + len(end)
        operative = operative_markers(aggregate, (start, end))
        if operative[start] != [begin] or operative[end] != [finish - len(end)]:
            fail("each begin/end delimiter must be an operative standalone line outside code and nested comments")
        if finish <= begin or aggregate[begin:finish] != block.rstrip("\n"):
            fail("delimiters must enclose the complete regenerated block")
        return begin, finish

    def frozen_record(path):
        body = (root / path).read_bytes()
        if body != git(objects, "show", f"{CORE_COMMIT}:{path.as_posix()}"):
            fail(f"frozen predecessor record differs: {path}")
        return body.decode()

    try:
        baseline = frozen_record(BASE_RECORD)
        instants = re.findall(r"^Act instant: (.+)$", baseline, re.M)
        if len(instants) != 1:
            fail("baseline must carry exactly one act instant")
        previous_date = datetime.datetime.strptime(instants[0], "%Y-%m-%dT%H:%M:%SZ").date()
        start = "<!-- THREE-SURFACE-POC-READABILITY-SUCCESSOR:BEGIN -->"
        end = "<!-- THREE-SURFACE-POC-READABILITY-SUCCESSOR:END -->"
        _begin, previous_end = block_position(start, end, start + "\n" + baseline + end)
        for key in (*PREDECESSORS, *((KEY,) if prospective_date is None and not predecessors_only else ())):
            pkg = packages[key]
            path = recorder.record_rel(pkg, VERSION)
            body = (root / path).read_text() if key == KEY else frozen_record(path)
            date = calendar(body)
            fields = recorder.parse_record(body)
            disposition = None if fields["Disposition"] == "none" else fields["Disposition"]
            block = recorder.render_aggregate(pkg, VERSION, fields["Date"], fields["Review"],
                                              fields["Review verdict"], disposition)
            begin, finish = block_position(*recorder.block_markers(pkg, VERSION), block)
            if begin <= previous_end:
                fail(f"complete block does not follow its predecessor: {key}")
            if date < previous_date:
                fail(f"date precedes its predecessor: {key}")
            previous_end, previous_date = finish, date
        if prospective_date is not None:
            date = calendar("Date: " + prospective_date)
            if date < previous_date:
                fail("prospective date precedes its predecessor")
        return []
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        return [str(exc)]


def builder_run(root: Path, mode: str) -> tuple[list[str], str]:
    done = subprocess.run([sys.executable, str(root / BUILDER), mode], cwd=root,
                          capture_output=True, text=True)
    output = done.stdout + done.stderr
    return ([] if done.returncode == 0 else [f"frozen P115 builder {mode} failed: {output.strip()}"]), output



def governing_inputs(root: Path) -> tuple[tuple[str, str], ...]:
    """Names and baseline hashes come only from the immutable C4 object."""
    objects = root if (root / ".git").exists() else ROOT
    path = CANDIDATE / "evidence/source-return/SOURCE-BINDINGS.json"
    data = json.loads(git(objects, "show", f"{CORE_COMMIT}:{path.as_posix()}"))
    rows = tuple((row["path"], row["sha256"]) for row in data["bindings"]
                 if row.get("path", "").startswith("openspec/changes/"))
    if (data["baseline"] != BASE or len(rows) != 8 or len({p for p, _sha in rows}) != 8
            or any(not p.endswith("/spec.md") or ".." in Path(p).parts
                   or not re.fullmatch(r"[0-9a-f]{64}", sha) for p, sha in rows)):
        raise ValueError("frozen P115 governing input population differs from eight baseline specifications")
    return rows


def governing_input_findings(root: Path, *, proposed_poc: bool = False) -> list[str]:
    """Current evidence only; a byte match never establishes owner authority.

    The strict signed leaf separately validates the entire transaction. Only
    inside that branch may the intended POC spec use its proposed manifest row.
    Reconciliation snapshots are checked at their own supplied root too.
    """
    expected = dict(governing_inputs(root))
    if proposed_poc:
        expected[SUBJECTS[-1].as_posix()] = next(
            sha for sha, path in manifest_rows(root) if path == SUBJECTS[-1].as_posix())
    findings = []
    for path, sha in expected.items():
        target = root / path
        try:
            # A symlinked parent must not redirect a newly captured source read.
            parent = root
            for part in Path(path).parts[:-1]:
                parent /= part
                if not stat.S_ISDIR(parent.lstat().st_mode):
                    raise ValueError("parent is not a nonsymlink directory")
            if not stat.S_ISREG(target.lstat().st_mode):
                raise ValueError("not a regular nonsymlink file")
            if digest(target.read_bytes()) != sha:
                findings.append(f"current P115 governing input differs: {path}")
        except (OSError, ValueError) as error:
            findings.append(f"current P115 governing input unavailable: {path}: {error}")
    return findings


def candidate_findings(root: Path) -> list[str]:
    state, findings = family_state(root)
    if state != "ABSENT":
        return findings or ["P115 candidate requires an absent transaction family"]
    findings = core_findings(root)
    manifest_rows(root)
    findings.extend(governing_input_findings(root))
    if not findings:
        problems, _output = builder_run(root, "--check")
        findings.extend(problems)
    return findings


def consumption_unknowns(root: Path) -> int:
    entries = json.loads((root / CANDIDATE / "REQUIREMENT-CONSUMPTION.json").read_text())["entries"]
    return sum(entry["classification"] == "undecidable" for entry in entries)


def recording_findings(root: Path) -> list[str]:
    """The future recorder must not bypass the packet's unresolved-impact gate."""
    findings = candidate_findings(root)
    count = consumption_unknowns(root)
    if count:
        findings.append(f"recording/offer remains gated by {count} undecidable requirement-consumption entries")
    return findings


def binding_findings(root: Path) -> list[str]:
    """Canonical record checks plus frozen review binding and exact current rows.

    This nonrecursive leaf calls neither recorder.check nor signed_findings.
    P115's Package.applied uses only applied_rows_match, never later readers.
    """
    try:
        state, findings = family_state(root)
        if state != "CANONICAL_POPULATION":
            return findings or ["P115 dedicated sign-off record is absent"]
        findings = core_findings(root)
        findings.extend(governing_input_findings(root, proposed_poc=True))
        count = consumption_unknowns(root)
        if count:
            findings.append(f"signed recognition remains gated by {count} undecidable requirement-consumption entries")
        if not (root / RECORD).is_file():
            return findings + ["P115 dedicated sign-off record is absent"]
        if not applied_rows_match(root):
            findings.append("P115 signed six current subjects do not match the frozen manifest")
        if findings:
            return findings
        findings.extend(chain_findings(root))
        if findings:
            return findings
        import record_versioned_signoff as recorder
        pkg = recorder.real_packages()[KEY]
        fields = recorder.parse_record((root / RECORD).read_text())
        disposition = None if fields["Disposition"] == "none" else fields["Disposition"]
        for value in (fields["Review"], disposition):
            if value is not None and (Path(value).is_absolute() or ".." in Path(value).parts):
                return ["P115 evidence path must stay inside the repository"]
        reviewed, _verdict = recorder.validate_review(root, fields["Review"], disposition)
        recorder.review_binds(root, pkg, fields["Review"])
        # Reconciliation snapshots carry no .git. Their object source is this
        # tool's repository, but every compared file remains the snapshot's own.
        objects = root if (root / ".git").exists() else ROOT
        for path in core_paths(root):
            try:
                reviewed_body = git(objects, "show", f"{reviewed}:{path}")
            except subprocess.CalledProcessError:
                findings.append(f"reviewed commit does not carry the frozen P115 core: {path}")
                continue
            if reviewed_body != (root / path).read_bytes():
                findings.append(f"reviewed commit does not carry the frozen P115 core: {path}")
        if findings:
            return findings
        recorder.extension_present(root, pkg)
        return []
    except (OSError, ValueError, KeyError, TypeError) as exc:
        return [str(exc)]


def signed_findings(root: Path) -> list[str]:
    """Shared strict bindings plus the existing exact record regeneration."""
    findings = binding_findings(root)
    if findings:
        return findings
    import record_versioned_signoff as recorder
    pkg = recorder.real_packages()[KEY]
    output = io.StringIO()
    with contextlib.redirect_stdout(output):
        code = recorder.check(root, pkg, VERSION)
    return [] if code == 0 else [output.getvalue().strip()]


def is_signed(root: Path) -> bool:
    """Only this exact valid transaction can explain earlier subject rows."""
    if not transaction_present(root):
        return False
    try:
        return not signed_findings(root)
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError):
        return False


def validation_inputs(root: Path) -> set[str]:
    """Exact additional inputs needed by reconciliation's read-only snapshots."""
    population = family_snapshot(root)
    if any(row["kind"] != "regular" for row in population["files"].values()):
        raise ValueError("P115 validation snapshot refuses a nonregular reserved-family entry")
    paths = {(RECORD.parent / name).as_posix() for name in population["files"]}
    paths |= {path for path, _sha in governing_inputs(root)}
    paths |= set(core_paths(root)) | {RECORD.as_posix(), AGGREGATE.as_posix(),
        BASE_RECORD.as_posix(),
        ".syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md",
        ".syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md"}
    paths.update((Path(".syzygy/governance/decisions") /
                  (key.upper() + "-SIGNOFF-v1.0.md")).as_posix() for key in PREDECESSORS)
    if (root / RECORD).is_file():
        for name in ("Review", "Disposition"):
            values = re.findall(rf"^{name}: (.+)$", (root / RECORD).read_text(), re.M)
            if len(values) == 1 and values[0] != "none":
                path = Path(values[0])
                if path.is_absolute() or ".." in path.parts:
                    raise ValueError("P115 evidence path must stay inside the repository")
                paths.add(path.as_posix())
    return paths


def historical_run(root: Path, mode: str) -> tuple[list[str], str]:
    """Current frozen builder, exact pre-signature subjects, full Git objects.

    Unlike the older archive-only PWB selftests, this builder needs its BASE
    objects and index for its two-method sweep. The clone is disposable;
    neither the current subjects nor any registered worktree is rewritten.
    """
    findings = signed_findings(root)
    if findings:
        return findings, ""
    with tempfile.TemporaryDirectory(prefix="p115-before-signature-") as temp:
        tree = Path(temp) / "tree"
        subprocess.run(["git", "clone", "--quiet", "--no-hardlinks", "--no-checkout",
                        str(root), str(tree)], check=True, capture_output=True)
        git(tree, "checkout", "--quiet", "--detach", CORE_COMMIT)
        if (tree / RECORD).exists():
            return ["P115 historical core unexpectedly carries its sign-off record"], ""
        for path in core_paths(root):
            shutil.copyfile(root / path, tree / path)
            if (tree / path).read_bytes() != (root / path).read_bytes():
                return [f"historical frozen-core copy differs: {path}"], ""
        return builder_run(tree, mode)


def check_state(root: Path) -> tuple[list[str], str]:
    if transaction_present(root):
        findings, _output = historical_run(root, "--check")
        state = "performed; current six rows verified; explicit historical builder replay"
    else:
        findings = candidate_findings(root)
        state = "candidate; actual current subjects checked; not performed"
    return findings, "Unknown; P115 state unverified" if findings else state


def preview(root: Path, review: str | None = None, disposition: str | None = None) -> dict:
    findings, state = check_state(root)
    review_ready = False
    review_error = None
    if review:
        import record_versioned_signoff as recorder
        try:
            recorder.verify_reviewed(root, recorder.real_packages()[KEY], review, disposition)
            review_ready = True
        except (OSError, ValueError) as exc:
            review_error = str(exc)
    unknowns = consumption_unknowns(root)
    return {"package": KEY, "version": VERSION, "coreCommit": CORE_COMMIT,
            "manifestFileSha256": MANIFEST_SHA256, "coreFiles": len(core_paths(root)),
            "subjects": len(SUBJECTS), "state": state, "candidateFindings": findings,
            "reviewReady": review_ready, "reviewError": review_error,
            "undecidableConsumptionEntries": unknowns,
            "recordingReady": not findings and review_ready and unknowns == 0
                              and not transaction_present(root),
            "ownerSelection": "not collected by this tool", "writes": "none"}


def load_frozen(root: Path):
    spec = importlib.util.spec_from_file_location("p115_frozen_fixture", root / BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def mutation_receipt(root: Path, name: str, before: dict, after: dict, predicate: str) -> None:
    """Retain literal changed fragments, identities and the intended predicate."""
    changes = []
    for path in sorted(before.keys() | after.keys()):
        old, new = before.get(path), after.get(path)
        if old == new:
            continue
        left, right = 0, 0
        if old is not None and new is not None:
            while left < min(len(old), len(new)) and old[left] == new[left]:
                left += 1
            while right < min(len(old), len(new)) - left and old[-right-1] == new[-right-1]:
                right += 1
        changes.append({"path": str(path), "offset": left,
            "old": None if old is None else old[left:len(old)-right if right else None].decode(),
            "new": None if new is None else new[left:len(new)-right if right else None].decode(),
            "oldSha256": None if old is None else digest(old),
            "newSha256": None if new is None else digest(new)})
    print("P115-MUTATION-EVIDENCE " + json.dumps({"name": name, "ranAt": git(root, "rev-parse", "HEAD").decode().strip(),
        "predicate": predicate, "changes": changes}, sort_keys=True))


def recording_failure_selftest(root: Path, expect) -> None:
    """Real main(argv), review gate, Git batch, writes and recovery in own clones.

    Fault barriers delegate real I/O. No package/readiness/postcondition result
    is mocked. Synthetic review commits and failed journals die with fixtures;
    their exact state/old/new/cause receipts are emitted to the retained log.
    """
    import record_versioned_signoff as recorder
    from unittest import mock
    paths = (*SUBJECTS, RECORD, AGGREGATE)
    raw = "docs/reviews/R-P115-ENTRYPOINT-SELFTEST-RAW.md"
    fingerprint = "P115 synthetic injected errno-5"
    cases = (
        "control", "dirty-staged", "dirty-unstaged", "dirty-untracked",
        "dirty-assume-unchanged", "dirty-skip-worktree", "dirty-stat-cache", "dirty-mode-hidden",
        "guard-assume-unchanged", "guard-stat-cache", "ignored-output-control",
        "construction-drift", "preflight-bad-patch", "apply-after-write-failure", "postcondition-drift",
        "dedicated-before-write", "dedicated-stage-prefix-failure", "dedicated-after-write",
        "aggregate-before-write", "aggregate-stage-prefix-failure", "aggregate-after-write",
        "foreign-subject-edit", "foreign-subject-delete", "foreign-record-edit", "foreign-record-delete",
        "foreign-aggregate-edit", "foreign-aggregate-delete", "restore-failure", "restore-stage-drift",
        "linked-worktree-control", "linked-worktree-aggregate-failure",
        *(f"T{n:02}" for n in (*range(1, 16), 19, 20, 21, 22)),
        "OWN-1", "OWN-2", "OWN-3", "OWN-4", "BATCH-2", "BATCH-3", "BATCH-4", "DIRECT-1", "POP-6",
        "R6-02", "R6-11", "R6-13", "R6-14", "R6-15", "R6-18",
    )
    with tempfile.TemporaryDirectory(prefix="p115-entrypoint-fixtures-") as temp:
        template = Path(temp) / "template"
        subprocess.run(["git", "clone", "--quiet", "--no-hardlinks", str(root), str(template)],
                       check=True, capture_output=True)
        for name in (Path(__file__).name, "record_versioned_signoff.py"):
            shutil.copyfile(root / "scripts" / name, template / "scripts" / name)
        (template / raw).write_text(f"# Synthetic entrypoint fixture — {KEY}\nReviewed commit: {CORE_COMMIT}\n"
            f"Manifest SHA-256: {MANIFEST_SHA256}\nVerdict: CONFIRM\n\n## Findings\n\n"
            "No findings. Synthetic fixture only; no owner action.\n")
        git(template, "add", "--all")
        git(template, "-c", "user.name=P115 synthetic fixture", "-c", "user.email=fixture@invalid",
            "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m",
            "Synthetic recording failure fixtures; no owner action")
        _current, proposed = load_frozen(template).collect()
        proposed = {Path(p): body for p, body in proposed.items()}
        for name in cases:
            tree = Path(temp) / name
            if name.startswith("linked-worktree-"):
                git(template, "-c", "core.hooksPath=/dev/null", "worktree", "add", "--quiet",
                    "--detach", str(tree), "HEAD")
            else:
                subprocess.run(["git", "clone", "--quiet", "--no-hardlinks", str(template), str(tree)],
                               check=True, capture_output=True)
            cleanup_case = name in {"T09", "T10", "T11", "T22"}
            positive = name in {"control", "linked-worktree-control", "ignored-output-control"} or cleanup_case
            before = {p: recorder.p115_read(tree / p) for p in paths}
            expected = dict(before)
            events, foreign, foreign_identities = [], {}, {}
            initial_head = git(tree, "rev-parse", "HEAD")
            initial_tags = git(tree, "tag", "--list")
            receipt_link_attempts = []
            dirty = tree / "README.md"
            if name in {"dirty-stat-cache", "guard-stat-cache"}:
                git(tree, "config", "core.trustctime", "false")
                recorder.os.utime(dirty, ns=(1000000000000000000, 1000000000000000000))
                git(tree, "update-index", "--refresh")  # Own fixture setup only; never the recorder.
            cached_stat = dirty.stat()
            if name in {"dirty-assume-unchanged", "dirty-skip-worktree"}:
                dirty.write_bytes(dirty.read_bytes() + b"\nSynthetic hidden tracked dirt.\n")
                git(tree, "update-index", "--assume-unchanged" if name == "dirty-assume-unchanged"
                    else "--skip-worktree", "--", "README.md")
                events.append("real hidden tracked flag admission fixture")
            if name == "dirty-stat-cache":
                body = dirty.read_bytes()
                dirty.write_bytes(bytes([body[0] ^ 1]) + body[1:])
                recorder.os.utime(dirty, ns=(cached_stat.st_atime_ns, cached_stat.st_mtime_ns))
                events.append("real same-size restored-mtime tracked admission fixture")
            if name == "dirty-mode-hidden":
                git(tree, "config", "core.filemode", "false")
                dirty.chmod(cached_stat.st_mode | 0o111)
                events.append("real filemode-hidden executable admission fixture")
            if name == "ignored-output-control":
                ignored = tree / "node_modules/p115-ignored-output.txt"
                ignored.parent.mkdir()
                ignored.write_text("Synthetic ignored build output.\n")
                assert git(tree, "check-ignore", "node_modules/p115-ignored-output.txt")
            if name in {"dirty-staged", "dirty-unstaged"}:
                dirty.write_bytes(dirty.read_bytes() + b"\nSynthetic unrelated dirt.\n")
                if name == "dirty-staged":
                    git(tree, "add", "README.md")
            if name == "dirty-untracked":
                dirty = tree / "p115-unrelated-untracked.txt"
                dirty.write_text("Synthetic unrelated untracked file.\n")
            dirty_body = dirty.read_bytes() if name.startswith("dirty-") else None
            tracked_before = {"flags": git(tree, "ls-files", "-v", "-z", "--", "README.md").decode(),
                "status": git(tree, "--no-optional-locks", "status", "--porcelain=v1", "-z").decode(),
                "headBlob": git(tree, "rev-parse", "HEAD:README.md").decode().strip(),
                "workingBlob": git(tree, "hash-object", "--no-filters", "--", "README.md").decode().strip(),
                "workingGitMode": "100755" if dirty.stat().st_mode & 0o111 else "100644"}
            initial_index = git(tree, "ls-files", "--stage", "-z")
            original_run, original_write = recorder.subprocess.run, recorder.p115_write
            original_stage, original_replace = recorder.p115_stage, recorder.os.replace
            original_link, original_unlink = recorder.os.link, Path.unlink
            original_rmtree, original_read = recorder.shutil.rmtree, recorder.p115_read
            original_read_bytes, original_lstat = Path.read_bytes, Path.lstat
            original_fsync = recorder.os.fsync
            original_render = recorder.render_record
            failed_once = set()
            native_batches, native_operations = [], []
            family_drift = RECORD.with_name(RECORD.name.replace("v1.0", "v02.0"))
            if name == "POP-6":
                exclude = Path(git(tree, "rev-parse", "--git-path", "info/exclude").decode().strip())
                exclude = exclude if exclude.is_absolute() else tree / exclude
                exclude.write_bytes(exclude.read_bytes() + b"\n" + family_drift.as_posix().encode() + b"\n")

            def replace_same_bytes(target):
                path = tree / target
                replacement = path.with_name(".foreign-p115-replacement")
                replacement.write_bytes(proposed[target])
                original_replace(replacement, path)
                foreign[target], foreign_identities[target] = path.read_bytes(), recorder.p115_identity(path)


            def inject(label):
                events.append(label)
                raise OSError(5, fingerprint + ": " + label)

            def run(argv, *args, **kwargs):
                apply = len(argv) > 1 and argv[:2] == ["git", "apply"]
                private = apply and Path(kwargs.get("cwd", tree)) != tree
                if apply and "--check" in argv and name == "preflight-bad-patch":
                    patch = tree / CANDIDATE / "proposed/spec.md.patch"
                    patch.write_text("--- a/p115-no-such-subject\n+++ b/p115-no-such-subject\n"
                                     "@@ -1 +1 @@\n-missing\n+bad\n")
                    foreign[patch.relative_to(tree)] = patch.read_bytes()
                    # Same actual bad-batch preflight, now in the private copy.
                    Path(argv[-1]).write_bytes(patch.read_bytes())
                    events.append("real bad-patch preflight")
                if private and "--check" not in argv and name == "BATCH-2":
                    import resource
                    def native_limit():
                        resource.setrlimit(resource.RLIMIT_FSIZE, (18000, 18000))
                    kwargs["preexec_fn"] = native_limit
                result = original_run(argv, *args, **kwargs)
                if private:
                    native_batches.append({"argv": list(argv), "cwd": str(kwargs["cwd"]),
                        "returncode": result.returncode,
                        "gitDir": kwargs["env"]["GIT_DIR"], "gitWorkTree": kwargs["env"]["GIT_WORK_TREE"],
                        "gitIndexFile": kwargs["env"]["GIT_INDEX_FILE"]})
                if apply and "--check" in argv and name == "BATCH-4":
                    patch = CANDIDATE / "proposed/spec.md.patch"
                    foreign[patch] = (tree / patch).read_bytes() + b"\nForeign root patch after private preflight.\n"
                    (tree / patch).write_bytes(foreign[patch])
                    events.append("native private preflight then foreign root patch drift")
                if apply and "--check" not in argv:
                    events.append("real five-patch apply")
                    if name == "apply-after-write-failure":
                        inject("after real Git apply")
                    if name == "postcondition-drift":
                        target = SUBJECTS[-1]
                        foreign[target] = proposed[target] + b"\nSynthetic foreign post-apply edit.\n"
                        (tree / target).write_bytes(foreign[target])
                    if name == "BATCH-2":
                        projection = Path(kwargs["cwd"])
                        partial = (projection / SUBJECTS[1]).read_bytes()
                        if result.returncode == -25 and len(partial) == 18000 and partial != proposed[SUBJECTS[1]]:
                            events.append("native private batch SIGXFSZ with real 18000-byte partial output")
                    if name == "BATCH-3":
                        path = Path(kwargs["cwd"]) / SUBJECTS[-1]
                        path.write_bytes(path.read_bytes() + b"\nForeign private output drift.\n")
                        events.append("real private batch then physical output mutation")
                    if name == "guard-assume-unchanged":
                        git(tree, "update-index", "--assume-unchanged", "--", "README.md")
                        events.append("real private batch then unrelated unsupported index flag")
                    if name == "guard-stat-cache":
                        target = Path("README.md")
                        value = (tree / target).read_bytes()
                        foreign[target] = bytes([value[0] ^ 1]) + value[1:]
                        (tree / target).write_bytes(foreign[target])
                        recorder.os.utime(tree / target, ns=(cached_stat.st_atime_ns, cached_stat.st_mtime_ns))
                        events.append("real private batch then stat-cache-hidden unrelated bytes")
                return result

            def render(*args, **kwargs):
                result = original_render(*args, **kwargs)
                if name == "construction-drift" and "construction" not in failed_once:
                    failed_once.add("construction")
                    foreign[SUBJECTS[1]] = before[SUBJECTS[1]] + b"\nSynthetic construction-window edit.\n"
                    (tree / SUBJECTS[1]).write_bytes(foreign[SUBJECTS[1]])
                    events.append("real preimage drift during output construction")
                return result

            def write(path, body, **publication):
                rel = path.relative_to(tree)
                label = "dedicated" if rel == RECORD else "aggregate" if rel == AGGREGATE else "subject"
                if rel == RECORD and name in {"T12", "T13", "T14", "T15"}:
                    events.append("real write barrier with " + name + " exception chain")
                    try:
                        filename = tree / "synthetic-volume" if name == "T12" else str(tree / "synthetic-volume")
                        raise OSError(28, "P115 root storage exhausted", filename)
                    except OSError as cause:
                        if name in {"T12", "T15"}:
                            filename = recorder.os.fsencode(path) if name == "T12" else str(path)
                            raise OSError(5, "P115 record wrapper", filename) from cause
                        if name == "T13":
                            raise OSError(5, "P115 record wrapper", str(path))
                        raise OSError(5, "P115 record wrapper", str(path)) from None
                if name == label + "-before-write":
                    inject(label + " before staging")
                if name == "DIRECT-1" and rel == SUBJECTS[2]:
                    inject("direct apply mid-subject before staging")
                if name == "R6-18" and rel == SUBJECTS[2]:
                    failed_once.add("R6-primary")
                    inject("R6 direct apply mid-subject before staging")
                original_write(path, body, **publication)
                events.append(label + " real staged replace")
                if name == "OWN-1" and rel == RECORD:
                    replace_same_bytes(SUBJECTS[-1])
                    events.append("real dedicated publication then foreign same-byte subject inode")
                if name == label + "-after-write":
                    inject(label + " after completed replacement")
                foreign_barrier = AGGREGATE if name.startswith("foreign-aggregate-") else RECORD
                if rel == foreign_barrier and name.startswith("foreign-"):
                    family, operation = name.removeprefix("foreign-").rsplit("-", 1)
                    target = {"subject": SUBJECTS[-1], "record": RECORD, "aggregate": AGGREGATE}[family]
                    if operation == "delete":
                        (tree / target).unlink()
                        foreign[target] = None
                    else:
                        foreign[target] = (tree / target).read_bytes() + b"\nSynthetic foreign edit.\n"
                        (tree / target).write_bytes(foreign[target])
                    inject("after real " + label + " write and foreign " + family + " " + operation)
                if rel == AGGREGATE and name in {"restore-failure", "restore-stage-drift",
                                                "linked-worktree-aggregate-failure", "OWN-2"}:
                    inject("after real aggregate write before recovery fault")

            def stage(path, body, **ownership):
                rel = path.relative_to(tree) if path.is_relative_to(tree) else None
                label = "dedicated" if rel == RECORD else "aggregate" if rel == AGGREGATE else "subject"
                completion = path.name.endswith(".ATTEMPT.json") and b'"state": "completed"' in body
                if ((name == label + "-stage-prefix-failure" or name == "T07" and completion)
                        and name not in failed_once):
                    failed_once.add(name)
                    fdopen = recorder.os.fdopen
                    class PrefixStream:
                        def __init__(self, fd, mode):
                            self.stream = fdopen(fd, mode)
                        def __enter__(self):
                            self.stream.__enter__()
                            return self
                        def write(self, value):
                            self.stream.write(value[:max(1, len(value)//2)])
                            self.stream.flush()
                            inject(("completion receipt" if name == "T07" else label) + " real stage prefix write")
                        def __exit__(self, *exc):
                            return self.stream.__exit__(*exc)
                    with mock.patch.object(recorder.os, "fdopen", PrefixStream):
                        return original_stage(path, body, **ownership)
                result = original_stage(path, body, **ownership)
                if name in {"T01", "T02", "T03", "T04"} and name not in failed_once:
                    target = AGGREGATE if name in {"T01", "T02"} else RECORD
                    if rel == target:
                        failed_once.add(name)
                        foreign[target] = (None if name == "T02" else body if name == "T04"
                                           else b"Foreign write during forward staging.\n")
                        if foreign[target] is None:
                            path.unlink()
                        else:
                            path.write_bytes(foreign[target])
                        foreign_identities[target] = recorder.p115_identity(path)
                        events.append("real forward stage then " + name + " foreign mutation")
                if (name == "restore-stage-drift" and rel == SUBJECTS[-1]
                        and body == before[rel] and name not in failed_once):
                    failed_once.add(name)
                    foreign[rel] = proposed[rel] + b"\nSynthetic restoration-window edit.\n"
                    path.write_bytes(foreign[rel])
                    events.append("real restoration-stage ownership drift")
                if (name == "OWN-2" and rel == SUBJECTS[-1] and body == before[rel]
                        and name not in failed_once):
                    failed_once.add(name)
                    replace_same_bytes(rel)
                    events.append("real restoration stage then foreign same-byte subject inode")
                if name == "POP-6" and rel == SUBJECTS[2] and name not in failed_once:
                    failed_once.add(name)
                    foreign[family_drift] = b"Ignored unsupported P115 family drift.\n"
                    (tree / family_drift).write_bytes(foreign[family_drift])
                    events.append("real mid-subject stage then ignored unsupported family drift")
                return result

            def replace(source, destination):
                if name == "R6-11" and destination == tree / AGGREGATE and "R6-primary" not in failed_once:
                    failed_once.add("R6-primary")
                    native_operations.append({"actualOperation": "os.replace", "phase": "forward aggregate",
                                              "nativeReturned": False})
                    inject("R6 primary aggregate native publication failure")
                if (name in {"restore-failure", "T15"} and destination == tree / SUBJECTS[-1]
                        and Path(source).read_bytes() == before[SUBJECTS[-1]]):
                    foreign[SUBJECTS[-1]] = proposed[SUBJECTS[-1]]
                    inject("real restoration replacement failure")
                if Path(destination).name.endswith(".ATTEMPT.json"):
                    body = Path(source).read_bytes()
                    if name == "T08" and b'"state": "completed"' in body:
                        inject("completion receipt native publication failure")
                    if name == "T15" and b'"state": "failed"' in body:
                        events.append("real failed receipt publication barrier")
                        raise OSError(30, "P115 failure receipt storage refused", str(destination))
                result = original_replace(source, destination)
                if name == "OWN-4" and destination == tree / SUBJECTS[1]:
                    failed_once.add("identity-denied")
                    events.append("real native subject publication before identity denial")
                if (name == "T22" and Path(destination).name.endswith(".ATTEMPT.json")
                        and "cleanup-failed" in failed_once):
                    failed_once.add("cleanup-receipt-published")
                    events.append("real cleanup receipt native publication")
                return result

            def link(source, destination):
                if name in {"R6-02", "R6-13", "R6-14", "R6-15"} and destination == tree / RECORD:
                    failed_once.add("R6-primary")
                    native_operations.append({"actualOperation": "os.link", "phase": "forward dedicated",
                                              "nativeReturned": False})
                    inject("R6 primary dedicated native publication failure")
                if name in {"T20", "T21"} and Path(destination).name.endswith(".ATTEMPT.json"):
                    phase = json.loads(Path(source).read_bytes())["state"]
                    fault = name == "T20" or not receipt_link_attempts
                    receipt_link_attempts.append({"phase": phase, "fault": fault})
                    if fault:
                        events.append("native " + phase + " receipt publication refused")
                        raise OSError(28, "P115 native receipt publication refused: " + phase, str(destination))
                    result = original_link(source, destination)
                    events.append("real failed receipt exclusive publication")
                    return result
                if name == "T05" and destination == tree / RECORD:
                    foreign[RECORD] = Path(source).read_bytes()
                    Path(destination).write_bytes(foreign[RECORD])
                    foreign_identities[RECORD] = recorder.p115_identity(Path(destination))
                    events.append("native exclusive create meets same-byte foreign inode")
                return original_link(source, destination)

            def unlink(path, *args, **kwargs):
                if (name == "T06" and name not in failed_once and path.name.startswith(".p115-")
                        and path.parent == (tree / RECORD).parent and (tree / RECORD).exists()):
                    failed_once.add(name)
                    inject("native staged unlink after confirmed publication")
                if name == "T11" and path.name.endswith(".ATTEMPT.json") and name not in failed_once:
                    journal = path.with_name(path.name.removesuffix(".ATTEMPT.json"))
                    if not journal.exists():
                        failed_once.add(name)
                        inject("native completed receipt unlink after payload deletion")
                result = original_unlink(path, *args, **kwargs)
                if name == "R6-11" and path == tree / RECORD and "R6-primary" in failed_once:
                    foreign[RECORD] = b"R6 independently recreated record after recovery unlink.\n"
                    path.write_bytes(foreign[RECORD])
                    foreign_identities[RECORD] = recorder.p115_identity(path)
                    native_operations.append({"actualOperation": "Path.unlink", "phase": "recovery absence",
                                              "nativeReturned": True, "foreignRecreated": True})
                    events.append("R6 actual recovery unlink then foreign record recreation")
                return result

            def rmtree(path, *args, **kwargs):
                if (name in {"T09", "T10", "T22"} and Path(path).name.startswith("attempt-")
                        and Path(path).parent.name == "p115-recording-recovery"):
                    if name == "T10":
                        original_unlink(Path(path) / "0.before")
                        events.append("real cleanup removed one captured preimage")
                    failed_once.add("cleanup-failed")
                    inject("postcommit journal cleanup failure")
                return original_rmtree(path, *args, **kwargs)

            def lstat(path, *args, **kwargs):
                if (name == "OWN-3" and name not in failed_once and path.name.startswith(".p115-")
                        and path.parent == (tree / SUBJECTS[1]).parent
                        and (tree / SUBJECTS[1]).read_bytes() == proposed[SUBJECTS[1]]):
                    failed_once.add(name)
                    native_operations.append({"actualOperation": "Path.lstat", "phase": "post-forward-publication cleanup",
                        "nativeReturned": False, "historicalEventLabelOnly": "native subject staged unlink after confirmed publication"})
                    # Retained historical label; no unlink of a consumed stage ran.
                    inject("native subject staged unlink after confirmed publication")
                if name == "OWN-4" and "identity-denied" in failed_once and path == tree / SUBJECTS[1]:
                    events.append("native published subject identity inspection denied")
                    raise PermissionError(13, "P115 native subject identity inspection refused", str(path))
                return original_lstat(path, *args, **kwargs)

            def read_bytes(path):
                diagnostic = (name == "T22" and path.name.endswith(".ATTEMPT.json")
                              and "cleanup-receipt-published" in failed_once)
                if diagnostic and "cleanup-receipt-readback" in failed_once:
                    events.append("diagnostic receipt native read denied")
                    raise PermissionError(13, "P115 diagnostic receipt read refused", str(path))
                body = original_read_bytes(path)
                if (name == "R6-14" and path.name.endswith(".ATTEMPT.json")
                        and b'"state": "failed"' in body and name not in failed_once):
                    failed_once.add(name)
                    foreign[SUBJECTS[-1]] = before[SUBJECTS[-1]] + b"\nR6 independent receipt-readback edit.\n"
                    (tree / SUBJECTS[-1]).write_bytes(foreign[SUBJECTS[-1]])
                    native_operations.append({"actualOperation": "Path.read_bytes", "phase": "failed receipt readback",
                                              "nativeReturned": True})
                    events.append("R6 actual failed receipt readback then independent subject edit")
                if diagnostic:
                    failed_once.add("cleanup-receipt-readback")
                    events.append("real cleanup receipt readback")
                return body

            def fsync(fd):
                result = original_fsync(fd)
                path = Path(recorder.os.readlink(f"/proc/self/fd/{fd}"))
                if "R6-primary" not in failed_once or name in failed_once:
                    return result
                if name in {"R6-02", "R6-18"} and path.name.startswith(".p115-"):
                    target = SUBJECTS[-1] if name == "R6-02" else SUBJECTS[1]
                    if path.parent == (tree / target).parent and path.read_bytes() == before[target]:
                        failed_once.add(name)
                        old = path.read_bytes()
                        path.write_bytes(bytes([old[0] ^ 1]) + old[1:])
                        native_operations.append({"actualOperation": "os.fsync", "phase": "recovery stage",
                            "nativeReturned": True, "oldSha256": digest(old), "newSha256": digest(path.read_bytes())})
                        events.append("R6 actual recovery stage fsync then first-byte alteration")
                if (name == "R6-13" and path.name.startswith(".p115-")
                        and path.parent.name == "p115-recording-recovery" and b'"state": "failed"' in path.read_bytes()):
                    failed_once.add(name)
                    foreign[SUBJECTS[-1]] = before[SUBJECTS[-1]] + b"\nR6 independent failed-receipt-stage edit.\n"
                    (tree / SUBJECTS[-1]).write_bytes(foreign[SUBJECTS[-1]])
                    native_operations.append({"actualOperation": "os.fsync", "phase": "failed receipt stage",
                                              "nativeReturned": True})
                    events.append("R6 actual failed receipt stage fsync then independent subject edit")
                return result

            def read(path):
                result = original_read(path)
                if (name == "T19" and name not in failed_once and path.name.endswith(".ATTEMPT.json")
                        and result is not None and b'"state": "completed"' in result):
                    failed_once.add(name)
                    foreign[SUBJECTS[-1]] = proposed[SUBJECTS[-1]] + b"\nForeign edit during completed receipt readback.\n"
                    (tree / SUBJECTS[-1]).write_bytes(foreign[SUBJECTS[-1]])
                    events.append("real completion receipt readback then foreign subject edit")
                return result

            output = io.StringIO()
            if name == "R6-15":
                class NativeOutput:
                    def __init__(self):
                        self.stream = (Path(temp) / "R6-15.native-output").open("w+")
                    def write(self, text):
                        count = self.stream.write(text)
                        self.stream.flush()
                        if text.startswith("P115 failed-attempt evidence retained: ") and name not in failed_once:
                            failed_once.add(name)
                            rel = SUBJECTS[-1]
                            replacement = (tree / rel).with_name(".R6-15-foreign")
                            replacement.write_bytes(before[rel])
                            original_replace(replacement, tree / rel)
                            foreign[rel], foreign_identities[rel] = before[rel], recorder.p115_identity(tree / rel)
                            native_operations.append({"actualOperation": "TextIOWrapper.write/flush",
                                "phase": "failed receipt retention diagnostic", "nativeReturned": True})
                            events.append("R6 actual retention diagnostic write then foreign same-byte subject inode")
                        return count
                    def flush(self):
                        self.stream.flush()
                    def getvalue(self):
                        self.stream.flush()
                        self.stream.seek(0)
                        return self.stream.read()
                    def close(self):
                        self.stream.close()
                output = NativeOutput()
            saved_root = recorder.ROOT
            try:
                recorder.ROOT = tree
                with mock.patch.object(recorder.subprocess, "run", run), \
                     mock.patch.object(recorder, "p115_write", write), \
                     mock.patch.object(recorder, "p115_stage", stage), \
                     mock.patch.object(recorder, "render_record", render), \
                     mock.patch.object(recorder.os, "replace", replace), \
                     mock.patch.object(recorder.os, "link", link), \
                     mock.patch.object(recorder.os, "fsync", fsync), \
                     mock.patch.object(Path, "unlink", unlink), \
                     mock.patch.object(Path, "read_bytes", read_bytes), \
                     mock.patch.object(Path, "lstat", lstat), \
                     mock.patch.object(recorder.shutil, "rmtree", rmtree), \
                     mock.patch.object(recorder, "p115_read", read), \
                     contextlib.redirect_stdout(output):
                    if name in {"DIRECT-1", "R6-18"}:
                        code = recorder.real_packages()[KEY].apply(tree)
                    else:
                        code = recorder.main(["--record", KEY, "--version", VERSION, "--date", "2026-10-21",
                            "--review", raw, "--owner-selection-quote", "Synthetic fixture only; no owner action"])
            finally:
                recorder.ROOT = saved_root
            actual = {p: recorder.p115_read(tree / p) for p in paths}
            if name in {"R6-02", "R6-18"}:
                expected[SUBJECTS[-1] if name == "R6-02" else SUBJECTS[1]] = proposed[
                    SUBJECTS[-1] if name == "R6-02" else SUBJECTS[1]]
            if positive:
                expected.update(proposed)
                # Literal protocol outputs, independent of any transaction snapshots.
                pkg = recorder.real_packages()[KEY]
                expected[RECORD] = original_render(pkg, VERSION, "2026-10-21",
                    "Synthetic fixture only; no owner action", raw, CORE_COMMIT, "CONFIRM", None,
                    root=tree, rows=tuple(manifest_rows(tree))).encode()
                expected[AGGREGATE] = (before[AGGREGATE].decode().rstrip("\n") + "\n\n"
                    + recorder.render_aggregate(pkg, VERSION, "2026-10-21", raw, "CONFIRM", None)).encode()
            expected.update({p: body for p, body in foreign.items() if p in before})
            if name == "OWN-4":
                expected[SUBJECTS[1]] = proposed[SUBJECTS[1]]
            git_dir = Path(git(tree, "rev-parse", "--absolute-git-dir").decode().strip())
            retained = list((git_dir / "p115-recording-recovery").glob("attempt-*.ATTEMPT.json"))
            journals = [json.loads(p.read_text()) for p in retained]
            lines = output.getvalue()
            state_ok = actual == expected
            gate_ok = code == (0 if positive else 1) and is_signed(tree) == positive
            index_ok = (git(tree, "ls-files", "--stage", "-z") == initial_index
                        and git(tree, "rev-parse", "HEAD") == initial_head
                        and git(tree, "tag", "--list") == initial_tags)
            dirt_ok = (dirty_body is None or dirty.read_bytes() == dirty_body) and all(
                recorder.p115_read(tree / rel) == body for rel, body in foreign.items())
            reached = ("real five-patch apply" in events) == (name not in {
                "dirty-staged", "dirty-unstaged", "dirty-untracked", "construction-drift", "preflight-bad-patch",
                "dirty-assume-unchanged", "dirty-skip-worktree", "dirty-stat-cache", "dirty-mode-hidden",
                "T20", "T21"})
            originals = [json.loads(line.removeprefix("P115 original exception: "))
                         for line in lines.splitlines() if line.startswith("P115 original exception: ")]
            failure_evidence = (positive and not retained or
                name.startswith("dirty-") and not retained or name == "construction-drift" and not retained or
                bool(journals) and all(j["state"] == "failed" and j.get("originalError")
                                      and j.get("originalException") == originals[0] for j in journals))
            if cleanup_case:
                failure_evidence = (len(journals) == 1 and journals[0]["state"] == "completed"
                    and journals[0]["postconditions"] == {"sixSubjects": True, "exactRecords": True,
                        "signedChain": True, "capturedInputsAndIndex": True}
                    and journals[0]["cleanupException"]["nodes"][0]["errno"] == 5
                    and "P115 WARNING: recording completed; private cleanup failed:" in lines
                    and not originals)
            if name == "T15":
                # The explicitly faulted failure-receipt update leaves prepared
                # evidence. Its original diagnostic still precedes secondaries.
                failure_evidence = (len(journals) == 1 and journals[0]["state"] == "prepared"
                    and len(originals) == 1 and "P115 diagnostic fallback:" in lines
                    and "durable failure update unavailable" in lines)
            if name == "T20":
                failure_evidence = (not retained and len(originals) == 1
                    and "P115 diagnostic fallback:" in lines and "durable failure update unavailable" in lines)
            captured_payload = [{"path": f"{n}.before", "bytes": len(body), "sha256": digest(body)}
                                for n, body in enumerate(before.values()) if body is not None]
            preimages_ok = all(
                row["before"] == (None if before[Path(row["path"])] is None else
                                  digest((p.parent / row["preimage"]).read_bytes()))
                for p, j in zip(retained, journals) for row in j["paths"]
                if not cleanup_case)
            if cleanup_case and journals:
                payload = retained[0].with_name(retained[0].name.removesuffix(".ATTEMPT.json"))
                survivors = recorder.p115_payload_inventory(payload)
                wanted = ([] if name == "T11" else
                          captured_payload[1:] if name == "T10" else captured_payload)
                preimages_ok = (journals[0]["payloadCapturedAtCompletion"] == captured_payload
                                and journals[0]["payloadSurvivors"] == wanted == survivors)
            if name == "T20":
                payloads = [p for p in (git_dir / "p115-recording-recovery").glob("attempt-*") if p.is_dir()]
                preimages_ok = (len(payloads) == 1
                    and recorder.p115_payload_inventory(payloads[0]) == captured_payload)
            receipt_identity_ok = all(j["attemptId"] + ".ATTEMPT.json" == p.name
                and j["ranAt"] == initial_head.decode().strip()
                and j["indexSha256"] == digest(initial_index)
                and j["capturedAt"].endswith("Z") and j["updatedAt"].endswith("Z")
                and datetime.datetime.fromisoformat(j["capturedAt"][:-1] + "+00:00")
                    <= datetime.datetime.fromisoformat(j["updatedAt"][:-1] + "+00:00")
                for p, j in zip(retained, journals))
            claims = [line for line in lines.splitlines() if line.startswith((
                "P115 failed-attempt evidence retained: ", "P115 completed outcome receipt retained: "))]
            phases = [line for line in lines.splitlines() if line.startswith("P115 verified retained receipt phase: ")]
            if name == "T22":
                retention_ok = (not claims and not phases
                    and "P115 receipt verification: unverified/read-error; no retained receipt claimed:" in lines)
            elif journals:
                label = {"failed": "updated failed", "prepared": "older prepared", "completed": "completed"}
                prefix = "P115 completed outcome receipt retained: " if positive else "P115 failed-attempt evidence retained: "
                retention_ok = (len(journals) == 1 and claims == [prefix + str(retained[0])]
                    and phases == ["P115 verified retained receipt phase: " + label[journals[0]["state"]]])
                if name in {"R6-13", "R6-14", "R6-15"}:
                    retention_ok = (len(journals) == 1 and claims == [prefix + str(retained[0])] * 2
                        and phases == ["P115 verified retained receipt phase: updated failed"] * 2)
            else:
                retention_ok = not claims and not phases
                if name == "T20":
                    retention_ok = retention_ok and "P115 receipt verification: absent; no retained receipt claimed:" in lines
            failure_evidence = failure_evidence and receipt_identity_ok and retention_ok
            recovery_ok = positive or (
                ("P115 recovery incomplete:" in lines) if actual != before else
                ("P115 recovery complete;" in lines))
            if name == "T20":
                recovery_ok = "P115 recovery incomplete: failure receipt persistence failed;" in lines
            if name == "foreign-record-delete":
                # Absence equals this preimage but does not prove ownership of
                # an independently deleted, previously published record.
                conflict = (str(RECORD) + ": independently changed or deleted; publication ownership unproven")
                recovery_ok = ("P115 recovery incomplete: " + conflict + "\n" in lines
                    and "P115 recovery complete;" not in lines
                    and len(journals) == 1 and journals[0]["recoveryConflicts"] == [conflict])
            if name.startswith("linked-worktree-"):
                preimages_ok = preimages_ok and (tree / ".git").is_file() and git_dir != template / ".git"
            required = {
                "construction-drift": ["real preimage drift during output construction"],
                "preflight-bad-patch": ["real bad-patch preflight"],
                "apply-after-write-failure": ["after real Git apply"],
                "postcondition-drift": ["real five-patch apply"],
                "restore-failure": ["after real aggregate write before recovery fault",
                                    "real restoration replacement failure"],
                "restore-stage-drift": ["after real aggregate write before recovery fault",
                                        "real restoration-stage ownership drift"],
                "linked-worktree-aggregate-failure": ["after real aggregate write before recovery fault"],
            }.get(name, [])
            for label in ("dedicated", "aggregate"):
                required += {
                    label + "-before-write": [label + " before staging"],
                    label + "-stage-prefix-failure": [label + " real stage prefix write"],
                    label + "-after-write": [label + " after completed replacement"],
                }.get(name, [])
            if name.startswith("foreign-"):
                family, operation = name.removeprefix("foreign-").rsplit("-", 1)
                barrier = "aggregate" if family == "aggregate" else "dedicated"
                required = [f"after real {barrier} write and foreign {family} {operation}"]
            required += {
                "T01": ["real forward stage then T01 foreign mutation"],
                "T02": ["real forward stage then T02 foreign mutation"],
                "T03": ["real forward stage then T03 foreign mutation"],
                "T04": ["real forward stage then T04 foreign mutation"],
                "T05": ["native exclusive create meets same-byte foreign inode"],
                "T06": ["native staged unlink after confirmed publication"],
                "T07": ["completion receipt real stage prefix write"],
                "T08": ["completion receipt native publication failure"],
                "T09": ["postcommit journal cleanup failure"],
                "T10": ["real cleanup removed one captured preimage", "postcommit journal cleanup failure"],
                "T11": ["native completed receipt unlink after payload deletion"],
                "T12": ["real write barrier with T12 exception chain"],
                "T13": ["real write barrier with T13 exception chain"],
                "T14": ["real write barrier with T14 exception chain"],
                "T15": ["real write barrier with T15 exception chain", "real restoration replacement failure",
                        "real failed receipt publication barrier"],
                "T19": ["real completion receipt readback then foreign subject edit"],
                "T20": ["native prepared receipt publication refused", "native failed receipt publication refused"],
                "T21": ["native prepared receipt publication refused", "real failed receipt exclusive publication"],
                "T22": ["postcommit journal cleanup failure", "real cleanup receipt native publication",
                        "real cleanup receipt readback", "diagnostic receipt native read denied"],
            }.get(name, [])
            required += {
                "dirty-assume-unchanged": ["real hidden tracked flag admission fixture"],
                "dirty-skip-worktree": ["real hidden tracked flag admission fixture"],
                "dirty-stat-cache": ["real same-size restored-mtime tracked admission fixture"],
                "dirty-mode-hidden": ["real filemode-hidden executable admission fixture"],
                "guard-assume-unchanged": ["real private batch then unrelated unsupported index flag"],
                "guard-stat-cache": ["real private batch then stat-cache-hidden unrelated bytes"],
                "OWN-1": ["real dedicated publication then foreign same-byte subject inode"],
                "OWN-2": ["after real aggregate write before recovery fault",
                          "real restoration stage then foreign same-byte subject inode"],
                "OWN-3": ["native subject staged unlink after confirmed publication"],
                "OWN-4": ["real native subject publication before identity denial",
                          "native published subject identity inspection denied"],
                "BATCH-2": ["native private batch SIGXFSZ with real 18000-byte partial output"],
                "BATCH-3": ["real private batch then physical output mutation"],
                "BATCH-4": ["native private preflight then foreign root patch drift"],
                "DIRECT-1": ["subject real staged replace", "direct apply mid-subject before staging"],
                "POP-6": ["subject real staged replace", "real mid-subject stage then ignored unsupported family drift"],
                "R6-02": ["R6 primary dedicated native publication failure",
                          "R6 actual recovery stage fsync then first-byte alteration"],
                "R6-11": ["R6 primary aggregate native publication failure",
                          "R6 actual recovery unlink then foreign record recreation"],
                "R6-13": ["R6 primary dedicated native publication failure",
                          "R6 actual failed receipt stage fsync then independent subject edit"],
                "R6-14": ["R6 primary dedicated native publication failure",
                          "R6 actual failed receipt readback then independent subject edit"],
                "R6-15": ["R6 primary dedicated native publication failure",
                          "R6 actual retention diagnostic write then foreign same-byte subject inode"],
                "R6-18": ["R6 direct apply mid-subject before staging",
                          "R6 actual recovery stage fsync then first-byte alteration"],
            }.get(name, [])
            reached = reached and all(event in events for event in required)
            injected = not positive and not name.startswith(("T", "R6-")) and name not in {
                "dirty-staged", "dirty-unstaged", "dirty-untracked",
                "dirty-assume-unchanged", "dirty-skip-worktree", "dirty-stat-cache", "dirty-mode-hidden",
                "guard-assume-unchanged", "guard-stat-cache",
                "construction-drift", "preflight-bad-patch", "postcondition-drift",
                "OWN-1", "OWN-2", "OWN-3", "OWN-4", "BATCH-2", "BATCH-3", "BATCH-4", "DIRECT-1", "POP-6"}
            cause_ok = not injected or fingerprint in lines
            if injected:
                original_error = f"OSError: [Errno 5] {fingerprint}: {required[0]}"
                cause_ok = cause_ok and bool(journals) and all(
                    journal["originalError"] == original_error for journal in journals)
            if name == "postcondition-drift":
                # Original literal "P115 applied postcondition failed" was the
                # governed-batch phase; root drift now fails before publication.
                cause_ok = "P115 transaction input changed:" in lines
            if name == "preflight-bad-patch":
                cause_ok = "P115 preflight refused:" in lines
            if name in {"T06", "T07", "T08"}:
                cause_ok = (len(originals) == 1 and originals[0]["nodes"][0]["errno"] == 5
                            and fingerprint in originals[0]["traceback"])
            if name in {"T12", "T13", "T14", "T15"}:
                nodes = originals[0]["nodes"] if originals else []
                cause_ok = (len(nodes) == 2 and nodes[0]["errno"] == 5
                    and nodes[0]["filename"] == str(tree / RECORD)
                    and nodes[0]["context"] == 1
                    and nodes[0]["cause"] == (1 if name in {"T12", "T15"} else None)
                    and nodes[0]["suppressContext"] == (name != "T13")
                    and nodes[1]["errno"] == 28 and nodes[1]["filename"] == str(tree / "synthetic-volume")
                    and "P115 record wrapper" in originals[0]["traceback"]
                    and ("P115 root storage exhausted" in originals[0]["traceback"]) == (name != "T14"))
                if name == "T12":
                    cause_ok = (cause_ok
                        and nodes[0]["filenameEvidence"] == {"type": "builtins.bytes",
                            "filesystemBytesHex": recorder.os.fsencode(tree / RECORD).hex()}
                        and nodes[1]["filenameEvidence"] == {"type": "pathlib.PosixPath",
                            "filesystemBytesHex": recorder.os.fsencode(tree / "synthetic-volume").hex()}
                        and nodes[0]["filename2"] is None and nodes[1]["filename2"] is None)
                if name == "T15":
                    secondary = [json.loads(line.split(": ", 1)[1]) for line in lines.splitlines()
                                 if line.startswith(("P115 secondary evidence error: ",
                                                     "P115 secondary recovery error: "))]
                    cause_ok = (cause_ok and len(secondary) == 2
                        and sorted(e["nodes"][0]["errno"] for e in secondary) == [5, 30]
                        and lines.index("P115 original exception: ") < lines.index("P115 secondary "))
            if name in {"T01", "T02", "T03", "T04", "T19"}:
                cause_ok = len(originals) == 1 and "P115 transaction input changed:" in originals[0]["nodes"][0]["message"]
            if name == "T05":
                cause_ok = len(originals) == 1 and originals[0]["nodes"][0]["errno"] == 17
            if name in {"T20", "T21"}:
                secondary = [json.loads(line.split(": ", 1)[1]) for line in lines.splitlines()
                             if line.startswith("P115 secondary evidence error: ")]
                cause_ok = (len(originals) == 1 and originals[0]["nodes"][0]["errno"] == 28
                    and receipt_link_attempts == [{"phase": "prepared", "fault": True},
                        {"phase": "failed", "fault": name == "T20"}]
                    and len(secondary) == (1 if name == "T20" else 0))
                if name == "T20":
                    cause_ok = (cause_ok and secondary[0]["nodes"][0]["errno"] == 28
                        and lines.index("P115 original exception: ") < lines.index("P115 secondary evidence error: "))
            if name == "T22":
                secondary = [json.loads(line.split(": ", 1)[1]) for line in lines.splitlines()
                             if line.startswith("P115 secondary receipt verification error: ")]
                cause_ok = (len(secondary) == 1 and secondary[0]["nodes"][0]["errno"] == 13
                            and not originals and len(journals) == 1 and journals[0]["state"] == "completed")
            if name in {"OWN-1", "OWN-2"}:
                cause_ok = bool(originals) and "P115 recovery incomplete:" in lines
            if name in {"OWN-3", "DIRECT-1"}:
                cause_ok = bool(originals) and originals[0]["nodes"][0]["errno"] == 5
            if name == "OWN-4":
                cause_ok = bool(originals) and originals[0]["nodes"][0]["errno"] == 13
            if name == "BATCH-2":
                cause_ok = "P115 batch apply failed (-25):" in lines
            if name == "BATCH-3":
                cause_ok = "P115 private batch outputs differ" in lines
            if name == "BATCH-4":
                cause_ok = "P115 transaction input changed:" in lines
            if name == "POP-6":
                cause_ok = "P115 transaction reserved family changed" in lines
            literal_r6_ok = True
            if name.startswith("R6-"):
                # Fixed external Return3 fixture identities, not SUT results.
                literal_before = (
                    "9187547d8cc17017ebd44132527d2d5e096d1ef9705de80cc4f1cf34531f6976",
                    "f6ecbc2040779f6d12de74b2fb6ce8b83d9b66a28aa5e3f72a8f22add4067ffc",
                    "2badee3cd053074182d3de24777a75991d2265b609c580094e2b87e49e91aac5",
                    "6d39ea6f6111abaea32c74ce96c975ae53e077485f0ed8f7c97545e64d7ba295",
                    "fe3fc6d6ee5461794c6b0fa7297bba52cb7695f5abbf384312bf111748ea8282",
                    "3a2e5a2be8fc69f0fb70f32b0fce1b2b6ca9589db16224090a0351112385b691",
                    None, "bbded40712eba4bdf24493b0d9b4d3fa86fe275b8de7e5350adf34313d094ccc")
                literal_r6_ok = tuple(None if b is None else digest(b) for b in before.values()) == literal_before
                if name == "R6-02":
                    literal_r6_ok = literal_r6_ok and digest(actual[SUBJECTS[-1]]) == (
                        "01209cce451cbab62a9f39fce1e6a78d9dcd6b56f3e32e0dc9bf0d5534534c37")
                if name == "R6-18":
                    literal_r6_ok = literal_r6_ok and digest(actual[SUBJECTS[1]]) == (
                        "0fd62d8004107715af992aa259394bd9cfaaa09cfaa19b7776f8864b08d5deed")
                cause_ok = (len(originals) == 1 and originals[0]["nodes"][0]["errno"] == 5
                    and fingerprint in originals[0]["nodes"][0]["message"]
                    and bool(journals) and journals[0]["originalException"] == originals[0])
                observations = [json.loads(line.removeprefix("P115 final recovery observation: "))
                    for line in lines.splitlines() if line.startswith("P115 final recovery observation: ")]
                recovery_ok = ("P115 recovery incomplete:" in lines and "P115 recovery complete;" not in lines
                    and len(journals) == 1 and bool(journals[0]["recoveryConflicts"])
                    and len(observations) == 1 and observations[0]["targetCount"] == 8
                    and not observations[0]["complete"]
                    and observations[0]["observationId"].startswith(journals[0]["attemptId"] + ":")
                    and observations[0]["scope"] == "exclusive-checkout sequential read-only observation; no atomic/CAS/beyond-window guarantee"
                    and observations[0]["startedAt"] <= observations[0]["endedAt"]
                    and observations[0]["startedAt"].endswith("Z") and observations[0]["endedAt"].endswith("Z"))
            tracked_ok = True
            tracked_after = {"flags": git(tree, "ls-files", "-v", "-z", "--", "README.md").decode(),
                "workingBlob": git(tree, "hash-object", "--no-filters", "--", "README.md").decode().strip(),
                "workingGitMode": "100755" if (tree / "README.md").stat().st_mode & 0o111 else "100644"}
            if name in {"dirty-assume-unchanged", "dirty-skip-worktree", "dirty-stat-cache", "dirty-mode-hidden"}:
                expected_flag = {"dirty-assume-unchanged": "h", "dirty-skip-worktree": "S"}.get(name, "H")
                tracked_ok = (tracked_before["status"] == "" and tracked_before["flags"] == expected_flag + " README.md\0"
                    and tracked_after["flags"] == tracked_before["flags"]
                    and tracked_after["workingBlob"] == tracked_before["workingBlob"]
                    and tracked_after["workingGitMode"] == tracked_before["workingGitMode"])
                if name == "dirty-mode-hidden":
                    tracked_ok = tracked_ok and tracked_before["workingGitMode"] == "100755"
                    cause_ok = "P115 tracked working mode differs from the admitted object: README.md" in lines
                else:
                    tracked_ok = tracked_ok and tracked_before["headBlob"] != tracked_before["workingBlob"]
                    cause_ok = ("P115 tracked checkout has unsupported index flags" in lines if expected_flag != "H"
                                else "P115 tracked working bytes differ from the admitted object: README.md" in lines)
            if name in {"guard-assume-unchanged", "guard-stat-cache"}:
                tracked_ok = (tracked_before["flags"] == "H README.md\0" and tracked_before["status"] == ""
                    and tracked_before["headBlob"] == tracked_before["workingBlob"]
                    and all(not j["publications"] for j in journals))
                if name == "guard-assume-unchanged":
                    tracked_ok = tracked_ok and tracked_after["flags"] == "h README.md\0"
                    cause_ok = "P115 tracked checkout has unsupported index flags" in lines
                else:
                    tracked_ok = (tracked_ok and tracked_after["flags"] == "H README.md\0"
                        and tracked_before["headBlob"] != tracked_after["workingBlob"])
                    cause_ok = "P115 tracked working bytes differ from the admitted object: README.md" in lines
            if name == "ignored-output-control":
                tracked_ok = ignored.read_text() == "Synthetic ignored build output.\n"
            ownership_ok = all(recorder.p115_identity(tree / rel) == identity
                               for rel, identity in foreign_identities.items())
            if name in {"T03", "T04", "T05", "T12", "T13", "T14"}:
                ownership_ok = ownership_ok and all(str(RECORD) not in j["publications"] for j in journals)
            if name in {"T06", "T07", "T08", "T19"}:
                ownership_ok = ownership_ok and all(str(RECORD) in j["publications"] for j in journals)
            if name in {"apply-after-write-failure", "postcondition-drift", "BATCH-2", "BATCH-3", "BATCH-4"}:
                ownership_ok = ownership_ok and all(not j["publications"] for j in journals)
            if name == "OWN-4":
                ownership_ok = ownership_ok and all(str(SUBJECTS[1]) in j["publications"] for j in journals)
            if name == "DIRECT-1":
                ownership_ok = ownership_ok and all(j["operation"] == "apply" and set(j["publications"]) == {str(SUBJECTS[1])}
                    and j["paths"][-2]["after"] is None for j in journals)
            if name == "R6-18":
                ownership_ok = ownership_ok and all(j["operation"] == "apply"
                    and set(j["publications"]) == {str(SUBJECTS[1])} and j["paths"][-2]["after"] is None for j in journals)
            private_ok = all(
                len(j["batch"]["orderedPatches"]) == 5 and
                j["batch"]["commands"][0]["argv"] == ["git", "init", "--quiet", "--template="]
                and len(j["privatePayloadOnFailure"] or []) > 0
                for j in journals if j["state"] == "failed" and j.get("batch", {}).get("commands"))
            if cleanup_case and journals:
                private_ok = (journals[0]["privatePayloadCapturedAtCompletion"]
                    and journals[0]["privatePayloadSurvivors"] == recorder.p115_private_inventory(payload)
                    and (not journals[0]["privatePayloadSurvivors"] if name == "T11" else
                         journals[0]["privatePayloadSurvivors"] == journals[0]["privatePayloadCapturedAtCompletion"]))
            if name == "BATCH-2":
                private_ok = (private_ok and len(journals) == 1
                    and journals[0]["batch"]["commands"][-1]["returncode"] == -25
                    and any(row["path"] == "projection/" + str(SUBJECTS[1]) and row.get("bytes") == 18000
                            for row in journals[0]["privatePayloadOnFailure"]))
            if native_batches:
                private_ok = private_ok and all(Path(row["cwd"]) != tree
                    and Path(row["gitWorkTree"]) == Path(row["cwd"])
                    and Path(row["gitDir"]).parent == Path(row["cwd"]).parent
                    and Path(row["gitIndexFile"]) == Path(row["gitDir"]) / "index" for row in native_batches)
            stages_clean = not any(any(parent.glob(".p115-*")) for parent in
                                   {(tree / rel).parent for rel in paths})
            expect("entrypoint " + name, state_ok and gate_ok and index_ok and dirt_ok and reached
                   and failure_evidence and cause_ok and preimages_ok and recovery_ok and stages_clean and ownership_ok and private_ok and tracked_ok and literal_r6_ok)
            mutation_receipt(tree, "entrypoint " + name, before, actual,
                             "exact scoped preimages/foreign states; no failed transaction signed")
            print("P115-TRANSACTION-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
                "ranAt": git(tree, "rev-parse", "HEAD").decode().strip(), "sourceHead": git(root, "rev-parse", "HEAD").decode().strip(),
                "tools": {p: digest((root / "scripts" / p).read_bytes()) for p in
                          (Path(__file__).name, "record_versioned_signoff.py")},
                "old": "real main(argv), clean captured inputs, real five-patch batch and staged writes",
                "new": name, "predicate": "P115 clean admission, exact postconditions and ownership-preserving recovery",
                "exit": code, "events": events, "expectedStates": {str(p): None if b is None else digest(b) for p,b in expected.items()},
                "actualStates": {str(p): None if b is None else digest(b) for p,b in actual.items()},
                "assertions": {"states": state_ok, "authority": gate_ok, "index": index_ok, "dirt": dirt_ok,
                               "barrierReached": reached, "failureEvidence": failure_evidence, "cause": cause_ok, "privateBatch": bool(private_ok),
                               "ownership": ownership_ok, "retentionVerified": retention_ok, "trackedCheckout": tracked_ok},
                "literalR6FixtureIdentity": literal_r6_ok, "nativeOperations": native_operations,
                "trackedBefore": tracked_before, "trackedAfter": tracked_after,
                "recoveryPreimagesExact": preimages_ok, "recoveryDiagnosticExact": recovery_ok,
                "receiptIdentityAndCaptureTime": receipt_identity_ok,
                "requiredEvents": required, "stageFilesRemoved": stages_clean,
                "originalException": originals, "foreignIdentities": {str(p): t for p,t in foreign_identities.items()},
                "journals": journals, "receiptLinkAttempts": receipt_link_attempts,
                "verifiedReceiptPhases": phases, "retentionClaims": claims, "nativeBatches": native_batches,
                "entryOperation": "direct Package.apply" if name in {"DIRECT-1", "R6-18"} else "main --record", "output": lines}, sort_keys=True))
            if name == "R6-15":
                output.close()
            shutil.rmtree(tree)


def recovery_native_selftest(root: Path, expect) -> None:
    """Eleven fast native filesystem cases; no MAIN, owner or signed result is inferred."""
    import record_versioned_signoff as recorder
    import stat
    import traceback
    from unittest import mock
    cases = (
        ("R6-03", "same-byte foreign stage pathname substitution"),
        ("R6-04", "recovery-stage native partial write failure"),
        ("R6-05", "recovery-stage native fsync failure"),
        ("R6-06", "recovery-stage native creation failure"),
        ("R6-07", "native recovery replace succeeded then wrapper raised"),
        ("R6-08", "restored target altered after native replacement"),
        ("R6-09", "earlier restored target drifts during later recovery"),
        ("R6-10", "native absence unlink succeeded then wrapper raised"),
        ("R6-12", "final target inspection denied"),
        ("R6-16", "late same-byte foreign target inode"),
        ("R6-17", "recovery stage cleanup failure after install"),
    )
    preimage, installed, independent = b"r6 preimage\n", b"r6 installed\n", b"r6 independent alteration\n"
    source = {p: digest((root / "scripts" / p).read_bytes()) for p in
              (Path(__file__).name, "record_versioned_signoff.py")}
    ran_at = git(root, "rev-parse", "HEAD").decode().strip()
    with tempfile.TemporaryDirectory(prefix="p115-recovery-native-") as temp:
        for name, title in cases:
            tree = Path(temp) / name
            tree.mkdir()
            paths = (Path("first"), Path("second")) if name in {"R6-08", "R6-09", "R6-16"} else (Path("first"),)
            before = {p: None if name == "R6-10" else preimage for p in paths}
            for rel, body in before.items():
                if body is not None:
                    (tree / rel).write_bytes(body)
            before_identity = {p: recorder.p115_identity(tree / p) for p in paths}
            outputs = {p: installed for p in paths}
            publications, order, restored, blocked = {}, [], {}, set()
            operations, events, foreign = [], [], {}
            for rel in reversed(paths):
                def published(identity, rel=rel):
                    publications[rel] = recorder.P115Publication(name, rel, identity, stat.S_IFREG,
                                                                 installed, digest(installed))
                    order.append(rel)
                    fd = recorder.os.open(tree / rel, recorder.os.O_RDONLY | recorder.os.O_NOFOLLOW)
                    with recorder.os.fdopen(fd, "rb") as stream:
                        info = recorder.os.fstat(stream.fileno())
                        body = stream.read()
                        after = recorder.os.fstat(stream.fileno())
                    confirmed = (stat.S_ISREG(info.st_mode) and stat.S_ISREG(after.st_mode)
                        and (info.st_dev, info.st_ino) == (after.st_dev, after.st_ino) == identity
                        and body == installed)
                    operations.append({"actualOperation": "native forward publication callback",
                        "path": str(rel), "identity": identity, "fstatConfirmed": confirmed,
                        "independentDescriptor": {"openFlags": ["O_RDONLY", "O_NOFOLLOW"],
                            "device": info.st_dev, "inode": info.st_ino,
                            "kind": "regular" if stat.S_ISREG(info.st_mode) else "nonregular",
                            "literalInstalledBody": body == installed, "bodyHex": body.hex(),
                            "afterIdentity": [after.st_dev, after.st_ino], "closed": stream.closed}})
                recorder.p115_publish(tree / rel, installed, expected=before[rel],
                    expected_identity=before_identity[rel], published=published)
            original_fsync, original_fdopen = recorder.os.fsync, recorder.os.fdopen
            original_replace, original_unlink = recorder.os.replace, Path.unlink
            original_lstat, original_mkstemp = Path.lstat, recorder.tempfile.mkstemp
            fired, stage_count = set(), []

            def fault(operation, number):
                operations.append({"actualOperation": operation, "phase": "recovery", "nativeReturned": False})
                events.append(name + " actual native " + operation + " fault")
                raise OSError(number, "P115 " + name + " helper-local native fault")

            def mkstemp(*args, **kwargs):
                if name == "R6-06":
                    fault("tempfile.mkstemp", 28)
                return original_mkstemp(*args, **kwargs)

            class PrefixStream:
                def __init__(self, fd, mode):
                    self.stream = original_fdopen(fd, mode)
                def __enter__(self):
                    self.stream.__enter__()
                    return self
                def write(self, value):
                    self.stream.write(value[:4])
                    self.stream.flush()
                    operations.append({"actualOperation": "file.write/flush", "nativeReturned": True,
                                       "literalWrittenHex": b"r6 p".hex()})
                    fault("recovery partial write", 28)
                def __exit__(self, *exc):
                    return self.stream.__exit__(*exc)

            def fsync(fd):
                if name == "R6-05":
                    fault("os.fsync", 28)
                result = original_fsync(fd)
                staged = Path(recorder.os.readlink(f"/proc/self/fd/{fd}"))
                stage_count.append(str(staged))
                operations.append({"actualOperation": "os.fsync", "phase": "recovery stage", "nativeReturned": True})
                if name == "R6-03":
                    replacement = tree / "foreign-stage"
                    replacement.write_bytes(preimage)
                    original_replace(replacement, staged)
                    foreign[staged] = (preimage, recorder.p115_identity(staged))
                    events.append("same-byte independently identified recovery stage substitution")
                if name in {"R6-09", "R6-16"} and len(stage_count) == 2:
                    target = tree / paths[0]
                    if name == "R6-09":
                        target.write_bytes(independent)
                    else:
                        replacement = tree / "foreign-target"
                        replacement.write_bytes(preimage)
                        original_replace(replacement, target)
                    foreign[target] = (target.read_bytes(), recorder.p115_identity(target))
                    events.append("independent earlier-target change during second recovery stage")
                return result

            def replace(source_path, destination):
                result = original_replace(source_path, destination)
                operations.append({"actualOperation": "os.replace", "phase": "recovery", "nativeReturned": True,
                                   "path": str(Path(destination).relative_to(tree))})
                if destination == tree / paths[0] and name in {"R6-07", "R6-08"} and name not in fired:
                    fired.add(name)
                    if name == "R6-07":
                        fault("post-return os.replace wrapper", 5)
                    if name == "R6-08":
                        Path(destination).write_bytes(independent)
                        foreign[Path(destination)] = (independent, recorder.p115_identity(Path(destination)))
                        events.append("independent target alteration after real recovery replace")
                return result

            def unlink(path, *args, **kwargs):
                result = original_unlink(path, *args, **kwargs)
                operations.append({"actualOperation": "Path.unlink", "path": str(path), "nativeReturned": True})
                if name == "R6-10" and path == tree / paths[0]:
                    fault("post-return Path.unlink wrapper", 5)
                return result

            def lstat(path, *args, **kwargs):
                if (name == "R6-12" and path == tree / paths[0]
                        and any(frame.name == "p115_recovery_observation" for frame in traceback.extract_stack())):
                    fault("final target Path.lstat", 13)
                if (name == "R6-17" and path.name.startswith(".p115-")
                        and paths[0] in restored and name not in fired):
                    fired.add(name)
                    # Native cleanup inspection after the recovery callback;
                    # no unlink is invented for a stage consumed by replace.
                    fault("post-recovery-publication cleanup Path.lstat", 5)
                return original_lstat(path, *args, **kwargs)

            with mock.patch.object(recorder.tempfile, "mkstemp", mkstemp), \
                 mock.patch.object(recorder.os, "fdopen", PrefixStream if name == "R6-04" else original_fdopen), \
                 mock.patch.object(recorder.os, "fsync", fsync), \
                 mock.patch.object(recorder.os, "replace", replace), \
                 mock.patch.object(Path, "unlink", unlink), \
                 mock.patch.object(Path, "lstat", lstat):
                conflicts, errors = recorder.p115_recover(tree, before, outputs, before_identity,
                    order, publications, restored=restored, blocked=blocked)
            actual = {p: recorder.p115_read(tree / p) for p in paths}
            expected = dict(before)
            if name in {"R6-03", "R6-04", "R6-05", "R6-06"}:
                expected[paths[0]] = installed
            if name in {"R6-08", "R6-09"}:
                expected[paths[0]] = independent
            state_ok = actual == expected
            foreign_ok = all(recorder.p115_read(p) == body and recorder.p115_identity(p) == identity
                             for p, (body, identity) in foreign.items())
            expected_events = {
                "R6-03": "same-byte independently identified recovery stage substitution",
                "R6-04": "R6-04 actual native recovery partial write fault",
                "R6-05": "R6-05 actual native os.fsync fault",
                "R6-06": "R6-06 actual native tempfile.mkstemp fault",
                "R6-07": "R6-07 actual native post-return os.replace wrapper fault",
                "R6-08": "independent target alteration after real recovery replace",
                "R6-09": "independent earlier-target change during second recovery stage",
                "R6-10": "R6-10 actual native post-return Path.unlink wrapper fault",
                "R6-12": "R6-12 actual native final target Path.lstat fault",
                "R6-16": "independent earlier-target change during second recovery stage",
                "R6-17": "R6-17 actual native post-recovery-publication cleanup Path.lstat fault",
            }
            reached = expected_events[name] in events
            expected_errno = {"R6-04": 28, "R6-05": 28, "R6-06": 28,
                              "R6-07": 5, "R6-10": 5, "R6-12": 13, "R6-17": 5}.get(name)
            errors_ok = bool(conflicts)
            if expected_errno is not None:
                errors_ok = errors_ok and any(e["nodes"][0].get("errno") == expected_errno for e in errors)
            stages = list(tree.glob(".p115-*"))
            cleanup_ok = stages == list(foreign) if name == "R6-03" else not stages
            witnesses_ok = len(order) == len(paths) and all(
                op["fstatConfirmed"] for op in operations if op["actualOperation"] == "native forward publication callback")
            if name == "R6-07":
                witnesses_ok = witnesses_ok and paths[0] not in restored and sum(
                    op["actualOperation"] == "os.replace" for op in operations) == 1
            if name == "R6-10":
                witnesses_ok = witnesses_ok and paths[0] not in restored and sum(
                    op["actualOperation"] == "Path.unlink" for op in operations) == 1
            if name == "R6-17":
                witnesses_ok = witnesses_ok and paths[0] in restored and not any(
                    op["actualOperation"] == "Path.unlink" for op in operations)
            passed = state_ok and foreign_ok and reached and errors_ok and cleanup_ok and witnesses_ok
            expect(name + " " + title, passed)
            print("P115-RECOVERY-HELPER-EVIDENCE " + json.dumps({"case": name, "title": title,
                "scope": "synthetic fast filesystem helper only; no MAIN/owner/signed result", "ranAt": ran_at,
                "tools": source, "targetDenominator": len(paths), "nativeOperations": operations, "events": events,
                "old": {str(p): None if b is None else b.hex() for p, b in before.items()},
                "installed": installed.hex(), "expected": {str(p): None if b is None else b.hex() for p, b in expected.items()},
                "actual": {str(p): None if b is None else b.hex() for p, b in actual.items()},
                "assertions": {"literalStates": state_ok, "foreignPreserved": foreign_ok, "barrierReached": reached,
                    "helperErrorsRetained": errors_ok, "ownedCleanup": cleanup_ok, "nativeWitnesses": witnesses_ok},
                "foreign": {str(p.relative_to(tree)): {"bodyHex": body.hex(), "identity": identity}
                            for p, (body, identity) in foreign.items()},
                "recoveryWitnesses": {str(p): identity for p, identity in restored.items()},
                "conflicts": conflicts, "helperExceptions": errors}, sort_keys=True))


def marker_context_selftest(root: Path, expect) -> None:
    """Fast literal context vectors; no signed/MAIN/native-operation claim."""
    excluded = ("pre", "code", "listing", "template", "script", "style", "textarea", "title",
                "xmp", "iframe", "noembed", "noframes", "plaintext", "noscript")
    block = MARKER + "\n" + END_MARKER + "\n"
    example = MARKER + "\nsynthetic example only\n" + END_MARKER + "\n"
    groups = {
        "HTML context finite example exclusions": [
            (name, f"<{name}>\n" + block + f"</{name}>\n", None) for name in excluded],
        "HTML context ordered transitions and ambiguity refuse": [
            ("pre-reopened-same-line", "<pre></pre><pre>\n" + block + "</pre>\n", None),
            ("pre-close-reopen", "<pre>\n</pre><pre>\n" + block + "</pre>\n", None),
            ("mixed-case-reopen", "<PrE></pRe><XmP>\n" + block + "</xMp>\n", None),
            ("pre-commented-close", "<pre>\n<!-- </pre> -->\n" + example + "</pre>\n", None),
            ("pre-attribute-close", '<pre><div title="</pre>">\n' + example + "</div></pre>\n", None),
            ("pre-opening-attribute-close", '<pre title="</pre>">\n' + example + "</pre>\n", None),
            ("multiline-quoted-tag", '<pre data-example="\n</pre>\n">\n' + block + "</pre>\n", None),
            ("comment-then-reopen", "<!-- <pre> --> <pre></pre><pre>\n" + block + "</pre>\n", None),
            ("raw-inner-close-is-text", "<xmp></pre>\n" + block + "</xmp>\n", None),
            ("raw-comment-is-text", "<textarea><!--\n" + block + "</textarea>\n", None),
            ("nonvoid-self-closing", "<pre/>\n" + block + "</pre>\n", None),
            ("script-escaped-ambiguity", "<script><!--<script></script>\n" + block, None),
            ("plaintext-never-closes", "<plaintext></plaintext>\n" + block, None),
            ("noscript-environment-ambiguity", "<noscript></noscript>\n" + block, None),
            ("unclosed-quoted-tag", '<pre data-example="\n' + block, None),
            ("mismatched-container-close", "<pre><code></pre>\n" + block + "</code>\n", None),
        ],
        "HTML context unambiguous closure preserves genuine markers": [
            (name, f"<{name}>\nexample\n</{name}>\n" + block,
             len(f"<{name}>\nexample\n</{name}>\n")) for name in excluded[:-2]] + [
            ("raw-inner-open-is-text", "<xmp><pre></xmp>\n" + block, len("<xmp><pre></xmp>\n")),
            ("nested-containers-close", "<pre><code>example</code></pre>\n" + block,
             len("<pre><code>example</code></pre>\n")),
            ("quoted-attribute-is-not-a-tag", '<div title="<pre>"></div>\n' + block,
             len('<div title="<pre>"></div>\n')),
            ("different-tag-name", "<prelude></prelude>\n" + block, len("<prelude></prelude>\n")),
            ("fence-keeps-example-tag-inert", "```text\n<pre>\n```\n" + block,
             len("```text\n<pre>\n```\n")),
        ],
    }
    for name, vectors in groups.items():
        rows = []
        for label, body, begin in vectors:
            expected = {MARKER: [] if begin is None else [begin],
                        END_MARKER: [] if begin is None else [begin + len(MARKER) + 1]}
            actual = operative_markers(body, (MARKER, END_MARKER))
            rows.append({"vector": label, "old": block, "new": body, "expectedOffsets": expected,
                         "actualOffsets": actual, "passed": actual == expected})
        passed = all(row["passed"] for row in rows)
        expect(name, passed)
        print("P115-MARKER-CONTEXT-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
            "scope": "pure finite eligibility only; no MAIN/signed result", "ranAt":
            git(root, "rev-parse", "HEAD").decode().strip(), "toolSHA256": digest(Path(__file__).read_bytes()),
            "vectorCount": len(rows), "vectors": rows, "passed": passed}, sort_keys=True))



    # Literal independent tables: no SUT splitter/scanner computes an oracle.
    begin, end = "<!-- begin -->", "<!-- end -->"
    plain = begin + "\n" + end + "\n"
    finite = {
        "physical marker CR LF CRLF boundaries": [
            ("LF", begin + "\n" + end + "\n", {begin: [0], end: [15]}),
            ("CR", begin + "\r" + end + "\r", {begin: [0], end: [15]}),
            ("CRLF", begin + "\r\n" + end + "\r\n", {begin: [0], end: [16]}),
        ],
        "physical marker nonline prefix suffix exclusions": [],
        "physical fence trailers and source order": [
            ("CR-fence", "```\rexample\r```\r" + plain, {begin: [16], end: [31]}),
            ("CRLF-multiline-pre", '<pre\r\n>example</pre>\r\n' + plain, {begin: [22], end: [37]}),
            ("ordinary-fenced", "```text\nexample\n" + plain + "```\n", {begin: [], end: []}),
            ("false-close-LS", "```text\nexample\n```\u2028" + plain + "```\n", {begin: [], end: []}),
            ("false-close-LS-real-LF", "```text\nexample\n```\u2028\n" + plain + "```\n", {begin: [], end: []}),
            ("ASCII-space-tab-close", "```text\nexample\n``` \t\n" + plain, {begin: [22], end: [37]}),
        ],
        "HTML named close exact ASCII separators": [],
    }
    for codepoint in (0x000B, 0x000C, 0x001C, 0x001D, 0x001E, 0x0085, 0x2028, 0x2029):
        char = chr(codepoint)
        finite["physical marker nonline prefix suffix exclusions"].extend((
            (f"{codepoint:04X}-before-begin", "X" + char + begin + "\n" + end + "\n", {begin: [], end: [17]}),
            (f"{codepoint:04X}-after-begin", begin + char + "X\n" + end + "\n", {begin: [], end: [17]}),
            (f"{codepoint:04X}-before-end", begin + "\nX" + char + end + "\n", {begin: [0], end: []}),
            (f"{codepoint:04X}-after-end", begin + "\n" + end + char + "X\n", {begin: [0], end: []}),
        ))
    for tag_name, offsets in (("pre", (20, 35)), ("script", (26, 41)), ("textarea", (30, 45))):
        for codepoint in (0x0009, 0x000A, 0x000C, 0x000D, 0x0020):
            finite["HTML named close exact ASCII separators"].append((
                f"{tag_name}-ASCII-{codepoint:04X}",
                f"<{tag_name}>example</{tag_name}{chr(codepoint)}>\n" + plain,
                {begin: [offsets[0]], end: [offsets[1]]}))
        for codepoint in (0x000B, 0x001C, 0x001D, 0x001E, 0x0085, 0x00A0, 0x2028, 0x2029):
            finite["HTML named close exact ASCII separators"].append((
                f"{tag_name}-nonseparator-{codepoint:04X}",
                f"<{tag_name}>example</{tag_name}{chr(codepoint)}>\n" + plain, {begin: [], end: []}))
    for name, vectors in finite.items():
        rows = []
        for label, body, expected in vectors:
            actual = operative_markers(body, (begin, end))
            rows.append({"vector": label, "old": plain, "new": body, "expectedOffsets": expected,
                "actualOffsets": actual, "rawCounts": [body.count(begin), body.count(end)],
                "passed": actual == expected and body.count(begin) == 1 and body.count(end) == 1})
        passed = all(row["passed"] for row in rows)
        expect(name, passed)
        print("P115-MARKER-CONTEXT-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
            "scope": "pure finite eligibility only; no MAIN/signed result", "ranAt":
            git(root, "rev-parse", "HEAD").decode().strip(), "toolSHA256": digest(Path(__file__).read_bytes()),
            "vectorCount": len(rows), "vectors": rows, "passed": passed}, sort_keys=True))


def family_failure_selftest(root: Path, tree: Path, expect, before: dict, earlier: dict,
                            *, only: set[str] | None = None) -> None:
    """Finite family vectors exercise real readers and both existing operations.

    Every fixture commit/record is synthetic. Native metadata/read faults are
    confined to the exact own fixture path; no gate/recognition result is stubbed.
    """
    import record_versioned_signoff as recorder
    import record_pwb_behavior_amendment_acts as behavior
    import build_three_surface_poc_readability_successor as readability
    import check_spec_reconciliation as reconciliation
    import check_governance as governance
    from unittest import mock
    pkg = recorder.real_packages()[KEY]
    signed = {p: (tree / p).read_bytes() for p in (*SUBJECTS, RECORD, AGGREGATE)}
    fields = recorder.parse_record(signed[RECORD].decode())
    block = recorder.render_aggregate(pkg, VERSION, fields["Date"], fields["Review"],
                                      fields["Review verdict"], None)
    aggregate = signed[AGGREGATE].decode().replace(block, "").rstrip("\n") + "\n"
    census_path = Path(reconciliation.CENSUS)
    census_signed = (tree / census_path).read_bytes()
    census_base = git(tree, "show", f"{CORE_COMMIT}:{census_path}")
    unsupported = RECORD.with_name(RECORD.name.replace("v1.0", "v2.0"))
    alias = RECORD.with_name(RECORD.name.replace("v1.0", "v01.0"))
    extra = RECORD.with_name("THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF.backup")
    vectors = (
        ("POP-1 malformed v2 file", "file", unsupported),
        ("POP-2 orphan v2 end", "orphan", None),
        ("POP-3 v01 alias file", "file", alias),
        ("POP-4 canonical begin-only", "begin", None),
        ("POP-4 canonical end-only", "end", None),
        ("POP-4 mismatched versions", "mismatch", None),
        ("POP-4 duplicate canonical block", "duplicate", None),
        ("POP-5 nonregular family directory", "directory", unsupported),
        ("POP-5 symlink family entry", "symlink", unsupported),
        ("POP companion naked delimiter", "naked", None),
        ("POP companion unclosed delimiter", "unclosed", None),
        ("POP companion whitespace alias", "whitespace", None),
        ("POP companion reserved stem extension", "file", extra),
        ("POP companion missing aggregate", "missing", None),
        ("POP companion unreadable aggregate", "unreadable", None),
        ("POP context backtick fence", "backtick", None),
        ("POP context tilde fence", "tilde", None),
        ("POP context indented code", "indented", None),
        ("POP context nested comment", "nested", None),
        ("POP context prefixed begin marker", "prefixed", None),
        ("POP context suffixed end marker", "suffixed", None),
        ("POP context raw pre block", "pre", None),
        ("POP context pre reopened same line", "pre-reopened", None),
        ("POP context pre close reopen", "pre-close-reopen", None),
        ("POP context raw xmp block", "xmp", None),
        ("POP context quoted multiline mixed raw", "mixed-raw", None),
        ("POP boundary LS prefixed begin", "ls-begin", None),
        ("POP boundary VT prefixed end", "vt-end", None),
        ("POP boundary false fence LS", "false-fence-ls", None),
        ("POP boundary invalid pre close LS", "invalid-pre-close-ls", None),
    )
    def setup(installed):
        for path in (unsupported, alias, extra):
            target = tree / path
            if target.is_dir() and not target.is_symlink():
                target.rmdir()
            else:
                target.unlink(missing_ok=True)
        for path in SUBJECTS:
            (tree / path).write_bytes(signed[path] if installed else before[path])
        if installed:
            (tree / RECORD).write_bytes(signed[RECORD])
        else:
            (tree / RECORD).unlink(missing_ok=True)
        (tree / AGGREGATE).write_bytes(signed[AGGREGATE] if installed else aggregate.encode())
        (tree / census_path).write_bytes(census_signed if installed else census_base)

    governance_reports = []
    def bootstrap():
        saved = governance.ROOT
        try:
            governance.ROOT = str(tree)
            report = governance.Results()
            governance.cg7h_general_bootstrap_act(report)
            governance_reports.append({"failed": report.failed(), "summaries": report.summaries})
            return not report.failed()
        finally:
            governance.ROOT = saved

    for installed in (True, False):
        setup(installed)
        control_findings, control_state = check_state(tree)
        control_preview = preview(tree)
        control_label = ("performed; current six rows verified; explicit historical builder replay" if installed
                         else "candidate; actual current subjects checked; not performed")
        control = (is_signed(tree) == installed and not control_findings and bootstrap()
                   and control_state == control_label and control_preview["state"] == control_label
                   and not control_preview["candidateFindings"])
        for label, mutation, path in vectors:
            if only is not None and label not in only:
                continue
            setup(installed)
            start = {p: (tree / p).read_bytes() if (tree / p).exists() else None
                     for p in (AGGREGATE, RECORD, *((path,) if path else ()))}
            if mutation == "file":
                (tree / path).write_bytes(b"Malformed synthetic P115 reserved-family record.\n")
            elif mutation == "directory":
                (tree / path).mkdir()
            elif mutation == "symlink":
                (tree / path).symlink_to("README.md")  # Census observes metadata; target is Syzygy documentation.
            elif mutation == "missing":
                (tree / AGGREGATE).unlink()
            elif mutation != "unreadable":
                prefixes = {
                    "orphan": (tree / AGGREGATE).read_text() + END_MARKER.replace("v1.0", "v2.0"),
                    "begin": aggregate + MARKER,
                    "end": aggregate + END_MARKER,
                    "mismatch": aggregate + MARKER + "\n" + END_MARKER.replace("v1.0", "v2.0"),
                    "duplicate": aggregate + block + block,
                    "naked": (tree / AGGREGATE).read_text() + f"versioned-signoff:{KEY}:v1.0",
                    "unclosed": (tree / AGGREGATE).read_text() + f"<!-- versioned-signoff:{KEY}:v1.0",
                    "whitespace": (tree / AGGREGATE).read_text() + f"<!-- versioned-signoff : {KEY}:v1.0 -->",
                    "backtick": aggregate + "```text\n" + block + "```\n",
                    "tilde": aggregate + "~~~text\n" + block + "~~~\n",
                    "indented": aggregate + "".join("    " + line for line in block.splitlines(keepends=True)),
                    "nested": aggregate + "<!-- outer synthetic example\n" + block + "-->\n",
                    "prefixed": aggregate + block.replace(MARKER, "Example: " + MARKER),
                    "suffixed": aggregate + block.replace(END_MARKER, END_MARKER + " example"),
                    "pre": aggregate + "<pre>\n" + block + "</pre>\n",
                    "ls-begin": aggregate + block.replace(MARKER, "Example\u2028" + MARKER),
                    "vt-end": aggregate + block.replace(END_MARKER, "Example\v" + END_MARKER),
                    "false-fence-ls": aggregate + "```text\nexample\n```\u2028" + block + "```\n",
                    "invalid-pre-close-ls": aggregate + "<pre>example</pre\u2028>\n" + block,
                    "pre-reopened": aggregate + "<pre></pre><pre>\n" + block + "</pre>\n",
                    "pre-close-reopen": aggregate + "<pre>\n</pre><pre>\n" + block + "</pre>\n",
                    "xmp": aggregate + "<xmp>\n" + block + "</xmp>\n",
                    "mixed-raw": aggregate + '<PrE data-example="\n</pre>\n">example</pRe><xMp>\n'
                                 + block + "</XmP>\n",
                }
                (tree / AGGREGATE).write_text(prefixes[mutation])
            # Whole-clean admission is real, so malformed family must be its
            # actual blocker rather than unrelated dirty-fixture refusal.
            git(tree, "add", "--all")
            git(tree, "-c", "user.name=P115 synthetic family", "-c", "user.email=fixture@invalid",
                "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "--allow-empty", "-m",
                "Synthetic malformed P115 family; no owner action")
            physical = {p: (tree / p).read_bytes() if (tree / p).exists() else None
                        for p in (*SUBJECTS, RECORD, AGGREGATE)}
            raw_read = Path.read_bytes
            def read_bytes(target):
                if mutation == "unreadable" and target == tree / AGGREGATE:
                    raise PermissionError(13, "P115 synthetic family aggregate read refused", str(target))
                return raw_read(target)
            outputs, codes, frontiers = {}, {}, {}
            governance_reports.clear()
            saved_root = recorder.ROOT
            try:
                recorder.ROOT = tree
                with mock.patch.object(Path, "read_bytes", read_bytes):
                    state, findings = family_state(tree)
                    check_findings, check_label = check_state(tree)
                    preview_result = preview(tree)
                    frontiers.update(control=control, family=state == "PRESENT_INVALID" and bool(findings),
                        presence=transaction_present(tree), candidate=bool(candidate_findings(tree)),
                        recording=bool(recording_findings(tree)), checkState=bool(check_findings),
                        checkStateLabel=check_label == "Unknown; P115 state unverified",
                        preview=bool(preview_result["candidateFindings"]) and not preview_result["recordingReady"],
                        previewLabel=preview_result["state"] == "Unknown; P115 state unverified",
                        signed=bool(signed_findings(tree)) and not is_signed(tree),
                        chain=bool(chain_findings(tree)), historical=bool(historical_run(tree, "--check")[0]))
                    if mutation in {"backtick", "tilde", "indented", "nested", "prefixed", "suffixed", "pre",
                                    "pre-reopened", "pre-close-reopen", "xmp", "mixed-raw",
                                    "ls-begin", "vt-end", "false-fence-ls", "invalid-pre-close-ls"}:
                        frontiers["operativeContext"] = any("not an operative standalone line" in f for f in findings)
                    try:
                        inputs = validation_inputs(tree)
                        frontiers["snapshotClosure"] = path is None or path.as_posix() in inputs
                    except (OSError, ValueError):
                        frontiers["snapshotClosure"] = True  # Explicit refusal, never lossy snapshot success.
                    for operation in ("check", "record", "apply", "unsupported-check"):
                        out = io.StringIO()
                        with contextlib.redirect_stdout(out):
                            if operation == "apply":
                                code = pkg.apply(tree)
                            elif operation == "record":
                                code = recorder.main(["--record", KEY, "--version", VERSION, "--date", "2026-10-21",
                                    "--review", fields["Review"], "--owner-selection-quote", "Synthetic family fixture only"])
                            else:
                                code = recorder.main(["--check", KEY, "--version",
                                                      "2.0" if operation == "unsupported-check" else VERSION])
                        codes[operation], outputs[operation] = code, out.getvalue()
                    frontiers["CLIAndOperations"] = (all(code == 1 for code in codes.values())
                        and all("not performed" not in text and "superseded" not in text for text in outputs.values())
                        and "must be clean" not in outputs["record"] and "must be clean" not in outputs["apply"])
                    sha = dict((p, sha) for sha, p in manifest_rows(tree))[str(SUBJECTS[-1])]
                    frontiers["behaviorRows"] = sha not in behavior._later_rows(tree, None, str(SUBJECTS[-1]))
                    reconstructed = readability.installed_bytes_at(tree)
                    frontiers["readability"] = reconstructed != earlier if installed else reconstructed == earlier
                    child = next(c for c in reconciliation.CHILDREN if c["key"] == "poc")
                    successors = reconciliation.successors_for(tree, child)
                    later = next(row for row in successors if row.get("package") == KEY)
                    frontiers["reversal"] = reconciliation.bytes_at(tree, str(SUBJECTS[-1]), (later,)) is None
                    report = reconciliation.Report()
                    consumer_errors = {}
                    try:
                        reconciliation.check_outcomes(tree, report)
                        frontiers["reconciliation"] = "R1" in report.failed
                    except OSError as reader_error:
                        # Its immutable generic addition scan may refuse a
                        # nonregular reserved entry before returning a report.
                        # Only this exact fixture input is an admitted refusal.
                        consumer_errors["reconciliation"] = recorder.p115_exception(reader_error)
                        frontiers["reconciliation"] = (reader_error.filename is not None
                            and Path(reader_error.filename) in {tree / AGGREGATE, tree / path if path else tree / AGGREGATE})
                    census = reconciliation.Report()
                    try:
                        reconciliation.check_census(tree, census)
                        frontiers["census"] = (not installed or "R3" in census.failed)
                    except OSError as reader_error:
                        consumer_errors["census"] = recorder.p115_exception(reader_error)
                        frontiers["census"] = (reader_error.filename is not None
                            and Path(reader_error.filename) in {tree / AGGREGATE, tree / path if path else tree / AGGREGATE})
                    try:
                        frontiers["governance"] = not bootstrap() if installed or mutation == "missing" else bootstrap()
                    except OSError as reader_error:
                        consumer_errors["governance"] = recorder.p115_exception(reader_error)
                        frontiers["governance"] = (reader_error.filename is not None
                            and Path(reader_error.filename) in {tree / AGGREGATE, tree / path if path else tree / AGGREGATE})
            finally:
                recorder.ROOT = saved_root
            after = {p: (tree / p).read_bytes() if (tree / p).exists() else None for p in physical}
            frontiers["noWrites"] = after == physical
            name = label + (" on signed" if installed else " on unsigned")
            expect(name, all(frontiers.values()))
            changed = {p: (tree / p).read_bytes() if (tree / p).is_file() and not (tree / p).is_symlink() else None for p in start}
            mutation_receipt(tree, name, start, changed, "complete reserved-family invalidity at every P115 frontier")
            print("P115-FAMILY-EVIDENCE " + json.dumps({"case": name, "ranAt": git(tree, "rev-parse", "HEAD").decode().strip(),
                "sourceHead": git(root, "rev-parse", "HEAD").decode().strip(), "syntheticOnly": True,
                "tools": {n: digest((root / "scripts" / n).read_bytes()) for n in
                          (Path(__file__).name, "record_versioned_signoff.py")},
                "old": "valid signed v1.0" if installed else "pristine unsigned BASE subjects",
                "new": mutation, "entry": None if path is None else str(path), "familyState": state,
                "findings": findings, "checkState": {"state": check_label, "findings": check_findings},
                "preview": preview_result, "frontiers": frontiers, "codes": codes, "consumerErrors": consumer_errors, "governanceReports": governance_reports, "output": outputs}, sort_keys=True))
    if only is None or "POP companion extended different package token stays outside family" in only:
        setup(False)
        unrelated = f"<!-- versioned-signoff:{KEY}-different:v2.0 -->"
        saved = (tree / AGGREGATE).read_bytes()
        (tree / AGGREGATE).write_bytes(saved + unrelated.encode())
        expect("POP companion extended different package token stays outside family",
               family_state(tree) == ("ABSENT", []) and not transaction_present(tree))
        mutation_receipt(tree, "POP companion extended different package token stays outside family",
                         {AGGREGATE: saved}, {AGGREGATE: saved + unrelated.encode()}, "exact package token boundary")
    setup(True)


def binding_failure_selftest(root: Path, tree: Path, expect) -> None:
    """Four shared-binding companions through actual CLIs and own snapshots."""
    import record_versioned_signoff as recorder
    import check_spec_reconciliation as reconciliation
    fields = recorder.parse_record((tree / RECORD).read_text())
    raw = Path(fields["Review"])
    original_raw, original_record = (tree / raw).read_bytes(), (tree / RECORD).read_bytes()

    def assess(target):
        findings = binding_findings(target)
        signed = signed_findings(target)
        return {"bindingFindings": findings, "signedFindings": signed, "isSigned": is_signed(target)}

    def public_checks():
        commands = []
        for argv in ([sys.executable, "-B", str(tree / "scripts/record_versioned_signoff.py"),
                      "--check", KEY, "--version", VERSION],
                     [sys.executable, "-B", str(tree / "scripts" / Path(__file__).name), "--check"]):
            done = subprocess.run(argv, cwd=tree, capture_output=True, text=True)
            commands.append({"argv": argv, "exit": done.returncode, "stdout": done.stdout, "stderr": done.stderr})
        return commands

    control, control_cli = assess(tree), public_checks()
    positive = (control == {"bindingFindings": [], "signedFindings": [], "isSigned": True}
                and all(row["exit"] == 0 for row in control_cli))
    vectors = (
        ("binding public wrong raw manifest", {raw: original_raw.replace(MANIFEST_SHA256.encode(), b"0" * 64)}),
        ("binding public wrong package name", {raw: original_raw.replace(KEY.encode(), b"unrelated-package")}),
        ("binding public unsuitable reviewed core", {
            raw: original_raw.replace(CORE_COMMIT.encode(), BASE.encode()),
            RECORD: original_record.replace(CORE_COMMIT.encode(), BASE.encode())}),
        ("binding public frozen core drift", {BUILDER: (tree / BUILDER).read_bytes() + b"\n# Synthetic frozen core drift.\n"}),
    )
    for name, changes in vectors:
        saved = {path: (tree / path).read_bytes() for path in changes}
        try:
            for path, body in changes.items():
                (tree / path).write_bytes(body)
            result, commands = assess(tree), public_checks()
            with tempfile.TemporaryDirectory(prefix="p115-binding-snapshot-") as temp:
                snapshot = Path(temp) / "snapshot"
                reconciliation.scratch(tree, snapshot)
                snapshot_result = assess(snapshot)
                snapshot_without_git = not (snapshot / ".git").exists()
            passed = (positive and result["bindingFindings"] and result["signedFindings"] and not result["isSigned"]
                and all(row["exit"] == 1 for row in commands) and snapshot_without_git
                and snapshot_result["bindingFindings"] and snapshot_result["signedFindings"] and not snapshot_result["isSigned"])
            expect(name, bool(passed))
            mutation_receipt(tree, name, saved, changes, "shared strict P115 core/review/manifest binding across both public checks and snapshot readers")
            print("P115-BINDING-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
                "ranAt": git(tree, "rev-parse", "HEAD").decode().strip(),
                "sourceHead": git(root, "rev-parse", "HEAD").decode().strip(),
                "control": control, "controlCLI": control_cli, "result": result,
                "CLI": commands, "snapshotWithoutGit": snapshot_without_git, "snapshotResult": snapshot_result,
                "passed": bool(passed)}, sort_keys=True))
        finally:
            for path, body in saved.items():
                (tree / path).write_bytes(body)



def governing_source_selftest(root: Path, tree: Path, expect, before: dict, *, only=None) -> None:
    """Exact independent eight-path population, current bytes and own snapshots."""
    import record_versioned_signoff as recorder
    import check_spec_reconciliation as reconciliation
    specs = tuple(Path("openspec/changes") / rel for rel in (
        "cap1-trusted-bootstrap-consent/specs/project-registration-and-honest-shape-visibility/spec.md",
        "polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md",
        "polaris-manifesto-generation/specs/polaris-generation/spec.md",
        "polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md",
        "polaris-non-governed-narrative-profile/specs/polaris-generation/spec.md",
        "polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md",
        "project-registration-and-honest-shape-visibility/specs/project-registration-and-honest-shape-visibility/spec.md",
        "three-surface-poc-experience/specs/three-surface-poc-experience/spec.md"))
    pkg = recorder.real_packages()[KEY]
    signed = {p: (tree / p).read_bytes() for p in (*SUBJECTS, RECORD, AGGREGATE)}
    source = {p: (tree / p).read_bytes() for p in specs}
    fields = recorder.parse_record(signed[RECORD].decode())
    block = recorder.render_aggregate(pkg, VERSION, fields["Date"], fields["Review"], fields["Review verdict"], None)
    aggregate = signed[AGGREGATE].decode().replace(block, "").rstrip("\n") + "\n"
    def setup(installed):
        for path, body in source.items():
            target = tree / path
            if target.is_symlink() or target.is_file(): target.unlink()
            elif target.exists(): target.rmdir()
            target.write_bytes(body)
        for path in SUBJECTS: (tree / path).write_bytes(signed[path] if installed else before[path])
        (tree / AGGREGATE).write_bytes(signed[AGGREGATE] if installed else aggregate.encode())
        if installed: (tree / RECORD).write_bytes(signed[RECORD])
        else: (tree / RECORD).unlink(missing_ok=True)
    def commit():
        git(tree, "add", "--all")
        git(tree, "-c", "user.name=P115 synthetic governing input", "-c", "user.email=fixture@invalid",
            "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "--allow-empty", "-m",
            "Synthetic current governing input fixture; no owner action")
    def entry(operation):
        saved_root = recorder.ROOT
        out = io.StringIO()
        argv = (["--record", KEY, "--version", VERSION, "--date", fields["Date"], "--review", fields["Review"],
                 "--owner-selection-quote", "Synthetic current governing input fixture; no owner action"]
                if operation == "record" else ["--check", KEY, "--version", VERSION])
        start = datetime.datetime.now(datetime.timezone.utc).isoformat()
        try:
            recorder.ROOT = tree
            with contextlib.redirect_stdout(out):
                code = pkg.apply(tree) if operation == "apply" else recorder.main(argv)
        finally: recorder.ROOT = saved_root
        return {"operation": operation, "entrypoint": "Package.apply" if operation == "apply" else "recorder.main",
            "argv": None if operation == "apply" else argv, "cwd": str(tree), "callerPid": __import__("os").getpid(),
            "startedAt": start, "endedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "exit": code, "stdout": out.getvalue()}
    for installed in (False, True):
        for path in specs[:-1] if installed else specs:
            name = ("governing signed current input " if installed else "governing unsigned current input ") + path.parts[2]
            if only is not None and name not in only: continue
            setup(installed)
            old = (tree / path).read_bytes()
            changed = (old.replace(b"each have an explicit byte ceiling.", b"each have no byte ceiling.")
                       if path.parts[2] == "polaris-project-wide-butlers-model" else old + b"\nSynthetic current source drift.\n")
            assert changed != old
            (tree / path).write_bytes(changed)
            commit()
            physical = {p: recorder.p115_read(tree / p) for p in (*SUBJECTS, RECORD, AGGREGATE)}
            head, index, tags = git(tree, "rev-parse", "HEAD"), git(tree, "ls-files", "--stage", "-z"), git(tree, "tag", "--list")
            findings, label = check_state(tree)
            result = preview(tree, fields["Review"])
            operations, snapshot_result = [], None
            if installed:
                operations.append(entry("check"))
                with tempfile.TemporaryDirectory(prefix="p115-current-source-snapshot-") as temp:
                    snapshot = Path(temp) / "snapshot"
                    reconciliation.scratch(tree, snapshot)
                    snapshot_result = {"withoutGit": not (snapshot / ".git").exists(),
                        "findings": binding_findings(snapshot), "signed": is_signed(snapshot)}
                passed = (bool(binding_findings(tree)) and not is_signed(tree) and operations[0]["exit"] == 1
                          and snapshot_result["withoutGit"] and snapshot_result["findings"] and not snapshot_result["signed"])
            else:
                passed = not is_signed(tree)
                for operation in ("record", "apply"):
                    row = entry(operation)
                    row["noWrites"] = all(recorder.p115_read(tree / p) == value for p, value in physical.items())
                    passed = passed and row["exit"] == 1 and row["noWrites"]
                    operations.append(row)
                    # Only this test's outputs are restored between independent operations.
                    for p, value in physical.items():
                        if value is None: (tree / p).unlink(missing_ok=True)
                        else: (tree / p).write_bytes(value)
            passed = bool(passed and findings and label == "Unknown; P115 state unverified"
                and result["state"] == label and not result["recordingReady"]
                and (tree / path).read_bytes() == changed and git(tree, "rev-parse", "HEAD") == head
                and git(tree, "ls-files", "--stage", "-z") == index and git(tree, "tag", "--list") == tags)
            expect(name, passed)
            mutation_receipt(tree, name, {path: old}, {path: changed}, "exact current governing input; historical object is insufficient")
            print("P115-GOVERNING-INPUT-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
                "sourceHead": git(root, "rev-parse", "HEAD").decode().strip(), "ranAt": head.decode().strip(),
                "currentPath": str(path), "findings": findings, "state": label, "preview": result,
                "operations": operations, "snapshot": snapshot_result, "passed": passed}, sort_keys=True))
    setup(True)
    path = specs[0]
    for kind in ("absent", "directory", "symlink"):
        name = "governing current input refuses " + kind
        if only is not None and name not in only: continue
        target = tree / path
        target.unlink()
        if kind == "directory": target.mkdir()
        elif kind == "symlink":
            sibling = tree / ".git" / "p115-source-same-bytes"
            sibling.write_bytes(source[path]); target.symlink_to(sibling)
        findings = binding_findings(tree)
        passed = bool(findings and not is_signed(tree) and check_state(tree)[1] == "Unknown; P115 state unverified")
        expect(name, passed)
        print("P115-GOVERNING-INPUT-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
            "new": kind, "oldSHA256": digest(source[path]), "findings": findings, "passed": passed}, sort_keys=True))
        if target.is_dir() and not target.is_symlink(): target.rmdir()
        else: target.unlink(missing_ok=True)
        target.write_bytes(source[path])
    setup(True)
    name = "governing exact eight snapshot and capture inputs"
    if only is None or name in only:
        expected = {str(p) for p in specs}
        inputs = validation_inputs(tree)
        passed = expected <= inputs and is_signed(tree)
        expect(name, passed)
        print("P115-GOVERNING-INPUT-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
            "expectedPaths": sorted(expected), "capturedPaths": sorted(expected & inputs), "passed": passed}, sort_keys=True))


def process_diagnostic_selftest(root: Path, expect, *, only=None) -> None:
    """Typed native captures plus real MAIN boundaries; no gate-result stubs."""
    import record_versioned_signoff as recorder
    from unittest import mock
    name = "process diagnostic literal capture graph"
    if only is None or name in only:
        vectors = (
            ("bytes", b"\x00\xffOUT\r\n", b"\x80ERR\n", {"type": "builtins.bytes", "bytesHex": "00ff4f55540d0a"}, {"type": "builtins.bytes", "bytesHex": "804552520a"}),
            ("text", "OUT\u2028", "ERR\u2029", {"type": "builtins.str", "text": "OUT\u2028"}, {"type": "builtins.str", "text": "ERR\u2029"}),
            ("absent", None, None, {"type": "builtins.NoneType", "value": None}, {"type": "builtins.NoneType", "value": None}),
            ("empty-bytes", b"", b"", {"type": "builtins.bytes", "bytesHex": ""}, {"type": "builtins.bytes", "bytesHex": ""}),
            ("empty-text", "", "", {"type": "builtins.str", "text": ""}, {"type": "builtins.str", "text": ""}),
            ("nested-suppressed", b"OUT", b"ERR", {"type": "builtins.bytes", "bytesHex": "4f5554"}, {"type": "builtins.bytes", "bytesHex": "455252"}),
        )
        rows = []
        for label, stdout, stderr, expected_out, expected_err in vectors:
            cause = subprocess.CalledProcessError(-7, ["git", "synthetic"], output=stdout, stderr=stderr)
            failure = cause
            if label == "nested-suppressed":
                failure = RuntimeError("Synthetic outer primary")
                failure.__cause__ = cause; failure.__context__ = cause; failure.__suppress_context__ = True
            snapshot = recorder.p115_exception(failure)
            native = snapshot["nodes"][-1]
            expected = {"returncode": -7, "command": {"type": "builtins.list", "items": [
                {"type": "builtins.str", "text": "git"}, {"type": "builtins.str", "text": "synthetic"}]},
                "stdout": expected_out, "output": expected_out, "stderr": expected_err}
            passed = native.get("process") == expected and json.loads(json.dumps(snapshot)) == snapshot
            if label == "nested-suppressed":
                passed = passed and snapshot["nodes"][0]["cause"] == 1 and snapshot["nodes"][0]["context"] == 1 and snapshot["nodes"][0]["suppressContext"] is True
            rows.append({"vector": label, "expected": expected, "actual": snapshot, "passed": passed})
        expect(name, all(r["passed"] for r in rows))
        print("P115-PROCESS-DIAGNOSTIC-EVIDENCE " + json.dumps({"case": name, "scope": "pure exception projection",
            "vectorCount": len(rows), "vectors": rows, "passed": all(r["passed"] for r in rows)}, sort_keys=True))
    cases = ("process diagnostic early native index", "process diagnostic late wrapped native error", "governing captured input late drift")
    if only is not None and not set(cases) & only: return
    paths = (*SUBJECTS, RECORD, AGGREGATE)
    raw = "docs/reviews/R-P115-PROCESS-SELFTEST-RAW.md"
    with tempfile.TemporaryDirectory(prefix="p115-process-fixtures-") as temp:
        template = Path(temp) / "template"
        subprocess.run(["git", "clone", "--quiet", "--no-hardlinks", str(root), str(template)], check=True, capture_output=True)
        for filename in (Path(__file__).name, "record_versioned_signoff.py"):
            shutil.copyfile(root / "scripts" / filename, template / "scripts" / filename)
        (template / raw).write_text(f"# Synthetic process fixture — {KEY}\nReviewed commit: {CORE_COMMIT}\nManifest SHA-256: {MANIFEST_SHA256}\nVerdict: CONFIRM\n\n## Findings\n\nNo findings. Synthetic only; no owner action.\n")
        git(template, "add", "--all")
        git(template, "-c", "user.name=P115 synthetic process", "-c", "user.email=fixture@invalid", "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "Synthetic native diagnostic fixtures; no owner action")
        for name in cases:
            if only is not None and name not in only: continue
            tree = Path(temp) / name.replace(" ", "-")
            subprocess.run(["git", "clone", "--quiet", "--no-hardlinks", str(template), str(tree)], check=True, capture_output=True)
            before = {p: recorder.p115_read(tree / p) for p in paths}
            head, index, tags = git(tree, "rev-parse", "HEAD"), git(tree, "ls-files", "--stage", "-z"), git(tree, "tag", "--list")
            index_path = Path(git(tree, "rev-parse", "--path-format=absolute", "--git-path", "index").decode().strip())
            old_index = index_path.read_bytes()
            native_argv = (["git", "--no-optional-locks", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignore-submodules=none"]
                           if name == cases[0] else ["git", "rev-parse", "--verify", "p115-synthetic-missing-object"])
            if name == cases[0]: index_path.write_bytes(b"DIRC")
            control = subprocess.run(native_argv, cwd=tree, capture_output=True)
            assert control.returncode == 128 and control.stdout == b""
            assert control.stderr == (b"fatal: .git/index: index file smaller than expected\n" if name == cases[0] else b"fatal: Needed a single revision\n")
            events = []
            original_link = recorder.os.link
            foreign_path = Path("openspec/changes/cap1-trusted-bootstrap-consent/specs/project-registration-and-honest-shape-visibility/spec.md")
            foreign_before = (tree / foreign_path).read_bytes()
            foreign = foreign_before + b"\nSynthetic foreign governing input after capture.\n"
            def link(source, destination, *args, **kwargs):
                if Path(destination) == tree / RECORD:
                    events.append("native dedicated link barrier reached")
                    if name == cases[1]:
                        try:
                            subprocess.run(native_argv, cwd=tree, capture_output=True, check=True)
                        except subprocess.CalledProcessError as native:
                            raise RuntimeError("P115 synthetic native primary") from native
                    if name == cases[2]: (tree / foreign_path).write_bytes(foreign)
                return original_link(source, destination, *args, **kwargs)
            saved_root = recorder.ROOT
            output = io.StringIO()
            argv = ["--record", KEY, "--version", VERSION, "--date", "2026-10-21", "--review", raw,
                    "--owner-selection-quote", "Synthetic native diagnostic fixture; no owner action"]
            started = datetime.datetime.now(datetime.timezone.utc).isoformat()
            try:
                recorder.ROOT = tree
                with mock.patch.object(recorder.os, "link", link), contextlib.redirect_stdout(output):
                    code = recorder.main(argv)
            finally: recorder.ROOT = saved_root
            ended = datetime.datetime.now(datetime.timezone.utc).isoformat()
            lines = output.getvalue().splitlines()
            snapshots = [json.loads(line.split(": ", 1)[1]) for line in lines if line.startswith("P115 original exception: ")]
            attempts = sorted((tree / ".git" / "p115-recording-recovery").glob("*.ATTEMPT.json"))
            receipts = [json.loads(p.read_text()) for p in attempts]
            native_nodes = [n for snap in snapshots for n in snap["nodes"] if n["type"] == "subprocess.CalledProcessError"]
            expected_process = {"returncode": 128, "command": {"type": "builtins.list", "items": [{"type": "builtins.str", "text": x} for x in native_argv]},
                "stdout": {"type": "builtins.bytes", "bytesHex": ""}, "output": {"type": "builtins.bytes", "bytesHex": ""},
                "stderr": {"type": "builtins.bytes", "bytesHex": control.stderr.hex()}}
            common = code == 1 and len(snapshots) == 1 and all(recorder.p115_read(tree / p) == body for p, body in before.items()) and git(tree, "rev-parse", "HEAD") == head and git(tree, "tag", "--list") == tags and not is_signed(tree) and "P115 completed outcome receipt retained:" not in output.getvalue()
            if name == cases[0]:
                passed = common and index_path.read_bytes() == b"DIRC" and not attempts and not events and len(native_nodes) == 1 and native_nodes[0].get("process") == expected_process and "P115 failed-attempt evidence retained:" not in output.getvalue()
            elif name == cases[1]:
                passed = common and index_path.read_bytes() == old_index and len(events) == 1 and len(native_nodes) == 1 and native_nodes[0].get("process") == expected_process and len(receipts) == 1 and receipts[0]["state"] == "failed" and receipts[0]["originalException"] == snapshots[0] and snapshots[0]["nodes"][0]["message"] == "P115 synthetic native primary" and snapshots[0]["nodes"][0]["cause"] == 1
            else:
                passed = common and index_path.read_bytes() == old_index and len(events) == 1 and (tree / foreign_path).read_bytes() == foreign and len(receipts) == 1 and str(foreign_path) in receipts[0]["validationInputs"] and snapshots[0]["nodes"][0]["message"] == f"P115 transaction input changed: {foreign_path}" and receipts[0]["state"] == "failed" and receipts[0]["originalException"] == snapshots[0]
            expect(name, bool(passed))
            mutation_receipt(tree, name, {foreign_path: foreign_before}, {foreign_path: foreign if name == cases[2] else foreign_before}, "real native diagnostic/captured-input boundary and exact state preservation")
            print("P115-PROCESS-DIAGNOSTIC-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
                "entrypoint": "recorder.main", "argv": argv, "cwd": str(tree), "callerPid": __import__("os").getpid(),
                "startedAt": started, "endedAt": ended, "exit": code, "events": events,
                "nativeControl": {"argv": native_argv, "cwd": str(tree), "exit": control.returncode, "stdoutHex": control.stdout.hex(), "stderrHex": control.stderr.hex()},
                "output": output.getvalue(), "receipts": receipts, "passed": bool(passed)}, sort_keys=True))
            if name == cases[0]: index_path.write_bytes(old_index)  # Own fixture cleanup after all malformed-index assertions.


def recording_render_selftest(root: Path, expect) -> None:
    """Three pure full-output controls; no check, apply or recording is called."""
    import types
    import record_versioned_signoff as recorder
    historical = "5c07616c4c5719c9de4ce92c137162394bb32bb3"
    old = types.ModuleType("p115_historical_render_selftest")
    old.__file__ = str(root / "scripts/record_versioned_signoff.py")
    sys.modules[old.__name__] = old
    try:
        source = git(root, "show", historical + ":scripts/record_versioned_signoff.py")
        exec(compile(source, "Git:" + historical + ":record_versioned_signoff.py", "exec"), old.__dict__)
        packages, historical_packages = recorder.real_packages(), old.real_packages()
        pkg = packages[KEY]
        review = "docs/reviews/R-P115-RENDER-SELFTEST-RAW.md"
        quote = "Synthetic structured selection; no owner action"
        expected_aggregate = """<!-- versioned-signoff:three-surface-poc-governedby-reference-amendment:v1.0 -->
## Versioned sign-off — three-surface-poc-governedby-reference-amendment — v1.0 — recorded 2026-10-21

The owner signed off version 1.0 by selecting an option in a structured
question naming this package and version (quoted in the dedicated record).

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | specification amendment |
| Review outcome | `docs/reviews/R-P115-RENDER-SELFTEST-RAW.md`: `CONFIRM` |
| Recording | `.syzygy/governance/decisions/THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-SIGNOFF-v1.0.md`; annotated tag `three-surface-poc-governedby-reference-amendment-v1.0` on the commit carrying these records and the applied result |
| Direction | `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, extended by `.syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md` |

This sign-off authorizes no implementation, widens no consent, read, write or
egress, and a later version of the package is signed separately.
<!-- /versioned-signoff:three-surface-poc-governedby-reference-amendment:v1.0 -->
"""
        expected_record = """# Three-Surface POC governedBy reference amendment — version-tagged sign-off v1.0

Date: 2026-10-21

Owner: Tzeusy

Package: three-surface-poc-governedby-reference-amendment

Version: 1.0

Tag: three-surface-poc-governedby-reference-amendment-v1.0

Kind: specification amendment

Owner selection: Synthetic structured selection; no owner action

Review: docs/reviews/R-P115-RENDER-SELFTEST-RAW.md

Reviewed commit: da9fde040ec188612310549782fccc0227869c79

Review verdict: CONFIRM

Disposition: none

Scope A extension: `.syzygy/governance/decisions/OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md` extends the direction below to this package's kind

Signed under `.syzygy/governance/decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`: the owner's selection of an option naming this package and version is the sign-off; no phrase or digest argument exists.

## What this records

The owner signed off version 1.0 of `.syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment` by the
selection quoted above. The review named above read the package bytes this
sign-off applies; the recorder confirmed that the package directory still
equals the package at the reviewed commit (disposition records excepted) and
that the frozen P115 builder check passed before the exact five patches were applied
as one preflighted Git batch through the P115 recording adapter.

The binding is the annotated tag `three-surface-poc-governedby-reference-amendment-v1.0` on the commit that
carries this record and the applied result. A later edit to the package is a
new version signed separately; it does not retire this one.

## What this does not do

It authorizes no implementation of the signed semantics, widens no consent,
read, write or egress, and approves no registry or policy byte. Every
exclusion of the acts in force stands.
"""
        actual_aggregate = recorder.render_aggregate(pkg, VERSION, "2026-10-21", review, "CONFIRM", None)
        actual_record = recorder.render_record(pkg, VERSION, "2026-10-21", quote, review, CORE_COMMIT,
                                               "CONFIRM", None)
        for name, expected, actual, before in (
            ("T16 exact neutral P115 aggregate", expected_aggregate, actual_aggregate,
             old.render_aggregate(historical_packages[KEY], VERSION, "2026-10-21", review, "CONFIRM", None)),
            ("T18 exact P115 application provenance record", expected_record, actual_record,
             old.render_record(historical_packages[KEY], VERSION, "2026-10-21", quote, review,
                               CORE_COMMIT, "CONFIRM", None)),
        ):
            expect(name, actual == expected)
            print("P115-RENDER-EVIDENCE " + json.dumps({"case": name, "syntheticOnly": True,
                "ranAt": git(root, "rev-parse", "HEAD").decode().strip(), "historicalHead": historical,
                "predicate": "full independent literal output; P115-only provenance", "old": before,
                "new": actual, "expected": expected, "passed": actual == expected}, sort_keys=True))
        keys = (
            "pwb-missing-currency-disclosure-scenario", "pwb-dismissal-expiry-amendment",
            "pwb-container-shape-profile-amendment", "pwb-item-depth-amendment", "pwb-readability-successor",
            "pwb-tree-framing-amendment", "pwb-anchor-resolution-amendment",
            "three-surface-poc-block-provenance-amendment", "pwb-class-granular-extraction-amendment",
            "pwb-accessible-name-amendment", "pwb-opening-index-amendment",
            "three-surface-poc-governing-intent-amendment", "three-surface-poc-vocabulary-epistemic-amendment",
            "cap1-trusted-bootstrap-consent", "polaris-dossier-local-agent-mode",
            "public-git-source-acquisition-local-agent", "polaris-dossier-local-agent-mode@1.1",
            "polaris-dossier-local-agent-mode@1.2",
        )
        controls = []
        for key in keys:
            new_pkg, old_pkg = packages[key], historical_packages[key]
            version = key.split("@", 1)[1] if "@" in key else "1.0"
            choices = (frozenset(), frozenset({"n6"})) if key.endswith("@1.1") else (frozenset(),)
            rows = tuple(("0" * 64, p.as_posix()) for p in old_pkg.applied_subjects)
            for options in choices:
                for verdict, disposition in (("CONFIRM", None), ("CONFIRM WITH EXCEPTIONS", "synthetic-disposition.md")):
                    args = version, "2026-10-21", quote, review, CORE_COMMIT, verdict, disposition, options
                    kwargs = {"root": root, "instant": "2026-10-21T00:00:00Z", "rows": rows}
                    before_record = old.render_record(old_pkg, *args, **kwargs)
                    after_record = recorder.render_record(new_pkg, *args, **kwargs)
                    before_aggregate = old.render_aggregate(old_pkg, version, "2026-10-21", review, verdict, disposition)
                    after_aggregate = recorder.render_aggregate(new_pkg, version, "2026-10-21", review, verdict, disposition)
                    controls.append({"key": key, "version": version, "options": sorted(options), "verdict": verdict,
                        "disposition": disposition, "oldRecord": before_record, "newRecord": after_record,
                        "oldAggregate": before_aggregate, "newAggregate": after_aggregate,
                        "passed": before_record == after_record and before_aggregate == after_aggregate})
        passed = (set(keys) == set(packages) - {KEY} == set(historical_packages) - {KEY}
                  and len(controls) == 38 and all(row["passed"] for row in controls))
        expect("T17 all non-P115 full historical record and aggregate outputs", passed)
        print("P115-RENDER-EVIDENCE " + json.dumps({"case": "T17", "syntheticOnly": True,
            "ranAt": git(root, "rev-parse", "HEAD").decode().strip(), "historicalHead": historical,
            "predicate": "entire non-P115 payloads match frozen historical formatter", "keys": list(keys),
            "packageCount": len(keys), "argumentCases": len(controls), "fullOutputs": 2 * len(controls),
            "controls": controls, "passed": passed}, sort_keys=True))
    finally:
        sys.modules.pop(old.__name__, None)


def selftest(root: Path) -> int:
    """Only owned temporary fixture subjects/records are ever written."""
    global CORE_COMMIT
    import record_versioned_signoff as recorder
    import build_three_surface_poc_readability_successor as readability
    import check_spec_reconciliation as reconciliation
    import check_governance as governance
    count = consumption_unknowns(root)
    if count:
        print(f"P115 recording preparation selftest BLOCKED: {count} undecidable "
              "requirement-consumption entries; no signed-positive fixtures or readiness claim.")
        return 1
    current_tools = (
        Path(__file__).name, "record_versioned_signoff.py",
        "record_pwb_behavior_amendment_acts.py", "check_spec_reconciliation.py",
        "check_governance.py", "build_three_surface_poc_readability_successor.py",
        "build_three_surface_poc_vocabulary_epistemic_amendment.py",
    )
    if transaction_present(root):
        findings, state = check_state(root)
        if findings:
            print("P115 signed selftest REFUSED: " + " | ".join(findings))
            return 1
        # Every helper must start from unsigned subjects, including helpers that
        # clone HEAD. Validate the actual transaction before creating that fixture.
        with tempfile.TemporaryDirectory(prefix="p115-signed-selftest-") as temp:
            tree = Path(temp) / "tree"
            subprocess.run(["git", "clone", "--quiet", "--no-hardlinks", "--no-checkout",
                            str(root), str(tree)], check=True, capture_output=True)
            git(tree, "checkout", "--quiet", "--detach", CORE_COMMIT)
            for name in current_tools:
                shutil.copyfile(root / "scripts" / name, tree / "scripts" / name)
                if (tree / "scripts" / name).read_bytes() != (root / "scripts" / name).read_bytes():
                    raise ValueError(f"current selftest tool copy differs: {name}")
            if transaction_present(tree):
                raise ValueError("unsigned selftest fixture unexpectedly carries a P115 transaction")
            git(tree, "add", "--", *(f"scripts/{name}" for name in current_tools))
            git(tree, "-c", "user.name=P115 synthetic fixture", "-c", "user.email=fixture@invalid",
                "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "--allow-empty", "-m",
                "Synthetic unsigned selftest fixture; no owner action")
            print("P115-SIGNED-SELFTEST-REPLAY " + json.dumps({
                "sourceHead": git(root, "rev-parse", "HEAD").decode().strip(),
                "validatedSourceState": state, "coreCommit": CORE_COMMIT,
                "fixtureHead": git(tree, "rev-parse", "HEAD").decode().strip(),
                "currentToolSha256": {name: digest((tree / "scripts" / name).read_bytes())
                                      for name in current_tools},
                "syntheticOnly": True, "ownerAction": False,
            }, sort_keys=True), flush=True)
            return subprocess.run([sys.executable, "-B", str(tree / "scripts" / Path(__file__).name),
                                   "--selftest"], cwd=tree).returncode
    cases = []
    def expect(name: str, passed: bool):
        cases.append((name, passed))
    def outcomes(tree: Path):
        report = reconciliation.Report()
        reconciliation.check_outcomes(tree, report)
        return report
    def census_report(tree: Path):
        report = reconciliation.Report()
        population = reconciliation.check_census(tree, report)
        return population, report
    def bootstrap_ok(tree: Path) -> bool:
        saved = governance.ROOT
        try:
            governance.ROOT = str(tree)
            report = governance.Results()
            governance.cg7h_general_bootstrap_act(report)
            return not report.failed()
        finally:
            governance.ROOT = saved
    with tempfile.TemporaryDirectory(prefix="p115-recording-selftest-") as temp:
        tree = Path(temp) / "tree"
        subprocess.run(["git", "clone", "--quiet", "--no-hardlinks", "--no-checkout",
                        str(root), str(tree)], check=True, capture_output=True)
        git(tree, "checkout", "--quiet", "--detach", CORE_COMMIT)
        # Exercise current preparation/reader bytes in the frozen core tree.
        for name in current_tools:
            shutil.copyfile(root / "scripts" / name, tree / "scripts" / name)
        expect("candidate checks real BASE subjects", candidate_findings(tree) == [])
        expect("no record supplies no signed successor", not is_signed(tree))
        expect("preview never invents a review/owner answer", not preview(tree)["recordingReady"])
        expect("recording gate follows frozen impact disposition",
               bool(recording_findings(tree)) == bool(consumption_unknowns(tree)))
        expect("candidate does not add a reconciliation successor",
               not any(later.get("package") == KEY for later in
                       reconciliation.successors_for(tree, next(c for c in reconciliation.CHILDREN if c["key"] == "poc"))))
        # The frozen core census predates the CAP1 consent overlay's
        # composition (syzygy-5oqc, CAP1 42 / 47 -> 42 / 57). Only that family
        # may differ from the current checker's regeneration; every other
        # family's frozen bytes must still match before it is regenerated.
        population, report = census_report(tree)
        frozen = json.loads((tree / reconciliation.CENSUS).read_text())["families"]
        current = json.loads(reconciliation.census_json(population))["families"]
        expect("baseline census differs from the frozen core in CAP1 alone",
               {k for k in current if current[k] != frozen.get(k)} <= {"CAP1"}
               and set(current) == set(frozen)
               and report.findings.get("R3", []) in (
                   [], [f"`{reconciliation.CENSUS}` differs from regeneration "
                        "(a name or scenario title moved)"]))
        (tree / reconciliation.CENSUS).write_text(reconciliation.census_json(population))
        expect("candidate reconciliation and baseline census pass",
               not outcomes(tree).failed and not census_report(tree)[1].failed)
        expect("candidate bootstrap history passes", bootstrap_ok(tree))
        pkg = recorder.real_packages()[KEY]
        expect("manifest-backed POC registration", pkg.subject == MANIFEST and not pkg.package_digest
               and pkg.extension == recorder.POC_EXTENSION_REL and pkg.installed is None)
        before = {rel: (tree / rel).read_bytes() for rel in SUBJECTS}
        earlier = readability.installed_bytes_at(tree)
        raw = "docs/reviews/R-P115-SELFTEST-RAW.md"
        (tree / raw).write_text(f"# Synthetic review — {KEY}\nReviewed commit: {CORE_COMMIT}\n"
                               f"Manifest SHA-256: {MANIFEST_SHA256}\nVerdict: CONFIRM\n\n"
                               "## Findings\n\nNo findings. Synthetic fixture only; no owner action.\n")
        ready = preview(tree, raw)
        expect("preview checks a synthetic raw without collecting authority",
               ready["reviewReady"] and ready["recordingReady"] == (consumption_unknowns(tree) == 0)
               and ready["ownerSelection"] == "not collected by this tool")
        confirm_raw = (tree / raw).read_bytes()
        notes = confirm_raw.replace(b"Verdict: CONFIRM\n", b"Verdict: CONFIRM WITH EXCEPTIONS\n")
        notes = notes.replace(b"No findings.", "**Finding 1 — fixture note** (note)\n".encode())
        (tree / raw).write_bytes(notes)
        expect("notes-only raw needs a matching disposition", preview(tree, raw)["reviewError"] is not None)
        disposition = (CANDIDATE / "ROUND-999-DISPOSITIONS.md").as_posix()
        (tree / disposition).write_text(f"Reviewed record: {raw}\n\n**Finding 1 — fixture note**\nRetained.\n")
        expect("notes-only raw with matching sibling disposition parses",
               preview(tree, raw, disposition)["reviewReady"])
        (tree / disposition).unlink()
        (tree / raw).write_bytes(confirm_raw)
        # The actual P115 apply/record path admits only a clean checkout.
        git(tree, "add", "--all")
        git(tree, "-c", "user.name=P115 synthetic fixture", "-c", "user.email=fixture@invalid",
            "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m",
            "Synthetic P115 preparation fixture; no owner action")
        _current, proposed = load_frozen(tree).collect()
        reference = recorder._module(Path(__file__).stem)
        bad_patch = tree / CANDIDATE / "proposed/spec.md.patch"
        saved_patch = bad_patch.read_bytes()
        from unittest import mock
        native_run = recorder.subprocess.run
        def corrupt_at_preflight(argv, *args, **kwargs):
            if argv[:2] == ["git", "apply"] and "--check" in argv:
                # The real strict gate already passed; only own captured
                # private bytes mutate at this native preflight boundary.
                Path(argv[-1]).write_text("--- a/p115-no-such-subject\n+++ b/p115-no-such-subject\n"
                                         "@@ -1 +1 @@\n-missing\n+bad\n")
            return native_run(argv, *args, **kwargs)
        capture = io.StringIO()
        with mock.patch.object(recorder.subprocess, "run", corrupt_at_preflight), contextlib.redirect_stdout(capture):
            bad_code = pkg.apply(tree)
        expect("one bad-patch preflight leaves all six subjects unchanged",
               bad_code != 0 and "P115 preflight refused:" in capture.getvalue()
               and {rel: (tree / rel).read_bytes() for rel in SUBJECTS} == before)
        with contextlib.redirect_stdout(io.StringIO()):
            applied = pkg.apply(tree)
        expect("P115-only five-patch batch installs exact synthetic subjects",
               applied == 0 and applied_rows_match(tree)
               and all((tree / rel).read_bytes() == body for rel, body in proposed.items()))
        expect("unsigned installed proposal is refused", bool(check_state(tree)[0]) and not is_signed(tree))
        expect("unsigned proposed census and bootstrap remain failures",
               "R3" in census_report(tree)[1].failed and not bootstrap_ok(tree))
        quote = "Synthetic fixture selection; no owner action"
        record = recorder.render_record(pkg, VERSION, "2026-10-21", quote, raw,
                                         CORE_COMMIT, "CONFIRM", None)
        aggregate = (tree / AGGREGATE).read_text()
        block = recorder.render_aggregate(pkg, VERSION, "2026-10-21", raw, "CONFIRM", None)
        (tree / RECORD).write_text(record)
        (tree / AGGREGATE).write_text(aggregate.rstrip("\n") + "\n\n" + block)
        expect("exact signed synthetic transaction recognized", is_signed(tree))
        expect("earlier readability rows reconstruct exactly", readability.installed_bytes_at(tree) == earlier)
        p108 = recorder.real_packages()["three-surface-poc-vocabulary-epistemic-amendment"]
        expect("earlier recorder rows accept only signed successor", p108.applied(tree))
        expect("signed six-row reconciliation chain reverses exactly", not outcomes(tree).failed)
        population, report = census_report(tree)
        expect("signed census requires regeneration", "R3" in report.failed)
        (tree / reconciliation.CENSUS).write_text(reconciliation.census_json(population))
        expect("signed census admits exactly 26 requirements and 34 scenarios",
               not census_report(tree)[1].failed
               and len(population["POC"]) == 26
               and sum(len(row["scenarios"]) for row in population["POC"].values()) == 34
               and len(population["POC"]["POC-REQ-014"]["scenarios"]) == 8)
        expect("signed bootstrap current rows are recognized", bootstrap_ok(tree))
        route_report = reconciliation.Report()
        reconciliation.check_routes(tree, population, route_report)
        expect("signed route activation requires root-owned terminal entries",
               any(RECORD.name in finding for finding in route_report.findings.get("R5", ())))
        snapshot = Path(temp) / "snapshot"
        reconciliation.scratch(tree, snapshot)
        expect("read-only snapshot retains signed proof and exact chain",
               is_signed(snapshot) and not outcomes(snapshot).failed)
        # One predicate per mutation, restoring exact bytes after each case.
        unresolved = json.loads((tree / CANDIDATE / "REQUIREMENT-CONSUMPTION.json").read_text())
        unresolved["entries"][0]["classification"] = "undecidable"
        mutations = [
            ("record-only is partial", AGGREGATE, aggregate.encode()),
            ("aggregate-only is partial", RECORD, None),
            ("duplicate aggregate block", AGGREGATE, (aggregate + block + block).encode()),
            ("wrong recorded version", RECORD, record.replace("Version: 1.0", "Version: 2.0").encode()),
            ("wrong review binding", Path(raw), (tree / raw).read_bytes().replace(MANIFEST_SHA256.encode(), b"0" * 64)),
            ("wrong reviewed core", Path(raw), (tree / raw).read_bytes().replace(CORE_COMMIT.encode(), BASE.encode())),
            ("escaping review path", RECORD, record.replace(f"Review: {raw}", "Review: ../outside-RAW.md").encode()),
            ("missing review", Path(raw), None),
            ("wrong manifest hash", MANIFEST, (tree / MANIFEST).read_bytes() + b"\n"),
            ("current subject drift", SUBJECTS[-1], (tree / SUBJECTS[-1]).read_bytes() + b"\n"),
            ("rollback to predecessor is refused", SUBJECTS[-1], before[SUBJECTS[-1]]),
            ("wrong patch bytes", CANDIDATE / "proposed/spec.md.patch",
             (tree / CANDIDATE / "proposed/spec.md.patch").read_bytes() + b"\n"),
            ("unresolved consumption entry", CANDIDATE / "REQUIREMENT-CONSUMPTION.json",
             json.dumps(unresolved).encode()),
        ]
        for name, path, changed in mutations:
            target = tree / path
            saved = target.read_bytes()
            if changed is None:
                target.unlink()
            else:
                target.write_bytes(changed)
            expect(name, not is_signed(tree))
            mutation_receipt(tree, name, {path: saved}, {path: changed}, "signed recognition refuses exact mutation")
            if name == "unresolved consumption entry":
                expect("unresolved consumption trips its own signed predicate",
                       "signed recognition remains gated by 1 undecidable requirement-consumption entries"
                       in signed_findings(tree))
            if name == "record-only is partial":
                expect("partial transaction cannot explain predecessor rows",
                       not p108.applied(tree) and not bootstrap_ok(tree)
                       and "R1" in outcomes(tree).failed)
            target.write_bytes(saved)
        end = recorder.block_markers(pkg, VERSION)[1]
        signed_aggregate = (tree / AGGREGATE).read_bytes()
        chain_mutations = [
            ("P115 block before all predecessors", {AGGREGATE: (block + aggregate).encode()}),
            ("P115 backdated before predecessors", {
                RECORD: record.replace("Date: 2026-10-21", "Date: 2026-01-01").encode(),
                AGGREGATE: signed_aggregate.replace(b"recorded 2026-10-21", b"recorded 2026-01-01")}),
            ("P115 duplicate closing delimiter", {AGGREGATE: signed_aggregate + end.encode() + b"\n"}),
            ("P115 orphan closing is present", {RECORD: None, AGGREGATE: aggregate.encode() + end.encode() + b"\n"}),
            ("P115 invalid calendar date", {
                RECORD: record.replace("Date: 2026-10-21", "Date: 2026-02-30").encode(),
                AGGREGATE: signed_aggregate.replace(b"recorded 2026-10-21", b"recorded 2026-02-30")}),
        ]
        predecessor = recorder.real_packages()[PREDECESSORS[-1]]
        pred_start, pred_end = recorder.block_markers(predecessor, VERSION)
        # Preserve the predecessor start position but break its complete block.
        chain_mutations.append(("P115 nested inside predecessor block", {AGGREGATE:
            (aggregate.replace(pred_end, block + pred_end)).encode()}))
        chain_mutations.append(("predecessor orphan closing delimiter", {AGGREGATE:
            signed_aggregate + pred_end.encode() + b"\n"}))
        pred_record = recorder.record_rel(predecessor, VERSION)
        chain_mutations.append(("predecessor duplicate date", {pred_record:
            (tree / pred_record).read_bytes() + b"\nDate: 2026-10-15\n"}))
        predecessor_fields = recorder.parse_record((tree / pred_record).read_text())
        predecessor_block = recorder.render_aggregate(predecessor, VERSION,
            predecessor_fields["Date"], predecessor_fields["Review"], predecessor_fields["Review verdict"],
            None if predecessor_fields["Disposition"] == "none" else predecessor_fields["Disposition"])
        chain_mutations.append(("predecessor block in fenced example", {AGGREGATE:
            signed_aggregate.replace(predecessor_block.encode(),
                ("```text\n" + predecessor_block + "```\n").encode())}))
        for name, changes in chain_mutations:
            saved = {path: (tree / path).read_bytes() for path in changes}
            for path, body in changes.items():
                (tree / path).unlink() if body is None else (tree / path).write_bytes(body)
            findings = signed_findings(tree)
            expect(name, transaction_present(tree) and not is_signed(tree) and bool(findings)
                   and (name != "predecessor block in fenced example"
                        or any("operative standalone line" in finding for finding in findings)))
            mutation_receipt(tree, name, saved, changes, "leaf complete-chain dates/order/unique balanced delimiters")
            for path, body in saved.items():
                (tree / path).write_bytes(body)
        expect("mutations restore the signed fixture", is_signed(tree))
        binding_failure_selftest(root, tree, expect)
        family_failure_selftest(root, tree, expect, before, earlier)
        governing_source_selftest(root, tree, expect, before)
        findings, output = historical_run(tree, "--selftest")
        expect("signed replay runs frozen selftest, not current subjects", not findings and "Preparation selftest:" in output)
        # Probe the actual signed/replay path with unavailable frozen objects.
        saved_commit = CORE_COMMIT
        try:
            CORE_COMMIT = "0" * 40
            expect("missing frozen history refuses signed recognition", not is_signed(tree))
            try:
                historical_run(tree, "--check")
            except subprocess.CalledProcessError:
                expect("missing frozen history refuses replay", True)
            else:
                expect("missing frozen history refuses replay", False)
        finally:
            CORE_COMMIT = saved_commit
    marker_context_selftest(root, expect)
    recording_failure_selftest(root, expect)
    recording_render_selftest(root, expect)
    recovery_native_selftest(root, expect)
    process_diagnostic_selftest(root, expect)
    for name, passed in cases:
        print(f"P115 selftest: {name}: {'ok' if passed else 'FAILED'}")
    failed = sum(not passed for _name, passed in cases)
    print(f"P115 recording preparation selftest: {len(cases)} cases; {failed} failed; scratch only.")
    return int(failed != 0)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--preview", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    parser.add_argument("--review")
    parser.add_argument("--disposition")
    args = parser.parse_args()
    try:
        if args.selftest:
            return selftest(ROOT)
        if args.preview:
            result = preview(ROOT, args.review, args.disposition)
            print(json.dumps(result, indent=2))
            return int(bool(result["candidateFindings"]) or result["reviewError"] is not None)
        findings, state = check_state(ROOT)
        if findings:
            print("P115 preparation FAILED: " + " | ".join(findings))
            return 1
        print(f"P115 preparation: {state}; {len(core_paths(ROOT))} frozen core files; six subjects; no writes.")
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        print(f"P115 preparation FAILED: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
