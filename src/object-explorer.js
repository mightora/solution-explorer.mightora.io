/* Mightora Solution Explorer — safe, read-only object hierarchy from local export metadata.
 * This does not preserve original XML, flow inputs, scripts or parameter values. */
(function (root) {
  'use strict';
  const MAX_SUBTREE_NODES=160, MAX_TOTAL_NODES=6000, MAX_DEPTH=9;
  const secret=/(?:password|secret|token|authorization|cookie|credential|apikey|api_key|privatekey|connectionstring|clientsecret|client_secret|currentvalue|defaultvalue|accesskey|accountkey|sas|certificate|script|sourcecode|formula|body|headers|inputs|outputs)/i;
  const safeKeys=new Set(('name displayname logicalname schemaname physicalname originalname uniquename type typename attributetype attributetypename entityname primaryentity primaryidattribute primarynameattribute referencingentityname referencedentityname sourceentityname targetentityname version category statecode stage mode messagename operationid rank order value description ownershiptype requiredlevel maxlength length isglobal isfunction keyattributes imageType imagetype ismanaged executionstage filteringattributes entitylogicalname entityalias fieldname fieldtype connectorid statuscode applicablefrom componenttype componentstate code typename formtype reporttype selectedentity attribute logicalentityname boundentitylogicalname relatedsla iscustomizable relationshiptype entityrelationshiptype savedqueryid pluginType pluginassemblyname assemblyname publickeytoken isolationmode canread cancreate canupdate subtype language controlname').split(' '));
  const tagToType={entity:'table',attribute:'column',entityrelationship:'relationship',relationship:'relationship',workflow:'flow',webresource:'webresource',webresourcebase:'webresource',connectionreference:'connection',environmentvariabledefinition:'environment',appmodule:'app',canvasapp:'app',systemform:'form',savedquery:'view',globaloptionset:'choice',optionset:'choice',entitykey:'key',businessrule:'businessrule',businessprocessflow:'bpf',processaction:'action',customapi:'customapi',customapirequestparameter:'apiparameter',customapiresponseproperty:'apiparameter',pluginassembly:'pluginassembly',plugintype:'plugintype',sdkmessageprocessingstep:'pluginstep',sdkmessageprocessingstepimage:'pluginimage',customcontrol:'pcf',role:'role',securityrole:'role',roleprivilege:'privilege',fieldsecurityprofile:'fieldsecurity',fieldpermission:'fieldpermission',dashboard:'dashboard',savedqueryvisualization:'chart',userqueryvisualization:'chart',sitemap:'sitemap',ribboncustomization:'ribbon',ribbondiffxml:'ribbon',ribboncommand:'command',commanddefinition:'command',ribbonrule:'command',connector:'connector',serviceendpoint:'endpoint',webhook:'endpoint',sla:'sla',slaitem:'slaitem',routingrule:'routing',routingruleitem:'routing',queue:'queue',entitymap:'datamap',attributemap:'datamap',importmap:'datamap',duplicaterule:'duplicate',duplicaterulecondition:'duplicate',emailtemplate:'emailtemplate',template:'emailtemplate',mobileofflineprofile:'offlineprofile',mobileofflineprofileitem:'offlineprofile',report:'report',powerpagesite:'powerpages',powerpagecomponent:'powerpages',adx_website:'powerpages',adx_webtemplate:'webtemplate',webtemplate:'webtemplate',bot:'copilot',copilot:'copilot',copilotagent:'copilot',botcomponent:'topic',topic:'topic',aiprompt:'prompt',prompt:'prompt',aiproject:'ai',aimodel:'ai',aiconfiguration:'ai'};
  const majorNodes=new Set(('entity attribute entityrelationship relationship workflow webresource connectionreference environmentvariabledefinition appmodule canvasapp systemform savedquery option optionset globaloptionset entitykey key businessrule businessprocessflow processaction customapi customapirequestparameter customapiresponseproperty pluginassembly plugintype sdkmessageprocessingstep sdkmessageprocessingstepimage customcontrol role roleprivilege fieldsecurityprofile fieldpermission dashboard savedqueryvisualization userqueryvisualization sitemap ribboncommand commanddefinition ribbonrule connector serviceendpoint webhook sla slaitem routingrule routingruleitem queue entitymap attributemap importmap duplicaterule duplicaterulecondition emailtemplate template mobileofflineprofile mobileofflineprofileitem report powerpagesite powerpagecomponent adx_website adx_webtemplate webtemplate bot copilot copilotagent botcomponent topic aiprompt prompt aiproject aimodel aiconfiguration stage step condition branch trigger action case control privilege requiredlevel attributeMetadata stageDefinition actionDefinition').toLowerCase().split(' '));
  const localName=n=>String(n?.localName||n?.nodeName||'').toLowerCase();
  const elements=n=>Array.from(n?.childNodes||[]).filter(x=>x.nodeType===1);
  const read=(n,keys)=>{
    for(const key of keys){const k=key.toLowerCase();if(secret.test(k))continue;
      const a=Array.from(n?.attributes||[]).find(x=>x.name.toLowerCase()===k);
      if(a?.value) return String(a.value).replace(/[\r\n\t]/g,' ').slice(0,160);
      const el=elements(n).find(x=>localName(x)===k);
      if(el&&!elements(el).length&&el.textContent)return String(el.textContent).replace(/[\r\n\t]/g,' ').slice(0,160);
    }
    return '';
  };
  const genericName=n=>read(n,['PhysicalName','LogicalName','SchemaName','UniqueName','TypeName','Name','DisplayName','Title','EntityAlias','Id','Value','Stage','Type'])||localName(n);
  const normalized=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  function props(n){
    const out={};
    for(const a of Array.from(n?.attributes||[])){
      const key=a.name.toLowerCase();if(!safeKeys.has(key)||secret.test(key))continue;
      out[a.name]=String(a.value).replace(/[\r\n\t]/g,' ').slice(0,160);
    }
    for(const el of elements(n)){
      const key=localName(el);if(!safeKeys.has(key)||secret.test(key)||elements(el).length||out[key])continue;
      if(el.textContent)out[key]=String(el.textContent).replace(/[\r\n\t]/g,' ').slice(0,160);
    }
    return out;
  }
  function parseXML(source){try{const doc=new DOMParser().parseFromString(source,'application/xml');if(Array.from(doc.getElementsByTagName('*')).some(n=>localName(n)==='parsererror'))return null;return doc;}catch{return null;}}
  function nested(rootNode,budget){
    const children=[];
    function traverse(n,target,depth){
      if(depth>MAX_DEPTH||budget.remaining<=0)return;
      for(const el of elements(n)){
        if(budget.remaining<=0)break;
        const tag=localName(el);
        if(secret.test(tag)||tag==='clientdata'||tag==='formxml'||tag==='layoutxml'||tag==='fetchxml')continue;
        // Flatten transport/wrapper tags. Only display structural objects with a recognised identity.
        const significant=majorNodes.has(tag)||Boolean(tagToType[tag])||Boolean(read(el,['Name','SchemaName','PhysicalName','TypeName']));
        const nextDepth=significant?depth+1:depth;
        if(significant){
          if(nextDepth>MAX_DEPTH)continue;
          budget.remaining--;
          const child={name:genericName(el),kind:tag,properties:props(el),children:[]};
          target.push(child);
          traverse(el,child.children,nextDepth);
        } else if(depth<MAX_DEPTH)traverse(el,target,depth);
      }
    }
    traverse(rootNode,children,0);
    return children;
  }
  function componentId(n,map){
    const tag=localName(n);let type=tagToType[tag];if(!type)return '';
    let name=read(n,['PhysicalName','LogicalName','SchemaName','UniqueName','TypeName','Name','Title','DisplayName','EntityAlias']);
    if(!name)return '';
    if(type==='flow'&&tag==='workflow'){
      const category=read(n,['Category']);type=({'2':'businessrule','3':'action','4':'bpf'}[category]||'flow');
    }
    if(type==='column'||type==='form'||type==='view'){
      let p=n.parentNode,table='';let i=0;
      while(p&&i++<16){if(localName(p)==='entity'){table=read(p,['Name','LogicalName','SchemaName']);break;}p=p.parentNode;}
      if(table) name=type==='column'?table+'.'+name:table+' / '+name;
    }
    const id=type+':'+normalized(name);
    return map.has(id)?id:'';
  }
  function enrich(model,files){
    const lookup=new Map((model.components||[]).map(c=>[c.id,c]));
    const details=Object.create(null);let total=0;
    for(const [path,content] of files){
      if(total>=MAX_TOTAL_NODES)break;
      if(!/\.xml$/i.test(path)||/(?:^|\/)solution\.xml$/i.test(path))continue;
      const doc=parseXML(content);if(!doc)continue;
      for(const n of Array.from(doc.getElementsByTagName('*'))){
        if(total>=MAX_TOTAL_NODES)break;
        const id=componentId(n,lookup);if(!id)continue;
        // Prefer richer component definitions over later metadata-only copies.
        const budget={remaining:Math.min(MAX_SUBTREE_NODES,MAX_TOTAL_NODES-total)};
        const nodes=nested(n,budget),used=Math.min(MAX_SUBTREE_NODES,MAX_TOTAL_NODES-total)-budget.remaining;
        const prev=details[id];if(prev&&(prev.children.length>=nodes.length))continue;
        if(prev)total-=prev.nodeCount;
        const source=String(path).replace(/\\/g,'/').slice(0,220);
        details[id]={name:lookup.get(id).name,source,properties:props(n),children:nodes,nodeCount:used,limited:budget.remaining===0};total+=used;
      }
    }
    // WDL definitions are inspected separately and provide safe step metadata.
    if(root.SolutionFlowExplorer){
      try{for(const flow of root.SolutionFlowExplorer.collect(files)){
        const match=(model.components||[]).find(c=>c.type==='flow'&&normalized(c.name)===normalized(flow.name));
        if(!match)continue;
        const nodes=flow.steps.slice(0,MAX_SUBTREE_NODES).map(s=>({name:s.name,kind:s.type||'action',properties:{branch:s.branch,connector:s.connector,operation:s.operation,runAfter:Object.keys(s.runAfter||{}).join(', '),expressionFunctions:(s.expressionFunctions||[]).join(', ')},children:[]}));
        const prev=details[match.id];if(!prev||nodes.length>prev.children.length)details[match.id]={name:match.name,source:flow.source,properties:{triggers:flow.triggerCount,actions:flow.actionCount},children:nodes,nodeCount:nodes.length,limited:flow.steps.length>nodes.length};
      }}catch{ /* XML inventory remains usable if WDL inspection fails */ }
    }
    return {...model,objectDetails:details};
  }
  function related(model,component){
    if(!component)return [];
    const found=new Map();
    const all=model?.components||[];
    const norm=normalized(component.name), p=component.properties||{};
    for(const other of all){if(other.id===component.id)continue;
      const v=other.properties||{};
      const table=normalized(v.table);
      const linked=component.type==='table'&&(table===norm||((other.type==='relationship')&&[v.source,v.target].some(x=>normalized(x)===norm)));
      const reversed=other.type==='table'&&(normalized(p.table)===normalized(other.name)||component.type==='relationship'&&[p.source,p.target].some(x=>normalized(x)===normalized(other.name)));
      const plugin=component.type==='pluginassembly'&&other.type==='plugintype'&&normalized(v.assemblyname||v.AssemblyName)===norm;
      const step=component.type==='plugintype'&&other.type==='pluginstep'&&normalized(v.pluginType||v.plugintype)===norm;
      const image=component.type==='pluginstep'&&other.type==='pluginimage'&&normalized(v.step||v.StepName)===norm;
      if(linked||reversed||plugin||step||image)found.set(other.id,other);
    }
    for(const dep of model?.dependencies||[]){if(dep.required===component.id){const c=all.find(x=>x.id===dep.dependent);if(c)found.set(c.id,c);}
      if(dep.dependent===component.id){const c=all.find(x=>x.id===dep.required);if(c)found.set(c.id,c);}}
    return Array.from(found.values()).slice(0,250);
  }
  function group(model,query='',coverage='all'){
    const q=normalized(query),list=model?.components||[];
    const groups=new Map();
    for(const c of list){
      const details=model?.objectDetails?.[c.id];
      const text=[c.name,c.type,c.description,...Object.entries(c.properties||{}).flat(),...(details?.children||[]).slice(0,30).map(x=>x.name)].join(' ').toLowerCase();
      if((coverage!=='all'&&(c.coverage||'inspected')!==coverage)||(q&&!text.includes(q)))continue;
      if(!groups.has(c.type))groups.set(c.type,[]);groups.get(c.type).push(c);
    }
    return Array.from(groups).sort((a,b)=>(root.SolutionCore.TYPES.indexOf(a[0])-root.SolutionCore.TYPES.indexOf(b[0])));
  }
  root.SolutionObjectExplorer={enrich,group,related,MAX_SUBTREE_NODES};
})(globalThis);
