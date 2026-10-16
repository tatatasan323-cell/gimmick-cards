// 街の音：ゼリーの「ぼよん」・ジンジャーブレッドの「サクッ」・豆知識の「ちりん」・礼拝堂の鐘・寄る時の「ふわっ」
// どれも短い音を合成する。同時に鳴る部品の数を数え、多すぎる時は省く（ステンドグラスで、多すぎて途中から音が出なくなった）
let ac = null, out = null, noise = null, act = 0;
export function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = muted ? 0 : 0.9; out.connect(ac.destination); }
  if (ac.state !== 'running') ac.resume();
  return ac;
}
export const voices = () => act;
// 効果音のオン・オフ（メニューの「音」）。BGM は別の部品で、ここには入らない
let muted = false;
export function setMute(m) { muted = !!m; if (out) out.gain.value = muted ? 0 : 0.9; }
const r = (a, b) => a + Math.random() * (b - a), live = () => ac && ac.state === 'running' && act < 160;
const track = (n) => { act++; n.onended = () => { act--; }; };
function tone(f0, f1, vol, delay, dur, type = 'sine', atk = 0.005) {
  if (!live()) return;
  try {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); track(o); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* 音が出なくても遊べる */ }
}
function hiss(vol, delay, dur, type, freq, q = 0.8) {
  if (!live()) return;
  try {
    const t = ac.currentTime + delay;
    if (!noise) { noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); track(s); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  } catch (e) { /* 同上 */ }
}
// ゼリー：ぼよ〜ん（大きいほど低い）。高さが少し揺れて下がる
export function boing(size = 1) { const f = 330 / Math.sqrt(Math.max(0.3, size)) * r(0.92, 1.08); tone(f * 1.5, f, 0.11, 0, 0.32); tone(f * 0.75, f * 0.55, 0.06, 0.02, 0.4, 'triangle'); }
// クッキー：サクッ（乾いた短いノイズを3つ・最後に小さな低い音）
export function crunch() { for (let i = 0; i < 3; i++) hiss(r(0.07, 0.11), i * r(0.025, 0.04), r(0.03, 0.05), 'bandpass', r(2400, 4200), 1.4); hiss(0.05, 0.1, 0.06, 'lowpass', 900); tone(160, 110, 0.04, 0.0, 0.06, 'triangle'); }
// 豆知識：ちりん（五音の音階から2音）
const PENTA = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
export function chime(k = 0) { const a = PENTA[k % PENTA.length], b = PENTA[(k + 2) % PENTA.length] * (k % 2 ? 1 : 2); tone(a, a, 0.05, 0, 1.0); tone(a * 2.76, a * 2.76, 0.012, 0, 0.4); tone(b, b, 0.04, 0.12, 1.1); }
// 礼拝堂の鐘：ゴーン（基音と、ずれた倍音が長く残る）
// 教会の鐘：り～ん（高い鐘）……ご～ん（すこし低い鐘）。鐘の倍音（ハム・プライム・短三度・五度・ノミナル・その上）を、ほんの少しずらした2本ずつ重ねて、うなる長い余韻。広い夜空に響く残響（鐘だけ）
let hall = null;
function hallSend() { if (hall) return hall; const n = Math.floor(ac.sampleRate * 3.4), b = ac.createBuffer(2, n, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.4); }
  const cv = ac.createConvolver(), g = ac.createGain(); cv.buffer = b; g.gain.value = 0.28; cv.connect(g); g.connect(out); hall = cv; return hall; }
function bellStrike(f, delay, vol, dur) { const t = ac.currentTime + delay, rv = hallSend();
  for (const [m, a, dk] of [[0.5, 0.25, 0.8], [1, 0.8, 0.85], [1.19, 0.5, 0.6], [1.5, 0.28, 0.5], [2, 1.0, 0.55], [2.51, 0.22, 0.35], [3.01, 0.3, 0.28], [4.07, 0.14, 0.18], [5.2, 0.06, 0.12]]) for (const det of [1, 1.0023]) {
    if (!live()) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m * det; const v = vol * a * 0.5, d = dur * dk;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(v * 0.35, t + d * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(out); g.connect(rv); track(o); o.start(t); o.stop(t + d + 0.05); }
  hiss(vol * 0.25, delay, 0.05, 'bandpass', f * 6, 1.5); }   // 打った瞬間の「カン」
// り～ん（ド）…ご～ん（その下のソ）。低すぎると重く沈むので、ソの高さで
export function bell() { try { bellStrike(523.3, 0, 0.05, 4.5); bellStrike(392, 0.85, 0.055, 6); } catch (e) { /* 音が出なくても遊べる */ } }
// 寄る時：ふわっ
export function whoosh() { hiss(0.04, 0, 0.45, 'bandpass', 900, 0.7); tone(520, 880, 0.02, 0.05, 0.35); }
// 天へ昇る：ハープのような上りのアルペジオと、うすい合唱の和音
export function ascend() { [523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.045, i * 0.13, 1.5)); for (const f of [261.6, 329.6, 392]) { tone(f, f * 1.003, 0.022, 0.15, 3.4); tone(f * 2, f * 2.004, 0.01, 0.3, 3.1); } }
// 空から落ちてくる：すべり笛（高い音から、ひゅ～と下へ）
export function fall() { tone(1600, 240, 0.045, 0, 1.6); tone(1610, 245, 0.02, 0.02, 1.6, 'triangle'); }
// 雪を踏む：さくっ（細かい雪の粒が、0.2秒ほどの間にたくさんつぶれる音）。短い「シャッ」を数個ならべると、粒が少なすぎて「てってって」と打つ音に聞こえた
// 粒（2〜9ミリ秒の小さなざらつき）を70個、踏みこみの始めほど密に重ねた音を3通り先に作り、毎回ちがう高さ・強さで鳴らす（部品は1回1つ）
let snowBufs = null;
function makeCrunch() { const sr = ac.sampleRate, n = Math.floor(sr * 0.26), out = [];
  for (let v = 0; v < 3; v++) { const b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
    for (let g = 0; g < 70; g++) { const t0 = Math.pow(Math.random(), 1.7) * 0.2, i0 = Math.floor(t0 * sr), len = Math.floor(sr * (0.002 + Math.random() * 0.007)), amp = (0.3 + Math.random() * 0.7) * (1 - t0 / 0.26);
      for (let k = 0; k < len && i0 + k < n; k++) d[i0 + k] += (Math.random() * 2 - 1) * amp * Math.exp(-k / (len * 0.35)); }
    let lp = 0, prev = 0, peak = 1e-6; for (let k = 0; k < n; k++) { lp += (d[k] - lp) * 0.35; const hp = lp - prev; prev = lp; d[k] = hp * 2.2 + lp * 0.5; peak = Math.max(peak, Math.abs(d[k])); }   // 高すぎ（シャー）と低すぎ（ボコッ）を削る
    for (let k = 0; k < n; k++) d[k] /= peak; out.push(b); }
  return out; }
export function snowStep(k = 1) { if (!live()) return; try { snowBufs = snowBufs || makeCrunch(); const sN = ac.createBufferSource(), g = ac.createGain(); sN.buffer = snowBufs[(Math.random() * 3) | 0]; sN.playbackRate.value = r(0.82, 1.12); g.gain.value = 0.32 * k; sN.connect(g); g.connect(out); track(sN); sN.start(); } catch (e) { /* 音が出なくても遊べる */ } }
export function tap() { tone(1400, 1100, 0.025, 0, 0.06); }
// 海の光の波：ざわざわ〜っと駆け上がる、きらめきの音の列
export function wave() { const S = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637]; for (let i = 0; i < 14; i++) { const f = S[i % S.length] * (i >= 8 ? 2 : 1); tone(f, f, 0.03, i * 0.07, 0.9); } hiss(0.03, 0, 1.2, 'highpass', 6000, 0.6); }
// 花火：ぽん（打ち上げ）と、ぱらぱら
// なぞった海の、小さな光の波：やさしい1音
export function ripple() { const S = [1046.5, 1318.5, 1568, 2093, 2637], f = S[(Math.random() * S.length) | 0]; tone(f, f, 0.014, 0, 0.6); tone(f * 1.5, f * 1.5, 0.007, 0.06, 0.45); }
// 盛大な花火：低いドン（遠くの山にこだま）と、パチパチ
export function boom(big = 1) { tone(110, 45, 0.12 * big, 0, 0.7, 'triangle'); tone(70, 40, 0.05 * big, 0.25, 0.6, 'triangle'); hiss(0.05 * big, 0, 0.6, 'lowpass', 600); for (let i = 0; i < 7; i++) hiss(r(0.012, 0.025), 0.2 + i * r(0.05, 0.12), r(0.02, 0.05), 'bandpass', r(2500, 6500), 1.2); }
export function pop() { tone(180, 90, 0.08, 0, 0.25, 'triangle'); for (let i = 0; i < 6; i++) hiss(r(0.02, 0.04), 0.05 + i * r(0.03, 0.08), r(0.03, 0.06), 'bandpass', r(2500, 6000), 1.2); }
// そりの鈴（サンタ）
// 鈴：シャラ・ラ・ラン（小さな鈴を軽く振る）。高く澄んだ音に、鈴らしいずれた倍音をのせ、間をつめながら数回、最後に長く響く
export function suzu() { const base = r(2600, 3000); for (let i = 0; i < 7; i++) { const tt = i * (0.07 - i * 0.004) + (i > 4 ? 0.12 : 0), f = base * (i % 2 ? 1.12 : 1) * r(0.98, 1.02), v = 0.022 * (i === 6 ? 1.6 : 1); tone(f, f, v, tt, i === 6 ? 1.4 : 0.5); tone(f * 2.76, f * 2.76, v * 0.35, tt, 0.35); tone(f * 5.4, f * 5.4, v * 0.15, tt, 0.2); } }
// ガラス玉どうしが触れる「ちりん・ころん」（薄いガラスの高い音に、ずれた倍音。すぐ消える）
export function glassTink() { for (let i = 0; i < 4; i++) { const f = r(2200, 3400), tt = i * r(0.06, 0.13); tone(f, f, 0.03, tt, 0.45); tone(f * 2.32, f * 2.32, 0.012, tt, 0.25); tone(f * 4.25, f * 4.25, 0.006, tt, 0.15); } }
// ろうそくが灯る「ぽっ」（マッチの小さなこすれと、やわらかな音。灯すたびに音階を上る）
export function candle(k = 0) { hiss(0.03, 0, 0.12, 'bandpass', 2600, 1.2); const f = PENTA[k % PENTA.length] / 2; tone(f, f, 0.035, 0.05, 0.9); }
// 吹き消す「ふーっ」
export function blow() { hiss(0.06, 0, 0.7, 'bandpass', 900, 0.6); hiss(0.03, 0.05, 0.5, 'lowpass', 600); }
// キャンディの街灯が折れる「ポキッ、ポキッ」（かたい飴が割れる乾いた高い音と、短い芯の音を2回）
export function candySnap() { for (const [d, f] of [[0, 1], [0.12, 1.18]]) { hiss(0.12, d, 0.035, 'highpass', 3200, 0.7); hiss(0.07, d, 0.06, 'bandpass', 1900 * f, 2.2); tone(1250 * f, 600 * f, 0.05, d, 0.07, 'triangle'); } }
// 飴のかけらが地面に当たる「カツン」
export function candyClack(s = 1) { tone(r(2400, 3200), r(1800, 2200), 0.03 * s, 0, 0.06, 'triangle'); hiss(0.03 * s, 0, 0.025, 'highpass', 4000); }
// 戻る時の「カリカリ」（細かく乾いた音を、間をつめて）
export function candyCrunch() { const n = 5 + ((Math.random() * 3) | 0); for (let i = 0; i < n; i++) { const d = i * r(0.035, 0.06); hiss(r(0.05, 0.09), d, r(0.012, 0.025), 'bandpass', r(3000, 6000), 2.5); if (i % 2 === 0) tone(r(1800, 2600), r(1400, 1800), 0.018, d, 0.03, 'triangle'); } }
// かき氷をすくう「シャクッ」（細かい氷の、乾いた高い音を3つ）
export function shaku() { for (let i = 0; i < 3; i++) hiss(r(0.05, 0.08), i * r(0.02, 0.035), r(0.04, 0.07), 'bandpass', r(3500, 7000), 1.2); hiss(0.04, 0.01, 0.12, 'highpass', 6000); tone(r(900, 1200), r(500, 700), 0.025, 0, 0.08, 'triangle'); }
// 大きなスプーンが降りてくる「キラキラ…」（高い音から順に下りてくる）
export function spoonDown() { for (let i = 0; i < 10; i++) { const f = 3136 - i * 160; tone(f, f, 0.02, i * 0.12, 0.5); } hiss(0.05, 0, 1.4, 'bandpass', 1200, 0.5); }
// ひとすくい「ザクッ」（大きなかき氷の山を、ざっくり）
export function bigScoop() { for (let i = 0; i < 9; i++) hiss(r(0.08, 0.13), i * r(0.03, 0.05), r(0.06, 0.1), 'bandpass', r(2000, 5000), 1); hiss(0.1, 0, 0.5, 'lowpass', 700); tone(220, 110, 0.06, 0, 0.4, 'triangle'); }
// 天へ昇って消える「ひゅーん…キラン」
export function spoonUp() { tone(400, 1600, 0.04, 0, 1.6, 'triangle'); hiss(0.05, 0, 1.6, 'bandpass', 2000, 0.6); tone(2637, 2637, 0.05, 1.9, 1.2); tone(3951, 3951, 0.03, 1.95, 1.0); }
// 山が戻る：下から上へ、きらめきの音が昇っていく
export function mtnRestore() { [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637].forEach((f, i) => { tone(f, f, 0.03, 0.3 + i * 0.45, 1.6); tone(f * 2, f * 2, 0.01, 0.3 + i * 0.45, 0.8); }); hiss(0.03, 0, 6.5, 'bandpass', 3000, 0.4); }
export function jingle() { for (let i = 0; i < 6; i++) { const f = r(3800, 6200); tone(f, f, 0.018, i * 0.09, 0.5); tone(f * 1.41, f * 1.41, 0.01, i * 0.09, 0.4); } }
