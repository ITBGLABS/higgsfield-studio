# Operating the studio

Last verified: 2026-09-18 (Blake, on the ITBG Labs Higgsfield Platform account).

This is the runbook for using the studio day to day, across ITBG Labs, ScentGraph, Bamboo and client jobs. For code structure and agent rules see CLAUDE.md.

## What it is

A local web app at localhost:3000 that sends prompts to the Higgsfield Platform API and keeps every result in a gallery. It is a fork of an anonymous open-source project, audited and pinned. It runs on this Mac only. Never deploy it and never paste the key into the hosted openhiggsfield.ai site.

## Start and stop

```bash
cd ~/Dev/work/itbglabs/higgsfield-studio
pnpm dev
```

Open localhost:3000. Stop with Ctrl+C in that terminal. The command must run inside the folder above, not the parent folder.

## Money

Two Higgsfield products, two wallets:

- The `higgsfield` CLI and the Higgsfield website spend your studio subscription credits.
- This studio spends the Platform API balance at console.higgsfield.ai, topped up in USD. Top-ups expire after one year.

A run that fails, gets moderated or is canceled is refunded. A completed run is charged.

Indicative prices on this account (15 percent discount applied where shown), from the platform's estimate endpoint on 2026-09-18:

| Model, settings | List USD | Net USD |
|---|---|---|
| Soul 2, 1080p still | 0.006 | 0.006 |
| Marketing Studio Image, 2k | 0.277 | 0.228 |
| Marketing Studio Image, 4k | 0.459 | 0.378 |
| Kling 3 Turbo, 5s 720p | 0.476 | 0.392 |
| Seedance 2.5, 5s 720p | 2.31 | not reported |
| Seedance 2.5, 15s 720p | 6.93 | not reported |

Seedance is priced per second times pixels and is the expensive one. Test concepts on Kling 3 Turbo at 5 seconds, then re-run the winner on Seedance if the motion quality is worth it. Feed heroes loop, so 5 seconds is nearly always enough.

## Tagging runs to a client

Before a session for a client, set the tag in `.env.local`:

```
LEDGER_CLIENT=bamboo
```

Save the file. The dev server reloads it within a second, no restart. Use short lowercase slugs and keep them consistent: `itbg`, `scentgraph`, `bamboo`, then one per client.

Every run records the tag, the model, the settings, the prompt and the platform's price estimate in `data/ledger.jsonl`. That file never leaves this machine and is not in git.

## Reading the ledger

```bash
pnpm ledger                     # per model, then per client, USD and AUD
pnpm ledger --client bamboo     # one client only
pnpm ledger --since 2026-09-01  # a billing period
pnpm ledger --runs              # every run, newest first, with prompt
pnpm ledger --markup 3          # adds a suggested sell price per unit
pnpm ledger --csv > runs.csv    # for a spreadsheet or an invoice appendix
```

The AUD figure uses `LEDGER_AUD_PER_USD` from `.env.local`. Update it when you top up at a different rate.

Charged amounts are the platform's estimate for completed runs. Reconcile against the billing page on console.higgsfield.ai before invoicing. Runs the platform prices in prose rather than numbers (Seedance at resolutions other than 480p and 720p) show as unpriced and need a manual figure.

## Pricing client work

Cost of generation is small next to the time spent prompting, selecting and compositing. A workable structure:

- Generation at cost times a markup (the `--markup` column) as a pass-through line.
- Creative time as the real fee.
- Keep the CSV for the job as the audit trail. Prompts are in it, which is also the reuse library for the next round.

## Models worth using

Only the models the platform documents are safe to rely on. The picker still shows upstream entries with no docs page (Flux, Ideogram, Qwen, LTX, MiniMax, PixVerse, older Kling and Wan). A 404 or "Invalid model" on one of those means the endpoint is dead, not that the studio is broken.

- Stills: Marketing Studio Image (campaign stills, up to 16 reference images, use it for product and brand work), Soul 2 and Soul Cinema (people and portraits), Grok Image 2, Recraft.
- Video: Kling 3 Turbo (fast, cheap, concept testing), Seedance 2.5 (best motion, expensive, finals), Wan 3.
- Seedream is not on the Platform API. For Seedream stills use the `higgsfield` CLI on studio credits.

## Prompting

The house rules from the CLI work carry over:

- State the design job first: where the headline sits, what the asset is for.
- Ban failure modes by name: no people, no text, no logos, no floating symbols, no charts.
- 30 to 80 words. Explicit light direction. Film texture cue if you want grain.
- Keep phone screens blank or a plain glow and composite the real UI in Remotion. Generated UI text is always gibberish.
- For regulated clients (betting, crypto, finance) avoid rising charts, coins and anything that reads as a returns claim. Show the product mechanic instead.

## Reference images

Uploading start frames, end frames and reference images needs a Vercel Blob token in `OPEN_HIGGSFIELD_READ_WRITE_TOKEN`. Text-only generation works without it. Not set up yet.

## Outputs

The platform keeps results for at least seven days, then may delete them. Download anything you want to keep the same day. Use the gallery's bulk download and file the assets under the client's folder.

## Updating the code

Do not pull from the original repo. There is no upstream remote on purpose. If a new upstream feature is wanted, an agent fetches the specific commit into a scratch clone, reads the whole diff, then cherry-picks. Details in CLAUDE.md.
