# scripts/generate-scoop-manifest.ps1
param(
    [Parameter(Mandatory=$true)][string]$Tag,
    [Parameter(Mandatory=$true)][string]$CliAssetUrl,
    [Parameter(Mandatory=$true)][string]$CliAssetHash,
    [Parameter(Mandatory=$true)][string]$ImmersiveAssetUrl,
    [Parameter(Mandatory=$true)][string]$ImmersiveAssetHash,
    [Parameter(Mandatory=$true)][string]$OutputPath
)

$version = $Tag.TrimStart('v')
$template = Get-Content -Raw scoop/youtube-music-cli.json
$manifest = $template -replace '{{VERSION}}', $version `
                         -replace '{{TAG}}', $Tag `
                         -replace '{{HASH_CLI}}', $CliAssetHash `
                         -replace '{{HASH_IMMERSIVE}}', $ImmersiveAssetHash
$manifest | Set-Content -Path $OutputPath -Encoding UTF8
