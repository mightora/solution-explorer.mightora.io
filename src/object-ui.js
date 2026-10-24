/* Mightora Solution Explorer — browser-only, keyboard accessible object browsing. */
(function(){
'use strict';
const api=globalThis.SolutionObjectExplorer,core=globalThis.SolutionCore;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let model=null,selected='',search='',coverage='all',openGroups=new Set(),amount=new Map();
const count=type=>amount.get(type)||200;
const status=c=>core.COVERAGE?.[c?.coverage]||'Inspected metadata';
const typeName=t=>core.LABELS[t]||t;
function properties(obj){const entries=Object.entries(obj||{});return entries.length?'<dl class="object-properties">'+entries.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(String(value))}</dd></div>`).join('')+'</dl>':'<p class="muted">No additional inspectable properties in this export.</p>';}
function detailsHTML(nodes,depth=0){
 if(depth>9||!nodes?.length)return '';
 return `<ul class="object-inner-list">${nodes.map(n=>`<li><details class="object-child"><summary><span class="object-child-name">${esc(n.name)}</span><span class="object-child-kind">${esc(n.kind)}</span>${n.children?.length?`<span class="object-child-count">${n.children.length}</span>`:''}</summary><div class="object-child-body">${properties(n.properties)}${detailsHTML(n.children,depth+1)}</div></details></li>`).join('')}</ul>`;
}
function select(id,scroll=false){
 const c=model?.components.find(x=>x.id===id);if(!c)return;
 selected=id;const detail=model?.objectDetails?.[id],others=api.related(model,c);
 const area=$('object-inspector');
 area.innerHTML=`<div class="object-inspector-top"><span class="type-chip">${esc(typeName(c.type))}</span><span class="coverage-tag ${esc(c.coverage||'inspected')}">${esc(status(c))}</span></div>
   <h3>${esc(c.name)}</h3><p class="object-description">${esc(c.description||'Metadata discovered inside this solution export.')}</p>
   <div class="object-source"><strong>Source:</strong> ${esc(detail?.source||c.source||'Extracted component inventory')}</div>
   <h4>Component properties</h4>${properties({...c.properties,...detail?.properties})}
   <div class="object-inspector-actions"><button class="btn btn-outline small" id="object-trace">Where used and impact ↗</button><button class="btn btn-outline small" id="object-download">Export selected JSON ↓</button><button class="btn btn-outline small" id="object-docx">Editable Word ↓</button><button class="btn btn-outline small" id="object-pptx">Editable PowerPoint ↓</button>${c.type==='flow'?'<a class="btn btn-outline small" href="#flow-explorer">Open flow map ↗</a>':''}</div><p id="object-export-status" role="status"></p>
   ${globalThis.SolutionComponentUI?.markup(model,id)||''}
   <h4>Contained objects <span class="object-count-inline">${detail?.nodeCount||0}</span></h4>
   ${detail?.children?.length?detailsHTML(detail.children):`<p class="object-limited">${c.coverage==='referenced'?'This is an external dependency: its definition is not packaged here.':c.coverage==='unsupported'?'The component type is not yet mapped to a parser.': 'This export does not expose a recognised child-object definition for this component.'}</p>`}
   ${detail?.limited?'<p class="object-limited">This component reached the safe extraction limit. Additional nested objects may exist in the ZIP.</p>':''}
   <h4>Related solution components <span class="object-count-inline">${others.length}</span></h4>
   ${others.length?`<ul class="object-related">${others.map(x=>`<li><button type="button" data-related="${esc(x.id)}"><span>${esc(x.name)}</span><small>${esc(typeName(x.type))} ↗</small></button></li>`).join('')}</ul>`:'<p class="muted">No direct relationship found in the supported metadata. This is not proof of independence.</p>'}
   <p class="object-help">Missing details? <a href="https://github.com/mightora/solution-explorer.mightora.io/issues/new?template=bug_report.yml" target="_blank" rel="noopener noreferrer">Report an unsupported object ↗</a>. Please use fictional or redacted examples.</p>`;
 area.querySelector('#object-download').addEventListener('click',()=>{
   const payload={name:c.name,type:c.type,coverage:c.coverage||'inspected',source:detail?.source||c.source||'',properties:{...c.properties,...detail?.properties},children:detail?.children||[],related:others.map(x=>({name:x.name,type:x.type})),...globalThis.SolutionDetails?.component(model,id)};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='solution-object-'+c.type+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
 });
 for(const kind of ['docx','pptx'])area.querySelector('#object-'+kind).addEventListener('click',e=>globalThis.SolutionComponentUI.exportItem(model,id,kind,e.currentTarget,area.querySelector('#object-export-status')));
 area.querySelector('#object-trace').addEventListener('click',()=>document.dispatchEvent(new CustomEvent('component-explore-request',{detail:{id}})));
 for(const link of area.querySelectorAll('[data-related]'))link.addEventListener('click',()=>select(link.dataset.related,true));
 for(const button of $('object-tree').querySelectorAll('[data-object-id]')){const active=button.dataset.objectId===id;button.classList.toggle('selected',active);button.setAttribute('aria-current',active?'true':'false');}
 if(scroll){$('object-browser').scrollIntoView({behavior:'smooth',block:'start'});area.focus({preventScroll:true});}
}
function render(){
 const tree=$('object-tree'),groups=api.group(model,search,coverage);
 if(!model){tree.innerHTML='<p class="object-empty">Load a solution or choose the component showcase sample to explore its object tree.</p>';$('object-count').textContent='0 objects';$('object-inspector').innerHTML='<p class="object-empty">Select a component in the tree to inspect its properties, contained objects and relationships.</p>';return;}
 const total=groups.reduce((n,[,cs])=>n+cs.length,0);$('object-count').textContent=`${total.toLocaleString()} matching objects · ${groups.length} families`;
 if(!groups.length){tree.innerHTML='<p class="object-empty">No objects match your search or inspection filter.</p>';return;}
 tree.innerHTML=groups.map(([type,objects])=>{
  const visible=objects.slice(0,count(type));const isOpen=openGroups.has(type)||Boolean(search);
  return `<details class="object-family" data-family="${esc(type)}" ${isOpen?'open':''}><summary><strong>${esc(typeName(type))}</strong><span class="object-family-number">${objects.length}</span></summary>
    <ul class="object-family-items">${visible.map(c=>{
      const n=model.objectDetails?.[c.id]?.children?.length||0;
      return `<li><button type="button" class="object-pick${selected===c.id?' selected':''}" data-object-id="${esc(c.id)}" aria-current="${selected===c.id?'true':'false'}"><span class="object-pick-title">${esc(c.name)}</span><span class="object-pick-meta"><span class="object-dot ${esc(c.coverage||'inspected')}"></span>${esc(status(c))}${n?' · '+n+' nested':''}</span></button></li>`;
    }).join('')}</ul>${objects.length>visible.length?`<button type="button" class="object-show-more" data-more="${esc(type)}">Show next ${Math.min(200,objects.length-visible.length)} of ${objects.length} ↘</button>`:''}</details>`;
 }).join('');
 for(const item of tree.querySelectorAll('[data-family]'))item.addEventListener('toggle',()=>{if(item.open)openGroups.add(item.dataset.family);else openGroups.delete(item.dataset.family);});
 for(const item of tree.querySelectorAll('[data-object-id]'))item.addEventListener('click',()=>select(item.dataset.objectId));
 for(const item of tree.querySelectorAll('[data-more]'))item.addEventListener('click',()=>{amount.set(item.dataset.more,count(item.dataset.more)+200);openGroups.add(item.dataset.more);render();});
 if(selected&&groups.some(([,xs])=>xs.some(c=>c.id===selected)))select(selected);else select(groups[0][1][0]?.id);
}
$('object-search').addEventListener('input',e=>{search=e.target.value;render();});
$('object-coverage').addEventListener('change',e=>{coverage=e.target.value;render();});
$('object-expand-all').addEventListener('click',()=>{for(const tag of $('object-tree').querySelectorAll('details.object-family'))tag.open=true;});
$('object-collapse-all').addEventListener('click',()=>{for(const tag of $('object-tree').querySelectorAll('details.object-family'))tag.open=false;});
document.addEventListener('solution-workspace-change',e=>{model=e.detail?.a||null;selected='';openGroups.clear();amount.clear();render();});
document.addEventListener('object-open-request',e=>{if(model&&e.detail?.id){openGroups.add(e.detail.id.split(':')[0]);render();select(e.detail.id,true);}});
render();
})();
