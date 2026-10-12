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

/* Preview bridge: exploration battle must show the same observed ABERRANT as HOME. */
function hashNumber(text){let h=2166136261>>>0;for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const previewOwn={type:'NQX',class:'normal',growth:50,visualSeed:hashNumber('RENQX-PREVIEW-NQX'),visual:{asymmetry:1},morphology:{asymmetry:12,fragments:16,tendrils:36,crystal:22,shell:22}};
function enemyModel(){
  const unit=document.querySelector('.enemy-unit');if(!unit)return null;
  const text=unit.textContent||'',type=(text.match(/TYPE\s+([A-Z]+)/)?.[1]||'NQX'),classValue=Number(text.match(/CLASS\s+(\d+)/)?.[1]||1),seed=hashNumber(`${type}|${classValue}|ENEMY`);
  return{type,class:classValue>=667?'unknown':classValue>=333?'dominion':'normal',growth:0,visualSeed:seed,visual:{asymmetry:1},morphology:{asymmetry:seed%30,fragments:8+(seed%38),tendrils:8+((seed>>>3)%50),crystal:8+((seed>>>5)%46),shell:8+((seed>>>7)%46)}};
}
let previewBattleTimer=0,previewBattleScreen=null,previewBattleFrame=0;
function stopPreviewBattle(){if(previewBattleTimer)clearInterval(previewBattleTimer);previewBattleTimer=0;previewBattleScreen=null;}
function paintPreviewBattle(){
  const screen=document.querySelector('.battle-screen');if(!screen){stopPreviewBattle();return}
  const own=screen.querySelector('[data-player-battle-canvas]'),enemy=screen.querySelector('[data-enemy-battle-canvas]');
  if(own)drawAberrant(own,previewOwn,{mode:'play',frame:previewBattleFrame,size:180});
  const foe=enemyModel();if(enemy&&foe)drawAberrant(enemy,foe,{mode:'play',frame:previewBattleFrame+5,size:180});
  previewBattleFrame+=2;
}
function ensurePreviewBattle(){
  const screen=document.querySelector('.battle-screen');if(!screen){stopPreviewBattle();return}
  if(previewBattleScreen===screen&&previewBattleTimer)return;
  stopPreviewBattle();previewBattleScreen=screen;previewBattleFrame=0;paintPreviewBattle();previewBattleTimer=setInterval(paintPreviewBattle,90);
  const enemy=screen.querySelector('.enemy-unit');enemy?.classList.add('battle-fx-enter');setTimeout(()=>enemy?.classList.remove('battle-fx-enter'),620);
}
function clearBattleFx(){document.querySelectorAll('.battle-unit').forEach(node=>{for(const name of [...node.classList])if(name.startsWith('battle-fx-'))node.classList.remove(name)})}
function applyBattleFx(action){
  const screen=document.querySelector('.battle-screen');if(!screen)return;const player=screen.querySelector('.player-unit'),enemy=screen.querySelector('.enemy-unit'),msg=screen.querySelector('[data-battle-message]')?.textContent||'';
  clearBattleFx();
  const ownClass={INVADE:'battle-fx-invade',GUARD:'battle-fx-guard',ADAPT:'battle-fx-adapt',ESCAPE:'battle-fx-escape',ABSORB:'battle-fx-absorb'}[action];if(ownClass)player?.classList.add(ownClass);
  if(/生命\s*-\d+/.test(msg))player?.classList.add('battle-fx-hit');
  if(msg.includes('層破断'))enemy?.classList.add('battle-fx-break');
  if(msg.includes('CORE露出'))enemy?.classList.add('battle-fx-core');
  if(action==='ABSORB')enemy?.classList.add('battle-fx-absorb-target','battle-fx-collapse');
  setTimeout(clearBattleFx,850);
}
function installPreviewBattleBridge(){
  if(typeof document==='undefined')return;
  if(!document.querySelector('style[data-preview-battle-fx]')){const s=document.createElement('style');s.dataset.previewBattleFx='1';s.textContent=`
  .battle-unit{will-change:transform,filter,opacity}.battle-fx-enter{animation:bfEnter .58s steps(4,end)}
  .battle-fx-invade{animation:bfInvade .52s cubic-bezier(.2,.8,.25,1)}.battle-fx-guard{animation:bfGuard .62s ease-out}.battle-fx-adapt{animation:bfAdapt .68s steps(5,end)}.battle-fx-escape{animation:bfEscape .7s ease-out}.battle-fx-absorb{animation:bfAbsorb .8s ease-out}.battle-fx-hit{animation:bfHit .34s steps(5,end)}.battle-fx-break{animation:bfBreak .58s steps(5,end)}.battle-fx-core{animation:bfCore .8s ease-out}.battle-fx-absorb-target{animation:bfTarget .8s ease-out}.battle-fx-collapse{animation:bfCollapse .95s ease-in forwards}
  @keyframes bfEnter{0%{opacity:0;filter:brightness(2);transform:translateX(12px)}35%{opacity:.35;transform:translateX(-5px)}65%{opacity:.8;transform:translateX(3px)}100%{opacity:1;filter:none;transform:none}}
  @keyframes bfInvade{0%{transform:none}38%{transform:translateX(24px) scale(1.08);filter:brightness(1.65) drop-shadow(0 0 14px rgba(220,240,255,.55))}68%{transform:translateX(7px) scale(1.02)}100%{transform:none;filter:none}}
  @keyframes bfGuard{0%{transform:none}42%{transform:scale(.92);filter:brightness(1.9) drop-shadow(0 0 22px rgba(220,240,255,.7))}72%{transform:scale(1.04)}100%{transform:none;filter:none}}
  @keyframes bfAdapt{0%{filter:none}25%{filter:brightness(1.8);transform:skewX(3deg)}50%{filter:brightness(.8);transform:skewX(-3deg)}75%{filter:brightness(1.5);transform:skewX(2deg)}100%{filter:none;transform:none}}
  @keyframes bfEscape{0%{opacity:1;transform:none}55%{opacity:.18;transform:translateX(-26px) scale(.92);filter:blur(1px)}100%{opacity:1;transform:none;filter:none}}
  @keyframes bfAbsorb{0%{transform:none}45%{transform:scale(1.12);filter:brightness(1.8) drop-shadow(0 0 24px rgba(220,240,255,.72))}100%{transform:none;filter:none}}
  @keyframes bfHit{0%,100%{transform:none;filter:none}20%{transform:translateX(-7px);filter:brightness(2.2)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(3px)}}
  @keyframes bfBreak{0%,100%{transform:none;filter:none}30%{transform:translateX(8px) skewX(7deg);filter:contrast(1.8) brightness(1.7)}55%{transform:translateX(-6px) skewX(-6deg);opacity:.55}75%{transform:translateX(3px);opacity:.85}}
  @keyframes bfCore{0%{filter:none}45%{filter:brightness(2.3) drop-shadow(0 0 30px rgba(255,255,255,.9));transform:scale(1.08)}100%{filter:none;transform:none}}
  @keyframes bfTarget{0%{filter:none}50%{filter:brightness(1.7) saturate(.4);transform:scale(.94)}100%{filter:none;transform:none}}
  @keyframes bfCollapse{0%{opacity:1}70%{opacity:.35;transform:scale(.82);filter:blur(1px)}100%{opacity:.08;transform:scale(.72);filter:blur(3px)}}
  `;document.head.appendChild(s)}
  const observer=new MutationObserver(()=>ensurePreviewBattle());observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',event=>{const action=event.target.closest?.('[data-battle-action]')?.dataset.battleAction;if(action)setTimeout(()=>{ensurePreviewBattle();applyBattleFx(action)},0)});
  ensurePreviewBattle();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPreviewBattleBridge,{once:true});else installPreviewBattleBridge();}
