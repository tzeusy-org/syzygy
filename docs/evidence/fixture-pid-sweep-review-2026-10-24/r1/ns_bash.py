"""Show the parent chain of nested-namespace uid-1000 bash/sleep/python3 processes (read-only)."""
import os


def status(pid):
    with open(f'/proc/{pid}/status') as handle:
        return dict(line.rstrip('\n').split(':\t', 1) for line in handle if ':\t' in line)


for entry in os.listdir('/proc'):
    if not entry.isdigit():
        continue
    try:
        fields = status(entry)
    except OSError:
        continue
    if fields.get('Uid', '').split('\t')[0] != '1000':
        continue
    if len(fields.get('NSpid', '').split('\t')) < 2:
        continue
    if fields.get('Name') not in ('bash', 'sleep', 'python3'):
        continue
    chain = []
    pid = entry
    for _ in range(6):
        try:
            parent = status(pid)
            with open(f'/proc/{pid}/cmdline', 'rb') as handle:
                cmd = handle.read().replace(b'\0', b' ')[:80].decode('utf8', 'replace')
        except OSError:
            break
        chain.append(f"{pid}:{parent.get('Name')}[{cmd}]")
        pid = parent.get('PPid', '0')
        if pid in ('0', '1'):
            break
    print(' <- '.join(chain))
