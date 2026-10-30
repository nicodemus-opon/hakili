# Hakili

Offline legal-preparation assistant for Kenya, built with SvelteKit, strict shadcn-svelte, and QVAC local AI.

## Prerequisites

- Node.js >= 22.17
- pnpm >= 10
- Docker

## Setup (fresh machine, online first)

```sh
pnpm install
pnpm db:up
pnpm corpus:check   # validates checked-in corpus, no DB needed
pnpm ingest         # downloads QVAC models on first run, embeds corpus into Postgres
node scripts/fetch-tessdata.mjs  # optional upfront OCR data (else fetched on first photo upload)
pnpm dev
```

Open http://localhost:5173.

After corpus updates: `pnpm ingest:force` re-embeds everything (plain `pnpm ingest` skips when data exists).

## Corpus layout

Per-topic sources live in `src/lib/data/corpus/<topic>.json` (the source of
truth). The checked-in `src/lib/data/kenyan-legal-corpus.json` is generated:

```sh
pnpm corpus:build   # rebuild the checked-in JSON from src/lib/data/corpus/
```

Edit a per-topic file, run `pnpm corpus:build`, then `pnpm corpus:check` and
`pnpm ingest:force`. Every entry needs `id, title, citation, url (https),
content, topic, source_type (legislation|guidance|ngo), effective_date`, plus
`sw_keywords` (Swahili/Sheng terms feeding the FTS expansion table via
`pnpm expansions:build`).

## Production

```sh
pnpm build
node build
```

## Offline use

The first online `pnpm ingest` downloads the AI models into `~/.qvac` (plus the
HuggingFace cache) and the OCR language data into `.qvac/tessdata` (fetched
automatically on first photo upload, or upfront via
`node scripts/fetch-tessdata.mjs`), and embeds the legal corpus into Postgres.
After that, Hakili works without internet access. Photos of documents are read
with on-device OCR.

## Named-entity extraction (offline NER)

Hard-coded regex/token heuristics in the interview policy are backed by two
local extractor layers (both fail open — the heuristics still apply when NER
is unavailable):

- **Lite layer** (`src/lib/server/agent/interview/entities-lite.ts`, no model
  downloads): compromise (+dates/+numbers) for English PERSON/ORG/PLACE/DATE/
  MONEY, chrono for English dates, a wink-ner gazetteer for Kenyan domain
  entities (land registrar, title deed, OB number, …), and a small structural
  Kiswahili date table (`12 Mei 2024`, `jana`, `kesho`) — chrono has no
  Swahili locale. Used additively in `policy.ts` (`isAnchored`,
  `issueHasNamedParty`, `isGroundedInIssue`), `batch.ts` (`isPartyReask`),
  and `pipeline.ts` (deadline detection in `fallbackPlan`).
- **Transformer layer** (`src/lib/server/agent/interview/ner.ts`, ONNX via
  `@huggingface/transformers`, q8, CPU): proper PER/ORG/LOC extraction.
  English uses `Xenova/bert-base-multilingual-cased-ner-hrl` (~179 MB q8);
  Kiswahili uses a local Optimum export (default
  `.qvac/models/swahili-ner-onnx`) because ready-made multilingual NER models
  don't cover Swahili. Its only hard wiring is an advisory bypass in
  `judgeEntitiesGrounded` (`loop.ts`): when every entity in a draft question
  already appears in the issue/history/law, the noisy LLM judge is skipped —
  it can only grant groundedness, never reject.

Setup (online machine, once — everything is cached under `.qvac/models/`):

```sh
pnpm ner:fetch     # downloads the English NER model, verifies the cache
pnpm ner:convert   # one-time Optimum ONNX export of the Swahili model
                   # (needs: pip install "optimum[onnxruntime]" transformers torch)
```

Runtime never downloads: remote models resolve purely from the cache unless
`INTERVIEW_NER_FETCH=1`. `INTERVIEW_NER=0` disables the transformer layer
entirely (lite extractors + LLM judges still apply). Model overrides:
`NER_MODEL_EN`, `NER_MODEL_SW`, `HF_CACHE`.

## Agent harness

Server logic lives in `src/lib/server/agent/` (modular; `qvac.ts` is a
compatibility facade):

- `llm.ts` — model lifecycle, `completeText` / `completeJson`, batched embeds
- `language.ts` + `fts-data.ts` — language detection, FTS synonym expansion
- `retrieval.ts` — parallel vector + FTS hybrid search with weighted RRF
- `interview/loop.ts` + `policy.ts` + `slots.ts` — classify → retrieve → draft →
  validate (2-attempt budget, deterministic slot fallback)
- `plan/generator.ts` + `validator.ts` — full pass, targeted section repair,
  citation verification
- `pipeline.ts` — shared validation / timeout / tracing for all `/api/*` routes
- `observability.ts` — per-request trace ids, timings, warn/error events

Quality gates (run before pushing):

```sh
pnpm test:unit -- --run   # pure unit tests, no DB/model needed
pnpm eval                 # golden offline eval (retrieval synonyms, slot policy, thin-plan)
pnpm eval:live            # + live retrieval/interview checks (needs Postgres + models)
pnpm check                # svelte-check
pnpm run lint             # prettier + eslint (must be clean)
```
