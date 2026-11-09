import {
  can,
  commandSchema,
  lineTotal,
  roundQty,
  type Command,
  type Snapshot,
  categories as initialCategories,
} from "./domain";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function seed(): Snapshot {
  const now = new Date().toISOString();
  return {
    role: "admin",
    categories: [
      ...initialCategories,
      "Café",
      "Fertilizantes",
      "Agroquímicos",
      "Herramientas",
      "Materiales",
    ].map((name, n) => ({ id: id(100 + n), name, active: true })),
    payments: [],
    profile: { full_name: "Administrador de finca", phone: "" },
    farm: { farm_name: "Finca El Porvenir", location: "El Salvador" },
    email: "demo@agrocontrol.local",
    history_limited: false,
    metrics: { month_sales: 0, month_count: 0 },
    products: [
      {
        id: id(1),
        sku: "FER-001",
        name: "Urea 46%",
        category: "Nitrogenado",
        unit: "saco",
        presentation: "Saco de 50 kg",
        price: 32.5,
        min_stock: 20,
        active: true,
        stock: 120,
        created_at: now,
      },
      {
        id: id(2),
        sku: "FER-002",
        name: "NPK 15-15-15",
        category: "Compuesto",
        unit: "saco",
        presentation: "Saco de 45 kg",
        price: 38,
        min_stock: 15,
        active: true,
        stock: 12,
        created_at: now,
      },
      {
        id: id(3),
        sku: "ORG-001",
        name: "Abono orgánico",
        category: "Orgánico",
        unit: "kg",
        presentation: "Venta por kilogramo",
        price: 1.25,
        min_stock: 50,
        active: true,
        stock: 260,
        created_at: now,
      },
      {
        id: id(4),
        sku: "CAF-001",
        name: "Café pergamino",
        category: "Café",
        unit: "quintal",
        presentation: "Pergamino seco · quintal",
        price: 180,
        min_stock: 10,
        active: true,
        stock: 80,
        created_at: now,
      },
    ],
    partners: [
      {
        id: id(10),
        name: "Cooperativa El Porvenir",
        kind: "cliente",
        document: "CLIENTE-DEMO",
        email: "",
        phone: "",
        active: true,
        created_at: now,
      },
      {
        id: id(11),
        name: "Distribuidora Campo Verde",
        kind: "proveedor",
        document: "PROVEEDOR-DEMO",
        email: "",
        phone: "",
        active: true,
        created_at: now,
      },
      {
        id: id(12),
        name: "Productor Las Brisas",
        kind: "productor",
        document: "PRODUCTOR-DEMO",
        email: "",
        phone: "",
        active: true,
        created_at: now,
      },
    ],
    movements: [1, 2, 3, 4].map((n) => ({
      id: id(20 + n),
      product_id: id(n),
      quantity: [120, 12, 260, 80][n - 1],
      kind: "entrada",
      reason: "Saldo inicial de demostración",
      actor: "Demo",
      created_at: now,
      sale_id: null,
      request_id: null,
      partner_id: null,
      unit_cost: null,
    })),
    sales: [],
  };
}
// Adaptador local de demostración. La autorización real se aplica también en PostgreSQL.
export function applyDemo(previous: Snapshot, input: Command): Snapshot {
  const command = commandSchema.parse(input);
  if (!can(previous.role, command.type))
    throw new Error("Tu rol no permite esta operación.");
  const s: Snapshot = structuredClone(previous),
    now = new Date().toISOString();
  const product = (id: string) => {
    const p = s.products.find((x) => x.id === id && x.active);
    if (!p) throw new Error("Producto inexistente o inactivo.");
    return p;
  };
  const move = (
    product_id: string,
    quantity: number,
    kind: string,
    reason: string,
    sale_id: string | null = null,
    request_id: string | null = null,
    partner_id: string | null = null,
    unit_cost: number | null = null,
  ) =>
    s.movements.unshift({
      id: crypto.randomUUID(),
      product_id,
      quantity,
      kind,
      reason,
      sale_id,
      request_id,
      partner_id,
      unit_cost,
      actor: "Demo",
      created_at: now,
    });
  if (command.type === "product") {
    const d = command.data;
    const category = s.categories.find((c) => c.name === d.category);
    if (
      !category ||
      (!category.active &&
        !s.products.some((p) => p.id === d.id && p.category === d.category))
    )
      throw new Error("Selecciona una categoría activa.");
    if (s.products.some((x) => x.sku === d.sku && x.id !== d.id))
      throw new Error("El código ya existe.");
    const old = s.products.find((x) => x.id === d.id);
    if (d.id && !old) throw new Error("Producto inexistente.");
    if (
      old &&
      old.unit !== d.unit &&
      s.movements.some((x) => x.product_id === old.id)
    )
      throw new Error(
        "La unidad no se puede cambiar después de registrar movimientos.",
      );
    if (old) Object.assign(old, d);
    else
      s.products.unshift({
        ...d,
        id: crypto.randomUUID(),
        stock: 0,
        created_at: now,
      });
  }
  if (command.type === "partner") {
    const d = command.data,
      old = s.partners.find((x) => x.id === d.id);
    if (d.id && !old) throw new Error("Contacto inexistente.");
    if (old && old.kind !== d.kind)
      throw new Error("No se puede cambiar el tipo del contacto.");
    if (old) Object.assign(old, d);
    else s.partners.unshift({ ...d, id: crypto.randomUUID(), created_at: now });
  }
  if (command.type === "movement") {
    if (s.movements.some((x) => x.request_id === command.request_id))
      return previous;
    if (
      command.partner_id &&
      !s.partners.some(
        (x) =>
          x.id === command.partner_id &&
          ["proveedor", "productor"].includes(x.kind) &&
          x.active,
      )
    )
      throw new Error("Proveedor inválido.");
    const p = product(command.product_id),
      q =
        command.direction === "entrada" ? command.quantity : -command.quantity;
    if (roundQty(p.stock + q) < 0) throw new Error("Existencia insuficiente.");
    p.stock = roundQty(p.stock + q);
    move(
      p.id,
      q,
      command.direction,
      command.reason,
      null,
      command.request_id,
      command.partner_id || null,
      command.unit_cost ?? null,
    );
  }
  if (command.type === "sale") {
    if (s.sales.some((x) => x.request_id === command.request_id))
      return previous;
    const customer = s.partners.find(
      (x) => x.id === command.customer_id && x.kind === "cliente" && x.active,
    );
    if (!customer) throw new Error("Cliente inválido.");
    const saleId = crypto.randomUUID();
    const items = command.items.map((i) => {
      const p = product(i.product_id);
      if (p.stock < i.quantity)
        throw new Error(`Existencia insuficiente: ${p.name}.`);
      p.stock = roundQty(p.stock - i.quantity);
      move(p.id, -i.quantity, "venta", "Venta registrada", saleId);
      return { ...i, unit_price: p.price, product_name: p.name, unit: p.unit };
    });
    s.sales.unshift({
      id: saleId,
      customer_id: customer.id,
      customer_name: customer.name,
      total: lineTotal(
        1,
        items.reduce((sum, i) => sum + lineTotal(i.quantity, i.unit_price), 0),
      ),
      status: "vigente",
      notes: command.notes,
      cancel_reason: null,
      actor: "Demo",
      created_at: now,
      request_id: command.request_id,
      items,
    });
  }
  if (command.type === "cancel") {
    const sale = s.sales.find((x) => x.id === command.sale_id);
    if (!sale) throw new Error("Venta inexistente.");
    if (sale.status === "anulada") throw new Error("La venta ya está anulada.");
    for (const i of sale.items) {
      const p = s.products.find((x) => x.id === i.product_id);
      if (!p) throw new Error("Producto inexistente.");
      p.stock = roundQty(p.stock + i.quantity);
      move(p.id, i.quantity, "anulación", command.reason, sale.id);
    }
    sale.status = "anulada";
    sale.cancel_reason = command.reason;
  }

  if (command.type === "category") {
    const d = command.data,
      name = d.name.trim();
    if (
      s.categories.some(
        (c) =>
          c.id !== d.id &&
          c.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    )
      throw new Error("Ya existe una categoría con ese nombre.");
    const old = s.categories.find((c) => c.id === d.id);
    if (d.id && !old) throw new Error("Categoría inexistente.");
    if (old) {
      for (const p of s.products)
        if (p.category === old.name) p.category = name;
      Object.assign(old, { ...d, name });
    } else s.categories.push({ ...d, name, id: crypto.randomUUID() });
  }
  if (command.type === "profile") s.profile = command.data;
  if (command.type === "farm") s.farm = command.data;
  if (command.type === "payment") {
    if (s.payments.some((p) => p.request_id === command.request_id))
      return previous;
    const d = command.data,
      contact = s.partners.find((c) => c.id === d.partner_id && c.active);
    if (!contact) throw new Error("Selecciona un contacto activo.");
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/El_Salvador",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (d.paid_on > today)
      throw new Error("La fecha de pago no puede estar en el futuro.");
    s.payments.unshift({
      ...d,
      id: crypto.randomUUID(),
      partner_name: contact.name,
      status: "vigente",
      actor: s.profile.full_name || "Demo",
      created_at: now,
      request_id: command.request_id,
      cancel_reason: null,
      cancelled_by: null,
      cancelled_at: null,
    });
  }
  if (command.type === "cancel_payment") {
    const payment = s.payments.find((p) => p.id === command.payment_id);
    if (!payment) throw new Error("Pago inexistente.");
    if (payment.status === "anulado")
      throw new Error("El pago ya está anulado.");
    payment.status = "anulado";
    payment.cancel_reason = command.reason;
    payment.cancelled_by = s.profile.full_name || "Demo";
    payment.cancelled_at = now;
  }
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const current = s.sales.filter(
    (x) =>
      x.status === "vigente" &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/El_Salvador",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(x.created_at)) === month,
  );
  s.metrics = {
    month_sales: current.reduce((sum, x) => sum + x.total, 0),
    month_count: current.length,
  };
  const currentDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
  const currentPayments = s.payments.filter(
    (p) => p.status === "vigente" && p.paid_on.startsWith(currentDate),
  );
  s.metrics.month_payments = currentPayments.reduce(
    (sum, p) => sum + p.amount,
    0,
  );
  s.metrics.payment_count = currentPayments.length;
  const purchases = s.movements.filter(
    (m) =>
      m.kind === "entrada" &&
      m.unit_cost != null &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/El_Salvador",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(m.created_at)) === month,
  );
  s.metrics.month_purchase_total = purchases.reduce(
    (sum, m) => sum + lineTotal(m.quantity, m.unit_cost || 0),
    0,
  );
  s.metrics.month_purchase_count = purchases.length;
  return s;
}

// Agrega la estructura nueva a demos V1 sin borrar sus productos ni movimientos.
export function upgradeDemo(old: Snapshot): Snapshot {
  const defaults = seed();
  const names = new Set([
    ...(old.categories ?? defaults.categories).map((c) => c.name),
    ...old.products.map((p) => p.category),
  ]);
  return {
    ...old,
    categories: Array.from(names).map(
      (name) =>
        old.categories?.find((c) => c.name === name) ?? {
          id: crypto.randomUUID(),
          name,
          active: true,
        },
    ),
    payments: old.payments ?? [],
    profile: old.profile ?? defaults.profile,
    farm: old.farm ?? defaults.farm,
  };
}
