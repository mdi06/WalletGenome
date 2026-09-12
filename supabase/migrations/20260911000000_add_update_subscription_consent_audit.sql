-- Preserve the existing owner-scoped subscription row while adding explicit
-- consent, prompt-state, confirmation, and withdrawal audit fields.
alter table public.update_subscriptions
  alter column email drop not null,
  add column if not exists consent_version text,
  add column if not exists prompt_shown_at timestamptz,
  add column if not exists prompt_dismissed_at timestamptz,
  add column if not exists withdrawn_at timestamptz,
  add column if not exists subscription_status text not null default 'dismissed',
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmation_token_hash text,
  add column if not exists confirmation_expires_at timestamptz,
  add column if not exists confirmation_sent_at timestamptz,
  add column if not exists pending_email text,
  add column if not exists unsubscribe_token_hash text;

-- Email is a contact attribute, not an account identity. Keeping the row
-- keyed by user_id allows the same contact address to be used by separate
-- Google and wallet-authenticated accounts without linking those accounts.
alter table public.update_subscriptions
  drop constraint if exists update_subscriptions_email_key;

update public.update_subscriptions
set
  subscription_status = case
    when subscribed then 'confirmed'
    when prompt_dismissed_at is not null then 'dismissed'
    when prompt_shown_at is not null then 'prompted'
    else 'dismissed'
  end,
  confirmed_at = case when subscribed then coalesce(confirmed_at, consented_at) else confirmed_at end,
  updated_at = coalesce(updated_at, now());

-- An unsubscribe changes the current state but must not erase evidence of
-- prior consent. Existing legacy rows may not have a consent version because
-- the earlier wording was not versioned; new explicit subscriptions always do.
alter table public.update_subscriptions
  drop constraint if exists update_subscriptions_consent_matches_status;
alter table public.update_subscriptions
  drop constraint if exists update_subscriptions_email_not_blank;

alter table public.update_subscriptions
  add constraint update_subscriptions_consent_matches_status check (
    (subscribed and consented_at is not null) or (not subscribed)
  );

alter table public.update_subscriptions
  add constraint update_subscriptions_consent_version_not_blank check (
    consent_version is null or length(trim(consent_version)) > 0
  );

alter table public.update_subscriptions
  add constraint update_subscriptions_email_not_blank check (
    email is null or length(trim(email)) > 3
  ),
  add constraint update_subscriptions_pending_email_not_blank check (
    pending_email is null or length(trim(pending_email)) > 3
  ),
  add constraint update_subscriptions_status_valid check (
    subscription_status in ('prompted', 'dismissed', 'pending_confirmation', 'confirmed', 'unsubscribed')
  ),
  add constraint update_subscriptions_status_matches_subscribed check (
    (subscription_status = 'confirmed') = subscribed
  ),
  add constraint update_subscriptions_confirmed_state_has_timestamp check (
    subscription_status <> 'confirmed' or confirmed_at is not null
  ),
  add constraint update_subscriptions_token_hashes_not_blank check (
    (confirmation_token_hash is null or length(trim(confirmation_token_hash)) > 0)
    and (unsubscribe_token_hash is null or length(trim(unsubscribe_token_hash)) > 0)
  );

alter table public.update_subscriptions
  add constraint update_subscriptions_prompt_dismissal_requires_prompt check (
    prompt_dismissed_at is null or prompt_shown_at is not null
  );

-- Keep the existing authenticated owner policies and grants. These explicit
-- checks are repeated here as a migration-review guard against accidental
-- policy drift while the table gains more user-controlled preference fields.
alter table public.update_subscriptions enable row level security;

revoke all on public.update_subscriptions from anon;
grant select, insert, update on public.update_subscriptions to authenticated;

-- A wallet user may record only the non-sensitive prompt lifecycle from the
-- browser. Email capture, consent, confirmation, and unsubscribe mutations
-- are server-owned and use the authenticated user id as their authorization
-- boundary.
drop policy if exists "Wallet users can create prompt state" on public.update_subscriptions;
create policy "Wallet users can create prompt state"
  on public.update_subscriptions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and email is null
    and subscribed = false
    and subscription_status in ('prompted', 'dismissed')
    and consented_at is null
    and confirmation_token_hash is null
  );

drop policy if exists "Wallet users can update prompt state" on public.update_subscriptions;
create policy "Wallet users can update prompt state"
  on public.update_subscriptions for update to authenticated
  using (
    (select auth.uid()) = user_id
    and email is null
  )
  with check (
    (select auth.uid()) = user_id
    and email is null
    and subscribed = false
    and subscription_status in ('prompted', 'dismissed')
    and consented_at is null
    and confirmation_token_hash is null
  );

create index if not exists update_subscriptions_confirmation_token_idx
  on public.update_subscriptions (confirmation_token_hash)
  where confirmation_token_hash is not null;

create index if not exists update_subscriptions_unsubscribe_token_idx
  on public.update_subscriptions (unsubscribe_token_hash)
  where unsubscribe_token_hash is not null;
