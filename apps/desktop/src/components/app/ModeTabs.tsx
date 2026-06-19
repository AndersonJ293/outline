import type { ViewMode } from "../../types";
import s from "./ModeTabs.module.css";

interface ModeTabsProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ModeTabs({ viewMode, onChange }: ModeTabsProps) {
  return (
    <div className={s["mode-tabs"]}>
      <button
        className={`${s["mode-tab"]} ${viewMode === "sketch" ? s.active : ""}`}
        onClick={() => onChange("sketch")}
      >
        Sketch
      </button>
      <button
        className={`${s["mode-tab"]} ${viewMode === "solid" ? s.active : ""}`}
        onClick={() => onChange("solid")}
      >
        Solid
      </button>
      <button
        className={`${s["mode-tab"]} ${viewMode === "export" ? s.active : ""}`}
        onClick={() => onChange("export")}
      >
        Export
      </button>
    </div>
  );
}
