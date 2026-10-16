// 港町のBGM（仕掛けの中は鳴らさない）。3曲とも自作で、その場で合成する（音声ファイルは使わない）。ハロウィンと同じ作り：1小節ずつ3秒先まで予約して、画面の処理で少し遅れても途切れない
//   オルゴールの聖夜（ハ長調・3拍子）／そりすべりのポルカ（ト長調・2拍子・鈴）／雪あかりの子守歌（ヘ長調・ゆっくり）
let ctx = null, rig = null, timer = null, gain = null, bar = 0, next = 0, wanted = false, cur = 'musicbox';
const rnd = (a, b) => a + Math.random() * (b - a), mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function makeRig(c) {
  const master = c.createGain(); master.gain.value = 0.55; const comp = c.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4; master.connect(comp); comp.connect(c.destination);
  const n = Math.floor(c.sampleRate * 2.6), ir = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  const revIn = c.createGain(), conv = c.createConvolver(), wet = c.createGain(); conv.buffer = ir; wet.gain.value = 0.55; revIn.connect(conv); conv.connect(wet); wet.connect(master);
  const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return { c, out(vol, w) { const g = c.createGain(); g.gain.value = vol; g.connect(master); const s = c.createGain(); s.gain.value = w; g.connect(s); s.connect(revIn); return g; },
    noise(t, d) { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t, Math.random() * 0.8); s.stop(t + d + 0.05); return s; } };
}
function env(p, t, a, peak, d) { p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); }
function filt(c, type, f, q) { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
// 楽器：オルゴール（澄んだ倍音）・グロッケン（高い金属）・ピチカート・やわらかい和音の布・セレスタ・鈴
function partials(r, dest, t, midi, vol, len, P) { const f = mtof(midi); for (const [m, g, k] of P) { const o = r.c.createOscillator(), e = r.c.createGain(); o.frequency.value = f * m * (1 + rnd(-0.0012, 0.0012)); env(e.gain, t, 0.003, vol * g, len * (k || 1)); o.connect(e); e.connect(dest); o.start(t); o.stop(t + len + 0.1); } }
const BOX = [[1, 1], [2, 0.3, 0.7], [3, 0.08, 0.4], [4.2, 0.05, 0.25]], GLOCK = [[1, 1], [2.76, 0.32, 0.5], [5.4, 0.12, 0.25]], CELESTA = [[1, 1], [2, 0.22, 0.6], [4, 0.06, 0.3]];
function pluck(r, dest, t, midi, vol, len) { const o = r.c.createOscillator(), e = r.c.createGain(), lp = filt(r.c, 'lowpass', 900); o.type = 'triangle'; o.frequency.value = mtof(midi); env(e.gain, t, 0.004, vol, len); o.connect(lp); lp.connect(e); e.connect(dest); o.start(t); o.stop(t + len + 0.1); }
function pad(r, dest, t, midi, len, vol) { const c = r.c, lp = filt(c, 'lowpass', 1200), e = c.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(vol, t + 1.1); e.gain.setValueAtTime(vol, t + len - 0.2); e.gain.exponentialRampToValueAtTime(0.0001, t + len + 1.5); lp.connect(e); e.connect(dest);
  for (const [type, det] of [['triangle', -5], ['sine', 3], ['triangle', 7]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(midi); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + len + 1.7); } }
function sleigh(r, dest, t, vol) { const n = r.noise(t, 0.12), bp = filt(r.c, 'bandpass', rnd(6500, 8500), 2.5), g = r.c.createGain(); env(g.gain, t, 0.003, vol, 0.09); n.connect(bp); bp.connect(g); g.connect(dest); partials(r, dest, t, 100 + Math.floor(rnd(0, 5)), vol * 0.25, 0.25, GLOCK); }

// ---- 1 オルゴールの聖夜：ハ長調・3拍子・84bpm・16小節 ----
const MB_B = 60 / 84, MB_BAR = MB_B * 3;
const MB_MEL = [[[0, 76], [1, 79], [2, 84]], [[0, 83], [1, 81], [2, 76]], [[0, 77], [1, 81], [2, 84]], [[0, 83, 2], [2, 79]], [[0, 76], [1, 79], [2, 84]], [[0, 83], [1, 79], [2, 76]], [[0, 77], [1, 76], [2, 74]], [[0, 74, 3]],
  [[0, 72], [1, 76], [2, 81]], [[0, 79], [1, 76], [2, 71]], [[0, 72], [1, 77], [2, 81]], [[0, 79, 2], [2, 76]], [[0, 77], [1, 74], [2, 81]], [[0, 79], [1, 77], [2, 74]], [[0, 72], [1, 76], [2, 79]], [[0, 84, 3]]];
const MB_ROOT = [48, 45, 41, 43, 48, 40, 41, 43, 45, 40, 41, 48, 50, 43, 48, 48];
const MB_CH = { 48: [55, 60, 64], 45: [57, 60, 64], 41: [57, 60, 65], 43: [55, 59, 62], 40: [55, 59, 64], 50: [57, 62, 65] };
function musicboxBar(r, dest, b, t) { b %= 16; for (const [off, m, len] of MB_MEL[b]) partials(r, dest, t + off * MB_B + rnd(0, 0.006), m, 0.14, (len || 1) * MB_B * 1.9, BOX);
  pluck(r, dest, t, MB_ROOT[b], 0.16, MB_B * 1.6); for (const beat of [1, 2]) for (const m of MB_CH[MB_ROOT[b]]) partials(r, dest, t + beat * MB_B + rnd(0, 0.008), m + 12, 0.035, MB_B * 0.9, BOX);
  if (b % 4 === 3) sleigh(r, dest, t + 2.5 * MB_B, 0.05); }

// ---- 2 そりすべりのポルカ：ト長調・2拍子・120bpm・16小節（ブンチャッの低音・鈴は裏拍） ----
const PK_B = 0.5, PK_BAR = PK_B * 2;
const PK_MEL = [[[0, 74, 0.5], [0.5, 79, 0.5], [1, 79, 0.5], [1.5, 81, 0.5]], [[0, 83, 1], [1, 79, 1]], [[0, 81, 0.5], [0.5, 78, 0.5], [1, 78, 0.5], [1.5, 79, 0.5]], [[0, 81, 1], [1, 74, 1]],
  [[0, 74, 0.5], [0.5, 79, 0.5], [1, 79, 0.5], [1.5, 81, 0.5]], [[0, 83, 0.5], [0.5, 86, 0.5], [1, 83, 1]], [[0, 84, 0.5], [0.5, 83, 0.5], [1, 81, 0.5], [1.5, 79, 0.5]], [[0, 81, 2]],
  [[0, 83, 0.5], [0.5, 81, 0.5], [1, 79, 1]], [[0, 79, 0.5], [0.5, 78, 0.5], [1, 76, 1]], [[0, 76, 0.5], [0.5, 79, 0.5], [1, 84, 1]], [[0, 83, 0.5], [0.5, 81, 0.5], [1, 78, 1]],
  [[0, 79, 0.5], [0.5, 83, 0.5], [1, 86, 1]], [[0, 88, 0.5], [0.5, 86, 0.5], [1, 84, 1]], [[0, 83, 0.5], [0.5, 81, 0.5], [1, 78, 0.5], [1.5, 81, 0.5]], [[0, 79, 2]]];
const PK_ROOT = [43, 43, 38, 38, 43, 43, 48, 38, 43, 40, 48, 38, 43, 48, 38, 43];
const PK_CH = { 43: [55, 59, 62], 38: [54, 57, 62], 48: [55, 60, 64], 40: [55, 59, 64] };
function polkaBar(r, dest, b, t) { b %= 16; for (const [off, m, len] of PK_MEL[b]) partials(r, dest, t + off * PK_B + rnd(0, 0.005), m, 0.13, Math.max(0.25, len * PK_B * 1.4), GLOCK);
  const root = PK_ROOT[b]; pluck(r, dest, t, root, 0.2, 0.3); pluck(r, dest, t + PK_B, root + 7, 0.16, 0.3);
  for (const beat of [0.5, 1.5]) for (const m of PK_CH[root]) pluck(r, dest, t + beat * PK_B, m, 0.05, 0.16);
  for (const beat of [0.5, 1.5]) sleigh(r, dest, t + beat * PK_B, 0.05); if (b % 8 === 7) sleigh(r, dest, t + 1.75 * PK_B, 0.07); }

// ---- 3 雪あかりの子守歌：ヘ長調・4拍子・60bpm・8小節を2回（2回目は星のきらめきが増える） ----
const LB_BAR = 4;
const LB_PROG = ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'];
const LB_PAD = { F: [41, 48, 53, 57, 60], Dm: [38, 50, 53, 57, 62], Bb: [46, 53, 58, 62, 65], C: [48, 55, 60, 64, 67], Am: [45, 52, 57, 60, 64] };
const LB_TW = { F: [77, 81, 84], Dm: [74, 77, 81], Bb: [74, 77, 82], C: [76, 79, 84], Am: [76, 81, 84] };
const LB_MEL = [[[0, 72, 2], [2, 69, 1], [3, 65, 1]], [[0, 69, 2], [2, 74, 1], [3, 72, 1]], [[0, 70, 2], [2, 74, 1], [3, 77, 1]], [[0, 76, 3], [3, 72, 1]],
  [[0, 77, 2], [2, 76, 1], [3, 74, 1]], [[0, 72, 2], [2, 69, 1], [3, 72, 1]], [[0, 74, 1], [1, 72, 1], [2, 70, 1], [3, 67, 1]], [[0, 65, 4]]];
function lullabyBar(r, dest, b, t) { b %= 16; const k = LB_PROG[b % 8];
  LB_PAD[k].forEach((m, i) => pad(r, dest, t, m, LB_BAR + 0.3, i === 0 ? 0.045 : 0.025));
  for (const [off, m, len] of LB_MEL[b % 8]) partials(r, dest, t + off + rnd(0, 0.012), m + 12, 0.11, len * 1.6, CELESTA);
  const tw = LB_TW[k]; for (let i = 0; i < (b >= 8 ? 5 : 2); i++) partials(r, dest, t + rnd(0, LB_BAR), tw[(Math.random() * tw.length) | 0] + 12, 0.025, 1.4, BOX); }

const TRACKS = { musicbox: { name: 'オルゴールの聖夜', desc: 'ちいさな箱のワルツ', barSec: MB_BAR, bar: musicboxBar, wet: 0.5 }, polka: { name: 'そりすべりのポルカ', desc: '鈴がしゃんしゃん、はずむ', barSec: PK_BAR, bar: polkaBar, wet: 0.3 }, lullaby: { name: '雪あかりの子守歌', desc: 'しずかで、あたたかい', barSec: LB_BAR, bar: lullabyBar, wet: 0.65, vol: 0.6 } };
function start() { if (!ctx || timer) return; const tr = TRACKS[cur], vol = tr.vol || 0.8; if (!rig) rig = makeRig(ctx);
  gain = rig.out(vol, tr.wet); gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 1.2); bar = 0; next = ctx.currentTime + 0.15;
  const pump = () => { while (next < ctx.currentTime + 3) { tr.bar(rig, gain, bar, next); next += tr.barSec; bar++; } }; pump(); timer = setInterval(pump, 400); }
function stop() { if (timer) { clearInterval(timer); timer = null; } if (gain && ctx) { try { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime); gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6); } catch (e) { /* 止まっている */ } } gain = null; }
export const BGM = {
  tracks: Object.keys(TRACKS).map((id) => ({ id, name: TRACKS[id].name, desc: TRACKS[id].desc })),
  // ac＝効果音と同じ音の部屋（最初のタップで作られる）。on＝鳴らすか
  set(ac, on) { ctx = ac || ctx; wanted = !!on; if (on && ctx) { if (ctx.state !== 'running') ctx.resume(); start(); } else stop(); },
  get on() { return wanted; }, get track() { return cur; },
  setTrack(id) { if (!TRACKS[id] || id === cur) return; cur = id; if (timer) { stop(); setTimeout(() => { if (wanted) start(); }, 700); } },
};
