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
