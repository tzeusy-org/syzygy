#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Record/check the owner's sign-off of the RFC-0007 scoped-values amendment.

The act is the contract step of lane B's two-act path (the scoped-attributes
behavior amendment follows it). It is not yet a link of
`CONTRACT_SUCCESSOR_CHAIN` in `check_governance.py`: the performing change
adds the link, after the restyle link, with the act. The owner performs it by
writing exactly

    SIGN OFF RFC-0007 SCOPED-VALUES AMENDMENT: <sha256>

where the argument is the sha256 of the package manifest *file*
`candidates/rfc7-scoped-values-successor/CONTRACT-AMENDMENT-MANIFEST.txt`,
built and verified by `scripts/build_rfc7_scoped_values_successor.py`.

The recorder is pinned to the reviewed package, like its siblings:

- `FROZEN_MANIFEST_SHA`: the manifest-file digest the confirming review
  examined and the owner is offered;
- `REVIEW` / `REVIEW_SHA`: that review's retained raw, by path and sha256.
  Its head, the first four non-blank lines, must carry
  `Verdict: CONFIRM` or `Verdict: CONFIRM WITH EXCEPTIONS` and
  `Manifest SHA-256: <FROZEN_MANIFEST_SHA>`. The act argument *is* the
  manifest file's digest, so the raw's `Manifest SHA-256` line carries
  exactly the argument the owner speaks. A raw's head contract is a
  predicate, not a convention: the review brief quotes it.

All three are `None` until the package and its confirming review exist; they
are set in the change that freezes the package, never inferred. `--record`
refuses while any pin is `None`, when the owner's phrase is not the exact
`LABEL: <sha256>` form, when its argument differs from the current manifest
digest, when that digest differs from the pin, when the raw's sha or head
differ, or when the package does not verify unapplied. The order is fixed:
record first, then `build_rfc7_scoped_values_successor.py --apply
--at-adoption` in the same change (the builder refuses to apply without
these records).

`--record --phrase "<owner phrase verbatim>"` writes the dedicated act record
and appends one marked section to `ACCEPTANCE-ACT-RECORD.md`. Each carries the
owner's phrase once, as the only line that contains the label (CG-7h requires
exactly one bare full-line occurrence per record).

`--check` verifies the pins, that the dedicated record regenerates exactly,
and that the aggregate holds exactly one copy of the marked block; it reports
"not performed" and exits 0 when neither record exists, and fails on a partial
record. `--selftest` runs fixtures in temporary directories, including one
over a real, verifying package built by the builder's own fixture.
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
MANIFEST = (".syzygy/governance/contracts/candidates/rfc7-scoped-values-successor/"
            "CONTRACT-AMENDMENT-MANIFEST.txt")
ACT = ".syzygy/governance/decisions/RFC7-SCOPED-VALUES-AMENDMENT-ACT.md"
AGGREGATE = ".syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md"
BUILDER = "scripts/build_rfc7_scoped_values_successor.py"
LABEL = "SIGN OFF RFC-0007 SCOPED-VALUES AMENDMENT"
MARKER = "RFC7-SCOPED-VALUES-AMENDMENT"
INSTANT = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z")
PHRASE = re.compile(re.escape(LABEL) + r": ([0-9a-f]{64})")
VERDICTS = ("Verdict: CONFIRM", "Verdict: CONFIRM WITH EXCEPTIONS")

#: Pins to the reviewed package: the manifest digest the binding review
#: re-derived (the act argument) and that review's raw, by path and sha256.
#: None until the confirming review exists; set in the change that freezes it.
FROZEN_MANIFEST_SHA = None
REVIEW = None
REVIEW_SHA = None

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
    spec = importlib.util.spec_from_file_location("rfc7_scoped_values_builder", ROOT / BUILDER)
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


def validate_phrase(phrase):
    """The owner's argument, from the exact `LABEL: <sha256>` phrase."""
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


def body(sha, instant, pins):
    if not INSTANT.fullmatch(instant):
        raise ValueError("invalid act instant")
    try:
        datetime.strptime(instant, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        # strptime's own wording differs between Python versions, so the
        # refusal says it itself rather than passing the library's text on.
        raise ValueError("invalid act instant: not a calendar date") from None
    return f"""# RFC-0007 scoped-values amendment

Owner: Tzeusy

Act instant: {instant}

Project identity: project:syzygy

Artifact identity: contract:syzygy:rfc-0007:scoped-values-amendment

Act type: sign off contract amendment (successor to the general trusted-bootstrap contract manifest)

Provenance: owner-adopted (bootstrap, uncorrelated)

A1 audit-record identity: explicitly absent

The owner performed the act by writing exactly:

```text
{LABEL}: {sha}
```

The argument is the sha256 of {MANIFEST}. It was recomputed at recording,
matched the phrase, and equals the reviewed digest the recorder pins.

Confirming review: {pins.review} (sha256 {pins.review_sha})

The manifest binds the exact post-amendment bytes of one accepted module,
rfcs/RFC-0007/rendering-and-surface.md.

Scope: one added paragraph under RFC7-33 permitting scope-carried values on
the interactive human surface only, and one parenthetical in the sentence it
qualifies. The machine-queryable endpoints and every plain-text or exported
rendering still carry every distinction on the unit itself, and the
non-citability sub-clause stands in full. Clause identities, clause leads,
front matter and headings are unchanged by construction (the package builder
verifies all three); the installed and candidate mirrors take the same bytes.

Supersession relationship: for this one path it supersedes the current-byte
row of the general trusted-bootstrap contract manifest, which remains
preserved as act-time history. The readability restyle never bound this
module.

Revocation relationship: none. This act grants no implementation, source,
provider, write, deployment or release permission, and it changes no
specification: the scoped-attributes behavior amendment is a separate act.

This is bootstrap owner provenance, not independent authorship verification,
runtime evidence or product readiness.
"""


def block(content):
    return f"<!-- {MARKER}:BEGIN -->\n{content}<!-- {MARKER}:END -->\n"


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
    if not act_exists and MARKER not in aggregate and LABEL not in aggregate:
        return False
    if not act_exists:
        raise ValueError("aggregate carries the act but the dedicated record is absent")
    sha = validate_pins(root, pins)
    if verify:
        verify_package(root, allow_applied=True)
    actual = read(root, ACT).decode()
    if actual != body(sha, parse(actual), pins):
        raise ValueError("dedicated act mismatch")
    for text, where in ((actual, ACT), (aggregate, AGGREGATE)):
        lines = [line for line in text.splitlines() if LABEL in line]
        if lines != [f"{LABEL}: {sha}"]:
            raise ValueError(f"{where}: expected exactly one binding line")
    if (any(aggregate.count(f"<!-- {MARKER}:{suffix} -->") != 1
            for suffix in ["BEGIN", "END"])
            or aggregate.count(block(actual)) != 1):
        raise ValueError("aggregate act missing, changed or duplicated")
    return True


def record(root, phrase, instant, verify=True, pins=None):
    pins = pinned() if pins is None else pins
    argument = validate_phrase(phrase)
    sha = validate_pins(root, pins)
    if argument != sha:
        raise ValueError(f"owner argument {argument} does not match manifest {sha}")
    if verify:
        verify_package(root, allow_applied=False)
    content = body(sha, instant, pins)
    aggregate = read(root, AGGREGATE)
    if (root / ACT).exists() or MARKER.encode() in aggregate or LABEL.encode() in aggregate:
        raise ValueError("adoption already recorded or partial")
    with (root / ACT).open("x", encoding="utf-8") as stream:
        stream.write(content)
    with (root / AGGREGATE).open("ab") as stream:
        stream.write(("\n" + block(content)).encode())
    if not check(root, pins=pins):
        raise ValueError("record did not read back")


def write_review(root, rel, manifest_sha, verdict="Verdict: CONFIRM"):
    """A synthetic confirming raw for fixtures; returns its pins."""
    target = root / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(f"Title: scoped-values confirmation\n{verdict}\n"
                      f"Reviewed commit: {'0' * 40}\n"
                      f"Manifest SHA-256: {manifest_sha}\n\nBody.\n")
    return Pins(manifest_sha, rel, digest(target.read_bytes()))


def selftest():
    results = []
    roots = []

    def refuses(label, fn, want):
        # A fixture root is shared: snapshot the records so a wrongly
        # accepted call fails only its own fixture, not every later one.
        root_now = roots[-1]
        act, aggregate = root_now / ACT, root_now / AGGREGATE
        saved_act = act.read_bytes() if act.exists() else None
        saved_aggregate = aggregate.read_bytes()
        try:
            fn()
        except ValueError as error:
            results.append((label, want in str(error)))
            if want not in str(error):
                print(f"  (got: {error})")
            return
        results.append((label, False))
        if saved_act is None:
            act.unlink(missing_ok=True)
        else:
            act.write_bytes(saved_act)
        aggregate.write_bytes(saved_aggregate)

    instant = "2026-09-28T00:00:00Z"
    raw_rel = "docs/reviews/R-SCOPED-VALUES-CONFIRM-RAW.md"

    # Synthetic group: record/check mechanics without the builder.
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        roots.append(root)
        (root / AGGREGATE).parent.mkdir(parents=True, exist_ok=True)
        (root / AGGREGATE).write_text("# Synthetic aggregate\n")
        (root / MANIFEST).parent.mkdir(parents=True, exist_ok=True)
        manifest = "# synthetic\n" + "".join(
            f"{digest(str(i).encode())}  rfcs/RFC-{i:04d}.md\n" for i in range(1))
        (root / MANIFEST).write_text(manifest)
        sha = digest(manifest.encode())
        pins = write_review(root, raw_rel, sha)
        phrase = f"{LABEL}: {sha}"
        results.append(("nothing recorded reads as not performed",
                        check(root, pins=pins) is False))
        live = pinned()
        results.append(("module pins are all unset or all name a reviewed package and raw",
                        live == Pins(None, None, None)
                        or (re.fullmatch(r"[0-9a-f]{64}", live.manifest_sha or "") is not None
                            and (live.review or "").endswith("-RAW.md")
                            and re.fullmatch(r"[0-9a-f]{64}", live.review_sha or "")
                            is not None)))
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
        manifest_file = root / MANIFEST
        manifest_file.rename(root / "moved")
        refuses("absent manifest", lambda: record(root, phrase, instant, False, pins),
                "manifest absent")
        (root / "moved").rename(manifest_file)
        record(root, phrase, instant, verify=False, pins=pins)
        act = (root / ACT).read_text()
        results.append(("dedicated record binds the manifest digest on one line",
                        [l for l in act.splitlines() if LABEL in l] == [phrase]))
        results.append(("provenance, A1 absence and pinned review recorded",
                        "Provenance: owner-adopted (bootstrap, uncorrelated)" in act
                        and "A1 audit-record identity: explicitly absent" in act
                        and f"{raw_rel} (sha256 {pins.review_sha})" in act))
        results.append(("recorded act checks", check(root, pins=pins) is True))
        refuses("recorded act with unset pins fails check",
                lambda: check(root, pins=Pins(None, None, None)), "recorder unpinned")
        refuses("second record refused",
                lambda: record(root, phrase, instant, False, pins), "already recorded")
        with (root / AGGREGATE).open("a") as stream:
            stream.write("\nLater unrelated record.\n")
        results.append(("non-tail readback checks", check(root, pins=pins) is True))
        saved = manifest_file.read_bytes()
        manifest_file.write_bytes(saved + b"# changed\n")
        refuses("manifest drift after recording", lambda: check(root, pins=pins),
                "differs from the pinned reviewed digest")
        manifest_file.write_bytes(saved)
        saved_aggregate = (root / AGGREGATE).read_bytes()
        with (root / AGGREGATE).open("a") as stream:
            stream.write(block(act))
        refuses("duplicated aggregate block", lambda: check(root, pins=pins),
                "expected exactly one binding line")
        (root / AGGREGATE).write_bytes(saved_aggregate)
        with (root / AGGREGATE).open("a") as stream:
            stream.write(f"\n{phrase}\n")
        refuses("second aggregate binding line", lambda: check(root, pins=pins),
                "expected exactly one binding line")
        (root / AGGREGATE).write_bytes(saved_aggregate)
        (root / ACT).write_text(act.replace("Owner: Tzeusy", "Owner: someone"))
        refuses("edited dedicated record", lambda: check(root, pins=pins),
                "dedicated act mismatch")
        (root / ACT).unlink()
        refuses("aggregate without dedicated record", lambda: check(root, pins=pins),
                "dedicated record is absent")

    # Real group: a verifying package built by the builder's own fixture.
    package = builder()
    with tempfile.TemporaryDirectory() as directory:
        root = package._fixture_root(Path(directory))
        package.write_quiet(root)
        roots.append(root)
        (root / AGGREGATE).parent.mkdir(parents=True, exist_ok=True)
        (root / AGGREGATE).write_text("# Synthetic aggregate\n")
        sha = digest((root / MANIFEST).read_bytes())
        pins = write_review(root, raw_rel, sha)
        phrase = f"{LABEL}: {sha}"
        results.append(("builder fixture package verifies", package.check(root) == []))
        refuses("real package: 'continue' refused",
                lambda: record(root, "continue", instant, True, pins), "owner phrase")
        refuses("real package: wrong digest refused",
                lambda: record(root, f"{LABEL}: {digest(b'x')}", instant, True, pins),
                "does not match manifest")
        refuses("real package: unpinned refused",
                lambda: record(root, phrase, instant, True, Pins(None, None, None)),
                "recorder unpinned")
        first = package.population(root)[0]
        patch = root / package.patch_for(first)
        saved_patch = patch.read_bytes()
        patch.write_bytes(saved_patch.replace(b"Fixture text.", b"Tampered text."))
        assert patch.read_bytes() != saved_patch
        refuses("real package: tampered patch refused by the builder's findings",
                lambda: record(root, phrase, instant, True, pins),
                "package does not verify: manifest differs from exact regeneration")
        patch.write_bytes(saved_patch)
        record(root, phrase, instant, verify=True, pins=pins)
        results.append(("real package: verified record reads back with verification",
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
        print("Recorded owner sign-off of the RFC-0007 scoped-values amendment; "
              "bootstrap provenance; A1 absent. Next: "
              f"python3 {BUILDER} --apply --at-adoption")
        return 0
    if check(ROOT, verify=True):
        print("PASS exact scoped-values manifest, pinned review and dedicated/aggregate "
              "act records")
    else:
        print("RFC-0007 scoped-values amendment not performed: no dedicated or aggregate record")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except ValueError as error:
        print(f"FAIL {error}")
        sys.exit(1)
