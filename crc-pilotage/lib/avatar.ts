const AVATAR_COLORS = [
  "#8A5A44", // terre
  "#4B6E5C", // sapin
  "#5C6B8A", // ardoise
  "#8A6B44", // ambre
  "#6B5C8A", // prune
  "#44708A", // pétrole
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const PROJECT_COLORS = [
  "#3E6FA8", // bleu (accent)
  "#6B5C8A", // prune
  "#4B6E5C", // sapin
  "#8A6B44", // ambre
  "#5C6B8A", // ardoise
  "#8A5A44", // terre
];

export function projectColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length];
}

// Palette proposée au choix lors de la création/édition d'un projet
export const PROJECT_COLOR_PRESETS = [
  "#3E6FA8", // bleu
  "#6B5C8A", // prune
  "#4B6E5C", // sapin
  "#8A6B44", // ambre
  "#5C6B8A", // ardoise
  "#8A5A44", // terre
  "#B54834", // brique
  "#2E7D6B", // émeraude
];

/** Ajoute une transparence à une couleur hex (#RRGGBB) pour une teinte légère de fond. */
export function withAlpha(hex: string, alphaHex: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  return `${hex}${alphaHex}`;
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export function formatDueDate(dueDate: string | null): string {
  return new Date(dueDate + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Renvoie le libellé à afficher pour l'échéance d'une tâche, en priorisant
 * toujours la date normalisée (celle éditée dans le tiroir) sur le texte
 * brut extrait du CR — pour que l'édition se reflète visuellement.
 *
 * `inGantt` reflète uniquement due_date (le seul champ que le Gantt utilise),
 * indépendamment de due_date_raw qui peut exister sans être normalisé.
 */
export function dueDateLabel(task: { due_date: string | null; due_date_raw: string | null }): {
  label: string | null;
  defined: boolean;
  inGantt: boolean;
} {
  if (task.due_date) return { label: formatDueDate(task.due_date), defined: true, inGantt: true };
  if (task.due_date_raw) return { label: task.due_date_raw, defined: true, inGantt: false };
  return { label: null, defined: false, inGantt: false };
}
