import json,subprocess,sys,os
os.chdir('/tmp/r652/head')
T='packages/polaris-dossier/src/execution-choice.ts'
TEST='packages/polaris-dossier/src/execution-choice.test.ts'
orig=open(T,encoding='utf-8').read()
L="  if (marker === 'launched') {\n    return refuse('launched', 'this run was launched by `syzygy polaris`, and Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9); a launched run executes nothing');\n  }\n"
U="  if (marker === 'unreadable') {\n    return refuse('launched', 'this run\\'s launched marker is present but cannot be read as the one `syzygy polaris` writes, so the run is treated as launched: Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9)');\n  }\n"
READ="  const marker = launchedMarkerState(run);\n"
assert orig.count(L)==1 and orig.count(U)==1 and orig.count(READ)==1
CH="  const choice: StoredExecutionChoice = {\n"
BLOCK=READ+L+U
muts=[]
# R1 move the whole check to just before the write
m=orig.replace(BLOCK,'',1); assert m.count(CH)==1; m=m.replace(CH,BLOCK+CH,1); muts.append(('R1-check-before-write',BLOCK+'(at its place) and '+CH,'(removed) and '+BLOCK+CH,m))
# R2 launched arm gives the unreadable reason
L2=L.replace("'this run was launched by `syzygy polaris`, and Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9); a launched run executes nothing'","'this run\\'s launched marker is present but cannot be read as the one `syzygy polaris` writes, so the run is treated as launched: Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9)'")
muts.append(('R2-launched-reason-swapped',L,L2,orig.replace(L,L2,1)))
# R3 launched refusals carry no disclosures (the CLI's old shape)
L3="  if (marker === 'launched') {\n    return { ok: false, refusal: { command: 'allow-execution', outcome: 'refused', stage: 'launched', reason: 'this run was launched by `syzygy polaris`, and Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9); a launched run executes nothing' } } as AllowExecutionResult;\n  }\n"
muts.append(('R3-launched-without-disclosures',L,L3,orig.replace(L,L3,1)))
# R4 marker read from the parent directory
R4=READ.replace('(run)','(path.dirname(run))')
muts.append(('R4-wrong-directory',READ,R4,orig.replace(READ,R4,1)))
# R5 unreadable arm refuses at stage run
U5=U.replace("refuse('launched'","refuse('run'")
muts.append(('R5-unreadable-stage-run',U,U5,orig.replace(U,U5,1)))
# R6 unreadable arm falls through to the launched reason (merged arms)
L6=L.replace("marker === 'launched'","marker !== 'absent'")
m6=orig.replace(L,L6,1).replace(U,'',1)
muts.append(('R6-arms-merged',L+U,L6,m6))
# R7 marker checked only after the reverify await (after run name)
RV="  const checked = await reverifyPinnedRevision("
m7=orig.replace(BLOCK,'',1); assert m7.count(RV)==1; m7=m7.replace(RV,BLOCK+RV,1)
muts.append(('R7-check-after-run-name-before-reverify',BLOCK+'(at its place) and '+RV,'(removed) and '+BLOCK+RV,m7))
commit=subprocess.run(['git','rev-parse','HEAD'],capture_output=True,text=True).stdout.strip()
res=[]
for ident,old,new,mut in muts:
    assert mut!=orig
    open(T,'w',encoding='utf-8').write(mut)
    try: r=subprocess.run(['npx','vitest','run','--project','unit',TEST],capture_output=True,text=True)
    finally: open(T,'w',encoding='utf-8').write(orig)
    failed=[l.strip() for l in r.stdout.splitlines() if l.strip().startswith('×')]
    summary=[l.strip() for l in r.stdout.splitlines() if 'Tests ' in l]
    res.append({'id':ident,'old':old,'new':new,'exit':r.returncode,'killed':r.returncode!=0,'failed':len(failed),'failedTests':failed,'summary':summary})
    print(ident,r.returncode,len(failed),summary)
assert open(T,encoding='utf-8').read()==orig
json.dump({'commit':commit,'subject':T,'test':TEST,'mutants':res},open('/tmp/r652/tools/mutants.json','w'),indent=1)
