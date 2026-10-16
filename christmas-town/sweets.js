// お菓子の町の部品（本人 2026-10-16「家々はグミではなく、お菓子の家」「山はかき氷・ソフトクリーム」「炭酸の滝」「ジンジャークッキーは手足がぐにょりと曲がって歩く」
//   v3「お菓子の家をもっとリアルなお菓子にリッチに・クリックすると端っこが欠ける」「ジンジャーブレッドはクッキーの質感を足してリッチに・端から削れて欠片になり、また集まって復活」「かき氷の山・パフェの山をリッチに」「トナカイも足や首を動かして駆けさせて」）
// ・素材：焼いた生地（スパイスの粒・砂糖の粒・小さな穴）・粉砂糖のフロスティング（ぼってりした凹凸）・ウエハース（深い格子）・板チョコ（面取りの溝）。どれも手続きで描き、凹凸の絵つき
// ・家：クッキーの壁（ふちは焼き色が濃い）・アイシングの縁と波の飾り・砂糖の真珠・屋根（フロスティングのしずく／ウエハース／チョコ）・飴の窓・チョコの扉・キャンディケイン・リース・ガムドロップ
//   たくさん並べるので、同じ材質の部品は町じゅう1つにまとめて描く（Acc）。かじり跡は、世界の座標の球で穴をあける（材質ぜんぶに共通・中は灯りのともる部屋の色）
// ・山：かき氷（つぶつぶの氷にシロップ・練乳・くだもの・ガラスの器）・パフェ（大きなグラスに層・ソフトクリーム・ウエハース・ポッキー・さくらんぼ）
// ・住人：ジンジャークッキー（男女・老若。肩・股から先を「ぐにょり」と曲げる。端から削れて消え、また集まる）。そりのサンタとトナカイもクッキー（トナカイは脚と首を動かして駆ける）
import * as THREE from 'three';
import * as RM from './real_mats.js';

const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a), SS = THREE.MathUtils.smoothstep;
const ctex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const nonIdx = (g) => (g.index ? g.toNonIndexed() : g);
const hash2 = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };

// ---------- 同じ材質の部品をまとめる（色は頂点ごと。形が色を持っていれば、それに掛ける） ----------
export class Acc {
  constructor() { this.parts = new Map(); }
  add(key, geo, color = null, m = null) { if (m) geo.applyMatrix4(m); (this.parts.get(key) || this.parts.set(key, []).get(key)).push([nonIdx(geo), color]); }
  build(mats) {
    const out = [];
    for (const [key, list] of this.parts) {
      let n = 0; for (const [g] of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3); let o = 0;
      for (const [g, c] of list) { const k = g.attributes.position.count, gc = g.attributes.color; pos.set(g.attributes.position.array.subarray(0, k * 3), o * 3); nrm.set(g.attributes.normal.array.subarray(0, k * 3), o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, k * 2), o * 2); const cc = c ? new THREE.Color(c) : new THREE.Color(1, 1, 1); for (let i = 0; i < k; i++) col.set(gc ? [cc.r * gc.getX(i), cc.g * gc.getY(i), cc.b * gc.getZ(i)] : [cc.r, cc.g, cc.b], (o + i) * 3); o += k; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeBoundingSphere(); const mesh = new THREE.Mesh(geo, mats[key]); mesh.userData.key = key; out.push(mesh);
    }
    return out;
  }
}

// ---------- 本物らしいお菓子の素材（手続きで描く・継ぎ目なくくり返せる・凹凸の絵つき） ----------
const N = 256;
function heightTex(fill, k) {
  const h = new Float32Array(N * N), c = RM.canvasOf(N, N, (d) => { for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const [r, g, b, hh] = fill(i, j), o = (j * N + i) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; h[j * N + i] = hh; } });
  return { map: RM.toTex(c, true), normal: RM.toTex(RM.normalFrom(h, N, N, k), false), canvas: c };
}
const memo = (f) => { let v; return () => v || (v = f()); };
// 焼いた生地：焼きむら・小さな穴・スパイスの粒・砂糖の粒
export const dough = memo(() => heightTex((i, j) => {
  const x = (i / N) * 8, y = (j / N) * 8, f = RM.fbm(x, y, 8, 4), fine = RM.vn(x * 5, y * 5, 40), pit = RM.vn(x * 2.5 + 3, y * 2.5, 20), h0 = hash2(i, j);
  let r = 132 + 92 * f, g = 72 + 62 * f, b = 32 + 36 * f, hh = f * 0.6 + fine * 0.25;
  if (pit > 0.76) { const k = (pit - 0.76) * 4; hh -= k * 0.4; r *= 1 - k * 0.25; g *= 1 - k * 0.27; b *= 1 - k * 0.3; }
  if (h0 > 0.986) { r *= 0.5; g *= 0.45; b *= 0.4; hh += 0.06; } else if (h0 < 0.007) { r = 252; g = 236; b = 205; hh += 0.3; }
  return [r, g, b, hh];
}, 3.2));
// 粉砂糖のフロスティング：ぼってりした盛り上がりと、砂糖のきらめき
const frosting = memo(() => heightTex((i, j) => {
  const x = (i / N) * 6, y = (j / N) * 6, f = RM.fbm(x, y, 6, 4), lump = SS(f, 0.32, 0.78), grain = RM.vn(x * 8, y * 8, 48), h0 = hash2(i + 7, j + 3);
  const sh = (1 - lump) * 0.5, sp = h0 > 0.992 ? 1 : 0;
  return [250 - sh * 36 + sp * 5, 252 - sh * 28, 255 - sh * 9, lump * 0.8 + grain * 0.15 + sp * 0.2];
}, 3.5));
// ウエハース：斜めの深い格子。山はこんがり、溝は濃く
const waferTex = memo(() => heightTex((i, j) => {
  const a = (((i + j) % 32) + 32) % 32 / 32, b = (((i - j) % 32) + 32) % 32 / 32, e = Math.min(a, 1 - a, b, 1 - b) * 2, top = SS(e, 0.05, 0.3), t = RM.fbm((i / N) * 4, (j / N) * 4, 4, 3), g0 = RM.vn((i / N) * 32, (j / N) * 32, 32);
  return [150 + 80 * top + 26 * t, 98 + 78 * top + 20 * t, 42 + 60 * top + 10 * t, top * 0.85 + g0 * 0.1];
}, 6));
// 板チョコ：面取りした溝で区切った四角。少しつやのむら
const chocoTex = memo(() => heightTex((i, j) => {
  const fx = (i % 64) / 64, fy = (j % 64) / 64, e = Math.min(fx, 1 - fx, fy, 1 - fy), top = SS(e, 0.02, 0.12), sheen = 0.5 + 0.5 * Math.sin((fx + fy) * 3);
  return [44 + 34 * top + 10 * sheen * top, 24 + 18 * top + 5 * sheen * top, 12 + 9 * top, top];
}, 5));
// 砂糖をまぶした粒（グミ・果物の表面の細かな凹凸）
const sugarTex = memo(() => heightTex((i, j) => { const g = RM.vn((i / N) * 48, (j / N) * 48, 48), h0 = hash2(i + 31, j + 17); return [255, 255, 255, g * 0.6 + (h0 > 0.97 ? 0.4 : 0)]; }, 4));

// ---------- かじり跡：家の材質ぜんぶに共通。世界の座標の球（歯形のぎざぎざつき）で穴をあけ、ふちは中の生地の色。クッキーの中は灯りのともる部屋の色 ----------
export const BITES = Array.from({ length: 32 }, () => new THREE.Vector4(0, -999, 0, 0));
const BITE_U = { value: BITES };
const BITE_FS = `uniform vec4 uBite[32]; varying vec3 vBW;
float biteD() { float m = 1e3; for (int i = 0; i < 32; i++) { vec4 b = uBite[i]; if (b.w <= 0.0) continue; vec3 d = vBW - b.xyz; float L = length(d); if (L > b.w * 1.5) continue;
  float jag = 1.0 + 0.14 * sin(atan(d.z, d.x) * 9.0 + b.x * 7.0) * cos(d.y * 29.0 + b.z * 5.0) + 0.05 * sin(d.y * 61.0 + d.x * 47.0); m = min(m, L - b.w * jag); } return m; }
`;
function biteable(m, inner = false) {
  m.onBeforeCompile = (sh) => { sh.uniforms.uBite = BITE_U;
    sh.vertexShader = 'varying vec3 vBW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvBW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = BITE_FS + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat bd = biteD(); if (bd < 0.0) discard;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (bd < 0.04) diffuseColor.rgb *= vec3(1.08, 0.86, 0.66);' + (inner ? '\nif (!gl_FrontFacing) diffuseColor.rgb *= 0.5;' : ''))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>' + (inner ? '\nif (!gl_FrontFacing) totalEmissiveRadiance += vec3(1.0, 0.55, 0.2) * 0.32;' : ''));
  };
  m.customProgramCacheKey = () => 'bite' + (inner ? 'I' : ''); return m;
}

// ---------- 材質 ----------
export function makeMats(env) {
  const D = dough(), F = frosting(), W = waferTex(), C = chocoTex(), G = sugarTex();
  const glass = ctex(128, 160, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h / 2, h * 0.7); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e8e8e8'); gr.addColorStop(1, '#a8a8a8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(w / 2 - 4, 0, 8, h); g.fillRect(0, h * 0.42, w, 8); g.fillStyle = 'rgba(120,60,30,.35)'; g.fillRect(6, h * 0.62, w - 12, h * 0.3); });
  const mint = ctex(128, 128, (g) => { g.fillStyle = '#fbf6f2'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#e0233a'; for (let i = 0; i < 8; i += 2) { g.beginPath(); g.moveTo(64, 64); for (let k = 0; k <= 10; k++) { const a = ((i + k / 10) / 8) * TAU + (k / 10) * 0.9; g.lineTo(64 + Math.cos(a) * 62 * (k / 10 + 0.05), 64 + Math.sin(a) * 62 * (k / 10 + 0.05)); } for (let k = 10; k >= 0; k--) { const a = ((i + 1 + k / 10) / 8) * TAU + (k / 10) * 0.9; g.lineTo(64 + Math.cos(a) * 62 * (k / 10 + 0.05), 64 + Math.sin(a) * 62 * (k / 10 + 0.05)); } g.fill(); } });
  const stripe = ctex(64, 256, (g, w, h) => { g.fillStyle = '#fbf6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#d81e34'; for (let i = -2; i < 10; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32 - 22); g.lineTo(w, i * 32 - 6); g.lineTo(0, i * 32 + 16); g.fill(); } });
  const E = (o) => Object.assign(o, env ? { envMap: env } : {}), V2 = (k) => new THREE.Vector2(k, k);
  const M = {
    cookie: new THREE.MeshStandardMaterial({ map: D.map, normalMap: D.normal, normalScale: V2(1.1), vertexColors: true, roughness: 0.76, side: THREE.DoubleSide }),
    frost: new THREE.MeshPhysicalMaterial(E({ map: F.map, normalMap: F.normal, normalScale: V2(0.9), color: '#fbfcff', roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.35, sheen: 0.6, sheenColor: new THREE.Color('#e4ecff'), emissive: '#2a3460', emissiveIntensity: 0.12, envMapIntensity: 0.8 })),
    icing: new THREE.MeshPhysicalMaterial(E({ color: '#fffaf2', normalMap: G.normal, normalScale: V2(0.3), roughness: 0.3, clearcoat: 0.5, emissive: '#fff1dc', emissiveIntensity: 0.1, envMapIntensity: 0.6 })),
    wafer: new THREE.MeshStandardMaterial({ map: W.map, normalMap: W.normal, normalScale: V2(1.2), vertexColors: true, roughness: 0.7 }),
    choco: new THREE.MeshPhysicalMaterial(E({ map: C.map, normalMap: C.normal, normalScale: V2(1.0), roughness: 0.26, clearcoat: 0.6, clearcoatRoughness: 0.14, envMapIntensity: 0.7 })),
    glass: new THREE.MeshBasicMaterial({ map: glass, vertexColors: true }),
    gum: new THREE.MeshPhysicalMaterial(E({ vertexColors: true, normalMap: G.normal, normalScale: V2(0.6), roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.35, envMapIntensity: 0.5, emissive: '#000000' })),
    mint: new THREE.MeshPhysicalMaterial(E({ map: mint, roughness: 0.22, clearcoat: 1, envMapIntensity: 0.8 })),
    stripe: new THREE.MeshPhysicalMaterial(E({ map: stripe, roughness: 0.22, clearcoat: 1, envMapIntensity: 0.8 })),
    pearl: new THREE.MeshPhysicalMaterial(E({ color: '#fffaf0', roughness: 0.12, clearcoat: 1, iridescence: 0.4, iridescenceIOR: 1.5, envMapIntensity: 1.3 })),
  };
  for (const [k, m] of Object.entries(M)) biteable(m, k === 'cookie');
  return M;
}

// ---------- 家 ----------
// 縁のアイシング：辺にそって少し波打つ管（絞り出したように）。wav＝波の大きさ
function piped(pts, r = 0.032, wav = 0.012, closed = false, step = 0.16) {
  const P = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = a.distanceTo(b), n = Math.max(2, Math.round(L / step)); for (let k = 0; k < n; k++) { const t = k / n, p = a.clone().lerp(b, t); p.y += Math.sin((i + t) * 37) * wav * 0.6; P.push(p.addScalar(Math.sin(k * 2.1) * wav * 0.4)); } }
  if (!closed) P.push(pts[pts.length - 1].clone());
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P, closed), Math.max(4, P.length), r, r < 0.03 ? 3 : 4, closed);
}
// しずく（屋根から垂れたフロスティング）
const DRIP = (() => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, y = -t; pts.push(new THREE.Vector2(0.001 + Math.sin(Math.PI * Math.min(1, t * 1.05)) * (0.6 + 0.4 * t) * 0.9 * (t < 0.15 ? 0.7 + t * 2 : 1), y)); } pts[0].x = 0.9; pts[6].x = 0.001; return new THREE.LatheGeometry(pts, 6); })();
const GUM = (() => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(Math.max(0.001, Math.cos(t * Math.PI / 2) ** 0.7), Math.sin(t * Math.PI / 2) * 1.1)); } return new THREE.LatheGeometry(pts, 8); })();
const PEARL = new THREE.IcosahedronGeometry(1, 0), GUM_S = (() => { const pts = []; for (let i = 0; i <= 3; i++) { const t = i / 3; pts.push(new THREE.Vector2(Math.max(0.001, Math.cos(t * Math.PI / 2) ** 0.7), Math.sin(t * Math.PI / 2) * 1.1)); } return new THREE.LatheGeometry(pts, 6); })();
function gable(w, h, rh) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(0, h + rh); s.lineTo(-w / 2, h); s.closePath(); return s; }
// キャンディケイン（J の形の管）
function cane(x, y0, h, z, dir = 1, r = 0.035) { const P = [new THREE.Vector3(x, y0, z), new THREE.Vector3(x, y0 + h * 0.75, z)]; for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI; P.push(new THREE.Vector3(x + dir * (0.09 - Math.cos(a) * 0.09), y0 + h * 0.75 + Math.sin(a) * 0.1, z)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 24, r, 6, false); }
const GUMC = ['#ff4a5a', '#3fd06a', '#ffd23a', '#5fa8ff', '#ff8a2a', '#c07aff'];
// o＝{ x, y, z, ry, w, d, h, rh, roof: 'frost'|'wafer'|'choco', shade, glass, gum, chimney, door, mint, base（坂の下へ伸ばす土台の高さ）, lod（0＝近い：全部／1＝横と後ろの窓・しずくを省く／2＝遠い：正面の縁と窓だけ） }
export function addHouse(acc, o) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(o.x, o.y, o.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.ry || 0), new THREE.Vector3(1, 1, 1));
  const lod = o.lod ?? (o.simple ? 1 : 0), at = (g) => g.applyMatrix4(M), { w, d, h, rh } = o, bev = 0.05, top = h + rh, a = Math.atan2(rh, w / 2), Ls = Math.hypot(w / 2, rh) + 0.22, zf = d / 2 + bev, R = (s) => (hash2((o.seed | 0) + s, o.w * 10) < 0.5);
  // 壁：焼いた生地。面取りの所（角）は焼き色を濃く
  const body = new THREE.ExtrudeGeometry(gable(w, h, rh), { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 1 }).translate(0, 0, -d / 2);
  const uvA = body.attributes.uv, nA = body.attributes.normal, tc = new Float32Array(nA.count * 3); for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 0.7, uvA.getY(i) * 0.7);
  for (let i = 0; i < nA.count; i++) { const nz = Math.abs(nA.getZ(i)), k = 1 - 0.32 * SS(nz, 0.04, 0.3) * (1 - SS(nz, 0.8, 0.98)); tc.set([k, k * 0.95, k * 0.9], i * 3); } body.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  acc.add('cookie', at(body), o.shade);
  if (o.base) acc.add('choco', at(new THREE.BoxGeometry(w + 0.16, o.base, d + 0.16).translate(0, -o.base / 2 + 0.04, 0)));
  // 屋根
  for (const sd of [-1, 1]) {
    const thick = o.roof === 'frost' ? 0.16 : 0.1, sl = new THREE.BoxGeometry(Ls, thick, d + 0.36, o.roof === 'frost' && lod === 0 ? 4 : 1, 1, o.roof === 'frost' && lod === 0 ? 5 : 1);
    if (o.roof === 'frost') { const p = sl.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + (hash2(Math.round(p.getX(i) * 20), Math.round(p.getZ(i) * 20)) - 0.5) * 0.06); sl.computeVertexNormals(); }   // ぼってり塗ったフロスティング
    sl.rotateZ(-sd * a); sl.translate(sd * (w / 4) - sd * Math.sin(a) * (thick / 2 + bev) + sd * Math.cos(a) * 0.08, h + rh / 2 + Math.cos(a) * (thick / 2 + bev) - Math.sin(a) * 0.08, 0);
    acc.add(o.roof === 'frost' ? 'frost' : o.roof, at(sl), o.roof === 'wafer' ? o.shade : null);
    // 軒先のしずく（フロスティング）。ウエハース・チョコの屋根は、軒に細い雪と、色のガムドロップ
    const ex = sd * (w / 2 + 0.2), ey = h - 0.02;
    if (o.roof === 'frost' && lod === 0) { for (let z = -d / 2 - 0.1; z <= d / 2 + 0.1; z += rnd(0.22, 0.34)) { const L = rnd(0.07, 0.34), dr = DRIP.clone().scale(0.05, L, 0.05).translate(ex, ey + 0.02, z); acc.add('frost', at(dr)); } }
    else { acc.add('frost', at(new THREE.CylinderGeometry(0.06, 0.06, d + 0.36, 6).rotateX(Math.PI / 2).translate(ex, ey + 0.04, 0))); if (lod === 0) for (let z = -d / 2; z <= d / 2 + 0.01; z += 0.38) acc.add('gum', at(GUM_S.clone().scale(0.06, 0.06, 0.06).translate(ex, ey + 0.08, z)), GUMC[Math.abs(Math.round(z * 3.1 + sd + (o.seed | 0))) % GUMC.length]); }
  }
  acc.add('frost', at(new THREE.CylinderGeometry(0.1, 0.1, d + 0.4, 8).rotateX(Math.PI / 2).translate(0, top + bev + 0.05, 0)));   // 棟の雪
  // 縁のアイシング：前後の妻・四隅。近い家は、妻の線に砂糖の真珠、壁の足もとに波の飾り
  for (const zz of lod < 2 ? [zf + 0.01, -zf - 0.01] : [zf + 0.01]) { acc.add('icing', at(piped([new THREE.Vector3(-w / 2 - 0.05, h, zz), new THREE.Vector3(0, top + 0.03, zz), new THREE.Vector3(w / 2 + 0.05, h, zz)], 0.034, 0.016))); if (lod === 0 || zz > 0) for (const sx of [-1, 1]) acc.add('icing', at(piped([new THREE.Vector3(sx * (w / 2 + bev), 0.05, zz), new THREE.Vector3(sx * (w / 2 + bev), h, zz)], 0.028))); }
  if (lod === 0) {
    for (const [p0, p1] of [[[-w / 2, h], [0, top]], [[0, top], [w / 2, h]]]) { const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.round(L / 0.15); for (let i = 1; i < n; i++) { const t = i / n; acc.add('pearl', at(PEARL.clone().scale(0.034, 0.034, 0.034).translate(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - 0.07, zf + 0.04))); } }
    acc.add('icing', at(piped([new THREE.Vector3(-w / 2 - bev, 0.14, zf + 0.02), new THREE.Vector3(w / 2 + bev, 0.14, zf + 0.02)], 0.03, 0.035)));
    for (const sx of [-1, 1]) acc.add('icing', at(piped([new THREE.Vector3(sx * (w / 2 + bev + 0.02), 0.14, zf), new THREE.Vector3(sx * (w / 2 + bev + 0.02), 0.14, -zf)], 0.03, 0.035)));
  }
  // 窓（前・後ろ・両横）：飴のガラスに、アイシングの枠と窓台の雪。近い家は、ウエハースの雨戸
  const win = (cx, cy, ww, wh, face) => {
    const pane = new THREE.PlaneGeometry(ww, wh), R4 = [[-ww / 2, -wh / 2], [ww / 2, -wh / 2], [ww / 2, wh / 2], [-ww / 2, wh / 2], [-ww / 2, -wh / 2]].map(([x, y]) => new THREE.Vector3(x * 1.08, y * 1.08, 0.01));
    const sill = new THREE.BoxGeometry(ww + 0.18, 0.07, 0.13, 4, 1, 1).translate(0, -wh / 2 - 0.05, 0.05), pip = piped(R4, 0.026, 0.008, false, 0.3);
    const F = new THREE.Matrix4(); if (face === 'f') F.makeTranslation(cx, cy, zf + 0.004); else if (face === 'b') F.makeRotationY(Math.PI).setPosition(-cx, cy, -zf - 0.004); else { const s = face === 'r' ? 1 : -1; F.makeRotationY(s * Math.PI / 2).setPosition(s * (w / 2 + bev + 0.004), cy, cx); }
    const parts = lod < 2 ? [['glass', pane, o.glass], ['icing', pip, null], ['frost', sill, null]] : [['glass', pane, o.glass], ['frost', sill, null]];
    if (lod === 0 && face === 'f' && o.shutter) for (const s of [-1, 1]) parts.push(['wafer', new THREE.BoxGeometry(ww * 0.45, wh * 1.08, 0.03).translate(s * (ww * 0.78), 0, 0.02), '#f0d8b0']);
    for (const [k, g, c] of parts) { g.applyMatrix4(F); acc.add(k, at(g), c); }
  };
  const ww = Math.min(0.42, w * 0.2), wh = ww * 1.3, rows = h > 2.6 ? 2 : 1;
  for (let r = 0; r < rows; r++) { const cy = rows === 1 ? h * 0.55 : h * (0.32 + r * 0.38); for (const cx of [-w * 0.27, w * 0.27]) { win(cx, cy, ww, wh, 'f'); if (lod === 0) win(cx, cy, ww, wh, 'b'); } if (lod === 0) for (const cz of d > 2.6 ? [-d * 0.25, d * 0.25] : [0]) { win(cz, cy, ww, wh, 'r'); win(cz, cy, ww, wh, 'l'); } }
  win(0, h + rh * 0.38, ww * 0.8, ww * 0.8, 'f');
  // 扉：チョコの板に、アイシングのアーチ。近い家は、両わきにキャンディケインと、扉にリース
  if (o.door) { const dw = 0.5, dh = Math.min(1.0, h * 0.42), door = new THREE.BoxGeometry(dw, dh, 0.06).translate(0, dh / 2, zf + 0.02); acc.add('choco', at(door)); acc.add('icing', at(piped([new THREE.Vector3(-dw / 2 - 0.04, 0, zf + 0.06), new THREE.Vector3(-dw / 2 - 0.04, dh, zf + 0.06), new THREE.Vector3(0, dh + 0.12, zf + 0.06), new THREE.Vector3(dw / 2 + 0.04, dh, zf + 0.06), new THREE.Vector3(dw / 2 + 0.04, 0, zf + 0.06)], 0.026)));
    if (lod === 0) { for (const s of [-1, 1]) acc.add('stripe', at(cane(s * (dw / 2 + 0.16), 0, dh * 0.95, zf + 0.12, -s)));
      if (R(3)) { acc.add('gum', at(new THREE.TorusGeometry(0.13, 0.045, 8, 18).translate(0, dh * 0.62, zf + 0.08)), '#2a9a4a'); for (let i = 0; i < 4; i++) { const an = (i / 4) * TAU + 0.4; acc.add('gum', at(new THREE.SphereGeometry(0.03, 8, 6).translate(Math.cos(an) * 0.13, dh * 0.62 + Math.sin(an) * 0.13, zf + 0.12)), '#e8283a'); } } } }
  // 棟のガムドロップ・煙突・ペパーミント
  if (o.gum && lod < 2) { const n = Math.max(3, Math.round(d / 0.45)); for (let i = 0; i < n; i++) { const z = -d / 2 + (i + 0.5) * (d / n), gd = (lod === 0 ? GUM : GUM_S).clone().scale(0.11, 0.11, 0.11).translate(0, top + bev + 0.12, z); acc.add('gum', at(gd), GUMC[(i + (o.seed | 0)) % GUMC.length]); } }
  if (o.chimney) { const cx = w * 0.24, cz = -d * 0.2, ch = new THREE.BoxGeometry(0.34, 0.9, 0.34).translate(cx, h + rh * 0.45 + 0.3, cz); acc.add('cookie', at(ch), o.shade); acc.add('frost', at(new THREE.CylinderGeometry(0.23, 0.2, 0.12, 10).translate(cx, h + rh * 0.45 + 0.78, cz))); }
  if (o.mint && lod < 2) { const pm = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20).rotateX(Math.PI / 2).translate(0, h + rh * 0.62, zf + 0.03); acc.add('mint', at(pm)); }
}

// ---------- 山：かき氷・ソフトクリーム・パフェ ----------
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const SYRUP = { strawberry: '#e8243e', melon: '#5fd06a', hawaii: '#2f8cf0', lemon: '#ffe14a', grape: '#9a4ad8' };
const kakiR = (R, H, y) => R * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, y / H), 1.7)), 0.55);
// かき氷の山：丸く盛った氷のつぶ（大小のでこぼこ）。上から色のシロップがしみて、筋になって垂れる
export function kakigori(R, H, syrup, seed = 1) {
  const prof = []; for (let i = 0; i <= 28; i++) { const t = i / 28, y = H * t; prof.push(new THREE.Vector2(Math.max(0.001, kakiR(R, H, y)), y)); }
  const g = new THREE.LatheGeometry(prof, 56), p = g.attributes.position, col = new Float32Array(p.count * 3), sc = new THREE.Color(SYRUP[syrup] || syrup), ice = new THREE.Color('#eef4ff');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ang = Math.atan2(z, x), t = y / H, r = Math.hypot(x, z);
    const bump = (vnoise(ang * 6 + seed, t * 9) - 0.5) * 0.09 + (vnoise(ang * 24 + seed * 3, t * 30) - 0.5) * 0.04; const k = r > 0.01 ? 1 + bump : 1; p.setX(i, x * k); p.setZ(i, z * k); p.setY(i, y + bump * H * 0.15 * (1 - t));
    const drip = 0.55 - 0.32 * Math.pow(Math.max(0, Math.sin(ang * 7 + seed) * 0.5 + 0.5 * vnoise(ang * 3, seed)), 2), cov = SS(t, drip - 0.06, drip + 0.08), c = ice.clone().lerp(sc, cov * 0.92).multiplyScalar(0.92 + vnoise(ang * 40, t * 60) * 0.16);
    col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
// ソフトクリームの山：絞り口の筋（8本）のある太い管が、細くなりながら3回半うずを巻いて、先がくるり
export function softServe(R, H, colA, colB = null, turns = 3.4) {
  const RS = 16, Nn = 170, pos = [], col = [], idx = [], ca = new THREE.Color(colA), cb = new THREE.Color(colB || colA);
  for (let i = 0; i <= Nn; i++) { const t = i / Nn, th = t * turns * TAU, rc = R * 0.62 * (1 - t * 0.92), y = H * (0.08 + 0.78 * Math.pow(t, 0.85)) + (t > 0.94 ? (t - 0.94) * H * 2.2 : 0), rt = R * 0.42 * (1 - t * 0.78) + 0.02 * R;
    const cx = Math.cos(th) * rc, cz = Math.sin(th) * rc, mix = colB ? 0.5 + 0.5 * Math.sin(th * 0.5) : 0, c = ca.clone().lerp(cb, mix);
    for (let j = 0; j <= RS; j++) { const ph = (j / RS) * TAU, rr = rt * (1 + 0.08 * Math.sin(ph * 8)), nx = Math.cos(th) * Math.cos(ph), ny = Math.sin(ph), nz = Math.sin(th) * Math.cos(ph); pos.push(cx + nx * rr, y + ny * rr * 0.85, cz + nz * rr); const sh = 0.88 + 0.12 * Math.sin(ph * 8); col.push(c.r * sh, c.g * sh, c.b * sh); }
    if (i < Nn) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + RS + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const core = new THREE.ConeGeometry(R * 0.72, H * 0.8, 24).translate(0, H * 0.4, 0), cc = new Float32Array(core.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) cc.set([ca.r * 0.85, ca.g * 0.85, ca.b * 0.85], i); core.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  return [g, core];
}
// 山の材質：氷（シロップのしみた所は、ぬれてつやつや）・練乳・いちご・葉・白玉・ガラス・クリーム・コーンフレーク・ソース
export function mountainMats(env) {
  const S = sugarTex(), D = dough(), E = (o) => Object.assign(o, env ? { envMap: env } : {});
  const berry = ctex(128, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#ff5a6a'); gr.addColorStop(1, '#c8102a'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); for (let y = 6; y < 128; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < 128; x += 14) { g.fillStyle = '#ffe680'; g.beginPath(); g.ellipse(x, y, 1.6, 2.6, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(120,0,20,.35)'; g.beginPath(); g.arc(x, y + 3, 2.5, 0, TAU); g.fill(); } });
  const lemon = ctex(128, 128, (g) => { g.fillStyle = '#f2d21a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(64, 64, 56, 0, TAU); g.fill(); for (let i = 0; i < 9; i++) { const a0 = (i / 9) * TAU + 0.05, a1 = ((i + 1) / 9) * TAU - 0.05; g.fillStyle = '#ffe24a'; g.beginPath(); g.moveTo(64, 64); g.arc(64, 64, 50, a0, a1); g.closePath(); g.fill(); } });
  const ice = new THREE.MeshPhysicalMaterial(E({ vertexColors: true, normalMap: S.normal, normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.6, clearcoat: 0.35, clearcoatRoughness: 0.25, sheen: 0.7, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.3, emissive: '#1a2240', emissiveIntensity: 0.22, envMapIntensity: 0.7 }));
  S.normal.repeat.set(30, 30);
  ice.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n{ vec3 c = vColor.rgb; float s = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); roughnessFactor = mix(roughnessFactor, 0.12, smoothstep(0.12, 0.45, s)); }'); };
  ice.customProgramCacheKey = () => 'kakigori';
  const flakesN = D.normal.clone(); flakesN.repeat.set(6, 6); flakesN.needsUpdate = true;
  return {
    ice,
    milk: new THREE.MeshPhysicalMaterial(E({ color: '#fff6e6', roughness: 0.1, clearcoat: 1, emissive: '#3a3020', emissiveIntensity: 0.25, envMapIntensity: 1 })),
    berry: new THREE.MeshPhysicalMaterial(E({ map: berry, roughness: 0.28, clearcoat: 0.9, emissive: '#3a0008', emissiveIntensity: 0.4, envMapIntensity: 0.9 })),
    leaf: new THREE.MeshStandardMaterial({ color: '#3aa04a', roughness: 0.5, emissive: '#0a3010', emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    mochi: new THREE.MeshPhysicalMaterial(E({ color: '#fbf6ee', roughness: 0.5, sheen: 0.7, sheenColor: new THREE.Color('#ffffff'), emissive: '#3a3630', emissiveIntensity: 0.3 })),
    glass: new THREE.MeshPhysicalMaterial(E({ color: '#eaf6ff', transparent: true, opacity: 0.26, roughness: 0.03, clearcoat: 1, envMapIntensity: 1.8, depthWrite: false, side: THREE.DoubleSide, emissive: '#3a5a8a', emissiveIntensity: 0.12 })),
    rim: new THREE.MeshPhysicalMaterial(E({ color: '#bfe4ff', transparent: true, opacity: 0.5, roughness: 0.03, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false, emissive: '#6aa0e0', emissiveIntensity: 0.3 })),
    cream: new THREE.MeshPhysicalMaterial(E({ vertexColors: true, roughness: 0.42, clearcoat: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#fff4e0'), emissive: '#6a5848', emissiveIntensity: 0.4, envMapIntensity: 0.8 })),
    flakes: new THREE.MeshStandardMaterial({ color: '#f0b04a', normalMap: flakesN, normalScale: new THREE.Vector2(2, 2), roughness: 0.6, emissive: '#5a3410', emissiveIntensity: 0.3 }),
    sauce: new THREE.MeshPhysicalMaterial(E({ color: '#c4102a', roughness: 0.08, clearcoat: 1, emissive: '#400010', emissiveIntensity: 0.4, envMapIntensity: 1 })),
    choc: new THREE.MeshPhysicalMaterial(E({ color: '#3a1a0c', roughness: 0.12, clearcoat: 1, emissive: '#1a0804', emissiveIntensity: 0.3, envMapIntensity: 1 })),
    sponge: new THREE.MeshStandardMaterial({ color: '#e8b870', normalMap: flakesN, roughness: 0.8, emissive: '#4a3010', emissiveIntensity: 0.3 }),
    melon: new THREE.MeshPhysicalMaterial(E({ color: '#a8ec70', roughness: 0.3, clearcoat: 0.6, emissive: '#1a4008', emissiveIntensity: 0.4 })),
    lemon: new THREE.MeshPhysicalMaterial(E({ map: lemon, roughness: 0.25, clearcoat: 0.8, emissive: '#3a3000', emissiveIntensity: 0.4, side: THREE.DoubleSide })),
    grape: new THREE.MeshPhysicalMaterial(E({ color: '#6a2a9a', roughness: 0.25, clearcoat: 1, sheen: 0.5, sheenColor: new THREE.Color('#c8a0ff'), emissive: '#1a0830', emissiveIntensity: 0.4 })),
    cherry: new THREE.MeshPhysicalMaterial(E({ color: '#d0102a', roughness: 0.06, clearcoat: 1, emissive: '#3a0008', emissiveIntensity: 0.4, envMapIntensity: 1.3 })),
    spr: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: '#303030', emissiveIntensity: 0.6 }),
  };
}
const STRAW = (() => { const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(Math.max(0.001, Math.sin(t * Math.PI * 0.92) * (0.55 + 0.45 * t) * 0.62), t * 1.15)); } return new THREE.LatheGeometry(pts, 14); })();
function tubeAlong(pts, r) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, r, 6, false); }
const MX = new THREE.Matrix4(), MQ = new THREE.Quaternion(), ME = new THREE.Euler(), MP = new THREE.Vector3(), MS = new THREE.Vector3();
const place = (x, y, z, s, rx = 0, ry = 0, rz = 0) => MX.compose(MP.set(x, y, z), MQ.setFromEuler(ME.set(rx, ry, rz)), MS.setScalar(s)).clone();
// 山の飾りは、材質ごとに1つにまとめて描く（1つずつだと、山だけで描く回数が数百ふえた）
function meshesOf(acc, mats, g) { for (const m of acc.build(mats)) g.add(m); return g; }
// かき氷の山を一皿に：氷の山＋練乳のうず＋シロップの味のくだもの＋白玉＋ガラスの器のふち
export function kakiMountain(MM, R, H, syrup, seed = 1) {
  const g = new THREE.Group(), acc = new Acc(); g.add(new THREE.Mesh(kakigori(R, H, syrup, seed), MM.ice));
  const P = []; for (let i = 0; i <= 60; i++) { const t = i / 60, y = H * (0.97 - t * 0.5), an = t * TAU * 2.3 + seed; P.push(new THREE.Vector3(Math.cos(an) * kakiR(R, H, y) * 1.09, y + Math.sin(t * 40) * 0.12, Math.sin(an) * kakiR(R, H, y) * 1.09)); }
  acc.add('milk', tubeAlong(P, R * 0.035));
  for (let k = 0; k < 4; k++) { const an = seed * 1.3 + k * 1.7, y0 = H * (0.75 - k * 0.07), Q = []; for (let i = 0; i <= 10; i++) { const y = y0 - i * H * 0.04; Q.push(new THREE.Vector3(Math.cos(an) * kakiR(R, H, y) * 1.06, y, Math.sin(an) * kakiR(R, H, y) * 1.06)); } acc.add('milk', tubeAlong(Q, R * 0.025)); }
  const put = (key, geo, y, an, s, tilt = 0, ry = null) => { const r = kakiR(R, H, y) * 0.92; acc.add(key, geo.clone(), null, place(Math.cos(an) * r, y, Math.sin(an) * r, s, tilt, ry ?? -an, tilt * 0.6)); };
  const S = R * 0.13, ball = new THREE.SphereGeometry(1, 14, 10);
  if (syrup === 'strawberry') { put('berry', STRAW, H * 0.99, 0, S * 1.3); for (let i = 0; i < 6; i++) put('berry', STRAW, H * 0.82, i * 1.05 + seed, S, 0.5); }
  else if (syrup === 'melon') { for (let i = 0; i < 8; i++) put('melon', ball, H * (0.86 + (i % 2) * 0.07), i * 0.8 + seed, S * 0.55); }
  else if (syrup === 'lemon') { const disc = new THREE.CylinderGeometry(1, 1, 0.12, 24).rotateX(Math.PI / 2); for (let i = 0; i < 5; i++) put('lemon', disc, H * 0.86, i * 1.25 + seed, S * 0.9, 0.3, -i * 1.25 - seed + Math.PI / 2); }
  else if (syrup === 'grape') { for (let i = 0; i < 14; i++) put('grape', ball, H * (0.84 + (i % 3) * 0.05), i * 0.47 + seed, S * 0.42); }
  else { for (let i = 0; i < 6; i++) put('cherry', ball, H * 0.85, i * 1.05 + seed, S * 0.35); }
  for (let i = 0; i < 5; i++) put('milk', ball.clone().scale(1, 0.85, 1), H * 0.6, i * 1.3 + seed * 2, S * 0.75);   // 白玉（練乳と同じ白いつやで、まとめて描く）
  // ガラスの器：ふちだけ見える（山のすそは地面に埋まっている）
  g.add(new THREE.Mesh(new THREE.LatheGeometry([[R * 0.96, -2], [R * 1.08, 0], [R * 1.16, 1.4], [R * 1.18, 1.6]].map(([x, y]) => new THREE.Vector2(x, y)), 64), MM.glass));
  acc.add('rim', new THREE.TorusGeometry(R * 1.18, R * 0.02, 6, 56).rotateX(Math.PI / 2).translate(0, 1.6, 0));
  return meshesOf(acc, MM, g);
}
// パフェの山：大きなグラス（すそ広がり）に、コーンフレーク・ソース・クリーム・スポンジの層。上にソフトクリームのうず、いちご・さくらんぼ・ウエハース・ポッキー・チョコのソース
export function parfaitMountain(MM, wafer, R, H, colA, colB, seed = 1) {
  const g = new THREE.Group(), acc = new Acc(), mats = { ...MM, wafer }, cupH = H * 0.6, cupR = (t) => R * (0.5 + 0.48 * Math.pow(Math.max(0, t), 0.8));
  const prof = [[R * 0.75, -1.5], [R * 0.7, 0], [R * 0.25, 1.0], [R * 0.22, 2.4], [R * 0.5, 3.2]]; for (let i = 1; i <= 10; i++) { const t = i / 10; prof.push([cupR(t) * 1.04, 3.2 + t * (cupH - 3.2)]); }
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64), MM.glass));
  acc.add('rim', new THREE.TorusGeometry(cupR(1) * 1.04, R * 0.02, 6, 56).rotateX(Math.PI / 2).translate(0, cupH, 0));
  for (const [key, t0, t1] of [['flakes', 0.0, 0.26], ['sauce', 0.26, 0.34], ['cream', 0.34, 0.55], ['sponge', 0.55, 0.7], ['sauce', 0.7, 0.76], ['cream', 0.76, 0.98]]) { const y0 = 3.3 + t0 * (cupH - 3.3), y1 = 3.3 + t1 * (cupH - 3.3); acc.add(key, new THREE.CylinderGeometry(cupR((y1 - 3.2) / (cupH - 3.2)) * 0.98, cupR((y0 - 3.2) / (cupH - 3.2)) * 0.98, y1 - y0, 48, 1, false).translate(0, (y0 + y1) / 2, 0), key === 'cream' ? '#fbf6ee' : null); }
  const [sw] = softServe(R * 0.95, H * 0.42, colA, colB, 3.0); sw.translate(0, cupH - H * 0.03, 0); g.add(new THREE.Mesh(sw, MM.cream));
  const yTop = cupH + H * 0.39;
  // チョコのソース：うずの上から垂れる
  for (let k = 0; k < 7; k++) { const an = k * 0.9 + seed, Q = []; for (let i = 0; i <= 8; i++) { const t = i / 8, y = cupH + H * 0.3 * (1 - t) + H * 0.02, r = R * (0.25 + 0.4 * t); Q.push(new THREE.Vector3(Math.cos(an) * r, y, Math.sin(an) * r)); } acc.add('choc', tubeAlong(Q, R * 0.04)); }
  const S = R * 0.13;
  for (let i = 0; i < 7; i++) { const an = (i / 7) * TAU + seed; acc.add('berry', STRAW.clone(), null, place(Math.cos(an) * cupR(1) * 0.85, cupH + 0.2, Math.sin(an) * cupR(1) * 0.85, S, 0.5, -an, 0.3)); }
  acc.add('cherry', new THREE.SphereGeometry(1, 20, 14), null, place(0, yTop + S * 0.4, 0, S * 0.6)); acc.add('leaf', tubeAlong([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.3, 1.2, 0), new THREE.Vector3(1.0, 1.9, 0.2)], 0.06), null, place(0, yTop + S * 0.9, 0, S * 0.9));
  for (let i = 0; i < 2; i++) { const an = seed + i * 2.6; acc.add('wafer', new THREE.BoxGeometry(R * 0.35, R * 1.0, R * 0.08), null, place(Math.cos(an) * R * 0.35, cupH + R * 0.55, Math.sin(an) * R * 0.35, 1, 0, -an, 0.35)); }
  for (let i = 0; i < 3; i++) { const an = seed + 1.2 + i * 0.5, x = Math.cos(an) * R * 0.3, z = Math.sin(an) * R * 0.3, rx = 0.2 * Math.cos(an), rz = -0.35 * Math.sin(an + 1); acc.add('choc', new THREE.CylinderGeometry(R * 0.035, R * 0.035, R * 1.1, 10), null, place(x, cupH + R * 0.75, z, 1, rx, 0, rz)); acc.add('flakes', new THREE.CylinderGeometry(R * 0.03, R * 0.03, R * 0.25, 10), null, place(x * 1.1, cupH + R * 1.3, z * 1.1, 1, rx, 0, rz)); }
  for (let i = 0; i < 2; i++) acc.add('leaf', new THREE.PlaneGeometry(1, 0.5).translate(0.5, 0, 0), null, place(0, yTop - S * 0.2, 0, S * 1.2, -0.6, i * 2.4 + seed, 0.2));
  return meshesOf(acc, mats, g);
}
// ソフトクリームの山：ワッフルのコーンの器に、チョコのソースとカラースプレー
export function serveMountain(MM, wafer, R, H, colA, colB, seed = 1) {
  const g = new THREE.Group(), acc = new Acc(), mats = { ...MM, wafer }, [sw, core] = softServe(R, H, colA, colB);
  g.add(new THREE.Mesh(sw, MM.cream), new THREE.Mesh(core, MM.cream));
  const cupG = new THREE.CylinderGeometry(R * 0.82, R * 0.62, 3.4, 48, 1, true).translate(0, 0.4, 0), uv = cupG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 16, uv.getY(i) * 2); acc.add('wafer', cupG);
  acc.add('wafer', new THREE.TorusGeometry(R * 0.82, R * 0.05, 10, 64).rotateX(Math.PI / 2).translate(0, 2.1, 0));
  for (let k = 0; k < 6; k++) { const an = k * 1.05 + seed, Q = []; for (let i = 0; i <= 10; i++) { const t = i / 10, y = H * (0.95 - t * 0.45), r = R * (0.12 + 0.5 * t); Q.push(new THREE.Vector3(Math.cos(an + t) * r, y, Math.sin(an + t) * r)); } acc.add('choc', tubeAlong(Q, R * 0.035)); }
  const sp = new THREE.CapsuleGeometry(1, 3, 1, 4), cols = ['#ff4a6a', '#ffd23a', '#4ad0ff', '#7aff6a', '#ff8ad0', '#ffffff'];
  for (let i = 0; i < 45; i++) { const t = hash2(i, seed), an = hash2(seed, i) * TAU, y = H * (0.3 + 0.6 * t), r = R * 0.62 * (1 - t * 0.8) + R * 0.2 * (1 - t); acc.add('spr', sp.clone(), cols[i % cols.length], place(Math.cos(an) * r, y, Math.sin(an) * r, R * 0.018, hash2(i, 3) * 3, hash2(i, 5) * 3, 0)); }
  return meshesOf(acc, mats, g);
}

// ---------- ジンジャークッキーの住人：形を細かく割り、肩・股から先をぐにょりと曲げる。端から削れて消え、また集まる ----------
// 外形（身長1・横は±0.42）。dress＝スカート
export function gbOutline(dress = false) {
  const R = [], quad = (a, c, b, n = 6) => { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; R.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } }, arc = (cx, cy, r, a0, a1, n = 8) => { for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; R.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  R.push([0.075, 0.195]); quad([0.075, 0.195], [0.12, 0.17], [0.2, 0.16]); R.push([0.31, 0.138]); arc(0.32, 0.07, 0.068, Math.PI / 2, -Math.PI / 2); R.push([0.2, 0.004]); quad([0.2, 0.004], [0.15, 0.0], [0.15, -0.05]);
  if (dress) { quad([0.15, -0.05], [0.2, -0.16], [0.26, -0.27], 5); R.push([0.12, -0.27], [0.13, -0.29]); R.push([0.17, -0.385]); arc(0.12, -0.41, 0.06, 0.4, -2.6, 6); R.push([0.05, -0.29], [0.0, -0.285]); }
  else { R.push([0.165, -0.17], [0.235, -0.385]); arc(0.165, -0.41, 0.075, 0.35, -2.79); R.push([0.045, -0.21]); quad([0.045, -0.21], [0.02, -0.17], [0, -0.17]); }
  const right = R, left = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]), head = []; for (let i = 1; i < 24; i++) { const a = -2.05 - (i / 24) * (TAU - 0.96); head.push([Math.cos(a) * 0.17, 0.34 + Math.sin(a) * 0.17]); }
  return [...right, ...left, ...head].map(([x, y]) => new THREE.Vector2(x, y));
}
// 外形までの近さ（ふちの焼き色・端から削れる順番に使う）
function edgeDist(p, pts) { let m = 1e9; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], ex = b.x - a.x, ey = b.y - a.y, L2 = ex * ex + ey * ey || 1e-9, t = Math.max(0, Math.min(1, ((p.x - a.x) * ex + (p.y - a.y) * ey) / L2)); m = Math.min(m, Math.hypot(p.x - a.x - ex * t, p.y - a.y - ey * t)); } return m; }
// 平たい形に厚み：表と裏は三角を細かく割る（曲げても折れ目が出ないように）。extras＝頭の後ろの飾り（おだんご・おさげ）。aEdge＝外形までの近さ（側面は0）
export function flatCookie(outline, thick = 0.09, maxEdge = 0.035, extras = []) {
  const pos = [], nrm = [], uv = [], ed = [], put = (x, y, z, nx, ny, nz, e) => { pos.push(x, y, z); nrm.push(nx, ny, nz); uv.push((x + 0.45) / 0.9, (y + 0.55) / 1.1); ed.push(e); };
  // 外形は左回りにそろえる（側面が外を向く）
  const capOf = (pts0, z0, half) => { const pts = THREE.ShapeUtils.isClockWise(pts0) ? pts0.slice().reverse() : pts0, tris = THREE.ShapeUtils.triangulateShape(pts, []); const out = []; const sub = (a, b, c) => { const L = [a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)], m = Math.max(...L); if (m <= maxEdge) { out.push(a, b, c); return; } if (m === L[0]) { const ab = a.clone().lerp(b, 0.5); sub(a, ab, c); sub(ab, b, c); } else if (m === L[1]) { const bc = b.clone().lerp(c, 0.5); sub(a, b, bc); sub(a, bc, c); } else { const ca = c.clone().lerp(a, 0.5); sub(a, b, ca); sub(ca, b, c); } };
    for (const [i, j, k] of tris) sub(pts[i], pts[j], pts[k]);
    const E = new Map(), eOf = (p) => { const key = p.x.toFixed(5) + ',' + p.y.toFixed(5); let e = E.get(key); if (e === undefined) { e = edgeDist(p, pts); E.set(key, e); } return e; };
    // 表の三角は、手前（+z）から見て左回りに（向きが逆だと裏から照らされて黒く見えた）
    for (let i = 0; i < out.length; i += 3) { let [a, b, c] = [out[i], out[i + 1], out[i + 2]]; if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0) [b, c] = [c, b]; for (const p of [a, b, c]) put(p.x, p.y, z0 + half, 0, 0, 1, eOf(p)); for (const p of [a, c, b]) put(p.x, p.y, z0 - half, 0, 0, -1, eOf(p)); }
    const n = pts.length; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], ex = q.x - p.x, ey = q.y - p.y, L = Math.hypot(ex, ey) || 1, nx = ey / L, ny = -ex / L;
      put(p.x, p.y, z0 + half, nx, ny, 0, 0); put(q.x, q.y, z0 - half, nx, ny, 0, 0); put(q.x, q.y, z0 + half, nx, ny, 0, 0); put(p.x, p.y, z0 + half, nx, ny, 0, 0); put(p.x, p.y, z0 - half, nx, ny, 0, 0); put(q.x, q.y, z0 - half, nx, ny, 0, 0); } };
  capOf(outline, 0, thick / 2);
  for (const [cx, cy, r] of extras) { const pts = []; for (let i = 0; i < 16; i++) pts.push(new THREE.Vector2(cx + Math.cos((i / 16) * TAU) * r, cy + Math.sin((i / 16) * TAU) * r)); capOf(pts, -0.01, thick / 2 * 0.9); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(ed, 1)); return g;
}
// クッキーの焼き色と、削れ方（材質に足す）：ふちは濃く焼け、側面はいちばん濃い。uEat（0〜1）で、外形から内へ、ぎざぎざに削れていく。削れたふちは中の明るい生地
const COOKIE_V = 'attribute float aEdge; varying float vEdge; varying vec2 vLoc;\n';
const COOKIE_F = `uniform float uEat; varying float vEdge; varying vec2 vLoc;
float ckEat() { float crk = fract(sin(dot(floor(vLoc * 46.0), vec2(12.9898, 78.233))) * 43758.5453); return uEat * 0.36 - crk * 0.025 - 0.012 * sin(vLoc.x * 53.0 + vLoc.y * 31.0); }
`;
function cookieLook(sh, U) {
  sh.uniforms.uEat = U.uEat;
  sh.vertexShader = COOKIE_V + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = aEdge; vLoc = position.xy;');
  sh.fragmentShader = COOKIE_F + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat ckE = ckEat(); if (uEat > 0.0 && vEdge < ckE) discard;')
    .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= mix(vec3(0.6, 0.47, 0.38), vec3(1.0), smoothstep(0.0, 0.032, vEdge));
if (uEat > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.82, 0.58, 0.36), (1.0 - smoothstep(0.0, 0.025, vEdge - ckE)) * 0.7);
if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.76, 0.52, 0.32);`);
}
// 曲げ：腕は肩（±0.13, 0.11）から、脚は股（±0.08, -0.15）から。先へ行くほど大きく曲がる（ぐにょり）
const BEND = `
uniform vec4 uLimb; uniform float uCurl;
float gbAng(vec2 p, out vec2 piv) {
  if (abs(p.x) > 0.13 && p.y > -0.07) { float sg = p.x > 0.0 ? 1.0 : -1.0; piv = vec2(sg * 0.13, 0.11); return (sg > 0.0 ? uLimb.y : uLimb.x) * pow(clamp((abs(p.x) - 0.13) / 0.24, 0.0, 1.3), uCurl); }
  if (p.y < -0.15) { float sg = p.x >= 0.0 ? 1.0 : -1.0; piv = vec2(sg * 0.08, -0.15); return (sg > 0.0 ? uLimb.w : uLimb.z) * pow(clamp((-0.15 - p.y) / 0.3, 0.0, 1.3), uCurl); }
  piv = vec2(0.0); return 0.0; }
vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
`;
export function bendMaterial(base) {
  const U = { uLimb: { value: new THREE.Vector4() }, uCurl: { value: 1.4 }, uEat: { value: 0 } };
  base.side = THREE.DoubleSide; const dn = dough().normal.clone(); dn.repeat.set(3, 3); dn.needsUpdate = true; base.normalMap = dn; base.normalScale = new THREE.Vector2(0.9, 0.9);
  base.onBeforeCompile = (sh) => { sh.uniforms.uLimb = U.uLimb; sh.uniforms.uCurl = U.uCurl;
    sh.vertexShader = BEND + sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ vec2 pv; float a = gbAng(position.xy, pv); objectNormal.xy = rot2(objectNormal.xy, a); }').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec2 pv; float a = gbAng(position.xy, pv); transformed.xy = pv + rot2(transformed.xy - pv, a); }');
    cookieLook(sh, U); };
  base.customProgramCacheKey = () => 'gb-bend2'; base.userData.U = U; return base;
}
// アイシングの顔と服（男女・老若）：焼いた生地の上に、ぷっくり盛ったアイシング（下に影、上に光）
const icingPen = (g) => { g.shadowColor = 'rgba(60,24,6,.6)'; g.shadowBlur = 3; g.shadowOffsetX = 1; g.shadowOffsetY = 3; };
function doughBase(g, w, h) { const pat = g.createPattern(dough().canvas, 'repeat'); g.fillStyle = pat; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(184,105,45,.25)'; g.fillRect(0, 0, w, h); }
export function gbFace(kind) {
  return ctex(256, 320, (g, w, h) => {
    const X = (x) => ((x + 0.45) / 0.9) * w, Y = (y) => (1 - (y + 0.55) / 1.1) * h;
    doughBase(g, w, h); icingPen(g);
    g.strokeStyle = g.fillStyle = '#fffaf2'; g.lineWidth = 5; g.lineCap = g.lineJoin = 'round';
    const zig = (x0, y0, x1, y1, n) => { g.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, o = (i % 2 ? 1 : -1) * 0.016; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; i ? g.lineTo(X(x + o * 0.3), Y(y + o)) : g.moveTo(X(x), Y(y)); } g.stroke(); };
    zig(0.29, 0.13, 0.27, 0.0, 4); zig(-0.29, 0.13, -0.27, 0.0, 4);
    const dress = kind === 'woman' || kind === 'grandma' || kind === 'girl';
    if (!dress) { zig(0.11, -0.33, 0.23, -0.37, 4); zig(-0.11, -0.33, -0.23, -0.37, 4); }
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 6.5, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(X(0), Y(0.33), 20, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    const btn = (y, c) => { g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(X(0), Y(y), 8, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(X(0), Y(y), 5.5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(X(0) - 2, Y(y) - 2, 1.8, 0, TAU); g.fill(); g.fillStyle = '#fffaf2'; };
    if (dress) { g.beginPath(); g.moveTo(X(-0.15), Y(-0.06)); g.lineTo(X(0.15), Y(-0.06)); g.stroke(); g.beginPath(); for (let i = 0; i <= 10; i++) { const x = -0.25 + i * 0.05; g.arc(X(x), Y(-0.25), 7, Math.PI, 0, true); } g.stroke(); btn(0.08, '#e8333a'); btn(-0.01, '#2fb05a'); }
    else { btn(0.1, '#e8333a'); btn(0.0, '#2fb05a'); btn(-0.1, '#e8333a'); }
    if (kind === 'woman' || kind === 'girl') { g.fillStyle = '#ff5a8a'; g.beginPath(); g.moveTo(X(0.08), Y(0.5)); g.lineTo(X(0.2), Y(0.56)); g.lineTo(X(0.2), Y(0.44)); g.closePath(); g.fill(); g.beginPath(); g.moveTo(X(0.08), Y(0.5)); g.lineTo(X(-0.04), Y(0.56)); g.lineTo(X(-0.04), Y(0.44)); g.closePath(); g.fill(); }
    if (kind === 'grandpa') { g.lineWidth = 7; g.beginPath(); g.moveTo(X(-0.08), Y(0.29)); g.quadraticCurveTo(X(0), Y(0.33), X(0.08), Y(0.29)); g.stroke(); g.lineWidth = 4; for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 13, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(X(-0.02), Y(0.37)); g.lineTo(X(0.02), Y(0.37)); g.stroke(); }
    if (kind === 'grandma') { g.lineWidth = 4; for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 13, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(X(-0.02), Y(0.37)); g.lineTo(X(0.02), Y(0.37)); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(X(-0.1), Y(-0.02)); g.lineTo(X(-0.12), Y(-0.2)); g.lineTo(X(0.12), Y(-0.2)); g.lineTo(X(0.1), Y(-0.02)); g.stroke(); }
    if (kind === 'boy') { g.fillStyle = '#3a7ad8'; g.beginPath(); g.arc(X(0), Y(0.42), 34, Math.PI, TAU); g.fill(); g.fillRect(X(0.02), Y(0.43), 40, 8); }
    g.shadowColor = 'transparent'; g.fillStyle = 'rgba(255,240,215,.9)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 0.9, 0, TAU); g.fill(); }   // 砂糖の粒
  });
}
export const GB_KINDS = [
  { kind: 'man', dress: false, s: 1.0, extras: [] }, { kind: 'woman', dress: true, s: 0.97, extras: [] },
  { kind: 'grandpa', dress: false, s: 0.95, extras: [] }, { kind: 'grandma', dress: true, s: 0.92, extras: [[0, 0.52, 0.07]] },
  { kind: 'boy', dress: false, s: 0.68, extras: [] }, { kind: 'girl', dress: true, s: 0.66, extras: [[-0.17, 0.4, 0.06], [0.17, 0.4, 0.06]] },
];

// ---------- そりのサンタとトナカイ（クッキー） ----------
export function deerOutline() {
  const P = [[-0.42, 0.02], [-0.3, 0.1], [0.12, 0.12], [0.22, 0.2], [0.27, 0.38], [0.22, 0.48], [0.18, 0.62], [0.12, 0.7], [0.2, 0.68], [0.24, 0.6], [0.28, 0.66], [0.33, 0.74], [0.34, 0.64], [0.3, 0.55], [0.36, 0.5], [0.46, 0.48], [0.48, 0.42], [0.4, 0.4], [0.34, 0.3], [0.3, 0.12], [0.3, -0.06],
    [0.36, -0.3], [0.3, -0.31], [0.22, -0.08], [0.12, -0.08], [0.08, -0.3], [0.02, -0.31], [0.02, -0.06], [-0.22, -0.06], [-0.24, -0.3], [-0.3, -0.31], [-0.32, -0.06], [-0.36, -0.3], [-0.42, -0.31], [-0.42, -0.04], [-0.5, 0.06]];
  return P.map(([x, y]) => new THREE.Vector2(x, y));
}
export function sleighOutline() {
  const P = [[-0.7, 0.05], [-0.62, -0.08], [-0.5, -0.12], [0.5, -0.12], [0.62, -0.06], [0.72, 0.08], [0.78, 0.22], [0.7, 0.24], [0.64, 0.12], [0.56, 0.06], [0.5, 0.3], [0.2, 0.36], [-0.3, 0.36], [-0.55, 0.5], [-0.66, 0.46], [-0.62, 0.3]];
  return P.map(([x, y]) => new THREE.Vector2(x, y));
}
// トナカイのアイシング：目・口・角の線・赤い胸当てと金の鈴・緑の鞍かけ・ひづめ
export function deerFace() { return ctex(256, 320, (g, w, h) => { const X = (x) => ((x + 0.45) / 0.9) * w, Y = (y) => (1 - (y + 0.55) / 1.1) * h; doughBase(g, w, h); icingPen(g);
  g.strokeStyle = g.fillStyle = '#fffaf2'; g.lineWidth = 4; g.lineCap = g.lineJoin = 'round';
  g.beginPath(); g.arc(X(0.33), Y(0.43), 5, 0, TAU); g.fill(); g.beginPath(); g.moveTo(X(0.4), Y(0.42)); g.quadraticCurveTo(X(0.43), Y(0.4), X(0.45), Y(0.43)); g.stroke();
  g.beginPath(); g.moveTo(X(0.2), Y(0.5)); g.lineTo(X(0.17), Y(0.63)); g.moveTo(X(0.26), Y(0.52)); g.lineTo(X(0.31), Y(0.68)); g.stroke();
  g.fillStyle = '#d8283c'; g.beginPath(); g.moveTo(X(0.12), Y(0.12)); g.lineTo(X(0.3), Y(0.14)); g.lineTo(X(0.32), Y(0.06)); g.lineTo(X(0.13), Y(0.04)); g.closePath(); g.fill();
  for (const [x, y] of [[0.16, 0.08], [0.22, 0.08], [0.28, 0.09]]) { g.fillStyle = '#f2c23a'; g.beginPath(); g.arc(X(x), Y(y), 5, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(X(x) - 1.5, Y(y) - 1.5, 1.5, 0, TAU); g.fill(); }
  g.fillStyle = '#2fa058'; g.fillRect(X(-0.2), Y(0.1), X(0.02) - X(-0.2), Y(-0.02) - Y(0.1)); g.strokeStyle = '#fffaf2'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 8; i++) { const x = -0.2 + i * 0.0275; g.lineTo(X(x), Y(i % 2 ? -0.03 : 0.0)); } g.stroke();
  g.lineWidth = 5; for (const x of [0.33, 0.05, -0.27, -0.39]) { g.beginPath(); g.moveTo(X(x - 0.035), Y(-0.28)); g.lineTo(X(x + 0.035), Y(-0.28)); g.stroke(); }
  g.shadowColor = 'transparent'; g.fillStyle = 'rgba(255,240,215,.9)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 0.9, 0, TAU); g.fill(); } }); }
// トナカイの駆け足：脚4本はそれぞれ付け根から（先ほど大きく）、首は胸の上から曲げる
const DEER = `
uniform vec4 uLeg; uniform float uNeck;
float deerAng(vec2 p, out vec2 piv) { float a = 0.0; piv = vec2(0.0);
  if (p.y < -0.05) { float t = clamp((-0.05 - p.y) / 0.26, 0.0, 1.0); t = 0.4 * t + 0.6 * t * t * (3.0 - 2.0 * t);
    if (p.x > 0.17) { piv = vec2(0.27, -0.02); a = uLeg.x * t; }
    else if (p.x > -0.08) { piv = vec2(0.07, -0.02); a = uLeg.y * t; }
    else if (p.x > -0.32) { piv = vec2(-0.27, -0.02); a = uLeg.z * t; }
    else { piv = vec2(-0.38, -0.01); a = uLeg.w * t; } }
  else if (p.x > 0.13 && p.y > 0.05) { piv = vec2(0.22, 0.05); a = uNeck * smoothstep(0.05, 0.32, p.y); }
  return a; }
vec2 rot2(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }
`;
export function deerMaterial(map) {
  const U = { uLeg: { value: new THREE.Vector4() }, uNeck: { value: 0 }, uEat: { value: 0 } }, m = new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide });
  const dn = dough().normal.clone(); dn.repeat.set(3, 3); dn.needsUpdate = true; m.normalMap = dn;
  m.onBeforeCompile = (sh) => { sh.uniforms.uLeg = U.uLeg; sh.uniforms.uNeck = U.uNeck;
    sh.vertexShader = DEER + sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ vec2 pv; float a = deerAng(position.xy, pv); objectNormal.xy = rot2(objectNormal.xy, a); }').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec2 pv; float a = deerAng(position.xy, pv); transformed.xy = pv + rot2(transformed.xy - pv, a); }');
    cookieLook(sh, U); };
  m.customProgramCacheKey = () => 'deer-run'; m.userData.U = U; return m;
}
// 焼き色だけのクッキー（そり）
export function cookieMaterial(map) { const U = { uEat: { value: 0 } }, m = new THREE.MeshStandardMaterial({ map, roughness: 0.75, side: THREE.DoubleSide }); m.onBeforeCompile = (sh) => cookieLook(sh, U); m.customProgramCacheKey = () => 'cookie-look'; return m; }
export function santaFace() { return ctex(256, 320, (g, w, h) => { const X = (x) => ((x + 0.45) / 0.9) * w, Y = (y) => (1 - (y + 0.55) / 1.1) * h; doughBase(g, w, h); icingPen(g);
  g.fillStyle = '#d8283c'; g.beginPath(); g.moveTo(X(-0.17), Y(0.42)); g.quadraticCurveTo(X(0), Y(0.72), X(0.2), Y(0.56)); g.lineTo(X(0.17), Y(0.42)); g.closePath(); g.fill(); g.fillRect(X(-0.15), Y(0.19), X(0.15) - X(-0.15), Y(-0.17) - Y(0.19));
  g.fillStyle = '#fffaf2'; g.fillRect(X(-0.19), Y(0.45), X(0.19) - X(-0.19), 12); g.beginPath(); g.arc(X(0.21), Y(0.57), 9, 0, TAU); g.fill(); g.beginPath(); g.moveTo(X(-0.12), Y(0.3)); g.quadraticCurveTo(X(0), Y(0.12), X(0.12), Y(0.3)); g.quadraticCurveTo(X(0), Y(0.22), X(-0.12), Y(0.3)); g.fill();
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 6, 0, TAU); g.fill(); } }); }
