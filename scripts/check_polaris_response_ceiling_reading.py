#!/usr/bin/env python3
"""Check the response-ceiling reading packet (syzygy-dov.27, P-77 Q2).

The packet is a plain owner-direction offering: it binds no digest, so
there is no manifest to build. What can drift is what it quotes and what it
covers. This script checks, read-only:

  C1 every quoted clause is present, whitespace-normalized, both in its
     source file and in the packet;
  C2 the packet names every response ceiling whose registry sentence opens
     "the final encoded HTTP body", in the registry as it stands and as the
     candidate .18 patch would leave it;
  C3 no non-test TypeScript or JavaScript source under apps/*/src or
     packages/*/src carries response compression outside what an issued,
     unwithdrawn direction permits (a sweep over zero files fails). The
     direction permits a coding only through fixed markers: paragraph 1
     ("THE READING.") carries a Q1 (a) or (b) answer, and paragraph 2
     ("WHAT MAY SHIP.") opens with a clause in PERMIT_MARKERS. Today the
     one marker is the issued Q5 (a) clause, which permits gzip: the terms
     zlib, gzip and content-encoding leave the sweep and every other term
     stays in it. A decisions file anywhere under decisions/ closes the
     gate when one of its paragraphs names the direction (file name or
     Decision ID) beside a form of "withdraw" or "narrow", or when it names
     the direction anywhere and carries a labelled "Withdraws:" line.
  C4 the packet keeps its candidate banner, an open-questions section in
     which every question states a default, and no 64-hex digest;
  C5 every candidate patch under contracts/candidates/*/proposed/ that
     targets a quoted file leaves every quote from that file intact, both
     applied alone and composed in sequence with the others (sorted by
     path; a patch that does not apply on top of the earlier ones is
     reported, not failed).

--selftest breaks each predicate in a scratch fixture and confirms failure.

Known limits of C3 (R-DOV27-2 N2/N3, bd syzygy-dov.31), none fail-open on
the issued direction's own text:
  - the sweep is a line-level term match, not a parse: compression reached
    through an alias, a computed import specifier, a dependency other than
    the `compression` package, or a coding name split across lines is not
    seen;
  - unlabelled prose whose naming words and withdrawing words sit in
    different paragraphs (a blank line or a new list item apart) does not
    close the gate, and one that names neither the file nor the Decision ID
    is not seen at all. A record that names the file or Decision ID anywhere
    and carries a labelled "Withdraws:" or "Narrows:" line (also
    "Withdrawn:", "Narrowed:") anywhere closes it, whatever paragraph the
    label sits in (syzygy-xohp); the label is not checked against what it
    withdraws, so an unrelated labelled line in a record naming the
    direction also closes it (fail-closed);
  - any withdrawal or narrowing word closes the gate, whatever it narrows
    (fail-closed);
  - a direction permitting a coding other than gzip opens nothing until
    PERMIT_MARKERS names its clause (fail-closed);
  - the sweep reads apps/*/src and packages/*/src only, minus node_modules,
    dist and test-fixtures, and skips *.test.* files.
  - the two terms originating in the local Git object writer are classified
    from the exact reviewed source bytes. Any source drift returns those
    terms to the ordinary sweep.
"""
from __future__ import annotations

import argparse
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DECISIONS = ".syzygy/governance/decisions"
PACKET = f"{DECISIONS}/POLARIS-RESPONSE-CEILING-READING-DECISION-PACKET.md"
DIRECTION = f"{DECISIONS}/POLARIS-RESPONSE-CEILING-READING-DIRECTION.md"
REGISTRY = ".syzygy/governance/declarations/adapter-registry/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json"
CANDIDATES = ".syzygy/governance/contracts/candidates"
BRIEFING_PATCH = f"{CANDIDATES}/pwb-registry-currency-briefing-amendment/proposed/POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json.patch"
RULINGS = f"{DECISIONS}/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md"
CONTINUATION = f"{DECISIONS}/PWB-IMPLEMENTATION-AUTHORIZATION-CONTINUATION-ACT.md"
RETENTION = f"{DECISIONS}/POLARIS-RETAINED-EVALUATIONS-RETENTION-POSTURE-DIRECTION.md"
ROUTES = "apps/three-surface-poc/src/routes.ts"
SPEC = "openspec/changes/polaris-project-wide-butlers-model/specs/polaris-project-wide-butlers-model/spec.md"
VISION = ".syzygy/governance/doctrine/vision.md"

CEILING_PREFIX = "the final encoded HTTP body"
IN_FORCE_CEILINGS = ("maxHumanResponseBytes", "maxMachineResponseBytes")

QUOTES: tuple[tuple[str, str, str], ...] = (
    ("P-77 Q2 ruling", RULINGS, "Q2 compression needs a dated owner act on the ceiling reading before it ships"),
    ("P-77 registry consequence", RULINGS, "The registry entry is edited on no arm."),
    ("P-79 Q1 ruling", RULINGS, "a retention-posture change needing an owner act before slice 1"),
    ("continuation trigger", CONTINUATION, "a change to the constraints or envelope the 2026-09-05 registry entry declares"),
    ("retention direction shape", RETENTION, "binds no artifact digest, needs no manifest or recorder script"),
    ("human ceiling sentence", REGISTRY, "the final encoded HTTP body for each Polaris HTML response"),
    ("machine ceiling sentence", REGISTRY, "the final encoded HTTP body for each authenticated Polaris machine JSON response"),
    ("final-output breach rule", REGISTRY, "final-output breaches emit only a bounded typed failure carrying evaluation identity, limit identity, declared value, observed value and population counts; no truncated or success-shaped model is emitted"),
    ("measurement line", ROUTES, "const observed = Buffer.byteLength(body, 'utf8');"),
    ("PWB-REQ-006 ceiling sentence", SPEC, "Final encoded human HTML and machine JSON SHALL each have an explicit byte ceiling."),
    ("PWB-REQ-006 scenario title", SPEC, "Resource breach is bounded and explicit"),
    ("PWB-REQ-006 scenario AND", SPEC, "human and machine responses stay within their own declared encoded-byte ceilings"),
    ("PWB-REQ-006 oracle", SPEC, "exact final encoded-byte counts"),
    (".18 briefing sentence", BRIEFING_PATCH, "the final encoded HTTP body for each authenticated derived read-only machine view response"),
    ("VIS-2 heading", VISION, "No evidence means Unknown, not success"),
    ("per-source UTF-8 sentence", REGISTRY, "the exact UTF-8 blob before classification or parsing"),
    ("PWB-REQ-006 primary warrant", SPEC, "primary: SEC-3"),
)

# Each sweep term, with the coding whose permission takes it out of the
# sweep (None: no direction permits it). One selftest line pins each term.
COMPRESSION_TERMS: tuple[tuple[str, str, str | None], ...] = (
    ("zlib", r"zlib", "gzip"),
    ("gzip", r"gzip", "gzip"),
    ("content-encoding", r"content-encoding", "gzip"),
    ("brotli", r"brotli", None),
    ("br literal", r"""['"`]br['"`]""", None),
    ("deflate", r"deflate", None),
    ("CompressionStream", r"CompressionStream", None),
    ("compression package", r"""['"`]compression['"`]""", None),
)
SOURCE_FILE = re.compile(r"\.(?:[mc]?ts|[mc]?js)$")
TEST_FILE = re.compile(r"\.test\.(?:[mc]?ts|[mc]?js)$")

# P-77 Q2 and the issued direction govern the final encoded HTTP body. This
# writer rechecks the audited admission receipt, encodes a Git header and body,
# caps stored bytes, and writes the result only to the held .git/objects fanout.
# Pin the entire source so an additional use, alias or changed sink restores
# the ordinary sweep. Even at that digest only these two term sites qualify.
GIT_OBJECT_STORE = "packages/polaris-dossier/src/git-memory-store.ts"
GIT_OBJECT_STORE_SHA256 = "c3b615c8acd232b28690b02e48542ff7e8c0c78ed70abc0b549228f993257287"
GIT_OBJECT_TERMS = {
    "import { deflateSync } from 'node:zlib';": frozenset({"zlib", "deflate"}),
    "      const encoded = deflateSync(Buffer.concat([header, body]));": frozenset({"deflate"}),
}

# An issued direction opens C3 only through fixed markers: paragraph 1 ("THE
# READING.", up to "WHAT MAY SHIP.") answers Q1 (a) or (b), and paragraph 2
# ("WHAT MAY SHIP.", up to paragraph 3) opens with a clause named here. A
# decline that quotes the reading, or a paragraph 2 that merely mentions a
# coding, opens nothing (R-DOV27-2 M1, M2).
READING = "THE READING."
READING_ANSWERS = (
    "before any HTTP content coding is applied",
    "as sent, after any HTTP content coding",
)
MAY_SHIP = "WHAT MAY SHIP."
PERMIT_MARKERS: tuple[tuple[str, str], ...] = (
    ("gzip response compression, applied only when the client accepts gzip", "gzip"),
)
WITHDRAW = re.compile(r"withdr[ae]w|narrow", re.I)
# A blank line, or the start of a list item, opens a new paragraph.
PARAGRAPH = re.compile(r"\n[ \t>]*\n|\n(?=[ \t>]*(?:\d+\.|[-*+])[ \t])")
# A labelled withdrawal line is Decision-ID-bound by the record naming the
# direction anywhere, not by sharing a paragraph with the name.
WITHDRAW_LABEL = re.compile(r"^[ \t>*_-]*(?:\d+\.[ \t]*)?\**(?:withdraws|withdrawn|narrows|narrowed)\**[ \t]*:", re.I | re.M)
DECISION_ID = re.compile(r"Decision ID:\s*`([^`]+)`")
HEX64 = re.compile(r"(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])")


def normalize(text: str) -> str:
    text = re.sub(r"(?m)^[ \t]*>[ \t]?", "", text)
    text = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1-\2", text)
    return re.sub(r"\s+", " ", text)


def read(root: str, rel: str) -> str | None:
    path = os.path.join(root, rel)
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def check_quotes(root: str) -> list[str]:
    findings = []
    packet = read(root, PACKET)
    if packet is None:
        return [f"C1 packet missing: {PACKET}"]
    npacket = normalize(packet)
    for label, rel, text in QUOTES:
        body = read(root, rel)
        if body is None:
            findings.append(f"C1 {label}: source missing: {rel}")
            continue
        if normalize(text) not in normalize(body):
            findings.append(f"C1 {label}: not found in {rel}")
        if normalize(text) not in npacket:
            findings.append(f"C1 {label}: not quoted in the packet")
    return findings


def _apply_alone(root: str, patch_rel: str, target_rel: str) -> str | None:
    """Return the target's bytes after applying the patch alone, or None."""
    source = read(root, target_rel)
    if source is None:
        return None
    with tempfile.TemporaryDirectory() as tmp:
        dest = os.path.join(tmp, target_rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(source)
        proc = subprocess.run(
            ["git", "apply", "--whitespace=nowarn", os.path.join(root, patch_rel)],
            cwd=tmp, capture_output=True, text=True,
        )
        if proc.returncode != 0:
            return None
        with open(dest, encoding="utf-8") as fh:
            return fh.read()


def response_ceilings(text: str) -> set[str]:
    out = set()
    for key, value in re.findall(r'"(max[A-Za-z]*ResponseBytes)"\s*:\s*"([^"]*)"', text):
        if value.startswith(CEILING_PREFIX):
            out.add(key)
    return out


def check_ceilings(root: str) -> tuple[list[str], set[str]]:
    findings = []
    registry = read(root, REGISTRY)
    packet = read(root, PACKET) or ""
    if registry is None:
        return [f"C2 registry missing: {REGISTRY}"], set()
    keys = response_ceilings(registry)
    if read(root, BRIEFING_PATCH) is not None:
        patched = _apply_alone(root, BRIEFING_PATCH, REGISTRY)
        if patched is None:
            if "maxBriefingResponseBytes" not in registry:
                findings.append("C2 .18 patch neither applies nor has landed")
        else:
            keys |= response_ceilings(patched)
    for key in IN_FORCE_CEILINGS:
        if key not in keys:
            findings.append(f"C2 in-force ceiling {key} not found by the sentence predicate")
    for key in sorted(keys):
        if f"`{key}`" not in packet:
            findings.append(f"C2 response ceiling {key} is not named in the packet")
    return findings, keys


def direction_permits(root: str) -> frozenset[str]:
    """Return the codings an issued, unwithdrawn direction permits."""
    direction = read(root, DIRECTION)
    if direction is None:
        return frozenset()
    words = normalize(direction)
    if READING not in words or MAY_SHIP not in words:
        return frozenset()
    reading = words.split(READING, 1)[1].split(MAY_SHIP, 1)[0]
    if not any(a in reading for a in READING_ANSWERS):
        return frozenset()
    may_ship = re.split(r"\s3\.\s", words.split(MAY_SHIP, 1)[1], maxsplit=1)[0]
    may_ship = re.sub(r"^\s*\[Q5\]\s*", "", may_ship)
    permitted = frozenset(coding for marker, coding in PERMIT_MARKERS if may_ship.startswith(marker))
    if not permitted:
        return frozenset()
    names = [os.path.basename(DIRECTION)] + DECISION_ID.findall(direction)
    base = os.path.join(root, DECISIONS)
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames.sort()
        for entry in sorted(filenames):
            rel = os.path.relpath(os.path.join(dirpath, entry), root).replace(os.sep, "/")
            if rel in (DIRECTION, PACKET) or not entry.endswith(".md"):
                continue
            doc = read(root, rel) or ""
            if any(n in doc for n in names) and WITHDRAW_LABEL.search(doc):
                return frozenset()
            for para in PARAGRAPH.split(doc):
                if any(n in para for n in names) and WITHDRAW.search(para):
                    return frozenset()
    return permitted


def check_no_compression(root: str) -> tuple[list[str], int, frozenset[str]]:
    permitted = direction_permits(root)
    terms = [(label, re.compile(rx, re.I)) for label, rx, coding in COMPRESSION_TERMS
             if coding is None or coding not in permitted]
    findings, scanned = [], 0
    for top in ("apps", "packages"):
        base = os.path.join(root, top)
        if not os.path.isdir(base):
            continue
        for pkg in sorted(os.listdir(base)):
            src = os.path.join(base, pkg, "src")
            for dirpath, dirnames, filenames in os.walk(src):
                dirnames[:] = sorted(d for d in dirnames if d not in ("node_modules", "dist", "test-fixtures"))
                for name in sorted(filenames):
                    if not SOURCE_FILE.search(name) or TEST_FILE.search(name):
                        continue
                    scanned += 1
                    path = os.path.join(dirpath, name)
                    rel = os.path.relpath(path, root)
                    with open(path, encoding="utf-8", newline="") as fh:
                        lines = fh.readlines()
                    local_git_encoding = (rel == GIT_OBJECT_STORE
                                          and hashlib.sha256("".join(lines).encode("utf-8")).hexdigest() == GIT_OBJECT_STORE_SHA256)
                    for n, line in enumerate(lines, 1):
                        local_terms = GIT_OBJECT_TERMS.get(line.rstrip("\r\n"), ()) if local_git_encoding else ()
                        hits = [label for label, rx in terms if label not in local_terms and rx.search(line)]
                        if hits:
                            findings.append(
                                f"C3 compression code ({', '.join(hits)}) outside what a direction permits: {rel}:{n}")
    if scanned == 0:
        findings.append("C3 compression sweep scanned zero source files")
    return findings, scanned, permitted


def check_packet_shape(root: str) -> tuple[list[str], int]:
    packet = read(root, PACKET)
    if packet is None:
        return [f"C4 packet missing: {PACKET}"], 0
    findings = []
    if "**Candidate — binds nothing.**" not in packet:
        findings.append("C4 candidate banner missing")
    section = re.search(r"(?ms)^## Open questions\n(.*?)(?=^## )", packet)
    if section is None:
        return findings + ["C4 no '## Open questions' section"], 0
    questions = re.split(r"(?m)^### ", section.group(1))[1:]
    if not questions:
        findings.append("C4 open-questions section holds no question")
    for q in questions:
        if "**Default if unanswered:**" not in q:
            findings.append(f"C4 question without a default: {q.splitlines()[0]}")
    if HEX64.search(packet):
        findings.append("C4 packet carries a 64-hex digest")
    return findings, len(questions)


def _apply_sequence(root: str, patch_rels: list[str], target_rel: str) -> tuple[str | None, list[str]]:
    """Apply patches in order onto the target; skip any that do not apply."""
    source = read(root, target_rel)
    if source is None:
        return None, patch_rels
    skipped = []
    with tempfile.TemporaryDirectory() as tmp:
        dest = os.path.join(tmp, target_rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as fh:
            fh.write(source)
        for patch_rel in patch_rels:
            proc = subprocess.run(
                ["git", "apply", "--whitespace=nowarn", os.path.join(root, patch_rel)],
                cwd=tmp, capture_output=True, text=True,
            )
            if proc.returncode != 0:
                skipped.append(patch_rel)
        with open(dest, encoding="utf-8") as fh:
            return fh.read(), skipped


def check_composition(root: str) -> tuple[list[str], int, list[str], int, list[str]]:
    by_path: dict[str, list[tuple[str, str]]] = {}
    for label, rel, text in QUOTES:
        by_path.setdefault(rel, []).append((label, text))
    findings, applied, skipped = [], 0, []
    base = os.path.join(root, CANDIDATES)
    patches = []
    if os.path.isdir(base):
        for pkg in sorted(os.listdir(base)):
            pdir = os.path.join(base, pkg, "proposed")
            if os.path.isdir(pdir):
                patches += [f"{CANDIDATES}/{pkg}/proposed/{n}" for n in sorted(os.listdir(pdir)) if n.endswith(".patch")]
    by_target: dict[str, list[str]] = {}
    for patch_rel in patches:
        text = read(root, patch_rel) or ""
        for target in re.findall(r"(?m)^\+\+\+ b/(\S+)", text):
            if target not in by_path:
                continue
            by_target.setdefault(target, []).append(patch_rel)
            after = _apply_alone(root, patch_rel, target)
            if after is None:
                skipped.append(f"{patch_rel} -> {target}")
                continue
            applied += 1
            for label, quote in by_path[target]:
                if normalize(quote) not in normalize(after):
                    findings.append(f"C5 {patch_rel} changes the quoted {label} in {target}")
    composed, not_composed = 0, []
    for target, rels in sorted(by_target.items()):
        after, missed = _apply_sequence(root, rels, target)
        not_composed += [f"{rel} -> {target}" for rel in missed]
        composed += len(rels) - len(missed)
        if after is None:
            continue
        for label, quote in by_path[target]:
            if normalize(quote) not in normalize(after):
                findings.append(f"C5 composed patches to {target} change the quoted {label}")
    return findings, applied, skipped, composed, not_composed


def check(root: str = ROOT, verbose: bool = True) -> list[str]:
    findings = check_quotes(root)
    f2, keys = check_ceilings(root)
    f3, scanned, permitted = check_no_compression(root)
    f4, nq = check_packet_shape(root)
    f5, applied, skipped, composed, not_composed = check_composition(root)
    findings += f2 + f3 + f4 + f5
    if verbose:
        print(f"C1 quoted clauses: {len(QUOTES)} checked in source and packet")
        print(f"C2 response ceilings named: {len(keys)} ({', '.join(sorted(keys))})")
        print(f"C3 compression sweep: {scanned} non-test source files scanned; "
              + (f"an issued direction permits {', '.join(sorted(permitted))}, so its terms leave the sweep"
                 if permitted else "no issued direction permits a coding, so every term is swept"))
        print(f"C4 open questions with a default: {nq}")
        print(f"C5 candidate patches touching quoted files applied alone: {applied}; not applicable alone: {len(skipped)}")
        for s in skipped:
            print(f"   not applicable alone: {s}")
        print(f"C5 the same patches composed in sequence: {composed} applied; not applicable on top: {len(not_composed)}")
        for s in not_composed:
            print(f"   not applicable composed: {s}")
        for f in findings:
            print(f"FAIL {f}")
        print("OK" if not findings else f"{len(findings)} finding(s)")
    return findings


# ---- selftest ------------------------------------------------------------

def _fixture_root(tmp: str) -> str:
    root = os.path.join(tmp, "root")
    rels = {PACKET, REGISTRY, RULINGS, CONTINUATION, RETENTION, ROUTES, SPEC, VISION}
    base = os.path.join(ROOT, CANDIDATES)
    for pkg in os.listdir(base):
        pdir = os.path.join(base, pkg, "proposed")
        if os.path.isdir(pdir):
            rels |= {f"{CANDIDATES}/{pkg}/proposed/{n}" for n in os.listdir(pdir) if n.endswith(".patch")}
    for rel in rels:
        dest = os.path.join(root, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(os.path.join(ROOT, rel), dest)
    return root


def _edit(root: str, rel: str, old: str, new: str) -> None:
    path = os.path.join(root, rel)
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    if old not in text:
        raise AssertionError(f"selftest fixture: {old!r} not in {rel}")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text.replace(old, new))


def _edit_ws(root: str, rel: str, phrase: str, new: str) -> None:
    """Replace every occurrence of phrase, however it is wrapped."""
    path = os.path.join(root, rel)
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    pattern = r"\s+(?:>\s*)?".join(re.escape(w) for w in phrase.split())
    text, n = re.subn(pattern, new, text)
    if n == 0:
        raise AssertionError(f"selftest fixture: {phrase!r} not in {rel}")
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def _sibling_patch(root: str) -> None:
    rel = SPEC
    with open(os.path.join(root, rel), encoding="utf-8") as fh:
        lines = fh.read().splitlines(keepends=True)
    idx = next(i for i, line in enumerate(lines) if "explicit byte ceiling." in line)
    new = lines[:idx] + [lines[idx].replace("explicit byte ceiling.", "explicit byte allowance.")] + lines[idx + 1:]
    import difflib
    diff = "".join(difflib.unified_diff(lines, new, f"a/{rel}", f"b/{rel}"))
    dest = os.path.join(root, CANDIDATES, "zz-selftest", "proposed", "spec.md.patch")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(f"diff --git a/{rel} b/{rel}\n" + diff)


VALID_DIRECTION = (
    "# Direction\n\nDecision ID: `SELFTEST-DIR-1`\n\n1. THE READING. Each response ceiling is measured on the body "
    "before any HTTP content coding is applied.\n\n2. WHAT MAY SHIP. [Q5] gzip response compression, applied only "
    "when the client accepts gzip and only when the result is smaller.\n\n3. WHAT DOES NOT CHANGE. The ceilings.\n"
)
# R-DOV27-2 M2: a Q1 (c) decline that quotes the reading and names codings.
DECLINE_DIRECTION = (
    "# Direction\n\n1. THE READING. Declined: the packet's reading, \"before any HTTP content coding is "
    "applied\", is not adopted.\n\n2. WHAT MAY SHIP. No gzip, no brotli.\n"
)


def _write(root: str, rel: str, text: str) -> None:
    path = os.path.join(root, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(text)


def _gzip_code(root: str) -> None:
    """Code the issued gzip direction permits: zlib, gzip and content-encoding."""
    _land_compression(root, "const body = zlib.gzipSync(raw); res.setHeader('Content-Encoding', 'gzip');")


def _issue_direction(root: str, text: str = VALID_DIRECTION) -> None:
    with open(os.path.join(root, DIRECTION), "w", encoding="utf-8") as fh:
        fh.write(text)


def _land_compression(root: str, line: str = "const gz = require('node:zlib');") -> None:
    _edit(root, ROUTES, "const observed = Buffer", f"{line}\n  const observed = Buffer")


def _copy_git_store(root: str, rel: str = GIT_OBJECT_STORE) -> None:
    dest = os.path.join(root, rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copyfile(os.path.join(ROOT, GIT_OBJECT_STORE), dest)


def _edit_git_store(root: str, old: str, new: str) -> None:
    _copy_git_store(root)
    _edit(root, GIT_OBJECT_STORE, old, new)


def _write_patch(root: str, name: str, before: list[str], after: list[str]) -> None:
    import difflib
    diff = "".join(difflib.unified_diff(before, after, f"a/{SPEC}", f"b/{SPEC}"))
    dest = os.path.join(root, CANDIDATES, name, "proposed", "spec.md.patch")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "w", encoding="utf-8") as fh:
        fh.write(f"diff --git a/{SPEC} b/{SPEC}\n" + diff)


def _composed_patches(root: str) -> None:
    """a inserts a line after the quoted sentence; b, written on top of a,
    rewrites the quote. b alone does not apply; a then b does.

    Both are written over the text the real candidate patches already compose
    to (they sort after every real package), so a real candidate that rewrites
    the spec around the quote cannot leave the pair inapplicable and hide the
    composition this case exists to catch."""
    base = os.path.join(root, CANDIDATES)
    real = sorted(
        f"{CANDIDATES}/{pkg}/proposed/{n}"
        for pkg in os.listdir(base)
        if os.path.isdir(os.path.join(base, pkg, "proposed"))
        for n in os.listdir(os.path.join(base, pkg, "proposed"))
        if n.endswith(".patch")
        and f"+++ b/{SPEC}\n" in (read(root, f"{CANDIDATES}/{pkg}/proposed/{n}") or ""))
    composed, _ = _apply_sequence(root, real, SPEC)
    lines = (composed or "").splitlines(keepends=True)
    idx = next(i for i, line in enumerate(lines) if "explicit byte ceiling." in line)
    with_a = lines[:idx + 1] + ["Selftest inserted line.\n"] + lines[idx + 1:]
    with_b = with_a[:idx] + [with_a[idx].replace("explicit byte ceiling.", "explicit byte allowance.")] + with_a[idx + 1:]
    _write_patch(root, "zz-selftest-a", lines, with_a)
    _write_patch(root, "zz-selftest-b", with_a, with_b)


def selftest() -> int:
    cases = [
        ("baseline passes", None, None, True),
        ("C1 source quote drifts", "C1", lambda r: _edit(r, RULINGS, "The registry entry is edited on no arm.", "The registry entry is left alone."), False),
        ("C1 packet drops a quote", "C1", lambda r: _edit_ws(r, PACKET, "The registry entry is edited on no arm.", "The registry is left alone."), False),
        ("C2 registry gains an unnamed response ceiling", "C2", lambda r: _edit(r, REGISTRY, '"maxHumanResponseBytes": "the final', '"maxOtherResponseBytes": "the final encoded HTTP body for x",\n        "maxHumanResponseBytes": "the final'), False),
        ("C2 packet drops the briefing ceiling", "C2", lambda r: _edit(r, PACKET, "`maxBriefingResponseBytes`", "`the briefing ceiling`"), False),
        ("C3 compression code lands before a direction", "C3", lambda r: _edit(r, ROUTES, "const observed = Buffer", "const gz = require('node:zlib');\n  const observed = Buffer"), False),
        ("C3 an issued gzip direction permits zlib, gzip and content-encoding", None, lambda r: (_gzip_code(r), _issue_direction(r)), True),
        ("C3 M1 a paragraph 2 that mentions gzip without the marker does not gate", "C3", lambda r: (_gzip_code(r), _issue_direction(r, VALID_DIRECTION.replace("[Q5] gzip response compression, applied only when the client accepts gzip and only when the result is smaller.", "Nothing. gzip is not permitted."))), False),
        ("C3 M2 a decline quoting the reading does not gate", "C3", lambda r: (_gzip_code(r), _issue_direction(r, DECLINE_DIRECTION)), False),
        ("C3 the reading answered outside paragraph 1 does not gate", "C3", lambda r: (_gzip_code(r), _issue_direction(r, VALID_DIRECTION.replace("measured on the body before any HTTP content coding is applied.", "left open.").replace("3. WHAT DOES NOT CHANGE.", "3. WHAT DOES NOT CHANGE. Measured before any HTTP content coding is applied."))), False),
        ("C3 K10 the marker outside paragraph 2 does not gate", "C3", lambda r: (_gzip_code(r), _issue_direction(r, VALID_DIRECTION.replace("2. WHAT MAY SHIP. [Q5] gzip", "2. WHAT MAY SHIP. Nothing.\n\n4. NOTE. gzip"))), False),
        ("C3 M3 a withdrawal in a subdirectory reopens the sweep", "C3", lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/sub/W.md", "The owner withdrew POLARIS-RESPONSE-CEILING-READING-DIRECTION.md.\n")), False),
        ("C3 M4 a narrowing record reopens the sweep", "C3", lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/SELFTEST-NARROWING.md", "Direction SELFTEST-DIR-1 is narrowed: no coding may ship.\n")), False),
        ("C3 M5 a gzip direction does not permit Brotli", "C3", lambda r: (_issue_direction(r), _land_compression(r, "const b = zlib.createBrotliCompress();")), False),
        ("C3 M6 the name and a withdrawal word in different paragraphs do not close the gate", None, lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/SELFTEST-SHAPE.md", "Recorded in the shape of `POLARIS-RESPONSE-CEILING-READING-DIRECTION.md`.\n\n6. **Withdrawal.** A later direction may narrow or withdraw this one; withdrawal defeats grant.\n")), True),
        ("C3 M6 the name and a withdrawal word in sibling list items do not close the gate", None, lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/SELFTEST-ITEMS.md", "1. A slope target is withdrawn.\n2. Compression (see `POLARIS-RESPONSE-CEILING-READING-DIRECTION.md`) changes bytes sent.\n")), True),
        ("C3 a list item naming the direction beside a withdrawal closes the gate", "C3", lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/SELFTEST-LIST.md", "1. Unrelated.\n2. `POLARIS-RESPONSE-CEILING-READING-DIRECTION.md` is withdrawn.\n")), False),
        ("C3 xohp a labelled withdrawal in another paragraph than the name closes the gate", "C3", lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/SELFTEST-LABEL.md", "# Record\n\nSubject: `SELFTEST-DIR-1`.\n\nRationale: the slope target moved.\n\nWithdraws: this direction.\n")), False),
        ("C3 xohp a labelled withdrawal in a record that does not name the direction does not close the gate", None, lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/SELFTEST-OTHER.md", "# Other\n\nSubject: `OTHER-DIR-9`.\n\nWithdraws: that one.\n")), True),
        ("C3 xohp unlabelled withdrawal prose in another paragraph than the name does not close the gate", None, lambda r: (_gzip_code(r), _issue_direction(r), _write(r, f"{DECISIONS}/SELFTEST-PROSE.md", "Subject: `SELFTEST-DIR-1`.\n\nThe slope target was withdrawn.\n")), True),
        ("C3 an empty direction file does not gate", "C3", lambda r: (_land_compression(r), _issue_direction(r, "")), False),
        ("C3 a direction without a Q1 reading does not gate", "C3", lambda r: (_land_compression(r), _issue_direction(r, VALID_DIRECTION.replace("before any HTTP content coding is applied", "somehow"))), False),
        ("C3 a direction without WHAT MAY SHIP does not gate", "C3", lambda r: (_land_compression(r), _issue_direction(r, VALID_DIRECTION.replace("WHAT MAY SHIP.", "SHIPPING."))), False),
        ("C3 a direction that ships no coding does not gate", "C3", lambda r: (_land_compression(r), _issue_direction(r, VALID_DIRECTION.replace("[Q5] gzip response compression, applied only when the client accepts gzip and only when the result is smaller.", "Nothing."))), False),
        ("C3 a withdrawal record reopens the sweep", "C3", lambda r: (_land_compression(r), _issue_direction(r), open(os.path.join(r, DECISIONS, "SELFTEST-WITHDRAWAL.md"), "w").write("The owner withdrew POLARIS-RESPONSE-CEILING-READING-DIRECTION.md.\n")), False),
        ("C3 term zlib is caught", "C3", lambda r: _land_compression(r, "import * as z from 'node:zlib';"), False),
        ("C3 term gzip is caught", "C3", lambda r: _land_compression(r, "const body = gzipSync(raw);"), False),
        ("C3 term content-encoding is caught", "C3", lambda r: _land_compression(r, "res.setHeader('Content-Encoding', enc);"), False),
        ("C3 term brotli is caught", "C3", lambda r: _land_compression(r, "const b = brotliCompressSync(raw);"), False),
        ("C3 term deflate is caught", "C3", lambda r: _land_compression(r, "const d = deflateRawSync(raw);"), False),
        ("C3 term CompressionStream is caught", "C3", lambda r: _land_compression(r, "const cs = new CompressionStream(mode);"), False),
        ("C3 M8 a 'br' literal is caught", "C3", lambda r: _land_compression(r, "const enc = 'br';"), False),
        ("C3 M7 the compression package is caught", "C3", lambda r: _land_compression(r, "import compression from 'compression';"), False),
        ("C3 M9 a .js source under src is swept", "C3", lambda r: _write(r, "apps/three-surface-poc/src/extra.js", "const z = require('zlib');\n"), False),
        ("C3 M9 a .mjs source under src is swept", "C3", lambda r: _write(r, "apps/three-surface-poc/src/extra.mjs", "import z from 'zlib';\n"), False),
        ("C3 exact on-disk Git encoding needs no HTTP direction", None, _copy_git_store, True),
        ("C3 exact Git store does not hide a response deflate under the gzip direction", "C3", lambda r: (_copy_git_store(r), _issue_direction(r), _land_compression(r, "const served = deflateSync(response);")), False),
        ("C3 the same Git source at a different path is swept", "C3", lambda r: _copy_git_store(r, "apps/three-surface-poc/src/extra.ts"), False),
        ("C3 an extra call in the Git writer is swept", "C3", lambda r: _edit_git_store(r, "storedBytes += encoded.byteLength;", "deflateSync(body);\n      storedBytes += encoded.byteLength;"), False),
        ("C3 an extra use of the Git encoded bytes is swept", "C3", lambda r: _edit_git_store(r, "storedBytes += encoded.byteLength;", "return encodeForResponse(encoded);\n      storedBytes += encoded.byteLength;"), False),
        ("C3 a changed Git output sink is swept", "C3", lambda r: _edit_git_store(r, "await write(bucket, object.oid.slice(2), encoded);", "await response.write(encoded);"), False),
        ("C3 a changed file writer sink is swept", "C3", lambda r: _edit_git_store(r, "await handle.writeFile(bytes);", "await response.write(bytes);"), False),
        ("C3 sweep over zero files", ("C3", "C1"), lambda r: shutil.rmtree(os.path.join(r, "apps")), False),
        ("C4 banner removed", "C4", lambda r: _edit(r, PACKET, "**Candidate — binds nothing.**", "**Draft.**"), False),
        ("C4 a question loses its default", "C4", lambda r: _edit(r, PACKET, "**Default if unanswered:** (a). No new dependency", "No new dependency"), False),
        ("C4 packet quotes a 64-hex digest", "C4", lambda r: _edit(r, PACKET, "## Impact\n", "## Impact\n\n" + "ab" * 32 + "\n"), False),
        ("C5 a sibling patch rewrites a quoted sentence", "C5", _sibling_patch, False),
        ("C5 two patches composed rewrite a quoted sentence", "C5", _composed_patches, False),
    ]
    failed = 0
    for name, prefix, mutate, expect_ok in cases:
        with tempfile.TemporaryDirectory() as tmp:
            root = _fixture_root(tmp)
            if mutate is not None:
                mutate(root)
            findings = check(root, verbose=False)
            if expect_ok:
                ok = not findings
            else:
                allowed = prefix if isinstance(prefix, tuple) else (prefix,)
                ok = any(f.startswith(allowed[0]) for f in findings) and all(f.startswith(allowed) for f in findings)
            print(f"{'PASS' if ok else 'FAIL'} {name}" + ("" if ok else f": {findings}"))
            failed += not ok
    print(f"selftest: {len(cases) - failed}/{len(cases)} passed")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true")
    group.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    return 1 if check() else 0


if __name__ == "__main__":
    sys.exit(main())
