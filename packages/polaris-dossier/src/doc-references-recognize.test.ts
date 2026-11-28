import { describe, expect, it } from 'vitest';
import { normalise, recognizeDocReferences, type DocCandidate } from './doc-references-recognize.js';

// syzygy-5dhm.119 (REQ-polaris-generation-034 version 2.48): what recognizer doc-reference v1 reads in one Markdown body. Every expected
// value is a literal written from the fixture text.

const read = (text: string, documentPath = 'docs/guide.md') => {
  const r = recognizeDocReferences(text, documentPath);
  if (!r.ok) throw new Error(`unparsed: ${r.parseFault}`);
  return r;
};
const brief = (c: DocCandidate) => c.form === 'identifier'
  ? ['identifier', c.value, c.name, c.line]
  : ['path', c.written, c.value, c.line, c.tryPaths, c.tail, c.directory, c.ambiguous, c.outside];

describe('doc-reference v1: code spans', () => {
  it('classes each span by its written form', () => {
    const text = [
      'Run `src/app.ts` and `src/app.ts:12-14`, see `server.c` and `.gitignore`.', // 1
      'Also `./notes.md`, `../top.txt`, `lib/` and `src/core`.', // 2
      'Names: `deriveRoughEdges`, `os.path`, `Foo::bar()`, `MAX_SIZE`, `run()`.', // 3
      'Weak: `Node.js`; words `build`, `Server`, `API`, `_`, `1.2.3`, `e.g.`, `a b`, `--flag`, `x=1`, `/etc/hosts`.', // 4
    ].join('\n');
    const r = read(text);
    expect(r.candidates.map(brief)).toEqual([
      ['path', 'code-span', 'src/app.ts', 1, ['src/app.ts', 'docs/src/app.ts'], 'src/app.ts', false, false, false],
      ['path', 'code-span', 'src/app.ts:12-14', 1, ['src/app.ts', 'docs/src/app.ts'], 'src/app.ts', false, false, false],
      ['path', 'code-span', 'server.c', 1, [], 'server.c', false, false, false],
      ['path', 'code-span', '.gitignore', 1, [], '.gitignore', false, false, false],
      ['path', 'code-span', './notes.md', 2, ['docs/notes.md'], null, false, false, false],
      ['path', 'code-span', '../top.txt', 2, ['top.txt'], null, false, false, false],
      ['path', 'code-span', 'lib/', 2, ['lib', 'docs/lib'], 'lib', true, false, false],
      ['path', 'code-span', 'src/core', 2, ['src/core', 'docs/src/core'], 'src/core', false, true, false],
      ['identifier', 'deriveRoughEdges', 'deriveRoughEdges', 3],
      ['identifier', 'os.path', 'path', 3],
      ['identifier', 'Foo::bar()', 'bar', 3],
      ['identifier', 'MAX_SIZE', 'MAX_SIZE', 3],
      ['identifier', 'run()', 'run', 3],
      ['path', 'code-span', 'Node.js', 4, [], 'Node.js', false, true, false],
    ]);
    expect(r.spansNotChecked).toBe(10);
    expect(r.linksNotChecked).toBe(0);
  });

  it('reads no span inside a fence, strips one space per CommonMark, and quotes the trimmed line', () => {
    const r = read('```\n`src/hidden.ts`\n```\n\t  Use `` src/a.py `` here.  \n');
    expect(r.candidates.map((c) => [c.value, c.line, c.quote])).toEqual([['src/a.py', 4, 'Use `` src/a.py `` here.']]);
    expect(r.spansNotChecked).toBe(0);
  });

  it('counts lines at CRLF and CR, and drops a leading byte-order mark from line 1', () => {
    const r = read('\uFEFF`a/b.md`\r\nx\r`c/d.md`\n');
    expect(r.candidates.map((c) => [c.value, c.line, c.quote])).toEqual([['a/b.md', 1, '`a/b.md`'], ['c/d.md', 3, '`c/d.md`']]);
  });

  it('quotes a line past 256 characters by an exact excerpt of 256 that holds the reading, never a split surrogate pair', () => {
    const late = `${'x'.repeat(200)} \`a/b.md\` ${'y'.repeat(100)}`;
    const early = `\`c/d.md\` ${'z'.repeat(300)}`;
    const pair = `${'w'.repeat(54)}\u{1F600}${'v'.repeat(150)} \`e/f.md\` ${'u'.repeat(95)}`;
    const cut = `\`g/i.md\` ${'z'.repeat(246)}\u{1F600}${'z'.repeat(60)}`;
    const r = read(`${late}\n${early}\n${pair}\n${cut}\n`);
    expect(r.candidates.map((c) => [c.value, c.quoteExcerpt, c.quote])).toEqual([
      ['a/b.md', true, late.slice(54)], ['c/d.md', true, early.slice(0, 256)], ['e/f.md', true, pair.slice(56, 311)], ['g/i.md', true, cut.slice(0, 255)],
    ]);
    expect(read('`g/h.md`\n').candidates[0]!.quoteExcerpt).toBe(false);
  });

  it('refuses a body whose code contexts are malformed', () => {
    expect(recognizeDocReferences('text `open\n\n```\nfence\n', 'README.md')).toEqual({ ok: false, parseFault: 'unclosed-inline-span' });
    expect(recognizeDocReferences('```\nnever closed\n', 'README.md')).toEqual({ ok: false, parseFault: 'unclosed-fence' });
  });
});

describe('doc-reference v1: links', () => {
  it('resolves a relative destination against the document directory and reads no URL, fragment or absolute path', () => {
    const text = [
      'See [the api](api.md#top), [up](../README.md "t"), ![img](img/a%20b.png) and [dir](sub/).',
      '[web](https://example.com/x.md), [mail](mailto:a@b.c), [frag](#here), [abs](/root.md), [bad](%E0%A4%A).',
      '[out](../../x.md), `[code](in-span.md)` and [mixed `span`](mixed.md).',
      '```',
      '[fenced](fenced.md)',
      '```',
    ].join('\n');
    const r = read(text, 'docs/guide.md');
    expect(r.candidates.filter((c) => c.written === 'link').map(brief)).toEqual([
      ['path', 'link', 'api.md#top', 1, ['docs/api.md'], null, false, false, false],
      ['path', 'link', '../README.md', 1, ['README.md'], null, false, false, false],
      ['path', 'link', 'img/a%20b.png', 1, ['docs/img/a b.png'], null, false, false, false],
      ['path', 'link', 'sub/', 1, ['docs/sub'], null, true, false, false],
      ['path', 'link', '../../x.md', 3, [], null, false, false, true],
      ['path', 'link', 'mixed.md', 3, ['docs/mixed.md'], null, false, false, false],
    ]);
    expect(r.linksNotChecked).toBe(5);
  });

  it('counts the outer link around a linked image as not read (R-DOCS-AND-CODE-1 F5)', () => {
    const r = read('[![logo](img/logo.png)](outer.md) and [plain](p.md)](not-nested).\n', 'README.md');
    expect(r.candidates.map((c) => c.value)).toEqual(['img/logo.png', 'p.md']);
    expect(r.linksNotChecked).toBe(2);
    expect(read('[a](b.md) then ](c.md)\n', 'README.md').linksNotChecked).toBe(0);
  });
});

describe('normalise', () => {
  it('joins, resolves dot segments and flags a climb above the root', () => {
    expect(normalise('a/b', '../c/./d')).toEqual({ path: 'a/c/d', outside: false });
    expect(normalise('', './x/')).toEqual({ path: 'x', outside: false });
    expect(normalise('a', '../../x')).toEqual({ path: '', outside: true });
  });
});
