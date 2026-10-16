// 宝石24種（誕生石12＋日本で加わったサンゴ・ヒスイ＋実在の宝石10）。色だけでなく、形もそれぞれちがう（天然の結晶の形・カットの形・彫った形）
// 指輪・ピアスは小さめ、ほかは大きく立派に。氷の彫像と、宝石の美術館で使う
// 月は、どの一覧でも同じ月のものだけ書く（1912年の米国の一覧と日本の一覧で一致）。サンゴ・ヒスイは日本で加わった（豆知識_確認メモ）
import * as THREE from 'three';
import { surfaceNets, smin, smax, sdSphere, sdCapsule, extrude } from './soft.js';
import { gemMaterial } from './gemshader.js';

export const GEMS = [
  { id: 'garnet', name: 'ガーネット', month: 1, color: '#a3152a', shape: 'dodeca', ior: 1.8, hard: 7 },
  { id: 'amethyst', name: 'アメジスト', month: 2, color: '#8a4fd6', shape: 'cluster', ior: 1.54, hard: 7 },
  { id: 'aquamarine', name: 'アクアマリン', month: 3, color: '#86d9f2', shape: 'hexcrystal', ior: 1.58, hard: 7.5 },
  { id: 'coral', name: 'サンゴ', month: 3, jp: true, color: '#ff7a66', shape: 'branch', opaque: true, hard: 3.5 },
  { id: 'diamond', name: 'ダイヤモンド', month: 4, color: '#f4f8ff', shape: 'brilliant', ior: 2.42, hard: 10, kind: 'ring', metal: 'platinum', fact: '炭素だけでできた宝石で、硬さはいちばん上の10。鉛筆のしんも同じ炭素なのに、字が書けるほどやわらかい。' },
  { id: 'emerald', name: 'エメラルド', month: 5, color: '#14a35e', shape: 'step', ior: 1.58, hard: 7.5 },
  { id: 'jade', name: 'ヒスイ', month: 5, jp: true, color: '#3fae6e', shape: 'magatama', opaque: true, hard: 6.5 },
  { id: 'pearl', name: '真珠', month: 6, color: '#f6efe6', shape: 'pearl', hard: 3, kind: 'earring', metal: 'gold' },
  { id: 'ruby', name: 'ルビー', month: 7, color: '#d6123c', shape: 'heart', ior: 1.77, hard: 9, kind: 'ring', metal: 'gold' },
  { id: 'peridot', name: 'ペリドット', month: 8, color: '#9fd12e', shape: 'trillion', ior: 1.66, hard: 6.5 },
  { id: 'sapphire', name: 'サファイア', month: 9, color: '#1f45c8', shape: 'cushion', ior: 1.77, hard: 9, kind: 'earring', metal: 'platinum' },
  { id: 'opal', name: 'オパール', month: 10, color: '#eaf0ff', shape: 'cab', iri: 1, hard: 6 },
  { id: 'topaz', name: 'トパーズ', month: 11, color: '#f2a33a', shape: 'pear', ior: 1.62, hard: 8 },
  { id: 'turquoise', name: 'ターコイズ', month: 12, color: '#3cc8c2', shape: 'nugget', opaque: true, hard: 5.5, fact: 'トルコ石とも呼ぶ。「トルコの石」という意味で、トルコを通ってヨーロッパに運ばれたためと考えられている。' },
  { id: 'moonstone', name: 'ムーンストーン', color: '#e8eef9', shape: 'moon', iri: 0.7, hard: 6 },
  { id: 'tourmaline', name: 'ウォーターメロン・トルマリン', color: '#ff5fa2', color2: '#3fbf6a', shape: 'prism3', ior: 1.63, hard: 7 },
  { id: 'citrine', name: 'シトリン', color: '#f5c02e', shape: 'cushionBig', ior: 1.55, hard: 7 },
  { id: 'lapis', name: 'ラピスラズリ', color: '#233fa6', shape: 'sphere', opaque: true, flecks: true, hard: 5.5 },
  { id: 'tanzanite', name: 'タンザナイト', color: '#5a4fd0', shape: 'marquise', ior: 1.69, hard: 6.5 },
  { id: 'rosequartz', name: 'ローズクォーツ', color: '#f7b8ca', shape: 'heartSmooth', hard: 7 },
  { id: 'alexandrite', name: 'アレキサンドライト', color: '#2c8f7c', shape: 'brilliant', ior: 1.75, hard: 8.5 },
  { id: 'spinel', name: 'スピネル', color: '#e0306a', shape: 'octa', ior: 1.72, hard: 8 },
  { id: 'morganite', name: 'モルガナイト', color: '#f4bba9', shape: 'briolette', ior: 1.58, hard: 7.5 },
  { id: 'amber', name: 'コハク', color: '#e48a1a', shape: 'drop', amber: true, hard: 2.5 },
];
// 美術館だけに並ぶ、もう24種（よく知られた宝石・光り方に特徴のある石・鉱物）。月は書かない（一覧によって違うものは、誕生石と書かない）
// mat：石ごとの光り方。bands＝しま模様・chatoyant＝光の帯（キャッツアイ効果）・asterism＝星が浮かぶ・flash＝角度で色がひらめく・metal＝金属の光り・obsidian＝黒いガラス・sunstone＝中のきらめき
export const MORE_GEMS = [
  { id: 'zircon', name: 'ジルコン', color: '#3fa8e0', shape: 'brilliant', ior: 1.95, hard: 7.5 },
  { id: 'kunzite', name: 'クンツァイト', color: '#e2a6e8', shape: 'step', ior: 1.66, hard: 7 },
  { id: 'iolite', name: 'アイオライト', color: '#5560c8', shape: 'cushion', ior: 1.54, hard: 7 },
  { id: 'tsavorite', name: 'ツァボライト', color: '#1fbf55', shape: 'brilliant', ior: 1.74, hard: 7 },
  { id: 'paraiba', name: 'パライバトルマリン', color: '#1fe0d6', shape: 'pear', ior: 1.63, hard: 7 },
  { id: 'sphene', name: 'スフェーン', color: '#c8d040', shape: 'marquise', ior: 1.9, hard: 5.5 },
  { id: 'heliodor', name: 'ヘリオドール', color: '#f0d040', shape: 'hexcrystal', ior: 1.58, hard: 7.5 },
  { id: 'imperialtopaz', name: 'インペリアルトパーズ', color: '#f08a4a', shape: 'cushionBig', ior: 1.62, hard: 8 },
  { id: 'fluorite', name: 'フローライト', color: '#9a7ae8', shape: 'octa', ior: 1.43, hard: 4 },
  { id: 'rockcrystal', name: '水晶', color: '#f4f8ff', shape: 'hexcrystal', ior: 1.54, hard: 7 },
  { id: 'smokyquartz', name: 'スモーキークォーツ', color: '#8a6a50', shape: 'cluster', ior: 1.54, hard: 7 },
  { id: 'rhodolite', name: 'ロードライトガーネット', color: '#b0285a', shape: 'cushion', ior: 1.76, hard: 7 },
  { id: 'chrysoberyl', name: 'クリソベリル', color: '#d8c840', shape: 'trillion', ior: 1.75, hard: 8.5 },
  { id: 'labradorite', name: 'ラブラドライト', color: '#2a3036', shape: 'cab', mat: 'flash', opaque: true, hard: 6 },
  { id: 'malachite', name: 'マラカイト', color: '#1f8a4c', color2: '#0a3a20', shape: 'sphere', mat: 'bands', band: 'ring', opaque: true, hard: 3.5 },
  { id: 'rhodochrosite', name: 'ロードクロサイト', color: '#f08aa0', color2: '#fff0f0', shape: 'cab', mat: 'bands', band: 'ring', opaque: true, hard: 3.5 },
  { id: 'tigereye', name: 'タイガーアイ', color: '#a8701e', color2: '#ffd070', shape: 'cab', mat: 'chatoyant', stripes: true, opaque: true, hard: 7 },
  { id: 'starsapphire', name: 'スターサファイア', color: '#3050b0', shape: 'moon', mat: 'asterism', opaque: true, hard: 9 },
  { id: 'catseye', name: 'キャッツアイ', color: '#c8b040', color2: '#fff6c0', shape: 'cab', mat: 'chatoyant', opaque: true, hard: 8.5 },
  { id: 'pyrite', name: 'パイライト（黄鉄鉱）', sub: '鉱物', color: '#c8a850', shape: 'cubes', mat: 'metal', opaque: true, hard: 6 },
  { id: 'hematite', name: 'ヘマタイト', sub: '鉱物', color: '#5a5e66', shape: 'sphere', mat: 'metal', opaque: true, hard: 5.5 },
  { id: 'agate', name: 'アゲート（めのう）', color: '#c86a3a', color2: '#f4e8d8', shape: 'nugget', mat: 'bands', band: 'layer', opaque: true, hard: 7 },
  { id: 'obsidian', name: 'オブシディアン（黒曜石）', sub: '天然のガラス', color: '#141418', shape: 'drop', mat: 'obsidian', opaque: true, hard: 5 },
  { id: 'sunstone', name: 'サンストーン', color: '#e8783a', shape: 'cab', mat: 'sunstone', hard: 6 },
];
export const gemLabel = (g) => (g.month ? `${g.month}月の誕生石${g.jp ? '（日本で加わった）' : ''}` : '');
const SMOOTH = new Set(['cab', 'pearl', 'nugget', 'moon', 'sphere', 'heartSmooth', 'drop', 'magatama', 'branch', 'cubes']);

// ---------- 形（大きさ1＝いちばん遠い点まで1） ----------
const V2 = (a) => a.map(([x, y]) => new THREE.Vector2(x, y));
const lathe = (pts, seg, phi = 0) => new THREE.LatheGeometry(V2(pts), seg, phi);
const BRILLIANT = [[0.001, -0.64], [1, -0.02], [1, 0.05], [0.76, 0.24], [0.56, 0.33], [0.001, 0.33]];
const STEP = [[0.001, -0.48], [0.58, -0.36], [0.96, -0.1], [1, 0], [1, 0.06], [0.9, 0.18], [0.78, 0.28], [0.001, 0.28]];
const dome = (h) => { const p = Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 0.5; return [Math.cos(a), Math.sin(a) * h]; }); p.unshift([0.001, -0.1], [0.98, -0.1]); return p; };
const hash3 = (x, y, z) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return v - Math.floor(v); };
const vnoise = (x, y, z) => { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), L = (a, b, t) => a + (b - a) * t;
  return L(L(L(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), L(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v), L(L(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), L(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v), w); };
const fromSDF = (f, b = 1.15, n = 46) => { const m = surfaceNets(f, [-b, -b, -b], [b, b, b], [n, n, n]), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3)); g.setIndex(new THREE.BufferAttribute(m.idx, 1)); return g; };
const heart2 = (x, y) => { x = Math.abs(x); if (y + x > 1) return Math.hypot(x - 0.25, y - 0.75) - Math.SQRT2 / 4; const a = (x - 0) ** 2 + (y - 1) ** 2, m = 0.5 * Math.max(x + y, 0), b = (x - m) ** 2 + (y - m) ** 2; return Math.sqrt(Math.min(a, b)) * Math.sign(x - y); };
const heartShape = () => { const s = new THREE.Shape(); for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 2, x = (16 * Math.sin(t) ** 3) / 17, y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17 + 0.12; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s; };
// 面の集まり（どれも頂点を共有しない＝角の立った面）
const merge = (gs) => { const parts = gs.map((g) => (g.index ? g.toNonIndexed() : g)), total = parts.reduce((s, g) => s + g.attributes.position.array.length, 0), pos = new Float32Array(total); let o = 0; for (const g of parts) { pos.set(g.attributes.position.array, o); o += g.attributes.position.array.length; } const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return m; };
// 菱形十二面体（ガーネットの結晶の形）：12枚のひし形
function rhombicDodeca() {
  const pos = [], dirs = [[1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0], [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1], [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1]];
  for (const d of dirs) { const ax = d.map((v) => (v ? 1 : 0)), z = ax.indexOf(0), a = [0, 0, 0], b = [0, 0, 0], c1 = [...d], c2 = [...d], i1 = ax.indexOf(1), i2 = ax.lastIndexOf(1); a[i1] = 2 * d[i1]; b[i2] = 2 * d[i2]; c1[z] = 1; c2[z] = -1;
    const quad = [a, c1, b, c2], n = new THREE.Vector3(...d), p0 = new THREE.Vector3(...quad[0]), e1 = new THREE.Vector3(...quad[1]).sub(p0), e2 = new THREE.Vector3(...quad[2]).sub(p0); if (e1.cross(e2).dot(n) < 0) quad.reverse();
    pos.push(...quad[0], ...quad[1], ...quad[2], ...quad[0], ...quad[2], ...quad[3]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); return g;
}
const BUILD = {
  brilliant: () => lathe(BRILLIANT, 16),
  cushion: () => { const g = lathe(BRILLIANT, 8, Math.PI / 8); g.scale(1.05, 1, 1.05); return g; },
  cushionBig: () => { const g = lathe([[0.001, -0.72], [0.55, -0.45], [1, -0.04], [1, 0.05], [0.82, 0.22], [0.6, 0.36], [0.001, 0.36]], 12, Math.PI / 12); g.scale(1, 1, 0.9); return g; },
  marquise: () => { const g = lathe(BRILLIANT, 16); g.scale(1.75, 1, 0.72); return g; },
  trillion: () => lathe(BRILLIANT, 3, Math.PI / 6),
  step: () => { const g = lathe(STEP, 4, Math.PI / 4); g.scale(1.35, 1, 0.92); return g; },
  pear: () => { const g = lathe(BRILLIANT, 16), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setX(i, x > 0 ? x * 1.75 - x * x * 0.25 : x * 0.95); } return g; },
  briolette: () => lathe([[0.001, -1], [0.3, -0.85], [0.58, -0.45], [0.66, -0.05], [0.55, 0.35], [0.3, 0.72], [0.001, 0.95]], 12),
  heart: () => { const g = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.22, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.16, bevelSegments: 2, steps: 1, curveSegments: 18 }); g.center(); g.rotateX(-Math.PI / 2); return g; },
  heartSmooth: () => fromSDF((x, y, z) => extrude(heart2(x * 1.25, (y + 0.55) * 1.25) / 1.25, z, 0.16, 0.2)),
  dodeca: () => rhombicDodeca(),
  octa: () => new THREE.OctahedronGeometry(1.05, 0),
  hexcrystal: () => { const g = lathe([[0.001, -1.2], [0.4, -1.15], [0.42, 0.95], [0.3, 1.12], [0.001, 1.14]], 6); g.rotateZ(0.35); return g; },
  prism3: () => { const g = lathe([[0.001, -1.3], [0.38, -1.1], [0.38, 1.05], [0.2, 1.22], [0.001, 1.28]], 3); g.rotateZ(0.5); return g; },
  cluster: () => { const parts = [[0, 0, 0, 1.15, 0], [0.35, -0.15, 0.1, 0.85, 0.5], [-0.32, -0.2, -0.05, 0.9, -0.55], [0.1, -0.25, -0.35, 0.75, -0.3], [-0.1, -0.2, 0.35, 0.7, 0.35]];
    const gs = parts.map(([x, y, z, h, tilt]) => { const g = lathe([[0.001, -0.25], [0.26, -0.2], [0.26, h * 0.55], [0.001, h * 0.85]], 6); g.rotateZ(tilt); g.rotateX(z * 1.2); g.translate(x, y, z); return g; });
    const base = new THREE.IcosahedronGeometry(0.42, 0); base.scale(1.3, 0.55, 1.2); base.translate(0, -0.42, 0); gs.push(base); return merge(gs); },
  cab: () => { const g = lathe(dome(0.55), 40); g.scale(1.25, 1, 0.92); return g; },
  moon: () => lathe(dome(0.95), 40),
  sphere: () => new THREE.SphereGeometry(0.95, 40, 28),
  pearl: () => new THREE.SphereGeometry(0.85, 32, 22),
  drop: () => lathe(Array.from({ length: 21 }, (_, i) => { const t = i / 20, a = t * Math.PI; return [Math.max(0.001, Math.sin(a) * (0.8 - t * 0.45)), -Math.cos(a) * 0.95]; }), 36),
  nugget: () => fromSDF((x, y, z) => Math.hypot(x / 1.05, y / 0.78, z / 0.9) * 0.88 - 0.8 + (vnoise(x * 2.6 + 5, y * 2.6, z * 2.6) - 0.5) * 0.3 + (vnoise(x * 6, y * 6 + 3, z * 6) - 0.5) * 0.08),
  magatama: () => fromSDF((x, y, z) => { const zz = z / 0.55; let d = sdSphere(x, y, zz, 0.28, 0.32, 0, 0.5); d = smin(d, sdCapsule(x, y, zz, 0.2, 0.15, 0, -0.32, -0.38, 0, 0.36, 0.17), 0.2); d = smin(d, sdCapsule(x, y, zz, -0.32, -0.38, 0, 0.0, -0.78, 0, 0.17, 0.07), 0.12); return smax(d, -(Math.hypot(x - 0.32, y - 0.4) - 0.1), 0.04) * 0.55; }),   // 頭に穴のある勾玉
  cubes: () => { const parts = [[0, 0, 0, 0.72, 0, 0], [0.55, -0.22, 0.2, 0.42, 0.4, 0.2], [-0.5, -0.25, -0.15, 0.48, -0.3, 0.5], [0.15, 0.42, -0.35, 0.34, 0.6, -0.4], [-0.2, -0.3, 0.55, 0.3, 0.2, 0.8]];   // パイライト：自然にできる立方体の結晶の群れ
    return merge(parts.map(([x, y, z, s, a, b]) => { const g = new THREE.BoxGeometry(s, s, s); g.rotateY(a); g.rotateX(b * 0.3); g.translate(x, y, z); return g; })); },
  branch: () => fromSDF((x, y, z) => { let d = sdCapsule(x, y, z, 0, -0.95, 0, 0.05, 0.1, 0, 0.26, 0.2); for (const [ax, ay, az, bx, by, bz] of [[0.05, 0.1, 0, 0.55, 0.75, 0.1], [0.05, 0.05, 0, -0.5, 0.6, -0.1], [0.05, -0.3, 0, 0.45, 0.05, -0.3], [0.03, -0.45, 0, -0.38, -0.1, 0.3], [0.05, 0.1, 0, 0.05, 0.9, 0.2]]) d = smin(d, sdCapsule(x, y, z, ax, ay, az, bx, by, bz, 0.17, 0.11), 0.12); return d; }),   // 枝サンゴ
};
const geoCache = new Map();
function unitGeo(shape) {
  if (geoCache.has(shape)) return geoCache.get(shape);
  const g = BUILD[shape](); if (!SMOOTH.has(shape) || !g.attributes.normal) g.computeVertexNormals();
  g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()); g.translate(-c.x, -c.y, -c.z);
  let R = 0; const p = g.attributes.position; for (let i = 0; i < p.count; i++) R = Math.max(R, Math.hypot(p.getX(i), p.getY(i), p.getZ(i))); g.scale(1 / R, 1 / R, 1 / R);
  geoCache.set(shape, g); return g;
}

// ---------- 材質 ----------
let _fleck; const fleckTex = () => _fleck || (_fleck = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { x.fillStyle = Math.random() < 0.2 ? '#ffe9a0' : `rgba(10,20,80,${0.2 + Math.random() * 0.3})`; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })());
function gemMats(s) {
  const c = new THREE.Color(s.color);
  if (SMOOTH.has(s.shape)) {
    const clear = !s.opaque && s.shape !== 'pearl';
    const m = new THREE.MeshPhysicalMaterial({ color: c, roughness: s.opaque ? 0.28 : 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.7, iridescence: s.iri || (s.shape === 'pearl' ? 0.45 : 0), iridescenceIOR: 1.6, sheen: s.shape === 'pearl' ? 1 : 0, sheenColor: new THREE.Color('#ffe8f0'), emissive: c, emissiveIntensity: s.amber ? 0.4 : s.opaque ? 0.06 : 0.16, transparent: clear, opacity: s.amber ? 0.9 : 0.92 });
    if (s.flecks) m.map = fleckTex();
    return [m];
  }
  // 透明な宝石：内側の面（奥行き・色の深さ）と、外の面（つや）。ウォーターメロンは頂点の色で2色
  const vc = !!s.color2, base = vc ? new THREE.Color('#ffffff') : c;
  const inner = new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(0.8), vertexColors: vc, roughness: 0.05, metalness: 0, envMapIntensity: 2.2, flatShading: true, side: THREE.BackSide, transparent: true, opacity: 0.78, emissive: c, emissiveIntensity: vc ? 0.12 : 0.38 });
  const outer = new THREE.MeshPhysicalMaterial({ color: base, vertexColors: vc, roughness: 0.02, metalness: 0, ior: s.ior, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 3.4, flatShading: true, transparent: true, opacity: 0.86, emissive: c, emissiveIntensity: vc ? 0.05 : 0.16 });
  return [inner, outer];
}
const METAL = { gold: () => new THREE.MeshStandardMaterial({ color: '#ffcf6a', metalness: 1, roughness: 0.22, envMapIntensity: 1.6 }), platinum: () => new THREE.MeshStandardMaterial({ color: '#e6e9f2', metalness: 1, roughness: 0.18, envMapIntensity: 1.6 }) };
function stoneGeo(s) {
  const g = unitGeo(s.shape); if (!s.color2) return g;
  const k = g.clone(), p = k.attributes.position, a = new THREE.Color(s.color), b = new THREE.Color(s.color2), col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const t = Math.min(1, Math.max(0, (p.getX(i) * 0.35 + p.getY(i)) * 0.6 + 0.5)), c = b.clone().lerp(a, t * t * (3 - 2 * t)); col.set([c.r, c.g, c.b], i * 3); }
  k.setAttribute('color', new THREE.BufferAttribute(col, 3)); return k;
}
// 本物らしく（opt.env＝きらめき用の環境）：カットした宝石は、光の屈折と中の跳ね返りを計算する絵の具。みがいた石・鉱物は、石ごとの光り方
const DISP = { diamond: 0.045, zircon: 0.035, sphene: 0.04, alexandrite: 0.02, spinel: 0.02, garnet: 0.02, tsavorite: 0.022, sapphire: 0.018, ruby: 0.018, tanzanite: 0.02 };
// 石ごとの光り方を、ふつうの材質の式に足す。vObjP＝形の中の位置・vObjN＝形の中の向き・vEyeO＝形から見た目の位置
// 式は全部の石で1つにして、どの光り方かは値（uLook）で選ぶ（石ごとに式を分けると、読み込みで用意する絵の具が増えて重かった）
const LOOK_ID = { opal: 1, moonstone: 2, flash: 3, chatoyant: 4, asterism: 5, bands: 6 };
const LOOK_FS = `{ vec3 Vv = normalize(vViewPosition), Nn = normalize(normal); float nv = clamp(dot(Nn, Vv), 0.0, 1.0);
  if (uLook == 1) { vec3 q = vViewPosition * 7.0 + Nn * 3.0; float h = fract(sin(dot(floor(q * 0.9), vec3(12.9898, 78.233, 37.719))) * 43758.5453), mk = smoothstep(0.35, 0.75, fract(h * 7.31 + dot(Nn, vec3(0.7, 0.4, 0.2)) * 2.0));
    vec3 hue = clamp(abs(fract(h + nv * 0.6 + vec3(0.0, 0.333, 0.667)) * 6.0 - 3.0) - 1.0, 0.0, 1.0); totalEmissiveRadiance += hue * mk * 0.9 * (0.4 + nv); }   // オパールの遊色：角度で色の斑が変わる
  else if (uLook == 2) totalEmissiveRadiance += vec3(0.45, 0.65, 1.0) * pow(nv, 5.0) * 1.1;   // ムーンストーン：正面に浮かぶ青い光
  else if (uLook == 3) { vec3 q = floor(vObjP * 5.0 + vec3(sin(vObjP.y * 7.0), 0.0, cos(vObjP.x * 6.0)) * 0.6); float h = fract(sin(dot(q, vec3(12.9898, 78.233, 37.719))) * 43758.5453), mk = smoothstep(0.66, 0.92, fract(h * 5.7 + Nn.x * 1.6 + Nn.y * 1.1));
    vec3 fc = mix(vec3(0.1, 0.35, 1.0), vec3(0.2, 0.9, 0.5), smoothstep(0.3, 0.6, h)); fc = mix(fc, vec3(1.0, 0.75, 0.2), smoothstep(0.75, 0.95, h)); totalEmissiveRadiance += fc * mk * pow(clamp(Nn.z, 0.0, 1.0), 2.0) * 1.4; }   // ラブラドライト：青・緑・金がひらめく
  else if (uLook == 4) { vec3 Vo = normalize(vObjP - vEyeO), No = normalize(vObjN); float cc = dot(No, vec3(1.0, 0.0, 0.0)) + dot(Vo, vec3(1.0, 0.0, 0.0)) * 0.5; totalEmissiveRadiance += uC2 * exp(-cc * cc * uSharp) * uK; }   // 光の帯（キャッツアイ効果）
  else if (uLook == 5) { vec2 pp = Nn.xy; float st = 0.0; for (int i = 0; i < 3; i++) { float a = float(i) * 1.0472 + 0.3; st += exp(-abs(dot(pp, vec2(-sin(a), cos(a)))) * 55.0); } totalEmissiveRadiance += vec3(0.95, 0.97, 1.0) * st * smoothstep(0.75, 0.0, length(pp)) * 0.9; } }`;   // 6本の光の筋の星
const LOOK_DIF = `{ vec3 q = vObjP;
  if (uLook == 6) { float r = uRing > 0.5 ? length(q.xz + vec2(0.35, -0.2)) * 14.0 + sin(q.y * 6.0) * 1.2 + sin(atan(q.z, q.x) * 5.0) * 0.4 : q.y * 16.0 + sin(q.x * 5.0) * 1.5 + sin(q.z * 7.0) * 0.6; diffuseColor.rgb = mix(uC2, diffuseColor.rgb, smoothstep(-0.25, 0.25, sin(r))); }   // しま模様
  if (uStripes > 0.5) diffuseColor.rgb *= 0.72 + 0.38 * sin(q.z * 38.0 + sin(q.y * 4.0) * 2.0); }`;   // タイガーアイの繊維のしま
function stoneLook(m, s) {
  const look = LOOK_ID[s.id] || LOOK_ID[s.mat] || 0; if (!look && !s.stripes) return m;
  const U = { uLook: { value: look }, uC2: { value: new THREE.Color(s.color2 || '#ffffff') }, uSharp: { value: s.stripes ? 18 : 60 }, uK: { value: s.stripes ? 0.8 : 1.3 }, uRing: { value: s.band === 'ring' ? 1 : 0 }, uStripes: { value: s.stripes ? 1 : 0 } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U); const H = 'uniform int uLook; uniform vec3 uC2; uniform float uSharp; uniform float uK; uniform float uRing; uniform float uStripes;\nvarying vec3 vObjP; varying vec3 vObjN; varying vec3 vEyeO;\n';
    sh.vertexShader = 'varying vec3 vObjP; varying vec3 vObjN; varying vec3 vEyeO;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjP = position; vObjN = normal; vEyeO = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;');
    sh.fragmentShader = H + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + LOOK_DIF).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n' + LOOK_FS);
  };
  m.customProgramCacheKey = () => 'stone-look';
  return m;
}
let _sun; const sunTex = () => _sun || (_sun = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 200; i++) { x.fillStyle = Math.random() < 0.5 ? '#ffd0a0' : '#c8602a'; x.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })());
function realMats(s, geo, env) {
  if (!SMOOTH.has(s.shape)) return [gemMaterial(geo, env, { color: s.color, ior: s.ior || 1.6, disp: DISP[s.id] ?? 0.013, dens: s.id === 'diamond' || s.id === 'rockcrystal' ? 0.02 : 0.26, bright: 1.15 })];
  let m;
  if (s.mat === 'metal') m = new THREE.MeshPhysicalMaterial({ color: s.color, metalness: 1, roughness: s.id === 'pyrite' ? 0.22 : 0.1, clearcoat: 0.3, envMapIntensity: 1.6, flatShading: s.shape === 'cubes' });
  else if (s.mat === 'obsidian') m = new THREE.MeshPhysicalMaterial({ color: s.color, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.35, iridescenceIOR: 1.5, envMapIntensity: 2 });
  else if (s.mat === 'sunstone') m = new THREE.MeshPhysicalMaterial({ color: s.color, map: sunTex(), roughness: 0.12, clearcoat: 1, emissive: s.color, emissiveIntensity: 0.25, transparent: true, opacity: 0.94, envMapIntensity: 1.8 });
  else { m = gemMats(s)[0]; if (s.mat) { m.color.set(s.color); m.transparent = false; m.roughness = 0.22; m.clearcoat = 0.6; m.envMapIntensity = 0.75; } }   // みがいた不透明な石は、映り込みを控えめに（強いと鏡のように見えた）
  m.envMap = env; m.envMapIntensity = (m.envMapIntensity || 1) * 0.9;   // みがいた面にも、きらめき用の環境を映す
  return [stoneLook(m, s)];
}
// ---------- 組み上がる（砕けた宝石が、下のかけらから順にはまって元にもどる） ----------
// 面を、表面のかけら（近い三角どうし）に分け、三角ごとに「何番目にはまるか（aCell：0＝いちばん下）」と「かけらの中心（aCellC）」を持たせる。
// uAsm（進み具合）が aCell を越えたかけらから、小さく縮んだ所からふくらんで、はまる（uAsm＝99 でふつうの表示）
const ASM_VS = 'float asmA = 1.0; if (uAsm < 50.0) { asmA = clamp((uAsm - aCell) / 0.14, 0.0, 1.0); transformed = aCellC + (transformed - aCellC) * (asmA <= 0.0 ? 0.0 : 0.55 + 0.45 * asmA + 0.12 * sin(asmA * 3.1416)); } vAsm = asmA;';
function assembleMat(m, glow) {
  const U = { value: 99 }, G = { value: new THREE.Color(glow).multiplyScalar(1.6) }, prev = m.onBeforeCompile, pk = m.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey ? 'plain' : m.customProgramCacheKey();
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r); sh.uniforms.uAsm = U; sh.uniforms.uAsmGlow = G;
    sh.vertexShader = 'attribute float aCell; attribute vec3 aCellC; uniform float uAsm; varying float vAsm;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + ASM_VS);
    sh.fragmentShader = 'uniform vec3 uAsmGlow; varying float vAsm;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uAsmGlow * (1.0 - vAsm);');
  };
  m.customProgramCacheKey = () => pk + '+asm'; m.userData.asm = U; return m;
}
function addCells(g, N, color, up) {
  g.updateMatrixWorld(true); const tris = [], V = new THREE.Vector3(), done = new Set();
  g.traverse((o) => {
    if (!o.isMesh) return; o.geometry = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();   // 三角ごとに値を持たせるので、点を共有しない形に（形の元は共有なので写しを作る）
    const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i += 3) { const c = new THREE.Vector3(); for (let k = 0; k < 3; k++) c.add(V.fromBufferAttribute(p, i + k)); tris.push({ o, i, c: c.multiplyScalar(1 / 3).applyMatrix4(o.matrixWorld) }); }
    if (!done.has(o.material)) { done.add(o.material); if (!o.material.isShaderMaterial) assembleMat(o.material, color); }
  });
  // かけらの中心：いちばん下の三角から始めて、いちばん遠い所を次々に選ぶ（どんな形でも、まんべんなく散る）
  const H = (c) => c.dot(up), C = [tris.reduce((a, b) => (H(b.c) < H(a.c) ? b : a)).c], d = tris.map((t) => t.c.distanceToSquared(C[0]));
  while (C.length < Math.min(N, tris.length)) { let j = 0; for (let i = 1; i < d.length; i++) if (d[i] > d[j]) j = i; if (d[j] < 1e-10) break; C.push(tris[j].c); for (let i = 0; i < d.length; i++) d[i] = Math.min(d[i], tris[i].c.distanceToSquared(tris[j].c)); }
  let y0 = 1e9, y1 = -1e9; for (const c of C) { y0 = Math.min(y0, H(c)); y1 = Math.max(y1, H(c)); }
  const cells = C.map((c) => ({ c: c.clone(), h: H(c), key: (H(c) - y0) / Math.max(1e-6, y1 - y0) + Math.random() * 0.12 })).sort((a, b) => a.key - b.key);
  cells.forEach((cl, i) => { cl.order = cells.length > 1 ? (i / (cells.length - 1)) * 0.86 : 0; });   // 下から順に。最後のかけらが、進み具合1ではまり終わる
  const inv = new Map();
  for (const t of tris) {
    let j = 0, bd = 1e9; for (let k = 0; k < cells.length; k++) { const dd = t.c.distanceToSquared(cells[k].c); if (dd < bd) { bd = dd; j = k; } }
    const geo = t.o.geometry; if (!geo.attributes.aCell) { geo.setAttribute('aCell', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1)); geo.setAttribute('aCellC', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3)); inv.set(t.o, t.o.matrixWorld.clone().invert()); }
    const lc = V.copy(cells[j].c).applyMatrix4(inv.get(t.o)); for (let k = 0; k < 3; k++) { geo.attributes.aCell.array[t.i + k] = cells[j].order; geo.attributes.aCellC.array.set([lc.x, lc.y, lc.z], (t.i + k) * 3); }
  }
  return cells;
}

// 宝石1つ。group と、ぶつかりの形（凸包の点）と、きらめく所（ローカル座標）と、半径（いちばん遠い点まで）を返す。size＝いちばん遠い点までの長さ（m）
// opt.assemble＝砕けて組み上がる用のかけら分けの数（cells：下から順の、かけらの中心）。opt.up＝飾った時の真上の向き（形の中の向き。傾けて飾る宝石用）
export function makeGem(s, size, opt = {}) {
  const g = new THREE.Group(), geo = stoneGeo(s), mats = opt.env ? realMats(s, geo, opt.env) : gemMats(s), glints = [];
  const stone = new THREE.Group(); for (const m of mats) stone.add(new THREE.Mesh(geo, m));
  if (s.kind === 'ring') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 12, 40), METAL[s.metal]()); band.position.y = -0.62; g.add(band);
    stone.scale.setScalar(0.5); stone.position.y = 0.16; g.add(stone);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4, pr = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.26, 6), band.material); pr.position.set(Math.cos(a) * 0.36, 0.06, Math.sin(a) * 0.36); pr.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); g.add(pr); }
    glints.push([0, 0.42, 0], [0.15, 0.3, 0.1]);
  } else if (s.kind === 'earring') {
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 8, 24, Math.PI * 1.3), METAL[s.metal]()); hook.position.y = 0.95; hook.rotation.z = -0.3; g.add(hook);
    const link = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), hook.material); link.position.y = 0.55; g.add(link);
    stone.scale.setScalar(0.6); g.add(stone);
    glints.push([0, 0.2, 0.4], [0.25, 0, 0.3]);
  } else { g.add(stone); glints.push([0, 0.6, 0.25], [0.5, 0.3, 0.4], [-0.45, 0.35, -0.3]); }
  for (const ch of g.children) { ch.position.multiplyScalar(size); ch.scale.multiplyScalar(size); }
  for (const p of glints) for (let k = 0; k < 3; k++) p[k] *= size;
  // ぶつかりの形：面の点から、まんべんなく最大400点（点を等間隔に間引くと、点が一つの輪に並んで平たい形になった）
  const all = []; g.updateMatrixWorld(true); g.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); all.push(v.x, v.y, v.z); } });
  const n = all.length / 3, take = Math.min(n, 400), hull = new Float32Array(take * 3); for (let i = 0; i < take; i++) { const j = n <= 400 ? i : (Math.random() * n) | 0; hull.set([all[j * 3], all[j * 3 + 1], all[j * 3 + 2]], i * 3); }
  // 形の真ん中を原点に寄せ、いちばん遠い点までを半径にする（指輪・ピアスは見た目より大きい。小さく見積もると、中で重なって置かれ、外れた時に弾け飛んだ）
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9]; for (let i = 0; i < all.length; i += 3) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], all[i + k]); hi[k] = Math.max(hi[k], all[i + k]); }
  const c = lo.map((v, k) => (v + hi[k]) / 2); let R = 0;
  for (let i = 0; i < all.length; i += 3) R = Math.max(R, Math.hypot(all[i] - c[0], all[i + 1] - c[1], all[i + 2] - c[2]));
  for (let i = 0; i < hull.length; i += 3) for (let k = 0; k < 3; k++) hull[i + k] -= c[k];
  for (const ch of g.children) ch.position.sub(new THREE.Vector3(...c)); for (const p of glints) for (let k = 0; k < 3; k++) p[k] -= c[k];
  const cells = opt.assemble ? addCells(g, opt.assemble, s.color, opt.up || new THREE.Vector3(0, 1, 0)) : null;
  return { group: g, hull, glints: glints.map((p) => new THREE.Vector3(...p)), radius: R, spec: s, mats, cells };
}
