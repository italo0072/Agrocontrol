import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const admin = "00000000-0000-4000-8000-000000000001",
  reader = "00000000-0000-4000-8000-000000000002",
  warehouse = "00000000-0000-4000-8000-000000000003",
  seller = "00000000-0000-4000-8000-000000000004",
  stranger = "00000000-0000-4000-8000-000000000005";
test("PostgreSQL: migración, permisos y transacciones de inventario", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`,
    );
    await db.exec(await readFile("supabase/001_schema.sql", "utf8"));
    await db.exec(
      `insert into auth.users values ('${admin}'),('${reader}'),('${warehouse}'),('${seller}'),('${stranger}');insert into public.profiles values('${admin}','admin@test.local','admin'),('${reader}','read@test.local','lectura'),('${warehouse}','bodega@test.local','bodega'),('${seller}','ventas@test.local','ventas');`,
    );
    async function as(uid: string, role = "authenticated") {
      await db.exec(
        `reset role;select set_config('request.jwt.claim.sub','${uid}',false);set role ${role};`,
      );
    }
    async function cmd(value: unknown) {
      const r = await db.query<{ id: string }>(
        "select public.execute_command($1::jsonb) as id",
        [JSON.stringify(value)],
      );
      return r.rows[0].id;
    }
    const product = {
      sku: "TEST-001",
      name: "Fertilizante",
      category: "Compuesto",
      unit: "saco",
      presentation: "50 kg",
      price: 32.5,
      min_stock: 10,
      active: true,
    };
    await as(admin);
    const pid = await cmd({ type: "product", data: product });
    const cid = await cmd({
      type: "partner",
      data: {
        name: "Cliente",
        kind: "cliente",
        document: "",
        email: "",
        phone: "",
        active: true,
      },
    });
    const stock = async () =>
      Number(
        (
          await db.query<{ stock: number }>(
            "select stock from public.products where id=$1",
            [pid],
          )
        ).rows[0].stock,
      );
    const movement = {
      type: "movement",
      request_id: crypto.randomUUID(),
      product_id: pid,
      direction: "entrada",
      quantity: 10,
      reason: "Saldo inicial",
      partner_id: "",
    };
    await t.test("entrada y reintento idempotente", async () => {
      await cmd(movement);
      await cmd(movement);
      assert.equal(await stock(), 10);
    });
    await t.test(
      "lectura no puede escribir ni modificar stock directo",
      async () => {
        await as(reader);
        await assert.rejects(() =>
          cmd({ ...movement, request_id: crypto.randomUUID() }),
        );
        await assert.rejects(() =>
          db.exec("update public.products set stock=999"),
        );
        assert.equal(await stock(), 10);
      },
    );
    await t.test("bodega no vende y ventas no modifica catálogo", async () => {
      await as(warehouse);
      await assert.rejects(() =>
        cmd({
          type: "sale",
          request_id: crypto.randomUUID(),
          customer_id: cid,
          notes: "",
          items: [{ product_id: pid, quantity: 1 }],
        }),
      );
      await as(seller);
      await assert.rejects(() =>
        cmd({ type: "product", data: { ...product, sku: "OTRO" } }),
      );
    });
    await t.test("usuario sin perfil y anónimo no leen datos", async () => {
      await as(stranger);
      assert.equal(
        (await db.query("select * from public.products")).rows.length,
        0,
      );
      await assert.rejects(() => cmd(movement));
      await as(stranger, "anon");
      await assert.rejects(() => db.exec("select * from public.products"));
      await as(admin);
    });
    await t.test(
      "venta confirma precio y evita sobreventa con rollback",
      async () => {
        const second = await cmd({
          type: "product",
          data: { ...product, sku: "TEST-002" },
        });
        await assert.rejects(() =>
          cmd({
            type: "sale",
            request_id: crypto.randomUUID(),
            customer_id: cid,
            notes: "",
            items: [
              { product_id: pid, quantity: 2 },
              { product_id: second, quantity: 1 },
            ],
          }),
        );
        assert.equal(await stock(), 10);
      },
    );
    const saleCommand = {
      type: "sale",
      request_id: crypto.randomUUID(),
      customer_id: cid,
      notes: "",
      items: [{ product_id: pid, quantity: 2 }],
    };
    let sid = "";
    await t.test("venta real e idempotencia", async () => {
      sid = await cmd(saleCommand);
      assert.equal(await stock(), 8);
      assert.equal(await cmd(saleCommand), sid);
      assert.equal(await stock(), 8);
      const sale = (
        await db.query<{ total: number }>(
          "select total from public.sales where id=$1",
          [sid],
        )
      ).rows[0];
      assert.equal(Number(sale.total), 65);
    });
    await t.test(
      "unidad protegida y cantidades limitadas en RPC directo",
      async () => {
        await assert.rejects(() =>
          cmd({ type: "product", data: { ...product, id: pid, unit: "kg" } }),
        );
        await assert.rejects(() =>
          cmd({
            ...movement,
            request_id: crypto.randomUUID(),
            quantity: 0.0001,
          }),
        );
        assert.equal(await stock(), 8);
      },
    );
    await t.test(
      "anulación compensa una vez y conserva auditoría",
      async () => {
        await cmd({ type: "cancel", sale_id: sid, reason: "Error" });
        assert.equal(await stock(), 10);
        await assert.rejects(() =>
          cmd({ type: "cancel", sale_id: sid, reason: "Otra vez" }),
        );
        assert.equal(await stock(), 10);
        const n = (
          await db.query<{ n: number }>(
            "select count(*)::int as n from public.movements where sale_id=$1",
            [sid],
          )
        ).rows[0].n;
        assert.equal(n, 2);
      },
    );
    await t.test("métrica mensual excluye anulaciones", async () => {
      const r = await db.query<{
        m: { month_sales: number; month_count: number };
      }>("select public.dashboard_metrics() as m");
      assert.equal(Number(r.rows[0].m.month_sales), 0);
      assert.equal(Number(r.rows[0].m.month_count), 0);
    });
  } finally {
    await db.close();
  }
});
