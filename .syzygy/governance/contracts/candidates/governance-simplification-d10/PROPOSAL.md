# Governance simplification (D10) — proposal

**Candidate. Binds nothing until the owner's act** (`OWNER-SIGNOFF.md`).

## The new regime, in one screen

The owner decides four kinds of change. Agents decide everything else,
record what they decided, and report it. The owner can veto anything
afterwards, and a veto is a revert.

**The owner decides only:**

1. **Doctrine** — any change to `.syzygy/governance/doctrine/`.
2. **Secrets** — anything that would weaken secret detection or the
   fail-closed rule (SEC-5), or let a secret be indexed, rendered or sent.
3. **Writes to other people's repositories** — any write or push into a
   repository the owner does not own. Syzygy's own repository and the
   owner's repositories need no consent.
4. **Exposure and release** — any network exposure beyond the owner's
   tailnet, and any release, deployment or multi-user operation. Standing
   posture: everything stays within the tailnet; in the owner's words,
   "Network exposure (ingress) should almost never be necessary".

**Agents decide, without asking:** behavioral specifications and their
versions; contracts (RFCs); the craft-and-care and specification bars;
topology; screening and classification policy (inside SEC-5's detector and
fail-closed rule); review practice; when implementation starts; fixes that
change behavior; unattended agent loops; which repositories Syzygy reads,
public or private; sending their content to the run's declared model
provider; and building and running an observed project's code (sandboxed or
in the owner's attended session, never in the daemon).

**No repository needs a consent, statement, typed phrase or record to be
read**, public or private. Once the follow-on code lands (`FOLLOW-ON.md`
F-3), `syzygy polaris <url>` just runs.

## How agents record and report

- **Record.** Each adoption lands on the default branch with one row in
  `.syzygy/governance/decisions/AGENT-ADOPTIONS.md`: date, commit, what
  changed, why, and the command that reverts it. A specification version
  also gets a git tag (`<package>-v<major>.<minor>`, as today).
- **Report.** The pull request, or the session summary, that links the row.
  Nothing else is needed.
- **Classification.** The agent decides whether a change is in an owner
  class. When unsure, it treats it as owner-class and asks.
- **Owner decisions** in the four classes are recorded as the owner's words,
  dated, with the commit that applies them. No phrase, no digest.

## How the owner vetoes

Say so, at any time. An agent runs the row's revert command and appends a
row recording the veto. A vetoed change is not adopted again without the
owner.

## The trade-offs the owner chose

- Private repositories are read, and sent to the run's declared provider,
  without a per-repository question.
- Observed code may be built and run by agents without a per-run owner
  choice.
- Independent review stays an engineering norm, one review per change, not
  an owner gate and with no owner stopping rule.

## What the owner's one act does

One phrase adopts one manifest (`MANIFEST.txt`). The recorder
(`scripts/record_governance_simplification_d10.py`) checks every manifest
row against the bytes on disk and then:

1. installs doctrine amendment **D10**: `vision.md` (VIS-4 rewritten; VIS-3,
   VIS-5, VIS-6 and the north star follow), `security.md` (SEC-1 to SEC-5),
   `architecture.md`, `README.md`, `v1.md` and `trust-and-evidence.md`
   (clause by clause in `D10-SEMANTIC-DELTA.md`);
2. installs four successor files for act-bound texts: RFC 0003's
   governance-homes module (RFC3-15, RFC3-16), RFC 0005's consent module
   (RFC5-12 to RFC5-16), and the CC-SPEC and CC-IMPACT policies. Why these
   four and no others: `RETIREMENTS.md`;
3. creates `decisions/AGENT-ADOPTIONS.md`;
4. adopts `RETIREMENTS.md` as the register of every lower clause, act and
   direction D10 retires or supersedes;
5. appends row D10 to `DOCTRINE-AMENDMENT-LOG.md`, and writes the act record
   and its section in `ACCEPTANCE-ACT-RECORD.md`.

This is the last digest ceremony: the act itself amends RFC3-16 so that no
later adoption needs one. Earlier acts stay as history, but their digests no
longer lock the files they bound.

Doctrine VIS-4 also says "Lower rules follow this one": wherever a contract,
policy, specification or direction still asks for an owner act on an
agent-decided matter, an agent adoption satisfies it until the text is
rewritten. So the rest is ordinary follow-on work, listed in `FOLLOW-ON.md`.

## Every gate's fate

G01–G27 are the gate classes of the 2026-11-17 inventory (a working file in
the lead session, not in the repository); identifiers are kept so the
review can map them.

| Gate | What it was | Fate |
|---|---|---|
| G01 | Owner sign-off of each behavioral spec version (Scope A) | Retired: agent adoption row plus version tag |
| G02 | "Always human-gated" class; "classification is never the author's call" | Replaced by the four owner classes; classification is the agent's call, contested by veto |
| G03 | Separate owner directions to draft and to implement | Retired: an adoption authorizes its implementation |
| G04 | Review rounds until CONFIRM before an offer; owner arbitration after failed rounds | Review stays a norm (one review); owner arbitration and stopping rule retired |
| G05 | Review-record ceremony (raws, per-round dispositions, campaigns) | Agent-decided; owner overrule only in an owner class |
| G06 | Impact ledger and same-change rule | CC-IMPACT-6 amended (a lag allowed when recorded); CC-IMPACT-7 retired |
| G07 | Digest-bound act ceremony (phrase, frozen subject, recorder, CG-7 copies) | Retired by this act (RFC3-16 amended); recorders and checks retire in F-5 |
| G08 | Readability-successor and banner-correction acts | Retired with G07 |
| G09 | "In force" bind acts (D9, RFC7-20 reading) | Retired: an adoption is in force when committed |
| G10 | Observer registry entry acts | Retired: reader identity and version are build facts (RFC4-3) |
| G11 | Per-repository, per-revision observation consent | Retired, public and private |
| G12 | Per-project provider statement; drawer statement | Retired: the run declares its provider |
| G13 | Private-repository observation and egress | Not kept (owner's answer): agent-decided, declared provider only |
| G14 | Typed launch consent at a terminal | Retired (code in F-3) |
| G15 | Write consent for Syzygy's own records in its own repository | Retired: own repositories need none |
| G16 | Screening-policy per-version acts | Agent-decided inside SEC-5; weakening stays the owner's |
| G17 | Owner's per-run execution choice | Retired: the agent decides and records it in the run |
| G18 | Daemon never executes observed code; sandbox profile | Kept (SEC-3) |
| G19 | Doctrine adoption by the owner | Kept: owner class 1 |
| G20 | Contract acceptance and amendment acts | Retired: agent adoption |
| G21 | Craft and spec-bar approval acts | Retired: agent adoption |
| G22 | No unattended agent coordination | Retired: loops allowed, reported after |
| G23 | Secrets never indexed; fail-closed (SEC-5) | Kept: owner class 2 |
| G24 | Writes into other people's repositories | Kept: owner class 3 |
| G25 | Authentication; no exposure, release, deployment or multi-user | Kept: owner class 4, tailnet posture |
| G26 | One coherent category per OpenSpec change (SDR-37) | Retired as an owner rule: agent's call |
| G27 | Behaviour-changing fixes go to the owner (GP-Q0) | Retired, except a change that weakens secret detection or widens writes or exposure |

Kept with the owner or as doctrine: 5 classes (G18, G19, G23, G24, G25).
The other 22 are retired or agent-decided; of those, G16 and G27 keep one
owner limb each (weakening secret detection; widening writes or exposure).

## Package files

| File | Bound by the manifest | What it is |
|---|---|---|
| `PROPOSAL.md` | yes | This page |
| `D10-SEMANTIC-DELTA.md` | yes | Doctrine changes, clause by clause, with the sweep |
| `RETIREMENTS.md` | yes | Every lower clause and act retired or superseded, with its fate |
| `D10-LOG-ROW.txt` | yes | The `DOCTRINE-AMENDMENT-LOG.md` row, `<DATE>` filled at recording |
| `proposed/**` | yes | The 11 files the act installs, at their repository paths plus a `.proposed` suffix that the install drops |
| `MANIFEST.txt` | its digest is the act's argument | Package and base rows, built by the recorder's `--write-manifest` |
| `OWNER-SIGNOFF.md` | no (it quotes the digest) | The command and phrase |
| `FOLLOW-ON.md` | no (a plan, editable) | Agent-decided work after adoption |
