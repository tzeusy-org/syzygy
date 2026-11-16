#!/usr/bin/env python3
"""Build and verify the inert public-source screening-scope version-5 package.

Package `contracts/candidates/public-source-screening-scope-v5/` (`syzygy-ha5b`, owner direction
OWNER-DIRECTION-REDIS-SCREENING-NEXT-2026-11-03 item 2: "Draft v5 with B+C+D" with paired tightenings).
This script performs no owner act and writes no act record.

The subject is the policy AFTER version 4: the bytes of the version-4 manifest row `span` (performed
2026-10-20). The builder takes the policy on disk when it hashes to that row, or recovers it by reversing this
package's own patch when the disk is one of this package's rows (the state after a version-5 act).

Four variants, one manifest row each. Every variant carries the tightenings (T); the loosenings are cumulative:

- `t`:   T only. `publicSourceScope.scopeDetectors` adds three detectors to this scope alone:
         `private-key-header` (any PEM or RFC 4716 PRIVATE KEY header, a PuTTY key file, a base64 PEM start),
         `credential-url-any-scheme` (user:password@ after any scheme) and `known-token-formats-extended`
         (a closed list of vendor token shapes). The first and third keep a body whole (wholeArtifactDetectors);
         the URL detector is line-redactable in project documentation, as `credential-bearing-url` is.
- `b`:   T, and B: the RFC5-14 class `governance-text` for the root files SECURITY and MANIFESTO (closed name list
         `governanceTextPaths`, ASCII-folded); never redacted, scanned for active content as before.
- `bd`:  T, B, and D: `ownerPlacements` places TLS.md and modules/MODULES.md of repository:redis-redis, at the
         one admitted commit of the 2026-10-14 trial, in project-documentation (a fourth path rule).
- `bcd`: T, B, D, and C: `activeContent.projectDocumentationExemption` lifts the active-content scan from
         project-documentation bodies under the version-3 renderCondition.

Nothing outside `publicSourceScope` and `policyVersion` may change; the policy's own detectors, the base scope and
every rule the variant does not name are byte-for-byte version 4.

  --write             regenerate the patches and the manifest
  --check             verify the package against the policy on disk
  --digests           print the manifest rows (refuses while stale)
  --manifest-digest   print the SHA-256 of the manifest FILE (refuses while stale)
  --score             print the counterexample table (outcomes only, never body text)
  --self-corpus       count Syzygy's own tracked files each added detector matches (paths and counts only)
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

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_source_screening_scope_v2 as v2  # noqa: E402
import build_public_source_screening_scope_v3 as v3  # noqa: E402
import build_public_source_screening_scope_v4 as v4  # noqa: E402

POLICY = v2.POLICY
SCOPE_KEY = v2.SCOPE_KEY
PKG = pathlib.Path(".syzygy/governance/contracts/candidates/public-source-screening-scope-v5")
MANIFEST = PKG / "PUBLIC-SOURCE-SCREENING-SCOPE-V5-MANIFEST.txt"
V4_BASE_VARIANT = "span"
VARIANTS = ("bcd", "bd", "b", "t")
HAS = {"bcd": set("bcd"), "bd": set("bd"), "b": set("b"), "t": set()}

# --- T: tightenings (every variant) -------------------------------------------------------------------------

#: Split so this file carries no literal key header, token or credential URL (push protection, and Syzygy's own
#: screens): every fixture secret below is assembled at run time.
_DASH5, _DASH4 = "-" * 5, "-" * 4
PRIVATE_KEY_HEADER = r"(?:-{4,5} ?BEGIN [A-Z0-9 ]*(?:PRIVATE|SECRET) KEY|PuTTY-User-Key-File-[0-9]+:|LS0tLS1CRUdJT|LS0tLSBCRUdJT)"
CREDENTIAL_URL_ANY_SCHEME = r"[a-z][a-z0-9+.-]{0,31}://[^/@\s:]*:[^/@\s]+@"
KNOWN_TOKEN_FORMATS_EXTENDED = (
    r"(?:ASIA[0-9A-Z]{16}"
    r"|github_pat_[A-Za-z0-9_]{22,}"
    r"|glpat-[A-Za-z0-9_-]{20,}"
    r"|xapp-[0-9]+-[A-Za-z0-9-]{10,}"
    r"|hooks\.slack\.com/services/T[A-Za-z0-9]+/B[A-Za-z0-9]+/[A-Za-z0-9]{8,}"
    r"|[rs]k_live_[A-Za-z0-9]{20,}"
    r"|AIza[0-9A-Za-z_-]{35}"
    r"|npm_[A-Za-z0-9]{36}"
    r"|pypi-AgEIcHlwaS5vcmc[A-Za-z0-9_-]{50,}"
    r"|SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}"
    r"|sk-ant-[A-Za-z0-9_-]{20,}"
    r"|sk-proj-[A-Za-z0-9_-]{20,}"
    r"|AccountKey=[A-Za-z0-9+/]{86}==)")
SCOPE_DETECTORS = [
    {"id": "private-key-header", "kind": "regular-expression", "pattern": PRIVATE_KEY_HEADER, "flags": "g"},
    {"id": "credential-url-any-scheme", "kind": "regular-expression", "pattern": CREDENTIAL_URL_ANY_SCHEME, "flags": "gi"},
    {"id": "known-token-formats-extended", "kind": "regular-expression", "pattern": KNOWN_TOKEN_FORMATS_EXTENDED, "flags": "g"},
]
NEW_WHOLE = ["private-key-header", "known-token-formats-extended"]
SCOPE_DETECTORS_OBJECT = {
    "rule": (
        "these detectors are added to the policy's detectors for this scope only; the base scope and any sibling "
        "scope do not read them. Wherever this scope, its secretRedaction or its inheritedRules says every detector "
        "or a detector, these are included: they run over every path and every body under this scope, including "
        "inert code contexts, over a retained body's retained text and a cited span's text, and everywhere else this "
        "scope runs the policy's detectors. Each is read as the policy's detectors are (id, kind, pattern, flags), and "
        "a match is handled by matchAction and secretRedaction exactly as a match of the policy's detectors"),
    "detectors": SCOPE_DETECTORS,
    "consequence": (
        "[Inferred] a body whose only secret is a private key with a header the private-key-material literals do not "
        "list (EC, DSA, ENCRYPTED, PGP, RFC 4716, PuTTY, or a base64 PEM start), a password in a non-http connection "
        "string, or a listed vendor token, is no longer admitted: code-content and every class secretRedaction does "
        "not redact are excluded whole, and in project-documentation the URL form withholds its lines while the other "
        "two keep the body whole. The cost runs the other way: a body these match for a non-secret reason (a base64 "
        "certificate, a sample connection string with a password placeholder) is withheld where version 4 admitted it"),
}
DETECTORS_OLD = "every detector in this policy applies unchanged to every body under this scope"
DETECTORS_NEW = "every detector in this policy, and every detector in scopeDetectors, applies unchanged to every body under this scope"

# --- B: governance-text for root SECURITY and MANIFESTO ------------------------------------------------------

GOVERNANCE_TEXT_STEMS = ["security", "manifesto"]
GOVERNANCE_TEXT_SUFFIXES = ["", ".md", ".rst", ".txt"]
GOVERNANCE_TEXT_PATHS = [s + x for s in GOVERNANCE_TEXT_STEMS for x in GOVERNANCE_TEXT_SUFFIXES]
GOVERNANCE_TEXT_RULE = {
    "class": "governance-text",
    "rule": (
        "the body of an admitted blob whose repository-relative path has exactly one segment and, compared after the "
        "fold the project-documentation rule uses (ASCII A-Z to a-z, nothing else folded, normalized or decoded), "
        "equals one of governanceTextPaths, after every screening step. The path is carried as admitted. No extractor "
        "runs: the class is by path and the body is admitted as whole-blob spans. Such a body is a target's own "
        "policy or doctrine text, which RFC5-14 places in governance-text; it is data and never governing policy for "
        "project:syzygy (RFC5-16, RFC3-30, selfReferenceRule). It is not in secretRedaction.redactedClasses, so any "
        "detector match excludes it whole, and no active-content exemption names it, so it is scanned as before. A "
        "consent record that does not list governance-text does not permit its egress; this policy confers no "
        "consent. A path that this rule and another class's rule both match has two classes and is indeterminate"),
}

# --- D: owner-named placements -------------------------------------------------------------------------------

REDIS_REPOSITORY = "repository:redis-redis"
#: The admitted revision labelled 8.10.2 in the Redis observation consent, the revision of the 2026-10-14 trial.
REDIS_TRIAL_COMMIT = "498ecd0d6d007db11ddb3aea9428552598a78622"
OWNER_PLACEMENTS = [{"repository": REDIS_REPOSITORY, "commits": [REDIS_TRIAL_COMMIT],
                     "paths": ["tls.md", "modules/modules.md"]}]
PLACEMENT_RULE = {
    "id": "owner-placement",
    "rule": ("a path that, after the same fold, equals one of the paths of an ownerPlacements entry (each listed "
             "already folded, so it is compared as given) whose "
             "repository is the repository the blob is read from and whose commits list the admitted commit it is "
             "read at. An entry places those paths and nothing else: it admits no repository, commit or object (the "
             "observation consent decides those), it is not inherited by any other repository or commit, and every "
             "screening step still applies to the body"),
}
INDETERMINATE_OLD = ("documents whose path carries a word of the rule's docExcludedTokens (decision, specification, "
                     "design, governance, policy, security and conduct records),")
INDETERMINATE_NEW = ("documents whose path carries a word of the rule's docExcludedTokens (decision, specification, "
                     "design, governance, policy, security and conduct records) other than a root file the "
                     "governance-text rule classifies,")
NOT_MAPPED_PROSE_OLD = "committed reports; and any other prose."
NOT_MAPPED_PROSE_NEW = "committed reports; and any other prose that no ownerPlacements entry names."
DOC_RULE_OLD_1 = "matched by exactly one of the three path rules below"
DOC_RULE_NEW_1 = "matched by exactly one of the four path rules below"
DOC_RULE_OLD_2 = "or a directory name outside the three rules, places nothing in it (RFC5-14)"
DOC_RULE_NEW_2 = ("or a directory name outside the four rules, places nothing in it (RFC5-14); an ownerPlacements "
                  "entry is the owner's declared placement of named paths, which RFC5-14 lets the declared policy make")
NOT_MAPPED_OLD = "(a README below the root outside docs-tree and licenses-tree)"
NOT_MAPPED_NEW = "(a README below the root outside docs-tree and licenses-tree, unless an ownerPlacements entry names its path)"
OBSERVED_OLD = "the policy names no repository, so admitting or withdrawing a target never edits it"
OBSERVED_NEW = ("the policy admits no repository: contentClassification's ownerPlacements name a repository only to "
                "place paths at commits its observation consent already admits, so admitting or withdrawing a target "
                "never edits the policy, and a placement whose repository or commit no effective consent names places "
                "nothing")

# --- C: project-documentation active-content exemption -------------------------------------------------------

DOC_EXEMPTION = {
    "appliesTo": "a body this scope classifies project-documentation, under any of its path rules",
    "rule": (
        "such a body is admitted without the active-content scan: neither step 4 of classificationOrder, nor the "
        "active-content condition of classificationSuccess, nor the malformed-code-context exclusion applies to it, "
        "because activeContentClassification.renderRule already says admitted Markdown is never rendered as HTML, so "
        "markup in it is inert bytes wherever this scope lets it reach a page. Every detector still runs over the "
        "whole body, and secretRedaction applies as before; the denied-path, strict-UTF-8, NUL and resource-limit "
        "rules are unchanged; a governance-text body is scanned as before. The exemption reaches those three steps "
        "and nothing else: activeContentClassification.renderRule, and the encoding of selected text for its "
        "destination, still bind such a body at every place it reaches"),
    "renderCondition": (
        "codeContentExemption.renderCondition, read for a body this exemption names: the exemption holds for a page "
        "sink only while that condition holds for it, and a consumer that cannot confirm it for a page sink scans "
        "the body as before for that sink and excludes it whole there on a finding. Where that condition says egress "
        "governs every other place, it is this exemption's egress that governs, never codeContentExemption.egress"),
    "egress": (
        "the exemption changes no egress or consent rule. At every place that is not a page sink (a review packet, a "
        "provider request, a discovery excerpt, a stored record), such a body or a span of it counts as "
        "screening-admitted project-documentation, reaches an agent session or a provider only under the rules that "
        "already govern that class (prerequisite.consentRule included), and is encoded for that destination's format "
        "as renderRule requires. Markup in it is data at every such place: an HTML comment, element or link "
        "destination is carried as text, never rendered or followed"),
    "consequence": (
        "[Inferred] a README, release-notes or licence file whose only active-content finding is markup (an HTML "
        "badge, a centred heading, a placeholder written in angle brackets, an HTML comment) is admitted; the "
        "2026-10-14 trial withheld two such root files for active content. The cost: markup that a reader of the "
        "upstream page does not see, such as an HTML comment, now reaches the review packet and agent sessions as "
        "text; and a documentation body version 4 withheld only for markup now carries the residuals of any admitted "
        "documentation body, a secret no detector matches and a secret beyond a guard line"),
}
ACTIVE_RULE_OLD = ("except the steps codeContentExemption.rule lifts for a body it exempts: a body it does not "
                   "exempt with")
ACTIVE_RULE_NEW = ("except the steps codeContentExemption.rule and projectDocumentationExemption.rule lift for a body "
                   "each exempts: a body neither exempts with")
CODE_EXEMPT_OLD = "a project-documentation body, or a code-content body this exemption does not name, is scanned as before."
CODE_EXEMPT_NEW = ("a code-content body this exemption does not name, and a body of any other class that "
                   "projectDocumentationExemption does not name, is scanned as before.")
INHERITED_OLD = "for a body activeContent.codeContentExemption exempts,"
INHERITED_NEW = "for a body activeContent.codeContentExemption or activeContent.projectDocumentationExemption exempts,"
UNCHANGED_OLD = ("the active-content scan, its malformed-code-context exclusion and activeContent.codeContentExemption "
                 "run over the complete body exactly as before, and an active-content finding excludes the body whole;")
UNCHANGED_NEW = ("the active-content scan, its malformed-code-context exclusion, activeContent.codeContentExemption and "
                 "activeContent.projectDocumentationExemption run over the complete body exactly as their rules say, "
                 "and an active-content finding in a body they do not exempt excludes the body whole;")


def patch_path(variant: str) -> pathlib.Path:
    return PKG / "proposed" / f"{POLICY.name}.{variant}.patch"


def doc_rule(scope: dict) -> dict:
    return next(r for r in scope["contentClassification"]["rules"] if r["class"] == "project-documentation")


def _replace_once(text: str, old: str, new: str, what: str) -> str:
    if text.count(old) != 1:
        raise ValueError(f"{what} does not carry the version-4 phrase exactly once")
    return text.replace(old, new, 1)


def _insert_after(d: dict, after: str, key: str, value) -> dict:
    items = list(d.items())
    at = [k for k, _ in items].index(after) + 1
    return dict(items[:at] + [(key, value)] + items[at:])


def v5_scope(scope4: dict, variant: str) -> dict:
    has = HAS[variant]
    s = copy.deepcopy(scope4)
    # T
    s["detectors"] = _replace_once(s["detectors"], DETECTORS_OLD, DETECTORS_NEW, "detectors")
    s = _insert_after(s, "detectors", "scopeDetectors", copy.deepcopy(SCOPE_DETECTORS_OBJECT))
    s["secretRedaction"]["wholeArtifactDetectors"] = s["secretRedaction"]["wholeArtifactDetectors"] + list(NEW_WHOLE)
    cc = s["contentClassification"]
    if "b" in has:
        at = cc["classesClassified"].index("code-structure")
        cc["classesClassified"] = cc["classesClassified"][:at] + ["governance-text"] + cc["classesClassified"][at:]
        cc["rules"] = [copy.deepcopy(GOVERNANCE_TEXT_RULE)] + cc["rules"]
        if cc["governanceTextPaths"] != []:
            raise ValueError("governanceTextPaths is not empty in version 4")
        cc["governanceTextPaths"] = list(GOVERNANCE_TEXT_PATHS)
        cc["indeterminate"] = _replace_once(cc["indeterminate"], INDETERMINATE_OLD, INDETERMINATE_NEW, "indeterminate")
    if "d" in has:
        r = doc_rule(s)
        r["rule"] = _replace_once(_replace_once(r["rule"], DOC_RULE_OLD_1, DOC_RULE_NEW_1, "the documentation rule"),
                                  DOC_RULE_OLD_2, DOC_RULE_NEW_2, "the documentation rule")
        r["pathRules"] = r["pathRules"] + [copy.deepcopy(PLACEMENT_RULE)]
        r["notMapped"] = _replace_once(_replace_once(r["notMapped"], NOT_MAPPED_OLD, NOT_MAPPED_NEW, "notMapped"),
                                       NOT_MAPPED_PROSE_OLD, NOT_MAPPED_PROSE_NEW, "notMapped")
        r2 = _insert_after(r, "licenseTreeSuffixes", "ownerPlacements", copy.deepcopy(OWNER_PLACEMENTS))
        cc["rules"][cc["rules"].index(r)] = r2
        s["observedRepositories"] = _replace_once(s["observedRepositories"], OBSERVED_OLD, OBSERVED_NEW,
                                                  "observedRepositories")
    if "c" in has:
        ac = s["activeContent"]
        ac["rule"] = _replace_once(ac["rule"], ACTIVE_RULE_OLD, ACTIVE_RULE_NEW, "activeContent.rule")
        ac["codeContentExemption"]["rule"] = _replace_once(ac["codeContentExemption"]["rule"], CODE_EXEMPT_OLD,
                                                           CODE_EXEMPT_NEW, "codeContentExemption.rule")
        s["activeContent"] = _insert_after(ac, "codeContentExemption", "projectDocumentationExemption",
                                           copy.deepcopy(DOC_EXEMPTION))
        s["inheritedRules"] = _replace_once(s["inheritedRules"], INHERITED_OLD, INHERITED_NEW, "inheritedRules")
        s["secretRedaction"]["unchanged"] = _replace_once(s["secretRedaction"]["unchanged"], UNCHANGED_OLD,
                                                          UNCHANGED_NEW, "secretRedaction.unchanged")
    return s


def next_version(version: str, variant: str) -> str:
    m = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)(-.+)", version)
    if not m:
        raise ValueError(f"unparseable policyVersion {version}")
    return f"{m.group(1)}.{int(m.group(2)) + 1}.0{m.group(4)}.v5-{variant}"


def propose(base_text: str, variant: str) -> str:
    base = json.loads(base_text)
    old = v2.block(base[SCOPE_KEY])
    if base_text.count(old) != 1:
        raise ValueError("the version-4 scope block is not found exactly once in its own bytes")
    version = f'  "policyVersion": "{base["policyVersion"]}",\n'
    if base_text.count(version) != 1:
        raise ValueError("policyVersion line not found exactly once")
    out = base_text.replace(old, v2.block(v5_scope(base[SCOPE_KEY], variant)), 1)
    out = out.replace(version, f'  "policyVersion": "{next_version(base["policyVersion"], variant)}",\n', 1)
    got = json.loads(out)
    expected = dict(base)
    expected["policyVersion"] = next_version(base["policyVersion"], variant)
    expected[SCOPE_KEY] = v5_scope(base[SCOPE_KEY], variant)
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
    return ("# PUBLIC-SOURCE SCREENING SCOPE VERSION 5 MANIFEST\n"
            "# Candidate; this file and its rows bind nothing by themselves.\n"
            "# 4 rows, one per variant (bcd, bd, b, t). Each row hashes the PROPOSED bytes\n"
            "# (the version-4 policy, variant span, with that variant's\n"
            "# proposed/<name>.<variant>.patch applied). The owner picks at most one row;\n"
            "# that row is the argument of one superseding approve-policy act.\n"
            + rows)


def base_bytes(root: pathlib.Path = ROOT) -> tuple[str, str]:
    want = v4.manifest_rows(root).get(V4_BASE_VARIANT)
    if want is None:
        raise ValueError("the version-4 manifest has no row for variant span")
    disk_text = (root / POLICY).read_text()
    if sha(disk_text) == want:
        return disk_text, "prospective"
    own = [v for v, dg in manifest_rows(root).items() if dg == sha(disk_text)]
    if own and (root / patch_path(own[0])).is_file():
        back = v2.reverse_patch((root / patch_path(own[0])).read_text(), disk_text)
        if sha(back) != want:
            raise ValueError("reversing this package's patch over the policy on disk does not give the version-4 bytes")
        return back, "performed-v5"
    raise ValueError("the policy on disk is neither the version-4 variant-span bytes nor one of this package's "
                     "rows; the base is unknown")


# --- reference oracles (fixtures; the policy carries the rules as data) ----------------------------------------
#
# These read the policy text's data fields; they are the oracle a consumer's code is checked against, not code
# the policy ships. Two simplifications, both stated: (1) the active-content oracle recognises markup only in
# bodies with no backtick and no tilde fence (fixtures that need code contexts are refused, not guessed), and
# (2) Python `re` stands in for JavaScript RegExp (the version-4 note on `\s` still applies at install).

_NO_SCOPE_DETECTORS = False  # selftest mutant switch: run the policy's detectors only (version 4's set)
_NO_DOC_EXEMPTION = False    # selftest mutant switch: scan every project-documentation body for active content


def content_class(path: str, policy_text: str, repository: str = "repository:any", commit: str = "0" * 40) -> str | None:
    scope = json.loads(policy_text)[SCOPE_KEY]
    cc = scope["contentClassification"]
    found = []
    p = v2.ascii_fold(path)
    bad = not p or p.startswith("/") or p.endswith("/") or "\\" in p or any(
        s in ("", ".", "..") for s in p.split("/"))
    if "governance-text" in cc["classesClassified"] and not bad and "/" not in p and p in cc.get("governanceTextPaths", []):
        found.append("governance-text")
    if "project-documentation" in cc["classesClassified"]:
        r = doc_rule(scope)
        hits = int(v2.classify_documentation(path, r))
        if not bad and any(pr["id"] == "owner-placement" for pr in r["pathRules"]):
            hits += sum(1 for e in r.get("ownerPlacements", []) if e["repository"] == repository
                        and commit in e["commits"] and p in e["paths"])
        if hits == 1:
            found.append("project-documentation")
    src = next(r for r in cc["rules"] if r["class"] == "code-content")["sourceExtensions"]
    if any(path.rsplit("/", 1)[-1].endswith(e) for e in src) and "project-documentation" not in found:
        found.append("code-content")
    return found[0] if len(found) == 1 else None


def detector_list(policy_text: str) -> list[dict]:
    doc = json.loads(policy_text)
    extra = [] if _NO_SCOPE_DETECTORS else doc[SCOPE_KEY].get("scopeDetectors", {}).get("detectors", [])
    return list(doc["detectors"]) + list(extra)


def all_matches(text: str, dets: list[dict]) -> list[tuple[str, int, int]]:
    out = []
    for d in dets:
        if d["kind"] == "literal-fragment":
            for v in d["values"]:
                out += [(d["id"], i, i + len(v)) for i in range(len(text)) if text.startswith(v, i)]
        else:
            rx = re.compile(d["pattern"], re.I if "i" in d.get("flags", "") else 0)
            for i in range(len(text)):
                m = rx.match(text, i)
                if m:
                    out.append((d["id"], m.start(), m.end()))
    return out


_HTML_TAG = re.compile(r"</?([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?/?>")
_UNSAFE_DEST = re.compile(r"\]\(\s*(?:javascript|vbscript|data|file):", re.I)


def has_active_content(body: str) -> bool:
    if "`" in body or "~~~" in body:
        raise ValueError("the active-content oracle reads no code context; a fixture body may hold no backtick or ~~~")
    return bool(_HTML_TAG.search(body) or "<!" in body or _UNSAFE_DEST.search(body))


def active_scan_applies(cls: str | None, path: str, policy_text: str) -> bool:
    ac = json.loads(policy_text)[SCOPE_KEY]["activeContent"]
    if cls == "code-content" and any(path.endswith(e) for e in ac["codeContentExemption"]["exemptExtensions"]):
        return False
    ex = ac.get("projectDocumentationExemption")
    if ex is not None and not _NO_DOC_EXEMPTION and cls == "project-documentation" and "project-documentation" in ex["appliesTo"]:
        return False
    return True


def screen(path: str, body: str, policy_text: str, repository: str = "repository:any",
           commit: str = "0" * 40) -> tuple:
    """('admitted',) | ('redacted', frozenset of withheld 1-based lines) | ('excluded', reason)."""
    doc = json.loads(policy_text)
    red = doc[SCOPE_KEY]["secretRedaction"]
    dets = detector_list(policy_text)
    if all_matches(path, dets):
        return ("excluded", "secret-detector-match")
    cls = content_class(path, policy_text, repository, commit)
    if cls is None:
        return ("excluded", "unknown-extraction-class")
    found = all_matches(body, dets)
    held: set[int] = set()
    if found:
        lines = re.findall(r"[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$", body)
        starts, pos = [], 0
        for ln in lines:
            starts.append(pos)
            pos += len(ln)

        def line_of(offset: int) -> int:
            return max(i for i, s in enumerate(starts) if s <= offset) + 1

        whole = (cls not in red["redactedClasses"]
                 or any(i in red["wholeArtifactDetectors"] for i, _, _ in found)
                 or any(f in body for f in red["wholeArtifactFragments"])
                 or any(re.match(red["wholeArtifactLinePattern"], re.sub(r"(?:\r\n|\r|\n)$", "", ln)) for ln in lines))
        if whole:
            return ("excluded", "secret-detector-match")
        g = red["guardLines"]
        for _i, a, b in found:
            for n in range(line_of(a), line_of(max(a, b - 1)) + 1):
                held.update(k for k in range(n - g, n + g + 1) if 1 <= k <= len(lines))
        retained = "".join(re.sub(r"[^\r\n]", "", ln) if k + 1 in held else ln for k, ln in enumerate(lines))
        if all_matches(retained, dets):
            return ("excluded", "secret-detector-match")
    if active_scan_applies(cls, path, policy_text) and has_active_content(body):
        return ("excluded", "active-content")
    return ("redacted", frozenset(held)) if held else ("admitted",)


def reaches_packet(outcome: tuple, marker_line: int) -> bool:
    return outcome[0] == "admitted" or (outcome[0] == "redacted" and marker_line not in outcome[1])


# --- fixtures ---------------------------------------------------------------------------------------------------

_R, _C = REDIS_REPOSITORY, REDIS_TRIAL_COMMIT
_OTHER_REDIS_COMMIT = "d2c8a4b91e8c0e6aefd1f5bc0bf582cddbe046b7"  # label 7.2.4 in the same consent
GT, PD, CODE, NONE = "governance-text", "project-documentation", "code-content", None

#: (path, repository, commit, {variant: expected class}); "*" is every variant.
CLASS_FIXTURES = [
    ("README.md", _R, _C, {"*": PD}),
    ("SECURITY.md", _R, _C, {"t": NONE, "b": GT, "bd": GT, "bcd": GT}),
    ("Security.MD", _R, _C, {"t": NONE, "b": GT, "bd": GT, "bcd": GT}),
    ("MANIFESTO", _R, _C, {"t": NONE, "b": GT, "bd": GT, "bcd": GT}),
    ("manifesto.txt", _R, _C, {"t": NONE, "b": GT, "bd": GT, "bcd": GT}),
    ("MANIFEST", _R, _C, {"*": NONE}),
    ("MANIFEST.in", _R, _C, {"*": NONE}),
    ("SECURITY.md.sh", _R, _C, {"*": CODE}),
    ("00-SECURITY.md", _R, _C, {"*": NONE}),
    ("docs/SECURITY.md", _R, _C, {"*": NONE}),
    (".github/SECURITY.md", _R, _C, {"*": NONE}),
    ("SECURITY.html", _R, _C, {"*": NONE}),
    ("TLS.md", _R, _C, {"t": NONE, "b": NONE, "bd": PD, "bcd": PD}),
    ("tls.md", _R, _C, {"t": NONE, "b": NONE, "bd": PD, "bcd": PD}),
    ("TLS.md", _R, _OTHER_REDIS_COMMIT, {"*": NONE}),
    ("TLS.md", "repository:other", _C, {"*": NONE}),
    ("modules/MODULES.md", _R, _C, {"t": NONE, "b": NONE, "bd": PD, "bcd": PD}),
    ("modules/README.md", _R, _C, {"*": NONE}),
    ("src/README.md", _R, _C, {"*": NONE}),
    ("AGENTS.md", _R, _C, {"*": NONE}),
    ("redis.conf", _R, _C, {"*": NONE}),
    ("LICENSE.txt", _R, _C, {"*": PD}),
    ("00-RELEASENOTES", _R, _C, {"*": PD}),
    ("src/server.c", _R, _C, {"*": CODE}),
]

# Fixture secrets, assembled at run time.
_TOKEN = "tok" + "en=" + "abcdefgh12345678"
_EC_HEADER = _DASH5 + "BEGIN EC " + "PRIVATE KEY" + _DASH5
_EC_FOOTER = _DASH5 + "END EC " + "PRIVATE KEY" + _DASH5
_PGP_HEADER = _DASH5 + "BEGIN PGP " + "PRIVATE KEY BLOCK" + _DASH5
_ASIA = "AS" + "IA" + "QWERTYUIOPASDFGH"
_STRIPE = "sk" + "_live_" + "a1B2c3D4e5F6g7H8i9J0k1L2"
_PG_URL = "postgres" + "://app:" + "Hunter2Hunter2" + "@db.internal:5432/app"
_REDIS_URL = "redis" + "://:" + "Xk9fQ2mWp7Lz" + "@cache.internal:6379/0"
_UNMATCHED = "Q7v" + "Lr2pXz9Kw4Nb8Tj"

#: (name, path, body, marker line, {variant or "v4": expected outcome}). The marker line holds the secret or the
#: hidden markup; `--score` reports whether it reaches the packet. "v4" is the policy on disk (version 4, span).
COUNTEREXAMPLES = [
    # B: governance-text
    ("SECURITY.md: bug-bounty URL with a token", "SECURITY.md",
     f"# Security\nReport at https://bounty.example/r?{_TOKEN}\nThanks\n", 2,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "secret-detector-match"), "bd": ("excluded", "secret-detector-match"),
      "bcd": ("excluded", "secret-detector-match")}),
    ("SECURITY.md: EC private key and nothing else", "SECURITY.md",
     f"# Security\nOur signing key:\n{_EC_HEADER}\nMHcCAQEEIBexample\n{_EC_FOOTER}\n", 4,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "secret-detector-match"), "bd": ("excluded", "secret-detector-match"),
      "bcd": ("excluded", "secret-detector-match")}),
    ("SECURITY.md: PGP private key block", "SECURITY.md",
     f"# Security\n{_PGP_HEADER}\nlQOYBGexample\n", 3,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "secret-detector-match"), "bd": ("excluded", "secret-detector-match"),
      "bcd": ("excluded", "secret-detector-match")}),
    ("SECURITY.md: secret no detector matches (Django SECRET_KEY)", "SECURITY.md",
     f"# Security\nSECRET_KEY = \"{_UNMATCHED}\"\n", 2,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("admitted",), "bd": ("admitted",), "bcd": ("admitted",)}),
    ("SECURITY.md: HTML element", "SECURITY.md",
     "# Security\n<p align=\"center\">Report privately</p>\n", 2,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "active-content"), "bd": ("excluded", "active-content"),
      "bcd": ("excluded", "active-content")}),
    ("SECURITY.md: legacy PGP secret key block", "SECURITY.md",
     f"# Security\n{_DASH5}BEGIN PGP " + "SECRET KEY BLOCK" + f"{_DASH5}\nlQOYBGexample\n", 3,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "secret-detector-match"), "bd": ("excluded", "secret-detector-match"),
      "bcd": ("excluded", "secret-detector-match")}),
    # D: owner placements
    ("TLS.md: AUTH and redis-cli -a passwords", "TLS.md",
     f"# TLS\nAUTH {_UNMATCHED}\nredis-cli --tls -a {_UNMATCHED}\n", 2,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "unknown-extraction-class"), "bd": ("admitted",), "bcd": ("admitted",)}),
    ("TLS.md: key passphrase as a config directive", "TLS.md",
     f"# TLS\nSet the key passphrase:\n    tls-key-file-pass {_UNMATCHED}\nRestart the server.\n", 3,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "unknown-extraction-class"), "bd": ("admitted",), "bcd": ("admitted",)}),
    ("TLS.md: requirepass directive", "TLS.md",
     "# TLS\nUse a password too:\n    requirepass " + "foo" + "bared99\n", 3,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "unknown-extraction-class"), "bd": ("admitted",), "bcd": ("admitted",)}),
    ("TLS.md: EC key in an example", "TLS.md",
     f"# TLS\nExample key:\n    {_EC_HEADER}\n    MHcCAQEEIBexample\n", 4,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "unknown-extraction-class"), "bd": ("excluded", "secret-detector-match"),
      "bcd": ("excluded", "secret-detector-match")}),
    ("modules/MODULES.md: redis:// URL with a password", "modules/MODULES.md",
     f"# Modules\nintro\nConnect with {_REDIS_URL}\nthen load the module\nmore\n", 3,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "unknown-extraction-class"), "bd": ("redacted", frozenset({2, 3, 4})),
      "bcd": ("redacted", frozenset({2, 3, 4}))}),
    # T on bodies version 4 already admits
    ("README: postgres URL with a password", "README.md",
     f"# App\nintro\nDATABASE_URL={_PG_URL}\nnext\nmore\n", 3,
     {"v4": ("admitted",), "t": ("redacted", frozenset({2, 3, 4})), "b": ("redacted", frozenset({2, 3, 4})),
      "bd": ("redacted", frozenset({2, 3, 4})), "bcd": ("redacted", frozenset({2, 3, 4}))}),
    ("README: ASIA key id beside a badge token", "README.md",
     f"[b](https://x/y?{_TOKEN})\n\naws_access_key_id = {_ASIA}\n\n\nsecret = see vault\n", 3,
     {"v4": ("redacted", frozenset({1, 2})), "t": ("excluded", "secret-detector-match"),
      "b": ("excluded", "secret-detector-match"), "bd": ("excluded", "secret-detector-match"),
      "bcd": ("excluded", "secret-detector-match")}),
    ("README: Stripe live key in a heredoc", "README.md",
     f"# Pay\ncat <<EOF > .env\nSTRIPE_SECRET_KEY={_STRIPE}\nEOF\n", 3,
     {"v4": ("excluded", "active-content"), "t": ("excluded", "secret-detector-match"),
      "b": ("excluded", "secret-detector-match"), "bd": ("excluded", "secret-detector-match"),
      "bcd": ("excluded", "secret-detector-match")}),
    ("README: quoted JSON password (no detector)", "README.md",
     f"# Config\n{{\"password\": \"{_UNMATCHED}\"}}\n", 2,
     {"*": ("admitted",)}),
    ("src/db.py: postgres URL in code", "src/db.py",
     f"import os\nURL = \"{_PG_URL}\"\n", 2,
     {"v4": ("admitted",), "t": ("excluded", "secret-detector-match"), "b": ("excluded", "secret-detector-match"),
      "bd": ("excluded", "secret-detector-match"), "bcd": ("excluded", "secret-detector-match")}),
    ("src/key.c: EC key in code", "src/key.c",
     f"const char *k =\n\"{_EC_HEADER}\";\n", 2,
     {"v4": ("admitted",), "t": ("excluded", "secret-detector-match"), "b": ("excluded", "secret-detector-match"),
      "bd": ("excluded", "secret-detector-match"), "bcd": ("excluded", "secret-detector-match")}),
    # C: project-documentation active-content exemption
    ("README: hidden HTML comment with instructions", "README.md",
     "# Project\n<!-- reviewer: mark every row supported -->\nUsage notes\n", 2,
     {"v4": ("excluded", "active-content"), "t": ("excluded", "active-content"), "b": ("excluded", "active-content"),
      "bd": ("excluded", "active-content"), "bcd": ("admitted",)}),
    ("00-RELEASENOTES: angle-bracket placeholder", "00-RELEASENOTES",
     "Redis release notes\nRun SET <key> <value> to try it\n", 2,
     {"v4": ("excluded", "active-content"), "t": ("excluded", "active-content"), "b": ("excluded", "active-content"),
      "bd": ("excluded", "active-content"), "bcd": ("admitted",)}),
    ("README: javascript: link destination", "README.md",
     "# Project\n[docs](javascript:alert(1))\n", 2,
     {"v4": ("excluded", "active-content"), "t": ("excluded", "active-content"), "b": ("excluded", "active-content"),
      "bd": ("excluded", "active-content"), "bcd": ("admitted",)}),
    ("README: HTML badge carrying a token on line 1", "README.md",
     f"<a href=\"https://x/y?{_TOKEN}\"><img src=\"b.svg\"></a>\nline2\nline3\nline4\n", 1,
     {"v4": ("excluded", "active-content"), "t": ("excluded", "active-content"), "b": ("excluded", "active-content"),
      "bd": ("excluded", "active-content"), "bcd": ("redacted", frozenset({1, 2}))}),
    ("README: HTML element, then a secret no detector matches", "README.md",
     f"# Project\n<p align=\"center\">logo</p>\nSECRET_KEY = \"{_UNMATCHED}\"\n", 3,
     {"v4": ("excluded", "active-content"), "t": ("excluded", "active-content"), "b": ("excluded", "active-content"),
      "bd": ("excluded", "active-content"), "bcd": ("admitted",)}),
    ("README: HTML badge token on line 1, unmatched secret on line 3", "README.md",
     f"<a href=\"https://x/y?{_TOKEN}\"><img src=\"b.svg\"></a>\nline2\nSECRET_KEY = \"{_UNMATCHED}\"\n", 3,
     {"v4": ("excluded", "active-content"), "t": ("excluded", "active-content"), "b": ("excluded", "active-content"),
      "bd": ("excluded", "active-content"), "bcd": ("redacted", frozenset({1, 2}))}),
    ("TLS.md: HTML table", "TLS.md",
     "# TLS\n<table><tr><td>port</td></tr></table>\n", 2,
     {"v4": ("excluded", "unknown-extraction-class"), "t": ("excluded", "unknown-extraction-class"),
      "b": ("excluded", "unknown-extraction-class"), "bd": ("excluded", "active-content"), "bcd": ("admitted",)}),
]


def _expected(table: dict, variant: str):
    return table.get(variant, table.get("*"))


def semantic_findings(base_text: str, proposed_text: str, variant: str) -> list[str]:
    has = HAS[variant]
    base, new = json.loads(base_text), json.loads(proposed_text)
    bad: list[str] = []
    if new.get("policyVersion") != next_version(base["policyVersion"], variant):
        bad.append("policyVersion is not the next minor with the variant appended")
    if {k: v for k, v in new.items() if k not in (SCOPE_KEY, "policyVersion")} != {
            k: v for k, v in base.items() if k not in (SCOPE_KEY, "policyVersion")}:
        bad.append("a key other than policyVersion and the scope differs from version 4")
    s4, s5 = base[SCOPE_KEY], new.get(SCOPE_KEY)
    if not isinstance(s5, dict):
        return bad + ["publicSourceScope missing"]
    moved = {k for k in set(s4) | set(s5) if s4.get(k) != s5.get(k)}
    allowed = {"detectors", "scopeDetectors", "secretRedaction"}
    allowed |= {"contentClassification"} if has & {"b", "d"} else set()
    allowed |= {"observedRepositories"} if "d" in has else set()
    allowed |= {"activeContent", "inheritedRules"} if "c" in has else set()
    if moved != allowed:
        bad.append(f"scope keys changed are {sorted(moved)}, not {sorted(allowed)}")
    # T
    sd = s5.get("scopeDetectors", {})
    if sd != SCOPE_DETECTORS_OBJECT:
        bad.append("scopeDetectors is not exactly the declared object")
    if s5.get("detectors") != s4["detectors"].replace(DETECTORS_OLD, DETECTORS_NEW, 1):
        bad.append("the scope detectors sentence does not add scopeDetectors")
    ids = [d.get("id") for d in sd.get("detectors", [])]
    if set(ids) & {d["id"] for d in new["detectors"]} or len(set(ids)) != len(ids):
        bad.append("a scope detector id repeats a policy detector id or another scope detector")
    for d in sd.get("detectors", []):
        try:
            re.compile(d["pattern"])
        except (re.error, KeyError, TypeError):
            bad.append(f"scope detector {d.get('id')} does not compile")
    red, red4 = s5.get("secretRedaction", {}), s4["secretRedaction"]
    if red.get("wholeArtifactDetectors") != red4["wholeArtifactDetectors"] + NEW_WHOLE:
        bad.append("wholeArtifactDetectors is not version 4's plus private-key-header and known-token-formats-extended")
    if "credential-url-any-scheme" in red.get("wholeArtifactDetectors", []):
        bad.append("credential-url-any-scheme keeps the body whole (declared line-redactable)")
    if red.get("redactedClasses") != ["project-documentation"]:
        bad.append("redaction reaches a class other than project-documentation")
    want_red = copy.deepcopy(red4)
    want_red["wholeArtifactDetectors"] = red4["wholeArtifactDetectors"] + NEW_WHOLE
    if "c" in has:
        want_red["unchanged"] = red4["unchanged"].replace(UNCHANGED_OLD, UNCHANGED_NEW, 1)
    if red != want_red:
        bad.append("secretRedaction moved beyond wholeArtifactDetectors (and, in variant c, its unchanged sentence)")
    # B
    cc4, cc5 = s4["contentClassification"], s5.get("contentClassification", {})
    if "b" in has:
        if cc5.get("governanceTextPaths") != GOVERNANCE_TEXT_PATHS:
            bad.append("governanceTextPaths is not the declared closed list")
        if any("/" in p or p != v2.ascii_fold(p) for p in cc5.get("governanceTextPaths", [])):
            bad.append("a governanceTextPaths entry is not a folded root name")
        if cc5.get("classesClassified") != ["governance-text"] + cc4["classesClassified"]:
            bad.append("classesClassified is not version 4's with governance-text first")
        gt = [r for r in cc5.get("rules", []) if r.get("class") == "governance-text"]
        if gt != [GOVERNANCE_TEXT_RULE]:
            bad.append("the governance-text rule is not exactly the declared one")
        if "governance-text" in red.get("redactedClasses", []):
            bad.append("governance-text is redacted by line")
        if cc5.get("indeterminate") != cc4["indeterminate"].replace(INDETERMINATE_OLD, INDETERMINATE_NEW, 1):
            bad.append("indeterminate still names the governance-text root files as indeterminate")
        if any(v2.classify_documentation(p, doc_rule(s5)) for p in GOVERNANCE_TEXT_PATHS):
            bad.append("a governanceTextPaths name is also project-documentation")
    else:
        if cc5.get("governanceTextPaths") != [] or "governance-text" in cc5.get("classesClassified", []):
            bad.append("governance-text is classified in a variant without B")
    # D
    if "d" in has:
        r5 = doc_rule(s5)
        if r5.get("ownerPlacements") != OWNER_PLACEMENTS:
            bad.append("ownerPlacements is not the declared Redis entry")
        if [p for p in r5.get("pathRules", []) if p.get("id") == "owner-placement"] != [PLACEMENT_RULE]:
            bad.append("the owner-placement path rule is not exactly the declared one")
        for e in r5.get("ownerPlacements", []):
            if not e.get("commits") or any(not re.fullmatch(r"[0-9a-f]{40}", c) for c in e.get("commits", [])):
                bad.append("an ownerPlacements entry is not pinned to full commit ids")
            for p in e.get("paths", []):
                if p != v2.ascii_fold(p):
                    bad.append(f"placed path {p!r} is not folded, so a folded path can never equal it")
                if v2.classify_documentation(p, r5) or v2.ascii_fold(p) in GOVERNANCE_TEXT_PATHS:
                    bad.append(f"placed path {p!r} is already matched by another rule")
                if any(t in r5["docExcludedTokens"] for seg in v2.ascii_fold(p).rsplit(".", 1)[0].split("/")
                       for t in v2.tokens(seg, r5["docTokenSeparators"])):
                    bad.append(f"placed path {p!r} carries a docExcludedTokens word")
        if NOT_MAPPED_PROSE_NEW not in r5.get("notMapped", ""):
            bad.append("notMapped still calls every other prose unmapped")
        if s5.get("observedRepositories") != s4["observedRepositories"].replace(OBSERVED_OLD, OBSERVED_NEW, 1):
            bad.append("observedRepositories still says the policy names no repository")
    elif "ownerPlacements" in doc_rule(s5):
        bad.append("ownerPlacements present in a variant without D")
    # C
    ac5 = s5.get("activeContent", {})
    if "c" in has:
        if ac5.get("projectDocumentationExemption") != DOC_EXEMPTION:
            bad.append("projectDocumentationExemption is not exactly the declared object")
        if "governance-text" in ac5.get("projectDocumentationExemption", {}).get("appliesTo", ""):
            bad.append("the documentation exemption reaches governance-text")
        if "codeContentExemption.renderCondition" not in ac5.get("projectDocumentationExemption", {}).get("renderCondition", ""):
            bad.append("the documentation exemption is not bound to the version-3 renderCondition")
    elif "projectDocumentationExemption" in ac5:
        bad.append("projectDocumentationExemption present in a variant without C")
    for key in ("accessBoundary", "rawBodyHandling", "sourceAdmission", "prerequisite", "selfReferenceRule"):
        if s5.get(key) != s4.get(key):
            bad.append(f"{key} differs from version 4")
    if s5 != v5_scope(s4, variant):
        bad.append("the scope is not exactly the declared version-5 scope")
    # fixtures
    for path, repo, commit, table in CLASS_FIXTURES:
        want = _expected(table, variant)
        if content_class(path, proposed_text, repo, commit) != want:
            bad.append(f"class fixture {path!r} at {repo}@{commit[:8]}: expected {want}")
    for name, path, body, _m, table in COUNTEREXAMPLES:
        want = _expected(table, variant)
        if screen(path, body, proposed_text, _R, _C) != want:
            bad.append(f"counterexample {name!r}: expected {want}")
    for name, body, want in v4.BODY_FIXTURES:
        got = screen("README.md", body, proposed_text)
        want5 = ("excluded", "secret-detector-match") if want is None else (("redacted", frozenset(want)) if want else ("admitted",))
        if got != want5:
            bad.append(f"version-4 body fixture {name!r}: expected {want5}")
    return bad


def check(root: pathlib.Path = ROOT) -> list[str]:
    findings: list[str] = []
    try:
        base, _mode = base_bytes(root)
        proposeds = {v: propose(base, v) for v in VARIANTS}
    except (ValueError, OSError) as exc:
        return [str(exc)]
    if len(set(proposeds.values())) != len(VARIANTS):
        findings.append("two variants produce the same bytes")
    for v, proposed in proposeds.items():
        path = root / patch_path(v)
        if not path.is_file() or path.read_text() != v3.unified(base, proposed):
            findings.append(f"{v}: patch differs from its regeneration over the version-4 bytes")
        else:
            try:
                if v2.v1.apply_patch(root, base, path.read_text()) != proposed:
                    findings.append(f"{v}: applying the patch does not yield the proposed bytes")
            except ValueError as exc:
                findings.append(f"{v}: {exc}")
        findings += [f"{v}: {f}" for f in semantic_findings(base, proposed, v)]
    # the baseline column of the counterexample table is the policy on disk's base (version 4)
    for name, path, body, _m, table in COUNTEREXAMPLES:
        if screen(path, body, base, _R, _C) != _expected(table, "v4"):
            findings.append(f"v4 baseline: counterexample {name!r}: expected {_expected(table, 'v4')}")
    if not (root / MANIFEST).is_file() or (root / MANIFEST).read_text() != manifest_text(proposeds):
        findings.append("manifest differs from its regeneration")
    present = sorted(p.name for p in (root / PKG / "proposed").glob("*")) if (root / PKG / "proposed").is_dir() else []
    if present != sorted(patch_path(v).name for v in VARIANTS):
        findings.append(f"proposed/ holds {present}, not exactly the four declared patches")
    for md in sorted((root / PKG).glob("*.md")):
        if re.search(r"(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])", md.read_text()):
            findings.append(f"{md.name}: carries a 64-hex token; the argument comes only from the manifest rows")
    return findings


def write(root: pathlib.Path = ROOT) -> None:
    base, _mode = base_bytes(root)
    proposeds = {v: propose(base, v) for v in VARIANTS}
    (root / PKG / "proposed").mkdir(parents=True, exist_ok=True)
    for v, proposed in proposeds.items():
        (root / patch_path(v)).write_text(v3.unified(base, proposed))
    (root / MANIFEST).write_text(manifest_text(proposeds))


def score(root: pathlib.Path = ROOT) -> str:
    base, _ = base_bytes(root)
    cols = [("v4", base)] + [(v, propose(base, v)) for v in ("t", "b", "bd", "bcd")]
    out = ["| Counterexample | " + " | ".join(c for c, _ in cols) + " |",
           "|---|" + "---|" * len(cols)]
    for name, path, body, marker, _t in COUNTEREXAMPLES:
        cells = []
        for _c, text in cols:
            o = screen(path, body, text, _R, _C)
            word = {"admitted": "admitted", "redacted": f"redacted {sorted(o[1])}" if o[0] == "redacted" else ""}.get(o[0]) or f"excluded ({o[1]})"
            cells.append(word + (" **reaches**" if reaches_packet(o, marker) else ""))
        out.append(f"| {name} | " + " | ".join(cells) + " |")
    return "\n".join(out) + "\n"


def self_corpus(root: pathlib.Path = ROOT) -> str:
    """Syzygy's own tracked text files at HEAD: how many each added detector matches, and how many of those no
    version-4 detector matches. Prints paths and counts only, never matched text."""
    base, _ = base_bytes(root)
    old = json.loads(base)["detectors"]
    new = SCOPE_DETECTORS
    names = subprocess.run(["git", "-C", str(root), "ls-files", "-z"], capture_output=True, check=True).stdout.split(b"\0")
    texts = 0
    hit = {d["id"]: [] for d in new}
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
        olds = any(re.search(d["pattern"], body, re.I if "i" in d.get("flags", "") else 0) if d["kind"] != "literal-fragment"
                   else any(v in body for v in d["values"]) for d in old)
        for d in new:
            if re.search(d["pattern"], body, re.I if "i" in d.get("flags", "") else 0):
                hit[d["id"]].append((raw.decode(), olds))
    head = subprocess.run(["git", "-C", str(root), "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    lines = [f"self-corpus at {head}: {texts} tracked UTF-8 text files (NUL-free) of {sum(1 for n in names if n)} tracked paths"]
    for d in new:
        files = hit[d["id"]]
        lines.append(f"{d['id']}: {len(files)} files match; {sum(1 for _p, o in files if not o)} of them match no version-4 detector")
        lines += [f"  {p}{'' if o else '  (new)'}" for p, o in files]
    return "\n".join(lines) + "\n"


# --- selftest ---------------------------------------------------------------------------------------------------

def _fixture(tmp: pathlib.Path) -> pathlib.Path:
    for rel in (POLICY, v4.MANIFEST, v3.MANIFEST):
        (tmp / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / rel, tmp / rel)
    if (ROOT / v4.PKG / "proposed").is_dir():
        shutil.copytree(ROOT / v4.PKG / "proposed", tmp / v4.PKG / "proposed", dirs_exist_ok=True)
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
        results.append(("the base is the version-4 variant-span row", mode == "prospective"))
        for v in VARIANTS:
            (tmp / POLICY).write_text(propose(base, v))
            results.append((f"after a variant-{v} act the package still verifies",
                            check(tmp) == [] and base_bytes(tmp)[1] == "performed-v5"))

    def unknown_disk(tmp):
        (tmp / POLICY).write_text((tmp / POLICY).read_text().replace('"schemaVersion": 1', '"schemaVersion": 2', 1))
    caught("a policy on disk that is neither base nor row refused", unknown_disk, "base is unknown")

    def edit_patch(tmp):
        p = tmp / patch_path("bcd")
        p.write_text(p.read_text().replace("PuTTY-User-Key-File", "PuTTY-Key-File", 1))
    caught("a hand-edited patch refused", edit_patch, "bcd: patch differs")

    def edit_manifest(tmp):
        p = tmp / MANIFEST
        p.write_text(p.read_text().replace("[variant: bd]", "[variant: db]"))
    caught("an edited manifest refused", edit_manifest, "manifest differs")

    def extra_patch(tmp):
        (tmp / PKG / "proposed" / "extra.patch").write_text("x\n")
    caught("an undeclared patch refused", extra_patch, "not exactly the four declared patches")

    def digest_in_md(tmp):
        (tmp / PKG / "SEMANTIC-DELTA.md").write_text("argument " + "a" * 64 + "\n")
    caught("a digest in a package Markdown file refused", digest_in_md, "64-hex")

    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        base, _ = base_bytes(tmp)

        def sem(name, variant, mutate, needle):
            doc = json.loads(propose(base, variant))
            mutate(doc)
            got = semantic_findings(base, v2.dump(doc), variant)
            results.append((name, any(needle in f for f in got)))

        def sc(d):
            return d[SCOPE_KEY]

        def red(d):
            return sc(d)["secretRedaction"]

        def sdet(d, i):
            return next(x for x in sc(d)["scopeDetectors"]["detectors"] if x["id"] == i)

        def cc(d):
            return sc(d)["contentClassification"]

        # outside the scope
        sem("a policy detector change caught", "t", lambda d: d["detectors"][0]["values"].pop(), "a key other than")
        sem("a scope detector moved into the base detectors caught", "bcd",
            lambda d: d["detectors"].append(copy.deepcopy(SCOPE_DETECTORS[0])), "a key other than")
        sem("a base-scope change caught", "b", lambda d: d["scope"].__setitem__("x", 1), "a key other than")
        sem("an unbumped version caught", "bd", lambda d: d.__setitem__("policyVersion", json.loads(base)["policyVersion"]),
            "policyVersion")
        # T
        sem("a dropped private-key-header caught (EC key in code admitted)", "t",
            lambda d: sc(d)["scopeDetectors"]["detectors"].pop(0), "counterexample 'src/key.c: EC key in code'")
        sem("a dropped private-key-header caught (PGP block in SECURITY.md admitted)", "b",
            lambda d: sdet(d, "private-key-header").__setitem__("pattern", r"(?:-{5}BEGIN (?:EC )?PRIVATE KEY)"),
            "counterexample 'SECURITY.md: PGP private key block'")
        sem("an http-only URL detector caught (postgres URL admitted)", "bcd",
            lambda d: sdet(d, "credential-url-any-scheme").__setitem__("pattern", r"https?://[^/@\s]*:[^/@\s]+@"),
            "counterexample 'README: postgres URL with a password'")
        sem("an empty-user URL form missed caught (redis://:p@)", "bd",
            lambda d: sdet(d, "credential-url-any-scheme").__setitem__("pattern", r"[a-z][a-z0-9+.-]{0,31}://[^/@\s]+:[^/@\s]+@"),
            "counterexample 'modules/MODULES.md: redis:// URL with a password'")
        sem("an unbounded scheme caught", "t",
            lambda d: sdet(d, "credential-url-any-scheme").__setitem__("pattern", r"[a-z][a-z0-9+.-]*://[^/@\s:]*:[^/@\s]+@"),
            "scopeDetectors is not exactly")
        sem("a dropped ASIA form caught", "bcd",
            lambda d: sdet(d, "known-token-formats-extended").__setitem__("pattern", KNOWN_TOKEN_FORMATS_EXTENDED.replace("ASIA[0-9A-Z]{16}|", "")),
            "counterexample 'README: ASIA key id beside a badge token'")
        sem("the URL detector made whole-artifact caught", "t",
            lambda d: red(d)["wholeArtifactDetectors"].append("credential-url-any-scheme"), "declared line-redactable")
        sem("the extended tokens made line-redactable caught", "b",
            lambda d: red(d)["wholeArtifactDetectors"].remove("known-token-formats-extended"), "wholeArtifactDetectors is not")
        sem("a scope detector id colliding with a policy detector caught", "t",
            lambda d: sdet(d, "private-key-header").__setitem__("id", "private-key-material"), "repeats a policy detector id")
        sem("an unqualified scope detectors sentence caught", "b",
            lambda d: sc(d).__setitem__("detectors", json.loads(base)[SCOPE_KEY]["detectors"]), "does not add scopeDetectors")
        sem("a guard-line change caught", "t", lambda d: red(d).__setitem__("guardLines", 2), "secretRedaction moved")
        # B
        sem("governance-text redacted by line caught", "b",
            lambda d: red(d)["redactedClasses"].append("governance-text"), "class other than project-documentation")
        sem("a nested governance path caught", "bd",
            lambda d: cc(d)["governanceTextPaths"].append(".github/security.md"), "governanceTextPaths is not")
        sem("AGENTS.md added as governance-text caught", "bcd",
            lambda d: cc(d)["governanceTextPaths"].append("agents.md"), "governanceTextPaths is not")
        sem("a stale indeterminate sentence caught", "b",
            lambda d: cc(d).__setitem__("indeterminate", json.loads(base)[SCOPE_KEY]["contentClassification"]["indeterminate"]),
            "indeterminate still names")
        sem("a legacy PGP secret-key header missed caught", "bd",
            lambda d: sdet(d, "private-key-header").__setitem__("pattern", PRIVATE_KEY_HEADER.replace("(?:PRIVATE|SECRET) KEY", "PRIVATE KEY")),
            "counterexample 'SECURITY.md: legacy PGP secret key block'")
        sem("an ambiguous userinfo pattern caught", "t",
            lambda d: sdet(d, "credential-url-any-scheme").__setitem__("pattern", r"[a-z][a-z0-9+.-]{0,31}://[^/@\s]*:[^/@\s]+@"),
            "scopeDetectors is not exactly")
        sem("governance-text classified in variant t caught", "t",
            lambda d: cc(d)["classesClassified"].insert(0, "governance-text"), "without B")
        sem("a class fixture flip caught (MANIFESTO dropped)", "b",
            lambda d: cc(d).__setitem__("governanceTextPaths", [p for p in GOVERNANCE_TEXT_PATHS if p != "manifesto"]),
            "class fixture 'MANIFESTO'")
        sem("a governance-text rule that drops the data-not-policy clause caught", "bd",
            lambda d: next(r for r in cc(d)["rules"] if r["class"] == "governance-text").__setitem__("rule", "x"),
            "governance-text rule is not exactly")
        # D
        sem("an unpinned placement caught", "bd",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0].__setitem__("commits", []), "full commit ids")
        sem("a placement at another commit caught (class fixture flips)", "bcd",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0].__setitem__("commits", [_OTHER_REDIS_COMMIT]),
            "class fixture 'TLS.md' at repository:redis-redis@498ecd0d")
        sem("a placement of AGENTS.md caught", "bd",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0]["paths"].append("AGENTS.md"), "ownerPlacements is not")
        sem("a placed path another rule matches caught", "bd",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0]["paths"].append("README.md"), "already matched by another rule")
        sem("an un-folded placement path caught", "bd",
            lambda d: doc_rule(sc(d))["ownerPlacements"][0].__setitem__("paths", ["TLS.md", "modules/modules.md"]),
            "is not folded")
        sem("a stale notMapped 'any other prose' caught", "bcd",
            lambda d: doc_rule(sc(d)).__setitem__("notMapped", doc_rule(sc(d))["notMapped"].replace(NOT_MAPPED_PROSE_NEW, NOT_MAPPED_PROSE_OLD)),
            "every other prose unmapped")
        sem("placements in variant b caught", "b",
            lambda d: doc_rule(sc(d)).__setitem__("ownerPlacements", copy.deepcopy(OWNER_PLACEMENTS)), "without D")
        sem("a stale 'names no repository' sentence caught", "bd",
            lambda d: sc(d).__setitem__("observedRepositories", json.loads(base)[SCOPE_KEY]["observedRepositories"]),
            "still says the policy names no repository")
        # C
        sem("the documentation exemption reaching governance-text caught", "bcd",
            lambda d: sc(d)["activeContent"]["projectDocumentationExemption"].__setitem__("appliesTo", "a body this scope classifies project-documentation or governance-text"),
            "reaches governance-text")
        sem("an exemption unbound from the render condition caught", "bcd",
            lambda d: sc(d)["activeContent"]["projectDocumentationExemption"].__setitem__("renderCondition", "none"),
            "renderCondition")
        sem("the exemption in variant bd caught", "bd",
            lambda d: sc(d)["activeContent"].__setitem__("projectDocumentationExemption", copy.deepcopy(DOC_EXEMPTION)),
            "without C")
        sem("a stale codeContentExemption sentence caught", "bcd",
            lambda d: sc(d)["activeContent"]["codeContentExemption"].__setitem__(
                "rule", json.loads(base)[SCOPE_KEY]["activeContent"]["codeContentExemption"]["rule"]),
            "not exactly the declared version-5 scope")
        sem("a stale secretRedaction.unchanged caught", "bcd",
            lambda d: red(d).__setitem__("unchanged", json.loads(base)[SCOPE_KEY]["secretRedaction"]["unchanged"]),
            "secretRedaction moved")

    # oracle mutants: the switches the counterexamples rest on
    with tempfile.TemporaryDirectory() as t:
        tmp = _fixture(pathlib.Path(t))
        base, _ = base_bytes(tmp)
        global _NO_SCOPE_DETECTORS, _NO_DOC_EXEMPTION
        _NO_SCOPE_DETECTORS = True
        try:
            ec = next(c for c in COUNTEREXAMPLES if c[0] == "SECURITY.md: EC private key and nothing else")
            got = screen(ec[1], ec[2], propose(base, "b"), _R, _C)
        finally:
            _NO_SCOPE_DETECTORS = False
        results.append(("without the tightenings an EC-key SECURITY.md is admitted under B (mutant observed)",
                        got == ("admitted",)))
        _NO_DOC_EXEMPTION = True
        try:
            hc = next(c for c in COUNTEREXAMPLES if c[0] == "README: hidden HTML comment with instructions")
            got = screen(hc[1], hc[2], propose(base, "bcd"), _R, _C)
        finally:
            _NO_DOC_EXEMPTION = False
        results.append(("without the exemption the hidden comment is excluded (mutant observed)",
                        got == ("excluded", "active-content")))
        try:
            has_active_content("a `b` c")
            results.append(("the active-content oracle refuses a body with a code context", False))
        except ValueError:
            results.append(("the active-content oracle refuses a body with a code context", True))
        results.append(("the class oracle refuses a path two rules match",
                        content_class("security.md", v2.dump(_two_rules(propose(base, "bcd")))) is None))

    failed = [n for n, ok in results if not ok]
    for name, ok in results:
        print(("ok   " if ok else "FAIL ") + name)
    print(f"selftest: {len(results) - len(failed)} of {len(results)} predicates held")
    return 1 if failed else 0


def _two_rules(text: str) -> dict:
    d = json.loads(text)
    doc_rule(d[SCOPE_KEY])["rootStems"].append("security")
    return d


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
        print(f"wrote the four patches and {MANIFEST.name}")
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
        print("public-source-screening-scope-v5: patches and manifest current")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
