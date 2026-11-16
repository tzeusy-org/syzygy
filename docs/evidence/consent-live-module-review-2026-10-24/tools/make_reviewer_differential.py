"""Derive the reviewer's differential from the subject's script: the same harness, plus
- `gate-port`: the gate sources' port-backed answers (repositoryIdsFor, consentAbsenceFor, consentedRevisionsFor,
  observationConsentFor for both probe repositories, screeningPolicy), the start-gate methods that reach the moved
  in-force rules and that the subject's differential does not call through gate-sources.ts;
- `port` and `gate-port` added to the admission subjects' readers (so the altered-prose worlds of the admission acts and the
  class act run them);
- REVIEWER_GATE_PORT_ONLY=1 keeps only worlds whose readers include `gate-port`.

Usage: python3 -I make_reviewer_differential.py <subject script> <out script>
"""
import sys

src, dst = sys.argv[1:3]
s = open(src, encoding='utf8').read()


def once(old, new):
    global s
    assert s.count(old) == 1, (old[:60], s.count(old))
    s = s.replace(old, new)


once("    ...Object.keys(gate.STATEMENT_FORMS).map(id => [`gate-statements:${id}`, true, (fs, root, now) => sources(fs, root, now).providerStatements.statementsFor(id)]),\n",
     "    ...Object.keys(gate.STATEMENT_FORMS).map(id => [`gate-statements:${id}`, true, (fs, root, now) => sources(fs, root, now).providerStatements.statementsFor(id)]),\n"
     "    // Reviewer addition (R-GP-IMPL-CONSENT-LIVE-MODULE-1): the gate sources' port-backed answers.\n"
     "    ['gate-port', true, async (fs, root, now) => {\n"
     "      const s = sources(fs, root, now);\n"
     "      return {\n"
     "        ids: await s.repositoryIdsFor(probe.redisUrl),\n"
     "        absence: s.consentAbsenceFor === undefined ? 'none' : await s.consentAbsenceFor(probe.redisUrl),\n"
     "        revisions: await s.consentedRevisionsFor(probe.redisId),\n"
     "        observationRedis: await s.observationConsentFor(probe.redisId, probe.redisRevision),\n"
     "        observationRequests: await s.observationConsentFor(probe.requestsId, probe.requestsRevision),\n"
     "        screeningPolicy: await s.screeningPolicy(),\n"
     "      };\n"
     "    }],\n")
once("  const ADMISSION = ['admission', 'in-force', 'consent-ports'];",
     "  const ADMISSION = ['admission', 'in-force', 'consent-ports', 'port', 'gate-port'];")
once("worlds = kinds === undefined ? built.worlds : built.worlds.filter(w => kinds.includes(w.kind));",
     "worlds = (kinds === undefined ? built.worlds : built.worlds.filter(w => kinds.includes(w.kind))).filter(w => process.env.REVIEWER_GATE_PORT_ONLY !== '1' || w.readers.includes('gate-port'));")
once("    process.stdout.write(`${JSON.stringify({ worlds: built.worlds.length, byKind: count,",
     "    const selected = {};\n    for (const w of worlds) selected[w.kind] = (selected[w.kind] ?? 0) + 1;\n    process.stdout.write(`${JSON.stringify({ selected: worlds.length, selectedByKind: selected, worlds: built.worlds.length, byKind: count,")
open(dst, 'w', encoding='utf8').write(s)
print('wrote', dst)
