-- Interest relations: explicit similarity scores between interest pairs

create table public.interest_relations (
  interest_id_a uuid not null references public.interests(interest_id) on delete cascade,
  interest_id_b uuid not null references public.interests(interest_id) on delete cascade,
  score real not null check (score >= 0 and score <= 1),
  created_at timestamptz default now() not null,
  primary key (interest_id_a, interest_id_b),
  constraint ordered_pair check (interest_id_a < interest_id_b)
);

-- Index for lookups in both directions
create index idx_interest_relations_a on public.interest_relations(interest_id_a);
create index idx_interest_relations_b on public.interest_relations(interest_id_b);

-- No RLS — public read access
alter table public.interest_relations enable row level security;

create policy "Anyone can read interest relations"
  on public.interest_relations for select using (true);

create policy "Service role can manage interest relations"
  on public.interest_relations for all using (true);
