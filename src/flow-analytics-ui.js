/* Additive portfolio UI. SVG and HTML are generated only from escaped metadata. */
(function(root){
'use strict';
const $=id=>document.getElementById(id),esc=s=>SolutionFlowExplorer.escape(s);
let records=[];
const columns=e=>e.columns.length?e.columns.join(', ')+(e.columnsStatus==='Specified columns'?'':' · '+e.columnsStatus):e.columnsStatus;
const table=e=>(e.table||'Unresolved table')+(e.environment==='Current environment'?'':' · selected environment');
const flowButton=r=>'<button type="button" class="btn btn-outline small" data-fa-flow="'+r.index+'">'+esc(r.name)+'</button>';
function chart(rows,key,title){
 const max=Math.max(1,...rows.map(r=>r.analytics?.[key]||0));
 return '<div><h3>'+title+'</h3><ol class="fa-bars">'+rows.map(r=>{
  const a=r.analytics,value=a?.[key];
  return '<li>'+flowButton(r)+'<span class="fa-bar-track" aria-hidden="true"><span style="width:'+((value||0)/max*100)+'%"></span></span><strong>'+ (a?(a.complete?'':'≥ ')+value:'Unknown')+'</strong></li>';
 }).join('')+'</ol></div>';
}
function grid(rows,kind){
 const entries=rows.flatMap(r=>r[kind].map(e=>({r,e}))).sort((a,b)=>table(a.e).localeCompare(table(b.e))||a.r.name.localeCompare(b.r.name));
 if(!entries.length)return '<p>No matching '+(kind==='triggers'?'Dataverse row-change triggers':'supported Dataverse row writes')+' found in loaded definitions.</p>';
 return '<table><thead><tr><th scope="col">Table</th><th scope="col">Flow</th><th scope="col">Step</th><th scope="col">'+(kind==='triggers'?'Change type':'Operation')+'</th><th scope="col">Columns</th></tr></thead><tbody>'+entries.map(({r,e})=>'<tr><td>'+esc(table(e))+'</td><td>'+flowButton(r)+'</td><td>'+esc(e.step)+'</td><td>'+esc(kind==='triggers'?e.change+(e.filtered?' · row filter defined':''):e.operation)+'</td><td>'+esc(columns(e))+'</td></tr>').join('')+'</tbody></table>';
}
function network(rows){
 const connected=rows.filter(r=>r.triggers.length||r.writes.length);
 if(!connected.length)return '<p>No supported table dependencies to draw.</p>';
 // Show all matches, with shared table nodes in each role; no silent graph truncation.
 const inputs=new Map(),outputs=new Map();
 const key=(r,e)=>e.environment==='Current environment'&&e.table?e.table:'flow'+r.index+':'+e.step+':'+table(e);
 for(const r of connected){for(const e of r.triggers)inputs.set(key(r,e),table(e));for(const e of r.writes)outputs.set(key(r,e),table(e));}
 const height=Math.max(240,Math.max(inputs.size,outputs.size,connected.length)*86+80),width=1140;
 const position=(map,x)=>new Map([...map].map(([k,label],i)=>[k,{x,y:70+i*86,label}]));
 const left=position(inputs,20),right=position(outputs,830);let nodes='',links='';
 const node=(p,label,flow)=>'<g'+(flow===undefined?'':' role="button" tabindex="0" data-fa-flow="'+flow+'" aria-label="Inspect '+esc(label)+'"')+'><title>'+esc(label)+'</title><rect x="'+p.x+'" y="'+p.y+'" width="290" height="54" rx="9" fill="'+(flow===undefined?'#f1f6fc':'#ede8ff')+'" stroke="#8391ab"/><text x="'+(p.x+12)+'" y="'+(p.y+31)+'" fill="#243453" font-size="13">'+esc(label.length>35?label.slice(0,34)+'…':label)+'</text></g>';
 for(const p of [...left.values(),...right.values()])nodes+=node(p,p.label);
 const arrow=(a,b,color,id,caption)=>'<path d="M '+(a.x+290)+' '+(a.y+27)+' C '+(a.x+335)+' '+(a.y+27)+', '+(b.x-45)+' '+(b.y+27)+', '+b.x+' '+(b.y+27)+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#'+id+')"><title>'+esc(caption)+'</title></path>';
 connected.forEach((r,i)=>{
  const p={x:425,y:70+i*86};nodes+=node(p,r.name,r.index);
  for(const e of r.triggers)links+=arrow(left.get(key(r,e)),p,'#3977ce','fa-trigger-arrow',table(e)+' → '+r.name+' · '+e.change+' · '+columns(e));
  for(const e of r.writes)links+=arrow(p,right.get(key(r,e)),'#087f75','fa-write-arrow',r.name+' → '+table(e)+' · '+e.operation+' · '+columns(e));
 });
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="group" aria-label="Table triggers, flows and table writes" font-family="Arial, sans-serif"><defs>'+[['fa-trigger-arrow','#3977ce'],['fa-write-arrow','#087f75']].map(([id,c])=>'<marker id="'+id+'" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="'+c+'"/></marker>').join('')+'</defs><text x="20" y="30" fill="#243453">TRIGGER TABLES</text><text x="425" y="30" fill="#243453">POWER AUTOMATE FLOWS</text><text x="830" y="30" fill="#243453">TABLES WRITTEN</text>'+links+nodes+'</svg>';
}
function render(){
 const q=$('flow-analytics-filter').value.trim().toLowerCase();
 const rows=records.filter(r=>[r.name,...[...r.triggers,...r.writes].flatMap(e=>[e.table,e.step,...e.columns])].some(v=>String(v||'').toLowerCase().includes(q)));
 const incomplete=rows.filter(r=>!r.analytics?.complete).length,unresolved=rows.reduce((n,r)=>n+(r.analytics?.unresolved||0),0),unsupported=rows.reduce((n,r)=>n+(r.analytics?.unsupported||0),0);
 $('flow-analytics-status').textContent=records.length?rows.length+' of '+records.length+' loaded flows · '+incomplete+' incomplete or unavailable analyses · '+unresolved+' unresolved mappings · '+unsupported+' operations outside supported mapping. The solution loader includes up to 100 flow definitions.':'Load a solution or standalone flow JSON above to see complexity and table impact. Live inventory without definitions cannot be analysed.';
 $('flow-analytics-charts').innerHTML=rows.length?chart(rows,'actionCount','Actions per flow')+chart(rows,'maxDepth','Maximum nesting depth'):'<p>No matching flows.</p>';
 $('flow-analytics-triggers').innerHTML=grid(rows,'triggers');
 $('flow-analytics-writes').innerHTML=grid(rows,'writes');
 $('flow-analytics-network').innerHTML=network(rows);
}
const section=$('flow-analytics');
section.addEventListener('click',e=>{const target=e.target.closest('[data-fa-flow]');if(target)document.dispatchEvent(new CustomEvent('flow-analytics-select',{detail:Number(target.dataset.faFlow)}));});
section.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('g[data-fa-flow]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
$('flow-analytics-filter').addEventListener('input',render);
root.SolutionFlowAnalyticsUI={setFlows(flows,components){records=SolutionFlowAnalytics.portfolio(flows,components);render();}};
})(globalThis);
