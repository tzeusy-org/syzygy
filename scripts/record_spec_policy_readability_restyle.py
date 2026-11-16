#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Record/check the owner's adoption of the specification-policy readability restyle.

The owner performs it by writing exactly

    CONFIRM SPECIFICATION POLICY READABILITY RESTYLE: <sha256>

where the argument is the sha256 of the package manifest *file*
`candidates/spec-policy-readability-restyle/SPEC-POLICY-AMENDMENT-MANIFEST.txt`,
built and verified by `scripts/build_spec_policy_readability_restyle.py`.

One phrase confirms both policies. The recorder derives, from the manifest's
two rows, the nested craft-amendment lines every existing check reads:

    CONFIRM CRAFT AMENDMENT: CC-IMPACT@<row digest>
    CONFIRM CRAFT AMENDMENT: CC-SPEC@<row digest>

They are recorder-generated from the confirmed manifest, never presented as
words the owner typed.

The recorder is pinned to the reviewed package:

- `FROZEN_MANIFEST_SHA`: the manifest-file digest the confirming review
  examined and the owner is offered;
- `REVIEW` / `REVIEW_SHA`: that review's retained raw, by path and sha256.
  Its first four non-blank lines must carry `Verdict: CONFIRM` or
  `Verdict: CONFIRM WITH EXCEPTIONS` and
  `Manifest SHA-256: <FROZEN_MANIFEST_SHA>` — the digest of the manifest
  *file*, which is the argument the owner speaks, not a row digest.

All three are pinned to the package and its confirming review.
`--record` refuses while any pin is `None`, when the owner's phrase is not
the exact `LABEL: <sha256>` form, when its argument differs from the current
manifest digest, when that digest differs from the pin, when the raw's sha or
head differ, or when the package does not verify unapplied. The order is
fixed: record first, then `build_spec_policy_readability_restyle.py --apply
--at-adoption` in the same change.

`--record --phrase "<owner phrase verbatim>"` writes three things:

- the dedicated record `decisions/SPEC-POLICY-READABILITY-RESTYLE-ADOPTION-ACT.md`;
- one marked section appended to `decisions/ACCEPTANCE-ACT-RECORD.md`, the
  dedicated record's bytes;
- one marked section appended to the craft `INSTALL-RECORD.md`.

Each record carries the owner's phrase once, and each nested line once.
`--check` verifies the pins, that every record regenerates exactly, and that
each marked section occurs once; it reports "not performed" and exits 0 when
no record exists, and fails on a partial record.
"""
import argparse
from collections import namedtuple
from datetime import datetime, timezone
import hashlib
import importlib.util
import io
from pathlib import Path
import re
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ".syzygy/governance/contracts/candidates/spec-policy-readability-restyle/"
MANIFEST = PACKAGE + "SPEC-POLICY-AMENDMENT-MANIFEST.txt"
ACT = ".syzygy/governance/decisions/SPEC-POLICY-READABILITY-RESTYLE-ADOPTION-ACT.md"
AGGREGATE = ".syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md"
INSTALL = ".syzygy/governance/policies/craft-and-care/INSTALL-RECORD.md"
BUILDER = "scripts/build_spec_policy_readability_restyle.py"
LABEL = "CONFIRM SPECIFICATION POLICY READABILITY RESTYLE"
MARKER = "SPEC-POLICY-READABILITY-RESTYLE-ADOPTION"
POLICIES = ".syzygy/governance/contracts/candidates/policy-candidates/"
NESTED = (("CONFIRM CRAFT AMENDMENT: CC-IMPACT",
           POLICIES + "SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md"),
          ("CONFIRM CRAFT AMENDMENT: CC-SPEC",
           POLICIES + "SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md"))
INSTANT = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z")
PHRASE = re.compile(re.escape(LABEL) + r": ([0-9a-f]{64})")
ROW = re.compile(r"^([0-9a-f]{64})  (\S[^\n]*)$", re.M)
VERDICTS = ("Verdict: CONFIRM", "Verdict: CONFIRM WITH EXCEPTIONS")

#: Pins to the reviewed package: the manifest digest the binding review
#: re-derived (the act argument) and that review's raw, by path and sha256.
FROZEN_MANIFEST_SHA = "0abd08981ae693720c33c339b9d53ac2a4c42c141d0ad23be2e83e90c5cd000e"
REVIEW = "docs/reviews/R-TREE-STYLE-SPEC-POLICY-PACKAGE-1-RAW.md"
REVIEW_SHA = "078f8aa18fbb143e9fe357901000154847eef3c8180e67bf14fb74c04ce0408b"

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
        raise ValueError("symlinked subject")
    return target.read_bytes()


def builder():
    spec = importlib.util.spec_from_file_location("spec_policy_builder", ROOT / BUILDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def review_head(text):
    return [line.strip() for line in text.splitlines() if line.strip()][:4]


def validate_pins(root, pins):
    """The pinned manifest digest, once the pins are set and the raw matches."""
    if None in pins:
        raise ValueError("recorder unpinned: FROZEN_MANIFEST_SHA, REVIEW and "
                         "REVIEW_SHA must name the reviewed package and its "
                         "confirming raw before any act is recorded")
    if not (root / MANIFEST).is_file():
        raise ValueError(f"manifest absent: {MANIFEST}")
    current = digest(read(root, MANIFEST))
    if current != pins.manifest_sha:
        raise ValueError(f"manifest digest {current} differs from the pinned "
                         f"reviewed digest {pins.manifest_sha}")
    raw = read(root, pins.review)
    if digest(raw) != pins.review_sha:
        raise ValueError(f"review raw {pins.review} differs from its pinned sha256")
    head = review_head(raw.decode("utf-8"))
    if not any(verdict in head for verdict in VERDICTS):
        raise ValueError("review raw head carries no exact CONFIRM or "
                         "CONFIRM WITH EXCEPTIONS verdict in its first four "
                         "non-blank lines")
    if f"Manifest SHA-256: {pins.manifest_sha}" not in head:
        raise ValueError("review raw head does not bind the pinned manifest digest")
    return current


def nested_lines(root):
    """The two recorder-generated craft-amendment lines, from the manifest rows."""
    rows = {path: sha for sha, path in ROW.findall(read(root, MANIFEST).decode())}
    if sorted(rows) != sorted(path for _label, path in NESTED):
        raise ValueError("manifest rows are not exactly the two policies")
    return [f"{label}@{rows[path]}" for label, path in NESTED]


def validate_phrase(phrase):
    m = PHRASE.fullmatch(phrase or "")
    if not m:
        raise ValueError(f"owner phrase must be exactly `{LABEL}: <sha256>`, "
                         f"got {phrase!r}")
    return m.group(1)


def verify_package(root, allow_applied):
    package = builder()
    try:
        if package.applied(root):
            if allow_applied:
                return
            raise ValueError("package bytes are already installed: record the "
                             "act first, then --apply --at-adoption")
        findings = package.check(root)
    except OSError as error:
        raise ValueError(f"package inputs unreadable: {error}") from error
    if findings:
        raise ValueError("package does not verify: " + "; ".join(findings[:3]))


def body(sha, instant, pins, nested):
    if not INSTANT.fullmatch(instant):
        raise ValueError("invalid act instant")
    try:
        datetime.strptime(instant, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        # strptime's own wording differs between Python versions, so the
        # refusal says it itself rather than passing the library's text on.
        raise ValueError("invalid act instant: not a calendar date") from None
    lines = "\n".join(nested)
    return f"""# Specification-policy readability restyle adoption

Owner: Tzeusy

Act instant: {instant}

Project identity: project:syzygy

Artifact identity: policy:syzygy:cc-spec-cc-impact:readability-restyle

Act type: confirm craft amendment (successor to acts 6 and 7 and to row 5 of the general trusted-bootstrap transaction)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
{LABEL}: {sha}
```

The argument is the sha256 of {MANIFEST}. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the recorder pins.

Confirming review: {pins.review} (sha256 {pins.review_sha})

The recorder derived one craft-amendment line per manifest row. They are not
words the owner typed; they name each policy's confirmed digest:

```text
{lines}
```

Scope: readability restyle of CC-SPEC-1…11 and CC-IMPACT-1…7, plus the
status-banner corrections disclosed in the package's decision packet. Clause
leads, headings and identifiers are unchanged by construction (the package
builder verifies all three). CC-IMPACT-7's fixture pin is unchanged.

Supersession relationship: each policy's current bytes are bound by its row
above. The act-6, act-7 and transaction-row digests remain preserved as
act-time history.

Revocation relationship: none. This act grants no implementation, source,
provider, write, deployment or release permission.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
"""


def block(content):
    return f"<!-- {MARKER}:BEGIN -->\n{content}<!-- {MARKER}:END -->\n"


def install_entry(sha, instant, nested):
    lines = "\n".join(nested)
    return f"""**Specification-policy readability restyle confirmed — {instant[:10]}.**
The owner confirmed the CC-REV-8 restyle of both specification policies by
writing `{LABEL}: <manifest digest>` over
`{MANIFEST}`
(sha256 `{sha}`). The recorder derived the policies' confirmed digests from
its rows:

```text
{lines}
```

Both policies are in force at those digests, at their committed home. The
earlier act-6, act-7 and transaction-row digests are act-time history. Act
record: `.syzygy/governance/decisions/SPEC-POLICY-READABILITY-RESTYLE-ADOPTION-ACT.md`.
"""


def parse(actual):
    instant = re.search(r"^Act instant: (.+)$", actual, re.M)
    if not instant:
        raise ValueError("dedicated act unparseable")
    return instant.group(1)


def check(root, verify=False, pins=None):
    """Returns False when nothing is recorded; raises on any partial or drifted record."""
    pins = pinned() if pins is None else pins
    act_exists = (root / ACT).exists()
    aggregate = read(root, AGGREGATE).decode()
    install = read(root, INSTALL).decode()
    if (not act_exists and all(MARKER not in text and LABEL not in text
                               for text in (aggregate, install))):
        return False
    if not act_exists:
        raise ValueError("a record carries the act but the dedicated record is absent")
    sha = validate_pins(root, pins)
    if verify:
        verify_package(root, allow_applied=True)
    nested = nested_lines(root)
    actual = read(root, ACT).decode()
    instant = parse(actual)
    if actual != body(sha, instant, pins, nested):
        raise ValueError("dedicated act mismatch")
    for text, where in ((actual, ACT), (aggregate, AGGREGATE)):
        lines = [line for line in text.splitlines() if LABEL in line]
        if lines != [f"{LABEL}: {sha}"]:
            raise ValueError(f"{where}: expected exactly one binding line")
    for text, where in ((actual, ACT), (aggregate, AGGREGATE), (install, INSTALL)):
        for line in nested:
            if text.splitlines().count(line) != 1:
                raise ValueError(f"{where}: expected exactly one `{line[:40]}…` line")
    for text, content, where in ((aggregate, actual, AGGREGATE),
                                 (install, install_entry(sha, instant, nested), INSTALL)):
        if (any(text.count(f"<!-- {MARKER}:{suffix} -->") != 1
                for suffix in ["BEGIN", "END"])
                or text.count(block(content)) != 1):
            raise ValueError(f"{where}: act section missing, changed or duplicated")
    return True


def record(root, phrase, instant, verify=True, pins=None):
    pins = pinned() if pins is None else pins
    argument = validate_phrase(phrase)
    sha = validate_pins(root, pins)
    if argument != sha:
        raise ValueError(f"owner argument {argument} does not match manifest {sha}")
    if verify:
        verify_package(root, allow_applied=False)
    nested = nested_lines(root)
    content = body(sha, instant, pins, nested)
    for rel in (AGGREGATE, INSTALL):
        text = read(root, rel)
        if MARKER.encode() in text or LABEL.encode() in text:
            raise ValueError("adoption already recorded or partial")
    if (root / ACT).exists():
        raise ValueError("adoption already recorded or partial")
    with (root / ACT).open("x", encoding="utf-8") as stream:
        stream.write(content)
    with (root / AGGREGATE).open("ab") as stream:
        stream.write(("\n" + block(content)).encode())
    with (root / INSTALL).open("ab") as stream:
        stream.write(("\n" + block(install_entry(sha, instant, nested))).encode())
    if not check(root, pins=pins):
        raise ValueError("record did not read back")


def write_review(root, rel, manifest_sha, verdict="Verdict: CONFIRM"):
    """A synthetic confirming raw for fixtures; returns its pins."""
    target = root / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(f"Title: restyle confirmation\n{verdict}\n"
                      f"Reviewed commit: {'0' * 40}\n"
                      f"Manifest SHA-256: {manifest_sha}\n\nBody.\n")
    return Pins(manifest_sha, rel, digest(target.read_bytes()))


def selftest():
    results = []
    roots = []
    records = (ACT, AGGREGATE, INSTALL)

    def refuses(label, fn, want):
        # A fixture root is shared: snapshot the records so a wrongly
        # accepted call fails only its own fixture, not every later one.
        root_now = roots[-1]
        saved = {rel: (root_now / rel).read_bytes() if (root_now / rel).exists()
                 else None for rel in records}
        try:
            fn()
        except ValueError as error:
            results.append((label, want in str(error)))
            if want not in str(error):
                print(f"  (got: {error})")
            return
        results.append((label, False))
        for rel, data in saved.items():
            if data is None:
                (root_now / rel).unlink(missing_ok=True)
            else:
                (root_now / rel).write_bytes(data)

    def seed(root):
        for rel, text in ((AGGREGATE, "# Synthetic aggregate\n"),
                          (INSTALL, "# Synthetic install record\n")):
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(text)

    instant = "2026-09-28T00:00:00Z"
    raw_rel = "docs/reviews/R-SPEC-RESTYLE-CONFIRM-RAW.md"

    # Synthetic group: record/check mechanics without the builder.
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        roots.append(root)
        seed(root)
        (root / MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        manifest = "# synthetic\n" + "".join(
            f"{digest(path.encode())}  {path}\n"
            for path in sorted(path for _label, path in NESTED))
        (root / MANIFEST).write_text(manifest)
        sha = digest(manifest.encode())
        pins = write_review(root, raw_rel, sha)
        phrase = f"{LABEL}: {sha}"
        results.append(("nothing recorded reads as not performed",
                        check(root, pins=pins) is False))
        refuses("unpinned recorder refused",
                lambda: record(root, phrase, instant, False, Pins(None, None, None)),
                "recorder unpinned")
        refuses("partly pinned recorder refused",
                lambda: record(root, phrase, instant, False, pins._replace(review_sha=None)),
                "recorder unpinned")
        refuses("owner words other than the phrase ('continue') refused",
                lambda: record(root, "continue", instant, False, pins), "owner phrase")
        refuses("phrase with trailing words refused",
                lambda: record(root, phrase + " please", instant, False, pins), "owner phrase")
        refuses("wrong digest argument refused",
                lambda: record(root, f"{LABEL}: {digest(b'other')}", instant, False, pins),
                "does not match manifest")
        refuses("manifest differing from the pinned digest refused",
                lambda: record(root, phrase, instant, False,
                               pins._replace(manifest_sha=digest(b"reviewed"))),
                "differs from the pinned reviewed digest")
        refuses("review raw sha mismatch refused",
                lambda: record(root, phrase, instant, False,
                               pins._replace(review_sha=digest(b"x"))),
                "differs from its pinned sha256")
        for label, verdict in (("REVISE verdict", "Verdict: REVISE"),
                               ("verdict past the four-line head",
                                "Note: a\nNote: b\nNote: c\nVerdict: CONFIRM")):
            bad = write_review(root, "docs/reviews/R-BAD-RAW.md", sha, verdict)
            refuses(f"review raw with {label} refused",
                    lambda: record(root, phrase, instant, False, bad),
                    "no exact CONFIRM")
        other_head = write_review(root, "docs/reviews/R-OTHER-RAW.md", digest(b"other"))
        refuses("review raw binding another manifest digest refused",
                lambda: record(root, phrase, instant, False,
                               other_head._replace(manifest_sha=sha)),
                "does not bind the pinned manifest digest")
        with_exceptions = write_review(root, "docs/reviews/R-CWE-RAW.md", sha,
                                       "Verdict: CONFIRM WITH EXCEPTIONS")
        results.append(("CONFIRM WITH EXCEPTIONS head accepted",
                        validate_pins(root, with_exceptions) == sha))
        refuses("invalid instant",
                lambda: record(root, phrase, "2026-02-30T00:00:00Z", False, pins),
                "not a calendar date")
        (root / MANIFEST).write_text(manifest.splitlines()[0] + "\n" + manifest.splitlines()[1] + "\n")
        short = write_review(root, raw_rel, digest((root / MANIFEST).read_bytes()))
        refuses("one-row manifest refused",
                lambda: record(root, f"{LABEL}: {short.manifest_sha}", instant, False, short),
                "not exactly the two policies")
        (root / MANIFEST).write_text(manifest)
        pins = write_review(root, raw_rel, sha)
        record(root, phrase, instant, verify=False, pins=pins)
        act = (root / ACT).read_text()
        nested = nested_lines(root)
        results.append(("dedicated record binds the manifest digest on one line",
                        [l for l in act.splitlines() if LABEL in l] == [phrase]))
        results.append(("nested lines name each row's digest",
                        all(act.splitlines().count(line) == 1 for line in nested)
                        and nested[1].endswith(digest(NESTED[1][1].encode()))))
        results.append(("install record carries both nested lines",
                        all((root / INSTALL).read_text().splitlines().count(line) == 1
                            for line in nested)))
        results.append(("provenance, A1 absence and pinned review recorded",
                        "Provenance: owner-adopted (bootstrap, uncorrelated)" in act
                        and "A1 audit-record identity: explicitly absent" in act
                        and f"{raw_rel} (sha256 {pins.review_sha})" in act))
        results.append(("recorded act checks", check(root, pins=pins) is True))
        refuses("second record refused",
                lambda: record(root, phrase, instant, False, pins), "already recorded")
        for rel in (AGGREGATE, INSTALL):
            with (root / rel).open("a") as stream:
                stream.write("\nLater unrelated record.\n")
        results.append(("non-tail readback checks", check(root, pins=pins) is True))
        manifest_file = root / MANIFEST
        saved = manifest_file.read_bytes()
        manifest_file.write_bytes(saved + b"# changed\n")
        refuses("manifest drift after recording", lambda: check(root, pins=pins),
                "differs from the pinned reviewed digest")
        manifest_file.write_bytes(saved)
        for rel in (AGGREGATE, INSTALL):
            saved_text = (root / rel).read_bytes()
            with (root / rel).open("a") as stream:
                stream.write(f"\n{nested[0]}\n")
            refuses(f"second nested line in {Path(rel).name}",
                    lambda: check(root, pins=pins), "expected exactly one")
            (root / rel).write_bytes(saved_text)
        saved_aggregate = (root / AGGREGATE).read_bytes()
        with (root / AGGREGATE).open("a") as stream:
            stream.write(f"\n{phrase}\n")
        refuses("second aggregate binding line", lambda: check(root, pins=pins),
                "expected exactly one binding line")
        (root / AGGREGATE).write_bytes(saved_aggregate)
        saved_install = (root / INSTALL).read_bytes()
        (root / INSTALL).write_bytes(saved_install.replace(b"Both policies are in force",
                                                           b"Both policies are candidates"))
        refuses("edited install section", lambda: check(root, pins=pins),
                "act section missing, changed or duplicated")
        (root / INSTALL).write_bytes(saved_install)
        (root / ACT).write_text(act.replace("Owner: Tzeusy", "Owner: someone"))
        refuses("edited dedicated record", lambda: check(root, pins=pins),
                "dedicated act mismatch")
        (root / ACT).unlink()
        refuses("aggregate without dedicated record", lambda: check(root, pins=pins),
                "dedicated record is absent")

    # Guard group: refusals that fire before anything is written.
    def guard_root(directory):
        root = Path(directory)
        roots.append(root)
        seed(root)
        (root / MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        text = "# synthetic\n" + "".join(
            f"{digest(path.encode())}  {path}\n"
            for path in sorted(path for _label, path in NESTED))
        (root / MANIFEST).write_text(text)
        sha = digest(text.encode())
        return root, sha, write_review(root, raw_rel, sha)

    for label, target in (("aggregate only", AGGREGATE), ("install only", INSTALL)):
        with tempfile.TemporaryDirectory() as directory:
            root, sha, pins = guard_root(directory)
            with (root / target).open("a") as stream:
                stream.write(f"<!-- {MARKER}:BEGIN -->\n")
            refuses(f"partial record ({label}) refused",
                    lambda: record(root, f"{LABEL}: {sha}", instant, False, pins),
                    "adoption already recorded or partial")
    with tempfile.TemporaryDirectory() as directory:
        root, sha, pins = guard_root(directory)
        (root / ACT).write_text("stray dedicated record\n")
        refuses("partial record (dedicated act only) refused",
                lambda: record(root, f"{LABEL}: {sha}", instant, False, pins),
                "adoption already recorded or partial")

    class Installed:
        @staticmethod
        def applied(_root):
            return True

        @staticmethod
        def check(_root):
            return ["would-be finding"]

    with tempfile.TemporaryDirectory() as directory:
        root, sha, pins = guard_root(directory)
        real_builder = builder
        globals()["builder"] = lambda: Installed
        try:
            refuses("already-installed package bytes refused before recording",
                    lambda: record(root, f"{LABEL}: {sha}", instant, True, pins),
                    "package bytes are already installed")
            results.append(("already-installed bytes pass with allow_applied",
                            verify_package(root, allow_applied=True) is None))
        finally:
            globals()["builder"] = real_builder

    # Real group: the real, verifying package in a fixture root.
    package = builder()
    if not (ROOT / PACKAGE).is_dir() or package.applied(ROOT):
        results.append(("real package present and unapplied (else skipped)", True))
    else:
        with tempfile.TemporaryDirectory() as directory:
            root = package._fixture(Path(directory))
            roots.append(root)
            seed(root)
            sha = digest((root / MANIFEST).read_bytes())
            pins = write_review(root, raw_rel, sha)
            phrase = f"{LABEL}: {sha}"
            results.append(("real package verifies", package.check(root) == []))
            patch = root / package.patch_for(NESTED[1][1])
            saved_patch = patch.read_bytes()
            tampered = saved_patch.replace(b"+> **In force:**", b"+> **In farce:**", 1)
            results.append(("real package: tamper target present", tampered != saved_patch))
            patch.write_bytes(tampered)
            refuses("real package: tampered patch refused by the builder's findings",
                    lambda: record(root, phrase, instant, True, pins),
                    "package does not verify: manifest differs from exact regeneration")
            patch.write_bytes(saved_patch)
            with io.StringIO() as sink:
                stdout, sys.stdout = sys.stdout, sink
                try:
                    early = package.apply(root, at_adoption=True, pins=pins)
                finally:
                    sys.stdout = stdout
            results.append(("real package: apply before record refused", early == 1
                            and not package.applied(root)))
            record(root, phrase, instant, verify=True, pins=pins)
            results.append(("real package: verified record reads back",
                            check(root, verify=True, pins=pins) is True))
            with io.StringIO() as sink:
                stdout, sys.stdout = sys.stdout, sink
                try:
                    code = package.apply(root, at_adoption=True, pins=pins)
                finally:
                    sys.stdout = stdout
            results.append(("real package: apply after record installs, check still passes",
                            code == 0 and package.applied(root)
                            and check(root, verify=True, pins=pins) is True))
    failing = [label for label, ok in results if not ok]
    for label, ok in results:
        print(f"  {'pass' if ok else 'FAIL'}  {label}")
    print(f"{len(results)} fixtures, {len(failing)} failing")
    return 1 if failing else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    for action in ["record", "check", "selftest"]:
        mode.add_argument("--" + action, action="store_true")
    parser.add_argument("--phrase", help="the owner's phrase, verbatim: "
                        f"'{LABEL}: <sha256>'")
    parser.add_argument("--instant", help="UTC act instant (default: now)")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    if args.record:
        instant = args.instant or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        record(ROOT, args.phrase, instant)
        print("Recorded owner confirmation of the specification-policy readability "
              "restyle; bootstrap provenance; A1 absent. Next: "
              f"python3 {BUILDER} --apply --at-adoption")
        return 0
    if check(ROOT, verify=True):
        print("PASS exact restyle manifest, pinned review and dedicated, aggregate "
              "and install records")
    else:
        print("specification-policy readability restyle not performed: no record")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ValueError as error:
        print(f"FAIL {error}")
        sys.exit(1)
