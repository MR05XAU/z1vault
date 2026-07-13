// Minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes ("")
// and commas/newlines inside quotes. Good enough for spreadsheet exports.
function parseCsvRows(text: string): string[][] {
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
    } else if (c === ",") {
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
export function parseTradesCsv(text: string): CsvImportResult {
  const rows = parseCsvRows(text);
  if (rows.length === 0) return { trades: [], errors: ["File is empty."] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
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
