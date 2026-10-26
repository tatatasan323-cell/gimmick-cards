// 毎コマの守り（港町と仕掛けの部屋で共通 2026-10-26。無重力スイムで確かめた形を、ほかの部屋と町へ）
// ・次のコマを先に頼む。1コマの中でエラーが出ても、描く繰り返しは止まらない（最後に頼んでいた時は、エラー1回で画面がそのまま固まった。スマホで何度か引っ張ると固まった 本人 2026-10-18）
// ・エラーは控えておき（?fps の時、左上の字と __dbg.errs で見る）、onError で立て直す（つかんだままの指を片付ける）
// ・決めた間隔より早いコマは、何もせずに返す（rAF は毎回受ける。setTimeout で待つと、描く処理の後回しにされてかえってカクついた＝成果物の基本 2. 動き）
// ・pause() が真の間（劇場の中など、町の絵を覆っている時）は、0.25秒おきに見るだけ
// ・画面の描きこみ（WebGL）を取り上げられたら（スマホのメモリが足りない時）、2.5秒待ち、戻らなければ「もう一度ひらく」を出す。戻った時は onRestored（映り込みを作り直す）
export const ERRS = [];
export const noteErr = (e) => { ERRS.push(String((e && e.stack) || e).slice(0, 300)); if (ERRS.length > 5) ERRS.shift(); };
addEventListener('error', (e) => noteErr(e.error || e.message));   // 指の知らせの中のエラーも控える

// gap()＝コマの間隔（ms）／step(f0)＝1コマの中身（f0＝始めた時刻）／onError(e)＝エラーの後の立て直し／pause()＝真の間は描かない
export function startLoop({ gap, step, onError, pause }) {
  let last = 0;
  function frame() {
    if (pause && pause()) { setTimeout(() => requestAnimationFrame(frame), 250); return; }
    requestAnimationFrame(frame);
    if (performance.now() - last < gap() - 4) return;
    const f0 = last = performance.now();
    try { step(f0); } catch (e) { noteErr(e); console.error('frame:', e); if (onError) { try { onError(e); } catch (e2) { noteErr(e2); } } }
  }
  frame();
}

// 画面の描きこみを取り上げられた時の案内。onLost＝取り上げられた時（指を片付ける）／onRestored＝戻った時
export function guardContext(canvas, { onLost, onRestored } = {}) {
  let el = null, T = 0;
  const show = () => {
    if (!el) {
      el = document.createElement('div'); el.setAttribute('role', 'alert');
      el.style.cssText = 'position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(3,5,15,.6);padding:16px;color:#eef6ff;text-align:center;font:800 15px/1.8 "Hiragino Maru Gothic ProN","Yu Gothic UI",system-ui,sans-serif';
      el.innerHTML = '<div>画面の描きこみが止まりました<br><small>スマホの空きメモリが足りなくなったようです</small><br><button type="button" style="margin-top:12px;font:inherit;padding:11px 22px;border-radius:999px;border:0;background:#ffe27a;color:#3a2a00">もう一度ひらく</button></div>';
      el.querySelector('button').addEventListener('click', () => location.reload()); document.body.append(el);
    }
    el.hidden = false; el.style.display = 'grid';
  };
  canvas.addEventListener('webglcontextlost', () => { noteErr('webglcontextlost'); if (onLost) { try { onLost(); } catch (e) { noteErr(e); } } T = setTimeout(show, 2500); });
  canvas.addEventListener('webglcontextrestored', () => { clearTimeout(T); if (el) { el.hidden = true; el.style.display = 'none'; } if (onRestored) { try { onRestored(); } catch (e) { noteErr(e); } } });
}
