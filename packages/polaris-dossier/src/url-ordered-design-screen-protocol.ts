import type { SessionProfileInput } from './session-profile.js';
import type { OrderedDesignRequestBindings } from './url-ordered-design-request.js';
import type { planOrderedDesignBytes } from './url-design-delivery.js';
import type { OrderedDesignRequestChecks, OrderedDesignScreeningBranch, SessionPolicyResult } from './session-egress-policy.js';
import type { SessionResponseResult } from './session-response.js';

/** First-party private pipe protocol; no CLI/provider field selects these inputs. */
export const ORDERED_SCREEN_FORMAT = 'ordered-design-screen/1';
export const ORDERED_SCREEN_INPUT_LIMITS = Object.freeze({ maxBytes: 16_777_216, maxNodes: 131_072, maxDepth: 48 });
export const ORDERED_SCREEN_OUTPUT_LIMITS = Object.freeze({ maxBytes: 12_582_912, maxNodes: 131_072, maxDepth: 48 });
export const ORDERED_SCREEN_LIMITS = Object.freeze({
  wallMilliseconds: 20_000, cpuSeconds: 8, addressBytes: 2_147_483_648,
  detectorCalls: 1_048_576, detectorCodeUnits: 1_073_741_824,
});
export interface OrderedScreenLimits {
  readonly wallMilliseconds: number; readonly cpuSeconds: number; readonly addressBytes: number;
  readonly detectorCalls: number; readonly detectorCodeUnits: number;
}
type PlanInput = Parameters<typeof planOrderedDesignBytes>[0];
interface Common {
  readonly policyBase64: string;
  readonly policySha256: string;
  readonly profileInput: SessionProfileInput;
  readonly profileSha256: string;
  readonly receivedBase64: string;
}
export type OrderedScreenInput = Common & ({
  readonly operation: 'request';
  readonly envelopeUtf8: string;
  readonly planInput: Omit<PlanInput, 'envelope'>;
  readonly manifestSha256: string;
  readonly bindings: Pick<OrderedDesignRequestBindings, 'prepared' | 'parts' | 'acknowledgment'>;
} | { readonly operation: 'initial' } | { readonly operation: 'response'; readonly contentType: string });
export interface OrderedScreenCounts {
  readonly secretCalls: number; readonly secretCodeUnits: number;
  readonly activeCalls: number; readonly activeCodeUnits: number;
  readonly maximumInputCodeUnits: number;
}
export interface OrderedScreenObservation {
  readonly format: typeof ORDERED_SCREEN_FORMAT;
  readonly policySha256: string; readonly profileSha256: string;
  readonly counts: OrderedScreenCounts;
  readonly branches: Readonly<Record<OrderedDesignScreeningBranch, OrderedScreenCounts>>;
  /** Kernel self rusage sampled before the output encoding/write, not total child-tree CPU. */
  readonly selfCpuMicrosecondsBeforeOutput: number;
  readonly inverseInputs: readonly number[];
  readonly outcome: { readonly operation: 'request' | 'initial'; readonly result: SessionPolicyResult<OrderedDesignRequestChecks> }
    | { readonly operation: 'response'; readonly result: SessionResponseResult };
}
