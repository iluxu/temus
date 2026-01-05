---
name: codex-theme
description: Apply themes to Tailwind + shadcn/ui projects. Use when user asks to install a theme, change colors, apply a palette, or configure dark mode.
---

# Codex Theme

Apply curated themes to Next.js / React / Tailwind / shadcn/ui projects in one command.

## Quick start

```bash
npx codex-theme apply midnight
```

## Available themes

midnight, obsidian, nord, solar, forest, sakura, ocean, ember, graphite, neon, parchment, aurora

Each theme has 3 variants: `soft`, `normal` (default), `contrast`

## Commands

| Command | Description |
|---------|-------------|
| `npx codex-theme list` | Show all themes |
| `npx codex-theme apply <theme>` | Apply theme to project |
| `npx codex-theme apply <theme> --variant soft` | Apply with variant |
| `npx codex-theme apply <theme> --dry-run` | Preview without changes |
| `npx codex-theme doctor` | Check project setup |
| `npx codex-theme export --format css` | Export as CSS file |

## Workflow

1. **Check project** — Read `package.json`, find `tailwind.config.*` and `globals.css`
2. **Apply theme** — Run `npx codex-theme apply <theme>`
3. **Verify** — Run `npm run dev`, check light/dark mode renders

## What gets updated

- `app/globals.css` — CSS variables for colors
- `tailwind.config.*` — Theme preset + shadcn mappings

## Example

User: "Apply a dark premium theme"

```bash
npx codex-theme apply midnight --variant contrast
```

Output: Updates globals.css + tailwind.config.ts, shows diff summary.

## Troubleshooting

Run `npx codex-theme doctor` to validate project setup.
