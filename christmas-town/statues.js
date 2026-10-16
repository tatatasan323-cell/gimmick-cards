// 氷の彫像（5体）：クリスマスにゆかりのある、ずんぐりした形。距離の式（負＝氷の中）。床は y=0、高さは約2.6〜3m
// 底は平らに切る（床に立つ）
import { smin, smax, sdSphere, sdEllipsoid, sdCapsule, sdRoundBox, sdTorusY, sdTorusZ, sdRoundCyl, sdStar2, extrude } from './soft.js';
const floorCut = (d, y) => smax(d, -(y - 0.02), 0.06);

export const STATUES = [
  { name: 'サンタ', B0: [-1.35, 0, -1.2], B1: [1.35, 3.25, 1.25], f: (x, y, z) => {
    let d = sdEllipsoid(x, y, z, 0, 0.88, 0, 0.8, 0.9, 0.72);
    d = smin(d, sdTorusY(x, y, z, 0, 0.98, 0, 0.74, 0.08), 0.08);   // ベルト
    d = smin(d, sdSphere(x, y, z, 0, 1.92, 0.04, 0.5), 0.18);   // 頭
    d = smin(d, sdEllipsoid(x, y, z, 0, 1.68, 0.3, 0.42, 0.4, 0.26), 0.12);   // ひげ
    d = smin(d, sdCapsule(x, y, z, 0, 2.28, 0, -0.22, 2.9, -0.12, 0.46, 0.1), 0.1);   // 帽子
    d = smin(d, sdTorusY(x, y, z, 0, 2.26, 0, 0.42, 0.1), 0.06);   // 帽子のふち
    d = smin(d, sdSphere(x, y, z, -0.26, 2.98, -0.13, 0.15), 0.06);   // ぼんぼり
    for (const s of [-1, 1]) { d = smin(d, sdCapsule(x, y, z, s * 0.62, 1.32, 0.08, s * 0.86, 0.8, 0.28, 0.21, 0.18), 0.12); d = smin(d, sdEllipsoid(x, y, z, s * 0.32, 0.14, 0.24, 0.26, 0.15, 0.34), 0.08); }   // 腕・ブーツ
    return floorCut(d, y); } },
  { name: 'ツリー', B0: [-1.35, 0, -1.35], B1: [1.35, 3.3, 1.35], f: (x, y, z) => {
    let d = sdRoundCyl(x, y, z, 0, 0.2, 0, 0.32, 0.2, 0.06);   // みき
    for (const [y0, y1, r0, r1] of [[0.45, 1.25, 1.12, 0.5], [1.15, 1.9, 0.86, 0.36], [1.8, 2.5, 0.62, 0.18]]) d = smin(d, sdCapsule(x, y, z, 0, y0, 0, 0, y1, 0, r0, r1), 0.1);
    d = smin(d, extrude(sdStar2(x, y - 2.78, 0.34, 0.45), z, 0.1, 0.06), 0.08);   // てっぺんの星
    return floorCut(d, y); } },
  { name: 'オーナメント', B0: [-1.25, 0, -1.25], B1: [1.25, 3.0, 1.25], f: (x, y, z) => {
    let d = sdSphere(x, y, z, 0, 1.18, 0, 1.06);
    d = smin(d, sdTorusY(x, y, z, 0, 1.18, 0, 1.05, 0.08), 0.06);   // 帯
    d = smin(d, sdTorusY(x, y, z, 0, 1.55, 0, 0.98 * Math.cos(0.36), 0.05), 0.05);
    d = smin(d, sdRoundCyl(x, y, z, 0, 2.3, 0, 0.3, 0.15, 0.05), 0.08);   // 口金
    d = smin(d, sdTorusZ(x, y, z, 0, 2.58, 0, 0.17, 0.065), 0.04);   // 吊り輪
    d = smin(d, sdRoundCyl(x, y, z, 0, 0.1, 0, 0.55, 0.1, 0.05), 0.15);   // 台
    return floorCut(d, y); } },
  { name: 'プレゼント', B0: [-1.2, 0, -1.2], B1: [1.2, 2.25, 1.2], f: (x, y, z) => {
    let d = sdRoundBox(x, y, z, 0, 0.78, 0, 0.82, 0.78, 0.82, 0.14);
    d = smin(d, sdRoundBox(x, y, z, 0, 0.78, 0, 0.86, 0.8, 0.17, 0.05), 0.04); d = smin(d, sdRoundBox(x, y, z, 0, 0.78, 0, 0.17, 0.8, 0.86, 0.05), 0.04);   // リボン
    for (const s of [-1, 1]) d = smin(d, sdEllipsoid(x, y, z, s * 0.3, 1.74, 0, 0.34, 0.22, 0.16), 0.06);   // 蝶結び
    d = smin(d, sdSphere(x, y, z, 0, 1.68, 0, 0.16), 0.05);
    return floorCut(d, y); } },
  { name: 'ゆきだるま', B0: [-1.1, 0, -1.1], B1: [1.1, 2.85, 1.15], f: (x, y, z) => {
    let d = sdSphere(x, y, z, 0, 0.7, 0, 0.75);
    d = smin(d, sdSphere(x, y, z, 0, 1.68, 0, 0.52), 0.14);
    d = smin(d, sdRoundCyl(x, y, z, 0, 2.08, 0, 0.5, 0.05, 0.03), 0.04); d = smin(d, sdRoundCyl(x, y, z, 0, 2.32, 0, 0.34, 0.22, 0.04), 0.03);   // 帽子
    d = smin(d, sdCapsule(x, y, z, 0, 1.68, 0.46, 0, 1.64, 0.82, 0.08, 0.03), 0.04);   // 鼻
    d = smin(d, sdTorusY(x, y, z, 0, 1.25, 0, 0.5, 0.11), 0.06);   // マフラー
    return floorCut(d, y); } },
];
