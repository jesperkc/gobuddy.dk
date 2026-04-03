-- Add slug columns to profiles and interests

-- Interests: slug derived from interest_da (e.g. "Mountain Biking" -> "mountain-biking")
ALTER TABLE interests ADD COLUMN slug text;

-- Profiles: slug derived from first_name + random suffix (e.g. "anders-k7x")
ALTER TABLE profiles ADD COLUMN slug text;

-- Populate interest slugs from interest_da
UPDATE interests
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(interest_da, '[æÆ]', 'ae', 'g'),
        '[øØ]', 'oe', 'g'
      ),
      '[åÅ]', 'aa', 'g'
    ),
    '[^a-z0-9]+', '-', 'gi'
  )
);
-- Trim trailing dashes
UPDATE interests SET slug = regexp_replace(slug, '-+$', '');
UPDATE interests SET slug = regexp_replace(slug, '^-+', '');

-- Populate profile slugs from first_name + short random suffix
UPDATE profiles
SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(COALESCE(first_name, 'buddy'), '[æÆ]', 'ae', 'g'),
        '[øØ]', 'oe', 'g'
      ),
      '[åÅ]', 'aa', 'g'
    ),
    '[^a-z0-9]+', '-', 'gi'
  )
) || '-' || substr(md5(profile_id::text), 1, 4);

-- Trim trailing dashes (before the hash)
UPDATE profiles SET slug = regexp_replace(slug, '--+', '-', 'g');

-- Add unique constraints
ALTER TABLE interests ADD CONSTRAINT interests_slug_unique UNIQUE (slug);
ALTER TABLE profiles ADD CONSTRAINT profiles_slug_unique UNIQUE (slug);

-- Make slug NOT NULL going forward
ALTER TABLE interests ALTER COLUMN slug SET NOT NULL;
ALTER TABLE profiles ALTER COLUMN slug SET NOT NULL;

-- Add default for interests (will be overridden by app logic)
ALTER TABLE interests ALTER COLUMN slug SET DEFAULT '';
ALTER TABLE profiles ALTER COLUMN slug SET DEFAULT '';

-- Function to auto-generate profile slug on insert/update
CREATE OR REPLACE FUNCTION generate_profile_slug()
RETURNS trigger AS $$
DECLARE
  base_slug text;
  final_slug text;
  suffix text;
BEGIN
  -- Only generate if slug is empty or null
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(COALESCE(NEW.first_name, 'buddy'), '[æÆ]', 'ae', 'g'),
            '[øØ]', 'oe', 'g'
          ),
          '[åÅ]', 'aa', 'g'
        ),
        '[^a-z0-9]+', '-', 'gi'
      )
    );
    base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
    suffix := substr(md5(NEW.profile_id::text), 1, 4);
    final_slug := base_slug || '-' || suffix;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_auto_slug
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_profile_slug();

-- Re-run for existing profiles to use the trigger logic
UPDATE profiles SET slug = '' WHERE slug IS NOT NULL;
