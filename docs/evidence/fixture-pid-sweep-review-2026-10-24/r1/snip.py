"""Print printable context around each occurrence of a needle in a binary file (read-only)."""
import re
import sys

path, needle, width = sys.argv[1], sys.argv[2].encode(), int(sys.argv[3])
data = open(path, 'rb').read()
start = 0
count = 0
while count < 6:
    at = data.find(needle, start)
    if at < 0:
        break
    chunk = data[max(0, at - width): at + width]
    print(f'--- offset {at}')
    print(re.sub(rb'[^\x20-\x7e]', b'.', chunk).decode())
    start = at + 1
    count += 1
