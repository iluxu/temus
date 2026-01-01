---
name: codex-theme
description: Install, generate, and apply frontend themes with @codex-theme packages. Use when a user asks to install a theme, generate a theme from a palette, configure Tailwind and shadcn/ui tokens, export CSS variables, or produce diffs and checklists for theme changes (priority: Next.js app router + React + Tailwind + shadcn/ui; phase 2: Vite React, Astro, Vue/Nuxt).
---

# Codex Theme Skill

## Goal

Deliver a 5-minute MVP workflow to install, apply, customize, and export themes with the @codex-theme toolchain. Always output exact commands, file diffs, and a short verification checklist.

## Inputs to confirm

Ask only if missing:

- Theme source: curated theme name (see `skills/codex-theme/references/curated-themes.md`)
- Variant: soft/normal/contrast
- Target stack: Next.js app router + React + Tailwind + shadcn/ui by default
- Output format: apply only, or apply + export tokens/CSS

## Workflow

1) Inspect project
   - Read `package.json` for framework + Tailwind + shadcn/ui presence.
   - Locate `tailwind.config.*`, `postcss.config.*`, and `app/globals.css` (or `src/app/globals.css`).
   - Confirm Next.js app router by checking `app/` directory.

2) Ensure tooling
   - If `@codex-theme/cli` is missing, install with:
     - `npm i -D @codex-theme/cli` (or `pnpm add -D`, `yarn add -D`)
   - Prefer `npx codex-theme` for one-off usage.

3) Initialize (first-time only)
   - Run `npx codex-theme init` to scaffold `codex-theme.json`.
   - If `codex-theme.json` already exists, skip and proceed to apply.

4) Apply theme
   - Curated theme: `npx codex-theme apply <name> --variant normal`
   - For a preview without writes: `npx codex-theme apply <name> --variant normal --dry-run`
   - Variant updates: `npx codex-theme apply <name> --variant soft|normal|contrast`
   - Update:
     - `app/globals.css` or `src/app/globals.css` with CSS variables.
     - `tailwind.config.*` with the @codex-theme preset and shadcn mappings.
     - shadcn token mapping in `globals.css` (CSS vars) or theme file if present.

5) Upgrade (optional)
   - Analyze + suggest 3 directions: `npx codex-theme upgrade --goal "more premium"`
   - Apply chosen style: `npx codex-theme upgrade --style luxury-dark --apply`

6) Export (optional)
   - `npx codex-theme export --format css --out ./theme.css`

7) Diagnostics (optional)
   - `npx codex-theme doctor` to validate globals.css, Tailwind config, shadcn config, and app router.

8) Report
   - Provide a diff summary and a checklist:
     - Build passes
     - Dark mode renders
     - Contrast checks (buttons, inputs, text on surfaces)

## Output format (always)

- Exact commands executed
- Files modified with a short diff summary
- Checklist with next steps

## If theme is unknown

- Propose the closest curated theme and list options from `npx codex-theme list`.
