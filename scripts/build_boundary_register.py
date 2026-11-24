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
REVIEWED_BASE = "1e30b1c196c691565fc2d858649aa4942306e305"
REVIEWED_CONTEXT_SHA256 = "a609d181d8473deb8bd3087c74314ee2d8551d638f221d283fb186aea11fa5a4"
VISION = ".syzygy/governance/doctrine/vision.md"
SECURITY = ".syzygy/governance/doctrine/security.md"
RULING = ".syzygy/governance/decisions/POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md"
ACT = ".syzygy/governance/decisions/PWB-OBSERVER-REGISTRY-MACHINE-CEILING-ACT.md"
BRIEFING_DECISION = (".syzygy/governance/decisions/"
                     "PWB-BRIEFING-IMPLEMENTATION-SCOPE-DECISION.md")
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
POC_READER = "Three-Surface POC reader notes"
SPEC_SUBJECTS = {
    POC_SPEC: (POC_READER, "POC-REQ-030", "POC-REQ-042", "POC-REQ-050"),
    PWB_SPEC: ("PWB-REQ-011", "PWB-REQ-020"),
}
REQUIREMENT = re.compile(r"^### Requirement: ([A-Z]+-REQ-[0-9]+)\b")
SPEC_SECTION = re.compile(r"^#{1,2} ")

BOUNDARY_HEADER = re.compile(r"^\*\*((?:VIS|SEC)-[0-9]+) —")
BOUNDARY_UNIT = re.compile(r"^(?:- | {2,4}(?:[-*]|[0-9]+\.) )")
ROUTE = re.compile(r"\{\s*method: '([A-Z]+)',\s*path: ([^,\n]+),"
                   r"\s*credentialClass: '([a-z-]+)',\s*handle\b")
ROUTE_PROPERTY = re.compile(r"(?:^|\{)[ \t]*method\s*:", re.M)
MOUNT_PAIR = re.compile(r"^[ \t]*\.\.\.humanSurfaceRoutes\((\w+), (\w+),", re.M)
SPREAD_ROW = re.compile(r"^[ \t]*\.\.\.", re.M)
BRIEFING_PATHS = ("POC_BRIEFING_PATH", "`${TAILNET_MOUNT_PREFIX}${POC_BRIEFING_PATH}`")
BRIEFING_ROUTES = tuple(("GET", path, "machine-credentialed") for path in BRIEFING_PATHS)
BRIEFING_KEYS = tuple(f"route/GET {path}" for path in BRIEFING_PATHS)
BRIEFING_SPREAD = (
    "    ...(briefingResponseLimit === undefined ? [] : [\n"
    + "".join(f"      {{ method: '{method}', path: {path}, credentialClass: '{credential}', handle: briefingHandle }},\n"
              for method, path, credential in BRIEFING_ROUTES)
    + "    ] as const),\n"
)
BRIEFING_REGISTRY_DIGEST = re.compile(r"^Exact digest \(SHA-256\): `([a-f0-9]{64})`$", re.M)
EFFECT_PROPERTY = re.compile(r"^\s*(?:export )?const \w+\s*:\s*Effect\s*=", re.M)
EFFECT = re.compile(r"(?:export )?const (\w+): Effect = \{\s*id: '([^']+)',"
                    r"\s*surface: '([^']+)',\s*\};")
PINNED_SOURCE = {
    "poc-spec-authorization": ".syzygy/governance/decisions/THREE-SURFACE-POC-SPEC-AUTHORIZATION.md",
    "source-read-spec-act": ".syzygy/governance/decisions/PWB-EXACT-SOURCE-RENDER-MODE-AMENDMENT-ACT.md",
    "machine-read-spec-act": ".syzygy/governance/decisions/PWB-MACHINE-VIEW-AMENDMENT-ACT.md",
    "observer-act": ACT,
    "briefing-scheduling-decision": BRIEFING_DECISION,
    "observer-registry": REGISTRY,
    "effect-authority": CORE,
    "effect-control": CORE_TEST,
    "poc-routes": ROUTES,
    "materialize-routes": MATERIALIZE,
    "materialize-control": MATERIALIZE_TEST,
}
# Independent frozen review of the complete declaration inputs. The manifest
# records per-source drift, while this subject prevents a manifest-only repin
# from certifying a syntax the deliberately scoped extractor did not read.
DECLARATION_SOURCES = ("effect-authority", "materialize-routes", "observer-registry", "poc-routes")
REVIEWED_DECLARATIONS_SHA256 = "66a83b4ef7124179ebbad4a50681869c73f93b8f8d8e8b08ecc2617637a60f19"
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


def spec_sources(read):
    result = {}
    for path, subjects in SPEC_SUBJECTS.items():
        lines = read(path).splitlines(keepends=True)
        openings = {}
        for offset, line in enumerate(lines):
            requirement = REQUIREMENT.match(line)
            if requirement:
                identity = requirement[1]
            elif path == POC_SPEC and line.rstrip() == "## ADDED Requirements":
                identity = POC_READER
            elif SPEC_SECTION.match(line):
                identity = None
            else:
                continue
            openings[offset] = identity
        spans = list(openings)
        for start, end in zip(spans, [*spans[1:], len(lines)]):
            identity = openings[start]
            if identity in subjects:
                require(identity not in result, f"{identity}: repeated specification subject")
                result[identity] = (path, start + 1, "".join(lines[start:end]))
        require(set(subjects) <= set(result), f"{path}: missing specification subjects "
                f"{sorted(set(subjects) - set(result))}")
    return result


def route_declarations(body, subject):
    rows = ROUTE.findall(body)
    require(len(rows) == len(ROUTE_PROPERTY.findall(body)),
            f"{subject}: unsupported route declaration")
    return rows


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

    direct_routes = route_declarations(sources[ROUTES], "POC routes")
    require(direct_routes[:2] == [("GET", "directPath", "human-open"),
                                  ("GET", "tailnetPath", "human-open")],
            "POC routes: paired route declaration is missing or changed")
    routes = direct_routes[2:]
    route_array = sources[ROUTES].partition("const routes: readonly Route[] = [")[2]
    require(bool(route_array), "POC routes: selected route array missing")
    briefing_spreads = route_array.count(BRIEFING_SPREAD)
    require(briefing_spreads <= 1, "POC routes: repeated briefing registration")
    other_routes = route_array.replace(BRIEFING_SPREAD, "")
    mounted_pairs = MOUNT_PAIR.findall(other_routes)
    require(len(mounted_pairs) == len(SPREAD_ROW.findall(other_routes)),
            "POC routes: unsupported indirect route declaration")
    briefing_routes = tuple(row for row in routes if row[1] in BRIEFING_PATHS)
    require(briefing_routes == BRIEFING_ROUTES * briefing_spreads,
            "POC routes: briefing routes must be the exact conditional machine pair")
    if briefing_spreads:
        ceiling = entry["resourceLimits"].get("maxBriefingResponseBytes")
        require(type(ceiling) is int and ceiling == 20_480,
                "Briefing registry: expected the distinct 20,480-byte response ceiling")
        require(BRIEFING_REGISTRY_DIGEST.findall(sources[ACT]) == [digest(sources[REGISTRY])],
                "Briefing registry: exact observer act digest does not bind the declaration")
    for direct, tailnet in mounted_pairs:
        routes.extend((("GET", direct, "human-open"), ("GET", tailnet, "human-open")))
    materialize_routes = route_declarations(sources[MATERIALIZE], "Materialize routes")
    return_array = sources[MATERIALIZE].rpartition("return [")[2]
    require(bool(return_array) and not SPREAD_ROW.search(return_array),
            "Materialize routes: missing or unsupported indirect return")
    for path, rows in ((ROUTES, routes), (MATERIALIZE, materialize_routes)):
        for method, route, credential in rows:
            value = credential
            if path == ROUTES and route in BRIEFING_PATHS:
                value += " · conditional on the briefing ceiling callback"
            effects.append((f"route/{method} {route}", (path, method, value)))
    named = EFFECT.findall(sources[CORE])
    require(len(named) == len(EFFECT_PROPERTY.findall(sources[CORE])),
            "Effect authority: unsupported effect declaration")
    effects.extend((f"effect/{identity}", (CORE, name, surface))
                   for name, identity, surface in named)
    return unique_index(effects, "effect declarations")


def check_population(expected, actual, subject):
    missing = sorted(set(expected) - set(actual))
    orphan = sorted(set(actual) - set(expected))
    require(not missing and not orphan, f"{subject}: missing {missing}, orphan {orphan}")


def text_field(value, subject):
    require(isinstance(value, str) and len(value.splitlines()) == 1 and bool(value.strip()),
            f"{subject}: expected one nonempty line")


def validate_boundaries(mappings, units, sources, context_sha256):
    context_ids = sorted(unit for unit, row in mappings.items() if row.get("disposition") == "context")
    require(digest("\n".join(context_ids)) == context_sha256,
            "governing context classification diverges from the independently reviewed set")
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
    if key in BRIEFING_KEYS:
        return "PWB-REQ-020", PWB_SPEC, SECURITY
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
    return POC_READER, POC_SPEC, SECURITY


def render(manifest, clauses, specs, units, effects, pins):
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
        "bind the selected doctrine, specification and evidence bytes. Source repinning alone",
        "cannot update the independently reviewed context and complete declaration subjects.",
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
        if key in BRIEFING_KEYS:
            constrained += (f" · [SEC-5](../{SECURITY}) · [A-213 scope](../{BRIEFING_DECISION})"
                            f" · [20,480-byte declaration](../{REGISTRY}) · [exact digest binding](../{ACT})")
        authority_title = f"{authority} (line {specs[authority][1]})" if authority in specs else authority
        lines.append(f"| {cell(key)} | {link(source)} | {cell(mode)} · {cell(value)} | "
                     f"[{authority_title}](../{path}){constrained} |")
    lines.extend(("", "## Source pins", "", "| Subject | Exact SHA-256 |", "| --- | --- |"))
    lines.extend(f"| {key} | `{value}` |" for key, value in sorted(pins.items()))
    lines.extend(("", "The reviewed declared-effect source subject is",
                  f"`{declaration_digest(pins)}`."))
    return "\n".join((*lines, ""))


def declaration_digest(pins):
    return digest("\n".join(f"{key}:{pins[key]}" for key in DECLARATION_SOURCES))


def build(read, *, context_sha256=REVIEWED_CONTEXT_SHA256,
          declarations_sha256=REVIEWED_DECLARATIONS_SHA256):
    manifest = decode_json(read(MANIFEST))
    fields(manifest, ("reviewed_base", "pins", "boundaries", "effects"), "input manifest")
    require(manifest["reviewed_base"] == REVIEWED_BASE,
            "input manifest: reviewed base differs from the exact reviewed reference")

    for field in ("pins", "boundaries", "effects"):
        require(isinstance(manifest[field], dict), f"input manifest: {field} must be an object")
    clauses = clause_sources(read)
    specs = spec_sources(read)
    sources = {path: read(path) for path in PINNED_SOURCE.values()}
    pins = {clause: digest("".join(lines)) for clause, (_, _, lines) in clauses.items()}
    pins.update({identity: digest(body) for identity, (_, _, body) in specs.items()})
    pins.update({key: digest(sources[path]) for key, path in PINNED_SOURCE.items()})
    check_population(pins, manifest["pins"], "source pins")
    drift = [key for key, value in pins.items() if manifest["pins"][key] != value]
    require(not drift, f"scoped sources changed; reconcile exact bytes: {', '.join(drift)}")
    require(declaration_digest(pins) == declarations_sha256,
            "declared effect sources differ from the exact independently reviewed declaration inputs")

    units = boundary_units(clauses)
    mappings = manifest["boundaries"]
    check_population(units, mappings, "governing units")
    validate_boundaries(mappings, units, sources, context_sha256)

    effects = declared_effects(sources)
    check_population(effects, manifest["effects"], "declared effects")
    for key, authority in manifest["effects"].items():
        require(authority == effect_authority(key)[0], f"{key}: governing declaration mismatch")
    return render(manifest, clauses, specs, units, effects, pins), len(units) + len(effects)


def reader(root):
    def read(path):
        return (root / path).read_bytes().decode("utf-8")
    return read


def check(read, *, context_sha256=REVIEWED_CONTEXT_SHA256,
          declarations_sha256=REVIEWED_DECLARATIONS_SHA256):
    try:
        output, count = build(read, context_sha256=context_sha256,
                              declarations_sha256=declarations_sha256)
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
                 "const routes: readonly Route[] = [\n"
                 "{ method: 'GET', path: POC_HUMAN_PATH, credentialClass: 'human-open', handle },\n];\n"),
        MATERIALIZE: ("const verdict = (options.authorize ?? dispatchAuthorization)();\n"
                      "    if (!verdict.authorized) {\n}\n"
                      "return [\n"
                      "{ method: 'POST', path: MATERIALIZE_HUMAN_PATH, credentialClass: 'human-open', handle },\n];\n"),
        MATERIALIZE_TEST: ("it('refuses the foreclosed write with a bounded typed refusal and "
                           "never runs Beads (P-71-Q5)', syntheticTest);\n"),
    }
    fixture_specs = {
        "Three-Surface POC reader notes": "## ADDED Requirements\nSynthetic adopted read notes.\n",
        "POC-REQ-030": "### Requirement: POC-REQ-030 — Synthetic Polaris requirement\n",
        "POC-REQ-042": "### Requirement: POC-REQ-042 — Synthetic Trajectory requirement\n",
        "POC-REQ-050": "### Requirement: POC-REQ-050 — Synthetic Orrery requirement\n",
        "PWB-REQ-011": "### Requirement: PWB-REQ-011 — Synthetic source requirement\n",
        "PWB-REQ-020": "### Requirement: PWB-REQ-020 — Synthetic machine requirement\n",
    }
    data[POC_SPEC] = "".join(list(fixture_specs.values())[:4])
    data[PWB_SPEC] = "".join(list(fixture_specs.values())[4:])
    for label, path in PINNED_SOURCE.items():
        data.setdefault(path, f"Synthetic source for {label}\n")
    fixture_clauses = {clause: next(line for line in data[path].splitlines(keepends=True)
                                    if f"**{clause}" in line)
                       for clause, path in CLAUSES.items()}
    manifest = {
        "reviewed_base": REVIEWED_BASE,
        "pins": {key: digest(line) for key, line in {**fixture_clauses, **fixture_specs}.items()},
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
    context = boundary_keys["VIS-5"]
    manifest["boundaries"][context] = {"disposition": "context",
                                       "rationale": "Synthetic reviewed heading summary."}
    context_sha256 = digest(context)
    declarations_sha256 = declaration_digest(manifest["pins"])

    def result(inputs, *, reviewed_declarations=declarations_sha256):
        return check(inputs.__getitem__, context_sha256=context_sha256,
                     declarations_sha256=reviewed_declarations)

    data[MANIFEST] = json.dumps(manifest)
    data[REGISTER], _ = build(data.__getitem__, context_sha256=context_sha256,
                              declarations_sha256=declarations_sha256)
    cases = [("complete fixture and explicit Unknown", result(data) == (17, None)
              and "Prose-only · typed enforcement Unknown" in data[REGISTER]
              and "Typed refusal · foreclosed" in data[REGISTER])]
    for name, path, body, wanted in (
        ("new boundary", VISION, data[VISION] + "- No new effect.\n", "scoped sources changed"),
        ("changed evidence", CORE_TEST, data[CORE_TEST] + "changed\n", "scoped sources changed"),
        ("missing cited requirement", POC_SPEC, data[POC_SPEC].replace("POC-REQ-050", "POC-REQ-098"),
         "missing specification subjects ['POC-REQ-050']"),
        ("changed cited requirement", PWB_SPEC, data[PWB_SPEC].replace("Synthetic machine", "Changed machine"),
         "scoped sources changed; reconcile exact bytes: PWB-REQ-020"),
        ("stale generated bytes", REGISTER, data[REGISTER] + "changed\n", "generated register is stale"),
    ):
        changed = {**data, path: body}
        count, failure = result(changed)
        cases.append((name, count == 0 and failure is not None and wanted in failure))

    new_boundary = {**data, VISION: data[VISION] + "- No new effect.\n"}
    new_manifest = deepcopy(manifest)
    new_manifest["pins"]["VIS-5"] = digest(fixture_clauses["VIS-5"] + "- No new effect.\n")
    new_boundary[MANIFEST] = json.dumps(new_manifest)
    count, failure = result(new_boundary)
    cases.append(("unmapped new unit after source repin", count == 0 and failure is not None
                  and "governing units: missing" in failure))

    no_witness = {**data, CORE_TEST: "unrelated assertion\n"}
    new_manifest = deepcopy(manifest)
    new_manifest["pins"]["effect-control"] = digest(no_witness[CORE_TEST])
    no_witness[MANIFEST] = json.dumps(new_manifest)
    count, failure = result(no_witness)
    cases.append(("missing refusal witness after source repin", count == 0 and failure is not None
                  and "typed refusal witness missing" in failure and CORE_TEST in failure))

    changed = dict(data)
    changed[MANIFEST] = data[MANIFEST].replace('"reviewed_base":', '"reviewed_base": "", "reviewed_base":', 1)
    count, failure = result(changed)
    cases.append(("duplicate input key", count == 0 and failure == "duplicate JSON key: reviewed_base"))

    changed = {**data, MANIFEST: json.dumps({**manifest, "reviewed_base": "0" * 40})}
    count, failure = result(changed)
    cases.append(("rewritten reviewed base", count == 0 and failure is not None
                  and "reviewed base differs" in failure))

    materialize = data[MATERIALIZE].replace("MATERIALIZE_HUMAN_PATH", "UNRELATED_POST_PATH")
    new_manifest = deepcopy(manifest)
    new_manifest["pins"]["materialize-routes"] = digest(materialize)
    del new_manifest["effects"]["route/POST MATERIALIZE_HUMAN_PATH"]
    new_manifest["effects"]["route/POST UNRELATED_POST_PATH"] = "P-71-Q5"
    changed = {**data, MATERIALIZE: materialize, MANIFEST: json.dumps(new_manifest)}
    count, failure = result(changed, reviewed_declarations=declaration_digest(new_manifest["pins"]))
    cases.append(("unrelated POST cannot borrow foreclosure", count == 0 and failure is not None
                  and failure == "route/POST UNRELATED_POST_PATH: no reviewed effect authority"))

    head_route = data[ROUTES].replace("];", "{ method: 'HEAD', path: POC_HUMAN_PATH, "
                                      "credentialClass: 'human-open', handle },\n];")
    changed = {**data, ROUTES: head_route}
    count, failure = result(changed)
    cases.append(("new HEAD stale source", count == 0 and failure is not None
                  and "scoped sources changed; reconcile exact bytes: poc-routes" in failure))

    new_manifest = deepcopy(manifest)
    new_manifest["pins"]["poc-routes"] = digest(head_route)
    changed[MANIFEST] = json.dumps(new_manifest)
    count, failure = result(changed)
    cases.append(("new HEAD exact source review still required after source repin", count == 0
                  and failure == "declared effect sources differ from the exact independently reviewed declaration inputs"))
    count, failure = result(changed, reviewed_declarations=declaration_digest(new_manifest["pins"]))
    cases.append(("new HEAD remains unmapped after source repin", count == 0 and failure is not None
                  and "missing ['route/HEAD POC_HUMAN_PATH']" in failure))

    new_manifest["effects"]["route/HEAD POC_HUMAN_PATH"] = "Three-Surface POC reader notes"
    changed[MANIFEST] = json.dumps(new_manifest)
    count, failure = result(changed, reviewed_declarations=declaration_digest(new_manifest["pins"]))
    cases.append(("new HEAD cannot borrow GET authority", count == 0
                  and failure == "route/HEAD POC_HUMAN_PATH: no reviewed effect authority"))

    for name, source in (
        ("dynamic method", data[ROUTES].replace("method: 'GET', path: POC_HUMAN_PATH", "method: requestMethod, path: POC_HUMAN_PATH")),
        ("extra spread", data[ROUTES].replace("];", "  ...additionalRoutes,\n];")),
    ):
        new_manifest = deepcopy(manifest)
        new_manifest["pins"]["poc-routes"] = digest(source)
        changed = {**data, ROUTES: source, MANIFEST: json.dumps(new_manifest)}
        count, failure = result(changed, reviewed_declarations=declaration_digest(new_manifest["pins"]))
        cases.append((name, count == 0 and failure is not None and failure.startswith("POC routes: unsupported")))

    for name, declaration in (
        ("quoted method cannot be hidden by a repin",
         "{ 'method': 'HEAD', path: POC_HUMAN_PATH, credentialClass: 'human-open', handle },"),
        ("reordered properties cannot be hidden by a repin",
         "{ path: POC_HUMAN_PATH, method: 'HEAD', credentialClass: 'human-open', handle },"),
    ):
        routes = data[ROUTES].replace("];", declaration + "\n];")
        new_manifest = deepcopy(manifest)
        new_manifest["pins"]["poc-routes"] = digest(routes)
        changed = {**data, ROUTES: routes, MANIFEST: json.dumps(new_manifest)}
        count, failure = result(changed)
        cases.append((name, count == 0
                      and failure == "declared effect sources differ from the exact independently reviewed declaration inputs"))

    # One synthetic conditional machine pair with independent literal outcomes.
    briefing_block = (
        "    ...(briefingResponseLimit === undefined ? [] : [\n"
        "      { method: 'GET', path: POC_BRIEFING_PATH, credentialClass: 'machine-credentialed', handle: briefingHandle },\n"
        "      { method: 'GET', path: `${TAILNET_MOUNT_PREFIX}${POC_BRIEFING_PATH}`, credentialClass: 'machine-credentialed', handle: briefingHandle },\n"
        "    ] as const),\n"
    )
    briefing_registry = json.loads(data[REGISTRY])
    briefing_registry["entries"][0]["resourceLimits"] = {"maxBriefingResponseBytes": 20_480}
    briefing_inputs = {
        **data,
        ROUTES: data[ROUTES].replace("];", briefing_block + "];"),
        REGISTRY: json.dumps(briefing_registry),
    }
    briefing_inputs[ACT] = f"Exact digest (SHA-256): `{digest(briefing_inputs[REGISTRY])}`\n"
    briefing_manifest = deepcopy(manifest)
    briefing_manifest["effects"].update({
        "route/GET POC_BRIEFING_PATH": "PWB-REQ-020",
        "route/GET `${TAILNET_MOUNT_PREFIX}${POC_BRIEFING_PATH}`": "PWB-REQ-020",
    })

    def briefing_case(inputs):
        mapping = deepcopy(briefing_manifest)
        mapping["pins"].update({key: digest(inputs[path]) for key, path in PINNED_SOURCE.items()})
        return {**inputs, MANIFEST: json.dumps(mapping)}, declaration_digest(mapping["pins"])

    bound, approved = briefing_case(briefing_inputs)
    bound[REGISTER], count = build(bound.__getitem__, context_sha256=context_sha256,
                                    declarations_sha256=approved)
    cases.append(("conditional briefing machine pair and binding", count == 19
                  and result(bound, reviewed_declarations=approved) == (19, None)
                  and bound[REGISTER].count("machine-credentialed · conditional on the briefing ceiling callback") == 2
                  and bound[REGISTER].count("[A-213 scope]") == 2
                  and bound[REGISTER].count("[SEC-5]") == 2))
    count, failure = result(bound)
    cases.append(("briefing repin alone refuses a new declaration subject", count == 0
                  and failure == "declared effect sources differ from the exact independently reviewed declaration inputs"))

    for name, routes, reason in (
        ("briefing cannot drop one mount", briefing_block.replace(briefing_block.splitlines(keepends=True)[2], ""),
         "POC routes: unsupported indirect route declaration"),
        ("briefing cannot change credential", briefing_block.replace("'machine-credentialed'", "'human-open'", 1),
         "POC routes: unsupported indirect route declaration"),
        ("briefing cannot bypass callback", "".join(briefing_block.splitlines(keepends=True)[1:3]),
         "POC routes: briefing routes must be the exact conditional machine pair"),
        ("briefing cannot change callback polarity", briefing_block.replace("=== undefined", "!== undefined"),
         "POC routes: unsupported indirect route declaration"),
        ("briefing cannot repeat registration", briefing_block * 2,
         "POC routes: repeated briefing registration"),
    ):
        changed, reviewed = briefing_case({**briefing_inputs, ROUTES: data[ROUTES].replace("];", routes + "];")})
        count, failure = result(changed, reviewed_declarations=reviewed)
        cases.append((name, count == 0 and failure == reason))

    incorrect_ceiling = briefing_inputs[REGISTRY].replace("20480", "20481")
    changed, reviewed = briefing_case({
        **briefing_inputs, REGISTRY: incorrect_ceiling,
        ACT: f"Exact digest (SHA-256): `{digest(incorrect_ceiling)}`\n",
    })
    count, failure = result(changed, reviewed_declarations=reviewed)
    cases.append(("briefing cannot borrow an altered registry ceiling", count == 0
                  and failure == "Briefing registry: expected the distinct 20,480-byte response ceiling"))
    changed, reviewed = briefing_case({**briefing_inputs, ACT: data[ACT]})
    count, failure = result(changed, reviewed_declarations=reviewed)
    cases.append(("briefing requires the act's exact registry digest", count == 0
                  and failure == "Briefing registry: exact observer act digest does not bind the declaration"))
    count, failure = result({**bound, BRIEFING_DECISION: "unreviewed"}, reviewed_declarations=approved)
    cases.append(("briefing scheduling decision bytes are pinned", count == 0
                  and failure == "scoped sources changed; reconcile exact bytes: briefing-scheduling-decision"))

    trials = (
        ("relabelled prohibition", "boundaries", first,
         {"disposition": "context", "rationale": "Improper hiding of a boundary."},
         "governing context classification diverges"),
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
        count, failure = result(changed)
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
