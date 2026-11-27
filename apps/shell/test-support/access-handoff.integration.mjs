// Explicit joined test; the independently versioned Access checkout is not a dependency.
// HF_ACCESS_REPO=/absolute/path/to/access node --test apps/shell/test-support/access-handoff.integration.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {isAbsolute,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createShellAuthClient} from '../server/auth-client.mjs';
if(!process.env.HF_ACCESS_REPO||!isAbsolute(process.env.HF_ACCESS_REPO))throw Error('Set HF_ACCESS_REPO to the isolated Access repository folder');
const {harness,policy,target}=await import(pathToFileURL(join(process.env.HF_ACCESS_REPO,'tests/helpers/shell-auth-harness.mjs')));
const pair=s=>s.split(';')[0];
async function setup(t){
 const c=await harness(t);
 const client=createShellAuthClient({access:c.shell,origin:policy.shellOrigin,accessOrigin:'https://access.test',environment:policy.environment,
  keyId:'test-only',key:await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),cookieMode:'session',transactionMs:policy.transactionMs,destinations:policy.destinations});
 return {c,client};
}
async function start(c,client,destination=target){
 const bootstrap=await client.bootstrap();const b=await client.begin({cookieHeader:pair(bootstrap),destination});
 const u=new URL(b.location),transaction=u.searchParams.get('transaction'),state=u.searchParams.get('state');
 // This is the Access-side browser host, not the Shell adapter. Only it sees its
 // own root cookie. The Shell client has only c.shell's four scoped methods.
 const authorized=await c.authorize(transaction,state);
 return {cookieHeader:pair(b.setCookie),transaction,state,code:authorized.code};
}

test('welcome magic-link login -> browser-bound exchange -> Bundle destination -> linked logout',async t=>{
 const {c,client}=await setup(t),callback=await start(c,client);
 const complete=await client.complete(callback);assert.deepEqual(complete.destination,target);
 const cookieHeader=pair(complete.setCookies[0]);const identity=await client.check({cookieHeader});
 assert.equal(identity.assurance,'magic_link');
 const csrf='fixture-only-synchroniser-token-1234567890';
 await client.logout({cookieHeader,requestMethod:'POST',requestOrigin:policy.shellOrigin,csrfToken:csrf,expectedCsrfToken:csrf});
 await assert.rejects(client.check({cookieHeader}),/denied/);
 await assert.rejects(client.complete(callback),/denied/);
});

test('another browser cannot redeem a copied callback; original browser can',async t=>{
 const {c,client}=await setup(t),callback=await start(c,client);
 await assert.rejects(client.complete({...callback,cookieHeader:''}),/denied/);
 assert.ok((await client.complete(callback)).setCookies[0]);
});

test('concurrent callbacks release at most one cookie; lost response cannot replay',async t=>{
 const {c,client}=await setup(t),callback=await start(c,client);
 const results=await Promise.allSettled([client.complete(callback),client.complete(callback)]);
 assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
 await assert.rejects(client.complete(callback),/denied/);
});

test('ended paid access does not prevent account Shell entry or grant Records ownership',async t=>{
 const {c,client}=await setup(t);
 await c.db.prepare("UPDATE entitlements SET status='revoked'").run();
 const completed=await client.complete(await start(c,client,{page:'records',workspace_id:null}));
 assert.deepEqual(completed.destination,{page:'records',workspace_id:null});
 const identity=await client.check({cookieHeader:pair(completed.setCookies[0])});
 assert.ok(identity.customer_id);assert.equal('record_id' in identity,false);assert.equal('purchase_id' in identity,false);
});
