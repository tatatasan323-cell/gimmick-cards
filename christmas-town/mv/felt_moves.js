// 写し：動画制作ラボ/MV/クリスマス/folk/見本/felt_moves.js（MV は完成済み・元は書きかえない）。window.MV_MOVES を作る（ヒップホップとフォークで同じ名前なので、読んだ直後に取り分ける＝共通/greet_kit.js の loadMV）
// フォークの見本の動き（window.MV_MOVES）。1本目の hiphop/moves.js の写し（1本目は書きかえない）。felt_rig.js の人形（15関節）に渡す姿勢を、時刻から作る。
// 1本目から足したもの：aim（世界の点へ手首を運ぶ）・sit（座る）。拍は data の bpm（フォークは 68.73）
// 手足は位置から関節の角度を逆算する（MV「パンプキン・ポン！」の dance.js と同じ式）。
// 歩き：足は、歩いた距離から決める（立ち止まれば足は止まる・地面をすべらない）。スクロールの速さで歩くと、1拍に1歩
(() => {
  const { clamp, lerp, seg, ease } = V;
  const TAU = Math.PI * 2, PI = Math.PI;
  const D = (V.S.data || {}), BPER = 60 / (D.bpm || 92.8), BEAT0 = D.beat0 ?? 18.085;
  const bpOf = (T) => (T - BEAT0) / BPER;
  const down = (bp) => 0.5 + 0.5 * Math.cos((((bp % 1) + 1) % 1) * TAU);   // 拍の頭で1
  const arc = (b) => 4 * b * (1 - b);
  const sin = (bp, n, ph = 0) => Math.sin((bp / n + ph) * TAU);
  // ---- 2節の逆運動学（X 外向きが正・Y 下が正。角度は真下から外へ） ----
  function ik2(l1, l2, X, Y, bend) {
    let Dd = Math.hypot(X, Y) || 1e-6; const lo = Math.abs(l1 - l2) + 0.5, hi = l1 + l2 - 0.5, Dc = clamp(Dd, lo, hi);
    X *= Dc / Dd; Y *= Dc / Dd; Dd = Dc;
    const el0 = Math.acos(clamp((Dd * Dd - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1)), phi = Math.atan2(X, Y);
    const sol = (s) => { const el = s * el0, P = l1 + l2 * Math.cos(el), Q = l2 * Math.sin(el), a1 = phi - Math.atan2(Q, P); return { a1, el, ex: l1 * Math.sin(a1), ey: l1 * Math.cos(a1) }; };
    const A = sol(1), B = sol(-1), score = { out: (s) => s.ex, in: (s) => -s.ex, down: (s) => s.ey, up: (s) => -s.ey }[bend || 'out'];
    return score(A) >= score(B) ? A : B;
  }
  // 手を胸の座標（画面の右が +x・下が +y）の点へ。side=+1 が画面の左の腕
  // ひじの向き：'out'（既定）は「手が肩より下なら、ひじは進む向きの反対（後ろ）。肩より上なら外（頭の上の箱を押さえる腕などは、ひじを横へ張る。内へ折ると前腕が顔を隠した）」。左右対称に外へ折ると、ひじが外や前へ折れて見えた（本人 2026-10-18「足同様に、腕の曲がりも変」）
  // 'in'・'down'・'up' はそのまま。進む向きは p.dir（歩き・立ちで決まる。既定は右）
  const elbowMode = (p, side, bend, below) => (bend !== 'out' ? bend : !below ? 'out' : side * (p.dir ?? 1) > 0 ? 'out' : 'in');
  // 手が肩の近く（物を体の前で持つ）では、ひじを横へ大きく折る代わりに、前腕がカメラの方を向いて短く見える形にする（as）。ひじは後ろ・下へ少しだけ曲がる
  function hand(p, J, side, tx, ty, bend = 'out', wr = 0) { const k = side > 0 ? 'L' : 'R', X = -side * (tx + side * J.shX), Y = ty - J.shY, L = J.ua + J.fa, d = Math.hypot(X, Y), below = ty > J.shY - 2;
    const as = bend === 'out' && below && d < 0.8 * L ? Math.max(0.42, d / (0.88 * L)) : 1, s = ik2(J.ua * as, J.fa * as, X, Y, elbowMode(p, side, bend, below));
    p['sh' + k] = s.a1; p['el' + k] = s.el; p['wr' + k] = wr; p['armS' + k] = as; return p; }
  // 腕を向き ang（0＝真下・π/2＝真横・π＝真上）へ、腕いっぱいの frac
  function reach(p, J, side, ang, frac = 1, bend = 'out', wr = 0) { const k = side > 0 ? 'L' : 'R', r = (J.ua + J.fa) * frac, s = ik2(J.ua, J.fa, r * Math.sin(ang), r * Math.cos(ang), elbowMode(p, side, bend, Math.cos(ang) > 0.05)); p['sh' + k] = s.a1; p['el' + k] = s.el; p['wr' + k] = wr; p['armS' + k] = 1; return p; }
  // 足首を、そのもも付け根からの画面の位置へ（dx 右が正・dy 下が正）。足は地面と水平に
  // bend：数（+1／−1）を渡すと、ひざを「進む向き」へ曲げる（左右どちらの脚も同じ向き）。'out' のように左右対称に外へ曲げると、ガニまたに見えた（本人 2026-10-18）
  // fore（0〜1）：足が近い分を、ひざを曲げる代わりに脚が縮んで見えることで受ける割合（立って沈む時に、少しだけ使う）
  function foot(p, J, side, dx, dy, bend = 'out', tilt = 0, fore = 0) { const k = side > 0 ? 'L' : 'R', d = Math.hypot(dx, dy), L = J.th + J.sh, ls = d < L ? 1 - fore * (1 - Math.max(0.55, d / L)) : 1;
    const mode = typeof bend === 'number' ? (side * bend > 0 ? 'in' : 'out') : bend, s = ik2(J.th * ls, J.sh * ls, -side * dx, dy, mode);
    p['hip' + k] = s.a1; p['knee' + k] = s.el; p['ank' + k] = -(s.a1 + s.el) + tilt; p['legS' + k] = ls; return p; }
  const legLen = (J) => J.th + J.sh;

  // ---- 下半身 ----
  // 歩く：dist＝歩いた距離（人形の単位。前へ＝+）。1歩＝step。脚は横から見た形（体は正面向きの平らな人形でも、歩きは横から）。
  // 前へ振り出す脚はひざを進む向き（dir）へ曲げ、後ろの脚は伸びて地面を押す、の交互。つま先も進む向きへ。腰は踏んだ時に沈み、踏んでいる足の方へ少し寄る
  function walk(p, J, dist, o = {}) {
    const step = o.step || 30, ph = dist / step, n = Math.floor(ph), f = ph - n, Lst = ((n % 2) + 2) % 2 === 0, lift = (o.lift ?? 12) * (o.amp ?? 1), dir = o.dir ?? 1;
    const prof = 1, hipOff = J.hipX * (1 - 0.65 * prof);
    p.prof = prof; p.dir = dir;
    const bob = (o.bob ?? 6) * (0.5 + 0.5 * Math.cos(f * TAU)), hx = (Lst ? -1 : 1) * 3 * Math.sin(f * PI) + (o.hx || 0), hy = bob + (o.hy || 0);
    p.hx = hx; p.hy = hy;
    const st = -(f - 0.5) * step, sw = lerp(-step / 2, step / 2, ease.inOut(f)), up = Math.sin(f * PI) * lift;
    for (const side of [1, -1]) { const isSt = (side > 0) === Lst, x = isSt ? st : sw, y = legLen(J) - hy - (isSt ? 0 : up);
      foot(p, J, side, x - hx + side * hipOff * 0.4, y, dir, isSt ? 0 : -0.25 * dir * Math.sin(f * PI)); }
    p.pelvis = 0.05 * (Lst ? 1 : -1) * Math.sin(f * PI); p.waist = -p.pelvis * 0.8;
    const xL = Lst ? st : sw; p.armSwing = -xL / (step / 2);   // 左腕は左脚と逆（左脚が前＝進む向きのとき、左腕は後ろ）。右腕はその逆
    return { n, f, Lst };
  }
  // その場で立つ（腰を hx・hy に動かしても足は踏んだまま）。沈む時のひざは、左右とも向いている側（dir）へ曲げる（左右対称に外へ折るとガニまたになる）
  function stance(p, J, o = {}) { const hx = o.hx || 0, hy = o.hy || 0, sp = (o.spread == null ? 1 : o.spread) * (o.girl ? 0.75 : 1), dir = o.dir ?? p.dir ?? 1; p.hx = hx; p.hy = hy; p.dir = dir;
    for (const side of [1, -1]) { const L = side > 0 ? 'L' : 'R'; foot(p, J, side, side * J.hipX * (1 - sp) - hx + (o['fx' + L] || 0), legLen(J) - hy - (o['lift' + L] || 0), o.girl ? 'in' : dir, o['tilt' + L] || 0, o.fore ?? 0.35); } return p; }
  // ひざを入れて揺れる（2拍で左右）
  const groove = (p, J, bp, amp = 1, girl) => { const s = sin(bp, 2), d = down(bp); stance(p, J, { hx: 10 * s * amp, hy: 9 * d * amp, spread: 1.25, girl, liftL: girl && s < -0.6 ? 12 : 0, liftR: girl && s > 0.6 ? 12 : 0 }); p.pelvis = -0.07 * s; p.waist = 0.09 * s; return p; };

  // ---- 上半身（腕・胸・首だけを決める） ----
  const U = {};
  // 歩く腕（横から見た形）：腕は下げて、同じ側の脚と逆に前後へ振る。ひじは後ろ、前腕は進む向きへ少し振り出す
  const armWalk = (p, J, amp, lift) => { const a = p.armSwing ?? 0, dir = p.dir ?? 1, L = J.ua + J.fa;
    for (const side of [1, -1]) { const sw = side > 0 ? a : -a;   // 画面の右（＋）へ何割振るか
      hand(p, J, side, -side * J.shX + sw * amp * L + dir * 0.14 * L, J.shY + L * (0.86 - lift) - 0.1 * L * Math.abs(sw), 'out', 0.15 * dir * side); } };
  U.swing = (p, J, m) => { armWalk(p, J, 0.32, 0); p.neck = (p.neck || 0) + 0.05 * sin(m.bp, 2); };
  U.strut = (p, J, m) => { const d = down(m.bp); armWalk(p, J, 0.26, 0.14 + 0.08 * d); p.neck = (p.neck || 0) + 0.1 * sin(m.bp, 2); p.waist = (p.waist || 0) + 0.06 * sin(m.bp, 2); };   // 肩でノる：ひじを曲げて拍で揺らす
  U.beckon = (p, J, m) => { const w = Math.sin(m.bp * TAU); reach(p, J, m.side || -1, 1.7, 0.95, 'out'); const k = (m.side || -1) > 0 ? 'L' : 'R'; p['el' + k] = 0.2 + 0.9 * w; p['wr' + k] = 0.5 * w; reach(p, J, -(m.side || -1), 0.5, 0.95, 'down'); p.neck = (p.neck || 0) + 0.1 * w; };
  U.beckon2 = (p, J, m) => { const w = Math.sin(m.bp * TAU); reach(p, J, 1, 1.6, 0.95, 'out'); reach(p, J, -1, 1.6, 0.95, 'out'); p.elL = 0.3 + 0.8 * w; p.elR = 0.3 + 0.8 * w; p.wrL = 0.4 * w; p.wrR = 0.4 * w; p.neck = (p.neck || 0) + 0.08 * w; };
  U.clap = (p, J, m) => { const k = ease.out(seg(1 - Math.abs((((m.bp % 1) + 1) % 1) * 2 - 1), 0, 0.5)); const x = lerp(2, 30, 1 - k), y = lerp(-30, -18, 1 - k); hand(p, J, 1, -x, y, 'out'); hand(p, J, -1, x, y, 'out'); };
  U.clapUp = (p, J, m) => { const k = 1 - Math.abs((((m.bp % 1) + 1) % 1) * 2 - 1); reach(p, J, 1, lerp(2.75, 2.25, k), 1, 'out'); reach(p, J, -1, lerp(2.75, 2.25, k), 1, 'out'); };
  U.point = (p, J, m) => { const w = 0.15 * sin(m.bp, 1); reach(p, J, -1, 2.0 + w, 1, 'out', 0.2); reach(p, J, 1, 0.35, 0.95, 'down'); p.waist = (p.waist || 0) + 0.06; p.neck = (p.neck || 0) - 0.08; };   // 前（画面の右）を指さす
  U.raise = (p, J, m) => { const up = ease.out(seg(m.u, 0, 0.3)); reach(p, J, -1, lerp(0.6, 2.6, up), 1, 'out', 0.3); hand(p, J, 1, -14, 10, 'down'); p.neck = (p.neck || 0) - 0.05 * up; };   // 片手を高く（乾杯）
  U.cheer = (p, J, m) => { reach(p, J, 1, PI - 0.4 + 0.12 * sin(m.bp, 1), 1, 'out', 0.2); reach(p, J, -1, PI - 0.4 - 0.12 * sin(m.bp, 1), 1, 'out', 0.2); };
  U.chest = (p, J, m) => { const o = ease.inOut(seg(((m.bp % 2) + 2) % 2, 0.6, 1.4)); if (o < 0.5) { hand(p, J, 1, -6, -6, 'down'); hand(p, J, -1, 6, -6, 'down'); } else { reach(p, J, 1, 1.9, 1, 'out'); reach(p, J, -1, 1.9, 1, 'out'); } p.waist = (p.waist || 0) + 0.05 * (o < 0.5 ? 1 : -1); };   // 胸に手 → 前へひらく
  U.ears = (p, J, m) => { const x = 0.8 * J.headR, y = J.neckY - 0.85 * J.headR; hand(p, J, 1, -x, y, 'out', 0.6); hand(p, J, -1, x, y, 'out', -0.6); p.neck = (p.neck || 0) + 0.1 * sin(m.bp, 1); };   // 耳をふさぐ（またその話？）。手は顔の横の耳の高さ（頭のてっぺんだと、顔の前の手が帽子のつばに重なって、帽子より手前か奥か分からなかった）
  U.hug = (p, J, m) => { const s = sin(m.bp, 2); reach(p, J, 1, 1.5 + 0.1 * s, 1, 'out'); reach(p, J, -1, 1.5 - 0.1 * s, 1, 'out'); p.waist = (p.waist || 0) + 0.1 * s; p.neck = (p.neck || 0) - 0.1 * s; };   // 肩を組む（腕を横へ）
  U.selfHug = (p, J, m) => { hand(p, J, 1, 16, -14, 'down'); hand(p, J, -1, -16, -10, 'down'); p.neck = (p.neck || 0) + 0.12; };
  U.hold = (p, J, m) => { hand(p, J, 1, -14, 2 + (m.dy || 0), 'down', 0.3); hand(p, J, -1, 14, 2 + (m.dy || 0), 'down', -0.3); };   // 両手で胸の前に持つ（缶・箱）
  U.holdUp = (p, J, m) => { hand(p, J, 1, -13, -28 + (m.dy || 0), 'out'); hand(p, J, -1, 13, -28 + (m.dy || 0), 'out'); };   // 両手を胸の上へ（受け止める・差し上げる）
  U.reachOut = (p, J, m) => { const u = m.u ?? 1; reach(p, J, 1, lerp(0.4, 2.2, u), 1, 'out'); reach(p, J, -1, lerp(0.4, 2.0, u), 1, 'out'); p.waist = (p.waist || 0) - 0.1 * u; };
  U.shrug = (p, J, m) => { const k = Math.sin(PI * clamp(m.u ?? 0.5)); hand(p, J, 1, -40 - 10 * k, -4 - 18 * k, 'down', -0.6 * k); hand(p, J, -1, 40 + 10 * k, -4 - 18 * k, 'down', 0.6 * k); p.neck = (p.neck || 0) + 0.12 * k; };
  U.wave = (p, J, m) => { const w = Math.sin(m.bp * PI * 2); reach(p, J, -1, PI - 0.7, 0.98, 'out', 0.3 * w); p.elR = 0.1 + 0.35 * w; reach(p, J, 1, 0.35, 0.96, 'down'); };
  U.bell = (p, J, m) => { const w = Math.sin(m.bp * TAU * 2); reach(p, J, -1, 2.3 + 0.25 * w, 0.95, 'out', 0.6 * w); reach(p, J, 1, 0.5, 0.95, 'down'); p.waist = (p.waist || 0) + 0.04 * w; };   // 鈴を振る
  U.box = (p, J, m) => { hand(p, J, 1, -26, -26 + (m.dy || 0), 'out', 0.5); hand(p, J, -1, 26, -26 + (m.dy || 0), 'out', -0.5); };   // 大きな箱を胸の高さで抱える
  U.scarf = (p, J, m) => { const w = Math.sin(m.bp * TAU); reach(p, J, -1, 2.5 + 0.4 * w, 1, 'out', 0.6 * w); reach(p, J, 1, 1.2, 0.95, 'out'); };   // マフラーを振り回す
  U.tell = (p, J, m) => { const w = sin(m.bp, 2), q = sin(m.bp, 1, 0.3); reach(p, J, 1, 1.2 + 0.5 * w, 0.9, 'out', 0.4 * q); reach(p, J, -1, 1.5 - 0.4 * w, 0.85, 'out', -0.4 * q); p.neck = (p.neck || 0) + 0.1 * w; };   // 身ぶりで話す
  U.laugh = (p, J, m) => { const k = Math.abs(sin(m.bp * 2, 1)); hand(p, J, 1, -16, 24, 'down'); hand(p, J, -1, 16, 26, 'down'); p.waist = (p.waist || 0) + 0.22 + 0.06 * k; p.neck = (p.neck || 0) + 0.12 * k; };   // 体を折って笑う
  U.crouch = (p, J, m) => { reach(p, J, 1, 0.45, 0.9, 'out'); reach(p, J, -1, 0.45, 0.9, 'out'); p.elL = -0.8; p.elR = -0.8; };

  // 世界の点 (X, Y) へ手首を運ぶ（物を置く・つかむ・縫う）。脚と胴（hx・hy・pelvis・waist）を決めた後に呼ぶ。o は描く時と同じ { x, y, sc, flip }
  function aim(ch, p, o, side, X, Y, bend = 'out', wr = 0) { const P = FR.fk(ch, Object.assign({}, FR.REST, p)), q = FR.toRig(X, Y, p, o), dx = q.x - P.waist.x, dy = q.y - P.waist.y, ca = P.chestA;
    return hand(p, ch.J, side, dx * Math.cos(-ca) - dy * Math.sin(-ca), dx * Math.sin(-ca) + dy * Math.cos(-ca), bend, wr); }
  // 座る：腰を座面（足もとの原点）に下ろし、脚を前へ投げ出す（足の裏がこちらを向く）。spread＝足の開き
  function sit(p, J, o = {}) { const sp = o.spread ?? 1.25; p.hy = J.stand - (o.drop ?? 6); p.hx = o.hx || 0; p.soles = 1;
    for (const side of [1, -1]) foot(p, J, side, side * J.hipX * (1 - sp) - p.hx, (J.th + J.sh) * (o.reach ?? 0.62), 'out', 0, 0.8); return p; }
  window.MV_MOVES = { BPER, BEAT0, bpOf, down, arc, sin, ik2, hand, reach, foot, stance, walk, groove, U, legLen, aim, sit };
})();
