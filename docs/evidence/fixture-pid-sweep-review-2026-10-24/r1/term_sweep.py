"""Second method for the SIGTERM absence: every file in the evidence directory, case-insensitive 'sigterm' or 'term' signal tokens."""
import pathlib
import re
import sys

root = pathlib.Path(sys.argv[1])
files = sorted(p for p in root.iterdir() if p.is_file())
pattern = re.compile(r'sigterm|\bTERM\b|signal\.SIGTERM|15\)', re.I)
hits = {p.name: len(pattern.findall(p.read_text())) for p in files}
print('files', len(files))
print('files with a hit', {k: v for k, v in hits.items() if v})
