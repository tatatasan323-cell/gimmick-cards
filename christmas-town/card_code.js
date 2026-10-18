// クリスマスカード（招待状・グリーティングカード）の中身：入力の検査と、リンクの中への詰め方（#c=x1.〜）。カードのページと港町（届いた招待状のお知らせ）で同じものを使う
// 画面には textContent でしか出さない。長さの上限・見えない文字の除去・日付と時刻の形の検査は、ここ1か所で
export const NS = 'x1.';
export const MAX = { t: 28, to: 24, vn: 40, va: 60, c: 60, m: 200, f: 24, dc: 40 };
// k＝カードの種類：'g'＝グリーティングカード（あて名・ひとこと・差出人だけ）。ないもの＝招待状（前に送ったリンクも、そのまま招待状として開く）
export const KEYS = ['k', 't', 'to', 'd', 's', 'e', 'vn', 'va', 'c', 'm', 'f', 'dc', 'rp'];
// グリーティングカードで使う項目（ほかの項目は、入っていても捨てる）
export const GREET_KEYS = ['k', 't', 'to', 'm', 'f'];
const str = (v, n, keepNl) => {
  if (typeof v !== 'string') return '';
  let s = v.replace(keepNl ? /[\u0000-\u0009\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g : /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '');
  s = s.replace(/\r\n?/g, '\n').trim();
  return Array.from(s).slice(0, n).join('');
};
export function validDate(s) { const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; }
export function clean(o) {
  const r = {};
  if (!o || typeof o !== 'object') return r;
  for (const k of KEYS) {
    let v = o[k];
    if (k === 'rp') v = v === '1' ? '1' : '';
    else if (k === 'k') v = v === 'g' ? 'g' : '';
    else if (k === 'd') v = (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && validDate(v)) ? v : '';
    else if (k === 's' || k === 'e') v = (typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)) ? v : '';
    else v = str(v, MAX[k], k === 'm');
    if (v) r[k] = v;
  }
  if (r.k === 'g') for (const k of Object.keys(r)) if (!GREET_KEYS.includes(k)) delete r[k];
  return r;
}
const b64u = {
  enc(s) { const b = new TextEncoder().encode(s); let x = ''; b.forEach((c) => { x += String.fromCharCode(c); }); return btoa(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const x = atob(s), b = new Uint8Array(x.length); for (let i = 0; i < x.length; i++) b[i] = x.charCodeAt(i); return new TextDecoder('utf-8', { fatal: true }).decode(b); },
};
export const Card = {
  encode(o) { return NS + b64u.enc(JSON.stringify(clean(o))); },
  decode(s) { try { if (typeof s !== 'string' || s.indexOf(NS) !== 0 || s.length > 6000) return null; const o = clean(JSON.parse(b64u.dec(s.slice(NS.length)))); return Object.keys(o).length ? o : null; } catch (e) { return null; } },
  fromHash(h) { const m = /^#c=([A-Za-z0-9._-]+)$/.exec(h || ''); return m ? Card.decode(m[1]) : null; },
};
