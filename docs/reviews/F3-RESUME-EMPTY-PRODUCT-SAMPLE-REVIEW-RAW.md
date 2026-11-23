PASS

[Observed] Base `80edc4add15aeabf83b319c68ca4cce88af28f00`, patch SHA-256 `4f7f3504464d53d9d064aef96902e8f3b8f7e20a750ee2282e9f86272d73810b`, and production blob `c79fb9864dd434211a166f532920c8a6ca840aa4` match. The patch is byte-identical to `git diff --binary --full-index`, and `git diff --check` passed.

[Observed] The revised mock records the outcome and returns the genuine resumed controller even when the sample refuses or rejects. The supervisor owns cleanup through its `finally` block before the test asserts the sample result. The assertion requires one production verifier call and compares both arguments by object identity. It runs whenever genuine resumed startup returns a controller, including a later CLI refusal. The existing exit and completion assertions still apply. See `url-run-composed.test.ts:1463–1497` and `polaris.ts:664–674,1195–1204`.

[Inferred] The identical production blob retains the source judgment against package 256 as adopted in A-14, RFC3-16(d), REQ-polaris-generation-048, A-91, and A-117. The empty branch makes its final authority check after settlement with no intervening await. Ordinary launch registration excludes pending launches. Ordered Design’s private preparation precedes launch, and delivery, activation, and peer capture retain their live sample and currentness checks. With published work, the asynchronous sample join, second settlement, and final guard keep their original order.

[Unknown] This patch adds no direct empty-branch controls for withdrawal, operator stop, deadline expiry, or a concurrent launch. I ran no tests or native replay. Timing savings and live Resume outcomes remain unverified.
