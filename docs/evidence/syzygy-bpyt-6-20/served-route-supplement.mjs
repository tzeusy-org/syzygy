// Supplemental operator verification: exact frozen bundles and synthetic route requests only.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
// Usage: node <this-file> <differential-bundle-dir> <output-dir> [exact-head]
const bundles=resolve(process.argv[2]);
const artifact=resolve(process.argv[3]);mkdirSync(artifact,{recursive:true});
const sha=x=>createHash('sha256').update(x).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const baseline='f5487c186626513724e1eff28a2789a4d78c154c';
const head=process.argv[4]??git('rev-parse','HEAD');
if(git('rev-parse','HEAD')!==head||git('status','--porcelain=v1')!=='')throw new Error('subject not frozen/clean');
const manifest=JSON.parse(readFileSync(join(bundles,'bundle-source-manifest.json'),'utf8'));
let checkedSourceRows=0;
for(const side of ['old','new'])for(const row of manifest[side]){
 const bytes=side==='old'?execFileSync('git',['show',`${baseline}:${row.path}`],{maxBuffer:16*1024*1024}):readFileSync(row.path);
 if(sha(bytes)!==row.sha256)throw new Error(`bundle source differs ${side}/${row.path}`);
 checkedSourceRows++;
}
const old=await import(pathToFileURL(join(bundles,'old.mjs')));
const next=await import(pathToFileURL(join(bundles,'new.mjs')));
const fixtureRepo=old.fixtureRepoWithGit([]);const results=[];
const observedAt='2026-11-03T06:58:26Z';
for(const authorityName of ['admitted','refused'])for(const corpus of ['normal','secret','baseline-spec'])for(const [requestName,headers] of [
 ['loopback-host',{host:'127.0.0.1:7478'}],
 ['loopback-origin',{host:'localhost:7478',origin:'http://localhost:7478'}],
 ['tailnet-origin',{host:'tzeusy.parrot-hen.ts.net',origin:'https://tzeusy.parrot-hen.ts.net'}],
]){
 const name=`${authorityName}-${corpus}-${requestName}`;const sides={};const bodies={};
 for(const [label,m] of [['old',old],['new',next]]){
  const texts=corpus==='secret'?old.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET:corpus==='baseline-spec'?old.PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC:old.PROJECT_SHAPE_FIXTURE_TEXTS;
  const authority=authorityName==='admitted'?old.ADMITTING_AUTHORITY:old.REJECTING_AUTHORITY;
  const calls=[];const run=m.projectShapeFixtureGit(texts);
  const model=m.buildFixtureModel([],{fixtureRepo,evaluationAsOf:observedAt,projectShape:{authority,runGit:args=>{calls.push(args);return run(args);}}});
  const routes=m.pocRoutes(()=>model);bodies[label]=[];
  const served=['/polaris','/trajectory','/orrery','/api/poc'].map(path=>{
   const route=routes.find(r=>r.path===path);const answer=route.handle({request:{method:'GET',path,query:new URLSearchParams(),headers}});
   const human=path!=='/api/poc';if(answer.status!==200||!answer.contentType.startsWith(human?'text/html':'application/json'))throw new Error(`successful route did not execute ${name}/${label}/${path}: ${answer.status} ${answer.contentType}`);
   const bytes=Buffer.from(answer.body);bodies[label].push(bytes);const file=`${name}-${label}-${path.slice(1).replaceAll('/','-')}.${human?'html':'json'}`;writeFileSync(join(artifact,file),bytes);
   return{path,status:answer.status,contentType:answer.contentType,type:typeof answer.body,bytes:bytes.length,sha256:sha(bytes),bodyFile:file};
  });
  sides[label]={served:served.map(({bodyFile,...record})=>record),bodyFiles:served.map(r=>r.bodyFile),modelSha256:sha(JSON.stringify(model)),responseIdentity:m.buildResponseIdentity(model),calls};
 }
 const {bodyFiles:oldBodyFiles,...a}=sides.old;const {bodyFiles:newBodyFiles,...b}=sides.new;
 const bytesEqual=bodies.old.every((bytes,i)=>bytes.equals(bodies.new[i]));const equal=bytesEqual&&JSON.stringify(a)===JSON.stringify(b);
 results.push({name,headers,old:sides.old,new:sides.new,directByteEquality:bytesEqual,equal});
}
if(git('rev-parse','HEAD')!==head||git('status','--porcelain=v1')!=='')throw new Error('subject changed');
const record={baseline,head,sourceRowDenominator:checkedSourceRows,inputs:{observedAt,authorityFixtures:['ADMITTING_AUTHORITY','REJECTING_AUTHORITY'],corpusFixtures:['PROJECT_SHAPE_FIXTURE_TEXTS','PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET','PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC'],fixtureRepo:'fixtureRepoWithGit([])'},node:process.version,harnessSha256:sha(readFileSync(import.meta.filename)),frozenBundleManifestSha256:sha(readFileSync(join(bundles,'bundle-source-manifest.json'))),bundles:{old:sha(readFileSync(join(bundles,'old.mjs'))),new:sha(readFileSync(join(bundles,'new.mjs')))},cases:results.length,routePairDenominator:results.length*4,humanRoutePairDenominator:results.length*3,machineRoutePairDenominator:results.length,differences:results.filter(r=>!r.equal).map(r=>r.name),results};
writeFileSync(join(artifact,'results.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({head,cases:record.cases,routePairs:record.routePairDenominator,humanPairs:record.humanRoutePairDenominator,machinePairs:record.machineRoutePairDenominator,differences:record.differences.length}));
if(record.differences.length)process.exitCode=1;
