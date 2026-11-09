export function authMessage(error: unknown) {
  const e = error as { code?: string; status?: number; name?: string };
  switch (e?.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos. Comprueba que el usuario exista en el mismo proyecto Supabase.";
    case "email_not_confirmed":
      return "Confirma tu correo antes de iniciar sesión.";
    case "email_address_not_authorized":
      return "El proveedor de correo de Supabase no permite enviar a esta dirección. Configura el envío de correo del proyecto.";
    case "over_email_send_rate_limit":
      return "Se alcanzó el límite de envío de correos. Espera antes de volver a solicitarlo.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Espera antes de volver a intentarlo.";
  }
  if (e?.status === 401 || e?.status === 403)
    return "No se pudo autenticar. Revisa la URL base y la clave pública del mismo proyecto Supabase.";
  if (e?.name === "AuthRetryableFetchError" || error instanceof TypeError)
    return "No se pudo conectar con Supabase. Revisa tu conexión y la URL base del proyecto (sin /rest/v1/).";
  return "No se pudo completar la autenticación. Revisa la configuración del proyecto y los registros de Auth en Supabase.";
}
