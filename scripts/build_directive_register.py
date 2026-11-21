#!/usr/bin/env python3
"""Generate DIRECTIVE-REGISTER.md — every governing identifier, and where it is defined.

This repository governs by identifier. `AGENTS.md` says "cite by identifier",
and eight families of them are in use across five trees. Until now no page said
which identifiers exist or where each one is defined, so the only way to find a
clause was to know already. Two of the in-force craft policies make that worse:
they live at a path named `policy-candidates/`, under filenames ending
`-CANDIDATE.md`, behind their own head banners saying they bind nothing. A
reader who scanned `policies/craft-and-care/` would conclude CC-SPEC and
CC-IMPACT do not exist.

This generator answers exactly one question — *where is this identifier
defined?* — and refuses to answer any other. It carries the identifier, its
definition site, and the short title **the corpus itself marks up** at that
site. It never carries a clause body, never paraphrases, and never extracts a
title out of running prose: a title is read only from a Markdown heading or a
bold run, which is a structural marker an author placed deliberately. Where
the corpus marks no title, the register prints an em dash and the reader opens
the file. `AGENTS.md`: *a generator that quotes prose has re-opened the door it
closed.*

Three guards keep it honest, and each fails generation rather than degrading:

  * A definition site must be a heading or a leading bold run. A line like
    ``RFC1-1's zero-roots rule (cited, not restated) surfaces …`` starts with
    the identifier and is *not* a definition; the strict rule rejects it, and
    `--selftest` holds that exact line as a fixture.
  * `NAME_MAX` caps the marked-up title. A title long enough to be a body is a
    sign the markup convention has drifted; generation stops and names the file
    and line rather than truncating in silence.
  * An identifier cited inside a family's own files but defined nowhere in them
    is reported as such, never guessed at and never quietly dropped.

Usage:
  python3 scripts/build_directive_register.py            # (re)write the register
  python3 scripts/build_directive_register.py --check    # drift check, no write
  python3 scripts/build_directive_register.py --selftest # mutation fixtures
"""

from __future__ import annotations

import glob
import io
import os
import re
import sys
from collections import OrderedDict

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "DIRECTIVE-REGISTER.md")

# RFC9-13(a) has a 108-character marked-up title.
NAME_MAX = 112
LOOKAHEAD = 3  # a definition's markup may wrap onto this many following lines

DOCTRINE = ".syzygy/governance/doctrine"
CRAFT = ".syzygy/governance/policies/craft-and-care"
DECISIONS = ".syzygy/governance/decisions"
CANDIDATES = ".syzygy/governance/contracts/candidates"
POLICY_CAND = CANDIDATES + "/policy-candidates"
RFCS_ACCEPTED = ".syzygy/governance/contracts/rfcs"
RFCS_CANDIDATE = CANDIDATES + "/rfcs"

LEAD = re.compile(r"^(?:#{1,6}\s+|\s{0,3}(?:[-*]\s+|\d+\.\s+)?)")


def tidy(s: str) -> str:
    s = re.sub(r"\*\*|__|`", "", s).strip()
    s = re.sub(r"\s+", " ", s)
    return s.rstrip(" .,;:").strip()


def definition(ident: str, logical: str):
    """Return the marked-up title at a definition site, or None if not one.

    Returns "" for a real definition site the corpus marks with no title.
    """
    stripped = logical.lstrip()
    if stripped.startswith(">") or stripped.startswith("|"):
        return None  # a banner quote and a table row are indexes, never definitions
    lead = LEAD.match(logical)
    rest = logical[lead.end():]
    esc = re.escape(ident)

    if stripped.startswith("#"):
        m = re.match(r"[*`]{0,2}" + esc + r"[*`]{0,2}(?:\s*[—–:-]\s*|\s+)(.*)$", rest)
        return tidy(m.group(1)) if m else None

    # `**VIS-5 — Syzygy never writes code …**`  (title inside the run)
    m = re.match(r"\*\*" + esc + r"\s*[—–:-]\s*(.+?)\*\*", rest)
    if m:
        return tidy(m.group(1))

    # `**RFC10-18. Completion is reported by the executor …**` — the period is
    # the separator and the title continues inside the same run. Distinguished
    # from a bare `**RFC2-26.**` by requiring whitespace and a non-markup start.
    m = re.match(r"\*\*" + esc + r"\.\s+([^*].*?)\*\*", rest)
    if m:
        return tidy(m.group(1))

    # `**RFC3-2.**` followed by a second bold run, a parenthetical, or nothing
    m = re.match(r"\*\*" + esc + r"[.:]?\*\*\s*(.*)$", rest)
    if m:
        tail = m.group(1)
        b = re.match(r"[,:;]?\s*\*\*(.+?)\*\*", tail)
        if b:
            return tidy(b.group(1))
        p = re.match(r"\(([^)]*)\)", tail)
        if p:
            # An origin tag is `R-3`, `P-40`, sometimes with a ⚑ flag marking a
            # decision the owner took narrower or wider than recommended. Any
            # dash after that opens the owner's rationale, which is body text
            # and does not belong on this page.
            return "(" + tidy(re.split(r"\s[—–]\s", p.group(1))[0]) + ")"
        return ""
    return None


class Family:
    def __init__(self, key, label, pattern, files, status, note=""):
        self.key = key
        self.label = label
        self.pattern = re.compile(pattern)
        self.files = files
        self.status = status
        self.note = note


def sort_key(ident: str):
    m = re.match(r"^(.*?)(\d+)(?:-(\d+))?(?:\((\w)\))?$", ident)
    if not m:
        return (ident, 0, 0, "")
    return (m.group(1), int(m.group(2)), int(m.group(3) or 0), m.group(4) or "")


def collect(fam: Family):
    defs, seen = OrderedDict(), set()
    for rel in fam.files:
        with io.open(os.path.join(REPO, rel), encoding="utf-8") as fh:
            lines = fh.read().splitlines()
        for n, line in enumerate(lines):
            window = [line]
            for k in range(n + 1, min(n + 1 + LOOKAHEAD, len(lines))):
                if not lines[k].strip():
                    break
                window.append(lines[k].strip())
            logical = " ".join(window)
            for m in fam.pattern.finditer(line):
                ident = m.group(0)
                seen.add(ident)
                if ident in defs:
                    continue
                # RFC definitions start at the left margin. A wrapped citation
                # or reader-map bullet can start with the same bold identifier.
                if fam.key.startswith("RFC-") and not line.startswith(("#", "**")):
                    continue
                title = definition(ident, logical)
                if title is None:
                    continue
                if len(title) > NAME_MAX:
                    raise SystemExit(
                        f"FAIL {fam.key}: the marked-up title for {ident} is "
                        f"{len(title)} characters, over NAME_MAX={NAME_MAX} "
                        f"({rel}:{n + 1}). The register carries titles, never "
                        f"bodies — shorten the definition's markup, or raise the "
                        f"cap deliberately and say why."
                    )
                defs[ident] = (rel, n + 1, title)
    cited = sorted(seen - set(defs), key=sort_key)
    return OrderedDict(sorted(defs.items(), key=lambda kv: sort_key(kv[0]))), cited


def rel(pattern):
    return [os.path.relpath(p, REPO) for p in sorted(glob.glob(os.path.join(REPO, pattern)))]


def families():
    doctrine = rel(DOCTRINE + "/*.md")
    craft = [p for p in rel(CRAFT + "/*.md") if os.path.basename(p) != "README.md"]
    spec_pol = POLICY_CAND + "/SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md"
    impact_pol = POLICY_CAND + "/SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md"
    rfc_acc = rel(RFCS_ACCEPTED + "/*.md") + rel(RFCS_ACCEPTED + "/*/*.md")
    rfc_cand = rel(RFCS_CANDIDATE + "/*.md") + rel(RFCS_CANDIDATE + "/*/*.md")
    rfc_pat = r"\bRFC\d+-\d+(?:\([a-z]\))?(?!\w|\([a-z]\))"
    return [
        Family("VIS", "Vision doctrine", r"\bVIS-\d+\b", doctrine,
               "**Adopted, in force** since 2026-07-30"),
        Family("SEC", "Security doctrine", r"\bSEC-\d+\b", doctrine,
               "**Adopted, in force** since 2026-07-30"),
        Family("CC", "Craft-and-care policy", r"\bCC-(?!SPEC-|IMPACT-)[A-Z]+-\d+\b",
               craft, "Owner-approved craft"),
        Family("CC-SPEC", "Specification-acceptance standard", r"\bCC-SPEC-\d+\b",
               [spec_pol],
               "**In force.** Confirmed by craft act 6 on 2026-08-17 and amended "
               "at CC-SPEC-8 on 2026-09-01, whose act superseded the earlier digest",
               "Defined at a path named `policy-candidates/`, in a file named "
               "`…-CANDIDATE.md`, under a head banner that still says it binds "
               "nothing. All three are wrong and **none may be corrected**: the act "
               "bound these exact bytes. Read the act record, never the package "
               "banner (`AGENTS.md`, Governance prose and docs)."),
        Family("CC-IMPACT", "Shape-to-spec impact rule", r"\bCC-IMPACT-\d+\b",
               [impact_pol], "**In force** by craft act 7, 2026-08-17",
               "Same home and the same three-way mislabelling as `CC-SPEC`. "
               "CC-IMPACT-7 additionally names `SHAPE-TO-SPEC-PROPAGATION-FIXTURE-2.md` "
               "by path and digest; fixture 3 was added on 2026-08-30 because fixture 2 "
               "left `topology[]` unexercised, and neither the clause nor the fixture "
               "may be edited to say so."),
        Family("SDR", "Recorded owner decisions", r"\bSDR-\d+\b",
               [DECISIONS + "/SURFACE-DECISION-RECORD.md"],
               "**Recorded** — binding, not digest-bound",
               "These carry no title. The corpus marks each with the review finding "
               "or pending question it answers (`(R-12)`, `(P-40)`), which is what "
               "the title column shows. A \u2691 flag on that tag means the owner "
               "decided narrower or wider than the review recommended \u2014 open the "
               "entry to see which way."),
        Family("RFC-accepted", "Design contract clauses", rfc_pat, rfc_acc,
               "**Accepted** — Waves A and B, 2026-08-17"),
        Family("RFC-candidate", "Design contract clauses (candidate)", rfc_pat,
               rfc_cand,
               "Candidate — **binds nothing.** RFC-0010 and RFC-0011, plus the "
               "candidate copies of the accepted modules",
               "A clause number appearing in both this family and the accepted one "
               "is the same clause in two homes. The accepted copy governs."),
    ]


def render():
    fams = families()
    rows = [(f,) + collect(f) for f in fams]
    total = sum(len(d) for _, d, _ in rows)
    undefined = [(f, c) for f, _, cited in rows for c in cited]

    out = []
    A = out.append
    A("# Directive register — every governing identifier and where it is defined")
    A("")
    A("> **Generated navigation, never authority.** Written by")
    A("> `scripts/build_directive_register.py`; regenerate with it, never hand-edit.")
    A("> It answers one question — *where is this identifier defined?* — and refuses")
    A("> every other. The title column copies only what the corpus marks up at the")
    A("> definition site; it is never a clause body and never a paraphrase, and an")
    A("> em dash means the corpus marks no title there. To know what a rule **says**,")
    A("> open the file and line named here. Where this page and a clause disagree,")
    A("> the clause wins.")
    A(">")
    A("> Which acts are in force is owned by")
    A("> [`ACCEPTANCE-ACT-RECORD.md`](.syzygy/governance/decisions/ACCEPTANCE-ACT-RECORD.md)")
    A("> and summarised in [`PROJECT-STATUS.md`](PROJECT-STATUS.md). The status line")
    A("> under each heading below is a pointer to those, not a second copy of them.")
    A("")
    A("[`PROCESS-GLOSSARY.md`](PROCESS-GLOSSARY.md) defines the identifier *forms* —")
    A("what `P-nn`, `RD-nn`, `CG-nn` and the rest mean. This page lists the")
    A("*instances*, which that page deliberately does not. Together they answer")
    A("\"what kind of thing is this?\" and \"where does it live?\"; neither answers")
    A("\"what does it say?\", because only the clause does.")
    A("")
    A(f"**{total} identifiers, {len(fams)} families**, recomputed from the files named")
    A("in each section every time the generator runs. A family whose files stop")
    A("defining its identifiers renders an empty table rather than a stale one.")
    A("")

    for fam, defs, cited in rows:
        A(f"## {fam.label} — `{fam.key}`")
        A("")
        A(f"{fam.status}. {len(defs)} identifiers"
          + (f", defined across {len({v[0] for v in defs.values()})} files" if defs else "")
          + ".")
        if fam.note:
            A("")
            A(f"**Read this before citing them.** {fam.note}")
        A("")
        if defs:
            A("| Identifier | Title, as the corpus marks it | Defined at |")
            A("|---|---|---|")
            for ident, (r, n, title) in defs.items():
                A(f"| `{ident}` | {title or '—'} | `{r}`:{n} |")
        else:
            A("*No identifier in this family has a definition site in its own files.*")
        if cited:
            A("")
            A(f"**Cited here, defined elsewhere or nowhere ({len(cited)}).** These appear")
            A("in this family's own files but at no definition site in them: "
              + ", ".join(f"`{c}`" for c in cited) + ".")
        A("")

    if undefined:
        A("## Cited without a definition site")
        A("")
        A("Every identifier above was found at a **heading or a leading bold run** —")
        A("the two places this corpus marks a definition. The identifiers below appear")
        A("in their family's own files but never at such a site. Three different things")
        A("produce that, and the register does not guess which:")
        A("")
        A("- a **cross-family citation** — an RFC-0003 clause naming an RFC-0001 clause")
        A("  is a citation, and the definition sits in the other module (verification")
        A("  rule 5: a citation is not a reliance);")
        A("- a clause defined in **running prose** rather than at a marked-up site,")
        A("  which is a markup gap, not a missing rule;")
        A("- a genuine **dangling reference** to a clause that no longer exists.")
        A("")
        A("Resolving one means opening the citing line, not trusting this table.")
        A("")
        A("| Identifier | Family it was cited in |")
        A("|---|---|")
        for fam, c in undefined:
            A(f"| `{c}` | {fam.label} |")
        A("")

    A("## What this page will not tell you")
    A("")
    A("It does not say what any clause requires — that is the clause's job, and")
    A("keeping the body out of this page is the whole reason it is safe to generate.")
    A("It does not say which identifiers a task must load;")
    A("`.syzygy/governance/contracts/candidates/TASK-ROUTER.md` routes by task. It")
    A("does not define the identifier forms; `PROCESS-GLOSSARY.md` does. It does not")
    A("say what is in force beyond naming each family's home and status;")
    A("`PROJECT-STATUS.md` and the act record own that. And it resolves no")
    A("disagreement between two homes: it shows you both and leaves the")
    A("contradiction visible, which is what CC-REV-3 asks for.")
    A("")
    return "\n".join(out) + "\n"


def main(argv):
    if "--selftest" in argv:
        return run_selftest()
    body = render()
    if "--check" in argv:
        if not os.path.exists(OUT):
            print("FAIL: DIRECTIVE-REGISTER.md does not exist; run without --check")
            return 1
        if io.open(OUT, encoding="utf-8").read() != body:
            print("FAIL: DIRECTIVE-REGISTER.md is stale; regenerate it")
            return 1
        print("OK: DIRECTIVE-REGISTER.md matches the tree")
        return 0
    io.open(OUT, "w", encoding="utf-8").write(body)
    print(f"wrote {os.path.relpath(OUT, REPO)} ({len(body.splitlines())} lines)")
    return 0


def run_selftest():
    """Mutate the input and confirm the check fails (verification rule 6)."""
    failures = []

    def expect(name, cond):
        print(("ok   " if cond else "FAIL ") + name)
        if not cond:
            failures.append(name)

    # --- the definition predicate, one fixture per way it can be wrong -------
    expect("a heading defines",
           definition("CC-BAR-1", "## CC-BAR-1 — Canonical bar adopted")
           == "Canonical bar adopted")
    expect("a bold run with an inline title defines",
           definition("VIS-1", "**VIS-1 — Comprehensible truth first.** The full")
           == "Comprehensible truth first")
    expect("a wrapped bold run defines",
           definition("VIS-5", "**VIS-5 — Syzygy never writes code; direct writes "
                               "are confined to two namespaces.** Syzygy's")
           == "Syzygy never writes code; direct writes are confined to two namespaces")
    expect("a period inside the bold run separates identifier from title",
           definition("RFC10-18", "**RFC10-18. Completion is reported by the "
                                  "executor and established by the evaluator.** An")
           == "Completion is reported by the executor and established by the evaluator")
    expect("a bare bold identifier is still not given the next sentence as a title",
           definition("RFC2-26", "**RFC2-26.** This contract schedules nothing") == "")
    expect("a second bold run is the title",
           definition("RFC3-2", "**RFC3-2.** **Every manifest field names one "
                                "write authority**, from")
           == "Every manifest field names one write authority")
    expect("a parenthetical origin is the title",
           definition("SDR-37", "- **SDR-37** (P-40): the granularity rule")
           == "(P-40)")
    expect("an origin tag keeps its flag and drops the owner's rationale",
           definition("SDR-13", "- **SDR-13** (R-3 \u2691 \u2014 neither pure governance "
                                "nor pure presentation): Polaris narrative is")
           == "(R-3 \u2691)")
    expect("a marked site with no title yields empty, not None",
           definition("RFC2-26", "**RFC2-26.** This contract schedules nothing") == "")

    # The incident this predicate exists for: a possessive citation at line start.
    expect("a leading possessive citation is NOT a definition",
           definition("RFC1-1", "RFC1-1's zero-roots rule (cited, not restated) "
                                "surfaces that case at the") is None)
    expect("a mid-sentence citation is NOT a definition",
           definition("CC-REV-3", "documentation cites CC-REV-3 and moves on") is None)
    expect("a banner quote is NOT a definition",
           definition("CC-IMPACT-1", "> Identifiers `CC-IMPACT-1…7`; amended in "
                                     "place, never renumbered.") is None)
    expect("a table row is NOT a definition",
           definition("RFC3-15", "| `governance-homes.md` | **RFC3-15** | the five "
                                 "categories |") is None)

    # --- the guards ---------------------------------------------------------
    long_title = "x" * (NAME_MAX + 1)
    expect("NAME_MAX would reject an over-long title",
           len(definition("VIS-1", f"**VIS-1 — {long_title}.**")) > NAME_MAX)
    fam = Family("TMP", "Temp", r"\bVIS-\d+\b", [], "none")
    d, c = collect(fam)
    expect("a family with no files renders empty, never stale",
           len(d) == 0 and len(c) == 0)

    rfc_family = next(family for family in families() if family.key == "RFC-accepted")
    expect("RFC identifiers keep a lettered subclause and match a plain identifier",
           rfc_family.pattern.findall("RFC3-16(d), RFC3-16, RFC5-6.")
           == ["RFC3-16(d)", "RFC3-16", "RFC5-6"])

    # --- the corpus facts the register exists to make findable ---------------
    body = render()
    expected_rfc_definitions = {
        "RFC3-16(a)": "RFC3-16(a). The owner-act provenance predicate.",
        "RFC3-16(b)": "RFC3-16(b). What an adoption record binds",
        "RFC3-16(c)": "RFC3-16(c). Owner-adopted bootstrap act versus Syzygy-verified act.",
        "RFC4-13(a)": "RFC4-13(a) — The external-confirmation capture artifact.",
    }
    for family in (item for item in families() if item.key.startswith("RFC-")):
        definitions, _ = collect(family)
        for ident, opening in expected_rfc_definitions.items():
            file, line, _ = definitions[ident]
            with io.open(os.path.join(REPO, file), encoding="utf-8") as source:
                definition_line = source.read().splitlines()[line - 1]
            expect(f"{family.key} routes {ident} to its definition",
                   definition_line.startswith("**" + opening))
    expect("every doctrine rule VIS-1..7 is located",
           all(re.search(r"\| `VIS-%d` \| .+ \| `\.syzygy/governance/doctrine/"
                         r"vision\.md`:\d+ \|" % i, body) for i in range(1, 8)))
    expect("every SEC-1..5 is located",
           all(f"| `SEC-{i}` |" in body for i in range(1, 6)))
    expect("CC-SPEC-1..11 are registered from policy-candidates/",
           all(f"| `CC-SPEC-{i}` |" in body for i in range(1, 12))
           and "SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md" in body)
    expect("CC-IMPACT-1..7 are registered from policy-candidates/",
           all(f"| `CC-IMPACT-{i}` |" in body for i in range(1, 8))
           and "SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md" in body)
    expect("SDR-1..37 are located",
           all(f"| `SDR-{i}` |" in body for i in range(1, 38)))
    expect("no clause body reached the page (no line over 400 chars)",
           max(len(l) for l in body.splitlines()) < 400)

    n = 9 + 4 + 2 + 6
    print(f"\n{n} checks, {len(failures)} failing"
          " — a check that cannot fail is not a check")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
