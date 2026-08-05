# .loop — ループエンジニアリング最小構築

1タスクを「発注 → 実装 → 機械ゲート → 検査 → 修正」の閉ループで回すための仕組み。

## 状態: 休止中（2026-08-06〜）

**Gemini が使えるようになるまでこのループは使わない。** 通常どおり Claude Code に直接
依頼する運用に戻す。

理由: 実装役を Gemini に逃がせない以上、コスト面の利点がほぼ無いため。T-001 を1周
回した実測は次のとおり。

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

### 再開の手順

1. リポジトリ直下で `gemini -p "ping"` が通るか確認する（`.env` の `GEMINI_API_KEY` はそのまま置いてある）
2. 通れば `.claude/commands/dev-loop.md` の手順3を `run-gemini.ps1` の呼び出しに戻す
3. 下記「再開時に入れる改善」を反映してから回す

### 再開時に入れる改善

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
| 実装 | Sonnet 5 サブエージェント（本来は Gemini。下記「実装役の差し替え」参照） |
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
  prompts/implement.md 実装用（実装役が誰でも共通）
  prompts/review.md    Sonnet 検査用
  prompts/fix.md       Sonnet 修正用
  gate.ps1             機械ゲート（UTF-8 BOM 必須）
  run-gemini.ps1       gemini CLI ラッパ（UTF-8 BOM 必須）
  runs/T-XXX/          各周回のプロンプト・ログ・gate.json（git 管理外）
```

## 実装役の差し替え

実装役はループの中で唯一の差し替え可能な部品。触るのは
`.claude/commands/dev-loop.md` の手順3だけで、発注書・ゲート・検査・修正はそのまま使える。

### 現状: Sonnet 5（2026-08-06 時点）

本来の設計は Gemini CLI（外部の安いコーダーに実装を逃がし、Claude プランの枠を温存する）
だったが、**Google 側の未解決の不具合により Gemini 経路が使えない**ため Sonnet に退避している。

### Gemini 経路が使えない理由

1. Google 個人アカウントのログイン（Gemini Code Assist for individuals 無料枠）は
   このクライアントでは廃止 — `IneligibleTierError: UNSUPPORTED_CLIENT`
2. 代わりの AI Studio の API キーは、Google が Traffic key（`AIza`）から
   Authentication key（`AQ.`）へ移行中で、**現在は `AQ.` しか発行されない**
3. その `AQ.` キーが多くの SDK / サービスで `401 ACCESS_TOKEN_TYPE_UNSUPPORTED` を返す。
   `?key=` でもヘッダでも同じ。gemini-cli 0.53.1（最新）でも再現
4. Google スタッフは移行を認めたうえで「互換性の問題はフォームで報告してほしい」と回答するのみで、
   回避策は未提示（2026年8月時点で未解決）

- https://discuss.ai.google.dev/t/401-error-access-token-type-unsupported-with-new-aq-api-key/176648
- https://discuss.ai.google.dev/t/account-only-issues-aq-keys-all-return-401-access-token-type-unsupported/176964

### 復旧したら

リポジトリ直下で `gemini -p "ping"` が通るようになったら、`dev-loop.md` の手順3を
`run-gemini.ps1` の呼び出しに戻すだけでよい。キーは `.env` の `GEMINI_API_KEY` に
既に置いてある（`.env` は gitignore 済みで、ゲートの検査対象にも入らない）。

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
