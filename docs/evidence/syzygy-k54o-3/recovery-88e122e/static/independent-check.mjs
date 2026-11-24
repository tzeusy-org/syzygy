import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const canonical=v=>JSON.stringify(v,(_,x)=>x && typeof x==='object' && !Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const read=p=>JSON.parse(fs.readFileSync(p));
const stopped=read('/home/orca/.tmp/url-composed-host-3361482-1795547454136/c3ce26a7782db922749f631e70d23422157f73ae0ecaddf8d5d43f3f06ee6905.cccccccccccccccccccccccccccccccc.stopped.json').record;
const core=read(stopped.run+'/run.json'),declaration=read(stopped.run+'/url-declaration.json'),pin=core.subject.pinnedRevision.commit;
const results=[];
for(const {key,metadata:m,derivation:d} of stopped.products.provenance.nodes){
 let checks=[];
 if(d.kind==='fixed'||d.kind==='renderer'){
  const p=declaration.plannedOrigins.find(p=>p.id===m.id);checks=[p.sha256===m.digest,canonical(p.classes)===canonical(m.classes),canonical(p.originIds)===canonical(m.originIds)];
 }else if(d.kind==='source-span'||d.kind==='source-whole'){
  const b=execFileSync('git',['-C',core.subject.clone.path,'show',`${pin}:${d.path}`]);
  const oid=createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
  let value=b,body,structure;
  if(d.kind==='source-span'){
   const lines=b.toString().match(/[^\n]*(?:\n|$)/gu)||[];if(lines.at(-1)==='')lines.pop();value=Buffer.from(lines.slice(d.offset,d.offset+d.limit).join(''));
   body='origin:body-'+hash(canonical([pin,d.path,oid,d.offset,d.limit])).slice(0,32);
   structure='origin:structure-'+hash(canonical({commit:pin,path:d.path,objectId:oid,offset:d.offset,limit:d.limit})).slice(0,32);
  }else{
   body='origin:whole-body-'+hash(canonical([d.path,oid,hash(b)])).slice(0,32);
   structure='origin:whole-structure-'+hash(canonical({commit:pin,path:d.path,objectId:oid,start:0,end:b.length})).slice(0,32);
  }
  checks=[oid===d.objectId,hash(value)===m.digest,value.length===m.bytes,canonical([body,structure].sort())===canonical(m.originIds),canonical(['code-structure',d.path.endsWith('.c')?'code-content':'project-documentation'].sort())===canonical(m.classes)];
 }else if(d.kind==='source-manifest-remainder'){
  const value=canonical({files:3,secretPathsLeftOut:0,candidates:0,notCandidates:3,places:[{place:null,files:1,notCandidates:1},{place:'docs',files:1,notCandidates:1},{place:'src',files:1,notCandidates:1}],placesNotListed:0,filesInPlacesNotListed:0,notCandidatesInPlacesNotListed:0});
  checks=[hash(value)===m.digest,Buffer.byteLength(value)===m.bytes,'origin:manifest-remainder-'+hash(canonical([pin,core.subject.screeningPolicy.sha256,hash(value)])).slice(0,32)===m.id];
 }
 if(checks.length)results.push({node:key,checked:checks.length,match:checks.every(Boolean)});
}
const output={method:'Independent Node canonical encoder and Git blob-header SHA-1; no receipt/authority calls',population:results.length,results,allMatch:results.every(x=>x.match)};
fs.writeFileSync('/home/orca/.tmp/f3-native-admission-fixes/native88e-static/independent-check.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({population:output.population,allMatch:output.allMatch}));
