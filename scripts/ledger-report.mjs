#!/usr/bin/env node
/* Per-model cost report from data/ledger.jsonl.

   pnpm ledger                     summary table, all time
   pnpm ledger --since 2026-09-01  only runs submitted on or after that date
   pnpm ledger --markup 3          add a suggested client price column (x list)
   pnpm ledger --csv               one row per run, for a spreadsheet
   pnpm ledger --runs              one line per run, newest first
   pnpm ledger --client bamboo     only runs tagged with that client (LEDGER_CLIENT)

   AUD figures use LEDGER_AUD_PER_USD from .env.local (default 1.45).
   Only "completed" runs are charged: the platform refunds failed, nsfw and
   canceled. Runs still in flight (no terminal event yet) are listed as open. */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : (args[i + 1] ?? true);
};
const since = flag("--since") ? new Date(String(flag("--since"))) : null;
const markup = Number(flag("--markup") ?? 0) || 0;
const asCsv = args.includes("--csv");
const asRuns = args.includes("--runs");
const client = flag("--client") ? String(flag("--client")).toLowerCase() : null;
const AUD = Number(readEnv("LEDGER_AUD_PER_USD") ?? 1.45);

const file = resolve(process.cwd(), "data/ledger.jsonl");
if (!existsSync(file)) {
  console.log("No ledger yet. Run a generation and data/ledger.jsonl appears.");
  process.exit(0);
}

const runs = new Map();
for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line.trim()) continue;
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }
  if (event.type === "submit") {
    runs.set(event.requestId, { ...event, status: "open", finishedAt: null });
  } else if (event.type === "terminal") {
    const run = runs.get(event.requestId);
    if (run && run.status === "open") {
      run.status = event.status;
      run.finishedAt = event.ts;
    }
  }
}

let list = [...runs.values()].sort((a, b) => (a.ts < b.ts ? 1 : -1));
if (since) list = list.filter((run) => new Date(run.ts) >= since);
if (client) list = list.filter((run) => (run.client ?? "").toLowerCase() === client);

const price = (run) => run.estimate?.usdNet ?? run.estimate?.usdList ?? null;
const charged = (run) => (run.status === "completed" ? price(run) : run.status === "open" ? null : 0);

if (asCsv) {
  const cols = ["ts", "requestId", "client", "model", "path", "surface", "status", "resolution", "aspectRatio", "duration", "credits", "usdList", "usdNet", "chargedUsd", "chargedAud", "prompt"];
  console.log(cols.join(","));
  for (const run of list) {
    const c = charged(run);
    const row = [
      run.ts, run.requestId, run.client ?? "", run.model, run.path, run.surface, run.status,
      run.settings?.resolution ?? "", run.settings?.aspectRatio ?? "", run.settings?.duration ?? "",
      run.estimate?.credits ?? "", run.estimate?.usdList ?? "", run.estimate?.usdNet ?? "",
      c ?? "", c === null ? "" : (c * AUD).toFixed(4),
      JSON.stringify(run.prompt ?? ""),
    ];
    console.log(row.join(","));
  }
  process.exit(0);
}

if (asRuns) {
  for (const run of list) {
    const c = charged(run);
    console.log(
      `${run.ts.slice(0, 16)}  ${pad(run.client ?? "-", 10)} ${pad(run.model, 24)} ${pad(run.status, 10)} ${money(price(run))} est  ${c === null ? "   open" : money(c)} charged  ${(run.prompt ?? "").slice(0, 60)}`,
    );
  }
  process.exit(0);
}

const byModel = new Map();
for (const run of list) {
  const row = byModel.get(run.model) ?? { model: run.model, runs: 0, completed: 0, refunded: 0, open: 0, unpriced: 0, usd: 0, list: 0 };
  row.runs += 1;
  if (run.status === "completed") row.completed += 1;
  else if (run.status === "open") row.open += 1;
  else row.refunded += 1;
  const p = price(run);
  if (p === null) row.unpriced += 1;
  else if (run.status === "completed") {
    row.usd += p;
    row.list += run.estimate?.usdList ?? p;
  }
  byModel.set(run.model, row);
}

const rows = [...byModel.values()].sort((a, b) => b.usd - a.usd);
const head = ["model", "runs", "done", "refund", "open", "unpriced", "charged USD", "charged AUD", "avg USD/done"];
if (markup) head.push(`sell @${markup}x USD/unit`);
console.log(head.map((h, i) => pad(h, i === 0 ? 26 : 12)).join(""));
let totalUsd = 0;
for (const r of rows) {
  totalUsd += r.usd;
  const avg = r.completed ? r.usd / r.completed : null;
  const cells = [
    pad(r.model, 26), pad(r.runs, 12), pad(r.completed, 12), pad(r.refunded, 12), pad(r.open, 12), pad(r.unpriced, 12),
    pad(money(r.usd), 12), pad(money(r.usd * AUD), 12), pad(avg === null ? "-" : money(avg), 12),
  ];
  if (markup) cells.push(pad(avg === null ? "-" : money(avg * markup), 12));
  console.log(cells.join(""));
}
const byClient = new Map();
for (const run of list) {
  const key = run.client ?? "(untagged)";
  const c = charged(run);
  byClient.set(key, (byClient.get(key) ?? 0) + (c ?? 0));
}
if (byClient.size > 1 || (byClient.size === 1 && !byClient.has("(untagged)"))) {
  console.log("");
  console.log(pad("client", 26) + pad("charged USD", 12) + pad("charged AUD", 12));
  for (const [name, usd] of [...byClient].sort((a, b) => b[1] - a[1])) {
    console.log(pad(name, 26) + pad(money(usd), 12) + pad(money(usd * AUD), 12));
  }
}
console.log("");
console.log(`Total charged: ${money(totalUsd)} USD, ${money(totalUsd * AUD)} AUD (rate ${AUD} AUD per USD). ${list.length} runs${since ? ` since ${since.toISOString().slice(0, 10)}` : ""}.`);
console.log("Charged = platform estimate for completed runs, net of your account discount where reported. Verify against console.higgsfield.ai billing; unpriced runs need a manual figure.");

function pad(value, width) {
  return String(value).padEnd(width);
}
function money(value) {
  return value === null || value === undefined ? "-" : `$${Number(value).toFixed(3)}`;
}
function readEnv(name) {
  if (process.env[name]) return process.env[name];
  const envFile = resolve(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return null;
  const match = new RegExp(`^${name}=(.*)$`, "m").exec(readFileSync(envFile, "utf8"));
  return match ? match[1].trim() : null;
}
