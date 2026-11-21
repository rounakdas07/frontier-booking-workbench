import csv,hashlib,json,pathlib,sys,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from prepare_data import parse_value
class DataIntegrity(unittest.TestCase):
 def test_disclosure_parser(self):
  self.assertEqual(parse_value('*')['status'],'suppressed')
  self.assertIsNone(parse_value('')['value'])
  self.assertEqual(parse_value('0')['value'],0)
  with self.assertRaises(ValueError):parse_value('-1')
 def test_all_selected_records_match_original_provider_rows(self):
  data=json.loads((ROOT/'data/booking-data.json').read_text());count=0
  sources={}
  for src in data['meta']['sources']:
   path=ROOT/'data/raw'/src['file']
   if not path.exists():self.skipTest('Run scripts/fetch_data.py to check original source files')
   raw=path.read_bytes();self.assertEqual(hashlib.sha256(raw).hexdigest(),src['sha256'])
   with path.open(encoding='utf-8-sig',newline='') as f:sources[src['id']]=list(csv.DictReader(f))
   self.assertEqual(len(sources[src['id']]),src['rows'])
  for t in data['trusts']:
   self.assertEqual(len(t['code']),3)
   for year,cells in t['years'].items():
    for key,c in cells.items():
     r=sources[c['sourceId']][c['record']-2]
     self.assertEqual(r['GEOGRAPHY_LEVEL'],'03.Provider');self.assertEqual(r['ORGANISATION_CODE'],t['code']);self.assertIn('NHS',r['ORGANISATION_DESCRIPTION']);self.assertEqual(r['MEASURE_TYPE'],'Attendance Type');self.assertEqual(r['MEASURE'],c['measure']);self.assertEqual(r['MEASURE_VALUE'],c['raw']);self.assertEqual(parse_value(r['MEASURE_VALUE'])['value'],c['value']);count+=1
  self.assertEqual(count,data['meta']['selectedRows']);self.assertEqual(sum(len(v) for v in sources.values()),101351)
  self.assertEqual(sum(t['current'] for t in data['trusts']),148)
if __name__=='__main__':unittest.main()
