# temus

Codex Theme toolchain (alpha): curated themes + shadcn adapter + CLI.

## Alpha quickstart

```
npm i -D @codex-theme/cli
npx codex-theme apply midnight --variant normal
```

Optional export:
```
npx codex-theme export --format css --out ./site/styles/codex-theme.css
```

Upgrade flow (MVP):
```
npx codex-theme upgrade --goal "more premium" --apply
```

## Codex skill install (via registry)

```
npx --yes git+ssh://git@github.com/iluxu/codex-skill.git install codex-theme \
  --registry https://raw.githubusercontent.com/iluxu/codex-skills-registry/main/index.json \
  --to ~/.codex/skills
```

Restart Codex after install.

## Demo script (short)

```
npx --yes git+ssh://git@github.com/iluxu/codex-skill.git list \
  --registry https://raw.githubusercontent.com/iluxu/codex-skills-registry/main/index.json

npx --yes git+ssh://git@github.com/iluxu/codex-skill.git install codex-theme \
  --registry https://raw.githubusercontent.com/iluxu/codex-skills-registry/main/index.json \
  --to ~/.codex/skills

npm i -D @codex-theme/cli
npx codex-theme apply midnight --variant normal
git diff
```

## Packages

- `@codex-theme/core` - schema + variants + token helpers
- `@codex-theme/shadcn` - shadcn adapter + Tailwind preset
- `@codex-theme/cli` - CLI apply/export/doctor

## Related repos

- CLI hub: https://github.com/iluxu/codex-skill
- Registry: https://github.com/iluxu/codex-skills-registry
- MCP server: https://github.com/iluxu/codex-skills-mcp
