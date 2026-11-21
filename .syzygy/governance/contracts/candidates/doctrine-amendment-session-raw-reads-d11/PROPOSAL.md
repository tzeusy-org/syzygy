# Doctrine amendment D11 (proposed): a dossier session's own raw reads

**Candidate. Not adopted; changes no doctrine byte until the owner adopts it.**
Doctrine is an owner class (VIS-4 as amended by D10). This page offers the
text; it does not apply it. Review round 1 (`REVIEW-1-RAW.md` beside this
page) returned `REVISE`; every finding was repaired once
(`ROUND-1-DISPOSITIONS.md`).

## Why this exists

On 2026-11-21 the owner answered the D10 F-10 questionnaire item
`secrets-raw-clone-to-provider` ("Agent sessions read raw clones and may send
secrets to the provider"; decision: "how dossier agent sessions may read a
repository") with option A: "Accept the residual risk, disclosed on every run
page" (`decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-21.md`). The
packet stated, beside that option, that it "contradicts SEC-5's 'never sent,
whatever is declared', so it also needs a doctrine amendment of SEC-5". This
is that amendment. Its edits fall mostly in SEC-2, where the "never sent"
sentence lives, and one in SEC-5; it amends both.

- [Observed] The adopted dossier spec (agent adoption A-4,
  `openspec/changes/dossier-declared-source-model/`) has the authoring session
  read the raw clone through its own agent tool, and says Syzygy "cannot
  observe the agent tool's own transmissions or attest compliance".
- [Inferred] So whatever that session reads can reach its model provider
  unscreened, guarded only by an instruction in the brief.
- [Inferred] Under the current SEC-2 text ("never sent, whatever is
  declared"), the session's send of a secret from the clone to its provider
  is a doctrine violation. The read alone is not.
- [Observed] Precedent: the predecessor spec
  `openspec/changes/polaris-dossier-local-agent-mode/` already disclosed that
  the session's reads were not limited by Syzygy.

## What it changes, in one sentence

The authoring session of a Polaris dossier run may read the raw clone and
send what it reads to the run's declared provider unscreened, a weakening of
SEC-5 the owner chose, on condition that the run discloses it; everything
Syzygy itself builds, sends, keeps or renders stays screened as before.

## The exact text

All edits are in `.syzygy/governance/doctrine/security.md`.

### Edit 1 — the file's opening sentence

Before:

```markdown
Syzygy treats observed code as untrusted everywhere, stays within the owner's
tailnet, sends content only to a run's declared provider, keeps secrets out,
and writes into other people's repositories only with the owner's consent.
```

After:

```markdown
Syzygy treats observed code as untrusted everywhere, stays within the owner's
tailnet, sends content only to a run's declared provider, keeps secrets out
of everything it sends, keeps and renders (with one disclosed exception, a
dossier session's own reads), and writes into other people's repositories
only with the owner's consent.
```

### Edit 2 — SEC-2's opening sentence

Before:

```markdown
declared provider.** Secrets never leave. Repository content, or
```

After:

```markdown
declared provider.** Secrets never leave through Syzygy; a dossier
session's own raw reads are the one disclosed exception. Repository content, or
```

### Edit 3 — SEC-2, one bullet replaced by two

Before:

```markdown
- **Secrets never leave (SEC-5):** content that matches the secret-detection
  policy, or cannot be classified, is never sent, whatever is declared.
```

After:

```markdown
- **Secrets never leave through Syzygy (SEC-5):** content that matches the
  secret-detection policy, or cannot be classified, is never sent by Syzygy,
  whatever is declared. This covers every prompt, brief, request and payload
  Syzygy builds, and every transmission through its egress check.
- **One accepted exception: a dossier session's own reads (D11).** The
  authoring session of a Polaris dossier run reads the raw clone through its
  own agent tool, and what it reads goes to that session's model provider.
  Syzygy cannot screen or observe that traffic, even when Syzygy launched the
  session. The owner accepts that a secret in the clone (tracked, untracked
  or ignored files, and git metadata alike) may reach the provider this way,
  and that the session may read any content class in the clone, not only the
  classes the run declares. Two conditions hold:
  - the provider is declared for the run, as for any other send;
  - the run discloses, on every run, that the session read the raw clone
    unscreened and that a secret in it may have reached the provider. The
    disclosure goes wherever the dossier spec puts its authoring disclosure:
    the run record, the dossier's appendix and every rendered page's machine
    form; a run that renders no page still records it in the run record.
  The exception covers no other session or feature. What the session writes
  back into a Syzygy surface or store is still bound by SEC-5: a secret
  reproduced there breaks the trust floor.
```

### Edit 4 — SEC-2's violation line

Before:

```markdown
- *Violation:* an index synced to a third-party service as a side effect of a
  feature; project content sent to a provider the run did not declare; a
  secret in a prompt.
```

After:

```markdown
- *Violation:* an index synced to a third-party service as a side effect of a
  feature; project content sent to a provider the run did not declare; a
  secret in a prompt Syzygy builds; a dossier run without the raw-read
  disclosure; any other session sent raw repository content unscreened.
```

### Edit 5 — SEC-5, one bullet added after "Weakening it is the owner's decision"

```markdown
- **One weakening the owner chose (D11):** a dossier session's own raw reads
  are not screened, and the run discloses so (SEC-2's accepted exception).
  Every other weakening still waits for the owner.
```

## What it does not change

- The secret-detection policy itself, and what it detects.
- Anything Syzygy builds, sends, stores, renders or serves: all of it stays
  screened, and a secret reproduced on a Syzygy surface still breaks the
  trust floor (`trust-and-evidence.md`, floor bullet 4).
- Any session or feature other than a Polaris dossier run's authoring session.
- SEC-3 (observed code): reading is not running.
- Which content classes a dossier *should* read and present. The pursuit
  question `pursuit-2026-11-21-source-reach` asks that separately. This
  amendment only accepts that a raw read can reach any class; the owner may
  narrow it there.

## Blast radius: lower rules to follow after adoption

Each is an agent adoption once the doctrine lands (VIS-4), not part of this
amendment. Sweep and denominators: `REVIEW-1-RAW.md` §Sweep.

| Rule | Where | What follows |
|---|---|---|
| RFC5-15, the single egress choke point | `contracts/rfcs/RFC-0005/consent-egress-secrets.md` | the session's own provider traffic does not traverse the choke point and is not a side-effect violation; Syzygy's own transmissions still must |
| RFC5-12, RFC5-14 as amended | same file | name the exception beside the "matching or unclassifiable content never leaves" readings |
| RFC3-7 | `contracts/rfcs/RFC-0003/manifests-and-namespace.md` | its "secrets never leave" sentence gains the exception |
| CC-SEC-2 | `policies/craft-and-care/security-and-secrets.md` | the two-part check applies to Syzygy's sends; the session case is disclosed, not checked |
| Dossier source policy | `policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json`, `agentSessions` and the storage rule | "secrets never leave" for sessions becomes the disclosure rule |
| Dossier spec | `openspec/changes/dossier-declared-source-model/` (spec lines 31 and 525, `SEMANTIC-DELTA.md`, `design.md`) | the required disclosure "SEC-2 and SEC-5 bind the agent's own reads and sends" becomes false; a spec amendment replaces it with the raw-read disclosure |
| Dossier renderer and run record | the dossier packages (F-3 era) | render and record the disclosure |
| `heart-and-soul` skill | `.claude/skills/heart-and-soul/SKILL.md` and the `.codex` copy | refresh the SEC summary |

Until the owner adopts this text, SEC-2 and SEC-5 stand as written and no
agent ships a change that relies on the exception.

## How the owner adopts it

In the owner's own words, for example "Adopt D11". An agent then applies the
five edits byte for byte, adds row D11 to
`decisions/DOCTRINE-AMENDMENT-LOG.md` naming SEC-2 and SEC-5 and quoting the
owner's words, and follows the blast-radius rows as agent adoptions. The
owner may instead amend the text (for example, limit the exception to public
repositories) or decline.
