// Reviewer probe (R-GP-IMPL-CONSENT-LIVE-MODULE-1), copied into the scratch clone only and deleted after the run.
import * as root from '@syzygy/polaris-generation-consent';
import * as live from '@syzygy/polaris-generation-consent/live';
import * as ports from '../../polaris-generation-consent/src/consent-ports.js';
import * as inForce from '../../polaris-generation-consent/src/in-force.js';
import * as reader from '../../polaris-generation-consent/src/package-reader.js';
import { expect, it } from 'vitest';

it('every ./live value is the root object under vitest source aliases', () => {
  const names = Object.keys(live).sort();
  expect(names.length).toBe(25);
  expect(names.filter(n => (root as Record<string, unknown>)[n] !== (live as Record<string, unknown>)[n])).toEqual([]);
});

it('the in-force rules are one object through root, ./live, consent-ports and in-force', () => {
  expect(root.inForceRecords).toBe(inForce.inForceRecords);
  expect(live.inForceRecords).toBe(inForce.inForceRecords);
  expect(ports.inForceRecords).toBe(inForce.inForceRecords);
  expect(root.notInForceRecords).toBe(inForce.notInForceRecords);
  expect(live.notInForceRecords).toBe(inForce.notInForceRecords);
  expect(ports.notInForceRecords).toBe(inForce.notInForceRecords);
  expect(live.readClassActState).toBe(reader.readClassActState);
});

it('an AdmissionRecordError thrown through ./live is an instance of the root class', () => {
  let thrown: unknown;
  try { live.parseAdmissionRecords('not json at all'); } catch (e) { thrown = e; }
  expect(thrown).toBeInstanceOf(root.AdmissionRecordError);
});
