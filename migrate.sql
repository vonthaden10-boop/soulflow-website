-- migrate.sql — Vonthaden Solutions
-- Creates the public.leads table.
-- Safe to run multiple times (create if not exists + add column if not exists pattern).

create table if not exists public.leads (
  id               uuid        primary key default gen_random_uuid(),
  business_name    text,
  phone            text,
  address          text,
  vertical         text,
  city             text,
  owner_name       text,
  email            text,
  website          text,

  -- Pipeline state
  status           text        default 'new',   -- new | audited | personalized | sent | error
  client_id        text        default 'von-solutions',

  -- Audit results
  audit            jsonb,
  score            integer,
  recommended_tier text,

  -- Email draft + delivery
  email_subject    text,
  email_draft      text,
  email_sent       boolean     default false,
  email_sent_at    timestamptz,
  resend_id        text,
  sent_at          timestamptz,

  created_at       timestamptz default now()
);

-- Index on the two most common query patterns
create index if not exists leads_email_sent_idx on public.leads (email_sent);
create index if not exists leads_status_idx     on public.leads (status);
create index if not exists leads_client_idx     on public.leads (client_id);
