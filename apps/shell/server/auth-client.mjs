// Server-only coordinator. Inject a private ShellAccess adapter; never browser fetch.
// No authority cache or server-side session state is kept here.
const pattern=/^[A-Za-z0-9_-]{43}$/;
const encoder=new TextEncoder(),decoder=new TextDecoder();
const encoded=b=>btoa(String.fromCharCode(...b)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
function decoded(s){if(typeof s!=='string'||!/^[A-Za-z0-9_-]+$/.test(s))throw Error('shell_auth_denied');return Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
const random=()=>encoded(crypto.getRandomValues(new Uint8Array(32)));
const digest=async s=>encoded(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))));
function token(x){if(typeof x!=='string'||!pattern.test(x))throw Error('shell_auth_denied');return x;}
function exact(x,keys){if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==[...keys].sort().join('|'))throw Error('shell_auth_denied');}
function cookies(header){
 const result=new Map();
 for(const part of (header??'').split(';')){const i=part.indexOf('=');if(i<0)continue;const name=part.slice(0,i).trim();if(result.has(name))throw Error('shell_auth_denied');result.set(name,part.slice(i+1).trim());}
 return result;
}
const cookie=(name,value,maxAge)=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax${maxAge===undefined?'':`; Max-Age=${maxAge}`}`;
const SESSION='__Host-shyntesy_shell',BROWSER='__Host-shyntesy_shell_browser';
export function createShellAuthClient({access,origin,accessOrigin,environment,keyId,key,cookieMode,transactionMs,destinations,clock=Date.now}){
 if(new URL(origin).origin!==origin||!origin.startsWith('https://')||new URL(accessOrigin).origin!==accessOrigin||!accessOrigin.startsWith('https://')||origin===accessOrigin||
    !['staging','production'].includes(environment)||!['session','persistent'].includes(cookieMode)||!/^[a-z0-9_-]{1,24}$/.test(keyId)||
    key?.algorithm?.name!=='AES-GCM'||key.algorithm.length!==256||key.extractable!==false||!key.usages.includes('encrypt')||!key.usages.includes('decrypt')||
    !Number.isSafeInteger(transactionMs)||transactionMs<1||transactionMs>600000||!Array.isArray(destinations)||!destinations.length)throw Error('shell_configuration_invalid');
 const pages=new Set(destinations);
 const target=value=>{
  exact(value,['page','workspace_id']);
  if(!pages.has(value.page)||!(value.workspace_id===null||typeof value.workspace_id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value.workspace_id)))throw Error('shell_auth_denied');
  return {page:value.page,workspace_id:value.workspace_id};
 };
 const aad=name=>encoder.encode(`heartfirst.shell.cookie.v1:${environment}:${origin}:${keyId}:${name}`);
 async function seal(name,value){const iv=crypto.getRandomValues(new Uint8Array(12));const b=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad(name)},key,encoder.encode(JSON.stringify(value)));return `${keyId}.${encoded(iv)}.${encoded(new Uint8Array(b))}`;}
 async function open(name,value){
  if(typeof value!=='string'||value.length>2048)throw Error('shell_auth_denied');
  const parts=value.split('.');if(parts.length!==3||parts[0]!==keyId)throw Error('shell_auth_denied');
  const iv=decoded(parts[1]);if(iv.length!==12)throw Error('shell_auth_denied');
  try{return JSON.parse(decoder.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad(name)},key,decoded(parts[2]))));}catch{throw Error('shell_auth_denied');}
 }
 function identity(x){
  exact(x,['customer_id','root_session_id','shell_session_id','auth_generation','authenticated_at','assurance','expires_at']);
  for(const k of ['customer_id','root_session_id','shell_session_id'])if(typeof x[k]!=='string'||!x[k].length||x[k].length>128)throw Error('shell_auth_denied');
  if(x.assurance!=='magic_link'||!Number.isSafeInteger(x.auth_generation)||x.auth_generation<0||!Number.isSafeInteger(x.authenticated_at)||x.authenticated_at>clock()||
     !Number.isSafeInteger(x.expires_at)||x.expires_at<=clock())throw Error('shell_auth_denied');
  return x;
 }
 async function check(raw){const r=await access.check({session_token:token(raw),operation:'shell_view'});exact(r,['contract_version','identity']);if(r.contract_version!==1)throw Error('shell_auth_denied');return identity(r.identity);}
 return Object.freeze({
  // Host must set this cookie and redirect to itself before begin; do not create
  // an auth transaction until the browser has returned a valid bootstrap cookie.
  async bootstrap(){const name=BROWSER;return cookie(name,await seal(name,{browser:random(),expires_at:clock()+transactionMs}),Math.ceil(transactionMs/1000));},
  async begin({cookieHeader,destination}){
   const jar=cookies(cookieHeader),b=await open(BROWSER,jar.get(BROWSER));exact(b,['browser','expires_at']);
   if(!Number.isSafeInteger(b.expires_at)||b.expires_at<=clock()||b.expires_at>clock()+transactionMs)throw Error('shell_auth_denied');
   const state=random(),verifier=random();
   const r=await access.begin({browser:token(b.browser),state,challenge:await digest(verifier),destination:target(destination)});
   exact(r,['contract_version','transaction','expires_at']);token(r.transaction);
   if(r.contract_version!==1||!Number.isSafeInteger(r.expires_at)||r.expires_at<=clock()||r.expires_at>clock()+transactionMs)throw Error('shell_auth_denied');
   const name=`__Host-shyntesy_shell_tx_${r.transaction}`;
   const value=await seal(name,{transaction:r.transaction,state,verifier,expires_at:r.expires_at});
   const url=new URL('/shell/authorize',accessOrigin);url.searchParams.set('transaction',r.transaction);url.searchParams.set('state',state);
   return {location:url.href,setCookie:cookie(name,value,Math.ceil((r.expires_at-clock())/1000))};
  },
  async complete({cookieHeader,transaction,code,state}){
   token(transaction);token(code);token(state);
   const jar=cookies(cookieHeader),name=`__Host-shyntesy_shell_tx_${transaction}`;
   const pending=await open(name,jar.get(name));exact(pending,['transaction','state','verifier','expires_at']);
   if(pending.transaction!==transaction||pending.state!==state||!Number.isSafeInteger(pending.expires_at)||pending.expires_at<=clock())throw Error('shell_auth_denied');
   // Existing account must never be silently replaced. A failed existing-session
   // check also fails closed; the host must offer explicit session recovery.
   const existing=jar.has(SESSION)?await check(jar.get(SESSION)):null;
   const r=await access.redeem({transaction,code,verifier:token(pending.verifier),state});
   exact(r,['contract_version','session_token','identity','destination']);
   if(r.contract_version!==1)throw Error('shell_auth_denied');
   token(r.session_token);const current=identity(r.identity),destination=target(r.destination);
   if(existing&&existing.customer_id!==current.customer_id)throw Error('shell_account_change_required');
   const age=cookieMode==='persistent'?Math.floor((current.expires_at-clock())/1000):undefined;
   if(age!==undefined&&age<1)throw Error('shell_auth_denied');
   return {destination,setCookies:[cookie(SESSION,r.session_token,age),cookie(name,'',0)]};
  },
  async check({cookieHeader}){return check(cookies(cookieHeader).get(SESSION));},
  async logout({cookieHeader,requestMethod,requestOrigin,csrfToken,expectedCsrfToken}){
   // The host supplies its session-bound CSRF token. Request Origin alone is
   // insufficient across sibling subdomains. No logout on GET is supported here.
   if(requestMethod!=='POST'||requestOrigin!==origin||typeof csrfToken!=='string'||csrfToken.length<32||csrfToken!==expectedCsrfToken)throw Error('shell_auth_denied');
   const raw=token(cookies(cookieHeader).get(SESSION));
   const r=await access.revoke({session_token:raw});exact(r,['contract_version','revoked']);
   if(r.contract_version!==1||r.revoked!==true)throw Error('shell_auth_denied');
   return {setCookie:cookie(SESSION,'',0)};
  },
 });
}
