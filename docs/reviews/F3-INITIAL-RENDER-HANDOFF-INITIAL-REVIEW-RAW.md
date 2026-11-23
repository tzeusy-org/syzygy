PASS `516d56f69c5943dd414d4f9d13fd98a61d6cbada`

[Observed] The initial render captures metadata through the same screened validator and retains the original producer and read deadlines. The supervisor checks the render report and revalidates the same lease before closing it. Design admission still requires a fresh reproduction, exact stored-site bytes, and a live product that matches the expected metadata. Ordinary and continued render paths are unchanged.

[Observed] The composed fixture checks one initial metadata capture alongside the existing two successful reproductions before the audit interruption. `git diff --check` passed. This was a source-only review.

Minor cleanup: `polaris.ts:1222` now has an unused `binding`. Reuse it for the explicit metadata identity comparison or remove it. The production entry points already bind those values independently.
