// やわらかい形の道具：①距離の式で形を彫る（なめらかに混ぜる）②面に起こす（サーフェスネット）③格子で、つまむ・伸ばす・戻る
// 外部ライブラリなし。座標はすべて数（x, y, z）で扱う。

// ---------- ①距離の式（負＝内側）----------
export const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };   // なめらかな和（ねちゃっとつながる）
export const smax = (a, b, k) => -smin(-a, -b, k);                                                                             // なめらかな差（くぼみ）
export const sdSphere = (x, y, z, cx, cy, cz, r) => Math.hypot(x - cx, y - cy, z - cz) - r;
export const sdEllipsoid = (x, y, z, cx, cy, cz, rx, ry, rz) => {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz, k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / rx, py / ry, pz / rz);
  return k1 > 1e-6 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
};
export const sdCapsule = (x, y, z, ax, ay, az, bx, by, bz, ra, rb) => {   // 太さが変わるカプセル（腕・脚・しずく）
  const pax = x - ax, pay = y - ay, paz = z - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h);
};

export const sdRoundBox = (x, y, z, cx, cy, cz, bx, by, bz, r) => {   // 角の丸い箱（b＝半分の大きさ）
  const qx = Math.abs(x - cx) - bx + r, qy = Math.abs(y - cy) - by + r, qz = Math.abs(z - cz) - bz + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
};
export const sdTorusY = (x, y, z, cx, cy, cz, R, r) => Math.hypot(Math.hypot(x - cx, z - cz) - R, y - cy) - r;   // 横に寝た輪
export const sdTorusZ = (x, y, z, cx, cy, cz, R, r) => Math.hypot(Math.hypot(x - cx, y - cy) - R, z - cz) - r;   // こちらを向いた輪
export const sdRoundCyl = (x, y, z, cx, cy, cz, ra, h, rr) => {   // 縦の円柱（ra＝半径、h＝高さの半分、rr＝角の丸み）
  const dx = Math.hypot(x - cx, z - cz) - ra + rr, dy = Math.abs(y - cy) - h + rr;
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - rr;
};
export const sd2Capsule = (x, y, ax, ay, bx, by, r) => {   // 平面のカプセル（押し出し用）
  const pax = x - ax, pay = y - ay, bax = bx - ax, bay = by - ay, h = Math.min(1, Math.max(0, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h) - r;
};
export const sdStar2 = (x, y, r, rf) => {   // 五角の星（平面）
  const k1x = 0.809016994375, k1y = -0.587785252292; let px = Math.abs(x), py = y, d;
  d = 2 * Math.max(k1x * px + k1y * py, 0); px -= d * k1x; py -= d * k1y;
  d = 2 * Math.max(-k1x * px + k1y * py, 0); px -= d * -k1x; py -= d * k1y;
  px = Math.abs(px); py -= r;
  const bax = rf * -k1y - 0, bay = rf * k1x - 1, h = Math.min(r, Math.max(0, (px * bax + py * bay) / (bax * bax + bay * bay)));
  return Math.hypot(px - bax * h, py - bay * h) * Math.sign(py * bax - px * bay);
};
export const extrude = (d2, z, half, round) => {   // 平面の形に、厚みと丸みを付ける
  const wx = d2 + round, wy = Math.abs(z) - half + round;
  return Math.min(Math.max(wx, wy), 0) + Math.hypot(Math.max(wx, 0), Math.max(wy, 0)) - round;
};

// ---------- ②面に起こす（naive surface nets）----------
// 途中で一息つける形（重い作り直しを、何コマかに分ける）。ふつうに使う時は surfaceNets
export function* surfaceNetsSteps(f, min, max, n, colorFn) {   // colorFn(x,y,z)→[r,g,b]（0〜1）で、頂点に色
  const [nx, ny, nz] = n, dx = (max[0] - min[0]) / nx, dy = (max[1] - min[1]) / ny, dz = (max[2] - min[2]) / nz, sx = nx + 1, sy = ny + 1;
  const F = new Float32Array(sx * sy * (nz + 1)), P = (i, j, k) => i + sx * (j + sy * k);
  for (let k = 0; k <= nz; k++) { for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) F[P(i, j, k)] = f(min[0] + i * dx, min[1] + j * dy, min[2] + k * dz); if ((k & 3) === 3) yield; }
  const cell = new Int32Array(nx * ny * nz).fill(-1), C = (i, j, k) => i + nx * (j + ny * k), pos = [];
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]], cv = new Float32Array(8);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let mask = 0; for (let c = 0; c < 8; c++) { cv[c] = F[P(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]; if (cv[c] < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let ax = 0, ay = 0, az = 0, cnt = 0;
    for (const [a, b] of EDGES) { if ((cv[a] < 0) === (cv[b] < 0)) continue; const t = cv[a] / (cv[a] - cv[b]); ax += (a & 1) + ((b & 1) - (a & 1)) * t; ay += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; az += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; cnt++; }
    cell[C(i, j, k)] = pos.length / 3; pos.push(min[0] + (i + ax / cnt) * dx, min[1] + (j + ay / cnt) * dy, min[2] + (k + az / cnt) * dz);
  }
  // 向きは、並びで決まる（x・z軸の並びは＋向き、y軸の並びは−向きが表）。始点が内側なら、その軸の＋向きが外
  const idx = [], quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const f0 = F[P(i, j, k)] < 0;
    if (i < nx && j >= 1 && j < ny && k >= 1 && k < nz && (F[P(i + 1, j, k)] < 0) !== f0) quad(cell[C(i, j - 1, k - 1)], cell[C(i, j, k - 1)], cell[C(i, j, k)], cell[C(i, j - 1, k)], !f0);
    if (j < ny && i >= 1 && i < nx && k >= 1 && k < nz && (F[P(i, j + 1, k)] < 0) !== f0) quad(cell[C(i - 1, j, k - 1)], cell[C(i, j, k - 1)], cell[C(i, j, k)], cell[C(i - 1, j, k)], f0);
    if (k < nz && i >= 1 && i < nx && j >= 1 && j < ny && (F[P(i, j, k + 1)] < 0) !== f0) quad(cell[C(i - 1, j - 1, k)], cell[C(i, j - 1, k)], cell[C(i, j, k)], cell[C(i - 1, j, k)], !f0);
  }
  const p = new Float32Array(pos), nrm = new Float32Array(p.length), e = Math.min(dx, dy, dz) * 0.5;   // 法線は、式の傾き（なめらか）
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i], y = p[i + 1], z = p[i + 2], gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1;
    nrm[i] = gx / l; nrm[i + 1] = gy / l; nrm[i + 2] = gz / l; if (i % 6000 === 5997) yield;
  }
  let col = null; if (colorFn) { col = new Float32Array(p.length); for (let i = 0; i < p.length; i += 3) col.set(colorFn(p[i], p[i + 1], p[i + 2]), i); }
  return { pos: p, nrm, idx: new Uint32Array(idx), col };
}
export function surfaceNets(f, min, max, n, colorFn) { const g = surfaceNetsSteps(f, min, max, n, colorFn); let r = g.next(); while (!r.done) r = g.next(); return r.value; }
// 形のある範囲を、粗い格子で探す（小さな部品の面起こしを、その範囲だけにする）
export function boundsOf(f, min, max, n = 24, pad = 0.06) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9], s = [0, 1, 2].map((a) => (max[a] - min[a]) / n);
  for (let k = 0; k <= n; k++) for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const x = min[0] + i * s[0], y = min[1] + j * s[1], z = min[2] + k * s[2]; if (f(x, y, z) < Math.max(s[0], s[1], s[2])) { lo[0] = Math.min(lo[0], x); lo[1] = Math.min(lo[1], y); lo[2] = Math.min(lo[2], z); hi[0] = Math.max(hi[0], x); hi[1] = Math.max(hi[1], y); hi[2] = Math.max(hi[2], z); } }
  return lo[0] > hi[0] ? null : [lo.map((v, a) => Math.max(min[a], v - s[a] - pad)), hi.map((v, a) => Math.min(max[a], v + s[a] + pad))];
}

// ---------- ③格子のやわらかい体：つまむ・伸ばす・戻る ----------
// 形の中に、ばねでつないだ格子の点を並べ、面の頂点は、まわりの8点の動きに合わせて動く（自由変形）。
export class Lattice {
  constructor(f, min, max, h, binds) {
    this.h = h; this.min = min;
    const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1, cx = nx - 1, cy = ny - 1, cz = nz - 1;
    const act = new Uint8Array(cx * cy * cz), CI = (i, j, k) => i + cx * (j + cy * k);
    const mark = (px, py, pz) => { const i = Math.min(cx - 1, Math.max(0, Math.floor((px - min[0]) / h))), j = Math.min(cy - 1, Math.max(0, Math.floor((py - min[1]) / h))), k = Math.min(cz - 1, Math.max(0, Math.floor((pz - min[2]) / h))); act[CI(i, j, k)] = 1; };
    for (const verts of binds) for (let i = 0; i < verts.length; i += 3) mark(verts[i], verts[i + 1], verts[i + 2]);
    for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) if (f(min[0] + (i + 0.5) * h, min[1] + (j + 0.5) * h, min[2] + (k + 0.5) * h) < 0) act[CI(i, j, k)] = 1;
    const id = new Int32Array(nx * ny * nz).fill(-1), N3 = (i, j, k) => i + nx * (j + ny * k), rest = [];
    for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) if (act[CI(i, j, k)]) for (let c = 0; c < 8; c++) { const a = i + (c & 1), b = j + ((c >> 1) & 1), d = k + ((c >> 2) & 1), q = N3(a, b, d); if (id[q] < 0) { id[q] = rest.length / 3; rest.push(min[0] + a * h, min[1] + b * h, min[2] + d * h); } }
    this.N = rest.length / 3; this.r = new Float32Array(rest); this.x = new Float32Array(rest); this.v = new Float32Array(rest.length); this.acc = new Float32Array(rest.length);
    const sa = [], sb = [], sl = [], OFF = [];
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const n = Math.abs(dx) + Math.abs(dy) + Math.abs(dz); if (n >= 1 && n <= 2 && (dz > 0 || (dz === 0 && (dy > 0 || (dy === 0 && dx > 0))))) OFF.push([dx, dy, dz]); }
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = id[N3(i, j, k)]; if (a < 0) continue; for (const [dx, dy, dz] of OFF) { const ii = i + dx, jj = j + dy, kk = k + dz; if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue; const b = id[N3(ii, jj, kk)]; if (b < 0) continue; sa.push(a); sb.push(b); sl.push(h * Math.hypot(dx, dy, dz)); } }
    this.sa = new Int32Array(sa); this.sb = new Int32Array(sb); this.sl = new Float32Array(sl); this.E = sa.length;
    this.deg = new Float32Array(this.N); for (let e = 0; e < this.E; e++) { this.deg[sa[e]]++; this.deg[sb[e]]++; }
    this.dv = new Float32Array(this.N * 3); this.xr = new Float32Array(this.x);   // xr＝表示用（となりとならした形）
    this.bindings = binds.map((verts) => {   // 頂点ごとに、まわりの8点と重み
      const n = verts.length / 3, ids = new Int32Array(n * 8), w = new Float32Array(n * 8);
      for (let q = 0; q < n; q++) {
        const ux = (verts[q * 3] - min[0]) / h, uy = (verts[q * 3 + 1] - min[1]) / h, uz = (verts[q * 3 + 2] - min[2]) / h, i = Math.min(cx - 1, Math.max(0, Math.floor(ux))), j = Math.min(cy - 1, Math.max(0, Math.floor(uy))), k = Math.min(cz - 1, Math.max(0, Math.floor(uz))), fx = ux - i, fy = uy - j, fz = uz - k;
        for (let c = 0; c < 8; c++) { const bx = c & 1, by = (c >> 1) & 1, bz = (c >> 2) & 1; ids[q * 8 + c] = id[N3(i + bx, j + by, k + bz)]; w[q * 8 + c] = (bx ? fx : 1 - fx) * (by ? fy : 1 - fy) * (bz ? fz : 1 - fz); }
      }
      return { ids, w, n };
    });
    this.grabs = new Set(); this.t = 0;
    // 形を保つ／元に戻る／ゆらぎの収まり／つまむ強さ／ばねの伸び縮みの速さの減衰（cd）／となりとの速さの差をならす割合（xs）。
    // cd と xs は、細かいゆれ（となりどうしが逆に動く＝表面がギザギザになる）だけを消し、大きなプルンは残す
    // lim＝ばねが縮みすぎ・伸びすぎないよう、長さに上限下限（格子が折れ返って面がギザギザになるのを防ぐ）／rs＝表示の形をならす回数
    this.P = { ks: 40, kg: 6, c: 2.0, kp: 700, sub: 3, cd: 2.5, xs: 0.1, lim: 1, lmax: 2.6, rs: 3 };   // lmax＝ばねが伸びてよい上限（元の長さの何倍か）
  }
  nearest(px, py, pz) { let best = -1, bd = 1e9; for (let i = 0; i < this.N; i++) { const d = (this.x[i * 3] - px) ** 2 + (this.x[i * 3 + 1] - py) ** 2 + (this.x[i * 3 + 2] - pz) ** 2; if (d < bd) { bd = d; best = i; } } return best; }
  grab(px, py, pz, radius) {   // この点のまわりを、つまむ。つまんだ点から離れるほど弱く
    const ids = [], w = [], x0 = [];
    for (let i = 0; i < this.N; i++) { const d2 = (this.x[i * 3] - px) ** 2 + (this.x[i * 3 + 1] - py) ** 2 + (this.x[i * 3 + 2] - pz) ** 2; if (d2 < radius * radius * 2.2) { ids.push(i); w.push(Math.exp(-d2 / (radius * radius))); x0.push(this.x[i * 3], this.x[i * 3 + 1], this.x[i * 3 + 2]); } }
    const g = { ids: new Int32Array(ids), w: new Float32Array(w), x0: new Float32Array(x0), d: [0, 0, 0] }; this.grabs.add(g); return g;
  }
  release(g) { this.grabs.delete(g); }
  pokeAt(px, py, pz, radius, vx, vy, vz) { for (let i = 0; i < this.N; i++) { const d2 = (this.x[i * 3] - px) ** 2 + (this.x[i * 3 + 1] - py) ** 2 + (this.x[i * 3 + 2] - pz) ** 2, w = Math.exp(-d2 / (radius * radius)); if (w > 0.05) this.poke(i, vx * w, vy * w, vz * w); } }
  energy() { let e = 0; for (let i = 0; i < this.N * 3; i++) e = Math.max(e, Math.abs(this.v[i]) + Math.abs(this.x[i] - this.r[i]) * 4); return e; }   // 落ちついたかの目安
  poke(i, dx, dy, dz) { this.v[i * 3] += dx; this.v[i * 3 + 1] += dy; this.v[i * 3 + 2] += dz; }
  step(dt) {
    const { x, v, r, acc, N, sa, sb, sl, E, dv, deg } = this, { ks, kg, c, kp, sub, cd, xs, lim, lmax, rs } = this.P, h = dt / sub;
    for (let s = 0; s < sub; s++) {
      this.t += h;
      for (let i = 0; i < N * 3; i++) acc[i] = kg * (r[i] - x[i]) - c * v[i];
      for (let e = 0; e < E; e++) {
        const a = sa[e] * 3, b = sb[e] * 3, dx = x[b] - x[a], dy = x[b + 1] - x[a + 1], dz = x[b + 2] - x[a + 2], len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, rv = ((v[b] - v[a]) * dx + (v[b + 1] - v[a + 1]) * dy + (v[b + 2] - v[a + 2]) * dz) / len, f = (ks * (len - sl[e]) + cd * rv) / len;
        acc[a] += f * dx; acc[a + 1] += f * dy; acc[a + 2] += f * dz; acc[b] -= f * dx; acc[b + 1] -= f * dy; acc[b + 2] -= f * dz;
      }
      for (const g of this.grabs) for (let k = 0; k < g.ids.length; k++) { const i = g.ids[k] * 3, w = g.w[k] * kp; acc[i] += w * (g.x0[k * 3] + g.d[0] * g.w[k] - x[i]); acc[i + 1] += w * (g.x0[k * 3 + 1] + g.d[1] * g.w[k] - x[i + 1]); acc[i + 2] += w * (g.x0[k * 3 + 2] + g.d[2] * g.w[k] - x[i + 2]); }
      for (let i = 0; i < N * 3; i++) { let vv = v[i] + acc[i] * h; if (vv > 30) vv = 30; else if (vv < -30) vv = -30; v[i] = vv; x[i] += vv * h; }
      if (lim) for (let e = 0; e < E; e++) {   // 長さを 0.55〜lmax倍 に収める（半分ずつ動かす）
        const a = sa[e] * 3, b = sb[e] * 3, dx = x[b] - x[a], dy = x[b + 1] - x[a + 1], dz = x[b + 2] - x[a + 2], len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6, L0 = sl[e], t = len < L0 * 0.55 ? L0 * 0.55 : len > L0 * lmax ? L0 * lmax : len;
        if (t !== len) { const k = (0.5 * (len - t)) / len; x[a] += dx * k; x[a + 1] += dy * k; x[a + 2] += dz * k; x[b] -= dx * k; x[b + 1] -= dy * k; x[b + 2] -= dz * k; }
      }
      if (xs > 0) { dv.fill(0); for (let e = 0; e < E; e++) { const a = sa[e] * 3, b = sb[e] * 3; for (let k = 0; k < 3; k++) { const d = v[b + k] - v[a + k]; dv[a + k] += d; dv[b + k] -= d; } } for (let i = 0; i < N * 3; i++) v[i] += (xs * dv[i]) / deg[(i / 3) | 0]; }
    }
    // 表示用：ずれ（x−r）を、となりとならす（面のギザギザを見せない）
    const xr = this.xr; xr.set(x);
    for (let pass = 0; pass < rs; pass++) { dv.fill(0); for (let e = 0; e < E; e++) { const a = sa[e] * 3, b = sb[e] * 3; for (let k = 0; k < 3; k++) { dv[a + k] += xr[b + k] - r[b + k]; dv[b + k] += xr[a + k] - r[a + k]; } }
      for (let i = 0; i < N * 3; i++) xr[i] = r[i] + (xr[i] - r[i] + dv[i]) / (1 + deg[(i / 3) | 0]); }
  }
  deform(bi, rest, out) {   // 面の頂点（rest）を、いまの格子の形へ
    const { ids, w, n } = this.bindings[bi], x = this.xr;
    for (let q = 0; q < n; q++) { let px = 0, py = 0, pz = 0; for (let c = 0; c < 8; c++) { const i = ids[q * 8 + c] * 3, ww = w[q * 8 + c]; px += x[i] * ww; py += x[i + 1] * ww; pz += x[i + 2] * ww; } out[q * 3] = px; out[q * 3 + 1] = py; out[q * 3 + 2] = pz; }
  }
}
