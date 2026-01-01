export const THEME_TOKEN_KEYS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "input",
  "ring"
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;

export const VARIANTS = ["soft", "normal", "contrast"] as const;
export type Variant = (typeof VARIANTS)[number];
