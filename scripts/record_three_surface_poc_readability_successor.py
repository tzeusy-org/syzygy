#!/usr/bin/env python3
"""Record the owner's sign-off of the Three-Surface POC readability successor.

The owner signs off by writing exactly

    SIGN OFF THREE-SURFACE POC READABILITY SUCCESSOR: <sha256>

where the argument is the sha256 of the package manifest
`THREE-SURFACE-POC-READABILITY-SUCCESSOR-MANIFEST.txt`. Its six rows name the
proposed digest of each signed POC subject: four restyled, two unchanged.

The recorder is pinned to the reviewed package:

- `FROZEN_MANIFEST_SHA`: the manifest digest the binding review re-derived;
- `REVIEW` / `REVIEW_SHA`: that review's retained raw, by path and sha256.
  The raw must carry exactly one `Verdict:` line, `CONFIRM` or
  `CONFIRM WITH EXCEPTIONS`, and exactly one `Manifest-file SHA-256:` line
  naming the pinned digest.

`--record --phrase "<owner phrase verbatim>"` refuses unless the phrase is the
exact `LABEL: <sha256>` form over the pinned digest, the raw matches its pin,
the package builder verifies, and every signed subject still holds its
effective predecessor bytes. It then writes, in order:

1. the dedicated record `decisions/THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md`;
2. one marked section in `decisions/ACCEPTANCE-ACT-RECORD.md`, the dedicated
   record's bytes;
3. the four restyled subjects, from the builder's proposed bytes.

`--check` reports one of two states and exits 0: `candidate-unperformed`
(no record; every subject at its predecessor bytes) or `performed-exact`
(both records exact; every subject at its manifest row). Anything in between
fails: a partial record, installed bytes without a record, or drift.
"""
import argparse
from collections import namedtuple
from datetime import datetime, timezone
import hashlib
import importlib.util
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = (".syzygy/governance/contracts/candidates/"
           "three-surface-poc-readability-successor/")
MANIFEST = PACKAGE + "THREE-SURFACE-POC-READABILITY-SUCCESSOR-MANIFEST.txt"
ACT = ".syzygy/governance/decisions/THREE-SURFACE-POC-READABILITY-SUCCESSOR-ACT.md"
AGGREGATE = ".syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md"
BUILDER = "scripts/build_three_surface_poc_readability_successor.py"
LABEL = "SIGN OFF THREE-SURFACE POC READABILITY SUCCESSOR"
MARKER = "THREE-SURFACE-POC-READABILITY-SUCCESSOR"
INSTANT = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z")
PHRASE = re.compile(re.escape(LABEL) + r": ([0-9a-f]{64})")
ROW = re.compile(r"^([0-9a-f]{64})  (\S[^\n]*)$", re.M)
VERDICT = re.compile(r"^Verdict: (.*)$", re.M)
VERDICTS = ("CONFIRM", "CONFIRM WITH EXCEPTIONS")

#: The effective predecessor of each signed subject: five rows of
#: THREE-SURFACE-POC-SPEC-SIGNOFF-ACT.md, and the CONTRACT-COVERAGE.md row the
#: general trusted-bootstrap transaction replaced on 2026-09-01.
PREDECESSOR = {
    "openspec/changes/three-surface-poc-experience/.openspec.yaml":
        "9187547d8cc17017ebd44132527d2d5e096d1ef9705de80cc4f1cf34531f6976",
    "openspec/changes/three-surface-poc-experience/CONTRACT-COVERAGE.md":
        "f29a01f6a5725f4ac7085fa04a62de757fd16153d507ae5e415ae0b501fdc0a4",
    "openspec/changes/three-surface-poc-experience/GOVERNING-DEPENDENCIES.md":
        "4bdcf6c6dbd07aad7d44fb1d6fbb9ae37ea56bed2ed66532231cdc37a71c1da4",
    "openspec/changes/three-surface-poc-experience/design.md":
        "0847bf5f78155712c13535a3de4a25be300ee6a726b5199e84e318103c28695c",
    "openspec/changes/three-surface-poc-experience/proposal.md":
        "6459f56cba26e0bc38c71a4a93ea571aa11eabdc847c96c81f8afcf30b72eddb",
    "openspec/changes/three-surface-poc-experience/specs/three-surface-poc-experience/spec.md":
        "f0eda5b9ec8766e2b4b961fb2940c4ece7aa97b1c397e10d570abb04f5dd960e",
}

#: Pins to the reviewed package.
FROZEN_MANIFEST_SHA = "221f1ececa321bf0cc6cd5e01f401e9eada38466c3c00dde43095f8cb8a0cd4d"
REVIEW = "docs/reviews/R-POC-READABILITY-SUCCESSOR-PACKAGE-1-RAW.md"
REVIEW_SHA = "8170554c25040cf87f8b5e40342e959d1d94bfed976d8d41ca662b85d5acb255"

Pins = namedtuple("Pins", "manifest_sha review review_sha")


def pinned():
    return Pins(FROZEN_MANIFEST_SHA, REVIEW, REVIEW_SHA)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read(root, rel):
    path = Path(rel)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("invalid path")
    target = root / path
    if any(p.is_symlink() for p in [target, *target.parents] if p != root.parent):
        raise ValueError(f"symlinked subject: {rel}")
    return target.read_bytes()


def builder(root):
    spec = importlib.util.spec_from_file_location(
        "poc_readability_builder", root / BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def rows(root):
    found = {path: sha for sha, path in ROW.findall(read(root, MANIFEST).decode())}
    if sorted(found) != sorted(PREDECESSOR):
        raise ValueError("manifest rows are not exactly the six signed subjects")
    return found


def subjects(root):
    """Subject digests as this successor installed them: a later recorded
    sign-off's applied patches are reversed first (the builder's
    ``installed_bytes_at``), so a registered successor is history, not drift."""
    for rel in PREDECESSOR:
        read(root, rel)  # the symlink and path guards, on every subject
    installed = builder(root).installed_bytes_at(root)
    return {rel: digest(installed[Path(rel)]) for rel in PREDECESSOR}


def validate_pins(root, pins):
    if None in pins:
        raise ValueError("recorder unpinned: FROZEN_MANIFEST_SHA, REVIEW and "
                         "REVIEW_SHA must name the reviewed package and its "
                         "confirming raw before any act is recorded")
    current = digest(read(root, MANIFEST))
    if current != pins.manifest_sha:
        raise ValueError(f"manifest digest {current} differs from the pinned "
                         f"reviewed digest {pins.manifest_sha}")
    raw = read(root, pins.review)
    if digest(raw) != pins.review_sha:
        raise ValueError(f"review raw {pins.review} differs from its pinned sha256")
    text = raw.decode("utf-8")
    verdicts = VERDICT.findall(text)
    if len(verdicts) != 1 or verdicts[0].strip() not in VERDICTS:
        raise ValueError("review raw needs exactly one `Verdict:` line, CONFIRM "
                         "or CONFIRM WITH EXCEPTIONS")
    bindings = re.findall(r"^Manifest-file SHA-256: ([0-9a-f]{64})$", text, re.M)
    if bindings != [pins.manifest_sha]:
        raise ValueError("review raw does not bind the pinned manifest digest "
                         "on exactly one `Manifest-file SHA-256:` line")
    return current


def validate_phrase(phrase):
    m = PHRASE.fullmatch(phrase or "")
    if not m:
        raise ValueError(f"owner phrase must be exactly `{LABEL}: <sha256>`, "
                         f"got {phrase!r}")
    return m.group(1)


def body(sha, instant, pins, manifest_rows):
    if not INSTANT.fullmatch(instant):
        raise ValueError("invalid act instant")
    datetime.strptime(instant, "%Y-%m-%dT%H:%M:%SZ")
    table = "\n".join(f"| `{rel}` | `{PREDECESSOR[rel]}` | `{manifest_rows[rel]}` |"
                      for rel in sorted(PREDECESSOR))
    return f"""# Three-Surface POC readability successor sign-off

Owner: Tzeusy

Act instant: {instant}

Project identity: project:syzygy

Artifact identity: specification:syzygy:three-surface-poc-experience:readability-successor

Act type: sign off specification successor (successor to THREE-SURFACE-POC-SPEC-SIGNOFF-ACT.md and to the coverage row of the general trusted-bootstrap transaction)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
{LABEL}: {sha}
```

The argument is the sha256 of {MANIFEST}. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the recorder pins.

Confirming review: {pins.review} (sha256 {pins.review_sha})

Signed subjects, predecessor and successor digests:

| Subject | Predecessor | Successor |
|---|---|---|
{table}

Scope: readability restyle of the six-file Three-Surface POC specification.
The 24 POC-REQ identities, their requirement words, scenarios and warrants
are unchanged; the package builder verifies them.

Supersession relationship: each subject is bound by its successor digest
above. The earlier sign-off act and its digests are preserved as act-time
history.

Revocation relationship: none. This act widens no implementation direction
and grants no source, provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
"""


def block(content):
    return f"<!-- {MARKER}:BEGIN -->\n{content}<!-- {MARKER}:END -->\n"


def check(root, pins=None):
    """Return the state name; raise on any partial or drifted state."""
    pins = pinned() if pins is None else pins
    aggregate = read(root, AGGREGATE).decode()
    act_exists = (root / ACT).exists()
    current = subjects(root)
    if not act_exists and MARKER not in aggregate and LABEL not in aggregate:
        if current != PREDECESSOR:
            drifted = sorted(rel for rel in PREDECESSOR
                             if current[rel] != PREDECESSOR[rel])
            raise ValueError("signed subject changed without a sign-off: "
                             + ", ".join(drifted))
        return "candidate-unperformed"
    if not act_exists:
        raise ValueError("the aggregate carries the act but the dedicated record is absent")
    sha = validate_pins(root, pins)
    manifest_rows = rows(root)
    actual = read(root, ACT).decode()
    instant = re.search(r"^Act instant: (.+)$", actual, re.M)
    if not instant or actual != body(sha, instant.group(1), pins, manifest_rows):
        raise ValueError("dedicated act mismatch")
    for text, where in ((actual, ACT), (aggregate, AGGREGATE)):
        lines = [line for line in text.splitlines() if LABEL in line]
        if lines != [f"{LABEL}: {sha}"]:
            raise ValueError(f"{where}: expected exactly one binding line")
    if (any(aggregate.count(f"<!-- {MARKER}:{s} -->") != 1 for s in ("BEGIN", "END"))
            or aggregate.count(block(actual)) != 1):
        raise ValueError(f"{AGGREGATE}: act section missing, changed or duplicated")
    if current != manifest_rows:
        drifted = sorted(rel for rel in PREDECESSOR
                         if current[rel] != manifest_rows[rel])
        raise ValueError("signed subject differs from its successor row: "
                         + ", ".join(drifted))
    return "performed-exact"


def record(root, phrase, instant, pins=None):
    pins = pinned() if pins is None else pins
    argument = validate_phrase(phrase)
    sha = validate_pins(root, pins)
    if argument != sha:
        raise ValueError(f"owner argument {argument} does not match manifest {sha}")
    if check(root, pins) != "candidate-unperformed":
        raise ValueError("sign-off already recorded")
    package = builder(root)
    findings, proposed = package.check()
    if findings:
        raise ValueError("package does not verify: " + "; ".join(findings[:3]))
    manifest_rows = rows(root)
    proposed = {rel.as_posix(): data for rel, data in proposed.items()}
    if {rel: digest(data) for rel, data in proposed.items()} != manifest_rows:
        raise ValueError("proposed bytes differ from the manifest rows")
    content = body(sha, instant, pins, manifest_rows)
    with (root / ACT).open("x", encoding="utf-8") as stream:
        stream.write(content)
    with (root / AGGREGATE).open("ab") as stream:
        stream.write(("\n" + block(content)).encode())
    for rel in sorted(PREDECESSOR):
        if proposed[rel] != read(root, rel):
            (root / rel).write_bytes(proposed[rel])
    if check(root, pins) != "performed-exact":
        raise ValueError("record did not read back")


# ------------------------------------------------------------------ selftest

def selftest():
    """Run every refusal on a scratch clone of the committed tree."""
    results = []
    with tempfile.TemporaryDirectory() as directory:
        base = Path(directory) / "repo"
        subprocess.run(["git", "clone", "-q", str(ROOT), str(base)], check=True)
        subprocess.run(["git", "-C", str(base), "config", "gc.auto", "0"], check=True)
        subprocess.run(["git", "-C", str(base), "config", "maintenance.auto", "false"], check=True)
        for rel in (BUILDER, "scripts/record_three_surface_poc_readability_successor.py"):
            shutil.copyfile(ROOT / rel, base / rel)
        review = "docs/reviews/R-SELFTEST-RAW.md"
        if (base / ACT).exists():
            # Resolve later signed layers while the complete act chain exists.
            # Removing this predecessor act first invalidates P115 recognition.
            predecessor = builder(base).predecessor_bytes()
            (base / ACT).unlink()
            aggregate = read(base, AGGREGATE).decode()
            begin = aggregate.index(f"\n<!-- {MARKER}:BEGIN -->")
            end = aggregate.index(f"<!-- {MARKER}:END -->\n") + len(f"<!-- {MARKER}:END -->\n")
            (base / AGGREGATE).write_text(aggregate[:begin] + aggregate[end:])
            for rel, data in predecessor.items():
                (base / rel).write_bytes(data)
            subprocess.run(["git", "-C", str(base), "-c", "user.email=selftest@example.invalid",
                            "-c", "user.name=selftest", "commit", "-qam", "unperform"],
                           check=True)

        def reset():
            subprocess.run(["git", "-C", str(base), "checkout", "-q", "--", "."],
                           check=True)
            subprocess.run(["git", "-C", str(base), "clean", "-fdq", "--",
                            ".syzygy", "openspec", "docs"], check=True)

        def pins_for(text):
            target = base / review
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(text)
            return Pins(digest(read(base, MANIFEST)), review, digest(target.read_bytes()))

        def head(verdict="Verdict: CONFIRM", sha=None):
            sha = digest(read(base, MANIFEST)) if sha is None else sha
            return f"# review\n{verdict}\nManifest-file SHA-256: {sha}\n"

        def expect(label, fn, needle):
            try:
                fn()
            except ValueError as error:
                results.append((label, needle in str(error), str(error)))
            else:
                results.append((label, False, "accepted"))

        instant = "2026-09-29T00:00:00Z"
        reset()
        sha = digest(read(base, MANIFEST))
        phrase = f"{LABEL}: {sha}"
        results.append(("candidate state", check(base, Pins(None, None, None))
                        == "candidate-unperformed", ""))
        expect("unpinned refused",
               lambda: record(base, phrase, instant, Pins(None, None, None)),
               "recorder unpinned")
        good = pins_for(head())
        expect("wrong label refused",
               lambda: record(base, "ADOPT POC: " + sha, instant, good), "owner phrase")
        expect("wrong argument refused",
               lambda: record(base, f"{LABEL}: {'0' * 64}", instant, good),
               "does not match manifest")
        expect("stale pinned digest refused",
               lambda: record(base, phrase, instant, good._replace(manifest_sha="1" * 64)),
               "differs from the pinned")
        expect("raw sha mismatch refused",
               lambda: record(base, phrase, instant, good._replace(review_sha="2" * 64)),
               "differs from its pinned sha256")
        for label, text, needle in (
                ("REVISE verdict refused", head("Verdict: REVISE"), "exactly one `Verdict:`"),
                ("two verdicts refused", head() + "Verdict: REVISE\n", "exactly one `Verdict:`"),
                ("CONFIRMED is not CONFIRM", head("Verdict: CONFIRMED"), "exactly one `Verdict:`"),
                ("other manifest refused", head(sha="3" * 64), "does not bind"),
                ("two bindings refused", head() + f"Manifest-file SHA-256: {'4' * 64}\n",
                 "does not bind")):
            bad = pins_for(text)
            expect(label, lambda bad=bad: record(base, phrase, instant, bad), needle)
        expect("bad instant refused",
               lambda: record(base, phrase, "2026-09-29", pins_for(head())), "invalid act instant")
        spec = sorted(PREDECESSOR)[-1]
        (base / spec).write_bytes(read(base, spec) + b"\n")
        expect("drifted predecessor refused",
               lambda: record(base, phrase, instant, pins_for(head())), "without a sign-off")
        reset()
        wwe = pins_for(head("Verdict: CONFIRM WITH EXCEPTIONS"))
        record(base, phrase, instant, wwe)
        results.append(("CONFIRM WITH EXCEPTIONS records, performed-exact",
                        check(base, wwe) == "performed-exact", ""))
        expect("second record refused",
               lambda: record(base, phrase, instant, wwe), "already recorded")
        mutations = (
            ("subject drift after act", spec, lambda b: b + b"\n", "successor row"),
            ("act edited", ACT, lambda b: b.replace(b"Owner: Tzeusy", b"Owner: Other"),
             "dedicated act mismatch"),
            ("aggregate section duplicated", AGGREGATE,
             lambda b: b + b"\n" + block(read(base, ACT).decode()).encode(),
             "exactly one binding line"),
            ("aggregate marker duplicated", AGGREGATE,
             lambda b: b + f"<!-- {MARKER}:BEGIN -->\n".encode(), "duplicated"),
        )
        for label, rel, mutate, needle in mutations:
            original = read(base, rel)
            (base / rel).write_bytes(mutate(original))
            expect(label, lambda: check(base, wwe), needle)
            (base / rel).write_bytes(original)
        (base / ACT).unlink()
        expect("aggregate without dedicated record", lambda: check(base, wwe),
               "dedicated record is absent")
        reset()
        package = builder(base)
        _findings, proposed = package.check()
        for rel, data in proposed.items():
            (base / rel).write_bytes(data)
        expect("installed without an act", lambda: check(base, good),
               "without a sign-off")
        reset()
    failed = [(label, detail) for label, ok, detail in results if not ok]
    for label, detail in failed:
        print(f"FAIL {label}: {detail}")
    print(f"{len(results)} fixtures, {len(failed)} failing")
    return 1 if failed else 0


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--record", action="store_true")
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    parser.add_argument("--phrase", help=f"the owner's phrase, verbatim: '{LABEL}: <sha256>'")
    parser.add_argument("--instant", help="UTC act instant (default: now)")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    try:
        if args.record:
            instant = args.instant or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            record(ROOT, args.phrase, instant)
            print("Recorded the owner's POC readability successor sign-off and "
                  "installed the four restyled subjects; bootstrap provenance; A1 absent.")
            return 0
        state = check(ROOT)
    except (ValueError, OSError) as error:
        print(f"FAIL {error}")
        return 1
    print(f"PASS {state}: POC readability successor "
          + ("not performed; every signed subject at its predecessor bytes"
             if state == "candidate-unperformed"
             else "performed; both records exact, every subject at its successor row"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
