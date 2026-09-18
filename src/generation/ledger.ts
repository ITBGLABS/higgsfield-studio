/* Append-only run ledger for pricing. Server only.

   Every submit writes one "submit" event carrying the platform's own estimate
   for the exact body sent (POST /estimate/{model}), and every terminal poll
   writes one "terminal" event. Failed, nsfw and canceled runs are refunded by
   the platform, so the report charges only "completed".

   File: data/ledger.jsonl (gitignored). Read it with `pnpm ledger`. */

import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type Estimate = {
  /** Platform list price, before the account discount. */
  credits: number | null;
  usdList: number | null;
  /** List price minus the account discount, when the platform reports one. */
  usdNet: number | null;
  /** Token-metered models answer with prose instead of a number; kept verbatim. */
  description: string | null;
  /** True when usdList was computed here from the prose formula, not returned. */
  computed: boolean;
};

export type LedgerEvent =
  | {
      type: "submit";
      ts: string;
      requestId: string;
      model: string;
      path: string;
      surface: "image" | "video";
      prompt: string;
      settings: Record<string, unknown>;
      estimate: Estimate | null;
    }
  | { type: "terminal"; ts: string; requestId: string; status: string };

const LEDGER_FILE = path.join(process.cwd(), "data", "ledger.jsonl");
const TERMINAL = new Set(["completed", "failed", "nsfw", "canceled"]);
const terminalSeen = new Set<string>();

export async function recordLedger(event: LedgerEvent): Promise<void> {
  try {
    await mkdir(path.dirname(LEDGER_FILE), { recursive: true });
    await appendFile(LEDGER_FILE, `${JSON.stringify(event)}\n`, "utf8");
  } catch (caught) {
    console.warn("[ledger] write failed", caught instanceof Error ? caught.message : caught);
  }
}

/** Writes the terminal event once per request per server process. Polls repeat
    the same terminal status until the client stops watching; the report also
    dedupes, so a hot reload that resets this set costs nothing. */
export async function recordTerminal(requestId: string, status: string): Promise<void> {
  if (!TERMINAL.has(status) || terminalSeen.has(requestId)) return;
  terminalSeen.add(requestId);
  await recordLedger({ type: "terminal", ts: new Date().toISOString(), requestId, status });
}

/** Maps the two estimate shapes the platform returns:
    {type:"estimate", credits, usd, discount:{usd}} and
    {type:"description", pricing_description}. */
export function parseEstimate(payload: unknown, settings: Record<string, unknown>): Estimate | null {
  if (payload === null || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  if (data.type === "estimate") {
    const usdList = num(data.usd);
    const discount =
      data.discount && typeof data.discount === "object"
        ? num((data.discount as Record<string, unknown>).usd)
        : null;
    return {
      credits: num(data.credits),
      usdList,
      usdNet: usdList !== null ? round(usdList - (discount ?? 0)) : null,
      description: null,
      computed: false,
    };
  }
  if (data.type === "description" && typeof data.pricing_description === "string") {
    const usdList = tokenMeteredUsd(data.pricing_description, settings);
    return { credits: null, usdList, usdNet: null, description: data.pricing_description, computed: usdList !== null };
  }
  return null;
}

/* Seedance prices by video tokens: ceil(seconds × width × height × 24 / 1024),
   at a per-1,000-token rate quoted in the prose for 480p/720p. Other
   resolutions are left unpriced rather than guessed. */
function tokenMeteredUsd(description: string, settings: Record<string, unknown>): number | null {
  const rate = /At 480p or 720p, each 1,000 video tokens cost \$([0-9.]+)/.exec(description);
  const seconds = Number(settings.duration);
  const resolution = String(settings.resolution ?? "");
  const aspect = String(settings.aspectRatio ?? "16:9");
  if (!rate || !Number.isFinite(seconds) || !["480p", "720p"].includes(resolution)) return null;
  const short = resolution === "480p" ? 480 : 720;
  const [a, b] = aspect.split(":").map(Number);
  if (!a || !b) return null;
  const long = Math.round((short * Math.max(a, b)) / Math.min(a, b));
  const width = a >= b ? long : short;
  const height = a >= b ? short : long;
  const tokens = Math.ceil((seconds * width * height * 24) / 1024);
  return round((tokens / 1000) * Number(rate[1]));
}

function num(value: unknown): number | null {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
