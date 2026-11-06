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
    "whose default-src source list is exactly 'none', which carries no script-src-elem, script-src-attr, object-src, "
    "connect-src, worker-src, child-src, frame-src or navigate-to directive, and which carries either no script-src "
    "directive or exactly one whose source list is one or more 'sha256-<base64>' hash sources and nothing else (no "
    "'unsafe-inline', 'unsafe-eval', 'unsafe-hashes', 'wasm-unsafe-eval', 'strict-dynamic', 'self', 'none', nonce, scheme "
    "or host source). Each such hash is of one inline script the renderer itself writes: its bytes are fixed in the "
    "renderer and hold no byte of any body; it never turns page text into code or markup (no eval, no Function, no "
    "string timer, no innerHTML, outerHTML, insertAdjacentHTML or document.write, no handler attribute, no created "
    "script element); it writes page text only as text; it navigates only by a fragment of the current page or an "
    "href the renderer wrote; and it stores no page text. Every page reads and navigates completely with scripts off.")


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

FORBIDDEN = ("script-src-elem", "script-src-attr", "object-src", "connect-src", "worker-src", "child-src", "frame-src",
             "navigate-to")
HASH_SOURCE = re.compile(r"'sha256-[A-Za-z0-9+/]{43}='")


def csp_finding(content: str) -> str | None:
    directives = [part.split() for part in content.split(";") if part.strip()]
    named = lambda name: [d for d in directives if d[0].lower() == name]  # noqa: E731
    defaults = named("default-src")
    if len(defaults) != 1 or len(defaults[0]) != 2 or defaults[0][1].lower() != "'none'":
        return "default-src is not exactly 'none'"
    bad = [name for name in FORBIDDEN if named(name)]
    if bad:
        return f"carries {bad[0]}"
    scripts = named("script-src")
    if not scripts:
        return None
    if len(scripts) != 1 or len(scripts[0]) < 2:
        return "script-src is not one directive with at least one source"
    for source in scripts[0][1:]:
        if not HASH_SOURCE.fullmatch(source):
            return f"script-src carries {source}"
    return None


_H = "'sha256-" + "A" * 43 + "='"
_H2 = "'sha256-" + "B" * 43 + "='"
_REST = "style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
#: name, CSP content, allowed under version 7. Today's page must stay lawful.
CSP_TABLE = [
    ("today's page, no script", f"default-src 'none'; {_REST}", True),
    ("one hash", f"default-src 'none'; script-src {_H}; {_REST}", True),
    ("two hashes", f"default-src 'none'; script-src {_H} {_H2}; {_REST}", True),
    ("unsafe-inline beside a hash", f"default-src 'none'; script-src {_H} 'unsafe-inline'; {_REST}", False),
    ("unsafe-eval", f"default-src 'none'; script-src {_H} 'unsafe-eval'; {_REST}", False),
    ("unsafe-hashes", f"default-src 'none'; script-src {_H} 'unsafe-hashes'; {_REST}", False),
    ("wasm-unsafe-eval", f"default-src 'none'; script-src {_H} 'wasm-unsafe-eval'; {_REST}", False),
    ("strict-dynamic", f"default-src 'none'; script-src {_H} 'strict-dynamic'; {_REST}", False),
    ("self", f"default-src 'none'; script-src 'self'; {_REST}", False),
    ("script-src none", f"default-src 'none'; script-src 'none'; {_REST}", False),
    ("a nonce", f"default-src 'none'; script-src 'nonce-abc'; {_REST}", False),
    ("a host", f"default-src 'none'; script-src {_H} https://example.test; {_REST}", False),
    ("a scheme", f"default-src 'none'; script-src {_H} https:; {_REST}", False),
    ("a data scheme", f"default-src 'none'; script-src data:; {_REST}", False),
    ("a short hash", f"default-src 'none'; script-src 'sha256-AAAA'; {_REST}", False),
    ("a sha512 hash", f"default-src 'none'; script-src 'sha512-{'A' * 86}=='; {_REST}", False),
    ("no source at all", f"default-src 'none'; script-src; {_REST}", False),
    ("two script-src directives", f"default-src 'none'; script-src {_H}; script-src {_H2}; {_REST}", False),
    ("script-src-elem", f"default-src 'none'; script-src-elem {_H}; {_REST}", False),
    ("script-src-attr", f"default-src 'none'; script-src-attr 'unsafe-inline'; {_REST}", False),
    ("object-src", f"default-src 'none'; object-src *; {_REST}", False),
    ("connect-src, the fetch path", f"default-src 'none'; script-src {_H}; connect-src *; {_REST}", False),
    ("worker-src", f"default-src 'none'; script-src {_H}; worker-src *; {_REST}", False),
    ("child-src", f"default-src 'none'; script-src {_H}; child-src *; {_REST}", False),
    ("frame-src", f"default-src 'none'; script-src {_H}; frame-src *; {_REST}", False),
    ("navigate-to", f"default-src 'none'; script-src {_H}; navigate-to *; {_REST}", False),
    ("default-src not none", f"default-src 'self'; script-src {_H}; {_REST}", False),
    ("default-src absent", f"script-src {_H}; {_REST}", False),
]


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
    for term in ("exactly 'none'", "object-src", "connect-src", "hold no byte of any body", "with scripts off",
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
        p.write_text(p.read_text().replace("connect-src", "connect-srx", 1))
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
    # One break per predicate of the reading; each must be visible in the table.
    original = (FORBIDDEN, HASH_SOURCE)
    for name in FORBIDDEN:
        globals()["FORBIDDEN"] = tuple(n for n in FORBIDDEN if n != name)
        results.append((f"dropping {name} from the forbidden list is visible", table_findings() != []))
        globals()["FORBIDDEN"] = original[0]
    globals()["HASH_SOURCE"] = re.compile(r".*")
    results.append(("an open source pattern is visible", table_findings() != []))
    globals()["HASH_SOURCE"] = original[1]
    results.append(("the table's forbidden list is restored", table_findings() == []))

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
