import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from '/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-bpyt.58/node_modules/typescript/lib/typescript.js';
const base='740279435178a882f1c2d526a2a7ea0bf2b52cbc',head='0db4d7b9d2a02966cfbbf1da696cd8979f2c7e45';
const hash=(value)=>createHash('sha256').update(value).digest('hex');
const paths=['packages/polaris-generation-core/src/workspace-reach.testkit.ts','packages/polaris-generation-core/src/island-boundary.test.ts','packages/polaris-dossier/src/subpath-imports.test.ts','packages/polaris-dossier/src/no-egress.test.ts','vitest.tiers.ts','package.json','package-lock.json'];
const rows=paths.map(path=>{
 const old=execFileSync('git',['show',base+':'+path],{encoding:'utf8'}),next=fs.readFileSync(path,'utf8');
 const emit=(text)=>ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
 return {path,base_sha256:hash(old),head_sha256:hash(next),bytes_unchanged:old===next,executable_emission_unchanged:emit(old)===emit(next),base_emission_sha256:hash(emit(old)),head_emission_sha256:hash(emit(next))};
});
console.log(JSON.stringify({base,head,rows,all_executable_unchanged:rows.every(row=>row.executable_emission_unchanged)},null,2));
if(!rows.every(row=>row.executable_emission_unchanged))process.exitCode=1;
