import { isRecord, sha256 } from '@syzygy/support';

/** The public-source screening scope's `sourceVisibility` (policy version 8, variant `pv`), read as the other scope rules are: every text
 * this module implements is pinned by digest, so the screens implement one reading of one text and any other text refuses.
 *
 * A scope with no `sourceVisibility` (versions 1 to 7) admits public repositories only: `admitsPrivate` is false, and a repository that
 * is not public is not in `observedRepositories`. A version-8 scope admits both, under the stricter private rules its other texts state
 * (`privateSourceRules`): no fetch and no credential, whole-body exclusion on any detector match, an egress consent that names the pair
 * as private, and no object id or size of an excluded or withheld blob outside the run directory's check records and review packets.
 *
 * The carriers are closed by the pinned rule text itself: a launch consent record's public declaration, and the form of exactly the two
 * owner acts it names (`PUBLIC_BY_FORM_ACTS`). The list here is a pin compared with the rule (the rule's digest and each file's presence
 * in it), never a list that may grow: a further act states public only when a later policy version names it. */

const VISIBILITY_TEXTS = {
  rule: '711a354a18ccd9d11535a0c863df1476e35e3222899ac2ea2b6811c1ef8c4eea',
  privateSourceRules: 'd811d43797850343f99feb4b533b462ae4bbe51b468ff09e4eba21119b7ef6b8',
  unchanged: 'aba6543f4bee4b829d12b1800d65ed6f5287bd50fdd84ebdf9ea4183592383b0',
  agentSessions: '03e92169bfabfa2836d3193f711a415d57d3eab34aa8a3cbba171e29c1e3c4d0',
  consequence: '736dcc8867a30c1017ff5ba3c0a91f65b4020ec245463348ad6ac5142120c23b',
  consentRecordMetadata: 'ea60ad52e8817300c9a4800283a4237afccbe61cc1f3463844e78697c13c004c',
} as const;
const DECLARED_VISIBILITY_TEXTS = {
  rule: '63927dfe2369afeebbe79cd0f74acfb876febcad87f87fdde18c6cd9ffd8eade',
  privateSourceRules: 'c8137223612a5de18f625930e58326c3e4eef90e993cda360b458417eebafe7a',
  unchanged: '36f7a6826646cd19239956141833751c32660ab41b8c3b048d641f689aa585bd',
  agentSessions: '25be77db84eb54e9944dba3bb9ed488c385624b9e8ced6149867db821a62113d',
  consequence: '9b77a15373d15cfa6bbd14c01e4dca1cd6a2d098ba9b315f354527cf05b0f088',
  consentRecordMetadata: '4e7baf6e615604d2a6958f59af07e7c454ab9474deb5f2e90f36bdc0d9b1aa84',
} as const;
/** sha256 of the dossier declared-source policy 2.0.0's `unchanged`: the declared-source text with configurationDetectors named. */
const UNCHANGED_TWO_STAGE = 'c33ff41059f398812be0f2e226231111ca2cb38ce49dc0890a841c1da2bcafd8';
const VISIBILITY_KEYS = ['values', 'admitted', 'rule', 'privateSourceRules', 'unchanged', 'agentSessions', 'consequence', 'consentRecordMetadata'] as const;

/** The two owner-act records whose form states public (`sourceVisibility.rule`), by path. */
export const PUBLIC_BY_FORM_ACTS: readonly string[] = Object.freeze([
  '.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md',
  '.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md',
]);

export type SourceVisibility = 'public' | 'private';
export type SourceVisibilityRead =
  | { readonly ok: true; readonly declared: false; readonly admitsPrivate: false }
  | { readonly ok: true; readonly declared: true; readonly admitsPrivate: true }
  | { readonly ok: false; readonly why: string };

const exactly = (value: unknown, expected: readonly string[]): boolean =>
  Array.isArray(value) && value.length === expected.length && value.every((entry, i) => entry === expected[i]);

/** Reads sourceVisibility. Absent means public only. Present must match one complete pinned vocabulary: historical v8 or the
 * declared-source dossier successor. Mixing texts from the two versions refuses. */
export function readSourceVisibility(scope: unknown, twoStage = false): SourceVisibilityRead {
  const refuse = (why: string): SourceVisibilityRead => ({ ok: false, why: `its source visibility ${why}` });
  if (!isRecord(scope) || !Object.hasOwn(scope, 'sourceVisibility')) return { ok: true, declared: false, admitsPrivate: false };
  const sv = scope['sourceVisibility'];
  if (!isRecord(sv)) return refuse('is not an object');
  const keys = Object.keys(sv);
  if (!exactly(keys, VISIBILITY_KEYS)) return refuse(`carries the fields ${keys.join(', ')}, not exactly ${VISIBILITY_KEYS.join(', ')}`);
  if (!exactly(sv['values'], ['public', 'private'])) return refuse('values is not exactly public, private');
  if (!exactly(sv['admitted'], ['public', 'private'])) return refuse('admitted is not exactly public, private');
  // The dossier policy 2.0.0 (`twoStage`, read only by a screen that implements its classDecision) keeps the declared-source texts and
  // names configurationDetectors in `unchanged`; that text is read only there, and the predecessor's `unchanged` never is.
  const declared = typeof sv['rule'] === 'string' && sha256(sv['rule']) === DECLARED_VISIBILITY_TEXTS.rule;
  if (twoStage && !declared) return refuse('rule is not the declared-source text the two-stage class decision is read with');
  const texts = twoStage ? { ...DECLARED_VISIBILITY_TEXTS, unchanged: UNCHANGED_TWO_STAGE } : declared ? DECLARED_VISIBILITY_TEXTS : VISIBILITY_TEXTS;
  for (const key of Object.keys(VISIBILITY_TEXTS) as (keyof typeof VISIBILITY_TEXTS)[]) {
    const value = sv[key];
    if (typeof value !== 'string' || sha256(value) !== texts[key]) return refuse(`${key} is not the text this screen implements`);
  }
  const rule = sv['rule'] as string;
  if (texts === VISIBILITY_TEXTS && !PUBLIC_BY_FORM_ACTS.every(file => rule.includes(file))) return refuse('rule does not name the acts this screen reads as public by form');
  return { ok: true, declared: true, admitsPrivate: true };
}

/** What one effective observation consent record of a pair states through its carrier. */
export type VisibilityCarrier = 'public' | 'private' | 'states-nothing';

/** The pair's visibility at a commit: public only when there is at least one effective record and every one states public through its
 * carrier; otherwise private (`sourceVisibility.rule`). An unreadable record never reaches here: it refuses every read first. */
export const pairVisibility = (carriers: readonly VisibilityCarrier[]): SourceVisibility =>
  (carriers.length > 0 && carriers.every(carrier => carrier === 'public') ? 'public' : 'private');
