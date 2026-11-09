#!/usr/bin/env python3
"""Build and verify the local-agent version of the public Git source-acquisition entry.

Package `contracts/candidates/public-git-source-acquisition-local-agent/`: one
proposed adapter-registry entry, version 2.0.0-candidate.1 of
`polaris-public-git-source-acquisition`, for the operator-agent mode of
REQ-polaris-generation-033. Syzygy fetches nothing: it reads the operator's
clone by object identifier through the in-process reader of syzygy-qkea.3
(`packages/polaris-dossier/src/git-object-reader.ts`). The parked
1.0.0-candidate.1 version in `public-admission-registry-entries/` is neither
edited nor superseded; the two may not both be installed.

The entry binds nothing until the owner signs it off by version tag
(`record_versioned_signoff.py --record public-git-source-acquisition-local-agent`),
which is lawful only if the owner extends Scope A to it at the sitting. The
review that clears it is the sitting review: its head binds the sitting
manifest `dossier-local-agent-acts/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt`,
whose row for the proposed file must equal that file's SHA-256, so the
reviewed bytes are the signed bytes.

`check(root)` verifies the package in either state and writes nothing:

- the proposed entry is one entry carrying the RFC4-2 declarations, the
  observer id and version above, a non-null implementation version, the
  implementation path, no fetch, no network destination, no write surface,
  no database, no working-tree read and no execution; its Git object input
  is the operator-declared clone; its read authority names every clone file
  the reader refuses to honour; its contract version is the installed Butlers
  entry's; its failure states and admission mappings use RFC2-23 and RFC2-24
  words only; every input class is mapped and every resource limit has its
  semantics;
- no package Markdown file carries a 64-hex token;
- the sitting manifest, when present, rows the proposed file at its SHA-256;
- the parked version is not installed (two adapters for one authority);
- an installed copy is byte-identical to the proposed file, and exists only
  beside its sign-off record; once a v1.1 sign-off record exists, the v1.1
  builder's ``signed_findings()`` answers for the installed bytes instead.

`apply(root)` refuses unless the package verifies unapplied and the
implementation file exists, then copies the proposed bytes, unchanged, to
`declarations/adapter-registry/` (the installed Butlers entry is the
precedent: status words stay candidate, the act record gives effect).
`applied(root)` is true when that copy is present and byte-identical.

The CLI writes nothing: `--check`, `--digests`, `--selftest`. The sign-off
recorder is the one writer.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import pathlib
import re
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = "public-git-source-acquisition-local-agent"
CANDIDATES = pathlib.Path(".syzygy/governance/contracts/candidates")
PKG = CANDIDATES / KEY
NAME = "POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json"
PROPOSED = PKG / "proposed" / NAME
INSTALLED_DIR = pathlib.Path(".syzygy/governance/declarations/adapter-registry")
INSTALLED = INSTALLED_DIR / NAME
#: The parked provider-mode version; installing both would give one authority two adapters.
PARKED_INSTALLED = INSTALLED_DIR / "POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-CANDIDATE.json"
BUTLERS = INSTALLED_DIR / "POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json"
SITTING_MANIFEST = CANDIDATES / "dossier-local-agent-acts/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt"
SIGNOFF_RECORD = pathlib.Path(".syzygy/governance/decisions/"
                              "PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.0.md")
#: A later version's record; once it exists the v1.1 builder answers for the
#: installed bytes (`build_public_git_source_acquisition_local_agent_v1_1.py`).
V11_RECORD = pathlib.Path(".syzygy/governance/decisions/"
                          "PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-SIGNOFF-v1.1.md")
IMPLEMENTATION = "packages/polaris-dossier/src/git-object-reader.ts"
OBSERVER_ID = "polaris-public-git-source-acquisition"
OBSERVER_VERSION = "2.0.0-candidate.1"
CLONE_SCHEME = "repository-id-plus-operator-declared-clone-git-dir"
HEX64 = re.compile(r"[0-9a-f]{64}")
ROW_RE = re.compile(r"^([0-9a-f]{64})  (\S+)$", re.MULTILINE)
#: RFC4-2 items 1-7 as the keys an entry must carry.
REQUIRED = ("observerId", "implementationId", "observerVersion", "implementationVersion",
            "contractId", "contractVersion", "inputClasses", "outputFactClasses",
            "determinismClass", "failureStates", "typedAuthority")
#: Clone files the reader never honours; the read authority must name each.
NOT_HONOURED = ("ref", "index", "working tree", "configuration", "hook", "alternates",
                "grafts", "shallow", "replace ref", "commit-graph", "no process is started")
DEGRADATION = {"Observer failed", "Source unreachable", "Partial snapshot",
               "Excluded content", "Consent withdrawn", "Missing quantity"}
REASONS = {"missing-declaration", "missing-evidence", "no-currency-bound-declared",
           "stale-beyond-currency-bound", "mapping-coverage-absent",
           "unconsented-source-or-provider", "excluded-content",
           "contradicted-pending-adjudication", "challenge-suspended",
           "source-uncaptured-or-unreachable", "reference-unresolvable",
           "execution-blocked"}
CLASSES = {"capture", "derivation-deterministic"}
#: Declarations the reader file does not implement (R-1 Finding 2): the entry
#: must assign each to the dossier gate, never claim it for the reader.
AWAITING_GATE = ("resourceLimits.maxSources", "resourceLimits.maxBytesPerSource",
                 "resourceLimits.maxTotalBytes", "resourceLimits.maxTreeEntries", "screening",
                 "outputFactClasses.pinned-object-read-record",
                 "outputFactClasses.content-exclusion", "outputFactClasses.unknown")


class Refusal(RuntimeError):
    """The package does not verify; nothing is written."""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def entry_findings(doc: dict, butlers_contract: str) -> list[str]:
    out = []
    if doc.get("status") != "candidate-entry-no-effect-until-owner-act":
        out.append("status is not the candidate label")
    if len(doc.get("entries", [])) != 1:
        return out + ["not exactly one entry"]
    e = doc["entries"][0]
    for k in REQUIRED:
        if k not in e:
            out.append(f"missing RFC4-2 declaration {k}")
    if (e.get("observerId"), e.get("observerVersion")) != (OBSERVER_ID, OBSERVER_VERSION):
        out.append("observer id or version is not the local-agent version")
    if not e.get("implementationVersion"):
        out.append("implementationVersion is null: the entry names an implemented reader")
    if e.get("implementation") != IMPLEMENTATION:
        out.append(f"implementation is not {IMPLEMENTATION}")
    ta = e.get("typedAuthority", {})
    if not str(ta.get("fetch", "")).startswith("none"):
        out.append("fetch is not none")
    for k in ("networkAccess", "writeSurface", "databaseAccess"):
        if ta.get(k) != []:
            out.append(f"{k} must be empty")
    if ta.get("workingTreeRead") is not False:
        out.append("workingTreeRead must be false")
    if ta.get("executeObservedCode") is not False:
        out.append("executeObservedCode must be false")
    read = ta.get("readAuthority", "")
    for word in NOT_HONOURED:
        if word not in read:
            out.append(f"readAuthority does not name {word!r}")
    schemes = {c.get("class"): c.get("identityScheme") for c in e.get("inputClasses", [])}
    if schemes.get("git-object-database") != CLONE_SCHEME:
        out.append("git-object-database is not the operator-declared clone scheme")
    if e.get("determinismClass") not in CLASSES:
        out.append("determinismClass outside RFC4-2")
    outputs = {c.get("class") for c in e.get("outputFactClasses", [])}
    by_class = e.get("determinismByOutputClass", {})
    if set(by_class) != outputs or not set(by_class.values()) <= CLASSES:
        out.append("determinismByOutputClass does not cover each output class once")
    if "determinismClassNote" not in e:
        out.append("scalar determinismClass is unexplained")
    if e.get("contractVersion") != butlers_contract:
        out.append("contractVersion differs from the installed Butlers entry's")
    if e.get("adoptionStatus") != "candidate-entry-unadopted":
        out.append("adoptionStatus is not candidate-entry-unadopted")
    for key, state in e.get("failureStates", {}).items():
        if "degradationState" in state and state["degradationState"] not in DEGRADATION:
            out.append(f"failure state {key} names a degradation state outside RFC2-23")
        if "degradationState" not in state and "executionFact" not in state:
            out.append(f"failure state {key} names neither a degradation state nor an execution fact")
        if state.get("unknownReason") not in REASONS:
            out.append(f"failure state {key} names a reason outside RFC2-24")
    for key, reason in e.get("admissionFailureMapping", {}).items():
        if reason not in REASONS:
            out.append(f"admission failure {key} names a reason outside RFC2-24")
    mapping = e.get("snapshotInputMapping")
    if not isinstance(mapping, dict):
        out.append("snapshotInputMapping is not a per-class mapping")
    else:
        unmapped = set(schemes) - set(mapping)
        if unmapped:
            out.append(f"snapshotInputMapping omits input classes {sorted(unmapped)}")
    limits, sem = e.get("resourceLimits", {}), e.get("resourceLimitSemantics", {})
    for k in limits:
        if k != "status" and k not in sem:
            out.append(f"resource limit {k} has no semantics")
    if not e.get("supersession"):
        out.append("supersession statement missing")
    cov = e.get("implementationCoverage", {})
    if not isinstance(cov, dict) or not cov.get("reader") or not cov.get("awaitingGate"):
        out.append("implementationCoverage does not split the reader's declarations from the gate's")
    else:
        for name in AWAITING_GATE:
            if name not in cov["awaitingGate"]:
                out.append(f"implementationCoverage.awaitingGate omits {name}, which the reader does not do")
        both = set(cov["reader"]) & set(cov["awaitingGate"])
        if both:
            out.append(f"implementationCoverage assigns {sorted(both)} to both")
    if "classification-policy" not in schemes:
        out.append("inputClasses lacks the classification policy the derivation requires")
    for key in ("missingClassificationPolicy", "mismatchedStaleRevokedOrUnattributedClassificationPolicy"):
        if key not in e.get("admissionFailureMapping", {}):
            out.append(f"admissionFailureMapping lacks {key}")
    return out


def check(root: pathlib.Path = ROOT) -> list[str]:
    out = []
    proposed = root / PROPOSED
    if not proposed.is_file():
        return [f"{PROPOSED.as_posix()} is missing"]
    data = proposed.read_bytes()
    try:
        doc = json.loads(data)
        contract = json.loads((root / BUTLERS).read_text())["entries"][0]["contractVersion"]
    except (ValueError, OSError, KeyError, IndexError) as exc:
        return [f"entry or Butlers entry unreadable: {exc}"]
    out += entry_findings(doc, contract)
    for md in sorted((root / PKG).glob("*.md")):
        if re.search(r"ROUND-\d+-DISPOSITIONS\.md$", md.name):
            continue
        if HEX64.search(md.read_text(encoding="utf-8")):
            out.append(f"{md.name}: carries a 64-hex token")
    manifest = root / SITTING_MANIFEST
    if manifest.is_file():
        rows = {p: s for s, p in ROW_RE.findall(manifest.read_text(encoding="utf-8"))}
        if rows.get(PROPOSED.as_posix()) != sha(data):
            out.append("the sitting manifest does not row the proposed entry at its SHA-256")
    if (root / PARKED_INSTALLED).exists():
        out.append("the parked provider-mode version is installed: one authority, two adapters")
    installed = root / INSTALLED
    if (root / V11_RECORD).is_file():
        # Once v1.1 is signed the installed bytes are v1.1's, and the v1.1
        # builder answers for them (and for v1.0's bytes as its base).
        import build_public_git_source_acquisition_local_agent_v1_1 as v11
        out += v11.signed_findings(root)
    elif installed.exists():
        if installed.read_bytes() != data:
            out.append("the installed copy differs from the proposed bytes")
        if not (root / SIGNOFF_RECORD).is_file():
            out.append("an installed copy exists without its sign-off record")
    return out


def applied(root: pathlib.Path = ROOT) -> bool:
    installed, proposed = root / INSTALLED, root / PROPOSED
    return (installed.is_file() and proposed.is_file()
            and installed.read_bytes() == proposed.read_bytes())


def apply(root: pathlib.Path = ROOT) -> int:
    if (root / INSTALLED).exists():
        raise Refusal("the entry is already installed")
    findings = check(root)
    if findings:
        raise Refusal("package does not verify: " + " | ".join(findings))
    if not (root / IMPLEMENTATION).is_file():
        raise Refusal(f"{IMPLEMENTATION} is absent: the entry names a reader this tree lacks")
    shutil.copyfile(root / PROPOSED, root / INSTALLED)
    return 0


# --- selftest ---------------------------------------------------------------

def _fixture(tmp: pathlib.Path) -> pathlib.Path:
    for rel in (PROPOSED, BUTLERS):
        (tmp / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / rel, tmp / rel)
    (tmp / IMPLEMENTATION).parent.mkdir(parents=True, exist_ok=True)
    (tmp / IMPLEMENTATION).write_text("// reader\n")
    return tmp


def _mutated(tmp: pathlib.Path, fn) -> pathlib.Path:
    doc = json.loads((tmp / PROPOSED).read_text())
    fn(doc["entries"][0])
    (tmp / PROPOSED).write_text(json.dumps(doc, indent=2) + "\n")
    return tmp


def selftest() -> int:
    results: list[tuple[str, bool]] = []

    def caught(name, mutate, needle):
        with tempfile.TemporaryDirectory() as t:
            tmp = _fixture(pathlib.Path(t))
            mutate(tmp)
            found = check(tmp)
            results.append((name, any(needle in f for f in found)))

    with tempfile.TemporaryDirectory() as t:
        results.append(("the shipped entry verifies", check(_fixture(pathlib.Path(t))) == []))
    entry_mutants = (
        ("a fetch", lambda e: e["typedAuthority"].__setitem__("fetch", "git fetch"), "fetch is not none"),
        ("a network destination", lambda e: e["typedAuthority"].__setitem__("networkAccess", ["github.com"]),
         "networkAccess must be empty"),
        ("a write surface", lambda e: e["typedAuthority"].__setitem__("writeSurface", ["run dir"]),
         "writeSurface must be empty"),
        ("a working-tree read", lambda e: e["typedAuthority"].__setitem__("workingTreeRead", True),
         "workingTreeRead"),
        ("execution", lambda e: e["typedAuthority"].__setitem__("executeObservedCode", True),
         "executeObservedCode"),
        ("alternates unnamed", lambda e: e["typedAuthority"].__setitem__(
            "readAuthority", e["typedAuthority"]["readAuthority"].replace("alternates", "alt")),
         "'alternates'"),
        ("the run-directory clone scheme", lambda e: next(
            c for c in e["inputClasses"] if c["class"] == "git-object-database").__setitem__(
            "identityScheme", "repository-id-plus-run-directory-clone-path"), "clone scheme"),
        ("another contract version", lambda e: e.__setitem__("contractVersion", "sha256:" + "0" * 64),
         "contractVersion"),
        ("a null implementation version", lambda e: e.__setitem__("implementationVersion", None),
         "implementationVersion"),
        ("another implementation path", lambda e: e.__setitem__("implementation", "x.ts"),
         "implementation is not"),
        ("the parked version number", lambda e: e.__setitem__("observerVersion", "1.0.0-candidate.1"),
         "observer id or version"),
        ("an adopted status word", lambda e: e.__setitem__("adoptionStatus", "adopted"), "adoptionStatus"),
        ("a reason outside RFC2-24", lambda e: e["failureStates"]["objectRefused"].__setitem__(
            "unknownReason", "corrupt"), "outside RFC2-24"),
        ("a degradation state outside RFC2-23", lambda e: e["failureStates"]["objectRefused"].__setitem__(
            "degradationState", "Broken"), "outside RFC2-23"),
        ("an unmapped input class", lambda e: e["snapshotInputMapping"].pop("git-blob"), "omits input"),
        ("a limit without semantics", lambda e: e["resourceLimits"].__setitem__("maxX", 1), "maxX"),
        ("no supersession", lambda e: e.pop("supersession"), "supersession"),
        ("an output class without determinism", lambda e: e["determinismByOutputClass"].pop("source-span"),
         "determinismByOutputClass"),
        ("an unexplained scalar determinism", lambda e: e.pop("determinismClassNote"), "unexplained"),
        ("a missing RFC4-2 key", lambda e: e.pop("determinismClass"), "missing RFC4-2"),
        ("a limit claimed for the reader", lambda e: e["implementationCoverage"]["awaitingGate"].remove(
            "resourceLimits.maxTreeEntries"), "omits resourceLimits.maxTreeEntries"),
        ("a declaration on both sides", lambda e: e["implementationCoverage"]["reader"].append("screening"),
         "to both"),
        ("no coverage split", lambda e: e.pop("implementationCoverage"), "does not split"),
        ("no classification-policy input", lambda e: e.__setitem__("inputClasses", [
            c for c in e["inputClasses"] if c["class"] != "classification-policy"]), "classification policy"),
        ("no classification-policy admission mapping", lambda e: e["admissionFailureMapping"].pop(
            "missingClassificationPolicy"), "missingClassificationPolicy"),
    )
    for name, fn, needle in entry_mutants:
        caught(f"{name} refused", lambda tmp, fn=fn: _mutated(tmp, fn), needle)

    def manifest(tmp, digest):
        (tmp / SITTING_MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        (tmp / SITTING_MANIFEST).write_text(f"# m\n{digest}  {PROPOSED.as_posix()}\n")
    caught("a stale sitting-manifest row refused", lambda tmp: manifest(tmp, "0" * 64), "sitting manifest")
    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        manifest(tmp, sha((tmp / PROPOSED).read_bytes()))
        results.append(("a current sitting-manifest row accepted", check(tmp) == []))
    caught("a digest in a package Markdown file refused",
           lambda tmp: (tmp / PKG / "PACKET.md").write_text("a" * 64), "64-hex")

    def park(tmp):
        (tmp / PARKED_INSTALLED).write_text("{}")
    caught("the parked version installed refused", park, "parked")

    def stray(tmp):
        shutil.copyfile(tmp / PROPOSED, tmp / INSTALLED)
    caught("an installed copy without its sign-off record refused", stray, "without its sign-off")

    def drift(tmp):
        (tmp / INSTALLED).write_text("{}")
        (tmp / SIGNOFF_RECORD).parent.mkdir(parents=True, exist_ok=True)
        (tmp / SIGNOFF_RECORD).write_text("record\n")
    caught("an installed copy differing from the proposed bytes refused", drift, "differs")

    def later(tmp):
        shutil.copyfile(tmp / PROPOSED, tmp / INSTALLED)
        (tmp / V11_RECORD).parent.mkdir(parents=True, exist_ok=True)
        (tmp / V11_RECORD).write_text("record\n")
    caught("a v1.1 record defers to the v1.1 builder, which refuses v1.0's bytes installed", later,
           "installed entry is not the v1.1 bytes")

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        (tmp / IMPLEMENTATION).unlink()
        try:
            apply(tmp)
            ok = False
        except Refusal as exc:
            ok = "absent" in str(exc) and not (tmp / INSTALLED).exists()
        results.append(("apply refuses without the reader file, writing nothing", ok))
    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        _mutated(tmp, lambda e: e["typedAuthority"].__setitem__("fetch", "git fetch"))
        try:
            apply(tmp)
            ok = False
        except Refusal:
            ok = not (tmp / INSTALLED).exists()
        results.append(("apply refuses an entry that does not verify, writing nothing", ok))
    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        before = applied(tmp)
        code = apply(tmp)
        (tmp / SIGNOFF_RECORD).parent.mkdir(parents=True, exist_ok=True)
        (tmp / SIGNOFF_RECORD).write_text("record\n")
        results.append(("apply installs the exact bytes and check passes applied",
                        not before and code == 0 and applied(tmp) and check(tmp) == []))
        try:
            apply(tmp)
            again = False
        except Refusal:
            again = True
        results.append(("a second apply refuses", again))
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
        print(f"{sha((ROOT / PROPOSED).read_bytes())}  {PROPOSED.as_posix()}")
        return 0
    findings = check(ROOT)
    for f in findings:
        print(f"FAIL {f}")
    print(f"{KEY}: " + ("applied" if applied(ROOT) else "unapplied")
          + (f", {len(findings)} findings" if findings else ", verifies"))
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
