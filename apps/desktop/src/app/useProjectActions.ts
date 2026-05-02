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
    const name = `Cortador ${formatProjectDate()}`;
    try {
      const newProject = await commands.newProject(name);
      setProject(newProject);
      setStatus(`Novo projeto: "${name}"`);
      setError(null);
    } catch (err) {
      setError(`Erro ao criar projeto: ${err}`);
    }
  }, [setProject, setStatus, setError]);

  const handleSave = useCallback(async () => {
    if (!project) return;
    setSaving(true);
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const fileName = `${safeFileName(project.project_name)}.cortacad`;
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: "CortaCAD", extensions: ["cortacad"] }],
      });
      if (!filePath) {
        setSaving(false);
        return;
      }
      const json = JSON.stringify(project, null, 2);
      await commands.saveFile(filePath, json);
      setStatus(`Projeto salvo: "${filePath}"`);
    } catch (err) {
      setError(`Erro ao salvar: ${err}`);
    } finally {
      setSaving(false);
    }
  }, [project, setStatus, setError]);

  const handleOpen = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{ name: "CortaCAD", extensions: ["cortacad"] }],
      });
      if (!selected) return;
      const path = selected as string;
      const text = await commands.readFile(path);
      const openedProject = JSON.parse(text);
      setProject(openedProject);
      setStatus(`Projeto aberto: "${path}"`);
      setError(null);
    } catch (err) {
      setError(`Erro ao abrir projeto: ${err}`);
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
        el.onerror = () => reject(new Error("Falha ao carregar imagem"));
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
      setStatus(`Imagem importada: ${Math.round(widthMm)} x ${Math.round(heightMm)} mm`);
      setError(null);
    } catch (err) {
      setError(`Erro ao importar imagem: ${err}`);
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
