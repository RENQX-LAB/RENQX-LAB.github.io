import { seeded } from './nqx-rng.js';
import { hsl, orbit } from './nqx-visual-primitives.js';
import { FAMILY_A, drawFamilyA } from './nqx-visual-shapes-a.js';
import { drawFamilyB } from './nqx-visual-shapes-b.js';

const POOLS={
  NQX:['eclipse_wraith','orbital_eye','halo_shrine','jelly_halo','procession_tower'],
  Q:['drip_maw','serpent_maw','phase_lance','tendril_tree','void_reliquary'],
  ENQ:['phase_lance','crystal_bulwark','split_obelisk','orbital_eye','hourglass_dual'],
  ECHO:['hourglass_dual','colony_bloom','jelly_halo','orbital_eye','halo_shrine'],
  VEIL:['eclipse_wraith','jelly_halo','halo_shrine','procession_tower','void_reliquary'],
  DRIFT:['tendril_tree','colony_bloom','eclipse_wraith','split_obelisk','jelly_halo'],
  SIGNAL:['phase_lance','orbital_eye','crystal_bulwark','halo_shrine','split_obelisk'],
  FRAGMENT:['crystal_bulwark','split_obelisk','colony_bloom','phase_lance','hourglass_dual'],
  REMNANT:['void_reliquary','procession_tower','drip_maw','halo_shrine','serpent_maw']
};
const PALETTES=[
  [222,36,16,222,52,29,228,42,74,196,92,80],
  [210,28,14,210,44,26,216,30,76,188,88,78],
  [236,34,15,236,48,29,244,34,78,258,92,78],
  [198,42,14,198,58,27,204,34,75,178,86,76],
  [248,30,14,248,44,28,252,32,80,220,90,86],
  [228,22,13,228,36,24,210,18,82,202,84,88]
];
function stageOf(q){return q.growth<15?0:q.growth<40?1:q.growth<75?2:3}
function familyFor(q){const pool=POOLS[q.type]||POOLS.NQX;return q.visual?.family||pool[Math.abs(Number(q.visualSeed||0))%pool.length]}
function paletteFor(q,stage){
  if(q.class==='unknown')return{body:'#05060a',mid:'#10131c',pale:'#d9f2ff',glow:'#dff8ff'};
  if(q.class==='dominion')return{body:'#dfe6ef',mid:'#edf4ff',pale:'#ffffff',glow:'#f7fcff'};
  const x=PALETTES[Math.abs(Math.floor(Number(q.visualSeed||0)/11))%PALETTES.length],lift=stage*4;
  return{body:hsl(x[0],x[1],x[2]+lift),mid:hsl(x[3],x[4],x[5]+lift),pale:hsl(x[6],x[7],Math.min(88,x[8]+lift*.6)),glow:hsl(x[9],x[10],Math.min(90,x[11]+lift*.4))};
}
export function drawAberrant(canvas,q,{mode='normal',frame=0,size=320}={}){
  if(!canvas||!q)return;
  const dpr=Math.min(2,globalThis.devicePixelRatio||1),css=Math.max(1,Math.round(size)),w=Math.max(1,Math.round(css*dpr));
  if(canvas.width!==w||canvas.height!==w){canvas.width=w;canvas.height=w}
  canvas.style.width=`${css}px`;canvas.style.height=`${css}px`;
  const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,css,css);ctx.imageSmoothingEnabled=false;
  const logical=32,s=Math.max(1,Math.floor(css/logical)),ox=(css-logical*s)/2/s;ctx.save();ctx.translate(ox*s,ox*s);
  const stage=stageOf(q),family=familyFor(q),rng=seeded(`${q.visualSeed}|${q.type}|${family}|${stage}`),p=paletteFor(q,stage),black=q.class==='unknown';
  const phase=mode==='play'?Math.sin(frame/18)*.9:0,asym=(q.visual?.asymmetry??1)*(q.morphology?.asymmetry??30)/99,cx=16+asym*2.1,cy=16+phase;
  const boost=stage===0?(mode==='play'?1.55:1.4):1;if(boost!==1){ctx.translate(cx*s,cy*s);ctx.scale(boost,boost);ctx.translate(-cx*s,-cy*s)}
  const o={cx,cy,s,stage,variant:Math.abs(Math.floor(Number(q.visualSeed||0)/7))%4,p,black,rng,frag:q.morphology?.fragments??0,tend:q.morphology?.tendrils??0,crystal:q.morphology?.crystal??0,shell:q.morphology?.shell??0,frame};
  if(FAMILY_A.has(family))drawFamilyA(ctx,family,o);else drawFamilyB(ctx,family,o);
  if(q.class==='unknown')orbit(ctx,cx,cy,10+stage,8,frame/18,s,'#ffffff',.5);
  ctx.restore();ctx.globalAlpha=1;
}
