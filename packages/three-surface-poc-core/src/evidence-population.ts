// Deliberate seam, not dead code: no module in this package calls it. Its
// consumers, by path:line, are ones a census over code cannot see:
//   docs/design/POLARIS-M1-PAGE-SIZE-FUNNEL.md:382-383 (candidate design note,
//     binds nothing) -- any new page-size evidence record carries a `population`
//     block derived with `derivePopulationBlock` from this path;
//   docs/evidence/pwb-m1-polaris-lane-a-population-2026-09-23.json:8 -- its
//     measurementScript requires this module's compiled file
//     (dist/evidence-population.js) by path.
// Keep the name, the path and the barrel export.
//
// The population block every retained page-size evidence record carries
// (N3 slice 4, bead syzygy-u05.3, dossier "Population block in the M1
// measurement script and evidence shape"): item count, distinct claim-id
// count and the observed Butlers revision, so a reader can attribute page
// byte growth to population growth without reconstructing it by hand
// (V1-F2/F4 -- the prior pass had to do exactly that reconstruction).
//
// Both counts are read from data the daemon already computed and served --
// `ProjectShape.counts.items` (the model's own item population) and the
// distinct `data-claim-id` values actually rendered on the /polaris page
// (the population that spends bytes) -- never a new observation, never a
// new limit, and never re-derived by scanning a source body. The Butlers
// revision is not carried by the model at all; the caller reads it (for
// example from the daemon's own "Observed revision" startup line, or
// `git rev-parse HEAD` in the observed Butlers worktree) and passes it in.

// A structural view of `ProjectShape` narrowed to the one field this module
// reads (`counts.items` on the observed variant). Narrower than importing
// the full discriminated union from project-shape-model.ts on purpose: the
// real `ProjectShape` satisfies this shape structurally, so a caller can
// pass the model's actual output unchanged, while a test fixture needs only
// the two fields this module looks at.
export interface ProjectShapePopulationView {
  readonly kind: string;
  readonly counts?: {
    readonly items: number;
  };
}

interface PopulationBlock {
  readonly itemCount: number;
  readonly claimIdCount: number;
  readonly butlersRevision: string;
}

interface PopulationSources {
  // The `projectShape` field of the parsed JSON body of GET /api/poc (or
  // any object of that shape) -- the model's own declared population,
  // never reconstructed from HTML.
  readonly projectShape: ProjectShapePopulationView;
  // The rendered /polaris HTML (direct or tailnet form; both carry the
  // same claim-tuple population) -- the population that spends page bytes.
  readonly polarisHtml: string;
  // git rev-parse HEAD of the observed Butlers repository. Not part of the
  // model; the caller supplies it.
  readonly butlersRevision: string;
}

const CLAIM_ID_ATTR = /\sdata-claim-id="([^"]*)"/g;

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/** Item count the model itself declares. Zero when the shape was not
 * observed -- an Unknown project shape declares no item population, and
 * zero is the true count rather than a placeholder for "not measured". */
export function modelItemCount(shape: ProjectShapePopulationView): number {
  return shape.kind === 'observed' && shape.counts !== undefined ? shape.counts.items : 0;
}

/** Distinct `data-claim-id` values actually rendered on the page. */
export function renderedClaimIdCount(polarisHtml: string): number {
  const ids = new Set<string>();
  for (const match of polarisHtml.matchAll(CLAIM_ID_ATTR)) ids.add(decodeHtmlAttr(match[1] ?? ''));
  return ids.size;
}

export function derivePopulationBlock(sources: PopulationSources): PopulationBlock {
  return {
    itemCount: modelItemCount(sources.projectShape),
    claimIdCount: renderedClaimIdCount(sources.polarisHtml),
    butlersRevision: sources.butlersRevision,
  };
}
