import { copyEndStatement, copyKeptStatement, type CopyEnd } from './launch-copy.js';

/** The statements REQ-polaris-generation-046 and 047 add to the launch output, the run record and every page, under 047's stage rule.
 *
 * "Every statement this change requires of the question, the launch output, the run record or a page about the named identifier, the copy,
 * the agent sessions, the pinned commit or the question names the stage it needs and the run class that requires it, copy-class, no-copy or
 * both, and SHALL be made only for a run of that class that reached that stage. For each such stage the run did not reach, the run SHALL
 * state, as what Syzygy did, that it was not reached ... it SHALL NOT state the thing itself. A run of the class a statement does not name
 * makes, in its place, the form that statement gives for that class, and a no-copy run's form of every copy statement is that no copy was
 * made." Each statement carries its stage, its run class, whether the stage was reached, and its label; the text is the human form and the
 * whole object the machine form. Pure: every input is what the launch observed. */

export type LaunchStageName = 'identifier named' | 'copy step started' | 'commit pinned' | 'question asked' | 'brief or packet delivered';
export type StatementClass = 'copy-class' | 'no-copy' | 'both';
export type RunClass = 'copy-class' | 'no-copy';

export interface LaunchStatement {
  readonly id: string;
  /** The stage the statement needs, or null for a statement the stage rule does not govern. */
  readonly stage: LaunchStageName | null;
  readonly runClass: StatementClass | null;
  /** Whether the run reached the stage; false: the statement says it was not reached and states nothing of the thing itself. */
  readonly reached: boolean;
  readonly label: 'Inferred';
  readonly text: string;
}

/** How far a copy-class run's copy step went. */
export type CopyProgress =
  | { readonly reached: 'not-started' }
  /** The copy's directory was made, and the step ended before Syzygy started the fetch process. */
  | { readonly reached: 'before-fetch'; readonly location: string }
  /** The fetch process Syzygy started failed, as Git reported. */
  | { readonly reached: 'fetch-failed'; readonly location: string; readonly report: string }
  /** The fetch succeeded and the step ended before the copy passed its form check, at `where`. */
  | { readonly reached: 'fetched'; readonly location: string; readonly where: string }
  /** The copy passed its form check. */
  | { readonly reached: 'formed'; readonly location: string };

export interface LaunchState {
  /** Null where the run ended before its class was decided (no identifier named). */
  readonly runClass: RunClass | null;
  readonly named: {
    readonly commit: string;
    readonly via: string;
    readonly updateCommand: string;
    /** A local branch of the remote default's name pointing elsewhere (047): both identifiers are stated. */
    readonly localElsewhere: { readonly ref: string; readonly commit: string } | null;
  } | null;
  /** A copy-class run's copy step; null for a no-copy run or a run whose class was not decided. */
  readonly copy: CopyProgress | null;
  /** How the copy ended: kept (a run that completes), or removed or not removed (a run that ends before its brief). */
  readonly copyEnd: 'kept' | CopyEnd | null;
  /** The pinned commit, and its committer date as the commit object records it; `unread` where the commit was pinned but its object was not
   * read (a copy that failed its form check is not read). */
  readonly pinned: { readonly commit: string; readonly committerDate: string | null | 'unread' } | null;
  readonly questionAsked: boolean;
  /** A copy-class run that relies on a launch observation consent whose recorded scope holds the revision in the operator's own clone with no
   * fetch by Syzygy (the version 1.1 scope) and on no consent of another kind. */
  readonly beyondConsent: boolean;
}

const statement = (id: string, stage: LaunchStageName | null, runClass: StatementClass | null, reached: boolean, text: string): LaunchStatement =>
  ({ id, stage, runClass, reached, label: 'Inferred', text });

/** How the copy was made and what Git and Syzygy read of the operator's clone to make it, as the question states them (046, line 11). */
export const COPY_METHOD = 'The run\'s clone is a copy of the pinned commit alone, which Syzygy made from the operator\'s clone with Git over the local file transport and no network request. To make it, Git read the operator\'s clone\'s configuration, references and object store, the stored bytes of delta bases outside the pinned commit\'s objects included. Syzygy used nothing Git read but the copy it produced, and itself read of the operator\'s clone only the references, remote names and URLs and other files REQ-polaris-generation-047 lists.';

/** 047: "Syzygy relies on Git starting no program that the operator's clone's own configuration or hooks name while it serves the copy." */
export const COPY_RELIANCE = 'For every Git process the copy step started, Syzygy relies on Git starting no program that the operator\'s clone\'s own configuration or hooks name while it serves the copy.';

/** The question's copy statements (046, line 11; stage: question asked; copy-class), before the answer is asked for. */
export function questionCopyStatements(location: string): readonly string[] {
  return [
    COPY_METHOD,
    'The authoring and inventory sessions are directed, by their briefs, to work in the copy, while the operator\'s clone stays on the host; that a session stayed in the copy is its own report.',
    `The copy, its checked-out files included, was made at ${location} before your answer, and Syzygy has read none of its blobs. It is removed if the run ends before its brief, or named with the removal's failure where its removal fails, and is otherwise kept after the run, at a location the launch output names, until the operator removes it.`,
  ];
}

/** The statements of every stage up to the question, for the launch output and the run record. */
export function stageStatements(s: LaunchState): readonly LaunchStatement[] {
  const out: LaunchStatement[] = [];
  if (s.named === null) out.push(statement('named-identifier', 'identifier named', 'both', false, 'No identifier was named.'));
  else {
    out.push(statement('named-identifier', 'identifier named', 'both', true,
      `The named identifier is ${s.named.commit}, from ${s.named.via}. Syzygy made no network request to choose or verify it; whether it is the upstream's latest commit is Inferred. To update the clone before a later run: ${s.named.updateCommand}`));
    if (s.named.localElsewhere !== null) {
      out.push(statement('local-not-trunk', 'identifier named', 'both', true,
        `The local branch ${s.named.localElsewhere.ref} points to ${s.named.localElsewhere.commit}, not to the trunk default ${s.named.commit}: a local commit is not the trunk default, and no local branch is consulted while a remote default is recorded.`));
    }
  }

  out.push(...copyStatements(s));

  if (s.pinned === null) out.push(statement('pinned-commit', 'commit pinned', 'both', false, 'The commit was not pinned, and its committer date is Unknown.'));
  else if (s.pinned.committerDate === 'unread') {
    out.push(statement('pinned-commit', 'commit pinned', 'both', true,
      `The pinned revision is ${s.pinned.commit}: the copy's detached checkout left the copy's HEAD there. Its committer date is Unknown: the copy did not pass its form check, so Syzygy read none of its objects.`));
  } else {
    out.push(statement('pinned-commit', 'commit pinned', 'both', true,
      `The pinned revision is ${s.pinned.commit}; its committer date, as the commit object records it, is ${s.pinned.committerDate ?? 'Unknown: the commit records none Syzygy could read'}.`));
  }

  out.push(s.questionAsked
    ? statement('question', 'question asked', 'both', true, 'A question was asked at the terminal.')
    : statement('question', 'question asked', 'both', false, 'No question was asked.'));
  return out;
}

function copyStatements(s: LaunchState): readonly LaunchStatement[] {
  const STAGE = 'copy step started' as const;
  if (s.runClass !== 'copy-class') {
    return [statement('copy', STAGE, s.runClass === 'no-copy' ? 'no-copy' : null, false,
      s.runClass === 'no-copy' ? 'No copy was made: this is a no-copy run, whose clone is the operator\'s own.' : 'No copy was made: the run ended before its class was decided.')];
  }
  const copy = s.copy ?? { reached: 'not-started' as const };
  if (copy.reached === 'not-started') return [statement('copy', STAGE, 'copy-class', false, 'No copy was made: the copy step did not start.')];
  const out: LaunchStatement[] = [];
  if (copy.reached === 'formed') out.push(statement('copy', STAGE, 'copy-class', true, COPY_METHOD));
  else if (copy.reached === 'before-fetch') {
    out.push(statement('copy', STAGE, 'copy-class', true, `The copy step started at ${copy.location} and ended there, before Syzygy started the fetch process: Git read nothing of the operator's clone.`));
  } else if (copy.reached === 'fetch-failed') {
    out.push(statement('copy', STAGE, 'copy-class', true,
      `The copy step used the method a copy is made by: a local fetch of the pinned commit alone from the operator's clone over Git's local file transport, with no network request. A fetch was started and failed, as Git reported: ${copy.report}. The copy had not passed its form check.`));
  } else {
    out.push(statement('copy', STAGE, 'copy-class', true,
      `The copy step used the method a copy is made by: a local fetch of the pinned commit alone from the operator's clone over Git's local file transport, with no network request. It ended ${copy.where}; the copy had not passed its form check.`));
  }
  const end = s.copyEnd;
  out.push(statement('copy-location', STAGE, 'copy-class', true,
    end === 'kept' || end === null ? copyKeptStatement(copy.location) : copyEndStatement(end)));
  out.push(statement('copy-reliance', STAGE, 'copy-class', true, COPY_RELIANCE));
  if (s.beyondConsent) {
    out.push(statement('copy-beyond-consent', STAGE, 'copy-class', true,
      copy.reached === 'before-fetch'
        ? 'The launch observation consent this run relies on records its scope in the operator\'s own clone with no fetch by Syzygy; the copy step ended before Syzygy started the fetch process, so no fetch was made.'
        : copy.reached === 'fetch-failed'
          ? `The launch observation consent this run relies on records its scope in the operator's own clone with no fetch by Syzygy; a fetch was started and failed, as Git reported: ${copy.report}.`
          : 'The copy goes beyond the launch observation consent\'s "no fetch by Syzygy" wording: that consent records its scope in the operator\'s own clone, and Syzygy fetched the pinned commit from that clone into the copy over the local file transport. The consent is otherwise relied on as it was recorded.'));
  }
  return out;
}

/** The brief-or-packet stage's statement (047; 046, line 37), from what the run directory holds: which briefs Syzygy issued. */
export function briefStageStatement(runClass: RunClass, issued: { readonly authoring: boolean; readonly inventory: boolean }): LaunchStatement {
  const STAGE = 'brief or packet delivered' as const;
  if (!issued.authoring && !issued.inventory) return statement('briefs', STAGE, 'both', false, 'Syzygy issued no brief and delivered no packet.');
  const which = [issued.authoring ? 'the authoring brief' : null, issued.inventory ? 'the inventory brief' : null].filter((w): w is string => w !== null).join(' and ');
  return runClass === 'copy-class'
    ? statement('briefs', STAGE, 'copy-class', true, `Each brief Syzygy issued (${which}) directed its session to work in the copy and not to read the operator's clone. Whether a session stayed in the copy is its own report [Inferred].`)
    : statement('briefs', STAGE, 'no-copy', true, `The run's clone, where the agent sessions are to work, is the operator's clone; whether a session worked there is its own report [Inferred]. No copy was made.`);
}
