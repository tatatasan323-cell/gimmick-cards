// 世界の飴（9種類）：形・色・つや・かじった時の音の性格と、豆知識（出典は 豆知識_確認メモ.md の「飴工房（世界の飴）2026-10-17」で、本文を開いて確かめたもの）
// 港町の空から降る飴と、飴工房の店の中の飴で、同じ形を使う。形はどれも、いちばん長い向きが1になる大きさで、真ん中が原点
// 色ちがいのある飴（金平糖・ベルランゴ・アキデ・クネックのカップ）は、並べて描く時に1つずつ色を変える。aWhite＝1 の所（白いすじ・トフィーなど）は、その色に染めず、形の色のまま
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const hash = (a, b = 0, c = 0) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return s - Math.floor(s); };
function vn3(x, y, z) { const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, s = (t) => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf), h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  const l = (a, b, t) => a + (b - a) * t; return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w); }
// 色と白いすじを、形の頂点に書く（col(p, n)→[r,g,b, white]）
function paint(g, col) { g = g.index ? g.toNonIndexed() : g; const p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3), w = new Float32Array(p.count), P = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { P.fromBufferAttribute(p, i); N.fromBufferAttribute(n, i); const [r, gg, b, ww = 0] = col(P, N); c.set([r, gg, b], i * 3); w[i] = ww; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('aWhite', new THREE.BufferAttribute(w, 1)); return g; }
function merge(list) { const n = list.reduce((a, g) => a + g.attributes.position.count, 0), out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color', 'aWhite']) { const sz = list[0].attributes[name].itemSize, arr = new Float32Array(n * sz); let k = 0; for (const g of list) { arr.set(g.attributes[name].array, k); k += g.attributes[name].count * sz; } out.setAttribute(name, new THREE.BufferAttribute(arr, sz)); }
  return out; }
// いちばん長い向きを1に、真ん中を原点に
function fit(g) { g.computeBoundingBox(); const b = g.boundingBox, c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()), k = 1 / Math.max(s.x, s.y, s.z); g.translate(-c.x, -c.y, -c.z); g.scale(k, k, k); g.computeBoundingSphere(); return g; }
const hex = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

// ---------- 形 ----------
// キャンディケイン：J字のつえ。白に赤のらせんじま（細い赤の線もそえる）
function cane() {
  const pts = []; for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(0, -0.5 + (i / 12) * 0.72, 0)); for (let i = 1; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI * 1.05; pts.push(new THREE.Vector3(0.13 + Math.cos(a) * 0.13, 0.22 + Math.sin(a) * 0.13, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts), L = curve.getLength(), NT = 120, NR = 16, tube = new THREE.TubeGeometry(curve, NT, 0.042, NR, false);
  const R = hex('#d7263d'), W = hex('#fafaf7'), uv = tube.attributes.uv, p = tube.attributes.position, c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const s = uv.getX(i) * L, a = uv.getY(i), f = (s * 7 + a) % 1, red = f < 0.3 || Math.abs(f - 0.55) < 0.035; c.set(red ? R : W, i * 3); }
  tube.setAttribute('color', new THREE.BufferAttribute(c, 3)); tube.setAttribute('aWhite', new THREE.BufferAttribute(new Float32Array(p.count), 1));
  const t2 = tube.toNonIndexed(); t2.deleteAttribute('uv');
  const ends = [curve.getPoint(0), curve.getPoint(1)].map((q) => paint(new THREE.SphereGeometry(0.042, 12, 8).translate(q.x, q.y, q.z), () => [...W]));
  return fit(merge([t2, ...ends]));
}
// クネック：小さな紙のカップ（ひだ）に、アーモンドの粒の見えるトフィー。カップの色は並べる時に変える（トフィーは白いすじ扱いで染めない）
function knack() {
  const cup = new THREE.CylinderGeometry(0.5, 0.36, 0.42, 48, 2, true), p = cup.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + 0.035 * Math.abs(Math.sin(a * 12)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } cup.computeVertexNormals();
  const cupP = paint(cup, (P) => { const sh = 0.82 + 0.18 * Math.abs(Math.sin(Math.atan2(P.z, P.x) * 12)); return [sh, sh, sh, 0]; });
  const bottom = paint(new THREE.CircleGeometry(0.36, 32).rotateX(Math.PI / 2).translate(0, -0.21, 0), () => [0.8, 0.8, 0.8, 0]);
  const top = new THREE.SphereGeometry(0.47, 40, 16, 0, TAU, 0, Math.PI / 2), q = top.attributes.position; for (let i = 0; i < q.count; i++) { const x = q.getX(i), y = q.getY(i), z = q.getZ(i); q.setY(i, y * 0.42 + 0.17 + 0.012 * vn3(x * 14, y * 14, z * 14)); } top.computeVertexNormals();
  const A = hex('#b5733a'), N = hex('#e8d3a8'), toffee = paint(top, (P) => { const nut = vn3(P.x * 16 + 3, P.y * 16, P.z * 16) > 0.74; const k = 0.85 + 0.25 * vn3(P.x * 5, P.y * 5, P.z * 5); return [...(nut ? N : A.map((v) => v * k)), 1]; });
  return fit(merge([cupP, bottom, toffee]));
}
// トゥロン：四角い板（7:3:1）。アイボリーにアーモンドの粒、上と下にうすいウエハース
function turron() {
  const g = new RoundedBoxGeometry(1, 0.14, 0.43, 8, 0.025), I = hex('#f2e6cc'), A = hex('#c08a55'), Wf = hex('#f6efe0'), p = g.attributes.position;
  const nutAt = (x, y, z) => vn3(x * 22, y * 22, z * 22);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (Math.abs(y) > 0.06) p.setY(i, y + Math.sign(y) * 0.022 * Math.max(0, nutAt(p.getX(i), 0, p.getZ(i)) - 0.55) / 0.45); }   // ウエハースの下のアーモンドで、上と下がぽこぽこ
  g.computeVertexNormals();
  return fit(paint(g, (P) => { const nut = nutAt(P.x, Math.abs(P.y) > 0.052 ? 0 : P.y, P.z); if (Math.abs(P.y) > 0.052) { const k = 0.95 + 0.05 * Math.sin(P.x * 90) * Math.sin(P.z * 90), t = Math.min(0.75, Math.max(0, nut - 0.5) * 2.2); return [...Wf.map((v, j) => (v + (A[j] - v) * t) * k), 1]; } return [...(nut > 0.7 ? A : I), 1]; }));
}
// ビンタンフールー：竹串にサンザシの実が6つ。とかした砂糖の殻で、つやつや
function tanghulu() {
  const B = hex('#d9b98c'), F = hex('#b3122e'), stick = paint(new THREE.CylinderGeometry(0.016, 0.016, 0.95, 8), () => [...B, 1]), fr = [];
  for (let i = 0; i < 6; i++) { const s = new THREE.SphereGeometry(0.09, 24, 16), p = s.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k), z = p.getZ(k), d = 1 + 0.06 * (vn3(x * 40 + i * 5, y * 40, z * 40) - 0.5) - 0.12 * Math.max(0, y / 0.09) ** 8; p.setXYZ(k, x * d, y * d, z * d); } s.computeVertexNormals();
    s.translate(0, 0.38 - i * 0.16, 0); fr.push(paint(s, (P) => { const k = 0.85 + 0.3 * vn3(P.x * 30, P.y * 30, P.z * 30); return [...F.map((v) => Math.min(1, v * k)), 1]; })); }
  return fit(merge([stick, ...fr]));
}
// 金平糖：小さな球に、とげとげの角が24本ほど。色は並べる時に変える
function konpeito() {
  const D = []; for (let i = 0; i < 24; i++) { const y = 1 - (2 * (i + 0.5)) / 24, r = Math.sqrt(1 - y * y), a = i * 2.39996; D.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)); }
  const g = new THREE.SphereGeometry(0.5, 48, 32), p = g.attributes.position, V = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { V.fromBufferAttribute(p, i).normalize(); let b = 0; for (const d of D) b = Math.max(b, Math.pow(Math.max(0, V.dot(d)), 26)); V.multiplyScalar(0.38 + 0.16 * b + 0.01 * vn3(V.x * 20, V.y * 20, V.z * 20)); p.setXYZ(i, V.x, V.y, V.z); }
  g.computeVertexNormals(); return fit(paint(g, (P) => { const k = 0.9 + 0.1 * vn3(P.x * 30, P.y * 30, P.z * 30); return [k, k, k, 0]; }));
}
// ベルランゴ：角の丸い四面体。透きとおる色に、白いすじが4本
function berlingot() {
  const N = [new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, -1, -1), new THREE.Vector3(-1, 1, -1), new THREE.Vector3(-1, -1, 1)].map((v) => v.normalize().negate());
  const g = new THREE.SphereGeometry(0.5, 48, 32), p = g.attributes.position, V = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { V.fromBufferAttribute(p, i).normalize(); let s = 0; for (const n of N) s += Math.pow(Math.max(0, V.dot(n)), 7); V.multiplyScalar(0.5 / Math.pow(s, 1 / 7) * 0.62); p.setXYZ(i, V.x, V.y, V.z); }
  g.computeVertexNormals(); const S = [new THREE.Vector3(1, 0, -1), new THREE.Vector3(0, 1, -1), new THREE.Vector3(1, -1, 0)].map((v) => v.normalize()), U = new THREE.Vector3();   // 白いすじ＝中心を通る3枚の面と、表面の交わる線
  return fit(paint(g, (P) => { U.copy(P).normalize(); const st = S.some((n) => Math.abs(U.dot(n)) < 0.045); return [1, 1, 1, st ? 1 : 0]; }));
}
// アキデ・シェケリ：角の丸い小さな直方体。宝石のようなつや（すじはなし）
function akide() { return fit(paint(new RoundedBoxGeometry(1, 0.6, 0.62, 4, 0.13), () => [1, 1, 1, 0])); }
// アレグリア：はじけたアマランサスの粒を、はちみつで固めた丸い円盤（でこぼこ・しっとり）
function alegria() {
  const prof = []; for (let i = 0; i <= 6; i++) prof.push(new THREE.Vector2(0.001 + (i / 6) * 0.43, 0.1));
  for (let i = 1; i < 12; i++) { const a = Math.PI / 2 - (i / 12) * Math.PI; prof.push(new THREE.Vector2(0.43 + Math.cos(a) * 0.07, Math.sin(a) * 0.1)); }
  for (let i = 0; i <= 6; i++) prof.push(new THREE.Vector2(0.43 - (i / 6) * 0.429, -0.1));
  const g = new THREE.LatheGeometry(prof, 72); g.computeVertexNormals(); const p = g.attributes.position, n = g.attributes.normal, V = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { V.fromBufferAttribute(p, i); const b = (vn3(V.x * 70, V.y * 70, V.z * 70) - 0.5) * 0.028; p.setXYZ(i, V.x + n.getX(i) * b, V.y + n.getY(i) * b, V.z + n.getZ(i) * b); }   // はじけた粒のでこぼこ
  g.computeVertexNormals(); const A = hex('#e9d8a6'), B = hex('#d9b86c');
  return fit(paint(g, (P) => { const t = vn3(P.x * 50, P.y * 50, P.z * 50), c = A.map((v, k) => v + (B[k] - v) * t); return [...c, 1]; }));
}
// 金太郎飴：白い棒。切り口に、おかっぱ頭の顔（昔話の金太郎から。特定の店の図柄はまねない）。顔は少しゆがませる
const K_W = hex('#f7f4ee'), K_P = hex('#f2b6c6'), K_B = hex('#4a2c1d');
function faceAt(u, v) { const r = Math.hypot(u, v * 1.04 + 0.02); if (r > 0.74) return K_W;
  const hair = v > 0.2 + 0.035 * Math.sin(u * 11) || (Math.abs(u) > 0.5 && v > -0.18), brow = Math.abs(v - 0.1) < 0.035 && Math.abs(Math.abs(u) - 0.27) < 0.12, eye = Math.hypot(Math.abs(u) - 0.26, v + 0.04) < 0.075, nose = Math.hypot(u, v + 0.19) < 0.045, mouth = Math.abs(v - (-0.37 + 0.6 * u * u)) < 0.03 && Math.abs(u) < 0.16;
  return hair || brow || eye || nose || mouth ? K_B : K_P; }
// 切り口（+x を向く円。原点が中心、半径0.5）と、棒の側面（x＝0〜1・半径0.5）。店では棒を短くしながら、切り口を動かす
export function kintaroCap() { return paint(new THREE.RingGeometry(0.0005, 0.5, 128, 48).rotateY(Math.PI / 2), (P) => [...faceAt(-P.z / 0.5, P.y / 0.5), 1]); }
export function kintaroSide() { return paint(new THREE.CylinderGeometry(0.5, 0.5, 1, 64, 1, true).rotateZ(Math.PI / 2).translate(0.5, 0, 0), (P) => { const k = 0.96 + 0.04 * vn3(P.x * 4, P.y * 30, P.z * 30); return [...K_W.map((c) => c * k), 1]; }); }
// 空から降る1切れ（長さ1.6：太さ1）
function kintaro() { const L = 1.6, side = kintaroSide().scale(L, 1, 1).translate(-L / 2, 0, 0), a = kintaroCap().translate(L / 2, 0, 0), b = kintaroCap().rotateY(Math.PI).translate(-L / 2, 0, 0); return fit(merge([side, a, b])); }

// ---------- 種類（並び順は、豆知識の番号） ----------
// look：glass＝すきとおる飴／gloss＝つやのある飴／matte＝つやの少ない菓子。hard＝かじった時の音（かたさ 0〜1・粒の音の高さ）。cols＝並べる時の色（なければ、形の色のまま）。sz＝空から降る時の大きさ（m）。bites＝食べきるまでの回数
export const CANDIES = [
  { id: 'c_cane', name: 'キャンディケイン', where: 'アメリカ', build: cane, look: 'gloss', hard: 0.9, pitch: 1.1, sz: 0.62, bites: 4,
    text: 'キャンディケインは、むかしは引きのばす・ねじる・切る・曲げるを、全部手でしていました。1950年代、アメリカの飴屋さんの親せきの神父グレゴリー・ケラーが、それを機械でできるようにしました。棒の先を曲げてつえの形にする機械は、1960年に特許になりました。', src: '出典：全米菓子協会（alwaysatreat.com）／米国特許 US2956520' },
  { id: 'c_knack', name: 'クネック', where: 'スウェーデン', build: knack, look: 'gloss', hard: 0.6, pitch: 0.8, sz: 0.34, bites: 3, cols: ['#d7263d', '#e8b83a', '#2f8a4a', '#d7263d'],
    text: 'スウェーデンのクリスマスには、家で手作りするお菓子が並びます。その代表の1つが「クネック」。きざんだアーモンド入りのキャラメルのようなお菓子（トフィー）で、小さな色とりどりのカップに流しこみ、クリスマスらしく飾って並べます。', src: '出典：スウェーデン観光局（visitsweden.com）' },
  { id: 'c_turron', name: 'トゥロン', where: 'スペイン', build: turron, look: 'matte', hard: 1.0, pitch: 0.6, sz: 0.5, bites: 4,
    text: 'スペインでは、クリスマスにトゥロンを食べる習わしがあります。アリカンテのトゥロンは、はちみつとアーモンドで作るかたいお菓子で、うすいウエハースでおおって四角く切ります。この地方のトゥロンが出てくるいちばん古い記録は、1484年のバレンシアの文書です。', src: '出典：欧州委員会（地理的表示「トゥロン・デ・アリカンテ」）' },
  { id: 'c_tanghulu', name: 'ビンタンフールー', where: '中国・北京', build: tanghulu, look: 'glass', opacity: 0.97, hard: 0.8, pitch: 1.0, sz: 0.7, bites: 6,
    text: '北京の冬のおやつ「ビンタンフールー」は、ふつうサンザシの実を串に刺し、とかした砂糖をからめたもの。中国の南宋という昔の時代に生まれ、北の地方では冬によく食べられます。砂糖が冷たい風でカチカチに固まり、甘ずっぱい味がします。', src: '出典：北京市文化観光局（visitbeijing.com.cn）' },
  { id: 'c_konpeito', name: '金平糖', where: '日本', build: konpeito, look: 'matte', hard: 0.7, pitch: 1.5, sz: 0.24, bites: 2, cols: ['#ffffff', '#f7b6c8', '#f9e79f', '#b5e3b0', '#a9d3f5', '#d7bde2'],
    text: '金平糖の名前は、ポルトガル語の「コンフェイト（砂糖菓子）」から来ています。1569年、宣教師ルイス・フロイスが織田信長に会ったときの贈り物の中に、その名前が見えます。まわりのとげとげの角は、温めながらかき混ぜるうちに、自然にできるものです。', src: '出典：コトバンク（世界大百科事典／日本国語大辞典）' },
  { id: 'c_berlingot', name: 'ベルランゴ', where: 'フランス', build: berlingot, look: 'glass', opacity: 0.82, hard: 0.85, pitch: 1.3, sz: 0.3, bites: 2, cols: ['#c0392b', '#27ae60', '#f1c40f', '#e67e22', '#9b59b6'],
    text: '南フランスの町カルパントラの名物「ベルランゴ」は、白いすじの入った色とりどりの小さな飴。果物の砂糖漬けのシロップから作られます。煮つめた砂糖でできたかたい飴で、形は三角の面が4つある「四面体」です。', src: '出典：プロヴァンス＝アルプ＝コートダジュール地方 観光局／ラルース仏語辞典' },
  { id: 'c_akide', name: 'アキデ・シェケリ', where: 'トルコ', build: akide, look: 'glass', opacity: 0.84, hard: 0.95, pitch: 1.2, sz: 0.28, bites: 2, cols: ['#c62828', '#2e7d32', '#f9a825', '#f4f1ea'],
    text: 'トルコの飴「アキデ・シェケリ」の歴史は、オスマン帝国の時代にさかのぼります。名前は「約束」という意味の言葉「アキド」から。大切な式では、イェニチェリと呼ばれる兵士たちに配られ、受け取ることが、帝国に忠実であるしるしでした。', src: '出典：イスタンブール文化観光局（ktb.gov.tr）' },
  { id: 'c_alegria', name: 'アレグリア', where: 'メキシコ', build: alegria, look: 'matte', hard: 0.35, pitch: 0.9, sz: 0.46, bites: 3,
    text: 'メキシコのお菓子「アレグリア」は、スペイン語で「よろこび」という意味。アマランサスという植物の種を熱ではじけさせ、はちみつで固めて作ります。名前の由来ははっきりしませんが、食べた人がよろこんで跳び上がったから、という言い伝えがあります。', src: '出典：論文 Blanco Rodríguez（2020）PatryTer' },
  { id: 'c_kintaro', name: '金太郎飴', where: '日本', build: kintaro, look: 'matte', hard: 1.0, pitch: 0.55, sz: 0.36, bites: 5, stick: true,
    text: '金太郎飴は、どこを切っても切り口に金太郎の顔が出る棒の飴です。顔の色の飴と、目・鼻・口・まゆ・かみの毛になる飴を、太いうちに顔の形に組んで白い飴でくるみ、細く長くのばしてから切ります。重さ約50キロ、太さ35センチの飴を、直径約2センチまでのばすものもあります。', src: '出典：コトバンク（日本大百科全書・デジタル大辞泉）／農林水産省 広報誌 aff 2016年11月号' },
];
const GEO = new Map();
export const candyGeo = (C) => GEO.get(C.id) || (GEO.set(C.id, C.build()), GEO.get(C.id));
// 材質：形の色（＋並べる時の色）。白いすじは染めない。夜の港町でも見えるよう、自分の色でほのかに光る（glow）
export function candyMat(C, o = {}) {
  const look = C.look, m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: look === 'glass' ? 0.06 : look === 'gloss' ? 0.16 : 0.62, clearcoat: look === 'matte' ? 0.15 : 1, clearcoatRoughness: 0.05, envMapIntensity: look === 'matte' ? 0.5 : 1.3,
    transparent: look === 'glass', opacity: look === 'glass' ? (C.opacity ?? 0.85) : 1, sheen: look === 'matte' ? 0.4 : 0, sheenColor: new THREE.Color('#fff4e0') });
  if (o.env) m.envMap = o.env;
  const glow = o.glow ?? 0.22, prev = o.extra;
  m.onBeforeCompile = (sh, r) => {
    sh.vertexShader = 'attribute float aWhite;\n' + sh.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n vColor.xyz = mix(vColor.xyz, color.xyz, aWhite);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n { float nv = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0); totalEmissiveRadiance += diffuseColor.rgb * (${glow.toFixed(3)} + 0.35 * pow(1.0 - nv, 3.0)); }`);
    if (prev) prev(sh, r); };
  m.customProgramCacheKey = () => 'candy|' + glow.toFixed(3) + '|' + (o.key || '');
  return m;
}
