-- Change time_of_day from single text to text array for multi-select
alter table public.events drop column time_of_day;
alter table public.events add column time_of_day text[];
