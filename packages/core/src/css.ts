import { THEME_TOKEN_KEYS, ThemeTokens, Variant } from "./tokens";
import { applyVariant, normalizeTokens } from "./colors";

export function tokensToCssVars(tokens: ThemeTokens): string {
  return THEME_TOKEN_KEYS.map((key) => `  --${key}: ${tokens[key]};`).join("\n");
}

export function themeToCssVars(tokens: ThemeTokens, variant: Variant): string {
  const normalized = variant === "normal" ? normalizeTokens(tokens) : applyVariant(tokens, variant);
  return tokensToCssVars(normalized);
}
