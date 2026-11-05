#!/usr/bin/env python3
"""Perform the install change that follows the Redis sitting's act records.

Candidate tooling. It performs no owner act and writes no act record; it makes
the repository's checks agree with acts the recorders have already written.
`scripts/simulate_redis_sitting.py` runs it in a scratch clone and requires the
end state to be green; the runbook (`docs/polaris-generation/REDIS-SITTING-RUNBOOK.md`)
lists each step with the finding it answers.

Run from the repository root after every recorder has run:

  python3 scripts/install_redis_sitting.py            # install
  python3 scripts/install_redis_sitting.py --check    # report what is not installed
  python3 scripts/install_redis_sitting.py --selftest
  python3 scripts/install_redis_sitting.py --only policy,reconcile   # a later policy act alone

It refuses (exit 2, nothing written) unless every required act record exists.
It is idempotent: a second run changes nothing and says so. Each step asserts
that the text it patches carries its anchor exactly once, so a drifted
`check_governance.py` fails loudly instead of being patched in the wrong place.

Steps (finding numbers are the runbook's):

  registrations   F5   performed admission and registry records become registered
                       act-copy files; their `manifest SHA-256:` heading is a
                       checked exemption
  rfc5            F6   the RFC-0005 patch applies to both mirrors; the active
                       manifest row and the directive register are regenerated;
                       the amendment becomes a row-argument contract chain link
  policy          F4,F10  the screening-scope act becomes the policy's chain link (the
                       2026-10-02 re-pin turns to history); when the version-2 act
                       exists it is the final link and version 1 turns to history
                       too, and likewise version 3 over version 2 (its manifest's
                       variant-tagged row pinned as history); the read gate, its tests and the status battery and
                       workflow follow the final act, once (an act pair recorded
                       in the wrong order is refused)
  profile         F8,F11  the narrative-profile spec moves from proposed/ to
                       specs/; package prose naming the old path is rewritten;
                       the status page figure follows the recount tool (both
                       figures, once the dossier addition is signed off) and
                       its lead-in names the profile and its adoption record;
                       the openspec/README.md row names the record
  reconcile       B3   `check_spec_reconciliation.py --regenerate`: the census
                       and each installed addition's generated union
"""
from __future__ import annotations

import argparse
import ast
import contextlib
from dataclasses import dataclass
import hashlib
import io
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DECISIONS = ".syzygy/governance/decisions"
CAND = ".syzygy/governance/contracts/candidates"
CG = "scripts/check_governance.py"

#: Act records every sitting must have produced before this runs. The provider
#: route is one of two substitutes (RFC4-1): exactly one of ROUTE_A and ROUTE_B.
REQUIRED_RECORDS = (
    f"{DECISIONS}/PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md",
    f"{DECISIONS}/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md",
    f"{DECISIONS}/PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-ACT.md",
    f"{DECISIONS}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md",
    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md",
    f"{DECISIONS}/POLARIS-NON-GOVERNED-NARRATIVE-PROFILE-ADOPTION.md",
)
ROUTE_A = ("PUBLIC_REGISTRY_ACTS[0][0]", "PUBLIC-ADMISSION-REGISTRY-PROVIDER-ROUTE-ACT.md", "PUBLIC_REGISTRY_MANIFEST")
ROUTE_B = ("MESSAGES_API_ACTS[0][0]", "PUBLIC-ADMISSION-REGISTRY-MESSAGES-API-ROUTE-ACT.md", "MESSAGES_API_MANIFEST")

#: (label expression, record file, manifest constant) for the records that become
#: registered act-copy files; the provider route is added by `performed()`.
PERFORMED_COMMON = (
    ("PUBLIC_ADMISSION_ACTS[0][0]", "PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md", "PUBLIC_ADMISSION_MANIFEST"),
    ("PUBLIC_ADMISSION_ACTS[1][0]", "PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md", "PUBLIC_ADMISSION_MANIFEST"),
    ("PUBLIC_REGISTRY_ACTS[1][0]", "PUBLIC-ADMISSION-REGISTRY-GIT-SOURCE-ACT.md", "PUBLIC_REGISTRY_MANIFEST"),
)


#: The egress consent is one of two versions; the sitting offers version 2 in place of version 1
#: (packet row 8 against row 6), so version 1 may stay unperformed. At least one must exist, and each
#: that exists is registered.
EGRESS_V1 = ("PUBLIC_ADMISSION_ACTS[2][0]", "PUBLIC-REPO-ADMISSION-EGRESS-ANTHROPIC-ACT.md", "PUBLIC_ADMISSION_MANIFEST")
EGRESS_V2 = ("PUBLIC_EGRESS_V2_ACTS[0][0]", "PUBLIC-EGRESS-V2-ANTHROPIC-ACT.md", "PUBLIC_EGRESS_V2_MANIFEST")


def egress_records(root: pathlib.Path) -> list[tuple[str, str, str]]:
    return [e for e in (EGRESS_V1, EGRESS_V2) if (root / DECISIONS / e[1]).is_file()]


def provider_routes(root: pathlib.Path) -> list[tuple[str, str, str]]:
    return [r for r in (ROUTE_A, ROUTE_B) if (root / DECISIONS / r[1]).is_file()]


def performed(root: pathlib.Path) -> tuple[tuple[str, str, str], ...]:
    routes = provider_routes(root)
    if len(routes) != 1:
        raise Refusal(f"exactly one provider route record must exist (the two routes are substitutes, "
                      f"RFC4-1); found {[r[1] for r in routes]}")
    egress = egress_records(root)
    if not egress:
        raise Refusal("no egress consent record exists (version 2, or version 1)")
    return PERFORMED_COMMON + (routes[0],) + tuple(egress)


RFC5_PKG = f"{CAND}/rfc5-project-documentation-class"
RFC5_MODULE = "rfcs/RFC-0005/consent-egress-secrets.md"
BUDGET_SCRIPT = f"{CAND}/scripts/build_budget_report.py"
BUDGET_REPORT = f"{CAND}/CONTEXT-BUDGET-REPORT.md"
RFC5_ACT = f"{DECISIONS}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md"
SCOPE_PKG = f"{CAND}/public-source-screening-scope"
SCOPE_MANIFEST = f"{SCOPE_PKG}/PUBLIC-SOURCE-SCREENING-SCOPE-MANIFEST.txt"
SCOPE_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md"
V2_PKG = f"{CAND}/public-source-screening-scope-v2"
V2_MANIFEST = f"{V2_PKG}/PUBLIC-SOURCE-SCREENING-SCOPE-V2-MANIFEST.txt"
V2_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md"
V3_PKG = f"{CAND}/public-source-screening-scope-v3"
V3_MANIFEST = f"{V3_PKG}/PUBLIC-SOURCE-SCREENING-SCOPE-V3-MANIFEST.txt"
V3_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md"
V4_PKG = f"{CAND}/public-source-screening-scope-v4"
V4_MANIFEST = f"{V4_PKG}/PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt"
V4_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md"
V5_PKG = f"{CAND}/public-source-screening-scope-v5"
V5_MANIFEST = f"{V5_PKG}/PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt"
V5_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md"
V6_PKG = f"{CAND}/public-source-screening-scope-v6"
V6_MANIFEST = f"{V6_PKG}/PUBLIC-SOURCE-SCREENING-SCOPE-V6-MANIFEST.txt"
V6_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-ACT.md"
V1_SCRIPT = "record_public_source_screening_scope_act"
V2_SCRIPT = "record_public_source_screening_scope_v2_act"
V3_SCRIPT = "record_public_source_screening_scope_v3_act"
V4_SCRIPT = "record_public_source_screening_scope_v4_act"
V5_SCRIPT = "record_public_source_screening_scope_v5_act"
V6_SCRIPT = "record_public_source_screening_scope_v6_act"
#: The scope recorders in chain order; the battery carries only the final act's.
SCOPE_SCRIPTS = (V1_SCRIPT, V2_SCRIPT, V3_SCRIPT, V4_SCRIPT, V5_SCRIPT, V6_SCRIPT)
REPIN_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md"
AMENDMENT_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md"
POLICY_JSON = ".syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json"
WORKFLOW = ".github/workflows/governance-docs.yml"
INPUTS_TS = "apps/three-surface-poc/src/governance-inputs.ts"
INPUTS_TEST = "apps/three-surface-poc/src/governance-inputs.test.ts"
PIN_FILES = (INPUTS_TS, INPUTS_TEST,
             "packages/three-surface-poc-core/src/git-object-reader.ts",
             "packages/three-surface-poc-core/src/content-classification.test.ts",
             "packages/three-surface-poc-core/src/project-shape-model.test.ts")
PROFILE_CHANGE = "openspec/changes/polaris-non-governed-narrative-profile"
PROFILE_PKG = f"{CAND}/non-governed-narrative-profile"
STATUS = "PROJECT-STATUS.md"

# ---- text of the check_governance.py insertions ----------------------------

REGISTRATIONS_MARK = "_activate_public_admission_performed_registries"
REGISTRATIONS_ANCHOR = "_activate_public_admission_manifest_copy_registry()\n"
EXEMPTION_DICT = "BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS = {"


def registrations_code(perf) -> str:
    lines = ["", "",
             f"def {REGISTRATIONS_MARK}():",
             '    """Install change: each performed admission or registry record is an act-copy file."""',
             '    aggregate = f"{DECISIONS}/ACCEPTANCE-ACT-RECORD.md"',
             "    for label, rel in ("]
    for label, record, _manifest in perf:
        lines.append(f'            ({label}, f"{{DECISIONS}}/{record}"),')
    lines += ["    ):",
              "        if not os.path.isfile(os.path.join(ROOT, rel)):",
              "            continue",
              "        labels = ACT_DIGEST_COPY_FILES.get(aggregate, ())",
              "        if label not in labels:",
              "            ACT_DIGEST_COPY_FILES[aggregate] = labels + (label,)",
              "        ACT_DIGEST_COPY_FILES[rel] = (label,)",
              "", "", f"{REGISTRATIONS_MARK}()", ""]
    return "\n".join(lines)


def exemptions_code(perf) -> str:
    return "".join(f'    (f"{{DECISIONS}}/{record}", "manifest"): {manifest},\n'
                   for _l, record, manifest in perf)


CHAIN_MARK = "RFC5_CLASS_LABEL"
CHAIN_CONSTANTS = '''#: The RFC5-14 project-documentation amendment (one module). Its act takes the
#: SHA-256 of the patched module, which is the manifest's one row, not the
#: manifest file's digest, so the link is a row-argument link
#: (`ROW_ARGUMENT_LINK_LABELS`): CG-7h reads the argument from the row.
RFC5_CLASS_LABEL = "AMEND RFC5-14 WITH THE PROJECT-DOCUMENTATION CONTENT CLASS"
RFC5_CLASS_DIR = f"{CANDIDATES}/rfc5-project-documentation-class"
RFC5_CLASS_SUBJECT = f"{RFC5_CLASS_DIR}/CONTRACT-AMENDMENT-MANIFEST.txt"
RFC5_CLASS_ACT = f"{DECISIONS}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md"
RFC5_CLASS_MODULE = ".syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md"
RFC5_CLASS_PATHS = ("rfcs/RFC-0005/consent-egress-secrets.md",)
ROW_ARGUMENT_LINK_LABELS = frozenset({RFC5_CLASS_LABEL})
#: The file whose digest is the act argument of a row-argument link: the
#: installed module, which the manifest row hashes in its proposed form.
ROW_ARGUMENT_SUBJECTS = {RFC5_CLASS_LABEL: RFC5_CLASS_MODULE}


def _activate_rfc5_class_act_copy_registry():
    """Require both record copies and the manifest row once the record exists."""
    if not os.path.isfile(os.path.join(ROOT, RFC5_CLASS_ACT)):
        return
    labels = ACT_DIGEST_COPY_FILES.get(PERFORMED_ACT_RECORD, ())
    if RFC5_CLASS_LABEL not in labels:
        ACT_DIGEST_COPY_FILES[PERFORMED_ACT_RECORD] = labels + (RFC5_CLASS_LABEL,)
    ACT_DIGEST_COPY_FILES[RFC5_CLASS_ACT] = (RFC5_CLASS_LABEL,)
    ACT_DIGEST_COPY_FILES[RFC5_CLASS_SUBJECT] = (RFC5_CLASS_LABEL,)


'''
RFC5_EXEMPTION = ('    (f"{DECISIONS}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md", '
                  '"manifest file"): RFC5_CLASS_SUBJECT,\n')
CHAIN_EDITS = (
    # (anchor, replacement); every anchor must occur exactly once
    ("CONTRACT_SUCCESSOR_CHAIN = (\n    (POLARIS_NO_SIGNAL_LABEL,",
     CHAIN_CONSTANTS + "CONTRACT_SUCCESSOR_CHAIN = (\n    (POLARIS_NO_SIGNAL_LABEL,"),
    ("     CONTRACT_RESTYLE_PATHS),\n)\nfor _label",
     "     CONTRACT_RESTYLE_PATHS),\n    (RFC5_CLASS_LABEL, RFC5_CLASS_SUBJECT, RFC5_CLASS_ACT,\n"
     "     _activate_rfc5_class_act_copy_registry, RFC5_CLASS_PATHS),\n)\nfor _label"),
    ("    for label, subject, _act, _activate, _paths in CONTRACT_SUCCESSOR_CHAIN:\n        out.append((label, subject,",
     "    for label, subject, _act, _activate, _paths in CONTRACT_SUCCESSOR_CHAIN:\n"
     "        out.append((label, ROW_ARGUMENT_SUBJECTS.get(label, subject),"),
    ("            link_digest = current_digest(subject)\n        else:",
     "            link_digest = current_digest(subject)\n"
     "            if label in ROW_ARGUMENT_LINK_LABELS:\n"
     '                rows_ = re.findall(r"^([0-9a-f]{64})  \\S+$", link_body or "", re.M)\n'
     "                link_digest = rows_[0] if len(rows_) == 1 else None\n        else:"),
    ("        if body_digest != link_digest:",
     "        if label not in ROW_ARGUMENT_LINK_LABELS and body_digest != link_digest:"),
    # the selftest pins the chain's link paths; it gains the RFC5-14 link too
    # (found by the local-agent rehearsal: CG-7h "closed link tuples" failed)
    ("                  == [POLARIS_NO_SIGNAL_PATHS, CONTRACT_RESTYLE_PATHS]))",
     "                  == [POLARIS_NO_SIGNAL_PATHS, CONTRACT_RESTYLE_PATHS,\n"
     "                      RFC5_CLASS_PATHS]))"),
)


# ---- helpers ---------------------------------------------------------------

class Refusal(Exception):
    pass


class Journal:
    """Remembers each file before the first write so a refusal restores the tree."""

    def __init__(self):
        self.saved: dict[pathlib.Path, bytes | None] = {}

    def save(self, path: pathlib.Path) -> None:
        if path not in self.saved:
            self.saved[path] = path.read_bytes() if path.is_file() else None

    def write(self, path: pathlib.Path, text: str) -> None:
        self.save(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def restore(self) -> None:
        for path, data in self.saved.items():
            if data is None:
                if path.is_file():
                    path.unlink()
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)


J = Journal()


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def once(text: str, anchor: str, what: str) -> int:
    n = text.count(anchor)
    if n != 1:
        raise Refusal(f"{what}: anchor found {n} times, expected exactly once "
                      f"(check_governance.py has drifted; patch by hand and update this script)")
    return text.index(anchor)


def add_exemptions(text: str, lines: str) -> str:
    """Insert exemption rows before the closing brace of the exemptions dict."""
    start = once(text, EXEMPTION_DICT, "heading exemptions")
    end = text.index("\n}\n", start)
    return text[:end + 1] + lines + text[end + 1:]


def missing_records(root: pathlib.Path) -> list[str]:
    missing = [r for r in REQUIRED_RECORDS if not (root / r).is_file()]
    if not provider_routes(root):
        missing.append(f"{DECISIONS}/{ROUTE_A[1]}  (route A)  or  {DECISIONS}/{ROUTE_B[1]}  (route B)")
    if not egress_records(root):
        missing.append(f"{DECISIONS}/{EGRESS_V2[1]}  (egress version 2, row 8)  or  {DECISIONS}/{EGRESS_V1[1]}  (version 1, row 6)")
    return missing


STAGE_MAP_TS = "apps/three-surface-poc/src/polaris-generation/dossier-stage-authority.ts"
STAGE_MAP_ROWS = (("EGRESS_V1_DIGEST", EGRESS_V1, "[...NARRATIVE_STAGES]"),
                  ("EGRESS_V2_DIGEST", EGRESS_V2, "[...NARRATIVE_STAGES, ...DISCOVERY_STAGES]"))


def check_stage_map(root: pathlib.Path) -> str:
    """The wiring's per-digest stage map must name the digest of each performed egress record (the
    act's argument) and give version 2 the narrative and the two discovery stages, version 1 the
    narrative stages only. Read-only. Returns a note; refuses on a mismatch. A tree without the
    wiring (its pull request unmerged) is reported, not refused: nothing there reads the map."""
    path = root / STAGE_MAP_TS
    if not path.is_file():
        return "stage map: not in this tree (the wiring pull request is unmerged); not checked [Unknown]"
    text = path.read_text()
    checked = []
    for const, (_label, record, _m), stages in STAGE_MAP_ROWS:
        rec = root / DECISIONS / record
        if not rec.is_file():
            continue
        args = re.findall(r"^Exact digest \(SHA-256\): `([0-9a-f]{64})`", rec.read_text(), re.M)
        decl = re.findall(rf"export const {const} = '([0-9a-f]{{64}})'", text)
        if len(args) != 1 or len(decl) != 1:
            raise Refusal(f"stage map: {record} carries {len(args)} argument lines and the map declares {const} {len(decl)} times, expected one each")
        if args[0] != decl[0]:
            raise Refusal(f"stage map: {const} is not the digest {record} bound; the gate would authorise no stage for the record in force")
        if f"[{const}, Object.freeze({stages})]" not in text:
            raise Refusal(f"stage map: {const} does not map to the stages {stages}")
        checked.append(const)
    return f"stage map: {', '.join(checked)} equal the recorded act arguments"


def rfc5_precondition(root: pathlib.Path) -> None:
    record = (root / RFC5_ACT).read_text()
    if len(re.findall(r"^Act instant: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$", record, re.M)) != 1:
        raise Refusal("the RFC5-14 act record carries no single 'Act instant:' line; the recorder "
                      "predates act-instant support, so the contract chain link cannot order it "
                      "(runbook finding F12: re-run the recorder from a build that writes it)")


def rfc5_act_argument(root: pathlib.Path) -> str:
    """The digest the row-7 act bound; the installed RFC-0005 bytes must be exactly this."""
    m = re.findall(r"^Exact digest \(SHA-256\): `([0-9a-f]{64})`", (root / RFC5_ACT).read_text(), re.M)
    if len(m) != 1:
        raise Refusal(f"the RFC5-14 act record carries {len(m)} 'Exact digest (SHA-256)' lines, expected one")
    return m[0]


def rfc5_installed_matches(root: pathlib.Path, act_arg: str) -> None:
    for mirror in ("rfcs", "candidates/rfcs"):
        module = root / ".syzygy/governance/contracts" / mirror / "RFC-0005/consent-egress-secrets.md"
        if not module.is_file() or sha(module.read_bytes()) != act_arg:
            raise Refusal(f"installed {module} does not hash to the row-7 act's argument")


# ---- steps -----------------------------------------------------------------

def step_registrations(root: pathlib.Path, write: bool) -> bool:
    """True when the step changed (or would change) anything."""
    perf = performed(root)
    path = root / CG
    text = path.read_text()
    changed = False
    if REGISTRATIONS_MARK not in text:
        i = once(text, REGISTRATIONS_ANCHOR, "registrations") + len(REGISTRATIONS_ANCHOR)
        text = text[:i] + registrations_code(perf) + text[i:]
        text = add_exemptions(text, exemptions_code(perf))
        changed = True
    else:
        absent = [rec for _l, rec, _m in perf if f'/{rec}", "manifest")' not in text]
        if absent:
            raise Refusal(f"registrations are installed for another record set; {absent} are not "
                          "registered (add them by hand or revert the earlier install)")
    if changed and write:
        J.write(path, text)
    return changed


def step_rfc5(root: pathlib.Path, write: bool) -> bool:
    changed = False
    manifest = (root / RFC5_PKG / "CONTRACT-AMENDMENT-MANIFEST.txt").read_text()
    rows = re.findall(r"^([0-9a-f]{64})  (\S+)$", manifest, re.M)
    if [p for _d, p in rows] != [RFC5_MODULE]:
        raise Refusal(f"rfc5 manifest rows are {[p for _d, p in rows]}, expected exactly [{RFC5_MODULE}]")
    row = rows[0][0]
    act_arg = rfc5_act_argument(root)
    if row != act_arg:
        raise Refusal("the rfc5 manifest row is not the digest the row-7 act bound; refusing to install "
                      "text the act did not bind")
    patch = root / RFC5_PKG / "proposed/RFC-0005/consent-egress-secrets.md.patch"
    for mirror in ("rfcs", "candidates/rfcs"):
        module = root / ".syzygy/governance/contracts" / mirror / "RFC-0005/consent-egress-secrets.md"
        if sha(module.read_bytes()) == row:
            continue
        changed = True
        if write:
            J.save(module)
            r = subprocess.run(["patch", "-s", "-p0", str(module), "-i", str(patch)], capture_output=True, text=True)
            if r.returncode or sha(module.read_bytes()) != row:
                raise Refusal(f"patch did not produce the manifest row for {module}: {r.stdout}{r.stderr}")
    if write or not changed:
        rfc5_installed_matches(root, act_arg)
    active = root / CAND / "ACTIVE-CONTRACT-MANIFEST.txt"
    lines = active.read_text().split("\n")
    idx = [i for i, l in enumerate(lines) if l.endswith(f"  {RFC5_MODULE}")]
    if len(idx) != 1:
        raise Refusal(f"active manifest names {RFC5_MODULE} {len(idx)} times, expected once")
    if not lines[idx[0]].startswith(row):
        changed = True
        lines[idx[0]] = f"{row}  {RFC5_MODULE}"
        if write:
            J.write(active, "\n".join(lines))
    cg = root / CG
    text = cg.read_text()
    if CHAIN_MARK not in text:
        changed = True
        for anchor, replacement in CHAIN_EDITS:
            once(text, anchor, "contract chain link")
            text = text.replace(anchor, replacement)
        text = add_exemptions(text, RFC5_EXEMPTION)
        if write:
            J.write(cg, text)
    if changed and write:
        J.save(root / "DIRECTIVE-REGISTER.md")
        subprocess.run([sys.executable, "scripts/build_directive_register.py"], cwd=root,
                       capture_output=True, check=True)
    # the context-budget report counts every module's words, RFC-0005 included
    if (root / BUDGET_SCRIPT).is_file() and subprocess.run(
            [sys.executable, BUDGET_SCRIPT, "--check"], cwd=root, capture_output=True).returncode:
        changed = True
        if write:
            fixtures = sorted((root / CAND / "fixtures").glob("context-selection-*.md"))
            before = {p: p.read_bytes() for p in fixtures}
            for p in [root / BUDGET_REPORT, *fixtures]:
                J.save(p)
            subprocess.run([sys.executable, BUDGET_SCRIPT], cwd=root, capture_output=True, check=True)
            moved = [p.name for p, body in before.items() if p.read_bytes() != body]
            if moved:
                raise Refusal(f"regenerating the budget report rewrote fixture anchors in {moved}; "
                              "only the report may move with the rfc5 module")
    return changed


def step_profile(root: pathlib.Path, write: bool) -> bool:
    changed = False
    src = root / PROFILE_CHANGE / "proposed/polaris-generation/spec.md"
    dst = root / PROFILE_CHANGE / "specs/polaris-generation/spec.md"
    if src.is_file():
        changed = True
        if write:
            J.save(src)
            J.save(dst)
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dst))
            for leftover in (src.parent, src.parent.parent):
                if leftover.is_dir() and not any(leftover.iterdir()):
                    leftover.rmdir()
    elif not dst.is_file():
        raise Refusal("the narrative-profile spec is in neither proposed/ nor specs/")
    old_new = (
        ("openspec/changes/polaris-non-governed-narrative-profile/proposed/polaris-generation/spec.md",
         "openspec/changes/polaris-non-governed-narrative-profile/specs/polaris-generation/spec.md"),
        ("`proposed/polaris-generation/spec.md`", "`specs/polaris-generation/spec.md`"),
    )
    for rel in (f"{PROFILE_PKG}/REVIEW-BRIEF.md", f"{PROFILE_PKG}/SEMANTIC-DELTA.md",
                f"{PROFILE_CHANGE}/GOVERNING-DEPENDENCIES.md", f"{PROFILE_CHANGE}/design.md"):
        p = root / rel
        text = p.read_text()
        new = text
        for a, b in old_new:
            new = new.replace(a, b)
        if new != text:
            changed = True
            if write:
                J.write(p, new)
    # the status page figure follows the recount tool, which this step then runs
    r = subprocess.run([sys.executable, "scripts/count_polaris_effective_scenarios.py"], cwd=root,
                       capture_output=True, text=True)
    m = re.search(r"TOTAL: (\d+) requirements, (\d+) scenarios", r.stdout)
    if not m:
        raise Refusal("the recount tool does not compose the three specs "
                      f"(land the recount fix first): {r.stdout[-200:]}{r.stderr[-200:]}")
    status = root / STATUS
    text = status.read_text()
    new = status_figures(root, profile_lead_in(text),
                         f"{m.group(1)} requirements and {m.group(2)} scenarios")
    if new != text:
        changed = True
        if write:
            J.write(status, new)
    readme = root / OPENSPEC_README
    text = readme.read_text()
    new = profile_readme(text, adoption_date(root))
    if new != text:
        changed = True
        if write:
            J.write(readme, new)
    return changed


OPENSPEC_README = "openspec/README.md"
PROFILE_RECORD = f"{DECISIONS}/POLARIS-NON-GOVERNED-NARRATIVE-PROFILE-ADOPTION.md"
#: The status page's Polaris figure follows this link; the profile joins it.
AMENDMENT_LINK = ("[the adopted amendment](openspec/changes/polaris-manifesto-understanding-amendment"
                  "/specs/polaris-generation/spec.md)")
PROFILE_LEAD_IN = (
    f"{AMENDMENT_LINK}\n"
    "    and the adopted\n"
    f"    [non-governed narrative profile]({PROFILE_CHANGE}/specs/polaris-generation/spec.md)\n"
    f"    ([adoption record]({PROFILE_RECORD}))")
#: The openspec/README.md table's lead paragraph, before the profile's adoption
#: (main; #353 merged; the dossier signed off) -> after it. The third and the
#: dossier sign-off's 2b block are pinned to that package's route-edits file.
README_LEADS = {
    "A sixth row below is a candidate that no act binds; it is listed so that the\n"
    "table stays one row per directory, and it is not one of the five.":
    "The narrative-profile row below is an addition to the Polaris generator\n"
    "composition, adopted by an owner direction rather than an act; the effective\n"
    "composition is the base read with the understanding amendment and each\n"
    "addition. It is not one of the five.",
    "The sixth and seventh rows below are candidates that no act binds; they are\n"
    "listed so that the table stays one row per directory, and neither is one of\n"
    "the five.":
    "The narrative-profile row below is an addition to the Polaris generator\n"
    "composition, adopted by an owner direction rather than an act; the effective\n"
    "composition is the base read with the understanding amendment and each\n"
    "addition. The dossier local-agent row is a candidate that no act binds,\n"
    "listed so that the table stays one row per directory. Neither is one of the\n"
    "five.",
    "The dossier local-agent row below is a signed addition to the Polaris\n"
    "generator composition, bound by a version-tagged sign-off rather than an\n"
    "act; the effective composition is the base read with the understanding\n"
    "amendment and each addition. The narrative-profile row is a candidate that\n"
    "no act binds, listed so that the table stays one row per directory. Neither\n"
    "is one of the five.":
    "The dossier local-agent and narrative-profile rows below are additions to\n"
    "the Polaris generator composition, bound by a version-tagged sign-off and\n"
    "an owner direction respectively rather than by an act; the effective\n"
    "composition is the base read with the understanding amendment and each\n"
    "addition. Neither is one of the five.",
}
PROFILE_ROW_PREFIX = "| [`polaris-non-governed-narrative-profile`](changes/polaris-non-governed-narrative-profile) |"


def profile_row(date: str) -> str:
    name = pathlib.PurePosixPath(PROFILE_RECORD).name
    return (f"{PROFILE_ROW_PREFIX} A Polaris generator requirement for narrating an observed repository "
            f"that has no Syzygy declarations | **Adopted {date} by owner direction** (requirement 032). "
            f"An addition to the generator composition; amend only through CC-REV-2 | "
            f"[`{name}`](../{PROFILE_RECORD}) ({date}) |")


def adoption_date(root: pathlib.Path) -> str:
    dates = re.findall(r"^Date: (\d{4}-\d{2}-\d{2})$", (root / PROFILE_RECORD).read_text(), re.M)
    if len(dates) != 1:
        raise Refusal(f"{PROFILE_RECORD}: expected one Date: line, found {len(dates)}")
    return dates[0]


def profile_lead_in(text: str) -> str:
    """The status page's Polaris figure names the profile beside the amendment (R-365-2 N2)."""
    if PROFILE_LEAD_IN in text:
        return text
    if text.count(AMENDMENT_LINK + ":") != 1:
        raise Refusal(f"{STATUS}: expected the understanding amendment's figure lead-in once")
    return text.replace(AMENDMENT_LINK + ":", PROFILE_LEAD_IN + ":")


def profile_readme(text: str, date: str) -> str:
    """openspec/README.md: the profile row names its adoption record; the lead paragraph says so."""
    rows = [ln for ln in text.split("\n") if ln.startswith(PROFILE_ROW_PREFIX)]
    if len(rows) != 1:
        raise Refusal(f"{OPENSPEC_README}: expected one narrative-profile row, found {len(rows)}")
    text = text.replace(rows[0], profile_row(date))
    if not any(new in text for new in README_LEADS.values()):
        olds = [old for old in README_LEADS if old in text]
        if len(olds) != 1:
            raise Refusal(f"{OPENSPEC_README}: the table's lead paragraph is none of the known forms")
        text = text.replace(olds[0], README_LEADS[olds[0]])
    return text


def step_reconcile(root: pathlib.Path, write: bool) -> bool:
    """The reconciliation follows the profile install (R-365-2 B3): census and addition unions."""
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_polaris_dependency_unions as unions
    import check_spec_reconciliation as recon
    targets = [root / recon.CENSUS] + [root / unions.union_file(c) for c in unions.additions(root)]
    if not write:
        pop, findings = recon.census(root)
        if findings:
            return True
        stale = [c for c in unions.additions(root) if (root / unions.union_file(c)).read_text()
                 != unions.regenerate(root, c)]
        return bool(stale) or (root / recon.CENSUS).read_text() != recon.census_json(pop)
    before = {t: t.read_bytes() if t.is_file() else None for t in targets}
    for t in targets:
        J.save(t)
    try:
        recon.regenerate(root)
    except SystemExit as exc:
        raise Refusal(f"the reconciliation refuses the installed tree: {exc}") from exc
    return any((t.read_bytes() if t.is_file() else None) != b for t, b in before.items())


def status_figures(root: pathlib.Path, text: str, total: str) -> str:
    """The status text with its figures following the recount.

    Once the dossier local-agent addition is signed off the page gives two
    figures, without it and with it; rewriting only the second leaves the
    first false (R-364-2 Finding 1), so the dossier builder rewrites both.
    """
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_polaris_dossier_local_agent_mode as dossier
    if dossier.WITHOUT_RE.search(text):
        try:
            return dossier.refigure(root, text)
        except dossier.Refusal as exc:
            raise Refusal(str(exc)) from exc
    figure = re.search(r"(\d+) requirements and (\d+) scenarios in the effective composition", text)
    if figure is None:
        raise Refusal("PROJECT-STATUS.md has no effective-composition figure")
    return text.replace(figure.group(0), f"{total} in the effective composition")


# ---- policy step (F4/F10) ------------------------------------------------------

_WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight",
          9: "nine", 10: "ten", 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen",
          15: "fifteen", 16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen"}
_TENS = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety"}


def number_word(n: int) -> str:
    if n in _WORDS:
        return _WORDS[n]
    if 20 <= n <= 99:
        return _TENS[n // 10] + ("" if n % 10 == 0 else "-" + _WORDS[n % 10])
    raise Refusal(f"battery count {n} is outside the range the status sentence can spell")


def grab(pattern: str, text: str, what: str, flags: int = re.M) -> str:
    found = re.findall(pattern, text, flags)
    if len(found) != 1:
        raise Refusal(f"{what}: expected exactly one match of {pattern!r}, found {len(found)}")
    return found[0]


def replace_all_counted(text: str, old: str, new: str, what: str, minimum: int = 1) -> str:
    n = text.count(old)
    if n < minimum:
        raise Refusal(f"{what}: {old!r} found {n} times, expected at least {minimum}")
    return text.replace(old, new)


CHAIN_ROW_ANCHOR = '''     "2356b9ed3235b3dff79caeb352803a30c446b7365a2a7ea74df302b9fa51386a"),
)
#: For a chained amendment row'''
OFFERINGS_ANCHOR = '''        f"{CANDIDATES}/pwb-registry-currency-briefing-amendment/PWB-EFFECT-AMENDMENT-MANIFEST.txt": "row",
    },
}'''
REPIN_MANIFEST_ANCHOR = '''        ACT_DIGEST_COPY_FILES[PWB_BEHAVIOR_REPIN_MANIFEST] = (
            PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[2][0])
'''
REPIN_DIR_ANCHOR = 'PWB_BEHAVIOR_REPIN_MANIFEST = f"{PWB_BEHAVIOR_REPIN_DIR}/PWB-EFFECT-REPIN-MANIFEST.txt"\n'
REPIN_CALL_ANCHOR = "_activate_pwb_behavior_repin_manifest_copy_registry()\n"
POLICY_MARK = "PWB_SCOPE_ACT"


def policy_cg_edits(text: str, old_arg: str) -> str:
    """The screening-scope act becomes the policy's chain link; the re-pin is history."""
    if POLICY_MARK in text:
        return text
    i = once(text, CHAIN_ROW_ANCHOR, "policy chain row") + len(CHAIN_ROW_ANCHOR) - len(")\n#: For a chained amendment row")
    row = ('    # The public-source screening-scope act supersedes the 2026-10-02 re-pin\n'
           '    # act for the policy subject.\n'
           '    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],\n'
           '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md",\n'
           '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md",\n'
           f'     "{old_arg}"),\n')
    text = text[:i] + row + text[i:]
    i = once(text, OFFERINGS_ANCHOR, "policy offerings") + len(OFFERINGS_ANCHOR) - 2
    text = text[:i] + (
        '    # The 2026-10-02 policy re-pin was offered as a row of the re-pin manifest;\n'
        '    # its packet by design carries no digest.\n'
        '    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-BEHAVIOR-CONTRACT-REPIN-ACT.md": {\n'
        '        PWB_BEHAVIOR_REPIN_MANIFEST: "row",\n'
        '    },\n') + text[i:]
    i = once(text, REPIN_MANIFEST_ANCHOR, "re-pin manifest registry") + len(REPIN_MANIFEST_ANCHOR)
    text = text[:i] + (
        '        # Once the screening-scope act supersedes the policy re-pin, the\n'
        '        # policy row is history (registered by the amendment registries).\n'
        '        if os.path.isfile(os.path.join(ROOT, PWB_SCOPE_ACT)):\n'
        '            ACT_DIGEST_COPY_FILES[PWB_BEHAVIOR_REPIN_MANIFEST] = (\n'
        '                PWB_EFFECT_ACTS[2][0],)\n') + text[i:]
    i = once(text, REPIN_DIR_ANCHOR, "re-pin directory constants") + len(REPIN_DIR_ANCHOR)
    text = text[:i] + (
        'PWB_SCOPE_DIR = f"{CANDIDATES}/public-source-screening-scope"\n'
        'PWB_SCOPE_MANIFEST = f"{PWB_SCOPE_DIR}/PUBLIC-SOURCE-SCREENING-SCOPE-MANIFEST.txt"\n'
        'PWB_SCOPE_ACT = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md"\n') + text[i:]
    i = once(text, REPIN_CALL_ANCHOR, "re-pin registry call") + len(REPIN_CALL_ANCHOR)
    text = text[:i] + '''

def _activate_pwb_scope_manifest_copy_registry():
    """The screening-scope manifest carries the policy's proposed argument.

    Existence-gated candidate file: a current copy of the policy argument
    while it exists.
    """
    if os.path.isfile(os.path.join(ROOT, PWB_SCOPE_MANIFEST)):
        ACT_DIGEST_COPY_FILES[PWB_SCOPE_MANIFEST] = (PWB_EFFECT_ACTS[1][0],)


_activate_pwb_scope_manifest_copy_registry()
''' + text[i:]
    return add_exemptions(text, '    (PWB_SCOPE_ACT, "manifest"): PWB_SCOPE_MANIFEST,\n')


V2_CHAIN_MARK = "screening-scope v2 chain row"
OFFERINGS_END_ANCHOR = "}\nPWB_STATE1_SUBJECTS = tuple(sorted(("
V1_MANIFEST_GATE_OLD = ("    if os.path.isfile(os.path.join(ROOT, PWB_SCOPE_MANIFEST)):\n"
                        "        ACT_DIGEST_COPY_FILES[PWB_SCOPE_MANIFEST] = (PWB_EFFECT_ACTS[1][0],)\n")
V1_MANIFEST_GATE_NEW = ("    if (os.path.isfile(os.path.join(ROOT, PWB_SCOPE_MANIFEST))\n"
                        '            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/'
                        'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md"))):\n'
                        "        # once the version-2 act supersedes it, the version-1 manifest row is history\n"
                        "        ACT_DIGEST_COPY_FILES[PWB_SCOPE_MANIFEST] = (PWB_EFFECT_ACTS[1][0],)\n")


def policy_cg_v2_edits(text: str, v1_arg: str) -> str:
    """The version-2 act supersedes the version-1 act for the policy subject. Applies on top of
    `policy_cg_edits`; the version-1 manifest becomes history and the version-2 manifest, which
    check_governance registers once the performed record exists, takes its place."""
    if V2_CHAIN_MARK in text:
        return text
    if POLICY_MARK not in text:
        raise Refusal("the version-2 chain row needs the version-1 install first (policy_cg_edits)")
    i = once(text, ")\n#: For a chained amendment row", "policy chain end")
    row = ('    # The public-source screening-scope version-2 act supersedes the version-1 act for\n'
           f'    # the policy subject ({V2_CHAIN_MARK}).\n'
           '    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],\n'
           '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md",\n'
           '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md",\n'
           f'     "{v1_arg}"),\n')
    text = text[:i] + row + text[i:]
    i = once(text, OFFERINGS_END_ANCHOR, "policy offerings end")
    text = text[:i] + (
        '    # The version-1 screening-scope act was offered as the one row of its manifest;\n'
        '    # its packet by design carries no digest.\n'
        '    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md": {\n'
        '        f"{CANDIDATES}/public-source-screening-scope/PUBLIC-SOURCE-SCREENING-SCOPE-MANIFEST.txt": "row",\n'
        '    },\n') + text[i:]
    once(text, V1_MANIFEST_GATE_OLD, "version-1 manifest registration")
    text = text.replace(V1_MANIFEST_GATE_OLD, V1_MANIFEST_GATE_NEW, 1)
    return add_exemptions(text, '    (PUBLIC_SOURCE_SCOPE_V2_ACT, "manifest"): PUBLIC_SOURCE_SCOPE_V2_MANIFEST,\n')


V3_CHAIN_MARK = "screening-scope v3 chain row"
#: The version-2 act was offered as one row of a four-variant manifest, and each of its rows ends in
#: `  [variant: <name>]`, so the amendment registries learn a third offering shape for it.
OFFERING_SHAPE_OLD = '                historical[rel] = manifest_row if shape == "row" else phrase_line\n'
OFFERING_SHAPE_NEW = ('                historical[rel] = (manifest_row if shape == "row"\n'
                      '                                   else manifest_row[:-1] + r"  \\[variant: [a-z-]+\\]$"\n'
                      '                                   if shape == "variant-row" else phrase_line)\n')
V2_MANIFEST_GATE_OLD = ("    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_ACT))\n"
                        "            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_MANIFEST))):\n")
V2_MANIFEST_GATE_NEW = ("    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_ACT))\n"
                        "            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_MANIFEST))\n"
                        "            # once the version-3 act supersedes it, the chosen row is history\n"
                        "            # (pinned by the amendment registries)\n"
                        '            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/'
                        'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md"))):\n')


def policy_cg_v3_edits(text: str, v2_arg: str) -> str:
    """The version-3 act supersedes the version-2 act for the policy subject. Applies on top of
    `policy_cg_v2_edits`; the version-2 manifest's chosen row becomes history and the version-3
    manifest, which check_governance registers once the performed record exists, takes its place."""
    if V3_CHAIN_MARK in text:
        return text
    if V2_CHAIN_MARK not in text:
        raise Refusal("the version-3 chain row needs the version-2 install first (policy_cg_v2_edits)")
    i = once(text, ")\n#: For a chained amendment row", "policy chain end")
    row = ('    # The public-source screening-scope version-3 act supersedes the version-2 act for\n'
           f'    # the policy subject ({V3_CHAIN_MARK}).\n'
           '    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],\n'
           '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md",\n'
           '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md",\n'
           f'     "{v2_arg}"),\n')
    text = text[:i] + row + text[i:]
    i = once(text, OFFERINGS_END_ANCHOR, "policy offerings end")
    text = text[:i] + (
        '    # The version-2 screening-scope act was offered as the chosen variant\'s row of its\n'
        '    # manifest, a row that ends in its `[variant: …]` tag; its packet carries no digest.\n'
        '    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md": {\n'
        '        f"{CANDIDATES}/public-source-screening-scope-v2/PUBLIC-SOURCE-SCREENING-SCOPE-V2-MANIFEST.txt": "variant-row",\n'
        '    },\n') + text[i:]
    once(text, OFFERING_SHAPE_OLD, "offering shape")
    text = text.replace(OFFERING_SHAPE_OLD, OFFERING_SHAPE_NEW, 1)
    once(text, V2_MANIFEST_GATE_OLD, "version-2 manifest registration")
    text = text.replace(V2_MANIFEST_GATE_OLD, V2_MANIFEST_GATE_NEW, 1)
    return add_exemptions(text, '    (PUBLIC_SOURCE_SCOPE_V3_ACT, "manifest"): PUBLIC_SOURCE_SCOPE_V3_MANIFEST,\n')


#: The version-4 install (2026-10-20) carries no mark comment: it is recognized by its four hunks'
#: exact text, which are the hunks the install commit wrote into check_governance.py.
V4_CHAIN_ROW = ('    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],\n'
                '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md",\n'
                '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md",\n')
V4_OFFERING = ('    # The version-3 screening-scope act was offered the same way (variant row of its manifest).\n'
               '    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V3-ACT.md": {\n'
               '        f"{CANDIDATES}/public-source-screening-scope-v3/PUBLIC-SOURCE-SCREENING-SCOPE-V3-MANIFEST.txt": "variant-row",\n'
               '    },\n')
V3_MANIFEST_GATE_OLD = ("    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_ACT))\n"
                        "            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_MANIFEST))):\n")
V3_MANIFEST_GATE_NEW = ("    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_ACT))\n"
                        "            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_MANIFEST))\n"
                        '            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/'
                        'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md"))):\n')
V4_EXEMPTION = ('    (f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md", "manifest"): '
                'f"{CANDIDATES}/public-source-screening-scope-v4/PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt",\n')


def policy_cg_v4_edits(text: str, v3_arg: str) -> str:
    """The version-4 act supersedes the version-3 act for the policy subject. Applies on top of
    `policy_cg_v3_edits`: the chain row, the version-3 manifest's chosen row pinned as variant-row
    history, the version-3 manifest registration gated off, and the version-4 manifest heading
    exemption. All four hunks or none: a file carrying only some of them is refused."""
    present = [V4_CHAIN_ROW in text, V4_OFFERING in text, V3_MANIFEST_GATE_NEW in text, V4_EXEMPTION in text]
    if all(present):
        if f'{V4_CHAIN_ROW}     "{v3_arg}"),\n' not in text:
            raise Refusal("the version-4 chain row quotes another argument than the version-3 act's")
        return text
    if any(present):
        raise Refusal(f"check_governance.py carries part of the version-4 install only ({present})")
    if V3_CHAIN_MARK not in text:
        raise Refusal("the version-4 chain row needs the version-3 install first (policy_cg_v3_edits)")
    i = after_row(text, V3_CHAIN_MARK, "version-3 chain row")
    text = text[:i] + V4_CHAIN_ROW + f'     "{v3_arg}"),\n' + text[i:]
    i = once(text, OFFERINGS_END_ANCHOR, "policy offerings end")
    text = text[:i] + V4_OFFERING + text[i:]
    once(text, V3_MANIFEST_GATE_OLD, "version-3 manifest registration")
    text = text.replace(V3_MANIFEST_GATE_OLD, V3_MANIFEST_GATE_NEW, 1)
    return add_exemptions(text, V4_EXEMPTION)


#: The version-5 hunks, as the version-5 recorder change wrote them into check_governance.py
#: (2026-11-03, `477087d8`): the chain row (with its two comment lines), the version-4 manifest's
#: chosen row pinned as variant-row history, the version-4 manifest registration gated off, and
#: the version-5 manifest heading exemption. Recognized by their exact text, as version 4's are.
V5_CHAIN_ROW = ('    # The version-5 screening-scope act (P-116, variant bcd, 2026-11-03) supersedes the\n'
                '    # version-4 act for the policy subject.\n'
                '    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],\n'
                '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md",\n'
                '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md",\n')
V5_OFFERING = ('    # The version-4 screening-scope act was offered the same way (variant row of its manifest).\n'
               '    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V4-ACT.md": {\n'
               '        f"{CANDIDATES}/public-source-screening-scope-v4/PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt": "variant-row",\n'
               '    },\n')
V4_MANIFEST_GATE_OLD = ("    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_ACT))\n"
                        "            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_MANIFEST))):\n")
V4_MANIFEST_GATE_NEW = ("    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_ACT))\n"
                        "            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_MANIFEST))\n"
                        "            # once the version-5 act exists the version-4 manifest is history (pinned by the amendment registries)\n"
                        '            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/'
                        'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md"))):\n')
V5_EXEMPTION = ('    (f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md", "manifest"): '
                'f"{CANDIDATES}/public-source-screening-scope-v5/PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt",\n')


def after_row(text: str, start: str, what: str) -> int:
    """The offset just past the chain row that `start` (its mark or its opening lines) begins."""
    i = once(text, start, what)
    return text.index('"),\n', i) + len('"),\n')


def policy_cg_v5_edits(text: str, v4_arg: str) -> str:
    """The version-5 act supersedes the version-4 act for the policy subject. Applies on top of
    `policy_cg_v4_edits`, with the four hunks the version-5 recorder change wrote, all or none."""
    present = [V5_CHAIN_ROW in text, V5_OFFERING in text, V4_MANIFEST_GATE_NEW in text, V5_EXEMPTION in text]
    if all(present):
        if f'{V5_CHAIN_ROW}     "{v4_arg}"),\n' not in text:
            raise Refusal("the version-5 chain row quotes another argument than the version-4 act's")
        return text
    if any(present):
        raise Refusal(f"check_governance.py carries part of the version-5 install only ({present})")
    if V4_CHAIN_ROW not in text:
        raise Refusal("the version-5 chain row needs the version-4 install first (policy_cg_v4_edits)")
    i = after_row(text, V4_CHAIN_ROW, "version-4 chain row")
    text = text[:i] + V5_CHAIN_ROW + f'     "{v4_arg}"),\n' + text[i:]
    i = once(text, OFFERINGS_END_ANCHOR, "policy offerings end")
    text = text[:i] + V5_OFFERING + text[i:]
    once(text, V4_MANIFEST_GATE_OLD, "version-4 manifest registration")
    text = text.replace(V4_MANIFEST_GATE_OLD, V4_MANIFEST_GATE_NEW, 1)
    return add_exemptions(text, V5_EXEMPTION)


#: The version-6 hunks, as the version-6 act's integration commit wrote them into check_governance.py
#: (2026-11-05, `ad14318c`): the chain row (with its two comment lines), the version-5 manifest's
#: chosen row pinned as variant-row history, and the version-6 manifest heading exemption. The
#: version-5 manifest registration was already gated off by the version-6 package (`syzygy-mcs4`),
#: so it is a precondition here, not a hunk: version 5 wrote that gate, version 6 only reads it.
V6_CHAIN_ROW = ('    # The version-6 screening-scope act (syzygy-mcs4, variant p, 2026-11-05) supersedes the\n'
                '    # version-5 act for the policy subject.\n'
                '    (PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[1][1],\n'
                '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md",\n'
                '     f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-ACT.md",\n')
V6_OFFERING = ('    # The version-5 screening-scope act was offered the same way (variant row of its manifest).\n'
               '    f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md": {\n'
               '        f"{CANDIDATES}/public-source-screening-scope-v5/PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt": "variant-row",\n'
               '    },\n')
V5_MANIFEST_GATE = ("            # once the version-6 act exists the version-5 manifest is history (pinned by the amendment registries)\n"
                    '            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/'
                    'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-ACT.md"))):\n')
V6_EXEMPTION = '    (PUBLIC_SOURCE_SCOPE_V6_ACT, "manifest"): PUBLIC_SOURCE_SCOPE_V6_MANIFEST,\n'


def policy_cg_v6_edits(text: str, v5_arg: str) -> str:
    """The version-6 act supersedes the version-5 act for the policy subject. Applies on top of
    `policy_cg_v5_edits`, with the three hunks the version-6 integration commit wrote, all or none;
    the version-5 manifest gate must already be there."""
    present = [V6_CHAIN_ROW in text, V6_OFFERING in text, V6_EXEMPTION in text]
    if all(present):
        if f'{V6_CHAIN_ROW}     "{v5_arg}"),\n' not in text:
            raise Refusal("the version-6 chain row quotes another argument than the version-5 act's")
        return text
    if any(present):
        raise Refusal(f"check_governance.py carries part of the version-6 install only ({present})")
    if V5_CHAIN_ROW not in text:
        raise Refusal("the version-6 chain row needs the version-5 install first (policy_cg_v5_edits)")
    once(text, V5_MANIFEST_GATE, "version-5 manifest registration gated on the version-6 act")
    i = after_row(text, V5_CHAIN_ROW, "version-5 chain row")
    text = text[:i] + V6_CHAIN_ROW + f'     "{v5_arg}"),\n' + text[i:]
    i = once(text, OFFERINGS_END_ANCHOR, "policy offerings end")
    text = text[:i] + V6_OFFERING + text[i:]
    return add_exemptions(text, V6_EXEMPTION)


def battery_lines_v4(record: str, new_arg: str, date: str, script: str = V4_SCRIPT) -> tuple[str, str]:
    """Version 4's recorder, and versions 5's and 6's, take the owner's words, which the record quotes on one `> ` line."""
    words = re.findall(r"^> (.+)$", record, re.M)
    if len(words) != 1:
        raise Refusal(f"the {script} act record quotes {len(words)} owner-word lines, expected one")
    if "#" in words[0]:
        raise Refusal("the owner's words contain '#', which the battery splitter reads as a comment; "
                      "add the --check line to PROJECT-STATUS.md and the workflow by hand")
    return (f"python3 scripts/{script}.py --check {new_arg} --date {date} --owner-words {shell_word(words[0])}",
            f"python3 scripts/{script}.py --selftest")


def battery_lines(record: str, new_arg: str, date: str, script: str = V1_SCRIPT) -> tuple[str, str]:
    """The scope recorder's --check line needs the owner's selection text, read back from the record."""
    opening = " ".join(grab(r'that opened "(.+?)" by selecting', record, "question opening", re.S).split())
    rows = re.findall(r'^\| "(.*)" \| "(.*)" \|$', record, re.M)
    if len(rows) != 1:
        raise Refusal(f"the scope act record carries {len(rows)} selection table rows, expected one")
    label, desc = rows[0]
    # Version 3's recorder also takes the packet words the selected option maps to, which its record quotes.
    words = [" ".join(w.split()) for w in re.findall(r'The packet maps that option to its\s+words\s+"([^"]+)"', record)]
    if len(words) > 1:
        raise Refusal(f"the scope act record quotes {len(words)} packet phrases, expected at most one")
    for s in (opening, label, desc, *words):
        if "#" in s:
            raise Refusal("the owner's selection text contains '#', which the battery splitter reads as a "
                          "comment; add the --check line to PROJECT-STATUS.md and the workflow by hand")
    cmd = (f"python3 scripts/{script}.py --check {new_arg} --date {date} "
           f"--question-opening {shell_word(opening)} --selection-label {shell_word(label)} "
           f"--selection-description {shell_word(desc)}"
           + "".join(f" --packet-words {shell_word(w)}" for w in words))
    return cmd, f"python3 scripts/{script}.py --selftest"


def shell_word(s: str) -> str:
    """One single-quoted shell word for `s` that a plain YAML `run:` scalar can also carry: a quote is
    written '\\'' and a ': ' as :'' (an empty quoted string ends the colon's run), since a plain scalar
    may hold neither ': ' nor ' #'. The shell reads the word back as exactly `s`."""
    return "'" + s.replace("'", "'\\''").replace(": ", ":'' ") + "'"


def edit_battery(status: str, workflow: str, check_cmd: str, selftest_cmd: str,
                 script: str = V1_SCRIPT) -> tuple[str, str]:
    """Idempotent. Three starting states: the re-pin lines (install the final recorder's lines in
    their place), an earlier scope recorder's lines (replace them in place when the final recorder
    is a later version), or the final recorder's lines already (nothing to do)."""
    if f"{script}.py --check" in status:
        return status, workflow
    note = "   # screening-scope policy act: record, aggregate block and applied subject"
    earlier = [s for s in SCOPE_SCRIPTS[:SCOPE_SCRIPTS.index(script)] if f"{s}.py --check" in status]
    if len(earlier) > 1:
        raise Refusal(f"status battery carries more than one earlier scope recorder: {earlier}")
    if earlier:
        prior = earlier[0]
        lines = status.split("\n")
        out, hit = [], 0
        for ln in lines:
            if ln.startswith(f"python3 scripts/{prior}.py --check"):
                out.append(check_cmd + note)
                hit += 1
            elif ln.startswith(f"python3 scripts/{prior}.py --selftest"):
                out.append(selftest_cmd)
                hit += 1
            else:
                out.append(ln)
        if hit != 2:
            raise Refusal("status battery: expected to replace exactly the earlier check and selftest lines")
        status = "\n".join(out)
        wl = workflow.split("\n")
        out, hit = [], 0
        for ln in wl:
            st = ln.strip()
            if st == f"- name: {prior} --check":
                out.append(ln.replace(prior, script))
                hit += 1
            elif st == f"- name: {prior} --selftest":
                out.append(ln.replace(prior, script))
                hit += 1
            elif st.startswith(f"run: python3 scripts/{prior}.py --check"):
                out.append("        run: " + check_cmd)
            elif st.startswith(f"run: python3 scripts/{prior}.py --selftest"):
                out.append("        run: " + selftest_cmd)
            else:
                out.append(ln)
        if hit != 2:
            raise Refusal("workflow: expected to replace exactly the earlier check and selftest steps")
        return status, "\n".join(out)
    drop_b = "python3 scripts/build_pwb_behavior_contract_repin.py --check"
    drop_r = "python3 scripts/record_pwb_behavior_contract_repin_acts.py --check policy "
    lines = status.split("\n")
    keep = []
    for ln in lines:
        if ln.startswith(drop_b) or ln.startswith(drop_r):
            continue
        keep.append(ln)
        if ln.startswith("python3 scripts/record_pwb_behavior_contract_repin_acts.py --selftest"):
            keep.append(check_cmd + note)
            keep.append(selftest_cmd)
    if len(keep) != len(lines):
        raise Refusal("status battery: expected to drop exactly two lines and add two")
    status = "\n".join(keep)
    skip = 0
    wlines = workflow.split("\n")
    out = []
    i = 0
    while i < len(wlines):
        ln = wlines[i]
        if ln.strip() in ("- name: build_pwb_behavior_contract_repin --check",
                          "- name: record_pwb_behavior_contract_repin_acts --check policy"):
            i += 3 if i + 2 < len(wlines) and wlines[i + 2].strip() == "" else 2
            skip += 1
            continue
        out.append(ln)
        if ln.strip() == "run: python3 scripts/record_pwb_behavior_contract_repin_acts.py --selftest":
            out += ["", f"      - name: {script} --check",
                    f"        run: {check_cmd}", "",
                    f"      - name: {script} --selftest",
                    f"        run: {selftest_cmd}"]
        i += 1
    if skip != 2:
        raise Refusal(f"workflow: expected to drop two steps, dropped {skip}")
    workflow = "\n".join(out)
    m = re.search(r"\bThe ([a-z]+(?:-[a-z]+)*) checks above are the same ([a-z]+(?:-[a-z]+)*)\b", status)
    if not m:
        raise Refusal("PROJECT-STATUS.md carries no 'The N checks above are the same N' sentence")
    block = re.search(r"## How to verify this page.*?```sh\n(.*?)```", status, re.S).group(1)
    n = len([ln for ln in block.split("\n") if ln.startswith("python3 ")])
    word = number_word(n)
    status = status.replace(m.group(0), f"The {word} checks above are the same {word}")
    return status, workflow


@dataclass
class PolicyAct:
    key: str
    path: str
    text: str
    arg: str
    identity: str
    tag: str
    date: str
    instant: str
    script: str
    supersedes: str          # the act record this one supersedes in the read gate's pair
    manifest: str


def read_policy_act(root: pathlib.Path, key: str, path: str, script: str, manifest: str,
                    supersedes: str) -> PolicyAct:
    if not (root / path).is_file():
        raise Refusal(f"the {key} policy act record is absent: {path}")
    text = (root / path).read_text()
    return PolicyAct(
        key, path, text,
        grab(r"^Exact digest \(SHA-256\): `([0-9a-f]{64})`$", text, f"{key} act digest"),
        grab(r"^Act identity: `([^`]+)`$", text, f"{key} act identity"),
        grab(r"recording tag: `([^`]+)`", text, f"{key} recording tag"),
        grab(r"^Date: (\d{4}-\d{2}-\d{2})$", text, f"{key} act date"),
        grab(r"^Recorded at \(UTC\): (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$", text, f"{key} recorded instant"),
        script, supersedes, manifest)


def policy_acts(root: pathlib.Path) -> list[PolicyAct]:
    """The policy acts in force, in order: version 1, then versions 2 to 6 when each exists.
    Each later version needs the one before it. Refuses an order or a pair the records themselves
    contradict, so the wrong order is never installed."""
    v1 = read_policy_act(root, "v1", SCOPE_ACT, V1_SCRIPT, SCOPE_MANIFEST, REPIN_ACT)
    acts = [v1]
    for key, path, script, manifest, n in (("v2", V2_ACT, V2_SCRIPT, V2_MANIFEST, 2),
                                           ("v3", V3_ACT, V3_SCRIPT, V3_MANIFEST, 3),
                                           ("v4", V4_ACT, V4_SCRIPT, V4_MANIFEST, 4),
                                           ("v5", V5_ACT, V5_SCRIPT, V5_MANIFEST, 5),
                                           ("v6", V6_ACT, V6_SCRIPT, V6_MANIFEST, 6)):
        if not (root / path).is_file():
            continue
        prev = acts[-1]
        if prev.key != f"v{n - 1}":
            raise Refusal(f"the version-{n} act exists without the version-{n - 1} act")
        act = read_policy_act(root, key, path, script, manifest, prev.path)
        if act.arg == prev.arg:
            raise Refusal(f"the version-{n} act carries the version-{n - 1} act's argument: it cannot supersede it")
        if act.instant <= prev.instant:
            raise Refusal(f"the version-{n} act ({act.instant}) is not recorded after the version-{n - 1} act "
                          f"({prev.instant}): it supersedes the version-{n - 1} act, so the order is "
                          f"v{n - 1} then v{n}")
        if prev.path not in act.text or prev.arg not in act.text:
            raise Refusal(f"the version-{n} act record does not name the version-{n - 1} act and its argument "
                          "as the act it supersedes")
        acts.append(act)
    policy = sha((root / POLICY_JSON).read_bytes())
    if policy != acts[-1].arg:
        raise Refusal(f"the policy on disk does not hash to the final policy act's argument "
                      f"({acts[-1].key}); the acts and the policy disagree")
    return acts


GATE_POLICY_POINTER = re.compile(
    r"policy: '(\.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-[A-Z0-9-]+-ACT\.md)'")
GATE_COMMENT = re.compile(r"// The policy act is the [^\n]*\n(?://[^\n]*\n)*(?=export const PWB_ACT_RECORDS:)")


def repoint_gate(inputs: str, desired: list[str], comment: str) -> str:
    """Rewrite the two policy record pointers to (final act, the act it supersedes) and the
    explanatory comment, whatever pair the file carries now."""
    if len(GATE_POLICY_POINTER.findall(inputs)) != 2:
        raise Refusal("governance-inputs.ts does not carry exactly two policy record pointers")
    count = iter(range(2))
    out = GATE_POLICY_POINTER.sub(lambda m: f"policy: '{desired[next(count)]}'", inputs)
    out = GATE_COMMENT.sub("", out)
    marker = "export const PWB_ACT_RECORDS:"
    once(out, marker, "gate act-records marker")
    return out.replace(marker, comment + marker, 1)


#: The read gate's registry sentence since the 2026-10-20 machine-ceiling install (P-114), which the
#: version-5 comment carries after its policy sentence.
REGISTRY_CEILING_SENTENCE = ("The registry machine-ceiling act supersedes its\n"
                             "// 2026-10-02 re-pin under OWNER-DIRECTION-MACHINE-CEILING-INSTALL-2026-10-20:\n"
                             "// only that registry row, its pointers and the matching runtime ceiling change.\n")


def gate_comment(acts: list[PolicyAct]) -> str:
    final = acts[-1]
    if final.key == "v6":
        chosen = re.findall(r"^Chosen variant: `([a-z-]+)`", final.text, re.M)
        variant = f" (variant {chosen[0]})" if len(chosen) == 1 else ""
        return (f"// The policy act is the {final.date} public-source screening-scope version 6 act{variant}, superseding the\n"
                f"// {acts[4].date} version-5 act. {REGISTRY_CEILING_SENTENCE}")
    if final.key == "v5":
        chosen = re.findall(r"^Chosen variant: `([a-z-]+)`", final.text, re.M)
        variant = f" (variant {chosen[0]})" if len(chosen) == 1 else ""
        return (f"// The policy act is the {final.date} public-source screening-scope version 5 act{variant}, superseding the\n"
                f"// {acts[3].date} version-4 act. {REGISTRY_CEILING_SENTENCE}")
    if final.key == "v4":
        return (f"// The policy act is the {final.date} public-source screening-scope version 4 act, superseding the\n"
                f"// {acts[2].date} version-3 act; the registry act is still its 2026-10-02 re-pin act.\n")
    if final.key == "v3":
        return (f"// The policy act is the {final.date} public-source screening-scope version 3 act, superseding the\n"
                f"// {acts[1].date} version-2 act; the registry act is still its 2026-10-02 re-pin act.\n")
    if final.key == "v2":
        return (f"// The policy act is the {final.date} public-source screening-scope version 2 act, superseding the\n"
                f"// {acts[0].date} version-1 act; the registry act is still its 2026-10-02 re-pin act.\n")
    return (f"// The policy act is the {final.date} public-source screening-scope act, superseding the\n"
            f"// 2026-10-02 policy re-pin act; the registry act is still its 2026-10-02 re-pin act.\n")


def step_policy(root: pathlib.Path, write: bool) -> bool:
    acts = policy_acts(root)
    final = acts[-1]
    repin = (root / REPIN_ACT).read_text()
    repin_arg = grab(r"^Exact digest \(SHA-256\): `([0-9a-f]{64})`$", repin, "re-pin digest")
    new_ver = json.loads((root / POLICY_JSON).read_text())["policyVersion"]
    reader = (root / "packages/three-surface-poc-core/src/git-object-reader.ts").read_text()
    old_ver = grab(r"policyVersion: '([^']+)'", reader, "reader policy version") if "policyVersion: '" in reader else new_ver
    inputs = (root / INPUTS_TS).read_text()
    changed = False
    # check_governance supersession: the version-1 link, then each later link on top of it
    cg = root / CG
    text = cg.read_text()
    new_text = policy_cg_edits(text, repin_arg)
    if final.key in ("v2", "v3", "v4", "v5", "v6"):
        new_text = policy_cg_v2_edits(new_text, acts[0].arg)
    if final.key in ("v3", "v4", "v5", "v6"):
        new_text = policy_cg_v3_edits(new_text, acts[1].arg)
    if final.key in ("v4", "v5", "v6"):
        new_text = policy_cg_v4_edits(new_text, acts[2].arg)
    if final.key in ("v5", "v6"):
        new_text = policy_cg_v5_edits(new_text, acts[3].arg)
    if final.key == "v6":
        new_text = policy_cg_v6_edits(new_text, acts[4].arg)
    if new_text != text:
        changed = True
        if write:
            J.write(cg, new_text)
    # the read gate and its tests follow the final act, once: its policy pointer pair is
    # (final act, the act it supersedes)
    desired = [final.path, final.supersedes]
    found = GATE_POLICY_POINTER.findall(inputs)
    if len(found) != 2:
        raise Refusal(f"governance-inputs.ts carries {len(found)} policy record pointers, expected two")
    if found != desired:
        changed = True
        if write:
            old_id = grab(r"actIdentity: '(PWB-SECRET-CLASSIFICATION-POLICY-[^']+)'", inputs, "gate policy identity")
            old_tag = grab(r"recordingTag: '(pwb-approve-policy-[^']+)'", inputs, "gate policy tag")
            for rel in PIN_FILES:
                p = root / rel
                s = p.read_text()
                for a, b in ((old_id, final.identity), (old_tag, final.tag), (old_ver, new_ver)):
                    if a in s:
                        s = s.replace(a, b)
                J.write(p, s)
            J.write(root / INPUTS_TS, repoint_gate((root / INPUTS_TS).read_text(), desired, gate_comment(acts)))
            t = (root / INPUTS_TEST).read_text()
            t = re.sub(r"const EVALUATION_INSTANT = '[^']+';", f"const EVALUATION_INSTANT = '{evaluation_instant(final)}';", t)
            J.write(root / INPUTS_TEST, t)
    # the status battery and the hosted workflow carry the final recorder's lines
    check_cmd, selftest_cmd = final_battery_lines(final)
    status = (root / STATUS).read_text()
    workflow = (root / WORKFLOW).read_text()
    ns, nw = edit_battery(status, workflow, check_cmd, selftest_cmd, final.script)
    if (ns, nw) != (status, workflow):
        changed = True
        if write:
            J.write(root / STATUS, ns)
            J.write(root / WORKFLOW, nw)
    return changed


def final_battery_lines(final: PolicyAct) -> tuple[str, str]:
    """The status battery's two lines for the final act's recorder: its --check line and its --selftest line."""
    return (battery_lines_v4(final.text, final.arg, final.date, final.script) if final.key in ("v4", "v5", "v6")
            else battery_lines(final.text, final.arg, final.date, final.script))


def evaluation_instant(final: PolicyAct) -> str:
    """The instant the read gate's test evaluates at. Version 5's owner words came at 06:17:55Z, so
    midnight of its date is before the act: from version 5 the test evaluates at the record's own
    instant (version 6's too); earlier versions at midnight of their date, as they were installed."""
    return final.instant if final.key in ("v5", "v6") else f"{final.date}T00:00:00Z"


STEPS = (("registrations", step_registrations), ("rfc5", step_rfc5), ("policy", step_policy), ("profile", step_profile),
         ("reconcile", step_reconcile))


def run(root: pathlib.Path, write: bool, only: tuple[str, ...] = ()) -> int:
    """`only` names steps to run alone, for an install after the sitting (the 2026-10-08 version-3
    act): those steps check their own records, and the sitting's full record set is not required,
    as the local-agent sitting's installer (`install_redis_local_agent_sitting.py`) composes them."""
    global J
    J = Journal()
    unknown = [s for s in only if s not in dict(STEPS)]
    if unknown:
        print(f"REFUSED: unknown step(s) {unknown}; the steps are {[n for n, _f in STEPS]}")
        return 2
    missing = [] if only else missing_records(root)
    if missing:
        print("REFUSED: required act records are missing (nothing written):")
        for m in missing:
            print(f"  {m}")
        return 2
    try:
        if not only:
            rfc5_precondition(root)
            print(check_stage_map(root))
        pending = []
        for name, fn in STEPS:
            if only and name not in only:
                continue
            if fn(root, write):
                pending.append(name)
    except Refusal as exc:
        J.restore()
        print(f"REFUSED: {exc} (tree restored)")
        return 2
    if write:
        print("installed: " + (", ".join(pending) if pending else "nothing to do (already installed)"))
        return 0
    print("not installed: " + (", ".join(pending) if pending else "none"))
    return 1 if pending else 0


# ---- selftest ----------------------------------------------------------------

#: A check_governance.py as it stood before any screening-scope link was installed, reduced to
#: the anchors the chain edits find: the selftest exercises those edits from that state, since the
#: live file already carries the version-1 and version-2 links.
PRE_INSTALL_CG = '''PWB_EFFECT_AMENDMENT_ACTS = (
    (PWB_EFFECT_ACTS[2][0], PWB_EFFECT_ACTS[2][1],
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md",
     f"{DECISIONS}/PWB-OBSERVER-REGISTRY-BEHAVIOR-CONTRACT-REPIN-ACT.md",
     "2356b9ed3235b3dff79caeb352803a30c446b7365a2a7ea74df302b9fa51386a"),
)
#: For a chained amendment row, the package that offered the predecessor
PWB_EFFECT_AMENDMENT_OFFERINGS = {
    f"{DECISIONS}/PWB-OBSERVER-REGISTRY-CURRENCY-BRIEFING-AMENDMENT-ACT.md": {
        f"{CANDIDATES}/pwb-registry-currency-briefing-amendment/PWB-EFFECT-AMENDMENT-MANIFEST.txt": "row",
    },
}
PWB_STATE1_SUBJECTS = tuple(sorted((
    "a",
)))


def _activate_pwb_effect_amendment_act_copy_registries():
    for label, subject, predecessor, act, performed_digest in PWB_EFFECT_AMENDMENT_ACTS:
        if predecessor in PWB_EFFECT_AMENDMENT_OFFERINGS:
            historical = {}
            for rel, shape in PWB_EFFECT_AMENDMENT_OFFERINGS[predecessor].items():
                historical[rel] = manifest_row if shape == "row" else phrase_line


PWB_BEHAVIOR_REPIN_MANIFEST = f"{PWB_BEHAVIOR_REPIN_DIR}/PWB-EFFECT-REPIN-MANIFEST.txt"


def _activate_pwb_behavior_repin_manifest_copy_registry():
    if os.path.isfile(os.path.join(ROOT, PWB_BEHAVIOR_REPIN_MANIFEST)):
        ACT_DIGEST_COPY_FILES[PWB_BEHAVIOR_REPIN_MANIFEST] = (
            PWB_EFFECT_ACTS[1][0], PWB_EFFECT_ACTS[2][0])


_activate_pwb_behavior_repin_manifest_copy_registry()


def _activate_public_source_scope_v2_copy_registry():
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V2_MANIFEST))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V2_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


def _activate_public_source_scope_v3_copy_registry():
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V3_MANIFEST))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V3_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


def _activate_public_source_scope_v4_copy_registry():
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V4_MANIFEST))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V4_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


def _activate_public_source_scope_v5_copy_registry():
    if (os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V5_ACT))
            and os.path.isfile(os.path.join(ROOT, PUBLIC_SOURCE_SCOPE_V5_MANIFEST))
            # once the version-6 act exists the version-5 manifest is history (pinned by the amendment registries)
            and not os.path.isfile(os.path.join(ROOT, f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-ACT.md"))):
        ACT_DIGEST_COPY_FILES[PUBLIC_SOURCE_SCOPE_V5_MANIFEST] = (PUBLIC_SOURCE_SCOPE_V2_LABEL,)


BARE_DIGEST_HEADING_MANIFEST_EXEMPTIONS = {
    (f"{PWB_EFFECT_ACTS_DIR}/CANDIDATE-REPORT.md", "three-artifact manifest"):
        f"{PWB_EFFECT_ACTS_DIR}/PWB-EFFECT-ACTS-MANIFEST.txt",
}
'''


def policy_selftests() -> list[tuple[str, bool]]:
    """The two-policy-act install: order, pairs, the chain edits, the gate pointers, the battery."""
    ok: list[tuple[str, bool]] = []

    def refused(fn) -> bool:
        try:
            fn()
        except Refusal:
            return True
        return False

    def record(arg, ident, tag, date, instant, extra=""):
        return (f"# act\n\nDate: {date}\n\nRecorded at (UTC): {instant}\n\nAct identity: `{ident}`\n\n"
                f"Exact digest (SHA-256): `{arg}`\n\n- recording tag: `{tag}`, on the commit\n{extra}\n"
                'that opened "Q one" by selecting the\n| "L" | "D d" |\n')

    a1, a2, repin = "1" * 64, "2" * 64, "0" * 64
    pol1, pol2, pol3 = b'{"policyVersion": "1.2.0"}\n', b'{"policyVersion": "1.3.0"}\n', b'{"policyVersion": "1.4.0"}\n'
    pol4, pol5, pol6 = b'{"policyVersion": "1.5.0"}\n', b'{"policyVersion": "1.6.0"}\n', b'{"policyVersion": "1.7.0"}\n'
    a1, a2, a3, a4, a5, a6 = sha(pol1), sha(pol2), sha(pol3), sha(pol4), sha(pol5), sha(pol6)

    def tree(t, v2=True, v2_instant="2026-10-04T10:00:00Z", v2_arg=None, policy=None, naming=True, v1=True,
             v3=False, v3_instant="2026-10-09T10:00:00Z", v3_arg=None, v3_naming=True,
             v4=False, v4_instant="2026-10-20T10:00:00Z", v4_arg=None, v4_naming=True,
             v5=False, v5_instant="2026-11-03T06:58:26Z", v5_arg=None, v5_naming=True,
             v6=False, v6_instant="2026-11-05T09:43:08Z", v6_arg=None, v6_naming=True):
        root = pathlib.Path(t)
        (root / SCOPE_ACT).parent.mkdir(parents=True, exist_ok=True)
        if v1:
            (root / SCOPE_ACT).write_text(record(a1, "ID1", "tag1", "2026-10-04", "2026-10-04T09:00:00Z"))
        (root / REPIN_ACT).write_text(record(repin, "ID0", "tag0", "2026-10-02", "2026-10-02T09:00:00Z"))
        if v2:
            extra = f"supersedes `{SCOPE_ACT}` argument `{a1}`\n" if naming else "\n"
            (root / V2_ACT).write_text(record(v2_arg or a2, "ID2", "tag2", "2026-10-04", v2_instant, extra))
        if v3:
            extra = f"supersedes `{V2_ACT}` argument `{v2_arg or a2}`\n" if v3_naming else "\n"
            (root / V3_ACT).write_text(record(v3_arg or a3, "ID3", "tag3", "2026-10-09", v3_instant, extra))
        if v4:
            extra = f"supersedes `{V3_ACT}` argument `{v3_arg or a3}`\n" if v4_naming else "\n"
            (root / V4_ACT).write_text(record(v4_arg or a4, "ID4", "tag4", "2026-10-20", v4_instant, extra))
        if v5:
            extra = f"supersedes `{V4_ACT}` argument `{v4_arg or a4}`\n" if v5_naming else "\n"
            (root / V5_ACT).write_text(record(v5_arg or a5, "ID5", "tag5", "2026-11-03", v5_instant, extra))
        if v6:
            extra = f"supersedes `{V5_ACT}` argument `{v5_arg or a5}`\n" if v6_naming else "\n"
            (root / V6_ACT).write_text(record(v6_arg or a6, "ID6", "tag6", "2026-11-05", v6_instant, extra))
        (root / POLICY_JSON).parent.mkdir(parents=True, exist_ok=True)
        (root / POLICY_JSON).write_bytes(policy if policy is not None
                                         else (pol6 if v6 else pol5 if v5 else pol4 if v4 else pol3 if v3 else pol2 if v2 else pol1))
        return root

    with tempfile.TemporaryDirectory() as t:
        got = policy_acts(tree(t, v2=False))
        ok.append(("policy acts: version 1 alone is the final act, superseding the re-pin",
                   [a.key for a in got] == ["v1"] and got[-1].supersedes == REPIN_ACT))
    with tempfile.TemporaryDirectory() as t:
        got = policy_acts(tree(t))
        ok.append(("policy acts: version 1 then version 2, the final act supersedes version 1",
                   [a.key for a in got] == ["v1", "v2"] and got[-1].supersedes == SCOPE_ACT
                   and got[-1].script == V2_SCRIPT and got[-1].arg == a2))
    with tempfile.TemporaryDirectory() as t:
        got = policy_acts(tree(t, v3=True))
        ok.append(("policy acts: versions 1, 2 then 3, the final act supersedes version 2",
                   [a.key for a in got] == ["v1", "v2", "v3"] and got[-1].supersedes == V2_ACT
                   and got[-1].script == V3_SCRIPT and got[-1].arg == a3 and got[-1].manifest == V3_MANIFEST))
    with tempfile.TemporaryDirectory() as t:
        got = policy_acts(tree(t, v3=True, v4=True))
        ok.append(("policy acts: versions 1 to 4, the final act supersedes version 3",
                   [a.key for a in got] == ["v1", "v2", "v3", "v4"] and got[-1].supersedes == V3_ACT
                   and got[-1].script == V4_SCRIPT and got[-1].arg == a4 and got[-1].manifest == V4_MANIFEST))
    with tempfile.TemporaryDirectory() as t:
        got = policy_acts(tree(t, v3=True, v4=True, v5=True))
        ok.append(("policy acts: versions 1 to 5, the final act supersedes version 4",
                   [a.key for a in got] == ["v1", "v2", "v3", "v4", "v5"] and got[-1].supersedes == V4_ACT
                   and got[-1].script == V5_SCRIPT and got[-1].arg == a5 and got[-1].manifest == V5_MANIFEST))
    with tempfile.TemporaryDirectory() as t:
        got = policy_acts(tree(t, v3=True, v4=True, v5=True, v6=True))
        ok.append(("policy acts: versions 1 to 6, the final act supersedes version 5",
                   [a.key for a in got] == ["v1", "v2", "v3", "v4", "v5", "v6"] and got[-1].supersedes == V5_ACT
                   and got[-1].script == V6_SCRIPT and got[-1].arg == a6 and got[-1].manifest == V6_MANIFEST))
    for name, kwargs in (("version 2 recorded before version 1", dict(v2_instant="2026-10-04T08:00:00Z")),
                         ("version 2 recorded at the same instant", dict(v2_instant="2026-10-04T09:00:00Z")),
                         ("version 2 carrying version 1's argument", dict(v2_arg=a1, policy=pol1)),
                         ("version 2 that does not name version 1", dict(naming=False)),
                         ("the policy still at version 1's bytes after version 2", dict(policy=pol1)),
                         ("version 2 without version 1", dict(v1=False)),
                         ("version 3 without version 2", dict(v2=False, v3=True)),
                         ("version 3 recorded before version 2", dict(v3=True, v3_instant="2026-10-04T09:30:00Z")),
                         ("version 3 recorded at version 2's instant", dict(v3=True, v3_instant="2026-10-04T10:00:00Z")),
                         ("version 3 carrying version 2's argument", dict(v3=True, v3_arg=a2, policy=pol2)),
                         ("version 3 that does not name version 2", dict(v3=True, v3_naming=False)),
                         ("the policy still at version 2's bytes after version 3", dict(v3=True, policy=pol2)),
                         ("version 4 without version 3", dict(v4=True)),
                         ("version 4 recorded before version 3", dict(v3=True, v4=True, v4_instant="2026-10-09T09:00:00Z")),
                         ("version 4 recorded at version 3's instant", dict(v3=True, v4=True, v4_instant="2026-10-09T10:00:00Z")),
                         ("version 4 carrying version 3's argument", dict(v3=True, v4=True, v4_arg=a3, policy=pol3)),
                         ("version 4 that does not name version 3", dict(v3=True, v4=True, v4_naming=False)),
                         ("the policy still at version 3's bytes after version 4", dict(v3=True, v4=True, policy=pol3)),
                         ("version 5 without version 4", dict(v3=True, v5=True)),
                         ("version 5 recorded before version 4", dict(v3=True, v4=True, v5=True, v5_instant="2026-10-20T09:00:00Z")),
                         ("version 5 carrying version 4's argument", dict(v3=True, v4=True, v5=True, v5_arg=a4, policy=pol4)),
                         ("version 5 that does not name version 4", dict(v3=True, v4=True, v5=True, v5_naming=False)),
                         ("the policy still at version 4's bytes after version 5", dict(v3=True, v4=True, v5=True, policy=pol4)),
                         ("version 6 without version 5", dict(v3=True, v4=True, v6=True)),
                         ("version 6 recorded before version 5", dict(v3=True, v4=True, v5=True, v6=True, v6_instant="2026-11-03T06:00:00Z")),
                         ("version 6 carrying version 5's argument", dict(v3=True, v4=True, v5=True, v6=True, v6_arg=a5, policy=pol5)),
                         ("version 6 that does not name version 5", dict(v3=True, v4=True, v5=True, v6=True, v6_naming=False)),
                         ("the policy still at version 5's bytes after version 6", dict(v3=True, v4=True, v5=True, v6=True, policy=pol5))):
        with tempfile.TemporaryDirectory() as t:
            root = tree(t, **kwargs)
            ok.append((f"policy acts refuse the wrong order or pair: {name}", refused(lambda: policy_acts(root))))
    with tempfile.TemporaryDirectory() as t:
        root = tree(t, v2=False, policy=pol2)
        ok.append(("policy acts: a policy that is not the final act's argument is refused",
                   refused(lambda: policy_acts(root))))

    # the check_governance edits: version 1, then version 2, then version 3 on top, in that order only.
    # The live check_governance.py already carries the version-1 and version-2 links, so those two are
    # exercised on a pre-install fixture (`PRE_INSTALL_CG`) carrying only the anchors they edit; the
    # version-3 edit is exercised on that fixture and on the live file, whose anchors it must still find.
    cg_text = PRE_INSTALL_CG
    live = (ROOT / CG).read_text()
    try:
        v1_only = policy_cg_edits(cg_text, "a" * 64)
        both = policy_cg_v2_edits(v1_only, "b" * 64)
        ast.parse(both)
        ok.append(("chain edits: version 2 on top of version 1 is valid Python", True))
        ok.append(("chain edits: one version-2 row, one offering, the version-1 manifest gated, one exemption",
                   both.count(V2_CHAIN_MARK) == 1
                   and both.count('PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md": ') == 0
                   and both.count("PUBLIC-SOURCE-SCREENING-SCOPE-MANIFEST.txt\": \"row\"") == 1
                   and V1_MANIFEST_GATE_NEW in both and V1_MANIFEST_GATE_OLD not in both
                   and both.count("PUBLIC_SOURCE_SCOPE_V2_MANIFEST,") == 1 + cg_text.count("PUBLIC_SOURCE_SCOPE_V2_MANIFEST,")))
        ok.append(("chain edits: version 2 is idempotent", policy_cg_v2_edits(both, "b" * 64) == both))
        ok.append(("chain edits: the argument quoted is version 1's", f'"{"b" * 64}"),' in both))
        three = policy_cg_v3_edits(both, "c" * 64)
        ast.parse(three)
        ok.append(("chain edits: version 3 on top of version 2 is valid Python", True))
        ok.append(("chain edits: one version-3 row, one variant-row offering, the shape taught, the version-2 manifest gated, one exemption",
                   three.count(V3_CHAIN_MARK) == 1
                   and three.count('PUBLIC-SOURCE-SCREENING-SCOPE-V2-MANIFEST.txt": "variant-row"') == 1
                   and OFFERING_SHAPE_NEW in three and OFFERING_SHAPE_OLD not in three
                   and V2_MANIFEST_GATE_NEW in three and V2_MANIFEST_GATE_OLD not in three
                   and three.count("PUBLIC_SOURCE_SCOPE_V3_MANIFEST,") == 1 + both.count("PUBLIC_SOURCE_SCOPE_V3_MANIFEST,")))
        ok.append(("chain edits: version 3 is idempotent", policy_cg_v3_edits(three, "c" * 64) == three))
        ok.append(("chain edits: the argument quoted is version 2's", f'"{"c" * 64}"),' in three))
        # The live file is either before the version-3 install (the edit applies once) or after it (the edit
        # is already there, so it changes nothing); both must hold from either side of the install commit.
        installed = V3_CHAIN_MARK in live
        live3 = policy_cg_v3_edits(live, "c" * 64)
        ast.parse(live3)
        ok.append(("chain edits: version 3 applies to the live check_governance.py once and stays valid Python",
                   live3.count(V3_CHAIN_MARK) == 1 and (live3 == live if installed else live3 != live)))
        four = policy_cg_v4_edits(three, "d" * 64)
        ast.parse(four)
        ok.append(("chain edits: version 4 on top of version 3 is valid Python", True))
        ok.append(("chain edits: one version-4 row, one version-3 variant-row offering, the version-3 manifest gated, one exemption",
                   four.count(V4_CHAIN_ROW) == 1 and four.count(f'{V4_CHAIN_ROW}     "{"d" * 64}"),\n') == 1
                   and four.count('PUBLIC-SOURCE-SCREENING-SCOPE-V3-MANIFEST.txt": "variant-row"') == 1
                   and V3_MANIFEST_GATE_NEW in four and V3_MANIFEST_GATE_OLD not in four
                   and four.count(V4_EXEMPTION) == 1))
        ok.append(("chain edits: version 4 is idempotent", policy_cg_v4_edits(four, "d" * 64) == four))
        ok.append(("chain edits: an installed version-4 row quoting another argument is refused",
                   refused(lambda: policy_cg_v4_edits(four, "e" * 64))))
        # Only the chain row present: the other three anchors still apply, so only the all-or-none rule refuses it.
        row_only = (four.replace(V4_OFFERING, "", 1).replace(V3_MANIFEST_GATE_NEW, V3_MANIFEST_GATE_OLD, 1)
                    .replace(V4_EXEMPTION, "", 1))
        ok.append(("chain edits: a partial version-4 install (the chain row alone) is refused",
                   row_only != four and refused(lambda: policy_cg_v4_edits(row_only, "d" * 64))))
        for k, hunk in enumerate((V4_OFFERING, V4_EXEMPTION)):
            ok.append((f"chain edits: a partial version-4 install (hunk {k + 2} missing) is refused",
                       refused(lambda: policy_cg_v4_edits(four.replace(hunk, "", 1), "d" * 64))))
        five = policy_cg_v5_edits(four, "e" * 64)
        ast.parse(five)
        ok.append(("chain edits: one version-5 row after the version-4 row, one version-4 variant-row offering, the version-4 manifest gated, one exemption",
                   five.count(V5_CHAIN_ROW) == 1 and f'{V4_CHAIN_ROW}     "{"d" * 64}"),\n{V5_CHAIN_ROW}     "{"e" * 64}"),\n' in five
                   and five.count('PUBLIC-SOURCE-SCREENING-SCOPE-V4-MANIFEST.txt": "variant-row"') == 1
                   and V4_MANIFEST_GATE_NEW in five and V4_MANIFEST_GATE_OLD not in five and five.count(V5_EXEMPTION) == 1))
        ok.append(("chain edits: version 5 is idempotent", policy_cg_v5_edits(five, "e" * 64) == five))
        ok.append(("chain edits: an installed version-5 row quoting another argument is refused",
                   refused(lambda: policy_cg_v5_edits(five, "f" * 64))))
        for k, hunk in enumerate((V5_OFFERING, V5_EXEMPTION)):
            ok.append((f"chain edits: a partial version-5 install (hunk {k + 2} missing) is refused",
                       refused(lambda: policy_cg_v5_edits(five.replace(hunk, "", 1), "e" * 64))))
        ok.append(("chain edits: version 5 without version 4 is refused", refused(lambda: policy_cg_v5_edits(three, "e" * 64))))
        try:
            policy_cg_v5_edits(three, "e" * 64)
            why = ""
        except Refusal as refusal:
            why = str(refusal)
        ok.append(("chain edits: version 5 without version 4 is refused for that reason", "needs the version-4 install first" in why))
        row_only5 = (five.replace(V5_OFFERING, "", 1).replace(V4_MANIFEST_GATE_NEW, V4_MANIFEST_GATE_OLD, 1)
                     .replace(V5_EXEMPTION, "", 1))
        ok.append(("chain edits: a partial version-5 install (the chain row alone) is refused",
                   row_only5 != five and V5_CHAIN_ROW in row_only5 and refused(lambda: policy_cg_v5_edits(row_only5, "e" * 64))))
        six = policy_cg_v6_edits(five, "f" * 64)
        ast.parse(six)
        ok.append(("chain edits: one version-6 row after the version-5 row, one version-5 variant-row offering, one exemption",
                   six.count(V6_CHAIN_ROW) == 1 and f'{V5_CHAIN_ROW}     "{"e" * 64}"),\n{V6_CHAIN_ROW}     "{"f" * 64}"),\n' in six
                   and six.count('PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt": "variant-row"') == 1
                   and six.count(V6_EXEMPTION) == 1 and six.count(V5_MANIFEST_GATE) == 1))
        ok.append(("chain edits: version 6 is idempotent", policy_cg_v6_edits(six, "f" * 64) == six))
        ok.append(("chain edits: an installed version-6 row quoting another argument is refused",
                   refused(lambda: policy_cg_v6_edits(six, "e" * 64))))
        for k, hunk in enumerate((V6_OFFERING, V6_EXEMPTION)):
            ok.append((f"chain edits: a partial version-6 install (hunk {k + 2} missing) is refused",
                       refused(lambda: policy_cg_v6_edits(six.replace(hunk, "", 1), "f" * 64))))
        row_only6 = six.replace(V6_OFFERING, "", 1).replace(V6_EXEMPTION, "", 1)
        ok.append(("chain edits: a partial version-6 install (the chain row alone) is refused",
                   row_only6 != six and V6_CHAIN_ROW in row_only6 and refused(lambda: policy_cg_v6_edits(row_only6, "f" * 64))))
        try:
            policy_cg_v6_edits(four, "f" * 64)
            why6 = ""
        except Refusal as refusal:
            why6 = str(refusal)
        ok.append(("chain edits: version 6 without version 5 is refused for that reason", "needs the version-5 install first" in why6))
        ok.append(("chain edits: version 6 without the version-5 manifest gate is refused",
                   refused(lambda: policy_cg_v6_edits(five.replace(V5_MANIFEST_GATE, "):\n", 1), "f" * 64))))
        # The live file carries the version-4 install (2026-10-20) and the version-5 hunks the version-5 recorder change
        # wrote (2026-11-03), neither with a mark: undoing each version's four hunks, newest first, and re-applying its edit
        # must give the bytes back exactly, though a later chain row (P-114's registry row) follows both.
        v3_live_arg = "c13bd56c70698ccdf55fa2b0a81ed51f4b3f385848d5eccd97b8be3cfad48fce"
        v4_live_arg = "319e404ee413220550d65644f6c93db096ed1cda431760baec70a1e190adb0bd"
        v5_live_arg = "e8a2f4f375fcf3ce1db753a5a30f77dbf961fab2115185946e8067f64ae5fe2b"
        base5 = live
        if V6_CHAIN_ROW in live:
            pre6 = (live.replace(f'{V6_CHAIN_ROW}     "{v5_live_arg}"),\n', "", 1).replace(V6_OFFERING, "", 1)
                    .replace(V6_EXEMPTION, "", 1))
            ok.append(("chain edits: version 6 reproduces the live install byte for byte and is idempotent on it",
                       pre6 != live and policy_cg_v6_edits(pre6, v5_live_arg) == live
                       and policy_cg_v6_edits(live, v5_live_arg) == live))
            base5 = pre6
            # step_policy itself must carry the version-6 edit: over a copy of the live inputs it is the step that would
            # put the hunks back into a check_governance.py that lacks them, and it finds nothing to do on the live file.
            with tempfile.TemporaryDirectory() as t:
                scratch = pathlib.Path(t)
                shutil.copytree(ROOT / DECISIONS, scratch / DECISIONS)
                for rel in (CG, POLICY_JSON, STATUS, WORKFLOW, *PIN_FILES):
                    (scratch / rel).parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(ROOT / rel, scratch / rel)
                live_clean = not step_policy(scratch, write=False)
                (scratch / CG).write_text(pre6)
                ok.append(("step policy: over the live inputs it has nothing to do, and with the version-6 hunks undone it would install them",
                           live_clean and step_policy(scratch, write=False)))
        base4 = base5
        if V5_CHAIN_ROW in base5:
            pre5 = (base5.replace(f'{V5_CHAIN_ROW}     "{v4_live_arg}"),\n', "", 1).replace(V5_OFFERING, "", 1)
                    .replace(V4_MANIFEST_GATE_NEW, V4_MANIFEST_GATE_OLD, 1).replace(V5_EXEMPTION, "", 1))
            ok.append(("chain edits: version 5 reproduces the live install byte for byte and is idempotent on it",
                       pre5 != base5 and policy_cg_v5_edits(pre5, v4_live_arg) == base5
                       and policy_cg_v5_edits(base5, v4_live_arg) == base5))
            base4 = pre5
        if V4_CHAIN_ROW in base4:
            pre4 = (base4.replace(f'{V4_CHAIN_ROW}     "{v3_live_arg}"),\n', "", 1).replace(V4_OFFERING, "", 1)
                    .replace(V3_MANIFEST_GATE_NEW, V3_MANIFEST_GATE_OLD, 1).replace(V4_EXEMPTION, "", 1))
            ok.append(("chain edits: version 4 reproduces the live install byte for byte and is idempotent on it",
                       pre4 != base4 and policy_cg_v4_edits(pre4, v3_live_arg) == base4
                       and policy_cg_v4_edits(base4, v3_live_arg) == base4))
        else:
            live4 = policy_cg_v4_edits(live, v3_live_arg)
            ast.parse(live4)
            ok.append(("chain edits: version 4 applies to the live check_governance.py once", live4 != live))
    except (SyntaxError, Refusal) as exc:
        print(f"  (chain edit failure: {exc})")
        ok.append(("chain edits: the version 1 to 4 edits apply and are valid Python", False))
    ok.append(("chain edits: version 4 without version 3 is refused",
               refused(lambda: policy_cg_v4_edits(policy_cg_v2_edits(policy_cg_edits(cg_text, "a" * 64), "b" * 64), "d" * 64))))
    ok.append(("chain edits: version 2 without version 1 is refused",
               refused(lambda: policy_cg_v2_edits(cg_text, "b" * 64))))
    ok.append(("chain edits: version 3 without version 2 is refused",
               refused(lambda: policy_cg_v3_edits(policy_cg_edits(cg_text, "a" * 64), "c" * 64))))

    # the read gate pointers, from each starting state to the final pair
    mark = "export const PWB_ACT_RECORDS: x = 1;\n"

    def gate(cur, sup, comment=""):
        return (f"{{ policy: '{cur}',\n registry: 'r' }}\n{{ policy: '{sup}',\n registry: 'r2' }}\n{comment}{mark}")
    amend = f"{DECISIONS}/PWB-SECRET-CLASSIFICATION-POLICY-AMENDMENT-ACT.md"
    acts_v1 = [PolicyAct("v1", SCOPE_ACT, "", "", "", "", "2026-10-04", "", V1_SCRIPT, REPIN_ACT, "")]
    acts_v2 = [acts_v1[0], PolicyAct("v2", V2_ACT, "", "", "", "", "2026-10-05", "", V2_SCRIPT, SCOPE_ACT, "")]
    acts_v3 = acts_v2 + [PolicyAct("v3", V3_ACT, "", "", "", "", "2026-10-09", "", V3_SCRIPT, V2_ACT, "")]
    acts_v4 = acts_v3 + [PolicyAct("v4", V4_ACT, "", "", "", "", "2026-10-20", "", V4_SCRIPT, V3_ACT, "")]
    for name, start, acts in (("re-pin to version 1", gate(REPIN_ACT, amend), acts_v1),
                              ("re-pin straight to version 2", gate(REPIN_ACT, amend), acts_v2),
                              ("version 1 up to version 2", gate(SCOPE_ACT, REPIN_ACT, gate_comment(acts_v1)), acts_v2),
                              ("version 2 up to version 3", gate(V2_ACT, SCOPE_ACT, gate_comment(acts_v2)), acts_v3),
                              ("version 3 up to version 4", gate(V3_ACT, V2_ACT, gate_comment(acts_v3)), acts_v4)):
        desired = [acts[-1].path, acts[-1].supersedes]
        done = repoint_gate(start, desired, gate_comment(acts))
        ok.append((f"gate pointers: {name}",
                   GATE_POLICY_POINTER.findall(done) == desired and done.count("// The policy act is the") == 1
                   and repoint_gate(done, desired, gate_comment(acts)) == done))
    ok.append(("gate pointers: a file with one policy pointer is refused",
               refused(lambda: repoint_gate(f"policy: '{SCOPE_ACT}'\n{mark}", [V2_ACT, SCOPE_ACT], ""))))

    # the battery, from each starting state
    st = ("## How to verify this page\n```sh\n"
          "python3 scripts/build_pwb_behavior_contract_repin.py --check   # x\n"
          "python3 scripts/record_pwb_behavior_contract_repin_acts.py --check policy abc --date d\n"
          "python3 scripts/record_pwb_behavior_contract_repin_acts.py --selftest\n```\n"
          "The three checks above are the same three the hosted workflow runs.\n")
    wf = ("      - name: build_pwb_behavior_contract_repin --check\n"
          "        run: python3 scripts/build_pwb_behavior_contract_repin.py --check\n\n"
          "      - name: record_pwb_behavior_contract_repin_acts --check policy\n"
          "        run: python3 scripts/record_pwb_behavior_contract_repin_acts.py --check policy abc --date d\n\n"
          "      - name: record_pwb_behavior_contract_repin_acts --selftest\n"
          "        run: python3 scripts/record_pwb_behavior_contract_repin_acts.py --selftest\n")
    c1, s1 = f"python3 scripts/{V1_SCRIPT}.py --check z", f"python3 scripts/{V1_SCRIPT}.py --selftest"
    c2, s2 = f"python3 scripts/{V2_SCRIPT}.py --check y", f"python3 scripts/{V2_SCRIPT}.py --selftest"
    n1, w1 = edit_battery(st, wf, c1, s1, V1_SCRIPT)
    n2, w2 = edit_battery(st, wf, c2, s2, V2_SCRIPT)
    n12, w12 = edit_battery(n1, w1, c2, s2, V2_SCRIPT)
    ok.append(("battery: re-pin to version 1 adds its two lines", c1 in n1 and s1 in n1 and V1_SCRIPT in w1))
    ok.append(("battery: re-pin straight to version 2 adds only version 2's lines",
               c2 in n2 and V1_SCRIPT not in n2 + w2 and "--check policy" not in n2 + w2))
    ok.append(("battery: version 1 up to version 2 replaces its lines in place",
               V1_SCRIPT not in n12 + w12 and (n12, w12) == (n2, w2)))
    ok.append(("battery: every final state is idempotent",
               edit_battery(n1, w1, c1, s1, V1_SCRIPT) == (n1, w1) and edit_battery(n2, w2, c2, s2, V2_SCRIPT) == (n2, w2)))
    ok.append(("battery: version 2's lines keep the count at three",
               "The three checks above are the same three" in n2 and n2.count("python3 ") == 3))
    ok.append(("battery: a workflow without the version-1 steps is refused on upgrade",
               refused(lambda: edit_battery(n1, wf, c2, s2, V2_SCRIPT))))
    c3, s3 = f"python3 scripts/{V3_SCRIPT}.py --check x", f"python3 scripts/{V3_SCRIPT}.py --selftest"
    n3, w3 = edit_battery(st, wf, c3, s3, V3_SCRIPT)
    n23, w23 = edit_battery(n2, w2, c3, s3, V3_SCRIPT)
    ok.append(("battery: version 2 up to version 3 replaces its lines in place",
               V2_SCRIPT not in n23 + w23 and c3 in n23 and s3 in n23 and (n23, w23) == (n3, w3)
               and edit_battery(n23, w23, c3, s3, V3_SCRIPT) == (n23, w23)))
    ok.append(("battery: version 3's lines keep the count at three",
               "The three checks above are the same three" in n23 and n23.count("python3 ") == 3))
    ok.append(("battery: a workflow without the version-2 steps is refused on upgrade to version 3",
               refused(lambda: edit_battery(n2, wf, c3, s3, V3_SCRIPT))))
    ok.append(("gate comment: version 3 names version 2's date",
               gate_comment(acts_v3).startswith("// The policy act is the 2026-10-09 public-source screening-scope version 3 act, superseding the\n// 2026-10-05 version-2 act;")))
    ok.append(("gate comment: version 4 names version 3's date",
               gate_comment(acts_v4).startswith("// The policy act is the 2026-10-20 public-source screening-scope version 4 act, superseding the\n// 2026-10-09 version-3 act;")))
    acts_v5 = acts_v4 + [PolicyAct("v5", V5_ACT, "Chosen variant: `bcd`; its manifest row's digest is the exact digest\n",
                                   "", "", "", "2026-11-03", "", V5_SCRIPT, V4_ACT, "")]
    ok.append(("gate comment: version 5 names version 4's date, the chosen variant and the registry sentence",
               gate_comment(acts_v5) == ("// The policy act is the 2026-11-03 public-source screening-scope version 5 act (variant bcd), superseding the\n"
                                         "// 2026-10-20 version-4 act. " + REGISTRY_CEILING_SENTENCE)))
    acts_v6 = acts_v5 + [PolicyAct("v6", V6_ACT, "Chosen variant: `p`; its manifest row's digest is the exact digest above.\n",
                                   "", "", "", "2026-11-05", "", V6_SCRIPT, V5_ACT, "")]
    ok.append(("gate comment: version 6 names version 5's date, the chosen variant and the registry sentence",
               gate_comment(acts_v6) == ("// The policy act is the 2026-11-05 public-source screening-scope version 6 act (variant p), superseding the\n"
                                         "// 2026-11-03 version-5 act. " + REGISTRY_CEILING_SENTENCE)))
    ok.append(("evaluation instant: version 6 at its record's instant",
               evaluation_instant(PolicyAct("v6", V6_ACT, "", "", "", "", "2026-11-05", "2026-11-05T09:43:08Z", V6_SCRIPT, V5_ACT, "")) == "2026-11-05T09:43:08Z"))
    ok.append(("evaluation instant: version 5 at its record's instant, version 4 at midnight of its date",
               evaluation_instant(PolicyAct("v5", V5_ACT, "", "", "", "", "2026-11-03", "2026-11-03T06:58:26Z", V5_SCRIPT, V4_ACT, "")) == "2026-11-03T06:58:26Z"
               and evaluation_instant(PolicyAct("v4", V4_ACT, "", "", "", "", "2026-10-20", "2026-10-20T10:00:00Z", V4_SCRIPT, V3_ACT, "")) == "2026-10-20T00:00:00Z"))
    # The live read gate follows the final act; the comment it carries is that act's, over the recorded dates.
    live6 = ROOT / V6_ACT
    if live6.is_file():
        live_acts = policy_acts(ROOT)
        live_check, live_selftest = final_battery_lines(live_acts[-1])
        status_text = (ROOT / STATUS).read_text()
        ok.append(("battery lines: the final act's recorder lines are the live status battery's",
                   live_acts[-1].script == V6_SCRIPT and f"{V6_SCRIPT}.py --check " in live_check
                   and live_check in status_text and live_selftest in status_text))
        ok.append(("evaluation instant: the live read-gate test evaluates at the final act's",
                   f"const EVALUATION_INSTANT = '{evaluation_instant(live_acts[-1])}';" in (ROOT / INPUTS_TEST).read_text()))
        ok.append(("gate comment: version 6's, over the live records, is the live read gate's comment",
                   gate_comment(live_acts) in (ROOT / INPUTS_TS).read_text()))
    c4, s4 = f"python3 scripts/{V4_SCRIPT}.py --check w", f"python3 scripts/{V4_SCRIPT}.py --selftest"
    n4, w4 = edit_battery(st, wf, c4, s4, V4_SCRIPT)
    n34, w34 = edit_battery(n23, w23, c4, s4, V4_SCRIPT)
    ok.append(("battery: version 3 up to version 4 replaces its lines in place, keeping the count at three",
               V3_SCRIPT not in n34 + w34 and c4 in n34 and s4 in n34 and (n34, w34) == (n4, w4)
               and edit_battery(n34, w34, c4, s4, V4_SCRIPT) == (n34, w34)
               and "The three checks above are the same three" in n34 and n34.count("python3 ") == 3))
    ok.append(("battery: a workflow without the version-3 steps is refused on upgrade to version 4",
               refused(lambda: edit_battery(n23, wf, c4, s4, V4_SCRIPT))))
    c5, s5 = f"python3 scripts/{V5_SCRIPT}.py --check v", f"python3 scripts/{V5_SCRIPT}.py --selftest"
    n5, w5 = edit_battery(st, wf, c5, s5, V5_SCRIPT)
    n45, w45 = edit_battery(n34, w34, c5, s5, V5_SCRIPT)
    ok.append(("battery: version 4 up to version 5 replaces its lines in place, keeping the count at three",
               V4_SCRIPT not in n45 + w45 and c5 in n45 and s5 in n45 and (n45, w45) == (n5, w5)
               and edit_battery(n45, w45, c5, s5, V5_SCRIPT) == (n45, w45)
               and "The three checks above are the same three" in n45 and n45.count("python3 ") == 3))
    c6, s6 = f"python3 scripts/{V6_SCRIPT}.py --check u", f"python3 scripts/{V6_SCRIPT}.py --selftest"
    n6, w6 = edit_battery(st, wf, c6, s6, V6_SCRIPT)
    n56, w56 = edit_battery(n45, w45, c6, s6, V6_SCRIPT)
    ok.append(("battery: version 5 up to version 6 replaces its lines in place, keeping the count at three",
               V5_SCRIPT not in n56 + w56 and c6 in n56 and s6 in n56 and (n56, w56) == (n6, w6)
               and edit_battery(n56, w56, c6, s6, V6_SCRIPT) == (n56, w56)
               and "The three checks above are the same three" in n56 and n56.count("python3 ") == 3))
    return ok


def egress_selftests() -> list[tuple[str, bool]]:
    """Which egress version is recorded, and the stage map against the recorded arguments."""
    ok: list[tuple[str, bool]] = []

    def refused(fn) -> bool:
        try:
            fn()
        except Refusal:
            return True
        return False

    d1, d2 = "1" * 64, "2" * 64

    def act(arg):
        return f"# act\n\nExact digest (SHA-256): `{arg}`\n"

    def stage_map(c1, c2, v1_stages="[...NARRATIVE_STAGES]", v2_stages="[...NARRATIVE_STAGES, ...DISCOVERY_STAGES]"):
        return (f"export const EGRESS_V1_DIGEST = '{c1}';\nexport const EGRESS_V2_DIGEST = '{c2}';\n"
                f"new Map([[EGRESS_V1_DIGEST, Object.freeze({v1_stages})],\n  [EGRESS_V2_DIGEST, Object.freeze({v2_stages})]]);\n")

    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        (root / DECISIONS).mkdir(parents=True)
        ok.append(("egress: none recorded is refused as missing", egress_records(root) == []
                   and any("egress" in m for m in missing_records(root))))
        (root / DECISIONS / EGRESS_V2[1]).write_text(act(d2))
        ok.append(("egress: version 2 alone is enough and v1 stays unregistered", egress_records(root) == [EGRESS_V2]))
        (root / DECISIONS / EGRESS_V1[1]).write_text(act(d1))
        ok.append(("egress: both versions are registered when both exist", egress_records(root) == [EGRESS_V1, EGRESS_V2]))
        ok.append(("stage map: absent file is reported, not refused", "not checked" in check_stage_map(root)))
        ts = root / STAGE_MAP_TS
        ts.parent.mkdir(parents=True)
        ts.write_text(stage_map(d1, d2))
        ok.append(("stage map: constants equal the recorded arguments", "equal the recorded" in check_stage_map(root)))
        ts.write_text(stage_map(d1, "3" * 64))
        ok.append(("stage map: a constant that is not the bound argument is refused", refused(lambda: check_stage_map(root))))
        ts.write_text(stage_map(d1, d2, v2_stages="[...NARRATIVE_STAGES]"))
        ok.append(("stage map: version 2 without the discovery stages is refused", refused(lambda: check_stage_map(root))))
        ts.write_text(stage_map(d1, d2, v1_stages="[...NARRATIVE_STAGES, ...DISCOVERY_STAGES]"))
        ok.append(("stage map: version 1 with the discovery stages is refused", refused(lambda: check_stage_map(root))))
        ts.write_text(stage_map(d1, d2).replace("export const EGRESS_V2_DIGEST", "const EGRESS_V2_DIGEST"))
        ok.append(("stage map: an undeclared constant is refused", refused(lambda: check_stage_map(root))))
        (root / DECISIONS / EGRESS_V1[1]).unlink()
        ts.write_text(stage_map("9" * 64, d2))
        ok.append(("stage map: an unperformed version's constant is not checked", "EGRESS_V2_DIGEST" in check_stage_map(root)))
    return ok


def profile_figure_selftests() -> list[tuple[str, bool]]:
    """The profile install after the dossier sign-off rewrites both figures."""
    import contextlib
    import io
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_polaris_dossier_local_agent_mode as dossier
    ok: list[tuple[str, bool]] = []
    profile = pathlib.Path(PROFILE_CHANGE) / "specs/polaris-generation/spec.md"
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        dossier._fixture(root)
        ok.append(("before the dossier: one figure, digits rewritten",
                   status_figures(root, "x 2 requirements and 3 scenarios in the effective composition.",
                                  "9 requirements and 9 scenarios")
                   == "x 9 requirements and 9 scenarios in the effective composition."))
        with contextlib.redirect_stdout(io.StringIO()):
            dossier.apply(root)
        (root / profile).parent.mkdir(parents=True)
        (root / profile).write_text("## ADDED Requirements\n\n" + dossier._req("Gamma", 2))
        reqs, scenarios, _n = dossier.recount(root)
        text = (root / STATUS).read_text()
        (root / STATUS).write_text(status_figures(root, text, f"{reqs} requirements and {scenarios} scenarios"))
        ok.append(("profile after dossier: both figures follow the recount and the dossier check passes",
                   dossier.check(root) == []
                   and "3 requirements and 5 scenarios without" in (root / STATUS).read_text()
                   and "7 requirements and 9 scenarios in the effective" in (root / STATUS).read_text()))
        try:
            status_figures(root, text + text, "x")
            ok.append(("profile after dossier: a doubled figure is refused", False))
        except Refusal:
            ok.append(("profile after dossier: a doubled figure is refused", True))
    ok.extend(profile_route_selftests())
    return ok


def profile_route_selftests() -> list[tuple[str, bool]]:
    """The status lead-in and the openspec/README.md row and lead paragraph."""
    ok: list[tuple[str, bool]] = []

    def refused(fn) -> bool:
        try:
            fn()
            return False
        except Refusal:
            return True

    status = (f"  - Read the predecessor together with\n    {AMENDMENT_LINK}:\n"
              "    31 requirements and 182 scenarios in the effective composition.\n")
    once = profile_lead_in(status)
    ok.append(("lead-in: the figure names the profile and its adoption record, once",
               PROFILE_LEAD_IN + ":" in once and profile_lead_in(once) == once
               and once.count(PROFILE_RECORD) == 1))
    ok.append(("lead-in: a page without the amendment's lead-in is refused",
               refused(lambda: profile_lead_in("no figure here\n"))))
    row = PROFILE_ROW_PREFIX + " A candidate | **Candidate — binds nothing** | None |"
    for i, (old, new) in enumerate(README_LEADS.items()):
        got = profile_readme(f"intro\n{old}\n\n| h |\n{row}\n", "2026-10-07")
        ok.append((f"readme lead form {i}: replaced, row names the record, idempotent",
                   new in got and old not in got and profile_row("2026-10-07") in got
                   and profile_readme(got, "2026-10-07") == got))
    ok.append(("readme: an unknown lead paragraph is refused",
               refused(lambda: profile_readme(f"Some other lead.\n{row}\n", "2026-10-07"))))
    ok.append(("readme: two profile rows are refused",
               refused(lambda: profile_readme(f"{list(README_LEADS)[0]}\n{row}\n{row}\n", "d"))))
    ok.append(("lead-in: the amendment's lead-in twice is refused",
               refused(lambda: profile_lead_in(status + status))))
    with tempfile.TemporaryDirectory() as t0:
        rec = pathlib.Path(t0) / PROFILE_RECORD
        rec.parent.mkdir(parents=True)
        rec.write_text("# Adoption\n\nDate: 2026-10-07\n\nBody.\n")
        one = adoption_date(pathlib.Path(t0)) == "2026-10-07"
        rec.write_text("# Adoption\n\nDate: 2026-10-07\n\nDate: 2026-10-08\n")
        ok.append(("adoption date: one Date: line is read; two are refused",
                   one and refused(lambda: adoption_date(pathlib.Path(t0)))))
    # The dossier sign-off's route edits quote two of these forms; they must agree.
    edits = (ROOT / CAND / "POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-ROUTE-EDITS.txt").read_text()
    blocks = re.findall(r"(?m)^----\n(.*?)\n----$", edits, re.S)
    leads = list(README_LEADS.items())
    ok.append(("the dossier route edits' block 2 writes the lead this step reads, and 2b is this step's",
               leads[1][0] in blocks and leads[2][0] in blocks
               and leads[1][1] in blocks and leads[2][1] in blocks))
    ok.extend(reconcile_selftests())
    return ok


def reconcile_selftests() -> list[tuple[str, bool]]:
    """The reconcile step runs last, and its check mode sees a stale census (R-365-3 N3)."""
    global J
    names = [name for name, _fn in STEPS]
    ok = [("steps: reconcile is a step and runs last, after profile",
           names[-2:] == ["profile", "reconcile"]
           and dict(STEPS)["reconcile"] is step_reconcile)]
    sys.path.insert(0, str(ROOT / "scripts"))
    import check_spec_reconciliation as recon
    with tempfile.TemporaryDirectory() as t0:
        tree = pathlib.Path(t0)
        recon.scratch(ROOT, tree)
        fresh = step_reconcile(tree, False)
        census = tree / recon.CENSUS
        census.write_text(census.read_text().replace("\n", "\n ", 1))
        stale = step_reconcile(tree, False)
        saved, J = J, Journal()
        try:
            wrote = step_reconcile(tree, True)
        finally:
            J = saved
        ok.append(("reconcile: check mode reports nothing on a current tree, "
                   "the stale census, and write mode regenerates it",
                   fresh is False and stale is True and wrote is True
                   and step_reconcile(tree, False) is False))
    return ok


def selftest() -> int:
    ok: list[tuple[str, bool]] = []
    both = {"a": PERFORMED_COMMON + (ROUTE_A, EGRESS_V2), "b": PERFORMED_COMMON + (ROUTE_B, EGRESS_V2, EGRESS_V1)}
    ok.append(("registrations code defines and calls its function",
               registrations_code(both["a"]).count(REGISTRATIONS_MARK) == 2))
    for route, perf in both.items():
        ok.append((f"route {route}: every performed record is registered once",
                   all(registrations_code(perf).count(rec) == 1 for _l, rec, _m in perf)))
        ok.append((f"route {route}: exemptions cover every performed record",
                   all(exemptions_code(perf).count(rec) == 1 for _l, rec, _m in perf)))
    sample = "X = 1\n" + EXEMPTION_DICT + "\n    (1, 2): 3,\n}\nY = 2\n"
    got = add_exemptions(sample, "    (4, 5): 6,\n")
    ok.append(("exemption rows land inside the dict", got.index("(4, 5)") < got.index("}\nY")
               and got.index("(1, 2)") < got.index("(4, 5)")))
    jr = Journal()
    with tempfile.TemporaryDirectory() as t0:
        f1 = pathlib.Path(t0) / "a.txt"
        f2 = pathlib.Path(t0) / "new.txt"
        f1.write_text("old")
        jr.write(f1, "new")
        jr.write(f2, "created")
        jr.restore()
        ok.append(("a journal restores a changed file and removes a created one",
                   f1.read_text() == "old" and not f2.exists()))
    ok.append(("every required record is a performed record or the rfc5 act",
               {pathlib.PurePosixPath(r).name for r in REQUIRED_RECORDS}
               == {rec for _l, rec, _m in PERFORMED_COMMON}
               | {pathlib.PurePosixPath(RFC5_ACT).name, pathlib.PurePosixPath(SCOPE_ACT).name,
                  "POLARIS-NON-GOVERNED-NARRATIVE-PROFILE-ADOPTION.md"}))
    ok.append(("number words round-trip the spelled range",
               [number_word(n) for n in (7, 19, 20, 69, 70, 73)]
               == ["seven", "nineteen", "twenty", "sixty-nine", "seventy", "seventy-three"]))
    try:
        number_word(100)
        ok.append(("a count past ninety-nine is refused", False))
    except Refusal:
        ok.append(("a count past ninety-nine is refused", True))
    rec = ('that opened "Q one" by selecting the\n| "L" | "D d" |\n')
    cmd, _st = battery_lines(rec, "a" * 64, "2026-10-04")
    ok.append(("battery line carries the owner's selection text",
               "--question-opening 'Q one' --selection-label 'L' --selection-description 'D d'" in cmd
               and "--packet-words" not in cmd))
    cmd3, _st = battery_lines(rec + 'The packet maps that option to its\nwords "Sign it, variant\nall"; the selection\n',
                              "a" * 64, "2026-10-09", V3_SCRIPT)
    ok.append(("battery line carries version 3's packet words, folded across a wrap",
               cmd3.endswith("--selection-description 'D d' --packet-words 'Sign it, variant all'")))
    cmd4, st4 = battery_lines_v4("x\n\n> Sign it, variant span\n\ny\n", "a" * 64, "2026-10-20")
    ok.append(("battery line carries version 4's owner words and no selection text",
               cmd4 == f"python3 scripts/{V4_SCRIPT}.py --check {'a' * 64} --date 2026-10-20 --owner-words 'Sign it, variant span'"
               and st4 == f"python3 scripts/{V4_SCRIPT}.py --selftest"))
    for name, rec in (("no", "x\n"), ("two", "> a\n> b\n")):
        try:
            battery_lines_v4(rec, "a" * 64, "2026-10-20")
            ok.append((f"battery line for version 4 refuses a record with {name} owner-word lines", False))
        except Refusal:
            ok.append((f"battery line for version 4 refuses a record with {name} owner-word lines", True))
    cmd5, st5 = battery_lines_v4("x\n\n> Sign it, variant bcd\n\ny\n", "a" * 64, "2026-11-03", V5_SCRIPT)
    ok.append(("battery line carries version 5's owner words with its own recorder",
               cmd5 == f"python3 scripts/{V5_SCRIPT}.py --check {'a' * 64} --date 2026-11-03 --owner-words 'Sign it, variant bcd'"
               and st5 == f"python3 scripts/{V5_SCRIPT}.py --selftest"))
    cmd6, st6 = battery_lines_v4("x\n\n> Sign it, variant p\n\ny\n", "a" * 64, "2026-11-05", V6_SCRIPT)
    ok.append(("battery line carries version 6's owner words with its own recorder",
               cmd6 == f"python3 scripts/{V6_SCRIPT}.py --check {'a' * 64} --date 2026-11-05 --owner-words 'Sign it, variant p'"
               and st6 == f"python3 scripts/{V6_SCRIPT}.py --selftest"))
    # The battery carries the final act's recorder only: version 6's, once its record exists.
    live6 = ROOT / V6_ACT
    if live6.is_file():
        rec6 = live6.read_text()
        arg6 = grab(r"^Exact digest \(SHA-256\): `([0-9a-f]{64})`$", rec6, "v6 digest")
        c, _s = battery_lines_v4(rec6, arg6, "2026-11-05", V6_SCRIPT)
        ok.append(("battery line for the live version-6 record is the status battery's line",
                   c in (ROOT / STATUS).read_text() and c in (ROOT / WORKFLOW).read_text()
                   and V5_SCRIPT not in (ROOT / STATUS).read_text() + (ROOT / WORKFLOW).read_text()))
    try:
        battery_lines('that opened "Q # x" by selecting the\n| "L" | "D" |\n', "a" * 64, "2026-10-04")
        ok.append(("selection text the battery splitter cannot carry is refused", False))
    except Refusal:
        ok.append(("selection text the battery splitter cannot carry is refused", True))
    awkward = "Decision 1: Redis's `a<b && c>d` \"x\": y"
    word = shell_word(awkward)
    back = subprocess.run(["sh", "-c", f"printf %s {word}"], capture_output=True, text=True).stdout
    ok.append(("a selection word reads back exactly through the shell", back == awkward))
    ok.append(("a selection word holds neither ': ' nor ' #' for a plain YAML scalar", ": " not in word and " #" not in word))
    cmdq, _st = battery_lines('that opened "Q: it\'s" by selecting the\n| "L" | "D: x" |\n', "a" * 64, "2026-10-04")
    ok.append(("battery line quotes ': ' and a quote in the selection text",
               "--question-opening 'Q:'' it'\\''s'" in cmdq and ": " not in cmdq))
    st = ("## How to verify this page\n```sh\n"
          "python3 scripts/build_pwb_behavior_contract_repin.py --check   # x\n"
          "python3 scripts/record_pwb_behavior_contract_repin_acts.py --check policy abc --date d\n"
          "python3 scripts/record_pwb_behavior_contract_repin_acts.py --selftest\n```\n"
          "The three checks above are the same three the hosted workflow runs.\n")
    wf = ("      - name: build_pwb_behavior_contract_repin --check\n"
          "        run: python3 scripts/build_pwb_behavior_contract_repin.py --check\n\n"
          "      - name: record_pwb_behavior_contract_repin_acts --check policy\n"
          "        run: python3 scripts/record_pwb_behavior_contract_repin_acts.py --check policy abc --date d\n\n"
          "      - name: record_pwb_behavior_contract_repin_acts --selftest\n"
          "        run: python3 scripts/record_pwb_behavior_contract_repin_acts.py --selftest\n")
    ns, nw = edit_battery(st, wf, "python3 scripts/record_public_source_screening_scope_act.py --check z",
                          "python3 scripts/record_public_source_screening_scope_act.py --selftest")
    ok.append(("battery edit drops two lines, adds two, and respells the count",
               "The three checks above are the same three" in ns and ns.count("python3 ") == 3
               and nw.count("run: python3") == 3 and "--check policy" not in ns + nw))
    ok.append(("battery edit is idempotent", edit_battery(ns, nw, "x", "y") == (ns, nw)))
    ok.extend(policy_selftests())
    try:
        once("a b a", "a", "x")
        ok.append(("a repeated anchor is refused", False))
    except Refusal:
        ok.append(("a repeated anchor is refused", True))
    try:
        once("a b", "z", "x")
        ok.append(("an absent anchor is refused", False))
    except Refusal:
        ok.append(("an absent anchor is refused", True))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        ok.append(("an empty tree is refused for every record and for the provider route",
                   missing_records(root)[:len(REQUIRED_RECORDS)] == list(REQUIRED_RECORDS)
                   and len(missing_records(root)) == len(REQUIRED_RECORDS) + 2))
        ok.append(("refusal writes nothing", run(root, True) == 2 and not any(root.iterdir())))
        ok.append(("--only: an unknown step is refused and writes nothing",
                   run(root, True, ("policy", "nope")) == 2 and not any(root.iterdir())))
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = run(root, True, ("policy",))
        ok.append(("--only policy: the sitting's record set is not required, the step's own records are",
                   code == 2 and "required act records are missing" not in buf.getvalue()
                   and "policy act record is absent" in buf.getvalue() and not any(root.iterdir())))
        act = root / RFC5_ACT
        act.parent.mkdir(parents=True)
        for good, name in (("Act instant: 2026-10-04T10:00:00Z\n", "single instant"),
                           ("", "no instant"),
                           ("Act instant: 2026-10-04T10:00:00Z\nAct instant: 2026-10-04T11:00:00Z\n", "two instants"),
                           ("Act instant: 2026-10-04 10:00\n", "malformed instant")):
            act.write_text("# x\n" + good)
            try:
                rfc5_precondition(root)
                passed = True
            except Refusal:
                passed = False
            ok.append((f"act instant precondition: {name}", passed == (name == "single instant")))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        good = b"rfc five text\n"
        arg = sha(good)
        (root / RFC5_ACT).parent.mkdir(parents=True)
        (root / RFC5_ACT).write_text(f"# x\nExact digest (SHA-256): `{arg}`\n")
        ok.append(("the row-7 act argument is read from its record", rfc5_act_argument(root) == arg))
        (root / RFC5_ACT).write_text(f"# x\nExact digest (SHA-256): `{arg}`\nExact digest (SHA-256): `{arg}`\n")
        try:
            rfc5_act_argument(root)
            ok.append(("two argument lines in the row-7 record are refused", False))
        except Refusal:
            ok.append(("two argument lines in the row-7 record are refused", True))
        mods = [root / ".syzygy/governance/contracts" / m / "RFC-0005/consent-egress-secrets.md"
                for m in ("rfcs", "candidates/rfcs")]
        for m in mods:
            m.parent.mkdir(parents=True)
            m.write_bytes(good)
        rfc5_installed_matches(root, arg)
        ok.append(("installed RFC-0005 bytes equal to the act argument pass", True))
        for which in (0, 1):
            mods[which].write_bytes(good + b"x")
            try:
                rfc5_installed_matches(root, arg)
                ok.append((f"a mirror {which} not hashing to the act argument is refused", False))
            except Refusal:
                ok.append((f"a mirror {which} not hashing to the act argument is refused", True))
            mods[which].write_bytes(good)
        mods[1].unlink()
        try:
            rfc5_installed_matches(root, arg)
            ok.append(("a missing mirror is refused", False))
        except Refusal:
            ok.append(("a missing mirror is refused", True))
    ok.extend(egress_selftests())
    ok.extend(profile_figure_selftests())
    failed = [n for n, g in ok if not g]
    for n, g in ok:
        print(("ok   " if g else "FAIL ") + n)
    print(f"selftest: {len(ok) - len(failed)} of {len(ok)} predicates held")
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--root", default=str(ROOT))
    ap.add_argument("--only", default="", help="comma-separated steps to run alone (e.g. policy,reconcile)")
    a = ap.parse_args(argv)
    if a.selftest:
        return selftest()
    return run(pathlib.Path(a.root), write=not a.check, only=tuple(s for s in a.only.split(",") if s))


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
