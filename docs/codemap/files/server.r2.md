---
source: server/r2.js
lines: 176
exports: 10
imported_by: 1
api_sha: d8159d12e751
prose_sha: d8159d12e751
generated: 2026-08-08
tags: [codemap]
---

# server/r2.js

<!-- prose:summary -->
音源・画像などファイルの実体を置くCloudflare R2への読み書きだけを担う薄いモジュール。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
Cloudflare R2 への読み書きだけを担う薄いモジュール。署名は `aws4fetch` を使い、公開 URL と内部キーの相互変換もここが持つ。R2 が未設定なら `isR2Configured` が false を返し、呼び出し側がアップロード機能を無効化する。
<!-- /prose:role -->

## export（10）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 28 | fn | isR2Configured | `isR2Configured()` | 環境変数が未設定でもサーバー自体は起動する（アップロードだけが使えない状態になる）。 |
| 52 | fn | publicBaseUrl | `publicBaseUrl()` | 公開URLの土台（末尾のスラッシュは落とす）。 |
| 57 | fn | publicUrlFor | `publicUrlFor(key)` | 再生時にブラウザが直接叩く公開URL。 |
| 63 | fn | keyFromPublicUrl | `keyFromPublicUrl(url)` | 公開URLから、このバケット内のキーを取り出す。 |
| 70 | fn | putObject | `async putObject(key, body, contentType)` |  |
| 85 | fn | getObject | `async getObject(key)` | 既にバケットにあるオブジェクトの中身を読む（取り込んだデータの画像を、その部屋の フォルダへ複製するときに使う）。 |
| 98 | fn | deleteObject | `async deleteObject(key)` |  |
| 126 | const | __test__ | `__test__` | テスト用にparseListResponseだけ切り出して公開する（R2に繋がずXMLの読み取りを確かめられる）。 |
| 132 | fn | listObjectKeys | `async listObjectKeys(prefix)` | 指定した接頭辞のオブジェクトキーを全件返す。 |
| 165 | fn | deleteObjectsByPrefix | `async deleteObjectsByPrefix(prefix)` | 指定した接頭辞のオブジェクトをまとめて消す（部屋を削除するときの後片付け）。 |

## トップレベル関数（LOCAL TASKS 候補）（13）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 28 | isR2Configured | `isR2Configured()` | 3 | ✓ |
| 34 | getClient | `getClient()` | 11 |  |
| 46 | objectUrl | `objectUrl(key)` | 3 |  |
| 52 | publicBaseUrl | `publicBaseUrl()` | 3 | ✓ |
| 57 | publicUrlFor | `publicUrlFor(key)` | 3 | ✓ |
| 63 | keyFromPublicUrl | `keyFromPublicUrl(url)` | 6 | ✓ |
| 70 | putObject | `async putObject(key, body, contentType)` | 11 | ✓ |
| 85 | getObject | `async getObject(key)` | 12 | ✓ |
| 98 | deleteObject | `async deleteObject(key)` | 8 | ✓ |
| 111 | unescapeXml | `unescapeXml(text)` | 6 |  |
| 118 | parseListResponse | `parseListResponse(xml)` | 6 |  |
| 132 | listObjectKeys | `async listObjectKeys(prefix)` | 22 | ✓ |
| 165 | deleteObjectsByPrefix | `async deleteObjectsByPrefix(prefix)` | 11 | ✓ |

## 依存

- import → なし
- imported by → [[server.index]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
