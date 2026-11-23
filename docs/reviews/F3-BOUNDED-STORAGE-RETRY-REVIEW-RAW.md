PASS

[Observed] In `dc61f9a94e59dbc1dd0041caa04e6db8f71e3f0a`, both direct and recursive disappearances check the remaining settled results in each enclosing batch before allowing a retry. The census preserves ordered byte-limit enforcement, allows at most two full restarts, and shares the original monotonic deadline and cumulative entry budget across attempts. [Census implementation](/home/orca/.tmp/f3-storage-diagnosis.9RJJ9gY8/w/packages/polaris-dossier/src/session-launch.ts:278)

[Observed] The isolated native fixture exercises a real nested `ENOENT` and a synthetic sibling `EACCES` on the second walk. It asserts both faults, storage refusal, and exactly two walks. This was a source-only review. [Native fixture](/home/orca/.tmp/f3-storage-diagnosis.9RJJ9gY8/w/packages/polaris-dossier/src/session-launch.test.ts:1169)
