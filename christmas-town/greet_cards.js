// グリーティングカードの3つの絵（本人 2026-10-31「クリックで動く素朴なカードを3種類。3つのMVに合わせて、ネオン、ソーイング、セロハン絵で」）
// 触るたびに動きがひとつ進み、最後に小さなお楽しみ。送り手のひとことは、絵の下の字（カードのページ）で最初から読める
//   neon ＝ヒップホップ「テーブルに集まれ！」：夜のレンガの壁に、ネオンが1本ずつ灯る → 全部灯ると、窓に仲間の影が並んで手を振る
//   sew  ＝フォーク「きみといる、それがクリスマス」：フェルトの布に、針がちくちく「Merry Christmas」を刺しゅう → クッキーがクマに金のボタンを縫い付ける
//   cello＝ゴスペル「グローリー・グローリー！」：琥珀の灯りの前で、色セロハンの聖歌隊が1人ずつ起き上がる（重なりの色が混ざる）→ 鐘が鳴り、ステンドグラスが灯る
// 描くのは、触った後の動きの間だけ（止まっている間は描かない。スマホは1秒30コマまで）。字は端末の字で描く（絵に焼かない）
export const DESIGNS = {
  neon: { name: 'ネオン', song: 'hiphop', note: '夜の壁に、ネオンが1本ずつ灯る', hint: 'さわると、ネオンが1本ずつ灯るよ' },
  sew: { name: 'ソーイング', song: 'folk', note: 'フェルトに、ちくちく刺しゅう', hint: 'さわると、ちくちく刺しゅうが進むよ' },
  cello: { name: 'セロハン', song: 'gospel', note: '影絵の聖歌隊が、1人ずつ起き上がる', hint: 'さわると、聖歌隊が1人ずつ起き上がるよ' },
};
export const pickDesign = (dz) => (DESIGNS[dz] ? dz : Object.keys(DESIGNS)[Math.floor(Math.random() * 3)]);   // 指定が無い・「開くたびにランダム」
const W = 360, H = 300, TAU = Math.PI * 2, TEXT = 'Merry Christmas';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (u) => 1 - Math.pow(1 - clamp(u, 0, 1), 3);
const spring = (u) => { u = clamp(u, 0, 1); return 1 - Math.exp(-6 * u) * Math.cos(9 * u); };   // 起き上がる時の、少し行きすぎて戻る動き
// 動かない絵は、一度だけ別の紙（2倍の細かさ）に描いておく
function layer(draw) { const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2); draw(x); return c; }
const fitFont = (x, font, size, text, maxW) => { x.font = font(size); const w = x.measureText(text).width; if (w > maxW) { size *= maxW / w; x.font = font(size); } return size; };

// ---------- ネオン ----------
function neon() {
  const SCRIPT = (s) => `italic 700 ${s}px "Segoe Script",cursive`, TX = 95;
  const bg = layer((x) => { x.fillStyle = '#1b1016'; x.fillRect(0, 0, W, H);
    for (let r = 0; r * 18 < H; r++) for (let k = -1; k * 44 < W; k++) { const v = ((r * 7 + k * 13 + 50) % 5) / 5; x.fillStyle = `rgb(${58 + v * 18},${30 + v * 9},${34 + v * 9})`; x.fillRect(k * 44 + (r % 2) * 22 + 1.5, r * 18 + 1.5, 41, 15); }
    const gr = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 260); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); });
  const poly = (pts) => (x) => { x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); };
  const star = (cx, cy, R, r) => (x) => { x.beginPath(); for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); };
  const dots = (list) => (x) => { x.beginPath(); for (const [a, b] of list) { x.moveTo(a + 5, b); x.arc(a, b, 5, 0, TAU); } };
  const T = [   // 灯る順
    { col: '#3dff8e', path: poly([[TX, 50], [TX - 35, 98], [TX - 17, 98], [TX - 50, 146], [TX - 27, 146], [TX - 60, 196], [TX, 196]]) },
    { col: '#3dff8e', path: (x) => { poly([[TX, 196], [TX + 60, 196], [TX + 27, 146], [TX + 50, 146], [TX + 17, 98], [TX + 35, 98], [TX, 50]])(x); x.moveTo(TX - 8, 197); x.lineTo(TX - 8, 214); x.lineTo(TX + 8, 214); x.lineTo(TX + 8, 197); } },
    { col: '#ffe24a', path: star(TX, 40, 15, 6.5) },
    { col: '#ff6ec4', path: dots([[TX - 12, 122], [TX + 16, 112], [TX - 26, 172], [TX + 22, 164], [TX + 2, 146]]) },
    { col: '#ff4fae', text: 'Merry', y: 88, size: 46 },
    { col: '#41e2ff', text: 'Christmas', y: 142, size: 40 },
  ];
  const PAL = ['#3dff8e', '#ffe24a', '#ff6ec4', '#41e2ff', '#ff9d3d'];
  const S = { step: 0, total: T.length, done: false, on: [], win: -1, hue: 0, flash: -1 };
  const alpha = (t0, t) => { const u = t - t0; if (t0 == null || u < 0) return 0; if (u > 0.5) return 1; const f = Math.sin(u * 90) * Math.sin(u * 37 + 1.3); return u > 0.35 ? 0.85 + 0.15 * f : f > 0.1 ? 1 : 0.12; };
  function shape(x, D, fill) { if (D.text) { x.font = SCRIPT(D.fs); x.textAlign = 'center'; x.textBaseline = 'middle'; fill ? x.fillText(D.text, 262, D.y) : x.strokeText(D.text, 262, D.y); } else { D.path(x); x.stroke(); } }
  const ctx0 = document.createElement('canvas').getContext('2d'); for (const D of T) if (D.text) D.fs = fitFont(ctx0, SCRIPT, D.size, D.text, 168);
  function tube(x, k, a) { const D = T[k], col = S.hue ? PAL[(k + S.hue) % PAL.length] : D.col; x.save(); x.lineJoin = x.lineCap = 'round';
    x.strokeStyle = x.fillStyle = 'rgba(255,255,255,.13)'; x.lineWidth = 4; shape(x, D, !!D.text);   // 消えている時も見える、ガラスの管
    if (a > 0.01) { x.globalAlpha = a; x.shadowColor = col; x.shadowBlur = 18; x.strokeStyle = x.fillStyle = col; x.lineWidth = 4.2; shape(x, D, !!D.text); shape(x, D, !!D.text);
      x.shadowBlur = 0; x.globalAlpha = a * 0.75; x.strokeStyle = x.fillStyle = '#ffffff'; x.lineWidth = 1.4; if (!D.text) shape(x, D, false); }
    x.restore(); }
  function win(x, t) { const L = 196, Tp = 176, R = 338, B = 264, u = S.win < 0 ? 0 : ease((t - S.win) / 0.6);
    x.fillStyle = '#100a0c'; x.fillRect(L, Tp, R - L, B - Tp);
    if (u > 0) { const g = x.createLinearGradient(0, Tp, 0, B); g.addColorStop(0, '#ffd98a'); g.addColorStop(1, '#ff9a4a'); x.globalAlpha = u; x.fillStyle = g; x.fillRect(L, Tp, R - L, B - Tp); x.globalAlpha = 1;
      const rise = ease((t - S.win - 0.3) / 0.5), wave = t - S.win < 4.2 ? Math.sin((t - S.win) * 10) : 0; x.save(); x.beginPath(); x.rect(L, Tp, R - L, B - Tp); x.clip(); x.fillStyle = '#2a140c';
      [214, 246, 278, 310].forEach((px, i) => { const hy = B + 6 - 46 * rise; x.beginPath(); x.arc(px, hy, 11, 0, TAU); x.fill(); x.beginPath(); x.ellipse(px, hy + 26, 18, 14, 0, Math.PI, TAU); x.fill();
        if (i === 0 || i === 3) { const s = i ? 1 : -1; x.beginPath(); x.arc(px + s * 17, hy - 8 + wave * 5, 5, 0, TAU); x.fill(); x.fillRect(px + s * 13 - 2, hy - 6 + wave * 3, 5, 16); } });
      x.restore(); }
    x.strokeStyle = '#3a2216'; x.lineWidth = 4; x.strokeRect(L, Tp, R - L, B - Tp); x.lineWidth = 3; x.beginPath(); x.moveTo((L + R) / 2, Tp); x.lineTo((L + R) / 2, B); x.stroke(); }
  return { S,
    draw(x, t) { x.drawImage(bg, 0, 0, W, H); win(x, t); const fl = S.flash >= 0 && t - S.flash < 0.3 ? (Math.sin((t - S.flash) * 80) > 0 ? 1 : 0.35) : 1; for (let k = 0; k < T.length; k++) tube(x, k, alpha(S.on[k], t) * fl); },
    busy: (t) => S.on.some((t0) => t - t0 < 0.55) || (S.win >= 0 && t - S.win < 4.3) || (S.flash >= 0 && t - S.flash < 0.35),
    tap(t, sfx) { if (S.step < S.total) { S.on[S.step++] = t; if (sfx.buzz) sfx.buzz(); if (S.step === S.total) { S.done = true; S.win = t + 0.55; setTimeout(() => sfx.jingle && sfx.jingle(), 550); } }
      else { S.hue = (S.hue + 1) % PAL.length; S.flash = t; if (sfx.buzz) sfx.buzz(); } } };
}

// ---------- ソーイング ----------
function sew() {
  // 字は線の細い筆記体＝糸1本が線そのもの（太い字を塗って点線を重ねると「ゼブラみたい」「刺繍にはならんかねえ」＝フォークの MV の題字 2026-10-20）
  const HAND = (s) => `italic 700 ${s}px "Segoe Script",cursive`, TY = 64, N = 7;
  const m = document.createElement('canvas').getContext('2d'), fs = fitFont(m, HAND, 44, TEXT, 290), tw = (m.font = HAND(fs), m.measureText(TEXT).width), X0 = W / 2 - tw / 2;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bg = layer((x) => { x.fillStyle = '#2f8a52'; x.fillRect(0, 0, W, H); x.fillStyle = '#efe1c6'; x.beginPath(); x.roundRect(14, 14, W - 28, H - 28, 16); x.fill();
    for (let i = 0; i < 1400; i++) { x.fillStyle = rnd() < 0.5 ? 'rgba(150,110,60,.10)' : 'rgba(255,255,255,.28)'; x.fillRect(14 + rnd() * (W - 28), 14 + rnd() * (H - 28), 1.4, 1.4); }   // フェルトの毛羽
    x.setLineDash([6, 5]); x.strokeStyle = '#fff8ee'; x.lineWidth = 2; x.beginPath(); x.roundRect(22, 22, W - 44, H - 44, 12); x.stroke(); x.setLineDash([]);
    x.font = HAND(fs); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(140,90,50,.16)'; x.fillText(TEXT, W / 2, TY); });   // 縫う前の、うすい下書き
  // 糸の色で書き、ところどころ布のすき間を抜いて、なみ縫いに見せる（抜くのは字の縁に沿った短い点。細い線なので、縁から縁まで抜けて糸の切れ目になる）。糸の影を少し
  const thread = layer((x) => { x.font = HAND(fs); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(90,30,20,.25)'; x.fillText(TEXT, W / 2 + 0.6, TY + 0.8); x.fillStyle = '#d0263e'; x.fillText(TEXT, W / 2, TY);
    x.globalCompositeOperation = 'destination-out'; x.setLineDash([1.3, 3.6]); x.lineWidth = 3.2; x.strokeText(TEXT, W / 2, TY); x.globalCompositeOperation = 'source-over'; });
  const S = { step: 0, total: N, done: false, t0: -9, d0: -9, hearts: [] };
  const stitchOut = (x, f) => { x.save(); x.setLineDash([4, 3]); x.strokeStyle = '#fff3e0'; x.lineWidth = 1.6; f(); x.stroke(); x.restore(); };
  function bear(x, t) { const c = '#b8743e', l = '#e8c08a', cx = 106;
    x.fillStyle = c; x.beginPath(); x.ellipse(cx, 224, 44, 40, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(cx - 26, 136, 12, 0, TAU); x.arc(cx + 26, 136, 12, 0, TAU); x.fill(); x.beginPath(); x.arc(cx, 162, 32, 0, TAU); x.fill();
    x.fillStyle = l; x.beginPath(); x.ellipse(cx, 232, 26, 22, 0, 0, TAU); x.fill(); x.beginPath(); x.arc(cx - 26, 136, 6, 0, TAU); x.arc(cx + 26, 136, 6, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx, 172, 14, 10, 0, 0, TAU); x.fill();
    stitchOut(x, () => { x.beginPath(); x.arc(cx, 162, 28, 0, TAU); x.moveTo(cx + 40, 224); x.ellipse(cx, 224, 40, 36, 0, 0, TAU); });
    x.fillStyle = '#2a1408'; x.beginPath(); x.arc(cx - 11, 156, 3, 0, TAU); x.arc(cx + 11, 156, 3, 0, TAU); x.fill(); x.beginPath(); x.ellipse(cx, 167, 5, 3.5, 0, 0, TAU); x.fill();
    x.strokeStyle = '#2a1408'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, 171, 5, 0.2, Math.PI - 0.2); x.stroke();
    const b = S.done ? ease((t - S.d0 - 0.9) / 0.3) : 0;   // 金のボタン：出てきて、十字に縫い付けられる
    if (b > 0) { x.save(); x.translate(cx, 210); x.scale(b, b); const g = x.createRadialGradient(-3, -3, 1, 0, 0, 10); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.5, '#e8b020'); g.addColorStop(1, '#a8740c'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 10, 0, TAU); x.fill();
      x.fillStyle = '#7a520a'; for (const [a, d] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) { x.beginPath(); x.arc(a, d, 1.3, 0, TAU); x.fill(); }
      const s = clamp((t - S.d0 - 1.0) / 0.5, 0, 1); x.strokeStyle = '#d0263e'; x.lineWidth = 1.8; x.lineCap = 'round'; x.beginPath(); x.moveTo(-3, -3); x.lineTo(-3, -3 + 6 * Math.min(1, s * 2)); if (s > 0.5) { x.moveTo(3, -3); x.lineTo(3, -3 + 6 * (s - 0.5) * 2); } x.stroke(); x.restore(); } }   // 縫い目は縦に2本（十字は「×」に見えた）
  function cookie(x, t) { const slide = S.done ? -36 * ease((t - S.d0) / 0.8) : 0, cx = 262 + slide, c = '#c98a4e', e = '#9a5e2c';
    const limbs = [[cx - 16, 192, cx - 42, 206], [cx + 16, 192, cx + 42, 206], [cx - 9, 222, cx - 15, 248], [cx + 9, 222, cx + 15, 248]];
    const body = (col, grow) => { x.strokeStyle = x.fillStyle = col; x.lineCap = 'round'; x.lineWidth = 17 + grow * 2; x.beginPath(); for (const [a, b, c2, d] of limbs) { x.moveTo(a, b); x.lineTo(c2, d); } x.stroke();
      x.beginPath(); x.roundRect(cx - 20 - grow, 178 - grow, 40 + grow * 2, 50 + grow * 2, 16); x.fill(); x.beginPath(); x.arc(cx, 157, 23 + grow, 0, TAU); x.fill(); };
    body(e, 1.5); body(c, 0);
    x.strokeStyle = '#fffaf2'; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.arc(cx, 160, 9, 0.3, Math.PI - 0.3); for (const [a, b] of [[cx - 38, 198], [cx + 38, 198], [cx - 14, 240], [cx + 14, 240]]) { x.moveTo(a - 6, b); x.lineTo(a - 3, b + 4); x.lineTo(a, b); x.lineTo(a + 3, b + 4); x.lineTo(a + 6, b); } x.stroke();   // 手首と足首のアイシング
    x.fillStyle = '#2a1408'; x.beginPath(); x.arc(cx - 8, 152, 2.6, 0, TAU); x.arc(cx + 8, 152, 2.6, 0, TAU); x.fill();
    x.fillStyle = '#e8243e'; x.beginPath(); x.arc(cx, 196, 4, 0, TAU); x.fill(); x.fillStyle = '#2fb060'; x.beginPath(); x.arc(cx, 212, 4, 0, TAU); x.fill();
    if (S.done && t - S.d0 > 0.8 && t - S.d0 < 1.6) { const w = Math.sin((t - S.d0) * 30) * 3; x.strokeStyle = '#c8ccd4'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - 38, 196 + w); x.lineTo(cx - 52, 206 + w); x.stroke(); } }   // クッキーの手に、小さな針
  function needle(x, rx) { x.save(); x.strokeStyle = '#c8ccd4'; x.lineWidth = 2.2; x.lineCap = 'round'; x.beginPath(); x.moveTo(rx, TY + 22); x.lineTo(rx + 14, TY - 20); x.stroke();
    x.strokeStyle = '#7a8090'; x.lineWidth = 1; x.beginPath(); x.ellipse(rx + 12.6, TY - 15, 1.4, 3, 0.32, 0, TAU); x.stroke();
    x.strokeStyle = '#d0263e'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(rx + 12.6, TY - 15); x.quadraticCurveTo(rx + 30, TY - 34, rx + 44, TY - 24); x.stroke(); x.restore(); }
  return { S,
    draw(x, t) { x.drawImage(bg, 0, 0, W, H); const k = S.step, u = ease((t - S.t0) / 0.35), rx = X0 + (tw * (Math.max(0, k - 1) + (k ? u : 0))) / N;
      x.save(); x.beginPath(); x.rect(0, 0, k >= N && u >= 1 ? W : rx, H); x.clip(); x.drawImage(thread, 0, 0, W, H); x.restore();
      if (!(k >= N && u >= 1)) needle(x, rx);
      bear(x, t); cookie(x, t);
      if (S.done && t - S.d0 > 1.5 && t - S.d0 < 2.4) { const v = (t - S.d0 - 1.5) / 0.9; x.fillStyle = `rgba(255,236,150,${1 - v})`; for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; x.beginPath(); x.arc(106 + Math.cos(a) * 22 * v, 210 + Math.sin(a) * 22 * v, 2.4, 0, TAU); x.fill(); } }
      for (const h of S.hearts) { const v = (t - h.t) / 1.1; if (v < 0 || v > 1) continue; x.save(); x.globalAlpha = 1 - v; x.translate(h.x, 200 - 60 * v); x.scale(0.8 + v * 0.4, 0.8 + v * 0.4); x.fillStyle = '#e8243e'; x.beginPath(); x.moveTo(0, 6); x.bezierCurveTo(-12, -2, -6, -12, 0, -5); x.bezierCurveTo(6, -12, 12, -2, 0, 6); x.fill(); x.restore(); } },
    busy: (t) => t - S.t0 < 0.4 || (S.done && t - S.d0 < 2.5) || S.hearts.some((h) => t - h.t < 1.15),
    tap(t, sfx) { if (S.step < S.total) { S.step++; S.t0 = t; if (sfx.stitch) sfx.stitch(); if (S.step === S.total) { S.done = true; S.d0 = t + 0.4; setTimeout(() => sfx.chime && sfx.chime(), 1900); } }
      else { S.hearts.push({ x: 175 + Math.random() * 20, t }); if (S.hearts.length > 6) S.hearts.shift(); if (sfx.stitch) sfx.stitch(); } } };
}

// ---------- セロハン（後ろから琥珀の灯りを当てた影絵。色のセロハンが重なると、色が混ざる＝かけ合わせ） ----------
function cello() {
  const BASE = 252, RX = W / 2, RY = 70, RR = 44;
  // 灯りのまん中は白寄りに広く、四隅だけ琥珀（琥珀一色だと、青・緑・紫のセロハンが濁って茶色になる＝ゴスペルの MV で学んだ。動画制作ラボ Skill douga「切り絵とダンス」）
  const bg = layer((x) => { const g = x.createRadialGradient(RX, 175, 10, RX, 175, 280); g.addColorStop(0, '#fffcf2'); g.addColorStop(0.55, '#ffeec4'); g.addColorStop(0.85, '#f0b860'); g.addColorStop(1, '#b06a1c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(70,32,6,.38)'; x.fillRect(0, BASE, W, H - BASE); });
  const M = [['#46c8ff', '#ff5ab4'], ['#ff5ab4', '#ffd23a'], ['#ffd23a', '#46d07a'], ['#46d07a', '#9a7aff'], ['#9a7aff', '#46c8ff']].map(([c, s], i) => ({ x: 72 + i * 54, c, s, t: null }));
  const GL = ['#ff3a5a', '#3a8aff', '#ffd23a', '#3ad07a', '#ff7a2a', '#9a5aff', '#2ad0d0', '#ff5ab4'];
  const S = { step: 0, total: M.length, done: false, lit: -9, notes: [] };
  function rose(x, t) { const u = S.done ? ease((t - S.lit) / 1.2) : 0; x.save(); x.translate(RX, RY);
    if (u > 0) { x.globalCompositeOperation = 'lighter'; x.fillStyle = `rgba(255,240,200,${0.16 * u})`; for (const a of [-0.5, 0, 0.5]) { x.beginPath(); x.moveTo(-14 + a * 30, 30); x.lineTo(14 + a * 30, 30); x.lineTo(46 + a * 150, BASE - RY); x.lineTo(-46 + a * 150, BASE - RY); x.fill(); } x.globalCompositeOperation = 'source-over'; }
    x.shadowColor = '#fff2c0'; x.shadowBlur = 30 * u;
    for (let i = 0; i < 8; i++) { x.fillStyle = GL[i]; x.globalAlpha = 0.18 + 0.82 * u; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, RR, (i / 8) * TAU, ((i + 1) / 8) * TAU); x.closePath(); x.fill(); }
    x.globalAlpha = 1; x.shadowBlur = 0; x.fillStyle = u > 0 ? '#ffe9a0' : '#c49a5a'; x.beginPath(); x.arc(0, 0, 13, 0, TAU); x.fill();
    x.strokeStyle = '#3a2410'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, RR, 0, TAU); x.arc(0, 0, 13, 0, TAU); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; x.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); x.lineTo(Math.cos(a) * RR, Math.sin(a) * RR); } x.stroke(); x.restore(); }
  function member(x, m, i, t) { const h = m.t == null ? 0.07 : 0.07 + 0.93 * spring((t - m.t) / 0.8), sway = S.done ? 0.05 * Math.sin((t - S.lit) * 3 + i) * clamp(1 - (t - S.lit) / 3.5, 0, 1) : 0;
    x.save(); x.translate(m.x, BASE); x.rotate(sway); x.scale(1, h); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.86;
    x.fillStyle = m.c; x.beginPath(); x.moveTo(-30, 0); x.lineTo(30, 0); x.lineTo(16, -74); x.lineTo(-16, -74); x.closePath(); x.fill();   // ローブ
    x.fillStyle = m.s; x.fillRect(-5, -72, 10, 72); x.beginPath(); x.ellipse(-21, -44, 9, 24, 0.32, 0, TAU); x.ellipse(21, -44, 9, 24, -0.32, 0, TAU); x.fill();   // 肩の帯と、袖
    x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(0, -92, 16, 0, TAU); x.fill(); x.restore();   // 顔は黄色のセロハン
    if (h > 0.75) { x.save(); x.translate(m.x, BASE); x.rotate(sway); x.fillStyle = '#5a2a0a'; x.beginPath(); x.arc(-5.5, -94 * h, 2, 0, TAU); x.arc(5.5, -94 * h, 2, 0, TAU); x.fill(); x.strokeStyle = '#5a2a0a'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, -89 * h, 5, 0.25, Math.PI - 0.25); x.stroke(); x.restore(); } }
  return { S,
    draw(x, t) { x.drawImage(bg, 0, 0, W, H); rose(x, t); M.forEach((m, i) => member(x, m, i, t));
      x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '700 22px sans-serif'; for (const n of S.notes) { const v = (t - n.t) / 1.4; if (v < 0 || v > 1) continue; x.fillStyle = `rgba(90,42,10,${1 - v})`; x.fillText('♪', n.x + Math.sin(v * 6) * 8, BASE - 120 - 70 * v); } },
    busy: (t) => M.some((m) => m.t != null && t - m.t < 0.85) || (S.done && t - S.lit < 3.6) || S.notes.some((n) => t - n.t < 1.45),
    tap(t, sfx) { if (S.step < S.total) { const k = S.step++; M[k].t = t; if (sfx.choir) sfx.choir(k); if (S.step === S.total) { S.done = true; S.lit = t + 0.7; setTimeout(() => sfx.bell && sfx.bell(), 700); } }
      else { const k = Math.floor(Math.random() * M.length); S.notes.push({ x: M[k].x, t }); if (S.notes.length > 6) S.notes.shift(); if (sfx.choir) sfx.choir(k); } } };
}

const BUILD = { neon, sew, cello };
// host の中に絵を置く。sfx＝音（buzz・jingle・stitch・chime・choir・bell）。返す物＝state()（確かめる道具が読む）・tap()・destroy()
export function mountGreet(host, id, sfx = {}) {
  host.textContent = ''; const D = BUILD[id](), cv = document.createElement('canvas'), x = cv.getContext('2d'), hint = document.createElement('p');
  cv.className = 'gcv'; cv.tabIndex = 0; cv.setAttribute('role', 'button'); cv.setAttribute('aria-label', DESIGNS[id].name + 'のカード：' + DESIGNS[id].hint);
  hint.className = 'ghint'; hint.textContent = DESIGNS[id].hint; host.append(cv, hint);
  let raf = 0, last = 0, dpr = 1, k = 1, alive = true; const slow = matchMedia('(pointer: coarse)').matches;
  const paint = (now) => { x.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); D.draw(x, now / 1000); };
  const loop = (now) => { if (!alive) return; if (slow && now - last < 31) { raf = requestAnimationFrame(loop); return; } last = now; paint(now); raf = D.busy(now / 1000) ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(loop); };
  const fit = () => { const w = host.clientWidth || W; dpr = Math.min(2, devicePixelRatio || 1); k = w / W; cv.width = Math.round(w * dpr); cv.height = Math.round((w * H / W) * dpr); cv.style.height = Math.round((w * H) / W) + 'px'; paint(performance.now()); };
  const tap = () => { D.tap(performance.now() / 1000, sfx); hint.classList.add('bye'); kick(); };
  cv.addEventListener('click', tap); cv.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
  const ro = new ResizeObserver(fit); ro.observe(host); fit();
  return { id, tap, state: () => ({ id, step: D.S.step, total: D.S.total, done: D.S.done }), destroy() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); host.textContent = ''; } };
}
