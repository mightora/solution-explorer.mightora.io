/* Local, evidence-backed exploration. Arrows point from dependent to required component.
 * Text matches are candidates, never evidence that a dynamic runtime call executes. */
(function(root){
'use strict';
const norm=s=>String(s??'').trim().toLowerCase(),id=(t,n)=>t+':'+norm(n),escape=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const cache=new WeakMap(),labels={declared:'Declared dependency',metadata:'Metadata reference',source:'Reference found in source',possible:'Possible text match'};
const maxScan=32*1024*1024,maxEdges=50000;
function location(doc,offset){let lo=0,hi=doc.starts.length;while(lo+1<hi){const mid=(lo+hi)>>1;if(doc.starts[mid]<=offset)lo=mid;else hi=mid;}return {line:lo+1,column:offset-doc.starts[lo]+1};}
function documentFor(componentId,path,text,kind,language,index){text=String(text??'');const starts=[0];for(let i=0;i<text.length;i++)if(text[i]==='\n')starts.push(i+1);return {id:'document-'+index,componentId,path,text,kind,language,starts};}
function build(model){
 if(cache.has(model))return cache.get(model);
 const components=model.components||[],nodes=new Map(components.map(c=>[c.id,{...c,external:c.coverage==='referenced'}])),edges=new Map(),documents=[],warnings=[];
 const aliases=new Map();let scanned=0,total=0,edgeLimit=false;
 const alias=(name,c,kind='logical')=>{const key=norm(name);if(key.length<3)return;if(!aliases.has(key))aliases.set(key,[]);if(!aliases.get(key).some(a=>a.id===c.id))aliases.get(key).push({id:c.id,kind});};
 for(const c of components){alias(c.name,c);if(c.type==='column')alias(c.name.split('.').pop(),c,'column');if(c.type==='table'){if(c.properties?.entitySetName)alias(c.properties.entitySetName,c);if(c.properties?.displayName&&norm(c.properties.displayName)!==norm(c.name))alias(c.properties.displayName,c,'display');}}
 function node(key){if(!nodes.has(key))nodes.set(key,{id:key,type:key.split(':')[0],name:key.slice(key.indexOf(':')+1),properties:{},coverage:'referenced',external:true});}
 function add(from,to,kind,detail,origin={}){
  if(!from||!to||from===to)return;node(from);node(to);const key=[from,to,kind].join('|');let e=edges.get(key);
  if(!e){if(edges.size>=maxEdges){edgeLimit=true;return;}e={id:'reference-'+edges.size,from,to,kind,label:labels[kind],evidence:[],occurrences:0};edges.set(key,e);}e.occurrences++;
  if(e.evidence.length<8&&!e.evidence.some(x=>x.detail===detail&&x.path===origin.path&&x.line===origin.line))e.evidence.push({detail,...origin});
 }
 const existing=(type,name)=>nodes.has(id(type,name))?id(type,name):'';
 const column=(table,name)=>existing('column',table+'.'+name);
 for(const c of components){const p=c.properties||{};
  if(c.type==='column'&&p.table)add(c.id,id('table',p.table),'metadata','Column belongs to this table');
  if(c.type==='relationship')for(const [key,attribute] of [['source','sourceAttribute'],['target','targetAttribute']])if(p[key]){add(c.id,id('table',p[key]),'metadata',key+' endpoint');if(p[attribute]&&column(p[key],p[attribute]))add(c.id,column(p[key],p[attribute]),'metadata',key+' relationship column');}
  if(c.type==='flow')for(const ref of String(p.connectionReferences||'').split(',').map(s=>s.trim()).filter(Boolean))add(c.id,id('connection',ref),'metadata','Flow connection reference');
  for(const [type,key] of [['pluginassembly','assemblyname'],['pluginassembly','AssemblyName'],['plugintype','pluginType'],['pluginstep','step']])if(p[key]&&existing(type,p[key]))add(c.id,existing(type,p[key]),'metadata','Registration property '+key);
 }
 for(const d of model.dependencies||[])if(d.dependent&&d.required)add(d.dependent,d.required,'declared','Explicit MissingDependency declaration',{path:'solution.xml'});
 const libraryTables=new Map();
 for(const f of model.formLayouts||[]){const form=id('form',f.table+' / '+f.name);node(form);if(f.table)add(form,id('table',f.table),'metadata','Form table',{path:f.source});
  for(const t of f.tabs||[])for(const sec of t.sections||[])for(const field of sec.fields||[])if(field.field){const target=column(f.table,field.field);if(target)add(form,target,'metadata','Form control: '+t.name+' / '+sec.name+' / '+field.label,{path:f.source});}
  for(const h of f.events||[])if(h.library){const lib=h.sourceId||id('webresource',h.library);add(form,lib,'metadata',h.event+' / '+h.functionName+' / order '+h.order+(h.enabled?'':' / disabled'),{path:f.source,symbol:h.functionName});if(!libraryTables.has(lib))libraryTables.set(lib,new Set());libraryTables.get(lib).add(norm(f.table));}
 }
 for(const view of model.viewLayouts||[]){if(view.table)add(view.id,id('table',view.table),'metadata','View table',{path:view.source});for(const field of view.columns||[]){const target=column(view.table,field.name);if(target)add(view.id,target,'metadata','View column '+field.name,{path:view.source});}
  try{const d=new DOMParser().parseFromString(view.fetchXml||'','application/xml');for(const n of Array.from(d.getElementsByTagName('*'))){if(!['attribute','condition','order'].includes(norm(n.localName||n.nodeName)))continue;let parent=n.parentNode;while(parent&&!['entity','link-entity'].includes(norm(parent.localName||parent.nodeName)))parent=parent.parentNode;const table=parent?.getAttribute('name'),name=n.getAttribute('attribute')||n.getAttribute('name'),target=table&&name?column(table,name):'';if(target)add(view.id,target,'metadata','FetchXML '+(n.localName||n.nodeName)+' '+name,{path:view.source});}}catch{warnings.push('A view FetchXML reference could not be inspected.');}
 }
 for(const r of model.businessRules||[]){if(r.table)add(r.id,id('table',r.table),'metadata','Business rule table');
  for(const f of model.formLayouts||[]){const same=norm(f.table)===norm(r.table),specific=r.formIds?.some(x=>norm(x).replace(/[{}]/g,'')===norm(f.id).replace(/[{}]/g,''));if(specific||same&&['Entity','All forms'].includes(r.scope))add(id('form',f.table+' / '+f.name),r.id,'metadata','Rule applies to form / '+r.scope+' / '+r.state);}
  for(const step of r.steps||[])for(const match of String(step.detail||'').matchAll(/\b(?:Field|Attribute|AttributeName|ControlName)\s*:\s*([a-z_][\w]*)/gi)){const target=column(r.table,match[1]);if(target)add(r.id,target,'metadata',step.kind+' / '+step.name);}
 }
 for(const [owner,sources] of Object.entries(model.componentSources||{}))for(const s of sources){const text=String(s.text??'');if(documents.some(d=>d.componentId===owner&&d.path===s.path&&d.text===text))continue;documents.push(documentFor(owner,s.path,text,s.kind||'Source',s.language||'text',documents.length));total+=text.length;}
 for(const doc of documents){const remaining=maxScan-scanned;if(remaining<=0)break;const text=doc.text.slice(0,remaining);scanned+=text.length;
  // XML has structured evidence above. Lexical matches remain explicitly labelled.
  for(const match of text.matchAll(/[A-Za-z_][A-Za-z0-9_./-]*/g)){
   const token=norm(match[0]),candidates=aliases.get(token);if(!candidates)continue;
   for(const candidate of candidates){const target=nodes.get(candidate.id);let kind=candidate.kind==='display'||candidate.kind==='column'||candidates.length>1?'possible':'source';
    const context=libraryTables.get(doc.componentId);if(candidate.kind==='column'&&context?.size===1&&context.has(norm(target.properties?.table)))kind='source';
    if(!/[_./]/.test(token)&&candidate.kind!=='display')kind='possible';
    add(doc.componentId,candidate.id,kind,(kind==='possible'?'Literal name match; binding not established':'Exact exported name appears in source')+' / '+match[0],{documentId:doc.id,path:doc.path,...location(doc,match.index)});
   }
  }
  // Display names with spaces only qualify as quoted, possible Power Fx/text matches.
  for(const match of text.matchAll(/['"]([^'"\r\n]{3,120})['"]/g))for(const candidate of aliases.get(norm(match[1]))||[])if(candidate.kind==='display')add(doc.componentId,candidate.id,'possible','Quoted display name; formula binding not established',{documentId:doc.id,path:doc.path,...location(doc,match.index)});
 }
 if(scanned<total)warnings.push(`Source reference scanning covered ${scanned} of ${total} characters (32-million-character safety budget). Source search and original source remain available for the remaining text.`);
 if(edgeLimit)warnings.push('Reference graph reached its 50,000-edge safety budget. Additional references may exist.');
 if(Array.from(aliases.values()).some(xs=>xs.length>1))warnings.push('Some names are ambiguous across components; unbound text matches are classified as possible.');
 const incoming=new Map(),outgoing=new Map();for(const e of edges.values()){if(!incoming.has(e.to))incoming.set(e.to,[]);if(!outgoing.has(e.from))outgoing.set(e.from,[]);incoming.get(e.to).push(e);outgoing.get(e.from).push(e);}
 const result={model,nodes,edges:[...edges.values()],incoming,outgoing,documents,warnings,coverage:{components:components.length,external:[...nodes.values()].filter(c=>c.external).length,scannedCharacters:scanned,totalCharacters:total}};cache.set(model,result);return result;
}
function references(index,key,{direction='incoming',includePossible=false}={}){const values=direction==='both'?[...(index.incoming.get(key)||[]),...(index.outgoing.get(key)||[])]:direction==='outgoing'?index.outgoing.get(key)||[]:index.incoming.get(key)||[];return values.filter(e=>includePossible||e.kind!=='possible');}
function trace(index,key,{depth=3,direction='incoming',includePossible=false}={}){
 depth=Math.max(1,Math.min(8,Number(depth)||3));const visited=new Map([[key,{id:key,distance:0,path:[],possible:false}]]),queue=[key],selected=new Map();
 for(let head=0;head<queue.length;head++){const current=queue[head],prior=visited.get(current);if(prior.distance>=depth)continue;
  for(const e of references(index,current,{direction,includePossible})){selected.set(e.id,e);const next=e.from===current?e.to:e.from;if(!visited.has(next)){visited.set(next,{id:next,distance:prior.distance+1,path:[...prior.path,e.id],possible:prior.possible||e.kind==='possible'});queue.push(next);}}
 }
 return {root:key,nodes:[...visited.values()].map(v=>({...index.nodes.get(v.id),...v})),edges:[...selected.values()],depth,direction,includePossible};
}
function search(index,query,{scope='all',type='all',offset=0,limit=100}={}){
 const q=norm(query),results=[];let total=0;if(q.length<2)return {results,total:0,note:'Enter at least two characters.'};
 const add=r=>{if(total>=offset&&results.length<limit)results.push(r);total++;};
 if(scope!=='source')for(const c of index.nodes.values()){if(type!=='all'&&c.type!==type)continue;const text=[c.name,c.type,...Object.entries(c.properties||{}).flat()].join(' / '),at=norm(text).indexOf(q);if(at>=0)add({componentId:c.id,kind:'metadata',path:'Component metadata',line:0,snippet:text.slice(Math.max(0,at-60),at+180)});}
 if(scope!=='metadata')for(const d of index.documents){if(type!=='all'&&index.nodes.get(d.componentId)?.type!==type)continue;const lower=d.text.toLowerCase();let at=lower.indexOf(q);while(at>=0){const loc=location(d,at);if(total>=offset&&results.length<limit){const start=d.starts[loc.line-1],end=d.starts[loc.line]??d.text.length;results.push({componentId:d.componentId,documentId:d.id,kind:'source',path:d.path,...loc,snippet:d.text.slice(Math.max(start,at-60),Math.min(end,at+180))});}total++;at=lower.indexOf(q,at+Math.max(1,q.length));}}
 return {results,total,note:'Literal search; matches do not prove execution or semantic equivalence.'};
}
function excerpt(index,documentId,line=1,radius=10){const d=index.documents.find(d=>d.id===documentId);if(!d)return null;line=Math.max(1,Math.min(d.starts.length,Number(line)||1));const first=Math.max(1,line-radius),last=Math.min(d.starts.length,line+radius);return {...d,line,first,last,lines:Array.from({length:last-first+1},(_,i)=>{const n=first+i;return {number:n,text:d.text.slice(d.starts[n-1],d.starts[n]??d.text.length).replace(/\r?\n$/,'')};})};}
function symbols(index,componentId,name){const leaf=String(name||'').split('.').pop();if(!/^[a-z_$][\w$]*$/i.test(leaf))return [];const pattern=new RegExp('(?:function\\s+'+escape(leaf)+'\\s*\\(|\\b'+escape(leaf)+'\\s*:\\s*(?:async\\s+)?function|\\b'+escape(leaf)+'\\s*=\\s*(?:async\\s+)?(?:function|\\([^)]*\\)\\s*=>))','g'),found=[];for(const d of index.documents.filter(d=>d.componentId===componentId))for(const m of d.text.matchAll(pattern))found.push({documentId:d.id,path:d.path,...location(d,m.index),label:'Static function/property definition candidate'});return found;}
function compareLines(a,b){const left=String(a??'').split('\n'),right=String(b??'').split('\n'),rows=[];if(left.length+right.length>40000)return {rows,note:'More than 40,000 lines: compare a smaller source or download the originals for an external diff.'};if(left.length*right.length>400000){for(let i=0;i<Math.max(left.length,right.length);i++)rows.push({a:i<left.length?i+1:null,b:i<right.length?i+1:null,left:left[i]??'',right:right[i]??'',state:left[i]===right[i]?'same':'changed'});return {rows,note:'Large input: positional line comparison. Insertions can shift subsequent lines.'};}
 const dp=Array.from({length:left.length+1},()=>new Uint32Array(right.length+1));for(let i=left.length-1;i>=0;i--)for(let j=right.length-1;j>=0;j--)dp[i][j]=left[i]===right[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
 let i=0,j=0;while(i<left.length||j<right.length){if(i<left.length&&j<right.length&&left[i]===right[j]){rows.push({a:i+1,b:j+1,left:left[i++],right:right[j++],state:'same'});}else if(i<left.length&&(j>=right.length||dp[i+1][j]>=dp[i][j+1]))rows.push({a:i+1,b:null,left:left[i++],right:'',state:'removed'});else rows.push({a:null,b:j+1,left:'',right:right[j++],state:'added'});}return {rows,note:'Line comparison of extracted source or structure; no runtime compatibility claim.'};
}
function serialise(index,view){return {root:view.root,direction:view.direction,depth:view.depth,includePossible:view.includePossible,nodes:view.nodes.map(n=>({id:n.id,name:n.name,type:n.type,distance:n.distance,external:n.external,possible:n.possible,path:n.path})),edges:view.edges,warnings:index.warnings,coverage:index.coverage};}
function report(index,key,options={}){const view=trace(index,key,options),c=index.nodes.get(key),edgeMap=new Map(view.edges.map(e=>[e.id,e])),rows=view.nodes.filter(n=>n.id!==key).map(n=>[n.name,n.type,String(n.distance),n.possible?'Includes possible match':'Declared / metadata / source evidence',n.path.map(id=>edgeMap.get(id)?.label).join(' → ')]);
 const actions=[...new Set(view.nodes.map(n=>n.type))].map(type=>[type,({form:'Open affected forms and verify controls, event handlers and applicable rules.',column:'Review requiredness, existing data, queries, calculations and dependent automation.',flow:'Test affected triggers, branches, connector operations and failure paths.',businessrule:'Validate conditions, scope, activation state and affected forms.',app:'Navigate affected app screens and validate formulas, data binding and permissions.',webresource:'Test registered functions and callers in their actual form/app contexts.'}[type]||'Review packaged definition and validate affected behaviour in a test environment.')]);
 return {mode:'impact',title:'Component dependency and impact review',subtitle:c?.name||key,generated:new Date().toISOString().slice(0,10),sections:[{title:'Scope and evidence',note:'Read-only static review. Arrows point from dependent to required component. Missing references do not prove independence.',paragraphs:[`Direction: ${view.direction}. Depth: ${view.depth}. Possible matches: ${view.includePossible?'included':'excluded'}.`,...index.warnings],tables:[{title:'Potentially affected or connected components',headers:['Component','Family','Distance','Evidence','Shortest discovered path'],rows},{title:'Reference evidence',headers:['Dependent','Required','Evidence type','Location','Detail'],rows:view.edges.flatMap(e=>e.evidence.map(x=>[index.nodes.get(e.from)?.name||e.from,index.nodes.get(e.to)?.name||e.to,e.label,(x.path||'Structured metadata')+(x.line?':'+x.line:''),x.detail]))},{title:'Suggested verification checklist',headers:['Family','Review'],rows:actions}]}],visuals:[{kind:'graph',type:'dependency',title:'Component reference graph',note:'Static evidence graph. Large diagrams span pages; the reference inventory retains every edge, including cross-page links.',nodes:view.nodes.map(n=>({id:n.id,label:n.name,kind:n.type,detail:n.distance+' hops'+(n.external?' / external reference':'')})),edges:view.edges.map(e=>({from:e.from,to:e.to,kind:e.kind,label:e.label}))}],diagrams:[],forms:[],erds:[],canvases:[],rules:[]};
}
root.SolutionExploration={build,invalidate:model=>cache.delete(model),references,trace,search,excerpt,symbols,compareLines,serialise,report,labels};
})(globalThis);
