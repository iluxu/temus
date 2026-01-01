import { themeToCssVars, type Theme, type ThemeTokens, type Variant } from "@codex-theme/core";

export const CSS_MARKER_START = "/* @codex-theme:start */";
export const CSS_MARKER_END = "/* @codex-theme:end */";

export function buildShadcnCss(theme: Theme, variant: Variant = "normal"): string {
  const lightVars = themeToCssVars(theme.modes.light as ThemeTokens, variant);
  const darkVars = themeToCssVars(theme.modes.dark as ThemeTokens, variant);

  return [
    CSS_MARKER_START,
    "@layer base {",
    "  :root {",
    lightVars,
    "  }",
    "  .dark {",
    darkVars,
    "  }",
    "}",
    CSS_MARKER_END
  ].join("\n");
}
