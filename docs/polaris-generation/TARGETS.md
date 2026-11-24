# Polaris proving ground — open-source targets

The generalized generator is proven on public open-source repositories, each
paired with the human-made site its maintainers already publish, so a
generated page can be scored against a real answer to "what is this and why
does it matter".

This page is working guidance. It grants no read, egress or write: every
target below is unread until its admission records are in force (see
[Admission](#admission)). Work against it is tracked in
[TRACKER.md](TRACKER.md); what it teaches us goes in
[LEARNING-LOG.md](LEARNING-LOG.md).

## Why open source, not personal projects

- **A reference answer exists.** Each target's official site is an
  independent, human-written statement of purpose, audience and thesis. The
  reader test can compare against it instead of against our own judgment.
- **Lower privacy stakes, same process.** Public code is not confidential, but
  doctrine still requires per-repository consent before any body read and
  per-project/provider consent before any provider egress (SEC-2,
  REQ-polaris-generation-025). Public visibility makes that consent easy to
  give; it does not remove it.
- **Arbitrary means arbitrary.** None of these repos follows Syzygy's
  conventions (no `openspec/`, no doctrine tree), so they exercise
  REQ-polaris-generation-030 discovery honestly. Butlers and Syzygy share our
  conventions and cannot.

## The set

Revisions are tag targets read with `git ls-remote` on 2026-10-03 (refs only;
no repository body was read) [Observed]. Re-verify the peeled commit at
admission.

| # | Target | Pinned revision | Reference site | What it tests |
|---|---|---|---|---|
| T1 | [psf/requests](https://github.com/psf/requests) | `v2.34.2` → `6e83187b8feb273ed4c6cdab5efd8d54901dfab3` | [requests.readthedocs.io](https://requests.readthedocs.io/) | Small, single-purpose Python library with a famous thesis ("HTTP for Humans"). The first run: if the generator cannot make a crisp page here it cannot anywhere. |
| T2 | [redis/redis](https://github.com/redis/redis) | `8.10.2` → `498ecd0d6d007db11ddb3aea9428552598a78622` | [redis.io/docs](https://redis.io/docs/latest/get-started/) | C codebase, data store, multi-audience docs. Plus the real changed-source pair below. |
| T3 | [getsentry/sentry](https://github.com/getsentry/sentry) | `26.9.0` → `91e940e6fe4df840c91d865b9d29df9a1b044faf` | [develop.sentry.dev](https://develop.sentry.dev/) | Large Python/TypeScript monorepo behind a SaaS product: discovery budgets, page-size discipline, finding a thesis among thousands of files. |

**Optional stretch targets**, once T1–T3 have produced pages:

- [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep) `15.2.0` →
  `6ec72defacfb042f203ca0b4bf2513a0a5505a7e` (annotated tag; peeled
  `e89fff89ac9af12e8d4ce9d5fd07beb408ca730f`): a short Rust CLI with an
  excellent README — does the generator stay short when the source is short?
- SQLite (GitHub mirror): documentation that already reads like a manifesto —
  a hard quality bar.
- One thin-documentation repository, chosen later: does the generator invent a
  thesis where none is stated, or say Unknown?

**The dossier corpus (2026-11-24).** The stratified corpus that agent-started
dossier runs use (pursuit 2026-11-21b R16) is
[`dossier-corpus-v1.json`](dossier-corpus-v1.json): fourteen repositories
pinned to commits, the mechanism-version definition, the pass budget and the
generality pass rule, sealed before any pass. It reuses T1, T2 and ripgrep at
the pins above and leaves T3 out for a permissively licensed large monorepo.
`node scripts/dossier_corpus.mjs --check` validates it; `--digest` prints the
current mechanism version.

## Changed-source regeneration: Redis's licence history

The portability proof needs a real change of source meaning — "retract a
claim, qualify a promise" — regenerated with the unchanged process. Redis's
licence history is exactly that [Observed, from Redis's
[licence page](https://redis.io/legal/licenses/) and
[announcement](https://redis.io/blog/redis-adopts-dual-source-available-licensing/)]:

| Revision | Tag target | Licence posture |
|---|---|---|
| `7.2.4` | `d2c8a4b91e8c0e6aefd1f5bc0bf582cddbe046b7` | BSD-3-Clause |
| `7.4.0` | `c9d29f6a918c335bc1778d9f68e521c1bbb36a0f` | RSALv2 / SSPLv1 dual licence — no longer OSI open source |
| `8.0.0` | `e91a340e241cf0abe3c6a0c254214fbe4aa1d95f` | Tri-licence: RSALv2, SSPLv1 or AGPLv3 |

A correct regeneration must change every place the page states or implies the
licence — thesis, audience, any "open source" framing, glossary, deep dives —
and must not reuse the 7.2.4 prose for 7.4.0. Admission covers all three
revisions.

## How a page is scored

Per target, frozen before generating (per the kit's
[Prove portability](README.md#prove-portability)):

1. **Reader test.** A fresh reader answers seven frozen questions — purpose,
   beneficiary, central thesis, important capabilities, one architectural
   choice, a limit, an uncertainty — from the generated page alone, recording
   attempted paths. A second fresh reader answers the same questions from the
   reference site. Accuracy and comprehension are scored separately from
   visual polish.
2. **Fidelity.** Every factual claim resolves to an admitted source span;
   unsupported claims are findings, not style notes.
3. **Reader cost.** Bytes and words to the first reading level, and words
   until all seven answers are reachable. Budgets are an open question (see
   the tracker); measure from the first run.
4. **Unchanged process.** The diff between runs is the project input profile
   only — no project-name branch, compiled offset or hand-repaired output.

## Admission

Each target needs, before any body read or provider call (REQ-025):

- an **observation consent** for the repository (read-only, at the pinned
  revisions);
- an **egress consent** for the project and one named provider, listing the
  permitted content classes;
- the **classification and secret policies** the observing project screens
  with, each with its own effective owner act.

Each is a separate, separately revocable record. A reusable public-repository
admission template that makes these one owner sitting per target is drafted as
a candidate package; the tracker links it.

## Evidence that the Redis revisions are commit objects

[Observed] 2026-10-03, metadata only (no repository body read):
`git ls-remote https://github.com/redis/redis refs/tags/<tag> refs/tags/<tag>^{}`
for `8.10.2`, `7.2.4`, `7.4.0` and `8.0.0`. Each tag returned exactly one
line, the ref itself, and no peeled `^{}` line. A peeled line appears only for
an annotated tag, so these are [Inferred] lightweight tags and each id above is
the commit object id. Raw output:

```text
498ecd0d6d007db11ddb3aea9428552598a78622	refs/tags/8.10.2
d2c8a4b91e8c0e6aefd1f5bc0bf582cddbe046b7	refs/tags/7.2.4
c9d29f6a918c335bc1778d9f68e521c1bbb36a0f	refs/tags/7.4.0
e91a340e241cf0abe3c6a0c254214fbe4aa1d95f	refs/tags/8.0.0
```
