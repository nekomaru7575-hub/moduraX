---
source: js/character-dialog.js
lines: 1096
exports: 5
imported_by: 2
api_sha: ba369104a126
prose_sha: ba369104a126
generated: 2026-08-12
tags: [codemap]
---

# js/character-dialog.js

<!-- prose:summary -->
キャラクター登録時に、名前・デフォルトパラメータ・カスタムパラメータを まとめて入力するためのモーダルダイアログ。
<!-- /prose:summary -->

## 役割

<!-- prose:role -->
コマの新規登録・編集モーダル。名前・画像・トリミング・デフォルトパラメータ・カスタムパラメータ・公開範囲をまとめて扱う。システム固有のパラメータ欄は [[js.parameters.registry]] が返すプラグイン記述子から組み立てるため、DX3 やシノビガミ固有の知識はここには無い。
<!-- /prose:role -->

## export（5）

| 行 | 種別 | 名前 | シグネチャ | 説明 |
|---:|---|---|---|---|
| 16 | fn | defaultImageCrop | `defaultImageCrop()` | コマ画像トリミングの既定値：ズームなし・中央。 |
| 23 | fn | applyImageCropStyle | `applyImageCropStyle(imgEl, crop)` | トリミング設定(crop)を<img>のCSSへ反映する。 |
| 46 | fn | applyCharacterEditResult | `applyCharacterEditResult(store, tokenId, result)` | showCharacterEditDialogのonConfirmが返す結果を、Store（部屋のstore、または js/character-builder.jsが使う部屋に紐づかない使い捨てのImmutableS… |
| 437 | fn | showCharacterDialog | `showCharacterDialog({ activePluginId = null, participants = {}, onConfirm })` | activePluginId?: string \| null, onConfirm: (result: { name: string, image: string \| null, imageCrop: {zoom:n… |
| 716 | fn | showCharacterEditDialog | `showCharacterEditDialog({ character, activePluginId = null, participants = {}, onComponentChange, getComponents, onConfirm, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, canEdit = true, readOnlyReason = null, allowParameterEdit = false })` | 既存キャラクターの名前・パラメータ値を更新するためのダイアログ。 |

## トップレベル関数（LOCAL TASKS 候補）（16）

トップレベルの `function` 宣言はこの表が全て。**export 済みかどうかは候補の条件ではない。**
行数が大きいもの（200 行以上、太字）はローカルLLMに渡せない。

| 行 | 名前 | シグネチャ | 行数 | export |
|---:|---|---|---:|:-:|
| 16 | defaultImageCrop | `defaultImageCrop()` | 3 | ✓ |
| 23 | applyImageCropStyle | `applyImageCropStyle(imgEl, crop)` | 9 | ✓ |
| 46 | applyCharacterEditResult | `applyCharacterEditResult(store, tokenId, result)` | 67 | ✓ |
| 117 | buildPluginPanel | `buildPluginPanel({ activePluginId, mode, canEdit = true, parameters, components, onComponentChange, getComponents, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, allowParameterEdit = false })` | 31 |  |
| 154 | buildImagePicker | `buildImagePicker(initialImage, initialCrop, { readOnly = false } = {})` | 140 |  |
| 296 | buildSizeInput | `buildSizeInput(initialSize)` | 17 |  |
| 315 | buildTextColorInput | `buildTextColorInput(initialColor)` | 15 |  |
| 333 | buildVisibleCheckbox | `buildVisibleCheckbox(initialVisible)` | 20 |  |
| 357 | buildParameterVisibilityToggle | `buildParameterVisibilityToggle(initialChecked = true)` | 13 |  |
| 374 | buildAudienceButton | `buildAudienceButton({ getLabel, getAudience, setAudience, participants, myParticipantId })` | 29 |  |
| 407 | canToggleParameterVisibility | `canToggleParameterVisibility(param)` | 3 |  |
| 414 | parseCustomParameterValue | `parseCustomParameterValue(raw)` | 6 |  |
| 423 | ensureDialog | `ensureDialog()` | 7 |  |
| 437 | showCharacterDialog | `showCharacterDialog({ activePluginId = null, participants = {}, onConfirm })` | **233** | ✓ |
| 673 | ensureEditDialog | `ensureEditDialog()` | 7 |  |
| 716 | showCharacterEditDialog | `showCharacterEditDialog({ character, activePluginId = null, participants = {}, onComponentChange, getComponents, onConfirm, dispatch, getToken, getEffectiveParameterValue, generateBuffId, rollBCDice, tokenId, canEdit = true, readOnlyReason = null, allowParameterEdit = false })` | **381** | ✓ |

## 依存

- import → [[js.audience-picker]], [[js.buff-dialog]], [[js.image-upload]], [[js.local-identity]], [[js.parameters.core]], [[js.parameters.registry]], [[js.read-only-form]], [[js.visibility]]
- imported by → [[js.board-data-driven]], [[js.character-builder]]

## 注意

<!-- prose:notes -->
_(未記入)_
<!-- /prose:notes -->
