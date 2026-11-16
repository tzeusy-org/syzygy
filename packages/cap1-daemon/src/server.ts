import { evaluationId } from '@syzygy/cap1-core';
import type { Route, RouteResponse } from '@syzygy/http-host';

import type { ProjectEvaluation } from './pipeline.js';

// The generic HTTP host, credential admission included, is
// packages/http-host/src/server.ts (syzygy-bpyt.7.3). This path stays
// because governed files cite it: it re-exports every name the host
// had here, and keeps the Capability 1 root route below.
export {
  createDaemon,
  DAEMON_HOST,
  HANDLER_FAILURE_REASON,
  HANDLER_FAILURE_STATUS,
  REFUSAL_BODY,
  REFUSAL_STATUS,
  UNKNOWN_ROUTE_REASON,
  UNKNOWN_ROUTE_STATUS,
  type CredentialClass,
  type DaemonOptions,
  type DaemonStart,
  type Route,
  type RouteContext,
  type RouteRequest,
  type RouteResponse,
  type RunningDaemon,
} from '@syzygy/http-host';

// --- This wave's minimal root route --------------------------------------

// A plain served-facts statement at `/` — human-open, text/plain. RT4
// and RT5 replace nothing here: they REGISTER their own routes; this
// route only states, honestly, what the pipeline evaluated. Every line
// is derived from named pipeline values; nothing is invented.
export function minimalRootRoute(evaluation: ProjectEvaluation): Route {
  return {
    method: 'GET',
    path: '/',
    credentialClass: 'human-open',
    handle(): RouteResponse {
      return {
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: rootStatement(evaluation),
      };
    },
  };
}

function rootStatement(evaluation: ProjectEvaluation): string {
  const lines: string[] = ['syzygy capability-1 daemon — served facts', ''];
  switch (evaluation.kind) {
    case 'project-evaluated': {
      lines.push(`selection: ${evaluation.model.selection}`);
      lines.push(`evaluation: ${evaluationId(evaluation.model.evaluation)}`);
      lines.push('');
      for (const fact of evaluation.model.facts) {
        const reason =
          fact.epistemic.label === 'Unknown' && 'reasons' in fact.epistemic
            ? ` (reason: ${fact.epistemic.reasons.primary})`
            : '';
        lines.push(`- ${fact.name}: ${fact.value} [${fact.epistemic.label}]${reason}`);
      }
      break;
    }
    case 'declaration-invalid': {
      lines.push('declaration: read but invalid — registration failed');
      for (const failure of evaluation.failures) {
        lines.push(`- validation failure (${failure.kind}): ${failure.detail}`);
      }
      break;
    }
    case 'no-declaration-observed': {
      const obs = evaluation.declarationObservation;
      lines.push(`declaration: ${obs.label} (reason: ${obs.reason})`);
      break;
    }
  }
  lines.push('');
  lines.push('machine endpoint and human page arrive as registered routes (RT4/RT5).');
  return lines.join('\n');
}
