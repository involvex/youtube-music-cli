# Scoop Bucket Setup - Manual Steps

This document describes the one-time manual setup required for the Scoop bucket publishing workflow (`.github/workflows/scoop-publish.yml`).

## Step 3: Create the `involvex/scoop-ymc` Bucket Repository

Create a new GitHub repository at `https://github.com/involvex/scoop-ymc` with the following structure:

```
involvex/scoop-ymc/
├── bucket/
│   └── youtube-music-cli.json   # Placeholder manifest (will be overwritten by workflow)
└── README.md                    # Optional: bucket description
```

**Placeholder manifest content** (`bucket/youtube-music-cli.json`):
```json
{
  "version": "0.0.0",
  "description": "Terminal YouTube Music player",
  "homepage": "https://github.com/involvex/youtube-music-cli",
  "license": "MIT",
  "architecture": {
    "64bit": {
      "url": [
        "https://github.com/involvex/youtube-music-cli/releases/download/v0.0.0/youtube-music-cli-windows-x64.exe",
        "https://github.com/involvex/youtube-music-cli/releases/download/v0.0.0/ymc-win32.exe"
      ],
      "hash": ["placeholder", "placeholder"],
      "bin": [
        ["youtube-music-cli-windows-x64.exe", "youtube-music-cli"],
        ["youtube-music-cli-windows-x64.exe", "ymc"],
        ["ymc-win32.exe", "ymc-win32"]
      ]
    }
  },
  "checkver": {
    "github": "https://github.com/involvex/youtube-music-cli"
  },
  "autoupdate": {
    "architecture": {
      "64bit": {
        "url": [
          "https://github.com/involvex/youtube-music-cli/releases/download/v{{version}}/youtube-music-cli-windows-x64.exe",
          "https://github.com/involvex/youtube-music-cli/releases/download/v{{version}}/ymc-win32.exe"
        ]
      }
    }
  }
}
```

**Repository settings:**
- Public repository (required for Scoop users to install from it)
- Initialize with README (optional)
- No license needed (bucket manifests are typically public domain)

## Step 4: Add `GH_PAT` Secret

Create a GitHub Personal Access Token (classic) with the following scopes:
- `repo` (full control of private repositories)
- `workflow` (if using workflow_dispatch from other repos)

Add this token as a **repository secret** in the **main repo** (`involvex/youtube-music-cli`):
- **Name**: `GH_PAT`
- **Value**: The PAT created above
- **Scope**: Repository secrets (not environment or organization)

The workflow uses this secret to authenticate when pushing to `involvex/scoop-ymc`.

## How Users Install via Scoop

Once the bucket repo is created and the first release publishes a manifest:

```powershell
scoop bucket add ymc https://github.com/involvex/scoop-ymc
scoop install youtube-music-cli
```

This installs both `youtube-music-cli` (and `ymc` alias) and `ymc-win32` commands.

## Workflow Triggers

The workflow runs automatically on:
1. **Release creation** (`release: types: [created]`) - primary trigger
2. **Manual dispatch** (`workflow_dispatch`) - for re-publishing or testing with a specific tag

### Manual Trigger Example

```bash
gh workflow run scoop-publish.yml -f tag=v0.3.2
```

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| `actions/checkout@v7` fails on `involvex/scoop-ymc` | Bucket repo doesn't exist - complete Step 3 |
| `git push` fails with permission denied | `GH_PAT` secret missing or lacks `repo` scope - complete Step 4 |
| "No matching assets found" | Release assets don't match expected names (`youtube-music-cli-windows-x64.exe`, `ymc-win32.exe`) |
| Hash mismatch | Assets were rebuilt after release - delete and re-create release |

## Files Involved

| File | Purpose |
|------|---------|
| `.github/workflows/scoop-publish.yml` | GitHub Actions workflow |
| `scripts/generate-scoop-manifest.ps1` | Manifest generation script (Task 1) |
| `scoop/youtube-music-cli.json` | Manifest template (Task 1) |
| `involvex/scoop-ymc/bucket/youtube-music-cli.json` | Published manifest (bucket repo) |

## Verification Checklist

After setup, verify by creating a draft release:
1. Create draft release `v0.3.2-test` with both Windows binaries attached
2. Trigger workflow manually: `gh workflow run scoop-publish.yml -f tag=v0.3.2-test`
3. Check `involvex/scoop-ymc` repo - manifest should be updated with correct version/hashes
4. Test install: `scoop bucket add ymc https://github.com/involvex/scoop-ymc && scoop install youtube-music-cli`