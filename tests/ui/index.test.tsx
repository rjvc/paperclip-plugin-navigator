import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

// ---------------------------------------------------------------------------
// Mock the SDK UI hooks
// ---------------------------------------------------------------------------

const { vi_mockUsePluginData } = vi.hoisted(() => ({
  vi_mockUsePluginData: vi.fn(),
}));

vi.mock("@paperclipai/plugin-sdk/ui", () => ({
  usePluginData: vi_mockUsePluginData,
}));

// ---------------------------------------------------------------------------
// Components under test
// ---------------------------------------------------------------------------

import { NavigatorPage, NavigatorSidebarEntry, NavigatorProjectSidebarItem } from "../../src/ui/index.js";

// ---------------------------------------------------------------------------
// Context helpers
// ---------------------------------------------------------------------------

function makeContext(overrides?: Partial<{ companyId: string | null; companyPrefix: string | null }>) {
  return {
    companyId: overrides?.companyId ?? "company-1",
    companyPrefix: overrides?.companyPrefix ?? null,
    projectId: null,
    entityId: null,
    entityType: null,
    userId: null,
  };
}

// ---------------------------------------------------------------------------
// NavigatorSidebarEntry
// ---------------------------------------------------------------------------

describe("NavigatorSidebarEntry", () => {
  beforeEach(() => {
    vi_mockUsePluginData.mockReset();
  });

  it("renders a 'Files' toggle button", () => {
    vi_mockUsePluginData.mockReturnValue({ data: [], loading: false, error: null });
    render(<NavigatorSidebarEntry context={makeContext()} />);
    expect(screen.getByRole("button", { name: /files/i })).toBeInTheDocument();
  });

  it("does not show projects before expanding", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [{ id: "1", name: "Alpha", path: "/p", fileBrowserUrl: "https://x.com" }],
      loading: false,
      error: null,
    });
    render(<NavigatorSidebarEntry context={makeContext()} />);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });

  it("shows projects after clicking the toggle", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [{ id: "1", name: "Alpha", path: "/p", fileBrowserUrl: "https://x.com" }],
      loading: false,
      error: null,
    });
    render(<NavigatorSidebarEntry context={makeContext()} />);
    fireEvent.click(screen.getByRole("button", { name: /files/i }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("shows 'Abrir →' links for projects with fileBrowserUrl", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [{ id: "1", name: "Alpha", path: "/p", fileBrowserUrl: "https://files.example.com/p" }],
      loading: false,
      error: null,
    });
    render(<NavigatorSidebarEntry context={makeContext()} />);
    fireEvent.click(screen.getByRole("button", { name: /files/i }));
    const btn = screen.getByRole("button", { name: /abrir alpha/i });
    expect(btn).toBeInTheDocument();
  });

  it("shows '—' for projects without fileBrowserUrl", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [{ id: "1", name: "Orphan", path: null, fileBrowserUrl: null }],
      loading: false,
      error: null,
    });
    render(<NavigatorSidebarEntry context={makeContext()} />);
    fireEvent.click(screen.getByRole("button", { name: /files/i }));
    expect(screen.getByText("Orphan")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("collapses back when toggled again", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [{ id: "1", name: "Alpha", path: "/p", fileBrowserUrl: "https://x.com" }],
      loading: false,
      error: null,
    });
    render(<NavigatorSidebarEntry context={makeContext()} />);
    const btn = screen.getByRole("button", { name: /files/i });
    fireEvent.click(btn);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// NavigatorPage
// ---------------------------------------------------------------------------

describe("NavigatorPage", () => {
  beforeEach(() => {
    vi_mockUsePluginData.mockReset();
  });

  it("renders loading state", () => {
    vi_mockUsePluginData.mockReturnValue({ data: null, loading: true, error: null, refresh: vi.fn() });

    render(<NavigatorPage context={makeContext()} />);

    expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
  });

  it("renders error state", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: null,
      loading: false,
      error: { message: "Network failure" },
      refresh: vi.fn()
    });

    render(<NavigatorPage context={makeContext()} />);

    expect(screen.getByText(/error loading projects: network failure/i)).toBeInTheDocument();
  });

  it("renders empty state when project list is empty", () => {
    vi_mockUsePluginData.mockReturnValue({ data: [], loading: false, error: null, refresh: vi.fn() });

    render(<NavigatorPage context={makeContext()} />);

    expect(screen.getByText(/no projects found/i)).toBeInTheDocument();
  });

  it("renders a list of projects", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [
        {
          id: "proj-1",
          name: "Alpha Project",
          path: "/paperclip/instances/default/projects/proj-1/ws-1/alpha",
          fileBrowserUrl: "https://files.example.com/files/instances/default/projects/proj-1/ws-1/alpha",
        },
        {
          id: "proj-2",
          name: "Beta Project",
          path: "/paperclip/instances/default/projects/proj-2/ws-2/beta",
          fileBrowserUrl: "https://files.example.com/files/instances/default/projects/proj-2/ws-2/beta",
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<NavigatorPage context={makeContext()} />);

    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Beta Project")).toBeInTheDocument();
  });

  it("filters projects based on search input", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [
        { id: "1", name: "Apple", path: "/path1", fileBrowserUrl: "url1" },
        { id: "2", name: "Banana", path: "/path2", fileBrowserUrl: "url2" },
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<NavigatorPage context={makeContext()} />);

    const searchInput = screen.getByPlaceholderText(/search projects/i);
    fireEvent.change(searchInput, { target: { value: "Apple" } });

    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.queryByText("Banana")).not.toBeInTheDocument();
  });

  it("renders configuration warning when URLs are missing but paths exist", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [
        { id: "1", name: "Project X", path: "/paperclip/path", fileBrowserUrl: null },
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<NavigatorPage context={makeContext()} />);

    expect(screen.getByText(/configuration needed/i)).toBeInTheDocument();
  });

  it("renders Open buttons with target=_blank for projects with fileBrowserUrl", () => {
    mockDataWithUrl();

    render(<NavigatorPage context={makeContext()} />);

    const link = screen.getByRole("link", { name: /open files/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders unavailable state for projects without fileBrowserUrl", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: [
        { id: "1", name: "Orphan", path: null, fileBrowserUrl: null },
      ],
      loading: false,
      error: null,
      refresh: vi.fn()
    });

    render(<NavigatorPage context={makeContext()} />);

    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open/i })).not.toBeInTheDocument();
  });

  it("calls refresh when the refresh button is clicked", () => {
    const refreshSpy = vi.fn();
    vi_mockUsePluginData.mockReturnValue({ data: [], loading: false, error: null, refresh: refreshSpy });

    render(<NavigatorPage context={makeContext()} />);

    const refreshButton = screen.getByTitle(/refresh list/i);
    fireEvent.click(refreshButton);

    expect(refreshSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// NavigatorProjectSidebarItem
// ---------------------------------------------------------------------------

function makeProjectContext(overrides?: Partial<{ companyId: string | null; entityId: string }>) {
  return {
    companyId: overrides?.companyId ?? "company-1",
    companyPrefix: null,
    projectId: null,
    entityId: overrides?.entityId ?? "proj-1",
    entityType: "project" as const,
    userId: null,
  };
}

describe("NavigatorProjectSidebarItem", () => {
  beforeEach(() => {
    vi_mockUsePluginData.mockReset();
  });

  it("renders nothing while loading", () => {
    vi_mockUsePluginData.mockReturnValue({ data: null, loading: true, error: null });
    const { container } = render(<NavigatorProjectSidebarItem context={makeProjectContext()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when fileBrowserUrl is null", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: { id: "proj-1", name: "Alpha", path: null, fileBrowserUrl: null },
      loading: false,
      error: null,
    });
    const { container } = render(<NavigatorProjectSidebarItem context={makeProjectContext()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a Files link when fileBrowserUrl is set", () => {
    vi_mockUsePluginData.mockReturnValue({
      data: { id: "proj-1", name: "Alpha", path: "/p", fileBrowserUrl: "https://files.example.com/p" },
      loading: false,
      error: null,
    });
    render(<NavigatorProjectSidebarItem context={makeProjectContext()} />);
    const link = screen.getByRole("link", { name: /abrir ficheiros de alpha/i });
    expect(link).toHaveAttribute("href", "https://files.example.com/p");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("calls usePluginData with the project entityId", () => {
    vi_mockUsePluginData.mockReturnValue({ data: null, loading: true, error: null });
    render(<NavigatorProjectSidebarItem context={makeProjectContext({ entityId: "proj-42" })} />);
    expect(vi_mockUsePluginData).toHaveBeenCalledWith(
      "project-files",
      expect.objectContaining({ projectId: "proj-42" }),
    );
  });
});

function mockDataWithUrl() {
  vi_mockUsePluginData.mockReturnValue({
    data: [
      {
        id: "proj-1",
        name: "Alpha Project",
        path: "/paperclip/path",
        fileBrowserUrl: "https://files.example.com/url",
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn()
  });
}
