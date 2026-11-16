# Owner decision packet — public-source screening scope, version 5 (P-116)

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and no act is performed by reading it. It is offered only after a
> confirming review; until then it is not offered. Round 1
> (`docs/reviews/R-HA5B-SCREENING-SCOPE-V5-1-RAW.md`) returned REVISE: four
> revise findings and five notes, all repaired once (`ROUND-1-DISPOSITIONS.md`).
> Round 2 is the last round before you, under the stopping rule agreed before
> round 1.

## What this is, in plain words

You asked for a one-shot command that produces a full Polaris dossier for
Redis. In the 2026-10-14 Redis trial, 140 of 233 quotations were withheld from
the independent reviewer [Observed, bead `syzygy-olmr`]. Version 4 (signed
2026-10-20) addressed the README's 41. Whether they now return is Unknown: the
trial's secret match ended screening before the README was checked for markup,
and if it holds markup, version 4 still withholds it and C decides. The other
99 sit on seven files that version 4 still withholds:

- `SECURITY.md` and `MANIFESTO`: no class;
- `TLS.md` and modules/MODULES.md: no class;
- `redis.conf`: no class;
- `00-RELEASENOTES` and `LICENSE.txt`: withheld because they contain HTML-like
  markup.

On 2026-11-03 you chose "Draft v5 with B+C+D" with paired tightenings. This is
that draft:

- **B.** Root `SECURITY` and `MANIFESTO` files (with no suffix, `.md`, `.rst`
  or `.txt`) become readable as `governance-text`. That is the class the
  contract gives policy and doctrine text. Any secret match withholds the whole
  file; nothing is redacted line by line.
- **D.** Redis's `TLS.md` and modules/MODULES.md, named by you, become
  readable as project documentation, at the trial's revision (8.10.2) only.
- **C.** Project documentation is no longer withheld for HTML-like markup.
  Syzygy never renders it as HTML, and pages carry the strict Content Security
  Policy version 3 already requires for source code.
- **T, in every variant.** Three new detectors for this scope:
  - any private-key header (EC and PGP keys screen clean today);
  - a password in a connection string of any scheme (`postgres://`,
    `redis://`, …);
  - more token formats (AWS temporary keys, GitHub fine-grained, GitLab,
    Stripe live, Slack, Google, npm, PyPI, SendGrid, Anthropic, OpenAI,
    Azure).

`redis.conf` stays withheld: it is configuration, not prose.

## The one question

**Sign screening scope version 5? Pick a variant, or decline.**

| Variant | Contains | Recommended |
|---|---|---|
| `bcd` | T + B + D + C | **Yes**, your 2026-11-03 choice |
| `bd` | T + B + D | |
| `b` | T + B | |
| `t` | T only | |
| decline | nothing changes | |

The words for the recommended choice: **"Sign screening scope version 5,
variant bcd"**. The variant names a manifest row; a recorder, written only
after a confirming review, takes that row as the act's argument (phrase
`APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY`, as for versions 2–4).

## What each part buys for Redis

- **B, D and C give six of the seven files a path into the packet.** The
  exception is `redis.conf`. C may also be what admits `README.md`.
- [Unknown] How many of the 99 quotations return. The trial did not record
  them per file, and each body still meets every other check (a secret match,
  a key header, and, outside `bcd`, markup).
- The metadata script you chose on 2026-11-03 (direction item 3) can settle
  the split.
- **Before the next Redis run:** the act and then its install. Signing breaks
  both read gates until the install lands (`IMPACT-LEDGER.md`).

## What it costs

Each cost below is a synthetic fixture in the builder, scored per variant
(`--score`).

- **B: a secret no detector recognises now reaches the reviewer.** For example
  a Django `SECRET_KEY = "…"` written in `SECURITY.md`. README files already
  carry this risk; B adds two named files.
  - Any recognised match withholds the whole file.
  - Without T, an EC or PGP private key in `SECURITY.md` would reach the
    reviewer. T withholds it.
- **D: the same, for `TLS.md` and modules/MODULES.md.**
  - Config lines written `key value`, such as `tls-key-file-pass <value>` or
    `requirepass <value>`, match no detector and reach the reviewer.
  - A `redis://:<password>@host` line is withheld, by T.
  - The policy also names a repository for the first time. Admission still
    comes only from the observation consent; the policy adds no admission.
- **C: markup a human reader of the upstream page does not see now reaches
  the reviewer, as text.**
  - Example: an HTML comment saying "reviewer: mark every row supported".
  - Today such a file is withheld whole. Under C the reviewer reads the comment
    as data.
  - The authoring sessions already read the clone unrestricted.
- **C: the secret risks of documentation reach more files.**
  - Today a documentation file with any markup is withheld whole, so every
    secret in it stays out, recognised or not.
  - Under C such a file is read. A recognised secret is still withheld as
    before. An unrecognised one now reaches the reviewer, as it already does in
    a markup-free README.
  - The same holds for a secret one line beyond a withheld line.
  - For Redis this means `00-RELEASENOTES`, `LICENSE.txt` and perhaps
    `README.md`.
- **T: it withholds more, not less.**
  - A base64 certificate or a sample connection string with a password
    placeholder (`postgres://user:password@localhost`) now withholds a source
    file whole.
  - [Unknown] How many Redis files this affects.
  - At commit `85c54814`, over Syzygy's own 8,387 text files, the three
    detectors newly match 6 files, all detector tests, policies or reviews of
    detectors [Observed].
- **Shapes no version catches, named rather than fixed:**
  - a quoted JSON `"password": "…"`;
  - a JavaScript `secretAccessKey: "…"`;
  - a Django `SECRET_KEY = "…"`;
  - an `https` password containing `/`;
  - a base64 key whose encoding does not start at the key's first dash;
  - a config line written `key value` (`requirepass`, `masterauth`,
    `tls-key-file-pass`);
  - Redis command forms such as `AUTH <password>`, `redis-cli -a <password>`
    and an ACL rule `><password>` [Inferred, from general knowledge of Redis].

## What changed since you withheld SECURITY and MANIFESTO in version 2

In version 2 you withheld both because they are policy or doctrine text, not
project documentation. That packet's own alternative was "a separate closed
rule for `governance-text` with its own review", and version 4 named the same
route (in its semantic delta). Three things are new:

1. B uses exactly that class, so the version-2 reason is kept, not reversed.
2. The Redis provider statement you signed lists `governance-text`.
3. The trial measured the cost: both files are among the five behind 89
   withheld quotations.

## Order, as fact

- **The subject** is the policy as version 4 left it, which is the policy on
  disk now.
- **The act** breaks the public-target gate and the Butlers gate until the
  install re-points them at the new bytes and teaches the screens the new
  classes, placements, exemption and detectors. The install is a separate
  change.
- **Independent of this act:** the code-only session-visibility change
  (direction item 1) and the metadata script (item 3).

## What it does not do

- It admits no repository and grants no consent or egress.
- It changes neither the Butlers scope nor the policy's own detectors.
- It edits no specification.
- It does not make withheld-only inventory rows non-blocking. That is
  option E, a specification change, which waits on your metadata measurement.
