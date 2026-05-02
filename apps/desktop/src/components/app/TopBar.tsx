interface TopBarProps {
  backendConnected: boolean;
  fileMenuOpen: boolean;
  saving: boolean;
  hasProject: boolean;
  onStartWindowDrag: (event: React.MouseEvent) => void;
  onToggleFileMenu: () => void;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onMinimizeWindow: (event: React.MouseEvent) => void;
  onToggleMaximizeWindow: (event: React.MouseEvent) => void;
  onCloseWindow: (event: React.MouseEvent) => void;
}

export function TopBar({
  backendConnected,
  fileMenuOpen,
  saving,
  hasProject,
  onStartWindowDrag,
  onToggleFileMenu,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseWindow,
}: TopBarProps) {
  return (
    <div className="topbar" onMouseDown={onStartWindowDrag}>
      <span className="topbar-title">CortaCAD</span>
      <div className="file-menu" data-no-drag>
        <button className={`topbar-btn ${fileMenuOpen ? "active" : ""}`} onClick={onToggleFileMenu}>
          Arquivo
        </button>
        {fileMenuOpen && (
          <div className="file-menu-popover">
            <button onClick={onNewProject}>
              <span>Novo</span>
              <kbd>Ctrl+N</kbd>
            </button>
            <button onClick={onOpenProject}>
              <span>Abrir</span>
              <kbd>Ctrl+O</kbd>
            </button>
            <button onClick={onSaveProject} disabled={!hasProject || saving}>
              <span>Salvar</span>
              <kbd>Ctrl+S</kbd>
            </button>
          </div>
        )}
      </div>
      <span style={{ flex: 1 }} />
      <span style={{ flex: 1 }} />
      {!backendConnected && (
        <span style={{ color: "var(--warning)", fontSize: 11 }}>Backend offline</span>
      )}
      <div className="window-controls" data-no-drag>
        <button
          className="window-control-btn"
          onClick={onMinimizeWindow}
          tabIndex={-1}
          title="Minimizar"
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          className="window-control-btn"
          onClick={onToggleMaximizeWindow}
          tabIndex={-1}
          title="Maximizar"
        >
          <span aria-hidden="true">□</span>
        </button>
        <button
          className="window-control-btn close"
          onClick={onCloseWindow}
          tabIndex={-1}
          title="Fechar"
        >
          <span className="close-icon" aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
