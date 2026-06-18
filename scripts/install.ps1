$ErrorActionPreference = 'Stop'

$package = '@involvex/youtube-music-cli'

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
	Write-Error "bun is required to run $package. Install bun: https://bun.sh" -ErrorAction Continue
	exit 1
}

bun install -g $package

Write-Host 'youtube-music-cli installed. Run: youtube-music-cli'
