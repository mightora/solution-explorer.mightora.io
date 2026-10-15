/* Mightora Solution Explorer — local, source-grounded technical report model. */
(function(root){
 'use strict';
 const norm=v=>String(v??'').replace(/[\r\n\t]+/g,' ').trim();
 const safe=v=>norm(v).slice(0,350);
 const LABELS=()=>root.SolutionCore?.LABELS||{};
 const maxRows=2500;
 const sensitive=/password|secret|token|credential|authorization|connectionstring|api[-_]?key|accountkey|clientkey|privatekey|sas/i;
 const table=(title,headers,rows)=>({title,headers,rows:rows.map(r=>r.map(x=>safe(x)))});
 const section=(title,note='',tables=[],paragraphs=[])=>({title,note,tables,paragraphs});
 function name(m){return safe(m?.info?.name||m?.info?.filename||'Unnamed solution');}
 function metadata(m){return [
  ['Name',name(m)],['Version',safe(m?.info?.version||'Not available')],
  ['Managed',m?.info?.managed===true?'Yes':m?.info?.managed===false?'No':'Unknown'],
  ['Publisher',safe(m?.info?.publisher||'Not available')],['Source file',safe(m?.info?.filename||'Uploaded export / demonstration')],
  ['Components discovered',String(m?.components?.length||0)],
  ['Scope','Exported metadata only; no live environment data']
 ];}
 function coverage(m){return ['inspected','discovered','referenced','unsupported'].map(k=>[k, String(m?.coverage?.[k] ?? (k==='inspected'?(m?.components?.length||0):0))]);}
 const com=(m,type)=>m.components.filter(c=>c.type===type);
 const property=(c,key)=>safe(c.properties?.[key]||c.properties?.[key.toLowerCase()]||'—');
 function dictionaries(m){
  const columns=com(m,'column'),tables=com(m,'table');
  const cols=columns.slice(0,maxRows).map(c=>[
    property(c,'table')!=='—'?property(c,'table'):safe(c.name.split('.')[0]),
    safe(c.name.split('.').pop()),property(c,'displayName'),property(c,'dataType'),property(c,'required'),property(c,'maxLength')
  ]);
  return [table('Tables',['Logical name','Display name','Ownership','Primary name'],tables.slice(0,maxRows).map(t=>[t.name,property(t,'displayName'),property(t,'ownership'),property(t,'primaryName')])),
  table('Column data dictionary',['Table','Column','Display name','Data type','Required','Max length'],cols)];
 }
 function relationship(m){const rows=com(m,'relationship').map(c=>[c.name,property(c,'source'),property(c,'target'),property(c,'kind')]);
  return table('Discovered table relationships',['Relationship','From / referencing','To / referenced','Type'],rows.slice(0,maxRows));}
 const byType=(m,exclude)=>{
  const skip=new Set(exclude);
  return Object.keys(root.SolutionCore?.LABELS||{}).filter(k=>!skip.has(k)).flatMap(type=>com(m,type).map(c=>({type,c})));
 };
 function groupedInventory(m){
  return table('Extended component inventory',['Family','Component','Inspection level','Extracted detail'],byType(m,['table','column','relationship']).slice(0,maxRows).map(({type,c})=>[
   LABELS()[type]||type,c.name,c.coverage||'inspected',c.description||Object.entries(c.properties||{}).filter(([k])=>!sensitive.test(k)).slice(0,2).map(([k,v])=>`${k}: ${safe(v)}`).join('; ')||'—'
  ]));
 }
 function connectionSummary(m){return table('Integrations and dependencies',['Type','Name','Metadata'],
   ['flow','connection','connector','endpoint','customapi','environment'].flatMap(type=>com(m,type).map(c=>[LABELS()[type]||type,c.name,
    Object.entries(c.properties||{}).filter(([k])=>!/secret|password|value|token|credential|key/i.test(k)).slice(0,4).map(([k,v])=>`${k}: ${safe(v)}`).join('; ')] )).slice(0,maxRows));}
 function riskNote(m){let notes=[];
  if(!m?.components?.length)notes.push('No component metadata was recognised; verify the export structure.');
  if(com(m,'relationship').length===0)notes.push('No relationships were identified. This is not evidence that the data model has no relationships.');
  if(com(m,'column').length===0)notes.push('No column definitions were extracted.');
  if(m?.coverage?.discovered||m?.coverage?.unsupported||m?.coverage?.referenced)notes.push('Some entries were discovered or referenced without complete definitions.');
  if(m?.warnings?.length)notes.push(...m.warnings.slice(0,35).map(safe));
  return notes;
 }
 function diagram(m,title){
  const names=new Set(com(m,'table').map(c=>c.name));const links=com(m,'relationship').map(c=>({name:c.name,source:c.properties?.source||'',target:c.properties?.target||'',kind:c.properties?.kind||''})).filter(x=>names.has(x.source)&&names.has(x.target));
  return {title,entities:[...names].slice(0,160),links:links.slice(0,400),note:'Links represent relationships explicitly found in the export; they are not inferred.'};
 }
 function single(m){if(!m?.components)throw Error('Load a solution (A) before generating a technical report.');
  const typeCounts=Object.entries(m.counts||{}).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]);
  const secs=[
   section('Scope and method','Generated from locally parsed Dataverse solution metadata. The report does not inspect a live tenant or validate runtime behaviour.',[],[
    'Everything in this document is editable. Diagrams in Word use editable relationship tables; PowerPoint uses native editable shapes and connectors.',
    'Values, credentials, source code and binary internals excluded by the explorer remain unavailable in the documentation.']),
   section('Solution identity','', [table('Solution properties',['Property','Value'],metadata(m))]),
   section('Executive component summary','', [table('Component coverage by family',['Component family','Count'],typeCounts.map(([key,n])=>[LABELS()[key]||key,String(n)])),table('Inspection completeness',['Coverage status','Count'],coverage(m))]),
   section('Data model and dictionary','Tables and columns reflect only metadata present in the export. Display names and required flags may be absent.',dictionaries(m)),
   section('Relationship architecture','Editable relationship descriptions and visual layouts are derived from discovered relationship endpoints.',[relationship(m)]),
   section('Business logic and automation','Configured business rules, workflows, flows, process stages and custom APIs as discovered in the export.',[table('Logic inventory',['Family','Component','Inspection level'],['flow','bpf','businessrule','action','customapi','apiparameter'].flatMap(type=>com(m,type).map(c=>[LABELS()[type]||type,c.name,c.coverage||'inspected'])).slice(0,maxRows)),
    table('Power Automate flow actions',['Flow','Action','Type','Branch','Operation'],(m.flowDetails||[]).flatMap(f=>(f.steps||[]).map(st=>[f.name,st.name,st.type,st.branch,st.operation||'—'])).slice(0,maxRows))]),
   section('Security architecture','Roles and privileges describe packaged metadata, not a tenant-wide access assessment.',[table('Security components',['Family','Component','Inspection level'],['role','privilege','fieldsecurity','fieldpermission'].flatMap(type=>com(m,type).map(c=>[LABELS()[type]||type,c.name,c.coverage||'inspected'])).slice(0,maxRows))]),
   section('Integrations and configuration','Connection references, connectors, service endpoints, environment-variable definitions and automation metadata.',[connectionSummary(m)]),
   section('Component and extension inventory','Additional objects, including apps, UI, plug-ins, PCF, reports, Power Pages and Copilot components.',[groupedInventory(m)]),
   section('Explicit missing dependencies','Only missing-dependency declarations from the exported manifest are included.',[table('Manifest missing dependencies',['Dependent','Required','Origin'],(m.dependencies||[]).slice(0,maxRows).map(x=>[x.dependent||'Not stated',x.required||'Not stated',x.kind||'manifest']))]),
   section('Assumptions, gaps and verification','Review all inferred or incomplete metadata before accepting this as an authoritative design record.',[table('Review items',['Finding'],riskNote(m).map(x=>[x]))],['Recommended follow-ups: confirm Dataverse security depth, integration credentials, environment configuration, managed dependencies, plug-in registrations and actual deployment settings against a target environment.'])
  ];
  const totalRows=secs.flatMap(s=>s.tables).reduce((n,t)=>n+t.rows.length,0);
  if(m.components.length>maxRows)secs.at(-1).paragraphs.push(`Inventory sections are limited to ${maxRows} entries per table; some entries may not appear. Use CSV/JSON export for the full extracted set.`);
  return {mode:'single',title:`Technical documentation — ${name(m)}`,subtitle:`Dataverse solution v${m.info?.version||'unknown'}`,identity:metadata(m),sections:secs,diagrams:[diagram(m,'Data model — '+name(m))],counts:{components:m.components.length,tables:com(m,'table').length,columns:com(m,'column').length,relationships:com(m,'relationship').length},totalRows,generated:new Date().toISOString().slice(0,10)};
 }
 function comparison(a,b){if(!a?.components||!b?.components)throw Error('Load both baseline A and newer B before generating a comparison report.');
  const diff=root.SolutionCore.compare(a,b);const types=['added','removed','changed','unchanged'];const summary=types.map(status=>[status,String(diff.filter(x=>x.status===status).length)]);
  const changes=diff.filter(x=>x.status!=='unchanged');
  const classify=status=>changes.filter(x=>x.status===status);
  const changedRows=classify('changed').flatMap(x=>root.SolutionCore.propertyChanges(x.before||{},x.properties||{}).filter(change=>!sensitive.test(change.key)).map(change=>[
   LABELS()[x.type]||x.type,x.name,change.key,safe(change.before??'—'),safe(change.after??'—')
  ])).slice(0,maxRows);
  const changeTable=status=>table(`${status[0].toUpperCase()+status.slice(1)} components`,['Family','Component','Detail'],classify(status).slice(0,maxRows).map(x=>[
    LABELS()[x.type]||x.type,x.name,status==='changed'?'Extracted property changes (see next table)':'Component present only in '+(status==='added'?'B':'A')
  ]));
  const modelChanges=changes.filter(x=>['table','column','relationship','choice','key'].includes(x.type));
  const impact=[];
  if(changes.some(x=>x.status==='removed'&&['table','column','relationship','choice','key'].includes(x.type)))impact.push(['High review','Removed data-model component','Check data retention, dependent forms, APIs, flows, plug-ins and migration approach.']);
  if(changes.some(x=>x.status==='changed'&&['column','relationship','key'].includes(x.type)))impact.push(['Review','Modified data-model metadata','Check type changes, constraints, relationship behaviour and client compatibility.']);
  if(changes.some(x=>['role','privilege','fieldsecurity','fieldpermission'].includes(x.type)))impact.push(['Review','Security metadata difference','Validate effective privileges and least privilege in target environments.']);
  if(changes.some(x=>['flow','pluginassembly','plugintype','pluginstep','bpf','customapi','connection','endpoint'].includes(x.type)))impact.push(['Review','Automation / integration change','Validate triggers, operations, connectors, plug-in stages, dependencies and rollback.']);
  if(a.info?.name&&b.info?.name&&a.info.name!==b.info.name)impact.push(['Review','Different solution unique names','This compares shared component identifiers across two different solution packages, not necessarily sequential versions.']);
  const sections=[
   section('Scope and comparison direction','A is the baseline (earlier or existing export); B is the newer/proposed export. Changes represent extracted metadata differences, not a semantic comparison of executable internals.',[],[
    'Every diagram and table in this report is editable. Missing component definitions and unextracted binary differences may not be shown.']),
   section('Compared solution identities','',[table('A — baseline',['Property','Value'],metadata(a)),table('B — newer',['Property','Value'],metadata(b))]),
   section('Change summary','',[table('Component-level change counts',['Classification','Count'],summary),table('Changed component families',['Family','Added','Removed','Changed'],[...new Set(changes.map(x=>x.type))].sort().map(type=>[LABELS()[type]||type,...['added','removed','changed'].map(s=>String(changes.filter(x=>x.type===type&&x.status===s).length))]))]),
   section('What is being added','Newly discovered components in B.',[changeTable('added')]),
   section('What is being removed','Components in A which do not appear in B.',[changeTable('removed')]),
   section('What is being changed','Component comparisons are based on available extracted properties; no full formula or source-code diff is claimed.',[changeTable('changed'),table('Property-level changes',['Family','Component','Property','Baseline A','Newer B'],changedRows)]),
   section('Data-model changes and dictionary','Focuses on table, column, choice, key and relationship differences.',[table('Data-model change list',['Status','Family','Component','Metadata'],modelChanges.slice(0,maxRows).map(x=>[
     x.status,LABELS()[x.type]||x.type,x.name,x.status==='changed'?Object.keys(x.properties||{}).join(', '):'—'
   ]))]),
   section('Relationship model — before and after','Independent editable diagrams depict the discovered relationships in each export.',[table('Relationship additions/removals',['Status','Relationship','Source','Target'],changes.filter(x=>x.type==='relationship').slice(0,maxRows).map(x=>[
     x.status,x.name,x.properties?.source||x.before?.source||'—',x.properties?.target||x.before?.target||'—'
   ]))]),
   section('Indicative change-impact review','These are review prompts triggered by changed metadata, not verified breaking changes or production incidents.',[table('Review flags',['Level','Why flagged','Recommended validation'],impact.length?impact:[['Information','No review rules triggered','Still perform standard platform deployment and regression tests.']])]),
   section('Completeness and limitations','Both exports may omit metadata or reference components outside the package.',[
    table('Inspection coverage — A',['Coverage','Count'],coverage(a)),table('Inspection coverage — B',['Coverage','Count'],coverage(b)),
    table('Review notes',['Origin','Note'],[...(a.warnings||[]).map(x=>['A',safe(x)]),...(b.warnings||[]).map(x=>['B',safe(x)])].slice(0,80))
   ],['Deployment recommendation: review removed components and database migrations, test critical flows and plug-ins, validate security roles and connector/environment configuration, and document the rollback path.'])
  ];
  if(changes.length>maxRows)sections.at(-1).paragraphs.push(`The report caps each detailed table at ${maxRows} rows. The complete extracted difference remains available in Explorer JSON/CSV export.`);
  return {mode:'comparison',title:`Solution change assessment — ${name(a)} → ${name(b)}`,subtitle:`A ${a.info?.version||'?'} → B ${b.info?.version||'?'}`,identity:[['Baseline',name(a)],['Newer',name(b)]],sections,diagrams:[diagram(a,'Baseline A — relationships'),diagram(b,'Newer B — relationships')],counts:{added:classify('added').length,removed:classify('removed').length,changed:classify('changed').length,unchanged:diff.filter(x=>x.status==='unchanged').length},totalRows:sections.flatMap(s=>s.tables).reduce((n,t)=>n+t.rows.length,0),generated:new Date().toISOString().slice(0,10)};
 }
 root.SolutionReports={single,comparison};
})(globalThis);
