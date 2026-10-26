// 材質：ゼリー（グミ）の外の膜・芯、光のにじみ。どの場面でも同じものを使う
import * as THREE from 'three';

export const timeU = { value: 0 };
// ゲル：縁の光・芯・底の透けを、材質の式に足す。uWob＞0 でぷるぷる揺れる
export function gel(hex, o = {}) {
  const m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: o.rough ?? 0.1, metalness: 0, clearcoat: o.cc ?? 1, clearcoatRoughness: o.ccr ?? 0.05, sheen: o.sheen ?? 0.6, sheenColor: new THREE.Color(o.sheenColor || '#fff0c0'), sheenRoughness: 0.3, envMapIntensity: o.env ?? 1.5, vertexColors: !!o.vc });
  const U = { uWob: { value: o.wob ?? 0 }, uGlow: { value: new THREE.Color(o.glow || hex) }, uGl: { value: o.gl ?? 0.9 } };
  m.userData.U = U; if (o.glowVC) m.customProgramCacheKey = () => 'gel-glowvc';   // glowVC＝光る色も頂点の色（色ちがいを1つの材質にまとめる時）
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uT = timeU; sh.uniforms.uWob = U.uWob; sh.uniforms.uGlow = U.uGlow; sh.uniforms.uGl = U.uGl;
    sh.vertexShader = 'uniform float uT;uniform float uWob;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * sin(dot(position, vec3(5.1, 7.3, 4.7)) + uT * 15.0) * uWob * 0.06;');
    sh.fragmentShader = 'uniform vec3 uGlow;uniform float uGl;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n { vec3 Vn = normalize(vViewPosition); float nv = clamp(dot(normalize(normal), Vn), 0.0, 1.0); float rim = pow(1.0 - nv, 2.2); float core = pow(nv, 1.6);\n float low = clamp(0.5 - vNormal.y * 0.5, 0.0, 1.0); totalEmissiveRadiance += uGlow * ' + (o.glowVC ? 'vColor.rgb * ' : '') + 'uGl * (0.10 * core + 0.75 * rim + 0.28 * low * (1.0 - rim)); }');
  };
  return m;
}
// ふちへ行くほど薄く消す（重ねた殻の境目の線を見せない）
export function fadeEdge(m, p = 1.4) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `diffuseColor.a *= pow(clamp(dot(normalize(normal), normalize(vViewPosition)), 0., 1.), ${p.toFixed(2)});\n#include <opaque_fragment>`); };
  return m;
}
// グミの材質（色ごとに使い回す）：外の膜（つや・半透明）と、芯（深い色・ふちで消える）
const cache = new Map(), LOOK = { outer: 0.74, core: 0.75 };
// 場面ごとの透け具合（作る前に呼ぶ）。スイム＝少し不透明に（本人 2026-10-15「透明すぎる」）
export function setGummyLook(o) { Object.assign(LOOK, o); cache.clear(); }
export function gummy(hex, o = {}) {
  const key = hex + JSON.stringify(o); if (cache.has(key)) return cache.get(key);
  const c = new THREE.Color(hex), deep = c.clone().multiplyScalar(0.78);
  const outer = gel(hex, { glow: o.glow || hex, gl: o.gl ?? 1.4, env: 1.6, sheen: 0.25, sheenColor: '#ffffff', rough: 0.05, vc: o.vc }); outer.transparent = true; outer.opacity = o.opacity ?? LOOK.outer; outer.depthWrite = false;
  const core = fadeEdge(new THREE.MeshStandardMaterial({ color: deep, emissive: deep, emissiveIntensity: 0.55, roughness: 0.4, transparent: true, opacity: LOOK.core, depthWrite: false }));
  const r = { outer, core }; cache.set(key, r); return r;
}

const ctex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
let _glow;
export function glowTex() { if (!_glow) _glow = ctex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }); return _glow; }
