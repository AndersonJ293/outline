import s from "./TopBar.module.css";

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
    <div className={s.topbar} onMouseDown={onStartWindowDrag}>
      <span className={s["topbar-title"]}>Outline</span>
      <div className={s["file-menu"]} data-no-drag>
        <button className={`${s["topbar-btn"]} ${fileMenuOpen ? s.active : ""}`} onClick={onToggleFileMenu}>
          File
        </button>
        {fileMenuOpen && (
          <div className={s["file-menu-popover"]}>
            <button onClick={onNewProject}>
              <span>New</span>
              <kbd>Ctrl+N</kbd>
            </button>
            <button onClick={onOpenProject}>
              <span>Open</span>
              <kbd>Ctrl+O</kbd>
            </button>
            <button onClick={onSaveProject} disabled={!hasProject || saving}>
              <span>Save</span>
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
      <div className={s["window-controls"]} data-no-drag>
        <button
          className={s["window-control-btn"]}
          onClick={onMinimizeWindow}
          tabIndex={-1}
          title="Minimize"
        >
          <span aria-hidden="true">−</span>
        </button>
        <button
          className={s["window-control-btn"]}
          onClick={onToggleMaximizeWindow}
          tabIndex={-1}
          title="Maximize"
        >
          <span aria-hidden="true">□</span>
        </button>
        <button
          className={`${s["window-control-btn"]} ${s.close}`}
          onClick={onCloseWindow}
          tabIndex={-1}
          title="Close"
        >
          <span className={s["close-icon"]} aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  );
}
