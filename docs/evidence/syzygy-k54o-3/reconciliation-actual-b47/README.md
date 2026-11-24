# Actual clean-clone reconciliation pass at b47

Subject: `b47cd8290c8d4a981789a6d779054ecaa5f3d14c`. Committed reconciliation source SHA-256: `c68cf76134cfdb53c1b7c736d7de909913e1f3d105c2b5a5ee02e1ed510066ed`, equal to the reviewed frozen combined candidate.

[Observed] The supplied result JSON reports the canonical command with profiling enabled, exit 0 and 719.079658 seconds. The terminal log names b47 and reports566/566 mutants killed plus113/113 controls held. Two independent parsers enumerate 679 printed witnesses and 679 distinct IDs; that denominator equals 566+113. Complete printed populations and raw logs for actual b47 and failed hosted predecessor f043 are retained as deterministic gzip (`mtime=0`), with uncompressed hashes in `source-binding.json`.

[Observed] All 679 ordered (identity, expectation-label) pairs match the predecessor. Transitions are 304 killed→killed,49 held→held,262 SURVIVED→killed and64 SURVIVED→held. Thus all 326 previously failing identities now have accepted outcomes. [Inferred] This is consistent with the separately proved one-LF canonical-ledger repair. The two runs also differ in source/commit/environment; they are not an isolated causal experiment or a repaired serial-versus-parallel baseline. Printed logs omit the structured witness path/old/new fields, so complete structured tuple equality is not claimed.

[Observed] The actual log contains 57 phase records: prefix231.940s, aggregate entry153.559s, and total718.813s. Seventeen entry task durations sum 1092.560s;19 edition task durations sum 310.283s. Worker durations overlap and must not be added as wall time. There is no aggregate edition-pool timer; the 73.170s remainder includes that pool and other unprofiled work. All 17 entry tasks report one witness; edition families report 359 witnesses in total. These costs do not establish a performance win or either hosted seven-minute clock.

One total-profile JSON fragment is concatenated onto the `hero-wrong-revert` witness line because stderr/stdout interleave. A naive whole-line parser counts 678. `retain_analysis.py` removes only validated JSON-decoded profile fragments, then compares a full-row regex parser with an independent token/delimiter parser and the terminal denominator. Both original raw logs remain byte-exact in gzip.

The result and run-subject JSON name b47; the terminal log corroborates its prefix. The verification clone has since moved to 74dd20378651d366ed53fb7de08fe60ba9d33c67. Current inspected script/ledger/workflow bytes still equal b47, but this current inspection is not a fresh b47 checkout certification. Run-cleanliness comes from the parent-run provenance; exact inputs and limitations are recorded in the binding.

[Unknown] A repaired serial/parallel real witness comparison, an uncontended performance baseline, actual captured worker count and hosted timing acceptance. No further canonical selftest, project import, build or native scenario ran while retaining this evidence. No primary checkout or index was changed.

To reproduce the parsing from retained logs, write a separate output directory:

```sh
python3 retain_analysis.py --repo /home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w --clone /home/orca/.tmp/f3-composed-fix-verify-2zcu1v00/w --actual-log actual.log.gz --predecessor-log predecessor.log.gz --result-json result.json --subject-json run-subject.json --output-dir /home/orca/.tmp/reconciliation-b47-reparse
```

Current-clone metadata can change between repetitions; the frozen run-log identity and population comparison do not depend on the current clone HEAD.
