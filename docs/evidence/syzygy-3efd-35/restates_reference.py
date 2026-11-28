#!/usr/bin/env python3
"""Reference reading of rule walk-step-restates-label v1, to check the spec's scenario claims."""
import unicodedata

FILLER = set('a an and are as at be by for from here in is it its of on or see shown shows step that the then these this '
             'those to with'.split())


def words(s):
    out = []
    for ch in s:
        if 'A' <= ch <= 'Z':
            out.append(ch.lower())
        elif unicodedata.category(ch)[0] in 'LN':
            out.append(ch)
        else:
            out.append(' ')
    return [w for w in ''.join(out).split(' ') if w]


def match(p, l):
    return p == l or p in (l + 's', l + 'es') or l in (p + 's', p + 'es')


def restates(paragraph, label):
    lw = words(label)
    return all(any(match(p, l) for l in lw) for p in words(paragraph) if p not in FILLER)


CASES = [
    ('The request router.', 'Request router', True),
    ('Each client opens one connection per request.', 'Client', False),
    ('The handler maps a path prefix to one controller.', 'Handler', False),
    ('The Request-Router, shown here!', 'Request router', True),
    ('Request routers.', 'Request router', True),
    ('This is the step shown here.', 'Request router', True),
    ('The request router. It is the router.', 'Request router', True),
    ('Router: the requests', 'Request router', True),
    ('Request routes.', 'Request router', False),
    ('The request router retries.', 'Request router', False),
    ('The request router, 2 of them.', 'Request router', False),
    ('The request router calls the handler.', 'Request router', False),
    ('The request router, 2.', 'Request router', False),
    ('The request router and the handler.', 'Request router', False),
    ('The.', '\u2014', True),
    ('Router.', '\u2014', False),
    ('', 'Router', True),
    ('src: 12 files.', 'src/ (12 files)', True),
    ('The src directory holds the sources.', 'src/ (12 files)', False),
]
bad = [(p, l, e) for p, l, e in CASES if restates(p, l) != e]
print('cases', len(CASES), 'disagree', bad)


def words_digits_dropped(s):
    # Rule-6 mutant: letters only (category L), so a number is no word.
    return [w for w in ''.join(ch.lower() if 'A' <= ch <= 'Z' else ch if unicodedata.category(ch)[0] == 'L' else ' '
                               for ch in s).split(' ') if w]


def restates_digits_dropped(paragraph, label):
    lw = words_digits_dropped(label)
    return all(any(match(p, l) for l in lw) for p in words_digits_dropped(paragraph) if p not in FILLER)


killed = [(p, l) for p, l, e in CASES if restates_digits_dropped(p, l) != e]
print('digits-dropped mutant killed by', killed)
assert killed, 'no case distinguishes a number from a dropped code point'
