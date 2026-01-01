import { THEME_TOKEN_KEYS } from "@codex-theme/core";

export const shadcnTailwindColors = Object.fromEntries(
  THEME_TOKEN_KEYS.map((key) => [key, `hsl(var(--${key}))`])
) as Record<string, string>;

export const shadcnTailwindPreset = {
  theme: {
    extend: {
      colors: shadcnTailwindColors
    }
  },
  plugins: []
};
