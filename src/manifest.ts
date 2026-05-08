import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "paperclip-plugin-navigator";

const PLUGIN_VERSION = "0.2.1";

const NAV_PAGE_SLOT_ID = "navigator-page";
const NAV_SIDEBAR_SLOT_ID = "navigator-sidebar";
const NAV_PROJECT_SLOT_ID = "navigator-project-sidebar";
const NAV_EXPORT_NAME = "NavigatorPage";
const NAV_SIDEBAR_EXPORT_NAME = "NavigatorSidebarEntry";
const NAV_PROJECT_EXPORT_NAME = "NavigatorProjectSidebarItem";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "File Navigator",
  description:
    "Browse projects with real names and open them directly in your external filebrowser.",
  author: "paperclip-plugin-navigator",
  categories: ["workspace", "ui"],
  capabilities: [
    "projects.read",
    "project.workspaces.read",
    "companies.read",
    "ui.page.register",
    "ui.sidebar.register",
    "http.outbound",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      fileBrowserBaseUrl: {
        type: "string",
        title: "File Browser Base URL",
        description:
          "Base URL of your external filebrowser (e.g. https://files.example.com/files)",
      },
      fileBrowserUser: {
        type: "string",
        title: "File Browser Username",
        description:
          "Username for filebrowser API authentication. Required for the native file browser.",
      },
      fileBrowserPassword: {
        type: "string",
        title: "File Browser Password",
        format: "password",
        description:
          "Password for filebrowser API authentication. Required for the native file browser.",
      },
      enableModalBrowser: {
        type: "boolean",
        title: "Enable Modal Browser (Beta)",
        description:
          "When enabled, clicking Files opens an inline file browser modal instead of navigating to the external filebrowser. Beta feature — disabled by default.",
        default: false,
      },
    },
    required: ["fileBrowserBaseUrl"],
  },
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "sidebar",
        id: NAV_SIDEBAR_SLOT_ID,
        displayName: "Files",
        exportName: NAV_SIDEBAR_EXPORT_NAME,
      },
      {
        type: "page",
        id: NAV_PAGE_SLOT_ID,
        displayName: "Files",
        exportName: NAV_EXPORT_NAME,
      },
      {
        type: "projectSidebarItem",
        id: NAV_PROJECT_SLOT_ID,
        displayName: "Files",
        exportName: NAV_PROJECT_EXPORT_NAME,
        entityTypes: ["project"],
      },
    ],
  },
};

export default manifest;
