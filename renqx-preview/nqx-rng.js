export function hashString(input=''){
  let h=2166136261>>>0;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
export function mulberry32(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function seeded(input){return mulberry32(hashString(String(input)));}
export function int(rng,min,max){return Math.floor(rng()*(max-min+1))+min;}
export function clamp(n,min,max){return Math.max(min,Math.min(max,n));}
export function chance(rng,p){return rng()<p;}
export function weighted(rng,rows,weightKey='weight'){const total=rows.reduce((s,x)=>s+Number(x[weightKey]??0),0);let cursor=rng()*total;for(const row of rows){cursor-=Number(row[weightKey]??0);if(cursor<=0)return row;}return rows.at(-1);}
export function pick(rng,arr){return arr[Math.floor(rng()*arr.length)];}
export function uuidish(rng=Math.random){return Array.from({length:8},()=>Math.floor(rng()*16).toString(16)).join('');}
