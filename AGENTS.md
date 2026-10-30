# AGENTS.md — hakili (strict shadcn + QVAC offline)

## Stack

SvelteKit 3 (Svelte 5 runes) + adapter-node · pnpm · Tailwind v4 ·
shadcn-svelte (`#lib/components/ui`) · `@shadcn/lint` · `@qvac/sdk` (local AI) · PostgreSQL + pgvector (Docker).

## SvelteKit 3 module rules

- `$lib` is REMOVED. Use `#lib/...` subpath imports (package.json `imports`).
- `#lib` imports REQUIRE explicit extensions.
- `$app/environment` is renamed `$app/env`.
- Server-only code (QVAC, pg) lives in `src/lib/server/*` and is never imported by client components.

## Strict UI rules

1. UI MUST use shadcn-svelte components from `#lib/components/ui`. Always prefer an
   existing shadcn component (including AI Elements / Chat patterns) over hand-rolled
   markup. If no shadcn component fits, add one via `pnpm dlx shadcn-svelte@latest add <name>`
   instead of writing custom CSS/components.
2. Allowed on shadcn components: `variant`/`size` props and layout-only classes.
3. Icons: `phosphor-svelte` only (per-icon `phosphor-svelte/lib/*Icon` imports, default `weight="regular"`). Dark mode: `mode-watcher`.
4. Run `pnpm run lint` and fix ALL errors.

## Installed shadcn components

Base: accordion, alert, attachment, badge, bubble, button, calendar, card, checkbox,
collapsible, command, dialog, empty, field, input, input-group, item, kbd, label, message,
message-scroller, popover, progress, questionnaire, radio-group, scroll-area, select,
separator, sheet, sidebar, skeleton, spinner, switch, textarea, tooltip, trace.

Sources pattern lives in `#lib/components/source-links.svelte` (Trace collapsible,
`Used N sources`). Composer pattern is `prompt-composer.svelte` (`InputGroup` +
`Textarea` + `Attachment` chips, Prompt Input pattern) used for the issue intake and
follow-ups. Interview questions use `interview-question.svelte` (`Questionnaire` +
`Choices` + `Input` with `shortcuts="letters"`). Thread pattern is `MessageScroller` +
`Message` + `Bubble`. Busy states use `thinking-line.svelte` (`Trace.Line
status="running"`). Do not reintroduce hand-rolled bubbles, scroll anchors,
or accordion source lists.

## Offline

- Models cached in `.qvac/models` after first run.
- Kenyan legal corpus ingested into Postgres + pgvector; app works offline afterwards.
- Docker Postgres must be running (`pnpm db:up`).

## Interview paths

- Default (fact-first batch): `extractCaseState` (`interview/facts.ts`)
  then one batched draft (`interview/batch.ts`); the ladder only backfills
  uncovered dimensions. Opt out with `INTERVIEW_FACT_FIRST=0` (legacy
  single-question draft → validators → ladder fallback).
