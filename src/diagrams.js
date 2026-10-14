/* No remote renderer: diagrams are generated as safe, portable SVG locally. */
(function(root){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const palette={table:'#7765e8',flow:'#159e98',webresource:'#ed9c50',connection:'#4698d7',environment:'#bd6ed7',app:'#5567b9',relationship:'#9cabc0'};
 function chunk(s,max=23){s=String(s);return s.length>max?s.slice(0,max-1)+'…':s;}
 function build(model,mode='data'){
  if(!model)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 300"><text x="50" y="140">Load a solution to generate a diagram.</text></svg>';
  const all=model.components;let nodes=[],edges=[];
  if(mode==='data'){
   const tables=all.filter(c=>c.type==='table').slice(0,28);
   nodes=tables.map(c=>({id:c.name,label:c.name,category:'table',detail:all.filter(x=>x.type==='column'&&x.properties.table===c.name).length+' columns'}));
   edges=all.filter(c=>c.type==='relationship').map(c=>({from:c.properties.source,to:c.properties.target,label:c.name})).filter(e=>nodes.some(n=>n.id===e.from)&&nodes.some(n=>n.id===e.to)).slice(0,42);
  }else if(mode==='integrations'){
   const flows=all.filter(c=>c.type==='flow').slice(0,15),refs=all.filter(c=>c.type==='connection').slice(0,15),vars=all.filter(c=>c.type==='environment').slice(0,12);
   nodes=[...flows,...refs,...vars].map(c=>({id:c.id,label:c.name,category:c.type,detail:root.SolutionCore.LABELS[c.type]}));
   edges=flows.flatMap(f=>(f.properties.connectionReferences||'').split(',').map(x=>x.trim()).filter(Boolean).map(x=>({from:f.id,to:'connection:'+x.toLowerCase(),label:'Uses'}))).filter(e=>nodes.some(n=>n.id===e.to));
  }else{
   const counts=Object.entries(model.counts).filter(([,n])=>n>0);
   nodes=[{id:'solution',label:model.info.name||'Solution',category:'app',detail:model.info.version||'Imported ZIP'},...counts.map(([key,count])=>({id:key,label:root.SolutionCore.LABELS[key],category:key,detail:count+' components'}))];
   edges=counts.map(([key])=>({from:'solution',to:key,label:''}));
  }
  if(!nodes.length)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 260" role="img" aria-label="No diagram components"><rect width="720" height="260" rx="24" fill="#f7f8fc"/><text x="360" y="128" font-family="Arial" text-anchor="middle" fill="#68758c" font-size="18">No matching components found</text></svg>`;
  const cols=Math.min(mode==='overview'?4:3,Math.max(1,Math.ceil(Math.sqrt(nodes.length*1.25))));const rows=Math.ceil(nodes.length/cols);const width=Math.max(690,cols*240+55),height=Math.max(260,rows*142+65);
  const positions=new Map();let shapes='';
  for(let i=0;i<nodes.length;i++){
   const n=nodes[i],col=i%cols,row=Math.floor(i/cols),x=32+col*240,y=35+row*142;positions.set(n.id,{x:x+100,y:y+43});
   const color=palette[n.category]||'#8898a9';
   shapes+=`<g><rect x="${x}" y="${y}" width="205" height="88" rx="15" fill="#ffffff" stroke="#dbe0ed" stroke-width="1.5"/><rect x="${x}" y="${y}" width="6" height="88" rx="3" fill="${color}"/><text x="${x+18}" y="${y+34}" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#1c2641">${esc(chunk(n.label))}</text><text x="${x+18}" y="${y+60}" font-family="Arial, sans-serif" font-size="12" fill="#65748e">${esc(chunk(n.detail||''))}</text><title>${esc(n.label)}</title></g>`;
  }
  let lines='';
  for(const edge of edges){const a=positions.get(edge.from),b=positions.get(edge.to);if(!a||!b||a===b)continue;
   const startX=a.x+(a.x<b.x?85:-85),startY=a.y;const endX=b.x+(a.x<b.x?-85:85),endY=b.y;
   lines+=`<path d="M ${startX} ${startY} C ${startX+(endX-startX)*0.55} ${startY}, ${endX-(endX-startX)*0.55} ${endY}, ${endX} ${endY}" fill="none" stroke="#a5b2cb" stroke-width="2" marker-end="url(#arrow)" opacity="0.95"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(mode)} diagram"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#8999b4"/></marker></defs><rect width="100%" height="100%" fill="#f6f8fd" rx="18"/>${lines}${shapes}<text x="${width-20}" y="${height-14}" font-family="Arial" font-size="10" text-anchor="end" fill="#8b97ac">Mightora Solution Explorer · generated locally</text></svg>`;
 }
 root.SolutionDiagrams={build};
})(globalThis);
