from pathlib import Path
import hashlib,json
own=Path(__file__).resolve().parent;p=own/'M0-full.json';d=json.loads(p.read_text());rows=[]
for w in d['worlds']:
 if w['kind']!='edited-between-reads':continue
 steps={i:{(r['reader'],r['instant']):r['old']for r in w['matrix']if r['step']==i}for i in [1,2,3]};assert steps[1]and steps[1].keys()==steps[2].keys()==steps[3].keys();changed=sum(v!=steps[2][k]for k,v in steps[1].items());restored=steps[1]==steps[3];assert changed>0 and restored;rows.append({'worldId':w['id'],'pairedReaderInstantDenominator':len(steps[1]),'middleStepChanges':changed,'quietThirdStepEqualsFirst':restored})
expected=d['populations']['selected']['byKind']['edited-between-reads'];assert len(rows)==expected
result={'schema':'corrected-edited-world-freshness/1','nativeSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'worldDenominator':expected,'worlds':rows,'success':True};(own/'FRESHNESS-RECOUNT.json').write_text(json.dumps(result,indent=2)+'\n');print('freshness worlds',expected)
