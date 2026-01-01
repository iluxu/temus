import { validateTheme } from "./schema";
import type { Theme } from "./schema";

import midnight from "../../../themes/midnight.json";
import obsidian from "../../../themes/obsidian.json";
import nord from "../../../themes/nord.json";
import solar from "../../../themes/solar.json";
import forest from "../../../themes/forest.json";
import sakura from "../../../themes/sakura.json";
import ocean from "../../../themes/ocean.json";
import ember from "../../../themes/ember.json";
import graphite from "../../../themes/graphite.json";
import neon from "../../../themes/neon.json";
import parchment from "../../../themes/parchment.json";
import aurora from "../../../themes/aurora.json";

const curatedThemes: Theme[] = [
  midnight,
  obsidian,
  nord,
  solar,
  forest,
  sakura,
  ocean,
  ember,
  graphite,
  neon,
  parchment,
  aurora
].map((theme) => validateTheme(theme));

export function getCuratedThemes(): Theme[] {
  return curatedThemes;
}

export function getCuratedTheme(name: string): Theme | undefined {
  const normalized = name.trim().toLowerCase();
  return curatedThemes.find((theme) => theme.name.toLowerCase() === normalized);
}
