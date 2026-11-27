"""Select the versioned P111 supervisor specification from its protected binding."""
from dataclasses import dataclass
from pathlib import Path
import hashlib
import json
import re

import check_spec_reconciliation as recon

SPEC_HOME = "openspec/changes/polaris-dossier-p111-supervisor-composition"
SPEC = f"{SPEC_HOME}/proposed/polaris-generation/spec.md"
DEPENDENCIES = f"{SPEC_HOME}/DEPENDENCY-PROJECTION.json"
# Exact regular-file subjects of the reviewed P111 source.
REVIEWED_SUBJECTS = {
    f"{SPEC_HOME}/.openspec.yaml":
        "d80b853b48e4aa975645172ad7ef5fa151e0123233d254d536f1f288336f6023",
    f"{SPEC_HOME}/CAPABILITY-COVERAGE.md":
        "4a01ece8cd363f64cb8580b8c6c1bcad03946a2d548a62d5830577b7d6a0ce66",
    f"{SPEC_HOME}/CONTRACT-COVERAGE.md":
        "cef894b87ea5316f2fd204dfd715d37a6254e680098f23f86f222d58de0ac17e",
    f"{SPEC_HOME}/CURRENT-REFERENCE-CENSUS.json":
        "b5887a7baeb5de99c0251fa2c96c78379949d5f854b98544d840e69f2179859c",
    f"{SPEC_HOME}/DEPENDENCY-PROJECTION.json":
        "945e8121368217da22838e0aab781c48d1f338cde38f1f4996c1a73e707afb3c",
    f"{SPEC_HOME}/RECORDER-EXERCISE.json":
        "36798aff0e5514f491842fa87cac43e11902b0c6067a04508220191e6cd95764",
    f"{SPEC_HOME}/REFERENCE-CENSUS.json":
        "838508505a51e5b2e90188ca4284316a260c178858d458d984ad27e5a0e7d61a",
    f"{SPEC_HOME}/ROLE-COMPOSITION.md":
        "77fe62a4870a1fd6367be870df77bcf76d4c499c56eddf4c258104bea3d8323f",
    f"{SPEC_HOME}/SEMANTIC-DELTA.md":
        "5bc5fddf65edcd3fae7b6ccda9089f7eb75436482a6a30a33f0ca2b4850ecb7b",
    f"{SPEC_HOME}/VERIFICATION.md":
        "dcd95f37eeaad77916166dc991089105f28a63c1e9c3c75b4c3904d4c13b738a",
    f"{SPEC_HOME}/design.md":
        "6b038805a1130c1cfb23ba2e80df00fd5ee30cfcc8d1622c6f2d2ed2d5c204f0",
    f"{SPEC_HOME}/proposal.md":
        "54d00fa2519302231049336446014b0376eb92420b63d8a37b3300e783c9b4ab",
    f"{SPEC_HOME}/proposed/polaris-generation/spec.md":
        "29cf8f11a4391834a756c5b6574cf6854f9b1e6e2a12e6ef879eb2ca5f8fa749",
    f"{SPEC_HOME}/tasks.md":
        "7b30eb1a2d1e6080a92e58e7bf4e86e02e88bfbc436ba34ea7e1da6ce40844f4",
}
TAG = recon.SUPERVISOR_COMPOSITION_TAG
REF = f"refs/tags/{TAG}"
KEY = "REQ-polaris-generation-048"
VBASE_KEY = "REQ-polaris-generation-034"
BASE_SUBJECT = "2b148403bfedabbfcdf7a9a40306003f85dbb6a3"
COVERAGE_SUBJECT = "23434d292245770bade94376844ddb42a4fc4c83"
COVERAGE_ANNOTATION = "802fce53b3417accd21f854b317b7071ef57ccf8"
STATUS, INDEX = recon.STATUS, recon.OPENSPEC_README
STATUS_PREFIX = "[P111 supervisor specification (REQ-048)]("
INDEX_PREFIX = "| [`polaris-dossier-p111-supervisor-composition`]("
STATUS_ROUTE = f"{STATUS_PREFIX}{SPEC}) follows its exact protected adoption, version and any recorded withdrawal."
INDEX_ROUTE = (f"{INDEX_PREFIX}changes/polaris-dossier-p111-supervisor-composition) | REQ-048 supervisor"
               " composition | State is selected from its protected binding | "
               "[Semantic delta](changes/polaris-dossier-p111-supervisor-composition/SEMANTIC-DELTA.md) |")
STATUS_COUNT_PREFIX = "With the P111 supervisor version effective, Polaris has "
STATUS_COUNT_SCOPE = "With the P111 supervisor version"
STATUS_COUNT = re.compile(re.escape(STATUS_COUNT_PREFIX) + r"(\d+) requirements and (\d+) scenarios\.")
HTML_COMMENT = re.compile(r"<!--.*?(?:-->|\Z)", re.S)


class Refusal(RuntimeError):
    pass


@dataclass(frozen=True)
class Binding:
    state: str
    text: str | None = None
    source: str | None = None
    warrants: dict | None = None


def require(condition, reason):
    if not condition:
        raise Refusal(reason)


def git(root, *args):
    return recon.local_git(root, *args)


def oid(root, ref):
    body = git(root, "rev-parse", "--verify", ref)
    return body.decode("ascii").strip() if body else None


def blob(root, commit, path):
    return git(root, "show", f"{commit}:{path}")


def entry(root, commit, path):
    return git(root, "ls-tree", "-z", commit, "--", path)


def reachable(root, source, commit):
    return git(root, "merge-base", "--is-ancestor", source, commit) is not None


def parts(row):
    return [cell.strip() for cell in row.split("|")[1:-1]]


def unique(rows, identity, row):
    return [line for line in rows if parts(line)[0] == identity] == [row]


def claims(rows):
    # A lone own-commit spec snapshot suffices to expose a malformed claim;
    # historical citations to other commits and tag mentions in Why do not.
    return [row for row in rows if recon.is_supervisor_composition_row(row)]


def route_lines(data, prefix):
    # Preserve placement. Removing a raw HTML comment can create an
    # apparent top-level route that GitHub cannot render as Markdown.
    text = HTML_COMMENT.sub(lambda match: re.sub(r"[^\r\n]", " ", match[0]), data.decode())
    return [line for line in recon.visible_route_lines(text) if line.startswith(prefix)]


def routes_at(root, commit, expected):
    status, index = blob(root, commit, STATUS), blob(root, commit, INDEX)
    require(status is not None and route_lines(status, STATUS_PREFIX) == ([STATUS_ROUTE] if expected else []),
            f"incorrect P111 route in {STATUS}")
    require(index is not None and route_lines(index, INDEX_PREFIX) == ([INDEX_ROUTE] if expected else []),
            f"incorrect P111 route in {INDEX}")
    counts = route_lines(status, STATUS_COUNT_SCOPE)
    if expected:
        require(len(counts) == 1 and STATUS_COUNT.fullmatch(counts[0]),
                f"incorrect P111 prospective count in {STATUS}")
    else:
        require(not counts, f"withdrawn P111 count remains in {STATUS}")
    return counts


def route_worktree(root, commit):
    for path, prefixes in ((STATUS, (STATUS_PREFIX, STATUS_COUNT_SCOPE)), (INDEX, (INDEX_PREFIX,))):
        snapshot = blob(root, commit, path)
        require(snapshot is not None, f"missing P111 route file {path}")
        worktree = (root / path).read_bytes()
        for prefix in prefixes:
            require(route_lines(worktree, prefix) == route_lines(snapshot, prefix),
                    f"dirty or shadowed P111 route in {path}")


def checked_predecessors(root, protected):
    required = (
        ("A-53", "polaris-dossier-run-tree-read-bounds-v2.18", BASE_SUBJECT,
         BASE_SUBJECT, recon.TREEREAD_SPEC),
        ("A-305", "polaris-dossier-coverage-hold-v2.28", COVERAGE_SUBJECT,
         COVERAGE_ANNOTATION, recon.COVHOLD_SPEC),
    )
    for identity, tag, source, annotation, path in required:
        ref = f"refs/tags/{tag}"
        rows = [row for row in recon.git_adoption_rows(root, protected) if parts(row)[0] == identity]
        require(len(rows) == 1 and len(parts(rows[0])) == 7, f"{identity} protected record unavailable")
        _, _, target, changed, _, _, tag_cell = parts(rows[0])
        path_entry = entry(root, source, path)
        require(target == f"`{source}`" and tag_cell == f"`{tag}`"
                and f"](https://github.com/tzeusy-org/syzygy/blob/{source}/{path})" in changed
                and oid(root, ref) == annotation and oid(root, ref+"^{commit}") == source
                and reachable(root, source, protected) and path_entry
                and path_entry.startswith(b"100644 blob ")
                and path_entry == entry(root, protected, path)
                and (root / path).read_bytes() == blob(root, protected, path),
                f"{identity} exact protected version or subject is unavailable")
    for binding in (recon.treeread_binding, recon.covhold_binding):
        text, records, subjects = binding(root)
        require(text is not None and not records and not subjects, "effective A-53/A-305 predecessor unavailable")
    return blob(root, BASE_SUBJECT, recon.TREEREAD_SPEC).decode()


def checked_subjects(root, source, current=None, protected=None):
    raw_paths = git(root, "ls-tree", "-r", "-z", "--name-only", source, "--", SPEC_HOME)
    require(raw_paths is not None
            and {path for path in raw_paths.split(b"\0") if path}
            == {path.encode("ascii") for path in REVIEWED_SUBJECTS},
            "the source has a different P111 subject inventory")
    for path, digest in REVIEWED_SUBJECTS.items():
        source_entry = entry(root, source, path)
        source_body = blob(root, source, path)
        require(source_entry and source_entry.startswith(b"100644 blob ")
                and source_body is not None and hashlib.sha256(source_body).hexdigest() == digest,
                f"reviewed P111 bytes or modes differ for {path}")
        if current is not None:
            worktree = root / path
            require(entry(root, current, path) == source_entry
                    and (protected is None or entry(root, protected, path) == source_entry)
                    and worktree.is_file() and not worktree.is_symlink()
                    and not (worktree.stat().st_mode & 0o111)
                    and worktree.read_bytes() == source_body,
                    f"reviewed P111 bytes or modes differ for {path}")


def checked_inverse(root, current, protected, source, disposition, rows):
    matches = [row for row in rows if parts(row)[0] == disposition]
    require(len(matches) == 1, "protected P111 disposition is ambiguous")
    inverse = parts(matches[0])[2].strip("`")
    require(re.fullmatch(r"[0-9a-f]{40}", inverse) and reachable(root, inverse, protected)
            and reachable(root, inverse, "HEAD"),
            "protected disposition does not name an exact inverse")
    source_parents = (git(root, "rev-list", "--parents", "-n1", source) or b"").split()
    inverse_parents = (git(root, "rev-list", "--parents", "-n1", inverse) or b"").split()
    require(len(source_parents) == len(inverse_parents) == 2 and reachable(root, source, inverse),
            "inverse lacks single-parent source and withdrawal lineage")
    parent = source_parents[1].decode("ascii")
    inverse_parent = inverse_parents[1].decode("ascii")
    reverse = recon.normalized_source_diff(root, source, parent)
    require(reverse and recon.normalized_source_diff(root, inverse_parent, inverse) == reverse,
            "recorded P111 withdrawal differs from the exact source inverse")
    for path in REVIEWED_SUBJECTS:
        worktree = root / path
        require(entry(root, parent, path) == entry(root, inverse, path)
                == entry(root, current, path) == entry(root, protected, path) == b""
                and not worktree.exists() and not worktree.is_symlink(),
                f"inverse did not restore {path}")
    for revision in (inverse, current, protected):
        routes_at(root, revision, False)
    route_worktree(root, current)


def scenario_blocks(body):
    scenarios = re.split(r"(?m)^Form: ", body, maxsplit=1)[0]
    return tuple(block.rstrip() for block in re.split(r"(?m)(?=^#### Scenario: )", scenarios)[1:])


def select(root):
    current = oid(root, "HEAD^{commit}")
    protected = oid(root, "refs/remotes/origin/main^{commit}")
    working_rows = recon.adoption_table_rows(root)
    authored_rows = recon.git_adoption_rows(root, current) if current else []
    protected_rows = recon.git_adoption_rows(root, protected) if protected else []
    working_claims, authored_claims, protected_claims = (claims(rows) for rows in
                                                        (working_rows, authored_rows, protected_rows))
    tag = git(root, "for-each-ref",
              "--format=%(refname) %(objecttype) %(tag) %(*objecttype) %(*objectname)", REF)
    if not working_claims and not authored_claims and not protected_claims and not tag:
        metadata = root / ".git"
        require(tag is not None or (not metadata.exists() and not metadata.is_symlink()),
                "P111 version ref inventory is unavailable")
        return Binding("candidate")
    require(tag is not None, "P111 version ref inventory is unavailable")
    require(current and protected, "exact authored or protected revision is unavailable")
    prior = checked_predecessors(root, protected)
    require(len(working_claims) == 1 and working_claims == authored_claims,
            "one canonical P111 authored row required")
    row = working_claims[0]
    cells = parts(row)
    require(len(cells) == 7, "P111 adoption row must have seven cells")
    identity, date, actor_commit, changed, reason, revert, tag_cell = cells
    source = actor_commit.strip("`")
    require(re.fullmatch(r"A-[1-9][0-9]*", identity) and recon.valid_adoption_date(date)
            and re.fullmatch(r"[0-9a-f]{40}", source) and actor_commit == f"`{source}`"
            and tag_cell == f"`{TAG}`" and revert == f"`git revert {source}`"
            and all(f"](https://github.com/tzeusy-org/syzygy/blob/{source}/{path})" in changed
                    for path in (SPEC, DEPENDENCIES)) and reason
            and unique(working_rows, identity, row) and unique(authored_rows, identity, row),
            "malformed or duplicate P111 adoption claim")
    require(reachable(root, source, current), "P111 source outside authored history")
    if protected_claims:
        require(protected_claims == [row] and unique(protected_rows, identity, row)
                and reachable(root, source, protected), "P111 adoption absent or conflicting on protected main")
    else:
        require(not tag, "tag exists before exact P111 protected row and source")
    if tag:
        require(tag.split() == [part.encode("ascii") for part in (REF, "tag", TAG, "commit", source)],
                "P111 tag does not annotate the exact source commit directly")
    disposition_args = (root, identity, source, TAG, (SPEC, DEPENDENCIES))
    working_veto, authored_veto, protected_veto = (
        recon.recorded_disposition(*disposition_args, plain_revert=True, ledger_rows=rows)
        for rows in (working_rows, authored_rows, protected_rows)
    )
    disposition_error = "P111 dispositions disagree across worktree, authored and protected history"
    require(working_veto == authored_veto == protected_veto, disposition_error)
    source_counts = routes_at(root, source, True)
    if protected_veto:
        require(tag, "protected P111 withdrawal has no exact version annotation")
        disposition = [line for line in protected_rows if parts(line)[0] == protected_veto]
        require(len(disposition) == 1 and unique(working_rows, protected_veto, disposition[0])
                and unique(authored_rows, protected_veto, disposition[0]), disposition_error)
        checked_subjects(root, source)
        checked_inverse(root, current, protected, source, protected_veto, protected_rows)
        return Binding("reverted", source=source)
    checked_subjects(root, source, current, protected if protected_claims else None)
    require(routes_at(root, current, True) == source_counts,
            "authored P111 prospective count differs from the exact source")
    if protected_claims:
        require(routes_at(root, protected, True) == source_counts,
                "protected P111 prospective count differs from the exact source")
    route_worktree(root, current)
    if not tag:
        return Binding("staged", source=source)
    body = blob(root, source, SPEC)
    text = body.decode()
    details = json.loads(blob(root, source, DEPENDENCIES))
    old = prior[prior.index("### Requirement: Declared URL dossier supervisor"):]
    prior_scenarios, proposed_scenarios = scenario_blocks(old), scenario_blocks(text)
    require(len(prior_scenarios) == 28 and len(proposed_scenarios) == 34
            and proposed_scenarios[:28] == prior_scenarios, "A-53 scenarios changed beyond the six reviewed additions")
    require(details["requiredIdentity"] == KEY and details["equalWarrantSets"] is True
            and details["candidateSHA256"] == hashlib.sha256(body).hexdigest()
            and len(details["warrants"]) == 7, "reviewed P111 warrant projection is inconsistent")
    return Binding("effective", text, source, details["warrants"])


def assert_count(root, state, predecessor, added):
    if state not in {"staged", "effective"}:
        return predecessor
    # The successor has a conditional paragraph. Earlier figures are read
    # by the checks for their respective versions.
    count_lines = route_lines((root / STATUS).read_bytes(), STATUS_COUNT_SCOPE)
    match = STATUS_COUNT.fullmatch(count_lines[0]) if len(count_lines) == 1 else None
    prospective = predecessor[0], predecessor[1] + added
    require(match is not None and tuple(map(int, match.groups())) == prospective,
            "P111 status count does not match its verified prospective composition")
    return prospective if state == "effective" else predecessor
