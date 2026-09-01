---
source: js/net-host.js
lines: 528
exports: 1
imported_by: 1
api_sha: e37cb80cb420
prose_sha: e37cb80cb420
generated: 2026-09-01
tags: [codemap]
---

# js/net-host.js

<!-- prose:summary -->
ホスト権威P2Pの「ホスト役」。GMのタブが wss.on('connection') の仕事を引き受ける。永続化と開発用の合言葉だけは持てない。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（1）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 71 | fn | startHost | `startHost({ signaling, applyRemote, onLocal, self })` | ホスト役を始める。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 71 | startHost | `startHost({ signaling, applyRemote, onLocal, self })` | **457** | ✓ |

## 依存

- import → [[js.asset-sync]], [[js.game-store]], [[js.local-identity]], [[js.net-chunk]], [[js.net-host-rules]], [[js.net-signaling]], [[js.net-transport]], [[js.room-authority-rules]], [[js.sound-config]], [[js.stamp-catalog]], [[js.stamp-registry]], [[js.state-import]], [[js.store.room]]
- imported by → [[js.net-sync]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
