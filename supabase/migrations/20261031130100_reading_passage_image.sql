alter table public.scientific_readings
  add column if not exists image_url text;
