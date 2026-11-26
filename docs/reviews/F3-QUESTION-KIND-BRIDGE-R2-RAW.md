# Independent source review — question-kind bridge repair R2

Verdict: PASS

[Observed] Review subject: frozen packet `/home/orca/.tmp/f3-native-admission-fixes/question-kind-bridge-repair-0f629-R2`, based on commit `0f629938f7fafa14746d28b2144664415dc78acb` in `/home/orca/.tmp/f3-ordinary-store-read.70BHIdrK/w`. This review independently inspected R2 and does not rely on an R1 verdict or runtime result.

[Observed] Method: read the candidate patch and four frozen candidate files, the base producer contracts in `check.ts` and `question-kinds.ts`, draft question-kind declarations, and the bridge's closed object validator, report admission, capture comparison, receipt binding and call sites. Standard Python hashing and `git show` verified each candidate's byte count and SHA-256 against the manifest and each original hash against the named base commit. No product imports, tests, builds, or product execution occurred. No primary source file was edited.

[Inferred] No blocking finding in the requested scope. Acceptance assessment:

- Both producer forms are represented: `check.ts:418-425` emits questionKindAdvice only for a parsed author check. `question-kinds.ts` returns the three-field Unknown form or the compared form with rule identity/version, major-unit metadata, ordered question kinds, units and answer counts, declaration accounting, Inferred label, basis and note. The candidate `url-check-product-shape.ts:22-31` admits these forms; its closed object helper (`:15-17`) rejects missing/extra object keys at every declared object level. Scalars, finite nonnegative safe integer counts, the six ordered top-level kinds, known missing kinds, rule versions, major-unit constants, and Inferred label are checked. This is shape admission, not an assertion of declaration truth or semantic recomputation.
- `url-run-artifacts.ts:515-520` adds the optional member solely inside `report && command === 'check'`. Stored author checks (`report=false`), inventory checks and review reports do not gain this member. The existing key validator rejects unrecognized keys, so a stored check carrying it remains rejected at `:551` and the other unchanged stored-check admission sites.
- `url-run-artifacts.ts:552` removes the report-only member before comparing the full remaining report projection to the stored check. The canonical equality at `:580`, existing figure projection and census validation, draft identity/digest validation, immutable stored-byte receipt composition and check-record binding remain in place. The report advice is not promoted into stored evidence or given an independent truth receipt.
- The four-file patch changes no detector or screening policy, source-read operation, authority condition, parent calculation or resource cap. Importing the existing constants and producer types does not add product execution to this review. The added runtime admission accepts existing report advice; it does not alter the advice producer or its declared semantics.
- The added unit case uses actual Unknown and compared producer outputs, checks the unmatched-declaration example, then rejects malformed scalar, count, enum, label, rule and nested-extra variants. The existing artifact case is extended to check that stored bytes omit questionKindAdvice, admit the genuine Unknown report, and reject malformed report variants. Its Unknown expectation follows the unchanged older-schema fixture; it does not invent a compared result. Net test growth: one unit case, one existing integration case extended. The later existing artifact assertions still exercise rejection on stored-product tampering and successful capture of the restored genuine report.

[Unknown] Runtime results for these exact frozen R2 bytes were not established by this source-only review. The supplied prior execution history is not a finding or verification result of this review. PASS is a source-review verdict for the requested repair, not a runtime or whole-repository clean claim.

## Digest binding

Manifest SHA-256: `d3cb4c30d2c6d13e91350ce93bb0ef645ec3ab8df0080111c718b1c87f1a59ca`

Candidate patch SHA-256: `5fb4ec3eb21bf632f6db2e5deb9f02cf02b3a6e68a9d56a03a0d13766c86de1f`

- `packages/polaris-dossier/src/url-check-product-shape.test.ts`: 5374 bytes; SHA-256 `b6612a8b98101aa1acc6a06f5450c74612fd5e9b13e59f89d57e816eeeee0274`.
- `packages/polaris-dossier/src/url-check-product-shape.ts`: 7109 bytes; SHA-256 `e1beab3c7ab3dfb798b9562fcd9dafb6eadef2db8feee8b60e16cea59d036295`.
- `packages/polaris-dossier/src/url-run-artifacts.test.ts`: 150640 bytes; SHA-256 `26c2c9c7c2504cd6b23d0e46fbb95f586ddd867b80914847cfa9c4003994e5a8`.
- `packages/polaris-dossier/src/url-run-artifacts.ts`: 127206 bytes; SHA-256 `ea1665b8f8afcb53d25e4e32c913afc987fa01b840980e796f400c99b29fc509`.

Manifest, verbatim:

```json
{
  "subjectCommit": "0f629938f7fafa14746d28b2144664415dc78acb",
  "candidate": [
    {
      "path": "packages/polaris-dossier/src/url-check-product-shape.test.ts",
      "bytes": 5374,
      "sha256": "b6612a8b98101aa1acc6a06f5450c74612fd5e9b13e59f89d57e816eeeee0274",
      "originalSHA256": "6861ad99ede9d3fca7b03336578cd959af83e32f64acd62e2aed1d231c71cf9f"
    },
    {
      "path": "packages/polaris-dossier/src/url-check-product-shape.ts",
      "bytes": 7109,
      "sha256": "e1beab3c7ab3dfb798b9562fcd9dafb6eadef2db8feee8b60e16cea59d036295",
      "originalSHA256": "b51e072408781db187bfd778cfd3297e0bb9a0ec3b68652e7c380764f41ad8c1"
    },
    {
      "path": "packages/polaris-dossier/src/url-run-artifacts.test.ts",
      "bytes": 150640,
      "sha256": "26c2c9c7c2504cd6b23d0e46fbb95f586ddd867b80914847cfa9c4003994e5a8",
      "originalSHA256": "456e51f36a18dee0b590fd8c40a5eacfcc165ca05d78796052e180edd3a7c8f6"
    },
    {
      "path": "packages/polaris-dossier/src/url-run-artifacts.ts",
      "bytes": 127206,
      "sha256": "ea1665b8f8afcb53d25e4e32c913afc987fa01b840980e796f400c99b29fc509",
      "originalSHA256": "ddfb0a233e864b1da14fa8f572c693f54d6e808fd7474c4aeee7e0a362233c87"
    }
  ],
  "predecessor": "question-kind-bridge-repair-0f629-R1",
  "revision": "R1runtimepassed4unit+163render+73artifact,1newassertionwrongolder-schemaexpectscompared; R2onlytestcorrection removesquestionKindsassignmentandexpectsUnknown. Productionbytesandunitbytesunchanged. Source/executionreviewsnotrepointed."
}

```
