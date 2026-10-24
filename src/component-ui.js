/* Inert component visualisations shared by object, form, canvas and rule inspectors. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const table=(headers,rows)=>`<div class="table-scroller"><table class="component-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length}">No corresponding metadata in this export.</td></tr>`}</tbody></table></div>`;
function formEvents(f,m){
 let out='<h4>JavaScript on form load</h4><p>Handlers appear in registration order. Disabled handlers remain visible. Code registered dynamically is outside this static view.</p>';
 out+=table(['Order','Function','Library','Enabled','Execution context','Parameters','Source'],(f.onLoad||[]).map(e=>[e.order,e.functionName,e.library,e.enabled?'Yes':'No',e.executionContext?'Passed':'Not passed',e.parameters,e.sourceAvailable?'Included below':'Not packaged']));
 for(const id of [...new Set((f.onLoad||[]).map(e=>e.sourceId).filter(Boolean))])for(const source of root.SolutionDetails.sourcesFor(m,id))out+=`<details class="component-code"><summary>${esc(source.path)} / full registered library</summary><pre class="webresource-source">${esc(source.text)}</pre></details>`;
 return out;
}
function canvasSvg(screen){
 const numeric=screen.controls.filter(c=>c.x!==null&&c.y!==null&&c.width!==null&&c.height!==null&&!c.parent),fixed=numeric.length===screen.controls.length&&screen.controls.length>0;
 const width=fixed?Math.max(600,...screen.controls.map(c=>c.x+c.width+20)):950,height=fixed?Math.max(350,...screen.controls.map(c=>c.y+c.height+20)):Math.max(160,Math.ceil(screen.controls.length/3)*100+30);
 let nodes='';for(const [i,c] of screen.controls.entries()){
  const x=fixed?c.x:14+(i%3)*313,y=fixed?c.y:12+Math.floor(i/3)*100,w=fixed?Math.max(30,c.width):297,h=fixed?Math.max(24,c.height):84;
  nodes+=`<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="#f2f0fe" stroke="#6957db"/><text x="${x+9}" y="${y+20}" font-family="Arial" font-size="12" fill="#192444">${esc(c.name)}</text><text x="${x+9}" y="${y+38}" font-family="Arial" font-size="10" fill="#54627b">${esc(c.kind)}${c.parent?' / '+esc(c.parent):''}</text><title>${esc(c.text)}</title></g>`;
 }
 return `<p class="muted">${fixed?'Literal exported positions':'Control hierarchy arranged for documentation; dynamic positions are not evaluated'}.</p><div class="canvas-wireframe"><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Structural canvas screen ${esc(screen.name)}"><rect width="100%" height="100%" fill="white"/>${nodes}</svg></div>`;
}
function markup(m,id){const d=root.SolutionDetails?.component(m,id);if(!d)return '';
 let out='<div class="component-visual-detail"><h3>'+esc(d.component.name)+'</h3>'+table(['Property','Value'],Object.entries(d.component.properties||{}));
 if(d.form)out+=formEvents(d.form,m);
 if(d.view)out+='<h4>View column layout</h4>'+table(['Column','Width'],d.view.columns.map(c=>[c.name,c.width]));
 if(d.canvas){out+='<h4>Canvas app screens</h4>';for(const s of d.canvas.screens)out+=`<details open><summary>${esc(s.name)} / ${s.controls.length} controls</summary>${canvasSvg(s)}${table(['Control','Kind','Parent','Text'],s.controls.map(c=>[c.name,c.kind,c.parent,c.text]))}</details>`;for(const issue of d.canvas.issues)out+=`<p class="object-limited">${esc(issue)}</p>`;out+='<h4>Power Fx properties</h4>';for(const f of d.canvas.formulas)out+=`<details class="component-code"><summary>${esc([f.screen,f.control,f.property].join(' / '))}</summary><pre class="webresource-source">${esc(f.expression)}</pre></details>`;}
 if(d.rule){const r=d.rule;out+=`<h4>Business rule / ${esc(r.scope)}</h4><p><strong>Table:</strong> ${esc(r.table||'Not supplied')} · <strong>State:</strong> ${esc(r.state)}</p><p><strong>Scope evidence:</strong> ${esc(r.scopeEvidence)}</p>`+table(['Form IDs','Trigger events'],[[r.formIds.join(', ')||'No specific form',r.triggers.map(t=>t.event+(t.field?' / '+t.field:'')).join(', ')||'Not supplied']])+table(['Condition or action','Kind','Definition'],r.steps.map(s=>[s.name,s.kind,s.detail]));if(!r.steps.length)out+='<p class="object-limited">No supported condition or action nodes were decoded. The complete packaged definition is shown below where available.</p>';}
 if(d.sources.length){out+='<h4>Packaged source and definitions</h4>';for(const s of d.sources)out+=`<details class="component-code"><summary>${esc(s.kind)} / ${esc(s.path)}</summary><pre class="webresource-source">${esc(s.text)}</pre></details>`;}
 return out+'</div>';
}
const save=(name,blob)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1800);};
async function exportItem(m,id,kind,button,status){
 if(button)button.disabled=true;try{if(status)status.textContent='Generating editable '+kind.toUpperCase()+'…';const report=root.SolutionReports.component(m,id),blob=await root.SolutionOffice[kind](report);save('solution-'+id.replace(/[^a-z0-9_-]/gi,'-').slice(0,100)+'.'+kind,blob);if(status)status.textContent='Editable '+kind.toUpperCase()+' downloaded.';}catch(e){if(status)status.textContent='Export failed: '+e.message;}finally{if(button)button.disabled=false;}
}
root.SolutionComponentUI={markup,formEvents,canvasSvg,exportItem,save};
})(globalThis);
