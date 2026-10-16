// グミの形を面に起こして置く：buildType（種類ごとに1回・部品ごとに形のある範囲だけ細かく）と instantiate（色・芯・外の膜・奥行きだけの膜）
import * as THREE from 'three';
import { surfaceNetsSteps, boundsOf } from './soft.js';
import { gummy, gel } from './mat.js';

// 面に起こす（種類ごとに1回）。部品ごとに、形のある範囲だけを細かく
const toGeo = (m) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3)); if (m.col) g.setAttribute('color', new THREE.BufferAttribute(m.col, 3)); g.setIndex(new THREE.BufferAttribute(m.idx, 1)); g.computeBoundingSphere(); return g; };
// 部品を1つ作るごとに一息つく形（重い作り直しを、何コマかに分けられる）。reuse(p)＝作り直さずに使い回す部品・hint(p)＝形のある範囲（分かっていれば、探さない）
export function* buildTypeSteps(spec, cell = 0.05, reuse = null, hint = null) {
  const B0 = spec.B0 || [-1.35, -1.5, -1.0], B1 = spec.B1 || [1.35, 1.5, 1.0];
  const parts = [];
  for (const p of spec.parts) {
    const r = reuse && reuse(p); if (r) { parts.push(r); continue; }
    const bb = (hint && hint(p)) || boundsOf(p.f, B0, B1); if (!bb) continue;
    const n = [0, 1, 2].map((a) => Math.max(4, Math.ceil((bb[1][a] - bb[0][a]) / cell)));
    const m = yield* surfaceNetsSteps(p.f, bb[0], bb[1], n, p.vc); let core = null;
    if (p.core) { const off = p.coreOff ?? 0.12, fc = (x, y, z) => p.f(x, y, z) + off, cb = hint ? bb : boundsOf(fc, bb[0], bb[1]); if (cb) core = yield* surfaceNetsSteps(fc, cb[0], cb[1], [0, 1, 2].map((a) => Math.max(4, Math.ceil((cb[1][a] - cb[0][a]) / (cell * 2))))); }
    parts.push({ p, m, core, bb, geo: toGeo(m), coreGeo: core && toGeo(core) }); yield;
  }
  const fAll = (x, y, z) => { let d = 1e9; for (const p of spec.parts) d = Math.min(d, p.f(x, y, z)); return d; };
  return { spec, parts, fAll, B0, B1 };
}
export function buildType(spec, cell = 0.05, reuse = null, hint = null) { const g = buildTypeSteps(spec, cell, reuse, hint); let r = g.next(); while (!r.done) r = g.next(); return r.value; }
// 置く：部品ごとの材質（色の違いは variants から）。
// 重ねる順＝芯 → 外の膜の「奥行きだけ」（色は塗らない）→ 外の膜。いちばん手前の膜だけが見え、部品どうしの内側の重なり（球の集まりに見えた）が消える。
// 同じ群れの中は、作った順に描かれる（位置が同じなので、並べ替えでは id の順になる）
const DEPTH = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, transparent: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
export function instantiate(type, variant) {
  const g = new THREE.Group(), meshes = [], cores = [], outers = [];
  for (const q of type.parts) {
    const col = q.p.main ? variant || type.spec.variants[0] : q.p.c;
    if (q.p.solid) { const m = new THREE.Mesh(q.geo, gel(col, { gl: 0.2, env: 1.2 })); g.add(m); meshes.push({ m, q, kind: 'o' }); continue; }
    const mt = gummy(q.p.vc ? '#ffffff' : col, q.p.emit ? { gl: 3, opacity: 0.85 } : q.p.vc ? { vc: true, glow: '#ffd0d8' } : {});
    if (q.coreGeo) cores.push({ q, mat: mt.core });
    outers.push({ q, mat: mt.outer, col });
  }
  for (const c of cores) { const m = new THREE.Mesh(c.q.coreGeo, c.mat); g.add(m); meshes.push({ m, q: c.q, kind: 'c' }); }
  const twins = outers.map((o) => { const m = new THREE.Mesh(o.q.geo, DEPTH); g.add(m); return m; });
  outers.forEach((o, i) => { const m = new THREE.Mesh(o.q.geo, o.mat); g.add(m); meshes.push({ m, q: o.q, kind: 'o', twin: twins[i], col: o.col }); });
  g.userData.meshes = meshes; g.userData.color = outers.length ? outers[0].col : '#ffffff'; return g;
}
