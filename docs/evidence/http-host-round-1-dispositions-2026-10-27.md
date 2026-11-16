# Generic HTTP host extraction: review dispositions, round 1

[Observed] This record dispositions the CC-REV-1 review of `syzygy-bpyt.7.3`
(pull request #529). The change moves the generic HTTP host out of
`packages/cap1-daemon` into a new package, `packages/http-host`. The moved
parts are the server, the credentials, `escapeHtml`, the response limits and
the shutdown helper. After the move:
- `credentials.ts` and `credentials.test.ts` keep their git blob ids;
- `http-host/src/server.ts` is the base `server.ts` with three recorded edits;
- `cap1-daemon/src/server.ts` and `credentials.ts` stay as re-export shims, so
  that every governed citation still resolves;
- both apps import the host from `@syzygy/http-host`;
- the POC observer-input gate gains the prefix `packages/http-host/`.

The lane's evidence is under `docs/evidence/syzygy-bpyt-7-3/`.

| Round | Raw | Verdict (line 2) | Reviewed commit (line 3) | Subject (line 4) |
|---|---|---|---|---|
| 1 | `docs/reviews/R-GP-IMPL-HTTP-HOST-1-RAW.md` | `CONFIRM WITH EXCEPTIONS` | `c68fc5ca` | `r1-review.diff` sha256 `e524ff7dc24cddc925bd0dbaa6371a4c91b8091f889110f4978330b1dfbf5849` |

The subject equals `git diff c104771ff90f47ffd070f2339c36010458679c71
c68fc5ca6ec99a08c118e112df362bfa8ab01070`: 65 files, 44 of them outside
`docs/`. At landing the branch took one merge of main, which then carried #528.
The merge changed no subject path, and `git diff origin/main HEAD | sha256sum`
printed the same digest as the subject.

The round found twelve notes and no blocking finding. Under the owner's
notes-only stopping rule
(`.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
section 1), the round clears the exact bytes it read, and those bytes are not
edited. This record sits beside them. It is an implementation record and binds
nothing.

Revise-severity findings open: 0

## Class

Classes 1, 3, 4 and 6, with no endpoint removed, by the reviewer's ruling
(section 2). The PR declared 4 and 6 and called 3 possible. The reviewer added
class 1 (N3), because `authorizeStateWrite`, which the code calls the daemon's
only write boundary, moved with `credentials.ts`.

GP-Q0's checks:
- **Differential.** The lane's `differential.py`, re-run by the reviewer on
  clean built clones, gave four equal comparisons, and its selftest detected 4
  of 4:
  - the CAP1 daemon is byte-equal end to end over 3 fixtures × 24 requests, 3
    signal sets and 3 refused invocations;
  - the host's answers to 1,296 requests, 3 start failures and 18 credential
    groups are equal through `cap1-daemon`, and equal through
    `@syzygy/http-host` at head;
  - the `cap1-daemon` barrel keeps 70 names and 42 values.
- **A rule-6 mutant per predicate.** The lane's 17 of 17 mutants and `run_m10`'s
  7 of 7 are killed. Of the reviewer's 19 mutants on the moved and edited host,
  12 are killed and 7 survive. Every RFC 0005-critical mutant is killed: R4
  (loopback admits), R5 (class skip), R6 (handler before admission), R10 (bind
  all interfaces), and R1 and R2 (token comparison and scheme). The 7
  survivors are N4, N6 and N7.
- **Owner notice.** Posted on `syzygy-bpyt.10` at landing, with the class set
  and the gate ruling (N3).

**The gate prefix, and GP-Q0's stop clause.**
- The reviewer ruled the new prefix in `pocObserverInputsAreClean` "the move
  followed through, not 'a change … to what a gate accepts or refuses'".
- Over 4,974 paths (every path tracked at either commit, plus 7 probes), 11
  paths differ. Each is accepted at base and refused at head, and all of them
  are under `packages/http-host/`, which does not exist at base.
- Over every path that exists at base, no decision changes.
- Without the prefix, the gate would have accepted a dirty host, and that would
  have been the unlisted loosening. The reviewer's R16 mutant removes the
  prefix, and the new row fails.
- The coordinator agrees. The owner notice names the ruling, so the owner can
  override it.

The lane also reported a pre-existing gap: the gate omits
`packages/polaris-generation-core/`. The reviewer refuted it as a gap in what
the gate protects. The static and literal-dynamic import closure of the POC's
`main.ts` holds 0 files under `polaris-generation-core` or `-consent`, at base
and at head. The entry points that do import them never call the gate. No
owner decision is needed, and 7.3 does not change it.

## Notes

- **N1** (the PR's "Every changed output: None" omits the POC's live
  walkthrough surface version): the version is a digest over the tree ids of
  `apps/three-surface-poc/src` and `packages/three-surface-poc-core/src`, and
  this PR changes 15 files in the first tree. It moves from
  `polaris@aabeb05c809a` at `c104771f` to `polaris@8d82663ece26` at `c68fc5ca`.
  The landing commit has the same two tree ids as `c68fc5ca`
  (`8488684d1c085ea56cdb7084e9e9f0b6a3c3387d` and
  `b3a8bb5b7b00bdb370ce93cee020ccaab7d61f2b`), so the value at merge is the
  same. No bound record carries it: the run record it binds to does not exist.
  The PR body and the owner notice are corrected at landing.
- **N2** (the bead's boilerplate outcome is delivered only for shutdown): the
  `createDaemon` call, the start-failure line and the listening banner stay
  per app, and their texts differ byte for byte. Filed as
  `syzygy-bpyt.7.15`, and named in the PR body at landing.
- **N3** (class 1 not declared): adopted above. The owner notice states
  classes 1, 3, 4 and 6, and the gate ruling.
- **N4** (the shim-pin tests check names, not bindings): R13, a constant
  aliased to another binding in the shim, and R14, a dropped type re-export,
  survive 571 tests. Only the differential catches them. Filed as
  `syzygy-bpyt.7.14`.
- **N5** (the differential's selftest has no `surfaceEqual` mutant, and its key
  ignores `declaredIn`): an evidence-tool note. Its fix waits for the next reuse
  of the tool, because this PR's evidence is frozen. Carried in
  `syzygy-bpyt.7.14`.
- **N6** (four pre-existing survivors in byte-identical moved code and an
  unchanged POC file): R3 (a widened Bearer pattern), R8 (a dropped
  not-admitted population), R18 (an origin check by `startsWith`) and R19
  (`isWithin` without `path.sep`, a sibling-prefix write). Each survives at
  base and at head. The bead required these tests to stay unchanged. Four rows
  are filed in `syzygy-bpyt.7.14`.
- **N7** (the new gate row pins one path): R17, the prefix narrowed to `src/`,
  survives. Filed in `syzygy-bpyt.7.14`.
- **N8** (three governed citations now name a shim): bead guardrail 3
  prescribes the shim, and every path still resolves. The line map, for a
  reader following the citations:
  - `POLARIS-RESPONSE-CEILING-READING-DECISION-PACKET.md:142-143` cites
    `cap1-daemon/src/server.ts` lines 207 and 255. Those bytes are now
    `packages/http-host/src/server.ts:206` and `:254`;
  - `OWNER-DIRECTION-MACHINE-CEILING-2026-10-15.md:37` cites `emitNonSuccess`.
    It is now at `packages/http-host/src/server.ts:171`;
  - `SECURITY-CONTRACT.md:151` names `credentials.ts` as the relevant source.
    It is now a re-export of `packages/http-host/src/credentials.ts`.
  Each of these governed files has digest citers, so none is edited here. They
  can be re-pointed only through their own successor process, if the owner
  wants that.
- **N9** (the moved `server.ts` keeps its Capability 1 header comment): filed
  in `syzygy-bpyt.7.15`.
- **N10** ("9 duplicate keys" is 3 keys with 9 surplus rows): a counting note
  only. Where the figure is reused, say 3 keys listed 12 times.
- **N11** (the PR's test figures are from the code commit): at the reviewed
  commit `c68fc5ca`, the system tier gives 10 files and 49 tests, and Vitest
  gives 5,283 passed and 5 skipped. Those are the figures of record.
- **N12** (13 POC test files still reach the host through
  `@syzygy/cap1-daemon`): disclosed by the lane. Filed in `syzygy-bpyt.7.15`.

## Retained review evidence

The reviewer's tools and results are kept under
`docs/evidence/http-host-review-2026-10-27/`, 31 files: 12 tools and 19
results. The raw's section 8 lists 44 kept files with their sha256. At landing
a script checked all 44 against the reviewer's directory: 44 matched and 0
failed, and no kept file was unlisted. The retained 31 are copies of those
files.

Not retained, though the raw quotes each one's result line: the build,
governance, quotation, `npm ci`, system-tier, typecheck and full-Vitest logs, 13
files in all.

## Acceptance criteria (raw section 6)

- AC1: met. `@syzygy/http-host` exists. `apps/syzygy/src/main.ts` and 13 POC
  production files import from it, and 0 POC production files import
  `@syzygy/cap1-daemon`. `cap1-daemon` depends on it. The boilerplate helper
  exists only for shutdown (N2).
- AC2: met. 88 credential, origin and ceiling test files are the same blob at
  head, one of them by an R100 rename. They are green with every `dist/`
  absent, and the system tier is green.
- AC3: met. 4 governed files cite 4 paths, and all resolve. The shims
  re-export every base name, and the PR body lists them. Two locators now land
  in a shim (N8).
