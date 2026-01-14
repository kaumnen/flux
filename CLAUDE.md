# Flux 

AWS LexV2 helper app. NextJS v16 with tRPC.

## Task Runner

This repo uses [Task](https://taskfile.dev) as a task runner. Commands are defined in `Taskfile.yml` at the repo root.

**Always use `task <command>` instead of `bun run <command>` directly.** Available tasks:
- `task lint` - Run Biome linter
- `task lint:fix` - Run Biome linter and fix issues
- `task format` - Format code with Biome
- `task typecheck` - Run TypeScript type checking
- `task check` - Run all checks (typecheck, lint, test)

## Important General info

- Use `Bun` only. Do NOT use npm, pnpm, yarn etc. 
- **Do not run long-running commands** (e.g., `bun run dev`). The user will start dev/prod servers manually.
- Except package management, define commands in the `Taskfile.yml` and use those

## Code Style

- Keep changes minimal and focused
- Follow existing patterns in each component
- No unnecessary abstractions

## Linting & Formatting

Uses [Biome](https://biomejs.dev) for linting and formatting. Config in `biome.json`.

## UI Components (shadcn)

Uses [shadcn/ui](https://ui.shadcn.com).

All components are set up and ready at `components/ui/`. Import like:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
```

## Commit Messages

**IMPORTANT:** Follow these rules exactly.

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Scopes: `app`, `api`, or omit for repo-wide changes

Rules:
- Keep messages short and concise (single line)
- No descriptions or body text
- No co-author tags
- No trailing periods

Examples:
```
feat(app): add flux logs command
fix(api): handle missing dependency
docs: update claude.md files
chore: update dependencies
```

## Workflow

- Always use Context7 MCP when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.
- Run typechecks/lints before committing

