#!/usr/bin/env python3
"""The stored dossier runs of the pilot: pages and words by page class (syzygy-5dhm.134, R29 slice 2).

    python3 scripts/dossier_pilot_runs.py --check
        from the record alone: re-derive every run's page and word counts and its split by page class from the recorded words
        per page (runs-page-words.json) and compare them with runs.json; exit 1 on any difference
    python3 scripts/dossier_pilot_runs.py --check --state-root DIR
        also read the stored runs under DIR (read only): convert each run's last rendered site again and compare its words per
        page, brief version, schema version and last draft revision with the record
    python3 scripts/dossier_pilot_runs.py --state-root DIR --out RUNS.json --page-words-out WORDS.json
        write both files anew (neither may exist)
    python3 scripts/dossier_pilot_runs.py --selftest
    --pilot DIR   the record directory (default: docs/evidence/pursuit-2026-11-21b/pilot)

Page classes, by site-relative path:
  reader      index.html, glossary.html, poles/*, deep-dives/*
  navigation  contents.html, sources/index.html
  run         review.html, discovery.html, size-report.html, clarifications.html, executions.html, appendix.html,
              understanding.html (pages about the run itself)
  other       anything else, listed by path
Raw source pages (sources/* except its index) are left out before counting, as scripts/dossier_site_to_text.py leaves them
out; a word is a whitespace-separated token of that script's text. A run with no rendered site has no words: its row says so,
never zero pages of a site. `textDir` in runs.json is the pilot's working directory name, kept as recorded.

Reads, under --state-root, each run's brief.json, drafts/rev-*.json and last site only; a directory ending `.agents` or
`.sessions` is never opened. Prints counts only, never page text. Starts no session.
"""
import argparse
import copy
import importlib.util
import json
import pathlib
import re
import sys

SCRIPTS = pathlib.Path(__file__).resolve().parent
DEFAULT_PILOT = SCRIPTS.parent / "docs" / "evidence" / "pursuit-2026-11-21b" / "pilot"
RUN_PAGES = {"review.html", "discovery.html", "size-report.html", "clarifications.html", "executions.html", "appendix.html",
             "understanding.html"}
NAV_PAGES = {"contents.html", "sources/index.html"}
CLASSES = ("reader", "navigation", "run", "other")
NO_SITE_NOTE = "no rendered site: the run has no site/ directory (it was never rendered)"
PAGE_WORDS_FORMAT = "polaris-dossier-pilot-page-words/1"


class RunsError(Exception):
    """The record or a stored run cannot be read as expected."""


def page_class(relative):
    if relative in ("index.html", "glossary.html") or relative.startswith(("poles/", "deep-dives/")):
        return "reader"
    if relative in NAV_PAGES:
        return "navigation"
    if relative in RUN_PAGES:
        return "run"
    return "other"


def split(per_page):
    """Pages and words by class, from the words per kept page."""
    words = dict.fromkeys(CLASSES, 0)
    pages = dict.fromkeys(CLASSES, 0)
    others = []
    for relative, count in per_page.items():
        found = page_class(relative)
        words[found] += count
        pages[found] += 1
        if found == "other":
            others.append(relative)
    total = sum(per_page.values())
    return {"pages": len(per_page), "words": total, "wordsByClass": words, "pagesByClass": pages,
            "readerShareOfWords": round(words["reader"] / total, 3) if total else None, "otherPages": others}


def read_json(path):
    try:
        return json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise RunsError(f"{path}: {error}") from error


def record_differences(runs, page_words):
    """Where runs.json differs from what its recorded words per page give; empty when it reproduces."""
    found = []
    rows, pages = runs["runs"], page_words["runs"]
    if set(rows) != set(pages):
        found.append(f"runs {sorted(rows)} recorded, words per page for {sorted(pages)}")
        return found
    for prefix, row in sorted(rows.items()):
        mine = pages[prefix]
        if mine["site"] is None:
            for key, want in (("site", None), ("pages", 0), ("words", 0), ("note", NO_SITE_NOTE)):
                if row.get(key, "absent") != want:
                    found.append(f"run {prefix}, {key}: a run with no site records {row.get(key, 'absent')!r}")
            for key in ("wordsByClass", "pagesByClass", "readerShareOfWords"):
                if key in row:
                    found.append(f"run {prefix}, {key}: recorded for a run with no site")
            continue
        derived = dict(split(mine["perPageWords"]), site=mine["site"], sourcesPagesExcluded=mine["sourcesPagesExcluded"])
        for key, value in derived.items():
            if row.get(key, "absent") != value:
                found.append(f"run {prefix}, {key}: derived {value!r}, recorded {row.get(key, 'absent')!r}")
    return found


# ---- reading stored runs (only with --state-root) ----

def _site_to_text():
    spec = importlib.util.spec_from_file_location("dossier_site_to_text", SCRIPTS / "dossier_site_to_text.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_directory(state_root, prefix):
    found = [path for path in pathlib.Path(state_root).glob(f"run-{prefix}*")
             if path.is_dir() and not path.name.endswith((".agents", ".sessions"))]
    if len(found) != 1:
        raise RunsError(f"run {prefix}: {len(found)} run directories under the state root, expected 1")
    return found[0]


def read_run(state_root, prefix, converter):
    """One stored run's facts and the words per kept page of its last rendered site (none when it was never rendered)."""
    run = run_directory(state_root, prefix)
    brief = read_json(run / "brief.json")
    drafts = sorted((path for path in (run / "drafts").glob("rev-*.json") if re.fullmatch(r"rev-\d+\.json", path.name)),
                    key=lambda path: int(path.stem.split("-")[1]))
    if not drafts:
        raise RunsError(f"run {prefix}: no draft revision")
    facts = {"runDir": run.name, "briefVersion": brief.get("briefVersion"), "guidanceVersion": brief.get("guidanceVersion"),
             "draftSchemaVersion": read_json(drafts[-1]).get("schemaVersion"), "lastDraftRevision": len(drafts) - 1}
    site_root = run / "site"
    numbers = [int(path.name) for path in site_root.iterdir() if path.name.isdigit()] if site_root.is_dir() else []
    if not numbers:
        return facts, {"site": None}
    site = site_root / str(max(numbers))
    per_page, left_out = {}, 0
    for relative in converter.site_pages(site):
        if converter.is_source_page(relative):
            left_out += 1
            continue
        per_page[relative] = len(converter.page_text((site / relative).read_text(encoding="utf-8")).split())
    return facts, {"site": f"site/{max(numbers)}", "sourcesPagesExcluded": left_out, "perPageWords": per_page}


def stored_differences(runs, page_words, state_root):
    """Where the record differs from the stored runs themselves."""
    converter = _site_to_text()
    found = []
    for prefix, row in sorted(runs["runs"].items()):
        facts, measured = read_run(state_root, prefix, converter)
        for key, value in facts.items():
            if row.get(key, "absent") != value:
                found.append(f"run {prefix}, {key}: stored {value!r}, recorded {row.get(key, 'absent')!r}")
        recorded = page_words["runs"].get(prefix, {})
        for key, value in measured.items():
            if recorded.get(key, "absent") != value:
                detail = "the words per page differ" if key == "perPageWords" else f"stored {value!r}, recorded {recorded.get(key, 'absent')!r}"
                found.append(f"run {prefix}, {key}: {detail}")
    return found


def build(state_root, prefixes, text_dirs):
    converter = _site_to_text()
    rows, pages = {}, {}
    for prefix in prefixes:
        facts, measured = read_run(state_root, prefix, converter)
        pages[prefix] = measured
        if measured["site"] is None:
            rows[prefix] = {**facts, "site": None, "pages": 0, "words": 0, "note": NO_SITE_NOTE}
            continue
        derived = split(measured["perPageWords"])
        rows[prefix] = {**facts, "site": measured["site"], "textDir": text_dirs.get(prefix, f"dossier-{prefix}"),
                        "pages": derived["pages"], "words": derived["words"], "sourcesPagesExcluded": measured["sourcesPagesExcluded"],
                        "wordsByClass": derived["wordsByClass"], "pagesByClass": derived["pagesByClass"],
                        "readerShareOfWords": derived["readerShareOfWords"], "otherPages": derived["otherPages"]}
    return rows, {"format": PAGE_WORDS_FORMAT, "wordCount": "whitespace-separated tokens of the converted <main> text (scripts/dossier_site_to_text.py)",
                  "runs": pages}


# ---- selftest ----

def selftest():
    failures = []
    classes = (("index.html", "reader"), ("glossary.html", "reader"), ("poles/1.html", "reader"), ("deep-dives/aof.html", "reader"),
               ("contents.html", "navigation"), ("sources/index.html", "navigation"), ("review.html", "run"), ("understanding.html", "run"),
               ("poles.html", "other"), ("deep-dives.html", "other"), ("extra/review.html", "other"), ("machine.html", "other"))
    for relative, want in classes:
        if page_class(relative) != want:
            failures.append(f"{relative} classed {page_class(relative)}")
    per_page = {"index.html": 10, "poles/1.html": 30, "contents.html": 5, "review.html": 4, "machine.html": 1}
    want = {"pages": 5, "words": 50, "wordsByClass": {"reader": 40, "navigation": 5, "run": 4, "other": 1},
            "pagesByClass": {"reader": 2, "navigation": 1, "run": 1, "other": 1}, "readerShareOfWords": 0.8, "otherPages": ["machine.html"]}
    if split(per_page) != want:
        failures.append(f"the synthetic split is {split(per_page)}")
    if split({})["readerShareOfWords"] is not None:
        failures.append("an empty site has a reader share")
    runs = {"runs": {"aaaa": {**want, "site": "site/0", "sourcesPagesExcluded": 7, "runDir": "run-aaaa"},
                     "bbbb": {"site": None, "pages": 0, "words": 0, "note": NO_SITE_NOTE, "runDir": "run-bbbb"}}}
    words = {"runs": {"aaaa": {"site": "site/0", "sourcesPagesExcluded": 7, "perPageWords": per_page}, "bbbb": {"site": None}}}
    if record_differences(runs, words):
        failures.append(f"the unmutated synthetic record differs: {record_differences(runs, words)[0]}")

    def set_row(key, value):
        return lambda r, w: r["runs"]["aaaa"].__setitem__(key, value)

    mutations = (
        ("pages", set_row("pages", 6)), ("words", set_row("words", 51)), ("the site", set_row("site", "site/1")),
        ("source pages left out", set_row("sourcesPagesExcluded", 8)), ("the reader share", set_row("readerShareOfWords", 0.81)),
        ("other pages", set_row("otherPages", [])),
        ("words of a class", lambda r, w: r["runs"]["aaaa"]["wordsByClass"].__setitem__("run", 5)),
        ("pages of a class", lambda r, w: r["runs"]["aaaa"]["pagesByClass"].__setitem__("reader", 3)),
        ("a recorded member removed", lambda r, w: r["runs"]["aaaa"].pop("wordsByClass")),
        ("a page's words", lambda r, w: w["runs"]["aaaa"]["perPageWords"].__setitem__("review.html", 5)),
        ("a page moved to another class", lambda r, w: w["runs"]["aaaa"]["perPageWords"].update({"poles/1.html": 0, "review.html": 34})),
        ("a run missing from the words", lambda r, w: w["runs"].pop("bbbb")),
        ("a run with no site given pages", lambda r, w: r["runs"]["bbbb"].__setitem__("pages", 1)),
        ("a run with no site given a split", lambda r, w: r["runs"]["bbbb"].__setitem__("wordsByClass", {})),
        ("a run with no site losing its note", lambda r, w: r["runs"]["bbbb"].pop("note")),
    )
    for name, mutate in mutations:
        mutated_runs, mutated_words = copy.deepcopy(runs), copy.deepcopy(words)
        mutate(mutated_runs, mutated_words)
        caught = bool(record_differences(mutated_runs, mutated_words))
        print(f"  {'caught' if caught else 'SURVIVED'}  {name}")
        if not caught:
            failures.append(f"mutating {name} left the check passing")
    for failure in failures:
        print(f"FAIL {failure}")
    print(f"selftest: {len(classes)} page classes, 2 splits, {len(mutations)} mutations; {len(failures)} failure(s)")
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--pilot", default=str(DEFAULT_PILOT))
    parser.add_argument("--state-root")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--out")
    parser.add_argument("--page-words-out")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    pilot = pathlib.Path(args.pilot)
    try:
        if args.state_root and any(part.endswith((".agents", ".sessions")) for part in pathlib.Path(args.state_root).resolve().parts):
            raise RunsError("the state root is inside a .agents or .sessions directory")
        runs = read_json(pilot / "runs.json")
        if args.check:
            page_words = read_json(pilot / "runs-page-words.json")
            found = record_differences(runs, page_words)
            with_site = sum(1 for row in page_words["runs"].values() if row["site"] is not None)
            scope = f"{len(runs['runs'])} runs ({with_site} with a site) re-derived from the recorded words per page"
            if args.state_root:
                found += stored_differences(runs, page_words, args.state_root)
                scope += " and read again from the stored runs"
            for line in found:
                print(f"DIFFERS {line}", file=sys.stderr)
            print(f"check: {scope}; {len(found)} difference(s)")
            return 1 if found else 0
        if not (args.state_root and args.out and args.page_words_out):
            parser.error("writing needs --state-root, --out and --page-words-out; or pass --check")
        out, words_out = pathlib.Path(args.out), pathlib.Path(args.page_words_out)
        if out.exists() or words_out.exists():
            raise RunsError("an output file already exists; refusing to overwrite it")
        text_dirs = {prefix: row["textDir"] for prefix, row in runs["runs"].items() if "textDir" in row}
        rows, page_words = build(args.state_root, sorted(runs["runs"]), text_dirs)
        out.write_text(json.dumps({"rule": runs["rule"], "wordCount": runs["wordCount"], "runs": rows}, indent=1), encoding="utf-8")
        words_out.write_text(json.dumps(page_words, indent=1) + "\n", encoding="utf-8")
        print(f"written: {len(rows)} runs, {sum(row['pages'] for row in rows.values())} pages, {sum(row['words'] for row in rows.values())} words")
        return 0
    except RunsError as error:
        print(f"dossier_pilot_runs: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
