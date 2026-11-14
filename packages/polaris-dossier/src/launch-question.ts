import type { IdentitySource, RecordMatch } from './launch-identity.js';
import { LAUNCH_REF } from './launch-store.js';

/** The launch question's words and phrases (REQ-polaris-generation-046, lines 11 to 15), pure.
 *
 * "The phrase SHALL name the consent, the repository identity and the first twelve hexadecimal digits of the pinned revision." Each
 * record a launch may create has its own phrase, because each is its own owner act, separately revocable (line 21) and "preserving the
 * exact owner phrase" (line 17). The question states, before any answer is asked for, every item line 11 lists; for a repository the
 * operator does not declare public, and only where an effective policy admits it, the name-on-branch warning, which asks for no
 * confirmation and adds no answer, phrase or field. */

export const OWNER_ONLY = 'Only the owner may answer this question, in person, by typing; never an agent. Syzygy cannot observe who typed the answer: it records the operator\'s declaration that the owner answered in person, labelled Inferred. An answer an agent typed is not an owner act, and accepting it is a trust-floor violation (RFC3-16) that disclosure makes visible and does not cure.';
export const OWNER_ACTS = 'Each consent and statement is the owner\'s own act, recorded as its own launch consent record, and is revocable only by a later owner act naming it (RFC5-13).';
export const AGENT_READS = 'The agent sessions read the clone without restriction, whatever content classes the statement names: neither those classes nor the screening policies bind what the agent reads or sends.';
export const NOT_FETCHED = 'Syzygy made no network request to choose or verify the revision: the pinned revision is the one the operator\'s clone holds now, and whether it is the upstream\'s latest commit is Inferred.';
export const NO_EXECUTION = 'A launch consent is never an execution choice: this question asks for none and no record names one.';

const rev12 = (revision: string): string => revision.slice(0, 12);
export const observationPhrase = (identity: string, revision: string): string => `CONSENT TO OBSERVE ${identity} AT ${rev12(revision)}`;
export const drawerPhrase = (identity: string, revision: string): string => `STATE NO KERNEL EVIDENCE DRAWER FOR ${identity} AT ${rev12(revision)}`;
export const providerPhrase = (identity: string, revision: string, agentTool: string, provider: string): string =>
  `CONSENT TO AGENT PROVIDER ${provider} WITH ${agentTool} FOR ${identity} AT ${rev12(revision)}`;

export const IDENTITY_SOURCE_WORDS: Readonly<Record<IdentitySource, string>> = {
  'operator-option': 'given by the operator with --identity',
  'matching-records': 'taken from the matching records, which all carry it',
  derived: 'derived from the clone\'s remote URL by the identity rule',
};

export const PUBLIC_QUESTION = 'Is the repository public? Type "public", "not public", or press Enter to give no declaration: ';
export const DRAWER_QUESTION = 'Does a kernel evidence drawer exist for this repository? Type "none", "exists" or "unknown": ';

export const nameOnBranchWarning = (identity: string, url: string): string =>
  `Warning: a confirmed answer records the repository identity ${identity} and its normalised URL ${url} in the launch consent records, which Syzygy commits on ${LAUNCH_REF} in the observing project's own repository. Syzygy never pushes that reference; one push of it would publish them. This is a warning only: nothing here asks you to confirm it.`;

export const IDENTITY_RESIDUALS: readonly string[] = [
  '[Inferred] A clone re-identified under another URL, at a commit no record names and whose parents no record names, matches no earlier record, so the repository takes a second identity and a revoked or withdrawn record for it goes unnamed.',
  '[Inferred] A fork or mirror at a commit an upstream record names, or at a child of one, is proposed the upstream\'s identity and so relies on the upstream\'s drawer and provider statements unless the operator gives another identity.',
  '[Inferred] Two repositories whose normalised URLs share their last two path segments, on one host or on two (x/sub/name and y/sub/name, or github.com/a/b and gitlab.com/a/b), or differ only in characters the rule replaces by or joins with "-" (a-b/c and a/b-c), derive one identity and, absent another match, share its records: a record made for either matches the other by identity, so the question names it and how it matched, and a confirmed answer under that identity relies on its drawer and provider statements, while an observation consent, which names revisions, covers only the commits it names.',
  '[Inferred] Two repositories whose URLs differ only in a port, which normalisation drops, or only in letter case, which it lowercases, get one normalised URL and one identity, so each matches the other\'s records by URL as well as by identity and, absent another identity, relies on its drawer and provider statements.',
];

export interface QuestionFacts {
  readonly identity: string;
  readonly identitySource: IdentitySource;
  readonly url: string;
  readonly urlSource: string;
  readonly revision: string;
  readonly revisionVia: string;
  readonly committerDate: string | null;
  readonly updateCommand: string;
  /** Every launch consent record for the same identity, and every matching one, with its state and its act. */
  readonly existing: readonly { readonly recordId: string; readonly recordClass: string; readonly identity: string; readonly state: string; readonly commit: string }[];
  /** Records that match the run but do not carry the operator's identity option. */
  readonly notCarrying: readonly RecordMatch[];
  /** Observation consents made by other acts that match the run, each with how it matched (046, line 17). */
  readonly matchedElsewhere?: readonly RecordMatch[];
  /** Consents in force by another act that the run relies on. */
  readonly inForceElsewhere: readonly string[];
  readonly asks: { readonly observation: boolean; readonly drawer: boolean };
  /** The copy statements (046, line 11; stage: question asked; copy-class), or a no-copy run's form of them. */
  readonly copyStatements?: readonly string[];
}

/** The question's opening, printed before any answer is asked for. */
export function questionOpening(f: QuestionFacts): string {
  const lines = [
    'Syzygy launch consent (REQ-polaris-generation-046)',
    '',
    OWNER_ONLY,
    '',
    `Repository identity (proposed): ${f.identity} [Inferred], ${IDENTITY_SOURCE_WORDS[f.identitySource]}. The phrase you type declares it.`,
    `Normalised URL: ${f.url} [Inferred], from ${f.urlSource}; a locator hint, never the identity. The clone's configuration lies within the agent sessions' write reach.`,
    `Pinned revision: ${f.revision}, chosen by ${f.revisionVia}; committer date ${f.committerDate ?? 'not recorded in the commit'}.`,
    NOT_FETCHED,
    `To update the clone before a later run: ${f.updateCommand}`,
    '',
    ...(f.copyStatements === undefined ? [] : [...f.copyStatements, '']),
  ];
  if (f.asks.observation) {
    lines.push(
      `The observation consent covers that one revision only. It permits Syzygy to read and index the commit ${f.revision} and the tree and blob objects reachable from its root tree, and nothing else, held in the copy that REQ-polaris-generation-047 makes from the operator's own clone, with no network request by Syzygy, under the observing project's classification and screening policies.`,
      '',
    );
  }
  lines.push('Existing launch consent records for this repository:');
  const elsewhere = f.matchedElsewhere ?? [];
  if (f.existing.length === 0 && elsewhere.length === 0) lines.push('- none');
  for (const m of elsewhere) lines.push(`- ${m.record.recordId} (observation consent made by another act, ${m.record.identity}): ${m.record.state}; matches this run by ${m.by.join(' and ')}`);
  for (const r of f.existing) lines.push(`- ${r.recordId} (${r.recordClass}, ${r.identity}): ${r.state}; its act is the record itself, recorded by ${r.commit} on ${LAUNCH_REF}`);
  for (const m of f.notCarrying) lines.push(`- ${m.record.recordId} matches this run (by ${m.by.join(' and ')}) but carries the identity ${m.record.identity}, not ${f.identity}`);
  for (const e of f.inForceElsewhere) lines.push(`- in force by another act: ${e}`);
  lines.push('', ...IDENTITY_RESIDUALS, '', OWNER_ACTS, NO_EXECUTION, '');
  return lines.join('\n');
}

export interface StatementOffer {
  readonly agentTool: string;
  readonly provider: string;
  readonly classes: readonly string[];
  readonly supersedes: string | null;
}

export function statementText(s: StatementOffer): string {
  return [
    `The subject is governed, or its drawer status is unknown, so a brief needs a per-project statement (SEC-2) naming the agent provider ${s.provider} with the agent tool ${s.agentTool} and the content classes it may receive.`,
    `Content classes (a preview: the policy's classification as it would apply once the observation consent admits the repository): ${s.classes.length === 0 ? 'none' : s.classes.join(', ')}.`,
    ...(s.supersedes === null ? [] : [`This statement names the wider set and supersedes ${s.supersedes}, which becomes superseded by this recorded act.`]),
    AGENT_READS,
    'Press Enter instead of the phrase to decline the statement; the other confirmed records are still recorded and no brief is issued.',
    '',
  ].join('\n');
}
