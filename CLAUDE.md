# higgsfield-studio (fork of wide-trace/open-higgsfield)

Local visual composer and gallery over the Higgsfield Platform API. Runs on localhost only. Blake uses it for ad creative and campaign stills.

## Provenance and trust (read before touching upstream)

- Forked 2026-09-18 from `wide-trace/open-higgsfield` at commit `b16a0ef`, tagged `audited-b16a0ef`. Upstream author is anonymous (account created the same day as the repo, no license, one contributor). The audited tree was clean: no install hooks, no eval or obfuscation, outbound calls only to Google Fonts and `HF_API_BASE_URL`.
- NO upstream remote is configured, on purpose. Never add one and `git pull`. To take an upstream change: fetch the specific commit into a scratch clone, read the full diff (every file, including lockfile and `public/`), then cherry-pick. An "add model" commit is exactly where an exfil would hide.
- Never deploy this publicly with a key in it. The `/api/blob` route is unauthenticated by design. Localhost only.
- Never paste a platform key into the hosted openhiggsfield.ai. It proxies the key through the anonymous author's server.

## Two Higgsfield products, two credentials

- The `higgsfield` CLI (mise node bin) talks to the consumer app backend (`fnf-api-gw.higgsfield.ai`, Clerk OAuth) and spends studio subscription credits. Model ids there look like `seedream_v5_pro`, `nano_banana_2`.
- This studio talks to the Platform API (`https://api.higgsfield.ai`, header `Authorization: Key id:secret`), billed separately per call. Keys come from console.higgsfield.ai. Model paths look like `higgsfield-ai/soul/v2/standard`, `marketing-studio/image`.
- Documented Platform models as of 2026-09-18: Soul Standard/2/Cinema, Grok Image 2, Marketing Studio Image, Recraft v4.1 Pro, Kling 3 (turbo/std/pro/4k), Seedance 2 and 2.5, Wan 3. Seedream is NOT on the Platform API. Many entries in the upstream catalog (Flux, Ideogram, Qwen, LTX, MiniMax, PixVerse, older Kling and Wan) have no docs page and may be dead; a failed run with "Invalid model" or 404 means that, not a bug here.
- Endpoint list: `curl -sL https://docs.higgsfield.ai/docs/sitemap.xml | rg -o 'docs/models/[a-z0-9./_-]*'`. Per-model docs at `docs.higgsfield.ai/docs/models/<slug>/<endpoint>.md` (append `.md` for raw markdown).

## Run

```bash
pnpm install --frozen-lockfile
pnpm dev            # http://localhost:3000
```

`.env.local` (gitignored) holds `HF_API_BASE_URL=https://api.higgsfield.ai` and `HF_API_KEY=id:secret` (our addition: env fallback when no key cookie is set). The UI Add key modal still works and wins over env. Reference and frame uploads need a Vercel Blob token in `OPEN_HIGGSFIELD_READ_WRITE_TOKEN`; text-only generation does not.

## Adding a model

One file in `src/generation/catalog/`, exported from `catalog/index.ts`. If the platform body is `prompt`, `aspect_ratio`, `resolution`, `duration`, `image_url(s)`, use `imageModel`/`videoModel` from `defaults.ts` with `paths`. Anything else gets a custom mapper in `to-platform.ts` (see `mapMarketingStudio`). Add the id prefix to `model-icon.tsx` if it should carry a brand icon. Verify with `pnpm exec tsc --noEmit && pnpm build`.

## Our changes on top of upstream

- `marketing-studio-image`: Platform Marketing Studio Image (campaign stills, up to 16 reference images, `quality` setting). Enhanced preset mode not wired yet.
- Cost ledger: every submit calls `POST /estimate/{model}` with the same body and appends a `submit` event to `data/ledger.jsonl` (gitignored); every terminal poll appends a `terminal` event. `pnpm ledger` prints per-model charged USD/AUD (completed runs only, net of account discount), `--runs`, `--csv`, `--since`, `--markup N` for client pricing. Seedance is token-metered and priced here from the platform formula at 480p/720p only; other cases show as unpriced. Rate in `LEDGER_AUD_PER_USD`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
