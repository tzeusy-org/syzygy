#!/usr/bin/env python3
"""Read-only evidence retention preparation and Git-object locator verification.

GP-Q1 is recorded in OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.
This tool never moves a body, creates a tag, fetches an object, or changes origin.
`plan --source FULL_COMMIT --out DIRECTORY` freezes the existing on-demand
census and a conservative keep/hold plan. `check` verifies the committed
locator representation. `selftest` exercises the same checker in real temporary
Git repositories. Archive admission requires an explicit source-bound transaction;
the default plan remains additive and conservative.

The census's `commit` is record metadata. Only `source_commit` below is a
verified containing commit. Census citation classes are not reliance verdicts.
Unknown family equivalence, recency, preservation language, dynamic consumers
and reviewer replay inputs stay held. No absence predicate establishes R2.
"""
from __future__ import annotations

import argparse
import collections
import datetime
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
ADMIN = {HOME + n for n in ("INDEX.jsonl", "PLAN.jsonl", "SOURCE.json", "CENSUS.jsonl", "TRANSACTION.json",
                       "MOVE-TABLE.jsonl", "FAMILIES.jsonl", "ADJUDICATION.json")}
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



def selected(record: object, pointer: object) -> object:
    """Select data only; a pointer never becomes a filesystem path or code."""
    demand(isinstance(pointer, str) and pointer.startswith("/") and len(pointer) <= 1024,
           "invalid-family-selector")
    value = record
    for part in pointer[1:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        demand(isinstance(value, dict) and part in value, "family-selector-unavailable")
        value = value[part]
    return value


def capture_instant(value: object) -> datetime.datetime:
    demand(isinstance(value, str) and len(value) <= 64, "capture-instant-required")
    try:
        instant = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise Refusal("capture-instant-required") from exc
    demand(instant.tzinfo is not None and instant.utcoffset() is not None,
           "capture-timezone-required")
    return instant.astimezone(datetime.timezone.utc)


def protected_namespace(receipt: object, tag: str) -> None:
    """Validate the retained API readback, not a caller-supplied protection flag.

    The operator obtains and rechecks this readback on origin before removal.
    Offline CI establishes the receipt's exact restrictions and object pins;
    it cannot establish a remote service's current state.
    """
    demand(isinstance(receipt, dict) and set(receipt) == {"repository", "observed_at", "rulesets"},
           "invalid-protection-receipt")
    demand(receipt["repository"] == "tzeusy-org/syzygy", "wrong-protection-repository")
    demand(capture_instant(receipt["observed_at"]) <= datetime.datetime.now(datetime.timezone.utc),
           "future-protection-receipt")
    demand(isinstance(receipt["rulesets"], list) and 0 < len(receipt["rulesets"]) <= 100,
           "protection-rulesets-required")
    required = "refs/tags/evidence-archive/*"
    effective = []
    for rule in receipt["rulesets"]:
        demand(isinstance(rule, dict), "invalid-protection-ruleset")
        demand(type(rule.get("id")) is int and rule["id"] > 0 and
               rule.get("source") == receipt["repository"] and rule.get("source_type") == "Repository",
               "unbound-protection-ruleset-source")
        demand(isinstance(rule.get("conditions"), dict) and
               isinstance(rule["conditions"].get("ref_name"), dict) and
               isinstance(rule.get("rules"), list), "invalid-protection-rule-conditions")
        conditions = rule["conditions"]["ref_name"]
        if rule.get("target") != "tag" or rule.get("enforcement") != "active":
            continue
        if conditions.get("include") != [required] or conditions.get("exclude") != []:
            continue
        restrictions = {r.get("type") for r in rule.get("rules", []) if isinstance(r, dict)}
        if {"update", "deletion"} <= restrictions and rule.get("bypass_actors") == []:
            effective.append(rule)
    demand(bool(effective) and fnmatch.fnmatchcase("refs/tags/" + tag, required),
           "archive-namespace-not-protected-without-bypass")



# This one draft census is scoped by GP-Q7, not an adopted act or manifest.
# A reviewed discharge is per target and still proves its historical blob.
DRAFT_CENSUS = ".syzygy/governance/contracts/candidates/cc-sec-3-attended-session-amendment/IMPACT-SWEEP.json"
DRAFT_AUTHORITY = ".syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md"


def inventory_discharges(root: Path, files: dict[str, bytes], proposals: object) -> set[tuple[str, str]]:
    """Admit only reviewed non-operative rows of the identified GP-Q7 draft.

    This is no general candidate-directory exemption. Actual primary/raw/code
    dependencies remain protected. The exact primary source, census bytes,
    row, target and historical containing blob are checked independently.
    The primary owner-act reconciliation and fresh review remain operator gates.
    """
    demand(isinstance(proposals, list) and len(proposals) <= MAX_ROWS,
           "invalid-inventory-discharge-population")
    cleared = set()
    for item in proposals:
        demand(isinstance(item, dict) and set(item) == {"citer", "sha256", "targets", "reason", "authority"},
               "invalid-inventory-discharge-schema")
        demand(item["citer"] == DRAFT_CENSUS and DRAFT_CENSUS in files and
               digest(files[DRAFT_CENSUS]) == item["sha256"], "inventory-discharge-source-drift")
        authority = item["authority"]
        demand(isinstance(authority, dict) and set(authority) == {"path", "sha256", "clause"} and
               authority["path"] == DRAFT_AUTHORITY and authority["clause"] == "GP-Q7" and
               DRAFT_AUTHORITY in files and digest(files[DRAFT_AUTHORITY]) == authority["sha256"],
               "inventory-discharge-primary-binding-drift")
        demand(isinstance(item["reason"], str) and 20 <= len(item["reason"]) <= 4096,
               "inventory-discharge-reason-required")
        record = load_json(files[DRAFT_CENSUS])
        demand(isinstance(record, dict) and record.get("schema") == "cc-sec-3-draft-impact-sweep/1" and
               isinstance(record.get("subjectCommit"), str) and COMMIT.fullmatch(record["subjectCommit"]) is not None and
               isinstance(record.get("rows"), list), "inventory-discharge-not-identified-historical-census")
        targets = item["targets"]
        demand(isinstance(targets, list) and 0 < len(targets) <= MAX_ROWS, "inventory-discharge-targets-required")
        historical = tree(root, record["subjectCommit"])
        for target in targets:
            evidence_path(target)
            demand(target in files and (target, DRAFT_CENSUS) not in cleared,
                   "inventory-discharge-unknown-or-duplicate-target")
            rows = [row for row in record["rows"] if isinstance(row, dict) and row.get("path") == target]
            demand(len(rows) == 1 and rows[0].get("sha256") == digest(files[target]) and
                   rows[0].get("matches") == ["policyBasename"], "inventory-discharge-not-basename-only-row")
            demand(regular(historical.get(target)) and
                   digest(git(root, "cat-file", "blob", historical[target][2])) == rows[0]["sha256"],
                   "inventory-discharge-historical-object-mismatch")
            cleared.add((target, DRAFT_CENSUS))
    return cleared


def transaction_plan(root: Path, commit: str, rows: list[dict], files: dict[str, bytes],
                     plan: list[dict], transaction: object) -> list[dict]:
    """Compile explicitly adjudicated, source-bound families into the move plan.

    This is reviewed operator input under GP-Q1, never text interpreted from an
    evidence record. Every record selector is checked against frozen bytes.
    Unknown roles, dates without instants, sidecars and unreviewed witnesses
    cannot be admitted to an archive family.
    """
    demand(isinstance(transaction, dict) and set(transaction) in (
           {"version", "source_commit", "discharges", "families", "protection"},
           {"version", "source_commit", "discharges", "families", "protection", "inventory_discharges"}) and
           type(transaction["version"]) is int and transaction["version"] == 1,
           "invalid-transaction-schema")
    demand(transaction["source_commit"] == commit, "transaction-source-drift")
    demand(isinstance(transaction["discharges"], list) and isinstance(transaction["families"], list)
           and len(transaction["discharges"]) <= MAX_ROWS and len(transaction["families"]) <= MAX_ROWS,
           "invalid-transaction-population")
    discharges = set()
    for item in transaction["discharges"]:
        demand(isinstance(item, dict) and set(item) == {"citer", "sha256", "form", "token", "reason"},
               "invalid-witness-discharge")
        citer = item["citer"]
        demand(isinstance(citer, str) and citer in files and digest(files[citer]) == item["sha256"],
               "discharged-consumer-drift")
        demand(isinstance(item["reason"], str) and 20 <= len(item["reason"]) <= 4096,
               "witness-discharge-reason-required")
        demand(item["form"] == "conservative-glob" and isinstance(item["token"], str),
               "only-lexical-glob-false-positives-may-be-discharged")
        key = citer, item["form"], item["token"]
        demand(key not in discharges, "duplicate-witness-discharge")
        discharges.add(key)
    witnesses = protection_witnesses(files, rows)
    by_path = {r["path"]: r for r in plan}
    inventory_cleared = inventory_discharges(root, files, transaction.get("inventory_discharges", []))
    def protected_R0(path):
        return path.endswith("-RAW.md") or by_path[path]["classification"] == "R0" and any(
            w["kind"] == "governed" and w["form"] == "digest" and (path, w["citer"]) not in inventory_cleared
            for w in witnesses[path])
    admitted = set(); families = set()
    for family in transaction["families"]:
        demand(isinstance(family, dict) and set(family) ==
               {"id", "subject", "kind", "role", "selectors", "members"}, "invalid-adjudicated-family")
        identity = family["id"]
        demand(isinstance(identity, str) and 0 < len(identity) <= 1024 and identity not in families,
               "duplicate-or-invalid-adjudicated-family")
        families.add(identity)
        demand(all(isinstance(family[k], str) and 0 < len(family[k]) <= 4096
                   for k in ("subject", "kind", "role")), "explicit-family-subject-kind-role-required")
        selectors = family["selectors"]
        demand(isinstance(selectors, dict) and set(selectors) == {"subject", "kind", "role", "capture"},
               "invalid-family-selectors")
        members = family["members"]
        demand(isinstance(members, list) and 0 < len(members) <= MAX_ROWS, "family-members-required")
        captures = []
        for path in members:
            evidence_path(path)
            demand(path in by_path and path not in admitted and path.count("/") == 2 and path.endswith(".json"),
                   "unknown-duplicate-or-sidecar-family-member")
            old = by_path[path]
            demand(not protected_R0(path), "R0-family-reclassification-forbidden")
            residual = [w for w in witnesses[path] if
                        (w["kind"] in ("governed", "code", "raw") or w["form"] == "digest") and
                        (w["citer"], w["form"], w["token"]) not in discharges and
                        (path, w["citer"]) not in inventory_cleared]
            demand(not residual, "undischarged-R1-family-member")
            record = load_json(files[path])
            demand(all(selected(record, selectors[k]) == family[k] for k in ("subject", "kind", "role")),
                   "family-subject-kind-role-mismatch")
            captured = selected(record, selectors["capture"])
            captures.append((capture_instant(captured), path, captured))
            admitted.add(path)
        demand(len({t for t, _, _ in captures}) == len(captures), "incomparable-family-capture-instants")
        index_families = {by_path[path]["index_family"] for path in members}
        demand(len(index_families) == 1, "family-crosses-measured-index-group")
        for candidate, old in by_path.items():
            if candidate in members or old["index_family"] not in index_families:
                continue
            residual = [w for w in witnesses[candidate] if
                        (w["kind"] in ("governed", "code", "raw") or w["form"] == "digest") and
                        (w["citer"], w["form"], w["token"]) not in discharges and
                        (candidate, w["citer"]) not in inventory_cleared]
            if protected_R0(candidate) or residual:
                continue
            demand(candidate.count("/") == 2 and candidate.endswith(".json"),
                   "incomplete-or-ambiguous-family-domain")
            other = load_json(files[candidate])
            demand(not all(selected(other, selectors[k]) == family[k] for k in ("subject", "kind", "role")),
                   "incomplete-adjudicated-family")
        newest = max(captures)[1]
        for _, path, captured in captures:
            by_path[path] = {**by_path[path], "equivalence_family": identity, "classification": "R2",
                             "disposition": "keep" if path == newest else "archive",
                             "reason": "verified-newest-family-keeper" if path == newest else "verified-older-family-member",
                             "capture_instant": captured, "newest_keeper": newest}
    transaction_sha256 = digest(encoded(transaction))
    return [{**by_path[r["path"]], "transaction_sha256": transaction_sha256} for r in plan]

def prepare(root: Path, commit: str, out: Path, witness_out: Path | None = None,
            transaction_path: Path | None = None) -> dict:
    demand(git(root, "rev-parse", "--is-shallow-repository").strip() == b"false", "shallow-history")
    destination = out.resolve()
    demand(not destination.is_relative_to(root.resolve()) or destination == (root / HOME).resolve(),
           "generated-output-must-use-retention-home-or-external-directory")
    demand(not out.is_symlink() and not any((out / n).is_symlink() for n in
           ("SOURCE.json", "CENSUS.jsonl", "PLAN.jsonl", "INDEX.jsonl", "TRANSACTION.json")), "output-artifact-symlink")
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
    transaction = None
    if transaction_path is not None:
        demand(not transaction_path.is_symlink() and transaction_path.is_file(), "transaction-not-regular-local-file")
        transaction = load_json(transaction_path.read_bytes())
        plan = transaction_plan(root, commit, rows, files, plan, transaction)
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
              "family": r["equivalence_family"] if r["classification"] == "R2" else r["index_family"],
              "basis": r["classification"]} for r in plan]
    out.mkdir(parents=True, exist_ok=True)
    demand(transaction is not None or not (out / "TRANSACTION.json").exists(), "transaction-replay-requires-explicit-input")
    if transaction is not None:
        (out / "TRANSACTION.json").write_bytes(encoded(transaction))
    for name, data in (("CENSUS.jsonl", snapshot), ("PLAN.jsonl", plan_data),
                       ("SOURCE.json", encoded(source)), ("INDEX.jsonl", jsonl(index))):
        (out / name).write_bytes(data)
    return source



def adjudicate(root: Path, frozen: Path, witnesses_path: Path, out: Path, operations_path: Path | None = None) -> dict:
    """Render the whole frozen estate, including explicit held remainders.

    The result is an inferred review offering, not input to check() or a move
    command. Actual R2 admission still requires transaction_plan()'s source-
    bound selectors, complete comparable family and discharged consumers.
    """
    source = load_json((frozen / "SOURCE.json").read_bytes())
    original = source_files(root, source["source_commit"])
    snapshot = (frozen / "CENSUS.jsonl").read_bytes()
    frozen_plan = (frozen / "PLAN.jsonl").read_bytes()
    demand(digest(snapshot) == source["snapshot_sha256"] and digest(frozen_plan) == source["plan_sha256"]
           and source_tree_digest(original) == source["source_tree_sha256"], "adjudication-frozen-input-drift")
    rows = lines(snapshot); by_path = {r["path"]: r for r in rows}
    prior = {r["path"]: r for r in lines(frozen_plan)}
    grouped = collections.defaultdict(list)
    for row in rows:
        grouped[row["family"]].append(row["path"])
    witness_records = {}
    with witnesses_path.open("rb") as stream:
        for line in stream:
            row = load_json(line)
            p = row["path"]; found = row["witnesses"]
            demand(p in prior and p not in witness_records and
                   digest(jsonl(found)) == prior[p]["witnesses"]["sha256"] and
                   len(found) == prior[p]["witnesses"]["count"], "adjudication-witness-drift")
            witness_records[p] = found
    demand(set(witness_records) == set(by_path), "adjudication-witness-population-mismatch")
    operations = load_json(operations_path.read_bytes()) if operations_path else {}
    for target, claims in operations.items():
        for claim in claims:
            demand(target in by_path and claim["classification"] in ("R0", "R1") and
                   claim["consumer"] in original and digest(original[claim["consumer"]]) == claim["consumer_sha256"]
                   and isinstance(claim["operation"], str) and len(claim["operation"]) >= 20,
                   "operative-consumer-binding-drift")
    text_cache = {}
    def anchor(witness):
        citer = witness["citer"]
        if citer not in text_cache:
            text_cache[citer] = original[citer].decode("utf-8", "replace"), digest(original[citer])
        text, sha256 = text_cache[citer]
        offset = text.find(witness["token"])
        return {**witness, "citer_sha256": sha256,
                "token_first_line": text[:offset].count("\n") + 1 if offset >= 0 else None,
                "locator_form": "literal" if offset >= 0 else "wrapped-or-transformed-token"}
    table = []; ledger = []
    time_keys = ("capturedAt", "captured_at", "ranAt", "generatedAt", "recordedAt", "capturedAtUtc")
    for family, paths in sorted(grouped.items()):
        members = []
        for path in paths:
            body = original[path]
            try:
                record = json.loads(body)
            except (ValueError, UnicodeError):
                record = {}
            if not isinstance(record, dict):
                record = {}
            captures = []
            for key in time_keys:
                try:
                    instant = capture_instant(record.get(key))
                except Refusal:
                    continue
                captures.append({"selector": "/" + key, "literal": record[key], "utc": instant.isoformat()})
            found = witness_records[path]
            protected = [w for w in found if w["form"] == "digest" or
                         w["kind"] in ("governed", "code", "raw") and
                         (w["form"] != "conservative-glob" or
                          w["token"].startswith(PREFIX) and w["token"] not in
                          (PREFIX + "*", PREFIX + "**", PREFIX + "*.json"))]
            operative = operations.get(path, [])
            residual = [w for w in found if w["form"] != "conservative-glob" and w["kind"] != "listing"]
            if prior[path]["classification"] == "R2":
                classification, reason = "R2", prior[path]["reason"]
            elif path.endswith("-RAW.md") or any(c["classification"] == "R0" for c in operative):
                classification, reason = "R0", "verbatim-raw-preservation-or-identified-checker-input"
            elif operative:
                classification, reason = "R1", "identified-operative-consumer-or-parameter-evidence"
            elif protected or residual:
                classification, reason = "hold", "citation-present-actual-reliance-unknown-retain-in-place"
            elif path.count("/") > 2:
                classification, reason = "hold", "bundle-sidecar-or-replay-role-not-proven-independent"
            elif len(paths) > 1:
                classification, reason = "hold", "no-proven-same-role-comparable-capture-domain"
            else:
                classification, reason = "hold", "singleton-without-affirmative-consumer-discharge"
            metadata = {k: record[k] for k in ("subject", "subjects", "kind", "role", "record", "schema", "slice")
                        if k in record}
            item = {"path": path, "sha256": by_path[path]["sha256"], "source_commit": source["source_commit"],
                    "index_family": family, "family_role_identity": prior[path]["equivalence_family"] or family + "::" + path[len(PREFIX):],
                    "classification": classification, "disposition": prior[path]["disposition"] if classification == "R2" else
                    "hold" if classification == "hold" else "keep",
                    "reason": reason, "record_metadata": metadata, "capture_instants": captures,
                    "protected_witness_count": len(protected), "protected_witness_sha256": digest(jsonl(protected)),
                    "protected_witness_examples": [anchor(w) for w in protected[:5]], "operative_consumers": operative,
                    "reliance_epistemic": "Inferred" if operative else "Unknown",
                    "all_witness_sha256": prior[path]["witnesses"]["sha256"],
                    "record_named_commit": by_path[path]["commit"], "docs_navigation_repair": False}
            table.append(item); members.append(item)
        capture_population = [m for m in members if len(m["capture_instants"]) == 1]
        newest = max(capture_population, key=lambda m: m["capture_instants"][0]["utc"])["path"] if len(capture_population) == len(members) else None
        ledger.append({"index_family": family, "member_count": len(members),
                       "classification_counts": dict(sorted(collections.Counter(m["classification"] for m in members).items())),
                       "members": [m["path"] for m in members], "members_with_one_explicit_instant": len(capture_population),
                       "chronological_latest_candidate": newest,
                       "equivalence": "unproved" if len(members) > 1 else "singleton",
                       "role_adjudication": "identified consumers preserved; citation-only and incomparable roles remain Unknown/hold",
                       "archive_selection": [m["path"] for m in members if m["disposition"] == "archive"],
                       "adjudicated_subfamilies": sorted({prior[m["path"]]["equivalence_family"] for m in members
                                                         if m["classification"] == "R2"}),
                       "scope": "inferred offering; admitted R2 subfamilies are source-bound by the compiled transaction"})
    summary = {"version": 1, "epistemic": "Inferred", "source_commit": source["source_commit"],
               "source_tree_sha256": source["source_tree_sha256"], "evidence_files": len(table), "families": len(ledger),
               "classifications": dict(sorted(collections.Counter(r["classification"] for r in table).items())),
               "dispositions": dict(sorted(collections.Counter(r["disposition"] for r in table).items())),
               "selected_archives": sum(r["disposition"] == "archive" for r in table), "docs_navigation_repairs": 0,
               "scope": "complete population offering with named holds; not a claim of zero eligible archives",
               "table_sha256": digest(jsonl(table)), "families_sha256": digest(jsonl(ledger)),
               "witness_file_sha256": digest(witnesses_path.read_bytes())}
    destination = out.resolve()
    demand(not destination.is_relative_to(root.resolve()) or destination == (root / HOME).resolve(),
           "generated-output-must-use-retention-home-or-external-directory")
    demand(not out.is_symlink() and not any((out / name).is_symlink() for name in
           ("MOVE-TABLE.jsonl", "FAMILIES.jsonl", "ADJUDICATION.json")), "output-artifact-symlink")
    out.mkdir(parents=True, exist_ok=True)
    for name, data in (("MOVE-TABLE.jsonl", jsonl(table)), ("FAMILIES.jsonl", jsonl(ledger)), ("ADJUDICATION.json", encoded(summary))):
        (out / name).write_bytes(data)
    return summary

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


def validate_locator(root: Path, row: dict, current: dict, transaction: dict | None = None) -> None:
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
    # A structured frozen API receipt establishes the reviewed restrictions;
    # the operator must separately recheck their current state on origin.
    demand(transaction is not None, "origin-protection-and-reviewed-family-proof-required-additive-only")
    protected_namespace(transaction["protection"], row["tag"])


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
    transaction_path = home / "TRANSACTION.json"
    transaction = None
    if transaction_path.exists() or transaction_path.is_symlink():
        demand(not transaction_path.is_symlink() and transaction_path.is_file(), "transaction-not-regular-local-file")
        transaction = load_json(transaction_path.read_bytes())
        expected_plan = transaction_plan(root, source["source_commit"], census_rows, original, expected_plan, transaction)
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
        validate_locator(root, row, current, transaction)
        if row["kind"] == "live":
            demand(actual.get(p) == row["sha256"], "live-worktree-drift")
            live.add(p)
        else:
            archived.add(p)
        if p in plan_by_path:
            old = plan_by_path[p]
            demand(row["family"] == (old["equivalence_family"] if old["classification"] == "R2" else old["index_family"])
                   and row["basis"] == old["classification"], "plan-index-classification-drift")
            if row["kind"] == "archive":
                demand(old["disposition"] == "archive" and row["commit"] == source["source_commit"]
                       and row["sha256"] == old["sha256"], "archive-not-frozen-removal")
        else:
            demand(row["kind"] == "live" and row["basis"] == "hold", "new-body-requires-conservative-live-row")
            demand(row["family"] == census.family_of(p), "new-body-family-mismatch")
    demand(live == set(actual), "unindexed-current-evidence")
    if transaction is not None:
        for old in plan:
            if old["classification"] == "R2":
                demand(old["newest_keeper"] in live, "missing-newest-family-keeper")
            if old["disposition"] != "archive":
                demand(old["path"] in live, "forbidden-R0-R1-or-held-removal")
    demand(set(plan_by_path) <= live | archived, "missing-source-body-or-newest-keeper")
    if transaction is not None:
        expected_preserved = {p: digest(b) for p, b in original.items() if p not in ADMIN and p not in archived}
        current_preserved = {p: digest(b) for p, b in source_files(root, head).items() if p not in ADMIN and p not in archived}
        demand(expected_preserved == current_preserved, "transaction-source-or-consumer-drift")
    return {"head": head, "source_commit": source["source_commit"], "live": len(live), "archive": len(archived),
            "plan": dict(collections.Counter(r["classification"] for r in plan)), "phase": "verified-transaction" if transaction else "additive-only"}


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
        write("scripts/reader.py", "from pathlib import Path\nPath('docs/evidence/run-a.json').read_bytes()\n")
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
        complete_witnesses = protection_witnesses(source_files(root, source_commit), lines((home / "CENSUS.jsonl").read_bytes()))
        witness_input = Path(temp) / "witnesses.jsonl"
        witness_input.write_bytes(jsonl([{"path": p, "witnesses": w} for p, w in sorted(complete_witnesses.items())]))
        witness_bytes = witness_input.read_bytes()
        view_out = Path(temp) / "adjudicated"
        view = adjudicate(root, home, witness_input, view_out)
        cases.append({"predicate": "complete-adjudication-view-preserves-unknown-citations", "pass":
                      view["evidence_files"] == 3 and view["families"] == 3 and view["classifications"] == {"R0": 1, "hold": 2},
                      "old": "three measured source records", "new": view, "fixture_commit": checkpoint})
        expected_admin = ["docs/retention/ADJUDICATION.json", "docs/retention/CENSUS.jsonl",
            "docs/retention/FAMILIES.jsonl", "docs/retention/INDEX.jsonl", "docs/retention/MOVE-TABLE.jsonl",
            "docs/retention/PLAN.jsonl", "docs/retention/SOURCE.json", "docs/retention/TRANSACTION.json"]
        cases.append({"predicate": "finite-administrative-exclusion-domain", "pass": prepared["administrative_exclusions"] == expected_admin,
                      "old": "the eight literal retention artifacts", "new": prepared["administrative_exclusions"], "fixture_commit": checkpoint})
        def good_view():
            value = adjudicate(root, home, witness_input, view_out)
            demand(value["evidence_files"] == 3 and value["classifications"] == {"R0": 1, "hold": 2}, "adjudication-control-failed")
        def bad_frozen_view():
            saved = (home / "SOURCE.json").read_bytes()
            try:
                doc = load_json(saved); doc["plan_sha256"] = "0" * 64
                (home / "SOURCE.json").write_bytes(encoded(doc)); adjudicate(root, home, witness_input, view_out)
            finally:
                (home / "SOURCE.json").write_bytes(saved)
        probe("adjudication-frozen-binding", good_view, bad_frozen_view, "adjudication-frozen-input-drift",
              "SOURCE.plan_sha256 equals the frozen plan digest", "SOURCE.plan_sha256 = '0' * 64")
        def bad_witness_view(omit):
            try:
                ws = lines(witness_bytes)
                if omit:
                    ws.pop()
                else:
                    ws[0]["witnesses"].append({"citer": "unmeasured", "kind": "code", "form": "digest", "token": "x"})
                witness_input.write_bytes(jsonl(ws)); adjudicate(root, home, witness_input, view_out)
            finally:
                witness_input.write_bytes(witness_bytes)
        probe("adjudication-witness-integrity", good_view, lambda: bad_witness_view(False), "adjudication-witness-drift",
              "full source-bound witness records", "append an unmeasured witness")
        probe("adjudication-witness-complete-population", good_view, lambda: bad_witness_view(True), "adjudication-witness-population-mismatch",
              "one witness record per measured body", "omit the final witness record")
        probe("adjudication-output-boundary", good_view,
              lambda: adjudicate(root, home, witness_input, root / ".syzygy/output"),
              "generated-output-must-use-retention-home-or-external-directory", "owned external output", "governed-plane output")
        view_link = Path(temp) / "view-link"; view_link.symlink_to(view_out)
        probe("adjudication-output-symlink", good_view, lambda: adjudicate(root, home, witness_input, view_link),
              "output-artifact-symlink", "owned regular output directory", "owned symlink to that directory")
        ops_input = Path(temp) / "operations.json"
        operations = {PREFIX + "run-a.json": [{"classification": "R1", "consumer": "scripts/reader.py",
            "consumer_sha256": digest(source_files(root, source_commit)["scripts/reader.py"]),
            "operation": "Read the synthetic run-a body using pathlib.Path.read_bytes.", "anchors": [1, 2]}]}
        ops_input.write_bytes(encoded(operations))
        operative_view = adjudicate(root, home, witness_input, view_out, ops_input)
        cases.append({"predicate": "operative-consumer-bound-adjudication", "pass": operative_view["classifications"] == {"R0": 1, "R1": 1, "hold": 1},
                      "old": view, "new": operative_view, "fixture_commit": checkpoint})
        def bad_operations():
            changed = load_json(encoded(operations)); changed[PREFIX + "run-a.json"][0]["consumer_sha256"] = "0" * 64
            ops_input.write_bytes(encoded(changed))
            try:
                adjudicate(root, home, witness_input, view_out, ops_input)
            finally:
                ops_input.write_bytes(encoded(operations))
        probe("operative-consumer-source-binding", good_view, bad_operations, "operative-consumer-binding-drift",
              "consumer digest matches the measured source", "consumer digest = '0' * 64")
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
            if name == "nonblob-with-regular-mode":
                cases[-1]["scope"] = "regular-entry helper robustness; inconsistent mode/kind metadata is not a well-formed source-tree entry"
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
                ("evidence-relative-glob", "scripts/consumer.py", "nested/*.json", "conservative-glob", "R1"),
                ("basename-glob", "scripts/consumer.py", "proo*.json", "conservative-glob", "R1"),
                ("period-tail", "scripts/consumer.py", "docs/evidence/nested/proof.json.", "path-basename-or-stem", "R1"),
                ("prefixed-suffix", "scripts/consumer.py", "wrapper/nested/proof.json", "path-basename-or-stem", "R1"),
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
        # A valid filename ending in a period keeps both literal witness
        # tokens. The independent oracle pins the original-token member even
        # where period normalization and slash suffixes overlap on other paths.
        dot_target = PREFIX + "nested/proof.json."
        dot_files = {dot_target: b"terminal-dot fixture body\n"}
        dot_rows = lines(make_census(dot_files))
        dot_changed = {**dot_files, "scripts/dot-reader.py": dot_target.encode()}
        dot_found = protection_witnesses(dot_changed, dot_rows)[dot_target]
        dot_observed = [(w["kind"], w["form"], w["token"]) for w in dot_found]
        dot_expected = [("code", "path-basename-or-stem", "docs/evidence/nested/proof.json."),
                        ("code", "path-basename-or-stem", "proof.json.")]
        cases.append({"predicate": "protection-witness-literal-terminal-period-token",
                      "pass": dot_observed == dot_expected,
                      "old": {p: b.decode() for p, b in dot_files.items()},
                      "new": {"scripts/dot-reader.py": "docs/evidence/nested/proof.json."},
                      "expected": dot_expected, "observed": dot_observed, "fixture_commit": checkpoint,
                      "scope": "captured synthetic helper inputs, with a real owned census materialization"})
        raw_target = PREFIX + "fixture-RAW.md"
        # Witness exclusions and both wildcard forms are separate decisions;
        # another witness on the same row cannot stand in for the tested form.
        for name, citer, text, expected_form in (
                ("question-glob", "scripts/consumer.py", "docs/evidence/nested/proof.?son", "conservative-glob"),
                ("unscoped-glob", "scripts/consumer.py", "*/proof.json", None),
                ("unscoped-question-glob", "scripts/consumer.py", "?ocs*/proof.json", None),
                ("unscoped-bracket-glob", "scripts/consumer.py", "[d]ocs*/proof.json", None),
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
        # Each admitted citation class needs a coherent generated SOURCE,
        # rather than a fabricated label that a later equality check refuses.
        # The literals below follow the census's documented first-match rules;
        # expected counts/classifications never come from RELIANCE_CLASSES or
        # from the checker under test. Extra evidence citers are counted too.
        class_target = "docs/evidence/finite/proof.json"
        class_body = b'{"subject":"finite citation fixture"}\n'
        for label, citer, text, counts, category in (
                ("act-bound", ".syzygy/fixture.md", hashlib.sha256(class_body).hexdigest(), {"act-bound": 1}, "R0"),
                ("governed-citer", ".syzygy/fixture.md", class_target, {"governed-citer": 1}, "R1"),
                ("code-reference", "scripts/fixture.py", class_target, {"code-reference": 1}, "R1"),
                ("raw-review-citer", "docs/reviews/fixture-RAW.md", class_target, {"raw-review-citer": 1}, "R1"),
                ("docs-citer", "docs/navigation.md", class_target, {"docs-citer": 1}, "hold"),
                ("digest-cited", "docs/navigation.md", hashlib.sha256(class_body).hexdigest(), {"digest-cited": 1}, "R1"),
                ("evidence-only", "docs/evidence/citer.md", "See " + class_target,
                 {"evidence-only": 1, "none": 1}, "hold"),
                ("listed-only", "docs/evidence/paths.txt", class_target,
                 {"listed-only": 1, "none": 1}, "hold"),
                ("directory-named", "docs/navigation.md", "docs/evidence/finite/",
                 {"directory-named": 1}, "hold"),
                ("none", None, None, {"none": 1}, "hold")):
            class_root = Path(temp) / ("class-" + label); class_root.mkdir()
            git(class_root, "init", "-q")
            fixture = {class_target: class_body}
            if citer is not None:
                fixture[citer] = (text + "\n").encode()
            for path, body in fixture.items():
                destination = class_root / path
                destination.parent.mkdir(parents=True, exist_ok=True); destination.write_bytes(body)
            def class_commit():
                git(class_root, "add", "--all")
                git(class_root, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
                    "commit", "-qm", "synthetic citation class")
                return git(class_root, "rev-parse", "HEAD").decode().strip()
            class_source = class_commit(); class_home = class_root / "docs/retention"
            prepare(class_root, class_source, class_home); class_checkpoint = class_commit()
            artifacts = {name: (class_home / name).read_text() for name in
                         ("SOURCE.json", "CENSUS.jsonl", "PLAN.jsonl", "INDEX.jsonl")}
            class_case = {"predicate": "citation-class-positive-" + label, "pass": False,
                          "old": {path: body.decode() for path, body in fixture.items()}, "new": artifacts,
                          "expected": {"citation_classes": counts, "target_reliance": label,
                                       "target_classification": category, "live": sum(counts.values())},
                          "fixture_commit": class_checkpoint, "source_commit": class_source,
                          "scope": "coherent real Git source through prepare, committed outputs and check"}
            cases.append(class_case)
            try:
                class_result = check(class_root, class_home)
                class_rows = lines((class_home / "CENSUS.jsonl").read_bytes())
                class_plan = lines((class_home / "PLAN.jsonl").read_bytes())
                class_document = load_json((class_home / "SOURCE.json").read_bytes())
                class_case["pass"] = (class_document["citation_classes"] == counts
                    and next(r["reliance"] for r in class_rows if r["path"] == class_target) == label
                    and next(r["classification"] for r in class_plan if r["path"] == class_target) == category
                    and class_result["live"] == sum(counts.values()) and class_result["archive"] == 0)
                class_case["observed"] = class_result
            except Refusal as exc:
                class_case["refusal"] = str(exc)
            # Zero passes the count-shape guard but cannot equal a generated
            # Counter for a present class. Keep that later refusal distinct
            # from invalid-label/type/negative-count refusal cases above.
            document = load_json(artifacts["SOURCE.json"].encode())
            document["citation_classes"][label] = 0
            (class_home / "SOURCE.json").write_bytes(encoded(document))
            try:
                check(class_root, class_home); zero_reason = "unexpected-pass"
            except Refusal as exc:
                zero_reason = str(exc)
            finally:
                (class_home / "SOURCE.json").write_text(artifacts["SOURCE.json"])
            try:
                restored_class = check(class_root, class_home)["live"] == sum(counts.values())
            except Refusal:
                restored_class = False
            cases.append({"predicate": "citation-class-zero-" + label,
                          "pass": class_case["pass"] and restored_class and zero_reason == "source-population-count-mismatch",
                          "old": artifacts["SOURCE.json"], "new": encoded(document).decode(),
                          "expected_refusal": "source-population-count-mismatch", "refusal": zero_reason,
                          "fixture_commit": class_checkpoint, "source_commit": class_source,
                          "control_pass": class_case["pass"], "restored_pass": restored_class})
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
        # Query the injected key itself: core.bare does not change this
        # fixture's --show-toplevel output, so it cannot witness isolation.
        git(root, "config", "retention.fixture", "owned-baseline-value")
        for name, overrides, args, expected in (
                ("directory", {"GIT_DIR": str(Path(temp) / "not-a-repository")}, ("rev-parse", "HEAD"), sibling),
                ("worktree", {"GIT_WORK_TREE": str(Path(temp))}, ("rev-parse", "--show-toplevel"), str(root)),
                ("index", {"GIT_INDEX_FILE": str(Path(temp) / "absent-index")},
                 ("ls-files", "--error-unmatch", PREFIX + "run-a.json"), PREFIX + "run-a.json"),
                ("config", {"GIT_CONFIG_COUNT": "1", "GIT_CONFIG_KEY_0": "retention.fixture",
                            "GIT_CONFIG_VALUE_0": "owned-injected-value"},
                 ("config", "--get", "retention.fixture"), "owned-baseline-value")):
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
    # Exercise the final transaction through the same public check, with real
    # commits, a real annotated tag, actual removals and ordinary restoration.
    with tempfile.TemporaryDirectory(prefix="syzygy-retention-transaction-") as temp:
        outer = Path(temp); root = outer / "repo"; root.mkdir(); git(root, "init", "-q")
        home = root / HOME
        paths = [PREFIX + "capture-2026-01-01.json", PREFIX + "capture-2026-01-02.json"]
        for i, path in enumerate(paths):
            target = root / path; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded({"subject": "synthetic-subject", "kind": "measurement", "role": "baseline",
                                       "capturedAt": f"2026-01-0{i + 1}T00:00:00Z"}))
        def tx_commit():
            git(root, "add", "--force", "--all")
            git(root, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
                "commit", "-qm", "synthetic transaction fixture")
            return git(root, "rev-parse", "HEAD").decode().strip()
        body_commit = tx_commit()
        (root / "consumer.txt").write_text("The literal docs/** is an unrelated documentation example; this fixture reads no evidence paths.\n")
        containing = tx_commit()
        tag = "evidence-archive/2026-01"
        git(root, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
            "tag", "-a", tag, containing, "-m", "Synthetic protected archive")
        protection = {"repository": "tzeusy-org/syzygy", "observed_at": "2026-01-01T00:00:00Z", "rulesets": [
            {"id": 1, "source": "tzeusy-org/syzygy", "source_type": "Repository", "target": "tag", "enforcement": "active",
             "conditions": {"ref_name": {"include": ["refs/tags/evidence-archive/*"], "exclude": []}},
             "bypass_actors": [], "rules": [{"type": "update"}, {"type": "deletion"}]}]}
        family = {"id": "synthetic-measurement-baseline", "subject": "synthetic-subject", "kind": "measurement",
                  "role": "baseline", "members": paths,
                  "selectors": {"subject": "/subject", "kind": "/kind", "role": "/role", "capture": "/capturedAt"}}
        transaction = {"version": 1, "source_commit": containing, "discharges": [],
                       "families": [family], "protection": protection}
        transaction["discharges"] = [{"citer": "consumer.txt", "sha256": digest((root / "consumer.txt").read_bytes()),
            "form": "conservative-glob", "token": "docs/**",
            "reason": "The synthetic consumer text is a literal unrelated example, not an evidence reader."}]
        tx_input = outer / "transaction.json"; tx_input.write_bytes(encoded(transaction))
        prepare(root, containing, home, transaction_path=tx_input)
        tx_commit()
        additive = check(root, home)
        cases.append({"predicate": "valid-adjudicated-additive-live-family", "pass": additive["live"] == 2
                      and additive["archive"] == 0 and additive["plan"] == {"R2": 2},
                      "old": "two frozen records with literal equal subject/kind/role and distinct UTC captures",
                      "new": transaction, "fixture_commit": containing})
        tx_output = home / "TRANSACTION.json"
        saved_output = tx_output.read_bytes()
        external_output = outer / "identical-output-transaction.json"
        external_output.write_bytes(saved_output)
        control = check(root, home) == additive
        tx_output.unlink(); tx_output.symlink_to(external_output)
        try:
            prepare(root, containing, home, transaction_path=tx_input); output_reason = "unexpected-pass"
        except Refusal as exc:
            output_reason = str(exc)
        finally:
            tx_output.unlink(); tx_output.write_bytes(saved_output)
        cases.append({"predicate": "transaction-output-symlink-is-not-input-symlink", "pass": control
                      and output_reason == "output-artifact-symlink" and check(root, home) == additive,
                      "old": {"output": "regular TRANSACTION.json", "sha256": digest(saved_output)},
                      "new": {"output": "TRANSACTION.json -> owned external identical-byte copy",
                              "input": "separate regular transaction.json; complete valid family unchanged"},
                      "refusal": output_reason, "expected_refusal": "output-artifact-symlink",
                      "fixture_commit": containing})
        # This population cap is independent: distinct unused glob keys can
        # exceed it while the complete transaction still fits MAX_FILE and
        # every schema, source binding and actual family remains valid.
        oversized = load_json(encoded(transaction))
        oversized["discharges"] += [{**transaction["discharges"][0], "token": "unused-" + str(i),
                                      "reason": "Synthetic unused glob."} for i in range(100000)]
        oversized_bytes = encoded(oversized)
        original_files = source_files(root, containing); measured = lines(make_census(original_files))
        original_plan = make_plan(containing, measured, original_files)
        try:
            transaction_plan(root, containing, measured, original_files, original_plan, oversized); reason = "unexpected-pass"
        except Refusal as exc:
            reason = str(exc)
        restored = check(root, home) == additive
        cases.append({"predicate": "transaction-discharge-resource-population", "pass":
                      len(oversized["discharges"]) == 100001 and len(oversized_bytes) <= MAX_FILE
                      and reason == "invalid-transaction-population" and restored,
                      "old": transaction, "new": {"expression": "original discharge plus 100000 copies with token='unused-'+str(i), reason='Synthetic unused glob.'",
                      "range": [0, 100000], "population": 100001, "encoded_bytes": len(oversized_bytes), "sha256": digest(oversized_bytes)},
                      "refusal": reason, "expected_refusal": "invalid-transaction-population", "fixture_commit": containing,
                      "control_pass": True, "restored_pass": restored})
        del oversized, oversized_bytes
        for key in ("discharges", "families"):
            proposed = load_json(encoded(transaction)); proposed[key] = {}
            if key == "discharges": proposed["families"] = []
            try:
                transaction_plan(root, containing, measured, original_files, original_plan, proposed); reason = "unexpected-pass"
            except Refusal as exc:
                reason = str(exc)
            cases.append({"predicate": "transaction-empty-mapping-is-not-" + key, "pass": reason == "invalid-transaction-population",
                          "old": transaction, "new": proposed, "refusal": reason,
                          "expected_refusal": "invalid-transaction-population", "fixture_commit": containing})
        index = lines((home / "INDEX.jsonl").read_bytes())
        # Select the older member by its literal identity, independently of row order.
        for row in index:
            if row["path"] == paths[0]:
                row.update(kind="archive", commit=containing, tag=tag)
        (home / "INDEX.jsonl").write_bytes(jsonl(index)); (root / paths[0]).unlink()
        completed = tx_commit(); final = check(root, home)
        cases.append({"predicate": "valid-complete-archive-through-public-check", "pass": final["live"] == 1
                      and final["archive"] == 1 and final["phase"] == "verified-transaction",
                      "old": "both source bodies present", "new": {"archived": paths[0], "keeper": paths[1],
                      "containing_commit": containing, "tag": tag}, "fixture_commit": completed})
        def tx_restore():
            git(root, "reset", "--hard", completed); git(root, "clean", "-fdq")
        def tx_failure(name, mutate, expected):
            tx_restore(); control = check(root, home) == final
            old = {"transaction": (home / "TRANSACTION.json").read_text(),
                   "consumer.txt": (root / "consumer.txt").read_text(),
                   "INDEX.jsonl": (home / "INDEX.jsonl").read_text(),
                   "SOURCE.json": (home / "SOURCE.json").read_text(),
                   "PLAN.jsonl": (home / "PLAN.jsonl").read_text()}
            mutate()
            try:
                check(root, home); reason = "unexpected-pass"
            except (Refusal, OSError) as exc:
                reason = str(exc)
            new = {"transaction": (home / "TRANSACTION.json").read_text(),
                   "consumer.txt": (root / "consumer.txt").read_text(),
                   "INDEX.jsonl": (home / "INDEX.jsonl").read_text(),
                   "SOURCE.json": (home / "SOURCE.json").read_text(),
                   "PLAN.jsonl": (home / "PLAN.jsonl").read_text()}
            tx_restore(); restored = check(root, home) == final
            cases.append({"predicate": name, "pass": control and restored and reason == expected,
                          "old": old, "new": new, "refusal": reason, "expected_refusal": expected,
                          "control_pass": control, "restored_pass": restored, "fixture_commit": completed})
        def tx_change(change):
            doc = load_json((home / "TRANSACTION.json").read_bytes()); change(doc)
            (home / "TRANSACTION.json").write_bytes(encoded(doc))
            # Mutate the whole coherent proposed transaction so each semantic
            # boundary is reached. A separate case leaves this binding stale.
            proposed_plan = lines((home / "PLAN.jsonl").read_bytes())
            for row in proposed_plan:
                row["transaction_sha256"] = digest(encoded(doc))
            proposed_bytes = jsonl(proposed_plan)
            (home / "PLAN.jsonl").write_bytes(proposed_bytes)
            source = load_json((home / "SOURCE.json").read_bytes())
            source["plan_sha256"] = digest(proposed_bytes)
            (home / "SOURCE.json").write_bytes(encoded(source))
        variants = [
            ("transaction-version", lambda d: d.update(version=True), "invalid-transaction-schema"),
            ("transaction-version-integer", lambda d: d.update(version=2), "invalid-transaction-schema"),
            ("transaction-source", lambda d: d.update(source_commit="0" * 40), "transaction-source-drift"),
            ("transaction-discharges-type", lambda d: d.update(discharges=None), "invalid-transaction-population"),
            ("transaction-families-type", lambda d: d.update(families=None), "invalid-transaction-population"),
            ("discharge-schema", lambda d: d["discharges"][0].update(approved=True), "invalid-witness-discharge"),
            ("discharge-consumer-digest", lambda d: d["discharges"][0].update(sha256="0" * 64), "discharged-consumer-drift"),
            ("discharge-missing-consumer", lambda d: d["discharges"][0].update(citer="absent.txt"), "discharged-consumer-drift"),
            ("discharge-short-reason", lambda d: d["discharges"][0].update(reason="short"), "witness-discharge-reason-required"),
            ("discharge-long-reason", lambda d: d["discharges"][0].update(reason="r" * 4097), "witness-discharge-reason-required"),
            ("discharge-reason-type", lambda d: d["discharges"][0].update(reason=True), "witness-discharge-reason-required"),
            ("discharge-literal-edge", lambda d: d["discharges"][0].update(form="digest"), "only-lexical-glob-false-positives-may-be-discharged"),
            ("discharge-token-type", lambda d: d["discharges"][0].update(token=True), "only-lexical-glob-false-positives-may-be-discharged"),
            ("discharge-duplicate", lambda d: d["discharges"].append(dict(d["discharges"][0])), "duplicate-witness-discharge"),
            ("family-schema", lambda d: d["families"][0].update(approved=True), "invalid-adjudicated-family"),
            ("family-blank-id", lambda d: d["families"][0].update(id=""), "duplicate-or-invalid-adjudicated-family"),
            ("family-overlong-id", lambda d: d["families"][0].update(id="i" * 1025), "duplicate-or-invalid-adjudicated-family"),
            ("family-id-type", lambda d: d["families"][0].update(id=True), "duplicate-or-invalid-adjudicated-family"),
            ("family-subject-type", lambda d: d["families"][0].update(subject=True), "explicit-family-subject-kind-role-required"),
            ("family-kind-blank", lambda d: d["families"][0].update(kind=""), "explicit-family-subject-kind-role-required"),
            ("family-role-overlong", lambda d: d["families"][0].update(role="r" * 4097), "explicit-family-subject-kind-role-required"),
            ("family-selectors-schema", lambda d: d["families"][0]["selectors"].update(extra="/subject"), "invalid-family-selectors"),
            ("family-selectors-type", lambda d: d["families"][0].update(selectors=[]), "invalid-family-selectors"),
            ("family-members-empty", lambda d: d["families"][0].update(members=[]), "family-members-required"),
            ("family-members-type", lambda d: d["families"][0].update(members=True), "family-members-required"),
            ("family-members-mapping", lambda d: d["families"][0].update(members={p: True for p in paths}), "family-members-required"),
            ("family-selector-type", lambda d: d["families"][0]["selectors"].update(capture=True), "invalid-family-selector"),
            ("family-selector-relative", lambda d: d["families"][0]["selectors"].update(capture="capturedAt"), "invalid-family-selector"),
            ("family-selector-relative-resolves", lambda d: d["families"][0]["selectors"].update(capture="XcapturedAt"), "invalid-family-selector"),
            ("family-selector-overlong", lambda d: d["families"][0]["selectors"].update(capture="/" + "x" * 1024), "invalid-family-selector"),
            ("family-selector-through-scalar", lambda d: d["families"][0]["selectors"].update(capture="/subject/missing"), "family-selector-unavailable"),
            ("transaction-extra-field", lambda d: d.update(approved=True), "invalid-transaction-schema"),
            ("family-subject", lambda d: d["families"][0].update(subject="different"), "family-subject-kind-role-mismatch"),
            ("family-kind", lambda d: d["families"][0].update(kind="different"), "family-subject-kind-role-mismatch"),
            ("family-role", lambda d: d["families"][0].update(role="different"), "family-subject-kind-role-mismatch"),
            ("family-capture-selector", lambda d: d["families"][0]["selectors"].update(capture="/missing"), "family-selector-unavailable"),
            ("family-member-omitted", lambda d: d["families"][0].update(members=[paths[0]]), "incomplete-adjudicated-family"),
            ("family-member-duplicate", lambda d: d["families"][0]["members"].append(paths[0]), "unknown-duplicate-or-sidecar-family-member"),
            ("family-duplicate", lambda d: d["families"].append(d["families"][0]), "duplicate-or-invalid-adjudicated-family"),
            ("family-member-unknown", lambda d: d["families"][0]["members"].append(PREFIX + "absent.json"), "unknown-duplicate-or-sidecar-family-member"),
            ("protection-id-type", lambda d: d["protection"]["rulesets"][0].update(id=True), "unbound-protection-ruleset-source"),
            ("protection-id-nonpositive", lambda d: d["protection"]["rulesets"][0].update(id=0), "unbound-protection-ruleset-source"),
            ("protection-source", lambda d: d["protection"]["rulesets"][0].update(source="other/repository"), "unbound-protection-ruleset-source"),
            ("protection-source-type", lambda d: d["protection"]["rulesets"][0].update(source_type="Organization"), "unbound-protection-ruleset-source"),
            ("protection-wrong-repository", lambda d: d["protection"].update(repository="other/repository"), "wrong-protection-repository"),
            ("protection-flag-insufficient", lambda d: d.update(protection={"protected": True}), "invalid-protection-receipt"),
            ("protection-future", lambda d: d["protection"].update(observed_at="9999-01-01T00:00:00Z"), "future-protection-receipt"),
            ("protection-unenforced", lambda d: d["protection"]["rulesets"][0].update(enforcement="evaluate"), "archive-namespace-not-protected-without-bypass"),
            ("protection-branch-rule", lambda d: d["protection"]["rulesets"][0].update(target="branch"), "archive-namespace-not-protected-without-bypass"),
            ("protection-bypass", lambda d: d["protection"]["rulesets"][0].update(bypass_actors=[{"actor_type": "RepositoryRole", "bypass_mode": "always", "actor_id": 5}]), "archive-namespace-not-protected-without-bypass"),
            ("protection-exclusion", lambda d: d["protection"]["rulesets"][0]["conditions"]["ref_name"].update(exclude=["refs/tags/evidence-archive/2026-01"]), "archive-namespace-not-protected-without-bypass"),
            ("protection-wrong-pattern", lambda d: d["protection"]["rulesets"][0]["conditions"]["ref_name"].update(include=["refs/tags/unrelated/*"]), "archive-namespace-not-protected-without-bypass"),
            ("protection-no-deletion-rule", lambda d: d["protection"]["rulesets"][0].update(rules=[{"type": "update"}]), "archive-namespace-not-protected-without-bypass"),
            ("protection-rulesets-empty", lambda d: d["protection"].update(rulesets=[]), "protection-rulesets-required"),
            ("protection-rulesets-over-limit", lambda d: d["protection"].update(rulesets=[d["protection"]["rulesets"][0]] * 101), "protection-rulesets-required"),
            ("protection-rulesets-type", lambda d: d["protection"].update(rulesets=True), "protection-rulesets-required"),
            ("protection-rule-type", lambda d: d["protection"].update(rulesets=[True]), "invalid-protection-ruleset"),
            ("protection-conditions-type", lambda d: d["protection"]["rulesets"][0].update(conditions=[]), "invalid-protection-rule-conditions"),
            ("protection-ref-condition-type", lambda d: d["protection"]["rulesets"][0]["conditions"].update(ref_name=[]), "invalid-protection-rule-conditions"),
            ("protection-rule-list-type", lambda d: d["protection"]["rulesets"][0].update(rules=True), "invalid-protection-rule-conditions"),
            ("protection-no-update-rule", lambda d: d["protection"]["rulesets"][0].update(rules=[{"type": "deletion"}]), "archive-namespace-not-protected-without-bypass"),
        ]
        for name, mutate, expected in variants:
            tx_failure(name, lambda mutate=mutate: tx_change(mutate), expected)
        def unbound_transaction():
            doc = load_json((home / "TRANSACTION.json").read_bytes())
            doc["protection"]["observed_at"] = "2026-01-02T00:00:00Z"
            (home / "TRANSACTION.json").write_bytes(encoded(doc))
        tx_failure("transaction-full-byte-binding", unbound_transaction, "unreviewed-plan-or-classification-change")
        def alter_consumer():
            (root / "consumer.txt").write_text("Different consumer bytes.\n"); tx_commit()
        tx_failure("transaction-consumer-drift", alter_consumer, "transaction-source-or-consumer-drift")
        def change_index(change):
            index = lines((home / "INDEX.jsonl").read_bytes()); change(index)
            (home / "INDEX.jsonl").write_bytes(jsonl(index))
        def remove_keeper():
            (root / paths[1]).unlink()
            change_index(lambda rs: rs.pop(next(i for i, r in enumerate(rs) if r["path"] == paths[1])))
            tx_commit()
        tx_failure("transaction-newest-keeper-loss", remove_keeper, "missing-newest-family-keeper")
        def archive_keeper():
            change_index(lambda rs: next(r for r in rs if r["path"] == paths[1]).update(kind="archive", commit=containing, tag=tag))
            (root / paths[1]).unlink(); tx_commit()
        tx_failure("transaction-keeper-cannot-be-archived", archive_keeper, "archive-not-frozen-removal")
        tx_failure("archive-containing-commit-is-frozen-source", lambda: change_index(
            lambda rs: next(r for r in rs if r["kind"] == "archive").update(commit=body_commit)), "archive-not-frozen-removal")
        def source_negative(name, action, expected):
            tx_restore(); control = check(root, home) == final
            git(root, "reset", "--hard", containing); git(root, "clean", "-fdq")
            before = source_files(root, containing)
            doc = load_json(encoded(transaction)); action(doc)
            changed = tx_commit(); doc["source_commit"] = changed
            after = source_files(root, changed)
            tx_input.write_bytes(encoded(doc))
            try:
                prepare(root, changed, outer / ("negative-" + name), transaction_path=tx_input)
                reason = "unexpected-pass"
            except (Refusal, OSError) as exc:
                reason = str(exc)
            changes = sorted(p for p in set(before) | set(after) if before.get(p) != after.get(p))
            tx_restore(); restored = check(root, home) == final
            cases.append({"predicate": name, "pass": control and restored and reason == expected,
                          "old": {p: before.get(p, b"").decode() for p in changes},
                          "new": {p: after.get(p, b"").decode() for p in changes},
                          "transaction": doc, "fixture_commit": changed, "refusal": reason,
                          "expected_refusal": expected, "control_pass": control, "restored_pass": restored})
        def edit_capture(value):
            record = load_json((root / paths[0]).read_bytes()); record["capturedAt"] = value
            (root / paths[0]).write_bytes(encoded(record))
        source_negative("family-equal-capture-instants", lambda d: edit_capture("2026-01-02T00:00:00Z"), "incomparable-family-capture-instants")
        source_negative("family-capture-without-zone", lambda d: edit_capture("2026-01-01T00:00:00"), "capture-timezone-required")
        source_negative("family-capture-non-date", lambda d: edit_capture("invalid"), "capture-instant-required")
        source_negative("family-capture-type", lambda d: edit_capture(True), "capture-instant-required")
        source_negative("family-capture-overlong", lambda d: edit_capture("x" * 65), "capture-instant-required")
        source_negative("family-capture-overlong-parseable", lambda d: edit_capture("2026-01-01T00:00:00." + "1" * 60 + "Z"), "capture-instant-required")
        def long_resolving_selector(doc):
            key = "x" * 1024; doc["families"][0]["selectors"]["capture"] = "/" + key
            for path in paths:
                record = load_json((root / path).read_bytes()); record[key] = record["capturedAt"]
                (root / path).write_bytes(encoded(record))
        source_negative("family-selector-overlong-resolves", long_resolving_selector, "invalid-family-selector")
        def source_positive(name, action, keeper, expected_utc=None):
            tx_restore(); control = check(root, home) == final
            git(root, "reset", "--hard", containing); git(root, "clean", "-fdq")
            before = source_files(root, containing); doc = load_json(encoded(transaction)); action(doc)
            changed = tx_commit(); doc["source_commit"] = changed; tx_input.write_bytes(encoded(doc))
            local_witnesses = outer / (name + "-witnesses.jsonl")
            prepare(root, changed, home, local_witnesses, transaction_path=tx_input); tx_commit()
            checked = check(root, home); proposed = lines((home / "PLAN.jsonl").read_bytes())
            valid = checked["live"] == 2 and checked["archive"] == 0 and checked["plan"] == {"R2": 2}
            valid = valid and all(r["newest_keeper"] == keeper for r in proposed)
            if expected_utc:
                view = outer / (name + "-view"); adjudicate(root, home, local_witnesses, view)
                members = {r["path"]: r for r in lines((view / "MOVE-TABLE.jsonl").read_bytes())}
                valid = valid and all(members[p]["capture_instants"][0]["utc"] == value for p,value in expected_utc.items())
                valid = valid and lines((view / "FAMILIES.jsonl").read_bytes())[0]["chronological_latest_candidate"] == keeper
            after = source_files(root, changed)
            edits = {p: {"old": before.get(p, b"").decode(), "new": after.get(p, b"").decode()}
                     for p in sorted(set(before) | set(after)) if before.get(p) != after.get(p)}
            tx_restore(); restored = check(root, home) == final
            cases.append({"predicate": name, "pass": control and valid and restored, "old": containing,
                          "new": {"source_commit": changed, "source_edits": edits, "transaction": doc,
                                  "newest_keeper": keeper, "expected_utc": expected_utc},
                          "fixture_commit": changed, "control_pass": control, "restored_pass": restored})
        def escaped_selector(doc):
            doc["families"][0]["selectors"]["capture"] = "/when~1instant~0"
            for path in paths:
                record = load_json((root / path).read_bytes()); record["when/instant~"] = record["capturedAt"]
                (root / path).write_bytes(encoded(record))
        source_positive("family-selector-escaped-key-segments", escaped_selector, paths[1])
        def offset_order(doc):
            for path, instant in zip(paths, ("2026-01-01T23:30:00-05:00", "2026-01-02T03:00:00Z")):
                record = load_json((root / path).read_bytes()); record["capturedAt"] = instant
                (root / path).write_bytes(encoded(record))
        source_positive("family-offset-instants-use-UTC-order-and-report", offset_order, paths[0],
                        {paths[0]: "2026-01-02T04:30:00+00:00", paths[1]: "2026-01-02T03:00:00+00:00"})
        def protected_source(doc):
            dest = root / ".syzygy/fixture.md"; dest.parent.mkdir()
            dest.write_text(digest((root / paths[0]).read_bytes()) + "\n")
        source_negative("R0-cannot-enter-adjudicated-family", protected_source, "R0-family-reclassification-forbidden")
        def raw_dependency(doc):
            (root / "review-RAW.md").write_text("Synthetic evidence dependency: " + paths[0] + "\n")
        source_negative("R1-cannot-enter-adjudicated-family", raw_dependency, "undischarged-R1-family-member")
        def false_literal_glob_discharge(doc):
            raw_dependency(doc); citer = "review-RAW.md"
            for token in (paths[0], PurePosixPath(paths[0]).name):
                doc["discharges"].append({"citer": citer, "sha256": digest((root / citer).read_bytes()),
                                         "form": "conservative-glob", "token": token,
                                         "reason": "Synthetic false glob assertion cannot clear a literal dependency."})
        source_negative("glob-discharge-cannot-clear-literal-form", false_literal_glob_discharge, "undischarged-R1-family-member")
        source_negative("glob-discharge-cannot-clear-another-citer", lambda d: (root / "review-RAW.md").write_text(
                        "Synthetic independent raw query: docs/**\n"), "undischarged-R1-family-member")
        def different_glob_scope(doc):
            citer = "review-RAW.md"; (root / citer).write_text("Synthetic independent scopes: docs/** docs/evidence/capture-*.json\n")
            doc["discharges"].append({"citer": citer, "sha256": digest((root / citer).read_bytes()),
                                     "form": "conservative-glob", "token": "docs/**",
                                     "reason": "Only this exact synthetic glob scope is discharged, not the other token."})
        source_negative("glob-discharge-cannot-clear-another-token", different_glob_scope, "undischarged-R1-family-member")
        def digest_dependency(doc):
            # A docs digest isolates the digest arm from code/raw/governed
            # kind protection, while the original glob remains discharged.
            (root / "digest-claim.md").write_text(digest((root / paths[0]).read_bytes()) + "\n")
        source_negative("R1-docs-digest-cannot-enter-adjudicated-family", digest_dependency, "undischarged-R1-family-member")
        def identity_input(doc, field, value):
            doc["families"][0][field] = value
            for path in paths:
                record = load_json((root / path).read_bytes()); record[field] = value
                (root / path).write_bytes(encoded(record))
        for field, value in (("subject", True), ("kind", ""), ("role", "r" * 4097)):
            source_negative("coherent-record-and-family-invalid-" + field,
                            lambda d, field=field, value=value: identity_input(d, field, value),
                            "explicit-family-subject-kind-role-required")
        def renamed_member(doc, name):
            target = root / name; target.parent.mkdir(parents=True, exist_ok=True)
            (root / paths[0]).rename(target); doc["families"][0]["members"][0] = name
        source_negative("family-sidecar-member", lambda d: renamed_member(d, PREFIX + "nested/capture-2026-01-01.json"),
                        "unknown-duplicate-or-sidecar-family-member")
        source_negative("family-nested-member-same-index-group", lambda d: renamed_member(d, PREFIX + "capture/member.json"),
                        "unknown-duplicate-or-sidecar-family-member")
        source_negative("family-cross-index-groups", lambda d: renamed_member(d, PREFIX + "other.json"),
                        "family-crosses-measured-index-group")
        source_negative("family-non-json-member", lambda d: renamed_member(d, PREFIX + "capture-2026-01-01.txt"),
                        "unknown-duplicate-or-sidecar-family-member")
        def add_candidate(name, value):
            target = root / name; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded(value))
        source_negative("family-unadjudicated-nested-sidecar", lambda d: add_candidate(PREFIX + "capture/sidecar.json", {}),
                        "incomplete-or-ambiguous-family-domain")
        source_negative("family-unadjudicated-non-json-domain", lambda d: add_candidate(PREFIX + "capture-2026-01-03.txt", {}),
                        "incomplete-or-ambiguous-family-domain")
        for suffix in ("capture/sidecar.json", "capture-2026-01-03.txt"):
            source_negative("family-sidecar-role-does-not-prove-independence-" + Path(suffix).suffix,
                            lambda d, suffix=suffix: add_candidate(PREFIX + suffix,
                            {"subject": "synthetic-subject", "kind": "measurement", "role": "sidecar",
                             "capturedAt": "2026-01-03T00:00:00Z"}), "incomplete-or-ambiguous-family-domain")
        def protected_nonmember(kind):
            tx_restore(); control = check(root, home) == final
            git(root, "reset", "--hard", containing); git(root, "clean", "-fdq")
            extra = PREFIX + "capture-2026-01-03.json"
            extra_body = encoded({"subject": "synthetic-subject", "kind": "measurement", "role": "baseline",
                                  "capturedAt": "2026-01-03T00:00:00Z"})
            (root / extra).write_bytes(extra_body)
            citer = ".syzygy/held.md" if kind == "R0" else "held.md" if kind == "R1-digest" else "held-RAW.md"
            (root / citer).parent.mkdir(exist_ok=True)
            (root / citer).write_text(digest(extra_body) if kind in ("R0", "R1-digest") else extra)
            changed = tx_commit(); doc = load_json(encoded(transaction)); doc["source_commit"] = changed
            tx_input.write_bytes(encoded(doc))
            destination = outer / ("protected-nonmember-" + kind)
            prepare(root, changed, destination, transaction_path=tx_input)
            proposal = {r["path"]: r for r in lines((destination / "PLAN.jsonl").read_bytes())}
            expected = "R1" if kind == "R1-digest" else kind
            valid = proposal[extra]["classification"] == expected and proposal[extra]["disposition"] == "keep"
            valid = valid and proposal[paths[0]]["disposition"] == "archive" and proposal[paths[1]]["disposition"] == "keep"
            tx_restore(); restored = check(root, home) == final
            cases.append({"predicate": "protected-" + kind + "-nonmember-is-kept-outside-R2-family", "pass": control and valid and restored,
                          "old": {"source_commit": containing, "members": paths}, "new": {"source_commit": changed,
                          "protected_path": extra, "citer": citer, "citer_bytes": digest(extra_body) if kind in ("R0", "R1-digest") else extra},
                          "fixture_commit": changed, "control_pass": control, "restored_pass": restored})
        protected_nonmember("R0")
        protected_nonmember("R1")
        protected_nonmember("R1-digest")
        # The recurring family excludes actual protected records, other
        # explicit roles, and other measured groups without losing them.
        def excluded_nonmember(label, extra, record, expected):
            tx_restore(); control = check(root, home) == final
            git(root, "reset", "--hard", containing); git(root, "clean", "-fdq")
            add_candidate(extra, record)
            # A root non-Markdown file is a code citer. Put this literal
            # example in docs so these controls isolate role/group exclusion
            # without manufacturing a conservative R1 code witness.
            (root / "docs").mkdir(exist_ok=True)
            (root / "consumer.txt").rename(root / "docs/consumer.md")
            changed = tx_commit(); doc = load_json(encoded(transaction)); doc["source_commit"] = changed
            doc["discharges"][0]["citer"] = "docs/consumer.md"
            tx_input.write_bytes(encoded(doc)); destination = outer / ("excluded-" + label)
            prepare(root, changed, destination, transaction_path=tx_input)
            proposal = {r["path"]: r for r in lines((destination / "PLAN.jsonl").read_bytes())}
            valid = proposal[extra]["classification"] == expected and proposal[extra]["disposition"] != "archive"
            valid = valid and proposal[paths[0]]["disposition"] == "archive" and proposal[paths[1]]["disposition"] == "keep"
            tx_restore(); restored = check(root, home) == final
            cases.append({"predicate": label, "pass": control and valid and restored,
                          "old": {"source_commit": containing, "members": paths},
                          "new": {"path": extra, "record": record, "expected_classification": expected,
                                  "consumer_fixture_placement": {"old": "consumer.txt", "new": "docs/consumer.md",
                                                                 "bytes": "The literal docs/** is an unrelated documentation example; this fixture reads no evidence paths.\n"}},
                          "fixture_commit": changed, "control_pass": control, "restored_pass": restored})
        excluded_nonmember("raw-nonmember-preserved-outside-recurring-family", PREFIX + "capture-2026-01-03-RAW.md",
                           {"historical": "synthetic verbatim review"}, "R0")
        for field in ("subject", "kind", "role"):
            other = {"subject": "synthetic-subject", "kind": "measurement", "role": "baseline",
                     "capturedAt": "2026-01-03T00:00:00Z"}
            other[field] = "different " + field
            excluded_nonmember("distinct-" + field + "-nonmember-is-held", PREFIX + "capture-2026-01-03.json", other, "hold")
        excluded_nonmember("unrelated-index-group-remains-held", PREFIX + "unrelated.json", {}, "hold")
        # The GP-Q7 draft's lexical census is a separate, per-target proof.
        # Copy the real retained primary bytes as fixture input; no owner act
        # is invented or performed by this synthetic Git transaction.
        tx_restore(); git(root, "reset", "--hard", containing); git(root, "clean", "-fdq")
        primary_bytes = (implementation / DRAFT_AUTHORITY).read_bytes()
        primary = root / DRAFT_AUTHORITY; primary.parent.mkdir(parents=True, exist_ok=True); primary.write_bytes(primary_bytes)
        draft = {"schema": "cc-sec-3-draft-impact-sweep/1", "subjectCommit": containing,
                 "rows": [{"path": path, "sha256": digest((root / path).read_bytes()),
                           "matches": ["policyBasename"]} for path in paths]}
        census_path = root / DRAFT_CENSUS; census_path.parent.mkdir(parents=True, exist_ok=True)
        census_path.write_bytes(encoded(draft)); inventory_source = tx_commit()
        item = {"citer": DRAFT_CENSUS, "sha256": digest(encoded(draft)), "targets": paths,
                "reason": "The identified GP-Q7 draft row is a historical lexical policy-basename inventory, not a body-retention act or operative dependency.",
                "authority": {"path": DRAFT_AUTHORITY, "sha256": digest(primary_bytes), "clause": "GP-Q7"}}
        doc = load_json(encoded(transaction)); doc["source_commit"] = inventory_source
        doc["inventory_discharges"] = [item]; tx_input.write_bytes(encoded(doc))
        inventory_witnesses = outer / "inventory-witnesses.jsonl"
        prepare(root, inventory_source, home, witness_out=inventory_witnesses, transaction_path=tx_input); tx_commit()
        permitted = check(root, home)
        offered = adjudicate(root, home, inventory_witnesses, outer / "inventory-view")
        cases.append({"predicate": "adjudication-reports-compiled-R2-subfamily-and-nonempty-selection", "pass":
                      offered["classifications"] == {"R2": 2} and offered["selected_archives"] == 1,
                      "old": "conservative lexical R0 census classifications", "new": offered, "fixture_commit": inventory_source})
        cases.append({"predicate": "source-bound-draft-inventory-is-not-an-R0-act", "pass":
                      permitted["live"] == 2 and permitted["plan"] == {"R2": 2},
                      "old": draft, "new": doc, "fixture_commit": inventory_source,
                      "primary_fixture": {"origin": str(implementation / DRAFT_AUTHORITY), "sha256": digest(primary_bytes),
                                          "scope": "exact retained source input, no owner impersonation or act performance"}})
        frozen_inventory_files = source_files(root, inventory_source)
        partial_discharge = load_json(encoded(doc)); partial_discharge["inventory_discharges"][0]["targets"] = [paths[0]]
        try:
            transaction_plan(root, inventory_source, lines(make_census(frozen_inventory_files)), frozen_inventory_files,
                             make_plan(inventory_source, lines(make_census(frozen_inventory_files)), frozen_inventory_files), partial_discharge)
            reason = "unexpected-pass"
        except Refusal as exc:
            reason = str(exc)
        cases.append({"predicate": "inventory-discharge-cannot-clear-unlisted-family-member", "pass": reason == "R0-family-reclassification-forbidden",
                      "old": doc, "new": partial_discharge, "refusal": reason,
                      "expected_refusal": "R0-family-reclassification-forbidden", "fixture_commit": inventory_source})
        def inventory_failure(name, change, expected):
            proposals = load_json(encoded([item])); before = load_json(encoded(proposals)); change(proposals)
            control = inventory_discharges(root, frozen_inventory_files, [item]) == {(p, DRAFT_CENSUS) for p in paths}
            try:
                inventory_discharges(root, frozen_inventory_files, proposals); reason = "unexpected-pass"
            except (Refusal, OSError) as exc:
                reason = str(exc)
            restored = inventory_discharges(root, frozen_inventory_files, [item]) == {(p, DRAFT_CENSUS) for p in paths}
            cases.append({"predicate": name, "pass": control and restored and reason == expected,
                          "old": before, "new": proposals, "refusal": reason, "expected_refusal": expected,
                          "control_pass": control, "restored_pass": restored, "fixture_commit": inventory_source})
        inventory_variants = [
            ("inventory-item-type", lambda p: p.__setitem__(0, True), "invalid-inventory-discharge-schema"),
            ("inventory-primary-type", lambda p: p[0].update(authority=True), "inventory-discharge-primary-binding-drift"),
            ("inventory-item-schema", lambda p: p[0].update(approved=True), "invalid-inventory-discharge-schema"),
            ("inventory-citer-scope", lambda p: p[0].update(citer=".syzygy/other.json"), "inventory-discharge-source-drift"),
            ("inventory-citer-digest", lambda p: p[0].update(sha256="0" * 64), "inventory-discharge-source-drift"),
            ("inventory-primary-schema", lambda p: p[0]["authority"].update(approved=True), "inventory-discharge-primary-binding-drift"),
            ("inventory-primary-path", lambda p: p[0]["authority"].update(path=".syzygy/other.md"), "inventory-discharge-primary-binding-drift"),
            ("inventory-primary-clause", lambda p: p[0]["authority"].update(clause="GP-Q1"), "inventory-discharge-primary-binding-drift"),
            ("inventory-primary-digest", lambda p: p[0]["authority"].update(sha256="0" * 64), "inventory-discharge-primary-binding-drift"),
            ("inventory-reason-short", lambda p: p[0].update(reason="short"), "inventory-discharge-reason-required"),
            ("inventory-reason-type", lambda p: p[0].update(reason=True), "inventory-discharge-reason-required"),
            ("inventory-reason-long", lambda p: p[0].update(reason="r" * 4097), "inventory-discharge-reason-required"),
            ("inventory-targets-empty", lambda p: p[0].update(targets=[]), "inventory-discharge-targets-required"),
            ("inventory-targets-type", lambda p: p[0].update(targets=True), "inventory-discharge-targets-required"),
            ("inventory-targets-mapping", lambda p: p[0].update(targets={path: True for path in paths}), "inventory-discharge-targets-required"),
            ("inventory-target-unknown", lambda p: p[0].update(targets=[PREFIX + "missing.json"]), "inventory-discharge-unknown-or-duplicate-target"),
            ("inventory-target-duplicate", lambda p: p[0]["targets"].append(paths[0]), "inventory-discharge-unknown-or-duplicate-target"),
        ]
        for name, change, expected in inventory_variants:
            inventory_failure(name, change, expected)
        for invalid in (None, True, {}):
            try:
                inventory_discharges(root, frozen_inventory_files, invalid); reason = "unexpected-pass"
            except Refusal as exc:
                reason = str(exc)
            cases.append({"predicate": "inventory-population-type-" + type(invalid).__name__,
                          "pass": reason == "invalid-inventory-discharge-population", "old": [item], "new": invalid,
                          "refusal": reason, "fixture_commit": inventory_source})
        def inventory_source_failure(name, alter, expected):
            changed = dict(frozen_inventory_files); original_draft = load_json(encoded(draft)); alter(changed, original_draft)
            changed[DRAFT_CENSUS] = encoded(original_draft)
            proposal = load_json(encoded([item])); proposal[0]["sha256"] = digest(changed[DRAFT_CENSUS])
            try:
                inventory_discharges(root, changed, proposal); reason = "unexpected-pass"
            except (Refusal, OSError) as exc:
                reason = str(exc)
            restored = inventory_discharges(root, frozen_inventory_files, [item]) == {(p, DRAFT_CENSUS) for p in paths}
            cases.append({"predicate": name, "pass": restored and reason == expected, "old": draft,
                          "new": original_draft, "source_changes": {p: {"old": frozen_inventory_files.get(p, b"").decode(),
                          "new": b.decode()} for p,b in changed.items() if b != frozen_inventory_files.get(p)},
                          "refusal": reason, "expected_refusal": expected,
                          "control_pass": True, "restored_pass": restored, "fixture_commit": inventory_source})
        inventory_source_failure("inventory-schema-kind", lambda f,d: d.update(schema="signed-manifest/1"), "inventory-discharge-not-identified-historical-census")
        inventory_source_failure("inventory-subject-commit", lambda f,d: d.update(subjectCommit="short"), "inventory-discharge-not-identified-historical-census")
        inventory_source_failure("inventory-row-population", lambda f,d: d.update(rows=None), "inventory-discharge-not-identified-historical-census")
        inventory_source_failure("inventory-row-digest", lambda f,d: d["rows"][0].update(sha256="0" * 64), "inventory-discharge-not-basename-only-row")
        inventory_source_failure("inventory-row-operation", lambda f,d: d["rows"][0].update(matches=["ccSecFamily"]), "inventory-discharge-not-basename-only-row")
        inventory_source_failure("inventory-row-duplicate", lambda f,d: d["rows"].append(d["rows"][0]), "inventory-discharge-not-basename-only-row")
        inventory_source_failure("inventory-body-drift", lambda f,d: f.update({paths[0]: b"changed"}), "inventory-discharge-not-basename-only-row")
        def historical_body_mismatch(f, d):
            f[paths[0]] = b"changed synthetic historical input"
            d["rows"][0]["sha256"] = digest(f[paths[0]])
        inventory_source_failure("inventory-historical-body-mismatch", historical_body_mismatch, "inventory-discharge-historical-object-mismatch")
        inventory_source_failure("inventory-row-type", lambda f,d: d["rows"].__setitem__(0, True), "inventory-discharge-not-basename-only-row")
        # A historical symlink can have exactly the later JSON blob's bytes.
        # Its matching hash must not substitute for a regular historical blob.
        historical_repo = outer / "inventory-historical-nonblob"; historical_repo.mkdir(); git(historical_repo, "init", "-q")
        for path, body in frozen_inventory_files.items():
            target = historical_repo / path; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(body)
        target = historical_repo / paths[0]; target.unlink(); target.symlink_to(frozen_inventory_files[paths[0]].decode())
        def history_commit():
            git(historical_repo, "add", "--all")
            git(historical_repo, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
                "commit", "-qm", "synthetic historical object proof")
            return git(historical_repo, "rev-parse", "HEAD").decode().strip()
        nonblob_commit = history_commit(); target.unlink(); target.write_bytes(frozen_inventory_files[paths[0]])
        negative_draft = load_json(encoded(draft)); negative_draft["subjectCommit"] = nonblob_commit
        (historical_repo / DRAFT_CENSUS).write_bytes(encoded(negative_draft)); negative_source = history_commit()
        positive_draft = load_json(encoded(draft)); positive_draft["subjectCommit"] = negative_source
        (historical_repo / DRAFT_CENSUS).write_bytes(encoded(positive_draft)); positive_source = history_commit()
        def historical_proposal(record):
            proposed = load_json(encoded([item])); proposed[0]["sha256"] = digest(encoded(record)); return proposed
        positive_files = source_files(historical_repo, positive_source); negative_files = source_files(historical_repo, negative_source)
        control = inventory_discharges(historical_repo, positive_files, historical_proposal(positive_draft)) == {(p, DRAFT_CENSUS) for p in paths}
        try:
            inventory_discharges(historical_repo, negative_files, historical_proposal(negative_draft)); reason = "unexpected-pass"
        except Refusal as exc:
            reason = str(exc)
        restored = inventory_discharges(historical_repo, positive_files, historical_proposal(positive_draft)) == {(p, DRAFT_CENSUS) for p in paths}
        cases.append({"predicate": "inventory-identical-historical-symlink-is-not-a-regular-blob", "pass":
                      control and restored and reason == "inventory-discharge-historical-object-mismatch",
                      "old": {"source": positive_source, "census": positive_draft},
                      "new": {"source": negative_source, "census": negative_draft, "historical_mode": "120000",
                              "historical_commit": nonblob_commit, "symlink_literal": frozen_inventory_files[paths[0]].decode(),
                              "same_blob_sha256": digest(frozen_inventory_files[paths[0]])},
                      "refusal": reason, "expected_refusal": "inventory-discharge-historical-object-mismatch",
                      "control_pass": control, "restored_pass": restored, "fixture_commit": negative_source,
                      "scope": "Owned synthetic source and Git symlink literal only; no target traversal or owner act"})
        # Even this narrow census proof cannot clear a separate primary digest.
        protected_files = dict(frozen_inventory_files); protected_files[".syzygy/independent-act.md"] = digest(protected_files[paths[0]]).encode()
        protected_rows = lines(make_census(protected_files)); protected_plan = make_plan(inventory_source, protected_rows, protected_files)
        try:
            transaction_plan(root, inventory_source, protected_rows, protected_files, protected_plan, doc); refusal = "unexpected-pass"
        except Refusal as exc:
            refusal = str(exc)
        cases.append({"predicate": "inventory-discharge-cannot-clear-another-R0-edge", "pass": refusal == "R0-family-reclassification-forbidden",
                      "old": "only source-bound draft census", "new": {"additional_citer": ".syzygy/independent-act.md",
                      "bytes": digest(protected_files[paths[0]])}, "refusal": refusal, "fixture_commit": inventory_source})
        # Rollback is a new ordinary commit: the archive row and protected tag
        # remain, while restored bytes are represented by a live locator.
        tx_restore()
        source_bytes = git(root, "show", containing + ":" + paths[0])
        (root / paths[0]).write_bytes(source_bytes)
        restored_index = lines((home / "INDEX.jsonl").read_bytes())
        for row in restored_index:
            if row["path"] == paths[0]:
                row.pop("commit"); row.pop("tag"); row["kind"] = "live"
        (home / "INDEX.jsonl").write_bytes(jsonl(restored_index)); rollback = tx_commit()
        rolled_back = check(root, home)
        cases.append({"predicate": "ordinary-body-restoring-rollback-with-tag-retained", "pass": rolled_back["live"] == 2
                      and rolled_back["archive"] == 0 and git(root, "rev-parse", "refs/tags/" + tag + "^{commit}").decode().strip() == containing,
                      "old": completed, "new": rollback, "fixture_commit": rollback})
    with tempfile.TemporaryDirectory(prefix="syzygy-retention-singleton-") as temp:
        outer = Path(temp); root = outer / "repo"; root.mkdir(); git(root, "init", "-q")
        path = PREFIX + "singleton.json"; (root / path).parent.mkdir(parents=True)
        (root / path).write_bytes(encoded({"subject": "synthetic unreferenced singleton"}))
        git(root, "add", "--all")
        git(root, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
            "commit", "-qm", "synthetic singleton")
        containing = git(root, "rev-parse", "HEAD").decode().strip()
        witnesses = outer / "witnesses.jsonl"; prepared = prepare(root, containing, root / HOME, witnesses)
        view = adjudicate(root, root / HOME, witnesses, outer / "view")
        cases.append({"predicate": "lexical-absence-never-promotes-singleton-to-R2", "pass":
                      prepared["evidence_files"] == 1 and view["classifications"] == {"hold": 1},
                      "old": {"record": {"subject": "synthetic unreferenced singleton"}, "citers": []},
                      "new": {"classification": "hold", "reason": "singleton-without-affirmative-consumer-discharge"},
                      "fixture_commit": containing})
    # Report-only adjudication still owes exact source/witness/consumer
    # binding and owned output boundaries. Exercise those checks in this
    # existing matrix; a report is never permission to move a body.
    with tempfile.TemporaryDirectory(prefix="syzygy-retention-adjudication-") as temp:
        outer = Path(temp); root = outer / "repo"; root.mkdir(); git(root, "init", "-q")
        paths = {"frozen": PREFIX + "frozen.json", "relied": PREFIX + "relied.json",
                 "literal": PREFIX + "literal.json", "glob": PREFIX + "glob-one.json",
                 "raw": PREFIX + "review-RAW.md"}
        for name, path in paths.items():
            target = root / path; target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(encoded({"subject": "synthetic " + name}))
        (root / "consumer.txt").write_text("Synthetic fixed source for report binding.\n")
        (root / "note.md").write_text(paths["literal"] + "\nThis is a literal citation with no operative claim.\n")
        (root / "reader.py").write_text("# Synthetic glob selection example: docs/evidence/glob-*.json\n")
        git(root, "add", "--all"); git(root, "-c", "user.name=Retention Fixture", "-c", "user.email=fixture@example.invalid",
                                             "commit", "-qm", "synthetic adjudication source")
        containing = git(root, "rev-parse", "HEAD").decode().strip(); home = root / HOME
        witnesses = outer / "witnesses.jsonl"; prepare(root, containing, home, witnesses)
        operations = outer / "operations.json"
        claims = {paths[key]: [{"classification": classification, "consumer": "consumer.txt",
                               "consumer_sha256": digest((root / "consumer.txt").read_bytes()),
                               "operation": "A synthetic report operation binds this exact source and record."}]
                  for key, classification in (("frozen", "R0"), ("relied", "R1"))}
        operations.write_bytes(encoded(claims))
        baseline = {p: p.read_bytes() for p in [home / "SOURCE.json", home / "PLAN.jsonl", home / "CENSUS.jsonl", witnesses, operations]}
        def restore_report_inputs():
            for path, body in baseline.items():
                if path.is_symlink(): path.unlink()
                path.write_bytes(body)
        def report(destination): return adjudicate(root, home, witnesses, destination, operations)
        valid = report(outer / "valid")
        members = {r["path"]: r for r in lines((outer / "valid/MOVE-TABLE.jsonl").read_bytes())}
        cases.append({"predicate": "adjudication-preserves-operative-classes-and-explicit-held-reasons", "pass":
                      valid["classifications"] == {"R0": 2, "R1": 1, "hold": 2}
                      and members[paths["glob"]]["reason"] == "citation-present-actual-reliance-unknown-retain-in-place"
                      and members[paths["literal"]]["reason"] == "citation-present-actual-reliance-unknown-retain-in-place",
                      "old": claims, "new": {p: {"classification": r["classification"], "reason": r["reason"]} for p,r in members.items()},
                      "fixture_commit": containing})
        serial = [0]
        def report_failure(name, change, expected):
            restore_report_inputs(); serial[0] += 1
            control = report(outer / ("control-" + str(serial[0]))) == valid
            change(); changed = {str(p.relative_to(outer)): {"old": b.decode(), "new": p.read_text()}
                                for p,b in baseline.items() if not p.is_symlink() and p.read_bytes() != b}
            try:
                report(outer / ("negative-" + str(serial[0]))); reason = "unexpected-pass"
            except Exception as exc:
                reason = str(exc) if isinstance(exc, (Refusal, OSError)) else type(exc).__name__ + ": " + str(exc)
            restore_report_inputs(); restored = report(outer / ("restored-" + str(serial[0]))) == valid
            cases.append({"predicate": name, "pass": control and restored and reason == expected,
                          "old": {"source_commit": containing, "input_sha256": {str(p.relative_to(outer)): digest(b) for p,b in baseline.items()}},
                          "new": changed, "refusal": reason, "expected_refusal": expected,
                          "fixture_commit": containing, "control_pass": control, "restored_pass": restored})
        def source_change(key):
            source = load_json((home / "SOURCE.json").read_bytes()); source[key] = "0" * 64
            (home / "SOURCE.json").write_bytes(encoded(source))
        for key in ("snapshot_sha256", "plan_sha256", "source_tree_sha256"):
            report_failure("adjudication-" + key, lambda key=key: source_change(key), "adjudication-frozen-input-drift")
        def witness_change(change):
            records = lines(witnesses.read_bytes()); change(records); witnesses.write_bytes(jsonl(records))
        report_failure("adjudication-witness-unknown", lambda: witness_change(lambda r: r[0].update(path=PREFIX + "absent.json")), "adjudication-witness-drift")
        report_failure("adjudication-witness-duplicate", lambda: witness_change(lambda r: r.append(r[0])), "adjudication-witness-drift")
        report_failure("adjudication-witness-omission", lambda: witness_change(lambda r: r.pop()), "adjudication-witness-population-mismatch")
        report_failure("adjudication-witness-byte-drift", lambda: witness_change(lambda r: r[0]["witnesses"].append({"new": "unbound"})), "adjudication-witness-drift")
        def witness_count_drift():
            proposed = lines((home / "PLAN.jsonl").read_bytes()); proposed[0]["witnesses"]["count"] += 1
            data = jsonl(proposed); (home / "PLAN.jsonl").write_bytes(data)
            source = load_json((home / "SOURCE.json").read_bytes()); source["plan_sha256"] = digest(data)
            (home / "SOURCE.json").write_bytes(encoded(source))
        report_failure("adjudication-witness-count", witness_count_drift, "adjudication-witness-drift")
        def operation_change(change):
            value = load_json(operations.read_bytes()); change(value); operations.write_bytes(encoded(value))
        report_failure("adjudication-operation-unknown-target", lambda: operation_change(lambda v: v.update({PREFIX + "absent.json": v.pop(paths["frozen"])})), "operative-consumer-binding-drift")
        for name, values in (("classification", {"classification": "R2"}), ("consumer", {"consumer": "absent.txt"}),
                             ("consumer-digest", {"consumer_sha256": "0" * 64}), ("operation-type", {"operation": True}),
                             ("operation-short", {"operation": "short"})):
            report_failure("adjudication-" + name, lambda values=values: operation_change(lambda v: v[paths["frozen"]][0].update(values)), "operative-consumer-binding-drift")
        restore_report_inputs()
        for label, destination in (("wrong-local-directory", root / "other-output"), ("output-symlink", outer / "linked-output"),
                                   ("artifact-symlink", outer / "linked-artifact"),
                                   ("artifact-symlink-MOVE-TABLE.jsonl", outer / "linked-move-table"),
                                   ("artifact-symlink-ADJUDICATION.json", outer / "linked-adjudication")):
            if label == "output-symlink":
                real = outer / "link-target"; real.mkdir(); destination.symlink_to(real, target_is_directory=True)
            if label.startswith("artifact-symlink"):
                artifact = "FAMILIES.jsonl" if label == "artifact-symlink" else label.removeprefix("artifact-symlink-")
                destination.mkdir(); (destination / artifact).symlink_to(outer / (label + "-target"))
            try:
                report(destination); reason = "unexpected-pass"
            except Refusal as exc:
                reason = str(exc)
            expected = "generated-output-must-use-retention-home-or-external-directory" if label == "wrong-local-directory" else "output-artifact-symlink"
            cases.append({"predicate": "adjudication-" + label, "pass": reason == expected,
                          "old": "owned regular external output", "new": {"destination": str(destination.relative_to(outer)), "fixture": label},
                          "refusal": reason, "expected_refusal": expected, "fixture_commit": containing})
        inplace = report(home)
        cases.append({"predicate": "adjudication-allows-exact-retention-home", "pass": inplace == valid,
                      "old": "external output", "new": HOME, "fixture_commit": containing})
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
    plan.add_argument("--transaction", help="reviewed source-bound family adjudication; plan mode still moves nothing")
    plan.add_argument("--witness-out", help="optional full witness sweep; keep this large replay output outside the repository")
    judgment = sub.add_parser("adjudicate"); judgment.add_argument("--frozen", required=True)
    judgment.add_argument("--witnesses", required=True); judgment.add_argument("--out", required=True)
    judgment.add_argument("--operations", help="source-bound operative consumer adjudications; citations alone stay Unknown")
    verify = sub.add_parser("check"); verify.add_argument("--home", default=HOME)
    test = sub.add_parser("selftest"); test.add_argument("--receipt")
    args = parser.parse_args()
    try:
        root = Path(git(Path.cwd(), "rev-parse", "--show-toplevel").decode().strip())
        if args.mode == "plan":
            print(json.dumps(prepare(root, args.source, Path(args.out), Path(args.witness_out) if args.witness_out else None,
                                     Path(args.transaction) if args.transaction else None), sort_keys=True))
        elif args.mode == "adjudicate":
            print(json.dumps(adjudicate(root, Path(args.frozen), Path(args.witnesses), Path(args.out),
                                        Path(args.operations) if args.operations else None), sort_keys=True))
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
