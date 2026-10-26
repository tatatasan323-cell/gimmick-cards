// 氷の彫像の音：ノミの「コンッ」・機械の「ギュイーン」・宝石が外れる「ポロッ」・大理石に落ちる「ドスン＋カツーン」（硬い宝石ほど高く澄む。やわらかい石は「コトッ」）
// 氷が折れる「ピキッ」・砕ける「ガシャーン」・拾う「キラン」・雪で下から組み上がる時の鈴・ゼリーの木の「ぷるん」
// どれも短い音を、その場で合成する（機械の音だけは、なぞっている間だけ鳴り続ける）。続けて鳴る時は間引く
import { makeSound, r } from './sound_core.js';
// 音の部屋・出口・同時に鳴る数・雑音・澄んだ1音・短い雑音は共通の土台（共通/sound_core.js）。この部屋は：大きさ0.9・抑える部品なし（前のまま）
// 同時に鳴る部品は160まで（港町と同じ。前はこの部屋だけ数えておらず、美術館・ステンドグラスで起きた「途中から無音」の守りが無かった）
const SC = makeSound({ gain: 0.9, cap: 160 });
let ac = null, out = null, lastChisel = 0, lastCarve = 0;
export function audio() { ac = SC.audio(); out = SC.out; return ac; }
export const voices = SC.voices;
const live = SC.running, partial = SC.partial, noiseBuf = SC.noise, hiss = SC.hissAt;
function glide(f0, f1, vol, t, dur) { if (!SC.room()) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); SC.track(o); }
const safe = (fn) => (...a) => { if (!live()) return; try { fn(...a); } catch (e) { /* 音が出なくても遊べる */ } };

// ノミ：木づちで打つ「コンッ」＋鋼の小さな響き＋氷のかけらが散る「チリッ」
export const chisel = safe(() => {
  const now = performance.now(); if (now - lastChisel < 60) return; lastChisel = now; const t = ac.currentTime;
  hiss(0.2, t, 0.018, 'bandpass', r(1500, 2100), 2.2); glide(r(820, 960), r(520, 600), 0.16, t, 0.06);
  partial(r(3000, 3300), 0.025, t, 0.14, 0.001); partial(r(4600, 5000), 0.012, t, 0.09, 0.001);
  for (let i = 0; i < 4; i++) partial(r(4200, 7500), r(0.008, 0.018), t + r(0.02, 0.1), r(0.03, 0.07));
});
// 機械：なぞっている間だけ鳴る。モーターのうなり（削る量で回転が上がる）＋氷を削るザーッ
let mach = null;
export const grindStart = safe(() => {
  if (mach) return; const t = ac.currentTime, g = ac.createGain(); g.gain.value = 0.0001; g.connect(out);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 3; lp.connect(g);
  const o1 = ac.createOscillator(), o2 = ac.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = 92; o2.frequency.value = 185.5; const g2 = ac.createGain(); g2.gain.value = 0.35; o1.connect(lp); o2.connect(g2); g2.connect(lp);
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 23; lg.gain.value = 6; lfo.connect(lg); lg.connect(o1.frequency);
  const s = ac.createBufferSource(); s.buffer = noiseBuf(); s.loop = true; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.9; const ng = ac.createGain(); ng.gain.value = 0.0001; s.connect(bp); bp.connect(ng); ng.connect(out);
  [o1, o2, lfo, s].forEach((n) => n.start(t)); g.gain.setTargetAtTime(0.07, t, 0.05);
  mach = { g, ng, o1, o2, lp, nodes: [o1, o2, lfo, s] };
});
export const grindLevel = safe((k) => { if (!mach) return; const t = ac.currentTime, v = Math.min(1, k); mach.o1.frequency.setTargetAtTime(92 + v * 70, t, 0.08); mach.o2.frequency.setTargetAtTime(185.5 + v * 140, t, 0.08); mach.lp.frequency.setTargetAtTime(1100 + v * 1500, t, 0.08); mach.g.gain.setTargetAtTime(0.06 + v * 0.06, t, 0.06); mach.ng.gain.setTargetAtTime(0.0001 + v * 0.12, t, 0.04); });
export const grinding = () => !!mach;   // 検査用：機械の音が鳴っているか
export function grindStop() { if (!mach || !ac) return; const m = mach, t = ac.currentTime; mach = null; try { m.g.gain.setTargetAtTime(0.0001, t, 0.06); m.ng.gain.setTargetAtTime(0.0001, t, 0.04); m.o1.frequency.setTargetAtTime(60, t, 0.15); m.nodes.forEach((n) => n.stop(t + 0.4)); } catch (e) { /* 同上 */ } }
export const carve = safe((amount = 1) => { const now = performance.now(); if (now - lastCarve < 70) return; lastCarve = now; const t = ac.currentTime; for (let i = 0; i < 2; i++) partial(r(3500, 6500), r(0.008, 0.016) * Math.min(1.3, 0.6 + amount), t + r(0, 0.05), r(0.03, 0.07)); });   // 機械で削れている時のチリチリ
export const pop = safe(() => { const t = ac.currentTime; glide(r(380, 460), r(820, 940), 0.09, t, 0.16); hiss(0.05, t, 0.05, 'highpass', 5000); [1568, 2349].forEach((f, i) => partial(f, 0.03, t + 0.05 + i * 0.07, 0.8, 0.01)); });   // 宝石が外れる：ポロッ（キラン）
// 大理石に落ちる：まずドスン（重さ）、硬さ（1〜10）で高さと澄み方が変わるカツーン。strength＝ぶつかる勢い（0〜1）
export const clink = safe((hard = 7, size = 0.3, strength = 1, first = false) => {
  const t = ac.currentTime, v = Math.min(0.28, 0.05 + strength * 0.22), soft = hard < 4.5, f0 = (soft ? 620 : 1300 + hard * 140) * (0.3 / Math.max(0.12, size)) ** 0.35 * r(0.95, 1.05);
  if (first) { glide(120, 46, 0.3 * Math.min(1, strength + 0.3), t, 0.35); hiss(0.08, t, 0.09, 'lowpass', 400); }   // ドスン
  hiss(v * 0.6, t, soft ? 0.03 : 0.012, 'highpass', 3000);
  glide(soft ? 240 : 170, soft ? 160 : 110, v * 0.5, t, soft ? 0.09 : 0.07);
  if (soft) { partial(f0, v * 0.35, t, 0.14); partial(f0 * 2.1, v * 0.12, t, 0.07); return; }
  for (const [m, a, d] of [[1, 1, 1.1], [2.62, 0.5, 0.65], [4.13, 0.28, 0.4], [5.9, 0.12, 0.22]]) partial(f0 * m, v * 0.45 * a, t, d * (0.6 + hard * 0.05), 0.0015);
});
// 氷が折れる：ピキッ
export const crack = safe(() => { const t = ac.currentTime; hiss(0.22, t, 0.035, 'highpass', 2500); glide(2600, 700, 0.07, t, 0.08); for (let i = 0; i < 5; i++) partial(r(2500, 6000), 0.015, t + r(0, 0.12), r(0.04, 0.1)); hiss(0.06, t + 0.1, 0.3, 'bandpass', 900, 0.6); });
// 砕ける：ガシャーン（大きいほど低く長く）。size＝0〜1
export const crash = safe((size = 0.5) => {
  const t = ac.currentTime, k = 0.4 + size * 0.6;
  glide(140 - size * 60, 40, 0.3 * k, t, 0.4 + size * 0.3); hiss(0.25 * k, t, 0.5 + size * 0.5, 'bandpass', 2800, 0.7); hiss(0.12 * k, t, 0.25, 'highpass', 6000);
  for (let i = 0; i < 10 + size * 18; i++) partial(r(1800, 8000), r(0.008, 0.03), t + r(0, 0.5 + size * 0.4), r(0.05, 0.3));
});
export const pick = safe(() => { const t = ac.currentTime; [1568, 2093, 3136].forEach((f, i) => partial(f, 0.05, t + i * 0.06, 0.6, 0.004)); partial(4186, 0.02, t + 0.2, 0.9, 0.01); });   // 拾う：キラン
// 雪が降りはじめる：高い鈴がゆっくり降りてくる／下から組み上がる段ごとに1音ずつ上る／戻りきった：澄んだ和音
const PENTA = [523.25, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637];
export const snowStart = safe(() => { const t = ac.currentTime; for (let i = 0; i < 6; i++) partial(PENTA[12 - i], 0.03, t + i * 0.26, 1.8, 0.04); });
export const rise = safe((k) => { const t = ac.currentTime, f = PENTA[Math.min(12, k)]; partial(f, 0.045, t, 1.4, 0.01); partial(f * 2, 0.015, t, 0.8, 0.01); partial(f * 1.5, 0.012, t + 0.04, 1.0, 0.02); });
export const sparkle = safe((k) => { partial(PENTA[6 + (k % 7)] * 2, 0.01, ac.currentTime, 0.7, 0.02); });
export const appear = safe(() => { const t = ac.currentTime; [2093, 2637, 3136].forEach((f, i) => partial(f, 0.035, t + i * 0.05, 1.2, 0.006)); });   // 新しい宝石が、氷の中に生まれる
export const restored = safe(() => { const t = ac.currentTime; [1046.5, 1318.5, 1568, 2093].forEach((f, i) => partial(f, 0.04, t + i * 0.05, 2.2, 0.01)); });
// ゼリーのもみの木：ぷるん（高さが少しずつ下がりながら揺れる）
export const jelly = safe((size = 1) => { const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), f = r(250, 300) / size;
  o.frequency.setValueAtTime(f * 1.4, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); lfo.frequency.value = 11; lg.gain.value = f * 0.06; lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + 0.55); lfo.stop(t + 0.55); });
