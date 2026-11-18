# D10 F-1 — island-boundary timeout diagnosis

[Observed] Subject commit e940f2c496160da6040a1ab7300016be11ec95cf; comparison base26b2ef360431ab71c02dcde47643665dc153b8c7. Parent's retained clean-clone full-gate log records the transitive-ingress unit test timing out at5620ms against5000ms. That failed gate stays failed. This report is diagnosis only, never a readiness, adopted-state or implementation PASS.

[Observed] Read the diagnosis skill and ranked four falsifiable hypotheses in hypotheses.json before instrumentation. Captured each committed subject's apps/packages/package.json bytes with git archive into separate scratch source trees. The original proof clone and author/reviewer worktrees were not edited. Scratch code transpiles the original guard's production enumeration, imports parser, per-origin reach/path rendering and resolver; it replaces only the physical ROOT for the captured snapshot and adds counters/optional edge caching. The same installed TypeScript parser is used in both modes. No product/observed-project code is executed: it is parsed as text by the guard.

[Observed] The base and head island-boundary.test.ts and workspace-reach.testkit.ts bytes are identical; diagnosis-result.json records exact subjects, byte counts and SHA256 values. Other source differences are the actual committed F1 differences, never hypothetical mutations.

## Same-input measurements

[Observed] Sequential fresh processes in balanced order: head normal, head cached, base normal, base cached, head cached, head normal. Each sweep enumerates every production origin and caches parsed imports as the actual test already does. The complete per-origin reachable, into-island, unresolved and unsupported result array is hashed, not merely its final success bit. measurements.json contains all raw counters and CPU/wall timings.

| Input/mode | Production origins | Parsed modules | Resolver calls / underlying resolves | Unique edges | File probes | Sweep wall ms |
|---|---:|---:|---:|---:|---:|---|
| Head normal |303|304|43820 /43820|1332|39883|1118,1253|
| Head cached |303|304|43820 /1332|1332|1054|724,725|
| Base normal |302|303|42171 /42171|1330|38369|1171|
| Base cached |302|303|42171 /1330|1330|1053|755|

[Observed] Head normal parsing took581–678ms and underlying resolution448–467ms; cached parsing632–634ms and resolution28–30ms. Source-read time remained13–15ms. Parsing is the largest isolated component, but repeated resolution is substantial removable work. There is no evidence that fresh file reads or the one extra production root alone explain the observed full-suite timeout. Cache misses/hits are counted independently of resolver duration; null and undefined results are cached using Map.has.

[Observed] Each head normal/cached result has SHA25622682a63a2ef1907b868e56f31e1ec91df205b64643a8e11fb383a0efefdb2f7. Both base modes have SHA256144050f05e71a420079d2a8cd766bad0a6fe7fe58db8995f1766371d624de9fa. Both modes report the same empty violation/unresolved/unsupported arrays over the complete origin population. This is bounded to these committed graphs, not a proof over arbitrary future graphs.

## Controlled rate-raising

[Observed] stress.py ran four fresh head sweeps concurrently on one allowed CPU, first normal then cached, with identical parser/walk code and the same four-worker budget. No host settings were changed. Raw stress-results.json records CPU identity, each process's metrics and complete-origin result hash.

- Normal:7519,7366,7372,7473ms;4/4 exceed5000ms.
- Cached:5457,5390,5421,5450ms;4/4 still exceed5000ms.
- Normal parse time4715–4853ms; cached parse time4817–4930ms. Cached resolution113–238ms versus normal2002–2183ms.
- All eight head result hashes equal the isolated head result hash above. Each has303production origins/304parses and no reported guard violations/errors.

[Inferred] The five-second sweep is demonstrably sensitive to CPU competition. Repeated resolution contributes avoidable work on every origin traversal; caching removes roughly two seconds at this imposed stress, but cannot guarantee a five-second deadline under arbitrary contention. The original failed run did not capture CPU contention, so its particular load is Unknown; load as the historical trigger remains Inferred. A cache-only change is not yet proved to clear the actual full-suite failure. Do not report a stress red-to-green result: both modes exceed the threshold in this intentionally constrained experiment.

## Narrow repair and risks

[Inferred] The parent's proposed optional resolveModule callback on workspace-reach.testkit.reach, defaulting to today's resolve, plus a nested from/specifier cache owned by the one whole-origin census is a narrow compatible repair. The existing per-origin traversal, unsupported/error collection and origin-path construction must remain; allowed origins must never become traversal cutoffs, and disconnected production sources stay in the denominator. Cache every result kind, including undefined and null, with Map.has. Construct a fresh cache for each census, never retain it across tests or source/workspace mutations.

[Inferred] Risks to verify: resolver injection must reach every edge; an undefined cache entry must remain an unresolved edge at every applicable origin; null remains external rather than unresolved; two origins reaching a shared module still receive their own correct path/error labels; cycles do not prune a different origin; new census resolution reflects changed source/workspace inputs. The callback's default must preserve every existing testkit client. A small behavioral control comparing complete results and underlying resolution call counts at that seam can pin the optimization without a fragile millisecond assertion. Independently re-run the actual timeout-bearing Vitest test/full suite with its unchanged5000ms budget after the repair. No production/test implementation was authored here.

[Inferred] Prevention: a time-bounded whole-repository sweep needs a cost bound on repeated deterministic work as its population grows. A per-census one-resolution-per-edge behavioral control is more stable than retrying the suite, increasing the timeout or asserting an absolute duration. The full-suite run remains necessary because isolated timing alone missed its contention environment.

[Observed] All retained diagnostic writes are under this scratch directory; tagged instrumentation is confined to its generated harness files. diagnosis-result.json names the inputs and artifact digests. Nothing here edits a guard, exports a product resolver, changes a secret predicate, reads another repository, uses a provider, or claims merge readiness.
