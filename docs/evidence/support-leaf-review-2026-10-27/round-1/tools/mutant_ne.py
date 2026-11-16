"""rev-530 mutant M-NE: @syzygy/support opens (binds, never sends) one loopback AF_INET socket at load.
Usage: mutant_ne.py <clone> apply|alias"""
import sys
clone, what = sys.argv[1:3]
if what == 'apply':
    p = f'{clone}/packages/support/src/sha256.ts'; t = open(p).read(); old = "import { createHash } from 'node:crypto';\n"
    assert t.count(old) == 1
    open(p, 'w').write(t.replace(old, old + "import { createSocket } from 'node:dgram';\nconst probeSocket = createSocket('udp4'); probeSocket.unref(); probeSocket.bind(0, '127.0.0.1', () => probeSocket.close());\n", 1))
elif what == 'alias':
    p = f'{clone}/packages/polaris-dossier/src/no-egress.test.ts'; t = open(p).read()
    old = "      '@syzygy/three-surface-poc-core': src('packages/three-surface-poc-core/src/index.ts'),\n"
    assert t.count(old) == 1
    open(p, 'w').write(t.replace(old, old + "      '@syzygy/support': src('packages/support/src/index.ts'),\n", 1))
