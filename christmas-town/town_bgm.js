// 港町のBGM（仕掛けの中は鳴らさない）。音声ファイルは使わず、その場で合成する
// 旋律の出典（どれも著作権の切れた曲。編曲と音色は自作）：
//   ジングルベル … J. L. ピアポント 1857年
//   We Wish You a Merry Christmas … イングランド西部の伝承曲
//   きよしこの夜 … F. X. グルーバー 1818年（ギターの伴奏＝初演と同じ）
//   もろびとこぞりて（Joy to the World）… L. メイソン 1839年の曲「アンティオック」。英語版ウィキペディアの楽譜と1音ずつ照合
//   ひいらぎかざろう（Deck the Halls）… ウェールズの伝承曲（ノス・ガラン）＋英語詞 T. オリファント 1862年。The Everyday Song Book の譜と照合
//   もみの木（O Tannenbaum）… ドイツの伝承曲（詞 E. アンシュッツ 1824年）。abcnotation.com の別々の2つの譜（ト長調・ニ長調）と照合
// 前の版の「プチッ」の正体（書き出して測った）：音量の既定値は1。予約した音量が始まる直前の1サンプルだけ、ノイズが素通りしていた（そりの鈴・ひづめ）。
//   どの音も、音量を0から始めて0で終える。打つ・はじく音は最初に1度だけ波形を作っておき、1音＝ノード1つで鳴らす（スマホで町と一緒でも処理が追いつくように）
// 自作の旋律をオルゴールと深い残響で鳴らした版は、夜の古いオルゴールのようで、ハロウィンのように聞こえた（本人）。オルゴールは高い音・長調・残響ひかえめ
let ctx = null, rig = null, live = null, timer = null, wanted = false, cur = 'jingle';
// 3秒先まで予約し、0.25秒ごとに見回る（画面の処理で2.7秒止まっても途切れない）
const LOOK = 3, TICK = 250, TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a), mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------- 土台：出口・残響 ----------
function makeRig(c) {
  const master = c.createGain(), comp = c.createDynamicsCompressor(); master.gain.value = 0.55; comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 3; master.connect(comp); comp.connect(c.destination);
  // 残響は0.6秒のモノラル（前の1.7秒ステレオより軽い）。右だけ13ms遅らせて、左右に少し広げる
  const sr = c.sampleRate, n = Math.floor(sr * 0.6), ir = c.createBuffer(1, n, sr), d = ir.getChannelData(0); let lp = 0;
  for (let i = 0; i < n; i++) { lp += 0.3 * (Math.random() * 2 - 1 - lp); d[i] = lp * Math.pow(1 - i / n, 2.6); }
  const revIn = c.createGain(), conv = c.createConvolver(), dly = c.createDelay(0.05), mg = c.createChannelMerger(2);
  revIn.channelCount = 1; revIn.channelCountMode = 'explicit'; conv.buffer = ir; dly.delayTime.value = 0.013;
  revIn.connect(conv); conv.connect(mg, 0, 0); conv.connect(dly); dly.connect(mg, 0, 1); mg.connect(master);
  return { c, master, revIn, bank: {}, waves: {} };
}
// 楽器の通り道（音量・こもらせ・左右）。曲ごとに作り、曲を替えたら捨てる
function chan(r, bus, vol, lp, pan) { const c = r.c, g = c.createGain(); g.gain.value = vol; let out = g;
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; } out.connect(bus);
  if (!lp) return g; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.6; f.connect(g); return f; }

// ---------- 打つ・はじく音：1度だけ波形を作る ----------
// 頭はなめらかに立ち上げ、終わりの3割で0まで下げる（途中で切れると「プチッ」）。音の高さは、高い方の見本を下げて作る（上げると折り返しの雑音が出る）
function bake(c, sec, atk, fill) { const sr = c.sampleRate, n = Math.ceil(sec * sr), b = c.createBuffer(1, n, sr), d = b.getChannelData(0); fill(d, sr);
  const A = Math.max(1, Math.round(atk * sr)), F = Math.floor(n * 0.3); let pk = 0;
  for (let i = 0; i < n; i++) { if (i < A) d[i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / A); if (i > n - F) d[i] *= 0.5 + 0.5 * Math.cos(Math.PI * (i - n + F) / F); pk = Math.max(pk, Math.abs(d[i])); }
  for (let i = 0; i < n; i++) d[i] /= pk || 1; return b; }
// 倍音を重ねて、それぞれの速さで消える（鐘・オルゴールのなかま）。[倍率, 大きさ, 消える速さ（秒）]
const ring = (P) => (d, sr, f) => { for (const [m, g, tau] of P) { if (f * m > sr * 0.42) continue; const w = TAU * f * m / sr, k = Math.exp(-1 / (tau * sr)); let e = g;
  for (let i = 0; i < d.length && e > 1e-5; i++, e *= k) d[i] += e * Math.sin(w * i); } };
// 消えない倍音の束（アコーディオンのリード）。2枚を少しずらして、うなりを出す
const harm = (A, det) => (d, sr, f) => { for (const dc of det) for (let h = 1; h <= A.length && f * h * dc < sr * 0.42; h++) { const w = TAU * f * h * dc / sr; for (let i = 0; i < d.length; i++) d[i] += A[h - 1] * Math.sin(w * i); } };
// はじいた弦（カープラス・ストロング）。bright＝はじいた瞬間の明るさ、t60＝1000分の1に消えるまでの秒
const pluck = (bright, t60) => (d, sr, f) => { const P = sr / f - 0.5, L = Math.floor(P - 0.1), C = (1 - (P - L)) / (1 + (P - L)), buf = new Float32Array(L), rho = Math.pow(0.001, 1 / (t60 * f)); let lp = 0, mean = 0;
  for (let i = 0; i < L; i++) { lp += bright * (Math.random() * 2 - 1 - lp); buf[i] = lp; mean += lp / L; } for (let i = 0; i < L; i++) buf[i] -= mean;
  let j = 0, prev = 0, x1 = 0, y1 = 0; for (let i = 0; i < d.length; i++) { const x = buf[j]; d[i] = x; const y = rho * 0.5 * (x + prev); prev = x; const a = C * y + x1 - C * y1; x1 = y; y1 = a; buf[j] = a; if (++j === L) j = 0; } };
// そりの鈴：小さな鈴5つが少しずつずれて鳴る＋高いところだけのシャッ
function sleighFill(d, sr) { for (let b = 0; b < 5; b++) { const o = Math.floor(sr * rnd(0, 0.02)), f = rnd(2600, 4400), amp = rnd(0.4, 1), tau = rnd(0.05, 0.14), A = Math.round(sr * 0.0007);
    for (const [m, g, s] of [[1, 1, 1], [1.47, 0.6, 0.7], [2.09, 0.4, 0.5], [2.56, 0.25, 0.4]]) { if (f * m > sr * 0.42) continue; const w = TAU * f * m / sr, k = Math.exp(-1 / (tau * s * sr)); let e = amp * g;
      for (let i = 0; o + i < d.length && e > 1e-5; i++, e *= k) d[o + i] += (i < A ? 0.5 - 0.5 * Math.cos(Math.PI * i / A) : 1) * e * Math.sin(w * i); } }
  let x0 = 0, hp = 0; for (let i = 0; i < d.length; i++) { const x = Math.random() * 2 - 1; hp = 0.6 * (hp + x - x0); x0 = x; d[i] += 0.35 * hp * Math.exp(-i / (sr * 0.045)); } }
// ひづめ（カポッ）：下がる音＋木の当たる音
const hoofFill = (f0, f1) => (d, sr) => { let ph = 0, x0 = 0, y = 0, z = 0;
  for (let i = 0; i < d.length; i++) { const t = i / sr, x = Math.random() * 2 - 1; ph += TAU * (f1 + (f0 - f1) * Math.exp(-t / 0.02)) / sr; y = 0.7 * (y + x - x0); x0 = x; z += 0.5 * (y - z); d[i] = Math.exp(-t / 0.018) * Math.sin(ph) + 0.4 * z * Math.exp(-t / 0.004); } };
// ムチ（パシッ）
function whipFill(d, sr) { let x0 = 0, hp = 0; for (let i = 0; i < d.length; i++) { const t = i / sr, x = Math.random() * 2 - 1; hp = 0.75 * (hp + x - x0); x0 = x; d[i] = hp * Math.exp(-t / 0.035) + 0.5 * Math.sin(TAU * (3000 * t - 40000 * t * t)) * Math.exp(-t / 0.008); } }
// ティンパニ：少し高く当たって、すぐ落ち着く
function timpFill(d, sr, f) { for (const [m, g, tau] of [[1, 1, 0.85], [1.5, 0.35, 0.45], [1.98, 0.22, 0.35], [2.44, 0.1, 0.2]]) { let ph = 0; for (let i = 0; i < d.length; i++) { const t = i / sr; ph += TAU * f * m * (1 + 0.025 * Math.exp(-t / 0.06)) / sr; d[i] += g * Math.exp(-t / tau) * Math.sin(ph); } }
  let lp = 0; for (let i = 0; i < d.length; i++) { lp += 0.04 * (Math.random() * 2 - 1 - lp); d[i] += 2.5 * lp * Math.exp(-i / (sr * 0.03)); } }
// オルゴールの櫛歯：基音が長く残り、6倍あたりの高い音（チン）がすぐ消える。ほんの少しずれた音で、金属のきらめき
const BOX_T = { 60: 1.25, 72: 0.95, 84: 0.68, 96: 0.48 };
const INST = {
  box: { bases: [60, 72, 84, 96], sec: (b) => 0.4 + 3 * BOX_T[b], atk: 0.001, fill: (d, sr, f, b) => ring([[1, 1, BOX_T[b]], [1.0021, 0.12, BOX_T[b] * 1.5], [2, 0.05, BOX_T[b] * 0.35], [5.95, 0.34, 0.11], [9.6, 0.07, 0.035]])(d, sr, f) },
  glk: { bases: [84, 96], sec: () => 1.6, atk: 0.0008, fill: ring([[1, 1, 0.75], [2.76, 0.3, 0.2], [5.4, 0.1, 0.06]]) },
  cel: { bases: [72, 84, 96], sec: () => 1.6, atk: 0.0012, fill: ring([[1, 1, 0.6], [2, 0.3, 0.25], [3, 0.06, 0.1], [4, 0.06, 0.08]]) },
  chime: { bases: [72, 84], sec: () => 3.4, atk: 0.002, fill: ring([[1, 1, 2], [2, 0.45, 1.6], [3, 0.3, 1.1], [4.16, 0.22, 0.8], [5.43, 0.14, 0.5]]) },
  hbell: { bases: [72, 84, 96], sec: () => 2.6, atk: 0.003, fill: ring([[1, 1, 1.3], [3, 0.4, 0.5], [2, 0.06, 0.8], [4.2, 0.07, 0.15], [5.4, 0.05, 0.08]]) },
  ep: { bases: [60, 72], sec: () => 1, atk: 0.002, fill: ring([[1, 1, 0.42], [2, 0.32, 0.13], [3, 0.09, 0.06], [4, 0.04, 0.04]]) },
  nylon: { bases: [48, 60, 72], sec: () => 2.4, atk: 0.0015, fill: pluck(0.32, 3.2) },
  pizz: { bases: [60, 72, 84], sec: () => 0.8, atk: 0.001, fill: pluck(0.55, 0.45) },
  pbass: { bases: [48, 60], sec: () => 1.4, atk: 0.002, fill: pluck(0.25, 1.6) },
  timp: { bases: [45], sec: () => 2.2, atk: 0.002, fill: timpFill },
  reed: { bases: [60, 72], sec: () => 0.34, atk: 0.01, fill: harm([1, 0.75, 0.62, 0.5, 0.4, 0.3, 0.24, 0.17, 0.12, 0.08, 0.05], [0.9965, 1.0035]) },
  reedB: { bases: [60], sec: () => 0.55, atk: 0.012, fill: harm([1, 0.9, 0.75, 0.55, 0.4, 0.28, 0.18, 0.1], [0.997, 1.003]) },
  sleigh0: { bases: [0], sec: () => 0.4, atk: 0.0006, fill: sleighFill }, sleigh1: { bases: [0], sec: () => 0.4, atk: 0.0006, fill: sleighFill }, sleigh2: { bases: [0], sec: () => 0.4, atk: 0.0006, fill: sleighFill },
  hoofH: { bases: [0], sec: () => 0.12, atk: 0.0008, fill: hoofFill(1180, 700) }, hoofL: { bases: [0], sec: () => 0.12, atk: 0.0008, fill: hoofFill(860, 520) },
  whip: { bases: [0], sec: () => 0.25, atk: 0.001, fill: whipFill },
};
// midi＝音の高さ（鈴などは、ほんの少しの揺らぎ）。vol を渡した時だけ、音量のノードを足す
function hit(r, dest, t, name, midi, vol) { const I = INST[name], base = I.bases.find((b) => b >= midi) ?? I.bases[I.bases.length - 1], key = name + base;
  const b = r.bank[key] || (r.bank[key] = bake(r.c, I.sec(base), I.atk, (d, sr) => I.fill(d, sr, mtof(base), base))), s = r.c.createBufferSource();
  s.buffer = b; s.playbackRate.value = Math.pow(2, (midi - base) / 12);
  if (vol != null) { const g = r.c.createGain(); g.gain.value = vol; s.connect(g); g.connect(dest); } else s.connect(dest); s.start(t); }

// ---------- のばす音：1音＝発振器＋音量（2つ。det を渡すと、ずらした発振器をもう1つ） ----------
const WAVES = { lead: [1, 0.55, 0.38, 0.26, 0.18, 0.12, 0.08, 0.05, 0.03], brass: [1, 0.9, 0.75, 0.6, 0.48, 0.37, 0.28, 0.2, 0.14, 0.1, 0.07, 0.05], horn: [1, 0.45, 0.25, 0.12, 0.06, 0.03],
  flute: [1, 0.18, 0.06, 0.025], reed: [1, 0.75, 0.62, 0.5, 0.4, 0.3, 0.24, 0.17, 0.12, 0.08], str: [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.13, 0.1, 0.08, 0.06] };
function wave(r, k) { if (!r.waves[k]) { const A = WAVES[k], re = new Float32Array(A.length + 1), im = new Float32Array(A.length + 1); A.forEach((a, i) => { im[i + 1] = a; }); r.waves[k] = r.c.createPeriodicWave(re, im); } return r.waves[k]; }
// o: w＝音色 a＝立ち上がり rel＝消える時間 sus＝終わりぎわの音量の割合 vib＝ビブラート（セント） scoop＝下からすくう（セント） det＝2枚のずれ（セント）
function voice(r, dest, t, midi, len, vol, o) { const c = r.c, g = c.createGain(), a = o.a || 0.02, rel = o.rel || 0.1, end = t + Math.max(len, a + 0.03), stop = end + rel + 0.02;
  g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.linearRampToValueAtTime(vol * (o.sus ?? 0.8), end); g.gain.linearRampToValueAtTime(0, end + rel); g.connect(dest);
  for (const dc of o.det ? [-o.det, o.det] : [0]) { const s = c.createOscillator(); s.setPeriodicWave(wave(r, o.w)); s.frequency.value = mtof(midi); s.detune.value = dc;
    if (o.scoop) { s.detune.setValueAtTime(dc - o.scoop, t); s.detune.linearRampToValueAtTime(dc, t + 0.06); }
    // ビブラートは0.3秒たってから。ノードを足さず、細かい予約の列で揺らす
    if (o.vib && end - t > 0.5) { const n = Math.ceil((stop - t - 0.3) * 40), v = new Float32Array(n); for (let i = 0; i < n; i++) v[i] = dc + o.vib * Math.min(1, i / 12) * Math.sin(TAU * 5.3 * i / 40); s.detune.setValueCurveAtTime(v, t + 0.3, n / 40); }
    s.connect(g); s.start(t); s.stop(stop); } }
// やわらかい弦の和音（和音ごとに音量のノード1つ）
function pad(r, dest, t, midis, len, vol) { const c = r.c, g = c.createGain(); g.gain.value = 0; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.5); g.gain.setValueAtTime(vol, t + len); g.gain.linearRampToValueAtTime(0, t + len + 0.8); g.connect(dest);
  for (const m of midis) for (const dc of [-7, 7]) { const s = c.createOscillator(); s.setPeriodicWave(wave(r, 'str')); s.frequency.value = mtof(m); s.detune.value = dc; s.connect(g); s.start(t); s.stop(t + len + 0.85); } }

// 和音：[低音, [和音の音]]
const CH = { G: [43, [55, 59, 62]], C: [48, [55, 60, 64]], Am: [45, [57, 60, 64]], D: [38, [54, 57, 62]], D7: [38, [54, 57, 60]], A: [45, [57, 61, 64]], A7: [45, [55, 57, 61]], B7: [47, [54, 57, 59, 63]], Bm: [47, [54, 59, 62]],
  Em: [40, [55, 59, 64]], F: [41, [57, 60, 65]], G7: [43, [53, 59, 62]], C7: [48, [55, 58, 64]], Bb: [46, [58, 62, 65]] };

// ---------- 1 ジングルベル：ト長調・4拍子・136bpm。前半16小節＋サビ16小節。そりの鈴・ひづめ・グロッケン ----------
const JB_B = 0.44;
const D4 = 62, E4 = 64, F4s = 66, G4 = 67, A4 = 69, B4 = 71, C5 = 72, D5 = 74, E5 = 76;
const L4 = (a, b, c, d) => [[0, a, 1], [1, b, 1], [2, c, 1], [3, d, 1]];
// 歌の音節どおり：1行目だけ「in a」の8分2つ。「sleigh」「bright」は4拍のばす（次の行は小節の頭から）
const JB_VERSE = [L4(D4, B4, A4, G4), [[0, D4, 3], [3, D4, 0.5], [3.5, D4, 0.5]], L4(D4, B4, A4, G4), [[0, E4, 4]], L4(E4, C5, B4, A4), [[0, F4s, 4]], L4(D5, D5, C5, A4), [[0, B4, 4]],
  L4(D4, B4, A4, G4), [[0, D4, 4]], L4(D4, B4, A4, G4), [[0, E4, 4]], L4(E4, C5, B4, A4), L4(D5, D5, D5, D5), L4(E5, D5, C5, A4), [[0, G4, 2], [2, D5, 2]]];
const JB_BELLS = [[0, B4, 1], [1, B4, 1], [2, B4, 2]], JB_WAY = [[0, B4, 1], [1, D5, 1], [2, G4, 1.5], [3.5, A4, 0.5]], JB_FUN = [[0, C5, 1], [1, C5, 1], [2, C5, 1.5], [3.5, C5, 0.5]], JB_RIDE = [[0, C5, 1], [1, B4, 1], [2, B4, 1], [3, B4, 0.5], [3.5, B4, 0.5]];
const JB_CHORUS = [JB_BELLS, JB_BELLS, JB_WAY, [[0, B4, 4]], JB_FUN, JB_RIDE, L4(B4, A4, A4, B4), [[0, A4, 2], [2, D5, 2]], JB_BELLS, JB_BELLS, JB_WAY, [[0, B4, 4]], JB_FUN, JB_RIDE, L4(D5, D5, C5, A4), [[0, G4, 4]]];
const JB_HARM = ['G', 'G', 'G', 'C', 'Am', 'D', 'D7', 'G', 'G', 'G', 'G', 'C', 'Am', 'D', 'D7', 'G', 'G', 'G', 'G', 'G', 'C', 'G', 'A7', 'D7', 'G', 'G', 'G', 'G', 'C', 'G', 'D7', 'G'];
const jingleSetup = (r, bus) => ({ glk: chan(r, bus, 0.1), cel: chan(r, bus, 0.08), lead: chan(r, bus, 1, 2000), bass: chan(r, bus, 0.2), stab: chan(r, bus, 0.04, 2600),
  bellA: chan(r, bus, 0.06, 0, 0.15), bellB: chan(r, bus, 0.026, 0, 0.15), hoof: chan(r, bus, 0.05, 0, -0.1), fx: chan(r, bus, 1) });
function jingleBar(r, ch, k, t, n) { const chorus = k >= 16, mel = chorus ? JB_CHORUS[k - 16] : JB_VERSE[k], [root, tones] = CH[JB_HARM[k]];
  for (const [off, m, len] of mel) { const tt = t + off * JB_B + rnd(0, 0.004);
    hit(r, chorus ? ch.glk : ch.cel, tt, chorus ? 'glk' : 'cel', m + 12); voice(r, ch.lead, tt, m, len * JB_B * 0.9, chorus ? 0.05 : 0.036, { w: 'lead', a: 0.025, rel: 0.12, vib: 7 }); }
  // ブン・チャッ（1・3拍目に低音、2・4拍目に和音）
  hit(r, ch.bass, t, 'pbass', root); hit(r, ch.bass, t + 2 * JB_B, 'pbass', root + 7); for (const beat of [1, 3]) for (const m of tones) hit(r, ch.stab, t + beat * JB_B, 'ep', m);
  // そりの鈴：8分で小さく、2・4拍目で強く。前半は、ひづめがカポカポ
  for (let e = 0; e < 8; e++) hit(r, e % 4 === 2 ? ch.bellA : ch.bellB, t + e * JB_B / 2, 'sleigh' + Math.floor(rnd(0, 3)), rnd(-0.3, 0.3));
  if (!chorus) for (let q = 0; q < 4; q++) hit(r, ch.hoof, t + q * JB_B, q % 2 === 0 ? 'hoofH' : 'hoofL', 0);
  if (k === 23) hit(r, ch.fx, t + 2 * JB_B, 'whip', 0, 0.12);   // 「ヘイ！」
  if (Math.floor(n / 32) % 2 && chorus && k % 4 === 0) hit(r, ch.fx, t, 'chime', root + 36, 0.05); }

// ---------- 2 We Wish You a Merry Christmas：ト長調・3拍子・143bpm。オルゴールだけで（旋律・低音・和音を同じ櫛歯で） ----------
// 前奏（弱起のレ）＋8小節を2回＋おわりの1小節。2回目は旋律に1オクターブ上を重ね、伴奏を8分の分散和音に
const WW_B = 0.42;
const WW_MEL = [[[2, D4, 1]],
  [[0, G4, 1], [1, G4, 0.5], [1.5, A4, 0.5], [2, G4, 0.5], [2.5, F4s, 0.5]], [[0, E4, 1], [1, 60, 1], [2, E4, 1]], [[0, A4, 1], [1, A4, 0.5], [1.5, B4, 0.5], [2, A4, 0.5], [2.5, G4, 0.5]], [[0, F4s, 1], [1, D4, 1], [2, D4, 1]],
  [[0, B4, 1], [1, B4, 0.5], [1.5, C5, 0.5], [2, B4, 0.5], [2.5, A4, 0.5]], [[0, G4, 1], [1, E4, 1], [2, D4, 0.5], [2.5, D4, 0.5]], [[0, E4, 1], [1, A4, 1], [2, F4s, 1]], [[0, G4, 2], [2, D4, 1]]];
const WW_HARM = ['D', 'G', 'C', 'A7', 'D', 'B7', 'Em', 'C', 'G'];
const wishSetup = (r, bus) => ({ mel: chan(r, bus, 0.15, 0, -0.08), hi: chan(r, bus, 0.055, 0, 0.12), acc: chan(r, bus, 0.07, 0, 0.1), bass: chan(r, bus, 0.085) });
function wishBar(r, ch, k, t, n) { const B = WW_B, round = Math.floor(n / 17) % 2, idx = k === 0 ? 0 : k === 16 ? 8 : ((k - 1) % 8) + 1, mel = k === 16 ? [[0, G4, 3]] : WW_MEL[idx], [root, tones] = CH[k === 16 ? 'G' : WW_HARM[idx]];
  for (const [off, m] of mel) { const tt = t + off * B + rnd(0, 0.006); hit(r, ch.mel, tt, 'box', m + 12); if (round) hit(r, ch.hi, tt + 0.012, 'box', m + 24); }
  hit(r, ch.bass, t, 'box', root + 12);
  if (k === 0) { tones.forEach((m, i) => hit(r, ch.acc, t + 0.03 * (i + 1), 'box', m)); return; }
  // ズン・チャッ・チャッ。「ハッピーニュー」の小節は、2拍目から和音がレ（ド→レ）
  const tn = idx === 7 ? CH.D7[1] : tones;
  if (!round) for (const beat of [1, 2]) { hit(r, ch.acc, t + beat * B, 'box', tn[1]); hit(r, ch.acc, t + beat * B + 0.01, 'box', tn[2]); }
  else [tn[0], tn[1], tn[2], tn[1]].forEach((m, e) => hit(r, ch.acc, t + B + e * B / 2, 'box', m));
  // おわり：下から上へ、きらきらと駆け上がる
  if (k === 16) [67, 71, 74, 79, 83, 86, 91].forEach((m, i) => hit(r, ch.hi, t + B + i * 0.07, 'box', m)); }

// ---------- 3 きよしこの夜：ハ長調・6/8拍子（8分音符＝0.36秒）・24小節。ギターの分散和音・やわらかな笛・弦 ----------
const SN_E = 0.36, SN_BAR = SN_E * 6;
const SL = [[0, 67, 3], [3, 69, 1], [4, 67, 2]], SE = [[0, 64, 6]], SR = [[0, 69, 4], [4, 69, 2]], SV = [[0, 72, 3], [3, 71, 1], [4, 69, 2]];
const SN_MEL = [SL, SE, SL, SE, [[0, 74, 4], [4, 74, 2]], [[0, 71, 6]], [[0, 72, 4], [4, 72, 2]], [[0, 67, 6]], SR, SV, SL, SE, SR, SV, SL, SE,
  [[0, 74, 4], [4, 74, 2]], [[0, 77, 3], [3, 74, 1], [4, 71, 2]], [[0, 72, 6]], [[0, 76, 6]], [[0, 72, 3], [3, 67, 1], [4, 64, 2]], [[0, 67, 3], [3, 65, 1], [4, 62, 2]], [[0, 60, 6]], []];
const SN_HARM = ['C', 'C', 'C', 'C', 'G7', 'G7', 'C', 'C', 'F', 'F', 'C', 'C', 'F', 'F', 'C', 'C', 'G7', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C'];
const ARP = { C: [48, 55, 60, 64, 60, 55], G7: [43, 50, 55, 59, 65, 59], F: [41, 48, 53, 57, 53, 48] };
const silentSetup = (r, bus) => ({ g1: chan(r, bus, 0.13), g2: chan(r, bus, 0.075), fl: chan(r, bus, 1, 1400), cel1: chan(r, bus, 0.03, 0, 0.15), cel2: chan(r, bus, 0.05, 0, 0.15), str: chan(r, bus, 1, 1500), fx: chan(r, bus, 1) });
function silentBar(r, ch, k, t, n) { const h = SN_HARM[k], second = Math.floor(n / 24) % 2;
  ARP[h].forEach((m, e) => hit(r, e === 0 ? ch.g1 : ch.g2, t + e * SN_E + rnd(0, 0.01), 'nylon', m));
  for (const [off, m, len] of SN_MEL[k]) { const tt = t + off * SN_E; voice(r, ch.fl, tt, m, len * SN_E * 0.95, 0.05, { w: 'flute', a: 0.07, rel: 0.18, vib: 9, sus: 0.85 }); hit(r, second ? ch.cel2 : ch.cel1, tt, 'cel', m + 12); }
  pad(r, ch.str, t, CH[h][1], SN_BAR, second ? 0.018 : 0.011);
  if (k === 0 || k === 18) hit(r, ch.fx, t, 'chime', 72, 0.05); }

// ---------- 4 もろびとこぞりて：ニ長調・2/4拍子・107bpm・20小節。ラッパ（旋律）・ホルン（和音）・チューバ・ハンドベル・ティンパニ ----------
// 2回目は、旋律をハンドベルに渡す（最後の4小節でラッパが戻る）。最後の小節で、ベルが高いレから1オクターブ駆け下りる
const JW_B = 0.56;
const JW_MEL = [[[0, 74, 1], [1, 73, 0.75], [1.75, 71, 0.25]], [[0, 69, 1.5], [1.5, 67, 0.5]], [[0, 66, 1], [1, 64, 1]], [[0, 62, 1.5], [1.5, 69, 0.5]],
  [[0, 71, 1.5], [1.5, 71, 0.5]], [[0, 73, 1.5], [1.5, 73, 0.5]], [[0, 74, 3.5]], [[1.5, 74, 0.5]],
  [[0, 74, 0.5], [0.5, 73, 0.5], [1, 71, 0.5], [1.5, 69, 0.5]], [[0, 69, 0.75], [0.75, 67, 0.25], [1, 66, 0.5], [1.5, 74, 0.5]],
  [[0, 74, 0.5], [0.5, 73, 0.5], [1, 71, 0.5], [1.5, 69, 0.5]], [[0, 69, 0.75], [0.75, 67, 0.25], [1, 66, 0.5], [1.5, 66, 0.5]],
  [[0, 66, 0.5], [0.5, 66, 0.5], [1, 66, 0.5], [1.5, 66, 0.25], [1.75, 67, 0.25]], [[0, 69, 1.5], [1.5, 67, 0.25], [1.75, 66, 0.25]],
  [[0, 64, 0.5], [0.5, 64, 0.5], [1, 64, 0.5], [1.5, 64, 0.25], [1.75, 66, 0.25]], [[0, 67, 1.5], [1.5, 66, 0.25], [1.75, 64, 0.25]],
  [[0, 66, 0.5], [0.5, 74, 1], [1.5, 71, 0.5]], [[0, 69, 0.75], [0.75, 67, 0.25], [1, 66, 0.5], [1.5, 67, 0.5]], [[0, 66, 1], [1, 64, 1]], [[0, 62, 2]]];
const JW_HARM = [['D', 'A'], ['D', 'D'], ['D', 'A'], ['D', 'D'], ['G', 'G'], ['A', 'A'], ['D', 'D'], ['D', 'D'], ['D', 'G'], ['A', 'D'], ['D', 'G'], ['A', 'D'],
  ['D', 'D'], ['D', 'D'], ['A7', 'A7'], ['A7', 'A7'], ['D', 'G'], ['D', 'D'], ['D', 'A7'], ['D', 'D']];
const joySetup = (r, bus) => ({ tpt: chan(r, bus, 1, 3200, -0.1), horn: chan(r, bus, 1, 1600, 0.12), tuba: chan(r, bus, 1, 700), bell: chan(r, bus, 0.08, 0, 0.18), bellM: chan(r, bus, 0.12, 0, -0.05), timp: chan(r, bus, 0.14) });
function joyBar(r, ch, k, t, n) { const B = JW_B, round = Math.floor(n / 20) % 2, [c1, c2] = JW_HARM[k];
  for (const [off, m, len] of JW_MEL[k]) { const tt = t + off * B + rnd(0, 0.004);
    if (!round || k >= 16) voice(r, ch.tpt, tt, m, len * B * 0.9, 0.055, { w: 'brass', a: 0.03, rel: 0.1, scoop: 18, sus: 0.85 });
    if (round) hit(r, ch.bellM, tt, 'hbell', m + 12); }
  // ホルンは和音をのばす（同じ和音の拍はつなげる）。チューバは和音の根の音
  for (const [b0, nb, h] of c1 === c2 ? [[0, 2, c1]] : [[0, 1, c1], [1, 1, c2]]) { const [root, tones] = CH[h], tt = t + b0 * B;
    for (const m of tones) voice(r, ch.horn, tt, m, nb * B * 0.96, round ? 0.02 : 0.015, { w: 'horn', a: 0.08, rel: 0.15, sus: 0.9 }); voice(r, ch.tuba, tt, root, nb * B * 0.8, 0.07, { w: 'horn', a: 0.03, rel: 0.1 }); }
  if (!round) { const tones = CH[c1][1]; hit(r, ch.bell, t, 'hbell', tones[2] + 12); hit(r, ch.bell, t + 0.02, 'hbell', tones[1] + 12); }
  if (k === 19) [86, 85, 83, 81, 79, 78, 76, 74].forEach((m, i) => hit(r, ch.bell, t + i * B / 4, 'hbell', m));
  if (k % 4 === 0 || k === 19) hit(r, ch.timp, t, 'timp', 38); else if (k === 15) hit(r, ch.timp, t, 'timp', 45); }

// ---------- 5 ひいらぎかざろう：ヘ長調・4拍子・128bpm・16小節。チェレスタ（旋律）・弦のピチカート（低音と和音） ----------
// 2回目は、旋律にグロッケンと、1オクターブ下のピチカートを重ねる
const DK_B = 0.47;
const DK_A = [[[0, 72, 1.5], [1.5, 70, 0.5], [2, 69, 1], [3, 67, 1]], [[0, 65, 1], [1, 67, 1], [2, 69, 1], [3, 65, 1]], [[0, 67, 0.5], [0.5, 69, 0.5], [1, 70, 0.5], [1.5, 67, 0.5], [2, 69, 1.5], [3.5, 67, 0.5]], [[0, 65, 1], [1, 64, 1], [2, 65, 2]]];
const DK_MEL = [...DK_A, ...DK_A,
  [[0, 67, 1.5], [1.5, 69, 0.5], [2, 70, 1], [3, 67, 1]], [[0, 69, 1.5], [1.5, 70, 0.5], [2, 72, 1], [3, 67, 1]], [[0, 69, 0.5], [0.5, 71, 0.5], [1, 72, 1], [2, 74, 0.5], [2.5, 76, 0.5], [3, 77, 1]], [[0, 76, 1], [1, 74, 1], [2, 72, 2]],
  DK_A[0], DK_A[1], [[0, 74, 0.5], [0.5, 74, 0.5], [1, 74, 0.5], [1.5, 74, 0.5], [2, 72, 1.5], [3.5, 70, 0.5]], [[0, 69, 1], [1, 67, 1], [2, 65, 2]]];
const DK_HA = [['F', 'F', 'F', 'C7'], ['F', 'C7', 'F', 'F'], ['C7', 'C7', 'F', 'F'], ['Bb', 'C7', 'F', 'F']];
const DK_HARM = [...DK_HA, ...DK_HA, ['C', 'C', 'C7', 'C7'], ['F', 'F', 'C', 'C'], ['Am', 'Am', 'G7', 'G7'], ['C', 'G7', 'C', 'C'], DK_HA[0], DK_HA[1], ['Bb', 'Bb', 'F', 'C7'], DK_HA[3]];
const deckSetup = (r, bus) => ({ cel: chan(r, bus, 0.12, 0, -0.1), glk: chan(r, bus, 0.045, 0, 0.15), pzm: chan(r, bus, 0.07, 0, -0.15), pz: chan(r, bus, 0.06, 0, 0.12), bass: chan(r, bus, 0.15) });
function deckBar(r, ch, k, t, n) { const B = DK_B, round = Math.floor(n / 16) % 2, H = DK_HARM[k];
  for (const [off, m] of DK_MEL[k]) { const tt = t + off * B + rnd(0, 0.004); hit(r, ch.cel, tt, 'cel', m + 12); if (round) { hit(r, ch.glk, tt + 0.01, 'glk', m + 12); hit(r, ch.pzm, tt, 'pizz', m); } }
  // 低音は1・3拍目（3拍目も同じ和音なら5度上）、2・4拍目に和音をはじく
  for (const b of [0, 2]) { const root = CH[H[b]][0]; hit(r, ch.bass, t + b * B, 'pbass', b === 2 && H[2] === H[0] ? root + 7 : root); }
  for (const b of [1, 3]) for (const m of CH[H[b]][1]) hit(r, ch.pz, t + b * B + rnd(0, 0.006), 'pizz', m); }

// ---------- 6 もみの木：ニ長調・3拍子・100bpm。前奏1小節＋16小節。アコーディオン（旋律と、ズン・チャッ・チャッ）。2回目は小さな鐘を重ねる ----------
const TB_B = 0.6;
const TB_A = [[[0, 62, 0.75], [0.75, 62, 0.25], [1, 62, 1], [2, 64, 1]], [[0, 66, 0.75], [0.75, 66, 0.25], [1, 66, 1.5], [2.5, 66, 0.5]], [[0, 64, 0.5], [0.5, 66, 0.5], [1, 67, 1], [2, 61, 1]]];
const TB_MEL = [[[2, 57, 1]], ...TB_A, [[0, 64, 1], [1, 62, 1], [2, 57, 1]], ...TB_A, [[0, 64, 1], [1, 62, 1], [2.5, 69, 0.5]],
  [[0, 69, 0.5], [0.5, 66, 0.5], [1, 71, 1.5], [2.5, 69, 0.5]], [[0, 69, 0.5], [0.5, 67, 0.5], [1, 67, 1.5], [2.5, 67, 0.5]], [[0, 67, 0.5], [0.5, 64, 0.5], [1, 69, 1.5], [2.5, 67, 0.5]], [[0, 67, 0.5], [0.5, 66, 0.5], [1, 66, 1], [2, 57, 1]],
  ...TB_A, [[0, 64, 1], [1, 62, 2]]];
const TB_HA = [['D', 'D', 'A7'], ['D', 'Bm', 'Bm'], ['Em', 'Em', 'A7'], ['A7', 'D', 'D']];
const TB_HARM = [['D', 'D', 'D'], ...TB_HA, ...TB_HA, ['D', 'G', 'G'], ['A7', 'A7', 'A7'], ['A7', 'A7', 'A7'], ['D', 'D', 'A7'], ...TB_HA];
const tannSetup = (r, bus) => ({ acc: chan(r, bus, 1, 3600, -0.08), oom: chan(r, bus, 0.09), pah: chan(r, bus, 0.035, 0, 0.12), glk: chan(r, bus, 0.045, 0, 0.15) });
function tannBar(r, ch, k, t, n) { const B = TB_B, round = Math.floor(n / 17) % 2, H = TB_HARM[k];
  for (const [off, m, len] of TB_MEL[k]) { const tt = t + off * B + rnd(0, 0.004); voice(r, ch.acc, tt, m + 12, len * B * 0.92, 0.05, { w: 'reed', a: 0.03, rel: 0.08, det: 6, sus: 0.92 }); if (round) hit(r, ch.glk, tt, 'glk', m + 24); }
  hit(r, ch.oom, t, 'reedB', CH[H[0]][0] + 12); for (const b of [1, 2]) for (const m of CH[H[b]][1]) hit(r, ch.pah, t + b * B, 'reed', m);
  // 前奏（歌の合間）は、ふいごで和音をのばす（ズン・チャッ・チャッだけだと、すき間があく）
  if (k === 0) for (const m of CH.D[1]) voice(r, ch.acc, t, m + 12, 3 * B * 0.95, 0.016, { w: 'reed', a: 0.15, rel: 0.3, det: 6, sus: 1 });
  // 1周の終わりも、和音をのばして次の周の頭へつなぐ（最後の音が消えてから頭が鳴るまで、0.01秒ほど無音になった）
  if (k === TB_MEL.length - 1) for (const m of CH.D[1]) voice(r, ch.acc, t + B, m + 12, 2 * B + 0.12, 0.016, { w: 'reed', a: 0.15, rel: 0.3, det: 6, sus: 1 }); }

// beat＝1拍の秒・beats＝1小節の拍数・bars＝1周の小節数・wet＝残響・vol＝曲の音量（どの曲も、前の版と同じ聞こえの大きさ＝A特性で約 -37.5dB にそろえた。効果音との釣り合いを変えないため）
const TRACKS = {
  jingle: { name: 'ジングルベル', desc: 'そりの鈴と、ひづめの音', beat: JB_B, beats: 4, bars: 32, wet: 0.16, vol: 0.27, setup: jingleSetup, play: jingleBar },
  wish: { name: 'We Wish You a Merry Christmas', desc: 'きらきらの、オルゴール', beat: WW_B, beats: 3, bars: 17, wet: 0.1, vol: 0.29, setup: wishSetup, play: wishBar },
  silent: { name: 'きよしこの夜', desc: 'ギターと、しずかな夜', beat: SN_E, beats: 6, bars: 24, wet: 0.32, vol: 0.52, setup: silentSetup, play: silentBar },
  joy: { name: 'もろびとこぞりて', desc: 'ラッパと、ハンドベル', beat: JW_B, beats: 2, bars: 20, wet: 0.2, vol: 0.29, setup: joySetup, play: joyBar },
  deck: { name: 'ひいらぎかざろう', desc: 'はじく弦と、チェレスタ', beat: DK_B, beats: 4, bars: 16, wet: 0.16, vol: 0.3, setup: deckSetup, play: deckBar },
  tannenbaum: { name: 'もみの木', desc: 'アコーディオンと、小さな鐘', beat: TB_B, beats: 3, bars: 17, wet: 0.18, vol: 0.63, setup: tannSetup, play: tannBar },
};

// ---------- 予約 ----------
function player(r, id, t0) { const tr = TRACKS[id], c = r.c, bus = c.createGain(), send = c.createGain();
  // 作っておいた波形は、今の曲の分だけ持つ（1曲で最大3MB・6曲ぶん全部だと10MB。48kHzで測った）
  if (r.bankFor !== id) { r.bank = {}; r.bankFor = id; }
  bus.gain.value = 0; bus.gain.setValueAtTime(0, c.currentTime); bus.gain.linearRampToValueAtTime(tr.vol, t0 + 0.3); send.gain.value = tr.wet; bus.connect(r.master); bus.connect(send); send.connect(r.revIn);
  return { tr, bus, ch: tr.setup(r, bus), bar: 0, next: t0, len: tr.beat * tr.beats }; }
function pumpTo(r, p, until) { const now = r.c.currentTime;
  // 画面の処理で見回りが遅れた時：間に合わない小節は鳴らさず、次の小節の頭から入る（遅れた分を一度に鳴らすと、音が団子になって割れる）
  if (p.next < now + 0.03) { const k = Math.ceil((now + 0.03 - p.next) / p.len); p.bar += k; p.next += k * p.len; }
  while (p.next < until) { p.tr.play(r, p.ch, p.bar % p.tr.bars, p.next, p.bar); p.next += p.len; p.bar++; } }
// 0.15秒の時定数で消して（1秒で -60dB）、消えたら線を外す（先の予約の音は、もう計算されない）
function release(r, p) { const g = p.bus.gain, now = r.c.currentTime;
  if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(now); else { const v = g.value; g.cancelScheduledValues(now); g.setValueAtTime(v, now); }
  g.setTargetAtTime(0, now, 0.15); setTimeout(() => p.bus.disconnect(), 1500); }
function start() { if (!ctx || live) return; if (!rig) rig = makeRig(ctx); live = player(rig, cur, ctx.currentTime + 0.12); pumpTo(rig, live, ctx.currentTime + LOOK);
  if (!timer) timer = setInterval(() => { if (live) pumpTo(rig, live, ctx.currentTime + LOOK); }, TICK); }
function stop() { if (timer) { clearInterval(timer); timer = null; } if (live) { release(rig, live); live = null; } }
export const BGM = {
  tracks: Object.keys(TRACKS).map((id) => ({ id, name: TRACKS[id].name, desc: TRACKS[id].desc })),
  // ac＝効果音と同じ音の部屋（最初のタップで作られる）。on＝鳴らすか
  set(ac, on) { ctx = ac || ctx; wanted = !!on; if (on && ctx) { if (ctx.state !== 'running') ctx.resume(); start(); } else stop(); },
  get on() { return wanted; }, get track() { return cur; },
  // 鳴っている時は、前の曲をすっと消しながら、次の曲を頭から始める
  setTrack(id) { if (!TRACKS[id] || id === cur) return; cur = id; if (live) { release(rig, live); live = player(rig, cur, ctx.currentTime + 0.15); pumpTo(rig, live, ctx.currentTime + LOOK); } },
  // 書き出し（聞き比べ・検査用）：音の部屋 ac（OfflineAudioContext）に、曲 id を sec 秒ぶん。本番と同じく少しずつ予約する。返り値＝1周の長さ（秒）
  render(ac, id, sec) { const r = makeRig(ac), p = player(r, id, 0.1); pumpTo(r, p, LOOK);
    for (let k = 1; k * 0.25 < sec; k++) ac.suspend(k * 0.25).then(() => { pumpTo(r, p, k * 0.25 + LOOK); ac.resume(); });
    return p.tr.bars * p.len; },
};
