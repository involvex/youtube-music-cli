$ErrorActionPreference = 'Stop'

$package = '@involvex/youtube-music-cli'

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
	Write-Host "Error: bun is required to install $package." -ForegroundColor Red
	Write-Host 'Install bun from https://bun.sh' -ForegroundColor Red
	exit 1
}

bun install -g $package

Write-Host 'youtube-music-cli installed. Run: youtube-music-cli'
