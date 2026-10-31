// 写し：動画制作ラボ/MV/クリスマス/gospel/全編/kage_rig.js（MV は完成済み・元は書きかえない）。グリーティングカードの絵で、MV の人物をそのまま描くために使う（共通/greet_cards.js が、その絵の時だけ読む）
// ゴスペル「Singing Glory」の見本：色の透ける影絵の人形（皮影ふう）。横顔の15関節（window.KR）
// 人形は横顔の平らな切り抜き。右向きで作り、左向きは裏返して貼る（紙が返る）。
// 関節（15）：腰の動き（hx,hy）・腰（pelvis）・胸の曲げ（waist）・首・肩×2・ひじ×2・手首×2・もも×2・ひざ×2・足首×2
// 前後（本人の基準 4章）：横顔では、手前の腕＝カメラの側の腕（右を向けば右腕）。
//   奥の腕は肩ごと胴・頭・帽子の後ろ。手前の腕は、上げても下ろしても、顔・帽子・持ち物より手前。
//   描く順：奥の腕（＋奥の手の物）→ 奥の脚 → 手前の脚 → 胴（衣）→ 胸の前の物 → 両手で抱える物 → 頭（髪・帽子）→ 手前の腕（＋手前の手の物）
// ひじは片側にしか曲がらない：前腕は上腕から「前へ」だけ回る（el ≥ 0）。手の位置から決める時も、この向きの解だけを取る（armIK）
// ひざは前へ曲がる：すねは、ももから「後ろへ」だけ回る（knee ≥ 0）
// 色：人形は「光の通しやすさ」の色で描く（膜＝色・革の縁＝暗い色・目と口＝切り抜き＝透明）。光をかけるのは場面の側
// 約束：絵は引数だけで決まる（t は呼ぶ側が渡す）。Math.random は使わない
(() => {
  const TAU = Math.PI * 2;
  const LEA = '#2c1430';   // 革（濃い影。真っ黒にせず、紙越しの赤紫を残す）
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const sc = (a, k) => ({ x: a.x * k, y: a.y * k });
  const lp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  const R = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });   // 右向きの人形で「前へ倒す」回り
  const U = (a, l) => ({ x: Math.sin(a) * l, y: -Math.cos(a) * l });   // 上を a だけ前へ倒した向き
  const D = (a, l) => ({ x: Math.sin(a) * l, y: Math.cos(a) * l });    // 下を a だけ前へ振った向き（腕・脚）

  const REST = { hx: 0, hy: 0, pelvis: 0, waist: 0, neck: 0,
    shN: 0.08, elN: 0.18, wrN: 0, shF: -0.04, elF: 0.2, wrF: 0,
    hipN: 0.03, kneeN: 0.02, ankN: 0, hipF: -0.03, kneeF: 0.02, ankF: 0,
    mouth: 0, look: 0, blink: 0, headFlip: 0, hem: 0, cane: 0, hat: 0, babyHand: 0, smile: 1 };

  // ---------- 寸法（人形の単位。大人の背丈 約170） ----------
  const BASE = { headR: 23, neckL: 5, tl: 56, shX: 3, shY: 8, ua: 29, fa: 26, handR: 8.5, armW: 15,
    stand: 66, th: 31, sh: 29, footL: 22, footH: 9, legW: 15, band: 3.0, topW: 28, hemW: 46, hemY: 8, belly: 0 };

  // ---------- 骨組み（足もと＝原点、上が −y、前が +x） ----------
  function fk(ch, p) {
    const J = ch.J, P = {};
    const root = { x: p.hx, y: -J.stand + p.hy }, pa = p.pelvis, ca = pa + p.waist;
    P.root = root; P.pa = pa; P.ca = ca;
    P.chest = add(root, U(pa, J.tl * 0.42));
    P.neck = add(P.chest, U(ca, J.tl * 0.58));
    P.shN = add(P.neck, R({ x: J.shX, y: J.shY }, ca));
    P.shF = add(P.shN, R({ x: -3, y: -1.5 }, ca));
    for (const k of ['N', 'F']) {
      const as = p['armS' + k] ?? 1, a1 = p['sh' + k] - ca, el = add(P['sh' + k], D(a1, J.ua * as)), a2 = a1 + p['el' + k], wr = add(el, D(a2, J.fa * as)), a3 = a2 + p['wr' + k];
      P['arm' + k] = [P['sh' + k], el, wr]; P['hand' + k] = add(wr, D(a3, J.handR * 0.7)); P['handA' + k] = a3; P['a1' + k] = a1; P['a2' + k] = a2;
    }
    const ha = ca + p.neck * 0.5;
    P.neckTop = add(P.neck, U(ha, J.neckL));
    P.headA = ca + p.neck;
    P.head = add(P.neckTop, add(U(P.headA, J.headR * 0.84), R({ x: J.headR * 0.12, y: 0 }, P.headA)));
    for (const [k, dx] of [['N', 2], ['F', -2]]) {
      const hip = add(root, R({ x: dx, y: 2 }, pa)), b1 = p['hip' + k] - pa, knee = add(hip, D(b1, J.th)), b2 = b1 - p['knee' + k], ank = add(knee, D(b2, J.sh));
      P['leg' + k] = [hip, knee, ank]; P['foot' + k] = p['ank' + k];
    }
    return P;
  }
  // 手首の位置から腕を決める（ひじは「後ろ・下」の側の解だけ）。tgt は人形の座標
  function armIK(ch, p, k, tgt) {
    p['armS' + k] = 1; const P = fk(ch, p), J = ch.J, S = P['sh' + k], L1 = J.ua, L2 = J.fa;
    const dx = tgt.x - S.x, dy = tgt.y - S.y, d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.5, L1 + L2 - 0.05);
    const th = Math.atan2(dx, dy);
    const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), be = Math.acos(clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1));
    p['sh' + k] = th - al + P.ca; p['el' + k] = al + be;
    return p;
  }
  // 肩からの相対の位置で
  const armTo = (ch, p, k, dx, dy) => { const P = fk(ch, p); return armIK(ch, p, k, add(P['sh' + k], { x: dx, y: dy })); };
  // 横へ上げる腕（横顔では、カメラの方へ向かう腕は短く見える）：肘はほぼ伸ばしたまま、肩から目当ての向きへ。長さは見かけの長さ（縮めて見せる）
  // 手の位置からの2本の骨の解（肘が前へ出る）だと、上げた手前の腕の肘が顔の前を通るので、上げる腕はこれで決める
  function armStraight(ch, p, k, dx, dy) { const P = fk(ch, p), J = ch.J, L = J.ua + J.fa, d = Math.hypot(dx, dy);
    p['sh' + k] = Math.atan2(dx, dy) + P.ca - 0.06; p['el' + k] = 0.12; p['armS' + k] = clamp(d / (L * 0.995), 0.14, 1); return p; }
  // 足首の位置から脚を決める（ひざは前）
  function legIK(ch, p, k, tgt) {
    const P = fk(ch, p), J = ch.J, Hh = P['leg' + k][0], L1 = J.th, L2 = J.sh;
    const dx = tgt.x - Hh.x, dy = tgt.y - Hh.y, d = clamp(Math.hypot(dx, dy), 4, L1 + L2 - 0.05);
    const th = Math.atan2(dx, dy);
    const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), be = Math.acos(clamp((L2 * L2 + d * d - L1 * L1) / (2 * L2 * d), -1, 1));
    p['hip' + k] = th + al + P.pa; p['knee' + k] = al + be;
    return p;
  }

  // ---------- 描く道具 ----------
  const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); };
  // 点の列を通る、なめらかな閉じた形（Catmull-Rom）
  function spline(pts, closed = true, path = new Path2D()) {
    const n = pts.length, at = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
    path.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      path.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
    }
    if (closed) path.closePath();
    return path;
  }
  // 膜を貼った切り抜き：膜の色で塗って、革の縁で囲う
  let FORCE = null, SIL = false, FILMK = 0.66, OPENF = false;   // 影絵の切り抜き（見本B）：顔・手・髪・ひげは革。色は服・帽子・マフラーの膜だけ
  // 影絵では膜を少し濃く（染めた革の膜。光をいくらか遮るので、離れた人形の影にも形が残る）
  const DK = {}; const dk = (c) => { if (!SIL || typeof c !== 'string' || c[0] !== '#' || c === LEA) return c; const key = c + FILMK; if (DK[key]) return DK[key]; const n = parseInt(c.slice(1), 16); return DK[key] = `rgb(${((n >> 16) & 255) * FILMK | 0},${((n >> 8) & 255) * FILMK | 0},${(n & 255) * FILMK | 0})`; };
  function piece(g, path, film, band) { g.fillStyle = FORCE || dk(film); g.fill(path); if (band > 0) { g.strokeStyle = LEA; g.lineWidth = band; g.lineJoin = 'round'; g.stroke(path); } }
  // 丸い手足（袖・すね）：太い丸い線を革で太く → 膜で細く（関節の継ぎ目を作らない、ひと続きの形）
  function limb(g, pts, w, film, band) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = LEA; g.lineWidth = w + band * 2; line(g, pts); g.stroke();
    g.strokeStyle = dk(film); g.lineWidth = w; line(g, pts); g.stroke();
  }
  const circ = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.3, r), 0, TAU); return p; };
  const ell = (x, y, rx, ry, a = 0) => { const p = new Path2D(); p.ellipse(x, y, Math.max(0.3, rx), Math.max(0.3, ry), a, 0, TAU); return p; };
  // 手（ミトン）：手首 w から a3 の向きに。親指は前（体の内側）へ
  function hand(g, ch, P, k, film) {
    const J = ch.J, h = P['hand' + k], a = P['handA' + k], b = J.band;
    const th = add(h, add(D(a, -J.handR * 0.15), R({ x: J.handR * 0.75, y: 0 }, -a)));
    piece(g, circ(th.x, th.y, J.handR * 0.42), film, b * 0.8);
    piece(g, ell(h.x, h.y, J.handR * 0.92, J.handR, -a), film, b);
  }
  // 袖口の飾り（膜の帯）
  function cuff(g, ch, P, k, col) {
    const J = ch.J, [, el, wr] = P['arm' + k], d = Math.hypot(wr.x - el.x, wr.y - el.y) || 1, ux = (wr.x - el.x) / d, uy = (wr.y - el.y) / d;
    const c = { x: wr.x - ux * 3, y: wr.y - uy * 3 };
    g.lineCap = 'butt'; g.strokeStyle = LEA; g.lineWidth = 7; g.beginPath(); g.moveTo(c.x - uy * (J.armW / 2 + 1), c.y + ux * (J.armW / 2 + 1)); g.lineTo(c.x + uy * (J.armW / 2 + 1), c.y - ux * (J.armW / 2 + 1)); g.stroke();
    g.strokeStyle = col; g.lineWidth = 3.4; g.stroke(); g.lineCap = 'round';
  }
  function arm(g, ch, P, k, film) {
    const J = ch.J;
    limb(g, P['arm' + k], J.armW, film, J.band);
    if (ch.lace && !ch.plainSleeve) { g.save(); g.globalAlpha = 0.6; g.strokeStyle = lacePat(g, ch.lace, (ch.laceS || 1) * 0.8); g.lineWidth = J.armW - 2; line(g, P['arm' + k]); g.stroke(); g.restore(); }
    if (ch.cuff) cuff(g, ch, P, k, ch.cuff);
    hand(g, ch, P, k, SIL ? LEA : ch.skin);   // 手は顔と同じ革
    if (SIL) { const [sh, el] = P['arm' + k]; for (const q of [sh, el]) { g.fillStyle = LEA; g.beginPath(); g.arc(q.x, q.y, 3.6, 0, TAU); g.fill(); g.fillStyle = '#e8c27a'; g.beginPath(); g.arc(q.x, q.y, 1.9, 0, TAU); g.fill(); } }   // 関節の留め具
  }
  // 脚：すね（ズボン・靴下の膜）と靴
  function leg(g, ch, P, k) {
    const J = ch.J, [hip, knee, ank] = P['leg' + k], b = J.band, a = P['foot' + k];
    limb(g, [hip, knee, ank], J.legW, ch.legs || ch.robe, b);
    const fd = { x: Math.cos(a), y: Math.sin(a) }, c = add(ank, { x: fd.x * J.footL * 0.32, y: fd.y * J.footL * 0.32 + J.footH * 0.35 });
    piece(g, ell(c.x, c.y, J.footL * 0.62, J.footH * 0.62, a), ch.shoes || LEA, b);
  }
  // 衣（横顔）：首の付け根から裾まで。前は胸とおなか、後ろは背中。裾は波打ち、動きで振れる（hem）
  function bodyPath(ch, P, p, v) {
    const J = ch.J, ca = P.ca, pa = P.pa, f = R({ x: 1, y: 0 }, ca), u = U(ca, 1), fp = R({ x: 1, y: 0 }, pa), up = U(pa, 1);
    const at = (o, a, b) => add(o, add(sc(a, 1), sc(b, 1)));
    const j = (i) => (V.hash(i, 300 + v) - 0.5) * 0.9;   // 切り口の小さな揺れ（3種を1秒15枚で切りかえる）
    const top = J.topW, hw = J.hemW, sw = p.hem || 0, hy = -J.hemY, rx = P.root.x;
    const N = P.neck, C = lp(P.root, P.neck, 0.55), Hm = P.root;
    const pts = [
      at(N, sc(f, top * 0.42 + j(1)), sc(u, 1)),                       // 首の前
      at(lp(N, C, 0.5), sc(f, top * 0.86 + j(2)), { x: 0, y: 0 }),        // 胸
      at(C, sc(f, top * 0.96 + J.belly * 0.55 + j(3)), { x: 0, y: 0 }),   // みぞおち
      at(Hm, sc(fp, top * 0.9 + J.belly + j(4)), sc(up, J.tl * 0.12)),     // おなか
      { x: rx + hw * 0.64 + sw + j(5), y: hy + j(6) },                    // 裾の前
      { x: rx + hw * 0.2 + sw * 0.9, y: hy + 3 + j(7) },
      { x: rx - hw * 0.18 + sw * 0.75, y: hy + 1.5 + j(8) },
      { x: rx - hw * 0.5 + sw * 0.6 + j(9), y: hy + j(10) },             // 裾の後ろ
      at(Hm, sc(fp, -top * 0.86 - J.back + j(11)), sc(up, J.tl * 0.1)),   // 腰の後ろ
      at(C, sc(f, -top * 0.9 - J.back * 0.6 + j(12)), { x: 0, y: 0 }),     // 背中
      at(N, sc(f, -top * 0.5 + j(13)), sc(u, 1.5)),                        // 首の後ろ
      at(N, sc(f, -top * 0.05), sc(u, 5)),                                  // 肩の上
    ];
    return { path: spline(pts), pts };
  }

  // 皮影の透かし彫り：革にレースのような模様を彫り、その奥に色の膜。膜の色は彫りの間から光る
  // 模様は読み込み時に1回だけ作る（1単位＝4画素。人形の座標で貼るので、寄りでも引きでも同じ細かさ）
  const LACE = (() => {
    const Q = 4, N = 48, mk2 = (draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = N * Q; const g = cv.getContext('2d'); g.scale(Q, Q); g.strokeStyle = LEA; g.fillStyle = LEA; g.lineCap = 'round'; g.lineJoin = 'round'; draw(g); return cv; };
    return {
      lattice: mk2((g) => { g.lineWidth = 2.1; for (let i = -1; i <= 2; i++) { g.beginPath(); g.moveTo(i * 24 - 24, 0); g.lineTo(i * 24 + 24, 48); g.moveTo(i * 24 + 24, 0); g.lineTo(i * 24 - 24, 48); g.stroke(); } for (const [x, y] of [[0, 0], [24, 24], [48, 0], [0, 48], [48, 48], [24, 0], [0, 24], [48, 24], [24, 48]]) { g.beginPath(); g.arc(x, y, (x + y) % 48 === 0 ? 3.4 : 1.8, 0, Math.PI * 2); g.fill(); } }),
      cloud: mk2((g) => { g.lineWidth = 1.9; for (const [cx, cy, s] of [[12, 12, 1], [36, 36, 1], [36, 8, 0.7], [10, 38, 0.7]]) { g.beginPath(); for (let a = 0; a < 11; a += 0.25) { const r = (1.2 + a * 0.85) * s, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } g.beginPath(); g.moveTo(0, 24); g.quadraticCurveTo(12, 30, 24, 24); g.quadraticCurveTo(36, 18, 48, 24); g.stroke(); }),
      flower: mk2((g) => { g.lineWidth = 1.6; for (const [cx, cy] of [[12, 12], [36, 36]]) { for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; g.beginPath(); g.ellipse(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5, 4.6, 2.4, a, 0, Math.PI * 2); g.stroke(); } g.beginPath(); g.arc(cx, cy, 1.8, 0, Math.PI * 2); g.fill(); } g.beginPath(); g.moveTo(12, 21); g.quadraticCurveTo(14, 30, 27, 36); g.moveTo(36, 27); g.quadraticCurveTo(34, 18, 21, 12); g.stroke(); }),
      pleat: mk2((g) => { g.lineWidth = 1.7; for (const x of [6, 18, 30, 42]) { g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 2, 24, x, 48); g.stroke(); } for (const [x, y] of [[12, 10], [36, 22], [24, 40], [0, 34], [48, 34]]) { g.beginPath(); g.arc(x, y, 1.7, 0, Math.PI * 2); g.fill(); } }),
    };
  })();
  const lacePat = (g, kind, sc = 1) => { const p = g.createPattern(LACE[kind], 'repeat'); p.setTransform(new DOMMatrix().scale(sc / 4)); return p; };

  // 皮影の彫り：衣の縁の内側に、もう1本の細い革の線（膜をはさんだ二重の縁）と、裾の上の小さな花の彫り
  function carve(g, ch, bp, b) {
    if (ch.lace) { g.save(); g.globalAlpha = 0.72; g.fillStyle = lacePat(g, ch.lace, ch.laceS || 1); g.fill(bp.path); g.restore(); }
    g.save(); g.clip(bp.path); g.lineJoin = 'round';
    g.strokeStyle = LEA; g.lineWidth = b + 7; g.stroke(bp.path);
    g.strokeStyle = ch.robe; g.lineWidth = b + 4.2; g.stroke(bp.path);
    g.strokeStyle = LEA; g.lineWidth = b; g.stroke(bp.path);
    const q = [4, 5, 6, 7].map((i) => bp.pts[i]);
    g.fillStyle = LEA;
    for (let i = 0; i < 5; i++) { const u = (i + 0.5) / 5, a = lp(q[0], q[3], u), y = a.y - 14; g.beginPath(); for (let k = 0; k < 4; k++) { const t = k / 4 * TAU + 0.4; g.moveTo(a.x, y); g.quadraticCurveTo(a.x + Math.cos(t - 0.5) * 6, y + Math.sin(t - 0.5) * 6, a.x + Math.cos(t) * 5, y + Math.sin(t) * 5); g.quadraticCurveTo(a.x + Math.cos(t + 0.5) * 6, y + Math.sin(t + 0.5) * 6, a.x, y); } g.fill(); }
    g.restore();
  }

  // ---------- 頭（別の紙に描いて、目と口を切り抜いてから貼る） ----------
  // 頭の座標：頭の中心が原点、右（前）向き。r＝頭の半径
  function headShape(ch) {
    const r = ch.J.headR, s = ch.head || 'round', p = new Path2D();
    if (s === 'round') p.arc(0, 0, r, 0, TAU);
    else if (s === 'oval') p.ellipse(0, 0, r * 0.92, r * 1.08, 0, 0, TAU);
    else if (s === 'wide') p.ellipse(0, 0, r * 1.08, r * 0.94, 0, 0, TAU);
    else if (s === 'egg') spline([{ x: r * 0.95, y: -r * 0.1 }, { x: r * 0.55, y: r * 0.85 }, { x: -r * 0.3, y: r * 0.95 }, { x: -r * 0.95, y: r * 0.2 }, { x: -r * 0.8, y: -r * 0.75 }, { x: 0, y: -r * 1.08 }, { x: r * 0.75, y: -r * 0.7 }], true, p);
    else if (s === 'square') spline([{ x: r * 0.98, y: -r * 0.2 }, { x: r * 0.9, y: r * 0.7 }, { x: r * 0.2, y: r * 0.98 }, { x: -r * 0.8, y: r * 0.85 }, { x: -r * 1.0, y: 0 }, { x: -r * 0.85, y: -r * 0.85 }, { x: 0, y: -r * 1.0 }, { x: r * 0.85, y: -r * 0.85 }], true, p);
    const n0 = ch.nose || 'button', n = SIL ? ({ hook: 'straight', long: 'straight', round: 'button' }[n0] || n0) : n0, np = new Path2D();   // 鼻（横顔の目印）。影絵では誇張しない
    if (n === 'button') np.arc(r * 0.97, r * 0.08, r * 0.17, 0, TAU);
    else if (n === 'long') spline([{ x: r * 0.82, y: -r * 0.14 }, { x: r * 1.32, y: r * 0.2 }, { x: r * 1.18, y: r * 0.3 }, { x: r * 0.86, y: r * 0.3 }], true, np);
    else if (n === 'round') np.arc(r * 1.0, r * 0.12, r * 0.22, 0, TAU);
    else if (n === 'straight') spline([{ x: r * 0.84, y: -r * 0.2 }, { x: r * 1.1, y: r * 0.12 }, { x: r * 0.88, y: r * 0.22 }], true, np);
    else if (n === 'up') spline([{ x: r * 0.84, y: -r * 0.05 }, { x: r * 1.16, y: r * 0.08 }, { x: r * 1.12, y: r * 0.24 }, { x: r * 0.86, y: r * 0.26 }], true, np);
    else if (n === 'hook') spline([{ x: r * 0.8, y: -r * 0.22 }, { x: r * 1.25, y: r * 0.05 }, { x: r * 1.2, y: r * 0.36 }, { x: r * 0.9, y: r * 0.3 }], true, np);
    return { head: p, nose: np };
  }
  const HEADC = document.createElement('canvas'), hg = HEADC.getContext('2d');
  // ---------- 空顔（見本D）：皮影の善い役の顔の作り ----------
  // 顔の面は透かし彫り（淡い膜）で、横顔の輪郭の線だけを残す。顔の色は、その場の光の色になる
  // 目・眉・耳は細い暗い線で彫る（白い穴にしない）。歌って開いた口は、輪郭の線が口の所で少し開く（あごが下がる）
  // 頭の形は人ごとに少しだけ違う（額・鼻・あご）。誇張しない
  const FACEF = '#fff0dc', WHITEH = '#e4dcee';
  // 点の列の続きを、なめらかな曲線で足す（今の点＝pts[0] から）
  function crTo(path, pts) {
    const n = pts.length, at = (i) => pts[clamp(i, 0, n - 1)];
    for (let i = 0; i < n - 1; i++) { const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      path.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y); }
  }
  function profileOf(r, F, m, smile) {
    const nose = F.nose ?? 0.1, brow = F.brow ?? 0, chin = F.chin ?? 0, round = F.round ?? 1, P = (x, y) => ({ x: x * r, y: y * r });
    const jaw = m * 0.26, piv = P(-0.05, 0.28);
    const rj = (q) => { const dx = q.x - piv.x, dy = q.y - piv.y, c = Math.cos(jaw), s = Math.sin(jaw); return { x: piv.x + dx * c - dy * s, y: piv.y + dx * s + dy * c }; };
    const back = P(-0.3, 0.99);
    // 鼻の下からあごまでは、ゆるく後ろへ下がる一本の線（唇のふくらみを作らない）
    const up = [back, P(-0.74 * round, 0.6), P(-0.99 * round, 0.0), P(-0.64 * round, -0.8), P(0.04, -1.02), P(0.6, -0.8), P(0.86 + brow, -0.44), P(0.9 + brow, -0.24), P(0.86, -0.1),
      P(0.87 + nose * 0.6, 0.0), P(0.88 + nose, 0.12), P(0.86, 0.23), P(0.84, 0.3)];
    const lipU = P(0.845, 0.37), corner = P(lerp(0.75, 0.68, m), lerp(0.4 - 0.02 * smile, 0.45, m)), lipL = rj(P(0.84, lerp(0.42, 0.47, m)));
    const low = [lipL, rj(P(0.82 + chin, 0.62)), rj(P(0.62 + chin * 0.5, 0.84)), rj(P(0.28, 0.86)), P(0.22, 1.0)];
    const contour = new Path2D(); contour.moveTo(up[0].x, up[0].y); crTo(contour, up); contour.lineTo(lipU.x, lipU.y); contour.lineTo(corner.x, corner.y); contour.lineTo(lipL.x, lipL.y); crTo(contour, low);
    const fill = new Path2D(); fill.moveTo(up[0].x, up[0].y); crTo(fill, up); fill.lineTo(lipU.x, lipU.y); fill.lineTo(corner.x, corner.y); fill.lineTo(lipL.x, lipL.y); crTo(fill, low); fill.lineTo(back.x, back.y); fill.closePath();
    return { contour, fill, piv, jaw };
  }
  function drawHeadOpen(g, ch, P, p, v) {
    const cv = g.canvas;
    if (HEADC.width < cv.width || HEADC.height < cv.height) { HEADC.width = Math.max(HEADC.width, cv.width); HEADC.height = Math.max(HEADC.height, cv.height); }
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = 'source-over'; hg.clearRect(0, 0, cv.width, cv.height);
    hg.setTransform(g.getTransform());
    const r = ch.J.headR, b = ch.J.band, h = P.head, fl = p.headFlip ? -1 : 1, m = clamp(p.mouth || 0, 0, 1), F = ch.prof || {};
    hg.save(); hg.translate(h.x, h.y); hg.rotate(P.headA); hg.scale(fl, 1); hg.lineCap = 'round'; hg.lineJoin = 'round';
    const pr = profileOf(r, F, m, p.smile ?? 1);
    hg.fillStyle = dk(FACEF); hg.fill(pr.fill);                                     // 空顔：淡い膜
    hg.strokeStyle = LEA; hg.lineWidth = b * 1.15; hg.stroke(pr.contour);           // 横顔の輪郭
    hg.lineWidth = b * 0.42; hg.beginPath(); hg.arc(-r * 0.1, r * 0.06, r * 0.13, -1.25, 1.35); hg.stroke();   // 耳
    // 目：細い線のアーモンド形と、小さな瞳。まばたきは線が閉じる
    const eo = clamp(1 - (p.blink || 0), 0.05, 1), ex = r * 0.5, ey = -r * 0.14;
    // 目：上まぶたの細い弧と、小さな丸い瞳（目を細い切れ長の形にしない）。まばたきは弧だけ
    hg.lineWidth = b * 0.5; hg.beginPath(); hg.moveTo(ex - r * 0.11, ey + r * 0.02); hg.quadraticCurveTo(ex, ey - r * 0.09, ex + r * 0.11, ey + r * 0.02); hg.stroke();
    if (eo > 0.4) { hg.fillStyle = LEA; hg.beginPath(); hg.arc(ex + r * (0.02 + 0.04 * (p.look || 0)), ey + r * 0.035 + r * 0.03 * (p.lookY || 0), r * 0.055, 0, TAU); hg.fill(); }
    // 眉：細い線
    hg.lineWidth = b * 0.48 * (ch.brow ? Math.min(1.3, ch.brow) : 1); hg.beginPath(); hg.moveTo(r * 0.3, -r * 0.36); hg.quadraticCurveTo(r * 0.48, -r * 0.46 - (p.browUp || 0) * r * 0.1, r * 0.68, -r * 0.37); hg.stroke();
    if (ch.glasses) { hg.lineWidth = b * 0.5; hg.beginPath(); hg.arc(ex, ey + r * 0.01, r * 0.23, 0, TAU); hg.stroke(); hg.beginPath(); hg.moveTo(ex - r * 0.23, ey); hg.lineTo(-r * 0.02, -r * 0.02); hg.stroke(); }
    // 髪・頭巾（濃い影。白髪と頭巾は色の膜）
    FORCE = ch.hairFilm ? null : ch.whiteHair ? WHITEH : LEA;
    const hb = ch.hairBackOpen || ch.hairBack; if (hb) hb(hg, r, b, p, v);
    // ひげ：あごと一緒に動く
    FORCE = ch.whiteHair ? WHITEH : LEA;
    const bd = ch.beardOpen || ch.beard; if (bd) { hg.save(); hg.translate(pr.piv.x, pr.piv.y); hg.rotate(pr.jaw); hg.translate(-pr.piv.x, -pr.piv.y); bd(hg, r, b, p, v); hg.restore(); }
    FORCE = ch.whiteHair ? WHITEH : LEA;
    if (ch.hairFront) ch.hairFront(hg, r, b, p, v);
    FORCE = null;
    if (ch.hat) ch.hat(hg, r, b, p, v);
    if (ch.headTop) ch.headTop(hg, r, b, p, v);
    hg.restore();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(HEADC, 0, 0); g.restore();
  }

  function drawHead(g, ch, P, p, v) {
    if (SIL && OPENF) return drawHeadOpen(g, ch, P, p, v);
    // 頭の紙：本体と同じ大きさで、本体と同じ変換で描く（目と口の穴は、頭の紙だけを抜く）
    const cv = g.canvas;
    if (HEADC.width < cv.width || HEADC.height < cv.height) { HEADC.width = Math.max(HEADC.width, cv.width); HEADC.height = Math.max(HEADC.height, cv.height); }
    hg.setTransform(1, 0, 0, 1, 0, 0); hg.globalCompositeOperation = 'source-over'; hg.clearRect(0, 0, cv.width, cv.height);
    hg.setTransform(g.getTransform());
    const r = ch.J.headR, b = ch.J.band, h = P.head, fl = p.headFlip ? -1 : 1;
    hg.save(); hg.translate(h.x, h.y); hg.rotate(P.headA); hg.scale(fl, 1);
    hg.lineCap = 'round'; hg.lineJoin = 'round';
    const { head, nose } = headShape(ch);
    if (SIL) FORCE = LEA;
    if (ch.hairBack) ch.hairBack(hg, r, b, p, v);               // 後ろ髪・お団子・ベール（頭より奥）
    FORCE = null;
    // 頭と鼻は1枚の切り抜き：縁を2倍の太さで描いてから両方を塗ると、外側の縁だけが残る
    hg.strokeStyle = LEA; hg.lineWidth = b * 2; hg.stroke(head); hg.stroke(nose);
    hg.fillStyle = SIL ? LEA : ch.skin; hg.fill(head); hg.fill(nose);
    // 耳（革。中の線は切り抜き）
    if (!SIL) piece(hg, ell(-r * 0.12, r * 0.08, r * 0.17, r * 0.22), ch.skin, b * 0.8);
    // ほお（紅の膜を小さく）
    if (!SIL) hg.fillStyle = ch.cheek ? ch.cheek.replace(/[\d.]+\)$/, '.85)') : 'rgba(255,120,150,.85)'; hg.beginPath(); hg.ellipse(r * 0.44, r * 0.34, r * 0.15, r * 0.1, 0, 0, TAU); hg.fill();
    if (SIL) FORCE = LEA;
    if (ch.beard) ch.beard(hg, r, b, p, v);
    if (ch.hairFront) ch.hairFront(hg, r, b, p, v);             // 前髪・帽子の下の髪
    FORCE = null;
    // 切り抜き（後ろの光が抜ける）：目・眉・口・耳の線
    const eo = clamp(1 - (p.blink || 0), 0.08, 1), ex = r * 0.44, ey = -r * 0.14, m = clamp(p.mouth || 0, 0, 1), mx = r * 0.66, my = r * 0.46, sm = p.smile ?? 1;
    hg.globalCompositeOperation = 'destination-out';
    if (ch.glasses) hg.fill(circ(ex, ey, r * 0.24));
    else hg.fill(ell(ex, ey, r * 0.17, r * 0.115 * eo, -0.08));
    hg.lineWidth = b * 0.55 * (ch.brow || 1); hg.beginPath(); hg.moveTo(r * 0.24, -r * (ch.glasses ? 0.46 : 0.38)); hg.quadraticCurveTo(r * 0.44, -r * (ch.glasses ? 0.58 : 0.5) - (p.browUp || 0) * r * 0.12, r * 0.64, -r * (ch.glasses ? 0.44 : 0.36)); hg.stroke();
    if (m >= 0.12) hg.fill(ell(mx, my, r * (0.11 + 0.05 * m), r * (0.05 + 0.2 * m), 0.12));
    else { hg.lineWidth = b * 0.6; hg.beginPath(); hg.moveTo(mx - r * 0.14, my - r * 0.04 * sm); hg.quadraticCurveTo(mx, my + r * 0.07 * sm, mx + r * 0.13, my - r * 0.06); hg.stroke(); }
    hg.lineWidth = b * 0.45; hg.beginPath(); hg.arc(-r * 0.12, r * 0.08, r * 0.08, -1.2, 1.4); hg.stroke();
    // 皮影の顔の彫り：ひたいから鼻すじへ、横顔の線の内側に細い光の筋
    if (!SIL) { hg.lineWidth = b * 0.35; hg.beginPath(); hg.arc(0, 0, r * 0.84, -1.05, -0.28); hg.stroke(); }
    hg.globalCompositeOperation = 'source-over';
    // 瞳（目の穴の中の点。look で前後へ）と眼鏡のふち（金の膜）
    if (ch.glasses) { hg.strokeStyle = LEA; hg.lineWidth = b * 1.3; hg.beginPath(); hg.arc(ex, ey, r * 0.26, 0, TAU); hg.stroke(); hg.strokeStyle = '#ffd25a'; hg.lineWidth = b * 0.6; hg.stroke();
      hg.strokeStyle = LEA; hg.lineWidth = b * 0.8; hg.beginPath(); hg.moveTo(ex + r * 0.26, ey); hg.lineTo(r * 0.9, ey + r * 0.04); hg.moveTo(ex - r * 0.26, ey); hg.lineTo(-r * 0.05, -r * 0.05); hg.stroke(); }
    if (eo > 0.4) { hg.fillStyle = LEA; hg.beginPath(); hg.arc(ex + r * (0.05 + 0.06 * (p.look || 0)), ey + r * 0.01 + r * 0.04 * (p.lookY || 0), r * (ch.glasses ? 0.08 : 0.065), 0, TAU); hg.fill(); }
    if (ch.hat) ch.hat(hg, r, b, p, v);                         // 帽子は顔の切り抜きより手前
    if (ch.headTop) ch.headTop(hg, r, b, p, v);                 // ぼんぼり・飾り
    hg.restore();
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(HEADC, 0, 0); g.restore();
  }

  // ---------- 人形を描く（右向き。左向きは呼ぶ側で裏返す） ----------
  // o.v＝切り口の揺れの種類（0〜2）
  function draw(g, ch, p0, o = {}) { SIL = !!o.sil; FILMK = o.filmK ?? 0.66; OPENF = !!o.openFace; try { return draw0(g, ch, p0, o); } finally { OPENF = false; SIL = false; FORCE = null; } }
  function draw0(g, ch, p0, o) {
    const p = Object.assign({}, REST, p0), P = fk(ch, p), J = ch.J, b = J.band, v = o.v || 0;
    g.lineCap = 'round'; g.lineJoin = 'round';
    // 1) 奥の腕（肩ごと胴・頭・帽子の後ろ）と、奥の手の物
    arm(g, ch, P, 'F', ch.sleeve || ch.robe);
    if (ch.itemF) ch.itemF(g, ch, P, p, v);
    // 2) 脚（奥 → 手前）。衣のすそが上を隠す
    leg(g, ch, P, 'F'); leg(g, ch, P, 'N');
    // 3) 背中の物（肩かけの後ろの端・マフラーの端）
    if (ch.back) ch.back(g, ch, P, p, v);
    // 4) 胴（衣）
    const bp = bodyPath(ch, P, p, v);
    piece(g, bp.path, ch.robe, b);
    carve(g, ch, bp, b);
    if (ch.robeDeco) ch.robeDeco(g, ch, P, p, v, bp);
    // 5) 胸の前の物（肩かけ・えり・前かけ・蝶ネクタイ）
    if (ch.front) ch.front(g, ch, P, p, v, bp);
    // 6) 両手で抱える物（赤ちゃん）：胴の手前・手前の腕の奥
    if (ch.held) ch.held(g, ch, P, p, v);
    // 7) 頭
    drawHead(g, ch, P, p, v);
    // 8) 手前の腕（顔・帽子・持ち物より手前）と、手前の手の物
    arm(g, ch, P, 'N', ch.sleeve || ch.robe);
    if (ch.itemN) ch.itemN(g, ch, P, p, v);
    return P;
  }

  // ---------- 10人（一人ずつ違う姿） ----------
  const J = (o) => Object.assign({}, BASE, o);
  const RAINBOW = ['#ff3d5a', '#ff9a2e', '#ffd84a', '#4fd27a', '#3d9bff', '#a066ff'];
  const stripeBand = (g, pts, w, cols, b) => {   // 縞の帯（肩かけ・マフラー）：革で太く → 縞を1本ずつ
    g.lineCap = 'butt'; g.lineJoin = 'round';
    g.strokeStyle = LEA; g.lineWidth = w + b * 2; line(g, pts); g.stroke();
    const n = cols.length, wi = w / n;
    for (let i = 0; i < n; i++) {
      const off = -w / 2 + wi * (i + 0.5), q = pts.map((pt, j) => { const a = pts[Math.max(0, j - 1)], c = pts[Math.min(pts.length - 1, j + 1)], dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 1; return { x: pt.x - dy / d * off, y: pt.y + dx / d * off }; });
      g.strokeStyle = cols[i]; g.lineWidth = wi - 1.1; line(g, q); g.stroke();
    }
    g.lineCap = 'round';
  };
  const along = (bp, i0, i1, k) => lp(bp.pts[i0], bp.pts[i1], k);
  const CAST = {};

  // 指揮者：大きな陽気な男性・ひげ・紫のローブに虹色の肩かけ。体ごと弾む
  CAST.conductor = { name: '指揮者', J: J({ headR: 27, tl: 66, stand: 70, th: 34, sh: 34, ua: 33, fa: 30, handR: 11, armW: 21, legW: 20, topW: 40, hemW: 70, belly: 18, back: 4, band: 3.4, footL: 27 }),
    head: 'round', nose: 'round', skin: '#6a2e48', cheek: 'rgba(255,120,110,.32)', robe: '#8d58f0', sleeve: '#8d58f0', legs: '#5a3a8a', shoes: '#4a2a3a', cuff: '#ffd84a', brow: 1.2,
    hairBack: (g, r, b) => { piece(g, spline([{ x: -r * 0.2, y: -r * 0.95 }, { x: -r * 0.8, y: -r * 0.78 }, { x: -r * 1.12, y: -r * 0.15 }, { x: -r * 0.92, y: r * 0.5 }, { x: -r * 0.55, y: r * 0.25 }, { x: -r * 0.5, y: -r * 0.4 }]), '#6a3a2a', b); },
    beard: (g, r, b) => { const p = spline([{ x: -r * 0.28, y: r * 0.05 }, { x: r * 0.15, y: r * 0.22 }, { x: r * 0.52, y: r * 0.3 }, { x: r * 0.86, y: r * 0.36 }, { x: r * 0.84, y: r * 0.76 }, { x: r * 0.4, y: r * 1.12 }, { x: -r * 0.1, y: r * 1.0 }, { x: -r * 0.42, y: r * 0.6 }]); piece(g, p, '#94502e', b);
      g.strokeStyle = LEA; g.lineWidth = b * 0.6; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(r * (0.0 + i * 0.2), r * (0.75 - i * 0.04), r * 0.12, 0.3, 2.6); g.stroke(); } },
    front: (g, ch, P, p, v, bp) => { // 虹色の肩かけ：首の前から裾の近くまで、胸の線に沿って
      const q = [along(bp, 11, 0, 0.6), along(bp, 0, 1, 0.55), along(bp, 1, 2, 0.7), along(bp, 2, 3, 0.6), lp(bp.pts[3], bp.pts[4], 0.62)].map((pt, i) => add(pt, R({ x: -9 - i * 2.2, y: 0 }, P.ca)));
      stripeBand(g, q, 19, RAINBOW, ch.J.band);
      const e = q[q.length - 1]; g.strokeStyle = LEA; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(e.x + i * 3.6, e.y + 2); g.lineTo(e.x + i * 3.8, e.y + 9); g.stroke(); } },
    back: (g, ch, P, p, v) => { const N = P.neck, q = [add(N, R({ x: -16, y: 4 }, P.ca)), add(P.chest, R({ x: -36, y: 0 }, P.ca)), add(P.root, { x: -42 + (p.hem || 0) * 0.5, y: 14 })]; stripeBand(g, q, 17, RAINBOW.slice().reverse(), ch.J.band); },
    robeDeco: (g, ch, P, p, v, bp) => { g.strokeStyle = 'rgba(59,30,44,.55)'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { const a = along(bp, 9, 8, 0.2 + i * 0.3), c = lp(bp.pts[7 - i], bp.pts[6 - i] || bp.pts[5], 0.5); g.beginPath(); g.moveTo(a.x + 8 + i * 6, a.y); g.quadraticCurveTo(a.x + 14 + i * 9, (a.y + c.y) / 2, c.x, c.y - 4); g.stroke(); }
      for (let i = 0; i < 7; i++) { const q = lp(bp.pts[4], bp.pts[7], (i + 0.5) / 7); piece(g, circ(q.x, q.y - 9, 3.2), '#ffd84a', 1.6); } } };

  // 双子の男の子A：同じ金色の衣・赤いぼんぼりの帽子。拍ごとに小さく跳ねる
  const twinBody = { J: J({ headR: 21, tl: 34, stand: 38, th: 18, sh: 17, ua: 18, fa: 16, handR: 7.5, armW: 11, legW: 10, footL: 15, footH: 7, topW: 19, hemW: 30, hemY: 15, belly: 3, band: 2.6, neckL: 3, shY: 5 }),
    head: 'round', nose: 'button', skin: '#62304a', robe: '#f6b52e', legs: '#5a6ab8', shoes: '#3b1e2c', cuff: '#fff4dc',
    robeDeco: (g, ch, P, p, v, bp) => { const a = along(bp, 11, 0, 0.5), q = new Path2D(); q.moveTo(a.x - 12, a.y - 1); q.quadraticCurveTo(a.x, a.y + 12, a.x + 13, a.y + 1); q.quadraticCurveTo(a.x, a.y + 5, a.x - 12, a.y - 1); piece(g, q, '#fff4dc', 2); } };
  CAST.twinA = Object.assign({}, twinBody, { name: '双子の男の子（赤い帽子）',
    hairBack: (g, r, b) => piece(g, spline([{ x: -r * 0.3, y: -r * 0.9 }, { x: -r * 1.0, y: -r * 0.4 }, { x: -r * 0.96, y: r * 0.35 }, { x: -r * 0.5, y: r * 0.15 }]), '#2a1a14', b),
    hat: (g, r, b, p) => { const t = p.hat || 0, q = spline([{ x: -r * 1.05, y: -r * 0.3 }, { x: -r * 0.9, y: -r * 0.95 }, { x: -r * 0.1, y: -r * 1.38 - t * 3 }, { x: r * 0.65, y: -r * 1.05 }, { x: r * 0.98, y: -r * 0.38 }, { x: 0, y: -r * 0.5 }]); piece(g, q, '#ff3b4a', b);
      piece(g, spline([{ x: -r * 1.08, y: -r * 0.22 }, { x: -r * 0.2, y: -r * 0.6 }, { x: r * 1.0, y: -r * 0.32 }, { x: r * 0.98, y: -r * 0.52 }, { x: -r * 0.2, y: -r * 0.82 }, { x: -r * 1.1, y: -r * 0.48 }]), '#fff0d8', b * 0.8); },
    headTop: (g, r, b, p) => piece(g, circ(-r * 0.05 + (p.pom || 0) * r * 0.2, -r * 1.42 - (p.hat || 0) * 3, r * 0.26), '#fff6e6', b * 0.8) });
  // 双子の男の子B：同じ衣・緑の耳当て帽子。手拍子が速く、うなずく
  CAST.twinB = Object.assign({}, twinBody, { name: '双子の男の子（緑の帽子）',
    hairFront: (g, r, b) => piece(g, spline([{ x: r * 0.1, y: -r * 0.6 }, { x: r * 0.55, y: -r * 0.48 }, { x: r * 0.42, y: -r * 0.3 }, { x: r * 0.1, y: -r * 0.42 }]), '#2a1a14', b * 0.8),
    hat: (g, r, b, p) => { piece(g, spline([{ x: -r * 1.02, y: -r * 0.1 }, { x: -r * 0.95, y: -r * 0.75 }, { x: -r * 0.1, y: -r * 1.12 }, { x: r * 0.7, y: -r * 0.85 }, { x: r * 0.96, y: -r * 0.42 }, { x: r * 0.1, y: -r * 0.55 }]), '#2fae62', b);
      const sw = (p.flap || 0) * r * 0.15; piece(g, spline([{ x: -r * 0.35, y: -r * 0.2 }, { x: -r * 0.05, y: -r * 0.2 }, { x: r * 0.0 + sw, y: r * 0.55 }, { x: -r * 0.2 + sw, y: r * 0.72 }, { x: -r * 0.4 + sw, y: r * 0.5 }]), '#2fae62', b);
      g.strokeStyle = '#ffe9a0'; g.lineWidth = b * 0.9; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(-r * 0.95, -r * 0.45); g.quadraticCurveTo(-r * 0.1, -r * 0.82, r * 0.82, -r * 0.62); g.stroke(); g.setLineDash([]); },
    headTop: (g, r, b) => piece(g, circ(-r * 0.15, -r * 1.12, r * 0.13), '#ffe066', b * 0.7) });

  // 大きなお団子と眼鏡のおばあさん（アルト）：手拍子が一拍遅れる
  CAST.grandma = { name: 'お団子と眼鏡のおばあさん', J: J({ headR: 25, tl: 50, stand: 50, th: 24, sh: 22, ua: 25, fa: 23, handR: 9, armW: 16, legW: 14, topW: 33, hemW: 58, belly: 11, back: 3, footL: 19, hemY: 6 }),
    head: 'wide', nose: 'round', skin: '#6c3858', cheek: 'rgba(255,120,130,.42)', robe: '#22b2a4', legs: '#2a6a74', shoes: '#3b1e2c', cuff: '#fff7e8', glasses: true,
    hairBack: (g, r, b) => { piece(g, circ(-r * 0.35, -r * 1.18, r * 0.62), '#d8d2ea', b); g.strokeStyle = 'rgba(59,30,44,.6)'; g.lineWidth = b * 0.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(-r * 0.35, -r * 1.18, r * (0.18 + i * 0.14), 0.5 + i, 3.2 + i); g.stroke(); }
      piece(g, spline([{ x: -r * 0.1, y: -r * 1.0 }, { x: -r * 0.9, y: -r * 0.7 }, { x: -r * 1.08, y: r * 0.1 }, { x: -r * 0.7, y: r * 0.45 }, { x: -r * 0.4, y: -r * 0.1 }, { x: r * 0.3, y: -r * 0.65 }]), '#d8d2ea', b); },
    hairFront: (g, r, b) => piece(g, spline([{ x: -r * 0.3, y: -r * 0.98 }, { x: r * 0.55, y: -r * 0.86 }, { x: r * 0.8, y: -r * 0.5 }, { x: r * 0.3, y: -r * 0.62 }, { x: -r * 0.2, y: -r * 0.58 }]), '#d8d2ea', b),
    headTop: (g, r, b) => { g.strokeStyle = LEA; g.lineWidth = b * 0.7; g.beginPath(); g.moveTo(-r * 0.75, -r * 1.55); g.lineTo(-r * 0.05, -r * 0.95); g.stroke(); piece(g, circ(-r * 0.78, -r * 1.58, r * 0.08), '#ff6a8a', b * 0.6); },
    front: (g, ch, P, p, v, bp) => { const a = along(bp, 11, 0, 0.3), q = new Path2D(); q.moveTo(a.x - 22, a.y); for (let i = 0; i <= 6; i++) { const x = a.x - 22 + i * 7.5, y = a.y + 8 + (i % 2 ? 6 : 0); q.lineTo(x, y); } q.lineTo(a.x + 24, a.y - 2); q.closePath(); piece(g, q, '#fff7e8', 2.2);
      g.fillStyle = LEA; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(a.x - 14 + i * 10, a.y + 6, 1.6, 0, TAU); g.fill(); } } };

  // ひげの大きなバス歌手：ゆっくり左右に揺れる
  CAST.bass = { name: 'ひげのバス歌手', J: J({ headR: 24, tl: 66, stand: 78, th: 39, sh: 37, ua: 33, fa: 29, handR: 10.5, armW: 18, legW: 17, topW: 38, hemW: 54, belly: 6, back: 2, footL: 26, band: 3.2 }),
    head: 'oval', nose: 'long', skin: '#542640', cheek: 'rgba(255,110,90,.25)', robe: '#d8344e', legs: '#5a1a2a', shoes: '#3b1e2c', cuff: '#ffcf5a', brow: 1.4,
    hairBack: (g, r, b) => piece(g, spline([{ x: 0, y: -r * 1.08 }, { x: -r * 0.85, y: -r * 0.8 }, { x: -r * 1.02, y: 0 }, { x: -r * 0.7, y: r * 0.3 }, { x: -r * 0.45, y: -r * 0.3 }, { x: r * 0.5, y: -r * 0.85 }]), '#1e1414', b),
    beard: (g, r, b, p) => { const sw = (p.beard || 0) * r * 0.25; const q = spline([{ x: -r * 0.3, y: r * 0.0 }, { x: r * 0.3, y: r * 0.3 }, { x: r * 0.9, y: r * 0.3 }, { x: r * 0.95, y: r * 0.7 }, { x: r * 0.7 + sw, y: r * 1.6 }, { x: r * 0.35 + sw, y: r * 2.2 }, { x: r * 0.05 + sw * 0.6, y: r * 1.55 }, { x: -r * 0.4, y: r * 0.85 }]); piece(g, q, '#4e3c62', b);
      g.strokeStyle = '#9a86c0'; g.lineWidth = b * 0.5; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(r * (0.1 + i * 0.18), r * 0.8); g.quadraticCurveTo(r * (0.2 + i * 0.12) + sw * 0.5, r * 1.3, r * (0.3 + i * 0.05) + sw, r * (1.6 + i * 0.1)); g.stroke(); } },
    robeDeco: (g, ch, P, p, v, bp) => { const q = [along(bp, 3, 4, 0.8), along(bp, 5, 6, 0.5), along(bp, 7, 8, 0.15)].map((x) => add(x, { x: 0, y: -10 })); g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = 12; line(g, q); g.stroke(); g.strokeStyle = '#ffcf5a'; g.lineWidth = 7; g.stroke();
      g.fillStyle = LEA; for (let i = 0; i < 8; i++) { const c = lp(q[0], q[2], (i + 0.5) / 8); g.beginPath(); g.moveTo(c.x - 3, c.y); g.lineTo(c.x, c.y - 3); g.lineTo(c.x + 3, c.y); g.lineTo(c.x, c.y + 3); g.fill(); } } };

  // 修道女：タンバリン（手前の手）
  CAST.nun = { name: 'タンバリンの修道女', J: J({ headR: 23, tl: 56, stand: 64, ua: 28, fa: 26, handR: 8.5, armW: 14, topW: 27, hemW: 46, hemY: 5, back: 2 }),
    head: 'egg', nose: 'up', skin: '#5e305e', robe: '#3d4fae', sleeve: '#3d4fae', legs: '#2a2a5a', shoes: '#3b1e2c', cuff: '#f4f0ff',
    hairBack: (g, r, b, p) => { const sw = (p.veil || 0) * r * 0.3; piece(g, spline([{ x: r * 0.25, y: -r * 1.18 }, { x: -r * 0.7, y: -r * 1.1 }, { x: -r * 1.3 - sw, y: -r * 0.2 }, { x: -r * 1.55 - sw, y: r * 1.4 }, { x: -r * 0.9 - sw * 0.6, y: r * 1.7 }, { x: -r * 0.3, y: r * 1.0 }, { x: r * 0.5, y: -r * 0.2 }]), '#262a66', b);
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = b; g.beginPath(); g.moveTo(-r * 0.6, -r * 0.9); g.quadraticCurveTo(-r * 1.2 - sw, r * 0.2, -r * 1.2 - sw, r * 1.4); g.stroke(); },
    hat: (g, r, b) => { const q = new Path2D(); q.arc(0, 0, r * 1.14, -2.25, 0.62); q.arc(0, 0, r * 0.98, 0.62, -2.25, true); q.closePath(); piece(g, q, '#f4f0ff', b * 0.9);
      const c = new Path2D(); c.moveTo(r * 0.05, r * 0.95); c.quadraticCurveTo(r * 0.55, r * 1.3, r * 0.75, r * 0.85); c.lineTo(r * 0.75, r * 1.2); c.quadraticCurveTo(r * 0.2, r * 1.6, -r * 0.3, r * 1.15); c.closePath(); piece(g, c, '#f4f0ff', b * 0.9); },
    front: (g, ch, P, p, v, bp) => { const a = along(bp, 0, 1, 0.5); g.strokeStyle = LEA; g.lineWidth = 2; g.beginPath(); g.moveTo(a.x - 6, a.y - 6); g.lineTo(a.x - 2, a.y + 30); g.stroke(); piece(g, (() => { const q = new Path2D(); q.moveTo(a.x - 6, a.y + 28); q.lineTo(a.x + 4, a.y + 28); q.moveTo(a.x - 1, a.y + 22); q.lineTo(a.x - 1, a.y + 40); return q; })(), '#ffd84a', 0);
      g.strokeStyle = '#ffd84a'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(a.x - 7, a.y + 28); g.lineTo(a.x + 5, a.y + 28); g.moveTo(a.x - 1, a.y + 21); g.lineTo(a.x - 1, a.y + 40); g.stroke(); },
    itemN: (g, ch, P, p) => { // タンバリン：手前の手に。p.tam＝振り（回り）、p.jing＝鈴の揺れ
      const h = P.handN, a = P.handAN + (p.tam || 0); g.save(); g.translate(h.x, h.y); g.rotate(-a + Math.PI / 2);
      g.translate(0, -15); const ring = new Path2D(); ring.arc(0, 0, 17, 0, TAU); ring.arc(0, 0, 12, 0, TAU, true); piece(g, ell(0, 0, 13, 13), '#fff2c0', 0); piece(g, ring, '#ffcf3a', ch.J.band * 0.8);
      for (let i = 0; i < 5; i++) { const t = i / 5 * TAU + 0.3, j = (p.jing || 0) * (i % 2 ? 1 : -1) * 2; piece(g, ell(Math.cos(t) * 14.5 + j, Math.sin(t) * 14.5, 4.2, 2.4, t), '#ffe98a', 1.4); }
      g.strokeStyle = '#ff5a8a'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 17); g.quadraticCurveTo(6 + (p.jing || 0) * 4, 30, 2, 40); g.stroke(); g.strokeStyle = '#4ad0ff'; g.beginPath(); g.moveTo(3, 16); g.quadraticCurveTo(12 + (p.jing || 0) * 5, 26, 10, 36); g.stroke();
      g.restore(); } };

  // 背の高いやせた青年：長いしまのマフラー。ひざでリズム
  CAST.youth = { name: 'マフラーの青年', J: J({ headR: 22, tl: 64, stand: 84, th: 43, sh: 40, ua: 32, fa: 29, handR: 8.5, armW: 13, legW: 12, topW: 23, hemW: 36, hemY: 30, belly: 0, back: 1, footL: 23 }),
    head: 'oval', nose: 'hook', skin: '#5a3058', robe: '#14a07a', legs: '#2c3c5c', shoes: '#3b1e2c', cuff: '#fff4dc',
    hairBack: (g, r, b) => piece(g, spline([{ x: r * 0.55, y: -r * 0.8 }, { x: r * 0.2, y: -r * 1.25 }, { x: -r * 0.2, y: -r * 1.05 }, { x: -r * 0.55, y: -r * 1.3 }, { x: -r * 0.85, y: -r * 0.8 }, { x: -r * 1.2, y: -r * 0.6 }, { x: -r * 1.0, y: -r * 0.1 }, { x: -r * 0.85, y: r * 0.35 }, { x: -r * 0.4, y: -r * 0.2 }, { x: r * 0.3, y: -r * 0.5 }]), '#8a4a20', b),
    front: (g, ch, P, p, v, bp) => { const N = P.neck, q = [add(N, R({ x: -12, y: -2 }, P.ca)), add(N, R({ x: 12, y: 1 }, P.ca)), add(N, R({ x: 20 + (p.scarf || 0) * 4, y: 36 }, P.ca)), add(N, R({ x: 24 + (p.scarf || 0) * 9, y: 66 }, P.ca))]; stripeBand(g, q, 14, ['#3d7bff', '#f4f0ff', '#3d7bff', '#f4f0ff'], ch.J.band);
      const e = q[3]; g.strokeStyle = LEA; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(e.x + i * 3, e.y + 2); g.lineTo(e.x + i * 3.3 + (p.scarf || 0) * 2, e.y + 10); g.stroke(); } },
    back: (g, ch, P, p) => { const N = P.neck, s = p.scarf || 0, q = [add(N, R({ x: -10, y: 0 }, P.ca)), add(N, R({ x: -30 - s * 10, y: 22 }, P.ca)), add(N, R({ x: -44 - s * 18, y: 54 - s * 6 }, P.ca))]; stripeBand(g, q, 13, ['#f4f0ff', '#3d7bff', '#f4f0ff', '#3d7bff'], ch.J.band); } };

  // 焼き栗売りのおじさん：ハンチング・口ひげ・前かけ。屋台の前
  CAST.vendor = { name: '焼き栗売りのおじさん', J: J({ headR: 25, tl: 58, stand: 62, th: 30, sh: 28, ua: 29, fa: 26, handR: 10, armW: 18, legW: 18, topW: 34, hemW: 44, hemY: 50, belly: 16, back: 3, footL: 24 }),
    head: 'square', nose: 'round', skin: '#6e3446', cheek: 'rgba(255,90,80,.42)', robe: '#a8653a', sleeve: '#a8653a', legs: '#4a4a6a', shoes: '#3b1e2c', cuff: '#e8d8b8',
    hairBack: (g, r, b) => piece(g, spline([{ x: -r * 0.4, y: -r * 0.6 }, { x: -r * 1.02, y: -r * 0.3 }, { x: -r * 0.95, y: r * 0.4 }, { x: -r * 0.6, y: r * 0.2 }]), '#3a2a20', b),
    beard: (g, r, b) => { const q = spline([{ x: r * 0.45, y: r * 0.3 }, { x: r * 0.95, y: r * 0.22 }, { x: r * 1.18, y: r * 0.45 }, { x: r * 0.92, y: r * 0.48 }, { x: r * 0.62, y: r * 0.56 }, { x: r * 0.36, y: r * 0.5 }]); piece(g, q, '#8a5232', b * 0.9); },
    hat: (g, r, b, p) => { g.save(); g.translate(0, -(p.hat || 0) * r * 0.9); g.rotate(-(p.hat || 0) * 0.5);
      piece(g, spline([{ x: -r * 1.05, y: -r * 0.3 }, { x: -r * 0.85, y: -r * 0.95 }, { x: r * 0.1, y: -r * 1.12 }, { x: r * 0.95, y: -r * 0.75 }, { x: r * 1.42, y: -r * 0.55 }, { x: r * 0.95, y: -r * 0.42 }, { x: 0, y: -r * 0.5 }]), '#8a7350', b);
      g.strokeStyle = 'rgba(59,30,44,.5)'; g.lineWidth = b * 0.6; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-r * 0.8 + i * r * 0.4, -r * 0.92 + (i === 0 ? 0.2 * r : 0)); g.lineTo(-r * 0.7 + i * r * 0.42, -r * 0.5); g.stroke(); } g.restore(); },
    front: (g, ch, P, p, v, bp) => { // 前かけ：胸から ひざの上まで
      const f = R({ x: 1, y: 0 }, P.ca), c = along(bp, 1, 2, 0.4), q = spline([add(c, sc(f, -16)), add(c, sc(f, 3)), add(lp(bp.pts[2], bp.pts[3], 0.6), sc(f, 2)), { x: P.root.x + 40 + (p.hem || 0), y: -26 }, { x: P.root.x + 16 + (p.hem || 0), y: -18 }, { x: P.root.x + 4, y: -30 }, add(lp(bp.pts[2], bp.pts[3], 0.5), sc(f, -26))]); piece(g, q, '#f2e4c2', ch.J.band);
      const pk = { x: P.root.x + 20, y: -48 }; piece(g, (() => { const z = new Path2D(); z.moveTo(pk.x - 10, pk.y - 6); z.lineTo(pk.x + 12, pk.y - 7); z.quadraticCurveTo(pk.x + 12, pk.y + 8, pk.x, pk.y + 9); z.quadraticCurveTo(pk.x - 10, pk.y + 8, pk.x - 10, pk.y - 6); z.closePath(); return z; })(), '#e8d0a0', 2);
      const N = P.neck; piece(g, spline([add(N, R({ x: -10, y: 2 }, P.ca)), add(N, R({ x: 14, y: 4 }, P.ca)), add(N, R({ x: 18, y: 16 }, P.ca)), add(N, R({ x: 8, y: 10 }, P.ca))]), '#e83a3a', 2.4); } };

  // 赤ちゃんを抱いたお母さん：ショール。両手で抱えて、ゆらす
  CAST.mother = { name: '赤ちゃんを抱いたお母さん', J: J({ headR: 22, tl: 56, stand: 66, ua: 28, fa: 25, handR: 8, armW: 13, topW: 25, hemW: 48, hemY: 5, back: 2, footL: 20 }),
    head: 'oval', nose: 'button', skin: '#602a50', cheek: 'rgba(255,110,120,.35)', robe: '#a98be8', sleeve: '#e5578a', legs: '#4a3a6a', shoes: '#3b1e2c',
    hairBack: (g, r, b) => piece(g, spline([{ x: r * 0.5, y: -r * 0.95 }, { x: -r * 0.6, y: -r * 1.15 }, { x: -r * 1.25, y: -r * 0.2 }, { x: -r * 1.15, y: r * 0.9 }, { x: -r * 0.6, y: r * 1.2 }, { x: -r * 0.3, y: r * 0.5 }, { x: r * 0.3, y: -r * 0.4 }]), '#e5578a', b),
    hat: (g, r, b) => { const q = new Path2D(); q.arc(0, -r * 0.05, r * 1.12, -2.4, -0.25); q.arc(0, -r * 0.05, r * 0.92, -0.25, -2.4, true); q.closePath(); piece(g, q, '#f07aa2', b * 0.9);
      g.fillStyle = '#ffd84a'; for (let i = 0; i < 5; i++) { const a = -2.2 + i * 0.42; g.beginPath(); g.arc(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02 - r * 0.05, r * 0.05, 0, TAU); g.fill(); } },
    front: (g, ch, P, p, v, bp) => { // ショール：肩から胸と背中へ。ふさ
      const N = P.neck, f = R({ x: 1, y: 0 }, P.ca), q = spline([add(N, R({ x: -22, y: -3 }, P.ca)), add(N, R({ x: 8, y: -3 }, P.ca)), add(N, R({ x: 24, y: 14 }, P.ca)), add(N, R({ x: 20, y: 36 }, P.ca)), add(N, R({ x: -6, y: 44 }, P.ca)), add(N, R({ x: -30, y: 34 }, P.ca))]); piece(g, q, '#e5578a', ch.J.band);
      g.strokeStyle = LEA; g.lineWidth = 1.8; for (let i = 0; i < 9; i++) { const c = lp(add(N, R({ x: 20, y: 36 }, P.ca)), add(N, R({ x: -30, y: 34 }, P.ca)), i / 8); g.beginPath(); g.moveTo(c.x, c.y + 2); g.lineTo(c.x + f.x * 0.5, c.y + 9); g.stroke(); }
      g.fillStyle = '#ffd84a'; for (let i = 0; i < 4; i++) { const c = lp(add(N, R({ x: 18, y: 12 }, P.ca)), add(N, R({ x: -18, y: 30 }, P.ca)), i / 3); g.beginPath(); g.arc(c.x, c.y, 2.6, 0, TAU); g.fill(); } },
    held: (g, ch, P, p) => { // 赤ちゃん：胸の前のおくるみ（奥の手は向こう側、手前の腕が下から抱える）
      const N = P.neck, c = add(N, R({ x: 22, y: 30 }, P.ca)), a = P.ca - 0.5;
      g.save(); g.translate(c.x, c.y); g.rotate(a);
      piece(g, spline([{ x: -26, y: -6 }, { x: -8, y: -18 }, { x: 20, y: -14 }, { x: 30, y: 2 }, { x: 18, y: 15 }, { x: -12, y: 15 }, { x: -28, y: 6 }]), '#86cbf4', 3);
      g.strokeStyle = 'rgba(59,30,44,.55)'; g.lineWidth = 1.6; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-18 + i * 12, -12); g.quadraticCurveTo(-12 + i * 12, 0, -18 + i * 12, 12); g.stroke(); }
      g.fillStyle = '#fff6c8'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(-16 + i * 9, 2 + (i % 2) * 5, 1.8, 0, TAU); g.fill(); }
      piece(g, circ(-26, -16, 11), '#f3c7a8', 2.6);   // 頭
      piece(g, spline([{ x: -38, y: -18 }, { x: -32, y: -30 }, { x: -18, y: -28 }, { x: -14, y: -18 }, { x: -26, y: -22 }]), '#ffd84a', 2.4);   // 毛糸の帽子
      piece(g, circ(-30, -33, 3.6), '#fff6e6', 1.6);
      g.strokeStyle = LEA; g.lineWidth = 1.6; g.beginPath(); g.arc(-22, -16, 2.6, 0.2, 2.9); g.stroke();   // 眠った目
      const w = p.babyHand || 0; if (w > 0.02) { const hx = -10 + 2 * Math.sin(w * 9), hy = -18 - 12 * w; g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = 7.4; g.beginPath(); g.moveTo(-8, -10); g.lineTo(hx, hy); g.stroke(); g.strokeStyle = '#86cbf4'; g.lineWidth = 4.6; g.stroke(); piece(g, circ(hx, hy - 2, 3.6), '#f3c7a8', 1.6); }
      g.restore(); } };

  // 杖と帽子のおじいさん：山高帽・黄土色の外套・蝶ネクタイ。はじめは腕を組んでいる
  CAST.oldman = { name: '杖と帽子のおじいさん', J: J({ headR: 23, tl: 54, stand: 62, th: 31, sh: 29, ua: 28, fa: 26, handR: 8.5, armW: 14, legW: 13, topW: 26, hemW: 34, hemY: 30, belly: 2, back: 6, footL: 23 }),
    head: 'egg', nose: 'hook', skin: '#683a52', cheek: 'rgba(255,120,120,.36)', robe: '#d9a03a', sleeve: '#d9a03a', legs: '#5a5a72', shoes: '#3b1e2c', cuff: '#f4ead0', brow: 1.7,
    hairBack: (g, r, b) => piece(g, spline([{ x: -r * 0.55, y: -r * 0.35 }, { x: -r * 1.06, y: -r * 0.05 }, { x: -r * 0.98, y: r * 0.5 }, { x: -r * 0.62, y: r * 0.45 }, { x: -r * 0.5, y: r * 0.1 }]), '#f4f0f8', b),
    beard: (g, r, b) => { piece(g, spline([{ x: r * 0.45, y: r * 0.62 }, { x: r * 0.8, y: r * 0.62 }, { x: r * 0.72, y: r * 1.12 }, { x: r * 0.5, y: r * 1.25 }, { x: r * 0.38, y: r * 0.95 }]), '#f4f0f8', b * 0.9);
      piece(g, spline([{ x: r * 0.5, y: r * 0.32 }, { x: r * 1.02, y: r * 0.3 }, { x: r * 0.98, y: r * 0.44 }, { x: r * 0.6, y: r * 0.46 }]), '#f4f0f8', b * 0.8); },
    hat: (g, r, b, p) => { g.save(); g.translate(0, -(p.hat || 0) * r * 0.6); g.rotate(-(p.hat || 0) * 0.3);
      piece(g, spline([{ x: -r * 0.85, y: -r * 0.62 }, { x: -r * 0.75, y: -r * 1.3 }, { x: 0, y: -r * 1.62 }, { x: r * 0.72, y: -r * 1.32 }, { x: r * 0.82, y: -r * 0.66 }]), '#2f7a52', b);
      piece(g, spline([{ x: -r * 1.2, y: -r * 0.52 }, { x: 0, y: -r * 0.74 }, { x: r * 1.22, y: -r * 0.54 }, { x: r * 1.3, y: -r * 0.66 }, { x: 0, y: -r * 0.88 }, { x: -r * 1.28, y: -r * 0.66 }]), '#2f7a52', b);
      g.lineCap = 'butt'; g.strokeStyle = LEA; g.lineWidth = r * 0.24; g.beginPath(); g.moveTo(-r * 0.8, -r * 0.82); g.quadraticCurveTo(0, -r * 0.94, r * 0.82, -r * 0.84); g.stroke(); g.strokeStyle = '#ff4a5a'; g.lineWidth = r * 0.14; g.stroke(); g.lineCap = 'round';
      g.restore(); },
    front: (g, ch, P, p, v, bp) => { const f = R({ x: 1, y: 0 }, P.ca);
      g.strokeStyle = LEA; g.lineWidth = 2.2; g.beginPath(); const a = along(bp, 11, 0, 0.6), c = along(bp, 2, 3, 0.4); g.moveTo(a.x, a.y + 2); g.quadraticCurveTo(c.x - 4, (a.y + c.y) / 2, c.x - 10 * f.x, c.y); g.stroke();
      for (let i = 0; i < 4; i++) { const q = lp(along(bp, 1, 2, 0.4), along(bp, 3, 4, 0.5), i / 3); piece(g, circ(q.x - 6, q.y, 2.8), '#ffd84a', 1.4); }
      const N = P.neck, bw = add(N, R({ x: 12, y: 3 }, P.ca)); piece(g, spline([{ x: bw.x - 8, y: bw.y - 6 }, { x: bw.x, y: bw.y }, { x: bw.x - 8, y: bw.y + 6 }]), '#ff3b4a', 1.8); piece(g, spline([{ x: bw.x + 8, y: bw.y - 6 }, { x: bw.x, y: bw.y }, { x: bw.x + 8, y: bw.y + 6 }]), '#ff3b4a', 1.8); piece(g, circ(bw.x, bw.y, 2.4), '#ff3b4a', 1.4); },
    itemN: (g, ch, P, p) => { // 杖：手前の手に。p.cane＝手の中の回り（0＝先が下）。p.caneHook＝腕にかけている（0〜1）
      const h = P.handN, ang = p.cane || 0, hook = p.caneHook || 0;
      let base = h, a = ang;
      if (hook > 0) { const [, el, wr] = P.armN; base = lp(lp(el, wr, 0.45), h, 1 - hook); a = lerp(ang, -0.18, hook); }
      g.save(); g.translate(base.x, base.y); g.rotate(-a); g.translate(0, -36 * (p.caneMid || 0));   // 回す時は杖のまん中を持つ（バトンのように）
      g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = 7.2; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 74); g.stroke(); g.strokeStyle = '#8a5a34'; g.lineWidth = 3.6; g.stroke();
      g.strokeStyle = LEA; g.lineWidth = 7.2; g.beginPath(); g.moveTo(0, 0); g.arc(-7, 0, 7, 0, Math.PI, true); g.stroke(); g.strokeStyle = '#8a5a34'; g.lineWidth = 3.6; g.stroke();
      g.strokeStyle = '#ffd84a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 10); g.lineTo(0, 15); g.stroke(); g.restore(); } };
  const lerp = (a, b, u) => a + (b - a) * u;

  // ---------- 部品の組み合わせ（同じ姿が2人いないかを機械で数える） ----------
  const PARTS = {
    conductor: { 背丈: '大', 体つき: '太い', 頭: 'round', 鼻: 'round', 髪: '後ろの巻き毛', 帽子: 'なし', ひげ: '丸いあごひげ', 眼鏡: 'なし', 衣: '長い衣＋虹の肩かけ', 膜の色: '紫', 持ち物: 'なし', 揺れ方: '体ごと弾む・指揮' },
    twinA: { 背丈: '子', 体つき: '子', 頭: 'round', 鼻: 'button', 髪: '短い', 帽子: '赤いぼんぼり帽', ひげ: 'なし', 眼鏡: 'なし', 衣: '短い衣（双子でそろい）', 膜の色: '金', 持ち物: 'なし', 揺れ方: '拍で跳ねる' },
    twinB: { 背丈: '子', 体つき: '子', 頭: 'round', 鼻: 'button', 髪: '前髪', 帽子: '緑の耳当て帽', ひげ: 'なし', 眼鏡: 'なし', 衣: '短い衣（双子でそろい）', 膜の色: '金', 持ち物: 'なし', 揺れ方: '速い手拍子・うなずき' },
    grandma: { 背丈: '低', 体つき: 'ふくよか', 頭: 'wide', 鼻: 'round', 髪: '大きなお団子', 帽子: 'なし', ひげ: 'なし', 眼鏡: '丸眼鏡', 衣: '長い衣＋レースのえり', 膜の色: '青緑', 持ち物: 'なし', 揺れ方: '手拍子が一拍遅れる' },
    bass: { 背丈: '高', 体つき: '肩幅', 頭: 'oval', 鼻: 'long', 髪: '短い黒髪', 帽子: 'なし', ひげ: '長いひげ', 眼鏡: 'なし', 衣: '長い衣＋金の帯', 膜の色: '赤', 持ち物: 'なし', 揺れ方: 'ゆっくり左右' },
    nun: { 背丈: '中', 体つき: '細め', 頭: 'egg', 鼻: 'up', 髪: 'ベール', 帽子: '白い頭巾', ひげ: 'なし', 眼鏡: 'なし', 衣: '修道服＋十字', 膜の色: '藍', 持ち物: 'タンバリン', 揺れ方: 'タンバリンを振る' },
    youth: { 背丈: '高', 体つき: '細い', 頭: 'oval', 鼻: 'hook', 髪: 'ぼさぼさ', 帽子: 'なし', ひげ: 'なし', 眼鏡: 'なし', 衣: 'ひざ丈の衣＋しまのマフラー', 膜の色: '緑', 持ち物: 'なし', 揺れ方: 'ひざでリズム' },
    vendor: { 背丈: '中', 体つき: '太い', 頭: 'square', 鼻: 'round', 髪: '短い', 帽子: 'ハンチング', ひげ: '口ひげ', 眼鏡: 'なし', 衣: '上着＋前かけ', 膜の色: '茶', 持ち物: '屋台', 揺れ方: '手を温める→帽子を振る' },
    mother: { 背丈: '中', 体つき: '細め', 頭: 'oval', 鼻: 'button', 髪: 'ショール', 帽子: 'ショール', ひげ: 'なし', 眼鏡: 'なし', 衣: 'ドレス＋ショール', 膜の色: '薄紫と桃', 持ち物: '赤ちゃん', 揺れ方: '赤ちゃんをゆらす' },
    oldman: { 背丈: '中', 体つき: '細い・猫背', 頭: 'egg', 鼻: 'hook', 髪: '白いはげ', 帽子: '山高帽', ひげ: '白い口ひげ・あごひげ', 眼鏡: 'なし', 衣: '外套＋蝶ネクタイ', 膜の色: '黄土', 持ち物: '杖', 揺れ方: '腕組み→杖を回して踊る' },
  };
  for (const k in CAST) CAST[k].id = k;
  // 空顔の横顔（見本D）：額・鼻・あごを人ごとに少しだけ変える（誇張しない）。白髪の人は髪とひげを淡い膜に。頭巾は色の膜のまま
  const PROF = { conductor: { nose: 0.08, round: 1.04, chin: 0.02 }, twinA: { nose: 0.05, chin: -0.06 }, twinB: { nose: 0.04, chin: -0.05, brow: -0.02 },
    grandma: { nose: 0.09, chin: -0.04 }, bass: { nose: 0.12, chin: 0.02 }, nun: { nose: 0.07 }, youth: { nose: 0.12, brow: 0.03, chin: 0.04 },
    vendor: { nose: 0.1, chin: 0.03 }, mother: { nose: 0.07, chin: 0.01 }, oldman: { nose: 0.13, brow: 0.04, chin: -0.02 } };
  for (const k in PROF) CAST[k].prof = PROF[k];
  CAST.grandma.whiteHair = true; CAST.oldman.whiteHair = true; CAST.mother.hairFilm = true;
  // 空顔のひげは、口より下（あごから垂れる）。口の開きが見えるように
  CAST.conductor.beardOpen = (g, r, b) => { const q = spline([{ x: -r * 0.22, y: r * 0.52 }, { x: r * 0.2, y: r * 0.66 }, { x: r * 0.62, y: r * 0.62 }, { x: r * 0.9, y: r * 0.7 }, { x: r * 0.86, y: r * 0.98 }, { x: r * 0.52, y: r * 1.2 }, { x: r * 0.08, y: r * 1.12 }, { x: -r * 0.26, y: r * 0.84 }]); piece(g, q, '#000', 0);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = b * 0.4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(r * (0.05 + i * 0.2), r * 0.8); g.quadraticCurveTo(r * (0.1 + i * 0.2), r * 0.95, r * (0.06 + i * 0.18), r * 1.08); g.stroke(); } g.restore(); };
  // おじいさん：白髪は後ろ頭にそった細い房（耳に見えないように）。口ひげは鼻の下に小さく、あごひげは短く
  CAST.oldman.hairBackOpen = (g, r, b) => piece(g, spline([{ x: -r * 0.62, y: -r * 0.5 }, { x: -r * 0.96, y: -r * 0.22 }, { x: -r * 1.02, y: r * 0.22 }, { x: -r * 0.86, y: r * 0.5 }, { x: -r * 0.8, y: r * 0.28 }, { x: -r * 0.84, y: -r * 0.05 }, { x: -r * 0.7, y: -r * 0.32 }]), '#fff', b * 0.8);
  CAST.oldman.beardOpen = (g, r, b) => { piece(g, spline([{ x: r * 0.5, y: r * 0.3 }, { x: r * 0.84, y: r * 0.28 }, { x: r * 0.86, y: r * 0.36 }, { x: r * 0.56, y: r * 0.38 }]), '#fff', b * 0.7);
    piece(g, spline([{ x: r * 0.5, y: r * 0.6 }, { x: r * 0.8, y: r * 0.6 }, { x: r * 0.72, y: r * 0.95 }, { x: r * 0.56, y: r * 1.05 }, { x: r * 0.44, y: r * 0.82 }]), '#fff', b * 0.8); };
  CAST.vendor.beardOpen = (g, r, b) => piece(g, spline([{ x: r * 0.5, y: r * 0.3 }, { x: r * 0.86, y: r * 0.27 }, { x: r * 0.9, y: r * 0.36 }, { x: r * 0.7, y: r * 0.4 }, { x: r * 0.52, y: r * 0.38 }]), '#000', b * 0.6);
  CAST.bass.beardOpen = (g, r, b, p) => { const sw = (p.beard || 0) * r * 0.25, q = spline([{ x: -r * 0.2, y: r * 0.56 }, { x: r * 0.3, y: r * 0.68 }, { x: r * 0.78, y: r * 0.6 }, { x: r * 0.95, y: r * 0.74 }, { x: r * 0.72 + sw, y: r * 1.5 }, { x: r * 0.38 + sw, y: r * 2.1 }, { x: r * 0.08 + sw * 0.6, y: r * 1.5 }, { x: -r * 0.3, y: r * 0.92 }]); piece(g, q, '#000', 0);
    g.save(); g.globalCompositeOperation = 'destination-out'; g.lineWidth = b * 0.4; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(r * (0.1 + i * 0.17), r * 0.85); g.quadraticCurveTo(r * (0.2 + i * 0.1) + sw * 0.5, r * 1.3, r * (0.25 + i * 0.05) + sw, r * (1.6 + i * 0.08)); g.stroke(); } g.restore(); };
  // 透かし彫りの模様（人ごとに変える。双子はそろいの衣なので同じ）
  for (const [k, lace, s] of [['conductor', 'cloud', 1.25], ['bass', 'lattice', 1.05], ['grandma', 'flower', 1], ['nun', 'pleat', 1.2], ['youth', 'lattice', 0.7], ['twinA', 'flower', 0.7], ['twinB', 'flower', 0.7], ['vendor', 'pleat', 0.9], ['mother', 'flower', 0.85], ['oldman', 'cloud', 0.8]]) { CAST[k].lace = lace; CAST[k].laceS = s; PARTS[k]['透かし'] = lace + (s < 0.8 ? '（細かい）' : ''); }
  window.KR = { REST, fk, armIK, armTo, armStraight, legIK, draw, CAST, PARTS, LEA, piece, limb, spline, circ, ell, R, U, D, add, lp, sc, line, RAINBOW };
})();
