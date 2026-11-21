import {workflows,metrics,selectTrusts,scenario,fmt,exportCSV,pilotBrief} from './core.mjs';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=(url,label)=>`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
const date=v=>v?new Date(v+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'';
const state={code:'RWE',workflow:'hospital',weeks:'8',scope:'5',before:'',after:''};
let data,rows=[],page=0,toastTimer;
const pageSize=8;
const active=()=>data.trusts.find(t=>t.code===state.code);
const src=(label,extra='')=>`<button data-source ${extra}>${label}</button>`;
const change=m=>m.delta===null?'Previous-year comparison unavailable':m.delta===0?'No change in reported counts':`${fmt(Math.abs(m.delta))} ${m.delta<0?'fewer':'more'} recorded than 2024/25${m.change===null?'':` (${m.change>0?'+':''}${fmt(m.change*100,1)}%)`}`;
function restore(){
 Object.assign(state,{code:'RWE',workflow:'hospital',weeks:'8',scope:'5',before:'',after:''});
 $('#time-inputs').hidden=true;$('#time-toggle').setAttribute('aria-expanded','false');
 const p=new URLSearchParams(location.hash.slice(1));
 if(data.trusts.some(t=>t.current&&t.code===p.get('trust')))state.code=p.get('trust');
 if(Object.hasOwn(workflows,p.get('workflow')))state.workflow=p.get('workflow');
 for(const [k,min,max] of [['weeks',1,52],['scope',0,100],['before',0,240],['after',0,240]]){
  const v=p.get(k);if(v!==null&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=min&&Number(v)<=max&&(k!=='weeks'||Number.isInteger(Number(v))))state[k]=v;
 }
 for(const k of ['weeks','scope','before','after'])$('#'+k).value=state[k];
 if(state.before!==''||state.after!==''){$('#time-inputs').hidden=false;$('#time-toggle').setAttribute('aria-expanded','true');}
}
function render(){
 const t=active(),m=metrics(t,state.workflow),w=workflows[state.workflow];
 document.querySelectorAll('[data-workflow]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.workflow===state.workflow));
 $('#baseline-main').innerHTML=`<p class="eyebrow">${esc(t.name)} · ${esc(t.code)}</p><h1 id="baseline-title">${m.current.value===null?'First-appointment total unavailable':src(fmt(m.current.value),'class="metric" aria-label="View source records for '+fmt(m.current.value)+'"')} ${m.current.value===null?'for this workflow':esc(w.heading)}</h1><p class="period">Reported in 2025/26 · first appointments, including tele consultations${t.code==='RWE'?' · worked example':''}</p>`;
 const max=Math.max(m.current.value||0,m.previous.value||0,1);
 $('#baseline-chart').className='baseline-chart';
 $('#baseline-chart').innerHTML=[['2024/25',m.previous.value,''],['2025/26',m.current.value,'current']].map(([year,value,cl])=>`<div class="bar-pair"><div class="bar-label"><span>${year}</span>${src(fmt(value))}</div><div class="bar-track"><div class="bar-fill ${cl}" style="width:${(value??0)/max*100}%"></div></div></div>`).join('')+`<p class="change">${esc(change(m))}.</p>`;
 $('#source-strip').innerHTML=`<span>NHS England HES · April 2025–March 2026 · published ${date(data.meta.sources[1].published)} · rounded appointment counts</span>${src('Open the exact source rows ↗')}`;
 renderEvidence(t);renderScenario();renderPlan();
 $('#data-date').innerHTML=link(data.meta.sources[1].page,'Latest annual data: 2025/26');
}
function renderEvidence(t){
 const e=t.evidence;
 let left=e?`<p class="eyebrow">A PUBLISHED REASON TO ASK</p><h3>${esc(e.title)}</h3><p>${esc(e.need)}</p><p class="source">${link(e.url+(e.page?'#page='+e.page:''),e.date?date(e.date)+' · '+(e.page?'PDF page '+e.page:'trust publication'):'Trust programme update')}<br>${esc(e.context)}</p>`:`<p class="eyebrow">DISCOVERY STILL NEEDED</p><h3>Confirm a local problem first</h3><p class="no-evidence">The NHS file establishes reported workload. A trust-specific statement of unmet need has not been verified here.</p><p class="source">Ask the outpatient operations team which event records still require manual work.</p>`;
 if(e?.route)left+=`<a class="route" href="${esc(e.route.url)}" target="_blank" rel="noopener">${esc(e.route.label)} ↗</a>${e.route.caveat?`<p class="source">${esc(e.route.caveat)}</p>`:''}`;
 const known=t.relationship?.status==='known';
 const right=`<div class="check"><span class="tag">${known?'Existing Frontier deployment':'Check existing systems first'}</span><h3>${known?'Discuss account expansion':'Find the work left between systems'}</h3><p>${esc(known?t.relationship.text:(e?.incumbent||'Booking platforms and automation contracts have not been checked for this trust. Ask about the current tools, system owners and remaining manual queues.'))}</p><p class="source">${known?link(t.relationship.url,'Published Frontier case study'):(e?.checks||[]).map(x=>link(x.url,x.label)).join('<br>')}</p></div>`;
 $('#local-evidence').innerHTML=`<div>${left}</div>${right}`;
}
function inputError(){
 if(!Number.isInteger(Number(state.weeks))||Number(state.weeks)<1||Number(state.weeks)>52||state.weeks==='')return 'Enter a whole number of weeks from 1 to 52.';
 if(state.scope===''||!Number.isFinite(Number(state.scope))||Number(state.scope)<0||Number(state.scope)>100)return 'Enter a scope share from 0 to 100%.';
 for(const k of ['before','after'])if(state[k]!==''&&(!Number.isFinite(Number(state[k]))||Number(state[k])<0||Number(state[k])>240))return 'Handling times must be between 0 and 240 minutes.';
 return '';
}
function renderScenario(){
 const error=inputError(),m=metrics(active(),state.workflow),s=scenario(m.current.value,state);
 $('#input-error').hidden=!error;$('#input-error').textContent=error;
 for(const id of ['download','copy','share'])$('#'+id).disabled=!!error;
 if(error){$('#scenario').innerHTML='<p class="small">Update the inputs to calculate your scope.</p>';return;}
 if(s.cases===null){$('#scenario').innerHTML='<h3>No complete annual total</h3><p class="small">One or more source cells are absent or suppressed. Choose another trust or workflow to calculate a scope; the brief will preserve these missing values.</p>';return;}
 $('#scenario').innerHTML=`<div class="number">≈ ${fmt(s.cases)}</div><h3>event records in your proposed scope</h3><p class="formula">${src(fmt(m.current.value))} ÷ 52 × ${fmt(s.weeks)} weeks × ${fmt(s.scope,Number.isInteger(s.scope)?0:1)}%</p><p class="small">Based on the historical annual average, not a live queue. Check current inflow and eligibility with the booking team.</p>${s.hours!==null?`<div class="time-result"><strong>${fmt(Math.abs(s.hours),1)} staff hours ${s.hours<0?'extra':'less'}</strong> in your scenario.<br><span class="small">${esc(state.before)} → ${esc(state.after)} minutes per record, entered by you. Includes no assumed JUNO result.</span></div>`:(state.before!==''||state.after!=='')?'<p class="small">Enter both handling times to calculate the scenario difference.</p>':''}`;
}
function renderPlan(){
 const w=workflows[state.workflow],t=active();
 $('#plan-content').innerHTML=`<div class="plan-grid">${w.steps.map((s,i)=>`<div class="plan-step"><h3>${['01 · CHECK','02 · PREPARE','03 · CLOSE THE LOOP'][i]}</h3><p>${esc(s)}</p></div>`).join('')}</div><div class="measure-line"><strong>Measure the pilot</strong><span>${esc(w.measure)}. Also track handling time, rework and staff escalations.</span></div><p class="discovery"><strong>Ask first:</strong> ${esc(t.evidence?.question||w.question)}</p>`;
}
function renderFinder(reset=false){
 if(reset)page=0;
 rows=selectTrusts(data,{workflow:state.workflow,query:$('#search').value,sort:$('#sort').value,minimum:$('#minimum').checked?5000:0,hideKnown:$('#hide-known').checked,includeMissing:!$('#minimum').checked});
 if($('#reviewed')?.checked)rows=rows.filter(t=>t.evidence);
 page=Math.min(page,Math.max(0,Math.ceil(rows.length/pageSize)-1));
 const start=page*pageSize,max=Math.max(...rows.map(t=>t.metrics.current.value??0),1);
 $('#finder-summary').textContent=`${rows.length} matching trusts · ${workflows[state.workflow].label} · 2025/26${rows.length?` · showing ${start+1}–${Math.min(start+pageSize,rows.length)}`:''}. Workload order is not a buying-probability score.`;
 $('#finder-results').innerHTML=rows.slice(start,start+pageSize).map(t=>`<div class="trust-row ${t.code===state.code?'selected':''}"><div><button class="trust-name" data-trust="${esc(t.code)}">${esc(t.name)}</button><small>${esc(t.code)}${t.evidence?' · published local context checked':''}${t.relationship?.status==='known'?' · existing Frontier deployment':''}</small></div><div><div class="amount"><span>${fmt(t.metrics.current.value)}</span><span>${t.metrics.delta===null?'No comparison':`${t.metrics.delta>0?'+':''}${fmt(t.metrics.delta)} vs 2024/25`}</span></div><div class="rail"><span style="width:${(t.metrics.current.value??0)/max*100}%"></span></div></div></div>`).join('')||'<p class="empty">No matches. Try another name, or turn off the workload minimum to include small and incomplete reports.</p>';
 $('#previous').disabled=page===0;$('#next').disabled=(page+1)*pageSize>=rows.length;$('#export').disabled=!rows.length;
}
function showSources(){
 const t=active(),m=metrics(t,state.workflow),w=workflows[state.workflow];
 $('#sources-title').textContent=`${t.shortName||t.name} · ${w.label}`;
 $('#sources-content').innerHTML=`<p class="source-notes">Two component rows make each annual total. “First” and “first tele” are separate source categories. Record numbers below count the CSV header as record 1.</p>${['2025-26','2024-25'].map(year=>{
  const source=data.meta.sources.find(s=>s.year===year),result=year==='2025-26'?m.current:m.previous;
  return `<div class="method-section"><h3>${year.replace('-','/')} · ${link(source.page,'NHS publication')}</h3><div class="source-overflow"><table class="source-table"><thead><tr><th>Source measure</th><th>CSV record</th><th>Reported value</th></tr></thead><tbody>${w.keys.map(k=>{const c=t.years[year]?.[k];return `<tr><td>${esc(c?.measure||`Measure ${k}: row absent`)}</td><td>${c?link(source.url,fmt(c.record)):'—'}</td><td>${c?.status==='reported'?fmt(c.value):c?.status==='suppressed'?'Suppressed (*)':'Absent'}</td></tr>`;}).join('')}<tr class="total"><td>Sum of the two reported rows</td><td></td><td>${fmt(result.value)}</td></tr></tbody></table></div></div>`;
 }).join('')}<p class="source-notes">Counts of 1–7 are suppressed; other non-zero provider counts are rounded to the nearest five. An absent row is not zero. These are appointment records, not unique people or confirmed open tasks.</p><p>${link('data/source-records.csv','Download all extracted source rows')} · ${link(data.meta.metadataUrl,'NHS measure definitions')}</p>`;
 $('#sources').showModal();
}
function methods(){
 const s=data.meta;
 $('#methods-content').innerHTML=`<div class="method-section"><h3>What you can take into a meeting</h3><p>Choose a trust and a booking workflow, review the reported workload and local context, then export an editable pilot brief. It contains the baseline, discovery questions, proposed scope, staff-review steps, measurement plan and public enquiry route where verified.</p></div>
 <div class="method-section"><h3>Why this fits Frontier</h3><p>Frontier lists booking, rescheduling and patient follow-up among ${link('https://www.frontierhealth.ai/','JUNO’s workflows')}. Its ${link('https://jobs.mmc.vc/companies/frontier-health-2-7b2d8156-877b-4b10-adb2-e6e0698eb9fd/jobs/89818611-deployment-strategist','published Deployment Strategist role')} describes scoping workflows, navigating existing systems and measuring impact. This tool prepares that conversation; it does not connect to patient records or run JUNO.</p></div>
 <div class="method-section"><h3>Real data, with the rows kept intact</h3><p>We processed ${link('data/manifest.json',fmt(s.rawRows)+' aggregate rows')} from two annual NHS HES provider files and retained ${link('data/source-records.csv',fmt(s.selectedRows)+' NHS trust attendance rows')}. The current-year extract includes ${link('data/booking-data.json',fmt(s.currentTrusts)+' trusts')}; some have incomplete cancellation or non-attendance reporting.</p><ul>${s.sources.map(x=>`<li>${link(x.page,x.year.replace('-','/')+' publication')} — ${esc(x.period)}. Published ${date(x.published)}. ${link(x.url,'Original CSV')}.</li>`).join('')}</ul><p>Only provider-level, three-character ODS codes with NHS in the published organisation name are included. We never add national, regional, trust and site totals together. Follow-up appointments and “first/subsequent unknown” records are excluded from the three workflows.</p><p>The CSV export also shows each workflow as a share of recorded first appointments, only when all eight required components are reported: attended, missed, patient-cancelled and hospital-cancelled, each split into first and first tele. See ${link(s.metadataUrl,'NHS definitions')}.</p></div>
 <div class="method-section"><h3>What the numbers establish</h3><p>${link(s.disclosureUrl,'NHS disclosure rules')} suppress small counts and round other non-zero provider values to the nearest five. We do not turn absent or suppressed cells into zero. ${link(s.methodologyUrl,'NHS quality notes')} say some providers submit only attended appointments, so low reported cancellation counts do not prove low need.</p><p>Year-to-year change matches the same ODS code. It is not adjusted for mergers, service moves or reporting changes. Appointment records can repeat for a person. The source does not reveal cancellation causes, specialty-level cancellation counts, open tasks or staff handling time.</p></div>
 <div class="method-section"><h3>Your planning assumptions</h3><p>Annual event count ÷ 52 × pilot weeks × scope share. This is a simple historical run-rate, not a live backlog or seasonal forecast. Default weeks and share are editable planning choices. If you enter both handling times, the tool multiplies the unrounded scope by the minutes difference and divides by 60. A negative difference means extra work. No handling time, conversion rate, financial saving or JUNO effect is assumed.</p></div>
 <div class="method-section"><h3>Check the local context</h3><p>Published operational context is attached for Leicester, Nottingham, Imperial and Lincolnshire. Its scope can differ from the first-appointment dataset; each card states that distinction. Existing systems and programmes are flagged. No statement of unmet need is inferred for the remaining trusts.</p><p>East Sussex (${link('https://www.frontierhealth.ai/case-studies/why-east-sussex-healthcare-nhs-trust-chose-frontier-health','published Frontier deployment')}) is hidden from the default prospect finder. Other customer relationships are unverified, not presumed absent. The data order is reported workload, not a sales prediction.</p></div>
 <div class="method-section"><h3>What is different from an NHS dashboard</h3><p>The ${link(s.sources[1].page,'NHS provider dashboard')} already displays these public data. The ${link('https://www.england.nhs.uk/digitaltechnology/nhs-federated-data-platform/solution-exchange-product-catalogue/outpatients/','NHS Federated Data Platform')} and commercial booking tools already cover operational workflows. The contribution here is a reusable, sourced pilot brief with local system checks and explicit assumptions.</p></div>
 <div class="method-section"><h3>Refresh, privacy and ownership</h3><p>This is a fixed annual-data snapshot, prepared on 21 November 2026. It is not a live feed. ${link('https://github.com/rounakdas07/frontier-booking-workbench','Source code and refresh scripts')} preserve file hashes and exact source-row pointers. No patient information is loaded; calculations run in your browser. A copied pilot link includes only trust, workflow and your numeric scope inputs.</p><p>Independent project by Rounak Das. Not commissioned or endorsed by Frontier Health or NHS England. NHS source data is reused with attribution under the Open Government Licence where stated by the publisher.</p></div>`;
 $('#methods').showModal();
}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('show');toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);}
async function copy(text,button){try{await navigator.clipboard.writeText(text);const old=button.textContent;button.textContent='Copied';toast('Copied to clipboard');setTimeout(()=>button.textContent=old,2000);}catch{$('#copy-text').value=text;$('#copy-fallback').showModal();$('#copy-text').select();}}
function wire(){
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-source]')){showSources();return;}
  const close=e.target.closest('[data-close]');if(close){$('#'+close.dataset.close).close();return;}
  const w=e.target.closest('[data-workflow]');if(w){state.workflow=w.dataset.workflow;render();return;}
  const t=e.target.closest('[data-trust]');if(t){state.code=t.dataset.trust;$('#finder').close();render();return;}
 });
 $('#choose').addEventListener('click',()=>{renderFinder();$('#finder').showModal();});
 $('#how').addEventListener('click',methods);
 $('#search').addEventListener('input',()=>renderFinder(true));
 for(const id of ['sort','minimum','hide-known','reviewed'])$('#'+id).addEventListener('change',()=>renderFinder(true));
 $('#previous').addEventListener('click',()=>{page--;renderFinder();$('#finder').scrollTop=0;});
 $('#next').addEventListener('click',()=>{page++;renderFinder();$('#finder').scrollTop=0;});
 for(const k of ['weeks','scope','before','after'])$('#'+k).addEventListener('input',e=>{state[k]=e.target.value;renderScenario();});
 $('#time-toggle').addEventListener('click',()=>{const hidden=$('#time-inputs').hidden;$('#time-inputs').hidden=!hidden;$('#time-toggle').setAttribute('aria-expanded',hidden);});
 $('#download').addEventListener('click',()=>download(pilotBrief(data,active(),state.workflow,state),`booking-pilot-${state.code}-${state.workflow}.txt`,'text/plain;charset=utf-8'));
 $('#copy').addEventListener('click',e=>copy(pilotBrief(data,active(),state.workflow,state),e.currentTarget));
 $('#share').addEventListener('click',e=>{const p=new URLSearchParams({trust:state.code,workflow:state.workflow});for(const k of ['weeks','scope','before','after'])if(state[k]!=='')p.set(k,state[k]);const url=new URL(location.href);url.hash=p.toString();copy(url.href,e.currentTarget);});
 $('#export').addEventListener('click',()=>download(exportCSV(data,rows,state.workflow),`nhs-${state.workflow}-workloads-2025-26.csv`,'text/csv;charset=utf-8'));
 window.addEventListener('hashchange',()=>{if(location.hash.includes('=')){restore();render();}});
}
try{
 const res=await fetch('data/booking-data.json');if(!res.ok)throw new Error('NHS data unavailable');data=await res.json();
 const label=document.createElement('label');label.innerHTML='<input type="checkbox" id="reviewed"> Published local context checked';$('.finder-filters').append(label);
 restore();wire();render();
}catch(error){$('#baseline-main').innerHTML='<h1>Could not load the NHS records</h1><p>Refresh to try again, or <a href="data/source-records.csv">download the source extract</a>.</p>';for(const id of ['choose','download','copy','share','how'])$('#'+id).disabled=true;console.error(error);}
