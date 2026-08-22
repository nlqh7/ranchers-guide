$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$htmlFiles = Get-ChildItem -Path $repoRoot -Recurse -Filter '*.html' -File |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' }
$failures = [System.Collections.Generic.List[string]]::new()

$unsupportedPatterns = [ordered]@{
    'scheduled for Steam Early Access on July 30, 2026' = 'The game has launched; remove stale scheduled-release wording.'
    'when Early Access goes live' = 'The game has launched; remove pre-release wording.'
    'after the official unlock' = 'The game has launched; remove pre-release wording.'
    'until The Ranchers hits Steam Early Access' = 'The game has launched; remove the countdown copy.'
    'at Early Access launch' = 'The game has launched; replace the future-tense launch promise.'
    'pre-release planning guide' = 'The game has launched; describe the live Early Access baseline.'
    'launch-only values remain pending' = 'Use build-specific evidence wording after launch.'
    'id="countdown"' = 'The launch countdown must not return after release.'
    'launch data updated' = 'Do not label launch data as updated without an evidence record.'
    'verified in-game daily' = 'Do not claim daily verification without a published verification log.'
    'verify (?:numbers|values) in-game daily' = 'Do not claim daily verification without a published verification log.'
    're-verify[^.]*live build' = 'Do not claim launch-build verification before evidence exists.'
    'launch-window estimate' = 'Do not publish guessed launch values as data.'
    're-verified for the Early Access build' = 'Do not claim Early Access verification before evidence exists.'
    're-check(?:ed)? daily' = 'Do not promise a verification cadence that is not documented.'
    'corrections land the same day' = 'Do not promise same-day corrections without an operating record.'
    '<span class="tag pending">est\.</span>' = 'Do not publish invented numeric estimates in data tables.'
    '<span class="tag">unconfirmed</span>' = 'Do not list speculative entries as database records.'
}

foreach ($file in $htmlFiles) {
    $content = Get-Content -Raw -LiteralPath $file.FullName
    $relativeFile = $file.FullName.Substring($repoRoot.Length).TrimStart('\', '/')

    foreach ($pattern in $unsupportedPatterns.Keys) {
        if ($content -match $pattern) {
            $failures.Add("${relativeFile}: $($unsupportedPatterns[$pattern])")
        }
    }
}

foreach ($relativePath in @('database/crops.html', 'database/animals.html')) {
    $fullPath = Join-Path $repoRoot $relativePath
    $content = Get-Content -Raw -LiteralPath $fullPath

    if ($content -notmatch 'https://store\.steampowered\.com/app/1501310') {
        $failures.Add("${relativePath}: missing a direct official Steam source link.")
    }
}

$currentVersion = '0\.8\.10\.842'

foreach ($relativePath in @(
    'index.html',
    'guides/release-time-checklist.html',
    'guides/beginners-guide.html',
    'guides/money-making.html',
    'guides/animal-guide.html',
    'zh/guides/beginners-guide.html',
    'zh/guides/money-making.html',
    'zh/guides/animal-guide.html'
)) {
    $fullPath = Join-Path $repoRoot $relativePath
    $content = Get-Content -Raw -LiteralPath $fullPath

    if ($content -notmatch $currentVersion) {
        $failures.Add("${relativePath}: missing the current official build version 0.8.10.842.")
    }
}

foreach ($relativePath in @('index.html', 'guides/release-time-checklist.html')) {
    $fullPath = Join-Path $repoRoot $relativePath
    $content = Get-Content -Raw -LiteralPath $fullPath

    if ($content -notmatch 'https://steamcommunity\.com/app/1501310') {
        $failures.Add("${relativePath}: missing a direct official Steam news source link.")
    }
}

$beginner = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'guides/beginners-guide.html')
$beginnerZh = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'zh/guides/beginners-guide.html')
$money = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'guides/money-making.html')
$moneyZh = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'zh/guides/money-making.html')
$status = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'guides/release-time-checklist.html')

if ($beginner -notmatch 'id="first-30-minutes"' -or $beginnerZh -notmatch 'id="first-30-minutes"') {
    $failures.Add('Beginner guides need a bilingual first-30-minutes answer section.')
}
if ($money -notmatch 'id="evidence-now"' -or $moneyZh -notmatch 'id="evidence-now"') {
    $failures.Add('Money guides need a bilingual current-evidence summary.')
}
if ($money -match 'Fishing is the classic route') {
    $failures.Add('Money guides must not present fishing as the verified no-capital route without current-build evidence.')
}
if ($status -notmatch 'id="roadmap"' -or $status -notmatch 'Current roadmap') {
    $failures.Add('Early Access status page must answer current roadmap searches in an explicit section.')
}
if ($status -match '<strong>Update first\.</strong>') {
    $failures.Add('Steam normally auto-updates; do not make manual updating a normal first-session step.')
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "FAIL: $_" }
    exit 1
}

Write-Output "PASS: public content avoids unsupported launch and data-verification claims."
