# Owner decision packet — public-source screening scope, version 8 (private sources)

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and reading it performs no act. It is offered to you only after a
> confirming independent review; until then it is not offered.

## What this is, in plain words

On 2026-11-08 you answered "Private too: a screening-policy successor
admitting private sources is drafted, reviewed and offered to you separately"
(launch-consent questionnaire, item `syzygy-pdja.21-public`, answer B). Today
the screening policy reads only repositories whose observation consent says
they are public. A launch on any other repository is refused. Version 8 lifts
that refusal, and everything it changes for a private repository is stricter.

- **A private repository is read under the same observation consent** you
  give at launch. Nothing else admits one.
- **Private is the default.** A repository counts as public only when its
  consent record says so. Your declaration decides it, labelled Inferred.
  Syzygy does not check the host.
- **Syzygy fetches nothing for a private repository and uses no credential
  for it.** It reads only the clone you already have.
- **No partial redaction for private repositories.** For a public repository,
  a documentation file with a secret-looking line is shown with that line
  blanked. For a private one, the whole file is withheld. A blanked line next
  to a recorded file digest can be guessed and confirmed offline. That
  matters only when the rest of the file is not already published.
- **Syzygy's own sends to a provider** (the provider mode, not your local
  agent) need an egress consent that names the repository and says it is
  private. Your existing public-target egress consent never covers one.
- **Every detector, class rule, placement and storage rule stays as it is.**

## The one question

**Sign screening scope version 8? Sign, or decline.**

The words, if you sign: **"Sign screening scope version 8, variant pv"**.
There is one variant, `pv`, and the words name the package's one manifest
row. A recorder takes that row as the act's argument, under the phrase
`APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY` as for versions 2–7.
It supersedes the version-7 act. No agent may sign it for you.

Recommended: sign, if you accept open question 1 below as it stands. It is
what you asked for, and nothing gets looser for anyone.

## What it costs

- **Your local agent is not covered by this policy, and it reads everything.**
  In the local-agent mode, your coding agent reads the clone without
  restriction, secrets included, and sends what it reads to its own
  provider. The screening policy binds only what Syzygy itself reads, stores,
  renders and sends (REQ-polaris-generation-033). For a private repository
  with no evidence drawer and no `openspec/` or `.syzygy/` tree, the spec asks
  for no per-project provider statement. Its content reaches your agent's
  provider on your act alone. See open question 1.
- **More withheld files.** A private repository's documentation with any
  secret-looking line is withheld whole, so its dossier can show more Unknown
  than a public one would.
- **The label is your word.** If a private repository is declared public, it
  gets the public rules: partial redaction, and an upstream fetch in the
  provider mode. Syzygy cannot catch that.
- **Install work follows.** Signing changes the policy file. The code that
  reads it (redaction, the visibility reader, the egress check) is a separate
  change, subject to the surface merge freeze. Until it lands, the read gates
  refuse the new policy.

## Open questions for you

1. **Should every private repository need a per-project provider statement
   before a run?** Today the specification asks for one only for "governed"
   repositories. This policy cannot require one, because only the
   specification can (REQ-polaris-generation-033, or the launch-consent
   change). Answering yes means a specification amendment, drafted
   separately. Answering no keeps sending a private repository's content to
   your agent's provider on your launch alone.
2. **Whose private repositories?** The policy cannot tell your own
   repositories from ones you hold under a duty of confidence (an employer's,
   a client's). Should the launch question ask you to confirm that you may
   disclose the repository to the named provider? That would also be a
   specification change.
3. **Retention.** No run directory has a retention period today, public or
   private. Should a private repository's run directory have one? That would
   be its own rule.

## If you decline

Version 7 stays in force. A launch on a repository not declared public stays
refused, and the refusal names this successor.
