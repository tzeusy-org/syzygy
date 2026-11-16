import hashlib, json, os, resource, subprocess, sys, threading
from pathlib import Path
S = Path(sys.argv[1]); which = sys.argv[2].split(",")
TREES = {"main": S / "main", "head": S / "head"}
D = ".syzygy/governance/decisions"
REC = f"{D}/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md"
def e(t, n="J5DG-X-SIGNOFF-v1.0.md"): return t / D / n
def rw(t, rel, f): p = t / rel; p.write_bytes(f(p.read_bytes()))
def all_recs(t, f):
    for p in sorted((t / D).glob("*-SIGNOFF-v*.md")): p.write_bytes(f(p.read_bytes()))
CASES = {
 "clean": lambda t: None,
 "symlink-devnull": lambda t: e(t).symlink_to("/dev/null"),
 "symlink-regular-file": lambda t: ((t/"J5DG-T.txt").write_text("no package\n"), e(t).symlink_to(t/"J5DG-T.txt")),
 "symlink-to-real-record": lambda t: e(t, "POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v9.9.md").symlink_to(t/REC),
 "crlf-one": lambda t: rw(t, REC, lambda b: b.replace(b"\n", b"\r\n")),
 "crlf-all": lambda t: all_recs(t, lambda b: b.replace(b"\n", b"\r\n")),
 "bom-one": lambda t: rw(t, REC, lambda b: b"\xef\xbb\xbf" + b),
 "trailing-cr": lambda t: rw(t, REC, lambda b: b + b"\r"),
 "bare-cr-one": lambda t: rw(t, REC, lambda b: b.replace(b"\n", b"\r")),
 "version-line-cr": lambda t: rw(t, REC, lambda b: b.replace(b"\nVersion: ", b"\r\nVersion: ", 1).replace(b"Version: 1.1\n", b"Version: 1.1\r\n", 1)),
 "u2028-in-record": lambda t: rw(t, REC, lambda b: b.replace(b"\n", " ".encode() + b"\n", 1)),
 "empty-regular": lambda t: e(t).write_bytes(b""),
 "hardlink-record": lambda t: os.link(t/REC, e(t, "POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v9.8.md")),
 "symlink-to-directory": lambda t: e(t).symlink_to(t / D),
 "directory": lambda t: e(t).mkdir(),
 "symlink-to-fifo": lambda t: (os.mkfifo(t/"J5DG-FIFO"), e(t).symlink_to(t/"J5DG-FIFO")),
 "not-utf8": lambda t: e(t).write_bytes(b"Package: \xff\n"),
 "utf16-bom": lambda t: e(t).write_bytes("Package: x\n".encode("utf-16")),
 "symlink-dev-zero": lambda t: e(t).symlink_to("/dev/zero"),
 "fifo-no-writer": lambda t: os.mkfifo(e(t)),
 "fifo-live-writer": lambda t: os.mkfifo(e(t)),
}
# Round 3 F6: a FIFO whose writer supplies a finite stream to each reader.
LIVE = {"fifo-live-writer"}
TEXT = b"A finite stream naming no package.\n"
class Writer:
    def __init__(self, path):
        self.path, self.stop_ = path, threading.Event()
        self.th = threading.Thread(target=self.serve, daemon=True); self.th.start()
    def serve(self):
        while not self.stop_.is_set():
            try: fd = os.open(self.path, os.O_WRONLY)
            except OSError: return
            try:
                if not self.stop_.is_set(): os.write(fd, TEXT)
            except BrokenPipeError: pass
            finally: os.close(fd)
    def stop(self):
        self.stop_.set()
        try: os.close(os.open(self.path, os.O_RDONLY | os.O_NONBLOCK))
        except OSError: pass
        self.th.join(5)
def unfifo(t):
    # git clean leaves a FIFO in place; remove the case's own FIFO entry.
    import stat as _st
    try:
        if _st.S_ISFIFO(e(t).lstat().st_mode): e(t).unlink()
    except FileNotFoundError: pass
def lim(): resource.setrlimit(resource.RLIMIT_AS, (3 << 30, 3 << 30))
def norm(err): return "\n".join(l for l in err.splitlines() if "SyntaxWarning" not in l and "`^(\\d+)" not in l)
def run_tree(name, case, out):
    t = TREES[name]; res = {}
    for mode in ("--check", "--census", "--regenerate"):
        subprocess.run(["git", "checkout", "-q", "--", "."], cwd=t); subprocess.run(["git", "clean", "-fdq"], cwd=t); (t/"J5DG-FIFO").unlink(missing_ok=True); unfifo(t)
        CASES[case](t)
        w = Writer(e(t)) if case in LIVE else None
        try:
            p = subprocess.run([sys.executable, "scripts/check_spec_reconciliation.py", mode], cwd=t, capture_output=True, timeout=60, preexec_fn=lim)
            code, so, se = p.returncode, p.stdout, norm(p.stderr.decode(errors="replace"))
        except subprocess.TimeoutExpired:
            code, so, se = 124, b"", "TIMEOUT"
        if w: w.stop()
        st = subprocess.run(["git", "status", "--porcelain", "-uall"], cwd=t, capture_output=True).stdout
        dif = subprocess.run(["git", "diff", "--binary"], cwd=t, capture_output=True).stdout
        res[mode] = {"exit": code, "stdout": hashlib.sha256(so).hexdigest()[:16],
                     "stderr": hashlib.sha256(se.encode()).hexdigest()[:16],
                     "tree": hashlib.sha256(st + dif).hexdigest()[:16],
                     "crash": ("Traceback" in se) or code == 124,
                     "refused": "REFUSED R1" in se, "tail": (so.decode(errors="replace").strip().splitlines() or [""])[-1][:90] if code != 124 else "TIMEOUT",
                     "errtail": se.strip().splitlines()[-1][:120] if se.strip() else ""}
    subprocess.run(["git", "checkout", "-q", "--", "."], cwd=t); subprocess.run(["git", "clean", "-fdq"], cwd=t); (t/"J5DG-FIFO").unlink(missing_ok=True); unfifo(t)
    out[name] = res
for case in which:
    out = {}
    th = [threading.Thread(target=run_tree, args=(n, case, out)) for n in TREES]
    [x.start() for x in th]; [x.join() for x in th]
    for mode in ("--check", "--census", "--regenerate"):
        m, h = out["main"][mode], out["head"][mode]
        same = all(m[k] == h[k] for k in ("exit", "stdout", "stderr", "tree"))
        if same: verdict = "IDENTICAL (hangs on both)" if m["exit"] == 124 else "IDENTICAL"
        elif m["crash"] and h["exit"] == 1 and h["refused"] and not h["crash"]: verdict = "crash->REFUSED"
        elif m["crash"] and h["crash"]: verdict = "both-crash"
        else: verdict = "DIFFERENT"
        print(json.dumps({"case": case, "mode": mode, "verdict": verdict, "main": [m["exit"], m["stdout"], m["tail"], m["errtail"]], "head": [h["exit"], h["stdout"], h["tail"], h["errtail"]], "tree_same": m["tree"] == h["tree"]}), flush=True)
