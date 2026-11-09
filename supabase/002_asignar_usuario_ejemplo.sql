-- Ejecutar después de crear el usuario en Authentication > Users.
-- Reemplaza el correo. Rol permitido: admin, ventas, bodega o lectura.
insert into public.profiles(id,email,role)
select id,email,'admin' from auth.users
where lower(email)=lower('TU_CORREO@EJEMPLO.COM')
on conflict(id) do update set email=excluded.email,role=excluded.role;
select email,role from public.profiles;
