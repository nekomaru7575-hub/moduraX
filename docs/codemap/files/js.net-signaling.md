---
source: js/net-signaling.js
lines: 188
exports: 2
imported_by: 3
api_sha: 02b82c9b7e5c
prose_sha: 02b82c9b7e5c
generated: 2026-09-01
tags: [codemap]
---

# js/net-signaling.js

<!-- prose:summary -->
P2P卓でサーバーとの間に1本だけ張る細い口。SDPとICE候補のほか、サーバーにしか決められない3つ（入室パスワードの照合・ホスト役の資格・部屋の削除）を運ぶ。役割はサーバーが決める。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（2）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 32 | const | ICE_SERVERS | `ICE_SERVERS` | 公開STUN。 |
| 56 | fn | openSignaling | `openSignaling({ identity, onEntryPasswordRequired, onSignal, onSeed, onHostReady, onClose })` | シグナリングの口を開き、サーバーに役割を決めてもらうまでを済ませる。 |

## トップレベル関数（LOCAL TASKS 候補）（1）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 56 | openSignaling | `openSignaling({ identity, onEntryPasswordRequired, onSignal, onSeed, onHostReady, onClose })` | 132 | ✓ |

## 依存

- import → [[js.net-transport-ws]], [[js.untrusted-json]]
- imported by → [[js.net-host]], [[js.net-sync]], [[js.net-transport-rtc]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
