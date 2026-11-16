#!/usr/bin/env python3
"""rev-520b fault-injection wrapper: runs a measurement script unchanged, with one library call patched (the script's bytes are not
edited). usage: python3 -I inject.py MODE SCRIPT [script args...]

MODE second-write: opening the instrumented test file for writing raises OSError (ENOSPC), i.e. an exception between the two writes.
MODE killpg-log:   os.killpg is passed through unchanged; each call and its real outcome is written to stderr as a KILLPG line.
MODE killpg-race:  os.killpg is passed through, except that the first killpg(pid, 0) whose real answer is ProcessLookupError answers
                   "alive" instead. The next call, the script's own killpg(pid, SIGTERM), then gets the kernel's real answer. This is
                   the interleaving where the group's last zombie is reaped between end_group's alive() probe and its SIGTERM.
MODE trace-exit:   nothing is patched; a SystemExit leaving the script is printed with its traceback to stderr, then re-raised, so
                   the frame a stop signal interrupted is on record."""
import builtins, os, runpy, sys

mode, script, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
TEST_FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'

if mode == 'second-write':
    real_open = builtins.open
    def guarded(file, mode='r', *a, **k):
        if isinstance(file, str) and file.endswith(TEST_FILE) and 'w' in mode:
            raise OSError(28, 'injected by rev-520b: No space left on device', file)
        return real_open(file, mode, *a, **k)
    builtins.open = guarded
elif mode in ('killpg-log', 'killpg-race'):
    real_killpg, state = os.killpg, {'faked': False}
    def killpg(pid, sig):
        try:
            real_killpg(pid, sig)
            print(f'KILLPG {pid} {int(sig)} -> ok', file=sys.stderr, flush=True)
        except ProcessLookupError:
            if mode == 'killpg-race' and int(sig) == 0 and not state['faked']:
                state['faked'] = True
                print(f'KILLPG {pid} 0 -> ESRCH, answered alive (injected)', file=sys.stderr, flush=True)
                return
            print(f'KILLPG {pid} {int(sig)} -> ESRCH', file=sys.stderr, flush=True)
            raise
    os.killpg = killpg
elif mode != 'trace-exit':
    sys.exit(f'unknown mode {mode}')

sys.argv = [script, *rest]
try:
    runpy.run_path(script, run_name='__main__')
except SystemExit:
    if mode == 'trace-exit':
        import traceback
        print('TRACE-EXIT', traceback.format_exc(), file=sys.stderr, flush=True)
    raise
