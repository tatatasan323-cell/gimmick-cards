// 題字「とろけて聖夜」の、ぷるぷるのグミ文字（平らな絵）。カードの画面と、港町のはじめの画面で同じものを使う
// 骨組み（title_glyphs.js）を、影・濃いふち・本体・つやの4層の太い線でなぞる。字ごとにキャンディの色。さわった字は、ぽよんと弾む（音は呼ぶ側で）
import { GLYPHS } from './title_glyphs.js';
const NS = 'http://www.w3.org/2000/svg', COLS = [['#ff6fa8', '#c2185b', '#ffd0e2'], ['#3fd890', '#14834e', '#c8ffe0'], ['#ffc83a', '#c2780a', '#fff2b8'], ['#a07aff', '#5a32c0', '#e2d6ff'], ['#ff5468', '#b0102a', '#ffd0d6'], ['#4ac2ff', '#1468b0', '#d0f0ff']];
const CSS = `.gummy .gl{transform-box:fill-box;transform-origin:50% 100%;animation:gj 3.6s ease-in-out infinite;cursor:pointer}
.gummy .gl.boing{animation:gb .7s ease-out}
@keyframes gj{0%,70%,100%{transform:scale(1,1)}76%{transform:scale(1.12,.86)}82%{transform:scale(.92,1.1)}88%{transform:scale(1.05,.95)}94%{transform:scale(.98,1.02)}}
@keyframes gb{0%{transform:scale(1.3,.68)}30%{transform:scale(.8,1.28) translateY(-6%)}55%{transform:scale(1.12,.9)}78%{transform:scale(.96,1.05)}100%{transform:scale(1,1)}}`;
let styled = false;
// pre＝グラデーションの名前の頭（同じページに2つ置いても、名前がぶつからないように）
export function titleSvg(onTap, pre = 'gg') {
  if (!styled) { styled = true; const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); }
  const STEP = 0.93, svg = document.createElementNS(NS, 'svg'), defs = document.createElementNS(NS, 'defs'); svg.setAttribute('viewBox', '-0.08 -0.04 ' + (GLYPHS.length * STEP + 0.16) + ' 1.12'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'gummy'); svg.appendChild(defs);
  const el = (tag, at) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); return e; };
  const pathOf = (st) => 'M' + st.map(([x, y]) => x.toFixed(3) + ' ' + y.toFixed(3)).join('L');
  GLYPHS.forEach((strokes, k) => { const [c, dark, light] = COLS[k % COLS.length], gid = pre + k, x0 = k * STEP - 0.04;
    const gr = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }); gr.appendChild(el('stop', { offset: 0, 'stop-color': light })); gr.appendChild(el('stop', { offset: 0.45, 'stop-color': c })); gr.appendChild(el('stop', { offset: 1, 'stop-color': dark })); defs.appendChild(gr);
    const g = el('g', { class: 'gl' }); g.style.animationDelay = (k * 0.16) + 's'; const inner = el('g', { transform: 'translate(' + x0 + ' 0)' }); g.appendChild(inner);
    const layer = (stroke, w, dx, dy, op) => { const L = el('g', { fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: op, transform: 'translate(' + dx + ' ' + dy + ')' }); for (const st of strokes) L.appendChild(el('path', { d: pathOf(st) })); inner.appendChild(L); };
    layer('#3a0a28', 0.2, 0.012, 0.034, 0.45); layer(dark, 0.185, 0, 0, 1); layer('url(#' + gid + ')', 0.14, 0, 0, 1); layer('#ffffff', 0.036, -0.014, -0.024, 0.7);
    g.addEventListener('click', () => { if (onTap) onTap(k); g.classList.remove('boing'); void g.getBoundingClientRect(); g.classList.add('boing'); });
    svg.appendChild(g); });
  return svg;
}
