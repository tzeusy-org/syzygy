> **Candidate — binds nothing. Draft only, 2026-11-04.** No owner sign-off,
> policy installation, execution permission or implementation change is recorded.

# Impact ledger — candidate CC-SEC-3 amendment

## Baseline, method and limits

[Observed] SUBJECT.json names the exact baseline and governing input hashes.
IMPACT-SWEEP.json enumerates the lexical hits and their subject digests.
The population is the 8,663 regular files from `git ls-files -z` at that
baseline, including hidden governed files, raw reviews and history. Python
byte regexes, case-insensitive, were `CC-SEC-`, `security-and-secrets`,
`no observed-project\s+code executes, period`, and
`Observed code never executes outside an accepted profile`. The first
intentionally admits the whole CC-SEC family (including continuations),
so unrelated CC-SEC-5/6 citations are not silently dropped. The run found
90 matched files. These figures describe the baseline, before this package
adds its own citations. They are not current-tree totals.

[Inferred] Lexical membership is not reliance. The classifications below
follow source reading; no lexical scan proves it found every semantic
consumer. Implicit implementation consumers were inspected separately:
execution-rule.ts, credential-probe.ts, polaris.ts, launched.ts, cli.ts,
and the signed dossier requirement. No target repository was read.

## Disposition by dependency

| Subject | Effect and required treatment |
|---|---|
| Installed security-and-secrets.md introduction and CC-SEC-3 | Sole normative target. The exact patch changes the introduction and CC-SEC-3 heading/body. Keep CC-SEC-3 stable. Apply only after owner act; abort on input drift. The proposed whole-policy digest is in SUBJECT.json. |
| SEC-3; D9 log, packet and review notes; GP-Q7 direction | Governing basis. Unchanged. D9's bound/reviewed predecessor bytes and raw reviews remain intact. Q3(a)/(c) preserves the explicit RFC5-12 effect and queued successor rather than silently rewriting the RFC. |
| RFC5-12 and RFC5-24, installed and candidate mirrors | No patch here. D9's ruling owns the changed effect of RFC5-12 and credential condition. Queued RFC amendment is non-blocking under D9. A later RFC successor uses its own owner act, affecting both mirrors and manifests. |
| REQ-polaris-generation-033 and dossier sign-offs | Named case; unchanged signed bytes. This policy candidate cites its disclosures and falsifiers without replacing its definition of a run or granting a run choice. PR #734 proposes a separate dossier v1.3; this candidate changes none of its files. Rebase/revalidate governing hashes if it lands before an offering. |
| execution-rule.ts and brief issuance | The flag stays false. Policy sign-off clears one gate only. Later owner-visible flag/disabled-reason change needs REQ-033 verification and fresh class-4 review; N6 changes rendered brief bytes and is not authorized by this draft. |
| credential-probe.ts and render.ts | N1/N2 in the adapter-credential review route to .8.15; reads skipped on configuration refusal and false Observed readability must resolve before the flip. Output listing is still absent. Q2 states the literal-reading path and the alternative's signed-spec gate. |
| polaris.ts login copies | Q1 owner classification is unresolved. Its two arms, N2 timing, listing/probe consequences and cleanup/relocation costs are explicit. No credential file or OS state was inspected. |
| CONFIGURED_ADAPTER_DECLARATIONS and CONFIGURED_ADAPTER_CREDENTIALS | Second hand-kept list is a completeness residual, N5. First credential-holding adapter (including Q1 A if selected) triggers derivation from modules/registry and source-path coverage verification. No completeness assertion is made from empty lists. |
| launched.ts and cli.ts | .8.8 landed. Preserve fail-closed marker handling and verify it again at the flag-change head; no permitting brief for a Syzygy-launched session. |
| Craft README and agent-provenance-and-execution-evidence.md | The former routes to this policy's build-time obligations; it does not repeat CC-SEC-3's old prohibition. The latter cites CC-SEC-6. This amendment invalidates neither cited obligation [Inferred]. Keep both unchanged. |
| Context fixtures 4 and 9; CONTEXT-BUDGET-REPORT.md; 05-CONTRACT-INDEX.yaml; DIRECTIVE-REGISTER.md; TASK-ROUTER.md; active/dependency manifests | Paths/IDs remain, but policy words and line offsets change. At adoption, regenerate with their existing builders and update only changed outputs. Recheck fixture counts/budgets and manifest digests, even where the lexical scan did not name a count consumer. No pre-adoption regeneration. |
| Craft INSTALL-RECORD.md; canonical ACCEPTANCE-ACT-RECORD.md; active acceptance record; check_governance.py | At offering prepare the craft-act route, exact proposed policy subject and applicable registrations; at owner performance append the record and install provenance. Never overwrite a prior act/digest or claim Scope A covers this policy. This draft creates no sign-off argument or recorder. |
| PENDING-OWNER-DECISIONS.md | Guarded append of P-117 points to this draft, reports no approval and states review is pending. No older row/count edited. Its whole-file hash joins SHA256SUMS for exact-head review. |
| Dated evidence, historical packets, raw reviews, installed PWB dependency citations | Preserve as evidence/authority at their original hashes. The sweep's PWB hits cite CC-SEC-5/6, not the changed CC-SEC-3 obligation [Observed from those rows]; no renaming or frozen-byte repair. Older absolute policy quotations remain quotations of predecessors. |

## Propagation and review gates

[Inferred] The proposed policy fits SEC-3 as adopted; independent review must
challenge that inference and the scope classification (proposed classes 1
and 4). The amendment is Normative because it changes who may comply, even
though doctrine already authorized the exception. Its review and owner act
must precede installation. Nothing is adopted by recording this candidate.

At adoption, apply the guarded patch and propagate any actual invalidations
in the same logical change (CC-REV-2), including reviewed successors where
bound inputs require them. A newly discovered doctrine contradiction stops
the install and returns to the owner. If a required successor/recorder is not
ready, stop before an offering; do not edit bound bytes to make a check pass.

## Verification contract

This draft changes no implementation, test, validator or check predicate.
Tests: +0 ~0 -0; no new/changed check needs a new rule-6 mutant. Existing
selftests in the canonical battery exercise their recorded mutation fixtures.
Verify patch application and its resulting full-file digest in scratch,
check candidate links and scope, then run the PROJECT-STATUS canonical
battery (including check_governance and its selftests) in a clean full-history
clone of the frozen author commit. Logs and command results live in the
external worker report; they are evidence about that commit, never adoption.

The 2026-10-22 declaration-sweep evidence is historical. Its main.ts row
predates the move to poc-main.ts. This draft does not regenerate that sweep
or edit its dated record. Before a later completeness claim, re-run it at
that head and classify poc-main.ts in place of the predecessor. This packet
makes no claim that the old sweep describes today's paths.
