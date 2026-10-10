const TEXT_REPLACEMENTS = [
  [/HOSTILE SIGNAL/g, '敵性反応'],
  [/CORE EXPOSED/g, 'CORE露出'],
  [/LAYER BREAK/g, '層破断'],
  [/INVADE FAILED/g, '侵攻失敗'],
  [/INVADE SUCCESS/g, '侵攻成功'],
  [/ABSORB SUCCESS/g, '吸収成功'],
  [/ABSORB FAILED/g, '吸収失敗'],
  [/ESCAPE SUCCESS/g, '離脱成功'],
  [/ESCAPE FAILED/g, '離脱失敗'],
  [/RUN LIFE/g, '生命'],
  [/HOSTILE STRUCTURE/g, '敵性構造'],
  [/VICTORY/g, '勝利'],
  [/DEFEAT/g, '敗北'],
  [/\bTHREAT\b/g, '脅威'],
  [/\bLAYER\b/g, '層'],
  [/\bLIFE\b/g, '生命'],
  [/\bPOWER\b/g, '出力'],
  [/\bGUARD\b/g, '防御'],
  [/\bSPEED\b/g, '速度'],
  [/\bABSORB\b/g, '吸収'],
  [/\bADAPT\b/g, '適応'],
  [/\bINVADE\b/g, '侵攻'],
  [/\bESCAPE\b/g, '離脱'],
  [/\bSTATUS\b/g, 'ステータス'],
  [/\bBACK\b/g, '戻る'],
  [/\bGENERATION\b/g, '世代'],
  [/\bTRAITS\b/g, '特性'],
  [/NO ACTIVE OBSERVATION/g, '観測対象なし']
];

const TRAIT_LABELS = Object.freeze({
  AGGRESSIVE: '攻撃的',
  RESTRAINED: '抑制的',
  CAUTIOUS: '慎重',
  BOLD: '大胆',
  CURIOUS: '好奇',
  FOCUSED: '集中',
  STABLE: '安定',
  VOLATILE: '不安定',
  COLLECTIVE: '収集的',
  SELECTIVE: '選択的',
  REACTIVE: '反応的',
  CALM: '静穏'
});

function translateText(value) {
  let next = String(value ?? '');
  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  for (const [source, replacement] of Object.entries(TRAIT_LABELS)) {
    next = next.replace(new RegExp(`\\b${source}\\b`, 'g'), replacement);
  }
  return next;
}

function translateVisibleText(root = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || ['SCRIPT', 'STYLE'].includes(parent.tagName)) continue;
    const translated = translateText(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
  }
}

function loadCurrentAberrant() {
  try {
    const state = JSON.parse(localStorage.getItem('renqx.save.v1') || 'null');
    return state?.currentAberrant ?? null;
  } catch {
    return null;
  }
}

function makeRow(label, value, wide = false) {
  const row = document.createElement('div');
  if (wide) row.className = 'wide';
  row.dataset.jaExtra = '1';
  const dt = document.createElement('dt');
  const dd = document.createElement('dd');
  dt.textContent = label;
  dd.textContent = String(value ?? '');
  row.append(dt, dd);
  return row;
}

function augmentStatus() {
  const screen = document.querySelector('.detail-screen');
  const grid = screen?.querySelector('.status-grid');
  if (!grid || grid.querySelector('[data-ja-extra="1"]')) return;

  const title = screen.querySelector('h1')?.textContent?.trim() || '';
  if (title !== 'STATUS' && title !== 'ステータス') return;

  const aberrant = loadCurrentAberrant();
  if (!aberrant) return;

  const firstRow = grid.firstElementChild;
  if (aberrant.id) grid.insertBefore(makeRow('個体ID', aberrant.id, true), firstRow);

  const traitRow = [...grid.children].find(row => row.querySelector('dt')?.textContent?.trim() === '特性') || null;
  const insertBefore = row => traitRow ? grid.insertBefore(row, traitRow) : grid.appendChild(row);

  insertBefore(makeRow('CORE到達', Number(aberrant.coreReached) || 0));
  insertBefore(makeRow('変異記録', Array.isArray(aberrant.mutationHistory) ? aberrant.mutationHistory.length : 0));

  const record = aberrant.battleRecord || {};
  insertBefore(makeRow(
    '戦闘記録',
    `戦闘 ${Number(record.battles) || 0} / 勝利 ${Number(record.wins) || 0} / 敗北 ${Number(record.losses) || 0} / 離脱 ${Number(record.escapes) || 0} / 吸収 ${Number(record.absorbs) || 0}`,
    true
  ));
}

let scheduled = false;
function applyJapanesePresentation() {
  scheduled = false;
  translateVisibleText(document.body);
  augmentStatus();
}

function scheduleApply() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(applyJapanesePresentation);
}

const observer = new MutationObserver(scheduleApply);
observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleApply, { once: true });
} else {
  scheduleApply();
}
