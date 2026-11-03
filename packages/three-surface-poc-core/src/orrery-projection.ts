import type { CodeLanguageClassification, CodeStructureResult } from './code-structure.js';

export interface OrreryDeclaredMapping {
  readonly id: string;
  readonly path: string;
  readonly capabilityId: string;
}

interface OrreryDistrict {
  readonly id: string;
  readonly path: string;
  readonly fileCount: number;
  readonly totalBytes: number;
  readonly languages: readonly CodeLanguageClassification[];
}

interface OrreryMappedRegion {
  readonly id: string;
  readonly path: string;
  readonly capabilityId: string;
  readonly sizeBytes: number;
}

interface OrreryProjectionObserved {
  readonly kind: 'observed';
  readonly revision: string;
  readonly districts: readonly OrreryDistrict[];
  readonly mappedRegions: readonly OrreryMappedRegion[];
  readonly mappedFileCount: number;
  readonly unmappedFileCount: number;
  readonly totalFileCount: number;
}

interface OrreryProjectionUnknown {
  readonly kind: 'unknown';
  readonly reason: string;
  /** Denominator from the independent code-structure observation. */
  readonly observedFileCount?: number;
  readonly mappedFileCount?: number;
  readonly unmappedFileCount?: number;
  readonly totalFileCount?: number;
}

export type OrreryProjection = OrreryProjectionObserved | OrreryProjectionUnknown;

function topLevelDirectory(path: string): string {
  const slash = path.indexOf('/');
  return slash === -1 ? '(root)' : path.slice(0, slash);
}

/**
 * Deterministic (POC-REQ-050): a pure fold over the sorted, revision-bound
 * file inventory. Grouping is by declared directory structure and the
 * caller-supplied declared mappings only — no inferred edges (POC-REQ-052).
 */
export function projectOrrery(
  structure: CodeStructureResult,
  declaredMappings: readonly OrreryDeclaredMapping[],
): OrreryProjection {
  if (structure.kind === 'unknown') {
    return { kind: 'unknown', reason: structure.reason };
  }

  const observedPaths = new Set(structure.files.map((file) => file.path));
  const unsupportedMapping = declaredMappings.find((mapping) => !observedPaths.has(mapping.path));
  if (unsupportedMapping !== undefined) {
    return {
      kind: 'unknown',
      reason: `declared Orrery mapping ${unsupportedMapping.path} has no observed file at this revision`,
      observedFileCount: structure.files.length,
      mappedFileCount: 0,
      unmappedFileCount: structure.files.length,
      totalFileCount: structure.files.length,
    };
  }

  const mappingByPath = new Map(declaredMappings.map((mapping) => [mapping.path, mapping]));
  const districtByPath = new Map<string, { fileCount: number; totalBytes: number; languages: Set<CodeLanguageClassification> }>();
  const mappedRegions: OrreryMappedRegion[] = [];
  let mappedFileCount = 0;

  for (const file of structure.files) {
    const districtPath = topLevelDirectory(file.path);
    const existing = districtByPath.get(districtPath) ?? {
      fileCount: 0,
      totalBytes: 0,
      languages: new Set<CodeLanguageClassification>(),
    };
    existing.fileCount += 1;
    existing.totalBytes += file.sizeBytes;
    existing.languages.add(file.language);
    districtByPath.set(districtPath, existing);

    const mapping = mappingByPath.get(file.path);
    if (mapping !== undefined) {
      mappedFileCount += 1;
      mappedRegions.push({
        id: mapping.id,
        path: mapping.path,
        capabilityId: mapping.capabilityId,
        sizeBytes: file.sizeBytes,
      });
    }
  }

  const districts: OrreryDistrict[] = [...districtByPath.entries()].map(([path, value]) => ({
    id: `district:${path}`,
    path,
    fileCount: value.fileCount,
    totalBytes: value.totalBytes,
    languages: [...value.languages].sort(),
  }));

  return {
    kind: 'observed',
    revision: structure.provenance.revision,
    districts,
    mappedRegions,
    mappedFileCount,
    unmappedFileCount: structure.files.length - mappedFileCount,
    totalFileCount: structure.files.length,
  };
}
