// 画面の端をさわった時に、ブラウザや LINE の「戻る」で、うっかりページを閉じないように（本人 2026-10-17「画面の端を触るとすぐにアプリを閉じてしまう」）
// ①引っぱって再読み込み・はね返りを止める ②画面の左右の端（24px）で始まったタッチは、絵の上ならページの中で受ける（戻るのスワイプにしない）
// ③それでも「戻る」になったら、すぐには出ずに「ここから出ますか？」と聞く（履歴に1つ足しておき、戻るとそこで止まる）
export function guardLeave(msg = 'ここから出ますか？', sub = '') {
  const st = document.createElement('style');
  st.textContent = `html,body{overscroll-behavior:none}
#leaveAsk{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:rgba(20,10,30,.45);padding:16px}#leaveAsk[hidden]{display:none}
#leaveAsk>div{background:#fff8f2;border-radius:22px;padding:18px 18px 14px;max-width:320px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.35);font-family:"Hiragino Maru Gothic ProN","Yu Gothic UI",sans-serif;text-align:center}
#leaveAsk b{display:block;font-size:17px;color:#7a3a1a;margin-bottom:6px}#leaveAsk small{display:block;font-size:12.5px;color:#a0603a;margin-bottom:14px;line-height:1.6}
#leaveAsk .row{display:flex;gap:10px}#leaveAsk button{flex:1;font:inherit;font-size:15px;font-weight:800;border:0;border-radius:999px;padding:11px 6px;cursor:pointer}
#leaveAsk .stay{background:linear-gradient(#ff95c8,#ff5c9e);color:#fff}#leaveAsk .go{background:#eadccb;color:#5a3a1a}`;
  document.head.appendChild(st);
  addEventListener('touchstart', (e) => { const t = e.touches[0]; if (!t || e.touches.length > 1) return; if ((t.clientX < 24 || t.clientX > innerWidth - 24) && e.target && e.target.tagName === 'CANVAS') e.preventDefault(); }, { passive: false });
  if (window.top !== window) return;   // 枠の中（claude.ai の試作）では、履歴をさわらない（外のページの「戻る」をじゃまする）
  const mark = () => { try { history.pushState({ stay: 1 }, '', location.href); } catch (e) { /* 別の枠の中では使えない */ } };
  if (!(history.state && history.state.stay)) mark();
  let box = null, leaving = false;
  const ask = () => { if (!box) { box = document.createElement('div'); box.id = 'leaveAsk'; box.hidden = true; const card = document.createElement('div'), b = document.createElement('b'), s = document.createElement('small'), row = document.createElement('div'), stay = document.createElement('button'), go = document.createElement('button');
      b.textContent = msg; s.textContent = sub; row.className = 'row'; stay.className = 'stay'; go.className = 'go'; stay.type = go.type = 'button'; stay.textContent = 'まだ遊ぶ'; go.textContent = '出る';
      stay.addEventListener('click', () => { box.hidden = true; mark(); }); go.addEventListener('click', () => { leaving = true; box.hidden = true; history.back(); });
      row.append(go, stay); card.append(b, ...(sub ? [s] : []), row); box.append(card); document.body.appendChild(box); }
    box.hidden = false; };
  addEventListener('popstate', (e) => { if (leaving || (e.state && e.state.stay)) return; ask(); });
}
