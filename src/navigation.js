/* Keep anchor offsets in sync with the real heights of the two sticky menus.
 * Runs in the online, standalone offline and model-driven Dataverse editions.
 * No network, storage, scroll tracking or external library dependencies. */
(function(){
'use strict';
const root=document.documentElement;
const header=document.querySelector('mightora-header');
const quick=document.querySelector('.quick-jump-nav');
const embedded=document.querySelector('.dv-topbar');
function measure(){
  if(embedded){
    const height=Math.ceil(embedded.getBoundingClientRect().height);
    if(height>0)root.style.setProperty('--mightora-dataverse-topbar-height',height+'px');
    return;
  }
  if(header){
    const height=Math.ceil(header.getBoundingClientRect().height);
    if(height>0)root.style.setProperty('--mightora-sticky-header-height',height+'px');
  }
  if(quick){
    const height=Math.ceil(quick.getBoundingClientRect().height);
    if(height>0)root.style.setProperty('--mightora-sticky-quicknav-height',height+'px');
  }
}
measure();
if(typeof ResizeObserver!=='undefined'){
  const observer=new ResizeObserver(measure);
  for(const node of [header,quick,embedded])if(node)observer.observe(node);
}
window.addEventListener('resize',measure,{passive:true});
window.addEventListener('load',measure,{once:true});
})();
