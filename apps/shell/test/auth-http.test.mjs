import test from 'node:test';
import assert from 'node:assert/strict';
import {createShellHttpHost,shellAccessAdapter} from '../server/auth-http.mjs';
const token='a'.repeat(43),origin='https://my.test';
async function host(){
 const now=Date.now(),state={revokes:0,checks:0,unavailable:false};
 const access={async begin(){throw Error('not_expected')},async redeem(){throw Error('not_expected')},async check(){state.checks++;if(state.unavailable)throw Error('unavailable');return {contract_version:1,identity:{customer_id:'account',root_session_id:'root',shell_session_id:'shell',auth_generation:1,authenticated_at:now,assurance:'magic_link',expires_at:now+60000}};},async revoke(){state.revokes++;if(state.unavailable)throw Error('unavailable');return {contract_version:1,revoked:true}}};
 const routeFor=d=>{if(d.page==='home'&&d.workspace_id===null)return '/';if(d.page==='records'&&d.workspace_id===null)return '/records';throw Error('invalid_destination');};
 const handle=createShellHttpHost({allowAuthRequest:async()=>true,clientOptions:{access,origin,accessOrigin:'https://access.test',environment:'staging',keyId:'test-only',key:await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),cookieMode:'session',transactionMs:600000,destinations:['home','records']},csrfKey:await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign']),routeFor,destinationFor:url=>url.pathname==='/records'?{page:'records',workspace_id:null}:url.pathname==='/'?{page:'home',workspace_id:null}:null,renderAccount:async()=>new Response('private fixture')});
 return {state,request:(path,init={})=>handle(new Request(origin+path,init))};
}

test('signed-out deep links preserve their destination and unknown paths do not start sign-in',async()=>{
 const c=await host();const r=await c.request('/records');assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/auth/start?page=records');
 assert.equal((await c.request('/unknown')).status,404);assert.equal(c.state.checks,0);
 const welcome=await c.request('/');assert.match(await welcome.text(),/Sign in/);assert.equal(welcome.headers.get('Cache-Control'),'no-store');
});

test('logout GET is a confirmation; POST requires session-bound CSRF and exact origin',async()=>{
 const c=await host(),Cookie='__Host-shyntesy_shell='+token;
 const r=await c.request('/auth/logout',{headers:{Cookie}}),body=await r.text(),csrf=body.match(/name="csrf" value="([^"]+)"/)[1];assert.equal(c.state.revokes,0);
 for(const [o,value] of [['https://access.test',csrf],[origin,'wrong']])assert.equal((await c.request('/auth/logout',{method:'POST',headers:{Origin:o,Cookie},body:new URLSearchParams({csrf:value})})).status,403);
 assert.equal(c.state.revokes,0);
 const done=await c.request('/auth/logout',{method:'POST',headers:{Origin:origin,Cookie},body:new URLSearchParams({csrf})});assert.equal(done.status,303);assert.equal(c.state.revokes,1);assert.match(done.headers.get('Set-Cookie'),/Max-Age=0/);
});

test('unavailable authority does not render private content or report successful sign-out',async()=>{
 const c=await host();c.state.unavailable=true;
 const r=await c.request('/records',{headers:{Cookie:'__Host-shyntesy_shell='+token}});assert.equal(r.status,403);assert.doesNotMatch(await r.text(),/private fixture/);assert.equal(r.headers.has('Set-Cookie'),false);
});

test('private adapter requires an injected binding and cannot substitute a public fetch',async()=>{
 assert.throws(()=>shellAccessAdapter(null),/binding_required/);
 const seen=[];const adapter=shellAccessAdapter({async fetch(request){seen.push(request.url);return Response.json({code:'not_available'},{status:404});}});
 await assert.rejects(adapter.check({session_token:token,operation:'shell_view'}),/unavailable/);
 assert.deepEqual(seen,['https://shell-access.internal/internal/shell/check']);
});
