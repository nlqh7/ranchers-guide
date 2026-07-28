$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$htmlFiles = Get-ChildItem -Path $repoRoot -Recurse -Filter '*.html' -File |
    Where-Object { $_.FullName -notmatch '[\\/]\.git[\\/]' }
$failures = [System.Collections.Generic.List[string]]::new()

foreach ($file in $htmlFiles) {
    $content = Get-Content -Raw -LiteralPath $file.FullName
    $matches = [regex]::Matches(
        $content,
        '(?:href|src)=["'']([^"'']+)["'']',
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    foreach ($match in $matches) {
        $reference = $match.Groups[1].Value

        if ($reference -match '^(?:https?:|mailto:|tel:|data:|#)') {
            continue
        }

        $pathOnly = ($reference -split '[?#]', 2)[0]
        if ($pathOnly -match '\.html$') {
            $relativeFile = $file.FullName.Substring($repoRoot.Length).TrimStart('\', '/')
            $failures.Add("${relativeFile}: redirected internal URL '$reference'")
        }
    }
}

if ($failures.Count -gt 0) {
    $failures | ForEach-Object { Write-Error $_ }
    exit 1
}

Write-Output "PASS: $($htmlFiles.Count) HTML files contain no redirected .html internal URLs."
