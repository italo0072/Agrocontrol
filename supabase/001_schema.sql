-- Ejecutar UNA VEZ en un proyecto Supabase nuevo. Una empresa por proyecto.
begin;
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
commit;
