import type { Project } from "../../types";
import s from "./StatusBar.module.css";

interface StatusBarProps {
  project: Project | null;
  statusText: string;
  errorText: string | null;
}

export function StatusBar({ project, statusText, errorText }: StatusBarProps) {
  return (
    <div className={s["status-bar"]}>
      <span>
        {project ? `${project.project_name} | ${project.sketch.entities.length} entities` : "No project"}
      </span>
      <span>{statusText}</span>
      {errorText && <span className={s.error}>{errorText}</span>}
    </div>
  );
}
