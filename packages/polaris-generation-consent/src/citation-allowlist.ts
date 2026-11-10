/** Decisions files, by path under the decisions directory and the sha256 of their exact bytes, whose exact tooling citations the
 * withdrawal sweeps also read set aside (`sweepText` in `package-reader.ts`). Every decisions file is swept whole, a stem counting
 * anywhere, inside a script name or a package path too; an allowlisted file is swept a second time with its citations set aside, and
 * refuses when either reading names an act (syzygy-bpyt.1.24, owner answer A to consent-withdrawal-knobs). An entry can therefore add
 * a refusal (a set-aside citation that joins a stem) and never remove one: when `real-tree.test.ts` refuses, reword the file. Each
 * entry is reviewed with its bytes, and its reason says what the file cites and why it is no withdrawal; change one byte of the file
 * and the entry stops matching. Never widen a filter. Seeded empty: no file on main refused when this landed. */
export const CITATION_ALLOWLIST: ReadonlyMap<string, { readonly sha256: string; readonly reason: string }> = new Map([]);
