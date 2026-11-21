import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {metrics,sumCells,scenario,selectTrusts,csvCell,exportCSV,pilotBrief} from '../core.mjs';
const data=JSON.parse(readFileSync(new URL('../data/booking-data.json',import.meta.url)));
const rwe=data.trusts.find(t=>t.code==='RWE');
const reported=value=>({status:'reported',value});
test('Leicester baseline uses first and first tele only, with correct comparison',()=>{
 const m=metrics(rwe,'hospital');assert.equal(m.current.value,80540);assert.equal(m.previous.value,85475);assert.equal(m.delta,-4935);
 assert.deepEqual(m.current.cells.map(c=>c.value),[76065,4475]);
 assert.equal(m.denominator.value,['01','02','06','07','11','12','16','17'].reduce((n,k)=>n+rwe.years['2025-26'][k].value,0));
});
test('suppression and absent rows remain unknown while reported zero remains zero',()=>{
 for(const cell of [undefined,{status:'suppressed',value:null},{status:'missing',value:null}]){
  const t={years:{'2025-26':{'16':reported(25),'17':cell}}};assert.equal(sumCells(t,'2025-26',['16','17']).value,null);
 }
 assert.equal(sumCells({years:{'2025-26':{'16':reported(0),'17':reported(0)}}},'2025-26',['16','17']).value,0);
});
test('workflow cohorts use their own source categories',()=>{
 for(const [w,keys] of [['dna',['06','07']],['patient',['11','12']]])assert.equal(metrics(rwe,w).current.value,keys.reduce((n,k)=>n+rwe.years['2025-26'][k].value,0));
});
test('missing prior-year and zero prior-year avoid invented growth',()=>{
 const t={years:{'2025-26':{'16':reported(10),'17':reported(0)}}};assert.equal(metrics(t).delta,null);
 t.years['2024-25']={'16':reported(0),'17':reported(0)};assert.equal(metrics(t).delta,10);assert.equal(metrics(t).change,null);
});
test('finder excludes historical-only trusts and known Frontier deployment by default',()=>{
 const rows=selectTrusts(data);assert.ok(rows.length>50);assert.ok(rows.every(t=>t.current&&t.code!=='RXC'&&t.metrics.current.value>=5000));
 assert.equal(selectTrusts(data,{query:'RXC',minimum:0,hideKnown:false,includeMissing:true})[0].code,'RXC');
 assert.equal(selectTrusts(data,{query:'RWE'})[0].code,'RWE');
 const missing=selectTrusts(data,{minimum:0,includeMissing:true,hideKnown:false});assert.equal(missing.length,148);
});
test('scope uses unrounded annual rate and requires supplied time inputs',()=>{
 const s=scenario(80540,{weeks:8,scope:5});assert.ok(Math.abs(s.cases-619.5384615384615)<1e-9);assert.equal(Math.round(s.cases),620);assert.equal(s.hours,null);
 const times=scenario(80540,{weeks:8,scope:5,before:10,after:4});assert.ok(Math.abs(times.hours-61.95384615384615)<1e-9);
 assert.equal(scenario(80540,{weeks:8,scope:0,before:0,after:0}).hours,0);
 assert.ok(scenario(80540,{weeks:8,scope:5,before:4,after:10}).hours<0);
 assert.equal(scenario(null,{weeks:8,scope:5}).cases,null);
 for(const inputs of [{weeks:0,scope:5},{weeks:53,scope:5},{weeks:1.5,scope:5},{weeks:8,scope:101},{weeks:'',scope:5}])assert.equal(scenario(80540,inputs).valid,false);
});
test('CSV is formula-safe and carries provenance and missing values',()=>{
 assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('A "B"'),'"A ""B"""');assert.equal(csvCell(null),'""');
 const csv=exportCSV(data,selectTrusts(data,{query:'RWE'}),'hospital');assert.ok(csv.includes('80540'));assert.ok(csv.includes('85475'));assert.ok(csv.includes(data.meta.sources[1].url));assert.ok(csv.includes('not patients or open work items'));
});
test('brief preserves local evidence, incumbent sources, assumptions and staff review',()=>{
 const brief=pilotBrief(data,rwe,'hospital',{weeks:8,scope:5,before:'',after:''});
 for(const text of ['80,540','85,475','620 event records','No staff-time estimate','Dedalus','https://otua.co.uk/case-study','staff approval','PUBLIC ENQUIRY ROUTE','not an explanation of all hospital-cancelled first appointments'])assert.ok(brief.includes(text),text);
});
