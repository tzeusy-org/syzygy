"""Check that each pursuit-run adoption row's revert can actually be carried out.

Usage: python3 check_row_reverts.py <repo> <scratch-clone-dir> <out.json>

For every row in ROWS it runs the revert as the row states it, at the row's
own merge commit and at <repo>'s origin/main, and records "applied" or the
conflicted paths. At the merge commit it also tries the full list (every
non-merge commit of the row's pull request, newest first) under the two
resolution rules A-327 states:

  list rule   - a conflict in cli.test.ts's literal source list is resolved
                by writing the base's listed sources still present, and after
                the last revert the list is set to exactly those again (an
                earlier revert may delete a file a later conflict still saw);
  ledger rule - a conflict in AGENT-ADOPTIONS.md keeps the file as it stands
                (rows are append-only; the veto adds its own row).

It records whether the full revert then completes, whether the list equals
the directory, and which files the pull request touched still differ from
the pre-change base (main's own later edits to those files are expected).
The clone is made with --shared and never pushed.
"""
import json
import os
import re
import subprocess
import sys

CLI_TEST = "packages/polaris-dossier/src/cli.test.ts"
SRC_DIR = "packages/polaris-dossier/src"
ADOPT = ".syzygy/governance/decisions/AGENT-ADOPTIONS.md"
LIST_RE = re.compile(r"expect\(sources\)\.toEqual\(\[([^\]]*)\]\);")
CONFLICT_RE = re.compile(r"<<<<<<< [^\n]*\n([ \t]*)expect\(sources\)[^\n]*\n=======\n"
                         r"[ \t]*expect\(sources\)[^\n]*\n>>>>>>> [^\n]*\n")

ROWS = {
    "A-316": {"pr": 1002, "merge": "f59dcd396416d0cb742097e454394256134fe31e",
              "stated": ["fd0df7894d448d5e09afd366aacc116686e8acbe", "8d3e55bef400bbf47394c99499c3d3e8f3c50d96",
                         "f2f967f0c0f7639e7098fbc1bd1067d65936d61b"]},
    "A-314": {"pr": 1005, "merge": "1268de79536edd086288673e18d9b1efbec2a201",
              "stated": ["cf823b2e56b561d68381f02a2cc2d3924931fe44", "fe3e55dfe8b90ff60d621a97191c2b7ab9088931"]},
    "A-320": {"pr": 1009, "merge": "bec82ce45ab715abc23704c0cbc5e99931dec4e8",
              "stated": ["10998aebfb15a8341b12be305ed1cb5c46514a14", "e5388d6d000739cc65ee23304cdbdaa44e97309b"]},
    "A-315": {"pr": 1008, "merge": "e852d0c9a0fe624778924f2745e5c7d03655626a",
              "stated": ["dba7a40f622084889db826a57bafeed0af22147a..0e0b281d192737a8e8415b24be326355c464dd97"]},
}


def pr_commits(number):
    out = subprocess.run(["gh", "pr", "view", str(number), "--json", "commits"],
                         capture_output=True, text=True, check=True).stdout
    commits = json.loads(out)["commits"]
    non_merge = [c["oid"] for c in commits if not c["messageHeadline"].startswith("Merge ")]
    return list(reversed(non_merge))


def listed_sources(scratch):
    found = LIST_RE.search(open(os.path.join(scratch, CLI_TEST)).read())
    return [n.strip().strip("'") for n in found.group(1).split(",")] if found else []


def run(scratch, base, revert_args, rules):
    def git(*args):
        return subprocess.run(["git", "-C", scratch, "-c", "user.name=revert-check",
                               "-c", "user.email=revert-check@localhost", "-c", "core.editor=true", *args],
                              capture_output=True, text=True)

    git("revert", "--abort")
    git("reset", "-q", "--hard", base)
    git("clean", "-qfd")
    base_list = listed_sources(scratch)

    def expected():
        # A revert only removes sources: the base's list without the files no longer present.
        return [n for n in base_list if os.path.exists(os.path.join(scratch, SRC_DIR, n))]

    out = git("revert", "--no-edit", *revert_args)
    stops = []
    result = {}
    while out.returncode != 0:
        conflicts = git("diff", "--name-only", "--diff-filter=U").stdout.split()
        stops.append({"commit": git("rev-parse", "REVERT_HEAD").stdout.strip(), "conflicts": conflicts})
        if rules and not conflicts and not git("status", "--porcelain").stdout.strip():
            out = git("revert", "--skip")  # the ledger rule left nothing to revert in this commit
            continue
        if not rules or not conflicts or any(c not in (CLI_TEST, ADOPT) for c in conflicts):
            result = {"outcome": "conflict"}
            break
        if ADOPT in conflicts:
            git("checkout", "--ours", ADOPT)
            git("add", ADOPT)
        if CLI_TEST in conflicts:
            path = os.path.join(scratch, CLI_TEST)
            listed = "expect(sources).toEqual([" + ", ".join(f"'{n}'" for n in expected()) + "]);"
            text = CONFLICT_RE.sub(lambda m: m.group(1) + listed + "\n", open(path).read())
            if "<<<<<<<" in text:
                result = {"outcome": "conflict outside the source list"}
                break
            open(path, "w").write(text)
            git("add", CLI_TEST)
        if not git("status", "--porcelain").stdout.strip():
            out = git("revert", "--skip")
        else:
            out = git("revert", "--continue")
    else:
        result = {"outcome": "applied"}
    if result["outcome"] == "applied" and rules:
        got, want = listed_sources(scratch), expected()
        result["listMatchedBeforeFixup"] = got == want
        if got != want:
            # The list rule's last step: name exactly the base's sources still present.
            result["fixupDropped"] = sorted(set(got) - set(want))
            result["fixupAdded"] = sorted(set(want) - set(got))
            path = os.path.join(scratch, CLI_TEST)
            text = LIST_RE.sub("expect(sources).toEqual([" + ", ".join(f"'{n}'" for n in want) + "]);",
                               open(path).read(), count=1)
            open(path, "w").write(text)
        result["listMatchesAfterFixup"] = listed_sources(scratch) == want
    git("revert", "--abort")
    return {**result, "stops": stops}


def main():
    repo, scratch, out_path = sys.argv[1:4]
    head = subprocess.run(["git", "-C", repo, "rev-parse", "origin/main"],
                          capture_output=True, text=True, check=True).stdout.strip()
    if not os.path.isdir(scratch):
        subprocess.run(["git", "clone", "-q", "--shared", "--no-checkout", repo, scratch], check=True)
    results = []
    for row, spec in ROWS.items():
        full = pr_commits(spec["pr"])
        results.append({"row": row, "form": "stated", "base": spec["merge"], "revert": spec["stated"],
                        **run(scratch, spec["merge"], spec["stated"], rules=False)})
        results.append({"row": row, "form": "stated", "base": head, "revert": spec["stated"],
                        **run(scratch, head, spec["stated"], rules=False)})
        results.append({"row": row, "form": "full list with A-327 rules", "base": spec["merge"], "revert": full,
                        **run(scratch, spec["merge"], full, rules=True)})
    with open(out_path, "w") as fh:
        json.dump({"script": "docs/evidence/syzygy-5dhm-137/check_row_reverts.py", "originMain": head,
                   "results": results}, fh, indent=2)
        fh.write("\n")
    for r in results:
        print(r["row"], r["form"], r["base"][:10], r["outcome"], r.get("listMatchesAfterFixup", ""),
              r.get("fixupDropped", ""),
              [s["conflicts"] for s in r["stops"]])


if __name__ == "__main__":
    main()
