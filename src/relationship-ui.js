/* Searchable all-relationships graph with a fully exportable edge list. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),graph=root.SolutionRelationshipMap;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let model=null,view=null,erd=null;
 function render(){
  const opts={query:$('relationship-search').value,kind:$('relationship-kind').value,table:$('relationship-table').value};
  view=graph.filter(model,opts);
  const complete=view.visible.filter(e=>e.complete).length;
  $('relationship-summary').textContent=`${view.visible.length} of ${view.all.length} relationships · ${complete} mapped · ${view.visible.length-complete} missing endpoint metadata. External tables are shown where named.`;
  erd=root.SolutionERD.filter(root.SolutionERD.build(model),opts);
  $('relationship-stage').innerHTML=root.SolutionERD.svg(erd,$('erd-keys-only').checked);
  $('relationship-summary').textContent=erd.tables.length+' tables / '+erd.tables.reduce((n,t)=>n+t.columns.length,0)+' columns / '+view.visible.length+' relationships. Missing endpoints: '+(view.visible.length-complete)+'. PK/FK require explicit metadata. Cardinalities show N:1 or N:N; optionality is unspecified.';
  for(const kind of ['mermaid','docx','pptx'])$('relationship-'+kind).disabled=!model;
  $('relationship-rows').innerHTML=view.visible.length?view.visible.map(e=>`<tr><td>${esc(e.name)}</td><td>${esc(e.source||'Not supplied')}</td><td>${esc(e.target||'Not supplied')}</td><td>${esc(e.kind)}</td><td>${e.complete?'Mapped':'Incomplete metadata'}${e.complete&&(!e.sourcePresent||!e.targetPresent)?' · External table':''}</td></tr>`).join(''):'<tr><td colspan="5" class="empty-state">No relationships match these filters.</td></tr>';
  $('relationship-svg').disabled=!model||!erd.tables.length;
  $('relationship-csv').disabled=!model||!view.all.length;
 }
 function rebuild(modelValue){model=modelValue;
  const info=graph.extract(model),kinds=[...new Set(info.edges.map(e=>e.kind))].sort();
  $('relationship-kind').innerHTML='<option value="all">All relationship types</option>'+kinds.map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('');
  const names=[...new Set([...info.known.values()].map(c=>c.name).concat(info.edges.flatMap(e=>[e.source,e.target])).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  $('relationship-table').innerHTML='<option value="all">All tables</option>'+names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('');
  $('relationship-search').value='';render();
 }
 function save(name,body,mime){const blob=new Blob([body],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
 function quote(value){const s=String(value||'');return '"'+(/^[=+\-@\t\r]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"';}
 $('relationship-search').addEventListener('input',render);$('relationship-table').addEventListener('change',render);$('relationship-kind').addEventListener('change',render);
 $('relationship-clear').addEventListener('click',()=>{$('relationship-search').value='';$('relationship-kind').value='all';$('relationship-table').value='all';render();});
 $('relationship-stage').addEventListener('click',e=>{const n=e.target.closest('[data-relationship-table]');if(n){$('relationship-table').value=n.getAttribute('data-relationship-table');render();}});
 $('relationship-stage').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const n=e.target.closest('[data-relationship-table]');if(n){e.preventDefault();$('relationship-table').value=n.getAttribute('data-relationship-table');render();}});
 $('relationship-svg').addEventListener('click',()=>{if(view)save('solution-relationships.svg',root.SolutionERD.svg(erd,$('erd-keys-only').checked),'image/svg+xml');});
 $('relationship-csv').addEventListener('click',()=>{if(!view)return;const data=[['Name','Source table','Target table','Kind','Source in solution','Target in solution','Both endpoints known'],...view.all.map(e=>[e.name,e.source,e.target,e.kind,e.sourcePresent,e.targetPresent,e.complete])];save('solution-relationships.csv',data.map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n','text/csv');});
 $('erd-keys-only').addEventListener('change',render);
 $('relationship-mermaid').addEventListener('click',()=>{if(erd)save('solution-erd.mmd',root.SolutionERD.mermaid(erd),'text/plain');});
 for(const kind of ['docx','pptx'])$('relationship-'+kind).addEventListener('click',async e=>{const button=e.currentTarget,status=$('erd-export-status');button.disabled=true;try{status.textContent='Generating full editable ERD…';const blob=await root.SolutionOffice[kind](root.SolutionReports.erd(model));root.SolutionComponentUI.save('solution-erd.'+kind,blob);status.textContent='Full editable ERD downloaded.';}catch(error){status.textContent='Export failed: '+error.message;}finally{button.disabled=!model;}});
 document.addEventListener('solution-workspace-change',e=>rebuild(e.detail.a));
 rebuild(null);
})(globalThis);
