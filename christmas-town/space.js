// 宇宙の背景：暗い星空（天の川・星雲・またたく星）と、遠くの太陽系（太陽・水星・金星・地球と月・火星・木星・土星・天王星・海王星）
// 星空も惑星も、見る人の位置についてくる（どれだけ泳いでも近づけない）。霧はかけない
import * as THREE from 'three';

const SKY_FS = `uniform float uT;uniform float uAur;uniform float uHue;varying vec3 vD;
vec3 hueRot(vec3 c,float a){float co=cos(a),si=sin(a);vec3 k=vec3(.57735);return c*co+cross(k,c)*si+k*dot(k,c)*(1.-co);}
float h1(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.x+p.y)*p.z);}
vec3 h3(vec3 p){p=fract(p*vec3(.1031,.1030,.0973));p+=dot(p,p.yxz+33.33);return fract((p.xxy+p.yxx)*p.zyx);}
float nz(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h1(i),h1(i+vec3(1,0,0)),f.x),mix(h1(i+vec3(0,1,0)),h1(i+vec3(1,1,0)),f.x),f.y),mix(mix(h1(i+vec3(0,0,1)),h1(i+vec3(1,0,1)),f.x),mix(h1(i+vec3(0,1,1)),h1(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*nz(p);p=p*2.03+1.7;a*=.5;}return s;}
vec3 stars(vec3 d,float sc,float dens,float sz,float br){vec3 p=d*sc,c=floor(p),f=fract(p);float h=h1(c);if(h>dens)return vec3(0.);
  vec3 o=h3(c)*.6+.2;float r=length(f-o),tw=.7+.3*sin(uT*(1.5+h*4.)+h*70.);
  return mix(vec3(.75,.82,1.),vec3(1.,.86,.65),h3(c+7.1).x)*smoothstep(sz,sz*.2,r)*br*tw;}
vec3 bright(vec3 d,float sc,float dens,float br){vec3 p=d*sc,c=floor(p),f=fract(p);float h=h1(c);if(h>dens)return vec3(0.);
  vec3 q=f-(h3(c)*.6+.2),t1=normalize(cross(d,vec3(0.,1.,0.))),t2=cross(d,t1);vec2 s=vec2(dot(q,t1),dot(q,t2));float r2=dot(q,q),tw=.55+.45*sin(uT*(.8+h*2.)+h*40.);
  float core=exp(-r2/.0018),halo=exp(-r2/.03)*.2,spike=exp(-abs(s.x)*9.)*exp(-s.y*s.y*2200.)+exp(-abs(s.y)*9.)*exp(-s.x*s.x*2200.);
  return mix(vec3(.8,.88,1.),vec3(1.,.9,.72),h3(c+3.).y)*(core+halo+spike*.5*tw)*br*(.75+.25*tw);}
void main(){vec3 d=normalize(vD);
  vec3 col=mix(vec3(.018,.022,.06),vec3(.006,.008,.025),clamp(d.y*.5+.5,0.,1.));
  col+=vec3(.14,.05,.18)*smoothstep(.5,.85,fbm(d*1.6+3.))*.6+vec3(.02,.09,.12)*smoothstep(.55,.9,fbm(d*2.2+11.))*.5;
  vec3 n=normalize(vec3(.3,.9,.3));float b=dot(d,n),band=exp(-b*b/.018),mw=band*(.5+.5*fbm(d*5.+7.)),lane=exp(-pow((b-.01)/.01,2.))*smoothstep(.4,.7,fbm(d*9.+2.));
  col+=vec3(.3,.27,.42)*mw*(1.-.75*lane)*.5+vec3(.6,.55,.7)*pow(mw,3.)*.3;
  col+=stars(d,150.,.03+band*.25,.22,.9);col+=stars(d,75.,.05,.15,1.4);col+=bright(d,26.,.045,2.4);
  // オーロラ：光のカーテン。下の縁はくっきり明るい緑、上へ青緑→紫にとけて消える。幕は横に波打って折り重なり、細い光のすじがゆらめく。高さの違う幕を3枚（向きは整数倍の波＝ぐるりと回っても継ぎ目なし）
  if(uAur>0.){float az=atan(d.z,d.x),mask=.25+.75*smoothstep(-.4,.7,cos(az-.5));
    col+=vec3(.04,.18,.12)*exp(-abs(d.y-.12)*7.)*mask*.35*uAur;
    for(int k=0;k<3;k++){float fk=float(k),base=.03+fk*.13,amp=.05+fk*.015,ph=fk*2.1,br=1.-fk*.28;
      float h0=base+amp*(.6*sin(az*2.+ph+uT*.05)+.3*sin(az*5.-ph*1.7+uT*.08)+.1*sin(az*11.+uT*.2)),v=d.y-h0;
      if(v<-.05||v>.7)continue;
      float edge=smoothstep(-.012,0.,v)*(1.+.8*exp(-v*40.)),body=exp(-max(v,0.)*(3.6-fk*.6)),fold=.5+.5*sin(az*7.+ph*2.+uT*.07),ray=pow(.6*nz(vec3(cos(az)*45.+fk*5.,sin(az)*45.,uT*.5))+.4*nz(vec3(cos(az)*110.,sin(az)*110.,uT*.8)),1.6)*1.6;
      vec3 c=mix(vec3(.15,1.,.45),vec3(.1,.7,.8),smoothstep(0.,.12,v));c=mix(c,vec3(.75,.25,.85),smoothstep(.12,.42,v));
      col+=hueRot(c,uHue+fk*uHue*.6)*edge*body*(.35+.65*fold)*(.3+.7*ray)*br*mask*.75*uAur;}}
  gl_FragColor=vec4(col,1.);}`;

// 小さなノイズ（球の模様を描く）
const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
const fbm2 = (x, y, s, o = 5) => { let t = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, s + i); a *= 0.5; f *= 2.03; } return t; };
// 球の模様（経度×緯度の絵）。fn(経度0〜1, 緯度0〜1) → [r,g,b]（0〜255）。端がつながるよう、経度は円にしてノイズを取る
function planetTex(fn, W = 256, H = 128) {
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const [r, gg, b] = fn(i / W, j / H), k = (j * W + i) * 4; img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255; }
  g.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const N2 = (u, v, sc, s, o) => fbm2(Math.cos(u * Math.PI * 2) * sc + 9, Math.sin(u * Math.PI * 2) * sc + v * sc * 2.2, s, o);   // 経度で継ぎ目の出ないノイズ
const mixc = (a, b, t) => a.map((x, i) => x + (b[i] - x) * Math.max(0, Math.min(1, t)));
const TEX = {
  sun: (u, v) => { const n = N2(u, v, 6, 1); return mixc([255, 150, 40], [255, 240, 170], n * 1.2); },
  mercury: (u, v) => { const n = N2(u, v, 5, 2), c = N2(u, v, 14, 3); return mixc([110, 100, 92], [175, 165, 150], n + (c > 0.62 ? -0.3 : 0)); },
  venus: (u, v) => { const n = N2(u + v * 0.3, v, 3, 4); return mixc([210, 170, 110], [250, 225, 175], n); },
  earth: (u, v) => { const lat = Math.abs(v - 0.5) * 2, land = N2(u, v, 3.2, 5) + (lat > 0.7 ? 0.1 : 0), cl = N2(u * 1.3, v, 5, 6);
    let c = land > 0.53 ? mixc([70, 130, 60], [150, 130, 80], (land - 0.53) * 4) : mixc([20, 60, 150], [40, 110, 190], land * 1.6);
    if (lat > 0.84) c = [235, 240, 248]; if (cl > 0.58) c = mixc(c, [250, 252, 255], (cl - 0.58) * 4); return c; },
  moon: (u, v) => { const n = N2(u, v, 4, 7), c = N2(u, v, 12, 8); return mixc([95, 95, 100], [190, 190, 195], n + (c > 0.6 ? -0.25 : 0)); },
  mars: (u, v) => { const lat = Math.abs(v - 0.5) * 2, n = N2(u, v, 4, 9); return lat > 0.88 ? [240, 230, 225] : mixc([140, 60, 30], [215, 120, 70], n * 1.3 - 0.1); },
  jupiter: (u, v) => { const w = v * 22 + N2(u, v, 3, 10, 3) * 2.2, b = 0.5 + 0.5 * Math.sin(w), spot = Math.hypot((u - 0.3) * 3.2, (v - 0.62) * 8) < 0.5;
    return spot ? [200, 90, 60] : mixc([170, 120, 80], [240, 220, 190], b); },
  saturn: (u, v) => { const w = v * 18 + N2(u, v, 2, 11, 3) * 1.2, b = 0.5 + 0.5 * Math.sin(w); return mixc([190, 160, 110], [245, 225, 175], b); },
  uranus: (u, v) => { const b = 0.5 + 0.5 * Math.sin(v * 10); return mixc([150, 215, 225], [185, 235, 240], b * 0.5); },
  neptune: (u, v) => { const b = 0.5 + 0.5 * Math.sin(v * 12 + N2(u, v, 2, 12, 3) * 2); return mixc([40, 80, 190], [80, 130, 230], b); },
};
// 惑星：太陽の向きから照らす（場の光は使わない）。縁に大気の光
const planetMat = (map, sunPos, atm, atmA) => new THREE.ShaderMaterial({ uniforms: { map: { value: map }, sunPos: { value: sunPos }, atm: { value: new THREE.Color(atm) }, atmA: { value: atmA } },
  vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader: 'uniform sampler2D map;uniform vec3 sunPos;uniform vec3 atm;uniform float atmA;varying vec2 vUv;varying vec3 vN;varying vec3 vW;void main(){vec3 L=normalize(sunPos-vW),V=normalize(cameraPosition-vW),N=normalize(vN);float d=dot(N,L),lit=smoothstep(-.08,.35,d);vec3 c=texture2D(map,vUv).rgb*(lit*1.15+.035);float rim=pow(1.-max(dot(N,V),0.),3.)*smoothstep(-.3,.4,d);c+=atm*rim*atmA;gl_FragColor=vec4(c,1.);\n#include <colorspace_fragment>\n}' });
const glowTexture = (() => { let t; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); t = new THREE.CanvasTexture(c); return t; }; })();

// 星空だけ（オーロラつきも）。見る人の位置についてくる
export function makeSky(scene, o = {}) {
  const root = new THREE.Group(); scene.add(root);
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uT: { value: 0 }, uAur: { value: o.aurora ?? 0 }, uHue: { value: 0 } }, vertexShader: 'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: SKY_FS });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), skyMat); sky.renderOrder = -10; sky.frustumCulled = false; root.add(sky);
  return { root, mat: skyMat, update(camPos, t) { root.position.copy(camPos); skyMat.uniforms.uT.value = t; } };
}
export function makeSpace(scene) {
  const S = makeSky(scene), root = S.root;
  // 並び（見る人から見た向き・距離150）：太陽は前の左上。惑星は、ゆるく傾いた一つの帯（黄道）の上に
  const D = 150, at = (x, y, z) => new THREE.Vector3(x, y, z).normalize().multiplyScalar(D);
  const sunPos = at(-0.62, 0.28, -0.73), sunW = sunPos.clone(), bodies = [];   // sunW＝太陽の、世界での位置（毎コマ、見る人の位置を足す）
  const K = 1.8;   // 惑星は実際の比率より大きく（見て楽しめる大きさに）
  const sunM = new THREE.Mesh(new THREE.SphereGeometry(14, 48, 24), new THREE.MeshBasicMaterial({ map: planetTex(TEX.sun), toneMapped: false, fog: false })); sunM.position.copy(sunPos); root.add(sunM); bodies.push({ m: sunM, spin: 0.02 });
  for (const [sz, op, col] of [[52, 0.9, '#ffd28a'], [120, 0.35, '#ffb050'], [250, 0.12, '#ff9a40']]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); s.scale.setScalar(sz); s.position.copy(sunPos); s.renderOrder = -9; root.add(s); }
  const add = (name, dir, r, atm = '#000000', atmA = 0, spin = 0.05) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), planetMat(planetTex(TEX[name]), sunW, atm, atmA)); m.position.copy(at(...dir)); m.scale.setScalar(K); m.rotation.z = 0.2; root.add(m); bodies.push({ m, spin, name }); return m; };
  add('mercury', [-0.5, 0.36, -0.79], 0.9);
  add('venus', [-0.88, 0.22, -0.42], 2.0, '#fff0c0', 0.5);
  const earth = add('earth', [0.5, 0.16, -0.85], 3.4, '#6ab0ff', 1.2, 0.12);
  const moon = add('moon', [0.5, 0.16, -0.85], 0.95); moon.position.add(new THREE.Vector3(6.2, 2.2, 1.4).multiplyScalar(K));
  add('mars', [0.2, 0.24, -0.95], 1.4, '#ffb090', 0.3, 0.1);
  add('jupiter', [0.96, 0.06, -0.2], 4.6, '#ffe0b0', 0.25, 0.25);
  const sat = add('saturn', [0.62, -0.02, 0.78], 3.8, '#fff0c0', 0.25, 0.22); sat.rotation.set(0.45, 0, 0.25);
  { const rg = new THREE.RingGeometry(5.0, 9.2, 96, 1), p = rg.attributes.position, uv = rg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - 5.0) / 4.2, 0.5);
    const rt = planetTex((u) => { const gap = Math.abs(u - 0.62) < 0.035, b = 0.5 + 0.5 * Math.sin(u * 60); return gap ? [8, 8, 10] : mixc([150, 125, 90], [235, 215, 170], b * 0.7 + u * 0.3); }, 256, 4);
    const rm = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, toneMapped: false, fog: false })); rm.rotation.x = Math.PI / 2; sat.add(rm); }
  add('uranus', [-0.45, -0.04, 0.89], 2.0, '#c8ffff', 0.5, 0.15);
  add('neptune', [-0.97, 0.04, 0.24], 1.9, '#80a8ff', 0.6, 0.15);
  for (const b of bodies) b.m.renderOrder = -9;
  return {
    root, bodies,
    update(camPos, t, dt) { S.update(camPos, t); sunW.copy(sunPos).add(camPos); for (const b of bodies) b.m.rotation.y += b.spin * dt; },
  };
}
