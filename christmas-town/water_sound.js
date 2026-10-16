// ゼリーの音：ぽよ～ん（はじく）・ぷる～ん（のばして離す）＝高さが跳ね上がってから下がり、揺れがだんだん遅く・小さくなって消える（本人 2026-10-15「ぽよ～ん ぷる～ん、高さもちょっと変化」）
// 水の音：ぴちゃん・とぷん・ぷく（泡）は、みずの時と、ちぎれる・戻る時に。鳴りっぱなしの音（ざわめき・ごぼごぼ）は使わない
// どれも短い音を、その場で合成する。音源ファイルなし
let ac = null, out = null, nextBubble = 0;

export function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.9; out.connect(ac.destination); }
  if (ac.state !== 'running') ac.resume();
  return ac;
}
const r = (a, b) => a + Math.random() * (b - a);
// 泡ひとつ：高さが一気に上がる短い音（水の中の泡がはじける時の音の形）
function bloop(f0, f1, dur, vol, delay = 0) {
  try {
    const a = audio(), t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    lp.type = 'lowpass'; lp.frequency.value = 3200; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* 音が出なくても遊べる */ }
}
// ぽよ～ん：f0 から up 倍へ跳ねて、f0 へ落ち、down 倍まで下がっていく。揺れ（rate 回/秒・深さ depth）は、だんだん遅く・小さく
function boing(f0, dur, vol, o = {}) {
  try {
    const a = audio(), t = a.currentTime + (o.delay || 0), osc = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(), lfo = a.createOscillator(), lg = a.createGain(), rate = o.rate ?? 9;
    osc.type = 'sine'; osc.frequency.setValueAtTime(f0 * (o.up ?? 1.6), t); osc.frequency.exponentialRampToValueAtTime(f0, t + 0.07); osc.frequency.exponentialRampToValueAtTime(f0 * (o.down ?? 0.82), t + dur);
    lfo.frequency.setValueAtTime(rate, t); lfo.frequency.linearRampToValueAtTime(rate * 0.45, t + dur);
    lg.gain.setValueAtTime(f0 * (o.depth ?? 0.08), t); lg.gain.exponentialRampToValueAtTime(f0 * 0.004, t + dur); lfo.connect(lg); lg.connect(osc.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 2600;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.setValueAtTime(vol, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(lp); lp.connect(g); g.connect(out); osc.start(t); lfo.start(t); osc.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
  } catch (e) { /* 同上 */ }
}
const tapun = (k = 1, d = 0) => { bloop(r(140, 170) * k, r(400, 450) * k, 0.22, 0.22, d); bloop(r(280, 320) * k, r(650, 750) * k, 0.08, 0.06, d + 0.04); };
const topun = (k = 1, d = 0) => { bloop(r(105, 125) * k, r(280, 320) * k, 0.28, 0.24, d); bloop(r(480, 560), r(1050, 1200), 0.05, 0.05, d + 0.1); };
const pichan = (d = 0) => { bloop(r(680, 760), r(1800, 2000), 0.07, 0.13, d); bloop(r(1050, 1200), r(2500, 2800), 0.05, 0.07, d + 0.035); bloop(r(210, 240), r(480, 540), 0.12, 0.08, d + 0.02); };
const puku = (vol = 0.04, d = 0) => { const f = r(500, 900); bloop(f, f * 2.2, 0.05, vol, d); };

// はじく：ぽよ～ん（大きいグミほど低い。毎回、高さが少しちがう）。みずの時は、たぷん／とぷんを混ぜる
export function tapSound(size = 1, watery = false) {
  const f = (r(210, 290) / size) * r(0.88, 1.12);
  boing(f, 0.6, 0.17, { rate: r(8, 11), depth: 0.07 }); boing(f * 2.01, 0.25, 0.03, { rate: 10, depth: 0.05, up: 1.3 });
  if (watery) (Math.random() < 0.5 ? tapun : topun)(1 / size);
}
export function grabSound() { boing(r(300, 360), 0.16, 0.08, { rate: 0.1, depth: 0.002, up: 0.8, down: 1.25 }); }   // つまむ：ぷにっ
export function stretchSound(amt) { try { const t = audio().currentTime; if (amt > 0.15 && t > nextBubble) { puku(0.03 + Math.min(0.03, amt * 0.02)); nextBubble = t + r(0.28, 0.5); } } catch (e) { /* 同上 */ } }   // のばす間：ときどき、ぷく
export function stretchStop() { nextBubble = 0; }
// 離す：ぷる～ん（大きく伸ばしたほど、低く・長く・大きく揺れる）。みずで大きく伸ばした時は、ぴちゃんも
export function releaseSound(amt, watery = false) {
  const k = Math.min(1.5, amt), f = r(200, 260) * (1.15 - k * 0.25) * r(0.9, 1.1);
  boing(f, 0.5 + k * 0.35, 0.13 + k * 0.05, { rate: 14 - k * 3, depth: 0.09 + k * 0.05, up: 1.3, down: 0.78 });
  if (watery && amt > 1.0) pichan(0.04);
}
export function tearSound() { pichan(); puku(0.05, 0.08); }                                               // ちぎれる
export function mergeSound() { topun(1.2); boing(r(240, 300), 0.45, 0.09, { rate: 12, depth: 0.1, up: 1.4, delay: 0.05 }); }   // もどってくっつく：とぷん、ぷるん
