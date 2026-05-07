import { useState, useMemo, useEffect, useCallback } from "react";
import type { PluginPageProps, PluginSidebarProps, PluginProjectSidebarItemProps } from "@paperclipai/plugin-sdk/ui";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";

function safeHref(url: string | null): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

interface ProjectEntry {
  id: string;
  name: string;
  path: string | null;
  fileBrowserUrl: string | null;
}

interface PluginConfig {
  enableModalBrowser: boolean;
}

const COLORS = {
  border: "#e5e7eb",
  bg: "#f9fafb",
  bgCard: "#ffffff",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  textMuted: "#9ca3af",
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  danger: "#ef4444",
  warningBg: "#fffbeb",
  warningBorder: "#fcd34d",
  warningText: "#92400e",
};

const styles = {
  container: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    padding: "32px",
    maxWidth: "1000px",
    margin: "0 auto",
    color: COLORS.textPrimary,
  },
  header: {
    marginBottom: "32px",
  },
  title: {
    fontSize: "24px",
    fontWeight: 600,
    letterSpacing: "-0.025em",
    margin: "0 0 8px 0",
  },
  description: {
    fontSize: "14px",
    color: COLORS.textSecondary,
    margin: 0,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
    gap: "16px",
  },
  searchWrapper: {
    position: "relative" as const,
    flex: 1,
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px 10px 36px",
    fontSize: "14px",
    borderRadius: "8px",
    border: `1px solid ${COLORS.border}`,
    outline: "none",
    transition: "border-color 0.2s",
  },
  searchIcon: {
    position: "absolute" as const,
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: COLORS.textMuted,
    pointerEvents: "none" as const,
  },
  configWarning: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    backgroundColor: COLORS.warningBg,
    border: `1px solid ${COLORS.warningBorder}`,
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "14px",
    color: COLORS.warningText,
  },
  tableCard: {
    backgroundColor: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 140px",
    padding: "12px 20px",
    backgroundColor: COLORS.bg,
    borderBottom: `1px solid ${COLORS.border}`,
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: COLORS.textSecondary,
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 140px",
    padding: "16px 20px",
    borderBottom: `1px solid ${COLORS.border}`,
    alignItems: "center",
    transition: "background-color 0.15s",
  },
  projectMain: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
    minWidth: 0,
  },
  projectName: {
    fontSize: "15px",
    fontWeight: 500,
    color: COLORS.textPrimary,
  },
  projectPath: {
    fontSize: "12px",
    color: COLORS.textMuted,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  actionCell: {
    display: "flex",
    justifyContent: "flex-end",
  },
  button: {
    padding: "8px 16px",
    borderRadius: "6px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
    border: "none",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    color: "#fff",
  },
  disabledButton: {
    backgroundColor: COLORS.bg,
    color: COLORS.textMuted,
    cursor: "not-allowed",
    border: `1px solid ${COLORS.border}`,
  },
  emptyState: {
    padding: "60px 20px",
    textAlign: "center" as const,
    color: COLORS.textSecondary,
  },
};

// ---------------------------------------------------------------------------
// FileBrowserModal — beta overlay
// ---------------------------------------------------------------------------

interface FileBrowserModalProps {
  project: { name: string; fileBrowserUrl: string };
  onClose: () => void;
}

function FileBrowserModal({ project, onClose }: FileBrowserModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`File browser — ${project.name}`}
      style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        aria-hidden="true"
      />

      {/* Panel */}
      <div style={{
        position: "relative",
        width: "min(1100px, 95vw)",
        height: "min(800px, 90vh)",
        backgroundColor: "#fff",
        borderRadius: "12px",
        boxShadow: "0 25px 60px rgba(0,0,0,0.35)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.bg,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={COLORS.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: "14px", fontWeight: 600, color: COLORS.textPrimary }}>{project.name}</span>
            <span style={{ fontSize: "11px", fontWeight: 500, padding: "2px 6px", borderRadius: "4px", backgroundColor: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>
              Beta
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href={project.fileBrowserUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: COLORS.primary, textDecoration: "none", padding: "4px 8px", borderRadius: "4px", border: `1px solid ${COLORS.border}` }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open in tab
            </a>
            <button
              onClick={onClose}
              aria-label="Close modal"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "28px", height: "28px", borderRadius: "6px", border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer", color: COLORS.textSecondary }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* iframe */}
        <iframe
          src={project.fileBrowserUrl}
          title={`File browser — ${project.name}`}
          style={{ flex: 1, border: "none", width: "100%" }}
          sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-popups"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared hook
// ---------------------------------------------------------------------------

function usePluginConfig(): boolean {
  const { data } = usePluginData<PluginConfig>("plugin-config");
  return data?.enableModalBrowser === true;
}

// ---------------------------------------------------------------------------
// NavigatorSidebarEntry
// ---------------------------------------------------------------------------

export function NavigatorSidebarEntry({ context }: PluginSidebarProps) {
  const [open, setOpen] = useState(false);
  const [modalProject, setModalProject] = useState<{ name: string; fileBrowserUrl: string } | null>(null);
  const enableModalBrowser = usePluginConfig();

  const { data, loading, error } = usePluginData<ProjectEntry[]>("projects", {
    companyId: context.companyId ?? undefined,
  });

  const projects = data ?? [];

  const handleProjectClick = useCallback((project: ProjectEntry) => {
    const href = safeHref(project.fileBrowserUrl);
    if (!href) return;
    if (enableModalBrowser) {
      setModalProject({ name: project.name, fileBrowserUrl: href });
    } else {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  }, [enableModalBrowser]);

  return (
    <div style={{ width: "100%" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          width: "100%",
          padding: "6px 8px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 500,
          color: "inherit",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span style={{ flex: 1 }}>Files</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ paddingLeft: "8px", marginTop: "4px" }}>
          {loading && (
            <p style={{ fontSize: "12px", color: "#9ca3af", padding: "4px 8px", margin: 0 }}>A carregar...</p>
          )}
          {!loading && error && (
            <p style={{ fontSize: "12px", color: "#ef4444", padding: "4px 8px", margin: 0 }}>Erro ao carregar.</p>
          )}
          {!loading && !error && projects.length === 0 && (
            <p style={{ fontSize: "12px", color: "#9ca3af", padding: "4px 8px", margin: 0 }}>Sem projectos.</p>
          )}
          {!loading && !error && projects.map((project) => (
            <div key={project.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", borderRadius: "4px", gap: "8px" }}>
              <span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={project.name}>
                {project.name}
              </span>
              {safeHref(project.fileBrowserUrl) ? (
                <button
                  onClick={() => handleProjectClick(project)}
                  style={{ fontSize: "11px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
                  aria-label={`Abrir ${project.name}`}
                >
                  {enableModalBrowser ? "Abrir ⊞" : "Abrir →"}
                </button>
              ) : (
                <span style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0 }}>—</span>
              )}
            </div>
          ))}
        </div>
      )}

      {modalProject && (
        <FileBrowserModal project={modalProject} onClose={() => setModalProject(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NavigatorProjectSidebarItem
// ---------------------------------------------------------------------------

export function NavigatorProjectSidebarItem({ context }: PluginProjectSidebarItemProps) {
  const [modalProject, setModalProject] = useState<{ name: string; fileBrowserUrl: string } | null>(null);
  const enableModalBrowser = usePluginConfig();

  const { data, loading } = usePluginData<ProjectEntry>("project-files", {
    projectId: context.entityId,
    companyId: context.companyId ?? undefined,
  });

  const href = safeHref(data?.fileBrowserUrl ?? null);
  if (loading || !href) return null;

  const projectName = data?.name ?? "";

  const handleClick = (e: React.MouseEvent) => {
    if (!enableModalBrowser) return;
    e.preventDefault();
    setModalProject({ name: projectName, fileBrowserUrl: href });
  };

  return (
    <>
      <a
        href={href}
        target={enableModalBrowser ? undefined : "_blank"}
        rel="noopener noreferrer"
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "12px",
          color: "#2563eb",
          textDecoration: "none",
          padding: "2px 4px",
          borderRadius: "4px",
          cursor: "pointer",
        }}
        aria-label={`Abrir ficheiros de ${projectName}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        Files
      </a>
      {modalProject && (
        <FileBrowserModal project={modalProject} onClose={() => setModalProject(null)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// NavigatorPage
// ---------------------------------------------------------------------------

export function NavigatorPage({ context }: PluginPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [modalProject, setModalProject] = useState<{ name: string; fileBrowserUrl: string } | null>(null);
  const enableModalBrowser = usePluginConfig();

  const { data, loading, error, refresh } = usePluginData<ProjectEntry[]>("projects", {
    companyId: context.companyId ?? undefined,
  });

  const projects = data ?? [];

  const filteredProjects = useMemo(() => {
    if (!searchTerm) return projects;
    const lower = searchTerm.toLowerCase();
    return projects.filter(p =>
      p.name.toLowerCase().includes(lower) ||
      (p.path && p.path.toLowerCase().includes(lower))
    );
  }, [projects, searchTerm]);

  const isConfigMissing = useMemo(() => {
    return projects.length > 0 && projects.every(p => p.fileBrowserUrl === null && p.path !== null);
  }, [projects]);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Project Navigator</h1>
        <p style={styles.description}>
          Browse and access your project files via the external file manager.
        </p>
      </header>

      {isConfigMissing && (
        <div style={styles.configWarning}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>
            <strong>Configuration needed:</strong> The File Browser Base URL is not set. Please contact your administrator.
          </span>
        </div>
      )}

      <div style={styles.toolbar}>
        <div style={styles.searchWrapper}>
          <div style={styles.searchIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => refresh()}
          style={{...styles.button, ...styles.disabledButton, cursor: 'pointer'}}
          title="Refresh list"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <span>Project</span>
          <span style={{textAlign: 'right'}}>Action</span>
        </div>

        {loading && (
          <div style={styles.emptyState}><p>Loading projects...</p></div>
        )}

        {!loading && error && (
          <div style={{...styles.emptyState, color: COLORS.danger}}>
            <p>Error loading projects: {error.message}</p>
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <div style={styles.emptyState}>
            <p>{searchTerm ? 'No projects match your search.' : 'No projects found.'}</p>
          </div>
        )}

        {!loading && !error && filteredProjects.map((project) => {
          const href = safeHref(project.fileBrowserUrl);
          return (
            <div key={project.id} style={styles.row}>
              <div style={styles.projectMain}>
                <span style={styles.projectName}>{project.name}</span>
                {project.path && (
                  <span style={styles.projectPath} title={project.path}>{project.path}</span>
                )}
              </div>
              <div style={styles.actionCell}>
                {href ? (
                  enableModalBrowser ? (
                    <button
                      onClick={() => setModalProject({ name: project.name, fileBrowserUrl: href })}
                      style={{...styles.button, ...styles.primaryButton}}
                    >
                      Open Files
                    </button>
                  ) : (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{...styles.button, ...styles.primaryButton}}
                    >
                      Open Files
                    </a>
                  )
                ) : (
                  <span style={{...styles.button, ...styles.disabledButton}} title="No workspace available">
                    Unavailable
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modalProject && (
        <FileBrowserModal project={modalProject} onClose={() => setModalProject(null)} />
      )}
    </div>
  );
}
