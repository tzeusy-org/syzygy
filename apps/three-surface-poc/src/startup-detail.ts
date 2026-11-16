import type { DaemonStart } from '@syzygy/http-host';

type StartFailure = Extract<DaemonStart, { readonly started: false }>['failure'];

/** Startup errors are operator diagnostics, but paths and arbitrary error
 * messages do not become log data. Retain the named cause and safe detail. */
export function daemonStartDetail(failure: StartFailure): string {
  if (failure.kind === 'duplicate-route') {
    return /^two routes registered for `(GET|HEAD|POST|PUT|DELETE) \/[A-Za-z0-9/_-]*`$/.test(failure.detail)
      ? failure.detail
      : 'duplicate registered route (detail unavailable)';
  }
  if (failure.kind === 'credential-unprovisionable') {
    const reason = failure.detail.startsWith('existing credential file is unreadable')
      ? 'existing credential file is unreadable'
      : failure.detail.startsWith('credential could not be persisted')
        ? 'credential could not be persisted'
        : failure.detail.startsWith('credential path refused by state-write boundary')
          ? 'credential path refused by state-write boundary'
          : 'credential provisioning failed';
    return reason;
  }
  const code = /\b(EADDRINUSE|EACCES|EINVAL|EADDRNOTAVAIL)\b/.exec(failure.detail)?.[1];
  return code === undefined ? 'bind failed (detail unavailable)' : `bind failed (${code})`;
}

export function gitObservationDetail(cause: unknown): string {
  if (cause instanceof Error && cause.message === 'observer-checkout-dirty') return 'POC runtime inputs have uncommitted changes';
  const status = typeof cause === 'object' && cause !== null && 'status' in cause ? cause.status : undefined;
  return Number.isSafeInteger(status) && (status as number) >= 0 && (status as number) <= 255
    ? `a required git revision could not be observed (git exit ${status})`
    : 'a required git revision could not be observed (cause unavailable)';
}

export function unexpectedObservationDetail(cause: unknown): string {
  const name = cause instanceof Error && ['Error', 'TypeError', 'RangeError', 'SyntaxError'].includes(cause.name)
    ? cause.name
    : 'unclassified error';
  return `unexpected observation failure (${name})`;
}
