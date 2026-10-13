# Scoop Bucket Setup

This document describes the Scoop bucket setup for the `involvex/scoop-ymc` repository.

## Current Status ✅

The bucket repository has been **created and initialized** at `https://github.com/involvex/scoop-ymc` and is also available as a **Git submodule** at `scoop-bucket/` in this repository.

### Bucket Structure

```
involvex/scoop-ymc/
├── bucket/
│   └── youtube-music-cli.json   # Placeholder manifest (will be overwritten by workflow on release)
└── README.md                    # Bucket description
```

### Submodule Usage

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/involvex/youtube-music-cli.git

# Or initialize submodule after clone
git submodule update --init scoop-bucket
```

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

Once the first release publishes a manifest:

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

| Issue                                               | Resolution                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `actions/checkout@v7` fails on `involvex/scoop-ymc` | Bucket repo doesn't exist - ensure it's created at https://github.com/involvex/scoop-ymc         |
| `git push` fails with permission denied             | `GH_PAT` secret missing or lacks `repo` scope                                                    |
| "No matching assets found"                          | Release assets don't match expected names (`youtube-music-cli-windows-x64.exe`, `ymc-win32.exe`) |
| Hash mismatch                                       | Assets were rebuilt after release - delete and re-create release                                 |

## Files Involved

| File                                               | Purpose                             |
| -------------------------------------------------- | ----------------------------------- |
| `.github/workflows/scoop-publish.yml`              | GitHub Actions workflow             |
| `scripts/generate-scoop-manifest.ps1`              | Manifest generation script (Task 1) |
| `scoop/youtube-music-cli.json`                     | Manifest template (Task 1)          |
| `involvex/scoop-ymc/bucket/youtube-music-cli.json` | Published manifest (bucket repo)    |
| `scoop-bucket/`                                    | Git submodule mirror of bucket repo |

## Verification Checklist

After adding `GH_PAT` secret, verify by creating a draft release:

1. Create draft release `v0.3.2-test` with both Windows binaries attached
2. Trigger workflow manually: `gh workflow run scoop-publish.yml -f tag=v0.3.2-test`
3. Check `involvex/scoop-ymc` repo - manifest should be updated with correct version/hashes
4. Test install: `scoop bucket add ymc https://github.com/involvex/scoop-ymc && scoop install youtube-music-cli`
