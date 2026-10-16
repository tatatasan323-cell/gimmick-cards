# vendor ── 同梱している外部ライブラリ

外部CDNから読まずに、ここに置いたものを配る（CDNが落ちても、ページが半分だけ壊れた状態にならない／配る中身を固定する）。

## three.js 0.160.0（MITライセンス・各ファイルの先頭に表示あり）

- 取得元: `https://cdn.jsdelivr.net/npm/three@0.160.0/`
- 使っているのは2ファイル：`build/three.module.js`、`examples/jsm/geometries/RoundedBoxGeometry.js`
- 使っているページ：`christmas-trial/index.html`、`christmas-town/`（港町と5つの仕掛け）

## Rapier 3D（compat）0.14.0（Apache-2.0ライセンス・`rapier3d-compat@0.14.0/LICENSE`）

- 物の落下・転がり・ぶつかり（物理）の計算。WebAssembly をファイルの中に含む版
- 中身: npm パッケージ `@dimforge/rapier3d-compat` 0.14.0（`package.json` も同梱）
- 使っているのは1ファイル：`rapier.es.js`
- 使っているページ：`christmas-town/museum.html`・`ice.html`・`blocks.html`
