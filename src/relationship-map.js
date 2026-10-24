/* Complete, local-only graph of the table relationships actually present in an export.
 * Never infer an edge from a relationship name or silently truncate a graph. */
(function(root){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const norm=s=>String(s||'').trim().toLowerCase();
 const shorten=(s,n=26)=>s.length>n?s.slice(0,n-1)+'…':s;
 function kindOf(s){const k=norm(s).replace(/[\s_-]/g,'');return k.includes('manytomany')||k==='n:n'?'Many-to-many':k.includes('manytoone')||k==='n:1'?'Many-to-one':k.includes('onetomany')||k==='1:n'?'One-to-many':s||'Unspecified';}
 function extract(model){
  const known=new Map((model?.components||[]).filter(c=>c.type==='table').map(c=>[norm(c.name),c]));
  const relationships=(model?.components||[]).filter(c=>c.type==='relationship');
  const edges=relationships.map(c=>{
   const p=c.properties||{},source=String(p.source||'').trim(),target=String(p.target||'').trim();
   return {id:c.id,name:c.name,source,target,kind:kindOf(p.kind),complete:!!(source&&target),sourcePresent:known.has(norm(source)),targetPresent:known.has(norm(target))};
  });
  return {edges,known};
 }
 function filter(model,{query='',kind='all',table='all'}={}){
  const {edges,known}=extract(model),q=norm(query),selected=norm(table);
  return {known,all:edges,visible:edges.filter(e=>(kind==='all'||e.kind===kind)&&(table==='all'||norm(e.source)===selected||norm(e.target)===selected)&&(!q||[e.name,e.source,e.target,e.kind].some(x=>norm(x).includes(q))))};
 }
 function svg(edges,known=new Map()){
  const valid=edges.filter(e=>e.complete);
  if(!valid.length)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 200" role="img" aria-label="No mappable relationships"><rect width="760" height="200" rx="16" fill="#f6f8fd"/><text x="380" y="105" text-anchor="middle" fill="#65748e" font-family="Arial">No relationships with both table endpoints in this view</text></svg>';
  const keys=[...new Set(valid.flatMap(e=>[norm(e.source),norm(e.target)]))].sort();
  const labels=new Map(valid.flatMap(e=>[[norm(e.source),e.source],[norm(e.target),e.target]]));
  const cols=Math.min(5,Math.max(2,Math.ceil(Math.sqrt(keys.length))));
  const rows=Math.ceil(keys.length/cols),dx=250,dy=148,width=cols*dx+42,height=rows*dy+65;
  const positions=new Map(keys.map((id,i)=>[id,{x:28+(i%cols)*dx,y:30+Math.floor(i/cols)*dy}]));
  let paths='';
  for(const edge of valid){const a=positions.get(norm(edge.source)),b=positions.get(norm(edge.target));if(!a||!b)continue;
   const x1=a.x+106,y1=a.y+44,x2=b.x+106,y2=b.y+44;
   const colour=edge.kind==='Many-to-many'?'#d28b42':edge.kind==='Many-to-one'?'#2d9c95':'#7667d4';
   if(a===b){paths+=`<path d="M ${x1+65} ${y1-25} C ${x1+156} ${y1-115}, ${x1-154} ${y1-115}, ${x1-65} ${y1-25}" fill="none" stroke="${colour}" stroke-width="2" marker-end="url(#rel-arrow)"><title>${esc(edge.name)} · ${esc(edge.kind)}</title></path>`;continue;}
   const offset=x2>x1?75:x2<x1?-75:0;
   const d=`M ${x1+offset} ${y1} C ${x1+offset+(x2-x1)*.3} ${y1}, ${x2-offset-(x2-x1)*.3} ${y2}, ${x2-offset} ${y2}`;
   paths+=`<path d="${d}" fill="none" stroke="${colour}" stroke-width="1.8" marker-end="url(#rel-arrow)" opacity=".62"><title>${esc(edge.name)}: ${esc(edge.source)} → ${esc(edge.target)} (${esc(edge.kind)})</title></path>`;
  }
  const counts=new Map();for(const e of valid){const a=norm(e.source),b=norm(e.target);counts.set(a,(counts.get(a)||0)+1);if(a!==b)counts.set(b,(counts.get(b)||0)+1);}
  let nodes='';for(const key of keys){const p=positions.get(key),name=labels.get(key),external=!known.has(key);
   const count=counts.get(key)||0;
   nodes+=`<g data-relationship-table="${esc(name)}" tabindex="0" role="button" aria-label="Focus relationships for ${esc(name)}"><rect x="${p.x}" y="${p.y}" width="212" height="88" rx="13" fill="${external?'#fff9ee':'#fff'}" stroke="${external?'#e4b674':'#cbd3e9'}" stroke-width="1.6"/><rect x="${p.x}" y="${p.y}" width="6" height="88" rx="3" fill="${external?'#db9c46':'#7463d8'}"/><text x="${p.x+17}" y="${p.y+35}" fill="#202d4a" font-family="Arial" font-size="14" font-weight="bold">${esc(shorten(name))}</text><text x="${p.x+17}" y="${p.y+62}" fill="#6a7892" font-family="Arial" font-size="11">${count} link${count===1?'':'s'}${external?' · External table':''}</text><title>${esc(name)}${external?' (not defined in this solution)':''}</title></g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Relationship map with ${keys.length} tables and ${valid.length} relationships"><defs><marker id="rel-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#78859f"/></marker></defs><rect width="100%" height="100%" rx="16" fill="#f7f9fd"/>${paths}${nodes}<text x="${width-20}" y="${height-12}" text-anchor="end" font-family="Arial" font-size="10" fill="#7e8ca4">Every mapped relationship in the selected view · generated locally</text></svg>`;
 }
 root.SolutionRelationshipMap={extract,filter,svg,kindOf};
})(globalThis);
