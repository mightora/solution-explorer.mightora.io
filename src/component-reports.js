/* One report model for full solution, comparison, ERD and individual component exports. */
(function(root){
'use strict';
const reports=root.SolutionReports,single=reports.single,comparison=reports.comparison;
const tab=(title,headers,rows)=>({title,headers,rows}),section=(title,note='',tables=[],paragraphs=[],codeBlocks=[])=>({title,note,tables,paragraphs,codeBlocks});
const fields=f=>(f.tabs||[]).flatMap(t=>(t.sections||[]).flatMap(s=>(s.fields||[]).map(c=>[t.name,s.name,c.label,c.field,c.kind])));
function itemSection(m,c,side=''){
 const d=root.SolutionDetails.component(m,c.id),tables=[],paragraphs=[],blocks=[];const title=(side?side+' / ':'')+c.name;
 tables.push(tab('Component metadata',['Property','Value'],[['Family',root.SolutionCore.LABELS[c.type]||c.type],['Coverage',c.coverage||'inspected'],['Source',c.source||m.objectDetails?.[c.id]?.source||'Metadata inventory'],...Object.entries(c.properties||{})]));
 const children=[];function flatten(nodes,path=''){for(const n of nodes||[]){const next=path?path+' / '+n.name:n.name;children.push([next,n.kind,Object.entries(n.properties||{}).map(([k,v])=>k+': '+v).join('\n')]);flatten(n.children,next);}}
 flatten(d?.children);if(children.length)tables.push(tab('Contained component metadata',['Object path','Kind','Properties'],children));
 if(d?.form){
  const f=d.form;tables.push(tab('Form layout',['Tab','Section','Label','Column','Control'],fields(f)));
  tables.push(tab('JavaScript event registrations',['Event / owner','Order','Function','Library','Enabled','Execution context','Parameters'],(f.events||[]).map(e=>[e.event+' / '+e.owner+(e.attribute?' / '+e.attribute:''),String(e.order),e.functionName,e.library,e.enabled?'Yes':'No',e.executionContext?'Passed':'Not passed',e.parameters||'—'])));
  paragraphs.push('OnLoad order follows the exported handler registration order. Disabled handlers are listed. Runtime-added handlers, indirect calls and server-side execution cannot be established by static inspection.');
  for(const library of [...new Set((f.events||[]).map(e=>e.sourceId).filter(Boolean))])for(const s of root.SolutionDetails.sourcesFor(m,library))blocks.push({...s,title:'Registered JavaScript library '+s.path});
  for(const e of f.onLoad||[])if(!e.sourceAvailable)paragraphs.push('Source unavailable for registered OnLoad function '+e.functionName+' in '+e.library+'.');
 }
 if(d?.view){tables.push(tab('View column layout',['Column','Width'],d.view.columns.map(c=>[c.name,c.width])));paragraphs.push('Saved views use FetchXML and column layout metadata. Form OnLoad handlers are documented on their associated form components.');}
 if(d?.canvas){const a=d.canvas;
  tables.push(tab('Canvas screens',['Screen','Controls','Source'],a.screens.map(s=>[s.name,String(s.controls.length),s.source])));
  tables.push(tab('Canvas control hierarchy',['Screen','Control','Kind','Parent','Text'],a.screens.flatMap(s=>s.controls.map(c=>[s.name,c.name,c.kind,c.parent,c.text]))));
  // Power Fx expressions are kept as complete, editable code paragraphs rather than narrow, clipped cells.
  const byControl=new Map();for(const f of a.formulas){const key=f.screen+' / '+f.control;if(!byControl.has(key))byControl.set(key,[]);byControl.get(key).push(f.property+':\n'+f.expression);}
  for(const [control,expressions] of byControl)blocks.push({title:control+' / Power Fx properties',path:a.path,language:'powerfx',text:expressions.join('\n\n'),kind:'Power Fx properties'});
  paragraphs.push('Canvas previews show exported controls and literal positions. Dynamic layouts, data, custom controls and formulas are not evaluated.',...a.issues);
 }
 if(d?.rule){const r=d.rule;
  tables.push(tab('Business rule scope',['Property','Value'],[['Table',r.table||'Not supplied'],['Scope',r.scope],['Evidence',r.scopeEvidence],['State',r.state],['Forms',r.formIds.join(', ')||'No specific form ID supplied']]));
  tables.push(tab('Rule triggers',['Event','Column','Form ID','Scope metadata'],r.triggers.map(t=>[t.event,t.field,t.formId,t.scope])));
  tables.push(tab('Rule conditions and actions',['Node','Kind','Parent node','Definition'],r.steps.map(s=>[s.name,s.kind,String(s.parent),s.detail])));
  if(!r.steps.length)paragraphs.push('No supported condition or action nodes were decoded. Inspect the full packaged definition below where available.');
 }
 for(const s of d?.sources||[])blocks.push({...s,title:s.kind+' / '+s.path});
 return section(title,'Editable component documentation derived from the selected solution export.',tables,paragraphs,blocks);
}
function addDetails(r,models){
 r.erds=models.map(([m,side])=>({...root.SolutionERD.build(m),side}));
 r.canvases=models.flatMap(([m,side])=>(m.canvasApps||[]).map(a=>({...a,side})));
 r.rules=models.flatMap(([m,side])=>(m.businessRules||[]).map(a=>({...a,side})));
 r.sections.push(...models.flatMap(([m,side])=>m.components.map(c=>itemSection(m,c,side))));
 r.sections[0].paragraphs=(r.sections[0].paragraphs||[]).filter(p=>!/^Values, credentials, source code/.test(p));
 r.sections[0].paragraphs.push('Packaged scripts, formulas and definitions are included as editable text. Review them before sharing: source code can contain confidential information. Missing definitions and unknown scopes are identified explicitly.');
 r.totalRows=r.sections.flatMap(s=>s.tables||[]).reduce((n,t)=>n+t.rows.length,0);return r;
}
reports.single=m=>addDetails(single(m),[[m,'']]);
reports.comparison=(a,b)=>addDetails(comparison(a,b),[[a,'Baseline A'],[b,'Newer B']]);
reports.component=(m,id)=>{
 const c=m?.components?.find(c=>c.id===id);if(!c)throw Error('Select a component before exporting.');
 const d=root.SolutionDetails.component(m,id),related=root.SolutionObjectExplorer?.related(m,c)||[];
 const report={mode:'component',title:c.name,subtitle:(root.SolutionCore.LABELS[c.type]||c.type)+' component documentation',generated:new Date().toISOString().slice(0,10),sections:[itemSection(m,c)],forms:d.form?[d.form]:[],visuals:[],diagrams:[],erds:[],canvases:d.canvas?[d.canvas]:[],rules:d.rule?[d.rule]:[]};
 if(c.type==='table'||c.type==='relationship'){
  const e=root.SolutionERD.build(m);report.erds=[c.type==='table'?root.SolutionERD.filter(e,{table:c.name}):{...e,edges:e.edges.filter(e=>e.id===id),tables:e.tables.filter(t=>[c.properties.source,c.properties.target].some(n=>t.id===String(n||'').toLowerCase()))}];
  for(const child of related.filter(x=>['column','relationship','key'].includes(x.type)))report.sections.push(itemSection(m,child));
 }
 if(c.type==='flow'){const f=(m.flowDetails||[]).find(f=>f.name===c.name);if(f)report.visuals.push({...f,kind:'flow',type:'flow',title:c.name});}
 return report;
};
reports.erd=m=>({mode:'erd',title:'Full entity relationship diagram',subtitle:m.info?.name||'Selected solution',generated:new Date().toISOString().slice(0,10),sections:[section('ERD scope',root.SolutionERD.build(m).note)],diagrams:[],visuals:[],forms:[],canvases:[],rules:[],erds:[root.SolutionERD.build(m)]});
root.SolutionComponentReports={itemSection};
})(globalThis);
