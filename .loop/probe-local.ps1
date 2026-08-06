# .loop/probe-local.ps1 — ローカルLLMの適格性チェック
# ループの実装役として使えるモデルかを、実際の書き換え課題で測る。
# モデルを入れ替えたら必ずこれを通すこと。
#
# 使い方: powershell -File .loop/probe-local.ps1 [-Model qwen2.5-coder:7b]
# 終了コード: 0 = 全テスト合格（実装役として使える）, 1 = 不合格
#
# 判定の根拠（2026-08-06 の実測）:
#   qwen2.5-coder:3b 日本語 … 全滅（解説文を返す / 無変更）
#   qwen2.5-coder:7b 日本語 … 全滅（無変更 / 指示と違う変更）
#   qwen2.5-coder:7b 英語   … 全合格
# プロンプトは必ず英語で書くこと。これが合否を分ける最大の要因だった。

[CmdletBinding()]
param(
    [string]$Model = 'qwen2.5-coder:7b',
    [string]$Endpoint = 'http://localhost:11434'
)

$ErrorActionPreference = 'Stop'

function Invoke-LocalModel([string]$prompt) {
    $body = @{
        model   = $Model
        prompt  = $prompt
        stream  = $false
        # Ollamaのnum_ctx既定値は2048で、黙って切り捨てられる。必ず明示する。
        options = @{ num_ctx = 8192; temperature = 0 }
    } | ConvertTo-Json -Depth 5

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-RestMethod -Uri "$Endpoint/api/generate" -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 600
    $sw.Stop()
    return [pscustomobject]@{
        Text = $res.response
        Sec  = [math]::Round($sw.Elapsed.TotalSeconds, 1)
        Tok  = $res.eval_count
    }
}

# ```js ... ``` を取り出す。取り出せなければ null。
function Get-CodeFence([string]$text) {
    $m = [regex]::Match($text, '(?s)```(?:js|javascript)?\s*\r?\n(.*?)```')
    if (-not $m.Success) { return $null }
    return $m.Groups[1].Value.Trim()
}

function Compare-Normalized([string]$a, [string]$b) {
    $na = ($a -replace '\s+', ' ').Trim()
    $nb = ($b -replace '\s+', ' ').Trim()
    return $na -eq $nb
}

# ---------------- テスト定義 ----------------
# original は実際にこのリポジトリにある関数。must は「その変更が入っていれば必ず現れる文字列」。

$tests = @(
    @{
        Name     = 'simple-edit'
        Original = @'
function collectAbilityParamEntries(parameters) {
  return DX3_ABILITY_SKILL_GROUPS
    .map(group => [`DX3:${group.paramKey}`, parameters[`DX3:${group.paramKey}`]])
    .filter(([, param]) => !!param);
}
'@
        Instruction = @'
Add a condition to the filter so that entries are kept only if `param.value` is greater than 0. Keep the existing "param exists" condition.
'@
        FuncName = 'collectAbilityParamEntries'
        Must     = @('param.value', '> 0')
    },
    @{
        Name     = 'multi-step-edit'
        Original = @'
function readEffectiveOrBaseValue(paramId, { parameters, token, getEffectiveParameterValue }) {
  if (token && typeof getEffectiveParameterValue === 'function') {
    const effective = getEffectiveParameterValue(token, paramId);
    if (effective !== undefined && effective !== null) return Number(effective) || 0;
  }
  return Number(parameters[paramId]?.value) || 0;
}
'@
        Instruction = @'
1. Add an optional `floor` (number) property to the destructured second argument.
2. When `floor` is a number, the returned value must never be lower than `floor`. When `floor` is not provided, do not clamp.
3. There are two return statements. Apply the clamp to both.
'@
        FuncName = 'readEffectiveOrBaseValue'
        Must     = @('floor', 'Math.max')
    }
)

$template = Get-Content (Join-Path $PSScriptRoot 'prompts\implement-local.md') -Raw -Encoding UTF8

Write-Host "=== ローカルLLM適格性チェック: $Model ==="
Write-Host ""

$allPassed = $true

foreach ($t in $tests) {
    Write-Host "--- $($t.Name) ---"
    $prompt = $template.Replace('{{FUNCTION}}', $t.Original).Replace('{{INSTRUCTION}}', $t.Instruction)

    $r = Invoke-LocalModel $prompt
    $code = Get-CodeFence $r.Text

    $reasons = @()
    if (-not $code) {
        $reasons += 'コードフェンスを取り出せない'
    } else {
        if (Compare-Normalized $code $t.Original) { $reasons += '無変更（元のコードをそのまま返した）' }
        if ($code -notmatch [regex]::Escape("function $($t.FuncName)")) { $reasons += '関数名が変わっている' }
        foreach ($needle in $t.Must) {
            if ($code -notlike "*$needle*") { $reasons += "期待する変更が入っていない: $needle" }
        }
        # 説明文の混入（フェンス外に本文がある）はルール違反だが、
        # スクリプト側でフェンスだけ抜くので不合格にはしない。警告のみ。
        $outside = ($r.Text -replace '(?s)```.*?```', '').Trim()
        if ($outside.Length -gt 20) { Write-Host "  [警告] フェンス外に説明文 $($outside.Length) 文字（出力ルール違反だが抽出で吸収可能）" }
    }

    if ($reasons.Count -eq 0) {
        Write-Host "  合格 ($($r.Sec) 秒 / $($r.Tok) tok)"
    } else {
        $allPassed = $false
        Write-Host "  不合格 ($($r.Sec) 秒 / $($r.Tok) tok)"
        $reasons | ForEach-Object { Write-Host "    - $_" }
    }
    if ($code) {
        Write-Host "  --- 出力 ---"
        $code -split "`n" | ForEach-Object { Write-Host "  $_" }
    }
    Write-Host ""
}

if ($allPassed) {
    Write-Host "=== 判定: 合格 — $Model は実装役として使える ==="
    exit 0
} else {
    Write-Host "=== 判定: 不合格 — $Model を実装役に使わないこと ==="
    Write-Host "プロンプトが英語になっているかを最初に確認する。日本語だと合格するモデルでも全滅する。"
    exit 1
}
