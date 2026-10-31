// 写し：動画制作ラボ/MV/クリスマス/gospel/全編/kage_doll.js（MV は完成済み・元は書きかえない）。グリーティングカードの絵で、MV の人物をそのまま描くために使う（共通/greet_cards.js が、その絵の時だけ読む）
// ゴスペル全編の人形（window.KD）。見本E（gospel\見本\kage_doll.js）の写しに、町で加わる人たち・座る・ランタン・1・2本目の仲間の小さな影を足した
// 聖歌隊の人形。前の見本（MV/クリスマス見本/gospel.html）の聖歌隊の形が土台
//   丸い頭・肩の角から出る太く丸い腕と丸い手・裾の広がるローブ・胸の菱形の色ガラス・裾からのぞく丸い足
//   一人ずつ違える：頭の大きさと形・背丈・体つき・髪や帽子やひげの影の形・ローブと肩かけの色と模様・顔の膜の色
//   顔と手足は色の透ける膜。琥珀の光の紙の上では、青・緑・桃・藤の膜は くすんだ緑や肌の色に見えたので、レモン〜金〜こがね色の幅で人ごとに変える（灯りのように光る）
//   輪郭は濃い影。顔は点の目とにっこりした口（歌うと小さく開く）
// 向き yaw：0＝こちら（会衆）を向く正面、±1＝横。斜め（3/4）は、顔の目鼻と模様が向く側へ寄り、体の幅が少し細る
// 腕の前後（基準 4章）：正面で何もしていない・両手を上げる・手を振る＝両腕とも付け根から胴と頭の後ろ／胸の前で手拍子・物を抱える＝その腕は胴の前（pose の front）
//   斜めの時：奥の腕はいつも胴の後ろ。手前の腕は胴の前
// ひじは片側にしか曲がらない：手の位置から2本の骨で解く時、ひじが「外・下」の側の解だけを取る（armIK）
// 約束：絵は引数だけで決まる。Math.random は使わない
(() => {
  const TAU = Math.PI * 2, { LEA, spline, circ, ell } = KR;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, u) => a + (b - a) * u;
  let FK = 0.95;   // 膜の明るさ（離れた人形は光を多く遮る）
  // セロハンで描く時（kage_cello.js が入れる）：髪・帽子・ひげ・持ち物の形はそのまま使い、縁の帯を描かずに膜を重ねる
  let FILM = null;
  const dk = (c) => { if (FILM || typeof c !== 'string' || c[0] !== '#' || c === LEA) return c; const n = parseInt(c.slice(1), 16); return `rgb(${((n >> 16) & 255) * FK | 0},${((n >> 8) & 255) * FK | 0},${(n & 255) * FK | 0})`; };
  const piece = (g, path, film, band) => { if (FILM) return FILM.piece(g, path, film); g.fillStyle = dk(film); g.fill(path); if (band > 0) { g.strokeStyle = LEA; g.lineWidth = band; g.lineJoin = 'round'; g.stroke(path); } };
  const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); };
  const rot = (p, o, a) => { const c = Math.cos(a), s = Math.sin(a), dx = p.x - o.x, dy = p.y - o.y; return { x: o.x + dx * c - dy * s, y: o.y + dx * s + dy * c }; };

  // ---------- 骨組み（足もと＝原点、上が −y） ----------
  function geo(d, p) {
    const J = d.J, yw = clamp(p.yaw || 0, -1, 1), bs = 1 - 0.2 * Math.abs(yw), piv = { x: 0, y: -J.footR * 1.2 };
    const y0 = -J.bodyH + (p.hy || 0), hx = p.hx || 0, L = p.lean || 0, T = (q) => rot({ x: q.x * bs + hx, y: q.y }, piv, L);
    const G = { bs, yw, T, y0, hx, L, piv };
    G.neck = T({ x: 0, y: y0 });
    G.head = rot(T({ x: yw * J.R * 0.06, y: y0 - J.R * 0.72 }), G.neck, p.tilt || 0);
    // 肩は頭の下（あごに腕が重ならない高さ）、胴の肩の角の内側
    // 肩の角（胴のふち）から。斜めの時、手前の肩は胴のふちのまま外に残る（体の幅だけが細る）
    for (const [k, s] of [['L', -1], ['R', 1]]) { const nearK = yw < -0.3 ? 'L' : yw > 0.3 ? 'R' : null, x = s * (J.topW + J.armW * 0.12) * (k === nearK ? 1 / Math.max(0.5, bs) : 1); G['sh' + k] = T({ x: x, y: y0 + J.R * 0.28 + J.armW * 0.75 }); }
    return G;
  }
  // 手首の位置（肩からの外向き x・下向き y）から腕を解く。ひじは「外・下」の側
  function armIK(d, G, k, tgt) {
    const J = d.J, S = G['sh' + k], s = k === 'L' ? -1 : 1, T = { x: S.x + s * tgt.x, y: S.y + tgt.y };
    let L1 = J.ua, L2 = J.fa;
    // 体の前で持つ・手拍子の腕は、ひじを横へ張り出さず、こちらへ向かって縮んで見える（腕をほぼ伸ばしたまま短く）
    if (tgt.front) { const want = Math.hypot(T.x - S.x, T.y - S.y) / 0.94, k2 = clamp(want / (L1 + L2), 0.28, 1); L1 *= k2; L2 *= k2; }
    let dx = T.x - S.x, dy = T.y - S.y; const dist = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + 0.5, L1 + L2 - 0.05), dd = Math.hypot(dx, dy) || 1; dx *= dist / dd; dy *= dist / dd;
    const a = Math.acos(clamp((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist), -1, 1)), base = Math.atan2(dy, dx);
    const E1 = { x: S.x + Math.cos(base + a) * L1, y: S.y + Math.sin(base + a) * L1 }, E2 = { x: S.x + Math.cos(base - a) * L1, y: S.y + Math.sin(base - a) * L1 };
    // 外向きの法線（肩→手の線の、体の外側。真横の線なら下）
    let nx = dy, ny = -dx; if (s * nx < 0 || (Math.abs(nx) < 1e-6 && ny < 0)) { nx = -nx; ny = -ny; }
    const sc = (E) => (E.x - S.x) * nx + (E.y - S.y) * ny;
    const E = sc(E1) >= sc(E2) ? E1 : E2, W = { x: S.x + dx, y: S.y + dy };
    return { S, E, W, n: { x: nx, y: ny } };
  }
  // ---------- 描く ----------
  function head(g, d, p, G) {
    const J = d.J, R = J.R, b = J.band, yw = G.yw, h = G.head, fx = yw * R * 0.36, m = clamp(p.mouth || 0, 0, 1);
    g.save(); g.translate(h.x, h.y); g.rotate((p.tilt || 0) + G.L);
    if (d.hairBack) d.hairBack(g, R, b, p, yw);
    const hs = d.head === 'wide' ? [1.1, 0.95] : d.head === 'tall' ? [0.93, 1.08] : [1, 1];
    const hp = ell(0, 0, R * hs[0] * (1 - 0.06 * Math.abs(yw)), R * hs[1]); piece(g, hp, d.face, b * 1.15);
    if (p.back) { if (d.hair && !d.hairFrontOnly) d.hair(g, R, b, p, yw, 0); if (d.hat) d.hat(g, R, b, p, yw, 0); g.restore(); return; }   // 後ろ姿（回る途中・扉へ向かう）：顔の目鼻は見えない（頭は顔と同じ膜のまま。暗い丸で塗りつぶさない）。眉だけの髪（指揮者）も描かない
    // ほお・目・口（向く側へ寄る。奥の目とほおは細く）
    const sq = (side) => 1 - 0.55 * Math.max(0, -side * yw);
    g.fillStyle = dk('#ff8aa6');
    for (const side of [-1, 1]) { g.beginPath(); g.ellipse(fx + side * R * 0.48 * (1 - 0.3 * Math.abs(yw)), R * 0.2, R * 0.1 * sq(side), R * 0.075, 0, 0, TAU); g.fill(); }
    const sh = clamp(p.shout || 0, 0, 1), eo = clamp(1 - Math.max(p.blink || 0, sh > 0.5 ? 1 : 0), 0.12, 1), lk = R * 0.05 * (p.look || 0);
    g.fillStyle = LEA;
    if (eo < 0.2 && sh > 0.5) { g.strokeStyle = LEA; g.lineWidth = b * 0.6; for (const side of [-1, 1]) { const ex = fx + side * R * 0.3 * (1 - 0.25 * Math.abs(yw)); g.beginPath(); g.arc(ex, -R * 0.02, R * 0.1 * sq(side), 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); } }   // ぎゅっとつぶった目（力いっぱい答える時）
    else for (const side of [-1, 1]) { g.beginPath(); g.ellipse(fx + side * R * 0.3 * (1 - 0.25 * Math.abs(yw)) + lk, -R * 0.08, R * 0.075 * sq(side), R * 0.085 * eo, 0, 0, TAU); g.fill(); }
    if (d.glasses === 'square') { g.strokeStyle = LEA; g.lineWidth = b * 0.5; for (const side of [-1, 1]) { const ex = fx + side * R * 0.3 * (1 - 0.25 * Math.abs(yw)); g.strokeRect(ex - R * 0.18 * sq(side), -R * 0.2, R * 0.36 * sq(side), R * 0.24); } g.beginPath(); g.moveTo(fx - R * 0.12, -R * 0.1); g.lineTo(fx + R * 0.12, -R * 0.1); g.stroke(); }
    else if (d.glasses) { g.strokeStyle = LEA; g.lineWidth = b * 0.5; for (const side of [-1, 1]) { g.beginPath(); g.ellipse(fx + side * R * 0.3 * (1 - 0.25 * Math.abs(yw)), -R * 0.08, R * 0.18 * sq(side), R * 0.17, 0, 0, TAU); g.stroke(); } g.beginPath(); g.moveTo(fx - R * 0.12, -R * 0.1); g.lineTo(fx + R * 0.12, -R * 0.1); g.stroke(); }
    if (d.brows) { g.strokeStyle = d.brows; g.lineWidth = b * 1.1; for (const side of [-1, 1]) { const ex = fx + side * R * 0.3 * (1 - 0.25 * Math.abs(yw)); g.beginPath(); g.moveTo(ex - R * 0.14 * sq(side), -R * 0.3 + side * R * 0.02); g.quadraticCurveTo(ex, -R * 0.38, ex + R * 0.14 * sq(side), -R * 0.3 - side * R * 0.02); g.stroke(); } }
    const mx = fx, my = R * 0.32;
    if (d.beard) d.beard(g, R, b, p, yw, fx);
    if (m < 0.1 && sh < 0.05) { g.strokeStyle = LEA; g.lineWidth = b * 0.62; g.beginPath(); g.arc(mx, my - R * 0.13, R * 0.15, 0.24 * Math.PI, 0.76 * Math.PI); g.stroke(); }
    else { const mm = Math.max(m, sh), w = R * (0.11 + 0.05 * mm + 0.07 * sh), dp = R * (0.05 + 0.13 * mm + 0.12 * sh), q = new Path2D(); q.moveTo(mx - w, my - R * 0.02); q.quadraticCurveTo(mx, my + R * 0.02, mx + w, my - R * 0.02); q.quadraticCurveTo(mx + w * 0.95, my + dp * 1.5, mx, my + dp * 1.3); q.quadraticCurveTo(mx - w * 0.95, my + dp * 1.5, mx - w, my - R * 0.02); q.closePath(); g.fillStyle = LEA; g.fill(q); }
    if (d.hair) d.hair(g, R, b, p, yw, fx);
    if (d.hat) d.hat(g, R, b, p, yw, fx);
    g.restore();
  }
  function robePath(d, p, G) {
    const J = d.J, T = G.T, y0 = G.y0, sw = p.hem || 0, tw = J.topW, hw = J.hemW, bl = J.belly || 0, hy = -J.hemUp;
    const pts = [{ x: -tw * 0.5, y: y0 - 1 }, { x: -tw, y: y0 + J.R * 0.32 }, { x: -(tw + (hw - tw) * 0.5 + bl), y: lerp(y0, hy, 0.5) }, { x: -hw + sw, y: hy },
      { x: -hw * 0.5 + sw, y: hy + 2.5 }, { x: sw * 0.8, y: hy + 1 }, { x: hw * 0.5 + sw, y: hy + 2.5 }, { x: hw + sw, y: hy }, { x: tw + (hw - tw) * 0.5 + bl, y: lerp(y0, hy, 0.5) }, { x: tw, y: y0 + J.R * 0.32 }, { x: tw * 0.5, y: y0 - 1 }];
    return spline(pts.map(T));
  }
  function pattern(g, d, p, G) {
    const J = d.J, T = G.T, y0 = G.y0, P = d.pattern || {}, cols = P.cols || ['#ffd84a'], n = P.n || 3, px = G.yw * J.topW * 0.35, top = y0 + J.R * 0.55, bot = -J.hemUp - 8, s = P.size || 1;
    if (P.kind === 'stripes') {   // 反射の帯（作業着）：衣の形の中だけに、横の帯を2本
      g.save(); g.clip(G.robePath); for (const u of [0.42, 0.78]) { const a = T({ x: -J.hemW * 1.2, y: lerp(top, bot, u) }), b2 = T({ x: J.hemW * 1.2, y: lerp(top, bot, u) }); g.strokeStyle = LEA; g.lineWidth = J.R * 0.42; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.stroke(); g.strokeStyle = dk(cols[0]); g.lineWidth = J.R * 0.3; g.stroke(); } g.restore(); return; }
    if (P.kind === 'zip') {   // 前のファスナーと、ポケットのふた2つ
      const a = T({ x: px, y: top - J.R * 0.2 }), b2 = T({ x: px, y: bot }); g.strokeStyle = LEA; g.lineWidth = 4.2; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.stroke(); g.strokeStyle = dk(cols[0]); g.lineWidth = 2; g.stroke();
      for (const side of [-1, 1]) { const c0 = T({ x: px + side * J.topW * 0.62, y: lerp(top, bot, 0.55) }); piece(g, spline([{ x: c0.x - 7, y: c0.y - 3 }, { x: c0.x + 7, y: c0.y - 3 }, { x: c0.x + 6, y: c0.y + 4 }, { x: c0.x - 6, y: c0.y + 4 }]), cols[1] || cols[0], J.band * 0.6); } return; }
    if (P.kind === 'pocket') {   // パーカーの前の大きなポケット
      const c0 = T({ x: px, y: lerp(top, bot, 0.66) }), w = J.topW * 0.85, h = J.R * 0.55; piece(g, spline([{ x: c0.x - w, y: c0.y + h }, { x: c0.x - w * 0.7, y: c0.y - h }, { x: c0.x + w * 0.7, y: c0.y - h }, { x: c0.x + w, y: c0.y + h }]), cols[0], J.band * 0.7); return; }
    for (let i = 0; i < n; i++) {
      const c = T({ x: px, y: lerp(top, bot, (i + 0.5) / n) }), z = (J.topW * 0.36) * s * (P.kind === 'dots' ? 0.55 : 1), col = cols[i % cols.length], q = new Path2D();
      if (P.kind === 'dots') q.arc(c.x, c.y, z * 0.75, 0, TAU);
      else if (P.kind === 'stars') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? z * 0.45 : z; k ? q.lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r) : q.moveTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); } q.closePath(); }
      else if (P.kind === 'toggle') { q.moveTo(c.x - z * 0.9, c.y - z * 0.22); q.lineTo(c.x + z * 0.9, c.y - z * 0.22); q.lineTo(c.x + z * 0.9, c.y + z * 0.22); q.lineTo(c.x - z * 0.9, c.y + z * 0.22); q.closePath(); }
      else if (P.kind === 'moons') { q.arc(c.x, c.y, z * 0.8, 0.6, TAU - 0.6); q.arc(c.x + z * 0.45, c.y - z * 0.1, z * 0.62, TAU - 0.9, 0.9, true); q.closePath(); }
      else if (P.kind === 'hearts') { q.moveTo(c.x, c.y + z * 0.8); q.bezierCurveTo(c.x - z * 1.3, c.y - z * 0.2, c.x - z * 0.5, c.y - z * 1.1, c.x, c.y - z * 0.35); q.bezierCurveTo(c.x + z * 0.5, c.y - z * 1.1, c.x + z * 1.3, c.y - z * 0.2, c.x, c.y + z * 0.8); }
      else { q.moveTo(c.x, c.y - z * 0.75); q.lineTo(c.x + z * (1 - 0.2 * Math.abs(G.yw)), c.y); q.lineTo(c.x, c.y + z * 0.75); q.lineTo(c.x - z * (1 - 0.2 * Math.abs(G.yw)), c.y); q.closePath(); }
      piece(g, q, col, J.band * 0.6);
    }
  }
  function stole(g, d, p, G) {
    if (!d.stole) return; const J = d.J, T = G.T, y0 = G.y0, cols = d.stole, w = J.topW * 0.34, n = cols.length, px = G.yw * J.topW * 0.25;
    for (const side of [-1, 1]) {
      const x0 = px + side * J.topW * 0.5, pts = [T({ x: x0 - side * 2, y: y0 }), T({ x: x0 + side * 1, y: y0 + J.R * 0.6 }), T({ x: x0 + side * 3, y: lerp(y0, -J.hemUp, 0.62) }), T({ x: x0 + side * 4, y: lerp(y0, -J.hemUp, 0.8) })];
      g.lineCap = 'butt'; g.lineJoin = 'round'; g.strokeStyle = LEA; g.lineWidth = w + J.band * 2; line(g, pts); g.stroke();
      for (let i = 0; i < n; i++) { const off = -w / 2 + w / n * (i + 0.5); g.strokeStyle = dk(cols[i]); g.lineWidth = w / n - 0.8; line(g, pts.map((q) => ({ x: q.x + off, y: q.y }))); g.stroke(); }
      const e = pts[3]; g.strokeStyle = LEA; g.lineWidth = 1.6; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(e.x + i * w * 0.18, e.y + 1); g.lineTo(e.x + i * w * 0.2, e.y + 7); g.stroke(); }
      g.lineCap = 'round';
    }
  }
  function arm(g, d, p, G, k) {
    const J = d.J, A = p['arm' + k] || { x: J.ua * 0.2, y: (J.ua + J.fa) * 0.9 }, R = armIK(d, G, k, A);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = LEA; g.lineWidth = J.armW + J.band * 2; line(g, [R.S, R.E, R.W]); g.stroke();
    g.strokeStyle = dk(d.sleeve || d.robe); g.lineWidth = J.armW; line(g, [R.S, R.E, R.W]); g.stroke();
    // 手前の腕は、付け根の丸い縁（衣の内側の分）だけを袖の色で消す＝腕が衣から続いて見える（腕は不透明のまま）
    if (G.front && G.front[k] && G.robePath) { g.save(); g.clip(G.robePath); g.fillStyle = dk(d.sleeve || d.robe); g.beginPath(); g.arc(R.S.x, R.S.y, J.armW / 2 + J.band + 0.5, 0, TAU); g.fill(); g.restore(); }
    // 袖口と、丸い手（指は描かない。親指の小さなふくらみだけ）
    const dx = R.W.x - R.E.x, dy = R.W.y - R.E.y, dd = Math.hypot(dx, dy) || 1, ux = dx / dd, uy = dy / dd, hr = J.handR, hc = { x: R.W.x + ux * hr * 0.55, y: R.W.y + uy * hr * 0.55 }, wav = (A.wave || 0);
    if (d.cuff) { g.lineCap = 'butt'; g.strokeStyle = dk(d.cuff); g.lineWidth = 3.2; g.beginPath(); g.moveTo(R.W.x - uy * J.armW * 0.5 - ux * 2, R.W.y + ux * J.armW * 0.5 - uy * 2); g.lineTo(R.W.x + uy * J.armW * 0.5 - ux * 2, R.W.y - ux * J.armW * 0.5 - uy * 2); g.stroke(); g.lineCap = 'round'; }
    const s = k === 'L' ? -1 : 1, ta = Math.atan2(uy, ux) - s * 0.9 + wav;
    piece(g, circ(hc.x + Math.cos(ta) * hr * 0.85, hc.y + Math.sin(ta) * hr * 0.85, hr * 0.38), d.face, J.band * 0.7);
    piece(g, ell(hc.x, hc.y, hr, hr * 0.92, Math.atan2(uy, ux) + wav), d.face, J.band);
    const it = d['item' + k]; if (it) it(g, d, p, G, R, hc);
    return R;
  }
  function feet(g, d, p, G) {
    const J = d.J;
    for (const [k, s] of [['L', -1], ['R', 1]]) { const f = p['foot' + k] || {}, x = s * J.footGap + (f.dx || 0) + G.hx * 0.3, y = -J.footR * 0.55 - (f.lift || 0) * J.footR * 1.6;
      // 座っている時：衣のすそ（座面の高さ）から地面まで、すねが下りる
      if (G.seat > 1) { g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = J.footR * 1.3 + J.band * 2; g.beginPath(); g.moveTo(x * G.bs, -J.hemUp - 2); g.lineTo(x * G.bs, y); g.stroke(); g.strokeStyle = dk(d.legs || d.cuff || d.face); g.lineWidth = J.footR * 1.3; g.stroke(); }
      piece(g, ell(x * G.bs, y, J.footR * 1.15, J.footR * 0.8), d.legs || d.face, J.band); }
  }
  // o.filmK：膜の明るさ（離れた人形は暗く）
  // 座る（p.sit 0〜1）：胴が少し縮み、衣のすそが座面の高さまで上がる。すそから下は、すねと足
  function seated(d, p) { const s = clamp(p.sit || 0, 0, 1); if (s <= 0) return d; const J0 = d.J, seat = J0.bodyH * 0.4 * s;
    const d2 = Object.create(d); d2.J = Object.assign({}, J0, { bodyH: J0.bodyH * (1 - 0.25 * s), hemUp: J0.hemUp + seat }); d2.seat = seat; return d2; }
  function draw(g, d0, p0, o = {}) {
    FK = o.filmK ?? 0.95;
    const d = seated(d0, p0), p = p0, G = geo(d, p), yw = G.yw, near = yw > 0.3 ? 'R' : yw < -0.3 ? 'L' : null; G.seat = d.seat || 0;
    const fr = { L: !!(p.armL && p.armL.front) || near === 'L', R: !!(p.armR && p.armR.front) || near === 'R' };
    if (near) fr[near === 'L' ? 'R' : 'L'] = false;   // 斜めの時、奥の腕はいつも胴の後ろ
    if (p.back) { fr.L = !fr.L; fr.R = !fr.R; }        // 後ろ姿では、前と後ろが入れかわる
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (d.back) d.back(g, d, p, G);
    const out = {}; G.front = fr;
    for (const k of ['L', 'R']) if (!fr[k]) out[k] = arm(g, d, p, G, k);
    feet(g, d, p, G);
    const rp = robePath(d, p, G); G.robePath = rp; piece(g, rp, d.robe, d.J.band * 1.1);
    if (!p.back) { pattern(g, d, p, G); stole(g, d, p, G); if (d.front) d.front(g, d, p, G); if (d.held) d.held(g, d, p, G); }   // 後ろ姿では、胸の模様・肩かけ・前の飾りは見えない
    head(g, d, p, G);
    for (const k of ['L', 'R']) if (fr[k]) out[k] = arm(g, d, p, G, k);
    FK = 0.95;
    return { G, arms: out, front: fr };
  }

  // ---------- 一人ずつ（前の見本の形を土台に、違えて） ----------
  const J = (o) => Object.assign({ R: 26, bodyH: 80, topW: 22, hemW: 34, belly: 0, hemUp: 6, ua: 22, fa: 20, armW: 15, handR: 8.5, footR: 9, footGap: 10, band: 3.2 }, o);
  const RAIN = ['#ff3d5a', '#ff9a2e', '#ffd84a', '#4fd27a', '#3d9bff', '#a066ff'];
  const dark = (g, path, b) => piece(g, path, LEA, 0);
  const DOLLS = {
    conductor: { name: '指揮者（大きく陽気・ひげ）', J: J({ R: 31, bodyH: 92, topW: 30, hemW: 46, belly: 8, ua: 26, fa: 23, armW: 18, handR: 10, footR: 11, footGap: 14, band: 3.6 }), head: 'round',
      face: '#ffd84a', robe: '#8d58f0', cuff: '#ffd84a', pattern: { kind: 'diamond', cols: ['#ffd84a', '#ff6a9a', '#5ac8ff'] }, stole: RAIN, hairFrontOnly: true,
      beard: (g, R, b, p, yw, fx) => { const q = new Path2D(); q.moveTo(fx - R * 0.62, R * 0.32); q.quadraticCurveTo(fx - R * 0.55, R * 1.05, fx, R * 1.12); q.quadraticCurveTo(fx + R * 0.55, R * 1.05, fx + R * 0.62, R * 0.32); q.quadraticCurveTo(fx + R * 0.35, R * 0.62, fx, R * 0.6); q.quadraticCurveTo(fx - R * 0.35, R * 0.62, fx - R * 0.62, R * 0.32); dark(g, q); },
      hair: (g, R, b, p, yw, fx) => { g.strokeStyle = LEA; g.lineWidth = b * 1.3; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(fx + s * R * 0.16, -R * 0.3); g.lineTo(fx + s * R * 0.42, -R * 0.34); g.stroke(); } },
      // ①〜③：手元のランタン（ランプ1灯の仕掛け）。手から下がって、歩くと少し揺れる
      itemL: (g, d, p, G, A, hc) => { if (p.lantern) lanternAt(g, hc.x, hc.y + 4, p.lanternSwing || 0, p.lanternLit ?? 1); } },
    twinA: { name: '双子の男の子（赤い帽子）', J: J({ R: 25, bodyH: 46, topW: 17, hemW: 25, ua: 16, fa: 14, armW: 12, handR: 7.5, footR: 7.5, footGap: 8, band: 2.8 }), head: 'round',
      face: '#fff07a', robe: '#f6b52e', cuff: '#fff4dc', pattern: { kind: 'dots', cols: ['#fff4dc'], n: 3 }, stole: ['#fff4dc', '#ff5a5a', '#fff4dc'],
      hat: (g, R, b, p, yw) => { const t = p.hat || 0; piece(g, spline([{ x: -R * 1.0, y: -R * 0.3 }, { x: -R * 0.85, y: -R * 0.95 }, { x: 0, y: -R * 1.3 - t * 3 }, { x: R * 0.85, y: -R * 0.95 }, { x: R * 1.0, y: -R * 0.3 }, { x: 0, y: -R * 0.48 }]), '#ff3b4a', b); piece(g, spline([{ x: -R * 1.04, y: -R * 0.24 }, { x: 0, y: -R * 0.5 }, { x: R * 1.04, y: -R * 0.24 }, { x: R * 1.0, y: -R * 0.48 }, { x: 0, y: -R * 0.72 }, { x: -R * 1.0, y: -R * 0.48 }]), '#fff0d8', b * 0.8); piece(g, circ((p.pom || 0) * R * 0.2, -R * 1.36 - t * 3, R * 0.24), '#fff6e6', b * 0.8); } },
    twinB: { name: '双子の男の子（緑の耳当て帽）', J: J({ R: 25, bodyH: 46, topW: 17, hemW: 25, ua: 16, fa: 14, armW: 12, handR: 7.5, footR: 7.5, footGap: 8, band: 2.8 }), head: 'round',
      face: '#fff07a', robe: '#f6b52e', cuff: '#fff4dc', pattern: { kind: 'dots', cols: ['#fff4dc'], n: 3 }, stole: ['#fff4dc', '#ff5a5a', '#fff4dc'],
      hat: (g, R, b, p) => { const fl = (p.flap || 0) * R * 0.12; piece(g, spline([{ x: -R * 1.02, y: -R * 0.15 }, { x: -R * 0.92, y: -R * 0.82 }, { x: 0, y: -R * 1.1 }, { x: R * 0.92, y: -R * 0.82 }, { x: R * 1.02, y: -R * 0.15 }, { x: 0, y: -R * 0.42 }]), '#2fae62', b);
        for (const s of [-1, 1]) piece(g, spline([{ x: s * R * 0.78, y: -R * 0.3 }, { x: s * R * 1.08, y: -R * 0.2 }, { x: s * R * 1.08 + fl * s, y: R * 0.42 }, { x: s * R * 0.86 + fl * s, y: R * 0.52 }]), '#2fae62', b * 0.9);
        piece(g, circ(0, -R * 1.12, R * 0.12), '#ffe066', b * 0.7); } },
    smallkid: { name: '小さな女の子（ちょこんと結んだ髪）', J: J({ R: 23, bodyH: 36, topW: 14, hemW: 22, ua: 13, fa: 12, armW: 11, handR: 7, footR: 7, footGap: 7, band: 2.6 }), head: 'wide',
      face: '#f4ff8a', robe: '#ff8ab8', cuff: '#fff0f6', pattern: { kind: 'hearts', cols: ['#fff0f6', '#ffd84a'], n: 2, size: 1.2 },
      hair: (g, R, b) => { piece(g, circ(0, -R * 1.05, R * 0.26), LEA, 0); piece(g, spline([{ x: -R * 0.3, y: -R * 1.2 }, { x: 0, y: -R * 1.05 }, { x: -R * 0.32, y: -R * 0.95 }]), '#ffd84a', b * 0.6); piece(g, spline([{ x: R * 0.3, y: -R * 1.2 }, { x: 0, y: -R * 1.05 }, { x: R * 0.32, y: -R * 0.95 }]), '#ffd84a', b * 0.6); } },
    girl: { name: 'おさげの女の子（リボン）', J: J({ R: 26, bodyH: 56, topW: 19, hemW: 28, ua: 18, fa: 16, armW: 12.5, handR: 7.8, footR: 8, footGap: 8.5, band: 2.9 }), head: 'wide',
      face: '#ffe866', robe: '#14a07a', cuff: '#fff0f6', pattern: { kind: 'diamond', cols: ['#ff8ab8', '#fff0f6', '#ff8ab8'], size: 0.85 }, stole: ['#ff7ab0', '#fff0f6', '#ff7ab0'],
      hairBack: (g, R, b, p) => { const sw = (p.braid || 0) * R * 0.15; for (const s of [-1, 1]) { const q = spline([{ x: s * R * 0.7, y: -R * 0.2 }, { x: s * R * 1.12 + sw, y: R * 0.35 }, { x: s * R * 1.0 + sw * 1.4, y: R * 0.95 }, { x: s * R * 0.82 + sw, y: R * 0.5 }]); piece(g, q, LEA, 0);
        const bx = s * R * 1.02 + sw * 1.4, by = R * 1.0; for (const t of [-1, 1]) piece(g, spline([{ x: bx, y: by }, { x: bx + t * R * 0.3, y: by - R * 0.18 }, { x: bx + t * R * 0.3, y: by + R * 0.18 }]), '#ff5a9a', b * 0.6); } },
      hair: (g, R, b) => piece(g, spline([{ x: -R * 0.92, y: -R * 0.25 }, { x: -R * 0.6, y: -R * 0.88 }, { x: 0, y: -R * 1.0 }, { x: R * 0.6, y: -R * 0.88 }, { x: R * 0.92, y: -R * 0.25 }, { x: R * 0.4, y: -R * 0.55 }, { x: 0, y: -R * 0.45 }, { x: -R * 0.4, y: -R * 0.55 }]), LEA, 0) },
    grandma: { name: 'お団子と丸眼鏡のおばあちゃん', J: J({ R: 27, bodyH: 62, topW: 25, hemW: 38, belly: 6, ua: 20, fa: 18, armW: 14, handR: 8.5, footR: 9, footGap: 10 }), head: 'wide', glasses: true,
      face: '#fff2a8', robe: '#22b2a4', cuff: '#fff7e8', pattern: { kind: 'stars', cols: ['#ffd84a', '#fff7e8', '#ffd84a'] }, stole: ['#ff6a8a', '#ffd84a', '#ff6a8a'],
      hairBack: (g, R, b) => { piece(g, circ(0, -R * 1.18, R * 0.42), '#e4dcf0', b); g.strokeStyle = LEA; g.lineWidth = b * 0.5; g.beginPath(); g.arc(0, -R * 1.18, R * 0.22, 0.3, 4.2); g.stroke(); },
      hair: (g, R, b) => { piece(g, spline([{ x: -R * 0.98, y: -R * 0.15 }, { x: -R * 0.7, y: -R * 0.85 }, { x: 0, y: -R * 1.0 }, { x: R * 0.7, y: -R * 0.85 }, { x: R * 0.98, y: -R * 0.15 }, { x: R * 0.55, y: -R * 0.5 }, { x: 0, y: -R * 0.62 }, { x: -R * 0.55, y: -R * 0.5 }]), '#e4dcf0', b * 0.8); piece(g, circ(R * 0.3, -R * 1.5, R * 0.08), '#ff6a8a', b * 0.5); } },
    father: { name: '背の高いお父さん（口ひげ）', J: J({ R: 26, bodyH: 104, topW: 25, hemW: 36, ua: 25, fa: 23, armW: 15, handR: 9, footR: 9.5, footGap: 11 }), head: 'tall',
      face: '#ffcf40', robe: '#d8344e', cuff: '#ffcf5a', pattern: { kind: 'diamond', cols: ['#ffcf5a', '#ffcf5a', '#ffcf5a', '#ffcf5a'], n: 4, size: 0.8 }, stole: ['#ffcf5a', '#3a8aff', '#ffcf5a'],
      hair: (g, R, b) => piece(g, spline([{ x: -R * 0.9, y: -R * 0.3 }, { x: -R * 0.75, y: -R * 0.95 }, { x: R * 0.1, y: -R * 1.12 }, { x: R * 0.82, y: -R * 0.85 }, { x: R * 0.92, y: -R * 0.35 }, { x: R * 0.6, y: -R * 0.62 }, { x: -R * 0.1, y: -R * 0.72 }]), LEA, 0),
      beard: (g, R, b, p, yw, fx) => { for (const s of [-1, 1]) piece(g, spline([{ x: fx, y: R * 0.2 }, { x: fx + s * R * 0.3, y: R * 0.16 }, { x: fx + s * R * 0.36, y: R * 0.26 }, { x: fx + s * R * 0.08, y: R * 0.27 }]), LEA, 0); } },
    plump: { name: 'ふくよかなおばさん（花の帽子）', J: J({ R: 29, bodyH: 70, topW: 30, hemW: 52, belly: 14, ua: 21, fa: 19, armW: 16, handR: 9.5, footR: 10, footGap: 13, band: 3.4 }), head: 'wide',
      face: '#ffe060', robe: '#ff9a3a', cuff: '#fff4dc', pattern: { kind: 'dots', cols: ['#fff4dc', '#22b2a4', '#fff4dc'], n: 3, size: 1.3 }, stole: ['#22b2a4', '#fff4dc', '#22b2a4'],
      hat: (g, R, b, p) => { const t = p.hatBob || 0; piece(g, ell(0, -R * 0.62 - t, R * 1.45, R * 0.28), '#c03a8a', b); piece(g, spline([{ x: -R * 0.8, y: -R * 0.65 - t }, { x: -R * 0.6, y: -R * 1.2 - t }, { x: R * 0.6, y: -R * 1.2 - t }, { x: R * 0.8, y: -R * 0.65 - t }]), '#c03a8a', b);
        for (const [x, c] of [[-R * 0.45, '#ffd84a'], [-R * 0.1, '#fff4dc'], [R * 0.3, '#ffd84a']]) { for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; piece(g, circ(x + Math.cos(a) * R * 0.11, -R * 0.95 - t + Math.sin(a) * R * 0.11, R * 0.09), c, b * 0.4); } piece(g, circ(x, -R * 0.95 - t, R * 0.06), '#ff5a5a', 0); } } },
    nun: { name: 'タンバリンの修道女', J: J({ R: 26, bodyH: 74, topW: 21, hemW: 33, ua: 21, fa: 19, armW: 14 }), head: 'round',
      face: '#f8f4a0', robe: '#5a6ad0', cuff: '#f4f0ff', pattern: { kind: 'diamond', cols: ['#f4f0ff'], n: 1, size: 0.9 }, stole: ['#ffd84a', '#f4f0ff', '#ffd84a'],
      hairBack: (g, R, b, p) => { const sw = (p.veil || 0) * R * 0.25; piece(g, spline([{ x: -R * 1.25, y: -R * 0.5 }, { x: -R * 1.0, y: -R * 1.2 }, { x: R * 1.0, y: -R * 1.2 }, { x: R * 1.25, y: -R * 0.5 }, { x: R * 1.4 + sw, y: R * 1.4 }, { x: -R * 1.4 + sw, y: R * 1.4 }]), '#6a70d8', b); },
      hat: (g, R, b) => { const q = new Path2D(); q.arc(0, 0, R * 1.14, Math.PI * 1.05, Math.PI * 1.95); q.arc(0, 0, R * 0.92, Math.PI * 1.95, Math.PI * 1.05, true); q.closePath(); piece(g, q, '#f4f0ff', b * 0.9); },
      itemR: (g, d, p, G, A, hc) => { g.save(); g.translate(hc.x, hc.y); g.rotate(p.tam || 0); g.translate(0, -16); const ring = new Path2D(); ring.arc(0, 0, 17, 0, TAU); ring.arc(0, 0, 12, 0, TAU, true); piece(g, ell(0, 0, 13, 13), '#fff2c0', 0); piece(g, ring, '#ffcf3a', 2.6);
        for (let i = 0; i < 5; i++) { const t = i / 5 * TAU + 0.3, j = (p.jing || 0) * (i % 2 ? 1 : -1) * 2; piece(g, ell(Math.cos(t) * 14.5 + j, Math.sin(t) * 14.5, 4.2, 2.4, t), '#ffe98a', 1.4); }
        g.strokeStyle = dk('#ff5a8a'); g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 17); g.quadraticCurveTo(6 + (p.jing || 0) * 4, 30, 2, 40); g.stroke(); g.restore(); } },
    grandpa: { name: 'ひげのおじいちゃん', J: J({ R: 27, bodyH: 78, topW: 24, hemW: 36, belly: 4, ua: 22, fa: 20, armW: 15 }), head: 'round',
      face: '#fff8b8', robe: '#3a7ad8', cuff: '#ffd84a', pattern: { kind: 'stars', cols: ['#ffd84a', '#ffd84a'], n: 2, size: 1.2 }, stole: ['#ffd84a', '#ff6a5a', '#ffd84a'],
      hairBack: (g, R, b) => { for (const s of [-1, 1]) piece(g, spline([{ x: s * R * 0.8, y: -R * 0.55 }, { x: s * R * 1.12, y: -R * 0.2 }, { x: s * R * 1.08, y: R * 0.3 }, { x: s * R * 0.85, y: R * 0.1 }]), '#eee8f8', b * 0.8); },
      beard: (g, R, b, p, yw, fx) => { const sw = (p.beard || 0) * R * 0.15; piece(g, spline([{ x: fx - R * 0.66, y: R * 0.28 }, { x: fx - R * 0.5, y: R * 0.95 }, { x: fx + sw, y: R * 1.55 }, { x: fx + R * 0.5, y: R * 0.95 }, { x: fx + R * 0.66, y: R * 0.28 }, { x: fx + R * 0.3, y: R * 0.58 }, { x: fx, y: R * 0.5 }, { x: fx - R * 0.3, y: R * 0.58 }]), '#eee8f8', b * 0.8);
        for (const s of [-1, 1]) piece(g, spline([{ x: fx, y: R * 0.2 }, { x: fx + s * R * 0.34, y: R * 0.15 }, { x: fx + s * R * 0.4, y: R * 0.28 }, { x: fx + s * R * 0.1, y: R * 0.3 }]), '#eee8f8', b * 0.6); } },
    tallman: { name: '背の高いのっぽさん（ふわふわ頭）', J: J({ R: 24, bodyH: 112, topW: 18, hemW: 28, ua: 26, fa: 24, armW: 13, handR: 8.5, footR: 9, footGap: 9 }), head: 'tall',
      face: '#ffc83a', robe: '#2f7a52', cuff: '#ffd84a', pattern: { kind: 'diamond', cols: ['#ff5a5a', '#ffd84a', '#ff5a5a', '#ffd84a', '#ff5a5a'], n: 5, size: 0.62 }, stole: ['#ff5a5a', '#fff4dc', '#ff5a5a'],
      hair: (g, R, b, p) => { const t = (p.puff || 0) * R * 0.06; piece(g, spline([{ x: -R * 0.95, y: -R * 0.4 }, { x: -R * 1.05, y: -R * 1.0 - t }, { x: -R * 0.55, y: -R * 1.45 - t }, { x: 0, y: -R * 1.55 - t }, { x: R * 0.55, y: -R * 1.45 - t }, { x: R * 1.05, y: -R * 1.0 - t }, { x: R * 0.95, y: -R * 0.4 }, { x: R * 0.5, y: -R * 0.7 }, { x: -R * 0.5, y: -R * 0.7 }]), LEA, 0); } },
    oldman: { name: '杖と山高帽のおじいさん（広場）', J: J({ R: 26, bodyH: 74, topW: 22, hemW: 30, ua: 22, fa: 20, armW: 14, handR: 8.5 }), head: 'tall',
      face: '#f0ff9a', robe: '#d9a03a', sleeve: '#d9a03a', cuff: '#f4ead0', pattern: { kind: 'dots', cols: ['#ffd84a', '#ffd84a', '#ffd84a', '#ffd84a'], n: 4, size: 0.7 },
      beard: (g, R, b, p, yw, fx) => { for (const s of [-1, 1]) piece(g, spline([{ x: fx, y: R * 0.2 }, { x: fx + s * R * 0.38, y: R * 0.14 }, { x: fx + s * R * 0.44, y: R * 0.28 }, { x: fx + s * R * 0.1, y: R * 0.3 }]), '#eee8f8', b * 0.6); piece(g, spline([{ x: fx - R * 0.22, y: R * 0.62 }, { x: fx + R * 0.22, y: R * 0.62 }, { x: fx + R * 0.12, y: R * 1.0 }, { x: fx, y: R * 1.12 }, { x: fx - R * 0.12, y: R * 1.0 }]), '#eee8f8', b * 0.7); },
      hat: (g, R, b, p) => { g.save(); g.translate(0, -(p.hat || 0) * R * 0.5); piece(g, spline([{ x: -R * 0.78, y: -R * 0.62 }, { x: -R * 0.7, y: -R * 1.28 }, { x: 0, y: -R * 1.55 }, { x: R * 0.7, y: -R * 1.28 }, { x: R * 0.78, y: -R * 0.62 }]), '#2f7a52', b); piece(g, ell(0, -R * 0.62, R * 1.2, R * 0.16), '#2f7a52', b); g.lineCap = 'butt'; g.strokeStyle = LEA; g.lineWidth = R * 0.22; g.beginPath(); g.moveTo(-R * 0.74, -R * 0.82); g.lineTo(R * 0.74, -R * 0.82); g.stroke(); g.strokeStyle = dk('#ff4a5a'); g.lineWidth = R * 0.13; g.stroke(); g.lineCap = 'round'; g.restore(); },
      front: (g, d, p, G) => { const N = G.neck; piece(g, spline([{ x: N.x - 9, y: N.y + 1 }, { x: N.x, y: N.y + 6 }, { x: N.x - 9, y: N.y + 11 }]), '#ff3b4a', 1.8); piece(g, spline([{ x: N.x + 9, y: N.y + 1 }, { x: N.x, y: N.y + 6 }, { x: N.x + 9, y: N.y + 11 }]), '#ff3b4a', 1.8); },
      itemL: (g, d, p, G, A, hc) => { g.save(); g.translate(hc.x, hc.y); g.rotate(p.cane || 0); g.translate(0, -30 * (p.caneMid || 0)); g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = 7; g.beginPath(); g.moveTo(0, -2); g.lineTo(0, 70); g.stroke(); g.strokeStyle = dk('#8a5a34'); g.lineWidth = 3.6; g.stroke();
        g.strokeStyle = LEA; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.arc(-7, 0, 7, 0, Math.PI, true); g.stroke(); g.strokeStyle = dk('#8a5a34'); g.lineWidth = 3.6; g.stroke(); g.restore(); } },
    vendor: { name: '焼き栗売りのおじさん（ハンチング・前かけ）', J: J({ R: 28, bodyH: 76, topW: 28, hemW: 42, belly: 12, ua: 22, fa: 20, armW: 16, handR: 9.5, footR: 10, footGap: 12, band: 3.4 }), head: 'wide',
      face: '#ffd050', robe: '#a8653a', cuff: '#e8d8b8', pattern: { kind: 'dots', cols: ['#e8d8b8'], n: 2 },
      hat: (g, R, b, p) => { g.save(); g.translate(0, -(p.hat || 0) * R * 0.8); piece(g, spline([{ x: -R * 1.0, y: -R * 0.35 }, { x: -R * 0.85, y: -R * 0.95 }, { x: 0, y: -R * 1.1 }, { x: R * 0.85, y: -R * 0.95 }, { x: R * 1.0, y: -R * 0.35 }, { x: 0, y: -R * 0.5 }]), '#8a7350', b); piece(g, ell(R * 0.2 * (p.yaw || 0), -R * 0.42, R * 0.8, R * 0.14), '#8a7350', b * 0.8); g.restore(); },
      beard: (g, R, b, p, yw, fx) => { for (const s of [-1, 1]) piece(g, spline([{ x: fx, y: R * 0.2 }, { x: fx + s * R * 0.32, y: R * 0.15 }, { x: fx + s * R * 0.38, y: R * 0.27 }, { x: fx + s * R * 0.08, y: R * 0.28 }]), LEA, 0); },
      front: (g, d, p, G) => { const T = G.T, y0 = G.y0, J = d.J; piece(g, spline([T({ x: -J.topW * 0.55, y: y0 + J.R * 0.7 }), T({ x: J.topW * 0.55, y: y0 + J.R * 0.7 }), T({ x: J.hemW * 0.62, y: -J.hemUp - 4 }), T({ x: 0, y: -J.hemUp }), T({ x: -J.hemW * 0.62, y: -J.hemUp - 4 })]), '#f2e4c2', J.band); },
      // 焼き栗の紙袋（差し出す手）：白い紙の円すいと、のぞく栗
      itemL: (g, d, p, G, A, hc) => { if (!p.cone) return; g.save(); g.translate(hc.x, hc.y - 6); g.rotate(-0.3); piece(g, spline([{ x: -13, y: -16 }, { x: 13, y: -16 }, { x: 0, y: 22 }]), '#f8f0dc', 2.2); for (const [x, y] of [[-6, -18], [3, -21], [9, -16]]) piece(g, circ(x, y, 4.6), '#8a4a26', 1.4); g.restore(); } },
    mother: { name: '赤ちゃんを抱いたお母さん（頭巾）', J: J({ R: 26, bodyH: 82, topW: 22, hemW: 36, ua: 21, fa: 19, armW: 13.5 }), head: 'round',
      face: '#ffec8a', robe: '#a98be8', sleeve: '#e5578a', cuff: '#fff0f6', pattern: { kind: 'hearts', cols: ['#ffd84a', '#fff0f6', '#ffd84a'], n: 3, size: 0.8 },
      hairBack: (g, R, b) => piece(g, spline([{ x: -R * 1.15, y: R * 0.2 }, { x: -R * 1.05, y: -R * 0.95 }, { x: 0, y: -R * 1.25 }, { x: R * 1.05, y: -R * 0.95 }, { x: R * 1.15, y: R * 0.2 }, { x: R * 1.0, y: R * 0.95 }, { x: -R * 1.0, y: R * 0.95 }]), '#e5578a', b),
      hat: (g, R, b) => { const q = new Path2D(); q.arc(0, 0, R * 1.1, Math.PI * 1.02, Math.PI * 1.98); q.arc(0, 0, R * 0.92, Math.PI * 1.98, Math.PI * 1.02, true); q.closePath(); piece(g, q, '#f07aa2', b * 0.9); },
      held: (g, d, p, G) => { const N = G.neck, c = { x: N.x + G.yw * 6, y: N.y + d.J.R * 0.9 }; g.save(); g.translate(c.x, c.y);
        piece(g, ell(0, 0, 24, 15, 0.12), '#86cbf4', 3); for (let i = 0; i < 4; i++) { g.fillStyle = dk('#fff6c8'); g.beginPath(); g.arc(-12 + i * 8, 2 + (i % 2) * 4, 1.8, 0, TAU); g.fill(); }
        piece(g, circ(-15, -12, 11), '#fff09a', 2.6); piece(g, spline([{ x: -26, y: -16 }, { x: -20, y: -28 }, { x: -6, y: -26 }, { x: -3, y: -16 }, { x: -15, y: -20 }]), '#ffd84a', 2.2); piece(g, circ(-17, -30, 3.4), '#fff6e6', 1.4);
        g.strokeStyle = LEA; g.lineWidth = 1.5; for (const ex of [-18, -11]) { g.beginPath(); g.arc(ex, -12, 2.2, 0.2, 2.9); g.stroke(); }
        const w = p.babyHand || 0; if (w > 0.02) { const hx = 2 + 2 * Math.sin(w * 9), hy = -14 - 12 * w; g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = 7.4; g.beginPath(); g.moveTo(4, -6); g.lineTo(hx, hy); g.stroke(); g.strokeStyle = dk('#86cbf4'); g.lineWidth = 4.6; g.stroke(); piece(g, circ(hx, hy - 2, 3.6), '#fff09a', 1.4); }
        g.restore(); } },

    // ---------- 町で加わる人たち（全編で足した。どれも見本Eと同じ系統の、丸い頭と衣の人形） ----------
    shygirl: { name: '内気な女の子（長いマフラー・小さなスーツケース）', J: J({ R: 25, bodyH: 60, topW: 18, hemW: 27, ua: 17, fa: 15, armW: 12, handR: 7.6, footR: 8, footGap: 8, band: 2.9 }), head: 'round',
      face: '#ffe27a', robe: '#3f8fe0', cuff: '#fff4dc', legs: '#5a4a9a', pattern: { kind: 'toggle', cols: ['#ffd84a', '#ffd84a', '#ffd84a'], n: 3, size: 0.8 },
      hairBack: (g, R, b) => piece(g, spline([{ x: -R * 1.06, y: -R * 0.1 }, { x: -R * 0.95, y: -R * 0.85 }, { x: 0, y: -R * 1.1 }, { x: R * 0.95, y: -R * 0.85 }, { x: R * 1.06, y: -R * 0.1 }, { x: R * 1.0, y: R * 0.62 }, { x: R * 0.72, y: R * 0.66 }, { x: -R * 0.72, y: R * 0.66 }, { x: -R * 1.0, y: R * 0.62 }]), LEA, 0),
      // 前髪：毛先は眉の上で、不揃いに（楕円にしない）
      hair: (g, R, b, p, yw, fx) => { const q = new Path2D(); q.moveTo(-R * 0.92, -R * 0.2); q.quadraticCurveTo(-R * 0.75, -R * 1.02, 0, -R * 1.04); q.quadraticCurveTo(R * 0.75, -R * 1.02, R * 0.92, -R * 0.2);
        const tips = [0.86, 0.6, 0.34, 0.1, -0.16, -0.4, -0.64, -0.88]; let x = R * 0.92; for (let i = 0; i < tips.length; i++) { const tx = tips[i] * R + fx * 0.4, ty = -R * (0.3 + 0.07 * ((i * 37) % 3)); q.lineTo((x + tx) / 2, ty - R * 0.12); q.lineTo(tx, ty); x = tx; } q.closePath(); piece(g, q, LEA, 0); },
      // 長いマフラー：首に巻いて、手前の端が すその近くまで垂れ、揺れる
      front: (g, d, p, G) => { const N = G.neck, J = d.J, sw = (p.scarf || 0) * 6, side = G.yw >= 0 ? 1 : -1;
        const band = spline([{ x: N.x - J.topW * 0.82, y: N.y - 3 }, { x: N.x, y: N.y + 5 }, { x: N.x + J.topW * 0.82, y: N.y - 3 }, { x: N.x + J.topW * 0.8, y: N.y + 8 }, { x: N.x, y: N.y + 15 }, { x: N.x - J.topW * 0.8, y: N.y + 8 }]);
        const tx = N.x + side * J.topW * 0.42, tail = spline([{ x: tx - 6, y: N.y + 8 }, { x: tx + 6, y: N.y + 8 }, { x: tx + 7 + sw, y: N.y + J.bodyH * 0.62 }, { x: tx - 5 + sw * 1.2, y: N.y + J.bodyH * 0.64 }]);
        for (const q of [tail, band]) { piece(g, q, '#ff4a5a', J.band * 0.9); g.save(); g.clip(q); g.strokeStyle = dk('#fff0e0'); g.lineWidth = 3.4; for (let k = -6; k < 14; k++) { g.beginPath(); g.moveTo(N.x - 40, N.y + k * 9); g.lineTo(N.x + 40, N.y + k * 9 + 10); g.stroke(); } g.restore(); }
        g.strokeStyle = LEA; g.lineWidth = 1.6; const e = { x: tx + sw * 1.1, y: N.y + J.bodyH * 0.65 }; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(e.x + i * 2.4, e.y); g.lineTo(e.x + i * 2.6, e.y + 6); g.stroke(); } },
      itemL: (g, d, p, G, A, hc) => { if (p.caseInHand) suitcaseAt(g, hc.x, hc.y + 42, 0.75); } },
    salaryman: { name: '鞄の会社員（角の眼鏡・ネクタイ）', J: J({ R: 25, bodyH: 94, topW: 23, hemW: 29, ua: 23, fa: 21, armW: 13.5, handR: 8.4, footR: 9, footGap: 9.5 }), head: 'tall', glasses: 'square',
      face: '#ffd65a', robe: '#5a7898', cuff: '#f4f0e8', pattern: { kind: 'dots', cols: ['#e8e0d0', '#e8e0d0'], n: 2, size: 0.6 },
      hair: (g, R, b, p, yw, fx) => piece(g, spline([{ x: -R * 0.92, y: -R * 0.3 }, { x: -R * 0.82, y: -R * 0.92 }, { x: -R * 0.1, y: -R * 1.08 }, { x: R * 0.75, y: -R * 0.95 }, { x: R * 0.93, y: -R * 0.42 }, { x: R * 0.5, y: -R * 0.72 }, { x: -R * 0.35, y: -R * 0.6 }]), LEA, 0),
      // 白いシャツの襟とネクタイ（tie＝緩めた度合い：結び目が下がって曲がる）
      front: (g, d, p, G) => { const N = G.neck, J = d.J, t = clamp(p.tie || 0, 0, 1); piece(g, spline([{ x: N.x - 11, y: N.y - 1 }, { x: N.x + 11, y: N.y - 1 }, { x: N.x, y: N.y + 26 }]), '#f4f0e8', 2);
        g.save(); g.translate(N.x, N.y + 4 + 10 * t); g.rotate(0.35 * t); piece(g, spline([{ x: -4, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 5 }, { x: -3, y: 5 }]), '#e8384a', 1.6); piece(g, spline([{ x: -3, y: 5 }, { x: 3, y: 5 }, { x: 6, y: 34 }, { x: 0, y: 40 }, { x: -6, y: 34 }]), '#e8384a', 1.8); g.restore(); },
      itemL: (g, d, p, G, A, hc) => { if (p.bag === false) return; g.save(); g.translate(hc.x, hc.y + 6); g.rotate(p.bagSwing || 0); piece(g, spline([{ x: -20, y: 6 }, { x: 20, y: 6 }, { x: 21, y: 34 }, { x: -21, y: 34 }]), '#8a5a34', 2.6); g.strokeStyle = LEA; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-7, 6); g.quadraticCurveTo(0, -4, 7, 6); g.stroke(); piece(g, circ(0, 12, 2.6), '#ffd84a', 1.2); g.restore(); } },
    youth: { name: 'ヘッドホンの若者（パーカー）', J: J({ R: 24, bodyH: 86, topW: 19, hemW: 26, ua: 22, fa: 20, armW: 12.5, handR: 8, footR: 8.5, footGap: 8.5 }), head: 'round',
      face: '#ffcc4a', robe: '#e8508a', cuff: '#3ad0ff', pattern: { kind: 'pocket', cols: ['#c83a72'] },
      back: (g, d, p, G) => { const N = G.neck, J = d.J; piece(g, spline([{ x: N.x - J.topW * 0.9, y: N.y + 4 }, { x: N.x - J.topW * 0.7, y: N.y - J.R * 0.5 }, { x: N.x + J.topW * 0.7, y: N.y - J.R * 0.5 }, { x: N.x + J.topW * 0.9, y: N.y + 4 }]), '#c83a72', J.band); },
      hair: (g, R, b) => { const q = new Path2D(); q.moveTo(-R * 0.9, -R * 0.35); for (let i = 0; i <= 6; i++) { const a = Math.PI + i / 6 * Math.PI, rr = i % 2 ? R * 1.28 : R * 1.02; q.lineTo(Math.cos(a) * rr, Math.sin(a) * rr - R * 0.05); } q.lineTo(R * 0.9, -R * 0.35); q.quadraticCurveTo(0, -R * 0.6, -R * 0.9, -R * 0.35); piece(g, q, LEA, 0); },
      // ヘッドホン：頭の上の弧と、左右の耳の丸（耳当て）。いつも頭に付けたまま（頭の部品の中で描くので、跳ねる・首を振る・揺れる・座るでも外れない）
      //   本人 2026-10-22「ホームの途中で突然落ちて、そのまま」：v5 までは phonesOff で片方の耳当てを首の所へ下げていた（手で外す動きなし）。ホーム 86.6〜87.0 に下げ、屋上・大聖堂も下げたまま → やめた
      //   引きの絵で小さくなっても読めるように、耳当ては丸く大きめに・中にもう1枚（2枚重ねの濃い芯）
      hat: (g, R, b) => { g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = R * 0.26; g.beginPath(); g.arc(0, -R * 0.05, R * 1.12, Math.PI * 1.08, Math.PI * 1.92); g.stroke(); g.strokeStyle = dk('#3ad0ff'); g.lineWidth = R * 0.13; g.stroke();
        for (const s of [-1, 1]) { piece(g, ell(s * R * 1.0, R * 0.08, R * 0.32, R * 0.4), '#3ad0ff', b); piece(g, ell(s * R * 1.0, R * 0.08, R * 0.17, R * 0.24), '#3ad0ff', b * 0.5); } } },
    staff: { name: '駅員さん（制帽・笛）', J: J({ R: 26, bodyH: 82, topW: 23, hemW: 31, ua: 21, fa: 19, armW: 14, handR: 8.5 }), head: 'wide',
      face: '#ffe070', robe: '#2e5aa8', cuff: '#ffd84a', pattern: { kind: 'dots', cols: ['#ffd84a', '#ffd84a', '#ffd84a', '#ffd84a'], n: 4, size: 0.55 },
      hat: (g, R, b, p) => { piece(g, spline([{ x: -R * 0.95, y: -R * 0.55 }, { x: -R * 1.05, y: -R * 1.05 }, { x: 0, y: -R * 1.2 }, { x: R * 1.05, y: -R * 1.05 }, { x: R * 0.95, y: -R * 0.55 }]), '#2e5aa8', b); piece(g, ell(0, -R * 0.52, R * 0.9, R * 0.16), LEA, 0); piece(g, circ(0, -R * 0.88, R * 0.14), '#ffd84a', b * 0.5); },
      front: (g, d, p, G) => { if (p.whistle > 0.5) return; const N = G.neck; g.strokeStyle = dk('#ff5a5a'); g.lineWidth = 1.8; g.beginPath(); g.moveTo(N.x - 6, N.y + 2); g.quadraticCurveTo(N.x, N.y + 22, N.x + 6, N.y + 2); g.stroke(); piece(g, spline([{ x: N.x - 6, y: N.y + 18 }, { x: N.x + 6, y: N.y + 18 }, { x: N.x + 6, y: N.y + 25 }, { x: N.x - 6, y: N.y + 25 }]), '#ffd84a', 1.4); },
      itemR: (g, d, p, G, A, hc) => { if (!(p.whistle > 0.5)) return; piece(g, spline([{ x: hc.x - 6, y: hc.y - 14 }, { x: hc.x + 6, y: hc.y - 14 }, { x: hc.x + 6, y: hc.y - 7 }, { x: hc.x - 6, y: hc.y - 7 }]), '#ffd84a', 1.4); } },
    travelDad: { name: '旅のお父さん（大きなリュック・つば広の帽子）', J: J({ R: 27, bodyH: 88, topW: 26, hemW: 34, belly: 4, ua: 22, fa: 20, armW: 15, handR: 9, footR: 9.5, footGap: 11 }), head: 'round',
      face: '#ffd44a', robe: '#e0782a', cuff: '#4aa04a', pattern: { kind: 'zip', cols: ['#fff0d0', '#c85a1a'] },
      back: (g, d, p, G) => { const T = G.T, y0 = G.y0, J = d.J; piece(g, spline([T({ x: -J.topW * 1.35, y: y0 - J.R * 0.2 }), T({ x: J.topW * 1.35, y: y0 - J.R * 0.2 }), T({ x: J.topW * 1.45, y: y0 + J.bodyH * 0.55 }), T({ x: -J.topW * 1.45, y: y0 + J.bodyH * 0.55 })]), '#a85a3a', J.band);
        const r = T({ x: 0, y: y0 - J.R * 0.45 }); piece(g, spline([{ x: r.x - J.topW * 1.3, y: r.y - 9 }, { x: r.x + J.topW * 1.3, y: r.y - 9 }, { x: r.x + J.topW * 1.3, y: r.y + 9 }, { x: r.x - J.topW * 1.3, y: r.y + 9 }]), '#4aa04a', J.band); },
      hat: (g, R, b) => { piece(g, ell(0, -R * 0.7, R * 1.5, R * 0.22), '#7a9a3a', b); piece(g, spline([{ x: -R * 0.82, y: -R * 0.72 }, { x: -R * 0.7, y: -R * 1.25 }, { x: R * 0.7, y: -R * 1.25 }, { x: R * 0.82, y: -R * 0.72 }]), '#7a9a3a', b); } },
    travelKid: { name: '旅の子（黄色い雨がっぱ・うさぎのぬいぐるみ）', J: J({ R: 23, bodyH: 40, topW: 15, hemW: 22, ua: 14, fa: 12, armW: 11, handR: 7, footR: 7.2, footGap: 7, band: 2.6 }), head: 'round',
      face: '#f8f070', robe: '#ffd02a', cuff: '#2f8ad8', legs: '#ff6a5a', pattern: { kind: 'dots', cols: ['#2f8ad8', '#2f8ad8'], n: 2, size: 0.8 },
      back: (g, d, p, G) => { const T = G.T, y0 = G.y0, J = d.J; piece(g, spline([T({ x: -J.topW * 1.1, y: y0 + 2 }), T({ x: J.topW * 1.1, y: y0 + 2 }), T({ x: J.topW * 1.15, y: y0 + J.bodyH * 0.6 }), T({ x: -J.topW * 1.15, y: y0 + J.bodyH * 0.6 })]), '#ff6a5a', J.band); },
      hairBack: (g, R, b) => piece(g, spline([{ x: -R * 1.22, y: R * 0.3 }, { x: -R * 1.12, y: -R * 0.95 }, { x: 0, y: -R * 1.32 }, { x: R * 1.12, y: -R * 0.95 }, { x: R * 1.22, y: R * 0.3 }, { x: 0, y: R * 0.75 }]), '#ffd02a', b),
      itemR: (g, d, p, G, A, hc) => { g.save(); g.translate(hc.x, hc.y - 10); g.rotate(p.bunny || 0); for (const s of [-1, 1]) piece(g, ell(s * 4, -16, 3.4, 10, s * 0.2), '#ffd6e6', 1.6); piece(g, circ(0, -4, 8), '#ffd6e6', 1.8); piece(g, ell(0, 9, 7, 8), '#ffd6e6', 1.8); g.fillStyle = LEA; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 2.8, -5, 1.1, 0, TAU); g.fill(); } g.restore(); } },
    worker: { name: '夜勤明けの作業員（ヘルメット・魔法瓶）', J: J({ R: 27, bodyH: 86, topW: 27, hemW: 34, belly: 6, ua: 23, fa: 21, armW: 16, handR: 9.5, footR: 10, footGap: 12, band: 3.4 }), head: 'wide',
      face: '#ffc848', robe: '#e85a2a', cuff: '#f4f4c0', pattern: { kind: 'stripes', cols: ['#f4f4c0'] },
      // ヘルメット：p.helmet 0＝頭の上・1＝右の手に持つ。間（0〜1）は、つばを持った右の手といっしょに、頭から手へ動く（頭の上で薄れて消えない。本人 2026-10-22「勝手に消えたり落ちたりしない」）
      hat: (g, R, b, p) => { if ((p.helmet || 0) > 0) return; helmetAt(g, 0, -R * 0.5, 0, 1, R, b); },
      hairBack: (g, R, b) => piece(g, spline([{ x: -R * 0.95, y: -R * 0.3 }, { x: -R * 0.8, y: -R * 0.9 }, { x: 0, y: -R * 1.02 }, { x: R * 0.8, y: -R * 0.9 }, { x: R * 0.95, y: -R * 0.3 }, { x: 0, y: -R * 0.7 }]), LEA, 0),
      itemR: (g, d, p, G, A, hc) => { const o = clamp(p.helmet || 0, 0, 1);
        if (o > 0) { const R = d.J.R, e = o * o * (3 - 2 * o), hd = rot({ x: G.head.x, y: G.head.y - R * 0.5 }, G.head, (p.tilt || 0) + G.L), hh = { x: hc.x, y: hc.y - 12 };
          helmetAt(g, lerp(hd.x, hh.x, e), lerp(hd.y, hh.y, e), lerp((p.tilt || 0) + G.L, -0.25, e), lerp(1, 0.8, e), R, 2.4); return; }
        if (p.thermos === false) return; piece(g, spline([{ x: hc.x - 7, y: hc.y - 26 }, { x: hc.x + 7, y: hc.y - 26 }, { x: hc.x + 7, y: hc.y + 14 }, { x: hc.x - 7, y: hc.y + 14 }]), '#3ab0d8', 2.4); piece(g, spline([{ x: hc.x - 8, y: hc.y - 33 }, { x: hc.x + 8, y: hc.y - 33 }, { x: hc.x + 8, y: hc.y - 25 }, { x: hc.x - 8, y: hc.y - 25 }]), '#e8e8f0', 2); } },
    stargazer: { name: '星好きのおじいさん（ベレー帽・白い口ひげ）', J: J({ R: 26, bodyH: 78, topW: 23, hemW: 33, ua: 21, fa: 19, armW: 14, handR: 8.5 }), head: 'tall', brows: '#eee8f8',
      face: '#fff4b0', robe: '#4a46b0', cuff: '#ffd84a', pattern: { kind: 'moons', cols: ['#ffd84a', '#fff4dc', '#ffd84a'], n: 3 },
      hat: (g, R, b) => { piece(g, spline([{ x: -R * 1.05, y: -R * 0.5 }, { x: -R * 0.6, y: -R * 1.18 }, { x: R * 0.5, y: -R * 1.22 }, { x: R * 1.2, y: -R * 0.82 }, { x: R * 0.95, y: -R * 0.45 }]), '#c83a3a', b); piece(g, circ(R * 0.05, -R * 1.25, R * 0.1), '#c83a3a', b * 0.6); },
      beard: (g, R, b, p, yw, fx) => { for (const s of [-1, 1]) piece(g, spline([{ x: fx, y: R * 0.18 }, { x: fx + s * R * 0.5, y: R * 0.1 }, { x: fx + s * R * 0.62, y: R * 0.32 }, { x: fx + s * R * 0.12, y: R * 0.32 }]), '#eee8f8', b * 0.6); } },
    priest: { name: '大聖堂の司祭（白い衣・金の肩かけ）', J: J({ R: 27, bodyH: 98, topW: 24, hemW: 38, ua: 23, fa: 21, armW: 15, handR: 9 }), head: 'round',
      face: '#ffe68a', robe: '#f4ecd8', cuff: '#ffd84a', pattern: { kind: 'diamond', cols: ['#ffd84a'], n: 1, size: 1.1 }, stole: ['#ffd84a', '#ff6a5a', '#ffd84a'],
      hairBack: (g, R, b) => { for (const s of [-1, 1]) piece(g, spline([{ x: s * R * 0.78, y: -R * 0.62 }, { x: s * R * 1.1, y: -R * 0.3 }, { x: s * R * 1.06, y: R * 0.18 }, { x: s * R * 0.86, y: R * 0.0 }]), '#d8d0e8', b * 0.8); } },
  };
  // 作業員のヘルメット（つばの中心が原点・k＝大きさ）：頭の上と手の中で同じ形
  function helmetAt(g, x, y, a, k, R, b) { g.save(); g.translate(x, y); g.rotate(a); g.scale(k, k);
    piece(g, spline([{ x: -R * 1.0, y: 0 }, { x: -R * 0.85, y: -R * 0.65 }, { x: 0, y: -R * 0.88 }, { x: R * 0.85, y: -R * 0.65 }, { x: R * 1.0, y: 0 }]), '#ffcc22', b); piece(g, ell(0, 0, R * 1.22, R * 0.13), '#ffcc22', b * 0.9); g.restore(); }
  // ランタン（指揮者の手元の1灯）：手から下がる枠と、中の灯りの膜
  function lanternAt(g, x, y, sw, lit) { g.save(); g.translate(x, y); g.rotate(sw); g.lineCap = 'round'; g.strokeStyle = LEA; g.lineWidth = 2.6; g.beginPath(); g.arc(0, 0, 6, Math.PI, TAU); g.stroke();
    piece(g, spline([{ x: -12, y: 8 }, { x: 12, y: 8 }, { x: 10, y: 40 }, { x: -10, y: 40 }]), lit > 0.5 ? '#ffe28a' : '#c8a060', 3); g.strokeStyle = LEA; g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 8); g.lineTo(0, 40); g.stroke();
    piece(g, spline([{ x: -15, y: 2 }, { x: 15, y: 2 }, { x: 12, y: 9 }, { x: -12, y: 9 }]), LEA, 0); piece(g, spline([{ x: -12, y: 40 }, { x: 12, y: 40 }, { x: 14, y: 46 }, { x: -14, y: 46 }]), LEA, 0); g.restore(); }
  // 小さなスーツケース（女の子の持ち物。立っている時は足もとに置く）：足もと＝原点
  function suitcaseAt(g, x, y, s = 1) { g.save(); g.translate(x, y); g.scale(s, s); piece(g, spline([{ x: -26, y: -46 }, { x: 26, y: -46 }, { x: 27, y: -2 }, { x: -27, y: -2 }]), '#b8643a', 3); g.strokeStyle = LEA; g.lineWidth = 3.4; g.beginPath(); g.moveTo(-9, -46); g.quadraticCurveTo(0, -58, 9, -46); g.stroke();
    for (const s2 of [-1, 1]) { g.lineWidth = 2.4; g.beginPath(); g.moveTo(s2 * 14, -46); g.lineTo(s2 * 14, -2); g.stroke(); } piece(g, circ(-14, -30, 6), '#ffd84a', 1.4); piece(g, spline([{ x: 4, y: -22 }, { x: 18, y: -22 }, { x: 18, y: -12 }, { x: 4, y: -12 }]), '#5ac8ff', 1.4); g.restore(); }
  for (const k in DOLLS) DOLLS[k].id = k;

  // ---------- 1本目・2本目の仲間（大聖堂の会衆の中の小さな影）----------
  // ジンジャーブレッド（2本目の主役＝胸の金のボタンが1つだけ）・テディ（緑のセーター、ボタンは縫い付けた1つ）・1本目の仲間（王冠・赤いマフラー・ツリーの箱・クッキーの缶）
  // 足もと＝原点。p.up：腕の上がり（0＝下ろす・1＝万歳）、p.clap：胸の前の手拍子（1＝手が合う）、p.hop：跳ね
  const MINI = {
    ginger: { film: '#d98a3a', h: 1, buttons: ['#ffd84a'] },
    crown: { film: '#e09440', h: 0.94, buttons: ['#ff5a5a', '#3ad08a'], crown: true },
    scarf: { film: '#d4823a', h: 1.04, buttons: ['#5ac8ff'], scarf: true },
    box: { film: '#dc8e3c', h: 1.08, buttons: ['#ffd84a', '#ff5a5a'], box: true },
    tin: { film: '#e29a46', h: 0.9, buttons: ['#ff8ab8'], tin: true },
    teddy: { teddy: true, h: 1.12 },
  };
  function mini(g, kind, p = {}) {
    const m = MINI[kind], s = m.h, hop = (p.hop || 0) * 10, up = clamp(p.up || 0, 0, 1), cl = clamp(p.clap || 0, 0, 1);
    g.save(); g.translate(0, -hop); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    const film = m.teddy ? '#c88a4a' : m.film, hR = m.teddy ? 21 : 17, hy = m.teddy ? -94 : -92, sh = { x: 15, y: -70 };
    // 腕：下ろす（外・下）→ 万歳（外・上）。手拍子は胸の前で合う（両腕とも体の前）
    const handAt = (s2) => { const ax = lerp(lerp(30, 34, up), 5, cl), ay = lerp(lerp(-44, -112, up), -62, cl); return { x: s2 * ax, y: ay }; };
    const armD = (s2) => { const h = handAt(s2), S = { x: s2 * sh.x, y: sh.y }; g.strokeStyle = LEA; g.lineWidth = 15; g.beginPath(); g.moveTo(S.x, S.y); g.lineTo(h.x, h.y); g.stroke(); g.strokeStyle = dk(m.teddy ? '#2f9e5c' : film); g.lineWidth = 10; g.stroke(); piece(g, circ(h.x, h.y, 6.5), film, 2.4); };
    if (cl < 0.5) { armD(-1); armD(1); }
    for (const s2 of [-1, 1]) { g.strokeStyle = LEA; g.lineWidth = 17; g.beginPath(); g.moveTo(s2 * 9, -34); g.lineTo(s2 * 12, -6); g.stroke(); g.strokeStyle = dk(film); g.lineWidth = 12; g.stroke(); }
    const body = spline([{ x: -18, y: -76 }, { x: 18, y: -76 }, { x: 22, y: -48 }, { x: 16, y: -28 }, { x: -16, y: -28 }, { x: -22, y: -48 }]);
    piece(g, body, m.teddy ? '#2f9e5c' : film, 3);
    if (m.teddy) { piece(g, circ(0, -60, 3.6), '#ffd84a', 1.4); g.strokeStyle = LEA; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -46, 3.4, 0, TAU); g.stroke(); }   // 縫い付けた金のボタン1つと、取れたままの1つ（糸の穴）
    else { m.buttons.forEach((c, i) => piece(g, circ(0, -64 + i * 13, 3.4), c, 1.3)); g.strokeStyle = dk('#fff6e6'); g.lineWidth = 2; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(s2 * 6, -8); g.quadraticCurveTo(s2 * 12, -13, s2 * 17, -8); g.stroke(); } }
    if (m.scarf) { piece(g, spline([{ x: -16, y: -80 }, { x: 16, y: -80 }, { x: 15, y: -72 }, { x: -15, y: -72 }]), '#e8283a', 2); piece(g, spline([{ x: 6, y: -76 }, { x: 13, y: -76 }, { x: 16, y: -50 }, { x: 9, y: -50 }]), '#e8283a', 2); }
    // 頭
    if (m.teddy) for (const s2 of [-1, 1]) { piece(g, circ(s2 * 15, hy - 16, 8), film, 2.6); piece(g, circ(s2 * 15, hy - 16, 3.6), '#f0c890', 0); }
    piece(g, circ(0, hy, hR), film, 3);
    if (m.teddy) piece(g, ell(0, hy + 7, 9, 6.5), '#f0c890', 1.6);
    g.fillStyle = LEA; for (const s2 of [-1, 1]) { g.beginPath(); g.arc(s2 * 6.5 + (p.look || 0) * 1.5, hy - 3, 2.2, 0, TAU); g.fill(); }
    g.strokeStyle = m.teddy ? LEA : dk('#fff6e6'); g.lineWidth = 2; g.beginPath(); g.arc(0, hy + (m.teddy ? 6 : 3), 6, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
    if (m.crown) { const q = new Path2D(); q.moveTo(-13, hy - 12); for (let k = 0; k <= 4; k++) q.lineTo(-13 + k * 6.5, hy - (k % 2 ? 20 : 28)); q.lineTo(13, hy - 12); q.closePath(); piece(g, q, '#ffd23a', 2); }
    if (m.box) { piece(g, spline([{ x: -26, y: hy - 22 }, { x: 26, y: hy - 22 }, { x: 26, y: hy - 48 }, { x: -26, y: hy - 48 }]), '#4e7656', 2.4); }
    if (m.tin) { piece(g, ell(0, -54, 13, 9), '#2a5ab0', 2); piece(g, ell(0, -60, 13, 5), '#ffd23a', 1.6); }
    if (cl >= 0.5) { armD(-1); armD(1); }
    g.restore();
  }
  // 部品の組み合わせ（同じ姿が2人いないかを機械で数える）
  const PARTS = {};
  for (const k in DOLLS) { const d = DOLLS[k], J = d.J;
    PARTS[k] = { 頭の大きさ: J.R, 頭の形: d.head, 背丈: J.bodyH, 体つき: `${J.topW}/${J.hemW}/${J.belly}`, 顔の色: d.face, 衣: d.robe, 模様: (d.pattern || {}).kind + (d.pattern || {}).n, 肩かけ: (d.stole || ['なし']).join(''),
      髪: d.hair ? '影' : d.hairBack ? '後ろ' : 'なし', 帽子: d.hat ? 'あり' : 'なし', ひげ: d.beard ? 'あり' : 'なし', 眼鏡: d.glasses ? 'あり' : 'なし', 持ち物: d.itemR || d.itemL ? 'あり' : d.held ? '赤ちゃん' : 'なし' }; }
  PARTS.twinA.帽子 = '赤いぼんぼり帽'; PARTS.twinB.帽子 = '緑の耳当て帽';
  for (const k in DOLLS) if (DOLLS[k].glasses) PARTS[k].眼鏡 = DOLLS[k].glasses === 'square' ? '角' : '丸';
  window.KD = { DOLLS, PARTS, draw, geo, armIK, seated, mini, MINI, lanternAt, suitcaseAt, pattern, setFilm: (f) => { FILM = f; } };
})();
