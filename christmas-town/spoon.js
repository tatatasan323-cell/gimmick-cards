// 大きな銀のスプーン：遠くの山をひとすくいして、天へ持っていく
// 形は1つにつながった面で作る（先はだ円の皿・首でくびれ・柄はゆるく反って端が丸く広がる。厚みもある）。銀は、明るい展示ケースの映り込みで光らせる（夜空だけを映すと、青黒く沈んだ）
// 首に赤いリボン、柄の端に金の星。皿には、すくった山を山盛りに（皿からはみ出すほど）
import * as THREE from 'three';

const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const A = 1.0, B = 1.45, END = 6.6;   // 皿の半幅・半長、柄の端（形の z）。先は −z、柄は ＋z
// 上から見た半幅：皿はだ円、首でくびれ、柄は端へ少しずつ広がって、丸く終わる
function halfW(z) {
  const bowl = A * Math.sqrt(Math.max(0, 1 - (z / B) ** 2));
  if (z <= 0) return bowl;
  const neck = 0.16 + 0.22 * sstep(B + 0.5, END - 0.6, z) ** 1.6, p = 3.2;
  let w = Math.pow(bowl ** p + (z > B * 0.55 ? neck * sstep(B * 0.55, B * 0.95, z) : 0) ** p, 1 / p);
  const cap = END - 0.42; if (z > cap) w *= Math.sqrt(Math.max(0, 1 - ((z - cap) / 0.42) ** 2));
  return w;
}
// 面の真ん中の高さ：皿はくぼみ（ふちで0）、柄はゆるく上がる
function midY(x, z) { const r2 = (x / A) ** 2 + (z / B) ** 2; return (r2 < 1 ? -0.42 * (1 - r2) : 0) + 0.95 * Math.pow(sstep(B * 0.7, END, z), 1.3); }
const thick = (z) => 0.05 + 0.045 * sstep(B, B + 1.2, z);

function spoonGeometry() {
  const NZ = 140, NU = 30, pos = [], idx = [], at = (z, u) => { const w = halfW(z), x = u * w; return [x, midY(x, z), z]; };
  const zOf = (j) => -B + (END + B) * (j / NZ);
  const grid = (sign) => { const base = pos.length / 3;
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NU; i++) { const [x, y, z] = at(zOf(j), -1 + (2 * i) / NU); pos.push(x, y + sign * thick(z) / 2, z); }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NU; i++) { const a = base + j * (NU + 1) + i, b = a + NU + 1; if (sign > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); } };
  grid(1); grid(-1);
  // ふち（左右）：上の面と下の面をつなぐ帯
  for (const side of [-1, 1]) { const base = pos.length / 3;
    for (let j = 0; j <= NZ; j++) { const z = zOf(j), [x, y] = at(z, side); pos.push(x, y + thick(z) / 2, z, x, y - thick(z) / 2, z); }
    for (let j = 0; j < NZ; j++) { const a = base + j * 2, b = a + 2; if (side > 0) idx.push(a, a + 1, b, b, a + 1, b + 1); else idx.push(a, b, a + 1, b, b + 1, a + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// 展示ケースの映りこみ：暗い部屋に、強い光の板と、水平線の帯（明暗がはっきりしていないと、銀が素焼きの灰色に見えた）
function brightEnv(renderer) {
  const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: '#1c1f28', side: THREE.BackSide })));
  const box = (w, h, x, y, z, col, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m); };
  box(14, 6, 0, 15, 0, '#ffffff', 5); box(3, 12, -12, 3, 4, '#fff1dc', 5); box(3, 12, 12, 2, -3, '#dfeeff', 5); box(40, 1.2, 0, 0.5, -16, '#ffe2c0', 3.5); box(40, 1.2, 0, 0.5, 16, '#d8e8ff', 3); box(2.5, 2.5, 4, 5, 13, '#ffffff', 7); box(10, 4, 0, -12, 3, '#3a3040', 1);
  return new THREE.PMREMGenerator(renderer).fromScene(s, 0.03).texture;
}
// 山盛り：ふくらんだ半球にでこぼこ。色は、上ほどシロップ（かき氷）／ソースのしずく（クリーム）
function moundGeometry() {
  const g = new THREE.SphereGeometry(1, 56, 28, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position, n = p.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), bump = 1 + 0.07 * Math.sin(a * 5 + y * 7) + 0.05 * Math.sin(a * 11 - y * 13) + 0.04 * Math.sin(y * 19 + a * 3);
    p.setXYZ(i, x * bump, y * (1 + 0.06 * Math.sin(a * 7)), z * bump); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
export function makeSpoon(renderer) {
  const env = brightEnv(renderer), g = new THREE.Group(), tilt = new THREE.Group(); g.add(tilt);
  const silver = new THREE.MeshPhysicalMaterial({ color: '#f3f5fa', metalness: 1, roughness: 0.07, clearcoat: 0.5, clearcoatRoughness: 0.05, envMap: env, envMapIntensity: 1.25, side: THREE.DoubleSide });
  const gold = new THREE.MeshPhysicalMaterial({ color: '#ffcf5a', metalness: 1, roughness: 0.18, envMap: env, envMapIntensity: 1.3, emissive: '#5a3a00', emissiveIntensity: 0.35 });
  const ribbon = new THREE.MeshPhysicalMaterial({ color: '#c8102e', roughness: 0.45, sheen: 1, sheenColor: new THREE.Color('#ff9090'), sheenRoughness: 0.4, clearcoat: 0.25, emissive: '#3a0008', emissiveIntensity: 0.6 });
  tilt.add(new THREE.Mesh(spoonGeometry(), silver));
  // 柄の端の金の星（上の面に、ふくらんだ形で）
  { const st = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.11 : 0.26; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const zs = END - 0.5, s = new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 2 }).rotateX(-Math.PI / 2), gold); s.position.set(0, midY(0, zs) + thick(zs) / 2 + 0.01, zs); s.rotation.x = -0.12; tilt.add(s); }
  // 首の赤いリボン：輪が2つと、結び目と、垂れる2本
  { const zr = B + 0.55, y = midY(0, zr) + thick(zr) / 2 + 0.06, R = new THREE.Group(); R.position.set(0, y, zr); tilt.add(R);
    for (const sx of [-1, 1]) { const loop = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.065, 10, 28).scale(1, 0.62, 1), ribbon); loop.position.set(sx * 0.25, 0.05, 0); loop.rotation.set(0, 0, sx * 0.35); R.add(loop);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.55).translate(0, 0, 0.27), ribbon); tail.position.set(sx * 0.07, -0.02, 0.05); tail.rotation.set(0.35, sx * 0.55, 0); R.add(tail); }
    R.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10).scale(1, 0.8, 0.9), ribbon)); }
  // 山盛り（すくった時に出す）。toppings＝上に乗る飾り（いちご・さくらんぼなどの小さな玉）
  const moundMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, sheen: 0.8, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.35, clearcoat: 0.25, emissive: '#1a2040', emissiveIntensity: 0.25 });
  const mound = new THREE.Mesh(moundGeometry(), moundMat); mound.scale.set(A * 1.02, 1.35, B * 1.0); mound.position.y = -0.12; tilt.add(mound);
  const tops = new THREE.Group(); tilt.add(tops);
  const S = { g, tilt, mound, tops, env, load: 0 };
  S.setLoad = ({ base, top, cream, toppings, mat }) => {   // base＝下の色・top＝上の色・cream＝クリーム（しずく模様）・toppings＝飾りの色・mat＝山と同じ材質（色は形の色で）
    mound.material = mat || moundMat;
    const p = mound.geometry.attributes.position, c = mound.geometry.attributes.color, B0 = new THREE.Color(base), T0 = new THREE.Color(top), C = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getZ(i), p.getX(i));
      const k = cream ? (Math.sin(a * 6) * 0.5 + 0.5 > 0.55 + (1 - y) * 0.6 ? 1 : 0) * sstep(0.3, 0.6, y) + sstep(0.82, 0.95, y) : sstep(0.58, 0.78, y + 0.14 * Math.sin(a * 5) + 0.06 * Math.sin(a * 13));
      C.copy(B0).lerp(T0, Math.min(1, k)); c.setXYZ(i, C.r, C.g, C.b); }
    c.needsUpdate = true;
    tops.clear(); (toppings || []).forEach((hex, i) => { const a = i * 2.39 + 0.4, r = 0.18 + 0.32 * ((i * 0.618) % 1), m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 12), new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.25, clearcoat: 1, envMap: env, envMapIntensity: 0.9, emissive: hex, emissiveIntensity: 0.15 }));
      m.position.set(Math.cos(a) * r * A, 1.35 * Math.sqrt(Math.max(0, 1 - r * r)) * 0.98 - 0.12 + 0.08, Math.sin(a) * r * B); tops.add(m); });
  };
  S.setFill = (k) => { const s = Math.max(0.001, k); mound.scale.set(A * 1.02 * Math.min(1, 0.4 + k * 0.6), 1.35 * s, B * Math.min(1, 0.4 + k * 0.6)); tops.visible = k > 0.85; S.load = k; };
  S.setFill(0);
  return S;
}
export const SPOON_SHAPE = { A, B, END };
