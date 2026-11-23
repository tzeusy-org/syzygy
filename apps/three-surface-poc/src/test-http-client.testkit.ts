// Test support: exports with no non-test importer are consumed by tests only, by design.

import * as http from 'node:http';

/**
 * Fetch with an explicit Host header, which the Fetch API/undici treats as
 * a forbidden request header and silently drops — real reverse proxies
 * (including `tailscale serve`) rewrite it faithfully, so tests that need
 * to simulate a request arriving with a specific Host (as opposed to
 * `fetch`'s real connection host) must use `node:http` directly instead.
 */
export function fetchWithHost(
  url: string,
  hostHeader: string,
  options: { readonly method?: string; readonly origin?: string } = {},
): Promise<{ readonly status: number; text(): Promise<string> }> {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: options.method ?? 'GET',
        headers: {
          Host: hostHeader,
          ...(options.origin === undefined ? {} : { Origin: options.origin }),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            text: async () => Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}
