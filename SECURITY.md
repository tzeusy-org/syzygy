# Security

Nothing of this project is deployed or released, but running it locally
executes its code. The committed security rules are doctrine SEC-1…SEC-5, and
a governance-level security defect is reported as a GitHub issue.

## Scope

Nothing is deployed or released, yet the repository carries runnable code, so
a reader who runs it takes on a real local attack surface.

- **Nothing here is deployed, and nothing here is released.** No service of
  this project runs on any host the reader does not start themselves, and no
  build of it has been published anywhere.
- **But this repository is no longer only documents.** It carries a runnable
  local daemon, a bounded local POC, and 224 tracked TypeScript and
  JavaScript files across five packages and two apps.
  - A reader who runs `npm install` and `npm run build` is executing this
    project's code on their own machine, and that is a real attack surface
    even though nothing is deployed.
- **Executable content, disclosed in full:**
  - **TypeScript under `packages/` and `apps/`**, built and run through the
    npm workspaces declared in `package.json`. Nothing starts on its own.
    - `packages/http-host` binds an HTTP listener on loopback and admits
      machine requests by credential; `packages/cap1-daemon` serves a
      browser page and a credential-gated machine endpoint through it.
    - `apps/three-surface-poc` and `packages/three-surface-poc-core` are the
      bounded Three-Surface POC; `npm run poc` starts them.
  - **`npm run poc:pwb-mutation-run` and `poc:pwb-mutation-sweep` rewrite
    source files in place** while they run — a working-tree effect, not a
    read-only check. Do not run either over uncommitted work.
  - **`npm test`, `npm run test:system` and `npm run typecheck`**, which
    execute this project's own code. `test:system` starts the daemon; its
    fresh-clone case is gated behind `SYZYGY_FRESH_CLONE=1` and does not run
    by default.
  - **Third-party npm dependencies** resolved from `package-lock.json`. This
    project pins the lockfile and does not audit its transitive tree.
  - **Two GitHub Actions workflows**, both on push and pull request to
    `main`:
    - `.github/workflows/governance-docs.yml` — the documentation checks
      below;
    - `.github/workflows/node-ci.yml` — build and test on Node 24.
  - **Python validation scripts** under `scripts/` and
    `.syzygy/governance/contracts/candidates/scripts/`, stdlib-only. The
    `check_*`/`verify_*` scripts and every generator's `--check` and
    `--selftest` modes are read-only; a generator run **without** `--check`
    writes its derived file.
  - **Tracked git hooks under `.beads/hooks/`** (Beads issue-tracker
    integration). **Cloning never activates them** — `git clone` does not
    install hooks.
  - **`.claude/settings.json`**, which runs `bd prime` on session start for
    anyone opening the repository in Claude Code.
- *Superseded, dated:* until 2026-09-06 this section opened "**Syzygy has no
  running software, no deployed service, and no released artifact.** There is
  no product attack surface today", and its disclosure list named only the
  hooks, one workflow, the Claude settings file and the Python scripts,
  closing "Nothing else in this repository executes." That was true when
  written on 2026-08-05. It stopped being true on 2026-08-21, when
  Capability 1 implementation was authorized, and again on 2026-08-29 with
  the POC — and the page was not restated for either. A security disclosure
  that lists a repository's executable content has to be re-derived when the
  repository grows code, not left to age behind its own confidence.

## Committed posture

The security rules the project has already adopted are doctrine
**SEC-1…SEC-5** in
[`.syzygy/governance/doctrine/security.md`](.syzygy/governance/doctrine/security.md).
**That file is the authority; this table is a faithful summary, and where
they differ, doctrine wins.**

| Rule | Summary |
|---|---|
| **SEC-1 — Authenticated by default** | Endpoints reachable unauthenticated only on loopback, and client classes distinguished even there: browser requests pass origin/CSRF checks including on loopback; non-browser clients are admitted only through an explicit machine-client mechanism; location never proves identity. Any exposure beyond localhost requires authenticated, TLS-protected access limited to the owner's devices |
| **SEC-2 — Egress through consent** | Governed-project content — including anything derived from it, prompts included — leaves owner-controlled infrastructure only under explicit, recorded, per-project consent naming the permitted providers and the content classes that may be sent. Model providers are such services; providers not named require fresh consent, and remote backing dependencies are permitted under the same consent rule. Absent consent, the inferred layer renders Unknown rather than being computed |
| **SEC-3 — Observed code is untrusted, everywhere** | Observed-project code executes only inside an explicit opt-in execution profile — default-deny, isolated credentials, declared network access, resource limits, and destructive-operation gates — untrusted regardless of who owns the project. No observed code executes at all until the profile contract is accepted |
| **SEC-4 — Writes consented, attributed, revertable** | Syzygy writes into a governed repository only after recorded per-repository consent; every write is attributed, atomic, and individually revertable; existing governance artifacts it did not author are never overwritten without surfacing the conflict |
| **SEC-5 — Secrets never indexed** | Observation applies a declared secret-detection policy; matching content is excluded and the exclusion rendered; unclassifiable content fails closed — excluded, not indexed. A secret in any surface, store, or endpoint is a trust-floor violation |

These are floors an implementation may strengthen and may never weaken,
waive, or temporarily bypass; changing them is an owner doctrine amendment.

## Reporting

Nothing is deployed, so there is no production incident to report; open a
GitHub issue for a governance-level security defect.

- **What can be reported:** a defect in what a reader runs locally — in the
  daemon, the POC, the test harness, or the tooling above.
- **A governance-level security defect** — a rule that would permit an
  unsafe implementation, a contradiction between security rules, or a gap a
  first implementation could fall through: please open a GitHub issue
  describing both readings. Governance defects are cheapest to fix before
  they become code.
- **Contact:** a dedicated security contact address arrives with the first
  deployable artifact.

## What this project does not claim

The project claims neither security nor independently verified governance
records.

- **It does not claim to be secure.** The code here has had no security
  review, no dependency audit and no penetration testing; the daemon's
  loopback posture and its origin, CSRF and machine-client checks are
  asserted by their own conformance tests and by nothing independent.
  *(Until 2026-09-06 this bullet read "nothing exists to be secure" —
  written before any code existed.)*
- **It does not claim its governance records are independently verified:**
  records in this tree sit within the write reach of the actors they govern.
  The project states that gap (see the acceptance record's two-state
  provenance model) rather than hiding it.
