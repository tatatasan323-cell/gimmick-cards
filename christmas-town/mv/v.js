// 写し：動画制作ラボ/lib/common.js の小道具（window.V）のうち、MV の人物の部品（gingerrig・felt_rig・kage_*・moves）が使う物だけ
// 画面の大きさの決め事・字の札・キャンバスの用意は持ってこない（カードの絵は、共通/greet_kit.js が描く場所を用意する）
// data.cello＝ゴスペルの人形をセロハンで描く（kage_cello.js が KD.draw を差しかえる）。data.bpm＝振り付けの拍（読む前に、絵ごとに入れる）
(() => {
  if (window.V) return;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = {
    out: (x) => 1 - Math.pow(1 - clamp(x), 3),
    in: (x) => Math.pow(clamp(x), 3),
    inOut: (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; },
    back: (x) => { x = clamp(x); const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); },
  };
  const hash = (i, seed = 0) => {
    let h = (Math.imul(i | 0, 0x9E3779B1) ^ Math.imul((seed | 0) + 0x632BE5AB, 0x85EBCA77)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7FEB352D);
    h = Math.imul(h ^ (h >>> 15), 0x846CA68B);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = Math.imul(s ^ (s >>> 15), s | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
  const smooth = (u) => u * u * (3 - 2 * u);
  const noise = (x, seed = 0) => { const i = Math.floor(x), f = smooth(x - i); return lerp(hash(i, seed), hash(i + 1, seed), f) * 2 - 1; };
  const noise2 = (x, y, seed = 0) => { const i = Math.floor(x), j = Math.floor(y), fx = smooth(x - i), fy = smooth(y - j), h = (a, b) => hash(a + Math.imul(b, 7919), seed);
    return lerp(lerp(h(i, j), h(i + 1, j), fx), lerp(h(i, j + 1), h(i + 1, j + 1), fx), fy) * 2 - 1; };
  const S = { width: 1280, height: 720, fps: 30, start: 0, duration: 5, data: { cello: true } };
  window.V = { S, W: S.width, H: S.height, clamp, lerp, seg, ease, hash, rng, noise, noise2 };
})();
