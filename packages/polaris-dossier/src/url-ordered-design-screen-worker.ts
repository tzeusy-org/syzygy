import { readSync, writeSync } from 'node:fs';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { sha256, isRecord } from '@syzygy/support';
import { buildDossierScreen } from './screen.js';
import { createOrderedDesignSessionProfile } from './session-profile.js';
import { screenOrderedDesignInitialRequest, screenOrderedDesignRequest, type OrderedDesignScreeningBranch } from './session-egress-policy.js';
import { decodeSessionResponse } from './session-response.js';
import { planOrderedDesignBytes } from './url-design-delivery.js';
import {
  ORDERED_SCREEN_FORMAT, ORDERED_SCREEN_INPUT_LIMITS, ORDERED_SCREEN_OUTPUT_LIMITS,
  ORDERED_SCREEN_LIMITS, type OrderedScreenInput, type OrderedScreenLimits, type OrderedScreenObservation,
} from './url-ordered-design-screen-protocol.js';

function refuse(): never { throw new Error('ordered-screen-refused'); }
function base64(value: string, maximum: number): Buffer {
  if (typeof value !== 'string' || value.length > Math.ceil(maximum / 3) * 4) refuse();
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length > maximum || bytes.toString('base64') !== value) refuse();
  return bytes;
}

/** One operation, one policy compilation, no source paths and no diagnostic text. */
function screen(input: OrderedScreenInput, limits: OrderedScreenLimits): OrderedScreenObservation {
  const policy = base64(input.policyBase64, 1_048_576);
  if (sha256(policy) !== input.policySha256) refuse();
  const compiled = buildDossierScreen(policy, true, null, 'private');
  if (!compiled.ok || compiled.screen.policySha256 !== input.policySha256) refuse();
  const issued = createOrderedDesignSessionProfile(input.profileInput);
  if (!issued.ok || issued.value.profile.digest !== input.profileSha256
    || issued.value.profile.input.binding.policy !== input.policySha256) refuse();
  const { profile } = issued.value;
  const empty = () => ({ secretCalls: 0, secretCodeUnits: 0, activeCalls: 0, activeCodeUnits: 0, maximumInputCodeUnits: 0 });
  const counts = empty();
  const branches = { raw: empty(), received: empty(), prepared: empty(), logicalReceived: empty(), logicalPrepared: empty() };
  let branch: OrderedDesignScreeningBranch = 'raw', exhausted = false;
  const charge = (kind: 'secret' | 'active', text: string): void => {
    for (const target of [counts, branches[branch]]) {
      target[kind === 'secret' ? 'secretCalls' : 'activeCalls']++;
      target[kind === 'secret' ? 'secretCodeUnits' : 'activeCodeUnits'] += text.length;
      target.maximumInputCodeUnits = Math.max(target.maximumInputCodeUnits, text.length);
    }
    if (counts.secretCalls + counts.activeCalls > limits.detectorCalls
      || counts.secretCodeUnits + counts.activeCodeUnits > limits.detectorCodeUnits) { exhausted = true; refuse(); }
  };
  const scanSecrets = (text: string): boolean => { charge('secret', text); return compiled.screen.screenSecrets(text) !== undefined; };
  const scanDesignView = (text: string): boolean => { charge('active', text); return compiled.screen.screenBody(text) !== undefined; };
  const detectors = { scanSecrets, scanDesignView, observeBranch: (value: OrderedDesignScreeningBranch) => { branch = value; } };
  let outcome: OrderedScreenObservation['outcome'];
  if (input.operation === 'initial') {
    outcome = { operation: 'initial', result: screenOrderedDesignInitialRequest(base64(input.receivedBase64, 2_097_152), profile, detectors) };
  } else if (input.operation === 'request') {
    const envelope = Buffer.from(input.envelopeUtf8, 'utf8');
    const plan = planOrderedDesignBytes({ ...input.planInput, envelope });
    if (plan.manifestSha256 !== input.manifestSha256) refuse();
    const result = screenOrderedDesignRequest(base64(input.receivedBase64, 2_097_152),
      { ...input.bindings, profile, plan, envelope }, detectors);
    outcome = { operation: 'request', result };
  } else if (input.operation === 'response') {
    outcome = { operation: 'response', result: decodeSessionResponse(base64(input.receivedBase64, 8_388_608),
      input.contentType, profile.input.binding.model, scanSecrets) };
  } else refuse();
  if (exhausted) refuse();
  const usage = process.resourceUsage();
  return { format: ORDERED_SCREEN_FORMAT, policySha256: input.policySha256, profileSha256: profile.digest,
    counts, branches, selfCpuMicrosecondsBeforeOutput: usage.userCPUTime + usage.systemCPUTime, outcome };
}

try {
  // No readFileSync(0): the ingress allocation and actual read are both bounded.
  const storage = Buffer.alloc(ORDERED_SCREEN_INPUT_LIMITS.maxBytes + 1);
  let length = 0;
  while (length < storage.length) {
    const count = readSync(0, storage, length, storage.length - length, null);
    if (count === 0) break;
    length += count;
  }
  if (length > ORDERED_SCREEN_INPUT_LIMITS.maxBytes) refuse();
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(storage.subarray(0, length));
  const value: unknown = parseBoundedJson(text, ORDERED_SCREEN_INPUT_LIMITS);
  if (encodeCanonicalJson(value, ORDERED_SCREEN_INPUT_LIMITS) !== text || !isRecord(value)
    || Object.keys(value).sort().join(',') !== 'format,input,limits' || value.format !== ORDERED_SCREEN_FORMAT || !isRecord(value.limits)) refuse();
  const limits = value.limits as unknown as OrderedScreenLimits;
  if (Object.keys(limits).sort().join(',') !== Object.keys(ORDERED_SCREEN_LIMITS).sort().join(',')) refuse();
  for (const key of Object.keys(ORDERED_SCREEN_LIMITS) as (keyof OrderedScreenLimits)[]) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] <= 0 || limits[key] > ORDERED_SCREEN_LIMITS[key]) refuse();
  }
  const output = Buffer.from(encodeCanonicalJson(screen(value.input as OrderedScreenInput, limits), ORDERED_SCREEN_OUTPUT_LIMITS));
  let offset = 0;
  while (offset < output.length) offset += writeSync(1, output, offset, output.length - offset);
} catch {
  // Never emit an exception, stack, input, key, detector match or partial result.
  process.exitCode = 1;
}
