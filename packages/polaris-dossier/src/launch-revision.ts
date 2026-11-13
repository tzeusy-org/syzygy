import { defaultRemoteOf, resolveRef, revisionRefCandidates, type CloneSnapshot } from './launch-clone.js';

/** The revision a launch pins (REQ-polaris-generation-047), decided from the clone's references alone, with no network request.
 *
 * "a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that
 * consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states" (047, line 182):
 * `headConsented` says so, and the answer is `head-consented`, which changes nothing else for the run. Otherwise exactly one revision is
 * pinned before any question: absent `--revision`, "the branch the clone records as its remote's default (the remote's `HEAD`
 * reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch"; none of them refuses,
 * naming `--revision`. With `--revision`, "a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved
 * once to a full object identifier; a name that resolves to no object identifier, or to more than one, SHALL be refused. An abbreviated
 * identifier resolves to more than one when more than one object identifier the operator's clone names in its loose object file names and
 * pack indexes begins with it." The store is listed "for an abbreviated `--revision` alone, … at the width of the object format its
 * configuration records (`extensions.objectFormat`, SHA-1 where it records none)" (read (5)): a name of exactly that width is a full
 * identifier and names itself, with no listing, and a name of 4 or more hexadecimal digits short of it is an abbreviation; a 40-digit name
 * in a SHA-256 clone is therefore an abbreviation. Whether a full identifier names an object the clone holds is not asked here: "a mismatch
 * failing closed in the copy's fetch or, in a no-copy run, in REQ-polaris-generation-033's object read".
 *
 * Which remote's default is read: `origin`'s when it records one, else the one remote that records one. Where several remotes record a
 * default and none is `origin`, the clone records no single remote default; that case is refused naming `--revision`, never resolved by
 * a precedence the clause does not state [Inferred: the clause names "its remote's default" in the singular]. Then "Where the clone's
 * HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the
 * pinned revision" (047, line 186). Syzygy never changes the checkout. */

export interface RevisionPorts {
  /** Every object identifier the clone's store names, for an abbreviation alone (the object reader's store listing, at the width of the
   * snapshot's object format; no object read). */
  readonly storedIds: () => Promise<ReadonlySet<string>>;
  /** Whether `oid` is a commit in the clone's store, re-hashed. */
  readonly isCommit: (oid: string) => Promise<boolean>;
}

export type PinnedRevision =
  | { readonly kind: 'head-consented'; readonly commit: string }
  | { readonly kind: 'pinned'; readonly commit: string; readonly via: string; readonly remote: string | null };

export type RevisionRefusal = { readonly stage: 'revision' | 'head'; readonly reason: string; readonly command?: string };
export type RevisionResult = { readonly ok: true; readonly pinned: PinnedRevision } | { readonly ok: false; readonly refusal: RevisionRefusal };

const HEX = /^[0-9a-f]+$/;
/** The fewest hexadecimal digits Git takes as an abbreviated object identifier. */
const MIN_ABBREVIATION = 4;
/** The identifier width of each object format; another format has none, and no name is then read as an identifier. */
const WIDTH: Readonly<Record<string, number>> = { sha1: 40, sha256: 64 };
const quote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export const checkoutCommand = (clone: string, commit: string): string => `git -C ${quote(clone)} checkout --detach ${commit}`;

/** The remote whose `HEAD` reference the trunk rule reads, or why there is none to read. */
export const defaultRemote = (snapshot: CloneSnapshot) => defaultRemoteOf(snapshot.refs);

/** The candidates a `--revision` name resolves to: the first reference of Git's short-name rules the clone holds, then, for a hexadecimal
 * name, itself where it is a full identifier, or the store's identifiers it begins where it is an abbreviation. `unread` names a
 * symbolic reference whose target's value is not among the reads the closed list admits. */
async function resolveName(snapshot: CloneSnapshot, name: string, ports: RevisionPorts): Promise<{ readonly found: ReadonlySet<string>; readonly unread?: { readonly ref: string; readonly target: string } }> {
  const out = new Set<string>();
  let unread: { readonly ref: string; readonly target: string } | undefined;
  const ref = revisionRefCandidates(name).find(n => snapshot.names.has(n));
  if (ref !== undefined) {
    const oid = resolveRef(snapshot, ref);
    const value = snapshot.refs.get(ref);
    if (oid !== null) out.add(oid);
    else if (value?.kind === 'symbolic' && !snapshot.refs.has(value.target)) unread = { ref, target: value.target };
  }
  const width = WIDTH[snapshot.objectFormat];
  if (width !== undefined && HEX.test(name)) {
    if (name.length === width) out.add(name);
    else if (name.length >= MIN_ABBREVIATION && name.length < width) {
      for (const id of await ports.storedIds()) if (id.length === width && id.startsWith(name)) out.add(id);
    }
  }
  return { found: out, ...(unread === undefined ? {} : { unread }) };
}

export async function pinLaunchRevision(
  input: { readonly clone: string; readonly snapshot: CloneSnapshot; readonly revision?: string; readonly headConsented: boolean },
  ports: RevisionPorts,
): Promise<RevisionResult> {
  const { snapshot } = input;
  const head = resolveRef(snapshot, 'HEAD');
  const refuse = (stage: RevisionRefusal['stage'], reason: string, command?: string): RevisionResult =>
    ({ ok: false, refusal: { stage, reason, ...(command === undefined ? {} : { command }) } });
  if (input.revision === undefined && input.headConsented && head !== null) return { ok: true, pinned: { kind: 'head-consented', commit: head } };

  let commit: string, via: string, remote: string | null = null;
  if (input.revision !== undefined) {
    const { found, unread } = await resolveName(snapshot, input.revision, ports);
    if (found.size === 0 && unread !== undefined) {
      return refuse('revision', `--revision ${JSON.stringify(input.revision.slice(0, 200))} names ${unread.ref}, a symbolic reference to ${unread.target}, whose value Syzygy does not read (it reads the value of the reference --revision names, not of a reference that one names); give ${unread.target} or an object identifier with --revision`);
    }
    if (found.size !== 1) {
      return refuse('revision', found.size === 0
        ? `--revision ${JSON.stringify(input.revision.slice(0, 200))} resolves to no object identifier`
        : `--revision ${JSON.stringify(input.revision.slice(0, 200))} is ambiguous: it resolves to ${found.size} objects`);
    }
    commit = [...found][0]!;
    via = `--revision ${input.revision}`;
  } else {
    const chosen = defaultRemote(snapshot);
    if ('remote' in chosen) {
      const oid = resolveRef(snapshot, chosen.target);
      if (oid === null) return refuse('revision', `refs/remotes/${chosen.remote}/HEAD names ${chosen.target}, which the clone does not hold; name the revision with --revision`);
      commit = oid; via = `refs/remotes/${chosen.remote}/HEAD -> ${chosen.target}`; remote = chosen.remote;
    } else if (chosen.none === 'several') {
      return refuse('revision', `the remotes ${chosen.names.join(', ')} each record a default branch and none is origin, so the clone records no one remote default; name the revision with --revision`);
    } else {
      const main = resolveRef(snapshot, 'refs/heads/main'), master = resolveRef(snapshot, 'refs/heads/master');
      if (main !== null) { commit = main; via = 'refs/heads/main'; }
      else if (master !== null) { commit = master; via = 'refs/heads/master'; }
      else return refuse('revision', 'the clone records no remote default branch and has neither a main nor a master branch; name the revision with --revision');
    }
  }
  if (!(await ports.isCommit(commit))) return refuse('revision', `${via} resolves to ${commit}, which is not a commit the clone's store holds`);
  if (head !== commit) {
    return refuse('head', `the clone's HEAD is ${head ?? 'unresolvable'}, not the pinned revision ${commit} (${via}); Syzygy does not change the checkout`, checkoutCommand(input.clone, commit));
  }
  return { ok: true, pinned: { kind: 'pinned', commit, via, remote } };
}

/** The operator's own command to update the clone before a later run (047, line 184). */
export const updateCommand = (clone: string, remote: string | null): string =>
  remote === null ? `git -C ${quote(clone)} pull --ff-only` : `git -C ${quote(clone)} fetch ${remote}`;
