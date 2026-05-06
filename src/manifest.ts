import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "paperclip-plugin-navigator";

const PLUGIN_VERSION = "0.1.9";

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
