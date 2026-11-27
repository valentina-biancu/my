import {createShellAuthClient} from './auth-client.mjs';
const SESSION='__Host-shyntesy_shell';
const BROWSER='__Host-shyntesy_shell_browser';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function jar(header){const map=new Map();for(const p of (header??'').split(';')){const n=p.indexOf('=');if(n<0)continue;const k=p.slice(0,n).trim();if(map.has(k))throw Error('invalid_cookie');map.set(k,p.slice(n+1).trim());}return map;}
function secure(response){
 response.headers.set('Cache-Control','no-store');response.headers.set('Referrer-Policy','no-referrer');response.headers.set('X-Content-Type-Options','nosniff');
 response.headers.set('Content-Security-Policy',"default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");return response;
}
function html(title,body,status=200){const response=secure(new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · My Navigator</title><main>${body}</main></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8'}}));response.headers.set('Referrer-Policy','strict-origin');return response;}
function redirect(location,cookies=[]){const headers=new Headers({Location:location});for(const c of cookies)headers.append('Set-Cookie',c);return secure(new Response(null,{status:303,headers}));}
function localPath(value,origin){if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))throw Error('invalid_destination');const u=new URL(value,origin);if(u.origin!==origin||u.hash)throw Error('invalid_destination');return u.pathname+u.search;}

// A real private binding is mandatory. This adapter never falls back to network fetch.
export function shellAccessAdapter(binding){
 if(!binding||typeof binding.fetch!=='function')throw Error('shell_binding_required');
 return Object.freeze(Object.fromEntries(['begin','redeem','check','revoke'].map(method=>[method,async input=>{
  const response=await binding.fetch(new Request(`https://shell-access.internal/internal/shell/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}));
  if(!response.ok)throw Error('shell_authority_unavailable');return response.json();
 }])));
}

// HTTP host factory, not yet a deployed Worker. The host supplies the real page
// renderer and route registry; the synthetic navigation demo is not authority.
export function createShellHttpHost({clientOptions,csrfKey,routeFor,destinationFor,renderAccount,allowAuthRequest}){
 const client=createShellAuthClient(clientOptions),origin=clientOptions.origin;
 if(csrfKey?.algorithm?.name!=='HMAC'||csrfKey.algorithm.hash?.name!=='SHA-256'||csrfKey.extractable!==false||!csrfKey.usages.includes('sign')||typeof allowAuthRequest!=='function'||typeof routeFor!=='function'||typeof destinationFor!=='function'||typeof renderAccount!=='function')throw Error('shell_configuration_invalid');
 const sign=async raw=>BufferlessHex(new Uint8Array(await crypto.subtle.sign('HMAC',csrfKey,new TextEncoder().encode(`heartfirst.shell.logout.v1:${origin}:${raw}`))));
 return async function handle(request){
  const url=new URL(request.url);if(url.origin!==origin)return html('Page unavailable','<h1>Page unavailable.</h1>',404);
  try{
   if(url.pathname.startsWith('/auth/')&&!await allowAuthRequest(request))return html('Please try again shortly','<h1>Please try again shortly.</h1>',429);
   const cookieHeader=request.headers.get('Cookie')??'',cookies=jar(cookieHeader);
   if(url.pathname==='/auth/start'&&request.method==='GET'){
    const keys=[...url.searchParams.keys()];if(new Set(keys).size!==keys.length||keys.some(x=>!['page','workspace'].includes(x)))throw Error('invalid_destination');
    const destination={page:url.searchParams.get('page')??'home',workspace_id:url.searchParams.get('workspace')};
    // Validate before creating transaction state or placing user-controlled data in a URL.
    localPath(routeFor(destination),origin);
    if(!cookies.has(BROWSER))return redirect(url.pathname+url.search,[await client.bootstrap()]);
    const begin=await client.begin({cookieHeader,destination});return redirect(begin.location,[begin.setCookie]);
   }
   if(url.pathname==='/auth/callback'&&request.method==='GET'){
    const keys=[...url.searchParams.keys()].sort();if(keys.join('|')!=='code|state|transaction')throw Error('invalid_callback');
    const result=await client.complete({cookieHeader,transaction:url.searchParams.get('transaction'),code:url.searchParams.get('code'),state:url.searchParams.get('state')});
    return redirect(localPath(routeFor(result.destination),origin),result.setCookies);
   }
   if(url.pathname==='/auth/reset'&&request.method==='POST'){
    if(request.headers.get('Origin')!==origin)throw Error('invalid_origin');
    // Explicit recovery discards this browser's local Shell cookie. It is not a
    // claim of root-session revocation or sign-out; lost server sessions expire.
    return redirect('/auth/start',[`${SESSION}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`,await client.bootstrap()]);
   }
   if(url.pathname==='/auth/logout'&&['GET','POST'].includes(request.method)){
    const identity=await client.check({cookieHeader});void identity;
    const expected=await sign(cookies.get(SESSION));
    if(request.method==='GET')return html('Sign out','<h1>Sign out of My Navigator?</h1><p>This also ends the connected Access session.</p><form method="post" action="/auth/logout"><input type="hidden" name="csrf" value="'+expected+'"><button>Sign out</button></form>');
    const fields=await request.formData();
    const result=await client.logout({cookieHeader,requestMethod:request.method,requestOrigin:request.headers.get('Origin'),csrfToken:String(fields.get('csrf')??''),expectedCsrfToken:expected});
    return redirect('/',[result.setCookie]);
   }
   if(request.method!=='GET')return html('Page unavailable','<h1>Page unavailable.</h1>',404);
   if(url.pathname==='/'&&!cookies.has(SESSION))return html('Welcome','<h1>My Navigator</h1><a href="/auth/start">Sign in</a>');
   const destination=destinationFor(url);
   if(!destination)return html('Page unavailable','<h1>Page unavailable.</h1>',404);
   localPath(routeFor(destination),origin);
   if(!cookies.has(SESSION)){
    const start=new URL('/auth/start',origin);start.searchParams.set('page',destination.page);
    if(destination.workspace_id!==null)start.searchParams.set('workspace',destination.workspace_id);
    return redirect(start.pathname+start.search);
   }
   const identity=await client.check({cookieHeader});
   // Renderer must check workspace/product/record permission; identity alone is
   // never paid entitlement or record ownership. Do not pass it browser cookies.
   const response=await renderAccount({url:new URL(request.url),identity});
   if(!(response instanceof Response))throw Error('invalid_response');
   const finalIdentity=await client.check({cookieHeader});
   for(const key of ['customer_id','root_session_id','shell_session_id','auth_generation'])if(identity[key]!==finalIdentity[key])throw Error('authority_changed');
   return secure(response);
  }catch{
   return html('Sign-in could not continue','<h1>Sign-in could not continue.</h1><p>You can restart sign-in in this browser. This does not sign out other sessions.</p><form action="/auth/reset" method="post"><button>Restart sign-in</button></form>',403);
  }
 };
}
function BufferlessHex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
