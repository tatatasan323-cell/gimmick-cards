// 本物らしい内装の素材（手続きで描く・継ぎ目なくくり返せる）：大理石（白・黒）・クルミ材・絨毯の毛足・絹のダマスク・ヘアラインの金属
// どれも色の絵と、凹凸の絵（法線）を返す。凹凸は高さの絵から作る（細かい毛足・木目・浮き彫りの段差）
import * as THREE from 'three';

const TAU = Math.PI * 2;
// くり返せるノイズ：格子の番号を周期 P（横）・Q（縦）で折り返す。絵の端でつながるよう、座標の範囲は周期の整数倍にする
// 格子の値は、周期ごとに一度だけ乱数の表を作って引く（毎回 sin で作ると、512画素の大理石だけで1秒近くかかった）
const LAT = new Map();
const lattice = (P, Q) => { const k = P * 100003 + Q; let t = LAT.get(k); if (!t) { let s = (P * 7919 + Q * 104729) % 2147483647 || 1; t = new Float32Array(P * Q); for (let i = 0; i < t.length; i++) { s = (s * 16807) % 2147483647; t[i] = s / 2147483647; } LAT.set(k, t); } return t; };
function vn(x, y, P, Q = P) {
  const t = lattice(P, Q), xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % P) + P) % P, y0 = ((yi % Q) + Q) % Q, x1 = x0 + 1 === P ? 0 : x0 + 1, y1 = y0 + 1 === Q ? 0 : y0 + 1;
  const a = t[y0 * P + x0], b = t[y0 * P + x1], c = t[y1 * P + x0], d = t[y1 * P + x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, P, oct = 4, Q = P) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * vn(x * f, y * f, P * f, Q * f); a *= 0.5; f *= 2; } return s; }
const sat = (v) => Math.max(0, Math.min(1, v));
function tex(cv, srgb, rep) { const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(rep[0], rep[1]); return t; }
function canvasOf(W, H, fill) { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H); fill(img.data); g.putImageData(img, 0, 0); return c; }
// 高さ（0〜1・横W×縦H）から法線の絵。k＝凹凸の強さ。端はくり返しでつなぐ
export function normalFrom(hgt, W, H, k = 2) {
  return canvasOf(W, H, (d) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const at = (i, j) => hgt[((j + H) % H) * W + ((i + W) % W)], dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), o = (y * W + x) * 4;
    d[o] = (-dx / l * 0.5 + 0.5) * 255; d[o + 1] = (dy / l * 0.5 + 0.5) * 255; d[o + 2] = (1 / l * 0.5 + 0.5) * 255; d[o + 3] = 255; } });
}

// 大理石：白（カララ＝灰色の筋）と黒（ネロ・マルキーナ＝白い筋）を、同じ筋の形から。N＝画素、1枚＝1周期
export function marble(N = 512) {
  const w = new Float32Array(N * N), cl = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = (i / N) * 4, y = (j / N) * 4, qx = fbm(x, y, 4), qy = fbm(x + 5.2, y + 1.3, 4);
    const t = 0.5 * x + 1.0 * y + 2.4 * fbm(x + 3 * qx, y + 3 * qy, 4, 5), main = Math.pow(1 - Math.abs(Math.sin(t * Math.PI)), 26);
    const t2 = 1.0 * x - 0.5 * y + 3.0 * fbm(x * 2 + 7, y * 2 + 2, 8, 4), fine = Math.pow(1 - Math.abs(Math.sin(t2 * Math.PI * 2)), 60) * 0.55;
    w[j * N + i] = sat(main * (0.55 + 0.6 * fbm(x * 3, y * 3, 12, 3)) + fine); cl[j * N + i] = fbm(x * 1.5 + 9, y * 1.5, 6, 4);
  }
  const white = canvasOf(N, N, (d) => { for (let k = 0; k < N * N; k++) { const v = w[k], c = cl[k], o = k * 4; d[o] = 240 - c * 22 - v * 120; d[o + 1] = 237 - c * 22 - v * 116; d[o + 2] = 232 - c * 18 - v * 104; d[o + 3] = 255; } });
  const black = canvasOf(N, N, (d) => { for (let k = 0; k < N * N; k++) { const v = w[k], c = cl[k], o = k * 4; d[o] = 22 + c * 14 + v * 190; d[o + 1] = 22 + c * 14 + v * 188; d[o + 2] = 26 + c * 16 + v * 184; d[o + 3] = 255; } });
  return { white: tex(white, true), black: tex(black, true) };
}

// クルミ材：木目（年輪の流れと、細い導管）。panel＝浮き彫りの鏡板の高さ（腰板・扉用）。vert＝木目を縦に（扉）
export function walnut(W = 512, H = 256, panel = null, vert = false) {
  const gr = new Float32Array(W * H), ht = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = vert ? (j / H) * 2 : (i / W) * 2, v = vert ? (i / W) * 8 : (j / H) * 8, ring = Math.sin((v + 1.6 * fbm(u * 1.5, v * 0.375, 3, 4)) * Math.PI * 3), pore = vn(u * 16, v * 160, 32, 1280) > 0.9 ? 1 : 0;
    gr[j * W + i] = sat(0.5 + 0.22 * ring + 0.3 * (fbm(u * 6, v * 1.5, 12, 3) - 0.5) + 0.12 * (vn(u * 3, v * 48, 6, 384) - 0.5)) * (1 - pore * 0.1);
    let h = 0.02 * pore; if (panel) h += panel(i / W, j / H); ht[j * W + i] = h;
  }
  const map = canvasOf(W, H, (d) => { for (let k = 0; k < W * H; k++) { const g = gr[k], o = k * 4, s = panel ? 1 - 0.25 * (1 - ht[k]) : 1; d[o] = (78 + g * 64) * s; d[o + 1] = (47 + g * 38) * s; d[o + 2] = (27 + g * 20) * s; d[o + 3] = 255; } });
  return { map: tex(map, true), normal: tex(normalFrom(ht, W, H, panel ? 24 : 6), false) };
}

// 絨毯（毛足のある赤いじゅうたん）：幅 Wm・長さ Lm を、N×N 画素の1枚でくり返す。両の縁に金糸の帯、地に細かな菱の地紋
export function carpet(N = 512, Wm = 2.4) {
  const ht = new Float32Array(N * N), col = new Float32Array(N * N * 3), s = N / Wm;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / s, z = j / s, e = Math.min(x, Wm - x), k = j * N + i;
    const a = i / N, bb = j / N, fib = vn(a * 460, bb * 460, 460) * 0.6 + vn(a * 128, bb * 128, 128) * 0.4, streak = vn(a * 24, bb * 600, 24, 600) - 0.5;
    let r = 0.47, g = 0.05, b = 0.09, raise = 0;
    if (e < 0.035) { r = 0.3; g = 0.03; b = 0.06; }
    else if (e < 0.11) { const dz = (z * 12.5) % 1, dx = (e - 0.035) / 0.075, dia = Math.abs(dz - 0.5) + Math.abs(dx - 0.5) < 0.38; r = dia ? 0.78 : 0.62; g = dia ? 0.56 : 0.42; b = dia ? 0.22 : 0.16; raise = 0.5; }
    else if (e < 0.13) { r = 0.3; g = 0.03; b = 0.06; }
    else { const p = 0.6, mz = ((z % p) + p) % p / p, mx = (((x - Wm / 2) / p) % 1 + 1) % 1, d = Math.abs(mz - 0.5) + Math.abs(mx - 0.5), ring = Math.abs(d - 0.33) < 0.025 || d < 0.06; if (ring) { r = 0.36; g = 0.03; b = 0.07; raise = -0.3; } }
    const f = 0.86 + 0.22 * fib + 0.06 * streak; col[k * 3] = r * f; col[k * 3 + 1] = g * f; col[k * 3 + 2] = b * f;
    ht[k] = fib * 0.7 + raise * 0.25 + streak * 0.1;
  }
  const map = canvasOf(N, N, (d) => { for (let k = 0; k < N * N; k++) { const o = k * 4; d[o] = Math.min(255, col[k * 3] * 255); d[o + 1] = Math.min(255, col[k * 3 + 1] * 255); d[o + 2] = Math.min(255, col[k * 3 + 2] * 255); d[o + 3] = 255; } });
  return { map: tex(map, true), normal: tex(normalFrom(ht, N, N, 3.2), false) };
}

// 絹のダマスク（壁張り）：同じ色の濃淡で浮かぶ唐草。光る向きは材質の「つや（sheen）」で
export function damask(N = 512) {
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, N, N); g.fillStyle = '#fff';
  const motif = (cx, cy, sc) => { g.save(); g.translate(cx, cy); g.scale(sc, sc);
    for (const m of [1, -1]) { g.save(); g.scale(m, 1); g.beginPath(); g.moveTo(0, -120); g.bezierCurveTo(60, -90, 30, -40, 70, -10); g.bezierCurveTo(100, 15, 60, 60, 20, 50); g.bezierCurveTo(45, 80, 20, 110, 0, 120); g.lineTo(0, -120); g.fill();
      g.beginPath(); g.moveTo(8, -60); g.bezierCurveTo(90, -100, 120, -20, 90, 20); g.bezierCurveTo(110, -30, 70, -60, 8, -50); g.fill(); g.restore(); }
    g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill(); g.restore(); };
  for (const [x, y] of [[N / 2, N / 2], [0, 0], [N, 0], [0, N], [N, N]]) motif(x, y, N / 560);
  g.globalAlpha = 0.6; for (const [x, y] of [[N / 2, 0], [N / 2, N], [0, N / 2], [N, N / 2]]) motif(x, y, N / 1300); g.globalAlpha = 1;
  const m = g.getImageData(0, 0, N, N).data, ht = new Float32Array(N * N);
  for (let k = 0; k < N * N; k++) { const i = k % N, j = (k / N) | 0; ht[k] = (m[k * 4] / 255) * 0.6 + vn((i / N) * 358, (j / N) * 358, 358) * 0.08 + Math.sin((j / N) * TAU * 160) * 0.02; }
  const map = canvasOf(N, N, (d) => { for (let k = 0; k < N * N; k++) { const a = m[k * 4] / 255, o = k * 4, n = 0.92 + 0.08 * vn((k % N) * 0.5, ((k / N) | 0) * 0.5, N / 2); d[o] = (24 + a * 12) * n; d[o + 1] = (31 + a * 15) * n; d[o + 2] = (62 + a * 24) * n; d[o + 3] = 255; } });
  return { map: tex(map, true), normal: tex(normalFrom(ht, N, N, 3), false) };
}

// ヘアライン（細かな筋目の金属）のざらつき：横に流れる筋
export function brushed(N = 256) {
  const c = canvasOf(N, N, (d) => { for (let j = 0; j < N; j++) { const row = vn(0.5, (j / N) * 200, 8, 200); for (let i = 0; i < N; i++) { const v = 0.18 + 0.22 * row + 0.08 * vn((i / N) * 8, (j / N) * 200, 8, 200), o = (j * N + i) * 4; d[o] = d[o + 1] = d[o + 2] = v * 255; d[o + 3] = 255; } } });
  return tex(c, false);
}

// お菓子の素材（sweets.js）でも使う
export { vn, fbm, canvasOf, tex as toTex };
