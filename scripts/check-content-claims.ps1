$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$htmlFiles = Get-ChildItem -Path $repoRoot -Recurse -Filter '*.html' -File |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' }
$failures = [System.Collections.Generic.List[string]]::new()

$unsupportedPatterns = [ordered]@{
    'Early Access is live' = 'Do not claim the game is live before the official unlock.'
    'is live on Steam Early Access' = 'Do not claim the game is live before the official unlock.'
    'launch data updated' = 'Do not label launch data as updated without an evidence record.'
    'verified in-game daily' = 'Do not claim daily verification without a published verification log.'
    'verify (?:numbers|values) in-game daily' = 'Do not claim daily verification without a published verification log.'
    're-verify[^.]*live build' = 'Do not claim launch-build verification before evidence exists.'
    'launch-window estimate' = 'Do not publish guessed launch values as data.'
    're-verified for the Early Access build' = 'Do not claim Early Access verification before evidence exists.'
    'entered Early Access on July 30' = 'Use the official scheduled release wording until launch is confirmed.'
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

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Output "FAIL: $_" }
    exit 1
}

Write-Output "PASS: public content avoids unsupported launch and data-verification claims."
