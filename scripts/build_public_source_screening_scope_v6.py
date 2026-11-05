#!/usr/bin/env python3
"""Build and verify the inert public-source screening-scope version-6 package.

Package `contracts/candidates/public-source-screening-scope-v6/` (`syzygy-mcs4`, owner direction
OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05 item 1, answer A: "Rebase P (placement + detector) onto v5 as v6,
review, offer for your act"). This script performs no owner act and writes no act record.

The subject is the policy AFTER version 5: the bytes of the version-5 manifest row `bcd` (performed 2026-11-03).
The builder takes the policy on disk when it hashes to that row, or recovers it by reversing this package's own
patch when the disk is this package's row (the state after a version-6 act).

One variant, `p`, one manifest row. It changes two things inside `publicSourceScope`, and `policyVersion`:

- the one `ownerPlacements` entry (repository:redis-redis, the one admitted commit of the 2026-10-14 trial,
  labelled 8.10.2) also places `redis.conf` in project-documentation;
- `scopeDetectors` gains a fourth detector, `config-secret-directive`: a line that opens, after blanks and an
  optional comment mark, with a Redis password directive (`requirepass`, `masterauth`, `tls-key-file-pass`,
  `tls-client-key-file-pass`) and a value, or with an ACL rule `user <name> ... >password`. It is not in
  `wholeArtifactDetectors`, so in project-documentation the matched line and its guard lines are withheld and in any
  other class the body is withheld whole; its consequence sentence is appended to the scope detectors' one.

Nothing else may change: the policy's own detectors, every other scope key and every rule version 5 set are
byte-for-byte version 5. The draft this follows is variant `bcdp` of the reverted version-5 extension (`d2b48c50`,
`8c1832ca`, reverted by `cc875a96`, never reviewed); variant X (three more files) is not carried.

  --write             regenerate the patch and the manifest
  --check             verify the package against the policy on disk
  --digests           print the manifest row (refuses while stale)
  --manifest-digest   print the SHA-256 of the manifest FILE (refuses while stale)
  --score             print the counterexample table (outcomes only, never body text)
  --self-corpus       count Syzygy's own tracked files the added detector matches (paths and counts only)
  --selftest          mutate each predicate; each must fail

Review-head contract for a recorder written after a confirming review: the raw's first four non-blank lines are
the title, `Reviewed commit: <40 hex>`, `Manifest SHA-256: <SHA-256 of the manifest FILE, as --manifest-digest
prints it>` and `Verdict: CONFIRM | CONFIRM WITH EXCEPTIONS | REVISE`.
"""

from __future__ import annotations

import copy
import hashlib
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_source_screening_scope_v2 as v2  # noqa: E402
import build_public_source_screening_scope_v3 as v3  # noqa: E402
import build_public_source_screening_scope_v4 as v4  # noqa: E402
import build_public_source_screening_scope_v5 as v5  # noqa: E402

POLICY = v5.POLICY
SCOPE_KEY = v5.SCOPE_KEY
PKG = pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v6")
MANIFEST = PKG / "PUBLIC-SOURCE-SCREENING-SCOPE-V6-MANIFEST.txt"
V5_BASE_VARIANT = "bcd"
VARIANTS = ("p",)

# --- P: redis.conf placement and its paired detector -----------------------------------------------------------

#: A line that opens (after blanks and an optional comment mark) with a Redis password directive, or an ACL rule
#: `user <name> ... >password`. Anchored at a line start by the lookbehind, so a directive named mid-line
#: (`config set requirepass x` in a test) does not match; one blank run and one optional `#[ \t]*` keep it linear.
CONFIG_SECRET_DIRECTIVE = (r"(?<![^\r\n])[ \t]*(?:#[ \t]*)?(?:(?:requirepass|masterauth|tls-key-file-pass|"
                           r"tls-client-key-file-pass)[ \t]+|user[ \t][^\r\n]*?[ \t]>)[^ \t\r\n]+")
P_DETECTOR = {"id": "config-secret-directive", "kind": "regular-expression", "pattern": CONFIG_SECRET_DIRECTIVE,
              "flags": "gi"}
P_CONSEQUENCE = (
    ". config-secret-directive is paired with the redis.conf placement: [Inferred] a line opening with requirepass, "
    "masterauth, tls-key-file-pass or tls-client-key-file-pass and a value, or an ACL rule user <name> ... "
    ">password, commented or not, is withheld with its guard lines in project-documentation, as credential-bearing-url "
    "is, and keeps a body of any other class whole; a password written any other way in such a file (a prose "
    "comment, a rename-command target, a directive this pattern does not name) is not matched")
P_PATHS = ["redis.conf"]


def patch_path(variant: str) -> pathlib.Path:
    return PKG / "proposed" / f"{POLICY.name}.{variant}.patch"


doc_rule = v5.doc_rule


def v6_scope(scope5: dict) -> dict:
    s = copy.deepcopy(scope5)
    sd = s["scopeDetectors"]
    if any(d["id"] == P_DETECTOR["id"] for d in sd["detectors"]):
        raise ValueError("version 5 already carries config-secret-directive")
    sd["detectors"] = sd["detectors"] + [copy.deepcopy(P_DETECTOR)]
    if sd["consequence"].endswith("."):
        raise ValueError("the version-5 consequence sentence ends with a full stop; the appended clause would double it")
    sd["consequence"] = sd["consequence"] + P_CONSEQUENCE
    r = doc_rule(s)
    if len(r.get("ownerPlacements", [])) != 1:
        raise ValueError("version 5 does not carry exactly one ownerPlacements entry")
    e = r["ownerPlacements"][0]
    if set(e["paths"]) & set(P_PATHS):
        raise ValueError("version 5 already places redis.conf")
    e["paths"] = e["paths"] + list(P_PATHS)
    return s


def next_version(version: str) -> str:
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)(-.+)", version)
    if not m:
        raise ValueError(f"unparseable policyVersion {version}")
    return f"{m.group(1)}.{int(m.group(2)) + 1}.0{m.group(4)}.v6-p"


def propose(base_text: str, variant: str = "p") -> str:
    if variant not in VARIANTS:
        raise ValueError(f"unknown variant {variant}")
    base = json.loads(base_text)
    old = v2.block(base[SCOPE_KEY])
    if base_text.count(old) != 1:
        raise ValueError("the version-5 scope block is not found exactly once in its own bytes")
    version = f'  "policyVersion": "{base["policyVersion"]}",\n'
    if base_text.count(version) != 1:
        raise ValueError("policyVersion line not found exactly once")
    out = base_text.replace(old, v2.block(v6_scope(base[SCOPE_KEY])), 1)
    out = out.replace(version, f'  "policyVersion": "{next_version(base["policyVersion"])}",\n', 1)
    got = json.loads(out)
    expected = dict(base)
    expected["policyVersion"] = next_version(base["policyVersion"])
    expected[SCOPE_KEY] = v6_scope(base[SCOPE_KEY])
    if got != expected or list(got) != list(base):
        raise ValueError("text replacement changed something other than the scope block and policyVersion")
    return out


def sha(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def manifest_rows(root: pathlib.Path) -> dict[str, str]:
    path = root / MANIFEST
    if not path.is_file():
        return {}
    return {m.group(2): m.group(1) for m in
            re.finditer(r"^([0-9a-f]{64})  \S+  \[variant: ([\w-]+)\]$", path.read_text(), re.M)}


def manifest_text(proposeds: dict[str, str]) -> str:
    rows = "".join(f"{sha(proposeds[v])}  {POLICY.as_posix()}  [variant: {v}]\n" for v in VARIANTS)
    return ("# PUBLIC-SOURCE SCREENING SCOPE VERSION 6 MANIFEST\n"
            "# Candidate; this file and its row bind nothing by themselves.\n"
            "# 1 row, variant p (redis.conf placed with config-secret-directive). The row hashes\n"
            "# the PROPOSED bytes (the version-5 policy, variant bcd, with\n"
            "# proposed/<name>.p.patch applied). The row is the argument of one\n"
            "# superseding approve-policy act, or of none.\n"
            + rows)


def base_bytes(root: pathlib.Path = ROOT) -> tuple[str, str]:
    want = v5.manifest_rows(root).get(V5_BASE_VARIANT)
    if want is None:
        raise ValueError("the version-5 manifest has no row for variant bcd")
    disk_text = (root / POLICY).read_text()
    if sha(disk_text) == want:
        return disk_text, "prospective"
    own = [v for v, dg in manifest_rows(root).items() if dg == sha(disk_text)]
    if own and (root / patch_path(own[0])).is_file():
        back = v2.reverse_patch((root / patch_path(own[0])).read_text(), disk_text)
        if sha(back) != want:
            raise ValueError("reversing this package's patch over the policy on disk does not give the version-5 bytes")
        return back, "performed-v6"
    raise ValueError("the policy on disk is neither the version-5 variant-bcd bytes nor this package's row; "
                     "the base is unknown")


# --- fixtures ---------------------------------------------------------------------------------------------------
#
# The oracle is version 5's (`v5.screen`, `v5.content_class`): it reads every rule from the policy text, so it
# screens version-6 bytes unchanged. Every fixture secret is assembled at run time (push protection, and Syzygy's own
# screens).

screen = v5.screen
content_class = v5.content_class
reaches_packet = v5.reaches_packet
_R, _C = v5._R, v5._C
_OTHER = v5._OTHER_REDIS_COMMIT
_UNMATCHED = v5._UNMATCHED
PD, CODE, NONE = v5.PD, v5.CODE, v5.NONE

#: Where version 6 classifies a path differently from version 5 (variant bcd). Every other version-5 class fixture
#: must keep its bcd class.
CLASS_FIXTURES = [
    ("redis.conf", _R, _C, {"v5": NONE, "p": PD}),
    ("REDIS.CONF", _R, _C, {"v5": NONE, "p": PD}),
    ("redis.conf", _R, _OTHER, {"v5": NONE, "p": NONE}),
    ("redis.conf", "repository:other", _C, {"v5": NONE, "p": NONE}),
    ("src/redis.conf", _R, _C, {"v5": NONE, "p": NONE}),
    ("sentinel.conf", _R, _C, {"v5": NONE, "p": NONE}),
    ("tests/assets/default.conf", _R, _C, {"v5": NONE, "p": NONE}),
    ("TLS.md", _R, _C, {"v5": PD, "p": PD}),
    ("modules/MODULES.md", _R, _C, {"v5": PD, "p": PD}),
]

_RC = "redis.conf"
_PW = "foo" + "bared"
#: (name, path, body, marker line, {"v5": outcome, "p": outcome}). The marker line is the line a reader would care
#: about; "reaches" in --score means it enters a review packet.
COUNTEREXAMPLES = [
    # P: the placement with the detector
    ("redis.conf: commented requirepass placeholder", _RC,
     "# Redis configuration\n# Require clients to authenticate:\n# requirepass " + _PW + "\nport 6379\n", 3,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({2, 3, 4}))}),
    ("redis.conf: masterauth with a password", _RC,
     f"replicaof 10.0.0.1 6379\nmasterauth {_UNMATCHED}\nport 6379\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({1, 2, 3}))}),
    ("redis.conf: ACL user with a >password", _RC,
     f"# ACL\nuser worker on >{_UNMATCHED} ~jobs:* +@list\nport 6379\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({1, 2, 3}))}),
    ("redis.conf: tls-key-file-pass directive", _RC,
     f"# TLS\n# tls-key-file\n# tls-key-file-pass {_UNMATCHED}\n# end\n", 3,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({2, 3, 4}))}),
    ("redis.conf: tls-client-key-file-pass, indented after a tab", _RC,
     f"# TLS\n\t# tls-client-key-file-pass {_UNMATCHED}\nport 6379\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({1, 2, 3}))}),
    ("redis.conf: REQUIREPASS in capitals", _RC,
     f"# auth\nREQUIREPASS {_UNMATCHED}\nport 6379\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({1, 2, 3}))}),
    ("redis.conf: requirepass after a bare CR", _RC,
     f"# auth\rrequirepass {_UNMATCHED}\rport 6379\r", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({1, 2, 3}))}),
    ("redis.conf: angle-bracket placeholders (C admits them; the masterauth line is withheld)", _RC,
     "# Replication\n# replicaof <masterip> <masterport>\n# masterauth <master-password>\nport 6379\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("redacted", frozenset({2, 3, 4}))}),
    ("redis.conf: ordinary directives only", _RC,
     "# Network\nbind 127.0.0.1 -::1\nport 6379\nmaxmemory-policy noeviction\n", 3,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("admitted",)}),
    # P: the residuals, each named; a reviewer reads these lines
    ("residual 1, redis.conf: requirepass named mid-line", _RC,
     f"# At run time: CONFIG SET requirepass {_UNMATCHED}\nport 6379\n", 1,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("admitted",)}),
    ("residual 2, redis.conf: rename-command to a secret name", _RC,
     f"# Hide CONFIG:\nrename-command CONFIG {_UNMATCHED}\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("admitted",)}),
    ("residual 3, redis.conf: password in a prose comment", _RC,
     f"# Staging uses the password {_UNMATCHED} for now\nport 6379\n", 1,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("admitted",)}),
    ("residual 4, redis.conf: a module's own password option", _RC,
     f"loadmodule /opt/redis/mod.so password {_UNMATCHED}\nport 6379\n", 1,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("admitted",)}),
    ("residual 5, redis.conf: a directive this pattern does not name (masteruser beside sentinel-style auth)", _RC,
     f"masteruser replica\nsentinel auth-pass mymaster {_UNMATCHED}\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("admitted",)}),
    ("not a residual, redis.conf: include names another file, which stays unclassified", _RC,
     "# Secrets live elsewhere:\ninclude /etc/redis/secrets.conf\nport 6379\n", 2,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("admitted",)}),
    # P: the detector reaches every placed documentation body (hardening)
    ("TLS.md: key passphrase as a config directive", "TLS.md",
     f"# TLS\nSet the key passphrase:\n    tls-key-file-pass {_UNMATCHED}\nRestart the server.\n", 3,
     {"v5": ("admitted",), "p": ("redacted", frozenset({2, 3, 4}))}),
    ("TLS.md: requirepass directive", "TLS.md",
     "# TLS\nUse a password too:\n    requirepass " + _PW + "99\n", 3,
     {"v5": ("admitted",), "p": ("redacted", frozenset({2, 3}))}),
    ("README.md: ACL example in prose docs", "README.md",
     f"# ACL\nExample:\n\n    user alice on >{_UNMATCHED} ~* +@all\n\nDone.\n", 4,
     {"v5": ("admitted",), "p": ("redacted", frozenset({3, 4, 5}))}),
    # P: the tightening on code bodies (withheld whole)
    ("tests/acl.tcl: a code line opening with requirepass", "tests/acl.tcl",
     f"set conf {{\nrequirepass {_UNMATCHED}\n}}\n", 2,
     {"v5": ("admitted",), "p": ("excluded", "secret-detector-match")}),
    ("tests/auth.tcl: requirepass named mid-line (no detector)", "tests/auth.tcl",
     f"r config set requirepass {_UNMATCHED}\n", 1,
     {"v5": ("admitted",), "p": ("admitted",)}),
    ("src/config.c: a C string, not a line start (no detector)", "src/config.c",
     'createStringConfig("requirepass", NULL, 0, NULL, NULL);\n', 1,
     {"v5": ("admitted",), "p": ("admitted",)}),
    # P: the placement stays pinned
    ("redis.conf at another commit stays unclassified", _RC,
     "port 6379\n", 1,
     {"v5": ("excluded", "unknown-extraction-class"), "p": ("excluded", "unknown-extraction-class")}),
]

#: Each counterexample's repository and commit (default: Redis at the trial commit).
_AT = {"redis.conf at another commit stays unclassified": (_R, _OTHER)}

#: Version-5 counterexamples whose outcome version 6 changes on purpose (the TLS.md directives P now withholds);
#: every other version-5 counterexample keeps its bcd outcome under version 6.
V5_CHANGED = {
    "TLS.md: key passphrase as a config directive": ("redacted", frozenset({2, 3, 4})),
    "TLS.md: requirepass directive": ("redacted", frozenset({2, 3})),
}


def _at(name: str) -> tuple[str, str]:
    return _AT.get(name, (_R, _C))


def semantic_findings(base_text: str, proposed_text: str, variant: str = "p") -> list[str]:
    base, new = json.loads(base_text), json.loads(proposed_text)
    bad: list[str] = []
    if new.get("policyVersion") != next_version(base["policyVersion"]):
        bad.append("policyVersion is not the next minor with .v6-p appended")
    if {k: v for k, v in new.items() if k not in (SCOPE_KEY, "policyVersion")} != {
            k: v for k, v in base.items() if k not in (SCOPE_KEY, "policyVersion")}:
        bad.append("a key other than policyVersion and the scope differs from version 5")
    s5, s6 = base[SCOPE_KEY], new.get(SCOPE_KEY)
    if not isinstance(s6, dict):
        return bad + ["publicSourceScope missing"]
    moved = {k for k in set(s5) | set(s6) if s5.get(k) != s6.get(k)}
    if moved != {"scopeDetectors", "contentClassification"}:
        bad.append(f"scope keys changed are {sorted(moved)}, not ['contentClassification', 'scopeDetectors']")
    sd5, sd6 = s5["scopeDetectors"], s6.get("scopeDetectors", {})
    if sd6.get("rule") != sd5["rule"]:
        bad.append("the scopeDetectors rule sentence differs from version 5")
    if sd6.get("detectors", [])[:len(sd5["detectors"])] != sd5["detectors"]:
        bad.append("a version-5 scope detector changed")
    added = sd6.get("detectors", [])[len(sd5["detectors"]):]
    if added != [P_DETECTOR]:
        bad.append("the added scope detectors are not exactly config-secret-directive")
    if sd6.get("consequence") != sd5["consequence"] + P_CONSEQUENCE:
        bad.append("the consequence sentence is not version 5's with the config-secret-directive clause appended")
    ids = [d.get("id") for d in sd6.get("detectors", [])]
    if set(ids) & {d["id"] for d in new["detectors"]} or len(set(ids)) != len(ids):
        bad.append("a scope detector id repeats a policy detector id or another scope detector")
    for d in added:
        try:
            re.compile(d["pattern"])
        except (re.error, KeyError, TypeError):
            bad.append(f"scope detector {d.get('id')} does not compile")
    red = s6.get("secretRedaction", {})
    if "config-secret-directive" in red.get("wholeArtifactDetectors", []):
        bad.append("config-secret-directive keeps the body whole (declared line-redactable)")
    if red != s5["secretRedaction"]:
        bad.append("secretRedaction differs from version 5")
    cc5, cc6 = s5["contentClassification"], s6.get("contentClassification", {})
    if {k: v for k, v in cc6.items() if k != "rules"} != {k: v for k, v in cc5.items() if k != "rules"}:
        bad.append("contentClassification moved outside its rules")
    others5 = [r for r in cc5["rules"] if r["class"] != "project-documentation"]
    others6 = [r for r in cc6.get("rules", []) if r.get("class") != "project-documentation"]
    if others5 != others6:
        bad.append("a classification rule other than project-documentation differs from version 5")
    r5, r6 = doc_rule(s5), doc_rule(s6)
    if {k: v for k, v in r6.items() if k != "ownerPlacements"} != {k: v for k, v in r5.items() if k != "ownerPlacements"}:
        bad.append("the project-documentation rule moved outside ownerPlacements")
    want = copy.deepcopy(r5["ownerPlacements"])
    want[0]["paths"] = want[0]["paths"] + P_PATHS
    if r6.get("ownerPlacements") != want:
        bad.append("ownerPlacements is not version 5's entry with redis.conf appended")
    for e in r6.get("ownerPlacements", []):
        if not e.get("commits") or any(not re.fullmatch(r"[0-9a-f]{40}", c) for c in e.get("commits", [])):
            bad.append("an ownerPlacements entry is not pinned to full commit ids")
        for p in e.get("paths", []):
            if p != v2.ascii_fold(p):
                bad.append(f"placed path {p!r} is not folded, so a folded path can never equal it")
            if v2.classify_documentation(p, r6) or v2.ascii_fold(p) in cc6.get("governanceTextPaths", []):
                bad.append(f"placed path {p!r} is already matched by another rule")
            if any(t in r6["docExcludedTokens"] for seg in v2.ascii_fold(p).rsplit(".", 1)[0].split("/")
                   for t in v2.tokens(seg, r6["docTokenSeparators"])):
                bad.append(f"placed path {p!r} carries a docExcludedTokens word")
    if s6 != v6_scope(s5):
        bad.append("the scope is not exactly the declared version-6 scope")
    # fixtures: version 6's own, then every version-5 fixture at its bcd expectation (except the declared changes)
    for path, repo, commit, table in CLASS_FIXTURES:
        if content_class(path, proposed_text, repo, commit) != table["p"]:
            bad.append(f"class fixture {path!r} at {repo}@{commit[:8]}: expected {table['p']}")
    for path, repo, commit, table in v5.CLASS_FIXTURES:
        if path.lower() == "redis.conf" and repo == _R and commit == _C:
            continue
        want5 = v5._expected(table, "bcd")
        if content_class(path, proposed_text, repo, commit) != want5:
            bad.append(f"version-5 class fixture {path!r} at {repo}@{commit[:8]}: expected {want5}")
    for name, path, body, _m, table in COUNTEREXAMPLES:
        if screen(path, body, proposed_text, *_at(name)) != table["p"]:
            bad.append(f"counterexample {name!r}: expected {table['p']}")
    for name, path, body, _m, table in v5.COUNTEREXAMPLES:
        want5 = V5_CHANGED.get(name, v5._expected(table, "bcd"))
        if screen(path, body, proposed_text, _R, _C) != want5:
            bad.append(f"version-5 counterexample {name!r}: expected {want5}")
    for name, body, want in v4.BODY_FIXTURES:
        got = screen("README.md", body, proposed_text)
        want6 = ("excluded", "secret-detector-match") if want is None else (("redacted", frozenset(want)) if want else ("admitted",))
        if got != want6:
            bad.append(f"version-4 body fixture {name!r}: expected {want6}")
    return bad


def linear_time_findings(pattern: str = CONFIG_SECRET_DIRECTIVE, limit_s: float = 1.0) -> list[str]:
    """The detector stays linear on adversarial lines: every-offset matching (the oracle's and secret-redaction.ts's
    sticky loop) over 40,000-character lines of blanks, comment marks and an ACL prefix finishes within the limit, in
    Python and in node. Times are not recorded: only the bound is asserted."""
    bad = []
    rx = re.compile(pattern, re.I)
    for label, line in (("blanks", " " * 40000), ("hashes", "#" * 40000), ("hash-blank", "# " * 20000),
                        ("acl", "user " + "a " * 20000), ("tabs", "\t" * 40000)):
        t0 = time.perf_counter()
        for i in range(0, len(line), 1):
            rx.match(line, i)
        if time.perf_counter() - t0 > limit_s * 4:
            bad.append(f"python every-offset match on a 40,000-character {label} line exceeds {limit_s * 4} s")
    js = ("const p=process.argv[1];const s=new RegExp(p,'iy');const lines=[' '.repeat(80000),'#'.repeat(80000),"
          "'# '.repeat(40000),'user '+'a '.repeat(40000),'\\t'.repeat(80000)];for(const l of lines){const t=Date.now();"
          "for(let i=0;i<l.length;i++){s.lastIndex=i;s.exec(l);}if(Date.now()-t>" + str(int(limit_s * 1000)) + ")"
          "{console.log('slow');process.exit(1);}}console.log('ok');")
    try:
        out = subprocess.run(["node", "-e", js, pattern], capture_output=True, text=True, timeout=120)
        if out.stdout.strip() != "ok":
            bad.append("node sticky every-offset match on an 80,000-character line exceeds the bound")
    except (OSError, subprocess.TimeoutExpired):
        bad.append("node is unavailable or timed out; the JavaScript bound is unchecked")
    return bad


def js_agreement_findings(pattern: str = CONFIG_SECRET_DIRECTIVE) -> list[str]:
    """JavaScript RegExp (flags `iy`, the sticky every-offset loop `secret-redaction.ts` uses) and Python `re` (the
    oracle) find the same match spans over every version-6 and version-5 counterexample body and five dialect probes.
    Bodies go to node on stdin; nothing is printed but a count."""
    bodies = [c[2] for c in COUNTEREXAMPLES] + [c[2] for c in v5.COUNTEREXAMPLES] + [
        "requirepass\u00a0x\n", "\ufeffrequirepass x\n", "\u2028requirepass x\n", "user a\u00a0>x\n", "MASTERAUTH\tx\r\n", "requirepass\ufeffx\n", "requirepass\x1cx\n"]
    rx = re.compile(pattern, re.I)
    py = [[[m.start(), m.end()] for i in range(len(b)) for m in [rx.match(b, i)] if m] for b in bodies]
    js = ("let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const {p,b}=JSON.parse(d);const r=new RegExp(p,'iy');"
          "console.log(JSON.stringify(b.map(t=>{const o=[];for(let i=0;i<t.length;i++){r.lastIndex=i;const m=r.exec(t);"
          "if(m)o.push([m.index,m.index+m[0].length]);}return o;})));});")
    try:
        out = subprocess.run(["node", "-e", js], input=json.dumps({"p": pattern, "b": bodies}), capture_output=True,
                             text=True, timeout=60)
        got = json.loads(out.stdout)
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return ["node is unavailable; the JavaScript dialect is unchecked"]
    # node reports UTF-16 offsets; every body here is in the BMP, so they equal Python's code-point offsets
    return [f"body {i}: JavaScript and Python match spans differ" for i, (a, b) in enumerate(zip(py, got)) if a != b]


def check(root: pathlib.Path = ROOT) -> list[str]:
    findings: list[str] = []
    try:
        base, _mode = base_bytes(root)
        proposeds = {v: propose(base, v) for v in VARIANTS}
    except (ValueError, OSError) as exc:
        return [str(exc)]
    for v, proposed in proposeds.items():
        path = root / patch_path(v)
        if not path.is_file() or path.read_text() != v3.unified(base, proposed):
            findings.append(f"{v}: patch differs from its regeneration over the version-5 bytes")
        else:
            try:
                if v2.v1.apply_patch(root, base, path.read_text()) != proposed:
                    findings.append(f"{v}: applying the patch does not yield the proposed bytes")
            except ValueError as exc:
                findings.append(f"{v}: {exc}")
        findings += [f"{v}: {f}" for f in semantic_findings(base, proposed, v)]
    for name, path, body, _m, table in COUNTEREXAMPLES:
        if screen(path, body, base, *_at(name)) != table["v5"]:
            findings.append(f"v5 baseline: counterexample {name!r}: expected {table['v5']}")
    for path, repo, commit, table in CLASS_FIXTURES:
        if content_class(path, base, repo, commit) != table["v5"]:
            findings.append(f"v5 baseline: class fixture {path!r} at {repo}@{commit[:8]}: expected {table['v5']}")
    if not (root / MANIFEST).is_file() or (root / MANIFEST).read_text() != manifest_text(proposeds):
        findings.append("manifest differs from its regeneration")
    present = sorted(p.name for p in (root / PKG / "proposed").glob("*")) if (root / PKG / "proposed").is_dir() else []
    if present != sorted(patch_path(v).name for v in VARIANTS):
        findings.append(f"proposed/ holds {present}, not exactly the declared patch")
    for md in sorted((root / PKG).glob("*.md")):
        if re.search(r"(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])", md.read_text()):
            findings.append(f"{md.name}: carries a 64-hex token; the argument comes only from the manifest row")
    return findings


def write(root: pathlib.Path = ROOT) -> None:
    base, _mode = base_bytes(root)
    proposeds = {v: propose(base, v) for v in VARIANTS}
    (root / PKG / "proposed").mkdir(parents=True, exist_ok=True)
    for v, proposed in proposeds.items():
        (root / patch_path(v)).write_text(v3.unified(base, proposed))
    (root / MANIFEST).write_text(manifest_text(proposeds))


def _word(o: tuple) -> str:
    if o[0] == "admitted":
        return "admitted"
    if o[0] == "redacted":
        return f"redacted {sorted(o[1])}"
    return f"excluded ({o[1]})"


def score(root: pathlib.Path = ROOT) -> str:
    base, _ = base_bytes(root)
    cols = [("v5", base), ("p", propose(base))]
    out = ["| Counterexample | v5 | v6 (p) |", "|---|---|---|"]
    for name, path, body, marker, _t in COUNTEREXAMPLES:
        cells = []
        for _c, text in cols:
            o = screen(path, body, text, *_at(name))
            cells.append(_word(o) + (" **reaches**" if reaches_packet(o, marker) else ""))
        out.append(f"| {name} | " + " | ".join(cells) + " |")
    return "\n".join(out) + "\n"


def self_corpus(root: pathlib.Path = ROOT) -> str:
    """Syzygy's own tracked text files at HEAD that the added detector matches. Paths and counts only, never text."""
    names = subprocess.run(["git", "-C", str(root), "ls-files", "-z"], capture_output=True, check=True).stdout.split(b"\0")
    rx = re.compile(CONFIG_SECRET_DIRECTIVE, re.I)
    texts, hits = 0, []
    for raw in names:
        if not raw:
            continue
        p = root / raw.decode()
        if not p.is_file() or p.is_symlink():
            continue
        data = p.read_bytes()
        if b"\0" in data:
            continue
        try:
            body = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        texts += 1
        if rx.search(body):
            hits.append(raw.decode())
    head = subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    lines = [f"self-corpus at {head}: {texts} tracked UTF-8 text files (NUL-free) of {sum(1 for n in names if n)} tracked paths",
             f"config-secret-directive: {len(hits)} files match"]
    lines += [f"  {p}" for p in hits]
    return "\n".join(lines) + "\n"


# --- selftest ---------------------------------------------------------------------------------------------------

def _fixture(tmp: pathlib.Path) -> pathlib.Path:
    for rel in (POLICY, v5.MANIFEST, v4.MANIFEST, v3.MANIFEST):
        (tmp / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / rel, tmp / rel)
    for pkg in (v5.PKG, v4.PKG):
        if (ROOT / pkg / "proposed").is_dir():
            shutil.copytree(ROOT / pkg / "proposed", tmp / pkg / "proposed", dirs_exist_ok=True)
    if (ROOT / PKG).is_dir():
        shutil.copytree(ROOT / PKG, tmp / PKG, ignore=shutil.ignore_patterns("reviews"))
    else:
        (tmp / PKG).mkdir(parents=True)
    write(tmp)
    return tmp


def selftest() -> int:
    results: list[tuple[str, bool]] = []

    def caught(name, mutate, needle):
        with tempfile.TemporaryDirectory() as t:
            tmp = _fixture(pathlib.Path(t))
            mutate(tmp)
            results.append((name, any(needle in f for f in check(tmp))))

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        results.append(("a regenerated package verifies", check(tmp) == []))
        base, mode = base_bytes(tmp)
        results.append(("the base is the version-5 variant-bcd row", mode == "prospective"))
        (tmp / POLICY).write_text(propose(base))
        results.append(("after the version-6 act the package still verifies",
                        check(tmp) == [] and base_bytes(tmp)[1] == "performed-v6"))

    def unknown_disk(tmp):
        (tmp / POLICY).write_text((tmp / POLICY).read_text().replace('"schemaVersion": 1', '"schemaVersion": 2', 1))
    caught("a policy on disk that is neither base nor row refused", unknown_disk, "base is unknown")

    def edit_patch(tmp):
        p = tmp / patch_path("p")
        p.write_text(p.read_text().replace("masterauth", "masterauht", 1))
    caught("a hand-edited patch refused", edit_patch, "p: patch differs")

    def edit_manifest(tmp):
        p = tmp / MANIFEST
        p.write_text(p.read_text().replace("[variant: p]", "[variant: q]"))
    caught("an edited manifest refused", edit_manifest, "manifest differs")

    def extra_patch(tmp):
        (tmp / PKG / "proposed" / "extra.patch").write_text("x\n")
    caught("an undeclared patch refused", extra_patch, "not exactly the declared patch")

    def digest_in_md(tmp):
        (tmp / PKG / "SEMANTIC-DELTA.md").write_text("argument " + "a" * 64 + "\n")
    caught("a digest in a package Markdown file refused", digest_in_md, "64-hex")

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        base, _ = base_bytes(tmp)

        def sem(name, mutate, needle):
            doc = json.loads(propose(base))
            mutate(doc)
            got = semantic_findings(base, v2.dump(doc))
            results.append((name, any(needle in f for f in got)))

        def sc(d):
            return d[SCOPE_KEY]

        def sdet(d):
            return next(x for x in sc(d)["scopeDetectors"]["detectors"] if x["id"] == "config-secret-directive")

        def pat(d, new):
            sdet(d).__setitem__("pattern", new)

        sem("a policy detector change caught", lambda d: d["detectors"][0]["values"].pop(), "a key other than")
        sem("the detector moved into the base detectors caught",
            lambda d: d["detectors"].append(copy.deepcopy(P_DETECTOR)), "a key other than")
        sem("an unbumped version caught", lambda d: d.__setitem__("policyVersion", json.loads(base)["policyVersion"]),
            "policyVersion")
        sem("a version-5 scope detector changed caught",
            lambda d: sc(d)["scopeDetectors"]["detectors"][0].__setitem__("flags", "gi"), "a version-5 scope detector changed")
        sem("a dropped directive detector caught (redis.conf requirepass reaches)",
            lambda d: sc(d)["scopeDetectors"]["detectors"].pop(), "counterexample 'redis.conf: commented requirepass placeholder'")
        sem("the directive detector made whole-artifact caught",
            lambda d: sc(d)["secretRedaction"]["wholeArtifactDetectors"].append("config-secret-directive"), "declared line-redactable")
        sem("an unanchored pattern caught (mid-line requirepass in code withheld)",
            lambda d: pat(d, CONFIG_SECRET_DIRECTIVE.replace("(?<![^\\r\\n])", "", 1)),
            "counterexample 'tests/auth.tcl: requirepass named mid-line")
        sem("an uncommented-only pattern caught (commented placeholder reaches)",
            lambda d: pat(d, CONFIG_SECRET_DIRECTIVE.replace("(?:#[ \\t]*)?", "", 1)),
            "counterexample 'redis.conf: commented requirepass placeholder'")
        sem("a pattern without the ACL form caught",
            lambda d: pat(d, CONFIG_SECRET_DIRECTIVE.replace("|user[ \\t][^\\r\\n]*?[ \\t]>", "", 1)),
            "counterexample 'redis.conf: ACL user with a >password'")
        sem("a pattern without masterauth caught",
            lambda d: pat(d, CONFIG_SECRET_DIRECTIVE.replace("masterauth|", "", 1)),
            "counterexample 'redis.conf: masterauth with a password'")
        sem("a pattern without tls-client-key-file-pass caught",
            lambda d: pat(d, CONFIG_SECRET_DIRECTIVE.replace("|\ntls-client-key-file-pass", "").replace("|tls-client-key-file-pass", "", 1)),
            "counterexample 'redis.conf: tls-client-key-file-pass, indented after a tab'")
        sem("a pattern without leading blanks caught",
            lambda d: pat(d, CONFIG_SECRET_DIRECTIVE.replace("(?<![^\\r\\n])[ \\t]*", "(?<![^\\r\\n])", 1)),
            "counterexample 'redis.conf: tls-client-key-file-pass, indented after a tab'")
        sem("a case-sensitive detector caught",
            lambda d: sdet(d).__setitem__("flags", "g"), "counterexample 'redis.conf: REQUIREPASS in capitals'")
        sem("a CR-blind anchor caught",
            lambda d: pat(d, CONFIG_SECRET_DIRECTIVE.replace("(?<![^\\r\\n])", "(?<![^\\n])", 1)),
            "counterexample 'redis.conf: requirepass after a bare CR'")
        sem("a dropped consequence clause caught",
            lambda d: sc(d)["scopeDetectors"].__setitem__("consequence", json.loads(base)[SCOPE_KEY]["scopeDetectors"]["consequence"]),
            "consequence sentence")
        sem("redis.conf placed at another commit caught",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0].__setitem__("commits", [_OTHER]),
            "class fixture 'redis.conf' at repository:redis-redis@498ecd0d")
        sem("a second placement entry caught",
            lambda d: doc_rule(sc(d))["ownerPlacements"].append({"repository": _R, "commits": [_OTHER], "paths": ["redis.conf"]}),
            "ownerPlacements is not version 5's entry")
        sem("sentinel.conf also placed caught",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0]["paths"].append("sentinel.conf"),
            "ownerPlacements is not version 5's entry")
        sem("an X path placed caught",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0]["paths"].append("src/commands/readme.md"),
            "ownerPlacements is not version 5's entry")
        sem("an un-folded placement caught",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0].__setitem__("paths", ["tls.md", "modules/modules.md", "Redis.conf"]),
            "is not folded")
        sem("a dropped version-5 placement caught",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0].__setitem__("paths", ["redis.conf"]),
            "version-5 class fixture 'TLS.md'")
        sem("the documentation exemption dropped caught (version-5 counterexample flips)",
            lambda d: sc(d)["activeContent"].pop("projectDocumentationExemption"),
            "scope keys changed")
        sem("a guard-line change caught", lambda d: sc(d)["secretRedaction"].__setitem__("guardLines", 2),
            "secretRedaction differs")
        sem("the project-documentation rule text changed caught",
            lambda d: doc_rule(sc(d)).__setitem__("notMapped", "x"), "moved outside ownerPlacements")
        sem("a code-content extension change caught",
            lambda d: next(r for r in sc(d)["contentClassification"]["rules"] if r["class"] == "code-content")["sourceExtensions"].append(".conf"),
            "a classification rule other than project-documentation")

    # oracle mutants: the switches the counterexamples rest on
    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        base, _ = base_bytes(tmp)
        v5._NO_DOC_EXEMPTION = True
        try:
            ab = next(c for c in COUNTEREXAMPLES if c[0] == "redis.conf: angle-bracket placeholders (C admits them; the masterauth line is withheld)")
            got = screen(ab[1], ab[2], propose(base), _R, _C)
        finally:
            v5._NO_DOC_EXEMPTION = False
        results.append(("without C a placed redis.conf with angle-bracket placeholders is excluded (mutant observed)",
                        got == ("excluded", "active-content")))
        v5._NO_SCOPE_DETECTORS = True
        try:
            rp = next(c for c in COUNTEREXAMPLES if c[0] == "redis.conf: masterauth with a password")
            got = screen(rp[1], rp[2], propose(base), _R, _C)
        finally:
            v5._NO_SCOPE_DETECTORS = False
        results.append(("without scope detectors a placed redis.conf masterauth line is admitted (mutant observed)",
                        got == ("admitted",)))

    results.append(("the detector stays linear in Python and node", linear_time_findings() == []))
    results.append(("JavaScript and Python find the same spans over every fixture", js_agreement_findings() == []))
    results.append(("a dialect split is caught (mutant observed: \\s in place of [ \\t])",
                     js_agreement_findings(CONFIG_SECRET_DIRECTIVE.replace("[ \\t]+|user", "\\s+|user", 1)) != []))
    quad = r"(?<![^\r\n])[ \t]*[ \t]*(?:#[ \t]*)?(?:requirepass[ \t]+)[^ \t\r\n]+x"
    results.append(("a two-star pattern is caught as non-linear (mutant observed)",
                     linear_time_findings(quad, 0.05) != []))

    failed = [n for n, ok in results if not ok]
    for name, ok in results:
        print(("ok   " if ok else "FAIL ") + name)
    print(f"selftest: {len(results) - len(failed)} of {len(results)} predicates held")
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    flags = {"--write", "--check", "--digests", "--manifest-digest", "--selftest", "--score", "--self-corpus"}
    if len(argv) != 1 or argv[0] not in flags:
        print(__doc__)
        return 2
    mode = argv[0]
    if mode == "--selftest":
        return selftest()
    if mode == "--write":
        write(ROOT)
        print(f"wrote the patch and {MANIFEST.name}")
        return 0
    if mode == "--self-corpus":
        print(self_corpus(ROOT), end="")
        return 0
    problems = check(ROOT)
    if problems:
        for p in problems:
            print(f"FAIL {p}")
        return 1
    if mode == "--digests":
        print("".join(line + "\n" for line in (ROOT / MANIFEST).read_text().splitlines() if not line.startswith("#")), end="")
    elif mode == "--manifest-digest":
        print(hashlib.sha256((ROOT / MANIFEST).read_bytes()).hexdigest())
    elif mode == "--score":
        print(score(ROOT), end="")
    else:
        print("public-source-screening-scope-v6: patch and manifest current")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
