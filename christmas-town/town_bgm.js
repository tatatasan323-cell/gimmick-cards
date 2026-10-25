// 港町のBGM（仕掛けの中は鳴らさない）。曲は、前もって書き出した音声ファイル（bgm_<曲>.m4a）を、再生器（audio 要素）で鳴らす
// 前は、その場で合成していた（共通/town_bgm_synth.js）。音の計算が画面の処理と CPU を取り合い、スマホで、波→花火のように処理が重なると曲が途切れた（本人 2026-10-25）
//   ファイルは 音楽/BGMをファイルにする.py が、合成の部品からそのまま書き出す。1つのファイル＝2回し（2回し目は旋律に音を重ねる曲がある）。終わりの響きは頭に重ねてあるので、くり返してもつながる
//   iPhone・iPad は、再生器の音量をページから変えられない。その時だけ Web Audio の音量を通す（メニューの「BGM の大きさ」）
//   再生器は1つだけ使い、曲を替える時は中身（src）を替える（iPhone は、新しい再生器を、さわっていない時に鳴らせない）
// 旋律の出典は town_bgm_synth.js の頭（どれも著作権の切れた曲。編曲と音色は自作）
const TRACKS = {   // round＝1回しの秒（小節の数×拍の数×1拍の秒。合成の部品と同じ。書き出しの道具が、ずれていないか確かめる）
  jingle: { name: 'ジングルベル', desc: 'そりの鈴と、ひづめの音', round: 32 * 4 * 0.44 },
  wish: { name: 'We Wish You a Merry Christmas', desc: 'きらきらの、オルゴール', round: 17 * 3 * 0.42 },
  silent: { name: 'きよしこの夜', desc: 'ギターと、しずかな夜', round: 24 * 6 * 0.36 },
  joy: { name: 'もろびとこぞりて', desc: 'ラッパと、ハンドベル', round: 20 * 2 * 0.56 },
  deck: { name: 'ひいらぎかざろう', desc: 'はじく弦と、チェレスタ', round: 16 * 4 * 0.47 },
  tannenbaum: { name: 'もみの木', desc: 'アコーディオンと、小さな鐘', round: 17 * 3 * 0.6 },
};
// メドレー：1曲を最後の小節まで（短い曲は40秒ほどになるまで繰り返して）鳴らしたら、ほかの曲へ。前の曲の終わりの0.6秒後に入る（合成の版と同じ長さ）
const medleySec = (id) => TRACKS[id].round * Math.max(1, Math.round(40 / TRACKS[id].round));
const fileSec = (id) => TRACKS[id].round * 2;
const VOL_OK = (() => { try { const a = document.createElement('audio'); a.volume = 0.5; return Math.abs(a.volume - 0.5) < 0.01; } catch (e) { return true; } })();   // iPhone・iPad は false（音量は本体のボタンだけ）
let ctx = null, el = null, gain = null, wanted = false, live = false, cur = 'jingle', medley = false, vol = 0.7, env = 0, fade = null, watch = null, loops = 0, lastT = 0, switching = false, gen = 0;
const level = () => { const v = Math.max(0, Math.min(1, env * vol)); if (gain) gain.gain.value = v; else if (el) el.volume = v; };
// 音量をなめらかに動かす（0.03秒ごと）。then＝終わったら
function ramp(to, sec, then) { if (fade) clearInterval(fade); const from = env, t0 = performance.now();
  fade = setInterval(() => { const u = Math.min(1, (performance.now() - t0) / (sec * 1000)); env = from + (to - from) * u; level(); if (u >= 1) { clearInterval(fade); fade = null; if (then) then(); } }, 30); }
function player() {
  if (el) return el;
  el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', '');
  if (!VOL_OK && ctx && ctx.createMediaElementSource) { try { const s = ctx.createMediaElementSource(el); gain = ctx.createGain(); s.connect(gain); gain.connect(ctx.destination); } catch (e) { gain = null; } }
  el.addEventListener('timeupdate', () => { if (el.currentTime + 1 < lastT) loops++; lastT = el.currentTime; });
  el.addEventListener('ended', () => { if (wanted && medley) next(); });
  return el; }
const play = () => { if (!el || !wanted) return; const p = el.play(); if (p && p.catch) p.catch(() => { /* さわった時に、もう一度 */ }); };
// 曲を頭から鳴らす（0.3秒で大きくなる＝合成の版と同じ入り方）
function begin(id) { player(); cur = id; gen++; loops = 0; lastT = 0; switching = false; const src = `bgm_${id}.m4a`;
  if (!el.src.endsWith(src)) el.src = src; else el.currentTime = 0;
  el.loop = !medley; env = 0; level(); play(); ramp(1, 0.3); }
// メドレーの見回り：決めた長さの0.3秒前から消して、0.6秒あけて次の曲へ
function check() { if (!wanted || !medley || switching || !el || el.paused) return; if (loops * fileSec(cur) + el.currentTime >= medleySec(cur) - 0.3) next(); }
function next() { if (switching) return; switching = true; const g = gen, ids = Object.keys(TRACKS).filter((k) => k !== cur), id = ids[Math.floor(Math.random() * ids.length)];
  ramp(0, 0.28, () => { if (g !== gen) return; el.pause(); setTimeout(() => { if (g !== gen || !wanted) return; begin(id); if (BGM.onChange) BGM.onChange(cur); }, 600); }); }
function start() { if (live) return; live = true; begin(cur); if (!watch) watch = setInterval(check, 100); }
function stop() { live = false; gen++; switching = false; if (watch) { clearInterval(watch); watch = null; } if (!el) return; const g = gen; ramp(0, 0.45, () => { if (g === gen && !wanted) el.pause(); }); }
// 音の部屋（AudioContext）が止まった時（見えていない・ほかの港町の画面が鳴りはじめた）は、BGM も止める。動きだしたら続きから
function follow() { if (!ctx || !el) return; if (ctx.state === 'running') { if (wanted && el.paused && !switching) play(); } else if (!el.paused) el.pause(); }
// 一度止められた再生（スマホの自動再生の決まり）は、次にさわった時に、もう一度
addEventListener('pointerup', () => { if (wanted && el && el.paused && !switching && (!ctx || ctx.state === 'running')) play(); }, { capture: true });
export const BGM = {
  tracks: Object.keys(TRACKS).map((id) => ({ id, name: TRACKS[id].name, desc: TRACKS[id].desc })),
  // ac＝効果音と同じ音の部屋（最初のタップで作られる。iPhone の音量と、止める・動かすを合わせるのに使う）。on＝鳴らすか
  set(ac, on) { if (ac && ac !== ctx) { ctx = ac; ctx.addEventListener('statechange', follow); } wanted = !!on; if (on) { if (ctx && ctx.state !== 'running') ctx.resume(); start(); } else stop(); },
  get on() { return wanted; }, get track() { return cur; },
  get volume() { return vol; }, setVolume(v) { vol = Math.max(0, Math.min(1.5, v)); level(); },
  // メドレー（オンにすると、曲が終わるたびに、ほかの曲へランダムに変わる）。onChange＝曲が変わった時に呼ぶ（メニューの表示を合わせる）
  get medley() { return medley; }, setMedley(on) { medley = !!on; if (el) el.loop = !medley; },
  // 鳴っている時は、前の曲をすっと消しながら、次の曲を頭から始める
  setTrack(id) { if (!TRACKS[id] || id === cur) return; cur = id; if (wanted && el) { const g = ++gen; ramp(0, 0.2, () => { if (g === gen) begin(id); }); } },
  // 確かめる時に使う：いま鳴らしているファイル・止まっているか・音量／曲の途中へ飛ぶ（メドレーの切りかえ）
  state: () => ({ src: el ? el.src.split('/').pop() : null, paused: el ? el.paused : true, t: el ? +el.currentTime.toFixed(2) : 0, level: +(env * vol).toFixed(3), webaudio: !!gain }),
  seek(t) { if (!el) return false; el.currentTime = t; lastT = t; return true; },
};
