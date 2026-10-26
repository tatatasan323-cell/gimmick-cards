// クリスマスのステンドグラス：壁のアーチ窓12枚と、天井の丸窓1枚。色ガラスのかけらを並べ、鉛の線で区切る。キャンバスに描いて、窓の絵として使う
// アーチ窓の座標：x＝-1〜1、y＝0〜3.4（上は半径1の半円・中心 y=2.4）。丸窓：半径1の円（中心 0,0）
import * as THREE from 'three';
export const PH = 3.4, ACY = 2.4;
export const mkRand = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const TAU = Math.PI * 2;

// ---------- 形の道具 ----------
// 縁の帯用：長さに比例してたどる（宝石が等間隔に並ぶ）
const LB = 2 / 9.94, LS = 2.4 / 9.94, LA = Math.PI / 9.94;
const archPtL = (t, r = 1, y0 = 0) => {
  t = ((t % 1) + 1) % 1;
  if (t < LB) return [-r + (t / LB) * 2 * r, y0];
  if (t < LB + LS) return [r, y0 + ((t - LB) / LS) * (ACY - y0)];
  if (t < LB + LS + LA) { const a = ((t - LB - LS) / LA) * Math.PI; return [Math.cos(a) * r, ACY + Math.sin(a) * r]; }
  return [-r, ACY - ((t - LB - LS - LA) / LS) * (ACY - y0)];
};
// 縁の帯の1区切り：角をまたぐ時は、角の点も入れる（入れないと、角を斜めに切った細い線が出た）
const CORNERS = [LB, LB + LS, LB + LS + LA];
const bandSeg = (t0, t1, rO, yO, rI, yI) => { const ts = [t0]; for (const c of CORNERS) if (c > t0 && c < t1) ts.push(c); ts.push(t1); const all = []; for (let i = 0; i < ts.length - 1; i++) for (let k = 0; k < 3; k++) all.push(ts[i] + ((ts[i + 1] - ts[i]) * k) / 3); all.push(t1);
  return [...all.map((t) => archPtL(t, rO, yO)), ...all.reverse().map((t) => archPtL(t, rI, yI))]; };
// 輪郭：下の両角と、半円の両はしを、ちょうどの点で持つ（等分でたどると、角が斜めに欠けた）
export const archPoly = (r = 1, y0 = 0, n = 64) => { const m = Math.max(8, Math.round(n * 0.6)); return [[-r, y0], [r, y0], ...Array.from({ length: m + 1 }, (_, k) => [Math.cos((k / m) * Math.PI) * r, ACY + Math.sin((k / m) * Math.PI) * r])]; };
export const inArch = (x, y) => (y >= 0 && y <= ACY && Math.abs(x) <= 1) || (y > ACY && x * x + (y - ACY) ** 2 <= 1);
export const circlePts = (cx, cy, rx, ry = rx, n = 28, a0 = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(a0 + (i / n) * TAU) * rx, cy + Math.sin(a0 + (i / n) * TAU) * ry]);
export function clip(poly, nx, ny, c) {   // n・p ≦ c の側だけ残す
  const out = [];
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c; if (da <= 0) out.push(a); if (da <= 0 !== db <= 0) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
  return out;
}
const clipConvex = (poly, bound) => { let p = poly; for (let i = 0; i < bound.length && p.length >= 3; i++) { const a = bound[i], b = bound[(i + 1) % bound.length], nx = b[1] - a[1], ny = a[0] - b[0]; p = clip(p, nx, ny, nx * a[0] + ny * a[1]); } return p; };
export function voronoi(seeds, bound) {   // かけらの分け方：種ごとに、いちばん近い所
  return seeds.map((s, i) => { let p = bound; for (let j = 0; j < seeds.length && p.length >= 3; j++) { if (j === i) continue; const nx = seeds[j][0] - s[0], ny = seeds[j][1] - s[1]; p = clip(p, nx, ny, (nx * (s[0] + seeds[j][0])) / 2 + (ny * (s[1] + seeds[j][1])) / 2); } return p; }).filter((p) => p.length >= 3);
}
export const centroid = (p) => { let a = 0, cx = 0, cy = 0; for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length], c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; } return a ? [cx / (3 * a), cy / (3 * a)] : p[0]; };
const areaOf = (p) => { let a = 0; for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0; } return a / 2; };
const perimOf = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; s += Math.hypot(x1 - x0, y1 - y0); } return s; };
const bboxOf = (p) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of p) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a, b, c, d]; };
const pip = (p, x, y) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const rot = (pts, a, cx = 0, cy = 0) => pts.map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
const rectP = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const heartPts = (cx, cy, s, n = 44) => Array.from({ length: n }, (_, i) => { const t = (i / n) * TAU; return [cx + (s * 16 * Math.sin(t) ** 3) / 17, cy + (s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))) / 17]; });
const leafPts = (len, w, wave = true) => { const p = []; for (let i = 0; i <= 8; i++) { const t = i / 8; p.push([t * len, Math.sin(t * Math.PI) * w * (wave ? (i % 2 ? 1.25 : 0.85) : 1)]); } for (let i = 7; i > 0; i--) { const t = i / 8; p.push([t * len, -Math.sin(t * Math.PI) * w * (wave ? (i % 2 ? 1.25 : 0.85) : 1)]); } return p; };
const hollyPts = (len, w) => { const p = [], n = 5; for (let i = 0; i <= 2 * n; i++) { const t = i / (2 * n); p.push([t * len, Math.sin(t * Math.PI) * w * (i % 2 ? 1.05 : 0.6)]); } for (let i = 2 * n - 1; i > 0; i--) { const t = i / (2 * n); p.push([t * len, -Math.sin(t * Math.PI) * w * (i % 2 ? 1.05 : 0.6)]); } return p; };
const featherPts = (len, w) => { const p = []; for (let i = 0; i <= 10; i++) { const t = i / 10; p.push([t * len, Math.sin(Math.pow(t, 0.75) * Math.PI) * w]); } for (let i = 9; i > 0; i--) { const t = i / 10; p.push([t * len, -Math.sin(t * Math.PI) * w * 0.55]); } return p; };

// ---------- 窓の形（2種類） ----------
// px＝1単位あたりの画素。lead＝鉛の線の太さ（単位）。RW×RH＝かけらに分ける時の格子
export const ARCH = { kind: 'arch', x0: -1, x1: 1, y0: 0, y1: PH, W: 768, H: 1306, RW: 220, RH: 374, minCells: 14, lead: 0.028, small: 0.2, inside: inArch, outline: archPoly(1, 0, 64) };
export const ROSE = { kind: 'rose', x0: -1, x1: 1, y0: -1, y1: 1, W: 2048, H: 2048, RW: 440, RH: 440, minCells: 14, lead: 0.0085, small: 0.07, inside: (x, y) => x * x + y * y <= 1, outline: circlePts(0, 0, 1, 1, 128) };

// ---------- 描く ----------
// 色の絵（ガラスだけ）と、鉛の線の絵（線だけ・透明）を分けて描く。かけらが抜けても、鉛の枠は窓に残る
function jit(hex, rr, k = 0.07) { const c = new THREE.Color(hex), h = {}; c.getHSL(h); return '#' + c.setHSL(h.h + (rr() - 0.5) * 0.02, Math.min(1, h.s * (0.92 + rr() * 0.16)), Math.max(0, Math.min(1, h.l + (rr() - 0.5) * k * 2))).getHexString(); }
export function paint(d, seed) {
  const F = d.frame || ARCH, { W, H } = F, sx = W / (F.x1 - F.x0), X = (x) => (x - F.x0) * sx, Y = (y) => (F.y1 - y) * sx;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cv = mk(), lv = mk(), g = cv.getContext('2d'), l = lv.getContext('2d'), rr = mkRand(seed), pieces = [], glows = [];
  const path = (ctx, p) => { ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.closePath(); };
  const lead = (p, w) => { l.save(); l.globalCompositeOperation = 'destination-out'; path(l, p); l.fill(); l.restore(); l.lineJoin = 'round'; path(l, p); l.strokeStyle = '#17121c'; l.lineWidth = w * sx; l.stroke(); l.strokeStyle = 'rgba(120,110,135,.45)'; l.lineWidth = w * sx * 0.23; l.stroke(); };
  // かけら1枚：色のむら（大聖堂ガラスのような斑）・すじ・中ほどの明るさ・ふちの陰り。小さなかけらは、鉛の線を細くする（線に埋もれない）
  const glass = (p, col) => {
    if (p.length < 3) return; const A = Math.abs(areaOf(p)); if (A < 1e-6) return;
    const th = (2 * A) / perimOf(p), lw = Math.min(F.lead, Math.max(F.lead * 0.45, th * 0.35)); pieces.push({ poly: p, col });
    const [x0, y0, x1, y1] = bboxOf(p), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rad = Math.max(x1 - x0, y1 - y0) / 2, bx = X(x0) - 4, by = Y(y1) - 4, bw = (x1 - x0) * sx + 8, bh = (y1 - y0) * sx + 8;
    g.save(); path(g, p); g.clip(); g.fillStyle = jit(col, rr); g.fillRect(bx, by, bw, bh);
    for (let k = 0; k < 3; k++) { const px = X(x0 + rr() * (x1 - x0)), py = Y(y0 + rr() * (y1 - y0)), gr = g.createRadialGradient(px, py, 0, px, py, rad * sx * (0.25 + rr() * 0.35) + 1), lite = rr() < 0.5; gr.addColorStop(0, lite ? 'rgba(255,255,240,.22)' : 'rgba(10,0,30,.2)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(bx, by, bw, bh); }
    const a = rr() * Math.PI; g.lineCap = 'round';
    for (let k = 0; k < 6; k++) { const t = (k / 5 - 0.5) * 2 * rad * sx, ox = X(cx) + Math.cos(a + Math.PI / 2) * t, oy = Y(cy) - Math.sin(a + Math.PI / 2) * t, L = rad * sx * 1.5; g.strokeStyle = rr() < 0.6 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)'; g.lineWidth = Math.max(1, rad * sx * (0.02 + rr() * 0.05)); g.beginPath(); g.moveTo(ox - Math.cos(a) * L, oy + Math.sin(a) * L); g.lineTo(ox + Math.cos(a) * L, oy - Math.sin(a) * L); g.stroke(); }
    const gr = g.createRadialGradient(X(cx), Y(cy), 0, X(cx), Y(cy), rad * sx * 0.55 + 1); gr.addColorStop(0, 'rgba(255,255,255,.24)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(bx, by, bw, bh);
    path(g, p); g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = Math.min(F.lead * 1.5, th * 0.6) * sx; g.stroke(); g.restore();
    lead(p, lw);
  };
  const inkRaw = (pts, w, col) => { g.save(); g.strokeStyle = col; g.lineWidth = w * sx * 0.5; g.lineCap = g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); g.restore(); };
  // 背景の色：焦点に近いほど明るい（光の後光）。pal は暗い→明るい
  const pick = (pal, c, focus, glR, mix, alt) => { if (alt && rr() < alt[1]) return alt[0][(rr() * alt[0].length) | 0]; const t = Math.min(1, Math.hypot(c[0] - focus[0], c[1] - focus[1]) / glR); return pal[Math.max(0, Math.min(pal.length - 1, Math.round((1 - t) * (pal.length - 1) + (rr() - 0.5) * mix * 2)))]; };
  const bound = F.kind === 'arch' ? archPoly(1, 0, 48) : circlePts(0, 0, 1, 1, 64);
  const mkG = (M, sc) => {
    const P = (pts) => pts.map(M), gl = (p, col) => glass(P(p), col);
    const o = {
      rr, sc,
      poly: gl,
      rect: (x0, y0, x1, y1, col) => gl(rectP(x0, y0, x1, y1), col),
      circle: (cx, cy, r, col, n = 26) => gl(circlePts(cx, cy, r, r, n), col),
      ellipse: (cx, cy, rx, ry, col, a = 0) => gl(rot(circlePts(0, 0, rx, ry, 26), a, cx, cy), col),
      halves: (cx, cy, rx, ry, cols, a = 0) => { const p = rot(circlePts(0, 0, rx, ry, 26), a, cx, cy), h = p.length / 2; gl(p.slice(0, h + 1), cols[0]); gl([...p.slice(h), p[0]], cols[1]); },
      star: (cx, cy, R, r, n, cols, a0 = Math.PI / 2) => { const pt = (i) => { const a = a0 + (i / (2 * n)) * TAU, k = i % 2 ? r : R; return [cx + Math.cos(a) * k, cy + Math.sin(a) * k]; };
        if (R * sc < F.small) { gl(Array.from({ length: 2 * n }, (_, i) => pt(i)), cols[0]); return; }   // 小さな星は1枚で（細かく割ると、鉛の線に埋もれて黒く見えた）
        for (let i = 0; i < 2 * n; i++) gl([[cx, cy], pt(i), pt(i + 1)], cols[i % cols.length]); },
      rays: (cx, cy, r0, r1, n, cols, a0 = 0) => { for (let i = 0; i < n; i++) { const a = a0 + (i / n) * TAU, b = a0 + ((i + 1) / n) * TAU; gl([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * r1, cy + Math.sin(a) * r1], [cx + Math.cos(b) * r1, cy + Math.sin(b) * r1], [cx + Math.cos(b) * r0, cy + Math.sin(b) * r0]], cols[i % cols.length]); } },
      ring: (cx, cy, R, r, n, cols, wave = 0.04) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU, b = ((i + 1) / n) * TAU, m = (a + b) / 2, R2 = R * (1 + wave + (i % 2) * wave); gl([[cx + Math.cos(a) * r, cy + Math.sin(a) * r], [cx + Math.cos(a) * R, cy + Math.sin(a) * R], [cx + Math.cos(m) * R2, cy + Math.sin(m) * R2], [cx + Math.cos(b) * R, cy + Math.sin(b) * R], [cx + Math.cos(b) * r, cy + Math.sin(b) * r]], cols[i % cols.length]); } },
      flame: (cx, cy, w, h, cols) => { const p = []; for (let i = 0; i <= 20; i++) { const t = i / 20, a = t * Math.PI; p.push([cx + Math.sin(a) * w * (1 - t * 0.7), cy + (1 - Math.cos(a)) * 0.5 * h]); } const q = p.map(([x, y]) => [cx - (x - cx), y]).reverse(), all = [...p, ...q.slice(1)]; gl(all, cols[0]); gl(all.map(([x, y]) => [cx + (x - cx) * 0.5, cy + (y - cy) * 0.45]), cols[1]); },
      leaf: (cx, cy, len, w, a, col, wave = true) => gl(rot(leafPts(len, w, wave), a, cx, cy), col),
      holly: (cx, cy, len, w, a, col) => gl(rot(hollyPts(len, w), a, cx, cy), col),
      feather: (cx, cy, len, w, a, col) => gl(rot(featherPts(len, w), a, cx, cy), col),
      heart: (cx, cy, s, col) => gl(heartPts(cx, cy, s), col),
      line: (pts, w = 0.035, col = '#c8b890') => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0) || 1e-9, nx = (-(y1 - y0) / len) * w, ny = ((x1 - x0) / len) * w; gl([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col); } },
      // 横の帯に切り分ける（玉飾りのしま模様など）
      bands: (p, ys, cols) => { const all = [-1e9, ...ys, 1e9]; for (let i = 0; i < all.length - 1; i++) gl(clip(clip(p, 0, -1, -all[i]), 0, 1, all[i + 1]), cols[i % cols.length]); },
      cloud: (cx, cy, w, h, cols) => { const n = 5; for (let i = 0; i < n; i++) { const t = i / (n - 1), x = cx + (t - 0.5) * w, r = h * (0.55 + Math.sin(t * Math.PI) * 0.6); gl(circlePts(x, cy + r * 0.35, r, r * 0.8, 20), cols[i % cols.length]); } gl(rectP(cx - w * 0.55, cy - h * 0.25, cx + w * 0.55, cy + h * 0.2), cols[0]); },
      snowflake: (cx, cy, r, cols, w = 0.045) => { for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), arm = (t) => [cx + ca * t * r, cy + sa * t * r];
        o.line([arm(0.18), arm(1)], w, cols[k % 2]); for (const t of [0.45, 0.72]) { const b = arm(t); for (const s of [-1, 1]) { const ba = a + s * 0.9; o.line([b, [b[0] + Math.cos(ba) * r * (0.4 - t * 0.25), b[1] + Math.sin(ba) * r * (0.4 - t * 0.25)]], w * 0.75, cols[2 % cols.length]); } }
        gl(rot([[r * 1.0, 0], [r * 1.12, r * 0.06], [r * 1.22, 0], [r * 1.12, -r * 0.06]], a, cx, cy), cols[1 % cols.length]); }
        gl(Array.from({ length: 6 }, (_, i) => [cx + Math.cos((i / 6) * TAU) * r * 0.2, cy + Math.sin((i / 6) * TAU) * r * 0.2]), '#ffffff'); },
      pine: (cx, cy, w, h, cols) => { for (let i = 0; i < 3; i++) { const y0 = cy + (h * i) / 3.4, y1 = y0 + h * 0.5, ww = w * (1 - i * 0.24); gl([[cx - ww, y0], [cx + ww, y0], [cx, y1]], cols[i % cols.length]); } },
      ink: (pts, w = 0.012, col = 'rgba(50,25,10,.8)') => inkRaw(P(pts), w * sc, col),
      glow: (cx, cy, r, col, a = 0.4) => { const [x, y] = M([cx, cy]); glows.push([x, y, r * sc, col, a]); },
      // 背景：モザイク（種を2回ならして、大きさをそろえる）
      mosaic: (n, pal, focus, glR = 1.7, mix = 0.7, alt) => { let seeds = []; while (seeds.length < n) { const x = F.x0 + rr() * (F.x1 - F.x0), y = F.y0 + rr() * (F.y1 - F.y0); if (F.inside(x, y)) seeds.push([x, y]); } for (let k = 0; k < 2; k++) seeds = voronoi(seeds, bound).map(centroid); for (const c of voronoi(seeds, bound)) glass(c, pick(pal, centroid(c), focus, glR, mix, alt)); },
      // 背景：焦点を囲む輪（後光）
      rings: (focus, step, seg, pal, glR = 1.7, mix = 0.5) => { const [fx, fy] = focus; for (let r0 = 0; r0 < 4; r0 += step) { const r1 = r0 + step, n = Math.max(6, Math.round((TAU * (r0 + r1)) / 2 / seg)), off = rr() * TAU;
        for (let i = 0; i < n; i++) { const a0 = off + (i / n) * TAU, a1 = off + ((i + 1) / n) * TAU, pts = []; for (let k = 0; k <= 4; k++) { const a = a0 + ((a1 - a0) * k) / 4; pts.push([fx + Math.cos(a) * r1, fy + Math.sin(a) * r1]); } if (r0 > 0) for (let k = 4; k >= 0; k--) { const a = a0 + ((a1 - a0) * k) / 4; pts.push([fx + Math.cos(a) * r0, fy + Math.sin(a) * r0]); } else pts.push([fx, fy]);
          const p = clipConvex(pts, bound); if (p.length >= 3 && Math.abs(areaOf(p)) > 1e-4) glass(p, pick(pal, centroid(p), focus, glR, mix)); } } },
      // 背景：ひし形の格子（クォーリー）
      quarry: (q, pal, focus, glR = 1.7, mix = 0.6) => { for (let j = -2; j * q * 1.4 < F.y1 - F.y0 + 2 * q; j++) for (let i = -2; i * 2 * q < F.x1 - F.x0 + 2 * q; i++) { const cx = F.x0 + i * 2 * q + (j % 2 ? q : 0), cy = F.y0 + j * q * 1.4, p = clipConvex([[cx + q, cy], [cx, cy + q * 1.4], [cx - q, cy], [cx, cy - q * 1.4]], bound); if (p.length >= 3 && Math.abs(areaOf(p)) > 1e-4) glass(p, pick(pal, centroid(p), focus, glR, mix)); } },
      cells: (poly, n, cols) => { const Q = P(poly), [x0, y0, x1, y1] = bboxOf(Q); let seeds = []; for (let t = 0; seeds.length < n && t < n * 60; t++) { const x = x0 + rr() * (x1 - x0), y = y0 + rr() * (y1 - y0); if (pip(Q, x, y)) seeds.push([x, y]); }
        for (let k = 0; k < 2; k++) seeds = voronoi(seeds, Q).map(centroid); for (const c of voronoi(seeds, Q)) glass(c, cols[(rr() * cols.length) | 0]); },
      local: (ox, oy, s, ang = 0) => { const c = Math.cos(ang), si = Math.sin(ang); return mkG((q) => M([ox + (q[0] * c - q[1] * si) * s, oy + (q[0] * si + q[1] * c) * s]), sc * s); },
    };
    return o;
  };
  const G = mkG((q) => q, 1);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  d.draw(G);
  if (F.kind === 'arch') {
    // 縁：外の帯（2色）＋宝石・内の細い金の帯
    const NB = 40, J = d.jewel || ['#ffd23f', '#e0283c', '#3a8cff', '#2aa860'];
    for (let i = 0; i < NB; i++) glass(bandSeg(i / NB, (i + 1) / NB, 1, 0, 0.9, 0.1), d.border[i % d.border.length]);
    for (let i = 0; i < 24; i++) glass(bandSeg(i / 24, (i + 1) / 24, 0.9, 0.1, 0.87, 0.13), i % 2 ? '#e8c060' : '#c89838');
    for (let i = 0; i < NB; i += 2) { const [x, y] = archPtL((i + 0.5) / NB, 0.95, 0.05); glass(circlePts(x, y, 0.028, 0.028, 14), J[(i / 2) % J.length]); }
  }
  // 光のにじみ（月・星・炎のまわり）：かけらをまたいで、ほんのり明るく
  g.save(); path(g, F.outline); g.clip(); g.globalCompositeOperation = 'lighter';
  for (const [x, y, r, col, a] of glows) { const c = new THREE.Color(col), gr = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * sx); gr.addColorStop(0, `rgba(${(c.r * 255) | 0},${(c.g * 255) | 0},${(c.b * 255) | 0},${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(X(x) - r * sx, Y(y) - r * sx, r * sx * 2, r * sx * 2); }
  g.restore();
  // 上ほど、外の光で明るい
  const lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, 'rgba(255,255,255,.1)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(1, 'rgba(0,0,20,.1)'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
  path(l, F.outline); l.strokeStyle = '#17121c'; l.lineWidth = F.lead * 2 * sx; l.stroke();
  return { color: cv, lead: lv, pieces };
}
export function sampler(cv, F = ARCH) { const d = cv.getContext('2d').getImageData(0, 0, F.W, F.H).data, s = F.W / (F.x1 - F.x0); return (x, y) => { const i = (Math.min(F.H - 1, Math.max(0, Math.round((F.y1 - y) * s))) * F.W + Math.min(F.W - 1, Math.max(0, Math.round((x - F.x0) * s)))) * 4; return [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255]; }; }

// ---------- かけらの形（見えている所だけ）：細かい格子に、かけらを描いた順に番号を塗り（後のものが上）、つながった所ごとに輪郭をたどる ----------
// 重なって描いた形（背景の上に絵柄）でも、すき間なく、重ならずに分かれる。輪郭のがたつきは、鉛の線が隠す
function rdp(pts, eps) {   // 線をまびく（閉じた輪）
  if (pts.length < 5) return pts;
  const seg = (i0, i1, out) => { const a = pts[i0 % pts.length], b = pts[i1 % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9; let md = 0, mi = -1;
    for (let i = i0 + 1; i < i1; i++) { const q = pts[i % pts.length], dd = Math.abs((b[0] - a[0]) * (a[1] - q[1]) - (a[0] - q[0]) * (b[1] - a[1])) / L; if (dd > md) { md = dd; mi = i; } }
    if (md > eps) { seg(i0, mi, out); out.push(pts[mi % pts.length]); seg(mi, i1, out); } };
  let far = 0, fd = 0; for (let i = 1; i < pts.length; i++) { const dd = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (dd > fd) { fd = dd; far = i; } }
  const out = [pts[0]]; seg(0, far, out); out.push(pts[far]); seg(far, pts.length, out); return out;
}
export function buildPieces(pieces, F = ARCH) {
  const { RW, RH } = F, id = new Int16Array(RW * RH).fill(-1), kx = RW / (F.x1 - F.x0), ky = RH / (F.y1 - F.y0);
  // 塗りつぶし（走査線）：格子の中心が形の内側なら、その番号
  pieces.forEach(({ poly }, k) => {
    const P = poly.map(([x, y]) => [(x - F.x0) * kx - 0.5, (F.y1 - y) * ky - 0.5]); let j0 = 1e9, j1 = -1e9; for (const [, v] of P) { j0 = Math.min(j0, v); j1 = Math.max(j1, v); }
    for (let j = Math.max(0, Math.ceil(j0)); j <= Math.min(RH - 1, Math.floor(j1)); j++) { const xs = [];
      for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const [xa, ya] = P[a], [xb, yb] = P[b]; if (ya > j !== yb > j) xs.push(xa + ((j - ya) * (xb - xa)) / (yb - ya)); }
      xs.sort((p, q) => p - q); for (let m = 0; m + 1 < xs.length; m += 2) for (let i = Math.max(0, Math.ceil(xs[m])); i <= Math.min(RW - 1, Math.floor(xs[m + 1])); i++) id[j * RW + i] = k; }
  });
  for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) if (!F.inside(F.x0 + (i + 0.5) / kx, F.y1 - (j + 0.5) / ky)) id[j * RW + i] = -1;
  // つながった所ごとに番号（4近傍）
  const comp = new Int32Array(RW * RH).fill(-1), owners = []; let nc = 0;
  for (let s0 = 0; s0 < RW * RH; s0++) { if (id[s0] < 0 || comp[s0] >= 0) continue; const st = [s0]; comp[s0] = nc;
    while (st.length) { const q = st.pop(), i = q % RW, j = (q / RW) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= RW || jj >= RH) continue; const n = jj * RW + ii; if (comp[n] < 0 && id[n] === id[s0]) { comp[n] = nc; st.push(n); } } }
    owners.push(id[s0]); nc++; }
  const size = new Int32Array(nc); for (let s0 = 0; s0 < RW * RH; s0++) if (comp[s0] >= 0) size[comp[s0]]++;
  const cellsOf = Array.from({ length: nc }, () => []); for (let s0 = 0; s0 < RW * RH; s0++) if (comp[s0] >= 0 && size[comp[s0]] < F.minCells) cellsOf[comp[s0]].push(s0);
  for (let c = 0; c < nc; c++) { if (!cellsOf[c].length || size[c] >= F.minCells) continue; const cnt = new Map();
    for (const q of cellsOf[c]) { const i = q % RW, j = (q / RW) | 0; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= RW || jj >= RH) continue; const n = comp[jj * RW + ii]; if (n >= 0 && n !== c) cnt.set(n, (cnt.get(n) || 0) + 1); } }
    let best = -1, bc = 0; for (const [n, v] of cnt) if (v > bc) { bc = v; best = n; } if (best < 0) continue;
    for (const q of cellsOf[c]) comp[q] = best; size[best] += size[c]; size[c] = 0; if (best > c) cellsOf[best].push(...cellsOf[c]); }
  // 輪郭：画素の辺のうち、となりが別の所である辺を、時計回り（画面の下向き座標）でつなぐ。外の輪は面積が正、穴は負
  const edges = Array.from({ length: nc }, () => []), CW = RW + 1;
  for (let j = 0; j < RH; j++) for (let i = 0; i < RW; i++) { const c = comp[j * RW + i]; if (c < 0) continue; const nb = (ii, jj) => (ii < 0 || jj < 0 || ii >= RW || jj >= RH ? -2 : comp[jj * RW + ii]);
    if (nb(i, j - 1) !== c) edges[c].push([j * CW + i, j * CW + i + 1]); if (nb(i + 1, j) !== c) edges[c].push([j * CW + i + 1, (j + 1) * CW + i + 1]);
    if (nb(i, j + 1) !== c) edges[c].push([(j + 1) * CW + i + 1, (j + 1) * CW + i]); if (nb(i - 1, j) !== c) edges[c].push([(j + 1) * CW + i, j * CW + i]); }
  const toXY = ([x, y]) => [F.x0 + x / kx, F.y1 - y / ky];
  const parts = edges.map((E, c) => {
    const from = new Map(); E.forEach((e, k) => { if (!from.has(e[0])) from.set(e[0], []); from.get(e[0]).push(k); });
    const used = new Uint8Array(E.length), loops = [];
    for (let k0 = 0; k0 < E.length; k0++) { if (used[k0]) continue; const loop = []; let k = k0;
      while (k >= 0 && !used[k]) { used[k] = 1; const [a, b] = E[k]; loop.push(a); const cand = (from.get(b) || []).filter((m) => !used[m]); if (!cand.length) break;
        if (cand.length === 1) { k = cand[0]; continue; }
        const dx = (b % CW) - (a % CW), dy = ((b / CW) | 0) - ((a / CW) | 0); let best = cand[0], bs = -9;   // 分かれ道は、右へ曲がる方
        for (const m of cand) { const e1 = E[m][1], ex = (e1 % CW) - (b % CW), ey = ((e1 / CW) | 0) - ((b / CW) | 0), cr = dx * ey - dy * ex, sc = cr > 0 ? 2 : cr === 0 ? 1 : 0; if (sc > bs) { bs = sc; best = m; } }
        k = best; }
      if (loop.length >= 4) { const pts = rdp(loop.map((v) => [v % CW, (v / CW) | 0]), 0.75); let A = 0; for (let i = 0; i < pts.length; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length]; A += x0 * y1 - x1 * y0; } loops.push({ pts: pts.map(toXY), area: A / 2 }); } }
    if (!E.length) return null; const outer = loops.filter((L) => L.area > 0).sort((a, b) => b.area - a.area)[0]; if (!outer) return null;
    return { outer: outer.pts, holes: loops.filter((L) => L.area < 0).map((L) => L.pts), col: pieces[owners[c]].col, src: owners[c] };
  });
  return { comp, RW, RH, parts };
}

// ---------- 色 ----------（背景の後光用は、暗い→明るい）
const NAVY_G = ['#152c72', '#1a3584', '#21419a', '#2a50ae', '#3762c0', '#4a78d0', '#6490de'], PURPLE_G = ['#33196a', '#3e2080', '#4b278a', '#5a3298', '#6a3ea8', '#7c4eba', '#9466cc'];
const TEAL_G = ['#0f4a62', '#125672', '#166482', '#1a7290', '#20809e', '#2a92ae', '#40a8c0'], SKY_G = ['#2a68b0', '#3a7cc4', '#4a90d4', '#5ea4e2', '#78b8ec', '#96cdf4', '#b8e0fa'];
const AMBER_G = ['#7a4810', '#8a5616', '#9e641e', '#b87a28', '#cc9036', '#dea84c', '#ecc26c'], ICE_G = ['#0c3048', '#124464', '#1a5a80', '#26729c', '#3a8cb6', '#5aa8cc', '#86c4de'];
const NIGHT_G = ['#0e1748', '#121e56', '#162664', '#1c3074', '#243c88', '#30489c', '#3e58b0'];
const GOLD = ['#ffd23f', '#f0a020'], PALEGOLD = ['#f6e7a8', '#e9cf6a', '#fbf1c8'], RED = ['#e0283c', '#b81830'], GREEN = ['#2aa860', '#1a8048', '#38c070'], WHITE = ['#f4f2ea', '#d8dce8'];
const ORN = ['#e0283c', '#ffd23f', '#3a8cff', '#ff7ab0', '#f4f2ea', '#8a5ad8', '#2aa860'];

// ---------- 12枚の絵柄（fx＝戻る時の光の姿） ----------
export const DESIGNS = [
  { name: 'ベツレヘムの星', fx: 'star', border: ['#8a1424', '#c8902a'], draw: (G) => {
    G.rings([0, 2.25], 0.17, 0.3, NAVY_G, 1.9, 0.45);
    G.poly([[-0.05, 2.0], [0.05, 2.0], [0.3, 0.62], [-0.3, 0.62]], '#e8d690');   // 星から降りる光の道
    G.rays(0, 2.25, 0.44, 0.74, 24, ['#f3e2a0', '#8ab8e8', '#fbf1c8', '#6a9ad8'], 0.13); G.star(0, 2.25, 0.5, 0.19, 8, GOLD); G.star(0, 2.25, 0.2, 0.09, 8, ['#fff8dc', '#ffe58a']); G.circle(0, 2.25, 0.055, '#ffffff', 14);
    [[-0.6, 2.98, 0.09], [0.6, 3.02, 0.08], [-0.7, 1.58, 0.08], [0.68, 1.72, 0.1], [-0.46, 1.22, 0.065], [0.5, 1.18, 0.06], [0, 3.18, 0.07], [-0.3, 2.95, 0.05], [0.32, 1.45, 0.05]].forEach(([x, y, r], i) => G.star(x, y, r, r * 0.42, i % 2 ? 4 : 5, ['#fff2b0', '#f0d060']));
    // 丘とベツレヘムの町
    G.poly([[-0.9, 0.1], [0.9, 0.1], [0.9, 0.64], [0.5, 0.8], [0.1, 0.7], [-0.3, 0.84], [-0.9, 0.62]], '#22385a'); G.poly([[-0.9, 0.1], [0.9, 0.1], [0.9, 0.42], [0.3, 0.5], [-0.4, 0.44], [-0.9, 0.52]], '#16263e');
    G.rect(-0.78, 0.5, -0.5, 0.86, '#3a3e6a'); G.poly(circlePts(-0.64, 0.86, 0.14, 0.12, 20).filter(([, y]) => y >= 0.859), '#55599a'); G.rect(-0.69, 0.6, -0.61, 0.72, '#ffcf5a'); G.rect(-0.56, 0.6, -0.52, 0.7, '#f0b040');
    G.rect(0.5, 0.48, 0.7, 1.02, '#34385e'); G.poly([[0.48, 1.02], [0.72, 1.02], [0.6, 1.18]], '#4a4e80'); G.rect(0.57, 0.74, 0.63, 0.86, '#ffcf5a');
    G.line([[0.36, 0.52], [0.38, 0.78], [0.41, 1.0]], 0.02, '#5a3a1a'); [0.3, 1.0, 1.9, 2.6, 3.3].forEach((a) => G.leaf(0.41, 1.0, 0.24, 0.05, a, '#1a6a48'));
    G.poly([[-0.34, 0.74], [0.34, 0.74], [0, 0.95]], '#8a5426'); G.rect(-0.27, 0.44, 0.27, 0.74, '#5a3416'); G.poly([[-0.15, 0.44], [0.15, 0.44], [0.15, 0.6], [0, 0.68], [-0.15, 0.6]], '#ffd26a');   // 馬小屋と、灯り
    G.ink([[-0.08, 0.5], [0.08, 0.5]], 0.012); G.ink([[-0.06, 0.54], [0.06, 0.53]], 0.01);
    G.glow(0, 0.56, 0.4, '#ffd27a', 0.35); G.glow(0, 2.25, 1.0, '#fff2b0', 0.32); } },
  { name: 'クリスマスツリー', fx: 'light', border: ['#1a6a40', '#c8902a'], jewel: ['#e0283c', '#ffd23f', '#f4f2ea'], draw: (G) => {
    G.mosaic(130, PURPLE_G, [0, 1.9], 1.8, 0.7);
    [[-0.66, 2.95], [0.64, 2.9], [-0.72, 1.6], [0.72, 1.8], [-0.5, 3.15], [0.4, 3.18]].forEach(([x, y], i) => G.snowflake(x, y, 0.08 + (i % 2) * 0.03, ['#f4fbff', '#d8eefc', '#e8f6ff'], 0.022));
    G.poly([[-0.9, 0.1], [0.9, 0.1], [0.9, 0.4], [0.4, 0.48], [-0.2, 0.42], [-0.9, 0.48]], '#e8eef8'); G.poly([[-0.9, 0.1], [0.9, 0.1], [0.9, 0.24], [-0.9, 0.28]], '#c4d0e8');
    G.rect(-0.1, 0.4, 0.1, 0.64, '#7a4a20');
    for (const [y0, y1, w] of [[0.6, 1.34, 0.8], [1.1, 1.84, 0.66], [1.6, 2.32, 0.52], [2.08, 2.74, 0.38]]) {
      G.poly([[0, y1], [-w, y0], [0, y0]], GREEN[0]); G.poly([[0, y1], [0, y0], [w, y0]], GREEN[1]);
      for (let k = 0; k < 4; k++) { const x = -w + ((k + 0.5) / 4) * 2 * w; G.poly(circlePts(x, y0, w / 4.2, 0.07, 14).filter(([, y]) => y <= y0 + 0.001), '#156a3c'); }   // 枝先のふくらみ
      G.line([[-w * 0.78, y0 + 0.14], [w * 0.55, y0 + 0.36]], 0.018, '#f0c84a'); }
    [[-0.5, 0.82, 0], [0.42, 0.9, 1], [-0.22, 1.08, 2], [0.18, 1.2, 3], [-0.4, 1.36, 4], [0.36, 1.46, 0], [-0.12, 1.62, 5], [0.22, 1.74, 2], [-0.3, 1.9, 1], [0.12, 2.06, 3], [-0.08, 2.3, 0], [0.18, 2.42, 4]].forEach(([x, y, c]) => { G.circle(x, y, 0.058, ORN[c], 14); G.ellipse(x - 0.018, y + 0.02, 0.018, 0.012, '#ffffff', 0.5); });
    G.star(0, 2.86, 0.2, 0.08, 8, GOLD); G.circle(0, 2.86, 0.04, '#fff8dc', 10);
    G.rect(-0.72, 0.3, -0.42, 0.54, '#e0283c'); G.rect(-0.59, 0.3, -0.55, 0.54, '#ffd23f'); G.rect(-0.72, 0.4, -0.42, 0.44, '#ffd23f');
    G.rect(0.42, 0.3, 0.74, 0.5, '#2a6ad0'); G.rect(0.56, 0.3, 0.6, 0.5, '#f4f2ea'); G.rect(-0.38, 0.3, -0.2, 0.44, '#2aa860'); G.rect(-0.31, 0.3, -0.27, 0.44, '#ff7ab0');
    G.glow(0, 2.86, 0.5, '#fff0a0', 0.4); G.glow(0, 1.5, 0.9, '#ffe0a0', 0.12); } },
  { name: 'キャンドル', fx: 'light', border: ['#c8902a', '#8a1424'], draw: (G) => {
    G.mosaic(130, TEAL_G, [0, 2.1], 1.8, 0.7);
    [[-0.66, 2.9], [0.66, 2.95], [-0.2, 3.15], [0.68, 2.2], [-0.7, 2.3]].forEach(([x, y]) => G.star(x, y, 0.07, 0.03, 4, ['#fff6d0']));
    for (const [cx, top, cols, fh] of [[-0.42, 1.55, RED, 0.3], [0, 1.95, WHITE, 0.36], [0.42, 1.32, RED, 0.28]]) {
      G.rays(cx, top + fh * 0.55, 0.1, 0.36, 12, ['#f6e7a8', '#efd890', '#fbf1c8']);
      G.rect(cx - 0.15, 0.5, cx, top, cols[0]); G.rect(cx, 0.5, cx + 0.15, top, cols[1]);
      G.poly([[cx - 0.15, top], [cx - 0.15, top - 0.14], [cx - 0.1, top - 0.18], [cx - 0.06, top - 0.06], [cx - 0.02, top]], '#fff6ea'); G.poly([[cx + 0.04, top], [cx + 0.07, top - 0.22], [cx + 0.11, top - 0.26], [cx + 0.13, top - 0.1], [cx + 0.15, top]], '#fff6ea');   // ろうのしずく
      G.flame(cx, top + 0.02, 0.085, fh, ['#ff9a20', '#fff0a0']); G.line([[cx, top - 0.01], [cx, top + 0.05]], 0.008, '#3a2010'); G.glow(cx, top + fh * 0.45, 0.42, '#ffcf6a', 0.4); }
    G.ellipse(0, 0.48, 0.78, 0.075, '#e8b030'); G.ellipse(0, 0.5, 0.6, 0.035, '#fff0a8');
    [[-0.66, 0.42, 2.6], [-0.42, 0.36, 3.4], [0.66, 0.42, 0.55], [0.42, 0.36, -0.25], [-0.16, 0.34, 3.0], [0.16, 0.34, 0.15]].forEach(([x, y, a], i) => G.holly(x, y, 0.3, 0.08, a, GREEN[i % 2]));
    [[-0.52, 0.4], [-0.47, 0.34], [0.5, 0.4], [0.46, 0.34], [0, 0.36], [0.05, 0.32], [-0.05, 0.31]].forEach(([x, y]) => G.circle(x, y, 0.04, '#d81830', 10)); } },
  { name: 'ベル', fx: 'bell', border: ['#1a6a40', '#8a1424'], draw: (G) => {
    G.mosaic(130, NAVY_G, [0, 1.6], 1.8, 0.7);
    const bellR = [[0, -0.02], [0.36, -0.02], [0.3, 0.1], [0.25, 0.42], [0.18, 0.58], [0.08, 0.66], [0, 0.67]], bellL = bellR.map(([x, y]) => [-x, y]).reverse();
    for (const [cx, a] of [[-0.32, 0.3], [0.32, -0.3]]) { const B = G.local(cx, 1.2, 1, a);
      B.circle(0, -0.04, 0.075, '#a8700c', 12); B.poly(bellL, '#e09a18'); B.poly(bellR, '#ffd23f'); B.poly([[-0.37, -0.02], [0.37, -0.02], [0.33, 0.07], [-0.33, 0.07]], '#c8800c');
      B.poly([[-0.25, 0.3], [0.25, 0.3], [0.24, 0.36], [-0.24, 0.36]], '#fff0a0'); B.ellipse(0.12, 0.45, 0.03, 0.1, '#fff6d0', -0.2); B.circle(0, 0.7, 0.04, '#c8800c', 10); G.glow(cx, 1.45, 0.45, '#ffd860', 0.28); }
    [[-0.6, 1.95, 2.4], [-0.35, 2.15, 1.8], [0.6, 1.95, 0.75], [0.35, 2.15, 1.35]].forEach(([x, y, a], i) => G.holly(0.02 * Math.sign(x), 2.0, 0.42, 0.11, a + (i % 2) * 0.1, GREEN[i % 2]));
    G.ellipse(-0.2, 2.08, 0.2, 0.09, RED[0], 0.35); G.ellipse(0.2, 2.08, 0.2, 0.09, RED[1], -0.35); G.circle(0, 2.0, 0.075, '#e0283c', 14);
    G.poly([[-0.04, 1.95], [-0.2, 1.62], [-0.12, 1.58], [-0.08, 1.64]], RED[1]); G.poly([[0.04, 1.95], [0.2, 1.62], [0.12, 1.58], [0.08, 1.64]], RED[0]);
    [[-0.08, 1.98], [0.06, 2.06], [0.0, 1.92]].forEach(([x, y]) => G.circle(x, y, 0.035, '#ff4a5a', 8));
    for (const [x, y] of [[-0.62, 2.7], [0.58, 2.8], [-0.66, 0.7], [0.64, 0.62]]) { G.ellipse(x, y, 0.06, 0.042, '#ffe08a', -0.4); G.line([[x + 0.05, y + 0.02], [x + 0.05, y + 0.24]], 0.012, '#ffe08a'); G.poly([[x + 0.04, y + 0.24], [x + 0.18, y + 0.16], [x + 0.18, y + 0.1], [x + 0.06, y + 0.17]], '#ffe08a'); }   // 音符
    [[0, 2.85, 0.16], [-0.3, 3.1, 0.07], [0.3, 3.08, 0.07], [0, 0.55, 0.08]].forEach(([x, y, r]) => G.star(x, y, r, r * 0.35, 4, ['#fff6d0', '#ffe58a'])); } },
  { name: '天使', fx: 'feather', border: ['#c8902a', '#5a3aa8'], jewel: ['#bfe6ff', '#ffd23f', '#ff9ac8'], draw: (G) => {
    G.mosaic(130, NAVY_G, [0, 2.4], 1.7, 0.6);
    G.rays(0, 2.28, 0.24, 0.62, 18, PALEGOLD);
    // 翼：外の列（長い）→ 内の列。羽根を1枚ずつ
    for (const s of [-1, 1]) for (const [row, n, len, col] of [[0, 7, 0.72, ['#bfe6ff', '#9fd2f6']], [1, 6, 0.5, ['#e4f4ff', '#c8e6fa']], [2, 5, 0.3, ['#ffffff', '#eef8ff']]]) for (let k = 0; k < n; k++) {
      const a = s > 0 ? -0.55 + (k / (n - 1)) * 1.55 : Math.PI + 0.55 - (k / (n - 1)) * 1.55, L = len * (0.75 + 0.25 * Math.sin((k / (n - 1)) * Math.PI)); G.feather(s * (0.12 + row * 0.03), 2.0 - row * 0.02, L, 0.075 - row * 0.012, a, col[k % 2]); }
    G.poly([[0, 2.02], [-0.56, 0.45], [-0.3, 0.45]], '#eee6cc'); G.poly([[0, 2.02], [-0.3, 0.45], [-0.06, 0.45]], '#fbf6e6'); G.poly([[0, 2.02], [-0.06, 0.45], [0.2, 0.45]], '#f2ead2'); G.poly([[0, 2.02], [0.2, 0.45], [0.56, 0.45]], '#e2d8ba');
    G.poly([[-0.58, 0.45], [0.58, 0.45], [0.56, 0.54], [-0.56, 0.54]], '#e8b030'); G.ink([[-0.12, 1.7], [-0.2, 0.6]], 0.01, 'rgba(120,100,60,.5)'); G.ink([[0.1, 1.7], [0.16, 0.6]], 0.01, 'rgba(120,100,60,.5)');
    G.line([[0.08, 1.74], [0.36, 1.92], [0.66, 2.16]], 0.022, '#ffd23f'); G.poly([[0.62, 2.12], [0.8, 2.36], [0.86, 2.22]], '#f0b030'); G.line([[-0.1, 1.76], [0.1, 1.76]], 0.04, '#f2ead2');   // ラッパと腕
    G.ellipse(0, 2.26, 0.2, 0.21, '#f0c040'); G.circle(0, 2.2, 0.15, '#f6d6b6', 20);
    G.ink([[-0.08, 2.22], [-0.04, 2.2], [-0.01, 2.22]], 0.012); G.ink([[0.02, 2.22], [0.05, 2.2], [0.08, 2.22]], 0.012); G.ink([[-0.03, 2.12], [0, 2.1], [0.03, 2.12]], 0.01, 'rgba(160,60,60,.7)');
    G.ring(0, 2.5, 0.2, 0.14, 10, GOLD, 0.02); G.glow(0, 2.5, 0.35, '#fff2b0', 0.35);
    G.cloud(-0.45, 0.32, 0.6, 0.12, ['#e8f0fa', '#cfdcf0']); G.cloud(0.45, 0.3, 0.6, 0.12, ['#dce8f6', '#c4d4ec']);
    [[-0.66, 2.95, 0.1], [0.62, 2.98, 0.12], [-0.7, 1.2, 0.07], [0.7, 1.25, 0.07]].forEach(([x, y, r]) => G.star(x, y, r, r * 0.42, 5, GOLD)); } },
  { name: '雪の結晶', fx: 'snow', border: ['#e8f2ff', '#3a7ac0'], jewel: ['#bfe6ff', '#ffffff', '#8ac8ff'], draw: (G) => {
    G.rings([0, 1.75], 0.16, 0.28, ICE_G, 1.8, 0.45);
    G.snowflake(0, 1.75, 0.82, ['#f4fbff', '#d8eefc', '#e8f6ff'], 0.05);
    G.ring(0, 1.75, 0.3, 0.2, 12, ['#bfe2f8', '#e8f6ff'], 0.03); G.star(0, 1.75, 0.19, 0.08, 6, ['#ffffff', '#cfeaff']);
    [[-0.56, 0.7, 0.2], [0.56, 0.62, 0.17], [-0.54, 2.92, 0.17], [0.54, 2.86, 0.2], [0, 0.42, 0.12], [0, 3.16, 0.11]].forEach(([x, y, r]) => G.snowflake(x, y, r, ['#f4fbff', '#d8eefc', '#e8f6ff'], 0.022));
    G.glow(0, 1.75, 0.9, '#e8f6ff', 0.3); } },
  { name: 'リース', fx: 'heart', border: ['#8a1424', '#1a6a40'], jewel: ['#ffd23f', '#ff7ab0', '#f4f2ea'], draw: (G) => {
    G.mosaic(130, NAVY_G, [0, 1.75], 1.6, 0.6);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * TAU, r = 0.6; G.leaf(Math.cos(a) * r, 1.75 + Math.sin(a) * r, 0.3, 0.07, a + 2.0, GREEN[k % 3]); }
    for (let k = 0; k < 20; k++) { const a = ((k + 0.5) / 20) * TAU, r = 0.46; G.leaf(Math.cos(a) * r, 1.75 + Math.sin(a) * r, 0.24, 0.06, a + 1.9, GREEN[(k + 1) % 3]); }
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + 0.6, r = 0.55, x = Math.cos(a) * r, y = 1.75 + Math.sin(a) * r; [[0, 0], [0.05, 0.03], [0.02, -0.05]].forEach(([dx, dy]) => G.circle(x + dx, y + dy, 0.035, '#e0283c', 10)); }
    [[-0.5, 2.1], [0.52, 2.0], [0.0, 2.38]].forEach(([x, y]) => { G.ellipse(x, y, 0.05, 0.075, '#8a5a30', 0.3); G.ink([[x - 0.03, y], [x + 0.03, y + 0.02]], 0.008); });
    G.heart(0, 1.78, 0.3, '#ff6aa0'); G.heart(0, 1.8, 0.17, '#ffa8c8'); G.glow(0, 1.75, 0.5, '#ff9ac0', 0.3);
    G.ellipse(-0.18, 1.12, 0.18, 0.08, RED[0], 0.35); G.ellipse(0.18, 1.12, 0.18, 0.08, RED[1], -0.35); G.circle(0, 1.08, 0.06, '#e0283c', 12);
    G.poly([[-0.04, 1.04], [-0.24, 0.66], [-0.15, 0.62], [-0.1, 0.7]], RED[1]); G.poly([[0.04, 1.04], [0.24, 0.66], [0.15, 0.62], [0.1, 0.7]], RED[0]);
    [[-0.62, 2.95], [0.62, 2.95], [-0.68, 0.6], [0.68, 0.6], [0, 3.15]].forEach(([x, y], i) => i % 2 ? G.heart(x, y, 0.07, '#ff8ab8') : G.star(x, y, 0.08, 0.035, 5, GOLD)); } },
  { name: 'オーナメント', fx: 'light', border: ['#c8902a', '#1a7a9a'], draw: (G) => {
    G.mosaic(130, PURPLE_G, [0, 1.8], 1.8, 0.7);
    [[-0.6, 2.6], [0.62, 2.7], [0, 0.5], [-0.62, 0.62], [0.62, 0.6]].forEach(([x, y]) => G.snowflake(x, y, 0.09, ['#f4fbff', '#d8eefc', '#e8f6ff'], 0.022));
    for (const [x, y, r, cols] of [[-0.44, 1.5, 0.28, ['#e0283c', '#ffd23f', '#b81830']], [0.42, 1.2, 0.32, ['#2a6ad0', '#f4f2ea', '#1a4aa8']], [0.04, 2.08, 0.25, ['#ffd23f', '#e0283c', '#f0a020']]]) {
      G.line([[x, y + r + 0.08], [x, 3.28]], 0.012, '#d8c890');
      G.bands(circlePts(x, y, r, r, 30), [y - r * 0.35, y - r * 0.12, y + r * 0.12, y + r * 0.35], [cols[0], cols[1], cols[2], cols[1], cols[0]]);
      G.rect(x - 0.07, y + r - 0.02, x + 0.07, y + r + 0.1, '#e8c060'); G.ring(x, y + r + 0.12, 0.035, 0.018, 6, ['#e8c060'], 0); G.ellipse(x - r * 0.38, y + r * 0.42, r * 0.16, r * 0.08, '#ffffff', 0.7); G.glow(x, y, r * 1.5, '#ffffff', 0.12); }
    G.poly([[-0.62, 2.0], [-0.55, 1.95], [-0.62, 1.2], [-0.69, 1.95]], '#cfeaff'); G.line([[-0.62, 2.0], [-0.62, 3.2]], 0.01, '#d8c890');
    G.star(0.64, 2.25, 0.13, 0.055, 5, GOLD); G.line([[0.64, 2.38], [0.64, 3.2]], 0.01, '#d8c890'); } },
  { name: 'ヒイラギとコマドリ', fx: 'heart', border: ['#8a1424', '#1a6a40'], draw: (G) => {
    G.quarry(0.17, AMBER_G, [0, 1.7], 1.9, 0.7);
    G.line([[-0.86, 0.85], [-0.3, 1.0], [0.3, 1.18], [0.86, 1.3]], 0.03, '#5a3a1a'); G.line([[0.2, 1.15], [0.45, 0.95]], 0.02, '#5a3a1a');
    // コマドリ
    G.leaf(-0.06, 1.38, 0.3, 0.06, Math.PI + 0.5, '#6a4426', false); G.ellipse(0.12, 1.42, 0.2, 0.15, '#8a5a32', 0.15); G.ellipse(0.2, 1.38, 0.12, 0.1, '#e05030', 0.3); G.circle(0.3, 1.56, 0.09, '#7a4e2c', 18);
    G.poly([[0.38, 1.58], [0.46, 1.55], [0.38, 1.53]], '#e8a030'); G.circle(0.32, 1.59, 0.018, '#1a1010', 8); G.ellipse(0.05, 1.45, 0.12, 0.06, '#6a4024', 0.4); G.line([[0.1, 1.28], [0.08, 1.18]], 0.008, '#3a2010'); G.line([[0.18, 1.28], [0.19, 1.2]], 0.008, '#3a2010');
    for (const [cx, cy, n, a0] of [[0, 2.45, 5, 0.3], [-0.5, 0.62, 4, 0.2], [0.55, 0.55, 3, 1.4]]) { for (let k = 0; k < n; k++) G.holly(cx, cy, 0.42, 0.11, a0 + (k / n) * TAU, GREEN[k % 2]); [[0, 0], [0.06, 0.04], [-0.05, 0.05], [0.02, -0.06]].forEach(([dx, dy]) => G.circle(cx + dx, cy + dy, 0.045, '#d81830', 10)); }
    G.glow(0, 2.45, 0.5, '#fff0c0', 0.2); } },
  { name: 'ハト', fx: 'feather', border: ['#f4f2ea', '#c8902a'], jewel: ['#3a8cff', '#ffd23f', '#f4f2ea'], draw: (G) => {
    G.rings([0, 2.75], 0.17, 0.3, SKY_G, 2.4, 0.4);
    G.rays(0, 2.75, 0.24, 0.6, 18, ['#fff6c8', '#ffeaa0', '#fff9dc']); G.circle(0, 2.75, 0.22, '#fff8d8', 24); G.glow(0, 2.75, 0.8, '#fff6c8', 0.35);
    G.feather(-0.24, 1.58, 0.42, 0.08, Math.PI + 0.25, '#e8eef8'); G.feather(-0.22, 1.56, 0.36, 0.07, Math.PI + 0.05, '#f4f6fa'); G.feather(-0.22, 1.6, 0.36, 0.07, Math.PI + 0.45, '#dfe6f2');   // 尾
    for (let k = 0; k < 6; k++) G.feather(0.02, 1.72, 0.55 + k * 0.07, 0.07, 1.9 + k * 0.17, k % 2 ? '#eef2f8' : '#ffffff');   // 上の翼
    G.ellipse(0.08, 1.6, 0.36, 0.17, '#ffffff', 0.1); G.circle(0.42, 1.76, 0.11, '#f8f8fa', 18); G.poly([[0.52, 1.79], [0.64, 1.75], [0.52, 1.72]], '#e8a030'); G.circle(0.44, 1.79, 0.018, '#1a1420', 8);
    for (let k = 0; k < 4; k++) G.feather(0.0, 1.58, 0.36 + k * 0.05, 0.06, -2.5 + k * 0.18, k % 2 ? '#dfe6f2' : '#eef2f8');   // 下の翼
    G.line([[0.6, 1.74], [0.78, 1.5], [0.84, 1.24]], 0.016, '#5a7a30'); [[0.72, 1.6, 0.3], [0.82, 1.42, -0.4], [0.79, 1.32, 0.7], [0.86, 1.24, -0.2], [0.68, 1.66, -0.6]].forEach(([x, y, a], i) => G.leaf(x, y, 0.16, 0.042, a, GREEN[i % 2], false));
    G.cloud(-0.42, 0.42, 0.7, 0.14, ['#ffffff', '#e8f0fa']); G.cloud(0.46, 0.34, 0.6, 0.12, ['#f4f8fc', '#dce8f6']); G.cloud(-0.5, 2.55, 0.5, 0.09, ['#ffffff', '#eef4fb']); } },
  { name: 'トナカイ', fx: 'bell', border: ['#8a1424', '#c8902a'], draw: (G) => {
    G.mosaic(130, NAVY_G, [0, 2.0], 1.8, 0.7);
    G.circle(-0.5, 2.95, 0.2, '#fbf1c8', 22); G.circle(-0.42, 3.0, 0.18, NAVY_G[2], 22); G.glow(-0.55, 2.92, 0.4, '#fff4d0', 0.25);   // 三日月
    [[0.55, 3.0, 0.08], [0.3, 3.18, 0.05], [0.7, 2.5, 0.06], [-0.72, 2.2, 0.05], [0.62, 1.8, 0.05]].forEach(([x, y, r]) => G.star(x, y, r, r * 0.4, 5, ['#fff2b0']));
    G.poly([[-0.9, 0.1], [0.9, 0.1], [0.9, 0.52], [0.3, 0.6], [-0.4, 0.52], [-0.9, 0.58]], '#e8eef8'); G.poly([[-0.9, 0.1], [0.9, 0.1], [0.9, 0.3], [-0.9, 0.34]], '#c4d0e8');
    G.pine(-0.66, 0.52, 0.2, 0.62, ['#0e4a32', '#13603e', '#187a4a']); G.pine(0.68, 0.5, 0.18, 0.56, ['#0e4a32', '#13603e', '#187a4a']);
    for (const s of [-1, 1]) { G.line([[s * 0.14, 2.05], [s * 0.38, 2.5], [s * 0.6, 2.72]], 0.05, '#e0c090'); G.line([[s * 0.27, 2.3], [s * 0.52, 2.36]], 0.04, '#e0c090'); G.line([[s * 0.42, 2.58], [s * 0.38, 2.86]], 0.04, '#e0c090'); G.line([[s * 0.52, 2.65], [s * 0.66, 2.9]], 0.035, '#e0c090');
      G.leaf(s * 0.3, 2.0, 0.24, 0.07, s > 0 ? 0.3 : Math.PI - 0.3, '#a86a3a'); G.leaf(s * 0.32, 2.0, 0.14, 0.035, s > 0 ? 0.3 : Math.PI - 0.3, '#e8b090'); }
    G.halves(0, 1.62, 0.34, 0.44, ['#b8763e', '#9a5a2a'], 0); G.ellipse(0, 1.32, 0.22, 0.17, '#e8c49a'); G.circle(0, 1.38, 0.09, '#ff2040', 16); G.ellipse(-0.025, 1.41, 0.025, 0.018, '#ffb0b8', 0.3); G.glow(0, 1.38, 0.32, '#ff4060', 0.45);
    for (const s of [-1, 1]) { G.circle(s * 0.13, 1.74, 0.06, '#ffffff', 12); G.circle(s * 0.125, 1.73, 0.035, '#1a1420', 10); }
    G.ink([[-0.06, 1.25], [0, 1.22], [0.06, 1.25]], 0.012); G.line([[-0.36, 1.08], [0, 1.0], [0.36, 1.08]], 0.05, '#c8102e');
    [-0.22, 0, 0.22].forEach((x) => { G.circle(x, 0.94, 0.06, '#ffd23f', 14); G.ink([[x - 0.03, 0.92], [x + 0.03, 0.92]], 0.012); G.glow(x, 0.94, 0.12, '#ffe080', 0.3); }); } },
  { name: 'プレゼント', fx: 'star', border: ['#8a1424', '#c8902a'], draw: (G) => {
    G.mosaic(130, TEAL_G, [0, 1.5], 1.8, 0.7);
    G.rect(-0.62, 0.3, 0.62, 0.96, '#d81830'); G.rect(-0.66, 0.96, 0.66, 1.08, '#b81830'); G.rect(-0.07, 0.3, 0.07, 1.08, GOLD[0]); G.rect(-0.62, 0.58, 0.62, 0.68, GOLD[1]);
    G.rect(-0.46, 1.08, 0.46, 1.58, '#2a6ad0'); G.rect(-0.5, 1.58, 0.5, 1.68, '#1a50b0'); [[-0.3, 1.2], [0.3, 1.24], [-0.25, 1.46], [0.24, 1.44], [0.0, 1.32]].forEach(([x, y]) => G.circle(x, y, 0.045, '#f4f2ea', 12)); G.rect(-0.06, 1.08, 0.06, 1.68, '#f4f2ea');
    G.rect(-0.3, 1.68, 0.3, 2.0, '#2aa860'); G.rect(-0.33, 2.0, 0.33, 2.08, '#1a8048'); G.bands(rectP(-0.3, 1.68, 0.3, 2.0), [1.76, 1.84, 1.92], ['#2aa860', '#f4f2ea']);
    G.ellipse(-0.2, 2.22, 0.2, 0.1, '#ff7ab0', 0.5); G.ellipse(0.2, 2.22, 0.2, 0.1, '#ff5a98', -0.5); G.circle(0, 2.12, 0.06, '#ff7ab0', 12);
    G.poly([[-0.04, 2.08], [-0.2, 1.98], [-0.16, 2.08]], '#ff5a98'); G.poly([[0.04, 2.08], [0.2, 1.98], [0.16, 2.08]], '#ff7ab0');
    [[-0.66, 2.7, 0.12], [0.62, 2.85, 0.14], [0, 2.95, 0.1], [-0.4, 3.1, 0.06], [0.36, 2.5, 0.06], [-0.7, 1.6, 0.07], [0.72, 1.4, 0.07]].forEach(([x, y, r]) => G.star(x, y, r, r * 0.38, 4, ['#fff6d0', '#ffe58a']));
    [[-0.55, 2.3, '#ffd23f'], [0.5, 2.3, '#ff7ab0'], [-0.3, 2.6, '#8ac8ff'], [0.25, 2.65, '#ffd23f'], [-0.75, 1.95, '#ff7ab0'], [0.75, 1.9, '#8ac8ff']].forEach(([x, y, c], i) => G.poly(rot([[0.05, 0], [0, 0.025], [-0.05, 0], [0, -0.025]], i, x, y), c));
    G.glow(0, 2.2, 0.4, '#ffe0f0', 0.25); G.glow(0, 0.7, 0.7, '#ffd0a0', 0.12); } },
];

// ---------- 天井の丸窓：サンタのそり ----------
// 大きな満月の前を、トナカイの引くそりが、星くずを引いて斜めに駆けのぼる。絵の「上」は、見上げた人の画面の上（正面を向いたまま見上げた時）
const MX = 0.06, MY = 0.04, TH = 0.52, P0 = [-0.56, -0.4], along = (t, off = 0) => [P0[0] + Math.cos(TH) * t - Math.sin(TH) * off, P0[1] + Math.sin(TH) * t + Math.cos(TH) * off];
const atL = (o, s, [x, y]) => [o[0] + (x * Math.cos(TH) - y * Math.sin(TH)) * s, o[1] + (x * Math.sin(TH) + y * Math.cos(TH)) * s];
function reindeer(L, nose, [B1, B2, B3]) {
  L.line([[-0.2, -0.06], [-0.4, -0.15], [-0.56, -0.1]], 0.055, B2); L.line([[0.16, -0.08], [0.34, -0.22], [0.48, -0.2]], 0.055, B2);   // 奥の脚
  L.leaf(-0.28, 0.07, 0.13, 0.045, Math.PI * 0.92, '#f4ead8', false);
  L.halves(0, 0, 0.32, 0.15, [B1, B2], 0); L.ellipse(0.02, -0.06, 0.2, 0.06, B3, 0);
  L.poly([[0.18, 0.08], [0.3, -0.03], [0.47, 0.22], [0.37, 0.3]], B1); L.ellipse(0.46, 0.31, 0.11, 0.075, B1, -0.35); L.ellipse(0.56, 0.27, 0.065, 0.05, B3, -0.35); L.circle(0.615, 0.262, 0.034, nose, 12);
  L.leaf(0.39, 0.37, 0.1, 0.032, 2.5, B2, false);
  L.line([[0.42, 0.38], [0.37, 0.52], [0.28, 0.62]], 0.035, '#f0d49a'); L.line([[0.385, 0.5], [0.46, 0.6]], 0.03, '#f0d49a'); L.line([[0.33, 0.57], [0.34, 0.68]], 0.03, '#f0d49a');
  L.line([[0.47, 0.37], [0.5, 0.52], [0.46, 0.66]], 0.035, '#dcb878'); L.line([[0.495, 0.5], [0.58, 0.57]], 0.03, '#dcb878');
  L.line([[-0.18, -0.08], [-0.36, -0.2], [-0.54, -0.18]], 0.06, B1); L.line([[0.18, -0.1], [0.36, -0.16], [0.52, -0.1]], 0.06, B1);   // 手前の脚（駆ける）
  for (const [x, y] of [[-0.56, -0.1], [0.48, -0.2], [-0.54, -0.18], [0.52, -0.1]]) L.circle(x, y, 0.035, '#2a1810', 8);
  L.line([[0.22, 0.17], [0.31, 0.0]], 0.035, '#c8102e'); L.line([[0.24, 0.06], [-0.24, 0.07]], 0.028, '#c8102e'); for (const x of [0.1, -0.05, -0.2]) L.circle(x, 0.065, 0.035, '#ffd23f', 12);
  L.ink([[0.47, 0.335], [0.475, 0.34]], 0.04, 'rgba(20,10,5,.9)');
}
function santaSleigh(L) {
  L.line([[-0.5, -0.1], [0.3, -0.1], [0.44, -0.04], [0.47, 0.06], [0.41, 0.12]], 0.026, '#f4c840'); L.line([[-0.32, -0.1], [-0.3, 0.03]], 0.02, '#d8a830'); L.line([[0.14, -0.1], [0.16, 0.03]], 0.02, '#d8a830');
  L.ellipse(-0.36, 0.36, 0.15, 0.19, '#8a5a30', 0.25); L.rect(-0.48, 0.48, -0.38, 0.6, '#2aa860'); L.rect(-0.44, 0.48, -0.42, 0.6, '#ffd23f'); L.rect(-0.36, 0.5, -0.26, 0.58, '#3a8cff'); L.rect(-0.32, 0.5, -0.3, 0.58, '#f4f2ea');
  L.ellipse(-0.1, 0.3, 0.14, 0.17, '#d0182c'); L.rect(-0.24, 0.2, 0.04, 0.25, '#1a1420'); L.rect(-0.13, 0.19, -0.07, 0.26, '#ffd23f');
  L.line([[-0.04, 0.4], [0.1, 0.37], [0.17, 0.34]], 0.04, '#d0182c'); L.line([[0.14, 0.36], [0.16, 0.32]], 0.03, '#f6f4ee'); L.circle(0.19, 0.33, 0.035, '#1a1420', 10);
  L.circle(-0.05, 0.52, 0.075, '#f6d2b0', 18); L.poly([[-0.12, 0.52], [0.02, 0.52], [0.03, 0.46], [-0.02, 0.39], [-0.08, 0.37], [-0.12, 0.43]], '#f6f4ee');
  L.poly([[-0.13, 0.56], [0.02, 0.58], [-0.06, 0.66], [-0.2, 0.72], [-0.26, 0.66]], '#d0182c'); L.line([[-0.14, 0.555], [0.03, 0.575]], 0.025, '#f6f4ee'); L.circle(-0.27, 0.66, 0.036, '#f6f4ee', 12);
  L.ink([[-0.02, 0.535], [-0.015, 0.54]], 0.03, 'rgba(20,10,5,.9)'); L.glow(0.0, 0.5, 0.03, '#ff9090', 0.5);
  L.poly([[-0.48, 0.02], [0.24, 0.02], [0.36, 0.1], [0.4, 0.24], [0.3, 0.22], [0.2, 0.12], [-0.18, 0.14], [-0.36, 0.34], [-0.5, 0.32], [-0.52, 0.14]], '#b8102a');
  L.line([[-0.5, 0.32], [-0.36, 0.34], [-0.18, 0.14], [0.2, 0.12], [0.3, 0.22], [0.4, 0.24]], 0.016, '#ffd23f'); L.circle(-0.14, 0.07, 0.04, '#ffd23f', 12); L.ink([[-0.3, 0.08], [-0.22, 0.12], [-0.2, 0.05]], 0.02, 'rgba(255,220,120,.7)');
}
export const CEILING = { name: 'サンタのそり', fx: 'bell', frame: ROSE, draw: (G) => {
  G.mosaic(300, NIGHT_G, [MX, MY], 1.05, 0.8, [['#2a1a5e', '#3a2270', '#241656'], 0.14]);
  // オーロラ（外側に、波打つ帯）
  for (const [a0, a1, r0, cols] of [[1.75, 3.5, 0.79, ['#14806e', '#1ea284', '#34c09c', '#22948e']], [4.9, 6.6, 0.79, ['#4a2a9a', '#6a40b8', '#3a5ac0', '#5a7ad0']]]) {
    const n = 18, w = (t) => r0 + 0.025 * Math.sin(t * 6), h = (t) => 0.05 + 0.03 * Math.sin(t * 4 + 1);
    for (let i = 0; i < n; i++) { const t0 = a0 + ((a1 - a0) * i) / n, t1 = a0 + ((a1 - a0) * (i + 1)) / n; G.poly([[Math.cos(t0) * w(t0), Math.sin(t0) * w(t0)], [Math.cos(t1) * w(t1), Math.sin(t1) * w(t1)], [Math.cos(t1) * (w(t1) + h(t1)), Math.sin(t1) * (w(t1) + h(t1))], [Math.cos(t0) * (w(t0) + h(t0)), Math.sin(t0) * (w(t0) + h(t0))]], cols[i % cols.length]); }
    const am = (a0 + a1) / 2; G.glow(Math.cos(am) * r0, Math.sin(am) * r0, 0.35, cols[2], 0.2); }
  // 星（月から離れた所に）
  for (let k = 0; k < 60; k++) { const a = G.rr() * TAU, r = 0.2 + G.rr() * 0.68, x = Math.cos(a) * r, y = Math.sin(a) * r, s = 0.014 + G.rr() * 0.022; if (Math.hypot(x - MX, y - MY) < 0.56) continue; G.star(x, y, s, s * 0.42, G.rr() < 0.5 ? 4 : 5, [G.rr() < 0.7 ? '#fff2b0' : '#c8dcff']); }
  // 満月：光の輪と、淡い色の小片の寄せ集め
  G.rays(MX, MY, 0.43, 0.54, 44, ['#2e3e8e', '#3a4aa0', '#28367e']); G.ring(MX, MY, 0.43, 0.405, 36, ['#e8e2c0', '#d6d0ac', '#f2ecd0'], 0.015);
  G.cells(circlePts(MX, MY, 0.41, 0.41, 56), 46, ['#fbf4d8', '#f6ecc8', '#efe4bc', '#fff8e4', '#f2e6c0']);
  [[-0.12, 0.16, 0.07], [0.2, -0.12, 0.09], [0.24, 0.22, 0.045], [-0.1, -0.2, 0.05], [0.0, 0.3, 0.035]].forEach(([x, y, r]) => G.ink(circlePts(MX + x, MY + y, r, r, 16).concat([[MX + x + r, MY + y]]), 0.012, 'rgba(170,150,100,.4)'));
  G.glow(MX, MY, 0.8, '#fff2c8', 0.32);
  // 星くずの道（そりの後ろから、下をまわって）
  for (let k = 0; k < 26; k++) { const u = k / 25, phi = ((214 + u * 135) * Math.PI) / 180, r = 0.73 + 0.035 * Math.sin(u * 8), s = 0.04 * (1 - u * 0.65), x = Math.cos(phi) * r, y = Math.sin(phi) * r, col = new THREE.Color('#ffd85a').lerp(new THREE.Color('#c8c0f0'), u);
    G.star(x, y, s, s * 0.4, 4, ['#' + col.getHexString()], phi); if (k % 3 === 0) G.glow(x, y, 0.08, '#ffe08a', 0.24 * (1 - u)); }
  // 手綱（金）→ トナカイ → そりとサンタ
  const deer = [0.52, 0.81, 1.1, 1.39].map((t, i) => along(t, i % 2 ? -0.03 : 0.03)), sleigh = along(0);
  G.line([atL(sleigh, 0.42, [0.19, 0.33]), ...deer.map((o) => atL(o, 0.26, [0.27, 0.1]))], 0.005, '#f4d070');
  deer.forEach((o, i) => reindeer(G.local(o[0], o[1], 0.26, TH), i === 3 ? '#ff2040' : '#2a1810', i % 2 ? ['#a8683a', '#82502e', '#e6cca4'] : ['#b8784a', '#8a5432', '#ecd4b0']));
  const [nx, ny] = atL(deer[3], 0.26, [0.615, 0.262]); G.glow(nx, ny, 0.08, '#ff5070', 0.6);
  santaSleigh(G.local(sleigh[0], sleigh[1], 0.42, TH));
  // 縁：宝石の帯と、細い金の輪
  const N = 64, J = ['#ffd23f', '#e0283c', '#3a8cff', '#2aa860'], seg = (r0, r1, a, b) => [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(b) * r0, Math.sin(b) * r0], [Math.cos(b) * r1, Math.sin(b) * r1], [Math.cos(a) * r1, Math.sin(a) * r1]];
  for (let i = 0; i < N; i++) G.poly(seg(0.93, 1.0, (i / N) * TAU, ((i + 1) / N) * TAU), ['#8a1424', '#c8902a', '#1a3a8a', '#c8902a'][i % 4]);
  for (let i = 0; i < 48; i++) G.poly(seg(0.915, 0.93, (i / 48) * TAU, ((i + 1) / 48) * TAU), i % 2 ? '#e8c060' : '#c89838');
  for (let i = 0; i < N; i += 2) { const a = ((i + 0.5) / N) * TAU; G.circle(Math.cos(a) * 0.965, Math.sin(a) * 0.965, 0.019, J[(i / 2) % 4], 12); }
} };
