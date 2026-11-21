import { isRecord } from '@syzygy/support';

/** A completed child step can return findings or an authenticated wait. The
 * bridge also validates the full report and the products it names. */
export function urlDossierReportExit(command: string, submitted: boolean, report: unknown): number | undefined {
  if (!isRecord(report) || report['command'] !== command) return undefined;
  if (command === 'status' && report['outcome'] === 'reported') return 0;
  if (command === 'check') {
    if (report['outcome'] === 'passed') return 0;
    if (report['outcome'] === 'findings') return 1;
  }
  if (command !== 'await') return undefined;
  if (submitted) return report['outcome'] === 'submitted' && typeof report['passed'] === 'boolean'
    ? (report['passed'] ? 0 : 1) : undefined;
  if (report['outcome'] === 'delivered' || report['outcome'] === 'ended') return 0;
  if (report['outcome'] === 'waiting') return 3;
  return undefined;
}
