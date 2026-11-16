"""Private guardian child: this launcher plus16 grandchildren is17 descendants."""
import json
import os
from pathlib import Path
import subprocess
import time

def identity(pid):
    path = Path('/proc', str(pid))
    text = (path / 'stat').read_text()
    fields = text[text.rfind(')') + 2:].split()
    return {'pid': pid, 'start': fields[19], 'ppid': int(fields[1]),
            'state': fields[0], 'uid': path.stat().st_uid,
            'namespace': os.readlink(path / 'ns/pid')}

children = [subprocess.Popen(['sleep', '120'], stdin=subprocess.DEVNULL,
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            for _ in range(16)]
print(json.dumps({'ready': True, 'launcher': identity(os.getpid()),
                  'children': [identity(child.pid) for child in children]}), flush=True)
time.sleep(120)
