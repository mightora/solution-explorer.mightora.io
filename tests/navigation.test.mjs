import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const source=fs.readFileSync(path.resolve(import.meta.dirname,'../src/navigation.js'),'utf8');
const css=fs.readFileSync(path.resolve(import.meta.dirname,'../src/styles.css'),'utf8');
const embeddedCss=fs.readFileSync(path.resolve(import.meta.dirname,'../src/dataverse.css'),'utf8');
function load(isEmbedded=false){
 const styles=new Map(),observed=[],listeners=[];
 const node=h=>({getBoundingClientRect:()=>({height:h})});
 const header=isEmbedded?null:node(62),quick=isEmbedded?null:node(49),embedded=isEmbedded?node(116):null;
 const context={
  document:{documentElement:{style:{setProperty:(k,v)=>styles.set(k,v)}},querySelector:s=>({
   'mightora-header':header,'.quick-jump-nav':quick,'.dv-topbar':embedded
  })[s]||null},
  window:{addEventListener:(type,fn)=>listeners.push(type)},
  ResizeObserver:class{constructor(fn){this.callback=fn}observe(el){observed.push(el)}}
 };
 vm.runInNewContext(source,context);
 return {styles,observed,listeners};
}
test('main header and section bar remain separately sticky with offset anchor padding',()=>{
 const {styles,observed}=load();
 assert.equal(styles.get('--mightora-sticky-header-height'),'62px');
 assert.equal(styles.get('--mightora-sticky-quicknav-height'),'49px');
 assert.equal(observed.length,2);
 assert.match(css,/mightora-header\s*\{\s*position:sticky;/);
 assert.match(css,/\.quick-jump-nav\s*\{[\s\S]*?top:var\(--mightora-sticky-header-height\)/);
 assert.match(css,/scroll-margin-top:var\(--mightora-sticky-clearance\)/);
 assert.match(css,/overflow-x:auto/);
});
test('model-driven topbar stays pinned and measures variable mobile height',()=>{
 const {styles,observed}=load(true);
 assert.equal(styles.get('--mightora-dataverse-topbar-height'),'116px');
 assert.equal(observed.length,1);
 assert.match(embeddedCss,/\.dv-topbar\s*\{\s*position:sticky;/);
 assert.match(embeddedCss,/scroll-margin-top:calc\(var\(--mightora-dataverse-topbar-height/);
});
