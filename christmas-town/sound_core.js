// 効果音の土台（港町・仕掛けの部屋・カードで共通 2026-10-26）。前は音の部品6つとカードに、同じ写しがそれぞれあり、直した所が片方にしか入っていなかった
// ・音の部屋（AudioContext）と出口：大きさ → 音割れを抑える部品（limiter。部屋ごとに渡す。無い部屋は無いまま）→ スピーカー
// ・港町のメニューの「音」（localStorage 'xmas-town-sound' の se＝効果音のオン・オフ、seVol＝大きさ）を読む。町で効果音をオフにしたら、部屋とカードでも鳴らさない（本人 2026-10-26）
// ・同時に鳴っている音の部品を数え、上限（cap。部屋ごと）をこえる時は新しい音を省く（ステンドグラスの鈴で7,386個まで増え、途中から音が出なくなった 2026-10-16）
// ・スマホは、押し下げた時には音を出させず、離した時に許す端末がある。離した時（pointerup・touchend・click）にも音の時計を動かす（港町 2026-10-18 と同じ）
export const SOUND_KEY = 'xmas-town-sound';
export const r = (a, b) => a + Math.random() * (b - a);
export function readPref() {
  try { const p = JSON.parse(localStorage.getItem(SOUND_KEY) || '{}') || {}, v = Number(p.seVol); return { se: p.se !== false, seVol: p.seVol == null || !Number.isFinite(v) ? 1 : v / 100 }; }
  catch (e) { return { se: true, seVol: 1 }; }   // 覚えられない画面では、鳴らす・100%
}

// gain＝出口の大きさ（効果音100%の時）／limiter＝{ threshold, knee, ratio, attack, release } のうち変える物／cap＝同時に鳴る部品の上限（数か、数を返す関数）
// maxF＝これより高い音は鳴らさない（聞こえる範囲の外。警告が出た）／meter＝検査用に、ならす前と後の振れ幅を見る
export function makeSound({ gain = 0.9, limiter = null, cap = Infinity, maxF = 16000, meter = false } = {}) {
  const P = readPref(); let ac = null, out = null, noise = null, act = 0, muted = !P.se, vol = P.seVol, mPre = null, mPost = null;
  const capNow = typeof cap === 'function' ? cap : () => cap, outGain = () => (muted ? 0 : gain * vol);
  const running = () => !!ac && ac.state === 'running', room = () => act < capNow();
  const track = (n) => { act++; n.onended = () => { act--; }; };
  const peakOf = (a) => { if (!a) return 0; const d = new Float32Array(a.fftSize); a.getFloatTimeDomainData(d); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); return m; };
  function audio() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)(); out = ac.createGain(); out.gain.value = outGain(); let end = out;
      if (limiter) { const L = ac.createDynamicsCompressor(); for (const k of Object.keys(limiter)) L[k].value = limiter[k]; out.connect(L); end = L; }
      end.connect(ac.destination);
      if (meter) { mPre = ac.createAnalyser(); mPre.fftSize = 2048; out.connect(mPre); mPost = ac.createAnalyser(); mPost.fftSize = 2048; end.connect(mPost); }
    }
    if (ac.state !== 'running') ac.resume();
    return ac;
  }
  const kick = () => { if (ac && ac.state !== 'running') { try { ac.resume(); } catch (e) { /* 音が出なくても遊べる */ } } };
  for (const ev of ['pointerup', 'touchend', 'click']) addEventListener(ev, kick, { capture: true, passive: true });
  const S = {
    audio, running, room, track, live: () => running() && room(), voices: () => act,
    get ac() { return ac; }, get out() { return out; },
    level: () => [peakOf(mPre), peakOf(mPost)],
    setMute(m) { muted = !!m; if (out) out.gain.value = outGain(); },
    setVolume(v) { vol = Math.max(0, Math.min(1.5, v)); if (out) out.gain.value = outGain(); },
    // 雑音（1秒ぶん）は、はじめて使う時に1度だけ作る
    noise() { if (!noise) { noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return noise; },
    // 澄んだ1音（時刻 t に鳴りはじめ、atk で立ち上がり、dur で消える）。美術館と氷の彫像で同じ写しだった（片方だけ、上限と低すぎる音の省きが入っていた）
    partial(f, v, t, dur, atk = 0.002, type = 'sine') {
      if (f > maxF || f < 20 || !room()) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02); track(o);
    },
    // 短い雑音（「シャ」「ザッ」）を、ひとつの帯へ通す（同上）
    hissAt(v, t, dur, type, freq, q = 0.8) {
      if (!room()) return; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = S.noise(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); track(s);
    },
  };
  return S;
}
