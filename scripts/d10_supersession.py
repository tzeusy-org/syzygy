"""Whether doctrine amendment D10 (the governance simplification) is in effect in a tree.

Checks that police only the ceremonies D10 retires (a performed act's frozen
subject bytes, its recorder's applied-tree comparison, the digest copies of a
superseded subject) stop running once D10 is in effect, instead of failing
forever on bytes D10 replaced (RFC3-16 as amended by D10: a later edit is a new
adoption, and earlier acts and their digests are history, not locks). They
print one line saying so and exit 0; the performed records stay as they are.

D10 is in effect in two states:

- **recorded**: the dedicated record
  `.syzygy/governance/decisions/GOVERNANCE-SIMPLIFICATION-D10-ACT.md` exists
  (`scripts/record_governance_simplification_d10.py --check` verifies it);
- **installed**: no record exists, and every install target holds exactly the
  bytes of its `[package]` row. The recorder installs and records in one
  transaction and rolls both back on failure, so this state stands only in a
  scratch tree where the install path ran on its own (the test the package
  uses to show the installed tree passes the battery).

Anything else (the package absent, unread, partly installed) is not in effect,
and every check runs as before.
"""
import hashlib
import importlib.util
from pathlib import Path

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
    """'recorded', 'installed', or None."""
    root = Path(root)
    if rec is None:
        return None
    if (root / rec.ACT).is_file():
        return "recorded"
    targets = installed_targets(root)
    if not targets:
        return None
    for target, sha in targets.items():
        path = root / target
        if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != sha:
            return None
    return "installed"


def superseded(what, root=ROOT):
    """Print why `what` does not run and return True when D10 is in effect; return False otherwise."""
    now = state(root)
    if now is None:
        return False
    how = ("its record is present" if now == "recorded"
           else "its install is present with no record yet: a scratch install")
    print(f"SUPERSEDED  {what}: not run. {NAME} is in effect ({how}) and replaced the bytes this "
          f"check holds a performed act to; the act and its record stay as history (RFC3-16 as amended).")
    return True


def main(argv):
    """`d10_supersession.py --unless-in-effect CMD...`: run CMD and return its exit code, unless D10 is in effect.

    For a battery line whose script holds a performed act to bytes D10 replaces
    and cannot carry the gate itself, because a review binds its bytes
    (`record_polaris_understanding_adoption.py`); the D10 act installs the
    battery with that line wrapped."""
    import subprocess
    import sys
    if len(argv) < 2 or argv[0] != "--unless-in-effect":
        print("usage: d10_supersession.py --unless-in-effect CMD...", file=sys.stderr)
        return 2
    if superseded(" ".join(argv[1:])):
        return 0
    return subprocess.run(argv[1:]).returncode


if __name__ == "__main__":
    import sys
    sys.exit(main(sys.argv[1:]))
