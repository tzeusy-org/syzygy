import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import {
  buildMaterializationPacket,
  clearMaterializationRecordFile,
  MATERIALIZATION_EXTERNAL_REF,
  materializationRecordPath,
  materializeWorkItem,
  readMaterializationRecordFile,
  rollbackMaterializedWorkItem,
  writeMaterializationRecordFile,
  type MaterializationRecord,
} from './materialization.js';

function stateDir(): string {
  const directory = tempDir('syzygy-poc-materialize-state-');
  return join(directory, 'state');
}

const NOW = '2026-08-30T12:00:00Z';
const PACKET = buildMaterializationPacket({
  targetRepoRoot: '/repo/butlers',
  proposalPath: 'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md',
  designPath: 'docs/superpowers/specs/2026-08-24-whatsapp-identity-reconciliation-design.md',
});

function recordIo(dir: string) {
  return {
    readRecord: () => readMaterializationRecordFile(dir),
    writeRecord: (record: MaterializationRecord) => writeMaterializationRecordFile(dir, record),
    clearRecord: () => clearMaterializationRecordFile(dir),
  };
}

describe('buildMaterializationPacket', () => {
  it('is a pure, deterministic function of its inputs (AC1: exact preview packet)', () => {
    const first = buildMaterializationPacket({
      targetRepoRoot: '/repo/butlers',
      proposalPath: 'proposal.md',
      designPath: 'design.md',
    });
    const second = buildMaterializationPacket({
      targetRepoRoot: '/repo/butlers',
      proposalPath: 'proposal.md',
      designPath: 'design.md',
    });
    expect(second).toEqual(first);
    expect(first.targetRepoRoot).toBe('/repo/butlers');
    expect(first.targetBeadPrefix).toBe('bu');
    expect(first.externalRef).toBe(MATERIALIZATION_EXTERNAL_REF);
    expect(first.governingIntent.requirementId).toBe('REQ-switchboard-identity-001');
  });
});

describe('materializeWorkItem', () => {
  it('creates exactly one Bead and persists a file-backed record (AC2)', () => {
    const dir = stateDir();
    const createCalls: unknown[] = [];
    const result = materializeWorkItem({
      targetRepoRoot: '/repo/butlers',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      ...recordIo(dir),
      runQuery: (repoRoot, sql) => {
        expect(repoRoot).toBe('/repo/butlers');
        if (sql.includes('external_ref')) return JSON.stringify([]);
        return JSON.stringify([{ revision: 'dolt-rev-1' }]);
      },
      runCreate: (repoRoot, packet, attribution) => {
        createCalls.push({ repoRoot, packet, attribution });
        return JSON.stringify({ id: 'bu-materialized1' });
      },
    });

    expect(result.kind).toBe('created');
    if (result.kind !== 'created') throw new Error('unreachable');
    expect(result.beadId).toBe('bu-materialized1');
    expect(createCalls).toHaveLength(1);

    const persisted = readMaterializationRecordFile(dir);
    expect(persisted?.beadId).toBe('bu-materialized1');
    expect(persisted?.doltRevisionAtCreation).toBe('dolt-rev-1');
    expect(persisted?.attribution).toBe('test-actor');
    expect(persisted?.origin).toBe('created');

    // 0600/0700 posture, matching the daemon credential file (POC-REQ:
    // state writes stay inside the state directory with owner-only mode).
    const fileMode = statSync(materializationRecordPath(dir)).mode & 0o777;
    expect(fileMode).toBe(0o600);
  });

  it('is idempotent via the local record on retry: a second call makes no bd call (AC3)', () => {
    const dir = stateDir();
    let createCount = 0;
    const materialize = () =>
      materializeWorkItem({
        targetRepoRoot: '/repo/butlers',
        packet: PACKET,
        attribution: 'test-actor',
        now: () => NOW,
        ...recordIo(dir),
        runQuery: (_repoRoot, sql) =>
          sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-1' }]),
        runCreate: () => {
          createCount += 1;
          return JSON.stringify({ id: 'bu-materialized1' });
        },
      });

    const first = materialize();
    const second = materialize();

    expect(first.kind).toBe('created');
    expect(second.kind).toBe('reused');
    if (second.kind !== 'reused') throw new Error('unreachable');
    expect(second.beadId).toBe('bu-materialized1');
    expect(createCount).toBe(1);
  });

  it('reconciles via external_ref instead of duplicating when the local record is lost (AC3)', () => {
    const dir = stateDir();
    let createCount = 0;
    const result = materializeWorkItem({
      targetRepoRoot: '/repo/butlers',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      ...recordIo(dir),
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref')
          ? JSON.stringify([{ id: 'bu-already-exists' }])
          : JSON.stringify([{ revision: 'dolt-rev-2' }]),
      runCreate: () => {
        createCount += 1;
        return JSON.stringify({ id: 'bu-should-not-be-created' });
      },
    });

    expect(result.kind).toBe('reused');
    if (result.kind !== 'reused') throw new Error('unreachable');
    expect(result.beadId).toBe('bu-already-exists');
    expect(createCount).toBe(0);
    expect(readMaterializationRecordFile(dir)?.beadId).toBe('bu-already-exists');
    expect(readMaterializationRecordFile(dir)?.origin).toBe('reused');
  });

  it('renders Unknown, never a partial success, when bd is missing (AC5)', () => {
    const dir = stateDir();
    const result = materializeWorkItem({
      targetRepoRoot: '/repo/butlers',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      ...recordIo(dir),
      runQuery: () => {
        const error = new Error('spawn bd ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      },
    });

    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('bd CLI is not available');
    expect(readMaterializationRecordFile(dir)).toBeNull();
  });

  it('renders Unknown, never a partial success, when Bead creation itself fails (AC5)', () => {
    const dir = stateDir();
    const result = materializeWorkItem({
      targetRepoRoot: '/repo/butlers',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      ...recordIo(dir),
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-1' }]),
      runCreate: () => {
        throw new Error('dolt write conflict');
      },
    });

    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('the Beads mutation failed');
    expect(readMaterializationRecordFile(dir)).toBeNull();
  });

  it('names the found Bead in Unknown when its record cannot be persisted, distinct from a partial-create failure (AC5)', () => {
    const dir = stateDir();
    const result = materializeWorkItem({
      targetRepoRoot: '/repo/butlers',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      readRecord: () => null,
      writeRecord: () => {
        throw new Error('disk full');
      },
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref')
          ? JSON.stringify([{ id: 'bu-already-exists' }])
          : JSON.stringify([{ revision: 'dolt-rev-2' }]),
      runCreate: () => {
        throw new Error('should not be called: Bead already exists');
      },
    });

    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('an existing materialized Bead bu-already-exists was found');
    expect(result.beadId).toBe('bu-already-exists');
    expect(readMaterializationRecordFile(dir)).toBeNull();
  });

  it('names the created Bead in Unknown when its record cannot be persisted, distinct from a partial-create failure (AC5)', () => {
    const dir = stateDir();
    const result = materializeWorkItem({
      targetRepoRoot: '/repo/butlers',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      readRecord: () => null,
      writeRecord: () => {
        throw new Error('disk full');
      },
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-1' }]),
      runCreate: () => JSON.stringify({ id: 'bu-created-then-unpersisted' }),
    });

    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('Bead bu-created-then-unpersisted was created but its record could not be persisted');
    expect(result.beadId).toBe('bu-created-then-unpersisted');
    expect(readMaterializationRecordFile(dir)).toBeNull();
  });

  it('renders Unknown on a target-repository mismatch (AC5) without calling bd', () => {
    const dir = stateDir();
    let called = false;
    const result = materializeWorkItem({
      targetRepoRoot: '/repo/a-different-repo',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      ...recordIo(dir),
      runQuery: () => {
        called = true;
        return '[]';
      },
      runCreate: () => {
        called = true;
        return JSON.stringify({ id: 'bu-x' });
      },
    });

    expect(result.kind).toBe('unknown');
    if (result.kind !== 'unknown') throw new Error('unreachable');
    expect(result.reason).toContain('target repository mismatch');
    expect(called).toBe(false);
  });

  it('renders Unknown rather than silently re-creating when the record file is corrupt', () => {
    const dir = stateDir();
    writeMaterializationRecordFile(dir, {
      beadId: 'bu-x',
      externalRef: MATERIALIZATION_EXTERNAL_REF,
      targetRepoRoot: '/repo/butlers',
      createdAt: NOW,
      doltRevisionAtCreation: 'rev',
      attribution: 'test-actor',
    });
    // corrupt the file after writing a valid one
    const path = materializationRecordPath(dir);
    const original = readFileSync(path, 'utf8');
    expect(original.length).toBeGreaterThan(0);
    writeMaterializationRecordFile(dir, JSON.parse('{"beadId":123}') as never);

    const result = materializeWorkItem({
      targetRepoRoot: '/repo/butlers',
      packet: PACKET,
      attribution: 'test-actor',
      now: () => NOW,
      ...recordIo(dir),
    });

    expect(result.kind).toBe('unknown');
  });

  it('mutation check: a falsified idempotency guard would let a duplicate create through', () => {
    const dir = stateDir();
    let createCount = 0;
    const materialize = () =>
      materializeWorkItem({
        targetRepoRoot: '/repo/butlers',
        packet: PACKET,
        attribution: 'test-actor',
        now: () => NOW,
        // deliberately falsified: never reads back what was written
        readRecord: () => null,
        writeRecord: (record) => writeMaterializationRecordFile(dir, record),
        runQuery: (_repoRoot, sql) =>
          sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-1' }]),
        runCreate: () => {
          createCount += 1;
          return JSON.stringify({ id: `bu-dup-${createCount}` });
        },
      });

    materialize();
    materialize();
    expect(createCount).toBe(2);
  });
});

describe('rollbackMaterializedWorkItem', () => {
  it('closes the recorded Bead with attribution and clears the local record', () => {
    const dir = stateDir();
    writeMaterializationRecordFile(dir, {
      beadId: 'bu-materialized1',
      externalRef: MATERIALIZATION_EXTERNAL_REF,
      targetRepoRoot: '/repo/butlers',
      createdAt: NOW,
      doltRevisionAtCreation: 'dolt-rev-1',
      attribution: 'test-actor',
    });

    const closeCalls: unknown[] = [];
    const result = rollbackMaterializedWorkItem({
      targetRepoRoot: '/repo/butlers',
      attribution: 'test-actor',
      reason: 'POC verification cleanup',
      ...recordIo(dir),
      runClose: (repoRoot, beadId, reason, attribution) => {
        closeCalls.push({ repoRoot, beadId, reason, attribution });
        return JSON.stringify({ id: beadId, status: 'closed' });
      },
    });

    expect(result).toEqual({ kind: 'rolled-back', beadId: 'bu-materialized1' });
    expect(closeCalls).toEqual([
      {
        repoRoot: '/repo/butlers',
        beadId: 'bu-materialized1',
        reason: 'POC verification cleanup',
        attribution: 'test-actor',
      },
    ]);
    expect(readMaterializationRecordFile(dir)).toBeNull();
  });

  it('reports no-materialization when nothing was ever recorded', () => {
    const dir = stateDir();
    const result = rollbackMaterializedWorkItem({
      targetRepoRoot: '/repo/butlers',
      attribution: 'test-actor',
      reason: 'cleanup',
      ...recordIo(dir),
    });
    expect(result).toEqual({ kind: 'no-materialization' });
  });

  it('renders Unknown when closing fails, and never clears the record on failure', () => {
    const dir = stateDir();
    writeMaterializationRecordFile(dir, {
      beadId: 'bu-materialized1',
      externalRef: MATERIALIZATION_EXTERNAL_REF,
      targetRepoRoot: '/repo/butlers',
      createdAt: NOW,
      doltRevisionAtCreation: 'dolt-rev-1',
      attribution: 'test-actor',
    });

    const result = rollbackMaterializedWorkItem({
      targetRepoRoot: '/repo/butlers',
      attribution: 'test-actor',
      reason: 'cleanup',
      ...recordIo(dir),
      runClose: () => {
        throw new Error('bd close failed');
      },
    });

    expect(result.kind).toBe('unknown');
    expect(readMaterializationRecordFile(dir)?.beadId).toBe('bu-materialized1');
  });
});
