#!/usr/bin/env python3
"""Build docs/evidence/syzygy-5dhm-136/reader-edition-measurement-<date>.json from measure.json and the pilot's stored records."""
import datetime, hashlib, json, pathlib, subprocess, sys
W = pathlib.Path('/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-5dhm.136')
out = pathlib.Path(sys.argv[1])
commit, before_commit = sys.argv[2], sys.argv[3]
# The scratch directory holding measure.json; the fourth argument, or this file's directory.
S = pathlib.Path(sys.argv[4]).resolve() if len(sys.argv) > 4 else pathlib.Path(__file__).resolve().parent
m = json.loads((S / 'measure.json').read_text())
pilot = W / 'docs/evidence/pursuit-2026-11-21b/pilot'
runs = json.loads((pilot / 'runs.json').read_text())['runs']
third = json.loads((pilot / 'result3.json').read_text())['arms']
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
def git_blob_sha(rev, rel):
    return hashlib.sha256(subprocess.run(['git', '-C', str(W), 'show', f'{rev}:{rel}'], capture_output=True, check=True).stdout).hexdigest()
RENDERER = ['apps/three-surface-poc/src/polaris-generation/dossier-site.ts', 'apps/three-surface-poc/src/polaris-generation/dossier-finding.ts', 'packages/polaris-dossier/src/render.ts']
density = []
for arm, row in third.items():
    prefix = row.get('run', '')
    if prefix not in runs or 'wordsByClass' not in runs[prefix]:
        continue
    r = runs[prefix]
    full, run_words = r['words'], r['wordsByClass']['run']
    density.append({'arm': arm, 'run': prefix, 'factsGiven': row['factsGiven'], 'storedSiteWords': full, 'storedSiteRunPageWords': run_words,
                    'factsPer1000WordsGiven': round(row['factsGiven'] / full * 1000, 2),
                    'factsPer1000WordsOnReadingPathIfNoneFromRunPages': round(row['factsGiven'] / (full - run_words) * 1000, 2)})
plain = third.get('P')
#: The run copies the renders were drawn from (their stored site is the reference for claim states).
RUNS = pathlib.Path(sys.argv[5]).resolve() if len(sys.argv) > 5 else S.parent / 'r136' / 'runs'


def claim_states(run, form):
    """How many of the stored site's claims the render gives the same epistemic label and Unknown reason, by claim id."""
    sites = RUNS / f'run-{run}' / 'site'
    if not sites.is_dir():
        return None
    stored = json.loads((sites / max((d.name for d in sites.iterdir() if d.name.isdigit()), key=int) / 'machine.json').read_text())['claims']
    drawn = {c['id']: c for c in json.loads((S / f'site-{form}-{run}' / 'machine.json').read_text())['claims']}
    same = sum(1 for c in stored if c['id'] in drawn and (drawn[c['id']]['epistemic'], drawn[c['id']]['unknownReason']) == (c['epistemic'], c['unknownReason']))
    return f'{same} of {len(stored)}'


def harness_inputs(run, form):
    out = (S / f'log-{form}-{run}.out').read_text().strip().splitlines()
    return json.loads(out[-1])['inputs']
rows = {}
for run, forms in sorted(m.items()):
    b, a = forms['before'], forms['after']
    rows[run] = {
        'pages': {'htmlBefore': b['htmlPages'], 'htmlAfter': a['htmlPages'], 'sourcePages': a['sourcePages'], 'readingPath': a['readingPathPages'], 'aboutThisRun': a['aboutThisRunPages'],
                  'otherBefore': b['otherPagesKept'], 'otherAfter': a['otherPagesKept'], 'otherPagesAfter': sorted(a['otherPagesWords'] or {})},
        'words': {'fullTextBefore': b['wordsFullText'], 'readingPathBefore': b['wordsReadingPath'], 'aboutThisRunBefore': b['wordsAboutThisRun'], 'readingPathAfter': a['wordsReadingPath'], 'aboutThisRunAfter': a['wordsAboutThisRun'],
                  'aboutThisRunPerPage': a['aboutThisRunWordsPerPage'], 'fullTextAfter': a['wordsFullText']},
        'links': {'before': f"{b['linksResolved']} of {b['links']}", 'after': f"{a['linksResolved']} of {a['links']}"},
        'navigation': {'foldBefore': b['navFoldLabel'], 'foldAfter': a['navFoldLabel'], 'entriesBeforeFoldBefore': b['navEntriesBeforeFold'], 'entriesBeforeFoldAfter': a['navEntriesBeforeFold'],
                       'pagesWhoseFoldHoldsExactlyTheRunPagesAfter': f"{a['pagesWhoseNavFoldsExactlyTheRunPages']} of {a['keptPages']}"},
        'landing': {'orderBefore': b['landingOrder'], 'orderAfter': a['landingOrder'], 'overviewFigure': a['landingOverviewFigure'], 'mapDirectlyAfterThesisBefore': b['landingMapDirectlyAfterThesis'], 'mapDirectlyAfterThesisAfter': a['landingMapDirectlyAfterThesis'], 'hasPoleMap': a['landingMapBeforeFirstSection'] or b['landingMapBeforeFirstSection'] or a['landingMapDirectlyAfterThesis']},
        'readingOrderFirst4': {'before': b['readingOrderFirst4'], 'after': a['readingOrderFirst4']},
        'disclosures': {'before': f"{b['disclosuresOnTheirPage']} of {b['disclosureClaims']}", 'after': f"{a['disclosuresOnTheirPage']} of {a['disclosureClaims']}"},
        'claimStatesMatchingStoredSite': {'before': claim_states(run, 'before'), 'after': claim_states(run, 'after')},
        'harnessInputs': harness_inputs(run, 'after'),
        'textFiles': {f'{form}-{kind}': f'text-{run}-{form}-{kind}/' for form in ('before', 'after') for kind in ('full', 'reader')},
    }
# The first limit's claim, checked rather than stated: the reader forms differ by exactly one word per run.
assert all(r['words']['readingPathAfter'] - r['words']['readingPathBefore'] == 1 for r in rows.values()), 'reader forms differ by more than the heading'
no_poles = [r[:8] for r, f in sorted(m.items()) if 'pole-map' not in f['after']['landingOrder']]
record = {
    'format': 'reader-edition-rerender-measurement/1',
    'bead': 'syzygy-5dhm.136',
    'measuredAt': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'commit': commit, 'beforeCommit': before_commit,
    'renderer': {rel: {'before': git_blob_sha(before_commit, rel), 'after': git_blob_sha(commit, rel)} for rel in RENDERER},
    'disclosurePredicate': {'file': 'apps/three-surface-poc/src/polaris-generation/dossier-reader-edition.test.ts', 'function': 'disclosuresOffTheirPage', 'sha256': git_blob_sha(commit, 'apps/three-surface-poc/src/polaris-generation/dossier-reader-edition.test.ts'),
                            'transcription': 'docs/evidence/syzygy-5dhm-136/reader_edition_measure.py disclosures()'},
    'pageClasses': {'file': 'scripts/dossier_page_classes.json', 'sha256': git_blob_sha(commit, 'scripts/dossier_page_classes.json')},
    'method': ('[Observed] Every stored run with a stored draft under the dossier state root (seven; read only, no run-*.agents or run-*.sessions '
               'directory listed or opened) was copied to scratch and its latest passed draft drawn twice through the functions the render '
               'command calls (deriveFindings, buildLocalInput, derivedStructureAt, renderManifestFacts, renderLocalDossier): by beforeCommit '
               "(the default branch) and by commit, with the three inputs a real render has (syzygy-a70b): the screen loaded for the run's "
               "placement subject (repository and pinned commit), the run's eligible content classes (a legacy run recording none takes "
               "code-content, project-documentation and governance-text, the set the newest stored run declares), and the run's newest "
               "stored fidelity verdict injected as if it counted (its packet is not rebuilt); harnessInputs names each per run, and "
               "claimStatesMatchingStoredSite checks the result against the stored site's machine.json by claim id (epistemic label and "
               "Unknown reason). No design review is bound; every run's derived structure is missing (all predate the derived record). Words are "
               'whitespace-separated tokens of scripts/dossier_site_to_text.py text over <main>, source pages left out; the reading path is '
               'its --reader form (pages of class run left out, scripts/dossier_page_classes.json) and About this run is the words of the '
               'pages it left out; a kept page the definition classes as none of reader, navigation or run is counted as other. Landing order: '
               'the offsets in index.html <main> of </header>, the overview-figures section, the Pole map and the first section, sorted. Links: every internal href of every .html page, source pages included, resolved to a file of the render '
               'and, with a fragment, to an id on that page. Disclosures: the committed predicate disclosuresOffTheirPage of '
               'disclosurePredicate.file at commit, transcribed clause for clause: a machine.json claim is selected when its epistemic is '
               'unknown, its unknownReason is not null, or its v15 member has a withheldSources key; it must occur exactly once on its page '
               '(data-claim-id, the id escaped for & and " only); the opening tag of the element carrying it must hold data-epistemic equal '
               'to its recorded label; an Unknown claim\'s element must hold <span class="marking unknown">[Unknown]</span>; a withheld item\'s '
               'element text (after its opening tag) must match Withheld from this dossier|Withheld item; any other claim with a reason must '
               'carry the reason in that text.'),
    'limits': [
        '[Observed] The reader form of the default branch and of this change differ by one word per run: the contents heading "Review report" (2 words) became "About this run" (3). The run pages were already folded in the default branch\'s navigation; what this change moves is their label and place, the index and the landing map. The reading-path words reported "before" are therefore the full text a pilot reader was given (fullTextBefore), the same reduction the --reader form gives the default branch\'s render.',
        '[Observed] The beforeCommit tree is a detached worktree whose node_modules links to this branch\'s worktree, so its @syzygy/* imports resolve to this branch\'s packages; the renderer files each form imports by path are its own, and between beforeCommit and commit no file under packages/ or apps/ changes but dossier-site.ts and tests (git diff --stat beforeCommit commit -- packages apps).',
        '[Observed] This record supersedes the first measurement of the same date (git history, at cb08d2d1), whose harness lacked all three inputs above: it rendered 229 blocks Unknown for missing evidence, withheld owner-placed configuration blocks and excluded governance-text blocks, in both forms alike (figures from the syzygy-a70b diagnosis).',
        '[Observed] claimStatesMatchingStoredSite: ' + '; '.join(f"{r[:8]} {rows[r]['claimStatesMatchingStoredSite']['before']} before, {rows[r]['claimStatesMatchingStoredSite']['after']} after" for r in sorted(rows)) + ' (None: the run copy holds no stored site). The before and after forms agree on every run, so this change moves no claim state; a shortfall against the stored site is the same in both forms.',
        '[Inferred] The reader sessions (readers-2026-11-23/) read text from that first, defective harness, in both the before and the after arms: their before-to-after comparison holds (both arms carried the same defect), but their absolute shares understate what a reader of a real render earns.',
        '[Inferred] Required-fact density on the reading path assumes no fact a reader earned came from a run page; the understanding page states purpose and capabilities, so it is an upper bound, not a measure.',
        '[Observed] ' + str(len(no_poles)) + ' runs (' + ', '.join(no_poles) + ') carry no Poles, so their landing page has no map either way.',
        '[Observed] The re-rendered sites are larger than the stored sites runs.json measured (for run 658f2f90, ' + f"{m['658f2f90470f73eea1dc1d90209c5ef7']['after']['wordsFullText']:,} words of full text against {runs['658f2f90']['words']:,}" + '): both renders here carry the find-by-task and index pages of version 2.15 and every addition since each run was last rendered, so the words here compare the two renderers over one input and are not the words a pilot arm read.',
        '[Observed] The text files are in the scratch directory named by run id and form: text-<run>-before-full, text-<run>-before-reader, text-<run>-after-full and text-<run>-after-reader. They are not committed: the converter prints counts only, and the page text quotes another repository.',
    ],
    'requiredFactDensity': {'source': 'docs/evidence/pursuit-2026-11-21b/pilot/result3.json (third grading) and runs.json (stored sites)', 'dossierArms': density,
                            'plainSynthesis': {'arm': 'P', 'factsGiven': plain['factsGiven'], 'words': len((pilot / 'plain-synthesis.txt').read_text(encoding='utf-8').split()), 'factsPer1000Words': round(plain['factsGiven'] / len((pilot / 'plain-synthesis.txt').read_text(encoding='utf-8').split()) * 1000, 2)} if plain else None},
    'totals': {
        'runs': len(rows),
        'readingPathWordsAfter': sum(r['words']['readingPathAfter'] for r in rows.values()),
        'fullTextWordsBefore': sum(r['words']['fullTextBefore'] for r in rows.values()),
        'aboutThisRunWordsAfter': sum(r['words']['aboutThisRunAfter'] for r in rows.values()),
        'readingPathWordsBefore': sum(r['words']['readingPathBefore'] for r in rows.values()),
        'otherPagesAfter': sum(r['pages']['otherAfter'] for r in rows.values()),
        'disclosureClaimsAfter': sum(int(r['disclosures']['after'].split(' of ')[1]) for r in rows.values()),
        'disclosuresOnTheirPageAfter': sum(int(r['disclosures']['after'].split(' of ')[0]) for r in rows.values()),
        'linksBefore': sum(int(r['links']['before'].split(' of ')[1]) for r in rows.values()),
        'linksResolvedBefore': sum(int(r['links']['before'].split(' of ')[0]) for r in rows.values()),
        'linksAfter': sum(int(r['links']['after'].split(' of ')[1]) for r in rows.values()),
        'linksResolvedAfter': sum(int(r['links']['after'].split(' of ')[0]) for r in rows.values()),
    },
    'runs': rows,
}
out.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps(record['totals']), json.dumps(density))
