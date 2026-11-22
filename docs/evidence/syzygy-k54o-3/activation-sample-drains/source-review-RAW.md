# PASS

[Observed] Reviewed the single-file diff for `56febf0e01a173864fc7dad76c93bd3db5604270` against `2b4ee66b4c823407e902aed058937d824d81e78d`. Tree `301f077796633ca0b7de35ab97588e7f65625248`.

| Digest command | SHA-256 |
|---|---|
| `git diff --no-ext-diff --binary --full-index 2b4ee66b4 56febf0e0 \| sha256sum` | `041dd11ebc60060f0285076f00ba1ca29bfc659daa7c6d7e3f71590ff92377c3` |
| `git diff 2b4ee66b4 56febf0e0 \| sha256sum` | `112de117afeae149b5403903aa78463c63e601aaba98a5da3f70aa517ade236c` |

[Observed] The review used the first command. Comparing both outputs confirmed that the `index` line is the sole difference. `--full-index` expands the two blob IDs. The patch and verdict are unchanged.

[Observed] The new poll turn drains in-flight samples between the full bootstrap check and activation. The registered design child is included. Its bounded sampler checks run currentness independently of activation, so the wait has no dependency cycle.

[Observed] The processing guard still runs after the drain. The host independently rechecks full delivery authority and applies its original cutoff before and after that check. Broker and relay effects remain gated on successful activation. A false or throwing drain takes the existing rejection, cleanup, and work-release path.

[Inferred] The drain separates the full checks from the same in-flight sample. A later sample can still start. Exact timing and recovery remain unverified. No tests or edits were performed.
