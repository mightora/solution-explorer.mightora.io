/* All web-resource payloads stay in browser memory and are shown only as text or
 * safely decoded raster images. No HTML, JavaScript, XML, SVG or CSS is executed. */
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const api=root.SolutionWebResources;let model=null,selected=null,previewUrl=null,requestId=0;
 function cleanup(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}requestId++;}
 function renderList(){
  const values=model?.webResources||[],q=$('webresource-search').value.trim().toLowerCase(),type=$('webresource-filter').value;
  const list=values.filter(x=>(type==='all'||(type==='text'?api.textResource(x.name):type==='image'?!!api.imageMime(x.name):!api.textResource(x.name)&&!api.imageMime(x.name)))&&[x.name,x.kind,x.path].some(y=>String(y||'').toLowerCase().includes(q)));
  $('webresource-count').textContent=list.length+' of '+values.length+' web resources';
  $('webresource-list').innerHTML=list.length?list.map(r=>`<li><button type="button" class="webresource-item${selected?.id===r.id?' selected':''}" data-resource-id="${esc(r.id)}" aria-pressed="${selected?.id===r.id}"><strong>${esc(r.name)}</strong><small>${esc(r.kind)} · ${r.size===null?'Metadata only':formatSize(r.size)}</small></button></li>`).join(''):'<li class="object-empty">No matching resources. Load an exported solution ZIP or change the filter.</li>';
 }
 const formatSize=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?(n/1024).toFixed(1)+' KB':n+' bytes';
 async function inspect(id){
  const r=model?.webResources?.find(x=>x.id===id);if(!r)return;
  selected=r;cleanup();const serial=requestId;renderList();
  const pane=$('webresource-inspector');pane.replaceChildren();
  const title=document.createElement('h3');title.textContent=r.name;pane.append(title);
  const detail=document.createElement('p');detail.className='webresource-meta';detail.textContent=[r.kind,r.path?.startsWith('dataverse:')?'Live Dataverse · read on request':r.size===null?'Payload not included':formatSize(r.size),r.path?.startsWith('dataverse:')?'Current signed-in environment':r.path||'Metadata only'].join(' · ');pane.append(detail);
  const dl=document.createElement('dl');dl.className='object-properties';
  for(const [key,value] of Object.entries(r.properties||{})){
   if(/^(content|data|secret|password|token|credential)$/i.test(key))continue;
   const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=String(value);row.append(dt,dd);dl.append(row);
  }
  if(dl.childElementCount)pane.append(dl);
  if(!r.path){const p=document.createElement('p');p.className='object-limited';p.textContent='The solution includes this resource reference but not its file contents. Upload an export that contains WebResources payload files to inspect the source.';pane.append(p);return;}
  const actions=document.createElement('div');actions.className='webresource-actions';const btn=document.createElement('button');btn.type='button';btn.className='btn btn-outline small';btn.textContent='Download original file ↓';actions.append(btn);pane.append(actions);
  const exportStatus=document.createElement('p');exportStatus.setAttribute('role','status');pane.append(exportStatus);
  for(const kind of ['docx','pptx']){const button=document.createElement('button');button.type='button';button.className='btn btn-outline small';button.textContent='Editable '+(kind==='docx'?'Word':'PowerPoint')+' ↓';actions.append(button);button.addEventListener('click',async()=>{
   try{if(!root.SolutionDetails.sourcesFor(model,r.id).length&&api.textResource(r.name)){const text=await root.MightoraResourceProvider.read(r,'string');model.componentSources=model.componentSources||Object.create(null);model.componentSources[r.id]=[{path:r.path,language:r.kind,text,kind:'Web resource source'}];}await root.SolutionComponentUI.exportItem(model,r.id,kind,button,exportStatus);}catch(e){exportStatus.textContent=e.message;}
  });}
  const output=document.createElement('div');output.className='webresource-output';output.textContent='Reading resource from ZIP locally…';pane.append(output);
  const provider=root.MightoraResourceProvider;
  if(!provider){output.textContent='Original ZIP contents are not available in this view.';btn.disabled=true;return;}
  btn.addEventListener('click',async()=>{btn.disabled=true;try{await provider.download(r);}catch(error){output.textContent='Could not download file: '+error.message;}finally{btn.disabled=false;}});
  try{
   const name=r.name,asText=api.textResource(name),mime=api.imageMime(name);
   if(r.size>1024*1024&&asText){output.textContent='Source exceeds the 1 MB on-screen reading limit. Use Download original file to inspect it locally.';return;}
   if(r.size>8*1024*1024&&mime){output.textContent='Image exceeds the 8 MB preview limit. You can still download the original.';return;}
   if(asText){const content=await provider.read(r,'string');if(serial!==requestId)return;
    output.replaceChildren();const hint=document.createElement('p');hint.className='webresource-note';hint.textContent='Read-only source · never executed or rendered as active HTML';
    const pre=document.createElement('pre');pre.className='webresource-source';pre.textContent=content;output.append(hint,pre);
   }else if(mime){const raw=await provider.read(r,'uint8array');if(serial!==requestId)return;
    previewUrl=URL.createObjectURL(new Blob([raw],{type:mime}));output.replaceChildren();const img=document.createElement('img');img.className='webresource-image';img.alt='Raster preview of '+r.name;img.src=previewUrl;output.append(img);
   }else output.textContent='This binary or active-image format is not executed or previewed. Download the original file to inspect it with a suitable tool.';
  }catch(error){if(serial===requestId)output.textContent='Unable to read the resource from this ZIP: '+error.message;}
 }
 document.addEventListener('solution-workspace-change',e=>{model=e.detail.a;if(model&&!model.webResources)model.webResources=api.catalog(model);selected=null;cleanup();renderList();$('webresource-inspector').innerHTML='<p class="object-empty">Choose a web resource to inspect its metadata and packaged source safely.</p>';});
 $('webresource-search').addEventListener('input',renderList);$('webresource-filter').addEventListener('change',renderList);
 $('webresource-list').addEventListener('click',e=>{const button=e.target.closest('button[data-resource-id]');if(button)inspect(button.dataset.resourceId);});
})(globalThis);
