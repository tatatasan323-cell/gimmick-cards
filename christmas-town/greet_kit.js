// グリーティングカードの絵の道具箱（共通/greet_cards.js と、絵ごとの greet_neon.js・greet_sew.js・greet_cello.js が使う）
// 絵の大きさは W×H（この座標で描く。画面の大きさへは呼ぶ側が合わせる）。動かない絵は layer で一度だけ別の紙に描く
// loadMV：MV の人物の部品の写し（共通/mv/）を、その絵の時だけ読む。どれも window に置く昔ながらの書き方なので、<script> で読んで、読んだ直後に取り分ける
//   （ヒップホップとフォークの振り付けは、どちらも window.MV_MOVES という同じ名前。続けて読むと前のが消えるので、読んだ直後の物を覚えておく）
export const W = 360, H = 300, TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
export const easeInOut = (u) => { u = clamp(u, 0, 1); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
export const spring = (u) => { u = clamp(u, 0, 1); return 1 - Math.exp(-6 * u) * Math.cos(9 * u); };   // 少し行きすぎて戻る動き
export const hash = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
export const mix = (hex, k) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k)); return `rgb(${c[0]},${c[1]},${c[2]})`; };
export function layer(draw, w = W, h = H) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; const x = c.getContext('2d'); x.scale(2, 2); draw(x); return c; }
export const fitFont = (x, font, size, text, maxW) => { x.font = font(size); const w = x.measureText(text).width; if (w > maxW) { size *= maxW / w; x.font = font(size); } return size; };
const LOADED = new Map();
// files＝[ファイル名, …]（共通/mv/ の中。並べた順に読む）。take＝{ ファイル名: 取り分ける window の名前 }。data＝読む前に V.S.data へ入れる物（拍 bpm など）
export function loadMV(files, take = {}, data = {}) {
  let p = Promise.resolve();
  for (const f of ['v.js', ...files]) p = p.then(() => {
    if (LOADED.has(f)) return LOADED.get(f);
    if (window.V && data) Object.assign(window.V.S.data, data);
    const q = new Promise((ok, ng) => { const s = document.createElement('script'); s.src = new URL('./mv/' + f, import.meta.url).href; s.onload = () => ok(take[f] ? window[take[f]] : true); s.onerror = () => ng(new Error('読めない: ' + f)); document.head.appendChild(s); });
    LOADED.set(f, q); return q;
  });
  return p.then(() => Promise.all(['v.js', ...files].map((f) => LOADED.get(f)))).then((r) => { const out = {}; files.forEach((f, i) => { if (take[f]) out[take[f]] = r[i + 1]; }); return out; });
}
