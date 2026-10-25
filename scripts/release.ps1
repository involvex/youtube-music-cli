# scripts/release.ps1
param(
	[ValidateSet('patch', 'minor', 'major')]
	[string]$Bump = 'patch',
	[switch]$Yes
)

$ErrorActionPreference = 'Stop'

function Get-PackageJsonVersion {
	return (Get-Content -Raw package.json | ConvertFrom-Json).version
}

function Get-LatestVTagVersion {
	$tags = @(git tag -l 'v*' 2>$null)
	if (-not $tags) {
		return $null
	}

	$versions = foreach ($tag in $tags) {
		if ($tag -match '^v(\d+\.\d+\.\d+)$') {
			[version]$Matches[1]
		}
	}

	if (-not $versions) {
		return $null
	}

	return ($versions | Sort-Object -Descending | Select-Object -First 1).ToString()
}

Write-Host "youtube-music-cli release ($Bump bump)..."

# 1. Ensure clean git working directory
Write-Host 'Checking for uncommitted changes...'
$gitStatus = git status --porcelain
if ($gitStatus) {
	Write-Host 'Error: Uncommitted changes detected. Please commit or stash them before running the release script.'
	exit 1
}

# 1a. Sync package.json if it lags an existing v* tag (avoids re-tagging published versions)
$packageVersion = Get-PackageJsonVersion
$latestTagVersion = Get-LatestVTagVersion
if ($latestTagVersion -and ([version]$packageVersion -lt [version]$latestTagVersion)) {
	Write-Host ("package.json ({0}) is behind latest tag v{1} - syncing before bump..." -f $packageVersion, $latestTagVersion)
	bun pm version $latestTagVersion --no-git-tag-version | Out-Null
	git add package.json
	git commit -m ("chore: sync package.json to v{0}" -f $latestTagVersion)
	$packageVersion = Get-PackageJsonVersion
	Write-Host ("Synced package.json to {0}" -f $packageVersion)
}

# 2. Bump version, create commit and tag
Write-Host ("Bumping version ({0})..." -f $Bump)
$newVersionOutput = bun pm version $Bump
$NEW_VERSION = ($newVersionOutput | Select-Object -Last 1).Trim()
Write-Host ("Version bumped to {0}" -f $NEW_VERSION)

# 2a. Update msix-config.json version to match (Windows 4-part format X.Y.Z.0)
Write-Host 'Updating msix-config.json version...'
$semver = $NEW_VERSION.TrimStart('v')
$msixVersion = "$semver.0"
$msixConfig = Get-Content -Raw msix-config.json | ConvertFrom-Json
$msixConfig.version = $msixVersion
$msixJson = $msixConfig | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText((Resolve-Path msix-config.json), ($msixJson + "`n"))
Write-Host ("msix-config.json updated to {0}" -f $msixVersion)

# 2b. Hard gate: package.json version must equal the git tag semver
$packageAfterBump = Get-PackageJsonVersion
if ($packageAfterBump -ne $semver) {
	Write-Host ("Error: package.json version ({0}) does not match tag {1}." -f $packageAfterBump, $NEW_VERSION)
	Write-Host 'Fix package.json so it equals the release tag before publishing.'
	exit 1
}

# Refuse to publish a tag that already exists on origin (published release).
$remoteTag = git ls-remote --tags origin "refs/tags/$NEW_VERSION" 2>$null
if ($remoteTag) {
	Write-Host ("Error: tag {0} already exists on origin. Aborting to avoid overwriting a published release." -f $NEW_VERSION)
	Write-Host 'Sync package.json to the latest published version, then re-run so the bump produces a new tag.'
	exit 1
}

# 3. Generate CHANGELOG.md
Write-Host 'Generating CHANGELOG.md...'
bun run changelog

# 3a. If a hand-written milestone notes file exists, remind / prepend pointer
$notesPath = "docs/releases/v$semver.md"
if (Test-Path $notesPath) {
	Write-Host ("Milestone notes found at {0} (used by GitHub Actions for release body)." -f $notesPath)
}

# 4. Format / build for consistency (prebuild runs format + lint + typecheck)
Write-Host 'Running build to ensure consistency...'
bun run build

# 5. Stage all changes since the version bump commit
Write-Host 'Staging changelog, msix-config, and formatting updates...'
git add .

# 6. Amend the version bump commit to include those changes
Write-Host 'Amending version commit...'
git commit --amend --no-edit

# 7. Force update the tag to the amended commit
Write-Host ("Updating Git tag {0}..." -f $NEW_VERSION)
git tag -f $NEW_VERSION HEAD

# 8. Final build (dist is gitignored)
Write-Host 'Running final project build...'
bun run build

Write-Host ''
Write-Host ("Release prepared for {0}." -f $NEW_VERSION)

Write-Host ''
Write-Host ("=== Release checklist ({0}) ===" -f $NEW_VERSION)
Write-Host ('[x] package.json version equals git tag {0} ({1})' -f $NEW_VERSION, $semver)
Write-Host '[ ] CHANGELOG / docs/releases notes look good'
Write-Host '[ ] Smoke: bun run start -- --version (login -> search -> play if auth changed)'
Write-Host ('[ ] Confirm tag {0} is new (not overwriting a published release)' -f $NEW_VERSION)
$isMilestone = $Bump -eq 'minor' -or $Bump -eq 'major'
if ($isMilestone) {
	Write-Host '[ ] README What''s new updated'
}
Write-Host '======================================'
Write-Host ''

if ($isMilestone -and -not $Yes) {
	$answer = Read-Host 'Push commit + tags to origin now? [y/N]'
	if ($answer -notmatch '^[Yy]') {
		Write-Host 'Skipped push. When ready:'
		Write-Host '  git push && git push --tags'
		exit 0
	}
}

Write-Host 'Pushing: git push && git push --tags'
git push
git push --tags
Write-Host 'Scoop bucket update triggered via release workflow.'
Write-Host 'Check https://github.com/involvex/scoop-ymc for manifest update.'
Write-Host 'Done. npm/GitHub publish should follow from the v* tag workflow.'
