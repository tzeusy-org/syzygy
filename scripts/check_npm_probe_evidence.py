"""Replay the supplemental ancestor and path-filter controls on a Syzygy tree."""
import argparse
import ast
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


ALIAS = "docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py"
ROOT = "docs/evidence/syzygy-bpyt-39/root_exception_probe.py"
RECORD = "docs/evidence/syzygy-bpyt-8-39/record.py"
REFERENCE = "docs/evidence/syzygy-bpyt-8-39/npm-alias-probe.json"
TRACES = (
    "docs/evidence/syzygy-bpyt-39/npmrc-trace-lane-probe-after.json",
    "docs/evidence/syzygy-bpyt-49/npmrc-trace-lane-probe-guarded.json",
)
SOURCE_DIGESTS = {
    ALIAS: "d0681b01b953b0dcff793cb4c6331245ee3c0c101d0977909df30cd0c6444812",
    ROOT: "d7b29a5401027f1c1da70c349872b6aca915f662b9c80811f4f9138cc55b9b17",
    RECORD: "b3e8d599cdfd96e1fe048e8d7944d347f6a7cc58d374222f60f0c670e8f83f60",
}
CASES = (
    ("parent-package-json", "p", "package.json", "p/s"),
    ("parent-node-modules", "p", "node_modules", "p/s"),
    ("grandparent-package-json", "g", "package.json", "g/p/s"),
    ("great-grandparent-package-json", "gg", "package.json", "gg/g/p/s"),
)
GRANDPARENT = CASES[2][0]
GREAT_GRANDPARENT = CASES[3][0]
MUTANTS = (
    ("G0-unmutated", None, None, ()),
    ("G1-node-modules-not-looked-for", "('package.json', 'node_modules')",
     "('package.json',)", (CASES[1][0],)),
    ("G2-package-json-not-looked-for", "('package.json', 'node_modules')",
     "('node_modules',)", (CASES[0][0], GRANDPARENT, GREAT_GRANDPARENT)),
    ("G3-only-the-parent-looked-at", "    up = os.path.dirname(up)\n",
     "    break\n", (GRANDPARENT, GREAT_GRANDPARENT)),
    ("G4-two-levels-only", "while True:\n", "for _ in range(2):\n", (GREAT_GRANDPARENT,)),
)
GUARD_END = "ancestor guard finished"
HOOK_LINE = "    since = [p for p in hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split()) if not p.startswith(f'{HERE_REL}/')]\n"
AFTER_FILTER = "    since = hooked('since', [p for p in git('diff', '--name-only', REPAIR1, HEAD).split() if not p.startswith(f'{HERE_REL}/')])\n"
LATE_CHANGE = "suite: HEAD differs from REPAIR1 beyond testkit comment lines:"
FOREIGN_PATH = "docs/evidence/syzygy-bpyt-8-36/since-control.json"
PLACE_TEST = """
baseline = main_summary()
MUTATE['@since'] = lambda paths: [*paths, f'{HERE_REL}/since-control.json']
own = main_summary()
MUTATE['@since'] = lambda paths: [*paths, 'docs/evidence/syzygy-bpyt-8-36/since-control.json']
foreign = main_summary()
print(json.dumps({
    'baselineProblems': baseline['problems'],
    'ownEqualsBaseline': own == baseline,
    'ownProblems': own['problems'],
    'foreignProblems': foreign['problems'],
}))
"""


def git(tree, *args):
    env = dict(os.environ, GIT_NO_REPLACE_OBJECTS="1", GIT_NO_LAZY_FETCH="1")
    return subprocess.check_output(("git", "-C", str(tree), *args), env=env)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def one_edit(text, old, new):
    if text.count(old) != 1:
        raise ValueError("expected one mutation site")
    return text.replace(old, new, 1)


def ancestor_prefix(text):
    node = ast.parse(text)
    loops = [
        stmt for stmt in node.body
        if isinstance(stmt, ast.While) and isinstance(stmt.test, ast.Constant) and stmt.test.value is True
    ]
    if len(loops) != 1 or loops[0].end_lineno is None:
        raise ValueError("the ancestor guard must have one top-level while loop")
    return "".join(text.splitlines(keepends=True)[:loops[0].end_lineno])


def child(program, args, private, timeout=20):
    env = {"PATH": os.defpath, "HOME": str(private), "TMPDIR": str(private), "LANG": "C.UTF-8",
           "GIT_NO_REPLACE_OBJECTS": "1", "GIT_NO_LAZY_FETCH": "1"}
    return subprocess.run((sys.executable, "-I", "-B", str(program), *map(str, args)),
                          env=env, text=True, capture_output=True, timeout=timeout, check=False)


def guard_results(probe, data, private):
    variants = []
    prefix = ancestor_prefix(data.decode("utf-8"))
    program = private / "probe-guard.py"
    for name, old, new, unrefused in MUTANTS:
        code = prefix if old is None else one_edit(prefix, old, new)
        program.write_text(f"{code}\nprint({GUARD_END!r})\n", encoding="utf-8")
        outcomes = []
        for case, anchor, marker, relative in CASES:
            case_root = private / name / case
            scratch = case_root / relative
            scratch.mkdir(parents=True)
            marker_path = case_root / anchor / marker
            if marker == "package.json":
                marker_path.write_text("{}\n", encoding="utf-8")
            else:
                marker_path.mkdir()
            output = case_root / "unused.json"
            result = child(program, (scratch, output), private)
            refusal = (
                f"{marker_path.parent} holds a package.json or node_modules, so npm would read its .npmrc: "
                "use a scratch directory outside any npm project"
            )
            if result.returncode == 1 and result.stderr.strip() == refusal and not result.stdout:
                outcome = "refused"
            elif result.returncode == 0 and not result.stderr and result.stdout.strip() == GUARD_END:
                outcome = "reached-guard-end"
            else:
                raise ValueError(f"{probe} {name} {case} unexpected child result {result.returncode}")
            expected = "reached-guard-end" if case in unrefused else "refused"
            if outcome != expected or output.exists():
                raise ValueError(f"{probe} {name} {case} got {outcome}, expected {expected}")
            outcomes.append({"case": case, "outcome": outcome, "exit": result.returncode})
        variants.append({"id": name, "old": old, "new": new, "cases": outcomes})
    return {"path": probe, "sha256": digest(data), "variants": variants}


def placement_results(tree, data, private):
    original = data.decode("utf-8")
    late = one_edit(original, HOOK_LINE, AFTER_FILTER)
    program = private / "record.py"
    results = []
    for original_placement, code in ((True, original), (False, late)):
        program.write_text(one_edit(code, "\n\nmain()\n", "\n" + PLACE_TEST), encoding="utf-8")
        run = child(program, (tree,), private, timeout=120)
        if run.returncode != 0 or run.stderr:
            raise ValueError(f"{RECORD} placement control failed to run, exit {run.returncode}")
        result = json.loads(run.stdout)
        if result["baselineProblems"]:
            raise ValueError(f"{RECORD} baseline has problems")
        own = result["ownProblems"]
        foreign = result["foreignProblems"]
        if result["ownEqualsBaseline"] != original_placement or (not own) != original_placement:
            raise ValueError(f"{RECORD} own-evidence placement control did not discriminate")
        if len(foreign) != 1 or not foreign[0].startswith(LATE_CHANGE) or FOREIGN_PATH not in foreign[0]:
            raise ValueError(f"{RECORD} foreign-evidence placement control did not discriminate")
        if not original_placement and (
            len(own) != 1 or not own[0].startswith(LATE_CHANGE) or "syzygy-bpyt-8-39/since-control.json" not in own[0]
        ):
            raise ValueError(f"{RECORD} displaced hook did not fail the named own-path check")
        results.append({"placement": "before-filter" if original_placement else "after-filter", **result})
    program.write_text(late, encoding="utf-8")
    old_test = child(program, (tree, "--selftest"), private, timeout=120)
    tally = "selftest: 77/77 mutations make a check fail"
    if old_test.returncode != 0 or old_test.stderr or old_test.stdout.splitlines()[-1:] != [tally]:
        raise ValueError(f"{RECORD} the original selftest did not reproduce its held 77/77 after the mutation")
    return {"path": RECORD, "sha256": digest(data), "old": HOOK_LINE, "new": AFTER_FILTER,
            "results": results, "oldSelftestAfterMutation": {"exit": old_test.returncode, "tally": tally}}


def trace_routes(tree, revision, current):
    routes = []
    reference = digest(git(tree, "show", f"{revision}:{REFERENCE}"))
    for path in TRACES:
        data = git(tree, "show", f"{revision}:{path}")
        trace = json.loads(data)
        if (trace["probe"] != ALIAS or trace["exit"] != 0 or trace["recordEqualsReference"] is not True
                or trace["reference"] != REFERENCE or trace["recordSha256"] != reference):
            raise ValueError(f"{path} does not identify the expected alias result record")
        routes.append({"path": path, "sha256": digest(data), "probeSha256": trace["probeSha256"],
                       "record": REFERENCE, "recordSha256": reference})
    if routes[0]["probeSha256"] == current or routes[1]["probeSha256"] != current:
        raise ValueError("the retained traces do not distinguish the earlier and current probe")
    return routes


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tree", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--revision", required=True, help="full commit object ID in the Syzygy tree")
    args = parser.parse_args()
    tree = args.tree.resolve()
    revision = args.revision
    if not re.fullmatch(r"[0-9a-f]{40}", revision) or git(tree, "rev-parse", f"{revision}^{{commit}}").decode().strip() != revision:
        parser.error("--revision must name an exact commit")
    sources = {path: git(tree, "show", f"{revision}:{path}") for path in SOURCE_DIGESTS}
    for path, data in sources.items():
        if digest(data) != SOURCE_DIGESTS[path]:
            raise ValueError(f"{path} differs from the pinned evidence source")
    with tempfile.TemporaryDirectory(prefix="npm-evidence-") as area:
        private = Path(area)
        guards = []
        for path in (ALIAS, ROOT):
            probe_area = private / Path(path).stem
            probe_area.mkdir()
            guards.append(guard_results(path, sources[path], probe_area))
        placement = placement_results(tree, sources[RECORD], private)
        traces = trace_routes(tree, revision, guards[0]["sha256"])
    print(json.dumps({"sourceCommit": revision, "guards": guards, "placement": placement, "traces": traces},
                     indent=2))


if __name__ == "__main__":
    main()
