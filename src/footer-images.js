/* Repair Mightora's shared footer brand images with same-origin assets, a CDN fallback and legible labels.
 * Live CI/CodeQL badge images remain genuine; we show a neutral link label if they cannot load. */
(function(){
'use strict';
if(document.documentElement.dataset.offline==='true')return;
const origins={
 'mightora.io':['assets/mightora-logo.png','https://cdn.jsdelivr.net/gh/mightora/mightora.io@main/static/images/mightoraIoLogo4-200x900.png'],
 'Tech Tweedie':['assets/footer-techtweedie.png','https://cdn.jsdelivr.net/gh/mightora/mightora.io@main/static/images/TechTweedie_bw.png'],
 'Tweed.technology':['assets/footer-tweed.png','https://cdn.jsdelivr.net/gh/mightora/mightora.io@main/static/images/tweedTechnologyLogoLight.png'],
 'TechTweedie':['https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/main-logo.png'],
 'Ian Tweedie':['https://cdn.jsdelivr.net/gh/mightora/shared-ui@main/ian-tweedie-sq2.png']
};
function arm(img){
 if(img.dataset.repairArmed==='yes')return;
 img.dataset.repairArmed='yes';
 const title=img.alt||'Project evidence',links=origins[title]||[];
 const brand=!!img.closest('.footer-brand');
 const fallback=()=>{
   const span=document.createElement('span');
   span.className=img.closest('.evidence-badge')?'evidence-text-fallback':'footer-logo-fallback';
   span.textContent=title;span.setAttribute('role','img');span.setAttribute('aria-label',title);
   img.replaceWith(span);
 };
 const retry=()=>{
   const count=Number(img.dataset.repairAttempt||0);
   if(count>=links.length){fallback();return;}
   img.dataset.repairAttempt=String(count+1);
   img.style.display='';
   img.src=links[count];
 };
 img.addEventListener('error',retry);
 img.addEventListener('load',()=>{img.style.display='';});
 if(brand&&links.length){retry();}
 else if(img.complete&&img.naturalWidth===0){retry();}
}
function repair(){document.querySelectorAll('mightora-footer .footer-brand img,.evidence-badge img,mightora-author img').forEach(arm);}
repair();
new MutationObserver(repair).observe(document.body,{childList:true,subtree:true});
})();
