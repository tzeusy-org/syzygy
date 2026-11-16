# Redis dossier runbook (local-agent mode, S12)

**Candidate. Binds nothing.** This page is operating guidance for
`syzygy-qkea.13` (S12): attended end-to-end dossier runs against Redis. It
performs no act, records no consent and is never authority. The owner, as
operator, starts and attends every session. No agent starts one, and this
page never lists an agent doing so. State claims below are dated 2026-10-07
where they are not a command to run. Re-read `PROJECT-STATUS.md` and the act
records before relying on any of them.

**The default path is Run A:** Claude Code, with no execution, against Redis.
A Redis dossier needs no building or running of Redis. Run B (Codex, with
execution permitted) is blocked, and its section says why.

## Can the flow run before the sitting? No

[Observed] The production command reads its gate records from one place only:
the Syzygy checkout it runs from. In
`packages/polaris-dossier/src/cli.ts`, `RECORDS_ROOT` is the checkout root,
and there is no environment variable or flag that overrides it. The only seam
that injects other records is `CliPorts.sources`, and only tests use it. A
"scratch governance root" would therefore have to be a copy of Syzygy with
owner-act records written into it. Recorder-produced records in that copy
would claim acts the owner never performed (VIS-4), so no rehearsal is built
that way.

The end-to-end path is already exercised under injected fixture sources, by
`packages/polaris-dossier/src/full-run.testkit.ts` and the tests that use it.
A separate fixture repository would add nothing the binary could use, because
the binary cannot read fixture records. S12 therefore runs once, after the
sitting, against Redis itself.

## What must be true first

Each item is checked by the command named, never by reading a status word.

### Owner acts

The sitting the owner holds is put from
`.syzygy/governance/contracts/candidates/REDIS-LOCAL-AGENT-SITTING-BRIEF.md`,
items A to I. Read its sibling `REDIS-LOCAL-AGENT-SITTING-BRIEF-REVIEW-NOTES.md`
beside it. Items J to M were settled before the sitting and are not asked. The
item letters and owning packets below are copied from the brief's table "The
decisions, in the order you would be asked". The dossier packet is
`.syzygy/governance/contracts/candidates/dossier-local-agent-acts/OWNER-SITTING-PACKET.md`,
the package of PR #370.

| Brief item | Act | Owning packet | Run A | Run B |
|---|---|---|---|---|
| A | Redis observation consent | dossier packet row 1 (the same record as PR #260 row 5) | needed | needed |
| B | Public-source screening scope, version 1, with its Q2 to Q8 | `public-source-screening-scope/OWNER-DECISION-PACKET.md`; PR #260 row 1 | needed | needed |
| C | RFC5-14 `project-documentation` class | `rfc5-project-documentation-class/OWNER-DECISION-PACKET.md`; PR #260 row 7 | only with D | only with D |
| D | Screening scope, version 2 | `public-source-screening-scope-v2/OWNER-DECISION-PACKET.md`; PR #260 row 12 | as the brief recommends | as the brief recommends |
| E | Source-acquisition entry, local-agent version, signed by tag v1.0 | dossier packet row 2 | needed | needed |
| F | "Redis has no kernel evidence drawer", or a provider statement for the run's tool | dossier packet row 3, 3a or 3b | one of them | one of them |
| G | D9 bound to exact bytes | dossier packet row 4 | not needed | needed |
| H | The RFC7-20 reading bound to exact bytes | dossier packet row 5 | needed for a dossier with prose | needed for a dossier with prose |
| I | The non-governed narrative profile (requirement 032) | `non-governed-narrative-profile/OWNER-DECISION-PACKET.md`; PR #260 rows 9a to 9d | needed | needed |

Packet paths without a directory are under
`.syzygy/governance/contracts/candidates/`.

Two things the brief and its notes add:

- [Observed in the brief, "What declining does to the sitting", and note 1]
  The installer (`scripts/install_redis_local_agent_sitting.py`) records no act
  at all unless it has answers for A, B, E, H, I and one of F's options. It
  also refuses D without C. Declining one of those leaves every act for a later
  sitting.
- [Observed in note 4] G and H take effect at the gate only once PR #377
  (`syzygy-qkea.21`) is merged. Until then `D9_ACT_FORM` and
  `RFC7_20_RULING_ACT_FORM` are `null` in
  `packages/polaris-dossier/src/gate-sources.ts`.

### Code

Check these in the checkout you will run, at the commit you will record. Each
is a precondition. A command that prints nothing means it is not met.

```
git -C <syzygy checkout> log --oneline --grep=syzygy-qkea.21
git -C <syzygy checkout> log --oneline --grep=syzygy-bur3
git -C <syzygy checkout> log --oneline --grep=syzygy-s6xo
git -C <syzygy checkout> log --oneline --grep=syzygy-qkea.12
git -C <syzygy checkout> log --oneline --grep=syzygy-qkea.11
```

- `syzygy-qkea.21` (PR #377) wires the sitting's records into the gates. Before
  it, the registry gate reads the parked provider-mode entry and refuses, and
  Redis counts as governed so the brief refuses.
- `syzygy-bur3` makes `check`, `render` and `close` flag a reported command's
  working directory and scope where execution was permitted. [Observed,
  2026-10-07] It is on `main`, merged in PR #391. It matters only to Run B.
- `syzygy-s6xo` is the sitting installer's follow-up. It flips the real-tree
  test pins in the commit that records the acts, and it adds the sitting-log
  citation check.
- `syzygy-qkea.12` is the skill and the Codex instructions (S11).
  `syzygy-qkea.11` is `close` (S10).

Then preflight, which reads the records themselves:

```
git -C <syzygy checkout> status --short
npm --prefix <syzygy checkout> ci
npm --prefix <syzygy checkout> run build
node <syzygy checkout>/apps/syzygy/dist/main.js dossier preflight https://github.com/redis/redis
```

The tree must be clean. Preflight's `outcome` must be `ready` and its
`missing` list empty. `startGates` names the observation consent, the registry
entry and the screening policy. `consentedRevisions` lists the revisions you
may pin. For prose, `rfc720Ruling` must be `ok`. If anything is absent or
refused, stop. Do not work around it.

Check `git -C <syzygy checkout> log --oneline --grep=syzygy-qkea.24`. If it
prints nothing, do not use preflight's `cloneCommands`: before that fix they
run a full `git clone`, which gives the agent every commit the clone holds.
Either way, make the clone as in A1. The consent's stated form is one commit
fetched alone.

Below, `syzygy` stands for `node <syzygy checkout>/apps/syzygy/dist/main.js`.

## Run A (the default): Claude Code, no execution

The brief carries SEC-3's rule. Nothing in this run builds or runs Redis.

### A1. Make the clone (operator)

Use one of the revisions preflight names. Fetch that commit alone, as the
consent's stated form says:

```
git init <clones>/redis-<revision>
git -C <clones>/redis-<revision> fetch --depth=1 https://github.com/redis/redis <revision>
git -C <clones>/redis-<revision> checkout --detach FETCH_HEAD
```

Keep the clone outside the Syzygy checkout and outside the state root.

### A2. Start the authoring session (operator)

Start `claude` in the Syzygy checkout, so that its project skill loads. Never
start it in the clone. Then ask: generate me a Polaris dossier for
https://github.com/redis/redis

[Inferred] The session can then write files in the checkout, the gate records
included. Every step re-checks those records and its report says so
(`RECORDS_WITHIN_REACH`), but nothing prevents the writes.

From here on, the skill drives the session. The steps below are what the
operator sees and does. Each command is printed by the session or typed by
the operator, as the step says.

### A3. Configure and init (session, with the operator's answers)

The session asks for the deadline, a token or turn budget, the repair-cycle
limit, the question limit and the model. It writes them as a run
configuration file with these fields:

- `operator`
- `agentTool` (`claude-code`)
- `agentToolVersion`, `agentProvider`, `model` and optionally `modelVersion`
- `deadline`, as an ISO 8601 duration such as `PT3H`
- `agentTokenBudget` and/or `agentTurnBudget`
- `maxRepairCycles`, `maxQuestions`, `audience` and `operatorIsOwner`
- optionally `poleLimit`, the most Poles a draft may declare: a positive
  integer, five when it is left out (dossier spec v1.5)

[Inferred] Give a generous deadline. It runs on Syzygy's clock from `brief`,
and it must also cover the inventory, both reviews, `render` and `close`.

```
syzygy dossier init <clones>/redis-<revision> --url https://github.com/redis/redis --config <run.json> --state-root <state root>
```

### A4. Brief, draft, check (session)

```
syzygy dossier brief <run>
syzygy dossier check <run>
```

The session repairs and re-checks until `check` is clean or refuses. Read
`brief.md`'s execution rule: it must say the project is not to be built or
run.

### A5. Hand-overs (the operator starts every session)

Each hand-over has three parts, in this order.

1. The session prints the hand-over:
   - the inventory: `syzygy dossier session-prompt <run> inventory`;
   - the fidelity review: `syzygy dossier session-prompt <run> review --kind fidelity`;
   - the design review, after `syzygy dossier render <run>`: `syzygy dossier session-prompt <run> review --kind design`.
2. The operator starts the printed command in a new terminal, or with the `!` form, and attends that session until it finishes.
3. The operator records the launch form:
   - `syzygy dossier launch-form <run> inventory terminal|bang`;
   - `syzygy dossier launch-form <run> review terminal|bang --kind fidelity|design`.

A blocking finding sends the run back to A4, and a new draft revision retires
the reviews.

### A6. Close before the deadline (session, with the operator's figures)

```
syzygy dossier close <run> --usage-tokens <n> --usage-turns <n>
syzygy dossier status <run>
```

Give only the figures the tool shows, or neither flag. Never give 0. After the
deadline, `close` refuses and the run gets no Execution Record.

Then build the evidence record (below), with `<tool>` set to `claude-code`.

## Run B: Codex, execution permitted (blocked)

> **Blocked: not offered until D9 (G) is in force, `PERMITTING_ARM_ENABLED`
> is switched on by its own reviewed change, and the owner chooses to permit
> execution for that run.** The owner's sitting choices decide whether it is
> ever offered. Declining G closes it for good, until a later act.
> [Observed] Today `PERMITTING_ARM_ENABLED` is `false` in
> `packages/polaris-dossier/src/execution-rule.ts`. While it is false, every
> brief carries SEC-3's rule, whatever was recorded. Check with
> `grep -n "PERMITTING_ARM_ENABLED = " <syzygy checkout>/packages/polaris-dossier/src/execution-rule.ts`.

The steps are kept here so the run is ready if it is ever offered. Do not
start it while the banner holds.

Run B uses its own clone and its own run directory. A choice recorded for
Run A never carries to Run B.

1. **Clone:** as A1, into a fresh directory.
2. **Session:** as A2, but start `codex` in the Syzygy checkout.
3. **Configure and init:** as A3, with `agentTool` set to `codex`.
4. **Record the execution choice (operator, personally).** Type this in a new
   terminal, or after `!`. Never let the session type it.

   ```
   syzygy dossier allow-execution <run> --revision <revision> --declare owner-started-session,owners-own-host,owner-attends
   ```

   For every step from `brief` through `close`, set
   `SYZYGY_DOSSIER_CREDENTIAL_LIST` in the session's environment. It names a
   `syzygy-adapter-credential-list/1` file listing every credential the host's
   Syzygy adapters hold. An empty list must be declared explicitly.
5. **Brief, draft, check:** as A4. `brief.md` must state the permitting rule.
   Each command the session reports must give its `workingDirectory` and
   `scope`. `check`, `render` and `close` flag any command without a
   directory, with one outside the clone, or stated outside the scope. A
   flag refuses nothing and hides nothing.
6. **Hand-overs:** as A5.
7. **Close:** as A6. Build the evidence record with `<tool>` set to `codex`.

## Evidence record (one per run)

Build it once the run is closed:

```
node <syzygy checkout>/scripts/dossier_run_evidence.mjs <run> > <syzygy checkout>/docs/evidence/polaris-dossier-s12-<tool>-<date>.json
```

`scripts/dossier_run_evidence.mjs` reads only three things: the run
directory, the `<run id>.sessions` directory beside it, and the checkout's Git
state. It copies no file body. Every digest is computed (rule 3), and the
record names its subject and the subject's digests (rule 11):

| Field | What it holds |
|---|---|
| `measuredOn` | the Syzygy commit, and whether the tracked tree was clean |
| `subject` | run id, repository, pinned revision, governed predicate; Inferred, because it is read from `run.json` |
| `declared` | the operator's run configuration, Inferred |
| `executionRule` | the rule `brief.json` issued |
| `outcome` | site revisions; the sha256 of the latest `machine.json` and of `record.json`; the agent usage and the credential check at close |
| `runDirectory`, `sessionsDirectory` | every regular file as path, size and sha256; symbolic links are listed and not followed |
| `operatorDeclared` | filled in by hand, null where unknown: owner attendance, launch forms, the tool version and usage shown. Inferred |

Before committing, check three things:

- `measuredOn.syzygyTrackedTreeClean` is `true`.
- `outcome.closed` is `true`.
- `executionRule` is SEC-3's rule for Run A, and the permitting arm for Run B.

A record that fails any of these is still kept, with a note saying why. It is
never edited into a pass.

## Known limits

- [Observed] Every gate record lies within the sessions' write reach. The
  record proves what the run directory held at the instant the script ran,
  and nothing about earlier instants.
- [Inferred] Redis has neither an `openspec/` nor a `.syzygy/` path at the
  consented revisions. This comes from general knowledge: nothing has been
  read to check it, because no read is authorised yet. If either path exists,
  `init` reports Redis as governed and the run needs row 3a or 3b (brief item
  F).
- [Observed, synthetic stand-in, one host] The flow at Redis's approximate
  size completed with no budget refused. The subject was a generated
  repository of 1,751 files and 29.6 MB of blobs, three of them over 1 MB,
  shaped from general knowledge of Redis [Inferred] and never read from it.
  All 17 of Syzygy's steps exited 0, taking 453 ms in all; the process's
  peak resident set, the whole-tree read below included, was 299 MiB. Reading every blob once, in one call, stayed
  inside the per-call budgets. Record:
  `docs/evidence/polaris-dossier-redis-scale-measurement-2026-10-07.json`.
  [Unknown] Whether the same holds for Redis itself, on the operator's host,
  and whether the deadline suits the agent sessions' own time: the
  measurement times Syzygy's steps, not the agent's.
