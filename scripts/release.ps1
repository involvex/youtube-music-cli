# scripts/release.ps1
param(
	[ValidateSet('patch', 'minor', 'major')]
	[string]$Bump = 'patch',
	[switch]$Yes
)

$ErrorActionPreference = 'Stop'

Write-Host "youtube-music-cli release ($Bump bump)..."

# 1. Ensure clean git working directory
Write-Host "Checking for uncommitted changes..."
$gitStatus = git status --porcelain
if ($gitStatus) {
	Write-Host "Error: Uncommitted changes detected. Please commit or stash them before running the release script."
	exit 1
}

# 2. Bump version, create commit and tag
Write-Host "Bumping version ($Bump)..."
$newVersionOutput = bun pm version $Bump
$NEW_VERSION = ($newVersionOutput | Select-Object -Last 1).Trim()
Write-Host "Version bumped to $NEW_VERSION"

# 2a. Update msix-config.json version to match (Windows 4-part format X.Y.Z.0)
Write-Host "Updating msix-config.json version..."
$semver = $NEW_VERSION.TrimStart('v')
$msixVersion = "$semver.0"
$msixConfig = Get-Content -Raw msix-config.json | ConvertFrom-Json
$msixConfig.version = $msixVersion
$msixJson = $msixConfig | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path msix-config.json), ($msixJson + "`n"))
Write-Host "msix-config.json updated to $msixVersion"

# 3. Generate CHANGELOG.md
Write-Host "Generating CHANGELOG.md..."
bun run changelog

# 3a. If a hand-written milestone notes file exists, remind / prepend pointer
$notesPath = "docs/releases/v$semver.md"
if (Test-Path $notesPath) {
	Write-Host "Milestone notes found at $notesPath (used by GitHub Actions for release body)."
}

# 4. Format / build for consistency (prebuild runs format + lint + typecheck)
Write-Host "Running build to ensure consistency..."
bun run build

# 5. Stage all changes since the version bump commit
Write-Host "Staging changelog, msix-config, and formatting updates..."
git add .

# 6. Amend the version bump commit to include those changes
Write-Host "Amending version commit..."
git commit --amend --no-edit

# 7. Force update the tag to the amended commit
Write-Host "Updating Git tag $NEW_VERSION..."
git tag -f $NEW_VERSION HEAD

# 8. Final build (dist is gitignored)
Write-Host "Running final project build..."
bun run build

Write-Host ""
Write-Host "Release prepared for $NEW_VERSION."

$isMilestone = $Bump -eq 'minor' -or $Bump -eq 'major'
if ($isMilestone) {
	Write-Host ""
	Write-Host "=== Milestone checklist ($NEW_VERSION) ==="
	Write-Host "[ ] CHANGELOG / docs/releases notes look good"
	Write-Host "[ ] README What's new updated"
	Write-Host "[ ] Smoke: bun run start -- --web-only (or --version)"
	Write-Host "[ ] Confirm tag $NEW_VERSION"
	Write-Host "========================================="
	Write-Host ""

	if (-not $Yes) {
		$answer = Read-Host "Push commit + tags to origin now? [y/N]"
		if ($answer -notmatch '^[Yy]') {
			Write-Host "Skipped push. When ready:"
			Write-Host "  git push && git push --tags"
			exit 0
		}
	}
}

Write-Host "Pushing: git push && git push --tags"
git push
git push --tags
Write-Host "Scoop bucket update triggered via release workflow."
Write-Host "Check https://github.com/involvex/scoop-ymc for manifest update."
Write-Host "Done. npm/GitHub publish should follow from the v* tag workflow."
