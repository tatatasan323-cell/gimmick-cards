// 本物らしい宝石の描き方：光がカットの面で屈折して中に入り、面の内側で何度も跳ね返り（全反射）、出る時に色ごとに曲がり方がちがう（分散＝虹色のファイア）
// 厚い所ほど色が濃い（吸収）。映り込みは、暗い所に小さく強い光がたくさんある「きらめき用の環境」から取る（向きが変わるたびにキラッと光る）
// 中の跳ね返りは、宝石の形を「平らな面の集まり（凸）」として計算する（面の数だけの式。形ごとに一度だけ作る）
import * as THREE from 'three';

const MAXP = 96;
// きらめき用の環境：明るい大理石の床・あたたかい壁・色ガラスの窓・天井のたくさんの小さく強い灯り。明るさは1を超えてよい（半分の精度の浮動小数）
// （真っ暗な中に灯りだけだと、宝石の中を通った光がほとんど黒を拾い、宝石が黒い石に見えた）
export function gemEnv(renderer) {
  const sc = new THREE.Scene(), room = new THREE.SphereGeometry(20, 48, 24), col = new Float32Array(room.attributes.position.count * 3), lo = new THREE.Color('#f2e6d2').multiplyScalar(1.1), mid = new THREE.Color('#5a4a52'), hi = new THREE.Color('#1c2040');
  for (let i = 0; i < room.attributes.position.count; i++) { const y = room.attributes.position.getY(i) / 20, c = y < -0.15 ? lo.clone().lerp(mid, THREE.MathUtils.smoothstep(y, -0.6, -0.15)) : mid.clone().lerp(hi, THREE.MathUtils.smoothstep(y, -0.05, 0.7)); col.set([c.r, c.g, c.b], i * 3); }
  room.setAttribute('color', new THREE.BufferAttribute(col, 3)); sc.add(new THREE.Mesh(room, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const dot = (x, y, z, s, c, k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) })); m.position.set(x, y, z); sc.add(m); };
  const panel = (w, h, x, y, z, c, k) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); sc.add(m); };
  for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, el = 0.2 + Math.random() * 1.25, r = 12; dot(Math.cos(a) * Math.cos(el) * r, Math.sin(el) * r, Math.sin(a) * Math.cos(el) * r, 0.1 + Math.random() * 0.2, Math.random() < 0.7 ? '#ffe2b8' : '#ffffff', 16 + Math.random() * 24); }
  const SG = ['#3a6ad8', '#d83a4a', '#e8b030', '#2aa860', '#8a4ad8', '#3ac0d0'];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + 0.2; panel(1.4, 2.4, Math.cos(a) * 12, 3 + (i % 2) * 1.5, Math.sin(a) * 12, SG[i % SG.length], 2.6); }   // 色ガラスの窓
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.8; panel(5, 3, Math.cos(a) * 12, 1, Math.sin(a) * 12, '#ffe8cc', 1.6); }   // 大きくやわらかな灯り（面ごとの照り）
  panel(10, 10, 0, 13, 0, '#fff4e0', 2.2);
  const hf = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');
  const rt = new THREE.WebGLCubeRenderTarget(256, { type: hf ? THREE.HalfFloatType : THREE.UnsignedByteType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  new THREE.CubeCamera(0.1, 100, rt).update(renderer, sc);
  rt.texture.needsPMREMUpdate = true;   // ふつうの材質（ガラスのかけら・飾り玉）の映り込みにも使えるように
  return rt.texture;
}
// 形の「外側の面」の一覧（法線と、原点からの距離）。全部の点が内側に入る面だけ残す＝へこんだ形でも、外を包む凸の形になる
const planeCache = new Map();
export function facetPlanes(geo) {
  if (planeCache.has(geo.uuid)) return planeCache.get(geo.uuid);
  const p = geo.attributes.position, ix = geo.index ? geo.index.array : null, n = ix ? ix.length : p.count, V = (i, out) => out.fromBufferAttribute(p, ix ? ix[i] : i), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), out = [];
  for (let t = 0; t + 2 < n; t += 3) {
    V(t, a); V(t + 1, b); V(t + 2, c); const nn = new THREE.Vector3().subVectors(b, a).cross(c.clone().sub(a)); if (nn.lengthSq() < 1e-12) continue; nn.normalize(); let d = nn.dot(a); if (d < 0) { nn.negate(); d = -d; }
    if (out.some((q) => q.n.dot(nn) > 0.9995 && Math.abs(q.d - d) < 2e-3)) continue;
    let sup = true; for (let i = 0; i < p.count && sup; i++) if (nn.x * p.getX(i) + nn.y * p.getY(i) + nn.z * p.getZ(i) > d + 2e-3) sup = false;
    if (sup) out.push({ n: nn, d });
  }
  out.sort((x, y) => y.d - x.d); const arr = out.slice(0, MAXP).map((q) => new THREE.Vector4(q.n.x, q.n.y, q.n.z, q.d));
  while (arr.length < MAXP) arr.push(new THREE.Vector4(0, 0, 0, 0));
  const r = { planes: arr, count: Math.min(out.length, MAXP) }; planeCache.set(geo.uuid, r); return r;
}
const VS = `
varying vec3 vPos; varying vec3 vEye; varying vec3 vR0; varying vec3 vR1; varying vec3 vR2; varying vec3 vCol; varying float vAsm;
uniform vec3 uColor; uniform float uAsm; attribute float aCell; attribute vec3 aCellC;
void main() {
  mat4 M = modelMatrix;
  #ifdef USE_INSTANCING
  M = modelMatrix * instanceMatrix;
  #endif
  vCol = uColor;
  #ifdef USE_INSTANCING_COLOR
  vCol = instanceColor;
  #endif
  #ifdef USE_COLOR
  vCol = color;
  #endif
  vec3 p = position; vAsm = 1.0;
  if (uAsm < 50.0) { float a = clamp((uAsm - aCell) / 0.14, 0.0, 1.0); vAsm = a; p = aCellC + (position - aCellC) * (a <= 0.0 ? 0.0 : 0.55 + 0.45 * a + 0.12 * sin(a * 3.1416)); }   // 組み上がる時：かけらごとに、順番が来たらはまる
  vPos = p; vEye = (inverse(M) * vec4(cameraPosition, 1.0)).xyz;
  vR0 = normalize(M[0].xyz); vR1 = normalize(M[1].xyz); vR2 = normalize(M[2].xyz);
  gl_Position = projectionMatrix * viewMatrix * M * vec4(p, 1.0);
}`;
const FS = `
#define MAXP ${MAXP}
uniform samplerCube uEnv; uniform vec4 uPlanes[MAXP]; uniform int uN; uniform float uIor; uniform float uDisp; uniform float uDens; uniform float uBright;
uniform vec3 uEmis; uniform vec3 uShift; uniform float uShiftK; uniform vec3 uEdge; uniform float uOpacity;
varying vec3 vPos; varying vec3 vEye; varying vec3 vR0; varying vec3 vR1; varying vec3 vR2; varying vec3 vCol; varying float vAsm;
vec3 env(vec3 d) { vec3 w = normalize(vR0 * d.x + vR1 * d.y + vR2 * d.z); return textureCube(uEnv, w).rgb * uBright; }
float fres(float c, float f0) { return f0 + (1.0 - f0) * pow(1.0 - clamp(c, 0.0, 1.0), 5.0); }
void main() {
  vec3 V = normalize(vPos - vEye), N = normalize(cross(dFdx(vPos), dFdy(vPos))); if (dot(N, V) > 0.0) N = -N;
  vec3 tint = mix(vCol, uShift, uShiftK), absorb = -log(max(tint, vec3(0.03))) * uDens;
  float f0 = pow((uIor - 1.0) / (uIor + 1.0), 2.0), F = fres(dot(-V, N), f0);
  vec3 col = env(reflect(V, N)) * F;
  vec3 T = refract(V, N, 1.0 / uIor), P = vPos, att = vec3(1.0 - F);
  for (int b = 0; b < 5; b++) {
    float tm = 1e9; vec3 ne = vec3(0.0);
    for (int i = 0; i < MAXP; i++) { if (i >= uN) break; vec4 pl = uPlanes[i]; float dn = dot(T, pl.xyz); if (dn > 1e-4) { float t = (pl.w - dot(P, pl.xyz)) / dn; if (t < tm) { tm = t; ne = pl.xyz; } } }
    if (tm > 1e8) break;
    P += T * tm; att *= exp(-absorb * tm);
    vec3 To = refract(T, -ne, uIor);
    if (dot(To, To) < 1e-5) { T = reflect(T, -ne); continue; }   // 全反射：外へ出られず、中で跳ね返る
    float Fi = fres(abs(dot(T, ne)), f0);
    vec3 Tr = refract(T, -ne, uIor - uDisp), Tb = refract(T, -ne, uIor + uDisp);   // 色ごとに曲がり方がちがう（ファイア）
    if (dot(Tr, Tr) < 1e-5) Tr = To; if (dot(Tb, Tb) < 1e-5) Tb = To;
    col += att * (1.0 - Fi) * vec3(env(Tr).r, env(To).g, env(Tb).b);
    att *= Fi; T = reflect(T, -ne);
  }
  col += att * env(T) * 0.5;
  col += uEmis + uEdge * (1.0 - vAsm);   // 光る仕掛け・はまったばかりのかけらの光
  gl_FragColor = vec4(col, uOpacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
// 1つの形と色から、宝石の絵の具を作る。disp＝色の分かれ方（ダイヤは大きい）、dens＝色の濃さ
export function gemMaterial(geo, envTex, o = {}) {
  const P = facetPlanes(geo);
  const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: {
    uEnv: { value: envTex }, uPlanes: { value: P.planes }, uN: { value: P.count }, uIor: { value: o.ior ?? 1.7 }, uDisp: { value: o.disp ?? 0.02 }, uDens: { value: o.dens ?? 0.55 }, uBright: { value: o.bright ?? 1.0 },
    uColor: { value: new THREE.Color(o.color || '#ffffff') }, uEmis: { value: new THREE.Color(0, 0, 0) }, uShift: { value: new THREE.Color(o.color || '#ffffff') }, uShiftK: { value: 0 },
    uAsm: { value: 99 }, uEdge: { value: new THREE.Color(o.color || '#ffffff').multiplyScalar(2.5) }, uOpacity: { value: 1 } } });
  if (o.transparent) { m.transparent = true; m.depthWrite = false; }
  if (geo.attributes.color) m.vertexColors = true;   // 2色の宝石（ウォーターメロン・トルマリン）は、頂点の色で
  return m;
}
