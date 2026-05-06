import { useState, useMemo } from "react";
import type { PluginPageProps, PluginSidebarProps, PluginProjectSidebarItemProps } from "@paperclipai/plugin-sdk/ui";
import { usePluginData } from "@paperclipai/plugin-sdk/ui";

// Prevents javascript:, data:, vbscript: etc. from being used as href values.
// Only allows http:// and https:// URLs.
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
    ":last-child": {
      borderBottom: "none",
    },
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

export function NavigatorSidebarEntry({ context }: PluginSidebarProps) {
  const [open, setOpen] = useState(false);
  const { data, loading, error } = usePluginData<ProjectEntry[]>("projects", {
    companyId: context.companyId ?? undefined,
  });

  const projects = data ?? [];

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
            <p style={{ fontSize: "12px", color: "#9ca3af", padding: "4px 8px", margin: 0 }}>
              A carregar...
            </p>
          )}
          {!loading && error && (
            <p style={{ fontSize: "12px", color: "#ef4444", padding: "4px 8px", margin: 0 }}>
              Erro ao carregar.
            </p>
          )}
          {!loading && !error && projects.length === 0 && (
            <p style={{ fontSize: "12px", color: "#9ca3af", padding: "4px 8px", margin: 0 }}>
              Sem projectos.
            </p>
          )}
          {!loading && !error && projects.map((project) => (
            <div key={project.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 8px", borderRadius: "4px", gap: "8px" }}>
              <span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }} title={project.name}>
                {project.name}
              </span>
              {safeHref(project.fileBrowserUrl) ? (
                <a
                  href={safeHref(project.fileBrowserUrl) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: "#2563eb", textDecoration: "none", flexShrink: 0 }}
                  aria-label={`Abrir ${project.name}`}
                >
                  Abrir →
                </a>
              ) : (
                <span style={{ fontSize: "11px", color: "#9ca3af", flexShrink: 0 }}>—</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NavigatorProjectSidebarItem({ context }: PluginProjectSidebarItemProps) {
  const { data, loading } = usePluginData<ProjectEntry>("project-files", {
    projectId: context.entityId,
    companyId: context.companyId ?? undefined,
  });

  if (loading || !safeHref(data?.fileBrowserUrl ?? null)) return null;

  return (
    <a
      href={safeHref(data.fileBrowserUrl) ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12px",
        color: "#2563eb",
        textDecoration: "none",
        padding: "2px 4px",
        borderRadius: "4px",
      }}
      aria-label={`Abrir ficheiros de ${data.name}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      Files
    </a>
  );
}

export function NavigatorPage({ context }: PluginPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
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

  // Infer if config is missing (if we have projects but NO fileBrowserUrls)
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
          <div style={styles.emptyState}>
            <p>Loading projects...</p>
          </div>
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

        {!loading && !error && filteredProjects.map((project) => (
          <div key={project.id} style={styles.row}>
            <div style={styles.projectMain}>
              <span style={styles.projectName}>{project.name}</span>
              {project.path && (
                <span style={styles.projectPath} title={project.path}>
                  {project.path}
                </span>
              )}
            </div>
            <div style={styles.actionCell}>
              {safeHref(project.fileBrowserUrl) ? (
                <a
                  href={safeHref(project.fileBrowserUrl) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{...styles.button, ...styles.primaryButton}}
                >
                  Open Files
                </a>
              ) : (
                <span style={{...styles.button, ...styles.disabledButton}} title="No workspace available">
                  Unavailable
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

