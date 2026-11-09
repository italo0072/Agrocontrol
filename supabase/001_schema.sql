-- INSTALACIÓN COMPLETA EN UN PROYECTO SUPABASE NUEVO Y VACÍO.
-- Incluye las funciones de 004: categorías, perfiles, finca, costos y pagos.
-- Ejecutar este archivo una sola vez. No hace falta ejecutar 004 después.
-- En una base anterior con tablas existentes, usa 004 en lugar de este archivo.
begin;

-- Estructura y reglas base
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text not null,
 role text not null check(role in ('admin','ventas','bodega','lectura'))
);
create table public.products (
 id uuid primary key default gen_random_uuid(),
 sku text not null unique check(sku ~ '^[A-Z0-9_-]{1,40}$'),
 name text not null check(length(trim(name)) between 1 and 120),
 category text not null check(category in ('Nitrogenado','Fosfatado','Potásico','Compuesto','Orgánico','Otro')),
 unit text not null check(unit in ('saco','kg','litro','unidad')),
 presentation text not null check(length(trim(presentation)) between 1 and 80),
 price numeric(14,2) not null check(price between 0 and 1000000),
 min_stock numeric(14,3) not null check(min_stock between 0 and 1000000),
 stock numeric(16,3) not null default 0 check(stock >= 0),
 active boolean not null default true,created_at timestamptz not null default now()
);
create table public.partners (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 120),
 kind text not null check(kind in ('cliente','proveedor')),
 document text not null default '' check(length(document)<=40),
 email text not null default '' check(length(email)<=254),
 phone text not null default '' check(length(phone)<=30),
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.sales (
 id uuid primary key default gen_random_uuid(),customer_id uuid not null references public.partners,
 customer_name text not null,total numeric(16,2) not null check(total>=0),
 status text not null default 'vigente' check(status in ('vigente','anulada')),
 notes text not null default '' check(length(notes)<=500),cancel_reason text,
 actor text not null,created_at timestamptz not null default now(),
 request_id uuid not null unique, items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 30)
);
create table public.movements (
 id uuid primary key default gen_random_uuid(),product_id uuid not null references public.products,
 quantity numeric(16,3) not null check(quantity<>0),
 kind text not null check(kind in ('entrada','salida','venta','anulación')),
 reason text not null check(length(trim(reason)) between 1 and 250),actor text not null,
 created_at timestamptz not null default now(),sale_id uuid references public.sales,
 request_id uuid unique,partner_id uuid references public.partners,
 unit_cost numeric(14,2) default null check(unit_cost>=0)
);
create index on public.movements(product_id,created_at desc);
create index on public.movements(created_at desc);
create index on public.sales(created_at desc);
create function public.member_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=auth.uid();
$$;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.partners enable row level security;
alter table public.movements enable row level security;
alter table public.sales enable row level security;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy member_read on public.products for select to authenticated using(public.member_role() is not null);
create policy member_read on public.partners for select to authenticated using(public.member_role() is not null);
create policy member_read on public.movements for select to authenticated using(public.member_role() is not null);
create policy member_read on public.sales for select to authenticated using(public.member_role() is not null);
-- Sin INSERT/UPDATE/DELETE directos, ni siquiera con token autenticado.
revoke all on public.profiles,public.products,public.partners,public.movements,public.sales from anon,authenticated;
grant select on public.profiles,public.products,public.partners,public.movements,public.sales to authenticated;
create function public.dashboard_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_month timestamptz; result jsonb;
begin
 if public.member_role() is null then raise exception 'Acceso denegado.'; end if;
 start_month := date_trunc('month', now() at time zone 'America/El_Salvador') at time zone 'America/El_Salvador';
 select jsonb_build_object('month_sales',coalesce(sum(total),0),'month_count',count(*)) into result from public.sales where status='vigente' and created_at>=start_month;
 return result;
end; $$;
create function public.execute_command(p_command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare
 r text; actor_email text; typ text; d jsonb; pid uuid; cid uuid; sid uuid; req uuid;
 p public.products%rowtype; c public.partners%rowtype; sale_row public.sales%rowtype;
 q numeric; price_value numeric; minimum_value numeric; direction_value text; reason_value text; total_value numeric:=0; uc numeric;
 item jsonb; items_value jsonb:='[]'::jsonb; active_value boolean; found_id uuid;
begin
 r:=public.member_role(); if r is null then raise exception 'Acceso denegado.'; end if;
 select email into actor_email from public.profiles where id=auth.uid();
 typ:=p_command->>'type';d:=p_command->'data';
 if typ='product' then
  if r<>'admin' then raise exception 'Solo administración puede modificar productos.'; end if;
  pid:=nullif(d->>'id','')::uuid; price_value:=(d->>'price')::numeric;minimum_value:=(d->>'min_stock')::numeric;
  if price_value is null or price_value<0 or price_value>1000000 or price_value<>round(price_value,2) or minimum_value is null or minimum_value<0 or minimum_value>1000000 or minimum_value<>round(minimum_value,3) then raise exception 'Precio o stock mínimo inválido.';end if;
  active_value:=(d->>'active')::boolean;
  if pid is null then
   insert into public.products(sku,name,category,unit,presentation,price,min_stock,active) values(upper(trim(d->>'sku')),trim(d->>'name'),d->>'category',d->>'unit',trim(d->>'presentation'),price_value,minimum_value,active_value) returning id into pid;
  else
   select * into p from public.products where id=pid for update;if not found then raise exception 'Producto inexistente.';end if;
   if p.unit is distinct from d->>'unit' and exists(select 1 from public.movements where product_id=pid) then raise exception 'No puedes cambiar la unidad de un producto con movimientos.';end if;
   update public.products set sku=upper(trim(d->>'sku')),name=trim(d->>'name'),category=d->>'category',unit=d->>'unit',presentation=trim(d->>'presentation'),price=price_value,min_stock=minimum_value,active=active_value where id=pid;
  end if;return pid;
 elsif typ='partner' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite modificar contactos.';end if;
  cid:=nullif(d->>'id','')::uuid;
  if cid is null then
   insert into public.partners(name,kind,document,email,phone,active) values(trim(d->>'name'),d->>'kind',d->>'document',d->>'email',d->>'phone',(d->>'active')::boolean) returning id into cid;
  else
   select * into c from public.partners where id=cid for update;if not found then raise exception 'Contacto inexistente.';end if;
   if c.kind is distinct from d->>'kind' then raise exception 'El tipo de contacto no puede cambiar.';end if;
   update public.partners set name=trim(d->>'name'),document=d->>'document',email=d->>'email',phone=d->>'phone',active=(d->>'active')::boolean where id=cid;
  end if;return cid;
 elsif typ='movement' then
  if r not in ('admin','bodega') then raise exception 'Tu rol no permite movimientos manuales.';end if;
  req:=(p_command->>'request_id')::uuid;if req is null then raise exception 'Falta identificador de operación.';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(req::text,0));
  select id into found_id from public.movements where request_id=req;if found then return found_id;end if;
  pid:=(p_command->>'product_id')::uuid;q:=(p_command->>'quantity')::numeric;direction_value:=p_command->>'direction';reason_value:=trim(p_command->>'reason');
  if q is null or q<=0 or q>1000000 or q<>round(q,3) or direction_value is null or direction_value not in ('entrada','salida') then raise exception 'Cantidad o tipo inválido.';end if;
  cid:=nullif(p_command->>'partner_id','')::uuid;
  if cid is not null and not exists(select 1 from public.partners where id=cid and kind='proveedor' and active) then raise exception 'Proveedor inválido.';end if;
  select * into p from public.products where id=pid for update;if not found or not p.active then raise exception 'Producto inexistente o inactivo.';end if;
  uc:=nullif(p_command->>'unit_cost','')::numeric;if uc is not null and (uc<0 or uc<>round(uc,2)) then raise exception 'Costo unitario inválido.';end if;
  if direction_value='salida' then q:=-q;end if;
  if p.stock+q<0 then raise exception 'Existencia insuficiente.';end if;
  update public.products set stock=stock+q where id=pid;
  insert into public.movements(product_id,quantity,kind,reason,actor,request_id,partner_id,unit_cost) values(pid,q,direction_value,reason_value,actor_email,req,cid,uc) returning id into found_id;return found_id;
 elsif typ='sale' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite registrar ventas.';end if;
  req:=(p_command->>'request_id')::uuid;if req is null then raise exception 'Falta identificador de operación.';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(req::text,0));
  select id into sid from public.sales where request_id=req;if found then return sid;end if;
  cid:=(p_command->>'customer_id')::uuid;
  select * into c from public.partners where id=cid and kind='cliente' and active;if not found then raise exception 'Cliente inválido.';end if;
  if jsonb_typeof(p_command->'items') is distinct from 'array' then raise exception 'Detalle de venta inválido.';end if;
  if jsonb_array_length(p_command->'items') not between 1 and 30 then raise exception 'La venta debe contener entre 1 y 30 productos.';end if;
  if (select count(*) from jsonb_array_elements(p_command->'items'))<>(select count(distinct value->>'product_id') from jsonb_array_elements(p_command->'items')) then raise exception 'No repitas productos.';end if;
  -- Orden consistente de bloqueo para evitar sobreventa y reducir interbloqueos.
  for item in select value from jsonb_array_elements(p_command->'items') order by value->>'product_id' loop
   pid:=(item->>'product_id')::uuid;q:=(item->>'quantity')::numeric;
   if q is null or q<=0 or q>1000000 or q<>round(q,3) then raise exception 'Cantidad inválida.';end if;
   select * into p from public.products where id=pid for update;if not found or not p.active then raise exception 'Producto inexistente o inactivo.';end if;
   if p.stock<q then raise exception 'Existencia insuficiente: %.',p.name;end if;
   update public.products set stock=stock-q where id=pid;
   total_value:=total_value+round(q*p.price,2);
   items_value:=items_value||jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',q,'unit_price',p.price,'product_name',p.name,'unit',p.unit));
  end loop;
  insert into public.sales(customer_id,customer_name,total,notes,actor,request_id,items) values(cid,c.name,total_value,coalesce(p_command->>'notes',''),actor_email,req,items_value) returning id into sid;
  for item in select value from jsonb_array_elements(items_value) loop
   insert into public.movements(product_id,quantity,kind,reason,actor,sale_id) values((item->>'product_id')::uuid,-(item->>'quantity')::numeric,'venta','Venta registrada',actor_email,sid);
  end loop;return sid;
 elsif typ='cancel' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite anular ventas.';end if;
  sid:=(p_command->>'sale_id')::uuid;reason_value:=trim(p_command->>'reason');
  if reason_value is null or length(reason_value) not between 1 and 250 then raise exception 'Indica el motivo de anulación.';end if;
  select * into sale_row from public.sales where id=sid for update;
  if not found then raise exception 'Venta inexistente.';end if;
  if sale_row.status='anulada' then raise exception 'La venta ya está anulada.';end if;
  for item in select value from jsonb_array_elements(sale_row.items) order by value->>'product_id' loop
   pid:=(item->>'product_id')::uuid;q:=(item->>'quantity')::numeric;
   perform id from public.products where id=pid for update;
   update public.products set stock=stock+q where id=pid;
   insert into public.movements(product_id,quantity,kind,reason,actor,sale_id) values(pid,q,'anulación',reason_value,actor_email,sid);
  end loop;
  update public.sales set status='anulada',cancel_reason=reason_value where id=sid;return sid;
 else raise exception 'Operación desconocida.';
 end if;
end; $$;
revoke all on function public.member_role(),public.dashboard_metrics(),public.execute_command(jsonb) from public,anon;
grant execute on function public.member_role(),public.dashboard_metrics(),public.execute_command(jsonb) to authenticated;

-- Configuración y capacidades completas de la aplicación
create or replace function public.member_role() returns text language sql stable security definer set search_path='' as $$select role from public.profiles where id=auth.uid()$$;
alter table public.movements add column if not exists unit_cost numeric(14,2) default null;
alter table public.movements drop constraint if exists movements_unit_cost_check;
alter table public.movements add constraint movements_unit_cost_check check(unit_cost is null or unit_cost between 0 and 1000000);

alter table public.profiles add column if not exists full_name text not null default '' check(length(full_name)<=100);
alter table public.profiles add column if not exists phone text not null default '' check(length(phone)<=30);
create table if not exists public.categories(id uuid primary key default gen_random_uuid(),name text not null unique check(length(trim(name)) between 1 and 80),active boolean not null default true);
create unique index if not exists categories_name_ci on public.categories(lower(name));
insert into public.categories(name)
select name from (select category as name from public.products union select unnest(array['Nitrogenado','Fosfatado','Potásico','Compuesto','Orgánico','Otro','Café','Fertilizantes','Agroquímicos','Herramientas','Materiales'])) x where not exists(select 1 from public.categories c where lower(c.name)=lower(x.name));
alter table public.products drop constraint if exists products_category_check;
update public.products p set category=c.name from public.categories c where lower(c.name)=lower(p.category) and p.category<>c.name;
do $$begin if not exists(select 1 from pg_constraint where conrelid='public.products'::regclass and conname='products_category_fkey') then alter table public.products add constraint products_category_fkey foreign key(category) references public.categories(name) on update cascade;end if;end$$;
alter table public.products drop constraint if exists products_unit_check;
alter table public.products add constraint products_unit_check check(unit in ('saco','kg','litro','unidad','quintal','libra'));
alter table public.partners drop constraint if exists partners_kind_check;
alter table public.partners add constraint partners_kind_check check(kind in ('cliente','proveedor','productor'));
create table if not exists public.farm_settings(id boolean primary key default true check(id),farm_name text not null check(length(trim(farm_name)) between 1 and 100),location text not null default '' check(length(location)<=150));
insert into public.farm_settings(farm_name,location) values('Mi finca cafetalera','') on conflict(id) do nothing;
create table if not exists public.payments(
 id uuid primary key default gen_random_uuid(),partner_id uuid not null references public.partners,partner_name text not null,
 amount numeric(14,2) not null check(amount>0 and amount<=1000000),paid_on date not null,
 method text not null check(method in ('efectivo','transferencia','cheque')),
 reference text not null check(length(trim(reference)) between 1 and 80),reason text not null check(length(trim(reason)) between 1 and 250),
 status text not null default 'vigente' check(status in ('vigente','anulado')),actor text not null,created_at timestamptz not null default now(),
 request_id uuid not null unique,cancel_reason text,cancelled_by text,cancelled_at timestamptz
);
create index if not exists payments_created_idx on public.payments(created_at desc);
create index if not exists payments_paid_idx on public.payments(paid_on);
alter table public.categories enable row level security;
alter table public.farm_settings enable row level security;
alter table public.payments enable row level security;
drop policy if exists member_read on public.categories;
create policy member_read on public.categories for select to authenticated using(public.member_role() is not null);
drop policy if exists member_read on public.farm_settings;
create policy member_read on public.farm_settings for select to authenticated using(public.member_role() is not null);
drop policy if exists member_read on public.payments;
create policy member_read on public.payments for select to authenticated using(public.member_role() is not null);
revoke all on public.categories,public.farm_settings,public.payments from anon,authenticated;
grant select on public.categories,public.farm_settings,public.payments to authenticated;
revoke all on function public.execute_command(jsonb) from public,anon,authenticated;
create or replace function public.execute_command_v1(p_command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare
 r text; actor_email text; typ text; d jsonb; pid uuid; cid uuid; sid uuid; req uuid;
 p public.products%rowtype; c public.partners%rowtype; sale_row public.sales%rowtype;
 q numeric; price_value numeric; minimum_value numeric; direction_value text; reason_value text; total_value numeric:=0; uc numeric;
 item jsonb; items_value jsonb:='[]'::jsonb; active_value boolean; found_id uuid;
begin
 r:=public.member_role(); if r is null then raise exception 'Acceso denegado.'; end if;
 select email into actor_email from public.profiles where id=auth.uid();
 typ:=p_command->>'type';d:=p_command->'data';
 if typ='product' then
  if r<>'admin' then raise exception 'Solo administración puede modificar productos.'; end if;
  pid:=nullif(d->>'id','')::uuid; price_value:=(d->>'price')::numeric;minimum_value:=(d->>'min_stock')::numeric;
  if price_value is null or price_value<0 or price_value>1000000 or price_value<>round(price_value,2) or minimum_value is null or minimum_value<0 or minimum_value>1000000 or minimum_value<>round(minimum_value,3) then raise exception 'Precio o stock mínimo inválido.';end if;
  active_value:=(d->>'active')::boolean;
  if pid is null then
   insert into public.products(sku,name,category,unit,presentation,price,min_stock,active) values(upper(trim(d->>'sku')),trim(d->>'name'),d->>'category',d->>'unit',trim(d->>'presentation'),price_value,minimum_value,active_value) returning id into pid;
  else
   select * into p from public.products where id=pid for update;if not found then raise exception 'Producto inexistente.';end if;
   if p.unit is distinct from d->>'unit' and exists(select 1 from public.movements where product_id=pid) then raise exception 'No puedes cambiar la unidad de un producto con movimientos.';end if;
   update public.products set sku=upper(trim(d->>'sku')),name=trim(d->>'name'),category=d->>'category',unit=d->>'unit',presentation=trim(d->>'presentation'),price=price_value,min_stock=minimum_value,active=active_value where id=pid;
  end if;return pid;
 elsif typ='partner' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite modificar contactos.';end if;
  cid:=nullif(d->>'id','')::uuid;
  if cid is null then
   insert into public.partners(name,kind,document,email,phone,active) values(trim(d->>'name'),d->>'kind',d->>'document',d->>'email',d->>'phone',(d->>'active')::boolean) returning id into cid;
  else
   select * into c from public.partners where id=cid for update;if not found then raise exception 'Contacto inexistente.';end if;
   if c.kind is distinct from d->>'kind' then raise exception 'El tipo de contacto no puede cambiar.';end if;
   update public.partners set name=trim(d->>'name'),document=d->>'document',email=d->>'email',phone=d->>'phone',active=(d->>'active')::boolean where id=cid;
  end if;return cid;
 elsif typ='movement' then
  if r not in ('admin','bodega') then raise exception 'Tu rol no permite movimientos manuales.';end if;
  req:=(p_command->>'request_id')::uuid;if req is null then raise exception 'Falta identificador de operación.';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(req::text,0));
  select id into found_id from public.movements where request_id=req;if found then return found_id;end if;
  pid:=(p_command->>'product_id')::uuid;q:=(p_command->>'quantity')::numeric;direction_value:=p_command->>'direction';reason_value:=trim(p_command->>'reason');
  if q is null or q<=0 or q>1000000 or q<>round(q,3) or direction_value is null or direction_value not in ('entrada','salida') then raise exception 'Cantidad o tipo inválido.';end if;
  cid:=nullif(p_command->>'partner_id','')::uuid;
  if cid is not null and not exists(select 1 from public.partners where id=cid and kind in ('proveedor','productor') and active) then raise exception 'Proveedor inválido.';end if;
  select * into p from public.products where id=pid for update;if not found or not p.active then raise exception 'Producto inexistente o inactivo.';end if;
  uc:=nullif(p_command->>'unit_cost','')::numeric;if uc is not null and (uc<0 or uc>1000000 or uc<>round(uc,2)) then raise exception 'Costo unitario inválido.';end if;
  if direction_value='salida' then q:=-q;end if;
  if p.stock+q<0 then raise exception 'Existencia insuficiente.';end if;
  update public.products set stock=stock+q where id=pid;
  insert into public.movements(product_id,quantity,kind,reason,actor,request_id,partner_id,unit_cost) values(pid,q,direction_value,reason_value,actor_email,req,cid,uc) returning id into found_id;return found_id;
 elsif typ='sale' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite registrar ventas.';end if;
  req:=(p_command->>'request_id')::uuid;if req is null then raise exception 'Falta identificador de operación.';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(req::text,0));
  select id into sid from public.sales where request_id=req;if found then return sid;end if;
  cid:=(p_command->>'customer_id')::uuid;
  select * into c from public.partners where id=cid and kind='cliente' and active;if not found then raise exception 'Cliente inválido.';end if;
  if jsonb_typeof(p_command->'items') is distinct from 'array' then raise exception 'Detalle de venta inválido.';end if;
  if jsonb_array_length(p_command->'items') not between 1 and 30 then raise exception 'La venta debe contener entre 1 y 30 productos.';end if;
  if (select count(*) from jsonb_array_elements(p_command->'items'))<>(select count(distinct value->>'product_id') from jsonb_array_elements(p_command->'items')) then raise exception 'No repitas productos.';end if;
  -- Orden consistente de bloqueo para evitar sobreventa y reducir interbloqueos.
  for item in select value from jsonb_array_elements(p_command->'items') order by value->>'product_id' loop
   pid:=(item->>'product_id')::uuid;q:=(item->>'quantity')::numeric;
   if q is null or q<=0 or q>1000000 or q<>round(q,3) then raise exception 'Cantidad inválida.';end if;
   select * into p from public.products where id=pid for update;if not found or not p.active then raise exception 'Producto inexistente o inactivo.';end if;
   if p.stock<q then raise exception 'Existencia insuficiente: %.',p.name;end if;
   update public.products set stock=stock-q where id=pid;
   total_value:=total_value+round(q*p.price,2);
   items_value:=items_value||jsonb_build_array(jsonb_build_object('product_id',pid,'quantity',q,'unit_price',p.price,'product_name',p.name,'unit',p.unit));
  end loop;
  insert into public.sales(customer_id,customer_name,total,notes,actor,request_id,items) values(cid,c.name,total_value,coalesce(p_command->>'notes',''),actor_email,req,items_value) returning id into sid;
  for item in select value from jsonb_array_elements(items_value) loop
   insert into public.movements(product_id,quantity,kind,reason,actor,sale_id) values((item->>'product_id')::uuid,-(item->>'quantity')::numeric,'venta','Venta registrada',actor_email,sid);
  end loop;return sid;
 elsif typ='cancel' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite anular ventas.';end if;
  sid:=(p_command->>'sale_id')::uuid;reason_value:=trim(p_command->>'reason');
  if reason_value is null or length(reason_value) not between 1 and 250 then raise exception 'Indica el motivo de anulación.';end if;
  select * into sale_row from public.sales where id=sid for update;
  if not found then raise exception 'Venta inexistente.';end if;
  if sale_row.status='anulada' then raise exception 'La venta ya está anulada.';end if;
  for item in select value from jsonb_array_elements(sale_row.items) order by value->>'product_id' loop
   pid:=(item->>'product_id')::uuid;q:=(item->>'quantity')::numeric;
   perform id from public.products where id=pid for update;
   update public.products set stock=stock+q where id=pid;
   insert into public.movements(product_id,quantity,kind,reason,actor,sale_id) values(pid,q,'anulación',reason_value,actor_email,sid);
  end loop;
  update public.sales set status='anulada',cancel_reason=reason_value where id=sid;return sid;
 else raise exception 'Operación desconocida.';
 end if;
end; $$;
-- La función anterior queda privada: todas las llamadas pasan por los controles V2.
revoke all on function public.execute_command_v1(jsonb) from public,anon,authenticated;
create or replace function public.execute_command(p_command jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare r text;typ text;d jsonb;rid uuid;pid uuid;existing_id uuid;amount_value numeric;paid_date date;actor_email text;contact public.partners%rowtype;old public.categories%rowtype;old_payment public.payments%rowtype;category_row public.categories%rowtype;
begin
 r:=public.member_role();if r is null then raise exception 'Acceso denegado.';end if;
 select email into actor_email from public.profiles where id=auth.uid();
 typ:=p_command->>'type';d:=p_command->'data';
 if typ='category' then
  if r<>'admin' then raise exception 'Solo administración puede gestionar categorías.';end if;
  rid:=nullif(d->>'id','')::uuid;
  if rid is null then insert into public.categories(name,active) values(trim(d->>'name'),(d->>'active')::boolean) returning id into rid;
  else
   select * into old from public.categories where id=rid for update;if not found then raise exception 'Categoría inexistente.';end if;
   update public.categories set name=trim(d->>'name'),active=(d->>'active')::boolean where id=rid;
  end if;return rid;
 elsif typ='profile' then
  if length(trim(coalesce(d->>'full_name',''))) not between 1 and 100 or length(coalesce(d->>'phone',''))>30 then raise exception 'Nombre o teléfono inválido.';end if;
  update public.profiles set full_name=trim(d->>'full_name'),phone=trim(coalesce(d->>'phone','')) where id=auth.uid();
  return auth.uid();
 elsif typ='farm' then
  if r<>'admin' then raise exception 'Solo administración puede editar la finca.';end if;
  update public.farm_settings set farm_name=trim(d->>'farm_name'),location=trim(coalesce(d->>'location','')) where id=true;
  return auth.uid();
 elsif typ='product' then
  if r<>'admin' then raise exception 'Solo administración puede modificar productos.';end if;
  select * into category_row from public.categories where name=d->>'category' for share;
  if not found then raise exception 'Categoría inexistente.';end if;
  if not category_row.active and not exists(select 1 from public.products where id=nullif(d->>'id','')::uuid and category=d->>'category') then raise exception 'Selecciona una categoría activa.';end if;
  return public.execute_command_v1(p_command);
 elsif typ='payment' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite registrar pagos.';end if;
  rid:=(p_command->>'request_id')::uuid;if rid is null then raise exception 'Falta identificador de operación.';end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(rid::text,0));
  select id into existing_id from public.payments where request_id=rid;if found then return existing_id;end if;
  pid:=(d->>'partner_id')::uuid;select * into contact from public.partners where id=pid and active for share;if not found then raise exception 'Selecciona un contacto activo.';end if;
  amount_value:=(d->>'amount')::numeric;
  if amount_value is null or amount_value<=0 or amount_value>1000000 or amount_value<>round(amount_value,2) then raise exception 'Importe inválido. Usa máximo 2 decimales.';end if;
  paid_date:=(d->>'paid_on')::date;if paid_date is null or paid_date>(now() at time zone 'America/El_Salvador')::date then raise exception 'La fecha de pago no puede estar en el futuro.';end if;
  insert into public.payments(partner_id,partner_name,amount,paid_on,method,reference,reason,actor,request_id) values(pid,contact.name,amount_value,paid_date,d->>'method',trim(d->>'reference'),trim(d->>'reason'),actor_email,rid) returning id into existing_id;
  return existing_id;
 elsif typ='cancel_payment' then
  if r not in ('admin','ventas') then raise exception 'Tu rol no permite anular pagos.';end if;
  pid:=(p_command->>'payment_id')::uuid;
  if length(trim(coalesce(p_command->>'reason',''))) not between 1 and 250 then raise exception 'Indica un motivo de anulación.';end if;
  select * into old_payment from public.payments where id=pid for update;
  if not found then raise exception 'Pago inexistente.';end if;
  if old_payment.status='anulado' then raise exception 'El pago ya está anulado.';end if;
  update public.payments set status='anulado',cancel_reason=trim(p_command->>'reason'),cancelled_by=actor_email,cancelled_at=now() where id=pid;
  return pid;
 else return public.execute_command_v1(p_command);
 end if;
end; $$;
create or replace function public.dashboard_metrics() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare start_month timestamptz;start_date date;result jsonb;payments_result jsonb;purchases_result jsonb;
begin
 if public.member_role() is null then raise exception 'Acceso denegado.';end if;
 start_date:=date_trunc('month',now() at time zone 'America/El_Salvador')::date;
 start_month:=start_date::timestamp at time zone 'America/El_Salvador';
 select jsonb_build_object('month_sales',coalesce(sum(total),0),'month_count',count(*)) into result from public.sales where status='vigente' and created_at>=start_month;
 select jsonb_build_object('month_payments',coalesce(sum(amount),0),'payment_count',count(*)) into payments_result from public.payments where status='vigente' and paid_on>=start_date;
 select jsonb_build_object('month_purchase_total',coalesce(sum(round(quantity*unit_cost,2)),0),'month_purchase_count',count(*)) into purchases_result from public.movements where kind='entrada' and unit_cost is not null and created_at>=start_month;
 return result||payments_result||purchases_result;
end; $$;
revoke all on function public.member_role(),public.dashboard_metrics(),public.execute_command(jsonb) from public,anon;
grant execute on function public.member_role(),public.dashboard_metrics() to authenticated;
grant execute on function public.execute_command(jsonb) to authenticated;
commit;
