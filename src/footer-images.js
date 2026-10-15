/* Ensure the shared Mightora footer never exposes broken image placeholders.
 * Preserve genuine dynamic workflow badges; accessible text is displayed only on failure. */
(function(){
'use strict';
if(document.documentElement.dataset.offline==='true')return;
const mirrors={
 'Tech Tweedie':'https://cdn.jsdelivr.net/gh/mightora/mightora.io@main/static/images/TechTweedie_bw.png',
 'Tweed.technology':'https://cdn.jsdelivr.net/gh/mightora/mightora.io@main/static/images/tweedTechnologyLogoLight.png',
 'mightora.io':'https://cdn.jsdelivr.net/gh/mightora/mightora.io@main/static/images/mightoraIoLogo4-200x900.png',
 'TechTweedie':'https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/main-logo.png',
 'Ian Tweedie':'https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/ian-tweedie-sq2.png'
};
function arm(img){
 if(img.dataset.logoRepair==='active')return;
 img.dataset.logoRepair='active';const text=img.alt||'Project evidence';
 const fallback=()=>{
  const span=document.createElement('span');span.className=img.closest('.evidence-badge')?'evidence-text-fallback':'footer-logo-fallback';
  span.textContent=text;span.setAttribute('role','img');span.setAttribute('aria-label',text);
  img.replaceWith(span);
 };
 img.addEventListener('error',()=>{
  if(!img.dataset.logoRetry&&mirrors[text]){
   img.dataset.logoRetry='1';img.style.display='';img.src=mirrors[text];
  }else fallback();
 });
 img.addEventListener('load',()=>{img.style.display='';});
 if(img.complete&&img.naturalWidth===0){
  // Existing inline onerror may have hidden images before we armed them.
  if(mirrors[text]){img.dataset.logoRetry='1';img.style.display='';img.src=mirrors[text];}else fallback();
 }
}
function scan(){document.querySelectorAll('mightora-footer .footer-brand img,.evidence-badge img,mightora-author img').forEach(arm);}
scan();
const observer=new MutationObserver(scan);observer.observe(document.body,{childList:true,subtree:true});
})();
