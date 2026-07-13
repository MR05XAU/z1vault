// Excel on UK/EU locales often exports ";"-delimited CSVs (with a UTF-8 BOM)
// instead of ",". Sniff the header line so both forms import cleanly.
function detectDelimiter(firstLine: string): string {
  let best = ",";
  let bestCount = 0;
  for (const c of [",", ";", "\t"]) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) { bestCount = count; best = c; }
  }
  return best;
}

// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes ("")
// and delimiters/newlines inside quotes. Good enough for spreadsheet exports.
function parseCsvRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // skip, \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export interface ImportedTrade {
  pair: string;
  direction: "long" | "short";
  entry_price: number;
  exit_price: number | null;
  size: number;
  fees: number;
  strategy: string | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  // Set only when the source file supplies an authoritative pnl (e.g. a
  // futures broker export, where price-diff * size ignores per-contract
  // tick value). undefined means "recompute from entry/exit/size/fees".
  pnl?: number | null;
}

// Parses "$1,160.00" / "$(42.00)" (parens = negative) broker money formats.
function parseMoney(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const negative = s.includes("(") && s.includes(")");
  const n = Number(s.replace(/[()$,]/g, ""));
  if (Number.isNaN(n)) return null;
  return negative ? -Math.abs(n) : n;
}

// A common futures-broker "trade performance" export format (e.g.
// NinjaTrader): symbol/qty/buyPrice/sellPrice/pnl/boughtTimestamp/
// soldTimestamp instead of this app's own pair/direction/entry_price/...
// columns. Direction is inferred from which timestamp comes first.
const BROKER_REQUIRED = ["symbol", "qty", "buyprice", "sellprice", "boughttimestamp", "soldtimestamp"];

function isBrokerSchema(header: string[]): boolean {
  return BROKER_REQUIRED.every((c) => header.includes(c));
}

// Explicit "MM/DD/YYYY HH:mm:ss" parse instead of new Date(string) — generic
// slash-date string parsing is inconsistent across browsers (notably iOS Safari).
function parseBrokerTimestamp(s: string): Date {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return new Date(NaN);
  const [mo, da, yr, hh, mi, se] = m.slice(1).map(Number);
  return new Date(yr, mo - 1, da, hh, mi, se);
}

function parseBrokerCsv(header: string[], rows: string[][]): CsvImportResult {
  const idx = (name: string) => header.indexOf(name);
  const iSymbol = idx("symbol"), iQty = idx("qty"), iBuy = idx("buyprice"), iSell = idx("sellprice"),
    iPnl = idx("pnl"), iBought = idx("boughttimestamp"), iSold = idx("soldtimestamp");

  const trades: ImportedTrade[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const lineNo = r + 1;
    const get = (i: number) => (i === -1 ? "" : (cols[i] ?? "").trim());

    const symbol = get(iSymbol).toUpperCase();
    const qty = Number(get(iQty));
    const buyPrice = Number(get(iBuy));
    const sellPrice = Number(get(iSell));
    const bought = parseBrokerTimestamp(get(iBought));
    const sold = parseBrokerTimestamp(get(iSold));

    if (!symbol) { errors.push(`Row ${lineNo}: missing symbol`); continue; }
    if (!qty || Number.isNaN(qty)) { errors.push(`Row ${lineNo}: invalid qty`); continue; }
    if (Number.isNaN(buyPrice) || Number.isNaN(sellPrice)) { errors.push(`Row ${lineNo}: invalid buyPrice/sellPrice`); continue; }
    if (Number.isNaN(bought.getTime()) || Number.isNaN(sold.getTime())) { errors.push(`Row ${lineNo}: invalid boughtTimestamp/soldTimestamp`); continue; }

    const long = bought.getTime() <= sold.getTime();
    trades.push({
      pair: symbol,
      direction: long ? "long" : "short",
      entry_price: long ? buyPrice : sellPrice,
      exit_price: long ? sellPrice : buyPrice,
      size: qty,
      fees: 0,
      strategy: null,
      opened_at: (long ? bought : sold).toISOString(),
      closed_at: (long ? sold : bought).toISOString(),
      notes: null,
      pnl: iPnl === -1 ? undefined : parseMoney(get(iPnl)),
    });
  }

  return { trades, errors };
}

export interface CsvImportResult {
  trades: ImportedTrade[];
  errors: string[];
}

const REQUIRED = ["pair", "direction", "entry_price", "size", "opened_at"];

/**
 * Parses a CSV matching the app's own export format (and tolerant of the
 * same columns supplied in any order): pair, direction, entry_price,
 * exit_price, size, fees, strategy, opened_at, closed_at, notes.
 * "pnl" and "id" columns, if present, are ignored — pnl is recomputed.
 */
export function parseTradesCsv(rawText: string): CsvImportResult {
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;
  const firstLine = text.slice(0, text.search(/\r?\n/) === -1 ? text.length : text.search(/\r?\n/));
  const rows = parseCsvRows(text, detectDelimiter(firstLine));
  if (rows.length === 0) return { trades: [], errors: ["File is empty."] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  if (isBrokerSchema(header)) return parseBrokerCsv(header, rows);

  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) {
    return { trades: [], errors: [`Missing required column(s): ${missing.join(", ")}`] };
  }
  const idx = (name: string) => header.indexOf(name);

  const trades: ImportedTrade[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const get = (name: string) => {
      const i = idx(name);
      return i === -1 ? "" : (cols[i] ?? "").trim();
    };
    const lineNo = r + 1;

    const pair = get("pair").toUpperCase();
    const direction = get("direction").toLowerCase();
    const entry = get("entry_price");
    const size = get("size");
    const opened = get("opened_at");

    if (!pair) { errors.push(`Row ${lineNo}: missing pair`); continue; }
    if (direction !== "long" && direction !== "short") { errors.push(`Row ${lineNo}: direction must be "long" or "short"`); continue; }
    const entryNum = Number(entry);
    if (!entry || Number.isNaN(entryNum)) { errors.push(`Row ${lineNo}: invalid entry_price`); continue; }
    const sizeNum = Number(size);
    if (!size || Number.isNaN(sizeNum)) { errors.push(`Row ${lineNo}: invalid size`); continue; }
    const openedDate = new Date(opened);
    if (!opened || Number.isNaN(openedDate.getTime())) { errors.push(`Row ${lineNo}: invalid opened_at date`); continue; }

    const exitRaw = get("exit_price");
    const exitNum = exitRaw ? Number(exitRaw) : null;
    if (exitRaw && Number.isNaN(exitNum)) { errors.push(`Row ${lineNo}: invalid exit_price`); continue; }

    const feesRaw = get("fees");
    const feesNum = feesRaw ? Number(feesRaw) : 0;

    const closedRaw = get("closed_at");
    let closedIso: string | null = null;
    if (closedRaw) {
      const d = new Date(closedRaw);
      if (Number.isNaN(d.getTime())) { errors.push(`Row ${lineNo}: invalid closed_at date`); continue; }
      closedIso = d.toISOString();
    } else if (exitNum != null) {
      closedIso = openedDate.toISOString();
    }

    trades.push({
      pair,
      direction: direction as "long" | "short",
      entry_price: entryNum,
      exit_price: exitNum,
      size: sizeNum,
      fees: feesNum,
      strategy: get("strategy") || null,
      opened_at: openedDate.toISOString(),
      closed_at: closedIso,
      notes: get("notes") || null,
    });
  }

  return { trades, errors };
}
