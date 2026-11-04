#!/usr/bin/env python3
"""Read-only evidence retention preparation and Git-object locator verification.

GP-Q1 is recorded in OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.
This tool never moves a body, creates a tag, fetches an object, or changes origin.
`plan --source FULL_COMMIT --out DIRECTORY` freezes the existing on-demand
census and a conservative keep/hold plan. `check` verifies the committed
locator representation. `selftest` exercises the same checker in real temporary
Git repositories. All original bodies remain in this additive preparation.

The census's `commit` is record metadata. Only `source_commit` below is a
verified containing commit. Census citation classes are not reliance verdicts.
Unknown family equivalence, recency, preservation language, dynamic consumers
and reviewer replay inputs stay held. No absence predicate establishes R2.
"""
from __future__ import annotations

import argparse
import collections
import fnmatch
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path, PurePosixPath

import build_evidence_index as census

PREFIX = "docs/evidence/"
HOME = "docs/retention/"
SHA = re.compile(r"[0-9a-f]{64}\Z")
COMMIT = re.compile(r"[0-9a-f]{40}\Z")
TAG = re.compile(r"evidence-archive/[0-9]{4}-(?:0[1-9]|1[0-2])\Z")
MAX_FILE = 32 * 1024 * 1024
MAX_LINE = 65536
MAX_ROWS = 100000
LIVE_KEYS = {"version", "kind", "path", "sha256", "family", "basis"}
ARCHIVE_KEYS = LIVE_KEYS | {"commit", "tag"}
SOURCE_KEYS = {"version", "source_commit", "snapshot_sha256", "plan_sha256", "source_tree_sha256",
               "tracked_regular_files", "evidence_files", "families", "citation_classes",
               "citation_predicate", "extended_predicate", "administrative_exclusions"}
ADMIN = {HOME + n for n in ("INDEX.jsonl", "PLAN.jsonl", "SOURCE.json", "CENSUS.jsonl")}
CITATION_PREDICATE = "scripts/build_evidence_index.py: unchanged path/digest/directory predicate; citation is not reliance"
EXTENDED_PREDICATE = "full path, slash suffixes, wrapped tokens, nested basename, stem and conservative fnmatch globs in every tracked regular citer; lexical absence never establishes R2"


class Refusal(ValueError):
    """An identified, fail-closed verification outcome."""


def demand(ok: bool, reason: str) -> None:
    if not ok:
        raise Refusal(reason)


def git_process(root: Path, *args: str, input: bytes | None = None) -> subprocess.CompletedProcess:
    # The command-line option fails closed on Git versions that lack it.
    # An environment-only flag could be silently ignored by an older Git.
    env = {k: v for k, v in os.environ.items() if not k.startswith("GIT_")}
    env["GIT_NO_LAZY_FETCH"] = "1"
    env["GIT_TERMINAL_PROMPT"] = "0"
    return subprocess.run(["git", "--no-lazy-fetch", "-C", str(root), *args],
                          env=env, input=input, capture_output=True)


def git(root: Path, *args: str, accept: tuple[int, ...] = (0,)) -> bytes:
    done = git_process(root, *args)
    demand(done.returncode in accept, "git-object-or-history-unavailable: " + args[0])
    return done.stdout


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encoded(value: object) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=True, separators=(",", ":")) + "\n").encode()


def jsonl(rows: list[dict]) -> bytes:
    return b"".join(encoded(row) for row in rows)


def load_json(data: bytes) -> object:
    demand(len(data) <= MAX_FILE, "input-too-large")
    def pairs(items):
        result = {}
        for k, v in items:
            demand(k not in result, "duplicate-json-key")
            result[k] = v
        return result
    try:
        return json.loads(data, object_pairs_hook=pairs,
                          parse_constant=lambda _: (_ for _ in ()).throw(Refusal("non-json-number")))
    except (ValueError, UnicodeError, RecursionError) as exc:
        raise Refusal("invalid-json") from exc


def lines(data: bytes) -> list[dict]:
    demand(len(data) <= MAX_FILE, "input-too-large")
    raw = data.splitlines()
    demand(0 < len(raw) <= MAX_ROWS, "empty-or-excessive-rows")
    rows = []
    for line in raw:
        demand(0 < len(line) <= MAX_LINE, "invalid-line-size")
        row = load_json(line)
        demand(isinstance(row, dict), "row-not-object")
        rows.append(row)
    return rows


def evidence_path(path: object) -> str:
    demand(isinstance(path, str) and len(path) <= 4096, "invalid-path")
    demand(path.startswith(PREFIX) and not any(c in path for c in "\\\x00\n\r\t"), "forbidden-path")
    demand(str(PurePosixPath(path)) == path and all(p not in ("", ".", "..") for p in path.split("/")),
           "noncanonical-path")
    demand(len(path) > len(PREFIX), "forbidden-path")
    return path


def tree(root: Path, commit: str) -> dict[str, tuple[str, str, str]]:
    demand(COMMIT.fullmatch(commit) is not None, "full-containing-commit-required")
    demand(git(root, "cat-file", "-t", commit).strip() == b"commit", "not-a-commit")
    out = {}
    for entry in git(root, "ls-tree", "-rz", "--full-tree", commit).split(b"\0"):
        if entry:
            meta, path = entry.split(b"\t", 1)
            mode, kind, oid = meta.decode().split()
            out[path.decode("utf-8")] = mode, kind, oid
    return out


def regular(meta: tuple[str, str, str] | None) -> bool:
    return meta is not None and meta[0] in ("100644", "100755") and meta[1] == "blob"


def blobs(root: Path, entries: dict[str, tuple[str, str, str]]) -> dict[str, bytes]:
    paths = [p for p, meta in entries.items() if regular(meta)]
    request = "".join(entries[p][2] + "\n" for p in paths).encode()
    output = git_process(root, "cat-file", "--batch", input=request)
    demand(output.returncode == 0, "missing-source-blob")
    result = {}
    cursor = 0
    for p in paths:
        end = output.stdout.index(b"\n", cursor)
        header = output.stdout[cursor:end].split()
        demand(len(header) == 3 and header[1] == b"blob", "missing-source-blob")
        size = int(header[2]); cursor = end + 1
        result[p] = output.stdout[cursor:cursor + size]
        cursor += size + 1
    return result


def source_files(root: Path, commit: str) -> dict[str, bytes]:
    return blobs(root, tree(root, commit))


def source_tree_digest(files: dict[str, bytes]) -> str:
    # Administrative rows never establish their own reliance or safety.
    return digest(jsonl([{"path": p, "sha256": digest(b)} for p, b in sorted(files.items()) if p not in ADMIN]))


def make_census(files: dict[str, bytes]) -> bytes:
    # Reuse the measured generator unchanged, against the frozen commit's
    # regular-file snapshot. No observed code or source-record instruction runs.
    with tempfile.TemporaryDirectory(prefix="syzygy-retention-census-") as temp:
        root = Path(temp)
        git(root, "init", "-q", "--object-format=sha1")
        index_info = []
        for p, body in files.items():
            demand(not PurePosixPath(p).is_absolute() and ".." not in PurePosixPath(p).parts,
                   "invalid-source-path")
            dest = root / p; dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(body)
            oid = hashlib.sha1(b"blob " + str(len(body)).encode() + b"\0" + body).hexdigest()
            index_info.append(("100644 " + oid + "\t" + p + "\0").encode())
        # Only ls-files consumes this synthetic index; the census reads the
        # materialized bytes. Plumbing avoids clean filters from .gitattributes.
        result = git_process(root, "update-index", "--info-only", "-z", "--index-info", input=b"".join(index_info))
        demand(result.returncode == 0, "synthetic-index-unavailable")
        return census.build(root)[0].encode()


def protection_witnesses(files: dict[str, bytes], rows: list[dict]) -> dict[str, list[dict]]:
    """Conservative witnesses, not an assertion that a citation is reliance.

    Extend the census with nested basenames, stems and conservative fnmatch
    glob witnesses with a literal prefix in any tracked regular citer.
    Unscoped globs remain unresolved. A star can span a slash here:
    this deliberately over-retains rather than claiming actual glob semantics.
    Dynamic reads/preservation/equivalence cannot
    be disproved lexically; the plan holds their residual explicitly.
    """
    targets = {r["path"]: [] for r in rows}
    keys = collections.defaultdict(set)
    by_digest = collections.defaultdict(set)
    directories = collections.defaultdict(set)
    glob_cache = {}
    forms = {p: (p, p[len(PREFIX):], PurePosixPath(p).name) for p in targets}
    for row in rows:
        p = row["path"]
        if row["sha256"] != census.EMPTY_SHA256:
            by_digest[row["sha256"]].add(p)
        parent = PurePosixPath(p).parent
        while str(parent).startswith(PREFIX):
            directories[str(parent)].add(p)
            parent = parent.parent
        for token in (p, PurePosixPath(p).name, PurePosixPath(p).stem):
            keys[token].add(p)
    for citer, body in sorted(files.items()):
        text = body.decode("utf-8", "replace")
        if citer in ADMIN or census.is_snapshot(citer, text):
            continue
        kind = census.citer_kind(citer, text)
        hits = set()
        for token in sorted(census.tokens_of(text)):
            for key in {token, token.rstrip("."), *[token[i + 1:] for i, c in enumerate(token) if c == "/"]}:
                for target in sorted(keys.get(key, ())):
                    if target != citer:
                        hits.add((target, "path-basename-or-stem", key))
            for key in census.directory_keys(token, str(PurePosixPath(citer).parent)):
                for target in directories.get(key, ()):
                    if not citer.startswith(key + "/"):
                        hits.add((target, "directory", key))
        for hexd in census.HEX64.findall(text):
            for target in by_digest.get(hexd.lower(), ()):
                if target != citer:
                    hits.add((target, "digest", hexd.lower()))
        patterns = {p.rstrip(".") for p in re.findall(r"[A-Za-z0-9_./*?\[\]-]+", text)
                    if ("*" in p or "?" in p) and any(c.isalnum() for c in p)}
        for pattern in sorted(patterns):
            prefix = pattern.split("*", 1)[0].split("?", 1)[0].split("[", 1)[0]
            if not any(c.isalnum() for c in prefix):
                continue
            if pattern not in glob_cache:
                match = re.compile(fnmatch.translate(pattern)).fullmatch
                glob_cache[pattern] = [p for p, names in forms.items() if any(match(name) for name in names)]
            for target in glob_cache[pattern]:
                if target != citer:
                    hits.add((target, "conservative-glob", pattern))
        for target, form, token in sorted(hits):
            targets[target].append({"citer": citer, "kind": kind, "form": form, "token": token})
    return targets


def make_plan(commit: str, rows: list[dict], files: dict[str, bytes], witness_out: Path | None = None) -> list[dict]:
    witnesses = protection_witnesses(files, rows)
    if witness_out:
        with witness_out.open("wb") as stream:
            for p, found in sorted(witnesses.items()):
                stream.write(encoded({"path": p, "witnesses": found}))
    result = []
    for r in rows:
        p = r["path"]; found = witnesses[p]
        if p.endswith("-RAW.md"):
            category, disposition, reason = "R0", "keep", "verbatim-raw-preservation-lock"
        elif r["reliance"] == "act-bound":
            category, disposition, reason = "R0", "keep", "governed-digest-witness-conservative-freeze"
        elif r["reliance"] in ("governed-citer", "code-reference", "raw-review-citer", "digest-cited") or any(
                w["kind"] in ("governed", "code", "raw") for w in found):
            category, disposition, reason = "R1", "keep", "undischarged-dependence-witness"
        else:
            category, disposition, reason = "hold", "hold", "unproved-equivalence-recency-and-reliance-discharge"
        result.append({"path": p, "sha256": r["sha256"], "source_commit": commit,
                       "index_family": r["family"], "equivalence_family": None,
                       "classification": category, "disposition": disposition, "reason": reason,
                       "witnesses": {"count": len(found), "sha256": digest(jsonl(found)),
                                     "kinds": dict(sorted(collections.Counter(w["kind"] for w in found).items())),
                                     "examples": found[:3]}, "record_named_commit": r["commit"]})
    return result


def prepare(root: Path, commit: str, out: Path, witness_out: Path | None = None) -> dict:
    demand(git(root, "rev-parse", "--is-shallow-repository").strip() == b"false", "shallow-history")
    destination = out.resolve()
    demand(not destination.is_relative_to(root.resolve()) or destination == (root / HOME).resolve(),
           "generated-output-must-use-retention-home-or-external-directory")
    demand(not out.is_symlink() and not any((out / n).is_symlink() for n in
           ("SOURCE.json", "CENSUS.jsonl", "PLAN.jsonl", "INDEX.jsonl")), "output-artifact-symlink")
    if witness_out:
        demand(not witness_out.resolve().is_relative_to(root.resolve()), "full-witness-output-must-be-external")
    if (out / "SOURCE.json").exists():
        prior = load_json((out / "SOURCE.json").read_bytes())
        demand(isinstance(prior, dict) and prior.get("source_commit") == commit,
               "different-source-retires-plan-use-a-new-output-directory")
    files = source_files(root, commit)
    snapshot = make_census(files)
    rows = lines(snapshot)
    expected = sorted(p for p in files if p.startswith(PREFIX))
    demand([r["path"] for r in rows] == expected, "independent-population-mismatch")
    plan = make_plan(commit, rows, files, witness_out)
    plan_data = jsonl(plan)
    source = {"version": 1, "source_commit": commit, "snapshot_sha256": digest(snapshot),
              "plan_sha256": digest(plan_data), "source_tree_sha256": source_tree_digest(files),
              "tracked_regular_files": len(files), "evidence_files": len(rows),
              "families": len({r["family"] for r in rows}),
              "citation_classes": dict(sorted(collections.Counter(r["reliance"] for r in rows).items())),
              "citation_predicate": CITATION_PREDICATE,
              "extended_predicate": EXTENDED_PREDICATE,
              "administrative_exclusions": sorted(ADMIN)}
    index = [{"version": 1, "kind": "live", "path": r["path"], "sha256": r["sha256"],
              "family": r["index_family"], "basis": r["classification"]} for r in plan]
    out.mkdir(parents=True, exist_ok=True)
    for name, data in (("CENSUS.jsonl", snapshot), ("PLAN.jsonl", plan_data),
                       ("SOURCE.json", encoded(source)), ("INDEX.jsonl", jsonl(index))):
        (out / name).write_bytes(data)
    return source


def verify_archive_objects(root: Path, row: dict) -> dict:
    p = evidence_path(row["path"])
    demand(row["basis"] == "R2", "forbidden-R0-R1-or-hold-move")
    demand(isinstance(row["tag"], str) and TAG.fullmatch(row["tag"]) is not None, "invalid-archive-tag")
    archived = tree(root, row["commit"])
    demand(regular(archived.get(p)), "archive-path-not-regular-blob")
    demand(digest(git(root, "cat-file", "blob", archived[p][2])) == row["sha256"], "archive-digest-mismatch")
    ref = "refs/tags/" + row["tag"]
    demand(git(root, "cat-file", "-t", ref).strip() == b"tag", "archive-tag-not-annotated")
    peeled = git(root, "rev-parse", ref + "^{commit}").decode().strip()
    ancestry = git_process(root, "merge-base", "--is-ancestor", row["commit"], peeled)
    demand(ancestry.returncode == 0, "archive-commit-unreachable-from-tag")
    return {"commit": row["commit"], "path": p, "sha256": row["sha256"], "tag": row["tag"],
            "tag_object": git(root, "rev-parse", ref).decode().strip(), "peeled_commit": peeled}


def validate_locator(root: Path, row: dict, current: dict) -> None:
    keys = ARCHIVE_KEYS if row.get("kind") == "archive" else LIVE_KEYS
    demand(set(row) == keys and row.get("version") == 1 and type(row["version"]) is int,
           "unknown-schema-fields-or-version")
    demand(row.get("kind") in ("live", "archive"), "unknown-row-kind")
    p = evidence_path(row["path"])
    demand(isinstance(row["sha256"], str) and SHA.fullmatch(row["sha256"]) is not None, "invalid-digest")
    demand(isinstance(row["family"], str) and 0 < len(row["family"]) <= 1024, "invalid-family")
    demand(isinstance(row["basis"], str) and row["basis"] in ("R0", "R1", "hold", "R2"), "invalid-basis")
    if row["kind"] == "live":
        demand(regular(current.get(p)), "live-body-not-regular-blob")
        demand(digest(git(root, "cat-file", "blob", current[p][2])) == row["sha256"], "live-digest-mismatch")
        return
    verify_archive_objects(root, row)
    # Local rows cannot establish remote protection. The transaction's future
    # protection receipt is deliberately not implemented as a trusted boolean.
    raise Refusal("origin-protection-and-reviewed-family-proof-required-additive-only")


def check(root: Path, home: Path) -> dict:
    demand(git(root, "rev-parse", "--is-shallow-repository").strip() == b"false", "shallow-history")
    for name in ("SOURCE.json", "CENSUS.jsonl", "PLAN.jsonl", "INDEX.jsonl"):
        p = home / name
        demand(not p.is_symlink() and p.is_file() and p.resolve().is_relative_to(root.resolve()),
               "retention-input-not-regular-local-file")
    source = load_json((home / "SOURCE.json").read_bytes())
    demand(isinstance(source, dict) and set(source) == SOURCE_KEYS and source["version"] == 1
           and type(source["version"]) is int,
           "invalid-source-schema")
    for key in ("snapshot_sha256", "plan_sha256", "source_tree_sha256"):
        demand(isinstance(source[key], str) and SHA.fullmatch(source[key]) is not None, "invalid-source-digest")
    for key in ("tracked_regular_files", "evidence_files", "families"):
        demand(type(source[key]) is int and 0 <= source[key] <= MAX_ROWS, "invalid-source-count")
    demand(source["administrative_exclusions"] == sorted(ADMIN), "administrative-exclusion-drift")
    demand(source["citation_predicate"] == CITATION_PREDICATE and source["extended_predicate"] == EXTENDED_PREDICATE,
           "source-predicate-drift")
    demand(isinstance(source["citation_classes"], dict) and
           all(k in census.RELIANCE_CLASSES and type(v) is int and v >= 0 for k, v in source["citation_classes"].items()),
           "invalid-citation-class-counts")
    original = source_files(root, source["source_commit"])
    demand(source_tree_digest(original) == source["source_tree_sha256"], "source-population-drift")
    snapshot = (home / "CENSUS.jsonl").read_bytes()
    plan_data = (home / "PLAN.jsonl").read_bytes()
    demand(digest(snapshot) == source["snapshot_sha256"], "census-drift")
    demand(digest(plan_data) == source["plan_sha256"], "plan-drift")
    census_rows = lines(snapshot); plan = lines(plan_data)
    demand(snapshot == make_census(original), "census-not-source-regeneration")
    demand(len(census_rows) == source["evidence_files"] == len(plan), "source-denominator-mismatch")
    demand(source["tracked_regular_files"] == len(original) and
           source["families"] == len({r["family"] for r in census_rows}) and
           source["citation_classes"] == dict(collections.Counter(r["reliance"] for r in census_rows)),
           "source-population-count-mismatch")
    expected_plan = make_plan(source["source_commit"], census_rows, original)
    demand(plan_data == jsonl(expected_plan), "unreviewed-plan-or-classification-change")
    plan_by_path = {r["path"]: r for r in plan}
    head = git(root, "rev-parse", "HEAD").decode().strip()
    current = tree(root, head)
    # Include the actual tracked worktree/index: a dirty or new tracked body
    # must not borrow the committed body's digest. Untracked scratch is outside
    # the gate's documented population.
    staged = git(root, "ls-files", "-s", "-z", "--", PREFIX)
    actual = {}
    for item in staged.split(b"\0"):
        if item:
            meta, p = item.split(b"\t", 1); mode, oid, stage = meta.decode().split()
            path = p.decode(); evidence_path(path)
            demand(stage == "0" and mode in ("100644", "100755"), "non-regular-or-conflicted-evidence")
            demand(not (root / path).is_symlink() and (root / path).is_file(), "missing-or-symlink-live-body")
            actual[path] = digest((root / path).read_bytes())
    rows = lines((home / "INDEX.jsonl").read_bytes())
    seen = set(); live = set(); archived = set()
    for row in rows:
        p = evidence_path(row.get("path"))
        demand(p not in seen, "duplicate-or-conflicting-identity"); seen.add(p)
        validate_locator(root, row, current)
        if row["kind"] == "live":
            demand(actual.get(p) == row["sha256"], "live-worktree-drift")
            live.add(p)
        else:
            archived.add(p)
        if p in plan_by_path:
            old = plan_by_path[p]
            demand(row["family"] == old["index_family"] and row["basis"] == old["classification"],
                   "plan-index-classification-drift")
        else:
            demand(row["kind"] == "live" and row["basis"] == "hold", "new-body-requires-conservative-live-row")
            demand(row["family"] == census.family_of(p), "new-body-family-mismatch")
    demand(live == set(actual), "unindexed-current-evidence")
    demand(set(plan_by_path) <= live | archived, "missing-source-body-or-newest-keeper")
    return {"head": head, "source_commit": source["source_commit"], "live": len(live), "archive": len(archived),
            "plan": dict(collections.Counter(r["classification"] for r in plan)), "phase": "additive-only"}


def selftest(implementation: Path, receipt: Path | None) -> int:
    """One boundary matrix; mutants are data in disposable real Git repos."""
    implementation_commit = git(implementation, "rev-parse", "HEAD").decode().strip()
    implementation_sha256 = digest(Path(__file__).read_bytes())
    cases = []
    with tempfile.TemporaryDirectory(prefix="syzygy-retention-matrix-") as temp:
        root = Path(temp) / "repo"; root.mkdir(); git(root, "init", "-q")
        def write(p, data):
            dest = root / p; dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data if isinstance(data, bytes) else data.encode())
        def commit():
            git(root, "add", "--force", "--all")
            git(root, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
                "commit", "-qm", "synthetic retention fixture")
            return git(root, "rev-parse", "HEAD").decode().strip()
        write(PREFIX + "run-a.json", '{"subject":"synthetic","captured_at":"2026-01-01T00:00:00Z"}\n')
        write(PREFIX + "run-b.json", '{"subject":"synthetic","captured_at":"2026-01-02T00:00:00Z"}\n')
        (root / (PREFIX + "run-a.json")).chmod(0o755)
        write(PREFIX + "review-RAW.md", "Synthetic reviewer corpus: docs/evidence/run-*.json\n")
        write("scripts/reader.py", "# A consumer pins docs/evidence/run-a.json\n")
        source_commit = commit(); home = root / HOME
        # Record valid preparation itself, so a mutant refusing this setup
        # cannot masquerade as an empty test population.
        preparation_case = {"predicate": "valid-preparation-bootstrap", "pass": False,
                            "old": {"source_commit": source_commit, "evidence_files": 3},
                            "new": "prepare the owned repository into its retention home",
                            "expected": {"source_commit": source_commit, "evidence_files": 3},
                            "fixture_commit": source_commit}
        cases.append(preparation_case)
        prepared = prepare(root, source_commit, home)
        preparation_case["pass"] = prepared["source_commit"] == source_commit and prepared["evidence_files"] == 3
        checkpoint = commit()
        def restore():
            git(root, "reset", "--hard", checkpoint)
            git(root, "clean", "-fdq")
        def state():
            result = {p: (root / p).read_text(errors="replace")
                      for p in census.tracked_files(root) if (root / p).is_file() and not (root / p).is_symlink()}
            result["fixture-git-index"] = git(root, "ls-files", "--stage").decode()
            return result
        def failure(name, action, expected):
            restore(); control = check(root, home)["live"] == 3
            old = state(); action(); new = state()
            try:
                check(root, home)
                reason = "unexpected-pass"; ok = False
            except (Refusal, OSError) as exc:
                reason = str(exc); ok = reason == expected or reason.startswith(expected + ":")
            restore()
            restored = check(root, home)["live"] == 3
            changed = sorted(p for p in set(old) | set(new) if old.get(p) != new.get(p))
            cases.append({"predicate": name, "pass": control and ok and restored, "refusal": reason,
                          "old": {p: old.get(p) for p in changed}, "new": {p: new.get(p) for p in changed},
                          "fixture_commit": checkpoint, "control_pass": control, "restored_pass": restored,
                          "expected_refusal": expected})
        def probe(name, good, bad, expected, old, new):
            """Direct boundary inputs avoid storing huge repeated-byte fixtures.

            old/new are exact Python fixture fragments, evaluated by the actions
            beside them. Fault injection is limited to synthetic Git or census
            output and is always restored before the passing control repeats.
            """
            good()
            try:
                bad(); reason = "unexpected-pass"
            except (Refusal, OSError) as exc:
                reason = str(exc)
            good()
            cases.append({"predicate": name, "pass": expected == reason,
                          "refusal": reason, "old": old, "new": new,
                          "control_pass": True, "restored_pass": True,
                          "fixture_commit": checkpoint, "expected_refusal": expected})
        def index_mutate(fn):
            rows = lines((home / "INDEX.jsonl").read_bytes()); fn(rows)
            (home / "INDEX.jsonl").write_bytes(jsonl(rows))
        executable_mode = tree(root, checkpoint)[PREFIX + "run-a.json"][0]
        executable_case = {"predicate": "executable-live-index-accepted", "pass": False,
                      "old": {"mode": "100644"}, "new": {"path": PREFIX + "run-a.json", "mode": executable_mode},
                      "expected": {"mode": "100755", "live": 3}, "fixture_commit": checkpoint}
        cases.append(executable_case)
        baseline = check(root, home)
        executable_case["pass"] = executable_mode == "100755" and baseline["live"] == 3
        planned = {r["path"]: r for r in lines((home / "PLAN.jsonl").read_bytes())}
        demand(planned[PREFIX + "run-b.json"]["classification"] == "R1" and any(
            w["form"] == "conservative-glob" for w in planned[PREFIX + "run-b.json"]["witnesses"]["examples"]),
            "selftest-raw-glob-witness-missing")
        before = {p.name: p.read_bytes() for p in home.iterdir()}
        prepare(root, source_commit, home)
        cases.append({"predicate": "valid-live-retrieval-and-deterministic-replay", "pass": baseline["live"] == 3
                      and before == {p.name: p.read_bytes() for p in home.iterdir()} and check(root, home) == baseline,
                      "fixture_commit": checkpoint, "old": "first frozen plan", "new": "identical replay"})
        failure("unindexed-new-file", lambda: (write(PREFIX + "new.json", "{}\n"), commit()), "unindexed-current-evidence")
        failure("dirty-live-digest", lambda: write(PREFIX + "run-b.json", "changed prose\n"), "live-worktree-drift")
        failure("missing-live-body", lambda: (root / (PREFIX + "run-b.json")).unlink(), "missing-or-symlink-live-body")
        failure("traversal", lambda: index_mutate(lambda r: r[0].update(path=PREFIX + "../bad.json")), "noncanonical-path")
        failure("governed-path", lambda: index_mutate(lambda r: r[0].update(path=".syzygy/bad.json")), "forbidden-path")
        failure("absolute-path", lambda: index_mutate(lambda r: r[0].update(path="/tmp/bad.json")), "forbidden-path")
        def symlink():
            p = root / (PREFIX + "run-b.json"); p.unlink(); p.symlink_to("run-a.json"); git(root, "add", "--all")
        failure("symlink-is-not-blob", symlink, "non-regular-or-conflicted-evidence")
        failure("unknown-schema-field", lambda: index_mutate(lambda r: r[0].update(unbounded=True)), "unknown-schema-fields-or-version")
        failure("bad-version", lambda: index_mutate(lambda r: r[0].update(version=True)), "unknown-schema-fields-or-version")
        failure("digest-shape", lambda: index_mutate(lambda r: r[0].update(sha256="bad")), "invalid-digest")
        failure("digest-mismatch", lambda: index_mutate(lambda r: r[0].update(sha256="0" * 64)), "live-digest-mismatch")
        failure("duplicate-identity", lambda: index_mutate(lambda r: r.append(dict(r[0]))), "duplicate-or-conflicting-identity")
        failure("conflicting-identity", lambda: index_mutate(lambda r: r.append({**r[0], "sha256": "0" * 64})), "duplicate-or-conflicting-identity")
        failure("keeper-loss", lambda: index_mutate(lambda r: r.pop()), "unindexed-current-evidence")
        failure("R0-R1-classification-tamper", lambda: index_mutate(lambda r: r[0].update(basis="R2")), "plan-index-classification-drift")
        failure("concurrent-plan-drift", lambda: (home / "PLAN.jsonl").write_bytes(b'{}\n'), "plan-drift")
        failure("concurrent-census-drift", lambda: (home / "CENSUS.jsonl").write_bytes(b'{}\n'), "census-drift")
        def source_mutate(key, value):
            doc = load_json((home / "SOURCE.json").read_bytes()); doc[key] = value
            (home / "SOURCE.json").write_bytes(encoded(doc))
        failure("absent-containing-source-commit", lambda: source_mutate("source_commit", "0" * 40), "git-object-or-history-unavailable")
        failure("source-population-drift", lambda: source_mutate("source_tree_sha256", "0" * 64), "source-population-drift")
        failure("source-denominator", lambda: source_mutate("evidence_files", 4), "source-denominator-mismatch")
        def forged_plan():
            data = lines((home / "PLAN.jsonl").read_bytes()); data[0]["classification"] = "R2"
            b = jsonl(data); (home / "PLAN.jsonl").write_bytes(b); source_mutate("plan_sha256", digest(b))
        failure("forged-reviewed-classification", forged_plan, "unreviewed-plan-or-classification-change")
        def altered_prose():
            data = lines((home / "CENSUS.jsonl").read_bytes()); data[0]["verdict"] = "manufactured PASS"
            b = jsonl(data); (home / "CENSUS.jsonl").write_bytes(b); source_mutate("snapshot_sha256", digest(b))
        failure("altered-prose-census", altered_prose, "census-not-source-regeneration")
        failure("duplicate-json-key", lambda: (home / "INDEX.jsonl").write_bytes(b'{"path":"x","path":"y"}\n'), "invalid-json")
        failure("unknown-row-kind", lambda: index_mutate(lambda r: r[0].update(kind="unexpected")), "unknown-row-kind")
        failure("family-shape", lambda: index_mutate(lambda r: r[0].update(family=[])), "invalid-family")
        failure("basis-shape", lambda: index_mutate(lambda r: r[0].update(basis=[])), "invalid-basis")
        failure("empty-index", lambda: (home / "INDEX.jsonl").write_bytes(b''), "empty-or-excessive-rows")
        failure("non-object-row", lambda: (home / "INDEX.jsonl").write_bytes(b'null\n'), "row-not-object")
        failure("overlong-row", lambda: (home / "INDEX.jsonl").write_bytes(b' ' * 65537 + b'\n'), "invalid-line-size")
        failure("source-version-shape", lambda: source_mutate("version", True), "invalid-source-schema")
        failure("source-digest-shape", lambda: source_mutate("plan_sha256", "bad"), "invalid-source-digest")
        failure("source-count-shape", lambda: source_mutate("families", True), "invalid-source-count")
        failure("source-exclusion-tamper", lambda: source_mutate("administrative_exclusions", []), "administrative-exclusion-drift")
        failure("altered-prose-source-predicate", lambda: source_mutate("extended_predicate", "Everything is safe to move"), "source-predicate-drift")
        failure("source-citation-count-shape", lambda: source_mutate("citation_classes", {"unknown": 3}), "invalid-citation-class-counts")
        def index_symlink():
            original = home / "INDEX.jsonl"; external = Path(temp) / "external-index.jsonl"
            external.write_bytes(original.read_bytes()); original.unlink(); original.symlink_to(external)
        failure("index-symlink-refused", index_symlink, "retention-input-not-regular-local-file")
        failure("source-count-mismatch", lambda: source_mutate("families", 100), "source-population-count-mismatch")
        for key in ("snapshot_sha256", "source_tree_sha256"):
            failure("source-digest-shape-" + key, lambda: source_mutate(key, "bad"), "invalid-source-digest")
        for key in ("tracked_regular_files", "evidence_files"):
            failure("source-count-shape-" + key, lambda: source_mutate(key, -1), "invalid-source-count")
        failure("source-citation-predicate-drift", lambda: source_mutate("citation_predicate", "altered prose"), "source-predicate-drift")
        failure("source-tracked-count-mismatch", lambda: source_mutate("tracked_regular_files", 100), "source-population-count-mismatch")
        failure("source-class-count-mismatch", lambda: source_mutate("citation_classes", {}), "source-population-count-mismatch")
        # Composite guards need independent boundary inputs. A failure of one
        # conjunct does not exercise its siblings (notably prefix vs characters).
        for name, value in (("type", []), ("type-with-valid-key-set", ["version", "source_commit", "snapshot_sha256",
                            "plan_sha256", "source_tree_sha256", "tracked_regular_files", "evidence_files", "families",
                            "citation_classes", "citation_predicate", "extended_predicate", "administrative_exclusions"]),
                            ("missing-field", None), ("extra-field", "extra"), ("version", 2)):
            def bad_source_schema():
                doc = load_json((home / "SOURCE.json").read_bytes())
                if name.startswith("type"):
                    doc = value
                elif name == "missing-field":
                    doc.pop("families")
                elif name == "extra-field":
                    doc["extra"] = value
                else:
                    doc["version"] = value
                (home / "SOURCE.json").write_bytes(encoded(doc))
            failure("source-schema-" + name, bad_source_schema, "invalid-source-schema")
        for key in ("snapshot_sha256", "plan_sha256", "source_tree_sha256"):
            failure("source-digest-type-" + key, lambda: source_mutate(key, 42), "invalid-source-digest")
            for label, value in (("uppercase", "A" * 64), ("nonhex", "g" * 64), ("suffix", "0" * 64 + "\n")):
                failure("source-digest-" + label + "-" + key, lambda: source_mutate(key, value), "invalid-source-digest")
        for key in ("tracked_regular_files", "evidence_files", "families"):
            for name, value in (("negative", -1), ("excessive", 100001), ("float", 1.0)):
                failure("source-count-" + name + "-" + key, lambda: source_mutate(key, value), "invalid-source-count")
            for label, value in (("minimum-inclusive", 0), ("maximum-inclusive", 100000)):
                reason = "source-denominator-mismatch" if key == "evidence_files" else "source-population-count-mismatch"
                failure("source-count-" + label + "-" + key, lambda: source_mutate(key, value), reason)
        for name, value in (("type", []), ("boolean", {"none": True}),
                            ("negative", {"none": -1}), ("float", {"none": 1.0})):
            failure("citation-count-" + name, lambda: source_mutate("citation_classes", value), "invalid-citation-class-counts")
        def truncated_plan():
            data = jsonl(lines((home / "PLAN.jsonl").read_bytes())[:-1])
            (home / "PLAN.jsonl").write_bytes(data); source_mutate("plan_sha256", digest(data))
        failure("plan-denominator-independent-of-census", truncated_plan, "source-denominator-mismatch")
        def aligned_plan_and_count_drift():
            rows = lines((home / "PLAN.jsonl").read_bytes()); rows.append(dict(rows[0]))
            data = jsonl(rows); (home / "PLAN.jsonl").write_bytes(data)
            source_mutate("plan_sha256", digest(data)); source_mutate("evidence_files", 4)
        failure("census-denominator-independent-of-plan", aligned_plan_and_count_drift, "source-denominator-mismatch")
        failure("missing-local-retention-input", lambda: (home / "INDEX.jsonl").unlink(), "retention-input-not-regular-local-file")
        def internal_input_symlink(artifact):
            path = home / artifact; copy = root / ("identical-copy-" + artifact)
            copy.write_bytes(path.read_bytes()); path.unlink(); path.symlink_to(copy)
        for artifact in ("SOURCE.json", "CENSUS.jsonl", "PLAN.jsonl", "INDEX.jsonl"):
            failure("internal-identical-retention-input-symlink-" + artifact,
                    lambda: internal_input_symlink(artifact), "retention-input-not-regular-local-file")
        def conflicted_index():
            path = PREFIX + "run-b.json"
            oid = git(root, "rev-parse", "HEAD:" + path).decode().strip()
            data = f"0 {'0' * 40}\t{path}\n100644 {oid} 1\t{path}\n100644 {oid} 2\t{path}\n".encode()
            done = git_process(root, "update-index", "--index-info", input=data)
            assert done.returncode == 0, "owned conflict fixture must be installed"
        failure("conflict-stage-with-regular-mode", conflicted_index, "non-regular-or-conflicted-evidence")
        def unstaged_symlink():
            path = root / (PREFIX + "run-b.json")
            copy = Path(temp) / "identical-live-body.json"; copy.write_bytes(path.read_bytes())
            path.unlink(); path.symlink_to(copy)
        failure("unstaged-identical-body-symlink", unstaged_symlink, "missing-or-symlink-live-body")
        for name, changes, reason in (
                ("missing-row-field", None, "unknown-schema-fields-or-version"),
                ("numeric-version", {"version": 2}, "unknown-schema-fields-or-version"),
                ("digest-type", {"sha256": 42}, "invalid-digest"),
                ("digest-uppercase", {"sha256": "A" * 64}, "invalid-digest"),
                ("digest-nonhex", {"sha256": "g" * 64}, "invalid-digest"),
                ("digest-suffix", {"sha256": "0" * 64 + "\n"}, "invalid-digest"),
                ("family-empty", {"family": ""}, "invalid-family"),
                ("family-nonstring-valid-length", {"family": ["a"]}, "invalid-family"),
                ("family-size", {"family": "a" * 1025}, "invalid-family"),
                ("basis-unknown", {"basis": "unexpected"}, "invalid-basis"),
                ("existing-family-drift", {"family": "wrong"}, "plan-index-classification-drift")):
            def mutate_row():
                index_mutate(lambda rows: rows[0].pop("family") if changes is None else rows[0].update(changes))
            failure(name, mutate_row, reason)
        def remove_tracked():
            (root / (PREFIX + "run-b.json")).unlink(); commit()
        failure("committed-body-removal", remove_tracked, "live-body-not-regular-blob")
        def gitlink():
            git(root, "update-index", "--add", "--cacheinfo", "160000," + source_commit + "," + PREFIX + "gitlink")
        failure("gitlink-is-not-blob", gitlink, "non-regular-or-conflicted-evidence")
        def new_live(basis="hold", family="new"):
            p = PREFIX + "new.json"; body = b'{}\n'; write(p, body); commit()
            index_mutate(lambda r: r.append({"version": 1, "kind": "live", "path": p,
                                            "sha256": digest(body), "family": family, "basis": basis}))
        for basis in ("R0", "R1", "R2"):
            failure("new-file-unproved-" + basis, lambda: new_live(basis=basis), "new-body-requires-conservative-live-row")
        failure("new-file-family-mismatch", lambda: new_live(family="wrong"), "new-body-family-mismatch")
        def missing_keeper():
            (root / (PREFIX + "run-b.json")).unlink(); commit()
            index_mutate(lambda rows: rows.remove(next(r for r in rows if r["path"] == PREFIX + "run-b.json")))
        failure("source-body-and-locator-lost", missing_keeper, "missing-source-body-or-newest-keeper")
        # These parser/path boundaries share refusal strings with other guards;
        # each call site needs its own failing input, not a reason-only census.
        for name, reader in (("json-total-size", load_json), ("jsonl-total-size", lines)):
            probe(name, lambda: reader(b'{}'), lambda: reader(b' ' * 33554433),
                  "input-too-large", "b'{}'", "b' ' * 33554433")
            cases[-1]["input_bytes_sha256"] = {"old": digest(b'{}'), "new": digest(b' ' * 33554433)}
        for name, action, expected, fragment in (
                ("json-size-inclusive", lambda: load_json(b' ' * (33554432 - 2) + b'{}'), {},
                 "b' ' * (33554432 - 2) + b'{}'"),
                ("jsonl-line-inclusive", lambda: len(lines(b'{\"p\":\"' + b'a' * (65536 - 8) + b'\"}')), 1,
                 "b'{\"p\":\"' + b'a' * (65536 - 8) + b'\"}'"),
                ("jsonl-rows-inclusive", lambda: len(lines(b'{}\n' * 100000)), 100000,
                 "b'{}\\n' * 100000"),
                ("jsonl-size-inclusive", lambda: len(lines((b'{\"p\":\"' + b'a' * (65536 - 9) + b'\"}\n') * 512)), 512,
                 "(b'{\"p\":\"' + b'a' * (65536 - 9) + b'\"}\\n') * 512")):
            observed = action()
            cases.append({"predicate": name, "pass": observed == expected, "expected": expected,
                          "observed": observed, "old": "small valid input", "new": fragment,
                          "fixture_commit": checkpoint})
        for name, bad in (("json-nonfinite", b'NaN'), ("json-positive-infinity", b'Infinity'),
                          ("json-negative-infinity", b'-Infinity'), ("json-invalid-syntax", b'{'),
                          ("json-invalid-utf8", b'"\xff"'),
                          ("json-recursion", b'[' * 100000 + b']' * 100000)):
            probe(name, lambda: load_json(b'{}'), lambda: load_json(bad),
                  "invalid-json", "b'{}'", "b'[' * 100000 + b']' * 100000" if name == "json-recursion" else repr(bad))
        for name, bad in (("jsonl-empty-line", b'{}\n\n'),
                          ("jsonl-excessive-rows", b'{}\n' * 100001)):
            probe(name, lambda: lines(b'{}\n'), lambda: lines(bad),
                  "invalid-line-size" if name == "jsonl-empty-line" else "empty-or-excessive-rows",
                  repr(b'{}\n'), repr(bad) if name == "jsonl-empty-line" else repr(b'{}\n') + " * 100001")
        for name, bad in (("path-type", None), ("path-size", PREFIX + "a" * 4096),
                          ("path-size-just-over", PREFIX + "a" * (4097 - len(PREFIX)))):
            probe(name, lambda: evidence_path(PREFIX + "run-a.json"), lambda: evidence_path(bad),
                  "invalid-path", repr(PREFIX + "run-a.json"), repr(bad))
        for name, character in (("backslash", "\\"), ("nul", "\x00"), ("lf", "\n"), ("cr", "\r"), ("tab", "\t")):
            bad = PREFIX + "a" + character + "b.json"
            probe("path-forbidden-" + name, lambda: evidence_path(PREFIX + "run-a.json"),
                  lambda: evidence_path(bad), "forbidden-path", repr(PREFIX + "run-a.json"), repr(bad))
            cases[-1]["input_bytes_sha256"] = {"old": digest((PREFIX + "run-a.json").encode()), "new": digest(bad.encode())}
        for name, bad in (("duplicate-separator", PREFIX + "nested//proof.json"),
                          ("dot-component", PREFIX + "./proof.json"),
                          ("parent-component", PREFIX + "../proof.json"),
                          ("trailing-separator", PREFIX + "nested/")):
            probe("path-canonical-" + name, lambda: evidence_path(PREFIX + "run-a.json"),
                  lambda: evidence_path(bad), "noncanonical-path", repr(PREFIX + "run-a.json"), repr(bad))
        for name, body in (("maximum-path", PREFIX + "a" * (4096 - len(PREFIX))),
                           ("maximum-family", "a" * 1024)):
            if name == "maximum-path":
                observed = evidence_path(body); expected = body
            else:
                rows = lines((home / "INDEX.jsonl").read_bytes()); candidate = {**rows[0], "family": body}
                observed = validate_locator(root, candidate, tree(root, checkpoint)); expected = None
            cases.append({"predicate": name + "-accepted", "pass": observed == expected,
                          "old": "ordinary valid value", "new": body, "expected": expected,
                          "fixture_commit": checkpoint})
        probe("path-prefix-without-body", lambda: evidence_path(PREFIX + "run-a.json"),
              lambda: evidence_path(PREFIX), "noncanonical-path", repr(PREFIX + "run-a.json"), repr(PREFIX))
        # The final prefix-length guard is dominated by canonicalization:
        # PREFIX ends in '/', which PurePosixPath removes. Isolate only that
        # dominating guard in a compiled copy; production refusal stays intact.
        import ast
        module = ast.parse(Path(__file__).read_text())
        path_function = next(n for n in module.body if isinstance(n, ast.FunctionDef) and n.name == "evidence_path")
        canonical = next(n for n in ast.walk(path_function) if isinstance(n, ast.Call)
                         and isinstance(n.func, ast.Name) and n.func.id == "demand"
                         and isinstance(n.args[1], ast.Constant) and n.args[1].value == "noncanonical-path")
        old_fragment = ast.get_source_segment(Path(__file__).read_text(), canonical)
        canonical.args[0] = ast.Constant(value=True)
        isolated = ast.fix_missing_locations(ast.Module(body=[path_function], type_ignores=[]))
        namespace = dict(globals())
        exec(compile(isolated, __file__, "exec"), namespace)
        probe("dominated-prefix-length-guard-isolation", lambda: namespace["evidence_path"](PREFIX + "run-a.json"),
              lambda: namespace["evidence_path"](PREFIX), "forbidden-path",
              repr(PREFIX + "run-a.json"), repr(PREFIX))
        cases[-1]["source_mutation"] = {"old": old_fragment, "new": 'demand(True, "noncanonical-path")'}
        cases[-1]["scope"] = "isolated dominated guard only; production prefix input still refuses at canonicalization"
        blob_oid = git(root, "rev-parse", source_commit + ":" + PREFIX + "run-a.json").decode().strip()
        probe("object-is-commit-not-blob", lambda: tree(root, source_commit), lambda: tree(root, blob_oid),
              "not-a-commit", source_commit, blob_oid)
        entries = {PREFIX + "run-a.json": ("100644", "blob", blob_oid)}
        probe("batch-process-failure", lambda: blobs(root, entries), lambda: blobs(Path(temp), entries),
              "missing-source-blob", "blobs(fixture_git_root, entries)", "blobs(non_git_temporary_parent, entries)")
        for name, entry, expected in (("missing", None, False), ("regular", ("100644", "blob", blob_oid), True),
                                      ("executable", ("100755", "blob", blob_oid), True),
                                      ("symlink", ("120000", "blob", blob_oid), False),
                                      ("nonblob-with-regular-mode", ("100644", "commit", source_commit), False)):
            cases.append({"predicate": "regular-entry-" + name, "pass": regular(entry) is expected,
                          "old": ["100644", "blob", blob_oid], "new": entry, "expected": expected,
                          "fixture_commit": checkpoint})
        # A three-field non-blob response is isolated at the batch helper's
        # explicit entry boundary; the source-tree reader filters such entries.
        probe("batch-nonblob-header", lambda: blobs(root, entries),
              lambda: blobs(root, {PREFIX + "run-a.json": ("100644", "blob", source_commit)}),
              "missing-source-blob", repr(entries), repr({PREFIX + "run-a.json": ("100644", "blob", source_commit)}))
        cases[-1]["scope"] = "batch-helper input boundary; inconsistent metadata cannot come from the filtered source tree"
        def malformed_batch_header():
            original_process = globals()["git_process"]
            def response(repo, *args, **kwargs):
                if args == ("cat-file", "--batch"):
                    return subprocess.CompletedProcess(["owned synthetic batch response"], 0,
                                                       (blob_oid + " blob 0 extra\n\n").encode(), b"")
                return original_process(repo, *args, **kwargs)
            globals()["git_process"] = response
            try:
                blobs(root, entries)
            finally:
                globals()["git_process"] = original_process
        probe("batch-header-cardinality", lambda: blobs(root, entries), malformed_batch_header,
              "missing-source-blob", "OID blob SIZE + LF + body", "OID blob 0 extra + LF + LF")
        cases[-1]["scope"] = "isolated Git-output protocol corruption; not a reachable well-formed Git response"
        # Even a weakened guard must remain inside the outer owned fixture.
        for name, bad in (("source-absolute-path", str(Path(temp) / "absolute-census-input.json")),
                          ("source-parent-path", "../" + Path(temp).name + "/parent-census-input.json")):
            probe(name, lambda: make_census({PREFIX + "safe.json": b'{}'}),
                  lambda: make_census({bad: b'{}'}), "invalid-source-path",
                  repr({PREFIX + "safe.json": b'{}'}), repr({bad: b'{}'}))
        probe("synthetic-index-process-failure", lambda: make_census({PREFIX + "safe.json": b'{}'}),
              lambda: make_census({".git/index": b'bad-index'}), "synthetic-index-unavailable",
              repr({PREFIX + "safe.json": b'{}'}), repr({".git/index": b'bad-index'}))
        probe("plan-output-home", lambda: prepare(root, source_commit, home),
              lambda: prepare(root, source_commit, root / "arbitrary-output"),
              "generated-output-must-use-retention-home-or-external-directory",
              "root / HOME", "root / 'arbitrary-output'")
        external = Path(temp) / "external-output"
        probe("plan-external-output-control", lambda: prepare(root, source_commit, external),
              lambda: prepare(root, source_commit, root / "arbitrary-output"),
              "generated-output-must-use-retention-home-or-external-directory",
              "temporary_parent / 'external-output'", "root / 'arbitrary-output'")
        out_link = Path(temp) / "output-link"; out_link.symlink_to(external, target_is_directory=True)
        probe("plan-output-directory-symlink", lambda: prepare(root, source_commit, external),
              lambda: prepare(root, source_commit, out_link), "output-artifact-symlink",
              "regular external-output directory", "output-link -> external-output")
        for artifact in ("SOURCE.json", "CENSUS.jsonl", "PLAN.jsonl", "INDEX.jsonl"):
            target = external / artifact; saved = target.read_bytes()
            replacement = Path(temp) / (artifact + ".copy"); replacement.write_bytes(saved)
            def bad_output():
                target.unlink(); target.symlink_to(replacement)
                try:
                    prepare(root, source_commit, external)
                finally:
                    target.unlink(); target.write_bytes(saved)
            probe("plan-output-symlink-" + artifact, lambda: prepare(root, source_commit, external),
                  bad_output, "output-artifact-symlink", "regular " + artifact,
                  artifact + " -> external identical-byte copy")
        witness = Path(temp) / "witness.jsonl"
        probe("full-witness-output-boundary", lambda: prepare(root, source_commit, external, witness),
              lambda: prepare(root, source_commit, external, root / "witness.jsonl"),
              "full-witness-output-must-be-external", "temporary_parent / 'witness.jsonl'", "root / 'witness.jsonl'")
        for value in ([], {"source_commit": "0" * 40}):
            def invalid_prior():
                target = external / "SOURCE.json"; saved = target.read_bytes()
                target.write_bytes(encoded(value))
                try:
                    prepare(root, source_commit, external)
                finally:
                    target.write_bytes(saved)
            probe("prior-source-" + ("type" if isinstance(value, list) else "identity"),
                  lambda: prepare(root, source_commit, external), invalid_prior,
                  "different-source-retires-plan-use-a-new-output-directory", "original SOURCE.json", repr(value))
        probe("external-retention-inputs", lambda: check(root, home), lambda: check(root, external),
              "retention-input-not-regular-local-file", "root / HOME", "owned external directory with identical inputs")
        def omitted_census_row():
            original_build = census.build
            def omit_last(census_root):
                generated, metadata = original_build(census_root)
                return "\n".join(generated.splitlines()[:-1]) + "\n", metadata
            census.build = omit_last
            try:
                prepare(root, source_commit, external)
            finally:
                census.build = original_build
        probe("census-omission-fault", lambda: prepare(root, source_commit, external), omitted_census_row,
              "independent-population-mismatch", "census.build(root)[0]",
              repr("\n") + ".join(census.build(root)[0].splitlines()[:-1]) + " + repr("\n"))
        # The extended witness/classification branches also protect retention.
        # Independently stated literal expectations pin each lexical witness;
        # the unchanged census differential remains a separate control.
        target = PREFIX + "nested/proof.json"
        base_files = {target: b'{"subject":"owned fixture"}\n'}
        base_rows = lines(make_census(base_files))
        base_plan = make_plan(source_commit, base_rows, base_files)
        for name, citer, text, form, category in (
                ("full-path", "scripts/consumer.py", target, "path-basename-or-stem", "R1"),
                ("basename", "scripts/consumer.py", "proof.json", "path-basename-or-stem", "R1"),
                ("stem", "scripts/consumer.py", "proof", "path-basename-or-stem", "R1"),
                ("wrapped-path", "scripts/consumer.py", "`docs/evidence/\n nested/proof.json`", "path-basename-or-stem", "R1"),
                ("directory", "scripts/consumer.py", "docs/evidence/nested/", "directory", "R1"),
                ("digest", "scripts/consumer.py", digest(base_files[target]), "digest", "R1"),
                ("glob", "docs/reviews/fixture-RAW.md", "docs/evidence/nested/*.json", "conservative-glob", "R1"),
                ("governed", ".syzygy/fixture.md", target, "path-basename-or-stem", "R1"),
                ("navigation-hold", "docs/navigation.md", target, "path-basename-or-stem", "hold")):
            changed = {**base_files, citer: text.encode()}
            observed = make_plan(source_commit, base_rows, changed)[0]
            found = protection_witnesses(changed, base_rows)[target]
            cases.append({"predicate": "protection-witness-" + name,
                          "pass": observed["classification"] == category and any(w["form"] == form for w in found),
                          "old": {"citer": None, "classification": "hold"},
                          "new": {"citer": citer, "body": text, "expected_classification": category, "expected_form": form},
                          "observed": observed, "fixture_commit": checkpoint,
                          "control_pass": base_plan[0]["classification"] == "hold",
                          "restored_pass": make_plan(source_commit, base_rows, base_files) == base_plan})
        raw_target = PREFIX + "fixture-RAW.md"
        # Witness exclusions and both wildcard forms are separate decisions;
        # another witness on the same row cannot stand in for the tested form.
        for name, citer, text, expected_form in (
                ("question-glob", "scripts/consumer.py", "docs/evidence/nested/proof.?son", "conservative-glob"),
                ("unscoped-glob", "scripts/consumer.py", "*/proof.json", None),
                ("bracket-without-wildcard", "scripts/consumer.py", "docs/evidence/nested/proof[.]json", None),
                ("administrative-exclusion", HOME + "INDEX.jsonl", target, None),
                ("administrative-source-exclusion", HOME + "SOURCE.json", target, None),
                ("administrative-census-exclusion", HOME + "CENSUS.jsonl", target, None),
                ("administrative-plan-exclusion", HOME + "PLAN.jsonl", target, None),
                ("snapshot-exclusion", "docs/retention/SNAPSHOT.jsonl",
                 '{"path":"' + target + '","sha256":null,"family":"proof","subject":null,"commit":null,"verdict":null,"reliance":"none"}', None),
                ("self-path-exclusion", target, target, None),
                ("self-glob-exclusion", target, "docs/evidence/nested/*.json", None),
                ("same-directory-exclusion", PREFIX + "nested/citer.md", "docs/evidence/nested/", None)):
            changed = {**base_files, citer: text.encode()}
            found = protection_witnesses(changed, base_rows)[target]
            forms = {w["form"] for w in found}
            # These fixtures pin the intended form, independently of token
            # witnesses the unchanged census recognizer may also discover.
            watched = "path-basename-or-stem" if name.startswith("administrative-") or name in ("snapshot-exclusion", "self-path-exclusion") else (
                "directory" if name == "same-directory-exclusion" else "conservative-glob")
            cases.append({"predicate": "witness-" + name, "pass": (watched in forms) is (expected_form is not None),
                          "old": base_files, "new": {"citer": citer, "text": text},
                          "expected": {"form": watched, "present": expected_form is not None},
                          "observed": found, "fixture_commit": checkpoint})
            # Receipt rows must remain JSON data, including fixture bytes.
            cases[-1]["old"] = {p: b.decode() for p, b in base_files.items()}
        empty_files = {target: b"", "scripts/consumer.py": census.EMPTY_SHA256.encode()}
        empty_rows = lines(make_census(empty_files))
        empty_witnesses = protection_witnesses(empty_files, empty_rows)[target]
        cases.append({"predicate": "empty-digest-is-not-witness", "pass": not any(w["form"] == "digest" for w in empty_witnesses),
                      "old": "nonempty evidence body", "new": {"body": "", "citer": census.EMPTY_SHA256},
                      "expected": "no digest witness", "observed": empty_witnesses, "fixture_commit": checkpoint})
        # Isolate the helper's self-digest exclusion with inconsistent census
        # metadata. This is not a reachable measured-source/fixed-point proof.
        artificial_sha = "f" * 64
        self_rows = [{**base_rows[0], "sha256": artificial_sha}]
        self_found = protection_witnesses({target: artificial_sha.encode()}, self_rows)[target]
        cases.append({"predicate": "isolated-self-digest-exclusion", "pass": not any(w["form"] == "digest" for w in self_found),
                      "old": base_rows[0], "new": {"row": self_rows[0], "body": artificial_sha},
                      "expected": "no self digest witness", "observed": self_found, "fixture_commit": checkpoint,
                      "scope": "inconsistent census helper isolation only; authentic self-digest source reachability unproved"})
        administrative_files = {PREFIX + "owned.json": b'{}', HOME + "INDEX.jsonl": b'one',
                                HOME + "SOURCE.json": b'one', HOME + "CENSUS.jsonl": b'one', HOME + "PLAN.jsonl": b'one'}
        changed_administration = {p: b'two' if p.startswith("docs/retention/") else body for p, body in administrative_files.items()}
        expected_tree_digest = "eb448c637c251f4dc6a1667a916d6ce38d046959d110305fa17fc23da69d7ddc"
        cases.append({"predicate": "administrative-bytes-excluded-from-source-identity",
                      "pass": source_tree_digest(administrative_files) == source_tree_digest(changed_administration) == expected_tree_digest,
                      "old": {p: b.decode() for p, b in administrative_files.items()},
                      "new": {p: b.decode() for p, b in changed_administration.items()},
                      "expected": expected_tree_digest, "fixture_commit": checkpoint})
        for name, changed_row, expected in (
                ("raw-lock", {**base_rows[0], "path": raw_target}, "R0"),
                ("act-bound", {**base_rows[0], "reliance": "act-bound"}, "R0"),
                ("census-code", {**base_rows[0], "reliance": "code-reference"}, "R1"),
                ("census-governed", {**base_rows[0], "reliance": "governed-citer"}, "R1"),
                ("census-raw", {**base_rows[0], "reliance": "raw-review-citer"}, "R1"),
                ("census-digest", {**base_rows[0], "reliance": "digest-cited"}, "R1")):
            changed_files = {changed_row["path"]: base_files[target]}
            observed = make_plan(source_commit, [changed_row], changed_files)[0]
            cases.append({"predicate": "plan-classification-" + name, "pass": observed["classification"] == expected,
                          "old": base_rows[0], "new": changed_row, "expected": expected, "observed": observed,
                          "fixture_commit": checkpoint, "control_pass": base_plan[0]["classification"] == "hold",
                          "restored_pass": make_plan(source_commit, base_rows, base_files) == base_plan})
        restore(); new_live()
        cases.append({"predicate": "conservative-live-extension", "pass": check(root, home)["live"] == 4,
                      "old": "three live source bodies", "new": "one new indexed held body",
                      "fixture_commit": git(root, "rev-parse", "HEAD").decode().strip()})
        restore()
        prepare(root, source_commit, home)
        try:
            prepare(root, checkpoint, home); reason = "unexpected-pass"
        except Refusal as exc:
            reason = str(exc)
        cases.append({"predicate": "concurrent-different-source-refused", "pass": "different-source-retires-plan" in reason,
                      "old": source_commit, "new": checkpoint, "refusal": reason, "fixture_commit": checkpoint,
                      "control_pass": True, "restored_pass": prepare(root, source_commit, home)["source_commit"] == source_commit})
        restore()
        # Archive object checks are exercised without granting a move. A real
        # tag is created only in this disposable, synthetic repository.
        git(root, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
            "tag", "-a", "evidence-archive/2026-01", source_commit, "-m", "synthetic archive")
        row = {"version": 1, "kind": "archive", "path": PREFIX + "run-b.json", "sha256": digest((root / (PREFIX + "run-b.json")).read_bytes()),
               "family": "synthetic", "basis": "R2", "commit": source_commit, "tag": "evidence-archive/2026-01"}
        valid = verify_archive_objects(root, row)
        cases.append({"predicate": "valid-archive-object-retrieval", "pass": valid["commit"] == source_commit,
                      "fixture_commit": checkpoint, "old": row, "new": valid})
        for name, changes, expected in (
                ("archive-tag-type", {"tag": None}, "invalid-archive-tag"),
                ("archive-tag-namespace", {"tag": "other/2026-01"}, "invalid-archive-tag"),
                ("archive-tag-month", {"tag": "evidence-archive/2026-13"}, "invalid-archive-tag"),
                ("archive-tag-zero-month", {"tag": "evidence-archive/2026-00"}, "invalid-archive-tag"),
                ("archive-tag-short-month", {"tag": "evidence-archive/2026-1"}, "invalid-archive-tag"),
                ("archive-tag-short-year", {"tag": "evidence-archive/026-01"}, "invalid-archive-tag"),
                ("archive-tag-suffix", {"tag": "evidence-archive/2026-01\n"}, "invalid-archive-tag"),
                ("archive-tag-ninth-month-valid-shape", {"tag": "evidence-archive/2026-09"}, "git-object-or-history-unavailable"),
                ("archive-tag-tenth-month-valid-shape", {"tag": "evidence-archive/2026-10"}, "git-object-or-history-unavailable"),
                ("archive-tag-last-month-valid-shape", {"tag": "evidence-archive/2026-12"}, "git-object-or-history-unavailable"),
                ("archive-full-commit", {"commit": source_commit[:7]}, "full-containing-commit-required"),
                ("archive-commit-uppercase", {"commit": "A" * 40}, "full-containing-commit-required"),
                ("archive-commit-nonhex", {"commit": "g" * 40}, "full-containing-commit-required"),
                ("archive-absent-commit", {"commit": "0" * 40}, "git-object-or-history-unavailable"),
                ("archive-digest", {"sha256": "0" * 64}, "archive-digest-mismatch"),
                ("archive-nonblob", {"path": PREFIX.rstrip("/")}, "forbidden-path"),
                ("archive-missing-path", {"path": PREFIX + "missing.json"}, "archive-path-not-regular-blob"),
                ("archive-missing-tag", {"tag": "evidence-archive/2026-02"}, "git-object-or-history-unavailable"),
                ("archive-R0-forbidden", {"basis": "R0"}, "forbidden-R0-R1-or-hold-move"),
                ("archive-R1-forbidden", {"basis": "R1"}, "forbidden-R0-R1-or-hold-move"),
                ("archive-held-forbidden", {"basis": "hold"}, "forbidden-R0-R1-or-hold-move")):
            changed = {**row, **changes}
            control = verify_archive_objects(root, row) == valid
            try:
                verify_archive_objects(root, changed); reason = "unexpected-pass"
            except Refusal as exc:
                reason = str(exc)
            cases.append({"predicate": name, "pass": control and expected in reason, "refusal": reason,
                          "old": row, "new": changed, "fixture_commit": checkpoint,
                          "control_pass": control, "restored_pass": verify_archive_objects(root, row) == valid})
        git(root, "tag", "evidence-archive/2026-03", source_commit)
        for name, tag, expected in (("lightweight-tag", "evidence-archive/2026-03", "archive-tag-not-annotated"),):
            changed = {**row, "tag": tag}
            control = verify_archive_objects(root, row) == valid
            try:
                verify_archive_objects(root, changed); reason = "unexpected-pass"
            except Refusal as exc:
                reason = str(exc)
            cases.append({"predicate": name, "pass": expected in reason, "refusal": reason,
                          "old": row, "new": changed, "fixture_commit": checkpoint,
                          "control_pass": control, "restored_pass": verify_archive_objects(root, row) == valid})
        # A sibling commit contains the same bytes but the annotated tag cannot
        # reach it. A body digest alone never establishes containment/reachability.
        write("sibling.txt", "synthetic sibling\n"); sibling = commit()
        changed = {**row, "commit": sibling}
        control = verify_archive_objects(root, row) == valid
        try:
            verify_archive_objects(root, changed); reason = "unexpected-pass"
        except Refusal as exc:
            reason = str(exc)
        cases.append({"predicate": "unreachable-pinned-commit", "pass": "archive-commit-unreachable-from-tag" in reason,
                      "refusal": reason, "old": row, "new": changed, "fixture_commit": sibling,
                      "control_pass": control, "restored_pass": verify_archive_objects(root, row) == valid})
        live_row = {k: v for k, v in row.items() if k in LIVE_KEYS}; live_row.update(kind="live", basis="R1")
        validate_locator(root, live_row, tree(root, sibling))
        try:
            validate_locator(root, row, tree(root, sibling)); reason = "unexpected-pass"
        except Refusal as exc:
            reason = str(exc)
        cases.append({"predicate": "origin-protection-and-family-gate", "pass": "additive-only" in reason,
                      "refusal": reason, "old": live_row, "new": row, "fixture_commit": sibling,
                      "control_pass": True, "restored_pass": validate_locator(root, live_row, tree(root, sibling)) is None})
        shallow = Path(temp) / "shallow"
        git(Path(temp), "clone", "--quiet", "--depth=1", root.as_uri(), str(shallow))
        control = check(root, home)["live"] == 3
        try:
            check(shallow, shallow / HOME); reason = "unexpected-pass"
        except Refusal as exc:
            reason = str(exc)
        cases.append({"predicate": "shallow-history", "pass": reason == "shallow-history", "refusal": reason,
                      "old": "full-history", "new": "depth=1", "fixture_commit": sibling,
                      "control_pass": control, "restored_pass": check(root, home)["live"] == 3})
        probe("plan-shallow-history", lambda: prepare(root, source_commit, home),
              lambda: prepare(shallow, source_commit, shallow / HOME), "shallow-history",
              "full-history fixture root", "owned depth=1 fixture clone")
        # Inherited repository/configuration bindings cannot redirect a read.
        for name, overrides, args, expected in (
                ("directory", {"GIT_DIR": str(Path(temp) / "not-a-repository")}, ("rev-parse", "HEAD"), sibling),
                ("worktree", {"GIT_WORK_TREE": str(Path(temp))}, ("rev-parse", "--show-toplevel"), str(root)),
                ("index", {"GIT_INDEX_FILE": str(Path(temp) / "absent-index")},
                 ("ls-files", "--error-unmatch", PREFIX + "run-a.json"), PREFIX + "run-a.json"),
                ("config", {"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "core.bare", "GIT_CONFIG_VALUE_0": "true"},
                 ("rev-parse", "--show-toplevel"), str(root))):
            prior = {key: os.environ.get(key) for key in overrides}
            try:
                os.environ.update(overrides); observed = git(root, *args).decode().strip()
            finally:
                for key, value in prior.items():
                    if value is None:
                        os.environ.pop(key, None)
                    else:
                        os.environ[key] = value
            cases.append({"predicate": "inherited-git-" + name + "-ignored", "pass": observed == expected,
                          "old": "no injected binding", "new": overrides, "expected": expected,
                          "observed": observed, "fixture_commit": sibling})
        import shutil
        import shlex
        real_git = shutil.which("git"); assert real_git is not None
        shim_dir = Path(temp) / "unsupported-git"; shim_dir.mkdir()
        shim = shim_dir / "git"
        shim.write_text('#!/bin/sh\nif [ "$1" = "--no-lazy-fetch" ]; then exit 129; fi\nexec '
                        + shlex.quote(real_git) + ' "$@"\n')
        shim.chmod(0o755)
        def unsupported_option():
            prior = os.environ["PATH"]; os.environ["PATH"] = str(shim_dir) + os.pathsep + prior
            try:
                git(root, "rev-parse", "HEAD")
            finally:
                os.environ["PATH"] = prior
        probe("unsupported-no-lazy-fetch-option-fails-closed", lambda: git(root, "rev-parse", "HEAD"),
              unsupported_option, "git-object-or-history-unavailable: rev-parse",
              "supported Git reads owned HEAD", "owned Git shim returns 129 for --no-lazy-fetch; no fallback")
        # A real promisor clone is required: a missing object in an ordinary
        # repo cannot demonstrate that Git's implicit fetch was prevented.
        origin = Path(temp) / "promisor-origin"; origin.mkdir(); git(origin, "init", "-q")
        body = b"synthetic missing promisor body\n"
        (origin / "body.txt").write_bytes(body); git(origin, "add", "body.txt")
        git(origin, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
            "commit", "-qm", "synthetic promisor control")
        git(origin, "config", "uploadpack.allowFilter", "true")
        promisor_commit = git(origin, "rev-parse", "HEAD").decode().strip()
        oid = git(origin, "rev-parse", "HEAD:body.txt").decode().strip()
        def partial(name):
            repo = Path(temp) / name
            git(Path(temp), "clone", "--quiet", "--no-checkout", "--filter=blob:none", origin.as_uri(), str(repo))
            return repo
        def missing(repo):
            return [line for line in git(repo, "rev-list", "--objects", "--missing=print", "HEAD").decode().splitlines()
                    if line.startswith("?")]
        def guarded_read(repo, batch):
            before = missing(repo)
            try:
                if batch:
                    blobs(repo, {"body.txt": ("100644", "blob", oid)})
                else:
                    git(repo, "cat-file", "blob", oid)
                refused = False
            except Refusal:
                refused = True
            after = missing(repo)
            return {"refused": refused, "missing_before": before, "missing_after": after,
                    "pass": refused and before == after == ["?" + oid]}
        for batch in (False, True):
            label = "batch" if batch else "single"
            protected = guarded_read(partial("promisor-guarded-" + label), batch)
            mutant_repo = partial("promisor-mutant-" + label)
            mutant_before = missing(mutant_repo)
            # Positive mutation control intentionally omits both safeguards.
            # Its transport is restricted to the owned local-file fixture.
            command = ["git", "-c", "protocol.allow=never", "-c", "protocol.file.allow=always", "-C", str(mutant_repo), "cat-file"]
            command += ["--batch"] if batch else ["blob", oid]
            old = subprocess.run(command, input=(oid + "\n").encode() if batch else None, capture_output=True,
                                 env={k: v for k, v in os.environ.items() if not k.startswith("GIT_")})
            mutant_after = missing(mutant_repo)
            fetched = mutant_before == ["?" + oid] and old.returncode == 0 and body in old.stdout and mutant_after == []
            restored = guarded_read(partial("promisor-restored-" + label), batch)
            cases.append({"predicate": "promisor-no-lazy-fetch-" + label,
                          "pass": protected["pass"] and fetched and restored["pass"], "fixture_commit": promisor_commit,
                          "old": {"argv": command, "fragment": "no --no-lazy-fetch; inherited GIT_* removed", "missing_blob": oid},
                          "new": {"fragment": "git --no-lazy-fetch; GIT_NO_LAZY_FETCH=1", "missing_blob": oid},
                          "unsafe_mutant_materialized_blob": fetched, "guarded_refusal_kept_blob_missing": protected,
                          "restored_refusal_kept_blob_missing": restored,
                          "mutant_missing_before": mutant_before, "mutant_missing_after": mutant_after,
                          "scope": "owned local-file Git remote only; no network/provider/observed repository"})
    for case in cases:
        case["input_record_sha256"] = digest(encoded({"old": case["old"], "new": case["new"]}))
    report = {"implementation_commit": implementation_commit, "implementation_sha256": implementation_sha256,
              "cases": cases, "passed": sum(c["pass"] for c in cases), "total": len(cases),
              "scope": "synthetic repositories only; no real tags, moves, remotes or settings changed"}
    if receipt:
        receipt.parent.mkdir(parents=True, exist_ok=True); receipt.write_bytes(encoded(report))
    for case in cases:
        print(("ok  " if case["pass"] else "FAIL ") + case["predicate"])
    print(f"retention matrix: {report['passed']}/{report['total']} cases pass")
    return 0 if report["passed"] == report["total"] else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="mode", required=True)
    plan = sub.add_parser("plan"); plan.add_argument("--source", required=True); plan.add_argument("--out", required=True)
    plan.add_argument("--witness-out", help="optional full witness sweep; keep this large replay output outside the repository")
    verify = sub.add_parser("check"); verify.add_argument("--home", default=HOME)
    test = sub.add_parser("selftest"); test.add_argument("--receipt")
    args = parser.parse_args()
    try:
        root = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").decode().strip())
        if args.mode == "plan":
            print(json.dumps(prepare(root, args.source, Path(args.out), Path(args.witness_out) if args.witness_out else None), sort_keys=True))
        elif args.mode == "check":
            print(json.dumps(check(root, root / args.home), sort_keys=True))
        else:
            return selftest(root, Path(args.receipt) if args.receipt else None)
        return 0
    except (Refusal, OSError, KeyError, TypeError) as exc:
        print("REFUSED: " + str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
