// 街の音：ゼリーの「ぼよん」・ジンジャーブレッドの「サクッ」・豆知識の「ちりん」・礼拝堂の鐘・寄る時の「ふわっ」
// どれも短い音を合成する。同時に鳴る部品の数を数え、多すぎる時は省く（ステンドグラスで、多すぎて途中から音が出なくなった）
let ac = null, out = null, noise = null, act = 0;
export function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination); }
  if (ac.state !== 'running') ac.resume();
  return ac;
}
export const voices = () => act;
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
export function bell() { for (const [m, v, d] of [[1, 0.09, 3.2], [2.0, 0.04, 2.4], [2.4, 0.035, 2.0], [3.0, 0.02, 1.4], [4.2, 0.012, 0.9]]) tone(392 * m, 392 * m, v, 0, d, 'sine', 0.004); }
// 寄る時：ふわっ
export function whoosh() { hiss(0.04, 0, 0.45, 'bandpass', 900, 0.7); tone(520, 880, 0.02, 0.05, 0.35); }
export function tap() { tone(1400, 1100, 0.025, 0, 0.06); }
// 海の光の波：ざわざわ〜っと駆け上がる、きらめきの音の列
export function wave() { const S = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637]; for (let i = 0; i < 14; i++) { const f = S[i % S.length] * (i >= 8 ? 2 : 1); tone(f, f, 0.03, i * 0.07, 0.9); } hiss(0.03, 0, 1.2, 'highpass', 6000, 0.6); }
// 花火：ぽん（打ち上げ）と、ぱらぱら
export function pop() { tone(180, 90, 0.08, 0, 0.25, 'triangle'); for (let i = 0; i < 6; i++) hiss(r(0.02, 0.04), 0.05 + i * r(0.03, 0.08), r(0.03, 0.06), 'bandpass', r(2500, 6000), 1.2); }
// そりの鈴（サンタ）
export function jingle() { for (let i = 0; i < 6; i++) { const f = r(3800, 6200); tone(f, f, 0.018, i * 0.09, 0.5); tone(f * 1.41, f * 1.41, 0.01, i * 0.09, 0.4); } }
