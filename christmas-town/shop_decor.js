// 飴工房の奥の陳列（本人 2026-10-18「背景が少し寂しい。もっとバラエティ豊かな商品を」）
// いつもの視点で見えるのは、奥の壁の床から1.4mくらいまで（それより上の棚は、横画面では画面の外だった）。そこへ壁ぎわの低い飾り棚を置き、上に形の違う売り物を並べる
// 売り物：ぺろぺろキャンディの花びん・ガムボールの機械・形の違うびん（金平糖・ベルランゴ・アキデ・ガム）・キャンディケインのバケツ・リボンの箱・トゥロン・氷砂糖の棒・金平糖の小びん
// 床には北京の飴売りのわら束（ビンタンフールーの串）と、大きなキャンディケイン。壁の棚にも同じ仲間を
// 安く作る：小さな飴は数十の三角・びんの中身は外から見える外側だけ・同じ形の部品（中身・ガム・渦巻き・串・結晶）は一度だけ作って写す。材質ごとに1つの形へまとめて描く
// （1つずつ作っていた時は、店の三角が58万・入る時の組み立てが CPU4倍遅くで2.5秒だった）
import * as THREE from 'three';
import { Acc } from './sweets.js';
import { CANDIES } from './candies.js';

const TAU = Math.PI * 2, UP = new THREE.Vector3(0, 1, 0), V = (x, y, z) => new THREE.Vector3(x, y, z);
const COLS = (id) => CANDIES.find((C) => C.id === id).cols;
const PAIRS = [['#e8283a', '#fff8f0'], ['#3a8cff', '#fff8f0'], ['#ff7ab8', '#fff3a0'], ['#3cbf6a', '#fff8f0'], ['#a878ff', '#ffe2f2'], ['#ffa82a', '#e8283a'], ['#ff5a5a', '#ffd84a']];
const GIFT = [['#c8283a', '#f5d36a'], ['#2f7d4a', '#f2efe6'], ['#f2efe6', '#c8283a'], ['#3a5fae', '#f5d36a'], ['#f5d36a', '#c8283a'], ['#7a3fa0', '#f2efe6']];
const GUM = ['#e8283a', '#ffd23a', '#3a9cff', '#3cbf6a', '#ff8ac8', '#ffffff', '#ff8a2a', '#a878ff'], ROCK = ['#7fc8ff', '#ff9ad0', '#c7a6ff', '#9be8c4', '#ffe08a'];
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const at = (x, y, z, s = 1, ry = 0, rx = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), V(s, s, s));
const aim = (p, dir, s = 1) => new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()), V(s, s, s));
const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const pick = (R, a) => a[Math.floor(R() * a.length)];
function rod(acc, key, a, b, r, col, seg = 8) { const d = new THREE.Vector3().subVectors(b, a); acc.add(key, new THREE.CylinderGeometry(r, r, d.length(), seg).translate(0, d.length() / 2, 0), col, aim(a.clone(), d)); }
// 一度だけ作って写す部品：name ごとに、材質の名前 → 形
const PROTO = new Map();
function proto(name, fn) { if (!PROTO.has(name)) { const a = new Acc(); fn(a, rng(name.length * 977 + name.charCodeAt(name.length - 1))); const o = {}; for (const m of a.build({})) o[m.userData.key] = m.geometry; PROTO.set(name, o); } return PROTO.get(name); }
function put(acc, P, m) { for (const k in P) acc.add(k, P[k].clone(), null, m.clone()); }
// キャンディケイン（陳列用の粗い形。高さ1・下の端が y＝-0.5。しまは店の飴と同じ巻き方）
const CANE = (() => { const pts = []; for (let i = 0; i <= 8; i++) pts.push(V(0, -0.5 + (i / 8) * 0.72, 0)); for (let i = 1; i <= 10; i++) { const a = Math.PI - (i / 10) * Math.PI * 1.05; pts.push(V(0.13 + Math.cos(a) * 0.13, 0.22 + Math.sin(a) * 0.13, 0)); }
  const cv = new THREE.CatmullRomCurve3(pts), L = cv.getLength(), t = new THREE.TubeGeometry(cv, 40, 0.042, 6, false), uv = t.attributes.uv, c = new Float32Array(uv.count * 3), Rd = new THREE.Color('#d7263d');
  for (let i = 0; i < uv.count; i++) { const f = (((uv.getX(i) * L * 7 + uv.getY(i)) % 1) + 1) % 1; c.set(f < 0.32 ? [Rd.r, Rd.g, Rd.b] : [0.98, 0.98, 0.97], i * 3); } t.setAttribute('color', new THREE.BufferAttribute(c, 3)); return t; })();
// 渦巻きのぺろぺろキャンディ：2色の糸を交互にうずまきに巻いた半径1の円盤（xy の面）。色の組ごとに1つ作る
const swirlP = (pi) => proto('swirl' + pi, (a) => { const [cA, cB] = PAIRS[pi];
  for (const [ph, col] of [[0, cA], [Math.PI, cB]]) { const P = []; for (let i = 0; i <= 36; i++) { const u = i / 36, an = u * 3 * TAU + ph, rr = 0.1 + 0.86 * u; P.push(V(Math.cos(an) * rr, Math.sin(an) * rr, 0)); } a.add('gloss', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 40, 0.15, 4, false), col); }
  a.add('gloss', new THREE.SphereGeometry(0.17, 8, 6), cA); });
// 花びんに挿したぺろぺろキャンディ（4〜6本を扇に）
function bouquet(acc, R) { acc.add('matte', lathe([[0, 0], [0.05, 0], [0.062, 0.02], [0.046, 0.1], [0.056, 0.145], [0.066, 0.155], [0.06, 0.16]], 18), pick(R, ['#f3e6d6', '#c94a4a', '#3f6fb5', '#2f8a5a']));
  const n = 4 + Math.floor(R() * 3), base = V(0, 0.1, 0);
  for (let i = 0; i < n; i++) { const f = i / (n - 1) - 0.5, a = f * 1.3 + (R() - 0.5) * 0.25, L = 0.2 + R() * 0.1, r = 0.05 + R() * 0.03, top = V(Math.sin(a) * L * 0.6, 0.14 + Math.cos(a) * L, (R() - 0.5) * 0.1), dir = top.clone().sub(base).normalize();
    rod(acc, 'matte', base, top, 0.005, '#fbf6ee', 5);
    put(acc, swirlP(Math.floor(R() * PAIRS.length)), new THREE.Matrix4().compose(top.clone().addScaledVector(dir, r * 0.9).add(V(0, 0, 0.012)), new THREE.Quaternion().setFromEuler(new THREE.Euler((R() - 0.5) * 0.35, (R() - 0.5) * 0.6, -a * 0.7)), V(r, r, r))); } }
// ガムボールの機械：赤か青の台・コインの口・ガラスの玉（中に色とりどりのガム）・ふた
const gumFill = () => proto('gumfill', (a, R) => { for (let i = 0, k = 0; i < 46 && k < 400; k++) { const p = V(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).multiplyScalar(0.1); if (p.length() > 0.1 || p.length() < 0.055 || p.y > 0.055) continue; a.add('gloss', new THREE.SphereGeometry(0.019, 7, 5), pick(R, GUM), at(p.x, p.y, p.z)); i++; } });
function gumball(acc, R) { const body = pick(R, ['#d62a2a', '#d62a2a', '#2a7ad6']);
  acc.add('gloss', new THREE.CylinderGeometry(0.075, 0.09, 0.05, 20).translate(0, 0.025, 0), body); acc.add('gloss', new THREE.CylinderGeometry(0.058, 0.07, 0.15, 20).translate(0, 0.125, 0), body);
  acc.add('gold', new THREE.BoxGeometry(0.045, 0.035, 0.02), null, at(0, 0.13, 0.064));
  acc.add('glass', new THREE.SphereGeometry(0.125, 24, 16), null, at(0, 0.32, 0)); put(acc, gumFill(), at(0, 0.32, 0, 1, R() * TAU));
  acc.add('gloss', new THREE.SphereGeometry(0.05, 14, 6, 0, TAU, 0, Math.PI / 2), body, at(0, 0.435, 0)); }
// びんの形（高さごとの外の半径）：背の高いびん・丸いボンボニエール・背の低い広口
const JARS = [[[0, 0], [0.08, 0], [0.09, 0.015], [0.09, 0.2], [0.066, 0.224], [0.048, 0.233], [0.048, 0.252]],
  [[0, 0], [0.05, 0], [0.1, 0.04], [0.115, 0.1], [0.096, 0.16], [0.05, 0.188], [0.05, 0.202]],
  [[0, 0], [0.115, 0], [0.125, 0.015], [0.125, 0.105], [0.106, 0.12], [0.106, 0.136]]];
// 小さな飴（びんの中身。数十の三角）
const MINI = { konpeito: ['matte', () => new THREE.IcosahedronGeometry(0.013, 0), COLS('c_konpeito')], berlingot: ['gloss', () => new THREE.TetrahedronGeometry(0.019, 0), COLS('c_berlingot')],
  akide: ['gloss', () => new THREE.BoxGeometry(0.026, 0.015, 0.016), COLS('c_akide')], gum: ['gloss', () => new THREE.SphereGeometry(0.016, 6, 4), GUM] };
// びんの中身：びんの内側の、外から見える所（壁ぞいの層と、いちばん上の面）だけに詰める
const jarFill = (kind, fill) => proto(`jar${kind}${fill}`, (a, R) => { const P = JARS[kind], top = P[P.length - 1][1], neck = P[P.length - 1][0], [key, mk, cols] = MINI[fill], lvl = top * 0.68;
  const rAt = (h) => { for (let i = 1; i < P.length; i++) if (h <= P[i][1]) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; return x0 + ((x1 - x0) * (h - y0)) / Math.max(1e-6, y1 - y0); } return neck; };
  for (let k = 0; k < 44; k++) { const onTop = k % 4 === 0, h = onTop ? lvl - R() * 0.012 : 0.012 + R() * (lvl - 0.012), rr = rAt(h) * (onTop ? 0.8 * Math.sqrt(R()) : 0.62 + R() * 0.2), an = R() * TAU; a.add(key, mk(), pick(R, cols), at(Math.cos(an) * rr, h, Math.sin(an) * rr, 1, R() * TAU, R() * TAU, R() * TAU)); } });
function jar(acc, R, x, z, kind, fill) { const P = JARS[kind], top = P[P.length - 1][1], neck = P[P.length - 1][0];
  acc.add('glass', lathe(P, 24), null, at(x, 0, z)); acc.add('gold', new THREE.CylinderGeometry(neck + 0.012, neck + 0.012, 0.018, 20), null, at(x, top + 0.009, z)); acc.add(kind === 1 ? 'glass' : 'gold', new THREE.SphereGeometry(0.022, 10, 6), null, at(x, top + 0.03, z));
  put(acc, jarFill(kind, fill), at(x, 0, z, 1, R() * TAU)); }
function jars(acc, R) { const n = 2 + Math.floor(R() * 2), fills = Object.keys(MINI), k0 = Math.floor(R() * 3);
  for (let i = 0; i < n; i++) jar(acc, R, (i - (n - 1) / 2) * 0.2 + (R() - 0.5) * 0.03, (R() - 0.5) * 0.08, (k0 + i) % 3, pick(R, fills)); }
// リボンをかけた箱（2〜3段に重ねる）
function gift(acc, y, w, h, d, ry, col, rib) { const m = at(0, y, 0, 1, ry), t = Math.min(w, d);
  acc.add('matte', new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0), col, m.clone());
  acc.add('gloss', new THREE.BoxGeometry(w + 0.004, h + 0.004, t * 0.16).translate(0, h / 2, 0), rib, m.clone()); acc.add('gloss', new THREE.BoxGeometry(t * 0.16, h + 0.004, d + 0.004).translate(0, h / 2, 0), rib, m.clone());
  for (const s of [-1, 1]) acc.add('gloss', new THREE.TorusGeometry(t * 0.15, t * 0.04, 5, 12).scale(1, 0.75, 0.5).rotateZ(s * 0.5).translate(s * t * 0.13, h + t * 0.08, 0), rib, m.clone()); }
function gifts(acc, R) { let w = 0.2 + R() * 0.08, yy = 0; const n = 2 + Math.floor(R() * 2);
  for (let i = 0; i < n; i++) { const h = w * (0.55 + R() * 0.3), [c, r] = pick(R, GIFT); gift(acc, yy, w, h, w * (0.8 + R() * 0.25), (R() - 0.5) * 0.6, c, r); yy += h + 0.004; w *= 0.72; } }
// キャンディケインのバケツ
function canes(acc, R) { acc.add('gloss', lathe([[0, 0], [0.075, 0], [0.09, 0.14], [0.096, 0.146], [0.096, 0.156]], 18), R() < 0.5 ? '#c9ccd2' : '#c8283a');
  const n = 6 + Math.floor(R() * 3); for (let i = 0; i < n; i++) { const a = (i / n) * TAU + R() * 0.4, rr = 0.025 + R() * 0.03, s = 0.4 + R() * 0.08; acc.add('gloss', CANE.clone(), null, at(Math.cos(a) * rr, 0.02 + s * 0.5, Math.sin(a) * rr, s, R() * TAU, Math.sin(a) * 0.14, -Math.cos(a) * 0.14)); } }
// トゥロン：木の板に、ウエハースでおおった四角い板を重ねて
function turron(acc, R) { acc.add('wood', new THREE.BoxGeometry(0.34, 0.025, 0.2).translate(0, 0.0125, 0));
  for (let i = 0; i < 3; i++) { const m = at((i - 1) * 0.02, 0.025 + i * 0.042, (R() - 0.5) * 0.03, 1, (R() - 0.5) * 0.3); acc.add('matte', new THREE.BoxGeometry(0.22, 0.034, 0.09).translate(0, 0.017, 0), '#e9d2a4', m.clone()); acc.add('matte', new THREE.BoxGeometry(0.222, 0.006, 0.092).translate(0, 0.037, 0), '#fbf4e4', m.clone()); } }
// 氷砂糖の棒（長さ0.27・下の端が原点の、色ごとに1つ）：先の半分に、色のついた結晶がびっしり
const rockP = (ci) => proto('rock' + ci, (a, R) => { rod(a, 'matte', V(0, 0, 0), V(0, 0.27, 0), 0.004, '#d9b98c', 5);
  for (let k = 0; k < 30; k++) { const y = 0.27 * (0.5 + R() * 0.46), an = R() * TAU, rr = 0.006 + R() * 0.012; a.add('gloss', new THREE.OctahedronGeometry(0.007 + R() * 0.009, 0), ROCK[ci], at(Math.cos(an) * rr, y, Math.sin(an) * rr, 1, R() * TAU, R() * TAU, R() * TAU)); } });
function rock(acc, R) { acc.add('glass', lathe([[0, 0], [0.042, 0], [0.05, 0.11], [0.053, 0.112]], 18));
  for (let s = 0; s < 3; s++) { const a = s * 2.1 + R(); put(acc, rockP(Math.floor(R() * ROCK.length)), aim(V(0, 0.01, 0), V(Math.cos(a) * 0.04, 0.25 + R() * 0.05, Math.sin(a) * 0.04), 1 + R() * 0.15)); } }
// 金平糖の小びん（コルクの栓）を3つ
const bottleFill = () => proto('bottlefill', (a, R) => { const cols = COLS('c_konpeito'); for (let k = 0; k < 16; k++) { const an = R() * TAU, rr = 0.026 * (0.6 + 0.4 * R()); a.add('matte', new THREE.IcosahedronGeometry(0.009, 0), pick(R, cols), at(Math.cos(an) * rr, 0.01 + R() * 0.06, Math.sin(an) * rr, 1, R() * TAU, R() * TAU)); } });
function bottles(acc, R) { for (let i = 0; i < 3; i++) { const bx = (i - 1) * 0.085, bz = (i % 2) * 0.05, h = 0.1 + R() * 0.04; acc.add('glass', lathe([[0, 0], [0.034, 0], [0.036, h * 0.7], [0.018, h * 0.88], [0.016, h]], 16), null, at(bx, 0, bz)); acc.add('matte', new THREE.CylinderGeometry(0.016, 0.014, 0.025, 8).translate(0, h + 0.008, 0), '#b08050', at(bx, 0, bz)); put(acc, bottleFill(), at(bx, 0, bz, 1, R() * TAU)); } }
// ビンタンフールーの串（長さ1・下の端が原点）：棒と、つやのある赤い実5つ
const skewerP = () => proto('skewer', (a, R) => { rod(a, 'matte', V(0, 0, 0), V(0, 1, 0), 0.018, '#d9b98c', 5); for (let j = 0; j < 5; j++) a.add('gloss', new THREE.SphereGeometry(0.08 + R() * 0.01, 10, 7), pick(R, ['#b3122e', '#c0162f', '#a50f28']), at(0, 0.38 + j * 0.13, 0, 1, R() * TAU)); });
// 北京の飴売りのわら束：棒の上の、わらを巻いた円柱に、串を外向き・上向きに刺す（壁の方へは刺さない）
function tangPost(acc, R, x, z, h) { rod(acc, 'matte', V(x, 0, z), V(x, h - 0.44, z), 0.022, '#7a5232', 8);
  const st = new THREE.CylinderGeometry(0.075, 0.088, 0.46, 18, 5), p = st.attributes.position, c = new Float32Array(p.count * 3), A = new THREE.Color('#d9b468'), B = new THREE.Color('#a87a36');
  for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), k = 0.5 + 0.5 * Math.sin(a * 23 + Math.sin(a * 7) * 2 + p.getY(i) * 3), q = A.clone().lerp(B, k * 0.7); c.set([q.r, q.g, q.b], i * 3); } st.setAttribute('color', new THREE.BufferAttribute(c, 3));
  acc.add('matte', st, null, at(x, h - 0.21, z));
  for (let k = 0; k < 15; k++) { const a = -0.35 + ((k * 0.618) % 1) * (Math.PI + 0.7), yy = h - 0.4 + 0.04 + (k / 14) * 0.34; put(acc, skewerP(), aim(V(x + Math.cos(a) * 0.07, yy, z + Math.sin(a) * 0.07), V(Math.cos(a) * 0.72, 0.7, Math.sin(a) * 0.72), 0.3 + R() * 0.06)); } }
const ON_BOARD = { bouquet, gumball, jars, canes, gifts, turron, rock, bottles };
// 売り物を1つずつ、置く所・向き・大きさを決めて足す（売り物の形は原点に作り、まとめて動かす）
const sub = (acc, Mx) => ({ add: (k, g, c, m) => acc.add(k, g, c, (m ? m.clone() : new THREE.Matrix4()).premultiply(Mx)) });
// sc に陳列を足す。M＝店の材質（glass・gold・wood）。並べ方は seed で毎回同じ
// 少しずつ作る：next() 1回ぶんは、CPU4倍遅くでも0.1秒ほど（町で店へ寄っている間に、裏で進める。一度に作ると0.8秒止まった）
// いつもの視点は奥の壁まで4m以上あり、本物の大きさの売り物は豆粒に見えた。飾り棚は手前・低めに、売り物は1.3〜1.6倍に（お皿の飴も大きいので、店ごと大きなお菓子の国）
export function* shopDecor(sc, M, seed = 7) { const R = rng(seed), acc = new Acc();
  // 壁ぎわの低い飾り棚（ピスタチオ色の胴に扉の枠と金のつまみ・木の天板）。チョコのカウンター・白い天板・オレンジの壁のどれとも分ける（白い胴は天板と溶けて、白い帯に見えた）
  const W = 12.4, BZ = -2.1, TOP = 0.56, H = TOP - 0.035; acc.add('matte', new THREE.BoxGeometry(W, H, 0.5).translate(0, H / 2, 0), '#93c9a9', at(0, 0, BZ)); acc.add('wood', new THREE.BoxGeometry(W + 0.12, 0.035, 0.56).translate(0, TOP - 0.0175, 0), null, at(0, 0, BZ));
  for (let x = -W / 2 + 0.4; x < W / 2 - 0.3; x += 0.8) {   // 扉の枠（上下・左右の細い板）と、金のつまみ
    for (const [w, h, dx, y] of [[0.68, 0.025, 0, 0.06], [0.68, 0.025, 0, H - 0.06], [0.025, H - 0.12, -0.34, H / 2], [0.025, H - 0.12, 0.34, H / 2]]) acc.add('matte', new THREE.BoxGeometry(w, h, 0.015), '#7cb894', at(x + dx, y, BZ + 0.255));
    acc.add('gold', new THREE.SphereGeometry(0.018, 8, 6), null, at(x + 0.28, H * 0.55, BZ + 0.26)); }
  // 天板の上：となり2つと同じ種類にならないように並べる
  const kinds = Object.keys(ON_BOARD), seq = []; for (let x = -W / 2 + 0.35; x < W / 2 - 0.3; x += 0.62 + R() * 0.2) { let k; do k = pick(R, kinds); while (seq.slice(-2).some((s) => s.k === k)); seq.push({ k, x }); }
  yield; for (const [i, s] of seq.entries()) { ON_BOARD[s.k](sub(acc, at(s.x, TOP, BZ + (R() - 0.5) * 0.08, 1.3 + R() * 0.3, (R() - 0.5) * 0.5)), R); if (i % 3 === 2) yield; }
  // 壁の棚（3段）：びん・箱・小びん・ぺろぺろキャンディ
  for (const [y, sh] of [[1.45, 0], [2.0, 0.3], [2.55, 0]]) { acc.add('wood', new THREE.BoxGeometry(11.4, 0.05, 0.36).translate(0, -0.025, 0), null, at(0, y, -2.42));
    const SHELF = [jars, gifts, bottles, bouquet, jars, rock]; let prev = -1; for (let x = -5.2 + sh; x < 5.3; x += 0.6 + R() * 0.15) { let k; do k = Math.floor(R() * SHELF.length); while (k === prev); prev = k; SHELF[k](sub(acc, at(x, y, -2.42 + (R() - 0.5) * 0.04, 1 + R() * 0.15, (R() - 0.5) * 0.4)), R); } yield; }
  // 床：わら束2本（串の所が、いつもの視点に入る高さ）と、大きなキャンディケイン
  tangPost(acc, R, -4.1, -1.55, 1.12); tangPost(acc, R, 3.7, -1.58, 1.18); yield;
  for (const [x, s, rz] of [[-6.55, 1.5, 0.1], [-6.25, 1.25, -0.06], [6.4, 1.45, -0.1], [-1.2, 1.05, 0.13]]) acc.add('gloss', CANE.clone(), null, at(x, s * 0.5, -1.78, s, 0.2, -0.12, rz));
  const out = acc.build({ gloss: new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 }), matte: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), glass: M.glass, gold: M.gold, wood: M.wood });
  for (const m of out) sc.add(m); }
