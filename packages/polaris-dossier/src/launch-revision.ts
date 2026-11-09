import { resolveRef, validRefName, type CloneSnapshot } from './launch-clone.js';

/** The revision a launch pins (REQ-polaris-generation-047), decided from the clone's references alone, with no network request.
 *
 * "a run started without `--revision` whose clone's HEAD is a revision that an in-force observation consent names, whatever that
 * consent's subject identity and whichever act made it, SHALL pin that HEAD exactly as REQ-polaris-generation-033 states" (047, line 182):
 * `headConsented` says so, and the answer is `head-consented`, which changes nothing else for the run. Otherwise exactly one revision is
 * pinned before any question: absent `--revision`, "the branch the clone records as its remote's default (the remote's `HEAD`
 * reference), or, where it records none, the clone's `main` branch, or, where there is none, its `master` branch"; none of them refuses,
 * naming `--revision`. With `--revision`, "a full or unambiguous abbreviated object identifier or a reference the clone holds, resolved
 * once to a full object identifier; a name that resolves to no commit, or to more than one, SHALL be refused."
 *
 * Which remote's default is read: `origin`'s when it records one, else the one remote that records one. Where several remotes record a
 * default and none is `origin`, the clone records no single remote default; that case is refused naming `--revision`, never resolved by
 * a precedence the clause does not state [Inferred: the clause names "its remote's default" in the singular]. Then "Where the clone's
 * HEAD is not the pinned revision, Syzygy SHALL refuse before asking for consent, and SHALL print the one command that checks out the
 * pinned revision" (047, line 186). Syzygy never changes the checkout. */

export interface RevisionPorts {
  /** Every object identifier the clone's store names, for an abbreviation (the object reader's store listing, no object read). */
  readonly storedIds: () => Promise<ReadonlySet<string>>;
  /** Whether `oid` is a commit in the clone's store, re-hashed. */
  readonly isCommit: (oid: string) => Promise<boolean>;
}

export type PinnedRevision =
  | { readonly kind: 'head-consented'; readonly commit: string }
  | { readonly kind: 'pinned'; readonly commit: string; readonly via: string; readonly remote: string | null };

export type RevisionRefusal = { readonly stage: 'revision' | 'head'; readonly reason: string; readonly command?: string };
export type RevisionResult = { readonly ok: true; readonly pinned: PinnedRevision } | { readonly ok: false; readonly refusal: RevisionRefusal };

const HEX_PREFIX = /^[0-9a-f]{4,64}$/;
const quote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export const checkoutCommand = (clone: string, commit: string): string => `git -C ${quote(clone)} checkout --detach ${commit}`;

/** The remote whose `HEAD` reference the trunk rule reads, or why there is none to read. */
export function defaultRemote(snapshot: CloneSnapshot): { readonly remote: string; readonly target: string } | { readonly none: 'none' | 'several'; readonly names: readonly string[] } {
  const recorded = [...snapshot.refs].flatMap(([name, value]) => {
    const m = /^refs\/remotes\/([^/]+)\/HEAD$/.exec(name);
    return m !== null && value.kind === 'symbolic' ? [{ remote: m[1]!, target: value.target }] : [];
  });
  const origin = recorded.find(r => r.remote === 'origin');
  if (origin !== undefined) return origin;
  if (recorded.length === 1) return recorded[0]!;
  return { none: recorded.length === 0 ? 'none' : 'several', names: recorded.map(r => r.remote).sort() };
}

/** The candidates a `--revision` name resolves to: the reference rules git uses for a short name, then the store's identifiers. */
async function resolveName(snapshot: CloneSnapshot, name: string, ports: RevisionPorts): Promise<ReadonlySet<string>> {
  const out = new Set<string>();
  const refCandidates = name.startsWith('refs/') ? [name] : [`refs/${name}`, `refs/tags/${name}`, `refs/heads/${name}`, `refs/remotes/${name}`, `refs/remotes/${name}/HEAD`];
  for (const ref of refCandidates) {
    if (!validRefName(ref)) continue;
    const oid = resolveRef(snapshot, ref);
    if (oid !== null) { out.add(oid); break; }
  }
  if (HEX_PREFIX.test(name)) {
    for (const id of await ports.storedIds()) if (id.startsWith(name)) out.add(id);
  }
  return out;
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
    const found = await resolveName(snapshot, input.revision, ports);
    if (found.size !== 1) {
      return refuse('revision', found.size === 0
        ? `--revision ${JSON.stringify(input.revision.slice(0, 200))} resolves to no object the clone holds`
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
