-- AVALAND: платные пути профессий и покупки через Kaspi (ApiPay).
-- Выполнить один раз в Supabase → SQL Editor. Повторный запуск безопасен.

-- Цены задаёт сервер: клиент не может подменить сумму.
create table if not exists public.shop_items (
  item   text primary key,
  title  text not null,
  amount int  not null check (amount > 0)
);
insert into public.shop_items (item, title, amount) values
  ('all',      'Все пути профессий',        9990),
  ('ml',       'Путь ML-инженера',          4990),
  ('pyback',   'Путь Python-бэкендера',     3990),
  ('fe',       'Путь фронтенд-разработчика', 2990),
  ('node',     'Путь Node.js-бэкендера',    2990),
  ('jvm',      'Путь Java-бэкендера',       2990),
  ('android',  'Путь Android-разработчика', 2990),
  ('dotnet',   'Путь .NET-разработчика',    2990),
  ('cppdev',   'Путь C++-разработчика',     2990),
  ('goback',   'Путь Go-бэкендера',         2990),
  ('rustback', 'Путь Rust-бэкендера',       2990),
  ('ios',      'Путь iOS-разработчика',     2990),
  ('flutter',  'Путь Flutter-разработчика', 2990),
  ('laravel',  'Путь Laravel-разработчика', 2990),
  ('rails',    'Путь Rails-разработчика',   2990),
  ('analyst',  'Путь аналитика данных',     2990),
  ('devops',   'Путь DevOps-инженера',      2990)
on conflict (item) do update set title = excluded.title, amount = excluded.amount;

-- Заказ = один выставленный счёт в Kaspi.
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  item       text not null references public.shop_items(item),
  amount     int  not null,
  coupon     int  not null default 0,
  phone      text not null,
  invoice_id bigint,
  status     text not null default 'new',
  created_at timestamptz not null default now(),
  paid_at    timestamptz
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- Покупка = открытый навсегда путь (или 'all').
create table if not exists public.purchases (
  user_id  uuid not null references auth.users(id) on delete cascade,
  item     text not null references public.shop_items(item),
  order_id uuid references public.orders(id),
  amount   int  not null,
  paid_at  timestamptz not null default now(),
  primary key (user_id, item)
);

alter table public.shop_items enable row level security;
alter table public.orders     enable row level security;
alter table public.purchases  enable row level security;

drop policy if exists "shop items are public" on public.shop_items;
create policy "shop items are public" on public.shop_items for select using (true);
drop policy if exists "own orders" on public.orders;
create policy "own orders" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "own purchases" on public.purchases;
create policy "own purchases" on public.purchases for select using (auth.uid() = user_id);
-- Записывает в orders и purchases только Edge Function с ключом service_role (он обходит RLS).

-- Сводка для владельца: выручка по дням (смотреть в SQL Editor).
create or replace view public.revenue_daily with (security_invoker = true) as
  select date_trunc('day', paid_at)::date as day, count(*) as sales, sum(amount) as tenge
  from public.purchases group by 1 order by 1 desc;
revoke all on public.revenue_daily from anon, authenticated;
