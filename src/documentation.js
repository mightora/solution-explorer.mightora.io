/* Shared, deterministic component documentation for UI and both Office editions.
 * Static evidence is distinguished from possible matches and unknown behaviour. */
(function(root){
'use strict';
const norm=s=>String(s??'').trim().toLowerCase(),blank='Cannot be established from the supplied solution files.';
const descriptions={
 table:['Stores records in Dataverse.','Used when records are created, retrieved, updated or deleted.'],
 column:['Defines a field of a Dataverse table.','Used when a record exposes or stores this field.'],
 relationship:['Describes a declared link between Dataverse tables.','Used by lookups, navigation or queries that follow the relationship.'],
 flow:['Defines an automation or workflow.','Its exported trigger definition determines when it is eligible to run; runtime execution was not observed.'],
 pluginstep:['Registers a plug-in handler for a Dataverse event.','Runs when its configured message, stage, mode and any filtering attributes apply; code behaviour is unknown without source.'],
 businessrule:['Defines conditional business logic.','Its configured scope and activation determine where it applies.'],
 bpf:['Describes a guided business-process experience.','Presented when the process is enabled and applicable to a record.'],
 app:['Defines an application entry point or user experience.','Appears when deployed and available to an authorised user.'],
 form:['Defines a model-driven form layout and registered events.','Appears when a matching record form is opened.'],
 view:['Defines a saved query and column layout.','Used when a user or component selects this view.'],
 chart:['Defines a visualisation over records.','Appears when selected in a supported application.'],
 dashboard:['Defines a dashboard layout.','Appears when a user opens this dashboard.'],
 webresource:['Stores packaged web content, scripts or assets.','Loaded only when referenced by an application or component.'],
 role:['Defines declared security privileges.','Applied when assigned to users or teams; assignments are not in a solution export.'],
 fieldsecurity:['Defines field-level security configuration.','Applies only when a relevant profile is assigned.'],
 connection:['Names a reusable connector binding.','Resolved when an owning app or automation runs in a target environment.'],
 environment:['Defines an environment setting.','Resolved at runtime through a configured value; the actual value is deliberately excluded.'],
 connector:['Defines a custom connector interface.','Used by clients that call its operations; external service behaviour is not inspected.'],
 customapi:['Defines a Dataverse API contract.','Invoked by callers using the API name and supported binding.'],
 plugintype:['Identifies a plug-in implementation class.','Runs only through a registration or explicit invocation.'],
 pluginassembly:['Packages plug-in types.','Has no independent event trigger without a registered step.'],
 powerpages:['Describes a Power Pages site or component.','Appears when deployed and accessible under site permissions.'],
 copilot:['Describes a Copilot Studio agent.','Responds through configured channels and published topics.'],
 topic:['Defines a conversation topic.','Used when the agent selects or calls the topic.'],
 ai:['Identifies an AI Builder model or configuration.','Used where an app or process explicitly invokes it.'],
 prompt:['Defines a reusable AI prompt.','Used when an app or flow invokes the prompt.']
};
const checks={
 flow:'Check trigger filters, exact columns written, concurrency, connection references, retries and potential re-triggering.',
 pluginstep:'Verify event message, stage, synchronous/asynchronous mode and filtering attributes; inspect source for all writes and external calls.',
 role:'Confirm actual privilege depths, field security and user/team assignments in a test environment.',
 column:'Check dependencies, migrations, validation rules and data before changing type or removing the column.',
 table:'Check forms, views, automations, plug-ins, relationships and access control before modifying its schema.',
 app:'Test screens, navigation, data permissions, formulas and referenced components in a test environment.',
 webresource:'Check source code, registered handlers, call sites and CSP compatibility.',
 customapi:'Confirm inputs/outputs, callers, security privileges and implementing plug-in registrations.',
 connector:'Confirm authenticated access, policy, throttling and external endpoint contracts.',
 environment:'Confirm the target environment supplies an appropriate non-secret value.',
 businessrule:'Confirm scope, conditions, field effects and applicability to forms or table events.'
};
const safe=/password|secret|token|credential|authorization|connectionstring|apikey|api_key|privatekey|currentvalue|defaultvalue|accountkey|clientsecret|sas|certificate/i;
function forComponent(model,component){
 const c=typeof component==='string'?model.components.find(x=>x.id===component):component;if(!c)return null;
 const graph=root.SolutionExploration?.build(model),out=graph?.outgoing.get(c.id)||[],incoming=graph?.incoming.get(c.id)||[];
 const confirmed=e=>e.kind==='declared'||e.kind==='metadata';
 const relations=[...out.map(e=>({...e,direction:'Requires',other:graph.nodes.get(e.to)?.name||e.to})),...incoming.map(e=>({...e,direction:'Used by',other:graph.nodes.get(e.from)?.name||e.from}))];
 const d=root.SolutionDetails?.component(model,c.id),p=c.properties||{},info=descriptions[c.type]||['Defines a '+(root.SolutionCore.LABELS[c.type]||c.type)+' component.','Its execution or presentation is not established by the package alone.'];
 const behaviour=()=>{
  switch(c.type){
   case 'table':return `Represents the ${c.name} table${p.primaryId?' with primary identifier '+p.primaryId:''}. ${model.components.filter(x=>x.type==='column'&&norm(x.properties?.table)===norm(c.name)).length} column(s) are present in the supplied package.`;
   case 'column':return `Defines ${c.name.split('.').pop()} on ${p.table||c.name.split('.')[0]}${p.dataType||p.Type?' using '+(p.dataType||p.Type)+' metadata':''}. Actual values are not read.`;
   case 'relationship':return `Relates ${p.source||'an unresolved source table'} to ${p.target||'an unresolved target table'}${p.kind?' ('+p.kind+')':''}. Delete/update cascade behaviour is not inferred.`;
   case 'flow':return `Describes ${c.name}${p.actionCount?' with '+p.actionCount+' top-level action(s)':''}. Supported WDL actions and Dataverse interactions are shown separately; an actual execution has not been observed.`;
   case 'form':return `Defines form controls and registered events${p.table?' on '+p.table:''}; dynamic visibility and script results are not simulated.`;
   case 'view':return `Defines a saved record query${p.table?' on '+p.table:''} and any packaged column and FetchXML metadata.`;
   case 'pluginstep':return `Registers ${p.MessageName||'an exported message'}${p.PrimaryEntity?' on '+p.PrimaryEntity:''}${p.Stage?' at stage '+p.Stage:''}${p.Mode?' in mode '+p.Mode:''}. The assembly's internal reads and writes are not known.`;
   case 'role':return `Declares privileges for the ${c.name} role. Its actual security effect depends on assignment and other access controls.`;
   case 'environment':return `Declares the ${c.name} environment variable. Its runtime value is deliberately excluded from the documentation.`;
   case 'connection':return `Declares a reusable connector reference${p.connector?' for '+p.connector:''}. Connection identity and credentials are not resolved.`;
   case 'webresource':return `Identifies the ${c.name} packaged resource. It is rendered or executed only when a separate component uses it.`;
   default:return c.description&&norm(c.description)!==norm(c.name)&&!/(metadata|manifest component)$/i.test(c.description)?c.description:info[0]+' The available package does not establish its complete runtime behaviour.';
  }
 };
 const interactions=[];
 const push=(operation,table,columns,evidence,confidence='confirmed')=>interactions.push({operation,table:table||'Unresolved',columns:Array.isArray(columns)?columns.join(', '):columns||'Unresolved',evidence,confidence});
 if(c.type==='column')push('Defines',p.table||c.name.split('.')[0],[c.name.split('.').pop()],c.source||'Table metadata');
 if(c.type==='form'&&d?.form){for(const tab of d.form.tabs||[])for(const s of tab.sections||[])for(const field of s.fields||[])if(field.field)push('Displays / binds',d.form.table,[field.field],d.form.source);}
 if(c.type==='view'&&d?.view){push('Reads / queries',d.view.table,(d.view.columns||[]).map(x=>x.name),d.view.source);}
 if(c.type==='businessrule'&&d?.rule)push('Conditions / actions (verify)',d.rule.table,[],d.rule.sources?.[0]?.path||c.source,'partial');
 if(c.type==='flow'){
  const f=(model.flowDetails||[]).find(x=>norm(x.name)===norm(c.name));
  for(const trigger of f?.analytics?.triggers||[])push('Triggered by '+trigger.change,trigger.table,trigger.columns,`${f.source} / ${trigger.step}`,trigger.columnsStatus==='Specified columns'?'confirmed':'partial');
  for(const write of f?.analytics?.writes||[])push('Writes ('+write.operation+')',write.table,write.columns,`${f.source} / ${write.step}`,write.columnsStatus==='Specified columns'?'confirmed':'partial');
 }
 if(c.type==='pluginstep'){
  const table=p.PrimaryEntity||p.primaryEntity||p.entitylogicalname||p.EntityLogicalName||'';
  const columns=p.FilteringAttributes||p.filteringattributes||'';
  if(table)push('Event registration: '+(p.MessageName||p.messagename||'message not supplied'),table,columns||'All / unspecified',c.source||'Plug-in step metadata',columns?'confirmed':'partial');
 }
 const source=[...new Set([c.source,...(d?.sources||[]).map(s=>s.path),...(relations.flatMap(e=>e.evidence||[]).map(e=>e.path))].filter(Boolean))];
 const risk=[checks[c.type]||'Verify dependent components, runtime permissions and the original definition before making a change.'];
 if(incoming.length)risk.push(incoming.length+' reference(s) point to this component; inspect callers before changing or removing it.');
 if(relations.some(e=>e.kind==='possible'))risk.push('Some relationships are literal text matches only and need confirmation.');
 if(c.type==='flow'&&interactions.some(i=>i.operation.startsWith('Writes'))&&interactions.some(i=>i.operation.startsWith('Triggered'))){risk.push('A write may cause another trigger; examine the flow feedback-loop analysis for column-compatible paths.');}
 const missing=[];
 if(['discovered','referenced','unsupported'].includes(c.coverage))missing.push('Only an identifier, manifest reference or folder path was available; no verified behaviour was extracted.');
 if(!source.length)missing.push('No source file path was recorded.');
 if(!interactions.length)missing.push('Read/write tables and columns cannot be established from the supported metadata.');
 if(!out.length&&!incoming.length)missing.push('No dependencies were resolved in the local package; this does not demonstrate independence.');
 if(['pluginstep','plugintype','pluginassembly','customapi'].includes(c.type))missing.push('Executable plug-in behaviour and indirect writes are not established by registration metadata.');
 if(c.type==='flow'&&!(model.flowDetails||[]).some(x=>norm(x.name)===norm(c.name)))missing.push('An inspectable workflow definition was not included.');
 if(c.type==='environment')missing.push('Environment variable values are intentionally withheld.');
 if(c.type==='role')missing.push('Effective privileges and actual user/team assignments require live environment verification.');
 const confidence=c.coverage==='inspected'?(interactions.length||relations.some(confirmed)?'Metadata-backed (runtime unverified)':'Partial metadata (runtime unverified)'):'Identification only';
 const dependencies=relations.filter(e=>e.direction==='Requires');
 return {
  id:c.id,type:c.type,name:c.name,logicalName:c.name,identifier:p.workflowId||p.formId||p.componentId||c.id,coverage:c.coverage||'inspected',confidence,
  overview:{what:info[0],does:behaviour(),when:info[1],data:interactions.length?interactions.map(i=>`${i.operation}: ${i.table} (${i.columns})`).join('; '):blank,depends:dependencies.length?dependencies.map(e=>e.other+' ['+e.kind+']').join('; '):blank,impact:incoming.length?incoming.length+' direct reference(s) may need review; effects are not proven.':blank,verify:risk.join(' ')},
  configuration:Object.entries(p).filter(([k])=>!safe.test(k)),relationships:relations,interactions,risks:risk,missing,evidence:source,sourceCode:(d?.sources||[]).map(s=>({path:s.path,kind:s.kind,language:s.language})),
  status:'Static analysis only; no live environment or runtime execution was inspected.'
 };
}
function solution(model){
 const components=model.components||[],types=t=>components.filter(c=>c.type===t),graph=root.SolutionExploration?.build(model);
 const count=t=>types(t).length;
 const flows=root.SolutionFlowAnalytics?.portfolio(model.flowDetails||[],components)||[];
 const feedback=root.SolutionFlowAnalytics?.trace(flows)||{links:[],loops:[]};
 const flowTriggers=flows.flatMap(f=>f.triggers.map(t=>['Flow',f.name,'Trigger: '+t.change,t.table||'Unresolved',(t.columns||[]).join(', ')||t.columnsStatus,'Supported WDL metadata']));
 const flowWrites=flows.flatMap(f=>f.writes.map(w=>['Flow',f.name,'Write: '+w.operation,w.table||'Unresolved',(w.columns||[]).join(', ')||w.columnsStatus,'Supported WDL metadata']));
 const pluginSteps=types('pluginstep');
 const pluginRegistrations=pluginSteps.map(c=>['Plug-in',c.name,c.properties?.MessageName||'Registered message',c.properties?.PrimaryEntity||'Unresolved',c.properties?.FilteringAttributes||'Unspecified','Step registration only; plug-in writes unknown']);
 const propagation=(feedback.links||[]).map(e=>['Potential flow propagation',e.source+' → '+e.target,e.eventLabel||'Compatible event',e.table,(e.matchedColumns||[]).join(', ')||e.triggerColumnsStatus,e.kind+' / static WDL compatibility only']);
 const pluginCandidates=flows.flatMap(f=>f.writes.flatMap(w=>pluginSteps.flatMap(p=>{
  const pp=p.properties||{},table=pp.PrimaryEntity||pp.primaryEntity||'',message=norm(pp.MessageName||pp.messagename||'');
  const event=message.includes('update')?'modified':message.includes('create')?'added':message.includes('delete')?'deleted':'';
  if(!table||norm(table)!==norm(w.table)||!event||!(w.events||[]).includes(event)||w.environment!=='Current environment')return [];
  const filtering=String(pp.FilteringAttributes||pp.filteringattributes||'').split(',').map(s=>norm(s)).filter(Boolean);
  const overlap=filtering.filter(x=>(w.columns||[]).some(c=>norm(c)===x));
  if(event==='modified'&&filtering.length&&w.columnsStatus==='Specified columns'&&!overlap.length)return [];
  return [['Potential flow → plug-in',f.name+' → '+p.name,'Compatible '+message,w.table,overlap.join(', ')||'Unresolved / no filter','Registration matches event; plug-in code and subsequent writes unknown']];
 })));
 const securityRows=types('role').flatMap(c=>{
  const nodes=[];const walk=items=>{for(const n of items||[]){if(n.kind==='roleprivilege')nodes.push(n);walk(n.children);}};
  walk(model.objectDetails?.[c.id]?.children);
  return nodes.length?nodes.map(n=>[c.name,n.name,n.properties.Level||n.properties.level||n.properties.Depth||'Depth not supplied','Declared in '+(model.objectDetails?.[c.id]?.source||c.source||'exported role XML')]):
   [[c.name,'Privileges not individually extracted',c.properties?.privilegeCount||'Not supplied','Effective permissions and assignments unknown']];
 });
 return {
  overview:`${model.info?.name||'The selected solution'} contains ${components.length} recognised components across ${new Set(components.map(c=>c.type)).size} families: ${count('app')} apps, ${count('table')} tables, ${count('flow')} flows/workflows, ${count('pluginstep')} plug-in steps, ${count('role')} roles and ${count('connector')} custom connectors. Counts describe the supplied package, not a live tenant.`,
  maps:{
   execution:[...flowTriggers,...flowWrites,...pluginRegistrations,...propagation,...pluginCandidates],
   lineage:components.filter(c=>['column','view','form','pluginstep','businessrule'].includes(c.type)).flatMap(c=>forComponent(model,c).interactions.map(i=>[c.name,i.operation,i.table,i.columns,i.confidence,i.evidence])).concat(flows.flatMap(f=>[...f.triggers.map(t=>[f.name,'Trigger: '+t.change,t.table||'Unresolved',(t.columns||[]).join(', ')||t.columnsStatus,'Static WDL',t.step]),...f.writes.map(w=>[f.name,'Write: '+w.operation,w.table||'Unresolved',(w.columns||[]).join(', ')||w.columnsStatus,'Static WDL',w.step])])),
   applications:types('app').map(c=>[c.name,c.properties?.kind||'Unknown app type',c.source||'Inventory only',(graph?.outgoing.get(c.id)||[]).filter(e=>e.kind!=='possible').map(e=>graph.nodes.get(e.to)?.name||e.to).join(', ')||'No verified packaged references']),
   security:securityRows,
   integrations:components.filter(c=>['connection','connector','environment','endpoint','customapi'].includes(c.type)).map(c=>[c.name,c.type,c.properties?.connector||c.properties?.ConnectorId||'Not supplied',c.source||'Inventory only'])
    .concat((model.flowDetails||[]).flatMap(f=>(f.connections||[]).map(conn=>[f.name,'Flow connection reference',conn.alias,conn.connector||'Connector unresolved'])))
    .concat(flows.flatMap(f=>(f.analytics?.unsupported?[ [f.name,'Flow external/unsupported actions',String(f.analytics.unsupported),'Target not established'] ]:[]))),
   dependencies:(graph?.edges||[]).map(e=>[graph.nodes.get(e.from)?.name||e.from,graph.nodes.get(e.to)?.name||e.to,e.kind,e.evidence?.[0]?.path||'Structured metadata',e.evidence?.[0]?.detail||'']),
   cycles:feedback.loops.map(l=>[l.type,l.flowIds.map(i=>flows.find(f=>f.index===i)?.name||i).join(' → '),l.links.map(e=>e.table+' / '+(e.matchedColumns||[]).join(', ')).join('; '),'Potential path only; row-level causality is unverified'])
  },warnings:[...(model.warnings||[]),...(graph?.warnings||[]),'Plug-in assembly binaries are not decompiled; plug-in writes cannot be inferred from registration alone.']
 };
}
function markup(doc){
 if(!doc)return '';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pairs=[['What is this?',doc.overview.what],['What does it do?',doc.overview.does],['When does it run or appear?',doc.overview.when],['What information does it use or change?',doc.overview.data],['What does it depend on?',doc.overview.depends],['What could be affected if it changes?',doc.overview.impact],['What should someone verify?',doc.overview.verify]];
 const table=(heads,rows)=>`<div class="table-scroller"><table class="property-table"><thead><tr>${heads.map(x=>'<th>'+esc(x)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')||'<tr><td colspan="'+heads.length+'">No evidence in the supplied package.</td></tr>'}</tbody></table></div>`;
 const excerpt=(rows,max=150)=>rows.length>max?`<p class="muted">Showing ${max} of ${rows.length} records here. Word and PowerPoint contain the complete available inventory.</p>`:'';
 return `<section class="component-documentation"><h4>Plain-English architecture documentation</h4><p><strong>Confidence:</strong> ${esc(doc.confidence)} · <strong>Identifier:</strong> ${esc(doc.identifier)}</p>${pairs.map(([key,value])=>`<div class="doc-explanation"><strong>${esc(key)}</strong><p>${esc(value)}</p></div>`).join('')}
 <details><summary>Data interactions (${doc.interactions.length})</summary>${table(['Operation','Table','Columns','Evidence','Confidence'],doc.interactions.slice(0,150).map(x=>[x.operation,x.table,x.columns,x.evidence,x.confidence]))}${excerpt(doc.interactions)}</details>
 <details><summary>Dependencies and references (${doc.relationships.length})</summary>${table(['Direction','Component','Evidence class','Source'],doc.relationships.slice(0,150).map(x=>[x.direction,x.other,x.kind,x.evidence?.[0]?.path||'Structured metadata']))}${excerpt(doc.relationships)}</details>
 <details><summary>Missing or unverified (${doc.missing.length})</summary><ul>${doc.missing.map(x=>'<li>'+esc(x)+'</li>').join('')||'<li>No additional gaps identified; runtime behaviour still requires verification.</li>'}</ul></details>
 <details><summary>Source evidence (${doc.evidence.length})</summary><ul>${doc.evidence.map(x=>'<li>'+esc(x)+'</li>').join('')||'<li>No source path was supplied.</li>'}</ul></details><p class="muted">${esc(doc.status)}</p></section>`;
}
root.SolutionDocumentation={forComponent,solution,markup,blank};
})(globalThis);
