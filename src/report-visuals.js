/* Source-grounded architecture, automation and change diagrams for editable reports. */
(function(root){
'use strict';
const reports=root.SolutionReports,baseSingle=reports.single,baseComparison=reports.comparison;
const S=x=>String(x??'').replace(/[\r\n\t]+/g,' ');
const labels=()=>root.SolutionCore.LABELS||{};
const types={data:new Set(['table','column','relationship','choice','key']),integration:new Set(['flow','connection','connector','endpoint','customapi','environment']),security:new Set(['role','privilege','fieldsecurity','fieldpermission']),logic:new Set(['bpf','businessrule','action','customapi','pluginstep']),plugins:new Set(['pluginassembly','plugintype','pluginstep','pluginimage','pcf'])};
const node=(c,status)=>({id:c.id,label:S(c.name),kind:c.type,detail:S(c.description||labels()[c.type]||c.type),status:status||''});
function graph(title,kind,nodes,edges=[],note='',side=''){
 const ids=new Set(nodes.map(n=>n.id));
 return {kind:'graph',type:kind,title:S(title),side,nodes,edges:edges.filter(e=>ids.has(e.from)&&ids.has(e.to)),note};
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
 return flows.map(f=>({kind:'flow',type:'flow',title:'Power Automate — '+S(f.name),side,name:S(f.name),source:S(f.source),steps:f.steps.map(s=>({...s,name:S(s.name),type:S(s.type),branch:S(s.branch),operation:S(s.operation)})),edges:f.edges||[],note:'Solid connectors represent explicit runAfter metadata; branch membership is containment, not implicit sequence.',warnings:f.warnings||[]}));
}
function docFlowSections(list){
 if(!list.length)return [];
 const info=list.map(f=>[f.side||'Solution',f.name,String(f.steps.length),String(f.edges.filter(e=>e.kind==='dependency').length),f.warnings.length?f.warnings.join('; '):'Extracted WDL metadata']);
 const detail=list.flatMap(f=>f.steps.map(s=>[f.side||'Solution',f.name,s.branch||'Main','  '.repeat(Math.min(s.depth||0,8))+s.name,s.type,s.operation||'—',Object.entries(s.runAfter||{}).map(([k,v])=>k+' ('+v.join(', ')+')').join('; ')||'No explicit runAfter']));
 return [{title:'Power Automate flow diagrams and action paths',note:'Read-only exported WDL. Branches show membership; execution order is only known where runAfter or trigger-entry edges are explicit. Editable Word flow maps and native PowerPoint diagram slides follow.',paragraphs:[],tables:[
  {title:'Flow diagram index',headers:['Side','Flow','Steps','Explicit runAfter','Limitations'],rows:info},
  {title:'Editable flow path and branch map',headers:['Side','Flow','Branch','Action / nesting','Type','Operation','Explicit predecessor'],rows:detail}
 ]}];
}
function flowImpactSections(model,side=''){
 const analytics=root.SolutionFlowAnalytics;
 if(!analytics||!(model.flowDetails||[]).length)return [];
 const rows=analytics.portfolio(model.flowDetails,model.components),impact=analytics.trace(rows);
 const owner=side?side+' / ':'';
 return [{title:owner+'Dataverse flow triggers, writes and retrigger risk',
  note:'Static analysis of supported Dataverse triggers and writes. Matching table/event/column metadata indicates a potential retrigger, not proof of execution or an identical record.',
  paragraphs:[...(impact.truncated?['The dependency analyser reached its link safety limit; not all potential links could be assessed.']:[]),
   ...rows.filter(r=>r.analytics&&!r.analytics.complete).map(r=>r.name+': the source inspection was incomplete.')],
  tables:[
   {title:'Flow triggers by table and column',headers:['Flow','Table','Trigger','Change','Monitored columns','Column filter status','Environment'],rows:rows.flatMap(f=>f.triggers.map(t=>[f.name,t.table||'Unresolved',t.step,t.change,t.columns.join(', ')||'—',t.columnsStatus,t.environment]))},
   {title:'Flow writes by table and column',headers:['Flow','Table','Action','Operation','Written columns','Column resolution','Environment'],rows:rows.flatMap(f=>f.writes.map(w=>[f.name,w.table||'Unresolved',w.step,w.operation,w.columns.join(', ')||'—',w.columnsStatus,w.environment]))},
   {title:'Potential flow-to-flow retriggers',headers:['Writing flow','Write action','Triggered flow','Trigger step','Table','Write columns','Trigger columns','Matched columns','Events','Confidence'],rows:impact.links.map(l=>[l.source,l.writeStep,l.target,l.triggerStep,l.table,l.writtenColumns.join(', ')||'—',l.triggerColumns.join(', ')||'—',l.matchedColumns.join(', ')||'—',l.eventLabel,l.kind])},
   {title:'Potential cycles and self-triggering flows',headers:['Cycle','Flow path','Table / column overlap','Other potential links'],rows:impact.loops.map((loop,i)=>[`${loop.type==='self'?'Self-retrigger':'Multi-flow cycle'} ${i+1}`,loop.links.map(l=>l.source+' → '+l.target).join(' / '),loop.links.map(l=>l.table+': '+(l.matchedColumns.join(', ')||l.triggerColumns.join(', ')||'column impact unresolved')).join(' / '),String(loop.otherLinks||0)])}
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
 const sections=[...docFlowSections(flows),...flowImpactSections(a,b?'Baseline A':''),...(b?flowImpactSections(b,'Newer B'):[])];
 report.sections.splice(idx<0?report.sections.length:idx,0,...sections);
 report.totalRows=report.sections.flatMap(s=>s.tables||[]).reduce((n,t)=>n+t.rows.length,0);
 report.visualSummary={diagrams:report.visuals.length,flows:flows.length,forms:report.forms?.length||0};
 return report;
}
reports.single=m=>decorate(baseSingle(m),[m]);
reports.comparison=(a,b)=>decorate(baseComparison(a,b),[a,b]);
})(globalThis);
