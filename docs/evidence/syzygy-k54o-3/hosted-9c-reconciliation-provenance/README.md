# Hosted9c reconciliation decoded-log provenance addendum

[Observed] This restores the previously unavailable portable log binding. It leaves the earlier frozen two-consumer packet unchanged. The retained file is the UTF-8 encoding of the GitHub connector's cached, decoded log string, not original HTTP response bytes. It is not a new fetch. The JSON string capture is retained as well, preserving the exact text supplied by the connector.

- Job: 138823853861; run: 45500976279.
- Associated PR head from job metadata: `9c878b13f5ea7b819b4817517c675810d4b0f23c`.
- Actual checked-out/tested merge, extracted from the checkout `git log -1 --format=%H` output at log line638: `0dfd683baeef456f4b70ea9798bfa4c496999c5a`.
- Decoded log: `reconciliation-decoded.log`, 275445 UTF-8 bytes, SHA256 `ed9cf37562dc10635ed6037a2dfc245aff031152acdb60c7bb70aca5e7297310`. Deterministic gzip is also retained.

[Observed] The selftest terminal reports566/566 mutants killed and113/113 controls held at the tested merge prefix. Two independent printed-output scans count679 witnesses:566 killed and113 held. Two independent profile parsers recover57 unique phases and exactly match every ordered record in the earlier frozen currentPhases. Actual profile total is482.435986 seconds; the job took493 seconds (2026-11-24T22:26:38Z through 2026-11-24T22:34:51Z); its selftest step took483 seconds. The420-second budget was exceeded. This is no workflow, PR or landing acceptance claim.

[Observed] Prefix mutants took227.195501 seconds; entry fixtures36.326812; URL fixtures32.758859; edit-account fixtures31.097229. Concurrent worker costs must not be added as serial elapsed wall time.

[Unknown] The full merge object is unavailable in the local primary object database. The read-only `git show` lookup failed; no Git fetch was performed. Merge parent/tree binding and equality of its checker bytes to PR9c remain Unknown. The locally available PR9c checker source hash is `65ab0c346b962ebe62bac592271181161d877aaaba5fe13e9e09f38c55f6ef51`; job association alone does not establish the tested merge's bytes. Canonical rule7 therefore confines this selftest observation to the actual execution merge, not automatically PR9c or any later candidate.

[Unknown] The hosted command did not emit a structured --witnesses artifact. Printed identity/expectation/outcome parity does not establish complete structured mutation/path tuple parity. Original HTTP-byte digest is Unknown because the connector supplied decoded text.

`provenance-addendum.json`, `execution-commit-binding.json`, `profile-extraction.json`, `printed-witnesses.json` and `job-metadata.json` contain the bounded machine records. The earlier timing context is copied verbatim into this packet for rechecking. `extract_provenance.py` is the rerunnable lightweight parser; it parses retained files and looks up existing local Git objects only, never fetches Git or runs a project checker/test. Its default repository path is the original primary path. No primary file, source, index or commit was changed.
