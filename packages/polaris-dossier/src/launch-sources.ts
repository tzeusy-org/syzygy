import { otherActsOf, type GateSources } from './gate-sources.js';
import { launchStatementRecord } from './launch.js';
import { readLaunchRecords, type StoreRead, type StoredRecord } from './launch-store.js';

/** The gate sources with launch consent records beside every other act's (REQ-polaris-generation-046, line 25: "Syzygy SHALL read
 * launch consent records of every repository through one generic form, with no per-repository code, phrase, form or registry entry").
 *
 * Every answer is the base source's first. A launch record is consulted only where the base answer is empty or negative, so a run that
 * relies on no launch record (Redis today, by its own acts) gets the base answer unchanged; only the consented revisions are a union,
 * which adds nothing while no launch record names the repository. A
 * launch record counts while it is active (not revoked by a decisions file naming it, not superseded by a later launch record) and its
 * grant instant is not after `now`. A reference that cannot be read adds nothing here: the launch itself refuses on it, and a step of a
 * run that relies on a launch record finds no consent and refuses. The records are re-read on every call, never cached. */

export function withLaunchRecords(base: GateSources, options: { readonly home: string; readonly now: () => number; readonly read?: (home: string) => StoreRead }): GateSources {
  const records = (): readonly StoredRecord[] => {
    const read = (options.read ?? readLaunchRecords)(options.home);
    if (!read.ok) return [];
    const now = options.now();
    return read.records.filter(r => r.state === 'active' && Date.parse(r.record.grantInstant) <= now);
  };
  const ofClass = (identity: string, recordClass: StoredRecord['record']['recordClass']) =>
    records().filter(r => r.record.identity === `repository:${identity}` && r.record.recordClass === recordClass);
  return {
    ...base,
    // The sources an "another act" decision reads, launch records never among them, however often these are wrapped.
    otherActs: otherActsOf(base),
    repositoryIdsFor: async url => {
      const ids = await base.repositoryIdsFor(url);
      if (ids.length > 0) return ids;
      return [...new Set(records().filter(r => r.record.recordClass === 'observation-consent' && r.record.normalisedUrl === url)
        .map(r => r.record.identity.slice('repository:'.length)))].sort();
    },
    consentedRevisionsFor: async repositoryId => {
      // The union: a repository another act consents at some revisions may hold a launch consent at another (047, line 182).
      const revisions = await base.consentedRevisionsFor(repositoryId);
      const launched = ofClass(repositoryId, 'observation-consent').filter(r => !revisions.some(v => v.commitId === r.record.revision));
      return [...revisions, ...launched.map(r => ({ label: `launch consent ${r.record.recordId}`, commitId: r.record.revision }))];
    },
    observationConsentFor: async (repositoryId, revision) => {
      const answer = await base.observationConsentFor(repositoryId, revision);
      if (answer.satisfied) return answer;
      const found = ofClass(repositoryId, 'observation-consent').filter(r => r.record.revision === revision);
      return found.length === 1 ? { satisfied: true, record: `${found[0]!.record.recordId}@${found[0]!.commit}` } : answer;
    },
    projectInput: {
      drawerFor: async repositoryId => {
        const drawer = await base.projectInput.drawerFor(repositoryId);
        if (drawer.stated) return drawer;
        const found = ofClass(repositoryId, 'drawer-statement');
        return found.length >= 1 ? { stated: true, drawer: 'absent', record: found[0]!.record.recordId } : drawer;
      },
    },
    providerStatements: {
      statementsFor: async repositoryId => {
        const statements = await base.providerStatements.statementsFor(repositoryId);
        if (statements.length > 0) return statements;
        return ofClass(repositoryId, 'provider-statement').map(launchStatementRecord);
      },
    },
  };
}
