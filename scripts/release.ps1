# scripts/release.ps1
$ErrorActionPreference = 'Stop' # Exit immediately if a command exits with a non-zero status.

Write-Host "Optimizing new version submission flow (PowerShell compatible)..."

# 1. Ensure clean git working directory
Write-Host "Checking for uncommitted changes..."
$gitStatus = git status --porcelain
if ($gitStatus) {
  Write-Host "Error: Uncommitted changes detected. Please commit or stash them before running the release script."
  exit 1
}

# 2. Bump version, create commit and tag
Write-Host "Bumping version and creating tag..."
# `bun pm version patch` automatically updates package.json and bun.lockb, then creates a commit and a tag like vX.Y.Z
$newVersionOutput = bun pm version patch
$NEW_VERSION = ($newVersionOutput | Select-Object -Last 1).Trim() # Assumes the last line is the version, e.g., "v1.0.1"
Write-Host "Version bumped to $NEW_VERSION"

# 3. Generate CHANGELOG.md
Write-Host "Generating CHANGELOG.md..."
bun run changelog

# 4. Run format and lint:fix to ensure all files (including package.json and CHANGELOG.md) adhere to standards
# This step might modify package.json and CHANGELOG.md again if they were not perfectly formatted
Write-Host "Running Build to ensure consistency..."
bun run build # Reformats files, including package.json and CHANGELOG.md if needed
#bun run lint:fix # Fixes linting issues, could touch files again

# 5. Stage all changes that occurred since the last commit (which was the version bump)
# This includes CHANGELOG.md and any reformatting applied to package.json (or other files touched by format/lint)
Write-Host "Staging all remaining changes (CHANGELOG.md and formatting updates)..."
git add . # Use 'git add .' to stage all modifications

# 6. Amend the previous commit (the version bump commit) to include these new staged changes
# git commit --amend --no-edit keeps the existing commit message (e.g., "vX.Y.Z")
Write-Host "Amending previous commit to include CHANGELOG.md and formatting changes..."
git commit --amend --no-edit

# 7. Force update the tag to point to the amended commit (important!)
# `git commit --amend` creates a new commit SHA. We need to update the tag to point to this new SHA.
Write-Host "Updating Git tag $NEW_VERSION to new commit SHA..."
git tag -f $NEW_VERSION HEAD

# 8. Run the project build (dist/ is ignored, so it's not committed)
Write-Host "Running project build..."
bun run build

Write-Host "Release process complete for version $NEW_VERSION."
Write-Host "Now Running: git push && git push --tags"
git push && git push --tags
