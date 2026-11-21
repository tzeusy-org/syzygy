# Owner direction — answers to the D10 F-10 questionnaire of 2026-11-21

Date: 2026-11-21

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21`

This is an owner direction under doctrine VIS-4 as amended by D10
(2026-11-18). It records the owner's answers on the items of D10 FOLLOW-ON
F-10 (`syzygy-k54o.10`) that fall in an owner class or that an earlier owner
condition reserved.
- It binds no artifact digest and adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It changes no doctrine byte. Item 1's answer needs a doctrine amendment of
  SEC-5, which stays unadopted until the owner adopts its text.
- It does not edit `OWNED-REPOSITORIES.md`. Item 3's row is the owner's to
  write, naming the remote.
- It starts no run, no body read and no provider egress.

## How the answer was given

[Observed by the coordinating session.] A Claude Code session prepared a local
questionnaire of seven items over commit `f0ea7e5df` (`origin/main`). One
independent fresh-context vetter (`subagent-f10-adversarial-1`) reviewed it
over three rounds; the last passed every item on scope and on recommendation.
The session served the packet as a token-gated web form at a tailnet address
and ingested the owner's submission.

- Submitted: 2026-11-21T09:04:35+00:00, by "owner via questionnaire web form
  (token-gated, from 100.87.181.125)", as the form recorded it.
- The owner answered all seven items by picking option A each, with no edits
  or notes, and answered yes to applying them now.
- [Inferred] That the operator of that form is the owner.
- The packet is a scratch file outside this repository and is not authority;
  its sha256 after its records were filled is
  `4b9a3943c4f5aada6bbcd4671311c8c9473a0c97b156dff089764d45eb803bda`.
- Six picks were the form's recommendation; item 1 was not (the form
  recommended C).

## The answers

### `secrets-raw-clone-to-provider` — answer A

Picked: "A. Accept the residual risk, disclosed on every run page".

- What it records: dossier agent sessions may keep reading the raw clone, and
  every run page discloses that a secret in the clone can reach the provider.
  The packet stated the consequence beside the option: this "contradicts
  SEC-5's 'never sent, whatever is declared', so it also needs a doctrine
  amendment of SEC-5".
- What follows: an agent drafts that SEC-5 amendment for the owner's adoption
  (doctrine is an owner class). Until the owner adopts it, SEC-5 stands as
  written, and an agent does not ship a change that relies on the amendment.
- Excluded: no change to the secret policy itself; any weakening of detection
  stays a separate owner decision.

### `codex-f3-scope` — answer A

Picked: "A. Unpark; Codex lands F-3 as FOLLOW-ON.md defines it, and its
broader package goes through review separately as pdja.36".

- What it records: the owner's park on `syzygy-k54o.3` is lifted. F-3 lands
  narrowly; the acquisition and session subsystem in Codex's worktree is
  reviewed as `syzygy-pdja.36`.
- Excluded: Claude does not touch Codex's worktrees; delivering the message to
  Codex is the owner's; F-3's read scope is bounded by item 1.

### `owned-repos-butlers` — answer A

Picked: "A. Add Butlers to the owned list (you name its remote)".

- What it records: the owner's intent to list Butlers in
  `OWNED-REPOSITORIES.md`, so worker sessions may open and merge Butlers fixes
  without a per-change question, each write attributed and revertable (SEC-4).
- What follows: the row takes effect only when the owner writes it, naming the
  remote. No agent edits that list.
- Excluded: no push happens as part of recording.

### `cold-read-walkthrough` — answer A

Picked: "A. You do it once 1z3.33 lands (and F-2, if the gate refuses); an
agent restates the recording without acts".

- What it records: the owner performs the RFC7-30 cold-open walkthrough of the
  PWB Polaris page (`syzygy-1z3.22`) once `syzygy-1z3.33` lands. An agent
  restates its recording steps as a dated record of the owner's words.
- Excluded: nothing records a judgment the owner has not given.

### `generality-runs-agent-start` — answer A

Picked: "A. Lift the condition: agents start the runs after F-3, on a rebuilt
binary, up to 30M tokens each".

- What it records: the owner's 2026-11-15 condition "Agents start no run" on
  `syzygy-fnry.22` is lifted. After F-3, agents start the three
  generality-probe runs on a rebuilt binary, up to 30M tokens each.
- Excluded: the runs read public repositories only and execute observed code
  only in a sandbox (SEC-3).

### `doctrine-d7-withdraw` — answer A

Picked: "A. Withdraw D7 as superseded by D10".

- What it records: doctrine amendment D7 (held derived computation, P-101) is
  withdrawn. P-101 and its sub-questions Q1 to Q6 close unruled.
- Excluded: no doctrine byte changes.

### `doctrine-d3-withdraw` — answer A

Picked: "A. Withdraw D3 as superseded by D10".

- What it records: doctrine amendment D3 (bounded missions, act 5, P-5) is
  withdrawn. This supersedes the owner's 2026-11-03 "knowingly hold" for D3
  only (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-03.md`); the holds on
  acts 2 to 4 and P-12 are untouched by this answer.
- Excluded: no doctrine byte changes. Missions later need a new amendment.

## Shared background the owner saw

The packet's shared background listed what an agent decides under D10 rather
than the owner, open to the owner's veto: specification sign-offs, GP-Q0
behaviour fixes, the consent and act-record questions D10 retired, credential
probe tightening, conventions and resolved register rows, the mission-wave
rows (kept deferred), `syzygy-r9x9`, withdrawal of the dossier v1.7 candidate,
and the release of `syzygy-fj2q` after deduplication against pursuit run 4.
Those are recorded in `AGENT-ADOPTIONS.md` as they are taken, not here.
