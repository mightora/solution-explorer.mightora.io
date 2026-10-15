/* Adds source-grounded, editable form-layout documentation to both report modes. */
(function(root){
'use strict';
const reports=root.SolutionReports;
const baseSingle=reports.single,baseComparison=reports.comparison;
const slice=s=>String(s??'').slice(0,220);
function formSections(forms){
 const output=[];
 if(!forms?.length)return output;
 const summary=forms.map(f=>[f.table,f.name,f.type,String(f.tabCount),String(f.sectionCount),String(f.fieldCount)]);
 output.push({title:'Model-driven form layouts',note:'These diagrams and tables approximate structural tab/section/field arrangements from FormXML. They do not reproduce live rendering, PCF visuals, scripts, rules or environment data.',paragraphs:[],tables:[{title:'Form overview',headers:['Table','Form','Type','Tabs','Sections','Controls'],rows:summary.slice(0,100)}]});
 for(const f of forms.slice(0,24)){
  const rows=[];
  for(const t of f.tabs)for(const s of t.sections)for(const field of s.fields)
   rows.push([t.name,s.name,String(s.column+1),field.label,field.field||'—',field.kind]);
  output.push({title:`Form layout — ${slice(f.name)}`,note:`Table: ${slice(f.table)} · Type: ${slice(f.type)} · ${f.tabCount} tabs / ${f.sectionCount} sections. This is a read-only approximation.`,paragraphs:[],tables:[{title:'Editable form wireframe map',headers:['Tab','Section','Column','Control label','Dataverse field','Control kind'],rows:rows.slice(0,650)}]});
 }
 return output;
}
function insertBefore(s,heading,content){const index=s.findIndex(x=>x.title===heading);s.splice(index<0?s.length:index,0,...content);}
reports.single=function(m){const r=baseSingle(m);const forms=m.formLayouts||[];
 r.forms=forms;
 insertBefore(r.sections,'Component and extension inventory',formSections(forms));
 r.totalRows=r.sections.flatMap(s=>s.tables||[]).reduce((n,t)=>n+t.rows.length,0);
 return r;};
reports.comparison=function(a,b){const r=baseComparison(a,b);const prior=a.formLayouts||[],newer=b.formLayouts||[];
 const old=new Map(prior.map(f=>[f.id,f])),current=new Map(newer.map(f=>[f.id,f]));
 const states=[];
 for(const [id,f] of current){const p=old.get(id);states.push([f.table,f.name,!p?'Added':p.fingerprint===f.fingerprint?'Unchanged':'Changed',p?.fingerprint||'—',f.fingerprint]);}
 for(const [id,f] of old)if(!current.has(id))states.push([f.table,f.name,'Removed',f.fingerprint,'—']);
 if(states.length)insertBefore(r.sections,'Completeness and limitations',[
  {title:'Model-driven form changes',note:'Layout fingerprints compare extracted tabs, sections and controls rather than raw FormXML. The slides that follow show available baseline and newer layouts.',paragraphs:[],tables:[{title:'Form layout changes — A to B',headers:['Table','Form','Status','Baseline layout','Newer layout'],rows:states.slice(0,100)}]}
 ]);
 r.forms=[...prior.slice(0,8).map(f=>({...f,side:'Baseline A'})),...newer.slice(0,8).map(f=>({...f,side:'Newer B'}))];
 r.totalRows=r.sections.flatMap(s=>s.tables||[]).reduce((n,t)=>n+t.rows.length,0);
 return r;};
})(globalThis);
