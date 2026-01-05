# codex-theme Demo Script

30-second video showing theme installation on a fresh Next.js + shadcn/ui project.

## Setup (before recording)

```bash
# Create fresh Next.js project with shadcn/ui
npx create-next-app@latest demo-app --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd demo-app
npx shadcn@latest init -d
npx shadcn@latest add button card
```

## Recording Script

### Scene 1: Terminal (5 sec)
```bash
# Show the command
npx codex-theme apply midnight
```

### Scene 2: VS Code (5 sec)
- Show `globals.css` diff (before → after)
- Highlight CSS variables changed

### Scene 3: Browser (10 sec)
- Split screen: before (default) / after (midnight theme)
- Toggle dark mode to show both variants
- Hover a button to show accent color

### Scene 4: Variants (10 sec)
```bash
# Show variant switching
npx codex-theme apply midnight --variant soft
npx codex-theme apply midnight --variant contrast
```
- Quick cuts showing the 3 variants

## Key Messages (text overlay)

1. "One command. Full theme."
2. "12 curated themes. 3 variants each."
3. "Works with Claude Code + Codex"

## End Card

```
npx codex-skill install codex-theme

github.com/iluxu/codex-skill
```

## Recording Tips

- Use a clean terminal (no clutter)
- 1920x1080, dark terminal theme
- Speed up npm install parts (2x)
- Add subtle typing sounds
- Background music: lo-fi, low volume
