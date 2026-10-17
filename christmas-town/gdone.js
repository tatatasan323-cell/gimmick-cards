// 仕掛けのページの中でやったことを、港町に知らせる（GitHub の公開版は同じ場所なので、港町のヒントが「もうやった事」を案内しないように。claude.ai の試作では届かない）
export function gdone(k) { try { const a = JSON.parse(localStorage.getItem('xmas-town-done') || '[]'); if (!a.includes(k)) { a.push(k); localStorage.setItem('xmas-town-done', JSON.stringify(a)); } } catch (e) { /* 記録が使えない画面 */ } }
// こわした・食べた数の記録（メニューの「きろく」に出す）。どのページからも同じ場所に足していく
const SK = 'xmas-town-stats';
export function gstat(k, n = 1) { try { const o = JSON.parse(localStorage.getItem(SK) || '{}'); o[k] = (o[k] || 0) + n; localStorage.setItem(SK, JSON.stringify(o)); } catch (e) { /* 記録が使えない画面 */ } }
export function gstats() { try { return JSON.parse(localStorage.getItem(SK) || '{}'); } catch (e) { return {}; } }
// 回数の入れ物を包んで、map にある項目が増えた分だけ記録にも足す（counts.x++ の書き方のままで残る）
export function gcount(obj, map) { return new Proxy(obj, { set(o, k, v) { const d = typeof v === 'number' && typeof o[k] === 'number' ? v - o[k] : 0; o[k] = v; if (d > 0 && map[k]) gstat(map[k], d); return true; } }); }
