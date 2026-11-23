PASS

[Observed] Binary patch SHA-256 `134e4c49ad83031d9349841b310b7c7200498d6343c899a9446c54056cc0e50c`.

[Observed] The patch preserves both exact direct-ref samples, the bounded first-parent history checks, and the ledger retirement, reviewed-digest, and installed-clause predicates. Git replacements and lazy fetching remain disabled. Batch reads share the existing 10-second deadline, retain the 2 MiB per-blob limit, and enforce header, framing, and aggregate output bounds.

[Inferred] The fixed-delay fixture distinguishes the parent’s 26 Git launches from the candidate’s 12. The restored-clause fixture isolates the historical check for both initial and retained authority by restoring the tip bytes before either assertion.

[Observed] Review was read-only. Tests were inspected without execution.
