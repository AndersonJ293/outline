import { useCallback, useState } from "react";
import * as commands from "../commands";
import { generateId } from "../types";
import type { Project, SketchImage } from "../types";
import { formatProjectDate, safeFileName } from "./fileNames";

interface UseProjectActionsArgs {
  project: Project | null;
  setProject: (project: Project) => void;
  addImage: (image: SketchImage) => void;
  setStatus: (text: string) => void;
  setError: (text: string | null) => void;
}

export function useProjectActions({
  project,
  setProject,
  addImage,
  setStatus,
  setError,
}: UseProjectActionsArgs) {
  const [saving, setSaving] = useState(false);

  const handleNewProject = useCallback(async () => {
    const name = `Projeto ${formatProjectDate()}`;
    try {
      const newProject = await commands.newProject(name);
      setProject(newProject);
      setStatus(`New project: "${name}"`);
      setError(null);
    } catch (err) {
      setError(`Failed to create project: ${err}`);
    }
  }, [setProject, setStatus, setError]);

  const handleSave = useCallback(async () => {
    if (!project) return;
    setSaving(true);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const fileName = `${safeFileName(project.project_name)}.outline`;
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "Outline", extensions: ["outline"] }],
      });
      if (!filePath) {
        setSaving(false);
        return;
      }
      const json = JSON.stringify(project, null, 2);
      await commands.saveFile(filePath, json);
      setStatus(`Project saved: "${filePath}"`);
    } catch (err) {
      setError(`Failed to save: ${err}`);
    } finally {
      setSaving(false);
    }
  }, [project, setStatus, setError]);

  const handleOpen = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Outline", extensions: ["outline"] }],
      });
      if (!selected) return;
      const path = selected as string;
      const text = await commands.readFile(path);
      const openedProject = JSON.parse(text);
      setProject(openedProject);
      setStatus(`Project opened: "${path}"`);
      setError(null);
    } catch (err) {
      setError(`Failed to open project: ${err}`);
    }
  }, [setProject, setStatus, setError]);

  const handleImportImage = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "Imagens", extensions: ["png", "jpg", "jpeg"] }],
      });
      if (!selected) return;
      const path = selected as string;
      const dataUrl = await commands.readImageBase64(path);

      const el = new window.Image();
      await new Promise<void>((resolve, reject) => {
        el.onload = () => resolve();
        el.onerror = () => reject(new Error("Failed to load image"));
        el.src = dataUrl;
      });

      const maxDim = 100;
      const w = el.naturalWidth;
      const h = el.naturalHeight;
      const widthMm = w > h ? maxDim : (w / h) * maxDim;
      const heightMm = w > h ? (h / w) * maxDim : maxDim;

      addImage({
        id: generateId(),
        type: "image",
        x: 0,
        y: 0,
        widthMm,
        heightMm,
        source: dataUrl,
        rotation: 0,
        mirrorX: false,
        mirrorY: false,
        opacity: 0.4,
      });
      setStatus(`Image imported: ${Math.round(widthMm)} x ${Math.round(heightMm)} mm`);
      setError(null);
    } catch (err) {
      setError(`Failed to import image: ${err}`);
    }
  }, [addImage, setStatus, setError]);

  return {
    saving,
    handleNewProject,
    handleSave,
    handleOpen,
    handleImportImage,
  };
}
