PASS `9bcfe6fd12d3bd3b7510cab91a7bc52d4c4bc36f`.

[Observed] The sole change calls `bridge.metadata()` after restoring live authority. Its admission check then depends on the sticky recovery failure flag, so the assertion would fail if poisoning were removed. Both snapshot boundary probes are unchanged.

Source review only.
