# .loop/run-ollama.ps1 — 実装役（ローカルLLM / Ollama）
#
# gemini/Sonnetの実装役と違い、このスクリプトはモデルにツールもリポジトリも渡さない。
# 「関数1つを渡して、書き換えた関数1つを受け取る」純粋な変換に限定し、
# 貼り付けはこのスクリプトが完全一致置換で行う。小さいモデルは差分適用と
# ファイル全文の再生成で壊すため、そのどちらもさせない。
#
# 使い方: powershell -File .loop/run-ollama.ps1 -TaskId T-002
# 終了コード: 0 = 全ユニット適用成功, 1 = 1件でも失敗（Sonnetへエスカレーションする）, 2 = 実行エラー

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$TaskId,
    [string]$Model = 'qwen2.5-coder:7b',
    [string]$Endpoint = 'http://localhost:11434',
    [int]$MaxAttempts = 3
)

$ErrorActionPreference = 'Stop'

$LoopDir  = $PSScriptRoot
$Repo     = Split-Path -Parent $LoopDir
$SpecPath = Join-Path $LoopDir "spec\$TaskId.md"
$TmplPath = Join-Path $LoopDir 'prompts\implement-local.md'
$RunDir   = Join-Path $LoopDir "runs\$TaskId"

if (-not (Test-Path $SpecPath)) { Write-Host "ERROR: 発注書がありません: $SpecPath"; exit 2 }
if (-not (Test-Path $TmplPath)) { Write-Host "ERROR: テンプレがありません: $TmplPath"; exit 2 }
if (-not (Test-Path $RunDir)) { New-Item -ItemType Directory -Path $RunDir -Force | Out-Null }

# ============================================================
# 発注書から ## LOCAL TASKS を読む
#   ### <ファイルパス> :: <関数名>
#   <英語の指示。次の ### か ## まで>
# ============================================================
function Read-LocalTasks([string]$specPath) {
    $lines = Get-Content $specPath -Encoding UTF8
    $units = @()
    $inSection = $false
    $current = $null

    foreach ($line in $lines) {
        if ($line -match '^##\s+(?!#)') {
            if ($current) { $units += $current; $current = $null }
            $inSection = ($line -match '^##\s+LOCAL\s+TASKS\s*$')
            continue
        }
        if (-not $inSection) { continue }

        if ($line -match '^###\s+(.+?)\s*::\s*(.+?)\s*$') {
            if ($current) { $units += $current }
            $current = [pscustomobject]@{
                File        = $Matches[1].Trim()
                Function    = $Matches[2].Trim()
                Instruction = ''
            }
            continue
        }
        if ($current -and $line.Trim() -notlike '<!--*') {
            $current.Instruction += ($line + "`n")
        }
    }
    if ($current) { $units += $current }
    return $units
}

# ============================================================
# ソースから関数宣言を切り出す。
# 文字列・テンプレートリテラル・コメントを解釈して波括弧を数えるため、
# `DX3:${group.paramKey}` のようなテンプレートや、コメント内の括弧で壊れない。
# （正規表現リテラル内の括弧までは見ていない。最終的な node --check で担保する）
# ============================================================
function Find-JsFunction([string]$src, [string]$name) {
    $decl = [regex]::Match($src, "(?m)^([ \t]*)(export\s+)?function\s+$([regex]::Escape($name))\s*\(")
    if (-not $decl.Success) { return $null }

    $start = $decl.Index
    $i = $decl.Index + $decl.Length

    # 引数の丸括弧を閉じる
    $paren = 1
    while ($i -lt $src.Length -and $paren -gt 0) {
        if ($src[$i] -eq '(') { $paren++ }
        elseif ($src[$i] -eq ')') { $paren-- }
        $i++
    }
    # 本体の { まで進む
    while ($i -lt $src.Length -and $src[$i] -ne '{') { $i++ }
    if ($i -ge $src.Length) { return $null }

    # 本体の波括弧を数える。
    # 位置の更新は $step 1箇所に集約している。switch内のcontinueは外側のwhileに効かず、
    # 位置が二重に進んで状態機械が壊れるため、if/elseifで書いている。
    $state = 'code'
    $depth = 0
    $tplStack = New-Object System.Collections.Stack

    while ($i -lt $src.Length) {
        $c = $src[$i]
        $n = if ($i + 1 -lt $src.Length) { $src[$i + 1] } else { [char]0 }
        $step = 1

        if ($state -eq 'code') {
            if ($c -eq '/' -and $n -eq '/') { $state = 'line'; $step = 2 }
            elseif ($c -eq '/' -and $n -eq '*') { $state = 'block'; $step = 2 }
            elseif ($c -eq "'") { $state = 'single' }
            elseif ($c -eq '"') { $state = 'double' }
            elseif ($c -eq '`') { $state = 'template' }
            elseif ($c -eq '{') { $depth++ }
            elseif ($c -eq '}') {
                $depth--
                if ($depth -eq 0) {
                    if ($tplStack.Count -eq 0) {
                        return [pscustomobject]@{ Start = $start; Length = ($i + 1 - $start); Text = $src.Substring($start, $i + 1 - $start) }
                    }
                    # テンプレートリテラルの ${ } から戻る
                    $depth = $tplStack.Pop()
                    $state = 'template'
                }
            }
        }
        elseif ($state -eq 'line')   { if ($c -eq "`n") { $state = 'code' } }
        elseif ($state -eq 'block')  { if ($c -eq '*' -and $n -eq '/') { $state = 'code'; $step = 2 } }
        elseif ($state -eq 'single') { if ($c -eq '\') { $step = 2 } elseif ($c -eq "'") { $state = 'code' } }
        elseif ($state -eq 'double') { if ($c -eq '\') { $step = 2 } elseif ($c -eq '"') { $state = 'code' } }
        elseif ($state -eq 'template') {
            if ($c -eq '\') { $step = 2 }
            elseif ($c -eq '`') { $state = 'code' }
            # ${ } は開き波括弧1つとして数える。0から始めると対応する } で -1 になり閉じられない。
            elseif ($c -eq '$' -and $n -eq '{') { $tplStack.Push($depth); $depth = 1; $state = 'code'; $step = 2 }
        }

        $i += $step
    }
    return $null
}

function Get-CodeFence([string]$text) {
    $m = [regex]::Match($text, '(?s)```(?:js|javascript)?\s*\r?\n(.*?)```')
    if ($m.Success) { return $m.Groups[1].Value.Trim() }
    return $null
}

function Compare-Normalized([string]$a, [string]$b) {
    return (($a -replace '\s+', ' ').Trim()) -eq (($b -replace '\s+', ' ').Trim())
}

# 元コードにあったコメント行が出力に残っているか。
# 小さいモデルは「既存コメントをそのまま残せ」と明示しても日本語コメントを落とす。
# 構文も動作も壊れないため他のどの検査にも掛からず、黙って情報だけが失われる。
function Find-LostComments([string]$original, [string]$rewritten) {
    $commentLines = @($original -split "`n" | ForEach-Object { $_.Trim() } |
        Where-Object { $_ -match '^(//|/\*|\*)' })
    $lost = @()
    foreach ($c in $commentLines) {
        if (-not ($rewritten -like "*$c*")) { $lost += $c }
    }
    return $lost
}

# 断片単体が構文として成立するか
function Test-SnippetSyntax([string]$code) {
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("loopsnip_" + [guid]::NewGuid().ToString('N') + '.mjs')
    $err = [System.IO.Path]::GetTempFileName()
    $out = [System.IO.Path]::GetTempFileName()
    try {
        [System.IO.File]::WriteAllText($tmp, $code, (New-Object System.Text.UTF8Encoding($false)))
        $p = Start-Process -FilePath 'node' -ArgumentList @('--check', $tmp) -NoNewWindow -Wait -PassThru `
            -RedirectStandardError $err -RedirectStandardOutput $out
        return $p.ExitCode -eq 0
    } finally {
        Remove-Item $tmp, $err, $out -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-LocalModel([string]$prompt, [double]$temperature) {
    $body = @{
        model   = $Model
        prompt  = $prompt
        stream  = $false
        # Ollamaのnum_ctx既定値は2048。明示しないと黙って切り捨てられる。
        options = @{ num_ctx = 8192; temperature = $temperature }
    } | ConvertTo-Json -Depth 5
    # 文字列のままBodyに渡すとPowerShell 5.1はUTF-8で送らず、日本語コメントが「?????」に
    # 化けたままモデルへ届く（モデルはそれを忠実に再現するので、原因が分かりにくい）。
    # 必ずUTF-8バイト列にしてcharsetも明示する。
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $res = Invoke-RestMethod -Uri "$Endpoint/api/generate" -Method Post -Body $bytes -ContentType 'application/json; charset=utf-8' -TimeoutSec 600
    return $res.response
}

# ============================================================
# 本処理
# ============================================================
$units = @(Read-LocalTasks $SpecPath)
if ($units.Count -eq 0) {
    Write-Host "ERROR: 発注書に ## LOCAL TASKS がありません。ローカル実装役に渡せる形になっていません。"
    exit 2
}

$template = Get-Content $TmplPath -Raw -Encoding UTF8
$results = @()
$log = New-Object System.Text.StringBuilder

Write-Host "=== ローカル実装役: $Model / $($units.Count) ユニット ==="

foreach ($u in $units) {
    Write-Host ""
    Write-Host "--- $($u.File) :: $($u.Function) ---"
    [void]$log.AppendLine("### $($u.File) :: $($u.Function)")

    $full = Join-Path $Repo $u.File
    if (-not (Test-Path $full -PathType Leaf)) {
        Write-Host "  失敗: ファイルが見つかりません"
        $results += [pscustomobject]@{ Unit = "$($u.File)::$($u.Function)"; Status = 'fail'; Reason = 'ファイルが無い' }
        continue
    }

    # 元ファイルのBOM有無を覚えておく。ReadAllTextはBOMを外して返すため、
    # 覚えずに書き戻すとBOMが消えて差分に無関係な1行が出る。
    $head = [System.IO.File]::ReadAllBytes($full) | Select-Object -First 3
    $hadBom = ($head.Count -eq 3 -and $head[0] -eq 0xEF -and $head[1] -eq 0xBB -and $head[2] -eq 0xBF)
    $src = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)
    $found = Find-JsFunction $src $u.Function
    if (-not $found) {
        Write-Host "  失敗: 関数を切り出せません（function 宣言のみ対応）"
        $results += [pscustomobject]@{ Unit = "$($u.File)::$($u.Function)"; Status = 'fail'; Reason = '関数を切り出せない' }
        continue
    }

    $original = $found.Text
    $prompt = $template.Replace('{{FUNCTION}}', $original).Replace('{{INSTRUCTION}}', $u.Instruction.Trim())
    [void]$log.AppendLine($prompt)

    $applied = $false
    $lastReason = ''

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        # temperature 0 のまま再試行しても同じ出力しか返らないため、試行ごとに上げる
        $temp = @(0.0, 0.2, 0.4)[[Math]::Min($attempt - 1, 2)]
        $raw = Invoke-LocalModel $prompt $temp
        [void]$log.AppendLine("--- attempt $attempt (temp=$temp) ---")
        [void]$log.AppendLine($raw)

        $code = Get-CodeFence $raw
        if (-not $code) { $lastReason = 'コードフェンスが無い'; Write-Host "  試行$attempt : $lastReason"; continue }
        if (Compare-Normalized $code $original) { $lastReason = '無変更（元コードをそのまま返した）'; Write-Host "  試行$attempt : $lastReason"; continue }
        if ($code -notmatch [regex]::Escape("function $($u.Function)")) { $lastReason = '関数名が変わっている'; Write-Host "  試行$attempt : $lastReason"; continue }
        if (-not (Test-SnippetSyntax $code)) { $lastReason = '断片が構文エラー'; Write-Host "  試行$attempt : $lastReason"; continue }

        $lost = Find-LostComments $original $code
        if ($lost.Count -gt 0) {
            $lastReason = "既存コメントが $($lost.Count) 行失われた"
            Write-Host "  試行$attempt : $lastReason"
            $lost | Select-Object -First 3 | ForEach-Object { Write-Host "      失: $_" }
            continue
        }

        # 完全一致置換して、ファイル全体の構文も確認する
        $next = $src.Remove($found.Start, $found.Length).Insert($found.Start, $code)
        if (-not (Test-SnippetSyntax $next)) { $lastReason = '置換後のファイルが構文エラー'; Write-Host "  試行$attempt : $lastReason"; continue }

        [System.IO.File]::WriteAllText($full, $next, (New-Object System.Text.UTF8Encoding($hadBom)))
        Write-Host "  適用しました（試行$attempt, temp=$temp）"
        $results += [pscustomobject]@{ Unit = "$($u.File)::$($u.Function)"; Status = 'applied'; Reason = "attempt=$attempt" }
        $applied = $true
        break
    }

    if (-not $applied) {
        Write-Host "  失敗: $MaxAttempts 回とも通りませんでした（$lastReason）"
        $results += [pscustomobject]@{ Unit = "$($u.File)::$($u.Function)"; Status = 'fail'; Reason = $lastReason }
    }
}

$logPath = Join-Path $RunDir 'local.log'
$log.ToString() | Out-File -FilePath $logPath -Encoding utf8

$resultPath = Join-Path $RunDir 'local.json'
[pscustomobject]@{ taskId = $TaskId; model = $Model; units = $results } | ConvertTo-Json -Depth 5 | Out-File -FilePath $resultPath -Encoding utf8

$failed = @($results | Where-Object { $_.Status -ne 'applied' })
Write-Host ""
Write-Host "=== 結果: 適用 $($results.Count - $failed.Count) / $($results.Count) ==="
Write-Host "ログ: $logPath"

if ($failed.Count -gt 0) {
    Write-Host "失敗したユニットは Sonnet 実装役へエスカレーションしてください。"
    exit 1
}
exit 0
