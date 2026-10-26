// 歩く操作（左下の丸＝スティック と キー）。宝石の美術館と氷の彫像で共通（2026-10-26。氷の部屋だけ無く「視点の移動が難しい」＝本人）
// ・左下の丸：上下＝前・後ろ、左右＝横へ（港町・美術館と同じ見た目と操作）。丸は画面（canvas）の外の部品なので、丸の上の指は「さわる」「削る」に渡らない
// ・キー：文字ではなく「キーの場所」（e.code）で受ける（日本語入力がオンだと、押した時の文字が届かない）。W/↑＝前・S/↓＝後ろ・A/D＝横・←/→ と Q/E＝向きを変える
// ・離した知らせ（keyup）が届かないことがある（美術館で「離しても止まらない」が2度）。押しっぱなしの間はくり返しの知らせが続くので、
//   くり返しを一度でも送ってきた端末だけ、最後に押したキーの知らせが途切れたら離したとみなす（くり返しを送らない端末では、押したまま0.8秒で止まった）。前に押したキーは、離した知らせを信じる
// ・窓から外れた・画面が隠れた時は、押していたキーと丸を離す
const CSS = '#joy{position:fixed;left:calc(18px + env(safe-area-inset-left));bottom:calc(22px + env(safe-area-inset-bottom));width:118px;height:118px;border-radius:50%;background:rgba(255,240,220,.12);border:2px solid rgba(255,230,190,.35);touch-action:none;z-index:5}'
  + '#knob{position:absolute;left:39px;top:39px;width:40px;height:40px;border-radius:50%;background:rgba(255,236,200,.75);box-shadow:0 2px 8px rgba(0,0,0,.4);pointer-events:none}';
export const KEYMAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr', KeyQ: 'tl', KeyE: 'tr' };
const nowS = () => performance.now() / 1000;

// onStart()＝丸かキーを使いはじめた時（音を起こす・説明を消す）／onIme()＝日本語入力がオンのまま押した時（最初の1回だけ）
export function makeWalkpad({ onStart, onIme } = {}) {
  if (!document.getElementById('walkpadCss')) { const s = document.createElement('style'); s.id = 'walkpadCss'; s.textContent = CSS; document.head.append(s); }
  const J = document.createElement('div'); J.id = 'joy'; J.setAttribute('aria-label', '左の丸：上下で前・後ろ、左右で横へ');
  const K = document.createElement('div'); K.id = 'knob'; J.append(K); document.body.append(J);
  const joy = { x: 0, y: 0, id: null }, held = new Map(), keys = new Set(); let lastKey = null, repOK = false, imeSaid = false;
  const setK = (x, y) => { K.style.transform = `translate(${x * 39}px, ${y * 39}px)`; };
  const mv = (e) => { const r = J.getBoundingClientRect(), dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2), L = Math.hypot(dx, dy), k = L > 1 ? 1 / L : 1; joy.x = dx * k; joy.y = dy * k; setK(joy.x, joy.y); };
  const letGo = () => { joy.id = null; joy.x = joy.y = 0; setK(0, 0); };
  J.addEventListener('pointerdown', (e) => { J.setPointerCapture(e.pointerId); joy.id = e.pointerId; if (onStart) onStart(); mv(e); });
  J.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) mv(e); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) J.addEventListener(t, (e) => { if (e.pointerId === joy.id) letGo(); });
  addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code]; if (!k) return; e.preventDefault();
    const h = held.get(e.code); if (e.repeat || h) repOK = true; held.set(e.code, { k, t: nowS(), rep: !!h || e.repeat }); lastKey = e.code;
    if (!imeSaid && onIme && (e.key === 'Process' || e.isComposing || e.keyCode === 229)) { imeSaid = true; onIme(); } else if (onStart) onStart();
  });
  addEventListener('keyup', (e) => { held.delete(e.code); if (lastKey === e.code) lastKey = null; });
  const release = () => { held.clear(); keys.clear(); lastKey = null; letGo(); };
  addEventListener('blur', release); document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });
  // 毎コマ：途切れたキーを離し、押しているキーの向き（f・b・l・r・tl・tr）を keys に入れる
  function readKeys(now = nowS()) {
    const h = lastKey && held.get(lastKey);
    if (h && repOK && now - h.t > (h.rep ? 0.45 : 0.8)) { held.clear(); lastKey = null; }   // くり返しが始まる前は長めに待つ（OSの設定で0.25〜1秒）
    keys.clear(); for (const v of held.values()) keys.add(v.k);
    return keys;
  }
  // 前・横の量（-1〜1）と、向きを変える量。丸は真ん中のあそび（0.12）を除く
  function axes(now) { readKeys(now); const K2 = (k) => (keys.has(k) ? 1 : 0), dz = (v) => (Math.abs(v) > 0.12 ? v : 0);
    return { f: Math.max(-1, Math.min(1, K2('f') - K2('b') - dz(joy.y))), x: Math.max(-1, Math.min(1, K2('r') - K2('l') + dz(joy.x))), turn: K2('tl') - K2('tr') }; }
  return { el: J, joy, keys, held, readKeys, axes, release };
}
