#!/usr/bin/env python3
"""Build and verify the inert public-source screening-scope version-8 package (private sources).

Package `contracts/candidates/public-source-screening-scope-v8/` (`syzygy-pdja.23`, owner direction
OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08 item `syzygy-pdja.21-public`, answer B: "Private too: a screening-policy
successor admitting private sources is drafted, reviewed and offered to you separately"). This script performs no owner
act and writes no act record.

The subject is the policy AFTER version 7: the bytes of the version-7 manifest row `s` (performed 2026-11-06). The
builder takes the policy on disk when it hashes to that row, or recovers it by reversing this package's own patch when
the disk is this package's row.

One variant, `pv`, one manifest row. Inside `publicSourceScope` it adds one key, `sourceVisibility`, directly after
`observedRepositories`, and makes six text replacements, listed in EDITS: `purpose`, `observedRepositories`, the first
route of `accessBoundary.networkEgressRoutes`, two sentences of `secretRedaction.appliesTo` and the end of
`rawBodyHandling.rule`. Every edit admits private sources or makes a rule stricter for them; none relaxes a rule for
a public source. `policyVersion` is the only other value that changes. Nothing else may change, and
`semantic_findings` undoes each edit and requires the version-7 scope back exactly. Independently of EDITS it pins
the number of edits (EDIT_COUNT) and the scope paths the change may touch (CHANGED_PATHS), so a seventh edit fails
even when EDITS is extended to undo it (round-1 review, finding 6).

  --write             regenerate the patch and the manifest
  --check             verify the package against the policy on disk
  --digests           print the manifest row (refuses while stale)
  --manifest-digest   print the SHA-256 of the manifest FILE (refuses while stale)
  --selftest          mutate each predicate; each must fail

Review-head contract for a recorder written after a confirming review: the raw's first four non-blank lines are the
title, `Reviewed commit: <40 hex>`, `Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest prints it>` and
`Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`. The act's argument is the manifest ROW (the proposed policy
bytes' digest), never the manifest file's digest.
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
import build_public_source_screening_scope_v7 as v7  # noqa: E402

POLICY = v7.POLICY
SCOPE_KEY = v7.SCOPE_KEY
PKG = pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v8")
MANIFEST = PKG / "PUBLIC-SOURCE-SCREENING-SCOPE-V8-MANIFEST.txt"
V7_BASE_VARIANT = "s"
VARIANTS = ("pv",)
NEW_KEY = "sourceVisibility"
AFTER_KEY = "observedRepositories"

#: (where, old, new): each `old` must occur exactly once in the version-7 value at `where`; `new` replaces it.
#: `where` is a key path inside the scope; an int indexes a list.
EDITS: tuple[tuple[tuple[str | int, ...], str, str], ...] = (
    (("purpose",),
     "admit arbitrary public repositories to the Polaris generator",
     "admit arbitrary repositories, public or private (sourceVisibility), to the Polaris generator"),
    (("observedRepositories",),
     "named by an effective public-repository observation consent record whose subject",
     "named by an effective observation consent record, of a public or a private repository (sourceVisibility), "
     "whose subject"),
    (("accessBoundary", "networkEgressRoutes", 0),
     "the shallow by-commit fetch from the target's upstream that the observation consent describes",
     "the shallow by-commit fetch from the target's upstream that the observation consent describes, for a repository "
     "whose visibility is public (sourceVisibility) only; for a private repository Syzygy fetches nothing, reads only "
     "Git objects already present in a clone the operator holds, and holds, reads, requests and uses no credential for "
     "the repository's host"),
    (("secretRedaction", "appliesTo"),
     "a body of an admitted snapshot whose path this scope classifies in one of redactedClasses",
     "a body of an admitted snapshot of a repository whose visibility is public (sourceVisibility), whose path this "
     "scope classifies in one of redactedClasses"),
    (("secretRedaction", "appliesTo"),
     "A body of any other class, code-content included, is excluded whole on any detector match exactly as before.",
     "A body of any other class, code-content included, is excluded whole on any detector match exactly as before, "
     "and so is a body of a private repository in every class: it is never retained as redacted-span."),
    (("rawBodyHandling", "rule"),
     "and only under a separate egress consent for the pair",
     "and only under a separate egress consent for the pair; for a repository whose visibility is private, an egress "
     "consent covers its content, target-metadata included, only when its record names that pair and states that the "
     "repository is private, so a public-target egress consent, or one that does not state it, never covers it"),
)

SOURCE_VISIBILITY = {
    "values": ["public", "private"],
    "admitted": ["public", "private"],
    "rule": (
        "visibility is decided for each commit Syzygy reads, from the effective observation consent record that admits "
        "that commit (the record of that pair naming that revision), and it is public only when that record states "
        "public through its carrier and every other effective observation consent record of the same pair states "
        "public through its carrier too; in every other case, including a record that states private, states nothing, "
        "or cannot be read, the repository is private for every rule of this scope at every commit. A fork or mirror "
        "that a record places in an upstream's pair is part of that pair, so its record stating private makes the whole "
        "pair private. The carriers, and the only ones: for a launch consent record, the operator's declaration "
        "whether the repository is public that REQ-polaris-generation-046 requires the record to carry, which states "
        "public only when it is the affirmative answer, read by the generic launch form as one of exactly two values; "
        "for a record made by an owner act of one of the forms that the consent package's closed list types "
        "consent-observation (ADMISSION_ACT_FORMS in packages/polaris-generation-consent/src/package-reader.ts, each "
        "titled as a public-repository observation consent, today PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md "
        "and PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md under .syzygy/governance/decisions/), the form itself, which "
        "states public. No other text of a record, its title or prose included, is a carrier. The statement is the "
        "operator's or the owner's declaration and is labelled Inferred wherever it is shown: Syzygy makes no network "
        "request and uses no credential to learn or verify it. admitted lists the visibilities this scope admits; a "
        "repository of a visibility it does not list is not in observedRepositories"),
    "privateSourceRules": (
        "a private repository is admitted under the same observation consent as a public one, and every rule of this "
        "scope applies to it as to a public one, except three, each written at its own site and each stricter: "
        "accessBoundary.networkEgressRoutes (Syzygy fetches nothing and uses no credential for the repository's host), "
        "secretRedaction.appliesTo (no body is retained as redacted-span: a detector match excludes the whole body in "
        "every class) and rawBodyHandling.rule (an egress consent covers the repository's content only when its record "
        "names the pair and states that the repository is private). No rule of this scope is relaxed for a private "
        "repository, and no rule for a public repository changes"),
    "unchanged": (
        "every detector and scopeDetectors, matchAction, unclassifiableExclusion, sourceAdmission and its denied paths, "
        "contentClassification and its owner placements, instructionTextRule, targetMetadataRule, runProfileRule, "
        "activeContent and both of its exemptions, ingestBoundaries and ingestBoundaryRule, rawBodyHandling's storage "
        "(run-directory-only), logging (never), rendering (a generated editorial draft, never published) and "
        "machineResponse (never), inheritedRules, selfReferenceRule and prerequisite apply to a private repository "
        "exactly as to a public one. This scope states no retention period for a run directory under either "
        "visibility, and this version adds none. This policy confers no consent"),
    "agentSessions": (
        "[Observed] REQ-polaris-generation-033 says that neither the content classes a per-project statement names nor "
        "the observing project's classification and screening policies bind the operator-agent mode's agent sessions' "
        "own reads or sends: the agent reads the clone without restriction, and content those policies would exclude, "
        "secrets included, may reach the agent's provider. This policy binds what Syzygy reads, stores, renders and "
        "sends; it cannot keep a private repository's content, or a secret in it, from the agent's provider. Whether "
        "a private subject that REQ-polaris-generation-033 calls non-governed needs a per-project statement before a "
        "brief is issued is the specification's to decide, not this policy's"),
    "consequence": (
        "[Inferred] a run on a repository whose record does not state public is no longer refused for want of a policy "
        "admitting it, and runs under the stricter rules above: its project-documentation bodies with a detector match "
        "are withheld whole where a public repository's keep every line outside the withheld ones, so its dossier can "
        "withhold more files and render more Unknown; Syzygy reads it only from a clone the operator already holds; "
        "and no request Syzygy makes carries its content until an egress consent stating it private is in force. The "
        "reason for the redaction rule: a retained redacted-span body shows every line but the withheld ones, and the "
        "whole body's content digest and Git object id stay recorded (RFC5-17), so a guess at a short withheld line "
        "can be confirmed against them offline; for a public repository the body is published already and this adds "
        "nothing, for a private one it would. A residual remains after whole exclusion: an excluded private body's "
        "content digest and path stay recorded (RFC5-17) and its Git object id is in the clone, so where a guesser "
        "knows the rest of the body (a private fork of a public upstream whose file differs by one secret line, a "
        "template, earlier public history) a digest confirms a guessed secret offline. Whole exclusion does not close "
        "that; this scope keeps such digests in the run directory only and states nothing more about who can read "
        "them. A pair that a private fork's record joins becomes private, so its public upstream's runs get the "
        "stricter rules too"),
    "consentRecordMetadata": (
        "[Inferred] a launch consent record carries the repository's declared identity and normalised URL and is "
        "committed into the observing project's own governance repository, on a dedicated reference Syzygy never "
        "pushes (REQ-polaris-generation-046); for a private repository that makes its name, host path and commit ids "
        "tracked objects of Syzygy's repository, one push by the operator from its remote. This scope does not govern "
        "those records and cannot change it; the specification does"),
}


def patch_path(variant: str) -> pathlib.Path:
    return PKG / "proposed" / f"{POLICY.name}.{variant}.patch"


def _get(obj, where):
    for step in where:
        obj = obj[step]
    return obj


def _set(obj, where, value):
    for step in where[:-1]:
        obj = obj[step]
    obj[where[-1]] = value


def _insert_after(scope: dict, after: str, key: str, value) -> dict:
    if key in scope:
        raise ValueError(f"the version-7 scope already carries {key}")
    if after not in scope:
        raise ValueError(f"the version-7 scope has no {after}")
    out: dict = {}
    for k, v in scope.items():
        out[k] = v
        if k == after:
            out[key] = copy.deepcopy(value)
    return out


def v8_scope(scope7: dict) -> dict:
    s = copy.deepcopy(scope7)
    for where, old, new in EDITS:
        text = _get(s, where)
        if not isinstance(text, str) or text.count(old) != 1:
            raise ValueError(f"the version-7 value at {'.'.join(map(str, where))} does not carry the text this "
                             f"version replaces exactly once")
        _set(s, where, text.replace(old, new, 1))
    return _insert_after(s, AFTER_KEY, NEW_KEY, SOURCE_VISIBILITY)


def next_version(version: str) -> str:
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)(-.+)", version)
    if not m:
        raise ValueError(f"unparseable policyVersion {version}")
    return f"{m.group(1)}.{int(m.group(2)) + 1}.0{m.group(4)}.v8-pv"


def propose(base_text: str, variant: str = "pv") -> str:
    if variant not in VARIANTS:
        raise ValueError(f"unknown variant {variant}")
    base = json.loads(base_text)
    old = v2.block(base[SCOPE_KEY])
    if base_text.count(old) != 1:
        raise ValueError("the version-7 scope block is not found exactly once in its own bytes")
    version = f'  "policyVersion": "{base["policyVersion"]}",\n'
    if base_text.count(version) != 1:
        raise ValueError("policyVersion line not found exactly once")
    out = base_text.replace(old, v2.block(v8_scope(base[SCOPE_KEY])), 1)
    out = out.replace(version, f'  "policyVersion": "{next_version(base["policyVersion"])}",\n', 1)
    got = json.loads(out)
    expected = dict(base)
    expected["policyVersion"] = next_version(base["policyVersion"])
    expected[SCOPE_KEY] = v8_scope(base[SCOPE_KEY])
    if got != expected or list(got) != list(base) or list(got[SCOPE_KEY]) != list(expected[SCOPE_KEY]):
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
    return ("# PUBLIC-SOURCE SCREENING SCOPE VERSION 8 MANIFEST\n"
            "# Candidate; this file and its row bind nothing by themselves.\n"
            "# 1 row, variant pv (private sources admitted under stricter rules). The row\n"
            "# hashes the PROPOSED bytes (the version-7 policy, variant s, with\n"
            "# proposed/<name>.pv.patch applied). The row is the argument of one\n"
            "# superseding approve-policy act, or of none.\n"
            + rows)


def base_bytes(root: pathlib.Path = ROOT) -> tuple[str, str]:
    want = v7.manifest_rows(root).get(V7_BASE_VARIANT)
    if want is None:
        raise ValueError("the version-7 manifest has no row for variant s")
    disk_text = (root / POLICY).read_text()
    if sha(disk_text) == want:
        return disk_text, "prospective"
    own = [v for v, dg in manifest_rows(root).items() if dg == sha(disk_text)]
    if own and (root / patch_path(own[0])).is_file():
        back = v2.reverse_patch((root / patch_path(own[0])).read_text(), disk_text)
        if sha(back) != want:
            raise ValueError("reversing this package's patch over the policy on disk does not give the version-7 bytes")
        return back, "performed-v8"
    raise ValueError("the policy on disk is neither the version-7 variant-s bytes nor this package's row; "
                     "the base is unknown")


#: Pinned independently of EDITS: the number of edits and every scope path the change may touch. A seventh edit,
#: or an edit anywhere else, fails here even if EDITS itself was extended.
EDIT_COUNT = 6
CHANGED_PATHS = frozenset({
    ("purpose",), ("observedRepositories",), (NEW_KEY,), ("accessBoundary", "networkEgressRoutes", 0),
    ("secretRedaction", "appliesTo"), ("rawBodyHandling", "rule"),
})


def _leaves(obj, path=()):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _leaves(v, path + (k,))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _leaves(v, path + (i,))
    else:
        yield path, obj


def changed_paths(base_scope: dict, scope: dict) -> set[tuple]:
    a, b = dict(_leaves(base_scope)), dict(_leaves(scope))
    missing = object()
    out = set()
    for path in set(a) | set(b):
        if a.get(path, missing) != b.get(path, missing):
            out.add(path[:1] if path[:1] == (NEW_KEY,) else path)
    return out


def semantic_findings(base_text: str, proposed_text: str, edits=None) -> list[str]:
    edits = EDITS if edits is None else edits
    findings: list[str] = []
    if len(edits) != EDIT_COUNT:
        findings.append(f"the change declares {len(edits)} edits, not {EDIT_COUNT}")
    base, proposed = json.loads(base_text), json.loads(proposed_text)
    changed = [k for k in base if base[k] != proposed.get(k)]
    if sorted(changed) != sorted(["policyVersion", SCOPE_KEY]) or list(base) != list(proposed):
        findings.append(f"top-level change outside policyVersion and the scope: {changed}")
    scope = proposed.get(SCOPE_KEY, {})
    keys, base_keys = list(scope), list(base[SCOPE_KEY])
    if NEW_KEY not in keys or AFTER_KEY not in keys or keys.index(NEW_KEY) != keys.index(AFTER_KEY) + 1:
        findings.append(f"{NEW_KEY} is not the key directly after {AFTER_KEY}")
    if [k for k in keys if k != NEW_KEY] != base_keys:
        findings.append("the scope's other keys are not the version-7 keys in their order")
    if scope.get(NEW_KEY) != SOURCE_VISIBILITY:
        findings.append(f"{NEW_KEY} is not the declared value")
    visibility = scope.get(NEW_KEY) if isinstance(scope.get(NEW_KEY), dict) else {}
    if visibility.get("admitted") != ["public", "private"] or visibility.get("values") != ["public", "private"]:
        findings.append("the admitted visibilities are not exactly public and private")
    undo = copy.deepcopy({k: v for k, v in scope.items() if k != NEW_KEY})
    for where, old, new in reversed(edits):
        try:
            text = _get(undo, where)
        except (KeyError, IndexError, TypeError):
            findings.append(f"{'.'.join(map(str, where))} is missing")
            continue
        if not isinstance(text, str) or text.count(new) != 1:
            findings.append(f"the edit at {'.'.join(map(str, where))} is not present exactly once")
            continue
        _set(undo, where, text.replace(new, old, 1))
    if undo != base[SCOPE_KEY]:
        findings.append("the scope changes somewhere other than the declared edits")
    outside = changed_paths(base[SCOPE_KEY], scope) - CHANGED_PATHS
    if outside:
        findings.append(f"the scope changes outside the pinned paths: {sorted(map(str, outside))}")
    for term in ("public visibility exempts nothing",):
        if term not in scope.get("detectors", ""):
            findings.append(f"detectors lost {term!r}")
    for term in ("is private for every rule of this scope", "labelled Inferred", "or cannot be read",
                 "every other effective observation consent record of the same pair", "No other text of a record",
                 "ADMISSION_ACT_FORMS"):
        if term not in visibility.get("rule", ""):
            findings.append(f"{NEW_KEY}.rule lost {term!r}")
    return findings


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
            findings.append(f"{v}: patch differs from its regeneration over the version-7 bytes")
        else:
            try:
                if v2.v1.apply_patch(root, base, path.read_text()) != proposed:
                    findings.append(f"{v}: applying the patch does not yield the proposed bytes")
            except ValueError as exc:
                findings.append(f"{v}: {exc}")
        findings += [f"{v}: {f}" for f in semantic_findings(base, proposed)]
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


def _fixture(tmp: pathlib.Path) -> pathlib.Path:
    for rel in (POLICY, v7.MANIFEST):
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
        results.append(("the base is the version-7 variant-s row", mode == "prospective"))
        (tmp / POLICY).write_text(propose(base))
        results.append(("after the version-8 act the package still verifies",
                        check(tmp) == [] and base_bytes(tmp)[1] == "performed-v8"))

    def unknown_disk(tmp):
        (tmp / POLICY).write_text((tmp / POLICY).read_text().replace('"schemaVersion": 1', '"schemaVersion": 2', 1))
    caught("a policy on disk that is neither base nor row refused", unknown_disk, "base is unknown")

    def edit_patch(tmp):
        p = tmp / patch_path("pv")
        p.write_text(p.read_text().replace("states that the repository is private", "states nothing", 1))
    caught("a hand-edited patch refused", edit_patch, "pv: patch differs")

    def edit_manifest(tmp):
        p = tmp / MANIFEST
        p.write_text(p.read_text().replace("VERSION 8", "VERSION 9", 1))
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
        doc = json.loads(propose(base))

        def finds(mutate, needle):
            widened = copy.deepcopy(doc)
            mutate(widened)
            return any(needle in f for f in semantic_findings(base, json.dumps(widened)))

        scope = SCOPE_KEY
        results.append(("a change outside the scope is found",
                        finds(lambda d: d.__setitem__("schemaVersion", 9), "top-level change")))
        results.append(("an undeclared scope change is found",
                        finds(lambda d: d[scope]["activeContent"]["projectDocumentationExemption"].__setitem__("egress", "x"),
                              "somewhere other")))
        results.append(("a relaxed detector rule is found",
                        finds(lambda d: d[scope].__setitem__("detectors", d[scope]["detectors"].replace(
                            "public visibility exempts nothing", "public visibility exempts much")), "detectors lost")))
        results.append(("a lost edit is found",
                        finds(lambda d: d[scope]["rawBodyHandling"].__setitem__("rule", d[scope]["rawBodyHandling"]["rule"].replace(
                            "states that the repository is private", "names it")), "not present exactly once")))
        results.append(("a dropped redaction limb is found",
                        finds(lambda d: d[scope]["secretRedaction"].__setitem__("appliesTo", d[scope]["secretRedaction"]["appliesTo"].replace(
                            ", and so is a body of a private repository in every class: it is never retained as redacted-span.", ".")),
                              "not present exactly once")))
        results.append(("a fetch route opened to private sources is found",
                        finds(lambda d: d[scope]["accessBoundary"]["networkEgressRoutes"].__setitem__(0, "any fetch"),
                              "not present exactly once")))

        def drop_key(d):
            d[scope] = {k: v for k, v in d[scope].items() if k != NEW_KEY}
        results.append(("a missing sourceVisibility is found", finds(drop_key, "not the key directly after")))

        def move_key(d):
            value = d[scope].pop(NEW_KEY)
            d[scope][NEW_KEY] = value
        results.append(("a misplaced sourceVisibility is found", finds(move_key, "not the key directly after")))
        results.append(("a public-only admitted list is found",
                        finds(lambda d: d[scope][NEW_KEY].__setitem__("admitted", ["public"]), "admitted visibilities")))
        results.append(("a default flipped to public is found",
                        finds(lambda d: d[scope][NEW_KEY].__setitem__("rule", d[scope][NEW_KEY]["rule"].replace(
                            "is private for every rule of this scope", "is public for every rule of this scope")),
                              "rule lost")))

        def revert(where, old, new):
            def go(d):
                _set(d[scope], where, _get(d[scope], where).replace(new, old, 1))
            return go
        for where, old, new in EDITS:
            results.append((f"a reverted edit at {'.'.join(map(str, where))} ({old[:40]!r}) is found",
                            finds(revert(where, old, new), "not present exactly once")))
        for key in ("values", "rule", "privateSourceRules", "unchanged", "agentSessions", "consequence",
                    "consentRecordMetadata"):
            def gut(d, key=key):
                d[scope][NEW_KEY][key] = "x" if isinstance(d[scope][NEW_KEY][key], str) else ["public"]
            results.append((f"a gutted {NEW_KEY}.{key} is found", finds(gut, "not the declared value")))

        # A seventh edit that relaxes detectors while keeping the pinned phrase: extending EDITS must not hide it.
        relax = (("detectors",), "applies unchanged to every body under this scope",
                 "applies to some bodies under this scope")
        relaxed = copy.deepcopy(doc)
        relaxed[scope]["detectors"] = relaxed[scope]["detectors"].replace(relax[1], relax[2], 1)
        got = semantic_findings(base, json.dumps(relaxed), EDITS + (relax,))
        results.append(("a seventh edit is refused by count", any("not 6" in f for f in got)))
        results.append(("a seventh edit is refused by path", any("outside the pinned paths" in f for f in got)))
        results.append(("the edit count is pinned", len(EDITS) == EDIT_COUNT))

    failed = [name for name, passed in results if not passed]
    for name in failed:
        print(f"FAIL {name}")
    print(f"public-source-screening-scope-v8 selftest: {len(results) - len(failed)} of {len(results)} passed")
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
        print(f"wrote the patch and {MANIFEST.name}")
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
        print("public-source-screening-scope-v8: patch and manifest current")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
