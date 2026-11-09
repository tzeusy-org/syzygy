#!/usr/bin/env python3
"""Build and verify version 1.1 of the local-agent public Git source-acquisition entry.

Package `contracts/candidates/public-git-source-acquisition-local-agent-v1-1/`:
the successor of the signed, installed v1.0 entry
(`declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`).
It admits the one-commit copy that launch-consent v1.2 drafts (REQ-polaris-generation-047,
PR #812, bound to its head de9c1ba8): in a launch-consented run Syzygy reads
five named things of the operator's clone as data; in a copy-class run it then
copies the object the named identifier names from that clone into a clone of
its own with one local fetch, and reads objects from the copy alone. A no-copy
run keeps v1.0's object-read words, "no process is started" included.

Five declarations move, and nothing else: `typedAuthority.fetch`,
`typedAuthority.readAuthority`, `typedAuthority.tags`,
`typedAuthority.stateDirectoryWrites`, and one new key,
`implementationCoverage.copyStep`. `check(root)` proves that:

- the proposed entry passes every v1.0 entry predicate (``entry_findings`` of
  the v1.0 builder) and the v1.1 predicates below;
- with those five declarations set aside, the proposed entry equals the v1.0
  signed entry, key order included, and the proposed bytes are the v1.0 bytes
  with exactly the patch applied (`proposed/*.json.patch`, `git apply`);
- each moved declaration keeps its v1.0 words for the no-copy run,
  and names every part of the copy the owner's selection describes;
- the v1.0 bytes are the bytes the v1.0 sign-off record names;
- `PROPOSED-SUBJECTS.json` states the three digests the files hash to;
- no package Markdown file carries a 64-hex token;
- the installed entry is either the v1.0 bytes (unapplied) or the v1.1 bytes
  beside a v1.1 sign-off record (applied); anything else refuses.

`apply(root)` refuses unless the package verifies unapplied, then writes the
proposed bytes over the installed entry. `applied(root)` is true when the
installed entry is the proposed bytes. `signed_findings(root)` is what the v1.0
builder's check defers to once a v1.1 sign-off record exists.

The CLI writes nothing: `--check`, `--digests`, `--selftest`. The sign-off
recorder (`record_versioned_signoff.py --record
public-git-source-acquisition-local-agent --version 1.1`) is the one writer.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_git_source_acquisition_local_agent as v10  # noqa: E402

KEY = v10.KEY
VERSION = "1.1"
CANDIDATES = v10.CANDIDATES
CANDIDATE = CANDIDATES / f"{KEY}-v1-1"
NAME = v10.NAME
PROPOSED = CANDIDATE / "proposed" / NAME
PATCH = CANDIDATE / "proposed" / f"{NAME}.patch"
SUBJECTS = CANDIDATE / "PROPOSED-SUBJECTS.json"
INSTALLED = v10.INSTALLED
#: The v1.0 signed bytes, still in the v1.0 candidate directory.
BASE = v10.PROPOSED
V10_RECORD = v10.SIGNOFF_RECORD
V11_RECORD = pathlib.Path(".syzygy/governance/decisions/"
                          "PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md")
HEX64 = re.compile(r"[0-9a-f]{64}")
INSTALLED_SHA_RE = re.compile(r"^Installed entry SHA-256: ([0-9a-f]{64})$", re.MULTILINE)
#: The declarations this version moves, as (container path, key).
MOVED = ((("typedAuthority",), "fetch"), (("typedAuthority",), "readAuthority"),
         (("typedAuthority",), "tags"), (("typedAuthority",), "stateDirectoryWrites"),
         (("implementationCoverage",), "copyStep"))
NO_COPY = "in a no-copy run"
#: Each part of the copy step the owner's selection and REQ-047 (#812 at de9c1ba8) name.
FETCH_TERMS = ("In a copy-class run", "REQ-polaris-generation-047", "git init --template=",
               "local file transport", "file://", "from nowhere else", "the object the run's named identifier names alone",
               "full object identifier", "depth of one", "no tags and no submodules", "detached",
               "system and global Git configuration disabled", "no other Git variable",
               "every transport but the file transport refused",
               "lazy fetching of missing objects disabled", "no hook path",
               "no other process is started", "alternates file", "reftable",
               "never at a location derived from its path", "delta bases", "before the copy step starts",
               "execute nothing of the observed repository", "as Git reported it",
               "uses nothing Git read but the copy", "Inferred", "not a locator")
#: The five launch reads, in order, by a phrase each must carry.
FIVE_READS = ("(1) the .git file or directory", "(2) the names of its references",
              "(3) its configuration file, as text", "(4) whether objects/info/alternates exists",
              "(5) for an abbreviated --revision alone")
#: readAuthority's two v1.0 sentences that change, each by one clause.
RA_EDITS = (("of the operator's clone's .git directory; ",
             "of the .git directory of the operator's clone, or, in a copy-class run (fetch), of the copy; "),
            ("commit-graph is read, and no process is started. ",
             "commit-graph is read, and no process is started, save, in a copy-class run, the Git "
             "processes fetch names. "))


class Refusal(RuntimeError):
    """The package does not verify; nothing is written."""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _entry(doc: dict) -> dict:
    return doc["entries"][0]


def _without_moved(doc: dict) -> dict:
    out = copy.deepcopy(doc)
    entry = _entry(out)
    for path, key in MOVED:
        node = entry
        for part in path:
            node = node.get(part, {})
        node.pop(key, None)
    return out


def declaration_findings(new: dict, old: dict) -> list[str]:
    """The v1.1 predicates over the moved declarations, against v1.0's words."""
    out = []
    try:
        nta, ota = _entry(new)["typedAuthority"], _entry(old)["typedAuthority"]
        cov = _entry(new)["implementationCoverage"]
    except (KeyError, IndexError, TypeError):
        return ["the proposed entry lacks typedAuthority or implementationCoverage"]
    fetch, ofetch = str(nta.get("fetch", "")), ota["fetch"]
    keep = ofetch.replace("none:", f"none {NO_COPY}:", 1) + ". "
    if not fetch.startswith(keep):
        out.append("fetch does not open with v1.0's words for the no-copy run")
    for term in FETCH_TERMS:
        if term not in fetch:
            out.append(f"fetch does not name {term!r}")
    ra, ora = str(nta.get("readAuthority", "")), ota["readAuthority"]
    kept = ora
    for old_clause, new_clause in RA_EDITS:
        kept = kept.replace(old_clause, new_clause) if ora.count(old_clause) == 1 else ""
    if not kept or not ra.startswith(kept + ". "):
        out.append("readAuthority does not keep v1.0's text, the copy's two clauses aside")
    if "and no process is started" not in ra:
        out.append("readAuthority drops 'no process is started' for the no-copy run")
    tail = ra[len(kept):] if kept else ""
    if ("never honoured" not in tail or "these five things alone" not in tail
            or "not object reads" not in tail):
        out.append("readAuthority does not bound the launch reads as data, five alone, apart from object reads")
    positions = [tail.find(phrase) for phrase in FIVE_READS]
    if -1 in positions or positions != sorted(positions) or "(6)" in tail:
        out.append("readAuthority does not list the five launch reads, in order, and no sixth")
    if "reads no object of the operator's clone" not in tail:
        out.append("readAuthority lets a copy-class run read the operator's clone's objects")
    if "never by reading that object or from reference data" not in tail:
        out.append("readAuthority lets Syzygy tell a commit by reading the named object or reference data")
    if "In a no-copy run it also reads the files" not in tail or "to which (3) yields" not in tail:
        out.append("readAuthority does not bound a no-copy run's form-check reads")
    tags, otags = str(nta.get("tags", "")), ota["tags"]
    if not tags.startswith(otags + "; in a copy-class run") or "Syzygy reads none of it" not in tags \
            or "never follows it" not in tags or "uses it for nothing beyond" not in tags:
        out.append("tags does not keep v1.0's words and keep the copy's non-commit object unread and unused")
    sdw, osdw = str(nta.get("stateDirectoryWrites", "")), ota["stateDirectoryWrites"]
    first = osdw.split("; ", 1)[0] + "; "
    if not sdw.startswith(first):
        out.append("stateDirectoryWrites does not keep v1.0's state-directory clause")
    if not sdw.endswith("nothing is written to the operator's clone, the observed repository, "
                        "its forks or its tracker"):
        out.append("stateDirectoryWrites does not close the operator's clone to writes")
    if ("copy's directory" not in sdw
            or "never at a location derived from the operator's clone's path" not in sdw
            or "until the operator removes it" not in sdw or "launch output names" not in sdw):
        out.append("stateDirectoryWrites does not bound the copy's directory and its keeping")
    step = cov.get("copyStep") if isinstance(cov, dict) else None
    if not isinstance(step, str) or not step.startswith("[Observed]") or "no run makes a copy" not in step:
        out.append("implementationCoverage.copyStep does not say the copy step is unimplemented")
    return out


def _git_apply(base: bytes, patch: pathlib.Path) -> bytes | None:
    with tempfile.TemporaryDirectory() as t:
        tmp = pathlib.Path(t)
        (tmp / INSTALLED).parent.mkdir(parents=True, exist_ok=True)
        (tmp / INSTALLED).write_bytes(base)
        done = subprocess.run(["git", "apply", "--whitespace=nowarn", str(patch.resolve())],
                              cwd=tmp, capture_output=True, text=True)
        if done.returncode != 0:
            return None
        return (tmp / INSTALLED).read_bytes()


def _recorded_sha(root: pathlib.Path, record: pathlib.Path) -> str | None:
    path = root / record
    if not path.is_file():
        return None
    found = INSTALLED_SHA_RE.findall(path.read_text(encoding="utf-8"))
    return found[0] if len(found) == 1 else None


def check(root: pathlib.Path = ROOT) -> list[str]:
    out: list[str] = []
    for rel in (PROPOSED, PATCH, SUBJECTS, BASE):
        if not (root / rel).is_file():
            out.append(f"{rel.as_posix()} is missing")
    if out:
        return out
    data, base, patch = ((root / PROPOSED).read_bytes(), (root / BASE).read_bytes(),
                         (root / PATCH).read_bytes())
    try:
        doc, old = json.loads(data), json.loads(base)
        contract = json.loads((root / v10.BUTLERS).read_text())["entries"][0]["contractVersion"]
        subjects = json.loads((root / SUBJECTS).read_text(encoding="utf-8"))
    except (ValueError, OSError, KeyError, IndexError) as exc:
        return [f"an entry, the Butlers entry or the subjects file is unreadable: {exc}"]
    out += v10.entry_findings(doc, contract)
    out += declaration_findings(doc, old)
    if _without_moved(doc) != _without_moved(old) or (
            json.dumps(_without_moved(doc)) != json.dumps(_without_moved(old))):
        out.append("the proposed entry differs from v1.0 outside the five moved declarations")
    if (json.dumps(doc, indent=2) + "\n").encode("ascii") != data:
        out.append("the proposed bytes are not the entry's canonical two-space ASCII form")
    if _git_apply(base, root / PATCH) != data:
        out.append("the patch applied to the v1.0 bytes does not give the proposed bytes")
    signed10 = _recorded_sha(root, V10_RECORD)
    if signed10 is None:
        out.append(f"{V10_RECORD.as_posix()} names no installed SHA-256")
    elif sha(base) != signed10:
        out.append("the v1.0 candidate bytes are not the bytes the v1.0 sign-off names")
    rows = subjects.get("subjects") if isinstance(subjects, dict) else None
    want = {"path": INSTALLED.as_posix(), "current_sha256": sha(base),
            "proposed_sha256": sha(data), "patch_sha256": sha(patch)}
    if not (isinstance(rows, list) and len(rows) == 1 and rows[0] == want):
        out.append("PROPOSED-SUBJECTS.json does not state the digests the files hash to")
    for md in sorted((root / CANDIDATE).glob("*.md")):
        if re.search(r"ROUND-\d+-DISPOSITIONS\.md$", md.name):
            continue
        if HEX64.search(md.read_text(encoding="utf-8")):
            out.append(f"{md.name}: carries a 64-hex token")
    installed = root / INSTALLED
    current = installed.read_bytes() if installed.is_file() else None
    if current == data:
        if not (root / V11_RECORD).is_file():
            out.append("the v1.1 bytes are installed without a v1.1 sign-off record")
    elif current != base:
        out.append("the installed entry is neither the v1.0 signed bytes nor the v1.1 bytes")
    elif (root / V11_RECORD).is_file():
        out.append("a v1.1 sign-off record exists but the installed entry is v1.0's")
    return out


def applied(root: pathlib.Path = ROOT) -> bool:
    installed, proposed = root / INSTALLED, root / PROPOSED
    return (installed.is_file() and proposed.is_file()
            and installed.read_bytes() == proposed.read_bytes())


def apply(root: pathlib.Path = ROOT) -> int:
    if applied(root):
        raise Refusal("version 1.1 is already installed")
    findings = check(root)
    if findings:
        raise Refusal("package does not verify: " + " | ".join(findings))
    (root / INSTALLED).write_bytes((root / PROPOSED).read_bytes())
    return 0


def signed_findings(root: pathlib.Path) -> list[str]:
    """For the v1.0 builder, once a v1.1 record exists: the installed entry is
    the v1.1 bytes that record names, and the v1.1 package still verifies."""
    if not (root / V11_RECORD).is_file():
        return []
    out = []
    if not applied(root):
        out.append("a v1.1 sign-off record exists but the installed entry is not the v1.1 bytes")
    signed11 = _recorded_sha(root, V11_RECORD)
    if signed11 is None or not (root / INSTALLED).is_file() or sha((root / INSTALLED).read_bytes()) != signed11:
        out.append("the installed entry is not the SHA-256 the v1.1 sign-off names")
    return out + check(root)


# --- selftest ---------------------------------------------------------------

def _fixture(tmp: pathlib.Path) -> pathlib.Path:
    for rel in (PROPOSED, PATCH, SUBJECTS, BASE, v10.BUTLERS, INSTALLED, V10_RECORD):
        (tmp / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / rel, tmp / rel)
    return tmp


def _mutate_entry(tmp: pathlib.Path, fn) -> None:
    doc = json.loads((tmp / PROPOSED).read_text())
    fn(_entry(doc))
    (tmp / PROPOSED).write_text(json.dumps(doc, indent=2) + "\n")


def _replace(field: str, old: str, new: str):
    def fn(entry):
        ta = entry["typedAuthority"]
        assert old in ta[field], (field, old)
        ta[field] = ta[field].replace(old, new, 1)
    return fn


def selftest() -> int:
    results: list[tuple[str, bool]] = []

    def caught(name, mutate, needle):
        with tempfile.TemporaryDirectory() as t:
            tmp = _fixture(pathlib.Path(t))
            mutate(tmp)
            found = check(tmp)
            results.append((name, any(needle in f for f in found)))

    with tempfile.TemporaryDirectory() as t:
        results.append(("the shipped package verifies unapplied", check(_fixture(pathlib.Path(t))) == []))
    mutants = (
        ("a fetch that drops v1.0's no-copy words", _replace("fetch", "none in a no-copy run:",
                                                             "none:"), "v1.0's words"),
        ("a fetch over the network transport", _replace("fetch", "every transport but the file transport refused",
                                                        "the https transport allowed"), "every transport"),
        ("a fetch that keeps hooks", _replace("fetch", "no hook path", "the clone's hooks"), "no hook path"),
        ("a fetch that keeps the global configuration",
         _replace("fetch", "system and global Git configuration disabled", "global configuration read"),
         "system and global"),
        ("a fetch that lets lazy fetching run", _replace("fetch", "lazy fetching of missing objects disabled",
                                                         "lazy fetching on"), "lazy fetching"),
        ("a fetch at full depth", _replace("fetch", "depth of one", "full depth"), "depth of one"),
        ("a fetch by abbreviated identifier", _replace("fetch", "full object identifier", "short identifier"),
         "full object identifier"),
        ("a fetch that starts other processes", _replace("fetch", "no other process is started",
                                                         "other processes may start"), "no other process"),
        ("a fetch whose residual is not labelled", _replace("fetch", "is Inferred, not checked", "holds"),
         "'Inferred'"),
        ("a readAuthority that starts processes in a no-copy run",
         _replace("readAuthority", "and no process is started", "and processes may start"),
         "keep v1.0's text"),
        ("launch reads not set apart from object reads",
         _replace("readAuthority", "not object reads", "object reads"), "apart from object reads"),
        ("a tag object followed", _replace("tags", "never follows it", "follows it"), "tags does not keep"),
        ("tags dropping v1.0's words", _replace("tags", "never read; ", "read; "), "tags does not keep"),
        ("a tag object read", _replace("tags", "Syzygy reads none of it", "Syzygy reads its type"),
         "tags does not keep"),
        ("a commit told from reference data",
         _replace("readAuthority", "never by reading that object or from reference data", "from packed-refs"),
         "reference data"),
        ("an unbounded no-copy form check", _replace("readAuthority", ", to which (3) yields", ""),
         "form-check reads"),
        ("an alternates clone refused only after the copy step starts",
         _replace("fetch", "before the copy step starts", "when the copy fails"), "before the copy step starts"),
        ("a Git failure refused with an unobserved cause",
         _replace("fetch", "as Git reported it", "with its likely cause"), "as Git reported it"),
        ("a copy kept with no named location",
         _replace("stateDirectoryWrites", "launch output names", "run chooses"), "its keeping"),
        ("a sixth launch read", _replace("readAuthority", "pack indexes give", "pack indexes give; (6) the index"), "no sixth"),
        ("a launch read dropped", _replace("readAuthority", "(4) whether objects/info/alternates exists; ", ""),
         "five launch reads"),
        ("honoured configuration", _replace("readAuthority", "never honoured", "honoured"), "as data"),
        ("object reads of the operator's clone in a copy run",
         _replace("readAuthority", "reads no object of the operator's clone", "reads its objects"),
         "read the operator's clone's objects"),
        ("a write to the operator's clone", _replace("stateDirectoryWrites", "nothing is written to the operator's clone",
                                                     "nothing is written to the copy"), "close the operator's clone"),
        ("an unbounded copy directory",
         _replace("stateDirectoryWrites", "never at a location derived from the operator's clone's path",
                  "anywhere"), "bound the copy's directory"),
        ("no copy-step coverage", lambda e: e["implementationCoverage"].pop("copyStep"), "copyStep"),
        ("a changed declaration outside the five", lambda e: e["resourceLimits"].__setitem__("maxSources", 1),
         "outside the five moved"),
        ("a network destination", lambda e: e["typedAuthority"].__setitem__("networkAccess", ["file://"]),
         "networkAccess must be empty"),
        ("execution", lambda e: e["typedAuthority"].__setitem__("executeObservedCode", True),
         "executeObservedCode"),
        ("a working-tree read", lambda e: e["typedAuthority"].__setitem__("workingTreeRead", True),
         "workingTreeRead"),
    )
    for name, fn, needle in mutants:
        caught(f"{name} refused", lambda tmp, fn=fn: _mutate_entry(tmp, fn), needle)

    def reorder(tmp):
        doc = json.loads((tmp / PROPOSED).read_text())
        entry = _entry(doc)
        entry["implementationCoverage"] = dict(reversed(list(entry["implementationCoverage"].items())))
        (tmp / PROPOSED).write_text(json.dumps(doc, indent=2) + "\n")
    caught("a reordered declaration refused", reorder, "outside the five moved")

    def stale_patch(tmp):
        text = (tmp / PATCH).read_text()
        assert text.count('+        "copyStep"') == 1
        (tmp / PATCH).write_text(text.replace('+        "copyStep"', '+        "copyStepX"', 1))
    caught("a patch that does not give the proposed bytes refused", stale_patch, "patch applied")

    def stale_subjects(tmp):
        doc = json.loads((tmp / SUBJECTS).read_text())
        doc["subjects"][0]["proposed_sha256"] = "0" * 64
        (tmp / SUBJECTS).write_text(json.dumps(doc, indent=2) + "\n")
    caught("a stale subjects digest refused", stale_subjects, "PROPOSED-SUBJECTS")

    def base_edit(tmp):
        (tmp / BASE).write_bytes((tmp / BASE).read_bytes().replace(b"4096", b"4097", 1))
    caught("v1.0 bytes other than the signed ones refused", base_edit, "v1.0 sign-off names")
    caught("a digest in a package Markdown file refused",
           lambda tmp: (tmp / CANDIDATE / "PACKET.md").write_text("a" * 64), "64-hex")
    caught("an installed entry that is neither version refused",
           lambda tmp: (tmp / INSTALLED).write_text("{}"), "neither")
    caught("v1.1 installed without its record refused",
           lambda tmp: shutil.copyfile(tmp / PROPOSED, tmp / INSTALLED), "without a v1.1 sign-off")

    def record_only(tmp):
        (tmp / V11_RECORD).write_text("Installed entry SHA-256: " + "0" * 64 + "\n")
    caught("a v1.1 record beside the v1.0 bytes refused", record_only, "installed entry is v1.0's")

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        _mutate_entry(tmp, _replace("fetch", "no hook path", "hooks"))
        try:
            apply(tmp)
            ok = False
        except Refusal:
            ok = (tmp / INSTALLED).read_bytes() == (tmp / BASE).read_bytes()
        results.append(("apply refuses a package that does not verify, writing nothing", ok))
    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        before = applied(tmp)
        code = apply(tmp)
        written = applied(tmp) and (tmp / INSTALLED).read_bytes() == (tmp / PROPOSED).read_bytes()
        (tmp / V11_RECORD).write_text("Installed entry SHA-256: " + sha((tmp / PROPOSED).read_bytes()) + "\n")
        results.append(("apply installs the exact v1.1 bytes and check and signed_findings pass applied",
                        not before and code == 0 and written and check(tmp) == []
                        and signed_findings(tmp) == []))
        try:
            apply(tmp)
            again = False
        except Refusal:
            again = True
        results.append(("a second apply refuses", again))
        (tmp / V11_RECORD).write_text("Installed entry SHA-256: " + "0" * 64 + "\n")
        results.append(("signed_findings refuses a v1.1 record naming other bytes",
                         any("v1.1 sign-off names" in f for f in signed_findings(tmp))))
    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        results.append(("signed_findings is silent before any v1.1 record", signed_findings(tmp) == []))
    failed = [n for n, ok in results if not ok]
    for name, ok in results:
        print(("ok   " if ok else "FAIL ") + name)
    print(f"selftest: {len(results) - len(failed)} of {len(results)} predicates held")
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--digests", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    args = ap.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.digests:
        for rel in (BASE, PROPOSED, PATCH):
            print(f"{sha((ROOT / rel).read_bytes())}  {rel.as_posix()}")
        return 0
    findings = check(ROOT)
    for f in findings:
        print(f"FAIL {f}")
    print(f"{KEY} v{VERSION}: " + ("applied" if applied(ROOT) else "unapplied")
          + (f", {len(findings)} findings" if findings else ", verifies"))
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
