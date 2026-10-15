/* Cleaner, structural Power Automate flow map. All rendering is local and read-only.
 * A drawn solid connector always reflects an explicit WDL dependency; dotted rails show containment. */
(function(root){
'use strict';
const api=root.SolutionFlowExplorer;
const esc=api.escape;
const short=(v,max=58)=>{const s=String(v??'').replace(/[\r\n\t]/g,' ').trim();return s.length>max?s.slice(0,max-1)+'…':s;};
const kinds={trigger:'#3977CE',condition:'#815BC8',loop:'#C17A2B',scope:'#6B64AC',connector:'#149C8F',action:'#647D99'};
function category(s){
 if(s.branch==='Trigger')return 'trigger';
 if(/^(if|switch)$/i.test(s.type))return 'condition';
 if(/^(foreach|until)$/i.test(s.type))return 'loop';
 if(/scope/i.test(s.type))return 'scope';
 if(/openapiconnection|apiconnection|http|servicebus/i.test(s.type))return 'connector';
 return 'action';
}
function branchName(name,parentType){
 if(name==='Body')return /^If$/i.test(parentType)?'YES / TRUE':/foreach|until/i.test(parentType)?'LOOP BODY':'CONTAINED ACTIONS';
 if(name==='Else')return 'NO / FALSE';
 if(name==='Default')return 'DEFAULT';
 return name.replace(/^Case /,'CASE ' ).toUpperCase();
}
function layout(flow,limit=140){
 if(!flow?.steps)return {rows:[],edges:[],shown:0,truncated:0};
 const all=flow.steps.slice(0,limit),byId=new Map(all.map(s=>[s.id,s]));
 const children=new Map();for(const s of all){const key=s.parent||'root';if(!children.has(key))children.set(key,[]);children.get(key).push(s);}
 const explicit=(flow.edges||[]).filter(e=>e.kind==='dependency'&&byId.has(e.from)&&byId.has(e.to));
 const sortPeers=peers=>{
  const rank=new Map(peers.map(s=>[s.id,0]));
  // Topological layers preserve explicit runAfter dependencies without inventing ordering.
  for(let k=0;k<peers.length;k++){let updated=false;for(const e of explicit){
   if(!rank.has(e.from)||!rank.has(e.to)||e.from===e.to)continue;
   const next=Math.min(peers.length,rank.get(e.from)+1);if(next>rank.get(e.to)){rank.set(e.to,next);updated=true;}
  }if(!updated)break;}
  return [...peers].sort((a,b)=>rank.get(a.id)-rank.get(b.id)||all.indexOf(a)-all.indexOf(b));
 };
 const rows=[],visited=new Set();
 function renderGroup(parent,depth){
  const peers=children.get(parent)||[];
  const groups=new Map();for(const s of peers){const b=s.branch||'Main';if(!groups.has(b))groups.set(b,[]);groups.get(b).push(s);}
  const branchOrder=[...groups.keys()].sort((a,b)=>{
   const rank=x=>x==='Trigger'?0:x==='Main'?1:x==='Body'?2:x==='Else'?3:x.startsWith('Case ')?4:x==='Default'?5:6;
   return rank(a)-rank(b);
  });
  for(const b of branchOrder){
   if(parent!=='root')rows.push({kind:'branch',branch:branchName(b,byId.get(parent)?.type),depth,parent});
   for(const s of sortPeers(groups.get(b))){
    if(visited.has(s.id))continue;visited.add(s.id);
    rows.push({kind:'step',step:s,depth,parent,branch:b,category:category(s)});
    if(depth<10)renderGroup(s.id,depth+1);
   }
  }
 }
 renderGroup('root',0);
 // Malformed parent references are still listed, rather than silently lost.
 for(const s of all)if(!visited.has(s.id))rows.push({kind:'step',step:s,depth:0,parent:null,branch:s.branch,category:category(s)});
 const ids=new Set(rows.filter(r=>r.step).map(r=>r.step.id));
 return {rows,edges:(flow.edges||[]).filter(e=>ids.has(e.from)&&ids.has(e.to)&&e.kind!=='nested'),shown:ids.size,truncated:Math.max(0,flow.steps.length-ids.size)};
}
function diagram(flow){
 if(!flow)return '';
 const model=layout(flow),lineHeight=92,branchHeight=35,top=164,width=1220;
 let y=top;const positions=new Map();
 for(const row of model.rows){row.y=y;if(row.kind==='step'){
  row.x=50+Math.min(row.depth,6)*73;row.w=490;
  positions.set(row.step.id,{x:row.x,y,w:row.w,center:y+36});y+=lineHeight;
 }else y+=branchHeight;}
 const height=Math.max(320,y+75);
 let rails='',boxes='',connectors='';
 const active=new Map();
 for(const row of model.rows){
  if(row.kind==='branch'){
   const x=53+Math.min(row.depth,6)*73;
   rails+=`<rect x="${x}" y="${row.y+2}" width="440" height="27" rx="9" fill="#EDEAF9"/><text x="${x+12}" y="${row.y+20}" font-family="Arial,sans-serif" font-size="11" font-weight="bold" fill="#6750A6">${esc(row.branch)}</text>`;
   continue;
  }
  const s=row.step,col=kinds[row.category],p=positions.get(s.id),x=p.x,sy=p.y;
  const key=String(row.category).toUpperCase();
  boxes+=`<g data-flow-step="${esc(s.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(s.name)}" aria-pressed="false" style="cursor:pointer">
    <rect x="${x}" y="${sy}" width="490" height="72" rx="12" fill="#FFFFFF" stroke="#CFD8E6" stroke-width="1.5"/>
    <rect x="${x}" y="${sy}" width="7" height="72" rx="3" fill="${col}"/>
    <rect x="${x+17}" y="${sy+12}" width="76" height="20" rx="10" fill="${col}" fill-opacity=".12"/>
    <text x="${x+55}" y="${sy+26}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9.5" font-weight="bold" fill="${col}">${esc(key)}</text>
    <text x="${x+105}" y="${sy+28}" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="#233552">${esc(short(s.name,46))}</text>
    <text x="${x+20}" y="${sy+54}" font-family="Arial,sans-serif" font-size="11" fill="#687993">${esc(short((s.branch==='Trigger'?'Entry point':s.type)+(s.operation?'  ·  '+s.operation:''),72))}</text>
    <title>${esc(s.name)} — ${esc(s.type)}. ${esc(s.branch)}. Select to inspect details.</title>
    </g>`;
  if(s.parent&&positions.has(s.parent)){
   const par=positions.get(s.parent),railX=x-23;
   rails+=`<path d="M ${railX} ${par.center+11} V ${sy+35} H ${x-4}" fill="none" stroke="#B6AADD" stroke-width="2" stroke-dasharray="4 5"/>`;
  }
 }
 let edgeCount=0;
 for(const e of model.edges){const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)continue;
  const lane=1052+edgeCount%8*17;edgeCount++;
  const color=e.kind==='dependency'?'#218F86':'#3977CE';
  connectors+=`<path d="M ${a.x+a.w+5} ${a.center} H ${lane} V ${b.center} H ${b.x+b.w+7}" fill="none" stroke="${color}" stroke-width="2" ${e.kind==='start'?'stroke-dasharray="6 5"':''} marker-end="url(#flowArrow)" opacity=".83"><title>${esc(e.kind==='dependency'?'Explicit runAfter: '+(e.label||'dependency'):'Trigger entry')}</title></path>`;
 }
 const notice=model.truncated?`<text x="50" y="${height-21}" font-family="Arial,sans-serif" font-size="12" fill="#975B28">${model.truncated} additional step(s) not shown in this overview. Refer to the action inventory.</text>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="group" aria-label="Power Automate workflow map: ${esc(flow.name)}"><defs><marker id="flowArrow" viewBox="0 0 9 9" refX="8" refY="4.5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L9 4.5L0 9Z" fill="#218F86"/></marker></defs><rect width="${width}" height="${height}" fill="#F5F7FC"/><rect x="26" y="20" width="1168" height="116" rx="16" fill="#FFFFFF" stroke="#DFE5F0"/><text x="50" y="51" font-size="20" font-weight="bold" fill="#20344F" font-family="Arial,sans-serif">${esc(short(flow.name,88))}</text><text x="50" y="78" font-size="12" fill="#61758E" font-family="Arial,sans-serif">${flow.triggerCount} trigger(s)  ·  ${flow.actionCount} actions  ·  ${model.edges.filter(x=>x.kind==='dependency').length} explicit runAfter connections</text><text x="50" y="108" font-size="11" fill="#687993" font-family="Arial,sans-serif">Solid teal → runAfter   ·   Dashed blue → trigger entry   ·   Dotted purple → contained in branch / scope. No implied order.</text>${rails}${connectors}${boxes}${notice}</svg>`;
}
api.layout=layout;
api.diagram=diagram;
api.category=category;
})(globalThis);
