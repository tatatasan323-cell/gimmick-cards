// グリーティングカードの3つの絵（本人 2026-10-31「クリックで動く素朴なカードを3種類。3つのMVに合わせて、ネオン、ソーイング、セロハン絵で」）
// 触るたびに物語が進み、最後に小さなお楽しみ。送り手のひとことは、絵の下の字（カードのページ）で最初から読める
// 絵ごとの中身は greet_neon.js・greet_sew.js・greet_cello.js。MV の人物の部品の写し（共通/mv/）は、その絵の時だけ読む（共通/greet_kit.js の loadMV）
// 描くのは、触った後の動き・またたきの間だけ（止まっている間は描かない。スマホは1秒30コマまで）。字は端末の字で描く（絵に焼かない）
import { W, H } from './greet_kit.js';
import { build as neon } from './greet_neon.js';
import { build as sew } from './greet_sew.js';
import { build as cello } from './greet_cello.js';
export const DESIGNS = {
  neon: { name: 'ネオン', song: 'hiphop', note: '夜の壁に、ネオンがジジッと灯る', hint: 'さわると、ネオンがジジッと灯るよ' },
  sew: { name: 'ソーイング', song: 'folk', note: 'フェルトに、さらさら刺しゅう', hint: 'さわると、さらさら刺しゅうが進むよ' },
  cello: { name: 'セロハン', song: 'gospel', note: '影絵の人形劇', hint: 'さわると、人形劇が進むよ' },
};
export const pickDesign = (dz) => (DESIGNS[dz] ? dz : Object.keys(DESIGNS)[Math.floor(Math.random() * 3)]);   // 指定が無い・「開くたびにランダム」
const BUILD = { neon, sew, cello };
// 降る雪は CSS の transform だけで動かす（絵を描き直さない＝止まっている間も軽い）。D.snow＝{ n（粒の数）, kind（'' 白い粒・felt フェルト・cello 色の膜の星）, rect（降る範囲 [x, y, w, h]・絵の座標）}
const SNOW_CSS = '.gsnow{position:absolute;overflow:hidden;pointer-events:none}.gsnow i{position:absolute;top:0;height:100%;width:0;animation:gsF var(--d) linear var(--l) infinite}'
  + '.gsnow i::before{content:"";position:absolute;left:0;top:calc(var(--s)*-1);width:var(--s);height:var(--s);border-radius:50%;background:#fff;opacity:var(--o);animation:gsS calc(var(--d)/3) ease-in-out var(--l) infinite alternate}'
  + '.gsnow.felt i::before{background:#fffaf0;box-shadow:0 1px 1.5px rgba(70,40,20,.35)}.gsnow.cello i::before{border-radius:0;background:rgba(100,160,255,.7);clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%)}'
  + '@keyframes gsF{from{transform:translateY(-4%)}to{transform:translateY(104%)}}@keyframes gsS{from{transform:translateX(-6px)}to{transform:translateX(6px)}}@media (prefers-reduced-motion:reduce){.gsnow{display:none}}';
function snowLayer(o) {
  if (!document.getElementById('gsnowCss')) { const s = document.createElement('style'); s.id = 'gsnowCss'; s.textContent = SNOW_CSS; document.head.appendChild(s); }
  const [rx, ry, rw, rh] = o.rect || [0, 0, W, H], el = document.createElement('div'); el.className = 'gsnow ' + (o.kind || ''); if (!o.rect) el.style.borderRadius = '14px';
  Object.assign(el.style, { left: (rx / W) * 100 + '%', top: (ry / H) * 100 + '%', width: (rw / W) * 100 + '%', height: (rh / H) * 100 + '%' });
  for (let i = 0; i < o.n; i++) { const f = document.createElement('i'), d = 7 + ((i * 37) % 11) * 0.6, s = (o.size || 3) + ((i * 53) % 5) * 0.6;
    f.style.cssText = `left:${(((i * 61) % 97) + 1.5).toFixed(1)}%;--d:${d.toFixed(1)}s;--l:${(-((i * 29) % 100) / 100 * d).toFixed(2)}s;--s:${s.toFixed(1)}px;--o:${(0.55 + ((i * 17) % 9) * 0.05).toFixed(2)}`; el.appendChild(f); }
  return el;
}
// host の中に絵を置く。sfx＝音（絵ごとに使う物：buzz・jingle・stitch・chime・choir・bell など）。返す物＝state()（確かめる道具が読む）・tap()・destroy()
export function mountGreet(host, id, sfx = {}) {
  host.textContent = ''; const D = BUILD[id](), cv = document.createElement('canvas'), x = cv.getContext('2d'), hint = document.createElement('p');
  cv.className = 'gcv'; cv.tabIndex = 0; cv.setAttribute('role', 'button'); cv.setAttribute('aria-label', DESIGNS[id].name + 'のカード：' + DESIGNS[id].hint);
  hint.className = 'ghint'; hint.textContent = DESIGNS[id].hint; host.append(cv); if (D.snow) host.appendChild(snowLayer(D.snow)); host.appendChild(hint);
  let raf = 0, last = 0, dpr = 1, k = 1, alive = true, ready = !D.ready; const slow = matchMedia('(pointer: coarse)').matches;
  const paint = (now) => { x.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); D.draw(x, now / 1000); };
  const loop = (now) => { if (!alive) return; if (slow && now - last < 31) { raf = requestAnimationFrame(loop); return; } last = now; paint(now); raf = D.busy(now / 1000) ? requestAnimationFrame(loop) : 0; };
  const kick = () => { if (!raf && alive) raf = requestAnimationFrame(loop); };
  const fit = () => { const w = host.clientWidth || W; dpr = Math.min(2, devicePixelRatio || 1); k = w / W; cv.width = Math.round(w * dpr); cv.height = Math.round((w * H / W) * dpr); cv.style.height = Math.round((w * H) / W) + 'px'; paint(performance.now()); };
  const tap = () => { if (!ready) return; D.tap(performance.now() / 1000, sfx); hint.classList.add('bye'); kick(); };   // MV の人物を読み終えるまでは進めない
  cv.addEventListener('click', tap); cv.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
  const ro = new ResizeObserver(fit); ro.observe(host); fit();
  if (D.ready) D.ready.then(() => { ready = true; if (alive) kick(); }, () => { ready = true; });   // 読めない時も、人物なしで進められるように
  const amb = D.ambient ? setInterval(() => { if (alive && ready && !document.hidden && D.ambient(performance.now() / 1000, sfx)) kick(); }, 500) : 0;   // 止まっている間の、ときどきの動き（ネオンのまたたき・雪 など）
  return { id, tap, state: () => ({ id, ready, step: D.S.step, total: D.S.total, done: D.S.done }), destroy() { alive = false; cancelAnimationFrame(raf); clearInterval(amb); ro.disconnect(); host.textContent = ''; } };
}
