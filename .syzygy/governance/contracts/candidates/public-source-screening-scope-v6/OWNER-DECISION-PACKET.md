# Owner decision packet — public-source screening scope, version 6

> **Candidate — binds nothing.** It carries no digest. Nothing here is a
> decision, and reading it performs no act. It is offered to you only after a
> confirming independent review; until then it is not offered.

## What this is, in plain words

On 2026-11-05 you answered "A. Rebase P (placement + detector) onto v5 as v6,
review, offer for your act" (questionnaire item 1). This is that version 6.

In the 2026-10-14 Redis trial, 145 of 244 quotations were withheld, across 12
files. Version 5 (signed 2026-11-03) gave a path to every one of them except
`README.md` (41 quotations; whether they now come back is still Unknown) and
five files no variant placed. Of those five, four held one quotation each.
The fifth is `redis.conf`, with 39, the most of any file after `README.md`. It
stayed withheld because it is configuration with password lines in it.

In run 3, the first draft cited `redis.conf` 34 times out of 180. Those
quotations were withheld, and the later drafts moved away from it to other
sources.

Version 6 does two things together:

- **It lets the reviewer read Redis's `redis.conf`**, as project
  documentation, the way version 5 placed `TLS.md`. Only for the Redis
  repository, and only at the trial revision (8.10.2). Any other revision, any
  other repository, and `sentinel.conf` stay withheld.
- **It withholds the password lines in it.** A new detector finds lines that
  start with `requirepass`, `masterauth`, `tls-key-file-pass` or
  `tls-client-key-file-pass` followed by a value, or an ACL rule
  `user <name> … >password` (or a hashed password), whether commented out
  (once or more), quoted or separated by unusual blanks. Those lines and the
  line on each side are blanked. Quotations that touch a blanked line are
  withheld whole; the others reach the reviewer, unless some other screen
  step withholds the file (whether one does is Unknown).

Nothing else in the policy changes.

## The one question

**Sign screening scope version 6? Sign, or decline.**

The words, if you sign: **"Sign screening scope version 6, variant p"**.
There is only one variant, `p`; the words name the package's one manifest
row. A recorder takes that row as the act's argument (phrase
`APPROVE POLARIS BUTLERS SECRET-CLASSIFICATION POLICY`, as for versions 2–5).
It supersedes the version-5 act.

Recommended: sign. It is what you asked for, and the costs below are the ones
the answer you picked described, plus two the review found.

## What it costs

Each cost is a synthetic example in the builder, scored before and after.

- **Passwords written another way in `redis.conf` reach the reviewer.** Six
  named cases the detector does not catch:
  1. a password named in the middle of a line (`… CONFIG SET requirepass x`);
  2. a `rename-command` target used as a secret;
  3. a password in a prose comment;
  4. a module's own password option;
  5. any other password directive it does not name (for example Sentinel's
     `auth-pass`);
  6. a value on a line after its directive.
  The questionnaire's list had five. It named "a value split across an
  `include`", which is not a leak here: the included file is not placed, so it
  stays withheld. Cases 5 and 6 are new.
  The shipped file holds example values, not real ones [Inferred], and the
  pin to one revision means a later revision gets no class.
- **More is withheld elsewhere.** The detector runs on every Redis file:
  - A source or test file with a line starting `requirepass <value>` is now
    withheld whole, where version 5 let it through. How many: Unknown.
  - Lines written that way in `TLS.md` or a README are now withheld, where
    version 5 let them through. This closes a gap version 5 named.
  - Ordinary text can trip the ACL part: a README line such as
    `User input >5MB is rejected.` is blanked, and a test file with a line
    `user input >5 …` is withheld whole.
- **Unknown until measured:** how many of `redis.conf`'s lines the detector
  blanks, so how many of run 3's 34 quotations would come back, and how many
  code files it withholds. It needs the files' text, which no agent reads. A
  count-only script is ready for you (it prints numbers and file names, never
  text):

  ```text
  python3 scripts/redis_screening_v6_measure.py --clone <redis clone> --run <run directory>
  ```

  Running it is optional and independent of the act.

## Order, as fact

- **Subject:** the policy as version 5 left it, which is the policy on disk
  now.
- **After the act** the dossier's read gates refuse the new policy, and
  several governance checks fail, until a separate install change re-pins
  them (a sixth act form, the detector sentence's digest, the version
  literals, the policy's act chain). **No Redis run can start between the act
  and that install.**
- The single next Redis run therefore waits on: this act, then its install.

## What it does not do

- It admits no repository and grants no consent or egress.
- It changes neither the Butlers scope nor the policy's own detectors.
- It places none of the three other files (variant X), as you directed.
- It edits no specification.
