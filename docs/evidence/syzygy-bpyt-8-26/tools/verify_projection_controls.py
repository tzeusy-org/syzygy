"""Falsify projection-to-native binding predicates; no product/runtime gate replacement."""
from pathlib import Path
import copy,hashlib,json
from project_evidence import projection,verify
own=Path(__file__).resolve().parent;raw=own/'final-targeted-M0.json';base=projection(raw);assert verify(raw,base)['success'];cases=[]
for name in ['missing-world','missing-matrix-row','paired-value-key','native-binding','missing-value','value-byte-length','identity-ordinal']:
 p=copy.deepcopy(base)
 if name=='missing-world':p['worlds'].pop()
 if name=='missing-matrix-row':p['worlds'][0]['matrix'].pop()
 if name=='paired-value-key':p['worlds'][0]['matrix'][0]['old']='0'*64
 if name=='native-binding':p['nativeOutput']['sha256']='0'*64
 if name=='missing-value':p['valueCommitments'].pop(next(iter(p['valueCommitments'])))
 if name=='value-byte-length':p['valueCommitments'][next(iter(p['valueCommitments']))]['bytes']+=1
 if name=='identity-ordinal':p['generatedManifest'][0]['ordinal']=1
 r=verify(raw,p);cases.append({'id':name,'executedComparisons':r['answers'],'classification':'killed'if not r['success'] and r['answers']>0 else'survived','errors':r['errors']})
result={'schema':'consent-port-projection-controls/1','nativeSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'cases':cases,'success':all(x['classification']=='killed'for x in cases),'scope':'Projection fidelity only; full normal tool and semantic controls have separate gates.'};(own/'PROJECTION-CONTROLS.json').write_text(json.dumps(result,indent=2)+'\n');print(result['success'],len(cases));raise SystemExit(not result['success'])
