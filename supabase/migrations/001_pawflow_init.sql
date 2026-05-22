create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_slug text not null unique,
  logo_url text,
  primary_color text not null,
  secondary_color text not null,
  accent_color text not null,
  neutral_color text not null,
  rounded_scale text not null default '26px',
  powered_by_pawflow boolean not null default true,
  portal_headline text not null,
  portal_subcopy text not null,
  notification_signature text not null,
  cancellation_policy text not null,
  deposit_policy text not null,
  boarding_capacity integer not null default 0,
  vaccine_requirements jsonb not null default '[]'::jsonb,
  ai_guardrails jsonb not null default '[]'::jsonb,
  hours jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  auth_user_id uuid,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner','front-desk','staff','pet-parent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists staff_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete set null,
  name text not null,
  role_label text not null,
  specialty text,
  avatar text,
  phone text,
  color text,
  is_available_today boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  category text not null,
  duration_minutes integer not null,
  price numeric(10,2) not null,
  deposit_required boolean not null default false,
  deposit_amount numeric(10,2) not null default 0,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  phone text not null,
  email text not null,
  preferred_channel text not null,
  tags jsonb not null default '[]'::jsonb,
  notes jsonb not null default '[]'::jsonb,
  balance_cents integer not null default 0,
  last_visit_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  breed text not null,
  age text,
  weight text,
  photo_url text,
  allergies jsonb not null default '[]'::jsonb,
  cut_preferences text not null default '',
  boarding_notes text not null default '',
  same_as_last_time text not null default '',
  last_visit_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists vaccine_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  name text not null,
  expires_at date not null,
  status text not null,
  uploaded_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists grooming_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  staff_member_id uuid references staff_members(id) on delete set null,
  note text not null,
  cut_preference text not null,
  same_as_last_time boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists behavior_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  label text not null,
  severity text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  staff_member_id uuid references staff_members(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  appointment_date date not null,
  start_time text not null,
  end_time text not null,
  price numeric(10,2) not null,
  deposit numeric(10,2) not null default 0,
  status text not null,
  notes text not null default '',
  no_show_risk text not null default 'low',
  reminder_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists boarding_stays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  room text not null default 'Unassigned',
  start_date date not null,
  end_date date not null,
  status text not null,
  feeding_notes text not null default '',
  medication_notes text not null default '',
  vaccine_status text not null default 'attention',
  photo_updates jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  boarding_stay_id uuid references boarding_stays(id) on delete set null,
  amount numeric(10,2) not null,
  deposit_amount numeric(10,2) not null default 0,
  status text not null,
  method text not null,
  due_date date not null,
  label text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  pet_id uuid references pets(id) on delete set null,
  channel text not null,
  direction text not null,
  subject text not null,
  body text not null,
  sender text not null,
  status text not null,
  ai_suggested boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  pet_id uuid references pets(id) on delete set null,
  type text not null,
  due_at timestamptz not null,
  status text not null,
  message text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists intake_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  pet_id uuid not null references pets(id) on delete cascade,
  type text not null,
  service_label text not null,
  preferred_dates text not null,
  special_notes text not null default '',
  behavior_concerns text not null default '',
  vaccine_status text not null default '',
  status text not null default 'new',
  ai_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_interactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  task text not null,
  input_summary text not null,
  output text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists brand_settings (
  organization_id uuid primary key references organizations(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  title text not null,
  description text not null,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations','users','staff_members','services','customers','pets','vaccine_records',
    'grooming_notes','behavior_alerts','appointments','boarding_stays','payments','messages',
    'reminders','intake_requests','ai_interactions','brand_settings','automations'
  ]
  loop
    execute format('drop trigger if exists %I_set_updated_at on %I', table_name, table_name);
    execute format('create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at()', table_name, table_name);
  end loop;
end $$;

alter table organizations enable row level security;
alter table users enable row level security;
alter table staff_members enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table pets enable row level security;
alter table vaccine_records enable row level security;
alter table grooming_notes enable row level security;
alter table behavior_alerts enable row level security;
alter table appointments enable row level security;
alter table boarding_stays enable row level security;
alter table payments enable row level security;
alter table messages enable row level security;
alter table reminders enable row level security;
alter table intake_requests enable row level security;
alter table ai_interactions enable row level security;
alter table brand_settings enable row level security;
alter table automations enable row level security;

-- Suggested policy pattern:
-- create policy "tenant access" on customers
-- using (organization_id in (
--   select organization_id from users where auth_user_id = auth.uid()
-- ))
-- with check (organization_id in (
--   select organization_id from users where auth_user_id = auth.uid()
-- ));
--
-- Repeat the same organization_id policy shape for all tenant-owned tables.
