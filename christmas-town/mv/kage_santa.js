// 写し：動画制作ラボ/MV/クリスマス/gospel/全編/kage_stage.js の「いたずらのサンタ」（トナカイ2頭とそり・星の尾）だけ。window.KS（KC・KR を使う）
(() => {
  // ---------- いたずらのサンタ（トナカイ2頭とそり）：空の空白に。少し小さめ・走った後に星がきらきら流れる（本人 2026-10-20）----------
  //   K＝[[秒, X, Y], …] の道（なめらかに）。進む向きへ傾く。opt.dir（1 右向き・−1 左向き。1回の登場の間は変えない＝宙返りでは逆さになる）・opt.wave（手を振る）
  function santaAt(T, K) {
    if (T < K[0][0] || T > K[K.length - 1][0]) return null;
    let i = 0; while (i < K.length - 2 && T > K[i + 1][0]) i++;
    const A = K[Math.max(0, i - 1)], B = K[i], C = K[i + 1], D2 = K[Math.min(K.length - 1, i + 2)], u = (T - B[0]) / Math.max(1e-6, C[0] - B[0]);
    const cr = (j, v) => 0.5 * (2 * B[j] + (-A[j] + C[j]) * v + (2 * A[j] - 5 * B[j] + 4 * C[j] - D2[j]) * v * v + (-A[j] + 3 * B[j] - 3 * C[j] + D2[j]) * v * v * v);
    const dX = cr(1, Math.min(1, u + 0.02)) - cr(1, Math.max(0, u - 0.02)), dY = cr(2, Math.min(1, u + 0.02)) - cr(2, Math.max(0, u - 0.02));
    return { X: cr(1, u), Y: cr(2, u), dX, dY, ang: Math.atan2(dY, dX) };
  }
  function drawSanta(g, T, st, opt = {}) {
    const cl = (path, c) => KC.cello(g, path, c), E = (x, y, rx, ry, r = 0) => KR.ell(x, y, rx, ry, r), S = (pts) => KR.spline(pts.map(([x, y]) => ({ x, y })));
    const fl = opt.dir || 1, th = fl < 0 ? Math.atan2(st.dY, -st.dX) : Math.atan2(st.dY, st.dX);
    g.save(); g.scale(fl, 1); g.rotate(th); g.translate(-100, 75);
    const ph = T * 10;
    // トナカイ（後ろ・先頭）：脚を駆けるように回す
    for (const [cx, lead] of [[95, false], [255, true]]) { const bob = 4 * Math.sin(ph + cx);
      for (const [lx, o] of [[-28, 0], [-18, 1.2], [26, 2.4], [34, 3.6]]) { const a = 0.7 * Math.sin(ph + o), k = { x: cx + lx, y: -62 + bob }, f1 = { x: k.x + Math.sin(a) * 22, y: k.y + Math.cos(a) * 22 };
        cl(KC.capsule(k, f1, 4.2), '#b06a34'); cl(KC.capsule(f1, { x: f1.x + Math.sin(a * 1.6) * 14, y: f1.y + Math.cos(a * 1.6) * 14 }, 3.4), '#8a5230'); }
      cl(E(cx, -70 + bob, 44, 19, -0.05), '#c47a3c'); cl(E(cx - 4, -64 + bob, 30, 9), '#f2d6a8');
      cl(KC.capsule({ x: cx + 34, y: -78 + bob }, { x: cx + 52, y: -104 + bob }, 9), '#c47a3c'); cl(E(cx + 60, -110 + bob, 17, 11, 0.2), '#c47a3c');
      cl(E(cx + 50, -122 + bob, 5, 9, -0.6), '#c47a3c');
      for (const s of [-1, 1]) cl(KC.ribbon([{ x: cx + 54 + s * 3, y: -118 + bob }, { x: cx + 48 + s * 6, y: -142 + bob }, { x: cx + 40 + s * 12, y: -156 + bob }], 3.4, 2), '#8a5a34');
      cl(KC.ribbon([{ x: cx + 47, y: -140 + bob }, { x: cx + 58, y: -150 + bob }], 2.6, 1.6), '#8a5a34');
      cl(E(cx + 76, -108 + bob, lead ? 6 : 4, lead ? 6 : 4), lead ? '#ff2a3a' : '#5a3a2a');
      KC.stack(g, E(cx + 62, -114 + bob, 2, 2), KC.DEEP, 3);
      cl(KC.ribbon([{ x: cx - 30, y: -86 + bob }, { x: cx + 30, y: -86 + bob }], 5, 5), '#ff3b4a');
      for (const bx of [-18, 0, 18]) cl(E(cx + bx, -86 + bob, 3.2, 3.2), '#ffd02a');
      cl(E(cx - 46, -78 + bob, 7, 5, -0.6), '#f2d6a8'); }
    // 手綱
    g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = KC.css([0.5, 0.3, 0.3]); g.lineWidth = 1.6; g.beginPath(); g.moveTo(-26, -96); g.quadraticCurveTo(80, -110 + 6 * Math.sin(ph), 175, -86); g.lineTo(255, -86); g.stroke(); g.restore();
    // すべり木（金の膜・先がくるり）と支え
    cl(KC.ribbon([{ x: -138, y: -4 }, { x: -60, y: 2 }, { x: 4, y: 2 }, { x: 20, y: -8 }, { x: 24, y: -22 }, { x: 15, y: -30 }], 5, 4), '#ffd02a');
    for (const x of [-110, -30]) cl(KC.capsule({ x, y: -12 }, { x, y: 0 }, 2.6), '#ffd02a');
    // 袋とプレゼント
    cl(E(-104, -78, 26, 30, -0.2), '#2fae62'); cl(new Path2D('M-88 -88 h22 v20 h-22 Z'), '#5ac8ff'); cl(new Path2D('M-79 -88 h4 v20 h-4 Z'), '#ff3b4a');
    // サンタ：胴・ベルト・振る腕・顔・ひげ・帽子
    const wv = opt.wave ? Math.sin(T * 9) : 0.2;
    cl(E(-48, -78, 26, 28), '#ff3b4a'); KC.stack(g, new Path2D('M-73 -70 h50 v6 h-50 Z'), KC.DEEP, 1);
    cl(KC.capsule({ x: -36, y: -96 }, { x: -18 + 10 * wv, y: -128 - 6 * Math.abs(wv) }, 7), '#ff3b4a'); cl(E(-16 + 10 * wv, -134 - 6 * Math.abs(wv), 7, 7), '#2fae62');
    cl(E(-46, -116, 16, 15), KC.faceFilm('#ffe27a')); cl(E(-38, -112, 4, 3), '#ff8aa6'); KC.stack(g, E(-42, -119, 1.8, 2.2), KC.DEEP, 3);
    cl(S([[-60, -112], [-34, -108], [-30, -96], [-44, -86], [-58, -96]]), '#fffaf0');
    cl(S([[-64, -122], [-30, -126], [-44, -146], [-62, -150], [-80, -138]]), '#ff3b4a'); cl(KC.ribbon([{ x: -64, y: -124 }, { x: -30, y: -127 }], 7, 7), '#fffaf0'); cl(E(-82, -138 + 3 * Math.sin(ph * 0.5), 6, 6), '#fffaf0');
    // そりの胴（いちばん手前）
    cl(S([[-128, -18], [-132, -60], [-110, -66], [-70, -46], [-10, -50], [6, -32], [-8, -10]]), '#ff3b4a');
    cl(S([[-124, -26], [-116, -54], [-96, -50], [-102, -26]]), '#ffd02a');
    g.restore();
  }
  // サンタを世界に置く（物）・走った後の星の流れ（世界の座標の back に描く）・光（bleed）
  function santa(O, T, K, opt = {}) { const st = santaAt(T, K); if (!st) return; O.push({ id: 'santa' + (opt.key || ''), X: st.X, Y: st.Y, d: 4, sz: opt.sz || 0.6, busy: 0.6, bbox: [-300, -300, 300, 300], tight: [-210, -120, 210, 120], draw: (g) => drawSanta(g, T, st, opt) }); }
  const TRAIL = 22;
  function trailAt(T, K, k, opt) { const st = santaAt(T - k * 0.07, K); if (!st) return null; const n = Math.hypot(st.dX, st.dY) || 1, back = 120 * (opt.sz || 0.6); return { x: st.X - st.dX / n * back + Math.sin(k * 3.7) * 9, y: st.Y - st.dY / n * back + Math.cos(k * 2.3) * 9 }; }
  function santaTrail(g, T, K, opt = {}) {
    for (let k = 1; k <= TRAIL; k++) { const q0 = trailAt(T, K, k, opt); if (!q0) continue; const r = Math.max(2, (opt.sz || 0.6) * (17 - k * 0.6) * (0.6 + 0.4 * Math.sin(T * 13 + k * 2.1))), q = new Path2D();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + T * 2, rr = i % 2 ? r * 0.35 : r; i ? q.lineTo(q0.x + Math.cos(a) * rr, q0.y + Math.sin(a) * rr) : q.moveTo(q0.x + Math.cos(a) * rr, q0.y + Math.sin(a) * rr); } q.closePath();
      g.save(); g.globalAlpha = 1 - k / (TRAIL + 1); KC.cello(g, q, k % 3 ? '#ffd02a' : '#ff9ab8'); g.restore(); }
  }
  window.KS = { santaAt, drawSanta, santaTrail, TRAIL };
})();
