# CRXJS Release Process Documentation

This document outlines the release process for the CRXJS project, which uses Changesets for version management in a pnpm monorepo structure.

## Repository Structure

CRXJS is a monorepo managed with pnpm workspaces, containing multiple packages:
- `@crxjs/vite-plugin` - The Vite plugin for Chrome Extension development
- `rollup-plugin-chrome-extension` - The Rollup plugin for Chrome Extension development
- `vite-plugin-docs` - Documentation for the Vite plugin

## Change Management with Changesets

### For Contributors

1. **Creating a Changeset**: 
   - After making changes, run `pnpm changeset` in the repository root
   - Select the packages that were modified
   - Choose the appropriate semver bump (patch, minor, major)
   - Write a description of the changes
   - This creates a new markdown file in the `.changeset` directory

2. **Changeset Bot in PRs**:
   - The Changeset bot automatically checks if PRs include a changeset
   - If no changeset is detected, it will comment on the PR requesting one

### For Maintainers

1. **Creating Changesets from PR Comments**:
   - If a contributor has not added a changeset, maintainers can do so directly from the Changeset bot comment in the PR
   - Click the option in the bot's comment to create a changeset without leaving GitHub

2. **Reviewing Changesets**:
   - Verify that the changeset properly reflects the changes in the PR
   - Check that the semver bump is appropriate for the changes

## Release Process via GitHub Changeset PRs

1. **Automatic Release PR Creation**:
   - When changes are merged to `main`, the GitHub Action (`release.yml`) runs
   - The Changesets Action analyzes the changesets and creates a "Version Packages" PR
   - This PR includes all version bumps and changelog updates

2. **Reviewing the Release PR**:
   - Review the version bumps in `package.json` files
   - Review the generated CHANGELOG updates
   - Make any necessary adjustments before merging

3. **Publishing the Release**:
   - When the "Version Packages" PR is merged to `main`, the GitHub Action runs again
   - This time it:
     - Builds all plugin packages (`pnpm --filter "*plugin*" build`)
     - Publishes the changes to npm (`changeset publish`)
     - Creates GitHub releases
     - Sends a Discord notification via webhook

4. **Post-Release Verification**:
   - Verify the packages are published correctly on npm
   - Check that GitHub releases are created
   - Confirm the Discord notification was sent

## Current Prerelease State and Normalization

### Current State

The repository is currently in a prerelease state, as indicated by the presence of a `.changeset/pre.json` file. This file shows:

```json
{
  "mode": "pre",
  "tag": "beta",
  "initialVersions": {
    "rollup-plugin-chrome-extension": "3.6.10",
    "@crxjs/vite-plugin": "1.0.14",
    "vite-plugin-docs": "0.0.2"
  },
  "changesets": [
    // List of changesets in prerelease mode
  ]
}
```

This means:
- All releases are currently tagged with `-beta` suffix
- Changes are accumulated for a beta release
- Multiple changesets are being bundled together

### Normalizing the Repository

To return to a normal release state:

1. **Exit Prerelease Mode**:
   ```bash
   pnpm changeset pre exit
   ```

2. **Create a Final Release PR**:
   - After exiting prerelease mode, create a PR to update version files:
   ```bash
   git checkout -b exit-beta-mode
   git add .
   git commit -m "Exit beta prerelease mode"
   git push -u origin exit-beta-mode
   ```

3. **Merge the Exit PR**:
   - Once merged to `main`, the GitHub Action will create a "Version Packages" PR
   - This PR will contain the final version changes without beta tags

4. **Release the Stable Version**:
   - Merge the "Version Packages" PR to trigger the release process
   - This will publish the stable versions to npm

## Managing Future Releases

### Standard Releases

For standard releases, follow the normal release process:
1. Accumulate changesets on `main`
2. Let the GitHub Action create the "Version Packages" PR
3. Review and merge that PR to publish

## Important Notes

1. **Project Status**: CRXJS is currently seeking new maintainers. If no maintenance team is established by March 31, 2025, the repository will be archived by June 1, 2025.

2. **Release Automation**: All releases should be handled through the GitHub Changeset Action and PR process, not manually from local machines.

3. **Documentation Updates**: When releasing new versions, ensure the documentation site is updated to reflect the changes.

4. **Discord Notifications**: The release workflow automatically sends notifications to Discord for successful releases. Ensure the webhook URL is configured correctly.