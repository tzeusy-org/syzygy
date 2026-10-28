// Project-shape source manifest — PWB-REQ-001 phase A discovery.
//
// Derives the revision-bound, closed source-path population of the one
// configured Butlers repository from (a) exact Git tree metadata and (b)
// the two index bodies the adopted secret policy's `sourceAdmission.phaseA`
// allows: the fixed root index and each declared pillar's README index.
// The four population rules are the signed spec's reader definition:
//
//   1. the five pillar roots named by the root index;
//   2. the files named by each pillar's own README index, restricted to
//      that pillar root (narrative links do not recurse);
//   3. baseline `openspec/specs/<one-directory>/spec.md` Git-tree entries;
//   4. top-level `roster/<one-directory>/butler.toml` entries, plus that
//      directory's `MANIFESTO.md` when present.
//
// The manifest is observation scope, not a copy of Butlers facts: it
// records paths, source rules, extraction classes, tree anchors and a
// sha256 over its canonical bytes. The population never shrinks on a
// failure — a named file absent at the revision, an unreadable index or an
// undeclared pillar is recorded with its reason and stays counted.
//
// This module reads nothing itself. Index bodies arrive through the
// injected `readSeed`, which the observer (slice P2.2) supplies only after
// the PWB-REQ-005 gate admits, and only for the paths listed in
// `phaseAReads`. Rules 3 and 4 use tree metadata alone.

import { deepFreeze, sha256 } from '@syzygy/support';

import {
  indexGitTree,
  normalizeRepositoryPath,
  posixBasename,
  posixDirname,
  type GitTreeEntry,
  type GitTreeIndex,
} from './git-tree.js';
import { isFencedAt, recognizeCodeContexts, spanRangesWithin } from './markdown-code-context.js';

// Byte-equal to the adopted registry entry's `discoveryVersion` and the
// adopted policy's `sourceAdmission.phaseA.fixedSeedPaths`;
// `project-shape-manifest.test.ts` proves both against the act-bound JSON.
export const PWB_DISCOVERY_VERSION = 'pwb-discovery-v2-candidate.1';
export const PWB_ROOT_INDEX_PATH = 'about/README.md';

// Root index → pillar index → named file.
export const PWB_INDEX_DEPTH = 3;

export const PILLAR_KEYS = ['heart-and-soul', 'legends-and-lore', 'spec-and-spine', 'lay-and-land', 'craft-and-care'] as const;
export type PillarKey = (typeof PILLAR_KEYS)[number];

const PILLAR_LABELS: Readonly<Record<PillarKey, string>> = {
  'heart-and-soul': 'Heart and Soul',
  'legends-and-lore': 'Legends and Lore',
  'spec-and-spine': 'Spec and Spine',
  'lay-and-land': 'Lay and Land',
  'craft-and-care': 'Craft and Care',
};

export const EXTRACTION_CLASSES = [
  'project-account-section',
  'principle',
  'success-criterion',
  'catalog-entry',
  'design-contract',
  'baseline-spec',
  'topology-component',
  'craft-policy',
  'roster-identity',
] as const;
export type ExtractionClass = (typeof EXTRACTION_CLASSES)[number];

export const SOURCE_RULES = ['root-index', 'pillar-index', 'pillar-named-file', 'baseline-spec-tree', 'roster-tree'] as const;
export type SourceRule = (typeof SOURCE_RULES)[number];

export type SourceAnchor =
  | { readonly kind: 'blob'; readonly mode: string; readonly objectId: string }
  | { readonly kind: 'not-a-blob'; readonly mode: string; readonly type: 'tree' | 'commit' }
  | { readonly kind: 'missing-at-revision' };

export interface ManifestSource {
  readonly path: string;
  readonly rule: SourceRule;
  readonly pillar?: PillarKey;
  // The index whose link named this source (rules 1–2 only).
  readonly declaredBy?: string;
  readonly extractionClasses: readonly ExtractionClass[];
  readonly anchor: SourceAnchor;
}

export const PILLAR_UNKNOWN_REASONS = [
  'root-index-missing-at-revision',
  'root-index-unavailable',
  'not-named-in-root-index',
  'named-root-ambiguous',
  'root-missing-at-revision',
  'index-missing-at-revision',
  'index-unavailable',
] as const;
export type PillarUnknownReason = (typeof PILLAR_UNKNOWN_REASONS)[number];

export type PillarDiscovery =
  | {
      readonly key: PillarKey;
      readonly state: 'discovered';
      readonly root: string;
      readonly indexPath: string;
      readonly namedSources: number;
      readonly ignoredLinks: readonly IgnoredLink[];
    }
  | {
      readonly key: PillarKey;
      readonly state: 'unknown';
      readonly reason: PillarUnknownReason;
      // The reader's own reason text for `index-unavailable`.
      readonly detail?: string;
      readonly root?: string;
      readonly indexPath?: string;
      readonly ignoredLinks: readonly IgnoredLink[];
    };

export const IGNORED_LINK_REASONS = ['external', 'escapes-repository', 'outside-pillar-root', 'names-a-directory', 'self'] as const;
export interface IgnoredLink {
  readonly target: string;
  readonly reason: (typeof IGNORED_LINK_REASONS)[number];
}

export type RootIndexState =
  | { readonly state: 'read'; readonly anchor: SourceAnchor }
  | { readonly state: 'unavailable'; readonly reason: string; readonly anchor: SourceAnchor }
  | { readonly state: 'missing-at-revision'; readonly anchor: SourceAnchor };

export interface ProjectShapeSourceManifest {
  readonly repositoryId: string;
  readonly revision: string;
  readonly discoveryVersion: string;
  readonly indexDepth: number;
  readonly rootIndex: { readonly path: string } & RootIndexState;
  readonly pillars: readonly PillarDiscovery[];
  // Every source-path in the population, sorted by path, unique.
  readonly sources: readonly ManifestSource[];
  // Exactly the paths whose bodies phase A asked `readSeed` for, in order.
  readonly phaseAReads: readonly string[];
  // sha256 over the canonical JSON of every field above.
  readonly digest: string;
}

export type DeclaredPillarRoots = ReadonlyMap<PillarKey, { readonly root: string; readonly ambiguous: boolean }>;

export type SeedRead =
  | { readonly kind: 'text'; readonly text: string; readonly pillarRoots?: DeclaredPillarRoots }
  | { readonly kind: 'unavailable'; readonly reason: string };

export interface DeriveManifestInput {
  readonly repositoryId: string;
  readonly revision: string;
  readonly discoveryVersion?: string;
  // Exact `ls-tree -r -z` metadata of `revision`; never working-tree state.
  readonly tree: readonly GitTreeEntry[];
  // Phase A body access, invoked only for tree-present blobs among the
  // root index and the declared pillar indexes.
  readonly readSeed: (seed: { readonly path: string; readonly objectId: string }) => SeedRead;
}

export type DeriveManifestResult =
  | { readonly kind: 'manifest'; readonly manifest: ProjectShapeSourceManifest }
  | { readonly kind: 'invalid-input'; readonly reason: string };

// ---------------------------------------------------------------------
// Closed Markdown link grammar for indexes.
//
// A link is an inline `[text](target "title")` outside fenced code blocks
// and inline code spans, or a reference definition `[label]: target` at
// line start. Images (`![...]`) are not links. Fragments and queries are
// dropped. Nothing else in an index names a file.

// Which lines sit inside a fence, and which characters sit inside a code span, are the PWB-REQ-006 profile's rules
// (`recognizeCodeContexts`), not rules of this module (syzygy-bpyt.55). The line model stays this module's: the text splits at LF, and a
// line is fenced when the profile marks its first character fenced. A span is deleted, not blanked, as the reader always did: each
// character of a profile span on the line is removed and a CR or LF inside it stays, so the line count never moves. `stripInlineCode`
// false leaves spans alone (the root index's pillar table keeps its code-span directory cells).
function stripFences(text: string, stripInlineCode = true): readonly string[] {
  const recognition = recognizeCodeContexts(text);
  const kept: string[] = [];
  let offset = 0;
  for (const line of text.split('\n')) {
    const start = offset;
    offset += line.length + 1;
    if (isFencedAt(recognition, start)) continue;
    if (!stripInlineCode) {
      kept.push(line);
      continue;
    }
    let rendered = '';
    let at = 0;
    for (const [from, to] of spanRangesWithin(recognition, start, start + line.length)) {
      rendered += line.slice(at, from - start) + line.slice(from - start, to - start).replace(/[^\r\n]/g, '');
      at = to - start;
    }
    kept.push(rendered + line.slice(at));
  }
  return kept;
}

const INLINE_LINK = /(!?)\[[^\]]*\]\(\s*(?:<([^>]*)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const REFERENCE_DEFINITION = /^\s{0,3}\[[^\]]+\]:\s*(?:<([^>]*)>|(\S+))(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*$/;

export function indexLinkTargets(text: string): readonly string[] {
  const targets: string[] = [];
  for (const line of stripFences(text)) {
    const definition = REFERENCE_DEFINITION.exec(line);
    if (definition !== null) {
      targets.push(definition[1] ?? definition[2] ?? '');
      continue;
    }
    for (const match of line.matchAll(INLINE_LINK)) {
      if (match[1] === '!') continue;
      targets.push(match[2] ?? match[3] ?? '');
    }
  }
  return targets;
}

const SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

type ResolvedLink =
  | { readonly kind: 'path'; readonly target: string; readonly path: string; readonly directory: boolean }
  | { readonly kind: 'ignored'; readonly link: IgnoredLink };

function resolveLink(indexPath: string, rawTarget: string): ResolvedLink | undefined {
  const target = rawTarget.replace(/[#?].*$/, '');
  if (target === '') return undefined; // fragment-only: not a file reference
  if (SCHEME.test(target) || target.startsWith('//')) return { kind: 'ignored', link: { target: rawTarget, reason: 'external' } };
  const directory = target.endsWith('/');
  const joined = target.startsWith('/') ? target : `${posixDirname(indexPath)}/${target}`;
  const path = normalizeRepositoryPath(joined);
  if (path === undefined) return { kind: 'ignored', link: { target: rawTarget, reason: 'escapes-repository' } };
  return { kind: 'path', target: rawTarget, path, directory };
}

// ---------------------------------------------------------------------
// Extraction classes by (rule, pillar, path within the pillar root).

function extractionClassesFor(rule: SourceRule, pillar: PillarKey | undefined, relativePath: string): readonly ExtractionClass[] {
  switch (rule) {
    case 'baseline-spec-tree':
      return ['baseline-spec'];
    case 'roster-tree':
      return relativePath === 'butler.toml' ? ['roster-identity'] : [];
    case 'root-index':
      return [];
    case 'pillar-index':
      if (pillar === 'legends-and-lore') return ['design-contract'];
      if (pillar === 'craft-and-care') return ['craft-policy'];
      return [];
    case 'pillar-named-file':
      if (pillar === 'heart-and-soul') {
        if (relativePath === 'vision.md') return ['project-account-section', 'principle', 'success-criterion'];
        if (relativePath === 'architecture.md') return ['project-account-section'];
        if (relativePath === 'v1.md') return ['project-account-section', 'success-criterion', 'catalog-entry'];
      }
      if (pillar === 'lay-and-land' && relativePath === 'components.md') return ['topology-component'];
      return [];
  }
}

function anchorFor(tree: GitTreeIndex, path: string): SourceAnchor {
  const entry = tree.entryAt(path);
  if (entry === undefined) return { kind: 'missing-at-revision' };
  if (entry.type === 'blob') return { kind: 'blob', mode: entry.mode, objectId: entry.objectId };
  return { kind: 'not-a-blob', mode: entry.mode, type: entry.type };
}

function isPillarKey(value: string): value is PillarKey {
  return (PILLAR_KEYS as readonly string[]).includes(value);
}

function pillarKeyForLabel(value: string): PillarKey | undefined {
  const unwrapped = value.trim().replace(/^\*\*(.*?)\*\*$/, '$1').replace(/^\[(.*?)\]\([^)]*\)$/, '$1');
  return PILLAR_KEYS.find((key) => PILLAR_LABELS[key] === unwrapped);
}

function pipeCells(line: string): readonly string[] {
  const cells = line.split('|').map((cell) => cell.trim());
  if (cells[0] === '') cells.shift();
  if (cells[cells.length - 1] === '') cells.pop();
  return cells;
}

// Butlers' root index owns a five-row table whose Directory column is the
// declaration of each pillar root. This closed parser reads only those rows;
// links elsewhere in the narrative remain non-recursive. Directory values are
// repository-relative code spans (not relative Markdown links), including the
// real Spec and Spine mapping to `openspec/`.
export function rootIndexPillarRoots(text: string): ReadonlyMap<PillarKey, readonly string[]> {
  const roots = new Map<PillarKey, string[]>();
  const lines = stripFences(text, false);
  for (let index = 0; index + 1 < lines.length; index += 1) {
    const headerLine = lines[index] as string;
    const delimiter = lines[index + 1] as string;
    if (!headerLine.trimStart().startsWith('|') || !/^\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)+\|?$/.test(delimiter.trim())) continue;
    const header = pipeCells(headerLine);
    const pillarColumn = header.indexOf('Pillar');
    const directoryColumn = header.indexOf('Directory');
    if (pillarColumn < 0 || directoryColumn < 0) continue;
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const row = lines[rowIndex] as string;
      if (!row.trimStart().startsWith('|')) break;
      const cells = pipeCells(row);
      if (cells.length !== header.length) continue;
      const key = pillarKeyForLabel(cells[pillarColumn] ?? '');
      const directory = /^`([^`]+\/)`$/.exec(cells[directoryColumn] ?? '')?.[1];
      const normalized = directory === undefined ? undefined : normalizeRepositoryPath(directory.slice(0, -1));
      if (key === undefined || normalized === undefined) continue;
      const known = roots.get(key);
      if (known === undefined) roots.set(key, [normalized]);
      else if (!known.includes(normalized)) known.push(normalized);
    }
    break;
  }
  return roots;
}

// ---------------------------------------------------------------------
// Canonical JSON and digest.

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

// Key-sorted JSON with `undefined` members dropped; the one canonical form
// every PWB sha256 identity (manifest, resource limits, observation) uses. Not the Polaris generation encoder: the two differ on purpose (docs/evidence/syzygy-bpyt-6-3/dc3-decode-and-canonical-json-2026-10-25.json).
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function canonicalManifestJson(manifest: Omit<ProjectShapeSourceManifest, 'digest'>): string {
  return canonicalJson(manifest);
}

function digestOf(manifest: Omit<ProjectShapeSourceManifest, 'digest'>): string {
  return `sha256:${sha256(canonicalManifestJson(manifest))}`;
}

// The registry's `project-shape-source-manifest` output identity:
// repository-id-plus-revision-plus-discovery-version-plus-sha256-content-digest.
export function manifestIdentity(manifest: ProjectShapeSourceManifest): string {
  return `${manifest.repositoryId}@${manifest.revision}/${manifest.discoveryVersion}/${manifest.digest}`;
}

// ---------------------------------------------------------------------
// Derivation.

const BASELINE_SPEC = /^openspec\/specs\/([^/]+)\/spec\.md$/;
const ROSTER_BUTLER = /^roster\/([^/]+)\/butler\.toml$/;

// Rule 1's reading of the root index: the home each pillar is declared at,
// by the `Pillar`/`Directory` table first and then by the index's own links
// whose target directory is named for a pillar; `ambiguous` when two
// different homes are declared for one key. Phase A admits a pillar index
// only at a home this function returns — the registry's "its declared
// pillar README indexes" — so the observer's allowlist and the manifest's
// Rule 2 share one derivation (syzygy-1z3.29: a name-based allowlist
// refused Butlers' Spec and Spine index at its declared home `openspec/`).
export function declaredPillarRoots(rootIndexText: string): ReadonlyMap<PillarKey, { readonly root: string; readonly ambiguous: boolean }> {
  const rootsByKey = new Map<PillarKey, { root: string; ambiguous: boolean }>();
  for (const [key, roots] of rootIndexPillarRoots(rootIndexText)) {
    rootsByKey.set(key, { root: roots[0] as string, ambiguous: roots.length > 1 });
  }
  for (const target of indexLinkTargets(rootIndexText)) {
    const resolved = resolveLink(PWB_ROOT_INDEX_PATH, target);
    if (resolved === undefined || resolved.kind === 'ignored') continue;
    const root = posixBasename(resolved.path) === 'README.md' ? posixDirname(resolved.path) : resolved.path;
    const key = posixBasename(root);
    if (!isPillarKey(key)) continue; // narrative link: does not recurse
    const known = rootsByKey.get(key);
    if (known === undefined) rootsByKey.set(key, { root, ambiguous: false });
    else if (known.root !== root) known.ambiguous = true;
  }
  return rootsByKey;
}

export function deriveProjectShapeManifest(input: DeriveManifestInput): DeriveManifestResult {
  if (input.repositoryId.trim() === '') return { kind: 'invalid-input', reason: 'repositoryId is empty' };
  if (input.revision.trim() === '') return { kind: 'invalid-input', reason: 'revision is empty' };
  const discoveryVersion = input.discoveryVersion ?? PWB_DISCOVERY_VERSION;
  if (discoveryVersion.trim() === '') return { kind: 'invalid-input', reason: 'discoveryVersion is empty' };

  const tree = indexGitTree(input.tree);
  const sources = new Map<string, ManifestSource>();
  const phaseAReads: string[] = [];
  const addSource = (source: ManifestSource): void => {
    if (!sources.has(source.path)) sources.set(source.path, source);
  };

  const readBlob = (path: string): SeedRead | { readonly kind: 'not-in-tree' } => {
    const anchor = anchorFor(tree, path);
    if (anchor.kind !== 'blob') return { kind: 'not-in-tree' };
    phaseAReads.push(path);
    return input.readSeed({ path, objectId: anchor.objectId });
  };

  // Rule 1 — the root index and the pillar roots it names.
  const rootAnchor = anchorFor(tree, PWB_ROOT_INDEX_PATH);
  addSource({ path: PWB_ROOT_INDEX_PATH, rule: 'root-index', extractionClasses: [], anchor: rootAnchor });
  const rootRead = readBlob(PWB_ROOT_INDEX_PATH);
  let rootIndex: ProjectShapeSourceManifest['rootIndex'];
  const rootsByKey = new Map<PillarKey, { root: string; ambiguous: boolean }>();
  if (rootRead.kind === 'not-in-tree') {
    rootIndex = { path: PWB_ROOT_INDEX_PATH, state: 'missing-at-revision', anchor: rootAnchor };
  } else if (rootRead.kind === 'unavailable') {
    rootIndex = { path: PWB_ROOT_INDEX_PATH, state: 'unavailable', reason: rootRead.reason, anchor: rootAnchor };
  } else {
    rootIndex = { path: PWB_ROOT_INDEX_PATH, state: 'read', anchor: rootAnchor };
    for (const [key, declared] of rootRead.pillarRoots ?? declaredPillarRoots(rootRead.text)) rootsByKey.set(key, { root: declared.root, ambiguous: declared.ambiguous });
  }

  // Rule 2 — each declared pillar's own README index, restricted to its root.
  const pillars: PillarDiscovery[] = PILLAR_KEYS.map((key) => {
    if (rootIndex.state === 'missing-at-revision') {
      return { key, state: 'unknown', reason: 'root-index-missing-at-revision', ignoredLinks: [] };
    }
    if (rootIndex.state === 'unavailable') return { key, state: 'unknown', reason: 'root-index-unavailable', ignoredLinks: [] };
    const named = rootsByKey.get(key);
    if (named === undefined) return { key, state: 'unknown', reason: 'not-named-in-root-index', ignoredLinks: [] };
    if (named.ambiguous) return { key, state: 'unknown', reason: 'named-root-ambiguous', ignoredLinks: [] };
    const root = named.root;
    if (!tree.hasDirectory(root)) return { key, state: 'unknown', reason: 'root-missing-at-revision', root, ignoredLinks: [] };
    const indexPath = `${root}/README.md`;
    const indexAnchor = anchorFor(tree, indexPath);
    if (indexAnchor.kind !== 'blob') {
      return { key, state: 'unknown', reason: 'index-missing-at-revision', root, indexPath, ignoredLinks: [] };
    }
    addSource({
      path: indexPath,
      rule: 'pillar-index',
      pillar: key,
      declaredBy: PWB_ROOT_INDEX_PATH,
      extractionClasses: extractionClassesFor('pillar-index', key, 'README.md'),
      anchor: indexAnchor,
    });
    const read = readBlob(indexPath);
    if (read.kind !== 'text') {
      const detail = read.kind === 'unavailable' ? read.reason : 'not in tree';
      return { key, state: 'unknown', reason: 'index-unavailable', detail, root, indexPath, ignoredLinks: [] };
    }
    const ignoredLinks: IgnoredLink[] = [];
    const namedPaths = new Set<string>();
    for (const target of indexLinkTargets(read.text)) {
      const resolved = resolveLink(indexPath, target);
      if (resolved === undefined) continue;
      if (resolved.kind === 'ignored') {
        ignoredLinks.push(resolved.link);
        continue;
      }
      if (resolved.path === indexPath) {
        ignoredLinks.push({ target, reason: 'self' });
        continue;
      }
      if (!resolved.path.startsWith(`${root}/`)) {
        ignoredLinks.push({ target, reason: 'outside-pillar-root' });
        continue;
      }
      if (resolved.directory || tree.hasDirectory(resolved.path)) {
        ignoredLinks.push({ target, reason: 'names-a-directory' });
        continue;
      }
      namedPaths.add(resolved.path);
    }
    for (const path of namedPaths) {
      // A baseline spec or roster file is owned by Rules 3 and 4 with their
      // classes (the spec: `baseline-spec` uses each baseline spec directory)
      // whoever names it; a pillar declared at `openspec/` or `roster/` would
      // otherwise register it first as a class-less named file, and the tree
      // rule's add would be silently discarded (review of syzygy-1z3.29).
      // Missing and non-blob targets stay named sources: tree rules cannot
      // restore them, and absence must not shrink the declared population.
      if (tree.entryAt(path)?.type === 'blob' && (BASELINE_SPEC.test(path) || ROSTER_BUTLER.test(path))) continue;
      addSource({
        path,
        rule: 'pillar-named-file',
        pillar: key,
        declaredBy: indexPath,
        extractionClasses: extractionClassesFor('pillar-named-file', key, path.slice(root.length + 1)),
        anchor: anchorFor(tree, path),
      });
    }
    return { key, state: 'discovered', root, indexPath, namedSources: namedPaths.size, ignoredLinks };
  });

  // Rules 3 and 4 — tree metadata only.
  for (const entry of input.tree) {
    if (entry.type !== 'blob') continue;
    if (BASELINE_SPEC.test(entry.path)) {
      addSource({ path: entry.path, rule: 'baseline-spec-tree', extractionClasses: ['baseline-spec'], anchor: anchorFor(tree, entry.path) });
      continue;
    }
    const roster = ROSTER_BUTLER.exec(entry.path);
    if (roster !== null) {
      addSource({ path: entry.path, rule: 'roster-tree', extractionClasses: ['roster-identity'], anchor: anchorFor(tree, entry.path) });
      const manifesto = `roster/${roster[1] ?? ''}/MANIFESTO.md`;
      if (tree.entryAt(manifesto)?.type === 'blob') {
        addSource({ path: manifesto, rule: 'roster-tree', extractionClasses: [], anchor: anchorFor(tree, manifesto) });
      }
    }
  }

  const body: Omit<ProjectShapeSourceManifest, 'digest'> = {
    repositoryId: input.repositoryId,
    revision: input.revision,
    discoveryVersion,
    indexDepth: PWB_INDEX_DEPTH,
    rootIndex,
    pillars,
    sources: [...sources.values()].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
    phaseAReads,
  };
  return { kind: 'manifest', manifest: deepFreeze({ ...body, digest: digestOf(body) }) };
}
