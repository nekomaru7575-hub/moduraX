# .loop — ループエンジニアリング最小構築

1タスクを「発注 → 実装 → 機械ゲート → 検査 → 修正」の閉ループで回すための仕組み。

## 状態: ローカルLLMを実装役に組み込み済み（2026-08-06）

実装役は **ローカルLLM（Ollama / qwen2.5-coder:7b）→ 失敗時 Sonnet** の2段構え。
ローカルで通れば実装のトークン消費はゼロ、通らなければ従来どおりなので**下振れが無い**。

Gemini は引き続き使えない（後述）。

### 計測: なぜローカルLLMを入れたか

T-001（Sonnetのみ）の実測は次のとおり。

| 工程 | モデル | トークン |
|---|---|---|
| 実装 1回目（NEED-ALLOW で停止） | Sonnet | 101,971 |
| 実装 2回目（再開して完遂） | Sonnet | 114,667 |
| 検査 | Sonnet | 78,935 |
| 機械ゲート ×2 | — | 0 |
| 合計 | | 295,573 |

通常プロンプトで同じ実装をした場合の見積もりは 100〜150k（すべて Opus）。トークン数では
明確に増、Sonnet の単価を考慮した金額ではほぼ互角。本来はこの 217k の実装分が Gemini 側に
出て Claude の消費がゼロになる設計だった。

得られたものは、独立した検査が仕様との食い違いを1件検出したこと、機械ゲートが無料で
効いたことの2点。

### ローカルLLM実装役の使い方

```powershell
powershell -File .loop/probe-local.ps1                    # モデル適格性チェック
powershell -File .loop/run-ollama.ps1 -TaskId T-XXX       # 実装
```

**モデルを入れ替えたら必ず `probe-local.ps1` を通すこと。** 実際の書き換え課題で
合否を出す。合格しないモデルを実装役に据えてはいけない。

回せるのは「1つの `function` 宣言の中で完結する変更」だけ。発注書の `## LOCAL TASKS`
に、対象の `ファイルパス :: 関数名` と英語の指示を書く（書式は `spec/_TEMPLATE.md`）。

`run-ollama.ps1` はモデルにツールもリポジトリも渡さない。関数1つを渡して書き換えた
関数1つを受け取り、**完全一致置換**で貼り付ける。差分適用とファイル全文の再生成は
小さいモデルが壊すのでさせない。貼り付け前に以下を機械で検査する（トークン0）。

| 検査 | 落とす条件 |
|---|---|
| フェンス抽出 | ` ```js ` ブロックが取り出せない |
| 無変更検出 | 出力が元コードと実質同一 |
| 関数名 | 関数名が変わっている |
| 断片の構文 | 断片単体が `node --check` を通らない |
| 置換後の構文 | 置換後のファイルが `node --check` を通らない |

再試行は temperature を 0 → 0.2 → 0.4 と上げる。0 のまま再試行しても同じ出力しか返らない。

### 重要: プロンプトは必ず英語で書く

**これが合否を分ける最大の要因だった。** 2026-08-06 の実測:

| モデル | 言語 | 結果 |
|---|---|---|
| qwen2.5-coder:3b | 日本語 | 全滅（解説文を返す / 無変更） |
| qwen2.5-coder:7b | 日本語 | 全滅（無変更 / 指示と違う変更） |
| qwen2.5-coder:7b | 英語 | 全合格（1件あたり約6.5秒） |

日本語での失敗は「指示が曖昧だから」ではない。対象コードを全文渡し、変更は1箇所、
出力の書き出しまで固定した最大限明確な条件でも、元コードをそのまま返してきた。

発注書の他のセクションは人間が読むので日本語のままでよい。`## LOCAL TASKS` だけ英語。

### ローカルLLMを入れても検査は外せない

適格性チェックに合格した出力にも、実際に欠陥があった。

```js
return Math.max(Number(effective) || 0, floor || -Infinity);
```

`floor || -Infinity` なので `floor: 0` を渡すとクランプが効かない。構文は正しく指示も
一見満たしているため、**機械ゲートでは絶対に捕まらない**。削れるのは実装のトークンだけで、
Sonnet の検査は必須。

### Gemini が使えない件（未解決）

1. Google 個人アカウントのログイン（Gemini Code Assist for individuals 無料枠）は廃止 — `IneligibleTierError: UNSUPPORTED_CLIENT`
2. AI Studio は現在 Authentication key（`AQ.`）しか発行しない
3. その `AQ.` キーが多くの SDK で `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` を返す。gemini-cli 0.53.1 でも再現
4. Google は移行を認めたうえで回避策を提示していない（2026年8月時点）

- https://discuss.ai.google.dev/t/401-error-access-token-type-unsupported-with-new-aq-api-key/176648
- https://discuss.ai.google.dev/t/account-only-issues-aq-keys-all-return-401-access-token-type-unsupported/176964

復旧したら `run-gemini.ps1` をそのまま使える。キーは `.env` の `GEMINI_API_KEY` に置いてある。

### まだ入れていない改善

T-001 で判明した無駄。未反映。

- **検査役に diff を渡す** — 現状は検査役自身に `git diff` を実行させており、ツール20回・79k を
  消費した。差分をファイルに書き出して渡し、ソース参照は指摘の裏取りが必要なときだけに限る
- **ALLOW は最初から広めに** — 機械ゲートが範囲外編集を無料で捕まえるので、絞りすぎて
  NEED-ALLOW で往復するより広く取る方が安い
- **発注書に関数名まで書く** — 実装役の調査 102k はここで削る
- **再開（SendMessage）は安くない** — それまでの会話全体を入力として再送するため、
  T-001 では2回目の方が高くついた（102k → 115k）。「文脈が残っているから安い」は誤り

### 運用上の注意

サブエージェントの自己申告は検証を前提にすること。T-001 では実装役が「この変更は自分が
書いたものではない」と誤報告し、`git diff` で否定した。

## 役割

| 工程 | 担当 |
|---|---|
| 分割・発注書作成・最終承認 | Opus 5（Claude Code 本体） |
| 実装（1段目） | ローカルLLM（Ollama / qwen2.5-coder:7b）。関数単位の変更のみ。無料 |
| 実装（2段目） | Sonnet 5 サブエージェント。1段目で回せない／失敗したもの |
| 検査（エラー / オーダー照合 / セキュリティ） | Sonnet 5 サブエージェント |
| 修正 | Sonnet 5 サブエージェント |

実装役・検査役・修正役は**それぞれ別のエージェント**を立てる。同じ文脈のまま検査させると
自作自演になり、検査が機能しない。

## コスト最小化の原則

1. Opus はソースを読まない。発注書と JSON の検査結果だけを見る。
2. LLM の前に `gate.ps1`（機械ゲート）を通す。ここで落ちればトークン 0 で差し戻し。
3. Sonnet に渡すのは発注書と `git diff` のみ。リポジトリ全体は渡さない。
4. 検査の出力は構造化 JSON 固定。自然言語の往復をしない。
5. ループ上限 3 周。超えたら人間へエスカレーション。

## ディレクトリ

```
.loop/
  spec/_TEMPLATE.md    発注書テンプレ
  spec/T-XXX.md        発注書（Opus が書く。1タスク1枚）
  prompts/implement.md       実装用（エージェント型の実装役に共通）
  prompts/implement-local.md ローカルLLM用（英語。関数の書き換えのみ）
  prompts/review.md          Sonnet 検査用
  prompts/fix.md             Sonnet 修正用
  gate.ps1                   機械ゲート（UTF-8 BOM 必須）
  probe-local.ps1            ローカルLLM適格性チェック（UTF-8 BOM 必須）
  run-ollama.ps1             ローカル実装役（UTF-8 BOM 必須）
  run-gemini.ps1             gemini CLI ラッパ。Gemini復旧まで未使用（UTF-8 BOM 必須）
  runs/T-XXX/                各周回のプロンプト・ログ・gate.json（git 管理外）
```

## 実装役の差し替え

実装役はループの中で唯一の差し替え可能な部品。触るのは
`.claude/commands/dev-loop.md` の手順3だけで、発注書・ゲート・検査・修正はそのまま使える。

### 現状（2026-08-06）

ローカルLLM → Sonnet の2段構え。Gemini は使えない（冒頭「Gemini が使えない件」参照）。

### その他の選択肢

| 経路 | 費用 | 備考 |
|---|---|---|
| Vertex AI（`GOOGLE_GENAI_USE_VERTEXAI=true` + gcloud + GCP 課金） | 従量、Flash 系なら極小 | API キーではなく OAuth を使うため `AQ.` 問題を回避できる |
| ローカル Gemma（ollama + `gemini gemma`） | 無料 | GPU が要る。コード生成の品質は明確に劣る |

## 使い方

Claude Code で:

```
/dev-loop 情報ボックスのタイトルを編集できるようにする
```

実装役以外は自動で回る。機械ゲートだけ単独で回すこともできる:

```powershell
git rev-parse HEAD > .loop/runs/T-001/base-ref.txt
powershell -File .loop/gate.ps1 -TaskId T-001
```

## 機械ゲートが見るもの

- ALLOW リスト外のファイルが変更されていないか
- 変更行数が上限（既定 800 行）を超えていないか
- 変更された `.js/.mjs/.cjs` の構文（`node --check`、ESM/CJS 両方で試行）
- 変更された `.html` の `<script>` / `<style>` タグ対応
- 追加行への秘密情報混入（AWS キー、Google API キー、秘密鍵、`sk-` トークン、`.env` の変更）

## 注意: .ps1 のエンコーディング

Windows PowerShell 5.1 は BOM のない `.ps1` を ANSI として読むため、日本語コメントが
壊れてパースエラーになる。`gate.ps1` / `run-gemini.ps1` を編集したら BOM を付け直すこと:

```powershell
$p = '.loop/gate.ps1'
$t = [IO.File]::ReadAllText($p, (New-Object Text.UTF8Encoding($false)))
[IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding($true)))
```
