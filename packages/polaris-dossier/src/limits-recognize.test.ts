import { describe, expect, it } from 'vitest';
import { kindOf, limitCandidateOf, recognizeConfig, recognizeConstants, type RecognizedLimits } from './limits-recognize.js';

// syzygy-5dhm.116 (REQ-polaris-generation-034 version 2.52): recognizer limit-default v1, one fixture per file form. Every expected row is a
// literal written from the fixture text before the recognizer ran.

const rows = (r: RecognizedLimits) => {
  if (!r.ok) throw new Error(`expected a reading, got ${r.parseFault}`);
  return r.limits.map((l) => [l.kind, l.name, l.value, l.valueType, l.line, l.quote]);
};

describe('limit-default v1: candidates', () => {
  it('takes a source file by its extension and a configuration file by its basename', () => {
    expect(['a.py', 'web/x.mts', 'cmd/m.go', 'J.java', 'src/server.c', 'src/server.h', 'lib/a.cpp', 'redis.conf', 'setup.cfg', 'app.ini',
      'charts/x/values.yaml', 'values.yml', 'config.example.yaml', 'deploy/config.example.prod.yml'].map((p) => limitCandidateOf(p))).toEqual([
      { source: 'code', language: 'python' }, { source: 'code', language: 'javascript' }, { source: 'code', language: 'go' },
      { source: 'code', language: 'java' }, { source: 'code', language: 'c' }, { source: 'code', language: 'c' }, { source: 'code', language: 'c' },
      { source: 'config', form: 'ini' }, { source: 'config', form: 'ini' }, { source: 'config', form: 'ini' },
      { source: 'config', form: 'yaml' }, { source: 'config', form: 'yaml' }, { source: 'config', form: 'yaml' }, { source: 'config', form: 'yaml' },
    ]);
  });

  it('takes no other file, and no basename that is only an extension', () => {
    for (const p of ['.py', 'README.md', 'other.yaml', 'values.json', 'config.example.json', 'x.conf.bak', 'Cargo.toml']) expect(limitCandidateOf(p), p).toBeUndefined();
  });
});

describe('limit-default v1: names', () => {
  it('kinds a name by the first pattern it matches, and takes no other name', () => {
    expect(['READ_TIMEOUT', 'DEFAULT_TIMEOUT', 'GC_THRESHOLD', 'RATE_LIMIT', 'LIMITS_X', 'MAX_SIZE', 'BUF_MAXLEN', '_MAX_X', 'DEFAULT_PORT', '__DEFAULT_X']
      .map(kindOf)).toEqual(['timeout', 'timeout', 'threshold', 'limit', 'limit', 'max', 'max', 'max', 'default', 'default']);
    for (const name of ['PORT', 'MINIMUM', 'XMAX', 'FOO_DEFAULT', 'CONFIG_DEFAULT_HZ', 'Max_SIZE']) expect(kindOf(name), name).toBeUndefined();
  });

  it('defines no constant by a name that is not upper case, though a kind pattern would match its tail', () => {
    expect(rows(recognizeConstants('read_TIMEOUT = 5\nMaxRetries_LIMIT = 3\n', 'python'))).toEqual([]);
    expect(rows(recognizeConstants('const idle_TIMEOUT = 5;\n', 'javascript'))).toEqual([]);
  });
});

describe('limit-default v1: source forms', () => {
  it('reads Python definitions in code, never in a comment or a string, and types each value', () => {
    const text = [
      'MAX_RETRIES = 5',
      'READ_TIMEOUT: float = 2.5  # seconds',
      '# MAX_IN_COMMENT = 9',
      'DOC = """',
      'MAX_IN_STRING = 7',
      '"""',
      'DEFAULT_NAME = "svc"',
      'DEFAULT_FMT = f"{x}"',
      'BUF_LIMIT = 1 << 20',
      'DEFAULT_ON = True',
      'MAX_DERIVED = compute()',
      'PORT = 80',
      '    _MAX_NESTED = (2 ** 30)',
      'MAX_X += 1',
      'MAX_EQ == 2',
    ].join('\n');
    expect(rows(recognizeConstants(text, 'python'))).toEqual([
      ['max', 'MAX_RETRIES', '5', 'integer', 1, 'MAX_RETRIES = 5'],
      ['timeout', 'READ_TIMEOUT', '2.5', 'decimal', 2, 'READ_TIMEOUT: float = 2.5  # seconds'],
      ['default', 'DEFAULT_NAME', '"svc"', 'string', 7, 'DEFAULT_NAME = "svc"'],
      ['default', 'DEFAULT_FMT', null, null, 8, 'DEFAULT_FMT = f"{x}"'],
      ['limit', 'BUF_LIMIT', '1 << 20', 'expression', 9, 'BUF_LIMIT = 1 << 20'],
      ['default', 'DEFAULT_ON', 'True', 'boolean', 10, 'DEFAULT_ON = True'],
      ['max', 'MAX_DERIVED', null, null, 11, 'MAX_DERIVED = compute()'],
      ['max', '_MAX_NESTED', '(2 ** 30)', 'expression', 13, '_MAX_NESTED = (2 ** 30)'],
    ]);
  });

  it('reads JavaScript and TypeScript declarations and class fields', () => {
    const text = [
      'export const MANIFEST_BLOB_LIMIT = 1_048_576;',
      'const IDLE_TIMEOUT: number = 30_000',
      'let DEFAULT_MODE = `fast`;',
      'const DEFAULT_URL = `${base}/x`;',
      '  static readonly MAX_ITEMS = 100;',
      '// export const MAX_COMMENTED = 1;',
      'const s = "const MAX_IN_STRING = 1";',
      'const MAX_FN = () => 3;',
      'const MAX_NEG = -1n;',
      'const MAX_F: (a: number) => number = (a) => a;',
    ].join('\n');
    expect(rows(recognizeConstants(text, 'javascript'))).toEqual([
      ['limit', 'MANIFEST_BLOB_LIMIT', '1_048_576', 'integer', 1, 'export const MANIFEST_BLOB_LIMIT = 1_048_576;'],
      ['timeout', 'IDLE_TIMEOUT', '30_000', 'integer', 2, 'const IDLE_TIMEOUT: number = 30_000'],
      ['default', 'DEFAULT_MODE', '`fast`', 'string', 3, 'let DEFAULT_MODE = `fast`;'],
      ['default', 'DEFAULT_URL', null, null, 4, 'const DEFAULT_URL = `${base}/x`;'],
      ['max', 'MAX_ITEMS', '100', 'integer', 5, 'static readonly MAX_ITEMS = 100;'],
      ['max', 'MAX_FN', null, null, 8, 'const MAX_FN = () => 3;'],
      ['max', 'MAX_NEG', '-1n', 'integer', 9, 'const MAX_NEG = -1n;'],
    ]);
  });

  it('reads Go constants, Java static fields and C macros and declarations', () => {
    expect(rows(recognizeConstants('const (\n\tMAX_CONNS = 64\n\tDEFAULT_HOST string = "localhost"\n)\nvar READ_TIMEOUT = 5 * time.Second\n', 'go'))).toEqual([
      ['max', 'MAX_CONNS', '64', 'integer', 2, 'MAX_CONNS = 64'],
      ['default', 'DEFAULT_HOST', '"localhost"', 'string', 3, 'DEFAULT_HOST string = "localhost"'],
      ['timeout', 'READ_TIMEOUT', null, null, 5, 'var READ_TIMEOUT = 5 * time.Second'],
    ]);
    expect(rows(recognizeConstants('class A {\n  public static final int MAX_DEPTH = 32;\n  private static final long IDLE_TIMEOUT = 60L * 1000L;\n  int MAX_LOCAL = 1;\n}\n', 'java'))).toEqual([
      ['max', 'MAX_DEPTH', '32', 'integer', 2, 'public static final int MAX_DEPTH = 32;'],
      ['timeout', 'IDLE_TIMEOUT', '60L * 1000L', 'expression', 3, 'private static final long IDLE_TIMEOUT = 60L * 1000L;'],
    ]);
    // A Java definition is one line ending in `;`: one continued on the next line is not read.
    expect(rows(recognizeConstants('class B {\n  private static final int MAX_SIZE = 1024 *\n      1024;\n}\n', 'java'))).toEqual([]);
    const c = '#define CONFIG_DEFAULT_HZ 10 /* Hz */\n#define DEFAULT_PORT (6379)\n#define MAX_SUM (1) + (2)\n#define MAX(a, b) ((a) > (b))\n# define PROTO_MAX_SIZE (512*1024*1024)\nstatic const size_t LOOKUP_LIMIT = 0x100;\n/* #define MAX_OFF 3 */\n#define HAVE_MAX_FLAG\n';
    expect(rows(recognizeConstants(c, 'c'))).toEqual([
      ['default', 'DEFAULT_PORT', '(6379)', 'integer', 2, '#define DEFAULT_PORT (6379)'],
      ['max', 'MAX_SUM', '(1) + (2)', 'expression', 3, '#define MAX_SUM (1) + (2)'],
      ['max', 'PROTO_MAX_SIZE', '(512*1024*1024)', 'expression', 5, '# define PROTO_MAX_SIZE (512*1024*1024)'],
      ['limit', 'LOOKUP_LIMIT', '0x100', 'integer', 6, 'static const size_t LOOKUP_LIMIT = 0x100;'],
    ]);
  });

  it('takes CR, LF and CRLF as line ends, and drops a leading byte-order mark from line 1', () => {
    expect(rows(recognizeConstants('\uFEFFMAX_A = 1\rMAX_B = 2\r\nMAX_C = 3\n', 'python')).map((r) => [r[1], r[4], r[5]]))
      .toEqual([['MAX_A', 1, 'MAX_A = 1'], ['MAX_B', 2, 'MAX_B = 2'], ['MAX_C', 3, 'MAX_C = 3']]);
  });

  it('states a fault instead of reading past an unterminated string or comment', () => {
    expect(recognizeConstants('MAX_A = 1\nx = """\n', 'python')).toEqual({ ok: false, parseFault: 'unterminated' });
    expect(recognizeConstants('/* MAX_A = 1;\n', 'c')).toEqual({ ok: false, parseFault: 'unterminated' });
  });

  it('types no value it cannot read whole', () => {
    const values = ['1 2', '(1 + 2', '1 +', '* 2', '* 2 + 1', '- (5)', 'MAX_B', '"a" "b"', '1.5.2', 'null', '1) + (2'];
    const text = values.map((v, k) => `MAX_${k} = ${v}`).join('\n');
    expect(rows(recognizeConstants(text, 'python')).map((r) => [r[2], r[3]])).toEqual(values.map(() => [null, null]));
  });
});

describe('limit-default v1: configuration forms', () => {
  it('reads ini entries under their section, typed, with comments, sections and bare keys left out', () => {
    const text = '# redis-like\nmaxmemory 2gb\ntimeout 0\n; note\n[server]\nport = 6379\nverbose: yes\nname = "svc"\nratio=0.75\nskip-networking\nempty =\ndebug = On\n';
    expect(rows(recognizeConfig(text, 'ini'))).toEqual([
      ['entry', 'maxmemory', '2gb', 'text', 2, 'maxmemory 2gb'],
      ['entry', 'timeout', '0', 'integer', 3, 'timeout 0'],
      ['entry', 'server.port', '6379', 'integer', 6, 'port = 6379'],
      ['entry', 'server.verbose', 'yes', 'boolean', 7, 'verbose: yes'],
      ['entry', 'server.name', '"svc"', 'string', 8, 'name = "svc"'],
      ['entry', 'server.ratio', '0.75', 'decimal', 9, 'ratio=0.75'],
      ['entry', 'server.debug', 'On', 'boolean', 12, 'debug = On'],
    ]);
  });

  it('makes an ini file with a block or an unread line Unknown rather than read past it', () => {
    expect(recognizeConfig('server {\n  listen 80;\n}\n', 'ini')).toEqual({ ok: false, parseFault: 'outside-grammar' });
    expect(recognizeConfig('a = 1\n= 2\n', 'ini')).toEqual({ ok: false, parseFault: 'outside-grammar' });
    expect(recognizeConfig('events {\n  worker_connections 1024;\n', 'ini')).toEqual({ ok: false, parseFault: 'outside-grammar' });
    expect(recognizeConfig('  = 1\n', 'ini')).toEqual({ ok: false, parseFault: 'outside-grammar' });
  });

  it('reads an ini line indented under an entry or a key as that key\'s value continued, so the key\'s value is Unknown', () => {
    const tox = '[testenv]\ndeps =\n    pytest-cov >= 2\n    click\ncommands =\n    pytest --timeout 30 {posargs}\nsetenv = PYTHONHASHSEED=0\n\n    LANG=C\npassenv = HOME\n';
    expect(rows(recognizeConfig(tox, 'ini'))).toEqual([
      ['entry', 'testenv.deps', null, null, 2, 'deps ='],
      ['entry', 'testenv.commands', null, null, 5, 'commands ='],
      ['entry', 'testenv.setenv', null, null, 7, 'setenv = PYTHONHASHSEED=0'],
      ['entry', 'testenv.passenv', 'HOME', 'text', 10, 'passenv = HOME'],
    ]);
    const cfg = '[options]\ninstall_requires =\n    requests >= 2.0\nzip_safe = False\n';
    expect(rows(recognizeConfig(cfg, 'ini'))).toEqual([
      ['entry', 'options.install_requires', null, null, 2, 'install_requires ='],
      ['entry', 'options.zip_safe', 'False', 'boolean', 4, 'zip_safe = False'],
    ]);
    // Keys indented alike under a section are entries, not continuations; a section ends the entry before it.
    expect(rows(recognizeConfig('[core]\n\tbare = false\n\tfilemode = true\n[user]\n\tname = x\n', 'ini'))).toEqual([
      ['entry', 'core.bare', 'false', 'boolean', 2, 'bare = false'],
      ['entry', 'core.filemode', 'true', 'boolean', 3, 'filemode = true'],
      ['entry', 'user.name', 'x', 'text', 5, 'name = x'],
    ]);
    expect(rows(recognizeConfig('[a]\nk = 1\n[b]\n  j = 2\n', 'ini'))).toEqual([
      ['entry', 'a.k', '1', 'integer', 2, 'k = 1'],
      ['entry', 'b.j', '2', 'integer', 4, 'j = 2'],
    ]);
  });

  it('reads yaml mappings by their key paths, skipping sequences and block scalars', () => {
    const text = [
      '# chart defaults', '---', 'replicaCount: 1', 'image:', '  repository: nginx', '  tag: "1.25"  # pinned', 'resources:', '  limits:',
      '    memory: 512Mi', '    cpu: 0.5', 'args:', '  - --verbose', '  - --port', 'extra:', '- name: x', '  value: y', 'debug: false',
      'notes: |', '  timeout: 5', '  not a key', 'nothing: ~', 'labels: {app: web}', 'emptyParent:', 'service:', '  port: 80 # http',
    ].join('\n');
    const r = recognizeConfig(text, 'yaml');
    expect(rows(r)).toEqual([
      ['entry', 'replicaCount', '1', 'integer', 3, 'replicaCount: 1'],
      ['entry', 'image.repository', 'nginx', 'text', 5, 'repository: nginx'],
      ['entry', 'image.tag', '"1.25"', 'string', 6, 'tag: "1.25"  # pinned'],
      ['entry', 'resources.limits.memory', '512Mi', 'text', 9, 'memory: 512Mi'],
      ['entry', 'resources.limits.cpu', '0.5', 'decimal', 10, 'cpu: 0.5'],
      ['entry', 'debug', 'false', 'boolean', 17, 'debug: false'],
      ['entry', 'notes', null, null, 18, 'notes: |'],
      ['entry', 'nothing', '~', 'null', 21, 'nothing: ~'],
      ['entry', 'labels', null, null, 22, 'labels: {app: web}'],
      ['entry', 'service.port', '80', 'integer', 25, 'port: 80 # http'],
    ]);
    expect(r.ok && r.sequenceItems).toBe(3);
  });

  it('makes a yaml file with an anchor, a tag, an open flow, an open quote, a tab or a plain continuation Unknown', () => {
    for (const text of ['a: &x 1\n', 'a: !!int 1\n', 'a: *x\n', 'a: [1,\n  2]\n', 'a: "open\n', 'a:\n\tb: 1\n', 'a: one\n  two\n', '"q": 1\n', '<<: *x\n', 'args:\n  - a\n  \tb\n', 'list:\n  - a\n    \tb\n', 'k: [a, b\n', 'a: 1\n  max_b: 2\n', 'a: b: c\n', 'a: 1\n  - x\n', 'a: b:\n']) {
      expect(recognizeConfig(text, 'yaml'), JSON.stringify(text)).toEqual({ ok: false, parseFault: 'outside-grammar' });
    }
  });
});
