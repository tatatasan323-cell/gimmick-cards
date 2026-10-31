// 写し：動画制作ラボ/lib/gingerrig.js（MV は完成済み・元は書きかえない）。グリーティングカードの絵で、MV の人物をそのまま描くために使う（共通/greet_cards.js が、その絵の時だけ読む）
// ジンジャーブレッドの人形・15関節（window.GR）。クリスマスのMV3本の作り直しで使う（見本の lib/ginger.js は2節の腕と脚だけだった）
// 関節：腰の動き（hx,hy）・骨盤（pelvis）・胸の曲げ（waist）・首・肩×2・ひじ×2・手首×2・もも×2・ひざ×2・足首×2。
// 角度の決まりは lib/rig.js（切り絵の人形）と同じ：画面の左の部品を基準に時計まわりが正、右は自動で反転。
//   肩：0＝下げる、正＝外へ上げる（π＝真上）／ひじ・手首：正＝同じ向きにさらに曲げる／もも：正＝足を外へ／ひざ：正＝すねが外へ／足首：正＝つま先が外へ
// 寸法の名前（J.th・J.sh・J.ua・J.fa・J.shX・J.shY・J.hipX）は rig.js と同じなので、手足を位置から決める踊り（MV の moves.js）がそのまま使える。
// 絵：1枚のクッキー。焼き色はふちが濃く、まん中が明るい。表面に粒。アイシング（手首・足首の波線・ボタン・顔）。cel＝輪郭のある渋いアニメ／neon＝ネオン管の輪郭
// 約束：絵は引数だけで決まる。Math.random は使わない
(() => {
  const TAU = Math.PI * 2;
  const REST = { air: 0, sx: 1, sy: 1, spin: 1, hx: 0, hy: 0, pelvis: 0, waist: 0, neck: 0,
    shL: 0.28, elL: 0.12, wrL: 0, shR: 0.28, elR: 0.12, wrR: 0, hipL: 0.04, kneeL: 0, ankL: 0, hipR: 0.04, kneeR: 0, ankR: 0, legSL: 1, legSR: 1, armSL: 1, armSR: 1, dir: 1,
    mouth: 0, smile: 1, look: 0, lookY: 0, blink: 0, turn: 0, brow: 0, wide: 0, backL: 0, backR: 0, prof: 0 };
  const BODY = {
    adult: { th: 33, sh: 31, hipX: 12, waistY: -20, chestY: -14, shX: 21, shY: -15, ua: 26, fa: 23, neckY: -24, headR: 27, legW: 25, armW: 20, torsoW: 50, handR: 11, footR: 11.5 },
    kid: { th: 21, sh: 20, hipX: 10, waistY: -14, chestY: -10, shX: 17, shY: -11, ua: 18, fa: 16, neckY: -18, headR: 25, legW: 21, armW: 17, torsoW: 40, handR: 9.5, footR: 10 },
  };
  // 人形を作る：kind＝adult/kid、look＝{ cookie（まん中の色）, edge（ふちの焼き色）, ink（輪郭）, icing, buttons[], girl, bow, hooks:{ back, mid, head（帽子と頭まわりの持ち物・手前の腕の前）, front, hand（手に持つ小物・いちばん最後）} }
  function make(kind = 'adult', look = {}) {
    const B = BODY[kind], J = Object.assign({}, B);
    J.stand = B.th + B.sh + B.footR * 0.7;   // 腰の高さ（足首は地面から足の丸みの分だけ上）
    return { kind, J, look: Object.assign({ cookie: '#c98a4a', edge: '#8a4d22', ink: '#2a140a', icing: '#fffaf0', buttons: ['#e8283a', '#2fbf6a', '#ffd23a'] }, look) };
  }
  const rot = (x, y, a) => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  // 関節の位置（人形の足もと＝原点、上が −y、腰の動き・空中を含む。拡大縮小と回転は含まない）
  function fk(ch, p) {
    const J = ch.J, P = {}, root = { x: p.hx, y: -J.stand + p.hy };
    P.root = root;
    // prof＝脚を横から見た形に（歩く時。もも付け根を寄せ、つま先を前へ。奥の脚は暗く後ろに描く）
    const hipX = J.hipX * (1 - 0.65 * p.prof);
    for (const side of [1, -1]) { const k = side > 0 ? 'L' : 'R', hip = add(root, { x: -side * hipX, y: 0 });
      const ls = p['legS' + k] ?? 1, a1 = side * p['hip' + k], knee = add(hip, rot(0, J.th * ls, a1)), a2 = a1 + side * p['knee' + k], ank = add(knee, rot(0, J.sh * ls, a2)), a3 = a2 + side * p['ank' + k];   // ls＝脚の縮み（カメラの方へ上げた脚は、横へ折れずに短く見える）
      P['leg' + k] = [hip, knee, ank]; P['foot' + k] = add(ank, rot(V.lerp(-side * J.footR * 0.15, (p.dir ?? 1) * J.footR * 0.5, p.prof), J.footR * 0.2, a3)); }   // 横から見た歩きでは、つま先を進む向き（dir）へ。正面では外へ開かない
    const pa = p.pelvis, ca = pa + p.waist, waist = add(root, rot(0, J.waistY, pa));
    P.torso = [add(root, rot(0, 9, pa)), waist, add(waist, rot(0, J.chestY, ca))]; P.waist = waist; P.chestA = ca;
    for (const side of [1, -1]) { const k = side > 0 ? 'L' : 'R', sh = add(waist, rot(-side * J.shX, J.shY, ca));
      const as = p['armS' + k] ?? 1, a1 = ca + side * p['sh' + k], el = add(sh, rot(0, J.ua * as, a1)), a2 = a1 + side * p['el' + k], wr = add(el, rot(0, J.fa * as, a2)), a3 = a2 + side * p['wr' + k];   // as＝腕の縮み（前腕がカメラの方を向くと短く見える）
      P['arm' + k] = [sh, el, wr]; P['hand' + k] = add(wr, rot(0, J.handR * 0.55, a3)); P['handA' + k] = a3; }
    const neck = add(waist, rot(0, J.neckY, ca)), ha = ca + p.neck;
    P.neck = neck; P.headA = ha; P.head = add(neck, rot(0, -J.headR * 0.78, ha));
    return P;
  }
  // 画用紙（使い回し）
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = 8; return [c, c.getContext('2d')]; };
  const [OFF, og] = mk(), [GRP, gg] = mk(), [RIM, rg] = mk();
  const fit = (c, n) => { if (c.width < n || c.height < n) { c.width = c.height = n; } };
  // 画用紙は大きい人形に合わせて広がったまま使い回すので、消す時は使う N×N だけでなく全体を消す（1e4）。
  // 前の大きい人形の残りが N×N のすぐ外にあると、縮めて貼る時のにじみで人形の縁に1画素の線が出て、描く順番で絵が変わった（2026-10-18）
  let SPECK = null;   // クッキーの表面の粒（読み込み後に一度だけ作る）
  const speck = (g) => { if (SPECK) return SPECK; const c = document.createElement('canvas'); c.width = c.height = 128; const s = c.getContext('2d'), r = V.rng(911);
    for (let i = 0; i < 700; i++) { s.fillStyle = r() < 0.6 ? `rgba(70,30,8,${0.12 + 0.2 * r()})` : `rgba(255,225,180,${0.1 + 0.16 * r()})`; s.beginPath(); s.arc(r() * 128, r() * 128, 0.5 + r() * 1.3, 0, TAU); s.fill(); }
    for (let i = 0; i < 26; i++) { s.fillStyle = `rgba(60,25,5,${0.12 + 0.12 * r()})`; s.beginPath(); s.ellipse(r() * 128, r() * 128, 2 + r() * 4, 1 + r() * 2, r() * 3, 0, TAU); s.fill(); }   // 小さな気泡の穴
    SPECK = g.createPattern(c, 'repeat'); return SPECK; };
  const line = (g, pts) => { g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.stroke(); };
  const dot = (g, q, r) => { g.beginPath(); g.arc(q.x, q.y, Math.max(0.5, r), 0, TAU); g.fill(); };
  // 体のかたまり：base＝脚・足・胴・首・頭、armL／armR＝腕と手。w＝太さの足し引き、m＝太さの倍率（ネオンからクッキーになる途中）
  // part：base（脚・胴・首・頭。skipK の脚は除く）・legL／legR（1本の脚）・armL／armR
  function shape(g, ch, P, part, col, w = 0, m = 1, skipK = null) {
    const J = ch.J; g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    if (part === 'base' || part === 'legL' || part === 'legR') {
      for (const k of part === 'base' ? ['L', 'R'].filter((q) => q !== skipK) : [part.slice(3)]) { g.lineWidth = Math.max(0.5, J.legW * m + w); line(g, P['leg' + k]); dot(g, P['foot' + k], J.footR * m + w / 2); }
      if (part !== 'base') return;
      g.lineWidth = Math.max(0.5, J.torsoW * m + w); line(g, P.torso);
      g.lineWidth = Math.max(0.5, J.torsoW * 0.62 * m + w); line(g, [P.neck, P.head]);
      dot(g, P.head, J.headR * m + w / 2);
    } else { const k = part.slice(-1); g.lineWidth = Math.max(0.5, J.armW * m + w); line(g, P['arm' + k]); dot(g, P['hand' + k], J.handR * m + w / 2); }
  }
  // アイシングの波線（手首・足首）：a→b の先の方に、横切る波
  function squiggle(g, a, b, back, wid, s) { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, px = -uy, py = ux, cx = b.x - ux * back, cy = b.y - uy * back;
    g.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8 - 0.5, w = (k % 2 ? 2.2 : -2.2) * s; const x = cx + px * u * wid + ux * w, y = cy + py * u * wid + uy * w; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  // リボン（頭の座標で）。後ろ姿でも見える（左右は spin の反転で自然に入れかわる）
  function bow(g, L, s) { g.fillStyle = L.bow; g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.2 * s; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(13 * s, -21 * s); g.quadraticCurveTo(13 * s + sd * 12 * s, -32 * s, 13 * s + sd * 11 * s, -14 * s); g.closePath(); g.fill(); g.stroke(); } dot(g, { x: 13 * s, y: -21 * s }, 3.4 * s); }
  // 顔とアイシング（ボタン・波線・女の子のスカートの線とリボン）。front＝表（裏を向いている時はアイシングが無い）。linesOnly＝線とボタンだけ（光らせる時）
  // parts＝描く所（legL・legR・armL・armR・body）。手足の飾りは、その手足と同じ層で描く（奥の脚の白い波線が、手前の脚の上に透けて見えた。本人 2026-10-18）
  function icing(g, ch, P, p, linesOnly, parts = ['legL', 'legR', 'armL', 'armR', 'body']) {
    const J = ch.J, L = ch.look, s = J.headR / 27; g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = L.icing; g.lineWidth = 2.6 * s;
    for (const k of ['L', 'R']) { if (parts.includes('arm' + k)) squiggle(g, P['arm' + k][1], P['arm' + k][2], 4 * s, J.armW * 0.95, s); if (parts.includes('leg' + k)) squiggle(g, P['leg' + k][1], P['leg' + k][2], 2 * s, J.legW * 0.95, s); }
    if (!parts.includes('body')) { g.restore(); return; }
    if (L.girl) { const [a, b] = [P.torso[0], P.torso[1]], m = { x: (a.x * 0.35 + b.x * 0.65), y: (a.y * 0.35 + b.y * 0.65) }, ang = Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2;   // スカートのすそのスカラップ
      g.beginPath(); for (let k = 0; k <= 5; k++) { const u = (k / 5 - 0.5) * J.torsoW * 0.92, q = { x: m.x + Math.cos(ang) * u, y: m.y + Math.sin(ang) * u }; if (!k) g.moveTo(q.x, q.y); else { const pq = { x: m.x + Math.cos(ang) * (u - J.torsoW * 0.092), y: m.y + Math.sin(ang) * (u - J.torsoW * 0.092) }; g.quadraticCurveTo(pq.x - Math.sin(ang) * -5 * s, pq.y + Math.cos(ang) * -5 * s, q.x, q.y); } } g.stroke(); }
    // ボタン（グミ）：胴のまん中の線にそって3つ
    const [t0, t1, t2] = P.torso; (L.buttons || []).forEach((bc, i) => { const u = (i + 1) / ((L.buttons.length || 3) + 1), q = { x: t1.x + (t2.x - t1.x) * (u * 1.4 - 0.25) * 0.9, y: t1.y + (t2.y - t1.y) * (u * 1.4 - 0.25) * 0.9 + (L.girl ? 4 : 10) * s * (1 - u) };
      g.fillStyle = bc; dot(g, q, 4.2 * s); g.fillStyle = 'rgba(255,255,255,.65)'; dot(g, { x: q.x - 1.3 * s, y: q.y - 1.4 * s }, 1.3 * s); });
    if (linesOnly) { g.restore(); return; }
    // 顔（頭の向きで回し、turn で横を向く）
    g.translate(P.head.x, P.head.y); g.rotate(P.headA); const tx = p.turn * 7 * s, lx = p.look * 2.6 * s + tx, ly = p.lookY * 2 * s;
    const wd = 1 + 0.45 * p.wide, eyeH = 3.8 * s * (1 - 0.88 * p.blink) * wd;   // wide＝目を丸くする
    for (const ex of [-7.5, 7.5]) { const sq = 1 - 0.25 * Math.abs(p.turn) * (Math.sign(ex) === Math.sign(p.turn) ? 1 : -0.4); g.fillStyle = '#2a1206'; g.beginPath(); g.ellipse(ex * s * sq + lx, -4 * s + ly, 3.1 * s * sq * wd, eyeH, 0, 0, TAU); g.fill();
      if (p.blink < 0.5) { g.fillStyle = '#ffffff'; dot(g, { x: ex * s * sq + lx - 1 * s * wd, y: -5.6 * s * wd + ly }, 1.1 * s * wd); } }
    if (Math.abs(p.brow) > 0.05) { g.lineWidth = 2.2 * s; for (const ex of [-7.5, 7.5]) { const a = -Math.sign(ex) * p.brow * 0.5; g.save(); g.translate(ex * s + tx, -11.5 * s - Math.max(0, p.brow) * 2 * s); g.rotate(a); g.beginPath(); g.moveTo(-3.6 * s, 0); g.lineTo(3.6 * s, 0); g.stroke(); g.restore(); } }
    g.lineWidth = 2.6 * s;
    if (p.mouth > 0.12) { const h = (1.5 + p.mouth * 6.5) * s, w = (5 + p.mouth * 1.5) * s; g.fillStyle = '#5a1810'; g.beginPath(); g.ellipse(tx * 1.1, 6 * s, w, h, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#e86a6a'; g.beginPath(); g.ellipse(tx * 1.1, 6 * s + h * 0.45, w * 0.55, h * 0.35, 0, 0, TAU); g.fill(); }
    else { g.beginPath(); g.arc(tx * 1.1, (4.5 - 3 * (1 - p.smile)) * s, 6.5 * s, (0.2 + 0.1 * (1 - p.smile)) * Math.PI, (0.8 - 0.1 * (1 - p.smile)) * Math.PI); g.stroke(); }
    g.fillStyle = 'rgba(255,110,120,.5)'; for (const ex of [-12.5, 12.5]) dot(g, { x: ex * s + tx, y: 3 * s }, 3 * s);
    if (L.bow) bow(g, L, s);
    g.restore();
  }
  // 描く：o＝{ x, y（足もとの地面・画面）, sc（大きさ）, flip（−1で左右反転）, rim:{col, dir, a}（ネオンの縁の光）, alpha, style:'cel'|'neon', solid（ネオン→クッキーの途中 0〜1）, neon:'#色', glow:{col, a}（アイシングの線を光らせる） }
  function draw(ctx, ch, p0, o = {}) {
    const p = Object.assign({}, REST, p0), P = fk(ch, p), J = ch.J, L = ch.look, sc = o.sc || 1, K = sc * (o.k || 1);
    const R = Math.ceil(150 * K), N = 2 * R; fit(OFF, N); fit(GRP, N); fit(RIM, N);
    const xs = (o.flip || 1) * p.sx * p.spin, ys = p.sy, front = p.spin >= 0;
    // 人形の座標 → 画用紙（足もとを画用紙の下寄りに）
    const toOff = (g) => { g.setTransform(K * xs, 0, 0, K * ys, R, R * 1.55); };
    og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-over'; og.globalAlpha = 1; og.filter = 'none'; og.clearRect(0, 0, 1e4, 1e4);
    const style = o.style || 'cel', solid = o.solid == null ? 1 : o.solid;
    const far = p.prof > 0.3, farK = (p.dir ?? 1) * (Math.sign(xs) || 1) > 0 ? 'R' : 'L', nearK = farK === 'R' ? 'L' : 'R';
    const backA = { L: !!p.backL || (far && farK === 'L' && !p.frontL), R: !!p.backR || (far && farK === 'R' && !p.frontR) };
    if (style === 'cel' && solid > 0.001) {
      // 前後の順：奥の脚 → 奥の腕（横向きの歩きの奥の側・backL/R。付け根ごと胴の向こう）→ 胴 → 手前の腕（不透明のまま胴の前。付け根の輪郭の継ぎ目だけ消す）
      // 奥と手前は進む向きで決まる（右へ歩けば画面の右の手足が奥、左へ歩けば左が奥）。物を持つ腕だけ手前に残したい時は frontL/R（本人 2026-10-18「子供の手のパーツが右も左も手前」「大人もか」「つなぎがどちらも手前に見える」）
      // 腕と頭まわりの前後は、高さではなく向きで決める（本人 2026-10-18「右を向いているときの右腕は帽子よりも手前、顔よりも手前」）：
      //   奥の脚 → 奥の腕 → 胴と頭 → hooks.head（帽子・王冠と、頭の上や顔の前の持ち物＝箱・ラジカセ）→ 手前の腕 → hooks.front（缶・マフラー）→ hooks.hand（手に持つ小物＝紙コップ・鈴）
      //   手前の腕は、上げていても下ろしていても、顔・帽子・頭の上の物より手前（持ち物の縁を手で押さえる形）。奥の腕は胴の向こうなので、顔・帽子・持ち物より後ろ。正面向きの時は両腕とも手前
      const order = [...(far ? ['leg' + farK] : []), ...['L', 'R'].filter((k) => backA[k]).map((k) => 'arm' + k), 'base'];
      const order2 = ['L', 'R'].filter((k) => !backA[k]).map((k) => 'arm' + k);
      const hook = (name) => { if (L.hooks && L.hooks[name]) { og.save(); toOff(og); L.hooks[name](og, P, p, J); og.restore(); } };
      const partsOf = (part) => (part === 'base' ? [...(far ? ['leg' + nearK] : ['legL', 'legR']), 'body'] : [part]);
      // 1つの部品（脚・胴と頭・腕）を画用紙 GRP に描く：輪郭 → 焼き色 → まん中の明るい色 → 粒 → その部品の飾り
      const paint = (part) => {
        const k = part.slice(-1), isArm = part.startsWith('arm'), dark = (far && part === 'leg' + farK) || (isArm && far && k === farK && backA[k]);
        gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-over'; gg.filter = 'none'; gg.clearRect(0, 0, 1e4, 1e4); toOff(gg);
        const skip = part === 'base' && far ? farK : null;
        shape(gg, ch, P, part, L.ink, 6.5 * Math.min(1, solid * 2.5), solid, skip);   // 輪郭も体と一緒に太る（細い時に黒い棒人形が出ないように）
        shape(gg, ch, P, part, L.edge, 0, solid, skip);
        gg.filter = `blur(${(3.2 * K).toFixed(1)}px)`; shape(gg, ch, P, part, L.cookie, -9, solid, skip); gg.filter = 'none';
        gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-atop'; gg.fillStyle = speck(gg); gg.fillRect(0, 0, N, N); gg.globalCompositeOperation = 'source-over';
        if (front) { gg.save(); toOff(gg); gg.globalAlpha = Math.min(1, solid * 1.5); icing(gg, ch, P, p, false, partsOf(part)); gg.restore(); }   // その部品の飾りを、その部品の層に
        if (isArm && !backA[k]) {   // 手前の腕の付け根：腕の輪郭が胴の上で輪になって切れて見えないよう、継ぎ目の所だけ焼き色でなじませる（腕は不透明のまま。以前の、付け根のまわりを抜く作りは、腕が半透明になって胴の向こうに見えた 本人 2026-10-18）
          const sh = P['arm' + k][0]; gg.save(); toOff(gg); gg.globalCompositeOperation = 'source-atop'; gg.fillStyle = L.edge; dot(gg, sh, J.armW * 0.5 * solid); gg.filter = `blur(${(2 * K).toFixed(1)}px)`; gg.fillStyle = L.cookie; dot(gg, sh, J.armW * 0.34 * solid); gg.filter = 'none'; gg.restore(); }
        if (dark) { gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-atop'; gg.fillStyle = 'rgba(40,14,0,.32)'; gg.fillRect(0, 0, N, N); gg.globalCompositeOperation = 'source-over'; }   // 奥の手足は、飾りごと少し暗く
      };
      const paintAll = (list) => { for (const part of list) { if (part === 'armL' && !backA.L) hook('mid'); paint(part); og.drawImage(GRP, 0, 0, N, N, 0, 0, N, N); } };
      hook('back');
      paintAll(order);
      hook('head');
      paintAll(order2);
      if (!front && L.bow) { og.save(); toOff(og); og.translate(P.head.x, P.head.y); og.rotate(P.headA); bow(og, L, J.headR / 27); og.restore(); }
      if (front && o.glow && o.glow.a > 0.01) {   // アイシングの線だけ、ネオンの色で光る
        rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-over'; rg.filter = 'none'; rg.clearRect(0, 0, 1e4, 1e4); rg.save(); toOff(rg); icing(rg, ch, P, p, true, ['body', ...(far ? ['leg' + nearK] : ['legL', 'legR']), ...order2]);   // 隠れている手足の線は光らせない
        rg.restore();
        rg.globalCompositeOperation = 'source-in'; rg.fillStyle = o.glow.col; rg.fillRect(0, 0, N, N);
        og.globalCompositeOperation = 'lighter'; og.filter = `blur(${(5 * K).toFixed(1)}px)`; og.globalAlpha = o.glow.a; og.drawImage(RIM, 0, 0); og.drawImage(RIM, 0, 0); og.filter = 'none'; og.globalAlpha = 0.7 * o.glow.a; og.drawImage(RIM, 0, 0); og.globalAlpha = 1; og.globalCompositeOperation = 'source-over'; }
      hook('front'); hook('hand');
      if (o.rim && o.rim.a > 0) {   // ネオンの縁の光：人形の形から、光の側へずらした形を引いた三日月
        rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-over'; rg.clearRect(0, 0, 1e4, 1e4); rg.drawImage(OFF, 0, 0);
        rg.globalCompositeOperation = 'source-in'; rg.fillStyle = o.rim.col; rg.fillRect(0, 0, N, N);
        rg.globalCompositeOperation = 'destination-out'; rg.drawImage(OFF, -o.rim.dir * 3.5 * K * (o.flip || 1), 1.5 * K);
        og.globalCompositeOperation = 'lighter'; og.globalAlpha = o.rim.a; og.drawImage(RIM, 0, 0); og.globalAlpha = 1; og.globalCompositeOperation = 'source-over';
      }
    }
    if (style === 'neon' || (o.neonA || 0) > 0) {   // ネオン管：形のふちだけの輪（形から、細らせた形を抜く）＋顔とボタンの小さな管
      rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-over'; rg.filter = 'none'; rg.clearRect(0, 0, 1e4, 1e4); toOff(rg);
      for (const part of ['base', 'armL', 'armR']) shape(rg, ch, P, part, '#fff', 0);
      rg.globalCompositeOperation = 'destination-out'; for (const part of ['base', 'armL', 'armR']) shape(rg, ch, P, part, '#fff', -5.5);
      if (far) {   // 横向きの歩き：手前の腕は胴の前にあるので、胴に重なる所にも腕の輪郭を足す（足さないと、腕が胴に溶けて、どちらの腕も胴の後ろに見えた）
        gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalCompositeOperation = 'source-over'; gg.filter = 'none'; gg.clearRect(0, 0, 1e4, 1e4); toOff(gg);
        shape(gg, ch, P, 'arm' + nearK, '#fff', 0); gg.globalCompositeOperation = 'destination-out'; shape(gg, ch, P, 'arm' + nearK, '#fff', -5.5);
        gg.globalCompositeOperation = 'destination-in'; shape(gg, ch, P, 'base', '#fff', -5.5); gg.globalCompositeOperation = 'source-over';
        rg.save(); rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-over'; rg.drawImage(GRP, 0, 0); rg.restore(); }
      rg.globalCompositeOperation = 'source-over'; rg.strokeStyle = '#fff'; rg.fillStyle = '#fff'; rg.lineWidth = 2.6; rg.lineCap = 'round';
      { rg.save(); rg.translate(P.head.x, P.head.y); rg.rotate(P.headA); const tx = p.turn * 7; for (const ex of [-7.5, 7.5]) { rg.beginPath(); rg.arc(ex + tx, -4, 2.6 * (1 - 0.8 * p.blink) + 0.4, 0, TAU); rg.fill(); }
        rg.beginPath(); if (p.mouth > 0.12) rg.ellipse(tx, 6, 5, 2 + p.mouth * 5, 0, 0, TAU); else rg.arc(tx, 4.5, 6.5, 0.2 * Math.PI, 0.8 * Math.PI); rg.stroke(); rg.restore(); }
      const [, t1, t2] = P.torso; for (let i = 0; i < 3; i++) { const u = (i + 1) / 4; rg.beginPath(); rg.arc(t1.x + (t2.x - t1.x) * (u * 1.4 - 0.25) * 0.9, t1.y + (t2.y - t1.y) * (u * 1.4 - 0.25) * 0.9 + 10 * (1 - u), 2.6, 0, TAU); rg.stroke(); }
      const a = style === 'neon' ? (o.alpha == null ? 1 : o.alpha) : o.neonA, col = o.neon || '#ff7ac0';
      rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'source-in'; rg.fillStyle = col; rg.fillRect(0, 0, N, N);
      og.globalCompositeOperation = 'lighter';
      og.filter = `blur(${(9 * K).toFixed(1)}px)`; og.globalAlpha = 0.9 * a; og.drawImage(RIM, 0, 0); og.drawImage(RIM, 0, 0);
      og.filter = `blur(${(2.5 * K).toFixed(1)}px)`; og.globalAlpha = a; og.drawImage(RIM, 0, 0); og.filter = 'none';
      rg.globalCompositeOperation = 'source-atop'; rg.fillStyle = 'rgba(255,255,255,.7)'; rg.fillRect(0, 0, N, N);   // 管の芯は白に近く
      og.globalAlpha = a; og.drawImage(RIM, 0, 0); og.globalAlpha = 1; og.globalCompositeOperation = 'source-over';
    }
    ctx.save(); if (o.alpha != null && style !== 'neon') ctx.globalAlpha *= o.alpha; if (o.comp) ctx.globalCompositeOperation = o.comp;
    const kk = o.k || 1;   // 画用紙は kk 倍の細かさなので、余白 R も kk で割って貼る（割らないと、書き出しが大きいほど人形が浮く）
    ctx.drawImage(OFF, 0, 0, N, N, (o.x || 0) - R / kk, (o.y || 0) - p.air * sc - R * 1.55 / kk, N / kk, N / kk);
    ctx.restore();
    return P;
  }
  // 人形の座標の点 → 画面の点（小道具を画面の側で描く時）
  function toScreen(q, p0, o) { const p = Object.assign({}, REST, p0), sc = o.sc || 1, xs = (o.flip || 1) * p.sx * p.spin; return { x: (o.x || 0) + q.x * sc * xs, y: (o.y || 0) - p.air * sc + q.y * sc * p.sy }; }
  window.GR = { REST, BODY, make, fk, draw, toScreen };
})();
