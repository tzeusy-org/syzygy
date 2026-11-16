"""Compare two `vitest list --json` outputs (argv[1] base, argv[2] head) as multisets of (file relative to argv[3], name)."""
import collections, json, sys
root = sys.argv[3].rstrip('/') + '/'
rows = [collections.Counter((r['file'].replace(root, ''), r['name']) for r in json.load(open(p))) for p in sys.argv[1:3]]
added, removed = rows[1] - rows[0], rows[0] - rows[1]
print('base', sum(rows[0].values()), 'head', sum(rows[1].values()), 'delta', sum(rows[1].values()) - sum(rows[0].values()),
      'added', sum(added.values()), 'removed', sum(removed.values()))
print('addedByFile', dict(collections.Counter(f for (f, _), n in added.items() for _ in range(n))))
lane = json.load(open(sys.argv[4]))
print('added equals record.json/titles.json added list:', sorted((a['file'], a['name']) for a in lane['added']) == sorted(added.elements()))
