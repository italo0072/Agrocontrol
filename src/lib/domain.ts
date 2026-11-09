import { z } from "zod";
export const roles = ["admin", "bodega", "ventas", "lectura"] as const;
export type Role = (typeof roles)[number];
export const units = ["saco", "kg", "litro", "unidad"] as const;
export const categories = [
  "Nitrogenado",
  "Fosfatado",
  "Potásico",
  "Compuesto",
  "Orgánico",
  "Otro",
] as const;
const text = (n: number) =>
  z.string().trim().min(1, "Campo obligatorio").max(n);
const qty = z
  .number()
  .positive()
  .max(1000000)
  .refine(
    (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.000001,
    "Máximo 3 decimales",
  );
const money = z
  .number()
  .min(0)
  .max(1000000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
    "Máximo 2 decimales",
  );
export const productInput = z.object({
  id: z.uuid().optional(),
  sku: text(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Solo letras, números, guion o guion bajo")
    .transform((s) => s.toUpperCase()),
  name: text(120),
  category: z.enum(categories),
  unit: z.enum(units),
  presentation: text(80),
  price: money,
  min_stock: z
    .number()
    .min(0)
    .max(1000000)
    .refine(
      (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 0.000001,
      "Máximo 3 decimales",
    ),
  active: z.boolean(),
});
export const partnerInput = z.object({
  id: z.uuid().optional(),
  name: text(120),
  kind: z.enum(["cliente", "proveedor"]),
  document: z.string().trim().max(40),
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().trim().max(30),
  active: z.boolean(),
});
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), data: productInput }),
  z.object({ type: z.literal("partner"), data: partnerInput }),
  z.object({
    type: z.literal("movement"),
    request_id: z.uuid(),
    product_id: z.uuid(),
    direction: z.enum(["entrada", "salida"]),
    quantity: qty,
    reason: text(250),
    partner_id: z.union([z.uuid(), z.literal("")]),
  }),
  z.object({
    type: z.literal("sale"),
    request_id: z.uuid(),
    customer_id: z.uuid(),
    notes: z.string().trim().max(500),
    items: z
      .array(z.object({ product_id: z.uuid(), quantity: qty }))
      .min(1)
      .max(30)
      .refine(
        (a) => new Set(a.map((i) => i.product_id)).size === a.length,
        "No repitas un producto",
      ),
  }),
  z.object({ type: z.literal("cancel"), sale_id: z.uuid(), reason: text(250) }),
]);
export type Command = z.infer<typeof commandSchema>;
export type Product = z.infer<typeof productInput> & {
  id: string;
  stock: number;
  created_at: string;
};
export type Partner = z.infer<typeof partnerInput> & {
  id: string;
  created_at: string;
};
export type Movement = {
  id: string;
  product_id: string;
  quantity: number;
  kind: string;
  reason: string;
  actor: string;
  created_at: string;
  sale_id: string | null;
  request_id: string | null;
  partner_id: string | null;
};
export type SaleItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  unit: string;
};
export type Sale = {
  id: string;
  customer_id: string;
  customer_name: string;
  total: number;
  status: "vigente" | "anulada";
  notes: string;
  cancel_reason: string | null;
  actor: string;
  created_at: string;
  request_id: string;
  items: SaleItem[];
};
export type Snapshot = {
  products: Product[];
  partners: Partner[];
  movements: Movement[];
  sales: Sale[];
  role: Role;
  email: string;
  metrics: { month_sales: number; month_count: number };
  history_limited: boolean;
};
export const can = (role: Role, action: Command["type"]) =>
  action === "product"
    ? role === "admin"
    : action === "movement"
      ? ["admin", "bodega"].includes(role)
      : ["admin", "ventas"].includes(role);
export const roundQty = (n: number) => Math.round(n * 1000) / 1000;
export const lineTotal = (quantity: number, price: number) =>
  Math.round((quantity * price + Number.EPSILON) * 100) / 100;
export function csv(rows: (string | number)[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let s = String(value);
            if (typeof value === "string" && /^[=+@\-\t\r]/.test(s))
              s = "'" + s;
            return '"' + s.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function userError(error: unknown) {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return issue?.code === "custom"
      ? issue.message
      : "Revisa los campos obligatorios, las cantidades y los datos seleccionados.";
  }
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}
