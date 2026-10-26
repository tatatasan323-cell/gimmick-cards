// 街の音：ゼリーの「ぼよん」・ジンジャーブレッドの「サクッ」・豆知識の「ちりん」・礼拝堂の鐘・寄る時の「ふわっ」
// どれも短い音を合成する。同時に鳴る部品の数を数え、多すぎる時は省く（ステンドグラスで、多すぎて途中から音が出なくなった）
// 押した時の音は、先に波形へ書き出しておき、鳴らす時は1つ流すだけ（音源1つ＋音量1つ）。押すたびに発振器を何十も組むと（光の波＝31個・花火＝1発28個×21発）、
//   その瞬間に曲が途切れ、画面もカクついた（本人 2026-10-25「波のタップ→花火など連続で…BGMの音飛び」）。書き出しは OfflineAudioContext（画面の処理とは別の所で計算する）
import { makeSound, r } from './sound_core.js';
// 音の部屋・出口・効果音のオン・オフと大きさ・同時に鳴る数・雑音は共通の土台（共通/sound_core.js。部屋とカードも同じ設定を読む）。港町は：大きさ0.9・同時に鳴る部品は160まで
const SC = makeSound({ gain: 0.9, cap: 160 });
let ac = null, out = null;
export function audio() { const first = !SC.ac; ac = SC.audio(); out = SC.out; if (first) setTimeout(() => prebake(PRE), 4000); return ac; }
export const voices = SC.voices;
// 効果音のオン・オフと大きさ（メニューの「音」）。BGM は別の部品で、ここには入らない
export const setMute = SC.setMute, setVolume = SC.setVolume;
let BAKING = false;   // 書き出し中（ac と out が、書き出し用の音の部屋を指している間）
const live = () => BAKING || SC.live();
const track = (n) => { if (!BAKING) SC.track(n); };
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
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = SC.noise(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out); track(s); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  } catch (e) { /* 同上 */ }
}
// ---------- かじる・砕ける・踏む音の素：波形を先に数通り作っておき（はじめて鳴らす時に）、鳴らす時は playBuf 1つ ----------
// 発振器を重ねた前の版は、低い澄んだ「ポッ」と高い澄んだ「ピッ」が出て「てってって」「ポコポコ」に聞こえ、カリカリ・コリコリにならなかった。音程のある音は、粒の中の共振だけで出す
// 粒＝雑音を共振に通した、ごく短い音。共振が弱い（q 1〜2）と乾いた「カッ」、強い（q 8〜13）と音程のある「コッ」。手ごたえ＝低く削った雑音（音程を持たせると「ボン」になる）
let SR = 44100;
function biq(type, f, q) { const w = 2 * Math.PI * Math.min(f, SR * 0.45) / SR, c = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
  const b = type === 'bp' ? [al, 0, -al] : type === 'lp' ? [(1 - c) / 2, 1 - c, (1 - c) / 2] : [(1 + c) / 2, -(1 + c), (1 + c) / 2];
  return [b[0] / a0, b[1] / a0, b[2] / a0, -2 * c / a0, (1 - al) / a0]; }
function filt(x, k) { let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = x[i], y = k[0] * v + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; } return x; }
function burst(sec, atk, tau) { const n = Math.max(2, Math.round(sec * SR)), x = new Float32Array(n), na = Math.max(1, atk * SR), dk = Math.exp(-1 / (tau * SR)); let e = 1; for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (i < na ? i / na : (e *= dk)); return x; }
function put(d, t, amp, x) { let m = 1e-9; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); const i0 = Math.round(t * SR), k = amp / m; for (let i = 0; i < x.length && i0 + i < d.length; i++) d[i0 + i] += x[i] * k; }
const crack = (d, t, amp, f, q, tau) => put(d, t, amp, filt(burst(tau * 6 + 6 * q / (Math.PI * f), 0, tau), biq('bp', f, q)));
const thud = (d, t, amp, f, tau) => { const k = biq('lp', f, 0.7); put(d, t, amp, filt(filt(burst(tau * 7, 0.0015, tau), k), k)); };
const air = (d, t, amp, lo, hi, atk, tau) => put(d, t, amp, filt(filt(burst(atk + tau * 7, atk, tau), biq('hp', lo, 0.7)), biq('lp', hi, 0.7)));
// カリカリ：1〜5msの高い破片（2〜6kHz）が、不ぞろいな間（20〜60ms）で続く。ときどき破片が2つに割れ、3粒に1つ、少し低い「かみしめる」手ごたえ
function kari(d, t0, t1, o = {}) { const p = o.p || 1, a0 = o.amp || 1, sp = o.sp || 1; let t = t0, k = 0;
  while (t < t1) { const a = a0 * (1 - 0.6 * (t - t0) / (t1 - t0)) * r(0.35, 1); crack(d, t, a, r(2000, 6000) * p, r(1.2, 3), r(0.0003, 0.0012));
    if (Math.random() < 0.45) crack(d, t + r(0.001, 0.004), a * r(0.3, 0.6), r(2500, 6500) * p, 2, r(0.0002, 0.0006));
    if (k++ % 3 === 0) thud(d, t, a * (o.bite ?? 0.07), 260, 0.004); t += r(0.02, 0.06) * sp; } }
// コリコリ：芯のある詰まった硬さ。中域（0.8〜2kHz）の「コッ」が少し音程を持ち（共振を強く）、間はやや規則的。すぐ後に小さな高い「リ」
function kori(d, t0, n, o = {}) { const p = o.p || 1, a0 = o.amp || 1, gap = o.gap || 0.08, f0 = r(950, 1500) * p;
  for (let i = 0; i < n; i++) { const t = t0 + gap * (i + r(-0.08, 0.08) * (i > 0)), a = a0 * (1 - i * 0.1) * r(0.75, 1), f = f0 * r(0.93, 1.07);
    crack(d, t, a, f, r(8, 13), r(0.0004, 0.0009)); crack(d, t + r(0.007, 0.014), a * 0.3, f * r(2.3, 3.2), 2, 0.0004); thud(d, t, a * 0.06, 320, 0.004); } }
// ガリッ：硬い塊が一度に割れる。30〜50msに破片がぎっしり（1〜5kHz）＋割れはじめの芯＋低い手ごたえ＋ざらつき
function gari(d, t, o = {}) { const p = o.p || 1, a0 = o.amp || 1, L = r(0.03, 0.05); crack(d, t, a0, r(1500, 2300) * p, 4, 0.0012);
  for (let i = 0; i < 24; i++) { const u = Math.pow(Math.random(), 1.8); crack(d, t + 0.002 + u * L, a0 * (1 - u * 0.6) * r(0.25, 0.9), r(1000, 5000) * p, r(0.7, 2), r(0.0004, 0.0016)); }
  thud(d, t, a0 * 0.22, 220, 0.008); air(d, t, a0 * 0.2, 700 * p, 2600 * p, 0.002, 0.012); }
// ポリポリ：ポ（中低域のやわらかい「ポ」）＋リ（細かい高い破片）を、かむ速さ（0.15〜0.19秒ごと）で
function pori(d, t0, n, o = {}) { const p = o.p || 1, a0 = o.amp || 1; let t = t0;
  for (let i = 0; i < n; i++) { const a = a0 * (1 - i * 0.15); crack(d, t, a * 0.85, r(650, 1000) * p, r(3, 5), r(0.0012, 0.002)); thud(d, t, a * 0.12, 280, 0.006);
    for (let k = 0; k < 4; k++) crack(d, t + r(0.02, 0.055), a * r(0.25, 0.6), r(2500, 5000) * p, r(1, 2), r(0.0003, 0.0008)); t += r(0.15, 0.19); } }
// サクッ：サ＝細かい破片がぱらぱら（2.5〜7kHz・小さく多く）と、ざらっとした粉の音。ク＝最後の小さな芯の「くっ」
function saku(d, t, o = {}) { const p = o.p || 1, a0 = o.amp || 1, L = o.L || r(0.045, 0.07), n = o.n || 26;
  crack(d, t, a0, r(2000, 3500) * p, 1.5, 0.0008);
  for (let i = 0; i < n; i++) { const u = Math.pow(Math.random(), 1.3); crack(d, t + u * L, a0 * (1 - u * 0.7) * r(0.25, 0.8), r(2500, 7000) * p, r(0.7, 1.5), r(0.0002, 0.0007)); }
  air(d, t, a0 * 0.2, 2500 * p, 7500 * p, 0.003, L * 0.35); crack(d, t + L * r(0.75, 1), a0 * 0.4, r(1300, 2000) * p, r(3, 5), r(0.0008, 0.0014)); thud(d, t, a0 * (o.bite ?? 0.08), 300, 0.006); }
// ほろほろ：くずれたかけらが、ぱらぱら落ちる（低めのやわらかい粒が、まばらに・だんだん小さく）
function horo(d, t0, t1, o = {}) { const p = o.p || 1, a0 = o.amp || 0.5; let t = t0;
  while (t < t1) { crack(d, t, a0 * r(0.3, 1) * (1 - 0.8 * (t - t0) / (t1 - t0)), r(700, 2000) * p, r(0.7, 1.5), r(0.001, 0.0025)); t += r(0.02, 0.07); } }
// パリッ：うすい殻・板が割れる。10〜15msに、ごく短い高い破片がぎっしり。ring＝澄んだ響き（ガラスのような飴）の強さ
function pari(d, t, o = {}) { const p = o.p || 1, a0 = o.amp || 1;
  for (let i = 0; i < 16; i++) { const u = Math.pow(Math.random(), 1.5); crack(d, t + u * 0.014, a0 * (1 - u * 0.5) * r(0.3, 1), r(3500, 9000) * p, r(1, 3), r(0.0002, 0.0006)); }
  if (o.ring) crack(d, t + 0.001, a0 * o.ring, r(3000, 4500) * p, 40, 0.0003); }
// しゃくっ：しゃ＝ごく細かい粒の雑音（45〜70ms・高め）、くっ＝少し低い短い芯。wet＝果汁の「じゅっ」の強さ
function shk(d, t, o = {}) { const p = o.p || 1, a0 = o.amp || 1, L = r(0.045, 0.07);
  for (let i = 0; i < 40; i++) { const u = Math.random(); crack(d, t + u * L, a0 * r(0.1, 0.45) * (1 - u * 0.5), r(3500, 9000) * p, 1, r(0.0002, 0.0005)); }
  air(d, t, a0 * 0.35, 3000 * p, 9000 * p, 0.004, L * 0.4); crack(d, t + L, a0 * 0.3, r(1100, 1600) * p, 3, 0.0008);
  if (o.wet) air(d, t + L * 0.6, a0 * o.wet * 0.4, 500, 1800, 0.004, 0.03); }
// 響きの高さが時間とともにすべる雑音（f0→f1・共振 q）。32 点ごとに共振を作り直す
function sweep(d, t, amp, f0, f1, q, dur, atk) { const n = Math.round(dur * SR), x = new Float32Array(n); let x1 = 0, x2 = 0, y1 = 0, y2 = 0, k = null;
  for (let i = 0; i < n; i++) { if (i % 32 === 0) { const u = i / n; k = biq('bp', f0 * Math.pow(f1 / f0, u), q); }
    const e = i < atk * SR ? i / (atk * SR) : Math.pow(1 - (i - atk * SR) / Math.max(1, n - atk * SR), 1.6), v = (Math.random() * 2 - 1) * e, y = k[0] * v + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2; x2 = x1; x1 = v; y2 = y1; y1 = y; x[i] = y; }
  put(d, t, amp, x); }
// ぬちゅ：やわらかいクリーム（ソフトクリーム・パフェ・ケーキのクリーム）。スプーンが入る、なめらかな「スッ」（ゆっくり立ち上がる高めの息）→ 響きが下へすべる湿った「ぬちゅ」→ ごく小さな泡の粒
// 低い雑音を短く鳴らすと「叩いた」音になった（もふっ＝板か布団を叩いているようで、やわらかい物を食べている音に聞こえない 本人 2026-10-17）。低い所は鳴らさず、立ち上がりはゆっくり
function nuru(d, t, o = {}) { const a0 = o.amp || 1, p = o.p || 1;
  air(d, t, a0 * 0.45, 1800 * p, 6500 * p, 0.03, 0.045);
  sweep(d, t + 0.025, a0 * 0.8, r(1300, 1600) * p, r(420, 520) * p, 3.2, r(0.16, 0.2), 0.025);
  for (let i = 0; i < (o.bub ?? 4); i++) crack(d, t + r(0.06, 0.22), a0 * r(0.04, 0.09), r(2600, 4800) * p, r(6, 10), r(0.0004, 0.0008)); }
// ぺろっ（ケーキ・パフェ）：舌でクリームをなめる、湿った「ぺろ」を2回で「ぺろぺろ」。響きは上へすべり（ぬちゅの逆向き）、終わりに小さな「ちゅ」。2回目は少し高く
// 本人 2026-10-19「ケーキやパフェを食べる時は、なんかおいしそうな音立てて食べてほしいなあ、ぺろぺろするような」（かき氷は今のまま）
function pero(d, t, o = {}) { const a0 = o.amp || 1, p = o.p || 1;
  for (let k = 0; k < (o.n ?? 2); k++) { const t0 = t + k * r(0.12, 0.15), q = p * (1 + 0.12 * k);
    air(d, t0, a0 * 0.3, 1400 * q, 5200 * q, 0.012, 0.05);
    sweep(d, t0 + 0.005, a0 * 0.75, r(480, 560) * q, r(1500, 1800) * q, 2.6, r(0.08, 0.1), 0.014);
    crack(d, t0 + r(0.085, 0.1), a0 * 0.22, r(2300, 3000) * q, 6, 0.0007); } }
// 雪をふむ：踏みこみ（〜50ms・粒が多い）と、抜き（その少し後の30〜45ms・少なく小さい）の2つの粒の山。3〜8kHz の細かい粒だけ（低い音は削る）
function snowFill(d) { const L1 = r(0.035, 0.05), s2 = L1 + r(0.01, 0.02), L2 = r(0.03, 0.045);
  for (let i = 0; i < 36; i++) { const u = Math.random(); crack(d, 0.002 + u * L1, (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) * 0.8) * r(0.25, 1), r(3000, 8000), r(0.7, 1.5), r(0.00015, 0.0005)); }
  for (let i = 0; i < 4; i++) crack(d, L1 + r(0, s2 - L1), r(0.05, 0.15), r(3500, 8000), 1, 0.0002);
  for (let i = 0; i < 14; i++) { const u = Math.random(); crack(d, s2 + u * L2, (1 - 0.6 * u) * r(0.1, 0.4), r(3500, 8500), 1, r(0.00015, 0.0004)); } }
// ポキッ（街灯が折れる）：前の版のまま（澄んだ割れの「カッ」2つと、細かい破片）
function snapFill(d) { const click = (at, amp, f, tau) => { const i0 = Math.round(at * SR), n = Math.round(tau * 8 * SR); for (let i = 0; i < n && i0 + i < d.length; i++) { const t = i / SR; d[i0 + i] += amp * Math.exp(-t / tau) * (0.55 * (Math.random() * 2 - 1) + 0.45 * Math.sin(6.2832 * f * t)); } };
  const body = (at, amp, f, tau) => { const i0 = Math.round(at * SR), n = Math.round(tau * 6 * SR); for (let i = 0; i < n && i0 + i < d.length; i++) { const t = i / SR; d[i0 + i] += amp * Math.exp(-t / tau) * Math.sin(6.2832 * f * t); } };
  for (const [at, a] of [[0.005, 1], [0.11 + Math.random() * 0.05, 0.8]]) { click(at, a, 1800 + Math.random() * 900, 0.004); click(at + 0.001, a * 0.8, 3800 + Math.random() * 1200, 0.002); body(at, a * 0.5, 900 + Math.random() * 300, 0.02); for (let k = 0; k < 6; k++) click(at + 0.01 + Math.random() * 0.06, a * 0.3, 3000 + Math.random() * 3000, 0.001); } }
// 世界の飴（飴工房）：_1＝最初の一口（大きく割れる）、_2＝あとの、かみしめる音
const CANDY_RCP = {
  c_cane: [(d) => { crack(d, 0.003, 1, r(1900, 2500), 5, 0.001); pari(d, 0.004, { p: 0.8, amp: 0.6 }); thud(d, 0.003, 0.3, 240, 0.01); kari(d, 0.07, 0.38, { p: 1.1 }); },   // ポキッ→カリカリ
    (d) => kari(d, 0.004, 0.28, { p: 1.1 })],
  c_knack: [(d) => { gari(d, 0.003, { p: 0.7, amp: 0.8 }); pori(d, 0.12, 2, { p: 0.8, amp: 0.7 }); air(d, 0.33, 0.3, 250, 1200, 0.02, 0.03); },   // ガリッ（トフィーに吸われて、こもる）→ポリポリ→ねちっ
    (d) => { pori(d, 0.004, 2, { p: 0.75, amp: 0.8 }); air(d, 0.2, 0.3, 250, 1200, 0.02, 0.03); }],
  c_turron: [(d) => { saku(d, 0.003, { p: 1.05, L: 0.04, n: 20 }); kori(d, 0.06, 1, { p: 0.55, amp: 0.9 }); horo(d, 0.12, 0.38, { p: 0.8, amp: 0.4 }); },   // サクッ（ウエハース）→ゴリッ（アーモンド）→ほろほろ
    (d) => { kori(d, 0.004, 1, { p: 0.55, amp: 0.9 }); horo(d, 0.04, 0.28, { p: 0.8, amp: 0.45 }); }],
  c_tanghulu: [(d) => { pari(d, 0.003, { amp: 1, ring: 0.25 }); shk(d, 0.035, { p: 0.8, wet: 0.6, amp: 0.8 }); },   // パリッ（飴の殻）→しゃくっ（サンザシの実）
    (d) => { pari(d, 0.003, { amp: 0.35 }); shk(d, 0.01, { p: 0.75, wet: 0.8 }); }],
  c_konpeito: [(d) => { pari(d, 0.003, { p: 1.3, amp: 0.7 }); kari(d, 0.04, 0.3, { p: 1.35, sp: 0.6, amp: 0.7, bite: 0.08 }); },   // カリッ（小さく高い）→細かいカリカリ
    (d) => kari(d, 0.004, 0.24, { p: 1.4, sp: 0.55, bite: 0.06 })],
  c_berlingot: [(d) => { crack(d, 0.003, 0.8, r(2600, 3200), 6, 0.0008); pari(d, 0.004, { p: 1.1, ring: 0.35 }); kari(d, 0.06, 0.32, { p: 1.25 }); crack(d, 0.17, 0.2, r(3000, 4200), 40, 0.0003); },   // カリッ（澄んだ響き）→明るいカリカリ
    (d) => { kari(d, 0.004, 0.25, { p: 1.25 }); crack(d, 0.06, 0.2, r(3000, 4200), 40, 0.0003); }],
  c_akide: [(d) => { gari(d, 0.003, { p: 1.05 }); kari(d, 0.08, 0.36, { p: 1.0 }); },   // ガリッ→カリカリ
    (d) => { gari(d, 0.003, { p: 1.1, amp: 0.7 }); kari(d, 0.06, 0.22, { p: 1.05, amp: 0.7 }); }],
  c_alegria: [(d) => { saku(d, 0.003, { p: 0.95, L: 0.05, n: 30, amp: 0.8, bite: 0.08 }); horo(d, 0.08, 0.35, { amp: 0.35 }); },   // サクッ（軽い）→ほろほろ（はじけた粒）
    (d) => { saku(d, 0.003, { p: 0.95, L: 0.035, n: 18, amp: 0.7, bite: 0.06 }); horo(d, 0.06, 0.25, { amp: 0.4 }); }],
  c_kintaro: [(d) => { kori(d, 0.003, 1, { p: 0.8, amp: 1 }); thud(d, 0.003, 0.3, 260, 0.012); kori(d, 0.12, 3, { p: 0.8, amp: 0.8, gap: 0.085 }); },   // コリッ→コリコリ
    (d) => kori(d, 0.004, 3, { p: 0.8, gap: 0.08 })],
};
// 音の名前 → [何通り, 秒, 作り方 (d, 何通りめ), 低い方を削る所(Hz)]
const RCP = {
  snow: [6, 0.13, snowFill, 2200],
  snap: [3, 0.38, snapFill, 20],
  cookie: [4, 0.34, (d, v) => { saku(d, 0.004, { p: v % 2 ? 0.95 : 0.78, L: r(0.06, 0.085), n: 34, bite: 0.3 }); horo(d, 0.1, r(0.22, 0.3), { amp: 0.25, p: 0.9 }); }, 100],   // ザクッ・サクッ（家の壁）
  gb: [4, 0.24, (d, v) => { if (v === 3) pori(d, 0.004, 1, { amp: 0.9 }); else saku(d, 0.004, { p: v === 1 ? 1.15 : 1.05, L: v === 1 ? 0.035 : 0.045, n: 24, bite: 0.2 }); if (v % 2) horo(d, 0.08, 0.2, { amp: 0.25 }); }, 120],   // サクッ・ポリッ（住人）
  wafer: [3, 0.2, (d) => { saku(d, 0.004, { p: 1.1, L: 0.035, n: 20, bite: 0.08 }); saku(d, r(0.07, 0.09), { p: 1.2, L: 0.03, n: 16, amp: 0.7, bite: 0.05 }); }, 150],   // サクサクッ
  choco: [3, 0.2, (d) => { crack(d, 0.003, 1, r(1800, 2600), 9, 0.0006); pari(d, 0.004, { p: 0.6, amp: 0.6 }); thud(d, 0.003, 0.12, 260, 0.006); horo(d, 0.05, 0.12, { amp: 0.15, p: 1.2 }); }, 120],   // パキッ
  candy: [3, 0.28, (d) => { gari(d, 0.003, { p: 1.15, amp: 0.9 }); kari(d, 0.07, 0.2, { p: 1.1, amp: 0.5 }); }, 150],   // ガリッ・カリ（飴の窓・ミント・しま・砂糖の真珠）
  frost: [3, 0.12, (d) => { saku(d, 0.004, { p: 1.35, L: 0.04, n: 30, amp: 0.8, bite: 0.05 }); air(d, 0.004, 0.25, 4000, 10000, 0.002, 0.02); }, 300],   // シャリッ（砂糖のアイシング）
  gum: [3, 0.18, (d) => { air(d, 0.003, 1, 180, 900, 0.015, 0.05); crack(d, 0.05, 0.25, r(450, 700), 6, 0.003); }, 80],   // むにっ（ガムドロップ）
  ice: [4, 0.14, (d) => shk(d, 0.004), 300],   // しゃくっ（かき氷）
  soft: [4, 0.3, (d) => nuru(d, 0.004, { p: 1.08 }), 250],   // ぬちゅ（ソフトクリーム）
  parfait: [4, 0.36, (d) => pero(d, 0.004), 250],   // ぺろぺろ（パフェ）
  sponge: [4, 0.36, (d) => pero(d, 0.004, { p: 0.95 }), 250],   // ぺろぺろ（ショートケーキ・タワー）
  buche: [3, 0.36, (d) => pero(d, 0.004, { p: 0.88 }), 200],   // ぺろぺろ（ブッシュ・ド・ノエル。少し低く）
  shatter: [3, 0.62, (d) => { gari(d, 0.003, { p: 1.2 }); pari(d, 0.006, { p: 0.9, amp: 0.6, ring: 0.2 }); kari(d, 0.06, 0.55, { p: 1.15, amp: 0.7, sp: 0.75, bite: 0.1 }); }, 150],   // バキッ→カリカリカリ
  lampKari: [6, 0.16, (d, v) => { if (v % 2) kori(d, 0.003, 2, { p: r(1.1, 1.4), gap: r(0.045, 0.065) }); else kari(d, 0.003, r(0.06, 0.11), { p: 1.15, sp: 0.8 }); }, 150],   // カリッ・コリッ（はまる）
  clack: [5, 0.07, (d) => { const f = r(2000, 3400); crack(d, 0.002, 1, f, r(14, 22), 0.0005); crack(d, 0.002, 0.4, f * r(2.2, 2.6), 15, 0.0004); crack(d, 0.0025, 0.3, r(4000, 6500), 2.5, 0.0003); }, 300],   // カツッ・コッ（かけらが当たる）
};
for (const [id, [a, b]] of Object.entries(CANDY_RCP)) { RCP[id + '_1'] = [3, 0.42, a, 120]; RCP[id + '_2'] = [3, 0.3, b, 120]; }
const bufs = new Map();
// name の波形を何通りか持ち、毎回どれか1つを選ぶ（すぐ前と同じものは避ける）。波形は、はじめて選ばれた時に1つずつ作る（全部を一度に作ると、最初の一口で画面が引っかかる）。終わり4msは、すっと消す
function buf(name) { const R = RCP[name]; let l = bufs.get(name); if (!l) { l = new Array(R[0]); l.last = -1; bufs.set(name, l); }
  let j = (Math.random() * l.length) | 0; if (j === l.last) j = (j + 1) % l.length; l.last = j;
  if (!l[j]) { SR = ac.sampleRate; const d = new Float32Array(Math.round(R[1] * SR)), fo = Math.round(0.004 * SR); R[2](d, j); filt(d, biq('hp', R[3], 0.7)); let m = 1e-9;
    for (let i = 0; i < d.length; i++) { if (i > d.length - fo) d[i] *= (d.length - i) / fo; m = Math.max(m, Math.abs(d[i])); }
    const b = ac.createBuffer(1, d.length, SR), c = b.getChannelData(0); for (let i = 0; i < d.length; i++) c[i] = d[i] / m; l[j] = b; }
  return l[j]; }
// 鳴らす：毎回、高さと強さを少し揺らす
function sweet(name, vol, rate = 1, delay = 0) { if (!live()) return; try { playBuf(buf(name), vol * r(0.85, 1.1), rate * r(0.95, 1.05), delay); } catch (e) { /* 音が出なくても遊べる */ } }
// ゼリー：ぼよ〜ん（大きいほど低い）。高さが少し揺れて下がる
function boing_(size = 1) { const f = 330 / Math.sqrt(Math.max(0.3, size)) * r(0.92, 1.08); tone(f * 1.5, f, 0.11, 0, 0.32); tone(f * 0.75, f * 0.55, 0.06, 0.02, 0.4, 'triangle'); }
// お菓子の家・住人をかじる：かじった所の材質で別の音（kind＝家の部品の材質の名前。'gb'＝ジンジャークッキーの住人。ないと、クッキーの壁）
const HOUSE_SND = { cookie: 'cookie', decal: 'cookie', gb: 'gb', wafer: 'wafer', choco: 'choco', glass: 'candy', mint: 'candy', stripe: 'candy', pearl: 'candy', frost: 'frost', icing: 'frost', gum: 'gum' };
const HOUSE_VOL = { cookie: 0.14, gb: 0.12, wafer: 0.12, choco: 0.13, candy: 0.14, frost: 0.1, gum: 0.07 };
export function crunch(kind) { const k = HOUSE_SND[kind] || 'cookie'; sweet(k, HOUSE_VOL[k]); }
// 豆知識：ちりん（五音の音階から2音）
const PENTA = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093];
function chime_(k = 0) { const a = PENTA[k % PENTA.length], b = PENTA[(k + 2) % PENTA.length] * (k % 2 ? 1 : 2); tone(a, a, 0.05, 0, 1.0); tone(a * 2.76, a * 2.76, 0.012, 0, 0.4); tone(b, b, 0.04, 0.12, 1.1); }
// 礼拝堂の鐘：ゴーン（基音と、ずれた倍音が長く残る）
// 教会の鐘：り～ん（高い鐘）……ご～ん（すこし低い鐘）。鐘の倍音（ハム・プライム・短三度・五度・ノミナル・その上）を、ほんの少しずらした2本ずつ重ねて、うなる長い余韻。広い夜空に響く残響（鐘だけ）
let hall = null, hallIR = null;   // 残響の素（3.4秒・左右）は1度だけ作り、書き出し用の音の部屋でも使い回す
function hallSend() { if (hall) return hall; if (!hallIR) { const n = Math.floor(ac.sampleRate * 3.4), b = ac.createBuffer(2, n, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.4); } hallIR = b; }
  const cv = ac.createConvolver(), g = ac.createGain(); cv.buffer = hallIR; g.gain.value = 0.28; cv.connect(g); g.connect(out); hall = cv; return hall; }
function bellStrike(f, delay, vol, dur) { const t = ac.currentTime + delay, rv = hallSend();
  for (const [m, a, dk] of [[0.5, 0.25, 0.8], [1, 0.8, 0.85], [1.19, 0.5, 0.6], [1.5, 0.28, 0.5], [2, 1.0, 0.55], [2.51, 0.22, 0.35], [3.01, 0.3, 0.28], [4.07, 0.14, 0.18], [5.2, 0.06, 0.12]]) for (const det of [1, 1.0023]) {
    if (!live()) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m * det; const v = vol * a * 0.5, d = dur * dk;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(v * 0.35, t + d * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(out); g.connect(rv); track(o); o.start(t); o.stop(t + d + 0.05); }
  hiss(vol * 0.25, delay, 0.05, 'bandpass', f * 6, 1.5); }   // 打った瞬間の「カン」
// り～ん（ド）…ご～ん（その下のソ）。低すぎると重く沈むので、ソの高さで
function bell_() { try { bellStrike(523.3, 0, 0.05, 4.5); bellStrike(392, 0.85, 0.055, 6); } catch (e) { /* 音が出なくても遊べる */ } }
// 寄る時：ふわっ
function whoosh_() { hiss(0.04, 0, 0.45, 'bandpass', 900, 0.7); tone(520, 880, 0.02, 0.05, 0.35); }
// 天へ昇る：ハープのような上りのアルペジオと、うすい合唱の和音
function ascend_() { [523.3, 659.3, 784, 1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.045, i * 0.13, 1.5)); for (const f of [261.6, 329.6, 392]) { tone(f, f * 1.003, 0.022, 0.15, 3.4); tone(f * 2, f * 2.004, 0.01, 0.3, 3.1); } }
// 空から落ちてくる：すべり笛（高い音から、ひゅ～と下へ）
function fall_() { tone(1600, 240, 0.045, 0, 1.6); tone(1610, 245, 0.02, 0.02, 1.6, 'triangle'); }
// 雪を踏む：サクッ（1歩 0.1秒ほど。踏みこみと抜きの2つの粒の山）。短い「シャッ」を数個ならべると「てってって」と打つ音に、0.26秒の長い粒の帯は重く聞こえた
export function snowStep(k = 1) { sweet('snow', 0.2 * k, r(0.94, 1.06)); }
function tap_() { tone(1400, 1100, 0.025, 0, 0.06); }
// 海の光の波：ざわざわ〜っと駆け上がる、きらめきの音の列
function wave_() { const S = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637]; for (let i = 0; i < 14; i++) { const f = S[i % S.length] * (i >= 8 ? 2 : 1); tone(f, f, 0.03, i * 0.07, 0.9); } hiss(0.03, 0, 1.2, 'highpass', 6000, 0.6); }
// 花火：ぽん（打ち上げ）と、ぱらぱら
// なぞった海の、小さな光の波：やさしい1音
function ripple_(k) { const S = [1046.5, 1318.5, 1568, 2093, 2637], f = S[k]; tone(f, f, 0.014, 0, 0.6); tone(f * 1.5, f * 1.5, 0.007, 0.06, 0.45); }
// 盛大な花火：低いドン（遠くの山にこだま）と、パチパチ
function boom_(big = 1) { tone(110, 45, 0.12 * big, 0, 0.7, 'triangle'); tone(70, 40, 0.05 * big, 0.25, 0.6, 'triangle'); hiss(0.05 * big, 0, 0.6, 'lowpass', 600); for (let i = 0; i < 7; i++) hiss(r(0.012, 0.025), 0.2 + i * r(0.05, 0.12), r(0.02, 0.05), 'bandpass', r(2500, 6500), 1.2); }
// そりの鈴（サンタ）
// 鈴：シャラ・ラ・ラン（小さな鈴を軽く振る）。高く澄んだ音に、鈴らしいずれた倍音をのせ、間をつめながら数回、最後に長く響く
function suzu_() { const base = r(2600, 3000); for (let i = 0; i < 7; i++) { const tt = i * (0.07 - i * 0.004) + (i > 4 ? 0.12 : 0), f = base * (i % 2 ? 1.12 : 1) * r(0.98, 1.02), v = 0.022 * (i === 6 ? 1.6 : 1); tone(f, f, v, tt, i === 6 ? 1.4 : 0.5); tone(f * 2.76, f * 2.76, v * 0.35, tt, 0.35); tone(f * 5.4, f * 5.4, v * 0.15, tt, 0.2); } }
// ガラス玉どうしが触れる「ちりん・ころん」（薄いガラスの高い音に、ずれた倍音。すぐ消える）
function glassTink_() { for (let i = 0; i < 4; i++) { const f = r(2200, 3400), tt = i * r(0.06, 0.13); tone(f, f, 0.03, tt, 0.45); tone(f * 2.32, f * 2.32, 0.012, tt, 0.25); tone(f * 4.25, f * 4.25, 0.006, tt, 0.15); } }
// ろうそくが灯る「ぽっ」（マッチの小さなこすれと、やわらかな音。灯すたびに音階を上る）
function candle_(k = 0) { hiss(0.03, 0, 0.12, 'bandpass', 2600, 1.2); const f = PENTA[k % PENTA.length] / 2; tone(f, f, 0.035, 0.05, 0.9); }
// 吹き消す「ふーっ」
function blow_() { hiss(0.06, 0, 0.7, 'bandpass', 900, 0.6); hiss(0.03, 0.05, 0.5, 'lowpass', 600); }
// キャンディの街灯の音（波形は上の「かじる・砕ける・踏む音の素」で作る）
function playBuf(buf, vol, rate = 1, delay = 0) { if (!live()) return; try { const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = buf; s.playbackRate.value = rate; g.gain.value = vol; s.connect(g); g.connect(out); track(s); s.start(ac.currentTime + delay); } catch (e) { /* 音が出なくても遊べる */ } }
// ポキッ、ポキッ（折れる）
export function candySnap() { sweet('snap', 0.34); }
// バキッ→カリカリカリ（細かく砕けて散る）
export function candyShatter() { sweet('shatter', 0.3); }
// カリッ・コリッ（戻ってはまる・灯台をかじる）。1回は短く（前の版は0.7秒のかみ続ける音で、いくつも重なって、ざわざわに聞こえた）。vol＝大きさ
export function candyCrunch(vol = 0.3) { sweet('lampKari', vol); }
// カツッ・コッ（かけらが地面に当たる。高く短く）
export function candyClack(s = 1) { sweet('clack', 0.09 * s, r(0.9, 1.15)); }
// ぐにゃ～（温まった飴がのびる）
function candyBend_() { tone(330, 170, 0.05, 0, 1.0, 'sawtooth'); tone(240, 130, 0.04, 0.05, 1.0, 'triangle'); hiss(0.02, 0, 0.9, 'lowpass', 800); }
// ポンッ（栓が抜けるように飛ぶ）と、回る「ひゅるる」
function candyPop_() { tone(260, 110, 0.13, 0, 0.18); hiss(0.08, 0, 0.06, 'bandpass', 1200, 1.2); for (let i = 0; i < 7; i++) tone(900 + i * 140, 900 + i * 140, 0.012, 0.06 + i * 0.07, 0.08, 'triangle'); }
// ビヨヨン（ばねのように起きる）
function candySpring_() { for (let i = 0; i < 6; i++) { const f = 540 - i * 45; tone(f * 0.6, f, 0.055 * (1 - i * 0.14), i * 0.13, 0.16); } }
// 生えなおす：きらめきが昇りながら、カリカリと伸びる
function candyGrow_() { if (!live()) return; [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => tone(f, f, 0.025, i * 0.3, 0.5)); for (let i = 0; i < 4; i++) sweet('lampKari', 0.13, r(1.0, 1.25), i * 0.4); }
// 山をすくう：かき氷＝しゃくっ（細かい氷の粒と、小さな芯）／パフェ＝ぺろぺろ／ソフトクリーム＝ぬちゅ。kind＝山の種類（'k'・'p'・'s'。ないと、かき氷）
export function shaku(kind) { if (kind === 'p') sweet('parfait', 0.1); else if (kind === 's') sweet('soft', 0.09); else sweet('ice', 0.12); }
// 大きなスプーンが降りてくる「キラキラ…」（高い音から順に下りてくる）
function spoonDown_() { for (let i = 0; i < 10; i++) { const f = 3136 - i * 160; tone(f, f, 0.02, i * 0.12, 0.5); } hiss(0.05, 0, 1.4, 'bandpass', 1200, 0.5); }
// ひとすくい「ザクッ」（大きなかき氷の山を、ざっくり）
function bigScoop_() { for (let i = 0; i < 9; i++) hiss(r(0.08, 0.13), i * r(0.03, 0.05), r(0.06, 0.1), 'bandpass', r(2000, 5000), 1); hiss(0.1, 0, 0.5, 'lowpass', 700); tone(220, 110, 0.06, 0, 0.4, 'triangle'); }
// 天へ昇って消える「ひゅーん…キラン」
function spoonUp_() { tone(400, 1600, 0.04, 0, 1.6, 'triangle'); hiss(0.05, 0, 1.6, 'bandpass', 2000, 0.6); tone(2637, 2637, 0.05, 1.9, 1.2); tone(3951, 3951, 0.03, 1.95, 1.0); }
// 山が戻る：下から上へ、きらめきの音が昇っていく
function mtnRestore_() { [523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637].forEach((f, i) => { tone(f, f, 0.03, 0.3 + i * 0.45, 1.6); tone(f * 2, f * 2, 0.01, 0.3 + i * 0.45, 0.8); }); hiss(0.03, 0, 6.5, 'bandpass', 3000, 0.4); }
function jingle_() { for (let i = 0; i < 6; i++) { const f = r(3800, 6200); tone(f, f, 0.018, i * 0.09, 0.5); tone(f * 1.41, f * 1.41, 0.01, i * 0.09, 0.4); } }
// ケーキをすくう：ぺろぺろ（ブッシュ・ド・ノエルは少し低く）。kind＝山の種類（'c'・'b'。ないと、ショートケーキ）
export function cakeBite(kind) { if (kind === 'b') sweet('buche', 0.12); else sweet('sponge', 0.1); }
// 銀のスプーン（フォーク）：澄んだ鈴のきらめき／金：さらに高く、和音で輝く
function silverShine_() { [2093, 2637, 3136, 4186].forEach((f, i) => { tone(f, f, 0.03, 0.4 + i * 0.09, 1.1); tone(f * 2.76, f * 2.76, 0.006, 0.4 + i * 0.09, 0.4); }); }
function goldShine_() { [1046.5, 1318.5, 1568, 2093, 2637, 3136].forEach((f, i) => { tone(f, f, 0.035, 0.35 + i * 0.08, 1.6); tone(f * 1.5, f * 1.5, 0.012, 0.35 + i * 0.08, 1.0); }); for (let i = 0; i < 10; i++) { const f = r(4000, 7000); tone(f, f, 0.012, 0.9 + i * 0.07, 0.4); } }
// フォークが刺さる：ずぶっ（重く低い）と、ふわっとしたスポンジの音
function forkStab_() { tone(180, 70, 0.14, 0, 0.35, 'triangle'); hiss(0.12, 0, 0.35, 'lowpass', 700, 0.7); hiss(0.05, 0.05, 0.4, 'bandpass', 1800, 0.8); }
// ピックが家に刺さる：ぷすっ・ちーん
function pickStab_() { tone(220, 90, 0.11, 0, 0.22, 'triangle'); hiss(0.08, 0, 0.12, 'bandpass', 1500, 1.2); tone(2637, 2637, 0.04, 0.12, 0.9); tone(3951, 3951, 0.02, 0.15, 0.6); }
// 家がピックごと昇っていく：ひゅるるる（上がっていく音）
function pickUp_() { tone(300, 1400, 0.045, 0, 2.6, 'triangle'); hiss(0.04, 0, 2.4, 'bandpass', 1600, 0.6); }
// 空にぱくっと食べられる：ぱくっ・ザクザク（大きな口で、家のクッキーをかむ）
function skyBite_() { tone(520, 180, 0.09, 0, 0.12, 'triangle'); hiss(0.06, 0, 0.08, 'bandpass', 900, 1.0); for (let i = 0; i < 3; i++) sweet('cookie', 0.12 * (1 - i * 0.2), 0.8, 0.25 + i * 0.18); }
// 世界の飴をかじる（飴工房）：飴ごとに、かたさと形で別の音（キャンディケイン＝ポキッ→カリカリ・こんぺいとう＝細かいカリカリ・タンフールー＝パリッ→しゃくっ・金太郎飴＝コリコリ など）
//   first＝最初の一口（大きく割れる）、あとは、かみしめる音。id＝飴の種類（candies.js の id）。id がない時は、かたさで選ぶ（やわらかい＝サクッ・いちばん硬い＝ガリッ・ほか＝カリカリ。pitch で高さ）
export function eatCandy(hard = 0.8, pitch = 1, first = true, id) { const known = CANDY_RCP[id], k = known ? id : hard < 0.5 ? 'c_alegria' : hard >= 0.95 ? 'c_akide' : 'c_cane';
  sweet(k + (first ? '_1' : '_2'), (first ? 0.3 : 0.22) * (0.75 + hard * 0.3), known ? 1 : Math.min(1.3, Math.max(0.75, pitch))); }
// 落ちている飴をはじく：コツン・ころころ
export function candyFlick() { if (!live()) return; playBuf(buf('snap'), 0.16, r(1.5, 2.0)); for (let i = 0; i < 3; i++) playBuf(buf('snap'), 0.05 * (1 - i * 0.25), r(1.8, 2.3), 0.15 + i * 0.12); }
// 開店・ケーキの山が見つかる：ファンファーレ（ベルとチェレスタ）
function fanfare_() { [[523.3, 0], [659.3, 0.14], [784, 0.28], [1046.5, 0.42], [784, 0.7], [1046.5, 0.84], [1318.5, 1.0]].forEach(([f, t]) => { tone(f, f, 0.05, t, 0.9); tone(f * 2, f * 2, 0.015, t, 0.5); tone(f * 3.01, f * 3.01, 0.006, t, 0.3); }); }
export function fanfare() { play('fanfare'); setTimeout(() => { try { suzu(); } catch (e) { /* 音が出なくても遊べる */ } }, 1200); }
// 音をまとめて止める・戻す（見えていない画面・ほかの画面が鳴りはじめた時）
export function pause(on) { if (!ac) return; try { if (on) ac.suspend(); else ac.resume(); } catch (e) { /* 音が出なくても遊べる */ } }
export const state = () => (ac ? ac.state : 'none');   // 検査用：音の状態（鳴らしはしない）

// ---------- 書き出した波形で鳴らす ----------
// FX＝音の名前ごとに { n＝何通り持つか（毎回の揺らぎ）, make＝合成の本体, ch＝左右の数（鐘だけ、広い残響が左右で2） }。
// はじめての音は、その場で合成して鳴らし、裏で1通り書き出す。次からは書き出した1つを流す（何通りかそろうまで、鳴らすたびに1通りずつ足す）
const FX = {};
const def = (key, n, make, ch = 1, sec = 2.5) => (FX[key] = { n, make, ch, sec, L: [], last: -1, busy: false, fail: false });   // sec＝書き出す長さの見込み（足りなければ、倍にして書き出しなおす）
function play(key) {
  const e = FX[key]; if (!e || !live()) return;
  if (e.L.length) { let j = (Math.random() * e.L.length) | 0; if (j === e.last) j = (j + 1) % e.L.length; e.last = j; playBuf(e.L[j], 1); }
  else { try { e.make(); } catch (err) { /* 音が出なくても遊べる */ } }
  grow(e); }
function grow(e) { if (e.busy || e.fail || e.L.length >= e.n || !ac || typeof OfflineAudioContext === 'undefined') return; e.busy = true;
  renderFx(e.make, e.ch, e.sec).then((b) => { e.L.push(b); }, () => { e.fail = true; }).then(() => { e.busy = false; }); }
// 書き出す：ac と out を、書き出し用の音の部屋へ差しかえて合成し、すぐ戻す（合成は同じ流れの中で終わるので、ほかの音と混ざらない）。終わりの無音は切る
function renderFx(make, ch, sec) {
  const sr = ac.sampleRate, c = new OfflineAudioContext(ch, Math.ceil(sr * sec), sr), keep = [ac, out, hall];
  ac = c; out = c.destination; hall = null; BAKING = true;
  try { make(); } catch (err) { return Promise.reject(err); } finally { BAKING = false; [ac, out, hall] = keep; }
  return c.startRendering().then((b) => { let end = 0;   // 終わりの無音は切る（後ろから32サンプルおきに探して、見つけた所から1つずつ）
    for (let k = 0; k < b.numberOfChannels; k++) { const d = b.getChannelData(k); let i = d.length - 1; while (i > end && Math.abs(d[i]) < 3e-5) i -= 32; i = Math.min(d.length - 1, i + 32); while (i > end && Math.abs(d[i]) < 3e-5) i--; end = Math.max(end, i); }
    if (end > b.length - sr * 0.02 && sec < 16) return renderFx(make, ch, sec * 2);   // 終わりまで鳴っていた＝見込みが短かった
    const n = Math.min(b.length, end + Math.round(sr * 0.01)), o = ac.createBuffer(b.numberOfChannels, n, sr); for (let k = 0; k < b.numberOfChannels; k++) o.copyToChannel(b.getChannelData(k).subarray(0, n), k); return o; }); }
// 海・花火・よく押す所の音は、音を出せるようになってすぐ、少しずつ書き出しておく（はじめて押した時も、組まずにすむように）
function prebake(keys) { let i = 0; const step = () => { if (!ac) return; while (i < keys.length && (!FX[keys[i]] || FX[keys[i]].fail || FX[keys[i]].L.length >= FX[keys[i]].n)) i++; if (i >= keys.length) return; grow(FX[keys[i]]); setTimeout(step, 200); }; step(); }
for (let k = 0; k < 6; k++) { def('chime' + k, 1, () => chime_(k)); def('candle' + k, 1, () => candle_(k)); }
for (let k = 0; k < 5; k++) def('ripple' + k, 1, () => ripple_(k));
def('wave', 2, wave_); def('boom1', 4, () => boom_(1)); def('boom1.2', 2, () => boom_(1.2)); def('bell', 1, bell_, 2, 10.5); def('tap', 1, tap_); def('suzu', 3, suzu_); def('glassTink', 3, glassTink_); def('whoosh', 2, whoosh_);
def('ascend', 1, ascend_, 1, 4); def('fall', 1, fall_); def('blow', 1, blow_); def('fanfare', 1, fanfare_);
def('candyBend', 1, candyBend_); def('candyPop', 2, candyPop_); def('candySpring', 1, candySpring_); def('candyGrow', 2, candyGrow_); def('spoonDown', 1, spoonDown_); def('bigScoop', 3, bigScoop_); def('spoonUp', 1, spoonUp_, 1, 3.5);
def('mtnRestore', 1, mtnRestore_, 1, 8); def('jingle', 3, jingle_); def('silverShine', 1, silverShine_); def('goldShine', 2, goldShine_); def('forkStab', 2, forkStab_); def('pickStab', 1, pickStab_); def('pickUp', 1, pickUp_, 1, 3); def('skyBite', 2, skyBite_);
const PRE = ['wave', 'ripple0', 'ripple1', 'ripple2', 'ripple3', 'ripple4', 'boom1', 'boom1', 'boom1', 'boom1', 'boom1.2', 'boom1.2', 'tap', 'chime0', 'chime1', 'chime2', 'chime3', 'chime4', 'chime5', 'suzu', 'whoosh', 'glassTink', 'wave'];
export const boing = (size = 1) => { const s = Math.max(0.3, size).toFixed(1), key = 'boing' + s; if (!FX[key]) def(key, 3, () => boing_(+s)); play(key); };
export const chime = (k = 0) => play('chime' + (((k % 6) + 6) % 6));
export const candle = (k = 0) => play('candle' + (((k % 6) + 6) % 6));
export const ripple = () => play('ripple' + ((Math.random() * 5) | 0));
export const boom = (big = 1) => { const key = 'boom' + big; if (!FX[key]) def(key, 2, () => boom_(big)); play(key); };   // 大きさごとに書き出す（パチパチは big で変わらない＝元の鳴り方のまま）
export const bell = () => play('bell'), whoosh = () => play('whoosh'), ascend = () => play('ascend'), fall = () => play('fall'), tap = () => play('tap'), wave = () => play('wave');
export const suzu = () => play('suzu'), glassTink = () => play('glassTink'), blow = () => play('blow'), candyBend = () => play('candyBend'), candyPop = () => play('candyPop'), candySpring = () => play('candySpring');
export const candyGrow = () => play('candyGrow'), spoonDown = () => play('spoonDown'), bigScoop = () => play('bigScoop'), spoonUp = () => play('spoonUp'), mtnRestore = () => play('mtnRestore'), jingle = () => play('jingle');
export const silverShine = () => play('silverShine'), goldShine = () => play('goldShine'), forkStab = () => play('forkStab'), pickStab = () => play('pickStab'), pickUp = () => play('pickUp'), skyBite = () => play('skyBite');
