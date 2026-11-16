# Owner decision packet — public-source screening scope, version 8 (private sources)

> **PERFORMED 2026-11-09.** The owner selected variant `pv`, and the act is
> recorded at 2026-11-09T09:27:14Z in
> `.syzygy/governance/decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V8-ACT.md`.
> The pre-act banner below is the text as drafted and reviewed, left unedited.

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and reading it performs no act. It is offered to you only after a
> confirming independent review; until then it is not offered.

## What this is, in plain words

On 2026-11-08 you answered "Private too: a screening-policy successor
admitting private sources is drafted, reviewed and offered to you separately"
(launch-consent questionnaire, item `syzygy-pdja.21-public`, answer B). Today
the screening policy reads only repositories whose observation consent says
they are public. A launch on any other repository is refused. Version 8 lifts
that refusal. Admitting private repositories is itself a loosening: their
content then enters run directories and pages, and reaches your local
agent's provider. Every rule that applies to them once admitted is the same
as for a public repository or stricter.

- **A private repository is read under the same observation consent** you
  give at launch. Nothing else admits one.
- **Private is the default.** A repository counts as public only when every
  consent record it has says so: your yes to "is it public?" at launch, or
  the existing redis consent, which is public by its form. Anything else
  makes it private, labelled Inferred, including a launch record that says
  nothing or cannot be read. Syzygy does not check the host. If you launch a
  private fork at a commit of a public repository, it shares that
  repository's identity, and the whole repository then counts as private,
  its public runs included. Those runs lose partial redaction and the fetch,
  and your public-target egress consent stops covering the repository. A
  consent record whose repository cannot be read at all stops every run
  until it is fixed or revoked.
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
- **A withheld private file's fingerprint stays out of pages and sends.**
  For a private repository, the Git object id and size of every file that
  is withheld, for any reason, are not shown on any page and not sent
  anywhere. That covers a secret-detector match, a denied path such as
  `.env` or a key file, a file of a kind the policy cannot classify, and a
  file whose kind your consent does not cover. The object id stays only in
  the run directory's check records and its review packets; the size is
  kept in neither.
  Public repositories keep showing them, as today.
- **Every detector, placement and storage rule stays as it is.**

## The one question

**Sign screening scope version 8? Sign, or decline.**

The words, if you sign: **"Sign screening scope version 8, variant pv"**.
There is one variant, `pv`, and the words name the package's one manifest
row. A recorder takes that row as the act's argument, under the phrase
`APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY` as for versions 2–7.
It supersedes the version-7 act. No agent may sign it for you.

Recommended: sign. It is what you asked for, and you have already answered
the three questions below. Beyond admitting private repositories, no
screening rule gets looser for anyone.

## What it costs

- **Your local agent is not covered by this policy, and it reads everything.**
  In the local-agent mode, your coding agent reads the clone without
  restriction, secrets included, and sends what it reads to its own
  provider. The screening policy binds only what Syzygy itself reads, stores,
  renders and sends (REQ-polaris-generation-033). For a private repository
  with no evidence drawer and no `openspec/` or `.syzygy/` tree, the spec asks
  for no per-project provider statement. Its content reaches your agent's
  provider on your act alone. You chose this (question 1 below).
- **More withheld files.** A private repository's documentation with any
  secret-looking line is withheld whole, so its dossier can show more Unknown
  than a public one would.
- **Withholding a whole file does not hide everything.** Two fingerprints of
  the whole file exist: the digest the rules require Syzygy to record, and
  the file's Git object id. If someone knows the rest of the file, for
  example a private fork that differs from the public original by one secret
  line, either fingerprint lets them confirm a guess at that line, and the
  file's size narrows the guess. Today, version 7 shows the Git object id on
  dossier pages and counts it, with the size, as content an egress consent
  may send. Version 8 stops both for every withheld private file. What
  remains: anyone who can read the run directory, or your clone (which holds
  every object id), can still check a guess. The commit id, shown on every
  page's file rows and kept in the launch record, also covers every file in
  the commit, so someone who knows the rest of the tree and the commit's
  author, dates, message and parent can check a guess against it. That is a
  narrower check than the object id, and the commit id cannot be withheld. A
  secret that no detector
  recognises, in a file the policy admits, is shown as before, for public
  and private repositories alike.
- **One broken consent record stops every run.** If a file that a launch
  recording added cannot be read, Syzygy cannot tell whether it is a consent
  record or which repository it concerns, so it refuses every run, public
  ones included, until it is read or a later record revokes it (records are
  only ever added, never edited or removed). That includes a recorded file
  that should be a drawer or provider statement. Other files the branch
  carries, such as decision records, do not count.
  Launch records sit where your agent could write, so one malformed record
  there would stop everything. It never exposes anything; it only stops.
- **The label is your word.** If a private repository is declared public, it
  gets the public rules: partial redaction, an upstream fetch in the provider
  mode, and coverage by your public-target egress consent if that consent
  names it. Syzygy cannot catch that.
- **When it takes effect.** The code that reads the policy (redaction, the
  visibility reader, the egress check) must change with it, and some of those
  files are under the surface merge freeze. Your signature is recorded in the
  same change as that code. Until then the policy file stays at version 7,
  public runs keep working, and private launches stay refused. If the policy
  changed without the code, every run, public ones included, would be
  refused, so the two are not separated.
- **It also waits for launch-consent spec version 1.1.** You chose that the
  launch question warns that a private repository's name and URL go onto a branch
  of Syzygy's repository (question 2 below). That warning is drafted into
  launch-consent spec version 1.1. Version 8 takes effect only after you
  have signed version 1.1, even if you sign version 8 first. Until both are
  signed and installed, private launches stay refused.

## Questions you have answered

You answered all three on the owner questionnaire 2026-11-08T12:24:33Z,
recorded in .syzygy/governance/decisions/OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2.md
(it lands with PR #798). Each answer below quotes that record. None of them changes this
policy's bytes.

1. **Should every private repository need a per-project provider statement
   before a run?** Today the specification asks for one only for "governed"
   repositories, and this policy cannot require one.
   **Your answer (item `syzygy-pdja.23-provider-statement`, B): "No: the
   launch answer suffices".** No provider statement is needed for a
   non-governed private repository. So a private repository with no evidence drawer and no
   `openspec/` or `.syzygy/` tree reaches your agent's provider on your
   launch alone, as "What it costs" says. No specification amendment follows
   from this answer.
2. **Whose private repositories, and where their names go?** The policy
   cannot tell your own repositories from ones you hold under a duty of
   confidence. Each launch record also writes the repository's name, URL and
   commit into Syzygy's own repository, on a branch Syzygy never pushes.
   **Your answer (item `syzygy-pdja.23-confidence`, C): "Only the
   name-on-branch warning".** The warning covers the repository's name and
   URL going onto that branch, with no confirmation that you may disclose
   the repository. The warning is drafted into launch-consent spec
   version 1.1, and version 8 does not take effect before 1.1 is signed.
   Nothing asks you to confirm a duty of confidence; that stays your own
   judgement at each launch.
3. **Retention.** No run directory has a retention period today, public or
   private.
   **Your answer (item `syzygy-pdja.23-retention`, A): "No retention rule
   for now; revisit after the first private runs".** A private repository's
   run directory is kept like any other until you delete it, and the
   question comes back after the first private runs.

## If you decline

Version 7 stays in force. A launch on a repository not declared public stays
refused, and the refusal names this successor.
