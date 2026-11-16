import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256 } from '@syzygy/support';
import { applyUnifiedPatch } from '@syzygy/test-kit';

/** Screening scope version 8 (variant `pv`) as fixture bytes: the package's own patch applied to the version-7 policy on disk, refused
 * unless the result hashes to the package manifest's one row (a literal here). Once the act applies the bytes, the policy on disk is the
 * row itself and is used as it is; `V7` is then null. */
export const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const POLICY_FILE = '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json';
const PATCH_FILE = '.syzygy/governance/contracts/candidates/public-source-screening-scope-v8/proposed/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json.pv.patch';
export const V8_ROW = '44153bbe210c7a724f224f2bc1c9255db43cf0887b6ad22dd24884514f21bbe8';
export const V7_ROW = '626be0cadc248b9ca9b3165d51f97d39aec552eb3a97b8b7df21d2446fc233da';

const onDisk = readFileSync(path.join(REAL_ROOT, POLICY_FILE), 'utf8');
export const V8: string = sha256(onDisk) === V8_ROW ? onDisk : applyUnifiedPatch(onDisk, readFileSync(path.join(REAL_ROOT, PATCH_FILE), 'utf8'));
if (sha256(V8) !== V8_ROW) throw new Error('the version-8 fixture does not hash to the package manifest row');
export const V7: string | null = sha256(onDisk) === V7_ROW ? onDisk : null;
