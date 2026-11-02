#!/usr/bin/env python3
"""Rehearse the Redis local-agent sitting end to end in a scratch clone.

Candidate tooling; it performs no owner act, writes no real record and binds
nothing. It clones this repository (`git clone --shared`, so the real object
store is only read), merges any named heads (none by default: the local-agent
acts, PR #370, and the reader, PR #367, are on `main`), gives the scratch what
the sitting itself cannot (a synthetic confirming round 7 for screening scope
v2, unless the recorder is already frozen on the real one), and runs
`scripts/install_redis_local_agent_sitting.py` on the accept-all answer of
`REDIS-LOCAL-AGENT-SITTING-BRIEF.md`: every recorder in the brief's order, the
v1.1 route edits, the install steps. Then it requires the end state to be
green: the installer's own `--check`, every `python3` line of the published
battery, the Butlers read gate's loader test, and (with `--vitest`) the full
suite with no failure beyond the start-of-run baseline.

The real tree's HEAD and status are compared before and after; the run fails
if either moved.

  python3 scripts/simulate_redis_local_agent_sitting.py [--merge REF]... [--base REF]
          [--report FILE] [--vitest] [--keep] [--scratch DIR]

Exit 0: green. 1: the run ended and is not green. 2: the scratch could not be
built or the real tree moved.
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import simulate_redis_sitting as sim  # noqa: E402

CAND = ".syzygy/governance/contracts/candidates"
V2_PKG = f"{CAND}/public-source-screening-scope-v2"
V2_RECORDER = "scripts/record_public_source_screening_scope_v2_act.py"
INSTALLER = "scripts/install_redis_local_agent_sitting.py"
#: The installers under test: the local-agent one and the provider-mode one it imports.
OVERLAY = (INSTALLER, "scripts/install_redis_sitting.py",
           "scripts/build_pwb_behavior_contract_repin.py",
           "scripts/build_contract_readability_restyle.py",
           "scripts/check_spec_reconciliation.py")
V11_RECORD = ".syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md"
DATE = "2026-10-07"
#: Heads to merge by default. PR #370 (the local-agent acts) and PR #367 (the
#: reader) merged on 2026-10-07, so `main` carries both; pass `--merge` to
#: rehearse a base that lacks them.
DEFAULT_MERGES: tuple[str, ...] = ()

DESCRIPTION = "Perform the act at the manifest row, as the sitting brief recommends."
#: The accept-all answer of the sitting brief, as the owner's words. The
#: question openings are the asker's; the labels are the brief's.
ANSWERS = {
    "date": DATE,
    "start_instant": f"{DATE}T09:00:00Z",
    "acts": {
        "v1.1": {"quote": "1.1 signed off with N6; N1 and N2 as recommended.", "options": ["n6"]},
        "screening-v1": {"opening": "Sign the public-source screening scope at its manifest row?",
                         "label": "Sign it, with Q2 to Q8 as recommended", "description": DESCRIPTION},
        "rfc5": {"opening": "Sign the RFC5-14 project-documentation class at its manifest row?",
                 "label": "Sign it, at the manifest row; direct the SOURCE-POLICY.md readability successor",
                 "description": DESCRIPTION},
        "screening-v2": {"variant": "none",
                         "opening": "Sign screening scope version 2 at one variant row?",
                         "label": "Sign it, variant none", "description": DESCRIPTION},
        "redis-observation": {"opening": "Sign the Redis observation consent at its manifest row?",
                              "label": "Sign it", "description": DESCRIPTION},
        "entry-v1.0": {"quote": "Extend Scope A to this entry and sign v1.0"},
        "redis-no-evidence-drawer": {"opening": "Which statement for redis/redis at its manifest row?",
                                     "label": "No drawer (Recommended)", "description": DESCRIPTION},
        "d9-in-force": {"opening": "Sign the D9 in-force record at its manifest row?",
                        "label": "Sign it", "description": DESCRIPTION},
        "rfc7-20-reading-in-force": {"opening": "Sign the RFC7-20 reading in-force record at its manifest row?",
                                     "label": "Sign it", "description": DESCRIPTION},
        "profile": {"opening": "Adopt the non-governed narrative profile (requirement 032)?",
                    "label": "Adopt as recommended",
                    "description": "O1 to O7 as the packet recommends; Scope A is not read to cover it; "
                                   "the two known limitations stand."},
    },
}


class Rehearsal(sim.Sim):
    def merge_heads(self, refs):
        merged, failed = [], []
        for ref in refs:
            local = "refs/sim/merge/" + ref.rsplit("/", 1)[-1]
            p = self.run(["git", "fetch", "-q", str(ROOT), f"+{ref}:{local}"])
            if p.returncode:
                failed.append((ref, "not found"))
                continue
            head = self.git("rev-parse", local).stdout.strip()
            p = self.git("merge", "--no-ff", "--no-edit", "-q", local, check=False)
            if p.returncode:
                files = self.git("diff", "--name-only", "--diff-filter=U").stdout.split()
                self.git("merge", "--abort", check=False)
                failed.append((ref, f"conflicts: {files}"))
            else:
                merged.append((ref, head[:12]))
        self.step("merge", merged=merged, failed=failed)
        return not failed

    def overlay(self):
        for rel in OVERLAY:
            shutil.copy(ROOT / rel, self.scratch / rel)
        self.commit("rehearsal: overlay the installer under test")
        # the overlay comes from the working directory, not a commit: its digests are
        # what anchors the record to the bytes run (R-REDIS-SITTING-INSTALLER-PINS-1 note 5)
        self.step("overlay", copied=list(OVERLAY),
                  sha256={rel: sim.sha256(self.scratch / rel) for rel in OVERLAY})

    def synthetic_round7(self):
        """Screening scope v2 has no round 7 without the owner; the scratch gets a synthetic
        confirming raw, committed, and the recorder's own --freeze on that commit."""
        rec = self.scratch / V2_RECORDER
        if not re.search(r"^FROZEN_SUBJECT: str \| None = None$", rec.read_text(), re.M):
            self.step("round7", note="the v2 recorder is already frozen; its real confirming raw is used")
            return True
        manifest = self.scratch / V2_PKG / "PUBLIC-SOURCE-SCREENING-SCOPE-V2-MANIFEST.txt"
        raw = self.scratch / V2_PKG / "reviews/R-PUBLIC-SOURCE-SCREENING-SCOPE-V2-7-RAW.md"
        raw.write_text(f"# R7 (synthetic, scratch only)\nReviewed commit: {'a' * 40}\n"
                       f"Manifest SHA-256: {sim.sha256(manifest)}\nVerdict: CONFIRM\n\n## Findings\n\nnone\n")
        (self.scratch / V2_PKG / "ROUND-7-DISPOSITIONS.md").write_text(
            "# Round 7 dispositions (synthetic, scratch only)\n\nReviewed record: "
            f"{V2_PKG}/reviews/R-PUBLIC-SOURCE-SCREENING-SCOPE-V2-7-RAW.md\n\nNo findings.\n")
        self.commit("rehearsal: synthetic round-7 confirming raw (scratch only)")
        head = self.git("rev-parse", "HEAD").stdout.strip()
        p = self.run([sys.executable, V2_RECORDER, "--freeze", "7", head])
        self.step("round7", freeze_exit=p.returncode, tail=(p.stdout + p.stderr).strip()[-200:],
                  note="synthetic confirming raw and the recorder's own freeze, scratch only")
        if p.returncode:
            return False
        self.commit("rehearsal: freeze the v2 recorder on the synthetic round 7")
        return True

    def install(self, answers_path):
        p = self.run([sys.executable, INSTALLER, "--answers", str(answers_path)], timeout=3000)
        out = (p.stdout + p.stderr).strip()
        self.step("install", exit=p.returncode, output=out.splitlines()[-25:])
        if p.returncode:
            return False
        self.commit("rehearsal: the sitting's records and install")
        c = self.run([sys.executable, INSTALLER, "--answers", str(answers_path), "--check"], timeout=3000)
        self.step("install-check", exit=c.returncode, output=(c.stdout + c.stderr).strip().splitlines()[-4:])
        # a second recording run over the installed tree is refused before any write
        # (R-REDIS-SITTING-INSTALLER-PINS-1 note 2)
        again = self.run([sys.executable, INSTALLER, "--answers", str(answers_path)], timeout=3000)
        out = (again.stdout + again.stderr).strip()
        unchanged = (not self.git("status", "--porcelain").stdout.strip()
                     and not self.git("stash", "list").stdout.strip())
        refused = again.returncode == 2 and "already recorded" in out and "REFUSED (nothing written)" in out
        self.step("second-run", exit=again.returncode, refused_before_writing=refused, tree_unchanged=unchanged,
                  output=out.splitlines()[-3:])
        return c.returncode == 0 and refused and unchanged

    def battery(self):
        """Every python3 line of the scratch's published battery, as the page publishes it."""
        status = (self.scratch / "PROJECT-STATUS.md").read_text()
        block = re.search(r"## How to verify this page.*?```sh\n(.*?)```", status, re.S).group(1)
        cmds = [c for c in sim_battery(block) if c.startswith("python3 ")]
        failing = []
        for c in cmds:
            p = subprocess.run(c, shell=True, cwd=self.scratch, capture_output=True, text=True, timeout=1800)
            if p.returncode:
                failing.append({"command": c[:200], "exit": p.returncode,
                                "tail": (p.stdout + p.stderr).strip()[-300:]})
        self.step("battery", commands=len(cmds), failing=len(failing))
        self.steps[-1]["failures"] = failing
        return cmds, failing


def sim_battery(block):
    """The published commands with shell shorthand expanded (check_governance CG-26's reading)."""
    sys.path.insert(0, str(ROOT / "scripts"))
    import check_governance as cg
    return cg._battery_commands(block)


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--merge", action="append", help="a ref to merge (repeatable); default none")
    ap.add_argument("--base", default="refs/remotes/origin/main")
    ap.add_argument("--report", default="redis-local-agent-sitting-rehearsal.json")
    ap.add_argument("--scratch")
    ap.add_argument("--vitest", action="store_true")
    ap.add_argument("--keep", action="store_true")
    ap.add_argument("--start-instant", help="the first act's instant, YYYY-MM-DDTHH:MM:SSZ (UTC); its date is "
                    "the acts' date. Give one already past: an act is not in force until its instant, and the "
                    "installer refuses an instant ahead of the clock before it records anything")
    a = ap.parse_args(argv)
    if a.start_instant is not None:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", a.start_instant):
            ap.error("--start-instant is not YYYY-MM-DDTHH:MM:SSZ")
        ANSWERS["date"], ANSWERS["start_instant"] = a.start_instant[:10], a.start_instant
    before = sim.real_state(ROOT)
    tmp = None
    if a.scratch is None:
        tmp = tempfile.mkdtemp(prefix="local-agent-sitting-")
        a.scratch = os.path.join(tmp, "clone")
    scratch = sim.build_scratch(ROOT, a.scratch, a.base)
    r = Rehearsal(scratch, a.report, a.base, a.vitest)
    base_head = r.git("rev-parse", "HEAD").stdout.strip()
    r.step("base", ref=a.base, head=base_head)
    green = False
    try:
        if r.merge_heads(a.merge or DEFAULT_MERGES):
            r.overlay()
            r.npm_ci()
            r.checks("baseline")
            r.baseline_failing = set(r.vitest_run("start") or [])
            if r.synthetic_round7():
                answers = pathlib.Path(a.scratch).parent / "answers.json"
                given = json.loads(json.dumps(ANSWERS))
                if (scratch / V11_RECORD).is_file():
                    # v1.1 was signed and recorded on main (2026-10-07); never re-recorded
                    del given["acts"]["v1.1"]
                    r.step("answers", note="v1.1 already recorded on the base; dropped from the answers")
                ahead = given["start_instant"] > datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                if ahead:
                    r.step("answers", note=f"the acts start at {given['start_instant']}, ahead of the clock: the "
                           "installer refuses that before recording; pass --start-instant with a past instant")
                answers.write_text(json.dumps(given, indent=2) + "\n")
                installed = r.install(answers)
                rec = r.checks("end")
                cmds, failing = r.battery() if installed else ([], ["not installed"])
                gate = r.gate("gate-after-install", False) if installed else False
                green = (installed and not failing and gate
                         and "0 FAIL" in (rec.get("governance") or "") and rec["partition_exit"] == 0)
                if a.vitest and installed:
                    still = set(r.vitest_run("end") or []) - r.baseline_failing
                    r.step("vitest-beyond-baseline", failing=sorted(still))
                    green = green and not still
    finally:
        r.green = green
        r.step("green", value=green, scratch_head=r.git("rev-parse", "HEAD", check=False).stdout.strip())
        pathlib.Path(a.report).write_text(json.dumps(
            {"candidate": True, "bindsNothing": True, "date": ANSWERS["date"], "base": a.base, "baseHead": base_head,
             "merged": a.merge or list(DEFAULT_MERGES), "answers": ANSWERS, "green": green,
             "steps": r.steps, "findings": r.findings}, indent=2) + "\n")
        print(f"report: {a.report}")
    after = sim.real_state(ROOT)
    hard, _refs = sim.moved(before, after)
    if hard:
        print(f"FAIL: the real tree moved during the rehearsal: {hard}", file=sys.stderr)
        return 2
    if tmp and not a.keep:
        shutil.rmtree(tmp, ignore_errors=True)
    return 0 if green else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
