import type { AnalysisSource, HouseAnalysis } from "@/types";
import type { OpenState } from "@/lib/geometry";

// ---------------------------------------------------------------------------
// Browser-side project storage (localStorage). Plan images are NOT stored
// (quota); the 3D model, open states and source are. Everything fails silent.
// ---------------------------------------------------------------------------

export interface SavedProject {
  name: string;
  savedAt: number;
  analysis: HouseAnalysis;
  open: OpenState;
  source: AnalysisSource;
}

const SLOTS_KEY = "b2d-projects-v1";
const AUTO_KEY = "b2d-autosave-v1";

function readSlots(): Record<string, SavedProject> {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, SavedProject>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function listProjects(): Array<{ name: string; savedAt: number }> {
  return Object.values(readSlots())
    .map((p) => ({ name: p.name, savedAt: p.savedAt }))
    .sort((a, b) => b.savedAt - a.savedAt);
}

export function saveProject(name: string, data: Omit<SavedProject, "name" | "savedAt">): boolean {
  try {
    const slots = readSlots();
    slots[name] = { ...data, name, savedAt: Date.now() };
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
    return true;
  } catch {
    return false;
  }
}

export function loadProject(name: string): SavedProject | null {
  const project = readSlots()[name] ?? null;
  if (!project || !Array.isArray(project.analysis?.walls)) return null;
  return project;
}

export function deleteProject(name: string): void {
  try {
    const slots = readSlots();
    delete slots[name];
    localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
  } catch {
    // Ignore.
  }
}

export function saveAutosave(data: Omit<SavedProject, "name" | "savedAt">): void {
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify({ ...data, name: "autosave", savedAt: Date.now() }));
  } catch {
    // Quota or private mode — ignore.
  }
}

export function loadAutosave(): SavedProject | null {
  try {
    const raw = localStorage.getItem(AUTO_KEY);
    if (!raw) return null;
    const project = JSON.parse(raw) as SavedProject;
    if (!project || !Array.isArray(project.analysis?.walls)) return null;
    return project;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTO_KEY);
  } catch {
    // Ignore.
  }
}
