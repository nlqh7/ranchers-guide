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

foreach ($relativePath in @('index.html', 'guides/release-time-checklist.html')) {
    $fullPath = Join-Path $repoRoot $relativePath
    $content = Get-Content -Raw -LiteralPath $fullPath

    if ($content -notmatch '0\.8\.10\.455') {
        $failures.Add("${relativePath}: missing the current official launch hotfix version.")
    }

    if ($content -notmatch 'https://steamcommunity\.com/app/1501310') {
        $failures.Add("${relativePath}: missing a direct official Steam news source link.")
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "FAIL: $_" }
    exit 1
}

Write-Output "PASS: public content avoids unsupported launch and data-verification claims."
