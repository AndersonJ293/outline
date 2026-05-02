import type { ViewMode } from "../../types";

interface ModeTabsProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ModeTabs({ viewMode, onChange }: ModeTabsProps) {
  return (
    <div className="mode-tabs">
      <button
        className={`mode-tab ${viewMode === "sketch" ? "active" : ""}`}
        onClick={() => onChange("sketch")}
      >
        Sketch
      </button>
      <button
        className={`mode-tab ${viewMode === "solid" ? "active" : ""}`}
        onClick={() => onChange("solid")}
      >
        Solid
      </button>
      <button
        className={`mode-tab ${viewMode === "export" ? "active" : ""}`}
        onClick={() => onChange("export")}
      >
        Export
      </button>
    </div>
  );
}
