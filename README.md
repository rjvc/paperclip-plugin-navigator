# paperclip-plugin-navigator

Project-aware file navigator for [Paperclip](https://github.com/paperclipai/paperclip). Browse your agent-created projects by real name and open them directly in an external filebrowser.

**GitHub:** [rjvc/paperclip-plugin-navigator](https://github.com/rjvc/paperclip-plugin-navigator)  
**npm:** [paperclip-plugin-navigator](https://www.npmjs.com/package/paperclip-plugin-navigator)

---

## What it does

- Adds a **Files** entry to the Paperclip sidebar with a collapsible list of all projects
- Adds a **Files** link under each project in the sidebar Projects list
- Each link opens the project's primary workspace directly in your external filebrowser (e.g. [filebrowser/filebrowser](https://github.com/filebrowser/filebrowser))
- No hardcoded paths or credentials — the filebrowser URL is configured per instance

## Installation

In your Paperclip instance settings, go to **Settings → Plugins** and install the package:

```text
paperclip-plugin-navigator
```

## Configuration

After installation, set the required field under **Settings → Plugins → File Navigator → Configuration**:

| Field                | Required | Description                                                                   |
| -------------------- | -------- | ----------------------------------------------------------------------------- |
| `fileBrowserBaseUrl` | Yes      | Base URL of your external filebrowser, e.g. `https://files.example.com/files` |

### URL construction

The plugin maps Paperclip workspace paths to filebrowser URLs by stripping the `/paperclip` mount prefix:

```text
workspace path:  /paperclip/instances/default/projects/{uuid}/{wid}/my-project
filebrowser URL: https://files.example.com/files/instances/default/projects/{uuid}/{wid}/my-project
```

This assumes your filebrowser serves the `/paperclip` Docker volume as its root. If you use the standard Paperclip Docker Compose setup, this works out of the box.

## UI slots

| Slot                        | Type                | Description                                    |
| --------------------------- | ------------------- | ---------------------------------------------- |
| `navigator-sidebar`         | `sidebar`           | Collapsible "Files" entry in the main sidebar  |
| `navigator-project-sidebar` | `projectSidebarItem`| "Files" link under each project row            |
| `navigator-page`            | `page`              | Full navigator page (reserved for future use)  |

## Required capabilities

```text
projects.read
project.workspaces.read
companies.read
ui.page.register
ui.sidebar.register
```

## Development

```bash
git clone https://github.com/rjvc/paperclip-plugin-navigator
cd paperclip-plugin-navigator

# install dependencies (requires Node 18+)
pnpm install

# run tests
pnpm test

# build
pnpm build
```

### Publishing

Releases are published automatically via GitHub Actions with **npm provenance attestation** — every published version is cryptographically linked to the exact commit and workflow run that produced it.

**To release a new version:**

```bash
pnpm release          # patch (0.1.x → 0.1.x+1)
pnpm release:minor    # minor (0.1.x → 0.2.0)
pnpm release:major    # major (0.x.x → 1.0.0)
```

The `scripts/release.mjs` script bumps the version in `package.json` and `src/manifest.ts`, commits, tags, and pushes. The `publish.yml` workflow then runs tests, builds, and publishes with `--provenance`.

> **Required secret:** `NPM_TOKEN` — create a Granular Access Token on [npmjs.com](https://www.npmjs.com) with "Bypass 2FA" enabled and add it to the GitHub repo under **Settings → Secrets → Actions**.

## License

MIT — Ricardo Castro
