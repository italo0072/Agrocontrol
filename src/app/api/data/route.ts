import { authenticate, apiFailure, ApiError } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { db, profile } = await authenticate(request);
    const [p, c, m, s, metrics, cats, farm, pay] = await Promise.all([
      db.from("products").select("*").order("name").limit(1000),
      db.from("partners").select("*").order("name").limit(1000),
      db
        .from("movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(201),
      db
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(201),
      db.rpc("dashboard_metrics"),
      db.from("categories").select("*").order("name").limit(1000),
      db
        .from("farm_settings")
        .select("farm_name,location")
        .eq("id", true)
        .single(),
      db
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(201),
    ]);
    if ([p, c, m, s, metrics, cats, farm, pay].some((r) => r.error))
      throw new ApiError(
        "No se pudieron leer los datos. Ejecuta la actualización 004_reparacion_tailwind.sql si vienes de la versión anterior y verifica tu acceso.",
        503,
      );
    if (
      (p.data?.length ?? 0) >= 1000 ||
      (c.data?.length ?? 0) >= 1000 ||
      (cats.data?.length ?? 0) >= 1000
    )
      throw new ApiError(
        "El catálogo alcanzó 1,000 registros. Amplía la paginación antes de continuar.",
        409,
      );
    return Response.json(
      {
        products: p.data,
        partners: c.data,
        movements: m.data?.slice(0, 200),
        sales: s.data?.slice(0, 200),
        metrics: metrics.data,
        role: profile.role,
        email: profile.email,
        profile: { full_name: profile.full_name, phone: profile.phone },
        categories: cats.data,
        farm: farm.data,
        payments: pay.data?.slice(0, 200),
        history_limited:
          (m.data?.length ?? 0) > 200 ||
          (s.data?.length ?? 0) > 200 ||
          (pay.data?.length ?? 0) > 200,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiFailure(e);
  }
}
