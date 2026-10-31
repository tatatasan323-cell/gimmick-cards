// グリーティングカードの絵：セロハン（ゴスペル「グローリー・グローリー！」）。共通/greet_cards.js の mountGreet が使う
// build() が返す物＝{ S（step・total・done）, draw(x, t), busy(t), tap(t, sfx), ambient?(t, sfx), ready?（MV の部品を読み終えたら解ける Promise）, snow? }
// 後ろから灯りを当てた影絵の人形劇。人形は MV の聖歌隊そのもの（共通/mv/kage_doll.js・kage_cello.js）。色のセロハンが重なると、色がかけ合わさる
// さわるたびに1幕ずつ進む（本人 2026-11-01「人形劇のようなしぐさで、クリックするたびに物語が進む」「サンタがそりに乗って飛んでほしい」）：
//   ① 指揮者がぴょこぴょこ歩いて出てきて、おじぎ ② 聖歌隊が舞台のふちの後ろから1人ずつ顔を出す ③ 指揮に合わせて歌う（音符が昇る）
//   ④ サンタのそりが空を駆けて、みんなが見上げて指さす ⑤ ツリーの星が灯り、MV のジンジャーブレッドたちも顔を出して、みんなで両手を上げる
// 人形劇らしく、絵は1秒15コマのコマ送り（MV の切り絵と同じ）。灯りのまん中は白寄りに広く、四隅だけ琥珀（琥珀一色だと青・緑・紫のセロハンが濁る）
import { W, H, TAU, clamp, ease, easeInOut, spring, layer, loadMV } from './greet_kit.js';

const LEDGE = 264, TREE = 324;   // 舞台のふち（人形はこの後ろから出る）／ツリーのまん中

export function build() {
  // ---------- 灯りの紙と、背景のセロハン（町・月・星・ツリー・ケーキ）。重ねた色はかけ合わせ（乗算） ----------
  const film = (g, path, col, n = 1) => { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = col; for (let i = 0; i < n; i++) g.fill(path); g.restore(); };
  const P2 = (f) => { const p = new Path2D(); f(p); return p; };
  const ellP = (cx, cy, rx, ry, a = 0) => P2((p) => p.ellipse(cx, cy, rx, ry, a, 0, TAU));
  const polyP = (pts) => P2((p) => { pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b))); p.closePath(); });
  const starP = (cx, cy, R, r) => P2((p) => { for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; i ? p.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q) : p.moveTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } p.closePath(); });
  const ORN = [[TREE - 8, 186, '#ff5a7a'], [TREE + 12, 200, '#5ac8ff'], [TREE - 16, 222, '#ffd23a'], [TREE + 4, 216, '#c88aff'], [TREE + 20, 240, '#ff5a7a'], [TREE - 22, 246, '#5ac8ff'], [TREE + 2, 172, '#ffd23a']];
  const bg = layer((x) => {
    const g = x.createRadialGradient(W / 2, 170, 10, W / 2, 170, 290); g.addColorStop(0, '#fffcf2'); g.addColorStop(0.55, '#ffeec4'); g.addColorStop(0.85, '#f0b860'); g.addColorStop(1, '#b06a1c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    film(x, P2((p) => { p.arc(64, 62, 17, 0, TAU); }), '#fff07a'); film(x, P2((p) => { p.arc(72, 56, 15, 0, TAU); }), '#ffe2a8');   // 月（2枚重ねた所が濃い三日月）
    for (const [a, b, r] of [[30, 34, 4], [118, 26, 3], [150, 58, 2.6], [212, 30, 3.4], [258, 52, 2.6], [300, 26, 3.6], [336, 70, 2.6], [98, 92, 2.4]]) film(x, starP(a, b, r * 1.6, r * 0.7), '#ffe066');
    // 奥の町（屋根と窓）。人形の後ろでも色が重なって透ける
    for (const [a, w, h, c] of [[-6, 40, 46, '#b8d8ff'], [30, 34, 62, '#d8c0ff'], [60, 44, 40, '#b8f0d0'], [100, 30, 70, '#ffc8b0'], [126, 46, 48, '#b8d8ff'], [168, 36, 58, '#ffd8a0'], [200, 42, 44, '#d8c0ff'], [238, 36, 64, '#b8f0d0'], [270, 40, 50, '#ffc8b0']]) {
      const y0 = LEDGE - h; film(x, polyP([[a, LEDGE], [a, y0], [a + w / 2, y0 - 16], [a + w, y0], [a + w, LEDGE]]), c);
      for (let k = 0; k < 2; k++) film(x, P2((p) => p.rect(a + 8 + k * (w - 24), y0 + 12, 8, 10)), '#ffe066', 2); }
    film(x, polyP([[112, LEDGE - 70], [115, LEDGE - 104], [118, LEDGE - 70]]), '#ffc8b0'); film(x, P2((p) => p.rect(113.6, LEDGE - 116, 2.8, 10)), '#c8a060'); film(x, P2((p) => p.rect(110.5, LEDGE - 112, 9, 2.6)), '#c8a060');   // 教会の塔と十字
    // ツリー（3段の緑のセロハン・幹）と玉
    film(x, P2((p) => p.rect(TREE - 5, LEDGE - 16, 10, 16)), '#c8945a');
    for (const [y0, y1, hw, c] of [[150, 196, 24, '#7ae09a'], [174, 228, 34, '#5ad088'], [204, LEDGE - 14, 44, '#48c078']]) film(x, polyP([[TREE, y0], [TREE + hw, y1], [TREE - hw, y1]]), c);
    for (const [a, b, c] of ORN) film(x, ellP(a, b, 5, 5), c);
    // ケーキ（台に載ったいちごのケーキ）。白いクリームは、膜を切りぬいた窓＝紙の光がそのまま抜ける
    film(x, P2((p) => p.rect(28, LEDGE - 26, 6, 26)), '#c8945a'); film(x, ellP(31, LEDGE - 27, 22, 4), '#c8945a');
    film(x, P2((p) => p.roundRect(14, LEDGE - 50, 34, 22, 4)), '#ffd8e0'); film(x, P2((p) => p.roundRect(20, LEDGE - 64, 22, 15, 4)), '#ffe8ee');
    for (const a of [-7, 0, 7]) film(x, ellP(31 + a, LEDGE - 66, 3, 3), '#ff4a6a', 2); film(x, P2((p) => p.rect(30, LEDGE - 78, 2.4, 11)), '#ff9ac0'); film(x, ellP(31.2, LEDGE - 81, 2, 3.4), '#ffd23a');
    for (let a = 14; a < 48; a += 6) film(x, ellP(a + 3, LEDGE - 50, 3, 2.6), '#ff9ac0');
  });
  // 手前：舞台のふち（板）と、上の幕（赤いセロハンの垂れ幕と金のふさ）。人形はふちの後ろから出る
  const front = layer((x) => {
    film(x, P2((p) => p.rect(0, LEDGE, W, H - LEDGE)), '#b07840'); film(x, P2((p) => p.rect(0, LEDGE, W, 4)), '#c8945a');
    for (let k = 0; k < 6; k++) { const a = (k * W) / 6; film(x, P2((p) => { p.moveTo(a - 2, 0); p.lineTo(a + W / 6 + 2, 0); p.lineTo(a + W / 6 + 2, 12); p.quadraticCurveTo(a + W / 12, 34, a - 2, 12); p.closePath(); }), '#ff5a6a'); film(x, P2((p) => { p.moveTo(a, 13); p.quadraticCurveTo(a + W / 12, 35, a + W / 6, 13); p.lineTo(a + W / 6, 16); p.quadraticCurveTo(a + W / 12, 38, a, 16); p.closePath(); }), '#ffd23a'); }
    for (const s of [0, 1]) film(x, P2((p) => { const a = s ? W : 0, d = s ? -1 : 1; p.moveTo(a, 0); p.lineTo(a + d * 22, 0); p.quadraticCurveTo(a + d * 12, 120, a + d * 18, LEDGE); p.lineTo(a, LEDGE); p.closePath(); }), '#ff5a6a');
  });

  // ---------- 物語の時刻 ----------
  const S = { step: 0, total: 5, done: false, t: [], notes: [], hop: -9, sl: null, taps: 0 };
  const since = (k, t) => (S.t[k] == null ? -1 : t - S.t[k]);
  const D_ = [2.6, 2.4, 3.0, 3.4, 2.8], SL_D = 3.2;

  // ---------- 人形（MV の聖歌隊・ジンジャーブレッドの仲間・いたずらのサンタ） ----------
  let KD = null, KC = null, KS = null;
  const ready = loadMV(['kage_rig.js', 'kage_doll.js', 'kage_cello.js', 'kage_santa.js'], { 'kage_doll.js': 'KD', 'kage_cello.js': 'KC', 'kage_santa.js': 'KS' }, { cello: true }).then((L) => { KD = L.KD; KC = L.KC; KS = L.KS; });
  const CAST = [{ id: 'conductor', x: 86 }, { id: 'twinA', x: 146 }, { id: 'smallkid', x: 182 }, { id: 'girl', x: 218 }, { id: 'nun', x: 262 }], SC = 0.7;
  const MINI = [{ kind: 'ginger', x: 118 }, { kind: 'crown', x: 298 }, { kind: 'teddy', x: 30 }];
  // 腕は「手の位置」（肩から外へ x・下へ y）。式は MV の kage_moves.js の restA・upA・clapA と同じ
  const Lr = (J) => J.ua + J.fa, restA = (J, out = 0.42) => ({ x: Lr(J) * out, y: Lr(J) * 0.62 }), outX = (J) => Math.max(0, J.R * 1.05 + J.handR - J.topW);
  const upA = (J, spread = 1, wave = 0) => ({ x: Math.max(Lr(J) * 0.42 * spread, outX(J) + Lr(J) * 0.1 * spread), y: -Lr(J) * 0.86, wave });
  const clapA = (J, open) => ({ x: -J.topW * 0.86 + open * Lr(J) * 0.32 + 2, y: Lr(J) * 0.32, front: true });
  const mixA = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, wave: (a.wave || 0) + ((b.wave || 0) - (a.wave || 0)) * u, front: u > 0.5 ? b.front : a.front });
  function doll(i, t) {
    const c = CAST[i], D = KD.DOLLS[c.id], J = D.J, p = { armL: restA(J), armR: restA(J), yaw: 0, lean: 0, tilt: 0, hy: 0, mouth: 0 };
    let x = c.x, rise = 0;
    const a = since(0, t), b = since(1, t), s = since(2, t), q = since(3, t), f = since(4, t), lastHop = S.done ? t - S.hop : 9;
    if (i === 0) {   // 指揮者：ぴょこぴょこ歩いて出る → 正面を向いて、おじぎ → 手を上げる
      if (a < 0) return null;
      const w = clamp(a / 1.3, 0, 1); x = -40 + (c.x + 40) * easeInOut(w);
      if (w < 1) { const ph = a * 6.5; p.hy = -7 * Math.abs(Math.sin(ph)); p.lean = 0.12 * Math.sin(ph); p.yaw = 0.62; p.armL = restA(J, 0.3 + 0.2 * Math.sin(ph)); p.armR = restA(J, 0.3 - 0.2 * Math.sin(ph)); }
      else { const bow = Math.sin(Math.PI * clamp((a - 1.4) / 0.7, 0, 1)); p.tilt = 0.35 * bow; p.lean = 0.1 * bow; p.hy = 4 * bow; const up = ease((a - 2.1) / 0.35); p.armR = mixA(restA(J), upA(J, 1, 0.3), up); }
      if (b >= 0 && s < 0) { p.yaw = 0.62 * ease(b / 0.4); p.armR = mixA(upA(J, 1, 0.3), upA(J, 1, 0.6 * Math.sin(b * 8)), clamp(b / 0.3, 0, 1)); }   // 聖歌隊のほうを向いて、手招き
      if (s >= 0) { const beat = s * 2.2; p.yaw = 0.62; p.armR = upA(J, 1, 0.5 * Math.sin(beat * Math.PI)); p.armL = mixA(restA(J), upA(J, 0.9), 0.5 + 0.5 * Math.sin(beat * Math.PI)); p.lean = 0.05 * Math.sin(beat * Math.PI); }   // 指揮
      if (q >= 0) { const up = ease(q / 0.4); p.yaw = 0; p.armR = { x: Lr(J) * 0.3, y: -Lr(J) * 0.98 }; p.tilt = -0.18 * up; }   // 空を指さす
    } else {   // 聖歌隊：舞台のふちの後ろから、1人ずつ顔を出す
      if (b < 0) return null;
      const u = b - (i - 1) * 0.28; if (u < 0) return null;
      rise = 90 * (1 - spring(clamp(u / 0.7, 0, 1))); p.tilt = 0.12 * Math.sin(u * 5) * clamp(1 - u / 1.6, 0, 1);
      if (s >= 0) { const beat = s * 2.2 + i * 0.15, k = 0.5 + 0.5 * Math.cos(beat * TAU); p.mouth = 0.45 + 0.35 * Math.abs(Math.sin(beat * Math.PI)); p.lean = 0.06 * Math.sin(beat * Math.PI);
        if (c.id === 'nun') { p.armR = upA(J, 0.8); p.tam = 0.4 * Math.sin(beat * TAU); p.jing = Math.sin(beat * TAU * 2); } else { p.armL = clapA(J, k); p.armR = clapA(J, k); } }
      if (q >= 0) { p.tilt = -0.2 * ease(q / 0.4); p.mouth = 0.3; if (i === 2) { p.armR = { x: Lr(J) * 0.3, y: -Lr(J) * 0.95 }; p.armL = restA(J); } }   // 見上げる（小さい子は指さす）
    }
    if (f >= 0) { const up = ease((f - 0.4 - i * 0.05) / 0.4); if (up > 0) { p.yaw = 0; p.tilt = 0; p.armL = mixA(p.armL, upA(J, 1, 0.4 * Math.sin(f * 7 + i)), up); p.armR = mixA(p.armR, upA(J, 1, 0.4 * Math.sin(f * 7 + i + 1)), up); p.mouth = 0.7 * up; p.shout = f > 0.8 && f < 1.6 ? 1 : 0; } }   // グローリー！
    if (lastHop < 0.6) { p.hy -= 10 * Math.sin(Math.PI * lastHop / 0.6); p.armL = clapA(J, 0.5 + 0.5 * Math.cos(lastHop * 18)); p.armR = clapA(J, 0.5 + 0.5 * Math.cos(lastHop * 18)); p.mouth = 0.6; }
    return { D, p, x, rise };
  }
  function minis(g, t) {
    const f = since(4, t); if (f < 0) return;
    MINI.forEach((m, i) => { const u = f - 0.2 - i * 0.18; if (u < 0) return; const rise = 80 * (1 - spring(clamp(u / 0.7, 0, 1))), lastHop = t - S.hop;
      g.save(); g.translate(m.x, LEDGE + rise); g.scale(0.48, 0.48); KC.mini(g, m.kind, { up: ease((u - 0.5) / 0.4), hop: lastHop < 0.6 ? Math.sin(Math.PI * lastHop / 0.6) : 0, lean: 0.06 * Math.sin(t * 4 + i) }); g.restore(); });
  }
  // サンタのそり（MV の「いたずらのサンタ」）：右から左へ、空を駆ける。走った後に星がきらきら流れる
  const slK = (t0) => [[t0, 440, 110], [t0 + 1.0, 300, 80], [t0 + 2.0, 170, 112], [t0 + 3.2, -110, 86]];
  function santa(g, t) { if (S.sl == null) return; const K = slK(S.sl), st = KS.santaAt(t, K); if (!st) return; KS.santaTrail(g, t, K, { sz: 0.27 }); g.save(); g.translate(st.X, st.Y); g.scale(0.27, 0.27); KS.drawSanta(g, t, st, { dir: -1, wave: true }); g.restore(); }
  // 音符（セロハンの♪）と、ツリーの星
  const note = (g, x0, y0, col, s) => { const q = new Path2D(); q.ellipse(x0, y0, 5 * s, 3.6 * s, -0.4, 0, TAU); q.rect(x0 + 3.4 * s, y0 - 18 * s, 1.8 * s, 18 * s); q.moveTo(x0 + 3.4 * s, y0 - 18 * s); q.quadraticCurveTo(x0 + 12 * s, y0 - 14 * s, x0 + 9 * s, y0 - 7 * s); q.quadraticCurveTo(x0 + 9 * s, y0 - 12 * s, x0 + 5.2 * s, y0 - 13 * s); q.closePath(); film(g, q, col, 2); };
  function starTop(g, t) {
    const f = since(4, t); if (f < 0) return; const u = ease(f / 0.6), sp = 0.5 + 0.5 * Math.sin(t * 3);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.22 * u * (0.8 + 0.2 * sp); g.fillStyle = '#fff2c0';
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.2; g.beginPath(); g.moveTo(TREE, 146); g.lineTo(TREE + Math.cos(a - 0.07) * 80, 146 + Math.sin(a - 0.07) * 80); g.lineTo(TREE + Math.cos(a + 0.07) * 80, 146 + Math.sin(a + 0.07) * 80); g.fill(); } g.restore();
    film(g, starP(TREE, 146, 13 * (0.6 + 0.4 * spring(f / 0.6)), 5.5), '#ffd23a', 2);
  }

  // 1秒15コマ：コマが変わった時だけ、紙ぜんぶを描き直して残す（セロハンは下の色とかけ合わせるので、人形だけを別の紙に描くことはできない）
  const FR = document.createElement('canvas'), fr = FR.getContext('2d'); let frKey = '';
  function scene(g, t) {
    g.drawImage(bg, 0, 0, W, H);
    if (KD) { santa(g, t); starTop(g, t);
      for (let i = CAST.length - 1; i >= 0; i--) { const d = doll(i, t); if (!d) continue; g.save(); g.translate(d.x, LEDGE + d.rise); g.scale(SC, SC); KC.draw(g, d.D, d.p); g.restore(); }
      minis(g, t);
      for (const n of S.notes) { const v = (t - n.t) / 1.8; if (v < 0 || v > 1) continue; g.save(); g.globalAlpha = Math.min(1, (1 - v) * 2.5); note(g, n.x + 8 * Math.sin(v * 6 + n.x), 190 - 110 * v, n.col, 0.9); g.restore(); } }
    g.drawImage(front, 0, 0, W, H);
  }
  const busyAt = (t) => S.t.some((t0, k) => t - t0 < D_[k]) || S.notes.some((n) => t - n.t < 1.85) || (S.sl != null && t - S.sl < SL_D) || (S.done && t - S.hop < 0.7);
  return { S, ready, snow: { n: 18, kind: 'cello', size: 5 },
    draw(x, t) {
      const dev = Math.abs(x.getTransform().a) || 1, live = busyAt(t), f = live ? Math.floor(t * 15) : 'still', key = f + '|' + dev + '|' + S.step + '|' + !!KD;
      if (frKey !== key) { const w = Math.round(W * dev), h = Math.round(H * dev); if (FR.width !== w || FR.height !== h) { FR.width = w; FR.height = h; } fr.setTransform(dev, 0, 0, dev, 0, 0); scene(fr, live ? (f + 0.5) / 15 : t); frKey = key; }
      x.drawImage(FR, 0, 0, W, H);
    },
    busy: busyAt,
    tap(t, sfx) {
      const NOTE = ['#ff5a9a', '#5ac8ff', '#ffd23a', '#7ae09a', '#c88aff'];
      if (S.step < S.total) { const k = S.step++; S.t[k] = t;
        if (k === 0) setTimeout(() => sfx.pop && sfx.pop(), 1500);
        if (k === 1) for (let i = 0; i < 4; i++) setTimeout(() => sfx.boing && sfx.boing(i), (0.1 + i * 0.28) * 1000);
        if (k === 2) { [0, 3, 4, 2].forEach((c, i) => setTimeout(() => sfx.choir && sfx.choir(c), i * 650)); for (let i = 0; i < 6; i++) S.notes.push({ x: 140 + i * 22, t: t + i * 0.35, col: NOTE[i % 5] }); }
        if (k === 3) { S.sl = t + 0.1; setTimeout(() => sfx.jingle && sfx.jingle(), 300); }
        if (k === 4) { S.done = true; setTimeout(() => sfx.bell && sfx.bell(), 500); setTimeout(() => sfx.choir && sfx.choir(4), 900); }
      } else { S.hop = t; const c = Math.floor(Math.random() * 5); if (sfx.choir) sfx.choir(c); S.notes.push({ x: 130 + Math.random() * 130, t, col: NOTE[c] }); while (S.notes.length > 12) S.notes.shift();
        if (S.taps++ % 2 === 1 && !(S.sl != null && t - S.sl < SL_D)) { S.sl = t + 0.1; setTimeout(() => sfx.jingle && sfx.jingle(), 300); } }
    } };
}
