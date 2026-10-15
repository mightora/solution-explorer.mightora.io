/* Source-grounded architecture, automation and change diagrams for editable reports. */
(function(root){
'use strict';
const reports=root.SolutionReports,baseSingle=reports.single,baseComparison=reports.comparison;
const S=x=>String(x??'').replace(/[\r\n\t]+/g,' ').slice(0,170);
const cap=80,labels=()=>root.SolutionCore.LABELS||{};
const types={data:new Set(['table','column','relationship','choice','key']),integration:new Set(['flow','connection','connector','endpoint','customapi','environment']),security:new Set(['role','privilege','fieldsecurity','fieldpermission']),logic:new Set(['bpf','businessrule','action','customapi','pluginstep']),plugins:new Set(['pluginassembly','plugintype','pluginstep','pluginimage','pcf'])};
const node=(c,status)=>({id:c.id,label:S(c.name),kind:c.type,detail:S(c.description||labels()[c.type]||c.type),status:status||''});
function graph(title,kind,nodes,edges=[],note='',side=''){
 const selected=nodes.slice(0,cap),ids=new Set(selected.map(n=>n.id));
 return {kind:'graph',type:kind,title:S(title),side,nodes:selected,edges:edges.filter(e=>ids.has(e.from)&&ids.has(e.to)).slice(0,180),note:note+(nodes.length>cap?` Display is limited to the first ${cap} nodes; use component inventories for remaining items.`:'')};
}
function views(m,side=''){
 const all=m.components||[],get=t=>all.filter(c=>t.has(c.type));const output=[];
 const nonzero=Object.entries(m.counts||{}).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
 output.push(graph('Solution component landscape','landscape',[
  {id:'solution',label:S(m.info?.name||'Solution'),kind:'solution',detail:S(m.info?.version||'Export')},
  ...nonzero.map(([type,count])=>({id:'group:'+type,label:labels()[type]||type,kind:type,detail:`${count} component(s)`}))
 ],nonzero.map(([type])=>({from:'solution',to:'group:'+type,kind:'contained'})),'Family counts reflect objects recognised in this export.',side));
 const tables=all.filter(c=>c.type==='table').map(node),rels=all.filter(c=>c.type==='relationship');
 if(tables.length)output.push(graph('Dataverse data model','data',tables,rels.map(c=>({from:'table:'+String(c.properties?.source||'').toLowerCase(),to:'table:'+String(c.properties?.target||'').toLowerCase(),label:c.name,kind:'relationship'})),'Lines show explicitly identified relationships, not inferred foreign keys.',side));
 const integration=get(types.integration).map(node);
 if(integration.length){const edges=[];
  for(const f of all.filter(c=>c.type==='flow'))for(const ref of String(f.properties?.connectionReferences||'').split(',').map(s=>s.trim()).filter(Boolean))edges.push({from:f.id,to:'connection:'+ref.toLowerCase(),kind:'uses'});
  output.push(graph('Integrations and connection references','integration',integration,edges,'Disconnected boxes indicate that no reliable link could be extracted; they do not prove runtime independence.',side));
 }
 for(const [type,title] of [['security','Security components'],['logic','Business logic and processing'],['plugins','Plug-ins and code extensions']]){
  const records=get(types[type]).map(node);if(!records.length)continue;
  const edges=[];
  if(type==='plugins'){
   const byName=new Map(records.map(c=>[c.label.toLowerCase(),c.id]));
   for(const c of get(types.plugins)){
    for(const key of ['AssemblyName','assemblyName','pluginType','step']){
     const target=byName.get(String(c.properties?.[key]||'').toLowerCase());if(target&&target!==c.id)edges.push({from:target,to:c.id,kind:'registered'});
    }
   }
  }
  output.push(graph(title,type,records,edges,'Only known metadata associations are connected. Detached nodes are not evidence that components are unrelated.',side));
 }
 if(m.dependencies?.length){const nodes=new Map(),edges=[];
  const byId=new Map(all.map(c=>[c.id,c]));for(const d of m.dependencies){
   for(const id of [d.required,d.dependent])if(id&&!nodes.has(id)){const c=byId.get(id);nodes.set(id,c?node(c):{id,label:S(id.split(':').slice(1).join(':')),kind:id.split(':')[0],detail:'Reference'});}
   if(d.required&&d.dependent)edges.push({from:d.dependent,to:d.required,kind:'requires'});
  }
  output.push(graph('Declared missing dependencies','dependency',[...nodes.values()],edges,'Only explicit MissingDependency entries in solution.xml are mapped.',side));
 }
 return output;
}
function flowVisuals(m,side=''){
 const flows=(m.flowDetails||[]).filter(f=>Array.isArray(f.steps));
 return flows.slice(0,100).map(f=>({kind:'flow',type:'flow',title:'Power Automate — '+S(f.name),side,name:S(f.name),source:S(f.source),steps:f.steps.map(s=>({...s,name:S(s.name),type:S(s.type),branch:S(s.branch),operation:S(s.operation)})),edges:f.edges||[],note:'Solid connectors represent explicit runAfter metadata; branch membership is containment, not implicit sequence.',warnings:f.warnings||[]}));
}
function docFlowSections(list){
 if(!list.length)return [];
 const info=list.map(f=>[f.side||'Solution',f.name,String(f.steps.length),String(f.edges.filter(e=>e.kind==='dependency').length),f.warnings.length?f.warnings.join('; '):'Extracted WDL metadata']);
 const detail=list.flatMap(f=>f.steps.map(s=>[f.side||'Solution',f.name,s.branch||'Main','  '.repeat(Math.min(s.depth||0,8))+s.name,s.type,s.operation||'—',Object.entries(s.runAfter||{}).map(([k,v])=>k+' ('+v.join(', ')+')').join('; ')||'No explicit runAfter'])).slice(0,2500);
 return [{title:'Power Automate flow diagrams and action paths',note:'Read-only exported WDL. Branches show membership; execution order is only known where runAfter or trigger-entry edges are explicit. Editable Word flow maps and native PowerPoint diagram slides follow.',paragraphs:[],tables:[
  {title:'Flow diagram index',headers:['Side','Flow','Steps','Explicit runAfter','Limitations'],rows:info},
  {title:'Editable flow path and branch map',headers:['Side','Flow','Branch','Action / nesting','Type','Operation','Explicit predecessor'],rows:detail}
 ]}];
}
function decorate(report,inputs){
 const [a,b]=inputs;
 report.visuals=(b?[...views(a,'Baseline A'),...views(b,'Newer B')]:views(a));
 const flows=[...flowVisuals(a,b?'Baseline A':''),...(b?flowVisuals(b,'Newer B'):[])];
 report.visuals.push(...flows);
 if(b){
  const diffs=root.SolutionCore.compare(a,b).filter(c=>c.status!=='unchanged');
  if(diffs.length){const added=diffs.map(c=>node(c,c.status));
   report.visuals.unshift(graph('Change impact — added, removed and modified','change',added,[],
    'Green: added in B. Red: removed from A. Purple: metadata changed. This is not a runtime compatibility assessment.'));
  }
 }
 const idx=report.sections.findIndex(s=>s.title==='Assumptions, gaps and verification'||s.title==='Completeness and limitations');
 const sections=docFlowSections(flows);
 report.sections.splice(idx<0?report.sections.length:idx,0,...sections);
 report.totalRows=report.sections.flatMap(s=>s.tables||[]).reduce((n,t)=>n+t.rows.length,0);
 report.visualSummary={diagrams:report.visuals.length,flows:flows.length,forms:report.forms?.length||0};
 return report;
}
reports.single=m=>decorate(baseSingle(m),[m]);
reports.comparison=(a,b)=>decorate(baseComparison(a,b),[a,b]);
})(globalThis);
