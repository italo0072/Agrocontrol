import { lineTotal, type Movement, type Product } from "./domain";
export function summarizePurchases(moves: Movement[], products: Product[]) {
  const groups = new Map<
    string,
    {
      product_id: string;
      name: string;
      unit: string;
      quantity: number;
      spend: number;
      average: number;
    }
  >();
  for (const m of moves) {
    if (m.kind !== "entrada" || m.unit_cost == null) continue;
    const p = products.find((p) => p.id === m.product_id);
    const key = `${m.product_id}:${p?.unit || "desconocida"}`;
    const g = groups.get(key) ?? {
      product_id: m.product_id,
      name: p?.name || m.product_id,
      unit: p?.unit || "Sin unidad",
      quantity: 0,
      spend: 0,
      average: 0,
    };
    g.quantity = Math.round((g.quantity + m.quantity) * 1000) / 1000;
    g.spend = lineTotal(1, g.spend + lineTotal(m.quantity, m.unit_cost));
    g.average = g.quantity ? g.spend / g.quantity : 0;
    groups.set(key, g);
  }
  const rows = Array.from(groups.values());
  return {
    rows,
    total: lineTotal(
      1,
      rows.reduce((s, g) => s + g.spend, 0),
    ),
  };
}
