// Governance-inputs loader: hermetic classification of what the tree
// holds, and the real-tree evaluation of the three current PWB acts (the
// 2026-09-02 consent act and the 2026-10-02 policy and registry
// behaviour-contract re-pin acts).
//
// The real-tree test reads only Syzygy's own governance tree. It never
// touches a Butlers repository, and the reader it hands the observer is a
// counter, so no body is read whatever the outcome.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import {
  discloseAuthority,
  evaluateBodyReadAuthority,
  observeProjectShape,
} from '@syzygy/three-surface-poc-core';

import {
  PWB_ACT_RECORDS,
  PWB_AUTHORITY_ARTIFACTS,
  PWB_OBSERVING_PROJECT,
  PWB_SUPERSEDED_ACT_RECORDS,
  loadBodyReadAuthorityInputs,
  pwbAuthorityExpectations,
  pwbAuthorityExpectationsForProject,
} from './governance-inputs.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const EVALUATION_INSTANT = '2026-11-05T09:43:08Z';
const CURRENT_COMMIT = 'f'.repeat(40);

function git(root: string, args: readonly string[]): string {
  return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function realGovernanceFixture(): string {
  const root = tempDir('syzygy-pwb-governance-');
  git(root, ['init', '-q']);
  git(root, ['config', 'gc.auto', '0']);
  git(root, ['config', 'maintenance.auto', 'false']);
  git(root, ['config', 'user.email', 'pwb-test@example.invalid']);
  git(root, ['config', 'user.name', 'PWB Test']);
  for (const path of [...Object.values(PWB_AUTHORITY_ARTIFACTS), ...Object.values(PWB_ACT_RECORDS)]) {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(REPO_ROOT, path)));
  }
  git(root, ['add', '.']);
  git(root, ['commit', '-qm', 'governance fixture']);
  git(root, ['tag', 'pwb-consent-observation-signed-2026-09-02']);
  return root;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

interface FakeTree {
  readonly files: Map<string, string>;
  readonly tags: Map<string, string>;
  readonly treePaths: Set<string>;
  readonly taggedRecords: Map<string, string>;
  failLifecycleList?: boolean;
  readonly unreadablePaths: Set<string>;
  readonly invalidUtf8Paths: Set<string>;
  /** Listed by the directory but ENOENT on read (a record that disappeared between enumeration and read). */
  readonly vanishedPaths: Set<string>;
}

function fakeTree(): FakeTree {
  const files = new Map<string, string>();
  for (const kind of ['consent', 'policy', 'registry'] as const) {
    files.set(PWB_AUTHORITY_ARTIFACTS[kind], readFileSync(join(REPO_ROOT, PWB_AUTHORITY_ARTIFACTS[kind]), 'utf8'));
    files.set(PWB_ACT_RECORDS[kind], readFileSync(join(REPO_ROOT, PWB_ACT_RECORDS[kind]), 'utf8'));
  }
  const expectations = pwbAuthorityExpectations(EVALUATION_INSTANT);
  const tags = new Map<string, string>([
    [expectations.authorities.consent.recordingTag, '1'.repeat(40)],
    [expectations.authorities.policy.recordingTag, '2'.repeat(40)],
    [expectations.authorities.registry.recordingTag, '3'.repeat(40)],
  ]);
  const taggedRecords = new Map<string, string>();
  for (const kind of ['consent', 'policy', 'registry'] as const) {
    taggedRecords.set(`${tags.get(expectations.authorities[kind].recordingTag)}:${PWB_ACT_RECORDS[kind]}`, files.get(PWB_ACT_RECORDS[kind]) ?? '');
  }
  return { files, tags, treePaths: new Set(Object.values(PWB_ACT_RECORDS)), taggedRecords, unreadablePaths: new Set(), invalidUtf8Paths: new Set(), vanishedPaths: new Set() };
}

function loaderFor(tree: FakeTree, fromGitTree = false, overrides: { readonly observingProject?: string } = {}) {
  const root = '/fake/root';
  const relative = (absolute: string): string => absolute.slice(`${root}/`.length);
  const bytesAt = (path: string): Uint8Array => {
    if (tree.unreadablePaths.has(path)) throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
    if (tree.vanishedPaths.has(path)) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    if (tree.invalidUtf8Paths.has(path)) return new Uint8Array([0xff]);
    const text = tree.files.get(path);
    if (text === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    return new TextEncoder().encode(text);
  };
  return loadBodyReadAuthorityInputs({
    repoRoot: root,
    evaluationId: 'eval-hermetic',
    evaluationInstant: EVALUATION_INSTANT,
    ...overrides,
    ...(fromGitTree ? { governanceRevision: 'HEAD' } : {
      readFile: (absolute: string) => bytesAt(relative(absolute)),
      listDirectory: (absolute: string) => {
        if (tree.failLifecycleList) throw new Error('list failed');
        const prefix = `${relative(absolute)}/`;
        return [...tree.files.keys()].filter((path) => path.startsWith(prefix)).map((path) => path.slice(prefix.length));
      },
    }),
    runGit: (_root, args) => {
      if (args[0] === 'rev-parse') {
        if (args[2] === 'HEAD^{commit}') return `${CURRENT_COMMIT}\n`;
        const tag = /^refs\/tags\/(.+)\^\{commit\}$/.exec(args[3] ?? '')?.[1] ?? '';
        const commit = tree.tags.get(tag);
        if (commit === undefined) throw new Error('unknown tag');
        return `${commit}\n`;
      }
      if (args[0] === 'ls-tree') {
        if (args.includes('-r')) return `${[...tree.files.keys()].join('\0')}\0`;
        const path = args[4] ?? '';
        return tree.treePaths.has(path) ? `${path}\n` : '';
      }
      throw new Error(`unexpected git ${args.join(' ')}`);
    },
    readGitBlob: (_root, object) => {
      const [commit, ...pathParts] = object.split(':');
      const path = pathParts.join(':');
      if (commit === CURRENT_COMMIT) return bytesAt(path);
      const text = tree.taggedRecords.get(object);
      if (text === undefined) throw new Error('missing tagged record');
      return new TextEncoder().encode(text);
    },
  });
}

describe('loadBodyReadAuthorityInputs (hermetic)', () => {
  it('loads the three artifacts and act records and resolves every recording tag', () => {
    const inputs = loaderFor(fakeTree());
    for (const kind of ['consent', 'policy', 'registry'] as const) {
      expect(inputs[kind].artifact.kind).toBe('present');
      expect(inputs[kind].actRecord.kind).toBe('owner-act-record');
      expect(inputs[kind].lifecycle).toEqual({});
      expect(inputs[kind].recordingTag.kind).toBe('resolved');
    }
    const evaluation = evaluateBodyReadAuthority(inputs);
    expect(evaluation.admits).toBe(true);
    expect(evaluation.authorizationMode).toBe('owner-trusted-bootstrap');
    for (const trailer of [
      'not explicitly selected by performing the offered state-(1) phrase',
      "not explicitly given by the owner's words recorded below",
      "never explicitly given by the owner's words recorded below",
      'rejected: "explicitly given by the owner\'s words recorded below"',
      "explicitly given by the owner's words recorded below, but rejected",
    ]) {
      const altered = fakeTree();
      const record = altered.files.get(PWB_ACT_RECORDS.policy)!.replace("explicitly given by the owner's words recorded below", trailer);
      altered.files.set(PWB_ACT_RECORDS.policy, record);
      for (const key of altered.taggedRecords.keys()) if (key.endsWith(`:${PWB_ACT_RECORDS.policy}`)) altered.taggedRecords.set(key, record);
      const refused = evaluateBodyReadAuthority(loaderFor(altered));
      expect(refused.admits, trailer).toBe(false);
      expect(refused.policy.kind === 'invalid' && refused.policy.caseId, trailer).toBe('policy:state-1-not-explicitly-selected');
      expect(refused.consent.kind).toBe('valid');
      expect(refused.registry.kind).toBe('valid');
    }
  });

  it('classifies a missing act record with an existing tag as git-ref-only', () => {
    const tree = fakeTree();
    tree.files.delete(PWB_ACT_RECORDS.policy);
    const inputs = loaderFor(tree);
    expect(inputs.policy.actRecord).toEqual({ kind: 'git-ref-only', ref: 'pwb-approve-policy-public-source-scope-v6-signed-2026-11-05' });
    const evaluation = evaluateBodyReadAuthority(inputs);
    expect(evaluation.policy.kind === 'invalid' && evaluation.policy.caseId).toBe('policy:git-ref-only');
  });

  it('the actual paired registry record selects state (1), while negated or quoted trailers refuse', () => {
    const current = fakeTree();
    const text = current.files.get(PWB_ACT_RECORDS.registry)!;
    const affirmative = "explicitly given by the owner's words recorded below";
    expect(text).toContain(affirmative);
    const admitted = evaluateBodyReadAuthority(loaderFor(current));
    expect(admitted.admits).toBe(true);
    expect(admitted.registry.kind === 'valid' && admitted.registry.provenance).toBe('state-1');
    for (const trailer of [
      `not ${affirmative}`,
      `never ${affirmative}`,
      `rejected: "${affirmative}"`,
      `${affirmative}, but rejected`,
    ]) {
      const altered = fakeTree();
      const record = text.replace(affirmative, trailer);
      altered.files.set(PWB_ACT_RECORDS.registry, record);
      for (const key of altered.taggedRecords.keys()) if (key.endsWith(`:${PWB_ACT_RECORDS.registry}`)) altered.taggedRecords.set(key, record);
      const refused = evaluateBodyReadAuthority(loaderFor(altered));
      expect(refused.admits, trailer).toBe(false);
      expect(refused.registry.kind === 'invalid' && refused.registry.caseId, trailer).toBe('registry:state-1-not-explicitly-selected');
      expect(refused.consent.kind).toBe('valid');
      expect(refused.policy.kind).toBe('valid');
    }
  });

  it('classifies a missing act record with no tag but a stamped artifact as tree-attribution-only', () => {
    const tree = fakeTree();
    tree.files.delete(PWB_ACT_RECORDS.consent);
    tree.tags.delete('pwb-consent-observation-signed-2026-09-02');
    const inputs = loaderFor(tree);
    expect(inputs.consent.actRecord.kind).toBe('tree-attribution-only');
    const evaluation = evaluateBodyReadAuthority(inputs);
    expect(evaluation.consent.kind === 'invalid' && evaluation.consent.caseId).toBe('consent:tree-attribution-only');
  });

  it('classifies a missing record, missing tag and missing artifact as absent', () => {
    const tree = fakeTree();
    tree.files.delete(PWB_ACT_RECORDS.registry);
    tree.files.delete(PWB_AUTHORITY_ARTIFACTS.registry);
    tree.tags.delete('pwb-registry-machine-ceiling-amendment-v1.0');
    const inputs = loaderFor(tree);
    expect(inputs.registry.artifact).toEqual({ kind: 'missing' });
    expect(inputs.registry.actRecord).toEqual({ kind: 'absent' });
  });

  it('leaves a tag unresolved when its commit does not carry the act record', () => {
    const tree = fakeTree();
    tree.taggedRecords.delete(`${'1'.repeat(40)}:${PWB_ACT_RECORDS.consent}`);
    const inputs = loaderFor(tree);
    expect(inputs.consent.recordingTag).toEqual({ kind: 'unresolved' });
    const evaluation = evaluateBodyReadAuthority(inputs);
    expect(evaluation.consent.kind === 'invalid' && evaluation.consent.caseId).toBe('consent:recording-tag-mismatched');
  });

  it('rejects a current act record whose bytes drift from the exact recording-tag blob', () => {
    const tree = fakeTree();
    tree.files.set(PWB_ACT_RECORDS.consent, `${tree.files.get(PWB_ACT_RECORDS.consent) ?? ''}\ncoordinated drift`);
    const evaluation = evaluateBodyReadAuthority(loaderFor(tree, true));
    expect(evaluation.consent.kind === 'invalid' && evaluation.consent.caseId).toBe('consent:recording-tag-mismatched');
  });

  // `vanish`: PWB-RECON-06 — a record the enumeration listed but the read
  // cannot find is aborted, never skipped (skipping would silently drop a
  // later revocation from the lifecycle).
  it.each(['list', 'read', 'decode', 'vanish'] as const)('fails closed when lifecycle %s fails', (failure) => {
    const tree = fakeTree();
    const other = '.syzygy/governance/decisions/OTHER.md';
    tree.files.set(other, '# Other decision\n');
    if (failure === 'list') tree.failLifecycleList = true;
    if (failure === 'read') tree.unreadablePaths.add(other);
    if (failure === 'decode') tree.invalidUtf8Paths.add(other);
    if (failure === 'vanish') tree.vanishedPaths.add(other);
    expect(() => loaderFor(tree)).toThrow(failure === 'vanish' ? /lifecycle record disappeared/ : undefined);
  });

  it('aborts lifecycle loading on invalid UTF-8 from the exact governance Git tree', () => {
    const tree = fakeTree();
    const other = '.syzygy/governance/decisions/INVALID-UTF8.md';
    tree.files.set(other, '# placeholder');
    tree.invalidUtf8Paths.add(other);
    expect(() => loaderFor(tree, true)).toThrow();
  });

  it('preserves production Git blob bytes for tag comparison and lifecycle decoding', () => {
    const root = realGovernanceFixture();
    const consentRecord = join(root, PWB_ACT_RECORDS.consent);
    writeFileSync(consentRecord, `${readFileSync(consentRecord, 'utf8')}\ncurrent-tree drift\n`);
    git(root, ['add', '.']);
    git(root, ['commit', '-qm', 'drift current record']);

    const load = () => loadBodyReadAuthorityInputs({
      repoRoot: root,
      governanceRevision: git(root, ['rev-parse', 'HEAD']),
      evaluationId: 'eval-production-bytes',
      evaluationInstant: EVALUATION_INSTANT,
    });
    expect(load().consent.recordingTag).toEqual({ kind: 'unresolved' });

    const invalid = join(root, '.syzygy/governance/decisions/INVALID-UTF8.md');
    writeFileSync(invalid, new Uint8Array([0xff]));
    git(root, ['add', '.']);
    git(root, ['commit', '-qm', 'invalid lifecycle bytes']);
    expect(load).toThrow();
  });

  it('detects a later decision record that revokes or supersedes an act identity', () => {
    const tree = fakeTree();
    tree.files.set(
      '.syzygy/governance/decisions/PWB-LATER-REVOCATION-ACT.md',
      '# Later act\n\nAct identity: `PWB-LATER-2026-09-10`\n\nSupersession / revocation: revokes `PWB-BUTLERS-OBSERVATION-CONSENT-2026-09-02`\n',
    );
    tree.files.set(
      '.syzygy/governance/decisions/PWB-LATER-SUPERSESSION-ACT.md',
      '# Later act\n\nAct identity: `PWB-LATER-2026-09-11`\n\nSupersession / revocation: supersedes `PWB-OBSERVER-REGISTRY-ENTRY-MACHINE-CEILING-2026-10-20`\n',
    );
    const inputs = loaderFor(tree);
    expect(inputs.consent.lifecycle).toEqual({ revokedBy: '.syzygy/governance/decisions/PWB-LATER-REVOCATION-ACT.md' });
    expect(inputs.registry.lifecycle).toEqual({ supersededBy: '.syzygy/governance/decisions/PWB-LATER-SUPERSESSION-ACT.md' });
    expect(inputs.policy.lifecycle).toEqual({});
    const evaluation = evaluateBodyReadAuthority(inputs);
    expect(evaluation.consent.kind === 'invalid' && evaluation.consent.caseId).toBe('consent:revoked');
    expect(evaluation.registry.kind === 'invalid' && evaluation.registry.caseId).toBe('registry:superseded');
  });

  it('detects a later amendment-form record that supersedes an act by its record path', () => {
    const tree = fakeTree();
    tree.files.set(
      '.syzygy/governance/decisions/PWB-LATER-POLICY-AMENDMENT-ACT.md',
      `# Later act\n\nAct identity: \`PWB-LATER-2026-09-12\`\n\nSupersession / revocation: this act supersedes, for the \`approve-policy\` role\nonly, the 2026-10-02 act recorded at \`${PWB_ACT_RECORDS.policy}\`. That\nrecord remains immutable history.\n`,
    );
    const inputs = loaderFor(tree);
    expect(inputs.policy.lifecycle).toEqual({ supersededBy: '.syzygy/governance/decisions/PWB-LATER-POLICY-AMENDMENT-ACT.md' });
    expect(inputs.consent.lifecycle).toEqual({});
    expect(inputs.registry.lifecycle).toEqual({});
    const evaluation = evaluateBodyReadAuthority(inputs);
    expect(evaluation.policy.kind === 'invalid' && evaluation.policy.caseId).toBe('policy:superseded');
  });

  it('the current policy and registry acts name the records they supersede; the superseded records are not the evaluated acts', () => {
    const tree = fakeTree();
    for (const kind of ['policy', 'registry'] as const) {
      const record = tree.files.get(PWB_ACT_RECORDS[kind]) ?? '';
      expect(record).toContain(`act recorded at \`${PWB_SUPERSEDED_ACT_RECORDS[kind]}\``);
      expect(PWB_ACT_RECORDS[kind]).not.toBe(PWB_SUPERSEDED_ACT_RECORDS[kind]);
    }
    // A current record rewritten to claim no supersession is a different act
    // from the one expected and fails closed on exactly that item.
    tree.files.set(
      PWB_ACT_RECORDS.policy,
      (tree.files.get(PWB_ACT_RECORDS.policy) ?? '').replace(/^Supersession \/ revocation:[\s\S]*?\n\n/m, 'Supersession / revocation: none — this act supersedes no earlier act\n\n'),
    );
    const evaluation = evaluateBodyReadAuthority(loaderFor(tree));
    expect(evaluation.policy.kind === 'invalid' && evaluation.policy.caseId).toBe('policy:supersession-target-wrong');
    expect(evaluation.registry.kind).toBe('valid');
  });

  it('the gate admits the current exact acts and refuses when either act names another digest', () => {
    const tree = fakeTree();
    const expected = pwbAuthorityExpectations(EVALUATION_INSTANT).authorities;
    expect(expected.policy.actIdentity).toBe('PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-APPROVAL-2026-11-05');
    expect(expected.registry.actIdentity).toBe('PWB-OBSERVER-REGISTRY-ENTRY-MACHINE-CEILING-2026-10-20');
    expect(expected.policy.recordingTag).toBe('pwb-approve-policy-public-source-scope-v6-signed-2026-11-05');
    expect(expected.registry.recordingTag).toBe('pwb-registry-machine-ceiling-amendment-v1.0');
    // Registry version and scope anchors are unchanged by the ceiling act.
    expect(expected.policy.scopeAnchors).toContain('1.7.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p');
    expect(expected.registry.scopeAnchors).toContain('1.2.0-candidate.1');
    const admitted = evaluateBodyReadAuthority(loaderFor(tree));
    expect(admitted.admits).toBe(true);
    for (const kind of ['policy', 'registry'] as const) {
      const record = tree.files.get(PWB_ACT_RECORDS[kind]) ?? '';
      const artifactDigest = sha256(new TextEncoder().encode(tree.files.get(PWB_AUTHORITY_ARTIFACTS[kind]) ?? ''));
      expect(record).toContain(`Exact digest (SHA-256): \`${artifactDigest}\``);
      // Mutate every copy of the digest in the record (and its tagged blob),
      // so phrase and digest still agree with each other but not the artifact.
      const flipped = (artifactDigest[0] === '0' ? '1' : '0') + artifactDigest.slice(1);
      const mutated = fakeTree();
      const mutatedRecord = record.split(artifactDigest).join(flipped);
      expect(mutatedRecord).not.toContain(artifactDigest);
      mutated.files.set(PWB_ACT_RECORDS[kind], mutatedRecord);
      for (const key of mutated.taggedRecords.keys()) {
        if (key.endsWith(`:${PWB_ACT_RECORDS[kind]}`)) mutated.taggedRecords.set(key, mutatedRecord);
      }
      const refused = evaluateBodyReadAuthority(loaderFor(mutated));
      expect(refused.admits).toBe(false);
      expect(refused[kind].kind === 'invalid' && refused[kind].caseId).toBe(`${kind}:exact-digest-wrong`);
      const other = kind === 'policy' ? 'registry' : 'policy';
      expect(refused[other].kind).toBe('valid');
    }
  });

  it('the superseded predecessor records no longer satisfy the gate', () => {
    for (const kind of ['policy', 'registry'] as const) {
      const tree = fakeTree();
      const predecessor = readFileSync(join(REPO_ROOT, PWB_SUPERSEDED_ACT_RECORDS[kind]), 'utf8');
      tree.files.set(PWB_ACT_RECORDS[kind], predecessor);
      for (const key of tree.taggedRecords.keys()) {
        if (key.endsWith(`:${PWB_ACT_RECORDS[kind]}`)) tree.taggedRecords.set(key, predecessor);
      }
      const evaluation = evaluateBodyReadAuthority(loaderFor(tree));
      expect(evaluation.admits).toBe(false);
      expect(evaluation[kind].kind).toBe('invalid');
    }
  });

  it('an edited artifact breaks its act’s digest binding', () => {
    const tree = fakeTree();
    tree.files.set(PWB_AUTHORITY_ARTIFACTS.policy, `${tree.files.get(PWB_AUTHORITY_ARTIFACTS.policy) ?? ''}\n`);
    const evaluation = evaluateBodyReadAuthority(loaderFor(tree));
    expect(evaluation.policy.kind === 'invalid' && evaluation.policy.caseId).toBe('policy:exact-digest-wrong');
  });
});

function localTagsPresent(runGit = (args: readonly string[]): string => execFileSync('git', ['-C', REPO_ROOT, ...args], { encoding: 'utf8' }).trim()): boolean {
  try {
    const expected = pwbAuthorityExpectations(EVALUATION_INSTANT).authorities;
    return (['consent', 'policy', 'registry'] as const).every((kind) =>
      /^[0-9a-f]{40}$/.test(runGit(['rev-parse', '--verify', `refs/tags/${expected[kind].recordingTag}^{commit}`])),
    );
  } catch {
    return false;
  }
}

describe('recording tag discovery', () => {
  it('resolves each exact expected ref, including the registry version tag', () => {
    const queried: string[][] = [];
    expect(localTagsPresent((args) => { queried.push([...args]); return 'a'.repeat(40); })).toBe(true);
    expect(queried).toContainEqual(['rev-parse', '--verify', 'refs/tags/pwb-registry-machine-ceiling-amendment-v1.0^{commit}']);
    expect(queried).toHaveLength(3);
  });

  it('an actually missing required version ref remains fail-closed', () => {
    expect(localTagsPresent((args) => {
      if (args.at(-1) === 'refs/tags/pwb-registry-machine-ceiling-amendment-v1.0^{commit}') throw new Error('missing ref');
      return 'a'.repeat(40);
    })).toBe(false);
    expect(localTagsPresent(() => '')).toBe(false);
  });
});

// The production reader spawns one `git cat-file` per blob: 123 over the real
// tree (about 1 s alone), the cost this test exists to exercise. Measured
// worst case 8.5 s under the parallel-load protocol (syzygy-pln3,
// docs/evidence/governance-inputs-timeout-2026-10-03.json).
const REAL_TREE_TIMEOUT_MS = 60_000;

describe('loadBodyReadAuthorityInputs (real Syzygy governance tree)', () => {
  it('evaluates the three real current PWB acts without reading any body', () => {
    const governanceRevision = execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const inputs = loadBodyReadAuthorityInputs({
      repoRoot: REPO_ROOT,
      governanceRevision,
      evaluationId: 'eval-real-tree',
      evaluationInstant: EVALUATION_INSTANT,
    });
    // Digest binding is recomputed from the real bytes, never transcribed.
    for (const kind of ['consent', 'policy', 'registry'] as const) {
      const artifact = inputs[kind].artifact;
      expect(artifact.kind).toBe('present');
      if (artifact.kind !== 'present') continue;
      const record = inputs[kind].actRecord;
      expect(record.kind).toBe('owner-act-record');
      if (record.kind !== 'owner-act-record') continue;
      expect(record.text).toContain(`Exact digest (SHA-256): \`${sha256(artifact.bytes)}\``);
    }

    const evaluation = evaluateBodyReadAuthority(inputs);
    let reads = 0;
    const observed = observeProjectShape({
      authority: evaluation,
      read: () => {
        reads += 1;
        return 'would-read';
      },
    });
    const disclosure = discloseAuthority(evaluation);

    if (localTagsPresent()) {
      // Full checkout with the three recording tags: every act is a valid
      // state-(1) act; nothing is independently verified.
      expect(evaluation.admits).toBe(true);
      expect(evaluation.authorizationMode).toBe('owner-trusted-bootstrap');
      for (const kind of ['consent', 'policy', 'registry'] as const) {
        expect(evaluation[kind].kind).toBe('valid');
        expect(evaluation[kind].kind === 'valid' && evaluation[kind].provenance).toBe('state-1');
      }
      expect(observed.kind).toBe('admitted');
      expect(reads).toBe(1);
      for (const entry of disclosure.authorities) {
        expect(entry.state).toBe('owner-adopted (bootstrap, uncorrelated)');
        expect(entry.independentlyVerified).toBe(false);
        expect(entry.disclosure).toBe(
          "Owner-trusted only; same-tree forgeable from Syzygy's perspective. Digest detects drift, not authorship or attendance.",
        );
      }
    } else {
      // Shallow, untagged or partly tagged checkout (hosted CI, or a branch
      // whose act tags are created at merge): each act whose recording tag
      // does not resolve fails closed on exactly that case, each act whose
      // tag does resolve stays valid, and the gate admits nothing.
      expect(evaluation.admits).toBe(false);
      for (const kind of ['consent', 'policy', 'registry'] as const) {
        if (inputs[kind].recordingTag.kind === 'resolved') {
          expect(evaluation[kind].kind).toBe('valid');
        } else {
          expect(evaluation[kind].kind === 'invalid' && evaluation[kind].caseId).toBe(`${kind}:recording-tag-mismatched`);
        }
      }
      expect(observed.kind).toBe('unknown');
      expect(reads).toBe(0);
    }
    expect(disclosure.authorities.every((entry) => entry.independentlyVerified === false)).toBe(true);
  }, REAL_TREE_TIMEOUT_MS);
});

// N8 slice 4: the authority set is a lookup keyed by observed project, with
// exactly one registered entry. An unknown project id must fail closed —
// no authority is synthesized or borrowed from another project's entry.
describe('pwbAuthorityExpectationsForProject (authority set keyed by observed project)', () => {
  it('resolves the one registered project to the same expectations as the back-compat helper', () => {
    const keyed = pwbAuthorityExpectationsForProject(PWB_OBSERVING_PROJECT, EVALUATION_INSTANT);
    const legacy = pwbAuthorityExpectations(EVALUATION_INSTANT);
    expect(keyed).toEqual(legacy);
    expect(keyed.observingProject).toBe('project:syzygy');
    expect(keyed.configuredRepository).toBe('repository:butlers-configured-poc');
  });

  it('fails closed for an unknown observing project: no default fallback to Butlers', () => {
    expect(() => pwbAuthorityExpectationsForProject('project:some-other-project', EVALUATION_INSTANT)).toThrow(
      /no body-read authority expectations are registered for observing project "project:some-other-project"/,
    );
  });

  it('propagates the fail-closed error through loadBodyReadAuthorityInputs for an unregistered project', () => {
    const tree = fakeTree();
    expect(() =>
      loaderFor(tree, false, { observingProject: 'project:unregistered' }),
    ).toThrow(/no body-read authority expectations are registered for observing project "project:unregistered"/);
  });

  it('resolves the default (unspecified observingProject) the same as the explicit registered project', () => {
    const tree = fakeTree();
    const withDefault = evaluateBodyReadAuthority(loaderFor(tree));
    const withExplicit = evaluateBodyReadAuthority(loaderFor(tree, false, { observingProject: PWB_OBSERVING_PROJECT }));
    expect(withDefault).toEqual(withExplicit);
  });
});

// Characterization (syzygy-bpyt.6.10): how the gate treats an altered owner-act record. It pins today's behaviour and proposes no
// change; every FAIL-OPEN title names a result a tightening would flip (an owner question, GP-Q0). The alterations copy the shapes of
// `PROSE_ALTERATIONS` in packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts (this package cannot import it), plus
// `effect-appended-grant`. Two readings: `isolated` keeps the recording tag resolved over the altered bytes (what the parser and
// evaluator say alone); `faithful` leaves the tag's blob as recorded, as the loader does, so any byte change reads tag-mismatched.
// The census over every line is scripts/measure_owner_act_parser_recognition.mjs, recorded in
// docs/evidence/syzygy-bpyt-6-10/owner-act-parser-recognition-2026-11-03.json.
describe('owner-act records under altered prose (characterization, syzygy-bpyt.6.10)', () => {
  const KINDS = ['consent', 'policy', 'registry'] as const;
  const MARK = ' [altered]';
  const ALTERATIONS: ReadonlyArray<readonly [string, (text: string) => string]> = [
    ['date-field-altered', (text) => text.replace(/^(Date: .+)$/m, `$1${MARK}`)],
    ['effect-widened', (text) => text.replace(/(\n## (?:Effect|What this records)\n\n)[^\n]+(?:\n[^\n]+)*/, '$1The act grants every read, egress, write and execution, for every repository, tool and provider.')],
    ['limits-removed', (text) => text.replace(/\n## What this (?:act does not authorize|does not do)\n[\s\S]*?(?=\n## |$)/, '')],
    ['selection-replaced', (text) => {
      for (const [pattern, replacement] of [[/^\| "[^"\n]*" \| "/m, '| "Decline" | "'], [/^> .+$/m, '> Decline'], [/^Owner selection: .+$/m, 'Owner selection: Decline']] as const) {
        if (pattern.test(text)) return text.replace(pattern, replacement);
      }
      return text;
    }],
    ['withdrawal-appended', (text) => `${text}\n## Withdrawal\n\nThe owner withdraws this act; it no longer counts.\n`],
    ['effect-appended-grant', (text) => text.replace(/(\n## Effect\n[\s\S]*?)(?=\n## |$)/, '$1\nThe act also grants every read, egress, write and execution, for every repository, tool and provider.\n')],
  ];

  type Reading = 'isolated' | 'faithful';
  /** The named authority's verdict with its record replaced by `text`. */
  function verdictOf(kind: (typeof KINDS)[number], text: string, reading: Reading): string {
    const tree = fakeTree();
    tree.files.set(PWB_ACT_RECORDS[kind], text);
    if (reading === 'isolated') {
      for (const key of tree.taggedRecords.keys()) if (key.endsWith(`:${PWB_ACT_RECORDS[kind]}`)) tree.taggedRecords.set(key, text);
    }
    const state = evaluateBodyReadAuthority(loaderFor(tree))[kind];
    return state.kind === 'valid' ? 'valid' : state.kind === 'invalid' ? state.caseId : `absent:${state.what}`;
  }
  const recordText = (kind: (typeof KINDS)[number]): string => readFileSync(join(REPO_ROOT, PWB_ACT_RECORDS[kind]), 'utf8');

  it('reads the three unaltered records as valid under both readings', () => {
    for (const kind of KINDS) {
      expect(verdictOf(kind, recordText(kind), 'isolated'), kind).toBe('valid');
      expect(verdictOf(kind, recordText(kind), 'faithful'), kind).toBe('valid');
    }
  });

  // [authority, alteration, took, isolated verdict, faithful verdict]
  const VERDICTS: ReadonlyArray<readonly [(typeof KINDS)[number], string, boolean, string, string]> = [
    ['consent', 'date-field-altered', true, 'consent:act-instant-malformed', 'consent:act-instant-malformed'],
    ['consent', 'effect-widened', true, 'consent:scope-wrong', 'consent:scope-wrong'],
    ['consent', 'limits-removed', true, 'valid', 'consent:recording-tag-mismatched'],
    ['consent', 'selection-replaced', false, 'valid', 'valid'],
    ['consent', 'withdrawal-appended', true, 'valid', 'consent:recording-tag-mismatched'],
    ['consent', 'effect-appended-grant', true, 'valid', 'consent:recording-tag-mismatched'],
    ['policy', 'date-field-altered', true, 'policy:act-instant-malformed', 'policy:act-instant-malformed'],
    ['policy', 'effect-widened', true, 'policy:scope-wrong', 'policy:scope-wrong'],
    ['policy', 'limits-removed', true, 'valid', 'policy:recording-tag-mismatched'],
    ['policy', 'selection-replaced', true, 'valid', 'policy:recording-tag-mismatched'],
    ['policy', 'withdrawal-appended', true, 'valid', 'policy:recording-tag-mismatched'],
    ['policy', 'effect-appended-grant', true, 'valid', 'policy:recording-tag-mismatched'],
    ['registry', 'date-field-altered', true, 'registry:act-instant-malformed', 'registry:act-instant-malformed'],
    ['registry', 'effect-widened', true, 'registry:scope-wrong', 'registry:scope-wrong'],
    ['registry', 'limits-removed', false, 'valid', 'valid'],
    ['registry', 'selection-replaced', true, 'valid', 'registry:recording-tag-mismatched'],
    ['registry', 'withdrawal-appended', true, 'valid', 'registry:recording-tag-mismatched'],
    ['registry', 'effect-appended-grant', true, 'valid', 'registry:recording-tag-mismatched'],
  ];

  it.each(VERDICTS)('%s record, %s: took %s, parser-isolated %s, loader-faithful %s', (kind, name, took, isolated, faithful) => {
    const alter = ALTERATIONS.find(([n]) => n === name)![1];
    const text = recordText(kind);
    const altered = alter(text);
    expect(altered !== text).toBe(took);
    expect(verdictOf(kind, altered, 'isolated')).toBe(isolated);
    expect(verdictOf(kind, altered, 'faithful')).toBe(faithful);
  });

  it('FAIL-OPEN (parser-isolated): an appended withdrawal section, a removed limits section and a grant appended inside the Effect all leave every act valid', () => {
    for (const kind of KINDS) {
      for (const name of ['withdrawal-appended', 'limits-removed', 'effect-appended-grant']) {
        const alter = ALTERATIONS.find(([n]) => n === name)![1];
        expect(verdictOf(kind, alter(recordText(kind)), 'isolated'), `${kind} ${name}`).toBe('valid');
      }
    }
  });

  it('effect-widened is refused only because its replacement drops the scope anchors, which scope-wrong tests by substring', () => {
    for (const kind of KINDS) {
      expect(verdictOf(kind, ALTERATIONS.find(([n]) => n === 'effect-widened')![1](recordText(kind)), 'isolated'), kind).toBe(`${kind}:scope-wrong`);
    }
  });

  // [authority, non-blank lines, append ignored, delete ignored]; ignored = the authority's verdict is unchanged (parser-isolated).
  const CENSUS: ReadonlyArray<readonly [(typeof KINDS)[number], number, number, number]> = [
    ['consent', 56, 42, 37],
    ['policy', 69, 55, 50],
    ['registry', 52, 38, 30],
  ];
  it.each(CENSUS)('FAIL-OPEN (parser-isolated) line census, %s record: of %s non-blank lines, %s ignore an appended suffix and %s ignore deletion; none do under the loader-faithful reading', (kind, nonBlank, appendIgnored, deleteIgnored) => {
    const lines = recordText(kind).split('\n');
    if (lines.at(-1) === '') lines.pop();
    const counts = { nonBlank: 0, append: { isolated: 0, faithful: 0 }, delete: { isolated: 0, faithful: 0 } };
    lines.forEach((line, index) => {
      if (line.trim() === '') return;
      counts.nonBlank += 1;
      for (const [op, replacement] of [['append', [`${line}${MARK}`]], ['delete', []]] as const) {
        const altered = `${[...lines.slice(0, index), ...replacement, ...lines.slice(index + 1)].join('\n')}\n`;
        if (verdictOf(kind, altered, 'isolated') === 'valid') counts[op].isolated += 1;
        if (verdictOf(kind, altered, 'faithful') === 'valid') counts[op].faithful += 1;
      }
    });
    expect(counts).toEqual({ nonBlank, append: { isolated: appendIgnored, faithful: 0 }, delete: { isolated: deleteIgnored, faithful: 0 } });
  });

  it('FAIL-OPEN (parser-isolated): text appended to the recording-tag line, and extra prose after the Supersession value, are ignored', () => {
    const consent = recordText('consent');
    const tagged = consent.replace(/^(- recording tag: `[^`]+`)/m, `$1${MARK}`);
    expect(tagged).not.toBe(consent);
    expect(verdictOf('consent', tagged, 'isolated')).toBe('valid');
    const none = consent.replace(/^(Supersession \/ revocation: none)\b/m, '$1, except that this act revokes every earlier act');
    expect(none).not.toBe(consent);
    expect(verdictOf('consent', none, 'isolated')).toBe('valid');
  });
});
