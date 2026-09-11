create table if not exists public.update_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  subscribed boolean not null default false,
  consented_at timestamptz,
  source text not null default 'scanner_beta_card',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint update_subscriptions_email_not_blank check (length(trim(email)) > 3),
  constraint update_subscriptions_consent_matches_status check (
    (subscribed and consented_at is not null) or (not subscribed and consented_at is null)
  )
);

alter table public.update_subscriptions enable row level security;

grant select, insert, update on public.update_subscriptions to authenticated;

create policy "Users can read their update preference"
  on public.update_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own update preference"
  on public.update_subscriptions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and email = (select auth.jwt() ->> 'email')
  );

create policy "Users can update their own update preference"
  on public.update_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and email = (select auth.jwt() ->> 'email')
  );

create index if not exists update_subscriptions_subscribed_idx
  on public.update_subscriptions (subscribed, consented_at desc)
  where subscribed;
