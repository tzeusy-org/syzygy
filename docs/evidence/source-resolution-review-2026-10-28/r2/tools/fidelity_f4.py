"""Compare round 1's F4 code block (and N1/N10 lines) with scripts/clean_build.mjs at the head: print the unified diff, raw -> head."""
import difflib, re, sys
raw = open(sys.argv[1], encoding="utf-8").read()
sec = raw[raw.index("### F4"):raw.index("### F5")]
block = re.search(r"```js\n(.*?)```", sec, re.S).group(1)
block = "\n".join(l[2:] if l.startswith("  ") else l for l in block.split("\n"))
head = open(sys.argv[2], encoding="utf-8").read()
start = head.index("const built = new Set();"); end = head.index("for (const project of projects) visit(project);")
print("\n".join(difflib.unified_diff(block.strip().split("\n"), head[start:end].strip().split("\n"), "raw-F4", "head", lineterm="", n=0)))
