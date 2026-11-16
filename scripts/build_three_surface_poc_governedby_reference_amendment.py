#!/usr/bin/env python3
"""P-115 candidate preparation only: virtual patches, dependency union and evidence.

--check writes nothing. --write updates only the candidate manifest and sweep.
--selftest mutates the preparation predicates and runs independent literal cases.
No adoption/apply/record path or product implementation lives in this script.
"""
from __future__ import annotations

import argparse
import copy
import datetime
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import tarfile

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_three_surface_poc_spec_dependencies as dependencies

ROOT = Path(__file__).resolve().parents[1]
BASE = "4504514c019ca0ee0cb4a89ed97445a0bad21915"
CHANGE = "openspec/changes/three-surface-poc-experience/"
PACKAGE = ".syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/"
CANDIDATE = ROOT / PACKAGE
MANIFEST_NAME = "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt"
MANIFEST_OUT = Path(PACKAGE + MANIFEST_NAME)
SUBJECTS = tuple(CHANGE + p for p in (
    ".openspec.yaml", "CONTRACT-COVERAGE.md", "GOVERNING-DEPENDENCIES.md",
    "design.md", "proposal.md", "specs/three-surface-poc-experience/spec.md"))
PATCHED = SUBJECTS[1:]
SPEC = SUBJECTS[-1]
COVERAGE = CHANGE + "CONTRACT-COVERAGE.md"
DEPS = CHANGE + "GOVERNING-DEPENDENCIES.md"
HEADING = re.compile(r"^### Requirement: (POC-REQ-\d{3}) — ", re.M)
CITER_PATTERN = r"POC-REQ-014|governedBy|GoverningIntentUnknown|governing.intent.amendment"
SPEC_PATH = re.compile(r"openspec/(?:changes/[^/]+/)?specs/[^/]+/spec\.md")
CLOSED_VALUE = {"label": "Unknown", "closedReason": "source-uncaptured-or-unreachable",
                "resolutionRoutes": [{"reason": "source-uncaptured-or-unreachable",
                                      "route": "Repair the observer/source; new snapshot",
                                      "actor": "operator", "verb": "repair", "target": "evaluation"}]}
FAULT = "invalid-governing-intent-reference"
CLASSES = ("doctrine", "contracts", "policies", "decisions", "topology", "parent_requirements")
# Each guard has its own semantic deletion mutant below, not a prose-length check.
GUARDS = {
    "drafting-direction-warrant": "decisions: [OWNER-DIRECTION-MACHINE-CEILING-2026-10-15]",
    "literal-value": json.dumps(CLOSED_VALUE, separators=(",", ":")),
    "literal-reference": '{"ref":"observation"}',
    "bounded-local-hop": "Resolution SHALL take one local hop",
    "body-isolation": "its own enclosing `workItems` observation in this same machine-answer body",
    "no-fallback": "nor fall back to an inline, previous or default value",
    "identity-preservation": "SHALL remain distinct",
    "no-record-pooling": "NOT pool entity or relationship records",
    "explicit-refusal": 'endpoint SHALL instead return HTTP 503',
    "fault-not-reason": 'wire-validation fault, not a new RFC2-24 Unknown reason',
    "failed-not-empty": 'without a fabricated shared value, item set or zero count',
    "complete-denominator": 'denominator is the complete served item set (POC-REQ-011)',
    "independent-oracle": 'imports no producer/serializer/model helper',
}


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], cwd=ROOT)


def baseline() -> dict[str, bytes]:
    return {p: git("show", f"{BASE}:{p}") for p in SUBJECTS}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def patch_header_findings(patch: str, subject: str) -> list[str]:
    expected = ["--- a/" + subject, "+++ b/" + subject]
    headers = re.findall(r"^(?:---|\+\+\+) .+$", patch, re.M)
    return [] if headers == expected else [f"patch path/header population differs: {subject}"]


def collect() -> tuple[dict[str, bytes], dict[str, bytes]]:
    """Apply only declared patches to exact git objects in an owned temp tree."""
    current = baseline()
    for name in SUBJECTS:
        if (ROOT / name).read_bytes() != current[name]:
            raise ValueError(f"adopted subject drift from frozen baseline: {name}")
    expected = {Path(p).name + ".patch": p for p in PATCHED}
    found = {p.name: p for p in (CANDIDATE / "proposed").rglob("*") if p.is_file()}
    if set(found) != set(expected):
        raise ValueError("patch file population differs from exact five declared patches")
    with tempfile.TemporaryDirectory(prefix="syzygy-p115-proposed-") as tmp:
        tree = Path(tmp)
        for name, body in current.items():
            target = tree / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(body)
        for patch_name, subject in expected.items():
            patch = found[patch_name].read_text()
            errors = patch_header_findings(patch, subject)
            if errors:
                raise ValueError("; ".join(errors))
            result = subprocess.run(["patch", "--batch", "--forward", "--fuzz=0", "-p1", "--no-backup-if-mismatch"],
                                    cwd=tree, input=patch.encode(), capture_output=True)
            output = (result.stdout + result.stderr).decode()
            if result.returncode or any(x in output.lower() for x in ("offset", "fuzz", "reversed", "failed")):
                raise ValueError(f"patch did not apply exactly: {patch_name}: {output}")
        return current, {p: (tree / p).read_bytes() for p in SUBJECTS}


def requirement_blocks(text: str) -> tuple[str, dict[str, str]]:
    matches = list(HEADING.finditer(text))
    blocks = {m.group(1): text[m.start():matches[i+1].start() if i+1 < len(matches) else len(text)]
              for i, m in enumerate(matches)}
    if len(blocks) != len(matches):
        raise ValueError("duplicate native POC requirement identity")
    return text[:matches[0].start()] if matches else text, blocks


def structure_findings(proposed: dict[str, bytes], current: dict[str, bytes]) -> list[str]:
    findings = []
    if set(proposed) != set(SUBJECTS):
        return ["subject population differs"]
    if proposed[SUBJECTS[0]] != current[SUBJECTS[0]]:
        findings.append("unchanged .openspec.yaml differs")
    before_intro, before = requirement_blocks(current[SPEC].decode())
    after_intro, after = requirement_blocks(proposed[SPEC].decode())
    if before_intro != after_intro or list(before) != list(after):
        findings.append("native requirement identity/order or reader-notes population differs")
    if any(after.get(k) != v for k, v in before.items() if k != "POC-REQ-014"):
        findings.append("untouched requirement block differs")
    block = " ".join(after.get("POC-REQ-014", "").split())
    for name, phrase in GUARDS.items():
        if phrase not in block:
            findings.append(f"wire contract missing {name}")
    if len(re.findall(r"^#### Scenario:", after.get("POC-REQ-014", ""), re.M)) != 8:
        findings.append("014 scenario population differs from eight")
    old_rows = [s for s in current[COVERAGE].decode().splitlines() if s.startswith("| RFC")]
    new_rows = [s for s in proposed[COVERAGE].decode().splitlines() if s.startswith("| RFC")]
    remaining = new_rows.copy()
    for row in old_rows:
        if row not in remaining:
            findings.append("inherited coverage consequence row changed or missing")
            break
        remaining.remove(row)
    additions = [s for s in remaining if "Amendment row (observation-local governedBy wire value)" in s]
    if len(remaining) != 7 or len(additions) != 7:
        findings.append("coverage amendment row population differs from seven")
    part_a = proposed[COVERAGE].decode().split("## Part B1", 1)[0]
    rows = [s for s in part_a.splitlines() if re.match(r"^\| RFC\d+-\d+ \|", s)]
    unknown = sum("**Unknown**" in s for s in rows)
    covered = sum("| covered" in s for s in rows)
    clauses = len({s.split("|")[1].strip() for s in rows})
    totals = f"**{len(rows)} consequence rows over {clauses} clauses — {covered} covered,\n{unknown} Unknown.**"
    if totals not in proposed[COVERAGE].decode() or len(rows) != covered + unknown:
        findings.append("coverage computed totals differ")
    generated, errors = dependencies.generate(proposed[SPEC].decode())
    if errors or generated is None or proposed[DEPS].decode() != generated:
        findings.append("proposed dependency union differs from exact regeneration")
    for name in (CHANGE + "proposal.md", CHANGE + "design.md"):
        if not proposed[name].startswith(current[name]) or proposed[name] == current[name]:
            findings.append(f"append-only companion successor differs: {name}")
    return findings


def manifest(proposed: dict[str, bytes]) -> str:
    lines = ["# THREE-SURFACE POC GOVERNEDBY REFERENCE AMENDMENT MANIFEST",
             "# Candidate: binds nothing until the owner signs it off.",
             f"# {len(SUBJECTS)} artifacts; rows sorted by codepoint path.",
             "# All rows take effect together or none do.",
             "# Rows hash PROPOSED bytes; adopted files are not changed by this builder."]
    return "\n".join(lines + [f"{sha256(proposed[p])}  {p}" for p in SUBJECTS]) + "\n"


def verify_manifest(actual: str, expected: str) -> list[str]:
    rows = re.findall(r"^[0-9a-f]{64}  (.+)$", actual, re.M)
    if rows != list(SUBJECTS):
        return ["manifest path population or order differs"]
    return [] if actual == expected else ["manifest differs from proposed subject bytes"]


def complete_value_carriers(value: object, path: tuple = ()) -> list[list]:
    """Census every exact complete value in the fixture body, even under unrelated keys."""
    found = [list(path)] if value == CLOSED_VALUE else []
    if isinstance(value, dict):
        for key in sorted(value):
            found.extend(complete_value_carriers(value[key], (*path, key)))
    elif isinstance(value, list):
        for i, child in enumerate(value):
            found.extend(complete_value_carriers(child, (*path, i)))
    return found


def wire_oracle(body: dict, rendered_ids: list) -> dict:
    """Preparation oracle only. Expected identities/populations are literal fixture data."""
    def refuse(predicate: str) -> dict:
        return {"valid": False, "fault": FAULT, "predicate": predicate}

    def identified_instant(value: object) -> bool:
        if not isinstance(value, str) or not value:
            return False
        try:
            return datetime.datetime.fromisoformat(value.replace("Z", "+00:00")).tzinfo is not None
        except ValueError:
            return False

    if not isinstance(body, dict):
        return refuse("body-shape")
    evaluation = body.get("evaluation")
    if (not isinstance(evaluation, dict) or not isinstance(evaluation.get("snapshot"), str)
            or not evaluation["snapshot"] or not identified_instant(evaluation.get("asOf"))):
        return refuse("bound-evaluation")
    work = body.get("workItems")
    if not isinstance(work, dict):
        return refuse("work-item-result")
    if not isinstance(rendered_ids, list) or any(not isinstance(i, str) for i in rendered_ids):
        return refuse("rendered-population-shape")
    if len(rendered_ids) != len(set(rendered_ids)):
        return refuse("rendered-population-unique")
    if work.get("kind") == "unknown":
        if (not work.get("reason") or rendered_ids
                or any(k in work for k in ("items", "governedBy", "governedByUnknownCount"))):
            return refuse("unknown-observation-population")
        if complete_value_carriers(body):
            return refuse("complete-value-carrier-census")
        return {"valid": True, "fault": None, "evaluation": copy.deepcopy(evaluation),
                "observation": None, "effectiveIds": [], "claimIdentities": [],
                "unknownCount": None, "renderedIds": [], "insideUnknownCount": None,
                "outsideIds": [], "outsideUnknownCount": None}
    provenance = work.get("provenance")
    if (not isinstance(provenance, dict) or not isinstance(provenance.get("revision"), str)
            or not provenance["revision"] or not identified_instant(work.get("capturedAt"))):
        return refuse("bound-observation")
    if work.get("kind") != "observed" or work.get("governedBy") != CLOSED_VALUE:
        return refuse("closed-shared-value")
    items = work.get("items")
    if not isinstance(items, list) or any(not isinstance(i, dict) or i.get("governedBy") != {"ref": "observation"} for i in items):
        return refuse("literal-item-reference")
    ids = [i.get("id") for i in items]
    if any(not isinstance(i, str) or not i for i in ids) or len(ids) != len(set(ids)):
        return refuse("distinct-item-identities")
    if type(work.get("governedByUnknownCount")) is not int or work["governedByUnknownCount"] != len(items):
        return refuse("count-preservation")
    if any(i not in ids for i in rendered_ids):
        return refuse("rendered-population-membership")
    if complete_value_carriers(body) != [["workItems", "governedBy"]]:
        return refuse("complete-value-carrier-census")
    observation = {"provenance": copy.deepcopy(provenance), "capturedAt": work["capturedAt"]}
    identities = [{"evaluation": copy.deepcopy(evaluation), "observation": copy.deepcopy(observation),
                   "itemId": item_id, "field": "governedBy"} for item_id in ids]
    outside = [i for i in ids if i not in rendered_ids]
    return {"valid": True, "fault": None, "evaluation": copy.deepcopy(evaluation),
            "observation": observation, "effectiveIds": ids, "claimIdentities": identities,
            "unknownCount": len(items), "renderedIds": rendered_ids.copy(),
            "insideUnknownCount": len(rendered_ids), "outsideIds": outside,
            "outsideUnknownCount": len(outside)}


def fixture_findings(cases: list[dict]) -> list[str]:
    findings = []
    for case in cases:
        actual = wire_oracle(case["body"], case["renderedIds"])
        for field in sorted(set(actual) | set(case["expected"])):
            if actual.get(field) != case["expected"].get(field) or (field in actual) != (field in case["expected"]):
                findings.append(f"literal {field} differs: {case['name']}")
        if complete_value_carriers(case["body"]) != case["expectedCarrierPaths"]:
            findings.append(f"complete-value carrier census differs: {case['name']}")
        for population, expected in case.get("expectedRecordPopulations", {}).items():
            if case["body"].get(population) != expected:
                findings.append(f"literal retained {population} differs: {case['name']}")
    return findings


def consumption_assessment(path: str, ordinal: int, heading: str, block: str,
                           assessments: dict) -> dict:
    """A complete declaration is not an unaffectedness decision; a bound semantic assessment is required."""
    key = (path, ordinal)
    entry = assessments.get(key)
    declarations = re.findall(r"^  (doctrine|contracts|policies|decisions|topology|parent_requirements): (\[[^\n]*\])$", block, re.M)
    declared = {k: v for k, v in declarations}
    complete = set(declared) == set(CLASSES) and len(declarations) == len(CLASSES)
    record = {"path": path, "ordinal": ordinal, "heading": heading,
              "block_sha256": sha256(block.encode()), "warrant_classes_complete": complete,
              "direct_changed_id_warrant": any(re.search(r"\bPOC-REQ-014\b", v) for v in declared.values())}
    if (not complete or entry is None or entry.get("block_sha256") != record["block_sha256"]
            or entry.get("heading") != heading):
        return {**record, "classification": "undecidable", "consumption": "not settled",
                "reason": "No current block-bound semantic consumption assessment, or incomplete/ambiguous declarations; complete empty arrays cannot establish untiedness.",
                "method": "Full block retained and declaration scan recorded; no semantic disposition inferred from lexical absence.",
                "evidence_quotes": [], "settling_evidence": "Read this exact complete requirement block, its owning capability scope and oracle; record whether it consumes the changed wire value/identity or a preserved separate input, with source evidence and a current block digest."}
    if entry["classification"] not in ("affected", "explicitly-unaffected", "undecidable"):
        raise ValueError(f"invalid consumption disposition: {key}")
    if (not entry.get("reason") or not entry.get("method") or not entry.get("consumption")
            or not entry.get("evidence_quotes") or any(q not in block for q in entry["evidence_quotes"])):
        raise ValueError(f"unsubstantiated consumption disposition: {key}")
    if (not entry.get("input_boundary") or not entry.get("output_and_oracle_boundary")
            or not entry.get("semantic_disposition")
            or type(entry.get("normative_block_text_change_required")) is not bool):
        raise ValueError(f"consumption/text-validity axes missing: {key}")
    if (entry["classification"] == "explicitly-unaffected"
            and entry["normative_block_text_change_required"]):
        raise ValueError(f"untied disposition claims a required text amendment: {key}")
    if entry["classification"] == "undecidable" and not entry.get("settling_evidence"):
        raise ValueError(f"undecidable consumption lacks settling evidence: {key}")
    return {**record, **entry}


def retained_evidence_findings(overrides: dict[str, bytes] | None = None) -> list[str]:
    """Check this package's inert retained evidence, not the source judgments."""
    overrides = overrides or {}

    def read(relative: str) -> bytes:
        name = Path(relative)
        if name.is_absolute() or ".." in name.parts:
            raise ValueError("retained evidence path escapes candidate")
        return overrides[relative] if relative in overrides else (CANDIDATE / name).read_bytes()

    findings = []
    selection = json.loads(read("evidence/EVIDENCE-SELECTION.json"))
    for row in selection["rows"]:
        body = read(row["candidate_relative_path"])
        if sha256(body) != row["sha256"] or len(body) != row["bytes"]:
            findings.append("retained-copy identity: " + row["candidate_relative_path"])
    criteria = json.loads(read("evidence/source-return/SOURCE-CRITERIA.json"))
    for clause in criteria["clauses"]:
        source = git("show", clause["commit"] + ":" + clause["path"])
        quote = "".join(source.decode().splitlines(keepends=True)[
            clause["line_start"] - 1:clause["line_end_inclusive"]])
        if (sha256(source) != clause["source_sha256"]
                or quote != clause["verbatim_quote"]
                or sha256(quote.encode()) != clause["quote_sha256"]):
            findings.append("source-criterion quote: " + clause["identifier"])
    replay = json.loads(read("evidence/encoded-byte/BYTE-REPLAY.json"))
    rows = 0
    for pair in replay["pairs"]:
        sizes = {}
        for side in ("inline", "reference"):
            literal = json.loads(read(pair[side + "_path"]))
            encoded = json.dumps(literal, ensure_ascii=False, separators=(",", ":")).encode()
            sizes[side] = len(encoded)
            if (len(encoded) != pair[side + "_compact_bytes"]
                    or sha256(encoded) != pair[side + "_compact_sha256"]):
                findings.append("literal-byte count/hash: " + pair["name"] + "/" + side)
        for row in pair["truth_table"]:
            rows += 1
            if (row["inlineFits"] != (sizes["inline"] <= row["limit"])
                    or row["referenceFits"] != (sizes["reference"] <= row["limit"])):
                findings.append("literal-byte boundary: " + pair["name"] + "/" + str(row["limit"]))
        interval = [min(sizes.values()), max(sizes.values()) - 1]
        if pair["separating_interval_inclusive"] != interval:
            findings.append("literal-byte separating interval: " + pair["name"])
    if len(replay["pairs"]) != 3 or rows != 18:
        findings.append("literal-byte witness population differs from three pairs/eighteen rows")
    return findings


def mutation_receipt(name: str, subject: str, before: bytes, after: bytes,
                     expected: str, findings: list[str]) -> None:
    """Emit exact old/new scratch fragments for the caller's outside-Git log."""
    old, new = before.decode(), after.decode()
    prefix = 0
    while prefix < min(len(old), len(new)) and old[prefix] == new[prefix]:
        prefix += 1
    suffix = 0
    while (suffix < min(len(old), len(new)) - prefix
           and old[len(old) - suffix - 1] == new[len(new) - suffix - 1]):
        suffix += 1
    fragments = [{"old": old[prefix:len(old) - suffix],
                  "new": new[prefix:len(new) - suffix]}]
    print("MUTATION-EVIDENCE " + json.dumps({
        "name": name, "subject": subject, "beforeSha256": sha256(before),
        "afterSha256": sha256(after), "fragments": fragments,
        "expectedPredicate": expected, "findings": findings,
        "rejectedAtExpectedPredicate": any(expected in f for f in findings),
        "ranAt": {"commit": git("rev-parse", "HEAD").decode().strip(),
                  "scriptSha256": sha256(Path(__file__).read_bytes()),
                  "instantUtc": datetime.datetime.now(datetime.timezone.utc).isoformat()},
        "scope": "preparation-only scratch mutation; no product/runtime claim"}))


def round1_counterexample_findings(data: dict, assessments: dict) -> list[str]:
    failures = []
    for case in data["wireCounterexamples"]:
        findings = fixture_findings([case])
        actual = wire_oracle(case["body"], case["renderedIds"])
        required = case["requiredFailure"]
        if not findings:
            failures.append(f"round-1 counterexample survived: {case['name']}")
        elif required.startswith("literal "):
            if not any(required in f for f in findings):
                failures.append(f"counterexample failed wrong expectation: {case['name']}: {findings}")
        elif actual.get("predicate") != required:
            failures.append(f"counterexample failed wrong predicate: {case['name']}: {actual}")
    synthetic = data["syntheticConsumer"]
    result = consumption_assessment("fixture/spec.md", 1, synthetic["heading"], synthetic["block"], assessments)
    if result["classification"] != "undecidable" or not result["settling_evidence"]:
        failures.append("full-declaration prose consumer falsely classified unaffected")
    # A formerly assessed block must lose its disposition when its consumption changes.
    original = next(iter(assessments.values()))
    changed_block = synthetic["block"]
    stale = {(original["path"], original["ordinal"]): original}
    result = consumption_assessment(original["path"], original["ordinal"], original["heading"], changed_block, stale)
    if result["classification"] != "undecidable":
        failures.append("changed block retained stale semantic disposition")
    return failures


def load_consumption_assessments() -> dict:
    data = json.loads((CANDIDATE / "REQUIREMENT-CONSUMPTION.json").read_text())
    entries = {(entry["path"], entry["ordinal"]): entry for entry in data["entries"]}
    if len(entries) != len(data["entries"]):
        raise ValueError("duplicate requirement consumption occurrence")
    return entries


def sweep() -> dict:
    files = sorted(p for p in git("ls-tree", "-r", "-z", "--name-only", BASE).decode().split("\0") if p)
    listed = sorted(p for p in git("ls-files", "-z").decode().split("\0") if p)
    with tarfile.open(fileobj=io.BytesIO(git("archive", "--format=tar", BASE))) as archive:
        archived = sorted(m.name for m in archive.getmembers() if m.isfile() or m.issym() or m.islnk())
    if files != archived:
        raise ValueError("independent ls-tree/archive tracked denominators disagree")
    # The historical sweep stays at BASE; checkout preservation follows current HEAD.
    # New staged or untracked files do not change either committed denominator.
    head_files = (p for p in git("ls-tree", "-r", "-z", "--name-only", "HEAD").decode().split("\0") if p)
    if not set(head_files).issubset(listed):
        raise ValueError("current HEAD tracked population missing from worktree index")
    # One object batch keeps the complete tracked sweep cheap and read-only.
    result = subprocess.run(["git", "cat-file", "--batch"], cwd=ROOT,
                            input="".join(f"{BASE}:{p}\n" for p in files).encode(),
                            capture_output=True, check=True).stdout
    blobs, offset = {}, 0
    for path in files:
        end = result.index(b"\n", offset)
        header = result[offset:end].split()
        if len(header) != 3 or header[1] != b"blob":
            raise ValueError(f"unexpected tracked object in baseline: {path}")
        size = int(header[2])
        blobs[path] = result[end+1:end+1+size]
        offset = end + size + 2
    if offset != len(result):
        raise ValueError("baseline object batch denominator differs")
    binary = [p for p, b in blobs.items() if b"\0" in b]
    texts = {p: b.decode("utf-8", errors="replace") for p, b in blobs.items() if p not in binary}
    hits = sorted(p for p, s in texts.items() if re.search(CITER_PATTERN, s))
    other = git("grep", "-I", "-l", "-E", CITER_PATTERN, BASE, "--").decode().splitlines()
    other = sorted(line.split(":", 1)[1] for line in other)
    if hits != other:
        raise ValueError("two independent tracked-citer methods disagree")
    specs = sorted(p for p in files if SPEC_PATH.fullmatch(p))
    disk_specs = sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "openspec").glob("**/spec.md")
                        if p.relative_to(ROOT).as_posix() in files and SPEC_PATH.fullmatch(p.relative_to(ROOT).as_posix()))
    if specs != disk_specs:
        raise ValueError("two independent specification enumeration methods disagree")
    assessments = load_consumption_assessments()
    requirements = []
    second_counts = {}
    for path in specs:
        text = texts[path]
        matches = list(re.finditer(r"^### Requirement: (.+)$", text, re.M))
        second_counts[path] = sum(line.startswith("### Requirement: ") for line in text.splitlines())
        if len(matches) != second_counts[path]:
            raise ValueError(f"two requirement enumeration methods disagree: {path}")
        for i, m in enumerate(matches):
            block = text[m.start():matches[i+1].start() if i+1 < len(matches) else len(text)]
            record = consumption_assessment(path, i+1, m.group(1), block, assessments)
            # Signals expose full-text consumption candidates; absence never classifies.
            record["full_text_signals"] = sorted(set(re.findall(
                r"POC-REQ-014|governedBy|machine answer|machine response|wire|work.item|epistemic|provenance",
                block, re.I)))
            requirements.append(record)
    population = {(r["path"], r["ordinal"]) for r in requirements}
    if population != set(assessments):
        raise ValueError("semantic disposition population differs from actual eight-file corpus")
    if any(r["block_sha256"] != assessments[(r["path"], r["ordinal"])]["block_sha256"] for r in requirements):
        raise ValueError("consumption assessment bound to stale requirement bytes")
    integration = {".github/workflows/governance-docs.yml", "PROJECT-STATUS.md", "docs/README.md",
                   ".syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md"}
    integration |= {p for p in hits if p.startswith("scripts/")}
    classified = []
    for path in hits:
        if path in SUBJECTS:
            state, reason = "affected", "same-change proposed POC successor subject"
        elif path in integration:
            state, reason = "affected-preparation-gate", "coordinator must assess/register exact signed successor and preserve predecessor checks before offer/adoption; not changed by this author"
        else:
            state, reason = "explicitly-unaffected", "retained dated evidence, prior packet or performed owner record: historical subject/choice unchanged; preserve bytes, do not rewrite as current P115 authority"
        classified.append({"path": path, "classification": state, "reason_and_method": reason})
    return {"subject": "P-115 POC-REQ-014 candidate reverse-impact sweep", "baseline_commit": BASE,
            "changed_identities": {k: (["POC-REQ-014"] if k == "parent_requirements" else []) for k in CLASSES},
            "citer_predicate": CITER_PATTERN,
            "methods": ["git ls-tree -rz + independent git archive tracked population; baseline object batch and Python full-text regex",
                        "git grep -I -l -E at baseline; pathlib spec enumeration + line-prefix requirement counts; authored block-bound consumption dispositions with exact source excerpts and six-class declaration facts"],
            "counts": {"tracked_baseline_paths": len(files), "binary_paths": len(binary), "text_paths": len(texts),
                       "matching_citer_paths": len(hits), "spec_files": len(specs), "requirement_occurrences": len(requirements),
                       "warrant_complete_requirements": sum(x["warrant_classes_complete"] for x in requirements),
                       "affected_requirements": sum(x["classification"] == "affected" for x in requirements),
                       "unaffected_requirements": sum(x["classification"] == "explicitly-unaffected" for x in requirements),
                       "undecidable_requirements": sum(x["classification"] == "undecidable" for x in requirements)},
            "spec_files": specs, "independent_requirement_counts": second_counts,
            "consumption_assessment_sha256": sha256((CANDIDATE / "REQUIREMENT-CONSUMPTION.json").read_bytes()),
            "requirements": requirements, "citer_paths": classified,
            "not_lexically_enumerable_unknowns": ["actual external API consumers", "post-restoration code integration and measured savings"],
            "actor": "OpenAI Codex, syzygy-318o candidate writer", "independent_confirmation": "pending"}


def compatibility_findings() -> list[str]:
    """Independent literal human/machine examples; all mutations are scratch-only."""
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts/check_p115_compatibility_examples.py"), "--check"],
        cwd=ROOT, capture_output=True, text=True)
    if result.returncode:
        return ["literal compatibility examples failed: " + result.stdout + result.stderr]
    print(result.stdout, end="")
    return []


def check(write: bool = False) -> list[str]:
    current, proposed = collect()
    errors = structure_findings(proposed, current)
    errors.extend(retained_evidence_findings())
    errors.extend(compatibility_findings())
    cases = json.loads((CANDIDATE / "fixtures/wire-cases.json").read_text())["cases"]
    errors.extend(fixture_findings(cases))
    regressions = json.loads((CANDIDATE / "fixtures/round-1-counterexamples.json").read_text())
    errors.extend(round1_counterexample_findings(regressions, load_consumption_assessments()))
    generated = {MANIFEST_OUT: manifest(proposed), Path(PACKAGE + "IMPACT-SWEEP.json"): json.dumps(sweep(), indent=2) + "\n"}
    if errors:
        return errors
    for path, text in generated.items():
        target = ROOT / path
        if write:
            target.write_text(text)
        elif path == MANIFEST_OUT:
            errors.extend(verify_manifest(target.read_text() if target.exists() else "", text))
        elif not target.exists() or target.read_text() != text:
            errors.append(f"generated candidate artifact drift: {path}")
    return errors



def index_population_selftest(evidence_root: Path | None = None) -> list[str]:
    """Five native checkout fixtures; only the child builder's --check is run.

    The optional directory is for an author harness to retain the same fixtures;
    it is not a CLI selection or a way to shorten the default selftest.
    """
    cases = (
        ("committed-unrelated-base-deletion", 0),
        ("head-base-path-index-removal", 1),
        ("head-post-base-path-index-removal", 1),
        ("staged-addition", 0),
        ("untracked-addition", 0),
    )
    builder = "scripts/build_three_surface_poc_governedby_reference_amendment.py"
    source = (ROOT / builder).read_bytes()
    head = git("rev-parse", "HEAD").decode().strip()
    protected = sorted(p.relative_to(ROOT).as_posix() for p in CANDIDATE.rglob("*") if p.is_file())
    protected.append("scripts/check_p115_compatibility_examples.py")
    observed_files = ("README.md", builder, "p115-index-population-fixture.txt",
                      MANIFEST_OUT.as_posix(), PACKAGE + "IMPACT-SWEEP.json")
    success = ("P115 candidate preparation matches: six proposed subjects, five patches, only 014 changed, "
               "26 requirements, eight 014 scenarios; no adoption or runtime claim.\n")
    refusal = "P115 PREPARATION FAIL: current HEAD tracked population missing from worktree index\n"
    errors = []
    with tempfile.TemporaryDirectory(prefix="p115-index-population-") as temporary:
        evidence = Path(temporary) if evidence_root is None else evidence_root
        if evidence_root is not None:
            evidence.mkdir(parents=True, exist_ok=False)
        for name, expected_code in cases:
            case = evidence / name
            case.mkdir()
            commands = case / "commands"
            commands.mkdir()
            tree = case / "tree"
            events = []

            def run(argv: list[str], cwd: Path) -> tuple[int, bytes, bytes]:
                start = datetime.datetime.now(datetime.timezone.utc)
                child = subprocess.Popen(argv, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                stdout, stderr = child.communicate()
                end = datetime.datetime.now(datetime.timezone.utc)
                stem = f"{len(events):03d}"
                (commands / (stem + ".stdout")).write_bytes(stdout)
                (commands / (stem + ".stderr")).write_bytes(stderr)
                event = {"argv": argv, "cwd": str(cwd), "pid": child.pid,
                         "startedAt": start.isoformat(), "completedAt": end.isoformat(),
                         "elapsedSeconds": (end - start).total_seconds(), "returncode": child.returncode,
                         "stdout": stem + ".stdout", "stderr": stem + ".stderr",
                         "stdoutSha256": sha256(stdout), "stderrSha256": sha256(stderr)}
                events.append(event)
                (commands / (stem + ".json")).write_text(json.dumps(event, indent=2) + "\n")
                return child.returncode, stdout, stderr

            def fixture_git(*args: str) -> bytes:
                code, stdout, stderr = run(["git", "--no-optional-locks", *args], tree)
                if code:
                    raise ValueError(f"native index fixture setup failed: {name}: {args}: {stderr!r}")
                return stdout

            code, _stdout, stderr = run(["git", "--no-optional-locks", "clone", "--quiet",
                                        "--no-hardlinks", "--no-checkout", str(ROOT), str(tree)], ROOT)
            if code:
                raise ValueError(f"native index fixture clone failed: {name}: {stderr!r}")
            fixture_git("checkout", "--quiet", "--detach", head)
            (tree / builder).write_bytes(source)
            if name == "committed-unrelated-base-deletion":
                fixture_git("rm", "--quiet", "--", "README.md")
                fixture_git("-c", "user.name=P115 synthetic fixture", "-c", "user.email=p115-fixture@example.invalid",
                            "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
                            "commit", "--quiet", "-m", "Synthetic index-membership fixture; no owner action")
            elif name == "head-base-path-index-removal":
                fixture_git("rm", "--quiet", "--cached", "--", "README.md")
            elif name == "head-post-base-path-index-removal":
                fixture_git("rm", "--quiet", "--cached", "--", builder)
            else:
                (tree / "p115-index-population-fixture.txt").write_bytes(b"Synthetic checkout membership input; no owner action.\n")
                if name == "staged-addition":
                    fixture_git("add", "--", "p115-index-population-fixture.txt")

            def snapshot(label: str) -> dict:
                destination = case / label
                destination.mkdir()
                index = Path(fixture_git("rev-parse", "--git-path", "index").decode().strip())
                index = index if index.is_absolute() else tree / index
                body = index.read_bytes()
                (destination / "index.bin").write_bytes(body)
                state = {"head": fixture_git("rev-parse", "HEAD").decode().strip(),
                         "indexSha256": sha256(body), "files": {}, "protected": {}}
                (destination / "index-stage.bin").write_bytes(fixture_git("ls-files", "--stage", "-z"))
                for relative in observed_files:
                    target = tree / relative
                    if not target.exists():
                        state["files"][relative] = {"kind": "absent"}
                        continue
                    content = target.read_bytes()
                    copy_path = destination / "files" / relative
                    copy_path.parent.mkdir(parents=True, exist_ok=True)
                    copy_path.write_bytes(content)
                    state["files"][relative] = {"kind": "regular", "sha256": sha256(content), "bytes": len(content)}
                state["protected"] = {p: sha256((tree / p).read_bytes()) for p in protected}
                (destination / "STATE.json").write_text(json.dumps(state, indent=2) + "\n")
                return state

            before = snapshot("before")
            code, stdout, stderr = run([sys.executable, str(tree / builder), "--check"], tree)
            checked = events[-1]
            after = snapshot("after")
            admission_matches = code == expected_code
            output_matches = stdout.endswith((success if expected_code == 0 else refusal).encode()) and not stderr
            unchanged = before == after
            passed = admission_matches and output_matches and unchanged
            receipt = {"case": name, "fixture": "native owned Git fixture; synthetic only; no owner act",
                       "sourceSha256": sha256(source), "sourceHead": head, "ranAt": before["head"],
                       "expectedReturncode": expected_code, "returncode": code,
                       "expectedFinalLine": success if expected_code == 0 else refusal,
                       "actualFinalLine": stdout.decode(errors="replace").splitlines()[-1:] or [],
                       "admissionMatches": admission_matches, "outputMatches": output_matches,
                       "unchanged": unchanged, "protectedPaths": len(protected),
                       "check": checked, "nativeCommands": len(events), "passed": passed}
            (case / "RESULT.json").write_text(json.dumps(receipt, indent=2) + "\n")
            print("INDEX-POPULATION-EVIDENCE " + json.dumps(receipt, sort_keys=True), flush=True)
            if not passed:
                errors.append(f"native checkout membership fixture failed: {name}: code={code}; "
                              f"admission={admission_matches}; output={output_matches}; unchanged={unchanged}")
    print("Index population selftest: five native Git fixtures; committed deletion, two index removals, "
          "staged addition and untracked addition; checks write nothing.", flush=True)
    return errors


def selftest() -> list[str]:
    current, proposed = collect()
    errors = structure_findings(proposed, current)
    errors.extend(retained_evidence_findings())
    errors.extend(compatibility_findings())
    if errors:
        return ["baseline fails before mutations", *errors]
    mutants = []
    for name, phrase in GUARDS.items():
        changed = copy.copy(proposed)
        # Normalize split lines only for selecting the exact phrase to remove.
        text = changed[SPEC].decode()
        pattern = r"\s+".join(re.escape(x) for x in phrase.split())
        text, n = re.subn(pattern, "REMOVED-BY-MUTANT", text, count=1)
        if n != 1:
            errors.append(f"mutation target not unique/present: {name}")
        changed[SPEC] = text.encode()
        mutants.append((name, changed, "wire contract missing " + name))
    for name, subject, old, new, expected in (
        ("untouched-060", SPEC, "One design language, one epistemic", "Altered design language, one epistemic", "untouched requirement block differs"),
        ("requirement-identity", SPEC, "POC-REQ-020 —", "POC-REQ-099 —", "native requirement identity/order"),
        ("coverage-row", COVERAGE, "| RFC6-14 | Every claim instance", "| REMOVED | Every claim instance", "inherited coverage consequence"),
        ("coverage-unknown", COVERAGE, "| **Unknown** —", "| covered —", "inherited coverage consequence"),
        ("coverage-totals", COVERAGE, "154 consequence rows", "153 consequence rows", "coverage computed totals"),
        ("dependency-union", DEPS, "GENERATED", "STALE", "proposed dependency union"),
        ("unchanged-yaml", SUBJECTS[0], "schema: spec-driven", "schema: altered", "unchanged .openspec.yaml"),
        ("companion-preservation", CHANGE + "proposal.md", "# ", "# ALTERED ", "append-only companion successor"),
    ):
        changed = copy.copy(proposed)
        text = changed[subject].decode()
        if old not in text:
            errors.append("missing mutation target: " + name)
        changed[subject] = text.replace(old, new, 1).encode()
        mutants.append((name, changed, expected))
    for name, changed, expected in mutants:
        findings = structure_findings(changed, current)
        subject = next(p for p in SUBJECTS if changed[p] != proposed[p])
        mutation_receipt(name, subject, proposed[subject], changed[subject], expected, findings)
        if not any(expected in f for f in findings):
            errors.append(f"mutant {name} survived its own predicate: {findings}")
    # These mutate only inert evidence bytes in memory. They test preservation,
    # exact source quotations and literal byte predicates, not authored adequacy.
    data_mutants = []
    relative = "evidence/source-return/SOURCE-DECISION-RECONCILIATION-CURATED.md"
    before = (CANDIDATE / relative).read_bytes()
    data_mutants.append(("retained-source-copy", relative, before, before + b"\n", "retained-copy identity"))
    relative = "evidence/source-return/SOURCE-CRITERIA.json"
    before = (CANDIDATE / relative).read_bytes()
    changed = json.loads(before)
    changed["clauses"][0]["verbatim_quote"] += "invented clause text"
    data_mutants.append(("source-quote", relative, before,
                         (json.dumps(changed, ensure_ascii=False, indent=2) + "\n").encode(),
                         "source-criterion quote"))
    relative = "evidence/encoded-byte/BYTE-REPLAY.json"
    before = (CANDIDATE / relative).read_bytes()
    for name, expected in (("byte-count", "literal-byte count/hash"),
                           ("byte-hash", "literal-byte count/hash"),
                           ("byte-boundary", "literal-byte boundary"),
                           ("byte-interval", "literal-byte separating interval"),
                           ("byte-population", "literal-byte witness population")):
        changed = json.loads(before)
        if name == "byte-count":
            changed["pairs"][0]["inline_compact_bytes"] += 1
        elif name == "byte-hash":
            changed["pairs"][0]["inline_compact_sha256"] = "0" * 64
        elif name == "byte-boundary":
            changed["pairs"][0]["truth_table"][0]["inlineFits"] = True
        elif name == "byte-interval":
            changed["pairs"][0]["separating_interval_inclusive"][0] += 1
        else:
            changed["pairs"].pop()
        data_mutants.append((name, relative, before,
                             (json.dumps(changed, ensure_ascii=False, indent=2) + "\n").encode(), expected))
    relative = "evidence/EVIDENCE-SELECTION.json"
    before = (CANDIDATE / relative).read_bytes()
    changed = json.loads(before)
    changed["rows"][0]["candidate_relative_path"] = "../foreign"
    data_mutants.append(("retained-path-escape", relative, before,
                         (json.dumps(changed, ensure_ascii=False, indent=2) + "\n").encode(),
                         "retained evidence path escapes candidate"))
    for name, relative, before, after, expected in data_mutants:
        try:
            findings = retained_evidence_findings({relative: after})
        except ValueError as exc:
            findings = [str(exc)]
        mutation_receipt(name, relative, before, after, expected, findings)
        if not any(expected in f for f in findings):
            errors.append(f"retained evidence mutant survived its predicate: {name}: {findings}")
    original = next(iter(load_consumption_assessments().values()))
    source = git("show", BASE + ":" + original["path"]).decode()
    headings = list(re.finditer(r"^### Requirement: (.+)$", source, re.M))
    index = original["ordinal"] - 1
    block = source[headings[index].start():headings[index + 1].start() if index + 1 < len(headings) else len(source)]
    for name, field, value, expected in (
        ("missing-validity-axis", "normative_block_text_change_required", None, "consumption/text-validity axes missing"),
        ("untied-text-amendment", "normative_block_text_change_required", True, "untied disposition claims a required text amendment"),
    ):
        changed = {**original, field: value}
        try:
            consumption_assessment(original["path"], original["ordinal"], original["heading"], block,
                                   {(original["path"], original["ordinal"]): changed})
            findings = []
        except ValueError as exc:
            findings = [str(exc)]
        mutation_receipt(name, "REQUIREMENT-CONSUMPTION.json#" + str(original["sequence"]),
                         json.dumps(original, sort_keys=True).encode(), json.dumps(changed, sort_keys=True).encode(),
                         expected, findings)
        if not any(expected in f for f in findings):
            errors.append(f"consumption/text-validity axis mutant survived: {name}: {findings}")
    wrong = "--- a/foreign\n+++ b/foreign\n"
    foreign_findings = patch_header_findings(wrong, SPEC)
    mutation_receipt("foreign-patch-path", "proposed/spec.md.patch",
                     (CANDIDATE / "proposed/spec.md.patch").read_bytes(), wrong.encode(),
                     "patch path/header population differs", foreign_findings)
    if not foreign_findings:
        errors.append("foreign patch-path mutant survived")
    cases = json.loads((CANDIDATE / "fixtures/wire-cases.json").read_text())["cases"]
    errors.extend(fixture_findings(cases))
    if len(cases) != 46 or sum(c["expected"]["valid"] for c in cases) != 7:
        errors.append("independent fixture population differs")
    poisoned = copy.deepcopy(cases)
    poisoned[0]["expected"]["unknownCount"] = 0
    poison_findings = fixture_findings(poisoned)
    mutation_receipt("literal-expectation-poison", "fixtures/wire-cases.json",
                     json.dumps(cases, sort_keys=True).encode(), json.dumps(poisoned, sort_keys=True).encode(),
                     "literal unknownCount differs", poison_findings)
    if not poison_findings:
        errors.append("optimistic fixture expectation mutant survived")
    regressions = json.loads((CANDIDATE / "fixtures/round-1-counterexamples.json").read_text())
    errors.extend(round1_counterexample_findings(regressions, load_consumption_assessments()))
    for case in regressions["wireCounterexamples"]:
        actual = wire_oracle(case["body"], case["renderedIds"])
        result = actual.get("predicate") or case["requiredFailure"]
        print(f"  rejected retained counterexample {case['name']}: {result}")
    print("  classifier: full-declaration prose consumer and stale changed block remain undecidable")
    rendered = manifest(proposed)
    if len(re.findall(r"^[0-9a-f]{64}  ", rendered, re.M)) != len(SUBJECTS):
        errors.append("manifest subject denominator differs")
    changed = copy.copy(proposed)
    changed[SPEC] += b"\n"
    drifted = manifest(changed)
    drift_findings = verify_manifest(rendered, drifted)
    mutation_receipt("subject-byte-drift", SPEC, proposed[SPEC], changed[SPEC],
                     "manifest differs from proposed subject bytes", drift_findings)
    if not drift_findings:
        errors.append("subject-byte drift did not retire manifest")
    lines = rendered.splitlines(keepends=True)
    lines[-1], lines[-2] = lines[-2], lines[-1]
    reordered = "".join(lines)
    order_findings = verify_manifest(reordered, rendered)
    mutation_receipt("manifest-row-order", MANIFEST_NAME, rendered.encode(), reordered.encode(),
                     "manifest path population or order differs", order_findings)
    if order_findings != ["manifest path population or order differs"]:
        errors.append("manifest row-order mutant survived")
    poisoned_hash = rendered.replace(sha256(proposed[SPEC]), "0" * 64)
    hash_findings = verify_manifest(poisoned_hash, rendered)
    mutation_receipt("manifest-row-hash", MANIFEST_NAME, rendered.encode(), poisoned_hash.encode(),
                     "manifest differs from proposed subject bytes", hash_findings)
    if hash_findings != ["manifest differs from proposed subject bytes"]:
        errors.append("manifest row-hash mutant survived")
    print(f"Preparation selftest: {len(mutants)} semantic/structure, {len(data_mutants)} inert-evidence and two validity-axis mutants, foreign patch path, literal-expectation poison, subject-byte drift and two manifest mutants; {len(cases)} independent wire cases (7 valid, 39 refused); {len(regressions['wireCounterexamples'])} retained wire counterexamples plus two classifier regressions. Exact old/new scratch fragments are emitted as MUTATION-EVIDENCE lines for outside-Git retention.")
    errors.extend(index_population_selftest())
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    try:
        errors = selftest() if args.selftest else check(args.write)
    except (ValueError, OSError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
        print(f"P115 PREPARATION FAIL: {exc}")
        return 1
    if errors:
        print("P115 PREPARATION FAIL:")
        print("\n".join("  " + e for e in errors))
        return 1
    print("P115 candidate preparation matches: six proposed subjects, five patches, only 014 changed, 26 requirements, eight 014 scenarios; no adoption or runtime claim.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
