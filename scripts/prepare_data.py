"""Prepare a source-preserving, disclosure-aware outpatient booking dataset."""
import csv,datetime,hashlib,io,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
SOURCES=[
 {'id':'hes2425','year':'2024-25','period':'1 April 2024–31 March 2025','file':'outpatients-2024-25.csv','url':'https://files.digital.nhs.uk/14/39519A/hosp-epis-stat-outp-pla-2024-25-tab.csv','page':'https://digital.nhs.uk/data-and-information/publications/statistical/hospital-outpatient-activity/2024-25','published':'2025-09-25'},
 {'id':'hes2526','year':'2025-26','period':'1 April 2025–31 March 2026','file':'outpatients-2025-26.csv','url':'https://files.digital.nhs.uk/5D/654D5E/hosp-epis-stat-outp-pla-2025-26-tab.csv','page':'https://digital.nhs.uk/data-and-information/publications/statistical/hospital-outpatient-activity/2025-26','published':'2026-09-24'}
]
FIRST_CODES=['01','02','06','07','11','12','16','17']

def parse_value(raw):
 raw=raw.strip()
 if raw=='*':return {'value':None,'status':'suppressed','raw':raw}
 if raw=='':return {'value':None,'status':'missing','raw':raw}
 n=float(raw)
 if not n.is_integer() or n<0:raise ValueError('Unexpected count: '+raw)
 return {'value':int(n),'status':'reported','raw':raw}

def main():
 trusts={};national={};extract=[];seen=set();raw_count=0;provider_count=0
 for src in SOURCES:
  path=DATA/'raw'/src['file'];raw=path.read_bytes()
  rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
  src.update({'rows':len(rows),'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'retrievedAt':datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat()})
  raw_count+=len(rows)
  provider_count+=sum(r['GEOGRAPHY_LEVEL']=='03.Provider' for r in rows)
  for line,r in enumerate(rows,2):
   if r['MEASURE_TYPE']!='Attendance Type':continue
   code=r['ORGANISATION_CODE'];name=r['ORGANISATION_DESCRIPTION'];key=r['MEASURE'][:2]
   if r['GEOGRAPHY_LEVEL']=='01.National':
    national.setdefault(src['year'],{})[key]={'measure':r['MEASURE'],**parse_value(r['MEASURE_VALUE']),'sourceId':src['id'],'record':line};continue
   # Never combine site rows with trust-level records, or add independent providers.
   if r['GEOGRAPHY_LEVEL']!='03.Provider' or not re.fullmatch(r'[A-Z0-9]{3}',code) or 'NHS' not in name:continue
   identity=(src['year'],code,key)
   if identity in seen:raise ValueError('Duplicate '+str(identity))
   seen.add(identity)
   rec={'measure':r['MEASURE'],**parse_value(r['MEASURE_VALUE']),'sourceId':src['id'],'record':line}
   t=trusts.setdefault(code,{'code':code,'name':name.title().replace('Nhs','NHS').replace("'S","'s").replace(' And ',' and ').replace(' Of ',' of '),'years':{}})
   t['name']=name.title().replace('Nhs','NHS').replace("'S","'s").replace(' And ',' and ').replace(' Of ',' of ')
   t['years'].setdefault(src['year'],{})[key]=rec
   extract.append({'year':src['year'],'code':code,'name':name,'measure':r['MEASURE'],'value':r['MEASURE_VALUE'],'sourceId':src['id'],'record':line,'url':src['url']})
  
 for t in trusts.values():
  t['current']=bool(t['years'].get('2025-26'))
  t['relationship']={'status':'unverified','text':'No Frontier relationship verified in this research.'}
  if t['code']=='RXC':t['relationship']={'status':'known','text':'East Sussex is a published Juno deployment. Keep it separate from new prospects.','url':'https://www.frontierhealth.ai/case-studies/why-east-sussex-healthcare-nhs-trust-chose-frontier-health'}
  t['evidence']=None
 research_path=DATA/'trust-research.json'
 if research_path.exists():
  research=json.loads(research_path.read_text())
  for code,details in research.items():
   if code in trusts:trusts[code].update(details)
 meta={'builtAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'retrievedAt':max(s['retrievedAt'] for s in SOURCES),'sources':SOURCES,'rawRows':raw_count,'providerRows':provider_count,'selectedRows':len(extract),'currentTrusts':sum(t['current'] for t in trusts.values()),'trustsAcrossYears':len(trusts),'years':['2024-25','2025-26'],'firstCodes':FIRST_CODES,'rounding':'Provider counts rounded to nearest five. Suppressed or absent cells remain unavailable.','scope':'NHS provider rows with three-character ODS codes and NHS in their published name. First appointments, including tele consultations.','methodologyUrl':'https://digital.nhs.uk/data-and-information/publications/statistical/hospital-outpatient-activity/2025-26/about-this-publication','disclosureUrl':'https://digital.nhs.uk/data-and-information/data-tools-and-services/data-services/hospital-episode-statistics/disclosure-control-methodology-for-hospital-episode-statistics-and-emergency-care-data-set','metadataUrl':'https://files.digital.nhs.uk/15/578BB6/hosp-epis-stat-outp-meta-2025-26-tab.xlsx'}
 (DATA/'manifest.json').write_text(json.dumps(meta,indent=2))
 (DATA/'booking-data.json').write_text(json.dumps({'meta':meta,'national':national,'trusts':sorted(trusts.values(),key=lambda t:t['name'])},ensure_ascii=False,separators=(',',':')))
 with (DATA/'source-records.csv').open('w',newline='') as f:
  writer=csv.DictWriter(f,fieldnames=list(extract[0]));writer.writeheader();writer.writerows(extract)
 print({k:meta[k] for k in ['rawRows','providerRows','selectedRows','currentTrusts','trustsAcrossYears']})
if __name__=='__main__':main()
