#!/usr/bin/env python3
"""Join the census runs, the tracer's logs and the static site census into one record of every scratch prefix.

Usage: assemble_census.py <worktree> <commit> <static-sites.json> <runs-directory> <probe-directory> <out.json>
       assemble_census.py --selftest <out.json>

<runs-directory> holds, for each label, <label>.json (census_run.py's record), <label>.trace.jsonl.gz and <label>.samples.json, as
collect_runs.py writes them, and three files that name what the run records do not: sampler-digests.json ({"sha256": {label: sha256 of
<label>.samples.json}}, written by `collect_runs.py --digest-existing`), carried-observations.json (facts read once from directories
that no longer exist) and optionally operator-notes.json ({label: [text, ...]}). Every run must name <commit>, and so must the static
census. <probe-directory> must not exist or be empty and be a short absolute path: the assembler runs `npx vitest --version` there once,
to record which entries the launcher alone leaves in a temp directory, and removes what it made there when it is done.

What a name is: a name the trace logged as created by mkdtemp is classed by its prefix (the pid and namespace digits of an owner-pid
name replaced by <pid> and <ns>); a name the trace logged as a mkdir or file creation is a fixed name, or a derived name when it
starts with a mkdtemp name of the same run; a name no trace line covers is classed by shape: a Chrome singleton directory, a
21-character vitest project directory (not a `<word>-<6>` mkdtemp name), npm's compile cache, or else unattributed. Dispositions come
from RULES below, first match wins; a class that matches none stops the assembler.

The aggregation (classes, the rule table, the exposure bounds, the partition sentence) is in functions above the self-test, so that
--selftest runs the same code over a synthetic two-run fixture whose expected answer is written as literals here, then over mutants of
this file (one predicate changed in each), and requires every mutant to fail.
"""
import bisect
import collections
import functools
import gzip
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

SUFFIXES = ('.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.py', '.sh')
NO_FRAME = '(no frame under the repository)'
TEST_FILE = re.compile(r'\.(?:browser\.)?test\.(?:ts|mts|cts|js|mjs)$|\.testkit\.ts$')
CHROME = re.compile(r'^\.?(?:com\.google\.Chrome|org\.chromium\.Chromium)\.[A-Za-z0-9]+$')
NANOID = re.compile(r'^[A-Za-z0-9_-]{21}$')
WORD_STEM = re.compile(r'^[A-Za-z]{3,}(?:[-_][A-Za-z]{3,})*-[A-Za-z0-9]{6}$')  # a 21-character mkdtemp name such as dossier-origin-0gdUJr
OWNER_PID = re.compile(r'-p\d+-n\d+-')
NUMERIC = re.compile(r'(?<![A-Za-z0-9])\d+(?![A-Za-z0-9])')
STEM = re.compile(r'[A-Za-z][A-Za-z.]*(?:-[A-Za-z][A-Za-z.]*)*-')
CHROME_LITERALS = ('--user-data-dir', '--remote-debugging')
NUMBER_WORDS = {1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine'}


def normalise(prefix: str) -> str:
    return OWNER_PID.sub('-p<pid>-n<ns>-', prefix)


class Index:
    """What one run's trace says about the names in its temp directory."""

    def __init__(self, rows: list):
        self.made = {}  # basename -> normalised prefix, for mkdtemp
        self.seen = collections.defaultdict(list)  # basename -> rows
        for row in rows:
            name = os.path.basename(row['path'])
            self.seen[name].append(row)
            if row['kind'] == 'mkdtemp':
                self.made[name] = normalise(row['prefix'])


def classify(name: str, index: Index) -> tuple:
    if name in index.made:
        return ('mkdtemp', index.made[name])
    if name in index.seen:
        for made, prefix in index.made.items():
            if name.startswith(made) and name != made:
                return ('derived', prefix + '<random>' + name[len(made):])
        return ('fixed', name)
    if CHROME.match(name):
        return ('chrome-singleton', 'chrome-singleton-directory')
    if NANOID.match(name) and not WORD_STEM.match(name):
        return ('vitest-project-directory', 'nanoid-21')
    if name == 'node-compile-cache':
        return ('npm-compile-cache', 'node-compile-cache')
    return ('unattributed', NUMERIC.sub('<n>', name))


def creating_frames(row: dict) -> list:
    return row['calledFrom'] if 'calledFrom' in row else row['frames']


def innermost_file(rows: list) -> str:
    counts = collections.Counter()
    for row in rows:
        frames = creating_frames(row)
        counts[frames[0].rsplit(':', 1)[0] if frames else NO_FRAME] += 1
    return counts.most_common(1)[0][0]


# Dispositions, first match wins. A rule sees the class family, its label and the set of innermost creating files.
OWNER_PID_SWEEP, TEST_KIT_ROOT, RESIDUAL = 'owner-pid name and sweep', 'test-kit temp root', 'stated residual'
RULES = [
    ('R1-fixture-sweep-landed', OWNER_PID_SWEEP,
     lambda family, label, files: family == 'mkdtemp' and label.startswith('syzygy-poc-surface-fixture-') and '<pid>' in label,
     'PR 509 (merged as 7de5dc40): the name carries the creating pid and namespace, and a sweep at the start of the next run removes the dead owners\' directories.'),
    ('R2-chrome-singleton', RESIDUAL,
     lambda family, label, files: family == 'chrome-singleton',
     'Chrome makes this directory itself; its name carries no owner. PR 515 (merged as a088f1ca on main, after this run commit) removes it when the launching process survives to run its cleanup; a SIGKILLed runner runs none. Follow-up F1\'s sweep would reach it through the profile\'s SingletonSocket link; a run wrapper (F3) or F2\'s TMPDIR mechanism would also contain it.'),
    ('R3-browser-profile', OWNER_PID_SWEEP,
     lambda family, label, files: family == 'mkdtemp' and label == 'syzygy-poc-browser-',
     'Proposed, not covered by PR 509 or 515: name the profile with the owner pid and extend the sweep to it. The sweep must refuse while a process\'s arguments carry the exact element --user-data-dir=<profile> (no trailing slash: cdp-browser.ts launches Chrome with --user-data-dir=${profile}, line 462 at the run commit) and must carry the guards listed in follow-up F1. Until then a residual.'),
    ('R4-vitest-project-directory', RESIDUAL,
     lambda family, label, files: family == 'vitest-project-directory',
     'Created by vitest itself in its main process (TestProject.tmpDir = join(tmpdir(), nanoid())), one per project as each project starts (vitestProjectDirectoriesInTheCleanRun gives the first sightings), so a test-kit root installed by a worker cannot contain it. A run wrapper that sets TMPDIR to an owner-pid root would (follow-up F3).'),
    ('R5-npm-compile-cache', RESIDUAL,
     lambda family, label, files: family == 'npm-compile-cache',
     'Created by npx/npm (module.enableCompileCache), one directory reused by every run, not one per run. Not growing; outside this repository.'),
    ('R6-non-test-module', TEST_KIT_ROOT,
     lambda family, label, files: family in ('mkdtemp', 'derived', 'fixed') and files and not any(TEST_FILE.search(f) for f in files)
     and all(f.startswith('apps/') or f.startswith('packages/') or f.startswith('scripts/') for f in files),
     'Created by a non-test module under apps/, packages/ or scripts/: operator code that a test runs (dossier-trigger.ts, self-corpus.ts, redis-shaped-measure-main.ts). It calls os.tmpdir() at the point of use, which reads TMPDIR then. Conditional on follow-up F2 being lodged on syzygy-bpyt.4.4: a root installed as process.env.TMPDIR in the worker would reach these modules, while a tempDir() helper alone cannot, because they call mkdtempSync(join(tmpdir(), ...)) themselves. The same code run by an operator keeps its directories in the operator\'s TMPDIR by design.'),
    ('R7-stale-lock-by-design', RESIDUAL,
     lambda family, label, files: family == 'unattributed' and label.startswith('syzygy-poc-restart-'),
     'A lock file named for the uid and the port, made with O_EXCL by restart.ts (no trace line: the tracer does not wrap open). The code states its intent: "A stale lock requires operator inspection; the script never guesses that it is safe to remove one." A pid-based sweep would contradict that sentence, so no sweep is proposed; the stale lock matters only to a later run on the same port.'),
    ('R8-creator-unknown', RESIDUAL,
     lambda family, label, files: family == 'unattributed' or files == {NO_FRAME},
     'Unknown: no trace line carries the name and no shape rule names it, or the creating call has no frame under the repository root (third-party or Node internals). Not attributed to any file here.'),
    ('R9-test-file', TEST_KIT_ROOT,
     lambda family, label, files: family in ('mkdtemp', 'derived', 'fixed') and files and all(TEST_FILE.search(f) for f in files),
     'Created by a test file (.test.ts, .browser.test.ts or .testkit.ts). Conditional on follow-up F2 being lodged on syzygy-bpyt.4.4: as written that bead describes a private tempDir() helper that test files adopt and says nothing of an owner-pid root, a sweep or an assigned TMPDIR. If F2 lands, one owner-pid root per worker process holds every test directory and one sweep covers all of them. Until then this disposition is a proposal, not a mechanism.'),
]
PARTITION_PHRASE = {
    'R1-fixture-sweep-landed': 'by {files} (PR 509 sweeps them)',
    'R2-chrome-singleton': 'by Chrome itself (its singleton directory)',
    'R3-browser-profile': 'by {files} (the browser profile)',
    'R4-vitest-project-directory': 'by vitest itself (its project directory)',
    'R5-npm-compile-cache': 'by npm itself (its compile cache)',
    'R6-non-test-module': 'by other non-test modules',
    'R7-stale-lock-by-design': 'as a lock file (attributed to restart.ts by its name)',
    'R8-creator-unknown': 'with no known creator',
    'R9-test-file': 'by test files',
}
assert set(PARTITION_PHRASE) == {rule[0] for rule in RULES}, 'every rule needs a phrase in the partition sentence'


def disposition(family: str, label: str, files: set) -> dict:
    for rule_id, kind, predicate, why in RULES:
        if predicate(family, label, files):
            return {'rule': rule_id, 'disposition': kind}
    raise SystemExit(f'no disposition rule for {family} {label!r} (files {sorted(files)})')


def creating_files(name: str, index: Index) -> set:
    """The innermost creating file of the first trace row of a name; empty when the trace never saw it."""
    rows = index.seen.get(name)
    return {innermost_file(rows[:1])} if rows else set()


# Aggregation ---------------------------------------------------------------------------------------------------------------------
def seeded_from_of(records: dict):
    by_private = {r['privateDirectory']: label for label, r in records.items()}

    def seeded_from(label: str):
        seeded = records[label].get('seededFrom')
        return by_private[seeded['privateDirectory']] if seeded else None
    return seeded_from


def build_classes(records: dict, indexes: dict, seeded_from, children_of) -> dict:
    """Every class of entry the runs made or left: how many names, by which files, and what each run's final listing held."""
    classes: dict = {}

    def entry_for(family: str, label: str) -> dict:
        return classes.setdefault((family, label), {'family': family, 'label': label, 'created': {}, 'filesCreating': collections.Counter(), 'testFiles': collections.Counter(),
                                                    'leftAtEnd': {}, 'leftFromSeed': {}, 'observedSpellings': set(), 'observedChildren': None})

    for label, index in indexes.items():
        per_name = {}
        for name, rows in index.seen.items():
            family, cls = classify(name, index)
            per_name.setdefault((family, cls), {})[name] = rows
        for (family, cls), names in per_name.items():
            item = entry_for(family, cls)
            item['created'][label] = len(names)
            for rows in names.values():
                item['filesCreating'][innermost_file(rows[:1])] += 1
                for row in rows[:1]:
                    for frame in creating_frames(row):
                        path = frame.rsplit(':', 1)[0]
                        if TEST_FILE.search(path):
                            item['testFiles'][path] += 1
                            break
    for label, r in records.items():
        mine, earlier = indexes[label], (indexes[seeded_from(label)] if seeded_from(label) else None)
        seed_names = set(r['seededFrom']['entriesMovedIn']) if r.get('seededFrom') else set()
        for entry in r['listingAtEnd']:
            name = entry['name']
            family, cls = classify(name, mine)
            if family in ('unattributed', 'chrome-singleton', 'vitest-project-directory', 'npm-compile-cache') and earlier is not None and name in seed_names:
                family, cls = classify(name, earlier)
            elif name in seed_names and earlier is not None and name not in mine.seen:
                family, cls = classify(name, earlier)
            item = entry_for(family, cls)
            slot = item['leftFromSeed' if name in seed_names else 'leftAtEnd'].setdefault(label, {'entries': 0, 'bytes': 0, 'oldestMtime': None, 'newestMtime': None})
            slot['entries'] += 1
            slot['bytes'] += entry['bytes']
            slot['oldestMtime'] = entry['mtime'] if slot['oldestMtime'] is None else min(slot['oldestMtime'], entry['mtime'])
            slot['newestMtime'] = entry['mtime'] if slot['newestMtime'] is None else max(slot['newestMtime'], entry['mtime'])
            if family in ('chrome-singleton', 'vitest-project-directory'):
                item['observedSpellings'].add(re.sub(r'[A-Za-z0-9]{6}$', '<random>', name) if family == 'chrome-singleton' else '<21 characters>')
                if family == 'vitest-project-directory' and item['observedChildren'] is None:
                    item['observedChildren'] = children_of(name)
    return classes


def exposure_gap(entries: dict, interval: float) -> dict:
    """The sampler keeps each name's first and last sighting, not its sample times. Consecutive sighting instants less than two
    intervals apart are taken to be consecutive samples, and the largest such gap is the gap the exposure bound assumes."""
    instants = sorted({seen[edge] for seen in entries.values() for edge in ('first', 'last')})
    gaps = [round(later - earlier, 2) for earlier, later in zip(instants, instants[1:])]
    single = [gap for gap in gaps if gap < 2 * interval]
    return {'gapSeconds': max(single, default=interval), 'sightingInstants': len(instants), 'gapsBetweenSightings': len(gaps), 'gapsUnderTwoIntervals': len(single),
            'gapsOfTwoIntervalsOrMore': len(gaps) - len(single), 'smallestGapOfTwoIntervalsOrMore': min((gap for gap in gaps if gap >= 2 * interval), default=None)}


def exposure_slots(entries: dict, index: Index, gap: float) -> dict:
    """Per class, the names the sampler saw and the ones it never did. A name seen from its first to its last sighting was absent
    at the sample before the first and at the sample after the last, so it lived for at most that span plus two gaps; a name the
    sampler never saw lived within one gap."""
    slots: dict = {}
    for name in set(entries) | set(index.seen):
        slot = slots.setdefault(classify(name, index), {'sampled': 0, 'neverSampled': 0, 'lower': 0.0, 'upper': 0.0})
        seen = entries.get(name)
        if seen:
            slot['sampled'] += 1
            slot['lower'] += seen['last'] - seen['first']
            slot['upper'] += seen['last'] - seen['first'] + 2 * gap
        else:
            slot['neverSampled'] += 1
            slot['upper'] += gap
    return slots


def exposure_model(entries: dict, index: Index, interval: float, duration: float, label: str):
    """The assumed gap, and a function giving each class's expected number of names present at a random moment of the run."""
    gap = exposure_gap(entries, interval)
    slots = exposure_slots(entries, index, gap['gapSeconds'])

    def exposure_of(family: str, cls: str):
        slot = slots.get((family, cls))
        if not slot:
            return None
        return {'run': label, 'namesSampled': slot['sampled'], 'namesNeverSampled': slot['neverSampled'],
                'expectedNamesPresentAtARandomMoment': {'lowerBound': round(slot['lower'] / duration, 3), 'upperBound': round(slot['upper'] / duration, 3)}}
    return gap, exposure_of


def long_gap_trace(entries: dict, index: Index, interval: float, published: set) -> dict:
    """What the trace says about the sighting gaps of two intervals or more, which exposure_gap leaves out of its assumed gap.

    The trace clock is aligned to the sampler clock: a traced name the sampler also saw was created after the sighting instant that
    precedes its first sighting and no later than that sighting, which bounds the offset between the clocks to a window, and the
    middle of the window is used. The run's start (0 s) counts as a sighting instant. Per gap between consecutive instants: how many
    traced names were created inside it and how many of those the sampler ever saw, for the gaps of two intervals or more and for the
    shorter ones. Then, for each class in `published`, whether its bound rests on the long gaps being quiet: a name the sampler never
    saw that was created inside a long gap, or a sampled name with a long gap on either side of its sightings."""
    known = sorted({seen[edge] for seen in entries.values() for edge in ('first', 'last')} | {0.0})
    first_row = {name: rows[0] for name, rows in index.seen.items()}
    lower, upper = float('-inf'), float('inf')
    for name, row in first_row.items():
        if name in entries:
            first = entries[name]['first']
            before = known[max(bisect.bisect_left(known, first) - 1, 0)]
            lower, upper = max(lower, row['t'] / 1000 - first), min(upper, row['t'] / 1000 - before)
    assert lower > float('-inf'), 'no traced name was also sampled, so the two clocks cannot be aligned'
    offset = (lower + upper) / 2
    created = {name: row['t'] / 1000 - offset for name, row in first_row.items()}
    is_long = lambda earlier, later: round(later - earlier, 2) >= 2 * interval
    gaps = list(zip(known, known[1:]))
    totals = {kind: {'gaps': 0, 'seconds': 0.0, 'namesCreatedInside': 0, 'ofThemEverSampled': 0} for kind in ('long', 'short')}
    per_gap = []
    for earlier, later in gaps:
        inside = [name for name, made in created.items() if earlier < made <= later]
        sampled = sum(1 for name in inside if name in entries)
        total = totals['long' if is_long(earlier, later) else 'short']
        total['gaps'] += 1
        total['seconds'] += later - earlier
        total['namesCreatedInside'] += len(inside)
        total['ofThemEverSampled'] += sampled
        if is_long(earlier, later):
            per_gap.append({'from': earlier, 'to': later, 'seconds': round(later - earlier, 2), 'namesCreatedInside': len(inside), 'ofThemEverSampled': sampled})

    def in_a_long_gap(made: float) -> bool:
        return any(earlier < made <= later for earlier, later in gaps if is_long(earlier, later))

    def long_gap_beside(name: str) -> bool:
        first, last = entries[name]['first'], entries[name]['last']
        before = known[max(bisect.bisect_left(known, first) - 1, 0)]
        after = bisect.bisect_right(known, last)
        return is_long(before, first) or (after < len(known) and is_long(last, known[after]))

    by_class: dict = {}
    for name in set(entries) | set(first_row):
        cls = classify(name, index)[1]
        if cls not in published:
            continue
        slot = by_class.setdefault(cls, {'names': 0, 'neverSampledCreatedInALongGap': 0, 'sampledWithALongGapBesideItsSightings': 0})
        slot['names'] += 1
        if name in entries:
            slot['sampledWithALongGapBesideItsSightings'] += long_gap_beside(name)
        elif in_a_long_gap(created[name]):
            slot['neverSampledCreatedInALongGap'] += 1
    dependent = {cls: slot for cls, slot in sorted(by_class.items()) if slot['neverSampledCreatedInALongGap'] or slot['sampledWithALongGapBesideItsSightings']}
    rounded = lambda kind: {**totals[kind], 'seconds': round(totals[kind]['seconds'], 2)}
    return {'clockOffsetSeconds': round(offset, 3), 'clockOffsetWindowSeconds': round(upper - lower, 3),
            'tracedNames': len(first_row), 'tracedNamesTheSamplerSaw': sum(1 for name in first_row if name in entries),
            'tracedNamesCreatedInNoGap': sum(1 for made in created.values() if not any(earlier < made <= later for earlier, later in gaps)),
            'gapsOfTwoIntervalsOrMore': {**rounded('long'), 'perGap': per_gap}, 'shorterGaps': rounded('short'),
            'publishedClasses': len(published), 'publishedClassesThatDependOnThem': dependent, 'publishedClassesThatDoNot': sorted(published - set(dependent))}


def build_table(classes: dict, modes: tuple, seeded_from, naming, exposure_for, chrome_launchers: list) -> list:
    """One row per class, with its rule. A class whose creating files fit no rule stops the assembler."""
    kill_labels, fresh_labels, clean_labels = modes
    table = []
    for (family, cls), item in sorted(classes.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        files = set(item['filesCreating'])
        verdict = disposition(family, cls, files if family in ('mkdtemp', 'derived', 'fixed') else set())
        stem = cls.split('<')[0] if family in ('mkdtemp', 'derived') else None
        if stem and '<pid>' in cls and stem.endswith('-p'):
            stem = stem[:-1]  # the owner-pid part is added by a helper; the literal is what precedes it
        if family == 'unattributed':
            found = STEM.match(cls)
            stem = found.group(0) if found and len(found.group(0)) >= 8 else None
        killed_left = {l: item['leftAtEnd'][l] for l in kill_labels if l in item['leftAtEnd']}
        row = {'class': cls, 'family': family, 'created': item['created'], 'creatingFiles': dict(item['filesCreating'].most_common()), 'testFiles': dict(item['testFiles'].most_common()),
               'leftAfterSIGKILL': killed_left, 'afterTheNextFreshRun': {fl: {'killRun': seeded_from(fl), 'leftBySIGKILL': item['leftAtEnd'].get(seeded_from(fl), {}).get('entries', 0),
                                             'stillThere': item['leftFromSeed'].get(fl, {}).get('entries', 0), 'bytesStillThere': item['leftFromSeed'].get(fl, {}).get('bytes', 0)}
                                         for fl in fresh_labels if item['leftAtEnd'].get(seeded_from(fl))},
               'leftByTheFreshRunItself': {l: item['leftAtEnd'][l] for l in fresh_labels if l in item['leftAtEnd']},
               'leftAfterCleanRun': {l: item['leftAtEnd'][l] for l in clean_labels if l in item['leftAtEnd']},
               'staticFilesNamingTheLiteral': list(naming(stem)) if stem else None, 'staticStem': stem, 'creatingFilesAmongTheStaticMatches': (bool(set(item['filesCreating']) & set(naming(stem))) if stem and item['filesCreating'] else None),
               'staticStemIsInferred': family == 'unattributed' if stem else None, 'exposureInTheCleanRun': exposure_for(family, cls), 'rule': verdict['rule'], 'disposition': verdict['disposition']}
        if family == 'chrome-singleton':
            row['launchedByFilesNaming'] = {'literals': list(CHROME_LITERALS), 'files': chrome_launchers}
        if item['observedSpellings']:
            row['observedSpellings'] = sorted(item['observedSpellings'])
        if item['observedChildren'] is not None:
            row['topLevelChildrenOfOneObserved'] = item['observedChildren']
        table.append(row)
    return table


def partition_sentence(table: list, runs: int) -> str:
    """Every class counted under the one rule that took it, in the order of RULES; the parts must sum to the table."""
    counts = collections.Counter(r['rule'] for r in table)
    parts = [(rule_id, counts.get(rule_id, 0)) for rule_id, _, _, _ in RULES]
    if sum(n for _, n in parts) != len(table):
        raise SystemExit('the parts of the partition sum to %d, the table has %d classes (a rule that RULES does not list: %s)'
                         % (sum(n for _, n in parts), len(table), sorted(set(counts) - {rule_id for rule_id, _ in parts})))
    printed = []
    for rule_id, n in parts:
        creators = sorted({os.path.basename(f) for r in table if r['rule'] == rule_id for f in r['creatingFiles']})
        printed.append('%d %s' % (n, PARTITION_PHRASE[rule_id].format(files=', '.join(creators) or 'the named file')))
    return 'The %s runs together put %d classes of entries directly in the temp directory (%d by mkdtemp): %s; and %s.' % (
        NUMBER_WORDS.get(runs, str(runs)), len(table), sum(1 for r in table if r['family'] == 'mkdtemp'), '; '.join(printed[:-1]), printed[-1])


# ---------------------------------------------------------------------------------------------------------------------------------
FIXTURE_ROWS = [
    {'kind': 'mkdtemp', 'path': '/t/dossier-records-AAAAAA', 'prefix': 'dossier-records-', 'frames': ['packages/polaris-dossier/src/start-gates.test.ts:10']},
    {'kind': 'mkdir', 'path': '/t/dossier-records-AAAAAA', 'frames': ['packages/polaris-dossier/src/start-gates.test.ts:11']},
    {'kind': 'mkdtemp', 'path': '/t/syzygy-poc-surface-fixture-p123-n4567-BBBBBB', 'prefix': 'syzygy-poc-surface-fixture-p123-n4567-', 'frames': ['apps/three-surface-poc/src/test-model-fixture.ts:45']},
    {'kind': 'mkdtemp', 'path': '/t/syzygy-poc-surface-fixture-EEEEEE', 'prefix': 'syzygy-poc-surface-fixture-', 'frames': ['apps/three-surface-poc/src/test-model-fixture.ts:45']},
    {'kind': 'mkdtemp', 'path': '/t/syzygy-dossier-src-CCCCCC', 'prefix': 'syzygy-dossier-src-', 'frames': [], 'calledFrom': ['apps/three-surface-poc/src/polaris-generation/dossier-trigger.ts:145']},
    {'kind': 'mkdtemp', 'path': '/t/syzygy-poc-browser-DDDDDD', 'prefix': 'syzygy-poc-browser-', 'frames': ['apps/three-surface-poc/src/cdp-browser.ts:445']},
    {'kind': 'writeFile', 'path': '/t/dossier-records-AAAAAA-outside-RAW.md', 'frames': ['packages/polaris-dossier/src/waiting-sessions.test.ts:279']},
    {'kind': 'mkdir', 'path': '/t/fixed-dir', 'frames': ['packages/cap1-daemon/src/server.test.ts:5']},
    {'kind': 'mkdtemp', 'path': '/t/thirdparty-FFFFFF', 'prefix': 'thirdparty-', 'frames': []},
    {'kind': 'mkdtemp', 'path': '/t/kit-HHHHHH', 'prefix': 'kit-', 'frames': ['packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts:7']},
    {'kind': 'mkdtemp', 'path': '/t/rows-GGGGGG', 'prefix': 'rows-', 'frames': ['packages/polaris-dossier/src/first.test.ts:1']},
    {'kind': 'mkdir', 'path': '/t/rows-GGGGGG', 'frames': ['packages/polaris-dossier/src/second.ts:2']},
]
FIXTURE_NAMES = ['dossier-records-AAAAAA', 'syzygy-poc-surface-fixture-p123-n4567-BBBBBB', 'syzygy-poc-surface-fixture-EEEEEE', 'syzygy-dossier-src-CCCCCC', 'syzygy-poc-browser-DDDDDD',
                 'dossier-records-AAAAAA-outside-RAW.md', 'fixed-dir', 'thirdparty-FFFFFF', '.com.google.Chrome.b7S2hn', 'com.google.Chrome.CCtKIQ', 'org.chromium.Chromium.x1y2z3',
                 '.com.google.Chrome.b7S2hn.bak', 'syzygy-poc-restart-1000-39331.lock', '5dlMwwEPs6llimFC5iPYz', '5dlMwwEPs6llimFC5iPY', 'polaris-marker-KE28cb', 'node-compile-cache', 'mystery',
                 'kit-HHHHHH', 'rows-GGGGGG']
EXPECTED = {
    'dossier-records-AAAAAA': ['mkdtemp', 'dossier-records-', 'R9-test-file', TEST_KIT_ROOT],
    'syzygy-poc-surface-fixture-p123-n4567-BBBBBB': ['mkdtemp', 'syzygy-poc-surface-fixture-p<pid>-n<ns>-', 'R1-fixture-sweep-landed', OWNER_PID_SWEEP],
    'syzygy-poc-surface-fixture-EEEEEE': ['mkdtemp', 'syzygy-poc-surface-fixture-', 'R6-non-test-module', TEST_KIT_ROOT],
    'syzygy-dossier-src-CCCCCC': ['mkdtemp', 'syzygy-dossier-src-', 'R6-non-test-module', TEST_KIT_ROOT],
    'syzygy-poc-browser-DDDDDD': ['mkdtemp', 'syzygy-poc-browser-', 'R3-browser-profile', OWNER_PID_SWEEP],
    'dossier-records-AAAAAA-outside-RAW.md': ['derived', 'dossier-records-<random>-outside-RAW.md', 'R9-test-file', TEST_KIT_ROOT],
    'fixed-dir': ['fixed', 'fixed-dir', 'R9-test-file', TEST_KIT_ROOT],
    'thirdparty-FFFFFF': ['mkdtemp', 'thirdparty-', 'R8-creator-unknown', RESIDUAL],
    '.com.google.Chrome.b7S2hn': ['chrome-singleton', 'chrome-singleton-directory', 'R2-chrome-singleton', RESIDUAL],
    'com.google.Chrome.CCtKIQ': ['chrome-singleton', 'chrome-singleton-directory', 'R2-chrome-singleton', RESIDUAL],
    'org.chromium.Chromium.x1y2z3': ['chrome-singleton', 'chrome-singleton-directory', 'R2-chrome-singleton', RESIDUAL],
    '.com.google.Chrome.b7S2hn.bak': ['unattributed', '.com.google.Chrome.b7S2hn.bak', 'R8-creator-unknown', RESIDUAL],
    'syzygy-poc-restart-1000-39331.lock': ['unattributed', 'syzygy-poc-restart-<n>-<n>.lock', 'R7-stale-lock-by-design', RESIDUAL],
    '5dlMwwEPs6llimFC5iPYz': ['vitest-project-directory', 'nanoid-21', 'R4-vitest-project-directory', RESIDUAL],
    '5dlMwwEPs6llimFC5iPY': ['unattributed', '5dlMwwEPs6llimFC5iPY', 'R8-creator-unknown', RESIDUAL],
    'polaris-marker-KE28cb': ['unattributed', 'polaris-marker-KE28cb', 'R8-creator-unknown', RESIDUAL],
    'node-compile-cache': ['npm-compile-cache', 'node-compile-cache', 'R5-npm-compile-cache', RESIDUAL],
    'mystery': ['unattributed', 'mystery', 'R8-creator-unknown', RESIDUAL],
    'kit-HHHHHH': ['mkdtemp', 'kit-', 'R9-test-file', TEST_KIT_ROOT],
    'rows-GGGGGG': ['mkdtemp', 'rows-', 'R9-test-file', TEST_KIT_ROOT],
}


def classify_fixture() -> dict:
    index = Index(FIXTURE_ROWS)
    result = {}
    for name in FIXTURE_NAMES:
        family, label = classify(name, index)
        verdict = disposition(family, label, creating_files(name, index))
        result[name] = [family, label, verdict['rule'], verdict['disposition']]
    return result


# A synthetic three-run aggregation: one clean run of 10 s sampled every 0.5 s, one SIGKILLed run that left four entries (one of them a name derived
# from another), and the fresh run seeded with the SIGKILLed run's entries, which swept two of them away and left one of its own.
AGG_RECORDS = {
    'c': {'mode': 'clean', 'seconds': 10.0, 'privateDirectory': '/p/c', 'listingAtEnd': []},
    'k': {'mode': 'kill', 'seconds': 5.0, 'privateDirectory': '/p/k',
          'listingAtEnd': [{'name': 'tk-ZZZZZZ', 'bytes': 10, 'mtime': 1.0}, {'name': 'nt-YYYYYY', 'bytes': 20, 'mtime': 2.0}, {'name': '.com.google.Chrome.xYzAbC', 'bytes': 30, 'mtime': 3.0},
                            {'name': 'tk-ZZZZZZ-out.md', 'bytes': 5, 'mtime': 4.0}]},
    'f': {'mode': 'clean', 'seconds': 5.0, 'privateDirectory': '/p/f',
          'seededFrom': {'privateDirectory': '/p/k', 'entriesMovedIn': ['tk-ZZZZZZ', 'nt-YYYYYY', '.com.google.Chrome.xYzAbC', 'tk-ZZZZZZ-out.md']},
          'listingAtEnd': [{'name': 'tk-ZZZZZZ', 'bytes': 10, 'mtime': 1.0}, {'name': '.com.google.Chrome.xYzAbC', 'bytes': 30, 'mtime': 3.0},
                           {'name': 'tk-WWWWWW', 'bytes': 40, 'mtime': 7.0}]},
}
AGG_TRACES = {
    'c': [
        {'kind': 'mkdtemp', 'path': '/t/syzygy-poc-surface-fixture-p1-n2-AAAAAA', 'prefix': 'syzygy-poc-surface-fixture-p1-n2-', 'frames': ['apps/three-surface-poc/src/test-model-fixture.ts:1']},
        {'kind': 'mkdtemp', 'path': '/t/syzygy-poc-browser-BBBBBB', 'prefix': 'syzygy-poc-browser-', 'frames': ['apps/three-surface-poc/src/cdp-browser.ts:2']},
        {'kind': 'mkdtemp', 'path': '/t/tk-CCCCCC', 'prefix': 'tk-', 'frames': ['packages/q/src/kit.testkit.ts:3']},
        {'kind': 'mkdtemp', 'path': '/t/two-DDDDDD', 'prefix': 'two-', 'frames': ['packages/q/src/first.test.ts:4']},
        {'kind': 'mkdir', 'path': '/t/two-DDDDDD', 'frames': ['packages/q/src/second.ts:5']},
        {'kind': 'mkdtemp', 'path': '/t/nt-EEEEEE', 'prefix': 'nt-', 'frames': ['packages/q/src/operator.ts:6']},
        {'kind': 'mkdtemp', 'path': '/t/op-FFFFFF', 'prefix': 'op-', 'frames': ['packages/q/src/operator.ts:7']},
    ],
    'k': [
        {'kind': 'mkdtemp', 'path': '/t/tk-ZZZZZZ', 'prefix': 'tk-', 'frames': ['packages/q/src/kit.testkit.ts:3']},
        {'kind': 'mkdtemp', 'path': '/t/nt-YYYYYY', 'prefix': 'nt-', 'frames': ['packages/q/src/operator.ts:6']},
        {'kind': 'writeFile', 'path': '/t/tk-ZZZZZZ-out.md', 'frames': ['packages/q/src/kit.testkit.ts:3']},
    ],
    'f': [
        {'kind': 'mkdtemp', 'path': '/t/tk-WWWWWW', 'prefix': 'tk-', 'frames': ['packages/q/src/kit.testkit.ts:3']},
    ],
}
# The clean run's sampler record: first and last sighting of each name it saw (tk-CCCCCC lived between two samples and was never seen).
# The sighting instants are 0.5 1.0 2.0 3.0 4.0 6.1 6.7 8.0 9.5: two gaps under two intervals (0.5 and 0.6), one of exactly two intervals (1.0) and more.
AGG_SAMPLER = {'intervalSeconds': 0.5, 'entries': {
    'syzygy-poc-surface-fixture-p1-n2-AAAAAA': {'first': 1.0, 'last': 3.0},
    'syzygy-poc-browser-BBBBBB': {'first': 0.5, 'last': 9.5},
    'two-DDDDDD': {'first': 4.0, 'last': 4.0},
    'nt-EEEEEE': {'first': 6.1, 'last': 6.7},
    '.com.google.Chrome.aBcDeF': {'first': 2.0, 'last': 8.0},
}}
AGG_MIXED_ROWS = [
    {'kind': 'mkdtemp', 'path': '/t/mix-AAAAAA', 'prefix': 'mix-', 'frames': ['packages/q/src/a.test.ts:1']},
    {'kind': 'mkdtemp', 'path': '/t/mix-BBBBBB', 'prefix': 'mix-', 'frames': ['packages/q/src/b.ts:2']},
]

# A synthetic clean run for long_gap_trace: sampled every 0.5 s, sighting instants 0.5 1.0 3.0 3.5 4.0 6.0 7.0 and the start 0.0, so three gaps of
# two intervals or more (1.0-3.0, 4.0-6.0 and 6.0-7.0, the last exactly two intervals) and four shorter ones. The trace clock runs 0.1 s to 0.2 s
# ahead of the sampler's: the four sampled traced names bound the offset to 0.0-0.4 s and the middle, 0.2 s, is used. Each trace time is the sampler time plus 0.2 s
# (HHHHHH, made at 3.9 s, falls in a shorter gap only when the offset is subtracted; otherwise it reads 4.1 s, inside the second long gap).
LG_SAMPLER = {'intervalSeconds': 0.5, 'entries': {
    'p-AAAAAA': {'first': 0.5, 'last': 1.0},
    'p-BBBBBB': {'first': 3.0, 'last': 3.5},
    'q-CCCCCC': {'first': 4.0, 'last': 6.0},
    '.com.google.Chrome.aBcDeF': {'first': 3.5, 'last': 4.0},
    'p-JJJJJJ': {'first': 7.0, 'last': 7.0},
}}
LG_ROWS = [
    {'kind': 'mkdtemp', 'path': '/t/p-AAAAAA', 'prefix': 'p-', 't': 400, 'frames': ['packages/q/src/a.ts:1']},
    {'kind': 'mkdtemp', 'path': '/t/p-BBBBBB', 'prefix': 'p-', 't': 2100, 'frames': ['packages/q/src/a.ts:1']},
    {'kind': 'mkdtemp', 'path': '/t/q-CCCCCC', 'prefix': 'q-', 't': 4000, 'frames': ['packages/q/src/a.ts:2']},
    {'kind': 'mkdtemp', 'path': '/t/r-DDDDDD', 'prefix': 'r-', 't': 2200, 'frames': ['packages/q/src/a.ts:3']},
    {'kind': 'mkdtemp', 'path': '/t/r-EEEEEE', 'prefix': 'r-', 't': 5200, 'frames': ['packages/q/src/a.ts:3']},
    {'kind': 'mkdtemp', 'path': '/t/s-FFFFFF', 'prefix': 's-', 't': 3400, 'frames': ['packages/q/src/a.ts:4']},
    {'kind': 'mkdtemp', 'path': '/t/r-HHHHHH', 'prefix': 'r-', 't': 4100, 'frames': ['packages/q/src/a.ts:3']},
    {'kind': 'mkdtemp', 'path': '/t/p-JJJJJJ', 'prefix': 'p-', 't': 7000, 'frames': ['packages/q/src/a.ts:1']},
    # Never sampled: u-KKKKKK is created at 6.5 s, inside the gap of exactly two intervals (6.0-7.0), in a published class; v-LLLLLL at 2.5 s, inside
    # 1.0-3.0, in a class that is not published, so the published filter alone keeps it out of the answer.
    {'kind': 'mkdtemp', 'path': '/t/u-KKKKKK', 'prefix': 'u-', 't': 6700, 'frames': ['packages/q/src/a.ts:5']},
    {'kind': 'mkdtemp', 'path': '/t/v-LLLLLL', 'prefix': 'v-', 't': 2700, 'frames': ['packages/q/src/a.ts:6']},
]
LG_PUBLISHED = {'p-', 'q-', 'r-', 's-', 'u-', 'chrome-singleton-directory'}
EXPECTED_AGGREGATE = {
    'gap': {'gapSeconds': 0.6, 'sightingInstants': 9, 'gapsBetweenSightings': 8, 'gapsUnderTwoIntervals': 2, 'gapsOfTwoIntervalsOrMore': 6, 'smallestGapOfTwoIntervalsOrMore': 1.0},
    'byRule': {'R1-fixture-sweep-landed': 1, 'R2-chrome-singleton': 1, 'R3-browser-profile': 1, 'R6-non-test-module': 2, 'R9-test-file': 3},
    'creatingFilesOfTwoRows': {'packages/q/src/first.test.ts': 1},
    'partition': 'The three runs together put 8 classes of entries directly in the temp directory (6 by mkdtemp): 1 by test-model-fixture.ts (PR 509 sweeps them); '
                 '1 by Chrome itself (its singleton directory); 1 by cdp-browser.ts (the browser profile); 0 by vitest itself (its project directory); '
                 '0 by npm itself (its compile cache); 2 by other non-test modules; 0 as a lock file (attributed to restart.ts by its name); 0 with no known creator; and 3 by test files.',
    'exposure': {
        'chrome-singleton-directory': {'run': 'c', 'namesSampled': 1, 'namesNeverSampled': 0, 'expectedNamesPresentAtARandomMoment': {'lowerBound': 0.6, 'upperBound': 0.72}},
        'nt-': {'run': 'c', 'namesSampled': 1, 'namesNeverSampled': 0, 'expectedNamesPresentAtARandomMoment': {'lowerBound': 0.06, 'upperBound': 0.18}},
        'op-': {'run': 'c', 'namesSampled': 0, 'namesNeverSampled': 1, 'expectedNamesPresentAtARandomMoment': {'lowerBound': 0.0, 'upperBound': 0.06}},
        'syzygy-poc-browser-': {'run': 'c', 'namesSampled': 1, 'namesNeverSampled': 0, 'expectedNamesPresentAtARandomMoment': {'lowerBound': 0.9, 'upperBound': 1.02}},
        'syzygy-poc-surface-fixture-p<pid>-n<ns>-': {'run': 'c', 'namesSampled': 1, 'namesNeverSampled': 0, 'expectedNamesPresentAtARandomMoment': {'lowerBound': 0.2, 'upperBound': 0.32}},
        'tk-': {'run': 'c', 'namesSampled': 0, 'namesNeverSampled': 1, 'expectedNamesPresentAtARandomMoment': {'lowerBound': 0.0, 'upperBound': 0.06}},
        'two-': {'run': 'c', 'namesSampled': 1, 'namesNeverSampled': 0, 'expectedNamesPresentAtARandomMoment': {'lowerBound': 0.0, 'upperBound': 0.12}},
    },
    'longGaps': {
        'clockOffsetSeconds': 0.2, 'clockOffsetWindowSeconds': 0.4, 'tracedNames': 10, 'tracedNamesTheSamplerSaw': 4, 'tracedNamesCreatedInNoGap': 0,
        'gapsOfTwoIntervalsOrMore': {'gaps': 3, 'seconds': 5.0, 'namesCreatedInside': 6, 'ofThemEverSampled': 2,
                                     'perGap': [{'from': 1.0, 'to': 3.0, 'seconds': 2.0, 'namesCreatedInside': 3, 'ofThemEverSampled': 1},
                                                {'from': 4.0, 'to': 6.0, 'seconds': 2.0, 'namesCreatedInside': 1, 'ofThemEverSampled': 0},
                                                {'from': 6.0, 'to': 7.0, 'seconds': 1.0, 'namesCreatedInside': 2, 'ofThemEverSampled': 1}]},
        'shorterGaps': {'gaps': 4, 'seconds': 2.0, 'namesCreatedInside': 4, 'ofThemEverSampled': 2},
        'publishedClasses': 6,
        'publishedClassesThatDependOnThem': {
            'chrome-singleton-directory': {'names': 1, 'neverSampledCreatedInALongGap': 0, 'sampledWithALongGapBesideItsSightings': 1},
            'p-': {'names': 3, 'neverSampledCreatedInALongGap': 0, 'sampledWithALongGapBesideItsSightings': 3},
            'q-': {'names': 1, 'neverSampledCreatedInALongGap': 0, 'sampledWithALongGapBesideItsSightings': 1},
            'r-': {'names': 3, 'neverSampledCreatedInALongGap': 2, 'sampledWithALongGapBesideItsSightings': 0},
            'u-': {'names': 1, 'neverSampledCreatedInALongGap': 1, 'sampledWithALongGapBesideItsSightings': 0}},
        'publishedClassesThatDoNot': ['s-'],
    },
    # What each run left, per class, hand-derived from AGG_RECORDS: k left tk-ZZZZZZ, nt-YYYYYY, a Chrome singleton and the derived tk-ZZZZZZ-out.md; the
    # fresh run f, seeded from k, still holds two of those (tk-ZZZZZZ and the singleton, 10 and 30 bytes) and left tk-WWWWWW of its own. A seed is
    # never the fresh run's own leftover, and a SIGKILL leftover is counted once per entry.
    'leftovers': {
        'chrome-singleton-directory': {'leftAfterSIGKILL': {'k': {'entries': 1, 'bytes': 30, 'oldestMtime': 3.0, 'newestMtime': 3.0}},
                                       'afterTheNextFreshRun': {'f': {'killRun': 'k', 'leftBySIGKILL': 1, 'stillThere': 1, 'bytesStillThere': 30}}, 'leftByTheFreshRunItself': {}},
        'nt-': {'leftAfterSIGKILL': {'k': {'entries': 1, 'bytes': 20, 'oldestMtime': 2.0, 'newestMtime': 2.0}},
                'afterTheNextFreshRun': {'f': {'killRun': 'k', 'leftBySIGKILL': 1, 'stillThere': 0, 'bytesStillThere': 0}}, 'leftByTheFreshRunItself': {}},
        'tk-': {'leftAfterSIGKILL': {'k': {'entries': 1, 'bytes': 10, 'oldestMtime': 1.0, 'newestMtime': 1.0}},
                'afterTheNextFreshRun': {'f': {'killRun': 'k', 'leftBySIGKILL': 1, 'stillThere': 1, 'bytesStillThere': 10}},
                'leftByTheFreshRunItself': {'f': {'entries': 1, 'bytes': 40, 'oldestMtime': 7.0, 'newestMtime': 7.0}}},
        'tk-<random>-out.md': {'leftAfterSIGKILL': {'k': {'entries': 1, 'bytes': 5, 'oldestMtime': 4.0, 'newestMtime': 4.0}},
                               'afterTheNextFreshRun': {'f': {'killRun': 'k', 'leftBySIGKILL': 1, 'stillThere': 0, 'bytesStillThere': 0}}, 'leftByTheFreshRunItself': {}},
    },
    'mixedClassStops': "no disposition rule for mkdtemp 'mix-' (files ['packages/q/src/a.test.ts', 'packages/q/src/b.ts'])",
    'partitionStopsOnARuleNobodyListed': "the parts of the partition sum to 0, the table has 1 classes (a rule that RULES does not list: ['R0-unlisted'])",
}


def aggregate_fixture() -> dict:
    indexes = {label: Index(rows) for label, rows in AGG_TRACES.items()}
    seeded_from = seeded_from_of(AGG_RECORDS)
    classes = build_classes(AGG_RECORDS, indexes, seeded_from, lambda name: None)
    modes = ([l for l, r in AGG_RECORDS.items() if r['mode'] == 'kill'], [l for l in AGG_RECORDS if seeded_from(l)], [l for l, r in AGG_RECORDS.items() if r['mode'] == 'clean' and not seeded_from(l)])
    gap, exposure_for = exposure_model(AGG_SAMPLER['entries'], indexes['c'], AGG_SAMPLER['intervalSeconds'], AGG_RECORDS['c']['seconds'], 'c')
    table = build_table(classes, modes, seeded_from, lambda stem: (), exposure_for, [])
    stops = {}
    mixed = build_classes({'m': {'mode': 'kill', 'seconds': 1.0, 'privateDirectory': '/p/m', 'listingAtEnd': []}}, {'m': Index(AGG_MIXED_ROWS)}, lambda label: None, lambda name: None)
    for key, check in (('mixedClassStops', lambda: build_table(mixed, (['m'], [], []), lambda label: None, lambda stem: (), lambda family, cls: None, [])),
                       ('partitionStopsOnARuleNobodyListed', lambda: partition_sentence([{'rule': 'R0-unlisted', 'family': 'mkdtemp', 'creatingFiles': {}}], 1))):
        try:
            check()
            stops[key] = None
        except SystemExit as stop:
            stops[key] = str(stop)
    return {'gap': gap, 'byRule': dict(sorted(collections.Counter(r['rule'] for r in table).items())),
            'creatingFilesOfTwoRows': next(r['creatingFiles'] for r in table if r['class'] == 'two-'),
            'partition': partition_sentence(table, len(AGG_RECORDS)),
            'exposure': {r['class']: r['exposureInTheCleanRun'] for r in table if r['exposureInTheCleanRun']},
            'leftovers': {r['class']: {k: r[k] for k in ('leftAfterSIGKILL', 'afterTheNextFreshRun', 'leftByTheFreshRunItself')}
                          for r in table if r['leftAfterSIGKILL'] or r['afterTheNextFreshRun'] or r['leftByTheFreshRunItself']},
            'longGaps': long_gap_trace(LG_SAMPLER['entries'], Index(LG_ROWS), LG_SAMPLER['intervalSeconds'], LG_PUBLISHED), **stops}


def fixture_answer() -> dict:
    return {'classify': classify_fixture(), 'aggregate': aggregate_fixture()}


def selftest(out: pathlib.Path) -> None:
    here = pathlib.Path(__file__).resolve()
    source = here.read_text()
    mutants = {
        'owner-pid-digits-not-normalised': ("OWNER_PID = re.compile(r'-p\\d+-n\\d+-')", "OWNER_PID = re.compile(r'-q\\d+-n\\d+-')"),
        'derived-names-not-recognised': ("if name.startswith(made) and name != made:", "if False:"),
        'chrome-dotted-form-only': ("CHROME = re.compile(r'^\\.?(?:", "CHROME = re.compile(r'^\\.(?:"),
        'chromium-form-dropped': ("(?:com\\.google\\.Chrome|org\\.chromium\\.Chromium)\\.[A-Za-z0-9]+$')\nNANOID", "(?:com\\.google\\.Chrome)\\.[A-Za-z0-9]+$')\nNANOID"),
        'chrome-suffix-unanchored': ("\\.[A-Za-z0-9]+$')\nNANOID", "\\.[A-Za-z0-9]*')\nNANOID"),
        'nanoid-length-one-more': ("NANOID = re.compile(r'^[A-Za-z0-9_-]{21}$')", "NANOID = re.compile(r'^[A-Za-z0-9_-]{22}$')"),
        'nanoid-length-any-near': ("NANOID = re.compile(r'^[A-Za-z0-9_-]{21}$')", "NANOID = re.compile(r'^[A-Za-z0-9_-]{20,22}$')"),
        'vitest-shape-takes-a-word-stem-name': ("if NANOID.match(name) and not WORD_STEM.match(name):", "if NANOID.match(name):"),
        'word-stem-suffix-one-shorter': ("-[A-Za-z0-9]{6}$')  # a 21-character mkdtemp name", "-[A-Za-z0-9]{5}$')  # a 21-character mkdtemp name"),
        'fixture-rule-matches-every-surface-prefix': ("and '<pid>' in label,", ","),
        'operator-rule-matches-test-files': ("not any(TEST_FILE.search(f) for f in files)\n     and all(", "all("),
        'operator-code-given-the-wrong-disposition': ("('R6-non-test-module', TEST_KIT_ROOT,", "('R6-non-test-module', RESIDUAL,"),
        'test-file-rule-accepts-a-mixed-class': ("and files and all(TEST_FILE.search(f) for f in files),", "and files and any(TEST_FILE.search(f) for f in files),"),
        'testkit-suffix-not-a-test-file': ("|\\.testkit\\.ts$')", "')"),
        'stale-lock-rule-dropped': ("lambda family, label, files: family == 'unattributed' and label.startswith('syzygy-poc-restart-'),", "lambda family, label, files: False,"),
        'unknown-creator-rule-dropped': ("lambda family, label, files: family == 'unattributed' or files == {NO_FRAME},", "lambda family, label, files: False,"),
        'no-frame-not-treated-as-unknown': ("or files == {NO_FRAME},", ","),
        'creating-frame-ignores-calledFrom': ("return row['calledFrom'] if 'calledFrom' in row else row['frames']", "return row['frames']"),
        'creating-file-of-a-name-from-its-last-row': ("return {innermost_file(rows[:1])} if rows else set()", "return {innermost_file(rows[-1:])} if rows else set()"),
        'creating-file-of-a-class-from-its-last-row': ("item['filesCreating'][innermost_file(rows[:1])] += 1", "item['filesCreating'][innermost_file(rows[-1:])] += 1"),
        'unattributed-name-given-a-class': ("return ('unattributed', NUMERIC.sub('<n>', name))", "return ('npm-compile-cache', 'node-compile-cache')"),
        'numeric-segments-not-normalised': ("NUMERIC = re.compile(r'(?<![A-Za-z0-9])\\d+(?![A-Za-z0-9])')", "NUMERIC = re.compile(r'(?<![A-Za-z0-9])\\d+(?![A-Za-z0-9])x')"),
        'digits-inside-words-normalised': ("NUMERIC = re.compile(r'(?<![A-Za-z0-9])\\d+(?![A-Za-z0-9])')", "NUMERIC = re.compile(r'\\d+')"),
        'sampled-name-adds-one-gap-not-two': ("slot['upper'] += seen['last'] - seen['first'] + 2 * gap", "slot['upper'] += seen['last'] - seen['first'] + gap"),
        'sampled-name-adds-no-gap': ("slot['upper'] += seen['last'] - seen['first'] + 2 * gap", "slot['upper'] += seen['last'] - seen['first']"),
        'never-sampled-name-adds-no-gap': ("slot['neverSampled'] += 1\n            slot['upper'] += gap", "slot['neverSampled'] += 1\n            slot['upper'] += 0"),
        'never-sampled-name-adds-two-gaps': ("slot['neverSampled'] += 1\n            slot['upper'] += gap", "slot['neverSampled'] += 1\n            slot['upper'] += 2 * gap"),
        'lower-bound-counts-a-gap': ("slot['lower'] += seen['last'] - seen['first']", "slot['lower'] += seen['last'] - seen['first'] + gap"),
        'gap-is-the-interval': ("return {'gapSeconds': max(single, default=interval),", "return {'gapSeconds': interval,"),
        'gap-of-two-intervals-counts-as-one-gap': ("single = [gap for gap in gaps if gap < 2 * interval]", "single = [gap for gap in gaps if gap <= 2 * interval]"),
        'gap-of-a-quiet-stretch-counts-as-one-gap': ("single = [gap for gap in gaps if gap < 2 * interval]", "single = gaps"),
        'bound-divided-by-the-wrong-duration': ("round(slot['upper'] / duration, 3)", "round(slot['upper'] / (duration + 1), 3)"),
        'partition-leaves-a-rule-out': ("parts = [(rule_id, counts.get(rule_id, 0)) for rule_id, _, _, _ in RULES]", "parts = [(rule_id, counts.get(rule_id, 0)) for rule_id, _, _, _ in RULES if rule_id != 'R1-fixture-sweep-landed']"),
        'partition-sum-not-checked': ("if sum(n for _, n in parts) != len(table):", "if False:"),
        'partition-counts-the-wrong-rule': ("parts = [(rule_id, counts.get(rule_id, 0)) for rule_id, _, _, _ in RULES]", "parts = [(rule_id, counts.get('R6-non-test-module' if rule_id == 'R1-fixture-sweep-landed' else rule_id, 0)) for rule_id, _, _, _ in RULES]"),
        'partition-names-no-creating-file': ("PARTITION_PHRASE[rule_id].format(files=', '.join(creators) or 'the named file')", "PARTITION_PHRASE[rule_id].format(files='the named file')"),
        'partition-mkdtemp-count-from-the-wrong-family': ("sum(1 for r in table if r['family'] == 'mkdtemp')", "sum(1 for r in table if r['family'] == 'derived')"),
        'long-gap-is-one-interval': ("is_long = lambda earlier, later: round(later - earlier, 2) >= 2 * interval", "is_long = lambda earlier, later: round(later - earlier, 2) >= interval"),
        'trace-clock-not-aligned': ("offset = (lower + upper) / 2", "offset = 0.0"),
        'sampled-traced-names-not-counted': ("total['ofThemEverSampled'] += sampled", "total['ofThemEverSampled'] += 0"),
        'never-sampled-name-in-a-short-gap-counts-as-dependent': ("elif in_a_long_gap(created[name]):", "elif name in created:"),
        'long-gap-after-the-last-sighting-ignored': ("return is_long(before, first) or (after < len(known) and is_long(last, known[after]))", "return is_long(before, first)"),
        'kill-leftover-count-doubled': ("slot['entries'] += 1", "slot['entries'] += 2"),
        'kill-leftovers-not-reported': ("'leftAfterSIGKILL': killed_left,", "'leftAfterSIGKILL': {},"),
        'seed-entries-counted-as-the-runs-own': ("slot = item['leftFromSeed' if name in seed_names else 'leftAtEnd']", "slot = item['leftAtEnd']"),
        'mkdtemp-count-includes-derived': ("sum(1 for r in table if r['family'] == 'mkdtemp')", "sum(1 for r in table if r['family'] in ('mkdtemp', 'derived'))"),
        'r3-long-gap-strict-threshold': ('is_long = lambda earlier, later: round(later - earlier, 2) >= 2 * interval', 'is_long = lambda earlier, later: round(later - earlier, 2) > 2 * interval'),
        'r3-published-filter-dropped': ('        if cls not in published:\n            continue\n        slot = by_class', '        slot = by_class'),
        'long-gap-before-the-first-sighting-ignored': ("return is_long(before, first) or (after < len(known) and is_long(last, known[after]))", "return after < len(known) and is_long(last, known[after])"),
    }
    expected = {'classify': EXPECTED, 'aggregate': EXPECTED_AGGREGATE}
    record = {'tool': 'assemble_census.py --selftest', 'sha256': hashlib.sha256(source.encode()).hexdigest(), 'expected': expected}
    got = fixture_answer()
    record['unmutated'] = {'got': got, 'meets': got == expected}
    record['mutants'] = {}
    with tempfile.TemporaryDirectory(prefix='as-') as scratch:
        for name, (old, new) in mutants.items():
            code = source[:source.index('def selftest(')]  # the mutants' own text below it names the same fragments
            assert code.count(old) == 1, (name, code.count(old))
            path = pathlib.Path(scratch) / f'mutant_{name.replace("-", "_")}.py'
            path.write_text(source.replace(old, new, 1))
            ran = subprocess.run([sys.executable, '-I', str(path), '--classify-fixture'], capture_output=True, text=True, timeout=60)
            try:
                answer = json.loads(ran.stdout)
            except json.JSONDecodeError:
                answer = None
            diverges = 'the mutant stopped with an error' if answer is None else sorted(f'{part}: {k}' for part in expected for k in expected[part] if answer[part].get(k) != expected[part][k])
            record['mutants'][name] = {'old': old, 'new': new, 'killed': answer != expected, 'exit': ran.returncode, 'diverges': diverges}
    record['holds'] = record['unmutated']['meets'] and all(m['killed'] for m in record['mutants'].values())
    out.write_text(json.dumps(record, indent=1) + '\n')
    print(json.dumps({'unmutated': record['unmutated']['meets'], 'killed': {n: m['killed'] for n, m in record['mutants'].items()}, 'holds': record['holds']}))
    sys.exit(0 if record['holds'] else 1)


if len(sys.argv) >= 2 and sys.argv[1] == '--classify-fixture':
    print(json.dumps(fixture_answer()))
    sys.exit(0)
if len(sys.argv) >= 2 and sys.argv[1] == '--selftest':
    selftest(pathlib.Path(sys.argv[2]).resolve())

WT, COMMIT, STATIC, RUNS, PROBE, OUT = (pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]), pathlib.Path(sys.argv[4]),
                                        pathlib.Path(sys.argv[5]), pathlib.Path(sys.argv[6]).resolve())
assert re.fullmatch(r'[0-9a-f]{40}', COMMIT), 'give the full 40-hex commit'
git = lambda *a: subprocess.run(['git', *a], cwd=WT, capture_output=True, text=True, check=True).stdout


def sha256(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


static = json.loads(STATIC.read_text())
assert static['treeCommit'] == COMMIT, 'the static census names another commit'
labels = sorted(p.name[:-len('.trace.jsonl.gz')] for p in RUNS.glob('*.trace.jsonl.gz'))
sampler_digests = json.loads((RUNS / 'sampler-digests.json').read_text())['sha256']
carried = json.loads((RUNS / 'carried-observations.json').read_text())
records, traces, samples = {}, {}, {}
for label in labels:
    records[label] = json.loads((RUNS / f'{label}.json').read_text())
    assert records[label]['treeCommit'] == COMMIT, (label, 'the run names another commit')
    raw_trace = gzip.decompress((RUNS / f'{label}.trace.jsonl.gz').read_bytes())
    lines = raw_trace.decode().splitlines()
    assert hashlib.sha256(raw_trace).hexdigest() == records[label]['trace']['sha256'] and len(lines) == records[label]['trace']['lines'], (label, 'the trace is not the one the record names')
    traces[label] = [json.loads(line) for line in lines]
    raw_samples = (RUNS / f'{label}.samples.json').read_bytes()
    assert label in sampler_digests and hashlib.sha256(raw_samples).hexdigest() == sampler_digests[label], (label, 'the sampler record is not the one the digest file names')
    samples[label] = json.loads(raw_samples)
notes = json.loads((RUNS / 'operator-notes.json').read_text()) if (RUNS / 'operator-notes.json').exists() else {}
indexes = {label: Index(rows) for label, rows in traces.items()}
seeded_from = seeded_from_of(records)

classes = build_classes(records, indexes, seeded_from, lambda name: carried['vitestProjectDirectory']['topLevelChildren'])

# Names the sampler saw that no trace line and no final listing carries ---------------------------------------------------------
untraced_seen = {}
for label, s in samples.items():
    final = {e['name'] for e in records[label]['listingAtEnd']}
    for name, seen in s['entries'].items():
        if name in indexes[label].seen:
            continue
        seed = records[label].get('seededFrom', {}).get('entriesMovedIn', [])
        if name in seed:
            continue
        family, cls = classify(name, indexes[label])
        untraced_seen.setdefault(label, {}).setdefault(f'{family}: {cls}', {'names': 0, 'stillThereAtEnd': 0})
        untraced_seen[label][f'{family}: {cls}']['names'] += 1
        untraced_seen[label][f'{family}: {cls}']['stillThereAtEnd'] += name in final

sampler_vs_listing = {label: {'inListingNotInSampler': sorted({e['name'] for e in records[label]['listingAtEnd']} - set(samples[label]['entries'])),
                              'inSamplerFinalNotInListing': sorted(set(samples[label]['present']) - {e['name'] for e in records[label]['listingAtEnd']})}
                      for label in labels}

# Static join ---------------------------------------------------------------------------------------------------------------------
static_files = set(static['files'])


@functools.lru_cache(maxsize=None)
def files_naming(stem: str) -> tuple:
    if not stem:
        return ()
    ran = subprocess.run(['git', 'grep', '-F', '-l', '-z', '-e', f"'{stem}", '-e', f'"{stem}', '-e', f'`{stem}', COMMIT, '--', 'apps', 'packages', 'scripts', '.syzygy'], cwd=WT, capture_output=True, text=True)
    return tuple(sorted({f.split(':', 1)[1] for f in ran.stdout.split('\0') if f and f.split(':', 1)[1].endswith(SUFFIXES)}))


def grep_any(*literals: str) -> list:
    arguments = [part for literal in literals for part in ('-e', literal)]
    ran = subprocess.run(['git', 'grep', '-F', '-l', '-z', *arguments, COMMIT, '--', 'apps', 'packages', 'scripts', '.syzygy'], cwd=WT, capture_output=True, text=True)
    return sorted({f.split(':', 1)[1] for f in ran.stdout.split('\0') if f and f.split(':', 1)[1].endswith(SUFFIXES)})


chrome_launchers = grep_any(*CHROME_LITERALS)
frames_seen, innermost_seen = set(), set()
for rows in traces.values():
    for row in rows:
        frames = creating_frames(row)
        for frame in frames:
            frames_seen.add(frame.rsplit(':', 1)[0])
        if frames:
            innermost_seen.add(frames[0].rsplit(':', 1)[0])

kill_labels = [l for l in labels if records[l]['mode'] == 'kill']
fresh_labels = [l for l in labels if seeded_from(l)]
clean_labels = [l for l in labels if records[l]['mode'] == 'clean' and not seeded_from(l)]

exposure_label = clean_labels[0]
exposure_duration, exposure_interval = records[exposure_label]['seconds'], samples[exposure_label]['intervalSeconds']
sampler_gap, exposure_of = exposure_model(samples[exposure_label]['entries'], indexes[exposure_label], exposure_interval, exposure_duration, exposure_label)

table = build_table(classes, (kill_labels, fresh_labels, clean_labels), seeded_from, files_naming, exposure_of, chrome_launchers)
for row in table:
    if 'topLevelChildrenOfOneObserved' in row:
        row['topLevelChildrenCarriedFrom'] = carried['vitestProjectDirectory']['carriedFrom']

per_file: dict = {}
slot_of = lambda f: per_file.setdefault(f, {'classes': set(), 'pathsCreatedInTheCleanRun': 0, 'leftAfterSIGKILL': {}})
for name, rows in indexes[exposure_label].seen.items():
    slot = slot_of(innermost_file(rows[:1]))
    slot['classes'].add(classify(name, indexes[exposure_label])[1])
    slot['pathsCreatedInTheCleanRun'] += 1
for label in kill_labels:
    for entry in records[label]['listingAtEnd']:
        rows = indexes[label].seen.get(entry['name'])
        slot = slot_of(innermost_file(rows[:1]) if rows else '(no trace line)')
        slot['classes'].add(classify(entry['name'], indexes[label])[1])
        slot['leftAfterSIGKILL'][label] = slot['leftAfterSIGKILL'].get(label, 0) + 1
per_file = {f: {**v, 'classes': sorted(v['classes'])} for f, v in sorted(per_file.items(), key=lambda kv: (-kv[1]['pathsCreatedInTheCleanRun'], kv[0]))}

sweep_effect = {}
for fl in fresh_labels:
    seeded = records[fl]['seededFrom']['entriesMovedIn']
    kill_index = indexes[seeded_from(fl)]
    still = {e['name'] for e in records[fl]['listingAtEnd']} & set(seeded)
    by_class = lambda names: dict(sorted(collections.Counter(classify(n, kill_index)[1] for n in names).items()))
    sweep_effect[fl] = {'killRun': seeded_from(fl), 'seededEntries': len(seeded), 'removedByTheFreshRun': len(seeded) - len(still), 'removedClasses': by_class(set(seeded) - still),
                        'stillThere': len(still), 'stillThereByClass': by_class(still)}

BEAD_OBSERVATION = ('syzygy-poc-surface-fixture-p<pid>-n<ns>-', 'syzygy-public-screen-', 'syzygy-trigger-repo-', 'syzygy-build-output-', 'syzygy-dossier-src-',
                    'syzygy-poc-surface-state-', 'syzygy-trigger-', 'syzygy-poc-browser-', 'chrome-singleton-directory')
named = {}
for wanted in BEAD_OBSERVATION:
    found = [r for r in table if r['class'] == wanted]
    named[wanted] = ({'createdInTheCleanRun': found[0]['created'].get(exposure_label, 0), 'creatingFiles': list(found[0]['creatingFiles']), 'leftInAnyOfTheKills': sorted(found[0]['leftAfterSIGKILL']) or 'none of the three',
                      'rule': found[0]['rule'], 'exposureInTheCleanRun': found[0]['exposureInTheCleanRun']} if found else {'present': False})

left_after_kill = [r for r in table if r['leftAfterSIGKILL']]
never_left = [r for r in table if not r['leftAfterSIGKILL']]
dispositions_by_rule = collections.Counter(r['rule'] for r in table)

# The classes of the names the sampler saw without a trace line, over all seven runs ---------------------------------------------------
untraced_classes = sorted({key for per_run in untraced_seen.values() for key in per_run})
sampler_and_listing_agree = all(not v['inListingNotInSampler'] and not v['inSamplerFinalNotInListing'] for v in sampler_vs_listing.values())

# The vitest project directories of the clean run, by the sampler's first sighting ---------------------------------------------------
vitest_first_seen = sorted(seen['first'] for name, seen in samples[exposure_label]['entries'].items()
                           if name not in indexes[exposure_label].seen and classify(name, indexes[exposure_label])[0] == 'vitest-project-directory')

# Probe: what the launcher alone leaves ----------------------------------------------------------------------------------------
assert PROBE.is_absolute() and len(str(PROBE)) <= 30 and str(PROBE.resolve()) not in ('/', str(pathlib.Path.home().resolve()), str(pathlib.Path(tempfile.gettempdir()).resolve())), 'give a short private probe path'
assert not PROBE.exists() or (PROBE.is_dir() and not any(PROBE.iterdir())), 'the probe directory is not empty'
probe_made_here = not PROBE.exists()
(PROBE / 'tmp').mkdir(parents=True)
try:
    ran = subprocess.run(['npx', 'vitest', '--version'], cwd=WT, env={**os.environ, 'TMPDIR': str(PROBE / 'tmp')}, capture_output=True, text=True, timeout=300)
    probe = {'command': 'npx vitest --version', 'exit': ran.returncode, 'stdout': ran.stdout.strip(), 'leftInTheTempDirectory': sorted(os.listdir(PROBE / 'tmp'))}
finally:
    shutil.rmtree(PROBE / 'tmp', ignore_errors=True)
    if probe_made_here:
        PROBE.rmdir()
chrome = {}
for candidate in ('/opt/google/chrome/chrome', '/usr/bin/google-chrome'):
    if os.path.exists(candidate):
        chrome[candidate] = subprocess.run([candidate, '--version'], capture_output=True, text=True, timeout=60).stdout.strip()
probe['chromeVersions'] = chrome
vitest_dist = sorted((WT / 'node_modules' / 'vitest' / 'dist' / 'chunks').glob('cli-api.*.js'))
literal = 'tmpDir = join(tmpdir(), nanoid());'
probe['vitestSourceLiteral'] = {'literal': literal, 'files': [{'path': str(p.relative_to(WT)), 'occurrences': p.read_text().count(literal), 'sha256': sha256(p)} for p in vitest_dist],
                               'version': json.loads((WT / 'node_modules' / 'vitest' / 'package.json').read_text())['version']}

# Static coverage -------------------------------------------------------------------------------------------------------------
uncovered = sorted(static_files - innermost_seen)
sites_all = [s for sites in static['files'].values() for s in sites]
coverage = {'filesWithAStaticSite': len(static_files), 'sitesInThem': static['sites'], 'byTree': static['byTree'],
            'sitesWithAPrefixLiteral': sum(1 for s in sites_all if s['literal']), 'sitesWithoutOne': sum(1 for s in sites_all if not s['literal']),
            'filesWithASiteThatWasTheInnermostCreatingFrameInSomeRun': len(static_files & innermost_seen),
            'filesWithASiteThatAppearedInSomeFrame': len(static_files & frames_seen),
            'filesWithASiteNeverSeen': len(uncovered),
            'neverSeenByTree': dict(sorted(collections.Counter(f.split('/')[0] for f in uncovered).items())),
            'neverSeen': {f: sorted({s['literal'] for s in static['files'][f] if s['literal']}) + (['(a site with no prefix literal on its line: built some other way)'] if any(s['literal'] is None for s in static['files'][f]) else []) for f in uncovered}}

by_rule_classes = lambda rule: [r['class'] for r in table if r['rule'] == rule]
fresh_killed = {fl: sweep_effect[fl] for fl in fresh_labels}
bound_of = lambda v: v['exposureInTheCleanRun']['expectedNamesPresentAtARandomMoment']['upperBound']
never_left_named = [v for v in named.values() if v.get('leftInAnyOfTheKills') == 'none of the three']
exposure_top = sorted((r for r in table if r['exposureInTheCleanRun']), key=lambda r: -r['exposureInTheCleanRun']['expectedNamesPresentAtARandomMoment']['upperBound'])[:15]
published = ({r['class'] for r in left_after_kill if r['exposureInTheCleanRun']} | {k for k, v in named.items() if v.get('exposureInTheCleanRun')} | {r['class'] for r in exposure_top})
long_gaps = long_gap_trace(samples[exposure_label]['entries'], indexes[exposure_label], exposure_interval, published)
never_left_names = sorted(k for k, v in named.items() if v.get('leftInAnyOfTheKills') == 'none of the three')
never_left_dependent = [c for c in never_left_names if c in long_gaps['publishedClassesThatDependOnThem']]
finding = [
    '[Observed] A SIGKILL of the full run leaves %s entries in the private temp directory (%s MB) at %s s into the run, in %d classes in all; at least %s processes carrying the --user-data-dir marker in their arguments (Chrome\'s) survive the kill of the process group, and were stopped by pid. The process count is a lower bound: helpers that carry the private TMPDIR only in their environment (cat, chrome_crashpad_handler) are not matched by the marker.'
    % (' / '.join(str(len(records[l]['listingAtEnd'])) for l in kill_labels), ' / '.join(str(round(sum(e['bytes'] for e in records[l]['listingAtEnd']) / 1e6, 1)) for l in kill_labels),
       ' / '.join(str(records[l]['killAfterSeconds']) for l in kill_labels), len(left_after_kill), ' / '.join(str(records[l]['processesCarryingTheMarker']['count']) for l in kill_labels)),
    '[Observed] One fresh full run started in each kill\'s leftovers removed %s of %s entries, all of them of the two classes PR 509 sweeps (%s); the other %s stayed, in %s classes.'
    % (' / '.join(str(v['removedByTheFreshRun']) for v in fresh_killed.values()), ' / '.join(str(v['seededEntries']) for v in fresh_killed.values()),
       ', '.join(by_rule_classes('R1-fixture-sweep-landed')), ' / '.join(str(v['stillThere']) for v in fresh_killed.values()),
       len({c for v in fresh_killed.values() for c in v['stillThereByClass']})),
    '[Observed] ' + partition_sentence(table, len(records)),
    '[Observed] The clean run itself leaves %s entries (%s); this tree has no PR 515, so a clean run leaves Chrome singleton directories (%s in the fresh runs).'
    % (len(records[exposure_label]['listingAtEnd']), ', '.join(sorted(classify(e['name'], indexes[exposure_label])[1] for e in records[exposure_label]['listingAtEnd'])),
       ' / '.join(str(row['leftByTheFreshRunItself'].get(fl, {}).get('entries', 0)) for fl in fresh_labels for row in table if row['family'] == 'chrome-singleton')),
    '[Inferred] Which classes a given SIGKILL catches depends on what is alive at that moment. The expected number of directories of a class present at a random moment of the clean run is in exposureInTheCleanRun; the prefixes the bead observation names that none of these three kills left (%s) have an upper bound of %s or less (two sampler gaps of %s s for each name the sampler saw, one for each it did not). By Markov\'s inequality one kill at a random moment catches such a class with probability at most that bound and misses it with probability at least %s, if the clean run\'s timing represents a kill run\'s.'
    % (', '.join(sorted(k for k, v in named.items() if v.get('leftInAnyOfTheKills') == 'none of the three')), max(bound_of(v) for v in never_left_named), sampler_gap['gapSeconds'],
       round(1 - max(bound_of(v) for v in never_left_named), 3)) + (
        ' %d of these %d classes depend on the assumption that no sampler gap is longer than the gap above (a name of the class that the sampler never saw, created inside a gap of two intervals or more, or a sampled name with such a gap beside its sightings; exposureRanking.longGapsInTheTrace)%s.'
        % (len(never_left_dependent), len(never_left_names), '' if not never_left_dependent else ': ' + ', '.join(never_left_dependent))),
]
GUARDS = [
    '(1) Owner liveness exactly as PR 509: owner pid and pid-namespace inode in the name; refuse when the owner is alive or the namespace differs.',
    "(2) Process match by exact argv element equality `--user-data-dir=<profile>` over `/proc/<pid>/cmdline` split on NUL, same uid, never a substring; plus the browser's session: read the browser pid from the profile's `SingletonLock` link, verify its uid, start time (field 22) later than the profile's creation and its argv element, then signal its session members, as `livePrivateBrowserMembers` does.",
    '(3) Re-verify identity immediately before each signal (or use a pidfd) against pid reuse.',
    '(4) SIGTERM, bounded wait, then SIGKILL; a stopped (`T`) process holds SIGTERM until SIGCONT, so SIGKILL it (the PR saw one).',
    '(5) Delete only after a re-scan finds no matching process.',
    "(6) Follow `SingletonSocket` with `lstat` only; accept its target only if the target's parent realpath equals the run's temp directory, the basename matches the Chrome singleton shape, it is a directory owned by the uid and not a link; never follow a link out of that directory (PR 515's guard).",
    '(7) Normalize paths before any containment check (AGENTS.md: `authorizeWrite` uses raw `startsWith`).',
    '(8) A rule-6 mutant per guard and an independent review; the PR states its CC-REV-1 classes.',
]
N12_PRECONDITION = ('Before this assembler is used as acceptance evidence for this follow-up, its aggregation fixture must gain a seeded run and literal leftAfterSIGKILL, '
                    'afterTheNextFreshRun and leftByTheFreshRunItself values, and a derived name, with the four mutants that round 2 of the review found surviving '
                    '(kill-leftover-count-doubled, kill-leftovers-not-reported, seed-entries-counted-as-the-runs-own, mkdtemp-count-includes-derived) killed (round 2, N12).')
F1_MEASURE = ("census_run.py cannot measure this change as it stands: in kill mode it SIGTERMs every process carrying the marker before it writes its record, "
              "--seed-tmp-from refuses while any process carries the earlier marker, and seeding renames the entries into a new TMPDIR, so the profile's SingletonSocket link "
              "and every orphan's --user-data-dir argument name a directory that no longer exists and PR 515's dirname(link) === tmpdir() check refuses, correctly; "
              "[Inferred, the harness was not run for this] under that harness a correct F1 still leaves the Chrome singleton directory in place. Measure F1 "
              "(i) by unit tests over synthetic dead-owner profiles, one case and one rule-6 mutant per guard: a live decoy carrying the exact argv element, one carrying it only as "
              "a substring, a stopped (T) process, a reused pid, a SingletonSocket link that leaves the temp directory; and "
              "(ii) end to end only after a harness change, for a new set of runs: a mode that leaves the killed run's orphans running and starts the fresh run in the same TMPDIR, "
              "then reads syzygy-poc-browser- and chrome-singleton-directory stillThere 0 and the killed run's marker count 0 after the fresh run's sweep (the marker count is a lower bound, see limits). "
              + N12_PRECONDITION)
F2_WHAT = ("To be lodged as a comment on syzygy-bpyt.4.4 when this record merges. The dispositions of rules R6 and R9 are conditional on it: until it is lodged, and then met by that bead\'s change, they are proposals. "
           "After a SIGKILLed full run and a fresh run started in the killed run\'s leftovers, no entry remains except the classes of rules R2, R4, R5 and R7, and of R3 until follow-up F1 lands (or unless F1\'s guards cover the browser profile inside the root sweep). "
           "The kill must be non-vacuous: either it left at least one dead-owner root holding an entry of an R9 class and one of an R6 class (read by listing each root\'s children, which census_run.py does not do today; "
           "and assemble_census.py needs a disposition rule for the root\'s own class before it can measure F2, because a root made by the worker setup file has a creating file outside apps/, packages/ and scripts/ that is not a test file, "
           "so rules R6 and R9 both refuse it and the assembler stops), or synthetic dead-owner roots are seeded, as PR 509\'s tests do. "
           "A mechanism that reaches non-test modules too: the worker setup file assigns process.env.TMPDIR to an owner-pid root, because os.tmpdir() reads TMPDIR at each call. "
           "A child started with a constructed environment (packages/polaris-dossier/src/no-egress.test.ts, line 55 at the run commit: env: { PATH, HOME, [FULL_RUN_ROOT_ENV] }) inherits neither the root nor the private TMPDIR, so its entries go to the system temp directory, "
           "outside both the mechanism and this measurement: F2 must require such children to pass TMPDIR through, or name them as a residual. "
           "Budget: Chrome\'s socket path limits TMPDIR to 65 bytes (PR 515); the root adds about 40.")
F2_MEASURE = ("the same runs: assemble_census.py leftBySIGKILL lists only R2, R4, R5, R7 classes (and R3 until F1) after a fresh run started in the killed run's leftovers, "
              "and the kill itself left at least one dead-owner root holding an R9-class entry and one holding an R6-class entry (or the seeded synthetic roots stand in for it, see what). "
              + N12_PRECONDITION)
FOLLOW_UPS = [
    {'id': 'F1', 'title': 'Name the browser profile for its owner and sweep it with its Chrome directory and its orphan processes', 'size': 'small in code (one creating file, cdp-browser.ts), not trivially safe',
     'covers': by_rule_classes('R3-browser-profile') + by_rule_classes('R2-chrome-singleton'),
     'what': 'Extend the PR 509 pattern to the syzygy-poc-browser- profile: the owner pid and namespace in its name; a sweep that removes it only when the owner is dead in this namespace, removes the Chrome singleton directory its SingletonSocket link names under PR 515\'s guard (merged as a088f1ca on main after the run commit), and stops the processes that still run on the profile (SIGTERM, then SIGKILL after a wait: a stopped process ignores SIGTERM, seen once in an earlier set of these runs at a discarded commit, not retained). The marker is the exact argument element --user-data-dir=<profile>, with no trailing slash (cdp-browser.ts launches Chrome with --user-data-dir=${profile}); an earlier draft of this proposal wrote a trailing slash, which matches no Chrome process. The guards below are the round-1 review\'s, copied from its raw review (R-GP-IMPL-SCRATCH-PREFIX-CENSUS-1-RAW.md, section 4, N3) as that review words them.',
     'guards': GUARDS,
     'whyNotTriviallySafe': 'It deletes recursively and signals processes by argument match and by session. A sweep built on a marker that matches no process would find no live process and delete a profile under live orphans. It needs an independent review of its own, with its own CC-REV-1 classes.',
     'measure': F1_MEASURE},
    {'id': 'F2', 'title': 'Add a census acceptance criterion to syzygy-bpyt.4.4 (test-kit temp root)', 'size': 'a comment on an existing bead, no new bead',
     'covers': by_rule_classes('R9-test-file') + by_rule_classes('R6-non-test-module'),
     'what': F2_WHAT,
     'measure': F2_MEASURE},
    {'id': 'F3', 'title': 'Option, not proposed as small: a run wrapper that gives the whole vitest run an owner-pid TMPDIR', 'size': 'medium; changes how npm test is run (root manifest)',
     'covers': by_rule_classes('R2-chrome-singleton') + by_rule_classes('R4-vitest-project-directory') + by_rule_classes('R5-npm-compile-cache') + by_rule_classes('R7-stale-lock-by-design'),
     'what': 'Children inherit TMPDIR, so vitest\'s project directories, npm\'s compile cache, Chrome\'s singleton directories and the restart lock would all land in one root swept by one rule. Costs: npm\'s compile cache stops being shared between runs; the 65-byte Chrome budget; the restart lock\'s by-design stale-lock behaviour is then moot only for killed runs. An owner or coordinator choice.'},
    {'id': 'none', 'title': 'No sweep is proposed for the restart lock', 'what': 'restart.ts says "A stale lock requires operator inspection; the script never guesses that it is safe to remove one." The lock is named for the uid and the port, not a pid.'},
]
record = {
    'subject': {'what': 'every entry a full vitest run creates directly in its temp directory, and which of them a SIGKILLed run, and one fresh run after it, leave behind',
                'treeCommit': COMMIT, 'command': 'npx vitest run (the root configuration: every project, maxWorkers 50%)',
                'notRun': 'test:system (packages/cap1-system) and the shell scripts under scripts/, which the root run does not start. The Python scripts under scripts/ are not run as such either, but some root-run tests start python3 -c children (a Python process is never a traced Node frame); the scripts appear in the static census below',
                'revision': 'Regenerated on 2026-10-25 from the stored runs (none was repeated) after round 1 of the review: the exposure upper bound counts two sampler gaps for each sampled name and one for each name never sampled; the partition sentence is generated from every rule count and checked to sum to the class count; the static census reads multi-segment prefix literals; the sampler records are bound by sampler-digests.json; the rule and limit texts name what they depend on. Regenerated again on 2026-10-25 after round 2, from the same stored runs (none repeated): F1\'s measure names what the harness cannot measure, the exposure ranking reads the long sampler gaps against the trace, and F2\'s non-vacuity branch and F1 and F2 carry the aggregation-fixture precondition.',
                'toolSha256': {name: sha256(pathlib.Path(__file__).resolve().parent / name) for name in ('assemble_census.py', 'census_run.py', 'collect_runs.py', 'scratch_trace.cjs', 'static_sites.py', 'tmp_sampler.py')},
                'staticSitesSha256': sha256(STATIC), 'samplerRecordSha256': sampler_digests, 'carriedObservationsSha256': sha256(RUNS / 'carried-observations.json')},
    'runs': {label: {'mode': r['mode'], 'seededFrom': seeded_from(label), 'entriesMovedIn': len(r['seededFrom']['entriesMovedIn']) if r.get('seededFrom') else 0, 'killAfterSeconds': r.get('killAfterSeconds'),
                     'secondsIntoTheRun': r.get('secondsIntoTheRun'), 'seconds': r.get('seconds'), 'exit': r['exit'], 'loadAverageAtStart': r['loadAverageAtStart'],
                     'groupMembersAtSignal': r.get('groupMembersAtSignal'), 'entriesAtSignal': r.get('entriesAtSignal'), 'afterSignal': r.get('afterSignal'),
                     'traceLines': r['trace']['lines'], 'traceSha256': r['trace']['sha256'], 'pathsCreatedDirectlyInTemp': len({row['path'] for row in traces[label]}),
                     'processesCreating': len({row['pid'] for row in traces[label]}), 'entriesAtEnd': len(r['listingAtEnd']), 'bytesAtEnd': sum(e['bytes'] for e in r['listingAtEnd']),
                     'processesCarryingTheMarker': r['processesCarryingTheMarker'], 'stoppedByPid': r['stoppedByPid'], 'operatorNotes': notes.get(label, [])}
             for label, r in records.items()},
    'classCounts': {'classes': len(table), 'leftBySomeSIGKILL': len(left_after_kill), 'neverLeftInTheseKills': len(never_left), 'byRule': dict(sorted(dispositions_by_rule.items())),
                    'byFamily': dict(sorted(collections.Counter(r['family'] for r in table).items()))},
    'whatEachFreshRunRemovedOfTheKilledRunsLeftovers': sweep_effect,
    'namedInTheBeadObservation': named,
    'perCreatingFile': per_file,
    'leftBySIGKILL': left_after_kill,
    'neverLeftInTheseKills': [{k: r[k] for k in ('class', 'family', 'created', 'creatingFiles', 'rule', 'disposition')} for r in never_left],
    'dispositionRules': [{'rule': rid, 'disposition': kind, 'why': why} for rid, kind, _, why in RULES],
    'namesTheSamplerSawThatNoTraceLineCarries': untraced_seen,
    'vitestProjectDirectoriesInTheCleanRun': {'count': len(vitest_first_seen), 'firstSightingSeconds': vitest_first_seen, 'runLastedSeconds': exposure_duration},
    'samplerAgainstFinalListing': sampler_vs_listing,
    'staticGrepScope': 'git grep -F -l for the quoted stem (\' " or `) in blobs of the commit under apps, packages, scripts and .syzygy, files ending ' + ' '.join(SUFFIXES) + '; docs/ is left out because its evidence tools quote prefixes without creating them',
    'launcherProbe': probe,
    'staticCoverage': coverage,
    'exposureRanking': {'run': exposure_label,
                        'meaning': ('expected number of directories of the class present at a uniformly random moment of the clean run (sampler interval %s s). The lower bound counts each sampled name once, for the span between its first and last sighting. '
                                    'The upper bound adds, for each sampled name, the gap before its first sighting and the gap after its last (two gaps: it was absent at the sample before the first and at the sample after the last), and for each name the sampler never saw one gap. '
                                    'Every gap is taken as %s s, the largest gap under two intervals between consecutive sighting instants in this run\'s sampler record (%d of the %d gaps between its %d sighting instants are that short; the other %d are %s s or more). '
                                    'A gap under two intervals is taken as a single sample period, because the sampler sleeps a full interval between listings. '
                                    'The other gaps are not shown to be quiet. With the trace aligned to the sampler clock (the %d traced names the sampler also saw bound the offset between the two clocks to a window of %s s, and the middle of it is used; a negative window means those bounds overlap by that much; exposureRanking.longGapsInTheTrace, which counts the run\'s start as a sighting instant), '
                                    '%d of the %d traced names were created inside the %d gaps of two intervals or more (%s s together) and the sampler saw %d of them, against %d of %d created inside the %d shorter gaps (%d traced names fall in no gap). '
                                    '[Inferred] Those stretches are busy, not quiet: the data fit a stalled or starved sampler, or names that all lived under one sample, and cannot separate the two. '
                                    'The sampler record keeps each name\'s first and last sighting, not its sample times, so a sampler stall longer than the gap above is [Unknown] and would raise the bound. '
                                    '%d of the %d classes whose upper bound this record publishes (leftBySIGKILL, namedInTheBeadObservation, exposureRanking.top) rest partly on that assumption: %s.')
                        % (exposure_interval, sampler_gap['gapSeconds'], sampler_gap['gapsUnderTwoIntervals'], sampler_gap['gapsBetweenSightings'], sampler_gap['sightingInstants'], sampler_gap['gapsOfTwoIntervalsOrMore'], sampler_gap['smallestGapOfTwoIntervalsOrMore'],
                           long_gaps['tracedNamesTheSamplerSaw'], long_gaps['clockOffsetWindowSeconds'],
                           long_gaps['gapsOfTwoIntervalsOrMore']['namesCreatedInside'], long_gaps['tracedNames'], long_gaps['gapsOfTwoIntervalsOrMore']['gaps'], long_gaps['gapsOfTwoIntervalsOrMore']['seconds'], long_gaps['gapsOfTwoIntervalsOrMore']['ofThemEverSampled'],
                           long_gaps['shorterGaps']['ofThemEverSampled'], long_gaps['shorterGaps']['namesCreatedInside'], long_gaps['shorterGaps']['gaps'], long_gaps['tracedNamesCreatedInNoGap'],
                           len(long_gaps['publishedClassesThatDependOnThem']), long_gaps['publishedClasses'], ', '.join(long_gaps['publishedClassesThatDependOnThem'])),
                        'samplerGap': sampler_gap,
                        'longGapsInTheTrace': long_gaps,
                        'top': [{'class': r['class'], 'upperBound': r['exposureInTheCleanRun']['expectedNamesPresentAtARandomMoment']['upperBound'], 'lowerBound': r['exposureInTheCleanRun']['expectedNamesPresentAtARandomMoment']['lowerBound']}
                                for r in exposure_top]},
    'finding': finding,
    'followUps': FOLLOW_UPS,
    'limits': [
        'The tracer wraps mkdtemp, mkdir, writeFile and symlink only (sync, callback and promise forms), and logs a call only when the directory name of the path is the temp directory. A name made by open/openSync, copyFile, rename, link, cp, a stream, mkdtempDisposableSync, a recursive mkdir whose new top-level parent is not the last element of the path (mkdirSync(join(tmpdir(), "a", "b"), { recursive: true }) creates "a" with no trace line), or by a process that is not Node has no trace line: it is classed by shape, or by the static stem and labelled inferred. [Observed 2026-10-25 in a probe with the preload: the recursive parent, mkdtempDisposableSync and openSync entries had no trace line.] The static census finds %d mkdtempDisposable sites in the %d blobs it read.'
        % (static['sitesByKind']['js-mkdtemp-disposable'], static['filePopulation']['blobsRead']),
        'The sampler lists the temp directory every %s s and keeps, for each name, its first and last sighting, not its sample times. A directory that lives less than one gap can be missed; the exposure bounds count it as one gap, and assume no sampler gap longer than %s s (exposureRanking.meaning).' % (exposure_interval, sampler_gap['gapSeconds']),
        'Three SIGKILL points (about 25, 50 and 75 percent of a clean run of about 150 s) catch the directories alive at that moment. A class absent from every kill is not thereby safe; its disposition rests on its creating file, not on a leftover.',
        'The root vitest run only. test:system (packages/cap1-system) is in the static census, not in any run. Some root-run tests do start Python: python3 -c children in public-source-screening.test.ts (line 446 at the run commit), screen.test.ts (lines 261 and 345) and, through recorder-fixtures.testkit.ts (named at sync-child-process-guard.test.ts line 36), the consent recorder. A Python file can never be a Node frame, so "never seen" for the %d scripts/ files with a static site is structural and measures no reach. The sampler\'s evidence is the classes of the names it saw without a trace line, over all seven runs: %s; and its names and each run\'s final listing agree both ways: %s. So [Inferred] no Python child left another entry that lived for a sample or more (one that lived less is invisible to the sampler).'
        % (coverage['neverSeenByTree'].get('scripts', 0), '; '.join(untraced_classes), 'yes' if sampler_and_listing_agree else 'NO'),
        'Runs shared the host with other work (load average at each start is recorded); one fresh run exited 1 on two 5000 ms test timeouts.',
        'The fresh run after each kill starts in that kill\'s leftovers renamed into a new private temp directory; the process ids of the dead owners are not reused within the minutes between the runs [Inferred].',
        'The surviving-process counts are lower bounds. census_run.py finds processes by the exact --user-data-dir=<private directory>/tmp/ marker in their arguments only. Helpers that carry the private TMPDIR only in their environment are not matched and not stopped by that match. Round 1 of the review found 8 of 26 survivors of its own 75 s kill were of that kind, among them two cat processes and a chrome_crashpad_handler, which runs in its own process group (observed by the reviewer; that run is not retained here). [Unknown] whether any such helper outlived the seven runs.',
        'The top-level children of a vitest project directory (ssr) were read once, on 2026-10-24, from a private directory that has since been deleted. This record carries that value from runs/carried-observations.json and does not re-read it.',
    ],
}
OUT.write_text(json.dumps(record, indent=1, default=sorted) + '\n')
print(json.dumps({'classes': record['classCounts'], 'runs': {l: {k: v[k] for k in ('entriesAtEnd', 'pathsCreatedDirectlyInTemp')} for l, v in record['runs'].items()},
                  'coverage': {k: v for k, v in coverage.items() if k not in ('neverSeen', 'byTree')}}, indent=1))
