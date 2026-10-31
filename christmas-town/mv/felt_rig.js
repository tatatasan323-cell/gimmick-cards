// 写し：動画制作ラボ/MV/クリスマス/folk/見本/felt_rig.js（MV は完成済み・元は書きかえない）。グリーティングカードの絵で、MV の人物をそのまま描くために使う（共通/greet_cards.js が、その絵の時だけ読む）
// フォークの見本：フェルトの15関節の人形（window.FR）。ジンジャーブレッドとテディベア。
// lib/gingerrig.js（1本目のクッキーの15関節）を写して、フェルトの描き方とテディの体を足した。1本目のファイルは書きかえない（1本目は完成済み）。
// 関節・角度・寸法の名前は gingerrig.js と同じ（hiphop/moves.js の写し felt_moves.js が、どちらの人形にもそのまま使える）。
//
// 前後の規則（本人 2026-10-18・19）：前後は「どの面がカメラを向いているか」で決める。腕の高さでは変えない。
//   横向き（prof）：奥の脚 → 奥の腕（肩ごと胴の向こう）→ farHand（奥の手だけで持つ物）→ 胴と頭（耳・リボンを含む）
//                   → head（体の前に持つ物）→ 手前の腕（上げても下ろしても、顔・耳・リボン・持ち物より手前）→ front → hand
//   正面（本人 2026-10-19「正面むいたときは両腕とも身体の後ろの方が自然」）：腕は胴の横に付いていて、正面からは付け根が胴に隠れる。
//     腕を下ろす・横に開く・万歳・手を振る＝両腕とも付け根から胴（と頭）の後ろ。体の前で物を抱える・持つ（foreL/foreR）＝その腕は付け根ごと胴の手前（本人「前で何かを抱えているなら腕も前でいい」）
//   傾いている（斜め・横）：奥の腕だけ胴と頭の後ろ、手前の腕は胴の手前。斜めで奥の腕が体の前で抱える時は前（横向きの奥の手は、持った物の向こうのまま）
//   ※ 上の場合分け（lean・fore・back・mid・front）は、テディだけが使う（本人が自然と言った版のまま）
//   ジンジャーブレッドは、場合分けではなく奥行きの計算で重ねる（本人 2026-10-19「前後のレイヤーの間隔は、どの位置にいるかの距離に関係するに決まっている」）：
//     体の向き yaw（度。0＝正面・+90＝画面の右を向く横・−90＝左・180＝後ろ）と、手を前へ出す量 fwdL/fwdR（人形の単位。ひじは elFwdL/R 割、既定 0.45）を場面が渡す
//     体の座標 u＝その子の左（正面では画面の右）・f＝その子の前。カメラから見た奥行き（手前が正）z = f·cos(yaw) − u·sin(yaw)
//     胴＝楕円の柱（左右の半幅＝胴の幅の半分・前後の半幅 GD）、頭＝球。腕は胴の横（u＝±(胴の半幅＋腕の半幅)）に付く
//     腕を上腕2・前腕2・手1に分け、部分ごとに、その位置の胴・頭の表面の奥行きより手前なら胴・頭の後に、奥なら先に描く（順が絵に出るのは画面で重なる所）。同じ重ね順の中は奥行きの順（gbPlan）
//     持った物：heldL/heldR はその手のすぐ後（同じ前後）、back と head は両手で持つ物（場面が both を立てた時。近い方の手のすぐ奥）
//   向きは lean（−1 左・0 正面・+1 右）。無い時は、横向きなら進む向き、斜めは顔の向き turn（|turn|≥0.3）で決める。顔だけ振り向く時は、場面が lean を渡して体の向きを保つ
//   後ろ姿（spin<0）は backL/backR を立てて、両腕を胴の向こうへ
//   手の前後は、②手が触れている物の奥行きでも決まる（本人の直し 2026-10-19 A 5.25秒）：後ろの壁・棚の物へ伸ばす手は、頭と顔より奥＝ midL/midR（胴 → 腕 → 頭の順。
//   肩は胴の横に付いたまま、頭と重なる所は頭が手を隠す）。その手で持った物は midHeld のフックで、その腕のすぐ前に描く。手が顔に重なる時は、本当に顔の前にあるか（顔の前の物・顔にさわる）を確かめる
//   奥と手前は進む向きで決まる：右を向けば画面の右の手足が奥、左を向けば左が奥（gingerrig.js と同じ）
// 手足の飾り（アイシングの糸・袖口・肉球）は、その手足の層で描く。奥の手足は飾りごと少し暗く。
// pass：'body'＝胴まで（テーブルに隠れる体）、'over'＝体の前に持つ物と手前の腕から先（テーブルの上に置く手）。テーブルの前後を分ける時だけ使う
// 約束：絵は引数だけで決まる。Math.random は使わない
(() => {
  const TAU = Math.PI * 2;
  const REST = { air: 0, sx: 1, sy: 1, spin: 1, hx: 0, hy: 0, pelvis: 0, waist: 0, neck: 0,
    shL: 0.28, elL: 0.12, wrL: 0, shR: 0.28, elR: 0.12, wrR: 0, hipL: 0.04, kneeL: 0, ankL: 0, hipR: 0.04, kneeR: 0, ankR: 0, legSL: 1, legSR: 1, armSL: 1, armSR: 1, dir: 1,
    mouth: 0, smile: 1, look: 0, lookY: 0, blink: 0, lid: 0, turn: 0, brow: 0, wide: 0, backL: 0, backR: 0, frontL: 0, frontR: 0, prof: 0, soles: 0, mitts: 0, t: 0 };
  // 寸法（人形の単位）。ginger は gingerrig.js の大人と同じ。teddy は同じ大きさ（sc）で耳の先までがジンジャーブレッドの約1.6倍
  const BODY = {
    ginger: { th: 33, sh: 31, hipX: 12, waistY: -20, chestY: -14, shX: 21, shY: -15, ua: 26, fa: 23, neckY: -24, headR: 27, legW: 25, armW: 20, torsoW: 50, handR: 11, footR: 11.5 },
    teddy: { th: 31, sh: 26, hipX: 23, waistY: -36, chestY: -29, shX: 40, shY: -24, ua: 36, fa: 33, neckY: -44, headR: 56, legW: 44, armW: 34, torsoW: 112, handR: 17, footR: 18, belly: 30 },
  };
  function make(kind, look = {}) {
    const B = BODY[kind], J = Object.assign({}, B);
    J.stand = B.th + B.sh + B.footR * 0.7;
    const base = kind === 'teddy'
      ? { fur: '#d29a4a', fuzz: '#8a5a26', light: '#f2d39a', knit: '#3f7a4c', rib: '#2f5f3a', thread: 'rgba(255,240,214,.5)', ribbon: '#e04a6a', mend: '#7ab0d8' }
      : { cookie: '#b5733a', fuzz: '#6e3e1c', icing: '#fff6e8', gold: '#e8b830', goldRim: '#a8761a' };
    return { kind, J, look: Object.assign(base, look) };
  }
  const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  // 関節の位置（足もと＝原点、上が −y）。gingerrig.js の fk と同じ。テディは胴の丸みの下の中心（torso[0]）を腰より上に置く
  function fk(ch, p) {
    const J = ch.J, P = {}, root = { x: p.hx, y: -J.stand + p.hy };
    P.root = root;
    const hipX = J.hipX * (1 - 0.65 * p.prof);
    for (const side of [1, -1]) { const k = side > 0 ? 'L' : 'R', hip = add(root, { x: -side * hipX, y: 0 });
      const ls = p['legS' + k] ?? 1, a1 = side * p['hip' + k], knee = add(hip, rot(0, J.th * ls, a1)), a2 = a1 + side * p['knee' + k], ank = add(knee, rot(0, J.sh * ls, a2)), a3 = a2 + side * p['ank' + k];
      P['leg' + k] = [hip, knee, ank]; P['foot' + k] = add(ank, rot(V.lerp(-side * J.footR * 0.15, (p.dir ?? 1) * J.footR * 0.5, p.prof), J.footR * 0.2, a3)); P['footA' + k] = a3; }
    const pa = p.pelvis, ca = pa + p.waist, waist = add(root, rot(0, J.waistY, pa));
    P.torso = [add(root, rot(0, J.belly ? -J.belly : 9, pa)), waist, add(waist, rot(0, J.chestY, ca))]; P.waist = waist; P.chestA = ca;
    for (const side of [1, -1]) { const k = side > 0 ? 'L' : 'R', sh = add(waist, rot(-side * J.shX, J.shY, ca));
      const as = p['armS' + k] ?? 1, a1 = ca + side * p['sh' + k], el = add(sh, rot(0, J.ua * as, a1)), a2 = a1 + side * p['el' + k], wr = add(el, rot(0, J.fa * as, a2)), a3 = a2 + side * p['wr' + k];
      P['arm' + k] = [sh, el, wr]; P['hand' + k] = add(wr, rot(0, J.handR * 0.55, a3)); P['handA' + k] = a3; }
    const neck = add(waist, rot(0, J.neckY, ca)), ha = ca + p.neck;
    P.neck = neck; P.headA = ha; P.head = add(neck, rot(0, -J.headR * 0.78, ha));
    // テディのセーターのボタン（上から0・1・2）。前あきの線は、顔の向き（turn）の側へ寄る
    if (J.belly) { const px = p.turn * J.torsoW * 0.16;
      P.buttons = [-60, -38, -16].map((y) => add(root, rot(px, y, pa))); P.placketTop = add(root, rot(px, -68, pa)); P.placketBot = add(root, rot(px, 22, pa)); }
    return P;
  }
  // ---------- 画用紙（使い回し。消す時は全体を消す：前の大きい人形の残りが縁ににじむのを防ぐ。gingerrig.js 2026-10-18 の教訓） ----------
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 8; return [c, c.getContext('2d')]; };
  const [OFF, og] = mk(), [PRT, pg] = mk(), [SCR, sg] = mk();
  const fit = (c, n) => { if (c.width < n || c.height < n) { c.width = c.height = n; } };
  const wipe = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.filter = 'none'; g.setLineDash([]); g.clearRect(0, 0, 1e4, 1e4); };
  // フェルトの布目（毛羽の短い線）と、セーターの編み目（Vの並び）。読み込み後に一度だけ作る
  let FT = null, KT = null;
  const feltTile = () => { if (FT) return FT; FT = document.createElement('canvas'); FT.width = FT.height = 128; const g = FT.getContext('2d'), r = V.rng(77);
    for (let i = 0; i < 1500; i++) { const x = r() * 128, y = r() * 128, a = r() * TAU, l = 1 + r() * 3.8; g.strokeStyle = r() < 0.5 ? 'rgba(255,244,226,.20)' : 'rgba(40,20,10,.17)'; g.lineWidth = 0.5 + r() * 0.7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    return FT; };
  const knitTile = () => { if (KT) return KT; KT = document.createElement('canvas'); KT.width = 16; KT.height = 14; const g = KT.getContext('2d'); g.lineCap = 'round';
    for (const x of [4, 12]) { g.strokeStyle = 'rgba(0,0,0,.20)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x - 3.2, 2); g.lineTo(x, 11); g.lineTo(x + 3.2, 2); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 2.4, 1.4); g.lineTo(x, 9); g.stroke(); }
    return KT; };
  const pat = (g, tile, scale) => { const q = g.createPattern(tile(), 'repeat'); q.setTransform(new DOMMatrix().scale(scale)); return q; };
  const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke(); };
  const dot = (g, q, r) => { g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, r), 0, TAU); g.fill(); };
  let CUR = null;   // 描いている人形：{ K（人形の単位→画素）, kw（世界の単位→画素）, toOff, N }
  // 1枚のフェルト（画用紙 SCR に描いて dst へ）：毛羽の縁 → 布の色 → 縫い目 → 布目 →（編み目）→ ふくらみの明るさ
  // shape(g, add)＝形を add だけ太らせて塗る（線の手足も、丸の頭も同じ口）。o.limb＝{pts,w}：手足の両わきに縫い目、o.ring(g, inset)：丸い形の内側に縫い目
  function blob(dst, shape, col, o = {}) {
    const C = CUR; wipe(sg); C.toOff(sg); sg.lineCap = 'round'; sg.lineJoin = 'round';
    if (o.fuzz) { sg.globalAlpha = 0.6; sg.fillStyle = sg.strokeStyle = o.fuzz; shape(sg, 3.0); sg.globalAlpha = 1; }
    sg.fillStyle = sg.strokeStyle = col; shape(sg, 0);
    if (o.patch) o.patch(sg);
    if (o.limb) { const { pts, w } = o.limb; sg.lineCap = 'butt'; sg.setLineDash([4.5, 3.6]); sg.strokeStyle = o.thread; sg.lineWidth = w - 3.6; line(sg, pts); sg.setLineDash([]); sg.lineCap = 'round'; sg.strokeStyle = col; sg.lineWidth = w - 8; line(sg, pts); }
    if (o.ring) { sg.save(); sg.setLineDash([4, 3.4]); sg.lineWidth = 1.9; sg.strokeStyle = o.thread; o.ring(sg, 4.4); sg.stroke(); sg.restore(); }
    sg.globalCompositeOperation = 'source-atop'; sg.setTransform(1, 0, 0, 1, 0, 0);
    sg.fillStyle = pat(sg, feltTile, C.kw); sg.fillRect(0, 0, C.N, C.N);
    if (o.knit) { sg.fillStyle = pat(sg, knitTile, C.K * 0.55); sg.fillRect(0, 0, C.N, C.N); }
    if (!o.flat) { C.toOff(sg); sg.filter = `blur(${(2.6 * C.K).toFixed(1)}px)`; sg.globalAlpha = 0.17; sg.fillStyle = sg.strokeStyle = '#fff8ec'; sg.translate(-1.6, -2.4); shape(sg, -8); sg.filter = 'none'; sg.globalAlpha = 1; }
    sg.globalCompositeOperation = 'source-over';
    dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.drawImage(SCR, 0, 0); dst.restore();
  }
  // 小さなフェルト（持ち物・ボタンなど）を、今の座標のまま直接貼る：塗り → 布目 → 内側の縫い目。path(g, inset) で形を作る
  function piece(g, path, col, o = {}) {
    const C = CUR; g.save(); if (o.sh) { g.save(); g.shadowColor = 'rgba(60,30,20,.3)'; g.shadowBlur = o.sh * C.kw; g.shadowOffsetY = o.sh * 0.5 * C.kw; path(g, 0); g.fillStyle = col; g.fill(); g.restore(); }
    path(g, 0); g.fillStyle = col; g.fill();
    if (o.edge) { g.lineWidth = o.edgeW || 1.4; g.strokeStyle = o.edge; g.stroke(); }
    g.save(); path(g, 0); g.clip(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = pat(g, feltTile, C.kw); g.fillRect(0, 0, C.N, C.N); g.restore();
    if (o.thread) { g.setLineDash(o.dash || [3.2, 2.8]); g.lineWidth = o.tw || 1.5; g.strokeStyle = o.thread; path(g, o.inset ?? 3); g.stroke(); g.setLineDash([]); }
    g.restore();
  }
  const circ = (q, r) => (g, i) => { g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, r - i), 0, TAU); };
  const ell = (q, rx, ry, a = 0) => (g, i) => { g.beginPath(); g.ellipse(q.x, q.y, Math.max(0.5, rx - i), Math.max(0.5, ry - i), a, 0, TAU); };
  // 2点を結ぶ丸い筒（テディの胴）。内側の縫い目を描けるように、太さを add で変える
  const capsule = (a, b, r) => (g, i) => { const ang = Math.atan2(b.y - a.y, b.x - a.x), rr = Math.max(0.5, r - i); g.beginPath(); g.arc(b.x, b.y, rr, ang - Math.PI / 2, ang + Math.PI / 2); g.arc(a.x, a.y, rr, ang + Math.PI / 2, ang + Math.PI * 1.5); g.closePath(); };
  // ボタン（2つ穴・糸）：col＝布の色、hole＝穴の色、thread＝穴を渡る糸の色、sewn＝縫った回数（0〜3。1回ごとに糸の筋が足される）
  function button(g, q, r, col, rim, thread, sewn = 3) {
    piece(g, circ(q, r), col, { edge: rim, edgeW: r * 0.16 });
    g.save(); g.fillStyle = 'rgba(255,255,255,.45)'; dot(g, { x: q.x - r * 0.38, y: q.y - r * 0.42 }, r * 0.22);
    g.fillStyle = 'rgba(40,24,8,.75)'; for (const d of [-1, 1]) dot(g, { x: q.x + d * r * 0.32, y: q.y }, r * 0.15);
    if (sewn > 0) { g.strokeStyle = thread; g.lineCap = 'round'; for (let k = 0; k < Math.min(3, sewn); k++) { g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(q.x - r * 0.32, q.y + (k - 1) * r * 0.07); g.lineTo(q.x + r * 0.32, q.y + (k - 1) * r * 0.07); g.stroke(); } }
    g.restore();
  }
  // ---------- ジンジャーブレッド（フェルトのクッキー） ----------
  function gShape(ch, P, part, skipK) { const J = ch.J;
    return (g, w) => {
      if (part === 'baseHead') { g.lineWidth = J.torsoW * 0.62 + w; line(g, [P.neck, P.head]); dot(g, P.head, J.headR + w / 2); return; }
      if (part.startsWith('base') || part.startsWith('leg')) {
        for (const k of part.startsWith('base') ? ['L', 'R'].filter((q) => q !== skipK) : [part.slice(3)]) { g.lineWidth = J.legW + w; line(g, P['leg' + k]); dot(g, P['foot' + k], J.footR + w / 2); }
        if (!part.startsWith('base')) return;
        g.lineWidth = J.torsoW + w; line(g, P.torso); if (part === 'baseBody') return; g.lineWidth = J.torsoW * 0.62 + w; line(g, [P.neck, P.head]); dot(g, P.head, J.headR + w / 2);
      } else { const k = part.slice(-1); g.lineWidth = J.armW + w; line(g, P['arm' + k]); dot(g, P['hand' + k], J.handR + w / 2); } };
  }
  // アイシングの波線（白い糸の縫い目）：a→b の先の方に、横切る波
  function squiggle(g, a, b, back, wid) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux, cx = b.x - ux * back, cy = b.y - uy * back;
    g.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8 - 0.5, w = (k % 2 ? 2.2 : -2.2); const x = cx + px * u * wid + ux * w, y = cy + py * u * wid + uy * w; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  // 胸の金のボタン3つ（下から0・1・2）の位置。p.btn[i]=0 は外した後（糸の穴とほつれだけ）
  const gButtons = (P) => { const [t0, , t2] = P.torso; return [0.3, 0.55, 0.8].map((u) => ({ x: t0.x + (t2.x - t0.x) * u, y: t0.y + (t2.y - t0.y) * u })); };
  function gPaint(ch, P, p, part, front, dark, far) {
    const J = ch.J, L = ch.look, skip = part.startsWith('base') && far ? CUR.farK : null, withBody = part === 'base' || part === 'baseBody', withHead = part === 'base' || part === 'baseHead';
    const isArm = part.startsWith('arm'), k = part.slice(-1);
    const patch = part === 'baseHead' ? (g) => { g.save(); g.filter = `blur(${(2 * CUR.K).toFixed(1)}px)`; g.fillStyle = L.cookie; dot(g, P.neck, J.torsoW * 0.36); g.restore(); }   // 首の付け根：頭だけ後から描く時、毛羽の輪が胴の上で切れて見えないように
      : isArm && !dark ? (g) => { const sh = P['arm' + k][0]; g.save(); g.filter = `blur(${(1.8 * CUR.K).toFixed(1)}px)`; g.fillStyle = L.cookie; dot(g, sh, J.armW * 0.55); g.restore(); } : null;   // 手前の腕の付け根：毛羽の輪が胴の上で切れて見えないよう、継ぎ目だけ布の色でなじませる（腕は不透明のまま）
    blob(pg, gShape(ch, P, part, skip), L.cookie, { fuzz: L.fuzz, patch });
    if (!front) { pg.save(); pg.setTransform(1, 0, 0, 1, 0, 0); pg.globalCompositeOperation = 'source-atop'; pg.fillStyle = 'rgba(90,44,12,.16)'; pg.fillRect(0, 0, CUR.N, CUR.N); pg.restore(); return; }   // 後ろ姿：クッキーの裏は、焼き色が少し濃い
    const g = pg; g.save(); CUR.toOff(g); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = L.icing; g.lineWidth = 2.5; g.setLineDash([2.6, 2.1]);
    const legs = withBody ? ['L', 'R'].filter((q) => q !== skip) : part.startsWith('leg') ? [k] : [];
    for (const q of legs) squiggle(g, P['leg' + q][1], P['leg' + q][2], 2, J.legW * 0.95);
    if (isArm && !p.mitts) squiggle(g, P['arm' + k][1], P['arm' + k][2], 4, J.armW * 0.95);
    g.setLineDash([]);
    if (isArm && p.mitts) { const h = P['hand' + k], a = P['handA' + k];   // 鍋つかみ（赤いフェルト・白い口）
      piece(g, (gg, i) => { gg.beginPath(); gg.ellipse(h.x, h.y, 10 - i, 11.5 - i, a, 0, TAU); }, '#d8343a', { thread: 'rgba(255,240,230,.8)', inset: 2.6 });
      const c2 = { x: h.x - Math.sin(a) * -8.5, y: h.y + Math.cos(a) * -8.5 }; piece(g, (gg, i) => { gg.beginPath(); gg.ellipse(c2.x, c2.y, 9 - i, 4.2 - i, a, 0, TAU); }, '#f4ece0'); }
    if (withBody) {
      const bs = gButtons(P), on = p.btn || [1, 1, 1];
      bs.forEach((q, i) => { if (on[i]) button(g, q, 4.7, L.gold, L.goldRim, 'rgba(120,80,10,.8)');
        else { g.fillStyle = 'rgba(60,28,8,.7)'; for (const d of [-1, 1]) dot(g, { x: q.x + d * 1.8, y: q.y }, 0.9); g.strokeStyle = 'rgba(232,184,48,.9)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(q.x + 1.8, q.y); g.quadraticCurveTo(q.x + 4, q.y + 2, q.x + 3, q.y + 4.5); g.stroke(); } });   // 外した跡：糸の穴2つと、切れた金の糸
    }
    if (withHead) {   // 顔（頭の向きで回し、turn で横を向く）
      g.translate(P.head.x, P.head.y); g.rotate(P.headA); const tx = p.turn * 7, lx = p.look * 2.6 + tx, ly = p.lookY * 2, wd = 1 + 0.45 * p.wide, eyeH = 3.8 * (1 - 0.88 * p.blink) * wd;
      for (const ex of [-7.5, 7.5]) { const sq = 1 - 0.25 * Math.abs(p.turn) * (Math.sign(ex) === Math.sign(p.turn) ? 1 : -0.4); g.fillStyle = '#2a1206'; g.beginPath(); g.ellipse(ex * sq + lx, -4 + ly, 3.1 * sq * wd, eyeH, 0, 0, TAU); g.fill();
        if (p.blink < 0.5) { g.fillStyle = '#ffffff'; dot(g, { x: ex * sq + lx - 1 * wd, y: -5.6 * wd + ly }, 1.1 * wd); } }
      g.strokeStyle = L.icing;
      if (Math.abs(p.brow) > 0.05) { g.lineWidth = 2; for (const ex of [-7.5, 7.5]) { const a = -Math.sign(ex) * p.brow * 0.5; g.save(); g.translate(ex + tx, -11.5 - (p.browY ?? Math.max(0, p.brow) * 2)); g.rotate(a); g.beginPath(); g.moveTo(-3.4, 0); g.lineTo(3.4, 0); g.stroke(); g.restore(); } }
      g.lineWidth = 2.4;
      if (p.mouth > 0.12) { const h = 1.5 + p.mouth * 6.5, w = 5 + p.mouth * 1.5; g.fillStyle = '#5a1810'; g.beginPath(); g.ellipse(tx * 1.1, 6, w, h, 0, 0, TAU); g.fill(); g.setLineDash([2.4, 1.8]); g.stroke(); g.setLineDash([]); }
      else if (p.frown > 0.3) { g.setLineDash([2.6, 2]); g.beginPath(); g.arc(tx * 1.1, 11, 6, 1.22 * Math.PI, 1.78 * Math.PI); g.stroke(); g.setLineDash([]); }   // しょんぼり（への字）
      else { g.setLineDash([2.6, 2]); g.beginPath(); g.arc(tx * 1.1, 4.5 - 3 * (1 - p.smile), 6.5, (0.2 + 0.1 * (1 - p.smile)) * Math.PI, (0.8 - 0.1 * (1 - p.smile)) * Math.PI); g.stroke(); g.setLineDash([]); }
      g.fillStyle = 'rgba(255,110,120,.45)'; for (const ex of [-12.5, 12.5]) dot(g, { x: ex + tx, y: 3 }, 3);
    }
    g.restore();
  }
  // 腕の一部分（gbPlan の組：k・i0〜i1）。pts＝その腕の点（肩・上腕のなか・ひじ・前腕のなか・手首・手）。joints＝先に描いた部分との継ぎ目（輪郭を焼き色でなじませる）
  function gPiece(ch, P, p, gr, front, dark, pts, joints) {
    const J = ch.J, L = ch.look, k = gr.k, hand = gr.i1 === 2 * NSEG, line2 = pts.slice(gr.i0, Math.min(gr.i1 + 2, 2 * NSEG + 1));
    const marks = joints.concat(gr.i0 === 0 && !dark ? [pts[0]] : []);   // 腕の付け根は、全部の腕と同じく継ぎ目をなじませる
    const patch = marks.length ? (g) => { g.save(); g.filter = `blur(${(1.8 * CUR.K).toFixed(1)}px)`; g.fillStyle = L.cookie; for (const q of marks) dot(g, q, J.armW * 0.55); g.restore(); } : null;
    blob(pg, (g, w) => { g.lineWidth = J.armW + w; if (line2.length > 1) line(g, line2); if (hand) dot(g, P['hand' + k], J.handR + w / 2); }, L.cookie, { fuzz: L.fuzz, patch });
    if (!front) { pg.save(); pg.setTransform(1, 0, 0, 1, 0, 0); pg.globalCompositeOperation = 'source-atop'; pg.fillStyle = 'rgba(90,44,12,.16)'; pg.fillRect(0, 0, CUR.N, CUR.N); pg.restore(); return; }
    const g = pg; g.save(); CUR.toOff(g); g.lineCap = 'round'; g.lineJoin = 'round';
    if (!p.mitts && gr.i0 <= 2 * NSEG - 1 && gr.i1 >= 2 * NSEG - 1) { g.strokeStyle = L.icing; g.lineWidth = 2.5; g.setLineDash([2.6, 2.1]); squiggle(g, P['arm' + k][1], P['arm' + k][2], 4, J.armW * 0.95); g.setLineDash([]); }
    if (hand && p.mitts) { const h = P['hand' + k], a = P['handA' + k];
      piece(g, (gg, i) => { gg.beginPath(); gg.ellipse(h.x, h.y, 10 - i, 11.5 - i, a, 0, TAU); }, '#d8343a', { thread: 'rgba(255,240,230,.8)', inset: 2.6 });
      const c2 = { x: h.x - Math.sin(a) * -8.5, y: h.y + Math.cos(a) * -8.5 }; piece(g, (gg, i) => { gg.beginPath(); gg.ellipse(c2.x, c2.y, 9 - i, 4.2 - i, a, 0, TAU); }, '#f4ece0'); }
    g.restore();
  }
  // ---------- テディベア（はちみつ色のフェルト・古い緑のセーター） ----------
  function tPaint(ch, P, p, part, front, dark, far) {
    const J = ch.J, L = ch.look, k = part.slice(-1), R = J.headR;
    const legBlob = (q) => { const pts = P['leg' + q], w = J.legW;
      blob(pg, (g, a) => { g.lineWidth = w + a; line(g, pts); }, L.fur, { fuzz: L.fuzz, limb: { pts, w }, thread: L.thread });
      const f = P['foot' + q], fa = P['footA' + q];
      if (p.soles > 0.5) { blob(pg, (g, a) => { g.beginPath(); g.ellipse(f.x, f.y - 4, 19 + a / 2, 22 + a / 2, 0, 0, TAU); g.fill(); }, L.fur, { fuzz: L.fuzz, ring: (g, i) => { g.beginPath(); g.ellipse(f.x, f.y - 4, 19 - i, 22 - i, 0, 0, TAU); }, thread: L.thread });   // 座って前へ出した足：足の裏がこちらを向く
        piece(pg, ell({ x: f.x, y: f.y - 2 }, 12, 14), L.light, { thread: 'rgba(150,100,50,.5)', inset: 2.6 }); }
      else blob(pg, (g, a) => { g.beginPath(); g.ellipse(f.x, f.y - 2, J.footR * 1.25 + a / 2, J.footR * 0.72 + a / 2, fa * 0.5, 0, TAU); g.fill(); }, L.fur, { fuzz: L.fuzz }); };
    const armBlob = (q) => { const pts = P['arm' + q], w = J.armW, h = P['hand' + q], a3 = P['handA' + q], wr = pts[2];
      blob(pg, (g, a) => { g.lineWidth = w + a; line(g, pts); }, L.knit, { fuzz: '#22492c', limb: { pts, w }, thread: 'rgba(200,230,200,.35)', knit: 1 });
      // 袖口のゴム編み（手首の手前の帯）
      const cu = add(wr, rot(0, -4, a3)); blob(pg, (g, a) => { g.beginPath(); g.ellipse(cu.x, cu.y, w * 0.56 + a / 2, 6.5 + a / 2, a3, 0, TAU); g.fill(); }, L.rib, { flat: 1 });
      pg.save(); CUR.toOff(pg); pg.translate(cu.x, cu.y); pg.rotate(a3); pg.strokeStyle = 'rgba(255,255,255,.16)'; pg.lineWidth = 1.2; for (let x = -w * 0.48; x <= w * 0.48; x += 3.4) { pg.beginPath(); pg.moveTo(x, -5); pg.lineTo(x, 5); pg.stroke(); } pg.restore();
      blob(pg, (g, a) => dot(g, add(h, rot(0, 2, a3)), J.handR + a / 2), L.fur, { fuzz: L.fuzz, ring: circ(add(h, rot(0, 2, a3)), J.handR), thread: L.thread }); };
    if (part.startsWith('leg') || part.startsWith('arm')) { pg.save(); CUR.toOff(pg); (part.startsWith('leg') ? legBlob : armBlob)(k); pg.restore(); return; }
    // 胴と頭：耳 → 脚 → セーター → えり → ボタン → 頭 → 鼻づら → 顔。ここから先は人形の座標で描く（blob は自分で座標を戻す）
    const g = pg; g.save(); CUR.toOff(g); g.lineCap = 'round'; g.lineJoin = 'round';
    const H = P.head, hA = P.headA, at = (dx, dy) => add(H, rot(dx, dy, hA)), tw = p.turn;
    const earP = (s) => at(s * R * 0.64 + tw * R * 0.2 * (1 - 0.4 * s * Math.sign(tw || 1)), -R * 0.7), doHead = part !== 'baseBody', doBody = part !== 'baseHead';
    if (doHead) for (const s of [-1, 1]) { const e = earP(s);
      blob(g, (gg, a) => dot(gg, e, R * 0.34 + a / 2), L.fur, { fuzz: L.fuzz, ring: circ(e, R * 0.34), thread: L.thread });
      if (front) piece(g, circ(add(e, rot(0, 2, hA)), R * 0.19), L.light);
      if (s < 0) { g.save(); g.strokeStyle = L.mend; g.lineWidth = 1.7; const b = add(e, rot(-R * 0.2, -R * 0.06, hA + 0.5));   // 片耳のつくろい：ちがう色の糸のかがり（リボンと反対の耳）
        for (let i = 0; i < 4; i++) { const c = add(b, rot(i * R * 0.12, 0, hA + 0.5)); g.beginPath(); g.moveTo(c.x - 2.6, c.y - 3.4); g.lineTo(c.x + 2.6, c.y + 3.4); g.moveTo(c.x + 2.6, c.y - 3.4); g.lineTo(c.x - 2.6, c.y + 3.4); g.stroke(); } g.restore(); } }
    if (doBody) { for (const q of ['L', 'R']) if (q !== (far ? CUR.farK : null)) legBlob(q);
    const [b0, , c0] = P.torso, tr = J.torsoW / 2;
    blob(g, (gg, a) => { capsule(b0, c0, tr + a / 2)(gg, 0); gg.fill(); }, L.knit, { fuzz: '#22492c', ring: capsule(b0, c0, tr), thread: 'rgba(200,230,200,.35)', knit: 1 });
    // すその編み・えり（ゴム編みの帯）
    { g.save(); capsule(b0, c0, tr)(g, 0); g.clip(); const ang = Math.atan2(c0.y - b0.y, c0.x - b0.x) + Math.PI / 2, hem = add(b0, rot(0, tr * 0.72, ang));
      g.translate(hem.x, hem.y); g.rotate(ang); g.fillStyle = L.rib; g.fillRect(-tr - 4, -6, tr * 2 + 8, 40);
      g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1.3; for (let x = -tr; x <= tr; x += 4) { g.beginPath(); g.moveTo(x, -5); g.lineTo(x, 30); g.stroke(); } g.restore(); }
    const col = at(tw * R * 0.1, R * 0.92); blob(g, (gg, a) => { gg.beginPath(); gg.ellipse(col.x, col.y, R * 0.62 + a / 2, R * 0.2 + a / 2, hA, 0, TAU); gg.fill(); }, L.rib, { flat: 1 });
    if (front) {   // 前あき（ボタンの並ぶ帯）とボタン。p.tb＝上から ['wood'|'hole'|'gold', …]、p.sewn＝金のボタンを縫った回数
      const top = P.placketTop, bot = P.placketBot; g.strokeStyle = 'rgba(20,50,28,.55)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(top.x + 5, top.y); g.lineTo(bot.x + 5, bot.y); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(top.x + 7, top.y); g.lineTo(bot.x + 7, bot.y); g.stroke();
      const tb = p.tb || ['wood', 'hole', 'hole'];
      P.buttons.forEach((q, i) => { const st = tb[i];
        g.strokeStyle = 'rgba(15,35,20,.85)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(q.x + 10, q.y); g.lineTo(q.x + 18, q.y); g.stroke();   // ボタン穴（向かいの前立て）
        if (st === 'wood') button(g, q, 8.4, '#1f5634', '#a8cfa0', 'rgba(240,232,200,.85)');   // もとの緑のボタン（縁を明るくして、緑のセーターに溶けないように）
        else if (st === 'gold') { g.fillStyle = 'rgba(10,36,18,.42)'; dot(g, q, 8.6); button(g, q, 4.7, '#e8b830', '#a8761a', 'rgba(250,236,200,.95)', p.sewn ?? 3); }   // ジンジャーブレッドの胸の金のボタン（同じ大きさのまま。取れた跡の丸より少し小さい）
        else { g.fillStyle = 'rgba(10,36,18,.42)'; dot(g, q, 8.6); g.strokeStyle = 'rgba(120,170,120,.5)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.beginPath(); g.arc(q.x, q.y, 8.6, 0, TAU); g.stroke(); g.setLineDash([]);   // 取れた跡：日に焼けていない丸・糸の穴2つ・ほつれた糸
          g.fillStyle = 'rgba(8,22,12,.9)'; for (const d of [-1, 1]) dot(g, { x: q.x + d * 2.8, y: q.y }, 1.3);
          g.strokeStyle = 'rgba(236,226,196,.95)'; g.lineWidth = 1.3; const sw = Math.sin((p.t || 0) * 2.1 + i) * 1.4; g.beginPath(); g.moveTo(q.x - 2.8, q.y); g.bezierCurveTo(q.x - 6, q.y + 4, q.x - 1 + sw, q.y + 7, q.x - 5 + sw, q.y + 13); g.moveTo(q.x + 2.8, q.y); g.bezierCurveTo(q.x + 6, q.y + 3, q.x + 2 + sw, q.y + 8, q.x + 6 + sw * 0.6, q.y + 11); g.stroke(); } }); }
    }
    if (!doHead) { g.restore(); return; }
    blob(g, (gg, a) => dot(gg, H, R + a / 2), L.fur, { fuzz: L.fuzz, ring: circ(H, R), thread: L.thread });
    if (!front) { g.strokeStyle = L.thread; g.setLineDash([3.6, 3]); g.lineWidth = 1.6; g.beginPath(); g.moveTo(H.x, H.y - R * 0.95); g.lineTo(H.x, H.y + R * 0.9); g.stroke(); g.setLineDash([]);   // 後ろ頭：まん中の縫い目
      ribbonOn(g, earP(1), hA, L); g.restore(); return; }
    const mzW = R * 0.42 * (1 - 0.15 * Math.abs(tw)), mz = at(tw * R * 0.42, R * 0.3);
    blob(g, (gg, a) => { gg.beginPath(); gg.ellipse(mz.x, mz.y, mzW + a / 2, R * 0.33 + a / 2, hA, 0, TAU); gg.fill(); }, L.light, { fuzz: '#c8a060', ring: (gg, i) => { gg.beginPath(); gg.ellipse(mz.x, mz.y, Math.max(1, mzW - i), Math.max(1, R * 0.33 - i), hA, 0, TAU); }, thread: 'rgba(150,100,50,.45)' });
    g.translate(H.x, H.y); g.rotate(hA);
    // 鼻（こげ茶のフェルト）と、刺しゅうの口（口は動かさない：歌はテディの心の声）
    const nx = tw * R * 0.5, ny = R * 0.12;
    piece(g, (gg, i) => { gg.beginPath(); gg.ellipse(nx, ny, 9.5 - i, 6.8 - i, 0, 0, TAU); }, '#3a1a10');
    g.strokeStyle = '#3a1a10'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(nx, ny + 6); g.lineTo(nx, ny + 13); g.moveTo(nx - 8, ny + 15); g.quadraticCurveTo(nx - 4, ny + 19, nx, ny + 13); g.quadraticCurveTo(nx + 4, ny + 19, nx + 8, ny + 15); g.stroke();
    // ボタンの目：黒いボタン（穴2つ・光）。lid＝まぶた（眠い目）、blink＝まばたき
    for (const ex of [-1, 1]) { const sq = 1 - 0.35 * Math.abs(tw) * (Math.sign(ex) === -Math.sign(tw) ? 1 : 0), x = ex * R * 0.36 * sq + tw * R * 0.3 + p.look * 3, y = -R * 0.08 + p.lookY * 2.4, r = R * 0.11 * (1 + 0.25 * p.wide);
      g.save(); g.translate(x, y); g.scale(sq, 1);
      if (p.happy > 0.5) { g.strokeStyle = '#2a160c'; g.lineWidth = 2.8; g.beginPath(); g.arc(0, r * 0.5, r * 0.95, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.restore(); continue; }   // うっとり閉じた目（笑った弧）
      g.fillStyle = '#16100c'; dot(g, { x: 0, y: 0 }, r); g.fillStyle = 'rgba(255,255,255,.75)'; dot(g, { x: -r * 0.35, y: -r * 0.38 }, r * 0.26);
      g.fillStyle = 'rgba(90,80,70,.9)'; for (const d of [-1, 1]) dot(g, { x: d * r * 0.3, y: r * 0.2 }, r * 0.12);
      const lid = Math.max(p.lid, p.blink); if (lid > 0.02) { const ly = -r - 2 + (2 * r + 2) * lid; g.fillStyle = L.fur; g.beginPath(); g.moveTo(-r - 2, -r - 3); g.lineTo(r + 2, -r - 3); g.lineTo(r + 2, ly - 1.5); g.quadraticCurveTo(0, ly + 3.5, -r - 2, ly - 1.5); g.closePath(); g.fill();   // まぶた：下へゆるく丸い（まっすぐだと、むっとした顔に見えた）
        g.strokeStyle = '#5a3416'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(r + 1, ly - 1.2); g.quadraticCurveTo(0, ly + 3.2, -r - 1, ly - 1.2); g.stroke(); }
      g.restore(); }
    g.fillStyle = 'rgba(255,120,120,.38)'; for (const ex of [-1, 1]) dot(g, { x: ex * R * 0.6 + tw * R * 0.25, y: R * 0.22 }, R * 0.12);
    g.rotate(-hA); g.translate(-H.x, -H.y);
    ribbonOn(g, earP(1), hA, L);
    g.restore();
  }
  // 片耳の小さなリボン（女性と分かる控えめな印）。g は人形の座標
  function ribbonOn(g, e, hA, L) { const q = add(e, rot(5, -6, hA));
    for (const d of [-1, 1]) piece(g, (gg, i) => { gg.save(); gg.translate(q.x, q.y); gg.rotate(hA + 0.35); gg.beginPath(); gg.moveTo(0, 0); gg.quadraticCurveTo(d * (14 - i), -(9 - i * 0.6), d * (15 - i), 0); gg.quadraticCurveTo(d * (14 - i), 9 - i * 0.6, 0, 0); gg.closePath(); gg.restore(); }, L.ribbon, { thread: 'rgba(255,230,236,.8)', inset: 2, dash: [2, 2], tw: 1 });
    piece(g, circ(q, 4.2), '#c02a4a'); }

  // ---------- 描く ----------
  // o＝{ x, y（足もとの地面・画面）, sc, k（世界の1単位が何画素か＝書き出しの大きさ×カメラの寄り）, flip, alpha, pass:'all'|'body'|'over', shadow（0で影なし）, S（影の大きさの倍率）}
  function draw(ctx, ch, p0, o = {}) {
    const p = Object.assign({}, REST, p0), P = fk(ch, p), J = ch.J, L = ch.look, sc = o.sc || 1, kk = o.k || 1, K = sc * kk, teddy = ch.kind === 'teddy';
    const R = Math.ceil((teddy ? 205 : 150) * K), N = 2 * R; fit(OFF, N); fit(PRT, N); fit(SCR, N);
    const xs = (o.flip || 1) * p.sx * p.spin, ys = p.sy, front = p.spin >= 0;
    const toOff = (g) => { g.setTransform(K * xs, 0, 0, K * ys, R, R * 1.55); };
    const far = p.prof > 0.3, farK = (p.dir ?? 1) * (Math.sign(xs) || 1) > 0 ? 'R' : 'L';
    CUR = { K, kw: kk, toOff, N, farK };
    wipe(og);
    const hook = (name) => { if (L.hooks && L.hooks[name]) { og.save(); toOff(og); L.hooks[name](og, P, p, J, CUR); og.restore(); } };
    const tint = () => { pg.setTransform(1, 0, 0, 1, 0, 0); pg.globalCompositeOperation = 'source-atop'; pg.fillStyle = 'rgba(30,14,0,.3)'; pg.fillRect(0, 0, N, N); pg.globalCompositeOperation = 'source-over'; };
    const put = () => { og.save(); og.setTransform(1, 0, 0, 1, 0, 0); og.drawImage(PRT, 0, 0); og.restore(); };
    const pass = o.pass || 'all';
    if (teddy) {   // テディ：本人が自然と言った版の場合分けのまま
      const AL = armLayers(p), backA = { L: AL.st.L === 'back', R: AL.st.R === 'back' };
      const paint = (part) => { wipe(pg); const k = part.slice(-1), dark = far && (part === 'leg' + farK || (part === 'arm' + farK && backA[k]));   // 横向きの奥の手足だけ暗く（後ろ姿の腕は暗くしない）
        tPaint(ch, P, p, part, front, dark, far); if (dark) tint(); put(); };
      const midA = { L: AL.st.L === 'mid', R: AL.st.R === 'mid' }, anyMid = midA.L || midA.R;
      const arm = (k) => { paint('arm' + k); hook('held' + k); };   // その手に持った小物（ボタン）は、その腕のすぐ後に＝持つ手と同じ前後
      if (pass !== 'over') { hook('back'); if (far) paint('leg' + farK); for (const k of ['L', 'R']) if (backA[k]) arm(k); hook('farHand');
        if (anyMid) { paint('baseBody'); hook('midHeld'); for (const k of ['L', 'R']) if (midA[k]) arm(k); paint('baseHead'); } else paint('base'); }   // 後ろの壁へ伸ばす手前の腕は、胴の前・頭の後ろ
      if (pass !== 'body') { hook('head'); for (const k of ['L', 'R']) if (AL.st[k] === 'front') arm(k); hook('front'); hook('hand'); }
    } else {   // ジンジャーブレッド：奥行きの計算（gbPlan）の順に重ねる。胴より奥 → 胴 →（胴より手前・頭より奥 → 頭）→ 胴と頭より手前
      const plan = gbPlan(ch, p), drawn = new Set(), N2 = 2 * NSEG;
      const paint = (part, dark, joints) => { wipe(pg); if (typeof part === 'string') gPaint(ch, P, p, part, front, dark, far); else gPiece(ch, P, p, part, front, dark, plan.pts[part.k], joints); if (dark) tint(); put(); };
      const group = (g) => { if (g.item) { hook('back'); hook('head'); return; }
        const k = g.k, dark = far && k === farK && g.slot === 0, joints = [];   // 横向きの奥の腕だけ暗く
        if (g.i0 > 0 && drawn.has(k + (g.i0 - 1))) joints.push(plan.pts[k][g.i0]);   // 先に描いた同じ腕の部分との継ぎ目（なじませる）
        if (g.i1 < N2 && drawn.has(k + (g.i1 + 1))) joints.push(plan.pts[k][g.i1 + 1]);
        if (g.i0 === 0 && g.i1 === N2) paint('arm' + k, dark); else paint(g, dark, joints);
        for (let i = g.i0; i <= g.i1; i++) drawn.add(k + i);
        if (g.i1 === N2) hook('held' + k); };
      const [S0, S1, S2] = plan.groups;
      if (pass !== 'over') { if (far) paint('leg' + farK, true); S0.forEach(group);
        if (S1.length) { paint('baseBody', false); S1.forEach(group); paint('baseHead', false); } else paint('base', false); }
      if (pass !== 'body') S2.forEach(group);
    }
    ctx.save(); if (o.alpha != null) ctx.globalAlpha *= o.alpha;
    if (o.shadow !== 0) { const S = o.S || kk; ctx.shadowColor = 'rgba(60,30,20,.32)'; ctx.shadowBlur = 9 * S; ctx.shadowOffsetY = 4.5 * S; }
    ctx.drawImage(OFF, 0, 0, N, N, (o.x || 0) - R / kk, (o.y || 0) - p.air * sc - R * 1.55 / kk, N / kk, N / kk);
    ctx.restore();
    return P;
  }
  // 人形の座標の点 → 世界の点（小道具・糸を場面の側で描く時）
  function toScreen(q, p0, o) { const p = Object.assign({}, REST, p0), sc = o.sc || 1, xs = (o.flip || 1) * p.sx * p.spin; return { x: (o.x || 0) + q.x * sc * xs, y: (o.y || 0) - p.air * sc + q.y * sc * p.sy }; }
  // 世界の点 → 人形の座標
  function toRig(X, Y, p0, o) { const p = Object.assign({}, REST, p0), sc = o.sc || 1, xs = (o.flip || 1) * p.sx * p.spin; return { x: (X - (o.x || 0)) / (sc * xs), y: (Y - (o.y || 0) + p.air * sc) / (sc * p.sy) }; }
  // 世界の座標で小物を貼る前に呼ぶ（布目の大きさ kw＝世界の1単位が何画素か）
  const world = (kw) => { CUR = { K: kw, kw, N: Math.max(V.W, V.H) * 2, toOff: null, farK: 'R' }; };
  const lens = (d, r1, r2) => { if (d >= r1 + r2) return 0; if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
    const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)), b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2)); return a + b - 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)); };
  // 腕の層：back（付け根から胴と頭の後ろ）・mid（胴の前・頭の後ろ）・front（胴と頭の手前）。描く時も検査も、これ1つで決める
  function armLayers(p0) { const p = Object.assign({}, REST, p0), xs = p.sx * p.spin, side = p.prof > 0.3;
    const lean = p.spin < 0 ? 0 : p.lean != null ? p.lean : side ? ((p.dir ?? 1) * (Math.sign(xs) || 1) > 0 ? 1 : -1) : Math.abs(p.turn) >= 0.3 ? Math.sign(p.turn) : 0;
    const farK = lean > 0 ? 'R' : lean < 0 ? 'L' : null, st = {};
    for (const k of ['L', 'R']) { let v;
      if (p['back' + k]) v = 'back';
      else if (p['front' + k] || p.spin < 0) v = 'front';
      else if (lean === 0) v = p['fore' + k] ? 'front' : 'back';
      else if (k === farK) v = p['fore' + k] && !side ? 'front' : 'back';
      else v = 'front';
      if (p['mid' + k]) v = v === 'front' ? 'mid' : 'back';
      st[k] = v; }
    return { lean, farK, st, side, fore: { L: !!p.foreL, R: !!p.foreR } }; }
  // ---------- ジンジャーブレッドの奥行き（重ね順の計算。描く時も検査も、これ1つで決める） ----------
  const GD = 15, NSEG = 2, EPS = 0.5, LAYER = ['back', 'mid', 'front'];   // 胴の前後の半幅／上腕・前腕を分ける数／同じ奥行きは奥とみなす幅（表面に接する肩）／重ね順の名前（胴より奥・胴と頭のあいだ・胴と頭より手前）
  const yawOf = (p) => (p.yaw != null ? p.yaw : p.spin < 0 ? 180 : p.prof > 0.3 ? 90 * (Math.sign((p.dir ?? 1) * p.sx * p.spin) || 1) : 0);
  const lp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  function gbPlan(ch, p0) {
    const p = Object.assign({}, REST, p0), P = fk(ch, p), J = ch.J, yaw = yawOf(p), an = yaw * Math.PI / 180, c = Math.cos(an), s = Math.sin(an);
    const sg = Math.sign(p.sx * p.spin) || 1, GW = J.torsoW / 2, GA = GW + J.armW / 2, HR = J.headR, Wx = Math.sqrt(GW * GW * c * c + GD * GD * s * s);
    // 体の座標（u＝画面の右寄り・f＝前）→ 画面の横の位置 X と奥行き z。腕は肩の横（u＝±GA）のまま、前へ出した分だけ f が増える
    const at = (u, f) => ({ X: u * c + f * s, z: f * c - u * s }), uOf = (k) => (k === 'R' ? GA : -GA) * sg;
    const surf = (X) => { const x = Math.max(-Wx, Math.min(Wx, X)), A = s * s / (GW * GW) + c * c / (GD * GD), B = 2 * x * c * s * (1 / (GD * GD) - 1 / (GW * GW)), C = x * x * (c * c / (GW * GW) + s * s / (GD * GD)) - 1;
      return (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A); };   // 楕円の柱の、カメラ側の表面の奥行き（X が胴の外なら、いちばん近い輪郭の奥行き）
    const headZ = (X) => Math.sqrt(Math.max(0, HR * HR - X * X));   // 頭（球）の、カメラ側の表面の奥行き（頭の外なら 0＝輪郭）
    const T0 = P.torso[0], T2 = P.torso[2];
    // 部分ごとに、まん中の点の奥行きを、その位置の胴・頭の表面の奥行きと比べる（画面の中で腕が動いても、向きと前へ出す量が同じなら順は変わらない）
    // nT・nH＝画面で胴・頭に重なっている見本点の数（重なる所でだけ、順が絵に出る）
    const judge = (o) => { const m = at(o.u, (o.fa + o.fb) / 2); o.z = m.z; o.nT = 0; o.nH = 0;
      for (const u of o.us) { const q = lp(o.a, o.b, u); if (segD(q, T0, T2) < GW + o.r * 0.6) o.nT++; if (Math.hypot(q.x - P.head.x, q.y - P.head.y) < HR + o.r * 0.6) o.nH++; }
      o.slot = m.z <= surf(m.X) + EPS ? 0 : m.z <= headZ(m.X) + EPS ? 1 : 2; return o; };
    const pts = {}, pieces = [], zh = {};
    for (const k of ['L', 'R']) { const [sh, el, wr] = P['arm' + k], fw = p['fwd' + k] || 0, fe = fw * (p['elFwd' + k] ?? 0.45), fr = fw * 0.85, Q = [], F = [];
      for (let i = 0; i < NSEG; i++) { Q.push(lp(sh, el, i / NSEG)); F.push(fe * i / NSEG); }
      for (let i = 0; i < NSEG; i++) { Q.push(lp(el, wr, i / NSEG)); F.push(fe + (fr - fe) * i / NSEG); }
      Q.push(wr, P['hand' + k]); F.push(fr, fw); pts[k] = Q; zh[k] = at(uOf(k), fw).z;
      for (let i = 0; i < Q.length - 1; i++) pieces.push(judge({ k, i, a: Q[i], b: Q[i + 1], u: uOf(k), fa: F[i], fb: F[i + 1], r: i === Q.length - 2 ? J.handR : J.armW / 2, us: i === Q.length - 2 ? [0.4, 0.7, 1, 1] : [0.1, 0.3, 0.5, 0.7, 0.9] })); }
    // 両手で持つ物（場面が both を立てた時）：体のまん中（u＝0）で、前へ出した量は両手の平均。奥行きは近い方の手のすぐ奥
    const hk = ch.look.hooks || {}, hm = lp(P.handL, P.handR, 0.5), fi = ((p.fwdL || 0) + (p.fwdR || 0)) / 2;
    let item = null; if ((hk.back || hk.head) && p.both) { item = judge({ item: 1, a: hm, b: hm, u: 0, fa: fi, fb: fi, r: 20, us: [0.5] }); item.z = Math.max(zh.L, zh.R) - 1; const X = at(0, fi).X; item.slot = item.z <= surf(X) + EPS ? 0 : item.z <= headZ(X) + EPS ? 1 : 2; }
    // 同じ腕で重ね順が同じ部分の続きは1枚（継ぎ目を作らない）。その奥行きは、いちばん手前の部分（ふつうは手）。同じ重ね順の中は、その奥行きの順
    const runs = [];
    for (const k of ['L', 'R']) { let r = null; for (const o of pieces) if (o.k === k) { if (r && r.slot === o.slot) { r.i1 = o.i; r.z = Math.max(r.z, o.z); r.list.push(o); } else runs.push(r = { k, i0: o.i, i1: o.i, slot: o.slot, z: o.z, list: [o] }); } }
    if (item) runs.push({ item: 1, slot: item.slot, z: item.z, list: [item] });
    const groups = [[], [], []];
    runs.map((r, n) => ({ r, n })).sort((A, B) => A.r.slot - B.r.slot || A.r.z - B.r.z || A.n - B.n).forEach(({ r }, n) => { groups[r.slot].push(r); for (const o of r.list) o.ord = n; });
    return { yaw, sg, s, farK: sg * s > 1e-6 ? 'R' : sg * s < -1e-6 ? 'L' : null, pieces, item, groups, pts };
  }
  const segD = (q, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, u = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(q.x - a.x - dx * u, q.y - a.y - dy * u); };
  // 検査用：腕ごとの層と、手・前腕・上腕（ひじ寄りの半分）が頭（テディは耳も）と胴にどれだけ重なるか（丸の面積の割合）
  //   ジンジャーブレッドは、層＝付け根の部分の重ね順（gbPlan）。向き（lean・farK・side）は yaw から、fore は手を前へ出しているか。pieces＝部分ごとの重ね順と奥行き
  function armCheck(ch, p0) { const p = Object.assign({}, REST, p0), P = fk(ch, p), J = ch.J, gb = ch.kind === 'ginger', AL = gb ? null : armLayers(p), plan = gb ? gbPlan(ch, p) : null, R = J.headR, circles = [[P.head, R]];
    if (ch.kind === 'teddy') for (const s of [-1, 1]) circles.push([add(P.head, rot(s * R * 0.64 + p.turn * R * 0.2 * (1 - 0.4 * s * Math.sign(p.turn || 1)), -R * 0.7, P.headA)), R * 0.34]);
    const onHead = (q, r) => { let a = 0; for (const [c, rr] of circles) a += lens(Math.hypot(q.x - c.x, q.y - c.y), r, rr); return Math.min(1, a / (Math.PI * r * r)); };
    const onTorso = (q, r) => Math.min(1, lens(segD(q, P.torso[0], P.torso[2]), r, J.torsoW / 2) / (Math.PI * r * r));
    const along = (a, b, r, f, u0 = 0) => { let m = 0; for (let i = 0; i <= 4; i++) { const u = u0 + (1 - u0) * i / 4; m = Math.max(m, f({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }, r)); } return m; };
    return ['L', 'R'].map((k) => { const [sh, el, wr] = P['arm' + k], h = P['hand' + k], r = J.armW / 2;
      const geo = { arm: k, spin: p.spin, sx: p.sx, frac: onHead(h, J.handR), foreHead: along(el, wr, r, onHead),
        handTorso: onTorso(h, J.handR), foreTorso: along(el, wr, r, onTorso), upperTorso: along(sh, el, r, onTorso, 0.5) };
      if (!gb) return { ...geo, layer: AL.st[k], lean: AL.lean, farK: AL.farK, side: AL.side, fore: AL.fore[k] };
      const pk = plan.pieces.filter((o) => o.k === k), sn = plan.s * plan.sg;
      return { ...geo, layer: LAYER[pk[0].slot], lean: Math.abs(sn) < 0.34 ? 0 : Math.sign(sn), farK: Math.abs(sn) < 0.34 ? null : plan.farK, side: Math.abs(sn) > 0.94, fore: (p['fwd' + k] || 0) >= 10,
        yaw: plan.yaw, fwd: p['fwd' + k] || 0, pieces: pk.map((o) => ({ i: o.i, slot: o.slot, z: o.z, nT: o.nT, nH: o.nH, ord: o.ord })), item: plan.item && { slot: plan.item.slot, z: plan.item.z, ord: plan.item.ord } }; }); }
  const handHead = (ch, p0) => armCheck(ch, p0).map((r) => ({ ...r, fore: r.foreHead }));
  window.FR = { REST, BODY, make, fk, draw, toScreen, toRig, piece, button, circ, ell, world, handHead, armLayers, armCheck, gbPlan };
})();
