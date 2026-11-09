import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { applyDemo, seed, upgradeDemo } from "../src/lib/demo";
import {
  numericDraft,
  requiredNumber,
  commandSchema,
  type Command,
  type Snapshot,
} from "../src/lib/domain";
import { authMessage } from "../src/lib/auth-errors";
test("campos numéricos se vacían sin convertirlos a cero", () => {
  assert.equal(numericDraft(""), "");
  assert.equal(numericDraft("04"), "4");
  assert.equal(numericDraft("0004"), "4");
  assert.equal(numericDraft("0.04"), "0.04");
  assert.equal(requiredNumber("0"), 0);
  assert.throws(() => requiredNumber(""));
  assert.throws(() => requiredNumber(" "));
});
test("categorías demo se renombraron sin perder asignaciones", () => {
  const s = seed(),
    old = s.categories.find((c) => c.name === s.products[0].category)!;
  const next = applyDemo(s, {
    type: "category",
    data: { ...old, name: "Insumos de cafetal" },
  });
  assert.equal(next.products[0].category, "Insumos de cafetal");
  assert.equal(s.products[0].category, "Nitrogenado");
  assert.throws(() =>
    applyDemo(next, {
      type: "category",
      data: { name: "insumos de cafetal", active: true },
    }),
  );
});
test("perfil, finca y pagos demo aplican permisos e idempotencia", () => {
  let s = applyDemo(seed(), {
    type: "profile",
    data: { full_name: "Ana", phone: "70000000" },
  });
  s = applyDemo(s, {
    type: "farm",
    data: { farm_name: "Finca Nueva", location: "Usulután" },
  });
  const c: Command = {
    type: "payment",
    request_id: crypto.randomUUID(),
    data: {
      partner_id: s.partners[2].id,
      amount: 25.5,
      paid_on: "2000-01-01",
      method: "efectivo",
      reference: "R-1",
      reason: "Entrega de café",
    },
  };
  s = applyDemo(s, c);
  assert.equal(s.payments[0].amount, 25.5);
  assert.deepEqual(applyDemo(s, c), s);
  const next = applyDemo(s, {
    type: "cancel_payment",
    payment_id: s.payments[0].id,
    reason: "Error",
  });
  assert.equal(next.payments[0].status, "anulado");
  assert.throws(() =>
    applyDemo(next, {
      type: "cancel_payment",
      payment_id: s.payments[0].id,
      reason: "Otra vez",
    }),
  );
  assert.throws(() => applyDemo({ ...s, role: "bodega" }, c));
});
test("actualizar demos antiguas conserva productos y stock", () => {
  const s = seed();
  const { categories, payments, profile, farm, ...old } = s;
  const next = upgradeDemo(old as Snapshot);
  assert.deepEqual(next.products, s.products);
  assert.deepEqual(next.movements, s.movements);
  assert.ok(next.categories.length);
  assert.equal(next.payments.length, 0);
});
test("errores de Auth distinguen credenciales, confirmación y límites", () => {
  assert.match(authMessage({ code: "invalid_credentials" }), /contraseña/);
  assert.match(authMessage({ code: "email_not_confirmed" }), /Confirma/);
  assert.match(authMessage({ code: "over_email_send_rate_limit" }), /límite/);
});
test("migración V2 conserva datos y protege configuración y pagos", async (t) => {
  const db = new PGlite();
  const admin = "00000000-0000-4000-8000-000000000001",
    reader = "00000000-0000-4000-8000-000000000002",
    bodega = "00000000-0000-4000-8000-000000000003";
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(await readFile("tests/fixtures/schema_v1.sql", "utf8"));
    await db.exec(
      `insert into auth.users values('${admin}'),('${reader}'),('${bodega}');insert into public.profiles(id,email,role) values('${admin}','admin@finca.local','admin'),('${reader}','lector@finca.local','lectura'),('${bodega}','bodega@finca.local','bodega');`,
    );
    async function as(id: string) {
      await db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
      );
    }
    async function cmd(c: unknown) {
      return (
        await db.query<{ id: string }>(
          "select public.execute_command($1::jsonb) as id",
          [JSON.stringify(c)],
        )
      ).rows[0].id;
    }
    await as(admin);
    const baseProduct = {
      sku: "CAF-OLD",
      name: "Producto existente",
      category: "Compuesto",
      unit: "saco",
      presentation: "50 kg",
      price: 10,
      min_stock: 0,
      active: true,
    };
    const pid = await cmd({ type: "product", data: baseProduct });
    await cmd({
      type: "movement",
      request_id: crypto.randomUUID(),
      product_id: pid,
      direction: "entrada",
      quantity: 12,
      reason: "Anterior a migración",
      partner_id: "",
    });
    await db.exec("reset role");
    await db.exec(
      await readFile("supabase/004_reparacion_tailwind.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/004_reparacion_tailwind.sql", "utf8"),
    );
    await as(admin);
    await t.test("datos y stock previos siguen presentes", async () => {
      const rows = (
        await db.query<{ stock: number }>(
          "select stock from public.products where id=$1",
          [pid],
        )
      ).rows;
      assert.equal(rows.length, 1);
      assert.equal(Number(rows[0].stock), 12);
      assert.equal(
        (await db.query("select * from public.movements")).rows.length,
        1,
      );
    });
    const cat = await cmd({
      type: "category",
      data: { name: "Café especial", active: true },
    });
    await t.test("categorías dinámicas y unidades de café", async () => {
      const coffee = await cmd({
        type: "product",
        data: {
          ...baseProduct,
          sku: "CAF-NEW",
          category: "Café especial",
          unit: "quintal",
        },
      });
      await cmd({
        type: "category",
        data: { id: cat, name: "Café pergamino", active: true },
      });
      assert.equal(
        (
          await db.query<{ category: string }>(
            "select category from public.products where id=$1",
            [coffee],
          )
        ).rows[0].category,
        "Café pergamino",
      );
      await assert.rejects(() =>
        cmd({
          type: "category",
          data: { name: "café pergamino", active: true },
        }),
      );
      await cmd({
        type: "category",
        data: { id: cat, name: "Café pergamino", active: false },
      });
      await assert.rejects(() =>
        cmd({
          type: "product",
          data: {
            ...baseProduct,
            sku: "NO-ACTIVE",
            category: "Café pergamino",
          },
        }),
      );
    });
    await t.test(
      "perfiles solo permiten editar nombre/teléfono propios",
      async () => {
        await as(reader);
        await cmd({
          type: "profile",
          data: {
            id: admin,
            full_name: "Lector",
            phone: "70000000",
            role: "admin",
          },
        });
        const me = (
          await db.query<{ full_name: string; role: string }>(
            "select full_name,role from public.profiles",
          )
        ).rows[0];
        assert.equal(me.full_name, "Lector");
        assert.equal(me.role, "lectura");
        await assert.rejects(() =>
          cmd({
            type: "farm",
            data: { farm_name: "No autorizado", location: "" },
          }),
        );
        await assert.rejects(() =>
          cmd({
            type: "category",
            data: { name: "No autorizado", active: true },
          }),
        );
        await assert.rejects(() =>
          db.query("select public.execute_command_v1($1::jsonb)", [
            JSON.stringify({ type: "product", data: baseProduct }),
          ]),
        );
        await as(admin);
      },
    );
    const producer = await cmd({
      type: "partner",
      data: {
        name: "Productor de café",
        kind: "productor",
        document: "",
        email: "",
        phone: "",
        active: true,
      },
    });
    await t.test(
      "recepción desde productor conserva contacto de origen",
      async () => {
        await cmd({
          type: "movement",
          request_id: crypto.randomUUID(),
          product_id: pid,
          direction: "entrada",
          quantity: 2,
          reason: "Recepción de café",
          unit_cost: 12.34,
          partner_id: producer,
        });
        assert.equal(
          Number(
            (
              await db.query<{ stock: number }>(
                "select stock from public.products where id=$1",
                [pid],
              )
            ).rows[0].stock,
          ),
          14,
        );
      },
    );
    const receipt = (
      await db.query<{ unit_cost: number }>(
        "select unit_cost from public.movements where reason='Recepción de café'",
      )
    ).rows[0];
    assert.equal(Number(receipt.unit_cost), 12.34);
    const purchaseMetrics = (
      await db.query<{ m: { month_purchase_total: number } }>(
        "select public.dashboard_metrics() as m",
      )
    ).rows[0].m;
    assert.equal(Number(purchaseMetrics.month_purchase_total), 24.68);
    await assert.rejects(() =>
      cmd({
        type: "movement",
        request_id: crypto.randomUUID(),
        product_id: pid,
        direction: "entrada",
        quantity: 1,
        unit_cost: 1.001,
        reason: "Costo inválido",
        partner_id: "",
      }),
    );
    const paid = (
      await db.query<{ d: string }>(
        "select to_char(now() at time zone 'America/El_Salvador','YYYY-MM-DD') as d",
      )
    ).rows[0].d;
    const payment = {
      type: "payment",
      request_id: crypto.randomUUID(),
      data: {
        partner_id: producer,
        amount: 125.5,
        paid_on: paid,
        method: "efectivo",
        reference: "REC-01",
        reason: "Liquidación de entrega",
      },
    };
    let paymentId = "";
    await t.test("pagos idempotentes, positivos y auditados", async () => {
      paymentId = await cmd(payment);
      assert.equal(await cmd(payment), paymentId);
      assert.equal(
        (await db.query("select * from public.payments")).rows.length,
        1,
      );
      await assert.rejects(() =>
        cmd({
          ...payment,
          request_id: crypto.randomUUID(),
          data: { ...payment.data, amount: -1 },
        }),
      );
      await assert.rejects(() =>
        cmd({
          ...payment,
          request_id: crypto.randomUUID(),
          data: { ...payment.data, amount: 1.001 },
        }),
      );
      await assert.rejects(() =>
        cmd({
          ...payment,
          request_id: crypto.randomUUID(),
          data: { ...payment.data, paid_on: "2999-01-01" },
        }),
      );
      const m = (
        await db.query<{ m: { month_payments: number } }>(
          "select public.dashboard_metrics() as m",
        )
      ).rows[0].m;
      assert.equal(Number(m.month_payments), 125.5);
    });
    await t.test(
      "bodega no paga ni escribe las tablas directamente",
      async () => {
        await as(bodega);
        await assert.rejects(() =>
          cmd({ ...payment, request_id: crypto.randomUUID() }),
        );
        await assert.rejects(() =>
          db.exec("update public.payments set amount=1"),
        );
        await as(admin);
      },
    );
    await t.test(
      "anular pago conserva registro y no modifica inventario",
      async () => {
        await cmd({
          type: "cancel_payment",
          payment_id: paymentId,
          reason: "Error de referencia",
        });
        await assert.rejects(() =>
          cmd({
            type: "cancel_payment",
            payment_id: paymentId,
            reason: "Repetido",
          }),
        );
        const row = (
          await db.query<{ status: string; cancelled_by: string }>(
            "select status,cancelled_by from public.payments",
          )
        ).rows[0];
        assert.equal(row.status, "anulado");
        assert.equal(row.cancelled_by, "admin@finca.local");
        assert.equal(
          Number(
            (
              await db.query<{ stock: number }>(
                "select stock from public.products where id=$1",
                [pid],
              )
            ).rows[0].stock,
          ),
          14,
        );
        const m = (
          await db.query<{ m: { month_payments: number } }>(
            "select public.dashboard_metrics() as m",
          )
        ).rows[0].m;
        assert.equal(Number(m.month_payments), 0);
      },
    );
  } finally {
    await db.close();
  }
});
