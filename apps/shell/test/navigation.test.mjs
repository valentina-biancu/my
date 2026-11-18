import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveEntry,parseRoute,purchases} from '../demo/model.mjs';
test('overlapping purchases require explicit choice rather than longest expiry',()=>{
 const r=resolveEntry({product:'prevent'});assert.equal(r.kind,'choose');assert.deepEqual(r.items.map(p=>p.id),['prevent-single','bundle']);
});
test('explicit bundle entry preserves bundle context',()=>assert.equal(resolveEntry({product:'prevent',purchase:'bundle'}).purchase.id,'bundle'));
test('expired explicit purchase never substitutes a valid bundle',()=>assert.equal(resolveEntry({product:'clarify',purchase:'clarify-ended'}).kind,'ended'));
test('return through sign-in preserves intended purchase',()=>{
 const target={product:'prevent',purchase:'prevent-single'};const r=resolveEntry(target,{signedIn:false});assert.equal(r.kind,'signin');assert.deepEqual(r.target,target);assert.equal(resolveEntry(r.target).purchase.id,target.purchase);
});
test('service failure is not an empty purchase list',()=>assert.equal(resolveEntry({product:'prevent'},{available:false}).kind,'unavailable'));
test('unowned and incompatible references deny',()=>{
 assert.equal(resolveEntry({product:'navigate',purchase:'prevent-single'}).kind,'ended');assert.equal(resolveEntry({product:'prevent',purchase:'unknown'}).kind,'ended');
});
test('return targets are registry references, not arbitrary URLs',()=>{
 for(const h of ['#https://example.org','#product/prevent/bundle/extra','#product/unknown/bundle','#product/prevent/unknown'])assert.equal(parseRoute(h),null);
 assert.deepEqual(parseRoute('#product/prevent/bundle'),{product:'prevent',purchase:'bundle'});
});
test('no eligible purchase grants no paid entry',()=>assert.equal(resolveEntry({product:'prevent'},{items:purchases.filter(p=>p.id==='clarify-ended')}).kind,'ended'));

import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as model from '../demo/model.mjs';
function ui(){
 const handlers={},elements={};
 const element=key=>elements[key]??=( {innerHTML:'',textContent:'',hidden:false,open:false,focus(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(event,fn){handlers[key+':'+event]=fn;},getBoundingClientRect(){return {left:100,right:500,top:100,bottom:500};}} );
 const location={hash:'#home'};
 const document={querySelector:element,addEventListener(event,fn){handlers[event]=fn;}};
 const history={pushState(a,b,hash){location.hash=hash;},replaceState(a,b,hash){location.hash=hash;}};
 const window={scrollTo(){},addEventListener(event,fn){handlers['window:'+event]=fn;}};
 const source=readFileSync(new URL('../demo/app.mjs',import.meta.url),'utf8').replace(/^import .*\n/,'');
 vm.runInNewContext(source,{...model,document,location,history,window,Intl,Date});
 const click=action=>handlers.click({target:{closest:selector=>selector==='[data-action]'?{dataset:{action}}:null}});
 click('scenario:active');
 return {handlers,elements,element,location,click,document};
}
test('Records return link and same-hash home link both render home',()=>{
 const u=ui();u.click('records');assert.equal(u.location.hash,'#records');assert.match(u.element('main').innerHTML,/Your information has its own access/);
 for(const hash of ['#records','#home']){
  u.location.hash=hash;u.handlers.click({preventDefault(){},target:{closest:s=>s==='a[href="#home"]'?{}:null}});
  assert.match(u.element('main').innerHTML,/Your products/);assert.equal(u.location.hash,'#home');
 }
});
test('Compass lists bundle; bundle product switch keeps purchase and renders peer links',()=>{
 const u=ui();u.element('#compass').onclick();assert.match(u.element('#dialog-body').innerHTML,/bundle:bundle/);
 u.click('bundle:bundle');assert.match(u.element('#dialog-body').innerHTML,/enter:prevent:bundle/);
 u.click('enter:prevent:bundle');assert.match(u.element('main').innerHTML,/enter:clarify:bundle/);
 u.click('enter:clarify:bundle');assert.equal(u.location.hash,'#product/clarify/bundle');assert.match(u.element('main').innerHTML,/enter:navigate:bundle/);
});
test('outside press and click close modal; inside click and outward drag do not',()=>{
 const u=ui(),d=u.element('dialog');const send=(type,x,y)=>u.handlers['dialog:'+type]({target:d,clientX:x,clientY:y});
 d.showModal();send('pointerdown',150,150);send('click',150,150);assert.equal(d.open,true);
 send('pointerdown',150,150);send('click',50,50);assert.equal(d.open,true);
 send('pointerdown',50,50);send('click',50,50);assert.equal(d.open,false);
});

test('product-only routes choose purchases; malformed routes stay invalid',()=>{
 assert.deepEqual(parseRoute('#product/clarify'),{product:'clarify'});
 assert.equal(parseRoute('#product/unknown'),null);
 const u=ui();u.location.hash='#product/clarify';u.handlers['window:hashchange']();
 assert.match(u.element('#dialog-body').innerHTML,/enter:clarify:bundle/);
 assert.equal(u.document.title,'Choose your purchase · My Navigator');
});
test('Records and Compass survive the complete sign-in journey',()=>{
 for(const destination of ['records','compass']){
  const u=ui();u.click('scenario:signedout');
  if(destination==='records'){u.location.hash='#records';u.handlers['window:hashchange']();}
  else u.element('#compass').onclick();
  u.click('email');u.click('link');u.click('confirm');
  if(destination==='records'){assert.equal(u.location.hash,'#records');assert.equal(u.document.title,'Records · My Navigator');}
  else{assert.equal(u.element('dialog').open,true);assert.equal(u.element('#dialog-title').textContent,'Compass');}
 }
});
test('bottom product navigation respects standalone and bundle purchases',()=>{
 const u=ui();u.click('enter:prevent:prevent-single');
 assert.match(u.element('main').innerHTML,/<button disabled aria-current="page">Prevent/);
 assert.equal(u.document.title,'Prevent heart risk · My Navigator');
 u.click('shortcut:clarify');assert.equal(u.location.hash,'#product/clarify');
 assert.match(u.element('#dialog-body').innerHTML,/enter:clarify:bundle/);
 u.click('enter:clarify:bundle');u.click('shortcut:prevent');
 assert.equal(u.location.hash,'#product/prevent/bundle');
 u.click('expire');u.click('email');u.click('link');u.click('confirm');
 assert.equal(u.location.hash,'#product/prevent/bundle');
});
