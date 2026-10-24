/* Complete ERD projection: all packaged tables, isolated tables, columns and explicit edges.
 * External endpoints are marked. No foreign keys or cardinalities are guessed from names. */
(function(root){
'use strict';
const norm=s=>String(s||'').trim().toLowerCase(),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function build(m){
 const tables=new Map((m?.components||[]).filter(c=>c.type==='table').map(c=>[norm(c.name),{id:norm(c.name),name:c.name,displayName:c.properties?.displayName||c.name,external:c.coverage==='referenced',primaryId:c.properties?.primaryId||'',columns:[]}]));
 const edges=(root.SolutionRelationshipMap?.extract(m).edges||[]).map(e=>{const c=m.components.find(c=>c.id===e.id),p=c.properties||{},many=e.kind==='Many-to-many',known=['One-to-many','Many-to-one'].includes(e.kind);
  return {...e,sourceId:norm(e.source),targetId:norm(e.target),sourceAttribute:p.sourceAttribute||'',targetAttribute:p.targetAttribute||'',intersectEntity:p.intersectEntity||'',sourceCardinality:many?'N':known?'N':'?',targetCardinality:many?'N':known?'1':'?'};
 });
 for(const edge of edges)for(const name of [edge.source,edge.target])if(name&&!tables.has(norm(name)))tables.set(norm(name),{id:norm(name),name,displayName:name,external:true,primaryId:'',columns:[]});
 for(const c of (m?.components||[]).filter(c=>c.type==='column')){
  const p=c.properties||{},table=tables.get(norm(p.table||c.name.split('.')[0]));if(!table)continue;
  const name=c.name.split('.').pop(),pk=norm(name)===norm(table.primaryId)||/^(true|1)$/i.test(p.isPrimaryId||'')||norm(p.dataType)==='primarykey';
  const refs=edges.filter(e=>e.kind!=='Many-to-many'&&e.sourceId===table.id&&norm(e.sourceAttribute)===norm(name));
  table.columns.push({id:c.id,name,displayName:p.displayName||name,type:p.dataType||'Unknown',required:p.required||'Not supplied',pk,fk:refs.length>0,references:refs.map(e=>e.target+(e.targetAttribute?'.'+e.targetAttribute:''))});
 }
 // Keep explicitly named key fields visible even if this solution omitted their definitions.
 for(const edge of edges)if(edge.kind!=='Many-to-many'){
  for(const [tableId,name,isForeign] of [[edge.sourceId,edge.sourceAttribute,true],[edge.targetId,edge.targetAttribute,false]]){
   const t=tables.get(tableId);if(!t||!name||t.columns.some(c=>norm(c.name)===norm(name)))continue;
   t.columns.push({name,type:'Definition absent',required:'Not supplied',pk:!isForeign&&norm(name)===norm(t.primaryId),fk:isForeign,references:isForeign?[edge.target]:[],external:true});
  }
 }
 return {title:'Full entity relationship diagram',tables:[...tables.values()].sort((a,b)=>a.name.localeCompare(b.name)),edges,issues:edges.filter(e=>!e.complete).map(e=>e.name+': relationship endpoint missing'),note:'N and 1 show declared referencing and referenced sides. Optionality is not inferred. Amber tables are external references. PK and FK markers require explicit metadata.'};
}
function filter(erd,{query='',table='all',kind='all'}={}){
 const q=norm(query),chosen=norm(table),edges=erd.edges.filter(e=>(kind==='all'||e.kind===kind)&&(table==='all'||[e.sourceId,e.targetId].includes(chosen))&&(!q||[e.name,e.source,e.target,e.sourceAttribute,e.targetAttribute].some(x=>norm(x).includes(q))));
 const ids=new Set(edges.flatMap(e=>[e.sourceId,e.targetId]));
 return {...erd,edges,tables:erd.tables.filter(t=>table==='all'&&!q&&kind==='all'||ids.has(t.id)||kind==='all'&&(table==='all'||t.id===chosen)&&(!q||norm(t.name+' '+t.displayName+' '+t.columns.map(c=>c.name).join(' ')).includes(q)))};
}
function layout(erd,keysOnly=false){
 const cols=Math.min(4,Math.max(1,Math.ceil(Math.sqrt(erd.tables.length)))),width=cols*382+32,positions=new Map();let y=40;
 for(let start=0;start<erd.tables.length;start+=cols){const row=erd.tables.slice(start,start+cols);let max=0;
  for(const [i,t] of row.entries()){const columns=keysOnly?t.columns.filter(c=>c.pk||c.fk):t.columns,height=70+Math.max(1,columns.length)*23;positions.set(t.id,{x:24+i*382,y,w:342,h:height,columns});max=Math.max(max,height);}y+=max+100;
 }
 return {width:Math.max(width,400),height:Math.max(y,180),positions};
}
function svg(erd,keysOnly=false){
 const {width,height,positions}=layout(erd,keysOnly);let lines='',nodes='';
 const counts=new Map();
 for(const e of erd.edges){const a=positions.get(e.sourceId),b=positions.get(e.targetId);if(!a||!b)continue;
  const k=[e.sourceId,e.targetId].sort().join('|'),index=counts.get(k)||0;counts.set(k,index+1);
  const x1=a.x+a.w/2,y1=a.y+24,x2=b.x+b.w/2,y2=b.y+24,offset=25+index*14;
  const d=a===b?`M ${a.x+a.w} ${a.y+20} C ${a.x+a.w+80+index*14} ${a.y-90}, ${a.x-80} ${a.y-90}, ${a.x} ${a.y+20}`:`M ${x1} ${y1} Q ${(x1+x2)/2} ${Math.min(y1,y2)-offset} ${x2} ${y2}`;
  lines+=`<g><path d="${d}" fill="none" stroke="#20a997" stroke-width="2"/><text x="${(x1+x2)/2}" y="${Math.min(y1,y2)-offset/2-4}" fill="#21566a" font-family="Arial" font-size="11" text-anchor="middle">${esc(e.name)} (${e.sourceCardinality}:${e.targetCardinality})</text><title>${esc(e.name)}: ${esc(e.source)}.${esc(e.sourceAttribute)} → ${esc(e.target)}.${esc(e.targetAttribute)}${e.intersectEntity?' via '+esc(e.intersectEntity):''}</title></g>`;
 }
 for(const t of erd.tables){const p=positions.get(t.id);nodes+=`<g data-relationship-table="${esc(t.name)}" tabindex="0" role="button" aria-label="Focus ERD on ${esc(t.name)}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="7" fill="${t.external?'#fff8e9':'white'}" stroke="${t.external?'#c68d35':'#6957db'}"/><text x="${p.x+12}" y="${p.y+24}" fill="#192444" font-family="Arial" font-size="14" font-weight="bold">${esc(t.name)}</text><text x="${p.x+12}" y="${p.y+44}" fill="#54627b" font-family="Arial" font-size="10">${t.external?'External table · ':''}${t.columns.length} columns${keysOnly?' · keys shown':''}</text>`;
  for(const [i,c] of p.columns.entries())nodes+=`<text x="${p.x+12}" y="${p.y+71+i*23}" font-family="monospace" font-size="11" fill="#253753">${esc((c.pk?'PK ':c.fk?'FK ':'   ')+c.name+' : '+c.type)}<title>${esc(c.displayName)} · Required: ${esc(c.required)}${c.references.length?' · References '+esc(c.references.join(', ')):''}</title></text>`;
  if(!p.columns.length)nodes+=`<text x="${p.x+12}" y="${p.y+71}" font-family="Arial" font-size="11" fill="#65748e">${t.external?'Column definitions not packaged':keysOnly?'No explicit keys in metadata':'No column definitions in export'}</text>`;nodes+='</g>';
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Full ERD with ${erd.tables.length} tables and ${erd.edges.length} relationships"><rect width="100%" height="100%" fill="#f7f9fd"/>${lines}${nodes}</svg>`;
}
function mermaid(erd){
 const ids=new Map(erd.tables.map((t,i)=>[t.id,'E'+i])),quote=s=>String(s||'').replace(/["\r\n{}]/g,' ').replace(/\\/g,'/');
 let result='erDiagram\n';
 for(const t of erd.tables){result+=`    ${ids.get(t.id)}["${quote(t.name)}${t.external?' (external)':''}"] {\n`;for(const [i,c] of t.columns.entries())result+=`        ${String(c.type).replace(/\W/g,'_')||'unknown'} c${i}${c.pk?' PK':c.fk?' FK':''} "${quote(c.name)}"\n`;result+='    }\n';}
 for(const e of erd.edges)if(e.complete){const rel=e.kind==='Many-to-many'?'}o--o{':e.targetCardinality==='1'?'}o--||':'}o--o{';result+=`    ${ids.get(e.sourceId)} ${rel} ${ids.get(e.targetId)} : "${quote(e.name)}"\n`;}
 return result+'%% Optionality is unspecified in the source. Mermaid circle ends are diagram notation only.\n';
}
// Diagrams split by table and by edge, so links crossing any page boundary cannot disappear.
function pages(erd){const pages=[];
 for(let i=0;i<erd.tables.length;i+=6)pages.push({kind:'erd-index',title:'ERD table index',tables:erd.tables.slice(i,i+6),edges:[],note:erd.note});
 for(const t of erd.tables){let columns=[],height=0,start=0;
  const emit=()=>{pages.push({kind:'erd-table',title:t.name+' columns',tables:[{...t,columns}],edges:[],note:`Columns ${t.columns.length?start+1:0}–${start+columns.length} of ${t.columns.length}. ${t.external?'External table. ':''}${erd.note}`});start+=columns.length;columns=[];height=0;};
  for(const c of t.columns){const h=Math.ceil((c.name.length+c.type.length+c.required.length+25)/130)*.18+.08;if(height+h>4.55&&columns.length)emit();columns.push(c);height+=h;}if(columns.length||!t.columns.length)emit();
 }
 for(const e of erd.edges)pages.push({kind:'erd-edge',title:e.name,tables:erd.tables.filter(t=>[e.sourceId,e.targetId].includes(t.id)).map(t=>({...t,columns:t.columns.filter(c=>[e.sourceAttribute,e.targetAttribute].some(x=>norm(x)===norm(c.name))||c.pk)})),edges:[e],note:e.complete?`${e.source} (${e.sourceCardinality}) → ${e.target} (${e.targetCardinality})${e.intersectEntity?' · Intersect: '+e.intersectEntity:''}`:'Endpoint metadata is incomplete.'});
 return pages;
}
root.SolutionERD={build,filter,svg,mermaid,pages};
})(globalThis);
