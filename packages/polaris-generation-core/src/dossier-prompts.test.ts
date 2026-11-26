import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DISCOVERY_STAGE_ILLUSTRATIONS, DOSSIER_ILLUSTRATION_SOURCES, DOSSIER_STAGE_ILLUSTRATIONS, promptForStage, type GenerationStage, type PromptProfile } from './prompts.js';
import { validateStage, type EditReply, type RepairReply, type ProviderDraft, type ProviderInventory } from './provider-draft.js';
import { QUOTE_LEAD_IN, checkBlockQuotes, checkDraftQuotes } from './quote-fidelity.js';

const QUOTATION_LEAD = `${QUOTE_LEAD_IN} "`;
const quotationsMatch = (text: string, texts: readonly string[]): boolean =>
  checkBlockQuotes({ id: 'claim', text, sourceIds: texts.map((_, index) => `s${index}`) }, new Map(texts.map((body, index) => [`s${index}`, body]))).length === 0;

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

// Recipe replay, as in prompts.test.ts: an intentional edit needs a version
// decision and a new reviewed digest. These pin bytes; they are not LLM evals.
const recipes: [GenerationStage, string, string][] = [
  ['inventory', 'polaris-inventory-dossier-v2', '7b059d24a9c5d5a91b4abe9b78c1b131c30f234c7fdac69709e5a94498163e58'],
  ['plan', 'polaris-plan-dossier-v2', 'c55af59b45a0a6f8aa62ef26d29702273c266f024ebe2e3528235537285cb026'],
  ['author', 'polaris-author-dossier-v2', 'dc5e0e39c85a3114f7d537c944811365437010e6ad0079da9660c54ab03689e0'],
  ['edit', 'polaris-edit-dossier-v3', '36a90afca6fc4c1149f738da84673840d0b7028453f584b3d66d957e14bbf8c3'],
  ['fidelity', 'polaris-fidelity-dossier-v2', 'c11198c947be8d4710c9b0ca3285236a2686c6592b17d773b31965c570b9f63b'],
  ['repair', 'polaris-repair-dossier-v3', 'b4347b30e72eb5124dbff92dedaf82bd4a9509ba6797ed16d590619c8196982f'],
];

// The dossier profile's requested assets (dossier-profile.ts on the profile
// branch), written out here so the illustrations are checked against literals.
const requestedAssets = [
  { id: 'core-ideas', kind: 'section', required: true },
  { id: 'end-to-end-workflows', kind: 'section', required: true },
  { id: 'mechanisms', kind: 'section', required: true },
  { id: 'maintainer-stated-advantages', kind: 'section', required: true },
  { id: 'trade-offs', kind: 'section', required: true },
  { id: 'workflow-diagram', kind: 'diagram', required: false },
  { id: 'mechanism-deep-dive', kind: 'deep-dive', required: false },
];
const sources = DOSSIER_ILLUSTRATION_SOURCES.map(source => ({ ...source }));
const illustration = (stage: GenerationStage): unknown => structuredClone(DOSSIER_STAGE_ILLUSTRATIONS[stage]);
// One context serves every stage: each validator reads only what it needs.
const context = (): Record<string, unknown> => ({ sources, requestedAssets, inventory: illustration('inventory'), plan: illustration('plan'), draft: illustration('author'),
  repairFindings: [{ id: 'finding-1', finding: { target: 'e-serve', severity: 'blocking', message: 'How the output is served is unresolved.' } }] });
const sourceText = (id: string): string => sources.find(source => source.sourceId === id)!.text;

describe('dossier stage prompts', () => {
  it.each(recipes)('pins the %s dossier prompt bytes', (stage, version, digest) => {
    const prompt = promptForStage(stage, 'dossier');
    expect(prompt.version).toBe(version);
    expect(sha256(prompt.system)).toBe(digest);
    // Base prompt (< 4 KiB) plus rules, guidance and one illustration; a draft
    // illustration is the largest. A prompt past 16 KiB needs a decision.
    expect(Buffer.byteLength(prompt.system, 'utf8')).toBeLessThan(16_384);
  });

  // The dossier base is the reviewed manifesto prompt with exactly these
  // manifesto-only phrases replaced; every other byte is unchanged.
  const substitutions: [string, string][] = [
    ['You are producing one stage of a project-neutral Polaris manifesto pipeline.', 'You are producing one stage of a project-neutral Polaris dossier pipeline.'],
    [' Generated content is editorial draft, not adopted intent.', ' Generated content is an editorial draft.'],
  ];
  const stageSubstitutions: Partial<Record<GenerationStage, [string, string][]>> = {
    inventory: [['Do not draft or plan the manifesto,', 'Do not draft or plan the dossier,'], ['thesis, motives, capabilities', 'thesis, capabilities']],
    author: [['Write a coherent, concise manifesto following', 'Write a coherent, concise dossier following']],
    fidelity: [[", accept the author's self-assessment as evidence, or grant owner approval.", " or accept the author's self-assessment as evidence."]],
  };

  it.each(recipes)('derives the %s dossier base from the reviewed manifesto prompt by named substitutions only', (stage) => {
    let base = promptForStage(stage).system;
    for (const [from, to] of [...substitutions, ...(stageSubstitutions[stage] ?? [])]) {
      expect(base.split(from).length, from).toBe(2);
      base = base.replace(from, () => to);
    }
    const prompt = promptForStage(stage, 'dossier').system;
    expect(prompt.startsWith(`${base}\n\n`)).toBe(true);
    for (const phrase of ['manifesto', 'adopted intent', 'owner approval', 'motives']) expect(prompt, phrase).not.toContain(phrase);
  });

  it.each(recipes)('ends the %s prompt with the illustration it was tested with', (stage) => {
    const lines = promptForStage(stage, 'dossier').system.split('\n');
    expect(lines.at(-2)).toMatch(/^Shape illustration for a fictional project\. Copy its structure, never its content/u);
    expect(JSON.parse(lines.at(-1)!)).toEqual(illustration(stage));
  });

  it.each(recipes)('states the seven dossier rules in the %s prompt', (stage) => {
    const prompt = promptForStage(stage, 'dossier').system;
    for (const rule of ['1. Claim ledger.', '2. Workflow traces.', '3. Mechanisms.', '4. Stated advantages and trade-offs.', '5. Comparisons.', '6. Marked inference.', '7. Thin evidence stays Unknown.']) {
      expect(prompt).toContain(`\n${rule} `);
    }
    expect(prompt).toContain(' Where these dossier rules and the instructions above differ, the dossier rules govern. ');
    // The asset id maintainer-stated-advantages is the profile's; only the illustration line carries it.
    expect(prompt.split('\n').slice(0, -1).join('\n')).not.toContain('maintainer');
  });

  // Semantic pins: each clause below is load-bearing, so a mutant that drops or
  // weakens one fails here by name, not only through a digest.
  const ruleClauses = [
    'is reported only as a quotation: The project states: followed, in double quotes, by one contiguous span of a cited source, at most two sentences or one list item.',
    'Quote that span exactly: never elide, splice or add ellipses, and keep the source\'s own characters inside the quotes, identifiers included, without adding backticks.',
    'markdown emphasis and link syntax are dropped, keeping the link text; no other change is allowed.',
    'Double quotes are used only for such a quotation; everywhere else put commands, identifiers, configuration keys and values in backticks and use no quotation marks.',
    'Quote a stated advantage once: child blocks may explain its mechanism in your own words, citing their sources, but never restate the claim unquoted.',
    'An advantage no source states is never written, not even as Inferred:.',
    'may be written as one Inferred: sentence citing the sources of the mechanism it reasons from, and it must agree with every cited source; otherwise it is unresolved',
    'Never present an inferred cost or benefit as stated.',
    'Never extend or generalize it, and never add an alternative of your own.',
    'A faithful restatement or summary of cited sources and child blocks is not inference and carries no prefix.',
    'Outside a quotation, name each function, type, file, command or configuration key in backticks',
  ];
  it.each(recipes)('states every rule-4, 5 and 6 clause in the %s prompt', (stage) => {
    const prompt = promptForStage(stage, 'dossier').system;
    for (const clause of ruleClauses) expect(prompt, clause).toContain(clause);
  });

  const guidanceClauses: [GenerationStage, string][] = [
    ['inventory', 'each project-specific or domain term a newcomer would need explained as a term entry'],
    ['inventory', 'a mechanism-level cost no source states as a qualification entry whose statement begins Inferred: and cites the mechanism\'s sources'],
    ['plan', 'core ideas first, then the end-to-end workflows, then the mechanisms beneath them, then advantages and trade-offs'],
    ['author', 'open with a two- or three-sentence introduction that says what the project is and how its central workflow runs, never a copy of the first section\'s block'],
    ['author', 'Explain each term a newcomer may not know at its first use'],
    ['author', 'Double quotes appear only around a verbatim span of a cited source after The project states:; identifiers, commands, configuration keys and values go in backticks, and there are no scare quotes.'],
    ['author', 'not the canned refusals section the instructions above rule out: beside any advantage a trade-off qualifies, keep a one-clause pointer to it.'],
    ['edit', 'shorten it with an ellipsis, add double quotes around anything but a verbatim span of a cited source'],
    ['fidelity', 'every quotation is one contiguous span of a cited source, matching it under rule 4\'s normalization, with no ellipsis or splice; that double quotes appear nowhere else;'],
    ['fidelity', 'that a stated advantage is quoted once and never restated unquoted, and that no advantage is written that no source states;'],
    ['fidelity', 'that no trade-off half is presented as stated unless a cited source states it, and that an Inferred: half cites the sources it reasons from and agrees with every one of them;'],
    ['fidelity', 'a block with no failure needs no finding.'],
    ['repair', 'never by rewording it to sound stated.'],
    ['repair', 'for a quotation that does not match its source, quote it verbatim from a cited source, or remove the quotation marks and mark the sentence Inferred: (an advantage no source states is removed instead).'],
  ];
  it.each(guidanceClauses)('states the %s guidance clause: %s', (stage, clause) => {
    expect(promptForStage(stage, 'dossier').system).toContain(clause);
  });

  it('gives every stage its own dossier guidance', () => {
    const heads = recipes.map(([stage]) => promptForStage(stage, 'dossier').system.split('\n').at(-4)!);
    expect(new Set(heads).size).toBe(recipes.length);
    const labels: Record<GenerationStage, string> = { inventory: 'inventory', plan: 'plan', author: 'draft', edit: 'edit', fidelity: 'review', repair: 'repair' };
    recipes.forEach(([stage], index) => expect(heads[index]!.startsWith(`Dossier ${labels[stage]}: `), stage).toBe(true));
  });

  it.each(['unknown', 'Dossier', 'constructor', '__proto__'])('refuses unsupported profile %s', (profile) => {
    expect(() => promptForStage('author', profile as PromptProfile)).toThrow('unknown-prompt-profile');
  });

  it('keeps the manifesto profile the default', () => {
    expect(promptForStage('author', 'manifesto')).toEqual(promptForStage('author'));
  });

  it.each(['unknown', 'constructor', '__proto__'])('refuses unsupported stage %s', (stage) => {
    expect(() => promptForStage(stage as GenerationStage, 'dossier')).toThrow('unknown-generation-stage');
  });
});

describe('dossier stage illustrations pass the stage validators', () => {
  it.each(recipes)('validates the %s illustration', (stage) => {
    const output = illustration(stage);
    expect(validateStage(stage, output, context())).toEqual(output);
    if (stage === 'author' || stage === 'edit' || stage === 'repair') {
      const draft = stage === 'author' ? output : (output as EditReply).draft;
      expect(checkDraftQuotes(draft, new Map(DOSSIER_ILLUSTRATION_SOURCES.map(source => [source.sourceId, source.text])))).toEqual([]);
    }
  });

  it('uses the author illustration as the unchanged draft and retains the unrepairable finding', () => {
    const edit = DOSSIER_STAGE_ILLUSTRATIONS.edit as EditReply;
    const repair = DOSSIER_STAGE_ILLUSTRATIONS.repair as RepairReply;
    expect(edit.draft).toBe(DOSSIER_STAGE_ILLUSTRATIONS.author);
    expect(repair.draft).toBe(DOSSIER_STAGE_ILLUSTRATIONS.author);
    expect(repair.findingDispositions).toEqual([{ findingId: 'finding-1', action: 'unrepairable', reason: 'No supplied source explains how the output is served.' }]);
  });

  it('produces every requested asset in the draft', () => {
    const draft = illustration('author') as ProviderDraft;
    const produced = new Set([...draft.sections, ...draft.diagrams, ...draft.deepDives].filter(asset => asset.disposition.kind === 'produced').map(asset => asset.id));
    expect([...produced].sort()).toEqual(requestedAssets.map(asset => asset.id).sort());
  });
});

describe('the embedded illustrations are fixed at module load', () => {
  const before = recipes.map(([stage]) => promptForStage(stage, 'dossier').system);
  const discoveryBefore = (['discovery-map', 'discovery-reduce'] as const).map(stage => promptForStage(stage).system);

  it('deep-freezes every exported illustration and source', () => {
    const frozen = (value: unknown): boolean => value === null || typeof value !== 'object'
      || (Object.isFrozen(value) && Object.values(value).every(frozen));
    expect(frozen(DOSSIER_STAGE_ILLUSTRATIONS)).toBe(true);
    expect(frozen(DOSSIER_ILLUSTRATION_SOURCES)).toBe(true);
    expect(frozen(DISCOVERY_STAGE_ILLUSTRATIONS)).toBe(true);
  });

  it('refuses every mutation an importer could attempt, and the prompts stay byte-identical', () => {
    const attempts: (() => void)[] = [
      () => { (DOSSIER_STAGE_ILLUSTRATIONS as Record<string, unknown>).author = {}; },
      () => { ((DOSSIER_STAGE_ILLUSTRATIONS.author as ProviderDraft).introduction as { text: string }).text = 'changed'; },
      () => { ((DOSSIER_STAGE_ILLUSTRATIONS.inventory as ProviderInventory).entries as unknown[]).push({}); },
      () => { (DOSSIER_ILLUSTRATION_SOURCES[0] as { text: string }).text = 'changed'; },
      () => { (DISCOVERY_STAGE_ILLUSTRATIONS as Record<string, unknown>)['discovery-map'] = {}; },
      () => { ((DISCOVERY_STAGE_ILLUSTRATIONS['discovery-map'] as { claims: { claim: string }[] }).claims[0]!).claim = 'changed'; },
    ];
    for (const attempt of attempts) expect(attempt).toThrow(TypeError);
    expect(recipes.map(([stage]) => promptForStage(stage, 'dossier').system)).toEqual(before);
    expect((['discovery-map', 'discovery-reduce'] as const).map(stage => promptForStage(stage).system)).toEqual(discoveryBefore);
  });

  it('keeps the illustrations out of the package entry point', async () => {
    const entry = await import('./index.js') as Record<string, unknown>;
    for (const name of ['DOSSIER_STAGE_ILLUSTRATIONS', 'DOSSIER_ILLUSTRATION_SOURCES', 'DISCOVERY_STAGE_ILLUSTRATIONS']) expect(entry[name], name).toBeUndefined();
    expect(entry.promptForStage).toBe(promptForStage);
  });
});

describe('dossier illustrations obey their own rules', () => {
  const draft = illustration('author') as ProviderDraft;
  const blocks = [draft.introduction, ...[...draft.sections, ...draft.deepDives].flatMap(owner => owner.paragraphs.flatMap(block => [block, ...block.children]))];

  it('spells every backticked identifier as a cited source spells it', () => {
    const inventory = illustration('inventory') as ProviderInventory;
    const claims = [...blocks.map(block => ({ text: block.text, sourceIds: block.sourceIds })), ...inventory.entries.map(entry => ({ text: entry.statement, sourceIds: entry.sourceIds }))];
    const identifiers = claims.flatMap(claim => [...claim.text.matchAll(/`([^`]+)`/gu)].map(match => ({ name: match[1]!, sourceIds: claim.sourceIds })));
    expect(identifiers.length).toBeGreaterThanOrEqual(8);
    for (const { name, sourceIds } of identifiers) expect(sourceIds.some(id => sourceText(id).includes(name)), name).toBe(true);
  });

  // Rule 4: "The project states:" then one or two sentences in double quotes, matching a cited source.
  const quoted = (claim: { text: string; sourceIds: readonly string[] }): void => {
    expect(claim.text.startsWith(QUOTATION_LEAD), claim.text).toBe(true);
    expect(quotationsMatch(claim.text, claim.sourceIds.map(sourceText)), claim.text).toBe(true);
  };

  it('quotes every advantage and trade-off verbatim from a cited source', () => {
    for (const id of ['maintainer-stated-advantages', 'trade-offs']) {
      const section = draft.sections.find(candidate => candidate.id === id)!;
      const stated = section.paragraphs.filter(block => !block.text.startsWith('Inferred: '));
      expect(stated.length).toBe(1);
      for (const block of stated) quoted(block);
    }
    const inventory = illustration('inventory') as ProviderInventory;
    const stated = inventory.entries.filter(entry => ['other', 'qualification'].includes(entry.kind) && !entry.statement.startsWith('Inferred: '));
    expect(stated.length).toBe(2);
    for (const entry of stated) quoted({ text: entry.statement, sourceIds: entry.sourceIds });
  });

  it('marks the two inferential blocks Inferred: and no other', () => {
    const inferred = blocks.filter(block => block.text.startsWith('Inferred: '));
    expect(inferred.map(block => block.id)).toEqual(['b-cost-inferred', 'b-dive']);
    expect(blocks.filter(block => block.text.includes('Inferred'))).toEqual(inferred);
  });

  it('gives an unstated mechanism-level cost its own Inferred: block, citing the mechanism and never quoting', () => {
    const [stated, inferred] = draft.sections.find(candidate => candidate.id === 'trade-offs')!.paragraphs;
    expect(stated!.text.startsWith(QUOTATION_LEAD)).toBe(true);
    expect(inferred!.text.startsWith('Inferred: ')).toBe(true);
    expect(inferred!.text).not.toContain(QUOTATION_LEAD);
    expect(inferred!.sourceIds).toEqual(['src-build', 'src-cache']);
    const inventory = illustration('inventory') as ProviderInventory;
    const entries = inventory.entries.filter(entry => entry.statement.startsWith('Inferred: '));
    expect(entries.map(entry => [entry.id, entry.kind, entry.sourceIds])).toEqual([['e-cost-inferred', 'qualification', ['src-build', 'src-cache']]]);
  });

  const claimTexts = (): string[] => [...blocks.map(block => block.text), ...(illustration('inventory') as ProviderInventory).entries.map(entry => entry.statement)];

  it('uses double quotes only for the quotation after the lead, and never elides', () => {
    for (const text of claimTexts()) {
      const at = text.indexOf(QUOTATION_LEAD);
      const outside = at < 0 ? text : text.slice(0, at) + text.slice(text.lastIndexOf('"') + 1);
      expect(outside, text).not.toContain('"');
      expect(text, text).not.toMatch(/\.\.\.|\u2026/u);
    }
  });

  it('quotes a stated advantage once and restates it nowhere', () => {
    const quotedAdvantage = blocks.filter(block => block.text.startsWith(QUOTATION_LEAD) && block.text.includes('worker threads'));
    expect(quotedAdvantage.map(block => block.id)).toEqual(['b-adv']);
    expect(blocks.filter(block => block.text.includes('build faster')).map(block => block.id)).toEqual(['b-adv']);
  });

  it('opens with a two- or three-sentence introduction that is not the first block', () => {
    const sentences = draft.introduction.text.split(/(?<=\.) /u);
    expect(sentences.length).toBeGreaterThanOrEqual(2);
    expect(sentences.length).toBeLessThanOrEqual(3);
    expect(draft.introduction.text).not.toBe(draft.sections[0]!.paragraphs[0]!.text);
  });

  it('records a newcomer term and orders workflows before mechanisms', () => {
    const inventory = illustration('inventory') as ProviderInventory;
    expect(inventory.entries.filter(entry => entry.kind === 'term').map(entry => entry.id)).toEqual(['e-term']);
    const order = draft.sections.map(section => section.id);
    expect(order.indexOf('end-to-end-workflows')).toBeLessThan(order.indexOf('mechanisms'));
    const plan = illustration('plan') as { sections: { id: string }[] };
    expect(plan.sections.map(section => section.id)).toEqual(order);
  });

  it('infers a cost that agrees with every cited source and gives the review no finding to praise it', () => {
    const inferred = draft.sections.find(candidate => candidate.id === 'trade-offs')!.paragraphs.find(block => block.text.startsWith('Inferred: '))!;
    // The README says a shared-layout change rebuilds every page that uses it: a cost
    // claiming unchanged pages go stale would contradict it.
    expect(inferred.text).not.toMatch(/stale|not rendered again/u);
    expect(inferred.sourceIds).toEqual(['src-build', 'src-cache']);
    for (const name of ['`buildSite`', '`renderPage`']) expect(inferred.text).toContain(name);
    const review = illustration('fidelity') as { findings: unknown[] };
    expect(review.findings).toEqual([]);
  });

  it('traces the workflow one hop per child block and draws only those hops', () => {
    const flow = draft.sections.find(candidate => candidate.id === 'end-to-end-workflows')!.paragraphs[0]!;
    expect(flow.children.length).toBe(2);
    const diagram = draft.diagrams[0]!;
    expect(diagram.kind).toBe('flow');
    expect(diagram.sectionId).toBe('end-to-end-workflows');
    for (const element of [...diagram.nodes, ...diagram.edges]) expect(element.sourceIds.every(id => flow.sourceIds.includes(id))).toBe(true);
  });

  it('keeps thin evidence unresolved in the inventory, the draft and the review', () => {
    const inventory = illustration('inventory') as ProviderInventory;
    expect(inventory.entries.filter(entry => entry.disposition.kind === 'unresolved').length).toBe(1);
    expect(draft.unresolved.length).toBe(1);
    const review = illustration('fidelity') as { inventoryCoverage: { disposition: string }[] };
    expect(review.inventoryCoverage.filter(row => row.disposition === 'unresolved').length).toBe(1);
  });
});
