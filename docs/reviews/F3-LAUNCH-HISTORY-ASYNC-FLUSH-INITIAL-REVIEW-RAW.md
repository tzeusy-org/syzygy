REVISE

[Observed] The fixture identifies directory flushes by pathname. After the helper directory moves to `.held`, a flush on its original descriptor bypasses the test probe. The final readback can still refuse, allowing the test to pass even if the pre-flush identity check regresses.

Match the held directory by device and inode so the test detects a flush after the rename. The digest matched and `git diff --check` passed. No runtime findings, edits, or tests.
