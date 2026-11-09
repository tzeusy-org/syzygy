import { ADMISSION_ACT_FORMS, DECISIONS_DIR, createPackageAdmissionReader, inForceRecords } from '@syzygy/polaris-generation-consent/live';
import { pairVisibility, PUBLIC_BY_FORM_ACTS, type SourceVisibility, type VisibilityCarrier } from '@syzygy/polaris-generation-core/live';
import { readLaunchRecords, type StoreRead } from './launch-store.js';

/** A pair's visibility at a commit (public-source screening scope version 8, `sourceVisibility.rule`), from every effective observation
 * consent record of the pair, read through the only carriers the rule names:
 *
 * - a launch consent record (REQ-polaris-generation-046) states public only when its public declaration is the affirmative answer
 *   (`public`); `not-public` states private and `not-given` states nothing;
 * - a record made by one of the two owner acts the rule names (`PUBLIC_BY_FORM_ACTS`) states public by that act's form. The admission
 *   reader reads exactly the `consent-observation` forms of `ADMISSION_ACT_FORMS`; their files must be exactly those two, or this read
 *   refuses, so a form added to that list never states public without a policy that names it.
 *
 * The pair is public only when at least one effective record exists and every one states public; otherwise private. Any record that
 * cannot be read refuses every read, naming it: a launch reference the store reader refuses (a file of unreadable kind, a malformed
 * record, a change other than an addition), or an act record the admission reader refuses. The pair is `repository:<id>` and its
 * records are those of that identity, whatever their revision: a fork's record stating private makes the whole pair private.
 *
 * The visibility is the operator's or owner's declaration, labelled Inferred wherever it is shown; nothing here makes a network request. */

export type VisibilityDecision =
  | { readonly ok: true; readonly visibility: SourceVisibility; readonly carriers: readonly { readonly record: string; readonly carrier: VisibilityCarrier }[] }
  | { readonly ok: false; readonly why: string };

export interface VisibilityReadOptions {
  readonly root: string;
  readonly now: number;
  /** The launch store reader, for a test; the governance home is `root`. */
  readonly readStore?: (home: string) => StoreRead;
  /** The act-form observation records of the pair, for a test: by record id. */
  readonly actRecords?: (repositoryId: string) => Promise<readonly string[]>;
}

const formFiles = ADMISSION_ACT_FORMS.filter(form => form.type === 'consent-observation').map(form => `${DECISIONS_DIR}/${form.file}`).sort();
/** Whether the admission reader's observation forms are exactly the acts the policy names as public by form. */
export const ACT_FORMS_MATCH_POLICY = formFiles.length === PUBLIC_BY_FORM_ACTS.length && [...PUBLIC_BY_FORM_ACTS].sort().every((file, i) => file === formFiles[i]);

async function actFormRecords(root: string, now: number, repositoryId: string): Promise<readonly string[]> {
  const records = await createPackageAdmissionReader({ root }).read();
  return inForceRecords(records, now).filter(r => r.class === 'observation' && r.repositoryId === repositoryId).map(r => `${r.recordId}@${r.version}`);
}

export async function pairVisibilityAt(subject: { readonly repository: string; readonly commit: string }, options: VisibilityReadOptions): Promise<VisibilityDecision> {
  if (!subject.repository.startsWith('repository:')) return { ok: false, why: `the subject ${subject.repository} is not a repository pair` };
  if (!ACT_FORMS_MATCH_POLICY) return { ok: false, why: 'the observation act forms the reader reads are not exactly the acts the policy names as public by form' };
  const repositoryId = subject.repository.slice('repository:'.length);
  const store = (options.readStore ?? readLaunchRecords)(options.root);
  if (!store.ok) return { ok: false, why: `a launch consent record cannot be read, so it could be a record of any pair and every read is refused until it is read or revoked: ${store.why}` };
  let acts: readonly string[];
  try { acts = await (options.actRecords ?? (id => actFormRecords(options.root, options.now, id)))(repositoryId); } catch (cause) {
    return { ok: false, why: `an observation consent act record cannot be read, so every read is refused: ${cause instanceof Error ? cause.message : 'unreadable'}` };
  }
  const launched = store.records.filter(r => r.state === 'active' && r.record.recordClass === 'observation-consent' && r.record.identity === subject.repository
    && Date.parse(r.record.grantInstant) <= options.now);
  const carriers = [
    ...acts.map(record => ({ record, carrier: 'public' as const })),
    ...launched.map(r => ({ record: r.record.recordId, carrier: (r.record.publicDeclaration === 'public' ? 'public' : r.record.publicDeclaration === 'not-public' ? 'private' : 'states-nothing') as VisibilityCarrier })),
  ];
  return { ok: true, visibility: pairVisibility(carriers.map(c => c.carrier)), carriers };
}
