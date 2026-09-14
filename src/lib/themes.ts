export const THEME_IDS = ["default", "nord", "dracula", "catppuccin-mocha", "tokyo-night", "gruvbox"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** Swatch colors are only for the theme picker preview — the real palettes live in globals.css. */
export const THEMES: Array<{ id: ThemeId; name: string; swatch: { background: string; surface: string; accent: string } }> = [
  { id: "default", name: "Default", swatch: { background: "#0b0d11", surface: "#14171c", accent: "#4f8cf7" } },
  { id: "nord", name: "Nord", swatch: { background: "#2e3440", surface: "#3b4252", accent: "#88c0d0" } },
  { id: "dracula", name: "Dracula", swatch: { background: "#282a36", surface: "#2f3140", accent: "#bd93f9" } },
  { id: "catppuccin-mocha", name: "Catppuccin Mocha", swatch: { background: "#1e1e2e", surface: "#313244", accent: "#89b4fa" } },
  { id: "tokyo-night", name: "Tokyo Night", swatch: { background: "#1a1b26", surface: "#20222f", accent: "#7aa2f7" } },
  { id: "gruvbox", name: "Gruvbox", swatch: { background: "#282828", surface: "#32302f", accent: "#fe8019" } },
];
