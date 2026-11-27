// Cross-repository HTTP journey test. Neither repository becomes a runtime dependency.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isAbsolute,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createShellHttpHost,shellAccessAdapter} from '../server/auth-http.mjs';
if(!process.env.HF_ACCESS_REPO||!isAbsolute(process.env.HF_ACCESS_REPO))throw Error('Set HF_ACCESS_REPO to the isolated Access repository folder');
const {harness,policy}=await import(pathToFileURL(join(process.env.HF_ACCESS_REPO,'tests/helpers/shell-auth-harness.mjs')));
const origin='https://my.test',accessOrigin='https://access.test';
const unescape=s=>s.replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&#039;',"'");
const field=(s,name)=>unescape(s.match(new RegExp('name="'+name+'" value="([^"]*)"'))?.[1]??'');
function routeFor(d){
 if(d.page==='home'&&d.workspace_id===null)return '/';
 if(d.page==='records'&&d.workspace_id===null)return '/records';
 if(d.page==='prevent_action'&&/^[A-Za-z0-9_-]{1,128}$/.test(d.workspace_id))return '/w/'+d.workspace_id+'/prevent/action';
 throw Error('invalid_destination');
}
async function setup(t){
 const c=await harness(t,{enableHttp:true}),binding=await c.mf.getWorker('shell-caller');
 const handle=createShellHttpHost({allowAuthRequest:async()=>true,clientOptions:{access:shellAccessAdapter(binding),origin,accessOrigin,environment:'staging',keyId:'test-only',key:await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),cookieMode:'session',transactionMs:policy.transactionMs,destinations:policy.destinations},csrfKey:await crypto.subtle.generateKey({name:'HMAC',hash:'SHA-256'},false,['sign']),routeFor,destinationFor:url=>url.pathname==='/records'?{page:'records',workspace_id:null}:url.pathname==='/'?{page:'home',workspace_id:null}:/^\/w\/[^/]+\/prevent\/action$/.test(url.pathname)?{page:'prevent_action',workspace_id:url.pathname.split('/')[2]}:null,
 renderAccount:async({url,identity})=>new Response('fixture-render:'+url.pathname+':'+identity.customer_id)});
 function browser(){
  const jars={[origin]:new Map(),[accessOrigin]:new Map()};
  const cookie=o=>[...jars[o]].map(([k,v])=>k+'='+v).join('; ');
  async function visit(url,init={}){
   const u=new URL(url,origin),headers=new Headers(init.headers);headers.set('Cookie',cookie(u.origin));
   const req=new Request(u,{...init,headers,redirect:'manual'});
   const r=u.origin===origin?await handle(req):await c.request(u.pathname+u.search,{...init,headers});
   assert.equal(r.headers.get('Cache-Control'),'no-store');
   for(const raw of r.headers.getSetCookie()){const pair=raw.split(';')[0],n=pair.indexOf('=');if(/Max-Age=0(?:;|$)/.test(raw))jars[u.origin].delete(pair.slice(0,n));else jars[u.origin].set(pair.slice(0,n),pair.slice(n+1));}
   return r;
  }
  async function handshake(start){
   let u=new URL(start,origin),r;
   for(let i=0;i<10;i++){
    r=await visit(u);
    if(r.status===303){u=new URL(r.headers.get('Location'),u);continue;}
    if(u.origin===accessOrigin&&u.pathname==='/shell/authorize'&&r.status===200){
     const form=await r.text();r=await visit(accessOrigin+'/shell/authorize',{method:'POST',headers:{Origin:accessOrigin},body:new URLSearchParams({transaction:field(form,'transaction'),state:field(form,'state'),csrf:field(form,'csrf')})});
     assert.equal(r.status,303);u=new URL(r.headers.get('Location'));continue;
    }
    return {url:u,response:r};
   }
   throw Error('redirect_loop');
  }
  return {jars,visit,handshake,cookie};
 }
 return {c,browser};
}

test('welcome authentication reaches clean Shell Home through the real named binding and linked sign-out',async t=>{
 const {c,browser}=await setup(t),b=browser();
 b.jars[accessOrigin].set('__Host-shyntesy_access',c.rootSession.raw);
 const result=await b.handshake('/auth/start?page=home');
 assert.equal(result.url.href,origin+'/');assert.match(await result.response.text(),/^fixture-render:\//);
 assert.ok(b.jars[origin].get('__Host-shyntesy_shell'));assert.equal(b.jars[origin].has('__Host-shyntesy_access'),false);
 const logout=await b.visit('/auth/logout'),csrf=field(await logout.text(),'csrf');
 const denied=await b.visit('/auth/logout',{method:'POST',headers:{Origin:accessOrigin},body:new URLSearchParams({csrf})});assert.equal(denied.status,403);
 const done=await b.visit('/auth/logout',{method:'POST',headers:{Origin:origin},body:new URLSearchParams({csrf})});assert.equal(done.status,303);
 assert.equal(b.jars[origin].has('__Host-shyntesy_shell'),false);
 assert.equal((await c.db.prepare('SELECT revoked_at FROM access_sessions').first()).revoked_at!==null,true);
});

test('returning sign-in resubmits through Access; opening the email in another browser preserves the Bundle destination using a fresh handshake',async t=>{
 const {c,browser}=await setup(t),first=browser();
 const start=await first.handshake('/w/bundle-2026/prevent/action');
 assert.equal(start.url.pathname,'/recover');
 const destination=field(await start.response.text(),'destination');
 const email=(await c.db.prepare('SELECT email_original FROM customers').first()).email_original;
 await first.visit(accessOrigin+'/api/recovery',{method:'POST',headers:{Origin:accessOrigin},body:new URLSearchParams({email,destination})});
 assert.equal(c.emails.length,1);
 const link=c.emails[0].text.match(/https:\/\/access.test\/magic\?token=\S+/)[0];
 const second=browser();assert.equal((await second.visit(link)).status,200);
 const redeem=await second.visit(accessOrigin+'/api/magic/redeem',{method:'POST',headers:{Origin:accessOrigin}});
 assert.equal(redeem.status,303);
 const finish=await second.handshake(redeem.headers.get('Location'));
 assert.equal(finish.url.pathname,'/w/bundle-2026/prevent/action');assert.equal(finish.url.search,'');
 assert.equal(first.jars[origin].has('__Host-shyntesy_shell'),false);
 assert.equal((await c.db.prepare('SELECT count(*) n FROM shell_auth WHERE consumed_at IS NOT NULL').first()).n,1);
});

test('an existing active account with no purchases can resubmit and sign in through the same HTTP flow',async t=>{
 const {c,browser}=await setup(t),b=browser();
 await c.db.prepare("INSERT INTO customers(id,email_normalized,email_original,status,created_at,updated_at) VALUES ('free-account','free@example.invalid','free@example.invalid','active',unixepoch(),unixepoch())").run();
 await b.visit(accessOrigin+'/api/recovery',{method:'POST',headers:{Origin:accessOrigin},body:new URLSearchParams({email:'free@example.invalid',destination:JSON.stringify({page:'home',workspace_id:null})})});
 const link=c.emails[0].text.match(/https:\/\/access.test\/magic\?token=\S+/)[0];await b.visit(link);
 const redeem=await b.visit(accessOrigin+'/api/magic/redeem',{method:'POST',headers:{Origin:accessOrigin}});
 const finish=await b.handshake(redeem.headers.get('Location'));assert.match(await finish.response.text(),/free-account$/);
 assert.equal((await c.db.prepare("SELECT count(*) n FROM purchases WHERE customer_id='free-account'").first()).n,0);
});

test('malformed callback and external destination cannot create a cookie or redirect outside the configured origins',async t=>{
 const {browser}=await setup(t),b=browser();
 for(const path of ['/auth/start?page=https%3A%2F%2Fevil.invalid','/auth/start?page=home&page=records','/auth/callback?code=x&state=y&transaction=z']){
  const r=await b.visit(path);assert.equal(r.status,403);assert.equal(r.headers.has('Location'),false);
 }
 assert.equal(b.jars[origin].has('__Host-shyntesy_shell'),false);
 assert.equal((await b.visit('/auth/reset',{method:'POST',headers:{Origin:'https://evil.invalid'}})).status,403);
});
