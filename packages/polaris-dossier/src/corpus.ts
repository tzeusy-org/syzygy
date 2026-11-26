import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';

/** The dossier corpus (pursuit 2026-11-21b R16 slice 1, syzygy-5dhm.74): a versioned list of repositories, each pinned to a commit and
 * placed in the strata it fills, with the mechanism-version definition, the pass budget and the generality pass rule, all written before
 * any corpus pass. The data is `docs/polaris-generation/dossier-corpus-v1.json`; this module only reads it. Pure: it reads no file and
 * starts no process; the mechanism version takes a port that lists and reads the tree.
 *
 * Goalposts: `seal.sha256` is the SHA-256 of the canonical JSON (`encodeCanonicalJson`, sorted keys) of the sealed members. A pass
 * record names the corpus version and the seal it ran under, so a rule edited after a pass started cannot judge that pass, and the
 * corpus test holds the seal as a literal, so an edit to a sealed member fails a check until a new corpus version is written. */

export const CORPUS_FORMAT = 'polaris-dossier-corpus/1';
export const MECHANISM_FORMAT = 'polaris-dossier-mechanism/1';
export const TIERS = ['XS', 'S', 'M', 'L', 'XL'] as const;
export type Tier = (typeof TIERS)[number];
/** As the host reports it: a synthetic fixture has no host. */
export const VISIBILITIES = ['public', 'private', 'synthetic'] as const;
/** Strata the corpus must hold at least once each (R16's What: a large monorepo, an infrastructure-only repository, a data- or
 * documentation-only one, one whose documentation is not in English, one with no README or documentation root, a synthetic
 * private-visibility fixture, the owner's own repositories (the owned-repositories list, whatever their visibility); and the repository the cost baseline was measured on). */
export const REQUIRED_STRATA = [
  'cost-baseline-anchor', 'large-monorepo', 'infrastructure-only', 'data-or-documentation-only', 'non-english-documentation',
  'no-readme-or-docs-root', 'synthetic-private-visibility', 'owner-owned',
] as const;
export const MIN_SHAPES = 6;
/** The members a seal covers, in this order. */
export const SEALED_MEMBERS = ['entries', 'tiers', 'mechanismVersion', 'passBudget', 'passRule'] as const;

export interface CorpusSurvey {
  /** Blob entries of the pinned tree (modes 100644, 100755, 120000). */
  readonly files: number;
  /** Their summed sizes, as the tree listing gives them. */
  readonly bytes: number;
  /** Whether rule `server-entry` v1 holds over the listing (the trait that selects the server shape pack). */
  readonly serverEntry: boolean;
  readonly docsTree: boolean;
  /** Whether a blob at the root is named README, with or without an extension, in any case. */
  readonly rootReadme: boolean;
  readonly packages: 'no-package-manifest' | 'single-package' | 'workspace';
}
export interface CorpusEntry {
  readonly id: string;
  readonly repository: string;
  readonly visibility: (typeof VISIBILITIES)[number];
  readonly commit: string;
  readonly licence: string;
  readonly shape: string;
  readonly strata: readonly string[];
  readonly tier: Tier;
  readonly survey: CorpusSurvey | null;
}
export interface MechanismMember { readonly group: string; readonly path: string }
export interface Corpus {
  readonly format: typeof CORPUS_FORMAT;
  readonly version: number;
  readonly entries: readonly CorpusEntry[];
  /** Upper bounds, exclusive, in listed blob bytes: a tree below `XS` is XS, and so on; at or above `L` is XL. */
  readonly tiers: { readonly XS: number; readonly S: number; readonly M: number; readonly L: number };
  readonly mechanismVersion: { readonly format: typeof MECHANISM_FORMAT; readonly members: readonly MechanismMember[]; readonly excludeSuffixes: readonly string[] };
  readonly passBudget: Readonly<Record<string, unknown>>;
  readonly passRule: Readonly<Record<string, unknown>>;
  readonly seal: { readonly covers: readonly string[]; readonly sha256: string };
}

const HEX40 = /^[0-9a-f]{40}$/u;
const ENTRY_ID = /^C[0-9]{2}$/u;
const GITHUB = /^https:\/\/github\.com\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/u;
const SYNTHETIC = /^synthetic:[a-z][a-z0-9-]*$/u;
/** A member path: repository-relative segments, with at most one `*` and only in the last segment. */
const MEMBER_PATH = /^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]*\*?[A-Za-z0-9._-]*$/u;
const PACKAGES = ['no-package-manifest', 'single-package', 'workspace'];
const SEAL_LIMITS = { maxBytes: 1024 * 1024, maxNodes: 100_000, maxDepth: 16 };

export const tierOf = (bytes: number, tiers: Corpus['tiers']): Tier =>
  bytes < tiers.XS ? 'XS' : bytes < tiers.S ? 'S' : bytes < tiers.M ? 'M' : bytes < tiers.L ? 'L' : 'XL';

/** The SHA-256 of the canonical JSON of the sealed members. */
export const corpusSeal = (corpus: Pick<Corpus, (typeof SEALED_MEMBERS)[number]>): string =>
  sha256(encodeCanonicalJson(Object.fromEntries(SEALED_MEMBERS.map((member) => [member, corpus[member]])), SEAL_LIMITS));

const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function surveyRefusal(value: unknown): string | undefined {
  if (!isRecord(value)) return 'is not an object';
  if (!isCount(value['files']) || !isCount(value['bytes'])) return 'needs files and bytes as non-negative integers';
  for (const key of ['serverEntry', 'docsTree', 'rootReadme']) if (typeof value[key] !== 'boolean') return `needs ${key} as a boolean`;
  if (!PACKAGES.includes(value['packages'] as string)) return `needs packages as one of ${PACKAGES.join(', ')}`;
  return undefined;
}

/** Every reason the parsed document is not a corpus of this format, in a fixed order; empty when it is one. */
export function corpusRefusals(value: unknown): string[] {
  const out: string[] = [];
  if (!isRecord(value)) return ['the corpus is a JSON object'];
  if (value['format'] !== CORPUS_FORMAT) out.push(`format is ${CORPUS_FORMAT}`);
  if (!isCount(value['version']) || value['version'] < 1) out.push('version is a positive integer');
  const tiers = value['tiers'];
  const tiersOk = isRecord(tiers) && TIERS.slice(0, 4).every((tier) => isCount(tiers[tier]) && (tiers[tier] as number) > 0)
    && (tiers['XS'] as number) < (tiers['S'] as number) && (tiers['S'] as number) < (tiers['M'] as number) && (tiers['M'] as number) < (tiers['L'] as number);
  if (!tiersOk) out.push('tiers holds increasing positive byte bounds XS, S, M and L');
  const entries = value['entries'];
  if (!Array.isArray(entries)) return [...out, 'entries is a list'];
  const ids = new Set<string>(), shapes = new Set<string>(), held = new Set<string>(), tiersHeld = new Set<string>(), serverEntry = new Set<boolean>();
  entries.forEach((entry: unknown, index) => {
    const at = `entry ${index + 1}`;
    if (!isRecord(entry)) { out.push(`${at} is an object`); return; }
    const id = entry['id'];
    if (typeof id !== 'string' || !ENTRY_ID.test(id)) out.push(`${at}: id is C and two digits`);
    else if (ids.has(id)) out.push(`${at}: id ${id} is already used`);
    else ids.add(id);
    const visibility = entry['visibility'];
    if (!(VISIBILITIES as readonly unknown[]).includes(visibility)) out.push(`${at}: visibility is one of ${VISIBILITIES.join(', ')}`);
    const repository = entry['repository'];
    const repositoryOk = typeof repository === 'string' && (visibility === 'synthetic' ? SYNTHETIC.test(repository) : GITHUB.test(repository));
    if (!repositoryOk) out.push(`${at}: repository is a GitHub URL, or synthetic:<name> for a synthetic fixture`);
    if (typeof entry['commit'] !== 'string' || !HEX40.test(entry['commit'])) out.push(`${at}: commit is 40 lower-case hex digits`);
    if (typeof entry['licence'] !== 'string' || entry['licence'].length === 0) out.push(`${at}: licence is named`);
    const shape = entry['shape'];
    if (typeof shape !== 'string' || shape.length === 0) out.push(`${at}: shape is named`);
    else if (shapes.has(shape)) out.push(`${at}: shape ${shape} is already held by another entry`);
    else shapes.add(shape);
    const strata = entry['strata'];
    if (!Array.isArray(strata) || !strata.every((stratum) => typeof stratum === 'string')) out.push(`${at}: strata is a list of names`);
    else for (const stratum of strata) held.add(stratum as string);
    const tier = entry['tier'];
    if (!(TIERS as readonly unknown[]).includes(tier)) out.push(`${at}: tier is one of ${TIERS.join(', ')}`);
    const survey = entry['survey'];
    if (survey === null) {
      if (visibility !== 'synthetic') out.push(`${at}: only a synthetic fixture has no survey`);
    } else {
      const why = surveyRefusal(survey);
      if (why !== undefined) out.push(`${at}: survey ${why}`);
      else {
        const record = survey as unknown as CorpusSurvey;
        serverEntry.add(record.serverEntry);
        if (tiersOk && tier !== tierOf(record.bytes, tiers as unknown as Corpus['tiers'])) out.push(`${at}: tier ${String(tier)} is not the tier of ${record.bytes} bytes`);
        else tiersHeld.add(tier as string);
      }
    }
  });
  if (shapes.size < MIN_SHAPES) out.push(`the corpus names at least ${MIN_SHAPES} shapes, not ${shapes.size}`);
  for (const stratum of REQUIRED_STRATA) if (!held.has(stratum)) out.push(`no entry holds the stratum ${stratum}`);
  for (const tier of TIERS) if (!tiersHeld.has(tier)) out.push(`no surveyed entry is of tier ${tier}`);
  // The trait check is hard-coded to the one trait that selects a shape pack today (server-entry); a corpus v2 should read the
  // traits from the shape packs' own selectors, so a new pack's trait is required without editing this function.
  if (!serverEntry.has(true)) out.push('no surveyed entry holds the server-entry trait (the server shape pack)');
  if (!serverEntry.has(false)) out.push('no surveyed entry lacks the server-entry trait (the default shape pack alone)');
  const mechanism = value['mechanismVersion'];
  if (!isRecord(mechanism) || mechanism['format'] !== MECHANISM_FORMAT || !Array.isArray(mechanism['members']) || mechanism['members'].length === 0
    || !Array.isArray(mechanism['excludeSuffixes']) || !mechanism['excludeSuffixes'].every((suffix) => typeof suffix === 'string' && suffix.length > 0)) {
    out.push(`mechanismVersion has format ${MECHANISM_FORMAT}, a non-empty members list and excludeSuffixes`);
  } else {
    const paths = new Set<string>();
    mechanism['members'].forEach((member: unknown, index) => {
      const ok = isRecord(member) && typeof member['group'] === 'string' && member['group'].length > 0 && typeof member['path'] === 'string'
        && MEMBER_PATH.test(member['path']) && (member['path'].match(/\*/gu) ?? []).length <= 1 && !paths.has(member['path']);
      if (!ok) out.push(`mechanismVersion member ${index + 1} is a group and a distinct path with at most one * in its last segment`);
      else paths.add(member['path'] as string);
    });
  }
  for (const member of ['passBudget', 'passRule']) if (!isRecord(value[member])) out.push(`${member} is an object`);
  const seal = value['seal'];
  if (!isRecord(seal) || !Array.isArray(seal['covers']) || seal['covers'].join(',') !== SEALED_MEMBERS.join(',') || typeof seal['sha256'] !== 'string') {
    out.push(`seal covers ${SEALED_MEMBERS.join(', ')} and names a sha256`);
  } else if (out.length === 0 && seal['sha256'] !== corpusSeal(value as unknown as Corpus)) {
    out.push('seal.sha256 is not the digest of the sealed members: a sealed member was edited, which needs a new corpus version');
  }
  return out;
}

/** What the mechanism version reads: the names in one directory, and one file's bytes. */
export interface MechanismTree {
  readonly list: (directory: string) => readonly string[];
  readonly read: (path: string) => Uint8Array;
}
export type MechanismVersion =
  | { readonly ok: true; readonly digest: string; readonly files: readonly { readonly group: string; readonly path: string; readonly sha256: string }[] }
  | { readonly ok: false; readonly reason: string };

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The mechanism version: the SHA-256 of the format line and one `<sha256>  <path>` line per member file, sorted by path. A member with
 * a `*` names every file in its directory whose name matches, less any ending in an excluded suffix; a member that names no file
 * refuses, so a renamed module cannot drop out of the digest unseen. */
export function mechanismVersion(definition: Corpus['mechanismVersion'], tree: MechanismTree): MechanismVersion {
  const files = new Map<string, string>();
  for (const member of definition.members) {
    const slash = member.path.lastIndexOf('/');
    const directory = slash < 0 ? '' : member.path.slice(0, slash);
    const name = member.path.slice(slash + 1);
    let matched: string[];
    if (name.includes('*')) {
      const [head, tail] = name.split('*') as [string, string];
      matched = tree.list(directory)
        .filter((entry) => entry.length >= head.length + tail.length && entry.startsWith(head) && entry.endsWith(tail))
        .filter((entry) => !definition.excludeSuffixes.some((suffix) => entry.endsWith(suffix)))
        .map((entry) => (directory === '' ? entry : `${directory}/${entry}`));
    } else {
      matched = tree.list(directory).includes(name) ? [member.path] : [];
    }
    if (matched.length === 0) return { ok: false, reason: `mechanism member ${member.path} names no file` };
    for (const path of matched) if (!files.has(path)) files.set(path, member.group);
  }
  const listed = [...files.keys()].sort(byCodeUnit).map((path) => ({ group: files.get(path)!, path, sha256: sha256(tree.read(path)) }));
  const text = `${MECHANISM_FORMAT}\n${listed.map((file) => `${file.sha256}  ${file.path}\n`).join('')}`;
  return { ok: true, digest: sha256(text), files: listed };
}
