#!/usr/bin/env python3
"""Build and verify version 1.1 of the local-agent public Git source-acquisition entry.

Package `contracts/candidates/public-git-source-acquisition-local-agent-v1-1/`:
the successor of the signed, installed v1.0 entry
(`declarations/adapter-registry/POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json`).
It admits the one-commit copy that launch-consent v1.2 drafts (REQ-polaris-generation-047,
PR #812, bound to its head 736d9fcd): in a launch-consented run Syzygy reads
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
- each moved declaration is, exactly, its clauses below joined in order
  (``FETCH_CLAUSES`` and the rest; round-1 Finding 5): a phrase check alone
  passes a coherent widening, so a departure is named by the first clause it
  touches, or as added text;
- `fetch` defines the copy-class and no-copy runs in the entry's own words, so
  that while no version in force of REQ-polaris-generation-047 requires a copy,
  every run is a no-copy run (round-1 Finding 1);
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
NO_COPY = ", save in a copy-class run"
#: Each part of the copy step the owner's selection and REQ-047 (#812 at 736d9fcd) name.
FETCH_TERMS = ("In a copy-class run", "REQ-polaris-generation-047", "git init --template=",
               "local file transport", "file://", "from nowhere else", "the object the run's named identifier names alone",
               "full object identifier", "depth of one", "no tags and no submodules", "detached",
               "system and global Git configuration disabled", "no other Git variable",
               "every transport but the file transport refused",
               "lazy fetching of missing objects disabled", "no hook path",
               "no other process is started", "alternates file", "reftable",
               "never at a location derived from its path", "delta bases", "before the copy step starts",
               "execute nothing of the observed repository", "as Git reported it",
               "uses nothing Git read but the copy", "Inferred", "not a locator",
               "the object format the operator's clone's configuration records",
               "never refused for its object format", "of the same object format")
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
#: The exact text of each moved declaration, clause by clause, as (label, text).
#: A declaration verifies only when it is these clauses joined, in order.
FETCH_CLAUSES = (
    ("v1.0's no-copy words",
     "none, save in a copy-class run: Syzygy fetches nothing. The operator prepares the clone with their own "
     "tools; to stay within the observation consent's stated fetch form the operator fetches the one consented "
     "commit alone (git fetch --depth=1 <upstream> <commit>) and checks it out. "),
    ("the run classes",
     "A copy-class run is a run that a version in force of REQ-polaris-generation-047 requires to run on a copy "
     "of the operator's clone; every other run is a no-copy run, and while no version in force requires a copy "
     "every run is a no-copy run. "),
    ("when the copy is made",
     "In a copy-class run, one local fetch and nothing else, made before the question, or before the brief "
     "where no question is asked: "),
    ("the copy's directory",
     "Syzygy creates an empty directory of its own for the copy, outside the operator's clone and never at a "
     "location derived from its path, and in it an empty repository with an empty template (git init "
     "--template=) and with the object format the operator's clone's configuration records, SHA-1 where it "
     "records none, so that a SHA-1 clone and a SHA-256 clone are each copied; a clone is never refused for its "
     "object format; "),
    ("the source and the object",
     "it fetches into that repository, from the operator's clone over Git's local file transport (a file:// URL) "
     "and from nowhere else, the object the run's named identifier names alone, by its full object identifier, "
     "at a depth of one, with no tags and no submodules, and checks that object out detached. "),
    ("the Git environment",
     "Every Git process it starts for the copy runs with the system and global Git configuration disabled, with "
     "no other Git variable of the operator's environment, with every transport but the file transport refused, "
     "with lazy fetching of missing objects disabled and with no hook path, and no other process is started; "
     "these processes execute nothing of the observed repository. "),
    ("the refusals before the copy step",
     "A clone whose references are stored in the reftable backend is refused before any Git process starts, and "
     "a clone with an alternates file before the copy step starts. "),
    ("the copy's form",
     "The copy holds the pinned commit and the trees and blobs reachable from its root tree alone, in the form "
     "one commit fetched alone into an empty repository of the same object format and checked out detached "
     "leaves, the repository format version and object-format setting that format needs included, and Syzygy "
     "checks that form before the question. "),
    ("the copy step's refusals",
     "Every failure of a Git process for the copy refuses, naming that process and its failure as Git reported "
     "it; a named identifier not shown to be a commit refuses (tags); a copy that departs from that form "
     "refuses; and nothing is then fetched from anywhere else. "),
    ("what Git reads",
     "To serve the copy Git reads the operator's clone's configuration, references and object store, the stored "
     "bytes of delta bases outside the named object's objects included; Syzygy uses nothing Git read but the "
     "copy. "),
    ("the Inferred residual",
     "That Git starts no program the operator's clone's own configuration or hooks name while it serves the "
     "copy, for every Git process the copy step started, is Inferred, not checked. "),
    ("not a locator",
     "The file URL of the operator's clone is not a locator and is never recorded or rendered as one"),
)
#: readAuthority after v1.0's text (with RA_EDITS applied).
RA_TAIL_CLAUSES = (
    ("the object reads bounded", ". Those words bound the object reads. "),
    ("the launch reads as data",
     "The reads of the pinning, identity and clone-form rules are launch reads, made as data and never honoured, "
     "and not object reads. "),
    ("the five launch reads",
     "In a launch-consented run (REQ-polaris-generation-046 and 047), besides the object reads, Syzygy reads of "
     "the operator's clone and the copy only the following: in the operator's clone these five things alone, and "
     "of what they list only what the launch-consent requirements in force name: "),
    ("launch read (1)",
     "(1) the .git file or directory and the files that locate the Git directory and the common Git directory; "),
    ("launch read (2)",
     "(2) the names of its references, and the values of HEAD and the reference it names, of the references "
     "REQ-polaris-generation-047's trunk rule names, of the local branch of the remote default's name and of the "
     "reference --revision names, each from the loose reference files and packed-refs, where reading packed-refs "
     "also reads other references' values, which are used for nothing; "),
    ("launch read (3)",
     "(3) its configuration file, as text, for its remotes' names and URLs and its object format "
     "(extensions.objectFormat) alone; "),
    ("launch read (4)", "(4) whether objects/info/alternates exists; "),
    ("launch read (5)",
     "(5) for an abbreviated --revision alone, the object identifiers its loose object file names and pack "
     "indexes give. "),
    ("a copy-class run's reads",
     "In a copy-class run (fetch) it reads no object of the operator's clone, tells whether the named identifier "
     "is a commit only from where the copy's detached checkout leaves the copy's HEAD, never by reading that "
     "object or from reference data, and reads the files of the copy's .git directory that the form check of "
     "fetch reads. "),
    ("a no-copy run's form-check reads",
     "In every no-copy run (fetch), launch-consented or not, it reads the files of the operator's clone's .git "
     "directory that the form check binding that run reads, the form another act's consent states or, in a run "
     "only a launch observation consent covers, the form one commit fetched alone into an empty repository and "
     "checked out detached leaves, the whole configuration file and the pack indexes included, to which (3) "
     "yields. "),
    ("a run that is not launch-consented",
     "A run that is not launch-consented has no closed list of reads here beyond the object reads, as under "
     "version 1.0; besides its form-check reads above, REQ-polaris-generation-033's check of its HEAD reads "
     "HEAD and the reference HEAD names, from the loose reference files and packed-refs"),
)
#: tags after v1.0's text.
TAGS_TAIL_CLAUSES = (
    ("the copy's non-commit object",
     "; in a copy-class run (fetch), a named identifier that names an annotated tag or another object that is "
     "not a commit may bring that object into the copy through the Git processes fetch names: "),
    ("unread, unfollowed, unused",
     "Syzygy reads none of it, tells that it is not a commit only from where the copy's detached checkout leaves "
     "the copy's HEAD, never follows it to any object it names, uses it for nothing beyond the copy step and that "
     "refusal, and refuses"),
)
SDW_CLAUSES = (
    ("v1.0's state-directory clause",
     "Syzygy's own state directory for the run, outside the clone and never at a location derived from the "
     "clone's path; "),
    ("the copy's directory and where it lies",
     "in a copy-class run (fetch), also the copy's directory, outside the run's state directory and outside the "
     "operator's clone and never at a location derived from the operator's clone's path: "),
    ("Syzygy's own writes to it",
     "Syzygy itself creates it, which starts the copy step, removes it with its contents where the run ends "
     "before its brief, and otherwise keeps it after the run, until the operator removes it, at a location the "
     "launch output names, "),
    ("Git's writes to it",
     "and writes its contents only through the Git processes fetch names. "),
    ("why writeSurface stays empty",
     "That directory is Syzygy's own local write, as the state directory is, and not a write to an observed or "
     "external system, so writeSurface stays empty; "),
    ("the operator's clone closed to writes",
     "nothing is written to the operator's clone, the observed repository, its forks or its tracker"),
)
COPY_STEP_CLAUSES = (
    ("what is unimplemented",
     "[Observed] at this version's drafting no file implements the copy step, its Git environment or the "
     "copy's directory, which typedAuthority.fetch, readAuthority, tags and stateDirectoryWrites declare for a "
     "copy-class run; the reader implements those declarations only as they concern the clone it reads objects "
     "from. "),
    ("why no run makes a copy",
     "The copy step is the launch step's (REQ-polaris-generation-047), which no implementation authorization "
     "covers yet. [Inferred] Until it is implemented and authorized, no run makes a copy"),
)


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
    keep = ofetch.replace("none:", f"none{NO_COPY}:", 1) + ". "
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
    if "In every no-copy run (fetch), launch-consented or not, it reads the files" not in tail \
            or "to which (3) yields" not in tail:
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
    if "A copy-class run is a run that a version in force of REQ-polaris-generation-047 requires" not in fetch \
            or "every run is a no-copy run" not in fetch:
        out.append("fetch does not define the run classes in the entry's own words")
    kept_ra = kept if kept else ora
    for name, value, clauses in (("fetch", fetch, FETCH_CLAUSES),
                                 ("readAuthority", ra, (("v1.0's text", kept_ra),) + RA_TAIL_CLAUSES),
                                 ("tags", tags, (("v1.0's text", otags),) + TAGS_TAIL_CLAUSES),
                                 ("stateDirectoryWrites", sdw, SDW_CLAUSES),
                                 ("implementationCoverage.copyStep", step if isinstance(step, str) else "",
                                  COPY_STEP_CLAUSES)):
        departs = exact_departure(value, clauses)
        if departs is not None:
            out.append(f"{name} departs from its exact text at the clause {departs!r}")
    return out


def exact_departure(value: str, clauses: tuple[tuple[str, str], ...]) -> str | None:
    """The label of the first clause at which ``value`` departs from the clauses
    joined in order; "added text" when it carries more; None when it is exact."""
    at = 0
    for label, text in clauses:
        if value[at:at + len(text)] != text:
            return label
        at += len(text)
    return None if at == len(value) else "added text"


def exact_entry(old: dict) -> dict:
    """The v1.1 entry this package states: v1.0's, with the moved declarations
    set to the exact clauses above. The proposed bytes must equal it."""
    doc = copy.deepcopy(old)
    entry = _entry(doc)
    ta = entry["typedAuthority"]
    ra = ta["readAuthority"]
    for old_clause, new_clause in RA_EDITS:
        assert ra.count(old_clause) == 1, old_clause
        ra = ra.replace(old_clause, new_clause)
    join = lambda clauses: "".join(text for _, text in clauses)  # noqa: E731
    ta["fetch"] = join(FETCH_CLAUSES)
    ta["readAuthority"] = ra + join(RA_TAIL_CLAUSES)
    ta["tags"] = ta["tags"] + join(TAGS_TAIL_CLAUSES)
    ta["stateDirectoryWrites"] = join(SDW_CLAUSES)
    cov = {}
    for k, v in entry["implementationCoverage"].items():
        cov[k] = v
        if k == "status":
            cov["copyStep"] = join(COPY_STEP_CLAUSES)
    entry["implementationCoverage"] = cov
    return doc


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
        ("a fetch that drops v1.0's no-copy words", _replace("fetch", "none, save in a copy-class run:",
                                                             "none:"), "v1.0's words"),
        ("a fetch whose run classes rest on #812's words alone",
         _replace("fetch", "A copy-class run is a run that a version in force of REQ-polaris-generation-047 "
                  "requires to run on a copy of the operator's clone; every other run is a no-copy run, and while "
                  "no version in force requires a copy every run is a no-copy run. ", ""), "define the run classes"),
        ("(F5 M1) launch read (3) widened to include paths",
         _replace("readAuthority", "for its remotes' names and URLs and its object format",
                  "for its remotes' names, URLs, include paths and its object format"),
         "at the clause 'launch read (3)'"),
        ("(F5 M2) launch read (5) widened to object headers",
         _replace("readAuthority", "the object identifiers its loose object file names and pack indexes give",
                  "the object identifiers and object headers its loose object file names and pack indexes give"),
         "at the clause 'launch read (5)'"),
        ("(F5 M3) the copy's directory placed anywhere on the host",
         _replace("stateDirectoryWrites", "also the copy's directory, ", "also the copy's directory, anywhere on "
                  "the host, "), "at the clause \"the copy's directory and where it lies\""),
        ("(F5 M4) the fetch source widened to the clone's remotes",
         _replace("fetch", "from the operator's clone over Git's local file transport",
                  "from the operator's clone or its remotes over Git's local file transport"),
         "at the clause 'the source and the object'"),
        ("(F5 M5) every reference's value read",
         _replace("readAuthority", "(2) the names of its references, and the values of HEAD",
                  "(2) the names of its references, and the values of every reference, of HEAD"),
         "at the clause 'launch read (2)'"),
        ("launch reads read whether or not the requirements in force name them",
         _replace("readAuthority", " alone, and of what they list only what the launch-consent requirements in "
                  "force name:", " alone:"), "at the clause 'the five launch reads'"),
        ("(R2 F1) the launch-read list closed for every run, not the launch-consented run alone",
         _replace("readAuthority", "In a launch-consented run (REQ-polaris-generation-046 and 047), besides the "
                  "object reads, Syzygy reads of the operator's clone and the copy only the following:", "In every run, "
                  "besides the object reads, Syzygy reads of the operator's clone and the copy only the following:"),
         "at the clause 'the five launch reads'"),
        ("(R3 F2) the closed list widened past the clones to every read the run makes",
         _replace("readAuthority", "Syzygy reads of the operator's clone and the copy only the following:",
                  "Syzygy reads only the following:"), "at the clause 'the five launch reads'"),
        ("(R2 F1) a run that is not launch-consented closed to its HEAD-check reads",
         _replace("readAuthority", "A run that is not launch-consented has no closed list of reads here beyond the "
                  "object reads", "A run that is not launch-consented reads nothing beyond the object reads"),
         "at the clause 'a run that is not launch-consented'"),
        ("a clause appended to stateDirectoryWrites",
         _replace("stateDirectoryWrites", "its forks or its tracker", "its forks or its tracker; and any cache"),
         "'added text'"),
        ("the copy's directory written by Git alone, its creation and removal unnamed",
         _replace("stateDirectoryWrites", "Syzygy itself creates it, which starts the copy step, ", ""),
         "at the clause \"Syzygy's own writes to it\""),
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
        ("an unbounded no-copy form check, by its missing bound",
         _replace("readAuthority", ", to which (3) yields", ""), "form-check reads"),
        ("an alternates clone refused only after the copy step starts",
         _replace("fetch", "before the copy step starts", "when the copy fails"), "before the copy step starts"),
        ("a Git failure refused with an unobserved cause",
         _replace("fetch", "as Git reported it", "with its likely cause"), "as Git reported it"),
        ("a copy kept with no named location",
         _replace("stateDirectoryWrites", "launch output names", "run chooses"), "its keeping"),
        ("a sixth launch read, by its literal '(6)'", _replace("readAuthority", "pack indexes give", "pack indexes give; (6) the index"), "no sixth"),
        ("a launch read dropped", _replace("readAuthority", "(4) whether objects/info/alternates exists; ", ""),
         "five launch reads"),
        ("honoured configuration", _replace("readAuthority", "never honoured", "honoured"), "as data"),
        ("object reads of the operator's clone in a copy run",
         _replace("readAuthority", "reads no object of the operator's clone", "reads its objects"),
         "read the operator's clone's objects"),
        ("a write to the operator's clone", _replace("stateDirectoryWrites", "nothing is written to the operator's clone",
                                                     "nothing is written to the copy"), "close the operator's clone"),
        ("an unbounded copy directory, by its missing bound",
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
