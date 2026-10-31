// グリーティングカードの絵：ソーイング（フォーク「きみといる、それがクリスマス」）。共通/greet_cards.js の mountGreet が使う
// build() が返す物＝{ S（step・total・done）, draw(x, t), busy(t), tap(t, sfx), ambient?(t, sfx), ready?（MV の部品を読み終えたら解ける Promise）, snow? }
// フェルトの夜の居間（MV の見本C「12月24日の夜更けの居間」）。ソファでうたた寝のテディと、その前に立つジンジャーブレッド（MV の人物そのもの＝共通/mv/felt_rig.js）
// さわるたびに、針がしばらくさらさらと縫い進む（本人 2026-11-01「１クリックでしばらくさらさらと縫い込んでいって」）：
//   ① Merry ② Christmas ③ 手作りのツリーに玉・モール・星 ④ クッキーが自分の胸の金のボタンを外して、テディのセーターの取れていた穴に3回縫いつける ⑤ テディが目をさまして笑う・窓の外をサンタのそり
// 字は線の細い筆記体＝糸1本が線そのもの（太い字を塗って点線を重ねると「ゼブラみたい」＝フォークの MV の題字 2026-10-20）
import { W, H, TAU, clamp, ease, easeInOut, spring, layer, fitFont, loadMV } from './greet_kit.js';

const TEXT = 'Merry Christmas', HAND = (s) => `italic 700 ${s}px "Segoe Script",cursive`, TY = 42;
const WIN = { x: 152, y: 74, w: 70, h: 64 }, TRX = 70, SEAT = 222, SC = 0.6, TDX = 292, GX = TDX - 64 * SC, FLOOR = SEAT + 80 * SC;   // 窓の空／ツリーのまん中／ソファの座面・人形の大きさ・テディ・クッキーの立つ所（MV と同じ間合い）
const GOLD = '#f2c14e', THREAD = 'rgba(250,214,110,1)';

export function build() {
  const m = document.createElement('canvas').getContext('2d'), fs = fitFont(m, HAND, 40, TEXT, 280); m.font = HAND(fs);
  const tw = m.measureText(TEXT).width, X0 = W / 2 - tw / 2, W1 = m.measureText('Merry ').width / tw;   // W1＝1回目に縫う所（Merry の後ろまで）
  // ---------- フェルトの道具（形 path(g, 内側へ寄せる量) を、塗り → 毛羽 → 内側の縫い目 で貼る） ----------
  const FELT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); let s = 3; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) { g.fillStyle = r() < 0.5 ? 'rgba(40,20,10,.10)' : 'rgba(255,255,255,.13)'; g.fillRect(r() * 64, r() * 64, 1.2, 1.2); } return c; })();
  let PAT = null;
  function felt(g, path, col, o = {}) {
    if (!PAT) PAT = g.createPattern(FELT, 'repeat');
    g.save();
    if (o.sh !== 0) { g.save(); g.shadowColor = 'rgba(40,20,10,.38)'; g.shadowBlur = o.sh || 3; g.shadowOffsetY = (o.sh || 3) * 0.5; path(g, 0); g.fillStyle = col; g.fill(); g.restore(); }
    path(g, 0); g.fillStyle = col; g.fill(); g.save(); g.clip(); g.fillStyle = PAT; g.fillRect(0, 0, W, H); g.restore();
    if (o.st !== 0) { g.setLineDash(o.dash || [2.4, 2]); g.lineWidth = o.tw || 0.9; g.strokeStyle = o.thread || 'rgba(255,246,228,.7)'; path(g, o.inset ?? 2.2); g.stroke(); g.setLineDash([]); }
    g.restore();
  }
  const rr = (x0, y0, w, h, r) => (g, i) => { g.beginPath(); g.roundRect(x0 + i, y0 + i, Math.max(1, w - 2 * i), Math.max(1, h - 2 * i), Math.max(0, r - i)); };
  const el = (cx, cy, rx, ry) => (g, i) => { g.beginPath(); g.ellipse(cx, cy, Math.max(0.5, rx - i), Math.max(0.5, ry - i), 0, 0, TAU); };
  const poly = (pts) => { const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length, sz = Math.max(...pts.map((p) => Math.hypot(p[0] - cx, p[1] - cy)));
    return (g, i) => { const k = Math.max(0.1, 1 - i / sz); g.beginPath(); pts.forEach(([a, b], j) => (j ? g.lineTo(cx + (a - cx) * k, cy + (b - cy) * k) : g.moveTo(cx + (a - cx) * k, cy + (b - cy) * k))); g.closePath(); }; };
  const heart = (cx, cy, s) => (g, i) => { const k = s - i * 0.12; g.beginPath(); g.moveTo(cx, cy + 6 * k); g.bezierCurveTo(cx - 12 * k, cy - 2 * k, cx - 6 * k, cy - 12 * k, cx, cy - 5 * k); g.bezierCurveTo(cx + 6 * k, cy - 12 * k, cx + 12 * k, cy - 2 * k, cx, cy + 6 * k); };
  // 手作りのツリー（4段のフェルト。すそは波形）と、あとから縫いつける飾り
  const TIERS = [[74, 112, 26], [98, 144, 36], [126, 178, 46], [156, 214, 56]].map(([y0, y1, hw]) => { const pts = [[TRX, y0]]; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([TRX + hw - 2 * hw * u, y1 + (k % 2 ? 4 : 0)]); } return poly([pts[0], ...pts.slice(1).reverse()].reverse()); });
  const ORN = [[TRX - 10, 104, '#e8283a'], [TRX + 12, 96, '#4a8ad8'], [TRX - 22, 136, GOLD], [TRX + 20, 134, '#e8283a'], [TRX - 2, 122, '#f08ab8'], [TRX - 30, 172, '#4a8ad8'], [TRX + 6, 162, GOLD], [TRX + 34, 170, '#f08ab8'], [TRX - 14, 200, GOLD], [TRX + 22, 202, '#e8283a']];
  const SWAG = [[[TRX - 30, 128], [TRX - 2, 146], [TRX + 33, 132]], [[TRX - 44, 168], [TRX - 4, 190], [TRX + 46, 176]]];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const bg = layer((x) => {
    felt(x, rr(0, 0, W, H, 16), '#2f7a4c', { sh: 0, st: 0 }); felt(x, rr(12, 12, W - 24, H - 24, 12), '#34416a', { sh: 4, thread: 'rgba(255,240,214,.6)', inset: 3 });   // ふち（緑）と、夜の壁（藍）
    x.save(); x.beginPath(); x.roundRect(12, 12, W - 24, H - 24, 12); x.clip();
    for (let yy = 26; yy < 250; yy += 18) for (let xx = 24 + ((yy / 18) % 2) * 9; xx < W - 14; xx += 18) { x.fillStyle = 'rgba(255,236,200,.10)'; x.beginPath(); x.moveTo(xx, yy - 3); x.lineTo(xx + 2.4, yy); x.lineTo(xx, yy + 3); x.lineTo(xx - 2.4, yy); x.fill(); }   // 壁紙の小さな菱形
    { const g = x.createRadialGradient(TDX, 170, 10, TDX, 170, 190); g.addColorStop(0, 'rgba(255,190,110,.22)'); g.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); }   // 暖炉の橙が、ソファのあたりに
    felt(x, rr(12, 250, W - 24, 50, 0), '#8a5a36', { sh: 0, st: 0 }); x.strokeStyle = 'rgba(60,30,12,.35)'; x.lineWidth = 1; for (const yy of [262, 275]) { x.beginPath(); x.moveTo(12, yy); x.lineTo(W - 12, yy); x.stroke(); } for (let k = 0; k < 9; k++) { const xx = 30 + k * 41 + (k % 2) * 17; x.beginPath(); x.moveTo(xx, 250 + (k % 3) * 12); x.lineTo(xx, 262 + (k % 3) * 12); x.stroke(); }   // 床板
    felt(x, el(150, 274, 72, 10), '#b8323e', { sh: 2, thread: 'rgba(255,220,200,.7)' });   // 敷物
    x.restore();
    // 窓：夜空・月・町の屋根と灯り（雪は CSS で、この空の中だけに降る）
    felt(x, rr(WIN.x - 6, WIN.y - 6, WIN.w + 12, WIN.h + 12, 4), '#f2e6cc', { sh: 3, thread: 'rgba(150,110,70,.55)' });
    felt(x, rr(WIN.x, WIN.y, WIN.w, WIN.h, 2), '#1f2a52', { sh: 0, st: 0 });
    x.save(); x.beginPath(); x.rect(WIN.x, WIN.y, WIN.w, WIN.h); x.clip();
    for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(255,250,220,.75)'; x.beginPath(); x.arc(WIN.x + rnd() * WIN.w, WIN.y + rnd() * 34, 0.6 + rnd() * 0.6, 0, TAU); x.fill(); }
    x.fillStyle = '#fff3c4'; x.beginPath(); x.arc(WIN.x + 54, WIN.y + 15, 7, 0, TAU); x.fill(); x.fillStyle = '#1f2a52'; x.beginPath(); x.arc(WIN.x + 57, WIN.y + 13, 6.2, 0, TAU); x.fill();   // 三日月
    for (const [a, w, h, c] of [[-4, 22, 16, '#2a3866'], [16, 18, 22, '#30407a'], [32, 24, 14, '#283462'], [54, 20, 19, '#2e3c70']]) { felt(x, poly([[WIN.x + a, WIN.y + WIN.h], [WIN.x + a, WIN.y + WIN.h - h], [WIN.x + a + w / 2, WIN.y + WIN.h - h - 8], [WIN.x + a + w, WIN.y + WIN.h - h], [WIN.x + a + w, WIN.y + WIN.h]]), c, { sh: 0, st: 0 });
      x.fillStyle = '#ffd86a'; x.fillRect(WIN.x + a + w / 2 - 2, WIN.y + WIN.h - h + 4, 4, 4); x.fillStyle = 'rgba(245,248,255,.9)'; x.beginPath(); x.moveTo(WIN.x + a - 1, WIN.y + WIN.h - h + 1); x.lineTo(WIN.x + a + w / 2, WIN.y + WIN.h - h - 8.5); x.lineTo(WIN.x + a + w + 1, WIN.y + WIN.h - h + 1); x.lineTo(WIN.x + a + w / 2, WIN.y + WIN.h - h - 5); x.fill(); }   // 屋根に雪
    x.restore();
    x.fillStyle = '#f2e6cc'; x.fillRect(WIN.x + WIN.w / 2 - 1.5, WIN.y, 3, WIN.h); x.fillRect(WIN.x, WIN.y + WIN.h / 2 - 1.5, WIN.w, 3);   // 窓の桟（頭の後ろではないので十字でよい）
    for (const s of [-1, 1]) { const cx = s < 0 ? WIN.x - 4 : WIN.x + WIN.w + 4; felt(x, poly([[cx - s * 2, WIN.y - 8], [cx + s * 14, WIN.y - 8], [cx + s * 6, WIN.y + 40], [cx + s * 12, WIN.y + WIN.h + 10], [cx - s * 4, WIN.y + WIN.h + 10]]), '#b8323e', { sh: 2 }); felt(x, el(cx + s * 6, WIN.y + 40, 5, 3), GOLD, { sh: 0, st: 0 }); }   // カーテンとタッセル
    // 手作りのツリー（拾った枝の幹・赤いバケツの鉢）とプレゼント
    felt(x, rr(TRX - 5, 210, 10, 22, 2), '#7a4a26', { sh: 2 }); TIERS.forEach((p, i) => felt(x, p, ['#2f8a4a', '#2a7e44', '#26743e', '#226a38'][i], { sh: 3, thread: 'rgba(230,250,220,.55)' }));
    felt(x, poly([[TRX - 20, 228], [TRX + 20, 228], [TRX + 15, 254], [TRX - 15, 254]]), '#c8323e', { sh: 3 }); felt(x, rr(TRX - 22, 226, 44, 6, 2), '#e8e0d0', { sh: 0 });
    for (const [a, b, w, h, c, rb] of [[18, 234, 30, 20, '#4a8ad8', GOLD], [94, 238, 26, 16, '#e8b830', '#c8323e'], [104, 226, 16, 12, '#f08ab8', '#fff4e0']]) { felt(x, rr(a, b, w, h, 2), c, { sh: 3 }); felt(x, rr(a + w / 2 - 2.5, b, 5, h, 0), rb, { sh: 0, st: 0 }); felt(x, el(a + w / 2 - 4, b - 2, 4, 2.6), rb, { sh: 0, st: 0 }); felt(x, el(a + w / 2 + 4, b - 2, 4, 2.6), rb, { sh: 0, st: 0 }); }
    // 小さな丸テーブルに、ケーキ（いちごとろうそく）
    felt(x, rr(161, 214, 7, 34, 2), '#7a4a26', { sh: 2, st: 0 }); felt(x, el(164.5, 250, 12, 3), '#6a3e20', { sh: 0, st: 0 }); felt(x, el(164.5, 213, 21, 5), '#9a6236', { sh: 3 });
    felt(x, el(164.5, 209, 16, 3.4), '#f0eef4', { sh: 0, st: 0 }); felt(x, rr(151, 193, 27, 16, 4), '#fff4ea', { sh: 2, thread: 'rgba(200,120,140,.7)' }); felt(x, rr(156.5, 183, 16, 11, 3), '#fff4ea', { sh: 1.5, st: 0 });
    x.fillStyle = '#f2a0b8'; x.beginPath(); for (let a = 151; a <= 178; a += 4.5) x.arc(a + 2.2, 193, 2.2, 0, Math.PI); x.fill();
    for (const a of [-5, 0, 5]) felt(x, el(164.5 + a, 182.5, 2.3, 2.1), '#e8283a', { sh: 0, st: 0 }); x.fillStyle = '#fff'; x.fillRect(163.5, 172, 2, 9); x.fillStyle = '#ffcf3a'; x.beginPath(); x.ellipse(164.5, 169.5, 1.8, 3, 0, 0, TAU); x.fill();
    // ソファ（深い緑）と、ひじかけ・座面・脚
    felt(x, rr(204, 148, 140, 80, 18), '#2a6446', { sh: 4 }); felt(x, rr(196, SEAT - 4, 156, 26, 9), '#327252', { sh: 3 });
    for (const [a, w] of [[190, 22], [332, 18]]) felt(x, rr(a, 176, w, 66, 10), '#2e6c4c', { sh: 3 });
    for (const a of [204, 336]) felt(x, rr(a, 244, 7, 8, 2), '#4a2a16', { sh: 0, st: 0 });
    // 縫う前の、うすい下書き
    x.font = HAND(fs); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(255,236,200,.13)'; x.fillText(TEXT, W / 2, TY);
  });
  // 糸の字（糸の色で書き、ところどころ布のすき間を抜いて、なみ縫いに見せる）
  const thread = layer((x) => { x.font = HAND(fs); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(20,10,30,.45)'; x.fillText(TEXT, W / 2 + 0.7, TY + 0.9); x.fillStyle = GOLD; x.fillText(TEXT, W / 2, TY);
    x.globalCompositeOperation = 'destination-out'; x.setLineDash([1.3, 3.6]); x.lineWidth = 3.2; x.strokeText(TEXT, W / 2, TY); x.globalCompositeOperation = 'source-over'; });

  // ---------- 物語の時刻 ----------
  const S = { step: 0, total: 5, done: false, t: [], hearts: [], hop: -9 };
  const since = (k, t) => (S.t[k] == null ? -1 : t - S.t[k]);
  // 字は1針ずつ：1針＝字の上を STL だけ進む・STD 秒（針を布に刺して、少し先から出す。出た所までの糸の字が見える）
  const STL = 8.5, STD = 0.24, WORDS = [[0, W1], [W1, 1]], NST = WORDS.map(([a, b]) => Math.ceil(((b - a) * tw) / STL)), TXT_D = NST.map((n) => n * STD);
  const TREE_D = 3.1, SEW0 = 1.05, SEWD = 0.85, SEWN = 3, BTN_D = SEW0 + SEWN * SEWD + 0.6, WAKE_D = 3.2;
  const sewAt = (u) => { const k = (u - SEW0) / SEWD; return k < 0 ? { n: 0, u: -1 } : k >= SEWN ? { n: SEWN, u: 1 } : { n: Math.floor(k), u: k - Math.floor(k) }; };
  // 縫えた所（字の幅の割合）と、いま縫っている針（針先の位置と、糸の出どころ）
  function textAt(t) { let p = 0, nd = null;
    WORDS.forEach(([w0, w1], k) => { const a = since(k, t); if (a < 0) return; if (a >= TXT_D[k]) { p = w1; return; }
      const c = a / STD, i = Math.floor(c), f = c - i, x0 = X0 + w0 * tw + i * STL; p = Math.min(w1, w0 + (i * STL) / tw);
      const dip = f < 0.55 ? Math.sin((f / 0.55) * Math.PI / 2) : Math.cos(((f - 0.55) / 0.45) * Math.PI / 2);   // 0 布の上 → 1 布に刺す → 0 少し先から出る
      nd = { x: x0 + STL * ease(f), y: TY + 9 * dip - 3, dip, from: { x: x0, y: TY + 5 } }; });
    return { p, nd }; }
  const textProg = (t) => textAt(t).p;

  // ---------- MV の人物（フェルトのテディとジンジャーブレッド） ----------
  let FR = null, M = null, TD = null, GB = null;
  const gold = (g, P, p) => { if (p.btnHold) { const h = p.btnHold === 'L' ? P.handL : P.handR; FR.button(g, { x: h.x, y: h.y - 6 }, 4.7, '#e8b830', '#a8761a', 'rgba(250,236,200,.95)', 0); } };   // 写し：MV の goldInHand（持つ手と同じ前後）
  const ready = loadMV(['felt_rig.js', 'felt_moves.js'], { 'felt_rig.js': 'FR', 'felt_moves.js': 'MV_MOVES' }).then((L) => { FR = L.FR; M = L.MV_MOVES;
    TD = FR.make('teddy', {}); GB = FR.make('ginger', { hooks: { heldL: (g, P, p) => { if (p.btnHold === 'L') gold(g, P, p); }, heldR: (g, P, p) => { if (p.btnHold === 'R') gold(g, P, p); } } }); });
  const oT = { x: TDX, y: SEAT, sc: SC };
  const lp = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  function teddy(t) {
    const J = TD.J, b4 = since(3, t), w = since(4, t), sn = b4 < 0 ? 0 : sewAt(b4), sewn = b4 < 0 ? 0 : Math.min(SEWN, sn.n + (sn.u >= 0.58 ? 1 : 0));
    const p = Object.assign({}, FR.REST, { t, tb: ['wood', 'hole', b4 >= 0.8 ? 'gold' : 'hole'], sewn, blink: 0 }); M.sit(p, J, { drop: 6 + 1.2 * Math.sin(t * 1.3) });
    p.pelvis = -0.05; p.waist = -0.03; Object.assign(p, { turn: -0.3, look: -0.7, lookY: -0.2, neck: -0.1, lid: 0.6 });   // うたた寝
    if (w >= 0) { const a = ease(w / 0.3), b = ease((w - 0.35) / 0.4), c = ease((w - 0.95) / 0.35);
      p.lid = 0.6 * (1 - a); p.lookY = -0.2 + 1.2 * b - 0.4 * c; p.neck = -0.1 + 0.26 * b - 0.12 * c; p.turn = -0.3 - 0.25 * c; p.look = -0.7 + 0.4 * b - 0.7 * c; p.happy = w > 1.3 ? 1 : 0; }   // 気づき → 目 → 頭 → ボタンを見下ろす → クッキーを見て笑う
    else if (b4 > SEW0 + 0.6) p.lid = 0.45;   // 糸を引かれて、うっすら
    M.hand(p, J, 1, -76, 52, 'down'); M.hand(p, J, -1, 76, 52, 'down');
    if (S.done && t - S.hop < 0.8) p.neck += 0.12 * Math.sin(Math.PI * clamp((t - S.hop) / 0.8, 0, 1));
    return p;
  }
  // テディの、取れていた下のボタンの穴（画面の点）
  const btnAt = () => { const p = Object.assign({}, FR.REST, { tb: ['wood', 'hole', 'hole'] }); M.sit(p, TD.J, { drop: 6 }); p.pelvis = -0.05; p.waist = -0.03; return FR.toScreen(FR.fk(TD, p).buttons[2], p, oT); };
  const NL = 12, NE = 4.5;   // 針：手の中心から針先・針の穴まで
  function cookie(t) {
    const J = GB.J, o = { x: GX, y: FLOOR, sc: SC }, b4 = since(3, t), w = since(4, t);
    const p = Object.assign({}, FR.REST, { t, btn: b4 >= 0.38 ? [1, 0, 1] : [1, 1, 1], blink: 0 }); M.stance(p, J, { dir: 1 });
    let needle = null;
    const tp = textProg(t), sew = [0, 1].some((k) => since(k, t) >= 0 && since(k, t) < TXT_D[k]), tr = since(2, t);
    if (b4 < 0) {   // 縫い進む針を見上げる（目 → 頭）。終わったら、いつものうれしい顔
      const nx = X0 + tw * tp; p.turn = sew ? clamp((nx - GX) / 120, -0.6, 0.6) : 0.15; p.lookY = sew ? -1 : tr >= 0 && tr < TREE_D ? -0.3 : 0; p.look = sew ? p.turn : tr >= 0 && tr < TREE_D ? -1 : 0.3; p.neck = sew ? -0.1 : 0;
      M.hand(p, J, 1, -40, 26, 'down'); M.hand(p, J, -1, 40, 26, 'down'); if (sew) { p.mouth = 0.25; }
    } else {
      const btn = btnAt(), k = ease(b4 / 0.35); p.yaw = 45 * k; p.lean = k > 0.5 ? 1 : 0; p.turn = 0.5 * k; p.look = k; p.lookY = 0.4;
      const P0 = FR.fk(GB, Object.assign({}, FR.REST, p)), mid = FR.toScreen({ x: (P0.torso[0].x + P0.torso[2].x) / 2, y: P0.torso[0].y + (P0.torso[2].y - P0.torso[0].y) * 0.55 }, p, o);
      const holeA = { x: btn.x - 1.6, y: btn.y }, holeB = { x: btn.x + 1.6, y: btn.y }, DO = { x: 0.26, y: -0.966 }, A1 = { x: holeA.x, y: holeA.y - NL }, A0 = { x: holeB.x + DO.x * (NE + 20), y: holeB.y + DO.y * (NE + 20) };
      let H;
      if (b4 < 0.4) { H = lp({ x: GX + 14, y: FLOOR - 42 }, { x: mid.x + 1, y: mid.y + 3 }, ease(b4 / 0.3)); p.btnHold = b4 >= 0.36 ? 'R' : 0; }   // 右手で自分の胸のまん中の金のボタンをつまんで、外す
      else if (b4 < 0.8) { H = lp({ x: mid.x + 1, y: mid.y + 3 }, { x: btn.x, y: btn.y + 3 }, easeInOut((b4 - 0.4) / 0.35)); p.btnHold = b4 < 0.78 ? 'R' : 0; }   // テディの取れていた穴に当てる
      else if (b4 < SEW0) { H = lp({ x: btn.x, y: btn.y + 3 }, A0, easeInOut((b4 - 0.8) / (SEW0 - 0.8))); if (b4 > 0.92) needle = { d: DO, mode: 'tail' }; }   // 飛んできた針を受け取る
      else if (b4 < SEW0 + SEWN * SEWD) { const s = sewAt(b4), u = s.u;
        if (u < 0.3) { H = lp(A0, A1, easeInOut(u / 0.3)); needle = { d: { x: 0, y: 1 }, mode: 'in', depth: 0 }; }   // 穴Aの真上へ、針先を下ろす
        else if (u < 0.5) { const q = easeInOut((u - 0.3) / 0.2); H = { x: A1.x, y: A1.y + 3 * q }; needle = { d: { x: 0, y: 1 }, mode: 'in', depth: 3 * q }; }   // 押しこむ（針先は布の中）
        else if (u < 0.58) { H = { x: holeB.x + DO.x * (NE + 6), y: holeB.y + DO.y * (NE + 6) }; needle = { d: DO, mode: 'out' }; }   // 穴Bから出た針をつまむ
        else { const q = easeInOut((u - 0.58) / 0.42), r = NE + 6 + 14 * q; H = { x: holeB.x + DO.x * r, y: holeB.y + DO.y * r }; needle = { d: DO, mode: 'out' }; } }   // 上へ引いて、糸を張る
      else { const q = easeInOut((b4 - SEW0 - SEWN * SEWD) / 0.5); H = lp(A0, { x: GX + 18, y: FLOOR - 40 }, q); if (q < 0.5) needle = { d: DO, mode: 'short' }; }   // 糸を切って、手を下ろす
      M.aim(GB, p, o, -1, H.x, H.y); M.hand(p, J, 1, -40, 26, 'down');
      if (w >= 0) { p.lookY = 0.4 - 0.9 * ease((w - 1.0) / 0.3); p.mouth = w > 1.3 && w < 2.2 ? 0.4 : 0; }   // テディが笑うと、見上げて
      needle && (needle.btn = btn);
    }
    const hop = Math.max(w >= 1.4 && w < 1.9 ? Math.sin(Math.PI * (w - 1.4) / 0.5) : 0, S.done && t - S.hop < 0.5 ? Math.sin(Math.PI * (t - S.hop) / 0.5) : 0); p.air = 14 * hop;
    return { p, o, needle };
  }
  // 針と糸。糸はいつも、ボタンの穴と針の穴をつなぐ（宙に浮かない）。写し：MV の drawNeedle を小さく
  function needleAt(g, hand, nd) {
    const d = nd.d, tip = { x: hand.x + d.x * NL, y: hand.y + d.y * NL }, eye = { x: hand.x - d.x * NE, y: hand.y - d.y * NE }, holeB = { x: nd.btn.x + 1.6, y: nd.btn.y }, vis = nd.depth ? { x: tip.x - d.x * nd.depth, y: tip.y - d.y * nd.depth } : tip;
    g.save(); g.lineCap = 'round'; g.strokeStyle = THREAD; g.lineWidth = 0.9; g.beginPath();
    if (nd.mode === 'tail') { g.moveTo(eye.x, eye.y); g.quadraticCurveTo(eye.x - 6, eye.y + 5, eye.x - 3, eye.y + 13); }
    else if (nd.mode === 'short') { g.moveTo(eye.x, eye.y); g.quadraticCurveTo(eye.x - 3, eye.y + 2, eye.x - 2, eye.y + 6); }
    else { g.moveTo(holeB.x, holeB.y); g.quadraticCurveTo((holeB.x + eye.x) / 2, Math.max(holeB.y, eye.y) + (nd.mode === 'in' ? 6 : 0.5), eye.x, eye.y); }
    g.stroke(); g.strokeStyle = 'rgba(50,54,62,.95)'; g.lineWidth = 1.9; g.beginPath(); g.moveTo(eye.x, eye.y); g.lineTo(vis.x, vis.y); g.stroke(); g.strokeStyle = '#eef2f8'; g.lineWidth = 1; g.stroke(); g.restore();
  }
  // 宙を飛んで縫う針（字・ツリーの飾り）：針先を下へ向けて、ちくちく上下しながら進む。糸は縫い終えた所から
  function flyNeedle(g, x0, y0, from, t, dip = null) {
    const bob = dip == null ? Math.abs(Math.sin(t * 9)) * 5 : 0, tip = { x: x0, y: y0 + 4 - bob }, eye = { x: x0 + 9, y: y0 - 20 - bob };
    if (dip != null && dip > 0.6) { g.save(); g.fillStyle = 'rgba(20,10,30,.55)'; g.beginPath(); g.arc(x0, y0 + 4, 1.4, 0, TAU); g.fill(); g.restore(); }   // 布に刺した所
    g.save(); g.lineCap = 'round'; g.strokeStyle = THREAD; g.lineWidth = 0.9; g.beginPath(); g.moveTo(from.x, from.y); g.quadraticCurveTo((from.x + eye.x) / 2, Math.max(from.y, eye.y) + 8, eye.x, eye.y); g.stroke();
    g.strokeStyle = 'rgba(30,30,40,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(eye.x, eye.y); g.lineTo(tip.x, tip.y); g.stroke(); g.strokeStyle = '#eef2f8'; g.lineWidth = 1.6; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(eye.x - 0.8, eye.y + 3); g.lineTo(tip.x + 2, tip.y - 5); g.stroke();   // 針の光
    g.strokeStyle = 'rgba(30,30,40,.85)'; g.lineWidth = 0.7; g.beginPath(); g.ellipse(eye.x - 0.8, eye.y + 2.6, 0.8, 2, 0.42, 0, TAU); g.stroke(); g.restore();
  }
  // ツリーの飾り（3回目：玉が順にぽんと縫いつく → モール → 星）
  const ornT = (i) => 0.2 + i * 0.2, SWAG_T = [0.6, 1.4], STAR_T = 2.35;
  function treeDeco(g, t) {
    const u = since(2, t); if (u < 0) return;
    SWAG.forEach(([a, b, c], i) => { const q = clamp((u - SWAG_T[i]) / 0.45, 0, 1); if (q <= 0) return; g.save(); g.setLineDash([2.2, 1.8]); g.lineWidth = 1.3; g.strokeStyle = GOLD; g.beginPath(); for (let k = 0; k <= 24 * q; k++) { const v = k / 24, x0 = (1 - v) * (1 - v) * a[0] + 2 * v * (1 - v) * b[0] + v * v * c[0], y0 = (1 - v) * (1 - v) * a[1] + 2 * v * (1 - v) * b[1] + v * v * c[1]; k ? g.lineTo(x0, y0) : g.moveTo(x0, y0); } g.stroke(); g.restore(); });
    ORN.forEach(([a, b, col], i) => { const q = u - ornT(i); if (q < 0) return; const s = spring(q / 0.35); g.save(); g.translate(a, b); g.scale(s, s); felt(g, el(0, 0, 4.4, 4.4), col, { sh: 1.5, inset: 1.2, tw: 0.6, dash: [1.2, 1.2] }); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(-1.4, -1.5, 1.1, 0, TAU); g.fill(); g.restore(); });
    const q = u - STAR_T; if (q >= 0) { const s = spring(q / 0.45); g.save(); g.translate(TRX, 72); g.scale(s, s); felt(g, (gg, i) => { gg.beginPath(); for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = (k % 2 ? 4.6 : 10) - i * 0.8; gg.lineTo(Math.cos(a) * r, Math.sin(a) * r); } gg.closePath(); }, GOLD, { sh: 2, inset: 1.6, tw: 0.7, dash: [1.4, 1.2] }); g.restore();
      if (q < 0.9) { g.save(); g.globalAlpha = 1 - q / 0.9; g.fillStyle = '#fff4c0'; for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, r = 10 + 18 * q; g.beginPath(); g.arc(TRX + Math.cos(a) * r, 72 + Math.sin(a) * r, 1.6, 0, TAU); g.fill(); } g.restore(); } }
  }
  const treeNeedle = (u) => { if (u < 0 || u > TREE_D) return null; if (u > STAR_T - 0.2) return { x: TRX + 2, y: 72, from: { x: TRX + 34, y: 170 } }; const i = clamp(Math.floor((u - 0.1) / 0.2), 0, ORN.length - 1), f = clamp((u - 0.1) / 0.2 - i, 0, 1), a = ORN[Math.max(0, i - 1)], b = ORN[i];
    return { x: a[0] + (b[0] - a[0]) * ease(f * 1.5), y: b[1] + (a[1] - b[1]) * (1 - ease(f * 1.5)) - 4, from: { x: a[0], y: a[1] } }; };
  // 窓の外を、フェルトのサンタのそりが横切る（5回目）
  function santa(g, t) {
    const u = since(4, t) - 0.2; if (u < 0 || u > 2.8) return; const q = u / 2.8, sx = WIN.x - 26 + (WIN.w + 52) * q, sy = WIN.y + 24 + 6 * Math.sin(q * 9);
    g.save(); g.beginPath(); g.rect(WIN.x, WIN.y, WIN.w, WIN.h); g.clip(); g.translate(sx, sy); g.rotate(-0.08);
    felt(g, el(9, 0, 6, 3), '#9a6a3a', { sh: 0, st: 0 }); felt(g, el(15, -3, 2.4, 2.2), '#9a6a3a', { sh: 0, st: 0 }); g.strokeStyle = '#5a3a20'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(15, -5); g.lineTo(16, -8); g.moveTo(14, -5); g.lineTo(12, -8); for (const a of [5, 7, 11, 13]) { g.moveTo(a, 2); g.lineTo(a + Math.sin(t * 20 + a) * 1.5, 5); } g.stroke(); g.fillStyle = '#e8283a'; g.beginPath(); g.arc(17.3, -2.6, 0.9, 0, TAU); g.fill();   // トナカイ
    g.strokeStyle = GOLD; g.lineWidth = 0.6; g.beginPath(); g.moveTo(3, -1); g.lineTo(-2, 0); g.stroke();
    felt(g, poly([[-14, -1], [-2, -1], [0, -6], [-14, -6]]), '#e8283a', { sh: 0, st: 0 }); g.strokeStyle = GOLD; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-15, 1); g.lineTo(-1, 1); g.quadraticCurveTo(1, 1, 1, -1); g.stroke();   // そり
    felt(g, el(-8, -8, 3.4, 3.2), '#e8283a', { sh: 0, st: 0 }); felt(g, el(-8, -12, 2.2, 2.1), '#f4c8a0', { sh: 0, st: 0 }); g.fillStyle = '#fff'; g.beginPath(); g.arc(-8, -10.6, 1.6, 0, Math.PI); g.fill(); g.fillStyle = '#e8283a'; g.beginPath(); g.moveTo(-10.4, -13); g.lineTo(-5.6, -13); g.lineTo(-11.5, -16.5); g.fill();   // サンタ
    g.restore();
  }
  // 人物は1秒15コマ（MV の紙の人形と同じコマ送り）で紙に描いて残し、間はその紙を貼る
  const [CC, cc] = (() => { const c = document.createElement('canvas'); c.width = c.height = 8; return [c, c.getContext('2d')]; })(); let ccKey = '';
  const charBusy = (t) => [0, 1, 2].some((k) => since(k, t) >= 0 && since(k, t) < (k === 2 ? TREE_D : TXT_D[k]) + 0.1) || (since(3, t) >= 0 && since(3, t) < BTN_D) || (since(4, t) >= 0 && since(4, t) < 2.2) || (S.done && t - S.hop < 0.9);
  let lastNeedle = null;
  function chars(x, t, dev) {
    if (!TD) return;
    const live = charBusy(t), f = live ? Math.floor(t * 15) : 'still', key = f + '|' + dev + '|' + S.step;
    if (ccKey !== key) { const w = Math.round(W * dev), h = Math.round(H * dev); if (CC.width !== w || CC.height !== h) { CC.width = w; CC.height = h; }
      const tf = live ? (f + 0.5) / 15 : t; cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, w, h); cc.setTransform(dev, 0, 0, dev, 0, 0);
      const tp = teddy(tf); FR.draw(cc, TD, tp, oT);
      const c = cookie(tf); FR.draw(cc, GB, c.p, c.o); lastNeedle = null;
      if (c.needle) { const hand = FR.toScreen(FR.fk(GB, Object.assign({}, FR.REST, c.p)).handR, c.p, c.o); lastNeedle = { hand, nd: c.needle }; }
      ccKey = key; }
    x.drawImage(CC, 0, 0, W, H);
    if (lastNeedle) needleAt(x, lastNeedle.hand, lastNeedle.nd);
  }

  const stitches = (sfx, dur, every) => { for (let k = 0; k * every < dur; k++) setTimeout(() => sfx.stitch && sfx.stitch(k % 2 ? 0.35 : 0.5), k * every * 1000); };
  return { S, ready, snow: { n: 12, kind: 'felt', size: 2.6, rect: [WIN.x, WIN.y, WIN.w, WIN.h] },
    draw(x, t) {
      const dev = Math.abs(x.getTransform().a) || 1; x.drawImage(bg, 0, 0, W, H);
      const ta = textAt(t), tp = ta.p, rx = X0 + tw * tp; if (tp > 0) { x.save(); x.beginPath(); x.rect(0, 0, tp >= 1 ? W : rx, H); x.clip(); x.drawImage(thread, 0, 0, W, H); x.restore(); }
      santa(x, t); treeDeco(x, t);
      if (ta.nd) flyNeedle(x, ta.nd.x, ta.nd.y, ta.nd.from, t, ta.nd.dip);
      const tn = treeNeedle(since(2, t)); if (tn) flyNeedle(x, tn.x, tn.y, tn.from, t);
      chars(x, t, dev);
      for (const h of S.hearts) { const v = (t - h.t) / 1.4; if (v < 0 || v > 1) continue; x.save(); x.globalAlpha = Math.min(1, (1 - v) * 2); x.translate(h.x + 6 * Math.sin(v * 7), 186 - 70 * v); felt(x, heart(0, 0, 0.7 + v * 0.3), '#e8283a', { sh: 2, inset: 1.6, tw: 0.6 }); x.restore(); }
    },
    busy: (t) => charBusy(t) || (since(2, t) >= 0 && since(2, t) < TREE_D + 0.3) || (since(4, t) >= 0 && since(4, t) < WAKE_D) || S.hearts.some((h) => t - h.t < 1.45),
    tap(t, sfx) {
      if (S.step < S.total) { const k = S.step++; S.t[k] = t;
        if (k < 2) stitches(sfx, TXT_D[k], STD); else if (k === 2) stitches(sfx, TREE_D - 0.5, 0.2);
        else if (k === 3) { setTimeout(() => sfx.pop && sfx.pop(), 380); for (let n = 0; n < SEWN; n++) for (const d of [0.3, 0.5]) setTimeout(() => sfx.stitch && sfx.stitch(0.6), (SEW0 + n * SEWD + d * SEWD) * 1000); }
        else { S.done = true; setTimeout(() => sfx.chime && sfx.chime(), 1300); }
      } else { S.hop = t; S.hearts.push({ x: (GX + TDX) / 2 + (Math.random() - 0.5) * 16, t }, { x: (GX + TDX) / 2 + (Math.random() - 0.5) * 30, t: t + 0.25 }); while (S.hearts.length > 8) S.hearts.shift(); if (sfx.stitch) sfx.stitch(0.5); setTimeout(() => sfx.pop && sfx.pop(), 120); }
    } };
}
