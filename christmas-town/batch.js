// 動く物（ヨット・名所・ぷよ…）の部品も、同じ材質なら町じゅうで1回にまとめて描く（描く回数＝重さ。安いタブレットで効く）
// ・面（Mesh）は three の BatchedMesh へ。部品ごとの行列は、元の部品の世界の行列を、毎コマ描く直前に写す
// ・点（Points）と線（LineSegments）は、世界の座標に直して1つの形へ毎コマ書き写す（数が少ないので、CPU で足りる）
// 元の部品は「描かない層」（HIDDEN）へ移して残す。形・行列・見える／見えないの切り替え・当たり判定（光線は HIDDEN 層も見る）は、元の部品のまま動く
// 半透明の面は束ねない（奥から順に描く順が、束ねた1つの位置で決まってしまい、水そうのグミが殻の奥に沈んだ）。ただし材質に userData.batchT がある物は束ねる
//   ＝描く順を renderOrder で分けてある物（ぷよの芯＝1・体＝2）。ほかの半透明と奥行きで混ざらないので、束ねても順が崩れない
// ・板の光（Sprite）は、同じ絵・同じ混ぜ方の物を、並べて描く1つの板（InstancedMesh）へ。毎コマ、元の板の位置・大きさ・色・濃さ・回転を写す（addSprites）
// 束ねないもの：材質を使う部品が1つだけ（部品ごとの値を持つ材質＝クッキーの手足などは、ここで自然に外れる）・自前のシェーダー・頂点を毎コマ書きかえる部品（skip で外す）
// シェーダーで世界の位置を modelMatrix から作る材質は、USE_BATCHING の時に batchingMatrix も掛けること（共通/sweets.js の biteable）
import * as THREE from 'three';

export const HIDDEN = 30;
const NO_HIT = () => {};
// 同じ材質を、束ねた物と束ねていない物（家並み・並べて描く物）が両方使うと、three は描くたびにシェーダーを選び直す（毎コマ getParameters。束ねて減らした分を食った）
// そこで、束ねる側には写しの材質を持たせる。シェーダーの差し込みと値（uniforms）は元と同じ物を使い、色・明るさ・濃さなどの変化は、毎コマ元から写す
export function twin(a) { const b = a.clone(); b.onBeforeCompile = a.onBeforeCompile; b.customProgramCacheKey = a.customProgramCacheKey; b.userData = a.userData; b.__src = a; b.__srcV = a.version; return b; }
export function follow(b) { const a = b.__src; if (a.version !== b.__srcV) { b.__srcV = a.version; b.needsUpdate = true; }
  if (a.color) b.color.copy(a.color); if (a.emissive) { b.emissive.copy(a.emissive); b.emissiveIntensity = a.emissiveIntensity; } b.opacity = a.opacity; b.visible = a.visible; if (b.map !== a.map) { b.map = a.map; b.needsUpdate = true; } }

function visibleChain(o, root) { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === root) return true; } return false; }   // 場面から外された部品は描かない
function canMesh(o) { const m = o.material;
  return o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && !o.isBatchedMesh && m && !Array.isArray(m) && !m.isShaderMaterial && !m.userData.noBatch && (!m.transparent || m.userData.batchT)
    && !Object.prototype.hasOwnProperty.call(o, 'onBeforeRender') && !Object.keys(o.geometry.morphAttributes).length && o.layers.isEnabled(0); }
function canDots(o) { const m = o.material; return (o.isPoints || o.isLineSegments) && m && !Array.isArray(m) && !m.isShaderMaterial && !m.userData.noBatch && o.layers.isEnabled(0); }
const dotKey = (o) => { const m = o.material, add = m.blending === THREE.AdditiveBlending;
  return [o.isPoints ? 'P' : 'L', m.type, m.map ? m.map.uuid : '-', m.blending, m.transparent, m.depthWrite, m.depthTest, m.vertexColors, m.sizeAttenuation, o.renderOrder, add ? '' : m.color.getHexString() + m.opacity, o.isPoints ? '' : m.uuid].join('|'); };

// 1つの材質にまとめる部品の形をそろえる（属性の顔ぶれ・型・番号の有無が同じでないと、BatchedMesh に入らない）
function unify(geos) {
  const spec = new Map();
  for (const g of geos) for (const [k, a] of Object.entries(g.attributes)) if (!spec.has(k)) spec.set(k, { size: a.itemSize, norm: a.normalized });
  return geos.map((g) => { const out = new THREE.BufferGeometry(), n = g.attributes.position.count;
    for (const [k, s] of spec) { const a = g.attributes[k], arr = new Float32Array(n * s.size);
      if (a) for (let i = 0; i < n; i++) for (let c = 0; c < s.size; c++) arr[i * s.size + c] = c === 0 ? a.getX(i) : c === 1 ? a.getY(i) : c === 2 ? a.getZ(i) : a.getW(i);   // 交互に詰めた属性でも読めるように
      else if (k === 'color') arr.fill(1);
      out.setAttribute(k, new THREE.BufferAttribute(arr, s.size, s.norm)); }
    if (g.index) out.setIndex(Array.from(g.index.array)); else out.setIndex([...Array(n).keys()]);
    return out; });
}

export class Batcher {
  constructor(scene) { this.scene = scene; this.items = []; this.dots = []; this.meshes = []; this.hidden = []; this.twins = []; this.sprites = [];
    const prev = scene.onBeforeRender; scene.onBeforeRender = (...a) => { prev.apply(scene, a); this.sync(); };   // 行列が更新された後・描く物を集める前
  }
  // roots の下の部品を束ねる。skip(o) が真の部品（とその下）は束ねない
  add(roots, skip = () => false) {
    const byMat = new Map(), byDot = new Map();
    const walk = (o) => { if (skip(o)) return;
      if (canMesh(o)) (byMat.get(o.material) || byMat.set(o.material, []).get(o.material)).push(o);
      else if (canDots(o)) { const k = dotKey(o); (byDot.get(k) || byDot.set(k, []).get(k)).push(o); }
      for (const c of o.children) walk(c); };
    for (const r of roots) { r.updateMatrixWorld(true); walk(r); }
    for (const [mat, list] of byMat) { if (list.length < 2) continue;
      const geos = unify(list.map((o) => o.geometry)), nv = geos.reduce((s, g) => s + g.attributes.position.count, 0), ni = geos.reduce((s, g) => s + g.index.count, 0);
      const tw = twin(mat); this.twins.push(tw); const bm = new THREE.BatchedMesh(list.length, nv, ni, tw); bm.frustumCulled = false; bm.sortObjects = !!mat.transparent; bm.raycast = NO_HIT; bm.renderOrder = list[0].renderOrder; bm.userData.batch = true;
      list.forEach((o, i) => { const id = bm.addGeometry(geos[i]); bm.setMatrixAt(id, o.matrixWorld); this.items.push({ bm, id, o, vis: true, last: Float32Array.from(o.matrixWorld.elements) }); o.layers.set(HIDDEN); this.hidden.push(o); });
      this.scene.add(bm); this.meshes.push(bm); }
    for (const list of byDot.values()) { if (list.length < 2) continue; this.dots.push(this.mergeDots(list)); }
    return this;
  }
  // 点・線：世界の座標の1つの形。点の大きさは部品ごとに違ってよい（aSize＝元の大きさの比）。光を足し合わせる点は、材質の色と濃さを頂点の色へ
  mergeDots(list) {
    const o0 = list[0], m0 = o0.material, add = m0.blending === THREE.AdditiveBlending, n = list.reduce((s, o) => s + o.geometry.attributes.position.count, 0);
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 3).fill(1), siz = new Float32Array(n).fill(1);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); if (o0.isPoints) g.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
    const m = m0.clone(); m.vertexColors = true; if (add) { m.color.set('#ffffff'); m.opacity = 1; }
    if (o0.isPoints) { m.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float aSize;\n' + sh.vertexShader.replace('gl_PointSize = size;', 'gl_PointSize = size * aSize;'); }; m.customProgramCacheKey = () => 'batch-dots'; }
    const obj = o0.isPoints ? new THREE.Points(g, m) : new THREE.LineSegments(g, m); obj.frustumCulled = false; obj.renderOrder = o0.renderOrder; obj.raycast = NO_HIT; obj.userData.batch = true;
    for (const o of list) { o.layers.set(HIDDEN); this.hidden.push(o); }
    this.scene.add(obj); return { obj, list, base: m0.size || 1, add };
  }
  sync() {
    for (const b of this.twins) follow(b);
    for (const it of this.items) { const vis = visibleChain(it.o, this.scene); if (vis !== it.vis) { it.bm.setVisibleAt(it.id, vis); it.vis = vis; } if (!vis) continue;
      const e = it.o.matrixWorld.elements, l = it.last; for (let k = 0; k < 16; k++) if (e[k] !== l[k]) { it.bm.setMatrixAt(it.id, it.o.matrixWorld); l.set(e); break; } }
    const v = new THREE.Vector3(), c = new THREE.Color();
    for (const D of this.dots) { const g = D.obj.geometry, P = g.attributes.position.array, C = g.attributes.color.array, S = g.attributes.aSize ? g.attributes.aSize.array : null; let j = 0;
      for (const o of D.list) { const src = o.geometry.attributes, n = src.position.count, vis = visibleChain(o, this.scene), mm = o.material, sc = vis ? (mm.size || 1) / D.base : 0;
        if (D.add) c.copy(mm.color).multiplyScalar(mm.opacity); else c.setRGB(1, 1, 1);   // 足し合わせない線は、色を材質に残す（頂点にも入れると2回掛かって暗くなった）
        for (let i = 0; i < n; i++, j++) { if (vis) v.fromBufferAttribute(src.position, i).applyMatrix4(o.matrixWorld); else v.set(0, -1e4, 0); P[j * 3] = v.x; P[j * 3 + 1] = v.y; P[j * 3 + 2] = v.z;
          if (mm.vertexColors && src.color) { C[j * 3] = src.color.getX(i) * c.r; C[j * 3 + 1] = src.color.getY(i) * c.g; C[j * 3 + 2] = src.color.getZ(i) * c.b; } else { C[j * 3] = c.r; C[j * 3 + 1] = c.g; C[j * 3 + 2] = c.b; }
          if (S) S[j] = sc; } }
      g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; if (S) g.attributes.aSize.needsUpdate = true; }
    const p = new THREE.Vector3(), sc = new THREE.Vector3(), q = new THREE.Quaternion();
    for (const G of this.sprites) { const { aC, aS, aK } = G.A;
      G.list.forEach((s, i) => { const vis = visibleChain(s, this.scene), m = s.material; s.matrixWorld.decompose(p, q, sc);
        aC.setXYZ(i, p.x, p.y, p.z); aS.setXYZ(i, vis ? sc.x : 0, vis ? sc.y : 0, m.rotation); aK.setXYZW(i, m.color.r, m.color.g, m.color.b, m.opacity); });
      aC.needsUpdate = aS.needsUpdate = aK.needsUpdate = true; }
  }
  // 束ねるのをやめて、元の部品で描く（見比べ・不具合の切り分け用）
  setEnabled(on) { for (const o of this.hidden) on ? o.layers.set(HIDDEN) : o.layers.set(0); for (const m of this.meshes) m.visible = on; for (const D of this.dots) D.obj.visible = on; for (const G of this.sprites) G.obj.visible = on; this.on = on; }
  // 板の光をまとめる。混ぜ方・奥行きの扱い・大きさの扱い・描く順・絵が同じ物を1つに（札のように絵がちがう物は、絵を1枚に並べて貼る）
  // 光（足し合わせ）は、ほかの半透明（ぷよ・水そう）より後に描く（renderOrder 3）。1つの位置で並べ替えると、手前の光まで殻に隠れるので
  addSprites(list) {
    const groups = new Map();
    for (const s of list) { const m = s.material; if (!s.isSprite || !m.map || !m.map.image || !s.layers.isEnabled(0)) continue;
      const add = m.blending === THREE.AdditiveBlending, k = [m.blending, m.depthTest, m.depthWrite, m.sizeAttenuation, m.fog, s.renderOrder, add ? m.map.uuid : 'atlas'].join('|');
      (groups.get(k) || groups.set(k, []).get(k)).push(s); }
    for (const list2 of groups.values()) { if (list2.length < 2) continue; this.sprites.push(this.spriteGroup(list2)); }
    return this;
  }
  spriteGroup(list) {
    const m0 = list[0].material, add = m0.blending === THREE.AdditiveBlending, n = list.length, uv = new Float32Array(n * 4);
    let map = m0.map;
    if (!add) { // 絵がちがう札：1枚の絵に横へ並べ、行がいっぱいになったら下の段へ（すき間2px）
      const W = 2048, P = 2; let x = 0, y = 0, rowH = 0; const at = list.map((s) => { const im = s.material.map.image; if (x + im.width + P > W) { x = 0; y += rowH + P; rowH = 0; } const r = [x, y, im.width, im.height]; x += im.width + P; rowH = Math.max(rowH, im.height); return r; });
      const H = y + rowH, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); list.forEach((s, i) => g.drawImage(s.material.map.image, at[i][0], at[i][1]));
      map = new THREE.CanvasTexture(c); map.colorSpace = m0.map.colorSpace; map.anisotropy = m0.map.anisotropy;
      at.forEach(([ax, ay, aw, ah], i) => uv.set([ax / W, 1 - (ay + ah) / H, aw / W, ah / H], i * 4));
    } else for (let i = 0; i < n; i++) uv.set([0, 0, 1, 1], i * 4);
    const geo = new THREE.InstancedBufferGeometry(); geo.index = new THREE.BufferAttribute(new Uint16Array([0, 1, 2, 0, 2, 3]), 1); geo.instanceCount = n;
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    const A = { aC: new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aS: new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3), aK: new THREE.InstancedBufferAttribute(new Float32Array(n * 4), 4), aUV: new THREE.InstancedBufferAttribute(uv, 4) };
    for (const [k, a] of Object.entries(A)) { if (k !== 'aUV') a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(k, a); }
    const mat = new THREE.ShaderMaterial({ uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null } }]), transparent: true, depthTest: m0.depthTest, depthWrite: m0.depthWrite, blending: m0.blending, fog: m0.fog, defines: m0.sizeAttenuation ? {} : { NO_ATTEN: '' },
      vertexShader: `attribute vec3 aC; attribute vec3 aS; attribute vec4 aK; attribute vec4 aUV; varying vec2 vUv; varying vec4 vK;
#include <common>
#include <fog_pars_vertex>
void main() { vUv = aUV.xy + uv * aUV.zw; vK = aK; vec4 mvPosition = modelViewMatrix * vec4(aC, 1.0); vec2 scale = aS.xy;
  #ifdef NO_ATTEN
  if (isPerspectiveMatrix(projectionMatrix)) scale *= -mvPosition.z;
  #endif
  vec2 p = position.xy * scale; float c = cos(aS.z), s = sin(aS.z); mvPosition.xy += vec2(c * p.x - s * p.y, s * p.x + c * p.y); gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`,
      fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec4 vK;
#include <common>
#include <fog_pars_fragment>
void main() { vec4 t = texture2D(map, vUv); gl_FragColor = vec4(vK.rgb * t.rgb, vK.a * t.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}` });
    mat.uniforms.map.value = map;
    const obj = new THREE.Mesh(geo, mat); obj.frustumCulled = false; obj.renderOrder = add && list[0].renderOrder === 0 ? 3 : list[0].renderOrder; obj.raycast = NO_HIT; obj.userData.batch = true;
    for (const s of list) { s.layers.set(HIDDEN); this.hidden.push(s); }
    this.scene.add(obj); return { obj, list, A };
  }
  stats() { return { meshes: this.meshes.length, parts: this.items.length, dots: this.dots.length, dotParts: this.dots.reduce((s, D) => s + D.list.length, 0), sprites: this.sprites.length, spriteParts: this.sprites.reduce((s, G) => s + G.list.length, 0) }; }
}

// 開く前のシェーダーの用意は、最初に見える物だけ（three の compile は、隠れている物の材質まで全部作る＝まだ見つかっていないケーキ・出てこないスプーン・束ねた元の部品の分まで）
// 隠れている枝と、描かない層の部品を一度だけ場面から外して用意し、元の場所（同じ順番）へ戻す。外した物は、出てくる時にその物だけ用意する（町の readyUp）
export async function compileVisible(renderer, scene, cam) {
  const out = []; (function walk(o) { for (let k = 0; k < o.children.length; k++) { const c = o.children[k]; if (!c.visible || (!c.layers.isEnabled(0) && !c.children.length)) out.push([c, o, k]); else walk(c); } })(scene);
  for (let n = out.length - 1; n >= 0; n--) { const [c, p, k] = out[n]; p.children.splice(k, 1); c.parent = null; }
  try { await renderer.compileAsync(scene, cam); } catch (e) { /* 古いブラウザは最初のコマで用意 */ }
  for (const [c, p, k] of out) { p.children.splice(k, 0, c); c.parent = p; }
  return out.length;
}
