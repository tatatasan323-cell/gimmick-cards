// 指の後片付け（港町と仕掛けの部屋で共通 2026-10-26）。指の扱いの本体（つまむ・なぞる・はじく）は部屋ごとに残す
// ・離した知らせ（pointerup）が来ないことがある。新しい1本目の指（isPrimary）が触れたら、前の指の記録は片付ける（港町・美術館・氷の彫像で入れていた。ほかの部屋に無かった）
// ・画面が隠れた・窓から外れた時（blur・visibilitychange・pagehide）も、全部の指を片付ける（つみきで持ったブロックが宙に残るおそれがあった）
import * as THREE from 'three';
const NDC = new THREE.Vector2();

// 画面の点（clientX, clientY）から、カメラの光線を ray に入れる
export function setRay(ray, canvas, cam, x, y) { const r = canvas.getBoundingClientRect(); NDC.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(NDC, cam); return ray; }

// canvas に触れた指の記録 map を見張る。releaseAll()＝その部屋の片付け（持っている物を離す・鳴っている音を止める）
// 部屋の pointerdown より必ず先に動くよう、窓（window）の捕まえる側（capture）で受け、canvas に触れた指だけを見る
export function guardPointers(canvas, map, releaseAll) {
  addEventListener('pointerdown', (e) => { if (e.target === canvas && e.isPrimary && map.size) releaseAll(); }, { capture: true });
  const all = () => { if (map.size) releaseAll(); };
  addEventListener('blur', all); addEventListener('pagehide', all);
  document.addEventListener('visibilitychange', () => { if (document.hidden) all(); });
}
