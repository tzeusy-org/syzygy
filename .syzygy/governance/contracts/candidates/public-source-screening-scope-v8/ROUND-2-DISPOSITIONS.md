# Round-2 dispositions — public-source screening scope, version 8

> **Candidate — binds nothing.** Dispositions of
> `docs/reviews/R-SCREENING-SCOPE-V8-2-RAW.md` (verdict `REVISE`, line 4,
> over `3a07714d`). The raw is retained verbatim and is not edited. These
> repairs retire the round-2 review (rule 10). Stopping rule, set by the
> coordinator before round 3: **round 3 is the last review round.** Whatever
> it returns goes to the owner with the package.

| # | Finding (raw) | Disposition | Where |
|---|---|---|---|
| 1 | The digest residual omitted that the Git object id and size are code-structure, are rendered on dossier pages, and can leave under an egress consent listing code-structure (raw lines 73–117) | **Repaired by a decision: withhold, not just disclose.** A seventh edit to the code-structure class rule says that, for a private repository, the object id and size of a blob any detector matched, on its path or body, are not code-structure. They stay only in its exclusion record in the run directory (RFC5-17), and are never rendered or sent. Why: an object id is a whole-body digest. Rendering or sending it gives the offline-guess oracle to every page reader and every provider. Withholding costs only a less specific exclusion row, whereas disclosure alone leaves the route open. `consequence` now says this truthfully, including what remains: the run directory and the operator's clone. Public repositories keep today's reading. The ledger names the install sites (`check-derive.ts`, `render.ts`, the egress tables) | builder `EDITS[6]`, `privateSourceRules`, `unchanged`, `consequence`; SEMANTIC-DELTA item 7 and the digests row; packet "fingerprint" bullets; IMPACT-LEDGER "Object ids and sizes" |
| 2 | The act-form carrier pointed at an open code list (raw lines 119–146) | **Repaired.** The policy names the two act files, the redis and the requests public-repository observation acts under `.syzygy/governance/decisions/`, "and by no other act". A further act states public by form only when a later policy version names it, "never because a code list of act forms grows". Pinned by the phrase "and by no other act". [Observed] Only the redis act is recorded today | builder `SOURCE_VISIBILITY["rule"]`, `RULE_PHRASES`; SEMANTIC-DELTA carriers; IMPACT-LEDGER "Visibility" |
| 3 | An unreadable record whose pair cannot be read was not placed (raw lines 148–170) | **Repaired: refuse.** While an effective-looking record with no readable pair exists, every read under the scope is refused, with that record named, until it is read or revoked. Why refuse rather than turn every pair private: the fault concerns which record is which, not any repository's visibility. A refusal names it and stops (VIS-2). A silent private reading would change the rules for every repository, public ones included, without saying why, and could hide a broken record store indefinitely. Pinned by the phrase "every read under this scope is refused" | builder rule; SEMANTIC-DELTA `rule` bullet and "What this keeps"; packet "Private is the default"; IMPACT-LEDGER fixtures |
| 4 | The four new phrase pins had no mutation; round 1's disposition said "three"; the path pin missed an extra edit at an already-pinned path (raw lines 172–190) | **Repaired.** The required phrases are now a named tuple, `RULE_PHRASES` (seven). The selftest drops each one and expects "lost '<phrase>'". `EDITS_PER_PATH` pins the edit count per path, and a selftest case swaps an edit for an extra one at `rawBodyHandling.rule`, keeping the count at seven: it fails per path. `ROUND-1-DISPOSITIONS.md` line 11 now says "four", with a dated correction at the sentence. The docstring and the delta now say the pins sit beside `EDITS` in one file, so they catch an appended entry, not an author who edits both. 43 of 43 pass (4 controls, 39 mutations) | builder `RULE_PHRASES`, `EDITS_PER_PATH`, `selftest`; SEMANTIC-DELTA "Mechanical"; ROUND-1-DISPOSITIONS line 11 |
| 5 | "What this keeps" named one exception; the packet omitted that a joined public upstream loses its public-target egress coverage (raw lines 192–208) | **Repaired.** "What this keeps" now names both fail-closed exceptions. The first: a public pair reads private once any other record states private, states nothing, or cannot be read, losing redaction, the fetch, object-id rendering and public-target egress coverage. The second: a record with no readable pair refuses every read. The packet says in plain words that a public upstream joined by a private fork loses its public-target egress coverage, and that a silent or unreadable record turns a repository private | SEMANTIC-DELTA "What this keeps"; packet "Private is the default"; builder `consequence` last sentence |

Notes:

- **N1** (an agent can drop a private record from the dedicated reference
  and flip a pair to public): no change. This is the spec's
  records-within-reach residual, already disclosed there.
- **N2:** no change. Neither visibility change needs a rule.
- **N3** (an adopted standing public consent would read private): taken.
  The ledger now says the arbitrary-public-repo change is unaffected only
  while it stays a candidate, and that adoption would need a later policy
  version naming its form.
