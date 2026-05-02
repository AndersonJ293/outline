import type { Project } from "../../types";

interface StatusBarProps {
  project: Project | null;
  statusText: string;
  errorText: string | null;
}

export function StatusBar({ project, statusText, errorText }: StatusBarProps) {
  return (
    <div className="status-bar">
      <span>
        {project ? `${project.project_name} | ${project.sketch.entities.length} entidades` : "Sem projeto"}
      </span>
      <span>{statusText}</span>
      {errorText && <span className="error">{errorText}</span>}
    </div>
  );
}
