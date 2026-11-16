#!/usr/bin/env python3
"""P115 preparation only: independent literal compatibility examples.

No Syzygy imports. No network, observed project, renderer, production serializer,
provider or daemon is executed. Its local expansion is an oracle operation, not
an installed P115 consumer. A runtime implementation has not been tested here.
"""

import argparse
import copy
import datetime
import hashlib
import json
import re
import sys
import tempfile
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
F = (
    ROOT
    / ".syzygy/governance/contracts/candidates/three-surface-poc-governedby-reference-amendment/compatibility/literal-fixtures"
)
OUT = None


class Rejected(Exception):
    def __init__(self, predicate, detail):
        self.predicate = predicate
        self.detail = detail
        super().__init__(predicate + ": " + detail)


def require(condition, predicate, detail):
    if not condition:
        raise Rejected(predicate, detail)


def pairs_no_duplicate(pairs):
    result = {}
    for k, v in pairs:
        require(k not in result, "duplicate-json-key", k)
        result[k] = v
    return result


def parse(text):
    return json.loads(text, object_pairs_hook=pairs_no_duplicate)


def load(name):
    return parse((F / name).read_text())


def sha(data):
    return hashlib.sha256(data).hexdigest()


def expected_tuple():
    # Closed candidate value, written independently of fixtures and product helpers.
    return {
        "label": "Unknown",
        "closedReason": "source-uncaptured-or-unreachable",
        "resolutionRoutes": [
            {
                "reason": "source-uncaptured-or-unreachable",
                "route": "Repair the observer/source; new snapshot",
                "actor": "operator",
                "verb": "repair",
                "target": "evaluation",
            }
        ],
    }


def expand(body):
    """Validate all items first. Resolve exactly one enclosing-observation hop."""
    wi = body.get("workItems", {})
    if wi.get("kind") == "unknown":
        require(
            set(wi) == {"kind", "reason"} and isinstance(wi["reason"], str),
            "unknown-observation",
            "No invented shared value/items/count on Unknown",
        )
        return copy.deepcopy(body), []
    require(
        wi.get("kind") == "observed",
        "invalid-governing-intent-reference",
        "Unrecognized observation",
    )
    require(
        wi.get("governedBy") == expected_tuple(),
        "invalid-governing-intent-reference",
        "Missing or non-identical complete observation-local value",
    )
    require(
        isinstance(wi.get("items"), list),
        "invalid-governing-intent-reference",
        "Missing item population",
    )
    for item in wi["items"]:
        require(
            item.get("governedBy") == {"ref": "observation"},
            "invalid-governing-intent-reference",
            "Only the one-key enclosing-observation reference is admitted",
        )
    resolved = copy.deepcopy(body)
    shared = resolved["workItems"].pop("governedBy")
    hops = []
    for item in resolved["workItems"]["items"]:
        item["governedBy"] = copy.deepcopy(shared)
        hops.append(
            {
                "itemId": item["id"],
                "hops": 1,
                "lookup": "this body / this workItems observation",
            }
        )
    return resolved, hops


class Node:
    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.parent = parent
        self.children = []

    def text(self):
        return "".join(c if isinstance(c, str) else c.text() for c in self.children)

    def descendants(self):
        for c in self.children:
            if isinstance(c, Node):
                yield c
                yield from c.descendants()


class Tree(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]
        self.feed(text)
        self.close()

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in {"meta", "input", "br", "hr", "img", "link"}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        require(
            len(self.stack) > 1 and self.stack[-1].tag == tag,
            "html-structure",
            "Unbalanced " + tag,
        )
        self.stack.pop()

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def nodes(parent, attr, value=None):
    return [
        n
        for n in parent.descendants()
        if attr in n.attrs and (value is None or n.attrs[attr] == value)
    ]


def one(values, what):
    require(len(values) == 1, "human-population", what + ": " + str(len(values)))
    return values[0]


def text_field(parent, name):
    return norm(one(nodes(parent, "data-parity-field", name), name).text())


def route_fields(node, prefix, out):
    route = one(nodes(node, "data-unknown-route"), "one literal route")
    out[prefix + "/reason"] = route.attrs["data-unknown-route"]
    out[prefix + "/route"] = norm(route.text())
    for name in ["actor", "verb", "target"]:
        out[prefix + "/" + name] = route.attrs["data-route-" + name]


def human_facts(html):
    tree = Tree(html)
    root = tree.root
    require(
        not [n for n in root.descendants() if n.tag == "script"],
        "scriptless",
        "No scripts in this literal HTML sample",
    )
    out = {}
    cards = nodes(root, "data-work-item-id")
    require(len(cards) == 2, "human-population", "two sampled item cards")
    for card in cards:
        item_id = card.attrs["data-work-item-id"]
        p = "item:" + item_id
        out[p + "/id"] = text_field(card, "work-item-id")
        out[p + "/title"] = text_field(card, "work-item-title")
        out[p + "/status"] = text_field(card, "work-item-status")
        out[p + "/wrapperLabel"] = card.attrs["data-governed-by"]
        mark = one(
            nodes(card, "data-parity-field", "work-item-governed-by"),
            "one per-item governedBy marker",
        )
        match = re.search(r"Governing intent: ([^.]+)\.", norm(mark.text()))
        require(match is not None, "human-label", "literal label sentence")
        out[p + "/label"] = match[1]
        out[p + "/closedReason"] = mark.attrs["data-unknown-reason"]
        out[p + "/subjectId"] = mark.attrs["data-unknown-disclosure"]
        out[p + "/basis"] = mark.attrs["title"]
        route_fields(mark, p + "/route", out)
    region = one(
        nodes(root, "data-parity-field", "work-item-governed-by-count"),
        "one count region",
    )
    out["region/subjectId"] = region.attrs["data-unknown-disclosure"]
    out["region/closedReason"] = region.attrs["data-unknown-reason"]
    route_fields(region, "region/route", out)
    require(
        norm(
            one(
                [n for n in region.descendants() if n.tag == "code"],
                "visible count reason",
            ).text()
        )
        == out["region/closedReason"],
        "human-reason",
        "visible reason agrees with marked reason",
    )
    for suffix, field in [
        ("unknown", "count"),
        ("inside", "inside"),
        ("outside", "outside"),
    ]:
        out["count/" + suffix] = int(text_field(region, "governed-by-unknown-" + field))
    total = re.search(r"of (\d+) observed work items", norm(region.text()))
    require(total is not None, "human-count", "served denominator text")
    out["count/served"] = int(total[1])
    warrant = "Supplying an item's warrant resolves its governing intent."
    require(
        warrant in norm(region.text()), "warrant-literal", "unchanged human instruction"
    )
    footer = one(
        [n for n in root.descendants() if n.tag == "footer"], "one evaluation footer"
    )
    codes = [n for n in footer.descendants() if n.tag == "code"]
    require(len(codes) == 3, "human-population", "three footer values")
    out["evaluation/snapshot"] = norm(codes[0].text())
    out["evaluation/asOf"] = norm(codes[1].text())
    out["project/revision"] = text_field(footer, "surface-substrate-revision")
    population = Counter(
        n.attrs["data-parity-field"] for n in nodes(root, "data-parity-field")
    )
    required = {
        "work-item-title": 2,
        "work-item-id": 2,
        "work-item-status": 2,
        "work-item-governed-by": 2,
        "work-item-governed-by-count": 1,
        "governed-by-unknown-count": 1,
        "governed-by-unknown-inside": 1,
        "governed-by-unknown-outside": 1,
        "surface-substrate-revision": 1,
    }
    require(
        dict(population) == required,
        "human-marker-population",
        "Every declared marker belongs to one sampled family; no extras or missing markers",
    )
    require(
        len(nodes(root, "data-unknown-disclosure")) == 3
        and len(nodes(root, "data-unknown-route")) == 3,
        "human-population",
        "three distinct disclosures and routes",
    )
    return out, dict(population)


def machine_facts(expanded):
    wi = expanded["workItems"]
    by_id = {i["id"]: i for i in wi["items"]}
    subjects = {s["id"]: s["epistemic"] for s in expanded["unknownSubjects"]}
    require(len(by_id) == len(wi["items"]), "item-identity", "No duplicate item id")
    require(
        len(subjects) == len(expanded["unknownSubjects"]),
        "subject-identity",
        "No pooled/duplicate subject id",
    )
    out = {}
    inside = 0
    for rendered in expanded["trajectory"]["rendered"]:
        item_id = rendered["id"]
        item = by_id[item_id]
        v = item["governedBy"]
        p = "item:" + item_id
        subject_id = "work-item:" + item_id + "/governed-by"
        subject = subjects[subject_id]
        require(
            {k: subject[k] for k in ["label", "closedReason", "resolutionRoutes"]} == v,
            "subject-value",
            "Each existing subject retains its own matching effective value",
        )
        for key in ["id", "title", "status"]:
            out[p + "/" + key] = item[key]
        out[p + "/wrapperLabel"] = subject["label"]
        out[p + "/label"] = v["label"]
        out[p + "/closedReason"] = v["closedReason"]
        out[p + "/subjectId"] = subject_id
        out[p + "/basis"] = subject["reason"]
        for key, value in v["resolutionRoutes"][0].items():
            out[p + "/route/" + key] = value
        inside += (
            v["label"] == "Unknown"
            and v["closedReason"] == "source-uncaptured-or-unreachable"
        )
    region = subjects["region:work-item-governing-intent"]
    out["region/subjectId"] = "region:work-item-governing-intent"
    out["region/closedReason"] = region["closedReason"]
    for key, value in region["resolutionRoutes"][0].items():
        out["region/route/" + key] = value
    measured = sum(
        i["governedBy"]["label"] == "Unknown"
        and i["governedBy"]["closedReason"] == "source-uncaptured-or-unreachable"
        for i in wi["items"]
    )
    require(
        wi["governedByUnknownCount"] == measured,
        "count-value",
        "Stored served count equals measured effective items",
    )
    out["count/unknown"] = wi["governedByUnknownCount"]
    out["count/served"] = len(wi["items"])
    out["count/inside"] = inside
    out["count/outside"] = wi["governedByUnknownCount"] - inside
    out["evaluation/snapshot"] = expanded["evaluation"]["snapshot"]
    out["evaluation/asOf"] = expanded["evaluation"]["asOf"]
    out["project/revision"] = expanded["project"]["revision"]
    return out


def preserve(before, after):
    require(
        before["evaluation"] == after["evaluation"],
        "evaluation-identity",
        "The complete E object must be equal, not just snapshot/revision",
    )
    a = before["workItems"]
    b = after["workItems"]
    for key in ["kind", "beadPrefix", "provenance", "capturedAt"]:
        require(a.get(key) == b.get(key), "observation-identity", key)
    require(
        [{k: v for k, v in item.items() if k != "governedBy"} for item in a["items"]]
        == [
            {k: v for k, v in item.items() if k != "governedBy"} for item in b["items"]
        ],
        "item-identity",
        "Item identities/order/membership and all unpooled metadata",
    )
    require(
        before["trajectory"] == after["trajectory"],
        "selection-identity",
        "Existing rendered selection remains unchanged",
    )
    require(
        before["unknownSubjects"] == after["unknownSubjects"],
        "subject-identity",
        "Every separately served subject record stays byte-value identical",
    )
    require(
        before == after,
        "full-projection-equality",
        "Expansion restores exactly the bounded original projection",
    )


def check_pair(body, html):
    before = load("inline-body-A.json")
    expanded, hops = expand(body)
    preserve(before, expanded)
    machine = machine_facts(expanded)
    human, population = human_facts(html)
    literal = load("expected-effective-facts.json")
    literal.pop("region/warrant")
    require(
        machine == literal,
        "literal-machine-oracle",
        "Machine effective facts match separately authored fixed literal values",
    )
    require(
        human == machine,
        "effective-field-parity",
        "Every sampled human scalar equals the expanded machine fact for the same E",
    )
    # No-script sample oracle gets its expected values from this machine answer.
    # Human parsing executes no script and imports no renderer.
    require(
        all(human.get(k) == value for k, value in machine.items()),
        "scriptless-sample",
        "All machine-derived sampled expected facts occur in this no-script projection",
    )
    return {
        "scalarFactPopulation": len(machine),
        "parityMarkerPopulation": sum(population.values()),
        "parityMarkerFamilies": population,
        "routePopulation": 3,
        "governingIntentSubjectPopulation": 3,
        "itemHopEvidence": hops,
        "expandedExactlyEqualsInlineProjection": True,
        "machineDerivedScriptlessSamplePopulation": len(machine),
        "humanWarrantInstructionLiteral": True,
    }


def set_path(obj, path, new, delete=False):
    node = obj
    for step in path[:-1]:
        node = node[step]
    old = copy.deepcopy(node[path[-1]]) if path[-1] in node else "<absent>"
    if delete:
        del node[path[-1]]
    else:
        node[path[-1]] = copy.deepcopy(new)
    return old


def run_examples():
    reference = load("reference-body-A.json")
    html = (F / "human-body-A.html").read_text()
    results = []
    positive = check_pair(reference, html)
    # A physical inline-property reader is deliberately incompatible with the new reference.
    require(
        reference["workItems"]["items"][0]["governedBy"].get("label") is None,
        "raw-property-control",
        "Expected missing inline label",
    )
    raw_control = {
        "inlineLabel": load("inline-body-A.json")["workItems"]["items"][0][
            "governedBy"
        ]["label"],
        "referenceInlineLabel": reference["workItems"]["items"][0]["governedBy"].get(
            "label"
        ),
        "rawPropertyEquality": False,
        "expandedEffectiveEquality": True,
    }
    b = load("reference-body-B.json")
    b_expanded, b_hops = expand(b)
    require(
        b_expanded["evaluation"] == b["evaluation"]
        and b_expanded["workItems"]["provenance"] == b["workItems"]["provenance"]
        and b_expanded["workItems"]["capturedAt"] == b["workItems"]["capturedAt"],
        "separate-body-identity",
        "No identity borrowed from A",
    )
    empty = load("reference-empty.json")
    empty_x, empty_hops = expand(empty)
    require(
        empty_x["workItems"]["items"] == []
        and empty_x["workItems"]["governedByUnknownCount"] == 0
        and not empty_hops,
        "empty-observation",
        "Observed empty has measured zero and no item claims",
    )
    unknown = load("unknown-observation.json")
    unknown_x, unknown_hops = expand(unknown)
    require(
        unknown_x == unknown
        and not unknown_hops
        and "items" not in unknown_x["workItems"]
        and "governedByUnknownCount" not in unknown_x["workItems"],
        "unknown-observation",
        "Unknown is never silently empty or zero",
    )
    catalog = load("../COUNTEREXAMPLES.json")
    require(
        catalog["population"] == 42 and catalog["rejectedAtExpectedPredicate"] == 42,
        "fixture-population",
        "42 independently retained counterexamples",
    )
    cases = [c for c in catalog["cases"] if c["kind"] in {"machine", "human"}]
    require(
        len(cases) == 39 and len({c["id"] for c in cases}) == 39,
        "fixture-population",
        "39 distinct machine/human cases plus three cross-body/duplicate-key controls",
    )
    mutants = OUT / "executed-counterexamples"
    mutants.mkdir(exist_ok=True)
    for c in cases:
        body = copy.deepcopy(reference)
        human = html
        if c["kind"] == "machine":
            actual_old = set_path(body, c["path"], c["new"], c["delete"])
            require(actual_old == c["old"], "harness-target", c["id"])
            wire = json.dumps(body, indent=2) + "\n"
            subject = mutants / (c["id"] + ".json")
            subject.write_text(wire)
        else:
            require(c["old"] in html, "harness-target", c["id"])
            human = html.replace(c["old"], c["new"], 1)
            subject = mutants / (c["id"] + ".html")
            subject.write_text(human)
        require(
            sha(subject.read_bytes()) == c["sha256"], "harness-mutated-subject", c["id"]
        )
        try:
            check_pair(body, human)
        except Rejected as error:
            require(
                error.predicate == c["expectedPredicate"],
                "wrong-rejection-predicate",
                c["id"] + " " + error.predicate + " != " + c["expectedPredicate"],
            )
            results.append(
                {
                    **c,
                    "outcome": "rejected-as-expected",
                    "actualPredicate": error.predicate,
                    "detail": error.detail,
                    "fixture": str(subject.relative_to(OUT)),
                    "sha256": sha(subject.read_bytes()),
                }
            )
        else:
            raise AssertionError("Counterexample survived: " + c["id"])
    # Execute valid A before B missing its own shared value. The checker is stateless.
    expand(reference)
    missing_b = copy.deepcopy(b)
    missing_b["workItems"].pop("governedBy")
    try:
        expand(missing_b)
    except Rejected as error:
        require(
            error.predicate == "invalid-governing-intent-reference",
            "cross-body-predicate",
            "Missing B rejected even immediately after valid A",
        )
        path = mutants / "cross-body-no-cache-borrow.json"
        path.write_text(json.dumps(missing_b, indent=2) + "\n")
        results.append(
            {
                "id": "cross-body-no-cache-borrow",
                "kind": "sequential-machine",
                "priorBody": "fixtures/reference-body-A.json",
                "body": "fixtures/reference-body-B.json",
                "old": b["workItems"]["governedBy"],
                "new": "<absent in B>",
                "outcome": "rejected-as-expected",
                "actualPredicate": error.predicate,
                "fixture": str(path.relative_to(OUT)),
                "sha256": sha(path.read_bytes()),
            }
        )
    else:
        raise AssertionError("Cross-body fallback survived")
    # Actual duplicate JSON-key cases cannot be represented by a Python dict.
    for key in ["governedBy", "ref"]:
        text = (
            '{"workItems":{"governedBy":{},"governedBy":{}}}'
            if key == "governedBy"
            else '{"governedBy":{"ref":"observation","ref":"other"}}'
        )
        try:
            parse(text)
        except Rejected as error:
            path = mutants / ("duplicate-" + key + ".json")
            path.write_text(text + "\n")
            results.append(
                {
                    "id": "duplicate-" + key,
                    "kind": "raw-json",
                    "old": "one " + key + " key",
                    "new": "duplicated " + key + " key",
                    "outcome": "rejected-as-expected",
                    "actualPredicate": error.predicate,
                    "fixture": str(path.relative_to(OUT)),
                    "sha256": sha(path.read_bytes()),
                }
            )
        else:
            raise AssertionError("Duplicate key survived")
    report = {
        "epistemic": "Observed",
        "recordedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "subject": {
            "sourceCommit": "eba011dfbe254c09a88ccc374b3efe5ff5df1762",
            "candidatePreparationBasis": "662b4b49505776c21856791abc52cda72346c5d9",
            "manifestFileSha256": "77e53d37ac42c5db4edb4f99d76d937629df5a80d370ac47751c0e62f27270bd",
        },
        "checkerSha256": sha(Path(__file__).read_bytes()),
        "pythonVersion": sys.version,
        "scope": "Synthetic literal bounded projections only; no production runtime or browser conformance result.",
        "positivePair": positive,
        "rawPhysicalPropertyControl": raw_control,
        "additionalPositiveCases": [
            {
                "id": "separate-body-B",
                "preservedEvaluationAndObservation": True,
                "itemHops": b_hops,
            },
            {
                "id": "observed-empty",
                "measuredCount": 0,
                "itemClaims": 0,
                "itemHops": empty_hops,
            },
            {
                "id": "unknown-observation",
                "inventedItemPopulation": False,
                "inventedCount": False,
                "itemHops": unknown_hops,
            },
        ],
        "counterexamplePopulation": len(results),
        "expectedRejections": len(results),
        "results": results,
        "runtimeP115Conformance": "Unknown; no implementation executed",
        "canonicalAnchorAdapterConformance": "Unknown; not exercised by these fixtures",
    }
    (OUT / "LITERAL-PAIR-RESULTS.json").write_text(json.dumps(report, indent=2) + "\n")
    lines = [
        "[Observed] Literal local-expansion evidence completed.",
        "[Observed] Positive A: "
        + str(positive["scalarFactPopulation"])
        + " scalar facts; "
        + str(positive["parityMarkerPopulation"])
        + " markers; 3 distinct subjects; 3 routes; 2 one-hop item resolutions.",
        "[Observed] Full bounded projection equals the inline baseline after expansion, including complete E, observation identity, item order/metadata and separate subject records.",
        "[Observed] Raw inline-property equality fails by design; expanded effective equality succeeds.",
        "[Observed] Additional positives: distinct body B, observed empty, Unknown observation.",
        "[Observed] Counterexamples rejected at intended predicate: "
        + str(len(results))
        + "/"
        + str(len(results))
        + ".",
    ]
    lines += ["[Observed] " + r["id"] + ": " + r["actualPredicate"] for r in results]
    lines += [
        "[Unknown] Actual P115 runtime/HTTP/browser conformance was not exercised.",
        "[Unknown] Broader canonical-anchor adaptation was not exercised.",
    ]
    (OUT / "LITERAL-PAIR-RESULTS.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines[:6]))


def main():
    global OUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", required=True)
    parser.parse_args()
    # All mutants and reports stay in owned temporary space; fixtures are read-only.
    with tempfile.TemporaryDirectory(prefix="p115-compatibility-examples-") as temp:
        OUT = Path(temp)
        run_examples()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
