// 港町のBGM（仕掛けの中は鳴らさない）。その場で合成する（音声ファイルは使わない）。1小節ずつ3秒先まで予約して、画面の処理で少し遅れても途切れない
// 旋律は、だれでもクリスマスと分かる定番曲（どれも著作権の切れた曲。編曲と音色は自作）：
//   ジングルベル（1857年・ト長調・そりの鈴とひづめ）／We Wish You a Merry Christmas（イギリスの伝承曲・3拍子・鐘）／きよしこの夜（1818年・6/8拍子・ギターの伴奏＝初演と同じ）
// 自作の旋律をオルゴールの音色と深い残響で鳴らしていた前の版は、夜の古いオルゴールのようで、ハロウィンのように聞こえた（本人）。残響はひかえめに
let ctx = null, rig = null, timer = null, gain = null, bar = 0, next = 0, wanted = false, cur = 'jingle';
const rnd = (a, b) => a + Math.random() * (b - a), mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function makeRig(c) {
  const master = c.createGain(); master.gain.value = 0.55; const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; master.connect(comp); comp.connect(c.destination);
  const n = Math.floor(c.sampleRate * 1.7), ir = c.createBuffer(2, n, c.sampleRate); for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  const revIn = c.createGain(), conv = c.createConvolver(), wet = c.createGain(); conv.buffer = ir; wet.gain.value = 0.5; revIn.connect(conv); conv.connect(wet); wet.connect(master);
  const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return { c, out(vol, w) { const g = c.createGain(); g.gain.value = vol; g.connect(master); const s = c.createGain(); s.gain.value = w; g.connect(s); s.connect(revIn); return g; },
    noise(t, d) { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; s.start(t, Math.random() * 0.8); s.stop(t + d + 0.05); return s; } };
}
function env(p, t, a, peak, d) { p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); }
function filt(c, type, f, q) { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
const osc = (c, type, f, t, len) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(t + len); return o; };

// ---------- 楽器 ----------
// 倍音を重ねる鐘のなかま：グロッケン（高く澄んだ）・セレスタ・チューブラーベル（教会の鐘のような、長い響き）
function partials(r, dest, t, midi, vol, len, P) { const f = mtof(midi); for (const [m, g, k] of P) { const o = osc(r.c, 'sine', f * m * (1 + rnd(-0.001, 0.001)), t, len + 0.1), e = r.c.createGain(); env(e.gain, t, 0.003, vol * g, len * (k || 1)); o.connect(e); e.connect(dest); } }
const GLOCK = [[1, 1], [2.76, 0.3, 0.5], [5.4, 0.1, 0.25]], CELESTA = [[1, 1], [2, 0.25, 0.6], [4, 0.07, 0.3]], CHIME = [[1, 1, 1], [2, 0.45, 0.8], [3, 0.3, 0.6], [4.16, 0.22, 0.45], [5.43, 0.14, 0.3]];
// 低音のピチカート（ブン）・和音の刻み（チャッ＝明るいピアノのような短い音）
function bass(r, dest, t, midi, vol, len) { const o = osc(r.c, 'triangle', mtof(midi), t, len + 0.1), lp = filt(r.c, 'lowpass', 700), e = r.c.createGain(); env(e.gain, t, 0.005, vol, len); o.connect(lp); lp.connect(e); e.connect(dest); }
function stab(r, dest, t, midis, vol, len = 0.22) { const lp = filt(r.c, 'lowpass', 2600), e = r.c.createGain(); env(e.gain, t, 0.004, vol, len); lp.connect(e); e.connect(dest);
  for (const m of midis) { osc(r.c, 'triangle', mtof(m), t, len + 0.1).connect(lp); const h = osc(r.c, 'sine', mtof(m) * 2, t, len + 0.1), hg = r.c.createGain(); hg.gain.value = 0.25; h.connect(hg); hg.connect(lp); } }
// 歌う旋律（フルートと金管のあいだ：のこぎり波をやわらかくして、少しビブラート）
function lead(r, dest, t, midi, vol, len, bright = 1800) { const c = r.c, o = osc(c, 'sawtooth', mtof(midi), t, len + 0.2), o2 = osc(c, 'triangle', mtof(midi), t, len + 0.2), lp = filt(c, 'lowpass', bright, 0.7), e = c.createGain(), vib = osc(c, 'sine', 5.2, t, len + 0.2), vg = c.createGain();
  o2.detune.value = 6; vg.gain.value = 0; vg.gain.setValueAtTime(0, t + 0.18); vg.gain.linearRampToValueAtTime(mtof(midi) * 0.004, t + 0.45); vib.connect(vg); vg.connect(o.frequency); vg.connect(o2.frequency);
  e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(vol, t + 0.03); e.gain.setValueAtTime(vol, t + Math.max(0.05, len * 0.8)); e.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.15);
  o.connect(lp); o2.connect(lp); lp.connect(e); e.connect(dest); }
// やわらかい弦の和音
function strings(r, dest, t, midis, len, vol) { const c = r.c, lp = filt(c, 'lowpass', 1500), e = c.createGain(); e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(vol, t + 0.5); e.gain.setValueAtTime(vol, t + len - 0.1); e.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.8); lp.connect(e); e.connect(dest);
  for (const m of midis) for (const det of [-6, 6]) { const o = osc(c, 'sawtooth', mtof(m), t, len + 1); o.detune.value = det; o.connect(lp); } }
// ナイロン弦のギター（はじいた明るさが、すぐ丸くなる）
function guitar(r, dest, t, midi, vol, len) { const c = r.c, o = osc(c, 'sawtooth', mtof(midi), t, len + 0.1), lp = filt(c, 'lowpass', 3000, 1.2), e = c.createGain(); lp.frequency.setValueAtTime(3200, t); lp.frequency.exponentialRampToValueAtTime(520, t + 0.35); env(e.gain, t, 0.003, vol, len); o.connect(lp); lp.connect(e); e.connect(dest); }
// そりの鈴（シャン）・ひづめ（カポッ）・ムチ（パシッ）
function sleigh(r, dest, t, vol) { const n = r.noise(t, 0.14), bp = filt(r.c, 'bandpass', rnd(6800, 8800), 2.2), g = r.c.createGain(); env(g.gain, t, 0.003, vol, 0.11); n.connect(bp); bp.connect(g); g.connect(dest);
  for (let k = 0; k < 2; k++) partials(r, dest, t + k * 0.018, 103 + Math.floor(rnd(0, 6)), vol * 0.2, 0.18, GLOCK); }
function hoof(r, dest, t, hi, vol) { const o = osc(r.c, 'sine', hi ? 1180 : 860, t, 0.08), e = r.c.createGain(); o.frequency.exponentialRampToValueAtTime(hi ? 700 : 520, t + 0.05); env(e.gain, t, 0.002, vol, 0.05); o.connect(e); e.connect(dest);
  const n = r.noise(t, 0.03), bp = filt(r.c, 'bandpass', 2400, 3), g = r.c.createGain(); env(g.gain, t, 0.001, vol * 0.5, 0.02); n.connect(bp); bp.connect(g); g.connect(dest); }
function whip(r, dest, t, vol) { const n = r.noise(t, 0.12), hp = filt(r.c, 'highpass', 2200), g = r.c.createGain(); env(g.gain, t, 0.002, vol, 0.08); n.connect(hp); hp.connect(g); g.connect(dest); }
const CH = { G: [43, [55, 59, 62]], C: [48, [55, 60, 64]], Am: [45, [57, 60, 64]], D: [38, [54, 57, 62]], D7: [38, [54, 57, 60]], A7: [45, [55, 57, 61]], B7: [47, [54, 57, 59, 63]], Em: [40, [55, 59, 64]], F: [41, [57, 60, 65]], G7: [43, [53, 59, 62]] };

// ---------- 1 ジングルベル：ト長調・4拍子・136bpm。前半（ダッシング・スルー・ザ・スノー）16小節＋サビ16小節 ----------
const JB_B = 0.44, JB_BAR = JB_B * 4;
const D4 = 62, E4 = 64, F4s = 66, G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76;
const L4 = (a, b, c, d) => [[0, a, 1], [1, b, 1], [2, c, 1], [3, d, 1]];
const JB_VERSE = [L4(D4, B4, A4, G4), [[0, D4, 3], [3, D4, 0.5], [3.5, D4, 0.5]], L4(D4, B4, A4, G4), [[0, E4, 3], [3, E4, 1]], L4(E4, C5, B4, A4), [[0, F4s, 4]], L4(D5, D5, C5, A4), [[0, B4, 4]],
  L4(D4, B4, A4, G4), [[0, D4, 3], [3, D4, 0.5], [3.5, D4, 0.5]], L4(D4, B4, A4, G4), [[0, E4, 3], [3, E4, 1]], L4(E4, C5, B4, A4), L4(D5, D5, D5, D5), L4(E5, D5, C5, A4), [[0, G4, 2], [2, D5, 2]]];
const JB_BELLS = [[0, B4, 1], [1, B4, 1], [2, B4, 2]], JB_WAY = [[0, B4, 1], [1, D5, 1], [2, G4, 1.5], [3.5, A4, 0.5]], JB_FUN = [[0, C5, 1], [1, C5, 1], [2, C5, 1.5], [3.5, C5, 0.5]], JB_RIDE = [[0, C5, 1], [1, B4, 1], [2, B4, 1], [3, B4, 0.5], [3.5, B4, 0.5]];
const JB_CHORUS = [JB_BELLS, JB_BELLS, JB_WAY, [[0, B4, 4]], JB_FUN, JB_RIDE, L4(B4, A4, A4, B4), [[0, A4, 2], [2, D5, 2]], JB_BELLS, JB_BELLS, JB_WAY, [[0, B4, 4]], JB_FUN, JB_RIDE, L4(D5, D5, C5, A4), [[0, G4, 4]]];
const JB_HARM = ['G', 'G', 'G', 'C', 'Am', 'D', 'D7', 'G', 'G', 'G', 'G', 'C', 'Am', 'D', 'D7', 'G', 'G', 'G', 'G', 'G', 'C', 'G', 'A7', 'D7', 'G', 'G', 'G', 'G', 'C', 'G', 'D7', 'G'];
function jingleBar(r, dest, b, t) { const k = b % 32, round = Math.floor(b / 32) % 2, chorus = k >= 16, mel = chorus ? JB_CHORUS[k - 16] : JB_VERSE[k], [root, ch] = CH[JB_HARM[k]];
  for (const [off, m, len] of mel) { const tt = t + off * JB_B + rnd(0, 0.004), dur = len * JB_B;
    if (chorus) { partials(r, dest, tt, m + 12, 0.1, Math.max(0.3, dur * 1.3), GLOCK); lead(r, dest, tt, m, 0.05, dur * 0.92, 2200); }
    else { partials(r, dest, tt, m + 12, 0.08, Math.max(0.3, dur * 1.4), CELESTA); lead(r, dest, tt, m, 0.04, dur * 0.9, 1500); } }
  // ブン・チャッ（1・3拍目に低音、2・4拍目に和音）
  bass(r, dest, t, root, 0.2, 0.36); bass(r, dest, t + 2 * JB_B, root + 7, 0.16, 0.36); for (const beat of [1, 3]) stab(r, dest, t + beat * JB_B, ch, 0.045);
  // そりの鈴：8分で小さく、2・4拍目で強く。前半は、ひづめがカポカポ
  for (let e = 0; e < 8; e++) sleigh(r, dest, t + e * JB_B / 2, e % 4 === 2 ? 0.07 : 0.03);
  if (!chorus) for (let q = 0; q < 4; q++) hoof(r, dest, t + q * JB_B, q % 2 === 0, 0.05);
  if (k === 23) whip(r, dest, t + 2 * JB_B, 0.12);   // 「ヘイ！」
  if (round && chorus && k % 4 === 0) partials(r, dest, t, root + 36, 0.05, 2.2, CHIME); }

// ---------- 2 We Wish You a Merry Christmas：ト長調・3拍子・143bpm。前奏（弱起のレ）＋8小節を2回＋おわりの1小節 ----------
const WW_B = 0.42, WW_BAR = WW_B * 3;
const WW_MEL = [[[2, D4, 1]],
  [[0, G4, 1], [1, G4, 0.5], [1.5, A4, 0.5], [2, G4, 0.5], [2.5, F4s, 0.5]], [[0, E4, 1], [1, 60, 1], [2, E4, 1]], [[0, A4, 1], [1, A4, 0.5], [1.5, B4, 0.5], [2, A4, 0.5], [2.5, G4, 0.5]], [[0, F4s, 1], [1, D4, 1], [2, D4, 1]],
  [[0, B4, 1], [1, B4, 0.5], [1.5, C5, 0.5], [2, B4, 0.5], [2.5, A4, 0.5]], [[0, G4, 1], [1, E4, 1], [2, D4, 0.5], [2.5, D4, 0.5]], [[0, E4, 1], [1, A4, 1], [2, F4s, 1]], [[0, G4, 2], [2, D4, 1]]];
const WW_HARM = ['D', 'G', 'C', 'A7', 'D', 'B7', 'Em', 'C', 'G'];
function wishBar(r, dest, b, t) { const k = b % 17, second = k >= 9 && k <= 16, idx = k === 0 ? 0 : k === 16 ? 8 : ((k - 1) % 8) + 1, mel = k === 16 ? [[0, G4, 3]] : WW_MEL[idx], h = k === 16 ? 'G' : WW_HARM[idx], [root, ch] = CH[h];
  for (const [off, m, len] of mel) { const tt = t + off * WW_B + rnd(0, 0.004), dur = len * WW_B;
    partials(r, dest, tt, m + 12, 0.09, Math.max(0.35, dur * 1.5), second ? GLOCK : CELESTA); if (second) lead(r, dest, tt, m, 0.045, dur * 0.9, 2000); else partials(r, dest, tt, m + 24, 0.025, 0.5, GLOCK); }
  if (k === 0) { stab(r, dest, t, CH.D[1], 0.05); return; }
  // ズン・チャッ・チャッ（ワルツ）。「ハッピーニュー」の小節は、2拍目から和音がレ（ド→レ）
  bass(r, dest, t, root, 0.2, 0.4); const chB = idx === 7 ? CH.D7[1] : ch; for (const beat of [1, 2]) stab(r, dest, t + beat * WW_B, chB, 0.04);
  sleigh(r, dest, t, 0.035);
  if (idx === 1 || idx === 5) partials(r, dest, t, root + 36, 0.05, 2.4, CHIME);
  if (k === 16) { partials(r, dest, t, 79, 0.08, 3.2, CHIME); partials(r, dest, t + 0.02, 67, 0.06, 3.2, CHIME); strings(r, dest, t, [55, 59, 62, 67], WW_BAR * 1.6, 0.025); } }

// ---------- 3 きよしこの夜：ハ長調・6/8拍子（8分音符＝0.36秒）・24小節。ギターの分散和音・やわらかな笛・弦 ----------
const SN_E = 0.36, SN_BAR = SN_E * 6;
const SL = [[0, 67, 3], [3, 69, 1], [4, 67, 2]], SE = [[0, 64, 6]], SR = [[0, 69, 4], [4, 69, 2]], SV = [[0, 72, 3], [3, 71, 1], [4, 69, 2]];
const SN_MEL = [SL, SE, SL, SE, [[0, 74, 4], [4, 74, 2]], [[0, 71, 6]], [[0, 72, 4], [4, 72, 2]], [[0, 67, 6]], SR, SV, SL, SE, SR, SV, SL, SE,
  [[0, 74, 4], [4, 74, 2]], [[0, 77, 3], [3, 74, 1], [4, 71, 2]], [[0, 72, 6]], [[0, 76, 6]], [[0, 72, 3], [3, 67, 1], [4, 64, 2]], [[0, 67, 3], [3, 65, 1], [4, 62, 2]], [[0, 60, 6]], []];
const SN_HARM = ['C', 'C', 'C', 'C', 'G7', 'G7', 'C', 'C', 'F', 'F', 'C', 'C', 'F', 'F', 'C', 'C', 'G7', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C'];
const ARP = { C: [48, 55, 60, 64, 60, 55], G7: [43, 50, 55, 59, 65, 59], F: [41, 48, 53, 57, 53, 48] };
function silentBar(r, dest, b, t) { const k = b % 24, h = SN_HARM[k], second = Math.floor(b / 24) % 2;
  ARP[h].forEach((m, e) => guitar(r, dest, t + e * SN_E + rnd(0, 0.01), m, e === 0 ? 0.11 : 0.06, e === 0 ? 1.8 : 1.0));
  for (const [off, m, len] of SN_MEL[k]) { const tt = t + off * SN_E, dur = len * SN_E; lead(r, dest, tt, m, 0.05, dur * 0.95, 1100); partials(r, dest, tt, m + 12, second ? 0.05 : 0.03, Math.max(0.5, dur * 1.2), CELESTA); }
  strings(r, dest, t, CH[h][1], SN_BAR, second ? 0.018 : 0.011);
  if (k === 0 || k === 18) partials(r, dest, t, 72, 0.05, 3.5, CHIME); }

const TRACKS = { jingle: { name: 'ジングルベル', desc: 'そりの鈴と、ひづめの音', barSec: JB_BAR, bar: jingleBar, wet: 0.16 }, wish: { name: 'We Wish You a Merry Christmas', desc: '3拍子の、にぎやかな鐘', barSec: WW_BAR, bar: wishBar, wet: 0.24 }, silent: { name: 'きよしこの夜', desc: 'ギターと、しずかな夜', barSec: SN_BAR, bar: silentBar, wet: 0.38 } };
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
  // 書き出し（聞き比べ・検査用）：音の部屋 ac（OfflineAudioContext でよい）に、曲 id を sec 秒ぶん並べる
  render(ac, id, sec) { const tr = TRACKS[id], r = makeRig(ac), g = r.out(0.8, tr.wet), n = Math.ceil((sec - 0.1) / tr.barSec); for (let b = 0; b < n; b++) tr.bar(r, g, b, 0.1 + b * tr.barSec); },
};
