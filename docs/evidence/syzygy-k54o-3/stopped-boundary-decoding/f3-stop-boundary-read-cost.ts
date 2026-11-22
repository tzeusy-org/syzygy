import * as fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readUrlStoppedBoundary } from '/home/orca/.tmp/syzygy-beads-looper-20261114-54ebc9f1/d10-f3-work-budget/packages/polaris-dossier/src/url-stopped-run.ts';
const cut = JSON.parse(fs.readFileSync('/home/orca/.tmp/f3-render-phase-cut.json','utf8'));
const root = path.dirname(path.dirname(cut.hidden));
const key = createHash('sha256').update(cut.run).digest('hex');
const name = fs.readdirSync(root).find(value => value.startsWith(key+'.') && value.endsWith('.stopped.json'));
if (!name) throw Error('no retained slot');
const retainedBytes=fs.readFileSync(path.join(root,name));
const boundary=JSON.parse(retainedBytes.toString()).record;
const expected=Object.fromEntries(['run','runId','generation','coreSha256','declarationSha256','sourcePin','deadline'].map(key=>[key,boundary[key]]));
const flags=fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK;
const sameIdentity=(a:fs.BigIntStats,b:fs.BigIntStats)=>a.dev===b.dev&&a.ino===b.ino&&a.uid===b.uid&&a.mode===b.mode;
const sameSlot=(a:fs.BigIntStats,b:fs.BigIntStats)=>sameIdentity(a,b)&&a.nlink===b.nlink&&a.size===b.size&&a.mtimeNs===b.mtimeNs&&a.ctimeNs===b.ctimeNs;
const checkedRoot=(fd:number,before:fs.BigIntStats)=>before.isDirectory()&&before.uid===BigInt(process.getuid!())&&(before.mode&0o077n)===0n&&sameIdentity(before,fs.fstatSync(fd,{bigint:true}))&&sameIdentity(before,fs.lstatSync(root,{bigint:true}))&&fs.realpathSync(root)===root;
function freshBytesEqual() {
 const now=Date.now();
 if(!Number.isSafeInteger(now)||boundary.stoppedAt>now||now>=boundary.deadline||fs.realpathSync(root)!==root||fs.realpathSync(cut.run)!==cut.run)return false;
 const rootFd=fs.openSync(root,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|flags);
 try{
  const rootStat=fs.fstatSync(rootFd,{bigint:true});if(!checkedRoot(rootFd,rootStat))return false;
  const slot=`/proc/self/fd/${rootFd}/${name}`,fd=fs.openSync(slot,fs.constants.O_RDONLY|flags);
  try{
   const before=fs.fstatSync(fd,{bigint:true});
   if(!before.isFile()||before.uid!==rootStat.uid||before.nlink!==1n||(before.mode&0o7777n)!==0o600n||before.size<=0n||before.size>4194304n)return false;
   const bytes=Buffer.alloc(Number(before.size)+1);let length=0;
   while(length<bytes.length){const count=fs.readSync(fd,bytes,length,bytes.length-length,length);if(count===0)break;length+=count;}
   if(length!==Number(before.size)||bytes[length-1]!==10)return false;
   const equal=retainedBytes.equals(bytes.subarray(0,length));
   return equal&&sameSlot(before,fs.fstatSync(fd,{bigint:true}))&&sameSlot(before,fs.lstatSync(slot,{bigint:true}))&&checkedRoot(rootFd,rootStat);
  }finally{fs.closeSync(fd);}
 }finally{fs.closeSync(rootFd);}
}
const result:any={purpose:'ungranted pure retained-boundary component timing; no claim or effect authority',slotBytes:retainedBytes.length,asOf:Date.now(),samples:[]};
for(const variant of ['full-parse','fresh-exact-bytes']){
 const times:number[]=[];let accepted=0;
 for(let i=0;i<22;i++){const began=performance.now();const ok=variant==='full-parse'?readUrlStoppedBoundary(root,expected as any,Date.now())!==null:freshBytesEqual();const elapsed=performance.now()-began;if(i>=2){times.push(elapsed);if(ok)accepted++;}}
 result.samples.push({variant,count:times.length,accepted,minMs:Math.min(...times),maxMs:Math.max(...times),meanMs:times.reduce((a,b)=>a+b,0)/times.length,totalMs:times.reduce((a,b)=>a+b,0)});
}
fs.writeFileSync('/home/orca/.tmp/f3-stop-boundary-read-cost-result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
