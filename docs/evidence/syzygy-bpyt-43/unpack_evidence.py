"""Verify and extract retained evidence bytes; execute none. Usage: python3 unpack_evidence.py ARCHIVE.json.gz EMPTY-DIRECTORY"""
import base64,gzip,hashlib,json,sys
from pathlib import Path
archive,output=Path(sys.argv[1]),Path(sys.argv[2]);assert not output.exists();output.mkdir(parents=True)
record=json.loads(gzip.decompress(archive.read_bytes()));seen=set()
for row in record['files']:
 path=Path(row['path']);assert not path.is_absolute() and '..' not in path.parts and row['path'] not in seen;seen.add(row['path'])
 data=base64.b64decode(row['base64'],validate=True);assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256']
 destination=output/path;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(data)
print(f'verified and extracted {len(seen)} exact files; no code executed')
