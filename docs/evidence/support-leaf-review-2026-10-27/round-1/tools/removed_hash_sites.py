"""Independent reviewer tool (rev-530): every createHash chain on a removed diff line,
with its algorithm, update arguments and digest encoding. Usage: removed_hash_sites.py <base> <head> <repo>"""
import re, subprocess, sys, json
base, head, repo = sys.argv[1:4]
diff = subprocess.run(['git', '-C', repo, 'diff', '-U0', base, head, '--', '*.ts'], capture_output=True, text=True, check=True).stdout
rows = []; f = None
for line in diff.split('\n'):
    if line.startswith('+++ '): f = line[6:]; continue
    if line.startswith('--- '): continue
    if line.startswith('-') and 'createHash' in line:
        code = line[1:]
        if re.search(r"import\s*\{[^}]*createHash", code): rows.append({'file': f, 'kind': 'import', 'text': code.strip()}); continue
        # balanced-paren scan of each createHash( ... ) chain
        for m in re.finditer(r"createHash\(", code):
            i = m.end(); depth = 1; j = i
            while j < len(code) and depth: depth += {'(':1, ')':-1}.get(code[j], 0); j += 1
            alg = code[i:j-1]
            calls = []; k = j
            while True:
                mm = re.match(r"\s*\.(\w+)\(", code[k:])
                if not mm: break
                s = k + mm.end(); depth = 1; t = s
                while t < len(code) and depth: depth += {'(':1, ')':-1}.get(code[t], 0); t += 1
                calls.append((mm.group(1), code[s:t-1])); k = t
            rows.append({'file': f, 'kind': 'chain', 'alg': alg, 'calls': calls, 'complete': bool(calls) and calls[-1][0] == 'digest', 'text': code.strip()[:200]})
for r in rows:
    if r['kind'] == 'chain':
        updates = [a for n, a in r['calls'] if n == 'update']
        enc2 = []
        for a in updates:
            # split top-level comma
            depth = 0; parts = ['']
            for ch in a:
                if ch in '([{': depth += 1
                if ch in ')]}': depth -= 1
                if ch == ',' and depth == 0: parts.append('')
                else: parts[-1] += ch
            enc2.append([p.strip() for p in parts])
        r['updates'] = enc2
        r['digestArg'] = [a for n, a in r['calls'] if n == 'digest']
print(json.dumps(rows, indent=1))
