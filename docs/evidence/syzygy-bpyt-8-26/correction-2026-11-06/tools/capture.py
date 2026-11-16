import sys,subprocess,pathlib,json,datetime,hashlib,time
own=pathlib.Path(__file__).resolve().parent
name,cwd,*args=sys.argv[1:]
record={"name":name,"startedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"cwd":cwd,"argv":args,"head":subprocess.check_output(["git","rev-parse","HEAD"],cwd=cwd,text=True).strip()}
stdout=own/"logs"/(name+".stdout");stderr=own/"logs"/(name+".stderr");receipt=own/"logs"/(name+".json")
assert not any(p.exists() for p in [stdout,stderr,receipt]),"output collision"
with (own/"ATTEMPTS.jsonl").open("a") as stream:stream.write(json.dumps({**record,"state":"starting"})+"\n")
tick=time.monotonic()
with stdout.open("xb") as out,stderr.open("xb") as err:
 record["exitCode"]=subprocess.call([sys.executable,str(own/"isolated.py"),cwd,*args],stdout=out,stderr=err)
record["finishedAt"]=datetime.datetime.now(datetime.timezone.utc).isoformat();record["elapsedSeconds"]=time.monotonic()-tick
record["streams"]={p.name:{"bytes":p.stat().st_size,"sha256":hashlib.sha256(p.read_bytes()).hexdigest()}for p in [stdout,stderr]}
with receipt.open("x") as stream:stream.write(json.dumps(record,indent=2)+"\n")
with (own/"ATTEMPTS.jsonl").open("a") as stream:stream.write(json.dumps({**record,"state":"finished"})+"\n")
print(json.dumps(record));raise SystemExit(record["exitCode"])
