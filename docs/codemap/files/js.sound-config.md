---
source: js/sound-config.js
lines: 44
exports: 3
imported_by: 2
api_sha: ca6e5a6cb59c
prose_sha: ca6e5a6cb59c
generated: 2026-09-10
tags: [codemap]
---

# js/sound-config.js

<!-- prose:summary -->
入室音・チャット送信音のURLを1か所で持つ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 25 | fn | setSoundConfig | `setSoundConfig(config)` | サーバーから受け取った設定を入れる。 |
| 36 | fn | getEntrySoundUrl | `getEntrySoundUrl()` | 入室音のURL（未設定ならnull）。 |
| 41 | fn | getChatSendSoundUrl | `getChatSendSoundUrl()` | チャット送信音のURL（未設定ならnull）。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 25 | setSoundConfig | `setSoundConfig(config)` | 4 | ✓ |
| 30 | normalize | `normalize(value)` | 4 |  |
| 36 | getEntrySoundUrl | `getEntrySoundUrl()` | 3 | ✓ |
| 41 | getChatSendSoundUrl | `getChatSendSoundUrl()` | 3 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]], [[js.net-host]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
