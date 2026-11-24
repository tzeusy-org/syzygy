"""Replay reverse-patch cache controls on a checkout without editing it."""
import sys
import tempfile
from collections import Counter
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(sys.argv[1]).resolve() / "scripts"))
import check_spec_reconciliation as checker  # noqa: E402


def body(value):
    return f"context before\n{value}\ncontext after\n".encode()


def patch_bytes(previous):
    return (
        "diff --git a/payload.txt b/payload.txt\n"
        "--- a/payload.txt\n"
        "+++ b/payload.txt\n"
        "@@ -1,3 +1,3 @@\n"
        " context before\n"
        f"-{previous}\n"
        "+new value\n"
        " context after\n"
    ).encode()


def verify_content(root):
    item = root / "change.patch"
    item.write_bytes(patch_bytes("prior one"))
    read_bytes = Path.read_bytes
    applied = checker._reverse_apply
    calls = Counter()

    def swap_after_read(path):
        value = read_bytes(path)
        if path == item and not calls["swap"]:
            calls["swap"] += 1
            item.write_bytes(patch_bytes("prior two"))
        return value

    def tracked_apply(*args, **kwargs):
        calls["apply"] += 1
        return applied(*args, **kwargs)

    def reverse(value="new value", path=item):
        return checker.reverse_apply(root, path.name, "payload.txt", body(value))

    with checker._reverse_cache_scope(), patch.object(checker, "_reverse_apply", tracked_apply):
        with patch.object(Path, "read_bytes", swap_after_read):
            assert reverse() == body("prior one"), "Git must consume the patch bytes used as the key"
        assert calls["swap"] == 1 and read_bytes(item) == patch_bytes("prior two")
        item.write_bytes(patch_bytes("prior one"))
        assert reverse() == body("prior one") and calls["apply"] == 1
        assert reverse("prior one") is None, "body changes require a fresh reversal"
        assert reverse("prior one") is None and calls["apply"] == 2
        item.write_bytes(patch_bytes("prior two"))
        assert reverse() == body("prior two"), "patch changes require a fresh reversal"
        identical = root / "duplicate.patch"
        identical.write_bytes(read_bytes(item))
        assert reverse(path=identical) == body("prior two") and calls["apply"] == 3
        with patch.object(Path, "read_bytes", side_effect=PermissionError("fixture")):
            assert reverse() is None, "unreadable patch must refuse the reversal"
        moved = item.with_suffix(".moved")
        item.rename(moved)
        assert reverse() is None, "missing patch must refuse the reversal"
        assert calls["apply"] == 3
        moved.rename(item)
    assert checker._REVERSE_CACHE is None, "the reverse cache must end with the owning invocation"


def verify_path_and_limits(root):
    def reverse(target, value=b"body", *, zero_context=False):
        return checker.reverse_apply(root, "change.patch", target, value,
                                     zero_context=zero_context)

    def scripted_apply(_patch, target, value, *, zero_context):
        calls[target] += 1
        return b"zero:" + value if zero_context else value

    calls = Counter()
    with patch.object(checker, "_reverse_apply", scripted_apply):
        assert checker._REVERSE_CACHE is None
        assert reverse("outside") == b"body"
        assert reverse("outside") == b"body" and calls["outside"] == 2
        assert checker._REVERSE_CACHE is None, "ordinary uncached calls must retain no results"
        with checker._reverse_cache_scope():
            assert reverse("first") == b"body"
            with checker._reverse_cache_scope():
                assert reverse("first") == b"body" and calls["first"] == 1
                assert reverse("second") == b"body" and calls["second"] == 1, "target changes require a fresh reversal"
                assert reverse("second", zero_context=True) == b"zero:body", "mode changes require a fresh reversal"
            assert len(checker._REVERSE_CACHE) == 3
            oversized = b"x" * (512 * 1024 + 1)
            assert reverse("oversized", oversized) == oversized
            assert reverse("oversized", oversized) == oversized
            assert calls["oversized"] == 2, "oversized results must bypass retention"
            assert len(checker._REVERSE_CACHE) == 3
            for index in range(128):
                assert reverse(f"target-{index}") == b"body"
            assert len(checker._REVERSE_CACHE) == 128, "retention must stop at 128 entries"
            assert reverse("after-cap") == b"body"
            assert reverse("after-cap") == b"body" and calls["after-cap"] == 2
        assert checker._REVERSE_CACHE is None
        try:
            with checker._reverse_cache_scope():
                assert reverse("exceptional") == b"body"
                raise RuntimeError("fixture")
        except RuntimeError as exc:
            assert str(exc) == "fixture"
    assert checker._REVERSE_CACHE is None, "the reverse cache must end on an exception"


with tempfile.TemporaryDirectory() as temp:
    root = Path(temp)
    verify_content(root)
    verify_path_and_limits(root)

print("PASS: frozen patch bytes, four key dimensions, bounded retention and invocation cleanup")
