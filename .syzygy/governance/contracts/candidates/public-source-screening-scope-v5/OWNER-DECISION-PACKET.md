# Owner decision packet — public-source screening scope, version 5 (P-116)

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and reading it performs no act. It is offered only after a
> confirming review.
>
> **Review history.**
> - Round 1 (`docs/reviews/R-HA5B-SCREENING-SCOPE-V5-1-RAW.md`) returned
>   REVISE. Its findings were repaired once (`ROUND-1-DISPOSITIONS.md`).
> - Round 2 (`docs/reviews/R-HA5B-SCREENING-SCOPE-V5-2-RAW.md`) returned
>   `CONFIRM WITH EXCEPTIONS` with notes only. That cleared the bytes at
>   `9daf9e04` (`ROUND-2-DISPOSITIONS.md`).
>
> **What changed after round 2.** The same day, your metadata measurement of
> the trial landed (`docs/evidence/redis-trial-metadata-2026-11-03.json`).
> - This packet now uses its figures.
> - It offers two further variants, beyond your chosen scope.
> - It repairs round-2 notes 1 and 2.
> - Rows `bcd`, `bd`, `b` and `t` are unchanged byte for byte. This text and
>   the two new rows are unreviewed until the next review round clears them.

## What this is, in plain words

You asked for a one-shot command that produces a full Polaris dossier for
Redis.

In the 2026-10-14 Redis trial, 145 of 244 cited quotations were withheld from
the independent reviewer [Observed, your measurement of the packet that
fidelity verdict 3 names]. Every unresolved inventory row and block cites at
least one of them. The bead recorded 140 of 233; which of the run's three
packets it counted is not recorded.

Version 4 (signed 2026-10-20) addressed the README's 41. Whether they now
return is Unknown: the trial's secret match ended screening before the README
was checked for markup. If it holds markup, version 4 still withholds it and
C decides.

The other 104 sit on eleven files that version 4 still withholds:

| File | Withheld spans | Why |
|---|---|---|
| `redis.conf` | 39 | no class |
| `MANIFESTO` | 32 | no class |
| `SECURITY.md` | 10 | no class |
| `00-RELEASENOTES` | 9 | HTML-like markup |
| `TLS.md` | 7 | no class |
| modules/MODULES.md | 2 | no class |
| `LICENSE.txt` | 1 | HTML-like markup |
| REDISCONTRIBUTIONS.txt, modules/vector-sets/README.md, src/commands/README.md, src/commands.def | 1 each | no class |

On 2026-11-03 you chose "Draft v5 with B+C+D" with paired tightenings. This is
that draft:

- **B.** Root `SECURITY` and `MANIFESTO` files (with no suffix, `.md`, `.rst`
  or `.txt`) become readable as `governance-text`. That is the class the
  contract gives policy and doctrine text. Any secret match withholds the
  whole file; nothing is redacted line by line.
- **D.** Redis's `TLS.md` and modules/MODULES.md, named by you, become
  readable as project documentation, at the trial's revision (8.10.2) only.
- **C.** Project documentation is no longer withheld for HTML-like markup.
  Syzygy never renders it as HTML, and pages carry the strict Content Security
  Policy that version 3 already requires for source code.
- **T, in every variant.** Three new detectors, for this scope only:
  - any private-key header (EC and PGP keys screen clean today);
  - a password in a connection string of any scheme (`postgres://`,
    `redis://`, …);
  - more token formats: AWS temporary keys, GitHub fine-grained, GitLab
    personal, Stripe live, Slack, Google API keys, npm, PyPI, SendGrid,
    Anthropic, OpenAI project keys, and an Azure `AccountKey=` written
    without spaces.

Under your chosen scope, `redis.conf` stays withheld: it is configuration, not
prose. It is also the largest withheld file. So, separately, two further
variants go **beyond your chosen scope**:

- **P (`bcdp`).** `bcd`, plus `redis.conf` placed as project documentation at
  8.10.2 only. A fourth detector comes with it: any line that opens with
  `requirepass`, `masterauth`, `tls-key-file-pass` or
  `tls-client-key-file-pass` and a value, or with an ACL rule
  `user … >password`, is withheld with its neighbouring lines, commented or
  not.
- **X (`bcdpx`).** `bcdp`, plus REDISCONTRIBUTIONS.txt and the two nested
  READMEs the trial cited (1 span each).

## The one question

**Sign screening scope version 5? Pick a variant, or decline.**

| Variant | Contains | Spans that may return (upper bound) | Recommended |
|---|---|---|---|
| `bcd` | T + B + D + C | 61 | **Yes**, your 2026-11-03 choice |
| `bd` | T + B + D | 51 | |
| `b` | T + B | 42 | |
| `t` | T only | 0 | |
| `bcdp` | `bcd` + P, **beyond your chosen scope** | 100 | optional |
| `bcdpx` | `bcdp` + X, **beyond your chosen scope** | 103 | optional |
| decline | nothing changes | 0 | |

"May return" is an upper bound. Each file still meets every other check: a
secret match, a key header, and, outside the `c` variants, markup. A returned
quotation need not resolve its row. [Unknown] Which rows each variant
resolves: the measurement names the failing rows but not the files their
quotations sit on.

The words for the recommended choice: **"Sign screening scope version 5,
variant bcd"**. For P: "…, variant bcdp".

The variant names a manifest row. A recorder, written only after a confirming
review, takes that row as the act's argument, with the phrase
`APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY`, as for versions 2–4.

## What each part buys for Redis

- **B: 42 spans** (`SECURITY.md` 10, `MANIFESTO` 32).
- **D: 9** (`TLS.md` 7, modules/MODULES.md 2).
- **C: 10** (`00-RELEASENOTES` 9, `LICENSE.txt` 1). C may also be what admits
  the README's 41.
- **P: 39** (`redis.conf`), beyond your chosen scope.
- **X: 3**, beyond your chosen scope.
- **Not reached by any variant:** src/commands.def (1), a generated C table.
- **Before the next Redis run:** the act, then its install. Signing breaks
  both read gates until the install lands (`IMPACT-LEDGER.md`).

## What it costs

Each cost below is a synthetic fixture in the builder, scored per variant
(`--score`).

- **B: a secret no detector recognises now reaches the reviewer.** For example,
  a Django `SECRET_KEY = "…"` written in `SECURITY.md`. README files already
  carry this risk; B adds two named files.
  - Any recognised match withholds the whole file.
  - Without T, an EC or PGP private key in `SECURITY.md` would reach the
    reviewer. T withholds it.
- **D: the same, for `TLS.md` and modules/MODULES.md.**
  - Config lines written `key value`, such as `tls-key-file-pass <value>` or
    `requirepass <value>`, match no detector in `bd` or `bcd`, and they reach
    the reviewer.
    - Version 4's line redaction does not catch them: it withholds only lines
      a detector matches.
    - P's detector would catch them.
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
- **P (beyond your chosen scope): the server's whole option file joins the
  documentation residuals.**
  - The four named directives and ACL `>password` rules are withheld line by
    line, commented or not, with one line either side. The rest is read.
  - A secret written any other way reaches the reviewer:
    - a password in a prose comment;
    - a `rename-command CONFIG <secret name>` target;
    - a password option the detector does not name.
  - [Inferred] The shipped file holds example values, not deployed ones. The
    placement is pinned to 8.10.2, so a later revision gets no class until
    you place it again.
  - P depends on C. The file writes placeholders in angle brackets, and
    without C those would withhold it whole [Inferred].
  - The detector also withholds, whole, any code file with a line that opens
    with such a directive. Example: a test fixture writing
    `requirepass <value>`. It matches none of Syzygy's own 8,402 text files.
    [Unknown] How many Redis files it matches.
- **X (beyond your chosen scope):** three more files carry the documentation
  residuals, for 3 spans.
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
  - outside P, a config line written `key value` (`requirepass`,
    `masterauth`, `tls-key-file-pass`);
  - Redis command forms such as `AUTH <password>`,
    `redis-cli -a <password>` or `--pass <password>`, and, outside P, an ACL
    rule `><password>` [Inferred, from general knowledge of Redis];
  - other key forms of the vendors T names:
    - OpenAI `sk-svcacct-`, `sk-admin-` and legacy `sk-` keys;
    - GitLab `gldt-` and `glrt-` tokens;
    - an Azure `AccountKey = …` written with spaces;
    - Google `GOCSPX-` client secrets.

    These pass version 4 too.

## What changed since you withheld SECURITY and MANIFESTO in version 2

In version 2 you withheld both because they are policy or doctrine text, not
project documentation. That packet's own alternative was "a separate closed
rule for `governance-text` with its own review", and version 4 named the same
route (in its semantic delta). Three things are new:

1. B uses exactly that class, so the version-2 reason is kept, not reversed.
2. The Redis provider statement you signed lists `governance-text`.
3. Your measurement priced it: `MANIFESTO` and `SECURITY.md` hold 42 of the
   trial's withheld spans.

## Order, as fact

- **The subject** is the policy as version 4 left it, which is the policy on
  disk now.
- **The act** breaks the public-target gate and the Butlers gate until the
  install lands. The install re-points them at the new bytes and teaches the
  screens the new classes, placements, exemption and detectors. It is a
  separate change.
- **Independent of this act:** the code-only session-visibility change
  (direction item 1).
- **Option E** is separate: withheld-only inventory rows would render as
  Unknown, a specification change. Your measurement is its input. It shows
  that every unresolved row cites a withheld quotation.

## What it does not do

- It admits no repository and grants no consent or egress.
- It changes neither the Butlers scope nor the policy's own detectors.
- It edits no specification.
- It does not make withheld-only inventory rows non-blocking. That is option
  E.
