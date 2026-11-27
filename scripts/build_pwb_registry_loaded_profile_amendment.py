#!/usr/bin/env python3
"""Build and verify the inert PWB registry loaded-profile amendment.

This script performs no owner act and writes no act record. Its subject is
the Polaris Butlers project-shape observer registry entry, whose current
bytes are the argument of a performed `adopt-registry-entry` act. The
proposed bytes therefore live only as one unified diff under `proposed/`.

The diff is drafted on top of the `syzygy-dov.18` currency-and-briefing
candidate, which edits the same subject. The order of the two acts is a
constraint of this builder, not an owner ruling: `--apply` refuses until
`.18` has been applied. `--check` builds the base the same way whichever
state the tree is in:

- `.18` not yet adopted: current bytes, then `.18`'s patch, then this one;
- `.18` adopted (the subject hashes to `.18`'s manifest row): current bytes,
  then this patch alone;
- `.18` adopted and then superseded by a performed act (the subject hashes
  to a `PERFORMED_SUCCESSORS` manifest's row for it, and the acceptance-act
  record quotes that row; today the 2026-10-02 re-pin act B, added
  2026-10-15): current bytes, then this patch alone;
- this package adopted (the subject hashes to this manifest's own row): the
  base is recovered by reversing this patch, and `--apply` refuses.

Either way the manifest row is the digest a superseding
`adopt-registry-entry` act would take as its argument. It matches the tree
only after `--apply --at-adoption`.

The fields this package adds restate the source grammar the observer
applies today. `--check` tests that three ways. The six existing grammar
keys and every other entry field are unchanged, and every sentence is pinned
to the text below. Every heading literal is present in the specification's
reader definitions, and the root index path, pillar keys, labels, bindings
and tree patterns match the constants in `packages/three-surface-poc-core/src/`.
And the observer's own code, run under Node over files built from the
profile's fields alone, derives the source manifest and reads the items the
profile predicts, each row's keys predicted from that row's own key form,
while every row runs the probes of its own shape and key form, each feeding
the code a varied file and checking the outcome the clause states. A row may
carry only the fields its shape and key form read. The sentences themselves
are prose; a clause no probe exercises is checked only by its pin. The constants
cross-check is retired by the change that deletes the constants (M8 slice 5
limb 5), which then owns the loaded-profile test itself.

Bare invocation refuses to overwrite the manifest; pass `--write`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import posixpath
import re
import shutil
import subprocess
import sys
import tempfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
SUBJECT = pathlib.Path(
    ".syzygy/governance/declarations/adapter-registry/"
    "POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json"
)
CANDIDATES = pathlib.Path(".syzygy/governance/contracts/candidates")
CANDIDATE = CANDIDATES / "pwb-registry-loaded-profile-amendment"
PROPOSED = CANDIDATE / "proposed"
OUT = CANDIDATE / "PWB-LOADED-PROFILE-AMENDMENT-MANIFEST.txt"
TITLE = "PWB REGISTRY LOADED-PROFILE EFFECT AMENDMENT MANIFEST"

#: The `.18` package this one is drafted on top of.
PRIOR = CANDIDATES / "pwb-registry-currency-briefing-amendment"
PRIOR_PATCH = PRIOR / "proposed" / f"{SUBJECT.name}.patch"
PRIOR_MANIFEST = PRIOR / "PWB-EFFECT-AMENDMENT-MANIFEST.txt"
#: Superseding acts performed over the subject after `.18` was adopted
#: (rebase note, 2026-10-15). When the subject hashes to one of these
#: manifests' rows for it, the base is the current bytes.
PERFORMED_SUCCESSORS = (
    CANDIDATES / "pwb-behavior-contract-repin" / "PWB-EFFECT-REPIN-MANIFEST.txt",
)
#: Other packages whose proposed/ patches the same subject: the performed
#: re-pin above, and the unperformed tree-framing re-pin, whose order
#: against this package is an open owner question (packet, "Rebase note,
#: 2026-10-15").
DECLARED_SIBLINGS = (
    CANDIDATES / "pwb-behavior-contract-repin",
    CANDIDATES / "pwb-behavior-contract-repin-tree-framing",
)

SPEC = pathlib.Path(
    "openspec/changes/polaris-project-wide-butlers-model/specs/"
    "polaris-project-wide-butlers-model/spec.md"
)
CORE = pathlib.Path("packages/three-surface-poc-core/src")

PROPOSED_VERSION = "1.3.0-candidate.1"
BASE_VERSION = "1.2.0-candidate.1"

#: The six grammar keys the performed act already binds, unchanged here.
EXISTING_GRAMMAR_KEYS = (
    "factFamilies",
    "fixedClassKeys",
    "fixedCatalogKeys",
    "fixedProjectAccountKeys",
    "rootSummary",
    "precedence",
)
#: The keys this package adds, in order.
ADDED_GRAMMAR_KEYS = (
    "rootIndex",
    "pillars",
    "sourcePopulation",
    "containerShapes",
    "classGrammar",
    "sourceGrammarSemantics",
)
SEMANTICS_KEYS = (
    "scope",
    "headingMatch",
    "containerShape",
    "itemKey",
    "sharedReadingRules",
    "missingField",
)

#: The container-shape sentences, pinned: each must say what the extraction code reads
#: and every way it fails. `probes()` checks each clause it can exercise.
SHAPES = {
    "heading-section": (
        "the body under the declared heading: the lines after it up to the next heading at "
        "the same or a higher level, with outer whitespace trimmed, NFC-normalized; the body "
        "may be empty; when a row declares two headings the item's text is the first heading's "
        "text, a blank line, its body, a blank line, the second heading's text, a blank line "
        "and its body, with outer whitespace trimmed"),
    "every-level-2-section": (
        "every level-2 heading in the file, in file order; each part is the heading's text, a "
        "blank line and its body read as heading-section reads it, with outer whitespace "
        "trimmed, and the parts are joined by one blank line; a file with no level-2 heading "
        "fails the source as missing-heading"),
    "top-level-decimal-list": (
        "each list item at column 0 in the section, which must be numbered: a decimal number "
        "followed by . or ) and a space or tab; a bulleted item at column 0 fails the source "
        "as malformed-list, and so does a section with no list item at column 0"),
    "top-level-list": (
        "each list item at column 0 in the section, numbered or bulleted; a section with no "
        "list item at column 0 fails the source as malformed-list"),
    "top-level-bulleted-list": (
        "each list item at column 0 in the section, which must be bulleted: a numbered item at "
        "column 0 fails the source as malformed-list; a section with no list item yields no "
        "items and does not fail"),
    "first-table-rows": (
        "each body row of the first table in the section; a section with no table fails the "
        "source as malformed-row, and so does a body row of that table whose cell count "
        "differs from its header's; later tables in the section are not read"),
    "ordinal-section-table-rows": (
        "each body row of every table in the section of every level-2 heading whose text opens "
        "with a decimal number, optionally one lowercase letter, and then the end of the text "
        "or a character that is not an ASCII letter, digit or underscore; a file with no such "
        "heading fails the source as missing-heading, and a body row whose cell count differs "
        "from its table's header fails it as malformed-row"),
    "tree-path": (
        "the Git tree path itself, matched against the tree population's pathPattern; no body "
        "is read and nothing fails"),
    "toml-table-field": (
        "the declared field of the declared TOML table: exactly one header line must name the "
        "table, and inside it the field must be written once as field = \"value\" or "
        "field = 'value' with a non-empty value; no such table, a repeated table, a repeated "
        "field or a missing or empty value fails the source as malformed-toml; a line in any "
        "other form, and the field inside any other table, is not read; an array-of-tables "
        "header such as [[other]] is a line in another form, so it neither opens a table nor "
        "ends the declared one; the value is trimmed "
        "and NFC-normalized, a backslash escape in a double-quoted value is not decoded, and "
        "the value becomes the item's context"),
}

#: The item-key sentences a grammar row may carry, by form. A row states its
#: form by carrying the sentence; the form names are the ones the sibling
#: container-shape amendment (`syzygy-u05.8`) gives the same sentences. A
#: success row instead carries "<prefix>:<one-based ordinal>", the
#: prefixed-ordinal form.
ITEM_KEY_SENTENCES = {
    "fixed": "the fixed key",
    "leading-bold": (
        "the item's leading bold span (** or __), NFC-normalized with whitespace runs "
        "collapsed; an item with no non-empty leading bold span fails the source as "
        "ambiguous-leading-label"),
    "leading-bold-or-code": (
        "the item's leading bold span, or else its leading code span, NFC-normalized with "
        "whitespace runs collapsed; the span must be non-empty and followed, after optional "
        "whitespace, by a hyphen-minus, en dash or em dash, or the source fails as "
        "ambiguous-leading-label; each item's context is the text of the declared heading it "
        "was read under"),
    "first-cell-link-text": (
        "the link text of the first cell, trimmed and NFC-normalized; the cell must be one "
        "whole link [text](target), optionally with a space or tab and a title in double "
        "quotes after the target, with non-empty text, or the source fails as malformed-row"),
    "tree-key": "the <key> segment of the tree population's pathPattern",
    "ordinal-and-label": (
        "the heading's ordinal, a colon and the first cell's label; the first cell must be "
        "exactly one bold span with a non-empty label, or the source fails as malformed-row; "
        "each item's context is the heading's ordinal"),
    "link-target-basename": (
        "the basename of the link target in the declared column, without its fragment; a "
        "table with no such column, or a cell in it that is not one whole link whose target "
        "has a non-empty last segment, fails the source as malformed-row"),
}

#: The fields every class-grammar row carries (`pillar` only where two bindings
#: share a source name), and the fields each shape and key form reads. A row
#: may carry no other field: a field nothing reads would be a claim nothing
#: tests. "heading" stands for `heading`, or `headings` on heading-section.
ROW_FIELDS = {"class", "source", "pillar", "container", "itemKey"}
SHAPE_FIELDS = {
    "heading-section": {"heading"},
    "top-level-decimal-list": {"heading"},
    "top-level-list": {"heading"},
    "top-level-bulleted-list": {"heading"},
    "first-table-rows": {"heading"},
    "toml-table-field": {"table", "field"},
}
FORM_FIELDS = {"fixed": {"key"}, "link-target-basename": {"column"}}
#: The same allowlist for the other objects this package adds or reads (round-3 N1).
SOURCE_POPULATION_FIELDS = {
    "indexChainDepth", "pillarIndexBasename", "sourceRules", "treePopulations", "extractionBindings"}
BINDING_REQUIRED = {"rule", "relativePath", "classes"}
#: A TOML table or field name the profile may declare: a bare key, so no
#: padding or quoting changes what the reader matches.
TOML_BARE_KEY = re.compile(r"^[A-Za-z0-9_-]+$")
#: Order carries no meaning in `extractionBindings`, in `classGrammar` beyond
#: the project-account rows (which follow `fixedProjectAccountKeys`), in
#: `treePopulations` or in the keys of `containerShapes`: the observer reads
#: none of them in order, so no check pins it (round-3 N2).

PILLAR_ROOT_LINKS = (
    "after the table is read, every link in the root index, wherever it stands in the file, "
    "also declares a pillar's root when its resolved "
    "target, or the directory of a target named README.md, ends in a segment that is a pillar "
    "key; two different declared roots for one pillar, from the table, from links or from both, "
    "make that pillar Unknown")

SEMANTICS = {
    "scope": (
        "these fields restate the per-project values of the source grammar the observer applies "
        "today; loading them in place of the observer's built-in values must reproduce byte for "
        "byte the current source manifest and observation digests and, for every source, the "
        "items extraction reads from it; they add no class, "
        "heading, source, shape or key; the reading rules every project shares are listed under "
        "sharedReadingRules, stay in code and are set by no profile"),
    "headingMatch": (
        "a heading is an ATX heading written at column 0 (one to six # marks, then a space or "
        "tab) outside fenced code, so an indented line is never a heading; its text is taken without closing # marks and outer whitespace, NFC-normalized; "
        "a declared heading matches only at its declared level and only by exact text; a heading "
        "object without a level matches at any level; a declared heading that is missing fails "
        "the source as missing-heading, and one that occurs more than once fails it as "
        "duplicate-key"),
    "containerShape": (
        "each grammar row names exactly one shape from containerShapes, whose sentence says what "
        "is read and every way it fails; any class failing makes the whole source Unknown, and "
        "the source yields no partial item set"),
    "itemKey": (
        "each grammar row's itemKey says what becomes the item's key and how a key fails; a key "
        "that occurs twice within one class of one source fails the source as duplicate-key"),
    "sharedReadingRules": (
        "these rules are the same for every project, stay in code and are set by no profile: "
        "fenced code blocks, opened by three or more backticks or tildes, hide headings, list "
        "items, table rows and links (the source-population reader and the extraction reader "
        "each keep their own rule for fence indentation and closing); a list item opens at column "
        "0 with a decimal number followed by . or ), or with -, * or +, then a space or tab; its "
        "text is the rest of that line and each following blank or indented line, each trimmed and "
        "joined by line breaks, up to the next list item, the first other unindented line or fenced "
        "code, with outer whitespace trimmed, NFC-normalized; a leading bold span is written "
        "with ** or __; a table is a line that starts, after leading whitespace, with a pipe, "
        "followed by a delimiter row, and runs to the first line that does not; the extraction "
        "reader reads a backslash-escaped pipe inside a cell as a pipe; in the root index only the first table carrying both pillar-root columns is "
        "read, a pillar-column cell is a pillar label, optionally in ** bold or as a link, a "
        "directory-column cell is one code span ending in /, and a row with the wrong cell count "
        "or an unrecognised value is skipped; an index names a file only by an inline link or a "
        "reference definition outside fenced code and code spans, images excluded, with the "
        "fragment and query dropped, and it ignores and records a link that is external, "
        "escapes the repository, leaves the pillar root, names a directory or names the index "
        "itself; a baseline spec or roster butler.toml blob is read by its tree population even "
        "when a pillar index names it; a named file that is missing or is not a blob at the revision "
        "stays in the population; and the tree populations are enumerated from the Git tree "
        "whether or not the root index or any pillar index reads"),
    "missingField": (
        "a loader that finds any of these fields absent or malformed refuses the load; it never "
        "falls back to built-in values"),
}
ROW = re.compile(r"^([0-9a-f]{64})  ([^\n]+)$", re.MULTILINE)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def current_bytes(override: bytes | None = None) -> bytes:
    if override is not None:
        return override
    target = ROOT / SUBJECT
    if not target.is_file():
        raise ValueError(f"missing amendment subject: {SUBJECT.as_posix()}")
    return target.read_bytes()


def patch_files() -> list[pathlib.Path]:
    return sorted((ROOT / PROPOSED).glob("*.patch"), key=lambda p: p.name)


def _apply(body: bytes, patches: list[pathlib.Path], what: str, reverse: bool = False) -> bytes:
    with tempfile.TemporaryDirectory() as scratch:
        base = pathlib.Path(scratch)
        (base / SUBJECT).parent.mkdir(parents=True, exist_ok=True)
        (base / SUBJECT).write_bytes(body)
        for patch in patches:
            done = subprocess.run(
                ["git", "apply", "--whitespace=nowarn", *(["-R"] if reverse else []), str(patch)],
                cwd=base, capture_output=True, text=True,
            )
            if done.returncode != 0:
                raise ValueError(
                    f"{patch.name} ({what}) does not apply to "
                    f"{SUBJECT.as_posix()}: {done.stderr.strip()}")
        return (base / SUBJECT).read_bytes()


def _one_row(text: str, where: pathlib.Path) -> str:
    rows = ROW.findall(text)
    if len(rows) != 1 or rows[0][1] != SUBJECT.as_posix():
        raise ValueError(f"{where.as_posix()} does not carry one subject row")
    return rows[0][0]


def prior_row(text: str | None = None) -> str | None:
    """`.18`'s manifest digest, or None when that package is absent."""
    if text is None:
        target = ROOT / PRIOR_MANIFEST
        if not target.is_file():
            return None
        text = target.read_text()
    return _one_row(text, PRIOR_MANIFEST)


ACT_RECORD = pathlib.Path(".syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md")


def performed_rows(manifests: dict[str, str] | None = None,
                   record: str | None = None) -> list[str]:
    """The subject's row in each performed successor's manifest.

    A row counts only when it names this subject and the acceptance-act record
    quotes it, so listing an unperformed manifest in `PERFORMED_SUCCESSORS`
    admits nothing (round-5 note 8). `manifests` maps a label to manifest text
    and `record` is the record's text; both default to the tree.
    """
    if manifests is None:
        manifests = {m.as_posix(): (ROOT / m).read_text()
                     for m in PERFORMED_SUCCESSORS if (ROOT / m).is_file()}
    if record is None:
        target = ROOT / ACT_RECORD
        record = target.read_text() if target.is_file() else ""
    rows = []
    for text in manifests.values():
        rows.extend(digest for digest, path in ROW.findall(text)
                    if path == SUBJECT.as_posix() and digest in record)
    return rows


def own_row() -> str | None:
    """This package's manifest digest, or None before the first `--write`."""
    target = ROOT / OUT
    return _one_row(target.read_text(), OUT) if target.is_file() else None


ADOPTED = "this package adopted: current bytes with this patch reversed"
PRIOR_ADOPTED = ".18 adopted: current bytes"
SUPERSEDED = ".18 adopted, then superseded by a performed act: current bytes"
PENDING = ".18 pending: current bytes + .18 patch"
#: The states in which `--apply --at-adoption` may write.
APPLICABLE = frozenset({PRIOR_ADOPTED, SUPERSEDED})


def base_bytes(override: bytes | None = None,
               prior_digest: str | None | bool = False,
               prior_patch: pathlib.Path | None = None,
               own_digest: str | None | bool = False,
               patches: list[pathlib.Path] | None = None,
               performed: list[str] | None = None) -> tuple[bytes, str]:
    """The bytes this package's patch applies to, and which state produced them.

    Four states: `.18` pending; `.18` adopted; `.18` adopted and then
    superseded by a performed act whose recorded argument the subject hashes
    to (today the 2026-10-02 re-pin act B); and this package adopted, where
    the subject already hashes to this package's own manifest row and the base
    is recovered by reversing the patch. Any other subject (for example one
    the unperformed tree-framing re-pin has moved) matches no state and fails
    closed; it needs a new `PERFORMED_SUCCESSORS` entry, not only `--write`.
    """
    body = current_bytes(override)
    mine = own_row() if own_digest is False else own_digest
    if mine is not None and sha256(body) == mine:
        return _apply(body, patch_files() if patches is None else patches,
                      "this package, reversed", reverse=True), ADOPTED
    digest = prior_row() if prior_digest is False else prior_digest
    if digest is not None and sha256(body) == digest:
        return body, PRIOR_ADOPTED
    successors = performed_rows() if performed is None else performed
    if sha256(body) in successors:
        return body, SUPERSEDED
    patch = ROOT / PRIOR_PATCH if prior_patch is None else prior_patch
    if not patch.is_file():
        raise ValueError(
            "the .18 package is neither adopted nor present; this package is "
            "drafted on top of it and must be rebased")
    try:
        return _apply(body, [patch], ".18"), PENDING
    except ValueError as error:
        raise ValueError(
            "the subject hashes to neither .18's row, a performed successor's "
            "recorded row nor this package's row, and treating .18 as pending "
            f"fails: {error}") from error


def proposed_bytes(override: bytes | None = None,
                   patches: list[pathlib.Path] | None = None,
                   own_digest: str | None | bool = False) -> bytes:
    base, _state = base_bytes(override, own_digest=own_digest, patches=patches)
    patches = patch_files() if patches is None else patches
    if not patches:
        raise ValueError(f"no proposed patch under {PROPOSED.as_posix()}")
    return _apply(base, patches, "this package")


# ---------------------------------------------------------------------
# What the proposed bytes must say.

def _entry(doc: object) -> dict | None:
    if not isinstance(doc, dict):
        return None
    entries = doc.get("entries")
    if not isinstance(entries, list) or len(entries) != 1 or not isinstance(entries[0], dict):
        return None
    return entries[0]


def unchanged_findings(proposed: bytes, base: bytes) -> list[str]:
    """Only the two versions and the added grammar keys may move."""
    try:
        new, old = json.loads(proposed), json.loads(base)
    except ValueError as error:
        return [f"not valid JSON: {error}"]
    findings: list[str] = []
    new_entry, old_entry = _entry(new), _entry(old)
    if new_entry is None or old_entry is None:
        return ["proposed or base bytes do not carry exactly one registry entry"]
    for key in set(new) | set(old):
        if key in ("entries", "registryVersion"):
            continue
        if new.get(key) != old.get(key):
            findings.append(f"top-level field changed: {key}")
    for key in set(new_entry) | set(old_entry):
        if key in ("observationGrammar", "observerVersion"):
            continue
        if new_entry.get(key) != old_entry.get(key):
            findings.append(f"entry field changed: {key}")
    grammar, before = new_entry.get("observationGrammar"), old_entry.get("observationGrammar")
    if not isinstance(grammar, dict) or not isinstance(before, dict):
        return findings + ["observationGrammar is not an object"]
    if tuple(before) != EXISTING_GRAMMAR_KEYS:
        findings.append("the base grammar no longer carries the six bound keys in order")
    for key in EXISTING_GRAMMAR_KEYS:
        if grammar.get(key) != before.get(key):
            findings.append(f"bound grammar key changed: {key}")
    if tuple(grammar) != EXISTING_GRAMMAR_KEYS + ADDED_GRAMMAR_KEYS:
        findings.append("grammar key population or order differs from the declared set")
    return findings


VERSION_LINES = (
    ('  "registryVersion": "{}",\n'),
    ('      "observerVersion": "{}",\n'),
)


def byte_findings(proposed: bytes, base: bytes) -> list[str]:
    """Outside the two version lines and one inserted block, the bytes are the base's.

    `unchanged_findings` compares parsed values, so it cannot see a re-serialized
    line (a reflowed array, an escaped em dash). This compares lines: the only
    permitted differences are each version line replaced in place and a single
    pure insertion, which carries the added grammar keys.
    """
    import difflib
    try:
        old, new = base.decode().splitlines(True), proposed.decode().splitlines(True)
    except UnicodeDecodeError as error:
        return [f"not UTF-8: {error}"]
    allowed = {(line.format(BASE_VERSION), line.format(PROPOSED_VERSION)) for line in VERSION_LINES}
    findings: list[str] = []
    replaced: set[tuple[str, str]] = set()
    inserts = 0
    matcher = difflib.SequenceMatcher(None, old, new, autojunk=False)
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        if tag == "insert":
            inserts += 1
            continue
        pair = (old[i1], new[j1]) if (i2 - i1, j2 - j1) == (1, 1) else None
        if tag == "replace" and pair in allowed and pair not in replaced:
            replaced.add(pair)
            continue
        findings.append(f"bytes outside the permitted hunks differ from the base at base line {i1 + 1}")
    if replaced != allowed:
        findings.append("the two version lines are not each replaced in place")
    if inserts != 1:
        findings.append(f"expected one inserted block, found {inserts}")
    return findings


def _positive_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _headings(row: dict) -> list[dict]:
    if "heading" in row:
        return [row["heading"]]
    return list(row.get("headings", []))


def structure_findings(body: bytes) -> list[str]:
    findings: list[str] = []
    try:
        doc = json.loads(body)
    except ValueError as error:
        return [f"proposed bytes are not valid JSON: {error}"]
    if doc.get("registryVersion") != PROPOSED_VERSION:
        findings.append(f"registryVersion is not {PROPOSED_VERSION}")
    entry = _entry(doc)
    if entry is None:
        return findings + ["proposed bytes do not carry exactly one registry entry"]
    if entry.get("observerVersion") != PROPOSED_VERSION:
        findings.append(f"observerVersion is not {PROPOSED_VERSION}")
    g = entry.get("observationGrammar")
    if not isinstance(g, dict):
        return findings + ["observationGrammar is not an object"]
    classes = g.get("fixedClassKeys") or []

    pillars = g.get("pillars")
    pillar_keys: list[str] = []
    if not isinstance(pillars, list) or not pillars:
        findings.append("pillars is missing or empty")
    else:
        for p in pillars:
            if not isinstance(p, dict) or set(p) != {"key", "label"} or not all(
                    isinstance(p[k], str) and p[k] for k in ("key", "label")):
                findings.append(f"pillar row malformed: {p!r}")
            else:
                pillar_keys.append(p["key"])
        if len(set(pillar_keys)) != len(pillar_keys):
            findings.append("a pillar key is declared twice")

    root = g.get("rootIndex")
    if not isinstance(root, dict) or not isinstance(root.get("path"), str) or not root["path"]:
        findings.append("rootIndex.path is missing")
    elif not isinstance(root.get("pillarRootTable"), dict) or \
            set(root["pillarRootTable"]) != {"pillarColumn", "directoryColumn"}:
        findings.append("rootIndex.pillarRootTable keys differ from pillarColumn, directoryColumn")

    pop = g.get("sourcePopulation")
    rules: list[str] = []
    if not isinstance(pop, dict):
        findings.append("sourcePopulation is not an object")
        pop = {}
    else:
        if not _positive_int(pop.get("indexChainDepth")):
            findings.append("indexChainDepth is not a positive integer")
        rules = pop.get("sourceRules") or []
        trees = pop.get("treePopulations")
        if not isinstance(trees, list) or not trees:
            findings.append("treePopulations is missing or empty")
        else:
            for t in trees:
                if not isinstance(t, dict) or t.get("rule") not in rules:
                    findings.append(f"tree population names an undeclared rule: {t!r}")
                elif set(t) != {"rule", "pathPattern", "companions"}:
                    findings.append(f"tree population keys differ from rule, pathPattern, "
                                    f"companions: {t.get('rule')}")
                elif "<key>" not in str(t.get("pathPattern", "")):
                    findings.append(f"tree pathPattern has no <key>: {t.get('rule')}")
                elif not isinstance(t["companions"], list) or not all(
                        isinstance(c, str) and "<key>" in c for c in t["companions"]):
                    findings.append(f"tree companions are not <key> paths: {t.get('rule')}")
        if set(pop) != SOURCE_POPULATION_FIELDS:
            findings.append(f"sourcePopulation keys differ from {sorted(SOURCE_POPULATION_FIELDS)}")
        bound: set[str] = set()
        for b in pop.get("extractionBindings") or []:
            if not isinstance(b, dict) or b.get("rule") not in rules:
                findings.append(f"extraction binding names an undeclared rule: {b!r}")
                continue
            if not BINDING_REQUIRED <= set(b) <= BINDING_REQUIRED | {"pillar"}:
                findings.append(f"extraction binding keys differ from rule, relativePath, classes "
                                f"and an optional pillar: {b.get('relativePath')}")
            if "pillar" in b and b["pillar"] not in pillar_keys:
                findings.append(f"extraction binding names an undeclared pillar: {b['pillar']}")
            if b["rule"] == "pillar-index" and b.get("relativePath") != pop.get("pillarIndexBasename"):
                findings.append(f"a pillar-index binding is not the pillar index: {b.get('relativePath')}")
            for t in pop.get("treePopulations") or []:
                if isinstance(t, dict) and t.get("rule") == b["rule"] and b.get("relativePath") != \
                        posixpath.basename(str(t.get("pathPattern", ""))):
                    findings.append(f"a {b['rule']} binding is not its tree pattern's file: "
                                    f"{b.get('relativePath')}")
            for c in b.get("classes") or []:
                if c not in classes:
                    findings.append(f"extraction binding names an undeclared class: {c}")
                bound.add(c)
        if bound != set(classes):
            findings.append("extraction bindings do not cover exactly the declared classes")

    shapes = g.get("containerShapes")
    if not isinstance(shapes, dict) or not shapes:
        findings.append("containerShapes is missing or empty")
        shapes = {}
    for name, sentence in shapes.items():
        if not isinstance(sentence, str) or not sentence.strip():
            findings.append(f"container shape without a sentence: {name}")

    grammar = g.get("classGrammar")
    used: set[str] = set()
    covered: set[str] = set()
    account_keys: list[str] = []
    if not isinstance(grammar, list) or not grammar:
        findings.append("classGrammar is missing or empty")
        grammar = []
    for row in grammar:
        if not isinstance(row, dict):
            findings.append(f"class grammar row is not an object: {row!r}")
            continue
        cls = row.get("class")
        if cls not in classes:
            findings.append(f"class grammar names an undeclared class: {cls}")
        covered.add(cls)
        shape = row.get("container")
        if shape not in shapes:
            findings.append(f"class grammar row names an undeclared container shape: {cls} {shape}")
        used.add(shape)
        if not isinstance(row.get("itemKey"), str) or not row["itemKey"]:
            findings.append(f"class grammar row has no itemKey: {cls}")
        # Each field a row carries must be one its shape or its key form reads.
        form = _form(row)[0]
        needed = SHAPE_FIELDS.get(shape, set()) | FORM_FIELDS.get(form, set())
        allowed = ROW_FIELDS | needed | ({"heading", "headings"} if "heading" in needed else set())
        if set(row) - allowed:
            findings.append(f"class grammar row carries a field its shape and key form do not "
                            f"read: {cls} {sorted(set(row) - allowed)}")
        for field in needed - {"heading"}:
            if field not in row:
                findings.append(f"class grammar row lacks a field its shape or key form reads: "
                                f"{cls} {field}")
        if "heading" in needed and not _headings(row):
            findings.append(f"class grammar row lacks the heading its shape reads: {cls}")
        if {"heading", "headings"} <= set(row):
            findings.append(f"class grammar row carries both heading and headings: {cls}")
        if "headings" in row and shape != "heading-section":
            findings.append(f"only heading-section reads more than one heading object: {cls}")
        for h in _headings(row):
            if not isinstance(h, dict) or set(h) - {"level"} not in ({"text"}, {"textsFrom"}):
                findings.append(f"heading object keys differ from level with text or textsFrom: {cls}")
            elif "text" in h and (not isinstance(h["text"], str) or not h["text"]):
                findings.append(f"heading without text: {cls}")
            elif "textsFrom" in h and h["textsFrom"] != "fixedCatalogKeys":
                findings.append(f"textsFrom names an unknown list: {h['textsFrom']}")
            if isinstance(h, dict) and "level" in h and h["level"] not in (1, 2, 3, 4, 5, 6):
                findings.append(f"heading level out of range: {cls} {h['level']}")
        if cls == "project-account-section":
            account_keys.append(row.get("key"))
        # `pillar` only where two bindings share the row's source name (round-3 N2).
        if isinstance(pop, dict):
            sharing = [b for b in pop.get("extractionBindings") or []
                       if isinstance(b, dict) and b.get("relativePath") == row.get("source")]
            if ("pillar" in row) != (len(sharing) > 1):
                findings.append(f"class grammar row carries pillar where its source name is "
                                f"{'not ' if len(sharing) < 2 else ''}shared: {cls}")
        for field in ("table", "field"):
            if field in row and not (isinstance(row[field], str) and TOML_BARE_KEY.match(row[field])):
                findings.append(f"TOML {field} is not a bare key: {cls} {row[field]!r}")
        if isinstance(pop, dict) and len(row_bindings(g, row)) != 1:
            findings.append(f"class grammar row does not match exactly one binding: {cls} "
                            f"{row.get('source')}")
    if covered != set(classes):
        findings.append("class grammar does not cover exactly the declared classes")
    unused = set(shapes) - used
    if unused:
        findings.append(f"container shape declared and never used: {sorted(unused)}")
    if account_keys != list(g.get("fixedProjectAccountKeys") or []):
        findings.append("project-account rows do not match fixedProjectAccountKeys in order")

    if shapes != SHAPES:
        findings.append("containerShapes differs from the pinned sentences")
    if isinstance(root, dict) and root.get("pillarRootLinks") != PILLAR_ROOT_LINKS:
        findings.append("rootIndex.pillarRootLinks differs from the pinned sentence")
    if isinstance(root, dict) and set(root) != {"path", "pillarRootTable", "pillarRootLinks"}:
        findings.append("rootIndex keys differ from path, pillarRootTable, pillarRootLinks")
    for row in grammar:
        if isinstance(row, dict) and row.get("itemKey") not in ITEM_KEY_SENTENCES.values() \
                and not ORDINAL_KEY.match(str(row.get("itemKey"))):
            findings.append(f"itemKey is not a pinned sentence: {row.get('class')}")
    sem = g.get("sourceGrammarSemantics")
    if isinstance(sem, dict) and sem != SEMANTICS:
        findings.append("sourceGrammarSemantics differs from the pinned sentences")
    if not isinstance(sem, dict) or tuple(sem) != SEMANTICS_KEYS:
        findings.append("sourceGrammarSemantics key population or order differs")
    else:
        for key, sentence in sem.items():
            if not isinstance(sentence, str) or not sentence.strip():
                findings.append(f"sourceGrammarSemantics sentence is empty: {key}")
    return findings


# ---------------------------------------------------------------------
# Does it restate today's grammar? Two independent witnesses.

def reader_definitions(spec_text: str) -> str:
    start = spec_text.find("Reader definitions:")
    end = spec_text.find("## ADDED Requirements")
    if start < 0 or end < start:
        raise ValueError(f"{SPEC.as_posix()} has no reader-definitions block")
    return spec_text[start:end]


def spec_findings(body: bytes, spec_text: str) -> list[str]:
    """Every heading literal and catalog key appears in the reader definitions."""
    block = " ".join(reader_definitions(spec_text).split())
    g = _entry(json.loads(body))["observationGrammar"]
    findings = []
    literals = [h["text"] for row in g["classGrammar"] for h in _headings(row) if "text" in h]
    literals += list(g["fixedCatalogKeys"])
    for text in literals:
        if text not in block:
            findings.append(f"heading literal not in the reader definitions: {text!r}")
    return findings


def _ts(name: str) -> str:
    target = ROOT / CORE / name
    if not target.is_file():
        raise ValueError(f"missing {(CORE / name).as_posix()}")
    return target.read_text()


def expected_code_lines(body: bytes) -> list[tuple[str, str]]:
    """Source lines the constants must contain if the profile restates them."""
    g = _entry(json.loads(body))["observationGrammar"]
    out: list[tuple[str, str]] = [
        ("project-shape-manifest.ts",
         f"export const PWB_ROOT_INDEX_PATH = '{g['rootIndex']['path']}';"),
        ("project-shape-manifest.ts",
         f"export const PWB_INDEX_DEPTH = {g['sourcePopulation']['indexChainDepth']};"),
        ("project-shape-manifest.ts",
         "export const PILLAR_KEYS = ["
         + ", ".join(f"'{p['key']}'" for p in g["pillars"]) + "] as const;"),
        ("project-shape-manifest.ts",
         "export const SOURCE_RULES = ["
         + ", ".join(f"'{r}'" for r in g["sourcePopulation"]["sourceRules"])
         + "] as const;"),
    ]
    for p in g["pillars"]:
        out.append(("project-shape-profile-vocabulary.ts", f"  '{p['key']}': '{p['label']}',"))
    for b in g["sourcePopulation"]["extractionBindings"]:
        classes = "[" + ", ".join(f"'{c}'" for c in b["classes"]) + "]"
        if b["rule"] == "pillar-named-file" and b["pillar"] != "heart-and-soul":
            out.append(("project-shape-manifest.ts",
                        f"if (pillar === '{b['pillar']}' && relativePath === "
                        f"'{b['relativePath']}') return {classes};"))
        elif b["rule"] == "pillar-named-file":
            out.append(("project-shape-manifest.ts",
                        f"if (relativePath === '{b['relativePath']}') return {classes};"))
        elif b["rule"] == "pillar-index":
            out.append(("project-shape-manifest.ts",
                        f"if (pillar === '{b['pillar']}') return {classes};"))
        elif b["rule"] == "roster-tree":
            out.append(("project-shape-manifest.ts",
                        f"return relativePath === '{b['relativePath']}' ? {classes} : [];"))
        else:
            out.append(("project-shape-manifest.ts", f"return {classes};"))
    for t in g["sourcePopulation"]["treePopulations"]:
        pattern = "([^/]+)".join(
            re.escape(part).replace("/", "\\/") for part in t["pathPattern"].split("<key>"))
        out.append(("project-shape-manifest.ts", f"/^{pattern}$/"))
    return out


def code_findings(body: bytes, reader=_ts) -> list[str]:
    findings = []
    sources: dict[str, str] = {}
    for name, line in expected_code_lines(body):
        text = sources.setdefault(name, reader(name))
        if line not in text:
            findings.append(f"{name} does not carry {line!r}")
    return findings


# ---------------------------------------------------------------------
# Witness 3: the observer's own code, run over files built from the profile.
#
# The builder writes a small repository whose every file is generated from
# the proposed fields alone: the root index from `rootIndex` and `pillars`,
# each pillar index and named file from `sourcePopulation` and the grammar
# rows, the tree populations from their path patterns. It predicts, from the
# same fields, the source manifest and every item the observer should read,
# then runs the real `deriveProjectShapeManifest` and `extractSource` from
# `packages/three-surface-poc-core/src/` under Node and compares. A row that
# names the wrong heading, level, source, column, table, field, pattern,
# companion or index file makes the prediction and the code disagree.
#
# The sentences cannot be run, so each one is pinned to the text below, and
# each clause a probe exercises must appear in its sentence: the probe feeds
# the code one deliberately varied file and checks the outcome the clause
# states.

PILLAR_DIR = "p"
TREE_KEY = "k1"
DECOYS = ("MANIFESTO.md", "README.md", "notes.md")
FILLER = "Witness Filler"
EM, EN = "—", "–"
ORDINAL_KEY = re.compile(r"^([a-z0-9]+):<one-based ordinal>$")
ITEM_FORMS = {sentence: form for form, sentence in ITEM_KEY_SENTENCES.items()}
#: Which content satisfies a row, by container; heading-section reads any.
CONTENT_KINDS = ("section", "mixed", "decimal", "bulleted", "design-table", "craft-table")

HARNESS = r"""
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
registerHooks({ resolve(spec, ctx, next) {
  try { return next(spec, ctx); } catch (error) {
    if (spec.startsWith('.') && spec.endsWith('.js')) return next(spec.slice(0, -3) + '.ts', ctx);
    throw error;
  }
} });
const core = process.argv[2];
const man = await import(pathToFileURL(core + '/project-shape-manifest.ts'));
const ex = await import(pathToFileURL(core + '/project-shape-extraction.ts'));
const cases = JSON.parse(readFileSync(0, 'utf8'));
const out = cases.map((c) => {
  if (c.kind === 'derive') {
    const tree = Object.keys(c.files).sort().map((path) => ({
      mode: '100644', type: 'blob', objectId: createHash('sha1').update(path).digest('hex'), path }));
    const r = man.deriveProjectShapeManifest({ repositoryId: 'witness', revision: 'r', tree,
      readSeed: ({ path }) => ({ kind: 'text', text: c.files[path] }) });
    if (r.kind !== 'manifest') return { kind: r.kind, reason: r.reason };
    const m = r.manifest;
    return { kind: 'manifest', indexDepth: m.indexDepth,
      rootIndex: [m.rootIndex.path, m.rootIndex.state],
      pillars: m.pillars.map((p) => [p.key, p.state, p.reason ?? null, p.root ?? null,
        p.indexPath ?? null, p.ignoredLinks.map((l) => l.reason)]),
      sources: m.sources.map((s) => [s.path, s.rule, s.pillar ?? null, s.extractionClasses, s.anchor.kind]) };
  }
  const r = ex.extractSource({ path: c.path, extractionClasses: c.classes }, c.text);
  if (r.kind === 'extracted') return { kind: 'extracted', items: r.items.map((i) => [
    i.class, i.key, i.statement ?? null, i.context ?? null]) };
  return { kind: r.kind, reason: r.failure?.reason ?? null };
});
process.stdout.write(JSON.stringify(out));
"""


def run_node(cases: list[dict]) -> list[dict]:
    """Run the observer's own TypeScript over the witness cases."""
    node = shutil.which("node")
    if node is None:
        raise ValueError("node not found: the behaviour witness needs Node 22.18 or later")
    with tempfile.TemporaryDirectory() as scratch:
        harness = pathlib.Path(scratch) / "witness.mjs"
        harness.write_text(HARNESS)
        done = subprocess.run(
            [node, "--no-warnings", str(harness), str(ROOT / CORE)],
            input=json.dumps(cases), capture_output=True, text=True)
    if done.returncode != 0:
        raise ValueError(f"the behaviour witness could not run the observer: {done.stderr.strip()[-400:]}")
    results = json.loads(done.stdout)
    if len(results) != len(cases):
        raise ValueError("the behaviour witness returned the wrong number of results")
    return results


def _instance(pattern: str) -> str:
    return pattern.replace("<key>", TREE_KEY)


def _row_headings(g: dict, row: dict) -> list[tuple[int | None, str]]:
    if "heading" in row:
        h = row["heading"]
        if "textsFrom" in h:
            return [(h.get("level"), t) for t in g.get(h["textsFrom"]) or []]
        return [(h.get("level"), h.get("text"))]
    return [(h.get("level"), h.get("text")) for h in row.get("headings") or []]


def row_bindings(g: dict, row: dict) -> list[dict]:
    """The extraction bindings that assign this row's class to this row's source."""
    pop = g.get("sourcePopulation")
    bindings = pop.get("extractionBindings") if isinstance(pop, dict) else None
    return [b for b in bindings or [] if isinstance(b, dict)
            and b.get("relativePath") == row.get("source")
            and isinstance(b.get("classes"), list) and row.get("class") in b["classes"]
            and ("pillar" not in row or b.get("pillar") == row["pillar"])]


def _binding_path(g: dict, b: dict) -> str | None:
    pop = g["sourcePopulation"]
    if b["rule"] == "pillar-index":
        return f"{PILLAR_DIR}/{b['pillar']}/{pop['pillarIndexBasename']}"
    if b["rule"] == "pillar-named-file":
        return f"{PILLAR_DIR}/{b['pillar']}/{b['relativePath']}"
    for t in pop["treePopulations"]:
        if t["rule"] == b["rule"]:
            return posixpath.join(posixpath.dirname(_instance(t["pathPattern"])), b["relativePath"])
    return None


def _classes(g: dict, rule: str, pillar: str | None, relative: str) -> tuple[str, ...]:
    for b in g["sourcePopulation"]["extractionBindings"]:
        if b["rule"] == rule and b.get("relativePath") == relative and (
                pillar is None or b.get("pillar") == pillar):
            return tuple(b["classes"])
    return ()


def _form(row: dict) -> tuple[str, str | None]:
    sentence = row.get("itemKey")
    if sentence in ITEM_FORMS:
        return ITEM_FORMS[sentence], None
    m = ORDINAL_KEY.match(sentence or "")
    return ("prefixed-ordinal", m[1]) if m else ("unknown", None)


def _predict_key(row: dict, label: str | None, ordinal: int) -> str | None:
    """The key the row's own item-key form gives an item whose natural label is `label`."""
    form, prefix = _form(row)
    if form == "prefixed-ordinal":
        return f"{prefix}:{ordinal}"
    if form == "fixed":
        return row.get("key")
    if form == "tree-key":
        return TREE_KEY
    return label


def _kinds_for(row: dict) -> set[str]:
    shape = row.get("container")
    if shape == "heading-section":
        return set(CONTENT_KINDS)
    if shape == "top-level-decimal-list":
        return {"decimal"}
    if shape == "top-level-list":
        return {"decimal", "mixed"}
    if shape == "top-level-bulleted-list":
        return {"bulleted"}
    if shape == "first-table-rows":
        return {"craft-table" if _form(row)[0] == "link-target-basename" else "design-table"}
    return set()


def _content(kind: str, n: int, row: dict) -> tuple[str, list[tuple[str | None, str | None]], list[str]]:
    """Slot text, its items as (label, statement), and the links it writes."""
    if kind == "decimal":
        return (f"1. **P{n}a** {EM} first.\n   continued\n2) __P{n}b__ second.\n",
                [(f"P{n}a", f"**P{n}a** {EM} first.\ncontinued"), (f"P{n}b", f"__P{n}b__ second.")], [])
    if kind == "mixed":
        return (f"1. **Q{n}a** {EM} first.\n- **Q{n}b** {EM} second.\n",
                [(f"Q{n}a", f"**Q{n}a** {EM} first."), (f"Q{n}b", f"**Q{n}b** {EM} second.")], [])
    if kind == "bulleted":
        return (f"- **C{n}a** {EM} one\n+ `c{n}b` {EN} two\n* **C{n}  c** - three\n",
                [(f"C{n}a", f"**C{n}a** {EM} one"), (f"c{n}b", f"`c{n}b` {EN} two"),
                 (f"C{n} c", f"**C{n}  c** - three")], [])
    if kind == "design-table":
        return (f"| Contract | Note |\n|---|---|\n| [D{n}a](d{n}a.md) | a \\| b |\n"
                f"| [D{n}b](d{n}b.md \"title\") | c |\n\nLater prose.\n\n"
                f"| [X{n}](x{n}.md) |\n|---|\n| one | two |\n",
                [(f"D{n}a", None), (f"D{n}b", None)], [f"d{n}a.md", f"d{n}b.md", f"x{n}.md"])
    if kind == "craft-table":
        column = row.get("column", "")
        return (f"| Why | {column} |\n|---|---|\n| a | [c{n}a.md](c{n}a.md#top) |\n"
                f"| b | [Policy](sub/c{n}b.md) |\n\nLater prose.\n\n| {column} |\n|---|\n| x | y |\n",
                [(f"c{n}a.md", None), (f"c{n}b.md", None)], [f"c{n}a.md#top", f"sub/c{n}b.md"])
    return (f"Body {n} first line.\nBody {n} second line.\n", [], [])


def _ordinal_file(n: int) -> tuple[str, list[str]]:
    text = (f"## 1 Layer\n\n| Component | Role |\n|---|---|\n| **T{n}a** | x |\n\n"
            f"### Sub\n\n| Component | Role |\n|---|---|\n| **T{n}b** | y |\n\n"
            f"## 2b Layer\n\n| Component | Role |\n|---|---|\n| **T{n}c** | z |\n\n"
            f"## Notes\n\n| Component | Role |\n|---|---|\n| plain | not read |\n")
    return text, [f"1:T{n}a", f"1:T{n}b", f"2b:T{n}c"]


class Witness:
    """The witness repository and everything predicted about it."""

    def __init__(self, g: dict, override: tuple | None = None):
        self.g = g
        self.files: dict[str, str] = {}
        self.named: dict[str, list[str]] = {}
        self.items: dict[str, list[tuple]] = {}
        self.problems: list[str] = []
        self.slot_of: dict[int, str] = {}
        self._links: dict[str, list[str]] = {}
        self._n = 0
        self._build(override)

    def _next(self) -> int:
        self._n += 1
        return self._n

    def _build(self, override: tuple | None) -> None:
        g = self.g
        pop = g["sourcePopulation"]
        by_path: dict[str, list[int]] = {}
        for i, row in enumerate(g["classGrammar"]):
            matches = row_bindings(g, row)
            path = _binding_path(g, matches[0]) if len(matches) == 1 else None
            if path is None:
                self.problems.append(f"grammar row {i} ({row.get('class')}) has no single binding")
                continue
            by_path.setdefault(path, []).append(i)
        for path, rows in by_path.items():
            self.files[path] = self._file(path, rows, override)
        # Root index: the pillar-root table only.
        root = g["rootIndex"]
        table = root["pillarRootTable"]
        lines = ["# Witness root index", "",
                 f"| {table['pillarColumn']} | {table['directoryColumn']} |", "|---|---|"]
        for i, p in enumerate(g["pillars"]):
            label = (p["label"], f"**{p['label']}**", f"[{p['label']}](notes.md)")[i % 3]
            lines.append(f"| {label} | `{PILLAR_DIR}/{p['key']}/` |")
        self.files[root["path"]] = "\n".join(lines) + "\n"
        # Pillar indexes: a link to each named file, then any index content.
        for p in g["pillars"]:
            k = p["key"]
            index = f"{PILLAR_DIR}/{k}/{pop['pillarIndexBasename']}"
            links = [b["relativePath"] for b in pop["extractionBindings"]
                     if b["rule"] == "pillar-named-file" and b.get("pillar") == k]
            head = f"# Witness index {k}\n\n" + "".join(f"- [{rel}]({rel})\n" for rel in links)
            self.files[index] = head + "\n" + self.files.get(index, "")
            named = self.named.setdefault(k, [])
            for rel in links:
                named.append(posixpath.normpath(f"{PILLAR_DIR}/{k}/{rel}"))
        for path, targets in self._links.items():
            k = path.split("/")[1]
            for target in targets:
                named = self.named.setdefault(k, [])
                resolved = posixpath.normpath(posixpath.join(posixpath.dirname(path), target.split("#")[0]))
                if resolved not in named:
                    named.append(resolved)
        # Tree populations, their companions and decoys beside them.
        for t in pop["treePopulations"]:
            folder = posixpath.dirname(_instance(t["pathPattern"]))
            for decoy in DECOYS:
                self.files.setdefault(f"{folder}/{decoy}", "decoy\n")
            self.files.setdefault(_instance(t["pathPattern"]), "tree source\n")

    def _file(self, path: str, rows: list[int], override: tuple | None) -> str:
        g = self.g
        grammar = g["classGrammar"]
        shapes = {grammar[i].get("container") for i in rows}
        if "toml-table-field" in shapes:
            row = next(grammar[i] for i in rows if grammar[i].get("container") == "toml-table-field")
            n = self._next()
            table, field = row.get("table"), row.get("field")
            for i in rows:
                self.items.setdefault(path, []).append(
                    (grammar[i]["class"], _predict_key(grammar[i], None, 1), None, f"n{n}"))
            return f"[{table}]\n{field} = \"n{n}\"\n\n[other{n}]\n{field} = 'ignored'\n"
        if shapes == {"tree-path"}:
            for i in rows:
                self.items.setdefault(path, []).append(
                    (grammar[i]["class"], _predict_key(grammar[i], None, 1), None, None))
            return "tree source\n"
        # Heading slots, in row order; one slot per distinct heading.
        slots: list[dict] = []
        find: dict[tuple, dict] = {}
        tail = ""
        for i in rows:
            row = grammar[i]
            shape = row.get("container")
            if shape == "ordinal-section-table-rows":
                text, keys = _ordinal_file(self._next())
                tail += text
                topology = _form(row)[0] == "ordinal-and-label"
                for ordinal, key in enumerate(keys, start=1):
                    self.items.setdefault(path, []).append(
                        (row["class"], _predict_key(row, key, ordinal), None,
                         key.split(":")[0] if topology else None))
                continue
            if shape == "every-level-2-section":
                n = self._next()
                for name in (f"Alpha {n}", f"Beta {n}"):
                    slot = {"level": 2, "text": name, "rows": [], "kinds": set(CONTENT_KINDS)}
                    slots.append(slot)
                continue
            for level, text in _row_headings(g, row):
                key = (level or 2, text)
                slot = find.get(key)
                if slot is None:
                    slot = {"level": level or 2, "text": text, "rows": [], "kinds": set(CONTENT_KINDS)}
                    find[key] = slot
                    slots.append(slot)
                slot["rows"].append(i)
                slot["kinds"] &= _kinds_for(row)
        for slot in slots:
            kinds = [k for k in CONTENT_KINDS if k in slot["kinds"]]
            if not kinds:
                self.problems.append(f"no one file section satisfies rows {slot['rows']} under {slot['text']!r}")
                kinds = ["section"]
            n = self._next()
            first = grammar[slot["rows"][0]] if slot["rows"] else {}
            slot["content"], slot["items"], links = _content(kinds[0], n, first)
            if override is not None and override[0] == "slot" and override[1] in slot["rows"] \
                    and slot is next(s for s in slots if override[1] in s["rows"]):
                slot["content"] = override[2]
                self.slot_of[override[1]] = path
            for i in slot["rows"]:
                self.slot_of.setdefault(i, path)
            self._links.setdefault(path, []).extend(links)
        # Render: level-1 and level-2 slots, the ordinal tail, then deeper slots under a filler.
        shallow = [s for s in slots if s["level"] <= 2]
        deep = [s for s in slots if s["level"] > 2]
        render = lambda s: f"{'#' * s['level']} {s['text']}\n\n{s['content']}\n"
        body = f"# Witness {posixpath.basename(path)}\n\n" + "".join(render(s) for s in shallow) + tail
        deep_text = "".join(render(s) for s in deep)
        if deep:
            body += f"## {FILLER}\n\n" + deep_text
        # Predict what each row reads.
        for i in rows:
            row = grammar[i]
            shape, (form, _prefix) = row.get("container"), _form(row)
            mine = [s for s in slots if i in s["rows"]]
            out = self.items.setdefault(path, [])
            if shape == "every-level-2-section":
                parts = [s for s in shallow if s["level"] == 2]
                statement = "\n\n".join(f"{s['text']}\n\n{s['content'].strip()}".strip() for s in parts)
                out.append((row["class"], _predict_key(row, None, 1), statement, None))
            elif shape == "heading-section":
                bodies = [f"{s['text']}\n\n{s['content'].strip()}" for s in mine]
                statement = mine[0]["content"].strip() if len(mine) == 1 else "\n\n".join(bodies).strip()
                out.append((row["class"], _predict_key(row, None, 1), statement, None))
            elif shape in ("top-level-decimal-list", "top-level-list", "top-level-bulleted-list",
                           "first-table-rows"):
                ordinal = 0
                for s in mine:
                    context = s["text"] if form == "leading-bold-or-code" else None
                    for label, statement in s["items"]:
                        ordinal += 1
                        out.append((row["class"], _predict_key(row, label, ordinal), statement, context))
        return body


def _manifest_prediction(w: Witness) -> dict:
    g = w.g
    pop = g["sourcePopulation"]
    root = g["rootIndex"]["path"]
    sources = {(root, "root-index", None, (), "blob")}
    pillars = []
    for p in g["pillars"]:
        k = p["key"]
        index = f"{PILLAR_DIR}/{k}/{pop['pillarIndexBasename']}"
        pillars.append((k, "discovered", None, f"{PILLAR_DIR}/{k}", index, ()))
        sources.add((index, "pillar-index", k,
                     _classes(g, "pillar-index", k, pop["pillarIndexBasename"]), "blob"))
        for path in w.named.get(k, []):
            relative = path[len(f"{PILLAR_DIR}/{k}/"):]
            sources.add((path, "pillar-named-file", k, _classes(g, "pillar-named-file", k, relative),
                         "blob" if path in w.files else "missing-at-revision"))
    for t in pop["treePopulations"]:
        path = _instance(t["pathPattern"])
        sources.add((path, t["rule"], None, _classes(g, t["rule"], None, posixpath.basename(path)), "blob"))
        for companion in t.get("companions") or []:
            sources.add((_instance(companion), t["rule"], None, (), "blob"))
    return {"indexDepth": pop["indexChainDepth"], "rootIndex": (root, "read"),
            "pillars": pillars, "sources": sorted(sources, key=repr)}


def _as_manifest(result: dict) -> dict:
    if result.get("kind") != "manifest":
        return {"kind": result.get("kind"), "reason": result.get("reason")}
    return {"indexDepth": result["indexDepth"], "rootIndex": tuple(result["rootIndex"]),
            "pillars": [tuple(p[:5]) + (tuple(p[5]),) for p in result["pillars"]],
            "sources": sorted(((s[0], s[1], s[2], tuple(s[3]), s[4]) for s in result["sources"]), key=repr)}


def _item_findings(path: str, expected: list[tuple], result: dict) -> list[str]:
    if result.get("kind") != "extracted":
        return [f"witness {path}: the observer read the source as {result.get('kind')} "
                f"({result.get('reason')}); the profile predicts items"]
    got = [tuple(item) for item in result["items"]]
    if sorted((c, k) for c, k, *_ in got) != sorted((c, k) for c, k, *_ in expected):
        return [f"witness {path}: the observer read keys {sorted((c, k) for c, k, *_ in got)}; "
                f"the profile predicts {sorted((c, k) for c, k, *_ in expected)}"]
    findings = []
    index = {(c, k): (s, x) for c, k, s, x in got}
    for c, k, statement, context in expected:
        s, x = index[(c, k)]
        if statement is not None and s != statement:
            findings.append(f"witness {path}: {c} {k} reads {s!r}; the profile predicts {statement!r}")
        if context is not None and x != context:
            findings.append(f"witness {path}: {c} {k} carries {x!r}; the profile predicts {context!r}")
    return findings


def _sentence(g: dict, where: tuple) -> str:
    if where[0] == "row":
        return str(g["classGrammar"][where[1]].get("itemKey", ""))
    if where[0] == "rootIndex":
        return str(g["rootIndex"].get("pillarRootLinks", ""))
    return str((g.get(where[0]) or {}).get(where[1], ""))


def _failed(reason: str):
    return lambda r: None if r.get("kind") == "unknown" and r.get("reason") == reason else \
        f"expected {reason}, observed {r.get('kind')} {r.get('reason') or ''}".strip()


def _has_key(key: str, statement: str | None = None):
    def check(r: dict) -> str | None:
        if r.get("kind") != "extracted":
            return f"expected items with key {key!r}, observed {r.get('kind')} {r.get('reason')}"
        hits = [i for i in r["items"] if i[1] == key]
        if not hits:
            return f"expected key {key!r}, observed {[i[1] for i in r['items']]}"
        if statement is not None and hits[0][2] != statement:
            return f"expected statement {statement!r}, observed {hits[0][2]!r}"
        return None
    return check


def _has_context(context: str):
    def check(r: dict) -> str | None:
        if r.get("kind") != "extracted" or not r["items"]:
            return f"expected an item with context {context!r}, observed {r.get('kind')} {r.get('reason')}"
        if r["items"][0][3] != context:
            return f"expected context {context!r}, observed {r['items'][0][3]!r}"
        return None
    return check


def _extracted(r: dict) -> str | None:
    return None if r.get("kind") == "extracted" else f"expected items, observed {r.get('kind')} {r.get('reason')}"


def probes(g: dict) -> list[tuple[str, tuple, str, dict, object]]:
    """(label, sentence location, clause, witness case, outcome check)."""
    out: list[tuple[str, tuple, str, dict, object]] = []
    grammar = g["classGrammar"]
    pop = g["sourcePopulation"]

    def row_case(i: int, content: str) -> dict:
        w = Witness(g, ("slot", i, content))
        path = w.slot_of[i]
        return {"kind": "extract", "path": path, "classes": [grammar[i]["class"]], "text": w.files[path]}

    def file_case(i: int, text: str) -> dict:
        w = Witness(g)
        path = next(p for p, v in w.items.items() if any(t[0] == grammar[i]["class"] for t in v))
        return {"kind": "extract", "path": path, "classes": [grammar[i]["class"]], "text": text}

    def edit_case(i: int, edit) -> dict:
        w = Witness(g)
        path = w.slot_of[i]
        return {"kind": "extract", "path": path, "classes": [grammar[i]["class"]], "text": edit(w.files[path])}

    # Every row runs its own shape's and its own key form's probes, so a row
    # relabelled with another shape or form is tested as it now claims.
    done_heading = False
    for i, row in enumerate(grammar):
        shape = row.get("container")
        form, _prefix = _form(row)
        C = ("containerShapes", shape)

        def items(*texts: str, shape=shape) -> str:
            """List items in the markers the row's shape admits."""
            if shape == "top-level-bulleted-list":
                return "".join(f"- {t}\n" for t in texts)
            return "".join(f"{n}. {t}\n" for n, t in enumerate(texts, start=1))
        if shape == "heading-section" and len(_row_headings(g, row)) == 1:
            level = _row_headings(g, row)[0][0] or 2
            out.append((f"{shape}, row {i}: an empty body", C, "the body may be empty",
                        row_case(i, ""), _has_key(row.get("key"), "")))
            if level < 6:
                deeper = f"Intro.\n\n{'#' * (level + 1)} Deeper\n\nMore."
                out.append((f"{shape}, row {i}: a deeper heading stays in the body", C,
                            "up to the next heading at the same or a higher level",
                            row_case(i, deeper), _has_key(row.get("key"), deeper)))
        elif shape == "every-level-2-section":
            out.append((f"{shape}, row {i}: no level-2 heading", C,
                        "a file with no level-2 heading fails the source as missing-heading",
                        file_case(i, "# Only a title\n\nText.\n"), _failed("missing-heading")))
        elif shape == "top-level-decimal-list":
            out.append((f"{shape}, row {i}: a bulleted item", C,
                        "a bulleted item at column 0 fails the source as malformed-list",
                        row_case(i, f"- **X** {EM} bulleted\n"), _failed("malformed-list")))
            out.append((f"{shape}, row {i}: only an indented item", C,
                        "so does a section with no list item at column 0",
                        row_case(i, f" 1. **X** {EM} indented\n"), _failed("malformed-list")))
        elif shape == "top-level-list":
            out.append((f"{shape}, row {i}: only an indented item", C,
                        "a section with no list item at column 0 fails the source as malformed-list",
                        row_case(i, " - indented\n"), _failed("malformed-list")))
        elif shape == "top-level-bulleted-list":
            out.append((f"{shape}, row {i}: a numbered item", C,
                        "a numbered item at column 0 fails the source as malformed-list",
                        row_case(i, f"1. **X** {EM} numbered\n"), _failed("malformed-list")))
            out.append((f"{shape}, row {i}: no list item", C,
                        "a section with no list item yields no items and does not fail",
                        row_case(i, "Prose only.\n"), _extracted))
        elif shape == "first-table-rows":
            out.append((f"{shape}, row {i}: no table", C,
                        "a section with no table fails the source as malformed-row",
                        row_case(i, "Prose, no table.\n"), _failed("malformed-row")))
            out.append((f"{shape}, row {i}: a short body row", C,
                        "a body row of that table whose cell count differs from its header's",
                        row_case(i, "| A | B |\n|---|---|\n| [X](x.md) |\n"), _failed("malformed-row")))
        elif shape == "ordinal-section-table-rows":
            table = "| C | R |\n|---|---|\n| **A** | x |\n"
            out.append((f"{shape}, row {i}: an ordinal followed by a letter run", C,
                        "a character that is not an ASCII letter, digit or underscore",
                        file_case(i, f"## 1st Layer\n\n{table}"), _failed("missing-heading")))
            out.append((f"{shape}, row {i}: a short row under a level-3 heading", C,
                        "a body row whose cell count differs from its table's header fails it as malformed-row",
                        file_case(i, "## 3 Layer\n\n### Sub\n\n| C | R |\n|---|---|\n| **A** |\n"),
                        _failed("malformed-row")))
        elif shape == "toml-table-field":
            t, f = row.get("table"), row.get("field")
            for label, clause, text, check in (
                    ("a repeated table", "a repeated table",
                     f"[{t}]\n{f} = \"a\"\n\n[{t}]\n{f} = \"b\"\n", _failed("malformed-toml")),
                    ("a repeated field", "a repeated field",
                     f"[{t}]\n{f} = \"a\"\n{f} = 'b'\n", _failed("malformed-toml")),
                    ("an empty value", "a missing or empty value",
                     f"[{t}]\n{f} = \"\"\n", _failed("malformed-toml")),
                    ("no such table", "no such table",
                     f"[other]\n{f} = \"a\"\n", _failed("malformed-toml")),
                    ("an unquoted value", "a line in any other form",
                     f"[{t}]\n{f} = bare\n", _failed("malformed-toml")),
                    ("the field only in another table", "the field inside any other table, is not read",
                     f"[{t}]\n\n[other]\n{f} = \"a\"\n", _failed("malformed-toml")),
                    ("an array-of-tables header inside the table",
                     "neither opens a table nor ends the declared one",
                     f"[{t}]\n[[other]]\n{f} = \"a\"\n", _has_context("a")),
                    ("a single-quoted value", "field = 'value'",
                     f"[{t}]\n{f} = 'single'\n", _extracted),
                    ("an escaped quote", "a backslash escape in a double-quoted value is not decoded",
                     f"[{t}]\n{f} = \"a\\\"b\"\n", _has_context('a\\"b')),
                    ("a decomposed, padded value", "the value is trimmed and NFC-normalized",
                     f"[{t}]\n{f} = \" e\u0301 \"\n", _has_context("\u00e9"))):
                out.append((f"{shape}, row {i}: {label}", C, clause, file_case(i, text), check))
        K = ("row", i)
        if form == "leading-bold":
            out.append((f"itemKey leading-bold, row {i}: no bold span", K,
                        "an item with no non-empty leading bold span fails the source as ambiguous-leading-label",
                        row_case(i, items("plain item")), _failed("ambiguous-leading-label")))
            out.append((f"itemKey leading-bold, row {i}: whitespace collapses, no dash needed", K,
                        "whitespace runs collapsed",
                        row_case(i, items("**A  b** x")), _has_key("A b")))
            out.append((f"itemKey: a repeated key, row {i}", ("sourceGrammarSemantics", "itemKey"),
                        "a key that occurs twice within one class of one source fails the source as duplicate-key",
                        row_case(i, items("**A** x", "__A__ y")), _failed("duplicate-key")))
        elif form == "leading-bold-or-code":
            out.append((f"itemKey leading-bold-or-code, row {i}: no dash after the label", K,
                        "or the source fails as ambiguous-leading-label",
                        row_case(i, items("**A** no dash")), _failed("ambiguous-leading-label")))
            out.append((f"itemKey leading-bold-or-code, row {i}: a code-span label", K,
                        "or else its leading code span",
                        row_case(i, items(f"`a` {EM} x")), _has_key("a")))
            out.append((f"itemKey leading-bold-or-code, row {i}: an en dash", K, "en dash",
                        row_case(i, items(f"**A** {EN} x")), _has_key("A")))
        elif form == "first-cell-link-text":
            out.append((f"itemKey first-cell-link-text, row {i}: a plain first cell", K,
                        "must be one whole link",
                        row_case(i, "| A | B |\n|---|---|\n| plain | x |\n"), _failed("malformed-row")))
            out.append((f"itemKey first-cell-link-text, row {i}: empty link text", K,
                        "with non-empty text",
                        row_case(i, "| A | B |\n|---|---|\n| [](e.md) | x |\n"), _failed("malformed-row")))
            out.append((f"itemKey first-cell-link-text, row {i}: a single-quoted title", K,
                        "a title in double quotes",
                        row_case(i, "| A | B |\n|---|---|\n| [t](t.md 'x') | x |\n"),
                        _failed("malformed-row")))
            out.append((f"itemKey first-cell-link-text, row {i}: a double-quoted title", K,
                        "a title in double quotes",
                        row_case(i, "| A | B |\n|---|---|\n| [t](t.md \"x\") | x |\n"),
                        _has_key("t")))
            out.append((f"itemKey first-cell-link-text, row {i}: padded, decomposed link text", K,
                        "trimmed and NFC-normalized",
                        row_case(i, "| A | B |\n|---|---|\n| [ e\u0301 ](e.md) | x |\n"),
                        _has_key("\u00e9")))
        elif form == "ordinal-and-label":
            out.append((f"itemKey ordinal-and-label, row {i}: text after the bold span", K, "exactly one bold span",
                        file_case(i, "## 1 L\n\n| C | R |\n|---|---|\n| **A** extra | x |\n"),
                        _failed("malformed-row")))
        elif form == "link-target-basename":
            column = row.get("column", "")
            out.append((f"itemKey link-target-basename, row {i}: no such column", K, "a table with no such column",
                        row_case(i, "| Why | Other |\n|---|---|\n| a | [x.md](x.md) |\n"),
                        _failed("malformed-row")))
            out.append((f"itemKey link-target-basename, row {i}: a cell that is not a link", K,
                        "a cell in it that is not one whole link",
                        row_case(i, f"| Why | {column} |\n|---|---|\n| a | x.md |\n"),
                        _failed("malformed-row")))
        # headingMatch, per heading row.
        H = ("sourceGrammarSemantics", "headingMatch")
        headings = _row_headings(g, row)
        # Every entry of `headings` is probed, not only the first (round-3 F2).
        if shape in ("every-level-2-section", "ordinal-section-table-rows"):
            headings = []
        for h, (level, text) in enumerate(headings):
            name = row["class"] if len(headings) == 1 else f"{row['class']} heading {h + 1}"
            marks = "#" * (level or 2)
            line = f"{marks} {text}"

            def swap(new: str, line=line):
                return lambda body: body.replace(f"\n{line}\n", f"\n{new}\n", 1)
            if level is None:
                out.append((f"headingMatch: {name} at level 4", H,
                            "a heading object without a level matches at any level",
                            edit_case(i, swap(f"#### {text}")), _extracted))
            elif level < 6:
                out.append((f"headingMatch: {name} one level deeper", H,
                            "a declared heading matches only at its declared level",
                            edit_case(i, swap(f"{marks}# {text}")), _failed("missing-heading")))
            out.append((f"headingMatch: {name} missing", H,
                        "a declared heading that is missing fails the source as missing-heading",
                        edit_case(i, swap(f"{marks} Renamed {text}")), _failed("missing-heading")))
            out.append((f"headingMatch: {name} twice", H,
                        "one that occurs more than once fails it as duplicate-key",
                        edit_case(i, lambda body, line=line: body + f"\n{line}\n\nAgain.\n"),
                        _failed("duplicate-key")))
            if not done_heading and level is not None:
                done_heading = True
                out.append(("headingMatch: closing # marks", H, "without closing # marks",
                            edit_case(i, swap(f"{line} ##")), _extracted))
                out.append(("headingMatch: a heading inside a fence", H, "outside fenced code",
                            edit_case(i, swap(f"```\n{line}\n```")), _failed("missing-heading")))
                out.append(("headingMatch: an indented heading", H, "an indented line is never a heading",
                            edit_case(i, swap(f"   {line}")), _failed("missing-heading")))
    # containerShape: one failing class makes the whole source Unknown.
    w = Witness(g)
    multi = [(p, _classes_of(g, p)) for p in w.items if len(_classes_of(g, p)) > 1]
    if multi:
        path, classes = multi[0]
        heading_rows = [i for i, r in enumerate(grammar)
                        if w.slot_of.get(i) == path and _row_headings(g, r) and r.get("container") != "every-level-2-section"]
        if heading_rows:
            level, text = _row_headings(g, grammar[heading_rows[-1]])[0]
            body = w.files[path].replace(f"\n{'#' * (level or 2)} {text}\n", f"\n{'#' * (level or 2)} Gone\n", 1)
            out.append(("containerShape: one class fails, the source yields nothing",
                        ("sourceGrammarSemantics", "containerShape"),
                        "any class failing makes the whole source Unknown",
                        {"kind": "extract", "path": path, "classes": list(classes), "text": body},
                        lambda r: None if r.get("kind") == "unknown" else f"expected Unknown, observed {r.get('kind')}"))
    out.extend(_derive_probes(g))
    return out


def _classes_of(g: dict, path: str) -> tuple[str, ...]:
    for b in g["sourcePopulation"]["extractionBindings"]:
        if _binding_path(g, b) == path:
            return tuple(b["classes"])
    return ()


def _pillar(r: dict, key: str) -> tuple | None:
    if r.get("kind") != "manifest":
        return None
    return next((tuple(p[:5]) + (tuple(p[5]),) for p in r["pillars"] if p[0] == key), None)


def _derive_probes(g: dict) -> list[tuple]:
    out: list[tuple] = []
    pop = g["sourcePopulation"]
    root = g["rootIndex"]["path"]
    keys = [p["key"] for p in g["pillars"]]
    if not keys:
        return out
    L = ("rootIndex", "pillarRootLinks")
    S = ("sourceGrammarSemantics", "sharedReadingRules")
    home = posixpath.dirname(root)

    def files(edit) -> dict:
        w = Witness(g)
        edit(w.files)
        return {"kind": "derive", "files": w.files}

    def rel(path: str) -> str:
        return posixpath.relpath(path, home or ".")

    def links_only(f: dict) -> None:
        f[root] = "# Root\n\n" + "".join(
            f"- [{k}]({rel(f'{PILLAR_DIR}/{k}/README.md')})\n" if i % 2 == 0 else
            f"- [{k}]({rel(f'{PILLAR_DIR}/{k}')}/)\n" for i, k in enumerate(keys))

    out.append(("pillarRootLinks: links alone declare every root", L, "every link in the root index, wherever it stands in the file",
                files(links_only),
                lambda r: None if r.get("kind") == "manifest" and all(p[1] == "discovered" for p in r["pillars"])
                else f"expected every pillar discovered, observed {r.get('pillars')}"))
    first = keys[0]

    def ambiguous(f: dict) -> None:
        f[root] += f"\n[elsewhere]({rel(f'q/{first}/README.md')})\n"
    out.append(("pillarRootLinks: a link naming a second root", L, "make that pillar Unknown",
                files(ambiguous),
                lambda r: None if (_pillar(r, first) or ("",) * 2)[1:3] == ("unknown", "named-root-ambiguous")
                else f"expected {first} unknown named-root-ambiguous, observed {_pillar(r, first)}"))

    def ambiguous_before(f: dict) -> None:
        f[root] = f"[elsewhere]({rel(f'q/{first}/README.md')})\n\n" + f[root]
    out.append(("pillarRootLinks: a link before the table naming a second root", L,
                "wherever it stands in the file",
                files(ambiguous_before),
                lambda r: None if (_pillar(r, first) or ("",) * 2)[1:3] == ("unknown", "named-root-ambiguous")
                else f"expected {first} unknown named-root-ambiguous, observed {_pillar(r, first)}"))

    def short_row(f: dict) -> None:
        f[root] = f[root].replace(f"`{PILLAR_DIR}/{first}/` |", f"`{PILLAR_DIR}/{first}/` | extra |", 1)
    out.append(("sharedReadingRules: a root-table row with an extra cell", S,
                "a row with the wrong cell count or an unrecognised value is skipped",
                files(short_row),
                lambda r: None if (_pillar(r, first) or ("",) * 3)[2] == "not-named-in-root-index"
                else f"expected {first} not-named-in-root-index, observed {_pillar(r, first)}"))
    table = g["rootIndex"]["pillarRootTable"]

    def earlier_table(f: dict) -> None:
        f[root] = (f"| {table['pillarColumn']} | {table['directoryColumn']} |\n|---|---|\n"
                   f"| Nobody | `nowhere/` |\n\n") + f[root]
    out.append(("sharedReadingRules: an earlier pillar-root table", S,
                "only the first table carrying both pillar-root columns is read",
                files(earlier_table),
                lambda r: None if r.get("kind") == "manifest" and all(
                    p[2] == "not-named-in-root-index" for p in r["pillars"])
                else f"expected every pillar not-named-in-root-index, observed {r.get('pillars')}"))

    def no_root(f: dict) -> None:
        del f[root]
    tree_paths = {_instance(t["pathPattern"]) for t in pop["treePopulations"]}
    out.append(("sharedReadingRules: the root index missing", S,
                "whether or not the root index or any pillar index reads",
                files(no_root),
                lambda r: None if r.get("kind") == "manifest" and tree_paths <= {s[0] for s in r["sources"]}
                and all(p[2] == "root-index-missing-at-revision" for p in r["pillars"])
                else "expected every tree source present and every pillar root-index-missing-at-revision"))
    # A pillar declared at a tree population's top directory names a tree source.
    for n, t in enumerate(pop["treePopulations"][:len(keys)]):
        instance = _instance(t["pathPattern"])
        top = instance.split("/")[0]
        k = keys[-1 - n]

        def claim(f: dict, k=k, top=top, instance=instance) -> None:
            f[root] = f[root].replace(f"`{PILLAR_DIR}/{k}/`", f"`{top}/`", 1)
            f[f"{top}/README.md"] = f"# Index\n\n- [tree]({instance[len(top) + 1:]})\n"
        out.append((f"sharedReadingRules: a pillar index naming {t['rule']}", S,
                    "is read by its tree population even when a pillar index names it",
                    files(claim),
                    lambda r, instance=instance, rule=t["rule"]: None if r.get("kind") == "manifest" and any(
                        s[0] == instance and s[1] == rule for s in r["sources"])
                    else f"expected {instance} under {rule}"))
    base = f"{PILLAR_DIR}/{first}"
    index = f"{base}/{pop['pillarIndexBasename']}"
    grammar_block = (
        "\n[ref]: ref.md\n![img](img.md)\n`[code](code.md)`\n```\n[fenced](fenced.md)\n```\n"
        "[ext](https://example.com/x.md)\n[up](../../../../../../x.md)\n[out](../other/x.md)\n"
        f"[dir](sub/)\n[self]({pop['pillarIndexBasename']})\n[frag](frag.md#part)\n")

    def link_grammar(f: dict) -> None:
        f[index] += grammar_block

    def named(r: dict) -> set[str]:
        return {s[0] for s in r.get("sources") or [] if s[2] == first}
    expected_ignored = ("external", "escapes-repository", "outside-pillar-root", "names-a-directory", "self")
    for clause, check in (
            ("a reference definition", lambda r: f"{base}/ref.md" in named(r)),
            ("images excluded", lambda r: f"{base}/img.md" not in named(r)),
            ("outside fenced code and code spans",
             lambda r: not {f"{base}/code.md", f"{base}/fenced.md"} & named(r)),
            ("the fragment and query dropped", lambda r: f"{base}/frag.md" in named(r)),
            ("ignores and records a link that is external, escapes the repository, leaves the pillar "
             "root, names a directory or names the index itself",
             lambda r: (_pillar(r, first) or ((),) * 6)[5] == expected_ignored),
            ("a named file that is missing or is not a blob at the revision stays in the population",
             lambda r: any(s[0] == f"{base}/ref.md" and s[4] == "missing-at-revision"
                           for s in r.get("sources") or []))):
        out.append((f"sharedReadingRules: index link grammar, {clause}", S, clause, files(link_grammar),
                    lambda r, check=check, clause=clause: None if r.get("kind") == "manifest" and check(r)
                    else f"the index link grammar does not hold: {clause}"))
    return out


def behaviour_findings(body: bytes, runner=run_node) -> list[str]:
    g = _entry(json.loads(body))["observationGrammar"]
    w = Witness(g)
    findings = [f"witness: {p}" for p in w.problems]
    findings += [f"witness: no item-key form is stated for {row.get('class')}; its keys cannot be "
                 f"predicted" for row in g["classGrammar"] if _form(row)[0] == "unknown"]
    if findings:
        return findings
    extracts = [(path, _classes_of(g, path)) for path in sorted(w.items)]
    cases = [{"kind": "derive", "files": w.files}] + [
        {"kind": "extract", "path": path, "classes": list(classes), "text": w.files[path]}
        for path, classes in extracts]
    try:
        checks = probes(g)
    except (KeyError, StopIteration, TypeError, AttributeError) as error:
        return [f"witness: the probes cannot be built from the profile: {error!r}"]
    results = runner(cases + [case for *_x, case, _c in checks])
    manifest = _as_manifest(results[0])
    predicted = _manifest_prediction(w)
    for key in ("indexDepth", "rootIndex", "pillars", "sources"):
        if manifest.get(key) != predicted[key]:
            findings.append(f"witness manifest {key}: the observer derived {manifest.get(key, manifest)}; "
                            f"the profile predicts {predicted[key]}")
    for (path, _classes), result in zip(extracts, results[1:1 + len(extracts)]):
        findings.extend(_item_findings(path, w.items[path], result))
    for (label, where, clause, _case, check), result in zip(checks, results[1 + len(extracts):]):
        if clause not in _sentence(g, where):
            findings.append(f"probe {label}: the {'.'.join(map(str, where))} sentence does not state "
                            f"{clause!r}, which the code does")
        problem = check(result)
        if problem:
            findings.append(f"probe {label}: {problem}")
    return findings


# ---------------------------------------------------------------------
# Manifest, population, composition.

def render(body: bytes) -> str:
    lines = [
        f"# {TITLE}",
        "# This row binds only by the owner act that takes its digest as the",
        "# argument of a superseding adopt-registry-entry act; until that act is",
        "# performed it binds nothing.",
        "# 1 artifact; the row hashes the PROPOSED bytes: the subject with the",
        "# syzygy-dov.18 patch (unless already adopted or superseded by a",
        "# performed act) and then proposed/*.patch",
        "# applied. It matches the tree only after --apply, the adoption step.",
        "# The subject's current bytes stay the argument of the act in force.",
        f"{sha256(body)}  {SUBJECT.as_posix()}",
    ]
    return "\n".join(lines) + "\n"


def manifest_findings(text: str | None, expected: str) -> list[str]:
    if text is None:
        return [f"manifest missing: {OUT.as_posix()}"]
    rows = ROW.findall(text)
    if [path for _d, path in rows] != [SUBJECT.as_posix()]:
        return ["manifest row population or path differs"]
    if text != expected:
        return ["manifest differs from exact regeneration over the proposed bytes"]
    return []


def patch_population_findings(patches: list[pathlib.Path]) -> list[str]:
    if [p.name for p in patches] != [f"{SUBJECT.name}.patch"]:
        return ["proposed/*.patch population is not the single declared subject "
                "patch: " + ", ".join(p.name for p in patches)]
    return []


def noop_findings(proposed: bytes, base: bytes) -> list[str]:
    if proposed == base:
        return [f"the proposed patch changes nothing: {SUBJECT.as_posix()}"]
    return []


def composition_findings(root: pathlib.Path | None = None) -> list[str]:
    """No undeclared candidate patches the same subject (`.18`, this one and DECLARED_SIBLINGS are declared)."""
    root = ROOT if root is None else root
    allowed = {PRIOR.as_posix(), CANDIDATE.as_posix(),
               *(p.as_posix() for p in DECLARED_SIBLINGS)}
    findings = []
    for patch in sorted((root / CANDIDATES).glob(f"*/proposed/{SUBJECT.name}.patch")):
        package = patch.parent.parent.relative_to(root).as_posix()
        if package not in allowed:
            findings.append(
                f"undeclared sibling patches the same subject: {package}; ask "
                "which act goes first (an owner question) and rebase before either act")
    return findings


def check() -> list[str]:
    findings: list[str] = []
    findings.extend(patch_population_findings(patch_files()))
    findings.extend(composition_findings())
    try:
        base, _state = base_bytes()
        proposed = proposed_bytes()
    except ValueError as error:
        return findings + [str(error)]
    findings.extend(noop_findings(proposed, base))
    findings.extend(unchanged_findings(proposed, base))
    findings.extend(byte_findings(proposed, base))
    structural = structure_findings(proposed)
    findings.extend(structural)
    if not structural:
        findings.extend(spec_findings(proposed, (ROOT / SPEC).read_text()))
        try:
            findings.extend(code_findings(proposed))
            findings.extend(behaviour_findings(proposed))
        except ValueError as error:
            findings.append(str(error))
    target = ROOT / OUT
    findings.extend(manifest_findings(
        target.read_text() if target.is_file() else None, render(proposed)))
    return findings


# ---------------------------------------------------------------------
# Rule 6: every predicate above is mutated and must fail closed.

def selftest() -> int:
    findings = check()
    if findings:
        print("SELFTEST FAILED: the package does not verify on current bytes")
        for finding in findings:
            print(f"  {finding}")
        return 1
    base, _ = base_bytes()
    proposed = proposed_bytes()
    baseline = render(proposed)
    spec_text = (ROOT / SPEC).read_text()
    failures: list[str] = []
    count = 0

    def expect(label: str, got: list[str]) -> None:
        nonlocal count
        count += 1
        if not got:
            failures.append(label)

    def mutate(fn) -> bytes:
        doc = json.loads(proposed)
        fn(doc)
        return json.dumps(doc, indent=2).encode()

    def g(doc):
        return doc["entries"][0]["observationGrammar"]

    # Base-state composition. The drift sits on a line inside the first hunk's
    # context in every state (the `.18` patch's and this one's), so it holds
    # whether `.18` is pending, `.18` is adopted or this package is adopted.
    current = current_bytes()
    drifted = current.replace(b'"project": "project:syzygy"', b'"project": "project:other"', 1)
    assert drifted != current
    try:
        proposed_bytes(drifted)
    except ValueError:
        count += 1
    else:
        failures.append("the patches applied over drifted subject bytes")
    # Drift outside every hunk's context may still apply; the manifest catches it.
    distant = current.replace(b'"maxSources": 512', b'"maxSources": 513', 1)
    assert distant != current
    try:
        expect("subject drift outside the patch context",
               manifest_findings(baseline, render(proposed_bytes(distant))))
    except ValueError:
        count += 1
    # This package adopted: the base comes back by reversing the patch.
    recovered, state = base_bytes(override=proposed, own_digest=sha256(proposed))
    count += 1
    if recovered != base or state != ADOPTED:
        failures.append("an adopted state of this package was not recognised")
    count += 1
    if proposed_bytes(proposed, own_digest=sha256(proposed)) != proposed:
        failures.append("the adopted state does not reproduce the proposed bytes")
    try:
        base_bytes(prior_digest=None, prior_patch=ROOT / PRIOR / "absent.patch", own_digest=None,
                   performed=[])
    except ValueError:
        count += 1
    else:
        failures.append("an absent, unadopted .18 package passed")
    superseded, state = base_bytes(override=base, prior_digest=None, own_digest=None,
                                   performed=[sha256(base)])
    count += 1
    if superseded != base or "superseded by a performed act" not in state:
        failures.append("a performed successor's state was not recognised")
    try:
        base_bytes(override=base, prior_digest=None, own_digest=None,
                   prior_patch=ROOT / PRIOR / "absent.patch", performed=["0" * 64])
    except ValueError:
        count += 1
    else:
        failures.append("a performed-successor row that names other bytes passed")
    # Round-5 notes 7 and 8: a successor row counts only for this subject's
    # path and only when the acceptance-act record quotes it.
    real = sha256(base)
    good = {"m": f"{real}  {SUBJECT.as_posix()}\n"}
    count += 1
    if performed_rows(good, f"ADOPT X: {real}") != [real]:
        failures.append("a recorded performed-successor row was not read")
    count += 1
    if performed_rows({"m": f"{real}  OTHER.json\n"}, f"ADOPT X: {real}"):
        failures.append("a performed-successor row for another path counted")
    count += 1
    if performed_rows(good, "no such digest recorded"):
        failures.append("an unrecorded performed-successor row counted")
    # Note 7: --apply may write only in the two applied-.18 states, exactly.
    for state, allowed in ((PRIOR_ADOPTED, True), (SUPERSEDED, True), (PENDING, False),
                           (ADOPTED, False), (".18 adopted-ish: forged", False)):
        count += 1
        if (apply_refusal(state) is None) != allowed:
            failures.append(f"--apply's gate misjudged the state {state!r}")
    adopted, state = base_bytes(override=base, prior_digest=sha256(base))
    count += 1
    if adopted != base or state != PRIOR_ADOPTED:
        failures.append("an adopted .18 state was not recognised")
    try:
        prior_row("# header only\n")
    except ValueError:
        count += 1
    else:
        failures.append("a .18 manifest with no row passed")

    with tempfile.TemporaryDirectory() as scratch:
        broken = pathlib.Path(scratch) / "broken.patch"
        original = (ROOT / PROPOSED / f"{SUBJECT.name}.patch").read_text()
        corrupted = original.replace(f'-  "registryVersion": "{BASE_VERSION}"',
                                     '-  "registryVersion": "1.2.0-candidate.9"', 1)
        assert corrupted != original
        broken.write_text(corrupted)
        try:
            _apply(base, [broken], "corrupted")
        except ValueError:
            count += 1
        else:
            failures.append("a corrupted patch applied")

    # Manifest.
    rows = ROW.findall(baseline)
    flipped = "0" * 64 if rows[0][0] != "0" * 64 else "1" * 64
    expect("a manifest digest mutation", manifest_findings(
        baseline.replace(rows[0][0], flipped, 1), baseline))
    expect("a manifest path mutation", manifest_findings(
        baseline.replace(SUBJECT.as_posix(), "OTHER.json", 1), baseline))
    expect("an absent manifest", manifest_findings(None, baseline))
    expect("a second patch under proposed/", patch_population_findings(
        patch_files() + [pathlib.Path("SECOND.patch")]))
    expect("a patch that changes nothing", noop_findings(base, base))

    # Composition: an undeclared third package patching the subject.
    with tempfile.TemporaryDirectory() as scratch:
        root = pathlib.Path(scratch)
        for pkg in (PRIOR, CANDIDATE, CANDIDATES / "some-other-package"):
            (root / pkg / "proposed").mkdir(parents=True)
            (root / pkg / "proposed" / f"{SUBJECT.name}.patch").write_text("")
        expect("an undeclared sibling patching the subject",
               composition_findings(root))
        (root / CANDIDATES / "some-other-package" / "proposed" /
         f"{SUBJECT.name}.patch").unlink()
        count += 1
        if composition_findings(root):
            failures.append("the declared pair alone was flagged")

    # Nothing else moves.
    unchanged_mutants = (
        ("a changed top-level field", lambda d: d.__setitem__("status", "adopted")),
        ("a changed entry field", lambda d: d["entries"][0].__setitem__(
            "discoveryVersion", "pwb-discovery-v3")),
        ("a changed bound grammar key", lambda d: g(d)["fixedCatalogKeys"].append("Extra")),
        ("a changed resource limit", lambda d: d["entries"][0]["resourceLimits"].__setitem__(
            "maxSources", 1)),
        ("a grammar key added outside the declared set",
         lambda d: g(d).__setitem__("extra", {})),
    )
    for label, fn in unchanged_mutants:
        expect(label, unchanged_findings(mutate(fn), base))
    reordered = json.loads(proposed)
    grammar = g(reordered)
    moved = {k: grammar[k] for k in reversed(list(grammar))}
    reordered["entries"][0]["observationGrammar"] = moved
    expect("reordered grammar keys",
           unchanged_findings(json.dumps(reordered).encode(), base))

    # Bytes outside the hunks (round-3 F1). The first three leave every parsed
    # value identical to the proposed one, so only the byte check can see them.
    text = proposed.decode()
    reserialized = json.dumps(json.loads(proposed), indent=2).encode() + b"\n"
    byte_mutants = (
        ("a re-serialized document (reflowed array, escaped em dash)", reserialized),
        ("one em dash escaped", text.replace("\u2014", "\\u2014", 1).encode()),
        ("one array reflowed", text.replace(
            '"questions": ["What currently exists?"],',
            '"questions": [\n          "What currently exists?"\n        ],', 1).encode()),
        ("an unbumped version line", text.replace(
            f'"observerVersion": "{PROPOSED_VERSION}"',
            f'"observerVersion": "{BASE_VERSION}"', 1).encode()),
        ("a second inserted block", text.replace(
            '      "role": "adapter",\n', '      "note": "x",\n      "role": "adapter",\n', 1).encode()),
    )
    for label, body in byte_mutants:
        count += 1
        if body == proposed:
            failures.append(f"byte mutant did not apply: {label}")
        elif not byte_findings(body, base):
            failures.append(label)

    # Structure.
    expect("invalid JSON", structure_findings(proposed + b"}"))
    structural_mutants = (
        ("an unbumped registryVersion", lambda d: d.__setitem__("registryVersion", BASE_VERSION)),
        ("an unbumped observerVersion",
         lambda d: d["entries"][0].__setitem__("observerVersion", BASE_VERSION)),
        ("a second entry", lambda d: d["entries"].append(dict(d["entries"][0]))),
        ("a grammar that is not an object",
         lambda d: d["entries"][0].__setitem__("observationGrammar", [])),
        ("empty pillars", lambda d: g(d).__setitem__("pillars", [])),
        ("a pillar row with an extra key", lambda d: g(d)["pillars"][0].__setitem__("x", 1)),
        ("a duplicated pillar key", lambda d: g(d)["pillars"][1].__setitem__(
            "key", "heart-and-soul")),
        ("an absent root index path", lambda d: g(d)["rootIndex"].pop("path")),
        ("a population that is not an object", lambda d: g(d).__setitem__("sourcePopulation", [])),
        ("a zero index chain depth",
         lambda d: g(d)["sourcePopulation"].__setitem__("indexChainDepth", 0)),
        ("empty tree populations",
         lambda d: g(d)["sourcePopulation"].__setitem__("treePopulations", [])),
        ("a tree population naming an undeclared rule",
         lambda d: g(d)["sourcePopulation"]["treePopulations"][0].__setitem__("rule", "x")),
        ("a tree pattern without <key>",
         lambda d: g(d)["sourcePopulation"]["treePopulations"][0].__setitem__(
             "pathPattern", "openspec/specs/spec.md")),
        ("a binding naming an undeclared rule",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][0].__setitem__("rule", "x")),
        ("a binding naming an undeclared pillar",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][0].__setitem__("pillar", "x")),
        ("a binding naming an undeclared class",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][0]["classes"].append("x")),
        ("a class no binding reads",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"].pop()),
        ("empty container shapes", lambda d: g(d).__setitem__("containerShapes", {})),
        ("a container shape without a sentence",
         lambda d: g(d)["containerShapes"].__setitem__("tree-path", " ")),
        ("a container shape never used",
         lambda d: g(d)["containerShapes"].__setitem__("unused-shape", "never read")),
        ("empty class grammar", lambda d: g(d).__setitem__("classGrammar", [])),
        ("a grammar row that is not an object", lambda d: g(d)["classGrammar"].append("x")),
        ("a grammar row naming an undeclared class",
         lambda d: g(d)["classGrammar"][6].__setitem__("class", "x")),
        ("a grammar row naming an undeclared shape",
         lambda d: g(d)["classGrammar"][6].__setitem__("container", "prose")),
        ("a grammar row without an item key",
         lambda d: g(d)["classGrammar"][6].pop("itemKey")),
        ("a heading without text",
         lambda d: g(d)["classGrammar"][0]["heading"].__setitem__("text", "")),
        ("a heading level out of range",
         lambda d: g(d)["classGrammar"][0]["heading"].__setitem__("level", 7)),
        ("a class no grammar row reads",
         lambda d: g(d).__setitem__("classGrammar", [
             r for r in g(d)["classGrammar"] if r["class"] != "roster-identity"])),
        ("project-account rows out of key order",
         lambda d: g(d)["classGrammar"].insert(0, g(d)["classGrammar"].pop(1))),
        ("renamed semantics key",
         lambda d: g(d).__setitem__("sourceGrammarSemantics", {
             ("scopes" if k == "scope" else k): v
             for k, v in g(d)["sourceGrammarSemantics"].items()})),
        ("an empty semantics sentence",
         lambda d: g(d)["sourceGrammarSemantics"].__setitem__("missingField", "")),
    )
    assert not structure_findings(proposed)
    for label, fn in structural_mutants:
        expect(label, structure_findings(mutate(fn)))

    # The reviewer's round-1 mutants (R-DOV24 raw, M1-M18; M8's field is gone).
    # The ones below the line must fall to the behaviour witness alone, since
    # structure_findings passes them.
    def row(d, cls, source=None):
        return next(r for r in g(d)["classGrammar"]
                    if r["class"] == cls and source in (None, r.get("source")))

    def swap_headings(d):
        a, b_ = row(d, "project-account-section"), g(d)["classGrammar"][2]
        a["heading"]["text"], b_["heading"]["text"] = b_["heading"]["text"], a["heading"]["text"]

    def label_swap(d):
        ps = g(d)["pillars"]
        ps[0]["label"], ps[1]["label"] = ps[1]["label"], ps[0]["label"]
    structural_only = (
        ("M5 principle source vision.md -> v1.md",
         lambda d: row(d, "principle").__setitem__("source", "v1.md")),
        ("M11 pillarIndexBasename -> INDEX.md",
         lambda d: g(d)["sourcePopulation"].__setitem__("pillarIndexBasename", "INDEX.md")),
        ("M12 pillar-index binding relativePath -> INDEX.md",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][0].__setitem__(
             "relativePath", "INDEX.md")),
        ("M13 baseline binding relativePath -> SPEC.md",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][6].__setitem__(
             "relativePath", "SPEC.md")),
        ("M15 a container-shape sentence rewritten",
         lambda d: g(d)["containerShapes"].__setitem__("tree-path", "the path")),
        ("a pinned item-key sentence rewritten",
         lambda d: row(d, "principle").__setitem__("itemKey", "the item's label")),
        ("a pinned semantics sentence rewritten",
         lambda d: g(d)["sourceGrammarSemantics"].__setitem__("scope", "restates the grammar")),
        ("the pinned pillar-root link sentence rewritten",
         lambda d: g(d)["rootIndex"].__setitem__("pillarRootLinks", "links count")),
        ("a tree population with an extra key",
         lambda d: g(d)["sourcePopulation"]["treePopulations"][0].__setitem__("x", True)),
        ("a heading object with both text and textsFrom",
         lambda d: row(d, "catalog-entry")["heading"].__setitem__("text", "Staffers")),
        ("textsFrom naming an unknown list",
         lambda d: row(d, "catalog-entry")["heading"].__setitem__("textsFrom", "x")),
        # The round-2 reviewer's field mutants (R-DOV24 round 2, D1): a field
        # the row's shape and key form do not read.
        ("X4 design-contract gains column Path",
         lambda d: row(d, "design-contract").__setitem__("column", "Path")),
        ("X5 architecture gains heading Non-Negotiable Rules",
         lambda d: row(d, "project-account-section", "architecture.md").__setitem__(
             "heading", {"level": 2, "text": "Non-Negotiable Rules"})),
        ("X6 principle gains table and field",
         lambda d: row(d, "principle").update({"table": "x", "field": "y"})),
        ("a list row declaring headings",
         lambda d: row(d, "principle").__setitem__("headings", [row(d, "principle").pop("heading")])),
        ("a row with both heading and headings",
         lambda d: row(d, "project-account-section").__setitem__(
             "headings", [{"level": 2, "text": "What Butlers Is"}])),
        ("a fixed-key row without its key",
         lambda d: row(d, "project-account-section").pop("key")),
        ("a craft row without its column", lambda d: row(d, "craft-policy").pop("column")),
        ("a roster row without its table", lambda d: row(d, "roster-identity").pop("table")),
        ("a list row without its heading", lambda d: row(d, "principle").pop("heading")),
        ("a grammar row matching two bindings",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"].append(
             dict(g(d)["sourcePopulation"]["extractionBindings"][2]))),
    )
    structural_only += (
        # The round-3 reviewer's survivors (R-DOV24 round 3, N1 and N2).
        ("A44 pillarRootTable gains a key",
         lambda d: g(d)["rootIndex"]["pillarRootTable"].__setitem__("x", "y")),
        ("A46 the first extraction binding gains a key",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][0].__setitem__("x", 1)),
        ("B7 a later extraction binding gains a key",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][5].__setitem__("x", 1)),
        ("A47 sourcePopulation gains a key",
         lambda d: g(d)["sourcePopulation"].__setitem__("x", 1)),
        ("A18 a redundant pillar on principle",
         lambda d: row(d, "principle").__setitem__("pillar", "heart-and-soul")),
        ("a shared-source row without its pillar",
         lambda d: row(d, "craft-policy").pop("pillar")),
        ("A60 roster field padded",
         lambda d: row(d, "roster-identity").__setitem__("field", "name ")),
        ("a roster table padded",
         lambda d: row(d, "roster-identity").__setitem__("table", " butler")),
    )
    for label, fn in structural_only:
        expect(label, structure_findings(mutate(fn)))
    behavioural = (
        ("M1 purpose and refusals heading texts swapped", swap_headings),
        # Round 3, F2: the second heading of a two-heading row is probed too.
        ("A4 v1-scope second heading level deleted",
         lambda d: next(r for r in g(d)["classGrammar"] if r.get("key") == "v1-scope")[
             "headings"][1].pop("level")),
        ("M2 principle heading level 2 -> 3",
         lambda d: row(d, "principle")["heading"].__setitem__("level", 3)),
        ("M3 catalog heading level 3 -> 2",
         lambda d: row(d, "catalog-entry")["heading"].__setitem__("level", 2)),
        ("M4 principle container -> top-level-list",
         lambda d: row(d, "principle").__setitem__("container", "top-level-list")),
        ("M6 craft column File -> Path",
         lambda d: row(d, "craft-policy").__setitem__("column", "Path")),
        ("M7 roster field name -> id", lambda d: row(d, "roster-identity").__setitem__("field", "id")),
        ("M9 roster companion dropped",
         lambda d: g(d)["sourcePopulation"]["treePopulations"][1].__setitem__("companions", [])),
        ("M10 pillarRootTable directoryColumn -> Dir",
         lambda d: g(d)["rootIndex"]["pillarRootTable"].__setitem__("directoryColumn", "Dir")),
        ("M14 success-criterion v1 itemKey prefix vision:",
         lambda d: row(d, "success-criterion", "v1.md").__setitem__(
             "itemKey", "vision:<one-based ordinal>")),
        ("M16 design-contract heading gets level 1",
         lambda d: row(d, "design-contract")["heading"].__setitem__("level", 1)),
        ("M17 purpose heading -> Non-Negotiable Rules",
         lambda d: row(d, "project-account-section")["heading"].__setitem__(
             "text", "Non-Negotiable Rules")),
        ("M18 two pillar labels swapped", label_swap),
        ("a heading the code does not carry",
         lambda d: g(d)["classGrammar"][7]["heading"].__setitem__("text", "What Winning Looks Like")),
        ("a roster table the code does not read",
         lambda d: row(d, "roster-identity").__setitem__("table", "agent")),
        ("a pillar root table column the code does not read",
         lambda d: g(d)["rootIndex"]["pillarRootTable"].__setitem__("pillarColumn", "Area")),
        ("an index chain depth the code does not use",
         lambda d: g(d)["sourcePopulation"].__setitem__("indexChainDepth", 4)),
        ("a tree pattern the code does not use",
         lambda d: g(d)["sourcePopulation"]["treePopulations"][0].__setitem__(
             "pathPattern", "specs/<key>/spec.md")),
        ("a class moved to a binding the code does not make",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][3]["classes"].__setitem__(
             0, "principle")),
        # The round-2 reviewer's per-row mutants (R-DOV24 round 2, D1): each
        # row is probed as its own shape and key form, and its keys predicted
        # from its own form.
        ("N2 vision success-criterion container -> top-level-decimal-list",
         lambda d: row(d, "success-criterion", "vision.md").__setitem__(
             "container", "top-level-decimal-list")),
        ("N3 v1 success-criterion container -> top-level-decimal-list",
         lambda d: row(d, "success-criterion", "v1.md").__setitem__(
             "container", "top-level-decimal-list")),
        ("N17 catalog itemKey -> the leading-bold sentence",
         lambda d: row(d, "catalog-entry").__setitem__(
             "itemKey", ITEM_KEY_SENTENCES["leading-bold"])),
        ("N22 roster itemKey -> the fixed key",
         lambda d: row(d, "roster-identity").__setitem__("itemKey", "the fixed key")),
        ("X3 baseline itemKey -> the fixed key",
         lambda d: row(d, "baseline-spec").__setitem__("itemKey", "the fixed key")),
        ("principle itemKey -> the leading-bold-or-code sentence",
         lambda d: row(d, "principle").__setitem__(
             "itemKey", ITEM_KEY_SENTENCES["leading-bold-or-code"])),
        ("design itemKey -> the link-target-basename sentence",
         lambda d: row(d, "design-contract").__setitem__(
             "itemKey", ITEM_KEY_SENTENCES["link-target-basename"])),
        ("topology itemKey -> the tree-key sentence",
         lambda d: row(d, "topology-component").__setitem__(
             "itemKey", ITEM_KEY_SENTENCES["tree-key"])),
        # The unpinned-sentence path: each clause a probe exercises must be stated.
        ("a heading rule dropping the column-0 clause",
         lambda d: g(d)["sourceGrammarSemantics"].__setitem__("headingMatch", SEMANTICS[
             "headingMatch"].replace(", so an indented line is never a heading", ""))),
        ("a TOML shape sentence dropping the undecoded-escape clause",
         lambda d: g(d)["containerShapes"].__setitem__("toml-table-field", SHAPES[
             "toml-table-field"].replace("a backslash escape in a double-quoted value is not "
                                         "decoded, and ", ""))),
        ("a design key sentence dropping trimming and normalization",
         lambda d: row(d, "design-contract").__setitem__("itemKey", ITEM_KEY_SENTENCES[
             "first-cell-link-text"].replace("trimmed and NFC-normalized; the cell", "the cell"))),
        ("a shape sentence dropping a clause a probe exercises",
         lambda d: g(d)["containerShapes"].__setitem__("top-level-bulleted-list", SHAPES[
             "top-level-bulleted-list"].replace("yields no items and does not fail", "fails"))),
        ("a shared reading rule dropped",
         lambda d: g(d)["sourceGrammarSemantics"].__setitem__("sharedReadingRules", SEMANTICS[
             "sharedReadingRules"].replace("images excluded, ", ""))),
        ("an item-key sentence dropping a clause a probe exercises",
         lambda d: row(d, "catalog-entry").__setitem__("itemKey", ITEM_KEY_SENTENCES[
             "leading-bold-or-code"].replace(", or else its leading code span", ""))),
    )
    for label, fn in behavioural:
        expect(label, behaviour_findings(mutate(fn)))
    # Every case's check must reject an outcome the code did not produce.
    recorded: list[dict] = []
    behaviour_findings(proposed, runner=lambda cases: recorded.extend(run_node(cases)) or recorded)
    for index in range(len(recorded)):
        forged = list(recorded)
        forged[index] = {"kind": "forged", "reason": "forged"}
        expect(f"behaviour case {index} given a forged outcome",
               behaviour_findings(proposed, runner=lambda cases, forged=forged: forged))
    expect("an item statement the code does not produce", behaviour_findings(
        proposed, runner=lambda cases: [recorded[0]] + [
            {"kind": "extracted", "items": [[i[0], i[1], "x", i[3]] for i in r["items"]]}
            if r.get("kind") == "extracted" else r for r in recorded[1:]]))
    try:
        behaviour_findings(proposed, runner=lambda cases: (_ for _ in ()).throw(
            ValueError("node not found")))
    except ValueError:
        count += 1
    else:
        failures.append("a missing Node passed")

    # Witness 1: the specification's reader definitions.
    expect("a heading literal the specification does not carry",
           spec_findings(mutate(lambda d: g(d)["classGrammar"][0]["heading"].__setitem__(
               "text", "What Syzygy Is")), spec_text))
    expect("a catalog key the specification does not carry",
           spec_findings(mutate(lambda d: g(d)["fixedCatalogKeys"].__setitem__(
               0, "Core Plumbing")), spec_text))
    try:
        reader_definitions("no block here")
    except ValueError:
        count += 1
    else:
        failures.append("a specification with no reader-definitions block passed")

    # Witness 2: the code constants.
    code_mutants = (
        ("a root index path the code does not use",
         lambda d: g(d)["rootIndex"].__setitem__("path", "docs/README.md")),
        ("an index chain depth the code does not use",
         lambda d: g(d)["sourcePopulation"].__setitem__("indexChainDepth", 4)),
        ("a pillar label the code does not use",
         lambda d: g(d)["pillars"][0].__setitem__("label", "Heart & Soul")),
        ("reordered pillars", lambda d: g(d)["pillars"].reverse()),
        ("a binding the code does not make",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][3].__setitem__(
             "relativePath", "design.md")),
        ("a binding with a class the code does not assign",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][3]["classes"].append(
             "principle")),
        ("a pillar-index binding the code does not make",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][0].__setitem__(
             "pillar", "lay-and-land")),
        ("a roster binding the code does not make",
         lambda d: g(d)["sourcePopulation"]["extractionBindings"][7].__setitem__(
             "relativePath", "roster.toml")),
        ("a tree pattern the code does not use",
         lambda d: g(d)["sourcePopulation"]["treePopulations"][0].__setitem__(
             "pathPattern", "specs/<key>/spec.md")),
        ("reordered source rules",
         lambda d: g(d)["sourcePopulation"]["sourceRules"].reverse()),
    )
    for label, fn in code_mutants:
        expect(label, code_findings(mutate(fn)))
    try:
        code_findings(proposed, reader=lambda name: (_ for _ in ()).throw(
            ValueError(f"missing {name}")))
    except ValueError:
        count += 1
    else:
        failures.append("a missing constants file passed")

    if failures:
        print("SELFTEST FAILED: these mutants passed:")
        for label in failures:
            print(f"  {label}")
        return 1
    print(f"selftest: {count} predicates — base-state composition (.18 pending, "
          ".18 adopted and superseded by a recorded performed act, path and record filters, the exact --apply gate, "
          ".18 adopted, this package adopted, .18 absent, subject drift, patch "
          "corruption), manifest digest, path and absence, patch population, a "
          "no-op patch, an undeclared sibling, nothing-else-moves, bytes outside "
          "the permitted hunks, every "
          "structural claim and pinned sentence, the reviewer's round-1 mutants and "
          "round-2 per-row shape, key-form and field mutants, the round-3 "
          "second-heading, extra-key, pillar and bare-key mutants, "
          "a forged outcome for every behaviour case, and all three restatement "
          "witnesses (the specification's reader definitions, the code constants "
          "and the observer's own code run over profile-built files) all fail closed")
    return 0


def apply_refusal(state: str) -> str | None:
    """Why `--apply` refuses in this base state, or None when it may write.

    Only the two applied-`.18` states may apply; the comparison is exact, never
    by prefix (round-5 note 7).
    """
    if state == ADOPTED:
        return "refusing to apply: the subject already carries this package's bytes"
    if state not in APPLICABLE:
        return ("refusing to apply: the .18 act has not been applied; this diff is "
                "drafted on .18's bytes or a performed successor's")
    return None


def apply(at_adoption: bool) -> int:
    if not at_adoption:
        print("refusing: --apply writes the proposed bytes over an artifact a "
              "performed act still binds; it is the adoption step. Pass --at-adoption.")
        return 2
    findings = check()
    if findings:
        print("refusing to apply: the package does not verify")
        for finding in findings:
            print(f"  {finding}")
        return 1
    _base, state = base_bytes()
    refusal = apply_refusal(state)
    if refusal:
        print(refusal)
        return 1
    (ROOT / SUBJECT).write_bytes(proposed_bytes())
    print(f"applied {SUBJECT.as_posix()}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--at-adoption", action="store_true")
    parser.add_argument("--diff", action="store_true",
                        help="print the proposed diff and exit")
    parser.add_argument("--write", action="store_true",
                        help="regenerate the manifest (changes the act argument)")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.diff:
        for patch in patch_files():
            sys.stdout.write(patch.read_text())
        return 0
    if args.apply:
        return apply(args.at_adoption)
    if args.check:
        findings = check()
        if findings:
            print("PWB registry loaded-profile amendment does not verify:")
            for finding in findings:
                print(f"  {finding}")
            return 1
        _base, state = base_bytes()
        doc = json.loads(proposed_bytes())
        grammar = _entry(doc)["observationGrammar"]
        print(f"PWB registry loaded-profile amendment manifest matches the 1 "
              f"proposed subject ({state}); {len(ADDED_GRAMMAR_KEYS)} grammar keys "
              f"added, {len(grammar['classGrammar'])} class-grammar rows, "
              f"{len(grammar['containerShapes'])} container shapes, "
              f"{len(grammar['sourcePopulation']['extractionBindings'])} extraction "
              f"bindings; the 6 bound grammar keys and every other field unchanged; "
              f"every literal found in the specification and the code constants; "
              f"the observer's code reads the profile-built files as the profile says")
        return 0
    if not args.write:
        print("refusing: regenerating the manifest changes the act argument; pass --write")
        return 2
    target = ROOT / OUT
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(render(proposed_bytes()))
    print(f"wrote {OUT.as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
