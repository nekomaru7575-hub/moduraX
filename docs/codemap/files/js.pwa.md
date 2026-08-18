---
source: js/pwa.js
lines: 159
exports: 2
imported_by: 3
api_sha: fa7c8e7768d3
prose_sha: fa7c8e7768d3
generated: 2026-08-18
tags: [codemap]
---

# js/pwa.js

<!-- prose:summary -->
「ホーム画面／デスクトップへのアプリとして追加」まわり。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
PWA（ホーム画面・デスクトップへインストールして全画面で使う形）のうち、**ブラウザ側から
呼ぶ2つの入口**だけを持つ。`registerServiceWorker()` は `/sw.js` を登録する（`load` を待って
から。安全でない文脈では何もしない）。`mountInstallPrompt(container)` は `beforeinstallprompt`
を捕まえて「アプリとして追加」ボタンを出し、iOS（このイベントを実装していない）には
「共有 →ホーム画面に追加」の案内を代わりに出す。

キャッシュの方針そのものは持たない。何をキャッシュし何を素通しするかは `sw.js` 側にあり、
このファイルは登録するだけ。マニフェストの内容（名前・アイコン・start_url）は
`manifest.webmanifest`、`<head>` のメタタグは3つのHTMLに直接書かれている。

登録は3つのエントリポイント（[[js.room-index]]・[[js.main]]・[[js.character-builder]]）
すべてから呼ぶが、インストールの導線を出すのは部屋一覧だけ。
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 51 | fn | registerServiceWorker | `registerServiceWorker()` | --- Service Workerの登録 --- 失敗しても画面は普通に動く（sw.jsはコードをキャッシュしないので、居ても居なくても 表示は同じ）。 |
| 133 | fn | mountInstallPrompt | `mountInstallPrompt(container)` | 部屋一覧（index.html）から呼ぶ。 |

## トップレベル関数（LOCAL TASKS 候補）（8）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 17 | isInstalled | `isInstalled()` | 5 |  |
| 25 | isIos | `isIos()` | 5 |  |
| 31 | hintDismissed | `hintDismissed()` | 8 |  |
| 40 | dismissHint | `dismissHint()` | 7 |  |
| 51 | registerServiceWorker | `registerServiceWorker()` | 14 | ✓ |
| 81 | createInstallButton | `createInstallButton(container)` | 23 |  |
| 105 | createIosHint | `createIosHint(container)` | 26 |  |
| 133 | mountInstallPrompt | `mountInstallPrompt(container)` | 26 | ✓ |

## 依存

- import → なし
- imported by → [[js.character-builder]], [[js.main]], [[js.room-index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
