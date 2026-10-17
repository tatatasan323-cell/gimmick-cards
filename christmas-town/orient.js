// スマホを横にした時・縦に戻した時に、画面の大きさを合わせ直す（本人 2026-10-17「横向きにしたら横向きに切り替わるように」）
// 向きが変わった知らせのすぐ後は、まだ前の大きさのままの端末がある（iPhone・LINE の中の画面）。少し間をおいて、何度か合わせ直す
export function watchOrientation(size) {
  const again = () => { for (const ms of [0, 80, 250, 600, 1200]) setTimeout(size, ms); };
  addEventListener('orientationchange', again);
  try { if (screen.orientation) screen.orientation.addEventListener('change', again); } catch (e) { /* 古い端末 */ }
  if (window.visualViewport) visualViewport.addEventListener('resize', () => size());
}
