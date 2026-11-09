import { test } from "node:test";
import assert from "node:assert/strict";
import { summarizePurchases } from "../src/lib/purchases";
import { seed, applyDemo } from "../src/lib/demo";
import { commandSchema } from "../src/lib/domain";
test("compras no mezclan sacos y kg ni productos distintos", () => {
  const s = seed(),
    a = s.products[0],
    b = s.products[2],
    now = new Date().toISOString();
  const moves = [
    {
      ...s.movements[0],
      id: "a",
      product_id: a.id,
      quantity: 10,
      unit_cost: 20,
      created_at: now,
    },
    {
      ...s.movements[0],
      id: "b",
      product_id: b.id,
      quantity: 100,
      unit_cost: 1,
      created_at: now,
    },
    {
      ...s.movements[0],
      id: "c",
      product_id: a.id,
      quantity: 10,
      unit_cost: 30,
      created_at: now,
    },
  ];
  const result = summarizePurchases(moves, s.products);
  assert.equal(result.total, 600);
  assert.equal(result.rows.length, 2);
  assert.deepEqual(
    result.rows.map((g) => [g.unit, g.quantity, g.average]),
    [
      ["saco", 20, 25],
      ["kg", 100, 1],
    ],
  );
});
test("costo cero se incluye; sin costo y salidas se excluyen", () => {
  const s = seed();
  const result = summarizePurchases(
    [
      { ...s.movements[0], unit_cost: 0 },
      { ...s.movements[0], id: "b", unit_cost: null },
      {
        ...s.movements[0],
        id: "c",
        kind: "salida",
        quantity: -10,
        unit_cost: 20,
      },
    ],
    s.products,
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.total, 0);
  assert.equal(result.rows[0].quantity, 120);
});
test("costo de entrada valida centavos y se conserva en demo", () => {
  const s = seed();
  const command = {
    type: "movement",
    request_id: crypto.randomUUID(),
    product_id: s.products[0].id,
    direction: "entrada",
    quantity: 2,
    unit_cost: 14.25,
    reason: "Compra prueba",
    partner_id: "",
  };
  const next = applyDemo(s, commandSchema.parse(command));
  assert.equal(next.movements[0].unit_cost, 14.25);
  assert.equal(
    commandSchema.safeParse({ ...command, unit_cost: 1.234 }).success,
    false,
  );
});
