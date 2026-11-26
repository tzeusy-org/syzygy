"""A trace-keyed, cross-case cache for the P115 reference `is_signed` (syzygy-offm).

The reconciliation selftest asks `is_signed(root)` once per case tree, and
almost every case tree differs from its clean start in a file `is_signed` never
reads. Its answer depends on more than file bytes, though: on `stat`/`lstat`
results, directory listings, Git objects outside the tree, and possibly the
clock or the environment. So the key is not a declared list of inputs but the
inputs one clean call was *observed* to take.

`prime(roots, is_signed)` runs `is_signed` once per clean root under hooks that
record every input observation:

- bytes read: the `open` audit event (every `open`, `io.open`, `os.open`);
- `stat`/`lstat`/`fstat`/`readlink`/`getcwd`: wrappers on those `os` functions
  (`os.path` and `pathlib` reach them through the module attribute). A wrapped
  `stat` returns a view that admits `st_mode` and `st_size`, the fields
  recorded; reading any other field (a time, an inode) makes the trace unusable;
- listings: the `os.listdir`/`os.scandir` audit events, each entry with its kind
  with and without following symlinks;
- subprocesses: a `subprocess.Popen` wrapper. Only `git` is admitted. Each call
  is keyed by its normalized argv, directory, environment and stdin; its value
  is the state of every repository it can reach (`_git_value`). A call outside
  the trace's own temporary directories must be a read-only subcommand.

A write outside the trace's own temporary directories, a symlink or hard link,
any other subprocess, a clock, random or environment read, or any audit event
the trace does not handle makes the trace unusable, and nothing is cached
(`Trace.unusable`). The proof that nothing escapes the hooks is the audit and
profile check: every audit event and every C call to a stat-family, clock or
random function, and every Python read of `os.environ`, is seen, and one not
made through a wrapper counts as unhooked (`Trace.unhooked`).

`signed(root, is_signed)` re-evaluates every recorded observation on `root`. If
all of them equal the trace's, the answer is the trace's; otherwise it runs
`is_signed`. The module globals of every non-standard-library module whose code
ran during the trace are part of the key too, so a monkeypatched function (the
selftest injects D10 states) misses. A deterministic sample of hits also runs
`is_signed` and raises if the answers differ, so every selftest re-checks the
cache against the stock call.

Paths are recorded relative to the traced root (`@R/...`), as the trace's own
temporary directories (not recorded: their contents are derived from recorded
inputs), or as absolute literals. A root that is not its own `realpath` is
never traced or looked up.
"""
from __future__ import annotations

import datetime
import functools
import hashlib
import io
import json
import os
import posix
import random
import re
import shutil
import stat as stat_mod
import subprocess
import sys
import sysconfig
import tempfile
import threading
import time
import types

# Both read once, at import, never during a trace. SIGNED_TRACE_CACHE=off
# leaves the cache unarmed (the stock run, for before/after comparisons).
STATS_PATH = os.environ.get("SIGNED_TRACE_STATS")
DISABLED = os.environ.get("SIGNED_TRACE_CACHE") == "off"
SAMPLE_SHIFT = 3  # one hit in 2**SAMPLE_SHIFT (by root basename) is re-run stock

ENTRIES = None  # list[Entry] while armed

_O = types.SimpleNamespace(
    stat=os.stat, lstat=os.lstat, fstat=os.fstat, readlink=os.readlink,
    getcwd=os.getcwd, listdir=os.listdir, scandir=os.scandir, open=io.open,
    popen=subprocess.Popen, mkdtemp=tempfile.mkdtemp,
    mkstemp_inner=tempfile._mkstemp_inner, rmtree=shutil.rmtree)

_STDLIB = tuple({os.path.realpath(sysconfig.get_paths()[k]) + os.sep
                 for k in ("stdlib", "platstdlib")})
_SELF = os.path.realpath(__file__)

_STAT_FIELDS = frozenset({"st_mode", "st_size"})

# Audit events the trace understands. Writes name the indices of the path
# arguments that must lie inside the trace's own temporary directories.
_WRITE_EVENTS = {
    "os.mkdir": (0,), "os.rmdir": (0,), "os.remove": (0,), "os.rename": (0, 1),
    "os.truncate": (0,), "os.chmod": (0,), "os.chown": (0,), "os.utime": (0,),
    "os.chflags": (0,), "os.lchflags": (0,), "os.lchmod": (0,), "os.mkfifo": (0,),
    "os.mknod": (0,), "os.setxattr": (0,), "os.removexattr": (0,), "os.chdir": (0,),
    "shutil.copyfile": (1,), "shutil.copymode": (1,), "shutil.copystat": (1,),
    "shutil.copytree": (1,), "shutil.rmtree": (0,), "shutil.move": (0, 1),
    "shutil.chown": (0,),
}
_BENIGN_EVENTS = frozenset({
    "import", "compile", "exec", "sys._getframe", "sys._getframemodulename",
    "object.__getattr__", "object.__setattr__", "object.__delattr__",
    "code.__new__", "function.__new__", "marshal.loads", "marshal.load",
    "marshal.dumps", "builtins.id", "glob.glob", "glob.glob/2",
    "pathlib.Path.glob", "pathlib.Path.rglob", "os.walk", "os.fwalk",
})
_HANDLED_EVENTS = frozenset({"open", "os.listdir", "os.scandir", "subprocess.Popen"})

# C functions that read inputs no audit event announces. Called outside a
# wrapper, each is unhooked I/O or a nondeterministic input.
_UNHOOKED_C = {posix.stat, posix.lstat, posix.fstat, posix.readlink,
               posix.getcwd, posix.getcwdb, posix.access, posix.statvfs,
               posix.urandom, posix.getpid}
_UNHOOKED_C.update(f for f in (getattr(posix, n, None) for n in (
    "listxattr", "getxattr", "fstatvfs", "getrandom", "times")) if f)
_CLOCK_C = {time.time, time.time_ns, time.monotonic, time.monotonic_ns,
            time.perf_counter, time.perf_counter_ns, time.process_time,
            time.process_time_ns, time.thread_time, time.thread_time_ns,
            time.localtime, time.gmtime, time.ctime, time.asctime,
            time.strftime, time.sleep}
_CLOCK_METHODS = {(datetime.datetime, "now"), (datetime.datetime, "utcnow"),
                  (datetime.datetime, "today"), (datetime.date, "today")}
_RANDOM_TYPES = (random.Random,)
_ENV_FILES = {os.path.realpath(os.__file__)}
_ENV_FILES.update(os.path.realpath(m.__file__) for m in (
    sys.modules.get("_collections_abc"),) if m and getattr(m, "__file__", None))

_HEX = re.compile(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})(?:\^\{(?:commit|tree|)\}|\^0)?$")


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class Unusable(Exception):
    pass


# ---------------------------------------------------------------- observations

def _kind(path, follow):
    try:
        st = (_O.stat if follow else _O.lstat)(path)
    except OSError as exc:
        return ("err", exc.errno)
    return (stat_mod.S_IFMT(st.st_mode), stat_mod.S_IMODE(st.st_mode), st.st_size)


def _read(path):
    try:
        with _O.open(path, "rb") as handle:
            return ("bytes", _sha(handle.read()))
    except OSError as exc:
        return ("err", exc.errno)


def _listing(path):
    try:
        names = sorted(_O.listdir(path))
    except OSError as exc:
        return ("err", exc.errno)
    return tuple((n, _kind(os.path.join(path, n), False)[0],
                  _kind(os.path.join(path, n), True)[0]) for n in names)


def _readlink(path):
    try:
        return ("link", _O.readlink(path))
    except OSError as exc:
        return ("err", exc.errno)


def _discover(start):
    """What Git's repository discovery sees from `start` upward (literal paths)."""
    seen, path = [], start
    while True:
        dotgit = os.path.join(path, ".git")
        kind = _kind(dotgit, False)[0]
        entry = [path, kind]
        if kind == stat_mod.S_IFREG:
            entry.append(_read(dotgit))
        bare = tuple(_kind(os.path.join(path, n), False)[0]
                     for n in ("HEAD", "objects", "refs"))
        entry.append(bare)
        seen.append(tuple(entry))
        if kind != ("err") and kind in (stat_mod.S_IFDIR, stat_mod.S_IFREG):
            return tuple(seen), _gitdir_of(dotgit, kind)
        if bare[0] == stat_mod.S_IFREG and bare[1] == bare[2] == stat_mod.S_IFDIR:
            return tuple(seen), path
        parent = os.path.dirname(path)
        if parent == path or os.path.ismount(path):
            return tuple(seen), None
        path = parent


def _gitdir_of(dotgit, kind):
    if kind == stat_mod.S_IFDIR:
        return dotgit
    try:
        with _O.open(dotgit, "r", encoding="utf-8") as handle:
            text = handle.read().strip()
    except OSError:
        return None
    if not text.startswith("gitdir: "):
        return None
    target = text[len("gitdir: "):]
    return os.path.normpath(os.path.join(os.path.dirname(dotgit), target))


def _tree_files(top):
    """Every file under `top` with its bytes digest (a listing of refs)."""
    out = []
    for dirpath, dirnames, filenames in os.walk(top):
        dirnames.sort()
        for name in sorted(filenames):
            full = os.path.join(dirpath, name)
            out.append((os.path.relpath(full, top), _read(full)))
    return tuple(out)


def _repo_state(gitdir, level):
    """The repository state a Git read can depend on.

    Object-only calls (every revision a full object name) depend on the
    object store, which is content-addressed, so they key on the configuration,
    replacement refs, grafts, shallow and alternates; existence of the named
    objects is its own observation (`oids`). Every other call keys on all refs,
    HEAD, the index and the object listing too.
    """
    common = gitdir
    commonfile = os.path.join(gitdir, "commondir")
    if _kind(commonfile, False)[0] == stat_mod.S_IFREG:
        with _O.open(commonfile, "r", encoding="utf-8") as handle:
            common = os.path.normpath(os.path.join(gitdir, handle.read().strip()))
    state = {"gitdir": gitdir, "common": common}
    for name in ("config", "shallow", "info/grafts", "objects/info/alternates",
                 "info/attributes"):
        state[name] = _read(os.path.join(common, name))
    state["config.worktree"] = _read(os.path.join(gitdir, "config.worktree"))
    state["replace"] = _tree_files(os.path.join(common, "refs", "replace"))
    packed = _read_bytes(os.path.join(common, "packed-refs"))
    state["packed-replace"] = _sha(b"\n".join(
        line for line in packed.splitlines() if b" refs/replace/" in line))
    if level == "head":
        state["HEAD"] = _head(gitdir, common, packed)
    if level == "read":
        state["HEAD"] = _read(os.path.join(gitdir, "HEAD"))
        state["index"] = _read(os.path.join(gitdir, "index"))
        state["packed-refs"] = _sha(packed)
        state["refs"] = _tree_files(os.path.join(common, "refs"))
        if gitdir != common:
            state["worktree-refs"] = _tree_files(os.path.join(gitdir, "refs"))
        objects = os.path.join(common, "objects")
        state["objects"] = tuple(
            (d, _listing(os.path.join(objects, d))) for d in sorted(_O.listdir(objects))
        ) if _kind(objects, True)[0] == stat_mod.S_IFDIR else ("err",)
    return tuple(sorted(state.items()))


def _head(gitdir, common, packed):
    """What HEAD names: its own bytes and, when symbolic, the ref's value."""
    head = _read_bytes(os.path.join(gitdir, "HEAD")).strip()
    if not head.startswith(b"ref: "):
        return ("detached", _sha(head))
    ref = head[5:].decode("utf-8", "surrogateescape")
    loose = _read(os.path.join(common, ref))
    lines = [line for line in packed.splitlines() if line.endswith(b" " + ref.encode())]
    return ("ref", ref, loose, _sha(b"\n".join(lines)))


def _read_bytes(path):
    try:
        with _O.open(path, "rb") as handle:
            return handle.read()
    except OSError:
        return b""


@functools.lru_cache(maxsize=None)
def _git_binary(path_env):
    for directory in path_env.split(os.pathsep):
        candidate = os.path.join(directory or ".", "git")
        if os.access(candidate, os.X_OK) and not os.path.isdir(candidate):
            return candidate, _read(candidate)
    return None, None


def _git_globals(env):
    home = env.get("HOME", "")
    xdg = env.get("XDG_CONFIG_HOME") or os.path.join(home, ".config")
    files = [os.path.join(home, ".gitconfig"), os.path.join(xdg, "git", "config"),
             os.path.join(xdg, "git", "attributes"), os.path.join(xdg, "git", "ignore"),
             "/etc/gitconfig", "/etc/gitattributes"]
    return (_git_binary(env.get("PATH", os.defpath)),
            tuple((f, _read(f)) for f in files))


# Read-only Git subcommands admitted outside the trace's temporary
# directories, each with the options it may carry. `oids` is how many
# revisions it takes when it is object-only (None: any number).
_READ_ONLY = {
    "show": ({"--no-patch", "--format=%H", "-s"}, None),
    "cat-file": ({"-p", "-t", "-s", "-e", "blob", "tree", "commit", "tag"}, None),
    "merge-base": ({"--is-ancestor"}, None),
    "rev-parse": ({"--verify", "-q", "--quiet", "--show-object-format"}, None),
    "diff": ({"--name-only", "--name-status", "-z", "--no-renames"}, 2),
    "ls-tree": ({"-r", "-z", "--name-only", "-t"}, 1),
    "ls-files": ({"-v", "-f", "-s", "--stage", "-z"}, None),
    "log": ({"--diff-filter=", "--format=", "--pretty=", "-z", "--no-renames",
             "--name-only", "-1", "--reverse", "--first-parent"}, None),
}
_GLOBAL_FLAGS = {"--no-optional-locks", "--no-pager"}


def _parse_git(argv):
    """(directories, subcommand, options, arguments) of a git argv, or None."""
    dirs, i = [], 1
    while i < len(argv):
        a = argv[i]
        if a == "-C" and i + 1 < len(argv):
            dirs.append(argv[i + 1])
            i += 2
        elif a == "-c" and i + 1 < len(argv):
            i += 2
        elif a in _GLOBAL_FLAGS:
            i += 1
        elif a.startswith("-"):
            return None
        else:
            break
    if i >= len(argv):
        return None
    sub, rest = argv[i], argv[i + 1:]
    options = [a for a in rest if a.startswith("-") and a != "--"]
    if "--" in rest:
        cut = rest.index("--")
        args, paths = [a for a in rest[:cut] if not a.startswith("-")], rest[cut + 1:]
    else:
        args, paths = [a for a in rest if not a.startswith("-")], []
    return dirs, sub, options, args, paths


def _git_class(argv):
    """'objects' (object-only read), 'read' (any other read) or None (not admitted)."""
    parsed = _parse_git(argv)
    if parsed is None:
        return None, ()
    _dirs, sub, options, args, paths = parsed
    if sub not in _READ_ONLY:
        return None, ()
    allowed, count = _READ_ONLY[sub]
    words = [a for a in args if a in allowed]
    revs = [a for a in args if a not in allowed]
    if any(o not in allowed and o.split("=", 1)[0] + "=" not in allowed
           for o in options):
        return None, ()
    if sub == "ls-files":
        return ("read", ()) if not revs else (None, ())
    if sub == "diff" and len(revs) != 2:
        return None, ()
    names = [n for r in revs for n in r.split(":", 1)[0].split("..")]
    if words and sub != "cat-file":
        return None, ()
    if count is not None and len(names) != count:
        return None, ()
    oids = tuple(re.sub(r"\^.*$", "", n) for n in names if _HEX.match(n))
    if len(oids) == len(names):
        return "objects", oids
    if all(_HEX.match(n) or n == "HEAD" for n in names):
        return "head", oids
    return "read", ()


# ---------------------------------------------------------------- the trace

class _StatView:
    """A stat result that admits only the recorded fields."""
    __slots__ = ("_real", "_trace", "_fields")

    def __init__(self, real, trace, fields=_STAT_FIELDS):
        self._real, self._trace, self._fields = real, trace, fields

    def __getattr__(self, name):
        if name not in self._fields and self._trace.active():
            self._trace.fail(f"stat field {name} read")
        return getattr(self._real, name)

    def __getitem__(self, index):
        if self._trace.active():
            self._trace.fail("stat result indexed")
        return self._real[index]


class Trace:
    def __init__(self, root):
        self.root = os.path.abspath(os.fspath(root))
        self.obs = {}
        self.internal = []   # the trace's own temporary directories and files
        self.internal_fds = set()
        self.unusable = []   # reasons, in order
        self.unhooked = []   # events and calls seen outside a wrapper
        self.executed = set()
        self.thread = threading.get_ident()
        self.depth = 0
        self.on = False
        self.pending = {}    # Popen id -> key prefix awaiting stdin

    def active(self):
        return self.on and self.depth == 0 and threading.get_ident() == self.thread

    def fail(self, reason):
        if reason not in self.unusable:
            self.unusable.append(reason)

    def unhook(self, what):
        self.unhooked.append(what)
        self.fail(f"unhooked: {what}")

    # A path as a key: '@R/rel', None (internal), or an absolute literal.
    def key(self, path):
        if isinstance(path, int):
            return None if path in self.internal_fds else ("fd", path)
        p = os.fsdecode(os.fspath(path))
        if not os.path.isabs(p):
            p = os.path.join(_O.getcwd(), p)
        p = os.path.normpath(p)
        for d in self.internal:
            if p == d or p.startswith(d + os.sep):
                return None
        if p == self.root:
            return "@R"
        if p.startswith(self.root + os.sep):
            return "@R/" + p[len(self.root) + 1:]
        return p

    def norm_text(self, text):
        for n, d in enumerate(self.internal):
            text = text.replace(d, f"@T{n}")
        return text.replace(self.root, "@R")

    def record(self, kind, key, value):
        k = (kind, key) if not isinstance(key, tuple) else (kind,) + key
        if k in self.obs and self.obs[k] != value:
            self.fail(f"{kind} {key} changed during the call")
        self.obs[k] = value


def _resolve(key, root):
    if key == "@R":
        return root
    if key.startswith("@R/"):
        return os.path.join(root, key[3:])
    return key


def _evaluate(obs_key, root, memo):
    """The value of one observation, evaluated afresh on `root`."""
    if obs_key in memo:
        return memo[obs_key]
    kind = obs_key[0]
    if kind == "read":
        value = _read(_resolve(obs_key[1], root))
    elif kind in ("stat", "lstat"):
        value = _kind(_resolve(obs_key[1], root), kind == "stat")
    elif kind == "list":
        value = _listing(_resolve(obs_key[1], root))
    elif kind == "readlink":
        value = _readlink(_resolve(obs_key[1], root))
    elif kind == "cwd":
        value = _O.getcwd()
    elif kind == "env":
        value = _env_digest()
    elif kind == "git":
        value = _git_value(obs_key, root)
    elif kind == "oids":
        value = _oids_value(obs_key[1], obs_key[2], root)
    else:
        raise Unusable(f"unknown observation {kind}")
    memo[obs_key] = value
    return value


def _git_value(obs_key, root):
    """Every repository and file a git call can reach, for its normalized key."""
    _kind_, argv, cwd, env_digest, _stdin, cls = obs_key
    parsed = _parse_git(list(argv))
    start = cwd
    for d in (parsed[0] if parsed else ()):
        start = d if os.path.isabs(d) or d.startswith("@") else os.path.join(start, d)
    out = []
    places = [start] + [a for a in argv[1:] if a.startswith(("/", "@R"))]
    for place in places:
        if place.startswith("@T"):
            # Inside the trace's own temporary directory: discovery from the
            # first directory above it that the trace does not own.
            out.append(("internal", place.split("/", 1)[0]))
            continue
        path = _resolve(place, root)
        if _kind(path, True)[0] == stat_mod.S_IFREG:
            out.append(("file", place, _read(path)))
            continue
        chain, gitdir = _discover(path)
        state = _repo_state(gitdir, cls) if gitdir else None
        out.append(_under_root(("repo", place, chain, state), root))
    environ = dict(os.environ)
    inherited = (_sha(json.dumps(sorted(environ.items())).encode())
                 if env_digest == "inherit" else env_digest)
    return tuple(out), inherited, _git_globals(environ)


def _under_root(value, root):
    """`value` with every path inside `root` written relative to it (`@R`)."""
    if isinstance(value, str):
        if value == root:
            return "@R"
        return "@R/" + value[len(root) + 1:] if value.startswith(root + os.sep) else value
    if isinstance(value, tuple):
        return tuple(_under_root(v, root) for v in value)
    return value


def _oids_value(repo_key, oids, root):
    """Which of the named objects exist, as `git cat-file --batch-check` says."""
    path = _resolve(repo_key, root)
    _chain, gitdir = _discover(path)
    if gitdir is None:
        return ("no-repo",)
    done = _O.popen(["git", "--git-dir", gitdir, "cat-file", "--batch-check"],
                    stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                    stderr=subprocess.DEVNULL)
    out, _err = done.communicate("\n".join(oids).encode() + b"\n")
    return (done.returncode, _sha(out))


# The trace that is running, if any; the hooks below read it.
_ACTIVE = None


def _audit(event, args):
    trace = _ACTIVE
    if trace is None or not trace.on or threading.get_ident() != trace.thread:
        return
    if trace.depth:
        return
    trace.depth += 1
    try:
        _audit_event(trace, event, args)
    except Exception as exc:  # never let the hook change the traced call
        trace.fail(f"audit hook error on {event}: {exc!r}")
    finally:
        trace.depth -= 1


def _audit_event(trace, event, args):
    if event == "open":
        path, mode, flags = (tuple(args) + (None, None))[:3]
        if path is None:
            return
        if isinstance(mode, str):
            write = any(c in mode for c in "wax+")
        else:
            write = bool((flags or 0) & (os.O_WRONLY | os.O_RDWR | os.O_CREAT
                                          | os.O_TRUNC | os.O_APPEND))
        key = trace.key(path)
        if key is None:
            return
        if isinstance(key, tuple):
            trace.fail(f"open of an untracked descriptor {key}")
        elif write:
            trace.fail(f"write outside the trace's temporary directories: {key}")
        else:
            trace.record("read", key, _read(_resolve(key, trace.root)))
    elif event in ("os.listdir", "os.scandir"):
        path = args[0] if args and args[0] is not None else "."
        key = trace.key(path)
        if key is None:
            return
        if isinstance(key, tuple):
            trace.fail(f"listing of an untracked descriptor {key}")
        else:
            trace.record("list", key, _listing(_resolve(key, trace.root)))
    elif event == "subprocess.Popen":
        trace.unhook("subprocess.Popen outside the wrapper")
    elif event in _WRITE_EVENTS:
        for index in _WRITE_EVENTS[event]:
            if index < len(args) and trace.key(args[index]) is not None:
                trace.fail(f"{event} outside the trace's temporary directories: "
                           f"{trace.key(args[index])}")
    elif event in _BENIGN_EVENTS:
        return
    elif event.startswith("tempfile."):
        trace.unhook(f"{event} outside the wrapper")
    else:
        trace.unhook(event)


_ENV_CODES = frozenset(
    getattr(os._Environ, n).__code__ for n in dir(os._Environ)
    if isinstance(getattr(os._Environ, n, None), types.FunctionType))
_MON = sys.monitoring
_EVENTS = _MON.events.PY_START | _MON.events.CALL


def _env_digest():
    return _sha(json.dumps(sorted(os.environ.items())).encode("utf-8", "surrogateescape"))


def _on_start(code, offset):
    """Every Python function the traced call starts: its file, and env reads."""
    trace = _ACTIVE
    if trace is None or not trace.on or trace.depth:
        return None
    trace.depth += 1
    try:
        if code in _ENV_CODES:
            frame = sys._getframe(1)
            target = frame.f_locals.get("self")
            if target is os.environ or target is getattr(os, "environb", None):
                # The whole environment becomes an input: a lookup whose
                # environment differs in any variable misses.
                trace.record("env", "environ", _env_digest())
            return None
        trace.executed.add(code.co_filename)
    except Exception as exc:  # never let the hook change the traced call
        trace.fail(f"monitor error: {exc!r}")
        return None
    finally:
        trace.depth -= 1
    return _MON.DISABLE   # one sighting per code object is all the file set needs


def _on_call(code, offset, function, arg0):
    trace = _ACTIVE
    if trace is None or not trace.on or trace.depth:
        return None
    trace.depth += 1
    try:
        _check_call(trace, code, function, arg0)
    except Exception as exc:  # never let the hook change the traced call
        trace.fail(f"monitor error: {exc!r}")
    finally:
        trace.depth -= 1
    return None


def _check_call(trace, code, function, arg0):
    """A call to a stat-family, clock or random function outside a wrapper."""
    try:
        sensitive = function in _UNHOOKED_C
    except TypeError:
        sensitive = False
    if sensitive and function is posix.stat and code.co_name == "_path_stat" \
            and code.co_filename.startswith("<frozen importlib") and isinstance(arg0, str):
        # importlib's own source/bytecode freshness check: the source and the
        # bytecode it then reads are recorded by their opens, so the stat is
        # recorded as an input like any other and admitted.
        key = trace.key(arg0)
        if key is not None:
            trace.record("stat", key, _kind(_resolve(key, trace.root), True))
        return None
    if sensitive:
        trace.unhook(f"C call {getattr(function, '__qualname__', function)} from "
                     f"{code.co_filename}:{code.co_name}")
        return None
    try:
        clock = function in _CLOCK_C
    except TypeError:
        clock = False
    if clock:
        trace.fail(f"clock read ({function.__name__})")
        return None
    if isinstance(function, (types.BuiltinMethodType, types.MethodDescriptorType,
                             types.ClassMethodDescriptorType)):
        # A bound method carries its owner; a method called through its
        # descriptor (`entry.stat()`) passes the owner as the first argument.
        owner = (function.__self__ if isinstance(function, types.BuiltinMethodType)
                 else arg0)
        name = function.__name__
        if any(owner is o and name == n for o, n in _CLOCK_METHODS):
            trace.fail(f"clock read ({name})")
        elif isinstance(owner, _RANDOM_TYPES):
            trace.fail(f"random read ({name})")
        elif type(owner).__name__ == "DirEntry" and name in ("stat", "inode"):
            trace.unhook(f"DirEntry.{name} from {code.co_filename}:{code.co_name}")
    return None


def _monitor_start():
    for tool in range(6):
        try:
            _MON.use_tool_id(tool, "signed_trace_cache")
        except ValueError:
            continue
        _MON.register_callback(tool, _MON.events.PY_START, _on_start)
        _MON.register_callback(tool, _MON.events.CALL, _on_call)
        _MON.restart_events()
        _MON.set_events(tool, _EVENTS)
        return tool
    raise Unusable("no free sys.monitoring tool id")


def _monitor_stop(tool):
    _MON.set_events(tool, 0)
    _MON.register_callback(tool, _MON.events.PY_START, None)
    _MON.register_callback(tool, _MON.events.CALL, None)
    _MON.free_tool_id(tool)


def _wrap_rmtree(trace, real):
    def rmtree(path, *args, **kwargs):
        if trace.active() and trace.key(path) is not None:
            trace.fail(f"rmtree outside the trace's temporary directories: {trace.key(path)}")
        trace.depth += 1
        try:
            return real(path, *args, **kwargs)
        finally:
            trace.depth -= 1
    return rmtree


def _wrap(trace, real, kind):
    def wrapper(path, *args, **kwargs):
        if not trace.active():
            return real(path, *args, **kwargs)
        trace.depth += 1
        try:
            follow = kwargs.get("follow_symlinks", True) and kind != "lstat"
            if kwargs.get("dir_fd") is not None:
                trace.fail(f"{kind} with dir_fd")
            if kind == "fstat":
                # A descriptor the traced call opened: its bytes are recorded
                # by the open, which fixes st_size; nothing else is admitted.
                pass
            elif kind == "getcwd":
                trace.record("cwd", "cwd", _O.getcwd())
            else:
                key = trace.key(path)
                if isinstance(key, tuple):
                    trace.fail(f"{kind} of a descriptor")
                elif key is not None:
                    if kind == "readlink":
                        trace.record("readlink", key, _readlink(_resolve(key, trace.root)))
                    else:
                        okind = "stat" if follow else "lstat"
                        trace.record(okind, key, _kind(_resolve(key, trace.root), follow))
            result = real(path, *args, **kwargs) if kind != "getcwd" else real()
        finally:
            trace.depth -= 1
        if kind in ("stat", "lstat"):
            return _StatView(result, trace)
        if kind == "fstat":
            return _StatView(result, trace, frozenset({"st_size"}))
        return result
    if kind == "getcwd":
        return lambda: wrapper(None)
    return wrapper


def _wrap_mkdtemp(trace):
    def mkdtemp(*args, **kwargs):
        trace.depth += 1
        try:
            path = _O.mkdtemp(*args, **kwargs)
        finally:
            trace.depth -= 1
        trace.internal.append(os.path.normpath(os.path.abspath(path)))
        return path
    return mkdtemp


def _wrap_mkstemp_inner(trace):
    def inner(*args, **kwargs):
        trace.depth += 1
        try:
            fd, name = _O.mkstemp_inner(*args, **kwargs)
        finally:
            trace.depth -= 1
        trace.internal.append(os.path.normpath(os.path.abspath(name)))
        trace.internal_fds.add(fd)
        return fd, name
    return inner


def _popen_class(trace):
    base = _O.popen

    class Popen(base):
        def __init__(self, args, *rest, **kwargs):
            if not trace.active():
                return base.__init__(self, args, *rest, **kwargs)
            trace.depth += 1
            try:
                prefix = _popen_key(trace, args, rest, kwargs)
                base.__init__(self, args, *rest, **kwargs)
            finally:
                trace.depth -= 1
            if prefix is not None:
                if kwargs.get("stdin") == subprocess.PIPE:
                    trace.pending[id(self)] = prefix
                else:
                    trace.depth += 1
                    try:
                        _record_git(trace, prefix, "")
                    finally:
                        trace.depth -= 1

        def communicate(self, input=None, timeout=None):
            prefix = trace.pending.pop(id(self), None)
            trace.depth += 1
            try:
                if prefix is not None:
                    data = input.encode() if isinstance(input, str) else (input or b"")
                    _record_git(trace, prefix, _sha(data))
                return base.communicate(self, input, timeout)
            finally:
                trace.depth -= 1

        def wait(self, timeout=None):
            trace.depth += 1
            try:
                return base.wait(self, timeout)
            finally:
                trace.depth -= 1

        def __exit__(self, *exc):
            trace.depth += 1
            try:
                return base.__exit__(self, *exc)
            finally:
                trace.depth -= 1
    return Popen


def _popen_key(trace, args, rest, kwargs):
    if kwargs.get("shell") or isinstance(args, (str, bytes)) or rest:
        trace.fail("subprocess with a shell, a string or positional options")
        return None
    argv = [os.fsdecode(os.fspath(a)) for a in args]
    if not argv or os.path.basename(argv[0]) != "git" or kwargs.get("executable"):
        trace.fail(f"non-git subprocess {argv[:1]}")
        return None
    cwd = kwargs.get("cwd")
    cwd_norm = trace.norm_text(os.path.normpath(os.path.join(_O.getcwd(), os.fsdecode(cwd)))) \
        if cwd is not None else trace.norm_text(_O.getcwd())
    norm = tuple(trace.norm_text(a) for a in argv)
    cls, oids = _git_class(argv)
    parsed = _parse_git(argv)
    start = cwd_norm
    for d in (parsed[0] if parsed else ()):
        start = trace.norm_text(d) if os.path.isabs(d) else os.path.join(start, d)
    internal_start = start.startswith("@T")
    if cls is None and not internal_start:
        trace.fail(f"git {parsed[1] if parsed else argv[1:2]} outside the trace's "
                   "temporary directories is not an admitted read")
        return None
    env = kwargs.get("env")
    if env is None:
        env_digest = "inherit"
    else:
        env_digest = _sha(json.dumps(sorted((k, trace.norm_text(str(v)))
                                            for k, v in env.items())).encode())
    if cls in ("objects", "head") and oids and not internal_start:
        trace.record("oids", (start, oids), None)
    return ("git", norm, cwd_norm, env_digest), cls if cls else "internal"


def _record_git(trace, prefix, stdin_digest):
    (kind, norm, cwd_norm, env_digest), cls = prefix
    key = (norm, cwd_norm, env_digest, stdin_digest, cls)
    trace.record("git", key, _git_value(("git",) + key, trace.root))


# ---------------------------------------------------------------- module state

def _module_files_snapshot(files):
    """Globals of every module whose code ran, by identity or by repr."""
    by_file = {}
    candidates = list(sys.modules.values())
    for module in list(candidates):
        for value in list(getattr(module, "__dict__", {}).values()):
            if isinstance(value, types.ModuleType):
                candidates.append(value)
    seen = set()
    for module in candidates:
        path = getattr(module, "__file__", None)
        if path and id(module) not in seen:
            seen.add(id(module))
            by_file.setdefault(os.path.realpath(path), []).append(module)
    snap, missing = [], []
    for path in sorted(files):
        real = os.path.realpath(path) if not path.startswith("<") else path
        if real == _SELF or real.startswith(_STDLIB) or path.startswith("<"):
            continue
        modules = by_file.get(real)
        if not modules:
            missing.append(path)
            continue
        for module in sorted(modules, key=lambda m: (m.__name__, id(m))):
            snap.append((real, module.__name__, id(module), _globals_sig(module)))
    return tuple(snap), missing


def _globals_sig(module):
    out = []
    for name, value in sorted(module.__dict__.items()):
        while hasattr(value, "__wrapped__") and isinstance(value, types.FunctionType):
            value = value.__wrapped__
        if isinstance(value, (types.FunctionType, types.BuiltinFunctionType, type,
                              types.ModuleType, types.MethodType, functools.partial)):
            out.append((name, "id", id(value)))
            continue
        try:
            text = repr(value)
        except Exception:
            out.append((name, "id", id(value)))
            continue
        out.append((name, "repr", _sha(text.encode("utf-8", "surrogatepass"))))
    return _sha(repr(out).encode())


class Entry:
    def __init__(self, trace, result, modules):
        self.root = trace.root
        self.obs = trace.obs
        self.result = result
        self.modules = modules


def _canonical(root):
    path = os.path.abspath(os.fspath(root))
    return path if os.path.realpath(path) == path else None


def trace_call(root, function):
    """Run `function(root)` under the hooks: (result, Trace). Raises what it raises."""
    global _ACTIVE
    trace = Trace(root)
    _install_audit()
    saved = (os.stat, os.lstat, os.fstat, os.readlink, os.getcwd,
             tempfile.mkdtemp, tempfile._mkstemp_inner, subprocess.Popen,
             shutil.rmtree)
    os.stat = _wrap(trace, _O.stat, "stat")
    os.lstat = _wrap(trace, _O.lstat, "lstat")
    os.fstat = _wrap(trace, _O.fstat, "fstat")
    os.readlink = _wrap(trace, _O.readlink, "readlink")
    os.getcwd = _wrap(trace, _O.getcwd, "getcwd")
    tempfile.mkdtemp = _wrap_mkdtemp(trace)
    tempfile._mkstemp_inner = _wrap_mkstemp_inner(trace)
    subprocess.Popen = _popen_class(trace)
    shutil.rmtree = _wrap_rmtree(trace, _O.rmtree)
    tool = _monitor_start()
    _ACTIVE = trace
    trace.on = True
    try:
        result = function(root)
    finally:
        trace.on = False
        _ACTIVE = None
        _monitor_stop(tool)
        (os.stat, os.lstat, os.fstat, os.readlink, os.getcwd,
         tempfile.mkdtemp, tempfile._mkstemp_inner, subprocess.Popen,
         shutil.rmtree) = saved
    if trace.pending:
        trace.fail("a git subprocess with piped stdin was never given its input")
    # Existence of the objects each object-only call named, per repository.
    oids = {}
    for key in [k for k in trace.obs if k[0] == "oids"]:
        oids.setdefault(key[1], set()).update(key[2])
        del trace.obs[key]
    for start, names in oids.items():
        key = ("oids", start, tuple(sorted(names)))
        trace.obs[key] = _evaluate(key, trace.root, {}) if not start.startswith("@T") else None
    return result, trace


_AUDIT_INSTALLED = False


def _install_audit():
    global _AUDIT_INSTALLED
    if not _AUDIT_INSTALLED:
        sys.addaudithook(_audit)   # permanent; inert while no trace is active
        _AUDIT_INSTALLED = True


def prime(roots, function):
    """Arm the cache with one traced `function(root)` per root."""
    global ENTRIES
    if DISABLED:
        ENTRIES = None
        return []
    entries = []
    for root in roots:
        if _canonical(root) is None:
            _stat_line({"event": "prime", "root": os.path.basename(str(root)),
                        "usable": False, "reasons": ["root is not canonical"]})
            continue
        result, trace = trace_call(root, function)
        modules, missing = _module_files_snapshot(trace.executed)
        if missing:
            trace.fail(f"code ran from modules not found: {missing}")
        usable = not trace.unusable
        _stat_line({"event": "prime", "root": os.path.basename(trace.root),
                    "usable": usable, "reasons": trace.unusable[:20],
                    "observations": _counts(trace.obs), "result": result})
        if usable:
            entries.append(Entry(trace, result, modules))
    ENTRIES = entries
    return entries


def disarm():
    global ENTRIES
    ENTRIES = None


def _counts(obs):
    out = {}
    for key in obs:
        out[key[0]] = out.get(key[0], 0) + 1
    return out


def mismatch(entry, root, memo=None):
    """The first observation of `entry` that does not hold on `root`, or None."""
    memo = {} if memo is None else memo
    root = _canonical(root)
    if root is None:
        return ("root", "not canonical")
    executed = {m[0] for m in entry.modules}
    modules, _missing = _module_files_snapshot(executed)
    if modules != entry.modules:
        return ("modules", sorted({m[:3] for m in entry.modules} ^ {m[:3] for m in modules})[:4]
                or [m[1] for m, n in zip(entry.modules, modules) if m != n][:4])
    for key, value in entry.obs.items():
        if _evaluate(key, root, memo) != value:
            return key
    return None


def matches(entry, root, memo=None):
    """Whether every observation of `entry` holds on `root` (and module state)."""
    return mismatch(entry, root, memo) is None


def _sampled(root):
    digest = hashlib.sha256(os.path.basename(os.fspath(root)).encode()).digest()
    return digest[0] >> (8 - SAMPLE_SHIFT) == 0


def lookup(root):
    """The cached answer for `root` as (True, result), or (False, None)."""
    if not ENTRIES:
        return False, None
    memo, why = {}, []
    for entry in ENTRIES:
        key = mismatch(entry, root, memo)
        if key is None:
            return True, entry.result
        why.append(repr(key)[:200])
    lookup.why = why
    return False, None


def signed(root, function):
    """`function(root)`, answered from a matching trace when one is armed."""
    if ENTRIES is None:
        return function(root)
    begun = time.perf_counter()
    hit, result = lookup(root)
    outcome = "hit" if hit else "miss"
    if not hit:
        result = function(root)
    elif _sampled(root):
        stock = function(root)
        outcome = "sampled-hit"
        if stock != result:
            _stat_line({"event": "MISMATCH", "root": os.path.basename(os.fspath(root)),
                        "cached": result, "stock": stock})
            raise AssertionError(
                f"signed trace cache: cached answer {result!r} differs from "
                f"is_signed {stock!r} for {root}")
    _stat_line({"event": outcome, "root": os.path.basename(os.fspath(root)),
                "seconds": round(time.perf_counter() - begun, 4),
                **({"why": getattr(lookup, "why", [])} if not hit else {})})
    return result


def _stat_line(record):
    if not STATS_PATH:
        return
    record = dict(record, pid=os.getpid())
    with _O.open(STATS_PATH, "a", encoding="utf-8") as handle:
        handle.write(json.dumps(record, sort_keys=True, default=str) + "\n")
