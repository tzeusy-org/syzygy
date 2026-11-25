# Design

## Custody and identity

[Inferred] Treat the evaluator as a different comparison role. It supplies the frozen question-file bytes, a graded key in private custody, the synthetic run identity and one scripted reader session. The persisted answer record belongs to that evaluator's comparison run state. Keep it in the evaluator's private output directory outside the checkout and every author, editor, inventory, scout and review mount. Never copy the graded key or private answers into the operator run's author-facing state. The companion binds the run ID, repository, pinned commit, question-file digest, graded key digest and the attributed scripted session and script digest. Earlier runs retain Unknown when no answer companion exists.

[Inferred] The evaluator explicitly provisions the output directory and supplies its known author-visible roots. Refuse overlapping or unresolved directories, links and special files at read or write boundaries. Evaluate only a complete set of unique answer rows in the frozen order. A key digest mismatch, a question/fact count mismatch, an incomplete question-file entry, a changed run binding, an unreadable companion or a screening failure refuses the dependent step with a bounded reason. No failure echoes private text.

## Answer projection and grading

[Inferred] Build the primary answer companion from validated answered or cannot-answer rows emitted through the existing scripted port. Keep literal answer or refusal text for screened, evaluator-only audit. Store the record in finite strict UTF-8 JSON; read it with one bounded regular-file open and recover the exact validated bytes used for grading. The grade result binds the answer companion's SHA-256 and graded key digest so different answer bytes cannot borrow a recorded result.

[Inferred] The grader receives only a closed JSON packet of ordered, one-based question positions, answered/cannot-answer state, answer fact digests and key fact digests. Each fact is one nonempty LF-delimited line. Ignore surrounding ASCII whitespace and blank answer lines, deduplicate exact answer facts, and hash the remaining UTF-8 bytes. The key has a nonempty unique exact fact population for each question. Use case-sensitive equality on digests. A fixture answer that gives every required fact and no unknown fact grades right, a nonempty proper subset grades partial, and an empty answer or unknown fact grades wrong. A cannot-answer row grades refused. Report the matched and required counts with an Inferred label. The scripted shorthand measures agreement with a literal fixture key. It does not estimate a live reader's comprehension or change readiness.

[Inferred] The closed projection prevents arm identity or rendered chrome from reaching the grader as text even when present in the scripted answer. Packet construction preserves no free-form authorship identifiers. SHA-256 supports equality and byte binding here. It provides no claim that predictable phrases are unrecoverable from their hashes. Keep the packet within the evaluator process.

## Independent observations

[Inferred] Test literal right, partial, wrong and refused grades including the denominator and exact reopened subject. Plant distinct arm, chrome, path, session and key-prompt canaries and check captured packet bytes for their absence. Change the key and answer bytes independently and check the typed outcomes. Test refusal of an overlapping outlet, link and unclassifiable text, then read authored fixture results again through the supported storage path. Run the ordinary provider golden and preserve every rendered byte.
