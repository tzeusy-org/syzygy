import json,re,collections
b=json.load(open('cli-differential-base.json')); h=json.load(open('cli-differential-head.json'))
assert len(b)==len(h); print('cases',len(b))
def strip_disc(s):
    s=re.sub(r'choice-[0-9a-f]{16}','choice-<v>',s)
    try:
        j=json.loads(s)
        if isinstance(j,dict) and j.get('stage')=='launched': j.pop('disclosures',None); return 'J'+json.dumps(j,sort_keys=True)
        return 'J'+json.dumps(j,sort_keys=True)
    except Exception: pass
    if '\nstage: launched\n' in s: s='\n'.join(l for l in s.split('\n') if not l.startswith('disclosures.'))
    return s
def norm(x):
    x=dict(x)
    for k in ('stdout','stderr','choice'):
        if x.get(k): x[k]=re.sub(r'choice-[0-9a-f]{16}','choice-<v>',x[k])
    return x
same=0; disc_only=0; other=[]
table=collections.Counter()
for bb,hh in zip(b,h):
    assert (bb['plant'],bb['variant'])==(hh['plant'],hh['variant'])
    bb,hh=norm(bb),norm(hh)
    def stage(x):
        for k in ('stdout','stderr'):
            m=re.search(r'"stage": "([^"]+)"|\nstage: (\S+)',x[k] or '')
            if m: return m.group(1) or m.group(2)
        return None
    table[(bb['plant'].split(':')[0] if not bb['plant'].startswith('symlink-dotdot') else bb['plant'], stage(bb), stage(hh), bb['code'], hh['code'])]+=1
    if bb==hh: same+=1; continue
    b2={**bb,'stdout':strip_disc(bb['stdout']),'stderr':strip_disc(bb['stderr'])}
    h2={**hh,'stdout':strip_disc(hh['stdout']),'stderr':strip_disc(hh['stderr'])}
    hasdisc = 'disclosures' in hh['stdout']+hh['stderr'] and 'disclosures' not in bb['stdout']+bb['stderr']
    if b2==h2 and hasdisc and stage(bb)=='launched': disc_only+=1; continue
    other.append((bb,hh))
print('identical',same,'disclosures-only on launched',disc_only,'other',len(other))
for bb,hh in other: print('OTHER',bb['plant'],bb['variant'],'\n base',{k:v for k,v in bb.items()}, '\n head',{k:v for k,v in hh.items()})
print('\nplant | base stage | head stage | base code | head code : count')
for k,v in sorted(table.items(),key=str): print(k,v)
