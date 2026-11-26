import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { PWB_SECRET_POLICY } from './content-classification.js';
import { screenWorkItemTitle, WORK_ITEM_TITLE_POLICY } from './work-item-titles.js';

// POC-REQ-063 (syzygy-t3jk.23). Expected values are literals typed here.
describe('the work-item-title policy', () => {
  it('declares its identity, class and bound, and screens with the project-shape detectors by reference', () => {
    expect(WORK_ITEM_TITLE_POLICY).toEqual({
      policyId: 'work-item-title',
      policyVersion: '1.0.0',
      contentClass: 'work-item-title',
      detectorPolicy: {
        policyId: 'polaris-butlers-project-shape-secrets',
        policyVersion: '1.9.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p.v7-s.v8-pv',
      },
      maxLength: 500,
    });
    expect(PWB_SECRET_POLICY.detectors.map((detector) => detector.id)).toEqual([
      'private-key-material',
      'known-token-formats',
      'credential-assignment',
      'credential-bearing-url',
    ]);
  });

  it('withholds on each detector, the active-content scan and every unscreenable input', () => {
    expect([
      'k -----BEGIN OPENSSH PRIVATE KEY-----',
      'ghp_abcdefghijklmnopqrstuvwxyz',
      'api_key=abcdefgh1234',
      'http://a:b@c.example/',
    ].map(screenWorkItemTitle).map((title) => ('withheld' in title ? title.withheld : title))).toEqual(Array.from({ length: 4 }, () => 'secret-matched'));
    expect(['<svg onload=x>', 'x <img src=y>', '[a](data:text/html,x)'].map(screenWorkItemTitle).map((title) => ('withheld' in title ? title.withheld : title)))
      .toEqual(Array.from({ length: 3 }, () => 'active-content'));
    // The scan is used unchanged, gap included: a tag name ended by `/`
    // is not a finding (syzygy-ls34). The page escapes every admitted title.
    expect(screenWorkItemTitle('<svg/onload=x>')).toEqual({ text: '<svg/onload=x>' });
    expect([undefined, {}, '', 'z'.repeat(501), 'cr\r', 'del\u007f'].map(screenWorkItemTitle).map((title) => ('withheld' in title ? title.withheld : title)))
      .toEqual(Array.from({ length: 6 }, () => 'unclassifiable'));
  });

  it('executes the declared policy file: identity, detectors, bound and record classes equal the JSON', () => {
    const declared = JSON.parse(readFileSync(fileURLToPath(new URL('../../../.syzygy/governance/policies/WORK-ITEM-TITLE-POLICY-v1.json', import.meta.url)), 'utf8')) as Record<string, unknown> & {
      detectorPolicy: { policyId: string; policyVersion: string; detectors: string[] };
    };
    expect([declared.policyId, declared.policyVersion, declared.contentClass, declared.maxLength]).toEqual([
      WORK_ITEM_TITLE_POLICY.policyId, WORK_ITEM_TITLE_POLICY.policyVersion, WORK_ITEM_TITLE_POLICY.contentClass, WORK_ITEM_TITLE_POLICY.maxLength,
    ]);
    expect([declared.detectorPolicy.policyId, declared.detectorPolicy.policyVersion]).toEqual([PWB_SECRET_POLICY.policyId, PWB_SECRET_POLICY.policyVersion]);
    expect(declared.detectorPolicy.detectors).toEqual(PWB_SECRET_POLICY.detectors.map((detector) => detector.id));
    expect(declared.withheldRecord).toMatchObject({
      redactionClasses: { 'secret-matched': 'excluded-artifact', 'active-content': 'excluded-artifact', unclassifiable: 'unclassifiable-excluded' },
      retainBody: false,
    });
  });

  it('admits ordinary text, including brackets, ampersands, quotes and non-ASCII letters', () => {
    expect(screenWorkItemTitle('[pursuit] T5 S1 — titles & "quotes" < 3 café 東京')).toEqual({ text: '[pursuit] T5 S1 — titles & "quotes" < 3 café 東京' });
  });
});
