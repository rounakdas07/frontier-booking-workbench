"""Download the two dated public NHS source releases. Uses standard library only."""
from pathlib import Path
import urllib.request
from prepare_data import SOURCES
root=Path(__file__).resolve().parents[1]/'data/raw';root.mkdir(exist_ok=True,parents=True)
for source in SOURCES:
 data=urllib.request.urlopen(source['url'],timeout=60).read()
 if b'ORGANISATION_CODE' not in data[:1000]:raise ValueError('Unexpected non-CSV response')
 (root/source['file']).write_bytes(data)
 print(source['file'],len(data),'bytes')
