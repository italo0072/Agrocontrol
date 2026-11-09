import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDemo, seed } from "../src/lib/demo";
import {
  commandSchema,
  csv,
  can,
  lineTotal,
  type Command,
} from "../src/lib/domain";
const id = () => crypto.randomUUID();
const sale = (s = seed(), quantity = 2): Command => ({
  type: "sale",
  request_id: id(),
  customer_id: s.partners[0].id,
  notes: "Venta de prueba",
  items: [{ product_id: s.products[0].id, quantity }],
});
test("venta descuenta stock y conserva el precio y unidad", () => {
  const s = seed(),
    n = applyDemo(s, sale(s));
  assert.equal(n.products[0].stock, 118);
  assert.equal(n.sales[0].total, 65);
  assert.equal(n.sales[0].items[0].unit, "saco");
  assert.equal(s.products[0].stock, 120);
});
test("rechaza sobreventa sin modificar ningún producto", () => {
  const s = seed();
  const before = structuredClone(s);
  assert.throws(() =>
    applyDemo(s, {
      ...sale(s),
      items: s.products.map((p) => ({
        product_id: p.id,
        quantity: p.id === s.products[1].id ? 1000 : 1,
      })),
    } as Command),
  );
  assert.deepEqual(s, before);
});
test("idempotencia: reintentar venta y entrada no duplica", () => {
  const s = seed(),
    c = sale(s),
    n = applyDemo(s, c);
  assert.deepEqual(applyDemo(n, c), n);
  const m: Command = {
    type: "movement",
    request_id: id(),
    product_id: s.products[0].id,
    direction: "entrada",
    quantity: 3,
    reason: "Compra",
    partner_id: "",
  };
  const o = applyDemo(n, m);
  assert.deepEqual(applyDemo(o, m), o);
});
test("anulación devuelve stock una sola vez", () => {
  const s = applyDemo(seed(), sale()),
    c: Command = {
      type: "cancel",
      sale_id: s.sales[0].id,
      reason: "Error de captura",
    },
    n = applyDemo(s, c);
  assert.equal(n.products[0].stock, 120);
  assert.equal(n.sales[0].status, "anulada");
  assert.throws(() => applyDemo(n, c));
});
test("roles impiden mutaciones fuera de su responsabilidad", () => {
  assert.equal(can("lectura", "sale"), false);
  assert.equal(can("bodega", "product"), false);
  assert.equal(can("ventas", "movement"), false);
  assert.equal(can("admin", "product"), true);
  assert.throws(() => applyDemo({ ...seed(), role: "lectura" }, sale()));
});
test("catálogo rechaza códigos duplicados y cambio de unidad con movimientos", () => {
  const s = seed(),
    { stock, created_at, id: pid, ...d } = s.products[0];
  assert.throws(() => applyDemo(s, { type: "product", data: d }));
  assert.throws(() =>
    applyDemo(s, { type: "product", data: { ...d, id: pid, unit: "kg" } }),
  );
});
test("validación rechaza cantidad negativa, duplicados, valores no finitos y precisión extra", () => {
  const s = seed();
  for (const n of [-1, 0, NaN, Infinity, 1.0001])
    assert.equal(commandSchema.safeParse(sale(s, n)).success, false);
  const c = sale(s) as Extract<Command, { type: "sale" }>;
  c.items.push(c.items[0]);
  assert.equal(commandSchema.safeParse(c).success, false);
});
test("redondeo monetario por renglón y CSV seguro", () => {
  assert.equal(lineTotal(1.005, 10), 10.05);
  const result = csv([["=2+2", 'a"b', -2]]);
  assert.ok(result.includes("'=2+2"));
  assert.ok(result.includes('a""b'));
  assert.ok(result.includes('"-2"'));
});
