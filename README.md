# higgsfield-studio

ITBG Labs' local image and video studio over the Higgsfield Platform API, with a cost ledger for pricing client work.

Forked from [wide-trace/open-higgsfield](https://github.com/wide-trace/open-higgsfield) at commit b16a0ef on 2026-09-18 and audited before use. The original has no license and an anonymous author; this fork does not track it. See CLAUDE.md for the trust policy.

- **Operating runbook** (start, money, client tagging, ledger, prompting): [docs/OPERATING.md](docs/OPERATING.md)
- **Code and agent rules** (provenance, two credentials, adding a model): [CLAUDE.md](CLAUDE.md)

## Quick start

```bash
cd ~/Dev/work/itbglabs/higgsfield-studio
pnpm install --frozen-lockfile
pnpm dev          # localhost:3000
pnpm ledger       # cost report from data/ledger.jsonl
```

`.env.local` (gitignored) holds the Platform API origin, the key as `id:secret`, the AUD rate and the active client tag.

## What is ours on top of upstream

- Marketing Studio Image catalog entry (campaign stills, up to 16 reference images).
- `HF_API_KEY` env fallback so the key never has to be typed into the browser.
- Cost ledger: every run is priced through the platform's estimate endpoint, tagged to a client, and logged; `pnpm ledger` reports USD and AUD per model and per client.

Runs on localhost only. Never deploy with a key in it.
