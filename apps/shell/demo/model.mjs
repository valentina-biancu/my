// Synthetic navigation policy. This is NOT an authentication/authority service.
export const today = Date.parse('2026-11-17T12:00:00Z');
export const names = {clarify:'Clarify heart risk',navigate:'Navigate heart risk',prevent:'Prevent heart risk'};
export const purchases = [
 {id:'prevent-single',name:'Prevent heart risk',products:['prevent'],from:'2026-10-10T21:58:00Z',until:'2027-01-08T21:58:00Z'},
 {id:'clarify-ended',name:'Clarify heart risk',products:['clarify'],from:'2026-06-01T10:00:00Z',until:'2026-08-30T10:00:00Z'},
 {id:'bundle',name:'Heart Risk Navigator Bundle',products:['clarify','navigate','prevent'],from:'2026-11-01T10:00:00Z',until:'2027-07-29T10:00:00Z'}
];
export const active = p => !!p && Date.parse(p.until)>today;
export function resolveEntry(target,{signedIn=true,available=true,items=purchases}={}) {
 if(!target || !Object.hasOwn(names,target.product)) return {kind:'invalid'};
 if(!signedIn) return {kind:'signin',target};
 if(!available) return {kind:'unavailable'};
 if(target.purchase){
  const p=items.find(x=>x.id===target.purchase);
  return active(p)&&p.products.includes(target.product)?{kind:'open',purchase:p,product:target.product}:{kind:'ended'};
 }
 const eligible=items.filter(p=>active(p)&&p.products.includes(target.product));
 return eligible.length?{kind:'choose',items:eligible,product:target.product}:{kind:'ended'};
}
export function parseRoute(hash){
 const parts=hash.replace(/^#/,'').split('/');
 if(parts.length===2&&parts[0]==='product'&&Object.hasOwn(names,parts[1]))return {product:parts[1]};
 if(parts.length===3&&parts[0]==='product'&&Object.hasOwn(names,parts[1])&&purchases.some(p=>p.id===parts[2]))return {product:parts[1],purchase:parts[2]};
 return null;
}
