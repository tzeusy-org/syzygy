PASS

The complete private state read remains inside the five-second lease and receives fresh asynchronous authority checks before and after I/O. A refused post-read check prevents the client files from opening. Named-root identity, physical file, state and archive validation, and effect and publication checks remain in force. This satisfies the relevant A-14 and A-115 boundaries. packages/polaris-dossier/src/url-machine-store.ts:437

The regression asserts the exact retired canonical bytes, head, audit, and projection at 4,800 ms. By inspection, the parent reaches 5,200 ms and refuses. The adjacent withdrawal test checks that the canonical client file stays unopened when authority is lost during the state read. packages/polaris-dossier/src/url-machine-store.test.ts:403

Reviewed exact commit `9da66128c41ca72cbdb6e7dc9c8e0dee0e146696` by source inspection.
