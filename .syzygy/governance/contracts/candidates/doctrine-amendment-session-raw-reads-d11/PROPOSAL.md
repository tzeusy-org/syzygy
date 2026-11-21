# Doctrine amendment D11 (proposed): an agent session's own raw reads

**Candidate. Not adopted; changes no doctrine byte until the owner adopts it.**
Doctrine is an owner class (VIS-4 as amended by D10). This page offers the
text; it does not apply it.

## Why this exists

On 2026-11-21 the owner answered the D10 F-10 questionnaire item
`secrets-raw-clone-to-provider` with option A: "Accept the residual risk,
disclosed on every run page"
(`decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`). The packet
stated, beside that option, that it "contradicts SEC-5's 'never sent,
whatever is declared', so it also needs a doctrine amendment of SEC-5". This
is that amendment.

- [Observed] The adopted dossier spec (agent adoption A-4,
  `openspec/changes/dossier-declared-source-model/`) has the authoring session
  read the raw clone through its own agent tool. Syzygy "cannot observe the
  agent tool's own transmissions or attest compliance".
- [Observed] So whatever that session reads goes to its model provider
  unscreened. The only guard is an instruction in the brief.
- [Observed] SEC-2 says, of every send, that content matching the secret
  policy or unclassifiable "is never sent, whatever is declared". Under that
  text a dossier session reading a raw clone is a doctrine violation whenever
  the clone holds a secret.

## What it changes, in one sentence

A session Syzygy briefs to read a repository may read the raw clone and send
what it reads to the run's declared provider, unscreened, on condition that
the run discloses this on its page; everything Syzygy itself sends, keeps or
renders stays screened as before.

## The exact text

Two edits, both in `.syzygy/governance/doctrine/security.md`.

### Edit 1 — SEC-2, one bullet replaced by two

Before:

```markdown
- **Secrets never leave (SEC-5):** content that matches the secret-detection
  policy, or cannot be classified, is never sent, whatever is declared.
```

After:

```markdown
- **Secrets never leave (SEC-5):** content that matches the secret-detection
  policy, or cannot be classified, is never sent by Syzygy, whatever is
  declared. This covers every prompt, request and payload Syzygy builds.
- **One accepted exception: an agent session's own reads.** When Syzygy
  briefs an agent session to read a repository (for example a dossier
  authoring session), the session reads the raw clone through its own tool,
  and what it reads goes to that session's model provider. Syzygy cannot
  screen that traffic. The owner accepts the risk that a secret committed to
  the repository reaches the provider this way, on two conditions:
  - the provider is declared for the run, as for any other send;
  - the run's page discloses, on every run, that the session read the raw
    repository unscreened and that a secret in it may have reached the
    provider.
  What the session writes back into a Syzygy surface or store is still bound
  by SEC-5: a secret reproduced there breaks the trust floor.
```

And SEC-2's violation line, before:

```markdown
- *Violation:* an index synced to a third-party service as a side effect of a
  feature; project content sent to a provider the run did not declare; a
  secret in a prompt.
```

After:

```markdown
- *Violation:* an index synced to a third-party service as a side effect of a
  feature; project content sent to a provider the run did not declare; a
  secret in a prompt Syzygy builds; a session run whose page omits the
  raw-read disclosure.
```

### Edit 2 — SEC-5, one bullet added after "Weakening it is the owner's decision"

```markdown
- **An agent session's raw reads are outside screening** (SEC-2's accepted
  exception, adopted by the owner as D11). The session's own provider traffic
  is not screened and the run discloses so; that is not a weakening of the
  policy, and every other weakening still waits for the owner.
```

SEC-2's opening sentence "Secrets never leave." stays: with edit 1 it reads
as the rule for Syzygy's own sends, and the exception is stated two bullets
below it.

## What it does not change

- The secret-detection policy itself, and what it detects.
- Anything Syzygy sends, stores, renders or serves: all of it stays
  screened, and a secret reproduced on a Syzygy surface still breaks the
  trust floor (`trust-and-evidence.md`, floor bullet 4).
- SEC-3 (observed code): reading is not running.
- Which repositories a session may read. The pursuit question
  `pursuit-2026-11-21-source-reach` (which content classes a dossier may read
  and send) is asked separately; this amendment answers only how a session
  reads.

## Blast radius: lower rules to follow after adoption

Each is an agent adoption once the doctrine lands (VIS-4), not part of this
amendment.

| Rule | Where | What follows |
|---|---|---|
| RFC5-12, RFC5-14 as amended | `contracts/rfcs/RFC-0005/consent-egress-secrets.md` | name the session exception beside "secrets never leave" |
| RFC-0003 manifests, line 289 | `contracts/rfcs/RFC-0003/manifests-and-namespace.md` | same sentence, same addition |
| CC-SEC-2 | `policies/craft-and-care/security-and-secrets.md` | the two-part check applies to Syzygy's sends; the session case is disclosed, not checked |
| Dossier source policy, `agentSessions` | `policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json` | "secrets never leave" for sessions becomes the disclosure rule |
| Dossier run page | the dossier renderer (F-3 era) | renders the raw-read disclosure on every run |

Until the owner adopts this text, SEC-2 and SEC-5 stand as written and no
agent ships a change that relies on the exception.

## How the owner adopts it

In the owner's own words, for example "Adopt D11". An agent then applies the
two edits byte for byte, adds row D11 to
`decisions/DOCTRINE-AMENDMENT-LOG.md` quoting the owner's words, and follows
the blast-radius rows as agent adoptions. The owner may instead amend the
text or decline.
