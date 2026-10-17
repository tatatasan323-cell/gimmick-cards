// 仕掛けのページの中でやったことを、港町に知らせる（GitHub の公開版は同じ場所なので、港町のヒントが「もうやった事」を案内しないように。claude.ai の試作では届かない）
export function gdone(k) { try { const a = JSON.parse(localStorage.getItem('xmas-town-done') || '[]'); if (!a.includes(k)) { a.push(k); localStorage.setItem('xmas-town-done', JSON.stringify(a)); } } catch (e) { /* 記録が使えない画面 */ } }
