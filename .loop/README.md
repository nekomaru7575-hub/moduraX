# .loop — ループエンジニアリング最小構築

1タスクを「発注 → 実装 → 機械ゲート → 検査 → 修正」の閉ループで回すための仕組み。

## 役割

| 工程 | 担当 |
|---|---|
| 分割・発注書作成・最終承認 | Opus 5（Claude Code 本体） |
| 実装 | Gemini（gemini CLI） |
| 検査（エラー / オーダー照合 / セキュリティ） | Sonnet 5 サブエージェント |
| 修正 | Sonnet 5 サブエージェント |

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
  prompts/implement.md Gemini 用
  prompts/review.md    Sonnet 検査用
  prompts/fix.md       Sonnet 修正用
  gate.ps1             機械ゲート（UTF-8 BOM 必須）
  run-gemini.ps1       gemini CLI ラッパ（UTF-8 BOM 必須）
  runs/T-XXX/          各周回のプロンプト・ログ・gate.json（git 管理外）
```

## 前提: Gemini CLI の認証

**Google 個人アカウントでのログイン（Gemini Code Assist for individuals 無料枠）は
このクライアントでは使えなくなっています**（`IneligibleTierError: UNSUPPORTED_CLIENT`）。
代わりに Google AI Studio の API キーを使う:

1. https://aistudio.google.com/apikey で API キーを発行
2. ユーザー環境変数 `GEMINI_API_KEY` に設定
3. 新しいシェルで `gemini -p "ping"` が返れば OK

`.env` ではなくユーザー環境変数に置くこと（`.env` はゲートの秘密情報チェックで FAIL する）。

## 使い方

Claude Code で:

```
/dev-loop 情報ボックスのタイトルを編集できるようにする
```

手動で 1 周だけ回す場合:

```powershell
git rev-parse HEAD > .loop/runs/T-001/base-ref.txt
powershell -File .loop/run-gemini.ps1 -TaskId T-001 -Iteration 1
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
