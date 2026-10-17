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
  count() { const o = {}; for (const [k, l] of this.parts) o[k] = l.length; return o; }   // 部品の数（家ごとの範囲を、あとで形の中から取り出すため）
  offsets() { const o = {}; for (const [k, l] of this.parts) { const a = [0]; for (const [g] of l) a.push(a[a.length - 1] + g.attributes.position.count); o[k] = a; } return o; }   // 部品ごとの頂点の始まり（まとめた形の中の位置）
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
// 穴をあける。inner＝クッキーの壁（穴のふちちょうど）。ほかの飾りは、穴のふちから7cmまで消す（壁がなくなった所に、窓の枠が浮いて見えた）
// 家は中が空洞なので、穴の奥は町の側で「かじった球の内側の面（家の形の中だけ）」を描いて、中身の詰まったクッキーに見せる（biteCavity）
export function biteable(m, inner = false) {
  m.onBeforeCompile = (sh) => { sh.uniforms.uBite = BITE_U;
    sh.vertexShader = 'varying vec3 vBW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvBW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = BITE_FS + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat bd = biteD(); if (bd < ' + (inner ? '0.0' : '0.07') + ') discard;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nif (bd < 0.04) diffuseColor.rgb *= vec3(1.08, 0.86, 0.66);');
  };
  m.customProgramCacheKey = () => 'bite3' + (inner ? 'I' : ''); return m;
}
// かじった穴の奥の面：球の内側を、その家の形（壁の箱と切妻の屋根）の中だけ描く。uInv＝町→家の座標、uDim＝(横の半分, 奥行きの半分, 壁の高さ, 屋根の高さ)
export function biteCavity() {
  const D = dough(), U = { uInv: { value: new THREE.Matrix4() }, uDim: { value: new THREE.Vector4(1, 1, 1, 1) } }, m = new THREE.MeshStandardMaterial({ map: D.map, normalMap: D.normal, color: '#f0c896', roughness: 0.9, side: THREE.BackSide, emissive: '#5a3418', emissiveIntensity: 0.25 });
  m.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec3 vCW;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvCW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform mat4 uInv; uniform vec4 uDim; varying vec3 vCW;\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n{ vec3 q = (uInv * vec4(vCW, 1.0)).xyz; if (abs(q.x) > uDim.x || abs(q.z) > uDim.y || q.y < -0.2 || q.y > uDim.z + uDim.w * (1.0 - abs(q.x) / uDim.x)) discard; }');
  };
  m.customProgramCacheKey = () => 'bite-cavity'; m.userData.U = U; return m;
}

// ---------- 材質 ----------
export function makeMats(env) {
  const D = dough(), F = frosting(), W = waferTex(), C = chocoTex(), G = sugarTex();
  const glass = ctex(128, 160, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h / 2, h * 0.7); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e8e8e8'); gr.addColorStop(1, '#a8a8a8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(w / 2 - 4, 0, 8, h); g.fillRect(0, h * 0.42, w, 8); g.fillStyle = 'rgba(120,60,30,.35)'; g.fillRect(6, h * 0.62, w - 12, h * 0.3); });
  const mint = ctex(128, 128, (g) => { g.fillStyle = '#fbf6f2'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#e0233a'; for (let i = 0; i < 8; i += 2) { g.beginPath(); g.moveTo(64, 64); for (let k = 0; k <= 10; k++) { const a = ((i + k / 10) / 8) * TAU + (k / 10) * 0.9; g.lineTo(64 + Math.cos(a) * 62 * (k / 10 + 0.05), 64 + Math.sin(a) * 62 * (k / 10 + 0.05)); } for (let k = 10; k >= 0; k--) { const a = ((i + 1 + k / 10) / 8) * TAU + (k / 10) * 0.9; g.lineTo(64 + Math.cos(a) * 62 * (k / 10 + 0.05), 64 + Math.sin(a) * 62 * (k / 10 + 0.05)); } g.fill(); } });
  const stripe = ctex(64, 256, (g, w, h) => { g.fillStyle = '#fbf6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#d81e34'; for (let i = -2; i < 10; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32 - 22); g.lineTo(w, i * 32 - 6); g.lineTo(0, i * 32 + 16); g.fill(); } });
  const E = (o) => Object.assign(o, env ? { envMap: env } : {}), V2 = (k) => new THREE.Vector2(k, k);
  const M = {
    cookie: new THREE.MeshStandardMaterial({ map: D.map, normalMap: D.normal, normalScale: V2(1.1), vertexColors: true, roughness: 0.76, emissive: '#ffffff', emissiveMap: D.map, emissiveIntensity: 0.1 }),   // 月の当たらない裏側も、生地の色がうっすら見える
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
  // 遠くの家の裏と横に貼る一枚：アーチの窓（灯りがともる）・アイシングの波・ガムドロップ・ハート
  // glow＝光る分の絵：窓は明るく、アイシングとガムドロップはうっすら（夜の裏側でも、白いアイシングが白く見えるように）
  const dc = (glow) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), ic = glow ? '#5c5c5c' : '#fffaf2'; if (glow) { g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); }
    const arch = (x, y, w, h) => { g.beginPath(); g.moveTo(x - w / 2, y + h / 2); g.lineTo(x - w / 2, y - h / 2 + w / 2); g.arc(x, y - h / 2 + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w / 2, y + h / 2); g.closePath(); };
    const icing = () => { if (!glow) { g.shadowColor = 'rgba(60,24,6,.6)'; g.shadowBlur = 3; g.shadowOffsetY = 3; } g.strokeStyle = g.fillStyle = ic; };
    for (const x of [70, 186]) { arch(x, 112, 62, 92); if (glow) g.fillStyle = '#ffd890'; else { const gr = g.createLinearGradient(0, 66, 0, 158); gr.addColorStop(0, '#ffe6a0'); gr.addColorStop(1, '#ff9a3a'); g.fillStyle = gr; } g.fill();
      g.save(); icing(); g.lineWidth = 7; arch(x, 112, 62, 92); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 158); g.moveTo(x - 31, 120); g.lineTo(x + 31, 120); g.stroke(); g.fillRect(x - 40, 160, 80, 10); g.restore(); }
    g.save(); icing(); g.lineWidth = 6; for (const y of [14, 236]) { g.beginPath(); for (let i = 0; i < 9; i++) g.arc(14 + i * 29, y, 14, 0, Math.PI, y > 100); g.stroke(); }
    const cols = ['#ff4a5a', '#3fd06a', '#ffd23a', '#5fa8ff', '#ff8a2a', '#c07aff']; for (let i = 0; i < 7; i++) { g.fillStyle = glow ? '#3a3a3a' : cols[i % 6]; g.beginPath(); g.arc(30 + i * 33, 210, 9, 0, TAU); g.fill(); if (!glow) { g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(27 + i * 33, 207, 3, 0, TAU); g.fill(); } }
    g.fillStyle = glow ? '#4a2a38' : '#ff7aa8'; g.beginPath(); g.moveTo(128, 60); g.bezierCurveTo(108, 44, 112, 26, 128, 36); g.bezierCurveTo(144, 26, 148, 44, 128, 60); g.fill(); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  M.decal = new THREE.MeshStandardMaterial({ map: dc(false), emissiveMap: dc(true), emissive: '#ffffff', emissiveIntensity: 0.9, alphaTest: 0.4, roughness: 0.5 });
  for (const [k, m] of Object.entries(M)) biteable(m, k === 'cookie');
  return M;
}

// ---------- 家 ----------
// 縁のアイシング：辺にそって少し波打つ管（絞り出したように）。wav＝波の大きさ
let PIPE_Q = 1;   // 遠い家ほど、しぼり出しの管を粗く（家の数が多く、アイシングだけで三角が10万近くあった）
function piped(pts, r = 0.032, wav = 0.012, closed = false, step = 0.16) {
  step *= PIPE_Q; const P = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = a.distanceTo(b), n = Math.max(2, Math.round(L / step)); for (let k = 0; k < n; k++) { const t = k / n, p = a.clone().lerp(b, t); p.y += Math.sin((i + t) * 37) * wav * 0.6; P.push(p.addScalar(Math.sin(k * 2.1) * wav * 0.4)); } }
  if (!closed) P.push(pts[pts.length - 1].clone());
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P, closed), Math.max(4, P.length), r, r < 0.03 || PIPE_Q > 1 ? 3 : 4, closed);
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
  const lod = o.lod ?? (o.simple ? 1 : 0); PIPE_Q = lod === 0 ? 1 : lod === 1 ? 1.7 : 2.4; const at = (g) => g.applyMatrix4(M), { w, d, h, rh } = o, bev = 0.05, top = h + rh, a = Math.atan2(rh, w / 2), Ls = Math.hypot(w / 2, rh) + 0.22, zf = d / 2 + bev, R = (s) => (hash2((o.seed | 0) + s, o.w * 10) < 0.5);
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
  // 遠くの家の裏と横：窓とアイシングを描いた一枚を貼る（近い家は、本物の窓と飾りがある。裏から見ても、お菓子の家に見えるように）
  if (lod >= 1) { const dh = h * 0.86; acc.add('decal', at(new THREE.PlaneGeometry(w * 0.9, dh).rotateY(Math.PI).translate(0, dh / 2 + 0.05, -zf - 0.006)));
    for (const sd of [-1, 1]) acc.add('decal', at(new THREE.PlaneGeometry(d * 0.88, dh).rotateY(sd * Math.PI / 2).translate(sd * (w / 2 + bev + 0.006), dh / 2 + 0.05, 0))); }
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
// 氷の山の表面の点（向き a・高さの割合 t）。でこぼこは、シロップの層も同じ式でたどる
const kakiBump = (a, t, seed) => (vnoise(a * 6 + seed, t * 9) - 0.5) * 0.09 + (vnoise(a * 24 + seed * 3, t * 30) - 0.5) * 0.04;
function kakiAt(R, H, seed, a, t, lift = 0) { const b = kakiBump(a, t, seed), r = Math.max(0.001, kakiR(R, H, H * t)) * (1 + b) + lift * R; return [Math.cos(a) * r, H * t + b * H * 0.15 * (1 - t) + lift * H * 0.5, Math.sin(a) * r]; }
// かき氷の山：丸く盛った氷のつぶ（大小のでこぼこ）。上から色のシロップがしみて、筋になって垂れる
export function kakigori(R, H, syrup, seed = 1) {
  const prof = []; for (let i = 0; i <= 28; i++) { const t = i / 28, y = H * t; prof.push(new THREE.Vector2(Math.max(0.001, kakiR(R, H, y)), y)); }
  const g = new THREE.LatheGeometry(prof, 56), p = g.attributes.position, col = new Float32Array(p.count * 3), sc = new THREE.Color(SYRUP[syrup] || syrup), ice = new THREE.Color('#eef4ff');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ang = Math.atan2(z, x), t = y / H, r = Math.hypot(x, z);
    const bump = kakiBump(ang, t, seed); const k = r > 0.01 ? 1 + bump : 1; p.setX(i, x * k); p.setZ(i, z * k); p.setY(i, y + bump * H * 0.15 * (1 - t));
    const drip = 0.55 - 0.32 * Math.pow(Math.max(0, Math.sin(ang * 7 + seed) * 0.5 + 0.5 * vnoise(ang * 3, seed)), 2), cov = SS(t, drip - 0.06, drip + 0.08), c = ice.clone().lerp(sc, cov * 0.92).multiplyScalar(0.92 + vnoise(ang * 40, t * 60) * 0.16);
    col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
// 練乳：氷の上にとろりとのるリボン（平たく・太さがゆらぐ）。上でうず状にかけ、ところどころ下へ垂れて、先がぷっくり
function kakiN(R, H, a, t) { const e = 0.01, dr = (kakiR(R, H, H * Math.min(1, t + e)) - kakiR(R, H, H * Math.max(0, t - e))) / (2 * e * H), L = Math.hypot(1, dr); return new THREE.Vector3(Math.cos(a) / L, -dr / L, Math.sin(a) / L); }
function ribbonOn(R, H, seed, path, wid) {   // path：[向き, 高さの割合, 太さの倍率] の並び
  const RS = 6, pos = [], idx = [], P = path.map(([a, t]) => new THREE.Vector3(...kakiAt(R, H, seed, a, t, 0.035))), T = new THREE.Vector3(), B = new THREE.Vector3(), N2 = new THREE.Vector3();
  path.forEach(([a, t, k], i) => { T.subVectors(P[Math.min(i + 1, P.length - 1)], P[Math.max(i - 1, 0)]).normalize(); const N = kakiN(R, H, a, t); B.crossVectors(T, N).normalize(); N2.crossVectors(B, T).normalize(); const w = wid * k, h = w * 0.42;
    for (let j = 0; j < RS; j++) { const ph = (j / RS) * TAU, c = Math.cos(ph) * w, sn = Math.sin(ph) * h + h * 0.3; pos.push(P[i].x + B.x * c + N2.x * sn, P[i].y + B.y * c + N2.y * sn, P[i].z + B.z * c + N2.z * sn); } });
  for (let i = 0; i < path.length - 1; i++) for (let j = 0; j < RS; j++) { const a = i * RS + j, b = i * RS + ((j + 1) % RS); idx.push(a, b, a + RS, b, b + RS, a + RS); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function milkDrizzle(R, H, seed = 1) {
  const main = []; for (let i = 0; i <= 100; i++) { const u = i / 100, k = (0.75 + 0.4 * vnoise(u * 18, seed)) * Math.min(1, u * 20 + 0.1, (1 - u) * 20 + 0.1); main.push([seed * 0.7 + u * TAU * 1.8, Math.min(0.985, 0.96 - 0.3 * u + 0.045 * Math.sin(u * 46 + seed)), k]); }
  const out = [ribbonOn(R, H, seed, main, R * 0.05)];
  for (let d = 0; d < 5; d++) { const [a0, t0] = main[Math.round((0.15 + d * 0.17) * 100)], len = 0.08 + 0.1 * vnoise(d * 3.1, seed), Q = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; Q.push([a0 + 0.01 * Math.sin(u * 5), t0 - len * u, 0.9 * (1 - u * 0.55) + (u > 0.85 ? (u - 0.85) * 4 : 0)]); }
    Q.push([a0, t0 - len - 0.006, 0.05]); out.push(ribbonOn(R, H, seed, Q, R * 0.03)); }   // 先のぷっくりを、とじる
  return out;
}
// ソフトクリームの山：絞り口の筋（8本）のある太い管が、細くなりながら3回半うずを巻いて、先がくるり
export function softServe(R, H, colA, colB = null, turns = 3.4) {
  const RS = 12, Nn = 120, pos = [], col = [], idx = [], ca = new THREE.Color(colA), cb = new THREE.Color(colB || colA);   // 遠くの山なので、細かさは控えめに
  for (let i = 0; i <= Nn; i++) { const t = i / Nn, th = t * turns * TAU, rc = R * 0.62 * (1 - t * 0.92), y = H * (0.08 + 0.78 * Math.pow(t, 0.85)) + (t > 0.94 ? (t - 0.94) * H * 2.2 : 0), rt = (R * 0.42 * (1 - t * 0.78) + 0.02 * R) * Math.min(1, t / 0.035, (1 - t) / 0.05 + 0.02);   // 渦の管の始まりと先は、すぼめて閉じる（開いたままだと、中の空洞が見えた。本人 2026-10-17）
    const cx = Math.cos(th) * rc, cz = Math.sin(th) * rc, mix = colB ? 0.5 + 0.5 * Math.sin(th * 0.5) : 0, c = ca.clone().lerp(cb, mix);
    for (let j = 0; j <= RS; j++) { const ph = (j / RS) * TAU, rr = rt * (1 + 0.08 * Math.sin(ph * 8)), nx = Math.cos(th) * Math.cos(ph), ny = Math.sin(ph), nz = Math.sin(th) * Math.cos(ph); pos.push(cx + nx * rr, y + ny * rr * 0.85, cz + nz * rr); const sh = 0.88 + 0.12 * Math.sin(ph * 8); col.push(c.r * sh, c.g * sh, c.b * sh); }
    if (i < Nn) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + RS + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const core = new THREE.ConeGeometry(R * 0.72, H * 0.8, 24).translate(0, H * 0.4, 0), cc = new Float32Array(core.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) cc.set([ca.r * 0.85, ca.g * 0.85, ca.b * 0.85], i); core.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  return [g, core];
}
// 山の材質：氷（シロップのしみた所は、ぬれてつやつや）・練乳・いちご・葉・白玉・ガラス・クリーム・コーンフレーク・ソース
// ガラス：まん中は透けて、ふちほど白く光って濃く見える（本物のグラスの縁。一様に薄いと、ほとんど見えなかった。本人 2026-10-17「透明すぎ」）
function glassMat(E) { const m = new THREE.MeshPhysicalMaterial(E({ color: '#eaf6ff', transparent: true, opacity: 0.3, roughness: 0.03, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false, side: THREE.DoubleSide, emissive: '#3a5a8a', emissiveIntensity: 0.15 }));
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n{ float fr = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2); gl_FragColor.rgb += vec3(0.55, 0.7, 0.85) * fr * 0.6; gl_FragColor.a = clamp(gl_FragColor.a + fr * 0.62, 0.0, 0.95); }'); };
  m.customProgramCacheKey = () => 'glassRim'; return m; }
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
    milk: new THREE.MeshPhysicalMaterial(E({ color: '#fff3df', roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), emissive: '#5a4a34', emissiveIntensity: 0.38, envMapIntensity: 0.8 })),   // 練乳：象牙色で、とろりとしたつや
    berry: new THREE.MeshPhysicalMaterial(E({ map: berry, roughness: 0.28, clearcoat: 0.9, emissive: '#3a0008', emissiveIntensity: 0.4, envMapIntensity: 0.9 })),
    leaf: new THREE.MeshStandardMaterial({ color: '#3aa04a', roughness: 0.5, emissive: '#0a3010', emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    mochi: new THREE.MeshPhysicalMaterial(E({ color: '#fbf6ee', roughness: 0.5, sheen: 0.7, sheenColor: new THREE.Color('#ffffff'), emissive: '#3a3630', emissiveIntensity: 0.3 })),
    glass: glassMat(E),
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
  for (const mg of milkDrizzle(R, H, seed)) acc.add('milk', mg);
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
// パフェの層（下から：コーンフレーク・ソース・クリーム・スポンジ・ソース・クリーム）。境目の高さは向きごとに波打ち、ソースはクリームの側へ筋になってにじむ
function parfaitLayers(cupR, cupH, seed) { const y0 = 3.3, y1 = cupH * 0.985, NA = 48, NY = 34, pos = [], col = [], idx = [];
  const L = [[0.0, '#e8a848', 'flake'], [0.26, '#b8102a', 'sauce'], [0.34, '#fbf6ee', 'cream'], [0.55, '#ecc27a', 'sponge'], [0.7, '#b8102a', 'sauce'], [0.76, '#fbf6ee', 'cream']].map(([t, c, k]) => [t, new THREE.Color(c), k]);
  const edge = (i, a) => L[i][0] + (i ? 0.025 * Math.sin(a * 3 + i * 1.7 + seed) + 0.02 * (vnoise(a * 5 + i * 7, seed) - 0.5) : 0);
  for (let j = 0; j <= NY; j++) for (let i = 0; i <= NA; i++) { const a = (i / NA) * TAU, t = j / NY, y = y0 + t * (y1 - y0), r = cupR((y - 3.2) / (cupH - 3.2)) * 0.975;
    let li = 0; for (let k = 1; k < L.length; k++) if (t >= edge(k, a)) li = k;
    const c = L[li][1].clone(), nx = li + 1 < L.length ? edge(li + 1, a) - t : 1, pv = t - edge(li, a);
    if (li + 1 < L.length && nx < 0.03) c.lerp(L[li + 1][1], 0.5 * (1 - nx / 0.03));   // 境目は、少しぼかす
    if (L[li][2] === 'cream' && li > 0 && L[li - 1][2] === 'sauce') { const streak = Math.pow(Math.max(0, Math.sin(a * 11 + seed) * 0.6 + vnoise(a * 9, seed) * 0.8 - 0.3), 1.5); c.lerp(L[li - 1][1], Math.max(0, 1 - pv / (0.02 + 0.12 * streak)) * 0.75); }   // ソースのにじみ（下から筋になって）
    if (L[li][2] === 'flake' || L[li][2] === 'sponge') c.multiplyScalar(0.82 + 0.3 * vnoise(a * 40, t * 90));   // フレーク・スポンジの粒
    else c.multiplyScalar(0.96 + 0.06 * vnoise(a * 20, t * 40));
    pos.push(Math.cos(a) * r, y, Math.sin(a) * r); col.push(c.r, c.g, c.b);
    if (i < NA && j < NY) { const p0 = j * (NA + 1) + i, p1 = p0 + NA + 1; idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const top = new THREE.CircleGeometry(cupR(1) * 0.975, 48).rotateX(-Math.PI / 2).translate(0, y1, 0), tc = new Float32Array(top.attributes.position.count * 3).fill(0.98); top.setAttribute('color', new THREE.BufferAttribute(tc, 3));
  return mergeG([g, top]); }
const mergeG = (list) => { const parts = list.map((g) => (g.index ? g.toNonIndexed() : g)), n = parts.reduce((a, g) => a + g.attributes.position.count, 0), out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) { if (!parts.every((g) => g.attributes[name])) continue; const sz = parts[0].attributes[name].itemSize, arr = new Float32Array(n * sz); let o = 0; for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; } out.setAttribute(name, new THREE.BufferAttribute(arr, sz)); }
  return out; };
export function parfaitMountain(MM, wafer, R, H, colA, colB, seed = 1) {
  const g = new THREE.Group(), acc = new Acc(), mats = { ...MM, wafer }, cupH = H * 0.6, cupR = (t) => R * (0.5 + 0.48 * Math.pow(Math.max(0, t), 0.8));
  const prof = [[R * 0.75, -1.5], [R * 0.7, 0], [R * 0.25, 1.0], [R * 0.22, 2.4], [R * 0.5, 3.2]]; for (let i = 1; i <= 10; i++) { const t = i / 10; prof.push([cupR(t) * 1.04, 3.2 + t * (cupH - 3.2)]); }
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 64), MM.glass));
  acc.add('rim', new THREE.TorusGeometry(cupR(1) * 1.04, R * 0.02, 6, 56).rotateX(Math.PI / 2).translate(0, cupH, 0));
  acc.add('cream', parfaitLayers(cupR, cupH, seed));   // 層は1つの形に：境目はいびつに波打ち、ソースはクリームへにじむ（本人 2026-10-17「もう少しリアルにいびつに」）
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

// ---------- クリスマスケーキの山（豆知識をぜんぶ集めて、仕掛けをぜんぶ遊ぶと見つかる）。どちらも食べられる ----------
// 文字や切り口の絵（チョコの板・切り株の年輪）
function plateTex() { return ctex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a2a12'); gr.addColorStop(1, '#3a1608'); g.fillStyle = gr; g.beginPath(); g.roundRect(6, 6, w - 12, h - 12, 60); g.fill();
  g.strokeStyle = 'rgba(255,230,190,.5)'; g.lineWidth = 6; g.beginPath(); g.roundRect(22, 22, w - 44, h - 44, 46); g.stroke(); g.fillStyle = '#fff6e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'italic 700 78px Georgia, "Times New Roman", serif'; g.fillText('Merry', w / 2, h * 0.36); g.fillText('Christmas', w / 2, h * 0.68); }); }
function swirlTex() { return ctex(256, 256, (g, w, h) => { g.fillStyle = '#3a1a0a'; g.beginPath(); g.arc(128, 128, 127, 0, TAU); g.fill(); g.fillStyle = '#e8b870'; g.beginPath(); g.arc(128, 128, 116, 0, TAU); g.fill();
  g.strokeStyle = '#fff6ea'; g.lineWidth = 13; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i <= 200; i++) { const t = i / 200, a = t * TAU * 3.4, r = 6 + t * 104; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.stroke();
  g.strokeStyle = 'rgba(200,40,60,.55)'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 200; i++) { const t = i / 200, a = t * TAU * 3.4 + 0.5, r = 12 + t * 104; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } g.stroke(); }); }
export function cakeMats(env) {
  const E = (o) => Object.assign(o, env ? { envMap: env } : {});
  return {
    plate: new THREE.MeshPhysicalMaterial(E({ map: plateTex(), roughness: 0.25, clearcoat: 0.8, emissive: '#2a1206', emissiveIntensity: 0.4 })),
    bark: new THREE.MeshPhysicalMaterial(E({ vertexColors: true, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.2, emissive: '#1a0a04', emissiveIntensity: 0.35, envMapIntensity: 0.7 })),
    ends: new THREE.MeshStandardMaterial({ map: swirlTex(), roughness: 0.75, emissive: '#3a2210', emissiveIntensity: 0.35 }),
    cut: new THREE.MeshStandardMaterial({ map: cutTex('cake'), roughness: 0.8, emissive: '#3a2a18', emissiveIntensity: 0.3 }),
    gold: new THREE.MeshPhysicalMaterial(E({ color: '#ffd04a', metalness: 1, roughness: 0.2, clearcoat: 0.6, emissive: '#7a5000', emissiveIntensity: 0.5 })),
  };
}
// いちごのショートケーキ：白いクリームの大きな丸いケーキ。側面は絞りの縦すじ、上のふちにクリームの花と、いちご。真ん中に「Merry Christmas」のチョコの板とヒイラギ。すそにもクリームの縁どり
export function shortcakeMountain(MM, CM, R, H, seed = 1) {
  const g = new THREE.Group(), acc = new Acc(), mats = { ...MM, ...CM }, top = H * 0.78, fil = R * 0.1;
  const prof = [[0.001, top + R * 0.015], [R * 0.6, top + R * 0.01], [R - fil, top], [R - fil * 0.3, top - fil * 0.3], [R, top - fil], [R, H * 0.05], [R * 1.02, 0], [R * 1.02, -1.5]];
  const body = new THREE.LatheGeometry(prof.reverse().map(([x, y]) => new THREE.Vector2(x, y)), 160), p = body.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z), side = r > R * 0.97 && y > H * 0.06 && y < top - fil, k = side ? 1 + 0.012 * Math.abs(Math.sin(a * 40)) : 1;
    p.setX(i, x * k); p.setZ(i, z * k); const v = 0.95 + 0.05 * vnoise(a * 30, y * 2); col.set([v, v * 0.985, v * 0.96], i * 3); }
  body.setAttribute('color', new THREE.BufferAttribute(col, 3)); body.computeVertexNormals(); acc.add('cream', body);
  const S = R * 0.075, nR = 16, UPB = STRAW.clone().rotateX(Math.PI).translate(0, 1.15, 0);   // いちごは先を上に
  for (let i = 0; i < nR; i++) { const an = (i / nR) * TAU + seed, [sw] = softServe(R * 0.085, R * 0.13, '#fffdf8', '#fff4e6', 2.4); acc.add('cream', sw, null, place(Math.cos(an) * R * 0.87, top - R * 0.01, Math.sin(an) * R * 0.87, 1));
    const ab = an + Math.PI / nR; acc.add('berry', UPB.clone(), null, place(Math.cos(ab) * R * 0.8, top - S * 0.1, Math.sin(ab) * R * 0.8, S, 0.25, -ab, 0.15)); }
  for (let i = 0; i < 7; i++) { const an = i * 0.9 + seed, rr = R * (0.18 + 0.12 * (i % 3)); acc.add('berry', UPB.clone(), null, place(Math.cos(an) * rr, top - S * 0.1, Math.sin(an) * rr, S * 1.25, 0.3, -an, 0.25)); }
  // 側面の上のほうに、クリームの飾りひも（垂れた弧）と、弧の継ぎ目に小さなクリームの花
  for (let i = 0; i < 14; i++) { const an = (i / 14) * TAU + seed * 0.3, sw = new THREE.TorusGeometry(R * 0.2, R * 0.022, 6, 20, Math.PI).rotateZ(Math.PI);
    acc.add('cream', sw, null, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(an + Math.PI / 14) * R * 1.012, top - R * 0.16, Math.sin(an + Math.PI / 14) * R * 1.012), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -an - Math.PI / 14 - Math.PI / 2), new THREE.Vector3(1, 1, 1)));
    acc.add('cream', new THREE.SphereGeometry(R * 0.04, 10, 8), null, place(Math.cos(an) * R * 1.02, top - R * 0.17, Math.sin(an) * R * 1.02, 1)); }
  // すその縁どり（貝の形の絞り）
  { const N = 96, pos = []; for (let i = 0; i < N; i++) { const an = (i / N) * TAU; acc.add('cream', new THREE.SphereGeometry(1, 10, 8).scale(R * 0.06, R * 0.05, R * 0.09).rotateY(-an), null, place(Math.cos(an) * R * 1.03, R * 0.04, Math.sin(an) * R * 1.03, 1)); } }
  // チョコの板（真ん中に立てて、少し傾ける）とヒイラギ
  { const pl = new THREE.BoxGeometry(R * 0.55, R * 0.28, R * 0.03); acc.add('plate', pl, null, place(-R * 0.08, top + R * 0.17, R * 0.12, 1, -0.35, 0.3, 0)); }
  for (let i = 0; i < 3; i++) acc.add('leaf', new THREE.PlaneGeometry(1, 0.42).translate(0.5, 0, 0), null, place(R * 0.25, top + R * 0.03, -R * 0.12, R * 0.16, -1.25, i * 2.1 + seed, 0.15));
  for (let i = 0; i < 3; i++) acc.add('cherry', new THREE.SphereGeometry(1, 14, 10), null, place(R * 0.25 + Math.cos(i * 2.1) * R * 0.03, top + R * 0.05, -R * 0.12 + Math.sin(i * 2.1) * R * 0.03, R * 0.03));
  return meshesOf(acc, mats, g);
}
// ブッシュ・ド・ノエル：チョコの木の幹（樹皮のすじ・粉砂糖の雪）。切り口は、スポンジとクリームのうず。小さな切り株、メレンゲのきのこ、ヒイラギ
export function bucheMountain(MM, CM, L, R, seed = 1) {
  const g = new THREE.Group(), acc = new Acc(), mats = { ...MM, ...CM };
  const bark = (len, rad, NA = 72, NL = 40) => { const geo = new THREE.CylinderGeometry(rad, rad, len, NA, NL, true), p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), gro = vnoise(a * 7 + seed, y * 0.25) * 0.6 + vnoise(a * 26, y * 1.3) * 0.4, k = 1 + 0.05 * (gro - 0.5) + 0.015 * Math.sin(a * 30 + y * 0.4);
      p.setX(i, x * k); p.setZ(i, z * k); const d = 0.75 + 0.5 * gro; col.set([0.29 * d, 0.15 * d, 0.07 * d], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); return geo; };
  const sugar = (geo, M) => { geo.applyMatrix4(M); const p = geo.attributes.position, n = geo.attributes.normal, c = geo.attributes.color; for (let i = 0; i < p.count; i++) { const up = n.getY(i), s = SS(up, 0.35, 0.8) * SS(vnoise(p.getX(i) * 3, p.getZ(i) * 3 + seed), 0.35, 0.6); c.setXYZ(i, c.getX(i) + (0.96 - c.getX(i)) * s, c.getY(i) + (0.96 - c.getY(i)) * s, c.getZ(i) + (0.98 - c.getZ(i)) * s); } return geo; };
  acc.add('bark', sugar(bark(L, R).rotateZ(Math.PI / 2), new THREE.Matrix4().makeTranslation(0, R * 0.92, 0)));
  for (const sx of [-1, 1]) acc.add('ends', new THREE.CircleGeometry(R * 0.97, 48).rotateY(sx * Math.PI / 2), null, place(sx * L / 2 * 0.995, R * 0.92, 0, 1));
  // 小さな切り株（上に、うずの切り口）
  { const sr = R * 0.36, sh = R * 0.7, sx = L * 0.22; acc.add('bark', sugar(bark(sh, sr, 36, 8), new THREE.Matrix4().makeTranslation(sx, R * 0.92 + R * 0.75 + sh / 2 - R * 0.2, -R * 0.15))); acc.add('ends', new THREE.CircleGeometry(sr * 0.97, 32).rotateX(-Math.PI / 2), null, place(sx, R * 0.92 + R * 0.75 + sh - R * 0.2, -R * 0.15, 1)); }
  // メレンゲのきのこ（白いかさにココアの粉）
  for (let i = 0; i < 5; i++) { const x = (-0.35 + i * 0.17) * L, a = (i % 2 ? 1 : -1) * (0.5 + 0.2 * i), y0 = R * 0.92 + Math.cos(a) * R * 0.98, z0 = Math.sin(a) * R * 0.98, s = R * (0.16 + 0.04 * (i % 3));
    acc.add('mochi', new THREE.CylinderGeometry(s * 0.35, s * 0.45, s * 1.0, 14), null, place(x, y0 + s * 0.35, z0, 1, a * 0.4, 0, 0));
    acc.add('mochi', new THREE.SphereGeometry(s, 18, 10, 0, TAU, 0, Math.PI / 2).scale(1, 0.62, 1), '#f6efe6', place(x, y0 + s * 0.85, z0, 1, a * 0.4, 0, 0)); }
  for (let i = 0; i < 4; i++) acc.add('leaf', new THREE.PlaneGeometry(1, 0.42).translate(0.5, 0, 0), null, place(-L * 0.12, R * 1.9, R * 0.05, R * 0.32, -1.2, i * 1.6 + seed, 0.15));
  for (let i = 0; i < 3; i++) acc.add('cherry', new THREE.SphereGeometry(1, 14, 10), null, place(-L * 0.12 + Math.cos(i * 2.1) * R * 0.06, R * 1.94, R * 0.05 + Math.sin(i * 2.1) * R * 0.06, R * 0.06));
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
// aWall＝側面の点の、内向きの向き（x, y）・角の伸び（z）・内へ進んで外形からいちばん遠くなる所の深さ（w）。かじると側面が、削れたふちまで内へ寄る（寄せないと、表と裏の2枚の板だけが残って見えた）
export function flatCookie(outline, thick = 0.09, maxEdge = 0.035, extras = []) {
  const pos = [], nrm = [], uv = [], ed = [], wl = [], NOW = [0, 0, 0, 0], put = (x, y, z, nx, ny, nz, e, w = NOW) => { pos.push(x, y, z); nrm.push(nx, ny, nz); uv.push((x + 0.45) / 0.9, (y + 0.55) / 1.1); ed.push(e); wl.push(...w); };
  // 外形は左回りにそろえる（側面が外を向く）
  const capOf = (pts0, z0, half) => { const pts = THREE.ShapeUtils.isClockWise(pts0) ? pts0.slice().reverse() : pts0, tris = THREE.ShapeUtils.triangulateShape(pts, []); const out = []; const sub = (a, b, c) => { const L = [a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)], m = Math.max(...L); if (m <= maxEdge) { out.push(a, b, c); return; } if (m === L[0]) { const ab = a.clone().lerp(b, 0.5); sub(a, ab, c); sub(ab, b, c); } else if (m === L[1]) { const bc = b.clone().lerp(c, 0.5); sub(a, b, bc); sub(a, bc, c); } else { const ca = c.clone().lerp(a, 0.5); sub(a, b, ca); sub(ca, b, c); } };
    for (const [i, j, k] of tris) sub(pts[i], pts[j], pts[k]);
    const E = new Map(), eOf = (p) => { const key = p.x.toFixed(5) + ',' + p.y.toFixed(5); let e = E.get(key); if (e === undefined) { e = edgeDist(p, pts); E.set(key, e); } return e; };
    // 表の三角は、手前（+z）から見て左回りに（向きが逆だと裏から照らされて黒く見えた）
    for (let i = 0; i < out.length; i += 3) { let [a, b, c] = [out[i], out[i + 1], out[i + 2]]; if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0) [b, c] = [c, b]; for (const p of [a, b, c]) put(p.x, p.y, z0 + half, 0, 0, 1, eOf(p)); for (const p of [a, c, b]) put(p.x, p.y, z0 - half, 0, 0, -1, eOf(p)); }
    const n = pts.length, sn = pts.map((p, i) => { const q = pts[(i + 1) % n], ex = q.x - p.x, ey = q.y - p.y, L = Math.hypot(ex, ey) || 1; return [ey / L, -ex / L]; });
    const inw = pts.map((p, i) => { const a = sn[(i + n - 1) % n], b = sn[i]; let mx = -(a[0] + b[0]), my = -(a[1] + b[1]); const L = Math.hypot(mx, my) || 1; mx /= L; my /= L; const k = 1 / Math.max(0.5, -(mx * b[0] + my * b[1]));
      let t0 = 1; for (let j = 0; j < n; j++) { if (j === i || (j + 1) % n === i) continue; const a0 = pts[j], a1 = pts[(j + 1) % n], sx = a1.x - a0.x, sy = a1.y - a0.y, den = mx * sy - my * sx; if (Math.abs(den) < 1e-9) continue;
        const t = ((a0.x - p.x) * sy - (a0.y - p.y) * sx) / den, u = ((a0.x - p.x) * my - (a0.y - p.y) * mx) / den; if (t > 1e-4 && u >= 0 && u <= 1 && t < t0) t0 = t; }
      let ridge = 0; for (let st = 1; st <= 24; st++) { const t = (t0 * st) / 24, e = edgeDist(new THREE.Vector2(p.x + mx * t, p.y + my * t), pts); if (e > ridge) ridge = e; }   // 内へ進んで、外形からいちばん遠くなる所（そこまで削れたら、この側面は消える）
      return [mx, my, k, ridge]; });
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, p = pts[i], q = pts[j];
      const [pi, pj] = [inw[i], inw[j]], A = [-pi[0], -pi[1]], C = [-pj[0], -pj[1]];
      put(p.x, p.y, z0 + half, A[0], A[1], 0, 0, pi); put(q.x, q.y, z0 - half, C[0], C[1], 0, 0, pj); put(q.x, q.y, z0 + half, C[0], C[1], 0, 0, pj); put(p.x, p.y, z0 + half, A[0], A[1], 0, 0, pi); put(p.x, p.y, z0 - half, A[0], A[1], 0, 0, pi); put(q.x, q.y, z0 - half, C[0], C[1], 0, 0, pj); } };
  capOf(outline, 0, thick / 2);
  for (const [cx, cy, r] of extras) { const pts = []; for (let i = 0; i < 16; i++) pts.push(new THREE.Vector2(cx + Math.cos((i / 16) * TAU) * r, cy + Math.sin((i / 16) * TAU) * r)); capOf(pts, -0.01, thick / 2 * 0.9); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(ed, 1)); g.setAttribute('aWall', new THREE.Float32BufferAttribute(wl, 4)); return g;
}
// クッキーの焼き色と、削れ方（材質に足す）：ふちは濃く焼け、側面はいちばん濃い。uEat（0〜1）で、外形から内へ、ぎざぎざに削れていく。削れたふちは中の明るい生地
const CK_EAT = `float ckCrk(vec2 p) { return fract(sin(dot(floor(p * 46.0), vec2(12.9898, 78.233))) * 43758.5453); }
float ckEatAt(vec2 p) { return uEat * 0.2 - ckCrk(p) * 0.025 - 0.012 * sin(p.x * 53.0 + p.y * 31.0); }
`;
const COOKIE_V = 'attribute float aEdge; attribute vec4 aWall; uniform float uEat; varying float vEdge; varying vec2 vLoc; varying float vWall; varying float vCut; varying float vZ;\n' + CK_EAT;
const COOKIE_F = `uniform float uEat; varying float vEdge; varying vec2 vLoc; varying float vWall; varying float vCut; varying float vZ;
${CK_EAT}float ckEat() { return ckEatAt(vLoc); }
`;
function cookieLook(sh, U) {
  sh.uniforms.uEat = U.uEat;
  // 側面：削れたふち（ckEatAt）まで内へ寄せる。反対側の外形とぶつかる所まで削れたら（腕の先が消えた）、その側面も消す
  sh.vertexShader = COOKIE_V + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
vEdge = aEdge; vLoc = position.xy; vWall = 0.0; vCut = 0.0; vZ = position.z;
if (aWall.z > 0.0) { vWall = 1.0; if (uEat > 0.0) { float e = max(0.0, ckEatAt(position.xy + aWall.xy * uEat * 0.2) - 0.006); if (e >= aWall.w) vWall = 2.0; float sc = min(e, aWall.w) * aWall.z; transformed.xy += aWall.xy * sc; vCut = sc; } }`);
  sh.fragmentShader = COOKIE_F + sh.fragmentShader.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (vWall > 0.5) normal = normalize(vNormal) * (gl_FrontFacing ? 1.0 : -1.0);')
    .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nif (vWall > 0.5) totalEmissiveRadiance = diffuseColor.rgb * 0.14;')
    .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nfloat ckE = ckEat(); if (uEat > 0.0 && ((vWall < 0.5 && vEdge < ckE) || vWall > 1.5)) discard;')
    .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb *= mix(vec3(0.6, 0.47, 0.38), vec3(1.0), smoothstep(0.0, 0.032, vEdge));
if (uEat > 0.0) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.15, 0.05), (1.0 - smoothstep(0.0, 0.025, vEdge - ckE)) * 0.45);
if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.3, 0.1, 0.03);
if (vWall > 0.5) { vec2 gp = vec2(vLoc.x * 0.8 + vLoc.y * 0.6, vZ) * 2.2; float gr = ckCrk(gp), pore = step(0.86, ckCrk(gp * 1.7 + 3.1)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.12, 0.035) * (0.9 + 0.2 * gr) * (1.0 - 0.3 * pore), smoothstep(0.0, 0.012, vCut)); }   // 削れた側面＝中の生地（表の焼き色より少し明るい茶。ざらっと粒と小さな穴）。色は直線の色空間の値（sRGB の値のまま書くと、白っぽい黄土色になって、まわりから浮いた。本人 2026-10-17 に2回）`);
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
  const U = { uLeg: { value: new THREE.Vector4() }, uNeck: { value: 0 }, uEat: { value: 0 } }, m = new THREE.MeshStandardMaterial({ map, roughness: 0.8, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.2 });
  const dn = dough().normal.clone(); dn.repeat.set(3, 3); dn.needsUpdate = true; m.normalMap = dn;
  m.onBeforeCompile = (sh) => { sh.uniforms.uLeg = U.uLeg; sh.uniforms.uNeck = U.uNeck;
    sh.vertexShader = DEER + sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ vec2 pv; float a = deerAng(position.xy, pv); objectNormal.xy = rot2(objectNormal.xy, a); }').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec2 pv; float a = deerAng(position.xy, pv); transformed.xy = pv + rot2(transformed.xy - pv, a); }');
    cookieLook(sh, U); };
  m.customProgramCacheKey = () => 'deer-run'; m.userData.U = U; return m;
}
// 焼き色だけのクッキー（そり）
// クッキーは、暗い裏側からも絵が見えるよう、自分の絵で少しだけ光る
export function cookieMaterial(map) { const U = { uEat: { value: 0 } }, m = new THREE.MeshStandardMaterial({ map, roughness: 0.75, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.2 }); m.onBeforeCompile = (sh) => cookieLook(sh, U); m.customProgramCacheKey = () => 'cookie-look'; return m; }
export function santaFace() { return ctex(256, 320, (g, w, h) => { const X = (x) => ((x + 0.45) / 0.9) * w, Y = (y) => (1 - (y + 0.55) / 1.1) * h; doughBase(g, w, h); icingPen(g);
  g.fillStyle = '#d8283c'; g.beginPath(); g.moveTo(X(-0.17), Y(0.42)); g.quadraticCurveTo(X(0), Y(0.72), X(0.2), Y(0.56)); g.lineTo(X(0.17), Y(0.42)); g.closePath(); g.fill(); g.fillRect(X(-0.15), Y(0.19), X(0.15) - X(-0.15), Y(-0.17) - Y(0.19));
  g.fillStyle = '#fffaf2'; g.fillRect(X(-0.19), Y(0.45), X(0.19) - X(-0.19), 12); g.beginPath(); g.arc(X(0.21), Y(0.57), 9, 0, TAU); g.fill(); g.beginPath(); g.moveTo(X(-0.12), Y(0.3)); g.quadraticCurveTo(X(0), Y(0.12), X(0.12), Y(0.3)); g.quadraticCurveTo(X(0), Y(0.22), X(-0.12), Y(0.3)); g.fill();
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 6, 0, TAU); g.fill(); } }); }

// ---------- 切り分けられるケーキ（本人 2026-10-17「扇形の1/8の1切れを持っていく」）----------
// ケーキは1切れずつ形を作り、材質ごとに並べてまとめる。aWedge＝何切れ目か・aWC＝その切れのまん中（戻る時は、ここを中心に大きくなる）
// rng[key][k]＝材質 key の形の中で、k 切れ目の頂点の範囲（フォークは、この範囲を写して持っていく）
// 切り口（扇形の2つの面）は、スポンジ・クリーム・いちごの層の絵。層の境目は、いびつに波打って、にじむ
function cutTex(kind) { return ctex(128, 512, (g, w, h) => {
  const wav = (y, s, a) => (x) => y + Math.sin(x * 0.11 + s) * a + Math.sin(x * 0.37 + s * 2) * a * 0.4 + (hash2(Math.floor(x / 6), s) - 0.5) * a * 0.6;
  const band = (y0f, y1f, col, s) => { const f0 = wav(h * (1 - y0f), s, 5), f1 = wav(h * (1 - y1f), s + 3, 5); g.fillStyle = col; g.beginPath(); g.moveTo(0, f0(0)); for (let x = 0; x <= w; x += 4) g.lineTo(x, f0(x)); for (let x = w; x >= 0; x -= 4) g.lineTo(x, f1(x)); g.closePath(); g.fill(); };
  if (kind === 'choco') {   // チョコのスポンジとクリームの、うずの断面（ブッシュの切り株にも）
    g.fillStyle = '#5a2c14'; g.fillRect(0, 0, w, h); for (const [a, b] of [[0.1, 0.2], [0.34, 0.44], [0.58, 0.68], [0.82, 0.9]]) band(a, b, '#f6ead6', a * 30);
  } else {
    g.fillStyle = '#f2c878'; g.fillRect(0, 0, w, h);   // スポンジ
    const cr = '#fffaf0'; band(0.27, 0.4, cr, 1); band(0.62, 0.74, cr, 2); band(0.93, 1.01, cr, 3);
    for (const [y0, y1, s] of [[0.27, 0.4, 5], [0.62, 0.74, 9]]) for (let k = 0; k < 7; k++) { const x = 10 + k * 18 + hash2(k, s) * 8, y = h * (1 - (y0 + y1) / 2) + (hash2(s, k) - 0.5) * 10, rx = 8 + hash2(k + 3, s) * 4, ry = (y1 - y0) * h * 0.36;   // いちごの断面
      g.fillStyle = '#d8203a'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.fillStyle = '#ffb0b8'; g.beginPath(); g.ellipse(x, y, rx * 0.55, ry * 0.5, 0, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(200,120,40,.5)'; g.fillRect(0, h * 0.985, w, h * 0.015);   // 底の焼き色
  }
  for (let i = 0; i < 900; i++) { const x = hash2(i, 7) * w, y = hash2(7, i) * h; g.fillStyle = kind === 'choco' ? 'rgba(30,10,4,.35)' : 'rgba(170,110,40,.35)'; g.beginPath(); g.arc(x, y, 0.6 + hash2(i, 9) * 1.4, 0, TAU); g.fill(); }   // 気泡の穴
  g.fillStyle = kind === 'choco' ? '#3a1a0a' : '#fffaf0'; g.fillRect(w * 0.94, 0, w * 0.06, h);   // 外側のクリーム（チョコ）のぬり
}); }
// 扇形の切り口の面：中心（半径0）から外（半径 r）まで、高さ y0〜y1。phi の向きに、out＝±1 の側を表に
function cutFace(phi, r, y0, y1, out) { const n = 6, pos = [], uv = [], T = new THREE.Vector3(Math.cos(phi), 0, -Math.sin(phi)).multiplyScalar(out), idx = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= 1; i++) { const rr = i * r, y = y0 + (y1 - y0) * (j / n); pos.push(Math.sin(phi) * rr, y, Math.cos(phi) * rr); uv.push(i, j / n); }
  for (let j = 0; j < n; j++) { const a = j * 2, b = a + 2; idx.push(a, a + 1, b + 1, a, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const nz = g.attributes.normal; if (nz.getX(0) * T.x + nz.getZ(0) * T.z < 0) { idx.length = 0; for (let j = 0; j < n; j++) { const a = j * 2, b = a + 2; idx.push(a, b + 1, a + 1, a, b, b + 1); } g.setIndex(idx); }
  for (let i = 0; i < nz.count; i++) nz.setXYZ(i, T.x, 0, T.z); return g; }
// クリームの花（軽い形）：しぼり口の筋が8本、ねじれながら先へすぼまる。ソフトクリームの渦（1つ3千三角）の代わりに、ケーキのふちにたくさん並べる用（1つ約3百三角）
function rosette(r, h) { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(Math.max(0.001, r * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62 + 0.55) * (1 - t * 0.85)), h * t)); }
  const g = new THREE.LatheGeometry(pts, 20), p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x) + (y / h) * 1.6, k = 1 + 0.16 * Math.cos(a * 8); p.setX(i, x * k); p.setZ(i, z * k); const v = 0.9 + 0.1 * Math.cos(a * 8); col.set([v, v * 0.985, v * 0.96], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g; }
// 切れごとの形をまとめる：parts[k]＝[[key, geo, color]]。k 切れ目のまん中 wc[k]
function sliceBuild(parts, wc, mats) { const keys = new Set(); parts.forEach((L) => L.forEach(([k]) => keys.add(k))); const g = new THREE.Group(), rng = {};
  for (const key of keys) { const acc = new Acc(), R = []; let v = 0;
    parts.forEach((L, k) => { const s = v; for (const [kk, geo, col] of L) if (kk === key) { acc.add(key, geo, col); v += acc.parts.get(key)[acc.parts.get(key).length - 1][0].attributes.position.count; } R.push([s, v]); });
    const [mesh] = acc.build({ [key]: mats[key] }), n = mesh.geometry.attributes.position.count, aw = new Float32Array(n), ac = new Float32Array(n * 3);
    R.forEach(([s, e], k) => { for (let i = s; i < e; i++) { aw[i] = k; ac.set([wc[k].x, wc[k].y, wc[k].z], i * 3); } });
    mesh.geometry.setAttribute('aWedge', new THREE.BufferAttribute(aw, 1)); mesh.geometry.setAttribute('aWC', new THREE.BufferAttribute(ac, 3)); rng[key] = R; g.add(mesh); }
  g.userData.rng = rng; g.userData.N = parts.length; return g; }
// 丸いケーキ（段を重ねるとタワー）：tiers＝[[半径, 高さ], …]（下から）。N＝切れの数
export function sliceCake(MM, CM, tiers, N = 8, seed = 1, top = 'star') {
  const mats = { ...MM, ...CM, cut: CM.cut }, parts = Array.from({ length: N }, () => []), wc = [], da = TAU / N, inW = (a) => Math.floor((((a % TAU) + TAU) % TAU) / da) % N;
  const UPB = STRAW.clone().rotateX(Math.PI).translate(0, 1.15, 0); let y0 = 0;
  tiers.forEach(([R, h], ti) => { const y1 = y0 + h, fil = R * 0.08, S = Math.min(R * 0.075, 0.9);
    for (let k = 0; k < N; k++) { const a0 = k * da, prof = [[R * 1.0, y0], [R, y0 + h * 0.02], [R, y1 - fil], [R - fil * 0.3, y1 - fil * 0.3], [R - fil, y1], [R * 0.6, y1 + R * 0.01], [0.001, y1 + R * 0.012]];
      const body = new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 18, a0, da), p = body.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), r = Math.hypot(x, z), side = r > R * 0.97 && y > y0 + h * 0.06 && y < y1 - fil, kk = side ? 1 + 0.012 * Math.abs(Math.sin(a * 40)) : 1; p.setX(i, x * kk); p.setZ(i, z * kk); const v = 0.95 + 0.05 * vnoise(a * 30, y * 2); col.set([v, v * 0.985, v * 0.96], i * 3); }
      body.setAttribute('color', new THREE.BufferAttribute(col, 3)); body.computeVertexNormals(); parts[k].push(['cream', body]);
      parts[k].push(['cut', cutFace(a0, R * 0.995, y0 + 0.01, y1 - 0.02, -1)], ['cut', cutFace(a0 + da, R * 0.995, y0 + 0.01, y1 - 0.02, 1)]);
      if (ti === 0) wc[k] = new THREE.Vector3(Math.sin(a0 + da / 2) * R * 0.55, (y1 * 0.5), Math.cos(a0 + da / 2) * R * 0.55); }
    // 上のふちのクリームの花といちご・側面の飾りひも・すその貝の絞り（どれも、その角度の切れへ）
    const nR = Math.max(8, Math.round(16 * R / tiers[0][0]) * 2);
    for (let i = 0; i < nR; i++) { const an = (i / nR) * TAU + 0.07, sw = rosette(R * 0.075, R * 0.13); parts[inW(an)].push(['cream', sw.applyMatrix4(place(Math.sin(an) * R * 0.87, y1 - R * 0.01, Math.cos(an) * R * 0.87, 1))]);
      const ab = an + Math.PI / nR; parts[inW(ab)].push(['berry', UPB.clone().applyMatrix4(place(Math.sin(ab) * R * 0.8, y1 - S * 0.1, Math.cos(ab) * R * 0.8, S, 0.25, ab, 0.15))]); }
    for (let i = 0; i < nR / 2; i++) { const an = (i / (nR / 2)) * TAU + da / 2, sw = new THREE.TorusGeometry(R * 0.18, R * 0.02, 6, 16, Math.PI).rotateZ(Math.PI);
      parts[inW(an)].push(['cream', sw.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(Math.sin(an) * R * 1.012, y1 - h * 0.28, Math.cos(an) * R * 1.012), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), an + Math.PI / 2), new THREE.Vector3(1, 1, 1)))]); }
    const nS = Math.round(64 * R / tiers[0][0]); for (let i = 0; i < nS; i++) { const an = ((i + 0.5) / nS) * TAU; parts[inW(an)].push(['cream', new THREE.SphereGeometry(1, 7, 5).scale(R * 0.06, R * 0.05, R * 0.085).rotateY(an).applyMatrix4(place(Math.sin(an) * R * 1.03, y0 + R * 0.04, Math.cos(an) * R * 1.03, 1))]); }
    y0 = y1; });
  // いちばん上：いちごの山と、星（タワー）／チョコの板（ショートケーキ）。どちらも、その角度の切れへ
  const [Rt] = tiers[tiers.length - 1], S2 = Math.min(Rt * 0.09, 1.0);
  for (let i = 0; i < 6; i++) { const an = i * 1.05 + seed, rr = Rt * (0.18 + 0.14 * (i % 3)); parts[inW(an)].push(['berry', UPB.clone().applyMatrix4(place(Math.sin(an) * rr, y0 - S2 * 0.1, Math.cos(an) * rr, S2 * 1.2, 0.3, an, 0.25))]); }
  if (top === 'star') { const st = new THREE.Shape(); for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 0.42 : 1; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    const sg = new THREE.ExtrudeGeometry(st, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 2 }).translate(0, 0, -0.15); parts[0].push(['gold', sg.applyMatrix4(place(Math.sin(da / 2) * Rt * 0.18, y0 + Rt * 0.55, Math.cos(da / 2) * Rt * 0.18, Rt * 0.32, 0, 0.3, 0))], ['gold', new THREE.CylinderGeometry(Rt * 0.03, Rt * 0.03, Rt * 0.5, 8).applyMatrix4(place(Math.sin(da / 2) * Rt * 0.18, y0 + Rt * 0.25, Math.cos(da / 2) * Rt * 0.18, 1))]); }
  else parts[0].push(['plate', new THREE.BoxGeometry(Rt * 0.55, Rt * 0.28, Rt * 0.03).applyMatrix4(place(Math.sin(da / 2) * Rt * 0.3, y0 + Rt * 0.17, Math.cos(da / 2) * Rt * 0.3, 1, -0.35, da / 2, 0))]);
  for (let i = 0; i < 3; i++) parts[1 % N].push(['leaf', new THREE.PlaneGeometry(1, 0.42).translate(0.5, 0, 0).applyMatrix4(place(Math.sin(da * 1.5) * Rt * 0.35, y0 + Rt * 0.03, Math.cos(da * 1.5) * Rt * 0.35, Rt * 0.16, -1.25, i * 2.1 + seed, 0.15))], ['cherry', new THREE.SphereGeometry(1, 12, 8).applyMatrix4(place(Math.sin(da * 1.5) * Rt * 0.35 + Math.cos(i * 2.1) * Rt * 0.03, y0 + Rt * 0.05, Math.cos(da * 1.5) * Rt * 0.35 + Math.sin(i * 2.1) * Rt * 0.03, Rt * 0.03))]);
  const g = sliceBuild(parts, wc, { ...mats, gold: CM.gold }); g.userData.kind = 'round'; g.userData.H = y0; g.userData.R = tiers[0][0]; return g; }
// ブッシュ・ド・ノエル（輪切りにできる）：長さ L・半径 R を N 枚に。切り口は、うずの絵
export function sliceBuche(MM, CM, L, R, N = 8, seed = 5) {
  const mats = { ...MM, ...CM }, parts = Array.from({ length: N }, () => []), wc = [], sl = L / N, cy = R * 0.92;
  for (let k = 0; k < N; k++) { const x0 = -L / 2 + k * sl, xm = x0 + sl / 2;
    const geo = new THREE.CylinderGeometry(R, R, sl, 72, 6, true), p = geo.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i) + xm, z = p.getZ(i), a = Math.atan2(z, x), gro = vnoise(a * 7 + seed, y * 0.25) * 0.6 + vnoise(a * 26, y * 1.3) * 0.4, kk = 1 + 0.05 * (gro - 0.5) + 0.015 * Math.sin(a * 30 + y * 0.4);
      p.setX(i, x * kk); p.setZ(i, z * kk); const d = 0.75 + 0.5 * gro; col.set([0.29 * d, 0.15 * d, 0.07 * d], i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); geo.rotateZ(-Math.PI / 2); geo.translate(xm, cy, 0);
    { const n = geo.attributes.normal, c = geo.attributes.color, pp = geo.attributes.position; for (let i = 0; i < pp.count; i++) { const up = n.getY(i), s = SS(up, 0.35, 0.8) * SS(vnoise(pp.getX(i) * 3, pp.getZ(i) * 3 + seed), 0.35, 0.6); c.setXYZ(i, c.getX(i) + (0.96 - c.getX(i)) * s, c.getY(i) + (0.96 - c.getY(i)) * s, c.getZ(i) + (0.98 - c.getZ(i)) * s); } }   // 粉砂糖の雪
    parts[k].push(['bark', geo]);
    for (const sx of [-1, 1]) parts[k].push(['ends', new THREE.CircleGeometry(R * 0.985, 48).rotateY(sx * Math.PI / 2).translate(xm + sx * sl / 2 * 0.998, cy, 0)]);
    wc[k] = new THREE.Vector3(xm, cy, 0); }
  const seg = (x) => Math.max(0, Math.min(N - 1, Math.floor((x + L / 2) / sl)));
  { const sr = R * 0.36, sh = R * 0.7, sx = L * 0.1; const geo = new THREE.CylinderGeometry(sr, sr, sh, 36, 4, true), cc = new Float32Array(geo.attributes.position.count * 3).fill(0.25); geo.setAttribute('color', new THREE.BufferAttribute(cc, 3)); parts[seg(sx)].push(['bark', geo.translate(sx, cy + R * 0.75 + sh / 2 - R * 0.2, -R * 0.15)], ['ends', new THREE.CircleGeometry(sr * 0.97, 32).rotateX(-Math.PI / 2).translate(sx, cy + R * 0.75 + sh - R * 0.2, -R * 0.15)]); }
  for (let i = 0; i < 6; i++) { const x = (-0.42 + i * 0.16) * L, a = (i % 2 ? 1 : -1) * (0.5 + 0.2 * i), y0 = cy + Math.cos(a) * R * 0.98, z0 = Math.sin(a) * R * 0.98, s = R * (0.16 + 0.04 * (i % 3));
    parts[seg(x)].push(['mochi', new THREE.CylinderGeometry(s * 0.35, s * 0.45, s * 1.0, 14).applyMatrix4(place(x, y0 + s * 0.35, z0, 1, a * 0.4, 0, 0))], ['mochi', new THREE.SphereGeometry(s, 18, 10, 0, TAU, 0, Math.PI / 2).scale(1, 0.62, 1).applyMatrix4(place(x, y0 + s * 0.85, z0, 1, a * 0.4, 0, 0)), '#f6efe6']); }
  const hx = -L * 0.18; for (let i = 0; i < 4; i++) parts[seg(hx)].push(['leaf', new THREE.PlaneGeometry(1, 0.42).translate(0.5, 0, 0).applyMatrix4(place(hx, cy + R * 0.98, R * 0.05, R * 0.32, -1.2, i * 1.6 + seed, 0.15))]);
  for (let i = 0; i < 3; i++) parts[seg(hx)].push(['cherry', new THREE.SphereGeometry(1, 14, 10).applyMatrix4(place(hx + Math.cos(i * 2.1) * R * 0.06, cy + R * 1.02, R * 0.05 + Math.sin(i * 2.1) * R * 0.06, R * 0.06))]);
  const g = sliceBuild(parts, wc, mats); g.userData.kind = 'log'; g.userData.L = L; g.userData.R = R; g.userData.H = cy + R; return g; }
