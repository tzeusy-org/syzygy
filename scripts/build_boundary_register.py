#!/usr/bin/env python3
"""Build the scoped N6 boundary register from pinned declarations and reviewed mappings."""

import argparse
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
MANIFEST = "scripts/boundary-register-inputs.json"
REGISTER = "docs/BOUNDARY-REGISTER.md"
VISION = ".syzygy/governance/doctrine/vision.md"
SECURITY = ".syzygy/governance/doctrine/security.md"
RULING = ".syzygy/governance/decisions/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md"
ACT = ".syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md"
REGISTRY = (".syzygy/governance/declarations/adapter-registry/"
            "POLARIS-BUTLERS-PROJECT-SHAPE-OBSERVER-CANDIDATE.json")
POC_SPEC = ("openspec/changes/three-surface-poc-experience/specs/"
            "three-surface-poc-experience/spec.md")
PWB_SPEC = ("openspec/changes/polaris-project-wide-butlers-model/specs/"
            "polaris-project-wide-butlers-model/spec.md")
CORE = "packages/three-surface-poc-core/src/effect-authority.ts"
CORE_TEST = "packages/three-surface-poc-core/src/effect-authority.test.ts"
ROUTES = "apps/three-surface-poc/src/routes.ts"
MATERIALIZE = "apps/three-surface-poc/src/materialize-action.ts"
MATERIALIZE_TEST = "apps/three-surface-poc/src/materialize-action.test.ts"
CLAUSES = {"VIS-4": VISION, "VIS-5": VISION,
           **{f"SEC-{i}": SECURITY for i in range(1, 6)}, "P-71-Q5": RULING}
BOUNDARY_HEADER = re.compile(r"^\*\*((?:VIS|SEC)-[0-9]+) —")
BOUNDARY_UNIT = re.compile(r"^(?:- | {2,4}(?:[-*]|[0-9]+\.) )")
ROUTE = re.compile(r"\{\s*method: '(GET|POST)',\s*path: ([^,\n]+),"
                   r"\s*credentialClass: '([a-z-]+)',\s*handle\b")
MOUNT_PAIR = re.compile(r"^\s*\.\.\.humanSurfaceRoutes\((\w+), (\w+),", re.M)
EFFECT = re.compile(r"export const (\w+): Effect = \{\s*id: '([a-z-]+)',"
                    r"\s*surface: '([^']+)',\s*\};")
PINNED_SOURCE = {
    "observer-act": ACT,
    "observer-registry": REGISTRY,
    "effect-authority": CORE,
    "effect-control": CORE_TEST,
    "poc-routes": ROUTES,
    "materialize-routes": MATERIALIZE,
    "materialize-control": MATERIALIZE_TEST,
}
FORECLOSURE = {
    "reason": "foreclosed",
    "effect": "butlers-tracker-write",
    "caller": "materializeRoutes",
    "control": "refuses the foreclosed write with a bounded typed refusal and never runs Beads (P-71-Q5)",
}
TYPED_WITNESSES = (
    (CORE, "refusedBy: 'foreclosed',\n      foreclosure,"),
    (CORE, "citation: 'P-71-Q5',"),
    (CORE_TEST, "effectAuthority({ writeSurface: ['butlers:.beads'] }, BUTLERS_TRACKER_WRITE)"),
    (MATERIALIZE, "const verdict = (options.authorize ?? dispatchAuthorization)();\n    if (!verdict.authorized)"),
    (MATERIALIZE_TEST, "it('" + FORECLOSURE["control"] + "'"),
)


class InvalidRegister(ValueError):
    """A scoped register input is missing, inconsistent, or stale."""


def digest(body):
    return sha256(body.encode("utf-8")).hexdigest()


def require(condition, message):
    if not condition:
        raise InvalidRegister(message)


def fields(value, expected, subject):
    require(isinstance(value, dict) and set(value) == set(expected),
            f"{subject}: unexpected or missing fields")


def json_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"duplicate JSON key: {key}")
        result[key] = value
    return result


def decode_json(body):
    return json.loads(body, object_pairs_hook=json_object)


def unique_index(values, subject):
    result = {}
    for key, value in values:
        require(key not in result, f"{subject}: duplicate key {key}")
        result[key] = value
    return result


def clause_sources(read):
    texts = {path: read(path).splitlines(keepends=True) for path in set(CLAUSES.values())}
    result = {}
    for clause, path in CLAUSES.items():
        lines = texts[path]
        if clause == "P-71-Q5":
            starts = [i for i, line in enumerate(lines) if line.startswith("| **P-71-Q5** ")]
        else:
            starts = [i for i, line in enumerate(lines)
                      if (match := BOUNDARY_HEADER.match(line)) and match[1] == clause]
        require(len(starts) == 1, f"{clause}: missing or repeated governing clause")
        start = starts[0]
        end = start + 1 if clause == "P-71-Q5" else next(
            (i for i in range(start + 1, len(lines)) if BOUNDARY_HEADER.match(lines[i])
             or lines[i].startswith("## ")), len(lines))
        result[clause] = (path, start + 1, lines[start:end])
    return result


def boundary_units(clauses):
    result = []
    for clause, (path, start, lines) in clauses.items():
        fenced = False
        for i, line in enumerate(lines):
            if line.startswith("```"):
                fenced = not fenced
            if not fenced and (i == 0 or BOUNDARY_UNIT.match(line)):
                result.append((f"{clause}/{digest(line.rstrip())[:16]}", (clause, path, start + i)))
    return unique_index(result, "governing units")


def declared_effects(sources):
    registry = decode_json(sources[REGISTRY])
    entries = [entry for entry in registry["entries"]
               if entry["observerId"] == "polaris-butlers-project-shape"]
    require(len(entries) == 1, "observer registry: expected the one scoped entry")
    entry = entries[0]
    authority = entry["typedAuthority"]
    properties = ("readAuthority", "writeSurface", "databaseAccess", "networkAccess",
                  "executeObservedCode", "workingTreeRead")
    require(set(authority) == {*properties, "authorityType", "questions"},
            "observer registry: authority field population changed")
    version = f'{entry["observerId"]} {entry["observerVersion"]}'
    effects = [(f"observer/{key}", (REGISTRY, version, json.dumps(authority[key], ensure_ascii=False)))
               for key in properties]

    direct_routes = ROUTE.findall(sources[ROUTES])
    require(direct_routes[:2] == [("GET", "directPath", "human-open"),
                                  ("GET", "tailnetPath", "human-open")],
            "POC routes: paired route declaration is missing or changed")
    routes = direct_routes[2:]
    for direct, tailnet in MOUNT_PAIR.findall(sources[ROUTES]):
        routes.extend((("GET", direct, "human-open"), ("GET", tailnet, "human-open")))
    for path, rows in ((ROUTES, routes), (MATERIALIZE, ROUTE.findall(sources[MATERIALIZE]))):
        effects.extend((f"route/{method} {route}", (path, method, credential))
                       for method, route, credential in rows)
    effects.extend((f"effect/{identity}", (CORE, name, surface))
                   for name, identity, surface in EFFECT.findall(sources[CORE]))
    return unique_index(effects, "effect declarations")


def check_population(expected, actual, subject):
    missing = sorted(set(expected) - set(actual))
    orphan = sorted(set(actual) - set(expected))
    require(not missing and not orphan, f"{subject}: missing {missing}, orphan {orphan}")


def text_field(value, subject):
    require(isinstance(value, str) and len(value.splitlines()) == 1 and bool(value.strip()),
            f"{subject}: expected one nonempty line")


def validate_boundaries(mappings, units, sources):
    identifiers = set()
    for unit, row in mappings.items():
        kind = row.get("disposition")
        require(kind in ("context", "prose-only", "typed-refusal"),
                f"{unit}: unsupported disposition")
        if kind == "context":
            fields(row, ("disposition", "rationale"), unit)
            text_field(row["rationale"], f"{unit} context rationale")
            continue
        extra = "binding" if kind == "typed-refusal" else "rationale"
        fields(row, ("disposition", "arm", "scope", extra), unit)
        text_field(row["arm"], f"{unit} arm")
        text_field(row["scope"], f"{unit} scope")
        clause = units[unit][0]
        key = f'{clause}/{row["arm"]}'
        require(bool(re.fullmatch(r"[a-z][a-z0-9-]*", row["arm"])), f"{unit}: invalid arm key")
        require(key not in identifiers, f"duplicate boundary arm: {key}")
        identifiers.add(key)
        if kind == "prose-only":
            text_field(row["rationale"], f"{unit} prose-only rationale")
        else:
            require(clause == "P-71-Q5" and row["binding"] == FORECLOSURE,
                    f"{unit}: typed refusal binding does not match exact effect, reason, caller and control")
            for path, witness in TYPED_WITNESSES:
                require(sources[path].count(witness) == 1,
                        f"{unit}: typed refusal witness missing or repeated in {path}")
    require(any(units[unit][0] == "P-71-Q5" and row["disposition"] == "typed-refusal"
                for unit, row in mappings.items()), "P-71-Q5: typed refusal is required")


def effect_authority(key):
    if key.startswith("observer/"):
        return "PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT", ACT, None
    if key in ("effect/butlers-tracker-write", "route/POST MATERIALIZE_HUMAN_PATH",
               "route/POST MATERIALIZE_TAILNET_PATH"):
        return "P-71-Q5", RULING, SECURITY
    require(key.startswith("route/GET "), f"{key}: no reviewed effect authority")
    for family, identity, path in (
        ("ORRERY_", "POC-REQ-050", POC_SPEC),
        ("TRAJECTORY_", "POC-REQ-042", POC_SPEC),
        ("POLARIS_SOURCE_", "PWB-REQ-011", PWB_SPEC),
        ("POLARIS_PRESENTATION_", "PWB-REQ-020", PWB_SPEC),
        ("POLARIS_", "POC-REQ-030", POC_SPEC),
    ):
        if family in key:
            return identity, path, SECURITY
    require(key.removeprefix("route/GET ") in (
        "POC_HUMAN_PATH", "POC_MACHINE_PATH", "TAILNET_MOUNT_PREFIX",
        "`${TAILNET_MOUNT_PREFIX}/`", "`${TAILNET_MOUNT_PREFIX}${POC_MACHINE_PATH}`"),
        f"{key}: no reviewed route authority")
    return "Three-Surface POC reader notes", POC_SPEC, SECURITY


def render(manifest, clauses, units, effects, pins):
    def cell(value):
        return str(value).replace("|", "&#124;").replace("`", "&#96;")

    def link(path, line=None):
        locator = f"{Path(path).name}:{line}" if line else Path(path).name
        return f"[{locator}](../{path})"

    lines = [
        "# N6 boundary register",
        "",
        "Generated by [build_boundary_register.py](../scripts/build_boundary_register.py).",
        "This scoped register records governing boundaries and declared effects for the",
        "Three-Surface POC observer, routes and Materialize action. Its rows grant no authority.",
        "Prose-only records preserve the clause and mark exact typed enforcement **Unknown**.",
        "The declared effects show the local declarations and their governing scope.",
        "They record no live read, operation, credential or deployment result.",
        "",
        f"Reviewed scope at `{manifest['reviewed_base']}` covers {len(clauses)} governing clauses",
        f"and {len(units)} source units, including explanatory context. The input digests below",
        "bind the selected clause text and exact declaration/evidence files.",
        "",
        "## Governing boundary dispositions",
        "",
        "| Arm | Governing source | Disposition | Scope and evidence |",
        "| --- | --- | --- | --- |",
    ]
    for unit, (clause, path, line) in units.items():
        row = manifest["boundaries"][unit]
        if row["disposition"] == "context":
            continue
        if row["disposition"] == "prose-only":
            evidence = "Prose-only · typed enforcement Unknown"
            detail = cell(row["rationale"])
        else:
            evidence = "Typed refusal · foreclosed"
            detail = f'{link(CORE)}, {link(MATERIALIZE)}, {link(CORE_TEST)} and {link(MATERIALIZE_TEST)}.'
        lines.append(f'| {clause}/{row["arm"]} | {link(path, line)} | {evidence} | '
                     f'{cell(row["scope"])} {detail} |')
    lines.extend(("", "## Declared effects", "",
                  "| Effect key | Declaration | Declared value | Governing scope |",
                  "| --- | --- | --- | --- |"))
    for key, (source, mode, value) in sorted(effects.items()):
        authority, path, constraint = effect_authority(key)
        constrained = f" · [SEC-1](../{constraint})" if constraint else ""
        lines.append(f"| {cell(key)} | {link(source)} | {cell(mode)} · {cell(value)} | "
                     f"[{authority}](../{path}){constrained} |")
    lines.extend(("", "## Source pins", "", "| Subject | Exact SHA-256 |", "| --- | --- |"))
    lines.extend(f"| {key} | `{value}` |" for key, value in sorted(pins.items()))
    return "\n".join((*lines, ""))


def build(read):
    manifest = decode_json(read(MANIFEST))
    fields(manifest, ("reviewed_base", "pins", "boundaries", "effects"), "input manifest")
    require(isinstance(manifest["reviewed_base"], str)
            and re.fullmatch(r"[0-9a-f]{40}", manifest["reviewed_base"]),
            "input manifest: expected exact reviewed base")

    for field in ("pins", "boundaries", "effects"):
        require(isinstance(manifest[field], dict), f"input manifest: {field} must be an object")
    clauses = clause_sources(read)
    sources = {path: read(path) for path in PINNED_SOURCE.values()}
    pins = {clause: digest("".join(lines)) for clause, (_, _, lines) in clauses.items()}
    pins.update({key: digest(sources[path]) for key, path in PINNED_SOURCE.items()})
    check_population(pins, manifest["pins"], "source pins")
    drift = [key for key, value in pins.items() if manifest["pins"][key] != value]
    require(not drift, f"scoped sources changed; reconcile exact bytes: {', '.join(drift)}")

    units = boundary_units(clauses)
    mappings = manifest["boundaries"]
    check_population(units, mappings, "governing units")
    validate_boundaries(mappings, units, sources)

    effects = declared_effects(sources)
    check_population(effects, manifest["effects"], "declared effects")
    for key, authority in manifest["effects"].items():
        require(authority == effect_authority(key)[0], f"{key}: governing declaration mismatch")
    return render(manifest, clauses, units, effects, pins), len(units) + len(effects)


def reader(root):
    def read(path):
        return (root / path).read_bytes().decode("utf-8")
    return read


def check(read):
    try:
        output, count = build(read)
        require(read(REGISTER) == output, "generated register is stale; regenerate and review")
    except (InvalidRegister, OSError, UnicodeError, KeyError, TypeError, AttributeError,
            json.JSONDecodeError) as error:
        return 0, str(error)
    return count, None


def selftest_cases():
    # Only synthetic repository inputs. The production bindings and source names
    # are the schema of this test, not the source of its expected result.
    data = {
        VISION: "**VIS-4 — Owner decision** synthetic rule\n**VIS-5 — Direct writes** synthetic rule\n",
        SECURITY: "".join(f"**SEC-{n} — Synthetic boundary** no unclassified input\n"
                          for n in range(1, 6)),
        RULING: "| **P-71-Q5** synthetic foreclosure |\n",
        ACT: "Synthetic observer act\n",
        REGISTRY: json.dumps({"entries": [{
            "observerId": "polaris-butlers-project-shape", "observerVersion": "fixture",
            "typedAuthority": {"authorityType": "version-control", "questions": [],
                               "readAuthority": "declared", "writeSurface": [],
                               "databaseAccess": [], "networkAccess": [],
                               "executeObservedCode": False, "workingTreeRead": False},
        }]}),
        CORE: ("export const EFFECT: Effect = { id: 'butlers-tracker-write', surface: 'butlers:.beads', };\n"
               "refusedBy: 'foreclosed',\n      foreclosure,\n"
               "citation: 'P-71-Q5',\n"),
        CORE_TEST: "effectAuthority({ writeSurface: ['butlers:.beads'] }, BUTLERS_TRACKER_WRITE)\n",
        ROUTES: ("{ method: 'GET', path: directPath, credentialClass: 'human-open', handle },\n"
                 "{ method: 'GET', path: tailnetPath, credentialClass: 'human-open', handle },\n"
                 "{ method: 'GET', path: POC_HUMAN_PATH, credentialClass: 'human-open', handle },\n"),
        MATERIALIZE: ("const verdict = (options.authorize ?? dispatchAuthorization)();\n"
                      "    if (!verdict.authorized) {\n}\n"
                      "{ method: 'POST', path: MATERIALIZE_HUMAN_PATH, credentialClass: 'human-open', handle },\n"),
        MATERIALIZE_TEST: ("it('refuses the foreclosed write with a bounded typed refusal and "
                           "never runs Beads (P-71-Q5)', syntheticTest);\n"),
    }
    fixture_clauses = {clause: next(line for line in data[path].splitlines(keepends=True)
                                    if f"**{clause}" in line)
                       for clause, path in CLAUSES.items()}
    manifest = {
        "reviewed_base": "1" * 40,
        "pins": {clause: digest(line) for clause, line in fixture_clauses.items()},
        "boundaries": {},
        "effects": {f"observer/{key}": "PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT"
                    for key in ("readAuthority", "writeSurface", "databaseAccess", "networkAccess",
                                "executeObservedCode", "workingTreeRead")},
    }
    manifest["pins"].update({name: digest(data[path]) for name, path in PINNED_SOURCE.items()})
    manifest["effects"].update({"route/GET POC_HUMAN_PATH": "Three-Surface POC reader notes",
                                "route/POST MATERIALIZE_HUMAN_PATH": "P-71-Q5",
                                "effect/butlers-tracker-write": "P-71-Q5"})
    boundary_keys = {clause: f"{clause}/{digest(line.rstrip())[:16]}"
                     for clause, line in fixture_clauses.items()}
    for clause, key in boundary_keys.items():
        manifest["boundaries"][key] = {"disposition": "prose-only", "arm": "fixture",
                                       "scope": clause + " synthetic restriction",
                                       "rationale": "No whole-arm refusal witness in this fixture."}
    first = boundary_keys["VIS-4"]
    typed = boundary_keys["P-71-Q5"]
    manifest["boundaries"][typed] = {"disposition": "typed-refusal", "arm": "fixture",
                                     "scope": "synthetic foreclosure", "binding": {
                                         "reason": "foreclosed", "effect": "butlers-tracker-write",
                                         "caller": "materializeRoutes",
                                         "control": ("refuses the foreclosed write with a bounded typed "
                                                     "refusal and never runs Beads (P-71-Q5)"),
                                     }}
    data[MANIFEST] = json.dumps(manifest)
    data[REGISTER], _ = build(data.__getitem__)
    cases = [("complete fixture and explicit Unknown", check(data.__getitem__) == (17, None)
              and "Prose-only · typed enforcement Unknown" in data[REGISTER]
              and "Typed refusal · foreclosed" in data[REGISTER])]
    for name, path, body, wanted in (
        ("new boundary", VISION, data[VISION] + "- No new effect.\n", "scoped sources changed"),
        ("changed evidence", CORE_TEST, data[CORE_TEST] + "changed\n", "scoped sources changed"),
        ("stale generated bytes", REGISTER, data[REGISTER] + "changed\n", "generated register is stale"),
    ):
        changed = {**data, path: body}
        count, failure = check(changed.__getitem__)
        cases.append((name, count == 0 and failure is not None and wanted in failure))

    new_boundary = {**data, VISION: data[VISION] + "- No new effect.\n"}
    new_manifest = deepcopy(manifest)
    new_manifest["pins"]["VIS-5"] = digest(fixture_clauses["VIS-5"] + "- No new effect.\n")
    new_boundary[MANIFEST] = json.dumps(new_manifest)
    count, failure = check(new_boundary.__getitem__)
    cases.append(("unmapped new unit after source repin", count == 0 and failure is not None
                  and "governing units: missing" in failure))

    no_witness = {**data, CORE_TEST: "unrelated assertion\n"}
    new_manifest = deepcopy(manifest)
    new_manifest["pins"]["effect-control"] = digest(no_witness[CORE_TEST])
    no_witness[MANIFEST] = json.dumps(new_manifest)
    count, failure = check(no_witness.__getitem__)
    cases.append(("missing refusal witness after source repin", count == 0 and failure is not None
                  and "typed refusal witness missing" in failure and CORE_TEST in failure))

    changed = dict(data)
    changed[MANIFEST] = data[MANIFEST].replace('"reviewed_base":', '"reviewed_base": "", "reviewed_base":', 1)
    count, failure = check(changed.__getitem__)
    cases.append(("duplicate input key", count == 0 and failure == "duplicate JSON key: reviewed_base"))

    trials = (
        ("missing arm", "boundaries", first, None, "governing units: missing"),
        ("orphan arm", "boundaries", "orphan", manifest["boundaries"][first], "orphan ['orphan']"),
        ("missing prose-only rationale", "boundaries", first,
         {**manifest["boundaries"][first], "rationale": ""}, "prose-only rationale"),
        ("wrong effect refusal", "boundaries", typed,
         {**manifest["boundaries"][typed], "binding": {**FORECLOSURE, "reason": "not-in-write-surface"}},
         "typed refusal binding does not match"),
        ("wrong enforcing caller", "boundaries", typed,
         {**manifest["boundaries"][typed], "binding": {**FORECLOSURE, "caller": "other"}},
         "typed refusal binding does not match"),
        ("foreclosed effect misclassified as prose-only", "boundaries", typed,
         manifest["boundaries"][first], "P-71-Q5: typed refusal is required"),
        ("missing effect", "effects", "observer/writeSurface", None, "declared effects: missing"),
        ("wrong governing authority", "effects", "route/GET POC_HUMAN_PATH", "SEC-1", "governing declaration mismatch"),
    )
    for name, section, key, value, wanted in trials:
        changed_manifest = deepcopy(manifest)
        if value is None:
            del changed_manifest[section][key]
        else:
            changed_manifest[section][key] = value
        changed = {**data, MANIFEST: json.dumps(changed_manifest)}
        count, failure = check(changed.__getitem__)
        cases.append((name, count == 0 and failure is not None and wanted in failure))
    return cases


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify without rewriting")
    parser.add_argument("--selftest", action="store_true", help="exercise synthetic inputs")
    args = parser.parse_args()
    if args.selftest:
        cases = selftest_cases()
        for name, passed in cases:
            print(f"{'pass' if passed else 'FAIL'}  {name}")
        return int(any(not passed for _, passed in cases))
    read = reader(ROOT)
    if args.check:
        count, failure = check(read)
        print(f"Boundary register: {failure}" if failure else f"Boundary register: {count} entries verified")
        return int(failure is not None)
    try:
        output, _ = build(read)
    except (InvalidRegister, OSError, UnicodeError, KeyError, TypeError, AttributeError,
            json.JSONDecodeError) as error:
        print(f"Boundary register: {error}", file=sys.stderr)
        return 1
    (ROOT / REGISTER).write_bytes(output.encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
