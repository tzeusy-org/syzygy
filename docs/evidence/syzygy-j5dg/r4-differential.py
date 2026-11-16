#!/usr/bin/env python3
"""Independent R4 differential: main vs head of check_spec_reconciliation.py.

Each case creates entries in decisions/ of both worktrees, runs each mode
under a timeout and a 3 GiB address-space limit, classifies the outcome,
then removes the entries and asserts the tree is clean.
"""
import json, os, resource, shutil, subprocess, sys, threading, time, hashlib
from pathlib import Path

S = Path(sys.argv[1])
TREES = {"main": S / "wt-main", "head": S / "wt-head"}
DEC = ".syzygy/governance/decisions"
MODES = ("--check", "--census", "--regenerate")
TIMEOUT = 25


class Writer:
    """Serves one finite stream per reader open, until stopped."""
    TEXT = b"A finite stream naming no package.\n"

    def __init__(self, path):
        self.path, self.stop_ev = str(path), threading.Event()
        self.t = threading.Thread(target=self.serve, daemon=True)
        self.t.start()

    def serve(self):
        while not self.stop_ev.is_set():
            try:
                fd = os.open(self.path, os.O_WRONLY)
            except OSError:
                return
            try:
                if not self.stop_ev.is_set():
                    os.write(fd, self.TEXT)
            except BrokenPipeError:
                pass
            finally:
                os.close(fd)
            time.sleep(0.05)

    def stop(self):
        self.stop_ev.set()
        try:
            os.close(os.open(self.path, os.O_RDONLY | os.O_NONBLOCK))
        except OSError:
            pass
        self.t.join(3)


def mk_fifo(p, writer):
    os.mkfifo(p)
    return [Writer(p)] if writer else []


def mk_symfifo(p, writer):
    target = p.parent / ("_" + p.name + ".target")
    os.mkfifo(target)
    p.symlink_to(target.name)
    return [Writer(target)] if writer else []


def mk_dir(p):
    p.mkdir(); return []


def mk_unreadable(p):
    p.write_text("Package: none\n", encoding="utf-8"); p.chmod(0); return []


def mk_badutf8(p):
    p.write_bytes(b"Package: \xff\n"); return []


def mk_devzero(p):
    p.symlink_to("/dev/zero"); return []


A, Z = "A-J5DGR4-SIGNOFF-v1.0.md", "ZZ-J5DGR4-SIGNOFF-v1.0.md"
CASES = {
    "fifo-live-writer": [(A, lambda p: mk_fifo(p, True))],
    "fifo-no-writer": [(A, lambda p: mk_fifo(p, False))],
    "symlink-to-fifo-live-writer": [(A, lambda p: mk_symfifo(p, True))],
    "symlink-to-fifo-no-writer": [(A, lambda p: mk_symfifo(p, False))],
    "fifo-live-before-refused-dir": [(A, lambda p: mk_fifo(p, True)), (Z, mk_dir)],
    "fifo-nowriter-before-refused-dir": [(A, lambda p: mk_fifo(p, False)), (Z, mk_dir)],
    "refused-dir-before-fifo-live": [(A, mk_dir), (Z, lambda p: mk_fifo(p, True))],
    "refused-dir-before-fifo-nowriter": [(A, mk_dir), (Z, lambda p: mk_fifo(p, False))],
    "refused-dir-before-symfifo-nowriter": [(A, mk_dir), (Z, lambda p: mk_symfifo(p, False))],
    "directory": [(A, mk_dir)],
    "unreadable": [(A, mk_unreadable)],
    "invalid-utf8": [(A, mk_badutf8)],
    "refused-dir-before-devzero": [(A, mk_dir), (Z, mk_devzero)],
    "devzero-alone": [(A, mk_devzero)],
    "refused-dir-before-ptmx": [(A, mk_dir), (Z, lambda p: (p.symlink_to("/dev/ptmx"), [])[1])],
    "ptmx-alone": [(A, lambda p: (p.symlink_to("/dev/ptmx"), [])[1])],
    "refused-dir-before-regular-unreadable": [(A, mk_dir), (Z, mk_unreadable)],
}


def limit():
    lim = 3 * 1024 ** 3
    resource.setrlimit(resource.RLIMIT_AS, (lim, lim))


def classify(rc, out, err):
    if rc == "TIMEOUT":
        return "HANG"
    if "REFUSED R1" in err:
        return f"REFUSED(exit {rc})"
    if "Traceback" in err:
        last = [l for l in err.strip().splitlines() if l.strip()][-1]
        return f"CRASH(exit {rc}: {last.split(':')[0]})"
    return f"exit {rc}"


def run_mode(tree, mode):
    t0 = time.time()
    try:
        p = subprocess.run([sys.executable, "scripts/check_spec_reconciliation.py", mode],
                           cwd=tree, capture_output=True, text=True,
                           timeout=TIMEOUT, preexec_fn=limit,
                           errors="replace")
        rc, out, err = p.returncode, p.stdout, p.stderr
    except subprocess.TimeoutExpired as e:
        rc, out, err = "TIMEOUT", "", ""
    err = "\n".join(l for l in err.splitlines()
                    if "SyntaxWarning" not in l and "`^(\\d+)" not in l)
    return {"rc": rc, "class": classify(rc, out, err),
            "stdout_sha": hashlib.sha256(out.encode()).hexdigest()[:16],
            "stdout_tail": out.strip().splitlines()[-1] if out.strip() else "",
            "stderr_tail": err.strip().splitlines()[-3:] if err.strip() else [],
            "secs": round(time.time() - t0, 1)}


def cleanup(tree, names):
    d = tree / DEC
    for n in list(names) + [f"_{n}.target" for n in names]:
        p = d / n
        if p.is_symlink() or p.is_file() or p.exists() and not p.is_dir():
            try: p.chmod(0o644)
            except OSError: pass
            p.unlink()
        elif p.is_dir():
            shutil.rmtree(p)
    st = subprocess.run(["git", "status", "--porcelain", "--ignored=no"], cwd=tree,
                        capture_output=True, text=True).stdout
    return st


rows = []
only = sys.argv[2:] or list(CASES)
for case in only:
    for mode in MODES:
        row = {"case": case, "mode": mode}
        for side, tree in TREES.items():
            writers = []
            names = [n for n, _ in CASES[case]]
            for n, setup in CASES[case]:
                writers += setup(tree / DEC / n)
            try:
                row[side] = run_mode(tree, mode)
            finally:
                for w in writers:
                    w.stop()
                row[side]["status_after"] = cleanup(tree, names)
        m, h = row["main"]["class"], row["head"]["class"]
        if m == h and row["main"]["stdout_sha"] == row["head"]["stdout_sha"]:
            v = "IDENTICAL"
        elif m.startswith("CRASH") and h.startswith("REFUSED"):
            v = "crash->REFUSED"
        elif m == "HANG" and h.startswith("REFUSED"):
            v = "hang->REFUSED"
        else:
            v = f"DIFFERENT"
        row["verdict"] = v
        rows.append(row)
        print(json.dumps({"case": case, "mode": mode, "verdict": v,
                          "main": m, "head": h,
                          "main_out": row["main"]["stdout_tail"][:60],
                          "head_out": row["head"]["stdout_tail"][:60],
                          "dirty": [row["main"]["status_after"], row["head"]["status_after"]]}),
              flush=True)
(S / ("diff714-rows" + ("-extra" if sys.argv[2:] else "") + ".jsonl")).write_text("".join(json.dumps(r) + "\n" for r in rows))
