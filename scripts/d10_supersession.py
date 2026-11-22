"""Whether doctrine amendment D10 (the governance simplification) is in effect in a tree.

Checks that police only the ceremonies D10 retires (a performed act's frozen
subject bytes, its recorder's applied-tree comparison, the digest copies of a
superseded subject) stop running once D10 is in effect, instead of failing
forever on bytes D10 replaced (RFC3-16 as amended by D10: a later edit is a new
adoption, and earlier acts and their digests are history, not locks). They
print one line saying so and exit 0; the performed records stay as they are.

D10 is in effect only when it is **recorded and verified**:
`scripts/record_governance_simplification_d10.py --check` passes over the tree
(the dedicated record, its aggregate section and its log row match the
manifest). A record file that merely exists does not count, and neither does
an install with no record: either would silence the checks below without the
owner's act (finding of R-D10-PACKAGE-RESUME-1, 2026-11-18).

Anything else (the package absent, unread, partly installed, recorded but not
verifying) is not in effect, and every check runs as before.

Checks that pin the Three-Surface POC specification do not stop: under D10 they
accept a later change only when an AGENT-ADOPTIONS.md row adopts it (`judge`,
`amendment` and the predicate stated above `POC_CHANGE` below;
`syzygy-k54o.5.1`).
"""
import importlib.util
from pathlib import Path
import re
import subprocess
import sys
import tempfile

_REC = Path(__file__).resolve().with_name("record_governance_simplification_d10.py")
if _REC.is_file():
    _spec = importlib.util.spec_from_file_location("record_governance_simplification_d10", _REC)
    rec = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(rec)
else:  # a partial copy of scripts/ (some selftests): D10 is never in effect there
    rec = None

ROOT = Path(__file__).resolve().parents[1]
NAME = "GOVERNANCE-SIMPLIFICATION-D10"


def installed_targets(root=ROOT):
    """{target: package digest} for every install target, or None when the manifest is absent or unreadable."""
    if rec is None:
        return None
    manifest = Path(root) / rec.MANIFEST
    if not manifest.is_file():
        return None
    try:
        package, _base = rec.parse_manifest(manifest.read_text(encoding="utf-8"))
        rows = {rel: sha for rel, sha in package.items() if rel.startswith(rec.PROPOSED)}
        return {target: sha for rel, sha in rows.items() for target in rec.targets(rel)} or None
    except (ValueError, UnicodeDecodeError):
        return None


def state(root=ROOT):
    """'recorded' when the D10 record exists and its recorder's check passes; None otherwise."""
    root = Path(root)
    if rec is None or not (root / rec.ACT).is_file():
        return None
    try:
        return "recorded" if rec.check(root) else None
    except (ValueError, OSError, UnicodeDecodeError):
        return None


def superseded(what, root=ROOT):
    """Print why `what` does not run and return True when D10 is in effect; return False otherwise."""
    now = state(root)
    if now is None:
        return False
    how = "its record is present and verifies"
    print(f"SUPERSEDED  {what}: not run. {NAME} is in effect ({how}) and replaced the bytes this "
          f"check holds a performed act to; the act and its record stay as history (RFC3-16 as amended).")
    return True


# --- Agent amendments of a specification a performed act pinned ---------------
#
# Some checks hold the Three-Surface POC specification to the bytes its pre-D10
# acts recorded. Under D10 that specification is amended by an agent adoption
# (VIS-4; CC-REV-2), so those checks take a second arm instead of stopping:
#
#   * the old comparison runs first, over the current bytes; a match ends it;
#   * D10 not in effect: the old findings stand, unchanged;
#   * D10 in effect: the current bytes must be *adopted* (the predicate below),
#     and the old comparison is re-run over the change's files as they stood at
#     the commit that recorded D10 (the bytes the performed acts describe), so a
#     broken act chain still fails. Anything else fails, naming what is missing.
#
# The adoption predicate (`coverage`), exactly:
#   1. every file under the change directory in the checked tree equals its blob
#      at HEAD (no uncommitted, unstaged or untracked change), and HEAD carries
#      no file there that the tree lacks; and
#   2. every commit `git log --format=%H <anchor>..HEAD -- <change>` lists (the
#      commits that changed the directory after the commit that added the D10
#      act record, default history simplification) is *covered*: some row of
#      AGENT-ADOPTIONS.md whose line names the change directory's basename
#      (`three-surface-poc-experience`) has a Commit cell holding one
#      backticked 7-to-40-digit hex hash that resolves to a commit C, and the
#      listed commit is C or an ancestor of C (`git merge-base --is-ancestor`).
#      Naming the amending commit, or the merge that landed it, both cover it.

POC_CHANGE = "openspec/changes/three-surface-poc-experience"
ADOPTIONS = ".syzygy/governance/decisions/AGENT-ADOPTIONS.md"
_COMMIT_CELL = re.compile(r"`([0-9a-f]{7,40})`")


def _git(objects, *args):
    done = subprocess.run(["git", "-C", str(objects), *args], capture_output=True)
    return done.stdout if done.returncode == 0 else None


def objects_root(root):
    """Where `root`'s history lives: itself, or (a snapshot with no .git) this checkout."""
    root = Path(root)
    return root if (root / ".git").exists() else ROOT


def anchor_commit(objects, act):
    """The oldest commit in HEAD's history that added `act`, or None."""
    out = _git(objects, "log", "--diff-filter=A", "--format=%H", "HEAD", "--", act)
    found = out.decode().split() if out else []
    return found[-1] if found else None


def tree_files(objects, commit, change):
    """{path: bytes} of every blob under `change` at `commit`, or None on any git failure."""
    listing = _git(objects, "ls-tree", "-r", "-z", commit, "--", change)
    if listing is None:
        return None
    files = {}
    for entry in filter(None, listing.decode().split("\0")):
        meta, _tab, path = entry.partition("\t")
        mode, kind, oid = meta.split()
        if kind != "blob" or mode not in ("100644", "100755"):
            return None
        body = _git(objects, "cat-file", "blob", oid)
        if body is None:
            return None
        files[path] = body
    return files


def disk_files(root, change):
    """{path: bytes} of every file under `change` in `root`; a symlink is refused (None)."""
    base = Path(root) / change
    files = {}
    for path in sorted(base.rglob("*")) if base.is_dir() else ():
        if path.is_symlink():
            return None
        if path.is_file():
            files[path.relative_to(root).as_posix()] = path.read_bytes()
    return files


def adoption_commits(text, change):
    """Hashes in the Commit cell of every adoption row whose line names `change`'s basename."""
    name = Path(change).name
    named = []
    for line in text.splitlines():
        if not line.startswith("| A-") or name not in line:
            continue
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if len(cells) >= 3 and (m := _COMMIT_CELL.fullmatch(cells[2])):
            named.append(m.group(1))
    return named


def coverage(root, objects, change, anchor, adoptions):
    """The adoption predicate above: [] when it holds, else findings naming what is missing."""
    head = tree_files(objects, "HEAD", change)
    disk = disk_files(root, change)
    if head is None or disk is None:
        return [f"`{change}`: HEAD or the tree cannot be read; its amendment is Unknown"]
    moved = sorted(p for p in set(head) | set(disk) if head.get(p) != disk.get(p))
    if moved:
        return [f"`{change}` differs from HEAD at {moved[:4]}: commit the amendment, then name "
                f"that commit in a `{ADOPTIONS}` row"]
    listed = _git(objects, "log", "--format=%H", f"{anchor}..HEAD", "--", change)
    if listed is None:
        return [f"`{change}`: its history since D10 cannot be read; its amendment is Unknown"]
    named = []
    for short in adoption_commits(adoptions, change):
        oid = _git(objects, "rev-parse", "--verify", "--quiet", f"{short}^{{commit}}")
        if oid:
            named.append(oid.decode().strip())
    findings = []
    for commit in listed.decode().split():
        if not any(commit == oid or _git(objects, "merge-base", "--is-ancestor", commit, oid) is not None
                   for oid in named):
            findings.append(
                f"missing adoption row: no `{ADOPTIONS}` row covers commit `{commit[:12]}`, which "
                f"changed `{change}/` after D10; add one whose Commit cell names it (or a commit "
                f"it is an ancestor of) and whose text names `{Path(change).name}`")
    return findings


def amendment(root=ROOT, change=POC_CHANGE):
    """None when D10 is not in effect; else ({path: bytes as D10 found them}, adoption findings)."""
    root = Path(root)
    if state(root) != "recorded":
        return None
    objects = objects_root(root)
    anchor = anchor_commit(objects, rec.ACT)
    files = tree_files(objects, anchor, change) if anchor else None
    if files is None:
        return {}, [f"`{change}`: the commit that recorded D10 is not in this history; "
                    "its amendment is Unknown"]
    text = (root / ADOPTIONS).read_text(encoding="utf-8") if (root / ADOPTIONS).is_file() else ""
    return files, coverage(root, objects, change, anchor, text)


def judge(root, pinned, recheck, change=POC_CHANGE):
    """Findings of a check that pins `change` to bytes a pre-D10 act recorded.

    `pinned` are the old comparison's findings over the current bytes;
    `recheck(files)` re-runs that comparison over `{path: bytes}` and returns
    its findings. See the arms above.
    """
    if not pinned:
        return []
    found = amendment(root, change)
    if found is None:
        return list(pinned)
    files, missing = found
    if missing:
        return list(pinned) + missing
    return [f"{finding} (over `{change}` as D10 found it)" for finding in recheck(files)]


def selftest():
    """[(fixture name, passed)] for the adoption predicate, over throwaway git repositories."""
    results = []
    act = "decisions/D10-ACT.md"
    change = "spec/poc"
    with tempfile.TemporaryDirectory(prefix="d10-adoption-") as temp:
        repo = Path(temp)

        def run(*args):
            subprocess.run(["git", "-C", str(repo), "-c", "user.name=t", "-c", "user.email=t@t",
                            *args], check=True, capture_output=True)
            head = _git(repo, "rev-parse", "--verify", "--quiet", "HEAD")
            return head.decode().strip() if head else None

        def write(rel, body):
            (repo / rel).parent.mkdir(parents=True, exist_ok=True)
            (repo / rel).write_text(body)

        def check(rows):
            return coverage(repo, repo, change, anchor, rows)

        def row(commit, text=f"amends `{change}`"):
            return f"| A-9 | 2026-11-22 | `{commit}` | {text} | why | `git revert {commit[:9]}` | — |\n"

        run("init", "-q", "-b", "main")
        write(f"{change}/spec.md", "v0\n")
        run("add", "-A")
        run("commit", "-qm", "pre-D10")
        write(act, "act\n")
        run("add", "-A")
        anchor = run("commit", "-qm", "D10")
        results.append(("unchanged since D10: nothing to cover", check("") == []))
        write(f"{change}/spec.md", "v1\n")
        results.append(("uncommitted amendment fails", "differs from HEAD" in " ".join(check(""))))
        first = run("commit", "-qam", "amend")
        results.append(("amendment with no row fails naming the row",
                        len(check("")) == 1 and check("")[0].startswith("missing adoption row")
                        and first[:12] in check("")[0]))
        results.append(("full hash covers", check(row(first)) == []))
        results.append(("short hash covers", check(row(first[:9])) == []))
        results.append(("row that does not name the change does not cover",
                        len(check(row(first, "other work"))) == 1))
        results.append(("unresolvable hash does not cover", len(check(row("0" * 40))) == 1))
        results.append(("the anchor commit itself does not cover", len(check(row(anchor))) == 1))
        write("other.txt", "x\n")
        run("add", "-A")
        later = run("commit", "-qm", "later, outside the change")
        results.append(("a descendant commit covers (a merge naming)", check(row(later)) == []))
        write(f"{change}/spec.md", "v2\n")
        second = run("commit", "-qam", "second amendment")
        results.append(("a second amendment needs its own row",
                        [f[:40] for f in check(row(first))] == [f[:40] for f in check(row(later))]
                        and len(check(row(first))) == 1 and second[:12] in check(row(first))[0]))
        results.append(("both rows cover both", check(row(first) + row(second)) == []))
        write(f"{change}/extra.md", "x\n")
        results.append(("untracked file fails", "differs from HEAD" in " ".join(check(row(second)))))
        (repo / change / "extra.md").unlink()
        run("checkout", "-qb", "topic")
        write(f"{change}/spec.md", "v3\n")
        third = run("commit", "-qam", "amend on a branch")
        run("checkout", "-q", "main")
        write("other.txt", "y\n")
        run("commit", "-qam", "main moves on")
        merge = run("merge", "-q", "--no-ff", "-m", "merge topic", "topic")
        rows = row(first) + row(second)
        results.append(("a merged amendment with no row fails",
                        len(check(rows)) == 1 and third[:12] in check(rows)[0]))
        results.append(("naming the merge commit covers the merged amendment",
                        check(rows + row(merge)) == []))
        results.append(("naming the branch commit covers it too", check(rows + row(third)) == []))
        results.append(("tree_files reads the anchor bytes",
                        tree_files(repo, anchor, change) == {f"{change}/spec.md": b"v0\n"}))
        results.append(("anchor_commit finds the act's commit", anchor_commit(repo, act) == anchor))
    return results


if __name__ == "__main__":
    if sys.argv[1:] != ["--selftest"]:
        print("usage: d10_supersession.py --selftest")
        raise SystemExit(2)
    outcomes = selftest()
    for name, ok in outcomes:
        print(f"{'PASS' if ok else 'FAIL'} {name}")
    failed = sum(not ok for _name, ok in outcomes)
    print(f"{len(outcomes)} fixtures, {failed} failing")
    raise SystemExit(1 if failed else 0)
