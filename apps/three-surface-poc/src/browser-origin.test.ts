import { describe, expect, it } from 'vitest';

import { browserRequestAllowed } from './browser-origin.js';

// syzygy-bpyt.7.14: a browser request is allowed with no Origin or with
// exactly the host's own origin. An origin that only begins with it, or
// that it only begins with, names another port or another host.
// syzygy-bpyt.7.16: so does one that only ends with it, and the opaque
// origin `null` names none. syzygy-bpyt.32 pins exact case too. The PR535
// review calls case-folding equivalent under the browser threat model:
// a browser serializes an origin in lower case. These rows pin the function.
describe('browserRequestAllowed — the Origin is compared whole', () => {
  it('allows no Origin and the exact origin of each allowed host', () => {
    expect(browserRequestAllowed({ host: '127.0.0.1:7478' })).toBe(true);
    expect(browserRequestAllowed({ host: '127.0.0.1:7478', origin: 'http://127.0.0.1:7478' })).toBe(true);
    expect(browserRequestAllowed({ host: 'localhost:7478', origin: 'http://localhost:7478' })).toBe(true);
    expect(browserRequestAllowed({ host: 'tzeusy.parrot-hen.ts.net', origin: 'https://tzeusy.parrot-hen.ts.net' })).toBe(true);
  });

  it('refuses an origin that only begins with the host origin', () => {
    expect(browserRequestAllowed({ host: '127.0.0.1:7478', origin: 'http://127.0.0.1:74789' })).toBe(false);
    expect(browserRequestAllowed({ host: 'localhost:7478', origin: 'http://localhost:7478.attacker.invalid' })).toBe(false);
    expect(browserRequestAllowed({ host: 'tzeusy.parrot-hen.ts.net', origin: 'https://tzeusy.parrot-hen.ts.net.attacker.invalid' })).toBe(false);
  });

  it('refuses an origin that the host origin only begins with', () => {
    expect(browserRequestAllowed({ host: '127.0.0.1:7478', origin: 'http://127.0.0.1:747' })).toBe(false);
    expect(browserRequestAllowed({ host: '127.0.0.1:7478', origin: 'http://127.0.0.1' })).toBe(false);
    expect(browserRequestAllowed({ host: 'tzeusy.parrot-hen.ts.net', origin: 'https://tzeusy.parrot-hen.ts' })).toBe(false);
  });

  it('refuses an origin that only ends with the host origin, and the opaque origin null', () => {
    expect(browserRequestAllowed({ host: '127.0.0.1:7478', origin: 'http://attacker.invalid.http://127.0.0.1:7478' })).toBe(false);
    expect(browserRequestAllowed({ host: '127.0.0.1:7478', origin: 'null' })).toBe(false);
  });

  it('refuses an origin whose host differs only in case', () => {
    expect(browserRequestAllowed({ host: 'localhost:7478', origin: 'http://LOCALHOST:7478' })).toBe(false);
  });

  it('refuses a host whose name differs only in case, with Origin absent', () => {
    expect(browserRequestAllowed({ host: 'LOCALHOST:7478' })).toBe(false);
  });
});
