(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const html=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const state={a:null,b:null,diagram:'data',diff:[],componentMap:new Map(),loading:false};
 const MAX_ZIP=75*1024*1024,MAX_UNPACKED=130*1024*1024,MAX_FILES=4000,MAX_ENTRY=20*1024*1024;
 const label=type=>SolutionCore.LABELS[type]||type;
 function download(name,content,mime='text/plain'){const blob=content instanceof Blob?content:new Blob([content],{type:mime});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);}
 function status(msg,error=false){$('status').innerHTML=`<span class="status-indicator" style="background:${error?'#dd5a6f':'#32b899'}"></span> ${html(msg)}`;}
 async function readZip(file){
   if(!file||(!/\.zip$/i.test(file.name)&&file.type!=='application/zip'))throw Error('Choose a .zip file exported from Dataverse.');
   if(file.size>MAX_ZIP)throw Error('ZIP exceeds the 75 MB safety limit.');
   const bytes=await file.arrayBuffer();const header=new Uint8Array(bytes,0,Math.min(4,bytes.byteLength));
   if(header[0]!==0x50||header[1]!==0x4b)throw Error('This file is not a valid ZIP archive.');
   const zip=await JSZip.loadAsync(bytes,{checkCRC32:false});const entries=Object.values(zip.files).filter(f=>!f.dir);
   if(entries.length>MAX_FILES)throw Error('ZIP has too many entries (limit 4,000).');
   let estimated=0;
   for(const e of entries){const size=e._data?.uncompressedSize||0;estimated+=size;
     if(size>MAX_ENTRY)throw Error('A ZIP entry exceeds the 20 MB extraction limit.');
   }
   if(estimated>MAX_UNPACKED)throw Error('Uncompressed content exceeds the 130 MB safety limit.');
   const files=new Map(),checksums=new Map();let read=0;
   for(const e of entries){
     const path=e.name.replace(/\\/g,'/');
     checksums.set(path,typeof e._data?.crc32==='number'?(e._data.crc32>>>0).toString(16).padStart(8,'0'):'');
     if(!/\.(xml|json|yml|yaml)$/i.test(path))continue;
     const s=e._data?.uncompressedSize||0;
     if(s>MAX_ENTRY)continue;
     // XML and JSON are the only formats parsed. Other files never execute.
     const contents=await e.async('string');read+=contents.length*2;
     if(read>MAX_UNPACKED)throw Error('Archive exceeds the text extraction limit.');
     files.set(path,contents);
   }
   if(!files.size)throw Error('No supported metadata files were found inside the ZIP.');
   const model=SolutionCore.parseSolution(files,checksums);model.flowDetails=SolutionFlowExplorer.collect(files);return {...model,info:{...model.info,filename:file.name}};
 }
 async function handle(file,slot){
   if(!file||state.loading)return;state.loading=true;status(`Reading ${file.name} locally…`);
   const id=slot==='a'?'primary':'compare';$(id+'-picker').disabled=true;
   try{const model=await readZip(file);state[slot]=model;$(id+'-label').textContent=file.name;status(`Loaded ${file.name} — ${model.components.length} components found.`);render();}
   catch(e){status(e.message||'Could not read the solution ZIP.',true);}
   finally{state.loading=false;$(id+'-picker').disabled=false;}
 }
 function bindDrop(elementId,slot){const el=$(elementId);for(const eventName of ['dragenter','dragover'])el.addEventListener(eventName,e=>{e.preventDefault();el.classList.add('dragging');});for(const eventName of ['dragleave','drop'])el.addEventListener(eventName,e=>{e.preventDefault();el.classList.remove('dragging');});el.addEventListener('drop',e=>{const file=e.dataTransfer?.files?.[0];if(file)handle(file,slot);});}
 function render(){renderOverview();renderInventory();renderDiagram();renderDiff();renderManaged();renderWarnings();document.dispatchEvent(new CustomEvent('solution-workspace-change',{detail:{a:state.a}}));}
 function renderOverview(){const m=state.a;
   $('solution-subtitle').textContent=m?`${m.info.name||m.info.filename||'Solution'} · v${m.info.version||'?'} · ${m.components.length.toLocaleString()} discovered components`:'Your architecture, one clear picture.';
   for(const type of ['table','column','relationship','flow','webresource','environment'])$('count-'+type).textContent=m?m.counts[type].toLocaleString():'—';
   const rows=[['Unique name',m?.info.name||'—'],['Version',m?.info.version||'—'],['Managed',m?(m.info.managed===null?'Unknown':m.info.managed?'Yes':'No'):'—'],['Publisher',m?.info.publisher||'—'],['Source',m?.info.filename||'—']];
   $('solution-details').innerHTML=rows.map(([k,v])=>`<div><dt>${html(k)}</dt><dd>${html(v)}</dd></div>`).join('');
   if(!m){$('coverage-chart').innerHTML='<p class="muted">Load a ZIP to reveal its composition.</p>';}
   else{const counts=Object.entries(m.counts).filter(([,v])=>v>0);const peak=Math.max(1,...counts.map(c=>c[1]));$('coverage-chart').innerHTML=counts.map(([k,v])=>`<div class="bar-line"><label>${html(label(k))}</label><div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/peak*100)}%"></div></div><strong>${v}</strong></div>`).join('')||'<p>No supported components detected.</p>';}
   for(const id of ['download-json','download-csv','export-svg','export-mermaid'])$(id).disabled=!m;
   $('total-components').textContent=`${m?.components.length||0} components`;
 }
 function componentDetails(c){
   const kind=label(c.type).replace(/s$/,'');
   return `<div class="type-chip">${html(kind)}</div><p>${html(c.description||'Solution metadata')}</p><table class="property-table"><tbody>${Object.entries(c.properties||{}).map(([k,v])=>`<tr><th>${html(k)}</th><td>${html(v)}</td></tr>`).join('')||'<tr><td>No additional properties in this export.</td></tr>'}</tbody></table><p class="dialog-note">Only discovered metadata is shown. Environment variable values and secret properties are not extracted.</p>`;
 }
 function showComponent(id){const c=state.componentMap.get(id);if(!c)return;$('dialog-title').textContent=c.name;$('dialog-content').innerHTML=componentDetails(c);$('component-dialog').showModal();}
 function renderInventory(){const m=state.a;const q=$('component-search').value.trim().toLowerCase(),type=$('type-filter').value;
   state.componentMap=new Map((m?.components||[]).map(c=>[c.id,c]));
   const components=(m?.components||[]).filter(c=>(type==='all'||c.type===type)&&(c.name.toLowerCase().includes(q)||label(c.type).toLowerCase().includes(q)||Object.values(c.properties).some(x=>String(x).toLowerCase().includes(q))));
   $('component-rows').innerHTML=components.length?components.slice(0,500).map(c=>`<tr data-id="${html(c.id)}" tabindex="0" role="button" aria-label="Explore ${html(c.name)}"><td>${html(c.name)}</td><td><span class="type-chip">${html(label(c.type))}</span></td><td>${html(c.description||Object.entries(c.properties).slice(0,2).map(([k,v])=>`${k}: ${v}`).join(' · ')||'—')}</td><td><span class="arrow-link">↗</span></td></tr>`).join(''):`<tr><td colspan="4" class="empty-state">${m?'No components match your filters.':'No solution loaded yet. Try the sample to start exploring.'}</td></tr>`;
   $('shown-components').textContent=`Showing ${Math.min(components.length,500)} of ${m?.components.length||0} components${components.length>500?' (first 500 matches)':''}`;
   for(const tr of $('component-rows').querySelectorAll('tr[data-id]')){tr.addEventListener('click',()=>showComponent(tr.dataset.id));tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showComponent(tr.dataset.id);}});}
 }
 function svgToMermaid(m,mode){
   const safe=s=>String(s||'').replace(/["\r\n]/g,' ').slice(0,100);
   let result='flowchart LR\n';let nodes=[];let edges=[];
   if(mode==='data'){
     nodes=m.components.filter(c=>c.type==='table').slice(0,80).map(x=>({id:x.name,name:x.name}));
     edges=m.components.filter(c=>c.type==='relationship').map(r=>[r.properties.source,r.properties.target]).filter(([a,b])=>nodes.some(n=>n.id===a)&&nodes.some(n=>n.id===b));
   }else if(mode==='integrations'){
     nodes=m.components.filter(c=>['flow','connection','environment'].includes(c.type)).slice(0,80).map(x=>({id:x.id,name:x.name}));
     edges=m.components.filter(c=>c.type==='flow').flatMap(c=>(c.properties.connectionReferences||'').split(',').map(x=>[c.id,'connection:'+x.trim().toLowerCase()])).filter(([a,b])=>nodes.some(n=>n.id===a)&&nodes.some(n=>n.id===b));
   }else{nodes=[{id:'root',name:m.info.name||'Solution'},...Object.entries(m.counts).filter(([,n])=>n).map(([k,v])=>({id:k,name:label(k)+' ('+v+')'}))];edges=nodes.slice(1).map(x=>['root',x.id]);}
   const ids=new Map(nodes.map((n,i)=>[n.id,'n'+i]));
   for(const n of nodes)result+=`    ${ids.get(n.id)}["${safe(n.name)}"]\n`;
   for(const [a,b] of edges)if(ids.has(a)&&ids.has(b))result+=`    ${ids.get(a)} --> ${ids.get(b)}\n`;
   return result;
 }
 function renderDiagram(){const m=state.a;const stage=$('diagram-stage');if(!m){stage.innerHTML='<div class="diagram-placeholder"><span class="diagram-icon">◇</span><h3>Architecture, automatically mapped.</h3><p>Load a solution to visualise tables, relationships and integrations.</p></div>';return;}
   stage.innerHTML=SolutionDiagrams.build(m,state.diagram);
   for(const tab of document.querySelectorAll('.diagram-tab')){const yes=tab.dataset.diagram===state.diagram;tab.classList.toggle('active',yes);tab.setAttribute('aria-pressed',String(yes));}
 }
 function renderDiff(){state.diff=SolutionCore.compare(state.a,state.b);const counts={added:0,changed:0,removed:0,unchanged:0};state.diff.forEach(c=>counts[c.status]++);
   for(const k of Object.keys(counts))$(k==='unchanged'?'same-count':k+'-count').textContent=state.a&&state.b?counts[k]:'—';
   $('export-diff').disabled=!(state.a&&state.b);$('export-diff-csv').disabled=!(state.a&&state.b);$('swap-solutions').disabled=!(state.a&&state.b);
   const compareContext=$('comparison-context');
   if(state.a&&state.b){
    const a=state.a.info,b=state.b.info;
    compareContext.innerHTML=`<strong>A · ${html(a.name||a.filename||'Baseline')}</strong> v${html(a.version||'?')} (${a.managed===null?'Unknown':a.managed?'Managed':'Unmanaged'}) <span aria-hidden="true">→</span> <strong>B · ${html(b.name||b.filename||'Newer')}</strong> v${html(b.version||'?')} (${b.managed===null?'Unknown':b.managed?'Managed':'Unmanaged'})${a.name&&b.name&&a.name!==b.name?'<p class="comparison-warning">Different solution names: results compare matching component IDs, not necessarily two releases of the same product.</p>':''}`;
   }else compareContext.textContent='Upload two Dataverse solution ZIPs, or use the comparison demo. A is the baseline; B is the newer solution.';
   const q=$('diff-search').value.toLowerCase(),filter=$('diff-filter').value;
   const result=state.diff.filter(c=>(filter==='all'||c.status===filter)&&(c.name.toLowerCase().includes(q)||label(c.type).toLowerCase().includes(q)));
   $('diff-rows').innerHTML=result.length?result.slice(0,500).map(c=>`<tr data-diff-id="${html(c.id)}" tabindex="0" role="button" aria-label="Compare properties for ${html(c.name)}"><td>${html(c.name)}</td><td>${html(label(c.type))}</td><td><span class="diff-tag ${html(c.status)}">${html(c.status.toUpperCase())}</span></td><td>${html(c.status==='changed'?propertyChange(c):c.status==='added'?'Not in baseline':c.status==='removed'?'Not in newer ZIP':'Metadata matches')} ↗</td></tr>`).join(''):`<tr><td colspan="4" class="empty-state">${state.a&&state.b?'No differences match these filters.':'Add a second solution ZIP, or load the comparison demo.'}</td></tr>`;
   for(const tr of $('diff-rows').querySelectorAll('tr[data-diff-id]')){
     const open=()=>showDiff(tr.dataset.diffId);tr.addEventListener('click',open);
     tr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});
   }
 } 
 function showDiff(id){
   const c=state.diff.find(x=>x.id===id);if(!c)return;
   const old=c.before||{},now=c.status==='removed'?{}:c.properties||{};
   const names=[...new Set([...Object.keys(old),...Object.keys(now)])].sort();
   $('dialog-title').textContent=c.name;
   $('dialog-content').innerHTML=`<p class="dialog-note">${html(label(c.type))} · ${html(c.status)} — A is baseline; B is newer.</p><div class="table-scroller"><table class="property-table property-diff"><thead><tr><th>Property</th><th>A · Baseline</th><th>B · Newer</th></tr></thead><tbody>${names.map(k=>`<tr class="${old[k]!==now[k]?'property-changed':''}"><th>${html(k)}</th><td>${html(Object.hasOwn(old,k)?old[k]:'—')}</td><td>${html(Object.hasOwn(now,k)?now[k]:'—')}</td></tr>`).join('')||'<tr><td colspan="3">No extracted properties.</td></tr>'}</tbody></table></div><p class="dialog-note">Only supported exported metadata is compared. Unextracted source or binary differences may not be shown.</p>`;
   $('component-dialog').showModal();
 }
 function renderManaged(){
   const m=state.a,assessment=SolutionCore.assessManaged(m);
   $('managed-result-title').textContent=assessment.title;
   $('managed-state').textContent=assessment.status.toUpperCase();
   $('managed-steps').innerHTML=assessment.steps.map(step=>`<li>${html(step)}</li>`).join('');
   $('download-recovery').disabled=!m;
 }
 function propertyChange(c){const a=c.before||{},b=c.properties||{},keys=new Set([...Object.keys(a),...Object.keys(b)]);return [...keys].filter(k=>a[k]!==b[k]).slice(0,3).map(k=>`${k}: ${String(a[k]??'—').slice(0,22)} → ${String(b[k]??'—').slice(0,22)}`).join('; ')||'Metadata changed';}
 function renderWarnings(){const items=[...(state.a?.warnings||[]),...(state.b?.warnings||[]).map(w=>'Comparison: '+w)];$('parse-warnings').hidden=!items.length;$('warning-list').innerHTML=items.map(w=>`<li>${html(w)}</li>`).join('');}
 function refreshNetwork(){let entries=[];try{entries=performance.getEntriesByType('resource')||[];}catch{}
   const hosts=[...new Set(entries.map(x=>{try{return new URL(x.name).hostname;}catch{return '';}}).filter(Boolean))].sort();
   $('network-list').innerHTML=hosts.length?hosts.map(h=>`<li>${html(h)}</li>`).join(''):'<li>No external resource domains observed in this Performance API snapshot.</li>';
 }
 function escapeCSV(s){const value=String(s??'');return '"'+( /^[=+\-@\t\r]/.test(value)?"'":'')+value.replace(/"/g,'""')+'"';}
 function csv(rows){return rows.map(r=>r.map(escapeCSV).join(',')).join('\r\n')+'\r\n';}
 function selectSample(id,slot){const m=SolutionSamples.load(id);state[slot]=m;$(slot==='a'?'primary-label':'compare-label').textContent=m.info.filename;status('Loaded '+m.info.filename+' — fictional teaching package.');render();}
 const gallery=$('samples-gallery');gallery.innerHTML=SolutionSamples.catalog.map(s=>`<article class="panel sample-card"><span class="section-kicker">${html(s.sector)}</span><h3>${html(s.title)}</h3><p>${html(s.description)}</p><span class="sample-version">v${html(s.version)}${s.managed?' · Managed':''}</span><div class="sample-actions"><button class="btn btn-outline small" data-sample-load="${html(s.id)}">Explore ↗</button><button class="btn btn-outline small" data-sample-b="${html(s.id)}">Use as B ⇄</button><button class="text-button" data-sample-download="${html(s.id)}">ZIP ↓</button></div></article>`).join('');
 for(const b of gallery.querySelectorAll('[data-sample-load]'))b.addEventListener('click',()=>{selectSample(b.dataset.sampleLoad,'a');$('results').scrollIntoView({behavior:'smooth'});});
 for(const b of gallery.querySelectorAll('[data-sample-b]'))b.addEventListener('click',()=>{selectSample(b.dataset.sampleB,'b');$('comparison').scrollIntoView({behavior:'smooth'});});
 for(const b of gallery.querySelectorAll('[data-sample-download]'))b.addEventListener('click',async()=>{const id=b.dataset.sampleDownload;b.disabled=true;try{const zip=new JSZip();for(const [path,body] of SolutionSamples.files(id))zip.file(path,body);const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});download(`${id}-demo.zip`,blob,'application/zip');status('Downloaded fictional sample: '+id+'.');}catch(e){status('Could not create sample ZIP: '+e.message,true);}finally{b.disabled=false;}});
 $('try-demo').addEventListener('click' ,()=>{state.a=SolutionSamples.demo(1);state.b=null;$('primary-label').textContent='Synthetic demo · v1.0';$('compare-label').textContent='No comparison loaded';status('Loaded the synthetic demonstration solution.');render();$('workspace').scrollIntoView({behavior:'smooth'});});
 $('demo-pair').addEventListener('click',()=>{state.a=SolutionSamples.demo(1);state.b=SolutionSamples.demo(2);$('primary-label').textContent='Synthetic demo · v1.0';$('compare-label').textContent='Synthetic demo · v1.1';status('Demo comparison ready — synthetic solution versions 1.0 and 1.1.');render();$('comparison').scrollIntoView({behavior:'smooth'});});
 $('primary-picker').addEventListener('click',()=>$('primary-file').click());$('compare-picker').addEventListener('click',()=>$('compare-file').click());
 $('primary-file').addEventListener('change',e=>handle(e.target.files?.[0],'a'));$('compare-file').addEventListener('change',e=>handle(e.target.files?.[0],'b'));
 bindDrop('primary-drop','a');bindDrop('compare-drop','b');
 $('clear-all').addEventListener('click',()=>{state.a=null;state.b=null;state.diff=[];$('primary-file').value='';$('compare-file').value='';$('primary-label').textContent='No file selected';$('compare-label').textContent='No comparison loaded';status('Workspace cleared. No solution files are retained.');render();});
 $('component-search').addEventListener('input',renderInventory);$('type-filter').addEventListener('change',renderInventory);
 $('diff-search').addEventListener('input',renderDiff);$('diff-filter').addEventListener('change',renderDiff);
 for(const tab of document.querySelectorAll('.diagram-tab'))tab.addEventListener('click',()=>{state.diagram=tab.dataset.diagram;renderDiagram();});
 $('swap-solutions').addEventListener('click',()=>{if(!state.a||!state.b)return;[state.a,state.b]=[state.b,state.a];$('primary-label').textContent=state.a.info.filename||state.a.info.name||'Baseline';$('compare-label').textContent=state.b.info.filename||state.b.info.name||'Newer';status('Comparison direction reversed. A is now the baseline.');render();});
 $('download-recovery').addEventListener('click',()=>{if(!state.a)return;const m=state.a,a=SolutionCore.assessManaged(m);const out=['# Dataverse solution recovery assessment','',`Solution: ${m.info.name||'Unknown'}`,`Version: ${m.info.version||'Unknown'}`,`Managed: ${m.info.managed===null?'Unconfirmed':m.info.managed?'Yes':'No'}`,'','## Guidance',...a.steps.map((step,i)=>`${i+1}. ${step}`),'','## Discovered component inventory (not full source)',...m.components.map(c=>`- ${c.type}: ${c.name}`),'','## Important limitations','No managed-to-unmanaged conversion was performed. Do not modify the ZIP managed flag.','Official guidance: https://learn.microsoft.com/power-platform/alm/solution-packager-tool'];download('managed-solution-recovery.md',out.join('\n'),'text/markdown');});
 $('download-json').addEventListener('click',()=>{if(state.a)download('solution-inventory.json',JSON.stringify({...state.a,source:'Mightora Solution Explorer'},null,2),'application/json');});
 $('download-csv').addEventListener('click',()=>{if(state.a)download('solution-components.csv',csv([['Type','Name','Description','Properties'],...state.a.components.map(c=>[c.type,c.name,c.description,JSON.stringify(c.properties)])]),'text/csv');});
 $('export-svg').addEventListener('click',()=>{if(state.a)download(`solution-${state.diagram}.svg`,SolutionDiagrams.build(state.a,state.diagram),'image/svg+xml');});
 $('export-mermaid').addEventListener('click',()=>{if(state.a)download(`solution-${state.diagram}.mmd`,svgToMermaid(state.a,state.diagram),'text/plain');});
 $('export-diff-csv').addEventListener('click',()=>{if(state.a&&state.b)download('solution-comparison.csv',csv([['Status','Type','Component','Property','Baseline A','Newer B'],...state.diff.flatMap(c=>{const fields=SolutionCore.propertyChanges(c.before||{},c.status==='removed'?{}:c.properties||{});return fields.length?fields.map(f=>[c.status,c.type,c.name,f.key,f.before??'',f.after??'']):[[c.status,c.type,c.name,'','','']];})]),'text/csv');});
 $('export-diff').addEventListener('click' ,()=>{if(state.a&&state.b)download('solution-comparison.json',JSON.stringify({baseline:state.a.info,current:state.b.info,changes:state.diff},null,2),'application/json');});
 $('close-dialog').addEventListener('click',()=>$('component-dialog').close());$('component-dialog').addEventListener('click',e=>{if(e.target===$('component-dialog'))$('component-dialog').close();});
 $('refresh-network').addEventListener('click',refreshNetwork);
 if(document.documentElement.dataset.offline==='true'){$('offline-banner').hidden=false;for(const id of ['offline-html-link','offline-zip-link']){const link=$(id);if(link)link.hidden=true;}}
 refreshNetwork();render();
})();
