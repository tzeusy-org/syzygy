// Recorded mutation run over finding details that name draft values (syzygy-3efd.93): the identity form at each builder fixed, and the
// screen every detail passes before check reports and records it.
// Usage: node finding_names_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only <id>,<id>]
// Each mutant replaces one fragment that occurs exactly once in its file, runs the test files of its group, and restores the source in
// `finally`. `--dry` only asserts that every fragment occurs exactly once. Never edit or commit while it runs. Adapted from
// docs/evidence/syzygy-3efd-33/code_marks_mutation.mjs, without the browser.
// Run 1 (at 23f77f856) killed 10 of 12. Repairs: an unviewed relationship of a path-like identity (unviewed-relationship-unguarded), and a
// screen whose body rule matches only across a detail's words (detail-not-screened-whole).
// Run 2 (at 72f8cf464, finding-names-mutation-run2-2026-11-28.json) killed 12 of 12.
// Review R93 (REVISE): one mutant per builder line that names a draft identity (40), the delimiter class, the denied-word rule, a discarded
// result and the per-call memo; the four screen fragments that rewrite moved keep their ids. Run 3 (at fbaec8e2c,
// finding-names-mutation-run3-2026-11-29.json) killed 49 of 60. Six of the survivors are killed by site cases added after it (units,
// witnesses, containments, the why section, a v4 diagram, a route step); five are recorded equivalent, each a line no value but a
// handle reaches because the schema refuses any other first. Run 4 (at ce4c6de8e, finding-names-mutation-run4-2026-11-29.json) killed 55 of
// 55, with those five equivalents.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const onlyAt = args.indexOf('--only');
const only = onlyAt === -1 ? null : new Set(args[onlyAt + 1].split(','));
const [root, out, scratch] = args.filter((arg, i) => !arg.startsWith('--') && (onlyAt === -1 || i !== onlyAt + 1));
if (!root || !out || !scratch) throw new Error('usage: node finding_names_mutation.mjs <worktree> <out.json> <scratch-dir> [--dry] [--only ids]');
fs.mkdirSync(scratch, { recursive: true });

const PKG = 'packages/polaris-dossier/src';
const NAMES = `${PKG}/finding-names.ts`;
const MODEL = `${PKG}/system-model.ts`;
const DERIVE = `${PKG}/check-derive.ts`;
const CHECK = `${PKG}/check.ts`;
const SCENARIOS = `${PKG}/finding-names.test.ts`;
const TESTS = {
  [NAMES]: [SCENARIOS],
  [MODEL]: [SCENARIOS, `${PKG}/system-model.test.ts`],
  [DERIVE]: [SCENARIOS],
  [CHECK]: [SCENARIOS],
  [`${PKG}/walk.ts`]: [SCENARIOS],
  [`${PKG}/derived-base.ts`]: [SCENARIOS],
  [`${PKG}/containment.ts`]: [SCENARIOS],
  [`${PKG}/figure-plan.ts`]: [SCENARIOS],
};
const TIMEOUT_MS = 600_000;

const MUTANTS = [
  ['unviewed-element-unguarded', MODEL, "shown.elements.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}:", "shown.elements.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${id}:"],
  ['unviewed-relationship-unguarded', MODEL, "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}:", "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${id}:"],
  ['unviewed-named-by-path-always', MODEL, "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}:", "shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${at}:"],
  ['any-string-is-a-handle', NAMES, "typeof value === 'string' && checkShape({ root: handle, defs: {} }, value).length === 0", "typeof value === 'string'"],
  ['no-string-is-a-handle', NAMES, "typeof value === 'string' && checkShape({ root: handle, defs: {} }, value).length === 0", 'false'],
  ['words-not-screened', NAMES, "clear(detail, false) && detail.split(DETAIL_WORD_BREAK).every((word) => word.length === 0 || clear(word, true));", 'clear(detail, false);'],
  ['detail-not-screened-whole', NAMES, 'const admitted = (detail: string): boolean => clear(detail, false) && detail.split(', 'const admitted = (detail: string): boolean => detail.split('],
  ['undecided-admitted', NAMES, "try { ok = admit(value) === 'admitted' && !(word && deniedWord(value)); }", "try { ok = admit(value) !== 'withheld' && !(word && deniedWord(value)); }"],
  ['backstop-dropped', CHECK, "  const screenedFindings = screenFindingDetails(findings, admitOf(screen), (word) => screen.screenPath(word) === 'denied-path');\n  for (let k = 0; k < screenedFindings.length; k++) findings[k] = screenedFindings[k]!;\n", ''],
  ['duplicate-id-unguarded', DERIVE, 'detail: `the identity ${identityWords(id)} is already used at ${first}`', 'detail: `the identity ${JSON.stringify(id)} is already used at ${first}`'],
  ['dive-section-unguarded', DERIVE, "at: `$.deepDives[${i}].sectionId`, detail: `no section has the identity ${identityWords(sectionId)}`", "at: `$.deepDives[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}`"],
  ['asset-unguarded', DERIVE, "${isHandle(assetId) ? JSON.stringify(assetId) : 'the identity named here'} is not this asset", '${JSON.stringify(assetId)} is not this asset'],
  // Review R93 finding 8: one mutant per builder line that names a draft identity, its guard removed (`identityWords(x)` becomes
  // `JSON.stringify(x)`, `handleOr(x, fallback)` becomes `String(x)`, `isHandle(x)` becomes `true`), generated from the branch's diff.
  ["check-derive-site-1", `${PKG}/check-derive.ts`, "    else add({ kind: 'duplicate-id', at, detail: `the identity ${identityWords(id)} is already used at ${first}` });\n", "    else add({ kind: 'duplicate-id', at, detail: `the identity ${JSON.stringify(id)} is already used at ${first}` });\n"],
  ["check-derive-site-2", `${PKG}/check-derive.ts`, "      add({ kind: located.kind, at: `${block.at}.${block.textKey}`, blockId, citationId, detail: `quotation ${index + 1} ${QUOTE_FAILURE[located.kind]} (citation ${identityWords(citationId)})` });\n", "      add({ kind: located.kind, at: `${block.at}.${block.textKey}`, blockId, citationId, detail: `quotation ${index + 1} ${QUOTE_FAILURE[located.kind]} (citation ${JSON.stringify(citationId)})` });\n"],
  ["check-derive-site-3", `${PKG}/check-derive.ts`, "        if (!known.has(target)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].${uses}[${j}].${end}`, detail: `${name}: no ${owner} of this diagram has the identity ${identityWords(target)}` });\n", "        if (!known.has(target)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].${uses}[${j}].${end}`, detail: `${name}: no ${owner} of this diagram has the identity ${JSON.stringify(target)}` });\n"],
  ["check-derive-site-4", `${PKG}/check-derive.ts`, "        ? `${name}: no message names the participant ${identityWords(id)} as its sender or receiver; every participant sends or receives a message`\n", "        ? `${name}: no message names the participant ${JSON.stringify(id)} as its sender or receiver; every participant sends or receives a message`\n"],
  ["check-derive-site-5", `${PKG}/check-derive.ts`, "        : `${name}: no step names the lane ${identityWords(id)}; every lane holds a step` });\n", "        : `${name}: no step names the lane ${JSON.stringify(id)}; every lane holds a step` });\n"],
  ["check-derive-site-6", `${PKG}/check-derive.ts`, "  (isHandle(element['id']) ? `the ${noun} ${JSON.stringify(element['id'])}` : `the ${noun} at ${at}`);\n", "  (true ? `the ${noun} ${JSON.stringify(element['id'])}` : `the ${noun} at ${at}`);\n"],
  ["check-derive-site-8", `${PKG}/check-derive.ts`, "    findings.push({ kind: 'hero', at, detail: `${isHandle(hero.value) ? hero.value : at}: the hero is a figure homed on the overview` });\n", "    findings.push({ kind: 'hero', at, detail: `${true ? hero.value : at}: the hero is a figure homed on the overview` });\n"],
  ["check-derive-site-9", `${PKG}/check-derive.ts`, "    findings.push({ kind: 'hero', at, detail: `${isHandle(hero.value) ? hero.value : at}: the hero is a figure of a graph kind` });\n", "    findings.push({ kind: 'hero', at, detail: `${true ? hero.value : at}: the hero is a figure of a graph kind` });\n"],
  ["check-derive-site-10", `${PKG}/check-derive.ts`, "    add({ kind, at, detail: !isHandle(id) ? detail : `the diagram ${JSON.stringify(id)}: ${detail}` });\n", "    add({ kind, at, detail: !true ? detail : `the diagram ${JSON.stringify(id)}: ${detail}` });\n"],
  ["check-derive-site-11", `${PKG}/check-derive.ts`, "      if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].sectionId`, detail: `no section has the identity ${identityWords(sectionId)}` });\n", "      if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}` });\n"],
  ["check-derive-site-12", `${PKG}/check-derive.ts`, "    if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.deepDives[${i}].sectionId`, detail: `no section has the identity ${identityWords(sectionId)}` });\n", "    if (sectionId !== undefined && !sectionIds.has(sectionId)) add({ kind: 'unresolved-reference', at: `$.deepDives[${i}].sectionId`, detail: `no section has the identity ${JSON.stringify(sectionId)}` });\n"],
  ["check-derive-site-13", `${PKG}/check-derive.ts`, "      else if (!(kind === 'section' ? sectionIds : diveIds).has(target)) diagramFinding(diagram, `${at}.home.target`, `no ${kind === 'section' ? 'section' : 'deep dive'} has the identity ${identityWords(target)}`, 'unresolved-reference');\n", "      else if (!(kind === 'section' ? sectionIds : diveIds).has(target)) diagramFinding(diagram, `${at}.home.target`, `no ${kind === 'section' ? 'section' : 'deep dive'} has the identity ${JSON.stringify(target)}`, 'unresolved-reference');\n"],
  ["check-derive-site-14", `${PKG}/check-derive.ts`, "        if (target !== undefined && !nodes.has(target)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].edges[${j}].${end}`, detail: `no node of this diagram has the identity ${identityWords(target)}` });\n", "        if (target !== undefined && !nodes.has(target)) add({ kind: 'unresolved-reference', at: `$.diagrams[${i}].edges[${j}].${end}`, detail: `no node of this diagram has the identity ${JSON.stringify(target)}` });\n"],
  ["check-derive-site-15", `${PKG}/check-derive.ts`, "        if (typeof assetId === 'string' && !own.has(assetId)) add({ kind: 'unresolved-reference', at: `$.${part}[${i}].disposition.assetIds[${k}]`, detail: `${isHandle(assetId) ? JSON.stringify(assetId) : 'the identity named here'} is not this asset or a part of it` });\n", "        if (typeof assetId === 'string' && !own.has(assetId)) add({ kind: 'unresolved-reference', at: `$.${part}[${i}].disposition.assetIds[${k}]`, detail: `${true ? JSON.stringify(assetId) : 'the identity named here'} is not this asset or a part of it` });\n"],
  ["check-derive-site-16", `${PKG}/check-derive.ts`, "        if (!diagramSections.has(named)) add({ kind: 'repeats-diagram', at: `${at}.repeatsDiagram`, detail: `no diagram has the identity ${identityWords(named)}` });\n", "        if (!diagramSections.has(named)) add({ kind: 'repeats-diagram', at: `${at}.repeatsDiagram`, detail: `no diagram has the identity ${JSON.stringify(named)}` });\n"],
  ["check-derive-site-17", `${PKG}/check-derive.ts`, "        else if (diagramSections.get(named) !== sectionId) add({ kind: 'repeats-diagram', at: `${at}.repeatsDiagram`, detail: `the diagram ${identityWords(named)} is not in this list's section; a list repeats a diagram of its own section` });\n", "        else if (diagramSections.get(named) !== sectionId) add({ kind: 'repeats-diagram', at: `${at}.repeatsDiagram`, detail: `the diagram ${JSON.stringify(named)} is not in this list's section; a list repeats a diagram of its own section` });\n"],
  ["check-derive-site-18", `${PKG}/check-derive.ts`, "        if (!sectionIds.has(id)) add({ kind: 'unresolved-reference', at: `$.poles[${i}].sections[${k}]`, detail: `no section has the identity ${identityWords(id)}` });\n", "        if (!sectionIds.has(id)) add({ kind: 'unresolved-reference', at: `$.poles[${i}].sections[${k}]`, detail: `no section has the identity ${JSON.stringify(id)}` });\n"],
  ["check-derive-site-19", `${PKG}/check-derive.ts`, "      if (home.length === 0) add({ kind: 'pole', at: `$.sections[${i}]`, detail: `the section ${identityWords(id)} is in no Pole; with Poles, every section is in exactly one` });\n", "      if (home.length === 0) add({ kind: 'pole', at: `$.sections[${i}]`, detail: `the section ${JSON.stringify(id)} is in no Pole; with Poles, every section is in exactly one` });\n"],
  ["check-derive-site-20", `${PKG}/check-derive.ts`, "      else if (home.length > 1) add({ kind: 'pole', at: `$.sections[${i}]`, detail: `the section ${identityWords(id)} is in ${home.length} Poles (${home.map((n) => `$.poles[${n}]`).join(', ')}); every section is in exactly one` });\n", "      else if (home.length > 1) add({ kind: 'pole', at: `$.sections[${i}]`, detail: `the section ${JSON.stringify(id)} is in ${home.length} Poles (${home.map((n) => `$.poles[${n}]`).join(', ')}); every section is in exactly one` });\n"],
  ["check-derive-site-21", `${PKG}/check-derive.ts`, "    else if (!sectionIds.has(why)) add({ kind: 'pole', at: '$.whySection', detail: `\\`whySection\\` names ${isHandle(why) ? JSON.stringify(why) : 'a value'}, which is no section of this draft` });\n", "    else if (!sectionIds.has(why)) add({ kind: 'pole', at: '$.whySection', detail: `\\`whySection\\` names ${true ? JSON.stringify(why) : 'a value'}, which is no section of this draft` });\n"],
  ["check-derive-site-22", `${PKG}/check-derive.ts`, "    add({ kind: 'unresolved-reference', at: '$.whySection', detail: `no section has the identity ${identityWords(text(doc['whySection']))}` });\n", "    add({ kind: 'unresolved-reference', at: '$.whySection', detail: `no section has the identity ${JSON.stringify(text(doc['whySection']))}` });\n"],
  ["check-derive-site-23", `${PKG}/check-derive.ts`, "      if (!(kind === 'section' ? sectionIds : diveIds).has(target)) add({ kind: 'unresolved-reference', at: `${at}.see.target`, detail: `no ${kind === 'section' ? 'section' : 'deep dive'} has the identity ${identityWords(target)}` });\n", "      if (!(kind === 'section' ? sectionIds : diveIds).has(target)) add({ kind: 'unresolved-reference', at: `${at}.see.target`, detail: `no ${kind === 'section' ? 'section' : 'deep dive'} has the identity ${JSON.stringify(target)}` });\n"],
  ["system-model-site-1", `${PKG}/system-model.ts`, "  const idOr = (value: Doc, at: string): string => handleOr(value['id'], at);\n", "  const idOr = (value: Doc, at: string): string => String(value['id']);\n"],
  ["system-model-site-3", `${PKG}/system-model.ts`, "      if (fault !== undefined) out.push({ kind: 'unit-reference', at: `${at}.${UNIT_FIELD}`, detail: `the element ${identityWords(element['id'])}: its ${unit.kind} unit names no unit of that kind: ${UNIT_FAULT_WORDS[fault]}` });\n", "      if (fault !== undefined) out.push({ kind: 'unit-reference', at: `${at}.${UNIT_FIELD}`, detail: `the element ${JSON.stringify(element['id'])}: its ${unit.kind} unit names no unit of that kind: ${UNIT_FAULT_WORDS[fault]}` });\n"],
  ["system-model-site-5", `${PKG}/system-model.ts`, "      if (id !== undefined && !shown.elements.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}: every element and relationship of the model is shown by at least one view` });\n", "      if (id !== undefined && !shown.elements.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${String(id)}: every element and relationship of the model is shown by at least one view` });\n"],
  ["system-model-site-6", `${PKG}/system-model.ts`, "      if (id !== undefined && !shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${handleOr(id, at)}: every element and relationship of the model is shown by at least one view` });\n", "      if (id !== undefined && !shown.relationships.has(id)) out.push({ kind: 'model-unviewed', at, detail: `${String(id)}: every element and relationship of the model is shown by at least one view` });\n"],
  ["containment-site-1", `${PKG}/containment.ts`, "  (isHandle(group['id']) ? `the group ${JSON.stringify(group['id'])}` : `the group at ${at}`);\n", "  (true ? `the group ${JSON.stringify(group['id'])}` : `the group at ${at}`);\n"],
  ["figure-plan-site-1", `${PKG}/figure-plan.ts`, "    if (resolved && !homed) findings.push({ kind: 'figure-plan', at: `${at}.figure`, detail: `${handleOr(figure, `${at}.figure`)}: a planned figure is homed at its plan entry's place` });\n", "    if (resolved && !homed) findings.push({ kind: 'figure-plan', at: `${at}.figure`, detail: `${String(figure)}: a planned figure is homed at its plan entry's place` });\n"],
  ["figure-plan-site-2", `${PKG}/figure-plan.ts`, "    if (diagram['kind'] !== kind) findings.push({ kind: 'figure-plan', at: `${at}.figure`, detail: `${handleOr(figure, `${at}.figure`)}: a planned figure is of the kind its plan entry names` });\n", "    if (diagram['kind'] !== kind) findings.push({ kind: 'figure-plan', at: `${at}.figure`, detail: `${String(figure)}: a planned figure is of the kind its plan entry names` });\n"],
  ["walk-site-1", `${PKG}/walk.ts`, "      if (!homedAt(diagram, place, part)) out.push({ kind: 'walk', at: `${at}.figure`, detail: WALK_DETAIL.home(handleOr(read.figure, `${at}.figure`)) });\n", "      if (!homedAt(diagram, place, part)) out.push({ kind: 'walk', at: `${at}.figure`, detail: WALK_DETAIL.home(String(read.figure)) });\n"],
  ["walk-site-2", `${PKG}/walk.ts`, "      if (!GRAPH_KINDS.has(diagram['kind'])) out.push({ kind: 'walk', at: `${at}.figure`, detail: WALK_DETAIL.kind(handleOr(read.figure, `${at}.figure`)) });\n", "      if (!GRAPH_KINDS.has(diagram['kind'])) out.push({ kind: 'walk', at: `${at}.figure`, detail: WALK_DETAIL.kind(String(read.figure)) });\n"],
  ["walk-site-3", `${PKG}/walk.ts`, "          ? (drawn.has(element.id) ? { key: `element:${element.id}`, name: handleOr(element.id, `${stepAt}.element`) } : 'absent')\n", "          ? (drawn.has(element.id) ? { key: `element:${element.id}`, name: String(element.id) } : 'absent')\n"],
  ["walk-site-4", `${PKG}/walk.ts`, "        if (resolved === 'absent') out.push({ kind: 'walk', at: `${stepAt}.element`, detail: WALK_DETAIL.element(k, handleOr(read.figure, `${at}.figure`)) });\n", "        if (resolved === 'absent') out.push({ kind: 'walk', at: `${stepAt}.element`, detail: WALK_DETAIL.element(k, String(read.figure)) });\n"],
  ["walk-site-5", `${PKG}/walk.ts`, "      else if (list(block['citations']).length === 0) out.push({ kind: 'walk', at: `${stepAt}.block`, detail: WALK_DETAIL.uncited(handleOr(step.block, `${stepAt}.block`)) });\n", "      else if (list(block['citations']).length === 0) out.push({ kind: 'walk', at: `${stepAt}.block`, detail: WALK_DETAIL.uncited(String(step.block)) });\n"],
  ["derived-base-site-1", `${PKG}/derived-base.ts`, "      const id = handleOr(relationship['id'], `$.${MODEL_FIELD}.relationships[${k}]`);\n", "      const id = String(relationship['id']);\n"],
  ['denied-word-ignored', CHECK, "(word) => screen.screenPath(word) === 'denied-path');", '() => false);'],
  ['screen-result-discarded', CHECK, 'for (let k = 0; k < screenedFindings.length; k++) findings[k] = screenedFindings[k]!;', ''],
  ['delimiter-backtick-dropped', NAMES, 'export const DETAIL_WORD_BREAK = /[\\s"`\'(),;]+/u;', 'export const DETAIL_WORD_BREAK = /[\\s"\'(),;]+/u;'],
  ['delimiter-parentheses-dropped', NAMES, 'export const DETAIL_WORD_BREAK = /[\\s"`\'(),;]+/u;', 'export const DETAIL_WORD_BREAK = /[\\s"`\',;]+/u;'],
  ['delimiter-comma-dropped', NAMES, 'export const DETAIL_WORD_BREAK = /[\\s"`\'(),;]+/u;', 'export const DETAIL_WORD_BREAK = /[\\s"`\'();]+/u;'],
  ['delimiter-semicolon-dropped', NAMES, 'export const DETAIL_WORD_BREAK = /[\\s"`\'(),;]+/u;', 'export const DETAIL_WORD_BREAK = /[\\s"`\'(),]+/u;'],
  ['memo-shared-between-forms', NAMES, 'const key = `${word ? \'w\' : \'d\'}${value}`;', 'const key = value;'],
  ['denied-throw-admitted', NAMES, '} catch { ok = false; }', '} catch { ok = true; }'],
].filter(([id]) => only === null || only.has(id));

// A mutant no test can kill, with the reason; recorded, never run and never counted as killed.
const EQUIVALENT = [
  { id: "check-derive-site-7", file: `${PKG}/check-derive.ts`, old: "      detail: `${diagramName}: no ${decision.factKind} fact joins the units of group ${handleOr(id, at)} and the group it is drawn in, in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the nesting or its groups' units` }])),\n", new: "      detail: `${diagramName}: no ${decision.factKind} fact joins the units of group ${String(id)} and the group it is drawn in, in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the nesting or its groups' units` }])),\n",
    reason: "A containment nesting is decided only where the draft draws no schema finding (check.ts, `containmentDecisions = schemaFault ? { ...decisions, nestings: [] }`), and a group identity that is not a handle is a schema finding: no value but a handle reaches this line, and a handle is named as before." },
  { id: "system-model-site-2", file: `${PKG}/system-model.ts`, old: "    if (parentFaults.has(j)) out.push({ kind: 'unresolved-reference', at: `${at}.parent`, detail: `${handleOr(element['parent'], `${at}.parent`)}: no element of the model has this identity` });\n", new: "    if (parentFaults.has(j)) out.push({ kind: 'unresolved-reference', at: `${at}.parent`, detail: `${String(element['parent'])}: no element of the model has this identity` });\n",
    reason: "An unresolved parent is recorded only where its member is clean (`clean(`${at}.parent`)`), and a parent that is not a handle draws the schema finding there: no value but a handle reaches this line." },
  { id: "system-model-site-4", file: `${PKG}/system-model.ts`, old: "      if (named !== undefined && !index.elementById.has(named)) { resolved = false; out.push({ kind: 'unresolved-reference', at: `${at}.${end}`, detail: `${handleOr(named, `${at}.${end}`)}: no element of the model has this identity` }); }\n", new: "      if (named !== undefined && !index.elementById.has(named)) { resolved = false; out.push({ kind: 'unresolved-reference', at: `${at}.${end}`, detail: `${String(named)}: no element of the model has this identity` }); }\n",
    reason: "A relationship's ends are read only where the relationship is clean (`if (!clean(at)) continue;`), and an end that is not a handle draws the schema finding there: no value but a handle reaches this line." },
  { id: "system-model-site-7", file: `${PKG}/system-model.ts`, old: "      detail: `the relationship ${identityWords(id)}, relation ${relation}: no ${decision.factKind} fact joins this edge's two units in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the arrow, its relation or its units` }])),\n", new: "      detail: `the relationship ${JSON.stringify(id)}, relation ${relation}: no ${decision.factKind} fact joins this edge's two units in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the arrow, its relation or its units` }])),\n",
    reason: "A model relationship's witness finding is built from the edge decisions, which check empties where the draft draws any schema finding (check.ts, `relationFindings(schemaFault ? { ...decisions, edges: [] } : decisions)`), and an identity that is not a handle is one: no value but a handle reaches this line." },
  { id: "system-model-site-8", file: `${PKG}/system-model.ts`, old: "      detail: `model: no ${decision.factKind} fact joins the units of group ${handleOr(id, at)} and the group it is drawn in, in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the nesting or its groups' units` }])),\n", new: "      detail: `model: no ${decision.factKind} fact joins the units of group ${String(id)} and the group it is drawn in, in what rule ${decision.rule} version ${decision.ruleVersion} derived at the pinned revision; correct the nesting or its groups' units` }])),\n",
    reason: "A model nesting's witness finding is built from the nesting decisions, which check empties where the draft draws any schema finding, and an identity that is not a handle is one: no value but a handle reaches this line." },
];
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const files = [...new Set(MUTANTS.map(([, file]) => file))].sort();
// The equivalent mutants' files too, so `--only` can still check their fragments.
const originals = new Map([...new Set([...files, ...EQUIVALENT.map((m) => m.file)])].map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const wrong = [];
for (const [id, file, old] of [...MUTANTS, ...EQUIVALENT.map((m) => [m.id, m.file, m.old])]) {
  const count = originals.get(file).split(old).length - 1;
  if (count !== 1) wrong.push(`${id}: the fragment occurs ${count} times in ${file}`);
}
if (wrong.length > 0) throw new Error(wrong.join('\n'));
if (new Set(MUTANTS.map(([id]) => id)).size !== MUTANTS.length) throw new Error('a mutant id repeats');
if (dry) { process.stdout.write(`${MUTANTS.length} mutants, each fragment once\n`); process.exit(0); }
const restoreAll = () => { for (const [file, text] of originals) fs.writeFileSync(path.join(root, file), text); };
process.on('SIGINT', () => { restoreAll(); process.exit(130); });
process.on('SIGTERM', () => { restoreAll(); process.exit(143); });

async function runTests(tag, tests) {
  const report = path.join(scratch, `mutation-${tag}.json`);
  fs.rmSync(report, { force: true });
  const child = spawn('npx', ['vitest', 'run', ...tests, '--reporter=json', `--outputFile=${report}`], { cwd: root, detached: true, stdio: 'ignore' });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ } }, TIMEOUT_MS);
  const code = await new Promise((resolve) => child.on('exit', (c) => resolve(c)));
  clearTimeout(timer);
  try { process.kill(-child.pid, 'SIGKILL'); } catch { /* gone */ }
  const failedTests = [];
  const perFile = {};
  let total = null;
  if (fs.existsSync(report)) {
    const json = JSON.parse(fs.readFileSync(report, 'utf8'));
    total = json.numTotalTests;
    for (const result of json.testResults) {
      const failed = result.assertionResults.filter((a) => a.status === 'failed').map((a) => `${path.relative(root, result.name)} > ${a.fullName}`);
      perFile[path.relative(root, result.name)] = { passed: result.assertionResults.filter((a) => a.status === 'passed').length, skipped: result.assertionResults.filter((a) => a.status === 'skipped' || a.status === 'pending').length };
      for (const name of failed) failedTests.push(name);
      if (failed.length === 0 && result.status === 'failed') failedTests.push(`${path.relative(root, result.name)} (file failed: ${String(result.message).slice(0, 200)})`);
    }
  }
  return { code, timedOut, failedTests, total, perFile };
}

const head = await new Promise((resolve) => { const c = spawn('git', ['-C', root, 'rev-parse', 'HEAD']); let s = ''; c.stdout.on('data', (d) => { s += d; }); c.on('exit', () => resolve(s.trim())); });
const record = {
  format: 'mutation-run/1',
  ranAt: new Date().toISOString(),
  commit: head,
  subject: Object.fromEntries(files.map((file) => [file, sha(originals.get(file))])),
  command: 'npx vitest run <the test files of the mutant\'s source file> --reporter=json --outputFile=<scratch>/mutation-<id>.json',
  method: `Each mutant replaces one fragment (asserted to occur exactly once) in its file, runs the test files listed for that file under vitest with the JSON reporter, and restores every source in finally. A mutant is killed when the run exits non-zero and at least one test fails (failedTests lists each) or is stopped after ${TIMEOUT_MS / 1000} s; a run that exits non-zero with no failed test and no timeout is recorded as not run, never as killed. The unmutated baseline of each group runs first and must pass.`,
  testFiles: TESTS,
  baselines: [],
  mutants: [],
  equivalent: EQUIVALENT,
  summary: null,
};
try {
  for (const file of files) {
    const baseline = await runTests(`baseline-${path.basename(file)}`, TESTS[file]);
    record.baselines.push({ file, exitCode: baseline.code, tests: baseline.total, perFile: baseline.perFile, failedTests: baseline.failedTests });
    if (baseline.code !== 0) throw new Error(`the baseline for ${file} fails: ${baseline.failedTests.join('; ')}`);
  }
  for (const [id, file, old, replacement] of MUTANTS) {
    const started = Date.now();
    try {
      fs.writeFileSync(path.join(root, file), originals.get(file).replace(old, () => replacement));
      const result = await runTests(id, TESTS[file]);
      const killed = result.timedOut || (result.code !== 0 && result.failedTests.length > 0);
      const notRun = !result.timedOut && result.code !== 0 && result.failedTests.length === 0;
      record.mutants.push({ id, file, old, new: replacement, killed, killedBy: result.timedOut ? 'timeout' : killed ? 'tests' : null, ...(notRun ? { notRun: true } : {}), tests: result.total, failedTests: result.failedTests, seconds: Math.round((Date.now() - started) / 1000) });
      process.stdout.write(`${id}: ${killed ? 'killed' : notRun ? 'NOT RUN' : 'SURVIVED'} (${result.failedTests.length} failed${result.timedOut ? ', timeout' : ''})\n`);
    } finally {
      restoreAll();
    }
  }
} finally {
  restoreAll();
  for (const file of files) if (sha(fs.readFileSync(path.join(root, file))) !== record.subject[file]) throw new Error(`${file} was not restored`);
  const killed = record.mutants.filter((m) => m.killed).length;
  record.summary = { mutants: record.mutants.length, killed, survived: record.mutants.length - killed, byTimeout: record.mutants.filter((m) => m.killedBy === 'timeout').length, equivalentNotRun: EQUIVALENT.length };
  fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
}
