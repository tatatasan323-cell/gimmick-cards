// 大きなスプーンとフォーク：遠くの山（スプーン）やケーキの山（フォーク）を、ごっそり天へ持っていく
// 形は1つにつながった面で作る（スプーン＝だ円の皿・首でくびれ・柄はゆるく反って端が丸く広がる／フォーク＝4本の歯が先で少し反る）。厚みもある
// 3種類（本人 2026-10-17）：普通（明るい銀・赤いリボン・柄の端に金の星）／銀製（鏡のような銀に唐草の彫り・青いリボン・ダイヤ）／金製（金に唐草の彫り・深紅のリボン・ルビー）
// 銀と金は、明るい展示ケースの映り込みで光らせる（夜空だけを映すと、青黒く沈んだ）
import * as THREE from 'three';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const TAU = Math.PI * 2;
const A = 1.0, B = 1.45, END = 6.6;   // 皿の半幅・半長、柄の端（形の z）。先は −z、柄は ＋z
// 柄（首から端まで）の半幅。皿・フォークの頭とは、なめらかにつなぐ
const handleW = (z) => 0.16 + 0.22 * sstep(B + 0.5, END - 0.6, z) ** 1.6;
function capW(z, w) { const cap = END - 0.42; return z > cap ? w * Math.sqrt(Math.max(0, 1 - ((z - cap) / 0.42) ** 2)) : w; }
// スプーン：上から見た半幅（皿はだ円、首でくびれ、柄は端へ少しずつ広がって、丸く終わる）
function spoonW(z) {
  const bowl = A * Math.sqrt(Math.max(0, 1 - (z / B) ** 2));
  if (z <= 0) return bowl;
  const p = 3.2, w = Math.pow(bowl ** p + (z > B * 0.55 ? handleW(z) * sstep(B * 0.55, B * 0.95, z) : 0) ** p, 1 / p);
  return capW(z, w);
}
// 面の真ん中の高さ：皿はくぼみ（ふちで0）、柄はゆるく上がる
function spoonY(x, z) { const r2 = (x / A) ** 2 + (z / B) ** 2; return (r2 < 1 ? -0.42 * (1 - r2) : 0) + 0.95 * Math.pow(sstep(B * 0.7, END, z), 1.3); }
const thick = (z) => 0.05 + 0.045 * sstep(B, B + 1.2, z);
// 1つにつながった面（上・下・左右のふち）。halfW(z)・midY(x, z) の形を、z0〜z1 で。uv＝（左右 0〜1, 前後 0〜1）
function sheet(halfW, midY, z0, z1, NZ = 140, NU = 30) {
  const pos = [], uv = [], idx = [], at = (z, u) => { const w = halfW(z), x = u * w; return [x, midY(x, z), z]; }, zOf = (j) => z0 + (z1 - z0) * (j / NZ);
  const grid = (sign) => { const base = pos.length / 3;
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NU; i++) { const u = -1 + (2 * i) / NU, [x, y, z] = at(zOf(j), u); pos.push(x, y + sign * thick(z) / 2, z); uv.push((u + 1) / 2, (z - z0) / (z1 - z0)); }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NU; i++) { const a = base + j * (NU + 1) + i, b = a + NU + 1; if (sign > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); } };
  grid(1); grid(-1);
  for (const side of [-1, 1]) { const base = pos.length / 3;
    for (let j = 0; j <= NZ; j++) { const z = zOf(j), [x, y] = at(z, side); pos.push(x, y + thick(z) / 2, z, x, y - thick(z) / 2, z); uv.push((side + 1) / 2, (z - z0) / (z1 - z0), (side + 1) / 2, (z - z0) / (z1 - z0)); }
    for (let j = 0; j < NZ; j++) { const a = base + j * 2, b = a + 2; if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  // 上下の面の向きを、左右のふちへ少し倒す（本物の銀器のふくらみ。平らな板のままだと映りこみが一色になり、金が茶色の板に見えた）
  const nr = g.attributes.normal, cnt = 2 * (NZ + 1) * (NU + 1), nv = new THREE.Vector3();
  for (let v = 0; v < cnt; v++) { const u = -1 + (2 * (v % (NU + 1))) / NU; nv.fromBufferAttribute(nr, v); nv.x += 0.55 * u; nv.normalize(); nr.setXYZ(v, nv.x, nv.y, nv.z); }
  return g;
}
const spoonGeometry = () => sheet(spoonW, spoonY, -B, END);
// フォーク：頭（歯の根元の板）から柄へは、スプーンと同じ柄。歯は4本、先へ細くなり、先で少し上へ反る
const FH = 0.55;   // 頭の半幅
function forkW(z) { if (z < 0.1) return FH; const p = 3.2, head = FH * (1 - sstep(0.1, 1.5, z)), w = Math.pow(head ** p + handleW(z) ** p, 1 / p); return capW(z, w); }
const forkY = (x, z) => 0.95 * Math.pow(sstep(B * 0.7, END, z), 1.3) + 0.12 * sstep(0.6, -0.4, z);
function forkGeometry() {
  const body = sheet(forkW, forkY, -0.25, END, 130, 24), parts = [body.toNonIndexed()];
  const TL = 2.1, nT = 4;
  for (let k = 0; k < nT; k++) { const x0 = (-1 + (2 * k + 1) / nT) * FH * 0.86, N = 40, R = 10, pos = [], uv = [], idx = [];
    for (let j = 0; j <= N; j++) { const t = j / N, z = -0.2 - TL * t, w = 0.085 * (1 - 0.55 * t ** 1.4), h = 0.045 * (1 - 0.4 * t), y = forkY(x0, -0.2) + 0.28 * t ** 2.4, xc = x0 * (1 - 0.06 * t);
      for (let i = 0; i <= R; i++) { const a = (i / R) * TAU; pos.push(xc + Math.cos(a) * w, y + Math.sin(a) * h, z); uv.push(0.5, 0); } }
    for (let j = 0; j < N; j++) for (let i = 0; i < R; i++) { const a = j * (R + 1) + i, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); parts.push(g.toNonIndexed());
    const tip = new THREE.SphereGeometry(1, 10, 8).scale(0.085 * 0.45, 0.045 * 0.6, 0.06).translate(x0 * 0.94, forkY(x0, -0.2) + 0.28, -0.2 - TL); parts.push(tip.toNonIndexed()); }
  const n = parts.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of parts) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += c; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
export const FORK_SHAPE = { tipZ: -2.3, midZ: -1.2, headW: FH };
// 展示ケースの映りこみ：暗い部屋に、強い光の板と、水平線の帯（明暗がはっきりしていないと、銀が素焼きの灰色に見えた）
function brightEnv(renderer) {
  const s = new THREE.Scene(), sky = new THREE.SphereGeometry(20, 32, 16), lo = new THREE.Color('#262a34'), hi = new THREE.Color('#646c80'), cols = [];
  // 下は暗く、上ほど明るく（どの向きでも、何かしら明るい所が映る。一色の暗い球だと、金を裏から見ると茶色の板に見えた）
  for (let i = 0; i < sky.attributes.position.count; i++) { const c = lo.clone().lerp(hi, Math.min(1, Math.max(0, (sky.attributes.position.getY(i) / 20 + 0.3) / 1.1))); cols.push(c.r, c.g, c.b); }
  sky.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); s.add(new THREE.Mesh(sky, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const box = (w, h, x, y, z, col, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  box(14, 6, 0, 15, 0, '#ffffff', 5); box(34, 9, 0, 3, 19, '#c8d0e8', 1.1); box(34, 9, 0, -2, -19, '#e8dcc8', 0.9); box(9, 20, 19, 2, 0, '#d0d8f0', 1.0); box(9, 20, -19, 2, 0, '#f0e0d0', 1.0);
  // 夜の町でも、どちらから見ても明るい所が映るように
  box(3, 12, -12, 3, 4, '#fff1dc', 5); box(3, 12, 12, 2, -3, '#dfeeff', 5); box(40, 1.2, 0, 0.5, -16, '#ffe2c0', 3.5); box(40, 1.2, 0, 0.5, 16, '#d8e8ff', 3); box(2.5, 2.5, 4, 5, 13, '#ffffff', 7); box(10, 4, 0, -12, 3, '#3a3040', 1);
  // 下にも明るい敷き布（裏から見上げても光る。無いと、金の裏が茶色に沈んだ）。真ん中だけ暗く抜いて、鏡らしい明暗を残す
  box(16, 34, -11, -13, 0, '#e8dfcc', 0.95); box(16, 34, 11, -13, 0, '#dfe4ee', 0.85);
  return new THREE.PMREMGenerator(renderer).fromScene(s, 0.03).texture;
}
// 唐草の彫り（柄の上の面だけ）：うず巻きと葉の線を高さの絵に描き、その傾きを法線の絵にする
function engraving(from) {
  const W = 128, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#fff'; g.lineCap = 'round'; g.filter = 'blur(1.2px)';
  const y0 = from * H; g.lineWidth = 3; g.beginPath(); g.moveTo(10, y0); g.lineTo(10, H - 30); g.moveTo(W - 10, y0); g.lineTo(W - 10, H - 30); g.stroke();   // ふちの細い線
  for (let y = y0 + 40, k = 0; y < H - 70; y += 74, k++) { const sd = k % 2 ? 1 : -1, cx = W / 2 + sd * 16, cy = y;
    g.lineWidth = 3.2; g.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * TAU * 1.6 * sd, r = 22 * (1 - t * 0.85); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.3); } g.stroke();   // うず
    g.lineWidth = 2.4; g.beginPath(); g.ellipse(cx - sd * 30, cy - 22, 9, 4, sd * 0.8, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(cx + sd * 4, cy + 34, 8, 3.5, -sd * 0.6, 0, TAU); g.stroke(); }   // 葉
  const d = g.getImageData(0, 0, W, H).data, out = g.createImageData(W, H), hgt = (x, y) => d[((Math.min(H - 1, Math.max(0, y)) * W) + Math.min(W - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const dx = hgt(x + 1, y) - hgt(x - 1, y), dy = hgt(x, y + 1) - hgt(x, y - 1), k = (y * W + x) * 4; out.data[k] = 128 - dx * 110; out.data[k + 1] = 128 - dy * 110; out.data[k + 2] = 255; out.data[k + 3] = 255; }
  const n = document.createElement('canvas'); n.width = W; n.height = H; n.getContext('2d').putImageData(out, 0, 0); const t = new THREE.CanvasTexture(n); t.flipY = false; return t;
}
// 3種類の金属と飾り。kinds＝{ normal, silver, gold }
function metals(env, from) {
  const eng = engraving(from);
  return {
    normal: new THREE.MeshPhysicalMaterial({ color: '#f3f5fa', metalness: 1, roughness: 0.07, clearcoat: 0.5, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 1.25, side: THREE.DoubleSide }),
    silver: new THREE.MeshPhysicalMaterial({ color: '#fdfdff', metalness: 1, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.02, envMap: env, envMapIntensity: 1.5, normalMap: eng, normalScale: new THREE.Vector2(1.6, 1.6), side: THREE.DoubleSide }),
    gold: new THREE.MeshPhysicalMaterial({ color: '#ffc94a', metalness: 1, roughness: 0.1, clearcoat: 0.8, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 1.6, normalMap: eng, normalScale: new THREE.Vector2(1.6, 1.6), emissive: '#7a5000', emissiveIntensity: 0.55, side: THREE.DoubleSide }),
  };
}
// 柄の端の飾り（金の星／ダイヤ／ルビー）と、首のリボン。種類ごとに見せる物を切りかえる
function ornaments(tilt, env, zs, ys, zr, yr) {
  const gold = new THREE.MeshPhysicalMaterial({ color: '#ffcf5a', metalness: 1, roughness: 0.18, envMap: env, envMapIntensity: 1.3, emissive: '#5a3a00', emissiveIntensity: 0.35 });
  const gem = (col, em) => new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.02, metalness: 0, clearcoat: 1, envMap: env, envMapIntensity: 2.2, emissive: em, emissiveIntensity: 0.6, flatShading: true });
  const ribbon = new THREE.MeshPhysicalMaterial({ color: '#c8102e', roughness: 0.45, sheen: 1, sheenColor: new THREE.Color('#ff9090'), sheenRoughness: 0.4, clearcoat: 0.25, emissive: '#3a0008', emissiveIntensity: 0.6 });
  const O = { star: new THREE.Group(), diamond: new THREE.Group(), ruby: new THREE.Group(), ribbon };
  { const st = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = (i / 10) * TAU + Math.PI / 2, r = i % 2 ? 0.11 : 0.26; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    O.star.add(new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2 }).rotateX(-Math.PI / 2), gold)); }
  { const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0).scale(1, 0.75, 1), gem('#f4fbff', '#9fc8ff')); d.position.y = 0.1; const set = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24).rotateX(Math.PI / 2), gold); set.position.y = 0.05; O.diamond.add(d, set); }
  { const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 0).scale(1, 0.7, 1), gem('#e0102e', '#ff2040')); r.position.y = 0.1; const set = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 8, 24).rotateX(Math.PI / 2), gold); set.position.y = 0.05; O.ruby.add(r, set); }
  for (const k of ['star', 'diamond', 'ruby']) { O[k].position.set(0, ys, zs); O[k].rotation.x = -0.12; tilt.add(O[k]); }
  // 首の赤いリボン：輪が2つと、結び目と、垂れる2本
  const R = new THREE.Group(); R.position.set(0, yr, zr); tilt.add(R);
  for (const sx of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.065, 10, 28).scale(1, 0.62, 1), ribbon); loop.position.set(sx * 0.25, 0.05, 0); loop.rotation.set(0, 0, sx * 0.35); R.add(loop);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.55).translate(0, 0, 0.27), ribbon); tail.position.set(sx * 0.07, -0.02, 0.05); tail.rotation.set(0.35, sx * 0.55, 0); R.add(tail); }
  R.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10).scale(1, 0.8, 0.9), ribbon));
  return O;
}
const RIBBON = { normal: ['#c8102e', '#ff9090', '#3a0008'], silver: ['#1f47c8', '#9fb8ff', '#06103a'], gold: ['#8a0a20', '#ffb0a0', '#2a0004'] };
const SHOW = { normal: 'star', silver: 'diamond', gold: 'ruby' };
function addMetal(S, mesh, M, O) {
  S.kind = 'normal';
  S.setMetal = (kind) => { S.kind = kind; mesh.material = M[kind]; for (const k of ['star', 'diamond', 'ruby']) O[k].visible = SHOW[kind] === k; const [c, sh, em] = RIBBON[kind]; O.ribbon.color.set(c); O.ribbon.sheenColor.set(sh); O.ribbon.emissive.set(em); };
  S.setMetal('normal');
}
// 山盛り：ふくらんだ半球にでこぼこ。すくった山の「中身」の色（氷・クリーム）で塗る。上の飾りや、すくった山そのものの形は、町の側でのせる
function moundGeometry() {
  const g = new THREE.SphereGeometry(1, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3).fill(1);
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), bump = 1 + 0.07 * Math.sin(a * 5 + y * 7) + 0.05 * Math.sin(a * 11 - y * 13) + 0.04 * Math.sin(y * 19 + a * 3);
    p.setXYZ(i, x * bump, y * (1 + 0.06 * Math.sin(a * 7)), z * bump); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
export function makeSpoon(renderer) {
  const env = brightEnv(renderer), g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const M = metals(env, (B + 0.7 + B) / (END + B)), body = new THREE.Mesh(spoonGeometry(), M.normal); tilt.add(body);
  const zs = END - 0.5, zr = B + 0.55, O = ornaments(tilt, env, zs, spoonY(0, zs) + thick(zs) / 2 + 0.01, zr, spoonY(0, zr) + thick(zr) / 2 + 0.06);
  const moundMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.35, clearcoat: 0.25, emissive: '#1a2040', emissiveIntensity: 0.25 });
  const mound = new THREE.Mesh(moundGeometry(), moundMat); mound.position.y = -0.12; tilt.add(mound);
  const S = { g, tilt, mound, env, load: 0 };
  // base＝中身の色・mat＝山と同じ材質（色は形の色で）。山盛りの上は、町の側ですくった山の形そのものをのせる
  S.setLoad = ({ base, mat }) => { mound.material = mat || moundMat; const c = mound.geometry.attributes.color, B0 = new THREE.Color(base); for (let i = 0; i < c.count; i++) c.setXYZ(i, B0.r, B0.g, B0.b); c.needsUpdate = true; };
  S.setFill = (k) => { const s = Math.max(0.001, k); mound.scale.set(A * 0.98 * Math.min(1, 0.4 + k * 0.6), 0.95 * s, B * 0.95 * Math.min(1, 0.4 + k * 0.6)); S.load = k; };
  S.setFill(0); addMetal(S, body, M, O);
  return S;
}
export function makeFork(renderer, env0) {
  const env = env0 || brightEnv(renderer), g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const M = metals(env, (1.5 + 0.25) / (END + 0.25)), body = new THREE.Mesh(forkGeometry(), M.normal); tilt.add(body);
  const zs = END - 0.5, zr = 1.75, O = ornaments(tilt, env, zs, forkY(0, zs) + thick(zs) / 2 + 0.01, zr, forkY(0, zr) + thick(zr) / 2 + 0.06);
  const S = { g, tilt, env }; addMetal(S, body, M, O); return S;
}
export const SPOON_SHAPE = { A, B, END };
