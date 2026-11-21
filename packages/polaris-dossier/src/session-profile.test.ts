import { describe, expect, it } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import {
  createSessionProfile, DEFAULT_SESSION_MODEL, projectSessionProfileMetadata, SESSION_PROFILE_BETA,
  SESSION_PROFILE_SYNTHETIC_AUTHORIZATION, sessionProfileProviderHeaders, sessionProfileRemainingTokens,
  type SessionProfileInput, type SessionProfileResult,
} from './session-profile.js';

const INPUT: SessionProfileInput = {
  binding: { run: 'NONSECRET_RUN_1907', role: 'author', sourceBinding: 'synthetic-pin', policy: 'synthetic-policy', provider: 'anthropic', model: DEFAULT_SESSION_MODEL },
  sessionId: '00000000-0000-4000-8000-000000001907', systemPrompt: 'NONSECRET_FIXED_SYZYGY_SYSTEM_1907', initialPrompt: 'NONSECRET_FIXED_SYZYGY_INITIAL_1907', utcDate: '2026-11-18', kernelRelease: '7.0.0-43-generic',
};
const canon = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 });
function good<T>(value: SessionProfileResult<T>): T {
  expect(value.ok).toBe(true); if (!value.ok) throw new Error(value.code); return value.value;
}
const profile = () => good(createSessionProfile(INPUT)).profile;
const metadata = (extra = {}) => ({ user_id: JSON.stringify({ device_id: 'd'.repeat(64), account_uuid: '', session_id: INPUT.sessionId, ...extra }) });
const headers = () => ({ authorization: SESSION_PROFILE_SYNTHETIC_AUTHORIZATION, 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-beta': SESSION_PROFILE_BETA, 'user-agent': 'claude-cli/2.1.327 (external, sdk-cli)', 'x-app': 'cli' });

describe('installed Sonnet4.6 session profile', () => {
  it('compiles the independent exact offline fixture with explicit no-thinking model and controls', () => {
    const p = profile();
    expect(DEFAULT_SESSION_MODEL).toBe('claude-sonnet-4-6');
    const { metadata: ignoredMetadata, system, tools, ...control } = p.baseline;
    expect(ignoredMetadata).toEqual({ user_id: 'syzygy:NONSECRET_RUN_1907:author:00000000-0000-4000-8000-000000001907' });
    expect(control).toEqual({ model: 'claude-sonnet-4-6', stream: true, max_tokens: 32000, temperature: 1, thinking: { type: 'disabled' }, output_config: { effort: 'high' }, tool_choice: { type: 'auto', disable_parallel_tool_use: true } });
    // These identities were independently scripted from the complete installed2.1.327
    // synthetic capture, not computed by the profile compiler under test.
    expect(sha256(canon(system))).toBe('21a6243bef3d9d0cda841548509f6c217cd21d229d0068ef12495160915ef688');
    expect(sha256(canon(tools))).toBe('91876b623f527e1c293b55296f89c38a07a5a2774351be6a6094f948a8b7fe4a');
    expect(sha256(canon([p.initialMessage]))).toBe('53dab2323ac44e3c77795409ce3da43f8e7fa9f6ef18c97505687d729b81dd38');
    expect(p.baselineOrigin.classes).toEqual(['governance-text', 'code-structure', 'work-history']);
    expect(p.initialScaffoldingOrigin.classes).toEqual(['governance-text', 'code-structure', 'work-history']);
    expect(p.initialScaffoldingOrigin.canonicalText).not.toContain(INPUT.initialPrompt);
  });

  it('uses trusted launch facts and freezes all compiled data against later mutation', () => {
    const changed = good(createSessionProfile({ ...INPUT, utcDate: '2026-11-19', kernelRelease: 'TEST-KERNEL-1907' })).profile;
    const initial = changed.initialMessage.content as { text: string }[];
    expect(initial[0]!.text).toContain('Linux TEST-KERNEL-1907');
    expect(initial[3]!.text).toBe("<system-reminder>\nToday's date is 2026-11-19.\n</system-reminder>\n");
    const mutable = JSON.parse(JSON.stringify(INPUT)) as { binding: { role: string } } & SessionProfileInput;
    const p = good(createSessionProfile(mutable)).profile;
    mutable.binding.role = 'mutated';
    expect(p.input.binding.role).toBe('author');
    expect(() => { (p.baseline.thinking as { type: string }).type = 'adaptive'; }).toThrow();
    expect(changed.digest).not.toBe(p.digest);
    // Independent literal hashes of the pinned native formula, including its
    // UTF-16 indexing and UTF-8 replacement of a selected unpaired code unit.
    for (const [initialPrompt, suffix] of [
      ['NONSECRET_FIXED_SYZYGY_INITIAL_1907', '524'], ['Read the own synthetic brief.', '491'],
      ['Own', '502'], ['ABCD\u{1f680}EFGHIJKLMNOPQRSTUV', '303'],
    ]) {
      const compiled = good(createSessionProfile({ ...INPUT, initialPrompt: initialPrompt! })).profile;
      expect((compiled.baseline.system as { text: string }[])[0]!.text)
        .toBe(`x-anthropic-billing-header: cc_version=2.1.327.${suffix}; cc_entrypoint=sdk-cli;`);
    }
  });

  it('refuses unsupported models/providers and malformed trusted dynamic inputs without fallback', () => {
    for (const input of [
      { ...INPUT, binding: { ...INPUT.binding, model: 'claude-opus-5-5' } },
      { ...INPUT, binding: { ...INPUT.binding, provider: 'another-provider' } },
    ]) expect(createSessionProfile(input)).toMatchObject({ ok: false, code: 'unsupported-session-profile' });
    for (const input of [
      { ...INPUT, utcDate: '2026-02-30' }, { ...INPUT, utcDate: 'yesterday' },
      { ...INPUT, kernelRelease: 'kernel\nUNTRUSTED' }, { ...INPUT, sessionId: 'caller-selected-arbitrary' },
      { ...INPUT, systemPrompt: '\u0000' }, { ...INPUT, initialPrompt: '\ud800' },
      { ...INPUT, arbitrary: 'unrecognized compilation option' },
    ]) expect(createSessionProfile(input)).toMatchObject({ ok: false, code: 'invalid-session-profile' });
  });

  it('discards device/account values and replaces metadata only with independently compiled host identity', () => {
    const p = profile();
    const first = good(projectSessionProfileMetadata(p, metadata()));
    const second = good(projectSessionProfileMetadata(p, metadata({ device_id: '0'.repeat(64) })));
    expect(first).toEqual(second);
    expect(first.metadata).toEqual(p.baseline.metadata);
    expect(JSON.stringify(first)).not.toContain('d'.repeat(64));
    for (const value of [
      metadata({ session_id: '00000000-0000-4000-8000-000000001908' }), metadata({ account_uuid: 'unrecognized-account' }),
      metadata({ device_id: 'not-a-device-id' }), metadata({ unknown: 'extra' }),
      { ...metadata(), unknown: 'extra' }, { user_id: '{"device_id":"a","device_id":"b"}' },
      { user_id: 'x'.repeat(1025) }, { user_id: 1 },
    ]) expect(projectSessionProfileMetadata(p, value)).toMatchObject({ ok: false, code: 'profile-metadata-refused' });
    expect(projectSessionProfileMetadata({ ...p }, metadata())).toMatchObject({ ok: false, code: 'unsupported-session-profile' });
  });

  it('uses last-context usage including both caches, distinguishing cumulative-spend and omitted-cache errors', () => {
    expect(good(sessionProfileRemainingTokens({ inputTokens: 3, outputTokens: 5 })).remaining).toBe(14999992);
    expect(good(sessionProfileRemainingTokens({ inputTokens: 13, outputTokens: 17, cacheCreationInputTokens: 19, cacheReadInputTokens: 0 })).remaining).toBe(14999951);
    expect(good(sessionProfileRemainingTokens({ inputTokens: 23, outputTokens: 29, cacheCreationInputTokens: 0, cacheReadInputTokens: 31 })).remaining).toBe(14999917);
    expect(good(sessionProfileRemainingTokens({ inputTokens: 23, outputTokens: 29, cacheCreationInputTokens: 0, cacheReadInputTokens: 31 })).remaining).not.toBe(14999860);
    for (const value of [
      undefined, {}, { inputTokens: 1 }, { inputTokens: -1, outputTokens: 1 }, { inputTokens: 1.5, outputTokens: 1 },
      { inputTokens: 15_000_000, outputTokens: 1 }, { inputTokens: 1, outputTokens: Infinity },
      { inputTokens: 1, outputTokens: 1, cacheCreationInputTokens: '19' },
      { inputTokens: 1, outputTokens: 1, serviceTier: 'unproven' },
      { inputTokens: 1, outputTokens: 1, cacheCreation: { ephemeral5mInputTokens: 1 } },
    ]) expect(sessionProfileRemainingTokens(value)).toMatchObject({ ok: false, code: 'profile-usage-refused' });
  });

  it('validates the exact projected header profile and emits no CLI auth/SDK/routing data', () => {
    const p = profile(), incoming = headers();
    expect(good(sessionProfileProviderHeaders(p, incoming)).headers).toEqual({
      'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-beta': SESSION_PROFILE_BETA,
      'user-agent': 'claude-cli/2.1.327 (external, sdk-cli)', 'x-app': 'cli',
    });
    for (const key of Object.keys(incoming)) {
      const altered = { ...incoming, [key]: 'NONSECRET_ARBITRARY_HEADER_CHANNEL' };
      const failure = sessionProfileProviderHeaders(p, altered);
      expect(failure).toMatchObject({ ok: false, code: 'profile-headers-refused' });
      expect(JSON.stringify(failure)).not.toContain('NONSECRET_ARBITRARY_HEADER_CHANNEL');
      const missing = { ...incoming } as Record<string, string>; delete missing[key];
      expect(sessionProfileProviderHeaders(p, missing).ok).toBe(false);
    }
    for (const extra of ['host', 'content-length', 'cookie', 'x-api-key', 'x-stainless-os', 'Authorization']) {
      expect(sessionProfileProviderHeaders(p, { ...incoming, [extra]: 'NONSECRET_EXTRA' })).toMatchObject({ ok: false, code: 'profile-headers-refused' });
    }
  });
});
