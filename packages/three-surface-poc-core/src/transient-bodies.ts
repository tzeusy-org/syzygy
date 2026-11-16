// The validated phase-A seed bodies the phase-B reader reuses, split out of
// the resource ledger (syzygy-bpyt.6.5): the ledger counts, this holds.
//
// One (path, object id) body is taken from Git once, counted once and
// validated once: phase A remembers a seed only after every validation and
// screening pass it ran has succeeded, phase B recalls it instead of reading
// it again, and `release()` drops every body once phase B has read.

export interface TransientBody {
  readonly bytes: Uint8Array;
  readonly text: string;
}

export interface TransientBodies {
  remember(path: string, objectId: string, body: TransientBody): void;
  recall(path: string, objectId: string): TransientBody | undefined;
  release(): void;
}

export function createTransientBodies(): TransientBodies {
  const held = new Map<string, TransientBody>();
  const key = (path: string, objectId: string): string => `${path} ${objectId}`;
  return {
    remember: (path, objectId, body) => {
      held.set(key(path, objectId), body);
    },
    recall: (path, objectId) => held.get(key(path, objectId)),
    release: () => {
      held.clear();
    },
  };
}
