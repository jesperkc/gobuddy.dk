-- Improvements to interest_relations:
--   1. Track when a row was last changed and where it came from.
--   2. Drop the redundant index on column A (the PK already covers leading-A lookups).
--   3. Replace the permissive write policy with admin-only writes.
--   4. Add a symmetric helper RPC so callers don't have to issue two queries
--      and merge results client-side.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.interest_relations
  add column if not exists updated_at timestamptz not null default now();

alter table public.interest_relations
  add column if not exists source text not null default 'ai'
  check (source in ('ai', 'manual'));

drop index if exists public.idx_interest_relations_a;

-- Trigger: bump updated_at on UPDATE
create or replace function public.set_interest_relations_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_interest_relations_updated_at on public.interest_relations;
create trigger trg_interest_relations_updated_at
  before update on public.interest_relations
  for each row execute function public.set_interest_relations_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: admin-only writes (SELECT remains public — set in original migration)
-- ---------------------------------------------------------------------------

drop policy if exists "Service role can manage interest relations"
  on public.interest_relations;

create policy "Admins can insert interest relations"
  on public.interest_relations for insert
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

create policy "Admins can update interest relations"
  on public.interest_relations for update
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

create policy "Admins can delete interest relations"
  on public.interest_relations for delete
  using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- RPC: get_related_interests
--
-- Given a set of "my" interest IDs and an optional minimum score, return
-- one row per (my_id, related_id) pair where the relation exists in either
-- direction in the underlying table. Lets clients replace the awkward
-- "two .in() queries + manual merge" pattern with a single call.
-- ---------------------------------------------------------------------------

create or replace function public.get_related_interests(
  my_ids uuid[],
  min_score real default 0.5
)
returns table (
  my_id uuid,
  related_id uuid,
  score real
)
language sql
stable
as $$
  select ir.interest_id_a as my_id,
         ir.interest_id_b as related_id,
         ir.score
  from public.interest_relations ir
  where ir.interest_id_a = any(my_ids)
    and ir.score >= min_score
  union all
  select ir.interest_id_b as my_id,
         ir.interest_id_a as related_id,
         ir.score
  from public.interest_relations ir
  where ir.interest_id_b = any(my_ids)
    and ir.score >= min_score;
$$;

grant execute on function public.get_related_interests(uuid[], real) to anon, authenticated;
