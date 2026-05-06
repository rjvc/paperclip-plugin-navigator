import { describe, it, expect } from "vitest";
import manifest from "../src/manifest.js";

describe("manifest", () => {
  it("has required top-level fields", () => {
    expect(manifest.id).toBe("paperclip-plugin-navigator");
    expect(manifest.displayName).toBe("File Navigator");
    expect(typeof manifest.version).toBe("string");
    expect(manifest.version).toBeTruthy();
    expect(manifest.apiVersion).toBe(1);
  });

  it("has a description", () => {
    expect(typeof manifest.description).toBe("string");
    expect(manifest.description.length).toBeGreaterThan(0);
  });

  it("declares the required capabilities", () => {
    expect(manifest.capabilities).toContain("projects.read");
    expect(manifest.capabilities).toContain("project.workspaces.read");
    expect(manifest.capabilities).toContain("companies.read");
    expect(manifest.capabilities).toContain("ui.page.register");
    expect(manifest.capabilities).toContain("ui.sidebar.register");
  });

  it("has instanceConfigSchema with required fileBrowserBaseUrl", () => {
    const schema = manifest.instanceConfigSchema as Record<string, unknown>;
    expect(schema).toBeDefined();

    const properties = (
      schema.properties as Record<string, Record<string, unknown>>
    );
    expect(properties).toBeDefined();
    expect(properties.fileBrowserBaseUrl).toBeDefined();
    expect(properties.fileBrowserBaseUrl.type).toBe("string");

    const required = schema.required as string[];
    expect(required).toContain("fileBrowserBaseUrl");
  });

  it("has entrypoints for worker and ui", () => {
    expect(manifest.entrypoints).toBeDefined();
    expect(manifest.entrypoints?.worker).toBeTruthy();
    expect(manifest.entrypoints?.ui).toBeTruthy();
  });

  it("has a ui.slots array with at least three slots", () => {
    expect(manifest.ui).toBeDefined();
    expect(Array.isArray(manifest.ui?.slots)).toBe(true);
    expect((manifest.ui?.slots ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("has a sidebar slot for navigation", () => {
    const slots = manifest.ui?.slots ?? [];
    const sidebarSlot = slots.find((s) => s.id === "navigator-sidebar");
    expect(sidebarSlot).toBeDefined();
    expect(sidebarSlot?.type).toBe("sidebar");
    expect(sidebarSlot?.displayName).toBe("Files");
    expect(sidebarSlot?.exportName).toBe("NavigatorSidebarEntry");
  });

  it("has a page slot for the full navigator UI", () => {
    const slots = manifest.ui?.slots ?? [];
    const pageSlot = slots.find((s) => s.id === "navigator-page");
    expect(pageSlot).toBeDefined();
    expect(pageSlot?.type).toBe("page");
    expect(pageSlot?.displayName).toBe("Files");
    expect(pageSlot?.exportName).toBe("NavigatorPage");
  });

  it("has a projectSidebarItem slot with entityTypes: ['project']", () => {
    const slots = manifest.ui?.slots ?? [];
    const projectSlot = slots.find((s) => s.id === "navigator-project-sidebar");
    expect(projectSlot).toBeDefined();
    expect(projectSlot?.type).toBe("projectSidebarItem");
    expect(projectSlot?.entityTypes).toContain("project");
  });
});
