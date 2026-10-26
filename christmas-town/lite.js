// かるい表示（画質の段）。重い端末では、描く細かさ・1秒のコマ数・降る物や宙の物の数を下げて、動きと音を守る
//   本人 2026-10-26「基本は自動で重さを変えるけど、今どのレートを使っているかは画面の端にでもリアルタイムで表示して。そこを100%にしたい人は設定で固定してね」
// ・段は 100・70・50。段ごとの中身（つまみ）はページが onChange で決める。ここが持つのは、段・画素の倍率の上限・1秒のコマ数の上限と、自動の上げ下げ
// ・自動：描いた1コマごとに「手間（そのコマの処理の時間）」と「間隔」を記録し、窓（ひらいて8秒までは1.5秒、その後は3秒）ごとに見る
//   手間の割合（手間の合計÷時間）が5割を超える、または間隔が決めた間隔の1.3倍を超えた窓が、続けて2つあったら1段下げる（成果物の基本 2. 動き：5割を超えると音と指が取りこぼされる）
//   1つの窓だけ重いのは一瞬の重さ（ステンドグラスの窓を続けて割る・花火）なので下げない。前は1つで下げて、窓を割っただけで70%に落ち、戻るまで45秒かかった（2026-10-26）
//   CPU4倍遅くした検査では、コマは決めた数に間に合ったまま、主スレッドが6〜9割だった（2026-10-26 港町・美術館）。間隔だけを見ると下がらないので、手間の割合も見る
//   上げるのはゆっくり：1段上で見込まれる手間の割合が4割未満で、間隔も守れている窓が15秒続き、前の切りかえから30秒たった時だけ1段
//   上げて20秒以内にまた下げたら、そのページでは、もう上げない（行ったり来たりしない）
// ・100%で固定：この端末に覚える（localStorage）。使えない画面では、このページの中だけ
// ・自動で決まった段は、ページごとにこの端末に覚え、次はその段から始める（ひらくたびに 100→70→50 と目に見えて切りかわらないように）
// ・?fps&lite=50 などで段を固定（検査用。?fps の時だけ。人に送るリンクに付いても効かない）
export const LITE_KEY = 'xmas-town-lite', LITE_AUTO_KEY = 'xmas-town-lite-auto';
export const STEPS = [100, 70, 50];
const MEM = {};   // localStorage が使えない画面の、このページの中だけの記憶
const getLS = (k) => { if (k in MEM) return MEM[k]; try { return localStorage.getItem(k); } catch (e) { return null; } };
const setLS = (k, v) => { MEM[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* このページの中だけ */ } };
const WIN_EARLY = 1500, WIN = 3000, EARLY = 8000, DOWN_LOAD = 0.5, DOWN_LATE = 1.3, DOWN_RUN = 2, UP_LOAD = 0.4, UP_LATE = 1.1, UP_RUN = 15000, UP_AFTER = 30000, BOUNCE = 20000;

// page＝ページの名前（段を覚える鍵）／levels＝{ 100: { dpr, fps }, 70: {…}, 50: {…} }（fps＝1秒のコマ数の上限。null はページのまま）
// baseGap()＝ページが決めるコマの間隔（ms）／onChange(lv, why)＝段が変わった時（画素の倍率と、ページのつまみを当てる）／tag＝画面の端の札
export function makeLite({ page, levels, baseGap, onChange, tag }) {
  const q = new URLSearchParams(location.search), forced = q.has('fps') && STEPS.includes(Number(q.get('lite'))) ? Number(q.get('lite')) : 0;
  const readAuto = () => { try { return JSON.parse(getLS(LITE_AUTO_KEY) || '{}') || {}; } catch (e) { return {}; } };
  let fixed = getLS(LITE_KEY) === '100', saved = readAuto()[page];
  let lv = forced || (fixed ? 100 : STEPS.includes(saved) ? saved : 100);
  const W = { work: 0, span: 0, late: [] }, log = [];
  let last = 0, born = 0, lastChange = 0, lastUp = -1e9, upBlocked = false, okRun = 0, heavy = 0, stat = { load: 0, late: 1 };
  const fpsOf = (l) => levels[l].fps || 1000 / baseGap();
  const gap = (l = lv) => Math.max(baseGap(), levels[l].fps ? 1000 / levels[l].fps : 0);
  const dpr = () => Math.min(devicePixelRatio || 1, levels[lv].dpr);
  const reset = () => { W.work = 0; W.span = 0; W.late.length = 0; };
  function show() { if (!tag) return; tag.textContent = `画質 ${lv}%` + (fixed || forced ? ' 固定' : ''); tag.setAttribute('aria-label', `画質 ${lv}%` + (fixed || forced ? '（固定）' : '（重さに合わせて自動）')); }
  function set(n, why) { if (n === lv) return; lv = n; lastChange = performance.now(); okRun = 0; heavy = 0; reset(); log.push([Math.round(lastChange), n, why]);
    if (why === 'down' || why === 'up') { const a = readAuto(); a[page] = n; setLS(LITE_AUTO_KEY, JSON.stringify(a)); }
    show(); onChange(n, why); }
  function judge(now) {
    const late = W.late.slice().sort((a, b) => a - b)[W.late.length >> 1] || 1, load = W.work / W.span, i = STEPS.indexOf(lv); stat = { load, late };
    const over = load > DOWN_LOAD || late > DOWN_LATE; heavy = over ? heavy + 1 : 0;
    if (over && i < STEPS.length - 1) { okRun = 0; if (heavy >= DOWN_RUN) { if (now - lastUp < BOUNCE) upBlocked = true; set(STEPS[i + 1], 'down'); } return; }
    if (i === 0 || upBlocked || now - lastChange < UP_AFTER) { okRun = 0; return; }
    const up = STEPS[i - 1];
    if (load * fpsOf(up) / fpsOf(lv) < UP_LOAD && late < UP_LATE) { okRun += W.span; if (okRun >= UP_RUN) { lastUp = now; set(up, 'up'); } } else okRun = 0;
  }
  // 描いたコマの終わりに呼ぶ（t0＝そのコマの処理を始めた時刻）。描かなかったコマでは呼ばない
  function frame(t0) {
    const now = performance.now(), d = t0 - last;
    if (!born) born = now;
    if (last && d < 300 && !document.hidden) { W.work += now - t0; W.span += d; W.late.push(d / gap()); }
    else reset();   // 間があいた（隠れた・劇場の中・切りかえの直後）：窓を始めなおす
    last = t0;
    if (fixed || forced) return;
    if (W.span >= (now - born < EARLY ? WIN_EARLY : WIN)) { judge(now); reset(); }
  }
  function setFixed(on) { fixed = !!on; setLS(LITE_KEY, fixed ? '100' : 'auto'); if (fixed) set(100, 'fixed'); else { lastChange = performance.now(); upBlocked = false; reset(); } show(); }
  show();
  const api = { get lv() { return lv; }, get fixed() { return fixed || !!forced; }, gap, dpr, frame, setFixed, show,
    state: () => ({ lv, fixed: fixed || !!forced, forced: !!forced, dpr: dpr(), gap: +gap().toFixed(1), load: +stat.load.toFixed(3), late: +stat.late.toFixed(3), upBlocked, log: log.slice() }) };
  if (q.has('fps')) window.__lite = api;
  return api;
}
