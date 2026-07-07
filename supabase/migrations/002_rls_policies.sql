-- 002: Row-level security for all tenant tables.
-- Fixes audit finding F2 (no RLS — cross-tenant leakage risk).
--
-- Model: every tenant table carries organization_id. A user's memberships
-- come from public.users (auth_user_id -> organization_id). Staff roles get
-- full read/write inside their organization; pet-parents get read access to
-- their organization's customer-facing rows only. The service-role key
-- bypasses RLS by design (server-side jobs), so never ship it to the client.

-- Helper: organizations the current auth user belongs to.
create or replace function public.user_org_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select organization_id from public.users where auth_user_id = auth.uid();
$$;

-- Helper: true when the current user has a staff-level role in the org.
create or replace function public.is_org_staff(org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where auth_user_id = auth.uid()
      and organization_id = org
      and role in ('owner', 'front-desk', 'staff')
  );
$$;

-- Organizations: members can read their own org; only owners update it.
alter table organizations enable row level security;

drop policy if exists org_member_select on organizations;
create policy org_member_select on organizations
  for select using (id in (select public.user_org_ids()));

drop policy if exists org_owner_update on organizations;
create policy org_owner_update on organizations
  for update using (
    exists (
      select 1 from public.users
      where auth_user_id = auth.uid()
        and organization_id = organizations.id
        and role = 'owner'
    )
  );

-- Users: readable within the org; owners manage membership.
alter table users enable row level security;

drop policy if exists users_member_select on users;
create policy users_member_select on users
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists users_owner_all on users;
create policy users_owner_all on users
  for all using (
    exists (
      select 1 from public.users self
      where self.auth_user_id = auth.uid()
        and self.organization_id = users.organization_id
        and self.role = 'owner'
    )
  );

-- Staff-managed tenant tables: full access for staff roles within the org,
-- read-only for other members (pet-parents).
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'staff_members', 'services', 'customers', 'pets', 'vaccine_records',
    'grooming_notes', 'behavior_alerts', 'appointments', 'boarding_stays',
    'payments', 'messages', 'reminders', 'intake_requests',
    'ai_interactions', 'automations'
  ]
  loop
    execute format('alter table %I enable row level security;', tbl);
    execute format('drop policy if exists %I on %I;', tbl || '_member_select', tbl);
    execute format(
      'create policy %I on %I for select using (organization_id in (select public.user_org_ids()));',
      tbl || '_member_select', tbl
    );
    execute format('drop policy if exists %I on %I;', tbl || '_staff_write', tbl);
    execute format(
      'create policy %I on %I for insert with check (public.is_org_staff(organization_id));',
      tbl || '_staff_write', tbl
    );
    execute format('drop policy if exists %I on %I;', tbl || '_staff_update', tbl);
    execute format(
      'create policy %I on %I for update using (public.is_org_staff(organization_id));',
      tbl || '_staff_update', tbl
    );
    execute format('drop policy if exists %I on %I;', tbl || '_staff_delete', tbl);
    execute format(
      'create policy %I on %I for delete using (public.is_org_staff(organization_id));',
      tbl || '_staff_delete', tbl
    );
  end loop;
end;
$$;

-- Brand settings: keyed by organization_id primary key.
alter table brand_settings enable row level security;

drop policy if exists brand_member_select on brand_settings;
create policy brand_member_select on brand_settings
  for select using (organization_id in (select public.user_org_ids()));

drop policy if exists brand_staff_write on brand_settings;
create policy brand_staff_write on brand_settings
  for all using (public.is_org_staff(organization_id));

-- Portal note: anonymous pet-parent portal access should NOT use these
-- policies. Portal reads go through server routes using a signed, expiring
-- portal token (audit finding F6), executed with the service role and
-- explicitly filtered by organization_id + customer_id.
