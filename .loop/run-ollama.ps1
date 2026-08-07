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
    # ローカルLLMはトークン課金が無いので、機械検査を通るまで多めに回す。
    # ただし壁時計時間は有限なのでユニットごとに上限秒数を設ける。
    # 課金モデルを下請けに据える場合は -Billed を付けること（下で3回に抑える）。
    [int]$MaxAttempts = 12,
    [int]$MaxSecondsPerUnit = 300,
    # 下請けが課金モデル（Sonnet / Gemini の従量課金など）のときに立てる。
    [switch]$Billed
)

$ErrorActionPreference = 'Stop'

# ============================================================
# 再試行回数の上限
#
# 既定の12回は「下請けが無料だから、通るまで回してよい」という前提に立っている。
# 課金モデルを据えると同じ回数がそのまま請求になるため、3回で打ち切る。
# 4回目以降で当たる見込みは薄く（.loop/README.md の実測では、直る症状は1〜2回で直り、
# 直らない症状は12回回しても直らなかった）、払う価値がない。
# ============================================================
$BilledMaxAttempts = 3

$isLocalEndpoint = $Endpoint -match '^https?://(localhost|127\.0\.0\.1|\[::1\])(:|/|$)'

if ($Billed) {
    if ($MaxAttempts -gt $BilledMaxAttempts) {
        Write-Host "課金モデル指定のため、再試行を $MaxAttempts 回から $BilledMaxAttempts 回に抑えます。"
        $MaxAttempts = $BilledMaxAttempts
    }
} elseif (-not $isLocalEndpoint) {
    Write-Host "WARN: エンドポイントが localhost ではありません ($Endpoint)。"
    Write-Host "      課金モデルなら -Billed を付けてください（再試行が $MaxAttempts 回のままです）。"
}

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
#   <英語の指示。次の ### か #### CHECK か ## まで>
#   #### CHECK
#   <assert を並べたJS。任意。次の ### か ## まで>
# ============================================================
function Read-LocalTasks([string]$specPath) {
    $lines = Get-Content $specPath -Encoding UTF8
    $units = @()
    $inSection = $false
    $current = $null
    $mode = 'instruction'

    foreach ($line in $lines) {
        if ($line -match '^##\s+(?!#)') {
            if ($current) { $units += $current; $current = $null }
            $inSection = ($line -match '^##\s+LOCAL\s+TASKS\s*$')
            $mode = 'instruction'
            continue
        }
        if (-not $inSection) { continue }

        if ($line -match '^###\s+(.+?)\s*::\s*(.+?)\s*$') {
            if ($current) { $units += $current }
            $current = [pscustomobject]@{
                File        = $Matches[1].Trim()
                Function    = $Matches[2].Trim()
                Instruction = ''
                Check       = ''
            }
            $mode = 'instruction'
            continue
        }
        # #### CHECK 以降はアサーション。指示文とは別に集める。
        if ($line -match '^####\s+CHECK\s*$') { $mode = 'check'; continue }

        if (-not $current) { continue }
        if ($line.Trim() -like '<!--*') { continue }

        if ($mode -eq 'check') {
            # CHECK 本体はフェンスで囲んでも囲まなくてもよい
            if ($line -match '^\s*```') { continue }
            $current.Check += ($line + "`n")
        } else {
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

# 元コードに無かったコメントが増えていないか。
# 「// Add this line」のような編集の説明コメントを、プロンプトで禁止しても消せない。
# 新しいコメントを本当に入れたい場合は、発注書の指示文にそのコメント本文をそのまま書くこと。
# 「コメントを残せ」といった記述で免除されないよう、免除は本文一致に限る。
function Find-AddedComments([string]$original, [string]$rewritten, [string]$instruction) {
    $added = @()
    foreach ($line in ($rewritten -split "`n")) {
        $idx = Get-LineCommentIndex $line
        if ($idx -lt 0) { continue }
        $c = $line.Substring($idx).Trim()
        if ($original -like "*$c*") { continue }        # 元からあるコメント
        if ($instruction -like "*$c*") { continue }     # 指示文が本文ごと要求しているコメント
        $added += $c
    }
    return $added
}

# 行内でコメントが始まる位置を返す（文字列リテラルの中の // は無視する）。無ければ -1。
# 'http://example.com' のような文字列を誤ってコメント扱いしないために必要。
function Get-LineCommentIndex([string]$line) {
    $state = 'code'
    for ($i = 0; $i -lt $line.Length; $i++) {
        $c = $line[$i]
        $n = if ($i + 1 -lt $line.Length) { $line[$i + 1] } else { [char]0 }
        if ($state -eq 'code') {
            if ($c -eq '/' -and ($n -eq '/' -or $n -eq '*')) { return $i }
            elseif ($c -eq "'") { $state = 'single' }
            elseif ($c -eq '"') { $state = 'double' }
            elseif ($c -eq '`') { $state = 'template' }
        }
        elseif ($state -eq 'single')   { if ($c -eq '\') { $i++ } elseif ($c -eq "'") { $state = 'code' } }
        elseif ($state -eq 'double')   { if ($c -eq '\') { $i++ } elseif ($c -eq '"') { $state = 'code' } }
        elseif ($state -eq 'template') { if ($c -eq '\') { $i++ } elseif ($c -eq '`') { $state = 'code' } }
    }
    return -1
}

# 指示に無い新規コメントを機械的に取り除く。
# 「コメントを足すな」という否定制約は、失敗理由を返して12回再試行しても守られなかった
# （2026-08-06 実測）。モデルに守らせるのを諦め、こちらで確実に落とす。
function Remove-AddedComments([string]$original, [string]$rewritten, [string]$instruction) {
    $out = @()
    foreach ($line in ($rewritten -split "`n")) {
        $idx = Get-LineCommentIndex $line
        if ($idx -lt 0) { $out += $line; continue }

        $c = $line.Substring($idx).Trim()
        if (($original -like "*$c*") -or ($instruction -like "*$c*")) { $out += $line; continue }

        $head = $line.Substring(0, $idx).TrimEnd()
        # コメントだけの行は行ごと落とす。コードの後ろに付いた注釈はコメント部分だけ落とす。
        if ($head -ne '') { $out += $head }
    }
    return ($out -join "`n")
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

# 発注書の #### CHECK を実行する。
#
# 機械ゲートは構文しか見ないため、意味的な欠陥は素通りする（README の
# `floor || -Infinity` の例）。ローカルLLMは再試行が無料なので、実行可能な
# アサーションを当てて「構文が通るだけの推測」を「振る舞いが検証済み」に変える。
#
# ファイル全体を import せず、関数の断片とアサーションだけを .mjs に書き出して走らせる。
# js/ の多くはブラウザ前提でトップレベルに DOM 参照を持ち、node では読み込みすら
# 通らないため。孤立実行できる関数だけが CHECK の対象になる（成否は事前確認で判定する）。
# node の stderr から意味のある部分だけを取り出す。
# 素の出力は先頭3行が node 内部フレーム（`node:internal/...` / `triggerUncaughtException(`）で、
# 肝心の `AssertionError` と `0 !== 99` はその後ろに来る。スタックは一時ファイルのパスばかりで
# 7b モデルには雑音にしかならないので落とす。
function Format-CheckError([string]$raw) {
    $lines = @($raw -split "`r?`n" | Where-Object { $_.Trim() })
    if ($lines.Count -eq 0) { return '' }
    $head = 0
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^[A-Za-z]*Error[:\s\[]') { $head = $i; break }
    }
    $kept = @($lines[$head..($lines.Count - 1)] | Where-Object {
        $_ -notmatch '^\s*at ' -and
        $_ -notmatch '^node:internal' -and
        $_ -notmatch '^\s*triggerUncaughtException' -and
        $_ -notmatch '^\s*\^+\s*$' -and
        $_ -notmatch '^Node\.js v'
    })
    if ($kept.Count -eq 0) { $kept = @($lines | Select-Object -First 8) }
    return (($kept | Select-Object -First 12) -join "`n")
}

function Invoke-CheckHarness([string]$functionText, [string]$checkBody) {
    $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("loopchk_" + [guid]::NewGuid().ToString('N') + '.mjs')
    $err = [System.IO.Path]::GetTempFileName()
    $out = [System.IO.Path]::GetTempFileName()
    $harness = "import assert from 'node:assert/strict';`n`n$functionText`n`n$checkBody`n"
    try {
        [System.IO.File]::WriteAllText($tmp, $harness, (New-Object System.Text.UTF8Encoding($false)))
        # 生成コードが無限ループしうるので -Wait は使えない。時間を切って殺す。
        $p = Start-Process -FilePath 'node' -ArgumentList @("`"$tmp`"") -NoNewWindow -PassThru `
            -RedirectStandardError $err -RedirectStandardOutput $out
        if (-not $p.WaitForExit(10000)) {
            try { $p.Kill() } catch { }
            return [pscustomobject]@{ Code = 124; Message = 'CHECK did not finish within 10 seconds (possible infinite loop).'; Assertion = $false }
        }
        $p.WaitForExit()
        $raw = '' + (Get-Content $err -Raw -ErrorAction SilentlyContinue)
        $msg = Format-CheckError $raw
        $code = $p.ExitCode
        if ($null -eq $code) { $code = if ($msg) { 1 } else { 0 } }
        return [pscustomobject]@{
            Code      = $code
            Message   = $msg
            # AssertionError = ハーネスは動いた上でアサーションが落ちた。
            # それ以外のエラーは「関数が単体で動かない」ことを意味する。
            Assertion = ($msg -match 'AssertionError')
        }
    } finally {
        Remove-Item $tmp, $err, $out -Force -ErrorAction SilentlyContinue
    }
}

function Invoke-LocalModel([string]$prompt, [double]$temperature, [int]$seed) {
    $body = @{
        model   = $Model
        prompt  = $prompt
        stream  = $false
        # Ollamaのnum_ctx既定値は2048。明示しないと黙って切り捨てられる。
        # seedを振るのは、温度だけを上げて多様性を出すと品質が落ちるため。
        # 同じ温度のまま別の標本を引くほうが当たりやすい。
        options = @{ num_ctx = 8192; temperature = $temperature; seed = $seed }
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
    $check = $u.Check.Trim()

    # CHECK の事前確認。元コードで一度走らせて、ハーネス自体が成立するかを先に見る。
    # ここを通しておくと、書き換え後に出たエラーはすべてモデルの責任だと確定できる。
    if ($check) {
        $pre = Invoke-CheckHarness $original $check
        if ($pre.Code -eq 0) {
            Write-Host "  警告: CHECK が元コードのままでも通ります。要求した変更を検証できていません。"
            [void]$log.AppendLine('PREFLIGHT: check passes on the original function (non-discriminating)')
        }
        elseif (-not $pre.Assertion) {
            # ReferenceError 等。関数が単体で動かないので、この関数に CHECK は付けられない。
            Write-Host "  失敗: CHECK を孤立実行できません（関数単体では動きません）"
            foreach ($l in ($pre.Message -split "`n" | Select-Object -First 3)) { Write-Host "      $l" }
            [void]$log.AppendLine("PREFLIGHT FAILED: $($pre.Message)")
            $results += [pscustomobject]@{
                Unit   = "$($u.File)::$($u.Function)"
                Status = 'fail'
                Reason = 'CHECK を孤立実行できない（CHECK を外すか Sonnet へ回す）'
            }
            continue
        }
    }

    $checkBlock = ''
    if ($check) {
        $fence = '```js'
        $checkBlock = "`nYour rewritten function MUST make all of these assertions pass:`n" +
                      $fence + "`n" + $check + "`n" + '```'
    }
    $prompt = $template.Replace('{{FUNCTION}}', $original).
                        Replace('{{INSTRUCTION}}', $u.Instruction.Trim()).
                        Replace('{{CHECK}}', $checkBlock)
    [void]$log.AppendLine($prompt)

    $applied = $false
    $lastReason = ''
    $feedback = ''
    $reasonCounts = @{}
    $unitSw = [System.Diagnostics.Stopwatch]::StartNew()

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if ($unitSw.Elapsed.TotalSeconds -gt $MaxSecondsPerUnit) {
            $lastReason = "時間切れ（$MaxSecondsPerUnit 秒）: $lastReason"
            Write-Host "  打ち切り: $MaxSecondsPerUnit 秒を超えました"
            break
        }

        # 1回目は温度0（決定的に最良を引く）。2回目以降は温度を固定的に振りつつseedを変える。
        # 温度0のまま再試行しても同じ出力しか返らないので、必ず何かを変える必要がある。
        $temp = if ($attempt -eq 1) { 0.0 } else { @(0.3, 0.5, 0.7)[($attempt - 2) % 3] }
        $seed = $attempt * 7919

        # 直前の失敗理由をプロンプトに返す。単なる再抽選より当たりやすい。
        $attemptPrompt = if ($feedback) { $prompt + "`n" + $feedback } else { $prompt }

        $raw = Invoke-LocalModel $attemptPrompt $temp $seed
        [void]$log.AppendLine("--- attempt $attempt (temp=$temp, seed=$seed) ---")
        # 返した失敗理由も残す。ここが空だと、なぜ再試行が収束しないのかを後から追えない。
        if ($feedback) { [void]$log.AppendLine("[feedback sent]`n$feedback`n") }
        [void]$log.AppendLine($raw)

        # 失敗したらここに理由と、モデルへ返す英語のフィードバックを入れて次の試行へ
        $fail = $null
        $feedback = ''

        $code = Get-CodeFence $raw
        if ($code) {
            # 「// Add this line」のような編集注釈は再試行では消せないので、ここで機械的に落とす
            $code = Remove-AddedComments $original $code $u.Instruction
        }
        if (-not $code) {
            $fail = 'コードフェンスが無い'
            $feedback = "Your previous answer was rejected: you did not wrap the function in a ```js code fence. Output ONLY the rewritten function inside a ```js fence."
        }
        elseif (Compare-Normalized $code $original) {
            $fail = '無変更（元コードをそのまま返した）'
            $feedback = "Your previous answer was rejected: you returned the original function unchanged. You MUST actually apply the requested change."
        }
        elseif ($code -notmatch [regex]::Escape("function $($u.Function)")) {
            $fail = '関数名が変わっている'
            $feedback = "Your previous answer was rejected: you changed the function name. Keep it exactly ``$($u.Function)``."
        }
        elseif (-not (Test-SnippetSyntax $code)) {
            $fail = '断片が構文エラー'
            $feedback = "Your previous answer was rejected: the code you produced is not valid JavaScript. Return syntactically valid code."
        }
        elseif (($addedComments = Find-AddedComments $original $code $u.Instruction).Count -gt 0) {
            $fail = "指示に無いコメントが $($addedComments.Count) 件増えた"
            $addedText = $addedComments -join "`n"
            $feedback = "Your previous answer was rejected: you added comments that were not in the original and were not requested. Remove them completely. Do not annotate your own edit. The offending comments are:`n$addedText"
            Write-Host "  試行$attempt : $fail"
            $addedComments | Select-Object -First 3 | ForEach-Object { Write-Host "      増: $_" }
        }
        else {
            $lost = Find-LostComments $original $code
            if ($lost.Count -gt 0) {
                $fail = "既存コメントが $($lost.Count) 行失われた"
                $lostText = ($lost | ForEach-Object { $_ }) -join "`n"
                $feedback = "Your previous answer was rejected: you deleted existing comment lines. Every comment line below must appear in your output, character for character, in its original position. Do not translate, shorten, or drop them:`n$lostText"
                Write-Host "  試行$attempt : $fail"
                $lost | Select-Object -First 3 | ForEach-Object { Write-Host "      失: $_" }
            }
        }

        if (-not $fail) {
            # 完全一致置換して、ファイル全体の構文も確認する
            $next = $src.Remove($found.Start, $found.Length).Insert($found.Start, $code)
            if (-not (Test-SnippetSyntax $next)) {
                $fail = '置換後のファイルが構文エラー'
                $feedback = "Your previous answer was rejected: splicing it back into the file produced invalid JavaScript. Return the complete function only, balanced braces included."
            }
        }

        # 最後に振る舞いを見る。構文が通っても意味が違うものはここで落ちる。
        if (-not $fail -and $check) {
            $chk = Invoke-CheckHarness $code $check
            if ($chk.Code -ne 0) {
                $fail = 'CHECK が通らない'
                $feedback = "Your previous answer was rejected: it does not pass the required assertions. Fix the logic so every assertion passes. The test output was:`n$($chk.Message)"
                Write-Host "  試行$attempt : $fail"
                foreach ($l in ($chk.Message -split "`n" | Select-Object -First 2)) { Write-Host "      $l" }
            }
        }

        if ($fail) {
            $lastReason = $fail
            $reasonCounts[$fail] = 1 + [int]$reasonCounts[$fail]
            if ($fail -notlike '既存コメント*' -and $fail -notlike '指示に無いコメント*' -and $fail -ne 'CHECK が通らない') {
                Write-Host "  試行$attempt : $fail"
            }
            continue
        }

        [System.IO.File]::WriteAllText($full, $next, (New-Object System.Text.UTF8Encoding($hadBom)))
        $checkNote = if ($check) { ', check=pass' } else { ', check=なし' }
        Write-Host "  適用しました（試行$attempt, temp=$temp$checkNote）"
        $results += [pscustomobject]@{
            Unit   = "$($u.File)::$($u.Function)"
            Status = 'applied'
            Reason = "attempt=$attempt$checkNote"
        }
        $applied = $true
        break
    }

    if (-not $applied) {
        Write-Host "  失敗: 通りませんでした（$([math]::Round($unitSw.Elapsed.TotalSeconds,1)) 秒 / $lastReason）"
        Write-Host "  棄却理由の内訳:"
        $reasonCounts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
            Write-Host "    $($_.Value) 回: $($_.Key)"
        }
        $results += [pscustomobject]@{
            Unit    = "$($u.File)::$($u.Function)"
            Status  = 'fail'
            Reason  = $lastReason
            Rejects = ($reasonCounts.GetEnumerator() | ForEach-Object { "$($_.Key) x$($_.Value)" }) -join ' / '
        }
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
