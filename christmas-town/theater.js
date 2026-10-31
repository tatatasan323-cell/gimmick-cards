// 劇場の中＝3つのシアター（本人 2026-10-20「ハロウィンのギミックカードの時のように、中に入ると3つのシアター。3曲ともサビを15秒くらい。下に、MVを一曲全部見るボタン → YouTube」）
// 港町の劇場からも、はじめの画面の「シアターでMVを見る」からも、同じ画面（#theaterUI）を開く。開いた側が約束（hooks）を渡す：
//   back＝もどるボタンの字 / onBack＝もどるボタンで閉じる代わりにすること（はじめの画面からは、端末の「戻る」と同じ履歴で）
//   tap・audio＝音 / duck(true)＝町の BGM を止めたら true を返す・duck(false)＝戻す / onClose＝閉じた後
// 動画は、押すまで読みこまない（通信量・LINE の中でも軽く）。流れている間は町の BGM を止めて、終わったら戻す
// yt＝YouTube の全編。入れた曲だけ、ボタンが押せる（入れていない曲は「近日公開」）。clip が無い曲は、幕が閉じたまま「準備中」
export const SHOWS = [
  { id: 'hiphop', name: 'Friends Around the Table', ja: 'テーブルに集まれ！', note: 'ヒップホップ｜イブの夜、仲間がつぎつぎにやってくる', clip: 'theater_hiphop.mp4', poster: 'theater_hiphop.jpg', yt: 'https://youtu.be/pEvqS5da3-s' },
  { id: 'folk', name: 'Christmas Feels Like Being', ja: 'きみといる、それがクリスマス', note: 'フォーク｜同じイブを、家のふたりの側から', clip: 'theater_folk.mp4', poster: 'theater_folk.jpg', yt: 'https://youtu.be/Z6vJkx9_u-s' },
  { id: 'gospel', name: 'Singing Glory', ja: 'グローリー・グローリー！', note: 'ゴスペル｜町じゅうの声が集まって、クリスマスの朝へ', clip: 'theater_gospel.mp4', poster: 'theater_gospel.jpg', yt: 'https://youtu.be/oR3KyE3Zmxo' },
];
const $ = (id) => document.getElementById(id);
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
let H = {}, ducked = false, wired = false;
function unduck() { if (ducked && H.duck) H.duck(false); ducked = false; }
function reset(v) { v.pause(); v.removeAttribute('src'); v.removeAttribute('controls'); try { v.load(); } catch (e) { /* 読みこむものが無い */ } v.parentElement.querySelector('.play').hidden = false; }
function stopAll(except) { for (const v of $('thList').querySelectorAll('video')) if (v !== except && v.getAttribute('src')) reset(v); }
function build() { const L = $('thList'); if (L.childElementCount) return;
  for (const S of SHOWS) { const c = mk('div', 'th'), st = mk('div', 'stage'), tx = mk('div', 't'); c.dataset.id = S.id;
    if (S.clip) { const v = document.createElement('video'), b = mk('button', 'play'); v.playsInline = true; v.preload = 'none'; v.poster = S.poster; v.setAttribute('disablepictureinpicture', ''); v.setAttribute('controlslist', 'nodownload');
      b.type = 'button'; b.setAttribute('aria-label', S.name + '（サビ15秒）を見る'); b.append(document.createElement('i'), mk('b', null, '見る'), mk('small', null, 'サビ 15秒'));
      b.addEventListener('click', () => { if (H.audio) H.audio(); stopAll(v); b.hidden = true; v.src = S.clip; v.setAttribute('controls', ''); const pr = v.play(); if (pr && pr.catch) pr.catch(() => { /* 自動で始まらなくても、操作の枠から押せる */ }); });
      v.addEventListener('play', () => { stopAll(v); if (!ducked && H.duck && H.duck(true)) ducked = true; });   // 動画の音と、BGM が重ならないように
      v.addEventListener('ended', unduck);
      v.addEventListener('error', () => { if (!v.getAttribute('src')) return; reset(v); unduck(); });
      st.append(v, b); }
    else st.append(mk('div', 'soon', '準備中'));
    tx.append(mk('b', null, S.name), mk('small', null, S.ja + '｜' + S.note));
    let f; if (S.yt) { f = mk('a', 'full', 'MVを一曲ぜんぶ見る ›'); f.href = S.yt; f.target = '_blank'; f.rel = 'noopener noreferrer'; } else { f = mk('span', 'full', S.clip ? 'MVの全編は、近日公開' : '近日公開'); f.setAttribute('aria-disabled', 'true'); }
    c.append(st, tx, f); L.append(c); } }
export const theaterOpen = () => !$('theaterUI').hidden;
export const theaterDucked = () => ducked;   // 検査用：町の BGM を止めているか
export function openTheater(hooks) { H = hooks || {}; build(); $('thBack').textContent = H.back || '‹ もどる'; $('theaterUI').hidden = false; $('theaterUI').scrollTop = 0;
  if (!wired) { wired = true; $('thBack').addEventListener('click', () => { if (H.tap) H.tap(); if (H.onBack) H.onBack(); else closeTheater(); }); } }
export function closeTheater() { if (!theaterOpen()) return; stopAll(null); unduck(); $('theaterUI').hidden = true; const f = H.onClose; if (f) f(); }
