# R-K54O3-NO-RECORD-1
Verdict: REVISE
Reviewed commit: 77f206d94cd9c6e084470e8d514e2611e27cc3e2
Reviewer: fresh-context subagent

Scope: `git diff origin/main...77f206d94` (16 files). Governing: FOLLOW-ON F-1/F-3, SEC-2, SEC-5, VIS-4, REQ-polaris-generation-040. F-3 reads: "Remove the record gates from the dossier path and fix the clone shape … Done when an agent session runs `syzygy polaris <public url>` end to end with no consent, statement or registry record present." It names `session-handover.ts` (`CONSENT_RULE`) and `source-visibility-gate.ts` as in scope.

Checks run in a scratch worktree at 77f206d94 after `npm ci`: [Observed] the four targeted vitest files pass, 131/131; `npx tsc -p tsconfig.json --noEmit` exits 0. Behaviour probes ran the extracted `resolveRevision` (esbuild-transpiled verbatim) against a real local repository (`file://`) with git 2.53.0.

## Findings

1. **blocking: `resolveRevision` pins the tag object, not the commit, for every annotated tag.** `packages/polaris-dossier/src/polaris.ts:396-406`.
   Evidence [Observed]: `git ls-remote <url> v1` returns only `refs/tags/v1` with the tag-object id. A pattern never matches the `refs/tags/v1^{}` line, so `peeled` is always undefined for a real remote. On a repository where `v1` is an annotated tag of commit `2ad6cc9e…`, `resolveRevision(url,'v1')` returned `{"label":"v1-5d8f7ef73fc5","commit":"5d8f7ef7…"}`, and `git cat-file -t 5d8f7ef7` is `tag`. The supervisor then fetches the tag id, and `checkout --detach FETCH_HEAD` leaves HEAD at `2ad6cc9e…`. The clone also holds a `tag` object beside the commit (`cat-file --batch-all-objects`). Results:
   - the label names the wrong id;
   - every later run refuses its own clone ("exists but is not a clone of 5d8f…"), because `rev-parse HEAD` never equals `chosen.commit`;
   - init's clone-shape checks receive an extra tag object [Unknown: whether init refuses it].
   The unit test at `polaris-clone.test.ts:72` passes with the bug present. Its fixture invents a `refs/tags/8.0.0^{}` line that `ls-remote <url> <name>` never emits. The evidence record's mutant `revision-ignores-peeled-tag` is "killed" only against that fabricated fixture.
   Fix: query `ls-remote <url> <name> '<name>^{}'`. [Observed] that form returns both lines. Map each `^{}` line back to its own ref, and replace that ref's id with the peeled one. Then decide uniqueness over the mapped refs. Add a test that runs real git (integration tier) on an annotated tag.

2. **should-fix: a peeled line hides branch-versus-tag ambiguity.** `polaris.ts:400,406`.
   Evidence [Observed in code]: `peeled = refs.find(x => x.ref.endsWith('^{}'))` takes the first peeled line of any ref. Whenever one exists, `commits` is built from that one line alone. So `refs/heads/x` at commit A plus an annotated `refs/tags/x` peeling to B resolves silently to B. The fixture form ``${A}\trefs/heads/x\n${T}\trefs/tags/x\n${B}\trefs/tags/x^{}`` returns B and no refusal. Today this is masked only by finding 1. It goes live once finding 1 is fixed naively.
   Fix: the per-ref mapping in finding 1. Add the three-line fixture as a refusal case.

3. **should-fix: the anonymous URL probe is not credential-free, yet it declares visibility.** `polaris.ts:357-358,375,396`, and `setUp` passes `--visibility public`.
   Evidence:
   - [Observed] `-c credential.helper=` leaves user config in force. `git -c url.file://…/up.insteadOf=https://private.invalid/o/r -c credential.helper= ls-remote https://private.invalid/o/r HEAD` answered with a commit.
   - [Inferred] An `insteadOf` rewrite to `git@…:` in `~/.gitconfig` therefore authenticates with the operator's SSH key. The same holds for `~/.netrc` (curl) and for `http.extraHeader`.
   - [Observed] A private repository reachable that way is cloned and declared `public` to init. Per `screen.ts:42-46,106`, `private` "excludes every detector-matched body whole" and keeps object ids off pages, so a false `public` relaxes screening of private content. That sits in the SEC-5 trust floor ("never sent by Syzygy, whatever is declared"), and the owner keeps any weakening of it (VIS-4 class 2).
   Before this PR the probe already declared public on the no-`--revision` path. This PR extends it to every path, including `--revision`, which a consent record used to decide.
   Fix: run probe and fetch with `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1`, `HOME=<empty temp dir>`, `GIT_ASKPASS=` / `SSH_ASKPASS=` unset, and `GIT_SSH_COMMAND=false` (or `-c protocol.allow=never -c protocol.https.allow=always …`). Add a test asserting that environment.

4. **should-fix: with `--clone`, `publicByProbe` describes the URL, not the clone.** `polaris.ts:420-432`.
   Evidence [Observed in code]: with `--clone` and no `--revision`, the clone's HEAD is never tied to the URL, yet a successful probe of the URL sends `--visibility public`. A clone of a private fork or a private commit, passed beside a public URL, is screened as public (see finding 3 for the consequence).
   Fix: in `--clone` mode, declare `public` only when the clone's commit equals a ref the anonymous probe returned. Otherwise omit `--visibility`, which gives conservative private treatment per the init usage text.

5. **should-fix: `--clone --revision` on a private repository is refused with circular advice.** `polaris.ts:396-397,424-429`.
   Evidence [Observed in code]: with `--clone`, a `--revision` (even a full 40-hex commit) still runs an anonymous `ls-remote`. For a private URL it refuses "…for a private repository make a one-commit clone yourself and pass --clone <dir>", which the operator already did.
   Fix: in `--clone` mode, compare a full-commit `--revision` with the clone's HEAD locally. Only resolve a name remotely, and on failure say that `--revision <name>` needs a readable remote and a full commit can be given instead.

6. **should-fix (AC3): dead shims for removed behaviour remain in scope.**
   Evidence [Observed]:
   - `cli.ts:197-200` (`CliPorts.visibilityOf`) and `cli.ts:210-211` (`cliVisibilityOf`) now have no caller in `packages/` outside their definition. Their tests were deleted but the code stayed.
   - `source-visibility-gate.ts:83` `fetchRefusal` is referenced only by its own test. Its one product caller was `supervisorClone`.
   - `session-handover.ts:51` still reads "REQ-polaris-generation-046 line 13: every agent text Syzygy ships says that only the owner answers a consent question". It now heads an `inventoryPrompt` that no longer says that: a false sentence left at the site.
   Fix: delete the three symbols and the stale comment. Either delete `fetchRefusal`'s test or retire the function with an explicit note.

7. **should-fix (AC2): "setUp reaches init with no record present" has no automated test.**
   Evidence [Observed]: the evidence record says so itself ("setUp's … has no automated test (setUp is not injected); covered by … syzygy-k54o.3.3"). The tests cover `preflight` with a Proxy that throws on every record read (sound: a read fails the case), and `supervisorClone`/`resolveRevision` in isolation. Nothing shows that `init` succeeds with every record absent and `--visibility public`. Init may still enforce the provider-statement gate that REQ-polaris-generation-040's companion clause (spec line 260) requires.
   Fix: inject `setUp`'s git deps, or add an integration test running `syzygy polaris` steps through `init` against a fixture upstream with an empty records root. Otherwise mark AC2 as open in the PR.

8. **note: spec divergence.** REQ-polaris-generation-040 (spec.md:9): "Syzygy SHALL make no clone or fetch of the repository itself … the command SHALL refuse when no `--clone` is given". Its falsifier (line 48) is "The command makes a clone or fetch of the repository itself, or runs without `--clone`". The code fetches by default [Observed]. That predates this PR, but the PR widens it to arbitrary `--revision`, and preflight's printed commands now fetch `HEAD`. The spec also still requires an in-force provider statement (line 260). Record the divergence in the PR and the F-1 bead until the amending slice lands.

9. **note: ref-name edge cases.** `polaris.ts:388,396-406`.
   - [Observed] `ls-remote` patterns tail-match path components, so `x` also matches `refs/heads/feature/x`. That refuses as ambiguous (safe), with a clear message.
   - [Inferred] An upper-case or abbreviated commit falls through to "has no branch or tag named …", which is misleading.
   - [Inferred] A SHA-256 repository (64-hex) fails `{40}\t`, so every resolution reports "names no HEAD commit" or "no branch or tag". This fails closed, but the message does not say why.
   - [Observed] At 77f206d94 a `--revision` starting with `-` reaches `ls-remote` after the URL. With git 2.53 `--upload-pack=touch …` was treated as a pattern and ran nothing.
   - [Observed] An unpushed local commit `cf7816b1` on the branch's worktree adds a `REF_NAME` guard and tests for this. Those bytes are not the reviewed commit.

10. **note: preflight identity for deep URLs.** For `https://github.com/redis/redis/tree/unstable`, `preflight` reports `repositoryId: 'tree-unstable'` and `ready` (`start-gates.test.ts`). `urlSlug` names the clone directory the same way. That is harmless (ls-remote on that URL fails), but the report shows a meaningless identity as ready. Consider refusing, or noting it, when the path has more than two segments on a known forge.

## Acceptance criteria

- AC1: met. [Observed] The Proxy test fails on any record read, and the CLI test runs with consent, registry and policy acts absent.
- AC2: not demonstrated (finding 7).
- AC3: not met (finding 6).
- AC4: [Observed] targeted tests and typecheck green at 77f206d94. The full battery was not re-run by this reviewer.
