---
source: js/theme.js
lines: 49
exports: 3
imported_by: 1
api_sha: a359c667306c
prose_sha: a359c667306c
generated: 2026-09-16
tags: [codemap]
---

# js/theme.js

<!-- prose:summary -->
部屋の画面の表示（暗い／明るい）の切り替え。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
_(未記入)_
<!-- /prose:role -->

## export（3）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | fn | getTheme | `getTheme()` |  |
| 30 | fn | setTheme | `setTheme(theme)` |  |
| 43 | fn | initTheme | `initTheme()` | theme-boot.js が付けた属性に meta theme-color を合わせ（meta は boot の時点ではまだ 読まれていない）、以後は他のタブでの切り替えに追従する。 |

## トップレベル関数（LOCAL TASKS 候補）（4）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | getTheme | `getTheme()` | 3 | ✓ |
| 20 | applyTheme | `applyTheme(theme)` | 9 |  |
| 30 | setTheme | `setTheme(theme)` | 10 | ✓ |
| 43 | initTheme | `initTheme()` | 6 | ✓ |

## 依存

- import → なし
- imported by → [[js.main]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
