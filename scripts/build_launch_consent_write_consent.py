#!/usr/bin/env python3
"""Regenerate and verify the launch-consent write-consent package.

Package `contracts/candidates/launch-consent-write-consent/` (bead
`syzygy-pdja.22`). It holds one candidate write consent (RFC5-12; SEC-4) for
`project:syzygy`'s own repository: Syzygy may write launch consent records
(REQ-polaris-generation-046) as new files at one location, by recording
commits on one dedicated, non-trunk branch, and nothing else. The manifest
has one row, the argument of one owner act over that record. Nothing here
performs or records the act.

  --write            regenerate the instance record and the manifest
  --check            fail if the record or the manifest differs from its
                     regeneration, an instance directory holds a record
                     nothing produces, the record breaks a scope predicate
                     (below), or a package Markdown file at any depth outside
                     `instances/` and `reviews/` (round dispositions
                     excepted) carries a 64-hex token
  --digests          print the manifest row (refuses while stale)
  --manifest-digest  print the SHA-256 of the manifest FILE (refuses while stale)
  --selftest         one mutant per predicate; each must be caught

Scope predicates, read from the params and the rendered record:
  - the dedicated reference is a branch under `refs/heads/` and is neither the
    trunk nor `refs/heads/main` nor `refs/heads/master`;
  - the location is a directory under `.syzygy/governance/decisions/`, the
    home REQ-polaris-generation-046 names for the records;
  - the record names the record class, the reference and the location (the
    three things REQ-polaris-generation-046 says the scope must name);
  - the exclusions name the trunk, the current branch and pushing;
  - the repository identity equals the one REQ-polaris-generation-046's
    proposal rule derives from the upstream URL.

Review-head contract for a recorder written after the review: the raw's first
four non-blank lines carry the title, `Reviewed commit: <40 hex>`,
`Manifest SHA-256: <SHA-256 of the manifest FILE>` (as `--manifest-digest`
prints it, never the manifest row) and a `Verdict:` line.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
CANDIDATES = pathlib.Path(".syzygy/governance/contracts/candidates")
PKG = CANDIDATES / "launch-consent-write-consent"
MANIFEST_NAME = "LAUNCH-CONSENT-WRITE-CONSENT-MANIFEST.txt"
RECORD = PKG / "instances/syzygy/WRITE-CONSENT-LAUNCH-RECORDS.md"
FIELD = re.compile(r"\{\{([A-Z_]+)\}\}")
HEADER = re.compile(r"\A(# [^\n]*\n\n)(?:> [^\n]*\n)+")
HEX64 = re.compile(r"[0-9a-f]{64}")
DISPOSITIONS = re.compile(r"^ROUND-\d+-DISPOSITIONS\.md$")
DECISIONS = ".syzygy/governance/decisions/"
RECORD_CLASS_LINE = "Record class written: launch consent records (REQ-polaris-generation-046)"


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def header(template_name: str) -> str:
    return (f"> Instance filled from `../../templates/{template_name}` by\n"
            "> `scripts/build_launch_consent_write_consent.py`. Candidate — binds nothing\n"
            "> until the owner acts on this record's exact bytes.\n")


def render(template_text: str, fields: dict, template_name: str) -> str:
    def sub(m):
        if m.group(1) not in fields:
            raise KeyError(f"{template_name}: unfilled field {m.group(1)}")
        return fields[m.group(1)]
    text, n = HEADER.subn(lambda m: m.group(1) + header(template_name), template_text, count=1)
    if n != 1:
        raise ValueError(f"{template_name}: template header not found")
    out = FIELD.sub(sub, text)
    if "{{" in out:
        raise ValueError(f"{template_name}: placeholder left after fill")
    return out


def specs(root: pathlib.Path = ROOT):
    """(repo-relative path, template name, fields) for every record the params declare."""
    for params in sorted((root / PKG / "instances").glob("*/params.json")):
        spec = json.loads(params.read_text(encoding="utf-8"))
        common = spec.pop("common", {})
        for out_name, entry in sorted(spec.items()):
            yield params.parent.relative_to(root) / out_name, entry["template"], {**common, **entry["fields"]}


def instances(root: pathlib.Path = ROOT):
    for rel, template, fields in specs(root):
        tpl = root / PKG / "templates" / template
        yield rel, render(tpl.read_text(encoding="utf-8"), fields, template)


def derived_identity(url: str) -> str:
    """REQ-polaris-generation-046's proposal rule, applied to one URL."""
    s = url.strip()
    s = re.sub(r"^(?:https?|ssh|git)://", "", s)
    m = re.match(r"^[^/@]+@([^:/]+):(.*)$", s)  # scp form user@host:path
    if m:
        s = f"{m.group(1)}/{m.group(2)}"
    s = re.sub(r"^[^/@]*@", "", s)  # user information
    host, _, path = s.partition("/")
    host = re.sub(r":\d+$", "", host)
    host = re.sub(r"^www\.", "", host)
    path = re.sub(r"/$", "", path)
    path = re.sub(r"\.git$", "", path)
    norm = f"{host}/{path}".lower()
    segments = [p for p in norm.split("/") if p]
    joined = "-".join(segments[-2:])
    return re.sub(r"[^a-z0-9._-]", "-", joined)


def scope_problems(fields: dict, text: str, rel: str) -> list[str]:
    out = []
    ref = fields.get("REFERENCE", "")
    trunk = fields.get("TRUNK", "")
    loc = fields.get("LOCATION", "")
    if not re.fullmatch(r"refs/heads/[A-Za-z0-9._/-]+", ref) or ref.endswith("/"):
        out.append(f"{rel}: the dedicated reference is not a branch under refs/heads/")
    if ref in (trunk, "refs/heads/main", "refs/heads/master"):
        out.append(f"{rel}: the dedicated reference is the trunk")
    if not (loc.startswith(DECISIONS) and loc.endswith("/") and ".." not in loc.split("/")):
        out.append(f"{rel}: the location is not a directory under {DECISIONS}")
    if RECORD_CLASS_LINE not in text:
        out.append(f"{rel}: the record does not name the record class")
    if f"Dedicated reference: `{ref}`" not in text:
        out.append(f"{rel}: the record does not name the dedicated reference")
    if f"Location in its tree: `{loc}`" not in text:
        out.append(f"{rel}: the record does not name the location")
    excludes = text.partition("The scope excludes:")[2].partition("## ")[0]
    for needle, what in ((f"`{trunk}`", "the trunk"), ("the current branch", "the current branch"),
                         ("pushing", "pushing")):
        if needle not in excludes:
            out.append(f"{rel}: the exclusions do not name {what}")
    if fields.get("REPOSITORY_ID") != derived_identity(fields.get("UPSTREAM_URL", "")):
        out.append(f"{rel}: the repository identity is not the one the proposal rule derives")
    return out


def manifest_text(root: pathlib.Path = ROOT) -> str:
    rows = sorted((rel.as_posix(), sha(text.encode())) for rel, text in instances(root))
    return ("# LAUNCH-CONSENT WRITE-CONSENT MANIFEST\n"
            "# Candidate; this file and its rows bind nothing by themselves.\n"
            f"# {len(rows)} row(s) sorted by codepoint path; each hashes the record's exact bytes\n"
            "# and is the argument of one separate owner act over that record.\n"
            + "".join(f"{s}  {p}\n" for p, s in rows))


def stale(root: pathlib.Path = ROOT) -> list[str]:
    out = []
    try:
        produced = dict(instances(root))
        manifest = manifest_text(root)
        declared = list(specs(root))
    except (ValueError, KeyError, OSError) as exc:
        return [f"cannot regenerate: {exc}"]
    for rel, text in produced.items():
        file = root / rel
        if not file.is_file() or file.read_text(encoding="utf-8") != text:
            out.append(f"{rel.as_posix()}: differs from its regeneration")
    for rel, _template, fields in declared:
        out.extend(scope_problems(fields, produced[rel], rel.as_posix()))
    for md in sorted((root / PKG / "instances").glob("*/*.md")):
        if md.relative_to(root) not in produced:
            out.append(f"{md.relative_to(root).as_posix()}: produced by no params entry")
    m = root / PKG / MANIFEST_NAME
    if not m.is_file() or m.read_text(encoding="utf-8") != manifest:
        out.append(f"{MANIFEST_NAME}: stale or missing")
    for md in sorted((root / PKG).rglob("*.md")):
        rel = md.relative_to(root / PKG)
        if rel.parts[0] in ("instances", "reviews") or DISPOSITIONS.match(md.name):
            continue
        if HEX64.search(md.read_text(encoding="utf-8")):
            out.append(f"{rel.as_posix()}: carries a 64-hex token")
    return out


def write(root: pathlib.Path = ROOT) -> None:
    for rel, text in instances(root):
        (root / rel).write_text(text, encoding="utf-8")
    (root / PKG / MANIFEST_NAME).write_text(manifest_text(root), encoding="utf-8")


# --- selftest ---------------------------------------------------------------

def _fixture(tmp: pathlib.Path) -> pathlib.Path:
    shutil.copytree(ROOT / PKG, tmp / PKG, ignore=shutil.ignore_patterns("reviews"))
    write(tmp)
    return tmp


def selftest() -> int:
    results: list[tuple[str, bool]] = []
    params = PKG / "instances/syzygy/params.json"
    template = PKG / "templates/WRITE-CONSENT-TEMPLATE.md"

    def caught(name, mutate, needle):
        with tempfile.TemporaryDirectory() as t:
            tmp = _fixture(pathlib.Path(t))
            mutate(tmp)
            found = stale(tmp)
            results.append((name, any(needle in f for f in found)))

    def set_field(key, value):
        def mutate(tmp):
            p = tmp / params
            data = json.loads(p.read_text())
            data["WRITE-CONSENT-LAUNCH-RECORDS.md"]["fields"][key] = value
            p.write_text(json.dumps(data, indent=2) + "\n")
            write(tmp)
        return mutate

    def edit_template(old, new):
        def mutate(tmp):
            p = tmp / template
            text = p.read_text()
            if old not in text:
                raise AssertionError(f"selftest fragment not in template: {old!r}")
            p.write_text(text.replace(old, new))
            write(tmp)
        return mutate

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        results.append(("a regenerated package verifies", stale(tmp) == []))
        text = (tmp / RECORD).read_text()
        results.append(("the record names its consent class", "Consent class: write (RFC5-12; SEC-4)" in text))

    results.append(("the proposal rule derives the scp form alike",
                    derived_identity("git@GitHub.com:tzeusy-org/syzygy.git") == "tzeusy-org-syzygy"))
    results.append(("the proposal rule strips www, port and user information",
                    derived_identity("https://u@www.example.org:8443/a/B_c/") == "a-b_c"))

    def hand_edit(tmp):
        p = tmp / RECORD
        p.write_text(p.read_text().replace("- pushing, or", "- or"))
    caught("a hand edit to the record refused", hand_edit, "differs from its regeneration")
    caught("the trunk as the dedicated reference refused",
           set_field("REFERENCE", "refs/heads/main"), "the dedicated reference is the trunk")
    caught("master as the dedicated reference refused",
           set_field("REFERENCE", "refs/heads/master"), "the dedicated reference is the trunk")
    caught("a tag as the dedicated reference refused",
           set_field("REFERENCE", "refs/tags/launch-consent-records"), "not a branch under refs/heads/")
    caught("a location outside decisions refused",
           set_field("LOCATION", ".syzygy/governance/records/launch-consent/"), "not a directory under")
    caught("a location escaping decisions refused",
           set_field("LOCATION", ".syzygy/governance/decisions/../policies/"), "not a directory under")
    caught("an identity the rule does not derive refused",
           set_field("REPOSITORY_ID", "syzygy"), "not the one the proposal rule derives")
    caught("a record not naming the record class refused",
           edit_template("Record class written: launch consent records", "Record class written: records"),
           "does not name the record class")
    caught("a record not naming the reference refused",
           edit_template("Dedicated reference: `{{REFERENCE}}`", "Dedicated reference: a branch"),
           "does not name the dedicated reference")
    caught("a record not naming the location refused",
           edit_template("Location in its tree: `{{LOCATION}}`", "Location in its tree: decisions"),
           "does not name the location")
    caught("exclusions without the trunk refused",
           edit_template("- `{{TRUNK}}`, the current branch", "- the current branch"),
           "the exclusions do not name the trunk")
    caught("exclusions without the current branch refused",
           edit_template("the current branch of any of that repository's worktrees, and\n  every reference",
                         "every reference"),
           "the exclusions do not name the current branch")
    caught("exclusions without pushing refused",
           edit_template("- pushing, or in any other way publishing,", "- publishing,"),
           "the exclusions do not name pushing")

    def orphan(tmp):
        (tmp / PKG / "instances/syzygy/EXTRA.md").write_text("x\n")
    caught("an orphan record refused", orphan, "produced by no params entry")

    def edit_manifest(tmp):
        p = tmp / PKG / MANIFEST_NAME
        p.write_text(p.read_text() + "# extra\n")
    caught("an edited manifest refused", edit_manifest, "stale or missing")

    def digest_in_md(tmp):
        (tmp / PKG / "SEMANTIC-DELTA.md").write_text("argument " + "a" * 64 + "\n")
    caught("a digest in a package Markdown file refused", digest_in_md, "64-hex")

    def digest_in_template_header(tmp):
        # The renderer replaces the template's header blockquote, so only the Markdown sweep can see this token.
        p = tmp / template
        p.write_text(re.sub(r"^> ", "> " + "b" * 64 + " ", p.read_text(), count=1, flags=re.M))
    caught("a digest in a template's header refused", digest_in_template_header,
           "templates/WRITE-CONSENT-TEMPLATE.md: carries a 64-hex token")

    def unfilled(tmp):
        p = tmp / template
        p.write_text(p.read_text() + "\n{{NOT_A_FIELD}}\n")
    caught("an unfilled field refused", unfilled, "unfilled field NOT_A_FIELD")

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        (tmp / PKG / "ROUND-1-DISPOSITIONS.md").write_text("a" * 64 + "\n")
        results.append(("a disposition record may quote a digest", stale(tmp) == []))
    failed = [n for n, ok in results if not ok]
    for name, ok in results:
        print(("ok   " if ok else "FAIL ") + name)
    print(f"selftest: {len(results) - len(failed)} of {len(results)} predicates held")
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    flags = {"--write", "--check", "--digests", "--manifest-digest", "--selftest"}
    if len(argv) != 1 or argv[0] not in flags:
        print(__doc__)
        return 2
    mode = argv[0]
    if mode == "--selftest":
        return selftest()
    if mode == "--write":
        write(ROOT)
        print(f"wrote the instance record and {MANIFEST_NAME}")
        return 0
    problems = stale(ROOT)
    if problems:
        for p in problems:
            print(f"FAIL {p}")
        return 1
    if mode == "--digests":
        print("".join(line + "\n" for line in manifest_text(ROOT).splitlines() if not line.startswith("#")), end="")
    elif mode == "--manifest-digest":
        print(sha((ROOT / PKG / MANIFEST_NAME).read_bytes()))
    else:
        print("launch-consent-write-consent: record and manifest current")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
