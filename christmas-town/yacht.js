// 本物らしいヨット（本人 2026-10-16「船はもう少し本物っぽいリッチなヨットに」）
// 白いつやの船体（船首は細く、船尾は平らなトランサム・紺の線と、水の下は赤い船底塗料）・チークの甲板・キャビン（窓に灯り）・アルミのマスト・ブーム
// 停泊中は帆にカバー（紺）。帆走中は主帆とジブ（ふくらみのある帆）。索具（ステー・シュラウド・手すり）・航海灯（左舷が赤・右舷が緑）・マスト頭の白い灯り
// 祝いの灯り（ステーにそって色の電球）は Points で返す（光の波が通ると虹色にする）
import * as THREE from 'three';

const TAU = Math.PI * 2, SS = THREE.MathUtils.smoothstep;
let MAT = null;
function mats(env) {
  if (MAT) return MAT;
  const teak = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#b07a44'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 16; i++) { g.fillStyle = `hsl(${26 + Math.random() * 6},${45 + Math.random() * 10}%,${42 + Math.random() * 10}%)`; g.fillRect(0, i * 16 + 1, 256, 13); for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(70,40,15,.25)'; g.fillRect(Math.random() * 256, i * 16 + 1 + Math.random() * 13, 20 + Math.random() * 40, 1); } }
    g.fillStyle = '#2a1a0e'; for (let i = 0; i <= 16; i++) g.fillRect(0, i * 16 - 1, 256, 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; })();
  const sail = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#f7f2e6'; g.fillRect(0, 0, 64, 256); g.fillStyle = 'rgba(160,150,130,.4)'; for (let i = 1; i < 10; i++) g.fillRect(0, i * 25.6, 64, 1.5); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const E = (o) => Object.assign(o, env ? { envMap: env } : {});
  MAT = {
    hull: new THREE.MeshPhysicalMaterial(E({ vertexColors: true, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.1, side: THREE.DoubleSide })),
    deck: new THREE.MeshStandardMaterial({ map: teak, roughness: 0.6 }),
    white: new THREE.MeshPhysicalMaterial(E({ color: '#f4f6f8', roughness: 0.25, clearcoat: 0.8, envMapIntensity: 0.9 })),
    win: new THREE.MeshStandardMaterial({ color: '#2a2018', emissive: '#ffbf70', emissiveIntensity: 0.9, roughness: 0.2 }),
    metal: new THREE.MeshStandardMaterial(E({ color: '#d6dbe2', metalness: 1, roughness: 0.3, envMapIntensity: 1.2 })),
    cover: new THREE.MeshStandardMaterial({ color: '#1c2c5a', roughness: 0.8 }),
    sail: new THREE.MeshStandardMaterial({ map: sail, roughness: 0.85, side: THREE.DoubleSide, emissive: '#2a3448', emissiveIntensity: 0.35 }),
    rope: new THREE.LineBasicMaterial({ color: '#5a6070', transparent: true, opacity: 0.7 }),
  };
  return MAT;
}
// 同じ材質の部品を1つの形に（描く回数を減らす）
function merge(gs) { const ps = gs.map((g) => (g.index ? g.toNonIndexed() : g)), n = ps.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2); let o = 0;
  for (const g of ps) { const k = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nrm.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2); o += k; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g; }
// 船体：船首から船尾へ断面を並べる（甲板のふち→竜骨）。u＝前後（−1 船尾・1 船首）、s＝ふちから竜骨まで
function hullGeo(L, B) {
  const NS = 40, NJ = 10, half = (u) => (B / 2) * Math.pow(Math.max(0, 1 - Math.pow((u + 1) / 2, 3.2)), 0.62) * (0.82 + 0.18 * SS(u, -1, -0.4)),
    sheer = (u) => 0.72 + 0.12 * u * u + 0.14 * Math.max(0, u) ** 2, draft = (u) => 0.5 * Math.sqrt(Math.max(0, 1 - u * u)) + 0.04;
  const pos = [], col = [], idx = [], C = (y, yS) => (y > yS - 0.12 && y < yS - 0.04 ? [0.1, 0.16, 0.36] : y < 0.06 ? (y > 0.0 ? [0.95, 0.95, 0.95] : [0.55, 0.08, 0.1]) : [0.97, 0.97, 0.96]);
  for (const side of [1, -1]) { const base = pos.length / 3;
    for (let i = 0; i <= NS; i++) { const u = -1 + (2 * i) / NS, x = (u * L) / 2, w = half(u), yS = sheer(u), dr = draft(u);
      for (let j = 0; j <= NJ; j++) { const s = j / NJ, z = side * w * Math.pow(1 - s, 0.75), y = yS - (yS + dr) * Math.pow(s, 1.4); pos.push(x, y, z); col.push(...C(y, yS)); } }
    for (let i = 0; i < NS; i++) for (let j = 0; j < NJ; j++) { const a = base + i * (NJ + 1) + j, b = a + NJ + 1; if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1); else idx.push(a, a + 1, b, b, a + 1, b + 1); } }
  // トランサム（船尾の平らな板）
  const tb = pos.length / 3, u0 = -1, w0 = half(u0), y0 = sheer(u0), d0 = draft(u0); pos.push(-L / 2, (y0 - d0) / 2, 0); col.push(0.97, 0.97, 0.96);
  for (let j = 0; j <= 2 * 10; j++) { const s = j <= 10 ? j / 10 : (20 - j) / 10, sd = j <= 10 ? 1 : -1, z = sd * w0 * Math.pow(1 - s, 0.75), y = y0 - (y0 + d0) * Math.pow(s, 1.4); pos.push(-L / 2, y, z); col.push(...C(y, y0)); }
  for (let j = 0; j < 20; j++) idx.push(tb, tb + 2 + j, tb + 1 + j);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  // 甲板：ふちの線の内側。面は上向きに巻く（下向きだと、上から見た時に甲板が消えて、船の中に海面が見え、浸水したように見えた）
  const dp = [], du = [], di = []; for (let i = 0; i <= NS; i++) { const u = -1 + (2 * i) / NS, x = (u * L) / 2, w = half(u) * 0.97, y = sheer(u) - 0.02; dp.push(x, y, w, x, y, -w); du.push(x * 0.8, w * 0.8, x * 0.8, -w * 0.8); if (i < NS) { const a = i * 2; di.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const d = new THREE.BufferGeometry(); d.setAttribute('position', new THREE.Float32BufferAttribute(dp, 3)); d.setAttribute('uv', new THREE.Float32BufferAttribute(du, 2)); d.setIndex(di); d.computeVertexNormals();
  return { hull: g, deck: d, half, sheer };
}
// 帆：三角を細かく割り、風でふくらませる（a＝付け根の下・b＝てっぺん・c＝後ろの角）
function sailGeo(a, b, c, bulge) {
  const n = 10, pos = [], uv = [], idx = [], P = (s, t) => { const p = a.clone().lerp(b, t).lerp(c.clone().lerp(b, t), s * (1 - t) > 0 ? s : 0); const k = Math.sin(Math.PI * s) * (1 - t * 0.7) * bulge; return [p.x, p.y, p.z + k]; };
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const t = i / n, s = j / n; pos.push(...P(s, t)); uv.push(s, t); }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const q = i * (n + 1) + j, r = q + n + 1; idx.push(q, q + 1, r, r, q + 1, r + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// o＝{ L, B, mastH, sailing, env, glowTex }。船首は +x。原点は水面
export function makeYacht(o = {}) {
  const L = o.L || 7, B = o.B || 2.5, H = o.mastH || 9, M = mats(o.env), g = new THREE.Group(), { hull, deck, sheer } = hullGeo(L, B);
  g.add(new THREE.Mesh(hull, M.hull), new THREE.Mesh(deck, M.deck));
  // キャビン：角の丸い白い箱、まわりに窓の帯（灯りがともる）
  const cab = new THREE.Mesh(new THREE.CapsuleGeometry(B * 0.27, L * 0.24, 4, 12).rotateZ(Math.PI / 2).scale(1, 0.55, 1), M.white); cab.position.set(-L * 0.04, sheer(0) + 0.2, 0); g.add(cab);
  const w = new THREE.Mesh(new THREE.BoxGeometry(L * 0.26, 0.09, B * 0.54 + 0.02), M.win); w.position.set(-L * 0.04, sheer(0) + 0.26, 0); g.add(w);   // 窓の帯（両舷を1つの箱で）
  // マスト・ブーム
  const mx = L * 0.12, mastY = sheer(0) + 0.05, top = new THREE.Vector3(mx, mastY + H, 0);
  const boomL = L * 0.45, boomY = mastY + 1.05; g.add(new THREE.Mesh(merge([new THREE.CylinderGeometry(0.045, 0.06, H, 10).translate(mx, mastY + H / 2, 0), new THREE.CylinderGeometry(0.04, 0.04, boomL, 8).rotateZ(Math.PI / 2).translate(mx - boomL / 2, boomY, 0)]), M.metal));
  const bowP = new THREE.Vector3(L / 2 - 0.05, sheer(1) + 0.02, 0), sternP = new THREE.Vector3(-L / 2 + 0.1, sheer(-1) + 0.05, 0);
  let sails = null;
  if (o.sailing) { sails = new THREE.Mesh(merge([sailGeo(new THREE.Vector3(mx - 0.05, boomY + 0.05, 0), new THREE.Vector3(mx - 0.05, mastY + H * 0.97, 0), new THREE.Vector3(mx - boomL, boomY + 0.05, 0), 0.35), sailGeo(bowP.clone().setY(bowP.y + 0.1), new THREE.Vector3(mx + 0.05, mastY + H * 0.82, 0), new THREE.Vector3(mx - 0.4, mastY + 0.6, 0), 0.3)]), M.sail); g.add(sails);
  } else { const cov = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, boomL * 0.8, 4, 8).rotateZ(Math.PI / 2), M.cover); cov.position.set(mx - boomL * 0.45, boomY + 0.12, 0); g.add(cov); }
  // 索具：前と後ろのステー・両舷のシュラウド・手すり（支柱つき）・船首のパルピット
  const rp = [], line = (p, q) => rp.push(p.x, p.y, p.z, q.x, q.y, q.z);
  line(top, bowP); line(top, sternP); for (const sd of [1, -1]) line(top.clone().setY(mastY + H * 0.85), new THREE.Vector3(mx, sheer(0) + 0.02, sd * B * 0.46));
  for (const sd of [1, -1]) { let prev = null; for (let i = 0; i <= 8; i++) { const u = -0.9 + i * 0.2, x = (u * L) / 2, w = (B / 2) * Math.pow(Math.max(0, 1 - Math.pow((u + 1) / 2, 3.2)), 0.62) * (0.82 + 0.18 * SS(u, -1, -0.4)) * 0.94, y = sheer(u), p = new THREE.Vector3(x, y + 0.55, sd * w); line(new THREE.Vector3(x, y, sd * w), p); if (prev) line(prev, p); prev = p; } }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); g.add(new THREE.LineSegments(rg, M.rope));
  // 灯り：祝いの電球（ステーにそって）・マスト頭の白・航海灯
  const lp = [], lc = [], base = []; for (const end of [bowP, sternP]) for (let i = 1; i < 11; i++) { const t = i / 11, p = top.clone().lerp(end, t); lp.push(p.x, p.y, p.z); const c = new THREE.Color().setHSL(((i + lp.length) % 5) / 5, 0.9, 0.62); lc.push(c.r, c.g, c.b); base.push(c.clone()); }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.Float32BufferAttribute(lc, 3));
  const pts = new THREE.Points(lg, new THREE.PointsMaterial({ map: o.glowTex, size: 0.42, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); g.add(pts);
  // マスト頭の白・航海灯・窓のにじみ（1つの点の集まりで）
  const NL = [['#fff4d8', top.clone().setY(top.y + 0.1)], ['#ff3040', new THREE.Vector3(L * 0.32, sheer(0.64) + 0.1, B * 0.3)], ['#30ff70', new THREE.Vector3(L * 0.32, sheer(0.64) + 0.1, -B * 0.3)], ['#ffbf70', new THREE.Vector3(-L * 0.04, sheer(0) + 0.26, B * 0.3)], ['#ffbf70', new THREE.Vector3(-L * 0.04, sheer(0) + 0.26, -B * 0.3)]];
  const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(NL.flatMap(([, p]) => [p.x, p.y, p.z]), 3)); ng.setAttribute('color', new THREE.Float32BufferAttribute(NL.flatMap(([c]) => new THREE.Color(c).toArray()), 3));
  g.add(new THREE.Points(ng, new THREE.PointsMaterial({ map: o.glowTex, size: 0.7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  return { g, pts, base, top, sails };
}
