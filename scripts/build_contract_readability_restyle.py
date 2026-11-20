#!/usr/bin/env python3
"""Build and verify the inert contract readability-restyle package.

This script performs no owner act and writes no act record. The package
restyles 29 of the 30 accepted RFC 0001-0009 modules the general
trusted-bootstrap transaction binds (every one except
`rfcs/RFC-0007/rendering-and-surface.md`). It was the second link of the
contract successor chain `check_governance.py` held until D10 F-5 retired it;
its act phrase was `ADOPT CONTRACT READABILITY RESTYLE` over this package's
manifest digest.

Layout, under `.syzygy/governance/contracts/candidates/contract-readability-restyle/`:

- `proposed/<relpath>.patch` — one unified diff per restyled module, named by
  the module's path relative to `rfcs/` (`proposed/RFC-0002/README.md.patch`).
  Diff headers name the module relative to `.syzygy/governance/contracts/`
  (`a/rfcs/RFC-0002/README.md`), the same form the manifest rows use.
- `CONTRACT-AMENDMENT-MANIFEST.txt` — 29 rows, codepoint-sorted, each the
  sha256 of the module bytes its patch produces.

The proposed bytes are NOT applied while the package is a candidate: CG-7h
binds both mirrors to the bootstrap manifest until the act is performed, so
an edit in place would read as drift. `--apply --at-adoption` writes the
patched bytes into both mirrors; it belongs in the same change as the owner's
act record (`scripts/record_contract_readability_restyle.py`), and refuses
unless that recorder's `check` finds both act records present and valid
against its pins. The order is fixed: record, then apply.

`--check` verifies, and prints `absent` and exits 0 when the package
directory does not exist:

1. the patch population is exactly the 29 expected modules;
2. both mirrors of each module are byte-identical, and each patch applies
   cleanly to each mirror, touches only its own module and changes it;
3. the manifest equals an exact regeneration over the patched bytes (29 rows
   in codepoint order);
4. structure is preserved per module: the multiset of clause leads matched by
   `verify_final_prespec.py`'s own `CLAUSE_DEF` regex, the YAML front-matter
   block byte for byte, and the sequence of Markdown heading lines outside
   code fences;
5. on a scratch tree holding the patched `candidates/rfcs/`, the clause
   migration matrix, the fixtures and the routing matrix:
   `verify_final_prespec.py --root <scratch>` exits 0, and
   `check_governance.py`'s own `cg13_dependency_graph` and
   `cg17_routing_completeness` functions, run in-process with the module's
   `ROOT` pointed at the scratch tree, report no FAIL. Running the functions
   in-process is the simplest faithful invocation: the full checker needs the
   whole repository, while these two read only `candidates/rfcs/` and the
   routing matrix.

After adoption the patches no longer apply (their bytes are installed), so
`--check` instead reports the package as applied when every row already
equals both current mirrors.

Bare invocation refuses to overwrite the manifest; pass `--write` to
regenerate it. Once a packet quotes the manifest digest, a regeneration
retires the packet's argument (CG-7d/CG-7e catch the stale copy).
"""

from __future__ import annotations

import argparse
import collections
import difflib
import hashlib
import importlib.util
import io
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACTS = pathlib.Path(".syzygy/governance/contracts")
CANDIDATES = CONTRACTS / "candidates"
PACKAGE = CANDIDATES / "contract-readability-restyle"
PROPOSED = PACKAGE / "proposed"
MANIFEST = PACKAGE / "CONTRACT-AMENDMENT-MANIFEST.txt"
BOOTSTRAP_MANIFEST = (
    CANDIDATES / "general-trusted-bootstrap-authorization"
    / "CONTRACT-AMENDMENT-MANIFEST.txt")
EXCLUDED = ("rfcs/RFC-0007/rendering-and-surface.md",)
BOOTSTRAP_POPULATION = 30
TITLE = "CONTRACT READABILITY RESTYLE AMENDMENT MANIFEST"
#: Files the scratch structure run needs beside `candidates/rfcs/`.
SCRATCH_EXTRAS = (
    "04-CLAUSE-MIGRATION-MATRIX.md",
    "SURFACE-CLAUSE-ROUTING-MATRIX.md",
)
VERIFIER = CANDIDATES / "scripts" / "verify_final_prespec.py"
#: The frozen rev9 corpus the verifier recomputes REV9_ENDS from.
REV9_CORPUS = pathlib.PurePosixPath("history/rev9-rfcs")
RECORDER = pathlib.Path("scripts") / "record_contract_readability_restyle.py"
ROW = re.compile(r"^([0-9a-f]{64})  (\S[^\n]*)$", re.MULTILINE)
HEADING = re.compile(r"^#{1,6}\s")
FENCE = re.compile(r"^\s*(```|~~~)")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _load(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _verifier():
    """`verify_final_prespec.py`, from this checkout (the tool, not the subject)."""
    return _load("verify_final_prespec_restyle", ROOT / VERIFIER)


def _recorder():
    return _load("record_contract_readability_restyle_builder", ROOT / RECORDER)


#: The restyle's closed, exact population: the 29 general trusted-bootstrap
#: modules other than `rfcs/RFC-0007/rendering-and-surface.md`. Frozen here
#: when D10 F-5 removed the copy `check_governance.py` used to hold.
RESTYLE_PATHS = (
    "rfcs/RFC-0001-project-graph-identity-state-planes.md",
    "rfcs/RFC-0002/README.md",
    "rfcs/RFC-0002/challenge-lifecycle.md",
    "rfcs/RFC-0002/reconciliation-chain.md",
    "rfcs/RFC-0002/rendering-vocabularies.md",
    "rfcs/RFC-0002/snapshot-and-evaluation-core.md",
    "rfcs/RFC-0003/README.md",
    "rfcs/RFC-0003/governance-homes-and-owner-acts.md",
    "rfcs/RFC-0003/manifests-and-namespace.md",
    "rfcs/RFC-0004/README.md",
    "rfcs/RFC-0004/execution-record.md",
    "rfcs/RFC-0004/fidelity-joins-and-mappings.md",
    "rfcs/RFC-0004/general-contract.md",
    "rfcs/RFC-0004/named-adapters.md",
    "rfcs/RFC-0005/README.md",
    "rfcs/RFC-0005/admission-and-boundary.md",
    "rfcs/RFC-0005/consent-egress-secrets.md",
    "rfcs/RFC-0005/execution-profiles.md",
    "rfcs/RFC-0006-cross-surface-selection-query-drawer.md",
    "rfcs/RFC-0007/README.md",
    "rfcs/RFC-0007/narrative-contract.md",
    "rfcs/RFC-0008/README.md",
    "rfcs/RFC-0008/accounting-reconciliation-and-release.md",
    "rfcs/RFC-0008/identity-authority-materialization.md",
    "rfcs/RFC-0008/state-vocabulary-and-cost.md",
    "rfcs/RFC-0009/README.md",
    "rfcs/RFC-0009/interaction-parity-and-release.md",
    "rfcs/RFC-0009/semantic-geography.md",
    "rfcs/RFC-0009/visual-grammar-and-lenses.md",
)
#: (subject manifest, act record) of each contract act after the restyle, in
#: act order, as the retired CG-7h successor chain listed them.
LATER_LINKS = (
    (".syzygy/governance/contracts/candidates/rfc5-project-documentation-class/CONTRACT-AMENDMENT-MANIFEST.txt",
     ".syzygy/governance/decisions/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md"),
)


def _governance():
    return _load("check_governance_restyle", ROOT / "scripts" / "check_governance.py")


# ------------------------------------------------------------- population

def bootstrap_paths(root: pathlib.Path) -> list[str]:
    text = (root / BOOTSTRAP_MANIFEST).read_text(encoding="utf-8")
    return [path for _sha, path in ROW.findall(text)]


def population(root: pathlib.Path) -> list[str]:
    paths = bootstrap_paths(root)
    if len(paths) != BOOTSTRAP_POPULATION or len(set(paths)) != len(paths):
        raise ValueError(
            f"{BOOTSTRAP_MANIFEST.as_posix()} parses to {len(paths)} rows, "
            f"expected {BOOTSTRAP_POPULATION} distinct")
    missing = [p for p in EXCLUDED if p not in paths]
    if missing:
        raise ValueError(f"excluded module(s) not in the bootstrap population: {missing}")
    return sorted(p for p in paths if p not in EXCLUDED)


def patch_for(path: str) -> pathlib.Path:
    """`rfcs/RFC-0002/README.md` -> `proposed/RFC-0002/README.md.patch`."""
    rel = pathlib.PurePosixPath(path).relative_to("rfcs")
    return PROPOSED / f"{rel.as_posix()}.patch"


def patch_files(root: pathlib.Path) -> list[pathlib.Path]:
    base = root / PROPOSED
    if not base.is_dir():
        return []
    return sorted((p.relative_to(root) for p in base.rglob("*.patch")),
                  key=lambda p: p.as_posix())


# ---------------------------------------------------------------- patches

def make_patch(path: str, old: bytes, new: bytes) -> str:
    """A `git apply`-able unified diff turning `old` into `new` at `path`.

    Authoring aid and selftest fixture builder; both inputs must end in a
    newline (difflib emits no `\\ No newline at end of file` marker).
    """
    if not (old.endswith(b"\n") and new.endswith(b"\n")):
        raise ValueError(f"{path}: make_patch needs newline-terminated bytes")
    lines = difflib.unified_diff(
        old.decode("utf-8").splitlines(keepends=True),
        new.decode("utf-8").splitlines(keepends=True),
        fromfile=f"a/{path}", tofile=f"b/{path}")
    return f"diff --git a/{path} b/{path}\n" + "".join(lines)


def apply_patch(path: str, body: bytes, patch: pathlib.Path) -> bytes:
    """`body` at contracts-relative `path` with one diff applied, in a scratch tree."""
    with tempfile.TemporaryDirectory() as scratch:
        base = pathlib.Path(scratch)
        (base / path).parent.mkdir(parents=True, exist_ok=True)
        (base / path).write_bytes(body)
        touched = subprocess.run(
            ["git", "apply", "--numstat", str(patch)],
            cwd=base, capture_output=True, text=True)
        names = [line.split("\t", 2)[2] for line in touched.stdout.splitlines()
                 if line.count("\t") >= 2]
        if touched.returncode == 0 and names != [path]:
            raise ValueError(
                f"{patch.name} touches {names or 'nothing'}, expected exactly `{path}`")
        done = subprocess.run(
            ["git", "apply", "--whitespace=nowarn", str(patch)],
            cwd=base, capture_output=True, text=True)
        if done.returncode != 0:
            raise ValueError(
                f"{patch.name} does not apply to the current bytes of `{path}`: "
                f"{done.stderr.strip()}")
        return (base / path).read_bytes()


def proposed_bytes(root: pathlib.Path) -> tuple[dict[str, bytes], list[str]]:
    """Patched bytes per module, and findings from mirrors and patch application."""
    findings: list[str] = []
    out: dict[str, bytes] = {}
    for path in population(root):
        installed_file = root / CONTRACTS / path
        mirror_file = root / CANDIDATES / path
        if not installed_file.is_file() or not mirror_file.is_file():
            findings.append(f"mirror pair for `{path}` is incomplete")
            continue
        installed = installed_file.read_bytes()
        mirror = mirror_file.read_bytes()
        if installed != mirror:
            findings.append(f"installed and candidate mirrors of `{path}` differ")
        patch = root / patch_for(path)
        if not patch.is_file():
            continue  # reported by the population check
        results = []
        for label, body in (("installed", installed), ("candidate", mirror)):
            try:
                results.append(apply_patch(path, body, patch))
            except ValueError as error:
                findings.append(f"{label} mirror: {error}")
        if len(results) != 2:
            continue
        if results[0] != results[1]:
            findings.append(f"`{path}` patches to different bytes on the two mirrors")
            continue
        if results[0] == installed:
            findings.append(f"patch for `{path}` changes nothing")
        out[path] = results[0]
    return out, findings


# -------------------------------------------------------------- structure

def front_matter(text: str) -> str | None:
    if not text.startswith("---\n"):
        return None
    end = text.find("\n---\n", 4)
    return text[:end + 5] if end >= 0 else None


def headings(text: str) -> list[str]:
    out, fenced = [], False
    for line in text.splitlines():
        if FENCE.match(line):
            fenced = not fenced
            continue
        if not fenced and HEADING.match(line):
            out.append(line.rstrip())
    return out


def structure_findings(path: str, old: bytes, new: bytes, clause_def) -> list[str]:
    before, after = old.decode("utf-8"), new.decode("utf-8")
    findings = []

    def leads(text):
        return collections.Counter(
            m.group(1) + (m.group(4) or "") for m in clause_def.finditer(text))

    if leads(before) != leads(after):
        lost = sorted((leads(before) - leads(after)).elements())
        gained = sorted((leads(after) - leads(before)).elements())
        findings.append(f"`{path}` clause leads changed: lost {lost}, gained {gained}")
    if front_matter(before) != front_matter(after):
        findings.append(f"`{path}` front matter changed")
    if headings(before) != headings(after):
        findings.append(f"`{path}` heading lines changed")
    return findings


def scratch_findings(root: pathlib.Path, proposed: dict[str, bytes]) -> list[str]:
    """verify_final_prespec, CG-13 and CG-17 over a scratch patched tree."""
    findings: list[str] = []
    with tempfile.TemporaryDirectory() as scratch:
        base = pathlib.Path(scratch)
        cands = base / CANDIDATES
        shutil.copytree(root / CANDIDATES / "rfcs", cands / "rfcs")
        for extra in SCRATCH_EXTRAS:
            if (root / CANDIDATES / extra).is_file():
                shutil.copy(root / CANDIDATES / extra, cands / extra)
        if (root / CANDIDATES / "fixtures").is_dir():
            shutil.copytree(root / CANDIDATES / "fixtures", cands / "fixtures")
        # The verifier asserts REV9_ENDS against this frozen corpus and fails
        # when it is absent (syzygy-3rhe), so the scratch tree carries it.
        if (root / CANDIDATES / REV9_CORPUS).is_dir():
            shutil.copytree(root / CANDIDATES / REV9_CORPUS, cands / REV9_CORPUS)
        for path, body in proposed.items():
            (cands / path).write_bytes(body)
        done = subprocess.run(
            [sys.executable, str(ROOT / VERIFIER), "--root", str(cands)],
            capture_output=True, text=True)
        if done.returncode != 0:
            tail = [line for line in done.stdout.splitlines()
                    if line.startswith(("FAIL", "  "))][-5:]
            findings.append(
                "verify_final_prespec.py fails on the patched tree: "
                + ("; ".join(tail) or done.stdout.strip()[-400:]))
        governance = _governance()

        class Capture:
            def __init__(self):
                self.rows = []

            def add(self, status, name, examined, n, unit, note=None, details=None):
                self.rows.append((status, name, examined, details or []))

        keep = governance.ROOT
        governance.ROOT = str(base)
        try:
            cap = Capture()
            governance.cg13_dependency_graph(cap)
            governance.cg17_routing_completeness(cap)
        finally:
            governance.ROOT = keep
        for status, name, examined, details in cap.rows:
            if status == "FAIL" or not examined:
                findings.append(
                    f"{name.split()[0]} {status} on the patched tree "
                    f"({examined} examined): " + "; ".join(details[:3]))
    return findings


# --------------------------------------------------------------- manifest

def render(proposed: dict[str, bytes], paths: list[str]) -> str:
    lines = [
        f"# {TITLE}",
        f"# {len(paths)} accepted RFC 0001-0009 modules; rows sorted by codepoint path.",
        "# Paths are relative to .syzygy/governance/contracts/.",
        "# Excluded, not restyled: " + ", ".join(EXCLUDED) + ".",
        "# These rows bind only by the owner act that names this file's digest in",
        "# ACCEPTANCE-ACT-RECORD.md; until that act is performed they bind nothing.",
        "# Rows hash the PROPOSED bytes: both identical mirrors with",
        "# proposed/<path under rfcs/>.patch applied. They match the tree only",
        "# after --apply --at-adoption. Installed and candidate-mirror bytes are",
        "# required to match exactly.",
    ]
    lines.extend(f"{sha256(proposed[path])}  {path}" for path in paths)
    return "\n".join(lines) + "\n"


def manifest_rows(text: str) -> list[tuple[str, str]]:
    return ROW.findall(text)


def verify_manifest(text: str, expected: str, paths: list[str]) -> list[str]:
    rows = manifest_rows(text)
    if [path for _sha, path in rows] != paths:
        return [f"manifest path population or order differs from the "
                f"{len(paths)} codepoint-sorted modules"]
    if text != expected:
        return ["manifest differs from exact regeneration over the proposed bytes"]
    return []


def later_links() -> list[tuple[str, str]]:
    """(subject manifest, act record) of each contract act after the restyle,
    in act order."""
    return list(LATER_LINKS)


def later_rows(root: pathlib.Path, links=None) -> dict[str, str]:
    """Rows of the performed later links, by path, the latest act winning. A
    module a later act amended hashes to that act's row, not the restyle's."""
    out: dict[str, str] = {}
    for subject, act in later_links() if links is None else links:
        if (root / act).is_file() and (root / subject).is_file():
            out.update({path: sha for sha, path in
                        manifest_rows((root / subject).read_text(encoding="utf-8"))})
    return out


def applied(root: pathlib.Path, links=None) -> bool:
    """Every manifest row already equals both current mirrors (post-adoption),
    or, for a module a later performed contract act amended, that act's row."""
    target = root / MANIFEST
    if not target.is_file():
        return False
    rows = manifest_rows(target.read_text(encoding="utf-8"))
    if [path for _sha, path in rows] != population(root):
        return False
    later = later_rows(root, links)
    for sha, path in rows:
        for base in (CONTRACTS, CANDIDATES):
            file = root / base / path
            if not file.is_file() or sha256(file.read_bytes()) != later.get(path, sha):
                return False
    return True


# ------------------------------------------------------------------ check

def check(root: pathlib.Path = ROOT, scratch: bool = True) -> list[str]:
    findings: list[str] = []
    paths = population(root)
    closed = list(RESTYLE_PATHS)
    if paths != closed:
        findings.append(
            f"restyle population differs from the closed "
            f"{len(closed)}-path RESTYLE_PATHS")
    expected = [patch_for(path) for path in paths]
    actual = patch_files(root)
    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    if missing:
        findings.append("missing patch(es): " + ", ".join(p.as_posix() for p in missing))
    if extra:
        findings.append("patch(es) outside the 29-module population: "
                        + ", ".join(p.as_posix() for p in extra))
    proposed, applying = proposed_bytes(root)
    findings.extend(applying)
    clause_def = _verifier().CLAUSE_DEF
    for path, body in proposed.items():
        old = (root / CONTRACTS / path).read_bytes()
        findings.extend(structure_findings(path, old, body, clause_def))
    if findings:
        return findings
    target = root / MANIFEST
    if not target.is_file():
        findings.append(f"manifest missing: {MANIFEST.as_posix()}")
    else:
        findings.extend(verify_manifest(
            target.read_text(encoding="utf-8"), render(proposed, paths), paths))
    if scratch:
        findings.extend(scratch_findings(root, proposed))
    return findings


def apply(root: pathlib.Path, at_adoption: bool, pins=None) -> int:
    """Install the proposed bytes, only once the owner's act is recorded.

    `pins` overrides the recorder's pinned review (selftest only).
    """
    if not at_adoption:
        print("refusing: --apply writes the proposed bytes into both mirrors and is "
              "the adoption step; pass --at-adoption in the change that records the act")
        return 2
    try:
        recorded = _recorder().check(root, pins=pins)
    except (ValueError, OSError) as error:
        print(f"refusing to apply: the act records do not validate: {error}")
        return 1
    if not recorded:
        print("refusing to apply: no owner act is recorded; run "
              f"{RECORDER.as_posix()} --record first")
        return 1
    findings = check(root)
    if findings:
        print("refusing to apply: the package does not verify")
        for finding in findings:
            print(f"  {finding}")
        return 1
    proposed, _ = proposed_bytes(root)
    for path in population(root):
        for base in (CONTRACTS, CANDIDATES):
            (root / base / path).write_bytes(proposed[path])
        print(f"applied {path} (installed and candidate mirrors)")
    return 0


def write(root: pathlib.Path) -> int:
    proposed, findings = proposed_bytes(root)
    paths = population(root)
    if findings or set(proposed) != set(paths):
        print("refusing to write: the patches do not produce all "
              f"{len(paths)} modules")
        for finding in findings:
            print(f"  {finding}")
        return 1
    (root / MANIFEST).parent.mkdir(parents=True, exist_ok=True)
    (root / MANIFEST).write_text(render(proposed, paths), encoding="utf-8")
    print(f"wrote {MANIFEST.as_posix()}")
    return 0


# --------------------------------------------------------------- selftest

def _fixture_root(scratch: pathlib.Path) -> pathlib.Path:
    """A copy of the inputs this builder reads, with a synthetic package."""
    root = scratch / "repo"
    for rel in (CONTRACTS / "rfcs", CANDIDATES / "rfcs", CANDIDATES / "fixtures",
                CANDIDATES / REV9_CORPUS):
        shutil.copytree(ROOT / rel, root / rel)
    for rel in (BOOTSTRAP_MANIFEST, *(CANDIDATES / e for e in SCRATCH_EXTRAS)):
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(ROOT / rel, root / rel)
    for path in population(root):
        old = (root / CONTRACTS / path).read_bytes()
        new = old + b"\n<!-- readability restyle fixture -->\n"
        target = root / patch_for(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(make_patch(path, old, new), encoding="utf-8")
    return root


def selftest() -> int:
    failures: list[str] = []
    passed: list[str] = []

    def expect(label, findings, want):
        ok = any(want in f for f in findings) if want else not findings
        (passed if ok else failures).append(
            label if ok else f"{label}: got {findings[:3]}")

    with tempfile.TemporaryDirectory() as directory:
        scratch = pathlib.Path(directory)
        root = _fixture_root(scratch)
        if not check(root, scratch=False) == [f"manifest missing: {MANIFEST.as_posix()}"]:
            failures.append(f"unwritten manifest not reported: {check(root, scratch=False)}")
        else:
            passed.append("unwritten manifest reported")
        with io.StringIO() as sink:
            stdout, sys.stdout = sys.stdout, sink
            try:
                write(root)
            finally:
                sys.stdout = stdout
        expect("valid 29-patch package verifies, scratch structure included",
               check(root), None)
        manifest = root / MANIFEST
        good = manifest.read_text(encoding="utf-8")
        rows = manifest_rows(good)
        if (len(rows) != 29
                or "rfcs/RFC-0007/rendering-and-surface.md" in rows_paths(rows)):
            failures.append("manifest population is not the 29 non-excluded modules")
        else:
            passed.append("manifest is 29 rows without the excluded module")

        def mutate_file(rel, transform, label, want, scratch_run=False):
            target = root / rel
            saved = target.read_bytes() if target.exists() else None
            transform(target)
            try:
                expect(label, check(root, scratch=scratch_run), want)
            finally:
                if saved is None:
                    target.unlink()
                else:
                    target.write_bytes(saved)

        first, second = rows[0][1], rows[1][1]
        mutate_file(MANIFEST, lambda t: t.write_text(
            good.replace(rows[0][0], sha256(b"tampered"), 1)),
            "manifest row digest mismatch rejected", "exact regeneration")
        mutate_file(MANIFEST, lambda t: t.write_text(good.replace(
            f"{rows[0][0]}  {first}\n{rows[1][0]}  {second}",
            f"{rows[1][0]}  {second}\n{rows[0][0]}  {first}")),
            "manifest row order rejected", "population or order")
        mutate_file(CANDIDATES / first, lambda t: t.write_bytes(
            t.read_bytes() + b"drift\n"),
            "mirror drift rejected", "mirrors of")
        mutate_file(patch_for(first), lambda t: t.unlink(),
                    "missing patch rejected", "missing patch")
        mutate_file(patch_for(EXCLUDED[0]), lambda t: (
            t.parent.mkdir(parents=True, exist_ok=True),
            t.write_text(make_patch(EXCLUDED[0], b"x\n", b"y\n"))),
            "patch for the excluded module rejected", "outside the 29-module")

        def rewrite(path, fn):
            old = (root / CONTRACTS / path).read_bytes()
            new = fn(old.decode("utf-8")).encode("utf-8")
            assert new != old, path
            return lambda t: t.write_text(make_patch(path, old, new))

        def identity_patch(t):
            # A hunk that applies cleanly and rewrites a line to itself: the
            # patch touches only its module, yet the bytes do not change.
            # One line of context either side (git apply anchors a
            # context-free hunk to the file's start).
            lines = (root / CONTRACTS / first).read_text(encoding="utf-8").splitlines()
            before, line, after = lines[1:4]
            t.write_text(f"diff --git a/{first} b/{first}\n--- a/{first}\n"
                         f"+++ b/{first}\n@@ -2,3 +2,3 @@\n {before}\n"
                         f"-{line}\n+{line}\n {after}\n")

        mutate_file(patch_for(first), identity_patch,
                    "identity (no-op) patch rejected as changing nothing",
                    f"patch for `{first}` changes nothing")
        # drifted subject: the patch's context no longer matches either mirror
        both = []
        for base in (CONTRACTS, CANDIDATES):
            both.append((base / first, (root / base / first).read_bytes()))
            (root / base / first).write_bytes(
                (root / base / first).read_bytes()[:-1] + b" drifted\n")
        expect("patch over drifted mirrors rejected",
               check(root, scratch=False), "does not apply")
        for rel, body in both:
            (root / rel).write_bytes(body)
        heading_module = next(p for p in rows_paths(rows)
                              if headings((root / CONTRACTS / p).read_text()))
        mutate_file(patch_for(heading_module), rewrite(
            heading_module, lambda s: s.replace(
                headings(s)[0], headings(s)[0] + " restyled", 1)),
            "heading change rejected", "heading lines changed")
        mutate_file(patch_for(first), rewrite(
            first, lambda s: s.replace("\nid: ", "\nid:  ", 1)),
            "front-matter change rejected", "front matter changed")
        clause_def = _verifier().CLAUSE_DEF
        clause_module = next(p for p in rows_paths(rows)
                             if clause_def.search((root / CONTRACTS / p).read_text()))

        def drop_clause(s):
            m = clause_def.search(s)
            return s[:m.start()] + "**Clause" + s[m.start() + 2:]

        mutate_file(patch_for(clause_module), rewrite(clause_module, drop_clause),
                    "clause-lead change rejected", "clause leads changed")
        other = next(p for p in rows_paths(rows) if p != first)
        mutate_file(patch_for(first), lambda t: t.write_text(
            make_patch(other, (root / CONTRACTS / other).read_bytes(),
                       (root / CONTRACTS / other).read_bytes() + b"x\n")),
            "patch naming another module rejected", "expected exactly")
        # CG-17 only: prose declaring a new sub-clause keeps leads, headings
        # and front matter intact, but the routing matrix never routes it.
        rfc8 = "rfcs/RFC-0008/state-vocabulary-and-cost.md"
        clause = re.search(r"^\*\*(RFC8-\d+)", (root / CONTRACTS / rfc8).read_text(),
                           re.M).group(1)

        def restyle_with_subclause(t):
            old = (root / CONTRACTS / rfc8).read_bytes()
            new = old + f"\nThis declares sub-clause {clause}(q).\n".encode()
            t.write_text(make_patch(rfc8, old, new))
            write_quiet(root)

        saved_manifest = manifest.read_bytes()
        mutate_file(patch_for(rfc8), restyle_with_subclause,
                    "CG-17 routing break on the patched tree rejected",
                    "CG-17", scratch_run=True)
        manifest.write_bytes(saved_manifest)
        # verify_final_prespec: a word-count ceiling breach keeps structure
        big = "rfcs/RFC-0002/README.md"

        def oversize(t):
            old = (root / CONTRACTS / big).read_bytes()
            t.write_text(make_patch(big, old, old + b"\nword" * 7200 + b"\n"))
            write_quiet(root)

        mutate_file(patch_for(big), oversize,
                    "verify_final_prespec failure on the patched tree rejected",
                    "verify_final_prespec.py fails", scratch_run=True)
        manifest.write_bytes(saved_manifest)
        expect("restored package verifies again", check(root), None)
        # apply refuses without --at-adoption, and without valid act
        # records; once the owner's act is recorded it installs both mirrors.
        recorder = _recorder()
        aggregate = root / recorder.AGGREGATE
        aggregate.parent.mkdir(parents=True, exist_ok=True)
        aggregate.write_text("# Synthetic aggregate\n")
        manifest_sha = sha256(manifest.read_bytes())
        pins = recorder.write_review(
            root, "docs/reviews/R-RESTYLE-CONFIRM-RAW.md", manifest_sha)
        with io.StringIO() as sink:
            stdout, sys.stdout = sys.stdout, sink
            try:
                refused = apply(root, at_adoption=False, pins=pins)
                unrecorded = apply(root, at_adoption=True, pins=pins)
                unrecorded_said = sink.getvalue()
                recorder.record(root, f"{recorder.LABEL}: {manifest_sha}",
                                "2026-09-28T00:00:00Z", verify=False, pins=pins)
                act = root / recorder.ACT
                saved_act = act.read_bytes()
                act.write_bytes(saved_act.replace(b"Owner: Tzeusy", b"Owner: x"))
                invalid = apply(root, at_adoption=True, pins=pins)
                act.write_bytes(saved_act)
                unpinned = apply(root, at_adoption=True,
                                 pins=recorder.Pins(None, None, None))
                untouched = not applied(root)
                done = apply(root, at_adoption=True, pins=pins)
            finally:
                sys.stdout = stdout
        (passed if refused == 2 else failures).append(
            "apply without --at-adoption refused")
        (passed if unrecorded == 1 and "no owner act is recorded" in unrecorded_said
         else failures).append("apply --at-adoption without act records refused")
        (passed if invalid == 1 and unpinned == 1 and untouched else failures).append(
            "apply --at-adoption over an edited record or an unpinned recorder "
            "refused, nothing written")
        (passed if done == 0 and applied(root) else failures).append(
            "apply --at-adoption after a valid record installs manifest bytes on "
            "both mirrors")
        # a later contract act amends one restyled module on both mirrors: the
        # package stays applied only through that act's own row
        link = ("later/MANIFEST.txt", "later/ACT.md")
        amended = (root / CONTRACTS / first).read_bytes() + b"later amendment\n"
        for base in (CONTRACTS, CANDIDATES):
            (root / base / first).write_bytes(amended)
        (root / link[0]).parent.mkdir(parents=True, exist_ok=True)
        (root / link[0]).write_text(f"{sha256(amended)}  {first}\n")
        unperformed = applied(root, [link])
        (root / link[1]).write_text("# later act\n")
        through_later = applied(root, [link])
        (root / link[0]).write_text(f"{sha256(b'other')}  {first}\n")
        wrong_row = applied(root, [link])
        (passed if not unperformed and through_later and not wrong_row
         else failures).append(
            "a module a later act amended is applied only through that performed "
            "act's own row")
        absent = scratch / "absent"
        absent.mkdir()
        code, message = check_command(absent)
        (passed if code == 0 and "absent" in message else failures).append(
            "absent package: --check prints absent and exits 0")
    for label in passed:
        print(f"  pass  {label}")
    for label in failures:
        print(f"  FAIL  {label}")
    print(f"{len(passed) + len(failures)} fixtures, {len(failures)} failing")
    return 1 if failures else 0


def rows_paths(rows):
    return [path for _sha, path in rows]


def write_quiet(root: pathlib.Path) -> None:
    with io.StringIO() as sink:
        stdout, sys.stdout = sys.stdout, sink
        try:
            write(root)
        finally:
            sys.stdout = stdout


# ------------------------------------------------------------------- main

def check_command(root: pathlib.Path) -> tuple[int, str]:
    """`--check`: (exit code, report). An absent package is not a failure."""
    if not (root / PACKAGE).is_dir():
        return 0, (f"contract readability-restyle package absent: "
                   f"{PACKAGE.as_posix()} does not exist; nothing to verify")
    if applied(root):
        later = set(later_rows(root)) & set(population(root))
        return 0, (f"contract readability-restyle package applied: all "
                   f"{len(population(root))} manifest rows equal both current mirrors"
                   + (f" ({len(later)} through a later contract act's row: "
                      + ", ".join(sorted(later)) + ")" if later else ""))
    findings = check(root)
    if findings:
        return 1, "contract readability-restyle package does not verify:\n" + "\n".join(
            f"  {finding}" for finding in findings)
    return 0, (f"contract readability-restyle manifest matches "
               f"{len(population(root))} patched modules on both identical mirrors; "
               f"clause leads, front matter and headings unchanged; "
               f"verify_final_prespec, CG-13 and CG-17 pass on the patched tree")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Build and verify the contract readability-restyle package.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--write", action="store_true",
                      help="regenerate the manifest (retires any packet quoting it)")
    parser.add_argument("--at-adoption", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.check:
        code, message = check_command(ROOT)
        print(message)
        return code
    if not (ROOT / PACKAGE).is_dir():
        print(f"refusing: package directory {PACKAGE.as_posix()} does not exist")
        return 1
    if args.apply:
        return apply(ROOT, args.at_adoption)
    if not args.write:
        print("refusing: regenerating the manifest changes the act argument; pass "
              "--write, then update every registered copy of the digest")
        return 2
    return write(ROOT)


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
    raise SystemExit(main(sys.argv[1:]))
