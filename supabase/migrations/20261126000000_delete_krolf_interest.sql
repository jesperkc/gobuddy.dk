-- Remove the "Krolf" (croquet golf) interest. Related rows cascade or are set
-- to null via their foreign keys.
delete from public.interests where slug = 'krolf';
