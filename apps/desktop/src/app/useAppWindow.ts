import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function useAppWindow() {
  const [panelWidth, setPanelWidth] = useState(260);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const panelResizeStart = useRef<{ x: number; width: number } | null>(null);
  const appWindow = getCurrentWindow();

  const handleMinimizeWindow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void appWindow.minimize();
  }, [appWindow]);

  const handleToggleMaximizeWindow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void appWindow.toggleMaximize();
  }, [appWindow]);

  const handleCloseWindow = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    void appWindow.close();
  }, [appWindow]);

  const handleStartWindowDrag = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-no-drag]")) return;
    if (event.button !== 0) return;
    void appWindow.startDragging();
  }, [appWindow]);

  const handlePanelResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    panelResizeStart.current = { x: event.clientX, width: panelWidth };
  }, [panelWidth]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!panelResizeStart.current) return;
      const delta = panelResizeStart.current.x - event.clientX;
      setPanelWidth(Math.min(420, Math.max(220, panelResizeStart.current.width + delta)));
    };

    const handleUp = () => {
      panelResizeStart.current = null;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  return {
    panelWidth,
    panelCollapsed,
    setPanelCollapsed,
    handleMinimizeWindow,
    handleToggleMaximizeWindow,
    handleCloseWindow,
    handleStartWindowDrag,
    handlePanelResizeStart,
  };
}
