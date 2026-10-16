// お菓子の町の部品（本人 2026-10-16「家々はグミではなく、お菓子の家」「山はかき氷・ソフトクリーム」「炭酸の滝」「ジンジャークッキーは手足がぐにょりと曲がって歩く」）
// ・家：クッキーの壁・アイシングの縁・屋根（粉砂糖のフロスティングのしずく／ウエハース／チョコ）・飴の窓・チョコの扉・ガムドロップ・ペパーミント
//   たくさん並べるので、同じ材質の部品は町じゅう1つにまとめて描く（Acc）
// ・山：かき氷（つぶつぶの氷にシロップ）・ソフトクリーム（絞り口の筋のあるうず）。炭酸の滝。キャンディケインの灯台
// ・住人：ジンジャークッキー（男女・老若。面を細かく割って、肩・股から先を「ぐにょり」と曲げる）。そりのサンタとトナカイもクッキー
import * as THREE from 'three';

const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
const ctex = (w, h, draw, srgb = true) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
const nonIdx = (g) => (g.index ? g.toNonIndexed() : g);

// ---------- 同じ材質の部品をまとめる（色は頂点ごと） ----------
export class Acc {
  constructor() { this.parts = new Map(); }
  add(key, geo, color = null, m = null) { if (m) geo.applyMatrix4(m); (this.parts.get(key) || this.parts.set(key, []).get(key)).push([nonIdx(geo), color]); }
  build(mats) {
    const out = [];
    for (const [key, list] of this.parts) {
      let n = 0; for (const [g] of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = new Float32Array(n * 3); let o = 0;
      for (const [g, c] of list) { const k = g.attributes.position.count; pos.set(g.attributes.position.array.subarray(0, k * 3), o * 3); nrm.set(g.attributes.normal.array.subarray(0, k * 3), o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array.subarray(0, k * 2), o * 2); const cc = c ? new THREE.Color(c) : new THREE.Color(1, 1, 1); for (let i = 0; i < k; i++) col.set([cc.r, cc.g, cc.b], (o + i) * 3); o += k; }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeBoundingSphere(); const mesh = new THREE.Mesh(geo, mats[key]); mesh.userData.key = key; out.push(mesh);
    }
    return out;
  }
}

// ---------- 材質 ----------
const crumbs = (g, w, h, base, n, dark, light) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { g.fillStyle = Math.random() < 0.6 ? `rgba(${dark},${0.08 + Math.random() * 0.2})` : `rgba(${light},${0.05 + Math.random() * 0.15})`; const s = 1 + Math.random() * 3; g.fillRect(Math.random() * w, Math.random() * h, s, s); } };
export function makeMats(env) {
  const cookieTex = ctex(256, 256, (g, w, h) => crumbs(g, w, h, '#c07436', 2600, '95,42,12', '255,222,170'));
  const crumbN = ctex(256, 256, (g, w, h) => { g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1800; i++) { const v = Math.random() < 0.5; g.fillStyle = v ? 'rgba(150,150,255,.6)' : 'rgba(106,106,255,.6)'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, false);
  const wafer = ctex(256, 256, (g, w, h) => { g.fillStyle = '#e9c88f'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,110,50,.55)'; g.lineWidth = 6; for (let i = -1; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32 + 256, 256); g.stroke(); g.beginPath(); g.moveTo(i * 32 + 256, 0); g.lineTo(i * 32, 256); g.stroke(); } crumbs(g, 0, 0, '#000', 0, '', ''); });
  const choco = ctex(256, 256, (g, w, h) => { g.fillStyle = '#3e2214'; g.fillRect(0, 0, w, h); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const gr = g.createLinearGradient(x * 64, y * 64, x * 64 + 64, y * 64 + 64); gr.addColorStop(0, '#6a3c22'); gr.addColorStop(0.5, '#4a2a18'); gr.addColorStop(1, '#2a160c'); g.fillStyle = gr; g.fillRect(x * 64 + 5, y * 64 + 5, 54, 54); } });
  const glass = ctex(128, 160, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.55, 4, w / 2, h / 2, h * 0.7); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e8e8e8'); gr.addColorStop(1, '#b0b0b0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(w / 2 - 4, 0, 8, h); g.fillRect(0, h * 0.42, w, 8); });
  const mint = ctex(128, 128, (g, w, h) => { g.fillStyle = '#fbf6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#e0233a'; for (let i = 0; i < 8; i += 2) { g.beginPath(); g.moveTo(64, 64); for (let k = 0; k <= 10; k++) { const a = ((i + k / 10) / 8) * TAU + (k / 10) * 0.9; g.lineTo(64 + Math.cos(a) * 62 * (k / 10 + 0.05), 64 + Math.sin(a) * 62 * (k / 10 + 0.05)); } for (let k = 10; k >= 0; k--) { const a = ((i + 1 + k / 10) / 8) * TAU - 0.0 + (k / 10) * 0.9; g.lineTo(64 + Math.cos(a) * 62 * (k / 10 + 0.05), 64 + Math.sin(a) * 62 * (k / 10 + 0.05)); } g.fill(); } });
  const stripe = ctex(64, 256, (g, w, h) => { g.fillStyle = '#fbf6f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#d81e34'; for (let i = -2; i < 10; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32 - 22); g.lineTo(w, i * 32 - 6); g.lineTo(0, i * 32 + 16); g.fill(); } });
  const sparkle = ctex(128, 128, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 400; i++) { g.fillStyle = Math.random() < 0.3 ? 'rgba(200,215,255,.9)' : 'rgba(235,240,255,.7)'; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); } });
  const E = (o) => Object.assign(o, env ? { envMap: env } : {});
  return {
    cookie: new THREE.MeshStandardMaterial({ map: cookieTex, normalMap: crumbN, normalScale: new THREE.Vector2(0.6, 0.6), vertexColors: true, roughness: 0.82 }),
    frost: new THREE.MeshPhysicalMaterial(E({ map: sparkle, color: '#fbfcff', roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3, sheen: 0.5, sheenColor: new THREE.Color('#dfe8ff'), emissive: '#2a3460', emissiveIntensity: 0.15, envMapIntensity: 0.8 })),
    icing: new THREE.MeshStandardMaterial({ color: '#fffaf2', roughness: 0.3, emissive: '#fff1dc', emissiveIntensity: 0.12 }),
    wafer: new THREE.MeshStandardMaterial({ map: wafer, vertexColors: true, roughness: 0.75 }),
    choco: new THREE.MeshPhysicalMaterial(E({ map: choco, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.2, envMapIntensity: 0.6 })),
    glass: new THREE.MeshBasicMaterial({ map: glass, vertexColors: true }),
    gum: new THREE.MeshPhysicalMaterial(E({ vertexColors: true, roughness: 0.85, sheen: 1, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.4, envMapIntensity: 0.5 })),
    mint: new THREE.MeshPhysicalMaterial(E({ map: mint, roughness: 0.25, clearcoat: 1, envMapIntensity: 0.8 })),
    stripe: new THREE.MeshPhysicalMaterial(E({ map: stripe, roughness: 0.25, clearcoat: 1, envMapIntensity: 0.8 })),
  };
}

// ---------- 家 ----------
// 縁のアイシング：辺にそって少し波打つ管（絞り出したように）
function piped(pts, r = 0.032, wav = 0.012) {
  const P = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], L = a.distanceTo(b), n = Math.max(2, Math.round(L / 0.18)); for (let k = 0; k < n; k++) { const t = k / n, p = a.clone().lerp(b, t); p.y += Math.sin((i + t) * 37) * wav * 0.6; P.push(p.addScalar(Math.sin(k * 2.1) * wav * 0.4)); } }
  P.push(pts[pts.length - 1].clone());
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), Math.max(4, P.length), r, 3, false);
}
// しずく（屋根から垂れたフロスティング）
const DRIP = (() => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, y = -t; pts.push(new THREE.Vector2(0.001 + Math.sin(Math.PI * Math.min(1, t * 1.05)) * (0.6 + 0.4 * t) * 0.9 * (t < 0.15 ? 0.7 + t * 2 : 1), y)); } pts[0].x = 0.9; pts[6].x = 0.001; return new THREE.LatheGeometry(pts, 6); })();
const GUM = (() => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push(new THREE.Vector2(Math.max(0.001, Math.cos(t * Math.PI / 2) ** 0.7), Math.sin(t * Math.PI / 2) * 1.1)); } return new THREE.LatheGeometry(pts, 8); })();
function gable(w, h, rh) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(0, h + rh); s.lineTo(-w / 2, h); s.closePath(); return s; }
const GUMC = ['#ff4a5a', '#3fd06a', '#ffd23a', '#5fa8ff', '#ff8a2a', '#c07aff'], GLASSC = ['#ffb347', '#ff6a5a', '#ffd86a', '#8ad46a', '#ff9ad0'];
// o＝{ x, y, z, ry, w, d, h, rh, roof: 'frost'|'wafer'|'choco', shade, glass, gum, chimney, door, mint, base（坂の下へ伸ばす土台の高さ）, lod（0＝近い：全部／1＝横と後ろの窓・しずくを省く／2＝遠い：正面の縁と窓だけ） }
export function addHouse(acc, o) {
  const M = new THREE.Matrix4().compose(new THREE.Vector3(o.x, o.y, o.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.ry || 0), new THREE.Vector3(1, 1, 1));
  const lod = o.lod ?? (o.simple ? 1 : 0), at = (g) => g.applyMatrix4(M), { w, d, h, rh } = o, bev = 0.05, top = h + rh, a = Math.atan2(rh, w / 2), Ls = Math.hypot(w / 2, rh) + 0.22;
  const body = new THREE.ExtrudeGeometry(gable(w, h, rh), { depth: d, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 1 }).translate(0, 0, -d / 2); body.scale(1, 1, 1);
  const uvA = body.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * 0.7, uvA.getY(i) * 0.7);
  acc.add('cookie', at(body), o.shade);
  if (o.base) acc.add('choco', at(new THREE.BoxGeometry(w + 0.16, o.base, d + 0.16).translate(0, -o.base / 2 + 0.04, 0)));
  // 屋根
  for (const sd of [-1, 1]) {
    const thick = o.roof === 'frost' ? 0.16 : 0.1, sl = new THREE.BoxGeometry(Ls, thick, d + 0.36);
    sl.rotateZ(-sd * a); sl.translate(sd * (w / 4) - sd * Math.sin(a) * (thick / 2 + bev) + sd * Math.cos(a) * 0.08, h + rh / 2 + Math.cos(a) * (thick / 2 + bev) - Math.sin(a) * 0.08, 0);
    acc.add(o.roof === 'frost' ? 'frost' : o.roof, at(sl), o.roof === 'wafer' ? o.shade : null);
    // 軒先のしずく（フロスティング）。ウエハース・チョコの屋根は、軒に細い雪
    const ex = sd * (w / 2 + 0.2), ey = h - 0.02;
    if (o.roof === 'frost' && lod === 0) { for (let z = -d / 2 - 0.1; z <= d / 2 + 0.1; z += rnd(0.26, 0.38)) { const L = rnd(0.07, 0.3), dr = DRIP.clone().scale(0.045, L, 0.045).translate(ex, ey + 0.02, z); acc.add('frost', at(dr)); } }
    else acc.add('frost', at(new THREE.CylinderGeometry(0.06, 0.06, d + 0.36, 6).rotateX(Math.PI / 2).translate(ex, ey + 0.04, 0)));
  }
  acc.add('frost', at(new THREE.CylinderGeometry(0.1, 0.1, d + 0.4, 8).rotateX(Math.PI / 2).translate(0, top + bev + 0.05, 0)));   // 棟の雪
  // 縁のアイシング：前後の妻・四隅
  for (const zz of lod < 2 ? [d / 2 + bev + 0.01, -d / 2 - bev - 0.01] : [d / 2 + bev + 0.01]) { acc.add('icing', at(piped([new THREE.Vector3(-w / 2 - 0.05, h, zz), new THREE.Vector3(0, top + 0.03, zz), new THREE.Vector3(w / 2 + 0.05, h, zz)]))); if (lod === 0 || zz > 0) for (const sx of [-1, 1]) acc.add('icing', at(piped([new THREE.Vector3(sx * (w / 2 + bev), 0.05, zz), new THREE.Vector3(sx * (w / 2 + bev), h, zz)], 0.028))); }
  // 窓（前・後ろ・両横）：飴のガラスに、アイシングの枠と窓台の雪
  const win = (cx, cy, ww, wh, face) => {
    const pane = new THREE.PlaneGeometry(ww, wh), frame = [], R = [[-ww / 2, -wh / 2], [ww / 2, -wh / 2], [ww / 2, wh / 2], [-ww / 2, wh / 2], [-ww / 2, -wh / 2]].map(([x, y]) => new THREE.Vector3(x * 1.08, y * 1.08, 0.01));
    const sill = new THREE.BoxGeometry(ww + 0.18, 0.06, 0.12).translate(0, -wh / 2 - 0.05, 0.05), pip = piped(R, 0.024, 0.006);
    const F = new THREE.Matrix4(); if (face === 'f') F.makeTranslation(cx, cy, d / 2 + bev + 0.004); else if (face === 'b') F.makeRotationY(Math.PI).setPosition(-cx, cy, -d / 2 - bev - 0.004); else { const s = face === 'r' ? 1 : -1; F.makeRotationY(s * Math.PI / 2).setPosition(s * (w / 2 + bev + 0.004), cy, cx); }
    for (const [k, g, c] of lod < 2 ? [['glass', pane, o.glass], ['icing', pip, null], ['frost', sill, null]] : [['glass', pane, o.glass], ['frost', sill, null]]) { g.applyMatrix4(F); acc.add(k, at(g), c); }
  };
  const ww = Math.min(0.42, w * 0.2), wh = ww * 1.3, rows = h > 2.6 ? 2 : 1;
  for (let r = 0; r < rows; r++) { const cy = rows === 1 ? h * 0.55 : h * (0.32 + r * 0.38); for (const cx of [-w * 0.27, w * 0.27]) { win(cx, cy, ww, wh, 'f'); if (lod === 0) win(cx, cy, ww, wh, 'b'); } if (lod === 0) for (const cz of d > 2.6 ? [-d * 0.25, d * 0.25] : [0]) { win(cz, cy, ww, wh, 'r'); win(cz, cy, ww, wh, 'l'); } }
  win(0, h + rh * 0.38, ww * 0.8, ww * 0.8, 'f');
  // 扉：チョコの板に、アイシングのアーチ
  if (o.door) { const dw = 0.5, dh = Math.min(1.0, h * 0.42), door = new THREE.BoxGeometry(dw, dh, 0.06).translate(0, dh / 2, d / 2 + bev + 0.02); acc.add('choco', at(door)); acc.add('icing', at(piped([new THREE.Vector3(-dw / 2 - 0.04, 0, d / 2 + bev + 0.06), new THREE.Vector3(-dw / 2 - 0.04, dh, d / 2 + bev + 0.06), new THREE.Vector3(0, dh + 0.12, d / 2 + bev + 0.06), new THREE.Vector3(dw / 2 + 0.04, dh, d / 2 + bev + 0.06), new THREE.Vector3(dw / 2 + 0.04, 0, d / 2 + bev + 0.06)], 0.026))); }
  // 棟のガムドロップ・煙突・ペパーミント
  if (o.gum && lod < 2) { const n = Math.max(3, Math.round(d / 0.45)); for (let i = 0; i < n; i++) { const z = -d / 2 + (i + 0.5) * (d / n), gd = GUM.clone().scale(0.11, 0.11, 0.11).translate(0, top + bev + 0.12, z); acc.add('gum', at(gd), GUMC[(i + (o.seed | 0)) % GUMC.length]); } }
  if (o.chimney) { const cx = w * 0.24, cz = -d * 0.2, ch = new THREE.BoxGeometry(0.34, 0.9, 0.34).translate(cx, h + rh * 0.45 + 0.3, cz); acc.add('cookie', at(ch), o.shade); acc.add('frost', at(new THREE.CylinderGeometry(0.23, 0.2, 0.12, 10).translate(cx, h + rh * 0.45 + 0.78, cz))); }
  if (o.mint && lod < 2) { const pm = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20).rotateX(Math.PI / 2).translate(0, h + rh * 0.62, d / 2 + bev + 0.03); acc.add('mint', at(pm)); }
}

// ---------- 山：かき氷・ソフトクリーム ----------
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const SYRUP = { strawberry: '#e8243e', melon: '#5fd06a', hawaii: '#2f8cf0', lemon: '#ffe14a', grape: '#9a4ad8' };
// かき氷の山：丸く盛った氷のつぶ（大小のでこぼこ）。上から色のシロップがしみて、筋になって垂れる
export function kakigori(R, H, syrup, seed = 1) {
  const prof = []; for (let i = 0; i <= 28; i++) { const t = i / 28, y = H * t; prof.push(new THREE.Vector2(Math.max(0.001, R * Math.pow(1 - Math.pow(t, 1.7), 0.55)), y)); }
  const g = new THREE.LatheGeometry(prof, 48), p = g.attributes.position, col = new Float32Array(p.count * 3), sc = new THREE.Color(SYRUP[syrup] || syrup), ice = new THREE.Color('#eef4ff');
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ang = Math.atan2(z, x), t = y / H, r = Math.hypot(x, z);
    const bump = (vnoise(ang * 6 + seed, t * 9) - 0.5) * 0.09 + (vnoise(ang * 24 + seed * 3, t * 30) - 0.5) * 0.035; const k = r > 0.01 ? 1 + bump : 1; p.setX(i, x * k); p.setZ(i, z * k); p.setY(i, y + bump * H * 0.15 * (1 - t));
    const drip = 0.55 - 0.32 * Math.pow(Math.max(0, Math.sin(ang * 7 + seed) * 0.5 + 0.5 * vnoise(ang * 3, seed)), 2), cov = THREE.MathUtils.smoothstep(t, drip - 0.06, drip + 0.08), c = ice.clone().lerp(sc, cov * 0.92).multiplyScalar(0.92 + vnoise(ang * 40, t * 60) * 0.16);
    col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
// ソフトクリームの山：絞り口の筋（8本）のある太い管が、細くなりながら3回半うずを巻いて、先がくるり
export function softServe(R, H, colA, colB = null, turns = 3.4) {
  const RS = 14, N = 150, pos = [], col = [], idx = [], ca = new THREE.Color(colA), cb = new THREE.Color(colB || colA);
  for (let i = 0; i <= N; i++) { const t = i / N, th = t * turns * TAU, rc = R * 0.62 * (1 - t * 0.92), y = H * (0.08 + 0.78 * Math.pow(t, 0.85)) + (t > 0.94 ? (t - 0.94) * H * 2.2 : 0), rt = R * 0.42 * (1 - t * 0.78) + 0.02 * R;
    const cx = Math.cos(th) * rc, cz = Math.sin(th) * rc, tx = -Math.sin(th), tz = Math.cos(th), mix = colB ? 0.5 + 0.5 * Math.sin(th * 0.5) : 0, c = ca.clone().lerp(cb, mix);
    for (let j = 0; j <= RS; j++) { const ph = (j / RS) * TAU, rr = rt * (1 + 0.07 * Math.sin(ph * 8)), nx = Math.cos(th) * Math.cos(ph), ny = Math.sin(ph), nz = Math.sin(th) * Math.cos(ph); pos.push(cx + nx * rr, y + ny * rr * 0.85, cz + nz * rr); const sh = 0.9 + 0.1 * Math.sin(ph * 8); col.push(c.r * sh, c.g * sh, c.b * sh); }
    if (i < N) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + RS + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  const core = new THREE.ConeGeometry(R * 0.72, H * 0.8, 24).translate(0, H * 0.4, 0), cc = new Float32Array(core.attributes.position.count * 3); for (let i = 0; i < cc.length; i += 3) cc.set([ca.r * 0.85, ca.g * 0.85, ca.b * 0.85], i); core.setAttribute('color', new THREE.BufferAttribute(cc, 3));
  return [g, core];
}

// ---------- ジンジャークッキーの住人：形を細かく割り、肩・股から先をぐにょりと曲げる ----------
// 外形（身長1・横は±0.42）。dress＝スカート
export function gbOutline(dress = false) {
  const R = [], quad = (a, c, b, n = 6) => { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; R.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } }, arc = (cx, cy, r, a0, a1, n = 8) => { for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; R.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  R.push([0.075, 0.195]); quad([0.075, 0.195], [0.12, 0.17], [0.2, 0.16]); R.push([0.31, 0.138]); arc(0.32, 0.07, 0.068, Math.PI / 2, -Math.PI / 2); R.push([0.2, 0.004]); quad([0.2, 0.004], [0.15, 0.0], [0.15, -0.05]);
  if (dress) { quad([0.15, -0.05], [0.2, -0.16], [0.26, -0.27], 5); R.push([0.12, -0.27], [0.13, -0.29]); R.push([0.17, -0.385]); arc(0.12, -0.41, 0.06, 0.4, -2.6, 6); R.push([0.05, -0.29], [0.0, -0.285]); }
  else { R.push([0.165, -0.17], [0.235, -0.385]); arc(0.165, -0.41, 0.075, 0.35, -2.79); R.push([0.045, -0.21]); quad([0.045, -0.21], [0.02, -0.17], [0, -0.17]); }
  const right = R, left = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]), head = []; for (let i = 1; i < 24; i++) { const a = -2.05 - (i / 24) * (TAU - 0.96); head.push([Math.cos(a) * 0.17, 0.34 + Math.sin(a) * 0.17]); }
  return [...right, ...left, ...head].map(([x, y]) => new THREE.Vector2(x, y));
}
// 平たい形に厚み：表と裏は三角を細かく割る（曲げても折れ目が出ないように）。extras＝頭の後ろの飾り（おだんご・おさげ）
export function flatCookie(outline, thick = 0.09, maxEdge = 0.035, extras = []) {
  const pos = [], nrm = [], uv = [], put = (x, y, z, nx, ny, nz) => { pos.push(x, y, z); nrm.push(nx, ny, nz); uv.push((x + 0.45) / 0.9, (y + 0.55) / 1.1); };
  // 外形は左回りにそろえる（側面が外を向く）
  const capOf = (pts0, z0, half) => { const pts = THREE.ShapeUtils.isClockWise(pts0) ? pts0.slice().reverse() : pts0, tris = THREE.ShapeUtils.triangulateShape(pts, []); const out = []; const sub = (a, b, c) => { const L = [a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)], m = Math.max(...L); if (m <= maxEdge) { out.push(a, b, c); return; } if (m === L[0]) { const ab = a.clone().lerp(b, 0.5); sub(a, ab, c); sub(ab, b, c); } else if (m === L[1]) { const bc = b.clone().lerp(c, 0.5); sub(a, b, bc); sub(a, bc, c); } else { const ca = c.clone().lerp(a, 0.5); sub(a, b, ca); sub(ca, b, c); } };
    for (const [i, j, k] of tris) sub(pts[i], pts[j], pts[k]);
    // 表の三角は、手前（+z）から見て左回りに（向きが逆だと裏から照らされて黒く見えた）
    for (let i = 0; i < out.length; i += 3) { let [a, b, c] = [out[i], out[i + 1], out[i + 2]]; if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0) [b, c] = [c, b]; for (const p of [a, b, c]) put(p.x, p.y, z0 + half, 0, 0, 1); for (const p of [a, c, b]) put(p.x, p.y, z0 - half, 0, 0, -1); }
    const n = pts.length; for (let i = 0; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n], ex = q.x - p.x, ey = q.y - p.y, L = Math.hypot(ex, ey) || 1, nx = ey / L, ny = -ex / L;
      put(p.x, p.y, z0 + half, nx, ny, 0); put(q.x, q.y, z0 - half, nx, ny, 0); put(q.x, q.y, z0 + half, nx, ny, 0); put(p.x, p.y, z0 + half, nx, ny, 0); put(p.x, p.y, z0 - half, nx, ny, 0); put(q.x, q.y, z0 - half, nx, ny, 0); } };
  capOf(outline, 0, thick / 2);
  for (const [cx, cy, r] of extras) { const pts = []; for (let i = 0; i < 16; i++) pts.push(new THREE.Vector2(cx + Math.cos((i / 16) * TAU) * r, cy + Math.sin((i / 16) * TAU) * r)); capOf(pts, -0.01, thick / 2 * 0.9); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); return g;
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
  const U = { uLimb: { value: new THREE.Vector4() }, uCurl: { value: 1.4 } };
  base.onBeforeCompile = (sh) => { sh.uniforms.uLimb = U.uLimb; sh.uniforms.uCurl = U.uCurl;
    sh.vertexShader = BEND + sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n{ vec2 pv; float a = gbAng(position.xy, pv); objectNormal.xy = rot2(objectNormal.xy, a); }').replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec2 pv; float a = gbAng(position.xy, pv); transformed.xy = pv + rot2(transformed.xy - pv, a); }'); };
  base.customProgramCacheKey = () => 'gb-bend'; base.userData.U = U; return base;
}
// アイシングの顔と服（男女・老若）
export function gbFace(kind) {
  return ctex(256, 320, (g, w, h) => {
    const X = (x) => ((x + 0.45) / 0.9) * w, Y = (y) => (1 - (y + 0.55) / 1.1) * h;
    crumbs(g, w, h, '#b8692d', 1800, '95,42,12', '255,222,170');
    g.strokeStyle = g.fillStyle = '#fffaf2'; g.lineWidth = 5; g.lineCap = g.lineJoin = 'round';
    const zig = (x0, y0, x1, y1, n) => { g.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, o = (i % 2 ? 1 : -1) * 0.016; const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; i ? g.lineTo(X(x + o * 0.3), Y(y + o)) : g.moveTo(X(x), Y(y)); } g.stroke(); };
    zig(0.29, 0.13, 0.27, 0.0, 4); zig(-0.29, 0.13, -0.27, 0.0, 4);
    const dress = kind === 'woman' || kind === 'grandma' || kind === 'girl';
    if (!dress) { zig(0.11, -0.33, 0.23, -0.37, 4); zig(-0.11, -0.33, -0.23, -0.37, 4); }
    for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 6.5, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(X(0), Y(0.33), 20, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    const btn = (y, c) => { g.fillStyle = '#fffaf2'; g.beginPath(); g.arc(X(0), Y(y), 8, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(X(0), Y(y), 5.5, 0, TAU); g.fill(); g.fillStyle = '#fffaf2'; };
    if (dress) { g.beginPath(); g.moveTo(X(-0.15), Y(-0.06)); g.lineTo(X(0.15), Y(-0.06)); g.stroke(); g.beginPath(); for (let i = 0; i <= 10; i++) { const x = -0.25 + i * 0.05; g.arc(X(x), Y(-0.25), 7, Math.PI, 0, true); } g.stroke(); btn(0.08, '#e8333a'); btn(-0.01, '#2fb05a'); }
    else { btn(0.1, '#e8333a'); btn(0.0, '#2fb05a'); btn(-0.1, '#e8333a'); }
    if (kind === 'woman' || kind === 'girl') { g.fillStyle = '#ff5a8a'; g.beginPath(); g.moveTo(X(0.08), Y(0.5)); g.lineTo(X(0.2), Y(0.56)); g.lineTo(X(0.2), Y(0.44)); g.closePath(); g.fill(); g.beginPath(); g.moveTo(X(0.08), Y(0.5)); g.lineTo(X(-0.04), Y(0.56)); g.lineTo(X(-0.04), Y(0.44)); g.closePath(); g.fill(); }
    if (kind === 'grandpa') { g.lineWidth = 7; g.beginPath(); g.moveTo(X(-0.08), Y(0.29)); g.quadraticCurveTo(X(0), Y(0.33), X(0.08), Y(0.29)); g.stroke(); g.lineWidth = 4; for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 13, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(X(-0.02), Y(0.37)); g.lineTo(X(0.02), Y(0.37)); g.stroke(); }
    if (kind === 'grandma') { g.lineWidth = 4; for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 13, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(X(-0.02), Y(0.37)); g.lineTo(X(0.02), Y(0.37)); g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(X(-0.1), Y(-0.02)); g.lineTo(X(-0.12), Y(-0.2)); g.lineTo(X(0.12), Y(-0.2)); g.lineTo(X(0.1), Y(-0.02)); g.stroke(); }
    if (kind === 'boy') { g.fillStyle = '#3a7ad8'; g.beginPath(); g.arc(X(0), Y(0.42), 34, Math.PI, TAU); g.fill(); g.fillRect(X(0.02), Y(0.43), 40, 8); }
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
export function santaFace() { return ctex(256, 320, (g, w, h) => { const X = (x) => ((x + 0.45) / 0.9) * w, Y = (y) => (1 - (y + 0.55) / 1.1) * h; crumbs(g, w, h, '#b8692d', 1800, '95,42,12', '255,222,170');
  g.fillStyle = '#d8283c'; g.beginPath(); g.moveTo(X(-0.17), Y(0.42)); g.quadraticCurveTo(X(0), Y(0.72), X(0.2), Y(0.56)); g.lineTo(X(0.17), Y(0.42)); g.closePath(); g.fill(); g.fillRect(X(-0.15), Y(0.19), X(0.15) - X(-0.15), Y(-0.17) - Y(0.19));
  g.fillStyle = '#fffaf2'; g.fillRect(X(-0.19), Y(0.45), X(0.19) - X(-0.19), 12); g.beginPath(); g.arc(X(0.21), Y(0.57), 9, 0, TAU); g.fill(); g.beginPath(); g.moveTo(X(-0.12), Y(0.3)); g.quadraticCurveTo(X(0), Y(0.12), X(0.12), Y(0.3)); g.quadraticCurveTo(X(0), Y(0.22), X(-0.12), Y(0.3)); g.fill();
  for (const sx of [-1, 1]) { g.beginPath(); g.arc(X(sx * 0.06), Y(0.37), 6, 0, TAU); g.fill(); } }); }
