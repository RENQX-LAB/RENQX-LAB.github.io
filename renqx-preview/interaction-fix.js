import { drawReferenceAberrant } from './aberrantVisual.js';

const BASE = Object.freeze({ LIFE: 108, POWER: 96, GUARD: 88, SPEED: 103, ABSORB: 72, ADAPT: 110 });
const TYPES = new Set(['NQX', 'Q', 'ENQ', 'ECHO', 'VEIL', 'DRIFT', 'SIGNAL', 'FRAGMENT', 'REMNANT']);
const PVP_PREFIX = 'RENQXPVP1:';
const QR_CODE_MODULE = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm';
const QR_SCANNER_MODULE = 'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js';
let pvpScanner = null;
let pvpOverlay = null;
let cleanupTimer = 0;
let qrCodePromise = null;
let qrScannerPromise = null;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function injectGameHardening() {
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) viewport.setAttribute('content', 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover');
  if (document.querySelector('#renqx-interaction-fix-style')) return;
  const style = document.createElement('style');
  style.id = 'renqx-interaction-fix-style';
  style.textContent = `
    html,body,#app{overscroll-behavior:none;-webkit-text-size-adjust:100%}
    .interstice-screen,.battle-screen{overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    .interstice-canvas{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}
    .interstice-canvas.phase-moving{animation:none!important;transform:none!important}
    .battle-screen button,.interstice-screen button,.pvp-actions button{touch-action:manipulation}
    .renqx-pvp-overlay{position:fixed;inset:0;z-index:500;background:#050608;color:#eef1f5;display:flex;justify-content:center;overflow:auto;overscroll-behavior:none;touch-action:manipulation}
    .renqx-pvp-panel{width:min(100%,520px);min-height:100dvh;padding:max(12px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom));display:flex;flex-direction:column}
    .renqx-pvp-head{min-height:48px;display:grid;grid-template-columns:72px 1fr 72px;align-items:center;border-bottom:1px solid #20262e}
    .renqx-pvp-head button{justify-self:start;color:#818b96;font-size:9px;touch-action:manipulation}
    .renqx-pvp-head strong{grid-column:2;text-align:center;font-size:11px;letter-spacing:.15em}
    .renqx-pvp-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px 0}
    .renqx-pvp-body canvas[data-pvp-qr]{width:min(72vw,280px);height:auto;max-width:280px;background:#fff;padding:10px}
    .renqx-pvp-body video{width:100%;max-width:420px;aspect-ratio:3/4;object-fit:cover;background:#000;border:1px solid #252d36}
    .renqx-pvp-note{max-width:390px;margin:0;text-align:center;color:#7d8792;font-size:9px;line-height:1.7}
    .renqx-pvp-file{width:100%;max-width:390px;border:1px solid #303844;padding:12px;font-size:9px;background:#07090c}
    .renqx-pvp-battle{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:center}
    .renqx-pvp-unit{text-align:center;min-width:0}
    .renqx-pvp-unit canvas{width:min(40vw,170px);height:min(40vw,170px);image-rendering:pixelated}
    .renqx-pvp-unit.enemy canvas{transform:scaleX(-1)}
    .renqx-pvp-unit b{display:block;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .renqx-pvp-unit span{display:block;margin-top:4px;color:#7d8792;font-size:8px}
    .renqx-pvp-turns{width:100%;max-width:430px;min-height:120px;border-top:1px solid #20262e;border-bottom:1px solid #20262e;padding:10px 0}
    .renqx-pvp-turns p{margin:5px 0;color:#9ba4ae;font-size:9px;line-height:1.5}
    .renqx-pvp-result{font-size:18px;letter-spacing:.16em;text-align:center}
    .renqx-pvp-result small{display:block;margin-top:7px;color:#7d8792;font-size:9px;letter-spacing:.08em}
  `;
  document.head.appendChild(style);
}

function gameGestureTarget(target) {
  return target?.closest?.('.interstice-screen,.battle-screen,.renqx-pvp-overlay');
}

function installGestureGuards() {
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, event => {
      if (gameGestureTarget(event.target)) event.preventDefault();
    }, { passive: false, capture: true });
  }
  document.addEventListener('touchmove', event => {
    if (gameGestureTarget(event.target)) event.preventDefault();
  }, { passive: false, capture: true });
  document.addEventListener('pointerdown', event => {
    if (event.target?.id !== 'interstice-canvas') return;
    event.preventDefault();
    try { event.target.setPointerCapture?.(event.pointerId); } catch {}
  }, { capture: true });
}

function stripSystemPresentation() {
  const adText = document.querySelector('.home .ad span');
  if (adText && /広告プロバイダ接続領域/.test(adText.textContent || '')) adText.remove();

  const grid = document.querySelector('.detail .grid');
  if (!grid) return;
  for (const cell of [...grid.children]) {
    const label = cell.querySelector('small')?.textContent?.trim() || '';
    if (['クラス上限表示', '能力認識上限', '外見', 'ステータス成長'].includes(label)) cell.remove();
    if (label === '存在形態' && cell.querySelector('b')?.textContent?.trim() === 'NORMAL') cell.remove();
  }
}

function scheduleCleanup() {
  clearTimeout(cleanupTimer);
  cleanupTimer = globalThis.setTimeout(stripSystemPresentation, 40);
  globalThis.setTimeout(stripSystemPresentation, 220);
}

function readGrowth() {
  try {
    const stored = JSON.parse(localStorage.getItem('renqx.preview.statusGrowth') || 'null');
    if (!stored || typeof stored !== 'object') return Object.fromEntries(Object.keys(BASE).map(key => [key, 0]));
    return Object.fromEntries(Object.keys(BASE).map(key => [key, Math.max(0, Math.trunc(Number(stored[key]) || 0))]));
  } catch {
    return Object.fromEntries(Object.keys(BASE).map(key => [key, 0]));
  }
}

function growthStage(growth) {
  const total = Object.values(growth).reduce((sum, value) => sum + value, 0);
  const startedAt = Number(localStorage.getItem('renqx.preview.syncStartedAt')) || Date.now();
  const days = Math.max(1, Math.floor((Date.now() - startedAt) / 86400000) + 1);
  const score = Math.min(days * 20, total);
  if (score >= 240) return 4;
  if (score >= 150) return 3;
  if (score >= 80) return 2;
  if (score >= 30) return 1;
  return 0;
}

function ownUnit() {
  const growth = readGrowth();
  const abilities = Object.fromEntries(Object.keys(BASE).map(key => [key, clamp(BASE[key] + growth[key], 0, 666)]));
  const query = new URLSearchParams(location.search);
  const classValue = Math.max(1, Math.trunc(Number(query.get('class')) || 184));
  const sync = clamp(query.has('sync') ? Number(query.get('sync')) : 37, 0, 100);
  return {
    id: 'AB-2719',
    name: (localStorage.getItem('renqx.preview.name') || '').trim(),
    type: 'NQX',
    class: classValue,
    stage: growthStage(growth),
    generation: 1,
    sync,
    abilities,
    visualSeed: 'RENQX-PREVIEW-NQX',
    color: { main: '#F4F1ED', sub: '#D9D9D6', core: '#FFFFFF' },
    visualParams: { body: 1, head: 1, core: 1, appendage: 2, shell: 1, aura: 1, asymmetry: .12, scale: 1, aspect: 1, pattern: 1, offset: 0 }
  };
}

function randomNonce() {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2);
    crypto.getRandomValues(values);
    return [...values].map(value => value.toString(16).padStart(8, '0')).join('');
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = String(value).replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function makePvpText() {
  const unit = ownUnit();
  const payload = {
    v: 1,
    k: 'ABERRANT',
    nonce: randomNonce(),
    id: unit.id,
    name: unit.name,
    type: unit.type,
    class: unit.class,
    stage: unit.stage,
    generation: unit.generation,
    sync: unit.sync,
    abilities: unit.abilities,
    visualSeed: unit.visualSeed,
    color: unit.color,
    visualParams: unit.visualParams
  };
  return `${PVP_PREFIX}${base64UrlEncode(JSON.stringify(payload))}`;
}

function parsePvpText(text) {
  try {
    if (!String(text).startsWith(PVP_PREFIX)) return null;
    const payload = JSON.parse(base64UrlDecode(String(text).slice(PVP_PREFIX.length)));
    if (payload?.v !== 1 || payload?.k !== 'ABERRANT' || typeof payload.id !== 'string' || !TYPES.has(payload.type)) return null;
    if (!payload.abilities || Object.keys(BASE).some(key => !Number.isFinite(Number(payload.abilities[key])) || Number(payload.abilities[key]) < 0 || Number(payload.abilities[key]) > 666)) return null;
    payload.class = clamp(payload.class, 1, 1000);
    payload.stage = clamp(payload.stage, 0, 4);
    payload.sync = clamp(payload.sync, 0, 100);
    payload.name = String(payload.name || '').slice(0, 24);
    payload.generation = Math.max(1, Math.trunc(Number(payload.generation) || 1));
    payload.color = payload.color && typeof payload.color === 'object' ? payload.color : { main: '#F4F1ED', sub: '#D9D9D6', core: '#FFFFFF' };
    payload.visualParams = payload.visualParams && typeof payload.visualParams === 'object' ? payload.visualParams : ownUnit().visualParams;
    return payload;
  } catch {
    return null;
  }
}

function hashSeed(text) {
  let value = 2166136261;
  for (const char of String(text)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function seededRandom(seedText) {
  let state = hashSeed(seedText) || 1;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function resolveThreeTurnBattle(player, enemy, nonce) {
  const rng = seededRandom(`${player.id}|${enemy.id}|${nonce || ''}`);
  const hp = unit => Math.max(30, Math.round(unit.abilities.LIFE * 1.25 + unit.abilities.GUARD * .55 + unit.abilities.ADAPT * .18));
  const maxPlayer = hp(player), maxEnemy = hp(enemy);
  let playerHp = maxPlayer, enemyHp = maxEnemy;
  const turns = [];
  const damage = (attacker, defender) => Math.max(1, Math.round(attacker.abilities.POWER * .17 + attacker.abilities.SPEED * .045 + attacker.abilities.ADAPT * .035 + attacker.abilities.ABSORB * .02 + rng() * 10 - defender.abilities.GUARD * .075));
  for (let turn = 1; turn <= 3; turn += 1) {
    const playerInitiative = player.abilities.SPEED + player.abilities.ADAPT * .18 + rng() * 24;
    const enemyInitiative = enemy.abilities.SPEED + enemy.abilities.ADAPT * .18 + rng() * 24;
    const order = playerInitiative >= enemyInitiative ? [['player', player, enemy], ['enemy', enemy, player]] : [['enemy', enemy, player], ['player', player, enemy]];
    const hits = [];
    for (const [side, attacker, defender] of order) {
      if (playerHp <= 0 || enemyHp <= 0) break;
      const amount = damage(attacker, defender);
      if (side === 'player') enemyHp = Math.max(0, enemyHp - amount);
      else playerHp = Math.max(0, playerHp - amount);
      hits.push({ side, amount, playerHp, enemyHp });
    }
    turns.push({ turn, hits, playerHp, enemyHp });
    if (playerHp <= 0 || enemyHp <= 0) break;
  }
  let winner = 'draw';
  if (playerHp <= 0 && enemyHp > 0) winner = 'enemy';
  else if (enemyHp <= 0 && playerHp > 0) winner = 'player';
  else {
    const playerRatio = playerHp / maxPlayer;
    const enemyRatio = enemyHp / maxEnemy;
    if (Math.abs(playerRatio - enemyRatio) > .015) winner = playerRatio > enemyRatio ? 'player' : 'enemy';
    else {
      const score = unit => unit.abilities.POWER + unit.abilities.GUARD + unit.abilities.SPEED + unit.abilities.ADAPT + unit.abilities.ABSORB * .6;
      winner = score(player) >= score(enemy) ? 'player' : 'enemy';
    }
  }
  return { turns, winner, playerHp, enemyHp, maxPlayer, maxEnemy };
}

function stopPvpScanner() {
  try { pvpScanner?.stop?.(); } catch {}
  try { pvpScanner?.destroy?.(); } catch {}
  pvpScanner = null;
  const video = pvpOverlay?.querySelector('video');
  try {
    const stream = video?.srcObject;
    if (stream?.getTracks) for (const track of stream.getTracks()) track.stop();
    if (video) video.srcObject = null;
  } catch {}
}

function closePvpOverlay() {
  stopPvpScanner();
  pvpOverlay?.remove();
  pvpOverlay = null;
}

function createOverlay(title, body) {
  closePvpOverlay();
  const overlay = document.createElement('div');
  overlay.className = 'renqx-pvp-overlay';
  overlay.innerHTML = `<main class="renqx-pvp-panel"><header class="renqx-pvp-head"><button type="button" data-pvp-close>戻る</button><strong>${escapeHtml(title)}</strong></header><section class="renqx-pvp-body">${body}</section></main>`;
  document.body.appendChild(overlay);
  pvpOverlay = overlay;
  return overlay;
}

async function loadQrCode() {
  qrCodePromise ||= import(QR_CODE_MODULE).then(module => module.default || module);
  return qrCodePromise;
}

async function loadQrScanner() {
  qrScannerPromise ||= import(QR_SCANNER_MODULE).then(module => module.default || module.QrScanner || module);
  return qrScannerPromise;
}

async function showOwnQr() {
  const text = makePvpText();
  const overlay = createOverlay('対戦QR', `<canvas data-pvp-qr width="280" height="280"></canvas><p class="renqx-pvp-note">このQRを相手に読み取ってもらうと、現在の個体情報で3ターン対人戦を開始できます。初期状態の個体でも使用できます。</p><p class="renqx-pvp-note" data-pvp-status>QRを生成中...</p>`);
  const status = overlay.querySelector('[data-pvp-status]');
  try {
    const QRCode = await loadQrCode();
    if (overlay !== pvpOverlay) return;
    await QRCode.toCanvas(overlay.querySelector('[data-pvp-qr]'), text, { errorCorrectionLevel: 'M', margin: 2, width: 280, color: { dark: '#050608', light: '#ffffff' } });
    if (status) status.textContent = '相手端末で「相手QRを読む」を選んで読み取ってください。';
  } catch {
    if (status) status.textContent = 'QR生成に失敗しました。通信状態を確認してもう一度お試しください。';
  }
}

function drawBattleUnit(canvas, unit) {
  if (!canvas || !unit) return;
  const buffer = document.createElement('canvas');
  buffer.width = 260;
  buffer.height = 260;
  const context = buffer.getContext('2d');
  context.clearRect(0, 0, 260, 260);
  drawReferenceAberrant(context, unit);
  canvas.width = 64;
  canvas.height = 64;
  const target = canvas.getContext('2d');
  target.imageSmoothingEnabled = false;
  target.clearRect(0, 0, 64, 64);
  target.drawImage(buffer, 0, 0, 260, 260, 0, 0, 64, 64);
}

function hitText(hit, player, enemy) {
  const attacker = hit.side === 'player' ? (player.name || '自分') : (enemy.name || enemy.id);
  const target = hit.side === 'player' ? (enemy.name || enemy.id) : (player.name || '自分');
  return `${attacker} → ${target} / ${hit.amount}`;
}

async function showPvpBattle(enemy) {
  const player = ownUnit();
  const result = resolveThreeTurnBattle(player, enemy, enemy.nonce || '');
  const overlay = createOverlay('対人戦', `<div class="renqx-pvp-battle"><div class="renqx-pvp-unit"><canvas data-pvp-player></canvas><b>${escapeHtml(player.name || '名無し')}</b><span>${escapeHtml(player.type)} / クラス ${Math.trunc(player.class)}</span></div><div class="renqx-pvp-unit enemy"><canvas data-pvp-enemy></canvas><b>${escapeHtml(enemy.name || enemy.id)}</b><span>${escapeHtml(enemy.type)} / クラス ${Math.trunc(enemy.class)}</span></div></div><div class="renqx-pvp-turns" data-pvp-turns></div><div class="renqx-pvp-result" data-pvp-result>対戦開始<small>3ターン完全自動</small></div>`);
  drawBattleUnit(overlay.querySelector('[data-pvp-player]'), player);
  drawBattleUnit(overlay.querySelector('[data-pvp-enemy]'), enemy);
  const turnsNode = overlay.querySelector('[data-pvp-turns]');
  const resultNode = overlay.querySelector('[data-pvp-result]');
  for (const turn of result.turns) {
    if (overlay !== pvpOverlay) return;
    await new Promise(resolve => setTimeout(resolve, 520));
    const line = document.createElement('p');
    line.textContent = `TURN ${turn.turn} / ${turn.hits.map(hit => hitText(hit, player, enemy)).join('  |  ')} / LIFE ${turn.playerHp} : ${turn.enemyHp}`;
    turnsNode?.appendChild(line);
  }
  await new Promise(resolve => setTimeout(resolve, 420));
  if (overlay !== pvpOverlay || !resultNode) return;
  resultNode.innerHTML = `${result.winner === 'player' ? '勝利' : result.winner === 'enemy' ? '敗北' : '引き分け'}<small>LIFE ${result.playerHp} : ${result.enemyHp}</small>`;
}

async function handleScannedText(text) {
  const enemy = parsePvpText(text);
  if (!enemy) {
    const status = pvpOverlay?.querySelector('[data-pvp-scan-status]');
    if (status) status.textContent = 'Re:NQXの対戦QRではありません。';
    return;
  }
  stopPvpScanner();
  await showPvpBattle(enemy);
}

async function startScanner() {
  const overlay = createOverlay('相手QRを読む', `<video data-pvp-video playsinline muted></video><p class="renqx-pvp-note" data-pvp-scan-status>カメラを起動中...</p><label class="renqx-pvp-file">画像から読み込む<input type="file" accept="image/*" capture="environment" data-pvp-file></label>`);
  const video = overlay.querySelector('[data-pvp-video]');
  const status = overlay.querySelector('[data-pvp-scan-status]');
  try {
    const QrScanner = await loadQrScanner();
    if (overlay !== pvpOverlay) return;
    pvpScanner = new QrScanner(video, result => {
      const text = typeof result === 'string' ? result : result?.data;
      if (text) void handleScannedText(text);
    }, { preferredCamera: 'environment', highlightScanRegion: true, returnDetailedScanResult: true });
    await pvpScanner.start();
    if (status) status.textContent = '相手の対戦QRを枠内に入れてください。';
  } catch {
    if (status) status.textContent = 'カメラを開始できません。下の「画像から読み込む」からQR画像を選べます。';
  }
}

async function scanFile(file) {
  if (!file) return;
  const status = pvpOverlay?.querySelector('[data-pvp-scan-status]');
  try {
    const QrScanner = await loadQrScanner();
    const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
    const text = typeof result === 'string' ? result : result?.data;
    if (!text) throw new Error('no qr');
    await handleScannedText(text);
  } catch {
    if (status) status.textContent = 'QRを読み取れませんでした。画像を変えてもう一度お試しください。';
  }
}

function installPvpActions() {
  document.addEventListener('click', event => {
    const close = event.target?.closest?.('[data-pvp-close]');
    if (close) {
      event.preventDefault();
      closePvpOverlay();
      return;
    }

    const pvpButton = event.target?.closest?.('.pvp-actions button');
    if (pvpButton) {
      const text = pvpButton.textContent?.trim();
      if (text === '対戦QRを表示') {
        event.preventDefault();
        event.stopImmediatePropagation();
        void showOwnQr();
        return;
      }
      if (text === '相手QRを読む') {
        event.preventDefault();
        event.stopImmediatePropagation();
        void startScanner();
        return;
      }
    }
    scheduleCleanup();
  }, { capture: true });

  document.addEventListener('change', event => {
    const input = event.target?.closest?.('[data-pvp-file]');
    if (input) void scanFile(input.files?.[0]);
  });
}

function install() {
  injectGameHardening();
  installGestureGuards();
  installPvpActions();
  scheduleCleanup();
  globalThis.setTimeout(scheduleCleanup, 300);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPvpScanner();
    else scheduleCleanup();
  });
  globalThis.addEventListener('pagehide', stopPvpScanner);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
}
