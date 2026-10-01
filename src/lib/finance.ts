/** Agregación de finanzas mensuales a partir de facturas pagadas y reembolsos de Stripe (importes en céntimos). */

export interface FinanceInvoice {
  /** Fecha de pago (segundos unix) */
  paidAt: number;
  /** Total cobrado, IVA incluido */
  total: number;
  /** IVA incluido en el total */
  tax: number;
  packName: string;
  /** Líneas de la factura (carritos con varios packs): importe cobrado de cada una */
  lines?: { name: string; gross: number }[];
}

export interface FinanceRefund {
  created: number;
  amount: number;
}

export interface MonthRow {
  /** YYYY-MM */
  key: string;
  gross: number;
  tax: number;
  refunds: number;
  /** Ingresos netos = cobrado − IVA − reembolsos */
  net: number;
  invoices: number;
}

const TZ = 'Europe/Madrid';

const monthFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' });

/** Mes (YYYY-MM) de un instante, en hora de Madrid. */
export function monthKey(unixSeconds: number): string {
  const parts = monthFmt.formatToParts(new Date(unixSeconds * 1000));
  const y = parts.find((p) => p.type === 'year')!.value;
  const m = parts.find((p) => p.type === 'month')!.value;
  return `${y}-${m}`;
}

/** Los últimos `count` meses terminando en el mes de `now`, del más antiguo al más reciente. */
export function lastMonthKeys(now: number, count: number): string[] {
  const [y, m] = monthKey(now).split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - (count - 1 - i), 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

export function buildMonths(invoices: FinanceInvoice[], refunds: FinanceRefund[], now: number, count = 12): MonthRow[] {
  const rows = new Map<string, MonthRow>(
    lastMonthKeys(now, count).map((key) => [key, { key, gross: 0, tax: 0, refunds: 0, net: 0, invoices: 0 }])
  );
  for (const inv of invoices) {
    const row = rows.get(monthKey(inv.paidAt));
    if (!row) continue;
    row.gross += inv.total;
    row.tax += inv.tax;
    row.invoices += 1;
  }
  for (const r of refunds) {
    const row = rows.get(monthKey(r.created));
    if (row) row.refunds += r.amount;
  }
  for (const row of rows.values()) row.net = row.gross - row.tax - row.refunds;
  return [...rows.values()];
}

export interface PackRow {
  name: string;
  net: number;
  invoices: number;
}

/** Ingresos netos de IVA por pack, de mayor a menor. */
export function byPack(invoices: FinanceInvoice[]): PackRow[] {
  const map = new Map<string, PackRow>();
  const add = (name: string, net: number) => {
    const key = name || 'Otros';
    const row = map.get(key) || { name: key, net: 0, invoices: 0 };
    row.net += net;
    row.invoices += 1;
    map.set(key, row);
  };
  for (const inv of invoices) {
    const net = inv.total - inv.tax;
    const lines = (inv.lines || []).filter((l) => l.gross > 0);
    const gross = lines.reduce((sum, l) => sum + l.gross, 0);
    if (lines.length > 1 && gross > 0) {
      // Factura con varios packs: el neto de la factura se reparte según lo que pesa cada línea
      for (const l of lines) add(l.name, net * (l.gross / gross));
    } else add(inv.packName || lines[0]?.name || '', net);
  }
  return [...map.values()].sort((a, b) => b.net - a.net);
}
