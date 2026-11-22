#!/usr/bin/env python3
"""Measure the re-rendered stored runs before (main) and after (branch) for syzygy-5dhm.136. Counts only; prints no page text.

For each run and form: converts the site with scripts/dossier_site_to_text.py, full and --reader, into
text-<run>-<form>-full/ and text-<run>-<form>-reader/; counts pages, words on the reading path and under About this run, internal
links and how many resolve (every .html of the site, source pages included), the navigation's shape, the landing page's order, and
whether each Unknown or withheld claim of machine.json carries its disclosure inside its element on its own page.
"""
import html as htmllib
import json
import pathlib
import posixpath
import re
import subprocess
import sys

S = pathlib.Path(__file__).resolve().parent
W = pathlib.Path('/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-5dhm.136')
TO_TEXT = W / 'scripts' / 'dossier_site_to_text.py'
sys.path.insert(0, str(W / 'scripts'))
import dossier_site_to_text as conv  # noqa: E402


def pages_of(site):
    return {p.relative_to(site).as_posix(): p.read_text(encoding='utf-8') for p in site.rglob('*.html')}


def link_census(files):
    ids = {f: {htmllib.unescape(m) for m in re.findall(r' id="([^"]*)"', t)} for f, t in files.items()}
    total, bad = 0, []
    for f, t in files.items():
        for href in re.findall(r' href="([^"]*)"', t):
            raw = htmllib.unescape(href)
            if re.match(r'^[a-z][a-z0-9+.-]*:', raw, re.I) or raw.startswith('//'):
                continue
            total += 1
            file, _, frag = raw.partition('#')
            page = f if file == '' else posixpath.normpath(posixpath.join(posixpath.dirname(f), file))
            if page not in ids or (frag and frag not in ids[page]):
                bad.append(f'{f} -> {page}#{frag}')
    return total, bad


def nav_entries(text, from_):
    open_ = '<details class="contents desktop-contents nav-panel" open><summary>Contents</summary><nav aria-label="Dossier">'
    at = text.find(open_)
    nav = text[at + len(open_):text.find('</nav>', at)]
    out = []
    for summary, href in re.findall(r'<summary>([^<]*)</summary>|href="([^"]*)"', nav):
        out.append(f'[{summary}]' if summary else posixpath.normpath(posixpath.join(posixpath.dirname(from_), htmllib.unescape(href).split('#')[0])))
    return out


def element_at(text, start):
    name = re.match(r'<([a-z0-9]+)', text[start:]).group(1)
    depth = 0
    for m in re.finditer(rf'<(/?){name}(?=[\s>])[^>]*>', text[start:]):
        depth += -1 if m.group(1) == '/' else 1
        if depth == 0:
            return text[start:start + m.end()]
    return text[start:]


def disclosures(files, machine):
    claims = [c for c in machine['claims'] if c['epistemic'] == 'unknown' or c.get('unknownReason') or (c.get('v15') or {}).get('withheldSources') is not None]
    off = []
    for c in claims:
        t = files.get(c['page'], '')
        marker = 'data-claim-id="%s"' % htmllib.escape(c['id'], quote=True).replace('&#x27;', '&#39;')
        if t.count(marker) != 1:
            off.append(f"{c['id']}: {t.count(marker)} on {c['page']}")
            continue
        start = t.rfind('<', 0, t.index(marker))
        el = element_at(t, start)
        tag = el[:el.index('>') + 1]
        body = el[len(tag):]
        if f'data-epistemic="{c["epistemic"]}"' not in tag:
            off.append(f"{c['id']}: label")
        if c["epistemic"] == "unknown" and "<span class=\"marking unknown\">[Unknown]</span>" not in el:
            off.append(f"{c['id']}: marking")
        withheld = (c.get('v15') or {}).get('withheldSources') is not None
        if withheld and not re.search(r'Withheld from this dossier|Withheld item', body):
            off.append(f"{c['id']}: withheld words")
        elif c.get('unknownReason') and not withheld and c['unknownReason'] not in body:
            off.append(f"{c['id']}: reason")
    return len(claims), off


def convert(site, out, reader):
    if out.exists():
        subprocess.run(['rm', '-rf', str(out)], check=True)
    return conv.convert_site(site, out, reader=reader)


def measure(run, form):
    site = S / f'site-{form}-{run}'
    files = pages_of(site)
    machine = json.loads((site / 'machine.json').read_text())
    full = convert(site, S / f'text-{run}-{form}-full', False)
    reader = convert(site, S / f'text-{run}-{form}-reader', True)
    total, bad = link_census(files)
    run_pages = sorted(p for p in files if conv.page_class(p) == 'run')
    kept = [p for p in files if not conv.is_source_page(p)]
    nav = nav_entries(files['index.html'], 'index.html')
    folds = [e for e in nav if e.startswith('[')]
    fold_at = nav.index(folds[0]) if folds else None
    navs_ok = 0
    for p in kept:
        entries = nav_entries(files[p], p)
        f = [i for i, e in enumerate(entries) if e.startswith('[')]
        if len(f) == 1 and sorted(entries[f[0] + 1:]) == run_pages and not any(conv.page_class(e) == 'run' for e in entries[:f[0]]):
            navs_ok += 1
    main = files['index.html'].split('<main', 1)[1]
    header_end = main.find('</header>')
    pole_map = main.find('<nav class="pole-map"')
    first_section = main.find('<section id="section-')
    n_claims, off = disclosures(files, machine)
    order = [p['path'] for p in json.loads((site / 'dossier.json').read_text())['pages']]
    return {
        'htmlPages': len(files), 'sourcePages': len(files) - len(kept), 'keptPages': len(kept),
        'readingPathPages': reader['pages'], 'aboutThisRunPages': reader['runPagesExcluded'],
        'wordsFullText': full['words'], 'wordsReadingPath': reader['words'], 'wordsAboutThisRun': sum(reader['runPagesWords'].values()),
        'aboutThisRunWordsPerPage': reader['runPagesWords'],
        'links': total, 'linksResolved': total - len(bad), 'unresolvedSample': bad[:3],
        'navFoldLabel': folds[0] if folds else None, 'navFoldIsLastEntry': fold_at is not None and all(conv.page_class(e) == 'run' for e in nav[fold_at + 1:]),
        'navEntriesBeforeFold': nav[:fold_at] if fold_at is not None else nav,
        'pagesWhoseNavFoldsExactlyTheRunPages': navs_ok,
        'landingMapBeforeFirstSection': pole_map != -1 and (first_section == -1 or pole_map < first_section),
        'landingMapDirectlyAfterThesis': pole_map != -1 and pole_map == header_end + len('</header>'),
        'readingOrderFirst4': order[:4],
        'disclosureClaims': n_claims, 'disclosuresOnTheirPage': n_claims - len(off), 'disclosuresOff': off[:5],
    }


def main():
    runs = sorted(p.name[len('site-after-'):] for p in S.glob('site-after-*'))
    record = {}
    for run in runs:
        if not (S / f'site-before-{run}').is_dir():
            continue
        record[run] = {form: measure(run, form) for form in ('before', 'after')}
        b, a = record[run]['before'], record[run]['after']
        print(run[:8], 'pages', b['htmlPages'], a['htmlPages'], 'path', b['wordsReadingPath'], a['wordsReadingPath'], 'about', a['wordsAboutThisRun'],
              'full', b['wordsFullText'], a['wordsFullText'], 'links', f"{a['linksResolved']}/{a['links']}", f"{b['linksResolved']}/{b['links']}",
              'disc', f"{a['disclosuresOnTheirPage']}/{a['disclosureClaims']}", f"{b['disclosuresOnTheirPage']}/{b['disclosureClaims']}",
              'navok', a['pagesWhoseNavFoldsExactlyTheRunPages'], a['keptPages'], 'map', b['landingMapDirectlyAfterThesis'], a['landingMapDirectlyAfterThesis'])
    (S / 'measure.json').write_text(json.dumps(record, indent=1))


if __name__ == '__main__':
    main()
