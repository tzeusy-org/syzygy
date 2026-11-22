PASS `22e59be1c6313d2546dbc0c4f47a17bd1c8c0ab2` against `900d3e7103a42ea648ab2bbd2b7a79fd895ab02a`.

[Observed] Live and cold reconstruction close before the final read begins. The one-use factory rechecks the exact durable subject, the direct path retains its original cutoff, and final release checks both deadlines. No remaining material source findings. No tests or edits during review.

Manifest SHA-256 `bab30a3ad73f97192acfe1a7e580c4a398816f0d1c656362578915171e11965e`.

```sh
git diff --no-ext-diff 900d3e7103a42ea648ab2bbd2b7a79fd895ab02a 22e59be1c6313d2546dbc0c4f47a17bd1c8c0ab2 -- . ':(exclude)packages/polaris-dossier/src/url-run-ordered-attempt.ts' | sha256sum
```
