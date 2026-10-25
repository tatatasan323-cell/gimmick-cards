// 工房のプレイグラウンドから来た時の「もどる」（本人 2026-10-25「港町の各ミニアプリの部屋には、工房からは単独で接続して遊べる仕様に」）
//   工房（https://ai-naiseika.github.io/）の一覧から ?from=kobo を付けて開いた時、または工房から来た時だけ、「‹ 港町へもどる」を「‹ 工房へもどる」に変える。
//   工房から同じタブで来ていれば、来た所（工房の一覧）へ1つ戻る。直に開いた時は、工房の「遊び場」の一覧を開く。港町から来た時は、今までどおり港町へ
//   遊び場はカードの枝とは別の場所（左の枝のブランコ）になった（本人 2026-10-25「カードの中ではなく、別な枝か別な広場で」）
(() => {
  const a = document.getElementById('toTown'), KOBO = 'https://ai-naiseika.github.io/';
  if (!a) return;
  const came = document.referrer.startsWith(KOBO);
  if (new URLSearchParams(location.search).get('from') !== 'kobo' && !came) return;
  a.textContent = '‹ 工房へもどる';
  a.href = KOBO + '#basho-asobiba';
  a.addEventListener('click', (e) => { if (came && history.length > 1) { e.preventDefault(); history.back(); } });
})();
