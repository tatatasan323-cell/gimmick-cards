// ガラスの音：かけらが割れる乾いた「カシャーン」・床に散る「チャッ」・外れる「ピキッ」。戻る時は、窓ごとの姿に合わせた音（光＝きらり／星＝ちりん／ハート＝ぽわん／雪＝オルゴール／鈴＝シャンシャン／羽根＝ハープ）
// どれも短い音を合成し、鳴りっぱなしにしない。なぞって一度にたくさん割れた時は、間引いて鳴らす
// 同時に鳴っている音の部品の数（act）。鈴は1回で部品が多く、一度に何十枚も戻ると数百個になって、途中で音が出なくなった（本人）。上限をこえる時は、着いた音を省き、戻った音を軽くする
// 重なった音の合計が大きすぎると、音が割れて「ぶつぶつ」と鳴った（本人）。最後に音量をならす部品（リミッター）を通し、重なるほど1つ1つを小さくする
let ac = null, out = null, lim = null, mPre = null, mPost = null, noise = null, lastK = 0, lastA = 0, lastC = 0, lastD = 0, act = 0;
const track = (n) => { act++; n.onended = () => { act--; }; };
export const voices = () => act;
const dens = () => 1 / (1 + act / 60);
// 検査用：いちばん大きな振れ幅（ならす前・後）
const peakOf = (a) => { if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m; };
export const level = () => [peakOf(mPre), peakOf(mPost)];
export function audio() {
  if (!ac) { ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = 0.85; lim = ac.createDynamicsCompressor(); lim.threshold.value = -14; lim.knee.value = 8; lim.ratio.value = 12; lim.attack.value = 0.002; lim.release.value = 0.25; out.connect(lim); lim.connect(ac.destination);
    mPre = ac.createAnalyser(); mPre.fftSize = 2048; out.connect(mPre); mPost = ac.createAnalyser(); mPost.fftSize = 2048; lim.connect(mPost); }
  if (ac.state !== 'running') ac.resume();
  return ac;
}
const r = (a, b) => a + Math.random() * (b - a), live = () => ac && ac.state === 'running';
// ガラスのひびき：基音と、ずれた倍音（2.76倍・5.4倍）が、それぞれ減衰する。atk＝立ち上がり
function tinkle(f, vol, delay = 0, dur = 0.5, atk = 0.003, partials = [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.2, 0.35]]) {
  if (!live()) return;
  try {
    const t = ac.currentTime + delay;
    for (const [m, v, d] of partials) {
      if (f * m > 16000) continue;   // 聞こえる範囲の外は鳴らさない
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * v * dens()), t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * d);
      o.connect(g); g.connect(out); track(o); o.start(t); o.stop(t + dur * d + 0.02);
    }
  } catch (e) { /* 音が出なくても遊べる */ }
}
// ノイズの鳴りはじめの時刻（検査用：1秒に何回か）
const hissT = [];
export const hissRate = () => { const n = performance.now(); while (hissT.length && n - hissT[0] > 1000) hissT.shift(); return hissT.length; };
function hiss(vol, delay, dur, type, freq, q = 0.8, atk = 0.002) {   // 短いノイズ（割れる瞬間の「シャ」）
  if (!live()) return; hissT.push(performance.now() + delay * 1000);
  try {
    const t = ac.currentTime + delay;
    if (!noise) { noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * dens()), t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); track(s); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  } catch (e) { /* 同上 */ }
}
// やわらかい1音（音の高さが少し動く・ゆれ vib）
function tone(f0, f1, vol, delay, dur, atk = 0.01, vib = 0, type = 'sine') {
  if (!live()) return;
  try {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.02); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); track(o); o.start(t); o.stop(t + dur + 0.03);
  } catch (e) { /* 同上 */ }
}
// カシャーン：乾いて短い。size＝かけらの大きさ（大きいほど、低く強く）。続けて割れた時は、軽い「チャッ」にする
export function kashan(size = 1) {
  const now = performance.now(); if (now - lastK < 70) { cha(0.035); return; } lastK = now;
  const k = Math.min(1.4, Math.max(0.6, size));
  hiss(0.16 * k, 0, 0.09, 'highpass', 3200); hiss(0.1 * k, 0, 0.04, 'bandpass', 1300, 2);
  for (let i = 0; i < 8; i++) tinkle(r(2800, 7000) / Math.sqrt(k), r(0.03, 0.06) * k, r(0, 0.07), r(0.06, 0.16));
  for (let i = 0; i < 3; i++) tinkle(r(3500, 6500), r(0.015, 0.03), r(0.12, 0.3), r(0.04, 0.09));
}
export function cha(vol = 0.03) { tinkle(r(3000, 6000), vol, 0, r(0.04, 0.08)); hiss(vol * 0.8, 0, 0.02, 'highpass', 4000); }   // 床に散る
export function crack() { const now = performance.now(); if (now - lastC < 40) return; lastC = now; tinkle(r(3800, 5200), 0.018, 0, 0.05); }   // 窓から外れる
const PENTA = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637, 3136], HI = [2093, 2349.3, 2637, 3136, 3520, 4186], HARP = [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7];
export function twinkle(k) { const f = PENTA[k % PENTA.length]; tinkle(f, 0.022, 0, 1.3, 0.03); tinkle(f * 1.004, 0.014, 0.02, 1.1, 0.04); }
export function bell() { tinkle(1568, 0.04, 0, 1.8, 0.01); tinkle(2093, 0.025, 0.08, 1.5, 0.01); }
// オルゴール：歯をはじいた音（基音＋3倍・6.2倍）
const mbox = (f, vol, delay) => tinkle(f, vol, delay, 1.6, 0.002, [[1, 1, 1], [3, 0.18, 0.35], [6.2, 0.06, 0.15]]);
// 鈴（そりの鈴）＝「シャン」：高い金属の響きが、少し長く残る（短く切ると、カラカラと鳴った）＋きらきらしたシャー
// シャーのノイズを光が着くたびに鳴らすと、1秒に20回以上重なって「ぶつぶつ」と聞こえた（本人）。シャーは「シャン、シャン、シャン」の時だけ、立ち上がりをやわらかく
function shake(vol, delay) {
  hiss(vol * 1.3, delay, 0.32, 'bandpass', 7200, 1.2, 0.012); hiss(vol * 0.7, delay + 0.01, 0.22, 'highpass', 9000, 0.8, 0.012);
  for (let i = 0; i < 4; i++) tinkle(r(4200, 8200), vol * r(0.42, 0.7), delay + r(0, 0.03), r(0.45, 0.8), 0.004, [[1, 1, 1], [1.41, 0.5, 0.7]]);
}
// 鈴の澄んだひと鳴り（ノイズなし）
const ping = (vol) => { const f = r(4200, 7000); tinkle(f, vol, 0, 0.7, 0.006, [[1, 1, 1], [1.41, 0.5, 0.7]]); tinkle(f * 1.19, vol * 0.6, 0.03, 0.6, 0.006, [[1, 1, 1], [1.41, 0.5, 0.7]]); };
let lastBell = 0, lastShan = 0;
// ハープ：はじいた弦（三角波＋倍音が、すっと消える）
function harp(f, vol, delay) {
  if (!live()) return;
  try { const t = ac.currentTime + delay; for (const [m, v, d] of [[1, 1, 1.1], [2, 0.35, 0.6], [3, 0.12, 0.35]]) { if (f * m > 16000) continue; const o = ac.createOscillator(), g = ac.createGain(); o.type = m === 1 ? 'triangle' : 'sine'; o.frequency.value = f * m; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(out); track(o); o.start(t); o.stop(t + d + 0.02); } } catch (e) { /* 同上 */ }
}
// 光が1つ窓に着いた時（続けて着く時は、45ミリ秒あける）
export function arrive(kind, k) {
  const now = performance.now(); if (now - lastA < 45 || act > 70) return; lastA = now;
  if (kind === 'star') tinkle(HI[k % HI.length], 0.02, 0, 0.45, 0.004);
  else if (kind === 'heart') tone(r(440, 560), r(620, 760), 0.035, 0, 0.22, 0.02);
  else if (kind === 'snow') mbox(PENTA[k % PENTA.length], 0.028, 0);
  else if (kind === 'bell') { if (now - lastBell < 110) return; lastBell = now; ping(0.011); }
  else if (kind === 'feather') harp(HARP[k % HARP.length], 0.035, 0);
  else twinkle(k);
}
// かけらが元どおりになった時
export function done(kind) {
  const now = performance.now(), busy = act > 110 || now - lastD < 90; if (busy && act > 170) return; lastD = now;
  if (busy || (kind === 'bell' && now - lastShan < 700)) { if (kind === 'bell') ping(0.016); else twinkle((Math.random() * 9) | 0); return; }   // 続けて戻る時は、ひと鳴りだけ
  if (kind === 'star') [2093, 2637, 3136, 4186].forEach((f, i) => tinkle(f, 0.03, i * 0.07, 0.9, 0.004));   // キラリン
  else if (kind === 'heart') { tone(523.3, 523.3, 0.04, 0, 1.0, 0.06, 4); tone(659.3, 659.3, 0.03, 0.08, 0.95, 0.06, 4); tone(784, 784, 0.02, 0.16, 0.9, 0.06, 4); }   // ぽわん
  else if (kind === 'snow') [1568, 2093, 2637].forEach((f, i) => mbox(f, 0.034, i * 0.12));
  else if (kind === 'bell') { lastShan = now; [0, 0.24, 0.48].forEach((d, i) => shake(0.02 + i * 0.006, d)); }   // シャン、シャン、シャン
  else if (kind === 'feather') HARP.slice(0, 6).forEach((f, i) => harp(f * 2, 0.026, i * 0.05));
  else bell();
}
