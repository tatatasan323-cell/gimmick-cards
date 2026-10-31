// 写し：動画制作ラボ/MV/クリスマス/gospel/全編/kage_cello.js（MV は完成済み・元は書きかえない）。グリーティングカードの絵で、MV の人物をそのまま描くために使う（共通/greet_cards.js が、その絵の時だけ読む）
// ゴスペル全編の人形を「セロハンの影絵」で描く（window.KC）。kage_doll.js の人形（体つき・色・髪・帽子・ひげ・持ち物の形）はそのまま使い、描き方だけを替える
// 物理の模型：後ろのランプの光は、セロハンを1枚通るたびにその色を掛けられる（乗算）。輪郭線は1本も描かない
//   形は「膜の色と、後ろの明るい紙との差」で読む。2枚重なった所は2色を掛けた色で、1枚より暗い
//   セロハンの三原色（本人 2026-10-20）：レモンの黄・少し桃寄りの赤・空色寄りの青（緑も通す）→ 黄×赤＝オレンジ・赤×青＝紫・黄×青＝緑
//   袖は服と違う色（人ごとに組み合わせを変える）：腕が胴の前を通ると、重なった所がオレンジ・紫・緑に変わる＝光が織りなす動きの見せ場
//   陰影と立体＝重ねる枚数：陰の側（人形の右・腕の下・すそのひだ・あごの下・頭の三日月）にもう1枚。光の側は1枚
//   白・ごく淡い色の所は、膜を切り抜いた窓（紙の光がそのまま抜ける）
//   目と口は、濃い膜を何枚も重ねた小さな形（白く抜かない・大きくしない。基準 3章）
//   人形は切り片を鋲でつないだ作り。見せる鋲は肩とひじだけ（小さく・淡く）。手と首から下へ操り棒（皮影）
//   胴の後ろの腕は、胴の厚みの分スクリーンから離れる＝ふちがわずかにやわらかい（前後の手がかり）
//   平らな人形は回れない：「正面の人形」と「斜めの人形」を持ち替える。持ち替えは必ず裏返しの動きを通す
//     |yaw| 0.12〜0.4 で正面の人形が細くなり、0.4〜0.6 で斜めの人形が広がる（場面は向きを0.45秒かけて変える。止めるのは 0 か ±0.62）
//     回る・振り向くは裏返し（横幅が cos で縮んで返る：p.flip・p.spin）
// 使い方：data.cello が真なら、読み込んだ時に KD.draw をこれに替える
// 約束：絵は引数だけで決まる。Math.random は使わない
(() => {
  const TAU = Math.PI * 2, { spline, ell } = KR, LEA = KR.LEA;
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), lerp = (a, b, u) => a + (b - a) * u;
  const rot = (p, o, a) => { const c = Math.cos(a), s = Math.sin(a), dx = p.x - o.x, dy = p.y - o.y; return { x: o.x + dx * c - dy * s, y: o.y + dx * s + dy * c }; };
  const hsh = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

  // ---------- 膜の色 ----------
  const PRIM = { Y: [0.97, 1, 0.32], R: [1, 0.45, 0.55], B: [0.4, 0.72, 1] };
  const K = 0.75, DEEP = [0.36, 0.22, 0.34], FC = {}, FF = {};
  const parse = (c) => { if (c[0] === '#') { const n = parseInt(c.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; } const m = c.match(/[\d.]+/g) || [255, 255, 255]; return [m[0] / 255, m[1] / 255, m[2] / 255]; };
  const css = (f, a = 1) => `rgba(${Math.round(f[0] * 255)},${Math.round(f[1] * 255)},${Math.round(f[2] * 255)},${a})`;
  const hue = (f) => { const mx = Math.max(...f), mn = Math.min(...f), d = mx - mn; if (d < 1e-6) return 0; const h = mx === f[0] ? ((f[1] - f[2]) / d + 6) % 6 : mx === f[1] ? (f[2] - f[0]) / d + 2 : (f[0] - f[1]) / d + 4; return h * 60; };
  // 塗る色 → 少し淡くして、いちばん強い色の成分を明るく持ち上げる（セロハンは明るい。暗さは重ねた枚数で出す）
  const soften = (v) => { const f = v.map((x) => 1 - K * (1 - x)), fm = Math.pow(Math.max(...f), 0.6); return f.map((x) => Math.min(1, x / fm)); };
  // 黄・赤・青の系統の膜は、セロハンの三原色へ半分寄せる（混色がはっきり出る）
  function snap(f) {
    if (Math.max(...f) - Math.min(...f) < 0.2) return f;
    const h = hue(f), t = h >= 38 && h < 75 ? PRIM.Y : h >= 330 || h < 12 ? PRIM.R : h >= 185 && h < 240 ? PRIM.B : null;
    return t ? f.map((x, i) => lerp(x, t[i], 0.55)) : f;
  }
  function film(c) {
    if (Array.isArray(c)) return { f: c, win: false };
    if (FC[c]) return FC[c];
    let r;
    if (c === LEA) r = { f: DEEP, win: false };
    else { const v = parse(c), mx = Math.max(...v), mn = Math.min(...v), lum = 0.3 * v[0] + 0.59 * v[1] + 0.11 * v[2];
      r = lum > 0.84 && mx - mn < 0.2 ? { f: v, win: true } : { f: snap(soften(v)), win: false }; }
    return (FC[c] = r);
  }
  const faceFilm = (c) => FF[c] || (FF[c] = soften(parse(c)));   // 顔と手は三原色へ寄せない（レモンにすると顔色が悪く見える）
  const EDGE = 1.5;   // 切り口のふちがほんの少し濃い（半枚分の帯。人形の単位）
  // 1枚の切り片を貼る
  function cello(g, path, c, rule = 'nonzero') {
    const F = film(c);
    g.save();
    if (F.win) { g.globalCompositeOperation = 'screen'; g.fillStyle = css(F.f, 0.55); g.fill(path, rule); g.restore(); return; }
    g.globalCompositeOperation = 'multiply'; g.fillStyle = css(F.f); g.fill(path, rule);
    g.clip(path, rule); g.strokeStyle = css(F.f, 0.45); g.lineWidth = EDGE; g.lineJoin = 'round'; g.stroke(path);
    g.restore();
  }
  // 同じ形を n 枚重ねる（目・口・鋲）
  function stack(g, path, f, n) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = css(f); for (let i = 0; i < n; i++) g.fill(path); g.restore(); }
  // 切り片の中の、陰の側にもう1枚：piecePath の中で、litPath の外側（evenodd）を同じ膜で
  function shadeOut(g, piecePath, c, litPath) {
    g.save(); g.clip(piecePath); const q = new Path2D(); q.rect(-4000, -4000, 8000, 8000); q.addPath(litPath); cello(g, q, c, 'evenodd'); g.restore();
  }
  function shadeIn(g, piecePath, c, path) { g.save(); g.clip(piecePath); cello(g, path, c); g.restore(); }
  // 線の列 → 帯の切り片（肩かけ・ひだ）
  function ribbon(pts, w0, w1 = w0) {
    const L = [], R = [], n = pts.length;
    for (let i = 0; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (n - 1)) / 2;
      L.push({ x: pts[i].x - dy / dd * w, y: pts[i].y + dx / dd * w }); R.push({ x: pts[i].x + dy / dd * w, y: pts[i].y - dx / dd * w }); }
    const q = new Path2D(); q.moveTo(L[0].x, L[0].y); for (const p of L.slice(1)) q.lineTo(p.x, p.y); for (const p of R.reverse()) q.lineTo(p.x, p.y); q.closePath(); return q;
  }
  // 丸い端の切り片（腕）：a→b、半幅 r、両端を ea・eb だけ延ばす（関節の所で隣の切り片と重なる）
  function capsule(a, b, r, ea = 0, eb = 0) {
    let dx = b.x - a.x, dy = b.y - a.y; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
    const A = { x: a.x - dx * ea, y: a.y - dy * ea }, B = { x: b.x + dx * eb, y: b.y + dy * eb }, nx = -dy, ny = dx, an = Math.atan2(ny, nx), q = new Path2D();
    q.moveTo(A.x + nx * r, A.y + ny * r); q.lineTo(B.x + nx * r, B.y + ny * r); q.arc(B.x, B.y, r, an, an - Math.PI, true); q.lineTo(A.x - nx * r, A.y - ny * r); q.arc(A.x, A.y, r, an - Math.PI, an - TAU, true); q.closePath();
    return q;
  }
  // 髪・帽子・持ち物の絵（kage_doll.js の形）を膜で描かせる：色の指定を膜の色に置きかえる
  const PROX = new WeakMap();
  function prox(g) {
    let p = PROX.get(g); if (p) return p;
    p = new Proxy(g, { get(t, k) { if (k === '__raw') return t; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
      set(t, k, v) { if ((k === 'fillStyle' || k === 'strokeStyle') && typeof v === 'string' && (v[0] === '#' || v.startsWith('rgb'))) v = css(film(v).f); t[k] = v; return true; } });
    PROX.set(g, p); return p;
  }
  const FILMAPI = { piece: (g, path, c) => cello(g.__raw || g, path, c) };

  // ---------- 人ごとの袖（服と違う色。胴の前を通る時に、重なりがオレンジ・紫・緑に） ----------
  const { Y, R, B } = PRIM;
  const SLEEVE = { conductor: R, twinA: B, twinB: B, smallkid: Y, girl: Y, grandma: Y, father: Y, plump: R, nun: Y, grandpa: Y, tallman: B, oldman: B, vendor: Y, mother: R,
    shygirl: R, salaryman: Y, youth: B, staff: Y, travelDad: B, travelKid: R, worker: Y, stargazer: R, priest: Y };
  // 白い口ひげは顔を横切る帯に見えた（試作のおじいさん）→ 短く、口の下へ
  const BEARD = {
    oldman: (g, R0) => cello(g, spline([{ x: -R0 * 0.14, y: R0 * 0.5 }, { x: R0 * 0.14, y: R0 * 0.5 }, { x: R0 * 0.08, y: R0 * 0.8 }, { x: 0, y: R0 * 0.92 }, { x: -R0 * 0.08, y: R0 * 0.8 }]), '#eee8f8'),
    stargazer: (g, R0) => cello(g, spline([{ x: -R0 * 0.16, y: R0 * 0.5 }, { x: R0 * 0.16, y: R0 * 0.5 }, { x: R0 * 0.1, y: R0 * 0.74 }, { x: 0, y: R0 * 0.82 }, { x: -R0 * 0.1, y: R0 * 0.74 }]), '#eee8f8'),
  };
  // 抱いた赤ちゃん：白いおくるみ（窓）に、淡い顔・レモンの髪・閉じた目・空色の小さな手。お母さんの服の色と濁らない
  function baby(g, d, p, G) {
    const N = G.neck, c = { x: N.x + G.yw * 6, y: N.y + d.J.R * 0.9 };
    g.save(); g.translate(c.x, c.y);
    cello(g, ell(0, 0, 24, 15, 0.12), '#fffaf0');
    cello(g, ell(-14, -12, 10.5, 10.5), faceFilm('#fff09a'));
    cello(g, spline([{ x: -24, y: -17 }, { x: -18, y: -26 }, { x: -7, y: -24 }, { x: -6, y: -17 }, { x: -15, y: -20 }]), PRIM.Y);
    for (const ex of [-18, -10]) { const q = new Path2D(); q.arc(ex, -12, 2.1, 0.2, 2.9); line(g, q, 1.3, 2); }
    cello(g, ell(-20, -8, 2.4, 1.6), '#ff8aa6');
    const w = p.babyHand || 0; if (w > 0.02) { const hx = 2 + 2 * Math.sin(w * 9), hy = -14 - 12 * w; cello(g, capsule({ x: 4, y: -6 }, { x: hx, y: hy }, 2.4), PRIM.B); cello(g, ell(hx, hy - 2, 3.4, 3.4), faceFilm('#fff09a')); }
    g.restore();
  }

  // ---------- 座る（p.sit 0〜1・p.seatY＝座面の高さ。人形の単位で、原点＝足もとの地面、上が負） ----------
  //   本人 2026-10-21「ベンチに座っている時の姿勢がなんか奇妙…身体がアコーデオンのようにつぶれている」（v4 までは胴を縦に縮め、すそを座面の高さまで上げていた）
  //   物理の模型：胴と頭の大きさは変えない。折れるのは腰とひざだけ（腰から上は形のまま下がる）。お尻は座面に乗る（沈まない）。
  //   衣のすそは、ひざで前へ折れて「ひざの上」の短い面になり、その前のふちから、すねと足が下へ垂れる（すねが届かない背丈なら、足はぶらさがる）。
  //   座る・立つ：腰が下がりながら、ひざが前へ出て折れていく。前かがみは座った側で大きい＝立つ時は、前かがみになってから腰が上がる
  //   正面の人形（|yaw|＜0.3）は、ももがこちらを向く＝ひざの面は短く、すねは両ひざから下へ
  const hipOf = (J) => J.hemUp + (J.bodyH - J.hemUp) * 0.4;   // 立った時の腰（ももの付け根）の高さ
  function seated(d, p) {
    const s = clamp(p.sit || 0, 0, 1); if (s <= 0) return d;
    const J = d.J, a = 1 - (1 - s) * (1 - s), hipS = hipOf(J), seatY = p.seatY ?? -hipS, hipY = seatY - J.hemW * 0.16, dy = (hipY + hipS) * a;
    const f = Math.abs(p.yaw || 0) > 0.3 ? Math.sign(p.yaw) : 0, lapT = Math.max(9, hipS * 0.42);
    const S = { s, a, f, hipS, seatY, dy, lapT, kr: lapT * 0.55, kneeX: J.topW + (J.hemW - J.topW) * 0.5 + (J.belly || 0) + hipS * 0.45, Ls: hipS * 0.7 + J.footR * 0.3, bow: f * 0.3 * Math.sin(Math.PI * s * s) };
    const d2 = Object.create(d); d2.J = Object.assign({}, J, { bodyH: J.bodyH - dy, hemUp: J.hemUp - dy }); d2.sit = S; return d2;
  }
  // 座った衣（すそ）の形：立った衣と同じ10点の並びで（間をなめらかにつなぐ）。f＝1 は右向き
  //   [腰の後ろ, 後ろのわき, お尻（座面）, 座面の上, ひざの下（座面の前のふち）, ひざの下に垂れるすそ, ひざの前, ももの上, 腰の前, 上]
  function lapPts(S, tw, wm, hw, yt) {
    const y = S.seatY, k = S.kneeX, r = S.kr;
    if (!S.f) return [{ x: -tw, y: yt }, { x: -wm, y: lerp(yt, y, 0.5) }, { x: -hw * 1.02, y: y - S.lapT * 0.3 }, { x: -hw * 0.5, y: y + 3 }, { x: 0, y: y + 2 }, { x: hw * 0.5, y: y + 3 }, { x: hw * 1.02, y: y - S.lapT * 0.3 }, { x: wm, y: lerp(yt, y, 0.5) }, { x: tw, y: yt }, { x: 0, y: yt - 2 }];
    const R = [{ x: -tw, y: yt }, { x: -wm * 0.98, y: lerp(yt, y, 0.55) }, { x: -hw * 0.85, y: y - 1 }, { x: -hw * 0.25, y: y + 0.5 }, { x: k - r * 0.6, y: y + 0.5 }, { x: k + r * 0.5, y: y + 3 }, { x: k + r, y: y - r * 0.9 }, { x: wm * 0.95, y: y - S.lapT }, { x: tw, y: yt }, { x: 0, y: yt - 2 }];
    if (S.f > 0) return R;
    const pair = [8, 7, 6, 5, 4, 3, 2, 1, 0, 9];   // 左向き：鏡に返し、立った衣の左右の対の点へ合わせる（間の形がねじれない）
    return pair.map((j) => ({ x: -R[j].x, y: R[j].y }));
  }
  // ひざの下（すねの付け根）：side＝−1/1（左右の足）
  function kneeAt(S, J, side) { return S.f ? { x: S.f * (S.kneeX - S.kr * 0.2) + side * J.footGap * 0.35, y: S.seatY + 1 } : { x: side * J.hemW * 0.45, y: S.seatY + 2 }; }

  // ---------- 骨組み：腰の鋲で、上の衣（胴）が下の衣（すそ）の上で回る ----------
  function geo(d, p) {
    const J = d.J, yw = clamp(p.yaw || 0, -1, 1), bs = 1 - 0.2 * Math.abs(yw), piv = { x: 0, y: -J.footR * 1.2 };
    const y0 = -J.bodyH + (p.hy || 0), hx = p.hx || 0, L = p.lean || 0, yWaist = lerp(y0, -J.hemUp, 0.42), bow = d.sit ? d.sit.bow : 0;
    const Ts = (q) => rot({ x: q.x * bs + hx, y: q.y }, piv, L * 0.35);
    const waist = Ts({ x: 0, y: yWaist });
    const Tb = (q) => rot(Ts(q), waist, L * 0.65 + bow);
    const G = { bs, yw, Ts, Tb, T: (q) => (q.y < yWaist ? Tb(q) : Ts(q)), y0, hx, L, piv, yWaist, waist };
    G.neck = Tb({ x: 0, y: y0 });
    G.head = rot(Tb({ x: yw * J.R * 0.06, y: y0 - J.R * 0.72 }), G.neck, p.tilt || 0);
    for (const [k, s] of [['L', -1], ['R', 1]]) { const nearK = yw < -0.3 ? 'L' : yw > 0.3 ? 'R' : null, x = s * (J.topW + J.armW * 0.12) * (k === nearK ? 1 / Math.max(0.5, bs) : 1); G['sh' + k] = Tb({ x, y: y0 + J.R * 0.28 + J.armW * 0.75 }); }
    return G;
  }

  // ---------- 衣（すそ・胴）・陰・ひだ・模様・肩かけ ----------
  function robe(g, gp, d, p, G, ss) {
    const J = d.J, R0 = J.R, y0 = G.y0, hy = -J.hemUp, tw = J.topW, hw = J.hemW, bl = J.belly || 0, sw = p.hem || 0, col = film(d.robe).win ? [1, 0.96, 0.86] : d.robe;   // 白い服（司祭）は淡いクリームの膜
    const ys = y0 + R0 * 0.32, ym = lerp(y0, hy, 0.5), wm = tw + (hw - tw) * 0.5 + bl;
    const sideX = (y) => (y <= ys ? tw : y <= ym ? lerp(tw, wm, (y - ys) / (ym - ys)) : lerp(wm, hw, (y - ym) / (hy - ym)));
    const yb = G.yWaist + 8, yt = G.yWaist - 6, wb = sideX(yb), wt = sideX(yt), S = d.sit, a = S ? S.a : 0;
    let sk = [{ x: -wt, y: yt }, { x: -wm, y: ym }, { x: -hw + sw, y: hy }, { x: -hw * 0.5 + sw, y: hy + 2.5 }, { x: sw * 0.8, y: hy + 1 }, { x: hw * 0.5 + sw, y: hy + 2.5 }, { x: hw + sw, y: hy }, { x: wm, y: ym }, { x: wt, y: yt }, { x: 0, y: yt - 2 }];
    if (S) { const L1 = lapPts(S, wt, wm, hw, yt); sk = sk.map((q, i) => ({ x: lerp(q.x, L1[i].x, a), y: lerp(q.y, L1[i].y, a) })); }   // 座る：すそが、ひざで前へ折れた形へ
    const skirt = spline(sk.map(G.Ts));
    const bod = spline([{ x: -tw * 0.5, y: y0 - 1 }, { x: -tw, y: ys }, { x: -wb, y: yb }, { x: -wb * 0.5, y: yb + 2 }, { x: 0, y: yb + 3 }, { x: wb * 0.5, y: yb + 2 }, { x: wb, y: yb }, { x: tw, y: ys }, { x: tw * 0.5, y: y0 - 1 }].map(G.Tb));
    cello(g, skirt, col); cello(g, bod, col);   // 胴のすそがすその上に重なる帯＝帯締め（2枚分）
    // 陰の側の三日月（すそと胴に1枚ずつ）
    shadeOut(g, skirt, col, spline([{ x: -ss * hw * 2, y: yt - 20 }, { x: ss * wt * 0.3, y: yt - 20 }, { x: ss * wm * 0.42, y: ym }, { x: ss * hw * 0.52 + sw, y: hy + 12 }, { x: -ss * hw * 2, y: hy + 12 }].map(G.Ts)));
    shadeOut(g, bod, col, spline([{ x: -ss * tw * 3, y: y0 - 20 }, { x: ss * tw * 0.42, y: y0 - 20 }, { x: ss * tw * 0.5, y: ys }, { x: ss * wb * 0.55, y: yb + 6 }, { x: -ss * tw * 3, y: yb + 6 }].map(G.Tb)));
    // すそのひだ：細長い切り片を斜めに。陰の側で2枚が重なって段になる
    const H = hy - yt, folds = [[0.12, 0.3, 0.22], [0.3, 0.6, 0.24], [-0.38, -0.52, 0.16]];
    if (a < 0.5) for (const [a, b, w] of folds) { const top = { x: ss * a * wt, y: yt + H * 0.18 }, bot = { x: ss * b * hw + sw, y: hy + 2 };
      shadeIn(g, skirt, col, spline([{ x: top.x - 1.5, y: top.y }, { x: top.x + 1.5, y: top.y }, { x: bot.x + ss * w * hw * 0.5, y: bot.y }, { x: bot.x - ss * w * hw * 0.5, y: bot.y }].map(G.Ts))); }
    else if (S.f) { const y = S.seatY, k = S.f * S.kneeX;   // 座った時：ももの下の陰（座面に当たる側）と、ひざへ向かう2本のひだ
      shadeIn(g, skirt, col, capsule(G.Ts({ x: -S.f * hw * 0.7, y: y - 1 }), G.Ts({ x: k, y: y - 1 }), S.lapT * 0.3));
      for (const u of [0.35, 0.7]) shadeIn(g, skirt, col, ribbon([G.Ts({ x: S.f * wm * 0.4, y: lerp(yt, y, 0.5) + u * 6 }), G.Ts({ x: k * 0.95, y: y - S.lapT * (0.75 - u * 0.4) })], 3.2, 1.2)); }
    else shadeIn(g, skirt, col, capsule(G.Ts({ x: -hw * 0.9, y: S.seatY + 1 }), G.Ts({ x: hw * 0.9, y: S.seatY + 1 }), S.lapT * 0.3));
    // 腕の下（わきの下）と、あごの下
    for (const s of [-1, 1]) { const c = G.Tb({ x: s * tw * 0.95, y: ys + R0 * 0.62 }); shadeIn(g, bod, col, ell(c.x, c.y, tw * 0.3, R0 * 0.6)); }
    { const c = G.Tb({ x: G.yw * R0 * 0.2, y: y0 + R0 * 0.1 }); shadeIn(g, bod, col, ell(c.x, c.y, R0 * 0.66, R0 * 0.3)); }
    // セロハンのしわ：薄い線と、光のむら（人形ごとに決まった所）
    creases(g, skirt, col, d.id + 'sk', G.Ts({ x: 0, y: lerp(yt, hy, 0.5) }), hw, H);
    const rp = new Path2D(); rp.addPath(skirt); rp.addPath(bod);
    KD.pattern(gp, d, p, { T: G.T, y0, yw: G.yw, robePath: rp });
    stole(g, d, p, G);
    return rp;
  }
  function creases(g, path, col, key, c, w, h) {
    const F = film(col); if (F.win) return;
    g.save(); g.clip(path); g.globalCompositeOperation = 'multiply'; g.strokeStyle = css(F.f, 0.32); g.lineWidth = 0.8; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const u = hsh(key + i), v = hsh(key + i + 'v'), a = (hsh(key + i + 'a') - 0.5) * 2.2, l = (0.25 + 0.3 * hsh(key + i + 'l')) * h, x = c.x + (u - 0.5) * w * 1.4, y = c.y + (v - 0.5) * h * 0.8;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.sin(a) * l * 0.5 + 3, y + Math.cos(a) * l * 0.5, x + Math.sin(a) * l, y + Math.cos(a) * l); g.stroke(); }
    g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,255,255,0.07)'; g.beginPath(); g.ellipse(c.x - w * 0.25, c.y - h * 0.15, w * 0.22, h * 0.32, 0.4, 0, TAU); g.fill();
    g.restore();
  }
  function stole(g, d, p, G) {
    if (!d.stole) return; const J = d.J, cols = d.stole, n = cols.length, w = J.topW * 0.34, px = G.yw * J.topW * 0.25, y0 = G.y0, S = d.sit, hy = S ? lerp(-J.hemUp, S.seatY - S.lapT * 0.4, S.a) : -J.hemUp;   // 座った時は、ひざの上で止まる
    for (const side of [-1, 1]) {
      const x0 = px + side * J.topW * 0.5, L = [{ x: x0 - side * 2, y: y0 }, { x: x0 + side, y: y0 + J.R * 0.6 }, { x: x0 + side * 3, y: lerp(y0, hy, 0.62) }, { x: x0 + side * 4, y: lerp(y0, hy, 0.8) }];
      for (let i = 0; i < n; i++) { const off = -w / 2 + (w / n) * (i + 0.5), pts = L.map((q) => G.T({ x: q.x + off, y: q.y })); cello(g, ribbon(pts, w / n + 0.9), cols[i]); }
      const e = G.T(L[3]); for (let i = -1; i <= 1; i++) cello(g, ribbon([{ x: e.x + i * w * 0.3, y: e.y - 1 }, { x: e.x + i * w * 0.34, y: e.y + 7 }], 2.2, 1.2), cols[(i + 1) % n]);   // 房
    }
  }

  // ---------- 腕：上腕・前腕・手の3枚を、肩・ひじ・手首の鋲でつなぐ（見せる鋲は肩とひじ） ----------
  //   k＝人形の腕（L/R）、sk＝その腕で描く場面の側（鏡に返した人形は逆）。手の位置と持ち物は場面の側から
  function arm(g, gp, d, p, G, k, ss, rv, sk = k) {
    const J = d.J, A = p['arm' + sk] || { x: J.ua * 0.2, y: (J.ua + J.fa) * 0.9 }, Rk = KD.armIK(d, G, k, A), sl = SLEEVE[d.id] || d.sleeve || d.robe, w = J.armW, face = faceFilm(d.face);
    const ua = capsule(Rk.S, Rk.E, w * 0.5, w * 0.3, w * 0.12), fa = capsule(Rk.E, Rk.W, w * 0.46, w * 0.22, 0);
    cello(g, ua, sl); cello(g, fa, sl);
    // 腕の陰：陰の側（人形の右下）のふちに細い切り片
    for (const [a, b, r, path] of [[Rk.S, Rk.E, w * 0.5, ua], [Rk.E, Rk.W, w * 0.46, fa]]) { const dx = b.x - a.x, dy = b.y - a.y, dd = Math.hypot(dx, dy) || 1; let nx = -dy / dd, ny = dx / dd; if (nx * ss * 0.6 + ny * 0.8 < 0) { nx = -nx; ny = -ny; }
      shadeIn(g, path, sl, capsule({ x: a.x + nx * r * 0.62, y: a.y + ny * r * 0.62 }, { x: b.x + nx * r * 0.62, y: b.y + ny * r * 0.62 }, r * 0.42)); }
    const dx = Rk.W.x - Rk.E.x, dy = Rk.W.y - Rk.E.y, dd = Math.hypot(dx, dy) || 1, ux = dx / dd, uy = dy / dd, hr = J.handR, hc = { x: Rk.W.x + ux * hr * 0.55, y: Rk.W.y + uy * hr * 0.55 }, wav = A.wave || 0;
    // 袖口：色の膜の時だけ（白い袖口を窓にすると、後ろの胴まで白く抜けてしまう＝物理に合わない）
    if (d.cuff && !film(d.cuff).win) cello(g, capsule({ x: Rk.W.x - ux * 5, y: Rk.W.y - uy * 5 }, { x: Rk.W.x - ux * 1, y: Rk.W.y - uy * 1 }, w * 0.5), d.cuff);
    // 手：手のひらと親指の2枚（重なりが濃い）。陰の側に三日月
    const s = k === 'L' ? -1 : 1, ta = Math.atan2(uy, ux) - s * 0.9 + wav, palm = ell(hc.x, hc.y, hr, hr * 0.92, Math.atan2(uy, ux) + wav);
    cello(g, ell(hc.x + Math.cos(ta) * hr * 0.85, hc.y + Math.sin(ta) * hr * 0.85, hr * 0.4, hr * 0.36, ta), face); cello(g, palm, face);
    shadeOut(g, palm, face, ell(hc.x - ss * hr * 0.35, hc.y - hr * 0.35, hr * 1.02, hr));
    const it = d['item' + sk]; if (it) it(gp, d, p, G, Rk, hc);
    rv.push(Rk.S, Rk.E);
    Rk.hc = hc; return Rk;
  }
  // 足：すそから下がる丸い切り片。座った時は、ひざの下（座面の前のふち）から、すねが下へ垂れ、足先は前を向く
  function feet(g, d, p, G) {
    const J = d.J, col = d.legs ? d.legs : faceFilm(d.face), S = d.sit;
    for (const [k, s] of [['L', -1], ['R', 1]]) { const f = p['foot' + (G.M ? G.M[k] : k)] || {}, lift = (f.lift || 0) * J.footR * 1.6;
      let x = (s * J.footGap + (f.dx || 0) + G.hx * 0.3) * G.bs, y = -J.footR * 0.55 - lift;
      if (S) { const kn = kneeAt(S, J, s), top = { x: lerp(x, kn.x * G.bs, S.a), y: lerp(-J.hemUp - S.dy, kn.y, S.a) };
        x = lerp(x, (kn.x + (S.f || 0) * J.footR * 0.45 + (f.dx || 0)) * G.bs, S.a); y = lerp(y, Math.min(-J.footR * 0.55, kn.y + S.Ls) - lift, S.a);
        if (y - top.y > 3) cello(g, capsule(top, { x, y }, J.footR * 0.62, 2, 0), col); }
      cello(g, ell(x, y, J.footR * 1.15, J.footR * 0.8), col); }
  }

  // ---------- 頭：顔の膜・陰の三日月・ほお・目と口（濃い膜の重ね）・髪・帽子・ひげ ----------
  function head(g, gp, d, p, G, ss) {
    const J = d.J, R0 = J.R, b = J.band, yw = G.yw, h = G.head, fx = yw * R0 * 0.36, m = clamp(p.mouth || 0, 0, 1), face = faceFilm(d.face);
    g.save(); g.translate(h.x, h.y); g.rotate((p.tilt || 0) + G.L);
    const hs = d.head === 'wide' ? [1.1, 0.95] : d.head === 'tall' ? [0.93, 1.08] : [1, 1], rx = R0 * hs[0] * (1 - 0.06 * Math.abs(yw)), ry = R0 * hs[1], hp = ell(0, 0, rx, ry);
    // 後ろの髪・ずきん・ベールは、顔の所を切り抜いてある（顔は顔の膜の色のまま）
    if (d.hairBack) { g.save(); const hole = new Path2D(); hole.rect(-R0 * 5, -R0 * 5, R0 * 10, R0 * 10); hole.addPath(ell(0, 0, rx * 0.98, ry * 0.98)); g.clip(hole, 'evenodd'); d.hairBack(gp, R0, b, p, yw); g.restore(); }
    cello(g, hp, face);
    shadeOut(g, hp, face, ell(-ss * R0 * 0.26, -R0 * 0.2, rx * 1.0, ry * 1.0));
    const sq = (side) => 1 - 0.55 * Math.max(0, -side * yw);
    for (const side of [-1, 1]) cello(g, ell(fx + side * R0 * 0.48 * (1 - 0.3 * Math.abs(yw)), R0 * 0.2, R0 * 0.12 * sq(side), R0 * 0.085), '#ff8aa6');
    const sh = clamp(p.shout || 0, 0, 1), eo = clamp(1 - Math.max(p.blink || 0, sh > 0.5 ? 1 : 0), 0.12, 1), lk = R0 * 0.05 * (p.look || 0);
    for (const side of [-1, 1]) { const ex = fx + side * R0 * 0.3 * (1 - 0.25 * Math.abs(yw));
      if (eo < 0.2 && sh > 0.5) { const q = new Path2D(); q.arc(ex, -R0 * 0.02, R0 * 0.1 * sq(side), 1.15 * Math.PI, 1.85 * Math.PI); line(g, q, b * 0.6, 2); }
      else if (eo < 0.2) line(g, new Path2D(`M${ex - R0 * 0.07 * sq(side)} ${-R0 * 0.08}L${ex + R0 * 0.07 * sq(side)} ${-R0 * 0.08}`), b * 0.45, 2);
      else stack(g, ell(ex + lk, -R0 * 0.08, R0 * 0.072 * sq(side), R0 * 0.082 * eo), DEEP, 3); }
    if (d.glasses) { const q = new Path2D(); for (const side of [-1, 1]) { const ex = fx + side * R0 * 0.3 * (1 - 0.25 * Math.abs(yw)); if (d.glasses === 'square') q.rect(ex - R0 * 0.18 * sq(side), -R0 * 0.2, R0 * 0.36 * sq(side), R0 * 0.24); else q.addPath(ell(ex, -R0 * 0.08, R0 * 0.18 * sq(side), R0 * 0.17)); }
      q.moveTo(fx - R0 * 0.12, -R0 * 0.1); q.lineTo(fx + R0 * 0.12, -R0 * 0.1); line(g, q, b * 0.42, 1); }
    if (BEARD[d.id]) { g.save(); g.translate(fx, 0); BEARD[d.id](g, R0); g.restore(); } else if (d.beard) d.beard(gp, R0, b, p, yw, fx);
    const mx = fx, my = R0 * 0.32;
    if (m < 0.1 && sh < 0.05) { const q = new Path2D(); q.arc(mx, my - R0 * 0.13, R0 * 0.14, 0.26 * Math.PI, 0.74 * Math.PI); line(g, q, b * 0.55, 2); }
    else { const mm = Math.max(m, sh), w = R0 * (0.1 + 0.045 * mm + 0.06 * sh), dp = R0 * (0.045 + 0.11 * mm + 0.1 * sh), q = new Path2D(); q.moveTo(mx - w, my - R0 * 0.02); q.quadraticCurveTo(mx, my + R0 * 0.02, mx + w, my - R0 * 0.02); q.quadraticCurveTo(mx + w * 0.95, my + dp * 1.5, mx, my + dp * 1.3); q.quadraticCurveTo(mx - w * 0.95, my + dp * 1.5, mx - w, my - R0 * 0.02); q.closePath(); stack(g, q, DEEP, 2); }
    if (d.hair) d.hair(gp, R0, b, p, yw, fx);
    if (d.hat && window.__hideHat !== d.id) d.hat(gp, R0, b, p, yw, fx);   // __hideHat：付け物の検査（check_acc.py）で、その人の帽子・ヘッドホンだけを描かずに比べる
    g.restore();
  }
  function line(g, path, w, n) { g.save(); g.globalCompositeOperation = 'multiply'; g.strokeStyle = css(DEEP); g.lineWidth = w; g.lineCap = 'round'; for (let i = 0; i < n; i++) g.stroke(path); g.restore(); }

  // ---------- 持ち替え：向き → どちらの人形か・横幅 ----------
  //   細くなる幅を広く取る：1秒15枚で、向きを0.45秒かけて変えれば、必ず横幅0.35より細いコマが1枚以上ある（check_cello.py の④）
  function turn(yaw) {
    const a = Math.abs(yaw || 0), s = Math.sign(yaw || 0) || 1;
    if (a < 0.12) return { yaw: 0, w: 1 };
    if (a < 0.4) return { yaw: 0, w: Math.cos(Math.PI / 2 * (a - 0.12) / 0.28) };
    if (a < 0.6) return { yaw: s * 0.62, w: Math.sin(Math.PI / 2 * (a - 0.4) / 0.2) };
    return { yaw: s * 0.62, w: 1 };
  }

  // ---------- 1体 ----------
  // 返り値は kage_doll.js の draw と同じ形。操り棒の付け根（人形の単位）は g.canvas.rods に置く（kage_engine.js が下へのばして描く）
  function draw(g0, d0, p0) {
    const g = g0.__raw || g0, gp = prox(g), p = Object.assign({}, p0);
    let flip = p0.flip ?? 1;
    if (p0.spin != null) { p.yaw = 0; flip = Math.cos(p0.spin); }
    else { const t = turn(p0.yaw); p.yaw = t.yaw; flip *= t.w; }
    p.back = false;   // 影絵に後ろ姿はない（裏返しても同じ切り片の鏡の形）
    const d = seated(d0, p), G = geo(d, p), ss = p.yaw < -0.3 ? -1 : 1, rv = [], out = {};
    const sx = Math.sign(flip || 1) * Math.max(0.035, Math.abs(flip));
    // 鏡に返した人形（sx＜0）は、人形の右の腕が画面の左に来る。場面の「左の手」は人形の右の腕で描く（腕・足・持ち物の左右は画面の側のまま）
    const M = sx < 0 ? { L: 'R', R: 'L' } : { L: 'L', R: 'R' }; G.M = M;
    const near = p.yaw > 0.3 ? 'R' : p.yaw < -0.3 ? 'L' : null, fr = { L: !!(p['arm' + M.L] && p['arm' + M.L].front) || near === 'L', R: !!(p['arm' + M.R] && p['arm' + M.R].front) || near === 'R' };
    if (near) fr[near === 'L' ? 'R' : 'L'] = false;
    g.save(); g.scale(sx, 1);
    KD.setFilm(FILMAPI);
    const px = Math.abs(g.getTransform().d);
    // 胴の後ろの腕：胴の厚みの分だけスクリーンから離れる＝ふちがほんの少しやわらかい（寄っても 1.1px まで。ぼけに見せない）
    for (const k of ['L', 'R']) if (!fr[k]) { g.filter = `blur(${Math.min(1.1, 0.4 * px).toFixed(2)}px)`; out[k] = arm(g, gp, d, p, G, k, ss, rv, M[k]); g.filter = 'none'; }
    if (d.back) d.back(gp, d, p, G);
    feet(g, d, p, G);
    G.robePath = robe(g, gp, d, p, G, ss);
    if (d.front) d.front(gp, d, p, G);
    if (d.id === 'mother') baby(g, d, p, G); else if (d.held) d.held(gp, d, p, G);
    head(g, gp, d, p, G, ss);
    for (const k of ['L', 'R']) if (fr[k]) out[k] = arm(g, gp, d, p, G, k, ss, rv, M[k]);
    // 鋲：肩とひじだけ（小さく・淡く）
    const rr = Math.max(0.9, d.J.armW * 0.065);
    g.save(); g.globalAlpha = 0.5; for (const q of rv) stack(g, ell(q.x, q.y, rr, rr), DEEP, 1); g.restore();
    KD.setFilm(null);
    g.canvas.rods = [{ x: G.neck.x * sx, y: G.neck.y + d.J.R * 0.3, dx: 0.03 }].concat(['L', 'R'].filter((k) => out[k]).map((k) => ({ x: out[k].hc.x * sx, y: out[k].hc.y, dx: (k === 'L' ? -0.2 : 0.2) * Math.sign(sx) })));
    g.restore();
    return { G, arms: out, front: fr };
  }

  // ---------- 1本目・2本目の仲間（大聖堂の会衆の中の小さな影）：kage_doll.js の mini と同じ形を、セロハンで ----------
  // p.up：腕の上がり（0＝下ろす・1＝万歳）、p.clap：胸の前の手拍子（1＝手が合う）、p.hop：跳ね、p.lean：体の揺れ（足もとを中心に傾く・ラジアン）、p.dx：横へのステップ（人形の単位）
  function mini(g0, kind, p = {}) {
    const g = g0.__raw || g0, m = KD.MINI[kind], s = m.h, hop = (p.hop || 0) * 10, up = clamp(p.up || 0, 0, 1), cl = clamp(p.clap || 0, 0, 1);
    const fur = m.teddy ? '#c88a4a' : m.film, coat = m.teddy ? '#2f9e5c' : fur, hR = m.teddy ? 21 : 17, hy = m.teddy ? -94 : -92;
    g.save(); g.translate((p.dx || 0) * s, -hop); g.rotate(p.lean || 0); g.scale(s, s);
    // 箱の子（1本目のサム・古いツリーの段ボール箱）：箱は頭の上に載せて、両手で左右のはしを持つ（v4 までは箱が頭から浮き、手も届かず、何か分からない緑の板に見えた。本人 2026-10-21「これはミスかな？」）
    //   決め所（up）では、箱を少し持ち上げて掲げる。手拍子はしない（両手がふさがっている）。体の揺れ・ステップ・跳ねで乗る
    const lift = m.box ? 16 * up : 0, bt = hy - hR + 3 - lift, BH = 30, BW = 30;   // 箱の下の端（頭のてっぺんに少しかかる）・高さ・半幅
    const handAt = (s2) => (m.box ? { x: s2 * (BW + 2), y: bt - BH * 0.45 } : { x: s2 * lerp(lerp(30, 34, up), 5, cl), y: lerp(lerp(-44, -112, up), -62, cl) });
    for (const s2 of [-1, 1]) cello(g, capsule({ x: s2 * 9, y: -34 }, { x: s2 * 12, y: -6 }, 6.5), faceFilm(fur));
    cello(g, spline([{ x: -18, y: -76 }, { x: 18, y: -76 }, { x: 22, y: -48 }, { x: 16, y: -28 }, { x: -16, y: -28 }, { x: -22, y: -48 }]), m.teddy ? coat : faceFilm(fur));
    if (m.teddy) for (const s2 of [-1, 1]) { cello(g, ell(s2 * 15, hy - 16, 8, 8), faceFilm(fur)); }
    cello(g, ell(0, hy, hR, hR), faceFilm(fur));
    if (m.teddy) cello(g, ell(0, hy + 7, 9, 6.5), '#fff2dc');
    if (m.box) {   // 箱（深い緑の段ボール・古いガムテープ・ツリーの絵・下のふちから垂れて揺れるモール）。手より先に描く（手が箱のはしをつかむ）
      const sw = Math.sin((p.hop || 0) * 3 + (p.lean || 0) * 20) * 0.5, gx = -BW + 6;
      for (let k = 0; k <= 5; k++) { const u = k / 5; cello(g, ell(gx + sw * 14 * u * u, bt + 2 + 26 * u, 2.6, 2.6), k % 2 ? '#ff5a5a' : '#ffd02a'); }   // モール（金と赤の玉が垂れる）
      for (const s2 of [-1, 1]) { const q = new Path2D(); q.moveTo(s2 * 2, bt - BH); q.lineTo(s2 * BW * 0.95, bt - BH); q.lineTo(s2 * (BW * 0.95 + 6), bt - BH - 9); q.lineTo(s2 * 6, bt - BH - 11); q.closePath(); cello(g, q, '#5aa86e'); }   // 開いたふた（2枚）
      { const q = new Path2D(); q.roundRect(-BW, bt - BH, 2 * BW, BH, 2.5); cello(g, q, '#3e8a56'); }   // 箱（角はほとんど丸めない＝箱に見える）
      cello(g, new Path2D(`M${-BW} ${bt - BH * 0.55} h${2 * BW} v5 h${-2 * BW} Z`), '#d8c49a');   // 古いガムテープ
      { const q = new Path2D(); q.moveTo(-BW * 0.55, bt - 5); q.lineTo(-BW * 0.38, bt - BH + 6); q.lineTo(-BW * 0.2, bt - 5); q.closePath(); cello(g, q, '#7ad890'); }   // 箱の絵（ツリー）
      cello(g, ribbon([{ x: -BW * 0.7, y: bt - BH }, { x: -BW * 0.8, y: bt - BH - 8 }, { x: -BW * 0.55, y: bt - BH - 11 }], 3, 2), '#3ab04a');   // ふたからのぞく枝
    }
    for (const s2 of [-1, 1]) { const h = handAt(s2); cello(g, capsule({ x: s2 * 15, y: -70 }, h, 5), m.teddy ? coat : faceFilm(fur)); cello(g, ell(h.x, h.y, 6.5, 6.5), faceFilm(fur)); }
    if (m.teddy) cello(g, ell(0, -60, 3.6, 3.6), PRIM.Y); else m.buttons.forEach((c, i) => cello(g, ell(0, -64 + i * 13, 3.4, 3.4), c));
    if (m.scarf) cello(g, spline([{ x: -16, y: -80 }, { x: 16, y: -80 }, { x: 15, y: -72 }, { x: -15, y: -72 }]), PRIM.R);
    if (m.crown) { const q = new Path2D(); q.moveTo(-13, hy - 12); for (let k = 0; k <= 4; k++) q.lineTo(-13 + k * 6.5, hy - (k % 2 ? 20 : 28)); q.lineTo(13, hy - 12); q.closePath(); cello(g, q, PRIM.Y); }
    if (m.tin) cello(g, ell(0, -54, 13, 9), PRIM.B);
    for (const s2 of [-1, 1]) stack(g, ell(s2 * 6.5 + (p.look || 0) * 1.5, hy - 3, 2.2, 2.2), DEEP, 3);
    { const q = new Path2D(); q.arc(0, hy + (m.teddy ? 6 : 3), 6, 0.2 * Math.PI, 0.8 * Math.PI); line(g, q, 2, 2); }
    if (!m.teddy) { g.save(); g.globalCompositeOperation = 'screen'; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.lineCap = 'round'; for (const s2 of [-1, 1]) { g.beginPath(); g.moveTo(s2 * 6, -8); g.quadraticCurveTo(s2 * 12, -13, s2 * 17, -8); g.stroke(); } g.restore(); }   // 足のアイシング（白い線＝窓）
    g.restore();
    // 操り棒：聖歌隊と同じ決まり（首の下と両手から、下の人形遣いの手もとへ。傾きも同じ）。棒は人形の単位で置く（跳ね・揺れ・ステップに付いて動く）
    //   本人 2026-10-21「クマさんたちに針金がないのはわざと？」＝v4 までは仲間の部品だけ棒の付け根を置いていなかった（抜け）。屋上・最後の広場は場面の側で棒を描かない
    const c = Math.cos(p.lean || 0), sn = Math.sin(p.lean || 0), at = (q) => ({ x: (p.dx || 0) * s + (c * q.x - sn * q.y) * s, y: -hop + (sn * q.x + c * q.y) * s });
    g.canvas.rods = [Object.assign(at({ x: 0, y: -70 }), { dx: 0.03 }), Object.assign(at(handAt(-1)), { dx: -0.2 }), Object.assign(at(handAt(1)), { dx: 0.2 })];
  }

  window.KC = { draw, seated, film, faceFilm, cello, stack, css, DEEP, PRIM, SLEEVE, geo, mini, turn, capsule, ribbon };
  if ((V.S.data || {}).cello) { KD.draw = draw; KD.seated = seated; }   // 座った骨組み（手の位置・腕の検査）もセロハンの座り方で
})();
