import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFileBrowserUrl, isSafeUrl, isSafeId, type ProjectEntry } from "../src/worker.js";

// ---------------------------------------------------------------------------
// buildFileBrowserUrl unit tests
// ---------------------------------------------------------------------------

describe("buildFileBrowserUrl", () => {
  it("constructs URL correctly from standard path", () => {
    const result = buildFileBrowserUrl(
      "https://files.example.com/files",
      "/paperclip/instances/default/projects/uuid/wid/my-project",
    );
    expect(result).toBe(
      "https://files.example.com/files/instances/default/projects/uuid/wid/my-project",
    );
  });

  it("handles path without /paperclip prefix", () => {
    const result = buildFileBrowserUrl(
      "https://files.example.com/files",
      "/instances/default/projects/uuid/wid/other",
    );
    // No /paperclip to strip, path is used as-is.
    expect(result).toBe(
      "https://files.example.com/files/instances/default/projects/uuid/wid/other",
    );
  });

  it("strips trailing slash from baseUrl", () => {
    const result = buildFileBrowserUrl(
      "https://files.example.com/files/",
      "/paperclip/instances/default/projects/uuid/wid/name",
    );
    expect(result).toBe(
      "https://files.example.com/files/instances/default/projects/uuid/wid/name",
    );
  });

  it("handles base URL without path suffix", () => {
    const result = buildFileBrowserUrl(
      "https://files.example.com",
      "/paperclip/instances/default/projects/uuid/wid/name",
    );
    expect(result).toBe(
      "https://files.example.com/instances/default/projects/uuid/wid/name",
    );
  });

  it("strips only the first /paperclip occurrence", () => {
    // Path that contains /paperclip after the root /paperclip prefix.
    const result = buildFileBrowserUrl(
      "https://files.example.com/files",
      "/paperclip/paperclip-projects/uuid",
    );
    expect(result).toBe(
      "https://files.example.com/files/paperclip-projects/uuid",
    );
  });
});

// ---------------------------------------------------------------------------
// isSafeUrl
// ---------------------------------------------------------------------------

describe("isSafeUrl", () => {
  it("accepts https URLs", () => {
    expect(isSafeUrl("https://files.example.com/files")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isSafeUrl("http://files.local/files")).toBe(true);
  });

  it("rejects javascript: protocol", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: protocol", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects file: protocol", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isSafeUrl("")).toBe(false);
  });

  it("rejects non-URL strings", () => {
    expect(isSafeUrl("not-a-url")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSafeId
// ---------------------------------------------------------------------------

describe("isSafeId", () => {
  it("accepts UUIDs", () => {
    expect(isSafeId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("accepts short alphanumeric IDs", () => {
    expect(isSafeId("proj-1")).toBe(true);
  });

  it("rejects empty string", () => {
    expect(isSafeId("")).toBe(false);
  });

  it("rejects strings with path traversal", () => {
    expect(isSafeId("../etc/passwd")).toBe(false);
  });

  it("rejects strings with semicolons", () => {
    expect(isSafeId("id;rm -rf /")).toBe(false);
  });

  it("rejects strings longer than 128 chars", () => {
    expect(isSafeId("a".repeat(129))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Worker data handler integration-style tests (SDK mocked)
// ---------------------------------------------------------------------------

// We test the handler logic by re-creating a minimal context mock and
// invoking definePlugin's setup, then calling the registered handler directly.

type DataHandler = (params?: unknown) => Promise<unknown>;

interface MockCtx {
  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
  };
  config: { get: ReturnType<typeof vi.fn> };
  companies: { list: ReturnType<typeof vi.fn> };
  projects: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    getPrimaryWorkspace: ReturnType<typeof vi.fn>;
  };
  data: {
    register: ReturnType<typeof vi.fn>;
    _handlers: Map<string, DataHandler>;
  };
}

function makeMockCtx(): MockCtx {
  const handlers = new Map<string, DataHandler>();

  return {
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    config: { get: vi.fn() },
    companies: { list: vi.fn() },
    projects: {
      list: vi.fn(),
      get: vi.fn(),
      getPrimaryWorkspace: vi.fn(),
    },
    data: {
      register: vi.fn((key: string, handler: DataHandler) => {
        handlers.set(key, handler);
      }),
      _handlers: handlers,
    },
  };
}

// We need to call plugin.setup(ctx) to register handlers.
// Import the plugin definition (not runWorker) by importing the worker module
// and calling setup manually.

vi.mock("@paperclipai/plugin-sdk", async () => {
  // Minimal mock: definePlugin just returns the definition unchanged,
  // runWorker is a no-op.
  return {
    definePlugin: (def: {
      setup: (ctx: unknown) => Promise<void>;
      onHealth: () => Promise<unknown>;
    }) => def,
    runWorker: vi.fn(),
  };
});

describe("worker projects data handler", () => {
  let ctx: MockCtx;

  beforeEach(async () => {
    ctx = makeMockCtx();

    // Reset module registry so each test gets a fresh worker module bound to
    // the current ctx mock. Without this, Vitest caches the module after the
    // first import and all tests share the same registered handlers.
    vi.resetModules();

    // Import worker and invoke setup — dynamic import after resetModules ensures
    // the vi.mock above is applied and a fresh module instance is used.
    const workerModule = await import("../src/worker.js");
    const plugin = workerModule.default as {
      setup: (ctx: unknown) => Promise<void>;
    };

    await plugin.setup(ctx);
  });

  it("registers a 'projects' data handler", () => {
    expect(ctx.data._handlers.has("projects")).toBe(true);
  });

  it("returns [] when no companies are found", async () => {
    ctx.config.get.mockResolvedValue({ fileBrowserBaseUrl: "https://files.example.com/files" });
    ctx.companies.list.mockResolvedValue([]);

    const handler = ctx.data._handlers.get("projects")!;
    const result = await handler();

    expect(result).toEqual([]);
  });

  it("returns projects with fileBrowserUrl when all data is present", async () => {
    ctx.config.get.mockResolvedValue({
      fileBrowserBaseUrl: "https://files.example.com/files",
    });
    ctx.companies.list.mockResolvedValue([{ id: "company-1", name: "ACME" }]);
    ctx.projects.list.mockResolvedValue([
      { id: "proj-1", name: "Alpha" },
      { id: "proj-2", name: "Beta" },
    ]);
    ctx.projects.getPrimaryWorkspace
      .mockResolvedValueOnce({
        id: "ws-1",
        projectId: "proj-1",
        name: "alpha-ws",
        path: "/paperclip/instances/default/projects/proj-1/ws-1/alpha",
        isPrimary: true,
      })
      .mockResolvedValueOnce({
        id: "ws-2",
        projectId: "proj-2",
        name: "beta-ws",
        path: "/paperclip/instances/default/projects/proj-2/ws-2/beta",
        isPrimary: true,
      });

    const handler = ctx.data._handlers.get("projects")!;
    const result = (await handler()) as ProjectEntry[];

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      id: "proj-1",
      name: "Alpha",
      path: "/paperclip/instances/default/projects/proj-1/ws-1/alpha",
      fileBrowserUrl:
        "https://files.example.com/files/instances/default/projects/proj-1/ws-1/alpha",
    });

    expect(result[1]).toEqual({
      id: "proj-2",
      name: "Beta",
      path: "/paperclip/instances/default/projects/proj-2/ws-2/beta",
      fileBrowserUrl:
        "https://files.example.com/files/instances/default/projects/proj-2/ws-2/beta",
    });
  });

  it("returns fileBrowserUrl: null for projects without a primary workspace", async () => {
    ctx.config.get.mockResolvedValue({
      fileBrowserBaseUrl: "https://files.example.com/files",
    });
    ctx.companies.list.mockResolvedValue([{ id: "company-1", name: "ACME" }]);
    ctx.projects.list.mockResolvedValue([{ id: "proj-1", name: "Alpha" }]);
    ctx.projects.getPrimaryWorkspace.mockResolvedValue(null);

    const handler = ctx.data._handlers.get("projects")!;
    const result = (await handler()) as ProjectEntry[];

    expect(result).toHaveLength(1);
    expect(result[0].fileBrowserUrl).toBeNull();
    expect(result[0].path).toBeNull();
  });

  it("returns fileBrowserUrl: null when fileBrowserBaseUrl config is missing", async () => {
    ctx.config.get.mockResolvedValue({});
    ctx.companies.list.mockResolvedValue([{ id: "company-1", name: "ACME" }]);
    ctx.projects.list.mockResolvedValue([{ id: "proj-1", name: "Alpha" }]);
    ctx.projects.getPrimaryWorkspace.mockResolvedValue({
      id: "ws-1",
      projectId: "proj-1",
      name: "ws",
      path: "/paperclip/instances/default/projects/proj-1/ws-1/alpha",
      isPrimary: true,
    });

    const handler = ctx.data._handlers.get("projects")!;
    const result = (await handler()) as ProjectEntry[];

    expect(result).toHaveLength(1);
    expect(result[0].fileBrowserUrl).toBeNull();
    // path should still be set
    expect(result[0].path).toBe(
      "/paperclip/instances/default/projects/proj-1/ws-1/alpha",
    );
  });

  it("returns fileBrowserUrl: null when fileBrowserBaseUrl is empty string", async () => {
    ctx.config.get.mockResolvedValue({ fileBrowserBaseUrl: "   " });
    ctx.companies.list.mockResolvedValue([{ id: "company-1", name: "ACME" }]);
    ctx.projects.list.mockResolvedValue([{ id: "proj-1", name: "Alpha" }]);
    ctx.projects.getPrimaryWorkspace.mockResolvedValue({
      id: "ws-1",
      projectId: "proj-1",
      name: "ws",
      path: "/paperclip/instances/default/projects/proj-1/ws-1/alpha",
      isPrimary: true,
    });

    const handler = ctx.data._handlers.get("projects")!;
    const result = (await handler()) as ProjectEntry[];

    expect(result[0].fileBrowserUrl).toBeNull();
  });

  it("gracefully handles workspace fetch errors per project", async () => {
    ctx.config.get.mockResolvedValue({
      fileBrowserBaseUrl: "https://files.example.com/files",
    });
    ctx.companies.list.mockResolvedValue([{ id: "company-1", name: "ACME" }]);
    ctx.projects.list.mockResolvedValue([
      { id: "proj-1", name: "Good" },
      { id: "proj-2", name: "Bad" },
    ]);
    ctx.projects.getPrimaryWorkspace
      .mockResolvedValueOnce({
        id: "ws-1",
        projectId: "proj-1",
        name: "good-ws",
        path: "/paperclip/instances/default/projects/proj-1/ws-1/good",
        isPrimary: true,
      })
      .mockRejectedValueOnce(new Error("workspace fetch failed"));

    const handler = ctx.data._handlers.get("projects")!;
    const result = (await handler()) as ProjectEntry[];

    expect(result).toHaveLength(2);
    // First project succeeds
    expect(result[0].fileBrowserUrl).toBeTruthy();
    // Second project fails gracefully
    expect(result[1].fileBrowserUrl).toBeNull();
    expect(result[1].path).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// "project-files" single-project handler tests
// ---------------------------------------------------------------------------

describe("worker project-files data handler", () => {
  let ctx: MockCtx;

  beforeEach(async () => {
    ctx = makeMockCtx();
    vi.resetModules();
    const workerModule = await import("../src/worker.js");
    const plugin = workerModule.default as {
      setup: (ctx: unknown) => Promise<void>;
    };
    await plugin.setup(ctx);
  });

  it("registers a 'project-files' data handler", () => {
    expect(ctx.data._handlers.has("project-files")).toBe(true);
  });

  it("returns null when projectId param is missing", async () => {
    const handler = ctx.data._handlers.get("project-files")!;
    const result = await handler({});
    expect(result).toBeNull();
  });

  it("returns entry with fileBrowserUrl when workspace exists", async () => {
    ctx.config.get.mockResolvedValue({ fileBrowserBaseUrl: "https://files.example.com/files" });
    ctx.companies.list.mockResolvedValue([{ id: "company-1", name: "ACME" }]);
    ctx.projects.get.mockResolvedValue({ id: "proj-1", name: "Alpha" });
    ctx.projects.getPrimaryWorkspace.mockResolvedValue({
      id: "ws-1",
      projectId: "proj-1",
      name: "alpha-ws",
      path: "/paperclip/instances/default/projects/proj-1/ws-1/alpha",
      isPrimary: true,
    });

    const handler = ctx.data._handlers.get("project-files")!;
    const result = (await handler({ projectId: "proj-1", companyId: "company-1" })) as ProjectEntry;

    expect(result.id).toBe("proj-1");
    expect(result.name).toBe("Alpha");
    expect(result.fileBrowserUrl).toBe(
      "https://files.example.com/files/instances/default/projects/proj-1/ws-1/alpha",
    );
  });

  it("returns fileBrowserUrl: null when workspace is missing", async () => {
    ctx.config.get.mockResolvedValue({ fileBrowserBaseUrl: "https://files.example.com/files" });
    ctx.companies.list.mockResolvedValue([{ id: "company-1", name: "ACME" }]);
    ctx.projects.get.mockResolvedValue({ id: "proj-1", name: "Alpha" });
    ctx.projects.getPrimaryWorkspace.mockResolvedValue(null);

    const handler = ctx.data._handlers.get("project-files")!;
    const result = (await handler({ projectId: "proj-1", companyId: "company-1" })) as ProjectEntry;

    expect(result.fileBrowserUrl).toBeNull();
    expect(result.path).toBeNull();
  });

  it("returns null when no companies found and companyId not supplied", async () => {
    ctx.config.get.mockResolvedValue({ fileBrowserBaseUrl: "https://files.example.com/files" });
    ctx.companies.list.mockResolvedValue([]);

    const handler = ctx.data._handlers.get("project-files")!;
    const result = await handler({ projectId: "proj-1" });

    expect(result).toBeNull();
  });
});
