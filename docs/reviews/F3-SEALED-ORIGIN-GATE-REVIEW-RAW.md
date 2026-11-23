PASS

[Observed] Reviewed faa64c2ea9e975fc8fbb1637cd095529e9d14f10 against 1e5822ca58ee7e8fb7ad53080dcbb06acaf6411b. Only the four immutable metadata derivations bypass the per-node wait/currentness calls. The six fresh paths, synchronous single-consumption, full subject/graph/history verification, and final ledger and bridge revalidation remain intact. The isolated regression passed and checked the fresh-node count plus one and refusal on that final ledger wait. No edits.
