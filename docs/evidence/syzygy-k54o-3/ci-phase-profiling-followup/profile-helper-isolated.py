def _profile_selftest_call(phase, function, *args, witnesses=None):
    """Opt-in best-effort metadata; preserve the call's result or exception."""
    if os.environ.get("SELFTEST_PROFILE") != "1":
        return function(*args)
    try:
        started = time.monotonic_ns()
        before = len(witnesses) if witnesses is not None else None
    except Exception:
        started = None
    if started is None:
        return function(*args)
    outcome = "raised"
    try:
        result = function(*args)
        outcome = "returned"
        return result
    finally:
        try:
            metadata = {"phase": phase,
                        "elapsedMs": (time.monotonic_ns() - started) / 1_000_000,
                        "outcome": outcome}
            if witnesses is not None:
                metadata["witnessesAdded"] = len(witnesses) - before
            print("SELFTEST_PROFILE " + json.dumps(metadata, sort_keys=True),
                  file=sys.stderr, flush=True)
        except Exception:
            pass  # A diagnostic failure must not replace the result or error.



