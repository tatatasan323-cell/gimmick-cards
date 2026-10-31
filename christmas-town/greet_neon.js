// グリーティングカードの絵：ネオン（ヒップホップ「テーブルに集まれ！」）。共通/greet_cards.js の mountGreet が使う
// build() が返す物＝{ S（step・total・done）, draw(x, t), busy(t), tap(t, sfx), ambient?(t, sfx), ready?（MV の部品を読み終えたら解ける Promise）, snow? }
// 夜のレンガの壁に、ネオンのツリーと字。さわるたびに管が何本も連なってジジッと灯り（消えかけて、また点く）、レンガを色で照らす（本人 2026-11-01「１クリックで、いくつか連動して」「じじっと消えかかりそうに」）
// 最後に店の窓に灯りがともり、MV の仲間（ニーナ・サム・マヤ・王冠の子）が顔を出して手を振る。ネオンのサンタのそりが、コマ送りで空を駆ける（現実には動かないネオンが動き出す＝MV の手法）
// 光らせ方は MV の壁のネオンと同じ順：管の影と消えている管のガラス（下地に焼く）→ 壁を照らす光（光の地図×レンガの色）→ にじみ → 芯（動画制作ラボ/MV/クリスマス/hiphop/street.js）
// ぼかしは canvas の filter を使わず、小さい紙に描いて引きのばす（filter の効かない端末でも同じ見え方・軽い）
import { W, H, TAU, clamp, ease, spring, hash, layer, fitFont, loadMV } from './greet_kit.js';

const SCRIPT = (s) => `italic 700 ${s}px "Segoe Script",cursive`;
const TX = 92, WX0 = 186, WY0 = 172, WX1 = 346, WY1 = 262, CNT = 246, WALK = 274;   // ツリーのまん中／店の窓のガラスの内側／カウンターの上の面／歩道
const C = { green: '#3dff8e', yellow: '#ffe24a', pink: '#ff4fae', cyan: '#41e2ff', orange: '#ff9d3d', red: '#ff4a5a', purple: '#b98cff', gold: '#ffd060', white: '#fff1dc', amber: '#ffb040' };
const hot = (hex, k = 0.62) => { const n = parseInt(hex.slice(1), 16); return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k)).join(',')})`; };   // 管の芯（白に寄せる）

// ---------- MV の仲間の帽子と王冠（写し：動画制作ラボ/MV/クリスマス/hiphop/cast.js の beanie・crown。MV は書きかえない） ----------
const INK = '#2a140a';
const ol = (g, w = 3) => { g.lineWidth = w; g.strokeStyle = INK; g.stroke(); };
const beanie = (col, band, pom) => (g, P, p, J) => { const h = P.head, r = J.headR; g.save(); g.translate(h.x, h.y); g.rotate(P.headA);
  g.beginPath(); g.ellipse(0, -r * 0.45, r * 1.02, r * 0.78, 0, Math.PI, 0); g.closePath(); g.fillStyle = col; g.fill(); ol(g);
  for (let k = -3; k <= 3; k++) { g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(k * r * 0.24, -r * 0.5); g.lineTo(k * r * 0.2, -r * 1.12); g.stroke(); }
  g.beginPath(); g.roundRect(-r * 1.08, -r * 0.62, r * 2.16, r * 0.34, r * 0.15); g.fillStyle = band; g.fill(); ol(g, 2.5);
  g.beginPath(); g.arc(Math.sin(p.t * 3 || 0) * 2, -r * 1.3, r * 0.3, 0, TAU); g.fillStyle = pom; g.fill(); ol(g, 2.5); g.restore(); };
const crownShape = (g, r, gold) => { g.beginPath(); g.moveTo(-r * 0.85, -r * 0.62); for (let k = 0; k <= 4; k++) g.lineTo(-r * 0.85 + k * r * 0.425, -r * (k % 2 ? 0.98 : 1.32)); g.lineTo(r * 0.85, -r * 0.62); g.closePath(); g.fillStyle = gold ? '#ffd23a' : '#d8e4f0'; g.fill(); ol(g, 2.4);
  g.fillStyle = '#e8283a'; g.beginPath(); g.arc(0, -r * 0.8, r * 0.1, 0, TAU); g.fill(); };
const crown = (key) => (g, P, p, J) => { const h = P.head, r = J.headR; g.save(); g.translate(h.x, h.y); g.rotate(P.headA + 0.08); crownShape(g, r, p[key] === 1); g.restore(); };

export function build() {
  // ---------- 管（灯る番 g ごとに、少しずつずらして連なって灯る） ----------
  const poly = (pts) => (g) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b))); };
  const star = (cx, cy, R, r) => (g) => { g.beginPath(); for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; g.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } g.closePath(); };
  const ring = (cx, cy, r) => (g) => { g.beginPath(); g.moveTo(cx, cy - r - 4); g.lineTo(cx, cy - r); g.moveTo(cx + r, cy); g.arc(cx, cy, r, 0, TAU); };   // つり下げた玉（上に小さな金具）
  const gift = (x0, y0, w, h) => (g) => { g.beginPath(); g.rect(x0, y0, w, h); g.moveTo(x0 + w / 2, y0); g.lineTo(x0 + w / 2, y0 + h); g.moveTo(x0 + w / 2, y0);
    g.bezierCurveTo(x0 + w / 2 - 10, y0 - 9, x0 + w / 2 - 12, y0 + 1, x0 + w / 2, y0); g.bezierCurveTo(x0 + w / 2 + 10, y0 - 9, x0 + w / 2 + 12, y0 + 1, x0 + w / 2, y0); };
  const swag = (a, b, c) => (g) => { g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo(b[0], b[1], c[0], c[1]); };
  const TUBES = [];
  const tube = (gr, at, col, o) => TUBES.push(Object.assign({ gr, at, col, hot: hot(col), seed: TUBES.length * 7.31 + 3, dur: 0.32, p: 0.42, t0: null, dip: null }, o));
  // 1回目：ツリーの左右の縁 → 幹 → 星（星は、なかなか点かずにジジッと粘ってから灯る）
  tube(0, 0, C.green, { path: poly([[TX, 50], [TX - 35, 98], [TX - 17, 98], [TX - 50, 146], [TX - 27, 146], [TX - 60, 196], [TX, 196]]), dur: 0.42, bz: 1 });
  tube(0, 0.12, C.green, { path: poly([[TX, 196], [TX + 60, 196], [TX + 27, 146], [TX + 50, 146], [TX + 17, 98], [TX + 35, 98], [TX, 50]]), dur: 0.4 });
  tube(0, 0.3, C.orange, { path: poly([[TX - 8, 197], [TX - 8, 214], [TX + 8, 214], [TX + 8, 197]]), dur: 0.26, bz: 0.5 });
  tube(0, 0.46, C.yellow, { path: star(TX, 38, 15, 6.5), dur: 1.15, p: 0.66, bz: 0.8, long: 1 });
  // 2回目：金のモール2本 → 玉が順に → 足もとのプレゼント
  tube(1, 0, C.gold, { path: swag([TX - 29, 110], [TX - 4, 136], [TX + 33, 122]), dur: 0.3, bz: 1 });
  tube(1, 0.1, C.gold, { path: swag([TX - 40, 158], [TX - 2, 190], [TX + 46, 172]), dur: 0.3 });
  [[TX - 12, 124, C.red], [TX + 16, 113, C.cyan], [TX - 4, 82, C.pink], [TX - 30, 176, C.purple], [TX + 25, 160, C.yellow], [TX + 1, 150, C.pink], [TX + 38, 186, C.cyan], [TX - 47, 190, C.red]]
    .forEach(([a, b, col], i) => tube(1, 0.2 + i * 0.07, col, { path: ring(a, b, 4.6), dur: 0.16, p: 0.3, bz: i === 3 ? 0.45 : 0, lw: 0.45 }));
  tube(1, 0.82, C.red, { path: gift(TX - 58, 202, 30, 21), dur: 0.3, bz: 0.6 });
  tube(1, 0.92, C.cyan, { path: gift(TX + 16, 205, 27, 18), dur: 0.62, p: 0.6, long: 1 });
  tube(1, 1.0, C.gold, { path: gift(TX + 47, 211, 17, 12), dur: 0.22 });
  // 3回目：字が1字ずつ（どこか1字が消えかけて粘る）→ 店の窓に灯りがともる
  const ctx0 = document.createElement('canvas').getContext('2d');
  const word = (text, cx, cy, size, maxW, col, gr, at0, step, stub) => { const fs = fitFont(ctx0, SCRIPT, size, text, maxW), font = SCRIPT(fs); ctx0.font = font; const tw = ctx0.measureText(text).width;
    [...text].forEach((ch, i) => tube(gr, at0 + i * step, col, { text: ch, font, x: cx - tw / 2 + ctx0.measureText(text.slice(0, i)).width, y: cy, dur: i === stub ? 0.95 : 0.24, p: i === stub ? 0.68 : 0.4, long: i === stub ? 1 : 0, bz: i === 0 ? 1 : i === stub ? 0.7 : 0 })); };
  word('Merry', 266, 84, 46, 150, C.pink, 2, 0, 0.09, 2);
  word('Christmas', 266, 136, 40, 168, C.cyan, 2, 0.55, 0.07, 6);
  const S = { step: 0, total: 4, done: false, win0: null, fr: null, mv: 0, sl: null, amb: 0, taps: 0 };
  const WIN_AT = 1.45;   // 3回目の後、窓の灯りがともるまで

  // ---------- ネオンのサンタのそり（左向き。コマ送りで動く：1秒7コマ、脚は2枚の絵を交互に） ----------
  const SLEIGH = [
    { col: C.red, path: (g) => { g.beginPath(); g.moveTo(54, 12); g.lineTo(4, 12); g.quadraticCurveTo(-7, 12, -6, 2); g.moveTo(16, 12); g.lineTo(16, 6); g.moveTo(42, 12); g.lineTo(42, 6);
      g.moveTo(6, 6); g.quadraticCurveTo(0, -4, 8, -10); g.lineTo(30, -5); g.quadraticCurveTo(46, -5, 48, -17); g.quadraticCurveTo(56, -4, 50, 6); g.closePath(); } },
    { col: C.white, path: (g) => { g.beginPath(); g.moveTo(31.5, -22); g.arc(26, -22, 5.5, 0, TAU); g.moveTo(21, -19); g.quadraticCurveTo(26, -10, 31, -19); g.moveTo(18, -9); g.quadraticCurveTo(26, -17, 35, -9); } },
    { col: C.red, path: (g) => { g.beginPath(); g.moveTo(20, -25); g.lineTo(32, -25); g.lineTo(38, -33); g.closePath(); g.moveTo(41.2, -33); g.arc(39.6, -33, 1.6, 0, TAU); } },
    { col: C.gold, path: (g) => { g.beginPath(); g.moveTo(4, -6); g.quadraticCurveTo(-12, -1, -27, -9); } },
    { col: C.amber, path: (g, f) => { g.beginPath(); g.ellipse(-40, -8, 12, 5.5, 0, 0, TAU); g.moveTo(-50, -11); g.lineTo(-56, -19); g.moveTo(-55.4, -20); g.arc(-59, -20, 3.6, 0, TAU);
      g.moveTo(-58, -23.5); g.lineTo(-56, -31); g.lineTo(-51, -35); g.moveTo(-56, -31); g.lineTo(-61, -36); g.moveTo(-28, -10); g.lineTo(-24, -14);
      for (const [a, b, c2, d] of f ? [[-48, -4, -44, 3], [-44, -4, -40, 4], [-34, -4, -38, 5], [-30, -4, -34, 4]] : [[-48, -4, -55, 4], [-44, -4, -47, 5], [-34, -4, -30, 5], [-30, -4, -23, 3]]) { g.moveTo(a, b); g.lineTo(c2, d); } } },
    { col: C.red, path: (g) => { g.beginPath(); g.moveTo(-61.2, -19); g.arc(-62.8, -19, 1.6, 0, TAU); } },
  ];
  const SL_N = 19, SL_D = 2.7;
  const slAt = (t) => { if (S.sl == null) return null; const u = (t - S.sl) / SL_D; if (u < 0 || u >= 1) return null; const k = Math.floor(u * SL_N), q = (k + 0.5) / SL_N, rise = q > 0.58 ? Math.pow((q - 0.58) / 0.42, 2) : 0;
    return { x: 410 - 290 * q, y: 34 + 3 * Math.sin(k * 1.9) - 120 * rise, a: -0.5 * rise, f: k % 2, fresh: u * SL_N - k < 0.35 }; };
  const slPut = (g, s, fn) => { g.save(); g.translate(s.x, s.y); g.rotate(s.a); g.scale(0.88, 0.88); fn(); g.restore(); };

  // ---------- 明るさ：点く時のつまずき・ときどきの消えかけ（MV の street.js の flicker と同じ考え） ----------
  function bri(T, t) {
    if (T.t0 == null || t < T.t0) return 0; const u = t - T.t0; let b = 1;
    if (u < T.dur) { const k = Math.floor(u / 0.045); b = hash(k * 7.13 + T.seed) > T.p ? 0.35 + 0.65 * hash(k * 3.7 + T.seed + 1) : 0.05; if (T.long && u > T.dur - 0.12) b = 1; }
    if (T.dip != null) { const v = t - T.dip; if (v >= 0 && v < T.dipD) { const k = Math.floor(v / 0.04), h = hash(k * 1.7 + T.dseed); b *= h < 0.5 ? 0.06 + 0.25 * h : 0.7 + 0.3 * h; } }
    return b;
  }
  const winA = (t) => { if (S.win0 == null || t < S.win0) return 0; const u = t - S.win0; return u < 0.18 ? (Math.floor(u / 0.05) % 2 ? 0.25 : 0.7) : ease((u - 0.1) / 0.45); };   // 白熱灯：ちらっとして、ふわっと明るく

  // ---------- 下地（動かない物は一度だけ描いて貼る） ----------
  // レンガの地の色（明るいまま。光の地図を掛けると、照らされた所だけこの色が見える）。欠け・ひび・雨だれ・白華（基準：レンガの壁は地の色を別に作って光を掛ける）
  const albedo = (x) => {
    let s = 11; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    x.fillStyle = '#6a5a52'; x.fillRect(0, 0, W, WALK);
    for (let row = 0; row * 17 < WALK; row++) for (let k = -1; k * 40 < W + 40; k++) { const bx = k * 40 + (row % 2) * 20 + 1.2, by = row * 17 + 1.2, v = r(), w = r();
      x.fillStyle = `rgb(${Math.round(160 + v * 45 - w * 30)},${Math.round(78 + v * 24 - w * 12)},${Math.round(58 + v * 14)})`; x.beginPath(); x.roundRect(bx, by, 37.6, 14.6, 1.6); x.fill();
      x.fillStyle = 'rgba(40,14,6,.18)'; x.fillRect(bx, by + 11, 37.6, 3.6);
      if (r() < 0.22) { x.fillStyle = '#6a5a52'; const cx = r() < 0.5 ? bx : bx + 37.6, cy = r() < 0.5 ? by : by + 14.6, z = 3 + r() * 4; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + (cx > bx + 2 ? -z : z), cy); x.lineTo(cx, cy + (cy > by + 2 ? -z * 0.7 : z * 0.7)); x.fill(); }   // 欠け
      if (r() < 0.12) { x.strokeStyle = 'rgba(30,10,4,.4)'; x.lineWidth = 0.7; x.beginPath(); const sx = bx + 6 + r() * 26; x.moveTo(sx, by + 1); x.lineTo(sx + 3 - r() * 6, by + 7); x.lineTo(sx + 2 - r() * 4, by + 14); x.stroke(); } }   // ひび
    for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.6 ? 'rgba(30,10,4,.2)' : 'rgba(255,220,190,.14)'; x.fillRect(r() * W, r() * WALK, 1 + r(), 1 + r()); }
    for (let i = 0; i < 9; i++) { const sx = r() * W, sw = 4 + r() * 10, g = x.createLinearGradient(0, 0, 0, 120 + r() * 120); g.addColorStop(0, 'rgba(20,10,6,.28)'); g.addColorStop(1, 'rgba(20,10,6,0)'); x.fillStyle = g; x.fillRect(sx, 0, sw, 240); }   // 雨だれ
    { const g = x.createLinearGradient(0, WALK - 60, 0, WALK); g.addColorStop(0, 'rgba(235,230,220,0)'); g.addColorStop(1, 'rgba(235,230,220,.32)'); x.fillStyle = g; x.fillRect(0, WALK - 60, W, 60); }   // 白華（下のほうが白っぽい）
    x.fillStyle = '#16120f'; x.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);   // 窓のガラス（光を受けても照らない）
    x.fillStyle = '#4a2c1c'; x.fillRect(WX0 - 7, WY0 - 7, WX1 - WX0 + 14, 7); x.fillRect(WX0 - 7, WY0, 7, WY1 - WY0); x.fillRect(WX1, WY0, 7, WY1 - WY0);   // 窓わく
    x.fillStyle = '#5a3a26'; x.fillRect(WX0 - 12, WY1, WX1 - WX0 + 24, 7);   // 窓の下の台
    x.fillStyle = '#2a2a30'; x.fillRect(22, 232, 20, 15); x.strokeStyle = '#1a1a1e'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(42, 238); x.quadraticCurveTo(64, 232, TX - 6, 214); x.stroke();   // 変圧器の箱と電線（ネオンの電気の元）
    { const g = x.createLinearGradient(0, WALK, 0, H); g.addColorStop(0, '#9a9aa6'); g.addColorStop(1, '#6a6a76'); x.fillStyle = g; x.fillRect(0, WALK, W, H - WALK); }   // 歩道
    snow(x, '#f4f8ff');
  };
  // 積もった雪（歩道の壁ぎわ・窓の台・窓わくの上）とつらら
  function snow(x, col) { x.fillStyle = col; let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const lump = (x0, x1, y, h) => { x.beginPath(); x.moveTo(x0, y + 2); for (let a = x0; a <= x1; a += 6) x.quadraticCurveTo(a + 3, y - h * (0.6 + 0.6 * r()), a + 6, y + 0.5); x.lineTo(x1, y + 3); x.closePath(); x.fill(); };
    lump(-4, W + 4, WALK + 1, 6); lump(WX0 - 13, WX1 + 13, WY1, 4); lump(WX0 - 8, WX1 + 8, WY0 - 7, 3); lump(18, 46, 232, 3);
    for (let a = WX0 - 6; a < WX1 + 8; a += 9 + r() * 7) { const l = 3 + r() * 8; x.beginPath(); x.moveTo(a - 1.6, WY1 + 7); x.lineTo(a + 1.6, WY1 + 7); x.lineTo(a, WY1 + 7 + l); x.closePath(); x.fill(); } }
  const alb = layer(albedo);
  const trace = (g, T, glow) => { if (T.text) { g.font = T.font; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(T.text, T.x, T.y); if (glow) g.strokeText(T.text, T.x, T.y); } else { T.path(g); g.stroke(); } };
  const bg = layer((x) => {
    x.drawImage(alb, 0, 0, W, H); x.globalCompositeOperation = 'multiply'; x.fillStyle = '#2a2838'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';   // 夜の暗さ（地の色に、暗い藍を掛ける）
    const v = x.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 270); v.addColorStop(0, 'rgba(8,6,14,0)'); v.addColorStop(1, 'rgba(8,6,14,.6)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
    { const g = x.createLinearGradient(WX0, WY0, WX1, WY1); g.addColorStop(0, 'rgba(160,180,220,.10)'); g.addColorStop(0.45, 'rgba(160,180,220,0)'); g.addColorStop(0.62, 'rgba(160,180,220,.06)'); x.fillStyle = g; x.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0); }   // 消えた窓のガラスの映り
    x.lineCap = x.lineJoin = 'round';
    x.save(); x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 4; x.shadowOffsetX = 2.5; x.shadowOffsetY = 4; x.strokeStyle = x.fillStyle = 'rgba(30,24,28,.9)'; x.lineWidth = 3.4; for (const T of TUBES) trace(x, T, false); x.restore();   // 管の影
    for (const T of TUBES) { x.strokeStyle = x.fillStyle = 'rgba(210,220,235,.16)'; x.lineWidth = 4.4; trace(x, T, false); x.strokeStyle = x.fillStyle = T.col + '30'; x.lineWidth = 2.4; trace(x, T, false); }   // 消えている管のガラス
    snow(x, '#7e86a2');   // 夜の雪（月あかりの青灰。窓の灯りが当たると、光の地図で白く照る）
    x.fillStyle = '#3a3a42'; for (const [a, b] of [[TX, 52], [TX - 50, 146], [TX + 50, 146], [TX - 58, 194], [TX + 58, 194], [TX, 214], [TX - 43, 222], [TX + 30, 222]]) x.fillRect(a - 1.6, b - 1.6, 3.2, 3.2);   // 管の留め金
  });
  // 窓の中（灯りがともってから）：奥の壁・リース・小さなツリー・電球の飾り → 仲間 → カウンターとケーキ
  const roomBack = layer((x) => {
    x.save(); x.beginPath(); x.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); x.clip();
    const g = x.createLinearGradient(0, WY0, 0, WY1); g.addColorStop(0, '#ffdca6'); g.addColorStop(0.6, '#f2a862'); g.addColorStop(1, '#c87a3e'); x.fillStyle = g; x.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0);
    for (let a = WX0 + 3; a < WX1; a += 10) { x.fillStyle = 'rgba(190,96,40,.12)'; x.fillRect(a, WY0, 3.5, WY1 - WY0); }   // 壁紙のしま
    { const cx = 298, cy = 191; for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; x.fillStyle = i % 2 ? '#2f7a3e' : '#3e9a50'; x.beginPath(); x.arc(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 3.4, 0, TAU); x.fill(); }
      x.fillStyle = '#e8283a'; x.beginPath(); x.moveTo(cx, cy + 8); x.lineTo(cx - 6, cy + 4); x.lineTo(cx - 6, cy + 11); x.closePath(); x.moveTo(cx, cy + 8); x.lineTo(cx + 6, cy + 4); x.lineTo(cx + 6, cy + 11); x.closePath(); x.fill();
      for (const [a, b] of [[-6, -5], [5, -6], [7, 3]]) { x.beginPath(); x.arc(cx + a, cy + b, 1.4, 0, TAU); x.fill(); } }   // リース
    { const cx = 336, b = CNT; for (const [w, y0, h, col] of [[11, b - 14, 15, '#2f8a4a'], [9, b - 25, 14, '#3aa45a'], [6.5, b - 35, 12, '#4ab866']]) { x.fillStyle = col; x.beginPath(); x.moveTo(cx - w, y0 + h); x.lineTo(cx + w, y0 + h); x.lineTo(cx, y0); x.closePath(); x.fill(); }
      x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(cx, b - 36, 2.4, 0, TAU); x.fill(); for (const [a, c2, col] of [[-5, -6, '#ff5a6a'], [4, -12, '#5ad0ff'], [-3, -19, '#ffd23a'], [5, -24, '#ff8ad0'], [-7, -3, '#ffd23a']]) { x.fillStyle = col; x.beginPath(); x.arc(cx + a, b + c2, 1.5, 0, TAU); x.fill(); } }   // 小さなツリー
    x.strokeStyle = '#2a1a10'; x.lineWidth = 0.9; x.beginPath(); x.moveTo(WX0, WY0 + 4); x.quadraticCurveTo((WX0 + WX1) / 2 - 40, WY0 + 16, (WX0 + WX1) / 2, WY0 + 5); x.quadraticCurveTo((WX0 + WX1) / 2 + 40, WY0 + 16, WX1, WY0 + 4); x.stroke();
    for (let i = 0; i <= 10; i++) { const u = i / 10, half = u < 0.5 ? u * 2 : (u - 0.5) * 2, bx = WX0 + (WX1 - WX0) * u, by = WY0 + 4.5 + 9 * 4 * half * (1 - half), col = ['#ff5a6a', '#ffd23a', '#5ad0ff', '#7aff9a', '#ff8ad0'][i % 5];
      const gl = x.createRadialGradient(bx, by + 3, 0, bx, by + 3, 8); gl.addColorStop(0, col + 'aa'); gl.addColorStop(1, col + '00'); x.fillStyle = gl; x.fillRect(bx - 8, by - 5, 16, 16); x.fillStyle = col; x.beginPath(); x.ellipse(bx, by + 3, 1.8, 2.6, 0, 0, TAU); x.fill(); }   // 電球の飾り
    x.restore(); });
  const roomFront = layer((x) => {
    x.save(); x.beginPath(); x.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); x.clip();
    x.fillStyle = '#7a4424'; x.fillRect(WX0, CNT, WX1 - WX0, WY1 - CNT); x.fillStyle = '#a8653a'; x.fillRect(WX0, CNT, WX1 - WX0, 3); x.fillStyle = 'rgba(40,16,4,.3)'; for (let a = WX0 + 20; a < WX1; a += 36) x.fillRect(a, CNT + 5, 1.5, WY1 - CNT - 5);   // カウンター
    const cx = 263; x.fillStyle = '#e8e4ec'; x.beginPath(); x.ellipse(cx, CNT, 19, 3, 0, 0, TAU); x.fill();   // お皿
    x.fillStyle = '#fff6ee'; x.beginPath(); x.roundRect(cx - 14, CNT - 13, 28, 13, 3); x.fill(); x.beginPath(); x.roundRect(cx - 9, CNT - 22, 18, 10, 3); x.fill();
    x.fillStyle = '#f2a0b8'; x.beginPath(); for (let a = -14; a <= 14; a += 4.6) x.arc(cx + a, CNT - 12, 2.1, 0, Math.PI); x.fill(); x.fillStyle = '#e8283a'; for (const a of [-6, 0, 6]) { x.beginPath(); x.arc(cx + a, CNT - 23, 2.2, 0, TAU); x.fill(); }   // クリームのふちといちご
    x.fillStyle = '#fff'; x.fillRect(cx - 1, CNT - 31, 2, 8); x.fillStyle = '#ffcf3a'; x.beginPath(); x.ellipse(cx, CNT - 33.5, 1.8, 3, 0, 0, TAU); x.fill();   // ろうそく
    x.restore(); });
  const sheen = layer((x) => { const g = x.createLinearGradient(WX0, WY0, WX0 + 70, WY0 + 90); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.08)'); g.addColorStop(0.62, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0); });

  // ---------- 光の地図とにじみ（小さい紙に描いて引きのばす） ----------
  const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const [LM, lm] = cv(90, 75), [TI, ti] = cv(24, 20), [LT, lt] = cv(180, 150), [G2, g2] = cv(180, 150), [LF, lf] = cv(alb.width, alb.height);   // LF＝光×レンガの色を、レンガの細かさのまま掛ける紙
  function lights(g, vis, sl, wa, w, withWin) {
    g.lineCap = g.lineJoin = 'round';
    for (const [T, b] of vis) { g.globalAlpha = Math.min(1, b) * (T.text ? 0.6 : 1); g.strokeStyle = g.fillStyle = T.col; g.lineWidth = w * (T.text ? 0.4 : T.lw || 1); trace(g, T, true); }   // 字は管が密なので、光は細く弱く（太いと字の形の四角い光の板になった）
    if (sl) for (const P of SLEIGH) slPut(g, sl, () => { g.globalAlpha = 1; g.strokeStyle = P.col; g.lineWidth = w / 0.88; P.path(g, sl.f); g.stroke(); });
    if (withWin && wa > 0) { g.globalAlpha = wa * 0.6; g.fillStyle = '#ffb066'; g.fillRect(WX0, WY0, WX1 - WX0, WY1 - WY0); g.globalAlpha = wa * 0.14; g.beginPath(); g.moveTo(WX0 - 4, WY1 + 4); g.lineTo(WX1 + 4, WY1 + 4); g.lineTo(WX1 + 40, H); g.lineTo(WX0 - 40, H); g.fill(); }
    g.globalAlpha = 1;
  }
  function wallLight(x, vis, sl, wa) {
    lm.setTransform(1, 0, 0, 1, 0, 0); lm.globalCompositeOperation = 'source-over'; lm.fillStyle = '#000'; lm.fillRect(0, 0, 90, 75);
    lm.setTransform(90 / W, 0, 0, 75 / H, 0, 0); lm.globalCompositeOperation = 'lighter'; lights(lm, vis, sl, wa, 10, true);
    ti.globalCompositeOperation = 'copy'; ti.drawImage(LM, 0, 0, 24, 20);
    lt.globalCompositeOperation = 'copy'; lt.drawImage(LM, 0, 0, 180, 150); lt.globalCompositeOperation = 'lighter'; lt.drawImage(TI, 0, 0, 180, 150); lt.drawImage(TI, 0, 0, 180, 150);
    lf.globalCompositeOperation = 'copy'; lf.drawImage(LT, 0, 0, LF.width, LF.height); lf.globalCompositeOperation = 'multiply'; lf.drawImage(alb, 0, 0);   // 光の地図はぼかしたまま、レンガの色はくっきり（小さい紙で掛けると、レンガが四角いにじみになった）
    x.save(); x.globalCompositeOperation = 'lighter'; x.drawImage(LF, 0, 0, W, H); x.globalAlpha = 0.6; x.drawImage(LF, 0, 0, W, H); x.restore();
  }
  function halo(x, vis, sl) {
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.clearRect(0, 0, 180, 150); g2.setTransform(0.5, 0, 0, 0.5, 0, 0); g2.globalCompositeOperation = 'lighter'; lights(g2, vis, sl, 0, 5.5, false);
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.75; x.drawImage(G2, 0, 0, W, H); x.globalAlpha = 0.22; x.drawImage(TI, 0, 0, W, H); x.restore();
  }
  function cores(x, vis, sl, t) {
    x.save(); x.lineCap = x.lineJoin = 'round';
    for (const [T, b] of vis) { const a = Math.min(1, b); x.globalAlpha = a; x.strokeStyle = x.fillStyle = T.col; x.lineWidth = 3.4; trace(x, T, false);
      x.globalCompositeOperation = 'lighter'; x.globalAlpha = a * (T.text ? 0.55 : 0.9); x.strokeStyle = x.fillStyle = T.hot; x.lineWidth = 1.4; trace(x, T, false); x.globalCompositeOperation = 'source-over'; }
    if (sl) for (const P of SLEIGH) slPut(x, sl, () => { x.globalAlpha = sl.fresh ? 0.75 : 1; x.strokeStyle = P.col; x.lineWidth = 3.2 / 0.88; P.path(x, sl.f); x.stroke(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = hot(P.col); x.lineWidth = 1.3 / 0.88; P.path(x, sl.f); x.stroke(); x.globalCompositeOperation = 'source-over'; });
    if (sl && sl.fresh && S.sl != null) { const pv = slAt(t - 1 / 7); if (pv) for (const P of SLEIGH) slPut(x, pv, () => { x.globalAlpha = 0.22; x.strokeStyle = P.col; x.lineWidth = 2.6 / 0.88; P.path(x, pv.f); x.stroke(); }); }   // 1つ前のコマの管が、消えきる前に少し残る
    x.restore();
  }

  // ---------- MV の仲間（窓の中・カウンターの向こう） ----------
  let GR = null, M = null, CAST = null; const SC = 0.58;
  const ready = loadMV(['gingerrig.js', 'hiphop_moves.js'], { 'gingerrig.js': 'GR', 'hiphop_moves.js': 'MV_MOVES' }, { bpm: 92.8 }).then((L) => { GR = L.GR; M = L.MV_MOVES;
    CAST = [
      { x: 208, y: CNT + 92 * SC, turn: 0.25, girl: 1, ch: GR.make('adult', { girl: true, cookie: '#c98a4a', edge: '#87491f', buttons: ['#ff5aa0', '#ffd23a', '#5ad0ff'], hooks: { head: beanie('#e8283a', '#ffffff', '#ffffff') } }) },   // ニーナ（赤いニット帽）
      { x: 242, y: CNT + 92 * SC, turn: 0.1, ch: GR.make('adult', { cookie: '#b87a3c', edge: '#764016', buttons: ['#2fbf6a', '#ffd23a', '#2fbf6a'], hooks: { head: beanie('#2a7a4a', '#d8f0e0', '#ffffff') } }) },   // サム（緑のニット帽）
      { x: 281, y: CNT + 92 * SC, turn: -0.15, girl: 1, ch: GR.make('adult', { girl: true, bow: '#e8283a', cookie: '#d29858', edge: '#94552a', buttons: ['#ff9ad0', '#ffffff', '#ff9ad0'] }) },   // マヤ（赤いリボン）
      { x: 317, y: CNT + 4 + 62 * SC, turn: -0.3, kid: 1, ch: GR.make('kid', { cookie: '#cc8e4e', edge: '#8a4c22', buttons: ['#5ad0ff', '#ffd23a'], hooks: { head: crown('crown') } }) },   // 王冠の男の子
    ]; });
  const MOVES = ['wave', 'cheer', 'clapUp', 'raise'], MV_D = 2.8;
  function pose(c, i, t) {
    const J = c.ch.J, p = Object.assign({}, GR.REST, { t, crown: 1, turn: c.turn, smile: 1 }); M.stance(p, J, { girl: c.girl });
    M.hand(p, J, 1, -17, 3, 'down'); M.hand(p, J, -1, 17, 3, 'down');   // 両手をカウンターに
    const f = S.fr; if (!f) return { p, dy: 0 };
    const u = t - f.t0 - i * 0.1, rise = f.move === 'rise', dy = rise ? 64 * (1 - spring(clamp((u + 0.05) / 0.75, 0, 1))) : 0;
    const v = rise ? u - 0.55 : u, mv = rise ? 'wave' : f.move, k = clamp(Math.min(v / 0.25, (MV_D - v) / 0.45), 0, 1);
    if (v > 0 && k > 0) { const q = Object.assign({}, GR.REST, { t, crown: 1, turn: c.turn * 0.4, smile: 1 }); M.groove(q, J, v * 2, 0.5, c.girl);
      const m = { bp: v * (mv === 'clapUp' ? 2.2 : 1.8) + i * 0.2, u: clamp(v / 0.7, 0, 1) }; M.U[mv](q, J, m); q.mouth = mv === 'clapUp' ? 0.35 + 0.3 * Math.abs(Math.sin(v * 7)) : 0.55;
      for (const key in q) if (typeof q[key] === 'number' && typeof p[key] === 'number') p[key] += (q[key] - p[key]) * k; else if (!(key in p)) p[key] = q[key]; }
    return { p, dy };
  }
  const frBusy = (t) => S.fr && t - S.fr.t0 < (S.fr.move === 'rise' ? 0.55 : 0) + MV_D + 0.4;
  // 仲間は1秒15コマ（MV と同じ。紙の人形らしいコマ送り）で紙に描いて残し、間のコマはその紙を貼る。止まった後は、最後の紙を貼るだけ
  const [FC, fc] = cv(8, 8); let fcKey = '';
  function friends(x, t, dev) {
    if (!CAST || !S.fr) return;
    const live = frBusy(t), f = live ? Math.floor((t - S.fr.t0) * 15) : 'end', key = S.fr.move + S.fr.t0 + '|' + dev + '|' + f;
    if (fcKey !== key) { const w = Math.round(W * dev), h = Math.round(H * dev); if (FC.width !== w || FC.height !== h) { FC.width = w; FC.height = h; }
      fc.setTransform(1, 0, 0, 1, 0, 0); fc.clearRect(0, 0, w, h); fc.setTransform(dev, 0, 0, dev, 0, 0); const tf = live ? S.fr.t0 + (f + 0.5) / 15 : t;
      CAST.forEach((c, i) => { const { p, dy } = pose(c, i, tf); GR.draw(fc, c.ch, p, { x: c.x, y: c.y + dy, sc: SC, k: dev }); }); fcKey = key; }
    x.drawImage(FC, 0, 0, W, H);
  }

  return { S, ready, snow: { n: 26, size: 2.4 },
    draw(x, t) {
      const dev = Math.abs(x.getTransform().a) || 1, vis = [], sl = slAt(t), wa = winA(t);
      for (const T of TUBES) { const b = bri(T, t); if (b > 0.01) vis.push([T, b]); }
      x.drawImage(bg, 0, 0, W, H);
      wallLight(x, vis, sl, wa);
      if (wa > 0) { x.save(); x.beginPath(); x.rect(WX0, WY0, WX1 - WX0, WY1 - WY0); x.clip(); x.globalAlpha = wa; x.drawImage(roomBack, 0, 0, W, H); friends(x, t, dev); x.drawImage(roomFront, 0, 0, W, H); x.globalAlpha = 1; x.drawImage(sheen, 0, 0, W, H); x.restore(); }
      halo(x, vis, sl); cores(x, vis, sl, t);
    },
    busy: (t) => TUBES.some((T) => (T.t0 != null && t < T.t0 + T.dur + 0.05) || (T.dip != null && t < T.dip + T.dipD + 0.05)) || (S.win0 != null && t < S.win0 + 0.6) || frBusy(t) || (S.sl != null && t < S.sl + SL_D + 0.2),
    tap(t, sfx) {
      const buzz = (v, d) => setTimeout(() => sfx.buzz && sfx.buzz(v), d * 1000);
      if (S.step < S.total) {
        const gr = S.step++;
        for (const T of TUBES) if (T.gr === gr) { T.t0 = t + T.at; if (T.bz) { buzz(T.bz, T.at); if (T.long) { buzz(0.4, T.at + T.dur * 0.4); buzz(0.55, T.at + T.dur * 0.8); } } }
        if (gr === 2) S.win0 = t + WIN_AT;
        if (gr === 3) { S.done = true; S.fr = { t0: t + 0.1, move: 'rise' }; S.sl = t + 0.5; setTimeout(() => sfx.jingle && sfx.jingle(), 500); }
        S.amb = t + 4;
      } else {   // 全部灯った後：仲間が次の振り・管がいくつか消えかける・2回に1回そりがまた駆ける
        S.fr = { t0: t, move: MOVES[S.mv++ % MOVES.length] };
        const lit = TUBES.filter((T) => t > T.t0 + T.dur); for (let i = 0; i < 3 && lit.length; i++) { const T = lit[Math.floor(Math.random() * lit.length)]; T.dip = t + i * 0.12; T.dipD = 0.3 + Math.random() * 0.3; T.dseed = Math.random() * 99; }
        buzz(0.55, 0); if (S.taps++ % 2 === 1 && !(S.sl != null && t < S.sl + SL_D)) { S.sl = t + 0.15; setTimeout(() => sfx.jingle && sfx.jingle(), 150); }
      }
    },
    ambient(t, sfx) {   // 灯っている管が、ときどき消えかけて、また点く（3〜8秒に1回・小さなジジッ）
      if (!S.step || t < S.amb) return false; S.amb = t + 3 + Math.random() * 5;
      const lit = TUBES.filter((T) => T.t0 != null && t > T.t0 + T.dur && !(T.dip != null && t < T.dip + T.dipD)); if (!lit.length) return false;
      for (let i = 0, n = Math.random() < 0.3 ? 2 : 1; i < n; i++) { const T = lit[Math.floor(Math.random() * lit.length)]; T.dip = t + i * 0.15; T.dipD = 0.22 + Math.random() * 0.4; T.dseed = Math.random() * 99; }
      if (sfx.buzz) sfx.buzz(0.25); return true;
    } };
}
