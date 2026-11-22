#!/usr/bin/env python3
"""Generate every Capability 1 view from CAPABILITY-1-CHARTER.yaml.

Owner charter §10: the Capability 1 route and the first-specification
sequence must not be independently maintained enumerations. One
machine-readable candidate planning charter is the source; five views are
generated from it and none is hand-edited:

    1. the Capability 1 task-router route      (build_task_router.py imports
                                                `route_payload()` from here)
    2. the first-specification sequence's behaviour rows
    3. the E3 trace-table skeleton
    4. the initial clause-coverage population
    5. the blocking-decision list

Views 2-5 are written to CAPABILITY-1-GENERATED-VIEWS.md, and view 2 is
also injected into FIRST-OPENSPEC-SEQUENCE.md between marker comments.

    build_capability_1_views.py            regenerate
    build_capability_1_views.py --check    fail on drift, write nothing
    build_capability_1_views.py --selftest mutation fixtures

WHY NO AUTHORITY HOME IS WRITTEN IN THE CHARTER. The charter names clause
IDs; every module path is *resolved* from the generated contract index. A
hand-written path is a fact with two homes (CC-REV-3) and the one place a
"wrong authority home" defect can hide, so the charter is not permitted to
carry one. `--selftest` mutates the index and confirms the resolution
notices.

Read-only except when regenerating. No network. Standard library only —
the repository does not vendor PyYAML, and the charter is written in the
same restricted subset the rest of the corpus's YAML uses (flow lists,
one level of block sequence), parsed strictly by `parse_charter`.
"""

import hashlib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CANDIDATES = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(os.path.dirname(
    os.path.dirname(CANDIDATES))))

CHARTER = os.path.join(CANDIDATES, "CAPABILITY-1-CHARTER.yaml")
INDEX = os.path.join(CANDIDATES, "05-CONTRACT-INDEX.yaml")
WAVES = os.path.join(CANDIDATES, "wave-manifests")
SEQUENCE = os.path.join(CANDIDATES, "FIRST-OPENSPEC-SEQUENCE.md")
VIEWS = os.path.join(CANDIDATES, "CAPABILITY-1-GENERATED-VIEWS.md")
QUEUE = os.path.join(REPO, ".syzygy/governance/decisions/PENDING-OWNER-DECISIONS.md")

BEGIN = "<!-- BEGIN GENERATED: capability-1 behaviour rows -->"
END = "<!-- END GENERATED: capability-1 behaviour rows -->"


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


# --------------------------------------------------------------- the parser

class CharterError(Exception):
    pass


_SCALAR = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$')
_ITEM = re.compile(r'^\s*-\s+(.*)$')


def _value(raw, where):
    """One scalar or one flow list. Nothing else is admitted."""
    raw = raw.strip()
    if raw.startswith("["):
        if not raw.endswith("]"):
            raise CharterError(f"{where}: flow list is not closed on one line")
        inner = raw[1:-1].strip()
        if not inner:
            return []
        return [_scalar(p.strip(), where) for p in _split_flow(inner)]
    return _scalar(raw, where)


def _split_flow(inner):
    """Split a flow list on commas that are not inside double quotes."""
    parts, buf, quoted = [], [], False
    for ch in inner:
        if ch == '"':
            quoted = not quoted
        if ch == "," and not quoted:
            parts.append("".join(buf))
            buf = []
        else:
            buf.append(ch)
    parts.append("".join(buf))
    return parts


def _scalar(raw, where):
    raw = raw.strip()
    if raw.startswith('"'):
        if not raw.endswith('"') or len(raw) < 2:
            raise CharterError(f"{where}: unterminated quoted scalar")
        return raw[1:-1]
    if "#" in raw:
        raise CharterError(f"{where}: '#' in an unquoted scalar is ambiguous")
    return raw


def parse_charter(text):
    """The restricted subset: top-level `key: scalar|flow-list`, and
    `key:` followed by a block sequence of one-level mappings.

    Deliberately strict. A charter this parser rejects is a charter nobody
    should generate from — a tolerant reader here would silently drop a
    behaviour row, which is the one failure the whole workstream exists to
    make impossible."""
    data, lines = {}, text.split("\n")
    i, n = 0, len(lines)
    while i < n:
        line, i = lines[i], i + 1
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line[0] in " \t-":
            raise CharterError(f"line {i}: unexpected indentation at top level")
        m = _SCALAR.match(line)
        if not m:
            raise CharterError(f"line {i}: not a top-level key")
        key, rest = m.group(1), m.group(2)
        if rest.strip():
            data[key] = _value(rest, f"line {i}")
            continue
        seq, i = _block_sequence(lines, i)
        data[key] = seq
    return data


def _block_sequence(lines, i):
    """A block sequence, whose entries are either plain scalars (`- "x"`) or
    one-level mappings (`- k: v` then indented `k: v`). The two shapes may
    not be mixed within one sequence — a mixed sequence is almost always a
    mis-indentation, and reading it charitably is how a behaviour row goes
    missing."""
    out, n, kind = [], len(lines), None
    while i < n:
        line = lines[i]
        if not line.strip() or line.lstrip().startswith("#"):
            i += 1
            continue
        if not line.startswith(" "):
            break
        m = _ITEM.match(line)
        if m:
            item = m.group(1).strip()
            first = _SCALAR.match(item)
            this = "mapping" if first else "scalar"
            if kind is None:
                kind = this
            elif kind != this:
                raise CharterError(
                    f"line {i+1}: a {this} entry in a {kind} sequence")
            if first:
                entry = {first.group(1): _value(first.group(2), f"line {i+1}")}
                out.append(entry)
            else:
                out.append(_scalar(item, f"line {i+1}"))
            i += 1
            continue
        if not out:
            raise CharterError(f"line {i+1}: mapping key before any sequence item")
        if kind != "mapping":
            raise CharterError(f"line {i+1}: continuation key in a scalar sequence")
        km = _SCALAR.match(line.strip())
        if not km:
            raise CharterError(f"line {i+1}: not a mapping key")
        out[-1][km.group(1)] = _value(km.group(2), f"line {i+1}")
        i += 1
    return out, i


# ------------------------------------------------------------- the sources

def clause_homes(index_text):
    """clause id -> module filename, from the generated contract index."""
    homes = {}
    for m in re.finditer(r"\{id:\s*([^,}]+),\s*module:\s*([^,}]+),", index_text):
        homes[m.group(1).strip()] = m.group(2).strip()
    return homes


def wave_modules(wave):
    path = os.path.join(WAVES, f"WAVE-{wave}-MANIFEST.txt")
    out = set()
    for line in read(path).split("\n"):
        if line.startswith("#") or not line.strip():
            continue
        parts = line.split()
        if len(parts) == 2:
            out.add(parts[1])
    return out


def open_decisions(queue_text):
    """The identifiers a route may name as blocking.

    **Deliberately the same predicate as `build_task_router.py`'s
    `queue_disposable_ids`**, because two readers of one queue applying two
    rules is the drift this workstream exists to remove. Two populations
    qualify: rows in the open table, and the unperformed acceptance acts —
    P-41 and P-42 are themselves craft acts, so excluding acts would be
    inconsistent. Everything under a `Resolved…` heading is disqualified,
    and so is any row carrying `**Executed.**`: RD-53 proved a whole-file
    anchor accepted four executed rows and rendered them under the words
    "each verified open"."""
    if "## Open, and only the owner can dispose" not in queue_text:
        raise CharterError("the pending-decisions queue has no open section")
    ids = set()
    for chunk in re.split(r"^## ", queue_text, flags=re.M)[1:]:
        if chunk.split("\n", 1)[0].startswith("Resolved"):
            continue
        for line in chunk.split("\n"):
            m = re.match(r"\|\s*(P-\d+(?:\([a-z]\))?)\s*\|", line)
            # The marker disqualifies a row only where it is a
            # *disposition* — leading the row's final cell — not wherever the
            # string appears. P-43's row asks whether "an `**Executed.**`
            # marker" should be the convention, and a substring test read
            # that question as its own answer and dropped an open row from
            # the population. Found 2026-08-13 by recounting the queue two
            # ways and reconciling the difference.
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if m and not (cells and cells[-1].startswith("**Executed.**")):
                ids.add(m.group(1))
    return ids


# ------------------------------------------------------------ the checking

def resolve(charter, homes, ab, deferred, open_rows):
    """Resolve every clause to its module and run the charter's self_checks.

    Returns (rows, errors). `rows` carries the resolved home per clause, so
    no consumer ever writes a path of its own."""
    errors = []
    rows, seen_clause = [], {}

    for row in charter.get("behavior_rows", []):
        rid = row.get("id", "?")
        resolved = []
        for cid in row.get("governing_clauses", []):
            home = homes.get(cid)
            if home is None:
                errors.append(
                    f"row {rid}: clause {cid} resolves to no module in the "
                    f"contract index — it is not a defined clause")
                continue
            rel = f"rfcs/{home}"
            if rel not in ab:
                where = [w for w, mods in deferred.items() if rel in mods]
                errors.append(
                    f"row {rid}: clause {cid} is homed in {rel}, which "
                    + (f"belongs to deferred wave {where[0]}"
                       if where else "no Wave A or Wave B manifest names")
                    + " — Capability 1 may not depend on it")
                continue
            if cid in seen_clause:
                errors.append(
                    f"clause {cid} appears in rows {seen_clause[cid]} and "
                    f"{rid}; a clause has one behaviour home")
            seen_clause[cid] = rid
            resolved.append((cid, rel))
        for pid in row.get("owner_decisions", []):
            if pid not in open_rows:
                errors.append(
                    f"row {rid}: decision {pid} is not an open row of the "
                    f"queue — it is resolved, executed, or does not exist")
        rows.append(dict(id=rid, statement=row.get("statement", ""),
                         clauses=resolved,
                         doctrine=row.get("doctrine", []),
                         decisions=row.get("owner_decisions", []),
                         policies=row.get("policy_requirements", []),
                         topology=row.get("topology", [])))

    blocking = charter.get("blocking_decisions", [])
    downstream = charter.get("downstream_decisions", [])
    for pid in blocking:
        if pid not in open_rows:
            errors.append(f"blocking decision {pid} is not an open queue row")
    for pid in downstream:
        if pid not in open_rows:
            errors.append(f"downstream decision {pid} is not an open queue row")
    both = sorted(set(blocking) & set(downstream))
    if both:
        errors.append("named as both blocking and later-gate: " + ", ".join(both))

    return rows, errors


def all_decisions(charter, rows):
    """Blocking set = the charter's own list plus every row's decisions,
    ordered as the charter orders them. Generated, never re-typed."""
    out = list(charter.get("blocking_decisions", []))
    for row in rows:
        for pid in row["decisions"]:
            if pid not in out:
                out.append(pid)
    return out


# ------------------------------------------------------------ the rendering

def render_rows(rows):
    """View 2 — the behaviour-row table injected into the sequence."""
    out = ["| Row | Behaviour | Governing clauses | Doctrine | Owner decisions |",
           "|---|---|---|---|---|"]
    for r in rows:
        cl = ", ".join(f"`{c}`" for c, _ in r["clauses"]) or "—"
        dc = ", ".join(f"`{d}`" for d in r["doctrine"]) or "— *(none directly; the clause governs)*"
        dp = ", ".join(f"`{p}`" for p in r["decisions"]) or "—"
        out.append(f"| {r['id']} | {r['statement']} | {cl} | {dc} | {dp} |")
    return "\n".join(out)


def render_views(charter, rows, decisions, digest):
    n_clauses = sum(len(r["clauses"]) for r in rows)
    modules = sorted({m for r in rows for _, m in r["clauses"]})

    lines = []
    a = lines.append
    a("# Capability 1 — generated views")
    a("")
    a("> **Generated. Never hand-edited.** Every table below is derived from")
    a("> `CAPABILITY-1-CHARTER.yaml` by")
    a("> `scripts/build_capability_1_views.py`. Edit the charter and")
    a("> regenerate; an edit here is overwritten and `--check` fails first.")
    a(">")
    a("> **Candidate planning metadata, not authority.** Every clause named")
    a("> here belongs to a confirmed-but-unaccepted wave and binds nothing.")
    a("> No further capability spec may be authored beyond the adopted")
    a("> Capability 1 scope without a new owner act.")
    a(">")
    a(f"> Charter sha256 `{digest}`.")
    a("")
    a(f"**{charter['capability_id']} — {charter['title']}**")
    a("")
    a(f"> {charter['argument']}")
    a("")
    a("## View 2 — the behaviour rows")
    a("")
    a("Also injected into `FIRST-OPENSPEC-SEQUENCE.md` between its generated")
    a("markers, so the sequence and this file cannot disagree.")
    a("")
    a(render_rows(rows))
    a("")

    a("## View 3 — the E3 trace-table skeleton")
    a("")
    a("One row per (behaviour row, clause). **The `Anchored text` column is")
    a("deliberately empty**: an anchor is a quotation from the clause at its")
    a("current bytes, and a generator that quoted clause prose would have")
    a("re-opened the door it closed. The skeleton says what must be anchored")
    a("and by whom; the anchoring is human work.")
    a("")
    a("| Row | Clause | Authority home | Anchored text |")
    a("|---|---|---|---|")
    for r in rows:
        for cid, mod in r["clauses"]:
            a(f"| {r['id']} | `{cid}` | `{mod}` | |")
    a("")

    a("## View 4 — the initial clause-coverage population")
    a("")
    a("The denominator a coverage matrix is judged against: every clause")
    a("this capability declares it relies on, and where it is homed. A clause")
    a("absent from this table is out of Capability 1's declared scope, which")
    a("is a claim a reviewer can contradict.")
    a("")
    a(f"```text")
    a(f"population        {n_clauses} clause(s)")
    a(f"authority homes   {len(modules)} module(s), all within Waves "
      f"{'+'.join(charter['required_waves'])}")
    a(f"deferred waves    {', '.join(charter['deferred_waves'])} — 0 clauses, "
      f"checked at generation")
    a("```")
    a("")
    a("| Clause | Authority home | Behaviour row |")
    a("|---|---|---|")
    for cid, mod, rid in sorted((c, m, r["id"]) for r in rows for c, m in r["clauses"]):
        a(f"| `{cid}` | `{mod}` | {rid} |")
    a("")

    a("## View 5 — the blocking-decision list")
    a("")
    a("Every decision or act that blocks **authoring** this capability: the")
    a("charter's capability-level list, then every decision a behaviour row")
    a("names, in charter order and deduplicated. Each is verified at")
    a("generation to be an **open** row of the queue's own open section — a")
    a("resolved or executed row is refused, and so is one the queue does not")
    a("carry.")
    a("")
    a("```text")
    for pid in decisions:
        rows_naming = [r["id"] for r in rows if pid in r["decisions"]]
        where = ("rows " + ", ".join(rows_naming)) if rows_naming else "capability-level"
        a(f"{pid:6s} {where}")
    a("```")
    a("")
    a("**Open upstream, at a later gate — not consumed by authoring:** "
      + (", ".join(f"`{p}`" for p in charter["downstream_decisions"])
         or "none — the queue holds no downstream row") + ".")
    a("")

    a("## Non-goals")
    a("")
    for g in charter["non_goals"]:
        a(f"- {g}")
    a("")
    a("## Deferred semantics")
    a("")
    a("| What | Why it is deferred |")
    a("|---|---|")
    for d in charter["deferred_semantics"]:
        a(f"| {d['id']} | {d['note']} |")
    a("")
    a("---")
    a("")
    a(f"Generated by `scripts/build_capability_1_views.py` from "
      f"`CAPABILITY-1-CHARTER.yaml` — {len(rows)} behaviour row(s), "
      f"{n_clauses} clause(s), {len(modules)} module(s), "
      f"{len(decisions)} blocking decision(s). Counts computed, never asserted.")
    return "\n".join(lines) + "\n"


def inject(sequence_text, block):
    i = sequence_text.find(BEGIN)
    j = sequence_text.find(END)
    if i < 0 or j < 0:
        raise CharterError("FIRST-OPENSPEC-SEQUENCE.md has no generated markers")
    return sequence_text[:i] + BEGIN + "\n" + block + "\n" + sequence_text[j:]


# --------------------------------------------------------------- the driver

def build(charter_text=None, index_text=None, queue_text=None,
          ab=None, deferred=None):
    charter = parse_charter(charter_text if charter_text is not None
                            else read(CHARTER))
    homes = clause_homes(index_text if index_text is not None else read(INDEX))
    if ab is None:
        ab = wave_modules("A") | wave_modules("B")
    if deferred is None:
        deferred = {w: wave_modules(w) for w in charter["deferred_waves"]}
    open_rows = open_decisions(queue_text if queue_text is not None
                               else read(QUEUE))
    rows, errors = resolve(charter, homes, ab, deferred, open_rows)
    return charter, rows, errors


def route_payload():
    """What build_task_router.py consumes. One source, two readers."""
    charter, rows, errors = build()
    if errors:
        raise CharterError("Capability 1 charter does not validate: "
                           + "; ".join(errors))
    clauses = {}
    for r in rows:
        for cid, mod in r["clauses"]:
            clauses[cid] = mod
    return dict(capability_id=charter["capability_id"],
                title=charter["title"],
                argument=charter["argument"],
                clauses=clauses,
                doctrine=sorted({d for r in rows for d in r["doctrine"]}
                                | set(charter.get("doctrine", []))),
                blocking_decisions=all_decisions(charter, rows),
                downstream_decisions=charter["downstream_decisions"])


def main(argv):
    check = "--check" in argv
    if "--selftest" in argv:
        return selftest()

    charter_bytes = read(CHARTER)
    charter, rows, errors = build(charter_text=charter_bytes)
    if errors:
        print("CHARTER DOES NOT VALIDATE — no view was generated:")
        for e in errors:
            print(f"  {e}")
        return 1

    digest = hashlib.sha256(charter_bytes.encode()).hexdigest()
    decisions = all_decisions(charter, rows)
    views = render_views(charter, rows, decisions, digest)
    seq = inject(read(SEQUENCE), render_rows(rows))

    drift = []
    if not os.path.exists(VIEWS) or read(VIEWS) != views:
        drift.append("CAPABILITY-1-GENERATED-VIEWS.md")
    if read(SEQUENCE) != seq:
        drift.append("FIRST-OPENSPEC-SEQUENCE.md (generated block)")

    if check:
        if drift:
            print("DRIFT: " + "; ".join(drift) + " differ(s) from regeneration")
            return 1
        print(f"capability 1 views match regeneration — {len(rows)} behaviour "
              f"row(s), {sum(len(r['clauses']) for r in rows)} clause(s), "
              f"{len(decisions)} blocking decision(s)")
        return 0

    with open(VIEWS, "w", encoding="utf-8") as fh:
        fh.write(views)
    with open(SEQUENCE, "w", encoding="utf-8") as fh:
        fh.write(seq)
    print(f"wrote CAPABILITY-1-GENERATED-VIEWS.md and the sequence's "
          f"generated block — {len(rows)} row(s), "
          f"{sum(len(r['clauses']) for r in rows)} clause(s)")
    return 0


# -------------------------------------------------------------- the fixtures

def selftest():
    """Every predicate is mutation-tested: the mutated input must FAIL.

    A check nobody has watched fail is a check nobody should trust
    (verification rule 6). The four mutations owner charter §10 names —
    missing clause, extra deferred module, missing decision, wrong authority
    home — are the first four cases."""
    results = []

    def case(name, fn):
        try:
            ok, detail = fn()
        except Exception as exc:                       # noqa: BLE001
            ok, detail = False, f"raised {type(exc).__name__}: {exc}"
        results.append((ok, name, detail))

    base_charter = read(CHARTER)
    base_index = read(INDEX)
    base_queue = read(QUEUE)
    ab = wave_modules("A") | wave_modules("B")
    charter = parse_charter(base_charter)
    deferred = {w: wave_modules(w) for w in charter["deferred_waves"]}

    def run(ct=None, it=None, qt=None, ab_=None, df_=None):
        return build(ct or base_charter, it or base_index, qt or base_queue,
                     ab if ab_ is None else ab_,
                     deferred if df_ is None else df_)[2]

    def unmutated():
        errs = run()
        return not errs, ("clean" if not errs else "; ".join(errs))

    case("the real charter validates against the real corpus", unmutated)

    def missing_clause():
        mutated = base_charter.replace("RFC7-40]", "RFC7-40, RFC7-999]")
        if mutated == base_charter:
            return False, "mutation did not apply"
        errs = run(ct=mutated)
        return (any("RFC7-999" in e and "not a defined clause" in e
                    for e in errs),
                "; ".join(errs) or "no error raised")

    case("MUTATION missing clause: a clause absent from the contract index "
         "is refused", missing_clause)

    def deferred_module():
        # Home a real, cited clause in a deferred-wave module.
        d1 = sorted(deferred["D1"])
        target = [m for m in d1 if m.startswith("rfcs/")][0]
        mutated = re.sub(
            r"\{id: RFC7-40, module: [^,]+,",
            "{id: RFC7-40, module: " + target[len("rfcs/"):] + ",",
            base_index)
        if mutated == base_index:
            return False, "mutation did not apply"
        errs = run(it=mutated)
        return (any("RFC7-40" in e and "deferred wave D1" in e for e in errs),
                "; ".join(errs) or "no error raised")

    case("MUTATION extra deferred module: a clause homed in a deferred wave "
         "is refused", deferred_module)

    def missing_decision():
        # (Re-anchored 2026-08-20: the owner's launch decision removed
        # P-1/P-21, emptying `blocking_decisions`, so the fixture injects
        # into `[]`.)
        mutated = base_charter.replace("blocking_decisions: []",
                                       "blocking_decisions: [P-999]")
        if mutated == base_charter:
            return False, "mutation did not apply"
        errs = run(ct=mutated)
        return (any("P-999" in e for e in errs),
                "; ".join(errs) or "no error raised")

    case("MUTATION missing decision: a decision the queue's open section "
         "does not carry is refused", missing_decision)

    def wrong_home():
        # Point a clause at a module no wave manifest names at all.
        mutated = re.sub(r"\{id: RFC7-39, module: [^,]+,",
                         "{id: RFC7-39, module: NOT-A-MODULE.md,", base_index)
        if mutated == base_index:
            return False, "mutation did not apply"
        errs = run(it=mutated)
        return (any("RFC7-39" in e and "no Wave A or Wave B manifest" in e
                    for e in errs),
                "; ".join(errs) or "no error raised")

    case("MUTATION wrong authority home: a clause homed outside every wave "
         "manifest is refused", wrong_home)

    def resolved_decision():
        # A RESOLVED row must be refused even when it exists in the file,
        # outside the open section — a file-wide grep would accept it.
        # (Synthesized 2026-08-17: the register refactor moved every
        # resolved row to `DECISION-HISTORY.md`, so the fixture plants one.)
        queue_with_resolved = base_queue + (
            "\n## Resolved synthetically (fixture only)\n\n"
            "| # | What happened |\n|---|---|\n"
            "| P-26 | **Executed.** synthetic resolved row |\n")
        # (Re-anchored 2026-08-20: `blocking_decisions` emptied by the
        # launch decision; the fixture injects into `[]`.)
        mutated = base_charter.replace("blocking_decisions: []",
                                       "blocking_decisions: [P-26]", 1)
        if mutated == base_charter or queue_with_resolved == base_queue:
            return False, "mutation did not apply"
        errs = run(ct=mutated, qt=queue_with_resolved)
        return (any("P-26" in e for e in errs),
                "; ".join(errs) or "no error raised")

    case("a RESOLVED queue row named as blocking is refused (a file-wide "
         "row grep would accept it)", resolved_decision)

    def duplicate_clause():
        """Guarded because it once broke silently: the fixture mutated
        `[RFC7-40]`, row 1.6 gained two clauses, the replace no-opped, and a
        fixture that discriminated nothing reported `pass`. A fixture bound
        to a literal its subject can move out from under must fail loudly
        when the literal goes, not quietly stop testing."""
        mutated = base_charter.replace(
            "governing_clauses: [RFC7-39]",
            "governing_clauses: [RFC7-39, RFC7-40]", 1)
        if mutated == base_charter:
            return False, "mutation did not apply"
        errs = run(ct=mutated)
        return (any("RFC7-40" in e and "one behaviour home" in e
                    for e in errs),
                "; ".join(errs) or "no error raised")

    case("a clause claimed by two behaviour rows is refused", duplicate_clause)

    #: Since 2026-11-22 the live register can hold no open row (D11 resolved the
    #: last one), so both marker fixtures seed one synthetic open row instead of
    #: naming a live one; each re-anchoring before this broke on an owner ruling.
    SYN = "P-9999"

    def _seeded():
        head = "## Open, and only the owner can dispose\n"
        sep = "|---|---|---|---|\n"
        j = base_queue.index(sep, base_queue.index(head)) + len(sep)
        return base_queue[:j] + f"| {SYN} | synthetic open row | test | test |\n" + base_queue[j:]

    seeded = _seeded()
    assert SYN in open_decisions(seeded), "the synthetic row is not read as open"
    def executed_in_prose():
        """A row that *discusses* the executed marker is still open.

        P-43 asks whether "an `**Executed.**` marker" should be the
        convention for recording an owner decision, and a substring test
        read that question as its own answer and silently dropped an open
        row from the population. The marker disqualifies a row only where
        it leads the row's final cell.

        (Re-anchored 2026-08-17 from P-34 to P-43 — P-34 was ruled and its
        row moved to `DECISION-HISTORY.md` in the register refactor; P-43
        remains genuinely open, and is the very row whose prose discusses
        the marker. Re-anchored 2026-11-21 from P-43 to P-119: D10 F-10
        decided P-43 and moved every row but the owner-class three out.)"""
        mutated = seeded.replace(
            f"| {SYN} |", f"| {SYN} | should an `**Executed.**` marker count? |", 1)
        if mutated == seeded:
            return False, "mutation did not apply"
        ids = open_decisions(mutated)
        return (SYN in ids,
                f"{SYN} dropped from the open population by a prose mention"
                if SYN not in ids else "still open, correctly")

    case("a row mentioning `**Executed.**` in prose stays open",
         executed_in_prose)

    def executed_disposition():
        """The accepting direction, and it must be exercised SYNTHETICALLY.

        Measured 2026-08-13: every executed-marked row in the real queue
        already sits under a `Resolved…` heading, so the heading check alone
        disqualifies all seven and the marker check has **no live subject**.
        A fixture reading the real queue therefore passes with the marker
        check deleted — which is exactly what happened, and is why this
        fixture mutates an OPEN row instead. The check is defence in depth
        against an executed row landing in the open section; a defence
        nothing tests is not a defence.

        (Re-anchored 2026-08-16 from P-33 to P-34, and 2026-08-17 from P-34
        to P-43 — each predecessor was ruled and left the open table; P-43
        remains genuinely open. Re-anchored 2026-11-21 from P-43 to P-119
        after D10 F-10.)"""
        lines = seeded.split("\n")
        for j, line in enumerate(lines):
            if line.startswith(f"| {SYN} |"):
                lines[j] = line.rstrip().rstrip("|").rstrip() \
                    + " | **Executed.** synthetic disposition |"
                break
        else:
            return False, f"no {SYN} row to mutate"
        mutated = "\n".join(lines)
        if mutated == seeded:
            return False, "mutation did not apply"
        ids = open_decisions(mutated)
        return (SYN not in ids,
                "an executed disposition in the OPEN section was still "
                "counted open" if SYN in ids else "disqualified, correctly")

    case("an `**Executed.**` disposition inside the open section disqualifies",
         executed_disposition)

    def resolved_heading():
        """The heading limb, also synthetic, and also because the two limbs
        mask each other.

        All rows under `Resolved…` headings carried the executed marker
        too, so deleting the heading check changed nothing — the marker check
        caught them. A resolved-section row *without* the marker must still
        be disqualified by the heading alone.

        (Made fully synthetic 2026-08-17: the register refactor moved every
        resolved row to `DECISION-HISTORY.md`, so the real queue holds no
        `Resolved…` section — the fixture appends one, unmarked.)"""
        mutated = base_queue + (
            "\n## Resolved synthetically (fixture only)\n\n"
            "| # | What happened |\n|---|---|\n"
            "| P-6 | Recorded: a synthetic resolved row without the marker |\n")
        if mutated == base_queue:
            return False, "mutation did not apply"
        ids = open_decisions(mutated)
        return ("P-6" not in ids,
                "a row under a `Resolved…` heading was counted open without "
                "its marker" if "P-6" in ids else "disqualified by "
                "the heading, correctly")

    case("a `Resolved…` heading disqualifies without help from the marker",
         resolved_heading)

    def row_decision():
        """The row-level owner_decisions check has its own fixture because
        it has its own code path. Disabling it left every other fixture
        passing, which is exactly how an uncovered predicate hides.

        (Re-anchored 2026-08-16 — every row's `owner_decisions` emptied
        once P-31/P-36/P-37/P-38 were all ruled the same sitting, so the
        fixture now injects into the first empty list rather than
        appending to `[P-38]`, which no longer appears anywhere.)"""
        mutated = base_charter.replace("owner_decisions: []",
                                       "owner_decisions: [P-998]", 1)
        if mutated == base_charter:
            return False, "mutation did not apply"
        errs = run(ct=mutated)
        return (any("P-998" in e and "row" in e for e in errs),
                "; ".join(errs) or "no error raised")

    case("a behaviour row naming a decision the queue does not carry is "
         "refused", row_decision)

    def blocking_executed():
        """And the capability-level list has its own path too.

        (Synthesized 2026-08-17: the resolved rows moved to
        `DECISION-HISTORY.md`, so the fixture plants a marked P-6 row in a
        synthetic resolved section rather than relying on the live file.)"""
        queue_with_resolved = base_queue + (
            "\n## Resolved synthetically (fixture only)\n\n"
            "| # | What happened |\n|---|---|\n"
            "| P-6 | **Executed.** synthetic resolved row |\n")
        # (Re-anchored 2026-08-20: `blocking_decisions` emptied by the
        # launch decision; the fixture injects into `[]`.)
        mutated = base_charter.replace("blocking_decisions: []",
                                       "blocking_decisions: [P-6]", 1)
        if mutated == base_charter or queue_with_resolved == base_queue:
            return False, "mutation did not apply"
        errs = run(ct=mutated, qt=queue_with_resolved)
        return (any("P-6 is not an open queue row" in e for e in errs),
                "; ".join(errs) or "no error raised")

    case("the capability-level blocking list refuses a resolved row on its "
         "own path", blocking_executed)

    def downstream_unknown():
        """Third code path, third fixture. The later-gate list is the one a
        reader is least likely to check by hand, which is the argument for
        checking it mechanically rather than against it.

        (Re-anchored 2026-08-16 when P-35 left the list, and 2026-08-17
        when P-34 was ruled — the charter's list is now empty, so the
        fixture injects into `[]`.)"""
        mutated = base_charter.replace("downstream_decisions: []",
                                       "downstream_decisions: [P-997]")
        if mutated == base_charter:
            return False, "mutation did not apply"
        errs = run(ct=mutated)
        return (any("downstream decision P-997" in e for e in errs),
                "; ".join(errs) or "no error raised")

    case("a later-gate decision the queue does not carry is refused",
         downstream_unknown)

    def both_lists():
        """(Re-anchored 2026-08-16 — P-40 was ruled and removed from
        `blocking_decisions`, so appending it to `downstream_decisions` no
        longer produced a both-lists collision. Re-anchored again
        2026-08-17, twice: P-34 was ruled, emptying the downstream list;
        then acts 6/7 removed P-41 from `blocking_decisions`, so the
        collision subject moved to P-21. Re-anchored a fourth time
        2026-08-20: the launch decision emptied `blocking_decisions`, so
        the fixture now plants P-21 — still an open queue row — in BOTH
        lists to synthesize the collision.)"""
        mutated = base_charter.replace("blocking_decisions: []",
                                       "blocking_decisions: [P-21]",
                                       1).replace("downstream_decisions: []",
                                       "downstream_decisions: [P-21]",
                                       1)
        if mutated == base_charter:
            return False, "mutation did not apply"
        errs = run(ct=mutated)
        return (any("both blocking and later-gate" in e for e in errs),
                "; ".join(errs) or "no error raised")

    case("a decision named as both blocking and later-gate is refused",
         both_lists)

    # --- the parser itself -------------------------------------------------

    def parser_rejects_open_list():
        try:
            parse_charter("k: [a, b\n")
        except CharterError:
            return True, "rejected"
        return False, "accepted an unclosed flow list"

    case("parser: an unclosed flow list is rejected", parser_rejects_open_list)

    def parser_rejects_unterminated_quote():
        try:
            parse_charter('k: "abc\n')
        except CharterError:
            return True, "rejected"
        return False, "accepted an unterminated quoted scalar"

    case("parser: an unterminated quoted scalar is rejected",
         parser_rejects_unterminated_quote)

    def parser_keeps_commas_in_quotes():
        got = parse_charter('k: ["a, b", c]\n')
        return got == {"k": ["a, b", "c"]}, repr(got)

    case("parser: a comma inside a quoted flow item does not split it",
         parser_keeps_commas_in_quotes)

    def parser_reads_block_sequence():
        got = parse_charter("rows:\n  - id: \"1\"\n    xs: [a]\n  - id: \"2\"\n    xs: []\n")
        return (got == {"rows": [{"id": "1", "xs": ["a"]},
                                 {"id": "2", "xs": []}]}, repr(got))

    case("parser: a two-entry block sequence round-trips",
         parser_reads_block_sequence)

    def parser_rejects_stray_key():
        try:
            parse_charter("a:\n  k: v\n")
        except CharterError:
            return True, "rejected"
        return False, "accepted a mapping key with no sequence item"

    case("parser: a mapping key before any sequence item is rejected",
         parser_rejects_stray_key)

    def queue_section_required():
        try:
            open_decisions("# no open section here\n")
        except CharterError:
            return True, "rejected"
        return False, "accepted a queue with no open section"

    case("a queue file with no open section is an error, not an empty set",
         queue_section_required)

    def injection_needs_markers():
        try:
            inject("no markers here", "x")
        except CharterError:
            return True, "rejected"
        return False, "injected into a file with no markers"

    case("injection into a file with no generated markers is refused",
         injection_needs_markers)

    width = max(len(n) for _, n, _ in results)
    failing = 0
    for ok, name, detail in results:
        if not ok:
            failing += 1
        print(f"  {'pass' if ok else 'FAIL'}  {name.ljust(width)}"
              + ("" if ok else f"   -- {detail}"))
    print(f"\n{len(results)} fixtures, {failing} failing — a check that "
          f"cannot fail is not a check")
    return 1 if failing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
