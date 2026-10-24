/* Read-only form wireframes rendered entirely from safe extracted FormXML metadata. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
let forms=[],selected=0,activeTab=0,model=null;
function layout(form){
 const tabs=form.tabs||[],tab=tabs[activeTab]||tabs[0];
 const nav=tabs.map((t,i)=>`<button type="button" class="form-tab ${i===activeTab?'active':''}" data-form-tab="${i}" role="tab" aria-selected="${i===activeTab}" tabindex="${i===activeTab?0:-1}">${esc(t.name)}${t.visible?'':' · hidden'}</button>`).join('');
 const sections=(tab?.sections||[]).map((s,i)=>`<section class="form-wire-section" style="--column:${Math.min(s.column,2)}" aria-label="${esc(s.name)}"><h4>${esc(s.name)}${!s.visible?' <small>(hidden in designer)</small>':''}</h4><div class="form-wire-controls">${s.fields.map(f=>`<div class="form-wire-field"><span class="form-wire-label">${f.field?`<button type="button" class="explore-link" ${model?.components.some(c=>c.id==='column:'+(form.table+'.'+f.field).toLowerCase())?'':'disabled title="Column metadata is not packaged"'} data-explore-id="${esc('column:'+(form.table+'.'+f.field).toLowerCase())}">${esc(f.label)}</button>`:esc(f.label)}${f.required?' <em>*</em>':''}</span>${f.kind==='Field'?`<div class="form-wire-input" aria-hidden="true"><span>${esc(f.field||'Data field')}</span></div>`:`<div class="form-wire-special">${esc(f.kind)}</div>`}</div>`).join('')||'<p class="form-wire-empty">No controls described in this section.</p>'}</div></section>`).join('');
 return `<div class="form-wire-top"><div><div class="form-wire-eyebrow">MODEL-DRIVEN FORM · STRUCTURAL PREVIEW</div><h3>${esc(form.name)}</h3><p>${esc(form.table)} · ${esc(form.type)}</p></div><span class="form-wire-readonly">READ ONLY</span></div><div class="form-wire-bar"><span>Record</span><span>Save</span><span>Refresh</span><span>More ▾</span></div><div class="form-wire-tabs" role="tablist" aria-label="Form tabs">${nav||'<span>Layout not present in export</span>'}</div><div class="form-wire-body" role="tabpanel">${sections||'<p class="form-wire-empty">This form was identified, but tab, section or field layout was not included in the exported XML.</p>'}</div>`;
}
function render(){
 const pick=$('form-preview-choice'),host=$('form-preview-stage');pick.replaceChildren();
 for(const [i,f] of forms.entries()){const o=document.createElement('option');o.value=String(i);o.textContent=f.table+' / '+f.name;pick.append(o);}
 pick.disabled=!forms.length;
 const f=forms[selected];
 if(!f){host.innerHTML='<div class="form-wire-empty">No inspectable FormXML was found. A solution can list a form without containing its full layout definition. Try the component showcase example.</div>';
  $('form-preview-summary').textContent='Load a solution with form layout definitions.';return;}
 pick.value=String(selected);
 $('form-preview-summary').textContent=`${forms.length} form layout(s) · ${f.tabCount} tabs · ${f.sectionCount} sections · ${f.fieldCount} controls`+(f.truncated?' · Some detail was truncated':'');
 host.innerHTML=layout(f)+(globalThis.SolutionComponentUI?'<div class="form-event-details">'+globalThis.SolutionComponentUI.formEvents(f,model)+'</div>':'');
 for(const b of host.querySelectorAll('[data-form-tab]'))b.addEventListener('click',()=>{activeTab=Number(b.dataset.formTab)||0;render();});
}
$('form-preview-choice').addEventListener('change',e=>{selected=Number(e.target.value)||0;activeTab=0;render();});
document.addEventListener('solution-workspace-change',e=>{model=e.detail?.a||null;forms=model?.formLayouts||[];selected=0;activeTab=0;render();});
document.addEventListener('object-open-request',e=>{
 const id=e.detail?.id||'';
 if(!id.startsWith('form:')||!forms.length)return;
 const i=forms.findIndex(f=>id==='form:'+(f.table+' / '+f.name).toLowerCase());
 if(i>=0){selected=i;activeTab=0;render();$('form-preview').scrollIntoView({behavior:'smooth'});}
});
render();
})();
