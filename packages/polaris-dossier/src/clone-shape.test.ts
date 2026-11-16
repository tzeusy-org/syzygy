import * as fs from 'node:fs';
import * as path from 'node:path';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { cloneGitDirShape } from './clone-shape.js';

/** The copy's form for a SHA-256 copy (REQ-polaris-generation-047: "the repository format version and object-format setting that format
 * needs included"), against `.git` layouts written by hand here. The SHA-1 form and every other entry are pinned by start-gates.test.ts
 * against git-made clones; these cases pin only the config allowance and that it is the copy's alone. Expected reasons are literals. */

const S256 = '5'.repeat(64), S1 = '1'.repeat(40);
const SHAPE = 'the clone must hold the consented commit alone, fetched into an empty repository (git init, git fetch --depth=1 <url> <commit>, git checkout --detach FETCH_HEAD)';
const REMAKE = 'make it again in a new directory with git init --template= <dir> (an empty template, so no template or global init configuration adds anything), then the printed fetch and checkout';
const SHA256_CONFIG = '[extensions]\n\tobjectformat = sha256\n[core]\n\trepositoryformatversion = 1\n\tfilemode = true\n\tbare = false\n\tlogallrefupdates = true\n';

function gitDir(commit: string, config: string): string {
  const dir = path.join(tempDir('syzygy-clone-shape-'), '.git');
  for (const sub of ['objects', 'refs/heads']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  fs.writeFileSync(path.join(dir, 'HEAD'), `${commit}\n`);
  fs.writeFileSync(path.join(dir, 'config'), config);
  return dir;
}
const refused = (why: string) => ({ ok: false, reason: `${why}; ${SHAPE}; ${REMAKE}` });

describe('the copy\'s SHA-256 form: the object-format setting git init writes, and nothing more', () => {
  it('admits the config git init --object-format=sha256 writes, for a 64-digit commit, when the copy asks', () => {
    expect(cloneGitDirShape(gitDir(S256, SHA256_CONFIG), S256, { objectFormatSetting: true })).toEqual({ ok: true });
  });

  it('refuses it without the copy\'s allowance: an operator-made clone keeps the SHA-1 form', () => {
    expect(cloneGitDirShape(gitDir(S256, SHA256_CONFIG), S256)).toEqual(refused('config holds a [extensions] section, and the config git init writes holds [core] alone'));
  });

  it('gives a 40-digit commit no allowance, whatever the copy asks', () => {
    expect(cloneGitDirShape(gitDir(S1, SHA256_CONFIG), S1, { objectFormatSetting: true })).toEqual(refused('config holds a [extensions] section, and the config git init writes holds [core] alone'));
  });

  it('refuses another extension, a second object format, a format version other than 1, and a missing setting', () => {
    expect(cloneGitDirShape(gitDir(S256, SHA256_CONFIG.replace('objectformat = sha256\n', 'objectformat = sha256\n\tpartialclone = origin\n')), S256, { objectFormatSetting: true }))
      .toEqual(refused('config sets extensions.partialclone other than the one objectformat = sha256 git init writes'));
    expect(cloneGitDirShape(gitDir(S256, SHA256_CONFIG.replace('objectformat = sha256\n', 'objectformat = sha256\n\tobjectformat = sha256\n')), S256, { objectFormatSetting: true }))
      .toEqual(refused('config sets extensions.objectformat other than the one objectformat = sha256 git init writes'));
    expect(cloneGitDirShape(gitDir(S256, SHA256_CONFIG.replace('repositoryformatversion = 1', 'repositoryformatversion = 0')), S256, { objectFormatSetting: true }))
      .toEqual(refused('config sets core.repositoryformatversion to a value other than the 1 a SHA-256 repository needs'));
    expect(cloneGitDirShape(gitDir(S256, '[core]\n\trepositoryformatversion = 1\n\tbare = false\n'), S256, { objectFormatSetting: true }))
      .toEqual(refused('config lacks the extensions.objectformat = sha256 and core.repositoryformatversion = 1 a SHA-256 repository needs'));
  });
});
