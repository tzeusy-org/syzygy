import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  authorizeStateWrite,
  credentialFromAuthorizationHeader,
  ensureCredential,
  verifyCredential,
  CREDENTIAL_FILE_NAME,
} from './credentials.js';

// RT3 — credential lifecycle tests. Real temp dirs, real files; no
// mocks. Refusal expectations are HARD-CODED literals (oracle
// independence): the named refusal is `{ admitted: false, served:
// 'nothing' }` — the spelling comes from the adopted admission
// vocabulary, not from importing the implementation's constant.

const cleanups: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'rt3-cred-'));
  cleanups.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of cleanups.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('RT3 — credential provisioning', () => {
  it('first start mints a random token, persisted with mode 0600', () => {
    const stateDir = join(tempDir(), 'state');
    const provision = ensureCredential(stateDir);

    expect(provision.kind).toBe('minted');
    if (provision.kind !== 'minted') return;
    expect(provision.path).toBe(join(stateDir, 'machine-credential.token'));
    expect(provision.token).toMatch(/^[0-9a-f]{64}$/);

    const mode = statSync(provision.path).mode & 0o777;
    expect(mode).toBe(0o600);
    expect(readFileSync(provision.path, 'utf8')).toBe(provision.token);
  });

  it('restart reuses the persisted token unchanged', () => {
    const stateDir = join(tempDir(), 'state');
    const first = ensureCredential(stateDir);
    const second = ensureCredential(stateDir);

    expect(first.kind).toBe('minted');
    expect(second.kind).toBe('reused');
    if (first.kind === 'unprovisionable' || second.kind === 'unprovisionable') return;
    expect(second.token).toBe(first.token);
    expect(second.path).toBe(first.path);
  });

  it('an existing empty credential file is a named failure, never a silent re-mint', () => {
    const stateDir = tempDir();
    writeFileSync(join(stateDir, CREDENTIAL_FILE_NAME), '', { encoding: 'utf8', mode: 0o600 });

    const provision = ensureCredential(stateDir);
    expect(provision.kind).toBe('unprovisionable');
    if (provision.kind !== 'unprovisionable') return;
    expect(provision.detail).toContain('empty');
  });

  it('two distinct state dirs mint distinct tokens', () => {
    const a = ensureCredential(join(tempDir(), 'a'));
    const b = ensureCredential(join(tempDir(), 'b'));
    if (a.kind === 'unprovisionable' || b.kind === 'unprovisionable') {
      throw new Error('expected both provisions to succeed');
    }
    expect(a.token).not.toBe(b.token);
  });
});

// A reused token is trusted only when no other user can have read or
// planted it. Each refusal carries its own detail and returns no token.
describe('RT3 — credential reuse inspection', () => {
  const TOKEN = 'c'.repeat(64);

  // A state dir holding a pre-existing token file, both modes explicit
  // (chmod after creation, so the umask cannot interfere).
  function provisioned(dirMode: number, fileMode: number): string {
    const stateDir = join(tempDir(), 'state');
    mkdirSync(stateDir);
    const file = join(stateDir, CREDENTIAL_FILE_NAME);
    writeFileSync(file, TOKEN, 'utf8');
    chmodSync(file, fileMode);
    chmodSync(stateDir, dirMode);
    return stateDir;
  }

  function refusal(provision: ReturnType<typeof ensureCredential>): string {
    expect(provision.kind).toBe('unprovisionable');
    expect(provision).not.toHaveProperty('token');
    return provision.kind === 'unprovisionable' ? provision.detail : '';
  }

  it('accepts an 0600 file in an 0700 directory', () => {
    const provision = ensureCredential(provisioned(0o700, 0o600));
    expect(provision.kind).toBe('reused');
    if (provision.kind === 'reused') expect(provision.token).toBe(TOKEN);
  });

  it('accepts an 0600 file in an 0755 directory: others may list it, not read the token', () => {
    const provision = ensureCredential(provisioned(0o755, 0o600));
    expect(provision.kind).toBe('reused');
    if (provision.kind === 'reused') expect(provision.token).toBe(TOKEN);
  });

  it('refuses an other-readable 0644 file', () => {
    const detail = refusal(ensureCredential(provisioned(0o700, 0o644)));
    expect(detail).toContain('existing credential file mode 0644 grants group or other access');
  });

  it('refuses a group-readable 0640 file', () => {
    const detail = refusal(ensureCredential(provisioned(0o700, 0o640)));
    expect(detail).toContain('existing credential file mode 0640 grants group or other access');
  });

  // The target stays inside the state dir: one outside it is already
  // refused by the state-write boundary, which would mask this predicate.
  it('refuses a symlinked credential file without following it', () => {
    const stateDir = join(tempDir(), 'state');
    mkdirSync(stateDir, { mode: 0o700 });
    const target = join(stateDir, 'elsewhere.token');
    writeFileSync(target, TOKEN, { encoding: 'utf8', mode: 0o600 });
    symlinkSync(target, join(stateDir, CREDENTIAL_FILE_NAME));

    const detail = refusal(ensureCredential(stateDir));
    expect(detail).toContain('existing credential file is a symbolic link');
  });

  it('refuses a dangling symlink rather than minting through it', () => {
    const base = tempDir();
    const stateDir = join(base, 'state');
    mkdirSync(stateDir, { mode: 0o700 });
    const target = join(base, 'planted.token');
    symlinkSync(target, join(stateDir, CREDENTIAL_FILE_NAME));

    const detail = refusal(ensureCredential(stateDir));
    expect(detail).toContain('existing credential file is a symbolic link');
    expect(() => statSync(target)).toThrow();
  });

  it('refuses a file owned by another uid (injected stat)', () => {
    const stateDir = provisioned(0o700, 0o600);
    const file = join(stateDir, CREDENTIAL_FILE_NAME);
    const uid = 4242;
    const lstat = (target: string) => {
      const real = lstatSync(target);
      return {
        mode: real.mode,
        uid: target === file ? uid + 1 : uid,
        isFile: () => real.isFile(),
        isDirectory: () => real.isDirectory(),
        isSymbolicLink: () => real.isSymbolicLink(),
      };
    };

    const detail = refusal(ensureCredential(stateDir, { lstat, uid }));
    expect(detail).toContain("existing credential file is owned by uid 4243, not the daemon's uid 4242");
  });

  it('refuses a world-writable 0777 directory', () => {
    const detail = refusal(ensureCredential(provisioned(0o777, 0o600)));
    expect(detail).toContain('state directory mode 0777 is group- or other-writable');
  });

  it('refuses a group-writable 0775 directory', () => {
    const detail = refusal(ensureCredential(provisioned(0o775, 0o600)));
    expect(detail).toContain('state directory mode 0775 is group- or other-writable');
  });

  it('refuses a state directory owned by another uid (injected stat)', () => {
    const stateDir = provisioned(0o700, 0o600);
    const uid = 4242;
    const lstat = (target: string) => {
      const real = lstatSync(target);
      return {
        mode: real.mode,
        uid: target === stateDir ? uid + 1 : uid,
        isFile: () => real.isFile(),
        isDirectory: () => real.isDirectory(),
        isSymbolicLink: () => real.isSymbolicLink(),
      };
    };

    const detail = refusal(ensureCredential(stateDir, { lstat, uid }));
    expect(detail).toContain("state directory is owned by uid 4243, not the daemon's uid 4242");
  });

  it('refuses a symlinked state directory', () => {
    const realDir = provisioned(0o700, 0o600);
    const linkedDir = join(tempDir(), 'linked-state');
    symlinkSync(realDir, linkedDir);

    const detail = refusal(ensureCredential(linkedDir));
    expect(detail).toContain('state directory is a symbolic link or not a directory');
  });

  it('refuses a state directory that is not a directory (injected stat)', () => {
    const stateDir = provisioned(0o700, 0o600);
    const lstat = (target: string) => {
      const real = lstatSync(target);
      return {
        mode: real.mode,
        uid: real.uid,
        isFile: () => real.isFile(),
        isDirectory: () => (target === stateDir ? false : real.isDirectory()),
        isSymbolicLink: () => real.isSymbolicLink(),
      };
    };

    const detail = refusal(ensureCredential(stateDir, { lstat }));
    expect(detail).toContain('state directory is a symbolic link or not a directory');
  });

  it('refuses every reuse when the platform reports no process uid', () => {
    const detail = refusal(ensureCredential(provisioned(0o700, 0o600), { uid: undefined }));
    expect(detail).toContain('this platform reports no process uid');
  });

  it('the six refusals carry six distinct details', () => {
    const base = tempDir();
    const linked = join(base, 'linked');
    mkdirSync(linked, { mode: 0o700 });
    writeFileSync(join(linked, 't'), TOKEN, { encoding: 'utf8', mode: 0o600 });
    symlinkSync(join(linked, 't'), join(linked, CREDENTIAL_FILE_NAME));
    const foreign = provisioned(0o700, 0o600);
    const foreignLstat = (target: string) => {
      const real = lstatSync(target);
      return {
        mode: real.mode,
        uid: target.endsWith(CREDENTIAL_FILE_NAME) ? 1 : 0,
        isFile: () => real.isFile(),
        isDirectory: () => real.isDirectory(),
        isSymbolicLink: () => real.isSymbolicLink(),
      };
    };

    const details = [
      refusal(ensureCredential(provisioned(0o700, 0o644))),
      refusal(ensureCredential(provisioned(0o700, 0o640))),
      refusal(ensureCredential(linked)),
      refusal(ensureCredential(foreign, { lstat: foreignLstat, uid: 0 })),
      refusal(ensureCredential(provisioned(0o777, 0o600))),
      refusal(ensureCredential(provisioned(0o775, 0o600))),
    ];
    expect(new Set(details).size).toBe(6);
  });
});

describe('RT3 — state-write boundary', () => {
  it('authorizes a plain file name inside the state dir', () => {
    const stateDir = tempDir();
    const decision = authorizeStateWrite(stateDir, 'daemon.state');
    expect(decision.authorized).toBe(true);
    if (decision.authorized) {
      expect(decision.absolutePath).toBe(join(stateDir, 'daemon.state'));
    }
  });

  it('refuses traversal out of the state dir, named', () => {
    const decision = authorizeStateWrite(tempDir(), '../escape.txt');
    expect(decision.authorized).toBe(false);
    if (!decision.authorized) {
      expect(decision.refusedBy).toBe('traversal');
    }
  });

  // syzygy-bpyt.7.14: containment compares whole path segments, so a
  // sibling whose name only begins with the state dir's name is outside.
  it('refuses a sibling directory whose name extends the state dir name, as traversal', () => {
    const stateDir = tempDir();
    mkdirSync(`${stateDir}-x`);
    cleanups.push(`${stateDir}-x`);
    const decision = authorizeStateWrite(stateDir, `../${basename(stateDir)}-x/f`);
    expect(decision.authorized).toBe(false);
    if (!decision.authorized) {
      expect(decision.refusedBy).toBe('traversal');
    }
  });

  // syzygy-bpyt.7.16: lexical containment compares case too. The `rt3-cred-` prefix
  // holds letters, so the upper-cased name always differs from the state dir's.
  it('refuses a sibling whose name differs from the state dir name only in case, as traversal', () => {
    const stateDir = tempDir();
    const decision = authorizeStateWrite(stateDir, `../${basename(stateDir).toUpperCase()}/f`);
    expect(decision.authorized).toBe(false);
    if (!decision.authorized) {
      expect(decision.refusedBy).toBe('traversal');
    }
  });

  it('refuses empty and self-naming candidates, named', () => {
    const stateDir = tempDir();
    for (const candidate of ['', '.', '  ']) {
      const decision = authorizeStateWrite(stateDir, candidate);
      expect(decision.authorized).toBe(false);
      if (!decision.authorized) {
        expect(decision.refusedBy).toBe('degenerate-input');
      }
    }
  });

  it('refuses a symlink escape, named', () => {
    const base = tempDir();
    const stateDir = join(base, 'state');
    const outside = join(base, 'outside');
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(outside, { recursive: true });
    symlinkSync(outside, join(stateDir, 'link'));

    const decision = authorizeStateWrite(stateDir, 'link/escape.txt');
    expect(decision.authorized).toBe(false);
    if (!decision.authorized) {
      expect(decision.refusedBy).toBe('symlink-escape');
    }
  });

  // syzygy-bpyt.7.14: the real-location check compares whole segments too.
  it('refuses a symlink into a sibling whose name extends the state dir name, named', () => {
    const base = tempDir();
    const stateDir = join(base, 'state');
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(join(base, 'state-x'));
    symlinkSync(join(base, 'state-x'), join(stateDir, 'link'));

    const decision = authorizeStateWrite(stateDir, 'link/escape.txt');
    expect(decision.authorized).toBe(false);
    if (!decision.authorized) {
      expect(decision.refusedBy).toBe('symlink-escape');
    }
  });

  it('refuses a symlink into a sibling whose name differs from the state dir name only in case, named', () => {
    const base = tempDir();
    const stateDir = join(base, 'state');
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(join(base, 'STATE'));
    symlinkSync(join(base, 'STATE'), join(stateDir, 'link'));

    const decision = authorizeStateWrite(stateDir, 'link/escape.txt');
    expect(decision.authorized).toBe(false);
    if (!decision.authorized) {
      expect(decision.refusedBy).toBe('symlink-escape');
    }
  });
});

describe('RT3 — credential verification through core admission', () => {
  const TOKEN = 'a'.repeat(64);

  it('a correct bearer header is admitted as a machine client', () => {
    const credential = credentialFromAuthorizationHeader(`Bearer ${TOKEN}`);
    const result = verifyCredential(TOKEN, credential);
    expect(result).toEqual({ admitted: true, clientClass: 'machine' });
  });

  it('a wrong token refuses with the named vocabulary, never a bare string', () => {
    const credential = credentialFromAuthorizationHeader(`Bearer ${'b'.repeat(64)}`);
    const result = verifyCredential(TOKEN, credential);
    expect(result).toEqual({ admitted: false, served: 'nothing' });
  });

  it('a missing header is a non-presented credential and refuses, named', () => {
    const credential = credentialFromAuthorizationHeader(undefined);
    expect(credential).toEqual({ presented: false });
    expect(verifyCredential(TOKEN, credential)).toEqual({
      admitted: false,
      served: 'nothing',
    });
  });

  it('non-Bearer and empty-token headers refuse, named', () => {
    for (const header of ['Basic dXNlcg==', 'Bearer', 'Bearer ', `bearer ${TOKEN}`, TOKEN]) {
      const credential = credentialFromAuthorizationHeader(header);
      expect(verifyCredential(TOKEN, credential)).toEqual({
        admitted: false,
        served: 'nothing',
      });
    }
  });

  // syzygy-bpyt.7.14: the scheme is followed by exactly one space and the
  // token is every character after it, never trimmed. syzygy-bpyt.7.16: the
  // scheme opens the header, and the one space is U+0020, not another space.
  it('the minted token with leading, separator or trailing whitespace variations refuses, named', () => {
    for (const header of [`Bearer  ${TOKEN}`, `Bearer\t${TOKEN}`, `Bearer ${TOKEN} `, `Bearer ${TOKEN}\n`, ` Bearer ${TOKEN}`, `Bearer\u00a0${TOKEN}`]) {
      const credential = credentialFromAuthorizationHeader(header);
      expect(verifyCredential(TOKEN, credential), JSON.stringify(header)).toEqual({
        admitted: false,
        served: 'nothing',
      });
    }
  });
});
