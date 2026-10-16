// クリスマスのグミたち（20種）：形は距離の式、色は部品ごと。buildType で面に起こし、instantiate で置く
import * as THREE from 'three';
import { smin, smax, sdSphere as S, sdEllipsoid as E, sdCapsule as C, sdRoundBox as B, sdTorusY as TY, sdTorusZ as TZ, sdRoundCyl as CY, sd2Capsule as C2, sdStar2, extrude } from './soft.js';

const K = 0.1, ab = Math.abs;
const lin = (hex) => new THREE.Color(hex).toArray();
const BLACK = '#2a2236', WHITE = '#f4f2ff', GOLD = '#ffc23a', SKIN = '#ffc7a0', RED = '#ff3b4e', GREEN = '#2fcf6f', BROWN = '#c0703a';
const cut = (d, yCut, k = 0.06) => smax(d, yCut, k);   // 下を平らに切る（yCut＝切る面より下で正）

// ---- くま（テディグミと同じ形）
const bearBody = (x, y, z) => { const ax = ab(x); let d = E(x, y, z, 0, -0.25, 0, 0.64, 0.74, 0.52); d = smin(d, E(x, y, z, 0, 0.82, 0.04, 0.54, 0.49, 0.48), K * 1.4); d = smin(d, E(ax, y, z, 0.4, 1.2, 0, 0.21, 0.21, 0.13), K); d = smin(d, E(x, y, z, 0, 0.7, 0.42, 0.22, 0.16, 0.16), K * 0.8); d = smin(d, C(ax, y, z, 0.5, 0.18, 0.02, 0.98, -0.16, 0.32, 0.2, 0.17), K); d = smin(d, C(ax, y, z, 0.3, -0.78, 0, 0.46, -1.12, 0.3, 0.27, 0.24), K); d = smin(d, E(ax, y, z, 0.5, -1.2, 0.4, 0.26, 0.17, 0.3), K * 0.8); return smin(d, S(x, y, z, 0, -0.78, -0.5, 0.15), K); };
const bear = (x, y, z) => smax(smin(bearBody(x, y, z), S(x, y, z, 0, 0.74, 0.56, 0.065), 0.03), -S(ab(x), y, z, 0.18, 0.9, 0.43, 0.05), 0.03);

// ---- サンタ
const santaRed = (x, y, z) => { const ax = ab(x); let d = E(x, y, z, 0, -0.4, 0, 0.62, 0.6, 0.55); d = smin(d, C(ax, y, z, 0.48, -0.15, 0.05, 0.78, -0.5, 0.28, 0.17, 0.15), K); d = smin(d, C(x, y, z, 0, 0.66, 0, 0.3, 1.12, -0.12, 0.36, 0.07), 0.06); return smin(d, C(x, y, z, 0.3, 1.12, -0.12, 0.45, 1.0, -0.12, 0.07, 0.06), 0.05); };
const santaWhite = (x, y, z) => { const ax = ab(x); let d = E(x, y, z, 0, 0.14, 0.26, 0.31, 0.2, 0.16); d = smin(d, TY(x, y, z, 0, 0.68, 0, 0.33, 0.09), 0.04); d = Math.min(d, S(x, y, z, 0.47, 0.97, -0.12, 0.12)); return Math.min(d, S(ax, y, z, 0.82, -0.56, 0.31, 0.15)); };
const santaBelt = (x, y, z) => Math.min(TY(x, y, z, 0, -0.42, 0, 0.59, 0.07), S(ab(x), y, z, 0.12, 0.47, 0.36, 0.05));

// ---- トナカイ
const deerBody = (x, y, z) => { const ax = ab(x); let d = E(x, y, z, 0, -0.35, -0.05, 0.5, 0.55, 0.45); d = smin(d, E(x, y, z, 0, 0.45, 0.1, 0.36, 0.34, 0.32), K); d = smin(d, E(x, y, z, 0, 0.32, 0.4, 0.2, 0.16, 0.18), 0.08); d = smin(d, C(ax, y, z, 0.22, -0.65, 0.2, 0.26, -1.05, 0.25, 0.13, 0.11), K); d = smin(d, C(ax, y, z, 0.25, 0.62, 0, 0.52, 0.72, 0, 0.07, 0.045), 0.05); return d; };
const deerAntler = (x, y, z) => { const ax = ab(x); return Math.min(C(ax, y, z, 0.17, 0.72, 0, 0.45, 1.25, -0.05, 0.065, 0.04), C(ax, y, z, 0.3, 0.95, -0.02, 0.12, 1.18, 0, 0.045, 0.035), C(ax, y, z, 0.4, 1.12, -0.04, 0.62, 1.3, 0, 0.04, 0.03)); };

// ---- 雪だるま
const snowBody = (x, y, z) => smin(smin(S(x, y, z, 0, -0.5, 0, 0.58), S(x, y, z, 0, 0.22, 0, 0.44), 0.08), S(x, y, z, 0, 0.82, 0, 0.32), 0.06);
const snowScarf = (x, y, z) => Math.min(TY(x, y, z, 0, 0.52, 0, 0.3, 0.09), C(x, y, z, 0.15, 0.48, 0.27, 0.27, 0.1, 0.33, 0.08, 0.07));

// ---- ケーキ
const ROSE = Array.from({ length: 10 }, (_, i) => [Math.cos((i / 10) * Math.PI * 2) * 0.68, Math.sin((i / 10) * Math.PI * 2) * 0.68]);
const cakeBody = (x, y, z) => { let d = CY(x, y, z, 0, -0.3, 0, 0.82, 0.42, 0.1); for (const [px, pz] of ROSE) d = smin(d, S(x, y, z, px, 0.14, pz, 0.12), 0.04); return d; };
const BERRY = [[0, 0], [0.34, 0.12], [-0.3, 0.2], [0.1, -0.36], [-0.2, -0.3]];
const cakeBerry = (x, y, z) => { let d = 1e9; for (const [px, pz] of BERRY) d = Math.min(d, C(x, y, z, px, 0.2, pz, px, 0.48, pz, 0.15, 0.05)); return d; };

// ---- オーナメント
const ornBall = (x, y, z) => S(x, y, z, 0, -0.1, 0, 0.72);
const ornCap = (x, y, z) => Math.min(CY(x, y, z, 0, 0.66, 0, 0.2, 0.11, 0.04), TZ(x, y, z, 0, 0.86, 0, 0.12, 0.035));

// ---- 星・雪の結晶・ジンジャーブレッド（平らな形に厚み）
const star = (x, y, z) => extrude(sdStar2(x, y + 0.05, 0.95, 0.45), z, 0.17, 0.15);
const flake2 = (x, y) => { const sec = Math.PI / 3; let a = Math.atan2(y, x); a = (((a % sec) + sec) % sec) - sec / 2; const r = Math.hypot(x, y), px = r * Math.cos(a), py = ab(r * Math.sin(a)); return Math.min(C2(px, py, 0, 0, 0.95, 0, 0.075), C2(px, py, 0.42, 0, 0.66, 0.2, 0.055), C2(px, py, 0.68, 0, 0.84, 0.13, 0.05), r - 0.2); };
const flake = (x, y, z) => extrude(flake2(x, y), z, 0.06, 0.055);
const ginger2 = (x, y) => { const ax = ab(x); let d = Math.hypot(x, y - 0.62) - 0.32; d = smin(d, C2(x, y, 0, 0.3, 0, -0.3, 0.3), 0.08); d = smin(d, C2(ax, y, 0.1, 0.12, 0.62, 0.2, 0.14), 0.08); return smin(d, C2(ax, y, 0.1, -0.35, 0.38, -0.92, 0.15), 0.08); };
const ginger = (x, y, z) => extrude(ginger2(x, y), z, 0.13, 0.11);

// ---- ベル
const bellBody = (x, y, z) => { let d = S(x, y, z, 0, 0.35, 0, 0.42); d = smin(d, C(x, y, z, 0, 0.3, 0, 0, -0.42, 0, 0.42, 0.72), 0.12); d = smin(d, TY(x, y, z, 0, -0.48, 0, 0.68, 0.1), 0.08); return d; };   // 底は閉じる（くり抜くと、壁が薄く面がざらついた）
const bow = (x, y, z, cy, s = 1) => Math.min(TZ(x, y, z, -0.19 * s, cy, 0.02, 0.15 * s, 0.055 * s), TZ(x, y, z, 0.19 * s, cy, 0.02, 0.15 * s, 0.055 * s), S(x, y, z, 0, cy - 0.03, 0.05, 0.085 * s), C(ab(x), y, z, 0.06 * s, cy - 0.06, 0.06, 0.24 * s, cy - 0.32 * s, 0.12, 0.05 * s, 0.045 * s));

// ---- ツリー
const tier = (x, y, z, y0, y1, r0, r1) => cut(C(x, y, z, 0, y0, 0, 0, y1, 0, r0, r1), y0 - r0 * 0.25 - y);
const treeBody = (x, y, z) => smin(smin(tier(x, y, z, -0.55, 0.05, 0.8, 0.32), tier(x, y, z, -0.05, 0.5, 0.62, 0.22), 0.08), tier(x, y, z, 0.38, 0.95, 0.44, 0.04), 0.08);
const TB = [[-0.45, -0.45, 0.55], [0.4, -0.3, 0.55], [0.0, -0.6, 0.72], [-0.3, 0.12, 0.48], [0.3, 0.2, 0.42], [0.05, 0.6, 0.3]];
const treeBalls = (x, y, z) => { let d = 1e9; for (const [px, py, pz] of TB) d = Math.min(d, S(x, y, z, px, py, pz, 0.085)); return d; };

// ---- プレゼント
const giftBox = (x, y, z) => B(x, y, z, 0, -0.2, 0, 0.6, 0.5, 0.6, 0.12);
const giftRibbon = (x, y, z) => Math.min(B(x, y, z, 0, -0.2, 0, 0.14, 0.53, 0.62, 0.05), B(x, y, z, 0, -0.2, 0, 0.62, 0.53, 0.14, 0.05), bow(x, y, z, 0.42));

// ---- 靴下
const sock = (x, y, z) => smin(C(x, y, z, 0, 0.55, 0, 0, -0.3, 0, 0.3, 0.3), C(x, y, z, 0, -0.42, 0, 0.42, -0.55, 0, 0.3, 0.27), 0.1);
const sockCuff = (x, y, z) => CY(x, y, z, 0, 0.72, 0, 0.36, 0.17, 0.08);

// ---- リース
const wreath = (x, y, z) => TZ(x, y, z, 0, 0, 0, 0.62, 0.21) - 0.035 * (0.5 + 0.5 * Math.sin(Math.atan2(y, x) * 16));
const wreathRed = (x, y, z) => Math.min(S(x, y, z, -0.1, -0.66, 0.2, 0.08), S(x, y, z, 0.07, -0.7, 0.22, 0.08), S(x, y, z, 0.1, -0.58, 0.24, 0.07), bow(x, y, z, 0.72, 0.9));

// ---- 天使
const angelDress = (x, y, z) => cut(C(x, y, z, 0, 0.15, 0, 0, -0.8, 0, 0.2, 0.55), -0.95 - y);
const angelWing = (x, y, z) => E(ab(x), y, z, 0.45, 0.05, -0.2, 0.42, 0.3, 0.07);
const angelHair = (x, y, z) => Math.min(S(x, y, z, 0, 0.82, -0.04, 0.15), E(x, y, z, 0, 0.55, -0.12, 0.33, 0.31, 0.25));

// ---- ペンギン
const pengBody = (x, y, z) => smin(smin(E(x, y, z, 0, -0.15, 0, 0.55, 0.75, 0.5), S(x, y, z, 0, 0.55, 0, 0.4), 0.15), E(ab(x), y, z, 0.55, -0.1, 0, 0.12, 0.4, 0.2), 0.08);
const pengBelly = (x, y, z) => smin(E(x, y, z, 0, -0.22, 0.25, 0.4, 0.55, 0.3), E(x, y, z, 0, 0.5, 0.22, 0.28, 0.22, 0.22), 0.1);
const pengOrange = (x, y, z) => Math.min(C(x, y, z, 0, 0.5, 0.38, 0, 0.46, 0.56, 0.08, 0.02), E(ab(x), y, z, 0.2, -0.9, 0.2, 0.17, 0.07, 0.2));

// ---- ココア
const mug = (x, y, z) => smin(smax(CY(x, y, z, 0, -0.2, 0, 0.58, 0.55, 0.1), -CY(x, y, z, 0, 0.05, 0, 0.46, 0.55, 0.08), 0.04), TZ(x, y, z, 0.64, -0.2, 0, 0.24, 0.08), 0.05);
const cocoa = (x, y, z) => CY(x, y, z, 0, 0.17, 0, 0.47, 0.08, 0.03);
const marsh = (x, y, z) => Math.min(B(x, y, z, -0.15, 0.3, 0.08, 0.12, 0.09, 0.12, 0.05), B(x, y, z, 0.17, 0.3, -0.06, 0.12, 0.09, 0.12, 0.05), B(x, y, z, 0.03, 0.32, 0.24, 0.11, 0.08, 0.11, 0.05));

// ---- 手袋・キャンドル・キャンディケイン
const mitten = (x, y, z) => smin(E(x, y, z, 0, 0.08, 0, 0.42, 0.56, 0.22), C(x, y, z, 0.3, -0.05, 0, 0.55, 0.32, 0, 0.15, 0.13), 0.08);
const mittenCuff = (x, y, z) => B(x, y, z, 0, -0.52, 0, 0.4, 0.15, 0.25, 0.1);
const candle = (x, y, z) => { let d = CY(x, y, z, 0, -0.35, 0, 0.27, 0.62, 0.07); d = smin(d, C(x, y, z, 0.2, 0.22, 0.13, 0.23, 0.02, 0.16, 0.075, 0.06), 0.04); return smin(d, C(x, y, z, -0.18, 0.22, 0.16, -0.2, -0.1, 0.19, 0.07, 0.055), 0.04); };
const flame = (x, y, z) => smin(S(x, y, z, 0, 0.56, 0, 0.13), C(x, y, z, 0, 0.56, 0, 0, 0.86, 0, 0.12, 0.015), 0.05);
const holly = (x, y, z) => E(ab(x), y, z, 0.3, -0.95, 0.18, 0.24, 0.06, 0.12);
const CANE = (() => { const p = [[0, -1.0], [0, 0.5]]; for (let i = 1; i <= 8; i++) { const a = Math.PI - (i / 8) * Math.PI; p.push([0.32 + Math.cos(a) * 0.32, 0.5 + Math.sin(a) * 0.32]); } p.push([0.64, 0.3]); return p; })();
const cane = (x, y, z) => { let d = 1e9; for (let i = 0; i < CANE.length - 1; i++) d = Math.min(d, C(x, y, z, CANE[i][0], CANE[i][1], 0, CANE[i + 1][0], CANE[i + 1][1], 0, 0.15, 0.15)); return d; };

const eyes = (ex, ey, ez, r = 0.045) => (x, y, z) => S(ab(x), y, z, ex, ey, ez, r);
const stripes = (a, b, f) => (x, y, z) => lin(Math.sin(f(x, y, z)) > 0 ? a : b);

// 部品：f＝形、c＝色、core＝芯（厚い所）、solid＝不透明（目など）、vc＝頂点の色、emit＝光る
export const CHARS = [
  { name: 'くま', variants: ['#ff4038', '#ff8a1a', '#ffd23a', '#3fd06a', '#9ec8ff'], parts: [{ f: bear, main: true, core: true }] },
  { name: 'サンタ', parts: [{ f: santaRed, c: RED, core: true }, { f: (x, y, z) => smin(E(x, y, z, 0, 0.4, 0.05, 0.34, 0.33, 0.32), S(x, y, z, 0, 0.36, 0.4, 0.07), 0.03), c: SKIN }, { f: santaWhite, c: WHITE }, { f: santaBelt, c: BLACK, solid: true }, { f: (x, y, z) => B(x, y, z, 0, -0.42, 0.6, 0.11, 0.09, 0.05, 0.02), c: GOLD, solid: true }] },
  { name: 'トナカイ', parts: [{ f: deerBody, c: BROWN, core: true }, { f: deerAntler, c: '#f0cc8a' }, { f: (x, y, z) => S(x, y, z, 0, 0.36, 0.57, 0.1), c: '#ff1e3a', emit: true }, { f: eyes(0.13, 0.53, 0.37), c: BLACK, solid: true }] },
  { name: '雪だるま', parts: [{ f: snowBody, c: '#eef2ff', core: true }, { f: (x, y, z) => C(x, y, z, 0, 0.82, 0.28, 0, 0.78, 0.62, 0.07, 0.02), c: '#ff8a1a' }, { f: snowScarf, c: RED }, { f: (x, y, z) => Math.min(eyes(0.11, 0.9, 0.28)(x, y, z), S(x, y, z, 0, 0.3, 0.43, 0.05), S(x, y, z, 0, 0.08, 0.44, 0.05)), c: BLACK, solid: true }] },
  { name: 'ケーキ', parts: [{ f: cakeBody, c: '#ffffff', core: true, vc: (x, y, z) => lin(ab(y + 0.3) < 0.07 && Math.hypot(x, z) > 0.72 ? '#ff4a6a' : '#fff4ea') }, { f: cakeBerry, c: '#ff2442' }] },
  { name: 'オーナメント', variants: ['#ff3b4e', '#3a8cff', '#a86bff', '#2fcf6f', '#ff6fb5'], parts: [{ f: ornBall, main: true, core: true }, { f: ornCap, c: GOLD, solid: true }] },
  { name: '星', parts: [{ f: star, c: '#ffd23a', core: true }, { f: eyes(0.17, 0.02, 0.18, 0.055), c: BLACK, solid: true }] },
  { name: 'キャンディケイン', parts: [{ f: cane, c: '#ffffff', vc: stripes('#ff2442', '#fff6f6', (x, y) => (x * 0.9 + y) * 11) }] },
  { name: 'ジンジャーブレッド', parts: [{ f: ginger, c: BROWN, core: true, coreOff: 0.07 }, { f: (x, y, z) => Math.min(eyes(0.11, 0.68, 0.12, 0.05)(x, y, z), S(x, y, z, 0, 0.18, 0.13, 0.055), S(x, y, z, 0, -0.04, 0.13, 0.055)), c: '#ffffff', solid: true }] },
  { name: 'ベル', parts: [{ f: bellBody, c: GOLD }, { f: (x, y, z) => S(x, y, z, 0, -0.62, 0, 0.14), c: '#e09a20' }, { f: (x, y, z) => bow(x, y, z, 0.86), c: RED }] },
  { name: 'ツリー', parts: [{ f: treeBody, c: GREEN, core: true }, { f: (x, y, z) => CY(x, y, z, 0, -0.85, 0, 0.17, 0.2, 0.05), c: BROWN }, { f: (x, y, z) => extrude(sdStar2(x, y - 1.12, 0.26, 0.45), z, 0.07, 0.05), c: '#ffd23a', emit: true }, { f: treeBalls, c: '#ff3b4e' }] },
  { name: 'プレゼント', variants: ['#3a8cff', '#ff6fb5', '#2fcf6f', '#a86bff'], parts: [{ f: giftBox, main: true, core: true }, { f: giftRibbon, c: '#ffd23a' }] },
  { name: '靴下', parts: [{ f: sock, c: '#ffffff', core: true, vc: (x, y) => lin(x > 0.33 || (x < -0.05 && y < -0.38) ? GREEN : RED) }, { f: sockCuff, c: WHITE }] },
  { name: 'リース', parts: [{ f: wreath, c: '#1fb860', core: true, coreOff: 0.08 }, { f: wreathRed, c: RED }] },
  { name: '天使', parts: [{ f: angelDress, c: '#fff1d6', core: true }, { f: (x, y, z) => S(x, y, z, 0, 0.5, 0, 0.3), c: SKIN }, { f: angelHair, c: '#ffd23a' }, { f: angelWing, c: '#bfe6ff' }, { f: (x, y, z) => TY(x, y, z, 0, 0.98, 0, 0.22, 0.04), c: GOLD, emit: true }, { f: eyes(0.1, 0.52, 0.28, 0.04), c: BLACK, solid: true }] },
  { name: 'ペンギン', parts: [{ f: pengBody, c: '#3a4a90', core: true }, { f: pengBelly, c: '#ffffff' }, { f: pengOrange, c: '#ff9a1a' }, { f: eyes(0.15, 0.62, 0.34, 0.05), c: BLACK, solid: true }] },
  { name: '雪の結晶', parts: [{ f: flake, c: '#9fe8ff' }] },
  { name: 'ココア', parts: [{ f: mug, c: '#ff4a5a', core: true, coreOff: 0.06 }, { f: cocoa, c: '#7a3a1a' }, { f: marsh, c: '#ffffff' }] },
  { name: '手袋', variants: ['#ff3b4e', '#3a8cff', '#2fcf6f', '#a86bff'], parts: [{ f: mitten, main: true, core: true }, { f: mittenCuff, c: WHITE }] },
  { name: 'キャンドル', parts: [{ f: candle, c: '#ff3b4e', core: true }, { f: (x, y, z) => C(x, y, z, 0, 0.27, 0, 0, 0.42, 0, 0.025, 0.02), c: BLACK, solid: true }, { f: flame, c: '#ffcf3a', emit: true }, { f: holly, c: GREEN }, { f: (x, y, z) => Math.min(S(x, y, z, 0, -0.88, 0.3, 0.07), S(x, y, z, 0.1, -0.9, 0.26, 0.065)), c: RED }] },
];

export { buildType, buildTypeSteps, instantiate } from './gummy.js';
