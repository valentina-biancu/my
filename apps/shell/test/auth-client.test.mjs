import test from 'node:test';
import assert from 'node:assert/strict';
import {createShellAuthClient} from '../server/auth-client.mjs';
const random=()=>Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
const pair=s=>s.split(';')[0];
const target={page:'workspace_overview',workspace_id:'bundle-1'};
async function fixture(){
 const now=Date.now(),id={customer_id:'customer-1',root_session_id:'root-1',shell_session_id:'shell-1',auth_generation:1,authenticated_at:now-1000,assurance:'magic_link',expires_at:now+60000};
 const state={now,calls:[],id,destination:target,failRevoke:false};
 const access={
  async begin(input){state.calls.push(['begin',input]);state.begin=input;return {contract_version:1,transaction:random(),expires_at:state.now+600000};},
  async redeem(input){state.calls.push(['redeem',input]);return {contract_version:1,session_token:random(),identity:state.id,destination:state.destination};},
  async check(){return {contract_version:1,identity:id};},
  async revoke(){if(state.failRevoke)throw Error('unavailable');return {contract_version:1,revoked:true};},
 };
 const options={access,origin:'https://my.test',accessOrigin:'https://access.test',environment:'staging',keyId:'test-only',key:await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),cookieMode:'session',transactionMs:600000,destinations:['home','workspace_overview'],clock:()=>state.now};
 const client=createShellAuthClient(options);
 const bootstrap=await client.bootstrap(),b=await client.begin({cookieHeader:pair(bootstrap),destination:target});
 const url=new URL(b.location),callback={cookieHeader:pair(b.setCookie),transaction:url.searchParams.get('transaction'),state:url.searchParams.get('state'),code:random()};
 return {client,state,options,bootstrap,b,callback};
}

test('server coordinator uses protected host-only transaction cookies and strips credentials from its result destination',async()=>{
 const c=await fixture();
 assert.match(c.b.setCookie,/; Secure; HttpOnly; SameSite=Lax/);assert.doesNotMatch(c.b.setCookie,/Domain=/);
 assert.doesNotMatch(c.b.setCookie,new RegExp(c.state.begin.state));
 const result=await c.client.complete(c.callback);
 assert.deepEqual(result.destination,target);assert.equal(result.setCookies.length,2);
 assert.match(result.setCookies[0],/^__Host-shyntesy_shell=/);assert.doesNotMatch(result.setCookies[0],/Max-Age|Domain=/);
 assert.match(result.setCookies[1],/Max-Age=0/);
 const redeemed=c.state.calls.find(x=>x[0]==='redeem')[1];
 const challenge=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(redeemed.verifier))).toString('base64url');
 assert.equal(challenge,c.state.begin.challenge);
});

test('missing, tampered, duplicate, expired and wrong-state cookies fail before private exchange',async()=>{
 const c=await fixture();
 for(const cookieHeader of ['',c.callback.cookieHeader.slice(0,-3)+'AAA',c.callback.cookieHeader+'; '+c.callback.cookieHeader])await assert.rejects(c.client.complete({...c.callback,cookieHeader}));
 await assert.rejects(c.client.complete({...c.callback,state:random()}));
 c.state.now+=600000;await assert.rejects(c.client.complete(c.callback));
 assert.equal(c.state.calls.filter(x=>x[0]==='redeem').length,0);
});

test('transaction cookies cannot move between environments, origins or keys',async()=>{
 const c=await fixture();
 for(const override of [{environment:'production'},{origin:'https://other.test'},{keyId:'rotated'},{key:await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt'])}]){
  const other=createShellAuthClient({...c.options,...override});await assert.rejects(other.complete(c.callback));
 }
 assert.equal(c.state.calls.filter(x=>x[0]==='redeem').length,0);
});

test('unapproved destination and silently switching an existing account never return a session cookie',async()=>{
 const c=await fixture();c.state.destination={page:'https://evil.invalid',workspace_id:null};
 await assert.rejects(c.client.complete(c.callback));
 c.state.destination=target;c.state.id={...c.state.id,customer_id:'different-account'};
 await assert.rejects(c.client.complete({...c.callback,cookieHeader:c.callback.cookieHeader+'; __Host-shyntesy_shell='+random()}),/account_change_required/);
});

test('logout requires same-origin CSRF and authoritative success before cookie clearing',async()=>{
 const c=await fixture(),input={cookieHeader:'__Host-shyntesy_shell='+random(),requestMethod:'POST',requestOrigin:'https://my.test',csrfToken:random()};input.expectedCsrfToken=input.csrfToken;
 await assert.rejects(c.client.logout({...input,requestMethod:'GET'}));
 await assert.rejects(c.client.logout({...input,requestOrigin:'https://access.test'}));
 await assert.rejects(c.client.logout({...input,csrfToken:random()}));
 c.state.failRevoke=true;await assert.rejects(c.client.logout(input),/unavailable/);
 c.state.failRevoke=false;assert.match((await c.client.logout(input)).setCookie,/Max-Age=0/);
});

test('configuration requires explicit cookie policy; persistent cookie cannot outlive server expiry',async()=>{
 const c=await fixture();assert.throws(()=>createShellAuthClient({...c.options,cookieMode:undefined}));
 const persistent=createShellAuthClient({...c.options,cookieMode:'persistent'});
 assert.match((await persistent.complete(c.callback)).setCookies[0],/Max-Age=60/);
 await assert.rejects(c.client.begin({cookieHeader:'',destination:target}));
});
