"""Exact-source Village Works integration. Check every file before writing any changes."""
from pathlib import Path
from hashlib import sha256
import json
ready={}
for source in sorted(Path('tools').glob('works_patch*.json')):
    for name,(base,target,changes) in json.loads(source.read_text()).items():
        path=Path(name);text=path.read_text();digest=sha256(text.encode()).hexdigest()
        if digest==target: continue
        if digest!=base: raise RuntimeError(f"Unexpected source revision for {name}; no files changed.")
        for start,end,content in reversed(changes): text=text[:start]+content+text[end:]
        if sha256(text.encode()).hexdigest()!=target: raise RuntimeError(f"Patch verification failed for {name}")
        ready[path]=text
for path,text in ready.items(): path.write_text(text)
print(f"Village Works integrated: {len(ready)} source files.")
