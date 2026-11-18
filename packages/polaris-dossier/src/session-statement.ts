import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRecord } from '@syzygy/support';
import { type GateSources } from './gate-sources.js';
import { AGENT_TOOLS } from './run-config.js';
import { readRunRecord } from './run-record.js';
import { RUN_LAYOUT } from './state-directory.js';

/** Historical statement citation types remain readable by retained artifact schemas. New /2
 * prompts bind the supported tool and declared provider directly; they carry no statement grant. */
export interface SessionStatementCitation { readonly record: string; readonly agentTool: string; readonly provider: string; readonly label: 'Inferred' }

/** The statement a counted session's work stands on: null for a run that relies on none. `cited` is the statement the prompt record
 * cites, or null when the record predates citations (Unknown). */
export interface SessionStatementOfRecord { readonly record: string; readonly cited: string | null; readonly label: 'Inferred' }

export type SessionStatementRecheck = { readonly ok: true; readonly statement: SessionStatementOfRecord | null } | { readonly ok: false; readonly why: string };

/** Recheck the session provider declaration against this /2 run. The old
 * statement-shaped result stays null for callers retaining historical schemas;
 * no consent or statement reader participates. */
export async function recheckSessionStatement(
  run: string, noun: string, prompt: Readonly<Record<string, unknown>>, _sources: GateSources, _now: number, consequence?: string,
): Promise<SessionStatementRecheck> {
  const no = (why: string): SessionStatementRecheck => ({ ok: false, why: `${why}; ${consequence ?? 'its work does not count'}` });
  let text: string;
  try { text = fs.readFileSync(path.join(run, RUN_LAYOUT.config), 'utf8'); }
  catch { return no(`the run record cannot be read to check ${noun} declared provider`); }
  const read = readRunRecord(text);
  if (!read.ok) return no(read.detail);
  const context = prompt['context'];
  if (!isRecord(context) || typeof context['agentTool'] !== 'string' || !(AGENT_TOOLS as readonly string[]).includes(context['agentTool'])) {
    return no(`the prompt record of ${noun} names no supported agent tool`);
  }
  if (context['provider'] !== read.record.declared.agentProvider) return no(`the prompt record of ${noun} does not name this run declared provider`);
  return { ok: true, statement: null };
}
