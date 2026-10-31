// 部屋の「‹ 港町へもどる」の行き先を、来た所に合わせる（GitHub の公開版の部屋にだけ入れる。共通/まとめる_pages.py）
// ・工房のプレイグラウンドから来た時（本人 2026-10-25「港町の各ミニアプリの部屋には、工房からは単独で接続して遊べる仕様に」）
//   工房（https://ai-naiseika.github.io/）の一覧から ?from=kobo を付けて開いた時、または工房から来た時だけ、「‹ 工房へもどる」に変える。
//   工房から同じタブで来ていれば、来た所（工房の一覧）へ1つ戻る。直に開いた時は、工房の「遊び場」の一覧を開く
//   遊び場はカードの枝とは別の場所（左の枝のブランコ）になった（本人 2026-10-25「カードの中ではなく、別な枝か別な広場で」）
// ・港町のはじめの画面から「仕掛けの部屋へ、まっすぐ」で来た時（xmas-back が top）は、「‹ もどる」で、はじめの画面へ（本人 2026-10-31「街を動きたくない人もいる」）
// ・港町から来た時は、今までどおり港町のその建物の前へ
(() => {
  const a = document.getElementById('toTown'), KOBO = 'https://ai-naiseika.github.io/';
  if (!a) return;
  const came = document.referrer.startsWith(KOBO);
  if (new URLSearchParams(location.search).get('from') === 'kobo' || came) {
    a.textContent = '‹ 工房へもどる';
    a.href = KOBO + '#basho-asobiba';
    a.addEventListener('click', (e) => { if (came && history.length > 1) { e.preventDefault(); history.back(); } });
    return;
  }
  let top = false; try { top = sessionStorage.getItem('xmas-back') === 'top'; } catch (e) { /* 覚えておけない時は、港町へ */ }
  if (top) { a.textContent = '‹ もどる'; a.href = './'; }
})();
