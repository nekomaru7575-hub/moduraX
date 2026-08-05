# .loop/run-gemini.ps1 — 実装役（Gemini CLI）をヘッドレスで走らせる
# 使い方:
#   powershell -File .loop/run-gemini.ps1 -TaskId T-001 -Iteration 1
#   powershell -File .loop/run-gemini.ps1 -TaskId T-001 -Iteration 2 -IncludeGate
# 終了コード: 0 = 正常終了, 1 = gemini が非0で終了, 2 = 実行エラー

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$TaskId,
    [int]$Iteration = 1,
    [string]$Model,
    [switch]$IncludeGate
)

$ErrorActionPreference = 'Stop'

$LoopDir  = $PSScriptRoot
$Repo     = Split-Path -Parent $LoopDir
$SpecPath = Join-Path $LoopDir "spec\$TaskId.md"
$TmplPath = Join-Path $LoopDir 'prompts\implement.md'
$RunDir   = Join-Path $LoopDir "runs\$TaskId"

if (-not (Test-Path $SpecPath)) { Write-Host "ERROR: 発注書がありません: $SpecPath"; exit 2 }
if (-not (Test-Path $TmplPath)) { Write-Host "ERROR: テンプレがありません: $TmplPath"; exit 2 }
if (-not (Test-Path $RunDir)) { New-Item -ItemType Directory -Path $RunDir -Force | Out-Null }

$iterPad = '{0:D2}' -f $Iteration

# ---------- プロンプト組み立て ----------
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine((Get-Content $TmplPath -Raw -Encoding UTF8))
[void]$sb.AppendLine('# 発注書')
[void]$sb.AppendLine('')
[void]$sb.AppendLine((Get-Content $SpecPath -Raw -Encoding UTF8))

if ($IncludeGate) {
    $gatePath = Join-Path $RunDir 'gate.json'
    if (Test-Path $gatePath) {
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('---')
        [void]$sb.AppendLine('# 前回の機械ゲート結果（これを解消すること）')
        [void]$sb.AppendLine('')
        [void]$sb.AppendLine('```json')
        [void]$sb.AppendLine((Get-Content $gatePath -Raw -Encoding UTF8))
        [void]$sb.AppendLine('```')
    } else {
        Write-Host "WARN: gate.json が見つからないため機械ゲート結果は同梱しません。"
    }
}

$promptPath = Join-Path $RunDir "$iterPad-prompt.md"
$sb.ToString() | Out-File -FilePath $promptPath -Encoding utf8
Write-Host "プロンプト: $promptPath"

# ---------- gemini 実行 ----------
$geminiArgs = @('--approval-mode', 'yolo', '--skip-trust')
if ($Model) { $geminiArgs += @('-m', $Model) }
$geminiArgs += @('-p', '上記の発注書に従って、実際にファイルを編集して実装してください。')

Push-Location $Repo
try {
    Write-Host "gemini 実行中... (task=$TaskId iter=$Iteration)"
    $output = Get-Content $promptPath -Raw -Encoding UTF8 | & gemini @geminiArgs
    $code = $LASTEXITCODE
} finally {
    Pop-Location
}

$logPath = Join-Path $RunDir "$iterPad-gemini.log"
($output | Out-String) | Out-File -FilePath $logPath -Encoding utf8

Write-Host ($output | Out-String)
Write-Host "ログ: $logPath (exit=$code)"

if ($code -ne 0) { exit 1 } else { exit 0 }
