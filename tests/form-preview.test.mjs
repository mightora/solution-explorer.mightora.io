import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const {DOMParser}=require('./support/xmldom');
const base=path.resolve(import.meta.dirname,'..');
const scope={DOMParser};scope.globalThis=scope;
vm.runInNewContext(fs.readFileSync(path.join(base,'src/form-preview.js'),'utf8'),scope);
const F=scope.SolutionForms;
const xml=`<ImportExportXml><Entities><Entity><Name>mt_application</Name><FormXml><forms type="main"><systemform><formid>form-1</formid><LocalizedNames><LocalizedName description="Application details" languagecode="2057" /></LocalizedNames><form><tabs><tab name="general"><labels><label description="Overview" languagecode="1033" /></labels><columns><column><sections><section name="section1"><labels><label description="Application details" languagecode="1033"/></labels><rows><row><cell><labels><label description="Reference" languagecode="1033"/></labels><control id="mt_reference" datafieldname="mt_reference" /></cell><cell><labels><label description="Amount" languagecode="1033"/></labels><control id="mt_amount" datafieldname="mt_amount"/></cell></row></rows></section></sections></column></columns></tab></tabs></form></systemform></forms></FormXml></Entity></Entities></ImportExportXml>`;
test('extracts tabs, sections and control labels from exported Entity FormXml',()=>{
 const forms=F.collect(new Map([['customizations.xml',xml]])).forms;
 assert.equal(forms.length,1);assert.equal(forms[0].table,'mt_application');assert.equal(forms[0].name,'Application details');assert.equal(forms[0].tabCount,1);assert.equal(forms[0].fieldCount,2);
 assert.equal(forms[0].tabs[0].sections[0].fields[0].field,'mt_reference');
 assert.equal(forms[0].tabs[0].sections[0].fields[1].label,'Amount');
});
test('enrichment exposes layout fingerprints to form comparison',()=>{
 const model={components:[],counts:{form:0},warnings:[],coverage:{inspected:0}};
 const a=F.enrich(model,new Map([['customizations.xml',xml]]));
 const b=F.enrich(model,new Map([['customizations.xml',xml.replaceAll('mt_amount','mt_budget')]]));
 assert.ok(a.components[0].properties.layoutFingerprint);
 assert.notEqual(a.components[0].properties.layoutFingerprint,b.components[0].properties.layoutFingerprint);
});
test('does not extract arbitrary literal field values or script bodies',()=>{
 const source=xml.replace('</form>','<formlibraries><library name="new_secret.js" /></formlibraries><eventhandlers><handler handler="console.log(1234)" /></eventhandlers></form>');
 const results=F.collect(new Map([['customizations.xml',source]])).forms;
 assert.ok(!JSON.stringify(results).includes('console.log'));
});
