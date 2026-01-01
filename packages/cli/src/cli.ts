import { Command } from "commander";
import { createTwoFilesPatch } from "diff";
import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  VARIANTS,
  type Theme,
  type Variant,
  getCuratedTheme,
  getCuratedThemes
} from "@codex-theme/core";
import { buildShadcnCss, CSS_MARKER_END, CSS_MARKER_START } from "@codex-theme/shadcn";

type ThemeConfig = {
  theme: string;
  variant: Variant;
  updatedAt: string;
};

type FileUpdate = {
  filePath: string;
  original: string;
  updated: string;
};

type StackInfo = {
  name: string;
  hasTailwind: boolean;
  hasShadcn: boolean;
  hasAppRouter: boolean;
  cssPath: string | null;
  hints: string[];
};

type UpgradeSuggestion = {
  style: string;
  theme: string;
  description: string;
};

const STYLE_PRESETS: Record<string, UpgradeSuggestion> = {
  "luxury-dark": {
    style: "luxury-dark",
    theme: "midnight",
    description: "Premium dark with rich violet accents."
  },
  "minimal-dark": {
    style: "minimal-dark",
    theme: "obsidian",
    description: "Minimal black with clean contrast."
  },
  neon: {
    style: "neon",
    theme: "neon",
    description: "High-energy cyber accents."
  },
  "editorial-light": {
    style: "editorial-light",
    theme: "parchment",
    description: "Paper-like editorial warmth."
  },
  nordic: {
    style: "nordic",
    theme: "nord",
    description: "Cool nordic blues, calm tone."
  },
  oceanic: {
    style: "oceanic",
    theme: "ocean",
    description: "Vibrant modern blues."
  },
  graphite: {
    style: "graphite",
    theme: "graphite",
    description: "Professional grayscale."
  },
  "aurora-luxe": {
    style: "aurora-luxe",
    theme: "aurora",
    description: "Teal glow with subtle luxe."
  },
  "solar-warm": {
    style: "solar-warm",
    theme: "solar",
    description: "Warm cream + amber accents."
  },
  forest: {
    style: "forest",
    theme: "forest",
    description: "Natural greens, grounded feel."
  },
  ember: {
    style: "ember",
    theme: "ember",
    description: "Energetic orange-red palette."
  },
  sakura: {
    style: "sakura",
    theme: "sakura",
    description: "Soft pink, clean and airy."
  }
};

const program = new Command();

program
  .name("codex-theme")
  .description("Apply Codex Theme presets for shadcn/ui projects.")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a codex-theme.json config file.")
  .option("--path <path>", "Project root")
  .action(async (options) => {
    const projectRoot = resolveProjectRoot(options.path);
    const configPath = path.join(projectRoot, "codex-theme.json");

    if (existsSync(configPath)) {
      console.log("codex-theme.json already exists.");
      return;
    }

    const config: ThemeConfig = {
      theme: "midnight",
      variant: "normal",
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
    console.log(`Initialized ${configPath}`);
  });

program
  .command("list")
  .description("List curated themes.")
  .action(() => {
    const themes = getCuratedThemes();
    themes.forEach((theme) => {
      console.log(`${theme.name} — ${theme.description ?? theme.author}`);
    });
  });

program
  .command("apply")
  .description("Apply a curated theme to the current project.")
  .argument("<theme>", "Theme name")
  .option("--variant <variant>", "soft|normal|contrast", "normal")
  .option("--path <path>", "Project root")
  .option("--dry-run", "Show diff without writing files")
  .option("--yes", "Skip prompts")
  .option("--dark", "Force update dark mode")
  .action(async (themeName, options) => {
    const variant = normalizeVariant(options.variant);
    const theme = getCuratedTheme(themeName);
    if (!theme) {
      throw new Error(`Theme not found: ${themeName}`);
    }

    const projectRoot = resolveProjectRoot(options.path);
    const plan = await planThemeApply(projectRoot, theme, variant);
    plan.warnings.forEach((warning) => console.log(warning));
    printUpdates(plan.updates, Boolean(options.dryRun));

    if (!options.dryRun) {
      await writeUpdates(plan.updates);
      console.log("Applied theme.");
    }
  });

program
  .command("upgrade")
  .description("Analyze the project and propose upgrade directions.")
  .option("--goal <goal>", "Desired direction, e.g. \"more premium\"")
  .option("--style <style>", "Style preset name")
  .option("--variant <variant>", "soft|normal|contrast", "normal")
  .option("--path <path>", "Project root")
  .option("--apply", "Apply the selected style")
  .option("--export <path>", "Export CSS tokens to this file")
  .option("--dry-run", "Show diff without writing files")
  .action(async (options) => {
    const projectRoot = resolveProjectRoot(options.path);
    const stack = await detectStack(projectRoot);
    const suggestions = buildUpgradeSuggestions(options.goal);
    const selected = selectUpgradeStyle(options.style, options.goal, suggestions);

    console.log(`Detected: ${stack.name}${stack.hasShadcn ? " + shadcn" : ""}${stack.hasTailwind ? " + tailwind" : ""}`);
    if (stack.cssPath) {
      console.log(`CSS entry: ${stack.cssPath}`);
    }
    if (stack.hints.length) {
      console.log(`CSS hints: ${stack.hints.join(", ")}`);
    }

    console.log("Suggested directions:");
    suggestions.forEach((suggestion) => {
      console.log(`- ${suggestion.style} → ${suggestion.theme}: ${suggestion.description}`);
    });

    console.log(`Selected: ${selected.style} → ${selected.theme}`);

    if (!options.apply) {
      return;
    }

    const variant = normalizeVariant(options.variant);
    const theme = getCuratedTheme(selected.theme);
    if (!theme) {
      throw new Error(`Theme not found: ${selected.theme}`);
    }

    const plan = await planThemeApply(projectRoot, theme, variant);
    plan.warnings.forEach((warning) => console.log(warning));
    printUpdates(plan.updates, Boolean(options.dryRun));

    if (!options.dryRun) {
      await writeUpdates(plan.updates);
      console.log("Applied upgrade.");
    }

    const exportPath = resolveExportPath(projectRoot, options.export);
    if (!options.dryRun) {
      const css = buildExportCss(theme, variant);
      await fs.writeFile(exportPath, css, "utf-8");
      console.log(`Exported ${exportPath}`);
    } else {
      console.log(`Preview export: ${exportPath}`);
    }
  });

program
  .command("export")
  .description("Export theme variables to a shareable format.")
  .option("--format <format>", "css", "css")
  .option("--path <path>", "Project root")
  .option("--out <path>", "Output file")
  .option("--theme <theme>", "Theme name")
  .option("--variant <variant>", "soft|normal|contrast", "normal")
  .action(async (options) => {
    const format = options.format?.toLowerCase();
    if (format !== "css") {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const projectRoot = resolveProjectRoot(options.path);
    const themeName = options.theme ?? (await readConfigTheme(projectRoot));
    if (!themeName) {
      throw new Error("Theme not specified. Pass --theme or create codex-theme.json.");
    }

    const variant = normalizeVariant(options.variant);
    const theme = getCuratedTheme(themeName);
    if (!theme) {
      throw new Error(`Theme not found: ${themeName}`);
    }

    const css = buildExportCss(theme, variant);
    const outputPath = options.out
      ? path.resolve(projectRoot, options.out)
      : path.join(projectRoot, "theme.css");

    await fs.writeFile(outputPath, css, "utf-8");
    console.log(`Exported ${outputPath}`);
  });

program
  .command("doctor")
  .description("Check project readiness for Codex Theme.")
  .option("--path <path>", "Project root")
  .action((options) => {
    const projectRoot = resolveProjectRoot(options.path);
    const globalsPath = findGlobalsCss(projectRoot);
    const tailwindPath = findTailwindConfig(projectRoot);
    const hasShadcn = existsSync(path.join(projectRoot, "components.json"));
    const hasAppRouter = existsSync(path.join(projectRoot, "app")) || existsSync(path.join(projectRoot, "src", "app"));

    reportCheck("globals.css", Boolean(globalsPath));
    reportCheck("tailwind.config", Boolean(tailwindPath));
    reportCheck("shadcn components.json", hasShadcn);
    reportCheck("next app router", hasAppRouter);
  });

program.parseAsync();

function resolveProjectRoot(projectPath?: string): string {
  if (!projectPath) {
    return process.cwd();
  }
  return path.resolve(process.cwd(), projectPath);
}

function normalizeVariant(value: string): Variant {
  const normalized = value?.toLowerCase() ?? "normal";
  if (!VARIANTS.includes(normalized as Variant)) {
    throw new Error(`Invalid variant: ${value}`);
  }
  return normalized as Variant;
}

function findGlobalsCss(projectRoot: string): string | null {
  const candidates = [
    path.join(projectRoot, "app", "globals.css"),
    path.join(projectRoot, "src", "app", "globals.css"),
    path.join(projectRoot, "styles", "globals.css"),
    path.join(projectRoot, "src", "styles", "globals.css"),
    path.join(projectRoot, "site", "styles.css"),
    path.join(projectRoot, "styles.css")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function findTailwindConfig(projectRoot: string): string | null {
  const candidates = [
    "tailwind.config.ts",
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs"
  ].map((file) => path.join(projectRoot, file));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function detectStack(projectRoot: string): Promise<StackInfo> {
  const pkg = await readPackageJson(projectRoot);
  const deps = {
    ...pkg?.dependencies,
    ...pkg?.devDependencies
  };
  const hasNext = Boolean(deps?.next);
  const hasVite = Boolean(deps?.vite);
  const hasAstro = Boolean(deps?.astro);
  const hasVue = Boolean(deps?.vue || deps?.nuxt);
  const hasTailwind = Boolean(findTailwindConfig(projectRoot));
  const hasShadcn = existsSync(path.join(projectRoot, "components.json"));
  const hasAppRouter = existsSync(path.join(projectRoot, "app")) || existsSync(path.join(projectRoot, "src", "app"));
  const cssPath = findGlobalsCss(projectRoot);
  const name = hasNext
    ? "nextjs"
    : hasVite
    ? "vite"
    : hasAstro
    ? "astro"
    : hasVue
    ? "vue"
    : "static";
  const hints = [];
  if (cssPath) {
    const css = await fs.readFile(cssPath, "utf-8");
    hints.push(...extractCssHints(css));
  }

  return {
    name: hasNext && hasAppRouter ? "nextjs-app" : name,
    hasTailwind,
    hasShadcn,
    hasAppRouter,
    cssPath,
    hints
  };
}

function extractCssHints(css: string): string[] {
  const hints: string[] = [];
  if (css.includes(CSS_MARKER_START)) {
    hints.push("codex-theme block");
  }
  if (/--background:/.test(css) || /--foreground:/.test(css)) {
    hints.push("tokenized vars");
  }
  return hints;
}

function buildUpgradeSuggestions(goal?: string): UpgradeSuggestion[] {
  const normalized = (goal ?? "").toLowerCase();
  const picks: string[] = [];

  if (normalized.includes("premium") || normalized.includes("luxury")) {
    picks.push("luxury-dark", "aurora-luxe", "graphite");
  } else if (normalized.includes("minimal") || normalized.includes("clean")) {
    picks.push("minimal-dark", "graphite", "nordic");
  } else if (normalized.includes("neon") || normalized.includes("cyber")) {
    picks.push("neon", "oceanic", "luxury-dark");
  } else if (normalized.includes("warm") || normalized.includes("sun")) {
    picks.push("solar-warm", "editorial-light", "ember");
  } else if (normalized.includes("modern") || normalized.includes("tech")) {
    picks.push("oceanic", "luxury-dark", "neon");
  } else {
    picks.push("luxury-dark", "minimal-dark", "neon");
  }

  const suggestions = picks
    .map((style) => STYLE_PRESETS[style])
    .filter(Boolean);

  return suggestions.length ? suggestions : Object.values(STYLE_PRESETS).slice(0, 3);
}

function selectUpgradeStyle(
  style: string | undefined,
  goal: string | undefined,
  suggestions: UpgradeSuggestion[]
): UpgradeSuggestion {
  if (style) {
    const preset = STYLE_PRESETS[style];
    if (!preset) {
      throw new Error(`Unknown style: ${style}`);
    }
    return preset;
  }

  const normalized = (goal ?? "").toLowerCase();
  if (normalized.includes("neon")) {
    return STYLE_PRESETS.neon;
  }

  return suggestions[0];
}

function resolveExportPath(projectRoot: string, override?: string): string {
  if (override) {
    return path.resolve(projectRoot, override);
  }

  const siteCss = path.join(projectRoot, "site", "styles", "codex-theme.css");
  if (existsSync(path.join(projectRoot, "site"))) {
    return siteCss;
  }

  return path.join(projectRoot, "theme.css");
}

async function readPackageJson(projectRoot: string): Promise<Record<string, any> | null> {
  const packagePath = path.join(projectRoot, "package.json");
  if (!existsSync(packagePath)) {
    return null;
  }
  const raw = await fs.readFile(packagePath, "utf-8");
  return JSON.parse(raw);
}

async function planThemeApply(
  projectRoot: string,
  theme: Theme,
  variant: Variant
): Promise<{ updates: FileUpdate[]; warnings: string[] }> {
  const globalsPath = findGlobalsCss(projectRoot);
  if (!globalsPath) {
    throw new Error("Could not find globals.css or styles.css.");
  }

  const updates: FileUpdate[] = [];
  const warnings: string[] = [];
  const globalsOriginal = await fs.readFile(globalsPath, "utf-8");
  const cssBlock = buildShadcnCss(theme, variant);
  const globalsUpdated = upsertCssBlock(globalsOriginal, cssBlock);

  updates.push({
    filePath: globalsPath,
    original: globalsOriginal,
    updated: globalsUpdated
  });

  const tailwindPath = findTailwindConfig(projectRoot);
  if (tailwindPath) {
    const tailwindOriginal = await fs.readFile(tailwindPath, "utf-8");
    const tailwindPatched = patchTailwindConfig(tailwindOriginal, tailwindPath);
    if (tailwindPatched.updated !== tailwindOriginal) {
      updates.push({
        filePath: tailwindPath,
        original: tailwindOriginal,
        updated: tailwindPatched.updated
      });
    } else if (tailwindPatched.warning) {
      warnings.push(tailwindPatched.warning);
    }
  }

  const configPath = path.join(projectRoot, "codex-theme.json");
  const config: ThemeConfig = {
    theme: theme.name,
    variant,
    updatedAt: new Date().toISOString()
  };
  const configOriginal = existsSync(configPath)
    ? await fs.readFile(configPath, "utf-8")
    : null;
  const configUpdated = JSON.stringify(config, null, 2) + "\n";

  updates.push({
    filePath: configPath,
    original: configOriginal ?? "",
    updated: configUpdated
  });

  return { updates, warnings };
}
function upsertCssBlock(content: string, block: string): string {
  const regex = new RegExp(`${escapeRegExp(CSS_MARKER_START)}[\\s\\S]*?${escapeRegExp(CSS_MARKER_END)}`, "m");
  if (regex.test(content)) {
    return content.replace(regex, block);
  }

  const separator = content.endsWith("\n") ? "\n" : "\n\n";
  return `${content}${separator}${block}\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patchTailwindConfig(source: string, filePath: string): { updated: string; warning?: string } {
  if (source.includes("@codex-theme/shadcn")) {
    return { updated: source, warning: undefined };
  }

  const hasPresets = /presets\s*:/.test(source);
  if (hasPresets) {
    return {
      updated: source,
      warning: `Tailwind config already has presets. Add shadcnTailwindPreset manually in ${filePath}.`
    };
  }

  const isModuleExports = /module\.exports\s*=\s*{/.test(source);
  const isExportDefault = /export\s+default\s*{/.test(source);

  if (!isModuleExports && !isExportDefault) {
    return {
      updated: source,
      warning: `Unable to patch ${filePath}. Add shadcnTailwindPreset manually.`
    };
  }

  let updated = source;
  if (isModuleExports) {
    if (!updated.includes("shadcnTailwindPreset")) {
      updated = `const { shadcnTailwindPreset } = require(\"@codex-theme/shadcn\");\n\n${updated}`;
    }
    updated = updated.replace(
      /module\.exports\s*=\s*{/, 
      "module.exports = {\n  presets: [shadcnTailwindPreset],"
    );
  } else if (isExportDefault) {
    if (!updated.includes("shadcnTailwindPreset")) {
      updated = `import { shadcnTailwindPreset } from \"@codex-theme/shadcn\";\n\n${updated}`;
    }
    updated = updated.replace(
      /export\s+default\s*{/, 
      "export default {\n  presets: [shadcnTailwindPreset],"
    );
  }

  return { updated };
}

async function readConfigTheme(projectRoot: string): Promise<string | null> {
  const configPath = path.join(projectRoot, "codex-theme.json");
  if (!existsSync(configPath)) {
    return null;
  }

  const raw = await fs.readFile(configPath, "utf-8");
  const data = JSON.parse(raw) as Partial<ThemeConfig>;
  return typeof data.theme === "string" ? data.theme : null;
}

function buildExportCss(theme: Theme, variant: Variant): string {
  const lightCss = buildShadcnCss(theme, variant)
    .split("\n")
    .slice(1, -1)
    .join("\n");
  return `${lightCss}\n`;
}

function printUpdates(updates: FileUpdate[], dryRun: boolean): void {
  console.log(dryRun ? "Diff preview" : "Planned changes");
  updates.forEach((update) => {
    if (update.original === update.updated) {
      return;
    }
    const patch = createTwoFilesPatch(
      update.filePath,
      update.filePath,
      update.original,
      update.updated,
      "",
      "",
      { context: 3 }
    );
    console.log(patch);
  });
}

async function writeUpdates(updates: FileUpdate[]): Promise<void> {
  for (const update of updates) {
    if (update.original === update.updated) {
      continue;
    }
    await fs.writeFile(update.filePath, update.updated, "utf-8");
  }
}

function reportCheck(label: string, ok: boolean): void {
  console.log(`${ok ? "OK" : "MISSING"} - ${label}`);
}
