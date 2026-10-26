// かるい表示（画質の段）。重い端末では、描く細かさ・1秒のコマ数・降る物や宙の物の数を下げて、動きと音を守る
//   本人 2026-10-26「基本は自動で重さを変えるけど、今どのレートを使っているかは画面の端にでもリアルタイムで表示して。そこを100%にしたい人は設定で固定してね」
// ・段は 100・70・50。段ごとの中身（つまみ）はページが onChange で決める。ここが持つのは、段・画素の倍率の上限・1秒のコマ数の上限と、自動の上げ下げ
// ・自動：描いた1コマごとに「手間（そのコマの処理の時間）」と「間隔」を記録し、窓（判定を始めて3秒までは1.5秒、その後は3秒）ごとに見る
//   手間の割合（手間の合計÷時間）が5割を超える、または間隔が決めた間隔の1.3倍を超えた窓が、続けて2つあったら1段下げる（成果物の基本 2. 動き：5割を超えると音と指が取りこぼされる）
//   1つの窓だけ重いのは一瞬の重さ（ステンドグラスの窓を続けて割る・花火）なので下げない。前は1つで下げて、窓を割っただけで70%に落ち、戻るまで45秒かかった（2026-10-26）
//   最初に下げる時は、もっと慎重に：続けて3つ（本人 2026-10-26「デフォルトは100%なのに、すぐに自動で落ちる」）
//   開いた直後（操作できるようになってから5秒）と、画面に戻った直後（2秒）は判定しない。絵の具の用意・絵の読み込み・物理の部品が届く時の一時的な重さで下げないため
//     （測った：CPU 2.5倍遅くした港町は、町に入ってから約3.5秒、手間の割合が 0.4〜0.45 と高く、その後 0.3 前後に落ち着いた。5秒はその余裕。戻った直後は、まねでは重さが出なかったので、提案どおり2秒）
//   CPU4倍遅くした検査では、コマは決めた数に間に合ったまま、主スレッドが6〜9割だった（2026-10-26 港町・美術館）。間隔だけを見ると下がらないので、手間の割合も見る
//   上げるのはゆっくり：1段上で見込まれる手間の割合が4割未満で、間隔も守れている窓が15秒続き、前の切りかえから30秒たった時だけ1段
//   上げて20秒以内にまた下げたら、そのページでは、もう上げない（行ったり来たりしない）
// ・自分で選ぶ：画面の端の「画質 ○%」の札をタップすると、その場で小さな選び窓（自動（おすすめ）・100%・70%・50%）。港町のメニューの「画質」も同じ4つ
//   選んだ段はこの端末に覚え（localStorage xmas-town-lite＝'auto'・'100'・'70'・'50'）、港町と部屋で共通。固定中の札は「画質 70% 固定」。使えない画面では、このページの中だけ
// ・自動で決まった段は、ページごとにこの端末に覚え、次はその段から始める（ひらくたびに 100→70→50 と目に見えて切りかわらないように）
//   覚える場所を 2026-10-27 に新しくした（前の判定は一時的な重さで下げていたので、その時に覚えた段は使わない）
// ・?fps&lite=50 などで段を固定（検査用。?fps の時だけ。人に送るリンクに付いても効かない）
export const LITE_KEY = 'xmas-town-lite', LITE_AUTO_KEY = 'xmas-town-lite-auto2';
export const STEPS = [100, 70, 50];
const MEM = {};   // localStorage が使えない画面の、このページの中だけの記憶
const getLS = (k) => { if (k in MEM) return MEM[k]; try { return localStorage.getItem(k); } catch (e) { return null; } };
const setLS = (k, v) => { MEM[k] = v; try { localStorage.setItem(k, v); } catch (e) { /* このページの中だけ */ } };
const WIN_EARLY = 1500, WIN = 3000, EARLY = 3000, DOWN_LOAD = 0.5, DOWN_LATE = 1.3, DOWN_RUN = 2, DOWN_RUN_FIRST = 3, UP_LOAD = 0.4, UP_LATE = 1.1, UP_RUN = 15000, UP_AFTER = 30000, BOUNCE = 20000;
const SETTLE_OPEN = 5000, SETTLE_BACK = 2000;
// 選び窓の見た目（札と同じ色。ページの外側に1つだけ置く）
const CSS = '.liteMenu{position:fixed;z-index:70;min-width:178px;padding:8px;border-radius:14px;background:rgba(30,18,8,.92);color:#ffe7c0;box-shadow:0 6px 24px rgba(0,0,0,.45);font:800 13px/1.4 "Hiragino Maru Gothic ProN","Yu Gothic UI",system-ui,sans-serif;letter-spacing:.03em}'
  + '.liteMenu[hidden]{display:none}.liteMenu b{display:block;padding:2px 6px 6px;font-size:12px;opacity:.85}'
  + '.liteMenu button{display:block;width:100%;margin:3px 0 0;padding:8px 10px;border-radius:10px;border:1.5px solid rgba(255,231,192,.35);background:rgba(255,231,192,.08);color:#ffe7c0;font:inherit;text-align:left}'
  + '.liteMenu button small{display:block;font-size:10.5px;font-weight:700;opacity:.75}.liteMenu button[aria-pressed=true]{background:#ffe7c0;color:#2a1a08;border-color:#ffe7c0}';
export const CHOICES = [['auto', '自動（おすすめ）', '重い時は、下げて動きと音を守る'], ['100', '100%', 'いちばんきれい'], ['70', '70%', ''], ['50', '50%', 'いちばん軽い']];

// page＝ページの名前（段を覚える鍵）／levels＝{ 100: { dpr, fps }, 70: {…}, 50: {…} }（fps＝1秒のコマ数の上限。null はページのまま）
// baseGap()＝ページが決めるコマの間隔（ms）／onChange(lv, why)＝段が変わった時（画素の倍率と、ページのつまみを当てる）／tag＝画面の端の札
// onPick()＝札をタップした・段を選んだ時（港町のヒントの「体験済み」に使う）
export function makeLite({ page, levels, baseGap, onChange, tag, onPick }) {
  const q = new URLSearchParams(location.search), forced = q.has('fps') && STEPS.includes(Number(q.get('lite'))) ? Number(q.get('lite')) : 0;
  const readAuto = () => { try { return JSON.parse(getLS(LITE_AUTO_KEY) || '{}') || {}; } catch (e) { return {}; } };
  const readChoice = () => { const v = Number(getLS(LITE_KEY)); return STEPS.includes(v) ? v : 0; };
  let fixedLv = readChoice(), saved = readAuto()[page];
  let lv = forced || fixedLv || (STEPS.includes(saved) ? saved : 100);
  const W = { work: 0, span: 0, late: [] }, log = [];
  let last = 0, born = 0, settle = 0, earlyEnd = 0, lastChange = 0, lastUp = -1e9, upBlocked = false, okRun = 0, heavy = 0, stat = { load: 0, late: 1 };
  const fpsOf = (l) => levels[l].fps || 1000 / baseGap();
  const gap = (l = lv) => Math.max(baseGap(), levels[l].fps ? 1000 / levels[l].fps : 0);
  const dpr = () => Math.min(devicePixelRatio || 1, levels[lv].dpr);
  const reset = () => { W.work = 0; W.span = 0; W.late.length = 0; };
  const fixedNow = () => !!(fixedLv || forced);
  function show() { if (!tag) return; tag.textContent = `画質 ${lv}%` + (fixedNow() ? ' 固定' : ''); tag.setAttribute('aria-label', `画質 ${lv}%` + (fixedNow() ? '（固定）' : '（重さに合わせて自動）') + '。タップで選べます'); }
  function set(n, why) { if (n === lv) return; lv = n; lastChange = performance.now(); okRun = 0; heavy = 0; reset(); log.push([Math.round(lastChange), n, why]);
    if (why === 'down' || why === 'up') { const a = readAuto(); a[page] = n; setLS(LITE_AUTO_KEY, JSON.stringify(a)); }
    show(); onChange(n, why); }
  function judge(now) {
    const late = W.late.slice().sort((a, b) => a - b)[W.late.length >> 1] || 1, load = W.work / W.span, i = STEPS.indexOf(lv); stat = { load, late };
    const over = load > DOWN_LOAD || late > DOWN_LATE; heavy = over ? heavy + 1 : 0;
    const need = log.some((x) => x[2] === 'down') ? DOWN_RUN : DOWN_RUN_FIRST;   // 最初に下げる時だけ、続けて3つ
    if (over && i < STEPS.length - 1) { okRun = 0; if (heavy >= need) { if (now - lastUp < BOUNCE) upBlocked = true; set(STEPS[i + 1], 'down'); } return; }
    if (i === 0 || upBlocked || now - lastChange < UP_AFTER) { okRun = 0; return; }
    const up = STEPS[i - 1];
    if (load * fpsOf(up) / fpsOf(lv) < UP_LOAD && late < UP_LATE) { okRun += W.span; if (okRun >= UP_RUN) { lastUp = now; set(up, 'up'); } } else okRun = 0;
  }
  // 画面に戻った直後は、しばらく判定しない
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { settle = Math.max(settle, performance.now() + SETTLE_BACK); reset(); heavy = 0; } });
  // 描いたコマの終わりに呼ぶ（t0＝そのコマの処理を始めた時刻）。描かなかったコマでは呼ばない
  function frame(t0) {
    const now = performance.now(), d = t0 - last;
    if (!born) { born = now; settle = now + SETTLE_OPEN; earlyEnd = settle + EARLY; }   // 操作できるようになった時（ページが呼びはじめた時）から5秒は判定しない。その後3秒は短い窓（戻った後は短くしない）
    const quiet = now < settle;
    if (last && d < 300 && !document.hidden && !quiet) { W.work += now - t0; W.span += d; W.late.push(d / gap()); }
    else reset();   // 間があいた（隠れた・劇場の中・切りかえの直後）・落ち着くのを待つ間：窓を始めなおす
    last = t0;
    if (fixedNow() || quiet) return;
    if (W.span >= (now < earlyEnd ? WIN_EARLY : WIN)) { judge(now); reset(); }
  }
  // 選ぶ：'auto'（自動）か、100・70・50（その段で固定）
  function choose(v) {
    const n = Number(v); fixedLv = STEPS.includes(n) ? n : 0; setLS(LITE_KEY, fixedLv ? String(fixedLv) : 'auto');
    if (fixedLv) set(fixedLv, 'fixed'); else { lastChange = performance.now(); upBlocked = false; heavy = 0; reset(); }
    show(); if (menu && !menu.hidden) drawMenu(); if (onPick) onPick(); }
  const setFixed = (on) => choose(on ? 100 : 'auto');
  // ---- 札をタップすると開く、小さな選び窓 ----
  let menu = null;
  function drawMenu() {
    menu.textContent = ''; const t = document.createElement('b'); t.textContent = `画質（いま ${lv}%・${fixedNow() ? '固定' : '自動'}）`; menu.append(t);
    for (const [v, name, sub] of CHOICES) { const b = document.createElement('button'); b.type = 'button'; b.dataset.v = v; b.setAttribute('aria-pressed', String(v === 'auto' ? !fixedLv : fixedLv === Number(v)));
      b.textContent = name; if (sub) { const s = document.createElement('small'); s.textContent = sub; b.append(s); }
      b.addEventListener('click', (e) => { e.stopPropagation(); choose(v); closeMenu(); }); menu.append(b); }
  }
  function place() { const r = tag.getBoundingClientRect(), below = r.top + r.height / 2 < innerHeight / 2; menu.style.right = Math.max(8, innerWidth - r.right) + 'px';
    if (below) { menu.style.top = r.bottom + 6 + 'px'; menu.style.bottom = ''; } else { menu.style.bottom = innerHeight - r.top + 6 + 'px'; menu.style.top = ''; } }
  const outside = (e) => { if (menu && !menu.hidden && !menu.contains(e.target) && e.target !== tag) closeMenu(); };   // 外をさわったら閉じる（その指は、そのまま遊びに使われる）
  function openMenu() {
    if (!menu) { if (!document.getElementById('liteMenuCss')) { const s = document.createElement('style'); s.id = 'liteMenuCss'; s.textContent = CSS; document.head.append(s); }
      menu = document.createElement('div'); menu.className = 'liteMenu'; menu.id = 'liteMenu'; menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', '画質をえらぶ'); menu.hidden = true; document.body.append(menu);
      addEventListener('pointerdown', outside, { capture: true }); addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); }); addEventListener('resize', () => { if (!menu.hidden) place(); }); }
    drawMenu(); menu.hidden = false; place(); if (onPick) onPick();
  }
  function closeMenu() { if (menu) menu.hidden = true; }
  if (tag) { tag.style.pointerEvents = 'auto'; tag.style.cursor = 'pointer'; tag.setAttribute('role', 'button'); tag.tabIndex = 0;
    tag.addEventListener('pointerdown', (e) => e.stopPropagation());   // 札の上の指は、遊び（なぞる・さわる）に渡さない
    tag.addEventListener('click', (e) => { e.stopPropagation(); if (menu && !menu.hidden) closeMenu(); else openMenu(); });
    tag.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMenu(); } }); }
  show();
  const api = { get lv() { return lv; }, get fixed() { return fixedNow(); }, get choice() { return fixedLv ? String(fixedLv) : 'auto'; }, gap, dpr, frame, choose, setFixed, show, openMenu, closeMenu,
    state: () => ({ lv, fixed: fixedNow(), forced: !!forced, choice: fixedLv ? String(fixedLv) : 'auto', dpr: dpr(), gap: +gap().toFixed(1), load: +stat.load.toFixed(3), late: +stat.late.toFixed(3), upBlocked, quiet: performance.now() < settle, menu: !!(menu && !menu.hidden), log: log.slice() }) };
  if (q.has('fps')) window.__lite = api;
  return api;
}
