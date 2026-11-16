"""Rule-9 sweep: every permission-mode literal in tracked files under packages/polaris-dossier/ at a commit,
classified by whether it denies the owner read (files) or search (dirs). Reads git objects only."""
import re, subprocess, sys
repo, commit = sys.argv[1], sys.argv[2]
files = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit, '--', 'packages/polaris-dossier'],
                       capture_output=True, check=True).stdout.decode().split('\0')
files = [f for f in files if f]
MODE = re.compile(r'0o([0-7]{3,4})\b')
CALL = re.compile(r'\b(chmod(?:Sync)?|fchmod(?:Sync)?|lchmod(?:Sync)?|mode\s*:|umask)')
rows = []; scanned = 0; lit_total = 0
for f in files:
    data = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{f}'], capture_output=True, check=True).stdout
    try: text = data.decode('utf-8')
    except UnicodeDecodeError: continue
    scanned += 1
    for n, line in enumerate(text.split('\n'), 1):
        for m in MODE.finditer(line):
            lit_total += 1
            v = int(m.group(1), 8)
            ctx = CALL.search(line)
            denies = (v & 0o400) == 0
            rows.append((f, n, m.group(0), bool(ctx), denies, line.strip()[:160]))
print(f'commit={commit} tracked_files={len(files)} text_scanned={scanned} mode_literals={lit_total}')
deny = [r for r in rows if r[4]]
print(f'literals_without_owner_read={len(deny)}')
for r in deny: print(f'  {r[0]}:{r[1]} {r[2]} call_on_line={r[3]} :: {r[5]}')
# chmod-like calls whose mode is not a literal on the same line
nonlit = 0
for f in files:
    data = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{f}'], capture_output=True, check=True).stdout
    try: text = data.decode('utf-8')
    except UnicodeDecodeError: continue
    for n, line in enumerate(text.split('\n'), 1):
        if re.search(r'\bchmod(Sync)?\s*\(', line) and not MODE.search(line):
            nonlit += 1; print(f'  NONLITERAL chmod {f}:{n} :: {line.strip()[:160]}')
print(f'chmod_calls_without_literal={nonlit}')
