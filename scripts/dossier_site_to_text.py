#!/usr/bin/env python3
"""Convert a rendered Polaris dossier site to the plain text a reader session is given (syzygy-5dhm.133, R29 slice 1).

    python3 scripts/dossier_site_to_text.py SITE_DIR OUT_DIR [--report FILE]
    python3 scripts/dossier_site_to_text.py --selftest

One text file per HTML page of SITE_DIR (the page's path with `.md` for `.html`), written under OUT_DIR, which must not exist
or must be empty. Only the page's `main` element is kept: no navigation, banner, style or script. A heading becomes a line of
`#` marks and its text, a list item a `- ` line, a table row its cells joined by ` | `, a figure caption a `Figure: ` line, an
SVG one `[figure text: ...]` line of its distinct title and text labels, an image its alternative text, and a citation its
visible mark and its pop-up as `[mark: file and lines]`. The raw source pages (every page under `sources/` except
`sources/index.html`) are left out: they are the repository's files, not the dossier's explanation.

Prints counts only, never page text: pages, words (whitespace-separated tokens of the converted text) and the source pages left
out. `--report` writes the same counts with the words per page as JSON. Reads SITE_DIR only and refuses a path inside a
`.agents` or `.sessions` directory. Starts no session.
"""
import argparse
import html.parser
import json
import os
import pathlib
import re
import sys

BLOCK = {'p', 'div', 'section', 'article', 'header', 'footer', 'figure', 'figcaption', 'table', 'tr', 'ul', 'ol', 'dl', 'dt',
         'dd', 'blockquote', 'pre', 'details', 'summary', 'caption', 'aside'}
SKIP = {'style', 'script', 'noscript', 'template'}
RULE = ('every .html under the site except sources/*.html other than sources/index.html; text from <main> only')


class _Converter(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth_main = 0
        self.skip = 0
        self.lines, self.cur = [], []
        self.in_svg = 0
        self.svg_labels = []
        self.cite = 0

    def flush(self):
        text = re.sub(r'\s+', ' ', ''.join(self.cur)).strip()
        if text:
            self.lines.append(text)
        self.cur = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'main':
            self.depth_main += 1
        if not self.depth_main:
            return
        if tag in SKIP:
            self.skip += 1
            return
        if tag == 'svg':
            self.flush()
            self.in_svg += 1
            self.svg_labels = []
            return
        if self.in_svg:
            return
        if re.fullmatch(r'h[1-6]', tag):
            self.flush()
            self.cur.append('#' * int(tag[1]) + ' ')
        elif tag == 'li':
            self.flush()
            self.cur.append('- ')
        elif tag in ('td', 'th'):
            self.cur.append(' | ')
        elif tag == 'br':
            self.flush()
        elif tag in BLOCK:
            self.flush()
            if tag == 'figcaption':
                self.cur.append('Figure: ')
        elif tag == 'img' and a.get('alt'):
            self.cur.append(f"[image: {a['alt']}]")
        if tag == 'a' and 'cite' in (a.get('class') or '').split():
            self.cite += 1
            self.cur.append(' [')
        if tag == 'span' and 'cite-pop' in (a.get('class') or '').split():
            self.cur.append(': ')

    def handle_endtag(self, tag):
        if not self.depth_main:
            return
        if tag == 'main':
            self.depth_main -= 1
            self.flush()
            return
        if tag in SKIP:
            self.skip -= 1
            return
        if tag == 'svg':
            self.in_svg -= 1
            labels = list(dict.fromkeys(label for label in self.svg_labels if label))
            if labels:
                self.lines.append('[figure text: ' + '; '.join(labels) + ']')
            return
        if self.in_svg:
            return
        if tag == 'a' and self.cite:
            self.cite -= 1
            self.cur.append(']')
        if re.fullmatch(r'h[1-6]', tag) or tag in BLOCK or tag == 'li':
            self.flush()

    def handle_data(self, data):
        if not self.depth_main or self.skip:
            return
        if self.in_svg:
            text = re.sub(r'\s+', ' ', data).strip()
            if text:
                self.svg_labels.append(text)
            return
        self.cur.append(data)


def page_text(page):
    """The reader text of one HTML page."""
    converter = _Converter()
    converter.feed(page)
    converter.close()
    converter.flush()
    return '\n\n'.join(converter.lines) + '\n'


def is_source_page(relative):
    """Whether a site-relative page path is a raw source page (left out); the sources index is kept."""
    parts = pathlib.PurePosixPath(relative).parts
    return len(parts) > 1 and parts[0] == 'sources' and relative != 'sources/index.html'


def site_pages(site):
    """Every .html page under `site`, as sorted site-relative POSIX paths; symbolic links are not followed."""
    pages = []
    for directory, _, files in os.walk(site, followlinks=False):
        for name in files:
            full = pathlib.Path(directory, name)
            if name.endswith('.html') and full.is_file() and not full.is_symlink():
                pages.append(full.relative_to(site).as_posix())
    return sorted(pages)


def convert_site(site, out):
    """Write the reader text of every kept page under `out`; returns the counts."""
    site, out = pathlib.Path(site), pathlib.Path(out)
    per_page, left_out = {}, 0
    for relative in site_pages(site):
        if is_source_page(relative):
            left_out += 1
            continue
        text = page_text((site / relative).read_text(encoding='utf-8'))
        target = out / (relative[:-len('.html')] + '.md')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding='utf-8')
        per_page[relative] = len(text.split())
    return {'pages': len(per_page), 'words': sum(per_page.values()), 'sourcesPagesExcluded': left_out,
            'perPageWords': per_page, 'rule': RULE}


FIXTURE = """<!doctype html><html><head><title>T</title><style>main{color:red}</style></head><body>
<nav><a href="x.html">NAV-MARK</a></nav>
<main><h1>Request path</h1>
<p>The loop reads   a
command<a class="cite" href="sources/a.html#L3">1<span class="cite-pop">src/ae.c 3-9</span></a> and runs it.</p>
<script>var SCRIPT_MARK = 1;</script>
<ul><li>first step</li><li>second <b>step</b></li></ul>
<table><tr><th>Part</th><th>Role</th></tr><tr><td>ae</td><td>event loop</td></tr></table>
<figure><svg><title>Flow</title><text>client</text><text>server</text><text>client</text><style>.a{}</style></svg>
<figcaption>One request</figcaption></figure>
<p>Line one<br>line two &amp; three</p><img alt="a diagram" src="d.png">
</main><footer>FOOTER-MARK</footer></body></html>"""
FIXTURE_TEXT = ("# Request path\n\n"
                "The loop reads a command [1: src/ae.c 3-9] and runs it.\n\n"
                "- first step\n\n- second step\n\n"
                "| Part | Role\n\n| ae | event loop\n\n"
                "[figure text: Flow; client; server]\n\n"
                "Figure: One request\n\n"
                "Line one\n\nline two & three\n\n"
                "[image: a diagram]\n")


def selftest():
    failures = []
    got = page_text(FIXTURE)
    if got != FIXTURE_TEXT:
        failures.append(f'the fixture page converted to {got!r}')
    # One mutated page per rule: each must change the text (rule 6).
    mutations = (
        ('text outside main', FIXTURE.replace('<nav>', '<main><nav>', 1).replace('</nav>', '</nav></main>', 1)),
        ('a script kept', FIXTURE.replace('<script>', '<p>').replace('</script>', '</p>')),
        ('a heading level', FIXTURE.replace('<h1>', '<h2>').replace('</h1>', '</h2>')),
        ('a citation mark dropped', FIXTURE.replace(' class="cite"', '')),
        ('a citation pop dropped', FIXTURE.replace(' class="cite-pop"', '')),
        ('a list item', FIXTURE.replace('<li>first step</li>', '')),
        ('a table cell', FIXTURE.replace('<td>event loop</td>', '')),
        ('an SVG label', FIXTURE.replace('<text>server</text>', '')),
        ('a caption', FIXTURE.replace('<figcaption>One request</figcaption>', '')),
        ('an image alternative', FIXTURE.replace(' alt="a diagram"', '')),
    )
    for name, mutated in mutations:
        if mutated == FIXTURE:
            failures.append(f'mutation {name} changed nothing in the fixture')
        elif page_text(mutated) == FIXTURE_TEXT:
            failures.append(f'mutation {name} left the text unchanged')
    for mark in ('NAV-MARK', 'FOOTER-MARK', 'SCRIPT_MARK', 'color:red', '.a{}'):
        if mark in got:
            failures.append(f'the text carries {mark}')
    paths = (('index.html', False), ('sources/index.html', False), ('sources/a.html', True), ('sources/src/ae.c.html', True),
             ('poles/sources.html', False), ('sources.html', False))
    for relative, want in paths:
        if is_source_page(relative) is not want:
            failures.append(f'{relative}: source page read as {not want}')
    for failure in failures:
        print(f'FAIL {failure}')
    print(f'selftest: 1 fixture page, {len(mutations)} mutations, 5 marks, {len(paths)} paths; {len(failures)} failure(s)')
    return 1 if failures else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('site', nargs='?')
    parser.add_argument('out', nargs='?')
    parser.add_argument('--report')
    parser.add_argument('--selftest', action='store_true')
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if not args.site or not args.out:
        parser.error('SITE_DIR and OUT_DIR are required')
    site, out = pathlib.Path(args.site).resolve(), pathlib.Path(args.out).resolve()
    refuse = None
    if any(part.endswith(('.agents', '.sessions')) for part in site.parts):
        refuse = 'the site path is inside a .agents or .sessions directory'
    elif not site.is_dir():
        refuse = f'{site} is not a directory'
    elif out.exists() and (not out.is_dir() or any(out.iterdir())):
        refuse = f'{out} exists and is not an empty directory'
    elif out == site or site in out.parents:
        refuse = 'the output directory is inside the site'
    if refuse:
        print(f'dossier_site_to_text: {refuse}', file=sys.stderr)
        return 2
    summary = convert_site(site, out)
    if args.report:
        pathlib.Path(args.report).write_text(json.dumps({**summary, 'site': str(site)}, indent=1), encoding='utf-8')
    print('pages', summary['pages'], 'words', summary['words'], 'sources pages excluded', summary['sourcesPagesExcluded'])
    return 0


if __name__ == '__main__':
    sys.exit(main())
