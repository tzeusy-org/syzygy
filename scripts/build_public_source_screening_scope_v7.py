#!/usr/bin/env python3
"""Build and verify the inert public-source screening-scope version-7 package.

Package `contracts/candidates/public-source-screening-scope-v7/` (`syzygy-pdja.5`, owner directions
OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06 item 2 and OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06 item 3,
answer A: script-only, no withheld-line change). This script performs no owner act and writes no act record.

The subject is the policy AFTER version 6: the bytes of the version-6 manifest row `p` (performed 2026-11-05). The
builder takes the policy on disk when it hashes to that row, or recovers it by reversing this package's own patch when
the disk is this package's row.

One variant, `s`, one manifest row. It changes one sentence of `codeContentExemption.renderCondition`, and
`policyVersion`. `projectDocumentationExemption.renderCondition` reads that condition, so it follows with no edit. Nothing
else may change.

`csp_finding` below is this package's reading of the new sentence's mechanical half, in Python, for the counterexample
table; the install implements the same reading in `pageSinkCspFinding`. The sentence's other half (what the script's
fixed bytes do) is the renderer's and its tests', and no CSP string can show it.

  --write             regenerate the patch and the manifest
  --check             verify the package against the policy on disk
  --digests           print the manifest row (refuses while stale)
  --manifest-digest   print the SHA-256 of the manifest FILE (refuses while stale)
  --score             print the counterexample table
  --selftest          mutate each predicate; each must fail

Review-head contract for a recorder written after a confirming review: the raw's first four non-blank lines are the
title, `Reviewed commit: <40 hex>`, `Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>` and
`Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`.
"""

from __future__ import annotations

import copy
import hashlib
import inspect
import json
import pathlib
import re
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_source_screening_scope_v2 as v2  # noqa: E402
import build_public_source_screening_scope_v3 as v3  # noqa: E402
import build_public_source_screening_scope_v4 as v4  # noqa: E402
import build_public_source_screening_scope_v5 as v5  # noqa: E402
import build_public_source_screening_scope_v6 as v6  # noqa: E402

POLICY = v6.POLICY
SCOPE_KEY = v6.SCOPE_KEY
PKG = pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v7")
MANIFEST = PKG / "PUBLIC-SOURCE-SCREENING-SCOPE-V7-MANIFEST.txt"
V6_BASE_VARIANT = "p"
VARIANTS = ("s",)

OLD_CLAUSE = ("whose default-src source list is exactly 'none' and which carries no script-src, script-src-elem, "
              "script-src-attr or object-src directive.")
NEW_CLAUSE = (
    "whose directives are exactly default-src 'none', style-src 'unsafe-inline', base-uri 'none' and form-action 'none', "
    "each once with that one source, and at most one script-src, which comes with require-trusted-types-for 'script' and "
    "only then; no other directive is lawful, and a policy holding any non-ASCII byte, whitespace included, fails this "
    "condition. A script-src's source list is one or more 'sha256-<base64>' hash sources and nothing else. Each such hash "
    "is of one inline script with no src attribute that the renderer itself writes: its bytes are fixed in the renderer "
    "and derive from no body; it opens no connection and loads nothing (no fetch, XMLHttpRequest, sendBeacon, WebSocket, "
    "EventSource, WebTransport, RTCPeerConnection, Worker or window.open); it creates no element outside a list the "
    "renderer fixes, which never holds script, link, meta, base, form, iframe, object, embed, img, audio, video, source, "
    "track or style, and it sets no attribute that holds a URL; it never turns page text into code or markup (no eval, "
    "no Function, no string timer, no innerHTML, outerHTML, insertAdjacentHTML, document.write, DOMParser or "
    "createContextualFragment, no handler attribute); it writes page text only as text; it navigates only by a fragment "
    "of the current page or an href the renderer wrote; and it stores no page text. Every page reads and navigates "
    "completely with scripts off.")


def patch_path(variant: str) -> pathlib.Path:
    return PKG / "proposed" / f"{POLICY.name}.{variant}.patch"


def v7_scope(scope6: dict) -> dict:
    s = copy.deepcopy(scope6)
    exemption = s["activeContent"]["codeContentExemption"]
    text = exemption["renderCondition"]
    if text.count(OLD_CLAUSE) != 1:
        raise ValueError("the version-6 renderCondition does not carry the clause this version replaces")
    exemption["renderCondition"] = text.replace(OLD_CLAUSE, NEW_CLAUSE, 1)
    return s


def next_version(version: str) -> str:
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)(-.+)", version)
    if not m:
        raise ValueError(f"unparseable policyVersion {version}")
    return f"{m.group(1)}.{int(m.group(2)) + 1}.0{m.group(4)}.v7-s"


def propose(base_text: str, variant: str = "s") -> str:
    if variant not in VARIANTS:
        raise ValueError(f"unknown variant {variant}")
    base = json.loads(base_text)
    old = v2.block(base[SCOPE_KEY])
    if base_text.count(old) != 1:
        raise ValueError("the version-6 scope block is not found exactly once in its own bytes")
    version = f'  "policyVersion": "{base["policyVersion"]}",\n'
    if base_text.count(version) != 1:
        raise ValueError("policyVersion line not found exactly once")
    out = base_text.replace(old, v2.block(v7_scope(base[SCOPE_KEY])), 1)
    out = out.replace(version, f'  "policyVersion": "{next_version(base["policyVersion"])}",\n', 1)
    got = json.loads(out)
    expected = dict(base)
    expected["policyVersion"] = next_version(base["policyVersion"])
    expected[SCOPE_KEY] = v7_scope(base[SCOPE_KEY])
    if got != expected or list(got) != list(base):
        raise ValueError("text replacement changed something other than the scope block and policyVersion")
    return out


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def manifest_rows(root: pathlib.Path) -> dict[str, str]:
    path = root / MANIFEST
    if not path.is_file():
        return {}
    return {m.group(2): m.group(1) for m in
            re.finditer(r"^([0-9a-f]{64})  \S+  \[variant: ([\w-]+)\]$", path.read_text(), re.M)}


def manifest_text(proposeds: dict[str, str]) -> str:
    rows = "".join(f"{sha(proposeds[v])}  {POLICY.as_posix()}  [variant: {v}]\n" for v in VARIANTS)
    return ("# PUBLIC-SOURCE SCREENING SCOPE VERSION 7 MANIFEST\n"
            "# Candidate; this file and its row bind nothing by themselves.\n"
            "# 1 row, variant s (renderer-owned hash-allowed inline script). The row hashes\n"
            "# the PROPOSED bytes (the version-6 policy, variant p, with\n"
            "# proposed/<name>.s.patch applied). The row is the argument of one\n"
            "# superseding approve-policy act, or of none.\n"
            + rows)


def base_bytes(root: pathlib.Path = ROOT) -> tuple[str, str]:
    want = v6.manifest_rows(root).get(V6_BASE_VARIANT)
    if want is None:
        raise ValueError("the version-6 manifest has no row for variant p")
    disk_text = (root / POLICY).read_text()
    if sha(disk_text) == want:
        return disk_text, "prospective"
    own = [v for v, dg in manifest_rows(root).items() if dg == sha(disk_text)]
    if own and (root / patch_path(own[0])).is_file():
        back = v2.reverse_patch((root / patch_path(own[0])).read_text(), disk_text)
        if sha(back) != want:
            raise ValueError("reversing this package's patch over the policy on disk does not give the version-6 bytes")
        return back, "performed-v7"
    raise ValueError("the policy on disk is neither the version-6 variant-p bytes nor this package's row; "
                     "the base is unknown")


# --- the mechanical half of the sentence ------------------------------------------------------------------------

FIXED = {"default-src": "'none'", "style-src": "'unsafe-inline'", "base-uri": "'none'", "form-action": "'none'"}
OPTIONAL = ("script-src", "require-trusted-types-for")
HASH_SOURCE = re.compile(r"'sha256-[A-Za-z0-9+/]{43}='")
ASCII_WHITESPACE = re.compile(r"[\t\n\f\r ]+")


READING_MUTANTS = (
    ('ASCII_WHITESPACE.split(part)', 'part.split()'),
    ('directives = [d for d in directives if d]', 'pass'),
    ('names = [d[0].lower() for d in directives]', 'names = [d[0] for d in directives]'),
    ('if name not in FIXED and name not in OPTIONAL:', 'if False:'),
    ('if names.count(name) != 1:', 'if False:'),
    ('sources = {d[0].lower(): d[1:] for d in directives}', 'sources = {d[0]: d[1:] for d in directives}'),
    ('if name not in sources:', 'if False:'),
    ('len(sources[name]) != 1 or ', ''),
    ('sources[name][0].lower() != source', 'sources[name][0] != source'),
    ('or sources[name][0].lower() != source', ''),
    ('if ("script-src" in sources) != ("require-trusted-types-for" in sources):', 'if False:'),
    ('if len(types) != 1 or types[0].lower() != "\'script\'":', 'if False:'),
    ('if not sources["script-src"]:', 'if False:'),
    ('if not HASH_SOURCE.fullmatch(source):', 'if not HASH_SOURCE.match(source):'),
    ('if not HASH_SOURCE.fullmatch(source):', 'if False:'),
)


def csp_finding(content: str) -> str | None:
    directives = [[t for t in ASCII_WHITESPACE.split(part) if t] for part in content.split(";")]
    directives = [d for d in directives if d]
    names = [d[0].lower() for d in directives]
    for name in names:
        if name not in FIXED and name not in OPTIONAL:
            return f"carries {name}"
        if names.count(name) != 1:
            return f"repeats {name}"
    sources = {d[0].lower(): d[1:] for d in directives}
    for name, source in FIXED.items():
        if name not in sources:
            return f"{name} is absent"
        if len(sources[name]) != 1 or sources[name][0].lower() != source:
            return f"{name} is not exactly {source}"
    if ("script-src" in sources) != ("require-trusted-types-for" in sources):
        return "script-src and require-trusted-types-for must come together"
    if "script-src" not in sources:
        return None
    types = sources["require-trusted-types-for"]
    if len(types) != 1 or types[0].lower() != "'script'":
        return "require-trusted-types-for is not exactly 'script'"
    if not sources["script-src"]:
        return "script-src has no source"
    for source in sources["script-src"]:
        if not HASH_SOURCE.fullmatch(source):
            return f"script-src carries {source}"
    return None


_H = "'sha256-" + "A" * 43 + "='"
_H2 = "'sha256-" + "B" * 43 + "='"
_REST = "style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
_TT = "require-trusted-types-for 'script'"
_D = "default-src 'none'"
_S = f"script-src {_H}; {_TT}"
#: name, CSP content, allowed under version 7. Today's page must stay lawful.
CSP_TABLE = [
    ("today's page, no script", f"{_D}; {_REST}", True),
    ("one hash", f"{_D}; {_S}; {_REST}", True),
    ("two hashes", f"{_D}; script-src {_H} {_H2}; {_TT}; {_REST}", True),
    ("directive names in upper case", f"DEFAULT-SRC 'none'; SCRIPT-SRC {_H}; {_TT}; {_REST}", True),
    ("'NONE' in upper case", f"default-src 'NONE'; {_REST}", True),
    ("a trailing semicolon and tabs", f"default-src\t'none'; {_REST};", True),
    ("unsafe-inline beside a hash", f"{_D}; script-src {_H} 'unsafe-inline'; {_TT}; {_REST}", False),
    ("unsafe-eval", f"{_D}; script-src {_H} 'unsafe-eval'; {_TT}; {_REST}", False),
    ("unsafe-hashes", f"{_D}; script-src {_H} 'unsafe-hashes'; {_TT}; {_REST}", False),
    ("wasm-unsafe-eval", f"{_D}; script-src {_H} 'wasm-unsafe-eval'; {_TT}; {_REST}", False),
    ("strict-dynamic", f"{_D}; script-src {_H} 'strict-dynamic'; {_TT}; {_REST}", False),
    ("self", f"{_D}; script-src 'self'; {_TT}; {_REST}", False),
    ("script-src none", f"{_D}; script-src 'none'; {_TT}; {_REST}", False),
    ("a nonce", f"{_D}; script-src 'nonce-abc'; {_TT}; {_REST}", False),
    ("a host", f"{_D}; script-src {_H} https://example.test; {_TT}; {_REST}", False),
    ("a scheme", f"{_D}; script-src {_H} https:; {_TT}; {_REST}", False),
    ("a data scheme", f"{_D}; script-src data:; {_TT}; {_REST}", False),
    ("a short hash", f"{_D}; script-src 'sha256-AAAA'; {_TT}; {_REST}", False),
    ("a hash with a trailing source glued on", f"{_D}; script-src {_H}x; {_TT}; {_REST}", False),
    ("a sha512 hash", f"{_D}; script-src 'sha512-{'A' * 86}=='; {_TT}; {_REST}", False),
    ("no source at all", f"{_D}; script-src; {_TT}; {_REST}", False),
    ("two script-src directives", f"{_D}; script-src {_H}; script-src {_H2}; {_TT}; {_REST}", False),
    ("script-src with no trusted types", f"{_D}; script-src {_H}; {_REST}", False),
    ("trusted types with no script-src", f"{_D}; {_TT}; {_REST}", False),
    ("trusted types for something else", f"{_D}; script-src {_H}; require-trusted-types-for 'none'; {_REST}", False),
    ("default-src not none", f"default-src 'self'; {_S}; {_REST}", False),
    ("default-src absent", f"{_S}; {_REST}", False),
    ("default-src with a second source", f"default-src 'none' https:; {_REST}", False),
    ("default-src with no source", f"default-src; {_REST}", False),
    ("two default-src directives", f"{_D}; {_D}; {_REST}", False),
    ("a non-breaking space, which a browser does not split", f"default-src\u00a0'none'; {_REST}", False),
    ("a vertical tab, which a browser does not split", f"default-src\x0b'none'; {_REST}", False),
    ("style-src absent", f"{_D}; base-uri 'none'; form-action 'none'", False),
    ("base-uri absent", f"{_D}; style-src 'unsafe-inline'; form-action 'none'", False),
    ("form-action absent", f"{_D}; style-src 'unsafe-inline'; base-uri 'none'", False),
    ("style-src with a host", f"{_D}; style-src 'unsafe-inline' https://example.test; base-uri 'none'; form-action 'none'", False),
    ("base-uri open", f"{_D}; style-src 'unsafe-inline'; base-uri *; form-action 'none'", False),
    ("form-action open", f"{_D}; style-src 'unsafe-inline'; base-uri 'none'; form-action *", False),
]
for _name in ("script-src-elem", "script-src-attr", "object-src", "connect-src", "worker-src", "child-src", "frame-src",
              "navigate-to", "img-src", "font-src", "media-src", "manifest-src", "report-uri", "report-to", "sandbox",
              "upgrade-insecure-requests", "trusted-types"):
    CSP_TABLE.append((_name, f"{_D}; {_S}; {_name} *; {_REST}", False))


def semantic_findings(base_text: str, proposed_text: str) -> list[str]:
    findings: list[str] = []
    base, proposed = json.loads(base_text), json.loads(proposed_text)
    changed = [k for k in base if base[k] != proposed.get(k)]
    if sorted(changed) != sorted(["policyVersion", SCOPE_KEY]) or list(base) != list(proposed):
        findings.append(f"top-level change outside policyVersion and the scope: {changed}")
    undo = copy.deepcopy(proposed[SCOPE_KEY])
    exemption = undo["activeContent"]["codeContentExemption"]
    if exemption["renderCondition"].count(NEW_CLAUSE) != 1:
        findings.append("the new clause is not in renderCondition exactly once")
    exemption["renderCondition"] = exemption["renderCondition"].replace(NEW_CLAUSE, OLD_CLAUSE, 1)
    if undo != base[SCOPE_KEY]:
        findings.append("the scope changes somewhere other than the one clause")
    for term in ("are exactly default-src 'none'", "no other directive is lawful", "derive from no body", "with scripts off",
                 "opens no connection", "creates no element outside a list",
                 "no handler attribute", "written as a character reference"):
        if term not in proposed[SCOPE_KEY]["activeContent"]["codeContentExemption"]["renderCondition"]:
            findings.append(f"renderCondition lost {term!r}")
    return findings


def table_findings() -> list[str]:
    return [f"CSP {name!r}: expected {'allowed' if ok else 'refused'}, got {csp_finding(content)}"
            for name, content, ok in CSP_TABLE if (csp_finding(content) is None) != ok]


def check(root: pathlib.Path = ROOT) -> list[str]:
    findings: list[str] = []
    try:
        base, _mode = base_bytes(root)
        proposeds = {v: propose(base, v) for v in VARIANTS}
    except (ValueError, OSError) as exc:
        return [str(exc)]
    for v, proposed in proposeds.items():
        path = root / patch_path(v)
        if not path.is_file() or path.read_text() != v3.unified(base, proposed):
            findings.append(f"{v}: patch differs from its regeneration over the version-6 bytes")
        else:
            try:
                if v2.v1.apply_patch(root, base, path.read_text()) != proposed:
                    findings.append(f"{v}: applying the patch does not yield the proposed bytes")
            except ValueError as exc:
                findings.append(f"{v}: {exc}")
        findings += [f"{v}: {f}" for f in semantic_findings(base, proposed)]
    findings += table_findings()
    if not (root / MANIFEST).is_file() or (root / MANIFEST).read_text() != manifest_text(proposeds):
        findings.append("manifest differs from its regeneration")
    present = sorted(p.name for p in (root / PKG / "proposed").glob("*")) if (root / PKG / "proposed").is_dir() else []
    if present != sorted(patch_path(v).name for v in VARIANTS):
        findings.append(f"proposed/ holds {present}, not exactly the declared patch")
    for md in sorted((root / PKG).glob("*.md")):
        if re.search(r"(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])", md.read_text()):
            findings.append(f"{md.name}: carries a 64-hex token; the argument comes only from the manifest row")
    return findings


def write(root: pathlib.Path = ROOT) -> None:
    base, _mode = base_bytes(root)
    proposeds = {v: propose(base, v) for v in VARIANTS}
    (root / PKG / "proposed").mkdir(parents=True, exist_ok=True)
    for v, proposed in proposeds.items():
        (root / patch_path(v)).write_text(v3.unified(base, proposed))
    (root / MANIFEST).write_text(manifest_text(proposeds))


def score() -> str:
    rows = [f"{'allowed' if csp_finding(c) is None else 'refused'}  {name}" for name, c, _ok in CSP_TABLE]
    return "\n".join(rows) + "\n"


def _fixture(tmp: pathlib.Path) -> pathlib.Path:
    for rel in (POLICY, v6.MANIFEST, v5.MANIFEST, v4.MANIFEST, v3.MANIFEST):
        (tmp / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / rel, tmp / rel)
    if (ROOT / PKG).is_dir():
        shutil.copytree(ROOT / PKG, tmp / PKG, ignore=shutil.ignore_patterns("reviews"))
    else:
        (tmp / PKG).mkdir(parents=True)
    write(tmp)
    return tmp


def selftest() -> int:
    results: list[tuple[str, bool]] = []

    def caught(name, mutate, needle):
        with tempfile.TemporaryDirectory() as t:
            tmp = _fixture(pathlib.Path(t))
            mutate(tmp)
            results.append((name, any(needle in f for f in check(tmp))))

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        results.append(("a regenerated package verifies", check(tmp) == []))
        base, mode = base_bytes(tmp)
        results.append(("the base is the version-6 variant-p row", mode == "prospective"))
        (tmp / POLICY).write_text(propose(base))
        results.append(("after the version-7 act the package still verifies",
                        check(tmp) == [] and base_bytes(tmp)[1] == "performed-v7"))

    def unknown_disk(tmp):
        (tmp / POLICY).write_text((tmp / POLICY).read_text().replace('"schemaVersion": 1', '"schemaVersion": 2', 1))
    caught("a policy on disk that is neither base nor row refused", unknown_disk, "base is unknown")

    def edit_patch(tmp):
        p = tmp / patch_path("s")
        p.write_text(p.read_text().replace("form-action", "form-actiom", 1))
    caught("a hand-edited patch refused", edit_patch, "s: patch differs")

    def edit_manifest(tmp):
        p = tmp / MANIFEST
        p.write_text(p.read_text().replace("VERSION 7", "VERSION 8", 1))
    caught("a hand-edited manifest refused", edit_manifest, "manifest differs")

    def extra_proposed(tmp):
        (tmp / PKG / "proposed" / "stray.patch").write_text("x")
    caught("a stray proposed file refused", extra_proposed, "not exactly the declared patch")

    def digest_in_prose(tmp):
        (tmp / PKG / "NOTE.md").write_text("a" * 64)
    caught("a 64-hex token in prose refused", digest_in_prose, "64-hex token")

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        base = (tmp / POLICY).read_text()
        proposed = propose(base)
        doc = json.loads(proposed)
        widened = copy.deepcopy(doc)
        widened["schemaVersion"] = 9
        results.append(("a change outside the scope is found",
                        any("top-level change" in f for f in semantic_findings(base, json.dumps(widened)))))
        widened = copy.deepcopy(doc)
        widened[SCOPE_KEY]["activeContent"]["projectDocumentationExemption"]["egress"] = "x"
        results.append(("a second scope change is found",
                        any("somewhere other" in f for f in semantic_findings(base, json.dumps(widened)))))
        widened = copy.deepcopy(doc)
        condition = widened[SCOPE_KEY]["activeContent"]["codeContentExemption"]
        condition["renderCondition"] = condition["renderCondition"].replace(NEW_CLAUSE, "whose default-src is any.")
        results.append(("a lost clause is found",
                        any("exactly once" in f for f in semantic_findings(base, json.dumps(widened)))))

    results.append(("the CSP table holds", table_findings() == []))
    # One break per predicate of the reading, by source fragment; each must be visible in the table.
    source = inspect.getsource(csp_finding)
    for old, new in READING_MUTANTS:
        if source.count(old) < 1:
            results.append((f"mutant fragment present: {old}", False))
            continue
        scope = dict(globals())
        exec(source.replace(old, new), scope)  # noqa: S102
        try:
            caught = any((scope["csp_finding"](content) is None) != ok for _n, content, ok in CSP_TABLE)
        except Exception:  # noqa: BLE001
            caught = True  # the row raised, which is as visible as a wrong answer
        results.append((f"the table sees {old!r} -> {new!r}", caught))
    results.append(("the reading is restored", table_findings() == []))

    failed = [name for name, passed in results if not passed]
    for name in failed:
        print(f"FAIL {name}")
    print(f"public-source-screening-scope-v7 selftest: {len(results) - len(failed)} of {len(results)} passed")
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    flags = {"--write", "--check", "--digests", "--manifest-digest", "--selftest", "--score"}
    if len(argv) != 1 or argv[0] not in flags:
        print(__doc__)
        return 2
    mode = argv[0]
    if mode == "--selftest":
        return selftest()
    if mode == "--write":
        write(ROOT)
        print(f"wrote the patch and {MANIFEST.name}")
        return 0
    if mode == "--score":
        print(score(), end="")
        return 0
    problems = check(ROOT)
    if problems:
        for p in problems:
            print(f"FAIL {p}")
        return 1
    if mode == "--digests":
        print("".join(line + "\n" for line in (ROOT / MANIFEST).read_text().splitlines() if not line.startswith("#")), end="")
    elif mode == "--manifest-digest":
        print(hashlib.sha256((ROOT / MANIFEST).read_bytes()).hexdigest())
    else:
        print("public-source-screening-scope-v7: patch and manifest current")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
