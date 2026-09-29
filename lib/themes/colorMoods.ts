import { ColorMoodId, ColorMoodPalette } from "./types";

export const COLOR_MOOD_REGISTRY: Record<ColorMoodId, ColorMoodPalette> = {
  rose: {
    id: "rose",
    name: "Rose",
    previewColor: "#f43f5e",
    accentClass: "text-rose-400",
    btnPrimaryClass: "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50",
    highlightClass: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    borderClass: "border-rose-500/30",
  },
  red: {
    id: "red",
    name: "Red",
    previewColor: "#ef4444",
    accentClass: "text-red-400",
    btnPrimaryClass: "bg-red-600 hover:bg-red-500 text-white shadow-red-950/50",
    highlightClass: "bg-red-500/10 border-red-500/20 text-red-300",
    borderClass: "border-red-500/30",
  },
  pink: {
    id: "pink",
    name: "Pink",
    previewColor: "#ec4899",
    accentClass: "text-pink-400",
    btnPrimaryClass: "bg-pink-600 hover:bg-pink-500 text-white shadow-pink-950/50",
    highlightClass: "bg-pink-500/10 border-pink-500/20 text-pink-300",
    borderClass: "border-pink-500/30",
  },
  lavender: {
    id: "lavender",
    name: "Lavender",
    previewColor: "#a855f7",
    accentClass: "text-purple-300",
    btnPrimaryClass: "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50",
    highlightClass: "bg-purple-500/10 border-purple-500/20 text-purple-300",
    borderClass: "border-purple-500/30",
  },
  purple: {
    id: "purple",
    name: "Purple",
    previewColor: "#7e22ce",
    accentClass: "text-purple-400",
    btnPrimaryClass: "bg-violet-700 hover:bg-violet-600 text-white shadow-violet-950/50",
    highlightClass: "bg-violet-500/10 border-violet-500/20 text-violet-300",
    borderClass: "border-violet-500/30",
  },
  blue: {
    id: "blue",
    name: "Blue",
    previewColor: "#3b82f6",
    accentClass: "text-blue-400",
    btnPrimaryClass: "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50",
    highlightClass: "bg-blue-500/10 border-blue-500/20 text-blue-300",
    borderClass: "border-blue-500/30",
  },
  teal: {
    id: "teal",
    name: "Teal",
    previewColor: "#14b8a6",
    accentClass: "text-teal-400",
    btnPrimaryClass: "bg-teal-600 hover:bg-teal-500 text-white shadow-teal-950/50",
    highlightClass: "bg-teal-500/10 border-teal-500/20 text-teal-300",
    borderClass: "border-teal-500/30",
  },
  green: {
    id: "green",
    name: "Green",
    previewColor: "#22c55e",
    accentClass: "text-emerald-400",
    btnPrimaryClass: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50",
    highlightClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    borderClass: "border-emerald-500/30",
  },
  peach: {
    id: "peach",
    name: "Peach",
    previewColor: "#fb923c",
    accentClass: "text-orange-300",
    btnPrimaryClass: "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-950/50",
    highlightClass: "bg-orange-500/10 border-orange-500/20 text-orange-300",
    borderClass: "border-orange-500/30",
  },
  gold: {
    id: "gold",
    name: "Gold",
    previewColor: "#eab308",
    accentClass: "text-amber-400",
    btnPrimaryClass: "bg-amber-600 hover:bg-amber-500 text-amber-950 font-bold shadow-amber-950/50",
    highlightClass: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    borderClass: "border-amber-500/30",
  },
};

export const COLOR_MOOD_LIST = Object.values(COLOR_MOOD_REGISTRY);

export function isValidColorMood(id: unknown): id is ColorMoodId {
  return typeof id === "string" && id in COLOR_MOOD_REGISTRY;
}

export function resolveColorMood(id?: unknown, fallback: ColorMoodId = "rose"): ColorMoodPalette {
  if (isValidColorMood(id)) {
    return COLOR_MOOD_REGISTRY[id];
  }
  return COLOR_MOOD_REGISTRY[fallback] || COLOR_MOOD_REGISTRY["rose"];
}
