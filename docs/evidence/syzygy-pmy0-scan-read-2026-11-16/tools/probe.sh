#!/bin/bash
# usage: probe.sh <label> <guardian-source>
S=${PMY0_SCRATCH:?set PMY0_SCRATCH to a private scratch directory}
P=$(cd "$(dirname "$0")" && pwd)  # main_protocol_17.py and launcher_16.py, retained beside this script
D=$S/probe-$1; mkdir -p $D && cd $D && cp $P/main_protocol_17.py $P/launcher_16.py . && cp $2 guardian-source.py
python3 - "$D" "$P" <<'PY'
import json,hashlib,sys
from pathlib import Path
D,P=sys.argv[1:]
h=lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
m=json.loads(Path(P,'prepared-manifest.json').read_text())
m.update(source_path=D+'/guardian-source.py', source_sha256=h('guardian-source.py'), probe_sha256=h('main_protocol_17.py'), launcher_sha256=h('launcher_16.py'))
Path('prepared-manifest.json').write_text(json.dumps(m,indent=2))
PY
echo "pids $(ls /proc | grep -c '^[0-9]') load $(cut -d' ' -f1-3 /proc/loadavg)"
python3 main_protocol_17.py > result.json; echo exit $?
python3 -c "
import json; r=json.load(open('result.json')); print({k:r.get(k) for k in ['source_sha256','guardian_returncode','guardian_elapsed_after_stop','acknowledgement','proof_succeeded_before_recovery','errors']}); print('stderr',repr(r.get('stderr'))); print('after',len(r['after_proc']['family']), len(r['after_ps']['family']), 'denominator', r['after_proc']['metadata_denominator'], 'recovery signals', r['recovery']['signals'])"
