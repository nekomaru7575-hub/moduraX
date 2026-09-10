---
source: js/character-dialog.js
lines: 1117
exports: 5
imported_by: 2
api_sha: fcf637786da8
prose_sha: fcf637786da8
generated: 2026-09-10
tags: [codemap]
---

# js/character-dialog.js

<!-- prose:summary -->
キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを まとめて入力するためのモーダルダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマの新規登録・編集モーダル。名前・画像・トリミング・デフォルトパラメータ・カスタムパラメータ・公開範囲をまとめて扱う。画像は自前のピッカー（トリミング付き）で、[[js.image-field]] の共通部品は使わない——crop は「選ぶ」ではなく「切る」で、applyImageCropStyle を盤面（[[js.board-data-driven]]）と共有して見たままを担保しているため。ただし「画像を選ぶ1手」だけは共通で、部屋の中では [[js.image-selector-dialog]] を開き、部屋の外（[[js.character-builder]]）では従来どおりファイル選択を開く（置き場が決まらず、選び直す相手＝部屋の状態も無いため）。システム固有のパラメータ欄は [[js.parameters.registry]] が返すプラグイン記述子から組み立てるので、DX3 やシノビガミ固有の知識はここには無い。プラグイン専用スペース（buildPluginPanel）へは、store を直接読めないプラグインの代わりに Core が集めた値一式（`getToken` / `dispatch` / `participants` / 他のコマを名前で引く `findTokenByName`）を素通しする。

編集ダイアログは部屋の中と部屋の外の両方が同じ関数を使う。違いは引数だけで、`allowParameterEdit`（能力値そのものを編集できるのは部屋の外だけ）と `dialogTitle` / `confirmLabel`（押した結果が「棚へ保存」なので文言を変える）で吸収する。結果を store へ書き戻すのは applyCharacterEditResult。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 19 | fn | defaultImageCrop | `defaultImageCrop()` | コマ画像トリミングの既定値：ズームなし・中央。 |
| 26 | fn | applyImageCropStyle | `applyImageCropStyle(imgEl, crop)` | トリミング設定(crop)を<img>のCSSへ反映する。 |
| 49 | fn | applyCharacterEditResult | `applyCharacterEditResult(store, tokenId, result)` | showCharacterEditDialogのonConfirmが返す結果を、Store（部屋のstore、または js/character-builder.jsが使う部屋に紐づかない使い捨てのImmutableS… |
| 461 | fn | showCharacterDialog | `showCharacterDialog({ activePluginId = null, participants = {}, usedImages = new Set(), onConfirm })` | activePluginId?: string \| null, onConfirm: (result: { name: string, image: string \| null, imageCrop: {zoom:n… |
| 737 | fn | showCharacterEditDialog | `showCharacterEditDialog({ character, activePluginId = null, participants = {}, onComponentChange, getComponents, onConfirm, dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, canEdit = true, readOnlyReason = null, allowParameterEdit = false, usedImages = new Set(), // 見出しと確定ボタンの文言。部屋の中では省く＝従来どおり「キャラクターを更新」「更新」。 // 差し替えるのは部屋の外のコマ作成ツールだけ：あちらは押した結果が「棚へ保存」なので、 // 「更新」と書いてあると何が起きるのか読み取れない（以前は押すとファイルが降ってきた）。 dialogTitle = null, confirmLabel = null })` | 既存キャラクターの名前・パラメータ値を更新するためのダイアログ。 |

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 19 | defaultImageCrop | `defaultImageCrop()` | 3 | ✓ |
| 26 | applyImageCropStyle | `applyImageCropStyle(imgEl, crop)` | 9 | ✓ |
| 49 | applyCharacterEditResult | `applyCharacterEditResult(store, tokenId, result)` | 67 | ✓ |
| 120 | buildPluginPanel | `buildPluginPanel({ activePluginId, mode, canEdit = true, parameters, components, onComponentChange, getComponents, dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, allowParameterEdit = false, participants = {}, myParticipantId = null })` | 38 |  |
| 164 | buildImagePicker | `buildImagePicker(initialImage, initialCrop, { readOnly = false, usedImages = new Set() } = {})` | 147 |  |
| 313 | buildSizeInput | `buildSizeInput(initialSize)` | 17 |  |
| 332 | buildTextColorInput | `buildTextColorInput(initialColor)` | 15 |  |
| 350 | buildVisibleCheckbox | `buildVisibleCheckbox(initialVisible)` | 20 |  |
| 374 | buildParameterVisibilityToggle | `buildParameterVisibilityToggle(initialChecked = true)` | 13 |  |
| 391 | buildAudienceButton | `buildAudienceButton({ getLabel, getAudience, setAudience, participants, myParticipantId })` | 30 |  |
| 425 | canToggleParameterVisibility | `canToggleParameterVisibility(param)` | 3 |  |
| 433 | appendEmptyParamCell | `appendEmptyParamCell(row)` | 6 |  |
| 443 | parseCustomParameterValue | `parseCustomParameterValue(raw)` | 6 |  |
| 461 | showCharacterDialog | `showCharacterDialog({ activePluginId = null, participants = {}, usedImages = new Set(), onConfirm })` | **230** | ✓ |
| 694 | ensureEditDialog | `ensureEditDialog()` | 7 |  |
| 737 | showCharacterEditDialog | `showCharacterEditDialog({ character, activePluginId = null, participants = {}, onComponentChange, getComponents, onConfirm, dispatch, getToken, findTokenByName, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, canEdit = true, readOnlyReason = null, allowParameterEdit = false, usedImages = new Set(), // 見出しと確定ボタンの文言。部屋の中では省く＝従来どおり「キャラクターを更新」「更新」。 // 差し替えるのは部屋の外のコマ作成ツールだけ：あちらは押した結果が「棚へ保存」なので、 // 「更新」と書いてあると何が起きるのか読み取れない（以前は押すとファイルが降ってきた）。 dialogTitle = null, confirmLabel = null })` | **381** | ✓ |

## 依存

- import → [[js.audience-picker]], [[js.buff-dialog]], [[js.dialog-host]], [[js.icons]], [[js.image-selector-dialog]], [[js.image-upload]], [[js.local-identity]], [[js.parameters.core]], [[js.parameters.registry]], [[js.read-only-form]], [[js.visibility]]
- imported by → [[js.board-data-driven]], [[js.character-builder]]

## 注意

<!-- prose:notes -->
プラグインへ渡す値は**このファイルが増やす場所**ではなく、素通しするだけ。実体は呼び出し元（[[js.board-data-driven]] は部屋の store、[[js.character-builder]] は下書き用の store）が用意する。部屋の外＝コマ作成ツールからは `rollBCDice` や `findTokenByName` が渡ってこないので、使う側のプラグインが「部屋の中で実行してください」と断ること。
<!-- /prose:notes -->
