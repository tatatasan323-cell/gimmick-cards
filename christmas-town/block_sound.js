// グミの積み木の音：ぶつかる「ぽよん」・はじく「ぷるっ」・持つ「とぷ」・出てくる「ぽんっ」。どれも短い音を合成し、鳴りっぱなしにしない
let ac = null, out = null, last = 0;
export function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination); }
  if (ac.state !== 'running') ac.resume();
  return ac;
}
const r = (a, b) => a + Math.random() * (b - a);
function tone(f0, f1, dur, vol, delay = 0, vib = 0) {
  try {
    if (!ac || ac.state !== 'running') return;
    const a = ac, t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.85);
    if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = 16; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.02); }
    lp.type = 'lowpass'; lp.frequency.value = 2400; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* 音が出なくても遊べる */ }
}
// 音は、最初に画面に触れてから（触る前に AudioContext を作ると、ブラウザに止められる）
// ぽよん：大きいブロックほど低い。強くぶつかるほど大きい。続けて鳴りすぎないよう、40ミリ秒あける
export function bonk(strength, size = 1) {
  const now = performance.now(); if (now - last < 40 || strength < 0.05) return; last = now;
  const v = Math.min(0.22, 0.04 + strength * 0.12), f = r(230, 280) / Math.sqrt(size);
  tone(f, f * 0.62, 0.2, v, 0, f * 0.06); tone(f * 2.1, f * 1.4, 0.06, v * 0.3);
}
export function flick() { tone(300, 820, 0.12, 0.12); tone(820, 520, 0.18, 0.06, 0.05, 30); }   // ぷるっ
export function grab() { tone(170, 320, 0.11, 0.09); }                                         // とぷ
export function drop() { tone(320, 200, 0.16, 0.08, 0, 20); }                                  // はなす
export function spawn() { tone(520, 1100, 0.07, 0.1); tone(900, 660, 0.12, 0.05, 0.05); }     // ぽんっ
