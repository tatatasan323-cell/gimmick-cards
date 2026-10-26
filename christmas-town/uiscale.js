// 画面の上の部品（題字・札・ボタン・確認の窓・説明）の大きさを、パソコンでは窓の大きさに合わせて伸び縮みさせる（港町と部屋5つで共通）
//   本人 2026-10-27（PC の Edge）：「画質を細かくしたときにポップアップが極端に小さくなり、大きくすると背景のステンドグラスも荒くなる。スケールがおかしい」
//   3D の絵は窓いっぱいなので、ブラウザの拡大・縮小で見た目の大きさが変わらない。部品は CSS の px の決まった大きさなので、拡大・縮小と一緒に大きさが変わり、絵と釣り合わなかった
// ・パソコン（指で触らない端末）では、body に CSS の zoom＝窓の短い辺÷900（上下 0.4〜2.5）。拡大率 50%・100%・200% で、部品の見た目の大きさ（画面の画素）が同じになる
//   短い辺900＝1440×900 の窓の 100% で、今までと同じ大きさ
// ・指で触る端末（スマホ・タブレット）はそのまま（スマホでの今の大きさが適切＝本人）
// ・画面の点（clientX・getBoundingClientRect・innerHeight・3D から映した位置）を style の px に入れる所は、zoom で割る（uiZoom()）
const REF = 900, MIN = 0.4, MAX = 2.5;
let z = 1;
export const uiZoom = () => z;
export function scaleUI() {
  if (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches) return;   // 指で触る端末は、今のまま
  const apply = () => { z = Math.max(MIN, Math.min(MAX, Math.min(innerWidth, innerHeight) / REF)); document.body.style.zoom = String(+z.toFixed(4)); document.documentElement.style.setProperty('--uiz', String(+z.toFixed(4))); };   // --uiz＝vh で決めた高さを割り戻す時に使う
  apply(); addEventListener('resize', apply);
}
