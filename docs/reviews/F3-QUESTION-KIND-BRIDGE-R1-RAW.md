PASS — source-only review of frozen R1 candidate against commit `0f629938f7fafa14746d28b2144664415dc78acb`.

[Observed] All four candidate hashes and predecessor hashes match the manifest.

[Inferred] The change satisfies the stated acceptance criteria:

- Genuine Unknown and compared advice match the closed validator; malformed fields and extra fields are rejected.
- Advice is admitted only on author check reports. Stored check records still reject it.
- Removing report-only advice before comparison preserves the existing full-record integrity checks.
- Secret screening, authority, reads and caps are unchanged.
- Tests use the genuine producer, add malformed-advice controls, and retain integrity regression controls. Net growth is one unit case; one existing integration case is extended.

[Unknown] Runtime results: imports, builds, tests and product execution were prohibited and were not performed.

Evidence-retention metadata (added after the original review response; no earlier retained file was claimed):

Frozen manifest: /home/orca/.tmp/f3-native-admission-fixes/question-kind-bridge-repair-0f629-R1/manifest.json
Manifest SHA-256: 635be00f71e1b6bc45636612fddbd6e9e86f51700fe9dab34ac453229fc5c9bc
Base subject commit: 0f629938f7fafa14746d28b2144664415dc78acb
Frozen candidate root: /home/orca/.tmp/f3-native-admission-fixes/question-kind-bridge-repair-0f629-R1/candidate

Exact candidate subjects from the frozen manifest:

- Path: packages/polaris-dossier/src/url-check-product-shape.test.ts
  Bytes: 5374
  Candidate SHA-256: b6612a8b98101aa1acc6a06f5450c74612fd5e9b13e59f89d57e816eeeee0274
  Predecessor SHA-256: 6861ad99ede9d3fca7b03336578cd959af83e32f64acd62e2aed1d231c71cf9f

- Path: packages/polaris-dossier/src/url-check-product-shape.ts
  Bytes: 7109
  Candidate SHA-256: e1beab3c7ab3dfb798b9562fcd9dafb6eadef2db8feee8b60e16cea59d036295
  Predecessor SHA-256: b51e072408781db187bfd778cfd3297e0bb9a0ec3b68652e7c380764f41ad8c1

- Path: packages/polaris-dossier/src/url-run-artifacts.test.ts
  Bytes: 150805
  Candidate SHA-256: b60c85df1c0d2fdfe4c3519bd63466d7b3f4d8b2d08673a5f32acc5470834959
  Predecessor SHA-256: 456e51f36a18dee0b590fd8c40a5eacfcc165ca05d78796052e180edd3a7c8f6

- Path: packages/polaris-dossier/src/url-run-artifacts.ts
  Bytes: 127206
  Candidate SHA-256: ea1665b8f8afcb53d25e4e32c913afc987fa01b840980e796f400c99b29fc509
  Predecessor SHA-256: ddfb0a233e864b1da14fa8f572c693f54d6e808fd7474c4aeee7e0a362233c87

Retention limits: This operation only retains the previously delivered review and its frozen-subject identifiers. It does not re-review source changes, modify the primary candidate, or execute imports, builds, tests, or product code. Verdict: PASS.
