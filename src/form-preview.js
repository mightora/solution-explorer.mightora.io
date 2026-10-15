/* Mightora — local-only, non-executable model-driven form layout extraction.
 * No scripts, field values, HTML, business data or raw FormXML are retained. */
(function(root){
'use strict';
const MAX_FORMS=100,MAX_TABS=30,MAX_SECTIONS=120,MAX_FIELDS=900;
const safe=s=>String(s??'').replace(/[\r\n\t]/g,' ').replace(/\s+/g,' ').trim().slice(0,170);
const tag=n=>(n?.localName||n?.nodeName||'').toLowerCase();
const kids=(n,t)=>Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1&&(!t||tag(x)===t.toLowerCase()));
const find=(n,t)=>Array.from(n?.getElementsByTagName('*')||[]).filter(x=>tag(x)===t.toLowerCase());
const first=(n,t)=>kids(n,t)[0]||null;
function val(n,k){const a=Array.from(n?.attributes||[]).find(x=>x.name.toLowerCase()===k.toLowerCase());return safe(a?.value||'');}
function label(n,fallback){
  const labels=find(n,'label').filter(x=>val(x,'description'));
  const best=labels.find(x=>['1033','2057'].includes(val(x,'languagecode')))||labels[0];
  return val(best,'description')||safe(fallback)||'Unlabelled';
}
function direct(n,k){const c=first(n,k);return c&&!kids(c).length?safe(c.textContent):'';}
function formTitle(n,fallback){
  const names=find(n,'localizedname');const en=names.find(x=>['1033','2057'].includes(val(x,'languagecode')))||names[0];
  return val(en,'description')||val(n,'name')||direct(n,'name')||safe(fallback)||'Unnamed form';
}
function hash(str){let h=2166136261;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
function controlKind(control,cell){
  if(!control)return 'Empty cell';
  const id=(val(control,'id')||'').toLowerCase();
  const classid=(val(control,'classid')||'').toLowerCase();
  if(/subgrid|grid|associatedrecord/.test(id)||/e7a81278-8635-4d9e-8d4d-59480b391c5b/.test(classid))return 'Subgrid';
  if(/iframe|webresource/.test(id))return 'Web resource / frame';
  if(/notes|timeline/.test(id))return 'Timeline / notes';
  if(/quickview|quickform/.test(id))return 'Quick view';
  if(!val(control,'datafieldname'))return 'Special control';
  return 'Field';
}
function extractForm(layout,context){
 const tabs=[];let remainingFields=MAX_FIELDS,remainingSections=MAX_SECTIONS;
 const tabsNode=first(layout,'tabs');
 for(const [tabIndex,tab] of kids(tabsNode,'tab').slice(0,MAX_TABS).entries()){
  const t={name:label(first(tab,'labels')||tab,val(tab,'name')||`Tab ${tabIndex+1}`),id:val(tab,'name')||`tab${tabIndex+1}`,visible:val(tab,'visible')!=='false',sections:[]};
  const tabColumns=first(tab,'columns');
  for(const [colIndex,col] of kids(tabColumns,'column').entries()){
   const node=first(col,'sections');
   for(const sec of kids(node,'section')){
    if(!remainingSections--)break;
    const sect={name:label(first(sec,'labels')||sec,val(sec,'name')||'Section'),column:colIndex,visible:val(sec,'visible')!=='false',fields:[]};
    const rows=first(sec,'rows');
    for(const [rowIndex,row] of kids(rows,'row').entries())for(const [cellIndex,cell] of kids(row,'cell').entries()){
     if(remainingFields<=0)break;
     const ctrl=first(cell,'control');
     const field=val(ctrl,'datafieldname'),id=val(ctrl,'id');
     if(!ctrl&&!find(cell,'label').length)continue;
     sect.fields.push({label:label(first(cell,'labels')||cell,field||id||'Control'),field:field||'',kind:controlKind(ctrl,cell),row:rowIndex,cell:cellIndex,visible:val(cell,'visible')!=='false',required:val(cell,'required')==='true'});
     remainingFields--;
    }
    t.sections.push(sect);
   }
  }
  tabs.push(t);
 }
 return {...context,tabs,tabCount:tabs.length,sectionCount:tabs.reduce((s,t)=>s+t.sections.length,0),fieldCount:tabs.reduce((n,t)=>n+t.sections.reduce((m,s)=>m+s.fields.length,0),0),truncated:remainingFields<=0||remainingSections<=0,coverage:tabs.length?'layout':'metadata'};
}
function parseXml(s){try{const d=new DOMParser().parseFromString(s,'application/xml');if(find(d,'parsererror').length)return null;return d;}catch{return null;}}
function collect(files){
 const forms=[],seen=new Set(),issues=[];
 function add(container,ctx){
  if(forms.length>=MAX_FORMS)return;
  const candidate=first(container,'form')|| (tag(container)==='form'?container:null) ||find(container,'form')[0];
  let node=candidate;
  if(!node){const s=String(container.textContent||'').trim().slice(0,100000);if(s.startsWith('<form'))node=parseXml(s)?.documentElement;}
  if(!node||tag(node)!=='form')return;
  const name=formTitle(container,ctx.name||val(node,'name'));
  const id=direct(container,'formid')||val(node,'id')||'';
  const key=(id||`${ctx.table}/${name}`).toLowerCase();
  if(seen.has(key))return;seen.add(key);
  const result=extractForm(node,{id:key,name,table:ctx.table||'Unknown table',type:ctx.type||'Main',source:ctx.path||''});
  result.fingerprint=hash(JSON.stringify(result.tabs));
  forms.push(result);
 }
 for(const [rawPath,body] of files){
  if(!/\.xml$/i.test(rawPath)||!body)continue;
  const path=rawPath.replace(/\\/g,'/');
  if(!/(customizations\.xml|(?:forms|formxml)\/[^/]+\.xml)$/i.test(path))continue;
  const doc=parseXml(body);if(!doc)continue;
  if(/customizations\.xml$/i.test(path)){
   for(const entity of find(doc,'entity')){
    const table=direct(entity,'name')||val(entity,'name')||direct(find(entity,'entityinfo')[0],'logicalname')||'';
    const formXmls=find(entity,'formxml');
    for(const fxml of formXmls)for(const fgroup of kids(fxml,'forms')){
     const kind=val(fgroup,'type')||'Main';
     const sys=kids(fgroup,'systemform');
     if(sys.length)sys.forEach(f=>add(f,{table,type:kind,path}));
     else for(const node of kids(fgroup,'form'))add(node,{table,type:kind,path});
    }
   }
  } else {
   const parts=path.split('/');const table=parts.find((s,i)=>parts[i-1]?.toLowerCase()==='entities')||'';
   const name=parts.at(-1).replace(/\.xml$/i,'');
   const rootNode=doc.documentElement;
   if(tag(rootNode)==='forms'){
    const kind=val(rootNode,'type');for(const form of [...kids(rootNode,'systemform'),...kids(rootNode,'form')])add(form,{table,type:kind,path,name});
   }else add(rootNode,{table,path,name});
  }
 }
 if(forms.length===MAX_FORMS)issues.push(`Form preview is limited to the first ${MAX_FORMS} forms.`);
 return {forms,issues};
}
function enrich(model,files){const {forms,issues}=collect(files);
 // A form preview is a read-only projection and forms are independent of full object source.
 const byKey=new Map((model.components||[]).map(x=>[x.id,x]));
 for(const f of forms){
  const componentName=`${f.table} / ${f.name}`,key='form:'+componentName.toLowerCase().trim();
  let c=byKey.get(key);
  if(!c){c={id:key,type:'form',name:componentName,description:'Exported model-driven form layout',properties:{},coverage:'inspected',source:f.source};byKey.set(key,c);}
  c.properties={...c.properties,table:f.table,tabs:String(f.tabCount),sections:String(f.sectionCount),controls:String(f.fieldCount),layoutFingerprint:f.fingerprint};
  c.coverage=f.coverage==='layout'?'inspected':'discovered';
 }
 const components=[...byKey.values()];const counts={...(model.counts||{}),form:components.filter(c=>c.type==='form').length};
 const coverage=Object.fromEntries(['inspected','discovered','referenced','unsupported'].map(k=>[k,components.filter(c=>(c.coverage||'inspected')===k).length]));
 return {...model,components,counts,coverage,formLayouts:forms,warnings:[...(model.warnings||[]),...issues]};
}
root.SolutionForms={collect,enrich};
})(globalThis);
