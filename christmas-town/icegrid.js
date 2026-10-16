// 削れる氷：形を「格子の点ごとの、表面までの距離（負＝氷の中）」として持つ。削る＝形の分だけ距離を外へ、戻る＝元の距離へ少しずつ
// 面は格子からそのまま起こす（サーフェスネット）。式を何度も計算しないので、削るたびに起こし直しても速い
// 削った後に宙に浮いた所・根元が細って支えきれない所は、切り離して落とす（split）
const smaxK = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };

export class IceGrid {
  constructor(f, min, max, h) {
    this.min = min; this.h = h; this.n = [0, 1, 2].map((a) => Math.ceil((max[a] - min[a]) / h)); this.sx = this.n[0] + 1; this.sy = this.n[1] + 1; this.sz = this.n[2] + 1;
    const N = this.sx * this.sy * this.sz; this.F = new Float32Array(N); this.T = new Float32Array(N);
    for (let k = 0; k < this.sz; k++) for (let j = 0; j < this.sy; j++) for (let i = 0; i < this.sx; i++) { const v = f ? Math.max(-0.6, Math.min(0.6, f(min[0] + i * h, min[1] + j * h, min[2] + k * h))) : 0.6; const q = i + this.sx * (j + this.sy * k); this.F[q] = v; this.T[q] = v; }
    this.border(); this.dirty = true;
  }
  // 外枠の点は、いつも外（面が閉じる）
  border() { for (let k = 0; k < this.sz; k++) for (let j = 0; j < this.sy; j++) for (let i = 0; i < this.sx; i++) if (!i || !j || !k || i === this.n[0] || j === this.n[1] || k === this.n[2]) { const q = i + this.sx * (j + this.sy * k); this.F[q] = this.T[q] = Math.max(this.F[q], 0.05); } }
  idx(i, j, k) { return i + this.sx * (j + this.sy * k); }
  sample(x, y, z, A = this.F) {
    const h = this.h, fx = Math.min(this.n[0] - 1e-4, Math.max(0, (x - this.min[0]) / h)), fy = Math.min(this.n[1] - 1e-4, Math.max(0, (y - this.min[1]) / h)), fz = Math.min(this.n[2] - 1e-4, Math.max(0, (z - this.min[2]) / h));
    const i = fx | 0, j = fy | 0, k = fz | 0, u = fx - i, v = fy - j, w = fz - k, sx = this.sx, sxy = sx * this.sy, q = i + sx * j + sxy * k;
    const c00 = A[q] * (1 - u) + A[q + 1] * u, c10 = A[q + sx] * (1 - u) + A[q + sx + 1] * u, c01 = A[q + sxy] * (1 - u) + A[q + sxy + 1] * u, c11 = A[q + sxy + sx] * (1 - u) + A[q + sxy + sx + 1] * u;
    return (c00 * (1 - v) + c10 * v) * (1 - w) + (c01 * (1 - v) + c11 * v) * w;
  }
  // 削る：fn(x,y,z)＝削る形の距離（負＝削る所）。範囲 [c-r, c+r] の中だけ見る。削れた量（体積のめやす）を返す
  carveFn(cx, cy, cz, r, fn, k = 0.04) {
    const h = this.h, i0 = Math.max(1, Math.floor((cx - r - this.min[0]) / h)), i1 = Math.min(this.n[0] - 1, Math.ceil((cx + r - this.min[0]) / h)), j0 = Math.max(1, Math.floor((cy - r - this.min[1]) / h)), j1 = Math.min(this.n[1] - 1, Math.ceil((cy + r - this.min[1]) / h)), k0 = Math.max(1, Math.floor((cz - r - this.min[2]) / h)), k1 = Math.min(this.n[2] - 1, Math.ceil((cz + r - this.min[2]) / h));
    let removed = 0;
    for (let kk = k0; kk <= k1; kk++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = this.idx(i, j, kk), d = -fn(this.min[0] + i * h, this.min[1] + j * h, this.min[2] + kk * h); if (d < -0.08) continue; const old = this.F[q], nv = smaxK(old, d, k); if (nv > old) { if (old < 0) removed += Math.min(nv, 0) - old; this.F[q] = nv; } }
    if (removed > 0) this.dirty = true; return removed;
  }
  carve(cx, cy, cz, r) { return this.carveFn(cx, cy, cz, r, (x, y, z) => Math.hypot(x - cx, y - cy, z - cz) - r, 0.05); }
  // 戻る：下から波のように。front＝波の高さ（y）。波のすぐ下は少し膨らんでから落ち着く。まだ戻っていない所があれば true
  regrowWave(front, speed, t) {
    let left = false; const F = this.F, T = this.T, h = this.h, m = this.min;
    for (let k = 1; k < this.n[2]; k++) for (let i = 1; i < this.n[0]; i++) { const x = m[0] + i * h, z = m[2] + k * h, wob = Math.sin(x * 4.1 + t * 3.2) * 0.07 + Math.sin(z * 3.3 - t * 2.6) * 0.07;
      for (let j = 1; j < this.n[1]; j++) { const q = this.idx(i, j, k); if (F[q] <= T[q] + 1e-4 && F[q] >= T[q] - 1e-4) continue; left = true; const y = m[1] + j * h, below = front + wob - y; if (below < 0) continue;
        const bulge = 0.045 * Math.exp(-(((below - 0.12) / 0.1) ** 2)), tgt = T[q] - bulge; F[q] = F[q] > tgt ? Math.max(tgt, F[q] - speed) : Math.min(tgt, F[q] + speed * 0.4); } }
    this.dirty = true; return left;
  }
  regrow(speed) { let left = false; const F = this.F, T = this.T; for (let q = 0; q < F.length; q++) if (F[q] > T[q]) { F[q] = Math.max(T[q], F[q] - speed); left = true; } this.dirty = true; return left; }
  carvedAmount() { let s = 0; for (let q = 0; q < this.F.length; q++) if (this.T[q] < 0 && this.F[q] > this.T[q]) s += Math.min(0, this.F[q]) - this.T[q] + Math.max(0, this.F[q]); return s; }
  raycast(o, d, maxT = 30) { let t = 0; for (let s = 0; s < 400 && t < maxT; s++) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t, v = this.sample(x, y, z); if (v < 0.002 && this.inside(x, y, z)) return { x, y, z, t }; t += Math.max(this.h * 0.35, v * 0.8); } return null; }
  inside(x, y, z) { const m = this.min, h = this.h; return x > m[0] + h && y > m[1] + h && z > m[2] + h && x < m[0] + this.n[0] * h - h && y < m[1] + this.n[1] * h - h && z < m[2] + this.n[2] * h - h; }
  normal(x, y, z) { const e = this.h * 0.6, gx = this.sample(x + e, y, z) - this.sample(x - e, y, z), gy = this.sample(x, y + e, z) - this.sample(x, y - e, z), gz = this.sample(x, y, z + e) - this.sample(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1; return [gx / l, gy / l, gz / l]; }

  // ---------- 崩れる ----------
  // 元の形での、段ごとの断面の広さと、その段より上の重さ（支えの基準。元の形は倒れない）
  baseline() { const L = this.layers(this.T, null); this.A0 = L.A; this.M0 = L.M; this.j0 = L.A.findIndex((a) => a > 0); }
  layers(A, mark) {
    const ny = this.sy, cnt = new Float64Array(ny), sx = new Float64Array(ny), sz = new Float64Array(ny);
    for (let k = 1; k < this.n[2]; k++) for (let j = 1; j < this.n[1]; j++) for (let i = 1; i < this.n[0]; i++) { const q = this.idx(i, j, k); if (A[q] >= 0 || (mark && !mark[q])) continue; cnt[j]++; sx[j] += i; sz[j] += k; }
    const M = new Float64Array(ny), MX = new Float64Array(ny), MZ = new Float64Array(ny); let m = 0, mx = 0, mz = 0; for (let j = ny - 1; j >= 0; j--) { M[j] = m; MX[j] = m ? mx / m : 0; MZ[j] = m ? mz / m : 0; m += cnt[j]; mx += sx[j]; mz += sz[j]; }
    return { A: cnt, M, MX, MZ };
  }
  // 床（いちばん下の段）からつながっている氷に印。印のない氷＝宙に浮いた所
  floodFromFloor() {
    // 床の段は、元の形のいちばん下（削って底が上がっても、床の段は変えない。変えると宙に浮いた像が「床についている」ことになる）
    const F = this.F, mark = new Uint8Array(F.length), stack = [], j0 = this.j0 > 0 ? this.j0 : 1;
    for (let j = 1; j <= Math.min(j0 + 1, this.n[1] - 1); j++) for (let k = 1; k < this.n[2]; k++) for (let i = 1; i < this.n[0]; i++) { const q = this.idx(i, j, k); if (F[q] < 0 && !mark[q]) { mark[q] = 1; stack.push(q); } }
    const sx = this.sx, sxy = sx * this.sy, nb = [1, -1, sx, -sx, sxy, -sxy];
    while (stack.length) { const q = stack.pop(); for (const d of nb) { const p = q + d; if (!mark[p] && F[p] < 0) { mark[p] = 1; stack.push(p); } } }
    return mark;
  }
  // 切り離す所を探す。返り値＝[{cells:Int32Array, crack:Int32Array|null, kind:'float'|'snap'|'topple', tilt:[x,z]}]。氷そのもの（F）は、まだ変えない
  findBreaks(minCells = 6) {
    const F = this.F, mark = this.floodFromFloor(), out = [];
    // ①宙に浮いた所（つながりごとに分ける）
    const seen = new Uint8Array(F.length), sx = this.sx, sxy = sx * this.sy, nb = [1, -1, sx, -sx, sxy, -sxy];
    for (let q = 0; q < F.length; q++) { if (F[q] >= 0 || mark[q] || seen[q]) continue; const cells = [q], st = [q]; seen[q] = 1; while (st.length) { const p = st.pop(); for (const d of nb) { const r = p + d; if (!seen[r] && !mark[r] && F[r] < 0) { seen[r] = 1; cells.push(r); st.push(r); } } } out.push({ cells: Int32Array.from(cells), crack: null, kind: cells.length >= minCells ? 'float' : 'dust', tilt: [0, 0] }); }
    // ②根元が細って支えきれない／重さが外へはみ出した段（いちばん弱い段で折る）
    if (!this.A0) return out;
    const L = this.layers(F, mark); let worst = null;
    for (let j = 2; j < this.n[1] - 2; j++) { const A = L.A[j], M = L.M[j]; if (M < 40 || !A || !this.A0[j]) continue;
      const ratio = (A / this.A0[j]) / Math.max(0.05, M / Math.max(1, this.M0[j]));
      let out8 = false, tilt = [0, 0];
      if (A < this.A0[j] * 0.85) { const cx = L.MX[j], cz = L.MZ[j]; let need = 0; const dirs = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]], has = new Uint8Array(8);
        for (let k = 1; k < this.n[2]; k++) for (let i = 1; i < this.n[0]; i++) { const q = this.idx(i, j, k); if (F[q] >= 0 || !mark[q]) continue; const dx = i - cx, dz = k - cz; for (let d = 0; d < 8; d++) if (dx * dirs[d][0] + dz * dirs[d][1] > 0.6) has[d] = 1; }
        for (let d = 0; d < 8; d++) if (!has[d]) { need++; tilt[0] += dirs[d][0]; tilt[1] += dirs[d][1]; } out8 = need > 0; }
      const weak = ratio < 0.3 || (A <= 6 && M > 60);
      if ((weak || out8) && (!worst || (out8 ? 0 : ratio) < worst.score)) worst = { j, score: out8 ? 0 : ratio, kind: out8 ? 'topple' : 'snap', tilt }; }
    if (worst) { const crack = [], above = []; for (let k = 1; k < this.n[2]; k++) for (let j = 1; j < this.n[1]; j++) for (let i = 1; i < this.n[0]; i++) { const q = this.idx(i, j, k); if (F[q] >= 0 || !mark[q]) continue; if (j === worst.j) crack.push(q); else if (j > worst.j) above.push(q); }
      if (above.length) out.push({ cells: Int32Array.from(above), crack: Int32Array.from(crack), kind: worst.kind, tilt: worst.tilt, j: worst.j }); }
    return out;
  }
  // 切り離す：cells を新しい小さな格子へ移し、ここからは消す（ひびの段も消す）。新しい格子を返す
  detach(b) {
    const F = this.F, h = this.h; let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    const ijk = (q) => { const i = q % this.sx, j = ((q / this.sx) | 0) % this.sy, k = (q / (this.sx * this.sy)) | 0; return [i, j, k]; };
    for (const q of b.cells) { const c = ijk(q); for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], c[a]); hi[a] = Math.max(hi[a], c[a]); } }
    const min = lo.map((v, a) => this.min[a] + (v - 2) * h), max = hi.map((v, a) => this.min[a] + (v + 2) * h), g = new IceGrid(null, min, max, h);
    // 元の形（T）は箱ごと写す：削った面・折れた面が、切り離した後も霜のまま見える
    // 割れ口は「すぐ外」の小さな値でそろえる（中の深さのまま外にすると、割れ口が段々の櫛の歯になった）。少しだけばらつかせて、ざらっとした割れ口に
    const rough = () => 0.015 + Math.random() * 0.03;
    const sx = this.sx, sxy = sx * this.sy, gsxy = g.sx * g.sy;
    for (let c = 0; c < g.sz; c++) { const k = lo[2] - 2 + c; if (k <= 0 || k >= this.n[2]) continue;
      for (let b2 = 0; b2 < g.sy; b2++) { const j = lo[1] - 2 + b2; if (j <= 0 || j >= this.n[1]) continue;
        for (let a = 0, i = lo[0] - 2, q = i + sx * j + sxy * k, p = g.sx * b2 + gsxy * c; a < g.sx; a++, i++, q++, p++) { if (i <= 0 || i >= this.n[0]) continue; g.T[p] = this.T[q]; g.F[p] = F[q] > 0 ? F[q] : rough(); } } }
    for (const q of b.cells) { const [i, j, k] = ijk(q), p = g.idx(i - lo[0] + 2, j - lo[1] + 2, k - lo[2] + 2); g.F[p] = F[q]; }
    g.border(); for (const q of b.cells) F[q] = rough(); if (b.crack) for (const q of b.crack) F[q] = rough();
    this.dirty = true; return g;
  }
  cellPos(q) { const i = q % this.sx, j = ((q / this.sx) | 0) % this.sy, k = (q / (this.sx * this.sy)) | 0; return [this.min[0] + i * this.h, this.min[1] + j * this.h, this.min[2] + k * this.h]; }
  // その場所が、どの格子点か（宝石の家が、切り離す氷の中にあるか見る）
  cellOf(x, y, z) { const i = Math.round((x - this.min[0]) / this.h), j = Math.round((y - this.min[1]) / this.h), k = Math.round((z - this.min[2]) / this.h); if (i < 0 || j < 0 || k < 0 || i > this.n[0] || j > this.n[1] || k > this.n[2]) return -1; return this.idx(i, j, k); }

}

// ---------- 面を起こす（サーフェスネット）。外の変数を使わない関数にしておき、裏方（Worker）でも同じものを動かす ----------
function meshField(F, n, min, h) {
  const nx = n[0], ny = n[1], nz = n[2], sx = nx + 1, sy = ny + 1, sxy = sx * sy, P = (i, j, k) => i + sx * (j + sy * k);
  const cell = new Int32Array(nx * ny * nz).fill(-1), C = (i, j, k) => i + nx * (j + ny * k), cv = new Float32Array(8);
  let pos = new Float32Array(30000), np = 0;
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const q = P(i, j, k); cv[0] = F[q]; cv[1] = F[q + 1]; cv[2] = F[q + sx]; cv[3] = F[q + sx + 1]; cv[4] = F[q + sxy]; cv[5] = F[q + sxy + 1]; cv[6] = F[q + sxy + sx]; cv[7] = F[q + sxy + sx + 1];
    let mask = 0; for (let c = 0; c < 8; c++) if (cv[c] < 0) mask |= 1 << c;
    if (mask === 0 || mask === 255) continue;
    let ax = 0, ay = 0, az = 0, cnt = 0;
    for (const [a, b] of EDGES) { if ((cv[a] < 0) === (cv[b] < 0)) continue; const t = cv[a] / (cv[a] - cv[b]); ax += (a & 1) + ((b & 1) - (a & 1)) * t; ay += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t; az += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t; cnt++; }
    if (np + 3 > pos.length) { const g = new Float32Array(pos.length * 2); g.set(pos); pos = g; }
    cell[C(i, j, k)] = np / 3; pos[np++] = min[0] + (i + ax / cnt) * h; pos[np++] = min[1] + (j + ay / cnt) * h; pos[np++] = min[2] + (k + az / cnt) * h;
  }
  const idx = [], quad = (a, b, c, d, flip) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; if (flip) idx.push(a, c, b, a, d, c); else idx.push(a, b, c, a, c, d); };
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const f0 = F[P(i, j, k)] < 0;
    if (i < nx && j >= 1 && j < ny && k >= 1 && k < nz && (F[P(i + 1, j, k)] < 0) !== f0) quad(cell[C(i, j - 1, k - 1)], cell[C(i, j, k - 1)], cell[C(i, j, k)], cell[C(i, j - 1, k)], !f0);
    if (j < ny && i >= 1 && i < nx && k >= 1 && k < nz && (F[P(i, j + 1, k)] < 0) !== f0) quad(cell[C(i - 1, j, k - 1)], cell[C(i, j, k - 1)], cell[C(i, j, k)], cell[C(i - 1, j, k)], f0);
    if (k < nz && i >= 1 && i < nx && j >= 1 && j < ny && (F[P(i, j, k + 1)] < 0) !== f0) quad(cell[C(i - 1, j - 1, k)], cell[C(i, j - 1, k)], cell[C(i, j, k)], cell[C(i - 1, j, k)], !f0);
  }
  // 法線：まわり6点の距離の差（格子の値をなめらかにたどる）
  const p = pos.slice(0, np), nrm = new Float32Array(np), e = h * 0.6;
  const S = (x, y, z) => { const fx = Math.min(nx - 1e-4, Math.max(0, (x - min[0]) / h)), fy = Math.min(ny - 1e-4, Math.max(0, (y - min[1]) / h)), fz = Math.min(nz - 1e-4, Math.max(0, (z - min[2]) / h)), i = fx | 0, j = fy | 0, k = fz | 0, u = fx - i, v = fy - j, w = fz - k, q = i + sx * j + sxy * k;
    const c00 = F[q] * (1 - u) + F[q + 1] * u, c10 = F[q + sx] * (1 - u) + F[q + sx + 1] * u, c01 = F[q + sxy] * (1 - u) + F[q + sxy + 1] * u, c11 = F[q + sxy + sx] * (1 - u) + F[q + sxy + sx + 1] * u; return (c00 * (1 - v) + c10 * v) * (1 - w) + (c01 * (1 - v) + c11 * v) * w; };
  for (let q = 0; q < np; q += 3) { const x = p[q], y = p[q + 1], z = p[q + 2], gx = S(x + e, y, z) - S(x - e, y, z), gy = S(x, y + e, z) - S(x, y - e, z), gz = S(x, y, z + e) - S(x, y, z - e), l = Math.hypot(gx, gy, gz) || 1; nrm[q] = gx / l; nrm[q + 1] = gy / l; nrm[q + 2] = gz / l; }
  return { pos: p, nrm, idx: new Uint32Array(idx) };
}
// 氷の距離を、絵を描く側（シェーダー）へ渡す形に：R＝今の形、G＝元の形（削った面かどうか）。0〜255
function volumeOf(F, T, out) { for (let q = 0; q < F.length; q++) { out[q * 2] = Math.max(0, Math.min(255, (F[q] / 0.3) * 127.5 + 127.5)); out[q * 2 + 1] = Math.max(0, Math.min(255, (T[q] / 0.3) * 127.5 + 127.5)); } return out; }
function runJob(j) { const m = meshField(j.F, j.n, j.min, j.h); if (j.off) for (let i = 0; i < m.pos.length; i += 3) { m.pos[i] -= j.off[0]; m.pos[i + 1] -= j.off[1]; m.pos[i + 2] -= j.off[2]; } m.vol = volumeOf(j.F, j.T, new Uint8Array(j.F.length * 2)); return m; }
const WORKER_SRC = `${meshField}\n${volumeOf}\n${runJob}\nonmessage = (e) => { const out = [], tr = []; for (const j of e.data.jobs) { const m = runJob(j); out.push(m); tr.push(m.pos.buffer, m.nrm.buffer, m.idx.buffer, m.vol.buffer); } postMessage({ id: e.data.id, out }, tr); };`;
// 面の起こし直しを、裏方で（削っている間・戻る間に、画面が止まらない）。裏方が使えない時は、その場で同じ計算をする
export class Mesher {
  constructor() {
    this.pending = new Map(); this.id = 0; this.w = null;
    try { this.w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })));
      this.w.onmessage = (e) => { const p = this.pending.get(e.data.id); this.pending.delete(e.data.id); if (p) p.done(e.data.out); };
      this.w.onerror = () => { this.w = null; for (const [id, p] of this.pending) { this.pending.delete(id); p.done(p.list.map(({ grid, off }) => runJob({ F: grid.F, T: grid.T, n: grid.n, min: grid.min, h: grid.h, off: off ? [off.x, off.y, off.z] : null }))); } };
    } catch (e) { this.w = null; }
  }
  // jobs＝[{ grid, off(Vector3・面をずらす量) }]。done(結果の並び)
  run(list, done) {
    const jobs = list.map(({ grid, off }) => ({ F: grid.F.slice(), T: grid.T.slice(), n: grid.n, min: grid.min, h: grid.h, off: off ? [off.x, off.y, off.z] : null }));
    for (const j of list) j.grid.dirty = false;
    if (!this.w) { done(jobs.map(runJob)); return; }
    const id = ++this.id; this.pending.set(id, { done, list });
    this.w.postMessage({ id, jobs }, jobs.flatMap((j) => [j.F.buffer, j.T.buffer]));
  }
}
