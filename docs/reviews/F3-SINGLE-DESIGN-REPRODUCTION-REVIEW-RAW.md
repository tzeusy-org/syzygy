PASS

[Observed] Both delivery paths now preserve the distinction between unavailable reproduction and changed inputs. Ordered startup completes cleanup before returning the reproduction outcome, so it no longer reports a launch failure when reproduction fails.

[Observed] Fresh reproduction still precedes ordered Design launch. Stored site, draft, pin, input, lease, and durable audit checks remain in place. Both paths retire their reads. The patch digest matched and `git diff --check` passed. Native replay was outside this source review.
