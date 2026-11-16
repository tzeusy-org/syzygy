import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRecord } from '@syzygy/support';
import { providerStatementGate, statementContentClasses, type GateSources } from './gate-sources.js';
import { AGENT_TOOLS } from './run-config.js';
import { readRunRecord } from './run-record.js';
import { RUN_LAYOUT } from './state-directory.js';

/** The session pair's provider statement, cited when a session is handed over and re-checked whenever its work is counted
 * (REQ-polaris-generation-033: "its withdrawal SHALL refuse further steps of any run that relies on it"; R-PR406-SESSION-TOOL-STATEMENT-1
 * E2, syzygy-q2o8).
 *
 * `session-prompt` admits a session's pair, its agent tool with the run's declared provider, only under exactly one in-force statement
 * (`session-handover.ts`), and records that statement in the prompt record's `context.providerStatement`: null for a run that relies on
 * no statement. When an inventory or a review verdict is counted (`inventoryOfRecord`, `reviewOfRecord`, `designReviewOfRecord`), the
 * gate runs again for the session's tool and the run's provider at that instant; the work counts only while the statement the prompt
 * record cites is still the single statement that governs the pair, and still lists every class the run's statement lists. The run
 * record decides whether the run relies on a statement at all (`subject.providerStatement`), as the step guard's own record does.
 *
 * Compatibility: a prompt record written before citations carries no `providerStatement` key. Its work counts only when the re-check
 * admits a statement now, and that statement is returned with `cited: null`, the citation at hand-over being Unknown. A record that cites
 * no statement (`null`) for a run that relies on one is refused. Every record read here lies within the agent sessions' write reach, so
 * the citation is Inferred. */

/** The statement a session was handed over under, as its prompt record cites it. */
export interface SessionStatementCitation { readonly record: string; readonly agentTool: string; readonly provider: string; readonly label: 'Inferred' }

/** The statement a counted session's work stands on: null for a run that relies on none. `cited` is the statement the prompt record
 * cites, or null when the record predates citations (Unknown). */
export interface SessionStatementOfRecord { readonly record: string; readonly cited: string | null; readonly label: 'Inferred' }

export type SessionStatementRecheck = { readonly ok: true; readonly statement: SessionStatementOfRecord | null } | { readonly ok: false; readonly why: string };

/** Re-check the statement the session `noun` (for example "inventory session 2") was handed over under, from its prompt record, at `now`.
 * `consequence` is what a refusal says follows, for a caller that is not counting work (delivery: "no packet is delivered"); every
 * refusal kind names it, so the caller never rewrites the text. Left out, the counting texts are returned as they always were. */
export async function recheckSessionStatement(
  run: string, noun: string, prompt: Readonly<Record<string, unknown>>, sources: GateSources, now: number, consequence?: string,
): Promise<SessionStatementRecheck> {
  const result = consequence ?? 'its work does not count';
  const no = (why: string): SessionStatementRecheck => ({ ok: false, why });
  // A refusal whose counting text names no consequence gains one only when the caller asked for its own.
  const noThen = (why: string): SessionStatementRecheck => no(consequence === undefined ? why : `${why}, so ${consequence}`);
  let text: string;
  try { text = fs.readFileSync(path.join(run, RUN_LAYOUT.config), 'utf8'); } catch { return noThen(`the run record cannot be read, so the statement ${noun} was handed over under cannot be checked again`); }
  const read = readRunRecord(text);
  if (!read.ok) return noThen(`the run record cannot be read (${read.detail}), so the statement ${noun} was handed over under cannot be checked again`);
  const { subject, declared } = read.record;
  if (subject.providerStatement === null) return { ok: true, statement: null };

  const context = isRecord(prompt['context']) ? prompt['context'] : {};
  const tool = context['agentTool'];
  if (typeof tool !== 'string' || !(AGENT_TOOLS as readonly string[]).includes(tool)) return noThen(`the prompt record of ${noun} names no agent tool, so the statement it was handed over under cannot be checked again`);
  const provider = declared.agentProvider;
  let cited: string | null = null;
  if ('providerStatement' in context) {
    const citation = context['providerStatement'];
    if (!isRecord(citation) || typeof citation['record'] !== 'string') return noThen(`the prompt record of ${noun} cites no per-project statement, but the run relies on one`);
    if (citation['agentTool'] !== tool || citation['provider'] !== provider) {
      return noThen(`the prompt record of ${noun} cites the statement ${citation['record']} for another pair than its agent tool ${tool} with the run's provider ${provider}`);
    }
    cited = citation['record'];
  }
  const records = await sources.providerStatements.statementsFor(subject.repository.repositoryId);
  const gate = providerStatementGate(records, tool, provider, now);
  const named = cited ?? 'the statement it was handed over under (its prompt record cites none)';
  if (gate.state !== 'ok') return no(`the per-project statement ${named} that ${noun} was handed over under no longer governs its agent tool ${tool} with the provider ${provider}, so ${result}: ${gate.why}`);
  if (cited !== null && gate.record !== cited) return no(`the per-project statement ${cited} that ${noun} was handed over under is no longer the one that governs its agent tool ${tool} with the provider ${provider} (${gate.record} does), so ${result}`);
  // syzygy-iw7n: with no single in-force statement for the run's declared pair there are no classes to compare against, and an empty
  // list would pass the subset check vacuously; refuse instead. Callers that do not re-open the run first (the supervisor's
  // `inventoryOfRecord`) rely on this.
  const runClasses = statementContentClasses(records, declared.agentTool, provider, now);
  if (runClasses === null) {
    const own = providerStatementGate(records, declared.agentTool, provider, now);
    return no(`the run's own per-project statement ${subject.providerStatement} no longer governs its declared agent tool ${declared.agentTool} with the provider ${provider}, so the classes ${noun}'s work may carry cannot be checked and ${result}${own.state === 'ok' ? '' : `: ${own.why}`}`);
  }
  const consented = statementContentClasses(records, tool, provider, now) ?? [];
  const beyond = runClasses.filter((contentClass) => !consented.includes(contentClass));
  if (beyond.length > 0) return no(`the per-project statement ${gate.record} that governs ${noun}'s agent tool ${tool} with the provider ${provider} no longer lists ${beyond.join(', ')}, which the run's statement lets its packets carry, so ${result}`);
  return { ok: true, statement: { record: gate.record, cited, label: 'Inferred' } };
}
