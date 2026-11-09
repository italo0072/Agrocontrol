import { createClient } from "@supabase/supabase-js";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function authenticate(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new ApiError("Servidor sin configurar. Completa .env.local.", 503);
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError("Inicia sesión.", 401);
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new ApiError("Sesión inválida o vencida.", 401);
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role,email,full_name,phone")
    .eq("id", data.user.id)
    .single();
  if (profileError?.code === "42703")
    throw new ApiError(
      "Actualiza la base de datos ejecutando supabase/004_reparacion_tailwind.sql.",
      503,
    );
  if (profileError || !profile)
    throw new ApiError(
      "Usuario sin acceso. Solicita al administrador que te asigne un rol.",
      403,
    );
  return { db, profile };
}
export function apiFailure(error: unknown) {
  const status = error instanceof ApiError ? error.status : 500;
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "No se pudo completar la operación. Intenta nuevamente.",
    },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
