// 待ちの幕（id は waitVeil。ステンドグラスの部屋の #veil＝黒い幕とは別物）（本人 2026-11-01「初期画面で各項目を選んだ時、次の画面に行くまで、フリーズ誤認防止が何もないので固まっているように見えます。スピナーなどが必要」）
// ・押した瞬間に出し、画面に描かれてから重い処理（町の組み立て・ほかのページへ）へ進む（show が返す約束）。出してすぐ重い処理を始めると、幕が描かれる前に画面が止まった
// ・くるくるは CSS の回転だけ（画面の処理が止まっている間も、合成の側で回り続ける）
// ・full＝画面ぜんたいを暗くして、ほかを押させない（はじめの画面）。full でない時は、まん中の札だけ（部屋の「もどる」は押せる）
// ・部屋のページは、この script を data-veil="<文>" 付きで body のはじめに読むと、最初の絵から幕が出る。使えるようになったら done
// ・端末の「戻る」でページごと戻った時（bfcache）は、幕を消す
(function () {
  var st = document.createElement('style');
  st.textContent = '#waitVeil{position:fixed;inset:0;z-index:120;display:grid;place-items:center;pointer-events:none;transition:opacity .3s}#waitVeil[hidden]{display:none}#waitVeil.full{background:rgba(6,8,30,.6);pointer-events:auto}#waitVeil.off{opacity:0;pointer-events:none}'
    + '#waitVeil .vl-box{display:flex;flex-direction:column;align-items:center;gap:10px;width:min(78vw,300px);box-sizing:border-box;padding:20px 18px 16px;border-radius:22px;background:#fffaf1;color:#4a2a14;box-shadow:0 0 0 3px #ffd27a,0 12px 30px rgba(0,0,0,.45);text-align:center;font-family:"Hiragino Maru Gothic ProN","Yu Gothic UI",system-ui,sans-serif}'
    + '#waitVeil .vl-spin{width:44px;height:44px;box-sizing:border-box;border-radius:50%;border:6px solid #f3e2c8;border-top-color:#ff5c9e;border-right-color:#ffb43a;animation:vlSpin .8s linear infinite;will-change:transform}'
    + '@keyframes vlSpin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){#waitVeil .vl-spin{animation-duration:2.4s}}'
    + '#waitVeil .vl-msg{margin:0;font-size:15px;font-weight:900;letter-spacing:.03em;line-height:1.55;word-break:keep-all;overflow-wrap:anywhere}#waitVeil .vl-sub{font-size:12px;font-weight:700;line-height:1.5;color:#8a5a2a}#waitVeil .vl-sub:empty{display:none}'   // 文は読点の後で折る（「ひらいていま／す…」と言葉の途中で折れた）
    + '#waitVeil .vl-bar{width:100%;height:6px;border-radius:3px;background:#f3e2c8;overflow:hidden}#waitVeil .vl-bar[hidden]{display:none}#waitVeil .vl-bar i{display:block;height:100%;transform-origin:0 50%;transform:scaleX(0);background:linear-gradient(90deg,#ffb43a,#ff5c9e);transition:transform .3s}';
  document.head.appendChild(st);
  var W = document.createElement('div'); W.id = 'waitVeil'; W.hidden = true; W.setAttribute('role', 'status'); W.setAttribute('aria-live', 'polite');
  W.innerHTML = '<div class="vl-box"><div class="vl-spin" aria-hidden="true"></div><p class="vl-msg"></p><small class="vl-sub"></small><div class="vl-bar" aria-hidden="true" hidden><i></i></div></div>';
  document.body.appendChild(W);
  var msg = W.querySelector('.vl-msg'), sub = W.querySelector('.vl-sub'), bar = W.querySelector('.vl-bar'), fill = bar.firstChild, gone = 0;
  var V = window.__veil = {
    show: function (m, s, o) { o = o || {}; clearTimeout(gone); msg.textContent = m; sub.textContent = s || ''; bar.hidden = !o.bar; fill.style.transform = 'scaleX(0)';
      W.classList.toggle('full', !!o.full); W.classList.remove('off'); W.hidden = false;
      return new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(function () { r(); }); }); }); },
    set: function (f) { if (!W.hidden) fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, f)).toFixed(3) + ')'; },
    done: function (now) { if (W.hidden) return; if (now) { W.hidden = true; return; } fill.style.transform = 'scaleX(1)'; W.classList.add('off'); clearTimeout(gone); gone = setTimeout(function () { W.hidden = true; }, 320); }
  };
  addEventListener('pageshow', function (e) { if (e.persisted) V.done(true); });
  var me = document.currentScript, first = me && me.getAttribute('data-veil');
  if (first) V.show(first);
})();
