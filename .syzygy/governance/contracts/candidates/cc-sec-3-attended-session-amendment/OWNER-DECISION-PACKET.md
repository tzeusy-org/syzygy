> **Candidate — binds nothing. Draft only, 2026-11-04.** No owner sign-off,
> policy installation, execution permission or implementation change is recorded.

# Owner decision packet — CC-SEC-3 after D9

This is the draft you requested under GP-Q7, prepared for independent review.
It is not yet a sign-off offering. P-117 routes here; the package name is
`cc-sec-3-attended-session-amendment`. The exact proposed policy is the patch
in `proposed/`; the current and proposed text appear in full in the delta.

## What signing would do: the five disclosures

1. **Signing enables the execution-permitting arm.** It clears the policy
   gate on `PERMITTING_ARM_ENABLED` in
   `packages/polaris-dossier/src/execution-rule.ts`. The flag is false at
   the baseline [Observed, source inspection]. It changes only in a separate
   bead, after the implementation is verified to disclose everything
   REQ-polaris-generation-033 requires and a CC-REV-1 class-4 review passes.
   This draft, a merge of it, or policy sign-off alone flips no flag.
2. **The credential condition then binds permanently.** SEC-3 requires:
   > Syzygy keeps every credential it holds for its typed adapters where
   > neither the session nor any process it starts, directly or not, can read
   > it at the operating-system level, for as long as any of them runs.

   [Observed] GP-Q7 expressly accepts D9 note N2's standing cost: once Syzygy
   holds such a credential, it must remain unreadable to the operator's user
   permanently. Syzygy cannot know when every descendant has ended or whether
   observed code arranged to restart. A tool permission/deny setting cannot
   establish the required OS isolation. The login-copy question below can
   make that cost immediate at sign-off; the author has not inspected whether
   any such copies exist on this host [Unknown].
3. **Choice and attendance are operator declarations.** REQ-polaris-generation-033
   says Syzygy **"cannot observe who ran the command"**. An agent can run the
   choice command or rewrite same-user state; the record and declaration are
   Inferred. Sessions often run with permission bypass: that is the risk
   disclosed by this packet, not a frequency measured in this drafting lane
   [Inferred; the implementation exposes that option]. When the owner leaves,
   the permission lapses and the brief tells the agent to run no further
   observed code. With permission bypass, that lapse instruction is often the
   only control on continued execution. It relies on the session following
   it; Syzygy cannot observe attendance, enforce a stop, or supply containment.
4. **The launched-run marker repair has landed.** [Observed] The repository
   contains the fail-closed launched-marker implementation at both
   `allow-execution` and execution-rule selection; the tracker records
   `syzygy-bpyt.8.8` closed by PR #496, merge commit `c571fb9f`.
   [Unknown] This draft does not re-certify the implementation's entire
   REQ-033 conformance. A launched session never receives the exception.
5. **RFC5-12 (c) remains queued and non-blocking.** [Observed] The D9 row in
   DOCTRINE-AMENDMENT-LOG.md records Q3 (a), the effect on RFC5-12, with
   Q3 (c), the RFC 0005 amendment, queued and not blocking. RFC5-12 still
   says execution consent is per project for a specific profile version,
   and, absent it, **"no observed code runs"**. D9's per-run choice is not
   that consent and approves no profile. This packet changes no RFC bytes
   or the distinct RFC5-24 credential population.

## Q1 — how to classify the Claude Code login copies

[Observed, Syzygy source only] `prepareAgentHome` in
`packages/polaris-dossier/src/polaris.ts` copies the operator's Claude Code
login into each launched session's private home under
`<stateRoot>/<runId>.agents/<role>/.claude/`, with file mode 0600.
The retained review R-GP-IMPL-ADAPTER-CREDENTIALS-1, note N3, found only
creators, no tracked remover, and inferred persistence. This draft opens
neither the source login nor a copy. Presence, ownership and effective OS
readability of actual copies remain [Unknown]. Mode 0600 does not isolate a
file from other processes of the same user [Inferred from the permission model].

SEC-3 says "every credential it holds for its typed adapters";
REQ-polaris-generation-033 says "hold or write". Doctrine describes the
Claude CLI as a substrate and states **"Substrate tools are adapters, not
doctrine."** The implementation lane called these the session's own login;
N3 judged that reading contestable for copies Syzygy writes and retains.
Neither reading is recorded as the owner's ruling here.

- **A — treat the copies as typed-adapter credentials (drafter's recommendation,
  Inferred).** This is the conservative reading of Syzygy writing and holding
  credentials for a substrate it launches. The configured list/declarations
  must name them. The probe must refuse while a copy is readable by the
  operator's user. Cleanup or relocation into OS isolation is required before
  a permitting brief; mode 0600 under the same user is insufficient. If a
  copy already exists when the policy is signed, N2's permanent condition
  starts then. Do not claim its cleanup or completeness from this packet.
- **B — rule that they are the session's own login, outside that population.**
  Record the ruling and its reason explicitly, addressing why Syzygy's act
  of copying and keeping it does not make it a credential held for its typed
  adapter. The copies then remain an acknowledged exposure, not a credential
  isolation guarantee. A narrow ruling about these copies does not exclude
  every future agent-tool credential.

The owner may hold the amendment pending this ruling. No selection is assumed.
Any selected arm that changes security or retention behavior requires its
own authorized implementation work and verification before the flag flips.

## Q2 — the credential probe's remaining reads and disclosures

[Observed] `syzygy-bpyt.8.15` is blocked awaiting
`NEW_CREDENTIAL_PROBE_OUTPUT_LISTING`. Notes N1 and N2 of
R-GP-IMPL-ADAPTER-CREDENTIALS-1 identify two defects latent while the arm is
off: declaration/list refusal can skip the step's base credential reads, and
a configuration refusal renders an Observed readability assertion even
though no read established readability. Signing this policy does not list
new refusal strings, wire values or render bytes under GP-Q0.

- **A — preserve REQ-033's literal reads and honest labels (recommended).**
  Before the flip, obtain an explicit owner listing for .8.15's refusal-string,
  finding-kind and render changes; implement it; verify that base reads are
  attempted on each refusal and that configuration refusal does not claim
  Observed readability; then close .8.15. Exact output bytes remain to be
  offered in that separate work. This packet grants no inferred listing.
- **B — choose a different reading of REQ-033.** State it explicitly and route
  any changed obligation through its signed specification amendment before
  relying on it. A plain answer cannot silently amend the signed requirement.
  Until the resulting authority and implementation are verified, keep the
  execution arm off.

## Other pre-flip costs and gates

- **N5 completeness residual.** [Observed] CONFIGURED_ADAPTER_DECLARATIONS
  is a second hand-kept constant beside CONFIGURED_ADAPTER_CREDENTIALS.
  Its fail-closed membership check cannot catch an adapter absent from both.
  When the first credential-holding adapter lands, derive declarations from
  adapter modules or a registry credential field, with a test that every
  source opening a credential path is represented. Q1 arm A would make this
  work immediate rather than a future first-adapter concern. Until then the
  source inspection supports an inference, not a proof of completeness.
- **N6 rendered disabled reason.** The reason still names the already-merged
  `syzygy-qkea.5` gate [Observed, execution-rule.ts]. Replace it with wording
  about this policy gate and the verified pre-flip gates in the same
  owner-visible change that flips the flag. The exact changed brief bytes
  need an owner listing; this packet does not silently approve them.
- Verify REQ-033's human and machine disclosures, Inferred stored records,
  reported commands beside execution-dependent claims, exact SEC-3 cost
  quotation, per-run choice and lapse, launched-run refusal, and OS probe at
  brief issuance and each subsequent step. Record the exact head and a fresh
  class-4 review. A passing check alone is not an owner act.

## Decision order

Independent review first; disposition its findings under the stopping rule;
then offer the exact reviewed policy through the craft-amendment act route.
Record Q1 and Q2 explicitly, including any conditions. An owner may sign the
policy while later implementation gates remain closed; signing is not
certification that those gates passed. Resolve those gates and authorize the
owner-visible flag/refusal/disclosure change separately. Each actual run
still needs its own owner-entered choice and attendance declaration.

No daemon execution, provider call, egress, credential read, target-repository
body read, policy installation or per-run choice occurs in this drafting task.
The parked provider island remains parked under GP-Q0 part 2.
