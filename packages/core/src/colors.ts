import { converter, parse } from "culori";
import { THEME_TOKEN_KEYS, ThemeTokens, Variant } from "./tokens";

type Hsl = {
  h: number;
  s: number;
  l: number;
};

const toHsl = converter("hsl");

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseHslTriplet(value: string): Hsl | null {
  const trimmed = value.trim();
  const raw = trimmed.startsWith("hsl(") && trimmed.endsWith(")")
    ? trimmed.slice(4, -1)
    : trimmed;
  const match = raw.match(
    /^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/
  );

  if (!match) {
    return null;
  }

  const h = Number(match[1]);
  const s = Number(match[2]) / 100;
  const l = Number(match[3]) / 100;

  if (Number.isNaN(h) || Number.isNaN(s) || Number.isNaN(l)) {
    return null;
  }

  return {
    h,
    s: clamp(s, 0, 1),
    l: clamp(l, 0, 1)
  };
}

export function parseColorToHsl(value: string): Hsl {
  const parsedTriplet = parseHslTriplet(value);
  if (parsedTriplet) {
    return parsedTriplet;
  }

  const color = parse(value);
  if (!color) {
    throw new Error(`Invalid color value: ${value}`);
  }

  const hsl = toHsl(color);
  if (!hsl) {
    throw new Error(`Unable to convert color to HSL: ${value}`);
  }

  return {
    h: typeof hsl.h === "number" ? hsl.h : 0,
    s: typeof hsl.s === "number" ? hsl.s : 0,
    l: typeof hsl.l === "number" ? hsl.l : 0
  };
}

export function formatHslVar(hsl: Hsl): string {
  const h = Number.isFinite(hsl.h) ? hsl.h : 0;
  const s = clamp(hsl.s, 0, 1) * 100;
  const l = clamp(hsl.l, 0, 1) * 100;

  return `${round(h, 1)} ${round(s, 1)}% ${round(l, 1)}%`;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function normalizeTokenValue(value: string): string {
  return formatHslVar(parseColorToHsl(value));
}

export function normalizeTokens(tokens: ThemeTokens): ThemeTokens {
  return Object.fromEntries(
    THEME_TOKEN_KEYS.map((key) => [key, normalizeTokenValue(tokens[key])])
  ) as ThemeTokens;
}

function adjustHsl(hsl: Hsl, variant: Variant): Hsl {
  if (variant === "normal") {
    return hsl;
  }

  const saturationScale = variant === "soft" ? 0.85 : 1.12;
  const contrastScale = variant === "soft" ? 0.92 : 1.08;

  const s = clamp(hsl.s * saturationScale, 0, 1);
  const l = clamp(0.5 + (hsl.l - 0.5) * contrastScale, 0, 1);

  return {
    h: hsl.h,
    s,
    l
  };
}

export function applyVariant(tokens: ThemeTokens, variant: Variant): ThemeTokens {
  return Object.fromEntries(
    THEME_TOKEN_KEYS.map((key) => {
      const hsl = parseColorToHsl(tokens[key]);
      const adjusted = adjustHsl(hsl, variant);
      return [key, formatHslVar(adjusted)];
    })
  ) as ThemeTokens;
}
