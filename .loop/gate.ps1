# .loop/gate.ps1 — 機械ゲート（トークン0の一次検査）
# 使い方: powershell -File .loop/gate.ps1 -TaskId T-001
# 終了コード: 0 = PASS, 1 = FAIL, 2 = 実行エラー

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$TaskId,
    [string]$BaseRef,
    [int]$MaxChangedLines = 800
)

$ErrorActionPreference = 'Stop'

$LoopDir = $PSScriptRoot
$Repo    = Split-Path -Parent $LoopDir
$SpecPath = Join-Path $LoopDir "spec\$TaskId.md"
$RunDir   = Join-Path $LoopDir "runs\$TaskId"

if (-not (Test-Path $SpecPath)) {
    Write-Host "GATE ERROR: 発注書が見つかりません: $SpecPath"
    exit 2
}
if (-not (Test-Path $RunDir)) { New-Item -ItemType Directory -Path $RunDir -Force | Out-Null }

if (-not $BaseRef) {
    $baseFile = Join-Path $RunDir 'base-ref.txt'
    if (Test-Path $baseFile) { $BaseRef = (Get-Content $baseFile -Raw).Trim() }
    else { $BaseRef = 'HEAD' }
}

$checks = @()
function Add-Check($name, $status, $details) {
    $script:checks += [pscustomobject]@{ name = $name; status = $status; details = @($details) }
}

# ---------- 発注書から ALLOW リストを抽出 ----------
$specLines = Get-Content $SpecPath -Encoding UTF8
$allow = @()
$inAllow = $false
$inFence = $false
foreach ($line in $specLines) {
    if ($line -match '^##\s') {
        $inAllow = ($line -match '^##\s+ALLOW\s*$')
        $inFence = $false
        continue
    }
    if (-not $inAllow) { continue }
    if ($line -match '^\s*```') { $inFence = -not $inFence; continue }
    if (-not $inFence) { continue }
    $t = $line.Trim()
    if ($t -and -not $t.StartsWith('#') -and -not $t.StartsWith('<!--')) { $allow += $t }
}

# .loop/ 配下はループの運用ファイル（発注書・プロンプト・ハーネス・ログ）であって、
# タスクの成果物ではない。ALLOW 照合と行数カウントの**両方**で同じ基準で除外すること。
# 片方だけ除外すると、.loop/ を編集した回で無関係なタスクが diff-size 上限に当たって FAIL する。
function Test-Excluded([string]$path) {
    return $path -like '.loop/*'
}

function Test-Allowed([string]$path, [string[]]$patterns) {
    foreach ($p in $patterns) {
        if ($p.EndsWith('/')) { if ($path.StartsWith($p)) { return $true } }
        elseif ($p -match '[\*\?]') { if ($path -like $p) { return $true } }
        elseif ($path -eq $p) { return $true }
    }
    return $false
}

# ---------- 変更ファイルの収集 ----------
Push-Location $Repo
try {
    $tracked   = @(git diff --name-only $BaseRef -- | Where-Object { $_ })
    $untracked = @(git ls-files --others --exclude-standard | Where-Object { $_ })
    $numstat   = @(git diff --numstat $BaseRef -- | Where-Object { $_ })
} finally {
    Pop-Location
}
$changed = @($tracked + $untracked | Sort-Object -Unique) | Where-Object { -not (Test-Excluded $_) }

if ($changed.Count -eq 0) {
    Add-Check 'changed-files' 'fail' @("$BaseRef からの変更が1件もありません。実装が行われていない可能性があります。")
} else {
    Add-Check 'changed-files' 'pass' $changed
}

# ---------- 1. ALLOW リスト照合 ----------
if ($allow.Count -eq 0) {
    Add-Check 'allowlist' 'fail' @('発注書に ## ALLOW セクション（フェンス内のパス一覧）がありません。')
} else {
    $violations = @($changed | Where-Object { -not (Test-Allowed $_ $allow) })
    if ($violations.Count -gt 0) {
        Add-Check 'allowlist' 'fail' @($violations | ForEach-Object { "ALLOW 外の変更: $_" })
    } else {
        Add-Check 'allowlist' 'pass' @("ALLOW: $($allow -join ', ')")
    }
}

# ---------- 2. 差分サイズ ----------
$lines = 0
foreach ($row in $numstat) {
    # numstat の1行は「追加<TAB>削除<TAB>パス」。パス列で除外を効かせる。
    $parts = $row -split "`t"
    if ($parts.Count -ge 3 -and (Test-Excluded $parts[2])) { continue }
    if ($parts.Count -ge 2) {
        $a = 0; $d = 0
        [void][int]::TryParse($parts[0], [ref]$a)
        [void][int]::TryParse($parts[1], [ref]$d)
        $lines += $a + $d
    }
}
foreach ($f in $untracked) {
    if (Test-Excluded $f) { continue }
    $full = Join-Path $Repo $f
    if (Test-Path $full -PathType Leaf) { $lines += @(Get-Content $full -ErrorAction SilentlyContinue).Count }
}
if ($lines -gt $MaxChangedLines) {
    Add-Check 'diff-size' 'fail' @("変更 $lines 行 > 上限 $MaxChangedLines 行。タスクを分割してください。")
} else {
    Add-Check 'diff-size' 'pass' @("変更 $lines 行")
}

# ---------- 3. JS 構文チェック ----------
function Invoke-NodeCheck([string]$file) {
    $err = [System.IO.Path]::GetTempFileName()
    $out = [System.IO.Path]::GetTempFileName()
    try {
        $p = Start-Process -FilePath 'node' -ArgumentList @('--check', $file) `
            -NoNewWindow -Wait -PassThru -RedirectStandardError $err -RedirectStandardOutput $out
        $msg = (Get-Content $err -Raw -ErrorAction SilentlyContinue)
        return [pscustomobject]@{ Code = $p.ExitCode; Message = $msg }
    } finally {
        Remove-Item $err, $out -Force -ErrorAction SilentlyContinue
    }
}

$syntaxErrors = @()
$jsFiles = @($changed | Where-Object { $_ -match '\.(js|mjs|cjs)$' })
foreach ($f in $jsFiles) {
    $full = Join-Path $Repo $f
    if (-not (Test-Path $full -PathType Leaf)) { continue }
    $r = Invoke-NodeCheck $full
    if ($r.Code -ne 0) {
        # ESM/CJS の取り違えを排除するため、もう一方の解釈でも試す
        $ext = if ($f -match '\.cjs$') { '.mjs' } else { '.cjs' }
        $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("loopchk_" + [guid]::NewGuid().ToString('N') + $ext)
        Copy-Item $full $tmp -Force
        $r2 = Invoke-NodeCheck $tmp
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
        if ($r2.Code -ne 0) {
            $first = ($r.Message -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 3) -join ' / '
            $syntaxErrors += "$f : $first"
        }
    }
}
if ($jsFiles.Count -eq 0) { Add-Check 'js-syntax' 'pass' @('対象 .js なし') }
elseif ($syntaxErrors.Count -gt 0) { Add-Check 'js-syntax' 'fail' $syntaxErrors }
else { Add-Check 'js-syntax' 'pass' @("$($jsFiles.Count) ファイル OK") }

# ---------- 4. HTML タグ対応（script / style のみ） ----------
$htmlIssues = @()
$htmlFiles = @($changed | Where-Object { $_ -match '\.html?$' })
foreach ($f in $htmlFiles) {
    $full = Join-Path $Repo $f
    if (-not (Test-Path $full -PathType Leaf)) { continue }
    $text = Get-Content $full -Raw -Encoding UTF8
    foreach ($tag in @('script', 'style')) {
        $open  = ([regex]::Matches($text, "<$tag(\s|>)", 'IgnoreCase')).Count
        $close = ([regex]::Matches($text, "</$tag\s*>", 'IgnoreCase')).Count
        if ($open -ne $close) { $htmlIssues += "$f : <$tag> $open 個 / </$tag> $close 個で不一致" }
    }
}
if ($htmlFiles.Count -eq 0) { Add-Check 'html-tags' 'pass' @('対象 .html なし') }
elseif ($htmlIssues.Count -gt 0) { Add-Check 'html-tags' 'fail' $htmlIssues }
else { Add-Check 'html-tags' 'pass' @("$($htmlFiles.Count) ファイル OK") }

# ---------- 5. 秘密情報スキャン（追加行のみ） ----------
Push-Location $Repo
try { $diffText = (git diff -U0 $BaseRef -- | Out-String) } finally { Pop-Location }
$added = @($diffText -split "`n" | Where-Object { $_.StartsWith('+') -and -not $_.StartsWith('+++') })
foreach ($f in $untracked) {
    $full = Join-Path $Repo $f
    if (Test-Path $full -PathType Leaf) {
        $added += @(Get-Content $full -ErrorAction SilentlyContinue | ForEach-Object { "+$_" })
    }
}

$hardPatterns = @(
    @{ n = 'AWS アクセスキー';    p = 'AKIA[0-9A-Z]{16}' },
    @{ n = 'Google API キー';     p = 'AIza[0-9A-Za-z\-_]{35}' },
    @{ n = '秘密鍵';              p = '-----BEGIN [A-Z ]*PRIVATE KEY-----' },
    @{ n = 'sk- トークン';        p = '\bsk-[A-Za-z0-9_\-]{20,}' }
)
$softPattern = '(?i)(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["''][^"'']{12,}["'']'

$secretHits = @()
$secretWarn = @()
foreach ($line in $added) {
    foreach ($hp in $hardPatterns) {
        if ($line -match $hp.p) { $secretHits += "$($hp.n): $($line.Substring(0, [Math]::Min(80, $line.Length)))" }
    }
    if ($line -match $softPattern) { $secretWarn += $line.Substring(0, [Math]::Min(80, $line.Length)) }
}
if ($changed -contains '.env') { $secretHits += '.env が変更されています' }

if ($secretHits.Count -gt 0) { Add-Check 'secrets' 'fail' ($secretHits | Select-Object -Unique) }
elseif ($secretWarn.Count -gt 0) { Add-Check 'secrets' 'warn' ($secretWarn | Select-Object -Unique) }
else { Add-Check 'secrets' 'pass' @('検出なし') }

# ---------- 結果出力 ----------
$failed  = @($checks | Where-Object { $_.status -eq 'fail' })
$verdict = if ($failed.Count -gt 0) { 'FAIL' } else { 'PASS' }

$result = [pscustomobject]@{
    taskId       = $TaskId
    baseRef      = $BaseRef
    verdict      = $verdict
    changedFiles = $changed
    changedLines = $lines
    checks       = $checks
}
$jsonPath = Join-Path $RunDir 'gate.json'
$result | ConvertTo-Json -Depth 6 | Out-File -FilePath $jsonPath -Encoding utf8

Write-Host "=== GATE $TaskId : $verdict ==="
foreach ($c in $checks) {
    Write-Host ("[{0}] {1}" -f $c.status.ToUpper(), $c.name)
    if ($c.status -ne 'pass') { foreach ($d in $c.details) { Write-Host "    - $d" } }
}
Write-Host "結果: $jsonPath"

if ($verdict -eq 'FAIL') { exit 1 } else { exit 0 }
