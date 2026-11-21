import hashlib,json,pathlib,subprocess,sys,threading,time
own=pathlib.Path(__file__).resolve().parent;root=own/'guard-private';stop=threading.Event();samples=[]
canaries=[root/'home/canary',root/'tmp/canary',root/'work/occupied/canary',root/'canary']
def snapshot():
 while not stop.is_set():
  row=[]
  for p in canaries:
   try:
    b=p.read_bytes();s=p.stat();row.append({'path':str(p.relative_to(root)),'sha256':hashlib.sha256(b).hexdigest(),'size':s.st_size,'inode':s.st_ino,'mode':s.st_mode,'uid':s.st_uid,'mtime_ns':s.st_mtime_ns})
   except FileNotFoundError:pass
  if len(row)==4:samples.append({'monotonic':time.monotonic(),'canaries':row})
  time.sleep(.001)
thread=threading.Thread(target=snapshot);thread.start()
command=[sys.executable,str(own/'observe.py'),'n13-guard-probe',str(own/'subject'),'strace','-f','-e','trace=execve','-o',str(own/'guard-exec.trace'),'python3','-I',str(own/'subject/docs/evidence/poc-fixture-leak-2026-10-22/guard_probe.py'),str(own/'subject'),str(own/'guard-probe.json'),str(root)]
r=subprocess.run(command);stop.set();thread.join();assert samples,'No independent complete canary snapshot'
base=samples[0]['canaries'];assert all(s['canaries']==base for s in samples),'Canary bytes/metadata changed'
record=json.loads((own/'guard-probe.json').read_text());tools=set(record['toolSha256']);assert len(tools)==5
assert len(record['head'])==30 and len(record['mutants'])==15 and len(record['wiring'])==5
assert all(r['holds'] and r['exit']!=0 and r['refused'] and r['canariesSurvive'] and not r['outputWritten'] for r in record['head'])
assert len({(r['tool'],r['case']) for r in record['head']})==30
assert all(r['killed'] for r in record['mutants']+record['wiring'])
trace=(own/'guard-exec.trace').read_text();unexpected=[line for line in trace.splitlines() if 'execve(' in line and ('vitest' in line or 'npx' in line or 'node' in line)]
assert not unexpected,unexpected
out={'observer':'independent outer polling process + kernel exec trace, separate from guard emitter','command':command,'probe_outer_exit':r.returncode,'complete_canary_snapshots':len(samples),'canaries_baseline':base,'every_complete_snapshot_bytes_and_metadata_equal':True,'first_monotonic':samples[0]['monotonic'],'last_monotonic':samples[-1]['monotonic'],'refusal_rows':len(record['head']),'predicate_rows':len(record['mutants']),'wiring_rows':len(record['wiring']),'measurement_or_test_execs':unexpected,'probe_parent_removed_after_probe':not root.exists(),'limitation':'Polling is not a per-row read; kernel exec trace independently covers launched processes. Existing peers may launch trusted git metadata queries before guard; new leak tool has separate subprocess-boundary refusal controls.'}
(own/'GUARD-OUTER-OBSERVATION.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out),flush=True)
raise SystemExit(r.returncode)
