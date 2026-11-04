# G5 Git transport inventory

[Observed] This is implementation evidence for `syzygy-bpyt.6.20`, audit keys
`greenfield:reconciliation:R4a:G5` and
`greenfield:reconciliation:R4a:git-runner-options`. The original reconciliation is
`docs/evidence/syzygy-bpyt-6-6/reconciliation-gen1.json` (PR #728). PR #595 disclosed
the retained string seam. The G2 dependency is closed `.6.17`, PR #729; its bound,
size-before-body ordering and captured-stderr behavior remain the oracle.

[Observed] The frozen source is named in `baseline-manifest.json`. The bounded
census is six production files with six direct `execFileSync('git', …)` calls,
plus code-structure's already shared adapter: seven profiles, five original
logical G5 seams. This is not an inventory of other Git commands in the repository.
The adjacent batch exception is listed separately. Injected test lambdas are
not production transports. `gitRunnerFor` remains in project-shape-observation;
`GitRunner` remains an import-free raw-byte callable in pwb-types. Registry tooling
still parses the resource constants from project-shape-observation.

[Inferred] GP-Q0 Part 1 permits this behavior-preserving implementation refactor.
Part 3 says “Any change not listed here to what a gate accepts or refuses stops
and returns to the owner.” The PWB implementation authorization and continuation
retain the repository/content-class, envelope, consent and security boundaries.
Proposed CC-REV-1 classes are 1, 3 and 4; the fresh independent reviewer determines
classification. Floors touched: truth, evidence, security and identity; none are
intended to change. No authoritative artifact is amended.

## Exact profiles

[Observed] “Omitted” preserves omission. Each row names the caller's options;
the factory chooses no policy and returns Node's native Buffer/string. The three byte-returning wrappers retain their original Uint8Array copy; governance text retains its direct Buffer decode. `prefix + args` preserves ordering and copies the
argument array. No profile sets timeout, input or shell. Environment values are
never retained in evidence; synthetic sentinels alone are logged by the harness.

| Row | Caller / delegation | argv prefix; cwd | encoding / result | maxBuffer | stdin/stdout/stderr | environment |
|---|---|---|---|---|---|---|
| 1 | core worker-change-observation `defaultRunGit` → factory | `--no-optional-locks -C root`; cwd omitted | Node `utf8`, string with replacement decoding | 67,108,864 | ignore/pipe/pipe | omitted, inherited |
| 2 | app governance-inputs `defaultRunGit` → factory, then fatal TextDecoder | same prefix; cwd omitted | native Buffer then strict UTF-8 text | omitted | ignore/pipe/ignore | omitted, inherited |
| 3 | app governance-inputs `defaultReadGitBlob` → factory | same prefix, then `cat-file blob object`; cwd omitted | raw Uint8Array | omitted | ignore/pipe/ignore | omitted, inherited |
| 4 | app git-observation `readGit` → factory | same prefix; cwd omitted | Node `utf8`, replacement string | omitted | ignore/pipe/ignore | per-invocation `{...process.env, GIT_OPTIONAL_LOCKS:'0'}` |
| 5 | core code-structure `defaultRunGit` → `gitRunnerFor` → factory | same prefix; cwd omitted | raw view; gitlinks removed before strict decoder | 268,435,456 via row 6 | ignore/pipe/ignore | omitted, inherited |
| 6 | core project-shape-observation `gitRunnerFor` → factory | same prefix; cwd omitted | raw Uint8Array | 268,435,456 | ignore/pipe/ignore | omitted, inherited |
| 7 | app verbatim-route `gitBlobReaderFor` → factory | empty prefix, original args only; cwd=root | raw Uint8Array | `limits.maxBytesPerSource` | ignore/pipe/pipe | omitted, inherited |
| 8, exception | app governance-inputs `batchReaderFor` → git-blob-batch → isolatedGit | isolated config/no-replace flags, `-C root`; cwd omitted | raw batch framing | 512,000,000 | pipe/pipe/ignore | isolated allowlist, constructed per call |

[Observed] Row 8 retains a local one-line rationale. Its config flags, allowlisted
environment, stdin payload and batch protocol differ from these single-command
transports. An injected single reader still disables default batch reads; an
explicit batch reader still wins. Existing batch tests exercise this path.

[Inferred] These option differences are load-bearing and retained:

- Replacement decoding accepts malformed UTF-8 and retains a BOM; fatal decoding
  refuses malformed input and strips an initial BOM. Raw bytes retain both. Node's
  `encoding:'utf8'` also changes stdout/stderr representation on thrown errors,
  so text profiles continue to ask Node for text, including on failure.
- An omitted buffer uses the tested Node runtime's default; it is not replaced
  with either explicit larger buffer. Each bound applies to captured output,
  including captured stderr. Row 7 also retains its independent declaration and
  byte limits before serving a body.
- Piped stderr stays on the thrown error. Ignored stderr is absent there. Neither
  reaches parent stderr. `cwd=root` differs observably from `-C root`, including
  command logs and the child working directory; row 7 receives no extra flags.
- Omitted env inherits the environment at invocation. Row 4 clones it each call
  and overrides exactly the existing lock key. Row 8 instead retains isolation.
  No equivalence or new security approval is inferred for ambient Git variables.
- Row 5's byteOffset/byteLength, allocation/decode catch, NonUtf8GitOutput reason,
  malformed and unterminated-record refusals, gitlink-before-decode filtering and
  public string injection seam stay local. Its independent unresolved-revision
  metadata listing stays outside the P1 body gate.

[Unknown] Equivalence outside the executed synthetic corpus is unassessed. The
inventory is review evidence, not a second source-scan guard. The behavior suite
owns the invariant checks. No retry, cache, persistent state, background worker,
new dependency or package subpath is added. Rollback is the cohesive code/test/
evidence diff; no stored data requires migration.

## Reproduce and interpret evidence

Run `node docs/evidence/syzygy-bpyt-6-20/differential.mjs <artifact-dir>` from this
checkout after `npm ci`. The script reads the exact baseline Git objects, bundles
both source versions with source digests, and executes only synthetic local Git
fixtures. Its fake Git logs argv/cwd and known sentinels, never actual env values.
It records bytes by type, length and SHA-256 (small payloads also retain literal
text/base64), consumed error attributes, parent stderr and exact command logs.
The same root/time/revision is used on both sides. The named Node runtime and
harness digest are part of each record. Failure attempts are retained, not retried
until green without an identified correction.

[Observed] Tests: +10 collected cases, ~3 existing suites extended, -0 removed:
seven table rows in one new unit family and one focused integration case in each
of the three existing caller suites. The added table covers transport behavior
that had no shared boundary before; the three cases protect decoder/env/selection
semantics while retaining the existing lifecycle, authority and observation
oracles. No test tier is changed; the new file is hermetic unit by default.

[Observed] Source merging remains held by questionnaire item 4 until actual owner
judgment and the cycle report. Branch preparation and test evidence do not grant
landing authority. The non-blocking owner notice is `cycle-notice.md`. Independent
exact-head review and canonical full checks are separate recorded gates; this
inventory alone is not a completion claim.
