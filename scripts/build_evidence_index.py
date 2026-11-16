#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Generate the evidence index on demand: one JSON row per `docs/evidence/` file.

The index is a generated view, never authority, and is never committed
(syzygy-bpyt.9.1): it is a function of the whole tree, so a committed copy goes
stale on most merges. Generate it at the commit you are asking about. It
moves, renames and retains nothing; retention is a separate, owner-gated
question (syzygy-bpyt.9.2), which freezes its own snapshot at the commit its
packet names.

Population
----------
Every tracked regular file under `docs/evidence/` (`git ls-files -s`, modes
100644 and 100755; a symlink or gitlink is not a row). The row count is that
population.

Fields of a row
---------------
- `path`      repo-relative path.
- `sha256`    digest of the working-tree bytes.
- `family`    first directory under `docs/evidence/` for a nested file; for a
              top-level file, the basename without its extension, cut at the
              first `-YYYY-MM-DD` date token, then stripped repeatedly of a
              trailing `-vN`, `-revN`, `-rN`, `-genN` or `-final` token.
- `subject`   JSON object records: the top-level `subject` when it is a
              string, or its `path` when it is an object with a string
              `path`. Markdown: the first `Subject:` line. Else null.
- `commit`    JSON object records: the first of COMMIT_KEYS at top level whose
              value is a 7-40 character lowercase hex string. Markdown: the
              first `Reviewed commit:` or `Commit:` line's first such token.
              Else null.
- `verdict`   JSON object records: a top-level string `verdict`. Markdown: the
              first `Verdict:` line (bold markers allowed). Else null.
- `reliance`  one of RELIANCE_CLASSES, defined below.

Citer population (rule 9: the denominator for every absence below)
------------------------------------------------------------------
Every tracked regular file except (a) the evidence file itself and (b) an
*index snapshot*: a tracked `.jsonl` file every non-blank line of which is a
JSON object whose key set is exactly ROW_KEYS. A snapshot is this builder's
own output and would otherwise cite every row by path and digest. Each
citer's bytes are decoded as UTF-8 with replacement.

Two kinds of citation
---------------------
*Path citation.* The citer's text is split into tokens: maximal runs of
`[A-Za-z0-9_./-]`. Two more tokens are added per wrapped citation: for each
line holding an odd number of backticks, the run ending that line (after
trailing whitespace) is joined to the run opening the next line (after
leading whitespace) and the join is a token (AGENTS.md: a code span wrapped
across a line break). A citer C path-cites evidence file P when some token
T, or some suffix of T that starts just after a `/`, or either with trailing
`.` characters removed, equals P's path below `docs/evidence/`, or equals
P's repo path once T is resolved against C's own directory
(`posixpath.normpath`). So `docs/evidence/a/b.json`, `a/b.json` and, from a
file in `docs/evidence/a/`, `b.json` all cite `docs/evidence/a/b.json`; a
top-level evidence file is cited by its basename anywhere.

*Digest citation.* C digest-cites P when P's current sha256 appears in C as
a 64-hex token (either case, not adjoining another hex digit). A truncated
prefix (`0758cdcc…`) is not a digest citation. No file can hold its own
digest, so self-exclusion needs no rule here; it does for a path. A digest
binds bytes, not a path: identical files share one digest, so a citation of it
names every copy. The one exception is the digest of the empty input
(EMPTY_SHA256): zero bytes bind nothing, and forty unrelated records quote it
by chance, so it is never a digest citation of any file.

*Directory citation.* A token (or `/`-suffix of one, with trailing `.` and `/`
removed) that equals a directory below `docs/evidence/` (evidence-relative,
repo-relative, or resolved against the citer's directory) names every file
under that directory, unless the citer sits under that directory itself. It
is weaker than a path citation: it says "this review's evidence lives under
`<dir>/`", not which file is relied on.

Not a citation, by this predicate: a stem without its extension, a path
assembled at run time (f-strings, `join`), a glob, a `../` path not resolving
to P, a basename named from outside P's own directory (a reviewer's table of
nested files is reached only through a digest), and a token with leading
dots (`...name.json`). An act's *preservation* language that locks a file
without naming its digest is not detected either (AGENTS.md); `act-bound` is
a lower bound.

Kinds of citer, first match wins
--------------------------------
- `governed`  under `.syzygy/` or `openspec/`.
- `code`      under `apps/`, `packages/`, `scripts/` or `.github/`, or a
              root-level file not ending `.md` (comments count; the predicate
              does not parse code).
- `raw`       a file whose name ends `-RAW.md`, wherever it sits, including
              under `docs/evidence/`.
- `listing`   a file under `docs/evidence/` every non-blank line of which is
              one bare token and at least one of which holds a `/`: a
              captured path dump (`git diff --name-only`, a moved-paths list).
              A listing records that a path existed, not that anything relies
              on it.
- `evidence`  any other file under `docs/evidence/`.
- `docs`      any other file (`docs/**`, root Markdown, the `.beads` export).

Reliance classes, first match wins
----------------------------------
- `act-bound`        digest-cited by a `governed` citer.
- `governed-citer`   path-cited by a `governed` citer.
- `code-reference`   path-cited by a `code` citer.
- `raw-review-citer` path-cited by a `raw` citer.
- `docs-citer`       path-cited by a `docs` citer.
- `digest-cited`     digest-cited by any citer of another kind. It sits above
                     the evidence classes because a stored digest binds bytes
                     and a sibling's path names only a location.
- `evidence-only`    path-cited by an `evidence` citer, and by nothing above.
- `listed-only`      path-cited only by `listing` citers.
- `directory-named`  a containing directory is cited by a file outside it, and
                     nothing above applies. Checked before `none`, so `none`
                     means no citation of the file, its digest or its
                     directory. Chosen over a docstring exclusion because a
                     reader of the rows sees the class; a prose exclusion hid
                     140 of the former 263 `none` rows from `.9.2`.
- `none`             no path, digest or directory citation by any citer.

A class says who cites a file, never whether the file is still needed
(AGENTS.md rule 5).

Usage
-----
    python3 scripts/build_evidence_index.py              # print the index (JSONL)
    python3 scripts/build_evidence_index.py --out PATH   # write it to PATH
    python3 scripts/build_evidence_index.py --summary    # print the class totals
    python3 scripts/build_evidence_index.py --selftest   # fixtures
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import os
import posixpath
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Iterable

EVIDENCE_PREFIX = "docs/evidence/"
RELIANCE_CLASSES = (
    "act-bound",
    "governed-citer",
    "code-reference",
    "raw-review-citer",
    "docs-citer",
    "digest-cited",
    "evidence-only",
    "listed-only",
    "directory-named",
    "none",
)
ROW_KEYS = frozenset(("path", "sha256", "family", "subject", "commit", "verdict", "reliance"))
COMMIT_KEYS = (
    "commit",
    "head",
    "headCommit",
    "testedCommit",
    "reviewedCommit",
    "ranAtCommit",
    "ranAt",
    "codeHeadCommit",
    "subjectCommit",
    "recordCommit",
    "syzygyHead",
    "syzygy_commit",
    "treeCommit",
)
TOKEN = re.compile(r"[A-Za-z0-9_./-]+")
TAIL = re.compile(r"[A-Za-z0-9_./-]+$")
HEAD = re.compile(r"^[A-Za-z0-9_./-]+")
BARE_LINE = re.compile(r"^\s*[A-Za-z0-9_./-]+\s*$")
EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()
HEX64 = re.compile(r"(?<![0-9a-fA-F])[0-9a-fA-F]{64}(?![0-9a-fA-F])")
COMMIT_HEX = re.compile(r"[0-9a-f]{7,40}")
DATE_TOKEN = re.compile(r"-\d{4}-\d{2}-\d{2}")
VERSION_TAIL = re.compile(r"-(?:v\d+|rev\d+|r\d+|gen\d+|final)$")
MD_SUBJECT = re.compile(r"^\s*(?:\*\*)?Subject(?:\*\*)?:\s*(?:\*\*)?\s*(.+?)\s*$", re.M)
MD_VERDICT = re.compile(r"^\s*(?:\*\*)?Verdict(?:\*\*)?:\s*(?:\*\*)?\s*(.+?)\s*$", re.M)
MD_COMMIT = re.compile(r"^\s*(?:\*\*)?(?:Reviewed commit|Commit)(?:\*\*)?:[^\n]*?\b([0-9a-f]{7,40})\b", re.M)
GOVERNED_PREFIXES = (".syzygy/", "openspec/")
CODE_PREFIXES = ("apps/", "packages/", "scripts/", ".github/")
PATH_CLASS = {
    "governed": "governed-citer",
    "code": "code-reference",
    "raw": "raw-review-citer",
    "docs": "docs-citer",
    "evidence": "evidence-only",
    "listing": "listed-only",
}


def tracked_files(root: Path) -> list[str]:
    out = subprocess.run(
        ["git", "-C", str(root), "ls-files", "-s", "-z"],
        check=True, capture_output=True,
    ).stdout.decode("utf-8")
    paths = []
    for entry in out.split("\0"):
        if not entry:
            continue
        meta, path = entry.split("\t", 1)
        if meta.split(" ")[0] in ("100644", "100755"):
            paths.append(path)
    return sorted(set(paths))


def tokens_of(text: str) -> set[str]:
    found = set(TOKEN.findall(text))
    lines = text.split("\n")
    for i, line in enumerate(lines[:-1]):
        if line.count("`") % 2 == 1:
            tail = TAIL.search(line.rstrip())
            head = HEAD.search(lines[i + 1].lstrip())
            if tail and head:
                found.add(tail.group(0) + head.group(0))
    return found


def candidate_keys(token: str, citer_dir: str) -> Iterable[str]:
    """Repo paths the token may name: as an evidence-relative path, or
    resolved against the citer's directory; every `/`-suffix too."""
    forms = {token, token.rstrip(".")}
    for form in forms:
        if not form:
            continue
        suffixes = [form] + [form[i + 1:] for i, ch in enumerate(form) if ch == "/"]
        for s in suffixes:
            if s:
                yield EVIDENCE_PREFIX + s
        if citer_dir:
            yield posixpath.normpath(posixpath.join(citer_dir, form))


def directory_keys(token: str, citer_dir: str) -> Iterable[str]:
    """Repo paths the token may name as a directory (trailing `.` and `/` cut)."""
    return candidate_keys(token.rstrip("./"), citer_dir)


def is_listing(text: str) -> bool:
    lines = [line for line in text.split("\n") if line.strip()]
    return bool(lines) and all(BARE_LINE.match(line) for line in lines) and any("/" in line for line in lines)


def is_snapshot(path: str, text: str) -> bool:
    if not path.endswith(".jsonl"):
        return False
    lines = [line for line in text.split("\n") if line.strip()]
    if not lines:
        return False
    for line in lines:
        try:
            row = json.loads(line)
        except ValueError:
            return False
        if not isinstance(row, dict) or set(row) != ROW_KEYS:
            return False
    return True


def citer_kind(path: str, text: str) -> str:
    if path.startswith(GOVERNED_PREFIXES):
        return "governed"
    if path.startswith(CODE_PREFIXES) or ("/" not in path and not path.endswith(".md")):
        return "code"
    if path.endswith("-RAW.md"):
        return "raw"
    if path.startswith(EVIDENCE_PREFIX):
        return "listing" if is_listing(text) else "evidence"
    return "docs"


def family_of(path: str) -> str:
    rel = path[len(EVIDENCE_PREFIX):]
    if "/" in rel:
        return rel.split("/", 1)[0]
    stem = rel.rsplit(".", 1)[0] if "." in rel else rel
    m = DATE_TOKEN.search(stem)
    if m:
        stem = stem[: m.start()]
    while True:
        cut = VERSION_TAIL.sub("", stem)
        if cut == stem:
            return stem
        stem = cut


def record_fields(path: str, data: bytes) -> tuple[str | None, str | None, str | None]:
    subject = commit = verdict = None
    if path.endswith(".json"):
        try:
            doc = json.loads(data.decode("utf-8"))
        except (UnicodeDecodeError, ValueError):
            return None, None, None
        if not isinstance(doc, dict):
            return None, None, None
        s = doc.get("subject")
        if isinstance(s, str):
            subject = s
        elif isinstance(s, dict) and isinstance(s.get("path"), str):
            subject = s["path"]
        for key in COMMIT_KEYS:
            v = doc.get(key)
            if isinstance(v, str) and COMMIT_HEX.fullmatch(v):
                commit = v
                break
        if isinstance(doc.get("verdict"), str):
            verdict = doc["verdict"]
    elif path.endswith(".md"):
        text = data.decode("utf-8", errors="replace")
        m = MD_SUBJECT.search(text)
        subject = m.group(1) if m else None
        m = MD_COMMIT.search(text)
        commit = m.group(1) if m else None
        m = MD_VERDICT.search(text)
        verdict = m.group(1).strip("*").strip() if m else None
    return subject, commit, verdict


def classify(path_kinds: set[str], digest_kinds: set[str], dir_named: bool = False) -> str:
    if "governed" in digest_kinds:
        return "act-bound"
    for kind in ("governed", "code", "raw", "docs"):
        if kind in path_kinds:
            return PATH_CLASS[kind]
    if digest_kinds:
        return "digest-cited"
    for kind in ("evidence", "listing"):
        if kind in path_kinds:
            return PATH_CLASS[kind]
    return "directory-named" if dir_named else "none"


def build(root: Path) -> tuple[str, collections.Counter]:
    files = tracked_files(root)
    evidence = [p for p in files if p.startswith(EVIDENCE_PREFIX)]
    ev_set = set(evidence)
    blobs = {p: (root / p).read_bytes() for p in evidence}
    digests = {p: hashlib.sha256(b).hexdigest() for p, b in blobs.items()}
    by_digest: dict[str, list[str]] = collections.defaultdict(list)
    for p, d in digests.items():
        by_digest[d].append(p)
    path_kinds: dict[str, set[str]] = {p: set() for p in evidence}
    digest_kinds: dict[str, set[str]] = {p: set() for p in evidence}
    ev_dirs = {posixpath.dirname(p) for p in evidence}
    for d in list(ev_dirs):
        while len(d) > len(EVIDENCE_PREFIX):
            ev_dirs.add(d)
            d = posixpath.dirname(d)
    ev_dirs = {d for d in ev_dirs if len(d) > len(EVIDENCE_PREFIX)}
    named_dirs: set[str] = set()
    for citer in files:
        data = blobs.get(citer)
        if data is None:
            data = (root / citer).read_bytes()
        text = data.decode("utf-8", errors="replace")
        if is_snapshot(citer, text):
            continue
        kind = citer_kind(citer, text)
        citer_dir = posixpath.dirname(citer)
        hit: set[str] = set()
        for token in tokens_of(text):
            for key in candidate_keys(token, citer_dir):
                if key in ev_set:
                    hit.add(key)
        hit.discard(citer)
        for token in tokens_of(text):
            for key in directory_keys(token, citer_dir):
                if key in ev_dirs and not citer.startswith(key + "/"):
                    named_dirs.add(key)
        for target in hit:
            path_kinds[target].add(kind)
        for hexd in set(HEX64.findall(text)):
            if hexd.lower() == EMPTY_SHA256:
                continue
            for target in by_digest.get(hexd.lower(), ()):
                digest_kinds[target].add(kind)
    rows = []
    totals: collections.Counter = collections.Counter()
    for p in evidence:
        subject, commit, verdict = record_fields(p, blobs[p])
        dir_named = any(posixpath.dirname(p) == d or posixpath.dirname(p).startswith(d + "/") for d in named_dirs)
        reliance = classify(path_kinds[p], digest_kinds[p], dir_named)
        totals[reliance] += 1
        rows.append(json.dumps({
            "path": p,
            "sha256": digests[p],
            "family": family_of(p),
            "subject": subject,
            "commit": commit,
            "verdict": verdict,
            "reliance": reliance,
        }, sort_keys=True, ensure_ascii=True, separators=(",", ":")))
    return "".join(r + "\n" for r in rows), totals


def summary(totals: collections.Counter) -> str:
    n = sum(totals.values())
    parts = ", ".join(f"{c} {totals.get(c, 0)}" for c in RELIANCE_CLASSES)
    return f"{n} rows: {parts}"


# ---------------------------------------------------------------- selftest

def _fixture(files: dict[str, str], links: dict[str, str]) -> Path:
    root = Path(tempfile.mkdtemp(prefix="evidence-index-"))
    subprocess.run(["git", "init", "-q", str(root)], check=True)
    for rel, body in files.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(body, encoding="utf-8")
    for rel, target in links.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        os.symlink(target, p)
    subprocess.run(["git", "-C", str(root), "add", "-A"], check=True)
    return root


def _rows(root: Path) -> dict[str, dict]:
    text, _ = build(root)
    return {r["path"]: r for r in map(json.loads, text.splitlines())}


def selftest() -> int:
    import shutil
    E = EVIDENCE_PREFIX
    bound_body = '{"commit": "abcdef1", "verdict": "PASS", "subject": "x/y.ts"}\n'
    bound_digest = hashlib.sha256(bound_body.encode()).hexdigest()
    dig_body = '{"kind": "digest-only"}\n'
    dig_digest = hashlib.sha256(dig_body.encode()).hexdigest()
    nested_body = "nested, named by digest only\n"
    nested_digest = hashlib.sha256(nested_body.encode()).hexdigest()
    dual_body = '{"kind": "path-cited and digest-cited"}\n'
    dual_digest = hashlib.sha256(dual_body.encode()).hexdigest()
    snapshot_row = json.dumps({k: None for k in ROW_KEYS} | {"path": E + "snapped-2026-01-01.json"})
    files = {
        E + "bound-2026-01-01.json": bound_body,
        E + "gov-2026-01-01-v2.json": "{}\n",
        E + "code-2026-01-01.json": "{}\n",
        E + "raw-2026-01-01.json": "{}\n",
        E + "evraw-2026-01-01.json": "{}\n",
        E + "doc-2026-01-01.json": "{}\n",
        E + "digest-2026-01-01.json": dig_body,
        E + "evo-2026-01-01.json": "{}\n",
        E + "listed-2026-01-01.json": "{}\n",
        E + "lonely-2026-01-01-final.json": "{}\n",
        E + "twotail-v3-final.json": "{}\n",
        E + "wrapped-2026-01-01.json": "{}\n",
        E + "stem-only-2026-01-01.json": "{}\n",
        E + "selfnamed-2026-01-01.json": '{"path": "docs/evidence/selfnamed-2026-01-01.json"}\n',
        E + "snapped-2026-01-01.json": "{}\n",
        E + "fam/r1/deep.log": "x\n",
        E + "fam/r1/nested.json": nested_body,
        E + "fam/README.md": "Subject: the fam run\nReviewed commit: 1234567abc\n**Verdict:** CONFIRM\n\nsee `r1/deep.log` and evo-2026-01-01.json.\n",
        E + "fam/HISTORY-1-RAW.md": "cites evraw-2026-01-01.json\n",
        E + "other/main-changed.txt": "docs/evidence/listed-2026-01-01.json\nscripts/tool.py\n",
        E + "pointed-2026-01-01.json": "{}\n",
        E + "fam/POINTER.txt": "pointed-2026-01-01.json\n",
        E + "other/KEPT.sha256": f"{dig_digest.upper()}  ./copy\n",
        ".syzygy/decisions/ACT.md": f"digest {bound_digest}\n`docs/evidence/gov-2026-01-01-v2.json`\n",
        "scripts/tool.py": "# reads docs/evidence/code-2026-01-01.json\n",
        "docs/reviews/R-1-RAW.md": f"Anchor: raw-2026-01-01.json:3\n| `nested.json` | `{nested_digest}` |\n",
        "docs/README.md": "See doc-2026-01-01.json. And `docs/evidence/wrapped-2026-01-01.\njson` here. And stem-only-2026-01-01 only.\n",
        "docs/retention/SNAPSHOT.jsonl": snapshot_row + "\n",
        E + "dual-2026-01-01.json": dual_body,
        E + "other/KEPT2.sha256": f"{dual_digest}  dual-2026-01-01.json\n",
        E + "mixed-target-2026-01-01.json": "{}\n",
        E + "other/mixed.txt": "docs/evidence/mixed-target-2026-01-01.json\nsome prose on a second line\n",
        E + "spec-target-2026-01-01.json": "{}\n",
        "openspec/changes/x/spec.md": "cites spec-target-2026-01-01.json\n",
        E + "subj-obj-2026-01-01.json": '{"subject": {"path": "a/b.ts"}}\n',
        E + "subj-bad-2026-01-01.json": '{"subject": {"path": 3}}\n',
        E + "commits-2026-01-01.json": '{"commit": "NOTHEX", "head": "def5678", "headCommit": "1234abc"}\n',
        E + "empty-a-2026-01-01.json": "",
        E + "empty-b-2026-01-01.json": "",
        "docs/EMPTY.md": f"the empty input digest {EMPTY_SHA256}\n",
        E + "dirfam/r1/inside.json": "x\n",
        E + "dirfam/r1/other.json": "y\n",
        E + "dirfam/top.json": "z\n",
        "docs/NOTES.md": "see the runs under `dirfam/r1/` only\n",
        E + "dirself/a.json": "x\n",
        E + "dirself/NOTE.txt": "this is the dirself/ run\n",
    }
    links = {E + "link-2026-01-01.json": "code-2026-01-01.json"}
    cases: list[tuple[str, bool]] = []
    root = _fixture(files, links)
    try:
        rows = _rows(root)
        rel = lambda name: rows[E + name]["reliance"]  # noqa: E731
        cases.append(("act-bound: digest in a governed file", rel("bound-2026-01-01.json") == "act-bound"))
        cases.append(("governed-citer: path in .syzygy/", rel("gov-2026-01-01-v2.json") == "governed-citer"))
        cases.append(("code-reference: path in scripts/", rel("code-2026-01-01.json") == "code-reference"))
        cases.append(("raw-review-citer: basename in a -RAW.md", rel("raw-2026-01-01.json") == "raw-review-citer"))
        cases.append(("raw-review-citer: a -RAW.md under docs/evidence/ is a raw citer",
                      rel("evraw-2026-01-01.json") == "raw-review-citer"))
        cases.append(("docs-citer: basename in docs/README.md", rel("doc-2026-01-01.json") == "docs-citer"))
        cases.append(("digest-cited: uppercase digest in a sibling manifest", rel("digest-2026-01-01.json") == "digest-cited"))
        cases.append(("digest-cited: nested file named by basename and digest in a raw",
                      rel("fam/r1/nested.json") == "digest-cited"))
        cases.append(("evidence-only: cited from inside docs/evidence/", rel("evo-2026-01-01.json") == "evidence-only"))
        cases.append(("listed-only: named only in a path dump", rel("listed-2026-01-01.json") == "listed-only"))
        cases.append(("evidence-only: a one-token file with no `/` is not a listing",
                      rel("pointed-2026-01-01.json") == "evidence-only"))
        cases.append(("none: no citer", rel("lonely-2026-01-01-final.json") == "none"))
        cases.append(("wrapped code span joins across the line break", rel("wrapped-2026-01-01.json") == "docs-citer"))
        cases.append(("stem without extension is not a citation", rel("stem-only-2026-01-01.json") == "none"))
        cases.append(("same-directory relative path cites", rel("fam/r1/deep.log") == "evidence-only"))
        cases.append(("self-citation by path does not count", rel("selfnamed-2026-01-01.json") == "none"))
        cases.append(("an index snapshot is not a citer", rel("snapped-2026-01-01.json") == "none"))
        cases.append(("a symlink is not a row", E + "link-2026-01-01.json" not in rows))
        cases.append(("family: date and version tokens cut", rows[E + "gov-2026-01-01-v2.json"]["family"] == "gov"
                      and rows[E + "lonely-2026-01-01-final.json"]["family"] == "lonely"))
        cases.append(("family: every trailing version token cut", rows[E + "twotail-v3-final.json"]["family"] == "twotail"))
        cases.append(("family: nested file takes its directory", rows[E + "fam/r1/deep.log"]["family"] == "fam"))
        b = rows[E + "bound-2026-01-01.json"]
        cases.append(("json fields: subject, commit, verdict",
                      (b["subject"], b["commit"], b["verdict"]) == ("x/y.ts", "abcdef1", "PASS")))
        m = rows[E + "fam/README.md"]
        cases.append(("markdown fields: subject, commit, verdict",
                      (m["subject"], m["commit"], m["verdict"]) == ("the fam run", "1234567abc", "CONFIRM")))
        cases.append(("digest-cited outranks evidence-only: path-cited by a sibling and digest-cited",
                      rel("dual-2026-01-01.json") == "digest-cited"))
        cases.append(("a listing needs every line bare: a path line beside prose is an evidence citer",
                      rel("mixed-target-2026-01-01.json") == "evidence-only"))
        cases.append(("openspec/ is a governed citer", rel("spec-target-2026-01-01.json") == "governed-citer"))
        cases.append(("json subject object: its string path", rows[E + "subj-obj-2026-01-01.json"]["subject"] == "a/b.ts"))
        cases.append(("json subject object: a non-string path is null", rows[E + "subj-bad-2026-01-01.json"]["subject"] is None))
        cases.append(("json commit: first valid key in COMMIT_KEYS order wins",
                      rows[E + "commits-2026-01-01.json"]["commit"] == "def5678"))
        cases.append(("the empty-input digest cites no file", rel("empty-a-2026-01-01.json") == "none"
                      and rel("empty-b-2026-01-01.json") == "none"))
        cases.append(("directory-named: a directory cited from outside covers its subtree",
                      rel("dirfam/r1/inside.json") == "directory-named" and rel("dirfam/r1/other.json") == "directory-named"))
        cases.append(("directory-named: a sibling above the cited directory stays none", rel("dirfam/top.json") == "none"))
        cases.append(("directory-named: a citer inside the directory does not count",
                      rel("dirself/a.json") == "none" and rel("dirself/NOTE.txt") == "none"))
        cases.append(("one row per tracked regular file under docs/evidence/", len(rows) == 38))
        first, _ = build(root)
        cases.append(("byte-stable on re-run", build(root)[0] == first))
        (root / "docs/README.md").write_text("nothing here\n", encoding="utf-8")
        cases.append(("a removed citation changes the class", _rows(root)[E + "doc-2026-01-01.json"]["reliance"] == "none"))
    finally:
        shutil.rmtree(root, ignore_errors=True)
    failed = [name for name, ok in cases if not ok]
    for name, ok in cases:
        print(f"{'ok  ' if ok else 'FAIL'} {name}")
    print(f"{len(cases) - len(failed)}/{len(cases)} selftest cases pass")
    return 1 if failed else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--out", metavar="PATH", help="write the index to PATH instead of stdout")
    g.add_argument("--summary", action="store_true", help="print only the class totals")
    g.add_argument("--selftest", action="store_true")
    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    root = Path(subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], check=True, capture_output=True, text=True,
    ).stdout.strip())
    text, totals = build(root)
    if args.summary:
        print(summary(totals))
    elif args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(f"wrote {args.out} ({summary(totals)})", file=sys.stderr)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
