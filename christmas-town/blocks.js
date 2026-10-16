// グミの積み木（12種）：形は距離の式、当たりの形（物理）は Rapier の形。色はいろいろ
import { sdRoundBox as B, sdRoundCyl as CY, sdSphere as S, sdStar2, extrude, smax } from './soft.js';

const cylZ = (x, y, z, cy, r, h, rr) => CY(x, z, y, 0, 0, cy, r, h, rr);   // 奥行き方向の円柱（中心の高さ cy）
const tri2 = (x, y, hw, h) => {   // 二等辺三角形（頂点が上・高さ h・底の半分の幅 hw・中心が原点）
  const px = Math.abs(x), py = h / 2 - y, qx = hw, qy = h;
  const c1 = Math.min(1, Math.max(0, (px * qx + py * qy) / (qx * qx + qy * qy))), ax = px - qx * c1, ay = py - qy * c1;
  const c2 = Math.min(1, Math.max(0, px / qx)), bx = px - qx * c2, by = py - qy;
  const d = Math.min(ax * ax + ay * ay, bx * bx + by * by), sg = Math.min(-(px * qy - py * qx), -(py - qy));
  return -Math.sqrt(d) * Math.sign(sg);
};
const heart2 = (x, y) => { x = Math.abs(x); if (y + x > 1) return Math.hypot(x - 0.25, y - 0.75) - Math.SQRT2 / 4; const t = Math.max(x + y, 0) * 0.5; return Math.min(Math.hypot(x, y - 1), Math.hypot(x - t, y - t)) * Math.sign(x - y); };
const K = 0.62;

// col：当たりの形。cuboid（角の丸い箱）・cylinder（縦の円柱）・ball・hull（面の点から凸の形）・parts（箱の組み合わせ）
export const BLOCKS = [
  { name: 'キューブ', f: (x, y, z) => B(x, y, z, 0, 0, 0, 0.36, 0.36, 0.36, 0.1), col: { t: 'cuboid', h: [0.36, 0.36, 0.36], r: 0.1 } },
  { name: 'ちびキューブ', f: (x, y, z) => B(x, y, z, 0, 0, 0, 0.22, 0.22, 0.22, 0.07), col: { t: 'cuboid', h: [0.22, 0.22, 0.22], r: 0.07 }, coreOff: 0.07 },
  { name: 'ながい棒', f: (x, y, z) => B(x, y, z, 0, 0, 0, 0.95, 0.2, 0.22, 0.09), col: { t: 'cuboid', h: [0.95, 0.2, 0.22], r: 0.09 }, coreOff: 0.08 },
  { name: '板', f: (x, y, z) => B(x, y, z, 0, 0, 0, 0.72, 0.11, 0.4, 0.06), col: { t: 'cuboid', h: [0.72, 0.11, 0.4], r: 0.06 }, coreOff: 0.05 },
  { name: 'えんちゅう', f: (x, y, z) => CY(x, y, z, 0, 0, 0, 0.32, 0.34, 0.08), col: { t: 'cylinder', hh: 0.34, r: 0.32, rr: 0.08 } },
  { name: '柱', f: (x, y, z) => CY(x, y, z, 0, 0, 0, 0.2, 0.62, 0.06), col: { t: 'cylinder', hh: 0.62, r: 0.2, rr: 0.06 }, coreOff: 0.08 },
  { name: '三角屋根', f: (x, y, z) => extrude(tri2(x, y, 0.5, 0.56), z, 0.26, 0.06), col: { t: 'hull' }, coreOff: 0.08, up: 'y' },
  { name: 'アーチ', f: (x, y, z) => smax(B(x, y, z, 0, 0, 0, 0.92, 0.45, 0.26, 0.08), -cylZ(x, y, z, -0.45, 0.42, 0.6, 0.02), 0.04),
    col: { t: 'parts', parts: [{ h: [0.92, 0.23, 0.26], at: [0, 0.22, 0] }, { h: [0.25, 0.22, 0.26], at: [-0.67, -0.23, 0] }, { h: [0.25, 0.22, 0.26], at: [0.67, -0.23, 0] }] }, coreOff: 0.08, up: 'y' },
  { name: 'かまぼこ', f: (x, y, z) => smax(cylZ(x, y, z, -0.22, 0.5, 0.26, 0.06), -0.22 - y + 0.0, 0.04), col: { t: 'hull' }, up: 'y' },
  { name: '星', f: (x, y, z) => extrude(sdStar2(x, y + 0.04, 0.56, 0.45), z, 0.17, 0.08), col: { t: 'hull' }, coreOff: 0.07, up: 'z' },
  { name: 'ハート', f: (x, y, z) => extrude(heart2(x / K, y / K + 0.5) * K, z, 0.17, 0.08), col: { t: 'hull' }, coreOff: 0.07, up: 'z' },
  { name: 'ボール', f: (x, y, z) => S(x, y, z, 0, 0, 0, 0.33), col: { t: 'ball', r: 0.33 } },
].map((b) => ({ ...b, parts: [{ f: b.f, main: true, core: true, coreOff: b.coreOff ?? 0.1 }], variants: ['#ff3b4e', '#ff8a1a', '#ffd23a', '#3fd06a', '#2fc0ff', '#8a6bff', '#ff6fb5'], B0: [-1.1, -0.8, -0.6], B1: [1.1, 0.8, 0.6] }));
