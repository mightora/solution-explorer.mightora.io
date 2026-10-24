/* ZIP web-resource file index. Only paths and metadata are retained in the model;
 * executable contents are read on demand and must never be rendered as HTML. */
(function(root){
 'use strict';
 const norm=s=>String(s||'').replace(/\\/g,'/').replace(/^\/+/, '').toLowerCase();
 const resourcePath=p=>String(p||'').replace(/\\/g,'/').replace(/^.*?(?:^|\/)webresources\//i,'');
 const isPayload=p=>/(?:^|\/)webresources\//i.test(p)&&!/\.(?:data|metadata)\.xml$/i.test(p);
 const typeOf=p=>{const ext=(String(p).split('.').pop()||'').toLowerCase();return ({js:'JavaScript',mjs:'JavaScript',ts:'TypeScript',css:'CSS',html:'HTML',htm:'HTML',xml:'XML',svg:'SVG source',json:'JSON',resx:'RESX',xsl:'XSLT',txt:'Text',md:'Markdown',map:'Source map',png:'PNG image',jpg:'JPEG image',jpeg:'JPEG image',gif:'GIF image',webp:'WebP image',ico:'Icon',woff:'Font',woff2:'Font',ttf:'Font'}[ext]||'Binary / other');};
 const textResource=p=>/\.(?:js|mjs|ts|css|html?|xml|svg|json|resx|xsl|txt|md|map)$/i.test(p);
 const imageMime=p=>({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[String(p).split('.').pop().toLowerCase()]||'');
 function catalog(model,entries=[]){
  const raw=(model?.components||[]).filter(c=>c.type==='webresource'),resources=raw.filter(c=>!raw.some(other=>other.id!==c.id&&other.properties?.fileName&&norm(resourcePath(other.properties.fileName))===norm(c.name))),files=entries.filter(e=>isPayload(e.path));
  const used=new Set();const found=resources.map(c=>{
   const name=norm(c.name),explicit=norm(c.properties?.fileName),candidate=(explicit?files.find(e=>norm(e.path)===explicit||norm(resourcePath(e.path))===norm(resourcePath(explicit))):null)||files.find(e=>norm(resourcePath(e.path))===name)||files.find(e=>norm(resourcePath(e.path)).replace(/^\/+/, '')===name.replace(/^\/+/, ''));
   if(candidate)used.add(candidate.path);
   return {id:c.id,name:c.name,kind:typeOf(candidate?.path||c.name),path:candidate?.path||'',size:candidate?.size??null,coverage:c.coverage||'inspected',properties:c.properties||{}};
  });
  for(const e of files)if(!used.has(e.path))found.push({id:'webresource:'+norm(resourcePath(e.path)),name:resourcePath(e.path),kind:typeOf(e.path),path:e.path,size:e.size??null,coverage:'discovered',properties:{}});
  return found.sort((a,b)=>a.name.localeCompare(b.name));
 }
 root.SolutionWebResources={catalog,typeOf,textResource,imageMime,resourcePath,isPayload};
})(globalThis);
