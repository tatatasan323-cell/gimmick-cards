// 宝石の美術館の音：宝石ごとの音色（鐘・チェレスタ・グラスハーモニカ・オルゴール・マリンバ・ハープ・カリンバ・ビブラフォン・歌う器）
// どの宝石も同じ音階（ハ長調の五音）の上にあるので、続けて触っても曲になる。壊れる音（ピキッ・ガシャーン・パリン・ゴトン）と、戻る時の上っていく音
let ac = null, out = null, noise = null;
export function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.85; const lim = ac.createDynamicsCompressor(); lim.threshold.value = -8; lim.ratio.value = 8; lim.attack.value = 0.003; lim.release.value = 0.25; out.connect(lim); lim.connect(ac.destination); }   // 大きな音（クリスタルが砕ける）でも割れないよう、出口で抑える
  if (ac.state !== 'running') ac.resume();
  return ac;
}
const r = (a, b) => a + Math.random() * (b - a), live = () => ac && ac.state === 'running';
const safe = (fn) => (...a) => { if (!live()) return; try { fn(...a); } catch (e) { /* 音が出なくても遊べる */ } };
// 同時に鳴っている音の数を数え、多すぎる時は新しい音を省く（大クリスタルが倒れると、崩れた展示が一斉に戻って700近く重なり、スマホでは途中から無音になった）
// ふだんの音は CAP まで。大クリスタルの音（軋む・砕ける・よみがえる・旋律）は優先して、その倍まで鳴らす
let act = 0, HI = 0; const CAP = 150;
const room = () => act < (HI ? CAP * 2 : CAP), go = (o) => { act++; o.onended = () => { act--; }; };
const hi = (fn) => safe((...a) => { HI++; try { fn(...a); } finally { HI--; } });
export const voices = () => act;
function partial(f, vol, t, dur, atk = 0.002, type = 'sine') { if (f > 15000 || f < 20 || !room()) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); go(o); }
const noiseBuf = () => { if (!noise) { noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noise; };
function hiss(vol, t, dur, type, freq, q = 0.8) { if (!room()) return; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noiseBuf(); f.type = type; f.frequency.value = freq; f.Q.value = q; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); go(s); }
function glide(f0, f1, vol, t, dur, type = 'sine') { if (!room()) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); go(o); }
function wobble(f, vol, t, dur, atk, rate, depth, type = 'sine') { if (!room()) return; const o = ac.createOscillator(), g = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); o.type = type; o.frequency.value = f; l.frequency.value = rate; lg.gain.value = f * depth; l.connect(lg); lg.connect(o.frequency); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); l.start(t); o.stop(t + dur + 0.02); l.stop(t + dur + 0.02); go(o); }
function tremolo(f, vol, t, dur, rate) { if (!room()) return; const o = ac.createOscillator(), g = ac.createGain(), am = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); o.frequency.value = f; l.frequency.value = rate; lg.gain.value = 0.45; am.gain.value = 0.55; l.connect(lg); lg.connect(am.gain); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(am); am.connect(g); g.connect(out); o.start(t); l.start(t); o.stop(t + dur + 0.02); l.stop(t + dur + 0.02); go(o); }
function pluck(f, vol, t, dur) { if (!room()) return; const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.Q.value = 2; lp.frequency.setValueAtTime(f * 7, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.35); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); go(o); }

// 音階：ハ長調の五音（ド・レ・ミ・ソ・ラ）を2オクターブと少し
export const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98, 1760, 2093];
// 音色：f＝高さ、v＝大きさ、t＝鳴らす時刻
const TIMBRE = {
  bell: (f, v, t) => { for (const [m, a, d] of [[0.5, 0.5, 2.6], [1, 1, 2.2], [2.76, 0.4, 1.2], [5.4, 0.2, 0.6], [8.93, 0.08, 0.3]]) partial(f * m, v * a, t, d, 0.002); },                // 鐘
  celesta: (f, v, t) => { for (const [m, a, d] of [[1, 1, 1.1], [2, 0.3, 0.5], [4, 0.18, 0.22], [10.2, 0.05, 0.08]]) partial(f * m, v * a, t, d, 0.0015); },                              // チェレスタ
  glass: (f, v, t) => { wobble(f, v * 0.75, t, 2.6, 0.14, 5.5, 0.004); partial(f * 2, v * 0.12, t + 0.05, 1.6, 0.12); },                                                                    // グラスハーモニカ
  musicbox: (f, v, t) => { f *= 2; partial(f, v * 0.7, t, 1.0, 0.001); partial(f * 3, v * 0.18, t, 0.3, 0.001); partial(f * 5.2, v * 0.06, t, 0.12, 0.001); },                             // オルゴール
  marimba: (f, v, t) => { f /= 2; partial(f, v, t, 0.55, 0.002); partial(f * 4, v * 0.3, t, 0.09, 0.001); partial(f * 9.9, v * 0.08, t, 0.03, 0.001); },                                   // マリンバ
  harp: (f, v, t) => { pluck(f / 2, v * 0.55, t, 1.7); partial(f, v * 0.25, t, 1.2, 0.003); },                                                                                              // ハープ
  kalimba: (f, v, t) => { partial(f, v, t, 1.1, 0.001); partial(f * 5.95, v * 0.22, t, 0.1, 0.001); partial(f * 2, v * 0.1, t, 0.4, 0.001); },                                              // カリンバ
  vibes: (f, v, t) => { tremolo(f, v * 0.8, t, 2.0, 5.5); partial(f * 4, v * 0.12, t, 0.25, 0.002); },                                                                                       // ビブラフォン
  crystal: (f, v, t) => { partial(f, v * 0.7, t, 3.2, 0.02); partial(f * 1.003, v * 0.5, t, 3.0, 0.02); partial(f * 2.71, v * 0.18, t, 1.4, 0.02); partial(f * 5.1, v * 0.06, t, 0.6, 0.02); }, // 歌う器（うなりのある長い響き）
};
export const TIMBRES = Object.keys(TIMBRE);
let lastNote = 0;
export const note = safe((kind, k, vol = 1) => { const now = performance.now(); if (now - lastNote < 40) return; lastNote = now; TIMBRE[kind](SCALE[Math.max(0, Math.min(SCALE.length - 1, k))], 0.09 * vol, ac.currentTime); });
// 戻る時：その宝石の音色で、5つ上っていって、最後に和音。いくつも同時に戻る時（大クリスタルが倒れたあと）は、2つ目からは1音だけ
let lastRestore = -9;
export const restore = safe((kind, k) => { const t = ac.currentTime; if (t - lastRestore < 1.6) { TIMBRE[kind](SCALE[Math.min(SCALE.length - 1, k + 2)], 0.04, t + r(0.1, 0.6)); return; } lastRestore = t; for (let i = 0; i < 5; i++) TIMBRE[kind](SCALE[Math.min(SCALE.length - 1, k + i)] / (i < 2 ? 2 : 1), 0.05, t + 0.12 + i * 0.32); for (const d of [0, 2, 4]) TIMBRE[kind](SCALE[Math.min(SCALE.length - 1, k + d)], 0.045, t + 1.9); for (let i = 0; i < 6; i++) partial(r(3000, 7000), 0.008, t + r(0, 1.8), r(0.2, 0.6), 0.01); });
// ふつうの、きらめきの粒
export const shimmer = safe(() => { const t = ac.currentTime; for (let i = 0; i < 4; i++) partial(r(3500, 7500), 0.01, t + r(0, 0.25), r(0.2, 0.5), 0.01); });
// 長押し：ガラスが軋む「ピキッ」（強さ 0〜1）
export const creak = safe((k) => { const t = ac.currentTime; hiss(0.05 + k * 0.1, t, 0.025, 'highpass', 3000 + k * 2000); partial(r(2500, 4200) * (1 + k * 0.3), 0.02 + k * 0.03, t, 0.06, 0.001); });
// 割れる・落ちる
export const shatter = safe((big = 1) => { const t = ac.currentTime; hiss(0.28 * big, t, 0.6, 'bandpass', 3200, 0.7); hiss(0.14 * big, t, 0.25, 'highpass', 6500); glide(160, 60, 0.12 * big, t, 0.3); for (let i = 0; i < 22; i++) partial(r(2000, 9000), r(0.008, 0.03), t + r(0, 0.7), r(0.05, 0.25)); });   // ガラス：ガシャーン
export const gemBreak = safe((hard = 7) => { const t = ac.currentTime, f = 2400 + hard * 200; hiss(0.2, t, 0.05, 'highpass', 5000); partial(f, 0.05, t, 0.35, 0.001); partial(f * 1.53, 0.03, t, 0.25, 0.001); for (let i = 0; i < 14; i++) partial(r(3000, 9500), r(0.008, 0.025), t + r(0, 0.4), r(0.05, 0.2)); });   // 宝石：パリン
export const fall = safe(() => { const t = ac.currentTime; glide(900, 220, 0.06, t, 0.5); hiss(0.04, t, 0.35, 'bandpass', 1200, 1.5); });   // 浮いていた光が消えて落ちる：ヒュゥン
export const knock = safe(() => { const t = ac.currentTime; glide(260, 120, 0.12, t, 0.12); hiss(0.08, t, 0.03, 'bandpass', 900, 1.2); });   // 台から押し出される：ゴトッ
// 床に当たる：硬いほど高く澄む。やわらかい石はコトッ
export const clink = safe((hard = 7, strength = 1) => {
  const t = ac.currentTime, v = Math.min(0.22, 0.04 + strength * 0.18), soft = hard < 4.5, f0 = (soft ? 700 : 1500 + hard * 160) * r(0.95, 1.05);
  hiss(v * 0.6, t, soft ? 0.03 : 0.012, 'highpass', 3000); glide(soft ? 240 : 170, soft ? 160 : 120, v * 0.45, t, 0.07);
  if (soft) { partial(f0, v * 0.35, t, 0.13); partial(f0 * 2.1, v * 0.12, t, 0.06); return; }
  for (const [m, a, d] of [[1, 1, 0.9], [2.62, 0.5, 0.5], [4.13, 0.28, 0.3], [5.9, 0.12, 0.18]]) partial(f0 * m, v * 0.45 * a, t, d * (0.6 + hard * 0.05), 0.0015);
});
export const tinkle = safe(() => { partial(r(3000, 8000), 0.012, ac.currentTime, r(0.05, 0.15), 0.001); });   // ガラスの破片が床に散る

// ---------- ホールの真ん中の、大きな虹色のクリスタル ----------
// オリジナルのワルツ（ハ長調・3拍子）。触るたびに1節（2小節）ずつ進む。旋律はチェレスタ、2・3拍目の和音はハープ、1拍目の低音はグラスハーモニカ
const MIDI = (n) => 440 * Math.pow(2, (n - 69) / 12);
const WALTZ = [
  { mel: [[0, 76], [1, 79], [2, 84], [3, 83], [5, 79]], bars: [[48, [64, 67, 72]], [43, [62, 65, 71]]] },
  { mel: [[0, 81], [1, 79], [2, 76], [3, 79], [5, 76]], bars: [[45, [64, 69, 72]], [40, [64, 67, 71]]] },
  { mel: [[0, 77], [1, 76], [2, 74], [3, 72], [4, 76], [5, 79]], bars: [[41, [65, 69, 72]], [48, [64, 67, 72]]] },
  { mel: [[0, 81], [1, 79], [2, 77], [3, 76], [4.5, 84]], bars: [[43, [65, 71, 74]], [48, [64, 67, 72]]] },
];
let wIdx = 0, wFree = 0;
// 1節を鳴らす（前の節が鳴っている間なら、そのあとにつなげる）。返り値＝鳴りはじめるまでの秒
export const crystalPhrase = hi((vol = 1) => { const beat = 0.42, t = Math.max(ac.currentTime + 0.03, wFree); if (t - ac.currentTime > 3) return; const P = WALTZ[wIdx++ % WALTZ.length];
  for (const [b, n] of P.mel) { TIMBRE.celesta(MIDI(n), 0.085 * vol, t + b * beat); TIMBRE.crystal(MIDI(n - 12), 0.012 * vol, t + b * beat); }
  P.bars.forEach(([bass, ch], k) => { const t0 = t + k * 3 * beat; TIMBRE.glass(MIDI(bass + 12), 0.045 * vol, t0); for (const bb of [1, 2]) for (const c of ch) TIMBRE.harp(MIDI(c + 12), 0.03 * vol, t0 + bb * beat); });
  for (let i = 0; i < 5; i++) partial(r(4000, 8000), 0.007 * vol, t + r(0, 2.4), r(0.2, 0.5), 0.01);
  wFree = t + 6 * beat; });
// ひびの入る音：低く、重く（強さ 0〜1）
export const creakBig = hi((k) => { const t = ac.currentTime; glide(180 + k * 60, 90, 0.06 + k * 0.08, t, 0.35, 'triangle'); hiss(0.05 + k * 0.08, t, 0.08, 'bandpass', 1800 + k * 1500, 1.5); partial(r(1200, 2200), 0.03 + k * 0.04, t, 0.4, 0.002); });
// 倒れはじめる：ゴゴゴ…と軋みながら傾く
export const groan = hi(() => { const t = ac.currentTime; glide(140, 60, 0.12, t, 1.2, 'sawtooth'); hiss(0.06, t, 1.1, 'lowpass', 500, 0.8); for (let i = 0; i < 6; i++) partial(r(900, 2400), 0.02, t + i * 0.16, 0.25, 0.003); });
// 床に倒れて砕ける：床が揺れるドーン・大きなガラスが砕けるガシャーン・破片の雨・虹の響き
export const megaCrash = hi(() => { const t = ac.currentTime;
  glide(95, 26, 0.42, t, 1.8); glide(150, 38, 0.22, t, 1.0, 'triangle'); hiss(0.3, t, 1.5, 'lowpass', 380, 0.7);
  hiss(0.32, t + 0.02, 1.3, 'bandpass', 2600, 0.6); hiss(0.2, t + 0.02, 0.7, 'highpass', 6000);
  for (let i = 0; i < 60; i++) partial(r(1800, 9500), r(0.008, 0.035), t + r(0, 2.4), r(0.05, 0.4));
  for (const n of [72, 76, 79, 83, 86]) TIMBRE.crystal(MIDI(n), 0.03, t + 0.4); });
// よみがえる：虹のかけらが集まって、上っていく響きと和音
export const crystalRise = hi(() => { const t = ac.currentTime; for (let i = 0; i < 10; i++) TIMBRE.celesta(MIDI(60 + [0, 4, 7, 12, 16, 19, 24, 28, 31, 36][i]), 0.05, t + i * 0.18); for (const n of [60, 64, 67, 72]) TIMBRE.glass(MIDI(n + 12), 0.04, t + 1.9); });
