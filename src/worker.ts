import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

const PLUGIN_NAME = "paperclip-plugin-navigator";

/**
 * Strips the `/paperclip` prefix from an absolute workspace path and appends
 * it to the operator-supplied filebrowser base URL.
 *
 * Example:
 *   fileBrowserBaseUrl = "https://files.example.com/files"
 *   workspacePath      = "/paperclip/instances/default/projects/uuid/wid/name"
 *   result             = "https://files.example.com/files/instances/default/projects/uuid/wid/name"
 */
export function buildFileBrowserUrl(
  fileBrowserBaseUrl: string,
  workspacePath: string,
): string {
  // Strip the leading /paperclip segment because the filebrowser mounts at that root.
  const relative = workspacePath.replace(/^\/paperclip/, "");
  // Remove any trailing slash from the base URL to avoid double slashes.
  const base = fileBrowserBaseUrl.replace(/\/$/, "");
  return `${base}${relative}`;
}

export interface ProjectEntry {
  id: string;
  name: string;
  path: string | null;
  fileBrowserUrl: string | null;
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info(`${PLUGIN_NAME} plugin setup`);

    /**
     * "projects" data handler — called by the UI via usePluginData("projects").
     *
     * Returns an array of ProjectEntry objects enriched with the filebrowser URL
     * for the primary workspace of each project.
     *
     * Robustness features:
     *  - Controlled Concurrency: Fetches workspaces in batches to avoid SDK/DB pressure.
     *  - Pagination: Supports 'limit' and 'offset' parameters.
     *  - Graceful Fallbacks: Handles missing config, missing workspaces, and fetch errors per project.
     */
    ctx.data.register("projects", async (params?: Record<string, unknown>) => {
      const limit = typeof params?.limit === "number" ? params.limit : 50;
      const offset = typeof params?.offset === "number" ? params.offset : 0;
      const paramCompanyId = typeof params?.companyId === "string" ? params.companyId : null;

      // 1. Resolve the operator config — we need fileBrowserBaseUrl.
      const config = await ctx.config.get();
      const fileBrowserBaseUrl =
        typeof config?.fileBrowserBaseUrl === "string" &&
        config.fileBrowserBaseUrl.trim() !== ""
          ? config.fileBrowserBaseUrl.trim()
          : null;

      if (!fileBrowserBaseUrl) {
        ctx.logger.warn(
          `${PLUGIN_NAME}: fileBrowserBaseUrl is not configured — fileBrowserUrl will be null`,
        );
      }

      // 2. Get the companyId.
      let companyId = paramCompanyId;
      if (!companyId) {
        const companies = await ctx.companies.list({ limit: 1 });
        if (companies.length === 0) {
          ctx.logger.warn(`${PLUGIN_NAME}: no companies found, returning []`);
          return [] as ProjectEntry[];
        }
        companyId = companies[0].id;
      }

      // 3. List projects with pagination.
      const projects = await ctx.projects.list({ 
        companyId, 
        limit, 
        offset 
      });

      // 4. Process projects in batches to fetch primary workspaces.
      // This prevents thousands of simultaneous requests if projects list is large.
      const BATCH_SIZE = 5;
      const entries: ProjectEntry[] = [];

      for (let i = 0; i < projects.length; i += BATCH_SIZE) {
        const batch = projects.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (project): Promise<ProjectEntry> => {
            try {
              const workspace = await ctx.projects.getPrimaryWorkspace(
                project.id,
                companyId!,
              );

              if (!workspace) {
                return {
                  id: project.id,
                  name: project.name,
                  path: null,
                  fileBrowserUrl: null,
                };
              }

              const fileBrowserUrl =
                fileBrowserBaseUrl
                  ? buildFileBrowserUrl(fileBrowserBaseUrl, workspace.path)
                  : null;

              return {
                id: project.id,
                name: project.name,
                path: workspace.path,
                fileBrowserUrl,
              };
            } catch (err) {
              ctx.logger.error(
                `${PLUGIN_NAME}: failed to get workspace for project ${project.id}: ${String(err)}`,
              );
              return {
                id: project.id,
                name: project.name,
                path: null,
                fileBrowserUrl: null,
              };
            }
          }),
        );
        entries.push(...batchResults);
      }

      return entries;
    });

    /**
     * "project-files" data handler — called by NavigatorProjectSidebarItem.
     *
     * Accepts { projectId, companyId } and returns a single ProjectEntry
     * for the primary workspace of that project, or null if not found.
     */
    ctx.data.register("project-files", async (params?: Record<string, unknown>) => {
      const projectId = typeof params?.projectId === "string" ? params.projectId : null;
      const paramCompanyId = typeof params?.companyId === "string" ? params.companyId : null;

      if (!projectId) return null;

      const config = await ctx.config.get();
      const fileBrowserBaseUrl =
        typeof config?.fileBrowserBaseUrl === "string" &&
        config.fileBrowserBaseUrl.trim() !== ""
          ? config.fileBrowserBaseUrl.trim()
          : null;

      let companyId = paramCompanyId;
      if (!companyId) {
        const companies = await ctx.companies.list({ limit: 1 });
        if (companies.length === 0) return null;
        companyId = companies[0].id;
      }

      const [project, workspace] = await Promise.all([
        ctx.projects.get(projectId, companyId),
        ctx.projects.getPrimaryWorkspace(projectId, companyId),
      ]);

      if (!workspace) {
        return {
          id: projectId,
          name: project?.name ?? projectId,
          path: null,
          fileBrowserUrl: null,
        } satisfies ProjectEntry;
      }

      return {
        id: projectId,
        name: project?.name ?? projectId,
        path: workspace.path,
        fileBrowserUrl: fileBrowserBaseUrl
          ? buildFileBrowserUrl(fileBrowserBaseUrl, workspace.path)
          : null,
      } satisfies ProjectEntry;
    });
  },

  async onHealth() {
    return { status: "ok", message: `${PLUGIN_NAME} ready` };
  },
});

export default plugin;

runWorker(plugin, import.meta.url);
