-- GoBuddy is 18+. Enforced here as well as in the forms, so the rule holds for
-- signup metadata, profile edits and admin tools alike. NOT VALID: applies to
-- new inserts/updates only; existing rows are left for manual review.
alter table public.profiles
  add constraint profiles_age_range check (age is null or (age >= 18 and age <= 120)) not valid;
