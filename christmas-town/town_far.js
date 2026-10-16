// 遠くに見下ろす、雪の夜の町（仮）。家の窓・街灯・広場のツリーの明かり。本物の街の全景ができたら差しかえる
// 丸い町：中心は真下（浮かぶテーブルの下）、家は半径 r0〜r1 の輪の通りと、放射の通りに沿って並ぶ（テーブルの縁の向こうに見える所に）
import * as THREE from 'three';

const glowTex = (() => { let t; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

export function makeFarTown(scene, y0 = -60, r0 = 60, r1 = 250) {
  const g = new THREE.Group(); g.position.y = y0; scene.add(g);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(620, 96), new THREE.MeshBasicMaterial({ color: '#161c30' })); ground.rotation.x = -Math.PI / 2; g.add(ground);
  // 家：箱と、雪の積もった屋根。色は北欧の家（赤・黄・青・緑・白）を暗めに
  const N = 2600, body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), N), roof = new THREE.InstancedMesh(new THREE.ConeGeometry(0.78, 0.7, 4, 1), new THREE.MeshBasicMaterial({ color: '#262c40' }), N);
  const cols = ['#2a1416', '#2e2814', '#141a2a', '#14221c', '#24242a', '#2e1a14'].map((c) => new THREE.Color(c)), m = new THREE.Matrix4(), q = new THREE.Quaternion(), win = [], winCol = [];
  let n = 0;
  const RINGS = Math.floor((r1 - r0) / 14);
  for (let ring = 0; ring < RINGS && n < N; ring++) { const R = r0 + ring * 14, cnt = Math.floor((2 * Math.PI * R) / 8), big = 1 + (R - r0) / 260;
    for (let k = 0; k < cnt && n < N; k++) { const a = (k / cnt) * Math.PI * 2 + ring * 0.37; if (Math.abs(Math.sin(a * 3)) < 0.08) continue;   // 放射の通り（家を置かない）
      const r = R + (rnd() - 0.5) * 3, x = Math.cos(a) * r, z = Math.sin(a) * r, w = (3 + rnd() * 2.5) * big, h = (3 + rnd() * 4) * big, d = (3 + rnd() * 2) * big;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a + Math.PI / 2); m.compose(new THREE.Vector3(x, h / 2, z), q, new THREE.Vector3(w, h, d)); body.setMatrixAt(n, m); body.setColorAt(n, cols[(rnd() * cols.length) | 0]);
      const q2 = q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4)); m.compose(new THREE.Vector3(x, h + w * 0.35, z), q2, new THREE.Vector3(w, w * 1.1, d * 1.4)); roof.setMatrixAt(n, m);
      for (let j = 0; j < 3; j++) if (rnd() < 0.85) { const ox = (rnd() - 0.5) * w * 0.6; win.push(x + Math.cos(a) * (d / 2 + 0.1) - Math.sin(a) * ox, h * (0.35 + rnd() * 0.3), z + Math.sin(a) * (d / 2 + 0.1) + Math.cos(a) * ox); winCol.push(1, 0.72 + rnd() * 0.15, 0.4); }
      n++; } }
  body.count = roof.count = n; body.instanceColor.needsUpdate = true; g.add(body, roof);
  // 街灯（輪の通りに沿って）と、広場のツリー
  for (let ring = 0; ring < RINGS; ring++) { const R = r0 - 6 + ring * 14, cnt = Math.floor((2 * Math.PI * R) / 10); for (let k = 0; k < cnt; k++) { const a = (k / cnt) * Math.PI * 2; win.push(Math.cos(a) * R, 1.5, Math.sin(a) * R); winCol.push(1, 0.85, 0.6); } }
  const trees = [[90, 40, 7], [-80, 95, 7], [30, -120, 7], [-150, -60, 8], [170, -30, 8], [-20, 200, 9], [120, 160, 8]];
  for (const [x, z, s] of trees) { const t = new THREE.Mesh(new THREE.ConeGeometry(s, s * 3, 8), new THREE.MeshBasicMaterial({ color: '#1e4a32' })); t.position.set(x, s * 1.5, z); g.add(t);
    for (let k = 0; k < 24; k++) { const hh = rnd(), rr = s * (1 - hh) * 0.95, a = rnd() * Math.PI * 2; win.push(x + Math.cos(a) * rr, hh * s * 3, z + Math.sin(a) * rr); winCol.push(...[[1, 0.3, 0.3], [1, 0.85, 0.3], [0.4, 0.7, 1], [1, 1, 1]][k % 4]); }
    win.push(x, s * 3.1, z); winCol.push(1, 0.95, 0.5); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(win, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(winCol, 3));
  g.add(new THREE.Points(pg, new THREE.PointsMaterial({ map: glowTex(), size: 7, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })));
  // 町全体の、ぼんやりした温かい明かり
  const haze = new THREE.Mesh(new THREE.RingGeometry(r0 - 10, r1 + 10, 64), new THREE.MeshBasicMaterial({ color: '#ffb070', transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending })); haze.rotation.x = -Math.PI / 2; haze.position.y = 0.5; g.add(haze);
  return g;
}
