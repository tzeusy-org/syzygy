import { isDeepStrictEqual } from 'node:util';
import { generationSourcesForBody, type GenerationSource } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { sourceBindingSha256, type RecordedRunConfig } from './run-record.js';
import { URL_ORIGIN_LEDGER_LIMITS, type createUrlOriginLedger, type UrlWholeSourceBodyMetadata } from './url-origin-ledger.js';

type WholeBodyVerifier = Pick<ReturnType<typeof createUrlOriginLedger>, 'verifyWholeSourceBody' | 'inspectWholeSourceBody'>;
const refuse = (): never => { throw new Error('url-rendered-source-proof-unavailable'); };

/** Match each source consumed by the renderer to a fresh complete pinned-body
 * verification, including each piece's offsets, text and anchor. Excluded
 * rows carry no body. The input and verified bytes remain transient. */
export async function verifyUrlRenderedSources(
  input: { readonly runId: string; readonly pinnedRevision: string; readonly signal: AbortSignal;
    readonly input: { readonly sources: readonly GenerationSource[] };
    readonly sourceBodies: readonly { readonly path: string; readonly objectId: string; readonly raw: string | null; readonly redacted: boolean }[] },
  record: RecordedRunConfig,
  ledger: WholeBodyVerifier,
  waitForSample?: () => Promise<void>,
): Promise<readonly UrlWholeSourceBodyMetadata[]> {
  const { subject } = record, sources = input.input.sources;
  if (input.signal.aborted || input.pinnedRevision !== subject.pinnedRevision.commit
    || sources.length > 4096 || input.sourceBodies.length > URL_ORIGIN_LEDGER_LIMITS.parents) return refuse();
  const byPath = new Map<string, GenerationSource[]>();
  for (const source of sources) {
    if (source.repositoryId !== subject.repository.repositoryId || source.revision !== input.pinnedRevision
      || source.evaluationId !== input.runId) return refuse();
    if (source.exclusion.excluded) {
      if (source.body !== undefined || source.segment !== undefined || source.redaction !== undefined || source.spans.length !== 0
        || subject.visibility.value === 'private' && source.objectId !== null) return refuse();
      continue;
    }
    const pieces = byPath.get(source.path);
    if (pieces === undefined) byPath.set(source.path, [source]);
    else pieces.push(source);
  }
  if (input.sourceBodies.length !== byPath.size) return refuse();
  const sourceBinding = sourceBindingSha256(subject), verified: UrlWholeSourceBodyMetadata[] = [];
  let checkedBytes = 0;
  for (const body of input.sourceBodies) {
    // Source verification and capability inspection each check live authority.
    // Settle pending samples between these bounded groups of checks.
    if (waitForSample !== undefined) await waitForSample();
    const pieces = byPath.get(body.path);
    if (input.signal.aborted || pieces === undefined || body.redacted || body.raw === null
      || Buffer.byteLength(body.raw) > URL_ORIGIN_LEDGER_LIMITS.itemBytes) return refuse();
    byPath.delete(body.path);
    const bytes = Buffer.from(body.raw);
    checkedBytes += bytes.length;
    if (checkedBytes > URL_ORIGIN_LEDGER_LIMITS.bytes) return refuse();
    const capability = await ledger.verifyWholeSourceBody({ path: body.path, objectId: body.objectId, bytes });
    if (waitForSample !== undefined) await waitForSample();
    if (input.signal.aborted) return refuse();
    const exact = ledger.inspectWholeSourceBody(capability);
    if (input.signal.aborted || exact.runId !== input.runId || exact.pinnedCommit !== input.pinnedRevision || exact.sourceBindingSha256 !== sourceBinding
      || exact.path !== body.path || exact.objectId !== body.objectId || exact.bytes !== bytes.length || exact.digest !== sha256(bytes)
      || exact.policies.baseSha256 !== subject.screeningPolicy.sha256 || exact.range.start !== 0 || exact.range.end !== bytes.length) return refuse();
    const expected = generationSourcesForBody({ sourceId: `src-${sha256(body.path).slice(0, 24)}`, repositoryId: subject.repository.repositoryId,
      revision: input.pinnedRevision, path: body.path, objectId: body.objectId, evaluationId: input.runId, body: body.raw });
    if (!isDeepStrictEqual(expected, pieces)) return refuse();
    verified.push(exact);
  }
  return Object.freeze(verified);
}
